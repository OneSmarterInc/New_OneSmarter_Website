# Mira Environment Isolation Evidence

Date: 2026-07-19
Branch: `v2/agent-showcase`

This document records the environment-isolation evidence package for Mira staging review. Do not paste API keys, Vercel bypass secrets, or raw environment-variable values into this file.

## Checklist

| Evidence item | Status | Evidence / placeholder |
|---|---|---|
| Preview branch uses `MIRA_LLM_MODE=staging_llm` only for staging review. | To verify in Vercel UI | Screenshot placeholder: Vercel Preview environment variable list with values hidden. |
| Preview branch has `MIRA_LLM_PROVIDER=openai`. | To verify in Vercel UI | Screenshot placeholder: provider name visible; secret values hidden. |
| Preview branch has `MIRA_LLM_MODEL` configured. | To verify in Vercel UI | Screenshot placeholder: model key visible; value may be shown only if non-secret. |
| Preview branch has `MIRA_LLM_API_KEY` configured server-side only. | To verify in Vercel UI | Screenshot placeholder: secret value masked. |
| Preview branch has `MIRA_LLM_REASONING_EFFORT=minimal` recommended for GPT-5-family staging models. | To verify in Vercel UI | Screenshot placeholder: non-secret value visible if desired. |
| Preview branch has `MIRA_LLM_MAX_TOKENS=1000` recommended for GPT-5-family staging models. | To verify in Vercel UI | Screenshot placeholder: non-secret value visible if desired. |
| Production does not have `MIRA_LLM_API_KEY` configured. | Required before production | Screenshot placeholder: Production environment variable list with key absent or disabled. |
| Production does not have `MIRA_LLM_MODE=production_llm` enabled. | Required before production | Screenshot placeholder: Production environment variable list with mode absent, `mock`, or `off`. |
| Missing or invalid mode fails closed to mock/off behavior. | Verified by automated tests | `test:mira-api` covers missing env, invalid mode, mock mode, off mode, and production mode. |
| `production_llm` remains non-provider/mock-only in code. | Verified by automated tests | `test:mira-api` covers `mode-production-llm-falls-back-to-mock` and `mode-production-openai-remains-mock`. |
| Emergency rollback is `MIRA_LLM_MODE=mock`. | Documented | Provider config plan and production abuse controls include rollback. |

## Code-Level Isolation

- `MIRA_LLM_API_KEY` is read in `api/agents/mira/miraRuntimeConfig.js`.
- The API key is stored as a non-enumerable server-side config property and is used only by the server-side OpenAI adapter.
- No provider adapter code is imported from `src/` frontend components.
- The frontend calls only `POST /api/agents/mira/chat`.
- Production behavior is intentionally not enabled for real provider calls.

## Required Production Verification

Before any production release with a real provider:

1. Confirm Production has no `MIRA_LLM_API_KEY` unless production provider launch has been approved.
2. Confirm Production does not set `MIRA_LLM_MODE=production_llm`.
3. Confirm Preview and Production use separate provider keys if a future production key is approved.
4. Confirm Vercel environment variable scopes are restricted to the intended environments.
5. Confirm rollback by setting `MIRA_LLM_MODE=mock` has been tested in Preview.

## Evidence Handling Rules

- Do not capture or share secret values.
- Do not capture Vercel protection-bypass secrets.
- Mask account IDs, tokens, and any unrelated project secrets in screenshots.
- Store screenshots only in approved internal evidence storage, not in public website assets.
