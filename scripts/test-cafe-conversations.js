import fs from "node:fs";
import process from "node:process";
import { cafePersonas, cafeGenerationConstraints } from "../src/data/agentPresentation/cafePersonas.js";
import {
  currentCafeConversation,
  earlierPublishedCafeConversations,
  getCafePresenceForPersonaId,
  publishedCafeConversations,
} from "../src/data/cafeConversations/index.js";
import { cafeSeedTopics } from "../src/data/cafeSeedTopics.js";
import {
  buildCafeDraft,
  buildCafeGenerationPrompt,
  resolveCafeGenerationInputs,
  selectCafeInviter,
  selectWeightedCafeParticipants,
  weightedRandomItem,
} from "./generate-cafe-conversation.js";

const failures = [];
const fail = (message) => failures.push(message);
const personaIds = new Set(cafePersonas.map(({ id }) => id));
const requiredFields = [
  "id",
  "publishedAt",
  "participants",
  "seedTopic",
  "invitedBy",
  "exchanges",
  "reviewedBy",
  "selection",
  "status",
];

if (publishedCafeConversations.length !== 2) {
  fail(`Phase 4 must expose exactly two published conversations, found ${publishedCafeConversations.length}.`);
}
if (currentCafeConversation !== publishedCafeConversations[0]) {
  fail("Current Café conversation must be the first newest-first published entry.");
}
if (
  earlierPublishedCafeConversations.length !== publishedCafeConversations.length - 1 ||
  earlierPublishedCafeConversations.some((conversation, index) => conversation !== publishedCafeConversations[index + 1])
) {
  fail("Earlier Café conversations must remain available in published order.");
}

for (const conversation of publishedCafeConversations) {
  for (const field of requiredFields) {
    if (!(field in conversation)) fail(`${conversation.id || "conversation"}: missing ${field}.`);
  }
  if (conversation.status !== "published") fail(`${conversation.id}: status must be published.`);
  if (conversation.invitedBy !== null && !conversation.participants?.includes(conversation.invitedBy)) {
    fail(`${conversation.id}: invitedBy must be null or one of its participants.`);
  }
  if (!conversation.id?.trim()) fail("Published conversation id must be non-empty.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(conversation.publishedAt)) {
    fail(`${conversation.id}: publishedAt must use YYYY-MM-DD.`);
  }
  if (!conversation.seedTopic?.trim()) fail(`${conversation.id}: seedTopic must be non-empty.`);
  if (!conversation.reviewedBy?.trim()) fail(`${conversation.id}: reviewedBy must be non-empty.`);
  const provenanceModes = new Set(["random", "manual", "not_recorded"]);
  for (const field of ["participants", "seedTopic", "exchangeCount", "invitedBy"]) {
    if (!provenanceModes.has(conversation.selection?.[field])) {
      fail(`${conversation.id}: invalid selection provenance for ${field}.`);
    }
  }
  if (conversation.participants?.length !== 2) fail(`${conversation.id}: must have exactly two participants.`);
  if (conversation.participants?.includes("mira-vale")) {
    fail("Permanent product rule: Mira must never participate in Café conversations.");
  }
  for (const participantId of conversation.participants || []) {
    if (!personaIds.has(participantId)) fail(`${conversation.id}: unknown participant ${participantId}.`);
  }
  if (conversation.exchanges?.length < 6 || conversation.exchanges?.length > 10) {
    fail(`${conversation.id}: exchanges must contain 6–10 entries.`);
  }
  for (const exchange of conversation.exchanges || []) {
    if (!personaIds.has(exchange.speaker)) fail(`${conversation.id}: unknown speaker ${exchange.speaker}.`);
    if (!conversation.participants?.includes(exchange.speaker)) {
      fail(`${conversation.id}: speaker ${exchange.speaker} is not a participant.`);
    }
    if (!exchange.text?.trim()) fail(`${conversation.id}: exchange text must be non-empty.`);
  }
  for (const participantId of conversation.participants || []) {
    if (!conversation.exchanges?.some(({ speaker }) => speaker === participantId)) {
      fail(`${conversation.id}: participant ${participantId} must speak at least once.`);
    }
  }
}

const agentSource = fs.readFileSync(new URL("../src/components/AiAgentsPage.jsx", import.meta.url), "utf8");
const publishedParticipantIds = new Set(
  currentCafeConversation.participants,
);

for (const persona of cafePersonas) {
  const expectedPresence = publishedParticipantIds.has(persona.id) ? "in_cafe" : "at_work";
  if (getCafePresenceForPersonaId(persona.id) !== expectedPresence) {
    fail(`${persona.name}: expected Phase 4 derived presence ${expectedPresence}.`);
  }
}
if (!agentSource.includes('name: "Mira Vale"') || !agentSource.includes('presence: "at_work"')) {
  fail("Permanent product rule: Mira must remain at_work.");
}

if (agentSource.includes("conversation.seedTopic")) {
  fail("The seed topic must remain publication metadata and must not render publicly.");
}
if (agentSource.includes("conversation.selection")) {
  fail("Selection provenance must remain internal and must not render publicly.");
}
if (
  !agentSource.includes("Earlier Café conversations") ||
  !agentSource.includes("invited {invitedParticipantName} to the Café")
) {
  fail("Public Café rendering must expose earlier conversations and the light invitation line.");
}

