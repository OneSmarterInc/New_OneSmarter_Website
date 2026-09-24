import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildCafeDraft } from "./generate-cafe-conversation.js";
import {
  importCafeDraft, listCafeDrafts, showCafeDraft, reviewCafeDraft, publishCafeDraft,
  runCafeReviewCommand,
} from "./review-cafe-conversation.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const snapshot = async (directory) => {
  const result = {};
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      // Generated private drafts are unrelated to source isolation.
      if (entry.name !== "drafts") Object.assign(result, await snapshot(filename));
    } else if (entry.isFile()) {
      result[filename] = createHash("sha256").update(await fs.readFile(filename)).digest("hex");
    }
  }
  return result;
};
const protectedBefore = { ...await snapshot(path.join(repo, "src")), ...await snapshot(path.join(repo, "api")) };
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "cafe-review-"));
const root = path.join(temporary, "cafe-data");
const sourcePath = path.join(temporary, "source.json");
const source = buildCafeDraft({
  participantIds: ["theo-mercer", "elena-cross"], seedTopic: "an imagined board-game dispute", invitedBy: null,
  exchanges: Array.from({ length: 6 }, (_, i) => ({ speaker: i % 2 ? "elena-cross" : "theo-mercer", text: `Suppose a rule allowed ${i + 1} moves?` })),
  selection: { participants: "manual", seedTopic: "manual", exchangeCount: "manual", invitedBy: "random" },
});
const saveSource = async (value) => fs.writeFile(sourcePath, JSON.stringify(value));
const cleanup = async () => {
  if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith("cafe-review-")) {
    throw new Error("Unexpected cleanup path.");
  }
  await fs.rm(temporary, { recursive: true, force: true });
};
let checks = 0;
const check = async (label, run) => { await run(); checks += 1; console.log(`PASS ${label}`); };
let draft;
try {
  await check("empty list and missing draft errors", async () => {
    assert.deepEqual(await listCafeDrafts({ root }), []);
    await assert.rejects(importCafeDraft(sourcePath, { root }), /Cannot read JSON/);
    await assert.rejects(showCafeDraft("missing", "rev-missing", { root }), /Cannot read JSON/);
  });
  await saveSource(source);
  await check("import creates a private unpublished content-addressed revision", async () => {
    draft = await importCafeDraft(sourcePath, { root });
    assert.equal(draft.conversationId, source.id);
    assert.equal(draft.revisionId, `rev-${draft.contentHash}`);
    assert.equal(draft.contentHash, source.contentHash);
    const shown = await showCafeDraft(draft.conversationId, draft.revisionId, { root });
    assert.deepEqual(shown.content.exchanges, source.exchanges);
    assert.equal(shown.review, null);
    assert.equal((await listCafeDrafts({ root }))[0].status, "unpublished");
    await assert.rejects(fs.access(path.join(root, "published")));
    await assert.rejects(importCafeDraft(sourcePath, { root }), /EEXIST/);
  });
  const { conversationId: id, revisionId: rev } = draft;
  await check("unreviewed content cannot publish and reviewer is required", async () => {
    await assert.rejects(publishCafeDraft(id, rev, { root }), /requires approval/);
    await assert.rejects(reviewCafeDraft(id, rev, "approved", " ", { root }), /reviewer ID/);
    await assert.rejects(fs.access(path.join(root, "published")));
  });
  await check("approval binds the reviewer to exact revision and hash", async () => {
    const review = await reviewCafeDraft(id, rev, "approved", "test-reviewer", { root });
    assert.equal(review.contentHash, draft.contentHash);
    assert.equal(review.revisionId, rev);
    assert.equal(review.reviewerId, "test-reviewer");
    assert.ok(Number.isFinite(Date.parse(review.approvedAt)));
    assert.equal((await listCafeDrafts({ root }))[0].status, "approved");
  });
  const draftFile = path.join(root, "drafts", `${id}--${rev}.json`);
  const reviewFile = path.join(root, "drafts", `${id}--${rev}.review.json`);
  await check("editing an approved revision blocks publication even if its hash is recalculated", async () => {
    const changed = structuredClone(draft);
    changed.content.exchanges[0].text = "A different imagined rule?";
    changed.contentHash = createHash("sha256").update(JSON.stringify(changed.content)).digest("hex");
    await fs.writeFile(draftFile, JSON.stringify(changed));
    await assert.rejects(publishCafeDraft(id, rev, { root }), /new revision/);
    await fs.writeFile(draftFile, JSON.stringify(draft));
  });
  await check("mismatched approval hash cannot publish", async () => {
    const original = await fs.readFile(reviewFile, "utf8");
    await fs.writeFile(reviewFile, JSON.stringify({ ...JSON.parse(original), contentHash: "wrong" }));
    await assert.rejects(publishCafeDraft(id, rev, { root }), /exact revision/);
    await fs.writeFile(reviewFile, original);
  });
  await check("approved publication contains all required metadata and never overwrites", async () => {
    const { publishedPath, conversation } = await publishCafeDraft(id, rev, { root });
    assert.equal(path.dirname(publishedPath), path.join(root, "published"));
    assert.deepEqual(JSON.parse(await fs.readFile(publishedPath, "utf8")), conversation);
    for (const field of ["id", "conversationId", "revisionId", "participants", "exchanges", "approvedAt", "reviewerId", "contentHash"]) {
      assert.ok(Object.hasOwn(conversation, field), field);
    }
    assert.equal(conversation.status, "published");
    assert.equal(conversation.contentHash, draft.contentHash);
    assert.equal((await listCafeDrafts({ root }))[0].status, "published");
    await assert.rejects(publishCafeDraft(id, rev, { root }), /EEXIST/);
    await assert.rejects(reviewCafeDraft(id, rev, "rejected", "reviewer", { root }), /Published revisions/);
  });
  let edited;
  await check("edits create a new unapproved revision without changing publication", async () => {
    const next = structuredClone(source);
    next.exchanges[0].text = "Suppose the imagined rule changed?";
    await saveSource(next);
    edited = await importCafeDraft(sourcePath, { root, conversationId: id });
    assert.notEqual(edited.revisionId, rev);
    assert.equal(edited.conversationId, id);
    await assert.rejects(publishCafeDraft(id, edited.revisionId, { root }), /requires approval/);
    assert.equal((await fs.readdir(path.join(root, "published"))).length, 1);
  });
  await check("rejected revision cannot be approved or published", async () => {
    const review = await reviewCafeDraft(id, edited.revisionId, "rejected", "reviewer", { root, reason: "Needs revision" });
    assert.equal(review.status, "rejected");
    await assert.rejects(publishCafeDraft(id, edited.revisionId, { root }), /requires approval/);
    await assert.rejects(reviewCafeDraft(id, edited.revisionId, "approved", "reviewer", { root }), /terminal/);
    await assert.rejects(importCafeDraft(sourcePath, { root, conversationId: id }), /EEXIST/);
  });
  await check("approval can be withdrawn before publication", async () => {
    const next = structuredClone(source);
    next.exchanges[0].text = "What if the imagined rule changed again?";
    await saveSource(next);
    const nextRevision = await importCafeDraft(sourcePath, { root, conversationId: id });
    await reviewCafeDraft(id, nextRevision.revisionId, "approved", "reviewer", { root });
    await reviewCafeDraft(id, nextRevision.revisionId, "rejected", "reviewer", { root });
    await assert.rejects(publishCafeDraft(id, nextRevision.revisionId, { root }), /requires approval/);
  });
  await check("invalid drafts, speakers, JSON and traversal rejected", async () => {
    const before = await fs.readdir(path.join(root, "drafts"));
    for (const invalid of [
      { ...source, status: "published" }, { ...source, participants: ["mira-vale", "elena-cross"] },
      { ...source, exchanges: [] }, { ...source, draftId: "../escape" },
      { ...source, exchanges: source.exchanges.map((item) => ({ ...item, text: " " })) },
    ]) {
      await saveSource(invalid);
      await assert.rejects(importCafeDraft(sourcePath, { root }));
    }
    await fs.writeFile(sourcePath, "{");
    await assert.rejects(importCafeDraft(sourcePath, { root }), /Cannot read JSON/);
    await assert.rejects(showCafeDraft("../escape", rev, { root }), /Invalid/);
    assert.deepEqual(await fs.readdir(path.join(root, "drafts")), before);
  });
  await check("review lock blocks concurrent mutations", async () => {
    const lock = path.join(root, ".review.lock");
    await fs.writeFile(lock, "");
    await assert.rejects(publishCafeDraft(id, rev, { root }), /lock exists/);
    await fs.unlink(lock);
  });
  await check("CLI help explains local publication and review labels", async () => {
    const help = await runCafeReviewCommand(["help"]);
    assert.ok(help.includes("does not publish to the website"));
    assert.ok(help.includes("not authenticated"));
    await assert.rejects(runCafeReviewCommand(["approve"]));
  });
  await check("other agents, frontend, API, grounding, rotation and restoration untouched", async () => {
    const after = { ...await snapshot(path.join(repo, "src")), ...await snapshot(path.join(repo, "api")) };
    assert.deepEqual(after, protectedBefore);
    const ignore = await fs.readFile(path.join(repo, ".gitignore"), "utf8");
    assert.ok(ignore.split(/\r?\n/).includes("cafe-data/"));
  });
  console.log(`Cafe publication: ${checks} checks passed.`);
} finally { await cleanup(); }
