import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  MIRA_ALLOWED_VOICE_STYLES,
  MIRA_LANGUAGE_DEMOS,
  MIRA_VOICE_PROFILE_ID,
  MIRA_VOICE_SAMPLE_STATUSES,
  isAllowedMiraVoiceStyle,
  miraVoiceSamples,
} from "../src/data/agentPresentation/miraVoiceSamples.js";

const failures = [];
const fail = (message) => failures.push(message);
const root = process.cwd();
const expectedSamplePaths = {
  welcome: "/audio/mira/mira-welcome.mp3",
  helpful: "/audio/mira/mira-helpful.mp3",
  careful: "/audio/mira/mira-careful.mp3",
  concerned: "/audio/mira/mira-concerned.mp3",
  handoff: "/audio/mira/mira-handoff.mp3",
};

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
  if (sample.voiceProfileId !== MIRA_VOICE_PROFILE_ID) {
    fail(`${sample.id}: voiceProfileId must be ${MIRA_VOICE_PROFILE_ID}.`);
  }
  if (!sample.pace || !/\b1(4[5-9]|5[0-5])\b/.test(sample.pace)) {
    fail(`${sample.id}: pace must reference the approved 145-155 wpm range.`);
  }
  if (!Array.isArray(sample.pronunciationNotes) || sample.pronunciationNotes.length < 9) {
    fail(`${sample.id}: pronunciationNotes must include the approved guide.`);
  }
  if (!sample.productionDirection || typeof sample.productionDirection !== "string") {
    fail(`${sample.id}: productionDirection is required.`);
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
  if (sample.status !== "available") {
    fail(`${sample.id}: approved sample must be available.`);
  }
  if (sample.approvalStatus !== "approved") {
    fail(`${sample.id}: approved sample must include approvalStatus approved.`);
  }
  if (sample.assetPath !== expectedSamplePaths[sample.id]) {
    fail(`${sample.id}: assetPath must be ${expectedSamplePaths[sample.id]}.`);
  }
  if (!existsSync(localAssetPath)) {
    fail(`${sample.id}: approved local MP3 asset must exist in public/audio/mira/.`);
  }
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

const carefulSample = miraVoiceSamples.find((sample) => sample.id === "careful");
if (!carefulSample?.transcript.includes("ISO/IEC 27001 Certified")) {
  fail("voice-samples: careful trust-evidence sample must include approved ISO/IEC 27001 Certified wording.");
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
  "recording",
  "type=\"file\"",
  "type='file'",
  "realtime voice",
  "/api/voice",
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

if (!componentSource.includes("audioRef.current.pause();")) {
  fail("voice-ui: switching active samples should stop the previous sample.");
}

for (const stateLabel of [
  "Playing",
  "Paused",
  "Stopped",
  "Ended",
  "Audio sample unavailable",
]) {
  if (!componentSource.includes(stateLabel)) {
    fail(`voice-ui: missing visible playback state label ${stateLabel}.`);
  }
}

if (!componentSource.includes("onError={() => activeSampleId && setPlaybackState(\"unavailable\")}")) {
  fail("voice-ui: audio error state should be handled without crashing.");
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
