import assert from "node:assert/strict";
import fs from "node:fs";
import {
  RAVI_HISTORY_LIMIT,
  RAVI_HISTORY_TOTAL_LIMIT,
  RAVI_INPUT_LIMIT,
  RAVI_SUGGESTED_QUESTIONS,
  askRaviEndpoint,
  buildRaviConversationHistory,
  deriveRaviPresence,
  visibleRaviResponse,
} from "../src/data/agentPresentation/raviPresentation.js";

assert.equal(deriveRaviPresence({ cafePresence: "in_cafe", isRequestInFlight: false }), "in_cafe");
assert.equal(deriveRaviPresence({ cafePresence: "in_cafe", isRequestInFlight: true }), "at_work");
assert.equal(deriveRaviPresence({ cafePresence: "at_work", isRequestInFlight: false }), "at_work");

const turns = Array.from({ length: 10 }, (_, index) => ({
  role: index % 2 ? "assistant" : "user",
  content: `turn-${index} ${"x".repeat(300)}`,
}));
const bounded = buildRaviConversationHistory(turns);
assert.ok(bounded.length <= RAVI_HISTORY_LIMIT);
assert.ok(bounded.reduce((total, turn) => total + turn.content.length, 0) <= RAVI_HISTORY_TOTAL_LIMIT);
assert.equal(RAVI_SUGGESTED_QUESTIONS.length, 8);

let requestUrl = "";
let requestBody;
const response = await askRaviEndpoint({
  message: "What does secure ticketing support?",
  conversationHistory: bounded,
  conversationId: "ravi-ui-test",
  fetchImpl: async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        conversationId: "ravi-ui-test",
        answer: "Secure ticketing supports controlled operational workflows.",
        sources: [{ id: "internal-id", title: "Secure Ticketing", route: "/platforms/secure-ticketing", sourceLabel: "internal" }],
        clarification: { needed: false, question: null },
        fallback: { used: false, reason: "internal reason" },
        mode: "internal-mode",
        safety: { internalFlag: true },
        depletion: { energyUnits: 42 },
      }),
    };
  },
});
assert.equal(requestUrl, "/api/agents/ravi/chat");
assert.equal(requestBody.message, "What does secure ticketing support?");
assert.deepEqual(requestBody.conversationHistory, bounded);
assert.equal(requestBody.conversationId, "ravi-ui-test");

const visible = visibleRaviResponse(response);
assert.match(visible.answer, /Secure ticketing/);
assert.deepEqual(visible.sources, [{ title: "Secure Ticketing", route: "/platforms/secure-ticketing" }]);
for (const key of ["mode", "safety", "depletion", "reason", "id", "sourceLabel"]) {
  assert.equal(key in visible, false, key);
  assert.equal(key in visible.sources[0], false, key);
}

const clarification = visibleRaviResponse({
  answer: "I can help with approved operations topics.",
  sources: [],
  clarification: { needed: true, question: "Which workflow would you like to review?" },
  fallback: { used: true, reason: "provider diagnostic" },
});
assert.equal(clarification.clarificationNeeded, true);
assert.match(clarification.clarificationQuestion, /Which workflow/);
assert.equal(clarification.fallbackUsed, true);

await assert.rejects(
  askRaviEndpoint({
    message: "Question",
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: "rate_limited", message: "Ravi is receiving too many requests. Please try again shortly." }),
    }),
  }),
  (error) => error.status === 429 && error.code === "rate_limited"
    && error.hasSafeServerMessage && /too many requests/i.test(error.message),
);

const pageSource = fs.readFileSync("src/components/AiAgentsPage.jsx", "utf8");
const raviSource = fs.readFileSync("src/components/RaviConversationPanel.jsx", "utf8");
const presentationSource = fs.readFileSync("src/data/agentPresentation/raviPresentation.js", "utf8");

assert.match(pageSource, /Live operations agent/);
assert.match(pageSource, /Open Ravi/);
assert.match(pageSource, /href="#ravi-professional-operations"/);
assert.match(pageSource, /deriveRaviPresence\(\{ cafePresence, isRequestInFlight: isRaviRequestInFlight \}\)/);
assert.match(pageSource, /onRequestStateChange=\{setIsRaviRequestInFlight\}/);
assert.match(raviSource, /RaviConversationTurn/);
assert.match(raviSource, />Visitor</);
assert.match(raviSource, />Ravi Sen</);
assert.match(raviSource, /role="status"/);
assert.match(raviSource, /role="alert"/);
assert.match(raviSource, /clarificationQuestion/);
assert.match(raviSource, /fallbackUsed/);
assert.match(raviSource, /Start new conversation/);
assert.match(raviSource, /disabled=\{isLoading \|\| !message\.trim\(\) \|\| isMessageTooLong\}/);
assert.doesNotMatch(raviSource, /maxLength=\{RAVI_INPUT_LIMIT\}/);
assert.equal(RAVI_INPUT_LIMIT + 1 > RAVI_INPUT_LIMIT, true);
assert.doesNotMatch(raviSource, /websiteContent|type="file"|upload|crawler/i);
assert.doesNotMatch(raviSource + presentationSource, /cafePersonas|cafeConversations|fallback\.reason|provider|riskFlags|claimRule|prompt|energyUnits/i);
assert.doesNotMatch(raviSource, /Ravi (?:can|will) (?:access|close|modify|escalate)/i);
assert.match(presentationSource, /"\/api\/agents\/ravi\/chat"/);

assert.match(pageSource, /fetch\("\/api\/agents\/mira\/chat"/);
assert.match(fs.readFileSync("src/data/agentPresentation/theoPresentation.js", "utf8"), /"\/api\/agents\/theo\/chat"/);
assert.match(fs.readFileSync("src/data/agentPresentation/elenaPresentation.js", "utf8"), /"\/api\/agents\/elena\/chat"/);
assert.match(pageSource, /Ravi Sen[\s\S]{0,500}Live operations agent/);
assert.match(pageSource, /Selene Hart[\s\S]{0,700}Live architecture strategist/);
assert.match(pageSource, /Open Selene/);
assert.doesNotMatch(pageSource, /Open Maya/);

console.log("Ravi presentation tests passed.");
console.log("Validated live card/panel wiring, bounded conversation flow, safe rendering, presence, endpoint isolation, and professional/Café separation.");
