import React, { useEffect, useRef, useState } from "react";
import { formatMiraAnswerBlocks as formatStructuredMiraAnswerBlocks } from "../data/agentPresentation/miraAnswerFormatter.js";
import { cafePersonas } from "../data/agentPresentation/cafePersonas.js";
import { getEarlierCafeConversations, getCafeWeekBucket, isCafeConversationActive, selectCafeConversation } from "../data/cafeConversations/index.js";
import MiraPageReview from "./MiraPageReview.jsx";

const conversationExamples = [
  {
    id: "faq_company_overview",
    question: "What does OneSmarter do?",
    answer:
      "OneSmarter builds secure platforms, practical AI workflows, business services, and compliance readiness support for healthcare, financial, telecom, and growing organizations. The work is grounded in useful systems, trusted execution, and careful claim boundaries.",
  },
  {
    id: "faq_platforms",
    question: "What platforms do you offer?",
    answer:
      "OneSmarter currently presents two platform areas: Secure Ticketing and Case Management, and Bill Audit & Bill Pay. Telecom expense management is treated as a capability within Bill Audit & Bill Pay rather than a separate platform.",
  },
  {
    id: "faq_healthcare",
    question: "Do you work with healthcare organizations?",
    answer:
      "Yes. OneSmarter's experience includes healthcare workflows, claims-processing services, TPA support, secure case management, and compliance-aware operations. For specific healthcare or regulated-workflow questions, the right next step is to contact care@onesmarter.com.",
  },
  {
    id: "faq_soc2_attestation",
    question: "What does SOC 2 Type II Attested mean here?",
    answer:
      "OneSmarter uses the phrase SOC 2 Type II Attested to describe its trust posture. The Trust Center provides more context. For formal vendor, security, or procurement review, OneSmarter should provide the appropriate evidence through a direct business process.",
  },
  {
    id: "faq_hipaa_status",
    question: "Are you HIPAA certified?",
    answer:
      "A safer way to say this is that OneSmarter has completed a HIPAA Security Rule compliance assessment. OneSmarter does not present this as HIPAA certification. For regulated workflows, the Trust Center and a direct business review are the right next steps.",
  },
  {
    id: "faq_iso_readiness_vs_certification",
    question: "What is the difference between your readiness service and your own certification?",
    answer:
      "One Smarter Inc.'s ISO/IEC 27001:2022 certification is its own organizational credential for the certified scope stated in the Trust Center. ISO/IEC 27001 readiness support is a separate client-facing service that helps organizations prepare through ISMS documentation, control mapping, evidence preparation, and remediation coordination. Readiness support does not automatically certify a customer, and One Smarter Inc. does not issue ISO certificates.",
  },
  {
    id: "faq_contact",
    question: "How should I contact OneSmarter?",
    answer: "For business inquiries, email care@onesmarter.com.",
  },
];

const MIRA_INPUT_LIMIT = 500;
const MIRA_HISTORY_LIMIT = 6;
const MIRA_HISTORY_TOTAL_LIMIT = 2000;
const requestedCafeRestorationEvents = new Set();

