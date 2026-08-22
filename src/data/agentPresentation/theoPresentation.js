export const THEO_INPUT_LIMIT = 1000;
export const THEO_CONTENT_LIMIT = 20000;
export const THEO_HISTORY_LIMIT = 6;
export const THEO_HISTORY_TOTAL_LIMIT = 2000;

export const buildTheoConversationHistory = (turns = []) => {
  let totalChars = 0;
  const history = [];
  const recentTurns = turns
    .filter((turn) => ["user", "assistant"].includes(turn?.role) && typeof turn.content === "string" && turn.content.trim())
    .slice(-THEO_HISTORY_LIMIT)
    .reverse();

  for (const turn of recentTurns) {
    const content = turn.content.trim().slice(0, 700);
    if (totalChars + content.length > THEO_HISTORY_TOTAL_LIMIT) continue;
    totalChars += content.length;
    history.push({ role: turn.role, content });
  }
  return history.reverse();
};

export const askTheoEndpoint = async ({
  message,
  websiteContent,
  conversationHistory = [],
  conversationId = "",
  fetchImpl = globalThis.fetch,
}) => {
  const response = await fetchImpl("/api/agents/theo/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      websiteContent,
      conversationHistory,
      ...(conversationId ? { conversationId } : {}),
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Theo endpoint request failed.");
    error.status = response.status;
    error.code = data.error;
    throw error;
  }
  return data;
};

export const visibleTheoAnalysis = (response) => {
  const analysis = response?.analysis || {};
  return {
    overallAssessment: analysis.overallAssessment || "",
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
    findings: Array.isArray(analysis.findings) ? analysis.findings : [],
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
    clarificationNeeded: Boolean(analysis.clarificationNeeded),
    clarificationQuestion: analysis.clarificationQuestion || "",
  };
};
