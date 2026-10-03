import assert from "node:assert/strict";
import { raviApprovedKnowledge } from "../src/data/agentKnowledge/raviApprovedKnowledge.js";
import { retrieveRaviKnowledge } from "../src/server/ravi/raviLocalEngine.js";

// Every approved record participates, including future records. No entry IDs,
// topic vocabulary or hand-authored query mappings belong in this invariant.
const failures = [];
for (const entry of raviApprovedKnowledge) {
  const sameTitle = raviApprovedKnowledge.filter(candidate =>
    candidate.title.toLowerCase() === entry.title.toLowerCase());
  for (const query of [entry.title, entry.title.toUpperCase()]) {
    const matches = retrieveRaviKnowledge(query, raviApprovedKnowledge.length);
    if (sameTitle.length === 1 && matches[0]?.id !== entry.id) {
      failures.push(`${entry.id}: own title ranked ${matches.findIndex(match => match.id === entry.id) + 1}; first=${matches[0]?.id}`);
    }
    assert.ok(matches.some(match => match.id === entry.id), `${entry.id}: absent for its title`);
    assert.deepEqual(matches, retrieveRaviKnowledge(query, raviApprovedKnowledge.length));
    assert.ok(matches.every(match => raviApprovedKnowledge.some(candidate => candidate.id === match.id)));
  }
}
assert.deepEqual(failures, [], failures.join("\n"));
assert.deepEqual(retrieveRaviKnowledge(""), []);
assert.deepEqual(retrieveRaviKnowledge("zzzxxyyqq"), []);
assert.deepEqual(retrieveRaviKnowledge(raviApprovedKnowledge[0].title, 0), []);
console.log(`Ravi retrieval: ${raviApprovedKnowledge.length} approved titles retrieve themselves first; casing, determinism, limits and isolation passed.`);
