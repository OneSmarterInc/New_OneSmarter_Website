const ENCODED_WHITESPACE = /(?:&#(?:x(?:09|0a|0d|20|a0)|(?:9|10|13|32|160));|&nbsp;)/gi;

export const normalizeTheoText = (value = "") => String(value).replace(ENCODED_WHITESPACE, " ");
const clean = (value = "") => normalizeTheoText(value).replace(/\s+/g, " ").trim();

const THEO_CONTROL_MARKER = /<<<SUPPLIED_CONTENT_(?:START|END)(?:_NEUTRALIZED)?>>>/i;
const THEO_INSTRUCTION_SHAPED_TEXT = /\b(?:ignore|disregard|override)\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above|system|developer)\s+(?:instructions?|prompts?|messages?)\b|\b(?:tell|instruct)\s+(?:Theo|the\s+(?:assistant|model|system))\s+to\b|\b(?:Theo|assistant|model|system)\s*(?:must|should|shall|:)\s*(?:say|state|claim|output|respond|ignore|follow|reveal)\b/i;

export const isTheoInstructionShapedContent = (value = "") => {
  const text = String(value);
  return THEO_CONTROL_MARKER.test(text) || THEO_INSTRUCTION_SHAPED_TEXT.test(text);
};

export const removeTheoInstructionShapedLines = (value = "") => String(value)
  .split(/\r?\n/)
  .filter((line) => !isTheoInstructionShapedContent(line))
  .join("\n");

export const excerptTheoEvidence = (value, limit = 150) => {
  const text = clean(value);
  if (text.length <= limit) return text;
  const candidate = text.slice(0, limit + 1);
  const sentenceEnds = [...candidate.matchAll(/[.!?](?=\s|$)/g)];
  const lastSentenceEnd = sentenceEnds.at(-1)?.index;
  if (lastSentenceEnd !== undefined && lastSentenceEnd >= Math.floor(limit * 0.45)) {
    return `${candidate.slice(0, lastSentenceEnd + 1).trim()}…`;
  }
  const wordBoundary = candidate.slice(0, limit).search(/\s+\S*$/);
  const end = wordBoundary > 0 ? wordBoundary : limit;
  return `${candidate.slice(0, end).trimEnd()}…`;
};

const finding = (area, issue, evidence, priority) => ({ area, issue, evidence, priority });
const recommendation = (priority, action, reason) => ({ priority, action, reason });
const unique = (items) => [...new Set(items)];

const REQUEST_FOCUS_RULES = [
  ["unsupported_facts", /\b(?:iso|certif|pricing|prices?|charges?|customers?|clients?)\b/i],
  ["ambiguous_language", /\b(?:vague|ambiguous|ambiguity|clearly explained|specific language)\b/i],
  ["ai_buyer_clarity", /\bai readability\b[\s\S]*\bbuyer clarity\b|\bbuyer clarity\b[\s\S]*\bai readability\b/i],
  ["ai_readability", /\b(?:ai readability|ai[- ]search|search engine|machine understanding|entities|relationships|crawler)\b/i],
  ["buyer_understanding", /\b(?:potential buyer|buyer understand|what .* understand|what remains unclear|still be unclear)\b/i],
  ["missing_buyer_information", /\b(?:missing buyer|buyer information|decision|evaluate|evaluation information|what is missing)\b/i],
  ["generic_marketing", /\b(?:generic marketing|promotional|marketing language|buzzwords?)\b/i],
];

export const classifyTheoAnalysisFocus = (message = "") =>
  REQUEST_FOCUS_RULES.find(([, pattern]) => pattern.test(message))?.[0] || "general_analysis";

const requestedUnsupportedFacts = (message = "") => {
  const facts = [];
  if (/\b(?:iso|certif)/i.test(message)) facts.push("ISO certification");
  if (/\b(?:pricing|prices?|charges?|costs?)/i.test(message)) facts.push("pricing");
  if (/\b(?:major )?(?:customers?|clients?)/i.test(message)) facts.push("customer names");
  return facts;
};

const suppliedSupportsFact = (fact, content) => {
  if (fact === "ISO certification") return /\bISO(?:\/IEC)?\s*27001\b|\bISO[- ]certified\b/i.test(content);
  if (fact === "pricing") return /(?:[$€£₹]\s*\d|\b(?:price|pricing|cost|fee|charge)s?\s*[:=]|\b\d+(?:\.\d+)?\s*(?:per month|monthly|annually|per user))/i.test(content);
  return /\b(?:customers?|clients?)\s*(?::|include|such as|including)\s+[A-Z][\w&.-]+/i.test(content);
};

export const hasSufficientTheoEvidence = (websiteContent = "") => clean(websiteContent).length >= 80;

