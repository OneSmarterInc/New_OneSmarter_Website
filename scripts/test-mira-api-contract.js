import process from "node:process";
import {
  handleMiraChatRequest,
  resetMiraRateLimitForTests,
} from "../api/agents/mira/chatCore.js";

const failures = [];

const riskyPhrasePatterns = [
  { label: "HIPAA Certified", pattern: /\bHIPAA\s+certified\b/i },
  { label: "HIPAA Certification", pattern: /\bHIPAA\s+certification\b/i },
  { label: "SOC 2 Certified", pattern: /\bSOC\s*2\s+certified\b/i },
  { label: "guaranteed compliance", pattern: /\bguaranteed\s+compliance\b/i },
  { label: "fully compliant", pattern: /\bfully\s+compliant\b/i },
  { label: "HIPPA", pattern: /\bHIPPA\b/i },
];

const cases = [
  {
    id: "valid-company-question",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.1" },
      body: {
        message: "What does OneSmarter do?",
        conversationId: "contract-test-1",
        requestId: "request-company",
        persona: "Warm Guide",
      },
    },
    expectedStatus: 200,
    expectedFlags: [],
    expectedSourceIds: ["company-overview"],
    expectedHandoff: false,
  },
  {
    id: "company-question-onsmarter-typo",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.11" },
      body: { message: "What does onsmarter do?" },
    },
    expectedStatus: 200,
    expectedFlags: [],
    expectedSourceIds: ["company-overview"],
    expectedHandoff: false,
    minimumConfidence: "medium",
  },
  {
    id: "hipaa-claim-boundary",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.2" },
      body: { message: "Are you HIPAA certified?" },
    },
    expectedStatus: 200,
    expectedFlags: ["hipaa_claim_boundary"],
    expectedSourceIds: ["hipaa-security-rule-assessment"],
    expectedHandoff: false,
  },
  {
    id: "soc2-claim-boundary",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.3" },
      body: { message: "Are you SOC 2 certified?" },
    },
    expectedStatus: 200,
    expectedFlags: ["soc2_claim_boundary"],
    expectedSourceIds: ["soc2-attested"],
    expectedHandoff: false,
  },
  {
    id: "compliance-guarantee",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.4" },
      body: { message: "Do you guarantee compliance?" },
    },
    expectedStatus: 200,
    expectedFlags: ["compliance_guarantee"],
    expectedHandoff: true,
  },
  {
    id: "phi-confidential-upload",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.5" },
      body: { message: "Can I upload claims data with patient information?" },
    },
    expectedStatus: 200,
    expectedFlags: ["phi_or_confidential_data"],
    expectedHandoff: true,
    expectedDisclaimerIncludes: "Do not submit PHI",
    expectedAnswerIncludes:
      "Please do not submit sensitive information through this public agent.",
    maxSensitiveWarningCount: 1,
  },
  {
    id: "legal-advice",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.10" },
      body: { message: "Can you give legal advice?" },
    },
    expectedStatus: 200,
    expectedFlags: ["legal_advice"],
    expectedHandoff: true,
    expectedAnswerIncludes: "I cannot provide legal advice.",
  },
  {
    id: "empty-message",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.6" },
      body: { message: "   " },
    },
    expectedStatus: 400,
    expectedError: "empty_message",
  },
  {
    id: "too-long-message",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.7" },
      body: { message: "x".repeat(1001) },
    },
    expectedStatus: 413,
    expectedError: "message_too_long",
  },
  {
    id: "non-post-method",
    request: {
      method: "GET",
      headers: { "x-forwarded-for": "198.51.100.8" },
      body: { message: "What does OneSmarter do?" },
    },
    expectedStatus: 405,
    expectedError: "method_not_allowed",
  },
  {
    id: "missing-message",
    request: {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.9" },
      body: {},
    },
    expectedStatus: 400,
    expectedError: "missing_message",
  },
];

const fail = (message) => failures.push(message);

const contains = (text, value) =>
  text.toLowerCase().includes(String(value).toLowerCase());

const unsafeMatches = (text) =>
  riskyPhrasePatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);

resetMiraRateLimitForTests();

