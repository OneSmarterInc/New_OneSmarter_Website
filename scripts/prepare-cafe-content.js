import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { cafePersonas } from "../src/data/agentPresentation/cafePersonas.js";
import { cafe20260819TheoElenaCookingProgramme } from "../src/data/cafeConversations/cafe-2026-08-19-theo-elena-cooking-programme.js";
import { cafe20260819SeleneTheoCookingProgramme } from "../src/data/cafeConversations/cafe-2026-08-19-selene-theo-cooking-programme.js";
import { cafe20260819ElenaRaviDivisiveFilm } from "../src/data/cafeConversations/cafe-2026-08-19-elena-ravi-divisive-film.js";

export const legacyCafeConversations = [cafe20260819ElenaRaviDivisiveFilm, cafe20260819SeleneTheoCookingProgramme, cafe20260819TheoElenaCookingProgramme];
const defaultInput = fileURLToPath(new URL("../cafe-data/published/", import.meta.url));
const defaultOutput = fileURLToPath(new URL("../src/data/cafeConversations/publishedCafeSnapshot.js", import.meta.url));
const personaIds = new Set(cafePersonas.map(({ id }) => id));
const fields = ["participants", "seedTopic", "exchangeCount", "invitedBy"];
const fail = (message) => { throw new Error(`Invalid Cafe publication: ${message}`); };
const validId = (value) => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value);
const validTimestamp = (value) => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export const validDay = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

// Same canonical content and field order as the local review/publish workflow.
export const cafePublicationContent = (record) => ({
  participants: record.participants, seedTopic: record.seedTopic,
  conversationDay: record.conversationDay, invitedBy: record.invitedBy,
  exchanges: record.exchanges.map(({ speaker, text }) => ({ speaker, text })),
  selection: Object.fromEntries(fields.map((field) => [field, record.selection[field]])),
});
export const cafePublicationHash = (record) => createHash("sha256")
  .update(JSON.stringify(cafePublicationContent(record))).digest("hex");

export const validateCafePublication = (record) => {
  if (!record || !validId(record.id) || record.conversationId !== record.id || record.status !== "published") fail("conversation ID or status");
  if (!Array.isArray(record.participants) || record.participants.length !== 2 || new Set(record.participants).size !== 2 ||
    record.participants.some((id) => !personaIds.has(id))) fail("participants");
  if (typeof record.seedTopic !== "string" || !record.seedTopic.trim() ||
    (record.invitedBy !== null && !record.participants.includes(record.invitedBy))) fail("topic or inviter");
  if (record.conversationDay !== undefined && !validDay(record.conversationDay)) fail("conversation day");
  if (!record.selection || fields.some((field) => !["random", "manual", "not_recorded"].includes(record.selection[field]))) fail("selection metadata");
  if (!Array.isArray(record.exchanges) || record.exchanges.length < 6 || record.exchanges.length > 10) fail("exchange count");
  for (const exchange of record.exchanges) {
    if (!exchange || Object.keys(exchange).length !== 2 || !record.participants.includes(exchange.speaker) ||
      typeof exchange.text !== "string" || !exchange.text.trim() || exchange.text.length > 2000) fail("speaker or exchange text");
  }
  if (record.participants.some((id) => !record.exchanges.some(({ speaker }) => speaker === id))) fail("silent participant");
  const contentHash = cafePublicationHash(record);
  if (record.contentHash !== contentHash || record.revisionId !== `rev-${contentHash}`) fail("content hash or revision ID mismatch");
  if (typeof record.reviewerId !== "string" || !record.reviewerId.trim() || record.reviewerId.length > 200) fail("reviewer ID");
  const legacy = legacyCafeConversations.find(({ id }) => id === record.id);
  if (legacy && JSON.stringify(record.participants) !== JSON.stringify(legacy.participants)) fail("legacy participants changed under an existing ID");
  if (record.approvalSource === "legacy-js") {
    // Do not fabricate a historical approval timestamp. This exception only accepts exact legacy data.
    if (!legacy || record.approvedAt !== null || record.reviewerId !== legacy.reviewedBy ||
      record.publishedAt !== legacy.publishedAt || contentHash !== cafePublicationHash(legacy)) fail("legacy approval provenance");
  } else {
    if (record.approvalSource !== undefined || !validTimestamp(record.approvedAt) ||
      !validTimestamp(record.publishedAt) || record.approvedAt > record.publishedAt) fail("approval/publication timestamps");
  }
  if (!validDay(record.publishedAt) && !validTimestamp(record.publishedAt)) fail("publication date");
  const { conversationDay, ...content } = cafePublicationContent(record);
  return {
    // This normalized field is the existing UI display date. The source record's
    // publishedAt remains the publication audit timestamp and is never rewritten.
    id: record.id, publishedAt: conversationDay === undefined ? record.publishedAt.slice(0, 10) : conversationDay,
    ...content, ...(conversationDay === undefined ? {} : { conversationDay }),
    reviewedBy: record.reviewerId, status: "published",
  };
};

export const loadCafePublications = async (inputDirectory = defaultInput) => {
  let entries;
  try { entries = await fs.readdir(inputDirectory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const groups = new Map();
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.name.endsWith(".json")) continue;
    if (!entry.isFile()) fail(`not a regular JSON file: ${entry.name}`);
    let record;
    try { record = JSON.parse(await fs.readFile(path.join(inputDirectory, entry.name), "utf8")); }
    catch (error) { throw new Error(`Invalid JSON in ${entry.name}: ${error.message}`, { cause: error }); }
    const normalized = validateCafePublication(record);
    const candidates = groups.get(record.id) || [];
    if (candidates.some(({ record: prior }) => JSON.stringify(prior.participants) !== JSON.stringify(record.participants))) {
      fail("participant mapping changed across revisions; use a new conversation ID");
    }
    candidates.push({ record, normalized });
    groups.set(record.id, candidates);
  }
  const selected = [];
  for (const candidates of groups.values()) {
    const approvalTime = ({ record }) => Date.parse(record.approvedAt || record.publishedAt);
    candidates.sort((a, b) => approvalTime(b) - approvalTime(a));
    if (candidates.length > 1 && approvalTime(candidates[0]) === approvalTime(candidates[1])) fail("ambiguous approval order for duplicate conversation ID");
    selected.push(candidates[0]);
  }
  // Newest first; ID tie-break preserves the three legacy records' existing history order.
  selected.sort((a, b) => Date.parse(b.record.publishedAt) - Date.parse(a.record.publishedAt) || a.record.id.localeCompare(b.record.id));
  return selected.map(({ normalized }) => normalized);
};

export const prepareCafeContent = async ({ inputDirectory = defaultInput, outputFile = defaultOutput } = {}) => {
  // Validate everything before writing: an invalid publication must fail the build, never silently fall back.
  const conversations = await loadCafePublications(inputDirectory);
  const source = `// Generated by scripts/prepare-cafe-content.js. Do not edit.\nexport const publishedCafeSnapshot = ${JSON.stringify(conversations, null, 2)};\n`;
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  const temporary = `${outputFile}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, source, { flag: "wx" });
    await fs.rename(temporary, outputFile);
  } finally { await fs.rm(temporary, { force: true }); }
  return conversations;
};
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  prepareCafeContent().then((records) => console.log(`Cafe snapshot prepared: ${records.length} JSON conversations${records.length ? "" : " (legacy fallback)"}.`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
