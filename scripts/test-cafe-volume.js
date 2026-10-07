import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildCafeDraft, generateCafeBatch, parseCafeGenerationArgs, resolveCafeGenerationInputs, toCafeParticipantPairKey } from "./generate-cafe-conversation.js";
import { importCafeDraft, showCafeDraft, validateCafeReviewContent } from "./review-cafe-conversation.js";
import { cafePublicationContent, cafePublicationHash, legacyCafeConversations, loadCafePublications, prepareCafeContent, validateCafePublication } from "./prepare-cafe-content.js";
import { publishedCafeConversations } from "../src/data/cafeConversations/index.js";

// Fixed stratified draws: only topic draws advance; participant draws stay fixed.
// Without accumulating drafts the same participant pairing repeats every time.
const randomForBatch = () => {
  let call = 0;
  return () => {
    const index = Math.floor(call / 4);
    return [0.37, 0.61, (index + 0.5) / 12, 0.4][call++ % 4];
  };
};
const publishedBefore = JSON.stringify(publishedCafeConversations);
const batch = [];
const selections = [];
const random = randomForBatch();
for (let index = 0; index < 12; index += 1) {
  const recent = [...batch, ...publishedCafeConversations].slice(0, 4);
  const selection = resolveCafeGenerationInputs({ exchangeCount: 6, publishedConversations: [...batch, ...publishedCafeConversations], random });
  const pair = toCafeParticipantPairKey(selection.participantIds);
  assert.ok(!recent.some(({ seedTopic }) => seedTopic === selection.seedTopic));
  assert.ok(!recent.some(({ participants }) => toCafeParticipantPairKey(participants) === pair), "recent draft AND published pairs must be excluded");
  selections.push(selection);
  batch.unshift({ participants: selection.participantIds, seedTopic: selection.seedTopic });
}
assert.equal(new Set(selections.map(({ seedTopic }) => seedTopic)).size, 12);
assert.ok(new Set(selections.map(({ participantIds }) => toCafeParticipantPairKey(participantIds))).size >= 5);
const staleRandom = randomForBatch();
const stale = Array.from({ length: 12 }, () => resolveCafeGenerationInputs({ exchangeCount: 6, publishedConversations: publishedCafeConversations, random: staleRandom }));
assert.equal(new Set(stale.map(({ participantIds }) => toCafeParticipantPairKey(participantIds))).size, 1);
assert.notDeepEqual(stale, selections, "published-only history must not satisfy the batch fixture");
console.log("PASS 12 deterministic selections: 12 unique topics, 5/6 pairs, four-record exclusions; published-only control repeats one pair.");

const actual = [];
await generateCafeBatch({ count: 12, inputs: { exchangeCount: 6 } }, {
  random: randomForBatch(),
  generate: async (selection) => { actual.push(selection); return `draft-${actual.length}`; },
});
assert.deepEqual(actual, selections.map((selection) => ({ ...selection, conversationDay: undefined })));
assert.equal(JSON.stringify(publishedCafeConversations), publishedBefore);
const positional = ["theo-mercer", "elena-cross", "an imagined topic", "6"];
assert.deepEqual(parseCafeGenerationArgs(positional), { count: 1, conversationDays: [], inputs: {
  participantIds: positional.slice(0, 2), seedTopic: positional[2], exchangeCount: "6",
} });
assert.equal(parseCafeGenerationArgs(["--count=10", ...positional]).count, 10);
for (const args of [["--count=0"], ["--count=1.5"], ["--count=NaN"], ["--count=2", "--count=3"], ["--unknown=1"], ["--conversation-days=2026-02-30"], ["--count=2", "--conversation-days=2026-10-07"]]) {
  assert.throws(() => parseCafeGenerationArgs(args));
}
let generated = 0;
await assert.rejects(generateCafeBatch({ count: 2, conversationDays: ["2026-10-07", "bad"] }, { generate: async () => { generated++; } }));
assert.equal(generated, 0);
await assert.rejects(generateCafeBatch({ count: 3 }, { generate: async () => { generated++; throw new Error("stop batch"); } }), /stop batch/);
assert.equal(generated, 1, "failed generation must stop, not create later drafts");
const dates = ["2026-10-07", "2026-10-17"];
const datedSelections = [];
await generateCafeBatch(parseCafeGenerationArgs(["--count=2", `--conversation-days=${dates.join(",")}`, ...positional]), {
  generate: async (selection) => { datedSelections.push(selection); return "fixture"; },
});
assert.deepEqual(datedSelections.map(({ conversationDay }) => conversationDay), dates);
console.log("PASS production batch loop, positional compatibility, count/date validation, failure stop, and explicit date assignment (no Ollama).");

