# Mira Vale Approved Public Knowledge Base

## Purpose

This document explains the approved public knowledge base for Mira Vale, the first proposed production OneSmarter guide agent.

The knowledge base is data and structure only. It does not add a backend endpoint, API keys, live AI calls, uploads, authentication, database storage, voice, video, avatar behavior, or a live chatbot widget.

Mira's first production scope is narrow: answer visitor questions about OneSmarter using only approved public website content, then route uncertain or business-specific questions to care@onesmarter.com.

## Files

| File | Purpose |
| --- | --- |
| `src/data/agentKnowledge/onesmarterPublicKb.js` | Curated approved public knowledge entries for Mira |
| `src/data/agentKnowledge/miraClaimRules.js` | Claim-boundary rules, safer wording, refusal patterns, handoff patterns, and risky topic categories |
| `src/data/agentKnowledge/miraTestQuestions.js` | Test fixtures for expected Mira behavior |

## Knowledge Entry Structure

Each knowledge entry includes:

| Field | Purpose |
| --- | --- |
| `id` | Stable internal identifier for retrieval and testing |
| `route` | Canonical OneSmarter website route |
| `title` | Human-readable topic title |
| `category` | Broad content area such as Platforms, Trust Center, or Business Services |
| `approvedSummary` | Short answer foundation Mira may use |
| `sourceFacts` | Specific facts from approved public content |
| `allowedClaims` | Phrases or concepts Mira may use when relevant |
| `disallowedClaims` | Phrases or claims Mira must avoid |
| `handoffGuidance` | When to route the visitor to care@onesmarter.com |
| `relatedQuestions` | User questions the entry is meant to support |
| `sourceLabel` | Human-readable source reference for review |

## Included Knowledge Areas

The initial knowledge base covers:

- OneSmarter overview.
- Secure Ticketing and Case Management.
- Bill Audit & Bill Pay.
- Technology Solutions overview.
- Claims Processing Services.
- AI Agentic Services.
- Business Services overview.
- Compliance & Cyber Assurance overview.
- Trust Center overview.
- SOC 2 Type II Attested.
- HIPAA Security Rule Compliance Assessment Completed.
- Security Practices.
- Privacy and Terms high-level guidance.
- Contact and business inquiry handoff.

## Claim Rules

`miraClaimRules.js` centralizes the language boundaries Mira must follow.

The rules include:

- Approved phrases Mira may use.
- Prohibited phrases Mira must not use as claims.
- Replacement wording for risky language.
- Refusal patterns for PHI, confidential data, legal advice, medical advice, unsupported compliance claims, unknown answers, and prompt injection attempts.
- Handoff patterns for business-specific topics.
- Risky topic categories for future safety checks.

Required language boundaries include:

- Use `SOC 2 Type II Attested`.
- Use `HIPAA Security Rule Compliance Assessment Completed`.
- Do not guarantee compliance.
- Do not imply OneSmarter issues SOC reports, ISO certificates, or official HIPAA certifications.
- Route business-specific compliance and security requests to care@onesmarter.com.

The exact risky phrases are stored only as prohibited examples so future runtime checks can block or rewrite them. They should not be used as public marketing claims.

## What Mira May Answer

Mira may answer questions grounded in the approved knowledge base, including:

- What OneSmarter does.
- What platforms OneSmarter presents publicly.
- What Secure Ticketing and Case Management means.
- What Bill Audit & Bill Pay means.
- How telecom expense management fits under Bill Audit & Bill Pay.
- What Technology Solutions include.
- What Claims Processing Services are, using service-oriented language.
- What AI Agentic Services are at a high level.
- What Business Services include.
- What Compliance & Cyber Assurance services mean as readiness and support services.
- What the Trust Center is.
- What OneSmarter's SOC 2 and HIPAA trust language says.
- Where to send business inquiries.

## What Mira Must Hand Off

Mira should route to care@onesmarter.com when a question involves:

- Pricing.
- Procurement.
- Contracts.
- Security questionnaires.
- SOC 2 report access.
- HIPAA evidence requests.
- Business-specific compliance or security scope.
- Regulated workflow implementation details.
- Legal advice.
- Medical advice.
- Privacy or terms interpretation.
- PHI.
- Confidential documents or private operational details.
- Questions not grounded in the approved knowledge base.

## Test Fixtures

`miraTestQuestions.js` provides initial test questions and expected handling for:

- Company overview.
- Platforms.
- Healthcare organizations.
- HIPAA wording boundaries.
- SOC 2 wording boundaries.
- Compliance guarantees.
- Claims data or PHI upload attempts.
- Legal advice requests.
- Contact path.
- Telecom expense management positioning.
- Bill Audit & Bill Pay.
- Secure Ticketing and Case Management.

These fixtures are not wired into an automated test runner yet. They are intended to become the first safety and grounding test set in a future backend package.

