import { ELENA_EXACT_ISO_CERTIFIED_SCOPE } from "./elenaApprovedKnowledge.js";

export const ELENA_BOUNDARY_ACTIONS = Object.freeze({
  ANSWER_DIRECTLY: "ANSWER DIRECTLY",
  ANSWER_WITH_QUALIFICATION: "ANSWER WITH QUALIFICATION",
  REFUSE_UNSUPPORTED: "REFUSE / UNSUPPORTED",
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

export default elenaClaimRules;
