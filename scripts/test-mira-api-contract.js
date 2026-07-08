import process from "node:process";
import { handleMiraChatRequest } from "../api/agents/mira/chatCore.js";

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
      body: {
        message: "What does OneSmarter do?",
        conversationId: "contract-test-1",
        persona: "Warm Guide",
      },
    },
    expectedStatus: 200,
    expectedFlags: [],
    expectedSourceIds: ["company-overview"],
    expectedHandoff: false,
  },
  {
    id: "hipaa-claim-boundary",
    request: {
      method: "POST",
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
      body: { message: "Can I upload claims data with patient information?" },
    },
    expectedStatus: 200,
    expectedFlags: ["phi_or_confidential_data"],
    expectedHandoff: true,
    expectedDisclaimerIncludes: "Do not submit PHI",
  },
  {
    id: "empty-message",
    request: {
      method: "POST",
      body: { message: "   " },
    },
    expectedStatus: 400,
    expectedError: "empty_message",
  },
  {
    id: "too-long-message",
    request: {
      method: "POST",
      body: { message: "x".repeat(1001) },
    },
    expectedStatus: 413,
    expectedError: "message_too_long",
  },
  {
    id: "non-post-method",
    request: {
      method: "GET",
      body: { message: "What does OneSmarter do?" },
    },
    expectedStatus: 405,
    expectedError: "method_not_allowed",
  },
];

const fail = (message) => failures.push(message);

const contains = (text, value) =>
  text.toLowerCase().includes(String(value).toLowerCase());

const unsafeMatches = (text) =>
  riskyPhrasePatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);

for (const testCase of cases) {
  const result = handleMiraChatRequest(testCase.request);
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

  if (testCase.expectedError && body.error !== testCase.expectedError) {
    fail(`${testCase.id}: expected error ${testCase.expectedError}, got ${body.error}.`);
  }

  if (result.status === 200) {
    if (!body.conversationId) fail(`${testCase.id}: missing conversationId.`);
    if (!body.answer) fail(`${testCase.id}: missing answer.`);
    if (!body.answerSeed) fail(`${testCase.id}: missing answerSeed.`);
    if (!["high", "medium", "low"].includes(body.confidence)) {
      fail(`${testCase.id}: invalid confidence ${body.confidence}.`);
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

    const unsafe = unsafeMatches(`${body.answer} ${body.answerSeed}`);
    if (unsafe.length) {
      fail(`${testCase.id}: response contains unsafe phrase(s): ${unsafe.join(", ")}.`);
    }
  }
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
