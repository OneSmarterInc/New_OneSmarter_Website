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
    <main className="min-h-[70vh] flex items-center justify-center bg-white px-6 py-16 text-center">
      <div className="max-w-xl mt-50">
        <h1 className="text-xl md:text-2xl font-semibold uppercase mb-2">
          Contact OneSmarter
        </h1>
        <h3 className="text-red-600 font-semibold uppercase text-lg border-b-2 border-red-600 inline-block mb-4">
          Registered Office
        </h3>
        <p className="text-base text-black mb-1">
          707 Miamisburg-Centerville Road
        </p>
        <p className="text-base text-black mb-4">
          Dayton, OH 45459, STE 223
        </p>
        <p className="text-base text-black">
          <strong>Email:</strong> care@onesmarter.com
        </p>
        <p className="text-base text-black">
          <strong>Phone:</strong> +1 937 344 6241
        </p>
      </div>
    </main>
  );
};

export default Contact;
