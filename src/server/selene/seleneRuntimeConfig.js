import process from "node:process";
import { readMiraRuntimeConfig } from "../mira/miraRuntimeConfig.js";

const valueFor = (env, seleneName, sharedName) =>
  env[seleneName] === undefined ? env[sharedName] : env[seleneName];

export const readSeleneRuntimeConfig = (env = process.env) =>
  readMiraRuntimeConfig({
    MIRA_LLM_MODE: valueFor(env, "SELENE_LLM_MODE", "MIRA_LLM_MODE"),
    MIRA_LLM_PROVIDER: valueFor(env, "SELENE_LLM_PROVIDER", "MIRA_LLM_PROVIDER"),
    MIRA_LLM_MODEL: valueFor(env, "SELENE_LLM_MODEL", "MIRA_LLM_MODEL"),
    MIRA_LLM_API_KEY: valueFor(env, "SELENE_LLM_API_KEY", "MIRA_LLM_API_KEY"),
    MIRA_LLM_TIMEOUT_MS: valueFor(env, "SELENE_LLM_TIMEOUT_MS", "MIRA_LLM_TIMEOUT_MS"),
    MIRA_LLM_MAX_TOKENS: valueFor(env, "SELENE_LLM_MAX_TOKENS", "MIRA_LLM_MAX_TOKENS"),
    MIRA_LLM_TEMPERATURE: valueFor(env, "SELENE_LLM_TEMPERATURE", "MIRA_LLM_TEMPERATURE"),
    MIRA_LLM_REASONING_EFFORT: valueFor(env, "SELENE_LLM_REASONING_EFFORT", "MIRA_LLM_REASONING_EFFORT"),
    MIRA_LLM_ENABLE_POST_VALIDATION: true,
  });

export default readSeleneRuntimeConfig;
