import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SELENE_HISTORY_LIMIT,
  SELENE_HISTORY_TOTAL_LIMIT,
  SELENE_INPUT_LIMIT,
  SELENE_SUGGESTED_QUESTIONS,
  askSeleneEndpoint,
  buildSeleneConversationHistory,
  deriveSelenePresence,
  visibleSeleneResponse,
} from "../src/data/agentPresentation/selenePresentation.js";

assert.equal(deriveSelenePresence({ cafePresence: "in_cafe", isRequestInFlight: false }), "in_cafe");
assert.equal(deriveSelenePresence({ cafePresence: "in_cafe", isRequestInFlight: true }), "at_work");
assert.equal(deriveSelenePresence({ cafePresence: "at_work", isRequestInFlight: false }), "at_work");

const turns = Array.from({ length: 10 }, (_, index) => ({
  role: index % 2 ? "assistant" : "user",
  content: `turn-${index} ${"x".repeat(300)}`,
}));
const bounded = buildSeleneConversationHistory(turns);
assert.ok(bounded.length <= SELENE_HISTORY_LIMIT);
assert.ok(bounded.reduce((total, turn) => total + turn.content.length, 0) <= SELENE_HISTORY_TOTAL_LIMIT);
assert.equal(SELENE_SUGGESTED_QUESTIONS.length, 8);

let requestUrl = "";
let requestBody;
const response = await askSeleneEndpoint({
  message: "How does OneSmarter design its AI agents?",
  conversationHistory: bounded,
  conversationId: "selene-ui-test",
  fetchImpl: async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        conversationId: "selene-ui-test",
        answer: "OneSmarter separates agents by focused professional role and approved knowledge boundary.",
        sources: [{ id: "internal-id", title: "AI Agents", route: "/ai-agents", sourceLabel: "internal" }],
        clarification: { needed: false, question: null },
        fallback: { used: false, reason: "internal reason" },
        mode: "internal-mode",
        safety: { internalFlag: true },
        depletion: { energyUnits: 42 },
      }),
    };
  },
});
assert.equal(requestUrl, "/api/agents/selene/chat");
assert.equal(requestBody.message, "How does OneSmarter design its AI agents?");
assert.deepEqual(requestBody.conversationHistory, bounded);
assert.equal(requestBody.conversationId, "selene-ui-test");

const visible = visibleSeleneResponse(response);
assert.match(visible.answer, /separates agents/);
assert.deepEqual(visible.sources, [{ title: "AI Agents", route: "/ai-agents" }]);
for (const key of ["mode", "safety", "depletion", "reason", "id", "sourceLabel"]) {
  assert.equal(key in visible, false, key);
  assert.equal(key in visible.sources[0], false, key);
}

const clarification = visibleSeleneResponse({
  answer: "I can explain OneSmarter's approved agent architecture.",
  sources: [],
  clarification: { needed: true, question: "Which agent-design topic would you like to review?" },
  fallback: { used: true, reason: "provider diagnostic" },
});
assert.equal(clarification.clarificationNeeded, true);
assert.match(clarification.clarificationQuestion, /agent-design topic/);
assert.equal(clarification.fallbackUsed, true);

await assert.rejects(
  askSeleneEndpoint({
    message: "Question",
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: "rate_limited", message: "Selene is receiving too many requests. Please try again shortly." }),
    }),
  }),
  (error) => error.status === 429 && error.code === "rate_limited"
    && error.hasSafeServerMessage && /too many requests/i.test(error.message),
);

const pageSource = fs.readFileSync("src/components/AiAgentsPage.jsx", "utf8");
const seleneSource = fs.readFileSync("src/components/SeleneConversationPanel.jsx", "utf8");
const presentationSource = fs.readFileSync("src/data/agentPresentation/selenePresentation.js", "utf8");

assert.doesNotMatch(pageSource, /Selene Hart[\s\S]{0,700}Live architecture strategist/);
assert.doesNotMatch(pageSource, /Open Selene/);
assert.doesNotMatch(pageSource, /href="#selene-professional-architecture"/);
assert.doesNotMatch(pageSource, /deriveSelenePresence\(\{ cafePresence, isRequestInFlight: isSeleneRequestInFlight \}\)/);
assert.doesNotMatch(pageSource, /onRequestStateChange=\{setIsSeleneRequestInFlight\}/);
assert.match(seleneSource, /SeleneConversationTurn/);
assert.match(seleneSource, />Visitor</);
assert.match(seleneSource, />Selene Hart</);
assert.match(seleneSource, /role="status"/);
assert.match(seleneSource, /role="alert"/);
assert.match(seleneSource, /clarificationQuestion/);
assert.match(seleneSource, /fallbackUsed/);
assert.match(seleneSource, /Start new conversation/);
assert.match(seleneSource, /disabled=\{isLoading \|\| !message\.trim\(\) \|\| isMessageTooLong\}/);
assert.doesNotMatch(seleneSource, /maxLength=\{SELENE_INPUT_LIMIT\}/);
assert.match(seleneSource, /setMessage\(event\.target\.value\)/);
assert.equal(SELENE_INPUT_LIMIT, 1000);
assert.equal(SELENE_INPUT_LIMIT + 1 > SELENE_INPUT_LIMIT, true);
assert.doesNotMatch(seleneSource, /websiteContent|type="file"|upload|crawler/i);
assert.doesNotMatch(seleneSource + presentationSource, /cafePersonas|cafeConversations|fallback\.reason|provider|riskFlags|claimRule|prompt|energyUnits/i);
assert.match(presentationSource, /"\/api\/agents\/selene\/chat"/);
assert.doesNotMatch(pageSource, /Five specialized AI agents for public guidance, supplied-content analysis,[\s\S]*compliance review, operations guidance, and agent architecture\./);
assert.doesNotMatch(pageSource, /with operations and strategy agents in development|with strategy agents in development/);
assert.doesNotMatch(pageSource, /Open Maya/);
assert.doesNotMatch(pageSource, /all five agents autonomously collaborate|autonomous multi-agent production orchestration/i);

for (const [path, endpoint] of [
  ["src/components/AiAgentsPage.jsx", "/api/agents/mira/chat"],
  ["src/data/agentPresentation/theoPresentation.js", "/api/agents/theo/chat"],
  ["src/data/agentPresentation/elenaPresentation.js", "/api/agents/elena/chat"],
  ["src/data/agentPresentation/raviPresentation.js", "/api/agents/ravi/chat"],
]) {
  assert.match(fs.readFileSync(path, "utf8"), new RegExp(endpoint.replaceAll("/", "\\/")));
}

console.log("Selene presentation tests passed.");
console.log("Validated removed page cards with retained standalone panels, bounded conversation flow, safe rendering, presence, endpoint isolation, and professional/Café separation.");
