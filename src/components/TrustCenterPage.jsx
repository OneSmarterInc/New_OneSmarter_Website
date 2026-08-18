import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  LockKeyhole,
  FileCheck2,
  Eye,
  ArrowRight,
  ClipboardCheck,
  Settings,
  RefreshCw,
  Handshake,
  ClipboardList,
  KeyRound,
  Building2,
  UserCog,
  Code2,
  AlertTriangle,
  SearchCheck,
  Siren,
  Users,
  TrendingUp,
} from "lucide-react";
import soclogo from "../assets/soc1.png";
import isoLogo from "../assets/ISO.jpeg";
import HipaaBadge from "./HipaaBadge";

const trustLinks = [
  {
    title: "SOC 2",
    path: "/trust-center/soc2",
    copy: "Independent SOC 2 Type II attestation supporting OneSmarter's controls-oriented operating practices.",
  },
  {
    title: "HIPAA",
    path: "/trust-center/hipaa",
    copy: "Independent HIPAA Security Rule compliance assessment for applicable safeguards and practices.",
  },
  {
    title: "ISO/IEC 27001",
    path: "/trust-center/iso-27001",
    copy: "Independent ISO/IEC 27001 certification supporting OneSmarter's information security management system.",
  },
  {
    title: "Security Practices",
    path: "/trust-center/security-practices",
    copy: "Secure software development, access control, change management, and incident response readiness.",
  },
  {
    title: "Privacy",
    path: "/trust-center/privacy",
    copy: "Responsible data handling, limited access, client confidentiality, and privacy-aware operations.",
  },
];

const highlights = [
  "SOC 2 Type II Attested",
  "HIPAA Security Rule Compliance Assessment Completed",
  "ISO/IEC 27001 Certified",
  "Secure Software Development Practices",
  "Responsible Data Handling",
  "Compliance-Aware Operations",
];

