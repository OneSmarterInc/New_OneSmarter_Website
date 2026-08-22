const PRIORITIES = new Set(["high", "medium", "low"]);
const INTERNAL_LEAK = /\b(?:system prompt|developer message|internal instructions?|runtime metadata|retrieval result|matched sources?|api key|secret|cafe persona|generation notes)\b/i;
const UNSUPPORTED_ACTIVITY = /\b(?:I|Theo|we) (?:fetched|crawled|browsed|visited|opened|scanned the live|checked the live)\b/i;
const GUARDED_FACT_TERMS = [
  "certified", "certification", "soc 2", "hipaa", "customers", "customer count",
  "pricing", "price", "built with", "uses react", "uses wordpress", "market leader",
];
const normalize = (value = "") => String(value).toLowerCase().replace(/\s+/g, " ").trim();
const nonEmpty = (value) => typeof value === "string" && Boolean(value.trim());

const validFinding = (item) => item && nonEmpty(item.area) && nonEmpty(item.issue)
  && nonEmpty(item.evidence) && PRIORITIES.has(item.priority);
const validRecommendation = (item) => item && nonEmpty(item.action) && nonEmpty(item.reason)
  && PRIORITIES.has(item.priority);

export const validateTheoModelOutput = (output, { websiteContent = "", fallbackAnalysis } = {}) => {
  const violations = [];
  if (!output || typeof output !== "object" || Array.isArray(output)) violations.push("invalid_shape");
  if (!nonEmpty(output?.overallAssessment)) violations.push("missing_overall_assessment");
  if (!Array.isArray(output?.strengths) || output.strengths.some((item) => !nonEmpty(item))) violations.push("invalid_strengths");
  if (!Array.isArray(output?.findings) || output.findings.some((item) => !validFinding(item))) violations.push("invalid_findings");
  if (!Array.isArray(output?.recommendations) || output.recommendations.some((item) => !validRecommendation(item))) violations.push("invalid_recommendations");
  if (typeof output?.clarificationNeeded !== "boolean") violations.push("invalid_clarification_state");
  if (output?.clarificationNeeded && !nonEmpty(output?.clarificationQuestion)) violations.push("missing_clarification_question");
  if (!output?.clarificationNeeded && output?.clarificationQuestion !== null) violations.push("unexpected_clarification_question");

  const visitorText = JSON.stringify(output || {});
  if (INTERNAL_LEAK.test(visitorText)) violations.push("internal_instruction_leak");
  if (UNSUPPORTED_ACTIVITY.test(visitorText)) violations.push("unsupported_external_activity");

  const evidenceText = normalize(websiteContent);
  const normalizedVisitorText = normalize(visitorText);
  if (GUARDED_FACT_TERMS.some((term) => normalizedVisitorText.includes(term) && !evidenceText.includes(term))) {
    violations.push("unsupported_factual_inference");
  }
  for (const item of output?.findings || []) {
    const evidence = normalize(item.evidence);
    const absenceObservation = /\b(?:not supplied|no .* supplied|word|words)\b/i.test(item.evidence);
    if (evidence && !absenceObservation && !evidenceText.includes(evidence)) {
      violations.push("finding_evidence_not_supplied");
      break;
    }
  }

  if (violations.length) return { valid: false, violations: [...new Set(violations)], fallbackAnalysis };
  return {
    valid: true,
    violations: [],
    correctedOutput: {
      ...output,
      overallAssessment: output.overallAssessment.trim(),
      strengths: output.strengths.map((item) => item.trim()).slice(0, 6),
      findings: output.findings.slice(0, 8),
      recommendations: output.recommendations.slice(0, 8),
      evidenceStatus: "supplied_content_only",
    },
  };
};

export default validateTheoModelOutput;
