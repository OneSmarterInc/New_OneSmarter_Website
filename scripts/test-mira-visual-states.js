import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import {
  MIRA_POSTURE_TO_VISUAL_STATE,
  MIRA_VISUAL_STATE_IDS,
  getMiraVisualStateForPosture,
  miraVisualStates,
} from "../src/data/agentPresentation/miraVisualStates.js";

const failures = [];
const fail = (message) => failures.push(message);

const expectedStates = [
  "welcoming",
  "helpful",
  "thoughtful",
  "careful",
  "concerned",
  "confident",
];
const expectedAssetPaths = Object.fromEntries(
  expectedStates.map((state) => [state, `/images/agents/mira/mira-${state}.webp`]),
);

if (miraVisualStates.length !== 6) {
  fail(`visual-states: expected exactly 6 states, found ${miraVisualStates.length}.`);
}

for (const expectedState of expectedStates) {
  if (!MIRA_VISUAL_STATE_IDS.includes(expectedState)) {
    fail(`visual-state-ids: missing ${expectedState}.`);
  }
  if (MIRA_POSTURE_TO_VISUAL_STATE[expectedState] !== expectedState) {
    fail(`posture-map: ${expectedState} must map to itself.`);
  }
}

const ids = new Set();
for (const state of miraVisualStates) {
  if (!state.id || typeof state.id !== "string") fail("visual-state: missing id.");
  if (ids.has(state.id)) fail(`visual-state: duplicate id ${state.id}.`);
  ids.add(state.id);

  for (const field of [
    "label",
    "expression",
    "accessibilityDescription",
    "assetStatus",
    "assetPath",
    "fallbackInitials",
    "designDirection",
  ]) {
    if (!state[field] || typeof state[field] !== "string") {
      fail(`${state.id}: missing required field ${field}.`);
    }
  }

  if (state.assetStatus !== "available") {
    fail(`${state.id}: approved portrait must be available.`);
  }
  if (state.approvalStatus !== "approved") {
    fail(`${state.id}: approved portrait must include approvalStatus approved.`);
  }
  if (state.identityProfileId !== "mira-visual-v1") {
    fail(`${state.id}: approved portrait must use identityProfileId mira-visual-v1.`);
  }
  if (state.assetPath !== expectedAssetPaths[state.id]) {
    fail(`${state.id}: assetPath must be ${expectedAssetPaths[state.id]}.`);
  }
  if (!existsSync(`public${state.assetPath}`)) {
    fail(`${state.id}: approved WebP portrait must exist in public/images/agents/mira/.`);
  }
  if (state.fallbackInitials !== "MV") {
    fail(`${state.id}: fallback initials must be MV.`);
  }
  if (!state.assetPath.startsWith("/images/agents/mira/")) {
    fail(`${state.id}: asset path must use the local Mira image namespace.`);
  }
  if (!state.assetPath.endsWith(".webp")) {
    fail(`${state.id}: asset path must use .webp.`);
  }
  if (/^https?:\/\//i.test(state.assetPath)) {
    fail(`${state.id}: asset path must not be an external URL.`);
  }
}

if (getMiraVisualStateForPosture("unknown")?.id !== "welcoming") {
  fail("visual-state: unknown posture must fall back to welcoming.");
}

for (const posture of expectedStates) {
  const visualState = getMiraVisualStateForPosture(posture);
  if (visualState?.id !== posture) {
    fail(`visual-state: ${posture} posture did not resolve correctly.`);
  }
  if (visualState?.assetPath !== expectedAssetPaths[posture]) {
    fail(`visual-state: ${posture} posture should load ${expectedAssetPaths[posture]}.`);
  }
}

const componentSource = readFileSync("src/components/AiAgentsPage.jsx", "utf8");
const visualStateSource = readFileSync(
  "src/data/agentPresentation/miraVisualStates.js",
  "utf8",
);
const publicVisualSource = `${componentSource}\n${visualStateSource}`;

for (const forbidden of [
  "getUserMedia",
  "navigator.mediaDevices",
  "MediaDevices",
  "Camera",
  "webcam",
  "facialRecognition",
  "face-api",
  "tracking.js",
  "lipSync",
  "lip-sync",
  "<video",
  "autoplay",
  "autoPlay",
  "loop",
  "avatar vendor",
  "image_generation",
  "imagegen",
]) {
  if (publicVisualSource.includes(forbidden)) {
    fail(`visual-safety: forbidden live avatar/media reference found: ${forbidden}.`);
  }
}

if (!componentSource.includes("MiraVisualPresencePanel")) {
  fail("visual-ui: Mira visual presence panel must be rendered.");
}

if (!componentSource.includes("role=\"img\"")) {
  fail("visual-ui: placeholder should expose an image role with accessible label.");
}

if (!componentSource.includes("onError={() =>")) {
  fail("visual-ui: image errors should fall back to the placeholder.");
}

if (!componentSource.includes("motion-safe:transition-opacity")) {
  fail("visual-ui: reduced-motion compatible transition class is required.");
}

if (!componentSource.includes("loading=\"lazy\"")) {
  fail("visual-ui: portrait image should use lazy loading.");
}

if (!componentSource.includes("Static artwork only")) {
  fail("visual-ui: helper text should state static artwork only.");
}

if (failures.length) {
  console.error("Mira visual state tests failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mira visual state tests passed.");
console.log(`Validated ${miraVisualStates.length} static visual states.`);
