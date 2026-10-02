import React, { useState } from "react";
import {
  THEO_CONTENT_LIMIT,
  THEO_INPUT_LIMIT,
  THEO_SUGGESTED_QUESTIONS,
  askTheoEndpoint,
  buildTheoConversationHistory,
  visibleTheoAnalysis,
} from "../data/agentPresentation/theoPresentation.js";

const DEFAULT_REQUEST = "Analyze this supplied page for AI readability and buyer clarity.";
const fieldClass = "mt-2 w-full min-w-0 resize-y rounded-md border border-white/15 bg-black/30 p-4 text-sm text-white placeholder:text-zinc-500 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/30";

const AnalysisList = ({ title, items, renderItem }) => items.length ? (
  <div className="mt-5">
    <h4 className="text-sm font-semibold text-red-200">{title}</h4>
    <ul className="mt-3 space-y-3">
      {items.map((item, index) => <li key={`${title}-${index}`} className="min-w-0 rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 [overflow-wrap:anywhere]">{renderItem(item)}</li>)}
    </ul>
  </div>
) : null;

export const MiraReviewResult = ({ response }) => {
  const analysis = visibleTheoAnalysis(response);
  return (
    <div className="mt-6 text-zinc-200">
      <p className="text-sm leading-7">{analysis.overallAssessment || response.answer}</p>
      {analysis.clarificationNeeded && analysis.clarificationQuestion && <p className="mt-4 text-sm leading-7 text-red-200">{analysis.clarificationQuestion}</p>}
      <AnalysisList title="Strengths" items={analysis.strengths} renderItem={(item) => item} />
      <AnalysisList title="Findings" items={analysis.findings} renderItem={(item) => <><p className="font-semibold text-white">{item.priority}: {item.area}</p><p className="mt-1">{item.issue}</p>{item.evidence && <p className="mt-2 text-xs text-zinc-400">Supplied evidence: {item.evidence}</p>}</>} />
      <AnalysisList title="Prioritized recommendations" items={analysis.recommendations} renderItem={(item) => <><p className="font-semibold capitalize text-white">{item.priority}</p><p className="mt-1">{item.action}</p><p className="mt-2 text-xs text-zinc-400">{item.reason}</p></>} />
    </div>
  );
};

