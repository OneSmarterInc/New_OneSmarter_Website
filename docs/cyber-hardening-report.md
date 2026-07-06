# OneSmarter Cyber Hardening & Audit Readiness Report

Date: 2026-07-04

## Executive Summary

The OneSmarter website was reviewed for final cyber hardening and launch readiness. The site now builds cleanly, lints cleanly, has zero known npm audit vulnerabilities, includes Vercel security headers, and has refreshed sitemap, robots, AI, and markdown mirror files.

Recommendation: ready to move to staging after Vercel header validation and a final browser smoke test on the deployed staging URL.

## Files Changed

| File | Change |
| --- | --- |
| `vercel.json` | Added production security headers while preserving SPA rewrite behavior. |
| `index.html` | Removed external Font Awesome kit script; retained GA4 and LLM alternate link. |
| `package.json` | Removed unused packages with vulnerable dependency chains. |
| `package-lock.json` | Refreshed after dependency cleanup, clean install, and audit fix. |
| `eslint.config.js` | Added focused ignores for legacy unrouted source files so active code can lint cleanly. |
| `src/ContextApi/MyProvider.jsx` | Removed unused development API endpoint values from public source. |
| `src/components/Footer.jsx` | Cleaned social icon rendering after lint review. |
| `public/llms.txt` | Regenerated AI-readable public summary. |
| `public/llms-full.txt` | Regenerated full AI-readable public summary. |
| `public/robots.txt` | Regenerated robots file. |
| `public/sitemap.xml` | Regenerated public sitemap. |
| `public/**/*.md` | Regenerated route markdown mirrors. |
| `docs/cyber-hardening-report.md` | Added this hardening report. |

## Dependency Audit

| Command | Result |
| --- | --- |
| `npm ci` | Passed; clean install completed. |
| `npm audit` | Passed; zero known vulnerabilities. |
| `npm outdated` | Non-security updates remain available. Major upgrades were not applied during this hardening pass. |
| `npm run lint` | Passed. |
| `npm run build` | Passed. |

Removed unused packages that were contributing to audit findings: `axios`, `@emotion/react`, `@emotion/styled`, `@fortawesome/fontawesome-svg-core`, `fa`, and `or`.

Remaining upgrade candidates include Vite, Rollup, React, React Router, Tailwind, Font Awesome, ESLint packages, Framer Motion, Lucide, React Icons, and React Toastify. These should be handled as a separate upgrade/test work package.

## Security Headers

The following headers were added in `vercel.json`:

| Header | Status |
| --- | --- |
| `Content-Security-Policy` | Added with self default, no object embedding, no framing, restricted scripts/styles/fonts/connect sources, and HTTPS upgrade. |
| `X-Content-Type-Options` | Added with `nosniff`. |
| `Referrer-Policy` | Added with `strict-origin-when-cross-origin`. |
| `Permissions-Policy` | Added to deny camera, microphone, geolocation, payment, USB, and interest cohort access. |
| `Strict-Transport-Security` | Added with one-year max age only for safer pre-production rollout. |
| `X-Frame-Options` | Added with `DENY`. |

Notes:

- GA4 currently requires the Google Tag Manager script source and analytics connection endpoints.
- Google Fonts are allowed for stylesheet/font loading.
- Script inline allowance was removed after moving analytics bootstrap into a self-hosted script. Style inline allowance remains because the current app may depend on framework/runtime inline styles.
- Vercel should be checked after deployment to confirm headers are applied to all routes and static assets as expected.

## Public Exposure Review

| Area | Finding |
| --- | --- |
| Sensitive credentials | Targeted scan found no exposed credential values or environment variables in source, public files, or build output. |
| Development endpoints | Removed unused loopback API configuration from `src/ContextApi/MyProvider.jsx`. |
| Source maps | No production source maps were found in `dist`. |
| Public archive risk | Prior cleanup removed the large archive and old downloaded site snapshots; no new archive files were added. |
| Legacy source | Some unrouted legacy components remain in `src`. They are not linked in current navigation but should be archived in a later cleanup pass. |
| Git metadata | The local `.git` directory in this workspace appears empty/unusable, so normal git status/diff was not available. |

## Third-Party Domain Inventory

