import {
  getCafeWeekBucket,
  isCafeConversationActive,
  publishedCafeConversations,
  selectCafeConversation,
} from "../../data/cafeConversations/index.js";
import {
  restoreAgentForCafeEvent,
  sharedAgentStateStore,
} from "./agentDepletionRuntime.js";

const MIRA_AGENT_ID = "mira-vale";

export const buildCafeRestorationId = ({ bucketKey, conversationId, agentId }) =>
  `cafe:${bucketKey}:${conversationId}:${agentId}`;

export const getCurrentCafeRestorationEvent = ({
  now = new Date(),
  conversations = publishedCafeConversations,
} = {}) => {
  const date = new Date(now);
  if (!isCafeConversationActive(date)) return null;

  const conversation = selectCafeConversation(conversations, date);
  if (!conversation) return null;

  const { key: bucketKey } = getCafeWeekBucket(date);
  const participantIds = [...new Set(conversation.participants)]
    .filter((agentId) => agentId !== MIRA_AGENT_ID);

  return {
    bucketKey,
    conversationId: conversation.id,
    participantIds,
  };
};

export const restoreCurrentCafeParticipants = async ({
  now = new Date(),
  conversations = publishedCafeConversations,
  stateStore = sharedAgentStateStore,
} = {}) => {
  const event = getCurrentCafeRestorationEvent({ now, conversations });
  if (!event) return { active: false, attempted: 0, applied: 0 };

  const results = await Promise.all(event.participantIds.map(async (agentId) => {
    const restorationId = buildCafeRestorationId({
      bucketKey: event.bucketKey,
      conversationId: event.conversationId,
      agentId,
    });
    const result = await restoreAgentForCafeEvent({
      agentId,
      restorationId,
      stateStore,
      nowMs: new Date(now).getTime(),
    });
    return { agentId, restorationId, applied: result?.applied === true };
  }));

  return {
    active: true,
    attempted: results.length,
    applied: results.filter(({ applied }) => applied).length,
  };
};

export default restoreCurrentCafeParticipants;
