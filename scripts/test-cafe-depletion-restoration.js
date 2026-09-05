import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildCafeRestorationId,
  getCurrentCafeRestorationEvent,
  restoreCurrentCafeParticipants,
} from "../src/server/agentState/cafeRestorationRuntime.js";
import { createAgentStateMemoryStore } from "../src/server/agentState/agentStateMemoryStore.js";
import {
  getCafePresenceForPersonaId,
  selectCafeConversation,
} from "../src/data/cafeConversations/index.js";

const duringFirstWindow = new Date("2026-09-07T12:00:00.000Z");
const duringLaterWindow = new Date("2026-09-14T12:00:00.000Z");
const selected = selectCafeConversation(undefined, duringFirstWindow);
const event = getCurrentCafeRestorationEvent({ now: duringFirstWindow });

assert.ok(event);
assert.equal(event.conversationId, selected.id);
assert.ok(event.participantIds.length > 0);
assert.ok(!event.participantIds.includes("mira-vale"));
assert.deepEqual(event.participantIds, [...new Set(selected.participants)]);

for (const agentId of ["theo-mercer", "elena-cross"]) {
  const matchingConversation = {
    id: `approved-${agentId}`,
    status: "published",
    reviewedBy: "test reviewer",
    participants: [agentId, "selene-hart"],
  };
  const store = createAgentStateMemoryStore({ initialEnergyUnits: 60 });
  const first = await restoreCurrentCafeParticipants({
    now: duringFirstWindow,
    conversations: [matchingConversation],
    stateStore: store,
  });
  const duplicate = await restoreCurrentCafeParticipants({
    now: duringFirstWindow,
    conversations: [matchingConversation],
    stateStore: store,
  });
  assert.equal(first.applied, 2);
  assert.equal(duplicate.applied, 0);
  assert.equal((await store.readAgentState(agentId, duringFirstWindow.getTime())).energyUnits, 80);
}

const participantStore = createAgentStateMemoryStore({ initialEnergyUnits: 60 });
await restoreCurrentCafeParticipants({ now: duringFirstWindow, stateStore: participantStore });
const nonParticipant = ["theo-mercer", "elena-cross", "ravi-sen", "selene-hart"]
  .find((agentId) => !event.participantIds.includes(agentId));
assert.equal(
  (await participantStore.readAgentState(nonParticipant, duringFirstWindow.getTime())).energyUnits,
  60,
);
assert.equal(
  (await participantStore.readAgentState("mira-vale", duringFirstWindow.getTime())).energyUnits,
  60,
);

const capStore = createAgentStateMemoryStore({ initialEnergyUnits: 95 });
await restoreCurrentCafeParticipants({ now: duringFirstWindow, stateStore: capStore });
for (const agentId of event.participantIds) {
  assert.equal((await capStore.readAgentState(agentId, duringFirstWindow.getTime())).energyUnits, 100);
}

const stableId = buildCafeRestorationId({
  bucketKey: event.bucketKey,
  conversationId: event.conversationId,
  agentId: event.participantIds[0],
});
assert.equal(
  stableId,
  buildCafeRestorationId({
    bucketKey: event.bucketKey,
    conversationId: event.conversationId,
    agentId: event.participantIds[0],
  }),
);

const changingStore = createAgentStateMemoryStore({ initialEnergyUnits: 40 });
const firstEvent = await restoreCurrentCafeParticipants({
  now: duringFirstWindow,
  stateStore: changingStore,
});
const laterEvent = await restoreCurrentCafeParticipants({
  now: duringLaterWindow,
  stateStore: changingStore,
});
assert.ok(firstEvent.applied > 0);
assert.ok(laterEvent.applied > 0);

const trackingCalls = [];
const trackingStore = {
  async applyRestoration(agentId, restorationId, operation) {
    trackingCalls.push({ agentId, restorationId, operation });
    return { applied: true };
  },
};
await restoreCurrentCafeParticipants({ now: duringFirstWindow, stateStore: trackingStore });
for (const call of trackingCalls) {
  assert.deepEqual(Object.keys(call).sort(), ["agentId", "operation", "restorationId"]);
  assert.deepEqual(Object.keys(call.operation).sort(), [
    "maxEnergyUnits",
    "minEnergyUnits",
    "restoreUnits",
  ]);
}
assert.doesNotMatch(
  JSON.stringify(trackingCalls),
  /seedTopic|exchanges|reviewedBy|invitedBy|offDutyDisposition|background|visitor/i,
);
assert.ok(!JSON.stringify(trackingCalls).includes(selected.exchanges?.[0]?.text || "__absent__"));

const failureResult = await restoreCurrentCafeParticipants({
  now: duringFirstWindow,
  stateStore: { async applyRestoration() { throw new Error("shared unavailable"); } },
});
assert.equal(failureResult.active, true);
assert.equal(failureResult.applied, 0);

for (const agentId of event.participantIds) {
  assert.equal(getCafePresenceForPersonaId(agentId, selected, duringFirstWindow), "in_cafe");
}
assert.equal(getCafePresenceForPersonaId("mira-vale", selected, duringFirstWindow), "at_work");

const pageSource = fs.readFileSync(new URL("../src/components/AiAgentsPage.jsx", import.meta.url), "utf8");
assert.match(pageSource, /fetch\("\/api\/agents\/cafe\/restoration"/);
assert.match(pageSource, /requestedCafeRestorationEvents\.has\(requestKey\)/);
assert.match(pageSource, /requestedCafeRestorationEvents\.add\(requestKey\)/);

console.log("Café depletion restoration tests passed.");
console.log("Validated approved participation, Mira exclusion, stable event IDs, idempotency, caps, failure safety, data minimization, and unchanged presence behavior.");
