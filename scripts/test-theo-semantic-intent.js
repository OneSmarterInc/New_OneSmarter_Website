import assert from "node:assert/strict";
import {
  THEO_APPROVED_ROLE_FACTS,
  THEO_SEMANTIC_TOPICS,
  runTheoResponseAdapter,
} from "../src/server/theo/theoResponseAdapter.js";

const config = {
  mode: "staging_llm", provider: "openai", providerConfigComplete: true,
  model: "test", apiKey: "test", timeoutMs: 100, maxTokens: 800, temperature: 0.2,
};
const content = `# Workflow Service
ExampleCo provides a workflow service for operations teams.
The service organizes intake and review work.
Contact the team to request a demonstration.`;
const intent = (overrides = {}) => ({
  domain: "supplied_content_analysis",
  topic: "supplied-content-clarity",
  entities: ["supplied page"],
  proposition: "The supplied page clearly explains the service",
  polarity: "positive",
  negationScope: [],
  questionType: "positive_yes_no",
  speechAct: "question",
  requestedDetail: "whether the service is clearly explained",
  followUpReferences: [],
  confidence: 0.97,
  clarificationNeeded: false,
  mentionedNames: [],
  ...overrides,
});
const generatedAnalysis = (overallAssessment) => ({
  overallAssessment,
  strengths: ["The supplied page identifies a workflow service."],
  findings: [{ area: "Buyer clarity", issue: "The scope is brief.", evidence: "The service organizes intake and review work.", priority: "medium" }],
  recommendations: [{ priority: "medium", action: "Add supported scope details.", reason: "Buyers need enough information to evaluate fit." }],
  clarificationNeeded: false,
  clarificationQuestion: null,
});

const run = async ({ message, semanticIntent, websiteContent = content, history = [] }) => {
  let intentRequest;
  let answerRequest;
  const result = await runTheoResponseAdapter({
    message,
    websiteContent,
    conversationHistory: history,
    config,
    intentProvider: async (request) => {
      intentRequest = request;
      return { intent: semanticIntent };
    },
    providerAdapter: async (request) => {
      answerRequest = request;
      const isRoleRequest = semanticIntent.domain === "agent_role_information";
      const output = isRoleRequest ? {
        overallAssessment: semanticIntent.topic === "theo-professional-role"
          ? THEO_APPROVED_ROLE_FACTS.find((fact) => fact.startsWith("Theo Mercer"))
          : THEO_APPROVED_ROLE_FACTS.join(" "),
        strengths: [], findings: [], recommendations: [],
        clarificationNeeded: false, clarificationQuestion: null,
      } : generatedAnalysis(
        semanticIntent.questionType === "why"
          ? "The supplied page is partly clear because it names the service and audience, but it gives little scope detail."
          : semanticIntent.polarity === "negative"
            ? "The negative premise is only partly supported: the supplied page names the service, but its scope remains brief."
            : "The supplied page identifies the service, while leaving some scope detail unclear.",
      );
      return { modelOutput: { answer: JSON.stringify(output) } };
    },
  });
  return { result, intentRequest, answerRequest };
};

assert.ok(THEO_SEMANTIC_TOPICS.includes("supplied-content-ai-readability"));
assert.ok(THEO_SEMANTIC_TOPICS.includes("outside-theo-scope"));
assert.equal(THEO_APPROVED_ROLE_FACTS.length, 5);

const positive = await run({ message: "Does this explain the offering clearly?", semanticIntent: intent() });
const negative = await run({
  message: "Isn't the offering already clear?",
  semanticIntent: intent({
    polarity: "negative", questionType: "negative_confirmation",
    proposition: "The supplied page is not unclear about the service",
    negationScope: [{ marker: "not", scope: "unclear about the service" }],
  }),
});
const why = await run({
  message: "Why might a buyer struggle to understand this?",
  semanticIntent: intent({
    topic: "supplied-content-buyer-understanding", questionType: "why",
    speechAct: "explanation_request", proposition: "A buyer may struggle to understand the supplied page",
    requestedDetail: "why the supplied page may be unclear to a buyer",
  }),
});
assert.notEqual(positive.result.analysis.overallAssessment, negative.result.analysis.overallAssessment);
assert.deepEqual(positive.intentRequest.input.suppliedContentContext, {
  available: true,
  evidenceType: "visitor_supplied_public_page",
  objectOfAnalysis: true,
});
assert.equal(positive.result.analysis.clarificationNeeded, false);
assert.equal(negative.result.analysis.clarificationNeeded, false);
assert.equal(why.result.analysis.clarificationNeeded, false);
assert.notEqual(negative.result.analysis.overallAssessment, why.result.analysis.overallAssessment);
assert.match(why.answerRequest.promptPayload.user, /"questionType":"why"/);
assert.match(negative.answerRequest.promptPayload.user, /"polarity":"negative"/);
assert.doesNotMatch(positive.answerRequest.promptPayload.context, /Mira Vale is|Elena Cross is/);

for (const topic of [
  "supplied-content-buyer-understanding", "supplied-content-clarity", "supplied-content-evidence",
  "supplied-content-missing-information", "supplied-content-next-step", "supplied-content-metadata",
  "supplied-content-ai-readability", "supplied-content-comparison",
]) {
  const result = await run({
    message: `Review the supplied material from this perspective: ${topic}.`,
    semanticIntent: intent({ topic, questionType: topic.endsWith("comparison") ? "comparison" : "how" }),
  });
  assert.equal(result.result.mode, "staging_llm", topic);
  assert.equal(result.result.analysis.evidenceStatus, "supplied_content_only", topic);
}

const self = await run({
  message: "What is Theo's professional role?",
  websiteContent: "",
  semanticIntent: intent({
    domain: "agent_role_information", topic: "theo-professional-role",
    entities: ["Theo Mercer"], proposition: "Theo Mercer has a professional role",
    questionType: "status", requestedDetail: "Theo Mercer's professional role",
  }),
});
assert.equal(self.result.analysis.evidenceStatus, "approved_professional_role");
assert.equal(self.result.mode, "staging_llm");
assert.match(self.answerRequest.promptPayload.context, /Theo Mercer analyzes supplied website or page content/i);

const directory = await run({
  message: "Which professional agent handles compliance?",
  websiteContent: "",
  semanticIntent: intent({
    domain: "agent_role_information", topic: "professional-agent-role-directory",
    entities: ["professional agents", "compliance"], proposition: "A professional agent handles compliance questions",
    questionType: "status", requestedDetail: "the professional agent for compliance",
  }),
});
assert.match(directory.answerRequest.promptPayload.context, /Elena Cross reviews compliance/i);
assert.equal(directory.result.mode, "staging_llm");

const noContent = await run({
  message: "Assess whether the page explains its audience.",
  websiteContent: "",
  semanticIntent: intent({ topic: "supplied-content-buyer-understanding" }),
});
assert.equal(noContent.result.analysis.clarificationNeeded, true);
assert.equal(noContent.answerRequest, undefined);
assert.match(noContent.result.analysis.clarificationQuestion, /paste/i);

const outside = await run({
  message: "What is the weather?",
  websiteContent: "",
  semanticIntent: intent({
    domain: "weather", topic: "outside-theo-scope", entities: ["weather"],
    proposition: "The visitor wants a weather forecast", requestedDetail: "weather forecast",
  }),
});
assert.equal(outside.result.analysis.clarificationNeeded, true);
assert.equal(outside.answerRequest, undefined);
assert.match(outside.result.analysis.overallAssessment, /outside Theo's/i);

console.log("Theo semantic-intent tests passed.");
