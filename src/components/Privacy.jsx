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

        <h3 className="text-lg font-semibold mb-2">Cookies</h3>
        <p className="mb-4">
          Our site uses cookies and web beacons for personalization and analytics. Third-party advertisers may also set cookies based on their policies.
        </p>

        <h3 className="text-lg font-semibold mb-2">Data Security</h3>
        <p className="mb-4">
          Access to personal data is restricted to employees who need it. We use physical and digital safeguards to protect your information.
        </p>

        <h3 className="text-lg font-semibold mb-2">Policy Changes</h3>
        <p className="mb-4">
          We may update this policy. Any significant changes will be communicated via email or site notification.
        </p>

        <p className="text-sm italic">Last updated: October 1, 2018</p>
        <p className="text-sm italic">Last reviewed: January 1, 2025</p>

      </div>
    </main>
  );
};

export default Privacy;