## Validator

Run the local validator with:

```powershell
npm.cmd run validate:mira-kb
```

### What The Validator Checks

The validator checks:

- The knowledge base export loads successfully.
- The claim rules export loads successfully.
- The test question export loads successfully.
- Every knowledge entry has the required fields.
- Every knowledge entry has a unique `id`.
- Every knowledge entry has a non-empty `approvedSummary`.
- Every knowledge entry has `sourceFacts`, `allowedClaims`, `disallowedClaims`, `handoffGuidance`, and `relatedQuestions`.
- Every test fixture has a question and `expectedHandling`.
- Test fixture IDs are unique.
- Risky wording appears only in intentional rule, test, or `disallowedClaims` contexts.

### When It Must Be Run

The validator must be run:

- After adding or editing any Mira knowledge entry.
- After changing claim rules.
- After changing test fixtures.
- Before any backend/API endpoint uses the knowledge base.
- Before internal review, security review, or limited public launch.

Intentional prohibited phrase test cases should remain in clearly marked rule or test contexts only:

- `miraClaimRules.js` prohibited phrase lists.
- `miraClaimRules.js` replacement or avoidance rules.
- `miraTestQuestions.js` questions that intentionally test risky wording.
- `onesmarterPublicKb.js` `disallowedClaims` fields.

Do not put prohibited wording in `approvedSummary`, `sourceFacts`, `allowedClaims`, `handoffGuidance`, or public response examples unless the wording is explicitly part of a correction or refusal pattern.

## Local Retrieval And Safety Harness

The local Mira harness lives in `src/data/agentKnowledge/miraLocalEngine.js`.

It is a deterministic behavior layer for local testing only. It does not call an AI model, create a backend endpoint, browse the internet, store chats, accept uploads, or change the `/ai-agents` UI.

The engine exports:

- `normalizeQuestion(question)`
- `detectRiskFlags(question, claimRules)`
- `scoreKbEntry(question, entry)`
- `retrieveMiraContext(question, options)`
- `buildSafeAnswerSeed(question, retrievalResult)`
- `runMiraLocalHarness(question, options)`

The engine works by:

- Preserving the original visitor question for display and response context.
- Applying deterministic typo and alias normalization internally for approved company, service, compliance, healthcare, legal, medical, and prompt-injection terms.
- Running safety checks against both the original text and the normalized text so misspellings do not bypass PHI, legal, compliance, or prompt-injection rules.
- Tokenizing the question and approved KB entries.
- Applying simple topic expansion for healthcare, platforms, contact, telecom, SOC 2, HIPAA, legal/privacy, and AI topics.
- Scoring KB entries using title, category, route, related questions, approved summaries, source facts, and allowed claims.
- Detecting risk flags for claim-boundary questions, legal or medical advice, PHI or confidential data, business-specific reviews, prompt injection, and out-of-scope requests.
- Returning a structured answer seed with matched entries, confidence, risk flags, handoff state, handoff reason, and suggested follow-up prompts.

The deterministic normalizer lives in `src/data/agentKnowledge/miraIntentNormalizer.js`. It uses explicit aliases and bounded known-vocabulary replacements only; it does not globally autocorrect arbitrary text. Examples include OneSmarter aliases, platform/service typos, HIPAA/SOC 2 wording variants, PHI/claims wording, legal/medical typos, and prompt-injection typos.

The normalizer also exposes a future seam:

`normalizeMiraIntent({ originalMessage, normalizedMessage, retrievalConfidence, riskFlags })`

Current method: `deterministic`.

A future method may be `staging_llm_normalizer`, but only for low-confidence questions that appear OneSmarter-related and are not safety-rule, PHI/confidential, legal, medical, compliance-guarantee, prompt-injection, or clearly out-of-scope cases. No second LLM call exists yet.

Run the local engine tests with:

```powershell
npm.cmd run test:mira-local
```

The local test script uses `miraTestQuestions.js` and checks:

- Expected risk flags appear.
- Expected handling categories match.
- In-scope questions retrieve approved KB entries.
- Handoff-required questions set `handoffNeeded`.
- `answerSeed` is non-empty.
- `answerSeed` avoids unsafe prohibited phrases.
- Required fixture themes appear where expected.
- Typo-equivalence cases preserve the original text internally while matching the correctly spelled intent, risk flags, handoff behavior, confidence band, and approved source coverage.

The local engine does not yet:

- Generate final conversational answers.
- Call an LLM.
- Use embeddings or semantic search.
- Persist chat history.
- Apply server-side rate limiting.
- Log production telemetry.
- Accept private documents or file uploads.
- Replace legal, medical, compliance, security, or procurement review.

This prepares for a future backend/API layer by proving that approved public content, risk detection, handoff behavior, and fixture-based safety checks can run before any model call is introduced.

## Mock API Contract

