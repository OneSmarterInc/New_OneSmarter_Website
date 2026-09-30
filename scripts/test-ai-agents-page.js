import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { siteDirectory } from "../src/data/siteDirectory.js";

// Render the actual page, without listening on a port or calling any agent.
const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: "custom" });
try {
  const { default: Page } = await server.ssrLoadModule("/src/components/AiAgentsPage.jsx");
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.deepEqual([...html.matchAll(/<section id="([^"]+)"/g)].map(match => match[1]), [
    "ai-agents-hero", "mira-professional-guide", "agent-cafe", "ai-agents-contact",
  ]);
  const professionalSurface = html.slice(0, html.indexOf('<section id="agent-cafe"'));
  assert.doesNotMatch(professionalSurface, /Theo Mercer|Elena Cross|Ravi Sen|Selene Hart|Hear Mira|persona posture|memory theme|live presence/i);
  assert.match(professionalSurface, /Ask a question/);
  assert.match(professionalSurface, /Check my page/);
  assert.equal((html.match(/id="mira-safety-notice"/g) || []).length, 1);
  assert.match(html, /id="mira-question"[^>]*maxLength="500"/);
  assert.match(html, /id="mira-analysis-panel" hidden/);
  assert.match(html, /Page content to review/);
  assert.match(html, /0\/20000 characters/);
  assert.match(html, /What to share with me/);
  assert.match(html, /What I can assess/);
  assert.match(html, /How I review/);
  assert.match(html, /Earlier Café conversations/);
  assert.match(html, /conversations generated offline, reviewed by a person, and published as data/i);
  assert.doesNotMatch(html, /<audio|<video|Open Theo|Open Elena|Open Ravi|Open Selene|first release boundary|capabilities we are building toward/i);

  const { MiraReviewResult } = await server.ssrLoadModule("/src/components/MiraPageReview.jsx");
  const supplied = "Theo Mercer founded Theo Studio. Theo leads the research team.";
  const response = { answer: supplied, analysis: {
    overallAssessment: supplied, strengths: [supplied],
    findings: [{ priority: "low", area: "Team", issue: supplied, evidence: supplied }],
    recommendations: [{ priority: "low", action: supplied, reason: supplied }],
    clarificationNeeded: true, clarificationQuestion: supplied,
  } };
  const originalResponse = JSON.stringify(response);
  const renderedReview = renderToStaticMarkup(React.createElement(MiraReviewResult, { response }));
  assert.equal(renderedReview.split(supplied).length - 1, 7, "Preserve names in all rendered analysis fields");
  assert.equal(JSON.stringify(response), originalResponse, "Rendering must not mutate analysis data");
  assert.doesNotMatch(renderedReview, /Mira Studio|Mira leads/);
  const { askTheoEndpoint } = await import("../src/data/agentPresentation/theoPresentation.js");
  let sent;
  const returned = await askTheoEndpoint({ message: "Review this page", websiteContent: supplied,
    fetchImpl: async (url, options) => {
      assert.equal(url, "/api/agents/theo/chat");
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => response };
    },
  });
  assert.equal(sent.websiteContent, supplied, "Supplied document must reach the existing endpoint unchanged");
  assert.equal(returned, response);
  assert.doesNotMatch(professionalSurface, /delegate|delegating|handing.*Theo|powered by Theo/i);

  const page = readFileSync("src/components/AiAgentsPage.jsx", "utf8");
  const review = readFileSync("src/components/MiraPageReview.jsx", "utf8");
  assert.match(page, /fetch\("\/api\/agents\/mira\/chat"/);
  assert.doesNotMatch(page, /websiteContent|askTheoEndpoint/);
  assert.match(review, /await askTheoEndpoint\(\{[\s\S]*?websiteContent: trimmedContent,[\s\S]*?conversationHistory: history/);
  assert.match(review, /buildTheoConversationHistory\(conversationTurns\)/);
  assert.match(review, /visibleTheoAnalysis\(response\)/);
  assert.match(review, /isContentTooLong \|\| isRequestTooLong/);
  assert.doesNotMatch(review, /maxLength=\{THEO_CONTENT_LIMIT\}/, "Do not silently truncate pasted content");
  assert.match(review, /setWebsiteContent\(event.target.value\); resetAnalysis\(\)/, "A changed page starts a new analysis context");
  assert.doesNotMatch(page + review, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(review, /\.replace\(/, "Do not rewrite generated analysis or server errors");

  const listing = siteDirectory.find(entry => entry.route === "/ai-agents");
  assert.doesNotMatch(JSON.stringify(listing), /Theo|Elena|Ravi|Selene|in development|agent team/);
  assert.match(listing.shortSummary, /Mira Vale.*paste public page content.*Café/);
  console.log("AI Agents page tests passed: four sections, one guide, existing analysis wiring, input limits, Café and crawler copy.");
} finally {
  await server.close();
}
