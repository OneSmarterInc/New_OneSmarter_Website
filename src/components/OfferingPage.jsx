import React from "react";
import { Link } from "react-router-dom";

const platforms = [
  {
    title: "Secure Ticketing for HIPAA-Regulated Workflows",
    path: "/platforms/hipaa-regulated-ticketing",
    summary:
      "Ticketing and case management built for HIPAA-regulated workflows and designed for PHI-sensitive workflows.",
  },
  {
    title: "Bill Audit ERP & Bill Pay",
    path: "/platforms/bill-audit-erp-bill-pay",
    summary:
      "Vendor bill intake, bill audit, contract review, approval workflows, reporting, and bill payment coordination.",
  },
  {
    title: "Telecom Expense Management",
    path: "/platforms/telecom-expense-management",
    summary:
      "Bill analysis, optimization, historical review, contract comparison, and cost-control workflows for large mobile fleets.",
  },
];

const technologySolutions = [
  {
    title: "Healthcare & TPA Technology",
    path: "/technology-solutions/healthcare-tpa",
    summary:
      "Technology support for healthcare operations, third-party administrators, workflow modernization, and reporting.",
  },
  {
    title: "AI Agentic Services",
    path: "/technology-solutions/ai-agentic-services",
    summary:
      "Practical AI services for process automation, internal operations, document workflows, and decision support.",
  },
  {
    title: "IBM i / AS400 Services",
    path: "/technology-solutions/ibm-i-as400",
    summary:
      "IBM i and AS400 modernization, integration, RPG support, administration, and operational continuity.",
  },
  {
    title: "Enterprise Software Development",
    path: "/technology-solutions/enterprise-software",
    summary:
      "Custom enterprise applications, integrations, dashboards, portals, and secure software delivery.",
  },
  {
    title: "Software Support Consolidation",
    path: "/technology-solutions/software-support-consolidation",
    summary:
      "Support consolidation through global delivery and support teams for maintainable, cost-effective software operations.",
  },
  {
    title: "Claims Processing Services",
    path: "/technology-solutions/claims-processing-services",
    summary:
      "Healthcare claims processing technology services, workflow automation, legacy data integration, reporting, and operational support.",
  },
];

const businessServices = [
  {
    title: "Accounting, Bookkeeping & Tax Support",
    path: "/business-services/accounting-bookkeeping-tax",
    summary:
      "Accounting, bookkeeping, reconciliations, tax documentation support, filing coordination, and operational financial workflows.",
  },
  {
    title: "EOR & HR Services",
    path: "/business-services/eor-hr",
    summary:
      "Employer of record and HR support for US companies hiring employees in Asia.",
  },
  {
    title: "Third-Party Payment Services",
    path: "/business-services/third-party-payment-services",
    summary:
      "Third-party payment coordination, documentation workflows, payment operations support, and reporting.",
  },
  {
    title: "Benefits & Back Office Support",
    path: "/business-services/benefits-back-office",
    summary:
      "Benefits administration support, eligibility workflows, document operations, client service support, and automation opportunities.",
  },
];

const complianceAssurance = [
  {
    title: "SOC Readiness",
    path: "/compliance-assurance/soc-readiness",
    summary:
      "SOC 1, SOC 2, and SOC 3 readiness support, evidence preparation, control documentation, and remediation coordination.",
  },
  {
    title: "HIPAA Audit Readiness",
    path: "/compliance-assurance/hipaa-audit-readiness",
    summary:
      "HIPAA audit readiness support, documentation review, safeguards mapping, and remediation planning.",
  },
  {
    title: "ISO/IEC 27001 Readiness",
    path: "/compliance-assurance/iso-27001-readiness",
    summary:
      "ISO/IEC 27001 certification readiness support, ISMS documentation, control mapping, and evidence preparation.",
  },
  {
    title: "PCI DSS Readiness",
    path: "/compliance-assurance/pci-dss-readiness",
    summary:
      "PCI DSS readiness support, scope coordination, control documentation, evidence preparation, and remediation support.",
  },
  {
    title: "Framework Mapping",
    path: "/compliance-assurance/framework-mapping",
    summary:
      "Framework mapping for NIST, CMMC, GDPR, and related security and privacy requirements.",
  },
  {
    title: "VAPT & Remediation",
    path: "/compliance-assurance/vapt-remediation",
    summary:
      "VAPT coordination, findings review, remediation support, and closure tracking.",
  },
  {
    title: "CMMI Readiness",
    path: "/compliance-assurance/cmmi-readiness",
    summary:
      "CMMI process readiness support, process documentation, gap review, and evidence preparation.",
  },
  {
    title: "Compliance Operations",
    path: "/compliance-assurance/compliance-operations",
    summary:
      "Managed compliance operations for recurring evidence, control tracking, remediation follow-up, and reporting.",
  },
];