// Presentation only: supplied content uses the existing analysis module and
// its endpoint, history builder, output presentation, and server-side safeguards.
// Its state is separate from Mira's normal question history.
const MiraPageReview = () => {
  const [message, setMessage] = useState(DEFAULT_REQUEST);
  const [websiteContent, setWebsiteContent] = useState("");
  const [conversationTurns, setConversationTurns] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [response, setResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isContentTooLong = websiteContent.length > THEO_CONTENT_LIMIT;
  const isRequestTooLong = message.length > THEO_INPUT_LIMIT;

  const runAnalysis = async (question) => {
    const trimmedMessage = question.trim();
    const trimmedContent = websiteContent.trim();
    if (isLoading || !trimmedMessage || !trimmedContent || question.length > THEO_INPUT_LIMIT || isContentTooLong) return;
    const history = buildTheoConversationHistory(conversationTurns);
    setResponse(null);
    setErrorMessage("");
    setIsLoading(true);
    try {
      const nextResponse = await askTheoEndpoint({
        message: trimmedMessage,
        websiteContent: trimmedContent,
        conversationHistory: history,
        conversationId,
      });
      setResponse(nextResponse);
      setConversationId(nextResponse.conversationId || conversationId);
      setConversationTurns((turns) => [...turns,
        { role: "user", content: trimmedMessage },
        { role: "assistant", content: nextResponse.answer },
      ]);
    } catch (error) {
      setErrorMessage(error.status === 429
        ? "Page review is receiving too many requests. Please try again shortly."
        : error.hasSafeServerMessage
          ? error.message
          : "The page review could not be completed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {
    setConversationTurns([]);
    setConversationId("");
    setResponse(null);
    setErrorMessage("");
  };

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-lg border border-white/10 p-4"><h3 className="font-semibold text-red-200">What to share with me</h3><p className="mt-2 leading-7 text-zinc-300">Public page text, headings, calls to action, and any metadata you want reviewed.</p></div>
        <div className="rounded-lg border border-white/10 p-4"><h3 className="font-semibold text-red-200">What I can assess</h3><p className="mt-2 leading-7 text-zinc-300">Clarity, buyer understanding, supplied claims and evidence, AI readability, and prioritized improvements.</p></div>
        <div className="rounded-lg border border-white/10 p-4"><h3 className="font-semibold text-red-200">How I review</h3><p className="mt-2 leading-7 text-zinc-300">I review only what you paste. I do not browse URLs, verify facts independently, inspect omitted metadata, or accept file uploads.</p></div>
      </div>
      <div className="mt-6 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2" aria-label="Page review sample questions">
            {THEO_SUGGESTED_QUESTIONS.map((question) => (
              <button key={question} type="button" disabled={isLoading} onClick={() => { setMessage(question); runAnalysis(question); }} className="min-h-11 max-w-full whitespace-normal break-words rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-left text-sm text-zinc-200 hover:border-red-400 disabled:opacity-50">{question}</button>
            ))}
          </div>
          <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); runAnalysis(message); }}>
            <div>
              <label htmlFor="mira-review-request" className="text-sm font-semibold">What would you like me to check?</label>
              <textarea id="mira-review-request" value={message} disabled={isLoading} onChange={(event) => setMessage(event.target.value)} aria-invalid={isRequestTooLong} aria-describedby="mira-review-request-count mira-safety-notice" rows={3} className={fieldClass} />
              <p id="mira-review-request-count" className={`mt-2 text-xs ${isRequestTooLong ? "text-red-200" : "text-zinc-400"}`}>{isRequestTooLong ? `Shorten your request to ${THEO_INPUT_LIMIT} characters or fewer.` : `${message.length}/${THEO_INPUT_LIMIT} characters`}</p>
            </div>
            <div>
              <label htmlFor="mira-review-content" className="text-sm font-semibold">Page content to review</label>
              <textarea id="mira-review-content" value={websiteContent} disabled={isLoading} onChange={(event) => { setWebsiteContent(event.target.value); resetAnalysis(); }} aria-invalid={isContentTooLong} aria-describedby="mira-review-content-count mira-safety-notice" placeholder="Paste the public page text here, rather than a URL." rows={9} className={`${fieldClass} min-h-52 sm:min-h-64`} />
              <p id="mira-review-content-count" className={`mt-2 text-xs ${isContentTooLong ? "text-red-200" : "text-zinc-400"}`}>{isContentTooLong ? `Shorten your page content to ${THEO_CONTENT_LIMIT} characters or fewer. Your text has not been cut off.` : `${websiteContent.length}/${THEO_CONTENT_LIMIT} characters`}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isLoading || !message.trim() || !websiteContent.trim() || isContentTooLong || isRequestTooLong} className="min-h-11 rounded-md bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">{isLoading ? "Reviewing your page..." : "Review my page"}</button>
              <button type="button" onClick={() => { resetAnalysis(); setMessage(DEFAULT_REQUEST); setWebsiteContent(""); }} disabled={isLoading} className="min-h-11 rounded-md border border-white/15 px-4 py-3 text-sm text-zinc-300 hover:border-red-400 disabled:opacity-40">Start new review</button>
            </div>
          </form>
        </div>
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/25 p-4 [overflow-wrap:anywhere] sm:p-6" aria-live="polite" aria-label="Mira page review">
          <h3 className="border-b border-white/10 pb-4 font-semibold">Mira&apos;s page review</h3>
          {!response && !errorMessage && !isLoading && <p className="mt-6 text-sm leading-7 text-zinc-400">Paste a page and choose what to check. Your review will appear here.</p>}
          {isLoading && <p role="status" className="mt-6 text-sm text-zinc-300">Reviewing only the content you supplied...</p>}
          {errorMessage && <p role="alert" className="mt-6 rounded-md border border-red-400/30 bg-red-950/30 p-4 text-sm leading-7 text-red-100">{errorMessage}</p>}
          {response && <MiraReviewResult response={response} />}
        </div>
      </div>
    </div>
  );
};

export default MiraPageReview;
