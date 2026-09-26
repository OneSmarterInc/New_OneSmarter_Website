const words = new Intl.Segmenter("en", { granularity: "word" });
const singleWord = value => typeof value === "string" && [...words.segment(value)]
  .filter(part => part.isWordLike).length === 1 &&
  [...words.segment(value)].every(part => part.isWordLike);

// An evidence reviewer may classify the *existing* candidate's prose, not
// self-certify a newly written answer. Only casing changes for grounding;
// every word, factual assertion and live-action safety check is retained.
export const raviEntityGroundingView = ({ answer, reviewedCandidate, entityReview,
  matchedEntries, visitorSuppliedEntities = [] }) => {
  if (!entityReview || entityReview.answer !== reviewedCandidate?.answer ||
      entityReview.answer !== answer) return { answer, valid: true };
  if (!Array.isArray(entityReview.ordinaryProse) || !Array.isArray(entityReview.entities)) {
    return { answer, valid: false };
  }
  const named = [...visitorSuppliedEntities];
  for (const entity of entityReview.entities) {
    if (!entity || typeof entity !== "object") return { answer, valid: false };
    const source = matchedEntries.find(entry => entry.id === entity.entryId);
    if (!source || typeof entity.text !== "string" || !entity.text.trim() ||
        !answer.includes(entity.text) || typeof entity.quote !== "string" ||
        ![source.approvedSummary, ...source.sourceFacts, ...source.allowedClaims].includes(entity.quote) ||
        !entity.quote.toLowerCase().includes(entity.text.toLowerCase())) return { answer, valid: false };
    named.push(entity.text);
  }
  const prose = new Set(entityReview.ordinaryProse);
  for (const term of prose) {
    if (!singleWord(term) || !answer.includes(term) || named.some(entity =>
      typeof entity === "string" && [...words.segment(entity)].some(part =>
        part.isWordLike && part.segment.toLowerCase() === term.toLowerCase()))) {
      return { answer, valid: false };
    }
  }
  return { valid: true, answer: [...words.segment(answer)].map(part =>
    part.isWordLike && prose.has(part.segment) ? part.segment.toLowerCase() : part.segment).join("") };
};
