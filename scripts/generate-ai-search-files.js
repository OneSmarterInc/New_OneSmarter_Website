import fs from "fs";
import path from "path";
import { create } from "xmlbuilder2";
import {
  groupedSiteDirectory,
  promotedSiteDirectory,
  siteBaseUrl,
  siteContact,
  siteDirectory,
} from "../src/data/siteDirectory.js";

const publicDir = path.resolve("public");

// Flip to true only when the production domain is pointed at this deployment.
const siteIsPubliclyIndexable = false;

const writeFile = (relativePath, content) => {
  const targetPath = path.join(publicDir, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${content.trim()}\n`, "utf8");
};

const pageUrl = (route) => `${siteBaseUrl}${route === "/" ? "" : route}`;
const emailContactLink = `[Email OneSmarter](mailto:${siteContact.email})`;
const aiPageUrl = (route) => `${siteBaseUrl}/${markdownPathForRoute(route).replaceAll("\\", "/")}`;

const asList = (items) =>
  items.length ? items.map((item) => `- ${item}`).join("\n") : "- Not specified.";

const approvedContentSection = (page) =>
  page.approvedContent?.length
    ? `\n\n## Approved Content\n${asList(page.approvedContent)}`
    : "";

const hasChildRoutes = (route) =>
  route !== "/" && promotedSiteDirectory.some((page) => page.route.startsWith(`${route}/`));

const markdownPathForRoute = (route) => {
  if (route === "/") {
    return path.join("ai-pages", "index.md");
  }

  const routePath = route.slice(1);
  return hasChildRoutes(route)
    ? path.join("ai-pages", routePath, "index.md")
    : path.join("ai-pages", `${routePath}.md`);
};

const legacyMarkdownPathForRoute = (route) =>
  route === "/" ? "index.html.md" : path.join(route.slice(1), "index.html.md");

const removeLegacyMarkdownMirrors = () => {
  siteDirectory.forEach((page) => {
    const legacyPath = path.join(publicDir, legacyMarkdownPathForRoute(page.route));
    if (fs.existsSync(legacyPath)) {
      fs.rmSync(legacyPath);
    }
  });

  ["policies/privacy-policy.md", "policies/terms-of-use.md"].forEach((relativePath) => {
    const stalePath = path.join(publicDir, relativePath);
    if (fs.existsSync(stalePath)) {
      fs.rmSync(stalePath);
    }
  });

  siteDirectory
    .filter((page) => !page.promoted)
    .forEach((page) => {
      const aiPath = path.join(publicDir, markdownPathForRoute(page.route));
      if (fs.existsSync(aiPath)) {
        fs.rmSync(aiPath);
      }
    });
};

const markdownForPage = (page) => {
  const related = page.relatedRoutes
    .map((route) => {
      if (route === "/contact") {
        return `- ${emailContactLink}`;
      }

      const relatedPage = promotedSiteDirectory.find((item) => item.route === route);
      return relatedPage
        ? `- [${relatedPage.title}](${aiPageUrl(route)})`
        : `- ${pageUrl(route)}`;
    })
    .join("\n");

  return `# ${page.title}

URL: ${pageUrl(page.route)}

## Summary
${page.shortSummary}

## Category
${page.category}

## Audience
${page.audience}

## Key Offerings
${asList(page.keyOfferings)}${approvedContentSection(page)}

## Trust And Compliance Notes
${asList([...new Set([...page.trustNotes, ...page.complianceNotes])])}

## Related Pages
${related || `- ${emailContactLink}`}

## Contact
Email: ${siteContact.email}

Address: ${siteContact.address}`;
};

const llmsIntro = `# OneSmarter

OneSmarter builds secure platforms, practical AI workflows, business services, compliance readiness support, and public-content AI agent concepts for healthcare, financial, telecom, and growing organizations.

## Important Notes
- OneSmarter is SOC 2 Type II Attested.
- OneSmarter has completed an independent HIPAA Security Rule compliance assessment.
- ISO/IEC 27001:2022 Certified (see Trust Center for certified scope).
- Use "HIPAA" exactly. Do not use the common misspelling.
- Do not describe OneSmarter as certified under HIPAA.
- Do not describe OneSmarter as issuing its own ISO/IEC 27001 certificates; certification is granted by an accredited certification body.
- Claims Processing Services are positioned as healthcare technology services, not as a currently available claims product.
- Staffing is not a current public service category.
- Compliance & Cyber Assurance describes services OneSmarter provides to clients.
- Trust Center describes OneSmarter's own security, privacy, SOC 2, HIPAA, ISO/IEC 27001, and compliance posture.`;

const categoryOrder = [
  "Core",
  "Platforms",
  "Technology Solutions",
  "AI Agents",
  "Business Services",
  "Compliance & Cyber Assurance",
  "Trust Center",
  "Legal",
];

removeLegacyMarkdownMirrors();

const llmsSections = categoryOrder
  .filter((category) => groupedSiteDirectory[category])
  .map((category) => {
    const links = groupedSiteDirectory[category]
      .map((page) => {
        const websiteUrl = pageUrl(page.route);
        return `- [${page.title}](${aiPageUrl(page.route)}): ${page.shortSummary} Website: ${websiteUrl}`;
      })
      .join("\n");
    return `## ${category}\n${links}`;
  })
  .join("\n\n");

writeFile(
  "llms.txt",
  `${llmsIntro}

${llmsSections}

## Contact
- Email: ${siteContact.email}
- Address: ${siteContact.address}

## AI Page Mirrors
AI-readable markdown mirrors are published under /ai-pages/ so they do not shadow website routes.`
);

const fullDirectory = promotedSiteDirectory
  .map(
    (page) => `## ${page.title}

Website URL: ${pageUrl(page.route)}

AI mirror URL: ${aiPageUrl(page.route)}

Category: ${page.category}

Audience: ${page.audience}

Summary: ${page.markdownSummary}

Key offerings:
${asList(page.keyOfferings)}${approvedContentSection(page)}

Trust and compliance notes:
${asList([...new Set([...page.trustNotes, ...page.complianceNotes])])}`
  )
  .join("\n\n");

writeFile(
  "llms-full.txt",
  `# OneSmarter Public LLM Reference

This file is a public, AI-readable reference for OneSmarter's website. It summarizes public pages, service taxonomy, approved trust wording, and contact details.

## Public Positioning
OneSmarter is organized around Platforms, Technology Solutions, AI Agents, Business Services, Compliance & Cyber Assurance, and the Trust Center.

## Approved Trust Language
- SOC 2 Type II Attested
- HIPAA Security Rule Compliance Assessment Completed
- Independent HIPAA Security Rule compliance assessment
- Built for HIPAA-regulated workflows
- Designed for PHI-sensitive workflows
- ISO/IEC 27001:2022 Certified (see Trust Center for certified scope)
- Secure software development
- Responsible data handling
- Compliance-aware operations

## Public Taxonomy
${categoryOrder
  .filter((category) => groupedSiteDirectory[category])
  .map((category) => `- ${category}: ${groupedSiteDirectory[category].map((page) => page.title).join("; ")}`)
  .join("\n")}

## Page Directory
${fullDirectory}

## Contact
Email: ${siteContact.email}

Address: ${siteContact.address}

## Claim Boundaries
- Do not describe OneSmarter as certified under HIPAA.
- Do not describe Claims Processing Services as a commercially available claims product.
- Do not describe OneSmarter as issuing SOC reports or ISO/IEC 27001 certificates.
- Use PCI DSS readiness language unless a specific assessment authority is documented.
- Do not describe staffing as a current public service category.`
);

promotedSiteDirectory.forEach((page) => {
  writeFile(markdownPathForRoute(page.route), markdownForPage(page));
});

writeFile(
  "robots.txt",
  siteIsPubliclyIndexable
    ? `User-agent: *
Allow: /

Sitemap: ${siteBaseUrl}/sitemap.xml`
    : `User-agent: *
Disallow: /`
);

const root = create({ version: "1.0" }).ele("urlset", {
  xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
});

promotedSiteDirectory.forEach((page) => {
  root.ele("url").ele("loc").txt(pageUrl(page.route));
});

writeFile("sitemap.xml", root.end({ prettyPrint: true }));

console.log("Success: AI search files, markdown mirrors, robots.txt, and sitemap.xml generated.");
