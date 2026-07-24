import React, { useEffect, useRef, useState } from "react";
import {
  MIRA_MOOD_SIGNAL_KEYS,
  deriveMiraPresentationState,
} from "../data/agentPresentation/miraPresentationState.js";
import { formatMiraAnswerBlocks as formatStructuredMiraAnswerBlocks } from "../data/agentPresentation/miraAnswerFormatter.js";
import {
  MIRA_ALLOWED_VOICE_STYLES,
  MIRA_LANGUAGE_DEMOS,
  isAvailableMiraVoiceSample,
  miraVoiceSamples,
} from "../data/agentPresentation/miraVoiceSamples.js";
import { getMiraVisualStateForPosture } from "../data/agentPresentation/miraVisualStates.js";

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

const conversationExamples = [
  {
    question: "What does OneSmarter do?",
    answer:
      "OneSmarter builds secure platforms, practical AI workflows, business services, and compliance readiness support for healthcare, financial, telecom, and growing organizations. The work is grounded in useful systems, trusted execution, and careful claim boundaries.",
  },
  {
    question: "What platforms do you offer?",
    answer:
      "OneSmarter currently presents two platform areas: Secure Ticketing and Case Management, and Bill Audit & Bill Pay. Telecom expense management is treated as a capability within Bill Audit & Bill Pay rather than a separate platform.",
  },
  {
    question: "Do you work with healthcare organizations?",
    answer:
      "Yes. OneSmarter's experience includes healthcare workflows, claims-processing services, TPA support, secure case management, and compliance-aware operations. For specific healthcare or regulated-workflow questions, the right next step is to contact care@onesmarter.com.",
  },
  {
    question: "What does SOC 2 Type II Attested mean here?",
    answer:
      "OneSmarter uses the phrase SOC 2 Type II Attested to describe its trust posture. The Trust Center provides more context. For formal vendor, security, or procurement review, OneSmarter should provide the appropriate evidence through a direct business process.",
  },
  {
    question: "Are you HIPAA certified?",
    answer:
      "A safer way to say this is that OneSmarter has completed a HIPAA Security Rule compliance assessment. OneSmarter does not present this as HIPAA certification. For regulated workflows, the Trust Center and a direct business review are the right next steps.",
  },
  {
    question: "How should I contact OneSmarter?",
    answer: "For business inquiries, email care@onesmarter.com.",
  },
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

const personaOptions = ["Warm Guide", "Careful Reviewer", "Thoughtful Strategist"];
const memoryOptions = ["Client onboarding", "Trust language", "Capability routing"];
const empathyOptions = ["Welcoming", "Serious", "Pondering"];

const personaResponses = {
  "Warm Guide|Client onboarding|Welcoming":
    "Welcome. Let's start with what you are trying to understand. I can explain OneSmarter's platforms, technology services, business services, and trust center in plain language.",
  "Careful Reviewer|Trust language|Serious":
    "This is a trust-related question, so I would keep the wording precise. OneSmarter uses evidence-based language such as SOC 2 Type II Attested and HIPAA Security Rule Compliance Assessment Completed, rather than unsupported certification claims.",
  "Thoughtful Strategist|Capability routing|Pondering":
    "The right starting point depends on the problem. If the visitor is asking about secure workflows, I would route them toward Secure Ticketing and Case Management. If they are asking about payments, telecom bills, or vendor invoices, I would point them toward Bill Audit & Bill Pay.",
};

const exchange = [
  ["Theo", "The service page is readable, but the trust signal is buried too low."],
  ["Elena", "And the HIPAA phrasing needs to stay evidence-based."],
  ["Ravi", "If the service creates tickets, ownership and audit history should be visible."],
  ["Selene", "That is the story: not just AI, but accountable workflow."],
  ["Mira", "Good. I can explain that simply when a visitor asks."],
];

const MIRA_INPUT_LIMIT = 500;
const MIRA_HISTORY_LIMIT = 6;
const MIRA_HISTORY_TOTAL_LIMIT = 2000;

const askMiraMockEndpoint = async (message, conversationHistory = []) => {
  const response = await fetch("/api/agents/mira/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      conversationHistory,
      persona: "Warm Guide",
      memoryTheme: "Public website content",
      empathyState: "Welcoming",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Mira endpoint request failed.");
    error.status = response.status;
    error.code = data.error;
    throw error;
  }
  return data;
};

const buildMiraConversationHistory = (turns) => {
  let totalChars = 0;
  const recentTurns = turns
    .filter(
      (turn) =>
        ["user", "assistant"].includes(turn.role) &&
        typeof turn.content === "string" &&
        turn.content.trim(),
    )
    .slice(-MIRA_HISTORY_LIMIT)
    .reverse();
  const history = [];

  for (const turn of recentTurns) {
    const content = turn.content.trim().slice(0, 700);
    if (totalChars + content.length > MIRA_HISTORY_TOTAL_LIMIT) continue;
    totalChars += content.length;
    history.push({
      role: turn.role,
      content,
      ...(turn.role === "assistant" && turn.response?.conversationEntities?.length
        ? { conversationEntities: turn.response.conversationEntities }
        : {}),
    });
  }

  return history.reverse();
};

const splitMiraParagraphs = (text) =>
  String(text || "")
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const formatMiraAnswerBlocks = (text) => {
  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+-\s+(?=[A-Z0-9])/g, "\n- ");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let pendingBullets = [];

  const flushBullets = () => {
    if (pendingBullets.length) {
      blocks.push({ type: "list", items: pendingBullets });
      pendingBullets = [];
    }
  };

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      pendingBullets.push(bulletMatch[1].trim());
      continue;
    }

    flushBullets();

    if (/^[A-Z][A-Za-z0-9 &/,-]{2,48}:$/.test(line)) {
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
      continue;
    }

    const paragraphs = splitMiraParagraphs(line);
    if (paragraphs.length > 1 && line.length > 220) {
      blocks.push(...paragraphs.map((paragraph) => ({ type: "paragraph", text: paragraph })));
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }

  flushBullets();
  return blocks.length ? blocks : [{ type: "paragraph", text }];
};

