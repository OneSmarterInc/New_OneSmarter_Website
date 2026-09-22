export const SELENE_INPUT_LIMIT = 1000;
export const SELENE_HISTORY_LIMIT = 6;
export const SELENE_HISTORY_TOTAL_LIMIT = 2000;

export const SELENE_SUGGESTED_QUESTIONS = [
  "How does OneSmarter design its AI agents?",
  "How are Mira, Theo, Elena, Ravi and Selene different?",
  "How do your agents prevent unsupported claims?",
  "How does the knowledge boundary work?",
  "Why does the Agent Café have a review gate?",
  "Can Café conversations influence professional answers?",
  "Do your agents collaborate autonomously?",
  "Does depletion make an agent less accurate?",
];

const normalizeVisibleText = (value = "") => String(value)
  .replace(/(?:&#(?:x(?:09|0a|0d|20|a0)|(?:9|10|13|32|160));|&nbsp;)/gi, " ");

export const deriveSelenePresence = ({
  cafePresence = "at_work",
  isRequestInFlight = false,
} = {}) => isRequestInFlight ? "at_work" : cafePresence;

export const buildSeleneConversationHistory = (turns = []) => {
  let totalChars = 0;
  const history = [];
  const recentTurns = turns
    .filter((turn) => ["user", "assistant"].includes(turn?.role)
      && typeof turn.content === "string" && turn.content.trim())
    .slice(-SELENE_HISTORY_LIMIT)
    .reverse();

  for (const turn of recentTurns) {
    const content = turn.content.trim().slice(0, 700);
    if (totalChars + content.length > SELENE_HISTORY_TOTAL_LIMIT) continue;
    totalChars += content.length;
    history.push({ role: turn.role, content });
  }
  return history.reverse();
};

export const askSeleneEndpoint = async ({
  message,
  conversationHistory = [],
  conversationId = "",
  fetchImpl = globalThis.fetch,
}) => {
  const response = await fetchImpl("/api/agents/selene/chat", {
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
    const error = new Error(data.message || "Selene endpoint request failed.");
    error.status = response.status;
    error.code = data.error;
    error.hasSafeServerMessage = typeof data.message === "string" && Boolean(data.message.trim());
    throw error;
  }
  return data;
};

export const visibleSeleneResponse = (response) => ({
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
