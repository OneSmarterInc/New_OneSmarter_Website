import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  cafeGenerationConstraints,
  cafePersonas,
} from "../src/data/agentPresentation/cafePersonas.js";
import { cafeSeedTopics } from "../src/data/cafeSeedTopics.js";
import { publishedCafeConversations } from "../src/data/cafeConversations/index.js";
import { readMiraRuntimeConfig } from "../src/server/mira/miraRuntimeConfig.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MIN_EXCHANGES = 6;
const MAX_EXCHANGES = 10;
const RECENT_PUBLICATION_LIMIT = 4;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const draftDirectory = path.resolve(
  scriptDirectory,
  "../src/data/cafeConversations/drafts",
);

const findPersona = (personaId) =>
  cafePersonas.find((persona) => persona.id === personaId);

const randomIndex = (length, random) =>
  Math.min(length - 1, Math.floor(random() * length));

export const weightedRandomItem = (items, getWeight, random = Math.random) => {
  const weightedItems = items.map((item) => ({
    item,
    weight: Number(getWeight(item)),
  }));
  const totalWeight = weightedItems.reduce((total, { weight }) => total + weight, 0);
  if (
    weightedItems.length === 0 ||
    weightedItems.some(({ weight }) => !Number.isFinite(weight) || weight < 0) ||
    totalWeight <= 0
  ) {
    throw new Error("Weighted selection requires valid non-negative weights with a positive total.");
  }

  let threshold = Math.min(0.999999999999, Math.max(0, random())) * totalWeight;
  for (const { item, weight } of weightedItems) {
    threshold -= weight;
    if (threshold < 0) return item;
  }
  return weightedItems.at(-1).item;
};

export const toCafeParticipantPairKey = (participantIds) =>
  [...participantIds].sort().join("|");

export const getRecentCafeSelectionExclusions = (
  conversations = publishedCafeConversations,
  limit = RECENT_PUBLICATION_LIMIT,
) => {
  const recentConversations = conversations.slice(0, limit);
  return {
    seedTopics: new Set(recentConversations.map(({ seedTopic }) => seedTopic).filter(Boolean)),
    participantPairs: new Set(
      recentConversations
        .filter(({ participants }) => Array.isArray(participants) && participants.length === 2)
        .map(({ participants }) => toCafeParticipantPairKey(participants)),
    ),
  };
};

export const selectCafeSeedTopic = (
  random = Math.random,
  excludedSeedTopics = new Set(),
  approvedSeedTopics = cafeSeedTopics,
) => {
  const eligibleSeedTopics = approvedSeedTopics.filter(
    (seedTopic) => !excludedSeedTopics.has(seedTopic),
  );
  const selectionPool = eligibleSeedTopics.length ? eligibleSeedTopics : approvedSeedTopics;
  return selectionPool[randomIndex(selectionPool.length, random)];
};

export const selectWeightedCafeParticipants = (
  random = Math.random,
  excludedParticipantPairs = new Set(),
) => {
  const eligiblePartnersById = new Map(
    cafePersonas.map((persona) => [
      persona.id,
      cafePersonas.filter(
        (candidate) =>
          candidate.id !== persona.id &&
          !excludedParticipantPairs.has(
            toCafeParticipantPairKey([persona.id, candidate.id]),
          ),
      ),
    ]),
  );
  const eligibleFirstParticipants = cafePersonas.filter(
    ({ id }) => eligiblePartnersById.get(id).length > 0,
  );
  const firstPool = eligibleFirstParticipants.length
    ? eligibleFirstParticipants
    : cafePersonas;
  const firstParticipant = weightedRandomItem(
    firstPool,
    ({ cafeSelectionWeights }) => cafeSelectionWeights.appearance,
    random,
  );
  const eligiblePartners = eligiblePartnersById.get(firstParticipant.id);
  const remainingPersonas = eligiblePartners.length
    ? eligiblePartners
    : cafePersonas.filter(({ id }) => id !== firstParticipant.id);
  const secondParticipant = weightedRandomItem(
    remainingPersonas,
    ({ cafeSelectionWeights }) => cafeSelectionWeights.appearance,
    random,
  );
  return [firstParticipant.id, secondParticipant.id];
};

