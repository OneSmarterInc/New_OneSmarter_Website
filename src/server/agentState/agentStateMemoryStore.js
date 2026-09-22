import {
  AGENT_STATE_DEFAULT_ENERGY_UNITS,
  AGENT_STATE_DEFAULT_TTL_SECONDS,
  AGENT_STATE_SCHEMA_VERSION,
} from "./agentStateConfig.js";

const assertAgentId = (agentId) => {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(String(agentId || ""))) {
    throw new Error("invalid_agent_id");
  }
  return String(agentId);
};

const integer = (value, name) => {
  if (!Number.isInteger(value)) throw new Error(`invalid_${name}`);
  return value;
};

const boundsFor = (operation = {}, initialEnergyUnits) => {
  const minEnergyUnits = integer(operation.minEnergyUnits ?? 0, "min_energy_units");
  const maxEnergyUnits = integer(
    operation.maxEnergyUnits ?? initialEnergyUnits,
    "max_energy_units",
  );
  if (minEnergyUnits > maxEnergyUnits) throw new Error("invalid_energy_bounds");
  return { minEnergyUnits, maxEnergyUnits };
};

const publicState = (record) => ({
  schemaVersion: record.schemaVersion,
  energyUnits: record.energyUnits,
  updatedAtMs: record.updatedAtMs,
  ...(record.lastWorkAtMs === undefined ? {} : { lastWorkAtMs: record.lastWorkAtMs }),
  ...(record.lastCafeRestorationId
    ? { lastCafeRestorationId: record.lastCafeRestorationId }
    : {}),
});

export const createAgentStateMemoryStore = ({
  records = new Map(),
  initialEnergyUnits = AGENT_STATE_DEFAULT_ENERGY_UNITS,
  ttlSeconds = AGENT_STATE_DEFAULT_TTL_SECONDS,
  degraded = false,
} = {}) => {
  integer(initialEnergyUnits, "initial_energy_units");
  if (initialEnergyUnits < 0) throw new Error("invalid_initial_energy_units");
  const validTtlSeconds = integer(ttlSeconds, "ttl_seconds");
  if (validTtlSeconds <= 0) throw new Error("invalid_ttl_seconds");
  const ttlMs = validTtlSeconds * 1000;

  const initialize = (agentId, nowMs) => {
    const id = assertAgentId(agentId);
    const existing = records.get(id);
    if (
      existing &&
      existing.schemaVersion === AGENT_STATE_SCHEMA_VERSION &&
      nowMs < existing.expiresAtMs
    ) return existing;
    const state = {
      schemaVersion: AGENT_STATE_SCHEMA_VERSION,
      energyUnits: initialEnergyUnits,
      updatedAtMs: nowMs,
      expiresAtMs: nowMs + ttlMs,
    };
    records.set(id, state);
    return state;
  };

  return {
    kind: "memory",
    async readAgentState(agentId, nowMs = Date.now()) {
      return publicState(initialize(agentId, integer(nowMs, "now_ms")));
    },
    async applyWork(agentId, operation = {}, nowMs = Date.now()) {
      const timestamp = integer(nowMs, "now_ms");
      const costUnits = integer(operation.costUnits, "cost_units");
      if (costUnits < 0) throw new Error("invalid_cost_units");
      const recoveryUnitsPerHour = integer(
        operation.recoveryUnitsPerHour ?? 0,
        "recovery_units_per_hour",
      );
      if (recoveryUnitsPerHour < 0) throw new Error("invalid_recovery_units_per_hour");
      const { minEnergyUnits, maxEnergyUnits } = boundsFor(operation, initialEnergyUnits);
      const state = initialize(agentId, timestamp);
      const elapsedHours = Math.max(0, Math.floor((timestamp - state.updatedAtMs) / 3_600_000));
      const recoveredEnergy = Math.min(
        maxEnergyUnits,
        state.energyUnits + elapsedHours * recoveryUnitsPerHour,
      );
      state.energyUnits = Math.max(
        minEnergyUnits,
        recoveredEnergy - costUnits,
      );
      state.updatedAtMs = timestamp;
      state.lastWorkAtMs = timestamp;
      state.expiresAtMs = timestamp + ttlMs;
      return { applied: true, state: publicState(state) };
    },
    async applyRestoration(agentId, restorationId, operation = {}, nowMs = Date.now()) {
      const timestamp = integer(nowMs, "now_ms");
      const safeRestorationId = String(restorationId || "").trim();
      if (!safeRestorationId || safeRestorationId.length > 120) {
        throw new Error("invalid_restoration_id");
      }
      const { minEnergyUnits, maxEnergyUnits } = boundsFor(operation, initialEnergyUnits);
      const state = initialize(agentId, timestamp);
      if (state.lastCafeRestorationId === safeRestorationId) {
        return { applied: false, state: publicState(state) };
      }
      const restoredEnergy = operation.restoreUnits === undefined
        ? integer(operation.restoreToEnergyUnits, "restore_to_energy_units")
        : state.energyUnits + integer(operation.restoreUnits, "restore_units");
      if (operation.restoreUnits !== undefined && operation.restoreUnits < 0) {
        throw new Error("invalid_restore_units");
      }
      state.energyUnits = Math.max(
        minEnergyUnits,
        Math.min(maxEnergyUnits, restoredEnergy),
      );
      state.updatedAtMs = timestamp;
      state.lastCafeRestorationId = safeRestorationId;
      state.expiresAtMs = timestamp + ttlMs;
      return { applied: true, state: publicState(state) };
    },
    getDiagnostics() {
      return {
        backend: "memory",
        durable: false,
        degradedFallbackUsed: Boolean(degraded),
        schemaVersion: AGENT_STATE_SCHEMA_VERSION,
        operationCode: "ready",
      };
    },
    reset() {
      records.clear();
    },
  };
};

export default createAgentStateMemoryStore;
