# OneSmarter V2 Agent Showcase Plan

## Version 2 Goal

Version 2 introduces a public-facing Agent Showcase that demonstrates OneSmarter's practical AI approach without changing the Version 1 production launch architecture. The goal is to show focused, secure, narrow workflow agents that help prospective clients understand how OneSmarter applies AI to real operational problems.

The first release should be a static prototype layer only. It should not collect files, call live AI APIs, process PHI, or introduce backend dependencies.

## North Star: From Chatbot to Agent Team

OneSmarter's long-term AI direction is a digital team of agents, not a single chatbot. The agents can have roles, visual presence, voices, fictional backgrounds, memory triggers, emotional posture, and work specialties. Over time, they may collaborate with each other, exchange notes, appear in controlled visual scenes, and bring useful context back into human-facing conversations.

The first V2 expression should stay simple: introduce the agent team statically, explain the roles clearly, and make Mira Vale the first visitor-facing guide concept. The broader agent society, visual scenes, voice, memory engine, video-style moments, and agent-to-agent messaging belong in future phases after content, privacy, and security boundaries are approved.

## Target Audience

- Healthcare, financial, telecom, and growing organizations evaluating practical AI and automation support.
- Enterprise buyers who need clear trust, compliance, and vendor-readiness signals.
- Operations, technology, and compliance leaders looking for narrow workflow agents rather than broad AI claims.
- Prospects who need a simple path to contact OneSmarter at care@onesmarter.com.

## Proposed Navigation Changes

Navigation changes are proposed only and should not be implemented until approved in a later work package.

- Add a top-level navigation item named `AI Agents` or `Agent Showcase`.
- Keep current V1 navigation intact until the V2 section is ready.
- Do not restore `Contact` or `Insights` to navigation.
- Do not change the approved platform list.
- Keep inquiry CTAs routed to `mailto:care@onesmarter.com`.

## Proposed New Section Name

Recommended public section name: `AI Agents`

Alternative label: `Agent Showcase`

Rationale: `AI Agents` is direct and searchable, while the page copy can keep the positioning grounded by emphasizing practical, secure, narrow workflow agents.

## Recommended Routes

These are candidate routes only. Do not implement these routes until a later work package approves page creation.

| Route | Purpose | Initial State |
| --- | --- | --- |
| `/ai-agents` | Agent Showcase landing page | Proposed |
| `/ai-agents/website-guide` | OneSmarter Website Guide Agent concept | Proposed |
| `/ai-agents/ai-readability-scan` | AI Readability Scan concept | Proposed |
| `/ai-agents/trust-center-readiness` | Trust Center Readiness Scan concept | Proposed |
| `/ai-agents/compliance-language-review` | Compliance Language Review concept | Proposed |

## The OneSmarter Agent Team

### Mira Vale - The OneSmarter Guide

Role: Website guide and first visitor-facing agent.

Personality: Warm, clear, composed, welcoming.

Background: Mira was designed as the front door to OneSmarter. Her fictional history is rooted in client onboarding, executive briefings, and helping nontechnical visitors understand complex services without jargon.

Memory themes:

- Explaining technical services simply.
- Helping visitors find the right OneSmarter capability.
- Clarifying trust, compliance, and security language.
- Routing inquiries to care@onesmarter.com.

First task: Answer visitor questions about OneSmarter from approved public website content.

### Maya Renshaw - The Client Navigator

Role: Helps visitors figure out where to start and which OneSmarter capability fits their problem.

Personality: Warm, perceptive, practical, slightly conversational.

Background: Maya's fictional background is in client onboarding, service discovery, and early-stage problem framing. She is good at listening to a visitor describe a messy situation and turning it into a clearer path: platform, technology service, business service, compliance review, or human follow-up.

Memory themes:

- First conversations with new clients.
- Turning vague problems into clear next steps.
- Recognizing when a visitor needs a platform versus a service.
- Routing sensitive or business-specific questions to care@onesmarter.com.

How she speaks:

> "Let's not start with the solution. Tell me what is frustrating, slow, risky, or unclear - then I'll help you find the right OneSmarter path."

Future task: Maya could become the intake/routing agent. She asks the first few questions and then introduces Mira, Theo, Elena, Ravi, or Selene depending on what the visitor needs.

### Theo Mercer - The Analyst

Role: AI readability and public website analysis.

Personality: Thoughtful, observant, precise.

Background: Theo's fictional background is in digital research, search behavior, AI-readability, and buyer-intent signals. He notices missing metadata, unclear service categories, weak trust signals, broken sitemap logic, and whether AI systems can understand a company's site.

Memory themes:

- Reading websites like an AI crawler.
- Checking `llms.txt`, `sitemap.xml`, `robots.txt`, and metadata.
- Spotting unclear service categories.
- Noticing whether a company is understandable to buyers and AI agents.

Future task: AI Readability Scan.

### Elena Cross - The Compliance Reader

Role: Compliance and claim-boundary language review.

Personality: Careful, calm, serious when needed.

