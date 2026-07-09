import { miraClaimRules } from "../../../src/data/agentKnowledge/miraClaimRules.js";

export const MIRA_MODEL_OUTPUT_SCHEMA = {
  answer: "string",
  handoffNeeded: "boolean",
  handoffReason: "string or null",
  suggestedFollowUps: ["string"],
  groundingStatus: "grounded | insufficient_context | refused",
  outputSafetyStatus: "passed | corrected | refused",
};

export const buildMiraSystemPrompt = ({ claimRules = miraClaimRules } = {}) => {
  const approvedWording = claimRules.approvedPhrases
    .filter((phrase) =>
      [
        "SOC 2 Type II Attested",
        "HIPAA Security Rule Compliance Assessment Completed",
      ].includes(phrase),
    )
    .map((phrase) => `- ${phrase}`)
    .join("\n");

  const prohibitedWording = [
    "HIPAA Certified",
    "HIPAA Certification",
    "SOC 2 Certified",
    "guaranteed compliance",
    "fully compliant",
    "HIPPA",
  ]
    .map((phrase) => `- ${phrase}`)
    .join("\n");

  return [
    "You are Mira Vale, OneSmarter's AI guide.",
    "Answer only from approved OneSmarter content supplied in context.",
    "Do not browse the web.",
    "Do not invent services, certifications, claims, clients, pricing, or legal conclusions.",
    "Do not provide legal advice.",
    "Do not provide medical advice.",
    "Do not guarantee compliance.",
    "Do not ask for or process PHI, confidential documents, credentials, or private operational details.",
    "Route business-specific questions to care@onesmarter.com.",
    "Use claim-boundary wording exactly as approved.",
    "",
    "Approved wording:",
    approvedWording,
    "",
    "Prohibited or unsafe wording:",
    prohibitedWording,
    "",
    "Return a JSON object matching this shape:",
    JSON.stringify(MIRA_MODEL_OUTPUT_SCHEMA, null, 2),
  ].join("\n");
};

export const buildMiraContextBlock = (retrievalResult = {}) => {
  const entries = retrievalResult.matchedEntries || [];

  if (!entries.length) {
    return "Approved context:\nNo approved context was retrieved. Use a safe handoff.";
  }

  const sourceBlocks = entries.map((entry) =>
    [
      `Source id: ${entry.id}`,
      `Title: ${entry.title}`,
      `Route: ${entry.route}`,
      `Approved summary: ${entry.approvedSummary}`,
      "Source facts:",
      ...(entry.sourceFacts || []).map((fact) => `- ${fact}`),
      "Allowed claims:",
      ...(entry.allowedClaims || []).map((claim) => `- ${claim}`),
      `Handoff guidance: ${entry.handoffGuidance}`,
    ].join("\n"),
  );

  return ["Approved context:", ...sourceBlocks].join("\n\n");
};

export const buildMiraAvoidClaimsBlock = ({ claimRules = miraClaimRules } = {}) =>
  [
    "Avoid these claims. Do not repeat them except when explicitly correcting the user's wording:",
    ...claimRules.prohibitedPhrases.map((phrase) => `- ${phrase}`),
    "- HIPPA",
  ].join("\n");

export const buildMiraUserPrompt = ({
  message,
  persona = "",
  memoryTheme = "",
  empathyState = "",
} = {}) =>
  [
    `User message: ${message}`,
    `Persona posture: ${persona || "Mira Vale default guide posture"}`,
    `Memory theme: ${memoryTheme || "approved public website content"}`,
    `Empathy state: ${empathyState || "professional and calm"}`,
  ].join("\n");

export const buildMiraPromptPayload = ({
  message,
  retrievalResult,
  riskFlags = [],
  requestContext = {},
  claimRules = miraClaimRules,
} = {}) => ({
  system: buildMiraSystemPrompt({ claimRules }),
  context: buildMiraContextBlock(retrievalResult),
  avoidClaims: buildMiraAvoidClaimsBlock({ claimRules }),
  user: buildMiraUserPrompt({
    message,
    persona: requestContext.persona,
    memoryTheme: requestContext.memoryTheme,
    empathyState: requestContext.empathyState,
  }),
  riskFlags,
  expectedOutputSchema: MIRA_MODEL_OUTPUT_SCHEMA,
});

export default buildMiraPromptPayload;
