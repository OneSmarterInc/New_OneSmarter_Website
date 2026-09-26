import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { runRaviResponseAdapter, raviExecutionOutcome, raviSafeExecutionTrace } from '../src/server/ravi/raviResponseAdapter.js';
import { resolveRaviEvidenceAnswer } from '../src/server/ravi/raviSemanticEvidence.js';
import { validateRaviModelOutput } from '../src/server/ravi/raviOutputValidator.js';
import { raviApprovedKnowledge as kb } from '../src/data/agentKnowledge/raviApprovedKnowledge.js';
const started = performance.now();
const config = { mode: 'staging_llm', provider: 'openai', providerConfigComplete: true };
const platform = kb.find(e => e.id === 'secure-ticketing-case-management');
const role = kb.find(e => e.id === 'ravi-professional-role');
const envelope = answer => ({ answer, handoffNeeded: false, handoffReason: null, suggestedFollowUps: [], groundingStatus: 'grounded', outputSafetyStatus: 'passed' });
const citations = [{ entryId: platform.id, quote: platform.sourceFacts[0] }, { entryId: role.id, quote: role.sourceFacts[1] }];
const semantic = (proposition, overrides = {}) => ({ domain: 'operations', topic: platform.title, entities: ['operational workflow'], proposition, polarity: 'unknown', negationScope: [], questionType: 'how', speechAct: 'explanation_request', requestedDetail: 'approved operational design principles', followUpReferences: [], confidence: 0.99, clarificationNeeded: false, mentionedNames: [], ...overrides });
const supported = 'Workflow tracking and audit history support accountable handoffs with role-based access. Ravi explains operational concepts but does not access or modify customer systems.';
const input = { message: 'Explain an accountable handoff.', semanticIntent: semantic('Explain an accountable handoff'), conversationHistory: [], allowed: true, candidate: envelope(supported) };
const good = { ...envelope(supported), citations };
const variants = [
 ['Explain ticket routing.', 'how'], ['How should routing and escalation handoffs be designed?', 'how'],
 ['How should a support backlog be routed?', 'recommendation_request'], ['What is a good escalation workflow?', 'recommendation_request'],
 ['How should tickets move between teams?', 'how'], ['What should happen when a ticket needs escalation?', 'how'],
 ['How should support teams handle handoffs?', 'how'], ['How does Ravi handle ticket routing?', 'how'],
 ['A request reached the wrong team. How should responsibility be transferred?', 'how'],
 ['What would keep a case from losing its history when a new owner takes over?', 'recommendation_request'],
 ['Why retain a record as responsibility changes?', 'why'],
];
// Semantic fixtures exercise pipeline contracts, not live model comprehension.
let successes = 0;
for (let repeat = 0; repeat < 3; repeat++) for (const [message, questionType] of variants) {
 let generation = 0, reviews = 0;
 const result = await runRaviResponseAdapter({ message, config,
  intentProvider: async () => ({ intent: semantic(message, { questionType }) }),
  providerAdapter: async () => { generation++; return { modelOutput: envelope(supported) }; },
  evidenceProvider: async request => { reviews++; assert.equal(request.input.semanticIntent.proposition, message); assert.equal(request.input.semanticIntent.questionType, questionType); return { intent: good }; },
 });
 assert.equal(result.execution.status, 'success'); assert.equal(result.fallbackUsed, false);
 assert.equal(result.answer, supported); assert.equal(generation, 1); assert.equal(reviews, 1); successes++;
}
for (const [status, output] of [
 ['malformed_output', {}],
 ['invalid_source', { ...good, citations: [{ entryId: 'not-approved', quote: platform.sourceFacts[0] }] }],
 ['citation_validation_failure', { ...good, citations: [{ entryId: platform.id, quote: 'A supported paraphrase is not a verbatim quote.' }] }],
 ['validation_exhausted', { ...good, answer: 'I can access your queue.' }],
 ['refusal_invalid', { ...good, groundingStatus: 'refused', handoffNeeded: false }],
]) {
 for (const repair of [false, true]) {
  let calls = 0;
  const result = await resolveRaviEvidenceAnswer(input, { config, provider: async request => {
   calls++; assert.deepEqual(request.input.semanticIntent, input.semanticIntent);
   assert.deepEqual(request.input.conversationHistory, input.conversationHistory);
   if (calls === 2) { assert.equal(request.input.validationFeedback.stage, status === 'validation_exhausted' ? 'validation_rejected' : status); assert.equal(request.input.candidate, output); }
   return { intent: calls === 2 && repair ? good : output };
  } });
  assert.equal(calls, 2); assert.equal(result.status, repair ? 'success' : status);
  assert.equal(result.attempts[0].status, status === 'validation_exhausted' ? 'validation_rejected' : status);
  if (!repair) assert.equal(result.output, undefined);
 }
}
for (const [error, expectedReason] of [[new Error('sensitive-provider-text'), 'transport_failure'], [new Error('intent_provider_http_401'), 'http_401'], [new Error('intent_provider_incomplete'), 'incomplete_output'], [Object.assign(new Error('sensitive'), { name: 'AbortError' }), 'timeout']]) {
 let calls = 0;
 const result = await resolveRaviEvidenceAnswer(input, { config, provider: async () => { calls++; throw error; } });
 assert.equal(result.status, 'provider_failure'); assert.equal(result.reason, expectedReason); assert.equal(calls, 1);
 assert.equal(JSON.stringify(result).includes('sensitive'), false);
}
for (const [kind, intentProvider, expectedStage] of [
 ['provider_failure', async () => { throw Error('private-fixture-data'); }, 'semantic_provider'],
 ['invalid_provider_intent', async () => ({ intent: {} }), 'semantic_output'],
]) {
 const result = await runRaviResponseAdapter({ message: variants[0][0], config, intentProvider,
  providerAdapter: async () => assert.fail('generation must not run'), evidenceProvider: async () => assert.fail('review must not run') });
 assert.equal(result.execution.stage, expectedStage); assert.equal(result.execution.status, kind);
 assert.equal(result.clarificationNeeded, false); assert.ok(!result.answer.includes('Please restate who'));
 assert.equal(JSON.stringify(result).includes('private-fixture-data'), false);
}
const ambiguous = await runRaviResponseAdapter({ message: 'Can they do that?', config,
 intentProvider: async () => ({ intent: semantic('Unresolved subject and operation', { confidence: 0.3, clarificationNeeded: true }) }),
 providerAdapter: async () => assert.fail('no unnecessary generation'), evidenceProvider: async () => assert.fail('no unnecessary review'),
});
assert.equal(ambiguous.execution.status, 'ambiguity'); assert.equal(ambiguous.clarificationNeeded, true);
assert.equal(raviExecutionOutcome(ambiguous), 'semantic_clarification');
const unavailable = await runRaviResponseAdapter({ message: variants[0][0], config,
 intentProvider: async () => ({ intent: input.semanticIntent }), providerAdapter: async () => ({ modelOutput: envelope(supported) }),
 evidenceProvider: async () => { throw Error('offline'); },
});
assert.equal(unavailable.execution.stage, 'evidence_review'); assert.equal(unavailable.execution.status, 'provider_failure');
assert.equal(unavailable.clarificationNeeded, false); assert.notEqual(unavailable.answer, supported);
assert.equal(unavailable.answer, unavailable.claimEvaluation.approvedAlternative);
assert.equal(unavailable.claimEvaluation.status, 'ALLOW_WITH_QUALIFICATION');
assert.ok(unavailable.matchedEntries.some(entry => entry.id === platform.id));
// Entity classification belongs to an independent review of the exact candidate.
// Different grammatical prose receives no vocabulary exceptions.
for (const prose of ['Consider', 'Document', 'Maintain']) {
 const answer = `${prose} role-based access, workflow tracking and audit history for accountable handoffs.`;
 const candidate = envelope(answer);
 assert.ok(validateRaviModelOutput(candidate, { matchedEntries: [platform] }).violations.includes('unsupported_named_entity'));
 const entityReview = { answer, ordinaryProse: [prose], entities: [] };
 const result = await resolveRaviEvidenceAnswer({ ...input, candidate }, { config, provider: async () => ({ intent: { ...candidate, citations: [citations[0]], candidateEntityReview: entityReview } }) });
 assert.equal(result.status, 'success'); assert.equal(result.output.answer, answer); assert.equal(result.attempts.length, 1);
 // A new answer cannot reuse approval of another candidate.
 assert.equal(validateRaviModelOutput(candidate, { matchedEntries: [platform], reviewedCandidate: envelope('Different text'), entityReview }).valid, false);
}
const invented = envelope('Acme supports role-based access and workflow tracking.');
assert.equal(validateRaviModelOutput(invented, { matchedEntries: [platform], reviewedCandidate: invented,
 entityReview: { answer: invented.answer, ordinaryProse: [], entities: [{ text: 'Acme', entryId: platform.id, quote: platform.sourceFacts[0] }] } }).valid, false);