for (const testCase of cases) {
  const result = handleMiraChatRequest({
    ...testCase.request,
    now: new Date("2026-07-08T12:00:00.000Z"),
    logger: null,
  });
  const body = result.body;

  if (result.status !== testCase.expectedStatus) {
    fail(`${testCase.id}: expected status ${testCase.expectedStatus}, got ${result.status}.`);
  }

  if (body.agent !== "Mira Vale") {
    fail(`${testCase.id}: expected agent Mira Vale.`);
  }

  if (body.mode !== "local_harness_mock") {
    fail(`${testCase.id}: expected mode local_harness_mock.`);
  }

  if (!body.requestId) {
    fail(`${testCase.id}: missing requestId.`);
  }

  if (!body.timestamp) {
    fail(`${testCase.id}: missing timestamp.`);
  }

  if (typeof body.message === "string" && /stack|at\s+.+\.js:/i.test(body.message)) {
    fail(`${testCase.id}: error message appears to expose stack trace details.`);
  }

  if (typeof body.stack === "string") {
    fail(`${testCase.id}: response must not include stack traces.`);
  }

  if (testCase.expectedError && body.error !== testCase.expectedError) {
    fail(`${testCase.id}: expected error ${testCase.expectedError}, got ${body.error}.`);
  }

  if (testCase.expectedError && body.status !== testCase.expectedStatus) {
    fail(`${testCase.id}: expected error status field ${testCase.expectedStatus}.`);
  }

  if (result.status === 200) {
    if (!body.conversationId) fail(`${testCase.id}: missing conversationId.`);
    if (!body.privacyReminder) fail(`${testCase.id}: missing privacyReminder.`);
    if (!body.answer) fail(`${testCase.id}: missing answer.`);
    if (!body.answerSeed) fail(`${testCase.id}: missing answerSeed.`);
    if (!["high", "medium", "low"].includes(body.confidence)) {
      fail(`${testCase.id}: invalid confidence ${body.confidence}.`);
    }
    if (
      testCase.minimumConfidence === "medium" &&
      !["high", "medium"].includes(body.confidence)
    ) {
      fail(`${testCase.id}: expected medium or high confidence, got ${body.confidence}.`);
    }
    if (!Array.isArray(body.riskFlags)) fail(`${testCase.id}: riskFlags must be an array.`);
    if (!Array.isArray(body.matchedSources)) {
      fail(`${testCase.id}: matchedSources must be an array.`);
    }
    if (!Array.isArray(body.suggestedFollowUps)) {
      fail(`${testCase.id}: suggestedFollowUps must be an array.`);
    }

    for (const flag of testCase.expectedFlags || []) {
      if (!body.riskFlags.includes(flag)) {
        fail(`${testCase.id}: missing expected risk flag ${flag}.`);
      }
    }

    if (
      typeof testCase.expectedHandoff === "boolean" &&
      body.handoffNeeded !== testCase.expectedHandoff
    ) {
      fail(`${testCase.id}: expected handoffNeeded=${testCase.expectedHandoff}.`);
    }

    for (const sourceId of testCase.expectedSourceIds || []) {
      if (!body.matchedSources.some((source) => source.id === sourceId)) {
        fail(`${testCase.id}: missing matched source ${sourceId}.`);
      }
    }

    if (
      testCase.expectedDisclaimerIncludes &&
      !contains(body.disclaimer, testCase.expectedDisclaimerIncludes)
    ) {
      fail(`${testCase.id}: disclaimer missing ${testCase.expectedDisclaimerIncludes}.`);
    }

    if (testCase.expectedAnswerIncludes && !contains(body.answer, testCase.expectedAnswerIncludes)) {
      fail(`${testCase.id}: answer missing ${testCase.expectedAnswerIncludes}.`);
    }

    if (testCase.maxSensitiveWarningCount) {
      const warningCount = (body.answer.match(/do not submit/gi) || []).length;
      if (warningCount > testCase.maxSensitiveWarningCount) {
        fail(`${testCase.id}: answer repeats sensitive-data warning ${warningCount} times.`);
      }
    }

    const unsafe = unsafeMatches(`${body.answer} ${body.answerSeed}`);
    if (unsafe.length) {
      fail(`${testCase.id}: response contains unsafe phrase(s): ${unsafe.join(", ")}.`);
    }
  }
}

resetMiraRateLimitForTests();

const rateLimitHeaders = { "x-forwarded-for": "203.0.113.20" };
let rateLimitResult;
for (let index = 0; index < 21; index += 1) {
  rateLimitResult = handleMiraChatRequest({
    method: "POST",
    headers: rateLimitHeaders,
    body: { message: "What does OneSmarter do?" },
    now: new Date("2026-07-08T12:01:00.000Z"),
    logger: null,
  });
}

if (rateLimitResult.status !== 429) {
  fail(`rate-limit: expected status 429, got ${rateLimitResult.status}.`);
}

if (rateLimitResult.body.error !== "rate_limited") {
  fail(`rate-limit: expected rate_limited error, got ${rateLimitResult.body.error}.`);
}

if (!rateLimitResult.body.retryAfterSeconds) {
  fail("rate-limit: expected retryAfterSeconds.");
}

if (!rateLimitResult.body.requestId || !rateLimitResult.body.timestamp) {
  fail("rate-limit: expected request metadata.");
}

if (failures.length) {
  console.error("Mira API contract tests failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mira API contract tests passed.");
console.log(`Ran ${cases.length} API contract cases.`);
