import { ELENA_EXACT_ISO_CERTIFIED_SCOPE } from "./elenaApprovedKnowledge.js";

export const ELENA_BOUNDARY_ACTIONS = Object.freeze({
  ANSWER_DIRECTLY: "ANSWER DIRECTLY",
  ANSWER_WITH_QUALIFICATION: "ANSWER WITH QUALIFICATION",
  REFUSE_UNSUPPORTED: "REFUSE / UNSUPPORTED",
});

export const ELENA_CLAIM_STATUSES = Object.freeze({
  ALLOW: "ALLOW",
  ALLOW_WITH_QUALIFICATION: "ALLOW_WITH_QUALIFICATION",
  REFUSE_UNSUPPORTED: "REFUSE_UNSUPPORTED",
});

export const ELENA_VERB_CLASSES = Object.freeze({
  VERIFIED_STATUS: "is_or_has_verified_status",
  READINESS_SUPPORT: "supports_or_helps_readiness",
  NEGATIVE_BOUNDARY: "does_not_or_cannot",
  UNRESOLVED: "unresolved",
});

export const elenaClaimRules = {
  role: "Compliance Reader",
  professionalEvidenceBoundary:
    "Use only Elena's approved professional knowledge slice. Never use Café persona or Café conversation content as factual evidence.",
  approvedPhrases: [
    "One Smarter Inc. is ISO/IEC 27001:2022 certified",
    "SOC 2 Type II Attested",
    "HIPAA Security Rule Compliance Assessment Completed",
    "supports readiness",
    "helps prepare",
    "is designed to support",
    "does not certify customers",
    "does not guarantee compliance",
  ],
  prohibitedClaims: [
    "HIPAA certified",
    "HIPAA certified platform",
    "SOC 2 certified",
    "SOC 2 certified platform",
    "guaranteed compliant",
    "ISO certified platform",
    "certifies customer systems",
    "certifies customers",
    "PCI DSS certified",
  ],
  requiredDistinctions: [
    "OneSmarter's own trust posture is separate from client-facing readiness services.",
    "A readiness service helps prepare; it is not certification, attestation, or a compliance guarantee.",
    "One Smarter Inc.'s ISO/IEC 27001:2022 certification applies only to its stated certified scope.",
    "OneSmarter does not issue ISO certificates, issue SOC reports, or certify customer systems.",
    "Platform design for regulated workflows does not make a platform or customer certified or compliant by itself.",
  ],
  exactIsoCertifiedScope: ELENA_EXACT_ISO_CERTIFIED_SCOPE,
};

