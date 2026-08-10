import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { onesmarterPublicKnowledgeBase } from "../src/data/agentKnowledge/onesmarterPublicKb.js";
import { miraClaimRules } from "../src/data/agentKnowledge/miraClaimRules.js";
import { miraTestQuestions } from "../src/data/agentKnowledge/miraTestQuestions.js";
import { siteDirectory } from "../src/data/siteDirectory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const failures = [];

const requiredKbFields = [
  "id",
  "route",
  "title",
  "category",
  "approvedSummary",
  "sourceFacts",
  "allowedClaims",
  "disallowedClaims",
  "handoffGuidance",
  "relatedQuestions",
  "sourceLabel",
];

const riskyPhrasePatterns = [
  { label: "HIPAA Certified", pattern: /\bHIPAA\s+certified\b/i },
  { label: "HIPAA Certification", pattern: /\bHIPAA\s+certification\b/i },
  { label: "SOC 2 Certified", pattern: /\bSOC\s*2\s+certified\b/i },
  { label: "guaranteed compliance", pattern: /\bguaranteed\s+compliance\b/i },
  { label: "fully compliant", pattern: /\bfully\s+compliant\b/i },
  { label: "HIPPA", pattern: /\bHIPPA\b/i },
];

const publicKbTextFields = [
  "approvedSummary",
  "sourceFacts",
  "allowedClaims",
  "handoffGuidance",
];

const allowedRuleContexts = new Set([
  "prohibitedPhrases",
  "replacementWording.risky",
  "replacementWording.safer",
  "refusalPatterns.response",
  "requiredHandlingRules",
]);

const allowedTestContexts = new Set([
  "question",
  "expectedAnswerThemes",
  "mustAvoid",
]);

const fail = (message) => failures.push(message);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isNonEmptyArray = (value) =>
  Array.isArray(value) && value.some((item) => isNonEmptyString(item));

const textValues = (value) => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  return [];
};

const riskyMatches = (value) =>
  textValues(value).flatMap((text) =>
    riskyPhrasePatterns
      .filter(({ pattern }) => pattern.test(text))
      .map(({ label }) => label),
  );

const ensureArrayExport = (name, value) => {
  if (!Array.isArray(value)) {
    fail(`${name} must export an array.`);
  }
};

