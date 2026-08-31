export const ELENA_INPUT_LIMIT = 1000;
export const ELENA_HISTORY_LIMIT = 6;
export const ELENA_HISTORY_TOTAL_LIMIT = 2000;

export const ELENA_SUGGESTED_QUESTIONS = [
  "Are you HIPAA certified?",
  "Are you SOC 2 certified?",
  "Are you ISO/IEC 27001 certified?",
  "What is your ISO certificate number?",
  "Does your ISO certification cover claims processing?",
  "Can OneSmarter certify my company?",
  "Can you guarantee HIPAA compliance?",
  "Can you help us prepare for an audit?",
];

const normalizeVisibleText = (value = "") => String(value)
  .replace(/(?:&#(?:x(?:09|0a|0d|20|a0)|(?:9|10|13|32|160));|&nbsp;)/gi, " ");

export const deriveElenaPresence = ({
  cafePresence = "at_work",
  isRequestInFlight = false,
} = {}) => isRequestInFlight ? "at_work" : cafePresence;

export const buildElenaConversationHistory = (turns = []) => {
  let totalChars = 0;
  const history = [];
  const recentTurns = turns
    .filter((turn) => ["user", "assistant"].includes(turn?.role)
      && typeof turn.content === "string" && turn.content.trim())
    .slice(-ELENA_HISTORY_LIMIT)
    .reverse();

  for (const turn of recentTurns) {
    const content = turn.content.trim().slice(0, 700);
    if (totalChars + content.length > ELENA_HISTORY_TOTAL_LIMIT) continue;
    totalChars += content.length;
    history.push({ role: turn.role, content });
  }
  return history.reverse();
};

export const askElenaEndpoint = async ({
  message,
  conversationHistory = [],
  conversationId = "",
  fetchImpl = globalThis.fetch,
}) => {
  const response = await fetchImpl("/api/agents/elena/chat", {
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
    const error = new Error(data.message || "Elena endpoint request failed.");
    error.status = response.status;
    error.code = data.error;
    error.hasSafeServerMessage = typeof data.message === "string" && Boolean(data.message.trim());
    throw error;
  }
  return data;
};

export const visibleElenaResponse = (response) => ({
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
