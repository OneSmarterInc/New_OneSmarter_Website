import React from "react";
import { Link } from "react-router-dom";
import bannerImage from "../assets/home-banner.png";
import bgImage from "../assets/bg-1.jpg";
import soclogo from "../assets/soc1.png";
import HipaaBadge from "./HipaaBadge";

const offeringCards = [
  {
    title: "Platforms",
    path: "/platforms",
    copy: "Secure ticketing for HIPAA-regulated workflows, bill audit ERP, and telecom expense management platforms for operational teams.",
  },
  {
    title: "Technology Solutions",
    path: "/technology-solutions",
    copy: "AI agentic services, IBM i / AS400 support, enterprise software, healthcare technology, claims processing services, and software support consolidation.",
  },
  {
    title: "Business Services",
    path: "/business-services",
    copy: "Accounting, bookkeeping, tax support, EOR/HR services, third-party payment services, benefits, and back-office support.",
  },
  {
    title: "Compliance & Cyber Assurance",
    path: "/compliance-assurance",
    copy: "SOC readiness, HIPAA audit readiness, ISO/IEC 27001 readiness, PCI DSS readiness, VAPT/remediation, framework mapping, and compliance operations.",
  },
  {
    title: "Trust Center",
    path: "/trust-center",
    copy: "OneSmarter's SOC 2 Type II attestation, HIPAA Security Rule assessment, security practices, privacy, and compliance posture.",
  },
];

const featuredPlatforms = [
  {
    title: "Ticketing & Case Management for HIPAA-Regulated Workflows",
    path: "/platforms/hipaa-regulated-ticketing",
    copy: "Secure intake, role-based access, audit history, and workflow tracking for PHI-sensitive operations.",
  },
  {
    title: "Bill Audit ERP & Bill Pay",
    path: "/platforms/bill-audit-erp-bill-pay",
    copy: "Vendor bill intake, audit workflows, historical comparison, discrepancy tracking, approvals, and reporting.",
  },
  {
    title: "Telecom Expense Management",
    path: "/platforms/telecom-expense-management",
    copy: "Bill analysis, optimization, contract comparison, and cost-control workflows for telecom-heavy organizations.",
  },
];

const servedAudiences = [
  "Healthcare providers and TPAs",
  "Financial services and insurance organizations",
  "Telecom-heavy organizations",
  "Small and growing businesses",
  "Companies preparing for compliance reviews",
];

const whyOneSmarter = [
  {
    title: "Experienced, focused team",
    copy: "Senior delivery attention without the sprawl of a large generic consulting model.",
  },
  {
    title: "Secure-by-design development",
    copy: "Security, access control, auditability, and workflow integrity are considered from the start.",
  },
  {
    title: "Practical AI and automation",
    copy: "AI is applied to repeatable workflows where it can improve speed, quality, and visibility.",
  },
  {
    title: "Healthcare and legacy-system experience",
    copy: "Hands-on background with healthcare operations, claims workflows, and IBM i / AS400 environments.",
  },
  {
    title: "Global delivery and support capability",
    copy: "Flexible delivery and support for organizations that need accountable execution across time zones.",
  },
  {
    title: "Compliance-aware operations",
    copy: "Services are shaped around evidence, documentation, remediation, and responsible data handling.",
  },
];

