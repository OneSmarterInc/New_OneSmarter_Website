import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../assets/logo2.png";

const navGroups = [
  {
    label: "Platforms",
    path: "/platforms",
    items: [
      {
        label: "Secure Ticketing and Case Management",
        path: "/platforms/hipaa-regulated-ticketing",
      },
      {
        label: "Bill Audit & Bill Pay",
        path: "/platforms/bill-audit-erp-bill-pay",
      },
    ],
  },
  {
    label: "Technology",
    path: "/technology-solutions",
    items: [
      {
        label: "Healthcare & TPA Technology",
        path: "/technology-solutions/healthcare-tpa",
      },
      {
        label: "AI Agentic Services",
        path: "/technology-solutions/ai-agentic-services",
      },
      {
        label: "IBM i / AS400 Services",
        path: "/technology-solutions/ibm-i-as400",
      },
      {
        label: "Enterprise Software",
        path: "/technology-solutions/enterprise-software",
      },
      {
        label: "Software Support Consolidation",
        path: "/technology-solutions/software-support-consolidation",
      },
      {
        label: "Claims Processing Services",
        path: "/technology-solutions/claims-processing-services",
      },
    ],
  },
  {
    label: "Business",
    path: "/business-services",
    items: [
      {
        label: "Accounting, Bookkeeping & Tax",
        path: "/business-services/accounting-bookkeeping-tax",
      },
      {
        label: "EOR & HR Services",
        path: "/business-services/eor-hr",
      },
      {
        label: "Third-Party Payment Services",
        path: "/business-services/third-party-payment-services",
      },
      {
        label: "Benefits & Back Office Support",
        path: "/business-services/benefits-back-office",
      },
    ],
  },
  {
    label: "Compliance",
    path: "/compliance-assurance",
    items: [
      {
        label: "SOC Readiness",
        path: "/compliance-assurance/soc-readiness",
      },
      {
        label: "HIPAA Audit Readiness",
        path: "/compliance-assurance/hipaa-audit-readiness",
      },
      {
        label: "ISO/IEC 27001 Readiness",
        path: "/compliance-assurance/iso-27001-readiness",
      },
      {
        label: "PCI DSS Readiness",
        path: "/compliance-assurance/pci-dss-readiness",
      },
      {
        label: "Framework Mapping",
        path: "/compliance-assurance/framework-mapping",
      },
      {
        label: "VAPT & Remediation",
        path: "/compliance-assurance/vapt-remediation",
      },
      {
        label: "CMMI Readiness",
        path: "/compliance-assurance/cmmi-readiness",
      },
      {
        label: "Compliance Operations",
        path: "/compliance-assurance/compliance-operations",
      },
    ],
  },
  {
    label: "Trust",
    path: "/trust-center",
    items: [
      {
        label: "SOC 2",
        path: "/trust-center/soc2",
      },
      {
        label: "HIPAA",
        path: "/trust-center/hipaa",
      },
      {
        label: "Security Practices",
        path: "/trust-center/security-practices",
      },
      {
        label: "Privacy",
        path: "/trust-center/privacy",
      },
    ],
  },
];

const simpleLinks = [
  { label: "About", path: "/aboutus/Introduction" },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mobileOpenGroup, setMobileOpenGroup] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isMobileOpen]);

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
    setMobileOpenGroup("");
  };

  const navigateMobile = (path) => {
    navigate(path);
    closeMobileMenu();
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
          ? "bg-[#0c0c0c]/95 backdrop-blur-sm shadow-md py-2"
          : "bg-transparent py-4"
        }`}
    >
      <div
        className={`qa-container-wide mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between transition-all duration-500 ${isScrolled ? "h-[65px]" : "h-[85px]"
          }`}
      >
        <Link to="/" aria-label="OneSmarter home" className="shrink-0">
          <img
            src={logo}
            alt="OneSmarter"
            className={`transition-all duration-500 w-auto ${isScrolled
                ? "h-[44px] max-w-[260px] md:h-[66px] md:max-w-none lg:h-[75px]"
                : "h-[50px] max-w-[270px] md:h-[82px] md:max-w-none lg:h-[92px]"
              }`}
          />
        </Link>

        <ul className="ml-8 hidden flex-1 items-center justify-end gap-2 md:flex lg:ml-12 lg:gap-4 xl:gap-5">
          {navGroups.map((group) => (
            <li key={group.label} className="group relative flex items-center py-0.5">
              <Link
                to={group.path}
                className="relative z-50 flex items-center whitespace-nowrap rounded px-2 py-2 text-[13px] font-medium text-red-500 transition-all duration-300 group-hover:bg-zinc-950/80 group-hover:text-white hover:text-white lg:text-[14px] xl:text-[15px]"
              >
                {group.label}
                <svg className="ml-1 w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
                </svg>
              </Link>
              <ul className="invisible absolute left-0 top-full z-40 mt-1 w-80 rounded-md border border-white/10 bg-[#111111] py-1.5 opacity-0 shadow-lg shadow-black/30 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="block px-4 py-2 text-sm leading-5 text-zinc-100 transition hover:bg-red-950/45 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}

          {simpleLinks.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className="whitespace-nowrap text-[13px] font-medium text-red-600 transition-all duration-300 hover:text-white lg:text-[14px] xl:text-[15px]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="md:hidden">
          <button
            onClick={() => setIsMobileOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileOpen ? (
              <X size={34} color="red" />
            ) : (
              <Menu size={34} color="red" />
            )}
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-[999] flex justify-end">
          <button
            className="fixed inset-0 bg-black/50"
            aria-label="Close navigation menu"
            onClick={closeMobileMenu}
          />

          <div
            id="mobile-navigation"
            className="relative w-[280px] bg-[#e30613] h-screen shadow-lg z-[1000] px-6 py-4 flex flex-col justify-between animate-slide-in-right overflow-y-auto"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-white font-bold text-lg">CLOSE</span>
                <button onClick={closeMobileMenu} aria-label="Close menu">
                  <X size={22} color="white" />
                </button>
              </div>

              <nav className="flex flex-col space-y-3 text-white">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <button
                      className="w-full text-base flex justify-between items-center text-left font-semibold"
                      aria-expanded={mobileOpenGroup === group.label}
                      onClick={() =>
                        setMobileOpenGroup((current) =>
                          current === group.label ? "" : group.label,
                        )
                      }
                    >
                      {group.label}
                      <span>{mobileOpenGroup === group.label ? "-" : "+"}</span>
                    </button>
                    {mobileOpenGroup === group.label && (
                      <div className="ml-4 mt-2 space-y-2 border-l border-white/30 pl-3">
                        <button
                          onClick={() => navigateMobile(group.path)}
                          className="block text-left text-sm w-full text-white/90"
                        >
                          Overview
                        </button>
                        {group.items.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => navigateMobile(item.path)}
                            className="block text-left text-sm w-full text-white/90"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {simpleLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigateMobile(link.path)}
                    className="text-base text-left font-semibold"
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="text-white text-xs mt-8">
              <p className="mb-2">- FOLLOW US ON -</p>
              <div className="flex space-x-4 text-md justify-center">
                <a
                  href="https://www.facebook.com/Onesmarter.INc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-black transition"
                  aria-label="Facebook"
                >
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a
                  href="https://x.com/OneSmarterInc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-black transition"
                  aria-label="X"
                >
                  <i className="fab fa-twitter"></i>
                </a>
                <a
                  href="https://www.linkedin.com/company/onesmarter-inc/people/?viewAsMember=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-black transition"
                  aria-label="LinkedIn"
                >
                  <i className="fab fa-linkedin-in"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