const trustCenter = [
  {
    title: "SOC 2",
    path: "/trust-center/soc2",
    summary:
      "OneSmarter's SOC 2 Type II Attested posture and related trust information.",
  },
  {
    title: "HIPAA",
    path: "/trust-center/hipaa",
    summary:
      "OneSmarter's HIPAA Security Rule Compliance Assessment Completed posture and healthcare workflow safeguards.",
  },
  {
    title: "Security Practices",
    path: "/trust-center/security-practices",
    summary:
      "Security practices for access control, auditability, secure delivery, and sensitive operational workflows.",
  },
  {
    title: "Privacy",
    path: "/trust-center/privacy",
    summary:
      "Privacy practices and links to OneSmarter policy information.",
  },
];

const collections = {
  platforms,
  technologySolutions,
  businessServices,
  complianceAssurance,
  trustCenter,
};

const pageContent = {
  platforms: {
    eyebrow: "Platforms",
    title: "Platforms",
    body:
      "OneSmarter builds focused operational platforms for secure case management, bill audit, and telecom expense management.",
    points: [
      "Configurable workflow platforms for specialized operational teams.",
      "Reporting, controls, and process visibility for recurring business activity.",
      "Secure, practical systems designed around real operating needs.",
    ],
    collection: "platforms",
  },
  hipaaTicketing: {
    eyebrow: "Platforms",
    title: "Ticketing & Case Management for HIPAA-Regulated Workflows",
    body:
      "OneSmarter provides ticketing and case management built for HIPAA-regulated workflows and designed for PHI-sensitive workflows. The platform supports secure intake, role-based access, audit history, controlled communication, workflow tracking, and compliance-aware operations without implying the product alone makes a customer HIPAA compliant.",
    points: [
      "Secure intake and structured case creation.",
      "Role-based access for teams working with sensitive information.",
      "Audit history and workflow tracking across case activity.",
      "Controlled communication for PHI-sensitive operational workflows.",
      "Supports compliance-aware ticketing and case management.",
    ],
    collection: "platforms",
  },
  billAuditErp: {
    eyebrow: "Platforms",
    title: "Bill Audit ERP & Bill Pay",
    body:
      "OneSmarter supports vendor bill intake, bill audit, historical comparison, contract analysis, discrepancy tracking, approval workflows, reporting, and connection to bill payment coordination.",
    points: [
      "Vendor bill intake and workflow routing.",
      "Historical comparison and contract analysis support.",
      "Discrepancy tracking through approval and resolution.",
      "Reporting for bill audit and payment coordination.",
    ],
    collection: "platforms",
  },
  telecomExpense: {
    eyebrow: "Platforms",
    title: "Telecom Expense Management",
    body:
      "OneSmarter helps organizations managing more than 100 mobile devices improve telecom expense visibility through bill analysis, optimization, historical review, contract comparison, and cost-control workflows.",
    points: [
      "Mobile bill analysis across large device fleets.",
      "Historical usage and spend review.",
      "Contract comparison and optimization workflows.",
      "Cost-control reporting for telecom operations.",
    ],
    collection: "platforms",
  },
  claimsProcessingServices: {
    eyebrow: "Technology Solutions",
    title: "Claims Processing Services",
    body:
      "OneSmarter supports healthcare clients with claims processing technology services, workflow automation, legacy data integration, member and provider service tools, reporting, and operational support.",
    points: [
      "Claims workflow modernization.",
      "Claims technology support.",
      "Member and provider portals.",
      "Legacy data integration.",
      "Reporting and operational visibility.",
      "Healthcare and TPA workflow support.",
      "Secure healthcare technology delivery.",
    ],
    collection: "technologySolutions",
  },
  technologySolutions: {
    eyebrow: "Technology Solutions",
    title: "Technology Solutions",
    body:
      "OneSmarter provides practical technology services across healthcare and TPA operations, claims processing services, AI agentic services, IBM i / AS400 modernization, enterprise software development, and software support consolidation.",
    points: [
      "Modernization and support for operationally critical systems.",
      "Practical AI and automation services for measurable business workflows.",
      "Software delivery and support from experienced technical teams.",
    ],
    collection: "technologySolutions",
  },
  healthcareTpa: {
    eyebrow: "Technology Solutions",
    title: "Healthcare & TPA Technology",
    body:
      "OneSmarter supports healthcare and third-party administrator technology teams with workflow modernization, secure operational systems, reporting, data integration, and support for healthcare service operations.",
    points: [
      "Workflow systems for healthcare and TPA operations.",
      "Reporting and operational visibility.",
      "Integration with legacy and modern healthcare data sources.",
      "Systems built for HIPAA-regulated workflows.",
    ],
    collection: "technologySolutions",
  },
  aiAgentic: {
    eyebrow: "Technology Solutions",
    title: "AI Agentic Services",
    body:
      "OneSmarter delivers practical AI agentic services for document workflows, internal operations, decision support, and repeatable business processes where automation can improve accuracy and turnaround time.",
    points: [
      "AI-assisted process analysis and workflow design.",
      "Document and case workflow automation.",
      "Human-in-the-loop review patterns for controlled operations.",
      "Integration with enterprise systems and reporting needs.",
    ],
    collection: "technologySolutions",
  },
  ibmIAs400: {
    eyebrow: "Technology Solutions",
    title: "IBM i / AS400 Services",
    body:
      "OneSmarter supports IBM i and AS400 environments through modernization, application support, RPG and CL development, integrations, administration support, and operational continuity planning.",
    points: [
      "IBM i / AS400 application modernization and support.",
      "RPG, SQLRPGLE, CLLE, and database work.",
      "Integration with modern web, cloud, and data systems.",
      "Operational support for business-critical legacy platforms.",
    ],
    collection: "technologySolutions",
  },
  enterpriseSoftware: {
    eyebrow: "Technology Solutions",
    title: "Enterprise Software Development",
    body:
      "OneSmarter builds custom enterprise software, portals, dashboards, integrations, workflow tools, and secure operational applications for teams with complex business requirements.",
    points: [
      "Custom application design and development.",
      "Enterprise integrations and workflow automation.",
      "Dashboards, portals, and reporting systems.",
      "Supportable software built around operational requirements.",
    ],
    collection: "technologySolutions",
  },
  supportConsolidation: {
    eyebrow: "Technology Solutions",
    title: "Software Support Consolidation",
    body:
      "OneSmarter helps organizations consolidate software support through global delivery and support teams, creating coordinated support models for maintenance, enhancements, documentation, and operational continuity.",
    points: [
      "Consolidated support teams for existing software portfolios.",
      "Maintenance, enhancements, and issue resolution workflows.",
      "Documentation and knowledge transfer support.",
      "Flexible delivery and support across time zones.",
    ],
    collection: "technologySolutions",
  },
  businessServices: {
    eyebrow: "Business Services",
    title: "Business Services",
    body:
      "OneSmarter supports small and growing organizations with practical business services across accounting, bookkeeping, tax support, EOR and HR services, third-party payment services, benefits administration, and back-office operations.",
    points: [
      "Back-office support for recurring business workflows.",
      "Finance, HR, payment, and benefits process coordination.",
      "Operational support that can connect with automation and reporting needs.",
    ],
    collection: "businessServices",
  },
  accountingTax: {
    eyebrow: "Business Services",
    title: "Accounting, Bookkeeping & Tax Support",
    body:
      "OneSmarter supports accounting, bookkeeping, reconciliations, reporting support, payables and receivables coordination, tax documentation support, filing coordination, and small-business tax process support.",
    points: [
      "Bookkeeping and transaction organization support.",
      "Reconciliations and operational reporting support.",
      "Payables and receivables coordination.",
      "Tax documentation and filing coordination support.",
    ],
    collection: "businessServices",
  },
  eorHr: {
    eyebrow: "Business Services",
    title: "EOR & HR Services",
    body:
      "OneSmarter supports EOR and HR services for US companies hiring employees in Asia, including onboarding coordination, workforce documentation, HR administration, payroll coordination, and compliance-aware operations.",
    points: [
      "Employer of record support workflows for Asia-based hiring.",
      "Onboarding coordination and workforce documentation.",
      "HR administration and employee record support.",
      "Payroll coordination and compliance-aware operations.",
    ],
    collection: "businessServices",
  },
  thirdPartyPayments: {
    eyebrow: "Business Services",
    title: "Third-Party Payment Services",
    body:
      "OneSmarter supports third-party payment services through payment coordination, documentation workflows, operational follow-up, status reporting, and controlled back-office processes.",
    points: [
      "Payment coordination and documentation support.",
      "Operational status tracking and follow-up.",
      "Reporting for payment workflows.",
      "Process controls for recurring back-office payment activity.",
    ],
    collection: "businessServices",
  },
  benefitsBackOffice: {
    eyebrow: "Business Services",
    title: "Benefits & Back Office Support",
    body:
      "OneSmarter supports benefits administration, eligibility workflows, document operations, client service support, and automation opportunities across recurring back-office processes.",
    points: [
      "Benefits administration support.",
      "Eligibility and document workflow coordination.",
      "Client service operations support.",
      "Back-office process improvement and automation opportunities.",
    ],
    collection: "businessServices",
  },
  complianceAssurance: {
    eyebrow: "Compliance & Cyber Assurance",
    title: "Compliance & Cyber Assurance",
    body:
      "OneSmarter assists clients with compliance readiness, cyber assurance coordination, evidence preparation, control documentation, framework mapping, and remediation support across common security, privacy, and process frameworks.",
    points: [
      "Readiness support for SOC, HIPAA, ISO/IEC 27001, PCI DSS, and related programs.",
      "Evidence preparation, control documentation, and gap tracking.",
      "Coordination with client teams and independent assessors where appropriate.",
      "Remediation support for findings, vulnerabilities, and process gaps.",
    ],
    collection: "complianceAssurance",
  },
  socReadiness: {
    eyebrow: "Compliance & Cyber Assurance",
    title: "SOC Readiness",
    body:
      "OneSmarter supports client SOC 1, SOC 2, and SOC 3 readiness efforts through control documentation, evidence preparation, gap review, remediation support, and coordination with client-selected independent auditors.",
    points: [
      "SOC 1, SOC 2, and SOC 3 readiness support.",
      "Control documentation and evidence preparation.",
      "Gap tracking and remediation support.",
      "Coordination support for client-selected independent audit processes.",
    ],
    collection: "complianceAssurance",
  },
  hipaaAuditReadiness: {
    eyebrow: "Compliance & Cyber Assurance",
    title: "HIPAA Audit Readiness",
    body:
      "OneSmarter supports HIPAA audit readiness through safeguards review, evidence preparation, policy and process documentation support, workflow assessment, and remediation planning for HIPAA-regulated operations.",
    points: [
      "HIPAA audit readiness and documentation support.",
      "Administrative, physical, and technical safeguard mapping.",
      "Evidence preparation and workflow review.",
      "Remediation planning for identified gaps.",
    ],
    collection: "complianceAssurance",
  },
  iso27001Readiness: {
    eyebrow: "Compliance & Cyber Assurance",
    title: "ISO/IEC 27001 Readiness",
    body:
      "OneSmarter supports ISO/IEC 27001 certification readiness through ISMS documentation support, control mapping, evidence preparation, gap tracking, and remediation coordination. Certification decisions remain with accredited certification bodies.",
    points: [
      "ISO/IEC 27001 certification readiness support.",
      "ISMS documentation and control mapping.",
      "Evidence preparation and gap tracking.",
      "Remediation coordination before certification assessment.",
    ],
    collection: "complianceAssurance",
  },
  pciDssReadiness: {
    eyebrow: "Compliance & Cyber Assurance",
    title: "PCI DSS Readiness",
    body:
      "OneSmarter supports PCI DSS readiness through scoping coordination, control documentation, evidence preparation, findings review, and remediation support for organizations preparing for payment security assessment activities.",
    points: [
      "PCI DSS readiness and scope coordination.",
      "Control documentation and evidence preparation.",
      "Findings review and remediation support.",
      "Operational support for recurring payment security workflows.",
    ],
    collection: "complianceAssurance",
  },
  frameworkMapping: {
    eyebrow: "Compliance & Cyber Assurance",
    title: "Framework Mapping",
    body:
      "OneSmarter supports framework mapping for NIST, CMMC, GDPR, and related security, privacy, and operational control frameworks where clients need practical alignment across policies, procedures, controls, and evidence.",
    points: [
      "NIST, CMMC, GDPR, and related framework mapping.",
      "Control crosswalks and requirement alignment.",
      "Policy, process, and evidence mapping.",
      "Gap tracking for prioritized remediation planning.",
    ],
    collection: "complianceAssurance",
  },
  vaptRemediation: {
    eyebrow: "Compliance & Cyber Assurance",
    title: "VAPT & Remediation",
    body:
      "OneSmarter supports vulnerability assessment and penetration testing coordination, findings review, remediation planning, closure tracking, and operational follow-up with client teams and testing partners.",
    points: [
      "VAPT coordination and findings intake.",
      "Risk-based findings review and prioritization.",
      "Remediation support and closure tracking.",
      "Reporting support for technical and operational stakeholders.",
    ],
    collection: "complianceAssurance",
  },
  cmmiReadiness: {
    eyebrow: "Compliance & Cyber Assurance",
    title: "CMMI Readiness",
    body:
      "OneSmarter supports CMMI process readiness through process documentation, practice mapping, gap review, evidence preparation, and operating rhythm support for teams improving process maturity.",
    points: [
      "CMMI process readiness and gap review.",
      "Process documentation and practice mapping.",
      "Evidence preparation and operating rhythm support.",
      "Remediation support for process maturity gaps.",
    ],
    collection: "complianceAssurance",
  },
  complianceOperations: {
    eyebrow: "Compliance & Cyber Assurance",
    title: "Compliance Operations",
    body:
      "OneSmarter supports managed compliance operations for organizations that need recurring control tracking, evidence collection, remediation follow-up, documentation maintenance, and compliance reporting support.",
    points: [
      "Recurring evidence collection and control tracking.",
      "Remediation follow-up and issue status reporting.",
      "Policy, procedure, and documentation maintenance support.",
      "Compliance operations support across business and technology teams.",
    ],
    collection: "complianceAssurance",
  },
  trustCenter: {
    eyebrow: "Trust Center",
    title: "Trust Center",
    body:
      "OneSmarter's Trust Center presents the company's own SOC 2, HIPAA, security, privacy, and compliance posture for clients evaluating secure technology and operational support.",
    points: [
      "SOC 2 Type II Attested.",
      "HIPAA Security Rule Compliance Assessment Completed.",
      "Secure delivery practices for sensitive operational workflows.",
      "Privacy and compliance-aware operations across technology and business services.",
    ],
    collection: "trustCenter",
  },
  trustSoc2: {
    eyebrow: "Trust Center",
    title: "SOC 2",
    body:
      "OneSmarter is SOC 2 Type II Attested. This Trust Center page summarizes OneSmarter's own trust posture for clients evaluating secure software delivery and operational support.",
    points: [
      "SOC 2 Type II Attested.",
      "Controls-oriented operating practices for secure delivery.",
      "Security and availability considerations for client-facing workflows.",
      "Trust documentation available through appropriate client review channels.",
    ],
    collection: "trustCenter",
  },
  trustHipaa: {
    eyebrow: "Trust Center",
    title: "HIPAA",
    body:
      "OneSmarter has completed a HIPAA Security Rule Compliance Assessment and designs selected systems for HIPAA-regulated workflows and PHI-sensitive workflows.",
    points: [
      "HIPAA Security Rule Compliance Assessment Completed.",
      "Built for HIPAA-regulated workflows where applicable.",
      "Designed for PHI-sensitive workflows where applicable.",
      "Administrative and technical safeguards considered in healthcare workflow design.",
    ],
    collection: "trustCenter",
  },
  securityPractices: {
    eyebrow: "Trust Center",
    title: "Security Practices",
    body:
      "OneSmarter's security practices support secure delivery, access control, auditability, controlled communication, and operations for sensitive client workflows.",
    points: [
      "Role-based access patterns for sensitive workflows.",
      "Audit history and workflow traceability where supported by the platform.",
      "Controlled communication and operational handoff practices.",
      "Security-aware software delivery and support processes.",
    ],
    collection: "trustCenter",
  },
  trustPrivacy: {
    eyebrow: "Trust Center",
    title: "Privacy",
    body:
      "OneSmarter maintains privacy practices and policy information for clients and website visitors. This page is a Trust Center entry point for privacy-related review.",
    points: [
      "Privacy policy information available on the website.",
      "Sensitive workflow handling considered in service delivery.",
      "Privacy-aware operations across technology and business services.",
      "Client-specific privacy requirements handled through engagement review.",
    ],
    collection: "trustCenter",
  },
  insights: {
    eyebrow: "Insights",
    title: "Insights",
    body:
      "OneSmarter insights will share practical notes on secure software, AI operations, healthcare technology, IBM i modernization, automation, and back-office process improvement.",
    points: [
      "Healthcare technology and TPA operations.",
      "Practical AI and automation patterns.",
      "IBM i / AS400 modernization.",
      "Business services and back-office workflow improvement.",
    ],
  },
};

