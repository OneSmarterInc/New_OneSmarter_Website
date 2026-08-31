import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ELENA_HISTORY_LIMIT,
  ELENA_HISTORY_TOTAL_LIMIT,
  ELENA_SUGGESTED_QUESTIONS,
  askElenaEndpoint,
  buildElenaConversationHistory,
  deriveElenaPresence,
  visibleElenaResponse,
} from "../src/data/agentPresentation/elenaPresentation.js";

assert.equal(deriveElenaPresence({ cafePresence: "in_cafe", isRequestInFlight: false }), "in_cafe");
assert.equal(deriveElenaPresence({ cafePresence: "in_cafe", isRequestInFlight: true }), "at_work");
assert.equal(deriveElenaPresence({ cafePresence: "in_cafe", isRequestInFlight: false }), "in_cafe");
assert.equal(deriveElenaPresence({ cafePresence: "at_work", isRequestInFlight: false }), "at_work");

const turns = Array.from({ length: 10 }, (_, index) => ({
  role: index % 2 ? "assistant" : "user",
  content: `turn-${index} ${"x".repeat(300)}`,
}));
const bounded = buildElenaConversationHistory(turns);
assert.ok(bounded.length <= ELENA_HISTORY_LIMIT);
assert.ok(bounded.reduce((total, turn) => total + turn.content.length, 0) <= ELENA_HISTORY_TOTAL_LIMIT);
assert.equal(ELENA_SUGGESTED_QUESTIONS.length, 8);

let requestUrl = "";
let requestBody = null;
const endpointResponse = await askElenaEndpoint({
  message: "Are you HIPAA certified?",
  conversationHistory: bounded,
  conversationId: "elena-ui-test",
  fetchImpl: async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        conversationId: "elena-ui-test",
        answer: "OneSmarter completed a HIPAA Security Rule Compliance Assessment.",
        sources: [{ id: "internal-id", title: "HIPAA posture", route: "/trust-center", sourceLabel: "internal label" }],
        clarification: { needed: false, question: null },
        fallback: { used: false, reason: null },
        mode: "internal-mode",
        safety: { internalFlag: true },
      }),
    };
  },
});
assert.equal(requestUrl, "/api/agents/elena/chat");
assert.equal(requestBody.message, "Are you HIPAA certified?");
assert.equal(requestBody.conversationId, "elena-ui-test");
assert.deepEqual(requestBody.conversationHistory, bounded);

const visible = visibleElenaResponse(endpointResponse);
assert.match(visible.answer, /HIPAA Security Rule/);
assert.deepEqual(visible.sources, [{ title: "HIPAA posture", route: "/trust-center" }]);
assert.equal(visible.clarificationNeeded, false);
assert.equal(visible.fallbackUsed, false);
assert.equal("mode" in visible, false);
assert.equal("safety" in visible, false);
assert.equal("reason" in visible, false);
assert.equal("id" in visible.sources[0], false);
assert.equal("sourceLabel" in visible.sources[0], false);

const clarification = visibleElenaResponse({
  answer: "I need an approved compliance topic.",
  sources: [],
  clarification: { needed: true, question: "Which compliance topic would you like to review?" },
  fallback: { used: true, reason: "provider diagnostic" },
});
assert.equal(clarification.clarificationNeeded, true);
assert.match(clarification.clarificationQuestion, /Which compliance topic/);
assert.equal(clarification.fallbackUsed, true);
assert.equal("fallbackReason" in clarification, false);

await assert.rejects(
  askElenaEndpoint({
    message: "Question",
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: "rate_limited", message: "Elena is receiving too many requests. Please try again shortly." }),
    }),
  }),
  (error) => error.status === 429 && error.code === "rate_limited"
    && error.hasSafeServerMessage && /too many requests/i.test(error.message),
);

const pageSource = fs.readFileSync("src/components/AiAgentsPage.jsx", "utf8");
const elenaSource = fs.readFileSync("src/components/ElenaConversationPanel.jsx", "utf8");
const miraEndpointPattern = /fetch\("\/api\/agents\/mira\/chat"/;
const theoSource = fs.readFileSync("src/data/agentPresentation/theoPresentation.js", "utf8");

assert.match(pageSource, /Open Elena/);
assert.match(pageSource, /Live compliance reader/);
assert.match(pageSource, /deriveElenaPresence\(\{ cafePresence, isRequestInFlight: isElenaRequestInFlight \}\)/);
assert.match(pageSource, /onRequestStateChange=\{setIsElenaRequestInFlight\}/);
assert.match(pageSource, miraEndpointPattern);
assert.match(theoSource, /"\/api\/agents\/theo\/chat"/);
assert.match(elenaSource, /answer/);
assert.match(elenaSource, /clarificationQuestion/);
assert.match(elenaSource, /fallbackUsed/);
assert.match(elenaSource, /role="alert"/);
assert.match(elenaSource, /Start new conversation/);
assert.match(elenaSource, /onRequestStateChange\(true\)[\s\S]*?onRequestStateChange\(false\)/);
assert.doesNotMatch(elenaSource, /cafePersonas|cafeConversations|sourceLabel|fallback\.reason|provider|riskFlags|claimRule|prompt/i);
assert.match(pageSource, /Future workflow concept/);
assert.match(pageSource, /Future strategy concept/);
assert.doesNotMatch(pageSource, /Ravi Sen[\s\S]{0,500}Open Ravi/);
assert.doesNotMatch(pageSource, /Selene Hart[\s\S]{0,500}Open Selene/);

console.log("Elena presentation tests passed.");
