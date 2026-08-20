import { cafe20260819TheoElenaCookingProgramme } from "./cafe-2026-08-19-theo-elena-cooking-programme.js";
import { cafe20260819SeleneTheoCookingProgramme } from "./cafe-2026-08-19-selene-theo-cooking-programme.js";
import { cafe20260819ElenaRaviDivisiveFilm } from "./cafe-2026-08-19-elena-ravi-divisive-film.js";

// Newest-first publication order is authoritative when conversations share a date.
export const publishedCafeConversations = [
  cafe20260819ElenaRaviDivisiveFilm,
  cafe20260819SeleneTheoCookingProgramme,
  cafe20260819TheoElenaCookingProgramme,
];

export const currentCafeConversation = publishedCafeConversations[0];
export const earlierPublishedCafeConversations = publishedCafeConversations.slice(1);

export const getCafePresenceForPersonaId = (
  personaId,
  conversation = currentCafeConversation,
) => conversation?.participants.includes(personaId) ? "in_cafe" : "at_work";

export default publishedCafeConversations;
