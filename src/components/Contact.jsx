import { useEffect, useState } from "react";
import Loader from "./Loader/Loader";

const Contact = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-white px-6 py-20 text-center">
      <div className="max-w-xl rounded border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold uppercase text-gray-950 md:text-3xl">
          Contact OneSmarter
        </h1>
        <p className="mt-4 text-base leading-7 text-gray-700">
          Tell us what you are trying to build, improve, or secure.
        </p>
        <a
          href="mailto:care@onesmarter.com"
          className="mt-6 inline-flex items-center justify-center rounded bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          care@onesmarter.com
        </a>
      </div>
    </main>
  );
};

export default Contact;
