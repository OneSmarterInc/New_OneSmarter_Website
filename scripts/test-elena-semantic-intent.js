import assert from "node:assert/strict";
import {
  buildElenaSemanticClaimCandidate,
  ELENA_COMPLIANCE_LANGUAGE_REVIEW_TOPIC,
  resolveElenaSemanticClaimPolicy,
  runElenaResponseAdapter,
} from "../src/server/elena/elenaResponseAdapter.js";
import { evaluateElenaClaim } from "../src/data/agentKnowledge/elenaClaimRules.js";
import { readElenaRuntimeConfig } from "../src/server/elena/elenaRuntimeConfig.js";

const config = readElenaRuntimeConfig({
  ELENA_LLM_MODE: "staging_llm",
  ELENA_LLM_PROVIDER: "openai",
  ELENA_LLM_MODEL: "test-model",
  ELENA_LLM_API_KEY: "test-key",
});

const intent = (overrides = {}) => ({
  domain: "compliance",
  topic: "HIPAA certification status",
  entities: ["OneSmarter", "HIPAA"],
  proposition: "OneSmarter holds official HIPAA certification",
  polarity: "positive",
  negationScope: [],
  questionType: "positive_yes_no",
  speechAct: "confirmation_request",
  requestedDetail: "OneSmarter's current HIPAA certification status",
  followUpReferences: [],
  confidence: 0.96,
  clarificationNeeded: false,
  mentionedNames: [],
  ...overrides,
});

const run = async (message, semanticIntent, conversationHistory = []) => {
  let intentCalls = 0;
  let answerCalls = 0;
  const result = await runElenaResponseAdapter({
    message,
    conversationHistory,
    config,
    intentProvider: async (request) => {
      intentCalls += 1;
      assert.equal(request.input.currentVisitorMessage, message);
      assert.equal(request.input.agentContext.agentIdentity, "Elena Cross");
      return { intent: semanticIntent };
    },
    providerAdapter: async () => {
      answerCalls += 1;
      return { error: "provider_unavailable" };
    },
  });
  return { result, intentCalls, answerCalls };
};

const positive = await run("Are you HIPAA certified?", intent());
const negative = await run("Are you not HIPAA certified?", intent({
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "hold official HIPAA certification" }],
  questionType: "negative_confirmation",
  proposition: "OneSmarter does not hold official HIPAA certification",
}));
assert.match(positive.result.answer, /^No\./);
assert.match(negative.result.answer, /^That is correct:/);
assert.notEqual(positive.result.answer, negative.result.answer);

const why = await run("Why aren't you HIPAA certified?", intent({
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "hold official HIPAA certification" }],
  questionType: "why",
  speechAct: "explanation_request",
  proposition: "OneSmarter does not hold official HIPAA certification",
  requestedDetail: "reason for the current HIPAA certification posture",
}));
assert.match(why.result.answer, /does not provide the reason/i);
assert.doesNotMatch(why.result.answer, /because/i);

