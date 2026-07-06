import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSiteEntry, siteBaseUrl, siteContact, siteDirectory } from "./data/siteDirectory";

export const ROUTE_METADATA = Object.fromEntries(
  siteDirectory.map((page) => [
    page.route,
    {
      title: page.title,
      description: page.metaDescription,
      canonical: `${siteBaseUrl}${page.route === "/" ? "" : page.route}`,
      category: page.category,
    },
  ])
);

export const ROUTE_TITLES = Object.fromEntries(
  siteDirectory.map((page) => [page.route, page.title])
);

const legacyTitles = {
  "/aboutus/Mission": "Mission | About | OneSmarter Inc.",
  "/aboutus/Vision": "Vision | About | OneSmarter Inc.",
  "/products/Intelligent": "Products | OneSmarter Inc.",
  "/products/Knowledge": "Products | OneSmarter Inc.",
  "/products/Smart": "Products | OneSmarter Inc.",
  "/as400services": "AS400 Services | OneSmarter Inc.",
  "/services/architecture": "Services | OneSmarter Inc.",
  "/services/cyber": "Services | OneSmarter Inc.",
  "/services/data": "Services | OneSmarter Inc.",
  "/services/digital": "Services | OneSmarter Inc.",
  "/services/enterprise": "Services | OneSmarter Inc.",
  "/services/programming": "Services | OneSmarter Inc.",
};

const upsertMeta = (selector, attrs) => {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    Object.entries(attrs.identity).forEach(([key, value]) => node.setAttribute(key, value));
    document.head.appendChild(node);
  }
  Object.entries(attrs.values).forEach(([key, value]) => node.setAttribute(key, value));
};

const upsertCanonical = (href) => {
  let node = document.head.querySelector('link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
};

const createBreadcrumb = (page) => {
  const segments = page.route.split("/").filter(Boolean);
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: siteBaseUrl,
    },
  ];

  segments.forEach((segment, index) => {
    const route = `/${segments.slice(0, index + 1).join("/")}`;
    const relatedPage = getSiteEntry(route);
    items.push({
      "@type": "ListItem",
      position: index + 2,
      name: relatedPage?.title?.replace(" | OneSmarter", "") || segment.replaceAll("-", " "),
      item: `${siteBaseUrl}${route}`,
    });
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
};

const schemaTypeForPage = (page) => {
  if (page.serviceType === "Software platform") {
    return "SoftwareApplication";
  }
  if (
    page.category === "Technology Solutions" ||
    page.category === "Business Services" ||
    page.category === "Compliance & Cyber Assurance" ||
    page.serviceType === "Platform and service"
  ) {
    return "Service";
  }
  return "WebPage";
};

const createPageSchema = (page) => {
  const type = schemaTypeForPage(page);
  const base = {
    "@context": "https://schema.org",
    "@type": type,
    name: page.title.replace(" | OneSmarter", ""),
    url: `${siteBaseUrl}${page.route === "/" ? "" : page.route}`,
    description: page.metaDescription,
  };

  if (type === "Service") {
    return {
      ...base,
      provider: {
        "@type": "Organization",
        name: "OneSmarter",
        url: siteBaseUrl,
      },
      serviceType: page.serviceType,
      areaServed: "United States",
    };
  }

  if (type === "SoftwareApplication") {
    return {
      ...base,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      publisher: {
        "@type": "Organization",
        name: "OneSmarter",
        url: siteBaseUrl,
      },
    };
  }

  return base;
};

const buildJsonLd = (page) => {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OneSmarter",
    url: siteBaseUrl,
    email: siteContact.email,
    telephone: siteContact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "707 Miamisburg-Centerville Road, STE 223",
      addressLocality: "Dayton",
      addressRegion: "OH",
      postalCode: "45459",
      addressCountry: "US",
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OneSmarter",
    url: siteBaseUrl,
  };

  const graph = [organization, website, createPageSchema(page)];
  if (page.route !== "/") {
    graph.push(createBreadcrumb(page));
  }

  return JSON.stringify(graph);
};

const upsertJsonLd = (page) => {
  let node = document.head.querySelector('script[data-onesmarter="jsonld"]');
  if (!node) {
    node = document.createElement("script");
    node.type = "application/ld+json";
    node.dataset.onesmarter = "jsonld";
    document.head.appendChild(node);
  }
  node.textContent = buildJsonLd(page);
};

const TitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const page = getSiteEntry(location.pathname);
    const metadata = ROUTE_METADATA[location.pathname];
    const title = metadata?.title || legacyTitles[location.pathname] || "OneSmarter Inc.";
    const description =
      metadata?.description ||
      "OneSmarter builds secure platforms, practical AI workflows, business services, and compliance readiness support.";
    const canonical =
      metadata?.canonical || `${siteBaseUrl}${location.pathname === "/" ? "" : location.pathname}`;

    document.title = title;
    upsertMeta('meta[name="description"]', {
      identity: { name: "description" },
      values: { content: description },
    });
    upsertMeta('meta[property="og:title"]', {
      identity: { property: "og:title" },
      values: { content: title },
    });
    upsertMeta('meta[property="og:description"]', {
      identity: { property: "og:description" },
      values: { content: description },
    });
    upsertMeta('meta[property="og:url"]', {
      identity: { property: "og:url" },
      values: { content: canonical },
    });
    upsertMeta('meta[property="og:type"]', {
      identity: { property: "og:type" },
      values: { content: "website" },
    });
    upsertCanonical(canonical);

    if (page) {
      upsertJsonLd(page);
    }

    if (
      typeof window.gtag === "function" &&
      typeof window.onesmarterCanTrackAnalytics === "function" &&
      window.onesmarterCanTrackAnalytics()
    ) {
      window.gtag("event", "page_view", {
        page_title: title,
        page_path: location.pathname + location.search,
        page_location: window.location.href,
      });
    }
  }, [location.pathname, location.search]);

  return null;
};

export default TitleUpdater;
