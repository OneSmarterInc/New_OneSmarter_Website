import {
  AGENT_STATE_DEFAULT_ENERGY_UNITS,
  AGENT_STATE_DEFAULT_TTL_SECONDS,
  AGENT_STATE_SCHEMA_VERSION,
} from "./agentStateConfig.js";

export const AGENT_STATE_KEY_PREFIX = "onesmarter:agent-state:v1:";

const READ_SCRIPT = `-- agent-state:read
local version = redis.call('HGET', KEYS[1], 'schemaVersion')
if not version or tonumber(version) ~= tonumber(ARGV[1]) then
  redis.call('DEL', KEYS[1])
  redis.call('HSET', KEYS[1], 'schemaVersion', ARGV[1], 'energyUnits', ARGV[2], 'updatedAtMs', ARGV[3])
  redis.call('PEXPIRE', KEYS[1], ARGV[4])
end
return {redis.call('HGET', KEYS[1], 'schemaVersion'), redis.call('HGET', KEYS[1], 'energyUnits'), redis.call('HGET', KEYS[1], 'updatedAtMs'), redis.call('HGET', KEYS[1], 'lastWorkAtMs') or '', redis.call('HGET', KEYS[1], 'lastCafeRestorationId') or ''}`;

const WORK_SCRIPT = `-- agent-state:work
local version = redis.call('HGET', KEYS[1], 'schemaVersion')
if not version or tonumber(version) ~= tonumber(ARGV[1]) then
  redis.call('DEL', KEYS[1])
  redis.call('HSET', KEYS[1], 'schemaVersion', ARGV[1], 'energyUnits', ARGV[2], 'updatedAtMs', ARGV[3])
end
local energy = tonumber(redis.call('HGET', KEYS[1], 'energyUnits')) or tonumber(ARGV[2])
energy = math.max(tonumber(ARGV[5]), math.min(tonumber(ARGV[6]), energy - tonumber(ARGV[4])))
redis.call('HSET', KEYS[1], 'energyUnits', energy, 'updatedAtMs', ARGV[3], 'lastWorkAtMs', ARGV[3])
redis.call('PEXPIRE', KEYS[1], ARGV[7])
return {ARGV[1], energy, ARGV[3], ARGV[3], redis.call('HGET', KEYS[1], 'lastCafeRestorationId') or '', 1}`;

const RESTORE_SCRIPT = `-- agent-state:restore
local version = redis.call('HGET', KEYS[1], 'schemaVersion')
if not version or tonumber(version) ~= tonumber(ARGV[1]) then
  redis.call('DEL', KEYS[1])
  redis.call('HSET', KEYS[1], 'schemaVersion', ARGV[1], 'energyUnits', ARGV[2], 'updatedAtMs', ARGV[3])
end
local previous = redis.call('HGET', KEYS[1], 'lastCafeRestorationId')
if previous == ARGV[4] then
  return {ARGV[1], redis.call('HGET', KEYS[1], 'energyUnits'), redis.call('HGET', KEYS[1], 'updatedAtMs'), redis.call('HGET', KEYS[1], 'lastWorkAtMs') or '', previous, 0}
end
local energy = math.max(tonumber(ARGV[6]), math.min(tonumber(ARGV[7]), tonumber(ARGV[5])))
redis.call('HSET', KEYS[1], 'energyUnits', energy, 'updatedAtMs', ARGV[3], 'lastCafeRestorationId', ARGV[4])
redis.call('PEXPIRE', KEYS[1], ARGV[8])
return {ARGV[1], energy, ARGV[3], redis.call('HGET', KEYS[1], 'lastWorkAtMs') or '', ARGV[4], 1}`;

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

const safeBounds = (operation, initialEnergyUnits) => {
  const min = integer(operation.minEnergyUnits ?? 0, "min_energy_units");
  const max = integer(operation.maxEnergyUnits ?? initialEnergyUnits, "max_energy_units");
  if (min > max) throw new Error("invalid_energy_bounds");
  return { min, max };
};

