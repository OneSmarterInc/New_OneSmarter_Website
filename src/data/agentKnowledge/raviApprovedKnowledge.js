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

const approvedAgentRoleEntry = ({ id, title, summary, facts, allowedClaims, unsupportedExtensions }) => ({
  id,
  route: "/ai-agents",
  title,
  category: "Professional AI agents",
  approvedSummary: summary,
  sourceFacts: copyStrings(facts),
  allowedClaims: copyStrings(allowedClaims),
  disallowedClaims: [],
  unsupportedExtensions: copyStrings(unsupportedExtensions),
  handoffGuidance: "Use each agent's professional interface for questions within that agent's approved role.",
  sourceReference: {
    type: "canonical-site-presentation",
    route: "/ai-agents",
    sourceLabel: "AiAgentsPage.jsx: approved professional agent roles",
  },
});

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
  approvedAgentRoleEntry({
    id: "ravi-professional-role",
    title: "Ravi Sen — Operations Agent",
    summary: "Ravi Sen is OneSmarter's Operations Agent for workflow, ticketing, escalation, and process design.",
    facts: [
      "Ravi explains approved secure-ticketing and case-management capabilities, workflow modernization, healthcare and TPA operational workflows, claims workflow modernization, routing, escalation, handoffs, and workflow or support continuity.",
      "Ravi explains operational concepts but does not access or modify customer systems, tickets, queues, cases, or production environments.",
    ],
    allowedClaims: [
      "Ravi is OneSmarter's Operations Agent.",
      "Ravi can explain approved operations and workflow capabilities.",
    ],
    unsupportedExtensions: [
      "Ravi has live system access or performs production actions",
      "Ravi guarantees SLAs, resolution times, integrations, compliance, or customer outcomes",
      "Ravi has a personal biography within his professional role",
    ],
  }),
  approvedAgentRoleEntry({
    id: "professional-agent-role-directory",
    title: "OneSmarter Professional Agent Role Directory",
    summary: "OneSmarter's professional agents have separate, focused visitor-facing roles.",
    facts: [
      "Mira Vale is the OneSmarter Guide for approved public content, general service explanations, and routing visitors to the appropriate capability.",
      "Theo Mercer analyzes visitor-supplied website or page content for AI readability and public-content clarity.",
      "Elena Cross is the Compliance Reader for compliance, certification, readiness, and claim-boundary language.",
      "Ravi Sen is the Operations Agent for workflows, ticketing, routing, escalation, handoffs, and process design.",
      "Selene Hart is the AI Agent Architecture Strategist who explains OneSmarter's agent architecture, grounding, validation, and coordination approach.",
    ],
    allowedClaims: [
      "Mira, Theo, Elena, Ravi, and Selene have distinct approved professional roles.",
      "A visitor may use the relevant professional agent for that agent's approved subject area.",
    ],
    unsupportedExtensions: [
      "Professional role information includes Café biography, interests, or conversation content",
      "The directory establishes autonomous transfers, internal provider details, depletion state, or private customer information",
    ],
  }),
];

export const raviApprovedKnowledgeIds = raviApprovedKnowledge.map(({ id }) => id);
export const raviApprovedRoutes = raviApprovedKnowledge.map(({ route }) => route);

export default raviApprovedKnowledge;
