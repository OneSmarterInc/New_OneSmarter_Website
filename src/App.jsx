import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import MyProvider from "./ContextApi/MyProvider";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Banner from "./components/Banner";

import AOS from "aos";
import "aos/dist/aos.css";
import Contact from "./components/Contact";
import AboutUs from "./components/AboutUs";
import OfferingPage from "./components/OfferingPage";
import TrustCenterPage from "./components/TrustCenterPage";
import Privacy from "./components/Privacy";
import Terms from "./components/Terms.jsx";
import NotFound from "./components/NotFound";

import TitleUpdater from "./RouteTitles";

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [pathname, search]);

  return null;
};

const App = () => {
  useEffect(() => {
    AOS.init({ once: true });
  }, []);
  return (
    <MyProvider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Router>
        <ScrollToTop />
        <TitleUpdater />
        <Navbar />
        <Routes>
          <Route path="/" element={<Banner />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/aboutus/:value" element={<AboutUs />} />
          <Route
            path="/products/Intelligent"
            element={<Navigate to="/technology-solutions/ai-agentic-services" replace />}
          />
          <Route
            path="/products/Knowledge"
            element={<Navigate to="/technology-solutions/enterprise-software" replace />}
          />
          <Route
            path="/products/Smart"
            element={<Navigate to="/technology-solutions/healthcare-tpa" replace />}
          />
          <Route
            path="/products/:value"
            element={<Navigate to="/technology-solutions" replace />}
          />
          <Route
            path="/as400services"
            element={<Navigate to="/technology-solutions/ibm-i-as400" replace />}
          />
          <Route path="/platforms" element={<OfferingPage page="platforms" />} />
          <Route
            path="/platforms/hipaa-compliant-ticketing"
            element={<Navigate to="/platforms/hipaa-regulated-ticketing" replace />}
          />
          <Route
            path="/platforms/hipaa-regulated-ticketing"
            element={<OfferingPage page="hipaaTicketing" />}
          />
          <Route
            path="/platforms/bill-audit-erp-bill-pay"
            element={<OfferingPage page="billAuditErp" />}
          />
          <Route
            path="/platforms/telecom-expense-management"
            element={<Navigate to="/platforms/bill-audit-erp-bill-pay" replace />}
          />
          <Route
            path="/platforms/claims-processing-system"
            element={
              <Navigate
                to="/technology-solutions/claims-processing-services"
                replace
              />
            }
          />
          <Route
            path="/technology-solutions"
            element={<OfferingPage page="technologySolutions" />}
          />
          <Route
            path="/technology-solutions/healthcare-tpa"
            element={<OfferingPage page="healthcareTpa" />}
          />
          <Route
            path="/technology-solutions/ai-agentic-services"
            element={<OfferingPage page="aiAgentic" />}
          />
          <Route
            path="/technology-solutions/ibm-i-as400"
            element={<OfferingPage page="ibmIAs400" />}
          />
          <Route
            path="/technology-solutions/enterprise-software"
            element={<OfferingPage page="enterpriseSoftware" />}
          />
          <Route
            path="/technology-solutions/software-support-consolidation"
            element={<OfferingPage page="supportConsolidation" />}
          />
          <Route
            path="/technology-solutions/claims-processing-services"
            element={<OfferingPage page="claimsProcessingServices" />}
          />
          <Route
            path="/business-services"
            element={<OfferingPage page="businessServices" />}
          />
          <Route
            path="/business-services/accounting-bookkeeping-tax"
            element={<OfferingPage page="accountingTax" />}
          />
          <Route
            path="/business-services/accounting-bookkeeping"
            element={
              <Navigate
                to="/business-services/accounting-bookkeeping-tax"
                replace
              />
            }
          />
          <Route
            path="/business-services/taxation"
            element={
              <Navigate
                to="/business-services/accounting-bookkeeping-tax"
                replace
              />
            }
          />
          <Route
            path="/business-services/eor-hr"
            element={<OfferingPage page="eorHr" />}
          />
          <Route
            path="/business-services/third-party-payment-services"
            element={<OfferingPage page="thirdPartyPayments" />}
          />
          <Route
            path="/business-services/benefits-back-office"
            element={<OfferingPage page="benefitsBackOffice" />}
          />
          <Route
            path="/compliance-assurance"
            element={<OfferingPage page="complianceAssurance" />}
          />
          <Route
            path="/compliance-assurance/soc-readiness"
            element={<OfferingPage page="socReadiness" />}
          />
          <Route
            path="/compliance-assurance/hipaa-audit-readiness"
            element={<OfferingPage page="hipaaAuditReadiness" />}
          />
          <Route
            path="/compliance-assurance/iso-27001-readiness"
            element={<OfferingPage page="iso27001Readiness" />}
          />
          <Route
            path="/compliance-assurance/pci-dss-readiness"
            element={<OfferingPage page="pciDssReadiness" />}
          />
          <Route
            path="/compliance-assurance/framework-mapping"
            element={<OfferingPage page="frameworkMapping" />}
          />
          <Route
            path="/compliance-assurance/vapt-remediation"
            element={<OfferingPage page="vaptRemediation" />}
          />
          <Route
            path="/compliance-assurance/cmmi-readiness"
            element={<OfferingPage page="cmmiReadiness" />}
          />
          <Route
            path="/compliance-assurance/compliance-operations"
            element={<OfferingPage page="complianceOperations" />}
          />
          <Route
            path="/trust-center"
            element={<TrustCenterPage page="trustCenter" />}
          />
          <Route
            path="/trust-center/soc2"
            element={<TrustCenterPage page="soc2" />}
          />
          <Route
            path="/trust-center/hipaa"
            element={<TrustCenterPage page="hipaa" />}
          />
          <Route
            path="/trust-center/iso-27001"
            element={<TrustCenterPage page="iso27001" />}
          />
          <Route
            path="/trust-center/security-practices"
            element={<TrustCenterPage page="securityPractices" />}
          />
          <Route
            path="/trust-center/privacy"
            element={<TrustCenterPage page="privacy" />}
          />
          <Route
            path="/insights"
            element={<OfferingPage page="insights" />}
          />
          <Route
            path="/services/staffing"
            element={<Navigate to="/business-services/eor-hr" replace />}
          />
          <Route
            path="/services/staffing/*"
            element={<Navigate to="/business-services/eor-hr" replace />}
          />
          <Route
            path="/services/architecture"
            element={<Navigate to="/technology-solutions/enterprise-software" replace />}
          />
          <Route
            path="/services/cyber"
            element={<Navigate to="/compliance-assurance" replace />}
          />
          <Route
            path="/services/data"
            element={<Navigate to="/technology-solutions/enterprise-software" replace />}
          />
          <Route
            path="/services/digital"
            element={<Navigate to="/technology-solutions/ai-agentic-services" replace />}
          />
          <Route
            path="/services/enterprise"
            element={<Navigate to="/technology-solutions/enterprise-software" replace />}
          />
          <Route
            path="/services/programming"
            element={<Navigate to="/technology-solutions/enterprise-software" replace />}
          />
          <Route
            path="/services/:value"
            element={<Navigate to="/technology-solutions" replace />}
          />
          <Route path="/policies/privacy-policy" element={<Privacy />} />
          <Route path="/policies/terms-of-use" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer className="fixed bottom-0 w-full bg-black text-white" />
      </Router>
    </MyProvider>
  );
};

export default App;