const stateFromResult = (result) => {
  if (!Array.isArray(result) || result.length < 5) {
    throw new Error("shared_agent_state_invalid_response");
  }
  const state = {
    schemaVersion: Number(result[0]),
    energyUnits: Number(result[1]),
    updatedAtMs: Number(result[2]),
    ...(String(result[3] || "") ? { lastWorkAtMs: Number(result[3]) } : {}),
    ...(String(result[4] || "") ? { lastCafeRestorationId: String(result[4]) } : {}),
  };
  if (!Number.isInteger(state.schemaVersion) || !Number.isInteger(state.energyUnits)
    || !Number.isInteger(state.updatedAtMs) ||
    (state.lastWorkAtMs !== undefined && !Number.isInteger(state.lastWorkAtMs))) {
    throw new Error("shared_agent_state_invalid_response");
  }
  return state;
};

export const createAgentStateSharedRestStore = ({
  url,
  token,
  fetchImpl = globalThis.fetch,
  initialEnergyUnits = AGENT_STATE_DEFAULT_ENERGY_UNITS,
  ttlSeconds = AGENT_STATE_DEFAULT_TTL_SECONDS,
} = {}) => {
  integer(initialEnergyUnits, "initial_energy_units");
  if (initialEnergyUnits < 0) throw new Error("invalid_initial_energy_units");
  const validTtlSeconds = integer(ttlSeconds, "ttl_seconds");
  if (validTtlSeconds <= 0) throw new Error("invalid_ttl_seconds");
  const ttlMs = validTtlSeconds * 1000;

  const execute = async (script, agentId, args) => {
    if (!url || !token || typeof fetchImpl !== "function") {
      throw new Error("shared_agent_state_store_unavailable");
    }
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        script,
        "1",
        `${AGENT_STATE_KEY_PREFIX}${assertAgentId(agentId)}`,
        ...args.map(String),
      ]),
    });
    if (!response.ok) throw new Error("shared_agent_state_store_failed");
    const payload = await response.json();
    return payload?.result;
  };

  return {
    kind: "shared_rest",
    async readAgentState(agentId, nowMs = Date.now()) {
      const result = await execute(READ_SCRIPT, agentId, [
        AGENT_STATE_SCHEMA_VERSION,
        initialEnergyUnits,
        integer(nowMs, "now_ms"),
        ttlMs,
      ]);
      return stateFromResult(result);
    },
    async applyWork(agentId, operation = {}, nowMs = Date.now()) {
      const cost = integer(operation.costUnits, "cost_units");
      if (cost < 0) throw new Error("invalid_cost_units");
      const { min, max } = safeBounds(operation, initialEnergyUnits);
      const result = await execute(WORK_SCRIPT, agentId, [
        AGENT_STATE_SCHEMA_VERSION,
        initialEnergyUnits,
        integer(nowMs, "now_ms"),
        cost,
        min,
        max,
        ttlMs,
      ]);
      return { applied: Number(result?.[5]) === 1, state: stateFromResult(result) };
    },
    async applyRestoration(agentId, restorationId, operation = {}, nowMs = Date.now()) {
      const safeRestorationId = String(restorationId || "").trim();
      if (!safeRestorationId || safeRestorationId.length > 120) {
        throw new Error("invalid_restoration_id");
      }
      const restoreTo = integer(operation.restoreToEnergyUnits, "restore_to_energy_units");
      const { min, max } = safeBounds(operation, initialEnergyUnits);
      const result = await execute(RESTORE_SCRIPT, agentId, [
        AGENT_STATE_SCHEMA_VERSION,
        initialEnergyUnits,
        integer(nowMs, "now_ms"),
        safeRestorationId,
        restoreTo,
        min,
        max,
        ttlMs,
      ]);
      return { applied: Number(result?.[5]) === 1, state: stateFromResult(result) };
    },
    getDiagnostics() {
      return {
        backend: "shared_rest",
        durable: true,
        degradedFallbackUsed: false,
        schemaVersion: AGENT_STATE_SCHEMA_VERSION,
        operationCode: "ready",
      };
    },
  };
};

export const agentStateSharedScriptsForTests = {
  read: READ_SCRIPT,
  work: WORK_SCRIPT,
  restore: RESTORE_SCRIPT,
};

export default createAgentStateSharedRestStore;