const askMiraEndpoint = async (message, conversationHistory = [], suggestedQuestionId = "") => {
  const response = await fetch("/api/agents/mira/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      ...(suggestedQuestionId ? { suggestedQuestionId } : {}),
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
  <div className="grid min-w-0 max-w-full gap-3 break-words [overflow-wrap:anywhere]">
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
          <ul key={key} className="ml-5 min-w-0 max-w-full list-disc space-y-1 break-words [overflow-wrap:anywhere]">
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
        ? "ml-0 grid min-w-0 max-w-full gap-2 border-l border-white/15 pl-3 sm:ml-4 sm:pl-4"
        : "grid min-w-0 max-w-full gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] p-3 sm:p-4"
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
      <div className="min-w-0 max-w-full">
        <h3 className="break-words text-base font-bold leading-6 text-white [overflow-wrap:anywhere]">
          {section.heading}
        </h3>
        {section.entityType ? (
          <p className="mt-1 break-words text-xs font-semibold uppercase tracking-wide text-red-200 [overflow-wrap:anywhere]">
            {miraEntityTypeLabel(section.entityType)}
          </p>
        ) : null}
      </div>
    </div>
    {section.summary ? (
      <p className={`${nested ? "text-sm text-zinc-300" : "ml-0 text-zinc-200 sm:ml-10"} break-words [overflow-wrap:anywhere]`}>
        {section.summary}
      </p>
    ) : null}
    {section.bullets?.length ? (
      <ul
        className={`${nested ? "ml-5" : "ml-5 sm:ml-14"} min-w-0 max-w-full list-disc space-y-1.5 break-words text-zinc-200 [overflow-wrap:anywhere]`}
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
  <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden break-words [overflow-wrap:anywhere]">
    {structure.introduction ? (
      <p className="break-words [overflow-wrap:anywhere]">
        {structure.introduction}
      </p>
    ) : null}
    {structure.sections.map((section) => (
      <MiraStructuredSection key={section.id} section={section} />
    ))}
    {structure.importantNote ? (
      <aside className="rounded-lg border border-amber-300/25 bg-amber-400/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
          Important note
        </p>
        <p className="mt-2 break-words text-zinc-200 [overflow-wrap:anywhere]">
          {structure.importantNote}
        </p>
      </aside>
    ) : null}
    {structure.followUpQuestion ? (
      <p className="max-w-full break-words rounded-lg border border-red-400/20 bg-red-950/20 p-3 font-medium text-red-100 [overflow-wrap:anywhere] sm:p-4">
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

const CafeConversationTranscript = ({ conversation, personaNames }) => {
  const inviterName = conversation.invitedBy
    ? personaNames[conversation.invitedBy]
    : "";
  const invitedParticipantName = conversation.invitedBy
    ? personaNames[
        conversation.participants.find(
          (participantId) => participantId !== conversation.invitedBy,
        )
      ]
    : "";

  return (
    <article className="rounded-lg border border-white/10 bg-black/30 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-white md:text-xl">
          {conversation.participants
            .map((participantId) => personaNames[participantId])
            .join(" and ")}
        </h3>
        <time className="text-sm text-zinc-400" dateTime={conversation.publishedAt}>
          {new Date(`${conversation.publishedAt}T00:00:00`).toLocaleDateString(
            "en-US",
            { year: "numeric", month: "long", day: "numeric" },
          )}
        </time>
      </div>
      {inviterName && invitedParticipantName && (
        <p className="mt-3 text-sm italic text-zinc-400">
          {inviterName} invited {invitedParticipantName} to the Café.
        </p>
      )}
      <ol className="mt-6 space-y-4">
        {conversation.exchanges.map((exchange, exchangeIndex) => (
          <li
            key={`${conversation.id}-${exchangeIndex}`}
            className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4"
          >
            <span className="font-semibold text-red-300">
              {personaNames[exchange.speaker]}
            </span>
            <p className="min-w-0 break-words leading-7 text-zinc-200">
              {exchange.text}
            </p>
          </li>
        ))}
      </ol>
    </article>
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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle");
  const latestMiraAnswer = [...conversationTurns]
    .reverse()
    .find((turn) => turn.role === "assistant" && !turn.error)?.content;
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
      threadEndRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "end",
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

  const requestMiraAnswer = async (message, suggestedQuestionId = "") => {
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
    setConversationTurns((turns) => [...turns, userTurn]);

    try {
      const response = await askMiraEndpoint(message, history, suggestedQuestionId);
      if (requestId !== latestRequestId.current) return;
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
    setCustomQuestion(example.question);
    const answerRequest = requestMiraAnswer(example.question);
    guideToAnswerPanel();
    await answerRequest;
    setCustomQuestion("");
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
    if (!trimmedQuestion || trimmedQuestion.length > MIRA_INPUT_LIMIT || isLoading) return;
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

  const isSubmitDisabled = isLoading || !customQuestion.trim() || customQuestion.length > MIRA_INPUT_LIMIT;

  return (
    <div className="grid min-w-0 max-w-full gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="min-w-0">
        <p className="text-sm leading-7 text-zinc-300">Ask about OneSmarter platforms, services, or trust posture. Choose a question to get started.</p>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Sample questions">
          {conversationExamples.map((example, index) => (
            <button key={example.id} type="button" onClick={() => handleQuestionClick(example, index)} disabled={isLoading}
              aria-label={`Ask Mira: ${example.question}`} aria-pressed={selectedIndex === index}
              className="min-h-11 max-w-full whitespace-normal break-words rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-left text-sm text-zinc-200 transition hover:border-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:opacity-50">
              {example.question}
            </button>
          ))}
        </div>
        {showSampleGuidance && <p role="status" className="mt-3 text-sm text-red-200">Your selected question has been sent to Mira.</p>}
        <form onSubmit={handleCustomQuestionSubmit} className="mt-6">
          <label htmlFor="mira-question" className="text-sm font-semibold">Ask Mira a question</label>
          <textarea id="mira-question" value={customQuestion} onChange={handleCustomQuestionChange} onKeyDown={handleCustomQuestionKeyDown}
            maxLength={MIRA_INPUT_LIMIT} rows={4} aria-describedby="mira-safety-notice mira-question-count"
            placeholder="What would you like to know about OneSmarter?" disabled={isLoading}
            className="mt-2 min-h-28 w-full min-w-0 resize-y rounded-md border border-white/15 bg-black/30 p-4 text-sm text-white placeholder:text-zinc-500 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/30" />
          <p id="mira-question-count" className="mt-2 text-xs text-zinc-400">{inputWarning || `${customQuestion.length}/${MIRA_INPUT_LIMIT} characters`}</p>
          <button type="submit" disabled={isSubmitDisabled} className="mt-4 min-h-11 rounded-md bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">
            {isLoading ? "Asking Mira..." : "Ask Mira"}
          </button>
        </form>
      </div>
      <div ref={answerPanelRef} className={`min-w-0 max-w-full overflow-x-hidden rounded-lg border bg-black/25 p-4 sm:p-6 ${isAnswerHighlighted ? "border-red-400" : "border-white/10"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <h3 className="font-semibold">Mira&apos;s response</h3>
          <button type="button" onClick={handleStartNewConversation} disabled={isLoading || conversationTurns.length === 0} className="min-h-11 rounded-md border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:border-red-400 disabled:opacity-40">Start new conversation</button>
        </div>
        <div ref={conversationScrollRef} onScroll={handleConversationScroll} className="mt-5 grid max-h-[36rem] min-h-64 min-w-0 gap-4 overflow-y-auto [overflow-wrap:anywhere]" aria-live="polite" aria-label="Mira conversation">
          {conversationTurns.length === 0 && <p className="text-sm leading-7 text-zinc-400">Choose a sample question or type your own. I&apos;ll help you find the information you need.</p>}
          {conversationTurns.map((turn) => (
            <div key={turn.id} className={`min-w-0 rounded-lg p-4 text-sm leading-7 ${turn.role === "user" ? "bg-white/10" : "bg-white/[0.03]"}`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-300">{turn.role === "user" ? "You" : "Mira"}</p>
              <MiraAnswerContent content={turn.content} structure={turn.response?.answerStructure} />
            </div>
          ))}
          {isLoading && <p role="status" className="text-sm text-zinc-300">Looking into your question...</p>}
          {errorMessage && <p className="sr-only" role="alert">{errorMessage}</p>}
          <div ref={threadEndRef} />
        </div>
        {latestMiraAnswer && <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <span role="status" className="text-xs text-zinc-400">{copyStatus === "copied" ? "Answer copied." : copyStatus === "failed" ? "Could not copy. Please select the answer text." : ""}</span>
          <button type="button" onClick={handleCopyAnswer} disabled={isLoading} className="min-h-11 rounded-md border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:border-red-400">Copy answer</button>
        </div>}
      </div>
    </div>
  );
};

const AiAgentsPage = () => {
  const [mode, setMode] = useState("question");
  const [cafeNow] = useState(() => new Date());
  const [viewedCafeConversationId, setViewedCafeConversationId] = useState("");
  const cafeTranscriptRef = useRef(null);
  const handleCafeSelection = (id) => {
    setViewedCafeConversationId(id);
    // Wait for React to render the selected transcript before positioning it.
    requestAnimationFrame(() => {
      cafeTranscriptRef.current?.focus({ preventScroll: true });
      cafeTranscriptRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    });
  };
  const currentCafeConversation = selectCafeConversation(undefined, cafeNow);
  useEffect(() => {
    if (!currentCafeConversation || !isCafeConversationActive(cafeNow)) return undefined;

    const bucketKey = getCafeWeekBucket(cafeNow).key;
    const requestKey = `onesmarter:cafe-restoration:${bucketKey}:${currentCafeConversation.id}`;
    if (requestedCafeRestorationEvents.has(requestKey)) return undefined;
    requestedCafeRestorationEvents.add(requestKey);
    fetch("/api/agents/cafe/restoration", {
      method: "POST",
    }).catch(() => requestedCafeRestorationEvents.delete(requestKey));
    return undefined;
  }, [cafeNow, currentCafeConversation]);
  const earlierPublishedCafeConversations = getEarlierCafeConversations(
    currentCafeConversation,
  );
  const viewedCafeConversation = earlierPublishedCafeConversations.find(
    (conversation) => conversation.id === viewedCafeConversationId,
  ) || currentCafeConversation;
  const cafePersonaNames = Object.fromEntries(
    cafePersonas.map((persona) => [persona.id, persona.name]),
  );
  return (
    <main className="overflow-x-hidden bg-zinc-950 text-white">
      <section id="ai-agents-hero" className="px-5 pb-16 pt-36 md:px-12 md:pb-20 md:pt-44">
        <div className="qa-container mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-400">AI Agents</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">Practical AI Agents for Secure, Accountable Workflows</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">Ask Mira about OneSmarter platforms, services, and trust posture using approved content. Or paste a page to review its clarity, evidence, and AI readability.</p>
          <a href="#mira-professional-guide" className="mt-8 inline-flex min-h-11 items-center rounded-md bg-red-600 px-6 py-3 font-semibold hover:bg-red-500">Open Mira</a>
        </div>
      </section>
      <section id="mira-professional-guide" className="scroll-mt-24 border-y border-white/10 bg-[#111111] px-5 py-12 md:px-12 md:py-16">
        <div className="qa-container mx-auto min-w-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold" aria-hidden="true">MV</div>
            <div><h2 className="text-2xl font-bold md:text-3xl">Mira Vale</h2><p className="mt-1 text-zinc-400">Your OneSmarter guide</p></div>
          </div>
          <p className="mt-5 max-w-2xl leading-7 text-zinc-300">I can help you understand OneSmarter or review public page content you share here. Where would you like to start?</p>
          <div className="mt-6 flex flex-wrap gap-3" role="group" aria-label="Choose how Mira can help">
            <button type="button" aria-pressed={mode === "question"} aria-controls="mira-question-panel" onClick={() => setMode("question")} className={`min-h-11 rounded-md border px-5 py-3 text-sm font-semibold ${mode === "question" ? "border-red-500 bg-red-600 text-white" : "border-white/20 text-zinc-300 hover:border-red-400"}`}>Ask a question</button>
            <button type="button" aria-pressed={mode === "analysis"} aria-controls="mira-analysis-panel" onClick={() => setMode("analysis")} className={`min-h-11 rounded-md border px-5 py-3 text-sm font-semibold ${mode === "analysis" ? "border-red-500 bg-red-600 text-white" : "border-white/20 text-zinc-300 hover:border-red-400"}`}>Check my page</button>
          </div>
          <p id="mira-safety-notice" className="mt-5 max-w-3xl text-xs leading-6 text-zinc-400">AI-generated responses may contain errors. Do not provide PHI or confidential information. For sensitive business, security, compliance, or procurement questions, contact <a href="mailto:care@onesmarter.com" className="text-zinc-200 underline underline-offset-4">care@onesmarter.com</a>.</p>
          <div id="mira-question-panel" hidden={mode !== "question"} className="mt-8"><MiraConversationPanel /></div>
          <div id="mira-analysis-panel" hidden={mode !== "analysis"} className="mt-8"><MiraPageReview /></div>
        </div>
      </section>
      <section id="agent-cafe" className="bg-zinc-950 px-5 py-16 text-white md:px-12">
        <div className="qa-container mx-auto rounded-lg border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">
            The Café
          </p>
          <h2 className="text-2xl font-bold md:text-4xl">
            A conversation over coffee
          </h2>
          <p className="mt-4 leading-7 text-zinc-300">
            These conversations are generated, not written, and nobody reviews them before they appear. The agents are given a small everyday subject and talk about it in character. Everything in them is invented — the incidents, the details, the people mentioned — and automated rules keep them away from our work, our customers, and anything real. They are here to show how the agents differ from each other, not as a record of anything that happened.
          </p>
          <div className="mt-8">
            <div id="cafe-selected-conversation" ref={cafeTranscriptRef} tabIndex={-1} className="scroll-mt-24 focus:outline-none">
              <CafeConversationTranscript
                conversation={viewedCafeConversation}
                personaNames={cafePersonaNames}
              />
            </div>
            {earlierPublishedCafeConversations.length > 0 && (
              <details className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:p-5 md:p-6">
                <summary className="cursor-pointer font-semibold text-zinc-200">
                  Earlier Café conversations
                </summary>
                <div className="mt-5 space-y-5">
                  {earlierPublishedCafeConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => handleCafeSelection(conversation.id)}
                      aria-pressed={viewedCafeConversationId === conversation.id}
                      aria-controls="cafe-selected-conversation"
                      className={`block w-full rounded-lg border p-4 text-left text-sm font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.06] ${viewedCafeConversationId === conversation.id ? "border-red-400 bg-white/[0.06]" : "border-white/10 bg-black/30"}`}
                    >
                      View {conversation.participants
                        .map((participantId) => cafePersonaNames[participantId])
                        .join(" and ")}
                      <span className="mt-2 block break-words font-normal leading-6 text-zinc-300">{conversation.seedTopic}</span>
                      <time className="mt-1 block font-normal text-zinc-400" dateTime={conversation.conversationDay || conversation.publishedAt}>
                        {new Date(`${conversation.conversationDay || conversation.publishedAt}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
                      </time>
                    </button>
                  ))}
                  {viewedCafeConversationId && (
                    <button
                      type="button"
                      onClick={() => handleCafeSelection("")}
                      className="text-sm font-semibold text-red-300 underline-offset-4 hover:underline"
                    >
                      Return to this week&apos;s conversation
                    </button>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </section>

      <section id="ai-agents-contact" className="bg-white px-5 py-14 text-zinc-950 md:px-12 md:py-16">
        <div className="qa-container mx-auto flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-red-600">Contact</p><h2 className="mt-3 text-2xl font-bold md:text-3xl">Let&apos;s talk about your next step.</h2><p className="mt-4 max-w-2xl leading-7 text-zinc-600">For business, security, compliance, and procurement questions, get in touch with our team.</p></div>
          <a href="mailto:care@onesmarter.com" className="inline-flex min-h-11 max-w-full items-center break-all rounded-md bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700">care@onesmarter.com</a>
        </div>
      </section>
    </main>
  );
};

export default AiAgentsPage;
