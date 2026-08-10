const splitParagraphs = (text) =>
  String(text || "")
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const INTERNAL_PRESENTATION_LABEL =
  "(?:Grounding status|Output safety status|Safety status|Validation status|Confidence|Evidence score|Evidence confidence|Matched sources|Risk flags|HandoffNeeded|Handoff needed|Response mode|Intent|Business goals?|Decision state|Premise status|Premise check|premiseCheck|Internal notes?|Debug info|Provider mode|Provider metadata|Retrieval status|Answerability status|matchedEntries|decisionState|recommendationStatus|responseMode|riskFlags)";
const INTERNAL_PRESENTATION_LINE = new RegExp(
  `^(?:[-*\\u2022]\\s*)?${INTERNAL_PRESENTATION_LABEL}\\s*:`,
  "i",
);
const INTERNAL_JSON_KEY =
  /"(?:groundingStatus|outputSafetyStatus|validationStatus|confidence|evidenceScore|matchedSources|riskFlags|handoffNeeded|responseMode|businessGoals|decisionState|premiseCheck|providerMetadata|retrievalStatus|answerabilityStatus)"\s*:/i;
const INTERNAL_GOVERNANCE_SENTENCE =
  /(^|[.!?]\s+)(?:Do not describe|Keep this wording|Claim boundary|Internal note|Approved wording only|Do not change|Implementation rule|Trust wording instruction)\b[^.!?]*(?:[.!?]|$)/gi;

export const sanitizeMiraVisitorAnswer = (text = "") => {
  const lines = String(text)
    .replace(INTERNAL_GOVERNANCE_SENTENCE, "$1")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const kept = [];
  let jsonBuffer = [];
  let jsonDepth = 0;

  const flushJson = () => {
    const block = jsonBuffer.join("\n");
    if (block && !INTERNAL_JSON_KEY.test(block)) kept.push(...jsonBuffer);
    jsonBuffer = [];
    jsonDepth = 0;
  };

  for (const line of lines) {
    if (jsonBuffer.length || ["[", "{"].includes(line.trim())) {
      jsonBuffer.push(line);
      jsonDepth += [...line].filter((character) => "[{".includes(character)).length;
      jsonDepth -= [...line].filter((character) => "]}".includes(character)).length;
      if (jsonDepth <= 0) flushJson();
      continue;
    }
    if (
      !INTERNAL_PRESENTATION_LINE.test(line.trim()) &&
      !INTERNAL_JSON_KEY.test(line)
    ) {
      kept.push(line);
    }
  }
  if (jsonBuffer.length) flushJson();

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

const normalizedLineKey = (line = "") =>
  String(line)
    .toLowerCase()
    .replace(/^[-*\u2022]\s+/, "")
    .replace(/[^a-z0-9@.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeMiraAnswerPresentation = (
  text = "",
  { suppressHandoff = false, suppressInternal = true } = {},
) => {
  const seen = new Set();
  const prepared = (suppressInternal
    ? sanitizeMiraVisitorAnswer(text).replace(/\s*Related approved topics:[^.]*\.?/gi, "")
    : String(text))
    .replace(
      /The page uses supporting language such as built for HIPAA-regulated workflows and designed for PHI-sensitive workflows\.?/gi,
      "It is built for HIPAA-regulated workflows and designed for PHI-sensitive workflows.",
    );
  const withoutHandoff = suppressHandoff
    ? prepared
        .replace(/\s*Route [^.\n]*care@onesmarter\.com\.?/gi, "")
        .replace(
          /\s*For (?:more information|ordinary questions|general questions),? (?:please )?(?:email|contact) care@onesmarter\.com\.?/gi,
          "",
        )
    : prepared;
  return withoutHandoff
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (
        !line ||
        (suppressInternal && INTERNAL_PRESENTATION_LINE.test(line))
      ) {
        return false;
      }
      return !/^(?:Important context|Separate facts and next steps|Approved facts?)\s*:?$/i.test(
        line,
      );
    })
    .map((line) => {
      let normalizedLine = line
        .replace(/^Bullets\s*:?$/i, "Key capabilities:")
        .replace(/^Important note\s*:?$/i, "Important limitation:")
        .replace(/^Approved facts?\s+vs\.?\s+next steps\s*:?$/i, "Next step:")
        .replace(/^Next steps\s*:?$/i, "Next step:");
      const labeled = normalizedLine.match(/^([^:]{3,80}):\s+(.+)$/);
      if (
        labeled &&
        labeled[2].toLowerCase().startsWith(labeled[1].toLowerCase())
      ) {
        normalizedLine = labeled[2];
      }
      return normalizedLine;
    })
    .filter((line) => {
      const key = normalizedLineKey(line);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const formatMiraAnswerBlocks = (text) => {
  const lines = normalizeMiraAnswerPresentation(text)
    .replace(/\r\n/g, "\n")
    .replace(/\s+-\s+(?=[A-Z0-9])/g, "\n- ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let bullets = [];
  let section = null;
  let note = null;

  const flushBullets = () => {
    if (bullets.length) blocks.push({ type: "list", items: bullets });
    bullets = [];
  };
  const flushSection = () => {
    if (section) blocks.push(section);
    section = null;
  };

  for (const line of lines) {
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      flushBullets();
      flushSection();
      section = {
        type: "entity-section",
        number: Number(numbered[1]),
        heading: numbered[2].trim(),
        items: [],
      };
      note = null;
      continue;
    }

    const importantNote = line.match(/^Important note:\s*(.*)$/i);
    if (importantNote) {
      flushBullets();
      flushSection();
      note = {
        type: "important-note",
        heading: "Important note",
        text: importantNote[1].trim(),
        items: [],
      };
      blocks.push(note);
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      const item = bullet[1].trim();
      if (section) section.items.push(item);
      else if (note) note.items.push(item);
      else bullets.push(item);
      continue;
    }

    if (note && !note.text) {
      note.text = line;
      continue;
    }

    const detail = line.match(/^(.+?):\s+(.+)$/);
    if (detail) {
      const detailHeading = detail[1].trim().toLowerCase();
      const matchingSection = [...blocks]
        .reverse()
        .find(
          (block) =>
            block.type === "entity-section" &&
            block.heading
              .replace(/\s+\([^)]+\)$/, "")
              .trim()
              .toLowerCase() === detailHeading,
        );
      if (matchingSection) {
        matchingSection.items.push(...splitParagraphs(detail[2]));
        continue;
      }
    }

    flushBullets();
    flushSection();
    note = null;
    if (/^[A-Z][A-Za-z0-9 &/,-]{2,48}:$/.test(line)) {
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
      continue;
    }
    const paragraphs = splitParagraphs(line);
    if (paragraphs.length > 1 && line.length > 220) {
      blocks.push(
        ...paragraphs.map((paragraph) => ({
          type: "paragraph",
          text: paragraph,
        })),
      );
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }

  flushBullets();
  flushSection();
  return blocks.length ? blocks : [{ type: "paragraph", text }];
};

export default formatMiraAnswerBlocks;
