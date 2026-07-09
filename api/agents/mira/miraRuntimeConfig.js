import process from "node:process";

const ALLOWED_MODES = new Set(["off", "mock", "staging_llm", "production_llm"]);
const DEFAULT_MODE = "mock";

const readNumber = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
};

const readString = (value, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export const readMiraRuntimeConfig = (env = process.env) => {
  const requestedMode = readString(env.MIRA_LLM_MODE, DEFAULT_MODE).toLowerCase();
  const mode = ALLOWED_MODES.has(requestedMode) ? requestedMode : DEFAULT_MODE;
  const provider = readString(env.MIRA_LLM_PROVIDER, "");
  const model = readString(env.MIRA_LLM_MODEL, "");
  const apiKeyConfigured = Boolean(readString(env.MIRA_LLM_API_KEY, ""));

  return {
    mode,
    requestedMode,
    modeWasValid: mode === requestedMode,
    provider,
    model,
    apiKeyConfigured,
    providerConfigComplete: Boolean(provider && model && apiKeyConfigured),
    timeoutMs: readNumber(env.MIRA_LLM_TIMEOUT_MS, 8000),
    maxTokens: readNumber(env.MIRA_LLM_MAX_TOKENS, 600),
    temperature: readNumber(env.MIRA_LLM_TEMPERATURE, 0.2),
    postValidationEnabled: readBoolean(env.MIRA_LLM_ENABLE_POST_VALIDATION, true),
  };
};

export default readMiraRuntimeConfig;
