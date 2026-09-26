// Accept only complete, verbatim approved definitions, never lexical overlap.
// Corporate prose remains subject to the ordinary claim and grounding checks.
export const isApprovedTerminologyComposition = (answer, entries) => {
  const facts = entries.filter(entry => entry.sourceReference?.type === "authoritative-terminology")
    .flatMap(entry => entry.sourceFacts || []).filter(fact => typeof fact === "string" && fact.trim())
    .map(fact => fact.trim()).sort((left, right) => right.length - left.length);
  let remaining = answer.trim();
  if (!remaining) return false;
  while (remaining) {
    const fact = facts.find(candidate => remaining.startsWith(candidate) &&
      (remaining.length === candidate.length || remaining[candidate.length].trim() === ""));
    if (!fact) return false;
    remaining = remaining.slice(fact.length).trimStart();
  }
  return true;
};

// Separate complete approved definition sentences from remaining assertions.
// A definition's negation must not excuse a different corporate claim.
export const elenaNonTerminologyAssertions = (answer, entries) => {
  let remaining = answer;
  for (const fact of entries.filter(entry => entry.sourceReference?.type === "authoritative-terminology")
    .flatMap(entry => entry.sourceFacts || []).filter(Boolean)) {
    let offset = 0;
    while (offset < remaining.length) {
      const start = remaining.indexOf(fact, offset);
      if (start < 0) break;
      const end = start + fact.length;
      if ((start === 0 || remaining[start - 1].trim() === "") &&
          (end === remaining.length || remaining[end].trim() === "")) {
        remaining = remaining.slice(0, start) + remaining.slice(end);
        offset = start;
      } else offset = end;
    }
  }
  return remaining.trim();
};

export const completeElenaEvidenceFallback = (result) => {
  const definitions = result.matchedEntries
    .filter(entry => entry.sourceReference?.type === "authoritative-terminology")
    .flatMap(entry => entry.sourceFacts || []);
  if (!definitions.length || result.clarificationNeeded) return result;
  // Keep the existing polarity/WHY/refusal framing first, then supply definitions.
  return { ...result, answer: [...new Set([result.answer, ...definitions])].join(" ") };
};
