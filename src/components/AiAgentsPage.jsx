import React from "react";

const agents = [
  {
    name: "Mira Vale",
    initials: "MV",
    title: "The OneSmarter Guide",
    role: "Website guide and first visitor-facing agent.",
    personality: "Warm, clear, composed, welcoming.",
    background: "Front-door guide for onboarding, executive briefings, and plain-language service explanations.",
    status: "First guide concept",
    accent: "bg-red-600",
    memoryThemes: ["Simple explanations", "Capability routing", "Trust language", "Email handoff"],
  },
  {
    name: "Theo Mercer",
    initials: "TM",
    title: "The Analyst",
    role: "AI readability and public website analysis.",
    personality: "Thoughtful, observant, precise.",
    background: "Reads websites through search behavior, AI-readability, and buyer-intent signals.",
    status: "Future scan concept",
    accent: "bg-sky-700",
    memoryThemes: ["Crawler view", "Metadata", "Service clarity", "Buyer signals"],
  },
  {
    name: "Elena Cross",
    initials: "EC",
    title: "The Compliance Reader",
    role: "Compliance and claim-boundary language review.",
    personality: "Careful, calm, serious when needed.",
    background: "Built around security questionnaires, vendor-risk language, and public trust claims.",
    status: "Future review concept",
    accent: "bg-zinc-800",
    memoryThemes: ["HIPAA boundaries", "SOC 2 boundaries", "Safer wording", "Review readiness"],
  },
  {
    name: "Ravi Sen",
    initials: "RS",
    title: "The Operations Agent",
    role: "Workflow, ticketing, escalation, and process design.",
    personality: "Practical, direct, grounded.",
    background: "Shaped by operations rooms, service backlogs, audit trails, and process handoffs.",
    status: "Future workflow concept",
    accent: "bg-red-800",
    memoryThemes: ["Case management", "Ticket routing", "Escalations", "Audit trails"],
  },
  {
    name: "Selene Hart",
    initials: "SH",
    title: "The Strategist",
    role: "Business strategy and agent-orchestration thinker.",
    personality: "Creative, reflective, composed.",
    background: "Connects transformation programs, operating models, and technical capability to business direction.",
    status: "Future strategy concept",
    accent: "bg-slate-700",
    memoryThemes: ["AI adoption", "Positioning", "Collaboration", "Executive outcomes"],
  },
];

const visitorQuestions = [
  "What does OneSmarter do?",
  "What platforms do you offer?",
  "Do you work with healthcare organizations?",
  "What does SOC 2 Type II Attested mean here?",
  "How should I contact OneSmarter?",
];

