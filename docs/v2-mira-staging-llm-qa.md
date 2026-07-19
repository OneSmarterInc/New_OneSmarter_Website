# V2 Mira Staging LLM QA Evidence

## Deployment and Branch Context

- Repository: `OneSmarterInc/New_OneSmarter_Website`
- Branch: `v2/agent-showcase`
- Endpoint under review: `POST /api/agents/mira/chat`
- UI surface: `/ai-agents`
- Review scope: staging/preview LLM behavior only

This document is for staging evidence and security review preparation. It must not include API keys, Vercel bypass secrets, raw prompts, full user submissions, raw provider payloads, raw provider responses, or full answer logs.

## Staging-Only Status

Mira's real provider path is intended for staging review only. Production remains mock-only unless a later review explicitly approves and enables `production_llm`.

Current staging assumptions:

| Setting | Expected Value |
| --- | --- |
| `MIRA_LLM_MODE` | `staging_llm` |
| `MIRA_LLM_PROVIDER` | `openai` |
| `MIRA_LLM_MODEL` | `gpt-5-mini` |
| `MIRA_LLM_API_KEY` | Configured server-side only |
| `MIRA_LLM_TIMEOUT_MS` | Configured server-side |
| `MIRA_LLM_MAX_TOKENS` | Configured server-side |
| `MIRA_LLM_TEMPERATURE` | Configured server-side when model-compatible |
| `MIRA_LLM_REASONING_EFFORT` | `minimal` recommended for GPT-5-family staging |
| `MIRA_LLM_ENABLE_POST_VALIDATION` | Enabled unless explicitly reviewed otherwise |

## Verified Normal Path

For grounded informational questions, the expected staging response is:

| Field | Expected |
| --- | --- |
| `mode` | `staging_llm` |
| `modelProvider` | `openai` |
| `modelName` | `gpt-5-mini` |
| `fallbackUsed` | `false` |
| `groundingStatus` | `grounded` |
| `outputSafetyStatus` | `passed` |
| `handoffNeeded` | `false` for general informational questions |
| `matchedSources` | Approved OneSmarter KB entries only |

Normal grounded questions in automated staging-contract coverage include:

| Question Type | Example |
| --- | --- |
| Company overview | What does OneSmarter do? |
| Platforms | What platforms do you offer? |
| Healthcare | Do you work with healthcare organizations? |
| AI services | What are AI Agentic Services? |
| Bill audit | What is Bill Audit & Bill Pay? |
| Secure ticketing | What is Secure Ticketing and Case Management? |

## Deterministic Safety Paths

These cases should be handled before a provider call or should fall back deterministically:

| Category | Expected Behavior |
| --- | --- |
| HIPAA claim boundary | Skip provider, return approved assessment wording, `fallbackReason: pre_call_claim_boundary` |
| SOC 2 claim boundary | Skip provider, return approved attestation wording, `fallbackReason: pre_call_claim_boundary` |
| Pricing/custom project | Skip provider, hand off to `care@onesmarter.com` |
| PHI/confidential input | Skip provider, refuse public processing, hand off |
| Legal advice | Skip provider, refuse legal advice, hand off |
| Medical advice | Skip provider, refuse medical advice, hand off |
| Compliance guarantee | Skip provider, refuse guarantees, hand off |
| Prompt injection | Skip provider, refuse hidden instructions/secrets request, hand off |
| Secret extraction | Skip provider, do not expose environment values |
| Out-of-scope current facts | Do not browse or invent current facts; safe fallback or handoff |

Approved claim wording:

- `SOC 2 Type II Attested`
- `HIPAA Security Rule Compliance Assessment Completed`

## Provider Fallback Behavior

Provider failures must preserve the endpoint schema and fall back to deterministic local behavior.

| Condition | Expected Fallback |
| --- | --- |
| Missing provider config | `local_harness_mock`, `fallbackReason: missing_provider_config` |
| Provider timeout | `local_harness_mock`, `fallbackReason: provider_timeout` |
| Provider 400/500 | `local_harness_mock`, HTTP status-specific fallback reason |
| Incomplete response | `local_harness_mock`, incomplete reason captured safely |
| Missing output text | `local_harness_mock`, `fallbackReason: missing_output_text` |
| Refusal part | `local_harness_mock`, `fallbackReason: provider_refusal` |
| Malformed output | `local_harness_mock`, `fallbackReason: malformed_model_json` |
| Unsafe model output | `local_harness_mock`, output-validation fallback reason |

