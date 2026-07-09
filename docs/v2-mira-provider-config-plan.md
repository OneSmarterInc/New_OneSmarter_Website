# V2 Mira Provider Configuration Plan

## Purpose

This document defines the provider decision and environment variable plan for a future real LLM layer behind Mira Vale.

Mira should remain in `local_harness_mock` mode by default until a real provider is reviewed, configured, tested, and explicitly enabled. This plan does not add model calls, SDKs, API keys, provider code, endpoint behavior changes, UI changes, uploads, authentication, persistent memory, voice, microphone, avatar behavior, or changes to the Version 1 website.

The current deterministic harness remains the default safety baseline and rollback path.

## Current Implementation Status

The runtime config helper and adapter interface now exist:

- `api/agents/mira/miraRuntimeConfig.js`
- `api/agents/mira/llmAdapter.js`

Current implementation is intentionally mock/off only:

- Missing `MIRA_LLM_MODE` defaults to `mock`.
- `mock` uses the deterministic local harness and returns `mode: local_harness_mock`.
- `off` returns a safe unavailable handoff response.
- `staging_llm` and `production_llm` are placeholders and fall back to the deterministic local harness.
- Invalid mode values fall back to `mock`.
- `MIRA_LLM_API_KEY` is read only as `apiKeyConfigured: true|false`; the secret value is not returned or logged.

No SDK, API key, external provider call, or real model adapter has been added yet.

The prompt contract and mocked output validator now exist for local testing:

- `api/agents/mira/miraPromptContract.js`
- `api/agents/mira/miraOutputValidator.js`
- `scripts/test-mira-prompt-contract.js`

These modules define the future prompt shape and post-output safety checks, but they do not call a provider or change endpoint behavior.

## Feature Flag Plan

Recommended feature flag:

```text
MIRA_LLM_MODE=off|mock|staging_llm|production_llm
```

Default:

```text
MIRA_LLM_MODE=mock
```

Mode behavior:

| Mode | Behavior |
| --- | --- |
| `off` | The Mira endpoint returns a safe unavailable response and routes visitors to care@onesmarter.com. |
| `mock` | The endpoint uses the current deterministic local harness only and returns `mode: local_harness_mock`. |
| `staging_llm` | Reserved for a future real provider in staging. Current implementation falls back to `mock` behavior. |
| `production_llm` | Reserved for a future real provider in production. Current implementation falls back to `mock` behavior. |

The endpoint should fail closed. If the mode is invalid, provider configuration is missing, or a provider call fails, Mira should fall back to deterministic mock behavior or an unavailable/handoff response rather than crashing.

## Provider Configuration

Future environment variables:

```text
MIRA_LLM_PROVIDER=openai
MIRA_LLM_MODEL=<model name>
MIRA_LLM_API_KEY=<secret, never committed>
MIRA_LLM_TIMEOUT_MS=<number>
MIRA_LLM_MAX_TOKENS=<number>
MIRA_LLM_TEMPERATURE=<number>
```

Optional environment variables:

```text
MIRA_LLM_LOG_MODEL_METADATA=true|false
MIRA_LLM_ENABLE_POST_VALIDATION=true|false
```

Recommended defaults when real provider mode is eventually introduced:

| Variable | Recommended default | Notes |
| --- | --- | --- |
| `MIRA_LLM_PROVIDER` | `openai` | First reviewed provider path. |
| `MIRA_LLM_TIMEOUT_MS` | `8000` | Keep public interaction responsive. |
| `MIRA_LLM_MAX_TOKENS` | `600` | Mira should answer concisely. |
| `MIRA_LLM_TEMPERATURE` | `0.2` | Prefer stable, grounded wording. |
| `MIRA_LLM_LOG_MODEL_METADATA` | `true` | Log provider/model/latency/token metadata only, not prompts or full responses. |
| `MIRA_LLM_ENABLE_POST_VALIDATION` | `true` | Required before any real model output is returned. |

The exact model name should be selected during provider review, not hard-coded in planning docs.

## Provider Decision

Initial recommendation: OpenAI API as the first provider path.

Rationale:

- It aligns with the planned real-time and voice roadmap.
- It has a strong API ecosystem for structured outputs, future realtime voice work, and operational tooling.
- It fits the current project direction while still allowing the deterministic `local_harness_mock` fallback to remain active.

Fallback:

- `local_harness_mock` remains the default and rollback mode.
- The endpoint response schema should remain stable so the UI does not need to change during rollback.

Future alternatives:

- Anthropic may be evaluated later for comparison on careful response style, long-context behavior, and safety performance.
- Local or open-source models may be evaluated later if OneSmarter needs stronger data-control options for internal deployments, but they should not be the first public provider path because they introduce additional hosting, monitoring, model-quality, and security responsibilities.