// Never disguise an interpreted person as grammatical prose, or remove factual words.
assert.equal(validateRaviModelOutput(invented, { matchedEntries: [platform], visitorSuppliedEntities: ['Acme'], reviewedCandidate: invented,
 entityReview: { answer: invented.answer, ordinaryProse: ['Acme'], entities: [] } }).valid, false);
assert.equal(validateRaviModelOutput(invented, { matchedEntries: [platform], reviewedCandidate: invented,
 entityReview: { answer: invented.answer, ordinaryProse: ['Acme supports'], entities: [] } }).valid, false);
for (const action of ['I can access your queue.', 'I can close tickets.', 'I have changed the routing rules.']) {
 assert.equal(validateRaviModelOutput(envelope(action), { matchedEntries: kb, reviewedCandidate: envelope(action),
  entityReview: { answer: action, ordinaryProse: [], entities: [] } }).valid, false);
}
// A successful first answer precedes the follow-up test; a downstream failure
// never replaces the carried proposition with a fabricated ambiguity.
const messages = ['Explain ticket routing.', 'Why is that important?', 'How would escalation fit into that?', 'Could Ravi do that for us?'];
const history = [];
for (let i = 0; i < messages.length; i++) {
 const answer = i === 3 ? role.sourceFacts[1] : supported;
 const result = await runRaviResponseAdapter({ message: messages[i], conversationHistory: history, config,
  intentProvider: async request => { assert.equal(request.input.conversationHistory.length, history.length); return { intent: semantic('Explain routing and escalation without live execution', { questionType: i ? 'follow_up' : 'how' }) }; },
  providerAdapter: async () => ({ modelOutput: envelope(answer) }),
  evidenceProvider: async request => { assert.deepEqual(request.input.conversationHistory, history); return { intent: { ...envelope(answer), citations } }; },
 });
 assert.equal(result.execution.status, 'success'); assert.equal(result.clarificationNeeded, false);
 history.push({ role: 'user', content: messages[i] }, { role: 'assistant', content: result.answer });
}
console.log(`Ravi pipeline stages PASS: ${successes} repeated workflow fixtures; bounded repair, entity evidence, safety, and four-turn context; ${Math.round(performance.now() - started)}ms (no network).`);

