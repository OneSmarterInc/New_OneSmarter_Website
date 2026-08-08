const PRIOR_REFERENCE =
  /\b(?:it|that|those|them|each one|both|their capabilities|these (?:platforms|services|offerings|options)|the above (?:two|platforms|services|offerings|options)|the (?:first|second|third|fourth|last) one|the previous option|previous option|what about|tell me more|which (?:one|of those)|under that service|same (?:one|option|service|platform)|(?:explain|describe|tell me about) (?:the )?(?:first|second|third|fourth|last)(?: one| option| platform| service| offering| item)?)\b/i;
const PRIOR_COMPARISON =
  /\b(?:compare (?:them|those|the two|first and (?:the )?(?:second|last)|(?:the )?(?:first|second|third|fourth) (?:one|option|platform|service|offering)?\s+(?:with|to|versus|vs\.?)\s+[^.!?]+)|first (?:one|option|platform)? (?:versus|vs\.?|and|compared with) (?:the )?(?:second|last)|which (?:one|of those) is better|difference between them|how is (?:the )?first .+ different from (?:the )?(?:second|last))\b/i;
const EXPLICIT_REFINEMENT =
  /^\s*(?:we\s+)?(?:also|additionally|in addition|as well)\b|\b(?:specifically|in particular|more precisely|for that|within that)\b/i;
const EXPLICIT_FOLLOW_UP =
  /^\s*(?:and\s+)?(?:why|how|when|where)\s+(?:does|do|is|are|would|should)\s+(?:it|that|this|they)\b/i;
const REORGANIZE_PREVIOUS =
  /\b(?:bifurcate|separate|categorize|organize|group)\b.*\b(?:services?|platforms?|by type|the above|them)\b/i;
const CONTEXTUAL_RECOMMENDATION =
  /\b(?:what (?:would|do) you recommend|what should (?:we|i) choose|which option fits (?:us|me) best)\b/i;

export const isMiraContextualComparisonFollowUp = (message = "") =>
  (/\b(?:another|different|something else|new option)\b/i.test(message) &&
    /\b(?:compare|choose|pick|select|use|try|option|one|service|platform|offering)\b/i.test(
      message,
    )) ||
  /\bcompare it (?:with|to)\b/i.test(message);

export const classifyMiraTurnContext = (
  message = "",
  conversationHistory = [],
  responseMode = "",
) => {
  const hasHistory = conversationHistory.length > 0;
  let relationToConversation = "standalone_new_request";

  if (
    ["overview", "acknowledgement"].includes(responseMode)
  ) {
    relationToConversation = "standalone_new_request";
  } else if (hasHistory && responseMode === "names_only") {
    relationToConversation = "reference_to_prior_turn";
  } else if (hasHistory && CONTEXTUAL_RECOMMENDATION.test(message)) {
    relationToConversation = "refinement";
  } else if (
    hasHistory &&
    (PRIOR_COMPARISON.test(message) ||
      isMiraContextualComparisonFollowUp(message))
  ) {
    relationToConversation = "comparison_with_prior_options";
  } else if (hasHistory && PRIOR_REFERENCE.test(message)) {
    relationToConversation = "reference_to_prior_turn";
  } else if (hasHistory && EXPLICIT_REFINEMENT.test(message)) {
    relationToConversation = "refinement";
  } else if (hasHistory && REORGANIZE_PREVIOUS.test(message)) {
    relationToConversation = "reference_to_prior_turn";
  } else if (hasHistory && EXPLICIT_FOLLOW_UP.test(message)) {
    relationToConversation = "explicit_follow_up";
  } else if (
    hasHistory &&
    /\b(?:services?|items?)\s+(?:are\s+)?under\s+(?:technology solutions|that service)\b/i.test(
      message,
    )
  ) {
    relationToConversation = "reference_to_prior_turn";
  }

  return {
    relationToConversation,
    usesHistory: relationToConversation !== "standalone_new_request",
  };
};

export const currentTurnAnswerabilityFor = (result = {}) => {
  if (result.riskFlags?.length) return "safety";
  if (result.clarificationNeeded) return "needs_clarification";
  if (
    result.unsupportedHandled ||
    (!result.matchedEntries?.length && result.confidence === "low")
  ) {
    return "unsupported";
  }
  return "answerable";
};

export default classifyMiraTurnContext;
