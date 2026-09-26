import { createHash } from "node:crypto";
import { raviEvidenceCatalog } from "./raviEvidenceCatalog.js";
import { verifyAgentAnswerGrounding } from "../agentGrounding/agentGroundingVerifier.js";

// Log identifiers and fingerprints, never excerpts from untrusted text. Even a
// truncated answer or exception can contain a credential or private information.
export const raviTextDiagnostic = value => typeof value === "string" ? {
  length: value.length,
  sha256: createHash("sha256").update(value).digest("hex"),
  representation: "content_redacted",
} : null;

export const emitRaviDiagnostic = (listener, build) => {
  if (typeof listener !== "function") return;
  try {
    const pending = listener(build());
    if (pending && typeof pending.catch === "function") pending.catch(() => {});
  } catch { /* Diagnostics must never alter validation or request handling. */ }
};

export const raviGroundingDiagnostic = ({ grounding, answer, matchedEntries, entityView }) => {
  const assertions = grounding.unsupportedAssertions || [];
  const words = new Intl.Segmenter("en", { granularity: "word" });
  return {
    grounded: grounding.grounded,
    entityReviewValid: entityView.valid,
    entityReviewChangedText: entityView.answer !== answer,
    groundingInput: raviTextDiagnostic(entityView.valid ? entityView.answer : answer),
    assertionCount: grounding.assertionCount,
    unsupportedAssertionCount: assertions.length,
    unsupportedAssertions: assertions.slice(0, 4).map((assertion, assertionIndex) => ({
      assertionIndex,
      ...raviTextDiagnostic(assertion),
      // The shared verifier does not expose exact entity spans. Reuse its
      // existing check on isolated words for bounded diagnostic candidates;
      // never claim these probes are the original extractor's exact results.
      entityProbeMethod: "isolated_word_existing_verifier",
      entityCandidates: [...words.segment(assertion)].filter(part => part.isWordLike).slice(0, 64)
        .filter(part => verifyAgentAnswerGrounding({ answer: `${part.segment}.`, approvedEntries: matchedEntries })
          .violations.includes("unsupported_named_entity"))
        .slice(0, 6).map(part => ({ offset: part.index, ...raviTextDiagnostic(part.segment) })),
    })),
    assertionLimit: 4,
    entityProbeWordLimit: 64,
    entityCandidateLimit: 6,
  };
};

export const raviCitationDiagnostic = citations => {
  if (!Array.isArray(citations)) return { count: 0, shape: "not_array", items: [] };
  const catalog = raviEvidenceCatalog();
  const sources = new Set(catalog.map(unit => unit.entryId));
  return { count: citations.length, shape: "array", limit: 12, items: citations.slice(0, 12).map(citation => {
    const unit = catalog.find(item => item.id === citation?.evidenceId);
    return {
      evidenceId: unit?.id || null,
      sourceId: unit?.entryId || (sources.has(citation?.entryId) ? citation.entryId : null),
      unknownEvidenceId: unit ? null : raviTextDiagnostic(citation?.evidenceId),
      unknownSourceId: sources.has(citation?.entryId) ? null : raviTextDiagnostic(citation?.entryId),
      legacyQuote: raviTextDiagnostic(citation?.quote),
    };
  }) };
};

export const raviEvidenceSelectionDiagnostic = selection => {
  const ids = Array.isArray(selection?.evidenceIds) ? selection.evidenceIds : [];
  return { supplied: Array.isArray(selection?.evidenceIds),
    coverage: ["complete", "partial", "none"].includes(selection?.coverage) ? selection.coverage : null,
    evidence: raviCitationDiagnostic(ids.map(evidenceId => ({ evidenceId }))) };
};
