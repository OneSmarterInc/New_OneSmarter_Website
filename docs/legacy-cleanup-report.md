# Legacy Cleanup Report

## Scope

Work Package 5A removed obvious non-production files, redirected old public routes to the current architecture, cleaned stale public markdown, and removed remaining legacy public-language artifacts before the cyber hardening pass.

## Files Removed

- `onesmarterweb-main.zip`
- `public/vite.svg`
- `src/assets/react.svg`
- `src/assets/Content Management System.html`
- `src/assets/Content Management System_files/`
- `src/assets/loginbg.html`
- `src/assets/loginbg_files/`
- `public/as400services.md`
- `public/contact.md`
- `public/contacts/`
- `public/products/`
- `public/services/`
- `public/aboutus/Introduction.md`
- `public/aboutus/Mission.md`
- `public/aboutus/Vision.md`

## Routes Redirected

- `/as400services` -> `/technology-solutions/ibm-i-as400`
- `/products/Intelligent` -> `/technology-solutions/ai-agentic-services`
- `/products/Knowledge` -> `/technology-solutions/enterprise-software`
- `/products/Smart` -> `/technology-solutions/healthcare-tpa`
- `/products/:value` -> `/technology-solutions`
- `/services/architecture` -> `/technology-solutions/enterprise-software`
- `/services/cyber` -> `/compliance-assurance`
- `/services/data` -> `/technology-solutions/enterprise-software`
- `/services/digital` -> `/technology-solutions/ai-agentic-services`
- `/services/enterprise` -> `/technology-solutions/enterprise-software`
- `/services/programming` -> `/technology-solutions/enterprise-software`
- `/services/:value` -> `/technology-solutions`

Existing redirects remain in place:

- `/services/staffing` and `/services/staffing/*` -> `/business-services/eor-hr`
- `/platforms/claims-processing-system` -> `/technology-solutions/claims-processing-services`

## Language Cleanup

- Replaced outdated About copy with current, understated positioning.
- Removed outdated programming-art wording from legacy source components.
- Removed stale public markdown containing old service, product, AS400, contact, and about copy.
- Confirmed prohibited wording does not appear in source, public files, scripts, README, or generated build output.

## Files Left In Place

These source files are no longer exposed through active public routes after redirect cleanup, but were left in place to avoid an aggressive purge before Work Package 6:

- `src/Pages/*` legacy staffing page components
- `src/components/ScrollableImage.jsx`
- `src/components/ScrollableImage2.jsx`
- `src/components/Products.jsx`
- `src/components/AS400Services.jsx`
- `src/components/servicesPage.jsx`
- `src/components/Services.jsx`
- `src/components/Strengths.jsx`
- `old_aboutus.jsx`

## Legacy Assets Requiring Later Review

Large or legacy assets still present and recommended for archive review:

- `src/Images/ai2.mp4`
- `src/Images/S*.png` and `src/Images/S*.webp`
- `src/Images/service1.png` through `src/Images/service4.png`
- `src/Images/chef.png`
- `src/Images/delicious.png`
- `src/Images/kitchen2.png`
- `src/Images/Professionals.png`
- `src/Images/staffing.png`
- `src/assets/onesmarterLife.mp4`
- `src/assets/drv.png`
- `src/assets/john.png`, `src/assets/john2.png`, `src/assets/john3.png`, `src/assets/john4.png`
- `src/assets/team-collage-new.png`
- `public/bg.jpeg`
- `public/servicesimg.png`

## Build Result

- `node scripts/generate-ai-search-files.js`: passed.
- `node generate-sitemap.js`: passed.
- `npm.cmd run build`: passed.

## Remaining Risks Before Work Package 6

- Legacy source components and legacy image sets remain in the repository even though public routes now redirect away from them.
- Public legal policy pages remain intentionally unchanged and still need legal review before production launch.
- Unknown routes still redirect to the homepage; a dedicated Not Found page is recommended.
- Work Package 6 should perform the final cyber hardening pass, including deployment headers and public exposure review.
