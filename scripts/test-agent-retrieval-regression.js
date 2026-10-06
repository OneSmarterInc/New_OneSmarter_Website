import assert from "node:assert/strict";
import process from "node:process";
import { onesmarterPublicKnowledgeBase } from "../src/data/agentKnowledge/onesmarterPublicKb.js";
import { retrieveMiraContext } from "../src/data/agentKnowledge/miraLocalEngine.js";
import { elenaApprovedKnowledge } from "../src/data/agentKnowledge/elenaApprovedKnowledge.js";
import { retrieveElenaKnowledge } from "../src/server/elena/elenaLocalEngine.js";
import { seleneApprovedKnowledge } from "../src/data/agentKnowledge/seleneApprovedKnowledge.js";
import { retrieveSeleneKnowledge } from "../src/server/selene/seleneLocalEngine.js";
import { raviApprovedKnowledge } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { retrieveRaviKnowledge } from "../src/server/ravi/raviLocalEngine.js";

// RETRIEVAL ONLY: this does not test semantic routing, grounding, or LLM answers.
// Retain Ravi's original/uppercase title queries, determinism and isolation.
// Reachability uses each retriever's DEFAULT window, not a full-corpus override.
// Full results are diagnostic only: check ordering and report exposed score ties.
// No query rewriting, synonyms, or production behavior changes.
const agents = [
  {
    name: "Mira",
    entries: onesmarterPublicKnowledgeBase,
    retrieve: (query, limit) => retrieveMiraContext(query, { limit }).matchedEntries,
  },
  { name: "Elena", entries: elenaApprovedKnowledge, retrieve: retrieveElenaKnowledge },
  { name: "Selene", entries: seleneApprovedKnowledge, retrieve: retrieveSeleneKnowledge },
  { name: "Ravi", entries: raviApprovedKnowledge, retrieve: retrieveRaviKnowledge },
];

const assessReachability = (id, matches, fullMatches) => {
  const rank = matches.findIndex((entry) => entry.id === id) + 1;
  assert.ok(rank > 0, "entry absent from normal retrieval window");
  assert.deepEqual(matches, fullMatches.slice(0, matches.length), "default results must preserve full-result ordering");
  // Some existing retrievers return records without scores. Do not fabricate
  // scores or duplicate their private scoring logic to infer ties.
  if (!fullMatches.every((entry) => Number.isFinite(entry.score))) {
    return { rank, ties: "scores not exposed" };
  }
  const target = matches[rank - 1];
  const peers = fullMatches.filter((entry) => entry.id !== id && entry.score === target.score);
  const uniquelyHighest = fullMatches.every((entry) => entry.id === id || target.score > entry.score);
  if (uniquelyHighest) assert.equal(rank, 1, "uniquely highest-scoring entry must rank first");
  for (let index = 1; index < fullMatches.length; index += 1) {
    assert.ok(fullMatches[index - 1].score >= fullMatches[index].score, "scores must be ordered descending");
  }
  return { rank, ties: peers.length ? `${target.score}: ${peers.map(({ id: peerId }) => peerId).join(", ")}` : "none" };
};

// Test the test's failure gates with synthetic result records only. These never
// enter production retrieval or change an approved corpus/query.
const target = { id: "target", score: 4 };
const peer = { id: "peer", score: 4 };
assert.throws(() => assessReachability(target.id, [peer], [peer]),
  { message: "entry absent from normal retrieval window" });
assert.throws(() => assessReachability(target.id, [peer], [peer, target]),
  { message: "entry absent from normal retrieval window" });
assert.equal(assessReachability(target.id, [peer, target], [peer, target]).rank, 2);
assert.throws(() => assessReachability(target.id, [peer, { ...target, score: 5 }], [peer, { ...target, score: 5 }]),
  (error) => error instanceof assert.AssertionError && error.message.startsWith("uniquely highest-scoring entry must rank first"));
assert.equal(assessReachability(target.id, [{ id: target.id }], [{ id: target.id }]).rank, 1);
console.log("PASS failure-gate checks: absent and outside-window entries fail; ties pass; misplaced unique maximum fails; scoreless records supported.");

// Theo has no titled approved-knowledge corpus or ranked knowledge retriever.
// theoResponseAdapter selects fixed approved role facts by semantic role topic;
// theoLocalEngine analyzes visitor-supplied text. Do not substitute Mira's
// retriever, invent titled records, or claim an analysis test is retrieval.
console.log("RETRIEVAL ONLY — not end-to-end LLM correctness");
console.log("Theo: NOT APPLICABLE — supplied-content analysis and fixed role facts; no titled knowledge retrieval.");
console.log("| Agent | Entry | Title | Self-retrieval | Default-window rank (title / uppercase) | Score ties (title / uppercase) | Result |");
console.log("|---|---|---|---|---|---|---|");

const failures = [];
const summaries = [];
const cell = (value) => String(value).replaceAll("|", "&#124;").replaceAll("\n", " ");
for (const { name, entries, retrieve } of agents) {
  assert.ok(entries.length > 0, `${name}: approved corpus must not be empty`);
  assert.equal(new Set(entries.map(({ id }) => id)).size, entries.length, `${name}: duplicate IDs`);
  const approvedIds = new Set(entries.map(({ id }) => id));
  let passed = 0;
  for (const entry of entries) {
    assert.ok(typeof entry.title === "string" && entry.title.trim(), `${name}/${entry.id}: missing title`);
    const ranks = [];
    const ties = [];
    const issues = [];
    for (const query of [entry.title, entry.title.toUpperCase()]) {
      try {
        const matches = retrieve(query);
        const fullMatches = retrieve(query, entries.length);
        const rank = matches.findIndex(({ id }) => id === entry.id) + 1;
        ranks.push(rank || "absent");
        const assessment = assessReachability(entry.id, matches, fullMatches);
        ties.push(assessment.ties);
        assert.deepEqual(matches, retrieve(query), "default retrieval must be deterministic");
        assert.deepEqual(fullMatches, retrieve(query, entries.length), "full retrieval must be deterministic");
        assert.ok(fullMatches.every(({ id }) => approvedIds.has(id)), "result outside approved corpus");
        assert.equal(new Set(fullMatches.map(({ id }) => id)).size, fullMatches.length, "duplicate retrieval results");
      } catch (error) {
        issues.push(`${query}: ${error.message}`);
      }
    }
    if (!issues.length) passed += 1;
    else failures.push(`${name}/${entry.id}: ${issues.join("; ")}`);
    console.log(`| ${[name, entry.id, entry.title, ranks.length === 2 && !ranks.includes("absent") ? "yes" : "no", ranks.join(" / "), ties.join(" / "), issues.length ? "FAIL" : "PASS"].map(cell).join(" | ")} |`);
  }
  summaries.push(`${name}: ${passed}/${entries.length} entries passed both title variants`);
}
for (const summary of summaries) console.log(summary);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log("All applicable approved entries passed title self-retrieval; Theo is not applicable.");
}