const getMiraAnswerBlocks = (content) => {
  const structuredBlocks = formatStructuredMiraAnswerBlocks(content);
  return structuredBlocks.length
    ? structuredBlocks
    : formatMiraAnswerBlocks(content);
};

const MiraFallbackAnswerContent = ({ content }) => (
  <div className="grid gap-3">
    {getMiraAnswerBlocks(content).map((block, index) => {
      const key = `${block.type}-${index}`;
      if (block.type === "heading") {
        return (
          <p key={key} className="text-xs font-semibold uppercase tracking-wide text-red-200">
            {block.text}
          </p>
        );
      }
      if (block.type === "list") {
        return (
          <ul key={key} className="ml-4 list-disc space-y-1">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        );
      }
      if (block.type === "entity-section") {
        return (
          <section
            key={key}
            className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className="flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white"
                aria-hidden="true"
              >
                {block.number}
              </span>
              <h3 className="pt-0.5 text-base font-bold leading-6 text-white">
                {block.heading}
              </h3>
            </div>
            {block.items.length ? (
              <ul className="ml-10 list-disc space-y-1.5 text-zinc-200">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      }
      if (block.type === "important-note") {
        return (
          <aside
            key={key}
            className="mt-1 rounded-lg border border-amber-300/25 bg-amber-400/10 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
              {block.heading}
            </p>
            {block.text ? <p className="mt-2 text-zinc-200">{block.text}</p> : null}
            {block.items.length ? (
              <ul className="mt-2 ml-4 list-disc space-y-1 text-zinc-200">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </aside>
        );
      }
      return <p key={key}>{block.text}</p>;
    })}
  </div>
);

const miraEntityTypeLabel = (entityType) =>
  String(entityType || "offering").replaceAll("_", " ");

const MiraStructuredSection = ({ section, nested = false }) => (
  <section
    className={
      nested
        ? "ml-4 grid gap-2 border-l border-white/15 pl-4"
        : "grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4"
    }
  >
    <div className="flex items-start gap-3">
      {!nested && section.number ? (
        <span
          className="flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white"
          aria-hidden="true"
        >
          {section.number}
        </span>
      ) : null}
      <div className="min-w-0">
        <h3 className="text-base font-bold leading-6 text-white">
          {section.heading}
        </h3>
        {section.entityType ? (
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-red-200">
            {miraEntityTypeLabel(section.entityType)}
          </p>
        ) : null}
      </div>
    </div>
    {section.summary ? (
      <p className={nested ? "text-sm text-zinc-300" : "ml-10 text-zinc-200"}>
        {section.summary}
      </p>
    ) : null}
    {section.bullets?.length ? (
      <ul
        className={`${nested ? "ml-4" : "ml-14"} list-disc space-y-1.5 text-zinc-200`}
      >
        {section.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    ) : null}
    {section.children?.length ? (
      <div className="grid gap-3 pt-1">
        {section.children.map((child) => (
          <MiraStructuredSection key={child.id} section={child} nested />
        ))}
      </div>
    ) : null}
  </section>
);

const MiraStructuredAnswerContent = ({ structure }) => (
  <div className="grid gap-4">
    {structure.introduction ? <p>{structure.introduction}</p> : null}
    {structure.sections.map((section) => (
      <MiraStructuredSection key={section.id} section={section} />
    ))}
    {structure.importantNote ? (
      <aside className="rounded-lg border border-amber-300/25 bg-amber-400/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
          Important note
        </p>
        <p className="mt-2 text-zinc-200">{structure.importantNote}</p>
      </aside>
    ) : null}
    {structure.followUpQuestion ? (
      <p className="rounded-lg border border-red-400/20 bg-red-950/20 p-4 font-medium text-red-100">
        {structure.followUpQuestion}
      </p>
    ) : null}
  </div>
);

const MiraAnswerContent = ({ content, structure }) =>
  structure?.sections?.length ? (
    <MiraStructuredAnswerContent structure={structure} />
  ) : (
    <MiraFallbackAnswerContent content={content} />
  );

const formatMiraResponse = (response) => {
  if (!response?.answer) {
    return {
      mainSentences: [
        "Choose a sample question to preview Mira's staged, grounded response.",
      ],
      relatedTopics: [],
      handoffNote: "",
    };
  }

  let answer = response.answer;
  const relatedMatch = answer.match(/Related approved topics:\s*([^.]*)\./i);
  const relatedTopics = relatedMatch
    ? relatedMatch[1].split(",").map((topic) => topic.trim()).filter(Boolean)
    : [];

  answer = answer
    .replace(/\s*Related approved topics:\s*[^.]*\./i, "")
    .replace(/\s*Route [^.]*care@onesmarter\.com\./i, "")
    .trim();

  let handoffNote = "";
  const handoffMatch = answer.match(
    /For business-specific questions,\s*email care@onesmarter\.com\./i,
  );
  if (handoffMatch) {
    handoffNote = "For business-specific questions, email care@onesmarter.com.";
    answer = answer.replace(handoffMatch[0], "").trim();
  } else if (response.handoffNeeded) {
    handoffNote = "For business inquiries or review, email care@onesmarter.com.";
  }

  const mainSentences = splitMiraParagraphs(answer);

  return {
    mainSentences: mainSentences.length ? mainSentences : [response.answer],
    relatedTopics,
    handoffNote,
  };
};

const moodSignalLabels = {
  welcoming: "Welcoming",
  curious: "Curious",
  helpful: "Helpful",
  thoughtful: "Thoughtful",
  careful: "Careful",
  concerned: "Concerned",
  confident: "Confident",
};

const expressionLabels = {
  welcoming: "Welcoming",
  neutral: "Neutral",
  pondering: "Pondering",
  careful: "Careful",
  concerned: "Concerned",
  serious: "Serious",
  unavailable: "Unavailable",
};

const signalLevelLabel = (value) => {
  if (value >= 75) return "High";
  if (value >= 40) return "Medium";
  return "Low";
};

const expressionMarkerClasses = {
  welcoming: "border-emerald-300 bg-emerald-400/15 text-emerald-100",
  neutral: "border-zinc-300/40 bg-zinc-700/25 text-zinc-100",
  pondering: "border-sky-300/50 bg-sky-500/15 text-sky-100",
  careful: "border-amber-300/50 bg-amber-500/15 text-amber-100",
  concerned: "border-red-300/50 bg-red-500/15 text-red-100",
  serious: "border-white/30 bg-zinc-900 text-zinc-100",
  unavailable: "border-zinc-500/50 bg-zinc-800/60 text-zinc-300",
};

const expressionGlyphs = {
  welcoming: ":)",
  neutral: "--",
  pondering: "?",
  careful: "!",
  concerned: ":|",
  serious: "||",
  unavailable: "...",
};

const MiraMoodSignalPanel = ({ presentationState }) => (
  <aside
    className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-xs text-zinc-300 md:p-5"
    aria-label="Mira conversation posture"
  >
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-white">Conversation posture</p>
        <p className="mt-2 max-w-xl leading-5 text-zinc-400">
          Mira adjusts her communication posture based on the question,
          confidence, safety signals, and whether human follow-up is appropriate.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg border font-bold ${expressionMarkerClasses[presentationState.expression]}`}
          aria-hidden="true"
        >
          {expressionGlyphs[presentationState.expression]}
        </div>
        <div>
          <p className="font-semibold capitalize text-white">
            {presentationState.posture}
          </p>
          <p className="mt-1 text-zinc-500">
            {expressionLabels[presentationState.expression]} expression
          </p>
        </div>
      </div>
    </div>

    <p className="sr-only">{presentationState.summary}</p>
    <p className="mt-4 rounded border border-white/10 bg-black/20 px-3 py-2 leading-5 text-zinc-300">
      {presentationState.summary}
    </p>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {MIRA_MOOD_SIGNAL_KEYS.map((key) => {
        const value = presentationState.moodSignals[key];
        return (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="shrink-0 whitespace-nowrap font-semibold text-zinc-200">
                {moodSignalLabels[key]}
              </span>
              <span className="shrink-0 whitespace-nowrap text-zinc-500">
                {signalLevelLabel(value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800" aria-hidden="true">
              <div
                className="h-2 rounded-full bg-red-500"
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="sr-only">
              {moodSignalLabels[key]} signal is {signalLevelLabel(value)}.
            </span>
          </div>
        );
      })}
    </div>
  </aside>
);

const MiraVisualPresencePanel = ({ presentationState }) => {
  const visualState = getMiraVisualStateForPosture(presentationState?.posture);
  const [failedAssetIds, setFailedAssetIds] = useState([]);
  const imageUnavailable = failedAssetIds.includes(visualState.id);
  const hasApprovedAsset = visualState.assetStatus === "available" && !imageUnavailable;
  const showPresentationDebug =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname.includes("vercel.app"));

  useEffect(() => {
    setFailedAssetIds((currentIds) =>
      currentIds.filter((assetId) => assetId !== visualState.id),
    );
  }, [visualState.id]);

  return (
    <aside
      className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-xs text-zinc-300 md:p-5"
      aria-label="Mira static visual presence"
    >
      <div>
        <p className="text-sm font-semibold text-white">Mira's live presence</p>
        <p className="mt-2 max-w-2xl leading-5 text-zinc-400">
          Mira's visual posture reflects the tone of the current conversation.
          Static artwork only; no camera, tracking, or live avatar processing
          is active.......
        </p>
        <span className="mt-3 inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-200">
          {visualState.label}
        </span>
      </div>

      <div className="mt-4 grid min-w-0 gap-5 sm:grid-cols-[minmax(10rem,12rem)_minmax(0,1fr)] sm:items-start">
        <div className="w-full motion-safe:transition-opacity motion-safe:duration-300">
          {hasApprovedAsset ? (
            <img
              src={visualState.assetPath}
              alt={visualState.accessibilityDescription}
              width="1254"
              height="1254"
              loading="lazy"
              decoding="async"
              onError={() =>
                setFailedAssetIds((currentIds) =>
                  currentIds.includes(visualState.id)
                    ? currentIds
                    : [...currentIds, visualState.id],
                )
              }
              className="aspect-square w-full rounded-lg border border-white/10 object-cover"
            />
          ) : (
            <div
              className="flex aspect-square min-h-36 flex-col items-center justify-center rounded-lg border border-red-500/20 bg-[radial-gradient(circle_at_35%_25%,rgba(248,113,113,0.28),transparent_35%),linear-gradient(145deg,rgba(24,24,27,0.96),rgba(5,5,5,0.96))] p-4 text-center shadow-lg shadow-black/20"
              role="img"
              aria-label={visualState.accessibilityDescription}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-bold text-white">
                {visualState.fallbackInitials}
              </div>
              <p className="mt-4 text-sm font-semibold text-white">
                {visualState.label}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-red-200">
                Static portrait pending
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-white">
            {visualState.expression}
          </p>
          <p className="mt-2 leading-6 text-zinc-300">
            {visualState.accessibilityDescription}
          </p>
          <p className="mt-3 rounded border border-white/10 bg-black/20 px-3 py-2 leading-5 text-zinc-400">
            {visualState.designDirection}
          </p>
          {showPresentationDebug && (
            <dl className="mt-3 grid gap-1 rounded border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-zinc-500">
              <div className="flex justify-between gap-3">
                <dt>Posture</dt>
                <dd className="text-zinc-300">{presentationState.posture}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Expression</dt>
                <dd className="text-zinc-300">{presentationState.expression}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Visual state</dt>
                <dd className="text-zinc-300">{visualState.id}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </aside>
  );
};

const AgentNetwork = () => (
  <div className="relative min-h-[340px] overflow-hidden rounded-lg border border-white/10 bg-black/45 p-4 shadow-2xl shadow-black/40 sm:min-h-[360px] sm:p-6">
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
          "left-1/2 top-1/2 -translate-y-1/2",
          "left-[24%] top-[18%]",
          "left-[76%] top-[18%]",
          "left-[24%] bottom-[16%]",
          "left-[76%] bottom-[16%]",
        ];
        const isMira = agent.name === "Mira Vale";
        const label = (
          <p className="w-28 rounded-full border border-white/10 bg-black/80 px-2 py-1 text-center text-[11px] font-semibold leading-4 text-zinc-100 shadow-lg shadow-black/30 sm:w-36 sm:px-3 sm:text-xs">
            {agent.name}
          </p>
        );

        return (
          <div
            key={agent.name}
            className={`absolute flex -translate-x-1/2 flex-col items-center ${positions[index]} ${isMira ? "z-20" : "z-10"}`}
          >
            {(index === 1 || index === 2) && (
              <div className="mb-2">{label}</div>
            )}
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full border text-sm font-bold shadow-lg sm:h-20 sm:w-20 ${isMira
                  ? "border-red-400 bg-red-600 text-white shadow-red-950/60"
                  : "border-white/15 bg-zinc-900 text-zinc-200"
                }`}
            >
              {agent.initials}
            </div>
            {index !== 1 && index !== 2 && <div className="mt-2">{label}</div>}
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

const MiraVoiceSamplesPanel = () => {
  const audioRef = useRef(null);
  const [activeSampleId, setActiveSampleId] = useState("");
  const [playbackState, setPlaybackState] = useState("idle");
  const [voiceStyle, setVoiceStyle] = useState(MIRA_ALLOWED_VOICE_STYLES[0]);

  const activeSample = miraVoiceSamples.find((sample) => sample.id === activeSampleId);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handlePlay = async (sample) => {
    if (!isAvailableMiraVoiceSample(sample)) {
      stopAudio();
      setActiveSampleId(sample.id);
      setPlaybackState("awaiting_asset");
      return;
    }

    try {
      if (audioRef.current) {
        if (activeSampleId !== sample.id) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = sample.assetPath;
        }
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setActiveSampleId(sample.id);
        setPlaybackState("playing");
      }
    } catch {
      setActiveSampleId(sample.id);
      setPlaybackState("unavailable");
    }
  };

  const handlePause = () => {
    if (audioRef.current) audioRef.current.pause();
    setPlaybackState(activeSampleId ? "paused" : "idle");
  };

  const handleStop = () => {
    stopAudio();
    setPlaybackState(activeSampleId ? "stopped" : "idle");
  };

  const handleRestart = async (sample) => {
    if (!isAvailableMiraVoiceSample(sample)) {
      stopAudio();
      setActiveSampleId(sample.id);
      setPlaybackState("awaiting_asset");
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = sample.assetPath;
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
        setActiveSampleId(sample.id);
        setPlaybackState("playing");
      } catch {
        setActiveSampleId(sample.id);
        setPlaybackState("unavailable");
      }
    }
  };

  const playbackLabelFor = (sample) => {
    if (sample.id !== activeSampleId) {
      return sample.status === "available" ? "Ready" : "Awaiting audio asset";
    }
    if (playbackState === "playing") return "Playing";
    if (playbackState === "paused") return "Paused";
    if (playbackState === "stopped") return "Stopped";
    if (playbackState === "ended") return "Ended";
    if (playbackState === "awaiting_asset") return "Awaiting audio asset";
    if (playbackState === "unavailable") return "Audio sample unavailable";
    return sample.status === "available" ? "Ready" : "Awaiting audio asset";
  };

  return (
    <section className="p-5 text-white md:p-8">
      <div className="grid gap-8">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">
            Scripted voice samples
          </p>
          <h3 className="text-2xl font-bold md:text-3xl">Hear Mira</h3>
          <p className="mt-4 leading-7 text-zinc-300">
            Preview Mira's intended speaking style using preapproved scripted
            samples. No microphone or live voice processing is used.
          </p>
          <p className="mt-4 rounded-md border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-100">
            These samples will use prerecorded audio. No microphone, speech
            recognition, or user audio processing is active.
          </p>

          <div className="mt-6">
            <p className="text-sm font-semibold text-white">Voice style</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MIRA_ALLOWED_VOICE_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setVoiceStyle(style)}
                  aria-pressed={voiceStyle === style}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${voiceStyle === style
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-red-400"
                    }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-white">Language demo</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {MIRA_LANGUAGE_DEMOS.map((language) => (
                <span
                  key={language.id}
                  className={`rounded-full border px-3 py-2 ${language.status === "available"
                      ? "border-white/10 bg-white/[0.04] text-zinc-200"
                      : "border-dashed border-white/20 bg-transparent text-zinc-400"
                    }`}
                >
                  {language.label}
                  {language.status === "planned" ? " - planned" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 md:p-6">
          <audio
            ref={audioRef}
            preload="none"
            onEnded={() => setPlaybackState("ended")}
            onError={() => activeSampleId && setPlaybackState("unavailable")}
            aria-label="Mira scripted voice sample audio"
          />
          <div className="grid gap-4">
            {miraVoiceSamples.map((sample) => {
              const isAvailable = isAvailableMiraVoiceSample(sample);
              const isActive = activeSampleId === sample.id;
              const stateLabel = playbackLabelFor(sample);

              return (
                <article
                  key={sample.id}
                  className={`rounded-lg border bg-white/[0.04] p-4 ${isActive ? "border-red-400" : "border-white/10"
                    }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-white">{sample.label}</h4>
                      <p className="mt-1 text-xs font-semibold text-red-300">
                        {sample.posture}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-950">
                      {stateLabel}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-300">
                    {sample.transcript}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handlePlay(sample)}
                      disabled={!isAvailable}
                      aria-label={`Play ${sample.label} Mira voice sample`}
                      className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={handlePause}
                      disabled={!isAvailable || !isActive || playbackState !== "playing"}
                      aria-label={`Pause ${sample.label} Mira voice sample`}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:text-zinc-500"
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      onClick={handleStop}
                      disabled={!isAvailable || !isActive || playbackState === "idle"}
                      aria-label={`Stop ${sample.label} Mira voice sample`}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:text-zinc-500"
                    >
                      Stop
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestart(sample)}
                      disabled={!isAvailable}
                      aria-label={`Restart ${sample.label} Mira voice sample`}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:text-zinc-500"
                    >
                      Restart
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-400">
            Audio files are expected under <code>public/audio/mira/</code>.
            Until approved files are added, the transcripts remain available
            and playback controls stay disabled.
          </p>
          {activeSample && (
            <p className="sr-only" aria-live="polite">
              {activeSample.label} sample state: {playbackLabelFor(activeSample)}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

const MiraConversationPanel = () => {
  const latestRequestId = useRef(0);
  const threadEndRef = useRef(null);
  const conversationScrollRef = useRef(null);
  const shouldAutoFollowRef = useRef(true);
  const answerPanelRef = useRef(null);
  const guidanceTimeoutRef = useRef(null);
  const highlightTimeoutRef = useRef(null);
  const copyStatusTimeoutRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showSampleGuidance, setShowSampleGuidance] = useState(false);
  const [isAnswerHighlighted, setIsAnswerHighlighted] = useState(false);
  const [conversationTurns, setConversationTurns] = useState([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [inputWarning, setInputWarning] = useState("");
  const [miraResponse, setMiraResponse] = useState(null);
  const [currentPresentationMessage, setCurrentPresentationMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle");
  const latestMiraAnswer = [...conversationTurns]
    .reverse()
    .find((turn) => turn.role === "assistant" && !turn.error)?.content;
  const formattedResponse = formatMiraResponse(miraResponse);
  const presentationState = deriveMiraPresentationState({
    response: miraResponse,
    currentMessage: currentPresentationMessage,
    isLoading,
    hasError: Boolean(errorMessage),
  });
  const responseText = formattedResponse.mainSentences.join(" ").toLowerCase();
  const showPrivacyReminder =
    miraResponse?.privacyReminder && !responseText.includes("do not submit");

  useEffect(() => {
    const conversationScroll = conversationScrollRef.current;
    if (!conversationScroll || !shouldAutoFollowRef.current) return;

    conversationScroll.scrollTo({
      top: conversationScroll.scrollHeight,
      behavior:
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
    });
  }, [conversationTurns, isLoading, errorMessage]);

  useEffect(
    () => () => {
      window.clearTimeout(guidanceTimeoutRef.current);
      window.clearTimeout(highlightTimeoutRef.current);
      window.clearTimeout(copyStatusTimeoutRef.current);
    },
    [],
  );

  const handleConversationScroll = () => {
    const conversationScroll = conversationScrollRef.current;
    if (!conversationScroll) return;

    const distanceFromBottom =
      conversationScroll.scrollHeight -
      conversationScroll.scrollTop -
      conversationScroll.clientHeight;
    shouldAutoFollowRef.current = distanceFromBottom < 80;
  };

  const guideToAnswerPanel = () => {
    window.clearTimeout(guidanceTimeoutRef.current);
    window.clearTimeout(highlightTimeoutRef.current);
    setShowSampleGuidance(true);
    setIsAnswerHighlighted(true);

    window.requestAnimationFrame(() => {
      answerPanelRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });

    highlightTimeoutRef.current = window.setTimeout(
      () => setIsAnswerHighlighted(false),
      1400,
    );
    guidanceTimeoutRef.current = window.setTimeout(
      () => setShowSampleGuidance(false),
      3200,
    );
  };

  const requestMiraAnswer = async (message) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    const history = buildMiraConversationHistory(conversationTurns);
    const userTurn = {
      id: `user-${requestId}`,
      role: "user",
      content: message,
    };
    window.clearTimeout(copyStatusTimeoutRef.current);
    setCopyStatus("idle");
    setIsLoading(true);
    setErrorMessage("");
    setInputWarning("");
    setMiraResponse(null);
    setCurrentPresentationMessage(message);
    setConversationTurns((turns) => [...turns, userTurn]);

    try {
      const response = await askMiraMockEndpoint(message, history);
      if (requestId !== latestRequestId.current) return;
      setMiraResponse(response);
      setConversationTurns((turns) => [
        ...turns,
        {
          id: `mira-${requestId}`,
          role: "assistant",
          content: response.answer,
          response,
        },
      ]);
    } catch (error) {
      if (requestId !== latestRequestId.current) return;
      const fallbackMessage =
        error.status === 429
          ? "Mira is receiving too many requests right now. Please try again shortly or email care@onesmarter.com."
          : "Mira is not available right now. For business inquiries, email care@onesmarter.com.";
      setMiraResponse(null);
      setErrorMessage(fallbackMessage);
      setConversationTurns((turns) => [
        ...turns,
        {
          id: `mira-error-${requestId}`,
          role: "assistant",
          content: fallbackMessage,
          error: true,
        },
      ]);
    } finally {
      if (requestId === latestRequestId.current) {
        setIsLoading(false);
      }
    }
  };

  const handleQuestionClick = async (example, index) => {
    setSelectedIndex(index);
    const answerRequest = requestMiraAnswer(example.question);
    guideToAnswerPanel();
    await answerRequest;
  };

  const handleCustomQuestionChange = (event) => {
    const value = event.target.value;
    setCustomQuestion(value);
    if (value.length >= MIRA_INPUT_LIMIT) {
      setInputWarning("Question limit reached. Please keep your question to 500 characters.");
    } else if (inputWarning) {
      setInputWarning("");
    }
  };

  const handleCustomQuestionSubmit = async (event) => {
    event.preventDefault();

    const trimmedQuestion = customQuestion.trim();
    if (!trimmedQuestion) return;
    event.currentTarget.querySelector("button[type='submit']")?.blur();
    setSelectedIndex(null);
    const answerRequest = requestMiraAnswer(trimmedQuestion);
    setTimeout(() => guideToAnswerPanel(), 0);
    await answerRequest;
    setCustomQuestion("");
  };

  const handleCustomQuestionKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleStartNewConversation = () => {
    latestRequestId.current += 1;
    window.clearTimeout(guidanceTimeoutRef.current);
    window.clearTimeout(highlightTimeoutRef.current);
    window.clearTimeout(copyStatusTimeoutRef.current);
    setSelectedIndex(null);
    setShowSampleGuidance(false);
    setIsAnswerHighlighted(false);
    setConversationTurns([]);
    setMiraResponse(null);
    setCurrentPresentationMessage("");
    setIsLoading(false);
    setErrorMessage("");
    setInputWarning("");
    setCustomQuestion("");
    setCopyStatus("idle");
  };

  const handleCopyAnswer = async () => {
    if (!latestMiraAnswer || isLoading) return;

    window.clearTimeout(copyStatusTimeoutRef.current);

    try {
      await navigator.clipboard.writeText(latestMiraAnswer);
      setCopyStatus("copied");
      copyStatusTimeoutRef.current = window.setTimeout(
        () => setCopyStatus("idle"),
        2000,
      );
    } catch {
      setCopyStatus("failed");
    }
  };

  const isSubmitDisabled = isLoading || !customQuestion.trim();

  return (
    <section className="border-t border-white/10 p-5 text-white md:p-8 xl:border-l xl:border-t-0">
      <div className="grid gap-8">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">
            Guided interaction
          </p>
          <h3 className="text-2xl font-bold md:text-3xl">
            Staging AI preview
          </h3>
          <p className="mt-4 leading-7 text-zinc-300">
            Mira can answer sample questions or a short typed question using
            approved OneSmarter content. This preview is grounded, controlled,
            and protected by deterministic safety fallback.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
              Staging AI preview
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
              Grounded in approved content
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
              Safety fallback enabled
            </span>
          </div>
          <div className="mt-7 grid gap-3">
            {conversationExamples.map((example, index) => (
              <button
                key={example.question}
                type="button"
                onClick={() => handleQuestionClick(example, index)}
                disabled={isLoading}
                aria-label={`Ask Mira: ${example.question}`}
                aria-pressed={selectedIndex === index}
                className={`rounded-md border px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 ${selectedIndex === index
                    ? "border-red-500 bg-red-600 text-white"
                    : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-red-500/60 hover:bg-white/[0.08]"
                  }`}
              >
                {example.question}
              </button>
            ))}
          </div>
          {showSampleGuidance && (
            <p
              className="mt-3 rounded-md border border-red-500/20 bg-red-950/20 px-3 py-2 text-sm text-red-100"
              role="status"
            >
              Your selected question has been sent to Mira.
            </p>
          )}
          <form className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4" onSubmit={handleCustomQuestionSubmit}>
            <label htmlFor="mira-question" className="text-sm font-semibold text-white">
              Ask Mira a question
            </label>
            <p id="mira-ai-disclaimer" className="mt-2 text-xs leading-5 text-zinc-300">
              Mira is an AI agent. Responses may contain errors or omit important
              context. Verify important information and contact care@onesmarter.com
              for business-specific, legal, security, compliance, or procurement
              questions.
            </p>
            <p id="mira-question-help" className="mt-2 text-xs leading-5 text-zinc-400">
              Do not submit PHI, confidential documents, credentials, or private
              operational details.
            </p>
            <textarea
              id="mira-question"
              value={customQuestion}
              onChange={handleCustomQuestionChange}
              onKeyDown={handleCustomQuestionKeyDown}
              maxLength={MIRA_INPUT_LIMIT}
              rows={4}
              aria-describedby="mira-ai-disclaimer mira-question-help mira-question-count"
              placeholder="Example: What does OneSmarter offer for healthcare teams?"
              className="mt-3 min-h-28 w-full resize-y rounded-md border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/30"
              disabled={isLoading}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p id="mira-question-count" className={`text-xs ${inputWarning ? "text-red-200" : "text-zinc-500"}`}>
                {inputWarning || `${customQuestion.length}/${MIRA_INPUT_LIMIT} characters`}
              </p>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {isLoading ? "Asking Mira..." : "Ask Mira"}
              </button>
            </div>
          </form>
        </div>

        <div
          ref={answerPanelRef}
          className={`scroll-mt-24 rounded-lg border bg-[#090909] p-5 shadow-2xl shadow-black/40 transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none md:p-6 ${isAnswerHighlighted
              ? "border-red-500/70 shadow-red-950/40"
              : "border-white/10"
            }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                MV
              </div>
              <div>
                <h4 className="font-semibold text-white">Mira Vale</h4>
                <p className="text-sm text-zinc-400">staged grounded response path</p>
                <p className="mt-1 text-xs text-zinc-500">
                  AI-generated response - verify important information.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-red-500/40 bg-red-950/30 px-3 py-1 text-xs font-semibold text-red-200">
              Staging preview
            </span>
            <button
              type="button"
              onClick={handleStartNewConversation}
              disabled={isLoading || conversationTurns.length === 0}
              className="rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-red-500/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:text-zinc-600"
            >
              Start new conversation
            </button>
          </div>

          <div
            ref={conversationScrollRef}
            onScroll={handleConversationScroll}
            className="mt-6 grid min-h-[clamp(16rem,34vh,22rem)] max-h-[clamp(22rem,52vh,34rem)] gap-5 overflow-y-auto overflow-x-hidden pr-1"
            aria-live="polite"
          >
            {conversationTurns.length === 0 && (
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm leading-6 text-zinc-200">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-300">
                  Mira
                </p>
                Choose a sample question or type a short question to start.
              </div>
            )}

            {conversationTurns.map((turn) => (
              <div
                key={turn.id}
                className={`max-w-[92%] rounded-2xl px-5 py-4 text-sm leading-6 ${turn.role === "user"
                    ? "ml-auto rounded-tr-sm bg-white text-zinc-950"
                    : "rounded-tl-sm border border-white/10 bg-zinc-900 text-zinc-200"
                  }`}
              >
                <p
                  className={`mb-2 text-xs font-semibold uppercase tracking-wide ${turn.role === "user" ? "text-zinc-500" : "text-red-300"
                    }`}
                >
                  {turn.role === "user" ? "You" : "Mira"}
                </p>
                <MiraAnswerContent
                  content={turn.content}
                  structure={turn.response?.answerStructure}
                />
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-white/10 bg-zinc-900 px-5 py-4 text-sm leading-6 text-zinc-200">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-300">
                  Mira
                </p>
                <div className="flex items-center gap-3">
                  <span>Checking the approved OneSmarter knowledge base...</span>
                  <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-300 motion-safe:animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-red-300 motion-safe:animate-bounce [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-red-300 motion-safe:animate-bounce [animation-delay:240ms]" />
                  </span>
                  <span className="sr-only">Mira is typing.</span>
                </div>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {latestMiraAnswer && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleCopyAnswer}
                disabled={isLoading}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-red-500/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:text-zinc-600"
              >
                {copyStatus === "copied"
                  ? "Copied"
                  : copyStatus === "failed"
                    ? "Copy failed"
                    : "Copy answer"}
              </button>
              <span className="sr-only" aria-live="polite">
                {copyStatus === "copied"
                  ? "Mira's answer copied to the clipboard."
                  : copyStatus === "failed"
                    ? "Mira's answer could not be copied."
                    : ""}
              </span>
            </div>
          )}

          {miraResponse && !isLoading && !errorMessage && (
            <div className="mt-6 grid gap-4 rounded-md border border-white/10 bg-white/[0.04] p-4 text-xs leading-5 text-zinc-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 font-semibold capitalize text-zinc-950">
                  {miraResponse.confidence} confidence
                </span>
                {miraResponse.riskFlags?.map((flag) => (
                  <span
                    key={flag}
                    className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 font-semibold text-zinc-200"
                  >
                    {flag.replaceAll("_", " ")}
                  </span>
                ))}
              </div>

              {!!formattedResponse.relatedTopics.length && (
                <div className="rounded border border-white/10 bg-black/20 px-3 py-2">
                  <p className="font-semibold uppercase tracking-wide text-zinc-300">
                    Related topics
                  </p>
                  <p className="mt-1 text-zinc-400">
                    {formattedResponse.relatedTopics.join(", ")}
                  </p>
                </div>
              )}

              {miraResponse.handoffNeeded && (
                <p className="rounded border border-red-500/20 bg-red-950/20 px-3 py-2 text-red-100">
                  {formattedResponse.handoffNote ||
                    "For business inquiries or review, email care@onesmarter.com."}
                </p>
              )}

              {!!miraResponse.matchedSources?.length && (
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-300">
                    Grounded in
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {miraResponse.matchedSources.slice(0, 3).map((source) => (
                      <a
                        key={source.id}
                        href={source.route}
                        className="block rounded border border-white/10 bg-black/25 px-3 py-2 text-zinc-300 transition hover:border-red-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                      >
                        {source.title}
                        <span className="block text-[11px] text-zinc-500">
                          {source.route}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {showPrivacyReminder && (
                <p className="rounded border border-white/10 bg-black/20 px-3 py-2 text-zinc-400">
                  {miraResponse.privacyReminder}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
            <MiraVisualPresencePanel presentationState={presentationState} />
            <MiraMoodSignalPanel presentationState={presentationState} />
          </div>

          <p className="mt-6 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-zinc-400">
            Mira may make mistakes. Responses are grounded in approved
            OneSmarter content, but important information should be independently
            verified. Route business-specific, legal, security, compliance, or
            procurement matters to care@onesmarter.com. Conversation context is
            used only during this browser session and is not intended for PHI,
            confidential documents, or private operational details. No uploads
            or persistent memory are enabled.
          </p>
        </div>
      </div>
    </section>
  );
};

const PersonaLayerPrototype = () => {
  const [persona, setPersona] = useState(personaOptions[0]);
  const [memory, setMemory] = useState(memoryOptions[0]);
  const [empathy, setEmpathy] = useState(empathyOptions[0]);
  const responseKey = `${persona}|${memory}|${empathy}`;
  const response =
    personaResponses[responseKey] ||
    `With a ${persona.toLowerCase()} posture, I would draw from ${memory.toLowerCase()} and keep the response ${empathy.toLowerCase()}. I would answer from approved public OneSmarter content and route business-specific questions to care@onesmarter.com.`;

  const controlGroups = [
    ["Persona posture", personaOptions, persona, setPersona],
    ["Memory theme", memoryOptions, memory, setMemory],
    ["Empathy state", empathyOptions, empathy, setEmpathy],
  ];

  return (
    <section className="bg-white px-5 py-16 text-black md:px-12">
      <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
            Presentation layers
          </p>
          <h2 className="text-2xl font-bold md:text-4xl">
            Persona, memory, and empathy layers
          </h2>
          <p className="mt-4 leading-7 text-gray-700">
            The first guide agent is simple, but the long-term direction is
            richer: agents can adjust tone, draw from approved memory themes,
            and present themselves with an appropriate communication posture.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-950 p-5 text-white shadow-xl shadow-zinc-200/60 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                MV
                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 bg-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Mira Vale</h3>
                <p className="text-sm text-zinc-400">
                  Presentation layer preview
                </p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-300">
              Layer preview
            </span>
          </div>

          <div className="mt-6 grid gap-5">
            {controlGroups.map(([label, options, selected, setSelected]) => (
              <div key={label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-300">
                  {label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelected(option)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 ${selected === option
                          ? "border-red-500 bg-red-600 text-white"
                          : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-red-500/60 hover:text-white"
                        }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/35 p-5">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white px-3 py-1 text-zinc-950">
                {persona}
              </span>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-200">
                {memory}
              </span>
              <span className="rounded-full bg-red-950/70 px-3 py-1 text-red-100">
                {empathy}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-zinc-200">{response}</p>
          </div>

          <p className="mt-5 text-xs leading-5 text-zinc-500">
            Static preview. Future versions may connect these controls to a
            governed agent runtime.
          </p>
        </div>
      </div>
    </section>
  );
};

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
              workflows. Mira is the first guide concept for explaining the
              public OneSmarter site in plain language.
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

      <section className="bg-zinc-950 px-4 py-16 sm:px-6 md:px-8 xl:px-10">
        <div className="qa-container-wide mx-auto overflow-hidden rounded-xl border border-white/10 bg-[#090909] shadow-sm">
          <div className="border-b border-white/10 px-5 py-6 text-white md:px-8 md:py-8">
            <h2 className="text-2xl font-bold md:text-4xl">
              Mira voice and guided interaction
            </h2>
          </div>
          <div className="grid items-start xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <MiraVoiceSamplesPanel />
            <MiraConversationPanel />
          </div>
        </div>
      </section>

      <PersonaLayerPrototype />

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

      <section className="bg-white px-5 py-16 text-black md:px-12">
        <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[1fr_0.75fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
              First release boundary
            </p>
            <h2 className="text-2xl font-bold md:text-3xl">
              Start simple: ask Mira about OneSmarter
            </h2>
            <p className="mt-4 leading-7 text-gray-700">
              The first practical activity is a guided Q&A pattern: answer
              visitor questions clearly, keep responses constrained, and route
              business inquiries to care@onesmarter.com.
            </p>
            <p className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              The interaction previews use prepared questions and responses
              while the live agent runtime remains out of scope.
            </p>
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
