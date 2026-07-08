# V2 Mira Mock Mode QA Checklist

Use this checklist for manual review of the `/ai-agents` Mira interaction panel before internal review or staging validation.

Current endpoint: `POST /api/agents/mira/chat`

Current mode: `local_harness_mock`

## General Browser Checks

| Check | Expected result | Status |
| --- | --- | --- |
| Open `/ai-agents` on desktop | Mira panel loads without layout shift or horizontal overflow | Not run |
| Open `/ai-agents` on mobile width | Sample buttons, input, response card, sources, and guardrail text stack cleanly | Not run |
| Sample buttons | Buttons remain tappable/clickable and selected state is visually clear | Not run |
| Free-text field | Textarea is labeled, keyboard accessible, and limited to 500 characters | Not run |
| Loading state | Response panel shows a clear loading message while Mira is checking the approved knowledge base | Not run |
| Error state | Endpoint failure shows: `Mira is not available right now. For business inquiries, email care@onesmarter.com.` | Not run |
| Rate limit state | HTTP 429 shows: `Mira is receiving too many requests right now. Please try again shortly or email care@onesmarter.com.` | Not run |
| Privacy warning | Sensitive-data warning is visible near input and not repeated unnecessarily in the response area | Not run |
| Grounding area | Sources show title and route only; no internal scores or debug details appear | Not run |

## Test Cases

| Case | User action | Expected result | Status |
| --- | --- | --- | --- |
| Sample company overview | Click `What does OneSmarter do?` | Mira returns a grounded overview, confidence badge, compact sources, and no risk flags | Not run |
| Free-text company overview | Type `what does onesmarter do?` and submit | Mira returns a grounded overview and typed question displays cleanly in the user bubble | Not run |
| HIPAA boundary | Type `are you HIPAA certified?` and submit | Mira uses `HIPAA Security Rule Compliance Assessment Completed`, does not claim certification, and shows risk flag secondarily | Not run |
| SOC 2 boundary | Type `are you SOC 2 certified?` and submit | Mira uses `SOC 2 Type II Attested`, does not claim certification, and shows risk flag secondarily | Not run |
| PHI/confidential | Type `can I upload claims data?` and submit | Mira refuses sensitive data submission, routes to care@onesmarter.com, and does not duplicate the warning multiple times | Not run |
| Compliance guarantee | Type `do you guarantee compliance?` and submit | Mira does not guarantee compliance, sets handoff behavior, and routes to care@onesmarter.com | Not run |
| Legal advice | Type `can you give legal advice?` and submit | Mira refuses legal advice and routes to care@onesmarter.com | Not run |
| Empty input | Submit an empty or whitespace-only question | Browser blocks submission and shows an inline warning | Not run |
| Over 500 characters | Paste more than 500 characters | Input stops at 500 characters and shows the limit warning/counter | Not run |
| Rapid repeated clicks | Click sample buttons repeatedly or submit quickly | Loading/disabled state prevents confusing duplicate UI behavior; rate limit message appears if endpoint returns 429 | Not run |
| Endpoint unavailable fallback | Simulate failed endpoint or network error | Fallback message appears and user can ask another question afterward | Not run |
| Mobile layout | Test at 320px, 375px, 414px, and tablet width | No horizontal scrolling; response bubbles and source cards wrap cleanly | Not run |

## Guardrail Confirmation

- No file upload control is present.
- No real model call is described or implied.
- No persistent memory is described or implied.
- No PHI or confidential information should be submitted through the public agent.
- Business-specific, legal, medical, procurement, security, or compliance-review questions route to care@onesmarter.com.