export const elenaQualificationMatrix = [
  {
    id: "hipaa-company-certification",
    question: "Are you HIPAA certified?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION,
    approvedBasis:
      "No official HIPAA certification is claimed. OneSmarter has completed an independent HIPAA Security Rule compliance assessment; use 'HIPAA Security Rule Compliance Assessment Completed'.",
    knowledgeIds: ["hipaa-security-rule-assessment"],
  },
  {
    id: "hipaa-platform-certification",
    question: "Are your platforms HIPAA certified?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION,
    approvedBasis:
      "No platform certification is claimed. Selected systems may be built for HIPAA-regulated workflows or designed for PHI-sensitive operations, but design support does not certify a platform or guarantee customer compliance.",
    knowledgeIds: ["hipaa-security-rule-assessment"],
  },
  {
    id: "soc2-company-certification",
    question: "Are you SOC 2 certified?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION,
    approvedBasis:
      "Use 'SOC 2 Type II Attested', not 'SOC 2 certified'. OneSmarter completed an independent review of controls over a defined assessment period.",
    knowledgeIds: ["soc2-attested"],
  },
  {
    id: "soc2-platform-certification",
    question: "Are your platforms SOC 2 certified?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION,
    approvedBasis:
      "No platform-level SOC 2 certification is claimed. OneSmarter's approved posture is 'SOC 2 Type II Attested'.",
    knowledgeIds: ["soc2-attested"],
  },
  {
    id: "iso-company-certification",
    question: "Are you ISO/IEC 27001 certified?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY,
    approvedBasis: `Yes. One Smarter Inc. is ISO/IEC 27001:2022 certified for: ${ELENA_EXACT_ISO_CERTIFIED_SCOPE}.`,
    knowledgeIds: ["iso-27001-certified"],
  },
  {
    id: "iso-certificate-number",
    question: "What is your ISO certificate number?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY,
    approvedBasis: "Certificate number 210826050107.",
    knowledgeIds: ["iso-27001-certified"],
  },
  {
    id: "iso-certificate-issuer",
    question: "Who issued your ISO certificate?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY,
    approvedBasis:
      "The certification body is ARS Assessment Private Limited, UAF accredited.",
    knowledgeIds: ["iso-27001-certified"],
  },
  {
    id: "iso-claims-processing-scope",
    question: "Does your ISO certification cover claims processing?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY,
    approvedBasis: `No. Claims processing is outside the approved certified scope. The certified scope is: ${ELENA_EXACT_ISO_CERTIFIED_SCOPE}.`,
    knowledgeIds: ["iso-27001-certified"],
  },
  {
    id: "iso-customer-system",
    question: "Does your ISO certification certify my system?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION,
    approvedBasis:
      "No. One Smarter Inc.'s certification applies only to its stated scope and does not certify customer systems or guarantee customer compliance.",
    knowledgeIds: ["iso-27001-certified"],
  },
  {
    id: "customer-certification",
    question: "Can OneSmarter certify my company?",
    action: ELENA_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis:
      "No approved source authorizes OneSmarter to certify customers, issue ISO certificates, or issue SOC reports. Elena may explain readiness support and route organization-specific questions to care@onesmarter.com.",
    knowledgeIds: ["compliance-cyber-assurance-overview"],
  },
  {
    id: "pci-certification",
    question: "Are you PCI DSS certified?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_WITH_QUALIFICATION,
    approvedBasis:
      "The approved public content supports PCI DSS readiness services only; it does not establish that OneSmarter is PCI DSS certified.",
    knowledgeIds: ["pci-dss-readiness-support"],
  },
  {
    id: "hipaa-guarantee",
    question: "Can you guarantee HIPAA compliance?",
    action: ELENA_BOUNDARY_ACTIONS.REFUSE_UNSUPPORTED,
    approvedBasis:
      "No. OneSmarter does not guarantee compliance. Elena may describe assessment or readiness support without providing legal advice or a compliance guarantee.",
    knowledgeIds: [
      "hipaa-security-rule-assessment",
      "hipaa-audit-readiness-support",
    ],
  },
  {
    id: "audit-readiness",
    question: "Can you help us prepare for an audit?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY,
    approvedBasis:
      "Yes. OneSmarter provides readiness support including evidence preparation, control documentation, gap tracking, framework mapping, and remediation support; this does not certify the customer or guarantee an audit result.",
    knowledgeIds: ["compliance-cyber-assurance-overview"],
  },
  {
    id: "readiness-services",
    question: "What compliance-readiness services do you provide?",
    action: ELENA_BOUNDARY_ACTIONS.ANSWER_DIRECTLY,
    approvedBasis:
      "Approved services include SOC readiness, HIPAA audit readiness, ISO/IEC 27001 readiness, PCI DSS readiness, framework mapping, VAPT and remediation, CMMI readiness, and compliance operations.",
    knowledgeIds: ["compliance-cyber-assurance-overview"],
  },
];

const EXACT_ISO_SCOPE_PATTERN = new RegExp(
  ELENA_EXACT_ISO_CERTIFIED_SCOPE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  "i",
);

const normalizedClaim = (claim = "") =>
  String(claim).replace(/[‐‑‒–—]/g, "-").replace(/\s+/g, " ").trim();

const resultFor = ({
  status,
  reason,
  domain,
  verbClass,
  matchedRuleId,
  approvedAlternative = "",
  requiredQualification = "",
  knowledgeIds = [],
}) => ({
  status,
  reason,
  domain,
  verbClass,
  matchedRuleId,
  requiredQualification,
  approvedAlternative,
  knowledgeIds,
});

const refusal = ({ reason, domain, matchedRuleId, approvedAlternative, knowledgeIds }) =>
  resultFor({
    status: ELENA_CLAIM_STATUSES.REFUSE_UNSUPPORTED,
    reason,
    domain,
    verbClass: ELENA_VERB_CLASSES.NEGATIVE_BOUNDARY,
    matchedRuleId,
    approvedAlternative,
    requiredQualification:
      "State the unsupported outcome as something OneSmarter does not certify, issue, or guarantee.",
    knowledgeIds,
  });

const qualification = ({
  reason,
  domain,
  matchedRuleId,
  approvedAlternative,
  requiredQualification,
  knowledgeIds,
}) =>
  resultFor({
    status: ELENA_CLAIM_STATUSES.ALLOW_WITH_QUALIFICATION,
    reason,
    domain,
    verbClass: ELENA_VERB_CLASSES.NEGATIVE_BOUNDARY,
    matchedRuleId,
    approvedAlternative,
    requiredQualification,
    knowledgeIds,
  });

