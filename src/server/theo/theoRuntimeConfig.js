import { readMiraRuntimeConfig } from "../mira/miraRuntimeConfig.js";
import process from "node:process";

const valueFor = (env, theoName, sharedName) =>
  env[theoName] === undefined ? env[sharedName] : env[theoName];

export const readTheoRuntimeConfig = (env = process.env) =>
  readMiraRuntimeConfig({
    MIRA_LLM_MODE: valueFor(env, "THEO_LLM_MODE", "MIRA_LLM_MODE"),
    MIRA_LLM_PROVIDER: valueFor(env, "THEO_LLM_PROVIDER", "MIRA_LLM_PROVIDER"),
    MIRA_LLM_MODEL: valueFor(env, "THEO_LLM_MODEL", "MIRA_LLM_MODEL"),
    MIRA_LLM_API_KEY: valueFor(env, "THEO_LLM_API_KEY", "MIRA_LLM_API_KEY"),
    MIRA_LLM_TIMEOUT_MS: valueFor(env, "THEO_LLM_TIMEOUT_MS", "MIRA_LLM_TIMEOUT_MS"),
    MIRA_LLM_MAX_TOKENS: valueFor(env, "THEO_LLM_MAX_TOKENS", "MIRA_LLM_MAX_TOKENS"),
    MIRA_LLM_TEMPERATURE: valueFor(env, "THEO_LLM_TEMPERATURE", "MIRA_LLM_TEMPERATURE"),
    MIRA_LLM_REASONING_EFFORT: valueFor(env, "THEO_LLM_REASONING_EFFORT", "MIRA_LLM_REASONING_EFFORT"),
    MIRA_LLM_ENABLE_POST_VALIDATION: true,
  });

export default readTheoRuntimeConfig;
