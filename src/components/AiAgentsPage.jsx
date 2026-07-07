import React from "react";

const agents = [
  {
    name: "Mira Vale",
    title: "The OneSmarter Guide",
    role: "Website guide and first visitor-facing agent.",
    personality: "Warm, clear, composed, welcoming.",
    background:
      "Designed as the front door to OneSmarter, with a fictional history rooted in client onboarding, executive briefings, and explaining complex services without jargon.",
    status: "First guide concept",
    memoryThemes: [
      "Explaining technical services simply",
      "Helping visitors find the right OneSmarter capability",
      "Clarifying trust, compliance, and security language",
      "Routing inquiries to care@onesmarter.com",
    ],
  },
  {
    name: "Theo Mercer",
    title: "The Analyst",
    role: "AI readability and public website analysis.",
    personality: "Thoughtful, observant, precise.",
    background:
      "Built around digital research, search behavior, AI-readability, and buyer-intent signals.",
    status: "Future scan concept",
    memoryThemes: [
      "Reading websites like an AI crawler",
      "Checking llms.txt, sitemap.xml, robots.txt, and metadata",
      "Spotting unclear service categories",
      "Noticing whether a company is understandable to buyers and AI agents",
    ],
  },
  {
    name: "Elena Cross",
    title: "The Compliance Reader",
    role: "Compliance and claim-boundary language review.",
    personality: "Careful, calm, serious when needed.",
    background:
      "Built around security questionnaires, compliance reviews, vendor-risk language, and public-facing trust claims.",
    status: "Future review concept",
    memoryThemes: [
      "HIPAA wording boundaries",
      "SOC 2 wording boundaries",
      "Avoiding unsupported certification claims",
      "Rewriting risky phrases into safer language",
      "Preparing language for buyer and security-team review",
    ],
  },
  {
    name: "Ravi Sen",
    title: "The Operations Agent",
    role: "Workflow, ticketing, escalation, and process design.",
    personality: "Practical, direct, grounded.",
    background:
      "Built around operations rooms: tickets, escalations, service backlogs, audit trails, claims workflows, payment issues, and process handoffs.",
    status: "Future workflow concept",
    memoryThemes: [
      "Case management",
      "Ticket routing",
      "Escalation ownership",
      "Audit trails",
      "Back-office workflows",
      "Claims and operational support processes",
    ],
  },
  {
    name: "Selene Hart",
    title: "The Strategist",
    role: "Business strategy and agent-orchestration thinker.",
    personality: "Creative, reflective, composed.",
    background:
      "Built around strategic planning, transformation programs, digital operating models, and translating technical capability into business direction.",
    status: "Future strategy concept",
    memoryThemes: [
      "Business model implications",
      "AI adoption strategy",
      "Service positioning",
      "Multi-agent collaboration",
      "Connecting technical work to executive outcomes",
    ],
  },
];

const visitorQuestions = [
  "What does OneSmarter do?",
  "What platforms do you offer?",
  "Do you work with healthcare organizations?",
  "What does SOC 2 Type II Attested mean here?",
  "How should I contact OneSmarter?",
];

const sceneConcepts = [
  "Coffee-break conversations",
  "Chess-game strategy discussions",
  "Operations-room workflow reviews",
  "Trust-review table discussions",
  "Agent feed posts",
  "Private agent-to-agent messages",
  "Morning briefings",
];

const capabilities = [
  "Persona and voice layer",
  "Background-driven memory",
  "Empathy-aware presentation",
  "Agent-to-agent collaboration",
  "Public-content website guide",
  "AI readability scan",
  "Trust center readiness scan",
  "Compliance language review",
];

const guardrails = [
  "Approved public content only",
  "No PHI",
  "No confidential uploads",
  "No legal or medical advice",
  "No compliance guarantees",
  "Business inquiries route to care@onesmarter.com",
];

const exchange = [
  ["Theo", "The service page is readable, but the trust signal is buried too low."],
  ["Elena", "And the HIPAA phrasing needs to stay evidence-based."],
  ["Ravi", "If the service creates tickets, ownership and audit history should be visible."],
  ["Selene", "That is the story: not just AI, but accountable workflow."],
  ["Mira", "Good. I can explain that simply when a visitor asks."],
];

