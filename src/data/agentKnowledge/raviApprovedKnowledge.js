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
  {
    id: "escalation-workflow-design",
    route: "/platforms/hipaa-regulated-ticketing",
    title: "Escalation Workflow Design",
    category: "Operational design guidance",
    approvedSummary:
      "As general escalation design guidance, define escalation paths and ownership transfers, use controlled communication for handoffs, and retain workflow tracking and audit history for accountable follow-up. Keep urgency visible to the responsible teams; confirm customer-specific priority rules separately.",
    sourceFacts: [
      "As a general design consideration, define the escalation path and the responsible owner at each handoff so routing and ownership transfer remain accountable when an issue needs another team's attention.",
      "Use controlled communication to carry the issue context across an escalation handoff, with workflow tracking and audit history to make the transfer and follow-up traceable. This is general process guidance based on approved workflow capabilities.",
      "For urgency handling, use controlled communication and workflow tracking to keep issues requiring coordinated attention visible to the responsible teams. Customer-specific priority levels, escalation triggers, response targets, and resolution commitments require a separate scoped review.",
      "These design considerations do not establish automated routing or escalation features. Ravi explains the process but does not access queues, modify tickets or workflows, or perform production escalations. No SLA, resolution time, or compliance outcome is guaranteed.",
    ],
    allowedClaims: [
      "Defined escalation paths and ownership transfers are general considerations for accountable handoffs.",
      "Controlled communication, workflow tracking, and audit history can support a designed escalation process.",
      "Urgency can be discussed as a communication and follow-up consideration, with customer-specific priority rules confirmed separately.",
    ],
    disallowedClaims: [
      "OneSmarter provides an automated escalation platform or undocumented automated routing features",
      "Ravi accesses queues, modifies tickets or workflows, or executes production escalations",
      "Escalation design guarantees SLAs, resolution times, or compliance outcomes",
    ],
    unsupportedExtensions: [
      "Specific priority scales, escalation timers, thresholds, or response commitments",
      "Customer-specific team permissions, queue configuration, or integrations",
    ],
    handoffGuidance:
      "Confirm customer-specific escalation paths, ownership, priority rules, implementation, and SLA details through a scoped review at care@onesmarter.com.",
    sourceReference: {
      type: "approved-operational-design-synthesis",
      route: "/platforms/hipaa-regulated-ticketing",
      sourceLabel: "General design considerations derived from approved secure-ticketing capabilities, Ravi claim qualifications, and Security Practices incident response readiness; not additional product features.",
      sources: [
        { path: "src/data/agentKnowledge/onesmarterPublicKb.js", quote: "The platform supports secure intake, role-based access, audit history, controlled communication, and workflow tracking." },
        { path: "src/data/agentKnowledge/raviClaimRules.js", quote: "Secure intake, role-based access, controlled communication, workflow tracking, audit history, and accountable issue resolution can support a designed escalation or handoff process; confirm implementation details separately." },
        { path: "src/components/TrustCenterPage.jsx", quote: "Incident response readiness supports practical escalation, investigation, communication, and follow-up when issues require coordinated attention." },
      ],
    },
  },
  {
    id: "workflow-handoff-design",
    route: "/technology-solutions/software-support-consolidation",
    title: "Workflow and Handoff Design",
    category: "Operational design guidance",
    approvedSummary:
      "As general workflow design guidance, connect secure intake with clear ownership, controlled handoffs, workflow tracking, and audit history. Use documentation and knowledge transfer to preserve context, visibility, and continuity as work moves between responsible teams.",
    sourceFacts: [
      "As a general design consideration, connect intake to a responsible owner and make the next handoff clear. Secure intake, role-based access, controlled communication, workflow tracking, and accountable issue resolution are the approved capability basis.",
      "At a workflow handoff, use controlled communication, documentation, and knowledge transfer to preserve context for the next owner. These are general design considerations for continuity between teams, not a claim that Ravi transfers live work.",
      "Use workflow tracking for visibility into progress and audit history for traceability across handoffs. Documentation and knowledge transfer support continuity as responsibility moves between teams.",
      "Customer-specific ownership assignments, permissions, integrations, and implementation details require a scoped review. This guidance does not authorize Ravi to access queues, modify tickets or workflows, execute production actions, or guarantee SLAs, resolution times, or compliance outcomes.",
    ],
    allowedClaims: [
      "Secure intake, clear ownership, controlled communication, and tracked handoffs are general workflow design considerations.",
      "Workflow tracking and audit history support visibility and traceability.",
      "Documentation and knowledge transfer support workflow and support continuity.",
    ],
    disallowedClaims: [
      "Workflow design establishes automated escalation or undocumented routing capabilities",
      "Ravi accesses queues, modifies tickets or workflows, or executes production actions",
      "Workflow design guarantees SLAs, resolution times, or compliance outcomes",
    ],
    unsupportedExtensions: [
      "Customer-specific permissions, ownership assignments, workflow configuration, or vendor integrations",
      "Guaranteed implementation timelines, prices, or operating outcomes",
    ],
    handoffGuidance:
      "Route customer-specific workflow design, ownership, access, integration, implementation, or SLA questions to care@onesmarter.com.",
    sourceReference: {
      type: "approved-operational-design-synthesis",
      route: "/technology-solutions/software-support-consolidation",
      sourceLabel: "General design considerations derived from approved secure-ticketing capabilities, Ravi claim qualifications, and Software Support Consolidation documentation and knowledge transfer.",
      sources: [
        { path: "src/data/agentKnowledge/onesmarterPublicKb.js", quote: "The platform supports secure intake, role-based access, audit history, controlled communication, and workflow tracking." },
        { path: "src/data/agentKnowledge/raviClaimRules.js", quote: "Secure intake, role-based access, controlled communication, workflow tracking, audit history, and accountable issue resolution can support a designed escalation or handoff process; confirm implementation details separately." },
        { path: "src/components/OfferingPage.jsx", quote: "OneSmarter helps organizations consolidate software support through Asia-based delivery centers, creating coordinated support models for maintenance, enhancements, documentation, and operational continuity." },
        { path: "src/components/OfferingPage.jsx", quote: "Documentation and knowledge transfer support." },
      ],
    },
  },
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
