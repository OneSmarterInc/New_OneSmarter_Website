import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCafeGenerationPrompt, parseCafeModelOutput } from "./generate-cafe-conversation.js";

export const cafeReviewDirectory = fileURLToPath(new URL("../cafe-data/", import.meta.url));
const hash = (content) => createHash("sha256").update(JSON.stringify(content)).digest("hex");
const validId = (value) => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value)) {
    throw new Error("Invalid conversation or revision ID.");
  }
  return value;
};
const requireReviewer = (value) => {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw new Error("A non-empty reviewer ID of at most 200 characters is required.");
  }
  return value.trim();
};
const readJson = async (filename) => {
  try { return JSON.parse(await fs.readFile(filename, "utf8")); }
  catch (error) { throw new Error(`Cannot read JSON file ${filename}: ${error.message}`, { cause: error }); }
};

// Fixed field order makes the hash independent of input JSON key order.
export const validateCafeReviewContent = (source) => {
  if (!source || !Array.isArray(source.participants) || source.participants.length !== 2 ||
    !Array.isArray(source.exchanges)) throw new Error("Invalid Cafe draft fields.");
  const { participants, seedTopic, invitedBy, exchanges, selection } = source;
  buildCafeGenerationPrompt({ participantIds: participants, seedTopic, exchangeCount: exchanges.length });
  parseCafeModelOutput(JSON.stringify({ exchanges }), { participantIds: participants, exchangeCount: exchanges.length });
  if (invitedBy !== null && !participants.includes(invitedBy)) throw new Error("Invalid Cafe inviter.");
  const fields = ["participants", "seedTopic", "exchangeCount", "invitedBy"];
  if (!selection || fields.some((key) => !["manual", "random", "not_recorded"].includes(selection[key]))) {
    throw new Error("Invalid Cafe selection provenance.");
  }
  return {
    participants: [...participants], seedTopic, invitedBy,
    exchanges: exchanges.map(({ speaker, text }) => ({ speaker, text })),
    selection: Object.fromEntries(fields.map((key) => [key, selection[key]])),
  };
};
const filesFor = (root, id, revisionId) => {
  const stem = `${validId(id)}--${validId(revisionId)}`;
  return {
    draft: path.join(root, "drafts", `${stem}.json`),
    review: path.join(root, "drafts", `${stem}.review.json`),
    published: path.join(root, "published", `${stem}.json`),
  };
};
const atomicJson = async (filename, value, replace = false) => {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    if (replace) await fs.rename(temporary, filename);
    else await fs.link(temporary, filename); // Complete, create-only publication; never overwrite a revision.
  } finally { await fs.rm(temporary, { force: true }); }
};
const withLock = async (root, run) => {
  await fs.mkdir(root, { recursive: true });
  const lockPath = path.join(root, ".review.lock");
  let lock;
  try { lock = await fs.open(lockPath, "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error("Another Cafe review command is active; review lock exists.");
    throw error;
  }
  try { return await run(); }
  finally { await lock.close(); await fs.unlink(lockPath); }
};
const readRevision = async (root, id, revisionId) => {
  const files = filesFor(root, id, revisionId);
  const draft = await readJson(files.draft);
  const content = validateCafeReviewContent(draft.content);
  const contentHash = hash(content);
  if (draft.conversationId !== id || draft.revisionId !== revisionId || draft.status !== "unpublished" ||
    draft.contentHash !== contentHash || revisionId !== `rev-${contentHash}`) {
    throw new Error("Draft content or revision changed. Import edits as a new revision and review again.");
  }
  return { draft, content, files };
};
const readReview = async (filename) => {
  try { await fs.access(filename); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  return readJson(filename);
};
export const importCafeDraft = async (sourcePath, { root = cafeReviewDirectory, conversationId } = {}) =>
  withLock(root, async () => {
    const source = await readJson(sourcePath);
    if (source.status !== "unpublished") throw new Error("Only unpublished source drafts may be imported.");
    const id = validId(conversationId || source.draftId || source.id);
    if (conversationId && !(await listCafeDrafts({ root })).some((item) => item.conversationId === id)) {
      throw new Error("Conversation to revise does not exist.");
    }
    const content = validateCafeReviewContent(source);
    const contentHash = hash(content);
    const revisionId = `rev-${contentHash}`;
    const draft = {
      conversationId: id, revisionId, contentHash, content,
      model: typeof source.model === "string" ? source.model : null,
      generatedAt: source.generatedAt || source.createdAt || null,
      importedAt: new Date().toISOString(), status: "unpublished",
    };
    // Recompute the hash: source files may be edited before importing a new revision.
    await atomicJson(filesFor(root, id, revisionId).draft, draft);
    return draft;
  });
export const showCafeDraft = async (id, revisionId, { root = cafeReviewDirectory } = {}) => {
  const { draft, files } = await readRevision(root, id, revisionId);
  return { ...draft, review: await readReview(files.review) };
};
export const listCafeDrafts = async ({ root = cafeReviewDirectory } = {}) => {
  let entries;
  try { entries = await fs.readdir(path.join(root, "drafts")); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const drafts = [];
  for (const name of entries.sort()) {
    if (!name.endsWith(".json") || name.endsWith(".review.json")) continue;
    const candidate = await readJson(path.join(root, "drafts", name));
    const item = await showCafeDraft(candidate.conversationId, candidate.revisionId, { root });
    const published = await readReview(filesFor(root, item.conversationId, item.revisionId).published);
    drafts.push({ conversationId: item.conversationId, revisionId: item.revisionId,
      contentHash: item.contentHash, status: published ? "published" : item.review?.status || "unpublished" });
  }
  return drafts;
};
export const reviewCafeDraft = async (id, revisionId, decision, reviewerId, {
  root = cafeReviewDirectory, reason = "",
} = {}) => withLock(root, async () => {
  if (!["approved", "rejected"].includes(decision)) throw new Error("Review decision must be approved or rejected.");
  reviewerId = requireReviewer(reviewerId);
  const { draft, files } = await readRevision(root, id, revisionId);
  const prior = await readReview(files.review);
  if (prior?.status === "rejected") throw new Error("Rejected revisions are terminal. Create a new revision for edits.");
  if (await readReview(files.published)) throw new Error("Published revisions cannot be reviewed again.");
  if (prior?.status === "approved" && decision === "approved") throw new Error("Revision is already approved.");
  const review = {
    conversationId: id, revisionId, contentHash: draft.contentHash, reviewerId,
    status: decision, reviewedAt: new Date().toISOString(), reason,
  };
  if (decision === "approved") review.approvedAt = review.reviewedAt;
  await atomicJson(files.review, review, Boolean(prior));
  return review;
});
export const publishCafeDraft = async (id, revisionId, { root = cafeReviewDirectory } = {}) =>
  withLock(root, async () => {
    const { draft, content, files } = await readRevision(root, id, revisionId);
    const review = await readReview(files.review);
    if (!review || review.status !== "approved" || review.conversationId !== id ||
      review.revisionId !== revisionId || review.contentHash !== draft.contentHash ||
      !Number.isFinite(Date.parse(review.approvedAt))) {
      throw new Error("Publication requires approval of this exact revision and content hash.");
    }
    const published = {
      id, conversationId: id, revisionId, ...content,
      approvedAt: review.approvedAt, reviewerId: requireReviewer(review.reviewerId),
      contentHash: draft.contentHash, publishedAt: new Date().toISOString(), status: "published",
    };
    await atomicJson(files.published, published);
    return { publishedPath: files.published, conversation: published };
  });
const usage = `Local Cafe review (does not publish to the website):
  node scripts/review-cafe-conversation.js import <generated-draft.json>
  node scripts/review-cafe-conversation.js list
  node scripts/review-cafe-conversation.js show <conversation-id> <revision-id>
  node scripts/review-cafe-conversation.js approve <conversation-id> <revision-id> <reviewer-id>
  node scripts/review-cafe-conversation.js reject <conversation-id> <revision-id> <reviewer-id> [reason]
  node scripts/review-cafe-conversation.js revise <conversation-id> <edited-source.json>
  node scripts/review-cafe-conversation.js publish <conversation-id> <revision-id>
Edit a copy of the source JSON, then use revise; never edit stored review revisions.
Reviewer IDs are local audit labels, not authenticated identities.`;
export const runCafeReviewCommand = async (args) => {
  const [command, first, second, third, ...rest] = args;
  if (command === "list" && args.length === 1) return listCafeDrafts();
  if (command === "import" && args.length === 2) return importCafeDraft(first);
  if (command === "revise" && args.length === 3) return importCafeDraft(second, { conversationId: first });
  if (command === "show" && args.length === 3) return showCafeDraft(first, second);
  if (command === "publish" && args.length === 3) return publishCafeDraft(first, second);
  if (command === "approve" && args.length === 4) return reviewCafeDraft(first, second, "approved", third);
  if (command === "reject" && args.length >= 4) return reviewCafeDraft(first, second, "rejected", third, { reason: rest.join(" ") });
  if (!command || command === "help") return usage;
  throw new Error(usage);
};
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runCafeReviewCommand(process.argv.slice(2))
    .then((result) => console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
