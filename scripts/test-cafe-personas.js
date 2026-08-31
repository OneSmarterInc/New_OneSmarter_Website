import { readFileSync } from "node:fs";
import process from "node:process";
import {
  cafeGenerationConstraints,
  cafePersonas,
} from "../src/data/agentPresentation/cafePersonas.js";

const failures = [];
const fail = (message) => failures.push(message);
const requiredFields = [
  "offDutyDisposition",
  "interests",
  "indifferences",
  "disagreementStyle",
  "cafeHabit",
  "background",
  "relationshipToBeingAnAgent",
];
const expectedNames = ["Theo Mercer", "Elena Cross", "Ravi Sen", "Selene Hart"];

if (!Array.isArray(cafeGenerationConstraints)) {
  fail("Café generation constraints must be exported as an array.");
} else {
  if (cafeGenerationConstraints.length !== 4) {
    fail(`expected exactly 4 Café generation constraints, found ${cafeGenerationConstraints.length}.`);
  }
  if (cafeGenerationConstraints.some((constraint) => !constraint.trim())) {
    fail("Café generation constraints must be non-empty.");
  }

  const constraintsText = cafeGenerationConstraints.join(" ").toLowerCase();
  for (const [concept, patterns] of [
    ["no work content", [/onesmarter/, /services/, /clients/, /trust posture/]],
    ["constructed biography", [/constructed/, /histor/, /famil/, /impersonating real humans/]],
    ["no politics or religion", [/politics/, /religion/]],
    ["real-person protection", [/negative character judgments/, /identifiable real people/]],
  ]) {
    if (patterns.some((pattern) => !pattern.test(constraintsText))) {
      fail(`Café generation constraints are missing the ${concept} policy concept.`);
    }
  }
}

if (cafePersonas.length !== 4) {
  fail(`expected exactly 4 Café personas, found ${cafePersonas.length}.`);
}

const ids = new Set();
for (const persona of cafePersonas) {
  if (ids.has(persona.id)) fail(`duplicate id: ${persona.id}.`);
  ids.add(persona.id);

  if (!expectedNames.includes(persona.name)) {
    fail(`unexpected persona: ${persona.name}.`);
  }
  if (persona.status !== "draft") {
    fail(`${persona.name}: status must remain draft.`);
  }

  for (const field of requiredFields) {
    const value = persona[field];
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (value == null || value === "" || isEmptyArray) {
      fail(`${persona.name}: missing required field ${field}.`);
    }
  }

  if (persona.interests.length < 3 || persona.interests.length > 5) {
    fail(`${persona.name}: interests must contain 3–5 items.`);
  }
  if (persona.indifferences.length < 2) {
    fail(`${persona.name}: indifferences must contain at least 2 items.`);
  }
  if ([...persona.interests, ...persona.indifferences].some((item) => !item.trim())) {
    fail(`${persona.name}: interest and indifference values must be non-empty.`);
  }
}

if (cafePersonas.some(({ id, name }) => id.includes("mira") || name.includes("Mira"))) {
  fail("Mira must not have a Café persona.");
}

const theo = cafePersonas.find(({ id }) => id === "theo-mercer");
if (!theo?.generationNotes?.trim()) {
  fail("Theo must have non-empty generationNotes.");
} else {
  const theoNotes = theo.generationNotes.toLowerCase();
  for (const [concept, pattern] of [
    ["short contributions", /short/],
    ["infrequent or reduced airtime", /infrequent|reduced airtime|without equal conversational airtime/],
    ["reserved rather than rude", /reserved rather than rude/],
  ]) {
    if (!pattern.test(theoNotes)) {
      fail(`Theo's generationNotes must communicate ${concept}.`);
    }
  }
}

const workPersonaSource = readFileSync("src/components/AiAgentsPage.jsx", "utf8");
const agentsSource = workPersonaSource.match(/const agents = \[([\s\S]*?)\n\];/)?.[1] || "";
const agentEntries = Object.fromEntries(
  [...agentsSource.matchAll(/\{\s*name:\s*"([^"]+)",([\s\S]*?)\n {2}\},/g)].map(
    ([, name, body]) => [
      name,
      {
        presence: body.match(/presence:\s*"([^"]+)"/)?.[1],
        status: body.match(/status:\s*"([^"]+)"/)?.[1],
      },
    ],
  ),
);
const expectedStatuses = {
  "Mira Vale": "Live public-content guide",
  "Theo Mercer": "Live supplied-content analysis",
  "Elena Cross": "Live compliance reader",
  "Ravi Sen": "Future workflow concept",
  "Selene Hart": "Future strategy concept",
};
if (Object.keys(agentEntries).length !== 5) {
  fail(`expected exactly 5 workplace agents, found ${Object.keys(agentEntries).length}.`);
}

for (const [name, expectedStatus] of Object.entries(expectedStatuses)) {
  const agent = agentEntries[name];
  if (!agent) {
    fail(`workplace agents are missing ${name}.`);
    continue;
  }
  if (agent.status !== expectedStatus) {
    fail(`${name}: status must remain ${expectedStatus}.`);
  }
}

// Permanent product rule: keep Mira available as the live front-door guide.
if (agentEntries["Mira Vale"]?.presence !== "at_work") {
  fail("Mira must permanently remain at_work.");
}

const nonMiraAgents = Object.entries(agentEntries).filter(([name]) => name !== "Mira Vale");

const cafePersonaNames = new Set(cafePersonas.map(({ name }) => name));
const cafeCapableAgentNames = new Set(nonMiraAgents.map(([name]) => name));
for (const name of cafePersonaNames) {
  if (!cafeCapableAgentNames.has(name)) {
    fail(`${name}: Café persona has no corresponding workplace agent.`);
  }
}
for (const name of cafeCapableAgentNames) {
  if (!cafePersonaNames.has(name)) {
    fail(`${name}: non-Mira workplace agent has no corresponding Café persona.`);
  }
}

for (const workPersonality of [
  "Thoughtful, observant, precise.",
  "Careful, calm, serious when needed.",
  "Practical, direct, grounded.",
  "Creative, reflective, composed.",
]) {
  if (!workPersonaSource.includes(workPersonality)) {
    fail(`existing work persona changed or missing: ${workPersonality}`);
  }
}

if (!workPersonaSource.includes('const isInCafe = agent.presence === "in_cafe";')) {
  fail("workplace cards must derive stepped-out treatment from in_cafe presence.");
}
if (
  !workPersonaSource.includes("expressionMarkerClasses.unavailable") ||
  !workPersonaSource.includes("Back shortly")
) {
  fail("workplace cards must reuse the unavailable presentation treatment with human wording.");
}
if (
  !workPersonaSource.includes("agentsWithPresence") ||
  !workPersonaSource.includes("getCafePresenceForPersonaId") ||
  !workPersonaSource.includes('agent.presence === "in_cafe" && agent.name !== "Mira Vale"') ||
  !workPersonaSource.includes("cafeAgents.map")
) {
  fail("Café view must derive current presence, filter in_cafe agents, and explicitly exclude Mira.");
}
if (!/\{showPresentationDebug && \([\s\S]*?The Café[\s\S]*?cafeAgents\.map/.test(workPersonaSource)) {
  fail("Café view must remain behind the existing presentation-debug gate.");
}

if (failures.length) {
  console.error("Café persona data tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Café persona data tests passed.");
console.log("Validated 4 draft profiles, 7 required fields, 4 generation constraints, Theo generation notes, interest counts, indifferences, unique IDs, Mira exclusion, and unchanged work-persona labels.");
