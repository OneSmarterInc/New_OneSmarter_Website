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

if (failures.length) {
  console.error("Café persona data tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Café persona data tests passed.");
console.log("Validated 4 draft profiles, 7 required fields, 4 generation constraints, Theo generation notes, interest counts, indifferences, unique IDs, Mira exclusion, and unchanged work-persona labels.");
