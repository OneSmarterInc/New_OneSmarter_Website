import process from "node:process";
import { readMiraRuntimeConfig } from "../mira/miraRuntimeConfig.js";

const valueFor = (env, elenaName, sharedName) =>
  env[elenaName] === undefined ? env[sharedName] : env[elenaName];

export const readElenaRuntimeConfig = (env = process.env) =>
  readMiraRuntimeConfig({
    MIRA_LLM_MODE: valueFor(env, "ELENA_LLM_MODE", "MIRA_LLM_MODE"),
    MIRA_LLM_PROVIDER: valueFor(env, "ELENA_LLM_PROVIDER", "MIRA_LLM_PROVIDER"),
    MIRA_LLM_MODEL: valueFor(env, "ELENA_LLM_MODEL", "MIRA_LLM_MODEL"),
    MIRA_LLM_API_KEY: valueFor(env, "ELENA_LLM_API_KEY", "MIRA_LLM_API_KEY"),
    MIRA_LLM_TIMEOUT_MS: valueFor(env, "ELENA_LLM_TIMEOUT_MS", "MIRA_LLM_TIMEOUT_MS"),
    MIRA_LLM_MAX_TOKENS: valueFor(env, "ELENA_LLM_MAX_TOKENS", "MIRA_LLM_MAX_TOKENS"),
    MIRA_LLM_TEMPERATURE: valueFor(env, "ELENA_LLM_TEMPERATURE", "MIRA_LLM_TEMPERATURE"),
    MIRA_LLM_REASONING_EFFORT: valueFor(
      env,
      "ELENA_LLM_REASONING_EFFORT",
      "MIRA_LLM_REASONING_EFFORT",
    ),
    MIRA_LLM_ENABLE_POST_VALIDATION: true,
  });

export default readElenaRuntimeConfig;