Safe provider diagnostics may include status, safe error type/code/param, request ID, response status, output item types, content part types, and token counts. They must not include raw prompts, raw responses, answer text, full user messages, API keys, or bypass secrets.

## Grounding Review

The staging OpenAI path is allowed only after local retrieval finds approved context with adequate confidence. The prompt contract should include only approved retrieved OneSmarter KB entries and claim-boundary instructions. It must not include unrelated KB entries, private files, hidden prompts, web search results, uploaded files, or dynamic browsing results.

Grounding expectations:

- Approved KB entries are selected before provider call.
- Matched sources in the response map to approved KB entries.
- Insufficient context falls back safely instead of browsing.
- Current/fresh web facts are not invented.
- No provider tools, browsing, file search, or external actions are enabled.

## Prompt Injection Review

Prompt-injection defenses expected in staging:

- Local detection for instruction override, hidden prompt, private prompt, API key, and secret extraction attempts.
- Prompt-injection risk skips the provider call through the pre-call safety gate.
- System instructions and environment values are never returned.
- Retrieved context cannot override system, safety, or claim-boundary rules.
- Model output is post-validated before being returned.
- Unsafe model output falls back deterministically.

## Safe Operational Metrics Review

Safe metadata to review in Vercel logs:

| Field | Purpose |
| --- | --- |
| `requestId` | Correlate a single request without logging content |
| `timestamp` | Establish timing |
| `mode` | Confirm mock vs staging path |
| `provider` | Confirm provider when used |
| `model` | Confirm model name |
| `latencyMs` | Provider latency |
| `providerHttpStatus` | Provider status code |
| `tokenUsage` | Provider token usage object if safe |
| `validationStatus` | Output validator status |
| `fallbackUsed` | Fallback rate analysis |
| `fallbackReason` | Fallback cause |
| `riskFlags` | Safety-routing evidence |
| `handoffNeeded` | Handoff rate analysis |
| `matchedSourceIds` | Grounding audit |
| `messageLength` | Abuse/cost signal without content |

Logs must not contain:

- API key
- Vercel bypass secret
- Full user message
- Raw request body
- Raw prompt
- Full answer
- Raw provider response
- PHI or confidential material
- Public stack traces

## Latency and Token Evidence Template

Use this table during manual staging review. Do not paste full user messages, raw prompts, raw answers, raw provider responses, keys, or secrets.

| Date/Time | Case ID | Mode | Provider | Model | Latency ms | Input Tokens | Output Tokens | Reasoning Tokens | Total Duration ms | Fallback Used | Fallback Reason | Validation Status | Handoff Needed | Notes |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

Track aggregate observations:

| Metric | Observation |
| --- | --- |
| Provider latency range |  |
| Average provider latency |  |
| Fallback rate |  |
| Validation-failure rate |  |
| Handoff rate |  |
| Most common fallback reason |  |
| Highest observed token use |  |

## Cost-Control Readiness

Current controls:

- Endpoint request validation and maximum message length.
- In-memory best-effort rate limit.
- Provider timeout.
- Configured maximum output tokens.
- GPT-5-family low reasoning effort configuration.
- Deterministic provider skips for high-risk or claim-boundary questions.
- No tools, browsing, file search, uploads, or external actions.
- Production remains disabled/mock-only.
- Emergency rollback can set `MIRA_LLM_MODE=mock`.

Future controls before production consideration:

- Durable/shared rate limiter.
- Daily and monthly usage quotas.
- Provider cost alerts.
- Provider usage dashboard review cadence.
- Abuse monitoring.
- Operational runbook for switching to mock mode.
- Security review signoff before any production LLM activation.

## Production Remains Mock-Only

Production must remain `mock` or otherwise non-provider-calling until a separate production approval package is completed. The current review package does not authorize production LLM activation.
