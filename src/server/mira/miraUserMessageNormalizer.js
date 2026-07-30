const PROTECTED_TERM =
  /https?:\/\/\S+|www\.\S+|[^\s@]+@[^\s@]+\.[^\s@]+|\bIBM\s+i\b|\bAS\s*400\b|\bHIPAA\b|\bSOC\s*2\b|\bPCI\s*DSS\b|\b[A-Za-z]+-\d[\w-]*\b/gi;

const TOKEN_ALIASES = new Map([
  ["platfporm", "platform"],
  ["platfporms", "platforms"],
  ["platfrom", "platform"],
  ["platfroms", "platforms"],
  ["servies", "services"],
  ["serivces", "services"],
  ["comapre", "compare"],
  ["compar", "compare"],
  ["ther", "their"],
  ["okayy", "okay"],
  ["jst", "just"],
  ["agnts", "agents"],
  ["wht", "what"],
  ["helthcare", "healthcare"],
  ["moderniztion", "modernization"],
  ["abot", "about"],
  ["tickting", "ticketing"],
]);

const INTERPRETATION_VOCABULARY = [
  "about",
  "acknowledge",
  "agents",
  "all",
  "audit",
  "bill",
  "claims",
  "compare",
  "comparison",
  "detailed",
  "explain",
  "healthcare",
  "instead",
  "integration",
  "just",
  "modernization",
  "names",
  "offer",
  "offering",
  "offers",
  "okay",
  "onesmarter",
  "platform",
  "platforms",
  "recommend",
  "secure",
  "service",
  "services",
  "tell",
  "ticketing",
  "what",
  "which",
];

const isAdjacentTransposition = (left, right) => {
  if (left.length !== right.length) return false;
  const differences = [];
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) differences.push(index);
  }
  return (
    differences.length === 2 &&
    differences[1] === differences[0] + 1 &&
    left[differences[0]] === right[differences[1]] &&
    left[differences[1]] === right[differences[0]]
  );
};

const conservativeCorrection = (token = "") => {
  const lower = token.toLowerCase();
  if (TOKEN_ALIASES.has(lower)) return TOKEN_ALIASES.get(lower);
  if (!/^[a-z]{3,18}$/.test(lower)) return token;

  const duplicateLetterCandidates = [];
  for (let index = 1; index < lower.length; index += 1) {
    if (lower[index] === lower[index - 1]) {
      duplicateLetterCandidates.push(
        `${lower.slice(0, index)}${lower.slice(index + 1)}`,
      );
    }
  }
  const recognizedDuplicate = duplicateLetterCandidates.find((candidate) =>
    INTERPRETATION_VOCABULARY.includes(candidate),
  );
  if (recognizedDuplicate) {
    return recognizedDuplicate;
  }

  const candidates = INTERPRETATION_VOCABULARY.filter(
    (candidate) =>
      candidate.length === lower.length &&
      isAdjacentTransposition(lower, candidate),
  );
  return candidates.length === 1 ? candidates[0] : token;
};

const protectTerms = (message = "") => {
  const protectedTerms = [];
  const text = String(message).replace(PROTECTED_TERM, (term) => {
    const placeholder = `ZXQPROTECTED${protectedTerms.length}QXZ`;
    protectedTerms.push(term);
    return placeholder;
  });
  return { text, protectedTerms };
};

const restoreTerms = (message, protectedTerms) =>
  protectedTerms.reduce(
    (text, term, index) =>
      text.replace(`ZXQPROTECTED${index}QXZ`, term),
    message,
  );

export const normalizeMiraUserMessage = (message = "") => {
  const originalMessage = String(message);
  const { text, protectedTerms } = protectTerms(originalMessage);
  const normalizedMessage = restoreTerms(
    text
      .replace(/([?!.,])\1+/g, "$1")
      .replace(/\b([a-z]+)(?:\s+\1\b)+/gi, "$1")
      .replace(/\s+/g, " ")
      .trim()
      .split(/(\s+)/)
      .map((token) =>
        /^\s+$/.test(token) || /^ZXQPROTECTED\d+QXZ$/.test(token)
          ? token
          : conservativeCorrection(token),
      )
      .join("")
      .replace(/\bther\s+names?\b/gi, (phrase) =>
        phrase.replace(/^ther/i, "their"),
      ),
    protectedTerms,
  );

  return {
    originalMessage,
    normalizedMessage,
    normalizationApplied: normalizedMessage !== originalMessage.trim(),
    method: "deterministic_conservative",
  };
};

export default normalizeMiraUserMessage;