const ensureObjectExport = (name, value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${name} must export an object.`);
  }
};

const validateKnowledgeBase = () => {
  ensureArrayExport("onesmarterPublicKnowledgeBase", onesmarterPublicKnowledgeBase);

  const ids = new Set();
  for (const [index, entry] of onesmarterPublicKnowledgeBase.entries()) {
    const label = entry?.id || `entry at index ${index}`;

    for (const field of requiredKbFields) {
      if (!(field in entry)) {
        fail(`KB ${label} is missing required field: ${field}.`);
      }
    }

    if (!isNonEmptyString(entry.id)) fail(`KB ${label} has an empty id.`);
    if (!isNonEmptyString(entry.approvedSummary)) {
      fail(`KB ${label} has an empty approvedSummary.`);
    }
    if (!isNonEmptyArray(entry.sourceFacts)) {
      fail(`KB ${label} must include a non-empty sourceFacts array.`);
    }
    if (!isNonEmptyArray(entry.allowedClaims)) {
      fail(`KB ${label} must include a non-empty allowedClaims array.`);
    }
    if (!isNonEmptyArray(entry.disallowedClaims)) {
      fail(`KB ${label} must include a non-empty disallowedClaims array.`);
    }
    if (!isNonEmptyString(entry.handoffGuidance)) {
      fail(`KB ${label} must include handoffGuidance.`);
    }
    if (!isNonEmptyArray(entry.relatedQuestions)) {
      fail(`KB ${label} must include a non-empty relatedQuestions array.`);
    }

    if (ids.has(entry.id)) fail(`Duplicate KB id: ${entry.id}.`);
    ids.add(entry.id);

    for (const field of publicKbTextFields) {
      const matches = riskyMatches(entry[field]);
      if (matches.length) {
        fail(
          `KB ${label}.${field} contains prohibited public wording: ${[
            ...new Set(matches),
          ].join(", ")}.`,
        );
      }
    }
  }
};

const validateClaimRules = () => {
  ensureObjectExport("miraClaimRules", miraClaimRules);

  for (const field of [
    "approvedPhrases",
    "prohibitedPhrases",
    "replacementWording",
    "refusalPatterns",
    "handoffPatterns",
    "riskyTopicCategories",
    "requiredHandlingRules",
  ]) {
    if (!Array.isArray(miraClaimRules[field]) || miraClaimRules[field].length === 0) {
      fail(`miraClaimRules.${field} must be a non-empty array.`);
    }
  }

  const requiredApproved = [
    "SOC 2 Type II Attested",
    "HIPAA Security Rule Compliance Assessment Completed",
  ];
  for (const phrase of requiredApproved) {
    if (!miraClaimRules.approvedPhrases.includes(phrase)) {
      fail(`miraClaimRules.approvedPhrases must include: ${phrase}.`);
    }
  }

  const requiredProhibited = [
    "HIPAA Certified",
    "HIPAA Certification",
    "SOC 2 Certified",
  ];
  for (const phrase of requiredProhibited) {
    if (!miraClaimRules.prohibitedPhrases.includes(phrase)) {
      fail(`miraClaimRules.prohibitedPhrases must include: ${phrase}.`);
    }
  }

  for (const phrase of miraClaimRules.approvedPhrases || []) {
    const matches = riskyMatches(phrase);
    if (matches.length) {
      fail(`miraClaimRules.approvedPhrases contains prohibited wording: ${phrase}.`);
    }
  }

  for (const [field, values] of Object.entries({
    prohibitedPhrases: miraClaimRules.prohibitedPhrases,
    requiredHandlingRules: miraClaimRules.requiredHandlingRules,
  })) {
    for (const value of values || []) {
      const matches = riskyMatches(value);
      if (matches.length && !allowedRuleContexts.has(field)) {
        fail(`Unexpected prohibited wording in miraClaimRules.${field}: ${value}.`);
      }
    }
  }

  for (const rule of miraClaimRules.replacementWording || []) {
    for (const field of ["risky", "safer"]) {
      const context = `replacementWording.${field}`;
      const matches = riskyMatches(rule[field]);
      if (matches.length && !allowedRuleContexts.has(context)) {
        fail(`Unexpected prohibited wording in miraClaimRules.${context}.`);
      }
    }
  }

  for (const refusal of miraClaimRules.refusalPatterns || []) {
    const context = "refusalPatterns.response";
    const matches = riskyMatches(refusal.response);
    if (matches.length && !allowedRuleContexts.has(context)) {
      fail(`Unexpected prohibited wording in miraClaimRules.${context}.`);
    }
  }
};

const validateTestQuestions = () => {
  ensureArrayExport("miraTestQuestions", miraTestQuestions);

  const ids = new Set();
  for (const [index, test] of miraTestQuestions.entries()) {
    const label = test?.id || `test at index ${index}`;
    if (!isNonEmptyString(test.id)) fail(`Mira test ${label} has an empty id.`);
    if (ids.has(test.id)) fail(`Duplicate Mira test id: ${test.id}.`);
    ids.add(test.id);

    if (!isNonEmptyString(test.question)) {
      fail(`Mira test ${label} must include a question.`);
    }
    if (!isNonEmptyString(test.expectedHandling)) {
      fail(`Mira test ${label} must include expectedHandling.`);
    }

    for (const field of ["question", "expectedAnswerThemes", "mustAvoid"]) {
      const matches = riskyMatches(test[field]);
      if (matches.length && !allowedTestContexts.has(field)) {
        fail(`Unexpected prohibited wording in Mira test ${label}.${field}.`);
      }
    }
  }
};

const validateCanonicalSiteKnowledge = () => {
  const platforms = siteDirectory.filter(
    (page) => page.promoted && page.serviceType === "Software platform",
  );
  if (platforms.length !== 2) {
    fail(`Canonical site taxonomy must expose exactly 2 promoted software platforms, found ${platforms.length}.`);
  }
  const telecomPage = siteDirectory.find(
    (page) => page.route === "/platforms/telecom-expense-management",
  );
  if (
    !telecomPage ||
    telecomPage.promoted !== false ||
    telecomPage.serviceType !== "Use case" ||
    !telecomPage.shortSummary.includes("Bill Audit & Bill Pay use case")
  ) {
    fail("Telecom Expense Management must remain a non-promoted Bill Audit & Bill Pay use case.");
  }

  const hiringPage = siteDirectory.find(
    (page) => page.route === "/business-services/eor-hr",
  );
  const expectedHiringBlocks = [
    "Practice hiring support: OneSmarter helps practices hire with focus — job postings written around the exact specialty, skills, and experience the role requires (a PA with specific specialty and procedure experience, not a generic PA posting), candidate screening against those stated requirements, and credentialing tracked from offer through completion.",
    "Agent-assisted hiring (in development): OneSmarter is building agent support for practice hiring — drafting postings, coordinating candidate communication, and tracking credentialing steps. This capability is in development and is not yet an offered service; no availability date is committed. Practices can express early interest via care@onesmarter.com. Do not describe agent-assisted hiring as currently available.",
  ];
  if (JSON.stringify(hiringPage?.approvedContent) !== JSON.stringify(expectedHiringBlocks)) {
    fail("The two approved practice-hiring blocks must remain verbatim in siteDirectory.js.");
  }
  for (const relativePath of [
    "public/llms-full.txt",
    "public/ai-pages/business-services/eor-hr.md",
  ]) {
    const generated = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
    for (const block of expectedHiringBlocks) {
      if (!generated.includes(block)) {
        fail(`${relativePath} is missing a verbatim approved hiring block.`);
      }
    }
  }

  const isoPage = siteDirectory.find(
    (page) => page.route === "/compliance-assurance/iso-27001-readiness",
  );
  if (
    !isoPage?.shortSummary.includes("ISO/IEC 27001 readiness support") ||
    /OneSmarter is ISO\/IEC 27001 certified/i.test(
      [isoPage.metaDescription, isoPage.shortSummary, ...isoPage.keyOfferings].join(" "),
    )
  ) {
    fail("ISO/IEC 27001 readiness must remain distinct from OneSmarter certification wording.");
  }
};
const validateDocs = () => {
  const docsPath = path.join(repoRoot, "docs", "v2-mira-knowledge-base.md");
  if (!fs.existsSync(docsPath)) {
    fail("docs/v2-mira-knowledge-base.md must exist.");
    return;
  }

  const doc = fs.readFileSync(docsPath, "utf8");
  for (const requiredText of [
    "npm.cmd run validate:mira-kb",
    "what the validator checks",
    "when it must be run",
    "intentional prohibited phrase",
  ]) {
    if (!doc.toLowerCase().includes(requiredText.toLowerCase())) {
      fail(`docs/v2-mira-knowledge-base.md should document: ${requiredText}.`);
    }
  }
};

validateKnowledgeBase();
validateCanonicalSiteKnowledge();
validateClaimRules();
validateTestQuestions();
validateDocs();

if (failures.length) {
  console.error("Mira KB validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mira KB validation passed.");
console.log(`Validated ${onesmarterPublicKnowledgeBase.length} KB entries.`);
console.log(`Validated ${miraTestQuestions.length} Mira test fixtures.`);
