# V2 Mira Staging Security Review Handoff

## Review Summary

Mira Vale is the first OneSmarter public guide agent. In the current V2 staging branch, Mira can answer visitor questions using approved public OneSmarter content and a staging-only OpenAI provider path. Production remains mock-only and is not approved for LLM activation.

## Architecture Summary

```text
/ai-agents UI
  -> POST /api/agents/mira/chat
    -> request validation and rate limiting
    -> local risk detection
    -> approved KB retrieval
    -> deterministic safety skips where required
    -> prompt contract assembly from approved context only
    -> OpenAI Responses API staging call, if allowed
    -> structured output parsing
    -> Mira output validation
    -> stable endpoint response schema
    -> safe structured logs
```

## Endpoint Path

- `POST /api/agents/mira/chat`
- Frontend page: `/ai-agents`
- Current mode for staging review: `staging_llm`
- Production mode: mock-only unless separately reviewed and approved

## Staging-Only Activation

The OpenAI provider path is intended to activate only when all of these are true:

- `MIRA_LLM_MODE=staging_llm`
- `MIRA_LLM_PROVIDER=openai`
- `MIRA_LLM_MODEL` is configured
- `MIRA_LLM_API_KEY` is configured server-side
- Approved KB context is available
- Local pre-call safety gates allow the request

`production_llm` is not enabled for real provider calls in this review package.

## Provider and Model

- Provider: OpenAI
- Staging model: `gpt-5-mini`
- API family: OpenAI Responses API
- Store setting: `store: false`
- Tools: none
- Web browsing: none
- File search: none
- Uploads: none
- External actions: none

## Knowledge-Base Grounding

Mira uses approved public OneSmarter knowledge entries from the local KB. Each entry contains approved summaries, source facts, allowed claims, disallowed claims, handoff guidance, related questions, and source labels.

Grounding rules:

- Only retrieved approved KB entries enter the model context.
- The provider must not receive unrelated entries.
- Matched sources are returned for review.
- Insufficient approved context falls back safely.
- No internet browsing or current-fact lookup exists in the endpoint.
- Mira is instructed to answer concisely, separate approved facts from handoff guidance, and use bullets for lists when helpful.
- Mira must not invent contracts, BAAs, integrations, customers, clinical workflows, combined platform implementations, or customer outcomes.
- Platform comparisons should describe each platform from approved facts only and should not imply integrations unless documented.

## Pre-Call Safety Gates

The local harness detects risk before any provider call. Provider calls are skipped for:

- PHI or confidential data
- Legal advice
- Medical advice
- Compliance guarantees
- Business-specific pricing/procurement/contracts/client review
- Prompt injection
- Secret or private prompt extraction attempts
- Out-of-scope or insufficiently grounded questions
- HIPAA and SOC 2 claim-boundary questions

HIPAA and SOC 2 claim-boundary questions use deterministic approved wording rather than model generation:

- `HIPAA Security Rule Compliance Assessment Completed`
- `SOC 2 Type II Attested`

## Post-Output Validation

Model output must pass structured output validation before being returned. Validation checks include:

- Required response shape.
- Grounding status.
- Output safety status.
- Prohibited wording.
- Unsupported certification claims.
- Compliance guarantees.
- PHI/confidential upload invitations.
- Required handoff behavior for risky topics.
- Excessive answer length.
- Raw HTML.
- Unsupported BAA commitments.
- Unsupported platform integrations, clinical workflows, or customer outcome claims.

Unsafe, malformed, missing, or refused output falls back to deterministic local behavior.

## Deterministic Fallback

Fallback preserves the endpoint schema and returns local harness content. Fallback reasons include:

- `missing_provider_config`
- `pre_call_safety_gate`
- `pre_call_claim_boundary`
- `no_adequate_approved_context`
- `provider_timeout`
- `provider_http_400`
- `provider_http_500`
- `provider_incomplete_max_output_tokens`
- `provider_refusal`
- `missing_output_text`
- `malformed_model_json`
- `output_validation_failed:*`

Fallback does not expose raw provider response content, raw prompts, API keys, or full submitted messages.

## Rate Limiting

The endpoint includes a best-effort in-memory rate limiter:

- Limit: 20 requests per minute per key.
- Key: IP from request headers when available; anonymous fallback otherwise.
- Response: JSON 429 with safe message and retry hint.

Known limitation: in-memory serverless rate limiting is not durable or shared across all instances. A durable/shared limiter is recommended before any production LLM launch.

## Safe Logging Policy

Safe log fields:

- `requestId`
- `timestamp`
- `endpoint`
- `method`
- `status`
- `mode`
- `provider`
- `model`
- `conversationId`
- `messageLength`
- `riskFlags`
- `handoffNeeded`
- `confidence`
- `matchedSourceIds`
- `fallbackUsed`
- `fallbackReason`
- `latencyMs`
- `providerHttpStatus`
- `tokenUsage`
- `validationStatus`
- Safe provider diagnostic fields

Fields that must not be logged:

- API key
- Vercel bypass secret
- Full user message
- Raw request body
- Raw prompt
- Full answer
- Raw provider response
- PHI or confidential content
- Stack traces in public responses

## Privacy Reminder

Every successful endpoint response includes:

`Do not submit PHI, confidential documents, or private operational details through this public agent.`

The `/ai-agents` UI also displays an input-adjacent AI disclaimer telling visitors that Mira is an AI agent, responses may contain errors or omit context, important information should be verified, and business-specific, legal, security, compliance, or procurement questions should go to `care@onesmarter.com`.

## No Uploads, Memory, or Tools

Current staging scope explicitly excludes:

- Public file uploads
- Authentication
- Database persistence
- Persistent user memory
- Voice or microphone behavior
- Avatar/video behavior
- Browser tools
- Web search
- File search
- External actions

## Test Commands

Run before review:

```powershell
npm.cmd run validate:mira-kb
npm.cmd run test:mira-local
npm.cmd run test:mira-api
npm.cmd run test:mira-prompt
npm.cmd run lint
npm.cmd run build
git diff --check
```

## Manual QA Checklist

Use `docs/v2-mira-staging-manual-qa-checklist.md`.

## Known Limitations

- Staging observations must be collected manually from preview logs.
- In-memory rate limiting is best-effort only.
- No durable abuse monitoring or cost quota exists yet.
- No production LLM activation is approved.
- The endpoint does not browse and should not answer current-fact questions.
- Real provider behavior requires continued staging review before any production consideration.

## Requested Review Focus

Please review:

- Prompt injection defenses.
- Secret exposure controls.
- Privacy and logging policy.
- PHI/confidential handling.
- Unsupported compliance claim handling.
- Deterministic fallback behavior.
- Provider error handling.
- Rate limiting and abuse controls.
- Production-mode isolation.

## Production Behavior Confirmation

This package does not enable production LLM behavior. Production must remain mock-only until a separate approval package, legal/privacy review, security review, monitoring plan, and rollback test are complete.
