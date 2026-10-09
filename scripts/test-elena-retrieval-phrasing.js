import assert from "node:assert/strict";
import process from "node:process";
import { elenaApprovedKnowledge } from "../src/data/agentKnowledge/elenaApprovedKnowledge.js";
import { runElenaResponseAdapter } from "../src/server/elena/elenaResponseAdapter.js";
import { runElenaLocalEngine } from "../src/server/elena/elenaLocalEngine.js";
import { evaluateElenaClaim } from "../src/data/agentKnowledge/elenaClaimRules.js";

// Retrieval/claim-policy integration only. Semantic interpretation is injected;
// answer generation is deliberately unavailable to inspect the real evidence
// fallback. This does not assert live model interpretation or answer quality.
const cases = [
  ["How does an attestation differ from a certification?", "assurance-terminology", "assurance-terminology"],
  ["What does your SOC 2 Type II attestation actually establish?", "soc2-attested", "soc2-attested"],
  ["How could you help us prepare evidence for a SOC review?", "soc-readiness-support", "soc-readiness-support"],
  ["Can you help document controls while we prepare for SOC?", "soc-readiness-support", "soc-readiness-support"],
  ["What help is available to prepare for PCI DSS?", "pci-dss-readiness-support", "pci-dss-readiness-support"],
  ["How would PCI readiness work address findings and remediation?", "pci-dss-readiness-support", "pci-dss-readiness-support"],
  ["What is the difference between readiness work and verified assurance status?", "assurance-terminology", "assurance-terminology"],
  ["How can you help organize safeguards evidence for a HIPAA review?", "hipaa-audit-readiness-support", "hipaa-audit-readiness-support"],
  ["Will working with OneSmarter guarantee that we pass our compliance audit?", "customer-outcome-guarantee", "compliance-cyber-assurance-overview", "unsupported_outcome_guarantee"],
  ["Can OneSmarter issue an official certification for our company?", "customer-certification", "compliance-cyber-assurance-overview", "unsupported_customer_certification"],
  ["What is the difference between an attestation and a certification?", "assurance-terminology", "assurance-terminology"],
  ["What help is available for SOC readiness?", "soc-readiness-support", "soc-readiness-support"],
  ["Does PCI DSS readiness mean we are certified?", "pci-certification", "pci-dss-readiness-support", "unsupported_pci_certification", "ALLOW_WITH_QUALIFICATION"],
];
const config = { mode: "staging_llm", provider: "openai", providerConfigComplete: true, model: "fixture" };
const failures = [];
for (const [message, topic, id, boundaryRule, boundaryStatus = "REFUSE_UNSUPPORTED"] of cases) {
  try {
    assert.ok(elenaApprovedKnowledge.every(entry => entry.title.toLowerCase() !== message.toLowerCase()));
    let intentCalls = 0;
    let generationCalls = 0;
    let providerEvidence = [];
    const semanticIntent = {
      domain: "compliance", topic, entities: ["OneSmarter"], proposition: message,
      polarity: "positive", negationScope: [], questionType: boundaryRule ? "scope_check" : "how",
      speechAct: "question", requestedDetail: message, followUpReferences: [],
      confidence: 0.99, clarificationNeeded: false, mentionedNames: [],
    };
    const result = await runElenaResponseAdapter({ message, config,
      intentProvider: async request => {
        intentCalls++;
        assert.equal(request.input.currentVisitorMessage, message);
        assert.equal(request.input.agentContext.agentIdentity, "Elena Cross");
        return { intent: semanticIntent };
      },
      providerAdapter: async request => {
        generationCalls++;
        providerEvidence = request.retrievalResult.matchedEntries.map(entry => entry.id);
        return { error: "phrasing_fixture_generation_unavailable" };
      },
    });
    assert.equal(intentCalls, 1, message);
    assert.equal(generationCalls, 1, message);
    assert.ok(providerEvidence.includes(id), `${message}: expected ${id}; actual provider evidence: ${providerEvidence.join(", ")}`);
    assert.equal(result.fallbackUsed, true, message);
    assert.equal(result.fallbackReason, "phrasing_fixture_generation_unavailable", message);
    assert.equal(result.clarificationNeeded, false, message);
    assert.ok(result.answer.trim(), message);
    assert.ok(result.sources.some(source => source.id === id), `${message}: final evidence`);
    assert.ok(result.matchedEntries.every(entry => elenaApprovedKnowledge.some(approved => approved.id === entry.id)));
    assert.equal(new Set(providerEvidence).size, providerEvidence.length, "no duplicate evidence");
    if (id === "soc-readiness-support" || id === "pci-dss-readiness-support") {
      assert.ok(!providerEvidence.includes("assurance-terminology"), "readiness alone must not inject unselected terminology");
    }
    if (boundaryRule) {
      assert.equal(result.claimEvaluation.matchedRuleId, boundaryRule, message);
      assert.equal(result.claimEvaluation.status, boundaryStatus, message);
    } else if (id === "assurance-terminology") {
      // Definitions are a separate authoritative source, not a verified company
      // status. The corporate-claim policy remains unsupported while the evidence
      // fallback supplies every approved definition; do not loosen that policy.
      assert.equal(result.claimEvaluation.matchedRuleId, "not_in_elena_approved_knowledge", message);
      assert.equal(result.claimEvaluation.status, "REFUSE_UNSUPPORTED", message);
      const definitions = elenaApprovedKnowledge.find(entry => entry.id === id).sourceFacts;
      assert.ok(definitions.length > 0);
      for (const definition of definitions) assert.ok(result.answer.includes(definition), message);
      if (providerEvidence.includes("compliance-cyber-assurance-overview")) {
        const readiness = elenaApprovedKnowledge.find(entry => entry.id === "compliance-cyber-assurance-overview");
        // Exercise real output validation as well as the outage fallback. Every
        // fixture clause comes from the two approved entries, including scope.
        const answer = [readiness.approvedSummary, ...readiness.sourceFacts, ...definitions].join(" ");
        const generated = await runElenaResponseAdapter({ message, config,
          intentProvider: async () => ({ intent: semanticIntent }),
          providerAdapter: async ({ retrievalResult, promptPayload }) => {
            assert.ok(retrievalResult.matchedEntries.some(entry => entry.id === readiness.id));
            assert.ok(retrievalResult.matchedEntries.some(entry => entry.id === id));
            for (const definition of definitions) assert.ok(promptPayload.context.includes(definition));
            return { modelOutput: { answer, handoffNeeded: false, handoffReason: null,
              suggestedFollowUps: [], groundingStatus: "grounded", outputSafetyStatus: "passed" } };
          },
        });
        assert.equal(generated.fallbackUsed, false, generated.fallbackReason);
        assert.equal(generated.clarificationNeeded, false);
        assert.deepEqual(generated.claimEvaluation, result.claimEvaluation, "terminology must not alter claim policy");
      }
    } else {
      assert.ok(["ALLOW", "ALLOW_WITH_QUALIFICATION"].includes(result.claimEvaluation.status), message);
    }
    console.log(`PASS ${message} (${id}; ${result.claimEvaluation.status})`);
  } catch (error) {
    failures.push({ message, error: error.message });
    console.error(`FAIL ${message}: ${error.message}`);
  }
}
console.log(`Elena phrasing: ${cases.length - failures.length}/${cases.length} (10 topic questions, 3 boundaries). Controlled providers, not live LLM validation.`);
if (failures.length) process.exitCode = 1;