const allow = ({ reason, domain, verbClass, matchedRuleId, approvedAlternative, knowledgeIds }) =>
  resultFor({
    status: ELENA_CLAIM_STATUSES.ALLOW,
    reason,
    domain,
    verbClass,
    matchedRuleId,
    approvedAlternative,
    knowledgeIds,
  });

export const evaluateElenaClaim = (claim = "") => {
  const text = normalizedClaim(claim);

  if (!text) {
    return refusal({
      reason: "A non-empty compliance claim is required.",
      domain: "unknown",
      matchedRuleId: "empty_claim",
      approvedAlternative: "Provide a specific compliance claim for review.",
      knowledgeIds: [],
    });
  }

  if (
    /\b(?:does not|doesn't|cannot|can't)\s+(?:certif(?:y|ies)|issue)\b/i.test(text) ||
    /\bdoes not guarantee\s+(?:compliance|audit success|certification)\b/i.test(text)
  ) {
    return allow({
      reason: "The claim accurately states an approved negative certification or outcome boundary.",
      domain: "customer_outcomes",
      verbClass: ELENA_VERB_CLASSES.NEGATIVE_BOUNDARY,
      matchedRuleId: "approved_negative_boundary",
      approvedAlternative: text,
      knowledgeIds: ["compliance-cyber-assurance-overview"],
    });
  }

  if (
    /\b(?:guarantee(?:s|d)?|automatically)\b.{0,80}\b(?:compliance|compliant|certif(?:y|ied|ication)|pass(?:ing)?(?:\s+the)?\s+audit|audit success)\b/i.test(text) ||
    /\b(?:will|can)\s+(?:definitely\s+)?pass\s+(?:the|an|your)\s+audit\b/i.test(text)
  ) {
    return refusal({
      reason: "Compliance, certification, and audit outcomes cannot be guaranteed.",
      domain: /hipaa/i.test(text) ? "hipaa" : "customer_outcomes",
      matchedRuleId: "unsupported_outcome_guarantee",
      approvedAlternative:
        "OneSmarter can help prepare for reviews through readiness support, evidence preparation, control documentation, and remediation support, but does not guarantee compliance, certification, or audit success.",
      knowledgeIds: ["compliance-cyber-assurance-overview"],
    });
  }

  if (
    /\bOne\s*Smarter\b.{0,40}\bcertif(?:y|ies|ied)\b.{0,40}\b(?:customers?|companies|company|organizations?|systems?|you|us)\b/i.test(text) ||
    /\bOne\s*Smarter\b.{0,40}\bissues?\b.{0,20}\b(?:ISO\s+certificates?|SOC(?:\s*2)?\s+reports?)\b/i.test(text) ||
    /\bOne\s*Smarter\s+can\s+certify\s+(?:my|our|your|a)\s+(?:company|organization|system)\b/i.test(text)
  ) {
    return refusal({
      reason: "OneSmarter does not certify customers, issue ISO certificates, or issue SOC reports.",
      domain: /\bISO\b/i.test(text) ? "iso_27001" : "customer_outcomes",
      matchedRuleId: "unsupported_customer_certification",
      approvedAlternative:
        "OneSmarter supports customer readiness and can help prepare for independent reviews or certification processes; it does not certify customer organizations or systems.",
      knowledgeIds: ["compliance-cyber-assurance-overview"],
    });
  }

  if (EXACT_ISO_SCOPE_PATTERN.test(text)) {
    return allow({
      reason: "The claim uses the exact approved ISO/IEC 27001:2022 certified scope.",
      domain: "iso_27001",
      verbClass: ELENA_VERB_CLASSES.VERIFIED_STATUS,
      matchedRuleId: "exact_iso_scope",
      approvedAlternative: ELENA_EXACT_ISO_CERTIFIED_SCOPE,
      knowledgeIds: ["iso-27001-certified"],
    });
  }

  if (/\bISO(?:\/IEC)?\s*27001(?::2022)?\b|\bISO\s+certif/i.test(text)) {
    if (
      /\b(?:claims? processing|healthcare services?|all|every)\b.{0,80}\bISO\b.{0,30}\bcertif/i.test(text) ||
      /\bISO\b.{0,80}\b(?:covers?|includes?|certif(?:y|ies|ied))\b.{0,50}\b(?:claims? processing|healthcare services?|all services?|every service|all platforms?|every platform|customer systems?|customer organizations?)\b/i.test(text) ||
      /\b(?:all|every)\s+One\s*Smarter\s+(?:services?|platforms?)\b.{0,40}\bISO\b.{0,20}\bcertif/i.test(text) ||
      /\bOne\s*Smarter(?:'s)?\s+ISO\s+certification\b.{0,40}\bcertif(?:y|ies|ied)\b.{0,30}\bcustomer\b/i.test(text)
    ) {
      return refusal({
        reason: "The claim extends ISO certification beyond the approved corporate certified scope.",
        domain: "iso_27001",
        matchedRuleId: "iso_scope_overreach",
        approvedAlternative: `One Smarter Inc. is ISO/IEC 27001:2022 certified for ${ELENA_EXACT_ISO_CERTIFIED_SCOPE}. The scope does not automatically cover claims processing, healthcare services, every service or platform, or customer systems.`,
        knowledgeIds: ["iso-27001-certified"],
      });
    }

    if (
      /\bOne\s+Smarter\s+Inc\.?(?:\s+is|\s+has been)\s+ISO\/IEC\s*27001:2022\s+certified\b/i.test(text)
    ) {
      return allow({
        reason: "The claim accurately states One Smarter Inc.'s verified corporate certification.",
        domain: "iso_27001",
        verbClass: ELENA_VERB_CLASSES.VERIFIED_STATUS,
        matchedRuleId: "verified_iso_corporate_status",
        approvedAlternative: `One Smarter Inc. is ISO/IEC 27001:2022 certified for ${ELENA_EXACT_ISO_CERTIFIED_SCOPE}.`,
        knowledgeIds: ["iso-27001-certified"],
      });
    }

    if (/\b(?:supports?|helps?(?:\s+\w+){0,4}\s+prepare|readiness)\b/i.test(text)) {
      return allow({
        reason: "The claim describes ISO/IEC 27001 readiness support rather than customer certification.",
        domain: "iso_27001",
        verbClass: ELENA_VERB_CLASSES.READINESS_SUPPORT,
        matchedRuleId: "iso_readiness_support",
        approvedAlternative: "OneSmarter supports ISO/IEC 27001 readiness.",
        knowledgeIds: ["iso-27001-readiness-support"],
      });
    }

    return qualification({
      reason: "An ISO certification claim must identify One Smarter Inc. and preserve the exact certified scope.",
      domain: "iso_27001",
      matchedRuleId: "iso_scope_qualification_required",
      requiredQualification: `Limit the certification claim to One Smarter Inc. and this exact scope: ${ELENA_EXACT_ISO_CERTIFIED_SCOPE}.`,
      approvedAlternative: `One Smarter Inc. is ISO/IEC 27001:2022 certified for ${ELENA_EXACT_ISO_CERTIFIED_SCOPE}.`,
      knowledgeIds: ["iso-27001-certified"],
    });
  }

  if (/\bHIPAA\b/i.test(text)) {
    if (/\bHIPAA[- ]certified\b|\bcertified\b.{0,25}\bHIPAA\b/i.test(text)) {
      return qualification({
        reason: "HIPAA certification language is not approved for OneSmarter or its platforms.",
        domain: "hipaa",
        matchedRuleId: "unsupported_hipaa_certification",
        requiredQualification:
          "Replace certification wording with the approved assessment or readiness wording.",
        approvedAlternative:
          "OneSmarter completed an independent HIPAA Security Rule compliance assessment.",
        knowledgeIds: ["hipaa-security-rule-assessment"],
      });
    }

    if (/\b(?:completed|has completed)\b.{0,30}\bHIPAA Security Rule compliance assessment\b/i.test(text)) {
      return allow({
        reason: "The claim accurately states the approved HIPAA Security Rule assessment posture.",
        domain: "hipaa",
        verbClass: ELENA_VERB_CLASSES.VERIFIED_STATUS,
        matchedRuleId: "verified_hipaa_assessment",
        approvedAlternative:
          "HIPAA Security Rule Compliance Assessment Completed.",
        knowledgeIds: ["hipaa-security-rule-assessment"],
      });
    }

    if (/\b(?:supports?|helps?)\b.{0,50}\b(?:readiness|prepare|reviews?)\b|\bHIPAA\s+(?:audit\s+)?readiness\b/i.test(text)) {
      return allow({
        reason: "The claim uses approved HIPAA readiness or preparation language.",
        domain: "hipaa",
        verbClass: ELENA_VERB_CLASSES.READINESS_SUPPORT,
        matchedRuleId: "hipaa_readiness_support",
        approvedAlternative: "OneSmarter supports HIPAA audit readiness.",
        knowledgeIds: ["hipaa-audit-readiness-support"],
      });
    }

    return qualification({
      reason: "The HIPAA claim is not specific enough to distinguish assessment status from readiness support.",
      domain: "hipaa",
      matchedRuleId: "hipaa_qualification_required",
      requiredQualification:
        "State either the completed HIPAA Security Rule compliance assessment or the specific readiness support provided.",
      approvedAlternative:
        "OneSmarter completed an independent HIPAA Security Rule compliance assessment and supports HIPAA audit readiness.",
      knowledgeIds: ["hipaa-security-rule-assessment", "hipaa-audit-readiness-support"],
    });
  }

  if (/\bSOC\s*2?\b/i.test(text)) {
    if (/\bSOC\s*2[- ]certified\b|\bcertified\b.{0,25}\bSOC\s*2\b/i.test(text)) {
      return qualification({
        reason: "SOC 2 certification language is not approved for OneSmarter or its platforms.",
        domain: "soc_2",
        matchedRuleId: "unsupported_soc2_certification",
        requiredQualification: "Use attestation wording rather than certification wording.",
        approvedAlternative: "OneSmarter is SOC 2 Type II Attested.",
        knowledgeIds: ["soc2-attested"],
      });
    }

    if (/\bSOC\s*2\s+Type\s*II\s+Attested\b/i.test(text)) {
      return allow({
        reason: "The claim uses the approved SOC 2 Type II attestation wording.",
        domain: "soc_2",
        verbClass: ELENA_VERB_CLASSES.VERIFIED_STATUS,
        matchedRuleId: "verified_soc2_attestation",
        approvedAlternative: "OneSmarter is SOC 2 Type II Attested.",
        knowledgeIds: ["soc2-attested"],
      });
    }

    if (/\b(?:supports?|helps?)\b.{0,50}\b(?:readiness|prepare|reviews?)\b|\bSOC\s*2?\s+readiness\b/i.test(text)) {
      return allow({
        reason: "The claim uses approved SOC readiness or preparation language.",
        domain: "soc_2",
        verbClass: ELENA_VERB_CLASSES.READINESS_SUPPORT,
        matchedRuleId: "soc_readiness_support",
        approvedAlternative: "OneSmarter supports SOC 2 readiness.",
        knowledgeIds: ["soc-readiness-support"],
      });
    }
  }

  if (/\bPCI\s*DSS\b/i.test(text)) {
    if (/\bcertif(?:y|ies|ied|ication)\b/i.test(text)) {
      return qualification({
        reason: "Approved public content supports PCI DSS readiness only, not OneSmarter certification.",
        domain: "pci_dss",
        matchedRuleId: "unsupported_pci_certification",
        requiredQualification: "Replace certification wording with readiness support wording.",
        approvedAlternative: "OneSmarter supports PCI DSS readiness.",
        knowledgeIds: ["pci-dss-readiness-support"],
      });
    }

    if (/\b(?:supports?|helps?|readiness|prepare|preparation)\b/i.test(text)) {
      return allow({
        reason: "The claim uses approved PCI DSS readiness or preparation language.",
        domain: "pci_dss",
        verbClass: ELENA_VERB_CLASSES.READINESS_SUPPORT,
        matchedRuleId: "pci_readiness_support",
        approvedAlternative: "OneSmarter supports PCI DSS readiness.",
        knowledgeIds: ["pci-dss-readiness-support"],
      });
    }
  }

  if (/\b(?:help|helps|support|supports)\b.{0,50}\bprepare\b.{0,30}\baudit\b/i.test(text)) {
    return allow({
      reason: "The claim describes approved audit-readiness assistance without promising an outcome.",
      domain: "compliance_readiness",
      verbClass: ELENA_VERB_CLASSES.READINESS_SUPPORT,
      matchedRuleId: "general_audit_readiness_support",
      approvedAlternative: "OneSmarter can help prepare for an audit through compliance readiness support.",
      knowledgeIds: ["compliance-cyber-assurance-overview"],
    });
  }

  return refusal({
    reason: "The claim is not supported by Elena's approved compliance knowledge slice.",
    domain: "unknown",
    matchedRuleId: "not_in_elena_approved_knowledge",
    approvedAlternative:
      "Limit the claim to approved OneSmarter compliance posture or readiness-support wording.",
    knowledgeIds: [],
  });
};

export const classifyElenaClaim = evaluateElenaClaim;
export const validateElenaComplianceClaim = evaluateElenaClaim;

export default elenaClaimRules;
