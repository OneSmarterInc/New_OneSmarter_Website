import { cafe20260819TheoElenaCookingProgramme } from "./cafe-2026-08-19-theo-elena-cooking-programme.js";
import { cafe20260819SeleneTheoCookingProgramme } from "./cafe-2026-08-19-selene-theo-cooking-programme.js";
import { cafe20260819ElenaRaviDivisiveFilm } from "./cafe-2026-08-19-elena-ravi-divisive-film.js";

export const CAFE_PRESENCE_WINDOW_MS = 48 * 60 * 60 * 1000;

// Publication order remains newest-first for visitor history. Active selection
// deliberately does not depend on this order.
export const publishedCafeConversations = [
  cafe20260819ElenaRaviDivisiveFilm,
  cafe20260819SeleneTheoCookingProgramme,
  cafe20260819TheoElenaCookingProgramme,
];

export const getApprovedCafeConversations = (conversations = publishedCafeConversations) =>
  conversations.filter(
    (conversation) =>
      conversation?.status === "published" &&
      typeof conversation.reviewedBy === "string" &&
      Boolean(conversation.reviewedBy.trim()),
  );

// Buckets start Monday at 00:00 UTC. A stable hash of the YYYY-MM-DD bucket key
// selects from conversations sorted by id, so selection is deterministic within
// the week and does not rely on publication-array position.
export const getCafeWeekBucket = (now = new Date()) => {
  const date = new Date(now);
  if (Number.isNaN(date.getTime())) throw new Error("Café selection requires a valid date.");
  const dayOffsetFromMonday = (date.getUTCDay() + 6) % 7;
  const bucketStart = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - dayOffsetFromMonday,
  ));
  return {
    key: bucketStart.toISOString().slice(0, 10),
    startsAt: bucketStart,
    presenceEndsAt: new Date(bucketStart.getTime() + CAFE_PRESENCE_WINDOW_MS),
  };
};

const stableBucketHash = (value) => {
  let hash = 0;
  for (const character of value) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return hash;
};

export const selectCafeConversation = (
  conversations = publishedCafeConversations,
  now = new Date(),
) => {
  const eligible = getApprovedCafeConversations(conversations)
    .slice()
    .sort((first, second) => first.id.localeCompare(second.id));
  if (!eligible.length) return null;
  const { key } = getCafeWeekBucket(now);
  return eligible[stableBucketHash(key) % eligible.length];
};

export const getEarlierCafeConversations = (
  selectedConversation,
  conversations = publishedCafeConversations,
) => getApprovedCafeConversations(conversations)
  .filter((conversation) => conversation.id !== selectedConversation?.id);

export const isCafeConversationActive = (now = new Date()) => {
  const date = new Date(now);
  const { startsAt, presenceEndsAt } = getCafeWeekBucket(date);
  return date >= startsAt && date < presenceEndsAt;
};

export const getCafePresenceForPersonaId = (
  personaId,
  conversation,
  now = new Date(),
) => conversation &&
  personaId !== "mira-vale" &&
  isCafeConversationActive(now) &&
  conversation.participants.includes(personaId)
  ? "in_cafe"
  : "at_work";

export default publishedCafeConversations;
