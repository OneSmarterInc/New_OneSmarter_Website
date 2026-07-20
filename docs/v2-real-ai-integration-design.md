# V2 Real AI Integration Design And Risk Gate

## Purpose

This document defines the design and risk gates for adding a real LLM layer to Mira Vale after the mock-mode agent has passed internal QA.

This design document does not add real AI calls, SDKs, API keys, model provider code, uploads, authentication, persistent memory, database storage, microphone input, live voice processing, avatar behavior, or endpoint behavior changes. The `/ai-agents` page now includes a separate frontend-only scripted voice sample prototype that uses approved prerecorded static MP3 assets and does not connect to the LLM/provider path.

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
- Visible session-only conversation thread.
- Frontend-only scripted voice sample section with transcripts and approved prerecorded static MP3 assets.
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
- A runtime config helper and LLM adapter interface that currently support only `mock`, `off`, and fallback-to-mock placeholder behavior. No real provider adapter, SDK, API key, or external model call exists yet.
- A prompt contract module and output validator for mocked model-response testing. These are not wired to a real provider yet.
- A staging-only OpenAI Responses API adapter behind `MIRA_LLM_MODE=staging_llm` and `MIRA_LLM_PROVIDER=openai`. It uses server-side env vars only, makes no frontend call, and falls back to `local_harness_mock` on any safety, provider, parsing, timeout, or validation failure.

Mira's current multi-turn context is session-only. The `/ai-agents` UI stores recent turns only in React state while the page is open and sends a capped `conversationHistory` field for follow-up interpretation. The server treats that history as untrusted reference text; approved KB retrieval remains the factual authority. No localStorage, sessionStorage, cookies, database storage, persistent memory, or server-side transcript store is used. Future persistent memory would require a separate privacy, legal, and security design.

The scripted voice sample prototype is not part of the LLM response path. It uses fixed sample definitions, visible transcripts, and approved static file paths under `public/audio/mira/`. It does not synthesize model output, request microphone access, process user speech, call a voice provider at runtime, or alter endpoint behavior. Future dynamic turn-based TTS, STT, or realtime voice requires separate privacy, safety, cost, security, accessibility, provider, and production review.

The static Mira visual-presence prototype is also outside the LLM response path. It deterministically maps approved presentation metadata to one of six controlled placeholder states and does not use camera access, facial tracking, lip-sync, generated video, runtime image generation, realtime avatar services, or live animation. Future animated/avatar behavior requires a separate risk gate and allowed-state validation.

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

The prompt contract is defined in `api/agents/mira/miraPromptContract.js`.

Prompt components:

- System instructions.
- Mira persona instructions.
- Retrieved approved source context.
- Recent conversation block labeled `RECENT CONVERSATION FOR REFERENCE ONLY`.
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

The context block includes only retrieved approved KB entries, including source id, title, route, approved summary, source facts, allowed claims, and handoff guidance. Disallowed claims are not presented as ordinary source statements; unsafe phrases appear only in clearly labeled claim-boundary or avoidance instructions.

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

The current `/ai-agents` Mood Signal panel derives a controlled presentation state in the frontend from endpoint metadata. It does not accept arbitrary model-generated emotions.

Future real model integration may output or recommend a controlled `presentationState`, but the UI should accept only known allowed values, not arbitrary emotional labels.

Example future field:

```json
{
  "presentationState": {
    "posture": "careful",
    "moodSignals": ["careful", "thoughtful"],
    "expression": "pondering"
  }
}
```

Allowed values must be enumerated and validated before reaching the UI. A future implementation path could be:

| Phase | Scope |
| --- | --- |
| Mood P1 | Implemented: deterministic mood-signal panel in `/ai-agents`. |
| Mood P2 | Implemented: derive mood state from endpoint metadata such as `riskFlags`, `confidence`, and `handoffNeeded`. |
| Mood P3 | Implemented in lightweight form: simple expression-state visual without video/avatar implementation. |
| Mood P4 | Connect expression state to future voice/avatar behavior. |
| Mood P5 | Allow a real LLM to propose `presentationState`, but only through strict allowed-value validation. |

## Safety Gates Before LLM Call

Pre-call gates should run before any model request:

- Method and JSON validation.
- Empty message rejection.
- Too-long message rejection.
- Rate limit.
- Deterministic typo and alias normalization for approved OneSmarter, service, compliance, healthcare, legal, medical, and prompt-injection vocabulary.
- Safety detection against both the original user text and the normalized internal text.
- PHI/confidential detection.
- Legal advice detection.
- Medical advice detection.
- Compliance guarantee detection.
- HIPAA/SOC 2 claim-boundary detection.
- Prompt injection detection.
- Approved KB retrieval.
- Retrieval confidence check.

The original user text must remain the visible chat text. The normalized or interpreted query is internal and should not be exposed in the public response schema.

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

Future selective intent normalization may be considered only after the deterministic layer returns low confidence for a question that still appears OneSmarter-related. That future normalizer must be feature-gated, must not run for safety-rule refusals, PHI/confidential submissions, legal/medical advice, compliance guarantees, prompt injection, or clear out-of-scope questions, and must preserve the existing endpoint schema. No second LLM call exists in the current implementation.

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

The mocked output validator now lives in `api/agents/mira/miraOutputValidator.js`. It checks shape, prohibited wording, unsupported certification claims, compliance guarantees, PHI/confidential upload invitations, grounding status, output safety status, and required handoff behavior for risky topics.

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

## Current Adapter Interface

The internal adapter seam now exists in:

- `api/agents/mira/miraRuntimeConfig.js`
- `api/agents/mira/llmAdapter.js`
- `api/agents/mira/openAiAdapter.js`

Current behavior:

- Missing `MIRA_LLM_MODE` defaults to `mock`.
- `mock` uses the deterministic local harness and returns `mode: local_harness_mock`.
- `off` returns a safe unavailable handoff response.
- `staging_llm` with `MIRA_LLM_PROVIDER=openai` may call the OpenAI Responses API from the Vercel serverless path only when provider config is complete, approved context is adequate, and pre-call safety gates pass.
- `production_llm` remains unimplemented and production should remain in `mock` unless separately approved.
- The OpenAI adapter does not import the OpenAI SDK and does not expose API key values.
- GPT-5-family staging requests can send `reasoning: { effort: "minimal" | "low" | "medium" | "high" }`; missing or invalid reasoning effort falls back to `minimal`.
- Preview staging with GPT-5 mini should use `MIRA_LLM_REASONING_EFFORT=minimal` and `MIRA_LLM_MAX_TOKENS=1000` because `max_output_tokens` includes both reasoning and visible structured output.
- Invalid mode values fall back to `mock`.

This preserves the current endpoint contract and visible `/ai-agents` behavior while preparing a narrow future integration point for provider-specific code.

Prompt and mocked response tests run with:

```powershell
npm.cmd run test:mira-prompt
```

These tests validate prompt construction, context-only grounding, claim-boundary instructions, and mocked model output rejection/fallback behavior without calling any provider.

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

After the staging OpenAI adapter implementation, the next package should be staging verification, browser QA, safe-log review, rollback confirmation, and security review preparation. Production LLM mode remains blocked on legal/privacy review, Fable/security review, monitoring, rollback testing, and internal signoff.

The staging implementation plan and risk gate is documented in:

`docs/v2-openai-staging-implementation-plan.md`
