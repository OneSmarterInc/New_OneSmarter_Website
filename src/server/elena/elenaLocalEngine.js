import {
  ELENA_EXACT_ISO_CERTIFIED_SCOPE,
  elenaApprovedKnowledge,
} from "../../data/agentKnowledge/elenaApprovedKnowledge.js";
import {
  ELENA_CLAIM_STATUSES,
  evaluateElenaClaim,
} from "../../data/agentKnowledge/elenaClaimRules.js";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "can", "do", "does", "for", "is", "it", "of",
  "our", "the", "to", "we", "what", "who", "with", "you", "your",
]);

const TOPIC_TERMS = {
  hipaa: ["hipaa", "phi", "security rule", "safeguards"],
  soc: ["soc", "soc 2", "attested", "attestation"],
  iso: ["iso", "27001", "certificate", "certification body", "certified scope"],
  pci: ["pci", "pci dss", "payment card"],
  readiness: ["readiness", "audit", "prepare", "evidence", "controls", "compliance"],
  trust: ["trust center", "security posture"],
};

const normalized = (value = "") =>
  String(value).toLowerCase().replace(/[‐‑‒–—]/g, "-").replace(/[^a-z0-9/\s-]/g, " ")
    .replace(/\s+/g, " ").trim();

const tokensFor = (value) => normalized(value).split(" ").filter((token) =>
  token.length > 1 && !STOP_WORDS.has(token));

const entryText = (entry) => normalized([
  entry.id,
  entry.title,
  entry.approvedSummary,
  ...(entry.sourceFacts || []),
  ...(entry.allowedClaims || []),
].join(" "));

const compactSource = (entry) => ({
  id: entry.id,
  title: entry.title,
  route: entry.route,
  sourceLabel: entry.sourceReference?.sourceLabel || "",
});

