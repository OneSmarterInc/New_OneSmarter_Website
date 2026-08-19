import fs from "node:fs";
import process from "node:process";
import { cafePersonas, cafeGenerationConstraints } from "../src/data/agentPresentation/cafePersonas.js";
import { publishedCafeConversations } from "../src/data/cafeConversations/index.js";
import { buildCafeGenerationPrompt } from "./generate-cafe-conversation.js";

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
  "status",
];

if (publishedCafeConversations.length !== 1) {
  fail(`Phase 3 must expose exactly one published conversation, found ${publishedCafeConversations.length}.`);
}

for (const conversation of publishedCafeConversations) {
  for (const field of requiredFields) {
    if (!(field in conversation)) fail(`${conversation.id || "conversation"}: missing ${field}.`);
  }
  if (conversation.status !== "published") fail(`${conversation.id}: status must be published.`);
  if (conversation.invitedBy !== null) fail(`${conversation.id}: Phase 3 invitedBy must be null.`);
  if (!conversation.id?.trim()) fail("Published conversation id must be non-empty.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(conversation.publishedAt)) {
    fail(`${conversation.id}: publishedAt must use YYYY-MM-DD.`);
  }
  if (!conversation.seedTopic?.trim()) fail(`${conversation.id}: seedTopic must be non-empty.`);
  if (!conversation.reviewedBy?.trim()) fail(`${conversation.id}: reviewedBy must be non-empty.`);
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
const presenceByName = Object.fromEntries(
  [...agentSource.matchAll(/\{\s*name:\s*"([^"]+)",([\s\S]*?)\n {2}\},/g)].map(([, name, body]) => [
    name,
    body.match(/presence:\s*"([^"]+)"/)?.[1],
  ]),
);
const nameByPersonaId = Object.fromEntries(cafePersonas.map(({ id, name }) => [id, name]));
const publishedParticipantIds = new Set(
  publishedCafeConversations.flatMap(({ participants }) => participants),
);

for (const persona of cafePersonas) {
  const expectedPresence = publishedParticipantIds.has(persona.id) ? "in_cafe" : "at_work";
  if (presenceByName[persona.name] !== expectedPresence) {
    fail(`${persona.name}: expected Phase 3 presence ${expectedPresence}.`);
  }
}
if (presenceByName["Mira Vale"] !== "at_work") {
  fail("Permanent product rule: Mira must remain at_work.");
}

if (agentSource.includes("conversation.seedTopic")) {
  fail("The seed topic must remain publication metadata and must not render publicly.");
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
for (const participantId of publishedParticipantIds) {
  if (presenceByName[nameByPersonaId[participantId]] !== "in_cafe") {
    fail(`${participantId}: published participant must be in_cafe.`);
  }
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

if (failures.length) {
  console.error("Café conversation tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Café conversation tests passed.");
console.log("Validated one published conversation, participant/speaker integrity, 6–10 exchanges, presence alignment, and complete generator prompts.");