const generated = async (message, semanticIntent, answer) => {
  let promptPayload;
  const result = await runElenaResponseAdapter({
    message,
    config,
    intentProvider: async () => ({ intent: semanticIntent }),
    providerAdapter: async (request) => {
      promptPayload = request.promptPayload;
      return { modelOutput: {
        answer,
        handoffNeeded: false,
        handoffReason: null,
        suggestedFollowUps: [],
        groundingStatus: "grounded",
        outputSafetyStatus: "passed",
      } };
    },
  });
  assert.match(promptPayload.user, new RegExp(semanticIntent.questionType));
  assert.match(promptPayload.user, new RegExp(semanticIntent.polarity));
  assert.match(promptPayload.user, new RegExp(semanticIntent.requestedDetail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(result.mode, "staging_llm", result.fallbackReason);
  assert.equal(result.fallbackUsed, false);
  return result;
};

const generatedPositive = await generated(
  "Are you HIPAA certified?",
  intent(),
  "No. OneSmarter does not present itself as HIPAA certified. The approved status is HIPAA Security Rule Compliance Assessment Completed.",
);
const generatedNegative = await generated(
  "You're not HIPAA certified, right?",
  intent({
    polarity: "negative",
    negationScope: [{ marker: "not", scope: "HIPAA certified" }],
    questionType: "negative_confirmation",
    proposition: "OneSmarter does not hold official HIPAA certification",
  }),
  "Correct—OneSmarter does not present itself as HIPAA certified. The approved status is HIPAA Security Rule Compliance Assessment Completed.",
);
const generatedStatus = await generated(
  "What is your actual HIPAA status?",
  intent({
    topic: "HIPAA posture",
    proposition: "OneSmarter has a current HIPAA posture",
    polarity: "unknown",
    questionType: "status",
    speechAct: "question",
    requestedDetail: "OneSmarter's actual HIPAA posture",
  }),
  "OneSmarter's approved HIPAA status is HIPAA Security Rule Compliance Assessment Completed. It is not presented as HIPAA certification.",
);
assert.notEqual(generatedPositive.answer, generatedNegative.answer);
assert.notEqual(generatedPositive.answer, generatedStatus.answer);

const arbitrationIntent = (overrides = {}) => intent({
  topic: "customer compliance outcome",
  entities: ["OneSmarter", "organization seeking review"],
  proposition: "OneSmarter can certify a customer organization",
  questionType: "scope_check",
  speechAct: "scope_request",
  requestedDetail: "whether OneSmarter can certify a customer organization",
  ...overrides,
});

const certificationCandidate = buildElenaSemanticClaimCandidate(arbitrationIntent());
const certificationDecision = evaluateElenaClaim(certificationCandidate);
assert.equal(certificationDecision.matchedRuleId, "unsupported_customer_certification");
assert.deepEqual(certificationDecision.knowledgeIds, ["compliance-cyber-assurance-overview"]);

for (const [topic, rule, ids] of [
  ["customer-certification", "unsupported_customer_certification", ["compliance-cyber-assurance-overview"]],
  ["audit-readiness", "general_audit_readiness_support", ["compliance-cyber-assurance-overview"]],
  ["hipaa-audit-readiness-support", "hipaa_readiness_support", ["hipaa-audit-readiness-support"]],
  ["soc-readiness-support", "soc_readiness_support", ["soc-readiness-support"]],
  ["iso-27001-readiness-support", "iso_readiness_support", ["iso-27001-readiness-support"]],
  ["pci-dss-readiness-support", "pci_readiness_support", ["pci-dss-readiness-support"]],
  ["customer-outcome-guarantee", "unsupported_outcome_guarantee", ["compliance-cyber-assurance-overview"]],
]) {
  const policy = resolveElenaSemanticClaimPolicy(arbitrationIntent({ topic }));
  assert.equal(policy.claimEvaluation.matchedRuleId, rule, topic);
  assert.ok(ids.every((id) => [
    ...policy.claimEvaluation.knowledgeIds,
    ...policy.canonicalKnowledgeIds,
  ].includes(id)), topic);
}

const runArbitration = async ({ message, semanticIntent, answer, expectedRule, expectedIds }) => {
  let providerCalled = false;
  const result = await runElenaResponseAdapter({
    message,
    config,
    intentProvider: async () => ({ intent: semanticIntent }),
    providerAdapter: async ({ retrievalResult, promptPayload }) => {
      providerCalled = true;
      assert.deepEqual(retrievalResult.matchedEntries.map(({ id }) => id), expectedIds);
      assert.match(promptPayload.user, new RegExp(expectedRule));
      return { modelOutput: {
        answer,
        handoffNeeded: false,
        handoffReason: null,
        suggestedFollowUps: [],
        groundingStatus: "grounded",
        outputSafetyStatus: "passed",
      } };
    },
  });
  assert.equal(providerCalled, true);
  assert.equal(result.claimEvaluation.matchedRuleId, expectedRule);
  assert.deepEqual(result.matchedEntries.map(({ id }) => id), expectedIds);
  assert.equal(result.mode, "staging_llm", result.fallbackReason);
  assert.equal(result.fallbackUsed, false);
  return result;
};

await runArbitration({
  message: "Would your team be the authority that formally approves our business?",
  semanticIntent: arbitrationIntent(),
  answer: "No. OneSmarter does not certify customer organizations or systems. It can help customers prepare for independent review or certification processes.",
  expectedRule: "unsupported_customer_certification",
  expectedIds: ["compliance-cyber-assurance-overview"],
});

for (const [message, questionType, speechAct] of [
  ["Could this compliance statement be used publicly?", "positive_yes_no", "recommendation_request"],
  ["Explain why this certification wording is unsuitable.", "why", "explanation_request"],
  ["How should attestation language be described?", "how", "recommendation_request"],
  ["Could this readiness statement be presented to buyers?", "positive_yes_no", "recommendation_request"],
  ["Evaluate this promised compliance outcome.", "challenge", "question"],
  ["A buyer requested evidence we have not approved for release.", "how", "recommendation_request"],
  ["May this security statement appear in marketing?", "positive_yes_no", "recommendation_request"],
  ["Should this assurance badge appear in a sales document?", "positive_yes_no", "recommendation_request"],
  ["A supplier says its service makes customers compliant.", "challenge", "question"],
  ["Review an absolute claim covering every regulatory framework.", "challenge", "question"],
  ["Why is unsupported assurance language a problem?", "why", "explanation_request"],
  ["Is it incorrect to avoid unsupported certification wording?", "negative_confirmation", "confirmation_request"],
  ["Would this differently phrased assurance statement be acceptable?", "positive_yes_no", "recommendation_request"],
  ["Can you assess this compliance wording?", "clarification", "clarification_request"],
]) {
  const semanticIntent = intent({
    topic: ELENA_COMPLIANCE_LANGUAGE_REVIEW_TOPIC,
    entities: ["proposed compliance wording"],
    proposition: "The proposed compliance wording is acceptable",
    polarity: questionType === "negative_confirmation" ? "negative" : "positive",
    questionType,
    speechAct,
    requestedDetail: "whether the proposed compliance wording is supported",
    clarificationNeeded: false,
  });
  const resolved = await run(message, semanticIntent);
  assert.equal(resolved.intentCalls, 1, message);
  assert.equal(resolved.answerCalls, 1, message);
  assert.equal(resolved.result.semanticIntent.topic, ELENA_COMPLIANCE_LANGUAGE_REVIEW_TOPIC, message);
  assert.equal(resolved.result.claimEvaluation.matchedRuleId, "not_in_elena_approved_knowledge", message);
  assert.equal(resolved.result.clarificationNeeded, false, message);
  assert.doesNotMatch(resolved.result.answer, /^I can help with HIPAA, SOC 2/i, message);
  assert.doesNotMatch(resolved.result.answer, /(?:HIPAA|SOC 2|ISO|PCI DSS) certified/i, message);
}

const reportedGuarantee = await run("A provider says its service assures our compliance; is that established?", intent({
  topic: "customer-outcome-guarantee",
  entities: ["provider", "customer organization", "compliance outcome"],
  proposition: "A provider assures the customer organization's compliance outcome",
  polarity: "positive",
  questionType: "challenge",
  speechAct: "question",
  requestedDetail: "whether the reported compliance assurance is supportable",
  confidence: 0.4,
  clarificationNeeded: true,
}));
assert.equal(reportedGuarantee.result.claimEvaluation.matchedRuleId, "unsupported_outcome_guarantee");
assert.deepEqual(reportedGuarantee.result.matchedEntries.map(({ id }) => id), ["compliance-cyber-assurance-overview"]);
assert.equal(reportedGuarantee.result.clarificationNeeded, false);
assert.doesNotMatch(reportedGuarantee.result.answer, /^I can help with HIPAA, SOC 2/i);

for (const readinessCase of [
  {
    message: "Could your specialists get us ready for an external controls examination?",
    semanticIntent: arbitrationIntent({
      topic: "audit readiness",
      entities: ["OneSmarter", "customer organization", "external audit"],
      proposition: "OneSmarter helps a customer organization prepare for an audit",
      questionType: "positive_yes_no",
      speechAct: "question",
      requestedDetail: "availability of audit preparation support",
    }),
    answer: "OneSmarter can help clients prepare for an audit through evidence preparation, control documentation, framework mapping, and remediation support.",
    expectedRule: "general_audit_readiness_support",
    expectedIds: ["compliance-cyber-assurance-overview"],
  },
  {
    message: "Could you assist before our HIPAA safeguards review?",
    semanticIntent: arbitrationIntent({
      topic: "HIPAA audit readiness",
      entities: ["OneSmarter", "HIPAA review", "customer organization"],
      proposition: "OneSmarter supports HIPAA audit readiness",
      requestedDetail: "HIPAA review preparation support",
    }),
    answer: "HIPAA audit readiness support for safeguards mapping, documentation review, evidence preparation, and remediation planning.",
    expectedRule: "hipaa_readiness_support",
    expectedIds: ["hipaa-audit-readiness-support"],
  },
  {
    message: "Do you assist teams before a SOC controls examination?",
    semanticIntent: arbitrationIntent({
      topic: "SOC 2 readiness",
      entities: ["OneSmarter", "SOC 2 review", "customer organization"],
      proposition: "OneSmarter supports SOC 2 readiness",
      requestedDetail: "SOC 2 review preparation support",
    }),
    answer: "SOC readiness support for evidence preparation, control documentation, gap tracking, remediation support, and coordination with client-selected auditors.",
    expectedRule: "soc_readiness_support",
    expectedIds: ["soc-readiness-support"],
  },
  {
    message: "Could your team guide our preparation before an ISO assessment?",
    semanticIntent: arbitrationIntent({
      topic: "ISO/IEC 27001 readiness",
      entities: ["OneSmarter", "ISO/IEC 27001", "customer organization"],
      proposition: "OneSmarter supports ISO/IEC 27001 readiness",
      requestedDetail: "ISO/IEC 27001 assessment preparation support",
    }),
    answer: "ISO/IEC 27001 readiness support for ISMS documentation, control mapping, evidence preparation, and remediation coordination.",
    expectedRule: "iso_readiness_support",
    expectedIds: ["iso-27001-readiness-support"],
  },
  {
    message: "Can you assist with preparations for a payment-card controls review?",
    semanticIntent: arbitrationIntent({
      topic: "PCI DSS readiness",
      entities: ["OneSmarter", "PCI DSS", "customer organization"],
      proposition: "OneSmarter supports PCI DSS readiness",
      requestedDetail: "PCI DSS review preparation support",
    }),
    answer: "PCI DSS readiness support for scope coordination, control documentation, evidence preparation, findings review, and remediation support.",
    expectedRule: "pci_readiness_support",
    expectedIds: ["pci-dss-readiness-support"],
  },
]) {
  await runArbitration(readinessCase);
}

const whyReadiness = await run("Why would your team be unable to assist before our external review?", arbitrationIntent({
  topic: "audit readiness",
  entities: ["OneSmarter", "customer organization", "external review"],
  proposition: "OneSmarter cannot help a customer organization prepare for an audit",
  polarity: "negative",
  negationScope: [{ marker: "cannot", scope: "help prepare for an audit" }],
  questionType: "why",
  speechAct: "explanation_request",
  requestedDetail: "reason OneSmarter cannot provide audit preparation support",
}));
assert.match(whyReadiness.result.answer, /does not support the premise/i);
assert.match(whyReadiness.result.answer, /help prepare for an audit/i);
assert.equal(whyReadiness.result.claimEvaluation.matchedRuleId, "general_audit_readiness_support");

const negativeReadiness = await run("So your team cannot support our assessment preparation?", arbitrationIntent({
  topic: "audit readiness",
  entities: ["OneSmarter", "customer organization", "assessment"],
  proposition: "OneSmarter cannot help a customer organization prepare for an audit",
  polarity: "negative",
  negationScope: [{ marker: "cannot", scope: "help prepare for an audit" }],
  questionType: "negative_confirmation",
  requestedDetail: "confirmation about audit preparation support",
}));
assert.match(negativeReadiness.result.answer, /^No\./);
assert.match(negativeReadiness.result.answer, /help prepare for an audit/i);

for (const message of [
  "Are you HIPAA certified?",
  "Do you hold an official HIPAA certification?",
  "Have you received formal HIPAA certification?",
  "Does OneSmarter have a HIPAA certificate?",
]) {
  const resolved = await run(message, intent());
  assert.match(resolved.result.answer, /HIPAA Security Rule Compliance Assessment Completed/i);
  assert.equal(resolved.result.semanticIntent.topic, "HIPAA certification status");
}

const indirect = await run("Gaurav wants to know whether OneSmarter is HIPAA certified.", intent({
  mentionedNames: ["Gaurav"],
}));
assert.match(indirect.result.answer, /HIPAA Security Rule Compliance Assessment Completed/i);
assert.deepEqual(indirect.result.semanticIntent.mentionedNames, ["Gaurav"]);
assert.equal(indirect.result.semanticIntent.visitorDisplayName, null);

const scopeAnswers = [];
for (const [message, domain] of [
  ["Tell me about Gaurav.", "person_information"],
  ["Who is Theo?", "agent_information"],
  ["Tell me about the company logo.", "brand_information"],
  ["What should my company use for AI?", "customer_ai_strategy"],
  ["Can Ravi access our ticket queue?", "operations"],
  ["Analyze my website.", "website_analysis"],
  ["What's the weather?", "weather"],
  ["Tell me a joke.", "entertainment"],
  ["How tall is Mount Everest?", "general_knowledge"],
  ["Recommend a restaurant nearby.", "local_recommendations"],
]) {
  const resolved = await run(message, intent({
    domain,
    topic: message,
    proposition: message,
    requestedDetail: message,
  }));
  assert.equal(resolved.result.clarificationNeeded, true);
  assert.deepEqual(resolved.result.matchedEntries, []);
  assert.match(resolved.result.answer, /approved Elena compliance evidence/i);
  assert.match(resolved.result.answer, new RegExp(domain.replaceAll("_", "[ _-]"), "i"));
  scopeAnswers.push(resolved.result.answer);
  assert.equal(resolved.answerCalls, 1);
}
assert.equal(new Set(scopeAnswers).size, scopeAnswers.length);

const complianceActionOutsideScope = await run(
  "Can Elena change a production security control for our audit?",
  intent({
    topic: "outside-elena-scope",
    entities: ["Elena", "production security control", "audit"],
    proposition: "Elena can change a production security control for a customer audit",
    requestedDetail: "whether Elena can perform a production security-control change",
  }),
);
assert.equal(complianceActionOutsideScope.result.clarificationNeeded, true);
assert.deepEqual(complianceActionOutsideScope.result.matchedEntries, []);
assert.equal(complianceActionOutsideScope.result.claimEvaluation, null);
assert.match(complianceActionOutsideScope.result.answer, /approved Elena compliance evidence/i);

const generatedScope = await runElenaResponseAdapter({
  message: "Could you describe the visual symbol your company uses?",
  config,
  intentProvider: async () => ({ intent: intent({
    domain: "brand_information",
    topic: "OneSmarter visual identity",
    entities: ["OneSmarter"],
    proposition: "OneSmarter uses a particular visual symbol",
    questionType: "status",
    speechAct: "question",
    requestedDetail: "information about OneSmarter's visual identity",
  }) }),
  providerAdapter: async ({ retrievalResult, promptPayload }) => {
    assert.deepEqual(retrievalResult.matchedEntries, []);
    assert.match(promptPayload.user, /visual identity/i);
    return { modelOutput: {
      answer: "I don't have approved information about OneSmarter's visual identity in my compliance evidence. I can help with an approved compliance or readiness topic.",
      handoffNeeded: true,
      handoffReason: "outside Elena's approved professional evidence",
      suggestedFollowUps: ["Would you like to review a compliance or readiness topic?"],
      groundingStatus: "insufficient_context",
      outputSafetyStatus: "passed",
    } };
  },
});
assert.equal(generatedScope.mode, "staging_llm");
assert.equal(generatedScope.clarificationNeeded, true);
assert.match(generatedScope.answer, /visual identity/i);

const followUpHistory = [
  { role: "user", content: "Are you HIPAA certified?" },
  { role: "assistant", content: "OneSmarter is not presented as HIPAA certified." },
];
const socFollowUp = await run("What about SOC 2?", intent({
  topic: "SOC 2 certification status",
  entities: ["OneSmarter", "SOC 2"],
  proposition: "OneSmarter holds SOC 2 certification",
  requestedDetail: "OneSmarter's SOC 2 status",
  followUpReferences: ["SOC 2"],
  questionType: "follow_up",
}), followUpHistory);
assert.match(socFollowUp.result.answer, /SOC 2 Type II Attested/i);
assert.doesNotMatch(socFollowUp.result.answer, /HIPAA Security Rule/i);

const whyFollowUp = await run("Why?", intent({
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "hold official HIPAA certification" }],
  questionType: "why",
  speechAct: "explanation_request",
  proposition: "OneSmarter does not hold official HIPAA certification",
  requestedDetail: "reason for the prior HIPAA certification posture",
  followUpReferences: ["prior HIPAA certification posture"],
}), followUpHistory);
assert.match(whyFollowUp.result.answer, /does not provide the reason/i);

