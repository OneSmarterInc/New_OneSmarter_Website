export const onesmarterPublicKnowledgeBase = [
  {
    id: "company-overview",
    route: "/",
    title: "OneSmarter Overview",
    category: "Core",
    approvedSummary:
      "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance readiness support for healthcare, financial, telecom, and growing organizations.",
    sourceFacts: [
      "OneSmarter is organized around Platforms, Technology Solutions, AI Agents, Business Services, Compliance & Cyber Assurance, and the Trust Center.",
      "OneSmarter emphasizes secure software, practical AI, responsible data handling, and trusted execution.",
      "Business inquiries should route to care@onesmarter.com.",
    ],
    allowedClaims: [
      "Secure platforms",
      "Practical AI workflows",
      "Business services",
      "Compliance readiness support",
      "Healthcare, financial, telecom, and growing organizations",
    ],
    disallowedClaims: [
      "OneSmarter guarantees compliance",
      "OneSmarter provides legal or medical advice",
      "OneSmarter is a staffing company",
    ],
    handoffGuidance:
      "Route pricing, procurement, partnership, contract, and client-specific questions to care@onesmarter.com.",
    relatedQuestions: [
      "What does OneSmarter do?",
      "Who does OneSmarter help?",
      "How should I contact OneSmarter?",
    ],
    sourceLabel: "siteDirectory.js and public LLM summaries",
  },
  {
    id: "secure-ticketing-case-management",
    route: "/platforms/hipaa-regulated-ticketing",
    title: "Secure Ticketing and Case Management",
    category: "Platforms",
    approvedSummary:
      "Secure Ticketing and Case Management is a platform built for HIPAA-regulated workflows, PHI-sensitive operations, role-based access, audit history, controlled communication, workflow tracking, and accountable issue resolution.",
    sourceFacts: [
      "The platform supports secure intake, role-based access, audit history, controlled communication, and workflow tracking.",
      "The page uses supporting language such as built for HIPAA-regulated workflows and designed for PHI-sensitive workflows.",
      "The platform should not be described as making a customer HIPAA compliant by itself.",
    ],
    allowedClaims: [
      "Built for HIPAA-regulated workflows",
      "Designed for PHI-sensitive workflows",
      "Supports compliance-aware ticketing and case management",
      "Supports role-based access and audit history",
    ],
    disallowedClaims: [
      "HIPAA Certified",
      "HIPAA Certification",
      "The platform guarantees HIPAA compliance",
      "The platform makes a customer HIPAA compliant by itself",
    ],
    handoffGuidance:
      "Route regulated-workflow, procurement, security-review, or implementation-specific questions to care@onesmarter.com.",
    relatedQuestions: [
      "What is Secure Ticketing and Case Management?",
      "Is the ticketing platform built for HIPAA-regulated workflows?",
      "Can I share PHI here?",
    ],
    sourceLabel: "siteDirectory.js: /platforms/hipaa-regulated-ticketing",
  },
  {
    id: "bill-audit-bill-pay",
    route: "/platforms/bill-audit-erp-bill-pay",
    title: "Bill Audit & Bill Pay",
    category: "Platforms",
    approvedSummary:
      "Bill Audit & Bill Pay helps organizations review vendor bills, analyze recurring expenses, identify discrepancies, coordinate approvals, support payment workflows, and manage telecom expense use cases.",
    sourceFacts: [
      "The platform supports vendor bill review, recurring expense analysis, discrepancy tracking, approval workflows, and payment workflows.",
      "Telecom Expense Management is treated as a use case under Bill Audit & Bill Pay, not as a standalone promoted platform.",
      "Telecom use cases include bill analysis, contract and rate comparison, historical usage review, and cost-control reporting.",
    ],
    allowedClaims: [
      "Vendor bill review",
      "Recurring expense analysis",
      "Discrepancy tracking",
      "Approval workflows",
      "Payment workflows",
      "Telecom expense management use cases",
    ],
    disallowedClaims: [
      "Telecom Expense Management is a standalone OneSmarter platform",
      "Bill Audit & Bill Pay guarantees savings",
      "OneSmarter acts as a bank or licensed payment processor unless separately confirmed",
    ],
    handoffGuidance:
      "Route pricing, payment-process, implementation, and contract-specific questions to care@onesmarter.com.",
    relatedQuestions: [
      "What is Bill Audit & Bill Pay?",
      "What is telecom expense management?",
      "Do you support vendor bill review?",
    ],
    sourceLabel: "siteDirectory.js: /platforms/bill-audit-erp-bill-pay",
  },
  {
    id: "technology-solutions-overview",
    route: "/technology-solutions",
    title: "Technology Solutions Overview",
    category: "Technology Solutions",
    approvedSummary:
      "OneSmarter provides technology services for healthcare operations, claims processing services, practical AI, IBM i / AS400, enterprise software, and software support consolidation.",
    sourceFacts: [
      "Technology Solutions includes Healthcare & TPA Technology, Claims Processing Services, AI Agentic Services, IBM i / AS400 Services, Enterprise Software Development, and Software Support Consolidation.",
      "Claims Processing Services are positioned as services, not as a commercially available claims product.",
      "Software support consolidation uses global delivery and support teams.",
    ],
    allowedClaims: [
      "Healthcare and TPA technology services",
      "Claims Processing Services",
      "AI Agentic Services",
      "IBM i / AS400 Services",
      "Enterprise software development",
      "Software support consolidation",
    ],
    disallowedClaims: [
      "Claims Processing System",
      "Claims Processing Platform",
      "Production-ready claims platform",
      "Available claims product",
    ],
    handoffGuidance:
      "Route technology discovery, project scope, modernization, or support consolidation questions to care@onesmarter.com.",
    relatedQuestions: [
      "What technology services do you offer?",
      "Do you support healthcare technology?",
      "Do you work with IBM i or AS400 systems?",
    ],
    sourceLabel: "siteDirectory.js: /technology-solutions",
  },
  {
    id: "claims-processing-services",
    route: "/technology-solutions/claims-processing-services",
    title: "Claims Processing Services",
    category: "Technology Solutions",
    approvedSummary:
      "Claims Processing Services are healthcare technology services for claims workflow modernization, claims technology support, member and provider portals, legacy data integration, reporting, and operational visibility.",
    sourceFacts: [
      "Claims Processing Services are service-oriented healthcare technology support.",
      "They are not positioned as a commercially available claims processing product.",
      "The offering supports healthcare and TPA workflow support and secure healthcare technology delivery.",
    ],
    allowedClaims: [
      "Claims workflow modernization",
      "Claims technology support",
      "Member and provider portals",
      "Legacy data integration",
      "Reporting and operational visibility",
      "Healthcare and TPA workflow support",
    ],
    disallowedClaims: [
      "Claims Processing System",
      "Claims Processing Platform",
      "OneSmarter acts as a payer",
      "OneSmarter acts as a licensed claims adjudicator",
      "OneSmarter sells a production-ready claims platform today",
    ],
    handoffGuidance:
      "Route healthcare operations, claims workflow, data, or regulated-service questions to care@onesmarter.com.",
    relatedQuestions: [
      "What are Claims Processing Services?",
      "Do you support healthcare claims workflows?",
      "Are you selling a claims platform?",
    ],
    sourceLabel: "siteDirectory.js: /technology-solutions/claims-processing-services",
  },
  {
    id: "ai-agentic-services",
    route: "/technology-solutions/ai-agentic-services",
    title: "AI Agentic Services",
    category: "Technology Solutions",
    approvedSummary:
      "AI Agentic Services are practical AI services for controlled automation, document workflows, decision support, human-in-the-loop review, enterprise integration, and repeatable business processes.",
    sourceFacts: [
      "The service emphasizes controlled automation and practical workflow design.",
      "OneSmarter's V2 AI Agents page is a public-content concept and showcase, not a live AI service yet.",
      "The first live agent candidate is Mira Vale, scoped to approved public website content.",
    ],
    allowedClaims: [
      "AI-assisted workflow design",
      "Document automation",
      "Human-in-the-loop review",
      "Enterprise integration",
      "Public-content website guide concept",
    ],
    disallowedClaims: [
      "Autonomous replacement of professional judgment",
      "Guaranteed AI accuracy",
      "Live agent-to-agent production workflow unless separately implemented",
    ],
    handoffGuidance:
      "Route AI workflow scoping, automation strategy, and implementation questions to care@onesmarter.com.",
    relatedQuestions: [
      "What are AI Agentic Services?",
      "Who is Mira Vale?",
      "Do you offer AI workflow support?",
    ],
    sourceLabel: "siteDirectory.js and V2 planning docs",
  },
  {
    id: "business-services-overview",
    route: "/business-services",
    title: "Business Services Overview",
    category: "Business Services",
    approvedSummary:
      "OneSmarter provides business services for finance, HR, payment, benefits, and back-office workflows, including accounting, bookkeeping, tax support, EOR and HR services, third-party payment services, and benefits back-office support.",
    sourceFacts: [
      "Business Services are separate from Technology Solutions.",
      "The business services structure should not position OneSmarter as a staffing agency.",
      "EOR and HR services include onboarding coordination, workforce documentation, HR administration, and payroll coordination.",
    ],
    allowedClaims: [
      "Accounting, Bookkeeping & Tax Support",
      "EOR & HR Services",
      "Third-Party Payment Services",
      "Benefits & Back Office Support",
      "Back-office workflow support",
    ],
    disallowedClaims: [
      "Staffing Services",
      "OneSmarter is a staffing company",
      "OneSmarter provides legal, CPA, or tax advice unless separately supported",
    ],
    handoffGuidance:
      "Route finance, HR, tax, EOR, payment, and benefits-specific questions to care@onesmarter.com.",
    relatedQuestions: [
      "What business services do you offer?",
      "Do you offer accounting support?",
      "Do you offer EOR and HR services?",
    ],
    sourceLabel: "siteDirectory.js: /business-services",
  },
  {
    id: "compliance-cyber-assurance-overview",
    route: "/compliance-assurance",
    title: "Compliance & Cyber Assurance Overview",
    category: "Compliance & Cyber Assurance",
    approvedSummary:
      "Compliance & Cyber Assurance services help clients prepare for reviews, organize evidence, document controls, map frameworks, coordinate VAPT work, and support remediation.",
    sourceFacts: [
      "Compliance & Cyber Assurance describes client-facing services OneSmarter provides to clients.",
      "The category includes SOC readiness, HIPAA audit readiness, ISO/IEC 27001 readiness, PCI DSS readiness, framework mapping, VAPT and remediation, CMMI readiness, and compliance operations.",
      "OneSmarter should not be described as issuing SOC reports or ISO certificates.",
    ],
    allowedClaims: [
      "Readiness support",
      "Evidence preparation",
      "Control documentation",
      "Framework mapping",
      "VAPT coordination",
      "Remediation support",
    ],
    disallowedClaims: [
      "OneSmarter issues SOC reports",
      "OneSmarter issues ISO certificates",
      "OneSmarter guarantees compliance",
      "OneSmarter provides legal advice",
    ],
    handoffGuidance:
      "Route compliance scope, audit, evidence, security review, or business-specific readiness questions to care@onesmarter.com.",
    relatedQuestions: [
      "What is Compliance & Cyber Assurance?",
      "Can OneSmarter help with SOC readiness?",
      "Can OneSmarter help with HIPAA audit readiness?",
    ],
    sourceLabel: "siteDirectory.js: /compliance-assurance",
  },
  {
    id: "trust-center-overview",
    route: "/trust-center",
    title: "Trust Center Overview",
    category: "Trust Center",
    approvedSummary:
      "The Trust Center explains OneSmarter's own security, privacy, SOC 2, HIPAA, secure development, and responsible data handling posture.",
    sourceFacts: [
      "Trust Center describes OneSmarter's own posture, not client-facing compliance services.",
      "Trust Center includes SOC 2, HIPAA, Security Practices, and Privacy.",
      "Formal evidence requests should route to care@onesmarter.com.",
    ],
    allowedClaims: [
      "SOC 2 Type II Attested",
      "HIPAA Security Rule Compliance Assessment Completed",
      "Security practices",
      "Privacy and responsible data handling",
    ],
    disallowedClaims: [
      "SOC 2 Certified",
      "HIPAA Certified",
      "Official HIPAA certification",
      "Guaranteed compliance",
    ],
    handoffGuidance:
      "Route vendor review, evidence, procurement, or security questionnaire requests to care@onesmarter.com.",
    relatedQuestions: [
      "What is the Trust Center?",
      "Where can I learn about OneSmarter security?",
      "Can I get security evidence?",
    ],
    sourceLabel: "siteDirectory.js: /trust-center",
  },
  {
    id: "soc2-attested",
    route: "/trust-center/soc2",
    title: "SOC 2 Type II Attested",
    category: "Trust Center",
    approvedSummary:
      "OneSmarter is SOC 2 Type II Attested as part of its ongoing security and operational controls program.",
    sourceFacts: [
      "Use the phrase SOC 2 Type II Attested.",
      "The Trust Center provides public context for OneSmarter's SOC 2 posture.",
      "Formal reports and evidence should be handled through a direct business process.",
    ],
    allowedClaims: [
      "SOC 2 Type II Attested",
      "Independent attestation",
      "Security controls",
      "Operational discipline",
      "Ongoing monitoring",
    ],
    disallowedClaims: [
      "SOC 2 Certified",
      "OneSmarter issues SOC reports",
      "Public visitors can receive formal evidence through the agent",
    ],
    handoffGuidance:
      "Route SOC report, security questionnaire, and procurement evidence requests to care@onesmarter.com.",
    relatedQuestions: [
      "Are you SOC 2 certified?",
      "What does SOC 2 Type II Attested mean here?",
      "Can you send your SOC 2 report?",
    ],
    sourceLabel: "siteDirectory.js: /trust-center/soc2",
  },
  {
    id: "hipaa-security-rule-assessment",
    route: "/trust-center/hipaa",
    title: "HIPAA Security Rule Compliance Assessment Completed",
    category: "Trust Center",
    approvedSummary:
      "OneSmarter has completed an independent HIPAA Security Rule compliance assessment covering applicable safeguards and practices.",
    sourceFacts: [
      "Use the phrase HIPAA Security Rule Compliance Assessment Completed.",
      "OneSmarter does not present this as HIPAA certification.",
      "Trust Center HIPAA content focuses on safeguards and practices.",
    ],
    allowedClaims: [
      "HIPAA Security Rule Compliance Assessment Completed",
      "Independent HIPAA Security Rule compliance assessment",
      "Administrative safeguards",
      "Technical safeguards",
      "Physical safeguards",
      "Ongoing risk awareness",
    ],
    disallowedClaims: [
      "HIPAA Certified",
      "HIPAA Certification",
      "Official HIPAA certification",
      "The assessment guarantees customer compliance",
    ],
    handoffGuidance:
      "Route HIPAA evidence, regulated workflow, BAA, or procurement-specific questions to care@onesmarter.com.",
    relatedQuestions: [
      "Are you HIPAA certified?",
      "What does HIPAA Security Rule Compliance Assessment Completed mean?",
      "Does OneSmarter handle PHI?",
    ],
    sourceLabel: "siteDirectory.js: /trust-center/hipaa",
  },
  {
    id: "security-practices",
    route: "/trust-center/security-practices",
    title: "Security Practices",
    category: "Trust Center",
    approvedSummary:
      "OneSmarter security practices cover secure software development, access control, least privilege, change management, risk review, and incident response readiness.",
    sourceFacts: [
      "Security Practices is part of the Trust Center.",
      "Public answers should stay high-level and factual.",
      "Detailed security evidence should be handled through a direct business process.",
    ],
    allowedClaims: [
      "Secure software development",
      "Access control",
      "Least privilege",
      "Change management",
      "Risk review",
      "Incident response readiness",
    ],
    disallowedClaims: [
      "Guaranteed secure",
      "No security risk",
      "Public disclosure of sensitive security details",
    ],
    handoffGuidance:
      "Route detailed security practice, architecture, evidence, and questionnaire requests to care@onesmarter.com.",
    relatedQuestions: [
      "What security practices does OneSmarter use?",
      "How do you handle access control?",
      "Can you answer a security questionnaire?",
    ],
    sourceLabel: "siteDirectory.js: /trust-center/security-practices",
  },
  {
    id: "privacy-terms-guidance",
    route: "/trust-center/privacy",
    title: "Privacy and Terms High-Level Guidance",
    category: "Trust Center",
    approvedSummary:
      "OneSmarter privacy practices emphasize client confidentiality, responsible data handling, limited access, privacy-aware operations, and careful handling of sensitive information. The Privacy Policy and Terms Of Use are legal pages that should be reviewed directly.",
    sourceFacts: [
      "Trust Center privacy content points to client confidentiality, responsible data handling, limited access, and privacy-aware operations.",
      "The Privacy Policy and Terms Of Use are legal pages.",
      "Mira should not interpret legal terms or provide legal advice.",
    ],
    allowedClaims: [
      "Responsible data handling",
      "Client confidentiality",
      "Limited access",
      "Privacy-aware operations",
      "Visitors should review the Privacy Policy and Terms Of Use directly",
    ],
    disallowedClaims: [
      "Legal interpretation of Privacy Policy or Terms Of Use",
      "Legal advice",
      "Privacy guarantees beyond approved public content",
    ],
    handoffGuidance:
      "Route privacy, legal, contract, or terms-specific questions to care@onesmarter.com and recommend reviewing the legal pages directly.",
    relatedQuestions: [
      "Where is your Privacy Policy?",
      "Where are your Terms Of Use?",
      "Can you explain your legal terms?",
    ],
    sourceLabel: "siteDirectory.js: /trust-center/privacy and legal pages",
  },
  {
    id: "contact-handoff",
    route: "/contact",
    title: "Contact and Business Inquiry Handoff",
    category: "Contact",
    approvedSummary:
      "For business inquiries, visitors should email OneSmarter at care@onesmarter.com.",
    sourceFacts: [
      "The public contact path is care@onesmarter.com.",
      "The standalone Contact route is retained for backward compatibility but is not promoted in navigation.",
      "Mira should route uncertain, business-specific, sensitive, procurement, or evidence requests to email.",
    ],
    allowedClaims: [
      "Email care@onesmarter.com",
      "Business-specific questions should go to the OneSmarter team",
      "Mira can help route visitors to the right next step",
    ],
    disallowedClaims: [
      "Collect PHI in chat",
      "Collect confidential documents in chat",
      "Promise a response time unless separately approved",
    ],
    handoffGuidance:
      "Use care@onesmarter.com for business inquiries, formal evidence requests, sensitive topics, procurement, pricing, or anything not covered by approved public content.",
    relatedQuestions: [
      "How do I contact OneSmarter?",
      "Can I talk to someone?",
      "Where should I send a business inquiry?",
    ],
    sourceLabel: "siteDirectory.js: /contact and public LLM summaries",
  },
];

export default onesmarterPublicKnowledgeBase;
