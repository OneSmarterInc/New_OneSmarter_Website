import { readAgentStateConfig } from "./agentStateConfig.js";
import { createAgentStateMemoryStore } from "./agentStateMemoryStore.js";
import { createAgentStateSharedRestStore } from "./agentStateSharedRestStore.js";

export const createAgentStateStore = ({
  env,
  fetchImpl = globalThis.fetch,
  config = readAgentStateConfig(env),
  memoryStore,
  sharedStore,
  initialEnergyUnits,
} = {}) => {
  const fallbackStore = memoryStore || createAgentStateMemoryStore({
    initialEnergyUnits,
    ttlSeconds: config.ttlSeconds,
    degraded: config.backend === "shared_rest" ||
      (config.sharedStoreConfigured && !config.sharedStoreConfigComplete),
  });
  const durableStore = config.backend === "shared_rest"
    ? sharedStore || createAgentStateSharedRestStore({
      url: config.url,
      token: config.token,
      fetchImpl,
      initialEnergyUnits,
      ttlSeconds: config.ttlSeconds,
    })
    : null;
  let degradedFallbackUsed = Boolean(
    config.sharedStoreConfigured && !config.sharedStoreConfigComplete,
  );
  let activeBackend = config.backend;
  let operationCode = degradedFallbackUsed ? "shared_config_incomplete" : "ready";

  const run = async (method, args) => {
    if (!durableStore) {
      const result = await fallbackStore[method](...args);
      activeBackend = "memory";
      operationCode = degradedFallbackUsed ? "degraded_memory" : "memory_ok";
      return result;
    }
    try {
      const result = await durableStore[method](...args);
      activeBackend = "shared_rest";
      operationCode = "shared_ok";
      return result;
    } catch {
      degradedFallbackUsed = true;
      activeBackend = "memory";
      operationCode = "shared_failed_memory_used";
      return fallbackStore[method](...args);
    }
  };

  return {
    kind: config.backend,
    readAgentState(agentId, nowMs) {
      return run("readAgentState", [agentId, nowMs]);
    },
    applyWork(agentId, operation, nowMs) {
      return run("applyWork", [agentId, operation, nowMs]);
    },
    applyRestoration(agentId, restorationId, operation, nowMs) {
      return run("applyRestoration", [agentId, restorationId, operation, nowMs]);
    },
    getDiagnostics() {
      return {
        backend: config.backend,
        activeBackend,
        sharedStoreConfigured: config.sharedStoreConfigured,
        sharedStoreConfigComplete: config.sharedStoreConfigComplete,
        degradedFallbackUsed,
        schemaVersion: config.schemaVersion,
        operationCode,
      };
    },
  };
};

export default createAgentStateStore;
