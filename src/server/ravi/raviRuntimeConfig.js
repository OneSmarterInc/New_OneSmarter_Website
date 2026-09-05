import process from "node:process";
import { readMiraRuntimeConfig } from "../mira/miraRuntimeConfig.js";

const valueFor = (env, raviName, sharedName) =>
  env[raviName] === undefined ? env[sharedName] : env[raviName];

export const readRaviRuntimeConfig = (env = process.env) =>
  readMiraRuntimeConfig({
    MIRA_LLM_MODE: valueFor(env, "RAVI_LLM_MODE", "MIRA_LLM_MODE"),
    MIRA_LLM_PROVIDER: valueFor(env, "RAVI_LLM_PROVIDER", "MIRA_LLM_PROVIDER"),
    MIRA_LLM_MODEL: valueFor(env, "RAVI_LLM_MODEL", "MIRA_LLM_MODEL"),
    MIRA_LLM_API_KEY: valueFor(env, "RAVI_LLM_API_KEY", "MIRA_LLM_API_KEY"),
    MIRA_LLM_TIMEOUT_MS: valueFor(env, "RAVI_LLM_TIMEOUT_MS", "MIRA_LLM_TIMEOUT_MS"),
    MIRA_LLM_MAX_TOKENS: valueFor(env, "RAVI_LLM_MAX_TOKENS", "MIRA_LLM_MAX_TOKENS"),
    MIRA_LLM_TEMPERATURE: valueFor(env, "RAVI_LLM_TEMPERATURE", "MIRA_LLM_TEMPERATURE"),
    MIRA_LLM_REASONING_EFFORT: valueFor(
      env,
      "RAVI_LLM_REASONING_EFFORT",
      "MIRA_LLM_REASONING_EFFORT",
    ),
    MIRA_LLM_ENABLE_POST_VALIDATION: true,
  });

export default readRaviRuntimeConfig;
