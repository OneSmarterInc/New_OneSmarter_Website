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
