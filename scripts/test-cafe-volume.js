import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildCafeDraft, generateCafeBatch, parseCafeGenerationArgs, resolveCafeGenerationInputs, toCafeParticipantPairKey } from "./generate-cafe-conversation.js";
import { importCafeDraft, showCafeDraft, validateCafeReviewContent } from "./review-cafe-conversation.js";
import { cafePublicationContent, cafePublicationHash, legacyCafeConversations, loadCafePublications, prepareCafeContent, validateCafePublication } from "./prepare-cafe-content.js";
import { publishedCafeConversations } from "../src/data/cafeConversations/index.js";

// Confirmed Batch 1–3 publication manifest: ID, content hash, display day, actual audit timestamp.
const expectedPublications = [
  ["cafe-draft-56399515-5f71-4e3d-a9be-1b7e578af9c6","e412cc257e96701bd891bf61f9e16352f57071b27c215c4d8241001309cdad71","2026-10-07","2026-10-08T07:29:39.316Z"],
  ["cafe-draft-adf86a5b-4516-4dea-8fbe-19a377f367f5","e377d6a49a23c4539470106b2f735fd90c5621ee86291605972512683a975efb","2026-10-17","2026-10-08T07:29:39.324Z"],
  ["cafe-draft-20baef51-1580-4b69-b498-43c947dbaae1","ee54529caacb65d35be6c685203768a6d801b268de5c4c1d1d382251f943f34e","2026-10-22","2026-10-08T07:29:39.332Z"],
  ["cafe-draft-0cd0d93f-03e3-4a4c-98c4-dd9918257004","5081d57604626ee8fa00dd8040694d76b3b1cb36dea573b652ff9e69f50b6c1c","2026-11-01","2026-10-08T07:29:39.342Z"],
  ["cafe-draft-ee7b5d2c-3a21-4d0b-b131-429a71b77d5d","5884d8ef868a8a12ec2267848a3790d1b4b3a5286a0f44b7438d73db99689fb8","2026-11-06","2026-10-08T07:29:39.350Z"],
  ["cafe-draft-c2f94792-23a2-4e04-87f8-b7539815ba29","6f5317e53906626706be5cba8354fa9c25cb7fa20879772521821b1f0f1b66d0","2026-11-17","2026-10-08T07:29:39.358Z"],
  ["cafe-draft-766ad73e-06b1-4a15-9575-dab5637fcffc","2377da178c7eacd4cf7cf23e7edba0577578df0cada5656e5c7b73b579c84bc8","2026-11-23","2026-10-08T07:29:39.365Z"],
  ["cafe-draft-927c9da3-5c43-4f7a-8e14-b443fbab7c5d","8053e9e3128298ec35e2df3d66a403ede2cb36bf015a379bb34ff19cba89e2ce","2026-12-03","2026-10-08T07:29:39.375Z"],
  ["cafe-draft-0d95e5ff-dc8f-4210-9080-511163b02ea1","62000ab0fec544286294dcb86aaede7cdc4a01f59caf216b720b397fe93eec8c","2026-12-09","2026-10-08T07:29:39.382Z"],
  ["cafe-draft-d2c49d46-09fc-4168-a85d-f5719c0da5cd","8cc90daf417f99abb9a805de598ed27e987d1ec5bdcedd54bf5b82d696191b5b","2026-12-13","2026-10-08T07:29:39.389Z"],
  ["cafe-draft-fcb14584-75e1-49d5-9a64-58aeec1ec57a","dbdc6a7f53efc37b240f3d91fbb89a821cf70714e4f36fceae51b39bee732f63","2026-10-10","2026-10-08T07:29:39.396Z"],
  ["cafe-draft-fe697f6c-6dce-4c45-a769-29ee514d32ef","f6c0af3c8f4431a16159366652138eb0eafd35a2b07faea56d733ff66d185104","2026-10-18","2026-10-08T07:29:39.404Z"],
  ["cafe-draft-6420ebb9-8e06-4bec-8e36-bdb82c78efb9","a76fd8e8b64b5fa27cd48e89f3cc3b7cb011c21140a14fd41025348ba70b3a78","2026-10-26","2026-10-08T07:29:39.412Z"],
  ["cafe-draft-6709237f-e9b2-43b6-9590-830d83f6c113","c1f363e7d5e214af19c0d99984627816bb0b7e9eae8ee42b683ce095efaaf4b0","2026-11-03","2026-10-08T07:29:39.419Z"],
  ["cafe-draft-0d41f76c-b557-420c-994b-02010363cfcf","138dab8e61a1cd9473265b1ec37338603baaa7fdb656f0843147b5b664ed6e0b","2026-11-11","2026-10-08T07:29:39.427Z"],
  ["cafe-draft-10f439fa-3c0f-43a7-a06c-a91dd8902a14","8852c2db85ec424b42bc166501e7025fbd024ed852b23b8d67922568ee2aee46","2026-11-19","2026-10-08T07:29:39.435Z"],
  ["cafe-draft-90cad607-9dae-428f-a296-72a708b537ba","12f935f9a6a1bf08f8b86acead083ab01d61839ec338e25e74ba1bc952adef77","2026-11-27","2026-10-08T07:29:39.443Z"],
  ["cafe-draft-34b5d46a-b698-4644-b752-79274a8d38ea","90dcdd630235cdd2a26c5f46c7c0b102cbc457fa60a5508b85b8695deb390407","2026-12-04","2026-10-08T07:29:39.454Z"],
  ["cafe-draft-b7f9ddca-75a1-4b5b-9ec3-a24b83ab6ac6","a4b402bf1232e9e0e3fdaa155d77334170b35de15d9fdf1f837b1f9e4d3d2585","2026-12-08","2026-10-08T07:29:39.465Z"],
  ["cafe-draft-8890a27b-9449-45ba-986d-b1922b324945","7b4105bc8326da25b3c33197444b30202d772307e5f528836a661d962902b46c","2026-12-12","2026-10-08T07:29:39.476Z"],
  ["cafe-draft-8c5b8d73-f982-4f63-8c0f-371338c921a9","251bf33dba0a08275cb9a052bbbc4d3b1c9ec303a13e6b7fe4fa0948a3cf19b0","2026-10-14","2026-10-08T07:29:39.488Z"],
  ["cafe-draft-aac5f8ad-387a-4fce-b3db-e1b9c756a406","ab858db42fc22cd331f24c999ebbd0840ef73a6bf2328529b283ca54bd2d48b6","2026-10-24","2026-10-08T07:29:39.501Z"],
  ["cafe-draft-5491949a-764a-4346-b045-fd86e2b9488c","c33aae5f6dbf771607104f6a94b357caa7a4d1c954b3911df999b1adfcc2cae2","2026-10-29","2026-10-08T07:29:39.519Z"],
  ["cafe-draft-6bcf2d4b-892a-44e3-b790-467cee4f4b5a","1e1e539582bc5eb039804f9cf41b4e0ae4888e5ad825fa54858246269d4418f1","2026-11-08","2026-10-08T07:29:39.535Z"],
  ["cafe-draft-0b1b6066-01bf-4d89-b678-f9ba6dcce966","d4d2c99c0ad3f9355cfd7d2332fa2c2015d2f459e256ec7bb0cd3da6a8308aed","2026-11-15","2026-10-08T07:29:39.551Z"],
  ["cafe-draft-63f673d5-a77c-4139-9727-325326f57aa6","07ac111355d0a05d6f8ca30d68d77bf0772e2f2a4497b234d5b9fd9ddd410baf","2026-11-21","2026-10-08T07:29:39.575Z"],
  ["cafe-draft-6ced2146-715a-4b89-874d-f2b2b058b5bd","7bbab9f2a9f0451ba9a4919a9770c320cec14fc13929426d1e999637c8b37bd1","2026-11-25","2026-10-08T07:29:39.590Z"],
  ["cafe-draft-e5e6343a-f66d-4416-8332-cd320f008cd2","12e8886db4bc8a217c1ce579ed32920141ce22a50bc7ae4983f1515e8665da04","2026-11-30","2026-10-08T07:29:39.610Z"],
  ["cafe-draft-bf986fc9-63d5-419d-932d-fa672ae67674","c61dfdb48119f36b6e8126b4e2ff8a7a3a21efe6ef36c04c83cabd53001ef610","2026-12-06","2026-10-08T07:29:39.631Z"],
  ["cafe-draft-998b129e-83c9-488c-ab45-62e74dc013c4","81bd4f24889467d84fc46a1d933312d7ec2f366600438ee7217caee98444ae5c","2026-12-11","2026-10-08T07:29:39.645Z"],
];

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
  for (const legacy of legacyCafeConversations) assert.deepEqual(loaded.find(({ id }) => id === legacy.id), legacy);
  assert.deepEqual(loaded, publishedCafeConversations);
  assert.equal(loaded.length, 33);
  assert.equal(new Set(loaded.map(({ id }) => id)).size, 33);
  assert.equal(legacyCafeConversations.length, 3);
  const legacyIds = new Set(legacyCafeConversations.map(({ id }) => id));
  assert.deepEqual(loaded.filter(({ id }) => !legacyIds.has(id)).map(({ id }) => id).sort(), expectedPublications.map(([id]) => id).sort());
  for (const [id, contentHash, conversationDay, publishedAt] of expectedPublications) {
    const record = JSON.parse(await fs.readFile(new URL(`../cafe-data/published/${id}--rev-${contentHash}.json`, import.meta.url), "utf8"));
    assert.equal(record.id, id);
    assert.equal(record.contentHash, contentHash);
    assert.equal(cafePublicationHash(record), contentHash, "confirmed content and selection must remain unchanged");
    assert.equal(record.revisionId, `rev-${contentHash}`);
    assert.equal(record.conversationDay, conversationDay);
    assert.equal(record.publishedAt, publishedAt, "actual publication timestamp must not be replaced by the display day");
    assert.equal(record.reviewerId, "Vikram Sethi");
    const normalized = validateCafePublication(record);
    assert.equal(normalized.publishedAt, conversationDay);
    assert.deepEqual(loaded.find((entry) => entry.id === id), normalized);
  }
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
  console.log("PASS reviewed date revision binding; 33 confirmed publications, hashes/provenance, preserved display/audit dates, three unchanged legacy records and snapshot parity. No approvals/publications performed by this test.");
} finally {
  await cleanup();
}
