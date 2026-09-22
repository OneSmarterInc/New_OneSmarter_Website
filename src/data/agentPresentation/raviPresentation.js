export const RAVI_INPUT_LIMIT = 1000;
export const RAVI_HISTORY_LIMIT = 6;
export const RAVI_HISTORY_TOTAL_LIMIT = 2000;

export const RAVI_SUGGESTED_QUESTIONS = [
  "What does secure ticketing support?",
  "How does case management support accountable workflows?",
  "How should routing and escalation handoffs be designed?",
  "How can claims workflows be modernized?",
  "How do you support healthcare and TPA workflows?",
  "What enterprise workflow tools do you provide?",
  "How does software support consolidation help continuity?",
  "Can Ravi access or change our ticket queue?",
];

const normalizeVisibleText = (value = "") => String(value)
  .replace(/(?:&#(?:x(?:09|0a|0d|20|a0)|(?:9|10|13|32|160));|&nbsp;)/gi, " ");

export const deriveRaviPresence = ({
  cafePresence = "at_work",
  isRequestInFlight = false,
} = {}) => isRequestInFlight ? "at_work" : cafePresence;

export const buildRaviConversationHistory = (turns = []) => {
  let totalChars = 0;
  const history = [];
  const recentTurns = turns
    .filter((turn) => ["user", "assistant"].includes(turn?.role)
      && typeof turn.content === "string" && turn.content.trim())
    .slice(-RAVI_HISTORY_LIMIT)
    .reverse();

  for (const turn of recentTurns) {
    const content = turn.content.trim().slice(0, 700);
    if (totalChars + content.length > RAVI_HISTORY_TOTAL_LIMIT) continue;
    totalChars += content.length;
    history.push({ role: turn.role, content });
  }
  return history.reverse();
};

export const askRaviEndpoint = async ({
  message,
  conversationHistory = [],
  conversationId = "",
  fetchImpl = globalThis.fetch,
}) => {
  const response = await fetchImpl("/api/agents/ravi/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversationHistory,
      ...(conversationId ? { conversationId } : {}),
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Ravi endpoint request failed.");
    error.status = response.status;
    error.code = data.error;
    error.hasSafeServerMessage = typeof data.message === "string" && Boolean(data.message.trim());
    throw error;
  }
  return data;
};

export const visibleRaviResponse = (response) => ({
  answer: normalizeVisibleText(response?.answer || ""),
  sources: Array.isArray(response?.sources) ? response.sources
    .filter((source) => source && typeof source.title === "string")
    .map((source) => ({
      title: normalizeVisibleText(source.title),
      route: typeof source.route === "string" && source.route.startsWith("/")
        ? source.route
        : "",
    })) : [],
  clarificationNeeded: Boolean(response?.clarification?.needed),
  clarificationQuestion: normalizeVisibleText(response?.clarification?.question || ""),
  fallbackUsed: Boolean(response?.fallback?.used),
});
