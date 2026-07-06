import React, { useEffect, useState } from "react";
import Loader from "./Loader/Loader";

const Contact = () => {
  const [loading, setLoading] = useState(true);

     useEffect(() => {
        // Simulate loading (e.g. image loading or content mount)
        const timer = setTimeout(() => {
          setLoading(false);
        }, 300); // You can adjust delay
    
        return () => clearTimeout(timer);
      }, []);
    
      if (loading) return <Loader />;
    
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-white px-6 py-16 text-center">
      <div className="mt-24 max-w-xl">
        <h1 className="mb-4 text-2xl font-semibold uppercase text-black md:text-3xl">
          Contact OneSmarter
        </h1>
        <p className="mx-auto mb-6 max-w-lg text-base leading-7 text-gray-700">
          Tell us what you are trying to build, improve, or secure.
        </p>
        <a
          href="mailto:care@onesmarter.com"
          className="text-base font-semibold text-red-600 transition hover:text-red-700"
        >
          care@onesmarter.com
        </a>
      </div>
    </main>
  );
};

export default Contact;
