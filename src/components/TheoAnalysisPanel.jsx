import React, { useState } from "react";
import {
  THEO_CONTENT_LIMIT,
  THEO_INPUT_LIMIT,
  askTheoEndpoint,
  buildTheoConversationHistory,
  visibleTheoAnalysis,
} from "../data/agentPresentation/theoPresentation.js";

const AnalysisList = ({ title, items, renderItem }) => items.length ? (
  <section className="mt-5">
    <h4 className="text-sm font-semibold uppercase tracking-wide text-sky-300">{title}</h4>
    <ul className="mt-3 space-y-3">
      {items.map((item, index) => (
        <li key={`${title}-${index}`} className="rounded-md border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-200">
          {renderItem(item)}
        </li>
      ))}
    </ul>
  </section>
) : null;

const TheoAnalysisPanel = ({ onAnalysisStateChange = () => {} }) => {
  const [message, setMessage] = useState("Analyze this supplied page for AI readability and buyer clarity.");
  const [websiteContent, setWebsiteContent] = useState("");
  const [conversationTurns, setConversationTurns] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [response, setResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const analysis = visibleTheoAnalysis(response);

  const submitAnalysis = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    const trimmedContent = websiteContent.trim();
    if (!trimmedMessage || !trimmedContent || isLoading) return;
    const history = buildTheoConversationHistory(conversationTurns);
    const userTurn = { role: "user", content: trimmedMessage };
    setConversationTurns((turns) => [...turns, userTurn]);
    setIsLoading(true);
    onAnalysisStateChange(true);
    setErrorMessage("");
    try {
      const nextResponse = await askTheoEndpoint({
        message: trimmedMessage,
        websiteContent: trimmedContent,
        conversationHistory: history,
        conversationId,
      });
      setResponse(nextResponse);
      setConversationId(nextResponse.conversationId || conversationId);
      setConversationTurns((turns) => [...turns, { role: "assistant", content: nextResponse.answer }]);
    } catch (error) {
      setResponse(null);
      setErrorMessage(error.status === 429
        ? "Theo is receiving too many requests. Please try again shortly."
        : error.hasSafeServerMessage
          ? error.message
          : "Theo could not complete the analysis. Please try again with the supplied page content.");
    } finally {
      setIsLoading(false);
      onAnalysisStateChange(false);
    }
  };

  const startNewAnalysis = () => {
    setConversationTurns([]);
    setConversationId("");
    setResponse(null);
    setErrorMessage("");
    setMessage("Analyze this supplied page for AI readability and buyer clarity.");
    setWebsiteContent("");
  };

  return (
    <section id="theo-professional-analysis" className="scroll-mt-24 bg-slate-950 px-5 py-16 text-white md:px-12">
      <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">Professional agent</p>
          <h2 className="mt-3 text-2xl font-bold md:text-4xl">Ask Theo Mercer to analyze supplied page content</h2>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-300">
            Paste public website or page content below. Theo analyzes only what you supply; he does not crawl URLs, browse the web, fetch live pages, inspect omitted metadata, or accept file uploads.
          </p>
          <form className="mt-7 space-y-5" onSubmit={submitAnalysis}>
            <div>
              <label htmlFor="theo-request" className="text-sm font-semibold">Analysis request</label>
              <textarea
                id="theo-request"
                value={message}
                maxLength={THEO_INPUT_LIMIT}
                onChange={(event) => setMessage(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-md border border-white/15 bg-black/30 p-4 text-sm text-white outline-none focus:border-sky-400"
              />
              <p className="mt-1 text-xs text-zinc-500">{message.length}/{THEO_INPUT_LIMIT} characters</p>
            </div>
            <div>
              <label htmlFor="theo-content" className="text-sm font-semibold">Supplied website/page content</label>
              <textarea
                id="theo-content"
                value={websiteContent}
                onChange={(event) => setWebsiteContent(event.target.value)}
                placeholder="Paste page headings, body text, calls to action, and any metadata you want Theo to assess."
                className="mt-2 min-h-64 w-full rounded-md border border-white/15 bg-black/30 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-400"
              />
              <p className="mt-1 text-xs text-zinc-500">{websiteContent.length}/{THEO_CONTENT_LIMIT} characters</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isLoading || !message.trim() || !websiteContent.trim()} className="rounded-md bg-sky-700 px-5 py-3 text-sm font-semibold hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-zinc-700">
                {isLoading ? "Theo is analyzing..." : conversationTurns.length ? "Continue with Theo" : "Ask Theo"}
              </button>
              <button type="button" onClick={startNewAnalysis} disabled={isLoading} className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-300 hover:border-sky-400 hover:text-white">
                Start new analysis
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 md:p-7" aria-live="polite">
          <div className="flex items-center gap-4 border-b border-white/10 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-700 text-sm font-bold">TM</div>
            <div><h3 className="font-semibold">Theo Mercer</h3><p className="text-sm text-zinc-400">AI readability and public website analysis</p></div>
          </div>
          {!response && !errorMessage && !isLoading && <p className="mt-6 text-sm leading-7 text-zinc-400">Theo’s supported analysis will appear here after you provide page content.</p>}
          {isLoading && <p className="mt-6 text-sm text-zinc-300">Reviewing only the content you supplied...</p>}
          {errorMessage && <p className="mt-6 rounded-md border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100" role="alert">{errorMessage}</p>}
          {response && (
            <div className="mt-6">
              <p className="text-base leading-7 text-zinc-100">{analysis.overallAssessment}</p>
              {analysis.clarificationNeeded && analysis.clarificationQuestion && <p className="mt-5 rounded-md border border-sky-500/30 bg-sky-950/30 p-4 text-sm text-sky-100">{analysis.clarificationQuestion}</p>}
              <AnalysisList title="Strengths" items={analysis.strengths} renderItem={(item) => item} />
              <AnalysisList title="Findings" items={analysis.findings} renderItem={(item) => <><span className="font-semibold capitalize text-white">{item.priority}: {item.area}</span><p className="mt-1">{item.issue}</p>{item.evidence && <p className="mt-2 text-xs text-zinc-400">Supplied evidence: {item.evidence}</p>}</>} />
              <AnalysisList title="Prioritized recommendations" items={analysis.recommendations} renderItem={(item) => <><span className="font-semibold capitalize text-white">{item.priority}</span><p className="mt-1">{item.action}</p><p className="mt-2 text-xs text-zinc-400">{item.reason}</p></>} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TheoAnalysisPanel;