const detailPages = {
  soc2: {
    eyebrow: "Trust Center",
    title: "SOC 2 Type II Attested",
    intro:
      "OneSmarter has completed a SOC 2 Type II attestation as part of its ongoing security and operational controls program. The Trust Center summarizes this posture in factual, client-review-friendly terms.",
    sections: [
      {
        title: "Independent Attestation",
        copy:
          "OneSmarter's SOC 2 Type II Attested status reflects an independent review of controls over a defined assessment period.",
      },
      {
        title: "Security Controls",
        copy:
          "Security controls support access management, operational consistency, controlled delivery, and responsible handling of client workflows.",
      },
      {
        title: "Operational Discipline",
        copy:
          "OneSmarter maintains process discipline around delivery, change handling, documentation, and support activities.",
      },
      {
        title: "Ongoing Monitoring and Improvement",
        copy:
          "The company treats trust as an operating practice, with ongoing review, monitoring, and improvement of relevant controls.",
      },
      {
        title: "Client Trust",
        copy:
          "SOC 2 Type II Attested status gives clients a clearer basis for evaluating OneSmarter's secure software and operational support practices.",
      },
    ],
  },
  hipaa: {
    eyebrow: "Trust Center",
    title: "HIPAA Security Rule Compliance Assessment Completed",
    intro:
      "OneSmarter has completed an independent HIPAA Security Rule compliance assessment. The assessment reviewed safeguards and practices related to protecting electronic Protected Health Information where applicable.",
    sections: [
      {
        title: "Administrative Safeguards",
        copy:
          "Administrative safeguards support policies, procedures, workforce awareness, and oversight for sensitive healthcare workflows.",
      },
      {
        title: "Technical Safeguards",
        copy:
          "Technical safeguards focus on access, auditability, system controls, and secure handling of applicable electronic Protected Health Information.",
      },
      {
        title: "Physical Safeguards",
        copy:
          "Physical safeguard considerations support controlled work practices and responsible handling of environments where sensitive information may be involved.",
      },
      {
        title: "Access Management",
        copy:
          "Access management practices are designed around role-appropriate access, limited exposure, and least-privilege principles.",
      },
      {
        title: "Secure Development and Operations",
        copy:
          "OneSmarter builds selected systems for HIPAA-regulated workflows and designs applicable workflows for PHI-sensitive operations.",
      },
      {
        title: "Ongoing Risk Awareness",
        copy:
          "HIPAA-related safeguards are treated as part of ongoing risk awareness, operational review, and responsible delivery.",
      },
    ],
  },
  iso27001: {
    eyebrow: "Trust Center",
    title: "ISO/IEC 27001 Certified",
    intro:
      "OneSmarter is ISO/IEC 27001 certified, reflecting an independent, accredited assessment of its information security management system (ISMS). The Trust Center summarizes this posture in factual, client-review-friendly terms.",
    sections: [
      {
        title: "Information Security Management System",
        copy:
          "OneSmarter maintains an ISMS covering governance, risk management, and information security controls aligned with ISO/IEC 27001.",
      },
      {
        title: "Risk Assessment and Treatment",
        copy:
          "Risk assessment and treatment processes identify, evaluate, and address information security risks across systems and workflows.",
      },
      {
        title: "Access Control",
        copy:
          "Access control practices support role-appropriate permissions, least-privilege principles, and secure handling of sensitive information.",
      },
      {
        title: "Continual Improvement",
        copy:
          "OneSmarter treats information security as an ongoing practice, with periodic review, internal audit, and continual improvement of the ISMS.",
      },
      {
        title: "Certification Scope",
        copy:
          "Certification decisions and scope are governed by an accredited certification body; OneSmarter does not issue its own ISO/IEC 27001 certificates.",
      },
      {
        title: "Client Trust",
        copy:
          "ISO/IEC 27001 certification gives clients an internationally recognized basis for evaluating OneSmarter's information security practices.",
      },
    ],
  },
  securityPractices: {
    eyebrow: "Trust Center",
    title: "Security Practices",
    intro:
      "OneSmarter's security practices are practical, controls-aware, and shaped around secure software development, responsible delivery, and dependable support for sensitive operational workflows.",
    sections: [
      {
        title: "Secure Software Development",
        copy:
          "Development work emphasizes maintainable architecture, reviewable changes, secure workflow design, and responsible handling of sensitive data.",
      },
      {
        title: "Access Control",
        copy:
          "Access is managed with role-appropriate permissions, least-privilege principles, and attention to sensitive operational responsibilities.",
      },
      {
        title: "Encryption Practices Where Applicable",
        copy:
          "Encryption practices are considered where appropriate for systems, data flows, and client requirements.",
      },
      {
        title: "Change Management",
        copy:
          "Change management supports controlled updates, traceable work, and review of changes that affect client-facing workflows.",
      },
      {
        title: "Risk Review",
        copy:
          "Risk review practices help identify operational, technical, and data-handling considerations before they become delivery issues.",
      },
      {
        title: "Incident Response Readiness",
        copy:
          "Incident response readiness supports practical escalation, investigation, communication, and follow-up when issues require coordinated attention.",
      },
      {
        title: "Vendor Awareness",
        copy:
          "Vendor awareness helps OneSmarter consider third-party dependencies and service relationships in the context of client obligations.",
      },
      {
        title: "Workforce Security Awareness",
        copy:
          "Workforce awareness reinforces secure practices, responsible data handling, and compliance-aware operations.",
      },
      {
        title: "Ongoing Improvement",
        copy:
          "OneSmarter continues to refine security practices as systems, workflows, client needs, and risk conditions evolve.",
      },
    ],
  },
  privacy: {
    eyebrow: "Trust Center",
    title: "Privacy & Responsible Data Handling",
    intro:
      "OneSmarter approaches privacy through client confidentiality, responsible data handling, limited access, privacy-aware operations, and careful treatment of sensitive business and healthcare information.",
    sections: [
      {
        title: "Client Confidentiality",
        copy:
          "Client information is handled with attention to confidentiality, engagement context, and appropriate operational need.",
      },
      {
        title: "Responsible Data Handling",
        copy:
          "OneSmarter emphasizes practical data minimization, careful workflow design, and responsible handling of sensitive business and healthcare information.",
      },
      {
        title: "Limited Access",
        copy:
          "Access to sensitive information is limited to appropriate roles and business purposes.",
      },
      {
        title: "Privacy-Aware Operations",
        copy:
          "Privacy-aware operations support secure collaboration, controlled communication, and appropriate treatment of client data.",
      },
    ],
    ctas: [
      { label: "Privacy Policy", path: "/policies/privacy-policy" },
      { label: "Terms Of Use", path: "/policies/terms-of-use" },
      { label: "Email OneSmarter", path: "mailto:care@onesmarter.com" },
    ],
  },
};

const detailIcons = [LockKeyhole, FileCheck2, ShieldCheck, Eye];

const sectionIconByTitle = {
  "Independent Attestation": ClipboardCheck,
  "Security Controls": LockKeyhole,
  "Operational Discipline": Settings,
  "Ongoing Monitoring and Improvement": RefreshCw,
  "Client Trust": Handshake,
  "Administrative Safeguards": ClipboardList,
  "Technical Safeguards": KeyRound,
  "Physical Safeguards": Building2,
  "Access Management": UserCog,
  "Secure Development and Operations": Code2,
  "Ongoing Risk Awareness": AlertTriangle,
  "Information Security Management System": ShieldCheck,
  "Risk Assessment and Treatment": AlertTriangle,
  "Continual Improvement": RefreshCw,
  "Certification Scope": ClipboardCheck,
  "Secure Software Development": Code2,
  "Access Control": KeyRound,
  "Encryption Practices Where Applicable": LockKeyhole,
  "Change Management": RefreshCw,
  "Risk Review": SearchCheck,
  "Incident Response Readiness": Siren,
  "Vendor Awareness": Handshake,
  "Workforce Security Awareness": Users,
  "Ongoing Improvement": TrendingUp,
};

