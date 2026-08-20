const sourceForEntity = (entity, matchedEntries) =>
  matchedEntries.find((entry) => entity.sourceIds?.includes(entry.id));

const childStructure = (entity, matchedEntries) => {
  const source = sourceForEntity(entity, matchedEntries);
  return {
    id: entity.id,
    heading: entity.label,
    entityType: entity.type,
    ...(entity.approvedSummary
      ? {
          summary: entity.approvedSummary,
          bullets: (entity.sourceFacts || []).slice(0, 4),
        }
      : source?.id === entity.id
      ? {
          summary: source.approvedSummary,
          bullets: (source.sourceFacts || []).slice(0, 4),
        }
      : { summary: "", bullets: [] }),
    children: (entity.children || []).map((child) =>
      childStructure(child, matchedEntries),
    ),
  };
};

export const buildMiraAnswerStructure = ({
  result,
  conversationEntities = [],
} = {}) => {
  if (!result?.answerStructureKind || !conversationEntities.length) return null;

  const sections = conversationEntities.map((entity, index) => ({
    ...childStructure(entity, result.matchedEntries || []),
    number: index + 1,
  }));
  const defaultIntroduction =
    result.answerStructureKind === "comparison"
      ? "Here is a grounded comparison of the selected OneSmarter offerings."
      : result.answerStructureKind === "recommendation"
        ? "These grounded OneSmarter options match the requirements provided."
        : "Here are the relevant OneSmarter offerings.";

  return {
    kind: result.answerStructureKind,
    introduction: result.answerStructureIntroduction || defaultIntroduction,
    sections,
    importantNote: result.answerStructureImportantNote || "",
    followUpQuestion:
      result.answerCompleteness?.allowFollowUpQuestion === true
        ? result.answerStructureFollowUpQuestion || result.answerSeed || ""
        : "",
  };
};

export default buildMiraAnswerStructure;
