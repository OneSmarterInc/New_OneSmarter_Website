import React, { useEffect, useRef, useState } from "react";
import {
  MIRA_MOOD_SIGNAL_KEYS,
  deriveMiraPresentationState,
} from "../data/agentPresentation/miraPresentationState.js";

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
    history.push({ role: turn.role, content });
  }

  return history.reverse();
};

const splitMiraParagraphs = (text) =>
  String(text || "")
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

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
    className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-xs text-zinc-300"
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
              <span className="font-semibold text-zinc-200">
                {moodSignalLabels[key]}
              </span>
              <span className="text-zinc-500">{signalLevelLabel(value)}</span>
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
              className={`flex h-16 w-16 items-center justify-center rounded-full border text-sm font-bold shadow-lg sm:h-20 sm:w-20 ${
                isMira
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

const MiraConversationPanel = () => {
  const latestRequestId = useRef(0);
  const threadEndRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [conversationTurns, setConversationTurns] = useState([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [inputWarning, setInputWarning] = useState("");
  const [miraResponse, setMiraResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const formattedResponse = formatMiraResponse(miraResponse);
  const presentationState = deriveMiraPresentationState({
    response: miraResponse,
    isLoading,
    hasError: Boolean(errorMessage),
  });
  const responseText = formattedResponse.mainSentences.join(" ").toLowerCase();
  const showPrivacyReminder =
    miraResponse?.privacyReminder && !responseText.includes("do not submit");

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [conversationTurns, isLoading, errorMessage]);

  const requestMiraAnswer = async (message) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    const history = buildMiraConversationHistory(conversationTurns);
    const userTurn = {
      id: `user-${requestId}`,
      role: "user",
      content: message,
    };
    setIsLoading(true);
    setErrorMessage("");
    setInputWarning("");
    setMiraResponse(null);
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
    await requestMiraAnswer(example.question);
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

    if (!trimmedQuestion) {
      setInputWarning("Enter a question for Mira before submitting.");
      return;
    }

    if (trimmedQuestion.length > MIRA_INPUT_LIMIT) {
      setInputWarning("Please shorten your question to 500 characters or fewer.");
      return;
    }

    setSelectedIndex(null);
    await requestMiraAnswer(trimmedQuestion);
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
    setSelectedIndex(null);
    setConversationTurns([]);
    setMiraResponse(null);
    setIsLoading(false);
    setErrorMessage("");
    setInputWarning("");
    setCustomQuestion("");
  };

  const isSubmitDisabled = isLoading || !customQuestion.trim();

  return (
    <section className="bg-zinc-950 px-5 py-16 text-white md:px-12">
      <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">
            Guide interaction
          </p>
          <h2 className="text-2xl font-bold md:text-4xl">
            Staging AI preview
          </h2>
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
                className={`rounded-md border px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 ${
                  selectedIndex === index
                    ? "border-red-500 bg-red-600 text-white"
                    : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-red-500/60 hover:bg-white/[0.08]"
                }`}
              >
                {example.question}
              </button>
            ))}
          </div>
          <form className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4" onSubmit={handleCustomQuestionSubmit}>
            <label htmlFor="mira-question" className="text-sm font-semibold text-white">
              Ask Mira a question
            </label>
            <p id="mira-question-help" className="mt-2 text-xs leading-5 text-zinc-400">
              Do not submit PHI, confidential documents, or private operational details.
            </p>
            <textarea
              id="mira-question"
              value={customQuestion}
              onChange={handleCustomQuestionChange}
              onKeyDown={handleCustomQuestionKeyDown}
              maxLength={MIRA_INPUT_LIMIT}
              rows={4}
              aria-describedby="mira-question-help mira-question-count"
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

        <div className="rounded-lg border border-white/10 bg-[#090909] p-5 shadow-2xl shadow-black/40 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                MV
              </div>
              <div>
                <h3 className="font-semibold text-white">Mira Vale</h3>
                <p className="text-sm text-zinc-400">staged grounded response path</p>
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

          <div className="mt-6 grid max-h-[34rem] gap-5 overflow-y-auto pr-1" aria-live="polite">
            {conversationTurns.length === 0 && (
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-white/10 bg-zinc-900 px-5 py-4 text-sm leading-6 text-zinc-200">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-300">
                  Mira
                </p>
                Choose a sample question or type a short question to start.
              </div>
            )}

            {conversationTurns.map((turn) => (
              <div
                key={turn.id}
                className={`max-w-[92%] rounded-2xl px-5 py-4 text-sm leading-6 ${
                  turn.role === "user"
                    ? "ml-auto rounded-tr-sm bg-white text-zinc-950"
                    : "rounded-tl-sm border border-white/10 bg-zinc-900 text-zinc-200"
                }`}
              >
                <p
                  className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
                    turn.role === "user" ? "text-zinc-500" : "text-red-300"
                  }`}
                >
                  {turn.role === "user" ? "You" : "Mira"}
                </p>
                <div className="grid gap-3">
                  {splitMiraParagraphs(turn.content).map((sentence) => (
                    <p key={sentence}>{sentence}</p>
                  ))}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-white/10 bg-zinc-900 px-5 py-4 text-sm leading-6 text-zinc-200">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-300">
                  Mira
                </p>
                Checking the approved OneSmarter knowledge base...
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

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

          <div className="mt-6">
            <MiraMoodSignalPanel presentationState={presentationState} />
          </div>

          <p className="mt-6 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-zinc-400">
            Sample buttons and typed questions use Mira's staged, grounded
            response path. Sensitive or out-of-scope questions may be handled by
            deterministic safety rules. Conversation context is used only during
            this browser session and is not intended for PHI, confidential
            documents, or private operational details. No uploads or persistent
            memory are enabled.
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
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 ${
                        selected === option
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

      <MiraConversationPanel />

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