const TrustBadges = () => (
  <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">    <div className="flex min-w-0 items-center gap-4 rounded border border-white/10 bg-white/[0.04] p-4 xl:flex-col xl:justify-center xl:text-center">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
      <img
        src={soclogo}
        alt="SOC 2 Type II Attested"
        className="h-full w-full object-cover"
      />
    </div>
    <p className="min-w-0 font-semibold leading-6 text-white">
      SOC 2 Type II Attested
    </p>
  </div>

    <div className="flex min-w-0 items-center gap-4 rounded border border-white/10 bg-white/[0.04] p-4 xl:flex-col xl:justify-center xl:text-center">
      <HipaaBadge className="h-14 w-14 shrink-0 object-contain" />
      <p className="min-w-0 font-semibold leading-6 text-white">
        HIPAA Security Rule Compliance Assessment Completed
      </p>
    </div>

    <div className="flex min-w-0 items-center gap-4 rounded border border-white/10 bg-white/[0.04] p-4 xl:flex-col xl:justify-center xl:text-center">
      {/* TODO: swap the placeholder mark for the official ISO/IEC 27001 certification-body mark once received */}
      <img
        src={isoLogo}
        alt="ISO/IEC 27001 Certified"
        className="h-14 w-14 shrink-0 object-contain"
      />
      <p className="min-w-0 font-semibold leading-6 text-white">
        ISO/IEC 27001 Certified
      </p>
    </div>
  </div>
);

const DetailPage = ({ page }) => {
  const content = detailPages[page] || detailPages.soc2;

  return (
    <main className="overflow-x-hidden bg-white text-gray-950">
      <section className="bg-zinc-950 px-4 pb-16 pt-32 text-white sm:px-6 md:pt-44 lg:px-12">
        <div className="qa-container mx-auto">
          <p className="text-sm font-semibold uppercase text-red-500">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl break-words text-3xl font-bold sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-gray-300 sm:text-lg">
            {content.intro}
          </p>
          <div className="mt-8">
            <TrustBadges />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-12 lg:py-20">
        <div className="qa-container mx-auto grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {content.sections.map((section, index) => {
            const SectionIcon =
              sectionIconByTitle[section.title] ||
              detailIcons[index % detailIcons.length];

            return (
              <article
                key={section.title}
                className="rounded border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-red-600 text-white">
                  <SectionIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="break-words text-xl font-semibold text-gray-950">
                  {section.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {section.copy}
                </p>
              </article>
            );
          })}
        </div>

        {content.ctas && (
          <div className="qa-container mx-auto mt-10 flex flex-col gap-3 sm:flex-row">
            {content.ctas.map((cta) => (
              cta.path.startsWith("mailto:") ? (
                <a
                  key={cta.path}
                  href={cta.path}
                  className="inline-flex items-center justify-center rounded bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  {cta.label}
                </a>
              ) : (
                <Link
                  key={cta.path}
                  to={cta.path}
                  className="inline-flex items-center justify-center rounded bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  {cta.label}
                </Link>
              )
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

const TrustCenterLanding = () => (
  <main className="overflow-x-hidden bg-zinc-950 text-white">
    <section className="px-4 pb-16 pt-32 sm:px-6 md:pt-44 lg:px-12 lg:pb-20">
      <div className="qa-container mx-auto grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase text-red-500">
            OneSmarter Trust
          </p>
          <h1 className="mt-4 text-4xl font-bold sm:text-6xl">Trust Center</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-gray-300 sm:text-lg">
            Security, privacy, and compliance are part of how OneSmarter builds
            and supports client solutions.
          </p>
          <p className="mt-6 max-w-3xl text-base leading-8 text-gray-300">
            This center separates OneSmarter's own trust posture from the
            compliance and cyber assurance services we provide to clients.
          </p>
        </div>
        <TrustBadges />
      </div>
    </section>

    <section className="border-y border-white/10 bg-white/[0.03] px-4 py-12 sm:px-6 lg:px-12">
      <div className="qa-container mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {highlights.map((item) => (
          <div
            key={item}
            className="rounded border border-white/10 bg-white/[0.04] p-5"
          >
            <FileCheck2 className="mb-4 h-6 w-6 text-red-400" aria-hidden="true" />
            <p className="text-sm font-semibold leading-6 text-white">{item}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="px-4 py-14 sm:px-6 lg:px-12 lg:py-20">
      <div className="qa-container mx-auto">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-red-500">
            Review OneSmarter's Posture
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Security, privacy, and compliance information in one place.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {trustLinks.map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className="group flex min-h-[230px] flex-col rounded border border-white/10 bg-white/[0.04] p-6 transition hover:border-red-500/70 hover:bg-white/[0.07]"
            >
              <Eye className="mb-5 h-6 w-6 text-red-400" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-white">{card.title}</h2>
              <p className="mt-4 flex-1 text-sm leading-7 text-gray-300">
                {card.copy}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-red-400 group-hover:text-red-300">
                View details
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  </main>
);

const TrustCenterPage = ({ page = "trustCenter" }) => {
  if (page === "trustCenter") {
    return <TrustCenterLanding />;
  }

  return <DetailPage page={page} />;
};

export default TrustCenterPage;
