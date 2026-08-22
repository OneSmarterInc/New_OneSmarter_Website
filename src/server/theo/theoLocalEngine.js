const clean = (value = "") => String(value).replace(/\s+/g, " ").trim();
const excerpt = (value, limit = 150) => clean(value).slice(0, limit);
const finding = (area, issue, evidence, priority) => ({ area, issue, evidence, priority });
const recommendation = (priority, action, reason) => ({ priority, action, reason });

export const hasSufficientTheoEvidence = (websiteContent = "") => clean(websiteContent).length >= 80;

export const runTheoLocalAnalysis = ({ websiteContent = "" } = {}) => {
  const content = String(websiteContent).trim();
  if (!hasSufficientTheoEvidence(content)) {
    return {
      overallAssessment: "There is not enough supplied page content for a supported website analysis.",
      strengths: [], findings: [], recommendations: [], clarificationNeeded: true,
      clarificationQuestion: "Please supply the page text, headings, and any metadata you want analyzed.",
      evidenceStatus: "insufficient",
    };
  }

  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const wordCount = clean(content).split(" ").filter(Boolean).length;
  const headings = lines.filter((line) => /^#{1,6}\s+/.test(line));
  const hasMetadata = /\b(?:title|meta description|schema|json-ld|og:title|canonical)\s*[:=]/i.test(content);
  const hasAction = /\b(?:contact|email|request|book|schedule|start|learn more|get started|call)\b/i.test(content);
  const hasOffering = /\b(?:service|services|product|products|platform|solution|solutions|we provide|we offer)\b/i.test(content);
  const vagueTerms = content.match(/\b(?:innovative|cutting-edge|world-class|leading|seamless|best-in-class|revolutionary)\b/gi) || [];
  const strengths = [];
  const findings = [];
  const recommendations = [];

  if (headings.length) strengths.push("The supplied content includes explicit headings that expose some information hierarchy.");
  else {
    findings.push(finding("Page structure", "No explicit heading markers are present in the supplied content.", excerpt(lines[0]), "high"));
    recommendations.push(recommendation("high", "Add a clear H1 and descriptive H2/H3 headings.", "Explicit hierarchy helps buyers and automated systems identify the page topic and major sections."));
  }
  if (hasOffering) strengths.push("The supplied text uses recognizable offering language such as service, product, platform, or solution.");
  else {
    findings.push(finding("Offering clarity", "The supplied text does not clearly label a service, product, platform, or solution.", excerpt(content), "high"));
    recommendations.push(recommendation("high", "Name the offering and state what it does in direct language.", "A reader should not have to infer the offering from general claims."));
  }
  if (hasAction) strengths.push("The supplied content contains language that can guide a reader toward a next action.");
  else {
    findings.push(finding("Buyer signals", "No clear buyer next step is visible in the supplied content.", excerpt(lines.at(-1)), "medium"));
    recommendations.push(recommendation("medium", "Add one specific next action appropriate to the page.", "A decision-useful page should tell an interested reader what to do next."));
  }
  if (hasMetadata) strengths.push("The supplied material includes at least one explicit metadata or structured-information cue.");
  else {
    findings.push(finding("Metadata", "No metadata cues were supplied, so they cannot be assessed.", "No title, meta description, canonical, schema, JSON-LD, or social metadata was supplied.", "low"));
    recommendations.push(recommendation("low", "Supply or review the page title, meta description, canonical URL, and relevant structured data.", "These elements require separate evidence."));
  }
  if (vagueTerms.length) {
    findings.push(finding("Content clarity", "Promotional terminology may weaken specificity.", excerpt(vagueTerms.join(", ")), "medium"));
    recommendations.push(recommendation("medium", "Replace broad promotional terms with concrete, supported capabilities or outcomes.", "Specific language improves differentiation and reduces ambiguity."));
  }
  if (wordCount < 120) {
    findings.push(finding("Decision-useful detail", "The supplied content is brief and may omit evaluation details.", `${wordCount} supplied words.`, "medium"));
    recommendations.push(recommendation("medium", "Add supported detail about audience, problem, capability, boundaries, and next step.", "Those elements help a buyer decide whether the page is relevant."));
  }

  return {
    overallAssessment: findings.some(({ priority }) => priority === "high")
      ? "The supplied page content has material clarity or structure gaps that may make it harder for buyers and AI systems to understand."
      : "The supplied page content is reasonably interpretable, with focused opportunities to improve decision usefulness and machine-readable cues.",
    strengths, findings, recommendations, clarificationNeeded: false,
    clarificationQuestion: null, evidenceStatus: "supplied_content_only",
  };
};

export const formatTheoVisitorAnswer = (analysis) => {
  if (analysis.clarificationNeeded) return `${analysis.overallAssessment}\n\n${analysis.clarificationQuestion}`;
  const section = (title, items, render) => items.length ? `\n\n${title}\n${items.map(render).join("\n")}` : "";
  return analysis.overallAssessment
    + section("Strengths", analysis.strengths, (item) => `- ${item}`)
    + section("Findings", analysis.findings, (item) => `- [${item.priority}] ${item.area}: ${item.issue} Evidence: ${item.evidence}`)
    + section("Prioritized recommendations", analysis.recommendations, (item) => `- [${item.priority}] ${item.action} ${item.reason}`);
};

export default runTheoLocalAnalysis;