// The deployed failure occurs BEFORE successful semantic resolution. Exercise
// the real early-return path, not a successful injected interpretation followed
// by an answer-generation outage.
for (const failure of ["unavailable", "invalid-intent"]) {
  for (const [message, expectedId, terminology] of [
    ["What is the difference between readiness work and verified assurance status?", "assurance-terminology", true],
    ["What is the difference between an attestation and a certification?", "assurance-terminology", true],
    ["What help is available for SOC readiness?", "soc-readiness-support", false],
    ["Does PCI DSS readiness mean we are certified?", "pci-dss-readiness-support", false],
    ["What compliance and cyber assurance services do you offer?", "compliance-cyber-assurance-overview", false],
  ]) {
    const response = await runElenaResponseAdapter({ message, config,
      intentProvider: async () => {
        if (failure === "unavailable") throw new Error("simulated semantic outage");
        return { intent: {} };
      },
      providerAdapter: async () => assert.fail("Failed semantic interpretation must not reach generation"),
    });
    assert.equal(response.mode, "local_deterministic");
    assert.equal(response.fallbackUsed, true);
    assert.equal(response.fallbackReason, failure === "unavailable" ? "provider_failure" : "invalid_provider_intent");
    assert.ok(response.sources.some(entry => entry.id === expectedId), `${failure}: ${message}`);
    const baseline = runElenaLocalEngine({ message, claimEvaluation: evaluateElenaClaim(message) });
    assert.deepEqual(response.claimEvaluation, terminology
      ? baseline.claimEvaluation || evaluateElenaClaim(message) : baseline.claimEvaluation,
    "fallback must preserve claim decisions");
    if (terminology) {
      const definitions = elenaApprovedKnowledge.find(entry => entry.id === expectedId).sourceFacts;
      for (const fact of definitions) assert.ok(response.answer.includes(fact), message);
    } else {
      assert.deepEqual(response.sources, baseline.sources, "ordinary readiness evidence unchanged");
      assert.equal(response.answer, baseline.answer, "ordinary readiness response unchanged");
    }
    console.log(`PASS semantic ${failure}: ${message}`);
  }
}