export const selectCafeInviter = (participantIds, random = Math.random) => {
  const participants = participantIds.map(findPersona);
  if (participants.some((participant) => !participant) || new Set(participantIds).size !== 2) {
    throw new Error("Invitation selection requires two distinct Café participants.");
  }

  const noInvitation = { id: null, cafeSelectionWeights: { invitation: 1 } };
  return weightedRandomItem(
    [...participants, noInvitation],
    ({ cafeSelectionWeights }) => cafeSelectionWeights.invitation,
    random,
  ).id;
};

export const resolveCafeGenerationInputs = ({
  participantIds,
  seedTopic,
  exchangeCount,
  publishedConversations = publishedCafeConversations,
  random = Math.random,
} = {}) => {
  const recentExclusions = getRecentCafeSelectionExclusions(publishedConversations);
  const suppliedParticipantIds = participantIds?.filter(Boolean) || [];
  let resolvedParticipantIds;
  let participantMode;

  if (suppliedParticipantIds.length === 0) {
    resolvedParticipantIds = selectWeightedCafeParticipants(
      random,
      recentExclusions.participantPairs,
    );
    participantMode = "random";
  } else {
    if (suppliedParticipantIds.length !== 2 || participantIds.length !== 2) {
      throw new Error("Supply exactly two participant IDs, or omit both for random selection.");
    }
    resolvedParticipantIds = suppliedParticipantIds;
    participantMode = "manual";
  }

  const hasManualSeed = typeof seedTopic === "string" && Boolean(seedTopic.trim());
  const resolvedSeedTopic = hasManualSeed
    ? seedTopic.trim()
    : selectCafeSeedTopic(random, recentExclusions.seedTopics);
  const hasManualExchangeCount = exchangeCount !== undefined && exchangeCount !== null && exchangeCount !== "";
  const resolvedExchangeCount = hasManualExchangeCount
    ? Number(exchangeCount)
    : MIN_EXCHANGES + randomIndex(MAX_EXCHANGES - MIN_EXCHANGES + 1, random);
  const invitedBy = selectCafeInviter(resolvedParticipantIds, random);

  buildCafeGenerationPrompt({
    participantIds: resolvedParticipantIds,
    seedTopic: resolvedSeedTopic,
    exchangeCount: resolvedExchangeCount,
  });

  return {
    participantIds: resolvedParticipantIds,
    seedTopic: resolvedSeedTopic,
    exchangeCount: resolvedExchangeCount,
    invitedBy,
    selection: {
      participants: participantMode,
      seedTopic: hasManualSeed ? "manual" : "random",
      exchangeCount: hasManualExchangeCount ? "manual" : "random",
      invitedBy: "random",
    },
  };
};

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

export const buildCafeDraft = ({
  participantIds,
  seedTopic,
  exchanges,
  invitedBy,
  selection,
}) => ({
  id: `cafe-draft-${new Date().toISOString().replaceAll(/[:.]/g, "-")}`,
  createdAt: new Date().toISOString(),
  participants: participantIds,
  seedTopic,
  invitedBy,
  exchanges,
  selection,
  status: "unpublished",
});

const generateConversation = async ({
  participantIds,
  seedTopic,
  exchangeCount,
  invitedBy,
  selection,
}) => {
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
    invitedBy,
    selection,
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
  const resolvedInputs = resolveCafeGenerationInputs({
    participantIds: firstPersonaId || secondPersonaId
      ? [firstPersonaId, secondPersonaId]
      : undefined,
    seedTopic,
    exchangeCount: exchangeCountValue,
  });

  console.log(`Café selection: ${JSON.stringify(resolvedInputs)}`);
  generateConversation(resolvedInputs)
    .then((draftPath) => console.log(`Unpublished Café draft written to ${draftPath}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
