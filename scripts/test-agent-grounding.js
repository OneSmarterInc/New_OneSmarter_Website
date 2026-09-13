import assert from "node:assert/strict";
import { verifyAgentAnswerGrounding } from "../src/server/agentGrounding/agentGroundingVerifier.js";
import { onesmarterPublicKnowledgeBase } from "../src/data/agentKnowledge/onesmarterPublicKb.js";
import { elenaApprovedKnowledge } from "../src/data/agentKnowledge/elenaApprovedKnowledge.js";
import { raviApprovedKnowledge } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { seleneApprovedKnowledge } from "../src/data/agentKnowledge/seleneApprovedKnowledge.js";
import { validateMiraFinalResponse } from "../src/server/mira/miraFinalResponseValidator.js";
import { validateElenaModelOutput } from "../src/server/elena/elenaOutputValidator.js";
import { validateRaviModelOutput } from "../src/server/ravi/raviOutputValidator.js";
import { validateSeleneModelOutput } from "../src/server/selene/seleneOutputValidator.js";

const knowledge = {
  Mira: onesmarterPublicKnowledgeBase,
  Elena: elenaApprovedKnowledge,
  Ravi: raviApprovedKnowledge,
  Selene: seleneApprovedKnowledge,
};

const supported = (agent, index, question) => ({
  agent, question, answer: knowledge[agent][index].approvedSummary,
  approvedEntries: [knowledge[agent][index]], expectedGrounded: true,
});
const boundary = (agent, question, answer) => ({ agent, question, answer, expectedGrounded: true });
const fabricated = (agent, question, answer, index = 0) => ({
  agent, question, answer, approvedEntries: [knowledge[agent][index]], expectedGrounded: false,
});

const cases = [
  supported("Mira", 0, "Give me a plain-language overview."),
  supported("Mira", 1, "Describe another approved capability in your own words."),
  supported("Mira", 2, "What else is publicly documented?"),
  boundary("Mira", "Does OneSmarter integrate with Salesforce?", "I cannot confirm Salesforce integration from the approved public information."),
  boundary("Mira", "Which customers use it?", "I do not have approved customer identities to share."),
  fabricated("Mira", "Does it integrate with Salesforce?", "OneSmarter integrates with Salesforce."),
  fabricated("Mira", "Does it run on Azure?", "Every OneSmarter platform runs on Microsoft Azure."),
  fabricated("Mira", "What does it cost?", "The platform costs $499 per month."),
  fabricated("Mira", "Who uses it?", "Acme Hospital uses the claims platform."),
  fabricated("Mira", "What results does it deliver?", "Customers reduce claim costs by 45 percent."),
  fabricated("Mira", "Is there a mobile application?", "OneSmarter provides a native iPhone application."),
  fabricated("Mira", "Is support guaranteed?", "OneSmarter guarantees 99.99 percent uptime."),
  fabricated("Mira", "Where is data hosted?", "All customer data is hosted exclusively in Virginia."),

  supported("Elena", 0, "Describe the approved compliance posture."),
  supported("Elena", 1, "What other verified posture is documented?"),
  supported("Elena", 2, "Explain the published certification detail."),
  boundary("Elena", "Can you guarantee HIPAA compliance?", "OneSmarter does not guarantee customer HIPAA compliance."),
  boundary("Elena", "Which hospitals passed audits?", "I cannot confirm hospital customer identities or audit outcomes."),
  fabricated("Elena", "Which ISO certification covers claims?", "ISO 27001 certification covers claims processing.", 3),
  fabricated("Elena", "Can you guarantee compliance?", "OneSmarter guarantees HIPAA compliance for every customer.", 2),
  fabricated("Elena", "Which hospitals passed?", "Mercy Hospital passed its audit using OneSmarter."),
  fabricated("Elena", "Are you PCI certified?", "OneSmarter is PCI DSS certified.", 8),
  fabricated("Elena", "Who issued a new certificate?", "Bureau Veritas issued OneSmarter certificate 777777.", 3),
  fabricated("Elena", "Does SOC cover every platform?", "SOC 2 certification covers every OneSmarter platform.", 1),
  fabricated("Elena", "Can you certify us?", "OneSmarter can issue an ISO certificate to your company."),
  fabricated("Elena", "When is the next audit?", "The next compliance audit is scheduled for March 2027."),
  {
    agent: "Elena",
    question: "How can you assist before our safeguards review?",
    answer: "OneSmarter supports HIPAA audit readiness through safeguards mapping, documentation review, evidence preparation, and remediation planning.",
    approvedEntries: [elenaApprovedKnowledge.find(({ id }) => id === "hipaa-audit-readiness-support")],
    expectedGrounded: true,
  },
  {
    agent: "Elena",
    question: "What preparation support is available before an ISO assessment?",
    answer: "Before an ISO/IEC 27001 assessment, OneSmarter supports readiness through ISMS documentation, control mapping, evidence preparation, and remediation coordination.",
    approvedEntries: [elenaApprovedKnowledge.find(({ id }) => id === "iso-27001-readiness-support")],
    expectedGrounded: true,
  },
  {
    agent: "Elena",
    question: "You cannot help us prepare for an audit, can you?",
    answer: "Actually, OneSmarter can help prepare for an audit through compliance readiness support, including organizing evidence, documenting controls, mapping frameworks, coordinating VAPT work, and supporting remediation.",
    approvedEntries: [elenaApprovedKnowledge.find(({ id }) => id === "compliance-cyber-assurance-overview")],
    expectedGrounded: true,
  },
  {
    agent: "Elena",
    question: "How can your team help before a formal compliance review?",
    answer: "OneSmarter can help prepare for a formal compliance review through readiness support, including organizing evidence, documenting controls, mapping relevant frameworks, coordinating VAPT activities, and supporting remediation. This helps structure the preparation process without guaranteeing a particular compliance or audit outcome.",
    approvedEntries: [elenaApprovedKnowledge.find(({ id }) => id === "compliance-cyber-assurance-overview")],
    expectedGrounded: true,
  },

  supported("Ravi", 0, "Explain the approved ticketing capability."),
  supported("Ravi", 1, "Describe the approved claims workflow support."),
  supported("Ravi", 2, "What workflow modernization is documented?"),
  boundary("Ravi", "Can Ravi access our queue?", "Ravi cannot access or modify a live customer ticket queue."),
  boundary("Ravi", "Can you promise four hours?", "Ravi does not guarantee a resolution time or SLA outcome."),
  fabricated("Ravi", "Can Ravi connect to ServiceNow?", "Ravi connects directly to ServiceNow."),
  fabricated("Ravi", "Can Ravi close this ticket?", "Ravi closed ticket INC-77881 in the production queue."),
  fabricated("Ravi", "Can Ravi guarantee four hours?", "Ravi guarantees resolution within four hours."),
  fabricated("Ravi", "Does Ravi integrate with Zendesk?", "Ravi provides a native Zendesk integration."),
  fabricated("Ravi", "What customer result is proven?", "Acme Insurance reduced handling time by 60 percent."),
  fabricated("Ravi", "What is implementation pricing?", "Implementation costs $2500."),
  fabricated("Ravi", "Can Ravi update production?", "Ravi updated the production workflow successfully."),
  fabricated("Ravi", "Does Ravi support SAP?", "Ravi synchronizes every case with SAP."),

  supported("Selene", 0, "Explain the focused-agent architecture."),
  supported("Selene", 1, "How are professional multiline roles separated?"),
  supported("Selene", 2, "Explain the approved knowledge boundary."),
  boundary("Selene", "Can you design our AI strategy?", "Selene cannot design or recommend a customer-specific AI strategy."),
  boundary("Selene", "When will autonomous orchestration launch?", "There is no approved launch date for autonomous agent orchestration."),
  fabricated("Selene", "Which agents should we deploy?", "Your company should deploy seven autonomous agents."),
  fabricated("Selene", "Can Selene design our architecture?", "Selene designed Acme Corporation's AI architecture."),
  fabricated("Selene", "Who succeeded with this strategy?", "Contoso successfully deployed OneSmarter's agent strategy."),
  fabricated("Selene", "When will autonomy launch?", "Autonomous orchestration launches in January 2027."),
  fabricated("Selene", "Can agents act independently?", "The agents autonomously delegate production work."),
  fabricated("Selene", "Which model powers every agent?", "Every agent runs exclusively on GPT-9."),
  fabricated("Selene", "What outcome is guaranteed?", "The architecture guarantees a 300 percent return on investment."),
  fabricated("Selene", "Can agents share customer data?", "All agents share customer records HockeyCorp-wide."),
];

