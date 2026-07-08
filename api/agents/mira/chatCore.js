import crypto from "node:crypto";
import { runMiraLocalHarness } from "../../../src/data/agentKnowledge/miraLocalEngine.js";

const MAX_MESSAGE_LENGTH = 1000;
const AGENT_NAME = "Mira Vale";
const MODE = "local_harness_mock";

const jsonError = (status, error, message) => ({
  status,
  body: {
    agent: AGENT_NAME,
    mode: MODE,
    error,
    message,
  },
});

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === "string") return JSON.parse(body);
  return body;
};

const normalizeConversationId = (conversationId) => {
  if (typeof conversationId === "string" && conversationId.trim()) {
    return conversationId.trim().slice(0, 120);
  }
  return crypto.randomUUID();
};

const compactSources = (matchedEntries) =>
  matchedEntries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    route: entry.route,
    sourceLabel: entry.sourceLabel,
    score: entry.score,
  }));

const disclaimerFor = (result) => {
  if (result.riskFlags.includes("phi_or_confidential_data")) {
    return "Do not submit PHI, patient information, confidential documents, or private operational details through the public agent.";
  }
  if (result.riskFlags.length || result.handoffNeeded) {
    return "This is a local harness response grounded in approved public OneSmarter content; business-specific questions should go to care@onesmarter.com.";
  }
  return "";
};

const buildAnswer = (result) => {
  if (result.riskFlags.includes("phi_or_confidential_data")) {
    return `${result.answerSeed} Please do not submit PHI or confidential information through this public agent.`;
  }
  return result.answerSeed;
};

export const handleMiraChatRequest = ({ method = "GET", body } = {}) => {
  if (method !== "POST") {
    return jsonError(405, "method_not_allowed", "Use POST for /api/agents/mira/chat.");
  }

  let parsedBody;
  try {
    parsedBody = parseBody(body);
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const { message, conversationId, persona, memoryTheme, empathyState } = parsedBody;

  if (typeof message !== "string") {
    return jsonError(400, "invalid_message", "message is required and must be a string.");
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return jsonError(400, "empty_message", "message must not be empty.");
  }

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return jsonError(
      413,
      "message_too_long",
      `message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    );
  }

  const result = runMiraLocalHarness(trimmedMessage);
  const normalizedConversationId = normalizeConversationId(conversationId);

  return {
    status: 200,
    body: {
      agent: AGENT_NAME,
      mode: MODE,
      conversationId: normalizedConversationId,
      answer: buildAnswer(result),
      answerSeed: result.answerSeed,
      confidence: result.confidence,
      riskFlags: result.riskFlags,
      handoffNeeded: result.handoffNeeded,
      handoffReason: result.handoffReason || null,
      matchedSources: compactSources(result.matchedEntries),
      suggestedFollowUps: result.suggestedFollowUps,
      disclaimer: disclaimerFor(result),
      requestContext: {
        persona: typeof persona === "string" ? persona : "",
        memoryTheme: typeof memoryTheme === "string" ? memoryTheme : "",
        empathyState: typeof empathyState === "string" ? empathyState : "",
      },
    },
  };
};

export default handleMiraChatRequest;
