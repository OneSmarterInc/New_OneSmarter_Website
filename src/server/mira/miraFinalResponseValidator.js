import { knownMiraOfferingEntities } from "./miraConversationReferences.js";
import {
  capabilityNamesAnswerForEntities,
  capabilitySummaryAnswerForEntities,
} from "./miraListingIntents.js";

const TRAILING_FOLLOW_UP =
  /\n+(?:would|do|can|could|what|which|how)\b[^\n?]*\?\s*$/i;
const STALE_COMPARISON =
  /\bwhich (?:platforms?|services?|offerings?) would you like me to compare\b|\bkey difference\b/i;
const SAFETY_RESPONSE_STATUSES = new Set(["safety_response"]);
const OVERVIEW_CONTACT_GUIDANCE =
  /(?:^|\s+)(?:Important (?:context|note):\s*)?(?:For [^\n.]*?(?:questions?|inquiries?|review|guidance|next steps)[^\n.]*?[,;:]?\s*)?(?:please\s+)?(?:email|contact)\s+care@onesmarter\.com\.?\s*/gi;

const normalized = (value = "") =>
  String(value).toLowerCase().replace(/\s+/g, " ").trim();

const questionCount = (answer = "") => (String(answer).match(/\?/g) || []).length;

const sentenceCount = (answer = "") =>
  String(answer)
    .replace(/^[-*]\s+/gm, "")
    .split(/(?<=[.!?])(?:\s+|$)/)
    .filter((sentence) => sentence.trim()).length;

const canonicalNames = (result = {}) =>
  (result.resolvedConversationEntities || [])
    .map((entity) => entity?.label)
    .filter(Boolean);

const fallbackAnswerFor = (result = {}) =>
  String(result.validationFallbackAnswer || result.answerSeed || "").trim();

const correctionResult = (result, answerSeed, issues, action) => ({
  ...result,
  answerSeed,
  ...(action === "trim"
    ? {
        suggestedFollowUps: [],
        answerStructureFollowUpQuestion: "",
      }
    : {}),
  finalResponseValidation: {
    valid: false,
    issues,
    action,
  },
});

const isSafetyResponse = (result = {}) =>
  result.responseMode?.mode === "safety" ||
  SAFETY_RESPONSE_STATUSES.has(result.answerCompleteness?.status) ||
  Boolean(result.riskFlags?.length && result.handoffNeeded);

const selectedLabels = (result = {}) => {
  const comparisonLabels = (result.comparison?.options || [])
    .map((option) => option?.label)
    .filter(Boolean);
  const recommendationLabels = [
    result.recommendation?.primaryOption?.label,
    ...(result.recommendation?.alternatives || []).map(
      (option) => option?.label,
    ),
  ].filter(Boolean);
  return [
    ...new Set([
      ...canonicalNames(result),
      ...comparisonLabels,
      ...recommendationLabels,
    ]),
  ];
};

const missingLabels = (answer, labels = []) => {
  const normalizedAnswer = normalized(answer);
  return labels.filter((label) => !normalizedAnswer.includes(normalized(label)));
};

const categoryScopedCorrection = (result, answer, scope) => {
  if (!["platform", "service"].includes(scope)) return null;
  const selectedEntities = (result.resolvedConversationEntities || []).filter(
    (entity) => entity?.type === scope,
  );
  const wrongTypeEntities = knownMiraOfferingEntities().filter(
    (entity) => entity.type !== scope,
  );
  const answerContainsWrongType = wrongTypeEntities.some((entity) =>
    normalized(answer).includes(normalized(entity.label)),
  );
  const selectedSetContainsWrongType = (result.resolvedConversationEntities || [])
    .some((entity) => entity?.type !== scope);
  if (!answerContainsWrongType && !selectedSetContainsWrongType) return null;

  const cleanFallback = String(result.validationFallbackAnswer || "").trim();
  const fallbackContainsWrongType = wrongTypeEntities.some((entity) =>
    normalized(cleanFallback).includes(normalized(entity.label)),
  );
  const correctedAnswer =
    result.responseMode?.answerShape === "capability_summary"
      ? capabilitySummaryAnswerForEntities(selectedEntities)
      : cleanFallback && !fallbackContainsWrongType
      ? cleanFallback
      : selectedEntities
          .map((entity) =>
            entity.approvedSummary
              ? `${entity.label}: ${entity.approvedSummary}`
              : entity.label,
          )
          .join("\n\n");
  const allowedSourceIds = new Set(
    selectedEntities.flatMap((entity) => entity.sourceIds || []),
  );

  return {
    ...correctionResult(
      result,
      correctedAnswer,
      [`${scope}_scope_invalid_entity_removed`],
      "trim",
    ),
    matchedEntries: (result.matchedEntries || []).filter((entry) =>
      allowedSourceIds.has(entry.id),
    ),
    resolvedConversationEntities: selectedEntities,
  };
};

