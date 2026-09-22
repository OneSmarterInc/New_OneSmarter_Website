import assert from "node:assert/strict";
import { runMiraLocalHarness } from "../src/data/agentKnowledge/miraLocalEngine.js";
import { onesmarterPublicKnowledgeBase } from "../src/data/agentKnowledge/onesmarterPublicKb.js";
import { runMiraResponseAdapter } from "../src/server/mira/llmAdapter.js";
import { validateMiraModelOutput } from "../src/server/mira/miraOutputValidator.js";

const config = {
  mode: "staging_llm", provider: "openai", providerConfigComplete: true,
  model: "test-model", apiKeyConfigured: true,
};
const intent = (overrides = {}) => ({
  domain: "compliance", topic: "customer certification boundary",
  entities: ["OneSmarter", "customer systems"],
  proposition: "Can OneSmarter certify customer systems?", polarity: "positive",
  negationScope: [], questionType: "why", speechAct: "explanation_request",
  requestedDetail: "why OneSmarter does not certify customer systems",
  followUpReferences: ["the preceding customer-certification proposition"],
  confidence: 0.97, clarificationNeeded: false, mentionedNames: [], ...overrides,
});

for (const followUp of ["Why?", "Why not?", "How?", "What about that?"]) {
  let answerProviderCalls = 0;
  const result = await runMiraResponseAdapter({
    message: followUp,
    conversationHistory: [
      { role: "user", content: "Does OneSmarter certify customer systems?" },
      { role: "assistant", content: "No. OneSmarter does not certify customer systems." },
    ],
    config,
    semanticIntentProvider: async () => ({ intent: intent({
      questionType: followUp.startsWith("How") ? "how" : followUp.startsWith("What") ? "follow_up" : "why",
    }) }),
    openAiAdapter: async () => {
      answerProviderCalls += 1;
      return {
        modelOutput: {
          answer: "OneSmarter does not certify customer systems. Its readiness support can help customers prepare for an independent certification process.",
          handoffNeeded: false,
          handoffReason: null,
          suggestedFollowUps: [],
          groundingStatus: "grounded",
          outputSafetyStatus: "passed",
        },
      };
    },
  });
  assert.ok(result.semanticIntentSupplement, `${followUp}: semantic supplement missing`);
  assert.equal(result.semanticIntentSupplement.followUpReferences.length > 0, true, followUp);
  assert.equal(result.matchedEntries.length > 0, true, followUp);
  assert.match(result.answerSeed, /does not certify|readiness|independent certification/i, followUp);
  assert.equal(answerProviderCalls, 1, `${followUp}: semantic follow-up should use the normal grounded answer flow`);
  assert.match(result.answerSeed, /does not certify customer systems/i, followUp);
}

const ambiguous = await runMiraResponseAdapter({
  message: "What about that?",
  conversationHistory: [
    { role: "user", content: "Tell me about platforms and compliance." },
    { role: "assistant", content: "Those are separate approved topics." },
  ],
  config,
  semanticIntentProvider: async () => ({ intent: intent({
    proposition: "", requestedDetail: "", followUpReferences: ["that"],
    confidence: 0.25, clarificationNeeded: true,
  }) }),
  openAiAdapter: async () => { throw new Error("ambiguous follow-up must not reach answer generation"); },
});
assert.equal(ambiguous.clarificationNeeded || ambiguous.confidence === "low", true);
assert.equal(ambiguous.semanticIntentSupplement.clarificationNeeded, true);

const agentEntry = onesmarterPublicKnowledgeBase.find(({ id }) => id === "ai-agentic-services");
for (const expected of ["Mira Vale", "Theo Mercer", "Elena Cross", "Ravi Sen", "Selene Hart"]) {
  assert.equal(agentEntry.sourceFacts.some((fact) => fact.includes(expected)), true, expected);
}
assert.equal(agentEntry.sourceFacts.some((fact) => /concept and showcase|first live agent candidate/i.test(fact)), false);

