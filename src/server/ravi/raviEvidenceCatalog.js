import { raviApprovedKnowledge } from "../../data/agentKnowledge/raviApprovedKnowledge.js";

// Whole approved statements only. Prohibited claims and visitor text never
// enter this catalog. IDs bind citations to server-owned text, not model prose.
export const raviEvidenceCatalog = () => raviApprovedKnowledge.flatMap(entry => [
  { id: `${entry.id}:summary`, entryId: entry.id, text: entry.approvedSummary },
  ...entry.sourceFacts.map((text, index) => ({ id: `${entry.id}:fact:${index}`, entryId: entry.id, text })),
  ...entry.allowedClaims.map((text, index) => ({ id: `${entry.id}:claim:${index}`, entryId: entry.id, text })),
]);

export const resolveRaviEvidenceIds = ids => {
  if (!Array.isArray(ids) || !ids.length || ids.length > 6 || new Set(ids).size !== ids.length) return null;
  const catalog = new Map(raviEvidenceCatalog().map(unit => [unit.id, unit]));
  const units = ids.map(id => catalog.get(id));
  return units.every(Boolean) ? units : null;
};