## Secret Handling

Secret handling requirements:

- No API keys in the repository.
- No API keys in frontend code.
- No provider credentials in public build artifacts.
- Provider calls must happen server-side only.
- Use separate staging and production keys.
- Use restricted project keys or least-privilege controls where the provider supports them.
- Define a key rotation process before staging LLM mode is enabled.
- Treat leaked-key response as an incident response scenario.

The following must never be logged:

- API keys.
- Raw authorization headers.
- Full prompts.
- Full user messages.
- PHI or confidential content.
- Full model responses by default.

## Deployment Behavior

Vercel preview and staging:

- Default to `MIRA_LLM_MODE=mock`.
- Permit `staging_llm` only after staging readiness gates pass.
- Do not allow `production_llm` in preview deployments.
- Missing provider config should safely fall back to mock or unavailable/handoff behavior.

Production:

- Default to `MIRA_LLM_MODE=mock`.
- Permit `production_llm` only after production readiness gates pass.
- Missing provider config should not crash the endpoint.
- Real provider mode requires explicit approval, rollback confirmation, monitoring, and support ownership.

Recommended mode handling:

| Environment | Default | Allowed real-provider mode |
| --- | --- | --- |
| Local development | `mock` | None unless explicitly testing with local secrets and reviewed test data. |
| Vercel preview | `mock` | `staging_llm` only after readiness gates. |
| Staging | `mock` | `staging_llm` only after readiness gates. |
| Production | `mock` | `production_llm` only after production gates. |

## Rollback Plan

Rollback should be operationally simple:

1. Set `MIRA_LLM_MODE=mock`.
2. Keep the local deterministic harness available.
3. Preserve the endpoint response schema.
4. Confirm `/api/agents/mira/chat` returns `mode: local_harness_mock`.
5. Confirm the `/ai-agents` UI still displays answer, confidence, handoff, risk flags, sources, and privacy reminder.
6. Review safe metadata logs for error rate, fallback rate, and unusual risk flags.

For a full shutdown:

1. Set `MIRA_LLM_MODE=off`.
2. Confirm the endpoint returns the unavailable/handoff response.
3. Confirm care@onesmarter.com remains visible as the business inquiry path.

## Readiness Gates Before `staging_llm`

Before enabling real model calls in staging or preview:

- Provider and privacy review completed.
- Prompt contract documented.
- Provider environment variables defined in staging only.
- Mocked model tests pass.
- Post-output validation implemented and enabled.
- Cost and token limits defined.
- Rate limiting reviewed.
- Safe logging confirmed.
- No full prompt, full answer, PHI, or confidential content logging by default.
- Endpoint preserves current response schema.
- Rollback to `mock` tested.
- Internal signoff recorded.

## Readiness Gates Before `production_llm`

Before enabling real model calls in production:

- Legal and privacy acceptance completed.
- Fable/security review completed.
- Production monitoring plan approved.
- Abuse and rate-limit controls reviewed.
- Rollback tested in production-like environment.
- Prompt injection tests pass.
- HIPAA and SOC wording tests pass.
- PHI and confidential handling tests pass.
- Compliance guarantee refusal tests pass.
- Cost controls and alerting configured.
- Incident owner and escalation path assigned.
- Internal review signoff recorded.

Production mode should not be enabled by merely setting an environment variable without the gate checklist being completed.

## Implementation Notes For Future Work

Future implementation should keep the provider adapter behind the existing endpoint contract:

- `api/agents/mira/chat.js` should remain a thin request handler.
- `api/agents/mira/chatCore.js` should continue to handle validation, safety metadata, error normalization, and safe response shape.
- Provider-specific logic should live in a small adapter module that can be mocked in tests.
- The adapter should receive only approved retrieved context, claim rules, and a bounded prompt payload.
- Post-output validation should run before any model output reaches the frontend.
- Prompt payloads should be assembled through `miraPromptContract.js`.
- Mocked or real model outputs should be checked through `miraOutputValidator.js`.

The first implementation package did not remove `local_harness_mock`; it added a config and adapter seam only. Future provider work should add real behavior as an explicitly gated branch behind this interface, after readiness gates are complete.

## Out Of Scope

- Real AI calls.
- API keys.
- Provider SDKs.
- Provider adapter code.
- Endpoint behavior changes.
- UI behavior changes.
- Uploads.
- Authentication.
- Database storage.
- Persistent memory.
- Voice, microphone, avatar, or realtime features.
- Changes to legal/privacy pages.
- Changes to Version 1 homepage, navigation, security headers, or platform list.