const generatorSource = fs.readFileSync(
  new URL("./generate-cafe-conversation.js", import.meta.url),
  "utf8",
);
const gitignoreSource = fs.readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
if (!generatorSource.includes("../src/data/cafeConversations/drafts")) {
  fail("Manual generator output must target the physical drafts directory.");
}
if (!gitignoreSource.includes("src/data/cafeConversations/drafts/")) {
  fail("Manual Café draft output must be gitignored.");
}
const theoPrompt = buildCafeGenerationPrompt({
  participantIds: ["theo-mercer", "elena-cross"],
  seedTopic: "an ordinary test topic",
  exchangeCount: 6,
});
for (const constraint of cafeGenerationConstraints) {
  if (!theoPrompt.includes(constraint)) fail(`generator prompt omitted constraint: ${constraint}`);
}
for (const persona of cafePersonas.filter(({ id }) => ["theo-mercer", "elena-cross"].includes(id))) {
  for (const value of Object.values(persona).flat()) {
    if (typeof value === "string" && !theoPrompt.includes(value)) {
      fail(`generator prompt omitted ${persona.id} profile value: ${value}`);
    }
  }
}
const noTheoPrompt = buildCafeGenerationPrompt({
  participantIds: ["ravi-sen", "selene-hart"],
  seedTopic: "an ordinary test topic",
  exchangeCount: 6,
});
const theoNotes = cafePersonas.find(({ id }) => id === "theo-mercer").generationNotes;
if (noTheoPrompt.includes(theoNotes)) fail("Theo generationNotes must only appear when Theo participates.");

const randomValues = [0, 0, 0, 0, 0];
const randomInputs = resolveCafeGenerationInputs({
  random: () => randomValues.shift(),
});
if (randomInputs.participantIds.length !== 2 || new Set(randomInputs.participantIds).size !== 2) {
  fail("Default selection must produce two distinct participants.");
}
if (randomInputs.participantIds.some((id) => !personaIds.has(id) || id.includes("mira"))) {
  fail("Default selection must use valid non-Mira Café personas.");
}
if (!cafeSeedTopics.includes(randomInputs.seedTopic)) {
  fail("Default seed must come from cafeSeedTopics.");
}
if (randomInputs.exchangeCount < 6 || randomInputs.exchangeCount > 10) {
  fail("Default exchange count must be 6–10.");
}
if (Object.values(randomInputs.selection).some((mode) => mode !== "random")) {
  fail("Omitted generation inputs must record random provenance.");
}

const manualInputs = resolveCafeGenerationInputs({
  participantIds: ["ravi-sen", "selene-hart"],
  seedTopic: "a manually supplied ordinary topic",
  exchangeCount: 9,
});
if (
  manualInputs.participantIds.join(",") !== "ravi-sen,selene-hart" ||
  manualInputs.seedTopic !== "a manually supplied ordinary topic" ||
  manualInputs.exchangeCount !== 9 ||
  manualInputs.selection.participants !== "manual" ||
  manualInputs.selection.seedTopic !== "manual" ||
  manualInputs.selection.exchangeCount !== "manual" ||
  manualInputs.selection.invitedBy !== "random"
) {
  fail("Manual generation inputs and provenance must remain unchanged.");
}

const draft = buildCafeDraft({
  participantIds: randomInputs.participantIds,
  seedTopic: randomInputs.seedTopic,
  invitedBy: randomInputs.invitedBy,
  exchanges: [],
  selection: randomInputs.selection,
});
if (draft.selection !== randomInputs.selection || draft.status !== "unpublished") {
  fail("Draft output must preserve selection provenance and remain unpublished.");
}

for (const persona of cafePersonas) {
  const { appearance, invitation } = persona.cafeSelectionWeights || {};
  if (!Number.isFinite(appearance) || appearance <= 0) {
    fail(`${persona.id}: appearance weight must be positive.`);
  }
  if (!Number.isFinite(invitation) || invitation < 0) {
    fail(`${persona.id}: invitation weight must be non-negative.`);
  }
}
const weightsById = Object.fromEntries(
  cafePersonas.map(({ id, cafeSelectionWeights }) => [id, cafeSelectionWeights]),
);
if (
  weightsById["elena-cross"].appearance <= weightsById["theo-mercer"].appearance ||
  weightsById["ravi-sen"].appearance <= weightsById["theo-mercer"].appearance ||
  weightsById["selene-hart"].appearance <= weightsById["theo-mercer"].appearance ||
  weightsById["selene-hart"].appearance >= weightsById["elena-cross"].appearance
) {
  fail("Habit weights must keep Elena/Ravi high, Theo low, and Selene intermediate.");
}

const deterministicWeightedItem = weightedRandomItem(
  [{ id: "low", weight: 1 }, { id: "high", weight: 4 }],
  ({ weight }) => weight,
  () => 0.99,
);
if (deterministicWeightedItem.id !== "high") {
  fail("Weighted helper must respect deterministic threshold selection.");
}
const deterministicParticipants = selectWeightedCafeParticipants(() => 0);
if (
  deterministicParticipants.length !== 2 ||
  new Set(deterministicParticipants).size !== 2 ||
  deterministicParticipants.some((id) => !personaIds.has(id))
) {
  fail("Weighted participant helper must return two distinct valid personas.");
}
const deterministicInviter = selectCafeInviter(["elena-cross", "theo-mercer"], () => 0);
if (deterministicInviter !== "elena-cross") {
  fail("Invitation helper must select a valid weighted participant deterministically.");
}

if (failures.length) {
  console.error("Café conversation tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Café conversation tests passed.");
console.log("Validated two published conversations, current/history ordering, participant/speaker integrity, derived presence, weighted selection, invitations, provenance, and complete generator prompts.");
