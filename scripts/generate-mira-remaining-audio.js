import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const MODEL = "gpt-4o-mini-tts";
const VOICE = "marin";
const RESPONSE_FORMAT = "mp3";
const ENDPOINT = "https://api.openai.com/v1/audio/speech";
const WELCOME_PATH = "public/audio/mira/mira-welcome.mp3";
const OUTPUT_DIR = "public/audio/mira";

const samples = [
  {
    id: "helpful",
    filename: "mira-helpful.mp3",
    input:
      "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance readiness support.",
    direction:
      "Confident, warm, conversational, and helpful. Slightly quicker than the Welcome sample, approximately 150-160 words per minute. Clear and professional, with no promotional or sales-like enthusiasm.",
  },
  {
    id: "careful",
    filename: "mira-careful.mp3",
    input:
      "I should keep this wording precise. OneSmarter uses evidence-based language such as SOC 2 Type II Attested and HIPAA Security Rule Compliance Assessment Completed.",
    direction:
      "Slower, deliberate, precise, and slightly serious, approximately 135-145 words per minute. Emphasize the approved compliance terms while remaining calm and professional. Do not sound defensive or legalistic. Pronounce OneSmarter as One Smarter, SOC 2 as sock two, and HIPAA as HIP-uh.",
  },
  {
    id: "concerned",
    filename: "mira-concerned.mp3",
    input:
      "Please do not submit PHI, confidential documents, or private operational details through this public agent.",
    direction:
      "Calm, protective, and concerned but not alarmist, approximately 135-145 words per minute. Firm clarity on the safety boundary. No fear, urgency, or dramatic emphasis. Pronounce PHI as P-H-I.",
  },
  {
    id: "handoff",
    filename: "mira-handoff.mp3",
    input:
      "For pricing, procurement, partnerships, project scoping, or client-specific questions, please contact care at one smarter dot com.",
    direction:
      "Reassuring, clear, and respectful, approximately 140-150 words per minute. Speak the email address slowly and distinctly. End with a confident, helpful tone.",
  },
];

const baseInstructions = [
  "Voice profile: mira-v1.",
  "Adult female voice; warm, composed, intelligent, and professional.",
  "Neutral international English with a subtle and natural Indian influence.",
  "Age impression: late 30s to mid-40s.",
  "Clear international pronunciation and natural, steady pitch.",
  "Keep the same voice identity across all samples.",
  "No exaggerated accent, no sales voice, no music, and no background audio.",
];

const sha256File = async (filePath) => {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
};

const detectMp3Mime = (bytes) => {
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return "audio/mpeg";
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return "audio/mpeg";
  }

  return "unknown";
};

const readSafeProviderError = async (response) => {
  try {
    const body = await response.json();
    return {
      status: response.status,
      errorType: body?.error?.type ?? null,
      errorCode: body?.error?.code ?? null,
      errorParam: body?.error?.param ?? null,
      requestId: response.headers.get("x-request-id"),
    };
  } catch {
    return {
      status: response.status,
      errorType: null,
      errorCode: null,
      errorParam: null,
      requestId: response.headers.get("x-request-id"),
    };
  }
};

const assertInitialAssetState = async () => {
  const welcomePath = resolve(WELCOME_PATH);

  if (!existsSync(welcomePath)) {
    throw new Error("approved Welcome asset is missing");
  }

  const existingTargets = samples
    .map((sample) => resolve(OUTPUT_DIR, sample.filename))
    .filter((targetPath) => existsSync(targetPath));

  if (existingTargets.length) {
    throw new Error(
      `target file already exists: ${existingTargets.map((targetPath) => targetPath.replace(resolve("."), ".")).join(", ")}`,
    );
  }

  return {
    welcomePath,
    welcomeHashBefore: await sha256File(welcomePath),
  };
};

const requestSpeech = async ({ input, direction, apiKey }) => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      response_format: RESPONSE_FORMAT,
      input,
      instructions: `${baseInstructions.join(" ")} ${direction}`,
    }),
  });

  if (!response.ok) {
    const safeError = await readSafeProviderError(response);
    throw new Error(`provider request failed: ${JSON.stringify(safeError)}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

const generateSample = async (sample, apiKey) => {
  const outputPath = resolve(OUTPUT_DIR, sample.filename);
  const tempPath = `${outputPath}.tmp-${Date.now()}`;

  if (existsSync(outputPath)) {
    throw new Error(`target file already exists: ${sample.filename}`);
  }

  try {
    const audioBytes = await requestSpeech({
      input: sample.input,
      direction: sample.direction,
      apiKey,
    });

    await writeFile(tempPath, audioBytes, { flag: "wx" });
    await rename(tempPath, outputPath);

    const fileStats = await stat(outputPath);
    return {
      filename: sample.filename,
      relativePath: `${OUTPUT_DIR}/${sample.filename}`.replace(/\\/g, "/"),
      fileSizeBytes: fileStats.size,
      detectedMimeType: detectMp3Mime(audioBytes),
      duration: "not_detected",
      model: MODEL,
      voice: VOICE,
    };
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
};

const main = async () => {
  let initialState;

  try {
    initialState = await assertInitialAssetState();
  } catch (error) {
    console.error(`Mira remaining audio generation failed: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Mira remaining audio generation failed: OPENAI_API_KEY is not set.");
    process.exitCode = 1;
    return;
  }

  await mkdir(resolve(OUTPUT_DIR), { recursive: true });

  const generated = [];
  for (const sample of samples) {
    try {
      generated.push(await generateSample(sample, apiKey));
    } catch (error) {
      console.error(`Mira remaining audio generation failed for ${sample.filename}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const welcomeHashAfter = await sha256File(initialState.welcomePath);
  if (welcomeHashAfter !== initialState.welcomeHashBefore) {
    console.error("Mira remaining audio generation failed: Welcome asset checksum changed.");
    process.exitCode = 1;
    return;
  }

  console.log("Mira remaining audio generation succeeded.");
  console.log(
    JSON.stringify(
      {
        welcomeAssetPreserved: true,
        welcomeSha256: welcomeHashAfter,
        generated,
      },
      null,
      2,
    ),
  );
};

main().catch(() => {
  console.error("Mira remaining audio generation failed: unexpected generation error.");
  process.exitCode = 1;
});