const socNegativeFollowUp = await run("Are you not?", intent({
  topic: "SOC 2 certification status",
  entities: ["OneSmarter", "SOC 2"],
  proposition: "OneSmarter is not SOC 2 certified",
  polarity: "negative",
  negationScope: [{ marker: "not", scope: "SOC 2 certified" }],
  questionType: "negative_confirmation",
  requestedDetail: "confirmation of the current SOC 2 posture",
  followUpReferences: ["SOC 2 certification"],
}), [
  ...followUpHistory,
  { role: "user", content: "What about SOC 2?" },
]);
assert.match(socNegativeFollowUp.result.answer, /^That is correct:.*SOC 2 Type II Attested/is);

const ambiguous = await run("Are you not?", intent({
  topic: "ambiguous certification reference",
  entities: [],
  proposition: "an unspecified certification does not apply",
  polarity: "negative",
  questionType: "follow_up",
  speechAct: "clarification_request",
  requestedDetail: "which certification the visitor means",
  followUpReferences: ["unspecified certification"],
  confidence: 0.3,
  clarificationNeeded: true,
}));
assert.equal(ambiguous.result.clarificationNeeded, true);
assert.equal(ambiguous.answerCalls, 1);
assert.match(ambiguous.result.answer, /compliance follow-up request/i);

