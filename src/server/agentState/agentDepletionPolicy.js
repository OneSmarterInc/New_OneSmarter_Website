// Provisional, conservative values approved for the first depletion iteration.
// Keep every tunable here so runtime and persistence integration remain policy-free.
export const AGENT_MAX_ENERGY = 100;
export const AGENT_MIN_USEFUL_ENERGY = 40;
export const AGENT_CONCISE_BAND_MAX = 69;
export const AGENT_PASSIVE_RECOVERY_UNITS_PER_HOUR = 2;
export const AGENT_CAFE_RESTORATION_UNITS = 20;

export const AGENT_WORK_COSTS = Object.freeze({
  "mira-vale": 5,
  "theo-mercer": 8,
  "elena-cross": 6,
  // Ravi's bounded operational explanations are comparable to Elena's reader workload.
  "ravi-sen": 6,
});

export const AGENT_VERBOSITY_BANDS = Object.freeze({
  NORMAL: "normal",
  CONCISE: "concise",
});

export const getAgentVerbosityBand = (energyUnits) =>
  energyUnits >= AGENT_CONCISE_BAND_MAX + 1
    ? AGENT_VERBOSITY_BANDS.NORMAL
    : AGENT_VERBOSITY_BANDS.CONCISE;

export const getRecoveredEnergyUnits = (state, nowMs) => {
  const elapsedHours = Math.max(0, Math.floor((nowMs - state.updatedAtMs) / 3_600_000));
  return Math.min(
    AGENT_MAX_ENERGY,
    Math.max(
      AGENT_MIN_USEFUL_ENERGY,
      state.energyUnits + elapsedHours * AGENT_PASSIVE_RECOVERY_UNITS_PER_HOUR,
    ),
  );
};

export const getAgentWorkOperation = (agentId) => ({
  costUnits: AGENT_WORK_COSTS[agentId],
  recoveryUnitsPerHour: AGENT_PASSIVE_RECOVERY_UNITS_PER_HOUR,
  minEnergyUnits: AGENT_MIN_USEFUL_ENERGY,
  maxEnergyUnits: AGENT_MAX_ENERGY,
});

export const getConciseResponseGuidance = (band) =>
  band === AGENT_VERBOSITY_BANDS.CONCISE
    ? "Use concise wording and remove optional elaboration only. Preserve every fact, safety statement, qualification, finding, evidence item, recommendation, refusal, and handoff required for correctness."
    : "";
