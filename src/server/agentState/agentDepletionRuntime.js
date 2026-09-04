import { createAgentStateStore } from "./agentStateStore.js";
import {
  AGENT_MAX_ENERGY,
  AGENT_CAFE_RESTORATION_UNITS,
  AGENT_MIN_USEFUL_ENERGY,
  getAgentVerbosityBand,
  getAgentWorkOperation,
  getRecoveredEnergyUnits,
} from "./agentDepletionPolicy.js";

export const sharedAgentStateStore = createAgentStateStore({
  initialEnergyUnits: AGENT_MAX_ENERGY,
});

export const readAgentDepletionContext = async ({
  agentId,
  stateStore = sharedAgentStateStore,
  nowMs = Date.now(),
} = {}) => {
  try {
    const state = await stateStore.readAgentState(agentId, nowMs);
    const energyUnits = getRecoveredEnergyUnits(state, nowMs);
    return { energyUnits, verbosityBand: getAgentVerbosityBand(energyUnits) };
  } catch {
    return {
      energyUnits: AGENT_MAX_ENERGY,
      verbosityBand: getAgentVerbosityBand(AGENT_MAX_ENERGY),
    };
  }
};

export const chargeSuccessfulAgentWork = async ({
  agentId,
  stateStore = sharedAgentStateStore,
  nowMs = Date.now(),
} = {}) => {
  try {
    return await stateStore.applyWork(agentId, getAgentWorkOperation(agentId), nowMs);
  } catch {
    return null;
  }
};

// Intentionally not wired to Café selection yet. A future integration may call
// this with a reviewed, deterministic Café event ID; no Café text is persisted.
export const restoreAgentForCafeEvent = async ({
  agentId,
  restorationId,
  stateStore = sharedAgentStateStore,
  nowMs = Date.now(),
} = {}) => {
  try {
    return await stateStore.applyRestoration(
      agentId,
      restorationId,
      {
        restoreUnits: AGENT_CAFE_RESTORATION_UNITS,
        minEnergyUnits: AGENT_MIN_USEFUL_ENERGY,
        maxEnergyUnits: AGENT_MAX_ENERGY,
      },
      nowMs,
    );
  } catch {
    return null;
  }
};
