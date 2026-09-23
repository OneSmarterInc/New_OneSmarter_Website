import assert from "node:assert/strict";
import { validateTheoModelOutput } from "../src/server/theo/theoOutputValidator.js";
import { buildTheoEvidenceReviewRequest, reviewTheoEvidence } from "../src/server/theo/theoEvidenceReview.js";
import { runTheoLocalAnalysis } from "../src/server/theo/theoLocalEngine.js";
import { runTheoResponseAdapter, handleTheoChatRequest } from "../src/server/theo/theoResponseAdapter.js";

const cases = [
  {
    name: "present content falsely marked missing",
    content: "BrightPath Scheduling offers appointment scheduling software for independent dental clinics. Features include online booking, automated appointment reminders, and calendar management. A demo-request email was supplied.",
    evidence: "BrightPath Scheduling offers appointment scheduling software for independent dental clinics.",
    conceptStatus: "present", issue: "The offering and intended audience are not identified.",
  },
  {
    name: "partial content does not justify blanket absence",
    content: "Northline helps independent bookshops track stock. Buyers can contact the team for a demonstration. Implementation scope and integrations require a separate review.",
    evidence: "Northline helps independent bookshops track stock.",
    conceptStatus: "partial", issue: "No information about intended users or their needs is supplied.",
  },
  {
    name: "paraphrased content",
    content: "For neighborhood opticians juggling bookings, ClearDesk keeps visit calendars organized and sends appointment reminders. Arrange a walkthrough with the team by email.",
    evidence: "For neighborhood opticians juggling bookings, ClearDesk keeps visit calendars organized and sends appointment reminders.",
    conceptStatus: "present", issue: "There is no indication of who would use this offering.",
  },
  {
    name: "marketing-only content",
    content: "Brilliant futures. Extraordinary possibilities. A new era of excellence awaits everyone. Transform tomorrow with visionary ambition and limitless potential.",
    evidence: null, conceptStatus: "absent", issue: "The concrete offering is not identified in this excerpt.",
  },
];
const draftFor = (issue) => ({
  overallAssessment: "The page does not identify its offering or audience.",
  strengths: [],
  findings: [
    { area: "Offering and audience", issue, evidence: "Not supplied", priority: "high" },
    { area: "Implementation", issue: "An implementation timeline is not supplied.", evidence: "Not supplied", priority: "medium" },
  ],
  recommendations: [
    { action: "Name the offering and audience.", reason: "These are missing.", priority: "high" },
    { action: "Add an approved implementation timeline.", reason: "Help buyers assess timing.", priority: "medium" },
  ], clarificationNeeded: false, clarificationQuestion: null,
});
for (const item of cases) {
  const draft = draftFor(item.issue);
  // A separate semantic-review provider finds concepts, not vocabulary matches.
  const review = {
    overallSupported: false, strengthsSupported: [],
    recommendationsSupported: [item.conceptStatus === "absent", true],
    findings: [
      { kind: "absence", conceptStatus: item.conceptStatus, supported: true, quotes: item.evidence ? [item.evidence] : [] },
      { kind: "absence", conceptStatus: "absent", supported: true, quotes: [] },
    ],
  };
  const validated = validateTheoModelOutput(draft, { websiteContent: item.content, evidenceReview: review, requireEvidenceReview: true });
  assert.equal(validated.valid, true, item.name);
  if (item.evidence) assert.ok(validated.correctedOutput.strengths.includes(item.evidence), "contradictory absence must preserve the actual present evidence");
  assert.equal(validated.correctedOutput.findings.length, item.conceptStatus === "absent" ? 2 : 1, item.name);
  assert.equal(validated.correctedOutput.findings.at(-1).area, "Implementation", "genuine missing information must survive");
  assert.equal(validated.correctedOutput.recommendations.length, item.conceptStatus === "absent" ? 2 : 1);
  assert.notEqual(validated.correctedOutput.overallAssessment, draft.overallAssessment);
  const unreviewed = validateTheoModelOutput(draft, { websiteContent: item.content, requireEvidenceReview: true });
  assert.equal(unreviewed.valid, false, "absence language alone is not evidence");
  const local = runTheoLocalAnalysis({ message: "What information is missing?", websiteContent: item.content });
  assert.ok(local.findings.every(({ issue }) => ![
    "The page does not directly identify what kind of offering is being described.",
    "The intended buyer or audience is not identified.",
  ].includes(issue)), item.name);
}
const content = cases[0].content;
const observed = {
  ...draftFor("The supplied text identifies an offering."),
  findings: [{ area: "Offering", issue: "The supplied text identifies an offering.", evidence: cases[0].evidence, priority: "low" }],
  recommendations: [],
};
const observationReview = {
  overallSupported: false, strengthsSupported: [], recommendationsSupported: [],
  findings: [{ kind: "observation", conceptStatus: "present", supported: true, quotes: [cases[0].evidence] }],
};
assert.equal(validateTheoModelOutput(observed, { websiteContent: content, evidenceReview: observationReview }).correctedOutput.findings.length, 1);
for (const bad of [
  { kind: "observation", conceptStatus: "present", supported: true, quotes: ["Made-up quotation"] },
  { kind: "absence", conceptStatus: "unknown", supported: true, quotes: [] },
  { kind: "absence", conceptStatus: "absent", supported: true, quotes: [cases[0].evidence] },
  { kind: "observation", conceptStatus: "present", supported: true, quotes: [] },
]) {
  const result = validateTheoModelOutput(observed, { websiteContent: content, evidenceReview: { ...observationReview, findings: [bad] } });
  assert.equal(result.correctedOutput.findings.length, 0, "unverified evidence must never be published");
}
assert.equal(validateTheoModelOutput(observed, { websiteContent: content, evidenceReview: { ...observationReview, findings: [] } }).valid, false);
const request = buildTheoEvidenceReviewRequest({ websiteContent: content, analysis: observed });
assert.equal(request.input.suppliedContent, content);
assert.ok(request.system.includes("COMPLETE"));
assert.ok(request.system.includes("paraphrases"));
assert.ok(request.system.includes("untrusted data"));
assert.equal(await reviewTheoEvidence({ websiteContent: content, analysis: observed, provider: async () => { throw new Error("timeout"); } }), null);

