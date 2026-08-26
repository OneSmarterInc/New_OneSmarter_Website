const trustNotes = [
  "SOC 2 Type II Attested",
  "HIPAA Security Rule Compliance Assessment Completed",
  "ISO/IEC 27001:2022 Certified (see Trust Center for certified scope)",
  "Secure software development",
  "Responsible data handling",
  "Compliance-aware operations",
];

const contact = {
  email: "care@onesmarter.com",
  phone: "+1 937 344 6241",
  address: "707 Miamisburg-Centerville Road, Dayton, OH 45459, STE 223",
};

const entry = ({
  route,
  title,
  metaDescription,
  category,
  audience = "Organizations evaluating OneSmarter services.",
  shortSummary,
  serviceType = "Information",
  keyOfferings = [],
  complianceNotes = [],
  approvedContent = [],
  relatedRoutes = [],
  promoted = true,
}) => ({
  route,
  title,
  metaDescription,
  category,
  audience,
  shortSummary,
  serviceType,
  keyOfferings,
  trustNotes,
  complianceNotes,
  approvedContent,
  relatedRoutes,
  promoted,
  markdownSummary: `${shortSummary}${keyOfferings.length ? ` Key offerings include ${keyOfferings.join(", ")}.` : ""}`,
});

export const siteDirectory = [
  entry({
    route: "/",
    title: "OneSmarter | Secure Platforms, Practical AI, Trusted Execution",
    metaDescription:
      "OneSmarter builds secure platforms, AI-enabled workflows, business services, and compliance readiness support for healthcare, financial, telecom, and growing organizations.",
    category: "Core",
    audience: "Healthcare, financial, telecom, and growing organizations.",
    shortSummary:
      "OneSmarter provides secure platforms, practical AI, technology solutions, business services, compliance and cyber assurance support, and Trust Center transparency.",
    serviceType: "Company overview",
    keyOfferings: ["Platforms", "Technology Solutions", "AI Agents", "Business Services", "Compliance & Cyber Assurance", "Trust Center"],
    relatedRoutes: ["/platforms", "/technology-solutions", "/ai-agents", "/business-services", "/compliance-assurance", "/trust-center", "/contact"],
  }),
  entry({
    route: "/platforms",
    title: "Platforms | OneSmarter",
    metaDescription:
      "Operational platforms for secure ticketing and case management, plus bill audit and bill pay workflows.",
    category: "Platforms",
    shortSummary:
      "OneSmarter platforms support secure ticketing and case management, plus bill audit and bill pay workflows.",
    serviceType: "Platform category",
    keyOfferings: ["Secure Ticketing and Case Management", "Bill Audit & Bill Pay"],
    relatedRoutes: ["/platforms/hipaa-regulated-ticketing", "/platforms/bill-audit-erp-bill-pay"],
  }),
  entry({
    route: "/platforms/hipaa-regulated-ticketing",
    title: "Secure Ticketing and Case Management | OneSmarter",
    metaDescription:
      "Secure ticketing and case management built for HIPAA-regulated workflows, PHI-sensitive operations, role-based access, audit history, and accountable issue resolution.",
    category: "Platforms",
    audience: "Healthcare and operational teams managing PHI-sensitive workflows.",
    shortSummary:
      "Secure ticketing and case management built for HIPAA-regulated workflows, PHI-sensitive operations, role-based access, audit history, and accountable issue resolution.",
    serviceType: "Software platform",
    keyOfferings: ["Secure intake", "Role-based access", "Audit history", "Controlled communication", "Workflow tracking"],
    complianceNotes: ["Built for HIPAA-regulated workflows", "Designed for PHI-sensitive workflows", "Supports compliance-aware ticketing and case management"],
    relatedRoutes: ["/trust-center/hipaa", "/trust-center/security-practices", "/contact"],
  }),
  entry({
    route: "/platforms/bill-audit-erp-bill-pay",
    title: "Bill Audit & Bill Pay | OneSmarter",
    metaDescription:
      "Bill Audit & Bill Pay for vendor bill review, recurring expense analysis, discrepancy tracking, approval coordination, payment workflows, and telecom expense management use cases.",
    category: "Platforms",
    shortSummary:
      "A bill audit and bill pay platform for vendor bill review, recurring expense analysis, discrepancy tracking, approvals, payment workflows, and telecom expense management use cases.",
    serviceType: "Software platform",
    keyOfferings: ["Vendor bill review", "Recurring expense analysis", "Discrepancy tracking", "Approval workflows", "Payment workflows", "Telecom expense management use cases"],
    relatedRoutes: ["/platforms", "/technology-solutions/enterprise-software", "/contact"],
  }),
  entry({
    route: "/platforms/telecom-expense-management",
    title: "Telecom Expense Management Use Case | OneSmarter",
    promoted: false,
    metaDescription:
      "Telecom expense management is handled as a Bill Audit & Bill Pay use case for organizations managing large mobile-device fleets.",
    category: "Platforms",
    audience: "Organizations managing more than 100 mobile devices.",
    shortSummary:
      "Telecom expense management is a Bill Audit & Bill Pay use case for bill analysis, contract and rate comparison, historical usage review, and cost-control reporting.",
    serviceType: "Use case",
    keyOfferings: ["Bill analysis", "Contract and rate comparison", "Historical usage review", "Cost-control reporting"],
    relatedRoutes: ["/platforms/bill-audit-erp-bill-pay", "/contact"],
  }),
  entry({
    route: "/technology-solutions",
    title: "Technology Solutions | OneSmarter",
    metaDescription:
      "Technology services across healthcare and TPA operations, claims processing services, practical AI, IBM i / AS400, enterprise software, and support consolidation.",
    category: "Technology Solutions",
    shortSummary:
      "Technology services for healthcare operations, claims processing services, practical AI, IBM i / AS400, enterprise software, and support consolidation.",
    serviceType: "Technology services category",
    keyOfferings: ["Healthcare & TPA Technology", "Claims Processing Services", "AI Agentic Services", "IBM i / AS400 Services", "Enterprise Software Development"],
    relatedRoutes: ["/technology-solutions/healthcare-tpa", "/technology-solutions/claims-processing-services", "/technology-solutions/ai-agentic-services"],
  }),
  entry({
    route: "/technology-solutions/healthcare-tpa",
    title: "Healthcare & TPA Technology | OneSmarter",
    metaDescription:
      "Workflow modernization, secure operational systems, reporting, data integration, and support for healthcare and TPA operations.",
    category: "Technology Solutions",
    audience: "Healthcare providers, TPAs, and healthcare operations teams.",
    shortSummary:
      "Healthcare and TPA technology services for workflow modernization, secure systems, reporting, integration, and support.",
    serviceType: "Technology service",
    keyOfferings: ["Workflow modernization", "Reporting", "Data integration", "Secure operational systems"],
    complianceNotes: ["Built for HIPAA-regulated workflows where applicable"],
    relatedRoutes: ["/trust-center/hipaa", "/technology-solutions/claims-processing-services", "/contact"],
  }),
  entry({
    route: "/technology-solutions/claims-processing-services",
    title: "Claims Processing Services | OneSmarter",
    metaDescription:
      "Healthcare claims processing technology services, workflow automation, legacy data integration, member and provider service tools, reporting, and operational support.",
    category: "Technology Solutions",
    audience: "Healthcare and TPA teams that need claims workflow support.",
    shortSummary:
      "Claims Processing Services are service-oriented healthcare technology support, not a commercially available claims processing product.",
    serviceType: "Technology service",
    keyOfferings: ["Claims workflow modernization", "Claims technology support", "Member and provider portals", "Legacy data integration", "Reporting"],
    complianceNotes: ["Secure healthcare technology delivery", "Designed for PHI-sensitive workflows where applicable"],
    relatedRoutes: ["/technology-solutions/healthcare-tpa", "/trust-center/security-practices", "/contact"],
  }),
  entry({
    route: "/technology-solutions/ai-agentic-services",
    title: "AI Agentic Services | OneSmarter",
    metaDescription:
      "Practical AI services for document workflows, internal operations, decision support, and repeatable business processes.",
    category: "Technology Solutions",
    shortSummary:
      "Practical AI services for controlled automation, document workflows, decision support, and repeatable business processes.",
    serviceType: "AI service",
    keyOfferings: ["AI-assisted workflow design", "Document automation", "Human-in-the-loop review", "Enterprise integration"],
    relatedRoutes: ["/technology-solutions", "/technology-solutions/enterprise-software", "/contact"],
  }),
  entry({
    route: "/ai-agents",
    title: "Practical AI Agents for Secure, Accountable Workflows | OneSmarter",
    metaDescription:
      "Meet Mira Vale, OneSmarter's live AI website guide answering from approved public content, and the wider named agent team OneSmarter is developing.",
    category: "AI Agents",
    audience: "Organizations evaluating practical AI agents for secure, accountable workflows.",
    shortSummary:
      "The AI Agents page introduces OneSmarter's named digital agent team. Mira Vale is live and answers visitor questions from approved public content within stated guardrails. Theo, Elena, Ravi and Selene are agents in development, and the Café is where their off-duty conversations will appear once published.",
    serviceType: "AI showcase",
    keyOfferings: [
      "Mira Vale live website guide",
      "Theo Mercer agent in development",
      "Elena Cross agent in development",
      "Ravi Sen agent in development",
      "Selene Hart agent in development",
      "The Café",
    ],
    complianceNotes: ["Answers from approved public content only", "No PHI", "No confidential uploads", "No legal or medical advice", "No compliance guarantees"],
    relatedRoutes: ["/technology-solutions/ai-agentic-services", "/trust-center", "/compliance-assurance", "/contact"],
  }),
  entry({
    route: "/technology-solutions/ibm-i-as400",
    title: "IBM i / AS400 Services | OneSmarter",
    metaDescription:
      "IBM i and AS400 modernization, RPG and CL development, integrations, administration support, and operational continuity.",
    category: "Technology Solutions",
    shortSummary:
      "IBM i / AS400 services for modernization, application support, RPG and CL development, integrations, and operational continuity.",
    serviceType: "Technology service",
    keyOfferings: ["Application modernization", "RPG support", "CL development", "Integrations", "Operational continuity"],
    relatedRoutes: ["/technology-solutions", "/technology-solutions/software-support-consolidation", "/contact"],
  }),
  entry({
    route: "/technology-solutions/enterprise-software",
    title: "Enterprise Software Development | OneSmarter",
    metaDescription:
      "Custom enterprise applications, portals, dashboards, integrations, workflow tools, and secure operational software.",
    category: "Technology Solutions",
    shortSummary:
      "Enterprise software development for custom applications, portals, dashboards, integrations, workflow tools, and secure operations.",
    serviceType: "Technology service",
    keyOfferings: ["Custom applications", "Integrations", "Dashboards", "Portals", "Workflow tools"],
    relatedRoutes: ["/technology-solutions", "/trust-center/security-practices", "/contact"],
  }),
  entry({
    route: "/technology-solutions/software-support-consolidation",
    title: "Software Support Consolidation | OneSmarter",
    metaDescription:
      "Software support consolidation through global delivery and support teams for maintenance, enhancements, documentation, and operational continuity.",
    category: "Technology Solutions",
    shortSummary:
      "Software support consolidation through global delivery and support teams for maintenance, enhancements, documentation, and continuity.",
    serviceType: "Technology support service",
    keyOfferings: ["Maintenance", "Enhancements", "Issue resolution", "Documentation", "Knowledge transfer"],
    relatedRoutes: ["/technology-solutions", "/business-services/eor-hr", "/contact"],
  }),
  entry({
    route: "/business-services",
    title: "Business Services | OneSmarter",
    metaDescription:
      "Business services across accounting, bookkeeping, tax support, EOR and HR services, third-party payment services, benefits, and back-office operations.",
    category: "Business Services",
    shortSummary:
      "Business services for finance, HR, payment, benefits, and back-office workflows.",
    serviceType: "Business services category",
    keyOfferings: ["Accounting, Bookkeeping & Tax Support", "EOR & HR Services", "Third-Party Payment Services", "Benefits & Back Office Support"],
    relatedRoutes: ["/business-services/accounting-bookkeeping-tax", "/business-services/eor-hr", "/business-services/third-party-payment-services"],
  }),
  entry({
    route: "/business-services/accounting-bookkeeping-tax",
    title: "Accounting, Bookkeeping & Tax Support | OneSmarter",
    metaDescription:
      "Accounting, bookkeeping, reconciliations, reporting support, payables and receivables coordination, tax documentation support, and filing coordination.",
    category: "Business Services",
    shortSummary:
      "Accounting, bookkeeping, and tax support for reconciliations, reporting, payables, receivables, documentation, and filing coordination.",
    serviceType: "Business service",
    keyOfferings: ["Bookkeeping", "Reconciliations", "Reporting support", "Payables and receivables", "Tax documentation support"],
    relatedRoutes: ["/business-services", "/contact"],
  }),
  entry({
    route: "/business-services/eor-hr",
    title: "EOR & HR Services | OneSmarter",
    metaDescription:
      "Employer of record and HR services for US companies hiring employees in Asia, including onboarding, documentation, HR administration, and payroll coordination.",
    category: "Business Services",
    audience: "US companies hiring employees in Asia.",
    shortSummary:
      "EOR and HR services for US companies hiring employees in Asia, including onboarding coordination and workforce documentation.",
    serviceType: "Business service",
    keyOfferings: ["Employer of record support", "Onboarding coordination", "HR administration", "Workforce documentation", "Payroll coordination"],
    approvedContent: [
      "Practice hiring support: OneSmarter helps practices hire with focus — job postings written around the exact specialty, skills, and experience the role requires (a PA with specific specialty and procedure experience, not a generic PA posting), candidate screening against those stated requirements, and credentialing tracked from offer through completion.",
      "Agent-assisted hiring (in development): OneSmarter is building agent support for practice hiring — drafting postings, coordinating candidate communication, and tracking credentialing steps. This capability is in development and is not yet an offered service; no availability date is committed. Practices can express early interest via care@onesmarter.com. Do not describe agent-assisted hiring as currently available.",
    ],
    relatedRoutes: ["/business-services", "/contact"],
  }),
  entry({
    route: "/business-services/third-party-payment-services",
    title: "Third-Party Payment Services | OneSmarter",
    metaDescription:
      "Third-party payment coordination, documentation workflows, payment operations support, status reporting, and controlled back-office processes.",
    category: "Business Services",
    shortSummary:
      "Third-party payment services for payment coordination, documentation workflows, operational follow-up, and reporting.",
    serviceType: "Business service",
    keyOfferings: ["Payment coordination", "Documentation workflows", "Payment operations support", "Status reporting"],
    relatedRoutes: ["/business-services", "/contact"],
  }),
  entry({
    route: "/business-services/benefits-back-office",
    title: "Benefits & Back Office Support | OneSmarter",
    metaDescription:
      "Benefits administration support, eligibility workflows, document operations, client service support, and back-office automation opportunities.",
    category: "Business Services",
    shortSummary:
      "Benefits and back-office support for benefits administration, eligibility workflows, document operations, and client service support.",
    serviceType: "Business service",
    keyOfferings: ["Benefits administration support", "Eligibility workflows", "Document operations", "Client service support", "Automation opportunities"],
    relatedRoutes: ["/business-services", "/contact"],
  }),
  entry({
    route: "/compliance-assurance",
    title: "Compliance & Cyber Assurance | OneSmarter",
    metaDescription:
      "Client-facing compliance and cyber assurance readiness support, evidence preparation, control documentation, framework mapping, VAPT coordination, and remediation support.",
    category: "Compliance & Cyber Assurance",
    shortSummary:
      "Compliance and cyber assurance services help clients prepare for reviews, organize evidence, document controls, map frameworks, and coordinate remediation.",
    serviceType: "Compliance service category",
    keyOfferings: ["SOC readiness", "HIPAA audit readiness", "ISO/IEC 27001 readiness", "PCI DSS readiness", "Framework mapping", "VAPT & remediation"],
    relatedRoutes: ["/compliance-assurance/soc-readiness", "/compliance-assurance/hipaa-audit-readiness", "/trust-center"],
  }),
  entry({
    route: "/compliance-assurance/soc-readiness",
    title: "SOC Readiness Support | OneSmarter",
    metaDescription:
      "SOC 1, SOC 2, and SOC 3 readiness support, evidence preparation, control documentation, gap tracking, remediation support, and auditor coordination.",
    category: "Compliance & Cyber Assurance",
    shortSummary:
      "SOC readiness support for evidence preparation, control documentation, gap tracking, remediation support, and coordination with client-selected auditors.",
    serviceType: "Compliance service",
    keyOfferings: ["SOC 1 readiness", "SOC 2 readiness", "SOC 3 readiness", "Evidence preparation", "Control documentation"],
    complianceNotes: ["OneSmarter does not issue SOC reports"],
    relatedRoutes: ["/compliance-assurance", "/trust-center/soc2", "/contact"],
  }),
  entry({
    route: "/compliance-assurance/hipaa-audit-readiness",
    title: "HIPAA Audit Readiness Support | OneSmarter",
    metaDescription:
      "HIPAA audit readiness support, safeguards mapping, documentation review, evidence preparation, and remediation planning.",
    category: "Compliance & Cyber Assurance",
    shortSummary:
      "HIPAA audit readiness support for safeguards mapping, documentation review, evidence preparation, and remediation planning.",
    serviceType: "Compliance service",
    keyOfferings: ["Safeguards mapping", "Documentation review", "Evidence preparation", "Remediation planning"],
    complianceNotes: ["This is readiness support and should not be described as a certification"],
    relatedRoutes: ["/compliance-assurance", "/trust-center/hipaa", "/contact"],
  }),
  entry({
    route: "/compliance-assurance/iso-27001-readiness",
    title: "ISO/IEC 27001 Readiness Support | OneSmarter",
    metaDescription:
      "ISO/IEC 27001 certification readiness support, ISMS documentation, control mapping, evidence preparation, and remediation coordination.",
    category: "Compliance & Cyber Assurance",
    shortSummary:
      "ISO/IEC 27001 readiness support for ISMS documentation, control mapping, evidence preparation, and remediation coordination.",
    serviceType: "Compliance service",
    keyOfferings: ["ISMS documentation", "Control mapping", "Evidence preparation", "Remediation coordination"],
    complianceNotes: ["OneSmarter does not issue ISO certificates"],
    relatedRoutes: ["/compliance-assurance", "/contact"],
  }),
  entry({
    route: "/compliance-assurance/pci-dss-readiness",
    title: "PCI DSS Readiness Support | OneSmarter",
    metaDescription:
      "PCI DSS readiness support, scope coordination, control documentation, evidence preparation, findings review, and remediation support.",
    category: "Compliance & Cyber Assurance",
    shortSummary:
      "PCI DSS readiness support for scope coordination, control documentation, evidence preparation, findings review, and remediation support.",
    serviceType: "Compliance service",
    keyOfferings: ["Scope coordination", "Control documentation", "Evidence preparation", "Findings review", "Remediation support"],
    complianceNotes: ["Positioned as readiness support, not a PCI compliance claim"],
    relatedRoutes: ["/compliance-assurance", "/contact"],
  }),
  entry({
    route: "/compliance-assurance/framework-mapping",
    title: "Framework Mapping | OneSmarter",
    metaDescription:
      "Framework mapping for NIST, CMMC, GDPR, and related security, privacy, and operational control frameworks.",
    category: "Compliance & Cyber Assurance",
    shortSummary:
      "Framework mapping for NIST, CMMC, GDPR, and related security, privacy, and operational control frameworks.",
    serviceType: "Compliance service",
    keyOfferings: ["Framework crosswalks", "Control mapping", "Gap tracking", "Requirement alignment"],
    relatedRoutes: ["/compliance-assurance", "/contact"],
  }),
  entry({
    route: "/compliance-assurance/vapt-remediation",
    title: "VAPT & Remediation Support | OneSmarter",
    metaDescription:
      "VAPT coordination, findings review, remediation planning, closure tracking, and operational follow-up.",
    category: "Compliance & Cyber Assurance",
    shortSummary:
      "VAPT coordination and remediation support for findings intake, prioritization, closure tracking, and follow-up.",
    serviceType: "Cyber assurance service",
    keyOfferings: ["VAPT coordination", "Findings review", "Remediation planning", "Closure tracking"],
    relatedRoutes: ["/compliance-assurance", "/contact"],
  }),
  entry({
    route: "/compliance-assurance/cmmi-readiness",
    title: "CMMI Readiness Support | OneSmarter",
    metaDescription:
      "CMMI process readiness support, process documentation, practice mapping, gap review, evidence preparation, and operating rhythm support.",
    category: "Compliance & Cyber Assurance",
    shortSummary:
      "CMMI readiness support for process documentation, practice mapping, gap review, evidence preparation, and operating rhythm support.",
    serviceType: "Compliance service",
    keyOfferings: ["Process documentation", "Practice mapping", "Gap review", "Evidence preparation"],
    relatedRoutes: ["/compliance-assurance", "/contact"],
  }),
  entry({
    route: "/compliance-assurance/compliance-operations",
    title: "Compliance Operations Support | OneSmarter",
    metaDescription:
      "Managed compliance operations for recurring evidence collection, control tracking, remediation follow-up, documentation maintenance, and reporting.",
    category: "Compliance & Cyber Assurance",
    shortSummary:
      "Managed compliance operations for recurring evidence collection, control tracking, remediation follow-up, documentation maintenance, and reporting.",
    serviceType: "Compliance operations service",
    keyOfferings: ["Evidence collection", "Control tracking", "Remediation follow-up", "Documentation maintenance", "Reporting"],
    relatedRoutes: ["/compliance-assurance", "/contact"],
  }),
  entry({
    route: "/trust-center",
    title: "Trust Center | OneSmarter",
    metaDescription:
      "OneSmarter's Trust Center explains its own SOC 2, HIPAA, ISO/IEC 27001, security, privacy, secure development, and responsible data handling posture.",
    category: "Trust Center",
    shortSummary:
      "The Trust Center explains OneSmarter's own security, privacy, SOC 2, HIPAA, ISO/IEC 27001, secure development, and responsible data handling posture.",
    serviceType: "Trust information",
    keyOfferings: ["SOC 2 Type II Attested", "HIPAA Security Rule Compliance Assessment Completed", "ISO/IEC 27001 Certified", "Security Practices", "Privacy"],
    relatedRoutes: ["/trust-center/soc2", "/trust-center/hipaa", "/trust-center/iso-27001", "/trust-center/security-practices", "/trust-center/privacy"],
  }),
  entry({
    route: "/trust-center/soc2",
    title: "SOC 2 Type II Attested | OneSmarter Trust Center",
    metaDescription:
      "OneSmarter is SOC 2 Type II Attested as part of its ongoing security and operational controls program.",
    category: "Trust Center",
    shortSummary:
      "OneSmarter is SOC 2 Type II Attested as part of its ongoing security and operational controls program.",
    serviceType: "Trust information",
    keyOfferings: ["Independent attestation", "Security controls", "Operational discipline", "Ongoing monitoring"],
    complianceNotes: ["Use attestation language, not certification language"],
    relatedRoutes: ["/trust-center", "/trust-center/security-practices", "/contact"],
  }),
  entry({
    route: "/trust-center/hipaa",
    title: "HIPAA Security Rule Compliance Assessment Completed | OneSmarter Trust Center",
    metaDescription:
      "OneSmarter has completed an independent HIPAA Security Rule compliance assessment covering applicable safeguards and practices.",
    category: "Trust Center",
    shortSummary:
      "OneSmarter has completed an independent HIPAA Security Rule compliance assessment covering applicable safeguards and practices.",
    serviceType: "Trust information",
    keyOfferings: ["Administrative safeguards", "Technical safeguards", "Physical safeguards", "Access management", "Ongoing risk awareness"],
    complianceNotes: ["HIPAA Security Rule Compliance Assessment Completed", "Do not describe this assessment as a certification"],
    relatedRoutes: ["/trust-center", "/trust-center/security-practices", "/contact"],
  }),
  entry({
    route: "/trust-center/iso-27001",
    title: "ISO/IEC 27001:2022 Certified | OneSmarter Trust Center",
    metaDescription:
      "One Smarter Inc. is ISO/IEC 27001:2022 certified for its stated scope, under certificate 210826050107 issued by ARS Assessment Private Limited.",
    category: "Trust Center",
    shortSummary:
      "One Smarter Inc. is ISO/IEC 27001:2022 certified for AWS cloud services development, HR and people management solutions development, and governance activities in the One Smarter application.",
    serviceType: "Trust information",
    keyOfferings: ["Certificate 210826050107", "ARS Assessment Private Limited", "UAF accredited", "Valid 21 August 2026 through 20 August 2029", "Verification at arscert.com and iafcertsearch.org"],
    complianceNotes: [
      "ISO/IEC 27001:2022 Certified (see Trust Center for certified scope)",
      "The certified scope does not automatically cover claims processing, healthcare services, all platforms, all customer systems, or every service",
      "One Smarter Inc. does not issue ISO certificates",
    ],
    relatedRoutes: ["/trust-center", "/trust-center/security-practices", "/contact"],
  }),
  entry({
    route: "/trust-center/security-practices",
    title: "Security Practices | OneSmarter Trust Center",
    metaDescription:
      "OneSmarter security practices include secure software development, access control, least privilege, change management, risk review, and incident response readiness.",
    category: "Trust Center",
    shortSummary:
      "OneSmarter security practices cover secure software development, access control, least privilege, change management, risk review, and incident response readiness.",
    serviceType: "Trust information",
    keyOfferings: ["Secure software development", "Access control", "Least privilege", "Change management", "Risk review", "Incident response readiness"],
    relatedRoutes: ["/trust-center", "/trust-center/soc2", "/trust-center/hipaa"],
  }),
  entry({
    route: "/trust-center/privacy",
    title: "Privacy & Responsible Data Handling | OneSmarter Trust Center",
    metaDescription:
      "OneSmarter privacy practices emphasize client confidentiality, limited access, privacy-aware operations, and careful handling of sensitive business and healthcare information.",
    category: "Trust Center",
    shortSummary:
      "OneSmarter privacy practices emphasize client confidentiality, limited access, privacy-aware operations, and careful handling of sensitive information.",
    serviceType: "Trust information",
    keyOfferings: ["Client confidentiality", "Responsible data handling", "Limited access", "Privacy-aware operations"],
    relatedRoutes: ["/policies/privacy-policy", "/policies/terms-of-use", "/contact"],
  }),
  entry({
    route: "/insights",
    title: "Insights | OneSmarter",
    promoted: false,
    metaDescription:
      "Practical notes on secure software, AI operations, healthcare technology, IBM i modernization, automation, compliance readiness, and back-office improvement.",
    category: "Core",
    shortSummary:
      "Insights will cover secure software, AI operations, healthcare technology, IBM i modernization, automation, compliance readiness, and back-office improvement.",
    serviceType: "Information",
    keyOfferings: ["Healthcare technology", "AI operations", "IBM i modernization", "Compliance readiness"],
    relatedRoutes: ["/technology-solutions", "/compliance-assurance", "/contact"],
  }),
  entry({
    route: "/aboutus/Introduction",
    title: "About OneSmarter",
    metaDescription:
      "Learn about OneSmarter, a Dayton, Ohio company providing secure technology, business services, compliance support, and trusted execution.",
    category: "Core",
    shortSummary:
      "OneSmarter is a Dayton, Ohio company providing secure technology, business services, compliance support, and trusted execution.",
    serviceType: "Company information",
    keyOfferings: ["Company overview", "Mission", "Vision"],
    relatedRoutes: ["/contact", "/trust-center"],
  }),
  entry({
    route: "/contact",
    title: "Contact OneSmarter",
    promoted: false,
    metaDescription:
      "Contact OneSmarter by email at care@onesmarter.com.",
    category: "Core",
    audience: "Prospects, clients, and partners.",
    shortSummary:
      `Contact OneSmarter by email at ${contact.email}.`,
    serviceType: "Contact",
    keyOfferings: ["Email"],
    relatedRoutes: ["/", "/trust-center"],
  }),
  entry({
    route: "/policies/privacy-policy",
    title: "Privacy Policy | OneSmarter",
    metaDescription:
      "OneSmarter privacy policy information for website visitors and clients.",
    category: "Legal",
    shortSummary:
      "Privacy policy information for OneSmarter website visitors and clients.",
    serviceType: "Legal information",
    keyOfferings: ["Privacy policy"],
    relatedRoutes: ["/trust-center/privacy", "/contact"],
  }),
  entry({
    route: "/policies/terms-of-use",
    title: "Terms Of Use | OneSmarter",
    metaDescription:
      "Terms governing access to and use of OneSmarter services and website information.",
    category: "Legal",
    shortSummary:
      "Terms governing access to and use of OneSmarter services and website information.",
    serviceType: "Legal information",
    keyOfferings: ["Terms Of Use"],
    relatedRoutes: ["/policies/privacy-policy", "/contact"],
  }),
];

export const siteContact = contact;
export const siteBaseUrl = "https://www.onesmarter.com";
export const promotedSiteDirectory = siteDirectory.filter((item) => item.promoted);
export const activePublicRoutes = promotedSiteDirectory.map((item) => item.route);

export const getSiteEntry = (route) =>
  siteDirectory.find((item) => item.route === route);

export const groupedSiteDirectory = promotedSiteDirectory.reduce((groups, item) => {
  groups[item.category] = groups[item.category] || [];
  groups[item.category].push(item);
  return groups;
}, {});