Background: Elena's fictional history is built around security questionnaires, compliance reviews, vendor-risk language, and public-facing trust claims.

Memory themes:

- HIPAA wording boundaries.
- SOC 2 wording boundaries.
- Avoiding unsupported certification claims.
- Rewriting risky phrases into safer language.
- Preparing language for buyer and security-team review.

Future task: Compliance Language Review.

### Ravi Sen - The Operations Agent

Role: Workflow, ticketing, escalation, and process design.

Personality: Practical, direct, grounded.

Background: Ravi's fictional experience comes from operations rooms: tickets, escalations, service backlogs, audit trails, claims workflows, payment issues, and process handoffs.

Memory themes:

- Case management.
- Ticket routing.
- Escalation ownership.
- Audit trails.
- Back-office workflows.
- Claims and operational support processes.

Future task: Workflow readiness and secure ticketing explanation.

### Selene Hart - The Strategist

Role: Business strategy and agent-orchestration thinker.

Personality: Creative, reflective, composed.

Background: Selene's fictional background is in strategic planning, transformation programs, digital operating models, and translating technical capability into business direction.

Memory themes:

- Business model implications.
- AI adoption strategy.
- Service positioning.
- Multi-agent collaboration.
- Connecting technical work to executive outcomes.

Future task: Agent strategy, buyer education, and future AI roadmap.

## Agent World and Scene Concepts

These concepts are future visual and narrative directions only. They should not be implemented in the first V2 page unless separately approved.

- Agents on a coffee break discussing a trend.
- Agents playing chess while discussing strategy.
- Agents in an operations room reviewing a workflow.
- Agents around a trust-review table.
- An agent feed with posts and observations.
- Private agent-to-agent messages.
- A morning briefing among agents.

Sample exchange:

> Theo: "The service page is readable, but the trust signal is buried too low."
>
> Elena: "And the HIPAA phrasing needs to stay evidence-based."
>
> Ravi: "If the service creates tickets, ownership and audit history should be visible."
>
> Selene: "That is the story: not just AI, but accountable workflow."
>
> Mira: "Good. I can explain that simply when a visitor asks."

## Agent Mood Signal and Expression States

The `/ai-agents` page now includes a compact deterministic Mood Signal panel for Mira's conversation posture. This is a controlled presentation layer, not an open-ended emotional simulation or psychological assessment.

Example posture dimensions:

- Welcoming
- Curious
- Helpful
- Thoughtful
- Careful
- Concerned
- Confident

The state is derived in the frontend from existing endpoint metadata such as risk flags, handoff status, confidence, grounding status, fallback status, and loading/error state. No model-generated arbitrary emotions are accepted.

Example mappings:

| Conversation context | Possible posture |
| --- | --- |
| General company question | Helpful / Welcoming |
| HIPAA or SOC wording question | Careful / Thoughtful |
| PHI or confidential data question | Concerned / Careful |
| Strategy question | Curious / Thoughtful |
| Successful grounded answer | Confident / Helpful |

Future implementation path:

| Phase | Scope |
| --- | --- |
| Mood P1 | Implemented: deterministic mood-signal panel in `/ai-agents`. |
| Mood P2 | Implemented: derives mood state from endpoint metadata such as `riskFlags`, `confidence`, and `handoffNeeded`. |
| Mood P3 | Implemented in lightweight form: simple expression-state visual without video or avatar implementation. |
| Mood P4 | Connect expression state to a future voice/avatar layer. |
| Mood P5 | Allow a real LLM to propose `presentationState`, but only through strict allowed-value validation. |

## Agent Concepts

### OneSmarter Website Guide Agent

Associated agent: Mira Vale.

Purpose: Help visitors understand OneSmarter using approved public website content only.

Planned behavior:

- Answers questions from approved public website content only.
- Explains services, platforms, Trust Center content, and the contact path.
- Routes business inquiries to care@onesmarter.com.
- Refuses or redirects questions about legal advice, medical advice, private data, security certification guarantees, or unsupported compliance claims.
- Preserves existing HIPAA and SOC 2 claim boundaries.

Initial implementation: static prototype copy and interaction mockup only.

### AI Readability Scan

Associated agent: Theo Mercer.

Purpose: Show how OneSmarter can evaluate whether a website is understandable to AI agents and search systems.

Planned checks:

- `llms.txt`
- `sitemap.xml`
- `robots.txt`
- Metadata and page titles
- Service clarity
- Trust and compliance language
- Clear contact path
- Avoidance of confusing or unsupported claims

Initial implementation: static prototype only, with sample results and no submitted URLs or live scanning.

### Trust Center Readiness Scan

Associated agents: Theo Mercer and Elena Cross.

Purpose: Demonstrate a lightweight buyer-readiness review for enterprise trust and compliance signals.

Planned checks:

- Privacy policy presence and clarity
- Security practices content
- SOC and HIPAA wording boundaries
- Trust Center structure
- Contact path
- Vendor-review readiness
- Evidence-oriented language

Initial implementation: static prototype only, with sample output.

### Compliance Language Review

