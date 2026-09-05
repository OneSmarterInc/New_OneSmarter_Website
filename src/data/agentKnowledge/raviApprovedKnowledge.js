import { siteDirectory } from "../siteDirectory.js";
import { onesmarterPublicKnowledgeBase } from "./onesmarterPublicKb.js";

const canonicalKnowledgeById = new Map(
  onesmarterPublicKnowledgeBase.map((entry) => [entry.id, entry]),
);
const canonicalPageByRoute = new Map(siteDirectory.map((page) => [page.route, page]));
const copyStrings = (values = []) => values.filter(Boolean).map(String);

const approvedKnowledgeEntry = (id, unsupportedExtensions = []) => {
  const source = canonicalKnowledgeById.get(id);
  if (!source) throw new Error(`Missing canonical Ravi knowledge source: ${id}`);
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

const approvedSiteEntry = ({ id, route, unsupportedExtensions = [] }) => {
  const source = canonicalPageByRoute.get(route);
  if (!source) throw new Error(`Missing canonical Ravi site source: ${route}`);
  return {
    id,
    route,
    title: source.title,
    category: source.category,
    approvedSummary: source.shortSummary,
    sourceFacts: [source.shortSummary, ...copyStrings(source.keyOfferings)],
    allowedClaims: copyStrings(source.keyOfferings),
    disallowedClaims: [],
    unsupportedExtensions: copyStrings(unsupportedExtensions),
    handoffGuidance:
      "Route implementation, integration, access, SLA, pricing, timeline, or customer-specific questions to care@onesmarter.com.",
    sourceReference: {
      type: "canonical-site-directory",
      route,
      sourceLabel: `siteDirectory.js: ${route}`,
    },
  };
};

export const raviApprovedKnowledge = [
  approvedKnowledgeEntry("secure-ticketing-case-management", [
    "The platform guarantees resolution times, SLA performance, audit outcomes, or compliance",
    "The platform has an automated escalation or routing feature not stated in the approved source",
    "Ravi can access, change, close, route, or escalate a real customer ticket",
  ]),
  approvedKnowledgeEntry("claims-processing-services", [
    "Claims Processing Services are a commercially available claims-processing platform",
    "OneSmarter acts as a payer or licensed claims adjudicator",
    "Claims workflow support guarantees a customer-specific operational result",
  ]),
  approvedSiteEntry({
    id: "healthcare-tpa-workflow-modernization",
    route: "/technology-solutions/healthcare-tpa",
    unsupportedExtensions: [
      "Workflow modernization makes a customer HIPAA compliant",
      "OneSmarter can access a customer's production environment without an approved engagement",
    ],
  }),
  approvedSiteEntry({
    id: "enterprise-workflow-tools",
    route: "/technology-solutions/enterprise-software",
    unsupportedExtensions: [
      "A named vendor integration is available unless separately documented",
      "Custom workflow delivery has a guaranteed price or implementation timeline",
    ],
  }),
  approvedSiteEntry({
    id: "software-support-continuity",
    route: "/technology-solutions/software-support-consolidation",
    unsupportedExtensions: [
      "Issue resolution has a guaranteed SLA or completion time",
      "Support consolidation grants Ravi live access to customer systems",
    ],
  }),
];

export const raviApprovedKnowledgeIds = raviApprovedKnowledge.map(({ id }) => id);
export const raviApprovedRoutes = raviApprovedKnowledge.map(({ route }) => route);

export default raviApprovedKnowledge;
