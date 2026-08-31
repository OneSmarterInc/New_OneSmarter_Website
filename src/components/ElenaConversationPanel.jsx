import React, { useState } from "react";
import {
  ELENA_INPUT_LIMIT,
  ELENA_SUGGESTED_QUESTIONS,
  askElenaEndpoint,
  buildElenaConversationHistory,
  visibleElenaResponse,
} from "../data/agentPresentation/elenaPresentation.js";

const ElenaConversationPanel = ({ onRequestStateChange = () => {} }) => {
  const [message, setMessage] = useState("");
  const [conversationTurns, setConversationTurns] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [response, setResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const visibleResponse = visibleElenaResponse(response);

  const submitQuestion = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;
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
        { role: "assistant", content: nextResponse.answer },
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
              maxLength={ELENA_INPUT_LIMIT}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask Elena about an approved OneSmarter compliance topic."
              className="mt-2 min-h-28 w-full rounded-md border border-white/15 bg-black/30 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-300"
            />
            <p className="mt-1 text-xs text-zinc-500">{message.length}/{ELENA_INPUT_LIMIT} characters</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" disabled={isLoading || !message.trim()} className="rounded-md bg-amber-600 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">
                {isLoading ? "Elena is reviewing..." : conversationTurns.length ? "Continue with Elena" : "Ask Elena"}
              </button>
              <button type="button" onClick={startNewConversation} disabled={isLoading} className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-300 hover:border-amber-300 hover:text-white disabled:cursor-not-allowed">
                Start new conversation
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 md:p-7" aria-live="polite">
          <div className="flex items-center gap-4 border-b border-white/10 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold">EC</div>
            <div><h3 className="font-semibold">Elena Cross</h3><p className="text-sm text-zinc-400">Compliance Reader</p></div>
          </div>

          {conversationTurns.length > 0 && (
            <ol className="mt-5 max-h-72 space-y-3 overflow-y-auto" aria-label="Elena conversation history">
              {conversationTurns.map((turn, index) => (
                <li key={`${turn.role}-${index}`} className={`rounded-md p-3 text-sm leading-6 ${turn.role === "user" ? "ml-6 bg-amber-950/30 text-amber-50" : "mr-6 bg-black/25 text-zinc-200"}`}>
                  <span className="sr-only">{turn.role === "user" ? "You" : "Elena"}: </span>
                  {turn.content}
                </li>
              ))}
            </ol>
          )}
          {!response && !errorMessage && !isLoading && conversationTurns.length === 0 && <p className="mt-6 text-sm leading-7 text-zinc-400">Elena’s approved compliance response will appear here.</p>}
          {isLoading && <p className="mt-6 text-sm text-zinc-300">Reviewing approved compliance content...</p>}
          {errorMessage && <p className="mt-6 rounded-md border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100" role="alert">{errorMessage}</p>}
          {response && (
            <div className="mt-6">
              {visibleResponse.clarificationNeeded && visibleResponse.clarificationQuestion && (
                <p className="rounded-md border border-amber-400/30 bg-amber-950/30 p-4 text-sm text-amber-100">{visibleResponse.clarificationQuestion}</p>
              )}
              {visibleResponse.fallbackUsed && (
                <p className="mt-4 rounded-md border border-white/15 bg-black/25 p-4 text-xs leading-5 text-zinc-300">
                  Elena used the approved deterministic response for this question.
                </p>
              )}
              {visibleResponse.sources.length > 0 && (
                <section className="mt-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-300">Approved public references</h4>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {visibleResponse.sources.map((source, index) => (
                      <li key={`${source.title}-${index}`}>
                        {source.route ? <a href={source.route} className="inline-flex rounded-full border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:border-amber-300 hover:text-white">{source.title}</a> : <span className="inline-flex rounded-full border border-white/15 px-3 py-2 text-xs text-zinc-300">{source.title}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
          <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-zinc-500">
            Do not submit confidential documents, private security evidence, PHI, or personal data. Elena provides approved public information, not legal advice or a compliance guarantee.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ElenaConversationPanel;
