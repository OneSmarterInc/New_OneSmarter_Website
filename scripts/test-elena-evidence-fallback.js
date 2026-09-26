import assert from 'node:assert/strict';
import { handleElenaChatRequest, runElenaResponseAdapter, elenaExecutionOutcome, resolveElenaSemanticClaimPolicy } from '../src/server/elena/elenaResponseAdapter.js';
import { validateElenaModelOutput } from '../src/server/elena/elenaOutputValidator.js';
import { elenaApprovedKnowledge } from '../src/data/agentKnowledge/elenaApprovedKnowledge.js';
import { isApprovedTerminologyComposition } from '../src/server/elena/elenaTerminologyEvidence.js';
const soc = elenaApprovedKnowledge.find(e => e.id === 'soc2-attested');
const terms = elenaApprovedKnowledge.find(e => e.id === 'assurance-terminology');
const facts = terms.sourceFacts;
const evidence = [soc, terms];
const envelope = answer => ({ answer, handoffNeeded: false, handoffReason: null, suggestedFollowUps: [], groundingStatus: 'grounded', outputSafetyStatus: 'passed' });
const claimEvaluation = resolveElenaSemanticClaimPolicy({ topic: soc.id }).claimEvaluation;
const validate = answer => validateElenaModelOutput(envelope(answer), { matchedEntries: evidence, claimEvaluation });
// Exact supported definitions are not corporate certification assertions.
for (const fact of facts) assert.equal(validate(fact).valid, true, JSON.stringify(validate(fact).violations));
assert.equal(validate(facts.slice(0, 4).join(' ')).valid, true);
for (const bad of [
 'SOC 2 certification covers every OneSmarter platform.',
 'OneSmarter is SOC 2 certified.',
 'OneSmarter certifies customer organizations.',
 `${facts[0]} OneSmarter is SOC 2 certified.`,
 `${facts[0]} Acme received certification in 2026.`,
]) assert.equal(validate(bad).valid, false, bad);
assert.equal(validate(facts.join(' ') + ' SOC 2 certification covers every OneSmarter platform.').valid, false);
assert.equal(validate('OneSmarter is SOC 2 certified. ' + facts.join(' ')).valid, false);
assert.equal(isApprovedTerminologyComposition(facts[0].slice(0, -1), evidence), false);
assert.equal(isApprovedTerminologyComposition(facts[0] + 'unapproved', evidence), false);
assert.equal(isApprovedTerminologyComposition(facts[0], [soc]), false);
// The contract works with newly supplied approved terminology, not special SOC words.
const novel = { sourceReference: { type: 'authoritative-terminology' }, sourceFacts: ['A review evaluates stated evidence.', 'A finding records the evaluation.'] };
assert.equal(isApprovedTerminologyComposition(novel.sourceFacts.join(' '), [novel]), true);
const cases = [
 ['Compare SOC 2 attestation and certification.', 'comparison'],
 ['How does a controls examination differ from an ISO certificate?', 'comparison'],
 ['Why call the assurance result attested rather than certified?', 'why'],
 ['Explain the different outputs of those assurance processes.', 'follow_up'],
 ['How should I understand an independent assurance examination?', 'how'],
];
const failures = [
 [{ error: 'provider_timeout' }, 'generation_timeout'],
 [{ error: 'provider_incomplete_max_output_tokens' }, 'generation_incomplete'],
 [{ modelOutput: envelope('Essentially, ' + facts.slice(0, 4).join(' ')) }, 'validation_rejection'],
];
for (const [message, questionType] of cases) for (const [providerResult, outcome] of failures) {
 const result = await runElenaResponseAdapter({ message,
  config: { mode: 'staging_llm', provider: 'openai', providerConfigComplete: true },
  conversationHistory: [{ role: 'user', content: 'Explain SOC 2 terminology.' }],
  intentProvider: async () => ({ intent: { domain: 'compliance', topic: soc.id, entities: ['SOC 2'], proposition: 'Explain assurance terminology', polarity: 'unknown', negationScope: [], questionType, speechAct: 'explanation_request', requestedDetail: 'process and output', followUpReferences: [], confidence: 0.99, clarificationNeeded: false, mentionedNames: [] } }),
  providerAdapter: async () => providerResult,
 });
 assert.equal(result.fallbackUsed, true);
 assert.equal(result.mode, 'local_deterministic');
 assert.equal(elenaExecutionOutcome(result), outcome);
 for (const fact of facts) assert.ok(result.answer.includes(fact), `${message}: missing approved fact`);
 assert.ok(result.answer.includes('SOC 2 Type II Attested'), result.answer);
 assert.equal(validate(result.answer).valid, true, JSON.stringify(validate(result.answer).violations));
 assert.equal(result.semanticIntent.questionType, questionType);
}
console.log('Elena evidence fallback: 15 semantic/provider-failure cases, exact definitions and corporate safety PASS (fixtures only).');



const logs = [];
const loggedResponse = await handleElenaChatRequest({ method: 'POST', body: { message: 'Explain the approved topic.' },
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
