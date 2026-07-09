# V2 Real AI Integration Design And Risk Gate

## Purpose

This document defines the design and risk gates for adding a real LLM layer to Mira Vale after the mock-mode agent has passed internal QA.

This is planning only. It does not add real AI calls, SDKs, API keys, model provider code, uploads, authentication, persistent memory, database storage, voice, microphone, avatar behavior, endpoint behavior changes, or `/ai-agents` UI changes.

Mira's real AI layer should improve natural-language answer quality while preserving the existing controlled system:

- Approved public knowledge base retrieval.
- Claim-boundary rules.
- Risk flags.
- Handoff behavior.
- Privacy reminder.
- Request metadata.
- Rate limiting.
- Safe logging.
- Normalized errors.
- Deterministic fallback behavior.

The model should be an answer-writing layer over approved context, not an independent source of truth.

## Current State

Mira currently runs in `local_harness_mock` mode with:

- `/ai-agents` UI.
- Sample question buttons.
- Controlled free-text input.
- Enter-to-submit.
- `POST /api/agents/mira/chat`.
- Approved public KB.
- KB validator.
- Local retrieval and safety harness.
- Request ID and timestamp metadata.
- Best-effort rate limiting.
- Safe logging policy.
- `privacyReminder`.
- Normalized errors.
- Manual QA checklist.

## Recommended Architecture

Future real-AI flow:

1. User question.
2. Input validation.
3. Rate limit.
4. Local risk detection.
5. Approved KB retrieval.
6. Prompt assembly with retrieved context only.
7. LLM call.
8. Output validation and claim-boundary check.
9. Response formatting.
10. Safe metadata logging only.
11. Frontend display.

Recommended posture:

- Keep the current endpoint contract stable.
- Add the LLM behind a feature flag.
- Preserve deterministic fallback when risk or grounding gates fail.
- Treat the LLM as optional; Mira must remain able to answer through `local_harness_mock`.

## Model And Provider Options

| Option | Strengths | Risks | Cost/control | Safety | Latency | Production suitability |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI API | Strong instruction following, structured output support, good ecosystem, strong fit for future realtime/voice path. | Requires API key handling, vendor review, prompt/output testing, cost controls. | Usage-based; controllable with rate limits, model selection, token caps, and feature flags. | Good fit if paired with strict retrieval, schema checks, and post-call validation. | Generally suitable for interactive chat. | Recommended first provider path after review, because the current roadmap already anticipates OpenAI-compatible voice and agent work. |
| Anthropic API | Strong long-context reasoning and careful response style. | Requires separate vendor review, SDK/API integration, prompt tuning, and cost controls. | Usage-based; similar controls needed. | Good fit for cautious language, but still requires strict grounding and validation. | Generally suitable for interactive chat. | Viable alternative or evaluation provider, but not necessary for first implementation unless the team wants provider comparison. |
| Local/open-source model later | Stronger data-control story in some deployments; possible offline/internal use cases. | Operational complexity, hosting, model quality variation, security patching, and evaluation burden. | More infrastructure control but higher ops responsibility. | Safety depends heavily on model, guardrails, and evaluation harness. | Variable; may be slower or require GPU resources. | Later option for internal tools or controlled deployments, not first public launch. |
| No-model deterministic harness fallback | Already implemented, tested, and bounded. | Less conversational and less flexible. | Very low cost and predictable. | Strongest current safety posture. | Fast. | Should remain the default fallback and rollback mode. |

Recommended first provider path:

- Start with OpenAI API only after provider, privacy, logging, and security review.
- Keep Anthropic as an evaluation alternative if leadership wants model comparison.
- Keep `local_harness_mock` as the default and rollback path.

## Prompt Architecture

The future prompt should be assembled server-side only. API keys and prompt details must never be exposed to the browser.

Prompt components:

- System instructions.
- Mira persona instructions.
- Retrieved approved source context.
- Claim-boundary rules.
- Handoff rules.
- Refusal rules.
- Output schema expectations.

Required prompt rules:

