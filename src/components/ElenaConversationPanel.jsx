import React, { useEffect, useRef, useState } from "react";
import {
  ELENA_INPUT_LIMIT,
  ELENA_SUGGESTED_QUESTIONS,
  askElenaEndpoint,
  buildElenaConversationHistory,
  visibleElenaResponse,
} from "../data/agentPresentation/elenaPresentation.js";

const ElenaReferences = ({ sources }) => sources.length > 0 ? (
  <section className="mt-4 border-t border-white/10 pt-3" aria-label="Approved public references">
    <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
      Approved public references
    </h4>
    <ul className="mt-2 flex flex-wrap gap-2">
      {sources.map((source, index) => (
        <li key={`${source.title}-${index}`}>
          {source.route ? (
            <a
              href={source.route}
              className="inline-flex max-w-full rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs leading-5 text-zinc-300 transition hover:border-amber-300/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              {source.title}
            </a>
          ) : (
            <span className="inline-flex max-w-full rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs leading-5 text-zinc-400">
              {source.title}
            </span>
          )}
        </li>
      ))}
    </ul>
  </section>
) : null;

const ElenaConversationTurn = ({ turn }) => {
  if (turn.role === "user") {
    return (
      <li className="flex justify-end">
        <article className="max-w-[88%] rounded-2xl rounded-br-md border border-amber-200/15 bg-amber-100/[0.06] px-4 py-3 sm:max-w-[82%]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/80">Visitor</p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-100">{turn.content}</p>
        </article>
      </li>
    );
  }

  const turnResponse = visibleElenaResponse(turn.response);
  return (
    <li>
      <article className="max-w-prose border-l-2 border-amber-300/50 pl-4 sm:pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">Elena Cross</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200 sm:text-[15px]">
          {turn.content}
        </p>
        {turnResponse.clarificationNeeded && turnResponse.clarificationQuestion ? (
          <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-200/[0.05] px-4 py-3 text-sm leading-6 text-amber-100">
            {turnResponse.clarificationQuestion}
          </p>
        ) : null}
        {turnResponse.fallbackUsed ? (
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            Elena used the approved deterministic response for this question.
          </p>
        ) : null}
        <ElenaReferences sources={turnResponse.sources} />
      </article>
    </li>
  );
};