const scenes = [
  ["Coffee Break", "Agents compare a market trend and decide what matters to clients."],
  ["Chess Strategy", "Selene frames the next move while Theo tests the signal."],
  ["Operations Room", "Ravi reviews ownership, audit trail, and handoff gaps."],
  ["Trust Review Table", "Elena checks public claims against evidence-based wording."],
  ["Agent Feed", "Short observations, site notes, and workflow signals surface over time."],
  ["Private Messages", "Agents exchange context before bringing a cleaner answer forward."],
  ["Morning Briefing", "The team aligns on client questions, risks, and useful next steps."],
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

const AgentNetwork = () => (
  <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-white/10 bg-black/45 p-6 shadow-2xl shadow-black/40">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.20),transparent_52%)]" />
    <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/30" />
    <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
    <div className="relative grid h-full min-h-[300px] place-items-center">
      <div className="absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 bg-white/15" />
      <div className="absolute left-1/2 top-1/2 h-[72%] w-px -translate-y-1/2 bg-white/15" />
      <div className="absolute left-[22%] top-[24%] h-px w-[56%] rotate-45 bg-white/10" />
      <div className="absolute left-[22%] top-[74%] h-px w-[56%] -rotate-45 bg-white/10" />

      {agents.map((agent, index) => {
        const positions = [
          "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "left-[10%] top-[18%]",
          "right-[10%] top-[18%]",
          "left-[12%] bottom-[16%]",
          "right-[12%] bottom-[16%]",
        ];
        const isMira = agent.name === "Mira Vale";

        return (
          <div
            key={agent.name}
            className={`absolute ${positions[index]} ${isMira ? "z-20" : "z-10"}`}
          >
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full border text-sm font-bold shadow-lg ${
                isMira
                  ? "border-red-400 bg-red-600 text-white shadow-red-950/60"
                  : "border-white/15 bg-zinc-900 text-zinc-200"
              }`}
            >
              {agent.initials}
            </div>
            <p className="mt-2 w-24 text-center text-xs font-semibold text-zinc-200">
              {agent.name.split(" ")[0]}
            </p>
          </div>
        );
      })}
    </div>
    <div className="relative mt-4 rounded-md border border-red-500/20 bg-zinc-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
        Mira highlighted
      </p>
      <p className="mt-1 text-sm leading-6 text-zinc-300">
        First guide concept, connected to future analysis, compliance,
        operations, and strategy agents.
      </p>
    </div>
  </div>
);

const AgentCard = ({ agent }) => (
  <article className="group flex min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg">
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${agent.accent} text-sm font-bold text-white`}>
          {agent.initials}
        </div>
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold">{agent.name}</h3>
          <p className="mt-1 text-sm font-semibold text-red-600">{agent.title}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-zinc-950 px-3 py-1 text-[11px] font-semibold text-white">
        {agent.status}
      </span>
    </div>

    <p className="mt-5 text-sm font-semibold text-zinc-950">{agent.role}</p>
    <p className="mt-2 text-sm text-gray-600">{agent.personality}</p>
    <p className="mt-4 text-sm leading-6 text-gray-700">{agent.background}</p>

    <div className="mt-5 flex flex-wrap gap-2">
      {agent.memoryThemes.map((theme) => (
        <span key={theme} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {theme}
        </span>
      ))}
    </div>
  </article>
);

const AiAgentsPage = () => {
  return (
    <main className="overflow-x-hidden bg-zinc-950 text-white">
      <section className="relative px-5 pb-20 pt-36 md:px-12 md:pb-24 md:pt-48">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.25),transparent_34%),linear-gradient(135deg,#050505_0%,#151515_55%,#070707_100%)]" />
        <div className="qa-container relative mx-auto grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-red-400">
              AI Agents
            </p>
            <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-4xl md:text-6xl">
              Practical AI Agents for Secure, Accountable Workflows
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-lg">
              OneSmarter is building a digital team of AI agents that can
              explain, review, analyze, and collaborate around real business
              workflows. The first task is simple: help visitors understand
              OneSmarter using approved public website content.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-zinc-200">
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2">
                Static V2 concept
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2">
                First guide: Mira
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2">
                Public website content
              </span>
            </div>
          </div>

          <AgentNetwork />
        </div>
      </section>

      <section className="bg-white px-5 py-16 text-black md:px-12">
        <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
              First guide
            </p>
            <h2 className="text-2xl font-bold md:text-4xl">
              Meet Mira Vale, the OneSmarter Guide
            </h2>
            <p className="mt-4 leading-7 text-gray-700">
              Mira is the first visitor-facing agent concept. She answers
              questions about OneSmarter from approved public website content,
              helping visitors understand platforms, technology services,
              business services, compliance readiness, and the Trust Center.
            </p>
            <a
              href="mailto:care@onesmarter.com"
              className="mt-7 inline-flex rounded bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Email OneSmarter
            </a>
          </div>

          <div className="rounded-lg border border-gray-200 bg-[#f6f7f9] p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white">
                MV
              </div>
              <div>
                <h3 className="text-xl font-semibold">Mira Vale</h3>
                <p className="text-sm font-semibold text-red-600">
                  The OneSmarter Guide
                </p>
              </div>
            </div>
            <blockquote className="mt-6 border-l-4 border-red-600 pl-5 text-lg leading-8 text-zinc-900">
              "Hi, I'm Mira, OneSmarter's AI guide. I can help you understand
              our platforms, technology services, business services, and trust
              center. What would you like to know first?"
            </blockquote>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f7f9] px-5 py-16 text-black md:px-12">
        <div className="qa-container mx-auto">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
              Meet the OneSmarter Agents
            </p>
            <h2 className="text-2xl font-bold md:text-4xl">
              Character-driven roles for focused work
            </h2>
            <p className="mt-4 leading-7 text-gray-700">
              The agent team is designed around clear roles, useful memory
              themes, and narrow work specialties rather than a generic chatbot
              surface.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.name} agent={agent} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 text-black md:px-12">
        <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[1fr_0.75fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
              First task
            </p>
            <h2 className="text-2xl font-bold md:text-3xl">
              Start simple: ask Mira about OneSmarter
            </h2>
            <p className="mt-4 leading-7 text-gray-700">
              The first practical activity is a public-content guide pattern:
              answer ordinary visitor questions clearly and route business
              inquiries to care@onesmarter.com.
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
          </div>

          <aside className="rounded-lg border border-gray-200 bg-[#f6f7f9] p-6 md:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
              Guardrails
            </p>
            <ul className="flex flex-wrap gap-2 text-sm text-gray-700">
              {guardrails.map((guardrail) => (
                <li key={guardrail} className="rounded-full bg-white px-3 py-2 shadow-sm">
                  {guardrail}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="bg-zinc-950 px-5 py-16 text-white md:px-12">
        <div className="qa-container mx-auto">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr]">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">
                Agent world vision
              </p>
              <h2 className="text-2xl font-bold md:text-4xl">
                Future collaboration scenes
              </h2>
              <p className="mt-4 leading-7 text-zinc-300">
                The long-term direction is a controlled agent world where agents
                exchange observations, bring useful context into human-facing
                conversations, and make complex workflow ideas easier to grasp.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {scenes.map(([scene, description]) => (
                <div
                  key={scene}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="mb-4 h-1.5 w-12 rounded-full bg-red-600" />
                  <h3 className="font-semibold text-white">{scene}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 rounded-lg border border-white/10 bg-black/40 p-6 md:p-8">
            <h3 className="text-xl font-semibold">Sample exchange</h3>
            <div className="mt-5 grid gap-4">
              {exchange.map(([speaker, line]) => (
                <div
                  key={speaker}
                  className="rounded-md border border-white/10 bg-zinc-900/80 p-4 text-sm leading-6 text-zinc-200"
                >
                  <span className="font-semibold text-red-300">{speaker}: </span>
                  {line}
                </div>
              ))}
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
