import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  MIRA_ALLOWED_VOICE_STYLES,
  MIRA_LANGUAGE_DEMOS,
  MIRA_VOICE_SAMPLE_STATUSES,
  isAllowedMiraVoiceStyle,
  miraVoiceSamples,
} from "../src/data/agentPresentation/miraVoiceSamples.js";

const failures = [];
const fail = (message) => failures.push(message);
const root = process.cwd();

const ids = new Set();
for (const sample of miraVoiceSamples) {
  if (!sample.id || typeof sample.id !== "string") {
    fail("voice-samples: every sample must include a string id.");
  }
  if (ids.has(sample.id)) {
    fail(`voice-samples: duplicate sample id ${sample.id}.`);
  }
  ids.add(sample.id);

  if (!sample.label || typeof sample.label !== "string") {
    fail(`${sample.id}: missing label.`);
  }
  if (!sample.transcript || typeof sample.transcript !== "string") {
    fail(`${sample.id}: missing transcript.`);
  }
  if (!sample.posture || !isAllowedMiraVoiceStyle(sample.posture)) {
    fail(`${sample.id}: posture must be an allowed voice style.`);
  }
  if (!MIRA_VOICE_SAMPLE_STATUSES.includes(sample.status)) {
    fail(`${sample.id}: invalid status ${sample.status}.`);
  }
  if (!sample.assetPath || typeof sample.assetPath !== "string") {
    fail(`${sample.id}: missing assetPath.`);
  }
  if (/^https?:\/\//i.test(sample.assetPath)) {
    fail(`${sample.id}: audio asset path must not be an external URL.`);
  }
  if (!sample.assetPath.startsWith("/audio/mira/")) {
    fail(`${sample.id}: audio asset path must live under /audio/mira/.`);
  }

  const localAssetPath = path.join(root, "public", sample.assetPath.replace(/^\//, ""));
  if (sample.status === "available" && !existsSync(localAssetPath)) {
    fail(`${sample.id}: available sample must have a local asset file.`);
  }
  if (sample.status !== "available" && existsSync(localAssetPath)) {
    fail(`${sample.id}: pending sample has a local asset file; mark it available after review.`);
  }
}

for (const style of MIRA_ALLOWED_VOICE_STYLES) {
  if (!isAllowedMiraVoiceStyle(style)) {
    fail(`voice-styles: expected ${style} to be allowed.`);
  }
}

for (const style of ["Live accent switching", "Realtime voice", "Browser speech"]) {
  if (isAllowedMiraVoiceStyle(style)) {
    fail(`voice-styles: ${style} must not be allowed.`);
  }
}

if (!MIRA_LANGUAGE_DEMOS.some((language) => language.id === "english")) {
  fail("language-demos: English demo must be present.");
}

if (!MIRA_LANGUAGE_DEMOS.some((language) => language.status === "planned")) {
  fail("language-demos: future language samples must be marked planned.");
}

const componentSource = readFileSync("src/components/AiAgentsPage.jsx", "utf8");
const presentationSource = readFileSync(
  "src/data/agentPresentation/miraVoiceSamples.js",
  "utf8",
);
const publicVoiceSource = `${componentSource}\n${presentationSource}`;

for (const forbidden of [
  "speechSynthesis",
  "SpeechRecognition",
  "webkitSpeechRecognition",
  "getUserMedia",
  "navigator.mediaDevices",
  "MediaRecorder",
]) {
  if (publicVoiceSource.includes(forbidden)) {
    fail(`voice-safety: forbidden live voice/browser capture API found: ${forbidden}.`);
  }
}

if (/\bautoPlay\b|\bautoplay\b/i.test(publicVoiceSource)) {
  fail("voice-safety: voice samples must not autoplay.");
}

const audioTagCount = (componentSource.match(/<audio\b/g) || []).length;
if (audioTagCount !== 1) {
  fail(`voice-ui: expected exactly one shared audio element, found ${audioTagCount}.`);
}

if (!componentSource.includes("disabled={!isAvailable}")) {
  fail("voice-ui: unavailable samples should keep playback controls disabled.");
}

if (failures.length) {
  console.error("Mira voice sample tests failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mira voice sample tests passed.");
console.log(`Validated ${miraVoiceSamples.length} scripted voice sample definitions.`);