const input = {
  ...selections[0],
  exchanges: Array.from({ length: 6 }, (_, index) => ({ speaker: selections[0].participantIds[index % 2], text: `Suppose an imagined sign had ${index + 1} letters?` })),
};
const keys = ["participants", "seedTopic", "conversationDay", "invitedBy", "exchanges", "selection"];
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
for (const conversationDay of [undefined, "2026-10-07", "2028-02-29"]) {
  const draft = buildCafeDraft({ ...input, conversationDay });
  const reviewContent = validateCafeReviewContent(draft);
  const publicationContent = cafePublicationContent(draft);
  assert.deepEqual(Object.keys(reviewContent), keys);
  assert.deepEqual(Object.keys(publicationContent), keys);
  assert.deepEqual(Object.keys(draft).filter((key) => keys.includes(key)), keys);
  assert.equal(JSON.stringify(reviewContent), JSON.stringify(publicationContent));
  assert.equal(draft.contentHash, hash(reviewContent));
  assert.equal(draft.contentHash, cafePublicationHash(draft));
  const publishedAt = "2026-10-07T12:00:00.000Z";
  const fixture = { ...draft, conversationId: draft.id, revisionId: `rev-${draft.contentHash}`, status: "published",
    reviewerId: "synthetic-test-fixture", approvedAt: "2026-10-07T11:00:00.000Z", publishedAt };
  const normalized = validateCafePublication(fixture);
  assert.equal(normalized.publishedAt, conversationDay === undefined ? "2026-10-07" : conversationDay);
  assert.equal(fixture.publishedAt, publishedAt, "audit timestamp must not change");
  if (conversationDay === undefined) {
    assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(reviewContent)), "conversationDay"), false);
    assert.equal(normalized.conversationDay, undefined);
  }
}
const draft = buildCafeDraft({ ...input, conversationDay: "2026-10-07" });
for (const conversationDay of [null, "", "2026-02-29", "2026-02-30", "2026-13-01", "2026-1-01", "2026-10-07T00:00:00.000Z", 20261007]) {
  assert.throws(() => buildCafeDraft({ ...input, conversationDay }), /conversation day/);
  assert.throws(() => validateCafeReviewContent({ ...draft, conversationDay }), /conversation day/);
  assert.throws(() => validateCafePublication({ ...draft, conversationId: draft.id, status: "published", conversationDay }), /conversation day/);
}
assert.notEqual(cafePublicationHash(draft), cafePublicationHash({ ...draft, conversationDay: "2026-10-08" }));
console.log("PASS date validation, three canonical builders/order/hash, undefined omission, display date, immutable publication timestamp.");

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "cafe-volume-"));
const cleanup = async () => {
  if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith("cafe-volume-")) throw new Error("Unexpected cleanup path");
  await fs.rm(temporary, { recursive: true, force: true });
};
try {
  const source = path.join(temporary, "source.json");
  await fs.writeFile(source, JSON.stringify(draft));
  const root = path.join(temporary, "review");
  const imported = await importCafeDraft(source, { root });
  assert.equal(imported.contentHash, draft.contentHash);
  assert.equal(imported.content.conversationDay, "2026-10-07");
  assert.equal((await showCafeDraft(imported.conversationId, imported.revisionId, { root })).review, null);
  const revisionPath = path.join(root, "drafts", `${imported.conversationId}--${imported.revisionId}.json`);
  imported.content.conversationDay = "2026-10-08";
  await fs.writeFile(revisionPath, JSON.stringify(imported));
  await assert.rejects(showCafeDraft(imported.conversationId, imported.revisionId, { root }), /revision changed/);
  const loaded = await loadCafePublications();
  assert.deepEqual(loaded, legacyCafeConversations);
  assert.deepEqual(loaded, publishedCafeConversations);
  assert.equal(loaded.length, 3);
  for (const legacy of legacyCafeConversations) {
    const record = JSON.parse(await fs.readFile(new URL(`../cafe-data/published/${legacy.id}.json`, import.meta.url), "utf8"));
    assert.equal(cafePublicationHash(record), record.contentHash);
    assert.deepEqual(validateCafePublication(record), legacy);
    assert.equal(validateCafePublication(record).publishedAt, "2026-08-19");
  }
  const outputFile = path.join(temporary, "snapshot.js");
  await prepareCafeContent({ outputFile });
  const original = await fs.readFile(new URL("../src/data/cafeConversations/publishedCafeSnapshot.js", import.meta.url), "utf8");
  assert.equal((await fs.readFile(outputFile, "utf8")).replaceAll("\r\n", "\n"), original.replaceAll("\r\n", "\n"));
  console.log("PASS reviewed date revision binding; three legacy hashes/provenance, 19 August dates and snapshot unchanged. No approvals/publications performed by this test.");
} finally {
  await cleanup();
}