for (const testCase of cases) {
  const result = verifyAgentAnswerGrounding({
    answer: testCase.answer,
    approvedEntries: testCase.approvedEntries || knowledge[testCase.agent].slice(0, 1),
  });
  assert.equal(result.grounded, testCase.expectedGrounded, `${testCase.agent}: ${testCase.question}`);
}

const envelope = (answer) => ({
  answer, handoffNeeded: false, handoffReason: null, suggestedFollowUps: [],
  groundingStatus: "grounded", outputSafetyStatus: "passed",
});
const fabricatedByAgent = {
  Mira: "OneSmarter integrates with Salesforce.",
  Elena: "OneSmarter uses Salesforce for compliance reviews.",
  Ravi: "Ravi provides Kubernetes workflow dashboards.",
  Selene: "Every agent runs exclusively on GPT-9.",
};
const validatorResults = {
  Mira: validateMiraFinalResponse({
    answerSeed: fabricatedByAgent.Mira,
    validationFallbackAnswer: knowledge.Mira[0].approvedSummary,
    matchedEntries: [knowledge.Mira[0]],
    groundingStatus: "grounded",
    responseMode: { mode: "detailed_explanation" },
  }),
  Elena: validateElenaModelOutput(envelope(fabricatedByAgent.Elena), { matchedEntries: knowledge.Elena, fallbackResult: {} }),
  Ravi: validateRaviModelOutput(envelope(fabricatedByAgent.Ravi), { matchedEntries: knowledge.Ravi, fallbackResult: {} }),
  Selene: validateSeleneModelOutput(envelope(fabricatedByAgent.Selene), { matchedEntries: knowledge.Selene, fallbackResult: {} }),
};
for (const [agent, result] of Object.entries(validatorResults)) {
  const valid = agent === "Mira" ? result.finalResponseValidation.valid : result.valid;
  const violations = agent === "Mira" ? result.finalResponseValidation.issues : result.violations;
  assert.equal(valid, false, `${agent} must reject unsupported output even when the model labels it grounded`);
  assert.ok(violations.some((violation) => violation.startsWith("unsupported_")));
}

console.log(`Agent grounding tests passed (${cases.length} corpus cases plus 4 validator bypass cases).`);
