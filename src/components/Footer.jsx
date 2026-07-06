import { Link } from "react-router-dom";
import { FaFacebook, FaTwitter, FaLinkedin } from "react-icons/fa";
import soclogo from "../assets/soc.jpg";
import hipaaLogo from "../assets/Hippa-transparent.png";

const footerColumns = [
  {
    title: "Platforms",
    links: [
      { label: "Secure Ticketing", path: "/platforms/hipaa-regulated-ticketing" },
      { label: "Bill Audit ERP & Bill Pay", path: "/platforms/bill-audit-erp-bill-pay" },
      { label: "Telecom Expense Management", path: "/platforms/telecom-expense-management" },
    ],
  },
  {
    title: "Technology",
    links: [
      { label: "Technology Solutions", path: "/technology-solutions" },
      { label: "AI Agentic Services", path: "/technology-solutions/ai-agentic-services" },
      { label: "IBM i / AS400 Services", path: "/technology-solutions/ibm-i-as400" },
      { label: "Enterprise Software", path: "/technology-solutions/enterprise-software" },
      { label: "Claims Processing Services", path: "/technology-solutions/claims-processing-services" },
    ],
  },
  {
    title: "Business Services",
    links: [
      { label: "Accounting, Bookkeeping & Tax", path: "/business-services/accounting-bookkeeping-tax" },
      { label: "EOR & HR Services", path: "/business-services/eor-hr" },
      { label: "Third-Party Payment Services", path: "/business-services/third-party-payment-services" },
      { label: "Benefits & Back Office Support", path: "/business-services/benefits-back-office" },
    ],
  },
  {
    title: "Compliance",
    links: [
      { label: "Compliance & Cyber Assurance", path: "/compliance-assurance" },
      { label: "SOC Readiness", path: "/compliance-assurance/soc-readiness" },
      { label: "HIPAA Audit Readiness", path: "/compliance-assurance/hipaa-audit-readiness" },
      { label: "ISO/IEC 27001 Readiness", path: "/compliance-assurance/iso-27001-readiness" },
    ],
  },
  {
    title: "Trust Center",
    links: [
      { label: "Trust Center", path: "/trust-center" },
      { label: "SOC 2", path: "/trust-center/soc2" },
      { label: "HIPAA", path: "/trust-center/hipaa" },
      { label: "Privacy", path: "/trust-center/privacy" },
    ],
  },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/Onesmarter.INc/",
    icon: FaFacebook,
  },
  {
    label: "X",
    href: "https://x.com/OneSmarterInc",
    icon: FaTwitter,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/onesmarter-inc/people/?viewAsMember=true",
    icon: FaLinkedin,
  },
];

const Footer = () => {
  return (
    <footer className="relative z-10 overflow-x-hidden bg-zinc-950 px-4 py-12 text-sm text-gray-300 sm:px-6 lg:px-12">
      <div className="qa-container mx-auto">
        <div className="grid min-w-0 gap-10 lg:grid-cols-[1.2fr_2fr_0.9fr]">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-white">OneSmarter</h2>
            <p className="mt-4 max-w-sm leading-7 text-gray-400">
              Secure platforms, practical AI, business services, and compliance
              readiness support for organizations that need dependable
              execution.
            </p>
            <div className="mt-6 flex min-w-0 max-w-sm flex-col gap-4">
              <div className="flex min-w-0 items-center gap-4 rounded-xl border border-white/10 p-4">
                <img
                  src={soclogo}
                  alt="SOC 2 Type II Attested"
                  className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain p-1"
                />
                <p className="min-w-0 break-words font-semibold text-white">
                  SOC 2 Type II Attested
                </p>
              </div>
              <div className="flex min-w-0 items-center gap-4 rounded-xl border border-white/10 p-4">
                <img
                  src={hipaaLogo}
                  alt="HIPAA Security Rule Assessment Completed"
                  className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain p-1"
                />
                <div className="min-w-0">
                  <p className="break-words font-semibold text-white">
                    HIPAA Security Rule
                  </p>
                  <p className="break-words text-xs leading-5 text-gray-400">
                    Assessment Completed
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-8 sm:grid-cols-2 xl:grid-cols-5">
            {footerColumns.map((column) => (
              <div key={column.title} className="min-w-0">
                <h3 className="font-semibold text-white">{column.title}</h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        className="break-words leading-5 text-gray-400 transition hover:text-red-400"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-white">Contact</h3>
            <div className="mt-4 space-y-3 leading-6">
              <a
                href="mailto:care@onesmarter.com"
                className="block break-words text-gray-400 transition hover:text-red-400"
              >
                care@onesmarter.com
              </a>
              <a
                href="tel:+19373446241"
                className="block text-gray-400 transition hover:text-red-400"
              >
                +1 937 344 6241
              </a>
              <p className="text-gray-400">
                707 Miamisburg-Centerville Road
                <br />
                Dayton, OH 45459, STE 223
              </p>
            </div>

            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => {
                const SocialIcon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="text-gray-400 transition hover:text-red-400"
                  >
                    <SocialIcon className="text-lg" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 OneSmarter, Inc. All Rights Reserved.</p>
          <div className="flex gap-5">
            <Link
              to="/policies/privacy-policy"
              className="transition hover:text-red-400"
            >
              Privacy Policy
            </Link>
            <Link
              to="/policies/terms-of-use"
              className="transition hover:text-red-400"
            >
              Terms Of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
