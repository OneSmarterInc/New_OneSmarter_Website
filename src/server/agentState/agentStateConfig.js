import process from "node:process";

export const AGENT_STATE_SCHEMA_VERSION = 1;
export const AGENT_STATE_DEFAULT_ENERGY_UNITS = 100;
export const AGENT_STATE_DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

const normalizeUrl = (value = "") => String(value).trim().replace(/\/+$/, "");
const readPositiveInteger = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const readAgentStateConfig = (env = process.env) => {
  const requestedBackend = String(env.AGENT_STATE_BACKEND || "auto").trim().toLowerCase();
  const backendWasValid = ["auto", "memory", "shared_rest"].includes(requestedBackend);
  const requestedUrl = normalizeUrl(env.AGENT_STATE_REST_URL);
  const requestedToken = String(env.AGENT_STATE_REST_TOKEN || "").trim();
  const fallbackUrl = normalizeUrl(env.MIRA_RATE_LIMIT_REST_URL);
  const fallbackToken = String(env.MIRA_RATE_LIMIT_REST_TOKEN || "").trim();
  const agentSpecificStoreConfigured = Boolean(requestedUrl || requestedToken);
  const url = agentSpecificStoreConfigured ? requestedUrl : fallbackUrl;
  const token = agentSpecificStoreConfigured ? requestedToken : fallbackToken;
  const sharedStoreConfigured = Boolean(
    requestedUrl || requestedToken || fallbackUrl || fallbackToken,
  );
  const sharedStoreConfigComplete = Boolean(url && token);
  const backend = requestedBackend === "memory"
    ? "memory"
    : requestedBackend === "shared_rest"
      ? (sharedStoreConfigComplete ? "shared_rest" : "memory")
      : sharedStoreConfigComplete ? "shared_rest" : "memory";
  const ttlSeconds = readPositiveInteger(
    env.AGENT_STATE_TTL_SECONDS,
    AGENT_STATE_DEFAULT_TTL_SECONDS,
  );

  const config = {
    backend,
    requestedBackend,
    backendWasValid,
    sharedStoreConfigured,
    sharedStoreConfigComplete,
    ttlSeconds,
    schemaVersion: AGENT_STATE_SCHEMA_VERSION,
  };
  Object.defineProperties(config, {
    url: { value: url, enumerable: false },
    token: { value: token, enumerable: false },
  });
  return config;
};

export default readAgentStateConfig;
