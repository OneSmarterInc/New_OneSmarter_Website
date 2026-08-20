# V2 OpenAI Staging Implementation Plan And Risk Gate

## Purpose

This document defines how OneSmarter can add the first real OpenAI-backed Mira response path in staging only.

The staging implementation now exists behind `MIRA_LLM_MODE=staging_llm` and `MIRA_LLM_PROVIDER=openai`. It does not add an OpenAI SDK, commit API keys, expose keys to frontend code, add uploads, authentication, database storage, persistent memory, voice, microphone, avatar behavior, or production LLM enablement.

The staging path stays behind feature flags and preserves rollback to `local_harness_mock`.

## Current State

Mira currently has:

- Working mock mode.
- Runtime config helper.
- LLM adapter seam.
- OpenAI adapter stub.
- Real OpenAI Responses API staging adapter behind feature flags.
- Prompt contract.
- Output validator.
- Mocked model-response tests.
- Default `local_harness_mock` behavior.

The real provider path is Preview/staging-only. Production remains `mock` unless separately approved.

## Required Environment Variables

Future staging environment variables:

```text
MIRA_LLM_MODE=staging_llm
MIRA_LLM_PROVIDER=openai
MIRA_LLM_MODEL=<reviewed staging model>
MIRA_LLM_API_KEY=<server-side staging secret>
MIRA_LLM_TIMEOUT_MS=<number>
MIRA_LLM_MAX_TOKENS=<number>
MIRA_LLM_TEMPERATURE=<number>
MIRA_LLM_REASONING_EFFORT=minimal
MIRA_LLM_ENABLE_POST_VALIDATION=true
```

Requirements:

- Configure variables server-side only.
- Do not expose keys to the frontend.
- Do not commit keys to the repository.
- Use separate staging and production keys.
- Keep production in `mock` mode until a separate production approval package is completed.
- Treat missing or invalid provider configuration as a safe fallback condition.

Recommended staging defaults:

| Variable | Recommended value |
| --- | --- |
| `MIRA_LLM_TIMEOUT_MS` | `8000` |
| `MIRA_LLM_MAX_TOKENS` | `1000` for Preview staging with GPT-5 mini |
| `MIRA_LLM_TEMPERATURE` | `0.2` or lower |
| `MIRA_LLM_REASONING_EFFORT` | `minimal` |
| `MIRA_LLM_ENABLE_POST_VALIDATION` | `true` |

Compatibility note: the adapter omits custom `temperature` for `gpt-5` hyphen-family models such as `gpt-5-mini`, because those models may reject non-default temperature values with HTTP 400. The environment variable remains available for models that accept custom temperature.

Reasoning-token note: GPT-5-family models may count internal reasoning against `max_output_tokens`. Preview staging should combine `MIRA_LLM_REASONING_EFFORT=minimal` with `MIRA_LLM_MAX_TOKENS=1000` so the model has room for both reasoning and the required structured JSON answer. Do not use `none` for `gpt-5-mini` unless compatibility is separately confirmed.

## Implementation Flow

Current staging flow:

1. Request reaches `api/agents/mira/chat.js`.
2. `chatCore.js` validates method, JSON body, message type, empty input, and message length.
3. Existing rate limit runs.
4. Local harness performs risk detection and approved KB retrieval.
5. If high-risk deterministic handoff is required, skip the model call.
6. Build prompt payload through `miraPromptContract.js`.
7. Call the OpenAI Responses API adapter with timeout.
8. Parse expected model output from top-level `output_text` when present or nested `response.output[]` message content parts where `type: "output_text"`.
9. Validate model output through `miraOutputValidator.js`.
10. If valid, format the final response into the existing endpoint schema.
11. If invalid, timed out, malformed, or unsafe, fall back to `local_harness_mock`.
12. Return the same endpoint response schema used today.

The adapter treats `response.status: "incomplete"` and refusal content parts as fallback conditions rather than normal answer text. Missing-output diagnostics are limited to safe structural metadata such as provider response status, incomplete reason, output item types, content part types, refusal presence, provider request id, and token counts. Raw prompts, raw provider bodies, refusal text, and answer text must not be logged.

The UI should not need to change when staging LLM mode is enabled or rolled back.

## Provider Call Boundaries

A real OpenAI call may happen only when all of these are true:

- Code is running server-side.
- `MIRA_LLM_MODE=staging_llm`.
- `MIRA_LLM_PROVIDER=openai`.
- `MIRA_LLM_API_KEY` is configured server-side.
- `MIRA_LLM_MODEL` is configured.
- Input validation and rate limiting pass.
- The question is not a high-risk deterministic handoff case.
- Approved KB context is available.
- Timeout, max tokens, and low temperature are configured.

A real OpenAI call must never happen:

- From frontend code.
- In `mock` mode.
- In `off` mode.
- In production unless `production_llm` is separately approved.
- When the input includes or requests processing of PHI, confidential data, credentials, legal advice, medical advice, or other high-risk handoff topics.
- When approved context is insufficient.