export const retrieveElenaKnowledge = (message = "", limit = 3) => {
  const search = normalized(message);
  const tokens = tokensFor(message);
  return elenaApprovedKnowledge
    .map((entry) => {
      const searchable = entryText(entry);
      let score = tokens.reduce((total, token) =>
        total + (searchable.includes(token) ? 1 : 0), 0);
      for (const terms of Object.values(TOPIC_TERMS)) {
        if (terms.some((term) => search.includes(term)) && terms.some((term) => searchable.includes(term))) {
          score += 4;
        }
      }
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
};

const sourceEntries = (ids) => ids
  .map((id) => elenaApprovedKnowledge.find((entry) => entry.id === id))
  .filter(Boolean);

const localResult = ({ answer, ids, confidence = "high", clarificationNeeded = false,
  clarificationQuestion = "", claimEvaluation = null }) => ({
  answer,
  matchedEntries: sourceEntries(ids),
  sources: sourceEntries(ids).map(compactSource),
  confidence,
  clarificationNeeded,
  clarificationQuestion,
  claimEvaluation,
});

const contextualTopic = (message, conversationHistory = []) => {
  if (/\b(?:hipaa|soc\s*2?|iso|27001|pci\s*dss|audit|compliance|trust center)\b/i.test(message)) {
    return message;
  }
  if (!/\b(?:that|it|this|those|platforms?|scope|certificate|certification)\b/i.test(message)) {
    return message;
  }
  const priorUser = [...conversationHistory].reverse().find((turn) => turn.role === "user");
  const topic = priorUser?.content?.match(/\b(?:HIPAA|SOC\s*2?|ISO(?:\/IEC)?(?:\s*27001)?|PCI\s*DSS)\b/i)?.[0];
  const qualifier = /\bcertif(?:y|ied|ication)\b/i.test(priorUser?.content || "")
    ? "certification"
    : "";
  return topic ? `${message} ${topic} ${qualifier}`.trim() : message;
};

export const runElenaLocalEngine = ({ message = "", conversationHistory = [] } = {}) => {
  const contextualMessage = contextualTopic(message, conversationHistory);
  const text = normalized(contextualMessage);
  const platformQuestion = /\bplatforms?\b/.test(text);

  if (/\bbill audit\b|\bcafe\b|\bcooking programmes?\b|\bodd animal\b/.test(text)) {
    return localResult({
      answer: "I do not have approved compliance information for that question. I can help with OneSmarter's HIPAA, SOC 2, ISO/IEC 27001, PCI DSS readiness, audit-readiness, and Trust Center language.",
      ids: [],
      confidence: "low",
      clarificationNeeded: true,
      clarificationQuestion: "Which approved compliance topic would you like to review?",
    });
  }

  if (/\bhipaa\b/.test(text) && /\bguarantee/.test(text)) {
    return localResult({
      answer: "No. OneSmarter does not guarantee HIPAA compliance. It has completed an independent HIPAA Security Rule compliance assessment and provides HIPAA audit-readiness support, but customer compliance requires customer-specific review.",
      ids: ["hipaa-security-rule-assessment", "hipaa-audit-readiness-support"],
      claimEvaluation: evaluateElenaClaim("OneSmarter guarantees HIPAA compliance"),
    });
  }
  if (/\bhipaa\b/.test(text) && /\bcertif/.test(text)) {
    return localResult({
      answer: platformQuestion
        ? "No. OneSmarter does not claim that its platforms are HIPAA certified. Selected systems may be designed for HIPAA-regulated or PHI-sensitive workflows, but that does not certify a platform or guarantee customer compliance."
        : "No. OneSmarter does not present itself as HIPAA certified. The approved status is HIPAA Security Rule Compliance Assessment Completed, based on an independent assessment.",
      ids: ["hipaa-security-rule-assessment"],
      claimEvaluation: evaluateElenaClaim(platformQuestion
        ? "OneSmarter platforms are HIPAA certified"
        : "OneSmarter is HIPAA certified"),
    });
  }
  if (/\bsoc\s*2?\b/.test(text) && /\bcertif/.test(text)) {
    return localResult({
      answer: platformQuestion
        ? "No. OneSmarter does not claim that its platforms are SOC 2 certified. OneSmarter's approved organizational posture is SOC 2 Type II Attested."
        : "OneSmarter uses the wording SOC 2 Type II Attested, not SOC 2 certified. The attestation reflects an independent review of controls over a defined assessment period.",
      ids: ["soc2-attested"],
      claimEvaluation: evaluateElenaClaim(platformQuestion
        ? "OneSmarter platforms are SOC 2 certified"
        : "OneSmarter is SOC 2 certified"),
    });
  }
  if (/\bsoc\s*2\b/.test(text) && /\b(?:attested|attestation)\b/.test(text)) {
    return localResult({
      answer: "Yes. OneSmarter is SOC 2 Type II Attested as part of its ongoing security and operational controls program.",
      ids: ["soc2-attested"],
      claimEvaluation: evaluateElenaClaim("OneSmarter is SOC 2 Type II Attested"),
    });
  }
  if (/\biso\b|\b27001\b/.test(text)) {
    if (/\bclaims? processing\b/.test(text) && /\b(?:cover|scope|certif)\b/.test(text)) {
      return localResult({
        answer: `No. Claims processing is not included in the approved certified scope. One Smarter Inc.'s ISO/IEC 27001:2022 certified scope is ${ELENA_EXACT_ISO_CERTIFIED_SCOPE}.`,
        ids: ["iso-27001-certified"],
        claimEvaluation: evaluateElenaClaim("Claims processing is ISO certified"),
      });
    }
    if (/\b(?:my|customer)\s+(?:system|organization)|certif(?:y|ies)\s+(?:my|customer)/.test(text)) {
      return localResult({
        answer: `No. One Smarter Inc.'s certification applies only to its stated scope and does not certify customer systems or organizations. The certified scope is ${ELENA_EXACT_ISO_CERTIFIED_SCOPE}.`,
        ids: ["iso-27001-certified"],
        claimEvaluation: evaluateElenaClaim("OneSmarter's ISO certification certifies customer systems"),
      });
    }
    if (/\b(?:who issued|issuer|certification body)\b/.test(text)) {
      return localResult({
        answer: "The certification body is ARS Assessment Private Limited, UAF accredited.",
        ids: ["iso-27001-certified"],
      });
    }
    if (/\b(?:certificate number|number)\b/.test(text)) {
      return localResult({
        answer: "One Smarter Inc.'s ISO/IEC 27001:2022 certificate number is 210826050107.",
        ids: ["iso-27001-certified"],
      });
    }
    if (/\b(?:certified|certification|scope)\b/.test(text)) {
      return localResult({
        answer: `Yes. One Smarter Inc. is ISO/IEC 27001:2022 certified for ${ELENA_EXACT_ISO_CERTIFIED_SCOPE}. This scope does not automatically cover claims processing, healthcare services, every platform or service, or customer systems.`,
        ids: ["iso-27001-certified"],
        claimEvaluation: evaluateElenaClaim("One Smarter Inc. is ISO/IEC 27001:2022 certified"),
      });
    }
  }
  if (/\bpci\s*dss\b/.test(text)) {
    if (/\bcertif/.test(text)) {
      return localResult({
        answer: "The approved public content supports PCI DSS readiness services only; it does not establish that OneSmarter is PCI DSS certified. OneSmarter supports scope coordination, control documentation, evidence preparation, findings review, and remediation support.",
        ids: ["pci-dss-readiness-support"],
        claimEvaluation: evaluateElenaClaim("OneSmarter is PCI DSS certified"),
      });
    }
    return localResult({
      answer: "Yes. OneSmarter supports PCI DSS readiness through scope coordination, control documentation, evidence preparation, findings review, and remediation support. Readiness support is not certification or a compliance guarantee.",
      ids: ["pci-dss-readiness-support"],
      claimEvaluation: evaluateElenaClaim("OneSmarter supports PCI DSS readiness"),
    });
  }
  if (/\bcertif(?:y|ies)\b.{0,20}\b(?:my|our)\s+(?:company|organization)\b/.test(text)) {
    return localResult({
      answer: "No. OneSmarter does not certify customer organizations, issue ISO certificates, or issue SOC reports. It can provide readiness support to help prepare for an independent review or certification process.",
      ids: ["compliance-cyber-assurance-overview"],
      claimEvaluation: evaluateElenaClaim("OneSmarter can certify my company"),
    });
  }
  if (/\bguarantee/.test(text) && /\b(?:pass|audit|compliance|certification)\b/.test(text)) {
    return localResult({
      answer: "No. OneSmarter does not guarantee compliance, certification, or audit success. It can help prepare through evidence preparation, control documentation, gap tracking, framework mapping, and remediation support.",
      ids: ["compliance-cyber-assurance-overview"],
      claimEvaluation: evaluateElenaClaim("OneSmarter guarantees we will pass the audit"),
    });
  }
  if (/\b(?:prepare|readiness)\b/.test(text) || (/\baudit\b/.test(text) && !/\bbill audit\b/.test(text))) {
    return localResult({
      answer: "OneSmarter provides SOC readiness, HIPAA audit readiness, ISO/IEC 27001 readiness, PCI DSS readiness, framework mapping, VAPT and remediation, CMMI readiness, and compliance operations. These services help prepare; they do not certify customers or guarantee outcomes.",
      ids: ["compliance-cyber-assurance-overview"],
    });
  }
  if (/\btrust center\b/.test(text)) {
    return localResult({
      answer: "OneSmarter's Trust Center explains its own ISO/IEC 27001, SOC 2, HIPAA, security-practice, privacy, and responsible-data-handling posture. It is separate from client-facing compliance-readiness services.",
      ids: ["trust-center-overview"],
    });
  }

  const matchedEntries = retrieveElenaKnowledge(contextualMessage);
  if (matchedEntries.length) {
    return localResult({
      answer: matchedEntries[0].approvedSummary,
      ids: [matchedEntries[0].id],
      confidence: "medium",
    });
  }
  return localResult({
    answer: "I do not have approved compliance information for that question. I can help with OneSmarter's HIPAA, SOC 2, ISO/IEC 27001, PCI DSS readiness, audit-readiness, and Trust Center language.",
    ids: [],
    confidence: "low",
    clarificationNeeded: true,
    clarificationQuestion: "Which approved compliance topic would you like to review?",
  });
};

export default runElenaLocalEngine;
