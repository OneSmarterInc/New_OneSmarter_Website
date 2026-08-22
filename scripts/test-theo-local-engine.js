import assert from "node:assert/strict";
import { hasSufficientTheoEvidence, runTheoLocalAnalysis, formatTheoVisitorAnswer } from "../src/server/theo/theoLocalEngine.js";

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

console.log("Theo local-engine tests passed.");