const Banner = () => {
  return (
    <main className="overflow-x-hidden bg-white text-gray-950">
      <section
        className="relative overflow-hidden bg-black bg-cover bg-center text-white"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black/80" />
        <div className="qa-container relative mx-auto grid items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:py-24 lg:px-12 lg:py-32">
          <div className="min-w-0" data-aos="fade-up" data-aos-duration="800">
            <p className="mb-5 max-w-full text-sm font-semibold uppercase leading-6 text-red-400">
              Secure platforms, practical AI, and trusted execution
            </p>

            <h1 className="max-w-4xl break-words text-3xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Secure Platforms.
              <br />
              Practical AI.
              <br />
              <span className="text-red-500">Trusted Execution.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-gray-200 sm:text-lg">
              OneSmarter builds secure platforms, AI-enabled workflows, business
              services, and compliance readiness support for healthcare,
              financial, telecom, and growing organizations.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/platforms"
                className="inline-flex items-center justify-center rounded bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Explore Our Platforms
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-100"
              >
                Talk to Us
              </Link>
            </div>

            <div className="mt-8 grid w-full max-w-2xl min-w-0 gap-3 overflow-hidden rounded border border-white/15 bg-white/[0.06] p-4 text-xs text-gray-100 sm:grid-cols-2 sm:text-sm">
              <div className="flex min-w-0 items-center gap-3 rounded border border-white/10 bg-black/20 p-3">
                <div className="inline-flex h-14 w-20 shrink-0 items-center justify-center rounded bg-white px-2 py-1 text-gray-950">
                  <img
                    src={soclogo}
                    alt="SOC 2 Type II Attested"
                    className="max-h-10 w-auto object-contain"
                  />
                </div>
                <span className="min-w-0 break-words font-semibold leading-6">
                  SOC 2 Type II Attested
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded border border-white/10 bg-black/20 p-3">
                <HipaaBadge compact />
                <span className="min-w-0 break-words font-semibold leading-6">
                  HIPAA Security Rule Assessment Completed
                </span>
              </div>
            </div>
          </div>

          <div
            className="min-w-0 flex justify-center md:justify-end"
            data-aos="fade-left"
            data-aos-duration="800"
          >
            <img
              src={bannerImage}
              alt="AI-enabled workflow visual"
              className="h-auto w-full max-w-[260px] object-contain sm:max-w-md lg:max-w-lg"
            />
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 px-4 py-16 text-white sm:px-6 lg:px-12 lg:py-24">
        <div className="qa-container mx-auto">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-red-500">
              What OneSmarter Does
            </p>
            <h2 className="mt-3 max-w-full break-words text-2xl font-bold sm:text-4xl">
              Secure execution across platforms, technology, operations, and
              assurance.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {offeringCards.map((card) => (
              <Link
                key={card.title}
                to={card.path}
                className="group flex min-h-[260px] flex-col rounded border border-white/10 bg-white/[0.04] p-6 transition hover:border-red-500/70 hover:bg-white/[0.07]"
              >
                <h3 className="text-xl font-semibold text-white">
                  {card.title}
                </h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-gray-300">
                  {card.copy}
                </p>
                <span className="mt-6 text-sm font-semibold text-red-400 group-hover:text-red-300">
                  Learn more
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-12 lg:py-24">
        <div className="qa-container mx-auto">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-red-600">
                Featured Platforms
              </p>
              <h2 className="mt-3 break-words text-2xl font-bold sm:text-4xl">
                Purpose-built systems for regulated and operationally complex
                work.
              </h2>
            </div>
            <Link
              to="/platforms"
              className="inline-flex w-fit items-center rounded border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-950 transition hover:border-red-600 hover:text-red-700"
            >
              View Platforms
            </Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {featuredPlatforms.map((platform) => (
              <Link
                key={platform.title}
                to={platform.path}
                className="group flex min-h-[270px] flex-col rounded border border-gray-200 bg-white p-6 shadow-sm transition hover:border-red-500 hover:shadow-md"
              >
                <h3 className="text-lg font-semibold text-gray-950">
                  {platform.title}
                </h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-gray-600">
                  {platform.copy}
                </p>
                <span className="mt-6 text-sm font-semibold text-red-600 group-hover:text-red-700">
                  Explore platform
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-100 px-4 py-16 sm:px-6 lg:px-12 lg:py-24">
        <div className="qa-container mx-auto grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-red-600">
              Who We Serve
            </p>
            <h2 className="mt-3 break-words text-2xl font-bold sm:text-4xl">
              Built for teams that need dependable systems and accountable
              support.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {servedAudiences.map((audience) => (
              <div
                key={audience}
                className="rounded border border-gray-200 bg-white p-5 text-base font-semibold text-gray-900"
              >
                {audience}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-12 lg:py-24">
        <div className="qa-container mx-auto">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-red-600">
              Why OneSmarter
            </p>
            <h2 className="mt-3 break-words text-2xl font-bold sm:text-4xl">
              Focused capability without unnecessary complexity.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whyOneSmarter.map((item) => (
              <div
                key={item.title}
                className="min-h-[190px] rounded border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 h-1 w-10 rounded bg-red-600" />
                <h3 className="text-lg font-semibold text-gray-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 px-4 py-16 text-white sm:px-6 lg:px-12 lg:py-24">
        <div className="qa-container mx-auto grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-red-500">
              Trust & Compliance
            </p>
            <h2 className="mt-3 break-words text-2xl font-bold sm:text-4xl">
              Security and compliance for work that requires trust.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-300">
              OneSmarter has completed a SOC 2 Type II attestation and an
              independent HIPAA Security Rule compliance assessment. These
              milestones reflect our ongoing commitment to secure software
              development, responsible data handling, and dependable client
              service.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link
              to="/trust-center"
              className="inline-flex items-center justify-center rounded bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Visit Trust Center
            </Link>
            <Link
              to="/compliance-assurance"
              className="inline-flex items-center justify-center rounded border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-100"
            >
              Compliance Services
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-12 lg:py-20">
        <div className="qa-container mx-auto flex flex-col items-start justify-between gap-6 rounded border border-gray-200 bg-gray-950 p-8 text-white sm:p-10 lg:flex-row lg:items-center">
          <h2 className="max-w-3xl break-words text-2xl font-bold sm:text-4xl">
            Have a platform, workflow, compliance, or operations challenge?
          </h2>
          <Link
            to="/contact"
            className="inline-flex shrink-0 items-center justify-center rounded bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Start a Conversation
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Banner;