The first production-shaped mock endpoint is:

`POST /api/agents/mira/chat`

Files:

- `api/agents/mira/chat.js`
- `api/agents/mira/chatCore.js`
- `scripts/test-mira-api-contract.js`

The endpoint runs in `local_harness_mock` mode. It calls `runMiraLocalHarness` and returns a structured response with `answer`, `answerSeed`, confidence, risk flags, matched sources, handoff status, suggested follow-ups, and a disclaimer when needed.

The `/ai-agents` Mira conversation panel now calls this mock endpoint when a visitor clicks one of the sample question buttons or submits a controlled typed question. The UI formats the endpoint response into a main answer, related topics, handoff note when needed, confidence badge, risk flags when present, matched source titles/routes in a compact grounding area, and the endpoint privacy reminder.

The typed question field is intentionally constrained:

- 500-character client-side limit.
- Empty submissions are blocked.
- PHI/confidential-information warning is shown near the input.
- No file uploads.
- No persistent user memory.
- No real model call.

The endpoint still enforces its own 1000-character server-side limit.

PHI and confidential-data warnings are deduplicated in the mock endpoint response so the user sees one clear safety message: do not submit sensitive information through the public agent, and route business-specific questions to care@onesmarter.com.

Every mock endpoint response includes:

- `requestId`
- `timestamp`
- `agent`
- `mode`
- `conversationId` when available

Every successful response also includes:

- `privacyReminder`: `Do not submit PHI, confidential documents, or private operational details through this public agent.`

The endpoint includes a best-effort in-memory rate limiter:

- Limit: 20 requests per minute per key.
- Key: IP from request headers when available, otherwise an anonymous fallback key.
- Rate-limited responses use HTTP `429`, `error: "rate_limited"`, and `retryAfterSeconds`.

This is not a final production-grade rate limiter because Vercel serverless function memory may not persist reliably between invocations.

The endpoint logs safe structured events to console for now. Logged fields include request ID, timestamp, endpoint, method, status, mode, conversation ID, message length, risk flags, handoff status, confidence, matched source IDs, and error code.

The endpoint intentionally does not log full user messages, PHI, confidential content, full answer text, raw request bodies, or stack traces.

Normalized error responses include `requestId`, `timestamp`, `status`, `error`, and a safe user-facing `message`.

Request body:

```json
{
  "message": "string",
  "conversationId": "optional string",
  "persona": "optional string",
  "memoryTheme": "optional string",
  "empathyState": "optional string"
}
```

Response body:

```json
{
  "agent": "Mira Vale",
  "mode": "local_harness_mock",
  "conversationId": "string",
  "answer": "string",
  "answerSeed": "string",
  "confidence": "high | medium | low",
  "riskFlags": [],
  "handoffNeeded": true,
  "handoffReason": "string or null",
  "matchedSources": [],
  "suggestedFollowUps": [],
  "disclaimer": "string"
}
```

Run the API contract tests with:

```powershell
npm.cmd run test:mira-api
```

The mock endpoint does not yet:

- Call a real AI model.
- Use API keys.
- Store conversations.
- Add authentication.
- Accept file uploads.
- Replace legal, medical, compliance, security, or procurement review.

This prepares for later real LLM integration by fixing the request/response shape, input validation behavior, privacy warning behavior, and source-grounded safety metadata before a model call is introduced.

## Adding Future Entries

When adding a new knowledge entry:

1. Confirm the source is approved public OneSmarter content.
2. Add a stable `id`.
3. Use the canonical website `route`.
4. Write a short `approvedSummary`.
5. Add factual `sourceFacts`, not marketing invention.
6. Add `allowedClaims`.
7. Add `disallowedClaims`, especially for trust, security, healthcare, and compliance topics.
8. Add clear `handoffGuidance`.
9. Add realistic `relatedQuestions`.
10. Add or update test fixtures.
11. Run lint, build, and prohibited-phrase scans.

## Review Process Before Production Use

Before Mira uses this knowledge base in production:

1. Product review confirms service positioning.
2. Security review confirms no sensitive operational detail is exposed.
3. Compliance review confirms HIPAA, SOC 2, readiness, and trust wording boundaries.
4. Legal/privacy review confirms Privacy Policy, Terms, analytics, logging, and consent language.
5. Engineering review confirms the backend uses this data as grounding and does not answer from unapproved sources.
6. Test matrix review confirms risky questions are refused or handed off.
7. Fable/security review is completed before limited public launch.

## Current Non-Goals

- No live agent.
- No API keys.
- No backend endpoint.
- No real AI calls.
- No uploads.
- No authentication.
- No database.
- No voice, video, or avatar implementation.
- No live chatbot widget.
- No internet browsing.
- No changes to the V1 homepage, legal/privacy pages, security headers, Contact behavior, Insights behavior, or platform list.