const roleCases = [
  ["Which professional helps interpret certification language?", "Elena Cross reviews compliance, certification, and readiness language."],
  ["Who examines a supplied web page for AI readability?", "Theo Mercer analyzes supplied website or page content and AI readability."],
  ["Who explains ticket routing and operational workflows?", "Ravi Sen explains approved operations, workflow, ticketing, and routing capabilities without accessing customer systems."],
  ["Who explains how OneSmarter's agents are architected?", "Selene Hart explains OneSmarter's AI-agent architecture and current orchestration boundaries."],
];
for (const [message, answer] of roleCases) {
  const result = runMiraLocalHarness(message);
  assert.equal(result.matchedEntries.some(({ id }) => id === "ai-agentic-services"), true, message);
  const validation = validateMiraModelOutput({
    answer,
    handoffNeeded: false,
    handoffReason: null,
    suggestedFollowUps: [],
    groundingStatus: "grounded",
    outputSafetyStatus: "passed",
  }, {
    message,
    localHarnessResult: result,
  });
  assert.equal(validation.valid, true, `${message}: ${validation.violations.join(",")}`);
}

const healthcareEvidence = runMiraLocalHarness("Explain healthcare and TPA workflow operations.");
const supportedHealthcare = {
  answer: "OneSmarter supports healthcare and TPA operations through Claims Processing Services, including claims workflow modernization, member and provider portals, legacy data integration, reporting, and operational visibility.",
  handoffNeeded: false, handoffReason: null, suggestedFollowUps: [],
  groundingStatus: "grounded", outputSafetyStatus: "passed",
};
const supportedValidation = validateMiraModelOutput(supportedHealthcare, {
  message: "Explain healthcare and TPA workflow operations.",
  localHarnessResult: healthcareEvidence,
});
assert.equal(supportedValidation.valid, true, supportedValidation.violations.join(","));

for (const message of [
  "How does OneSmarter support healthcare and TPA workflow operations?",
  "Describe claims-workflow modernization and operational visibility for a TPA.",
  "Explain member and provider portals, reporting, and legacy data integration.",
]) {
  const evidence = runMiraLocalHarness(message);
  const validation = validateMiraModelOutput(supportedHealthcare, {
    message,
    localHarnessResult: evidence,
  });
  assert.equal(validation.valid, true, `${message}: ${validation.violations.join(",")}`);
}

let healthcareProviderCalls = 0;
const healthcareResponse = await runMiraResponseAdapter({
  message: "Explain healthcare and TPA workflow operations, including legacy data integration.",
  config,
  semanticIntentProvider: async () => ({ intent: intent({
    domain: "healthcare",
    topic: "Claims Processing Services",
    entities: ["OneSmarter", "healthcare organizations", "TPAs"],
    proposition: "OneSmarter supports healthcare and TPA workflow operations",
    questionType: "how",
    speechAct: "explanation_request",
    requestedDetail: "claims workflow modernization and legacy data integration",
    followUpReferences: [],
  }) }),
  openAiAdapter: async () => {
    healthcareProviderCalls += 1;
    return { modelOutput: supportedHealthcare };
  },
});
assert.equal(healthcareProviderCalls, 1);
assert.equal(healthcareResponse.fallbackUsed, false);
assert.match(healthcareResponse.answerSeed, /legacy data integration/i);

const unsupportedIntegration = validateMiraModelOutput({
  ...supportedHealthcare,
  answer: "Claims Processing Services integrates with Salesforce and AcmeQueue.",
}, {
  message: "Which systems does claims processing integrate with?",
  localHarnessResult: healthcareEvidence,
});
assert.equal(unsupportedIntegration.valid, false);
assert.equal(unsupportedIntegration.violations.includes("unsupported_integration"), true);

for (const answer of [
  "We do not guarantee compliance outcomes.",
  "We don't guarantee business or compliance outcomes.",
  "OneSmarter cannot guarantee compliance.",
  "OneSmarter can't promise compliance outcomes.",
  "OneSmarter never guarantees compliance.",
  "This is readiness support without claiming guaranteed compliance.",
]) {
  const validation = validateMiraModelOutput({
    ...supportedHealthcare,
    answer,
  }, {
    message: "What boundaries apply?",
    localHarnessResult: runMiraLocalHarness("OneSmarter compliance readiness"),
  });
  assert.equal(validation.valid, true, `${answer}: ${validation.violations.join(",")}`);
}

for (const answer of [
  "We guarantee compliance outcomes.",
  "OneSmarter promises customer compliance.",
  "The platform guarantees security.",
]) {
  const validation = validateMiraModelOutput({
    ...supportedHealthcare,
    answer,
  }, {
    message: "Do you guarantee this outcome?",
    localHarnessResult: runMiraLocalHarness("OneSmarter compliance readiness"),
  });
  assert.equal(validation.valid, false, answer);
  assert.equal(validation.violations.includes("unsupported_guarantee"), true, answer);
}

console.log("Mira limited semantic-gap tests passed.");
