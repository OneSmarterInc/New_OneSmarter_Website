// terms.jsx
import React, { useEffect, useState } from "react";
import Loader from "./Loader/Loader";

const Terms = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-white px-6  text-center">
      <div className="max-w-3xl mt-40 text-left">
        <h1 className="text-xl md:text-2xl font-semibold uppercase mb-4 text-center">
          Terms of Use
        </h1>

        <p className="mb-4">
          By accessing and using our website or services, you agree to be bound by the following Terms of Use.
        </p>

        <h3 className="text-lg font-semibold mb-2">Scope of Services</h3>
        <p className="mb-4">
          Services include technical support through subscriptions or one-time interactions. Usage is subject to fair use and applicable law.
        </p>

        <h3 className="text-lg font-semibold mb-2">User Responsibilities</h3>
        <p className="mb-4">
          You must be 18+ and provide accurate information. Misuse, resale, or unauthorized access is prohibited.
        </p>

        <h3 className="text-lg font-semibold mb-2">Fees & Payments</h3>
        <p className="mb-4">
          Fees are non-refundable except under certain conditions. Renewals are auto-processed unless canceled in advance.
        </p>

        <h3 className="text-lg font-semibold mb-2">Limitations</h3>
        <p className="mb-4">
          We do not guarantee uninterrupted service. Our liability is limited to the fees paid or $100, whichever is less.
        </p>

        <p className="text-sm italic">Effective Date: July 7, 2026</p>
        <p className="text-sm italic">Last reviewed: July 7, 2026</p>

      </div>
    </main>
  );
};

export default Terms;
