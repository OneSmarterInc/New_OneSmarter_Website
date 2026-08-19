import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  cafeGenerationConstraints,
  cafePersonas,
} from "../src/data/agentPresentation/cafePersonas.js";
import { readMiraRuntimeConfig } from "../src/server/mira/miraRuntimeConfig.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MIN_EXCHANGES = 6;
const MAX_EXCHANGES = 10;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const draftDirectory = path.resolve(
  scriptDirectory,
  "../src/data/cafeConversations/drafts",
);

const findPersona = (personaId) =>
  cafePersonas.find((persona) => persona.id === personaId);

export const buildCafeGenerationPrompt = ({
  participantIds,
  seedTopic,
  exchangeCount,
}) => {
  const participants = participantIds.map(findPersona);

  if (participants.some((participant) => !participant)) {
    throw new Error("Both participant IDs must match Café personas.");
  }
  if (new Set(participantIds).size !== 2) {
    throw new Error("Choose exactly two different Café personas.");
  }
  if (!Number.isInteger(exchangeCount) || exchangeCount < MIN_EXCHANGES || exchangeCount > MAX_EXCHANGES) {
    throw new Error("Exchange count must be an integer from 6 through 10.");
  }
  if (!seedTopic?.trim()) {
    throw new Error("Seed topic must be a non-empty string.");
  }

  return [
    "Generate one natural off-duty Café conversation as JSON.",
    `Use exactly ${exchangeCount} exchanges about this ordinary seed topic: ${seedTopic.trim()}`,
    "Return only an object with an exchanges array of { speaker, text } objects.",
    `Every speaker must be one of: ${participantIds.join(", ")}.`,
    "Do not add headings, explanations, or markdown.",
    "",
    "Café generation constraints (apply every line verbatim):",
    ...cafeGenerationConstraints.map((constraint) => `- ${constraint}`),
    "",
    "Participant profiles (complete data):",
    JSON.stringify(participants, null, 2),
  ].join("\n");
};

export const parseCafeModelOutput = (responseJson) => {
  const outputText = responseJson?.output
    ?.flatMap((item) => item?.content || [])
    .find((content) => content?.type === "output_text")?.text;

  if (!outputText) throw new Error("Provider returned no text output.");
  return JSON.parse(outputText);
};

export const buildCafeDraft = ({ participantIds, seedTopic, exchanges }) => ({
  id: `cafe-draft-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`,
  createdAt: new Date().toISOString(),
  participants: participantIds,
  seedTopic,
  exchanges,
  status: "unpublished",
});

const generateConversation = async ({ participantIds, seedTopic, exchangeCount }) => {
  const config = readMiraRuntimeConfig(process.env);
  if (config.provider !== "openai" || !config.model || !config.apiKeyConfigured) {
    throw new Error(
      "Set MIRA_LLM_PROVIDER=openai, MIRA_LLM_MODEL, and MIRA_LLM_API_KEY before running this manual tool.",
    );
  }

  const prompt = buildCafeGenerationPrompt({ participantIds, seedTopic, exchangeCount });
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      input: prompt,
      max_output_tokens: Math.max(config.maxTokens, 900),
      text: {
        format: {
          type: "json_schema",
          name: "cafe_conversation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              exchanges: {
                type: "array",
                minItems: exchangeCount,
                maxItems: exchangeCount,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    speaker: { type: "string", enum: participantIds },
                    text: { type: "string", minLength: 1 },
                  },
                  required: ["speaker", "text"],
                },
              },
            },
            required: ["exchanges"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Provider request failed with HTTP ${response.status}.`);
  }

  const generated = parseCafeModelOutput(await response.json());
  if (generated.exchanges?.length !== exchangeCount) {
    throw new Error("Provider output did not contain the requested exchange count.");
  }

  const draft = buildCafeDraft({
    participantIds,
    seedTopic,
    exchanges: generated.exchanges,
  });
  await fs.mkdir(draftDirectory, { recursive: true });
  const draftPath = path.join(draftDirectory, `${draft.id}.json`);
  await fs.writeFile(draftPath, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
  return draftPath;
};

const isDirectRun = process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  const [firstPersonaId, secondPersonaId, seedTopic, exchangeCountValue] = process.argv.slice(2);
  const exchangeCount = Number(exchangeCountValue);

  generateConversation({
    participantIds: [firstPersonaId, secondPersonaId],
    seedTopic,
    exchangeCount,
  })
    .then((draftPath) => console.log(`Unpublished Café draft written to ${draftPath}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
