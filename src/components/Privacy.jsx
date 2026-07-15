// privacy.jsx
import React, { useEffect, useState } from "react";
import Loader from "./Loader/Loader";

const Privacy = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-white px-6 py-0 mb-5 text-center">
      <div className="max-w-3xl mt-40 text-left">
        <h1 className="text-xl md:text-2xl font-semibold uppercase mb-4 text-center">
          Privacy Policy
        </h1>

        <p className="mb-4">
          One Smarter takes your privacy seriously. Please read the following to learn more about our privacy policy.
        </p>
        <p className="mb-4">
          This policy covers how One Smarter treats personal information that it collects and receives, including data related to your past use of our products and services.
        </p>

        <h3 className="text-lg font-semibold mb-2">Information Collection and Use</h3>
        <p className="mb-4">
          We collect personal and/or business information during registration, service usage, and while browsing our site. This includes IP address, browser details, and usage history.
        </p>

        <h3 className="text-lg font-semibold mb-2">Information Sharing</h3>
        <p className="mb-4">
          We do not sell or rent your personal information. We share it only with trusted partners or as required by law.
        </p>

        <h3 className="text-lg font-semibold mb-2">
          Cookies, Google Analytics, and Consent
        </h3>
        <p className="mb-4">
          We use Google Analytics 4 to understand how visitors use our website,
          improve website performance, and enhance user experience.
        </p>
        <p className="mb-4">
          Google Analytics operates based on your cookie and consent choices. If
          you accept analytics cookies, Google Analytics may use cookies or
          similar technologies to collect usage information such as page visits,
          browser/device details, and interactions with our website.
        </p>
        <p className="mb-4">
          If you reject analytics cookies, Google Analytics will not store or
          access analytics cookies on your device. Because Google Consent Mode is
          implemented on this website, limited cookieless measurement signals may
          still be sent to Google Analytics for aggregated measurement and
          modeling without storing analytics cookies on your device.
        </p>
        <p className="mb-4">
          We do not use Google Analytics for advertising, remarketing, or
          personalized advertising on this website.
        </p>
        <p className="mb-4">
          You can change or withdraw your cookie preferences at any time using
          the Cookie Settings option available on our website.
        </p>

        <h3 className="text-lg font-semibold mb-2">Data Security</h3>
        <p className="mb-4">
          Access to personal data is restricted to employees who need it. We use physical and digital safeguards to protect your information.
        </p>

        <h3 className="text-lg font-semibold mb-2">Policy Changes</h3>
        <p className="mb-4">
          We may update this policy. Any significant changes will be communicated via email or site notification.
        </p>

        <p className="text-sm italic">Last updated: July 7, 2026</p>
        <p className="text-sm italic">Last reviewed: July 7, 2026</p>

      </div>
    </main>
  );
};

export default Privacy;