## Safety Behavior

Before any model call:

- Run current risk detection.
- Retrieve approved KB context.
- Confirm adequate grounding.
- Skip the model if no adequate approved context is available.
- Skip or tightly constrain the model if risk flags include PHI/confidential data, legal advice, medical advice, compliance guarantee, prompt injection, or business-specific review.
- Build a context-only prompt payload from approved KB entries.

After any model call:

- Parse the expected output shape.
- Run `miraOutputValidator.js`.
- Scan prohibited phrases.
- Require `groundingStatus`.
- Require `outputSafetyStatus`.
- Confirm handoff behavior for risky topics.
- Fall back to `local_harness_mock` if validation fails.

The model should be an answer-writing layer over approved context, not a source of truth.

## Error And Fallback Behavior

Fallback to `local_harness_mock` when:

- Provider timeout occurs.
- OpenAI returns an error.
- The output is malformed.
- The output fails validation.
- The output contains unsafe HIPAA, SOC 2, compliance, security, privacy, or certification language.
- Approved context is missing or insufficient.
- The model suggests processing PHI or confidential data.
- Required environment variables are missing.

If `MIRA_LLM_MODE=off`, return the safe unavailable/handoff response instead of mock behavior.

Log safe metadata only. Do not expose stack traces, provider internals, raw prompts, raw request bodies, full user messages, full answers, or secret values.

## Cost And Rate Controls

Required controls:

- Keep the existing request rate limit.
- Add a provider timeout.
- Enforce max tokens.
- Keep temperature low.
- Monitor request counts.
- Monitor fallback rates.
- Consider a daily quota before any broader public exposure.
- Do not enable open public traffic until reviewed.

Recommended future metrics:

- Request count.
- Provider-call count.
- Token count if available.
- Latency.
- Timeout count.
- Validation failure count.
- Fallback reason.
- Risk flag frequency.

## Logging And Privacy

Preserve current safe logging posture.

Log:

- `requestId`.
- Mode.
- Provider.
- Model name.
- Latency.
- Token count if available.
- Risk flags.
- Fallback reason.
- Validation status.
- Handoff status.
- Matched source IDs.

Do not log by default:

- Full user message.
- Raw request body.
- Raw prompt.
- Full model response.
- Full final answer.
- PHI.
- Confidential data.
- Credentials.
- API keys.
- Authorization headers.

Any transcript, prompt, or answer logging for quality review requires separate privacy/legal review and retention rules.

## Test Plan

Automated tests mock all provider requests and cover:

- `mock` mode unchanged.
- `off` mode unchanged.
- `staging_llm` with missing key falls back safely.
- `staging_llm` with mocked OpenAI response passes.
- Model timeout fallback.
- Provider error fallback.
- Malformed output fallback.
- Unsafe HIPAA output fallback.
- Unsafe SOC 2 output fallback.
- Compliance guarantee fallback.
- PHI/confidential input skips model.
- Legal advice skips model.
- Medical advice skips model.
- Prompt injection skips model or falls back.
- Endpoint schema remains stable.
- API key value is never exposed.
- Frontend behavior remains stable.

## Staging Deployment Plan

1. Keep production environment in `MIRA_LLM_MODE=mock`.
2. Configure variables only on Vercel preview or staging.
3. Use a staging-only provider key.
4. Deploy branch preview.
5. Run automated API and prompt tests.
6. Run browser tests on `/ai-agents`.
7. Run manual QA checklist.
8. Review logs for safe metadata only.
9. Confirm rollback to `mock`.
10. Complete Fable/security review before any production LLM package.

## Rollback Plan

Rollback should be immediate:

1. Set `MIRA_LLM_MODE=mock`.
2. Remove or disable the staging API key if needed.
3. Redeploy if the platform requires redeployment for env changes.
4. Confirm `/api/agents/mira/chat` returns `mode: local_harness_mock`.
5. Confirm `/ai-agents` UI still works.
6. Confirm endpoint schema remains stable.

For a full shutdown:

1. Set `MIRA_LLM_MODE=off`.
2. Confirm the safe unavailable/handoff response.
3. Route business inquiries to care@onesmarter.com.

## Required Approval Gates

Before real staging implementation:

- Owner approval.
- Provider/API key approval.
- Privacy/logging acceptance.
- Cost/rate-limit acceptance.
- Internal QA acceptance.

Before production:

- Legal/privacy review.
- Fable/security review.
- Production monitoring plan.
- Rollback tested.
- Prompt injection tests passed.
- HIPAA/SOC wording tests passed.
- PHI/confidential handling tests passed.
- Internal signoff.

Production must remain `mock` until a separate production LLM work package is approved.

## Recommended Next Package

Recommended next package:

`V2-P17: Staging Verification, Browser QA, And Security Review Prep`

That package should verify the Preview deployment with staging env vars, run browser QA against `/ai-agents`, review safe logs, confirm rollback to `MIRA_LLM_MODE=mock`, and prepare the Fable/security review package before any production LLM discussion.
