import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { legacyCafeConversations, cafePublicationHash, loadCafePublications, prepareCafeContent, validateCafePublication } from "./prepare-cafe-content.js";
import { publishedCafeConversations, selectCafeConversation, getEarlierCafeConversations, getCafeWeekBucket } from "../src/data/cafeConversations/index.js";
import { getCurrentCafeRestorationEvent, buildCafeRestorationId } from "../src/server/agentState/cafeRestorationRuntime.js";
const repo = fileURLToPath(new URL("../", import.meta.url));
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "cafe-loader-"));
const inputDirectory = path.join(temporary, "published");
const outputFile = path.join(temporary, "snapshot.mjs");
const cleanup = async () => {
  if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith("cafe-loader-")) throw new Error("Unexpected cleanup path");
  await fs.rm(temporary, { recursive: true, force: true });
};
let checks = 0;
const check = async (name, run) => { await run(); checks += 1; console.log(`PASS ${name}`); };
const legacy = legacyCafeConversations[0];
const source = JSON.parse(await fs.readFile(path.join(repo, "cafe-data/published", `${legacy.id}.json`), "utf8"));
const modern = {
  ...source, id: "cafe-fixture", conversationId: "cafe-fixture", approvalSource: undefined,
  approvedAt: "2026-09-24T10:00:00.000Z", publishedAt: "2026-09-24T11:00:00.000Z", reviewerId: "test-reviewer",
};
try {
  await check("JSON migration and snapshot preserve every runtime field", async () => {
    const loaded = await loadCafePublications();
    assert.deepEqual(loaded, legacyCafeConversations);
    assert.deepEqual(publishedCafeConversations, legacyCafeConversations);
    const generated = await prepareCafeContent({ outputFile });
    assert.deepEqual(generated, loaded);
    assert.deepEqual((await import(pathToFileURL(outputFile).href)).publishedCafeSnapshot, loaded);
    const first = await fs.readFile(outputFile, "utf8");
    await prepareCafeContent({ outputFile });
    assert.equal(await fs.readFile(outputFile, "utf8"), first);
  });
  await check("selection, history, presence windows and restoration identities retain parity", async () => {
    for (let week = 0; week < 104; week += 1) {
      for (const day of [0, 1, 2, 6]) {
        const now = new Date(Date.UTC(2026, 7, 24 + week * 7 + day, 12));
        const selected = selectCafeConversation(undefined, now);
        const previous = selectCafeConversation(legacyCafeConversations, now);
        assert.deepEqual(selected, previous);
        assert.deepEqual(getEarlierCafeConversations(selected), getEarlierCafeConversations(previous, legacyCafeConversations));
        assert.deepEqual(getCurrentCafeRestorationEvent({ now }), getCurrentCafeRestorationEvent({ now, conversations: legacyCafeConversations }));
        for (const agentId of selected.participants) {
          assert.equal(buildCafeRestorationId({ bucketKey: getCafeWeekBucket(now).key, conversationId: selected.id, agentId }),
            `cafe:${getCafeWeekBucket(now).key}:${previous.id}:${agentId}`);
        }
      }
    }
  });
  await check("Phase 2 publication metadata normalizes to existing runtime contract", async () => {
    const normalized = validateCafePublication(modern);
    assert.equal(normalized.reviewedBy, "test-reviewer");
    assert.equal(normalized.publishedAt, "2026-09-24");
    assert.equal(normalized.id, "cafe-fixture");
    assert.equal(normalized.revisionId, undefined);
  });
  await fs.mkdir(inputDirectory);
  const fixture = path.join(inputDirectory, "fixture.json");
  const invalid = async (value) => {
    const before = await fs.readFile(outputFile, "utf8");
    await fs.writeFile(fixture, typeof value === "string" ? value : JSON.stringify(value));
    await assert.rejects(prepareCafeContent({ inputDirectory, outputFile }));
    assert.equal(await fs.readFile(outputFile, "utf8"), before, "invalid input must never replace the snapshot");
  };
  await check("invalid JSON rejected without fallback or snapshot overwrite", () => invalid("{"));
  await check("invalid speakers and participants rejected", async () => {
    for (const speaker of ["mira-vale", "ravi-sen", "Theo Mercer"]) {
      const value = structuredClone(modern);
      value.exchanges[0].speaker = speaker;
      await invalid(value);
    }
    await invalid({ ...modern, participants: ["mira-vale", "elena-cross"] });
  });
  await check("hash mismatch and invalid revision rejected", async () => {
    await invalid({ ...modern, contentHash: "wrong" });
    await invalid({ ...modern, revisionId: "rev-wrong" });
  });
  await check("unapproved, rejected and malformed metadata rejected", async () => {
    for (const value of [
      { ...modern, status: "unpublished" }, { ...modern, status: "rejected" },
      { ...modern, reviewerId: "" }, { ...modern, approvedAt: null },
      { ...modern, approvedAt: "2026-02-30T10:00:00.000Z" },
      { ...modern, approvedAt: "2027-01-01T00:00:00.000Z" },
      { ...modern, conversationId: "other-id" }, { ...modern, exchanges: [] },
    ]) await invalid(value);
  });
  await check("legacy approval exception cannot admit new or edited content", async () => {
    await invalid({ ...modern, approvalSource: "legacy-js", approvedAt: null });
    const changed = structuredClone(source);
    changed.exchanges[0].text = "A changed hypothetical conversation.";
    changed.contentHash = cafePublicationHash(changed);
    changed.revisionId = `rev-${changed.contentHash}`;
    await invalid(changed);
  });
  await check("latest approved revision selected, ambiguous approvals and changed participants rejected", async () => {
    await fs.writeFile(fixture, JSON.stringify(modern));
    const later = structuredClone(modern);
    later.exchanges[0].text = "Suppose this imagined rule changed?";
    later.contentHash = cafePublicationHash(later);
    later.revisionId = `rev-${later.contentHash}`;
    later.approvedAt = "2026-09-25T10:00:00.000Z";
    later.publishedAt = "2026-09-25T11:00:00.000Z";
    const second = path.join(inputDirectory, "second.json");
    await fs.writeFile(second, JSON.stringify(later));
    assert.deepEqual(await loadCafePublications(inputDirectory), [validateCafePublication(later)]);
    await fs.writeFile(second, JSON.stringify({ ...later, approvedAt: modern.approvedAt }));
    await assert.rejects(loadCafePublications(inputDirectory), /ambiguous/);
    const altered = structuredClone(later);
    const replaced = altered.participants[0];
    altered.participants[0] = "theo-mercer";
    altered.exchanges = altered.exchanges.map((item) => ({ ...item, speaker: item.speaker === replaced ? "theo-mercer" : item.speaker }));
    if (altered.invitedBy === replaced) altered.invitedBy = "theo-mercer";
    altered.contentHash = cafePublicationHash(altered);
    altered.revisionId = `rev-${altered.contentHash}`;
    await fs.writeFile(second, JSON.stringify(altered));
    await assert.rejects(loadCafePublications(inputDirectory), /participant mapping/);
    await fs.unlink(second);
    await fs.unlink(fixture);
  });
  await check("empty or missing JSON prepares legacy fallback through the actual index", async () => {
    for (const directory of [inputDirectory, path.join(temporary, "missing")]) {
      const moduleDirectory = path.join(temporary, `modules-${path.basename(directory)}`);
      await fs.mkdir(moduleDirectory, { recursive: true });
      await fs.writeFile(path.join(moduleDirectory, "package.json"), '{"type":"module"}');
      const originalDirectory = path.join(repo, "src/data/cafeConversations");
      for (const name of (await fs.readdir(originalDirectory)).filter((name) => name === "index.js" || name.startsWith("cafe-"))) {
        await fs.copyFile(path.join(originalDirectory, name), path.join(moduleDirectory, name));
      }
      const snapshotFile = path.join(moduleDirectory, "publishedCafeSnapshot.js");
      // A genuinely absent input is different from the module output directory.
      const actualInput = directory.endsWith("missing") ? path.join(temporary, "absent") : directory;
      await prepareCafeContent({ inputDirectory: actualInput, outputFile: snapshotFile });
      const fallback = await import(pathToFileURL(path.join(moduleDirectory, "index.js")).href);
      assert.deepEqual(fallback.publishedCafeConversations, legacyCafeConversations);
      assert.equal(fallback.selectCafeConversation(undefined, new Date("2026-08-24T12:00:00Z")).id,
        selectCafeConversation(legacyCafeConversations, new Date("2026-08-24T12:00:00Z")).id);
    }
  });
  console.log(`Cafe content loader: ${checks} checks passed.`);
} finally { await cleanup(); }