const OfferingPage = ({ page }) => {
  const content = pageContent[page] || pageContent.platforms;
  const related = content.collection ? collections[content.collection] : [];

  return (
    <main className="overflow-x-hidden bg-white text-black pt-32 md:pt-48 pb-16 px-5 md:px-12">
      <section className="qa-container-narrow mx-auto">
        <p className="text-red-600 text-sm font-semibold uppercase tracking-wide mb-3">
          {content.eyebrow}
        </p>
        <h1 className="break-words text-2xl sm:text-3xl md:text-5xl font-bold mb-6">
          {content.title}
        </h1>
        <p className="max-w-3xl break-words text-base md:text-lg leading-relaxed text-gray-700 mb-8">
          {content.body}
        </p>

        <div
          className={
            related.length
              ? "grid md:grid-cols-[1.4fr_1fr] gap-8 items-start"
              : "max-w-3xl"
          }
        >
          <div className="min-w-0 border-l-4 border-red-600 pl-5">
            <h2 className="text-xl font-semibold mb-4">How We Help</h2>
            <ul className="space-y-3 text-gray-700">
              {content.points.map((point) => (
                <li key={point} className="break-words leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {related.length > 0 && (
            <aside className="min-w-0 bg-[#f8f9fa] border border-gray-200 rounded p-5">
              <h2 className="text-lg font-semibold mb-4">{content.eyebrow}</h2>
              <nav className="space-y-3">
                {related.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="block break-words text-sm text-red-600 hover:text-black transition"
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
            </aside>
          )}
        </div>

        {related.length > 0 &&
          (page === "platforms" ||
            page === "technologySolutions" ||
            page === "businessServices") && (
            <div className="grid md:grid-cols-2 gap-5 mt-12">
              {related.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="block border border-gray-200 rounded p-5 hover:border-red-600 transition"
                >
                <h2 className="break-words text-xl font-semibold mb-3">
                  {item.title}
                </h2>
                <p className="break-words text-sm leading-relaxed text-gray-700">
                    {item.summary}
                  </p>
                </Link>
              ))}
            </div>
          )}
      </section>
    </main>
  );
};

export default OfferingPage;