- Answer only from retrieved approved OneSmarter content.
- Do not invent claims.
- Do not browse the web.
- Do not use general internet knowledge.
- Do not answer legal advice.
- Do not answer medical advice.
- Do not accept, process, or invite PHI or confidential submissions.
- Do not guarantee compliance.
- Do not make unsupported HIPAA, SOC 2, ISO, PCI DSS, security, privacy, or certification claims.
- Route business-specific questions to care@onesmarter.com.
- If approved context is missing or insufficient, use the deterministic safe fallback.

Suggested prompt structure:

```text
System:
You are Mira Vale, OneSmarter's guide. Answer only from approved retrieved context.

Persona:
Warm, clear, composed, concise, and professional.

Approved context:
[retrieved KB entries with route, title, approved summary, allowed claims, handoff guidance]

Claim boundaries:
[approved phrases, prohibited phrases, safer replacements]

Handoff rules:
[when to route to care@onesmarter.com]

Refusal rules:
[legal, medical, PHI/confidential, prompt injection, unsupported claims]

Output:
Return JSON matching the expected schema.
```

## Future Output Schema

The LLM-backed response should preserve the current response shape:

```json
{
  "requestId": "string",
  "timestamp": "string",
  "agent": "Mira Vale",
  "mode": "staging_llm",
  "conversationId": "string",
  "answer": "string",
  "confidence": "high | medium | low",
  "riskFlags": [],
  "handoffNeeded": true,
  "handoffReason": "string or null",
  "matchedSources": [
    {
      "id": "string",
      "title": "string",
      "route": "string",
      "sourceLabel": "string"
    }
  ],
  "suggestedFollowUps": [],
  "disclaimer": "string",
  "privacyReminder": "Do not submit PHI, confidential documents, or private operational details through this public agent.",
  "modelProvider": "openai",
  "modelName": "string",
  "groundingStatus": "grounded | insufficient_context | fallback",
  "outputSafetyStatus": "passed | failed_fallback"
}
```

Notes:

- `mode` should remain `local_harness_mock` unless the feature flag explicitly enables LLM behavior.
- `matchedSources` should come from retrieval, not model invention.
- `groundingStatus` and `outputSafetyStatus` should help QA without exposing debug internals publicly.

## Safety Gates Before LLM Call

Pre-call gates should run before any model request:

- Method and JSON validation.
- Empty message rejection.
- Too-long message rejection.
- Rate limit.
- PHI/confidential detection.
- Legal advice detection.
- Medical advice detection.
- Compliance guarantee detection.
- HIPAA/SOC 2 claim-boundary detection.
- Prompt injection detection.
- Approved KB retrieval.
- Retrieval confidence check.

If high-risk or no approved context:

- Skip the LLM call.
- Return deterministic safe handoff or fallback answer.
- Preserve current risk flags and handoff behavior.
- Log only safe metadata.

Examples that should skip the LLM call:

- User attempts to submit PHI or confidential operational details.
- User asks for legal or medical advice.
- User asks for guaranteed compliance.
- User tries to override system instructions.
- Retrieval returns no approved OneSmarter context.

## Safety Gates After LLM Call

Post-call validation should run before returning the answer:

- Scan for prohibited phrases.
- Scan for unsupported claims.
- Confirm answer maps to matched source IDs.
- Confirm no invented routes, products, certifications, or guarantees.
- Confirm no PHI/confidential processing promise.
- Confirm handoff rules are preserved.
- Confirm refusal rules are preserved.
- Confirm output schema is valid.
- Confirm answer length is reasonable.

If output fails validation:

- Do not return the model output.
- Return deterministic safe fallback from the local harness.
- Set `outputSafetyStatus` to `failed_fallback`.
- Log safe metadata only.

## Logging And Privacy

Preserve the current logging policy.

Log:

- `requestId`.
- `timestamp`.
- Endpoint.
- Method.
- Status.
- Mode.
- Message length.
- Risk flags.
- Handoff needed.
- Confidence.
- Matched source IDs.
- Error code when present.