const unsupportedFactAnalysis = (facts, content) => {
  const unsupported = facts.filter((fact) => !suppliedSupportsFact(fact, content));
  if (!unsupported.length) return null;
  const list = unsupported.join(unsupported.length > 1 ? ", " : "");
  return {
    overallAssessment: `The supplied content does not provide evidence for the requested ${list}, so ${unsupported.length === 1 ? "that fact" : "those facts"} cannot be determined from this page.`,
    strengths: ["Page content was supplied and can be assessed for what it explicitly states."],
    findings: unsupported.map((fact) => finding("Unsupported requested fact", `The requested ${fact} cannot be verified from the supplied page content.`, `The supplied content does not state ${fact}.`, "high")),
    recommendations: [recommendation("high", `Provide explicit, verifiable page evidence before making claims about ${list}.`, "Theo should distinguish missing evidence from a negative conclusion and must not invent the requested facts.")],
    clarificationNeeded: false,
    clarificationQuestion: null,
    evidenceStatus: "supplied_content_unsupported",
    analysisFocus: "unsupported_facts",
  };
};

export const runTheoLocalAnalysis = ({ message = "", websiteContent = "" } = {}) => {
  const content = normalizeTheoText(removeTheoInstructionShapedLines(websiteContent)).trim();
  const focus = classifyTheoAnalysisFocus(message);
  const requestedFacts = requestedUnsupportedFacts(message);
  if (content && requestedFacts.length) {
    const unsupported = unsupportedFactAnalysis(requestedFacts, content);
    if (unsupported) return unsupported;
  }
  if (!hasSufficientTheoEvidence(content)) {
    return {
      overallAssessment: "There is not enough supplied page content for a supported website analysis.",
      strengths: [], findings: [], recommendations: [], clarificationNeeded: true,
      clarificationQuestion: "Please supply the page text, headings, and any metadata you want analyzed.",
      evidenceStatus: "insufficient", analysisFocus: focus,
    };
  }

  const lines = content.split(/\r?\n/).map((line) => clean(line)).filter(Boolean);
  const wordCount = clean(content).split(" ").filter(Boolean).length;
  const headingPattern = /^(?:#{1,6}\s+|(?:heading|subheading|title|h[1-6])\s*:\s*\S)/i;
  const headings = lines.filter((line) => headingPattern.test(line));
  const hasMetadata = /\b(?:title|meta description|schema|json-ld|og:title|canonical)\s*[:=]/i.test(content);
  const hasAction = /\b(?:contact|email|request|book|schedule|start|learn more|get started|call)\b/i.test(content);
  const hasOffering = /\b(?:service|services|product|products|platform|solution|solutions|we provide|we offer)\b/i.test(content);
  const hasAudience = /\b(?:for|helps?|serves?|designed for|built for)\s+(?:[a-z]+\s+){0,4}(?:teams?|organizations?|companies|businesses|leaders|buyers|providers|clients)\b/i.test(content);
  const companyMatch = content.match(/\b(?:company|organization|provider)\s*:\s*([^\n.]+)/i)
    || content.match(/^\s*(?:#{1,6}\s+|(?:heading|title|h1)\s*:\s*)?([A-Z][A-Za-z0-9&.-]+)(?:\s+provides|\s+offers|\s+helps)/m);
  const vagueTerms = unique(content.match(/\b(?:innovative|cutting-edge|world-class|leading|seamless|best-in-class|revolutionary|intelligence for tomorrow|transform your business)\b/gi) || []);
  const strengths = [];
  const findings = [];
  const recommendations = [];

  const addStructureChecks = () => {
    if (headings.length) strengths.push(`The supplied content exposes information hierarchy through ${headings.length} recognized heading${headings.length === 1 ? "" : "s"}.`);
    else {
      findings.push(finding("Page structure", "No explicit Markdown or labelled heading is present in the supplied content.", excerptTheoEvidence(lines[0]), "high"));
      recommendations.push(recommendation("high", "Add a clear H1 and descriptive section headings.", "Explicit hierarchy helps readers and automated systems identify the page topic and major sections."));
    }
  };
  const addOfferingCheck = () => {
    if (hasOffering) strengths.push("The supplied text uses recognizable offering language such as service, product, platform, or solution.");
    else {
      findings.push(finding("Offering clarity", "The page does not directly identify what kind of offering is being described.", excerptTheoEvidence(content), "high"));
      recommendations.push(recommendation("high", "Name the offering and state what it does in direct language.", "A reader should not have to infer the offering from general claims."));
    }
  };
  const addBuyerDetails = () => {
    if (hasAudience) strengths.push("The supplied content gives a recognizable audience signal.");
    else {
      findings.push(finding("Buyer understanding — unclear", "The intended buyer or audience is not identified.", excerptTheoEvidence(content), "high"));
      recommendations.push(recommendation("high", "State who the offering is for and which problem it addresses.", "This lets a buyer decide whether the page is relevant."));
    }
    if (!hasAction) {
      findings.push(finding("Buyer understanding — unclear", "The next step for an interested buyer is missing.", excerptTheoEvidence(lines.at(-1)), "medium"));
      recommendations.push(recommendation("medium", "Add one specific buyer next step.", "A decision-useful page should tell an interested reader what to do next."));
    } else strengths.push("The page gives an interested buyer a recognizable next action.");
    if (wordCount < 120) {
      findings.push(finding("Buyer information — missing", "The brief content does not provide enough detail about scope, boundaries, process, or proof for evaluation.", `${wordCount} supplied words.`, "medium"));
      recommendations.push(recommendation("medium", "Add supported scope, process, boundaries, and proof points.", "These details help a buyer evaluate fit rather than only recognize the category."));
    }
  };
  const addVagueLanguage = () => {
    if (vagueTerms.length) {
      for (const phrase of vagueTerms) findings.push(finding("Ambiguous language", `“${phrase}” is promotional but does not identify a concrete capability, outcome, or differentiator.`, phrase, "high"));
      recommendations.push(recommendation("high", "Replace each vague phrase with a specific capability, supported outcome, audience, or operating detail.", "Exact language makes the service easier for buyers and machines to distinguish."));
    } else strengths.push("No common unsupported marketing superlatives were found in the supplied text.");
  };
  const addAiReadability = () => {
    if (companyMatch) strengths.push(`The company or provider is identifiable from supplied wording: ${excerptTheoEvidence(companyMatch[1], 80)}.`);
    else {
      findings.push(finding("AI entity clarity", "The company or provider entity is not explicitly identifiable.", excerptTheoEvidence(lines[0]), "high"));
      recommendations.push(recommendation("high", "Name the company and connect it directly to the offering.", "AI systems need an explicit company-to-service relationship rather than an implied one."));
    }
    addOfferingCheck();
    if (!hasAudience) {
      findings.push(finding("AI relationship clarity", "The relationship between the offering and its intended audience is unclear.", excerptTheoEvidence(content), "high"));
      recommendations.push(recommendation("high", "State who uses the offering and what problem it addresses.", "This establishes the company–service–audience relationship for machine understanding."));
    }
    if (hasMetadata) strengths.push("The supplied material includes an explicit metadata or structured-information cue.");
    else {
      findings.push(finding("Metadata evidence", "Metadata was not supplied, so its quality cannot be assessed.", "No title, meta description, canonical, schema, JSON-LD, or social metadata was supplied.", "low"));
      recommendations.push(recommendation("low", "Separately supply the title, meta description, canonical URL, and relevant structured data for review.", "Theo should not infer omitted metadata from body copy."));
    }
  };

  if (focus === "ai_buyer_clarity") {
    addAiReadability(); addBuyerDetails(); addVagueLanguage();
  } else if (focus === "buyer_understanding" || focus === "missing_buyer_information") {
    addOfferingCheck(); addBuyerDetails(); addVagueLanguage();
  } else if (focus === "ambiguous_language" || focus === "generic_marketing") {
    addVagueLanguage(); addOfferingCheck();
  } else if (focus === "ai_readability") {
    addAiReadability(); addStructureChecks();
  } else {
    addStructureChecks(); addOfferingCheck(); addBuyerDetails(); addVagueLanguage();
  }

  return {
    overallAssessment: focus === "ai_buyer_clarity"
      ? "The supplied content is machine-interpretable at a broad level, but buyers still lack important evaluation detail and specific proof."
      : focus === "buyer_understanding"
      ? `A potential buyer can understand ${hasOffering ? "the broad offering category" : "that the page is promotional"}, but ${findings.length ? "important evaluation information remains unclear or missing" : "the supplied content is broadly decision-useful"}.`
      : focus === "ambiguous_language" || focus === "generic_marketing"
        ? vagueTerms.length ? "The service description relies on vague promotional language that prevents a precise understanding of the offering." : "The supplied service language is reasonably specific, with no common promotional superlatives detected."
        : focus === "ai_readability"
          ? findings.some(({ priority }) => priority === "high") ? "AI search systems may struggle to identify one or more core entities or relationships in the supplied page content." : "The supplied content exposes the core company, service, and audience relationships reasonably clearly for AI interpretation."
          : findings.some(({ priority }) => priority === "high") ? "The supplied page content has material clarity gaps." : "The supplied page content is reasonably interpretable, with focused opportunities to improve decision usefulness.",
    strengths, findings, recommendations, clarificationNeeded: false,
    clarificationQuestion: null, evidenceStatus: "supplied_content_only", analysisFocus: focus,
  };
};

export const formatTheoVisitorAnswer = (analysis) => {
  if (analysis.clarificationNeeded) return normalizeTheoText(`${analysis.overallAssessment}\n\n${analysis.clarificationQuestion}`);
  const section = (title, items, render) => items.length ? `\n\n${title}\n${items.map(render).join("\n")}` : "";
  return normalizeTheoText(analysis.overallAssessment
    + section("Strengths", analysis.strengths, (item) => `- ${item}`)
    + section("Findings", analysis.findings, (item) => `- [${item.priority}] ${item.area}: ${item.issue} Evidence: ${item.evidence}`)
    + section("Prioritized recommendations", analysis.recommendations, (item) => `- [${item.priority}] ${item.action} ${item.reason}`));
};

export default runTheoLocalAnalysis;