const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true };
const intentProvider = async () => ({ intent: {
  domain: "supplied_content_analysis", topic: "supplied-content-missing-information", entities: ["page"],
  proposition: "Identify absent evaluation information", polarity: "positive", negationScope: [],
  questionType: "status", speechAct: "question", requestedDetail: "missing information",
  followUpReferences: [], confidence: 0.98, clarificationNeeded: false, mentionedNames: [],
} });
let reviewCalls = 0;
const response = await handleTheoChatRequest({
  method: "POST", body: { message: "What information is missing?", websiteContent: content },
  rateLimitStore: { consume: async () => ({ allowed: true }) },
  responseAdapter: (input) => runTheoResponseAdapter({ ...input, config, intentProvider,
    providerAdapter: async () => ({ modelOutput: { answer: JSON.stringify(draftFor(cases[0].issue)) } }),
    evidenceReviewer: async ({ websiteContent, analysis }) => {
      reviewCalls++;
      assert.equal(websiteContent, content);
      assert.equal(analysis.findings.length, 2);
      return { overallSupported: false, strengthsSupported: [], recommendationsSupported: [false, true], findings: [
        { kind: "absence", conceptStatus: "present", supported: false, quotes: [cases[0].evidence] },
        { kind: "absence", conceptStatus: "absent", supported: true, quotes: [] },
      ] };
    },
  }),
});
assert.equal(reviewCalls, 1);
assert.equal(response.status, 200);
assert.deepEqual(response.body.analysis.findings.map(({ area }) => area), ["Implementation"]);
const unavailable = await runTheoResponseAdapter({ message: "Review this excerpt", websiteContent: content, config, intentProvider,
  providerAdapter: async () => ({ modelOutput: { answer: JSON.stringify(draftFor(cases[0].issue)) } }),
  evidenceReviewer: async () => null,
});
assert.equal(unavailable.fallbackUsed, true);
assert.ok(unavailable.fallbackReason.includes("missing_evidence_review"));
assert.ok(!unavailable.analysis.findings.some(({ issue }) => issue === cases[0].issue));
console.log("Theo evidence-review and output-validator regression tests passed (present, absent, partial, paraphrased, marketing, failure and API cases).");

for (const malformed of [null, {}, { ...observed, findings: [null] }, { ...observed, strengths: null }]) {
  assert.equal(validateTheoModelOutput(malformed, { websiteContent: content, evidenceReview: observationReview }).valid, false);
}