Associated agent: Elena Cross.

Purpose: Help organizations identify risky public compliance wording and replace it with safer, more factual language.

Risky wording examples to flag:

- Unsupported HIPAA certification language
- `fully compliant`
- `guaranteed secure`
- Unsupported SOC 2 certification language
- Unsupported certification, attestation, or compliance claims

Safer wording should emphasize readiness, assessment, support, factual posture, evidence preparation, and documented controls where applicable.

Initial implementation: static prototype only, with example before/after language.

### Agent Showcase Page

Purpose: Explain OneSmarter's practical AI approach.

Messaging direction:

- Secure, narrow, useful workflow agents.
- Practical AI for operations, trust, compliance readiness, and business process clarity.
- Human review where judgment, compliance, or client-specific context matters.
- No hype, broad replacement claims, or unsupported compliance promises.
- Introduce the named agent team as fictionalized public-facing role concepts, not autonomous live employees.

## Implementation Phases

| Phase | Scope | Notes |
| --- | --- | --- |
| Phase 1 | Planning document | Current work package only |
| Phase 2 | Static named-agent showcase page | Introduce Mira, Theo, Elena, Ravi, and Selene without live agent behavior |
| Phase 3 | Static prototype cards | Add non-interactive or limited interactive mockups for scan concepts |
| Phase 4 | Mira guide prototype | Mira is the first live or simulated guide and uses approved public website content only |
| Phase 5 | Future capability introductions | Theo, Elena, Ravi, and Selene remain future capabilities until scope and safety are approved |
| Phase 6 | Evaluation and governance | Review legal, privacy, security, and content boundaries before any live agent release |
| Phase 7 | Optional live AI integration | Only after backend, logging, consent, safety, and privacy requirements are approved |
| Phase 8 | Agent world visuals and collaboration | Agent society visuals, voice, memory engine, video-style scenes, and agent-to-agent messaging are future phases |

## Agent Expansion Roadmap

New OneSmarter agents should be added in deliberate layers so the public concept, safety model, and implementation maturity stay aligned.

| Layer | Scope | Requirements |
| --- | --- | --- |
| Layer 1 | Static concept only | Name, role, personality, background, memory themes, speaking style, and future task. |
| Layer 2 | Page presence | Agent card, scene appearance, or static roster mention. No behavior implied beyond the approved concept. |
| Layer 3 | Mock behavior | Deterministic local harness or scripted interaction. No real AI call, uploads, private data, or unreviewed claims. |
| Layer 4 | Endpoint behavior | Production-shaped endpoint contract with validation, logging, rate limits, safe errors, and test coverage. |
| Layer 5 | Live model behavior | Only after approved KB, claim rules, validator, local harness, mock endpoint, safety controls, UI wiring, QA, and review. |

Maya should start at Layer 1 only. Mira remains the only active endpoint agent until a future package explicitly approves another staged agent implementation.

## Guardrails

- No PHI.
- No confidential uploads.
- No public file upload.
- No legal advice.
- No medical advice.
- No security certification promises.
- No claims of guaranteed compliance.
- No real AI API calls in the first release.
- No backend dependencies in the first release.
- Use only approved public content in the first release.
- Preserve Version 1 HIPAA and SOC 2 claim boundaries.
- Do not use unsupported HIPAA certification phrasing, outdated ticketing labels, or common HIPAA misspellings.
- Do not reintroduce `Contact` or `Insights` to navigation.
- Do not reintroduce Telecom Expense Management as a standalone platform.
- Route inquiries to care@onesmarter.com.

## Risks

| Risk | Mitigation |
| --- | --- |
| Visitors interpret static prototypes as live tools | Clearly present prototypes as examples until live behavior is approved |
| AI outputs could imply legal, medical, or compliance advice | Use strict copy boundaries, refusal patterns, and human contact routing |
| Agent claims could overstate capability | Keep language grounded in narrow workflow support and practical assistance |
| Public scans could invite sensitive input | Do not add uploads, URL submission, or free-text analysis until privacy and security review |
| V2 work could disturb V1 launch readiness | Keep V2 isolated on `v2/agent-showcase` and avoid V1 launch files unless explicitly approved |

## Intentionally Out Of Scope

- Route implementation.
- Navigation implementation.
- Live AI API calls.
- Backend services.
- Public file upload.
- URL submission or live website scanning.
- Persistent chat history.
- User authentication.
- Storage of visitor prompts.
- Changes to legal/privacy pages.
- Security header changes.
- Changes to the Version 1 homepage hero.
- Changes to HIPAA/SOC wording.
- Contact or Insights navigation changes.
- New service categories.

## Recommended Next Work Package

Work Package V2-1 should create a static `/ai-agents` Agent Showcase page on the `v2/agent-showcase` branch only. It should introduce the named agent team, feature Mira Vale as the first guide concept, include cards for Maya, Theo, Elena, Ravi, and Selene as future capabilities, keep all CTAs as `mailto:care@onesmarter.com`, and avoid live scanning, uploads, voice, video, backend dependencies, or AI API calls.
