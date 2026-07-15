import React from "react";
import { Link } from "react-router-dom";
import {
  BrainCircuit,
  BriefcaseBusiness,
  Calculator,
  ClipboardCheck,
  Code2,
  Globe2,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
  SearchCheck,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import bannerImage from "../assets/home-banner.png";
import bgImage from "../assets/bg-1.jpg";
import soclogo from "../assets/soc-2-transparent.png";
import hipaaLogo from "../assets/Hippa-transparent.png";

const offeringCards = [
  {
    title: "Platforms",
    path: "/platforms",
    icon: MessageSquareText,
    summary: "Secure workflow platforms for operational teams.",
    points: ["Ticketing and case management", "Bill audit and bill pay", "Operational visibility"],
  },
  {
    title: "Technology Solutions",
    path: "/technology-solutions",
    icon: Code2,
    summary: "Practical technology delivery for complex systems.",
    points: ["AI and automation", "Healthcare and IBM i / AS400", "Claims processing services"],
  },
  {
    title: "Business Services",
    path: "/business-services",
    icon: BriefcaseBusiness,
    summary: "Back-office services for growing organizations.",
    points: ["Accounting, bookkeeping, and tax support", "EOR and HR support", "Payments, benefits, and operations"],
  },
  {
    title: "Compliance & Cyber Assurance",
    path: "/compliance-assurance",
    icon: ClipboardCheck,
    summary: "Readiness and remediation support for client programs.",
    points: ["SOC, HIPAA, ISO/IEC 27001, and PCI DSS readiness", "VAPT and remediation support", "Framework mapping and compliance operations"],
  },
  {
    title: "Trust Center",
    path: "/trust-center",
    icon: LockKeyhole,
    summary: "OneSmarter's own security and compliance posture.",
    points: ["SOC 2 Type II Attested", "HIPAA Security Rule assessment", "Security practices and privacy"],
  },
];

const heroFeatures = [
  {
    icon: ShieldCheck,
    title: "Secure By Design",
    copy: "Security is built into every solution we develop.",
  },
  {
    icon: ServerCog,
    title: "Enterprise Grade",
    copy: "Scalable, reliable solutions for mission-critical systems.",
  },
  {
    icon: LockKeyhole,
    title: "Trusted Partner",
    copy: "Dedicated to protecting your data and your business.",
  },
  {
    icon: BrainCircuit,
    title: "Innovative Solutions",
    copy: "AI, automation, and modern technology for the future.",
  },
];

const featuredPlatforms = [
  {
    title: "Secure Ticketing and Case Management",
    path: "/platforms/hipaa-regulated-ticketing",
    icon: MessageSquareText,
    summary: "Secure case intake and resolution for sensitive workflows.",
    points: ["HIPAA-regulated workflows", "Role-based access", "Audit history"],
  },
  {
    title: "Bill Audit & Bill Pay",
    path: "/platforms/bill-audit-erp-bill-pay",
    icon: ReceiptText,
    summary: "Review vendor bills, recurring expenses, and approvals.",
    points: ["Discrepancy tracking", "Payment workflow support", "Telecom expense use cases"],
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
    icon: SearchCheck,
    title: "Experienced, focused team",
    copy: "Senior delivery attention without the sprawl of a large generic consulting model.",
  },
  {
    icon: ShieldCheck,
    title: "Secure-by-design development",
    copy: "Security, access control, auditability, and workflow integrity are considered from the start.",
  },
  {
    icon: BrainCircuit,
    title: "Practical AI and automation",
    copy: "AI is applied to repeatable workflows where it can improve speed, quality, and visibility.",
  },
  {
    icon: ServerCog,
    title: "Healthcare and legacy-system experience",
    copy: "Hands-on background with healthcare operations, claims workflows, and IBM i / AS400 environments.",
  },
  {
    icon: Globe2,
    title: "Global delivery and support capability",
    copy: "Flexible delivery and support for organizations that need accountable execution across time zones.",
  },
  {
    icon: Calculator,
    title: "Compliance-aware operations",
    copy: "Services are shaped around evidence, documentation, remediation, and responsible data handling.",
  },
];

const Banner = () => {
  return (
    <main className="overflow-x-hidden bg-zinc-100 text-gray-950">
      <section
        className="relative overflow-hidden bg-black bg-cover bg-center text-white"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-black/80" />
        <div className="qa-container relative mx-auto grid items-center gap-10 px-4 pb-10 pt-20 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:pt-24 lg:px-12 lg:pt-32">
          <div className="min-w-0" data-aos="fade-up" data-aos-duration="800">
            <h1 className="max-w-4xl break-words text-3xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Secure Platforms.
              <br />
              Practical AI.
              <br />
              <span className="text-red-500">Trusted Execution.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-gray-200 sm:text-lg">
              OneSmarter builds secure platforms, AI-enabled workflows,
              business services, and compliance readiness support for
              healthcare, financial, telecom, and growing organizations.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/platforms"
                className="inline-flex items-center justify-center rounded bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Explore Our Platforms
              </Link>
              <a
                href="mailto:care@onesmarter.com"
                className="inline-flex items-center justify-center rounded border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-100"
              >
                Talk to Us
              </a>
            </div>

            <div className="mt-8 h-px w-24 bg-red-500/60" />

            <div className="mt-6 flex w-full max-w-3xl min-w-0 flex-col divide-y divide-white/10 sm:flex-row sm:items-center sm:divide-x sm:divide-y-0">
              <div className="flex min-w-0 items-center gap-4 pb-5 sm:pb-0 sm:pr-6">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white sm:h-28 sm:w-28">
                  <img
                    src={soclogo}
                    alt="AICPA SOC 2 Type II Attested"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="min-w-0 whitespace-nowrap font-bold uppercase leading-tight tracking-wide text-white">
                  <span className="text-base sm:text-lg">SOC 2</span>
                  <br />
                  <span className="text-base sm:text-lg">Type II</span>
                  <br />
                  <span className="text-xs text-red-500 sm:text-sm">Attested</span>
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-4 pt-5 sm:pl-6 sm:pt-0">
                <img
                  src={hipaaLogo}
                  alt="HIPAA Security Rule Compliance Assessed"
                  className="h-28 w-28 shrink-0 object-contain sm:h-32 sm:w-32"
                />
                <span className="min-w-0 font-bold uppercase leading-tight tracking-wide text-white">
                  <span className="whitespace-nowrap text-base sm:text-lg">
                    HIPAA
                  </span>
                  <br />
                  <span className="whitespace-nowrap text-xs sm:text-sm">
                    Security Rule
                  </span>
                  <br />
                  <span className="whitespace-nowrap text-xs sm:text-sm">
                    Compliance
                  </span>
                  <br />
                  <span className="whitespace-nowrap text-xs text-red-500 sm:text-sm">
                    Assessed
                  </span>
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

        <div className="qa-container relative mx-auto -mt-6 px-4 pb-10 sm:px-6 lg:px-12">
          <div className="grid gap-6 rounded-xl border border-white/15 bg-black p-7 sm:grid-cols-2 sm:divide-x sm:divide-white/15 lg:grid-cols-4 lg:gap-0 lg:p-8">
            {heroFeatures.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-4 lg:px-6 lg:first:pl-0 lg:last:pr-0"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-red-500/60 bg-black/40 text-red-500">
                  <feature.icon className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wide text-white">
                    {feature.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    {feature.copy}
                  </p>
                </div>
              </div>
            ))}
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
                <card.icon className="mb-5 h-7 w-7 text-red-400" aria-hidden="true" />
                <h3 className="text-xl font-semibold text-white">
                  {card.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-gray-300">
                  {card.summary}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm leading-6 text-gray-300">
                  {card.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-6 text-sm font-semibold text-red-400 group-hover:text-red-300">
                  Learn more
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-12 lg:py-24">
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
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {featuredPlatforms.map((platform) => (
              <Link
                key={platform.title}
                to={platform.path}
                className="group flex min-h-[260px] flex-col rounded border border-gray-200 bg-white p-6 shadow-sm transition hover:border-red-500 hover:shadow-md"
              >
                <platform.icon className="mb-5 h-7 w-7 text-red-600" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-gray-950">
                  {platform.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-gray-600">
                  {platform.summary}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm leading-6 text-gray-600">
                  {platform.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-6 text-sm font-semibold text-red-600 group-hover:text-red-700">
                  Explore platform
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-neutral-50 px-4 py-16 sm:px-6 lg:px-12 lg:py-24">
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

      <section className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-12 lg:py-24">
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
                <item.icon className="mb-5 h-6 w-6 text-red-600" aria-hidden="true" />
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

      <section className="border-t border-white/10 bg-zinc-950 px-4 py-14 sm:px-6 lg:px-12 lg:py-20">
        <div className="qa-container mx-auto flex flex-col items-start justify-between gap-6 rounded border border-white/10 bg-white/[0.04] p-8 text-white sm:p-10 lg:flex-row lg:items-center">
          <h2 className="max-w-3xl break-words text-2xl font-bold sm:text-4xl">
            Have a platform, workflow, compliance, or operations challenge?
          </h2>
          <a
            href="mailto:care@onesmarter.com"
            className="inline-flex shrink-0 items-center justify-center rounded bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Start a Conversation
          </a>
        </div>
      </section>
    </main>
  );
};

export default Banner;