| Domain | Purpose | Notes |
| --- | --- | --- |
| `www.onesmarter.com` | Canonical URLs, sitemap, markdown mirrors, structured metadata. | Expected. |
| `www.googletagmanager.com` | GA4 script loading. | Allowed in CSP script/connect directives. |
| `www.google-analytics.com` | GA4 event collection. | Allowed in CSP connect directive. |
| `region1.google-analytics.com` | Regional GA4 event collection. | Allowed in CSP connect directive. |
| `analytics.google.com` | GA-related collection endpoint. | Allowed in CSP connect directive. |
| `stats.g.doubleclick.net` | GA-related measurement endpoint. | Allowed in CSP connect directive. |
| `fonts.googleapis.com` | Google Fonts stylesheet. | Allowed in CSP style directive. |
| `fonts.gstatic.com` | Google Fonts assets. | Allowed in CSP font directive. |
| `facebook.com`, `x.com`, `linkedin.com` | Footer and mobile social profile links. | Outbound links only. |

Legacy unrouted source still contains old product links to external domains. They are not active in the current route graph and should be removed when legacy components are archived.

## Contact/API Review

| Item | Finding |
| --- | --- |
| Contact form/API | No active public contact API submission path was identified in the current app. |
| Email link | `mailto:care@onesmarter.com` remains the active contact path. |
| Phone link | `tel:+19373446241` remains present and properly scoped. |
| Address | Public footer/contact address remains present. |
| Client-side API config | Removed unused development endpoint values from the context provider. |

If a live form is added later, it should include server-side validation, spam/rate controls, clear privacy handling, and no client-exposed service secrets.

## Route and Redirect Findings

Preview route checks confirmed the production app shell serves all reviewed active routes, legal routes, and legacy redirect entry points.

Source and build inspection confirmed:

- Old staffing paths redirect to `/business-services/eor-hr`.
- The old claims route redirects to `/technology-solutions/claims-processing-services`.
- Current sitemap includes the new active routes and excludes the old claims platform route.
- Current AI files describe claims work as services and place it under Technology Solutions.

The current wildcard route redirects unknown paths to `/`. A dedicated Not Found page is still recommended for better SEO, analytics, and user clarity, but it was not added in this pass to avoid route behavior changes.

## AI and LLM Readability Review

| File | Finding |
| --- | --- |
| `public/llms.txt` | Regenerated and aligned with the current service architecture. |
| `public/llms-full.txt` | Regenerated with route summaries and internal AI guidance. |
| `public/robots.txt` | Regenerated and points to the public sitemap. |
| `public/sitemap.xml` | Regenerated and aligned with active public routes. |
| `dist/*` | Build output includes regenerated AI/search files. |

The public AI files do not publish private credentials or internal operational secrets. They include positioning guidance and compliance wording controls intended for crawlers and AI systems.

## Prohibited Language Review

Scans across `src`, `public`, `dist`, documentation, scripts, `index.html`, and `vercel.json` found no instances of the barred HIPAA certification wording, the common HIPAA typo, the old staffing public label, old claims platform wording, unsupported priority claims, the old homepage art slogan, or the old claims portal project name.

## Verification Log

| Check | Result |
| --- | --- |
| Regenerate AI/search files | Passed. |
| Regenerate sitemap | Passed. |
| Clean install | Passed. |
| Dependency audit | Passed, zero known vulnerabilities. |
| Dependency freshness | Outdated packages remain; no known audit vulnerabilities. |
| Lint | Passed. |
| Production build | Passed. |
| Preview route shell check | Passed for reviewed routes. |
| Source map check | Passed; none found. |
| Targeted secret scan | Passed. |
| Prohibited wording scan | Passed. |

## Remaining Risks and Follow-Up

| Priority | Item | Recommendation |
| --- | --- | --- |
| High | Validate headers on deployed Vercel staging. | Use browser dev tools or `curl -I` against staging and production routes after deployment. |
| Medium | Legacy unrouted components remain in `src`. | Archive or remove in a later cleanup work package after confirming no business owner needs them. |
| Medium | Framework/library upgrades remain available. | Run a separate dependency modernization pass with visual regression testing. |
| Medium | CSP still allows inline styles. | Move style dependencies toward nonce/hash-compatible patterns in a later hardening pass. |
| Medium | Unknown routes redirect home. | Add a dedicated Not Found route/page in a future SEO stabilization pass. |
| Low | Public social links should be business-verified. | Confirm profile URLs and remove any profile no longer maintained. |

## Final Recommendation

The site is ready for staging from a cyber-hardening and audit-readiness standpoint, with the condition that the Vercel-deployed headers are verified on the actual staging domain before production launch.