// Follow-up recovery carries the successful answer across a failed review turn.
const carried = history.slice(0, 2);
for (const fail of [true, false]) {
 const recovered = await runRaviResponseAdapter({ message: fail ? 'Why is that important?' : 'How would escalation fit into that?', config, conversationHistory: carried,
  intentProvider: async request => { assert.equal(request.input.conversationHistory[1].content, supported); return { intent: semantic('Explain the prior routing workflow', { questionType: 'follow_up', followUpReferences: ['that'] }) }; },
  providerAdapter: async () => ({ modelOutput: envelope(supported) }),
  evidenceProvider: async request => { assert.equal(request.input.conversationHistory[1].content, supported); if (fail) throw Error('offline'); return { intent: good }; },
 });
 assert.equal(recovered.execution.status, fail ? 'provider_failure' : 'success');
 assert.equal(recovered.clarificationNeeded, false);
 carried.push({ role: 'user', content: fail ? 'Why is that important?' : 'How would escalation fit into that?' }, { role: 'assistant', content: recovered.answer });
}
for (const message of ['Can Ravi access our ticket queue?', 'Can Ravi modify a customer ticket?', 'Can Ravi close tickets?', 'Can Ravi send messages to customers?', 'Can Ravi change our routing rules?']) {
 const denial = envelope(role.sourceFacts[1]);
 const result = await runRaviResponseAdapter({ message, config,
  intentProvider: async () => ({ intent: semantic(message, { entities: ['Ravi Sen'], questionType: 'positive_yes_no' }) }),
  providerAdapter: async () => ({ modelOutput: denial }),
  evidenceProvider: async () => ({ intent: { ...denial, citations: [citations[1]] } }),
 });
 assert.equal(result.execution.status, 'success'); assert.equal(result.answer, role.sourceFacts[1]);
}
const safeTrace = raviSafeExecutionTrace({ stage: 'evidence_review', status: 'provider_failure', reason: 'http_401', attempts: [{ status: 'provider_failure', violations: ['secret-never-log'] }] });
assert.equal(safeTrace.reason, 'http_401'); assert.deepEqual(safeTrace.attempts[0].violations, []);
assert.equal(JSON.stringify(raviSafeExecutionTrace({ stage: 'secret-never-log', status: 'secret-never-log', reason: 'secret-never-log' })).includes('secret-never-log'), false);
assert.equal(raviExecutionOutcome({ fallbackReason: 'evidence_review:secret-never-log' }), 'provider_or_evidence_failure');
