import React, { useEffect, useRef, useState } from "react";
import {
  RAVI_INPUT_LIMIT,
  RAVI_SUGGESTED_QUESTIONS,
  askRaviEndpoint,
  buildRaviConversationHistory,
  visibleRaviResponse,
} from "../data/agentPresentation/raviPresentation.js";

const RaviReferences = ({ sources }) => sources.length ? (
  <section className="mt-4 border-t border-white/10 pt-3" aria-label="Approved public references">
    <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
      Approved public references
    </h4>
    <ul className="mt-2 flex flex-wrap gap-2">
      {sources.map((source, index) => (
        <li key={`${source.title}-${index}`}>
          {source.route ? (
            <a href={source.route} className="inline-flex max-w-full rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs leading-5 text-zinc-300 transition hover:border-red-300/60 hover:text-white">
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

const RaviConversationTurn = ({ turn }) => {
  if (turn.role === "user") {
    return (
      <li className="flex justify-end">
        <article className="max-w-[88%] rounded-2xl rounded-br-md border border-red-200/15 bg-red-100/[0.06] px-4 py-3 sm:max-w-[82%]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-200/80">Visitor</p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-100">{turn.content}</p>
        </article>
      </li>
    );
  }

  const visible = visibleRaviResponse(turn.response);
  return (
    <li>
      <article className="max-w-prose border-l-2 border-red-400/50 pl-4 sm:pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-200">Ravi Sen</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200 sm:text-[15px]">
          {visible.answer || turn.content}
        </p>
        {visible.clarificationNeeded && visible.clarificationQuestion ? (
          <p className="mt-4 rounded-lg border border-red-300/25 bg-red-200/[0.05] px-4 py-3 text-sm leading-6 text-red-100">
            {visible.clarificationQuestion}
          </p>
        ) : null}
        {visible.fallbackUsed ? (
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            Ravi used the approved deterministic response for this question.
          </p>
        ) : null}
        <RaviReferences sources={visible.sources} />
      </article>
    </li>
  );
};

const RaviConversationPanel = ({ onRequestStateChange = () => {} }) => {
  const scrollRef = useRef(null);
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isMessageTooLong = message.length > RAVI_INPUT_LIMIT;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, errorMessage, isLoading]);

  const submitQuestion = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;
    if (trimmedMessage.length > RAVI_INPUT_LIMIT) {
      setErrorMessage(`Your question must be ${RAVI_INPUT_LIMIT} characters or fewer. Please shorten it and try again.`);
      return;
    }
    const conversationHistory = buildRaviConversationHistory(turns);
    setTurns((current) => [...current, { role: "user", content: trimmedMessage }]);
    setMessage("");
    setIsLoading(true);
    onRequestStateChange(true);
    setErrorMessage("");
    try {
      const response = await askRaviEndpoint({
        message: trimmedMessage,
        conversationHistory,
        conversationId,
      });
      setConversationId(response.conversationId || conversationId);
      setTurns((current) => [
        ...current,
        { role: "assistant", content: response.answer, response },
      ]);
    } catch (error) {
      setErrorMessage(error.status === 429
        ? "Ravi is receiving too many requests. Please try again shortly."
        : error.hasSafeServerMessage
          ? error.message
          : "Ravi could not answer that question. Please try again with an approved operations topic.");
    } finally {
      setIsLoading(false);
      onRequestStateChange(false);
    }
  };

  const startNewConversation = () => {
    setMessage("");
    setTurns([]);
    setConversationId("");
    setErrorMessage("");
  };

  return (
    <section id="ravi-professional-operations" className="scroll-mt-24 bg-[#111111] px-5 py-16 text-white md:px-12">
      <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-red-400">Professional agent</p>
          <h2 className="mt-3 text-2xl font-bold md:text-4xl">Ask Ravi Sen about operational workflows</h2>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-300">
            Ravi explains approved workflow capabilities, secure ticketing, case management,
            escalation design, workflow modernization, and operational support. He cannot access
            customer queues or systems, modify tickets, perform escalations, or guarantee outcomes.
          </p>

          <div className="mt-6 flex flex-wrap gap-2" aria-label="Suggested operational questions">
            {RAVI_SUGGESTED_QUESTIONS.map((question) => (
              <button key={question} type="button" onClick={() => setMessage(question)} disabled={isLoading} className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-left text-xs font-semibold text-zinc-200 transition hover:border-red-400 disabled:cursor-not-allowed disabled:text-zinc-500">
                {question}
              </button>
            ))}
          </div>

          <form className="mt-7" onSubmit={submitQuestion}>
            <label htmlFor="ravi-question" className="text-sm font-semibold">Operations question</label>
            <textarea
              id="ravi-question"
              value={message}
              onChange={(event) => { setMessage(event.target.value); setErrorMessage(""); }}
              aria-invalid={isMessageTooLong}
              aria-describedby="ravi-question-limit"
              placeholder="Ask Ravi about an approved OneSmarter operations topic."
              className="mt-2 min-h-28 w-full rounded-md border border-white/15 bg-black/30 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-400"
            />
            <p id="ravi-question-limit" className={`mt-1 text-xs ${isMessageTooLong ? "text-red-300" : "text-zinc-500"}`}>
              {isMessageTooLong
                ? `Your question must be ${RAVI_INPUT_LIMIT} characters or fewer. Please shorten it and try again.`
                : `${message.length}/${RAVI_INPUT_LIMIT} characters`}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" disabled={isLoading || !message.trim() || isMessageTooLong} className="rounded-md bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">
                {isLoading ? "Ravi is reviewing..." : turns.length ? "Continue with Ravi" : "Ask Ravi"}
              </button>
              <button type="button" onClick={startNewConversation} disabled={isLoading} className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-300 hover:border-red-400 hover:text-white disabled:cursor-not-allowed">
                Start new conversation
              </button>
            </div>
          </form>
        </div>

        <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 md:p-7" aria-live="polite">
          <div className="flex items-center gap-4 border-b border-white/10 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-800 text-sm font-bold">RS</div>
            <div><h3 className="font-semibold">Ravi Sen</h3><p className="text-sm text-zinc-400">Operations Agent</p></div>
          </div>
          <div ref={scrollRef} className="mt-5 max-h-[28rem] overflow-y-auto overscroll-contain pr-1 sm:pr-2">
            {turns.length ? (
              <ol className="space-y-7" aria-label="Ravi conversation history">
                {turns.map((turn, index) => <RaviConversationTurn key={`${turn.role}-${index}`} turn={turn} />)}
              </ol>
            ) : (
              <p className="py-2 text-sm leading-7 text-zinc-400">Ravi’s approved operations response will appear here.</p>
            )}
            {isLoading ? (
              <div className="mt-6 flex items-center gap-3 border-l-2 border-red-400/40 pl-4 text-sm text-zinc-300" role="status">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" aria-hidden="true" />
                Reviewing approved operations content...
              </div>
            ) : null}
            {errorMessage ? <p className="mt-6 rounded-lg border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm leading-6 text-red-100" role="alert">{errorMessage}</p> : null}
          </div>
          <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-zinc-500">
            Do not submit ticket contents, customer data, credentials, PHI, or production-system details. Ravi explains approved public operational capabilities and does not access or act on live systems.
          </p>
        </div>
      </div>
    </section>
  );
};

export default RaviConversationPanel;
