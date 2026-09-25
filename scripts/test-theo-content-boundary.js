import assert from "node:assert/strict";
import { runTheoResponseAdapter } from "../src/server/theo/theoResponseAdapter.js";
import { supportedTheoFixtureReview } from "./fixtures/theo-evidence-review.js";

const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true };
const intent = (topic, clarificationNeeded = true) => ({
  domain: "supplied_content_analysis", topic, entities: ["requested page"],
  proposition: "Analyze the requested page", polarity: "positive", negationScope: [],
  questionType: "status", speechAct: "question", requestedDetail: "page analysis",
  followUpReferences: [], confidence: 0.98, clarificationNeeded, mentionedNames: [],
});
// Explicit semantic-provider fixtures test routing, not real-model comprehension.
const references = [
  ["Please check this website", "https://example.com"],
  ["What could this page explain better?", "https://example.com/about"],
  ["Could you review the business described at this address?", "https://example.com/services"],
  ["Visit https://example.com and tell me what is missing", ""],
  ["Analyze the page I linked above", "See the public company homepage."],
  ["Review the document in our public portal", "The document is available in the portal, not pasted here."],
];
for (const [message, websiteContent] of references) {
  const result = await runTheoResponseAdapter({ message, websiteContent, config,
    intentProvider: async (request) => {
      assert.equal(request.input.suppliedContentContext.suppliedText, websiteContent);
      assert.ok(request.outputSchema.properties.topic.enum.includes("supplied-content-required"));
      assert.ok(request.system.includes("even if the excerpt is brief or includes links"));
      return { intent: intent("supplied-content-required") };
    },
    providerAdapter: async () => { throw new Error("Unavailable content must not reach generation"); },
  });
  assert.equal(result.analysis.clarificationNeeded, true);
  assert.ok(result.analysis.overallAssessment.includes("cannot browse"));
  assert.ok(result.analysis.clarificationQuestion.includes("Please paste"));
  assert.equal(result.analysis.findings.length, 0);
}
// No content takes precedence over an ambiguous analysis focus.
const empty = await runTheoResponseAdapter({ message: "Please review it", websiteContent: "", config,
  intentProvider: async () => ({ intent: intent("supplied-content-clarity") }) });
assert.ok(empty.analysis.clarificationQuestion.includes("Please paste"));

// A short real excerpt containing a link must still reach generation and evidence review.
const websiteContent = "BrightPath helps dental clinics schedule appointments. Contact demo@brightpath.example. Details: https://example.com.";
const analysis = { overallAssessment: "The supplied content identifies a service and contact details.",
  strengths: [], findings: [{ area: "Contact", issue: "A contact address is supplied.", evidence: "Contact demo@brightpath.example.", priority: "low" }],
  recommendations: [], clarificationNeeded: false, clarificationQuestion: null };
let generations = 0;
let reviews = 0;
const supplied = await runTheoResponseAdapter({ message: "What information is present?", websiteContent, config,
  intentProvider: async () => ({ intent: intent("supplied-content-evidence", false) }),
  providerAdapter: async () => { generations++; return { modelOutput: { answer: JSON.stringify(analysis) } }; },
  evidenceReviewer: async (input) => { reviews++; return supportedTheoFixtureReview(input); },
});
assert.equal(generations, 1);
assert.equal(reviews, 1);
assert.equal(supplied.fallbackUsed, false);
assert.equal(supplied.analysis.findings[0].evidence, "Contact demo@brightpath.example.");
const ambiguous = await runTheoResponseAdapter({ message: "What about that?", websiteContent, config,
  intentProvider: async () => ({ intent: intent("supplied-content-clarity") }) });
assert.ok(ambiguous.analysis.clarificationQuestion.includes("Which claim"));
console.log("Theo content-boundary tests passed: six external-reference phrasings, empty input precedence, real excerpt with link, mandatory evidence review and ambiguous focus.");
