# OneSmarter Legal Review Notes

Date: 2026-07-05

## Production Legal Review Items

- Privacy Policy and Terms Of Use require legal review before production launch.
- GA4 analytics disclosure, consent language, and any consent UI wording must be confirmed before analytics is enabled for non-essential tracking.
- Privacy Policy must be reviewed for Google Analytics / GA4, Consent Mode default denied behavior, whether cookieless pings are used, whether no cookie banner is intentional, and opt-out language.
- HIPAA and SOC 2 language should remain factual, evidence-based, and non-certification-based.
- HSTS preload and subdomain coverage should be reconsidered only after all OneSmarter subdomains are inventoried and confirmed HTTPS-ready.

## Mira AI Production Privacy Requirements

Before any public production launch of Mira with a real LLM provider, the Privacy Policy must be reviewed and updated by counsel to disclose:

- Mira is an AI service.
- User message text and limited browser-session conversation history may be sent to OpenAI for processing.
- OneSmarter does not provide upload functionality in this release.
- Conversation continuity is browser-session only on OneSmarter's side; no persistent user memory is implemented in this release.
- Users must not submit PHI, credentials, confidential documents, or private operational data.
- Provider retention, processing, and data-handling terms must be described accurately after legal and provider review.

Do not treat this section as legal advice or as final privacy-policy language. It is a production-readiness checklist for legal review.
