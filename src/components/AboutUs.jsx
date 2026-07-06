import React, { useEffect, useState } from "react";
import img from "../assets/PeterMHager.jpg";
import { useParams } from "react-router-dom";
import Loader from "./Loader/Loader";

const aboutCopy = {
  Introduction:
    "OneSmarter is a focused technology and business services firm providing secure platforms, practical AI, business operations support, compliance and cyber assurance support, and enterprise technology services.",
  Mission:
    "Our mission is to help organizations improve secure workflows, operations, and technology delivery through practical systems, accountable support, and compliance-aware execution.",
  Vision:
    "Our vision is to be a trusted execution partner for organizations that need secure platforms, practical AI, business services, and enterprise technology support without unnecessary complexity.",
};

const AboutUs = () => {
  const { value } = useParams();
  const [activeLink, setActiveLink] = useState(value || "Introduction");
  const [loading, setLoading] = useState(true);
  const links = ["Introduction", "Mission", "Vision"];

  useEffect(() => {
    setActiveLink(value || "Introduction");
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <main className="md:mx-32 mt-20 md:mt-50 lg:mt-50">
      <div className="w-full mt-10 bg-white text-black px-4 md:px-4 py-10">
        <div className="flex flex-col-reverse md:flex-row justify-between gap-10 items-center md:items-start">
          <div className="text-center w-full mt-6 md:mt-0">
            <h1 className="text-2xl md:text-3xl font-bold text-center leading-snug">
              {aboutCopy[activeLink] || aboutCopy.Introduction}
            </h1>
          </div>

          <div className="flex flex-col w-full md:w-auto items-center md:items-start">
            <h2 className="text-red-600 font-semibold text-xl md:text-2xl mt-5 md:mt-0 lg:mt-0 mb-5 md:mb-4 lg:mb-4">
              ABOUT US
            </h2>
            <div className="flex flex-col gap-4 w-full items-center md:items-start">
              {links.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveLink(item)}
                  className={`w-full border border-purple-800 text-start rounded-full px-5 py-1 text-sm md:text-sm text-red-600 hover:text-white hover:bg-red-500 transition-all flex justify-start items-center gap-2 cursor-pointer hover:ease-in-out delay-75 ${
                    activeLink === item ? "bg-red-500 text-white" : ""
                  }`}
                >
                  <span className="text-xs" aria-hidden="true">
                    <i className="fa-solid fa-chevron-right"></i>
                  </span>
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row mt-10 gap-5 md:gap-2 px-4 md:px-10 items-center">
          <img
            src={img}
            alt="Pete M. Hager"
            className="w-40 h-32 md:w-48 md:h-36 rounded-md object-cover"
          />
          <div className="md:ml-6 mt-4 md:mt-0 text-center md:text-left">
            <h2 className="text-xl md:text-xl font-bold">Pete M. Hager</h2>
            <p className="text-red-600 font-semibold">CEO</p>
            <p className="text-sm md:text-sm text-justify mt-1">
              Under the leadership of the CEO, the company focuses on secure
              platforms, practical AI, business services, compliance-aware
              operations, and enterprise technology support for clients with
              complex operational needs.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AboutUs;
