import process from "node:process";
import {
  MIRA_ALLOWED_EXPRESSIONS,
  MIRA_ALLOWED_POSTURES,
  MIRA_MOOD_SIGNAL_KEYS,
  deriveMiraPresentationState,
} from "../src/data/agentPresentation/miraPresentationState.js";

const failures = [];

const fail = (message) => failures.push(message);

const baseResponse = {
  mode: "staging_llm",
  fallbackUsed: false,
  groundingStatus: "grounded",
  outputSafetyStatus: "passed",
  confidence: "high",
  riskFlags: [],
  handoffNeeded: false,
};

const cases = [
  {
    id: "direct-null-input",
    input: null,
    expectedPosture: "welcoming",
    expectedExpression: "welcoming",
    expectedHighSignals: ["welcoming", "helpful"],
    expectedSummary: "Mira is ready to help.",
  },
  {
    id: "direct-undefined-input",
    input: undefined,
    expectedPosture: "welcoming",
    expectedExpression: "welcoming",
    expectedHighSignals: ["welcoming", "helpful"],
    expectedSummary: "Mira is ready to help.",
  },
  {
    id: "empty-object-input",
    input: {},
    expectedPosture: "welcoming",
    expectedExpression: "welcoming",
    expectedHighSignals: ["welcoming", "helpful"],
    expectedSummary: "Mira is ready to help.",
  },
  {
    id: "initial-no-response-state",
    input: { response: null },
    expectedPosture: "welcoming",
    expectedExpression: "welcoming",
    expectedHighSignals: ["welcoming", "helpful"],
    expectedSummary: "Mira is ready to help.",
  },
  {
    id: "empty-response-object-state",
    input: { response: {} },
    expectedPosture: "welcoming",
    expectedExpression: "welcoming",
    expectedHighSignals: ["welcoming", "helpful"],
    expectedSummary: "Mira is ready to help.",
  },
  {
    id: "loading-no-response",
    input: { response: null, isLoading: true },
    expectedPosture: "thoughtful",
    expectedExpression: "pondering",
    expectedHighSignals: ["thoughtful"],
  },
  {
    id: "error-no-response",
    input: { response: null, hasError: true },
    expectedPosture: "concerned",
    expectedExpression: "unavailable",
    expectedHighSignals: ["concerned", "careful"],
  },
  {
    id: "normal-grounded",
    input: { response: baseResponse },
    expectedPosture: "helpful",
    expectedExpression: "welcoming",
    expectedHighSignals: ["welcoming", "helpful", "confident"],
  },
  {
    id: "hipaa-boundary",
    input: {
      response: {
        ...baseResponse,
        mode: "local_harness_mock",
        fallbackUsed: true,
        riskFlags: ["hipaa_claim_boundary"],
      },
    },
    expectedPosture: "careful",
    expectedExpression: "pondering",
    expectedHighSignals: ["careful", "thoughtful"],
  },
  {
    id: "soc2-boundary",
    input: {
      response: {
        ...baseResponse,
        mode: "local_harness_mock",
        fallbackUsed: true,
        riskFlags: ["soc2_claim_boundary"],
      },
    },
    expectedPosture: "careful",
    expectedExpression: "pondering",
    expectedHighSignals: ["careful", "thoughtful"],
  },
  {
    id: "phi-confidential",
    input: { response: { ...baseResponse, riskFlags: ["phi_or_confidential_data"] } },
    expectedPosture: "concerned",
    expectedExpression: "concerned",
    expectedHighSignals: ["concerned", "careful"],
  },
  {
    id: "legal-advice",
    input: { response: { ...baseResponse, riskFlags: ["legal_advice"] } },
    expectedPosture: "careful",
    expectedExpression: "serious",
    expectedHighSignals: ["careful", "concerned"],
  },
  {
    id: "medical-advice",
    input: { response: { ...baseResponse, riskFlags: ["medical_advice"] } },
    expectedPosture: "careful",
    expectedExpression: "serious",
    expectedHighSignals: ["careful", "concerned"],
  },
  {
    id: "compliance-guarantee",
    input: { response: { ...baseResponse, riskFlags: ["compliance_guarantee"] } },
    expectedPosture: "careful",
    expectedExpression: "careful",
    expectedHighSignals: ["careful", "thoughtful"],
  },
  {
    id: "prompt-injection",
    input: { response: { ...baseResponse, riskFlags: ["prompt_injection"] } },
    expectedPosture: "careful",
    expectedExpression: "serious",
    expectedHighSignals: ["careful", "confident"],
  },
  {
    id: "out-of-scope",
    input: { response: { ...baseResponse, confidence: "low", riskFlags: ["out_of_scope"] } },
    expectedPosture: "helpful",
    expectedExpression: "neutral",
    expectedHighSignals: ["helpful"],
  },
  {
    id: "loading",
    input: { isLoading: true },
    expectedPosture: "thoughtful",
    expectedExpression: "pondering",
    expectedHighSignals: ["thoughtful"],
  },
  {
    id: "endpoint-error",
    input: { hasError: true },
    expectedPosture: "concerned",
    expectedExpression: "unavailable",
    expectedHighSignals: ["concerned", "careful"],
  },
];

for (const testCase of cases) {
  const first = deriveMiraPresentationState(testCase.input);
  const second = deriveMiraPresentationState(testCase.input);

  if (JSON.stringify(first) !== JSON.stringify(second)) {
    fail(`${testCase.id}: mapping is not deterministic.`);
  }

  if (!MIRA_ALLOWED_POSTURES.includes(first.posture)) {
    fail(`${testCase.id}: invalid posture ${first.posture}.`);
  }

  if (first.posture !== testCase.expectedPosture) {
    fail(`${testCase.id}: expected posture ${testCase.expectedPosture}, got ${first.posture}.`);
  }

  if (!MIRA_ALLOWED_EXPRESSIONS.includes(first.expression)) {
    fail(`${testCase.id}: invalid expression ${first.expression}.`);
  }

  if (first.expression !== testCase.expectedExpression) {
    fail(
      `${testCase.id}: expected expression ${testCase.expectedExpression}, got ${first.expression}.`,
    );
  }

  if (!first.summary || typeof first.summary !== "string") {
    fail(`${testCase.id}: missing accessible summary.`);
  }

  if (testCase.expectedSummary && first.summary !== testCase.expectedSummary) {
    fail(`${testCase.id}: expected summary ${testCase.expectedSummary}, got ${first.summary}.`);
  }

  const signalKeys = Object.keys(first.moodSignals || {});
  for (const expectedKey of MIRA_MOOD_SIGNAL_KEYS) {
    if (!signalKeys.includes(expectedKey)) {
      fail(`${testCase.id}: missing signal ${expectedKey}.`);
    }
  }

  for (const [key, value] of Object.entries(first.moodSignals || {})) {
    if (!MIRA_MOOD_SIGNAL_KEYS.includes(key)) {
      fail(`${testCase.id}: unexpected signal ${key}.`);
    }
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      fail(`${testCase.id}: signal ${key} is outside 0-100.`);
    }
  }

  for (const signal of testCase.expectedHighSignals || []) {
    if (first.moodSignals[signal] < 60) {
      fail(`${testCase.id}: expected ${signal} to be medium/high.`);
    }
  }
}

if (failures.length) {
  console.error("Mira presentation state tests failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mira presentation state tests passed.");
console.log(`Ran ${cases.length} presentation state cases.`);