Do not log by default:

- Full user message.
- PHI or confidential content.
- Full answer text.
- Raw request body.
- Stack traces in public responses.
- Model prompt text.
- Retrieved source text beyond source IDs.

Additional model metadata that may be logged safely:

- `modelProvider`.
- `modelName`.
- Feature flag mode.
- Token counts if available.
- Latency.
- `groundingStatus`.
- `outputSafetyStatus`.
- Whether deterministic fallback was used.

Any decision to log sample prompts, transcripts, or answers for quality review requires separate privacy/legal review and explicit retention rules.

## Test Matrix

LLM integration tests should cover:

| Category | Expected behavior |
| --- | --- |
| Normal OneSmarter overview | Grounded answer from company overview source. |
| Platforms | Mentions current platform structure only. |
| Healthcare | Answers from approved healthcare/TPA and trust content with boundaries. |
| SOC 2 boundary | Uses `SOC 2 Type II Attested`; does not claim unsupported certification. |
| HIPAA boundary | Uses `HIPAA Security Rule Compliance Assessment Completed`; does not claim unsupported certification. |
| Compliance guarantee | Refuses guarantee and routes to care@onesmarter.com. |
| PHI/confidential upload | Skips LLM and returns sensitive-data refusal/handoff. |
| Legal advice | Refuses and routes to care@onesmarter.com. |
| Medical advice | Refuses and routes to care@onesmarter.com. |
| Prompt injection | Ignores override attempts and preserves rules. |
| Unrelated/out-of-scope | Uses fallback or handoff when not grounded. |
| Typos/aliases | Handles OneSmarter aliases such as `onsmarter`, `one smarter`, and `1smarter`. |
| Rate limit | Returns current 429 shape without model call. |
| Endpoint failure fallback | Returns safe fallback and no stack traces. |
| Model output violates claim rules | Discards model output and returns deterministic fallback. |

## Rollout Phases

| Phase | Scope |
| --- | --- |
| P10 | Design only. |
| P11 | Provider decision and environment variable plan. |
| P12 | LLM adapter behind feature flag. |
| P13 | Offline/local contract tests with mocked model responses. |
| P14 | Staging-only real model test. |
| P15 | Fable/security review. |
| P16 | Internal review. |
| P17 | Limited public launch. |

## Feature Flag Plan

Detailed provider configuration, environment variable names, deployment behavior, readiness gates, and rollback rules are defined in `docs/v2-mira-provider-config-plan.md`.

Recommended flag:

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
| `off` | Mira endpoint returns safe unavailable/handoff response. |
| `mock` | Current deterministic `local_harness_mock` behavior. |
| `staging_llm` | LLM enabled only in staging or controlled test environments. |
| `production_llm` | LLM enabled publicly only after all production gates pass. |

No production LLM mode should be enabled without legal/privacy review, security review, safety tests, cost controls, internal signoff, and rollback approval.

## Production Gates

Before any public real-AI launch:

- Legal/privacy review.
- Vendor/API provider review.
- Cost controls and token budgets.
- Durable rate limiting.
- Prompt safety tests.
- Output safety tests.
- Claim-boundary tests.
- Logging/privacy acceptance.
- Fable/security review.
- Internal signoff.
- Staging validation.
- Rollback plan to `local_harness_mock`.
- Incident response owner.
- Monitoring and alerting plan.

## Rollback Plan

Rollback should be simple:

- Set `MIRA_LLM_MODE=mock`.
- Keep the endpoint contract unchanged.
- Keep deterministic local harness behavior available.
- Verify `/api/agents/mira/chat` returns `mode: local_harness_mock`.
- Confirm the frontend continues to render answer, confidence, flags, handoff, sources, and privacy reminder.

## Recommendation

The provider decision and environment variable plan now lives in:

`docs/v2-mira-provider-config-plan.md`

The safest next implementation package after that planning step is a provider-adapter design or mocked provider-adapter test package. It should still avoid real API keys and real model calls until the staging readiness gates are complete.