const ElenaConversationPanel = ({ onRequestStateChange = () => {} }) => {
  const conversationScrollRef = useRef(null);
  const [message, setMessage] = useState("");
  const [conversationTurns, setConversationTurns] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [response, setResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isMessageTooLong = message.length > ELENA_INPUT_LIMIT;

  useEffect(() => {
    const panel = conversationScrollRef.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [conversationTurns, errorMessage, isLoading]);

  const submitQuestion = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;
    if (trimmedMessage.length > ELENA_INPUT_LIMIT) {
      setErrorMessage(`Your question must be ${ELENA_INPUT_LIMIT} characters or fewer. Please shorten it and try again.`);
      return;
    }
    const history = buildElenaConversationHistory(conversationTurns);
    setConversationTurns((turns) => [...turns, { role: "user", content: trimmedMessage }]);
    setMessage("");
    setIsLoading(true);
    onRequestStateChange(true);
    setErrorMessage("");
    try {
      const nextResponse = await askElenaEndpoint({
        message: trimmedMessage,
        conversationHistory: history,
        conversationId,
      });
      setResponse(nextResponse);
      setConversationId(nextResponse.conversationId || conversationId);
      setConversationTurns((turns) => [
        ...turns,
        { role: "assistant", content: nextResponse.answer, response: nextResponse },
      ]);
    } catch (error) {
      setResponse(null);
      setErrorMessage(error.status === 429
        ? "Elena is receiving too many requests. Please try again shortly."
        : error.hasSafeServerMessage
          ? error.message
          : "Elena could not answer that question. Please try again with an approved compliance topic.");
    } finally {
      setIsLoading(false);
      onRequestStateChange(false);
    }
  };

  const startNewConversation = () => {
    setMessage("");
    setConversationTurns([]);
    setConversationId("");
    setResponse(null);
    setErrorMessage("");
  };

  return (
    <section id="elena-professional-compliance" className="scroll-mt-24 bg-zinc-900 px-5 py-16 text-white md:px-12">
      <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">Professional agent</p>
          <h2 className="mt-3 text-2xl font-bold md:text-4xl">Ask Elena Cross about compliance language</h2>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-300">
            Elena interprets approved OneSmarter public content about HIPAA, SOC 2,
            ISO/IEC 27001:2022, PCI DSS readiness, audit readiness, and the Trust Center.
            She does not certify customers or guarantee compliance outcomes.
          </p>

          <div className="mt-6 flex flex-wrap gap-2" aria-label="Suggested questions">
            {ELENA_SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => setMessage(question)}
                disabled={isLoading}
                className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-left text-xs font-semibold text-zinc-200 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:text-zinc-500"
              >
                {question}
              </button>
            ))}
          </div>

          <form className="mt-7" onSubmit={submitQuestion}>
            <label htmlFor="elena-question" className="text-sm font-semibold">Compliance question</label>
            <textarea
              id="elena-question"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setErrorMessage("");
              }}
              aria-invalid={isMessageTooLong}
              aria-describedby="elena-question-limit"
              placeholder="Ask Elena about an approved OneSmarter compliance topic."
              className="mt-2 min-h-28 w-full rounded-md border border-white/15 bg-black/30 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-300"
            />
            <p id="elena-question-limit" className={`mt-1 text-xs ${isMessageTooLong ? "text-red-300" : "text-zinc-500"}`}>
              {isMessageTooLong
                ? `Your question must be ${ELENA_INPUT_LIMIT} characters or fewer. Please shorten it and try again.`
                : `${message.length}/${ELENA_INPUT_LIMIT} characters`}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" disabled={isLoading || !message.trim() || isMessageTooLong} className="rounded-md bg-amber-600 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">
                {isLoading ? "Elena is reviewing..." : conversationTurns.length ? "Continue with Elena" : "Ask Elena"}
              </button>
              <button type="button" onClick={startNewConversation} disabled={isLoading} className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-300 hover:border-amber-300 hover:text-white disabled:cursor-not-allowed">
                Start new conversation
              </button>
            </div>
          </form>
        </div>

        <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 md:p-7" aria-live="polite">
          <div className="flex items-center gap-4 border-b border-white/10 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold">EC</div>
            <div><h3 className="font-semibold">Elena Cross</h3><p className="text-sm text-zinc-400">Compliance Reader</p></div>
          </div>

          <div ref={conversationScrollRef} className="mt-5 max-h-[28rem] overflow-y-auto overscroll-contain pr-1 sm:pr-2">
            {conversationTurns.length > 0 ? (
              <ol className="space-y-7" aria-label="Elena conversation history">
                {conversationTurns.map((turn, index) => (
                  <ElenaConversationTurn key={`${turn.role}-${index}`} turn={turn} />
                ))}
              </ol>
            ) : null}
            {!response && !errorMessage && !isLoading && conversationTurns.length === 0 ? (
              <p className="py-2 text-sm leading-7 text-zinc-400">Elena’s approved compliance response will appear here.</p>
            ) : null}
            {isLoading ? (
              <div className="mt-6 flex items-center gap-3 border-l-2 border-amber-300/40 pl-4 text-sm text-zinc-300" role="status">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" aria-hidden="true" />
                Reviewing approved compliance content...
              </div>
            ) : null}
            {errorMessage ? (
              <p className="mt-6 rounded-lg border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm leading-6 text-red-100" role="alert">{errorMessage}</p>
            ) : null}
          </div>
          <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-zinc-500">
            Do not submit confidential documents, private security evidence, PHI, or personal data. Elena provides approved public information, not legal advice or a compliance guarantee.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ElenaConversationPanel;