export const validateMiraFinalResponse = (result = {}) => {
  const answer = String(result.answerSeed || "").trim();
  const mode = result.responseMode?.mode || "";

  if (isSafetyResponse(result)) {
    return {
      ...result,
      finalResponseValidation: {
        valid: true,
        issues: [],
        action: "keep",
      },
    };
  }

  if (mode === "acknowledgement") {
    const invalid =
      answer.length > 80 ||
      questionCount(answer) > 0 ||
      Boolean(result.comparison || result.recommendation) ||
      Boolean(result.matchedEntries?.length);
    if (invalid) {
      return correctionResult(
        result,
        fallbackAnswerFor(result) || "Sure.",
        ["acknowledgement_shape_mismatch"],
        "fallback",
      );
    }
  }

  if (mode === "names_only") {
    const names = canonicalNames(result);
    const namesOnlyAnswer =
      result.responseMode?.answerShape === "capability_names_only"
        ? capabilityNamesAnswerForEntities(
            result.resolvedConversationEntities || [],
          )
        : names.join("\n");
    const hasNonNamePresentation =
      Boolean(result.answerStructureKind) ||
      Boolean(result.comparison) ||
      Boolean(result.recommendation) ||
      Boolean(result.handoffNeeded) ||
      Boolean(result.suggestedFollowUps?.length);
    if (
      names.length &&
      (answer !== namesOnlyAnswer || hasNonNamePresentation)
    ) {
      return {
        ...correctionResult(
          result,
          namesOnlyAnswer,
          ["names_only_content_trimmed"],
          "trim",
        ),
        comparison: undefined,
        recommendation: undefined,
        answerStructureKind: "",
        handoffNeeded: false,
        handoffReason: "",
      };
    }
  }

  const scopedCorrection = categoryScopedCorrection(
    result,
    answer,
    result.responseMode?.entityCategoryScope,
  );
  if (scopedCorrection) return scopedCorrection;

  if (
    result.responseMode?.answerShape === "capability_summary" &&
    !result.comparison &&
    !result.recommendation &&
    !result.compoundRequestHandled
  ) {
    const capabilitySummary = capabilitySummaryAnswerForEntities(
      result.resolvedConversationEntities || [],
    );
    const hasDetailedPresentation =
      Boolean(result.answerStructureKind) ||
      /^(?:#{1,6}\s+|[-*]\s+|\d+[.)]\s+)/m.test(answer) ||
      /\b(?:Important context|Important note):/i.test(answer) ||
      /care@onesmarter\.com/i.test(answer);
    if (
      capabilitySummary &&
      (answer !== capabilitySummary || hasDetailedPresentation)
    ) {
      return {
        ...correctionResult(
          result,
          capabilitySummary,
          ["capability_summary_shape_corrected"],
          "trim",
        ),
        answerStructureKind: "",
        handoffNeeded: false,
        handoffReason: "",
      };
    }
  }

  if (mode === "overview" && STALE_COMPARISON.test(answer)) {
    return correctionResult(
      result,
      fallbackAnswerFor(result),
      ["overview_contains_stale_comparison"],
      "fallback",
    );
  }

  const overviewAnswer =
    mode === "overview" && !result.handoffNeeded
      ? answer
      .replace(OVERVIEW_CONTACT_GUIDANCE, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      : answer;

  if (
    mode === "overview" &&
    result.responseMode?.answerShape === "brief" &&
    (sentenceCount(overviewAnswer) > 3 ||
      /^(?:#{1,6}\s+|[-*]\s+)/m.test(overviewAnswer) ||
      /Important (?:context|note):/i.test(overviewAnswer))
  ) {
    return correctionResult(
      result,
      fallbackAnswerFor(result),
      ["brief_overview_shape_mismatch"],
      "fallback",
    );
  }

  if (overviewAnswer !== answer) {
    return correctionResult(
      result,
      overviewAnswer || fallbackAnswerFor(result),
      ["unnecessary_overview_handoff_removed"],
      "trim",
    );
  }

  if (mode === "comparison" && result.comparison?.status === "complete") {
    const labels = (result.comparison.options || [])
      .map((option) => option?.label)
      .filter(Boolean);
    if (missingLabels(answer, labels).length) {
      return correctionResult(
        result,
        fallbackAnswerFor(result),
        ["comparison_missing_selected_entity"],
        "fallback",
      );
    }
  }

  if (
    mode === "recommendation" &&
    result.recommendation?.status === "recommended"
  ) {
    const primaryLabel = result.recommendation.primaryOption?.label;
    if (primaryLabel && missingLabels(answer, [primaryLabel]).length) {
      return correctionResult(
        result,
        fallbackAnswerFor(result),
        ["recommendation_missing_primary_option"],
        "fallback",
      );
    }
  }

  const excludedLabels = (result.evidenceSelection?.excluded || [])
    .map((entity) => entity?.label)
    .filter(Boolean);
  const primaryLabels = selectedLabels(result);
  if (
    result.answerCompleteness?.status === "needs_refinement" &&
    result.decisionState?.nextBestQuestion &&
    !normalized(answer).includes(
      normalized(result.decisionState.nextBestQuestion),
    )
  ) {
    return correctionResult(
      result,
      fallbackAnswerFor(result),
      ["decision_critical_question_restored"],
      "fallback",
    );
  }
  if (
    !["comparison", "recommendation"].includes(mode) &&
    (primaryLabels.length === 1 || mode === "detailed_explanation") &&
    excludedLabels.some((label) => normalized(answer).includes(normalized(label)))
  ) {
    return correctionResult(
      result,
      fallbackAnswerFor(result),
      ["excluded_entity_in_answer"],
      "fallback",
    );
  }

  if (
    result.answerCompleteness?.status === "complete" &&
    TRAILING_FOLLOW_UP.test(answer)
  ) {
    return correctionResult(
      result,
      answer.replace(TRAILING_FOLLOW_UP, "").trim(),
      ["unnecessary_follow_up_removed"],
      "trim",
    );
  }

  if (
    ["needs_clarification", "needs_refinement"].includes(
      result.answerCompleteness?.status,
    ) &&
    questionCount(answer) > 1
  ) {
    const firstQuestionEnd = answer.indexOf("?") + 1;
    return correctionResult(
      result,
      answer.slice(0, firstQuestionEnd).trim(),
      ["multiple_clarification_questions_trimmed"],
      "trim",
    );
  }

  return {
    ...result,
    finalResponseValidation: {
      valid: true,
      issues: [],
      action: "keep",
    },
  };
};

export default validateMiraFinalResponse;
