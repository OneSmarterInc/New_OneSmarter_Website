import assert from "node:assert/strict";
import { handleTheoChatRequest, runTheoResponseAdapter } from "../src/server/theo/theoResponseAdapter.js";
import { validateTheoModelOutput } from "../src/server/theo/theoOutputValidator.js";
import { buildTheoPromptPayload } from "../src/server/theo/theoPromptContract.js";
import { buildTheoEvidenceReviewRequest } from "../src/server/theo/theoEvidenceReview.js";

// These are explicit semantic-provider fixtures, not a simulation of model understanding.
// Exercise the real handler/review/validator path with varied concepts and wordings.
const cases = [
  { name: "clearly present", question: "What information is missing?",
    content: "BrightPath Scheduling offers appointment scheduling software for independent dental clinics. Features include online booking and appointment reminders. Request a demo at demo@brightpath.example. Plans cost $40 per month.",
    quote: "Plans cost $40 per month.", status: "present", missing: "The supplied excerpt does not state an implementation timeline." },
  { name: "genuinely absent", question: "What would a buyer still need to know?",
    content: "BrightPath Scheduling offers appointment scheduling software for independent dental clinics. Online booking and appointment reminders are included. Request a demo at demo@brightpath.example.",
    quote: null, status: "absent", missing: "Pricing is not supplied in this excerpt." },
  { name: "paraphrased", question: "Which decisions cannot I make from this description?",
    content: "For neighborhood opticians juggling bookings, ClearDesk keeps visit calendars organized. A monthly subscription costs forty dollars. Email hello@cleardesk.example to arrange a walkthrough.",
    quote: "A monthly subscription costs forty dollars.", status: "present", missing: "The supplied excerpt does not state an implementation timeline." },
  { name: "partial", question: "Separate what this tells me from the details I still need.",
    content: "Northline helps independent bookshops track stock. Subscription plans start at $25 per month. Contact sales@northline.example for a demonstration.",
    quote: "Subscription plans start at $25 per month.", status: "partial", missing: "The supplied excerpt does not state the price of additional subscription tiers." },
];
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true };
const intent = { domain: "supplied_content_analysis", topic: "supplied-content-missing-information",
  entities: ["supplied excerpt"], proposition: "Identify decision-relevant omissions in supplied content",
  polarity: "positive", negationScope: [], questionType: "status", speechAct: "question",
  requestedDetail: "present and absent information", followUpReferences: [], confidence: 0.98,
  clarificationNeeded: false, mentionedNames: [] };
let runs = 0;
for (let repeat = 0; repeat < 5; repeat++) {
  for (const item of cases) {
    const candidate = { overallAssessment: "The supplied excerpt leaves some evaluation details unstated.",
      strengths: [], findings: [
        { area: "Commercial information", issue: "Pricing is not supplied in this excerpt.", evidence: "Not supplied", priority: "medium" },
        { area: "Decision detail", issue: item.missing, evidence: "Not supplied", priority: "medium" },
      ], recommendations: [
        { action: "Add the missing pricing or implementation details to the supplied excerpt.", reason: "Help readers assess fit.", priority: "medium" },
        { action: "Provide a URL so Theo can browse the live site.", reason: "Verify the business independently.", priority: "high" },
      ], clarificationNeeded: false, clarificationQuestion: null };
    const review = { overallSupported: true, strengthsSupported: [], recommendationsSupported: [true, false],
      findings: [
        { kind: "absence", conceptStatus: item.status, supported: item.status === "absent", quotes: item.quote ? [item.quote] : [] },
        { kind: "absence", conceptStatus: "absent", supported: true, quotes: [] },
      ] };
    const result = await handleTheoChatRequest({ method: "POST",
      body: { message: item.question, websiteContent: item.content },
      rateLimitStore: { consume: async () => ({ allowed: true }) },
      responseAdapter: (input) => runTheoResponseAdapter({ ...input, config,
        intentProvider: async () => ({ intent }),
        providerAdapter: async ({ promptPayload }) => {
          assert.ok(promptPayload.context.includes(item.content));
          assert.ok(promptPayload.user.includes(item.question));
          return { modelOutput: { answer: JSON.stringify(candidate) } };
        },
        evidenceReviewer: async ({ websiteContent, analysis, message, semanticIntent }) => {
          assert.equal(websiteContent, item.content);
          assert.deepEqual(analysis, candidate);
          assert.equal(message, item.question);
          assert.equal(semanticIntent.proposition, intent.proposition);
          return review;
        },
      }),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.fallbackUsed, false, `${item.name}: ${result.body.fallbackReason}`);
    assert.ok(result.body.analysis.findings.some(({ issue }) => issue === item.missing));
    assert.equal(result.body.analysis.findings.length, item.status === "absent" ? 2 : 1);
    if (item.quote) assert.ok(result.body.analysis.strengths.includes(item.quote));
    assert.equal(result.body.analysis.recommendations.length, 1);
    assert.equal(result.body.answer.includes("browse the live site"), false);
    assert.equal(validateTheoModelOutput(candidate, { websiteContent: item.content, requireEvidenceReview: true }).valid, false);
    runs++;
  }
}

const unsupported = { overallAssessment: "The company has 500 customers and is HIPAA certified.",
  strengths: ["SOC 2 certification is established."], findings: [],
  recommendations: [{ action: "Advertise guaranteed certification.", reason: "HIPAA certified.", priority: "high" }],
  clarificationNeeded: false, clarificationQuestion: null };
const rejected = validateTheoModelOutput(unsupported, { websiteContent: cases[1].content,
  requireEvidenceReview: true, evidenceReview: { overallSupported: false, strengthsSupported: [false], recommendationsSupported: [false], findings: [] } });
assert.equal(rejected.valid, true);
assert.equal(JSON.stringify(rejected.correctedOutput).includes("certified"), false);
assert.equal(rejected.correctedOutput.strengths.length, 0);
assert.equal(rejected.correctedOutput.recommendations.length, 0);
assert.equal(validateTheoModelOutput(unsupported, { websiteContent: cases[1].content }).valid, false);

const prompt = buildTheoPromptPayload({ message: "Review", websiteContent: cases[1].content });
assert.ok(prompt.system.includes("specific omissions"));
assert.ok(prompt.system.includes("Never suggest providing a URL"));
const reviewPrompt = buildTheoEvidenceReviewRequest({ websiteContent: cases[1].content, analysis: unsupported });
assert.ok(reviewPrompt.system.includes("every factual assertion"));
assert.ok(reviewPrompt.system.includes("only the supplied excerpt"));
assert.ok(reviewPrompt.system.includes("Reject generic review advice"));
console.log(`Theo specific omission tests passed: ${runs} repeated handler cases; present, absent, paraphrased, partial, unsupported-claim and browsing-boundary cases.`);