const AiAgentsPage = () => {
  return (
    <main className="overflow-x-hidden bg-zinc-950 text-white">
      <section className="relative px-5 pb-20 pt-36 md:px-12 md:pb-24 md:pt-48">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.22),transparent_35%),linear-gradient(135deg,#050505_0%,#151515_55%,#070707_100%)]" />
        <div className="qa-container-narrow relative mx-auto">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-red-400">
            AI Agents
          </p>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-4xl md:text-6xl">
            Practical AI Agents for Secure, Accountable Workflows
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-lg">
            OneSmarter is building a digital team of AI agents that can explain,
            review, analyze, and collaborate around real business workflows. The
            first task is simple: help visitors understand OneSmarter using
            approved public website content.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-zinc-200">
            <span className="rounded-full border border-white/15 px-4 py-2">
              Static V2 concept
            </span>
            <span className="rounded-full border border-white/15 px-4 py-2">
              Public content only
            </span>
            <span className="rounded-full border border-white/15 px-4 py-2">
              No live chat yet
            </span>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 text-black md:px-12">
        <div className="qa-container mx-auto">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
              Meet the OneSmarter Agents
            </p>
            <h2 className="text-2xl font-bold md:text-4xl">
              A named digital team, not a generic chatbot
            </h2>
            <p className="mt-4 leading-7 text-gray-700">
              Each agent has a focused role, a clear posture, and a narrow work
              specialty. The team is designed around practical business context:
              explaining services, reading public websites, reviewing trust
              language, understanding workflow, and connecting technical work to
              executive outcomes.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {agents.map((agent) => (
              <article
                key={agent.name}
                className="flex min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{agent.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-red-600">
                      {agent.title}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">
                    {agent.status}
                  </span>
                </div>

                <dl className="mt-5 space-y-4 text-sm leading-6 text-gray-700">
                  <div>
                    <dt className="font-semibold text-black">Role</dt>
                    <dd>{agent.role}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-black">Personality</dt>
                    <dd>{agent.personality}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-black">Background</dt>
                    <dd>{agent.background}</dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <h4 className="text-sm font-semibold text-black">
                    Memory themes
                  </h4>
                  <ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                    {agent.memoryThemes.map((theme) => (
                      <li key={theme} className="rounded bg-gray-50 px-3 py-2">
                        {theme}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f7f9] px-5 py-16 text-black md:px-12">
        <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-lg bg-white p-6 shadow-sm md:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
              First task
            </p>
            <h2 className="text-2xl font-bold md:text-3xl">
              Ask Mira about OneSmarter
            </h2>
            <p className="mt-4 leading-7 text-gray-700">
              Mira answers questions about OneSmarter from approved public
              website content. The first release does not include live chat, but
              this is the intended public-content guide pattern for future work.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {visitorQuestions.map((question) => (
                <div
                  key={question}
                  className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-800"
                >
                  {question}
                </div>
              ))}
            </div>
            <a
              href="mailto:care@onesmarter.com"
              className="mt-8 inline-flex rounded bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Email OneSmarter
            </a>
          </div>

          <aside className="rounded-lg border border-red-900/40 bg-zinc-950 p-6 text-white shadow-sm md:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">
              Guardrails for first release
            </p>
            <ul className="space-y-3 text-sm leading-6 text-zinc-200">
              {guardrails.map((guardrail) => (
                <li key={guardrail} className="border-b border-white/10 pb-3">
                  {guardrail}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="bg-white px-5 py-16 text-black md:px-12">
        <div className="qa-container mx-auto">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr]">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
                Agent world vision
              </p>
              <h2 className="text-2xl font-bold md:text-4xl">
                Future collaboration scenes
              </h2>
              <p className="mt-4 leading-7 text-gray-700">
                The long-term direction is a controlled agent world where agents
                exchange observations, bring useful context into human-facing
                conversations, and make complex workflow ideas easier to grasp.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {sceneConcepts.map((scene) => (
                  <div
                    key={scene}
                    className="rounded-md border border-gray-200 px-4 py-3 text-sm font-medium"
                  >
                    {scene}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-zinc-950 p-6 text-white md:p-8">
              <h3 className="text-xl font-semibold">Sample exchange</h3>
              <div className="mt-5 space-y-4">
                {exchange.map(([speaker, line]) => (
                  <blockquote
                    key={speaker}
                    className="border-l-2 border-red-500 pl-4 text-sm leading-6 text-zinc-200"
                  >
                    <span className="font-semibold text-white">{speaker}: </span>
                    {line}
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f7f9] px-5 py-16 text-black md:px-12">
        <div className="qa-container mx-auto">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
            Capabilities we are building toward
          </p>
          <h2 className="text-2xl font-bold md:text-4xl">
            Narrow, useful agent patterns
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((capability) => (
              <div
                key={capability}
                className="rounded-lg border border-gray-200 bg-white p-5 text-sm font-semibold shadow-sm"
              >
                {capability}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default AiAgentsPage;
