import assert from "node:assert/strict";
import {
  excerptTheoEvidence,
  hasSufficientTheoEvidence,
  runTheoLocalAnalysis,
  formatTheoVisitorAnswer,
} from "../src/server/theo/theoLocalEngine.js";

assert.equal(hasSufficientTheoEvidence("short"), false);
const insufficient = runTheoLocalAnalysis({ websiteContent: "A short fragment." });
assert.equal(insufficient.clarificationNeeded, true);
assert.match(insufficient.clarificationQuestion, /supply/i);

const content = `# Claims Workflow Platform
Our platform helps operations teams organize case intake and review work.
## Clear workflow
The service provides assignment tracking and a documented review path.
Contact our team to request more information.
Title: Claims Workflow Platform | Example`;
const analysis = runTheoLocalAnalysis({ websiteContent: content });
assert.equal(analysis.clarificationNeeded, false);
assert.equal(analysis.evidenceStatus, "supplied_content_only");
assert.ok(analysis.strengths.length >= 3);
assert.ok(Array.isArray(analysis.findings));
assert.ok(Array.isArray(analysis.recommendations));
const answer = formatTheoVisitorAnswer(analysis);
assert.match(answer, /Strengths/);
assert.doesNotMatch(answer, /system prompt|cafe persona|runtime metadata/i);

const scenarioContent = `Heading: OneSmarter Technology Services
Subheading: Practical support for operations teams
OneSmarter provides innovative, world-class, cutting-edge technology and operational services to organizations.
Our services improve workflows with seamless solutions.
Contact our team to learn more.`;
const scenarios = [
  ["AI readability and buyer clarity", "Analyze this supplied page for AI readability and buyer clarity.", "ai_buyer_clarity"],
  ["Buyer understanding", "What would a potential buyer understand from this page, and what would still be unclear?", "buyer_understanding"],
  ["Ambiguous language", "Are the services on this page clearly explained? Identify vague or ambiguous language.", "ambiguous_language"],
  ["AI search understanding", "Is this page easy for an AI search engine to understand? What entities, services, or relationships are unclear?", "ai_readability"],
  ["Missing buyer information", "What buyer information is missing for someone evaluating this service?", "missing_buyer_information"],
  ["Generic marketing language", "Identify generic marketing language and explain what should be more specific.", "generic_marketing"],
];
const scenarioResults = scenarios.map(([name, message, expectedFocus]) => {
  const result = runTheoLocalAnalysis({ message, websiteContent: scenarioContent });
  assert.equal(result.analysisFocus, expectedFocus, `${name} focus`);
  return result;
});
assert.match(scenarioResults[1].overallAssessment, /buyer can understand/i);
assert.ok(scenarioResults[1].findings.some((item) => /buyer/i.test(item.area)));
assert.ok(scenarioResults[2].findings.some((item) => /innovative|world-class|cutting-edge/i.test(item.evidence)));
assert.match(JSON.stringify(scenarioResults[3]), /company|provider|entity|relationship/i);
assert.ok(scenarioResults[4].findings.some((item) => /missing|unclear/i.test(item.area)));
assert.match(formatTheoVisitorAnswer(scenarioResults[5]), /innovative|world-class|cutting-edge/i);

const materiallyDifferentOutputs = new Set(scenarioResults.slice(0, 5).map((result) => JSON.stringify({
  assessment: result.overallAssessment,
  areas: result.findings.map((item) => item.area),
  actions: result.recommendations.map((item) => item.action),
})));
assert.ok(materiallyDifferentOutputs.size >= 4, "Scenarios 1–5 should not collapse into effectively identical output");

for (const label of ["Heading", "Subheading", "Title", "H1", "H2", "H3"]) {
  const headingResult = runTheoLocalAnalysis({
    message: "Analyze this supplied page.",
    websiteContent: `${label}: Transform Your Business\nOur service helps operations teams manage documented workflows and contact the support team for more information.`,
  });
  assert.ok(headingResult.strengths.some((item) => /recognized heading/i.test(item)), `${label}: should be recognized`);
  assert.ok(!headingResult.findings.some((item) => item.area === "Page structure"), `${label}: should not produce a missing-heading finding`);
}

const unsupported = runTheoLocalAnalysis({
  message: "Tell me whether this company is ISO certified, what it charges, and which major customers use it.",
  websiteContent: "OneSmarter provides technology and operational services to organizations.",
});
assert.equal(unsupported.clarificationNeeded, false);
assert.equal(unsupported.evidenceStatus, "supplied_content_unsupported");
assert.match(unsupported.overallAssessment, /does not provide evidence/i);
assert.match(unsupported.overallAssessment, /ISO certification/i);
assert.match(unsupported.overallAssessment, /pricing/i);
assert.match(unsupported.overallAssessment, /customer names/i);
assert.doesNotMatch(formatTheoVisitorAnswer(unsupported), /OneSmarter is ISO|\$\d|customers include/i);

const encodedWhitespace = runTheoLocalAnalysis({
  message: "Analyze this supplied page.",
  websiteContent: "# Service&#x20;Page\nOur&#32;service helps operations teams manage documented workflows. Contact&nbsp;our team to request more information.",
});
assert.doesNotMatch(formatTheoVisitorAnswer(encodedWhitespace), /&#x20;|&#32;|&nbsp;/i);

const longEvidence = "Our service combines technology, process knowledge, and operational support for organizations that need a documented and reliable review workflow without unnecessary complexity.";
const snippet = excerptTheoEvidence(longEvidence, 72);
assert.match(snippet, /…$/);
assert.ok(!/\b[a-z]{1,3}…$/i.test(snippet), `Snippet should not end in a partial word: ${snippet}`);
assert.equal(longEvidence.startsWith(snippet.slice(0, -1)), true);

console.log("Theo local-engine tests passed.");
