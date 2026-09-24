import { runRaviLocalEngine } from "../src/server/ravi/raviLocalEngine.js";
import { raviApprovedKnowledge } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";

// Deterministic provider fixture for existing contract tests; never imported by production.
export const raviEvidenceFixture = async ({ input }) => {
  const local = runRaviLocalEngine({ message: input.message, conversationHistory: input.conversationHistory, semanticIntent: input.semanticIntent });
  const candidate = input.candidate;
  const entries = input.allowed ? (local.matchedEntries.length ? local.matchedEntries : raviApprovedKnowledge) : [];
  if (input.allowed && (candidate || local.claimEvaluation?.ruleId === "no-real-system-actions") && !entries.some(({ id }) => id === "ravi-professional-role")) {
    entries.push(raviApprovedKnowledge.find(({ id }) => id === "ravi-professional-role"));
  }
  return { intent: {
    answer: input.allowed ? candidate?.answer || local.answer : `I do not have approved Ravi operations evidence for this ${input.semanticIntent.domain} ${input.semanticIntent.questionType} request. Which approved operations topic would you like to review?`,
    handoffNeeded: candidate?.handoffNeeded ?? local.clarificationNeeded,
    handoffReason: candidate?.handoffReason || null,
    suggestedFollowUps: candidate?.suggestedFollowUps || [],
    groundingStatus: candidate?.groundingStatus || (local.clarificationNeeded ? "insufficient_context" : "grounded"),
    outputSafetyStatus: "passed",
    citations: entries.map((entry) => ({ entryId: entry.id, quote: entry.sourceFacts[0] })),
  } };
};
