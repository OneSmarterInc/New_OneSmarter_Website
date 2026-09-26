import assert from 'node:assert/strict';
import { handleRaviChatRequest, runRaviResponseAdapter, raviExecutionOutcome } from '../src/server/ravi/raviResponseAdapter.js';
import { readRaviRuntimeConfig } from '../src/server/ravi/raviRuntimeConfig.js';
import { raviApprovedKnowledge } from '../src/data/agentKnowledge/raviApprovedKnowledge.js';
const secret = 'fixture-only-not-a-real-credential';
const config = readRaviRuntimeConfig({ RAVI_LLM_MODE: 'staging_llm', RAVI_LLM_PROVIDER: 'openai', RAVI_LLM_MODEL: 'gpt-5.6-luna', RAVI_LLM_API_KEY: secret });
assert.equal(Object.getOwnPropertyDescriptor(config, 'apiKey').enumerable, false);
assert.equal(JSON.stringify(config).includes(secret), false);
const entry = raviApprovedKnowledge.find(e => e.id === 'secure-ticketing-case-management');
const envelope = { answer: entry.approvedSummary, handoffNeeded: false, handoffReason: null, suggestedFollowUps: [], groundingStatus: 'grounded', outputSafetyStatus: 'passed' };
const cases = [
 ['How should ticket routing work?', 'how', 'workflow'],
 ['Suggest an escalation process for a support backlog.', 'recommendation_request', 'workflow'],
 ['Why record handoffs between support teams?', 'why', 'workflow'],
 ['Can Ravi access customer tickets?', 'positive_yes_no', 'Ravi Sen'],
 ['Can another employee access our queue?', 'positive_yes_no', 'another employee'],
];
const originalFetch = globalThis.fetch;
let calls = 0;
try {
 for (let repeat = 0; repeat < 3; repeat++) for (const [message, questionType, subject] of cases) {
  globalThis.fetch = async (url, options) => {
   calls++;
   assert.equal(url, 'https://api.openai.com/v1/responses');
   assert.equal(options.headers.Authorization === `Bearer ${secret}`, true, 'transport must receive the protected credential');
   assert.equal(options.body.includes(secret), false);
   return { ok: true, json: async () => ({ output_text: JSON.stringify({ domain: 'operations', topic: entry.title, entities: [subject], proposition: message, polarity: 'unknown', negationScope: [], questionType, speechAct: 'question', requestedDetail: 'explanation', followUpReferences: [], confidence: 0.99, clarificationNeeded: false, mentionedNames: [] }) }) };
  };
  const result = await runRaviResponseAdapter({ message, config,
   providerAdapter: async ({ requestContext }) => {
    assert.equal(requestContext.semanticIntent.entities[0], subject);
    assert.equal(requestContext.semanticIntent.questionType, questionType);
    return { modelOutput: envelope };
   },
   // Transport fixture only; answer semantics are covered by conversation-grounding tests.
   evidenceProvider: async () => ({ intent: { ...envelope, citations: [{ entryId: entry.id, quote: entry.sourceFacts[0] }] } }),
  });
  assert.equal(result.fallbackUsed, false, result.fallbackReason);
  assert.equal(JSON.stringify(result).includes(secret), false);
 }
 for (const failure of ['http', 'throw', 'invalid']) {
  globalThis.fetch = async () => {
   if (failure === 'throw') throw new Error(secret);
   return failure === 'http' ? { ok: false, status: 401 } : { ok: true, json: async () => ({ output_text: '{}' }) };
  };
  const result = await runRaviResponseAdapter({ message: cases[0][0], config,
   providerAdapter: async () => assert.fail('generation must not run after intent failure'),
  });
  assert.equal(result.fallbackUsed, true);
  assert.equal(raviExecutionOutcome(result), 'semantic_provider_failure');
  assert.equal(JSON.stringify(result).includes(secret), false);
 }
 assert.equal(raviExecutionOutcome({ clarificationNeeded: true, fallbackReason: '' }), 'semantic_clarification');
 assert.equal(calls, 15);
} finally { globalThis.fetch = originalFetch; }
console.log('Ravi default transport: 15 repeated cases, protected authorization, provider failures and secret exclusion PASS (mock HTTP only).');

const logs = [];
const loggedResponse = await handleRaviChatRequest({ method: 'POST', body: { message: 'Explain the approved topic.' },
 rateLimitStore: { consume: async () => ({ allowed: true }) },
 logger: event => logs.push(event),
 responseAdapter: async () => ({ answer: 'Safe fallback.', sources: [], confidence: 'low', clarificationNeeded: true,
  fallbackUsed: true, mode: 'local_deterministic', fallbackReason: 'provider_failure',
  privateTransportData: 'fixture-secret-never-log' }),
});
assert.equal(logs.length, 1);
assert.equal(logs[0].outcome, 'semantic_provider_failure');
assert.equal(logs[0].fallbackUsed, true);
assert.equal(JSON.stringify([logs, loggedResponse]).includes('fixture-secret-never-log'), false);
assert.deepEqual(Object.keys(logs[0]).sort(), ['endpoint', 'event', 'fallbackUsed', 'mode', 'outcome', 'requestId'].sort());
