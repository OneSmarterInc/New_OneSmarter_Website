import assert from "node:assert/strict";
import fs from "node:fs";
import { THEO_HISTORY_LIMIT, THEO_HISTORY_TOTAL_LIMIT, askTheoEndpoint, buildTheoConversationHistory, visibleTheoAnalysis } from "../src/data/agentPresentation/theoPresentation.js";

const turns = Array.from({ length: 10 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `turn-${index} ${"x".repeat(300)}` }));
const bounded = buildTheoConversationHistory(turns);
assert.ok(bounded.length <= THEO_HISTORY_LIMIT);
assert.ok(bounded.reduce((total, turn) => total + turn.content.length, 0) <= THEO_HISTORY_TOTAL_LIMIT);
assert.equal(visibleTheoAnalysis(null).overallAssessment, "");

let requestUrl = "";
let requestBody = null;
const response = await askTheoEndpoint({
  message: "Analyze this page.",
  websiteContent: "# Page\nSupplied public page content with a service and contact path.",
  conversationHistory: bounded,
  conversationId: "theo-ui-test",
  fetchImpl: async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ conversationId: "theo-ui-test", answer: "Supported analysis.", analysis: { overallAssessment: "Supported assessment.", strengths: ["Clear heading."], findings: [], recommendations: [], clarificationNeeded: false, clarificationQuestion: null } }) };
  },
});
assert.equal(requestUrl, "/api/agents/theo/chat");
assert.match(requestBody.websiteContent, /Supplied public page content/);
assert.equal(requestBody.conversationId, "theo-ui-test");
assert.equal(response.answer, "Supported analysis.");
assert.equal(visibleTheoAnalysis(response).overallAssessment, "Supported assessment.");
assert.equal(visibleTheoAnalysis({ analysis: {
  overallAssessment: "Readable&#x20;assessment.",
  strengths: ["Clear&#32;heading."], findings: [], recommendations: [],
} }).overallAssessment, "Readable assessment.");

const clarification = visibleTheoAnalysis({ analysis: { overallAssessment: "Insufficient content.", strengths: [], findings: [], recommendations: [], clarificationNeeded: true, clarificationQuestion: "Please supply the page text." } });
assert.equal(clarification.clarificationNeeded, true);
assert.match(clarification.clarificationQuestion, /supply/i);

const pageSource = fs.readFileSync("src/components/AiAgentsPage.jsx", "utf8");
const theoSource = fs.readFileSync("src/components/TheoAnalysisPanel.jsx", "utf8");
assert.match(pageSource, /Open Theo/);
assert.match(pageSource, /Live supplied-content analysis/);
assert.match(pageSource, /\/api\/agents\/mira\/chat/);
assert.match(theoSource, /Theo Mercer/);
assert.match(theoSource, /clarificationQuestion/);
assert.match(theoSource, /role="alert"/);
assert.doesNotMatch(theoSource, /cafePersonas|cafeConversations/i);
for (const status of ["Future review concept", "Future workflow concept", "Future strategy concept"]) assert.match(pageSource, new RegExp(status));

console.log("Theo presentation tests passed.");
