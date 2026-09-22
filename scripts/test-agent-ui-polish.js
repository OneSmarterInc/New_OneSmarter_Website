import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const mira = read("../src/components/AiAgentsPage.jsx");
const theo = read("../src/components/TheoAnalysisPanel.jsx");
const elena = read("../src/components/ElenaConversationPanel.jsx");
const ravi = read("../src/components/RaviConversationPanel.jsx");
const selene = read("../src/components/SeleneConversationPanel.jsx");

const responseClear = theo.indexOf("setResponse(null);", theo.indexOf("const runAnalysis"));
const endpointCall = theo.indexOf("await askTheoEndpoint", theo.indexOf("const runAnalysis"));
assert.ok(responseClear > -1 && responseClear < endpointCall, "Theo clears the prior current result before requesting the next answer.");
assert.match(theo, /isLoading && <p[^>]*>Reviewing only the content you supplied/);
assert.match(theo, /setResponse\(nextResponse\)/);

assert.match(mira, /setCustomQuestion\(example\.question\);[\s\S]*?requestMiraAnswer\(example\.question\)/);
assert.doesNotMatch(mira, /requestMiraAnswer\(example\.question,\s*example\.id\)/);
assert.match(theo, /const submitSuggestedQuestion = async \(question\)[\s\S]*?runAnalysis\(question\)/);
assert.match(theo, /onClick=\{\(\) => submitSuggestedQuestion\(question\)\}/);
for (const source of [elena, ravi, selene]) {
  assert.match(source, /submitQuestion\(event, question\)/);
  assert.match(source, /const submitQuestion = async \(event, suggestedMessage = ""\)/);
}

for (const source of [theo, elena, ravi, selene]) {
  assert.match(source, /overflow-x-hidden/);
  assert.match(source, /grid min-w-0/);
  assert.match(source, /w-full min-w-0 resize-y/);
  assert.match(source, /whitespace-normal break-words/);
}
assert.match(mira, /min-w-0 max-w-full overflow-x-hidden/);
assert.match(theo, /min-h-52[\s\S]*sm:min-h-64/);

console.log("AI Agents UI polish tests passed.");
console.log("Validated Theo result replacement, unified suggestion submission, and narrow-to-desktop overflow safeguards.");
