# Mira Production Abuse Controls

Date: 2026-07-19
Branch: `v2/agent-showcase`

This document records the production abuse-control and spend-control requirements for Mira before any real public LLM launch.

## Current State

- The current endpoint includes a best-effort in-memory rate limiter.
- The limiter is suitable for staging and preview smoke testing only.
- Vercel serverless instances may not share memory consistently, so this is not a durable production-grade limiter.
- The endpoint already enforces server-side message, history, and output-token controls.
- Production remains mock-only unless separately reviewed and approved.

## Production Requirements

| Control | Requirement |
|---|---|
| Durable shared limiter | Use a shared store or edge-compatible rate-limit service so limits apply across instances. |
| Per-IP ceiling | Enforce a requests-per-minute cap per IP or trusted client key. |
| Global ceiling | Enforce a total requests-per-minute ceiling to protect spend during abuse events. |
| Daily quota | Add daily request and token ceilings for the Mira endpoint. |
| Monthly quota | Add monthly budget guardrails tied to provider spend limits. |
| Message length | Keep server-side message length limits; current maximum is 1000 characters. |
| History length | Keep server-side history count and total-character caps. |
| Token limits | Keep provider output-token limits server-side; do not accept client token settings. |
| Provider budget alerts | Configure OpenAI project budget and spend alerts before public launch. |
| Abuse monitoring | Track safe metadata only: request ID, timestamp, status, risk flags, confidence, source IDs, provider status, token counts, fallback reason. |
| Emergency switch | Set `MIRA_LLM_MODE=mock` to disable real provider calls immediately. |

## Recommended Implementation Options

1. Vercel KV / Redis-compatible durable limiter
   - Good fit for Vercel deployments.
   - Supports per-IP and global counters.
   - Requires dependency and environment review.

2. Edge middleware plus durable store
   - Can reject abusive traffic before serverless function execution.
   - Requires careful Preview/Production origin handling.

3. Provider-side budget controls
   - Necessary but not sufficient.
   - Should be paired with app-side limits because provider alerts may lag.

4. WAF or gateway controls
   - Useful if traffic patterns become hostile.
   - Should not replace app-level prompt and safety gates.

## Safe Logging Policy

Log only:

- request ID
- timestamp
- endpoint
- method
- status
- mode
- conversation ID
- message length
- conversation history count and total characters
- risk flags
- handoff state
- confidence
- matched source IDs
- provider status
- provider HTTP status
- safe provider error type/code/param/request ID
- token usage counts
- fallback state and reason

Do not log:

- API keys
- raw prompts
- full user messages
- full answers
- raw provider responses
- PHI or confidential content
- Vercel bypass secrets

## Rollback

Immediate rollback path:

1. Set `MIRA_LLM_MODE=mock`.
2. Confirm endpoint returns `mode: local_harness_mock`.
3. Confirm `fallbackUsed` is not reporting provider failures for ordinary questions.
4. Confirm `/ai-agents` UI continues working without frontend changes.

## Production Gate

Mira should not be opened to broad public real-provider traffic until the durable limiter, quota plan, budget alerts, monitoring, privacy disclosures, and emergency rollback test are complete.
