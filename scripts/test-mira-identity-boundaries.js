import assert from "node:assert/strict";
import { runMiraResponseAdapter } from "../src/server/mira/llmAdapter.js";
import { onesmarterPublicKnowledgeBase } from "../src/data/agentKnowledge/onesmarterPublicKb.js";
import { miraApprovedEvidence } from "../src/server/mira/miraApprovedEvidence.js";
import { resolveMiraDirectFactualTopic } from "../src/server/mira/miraResponseModes.js";
import { validateMiraFinalResponse } from "../src/server/mira/miraFinalResponseValidator.js";

const originalKnowledge = JSON.stringify(onesmarterPublicKnowledgeBase);
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, model: "fixture" };
const intentFor = (message, overrides = {}) => ({
  domain: "agent_roles", topic: "Mira Vale Professional Role", entities: ["Mira Vale"],
  proposition: message, polarity: "positive", negationScope: [], questionType: "how",
  speechAct: "explanation_request", requestedDetail: message, followUpReferences: [],
  confidence: 0.97, clarificationNeeded: false, mentionedNames: [], ...overrides,
});
let cases = 0;
const run = async (message, overrides = {}, history = []) => {
  cases += 1;
  return runMiraResponseAdapter({
    message, config, conversationHistory: history,
    semanticIntentProvider: async () => ({ intent: intentFor(message, overrides) }),
    // Exercise the retained approved answer when generation is unavailable.
    openAiAdapter: async () => ({ error: "offline_fixture" }),
  });
};

for (const message of [
  "What is your name and explain your work in detail?",
  "What kind of AI agent are you?", "Describe your own role here.",
  "How would you introduce yourself to a new visitor?",
]) {
  const result = await run(message);
  assert.deepEqual(result.matchedEntries.map(({ id }) => id), ["mira-professional-role"]);
  assert.ok(result.answerSeed.includes("Mira Vale"));
  assert.ok(result.answerSeed.includes("AI agent, not a human"));
  assert.ok(!result.answerSeed.includes("AI Agentic Services"));
}

// An open identity explanation need not have a yes/no or HOW question type.
// Narrowing a mixed lexical selection must still replace its old answer seed.
const identity = await run("What is Mira?", { questionType: "unknown" });
assert.deepEqual(identity.matchedEntries.map(({ id }) => id), ["mira-professional-role"]);
assert.ok(identity.answerSeed.includes("AI agent, not a human"));

for (const message of [
  "Can you view private customer data?", "Can Mira browse the internet?",
  "Can you prove customer compliance?", "Are you able to change production systems?",
  "Do you have access to our records?",
]) {
  const result = await run(message, { domain: "professional_agent_boundaries", questionType: "positive_yes_no" });
  assert.ok(result.semanticIntentSupplement, message);
  assert.ok(result.answerSeed.includes("cannot browse the internet"), message);
  assert.ok(result.answerSeed.includes("cannot access private customer data"), message);
  assert.ok(result.answerSeed.includes("or prove customer compliance"), message);
}

for (const name of ["LocalMind", "Unlisted Product", "CedarDesk"]) {
  let calls = 0;
  const result = await runMiraResponseAdapter({
    message: `What is ${name}?`, config,
    semanticIntentProvider: async () => ({ intent: intentFor(`Explain ${name}`, {
      domain: "general_definition", topic: name, entities: [name], mentionedNames: [name],
    }) }),
    openAiAdapter: async () => { calls += 1; throw new Error("Unknown names must not authorize speculation"); },
  });
  cases += 1;
  assert.equal(calls, 0);
  assert.ok(result.answerSeed.includes("don't have approved public information"));
}

for (const message of ["Explain your platforms.", "Describe the two platform offerings."]) {
  const result = await run(message, {
    domain: "platforms", topic: "Secure Ticketing and Case Management | Bill Audit & Bill Pay",
    entities: ["Secure Ticketing and Case Management", "Bill Audit & Bill Pay"],
  });
  assert.ok(result.answerSeed.includes("Secure Ticketing"));
  assert.ok(result.answerSeed.includes("Bill Audit"));
}
const category = await run("Explain your platforms.", {
  domain: "platforms", topic: "OneSmarter Overview", entities: ["OneSmarter platforms"],
});
assert.deepEqual(category.matchedEntries.slice(0, 2).map(({ id }) => id), ["secure-ticketing-case-management", "bill-audit-bill-pay"]);
assert.ok(category.matchedEntries.some(({ id }) => id === "company-overview"));

for (const message of [
  "Tell me about your HIPAA assessment.",
  "Does the HIPAA assessment apply to your customers?",
  "Does your completed HIPAA assessment describe a service you provide to customers?",
]) {
  const result = await run(message, {
    domain: "compliance", topic: "HIPAA Security Rule Compliance Assessment Completed",
    entities: ["HIPAA Security Rule Compliance Assessment Completed"],
    questionType: message.startsWith("Does") ? "positive_yes_no" : "how",
  });
  assert.deepEqual(result.matchedEntries.map(({ id }) => id), ["hipaa-security-rule-assessment"], message);
  assert.match(result.answerSeed, /OneSmarter's own safeguards and practices/, message);
  assert.match(result.answerSeed, /not a service that OneSmarter provides to customers/, message);
  assert.match(result.answerSeed, /readiness support is separate/, message);
}

const complianceEntry = miraApprovedEvidence.find(({ id }) => id === "compliance-cyber-assurance-overview");
const guarded = validateMiraFinalResponse({
  answerSeed: `An unapproved assertion about NebulaCorp. ${complianceEntry.approvedSummary}`,
  validationFallbackAnswer: complianceEntry.answerFacts.join(" "),
  groundingStatus: "grounded", matchedEntries: [complianceEntry],
  semanticIntentSupplement: intentFor("Does the service establish universal compliance?", { questionType: "positive_yes_no" }),
});
cases += 1;
assert.equal(guarded.finalResponseValidation.action, "fallback");
assert.ok(guarded.answerSeed.includes("does not establish compliance with all regulations"));

for (const message of ["What is SOC 2 Type II?", "Explain SOC 2."]) {
  const factual = resolveMiraDirectFactualTopic(message);
  cases += 1;
  assert.ok(factual.answer.includes("operating effectiveness"));
  assert.ok(factual.answer.includes("rather than a certification"));
  assert.ok(factual.answer.includes("does not establish OneSmarter's audit period"));
}
for (const message of ["Why is attestation different from certification?", "How do those assurance outputs differ?"]) {
  const result = await run(message, {
    domain: "compliance", topic: miraApprovedEvidence.find(({ id }) => id === "soc2-attested").title,
    questionType: "comparison", entities: ["SOC 2 attestation", "certification"],
    followUpReferences: ["SOC 2"],
  }, [{ role: "user", content: "What is SOC 2?" }, { role: "assistant", content: "SOC 2 provides an attestation report." }]);
  assert.ok(result.answerSeed.includes("rather than a certification"), result.answerSeed);
  assert.ok(!result.answerSeed.includes("Which platforms"));
}
for (const message of ["Tell me a joke.", "What is today's weather?"]) {
  const result = await run(message, { domain: "unrelated_factual", topic: "unrelated request", entities: [] });
  assert.ok(!result.answerSeed.includes("business-specific"));
}
assert.equal(JSON.stringify(onesmarterPublicKnowledgeBase), originalKnowledge, "Shared knowledge must remain unchanged");
console.log(`Mira identity/boundary regressions passed: ${cases} controlled cases (no live provider claimed).`);
