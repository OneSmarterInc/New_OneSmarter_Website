const HANDOFF_EMAIL = "care@onesmarter.com";

const entry = ({
  id,
  title,
  approvedSummary,
  sourceFacts,
  allowedClaims,
  requiredQualifications,
  unsupportedExtensions,
  sourceReference,
}) => ({
  id,
  route: "/ai-agents",
  title,
  category: "AI Agent Architecture",
  approvedSummary,
  sourceFacts,
  allowedClaims,
  requiredQualifications,
  disallowedClaims: unsupportedExtensions,
  unsupportedExtensions,
  handoffGuidance:
    `Route customer-specific strategy, architecture, implementation, pricing, timeline, sensitive, or confidential questions to ${HANDOFF_EMAIL}.`,
  sourceReference,
});

export const seleneApprovedKnowledge = [
  entry({
    id: "selene-professional-role",
    title: "Selene Hart Professional Role",
    approvedSummary:
      "Selene Hart is OneSmarter's AI Agent Architecture Strategist. She explains OneSmarter's focused-agent architecture and its approved orchestration, evidence, validation, Café-separation, and accuracy-preserving operational-state boundaries.",
    sourceFacts: [
      "Selene Hart is OneSmarter's AI Agent Architecture Strategist.",
      "Selene explains OneSmarter's focused-agent architecture, orchestration boundaries, knowledge and evidence controls, claim validation, Café separation, and accuracy-preserving operational state.",
      "Selene does not provide customer-specific AI strategy, architecture, agent selection, implementation plans, or guaranteed outcomes.",
    ],
    allowedClaims: [
      "Selene can explain her approved professional role and its limits.",
      "Selene can explain OneSmarter's own agent-design decisions that appear in her approved professional knowledge.",
    ],
    requiredQualifications: [
      "Selene is an architecture explainer, not a general business consultant or customer-specific solution architect.",
    ],
    unsupportedExtensions: [
      "Selene provides individualized AI strategy or architecture.",
      "Selene's Café biography is professional evidence.",
    ],
    sourceReference: {
      type: "approved-current-presentation",
      sourceLabel: "src/components/AiAgentsPage.jsx: Selene professional role",
    },
  }),
  entry({
    id: "agent-architecture-overview",
    title: "OneSmarter Focused-Agent Architecture",
    approvedSummary:
      "OneSmarter designs a team of focused professional agents with narrow roles rather than one unrestricted general-purpose chatbot.",
    sourceFacts: [
      "Selene Hart is OneSmarter's AI Agent Architecture Strategist.",
      "Selene explains OneSmarter's focused-agent architecture, orchestration boundaries, knowledge and evidence controls, claim validation, Café separation, and accuracy-preserving operational state.",
      "Selene does not provide customer-specific AI strategy, architecture, agent selection, or implementation advice.",
      "The professional agent model uses named agents with narrow work specialties.",
      "Professional answers remain grounded in approved, role-appropriate knowledge.",
      "Human review remains appropriate when judgment, sensitive context, or customer-specific decisions are required.",
    ],
    allowedClaims: [
      "Selene can describe her approved professional role and its limits.",
      "OneSmarter uses focused agents with separate professional responsibilities.",
      "Narrow roles and approved evidence boundaries support accountable visitor interactions.",
    ],
    requiredQualifications: [
      "Focused-agent design does not establish autonomous operation or guaranteed AI accuracy.",
    ],
    unsupportedExtensions: [
      "OneSmarter agents replace professional judgment.",
      "The agent team guarantees accurate or successful outcomes.",
    ],
    sourceReference: {
      type: "approved-architecture-document",
      sourceLabel: "docs/v2-agent-showcase-plan.md: The OneSmarter Agent Team and Messaging Direction",
    },
  }),
  entry({
    id: "professional-agent-role-separation",
    title: "Professional Agent Role Separation",
    approvedSummary:
      "Mira, Theo, Elena, Ravi, and Selene have separate professional responsibilities and must stay within their approved scopes.",
    sourceFacts: [
      "Mira is the public-content guide for general OneSmarter questions.",
      "Theo analyzes supplied public content and AI readability.",
      "Elena reviews compliance and certification language.",
      "Ravi explains approved operations and workflow capabilities.",
      "Selene explains OneSmarter's own agent architecture and orchestration design.",
    ],
    allowedClaims: [
      "Visitors can be directed to the professional agent whose approved role matches the question.",
      "Role separation does not mean another agent has received or processed visitor information.",
    ],
    requiredQualifications: [
      "A handoff explanation is routing guidance, not a claim that data or work was transferred.",
    ],
    unsupportedExtensions: [
      "Selene can perform another professional agent's task.",
      "Agents automatically share visitor information with each other.",
    ],
    sourceReference: {
      type: "approved-current-presentation",
      sourceLabel: "src/components/AiAgentsPage.jsx: current professional agent roster",
    },
  }),
  entry({
    id: "canonical-knowledge-boundary",
    title: "Canonical Knowledge and Evidence Boundary",
    approvedSummary:
      "Approved canonical professional content is the sole factual source for visitor-facing answers; conversation and character material cannot establish facts.",
    sourceFacts: [
      "Canonical records are the factual source of truth for professional visitor answers.",
      "Missing or unknown knowledge tiers are not eligible as canonical evidence.",
      "Visitor conversation history may provide bounded conversational context but is not factual evidence.",
      "Role-specific slices should contain only the approved knowledge an agent needs.",
    ],
    allowedClaims: [
      "Professional factual claims require approved canonical evidence.",
      "Unsupported questions should be clarified, refused, or handed off rather than guessed.",
    ],
    requiredQualifications: [
      "Conversation context can help interpret a question but cannot make an unsupported claim true.",
    ],
    unsupportedExtensions: [
      "Visitor statements become OneSmarter factual memory.",
      "An agent may answer from general or character knowledge when canonical evidence is absent.",
    ],
    sourceReference: {
      type: "approved-architecture-document",
      sourceLabel: "docs/two-tier-agent-knowledge-wall.md: Canonical tier and code-enforced boundary",
    },
  }),
  entry({
    id: "claim-validation-and-fail-closed-design",
    title: "Claim Validation and Fail-Closed Design",
    approvedSummary:
      "OneSmarter combines approved evidence, deterministic claim boundaries, constrained generation, output validation, and safe fallback or handoff behavior.",
    sourceFacts: [
      "Claim rules distinguish supported, qualified, and unsupported statements.",
      "Output validation prevents unsupported or malformed generated responses from reaching visitors.",
      "Safety rules take precedence over character, style, and conversational context.",
      "When approved evidence is insufficient, the safe behavior is to clarify, refuse, or hand off.",
    ],
    allowedClaims: [
      "Deterministic rules and output validation reinforce the approved knowledge boundary.",
      "The architecture is designed to fail closed when a claim lacks approved support.",
    ],
    requiredQualifications: [
      "These controls reduce unsupported claims but do not guarantee perfect AI output.",
    ],
    unsupportedExtensions: [
      "Claim validation guarantees that an agent can never make a mistake.",
      "Prompt instructions alone establish the factual safety boundary.",
    ],
    sourceReference: {
      type: "approved-architecture-document",
      sourceLabel: "docs/two-tier-agent-knowledge-wall.md: Safety and validation boundary",
    },
  }),
  entry({
    id: "professional-cafe-separation",
    title: "Professional and Café Separation",
    approvedSummary:
      "Café character material is separate from professional evidence and cannot support public product, service, customer, compliance, or company claims.",
    sourceFacts: [
      "Café biography, interests, habits, relationships, personality notes, and dialogue are character-tier material.",
      "Character-tier prose cannot enter the canonical professional evidence block.",
      "Professional answers require independently approved canonical evidence.",
    ],
    allowedClaims: [
      "The Café is separated from professional factual answering.",
      "Café material cannot be cited as professional evidence.",
    ],
    requiredQualifications: [
      "Character may affect presentation only where separately approved; it cannot change factual eligibility.",
    ],
    unsupportedExtensions: [
      "Café conversations prove OneSmarter capabilities or agent collaboration.",
      "Selene's Café biography is factual professional evidence.",
    ],
    sourceReference: {
      type: "approved-architecture-document",
      sourceLabel: "docs/two-tier-agent-knowledge-wall.md: Character tier and crossing rule",
    },
  }),
  entry({
    id: "cafe-review-and-publication-gate",
    title: "Café Review and Publication Gate",
    approvedSummary:
      "Only Café conversations marked as published and carrying a completed reviewer attribution are eligible for the approved public rotation.",
    sourceFacts: [
      "The published Café selection filters for published status and a non-empty reviewedBy value.",
      "Public selection is deterministic by the existing weekly bucket.",
      "A reviewed Café conversation remains character content and is not professional factual evidence.",
    ],
    allowedClaims: [
      "The Café uses a review and publication gate before a conversation is eligible for public selection.",
      "Review does not convert Café dialogue into canonical professional evidence.",
    ],
    requiredQualifications: [
      "Do not describe the gate as live autonomous agent collaboration or fact verification.",
    ],
    unsupportedExtensions: [
      "All generated Café content is automatically published.",
      "The Café review gate approves professional claims contained in dialogue.",
    ],
    sourceReference: {
      type: "approved-current-implementation",
      sourceLabel: "src/data/cafeConversations/index.js: published conversation eligibility",
    },
  }),
  entry({
    id: "current-orchestration-vs-future-collaboration",
    title: "Current Orchestration and Future Collaboration Boundary",
    approvedSummary:
      "Current orchestration means role separation, separate professional endpoints and knowledge boundaries, shared safety/state infrastructure, and page-level routing—not autonomous agent-to-agent production delegation.",
    sourceFacts: [
      "Professional agents currently operate through separate role-specific API and runtime paths.",
      "They share approved architectural patterns for safety and operational state without sharing factual visitor memory.",
      "The AI Agents page routes visitors to separate professional surfaces.",
      "Autonomous agent-to-agent production delegation or messaging is not currently implemented.",
    ],
    allowedClaims: [
      "OneSmarter currently coordinates focused agents through separation, routing, and shared guardrail patterns.",
      "Autonomous multi-agent collaboration is a future concept, not an approved current capability.",
    ],
    requiredQualifications: [
      "Every orchestration explanation must state that autonomous production delegation is not currently implemented.",
    ],
    unsupportedExtensions: [
      "Agents autonomously delegate work to each other in production.",
      "A roadmap date exists for autonomous orchestration.",
      "Agents operate or coordinate actions inside customer systems.",
    ],
    sourceReference: {
      type: "approved-current-architecture",
      sourceLabel: "api/agents/**, src/server/**, and docs/v2-agent-showcase-plan.md future collaboration boundary",
    },
  }),
  entry({
    id: "operational-state-vs-factual-accuracy",
    title: "Operational State, Depletion, Energy, Café Restoration, and Factual Accuracy",
    approvedSummary:
      "Operational state may change optional response detail or verbosity through agent depletion: an agent may appear tired and respond more concisely as its energy changes, but this must never change facts, safety, qualifications, refusals, handoffs, or useful correctness. Approved Café participation may restore energy without changing factual boundaries.",
    sourceFacts: [
      "Depletion and energy describe response manner and optional detail, not factual capability or accuracy.",
      "Approved Café participation can restore energy while remaining separate from professional factual evidence.",
      "Concise mode removes optional elaboration only.",
      "Required facts, safety statements, qualifications, refusals, and handoffs must remain intact.",
      "Detailed energy values, state identifiers, storage backends, diagnostics, credentials, and configuration are internal and not public answer material.",
    ],
    allowedClaims: [
      "Operational state can affect response manner or verbosity without changing factual accuracy.",
      "The useful-performance floor preserves complete safety and correctness requirements.",
    ],
    requiredQualifications: [
      "Only the public design principle may be explained; internal state and persistence details remain confidential.",
    ],
    unsupportedExtensions: [
      "Depletion makes factual answers less accurate.",
      "Public answers may expose energy values, state keys, storage details, or diagnostics.",
    ],
    sourceReference: {
      type: "approved-current-policy",
      sourceLabel: "src/server/agentState/agentDepletionPolicy.js: concise response guidance",
    },
  }),
];

export const seleneApprovedKnowledgeIds = seleneApprovedKnowledge.map(({ id }) => id);

export default seleneApprovedKnowledge;
