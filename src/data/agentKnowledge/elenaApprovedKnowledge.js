import { siteDirectory } from "../siteDirectory.js";
import { onesmarterPublicKnowledgeBase } from "./onesmarterPublicKb.js";

export const ELENA_EXACT_ISO_CERTIFIED_SCOPE =
  "AWS cloud services development, HR and people management solutions development, and governance activities in the One Smarter application";

const canonicalKnowledgeById = new Map(
  onesmarterPublicKnowledgeBase.map((entry) => [entry.id, entry]),
);

const canonicalPageByRoute = new Map(
  siteDirectory.map((page) => [page.route, page]),
);

const copyStrings = (values = []) => values.filter(Boolean).map(String);

const approvedCanonicalEntry = (id, unsupportedExtensions = []) => {
  const source = canonicalKnowledgeById.get(id);
  if (!source) {
    throw new Error(`Missing canonical Elena knowledge source: ${id}`);
  }

  return {
    id: source.id,
    route: source.route,
    title: source.title,
    category: source.category,
    approvedSummary: source.approvedSummary,
    sourceFacts: copyStrings(source.sourceFacts),
    allowedClaims: copyStrings(source.allowedClaims),
    disallowedClaims: copyStrings(source.disallowedClaims),
    unsupportedExtensions: copyStrings(unsupportedExtensions),
    handoffGuidance: source.handoffGuidance,
    sourceReference: {
      type: "canonical-professional-knowledge",
      canonicalKnowledgeId: source.id,
      route: source.route,
      sourceLabel: source.sourceLabel,
    },
  };
};

const approvedReadinessEntry = ({
  id,
  route,
  title,
  allowedClaims,
  disallowedClaims,
  unsupportedExtensions,
}) => {
  const source = canonicalPageByRoute.get(route);
  if (!source) {
    throw new Error(`Missing canonical Elena site source: ${route}`);
  }

  return {
    id,
    route,
    title,
    category: source.category,
    approvedSummary: source.shortSummary,
    sourceFacts: [
      source.shortSummary,
      ...copyStrings(source.keyOfferings),
      ...copyStrings(source.complianceNotes),
    ],
    allowedClaims: copyStrings(allowedClaims),
    disallowedClaims: copyStrings(disallowedClaims),
    unsupportedExtensions: copyStrings(unsupportedExtensions),
    handoffGuidance:
      "Route audit scope, evidence, procurement, or organization-specific questions to care@onesmarter.com.",
    sourceReference: {
      type: "canonical-site-directory",
      route,
      sourceLabel: `siteDirectory.js: ${route}`,
    },
  };
};

export const elenaApprovedKnowledge = [
  approvedCanonicalEntry("trust-center-overview", [
    "The Trust Center certifies customer systems",
    "Every Trust Center credential applies to every OneSmarter platform",
  ]),
  approvedCanonicalEntry("soc2-attested", [
    "OneSmarter or its platforms are SOC 2 certified",
    "The attestation guarantees customer compliance",
  ]),
  approvedCanonicalEntry("hipaa-security-rule-assessment", [
    "OneSmarter or its platforms are HIPAA certified",
    "The assessment guarantees HIPAA compliance for OneSmarter or its customers",
  ]),
  approvedCanonicalEntry("iso-27001-certified", [
    "The certified scope includes claims processing or healthcare services generally",
    "Every OneSmarter platform or service is ISO certified",
    "OneSmarter's certification certifies customer systems",
  ]),
  approvedCanonicalEntry("compliance-cyber-assurance-overview", [
    "OneSmarter certifies customers or issues audit reports or certificates",
    "Readiness support guarantees certification or compliance",
  ]),
  approvedCanonicalEntry("iso-27001-readiness-support", [
    "Readiness support certifies a customer system",
    "Readiness work automatically results in ISO certification",
  ]),
  approvedReadinessEntry({
    id: "soc-readiness-support",
    route: "/compliance-assurance/soc-readiness",
    title: "SOC Readiness Support",
    allowedClaims: [
      "SOC 1, SOC 2, and SOC 3 readiness support",
      "Evidence preparation",
      "Control documentation",
      "Gap tracking",
      "Remediation support",
      "Coordination with client-selected auditors",
    ],
    disallowedClaims: [
      "OneSmarter issues SOC reports",
      "Readiness support is a SOC attestation",
      "Readiness support guarantees a successful audit",
    ],
    unsupportedExtensions: [
      "OneSmarter certifies customers as SOC compliant",
    ],
  }),
  approvedReadinessEntry({
    id: "hipaa-audit-readiness-support",
    route: "/compliance-assurance/hipaa-audit-readiness",
    title: "HIPAA Audit Readiness Support",
    allowedClaims: [
      "HIPAA audit readiness support",
      "Safeguards mapping",
      "Documentation review",
      "Evidence preparation",
      "Remediation planning",
    ],
    disallowedClaims: [
      "HIPAA certification",
      "Readiness support guarantees HIPAA compliance",
      "OneSmarter certifies customers as HIPAA compliant",
    ],
    unsupportedExtensions: [
      "Readiness support replaces a customer-specific legal or compliance review",
    ],
  }),
  approvedReadinessEntry({
    id: "pci-dss-readiness-support",
    route: "/compliance-assurance/pci-dss-readiness",
    title: "PCI DSS Readiness Support",
    allowedClaims: [
      "PCI DSS readiness support",
      "Scope coordination",
      "Control documentation",
      "Evidence preparation",
      "Findings review",
      "Remediation support",
    ],
    disallowedClaims: [
      "OneSmarter is PCI DSS certified",
      "OneSmarter certifies customers for PCI DSS",
      "PCI DSS readiness guarantees compliance",
    ],
    unsupportedExtensions: [
      "PCI DSS readiness support is an approved PCI compliance claim",
    ],
  }),
];

export const elenaApprovedKnowledgeIds = elenaApprovedKnowledge.map(
  (entry) => entry.id,
);

export default elenaApprovedKnowledge;