const mislabeledRavi = await run("Can Ravi access our ticket queue?", intent({
  domain: "compliance",
  topic: "Ravi ticket queue access",
  entities: ["Ravi", "ticket queue"],
  proposition: "Ravi can access the visitor's ticket queue",
  questionType: "scope_check",
  speechAct: "scope_request",
  requestedDetail: "whether Ravi can access a live ticket queue",
  mentionedNames: ["Ravi"],
}));
assert.match(mislabeledRavi.result.answer, /compliance scope-check request/i);
assert.doesNotMatch(mislabeledRavi.result.answer, /HIPAA Security Rule/i);

const broadStrategyDomain = await run("What should my company use for AI?", intent({
  domain: "technology",
  topic: "customer-specific AI strategy",
  entities: ["visitor company"],
  proposition: "the visitor's company should use a particular AI approach",
  questionType: "recommendation_request",
  speechAct: "recommendation_request",
  requestedDetail: "which AI approach the visitor's company should use",
}));
assert.match(broadStrategyDomain.result.answer, /technology recommendation-request request/i);

for (const [message, semanticIntent, required] of [
  ["Does ISO certification cover claims processing?", intent({
    topic: "ISO certification scope",
    entities: ["OneSmarter", "ISO/IEC 27001", "claims processing"],
    proposition: "OneSmarter ISO certification covers claims processing",
    requestedDetail: "whether claims processing is within the certified scope",
  }), /Claims processing is not included.*AWS cloud services development/is],
  ["Is OneSmarter PCI DSS certified?", intent({
    topic: "PCI DSS certification status",
    entities: ["OneSmarter", "PCI DSS"],
    proposition: "OneSmarter is PCI DSS certified",
    requestedDetail: "OneSmarter's PCI DSS certification status",
  }), /readiness services only.*does not establish.*PCI DSS certified/is],
  ["Can OneSmarter certify my company?", intent({
    topic: "customer certification",
    entities: ["OneSmarter", "visitor company"],
    proposition: "OneSmarter can certify the visitor's company",
    requestedDetail: "whether OneSmarter can certify a customer organization",
  }), /does not certify customer organizations/i],
  ["Can you guarantee that we pass the audit?", intent({
    topic: "audit outcome guarantee",
    entities: ["OneSmarter", "visitor organization"],
    proposition: "OneSmarter guarantees the visitor will pass an audit",
    requestedDetail: "whether OneSmarter guarantees audit success",
  }), /does not guarantee compliance, certification, or audit success/i],
]) {
  const resolved = await run(message, semanticIntent);
  assert.match(resolved.result.answer, required);
}

const concise = await runElenaResponseAdapter({
  message: "Are you HIPAA certified?",
  verbosityBand: "concise",
  config,
  intentProvider: async () => ({ intent: intent() }),
  providerAdapter: async () => ({ error: "provider_unavailable" }),
});
assert.match(concise.answer, /not presented as HIPAA certified/i);
assert.match(concise.answer, /HIPAA Security Rule Compliance Assessment Completed/i);

let answerCalls = 0;
const failedIntent = await runElenaResponseAdapter({
  message: "Are you HIPAA certified?",
  config,
  intentProvider: async () => { throw new Error("offline"); },
  providerAdapter: async () => { answerCalls += 1; return {}; },
});
assert.equal(failedIntent.clarificationNeeded, false);
assert.match(failedIntent.answer, /does not present.*HIPAA certified/i);
assert.equal(failedIntent.fallbackReason, "provider_failure");
assert.equal(answerCalls, 0);

console.log("Elena semantic-intent integration tests passed.");
