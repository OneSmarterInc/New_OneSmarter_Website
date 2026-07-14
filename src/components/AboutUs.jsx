import React, { useEffect, useState } from "react";
import img from "../assets/PeterMHager.jpg";
import { useParams } from "react-router-dom";
import { BookOpen, Target, Eye } from "lucide-react";
import Loader from "./Loader/Loader";

const aboutCopy = {
  Introduction:
    "OneSmarter is a focused technology and business services firm providing secure platforms, practical AI, business operations support, compliance and cyber assurance support, and enterprise technology services.",
  Mission:
    "Our mission is to help organizations improve secure workflows, operations, and technology delivery through practical systems, accountable support, and compliance-aware execution.",
  Vision:
    "Our vision is to be a trusted execution partner for organizations that need secure platforms, practical AI, business services, and enterprise technology support without unnecessary complexity.",
};

const tabIcons = {
  Introduction: BookOpen,
  Mission: Target,
  Vision: Eye,
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
    <main className="overflow-x-hidden bg-white pt-20 text-gray-950 md:pt-24">
      <section className="bg-zinc-950 px-4 py-8 text-white sm:px-6 lg:px-12">
        <div className="qa-container mx-auto">
          <h1 className="mt-2 text-2xl font-bold uppercase text-red-500 sm:text-3xl">
            About Us
          </h1>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-12 lg:py-20">
        <div className="qa-container mx-auto grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {links.map((item) => {
              const Icon = tabIcons[item];
              const isActive = activeLink === item;

              return (
                <button
                  key={item}
                  onClick={() => setActiveLink(item)}
                  className={`flex min-w-0 flex-col items-center gap-2 rounded border px-3 py-3 text-center text-xs font-semibold transition-all cursor-pointer sm:text-sm lg:flex-row lg:justify-start lg:gap-3 lg:px-5 lg:text-left ${
                    isActive
                      ? "border-red-600 bg-red-600 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:text-red-600"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${
                      isActive ? "bg-white/15" : "bg-red-50 text-red-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="truncate">{item}</span>
                </button>
              );
            })}
          </div>

          <div className="min-w-0 rounded border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-gray-950 sm:text-2xl">
              {activeLink}
            </h2>
            <p className="mt-4 text-base leading-8 text-gray-600">
              {aboutCopy[activeLink] || aboutCopy.Introduction}
            </p>
          </div>
        </div>

        {/* <div className="qa-container mx-auto mt-8">
          <div className="flex flex-col items-center gap-6 rounded border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:p-8">
            <img
              src={img}
              alt="Pete M. Hager"
              className="h-32 w-32 shrink-0 rounded-full object-cover sm:h-36 sm:w-36"
            />
            <div className="min-w-0 text-center sm:text-left">
              <h3 className="text-xl font-bold text-gray-950">
                Pete M. Hager
              </h3>
              <p className="font-semibold text-red-600">CEO</p>
              <p className="mt-2 text-sm leading-7 text-gray-600 sm:text-base">
                Under the leadership of the CEO, the company focuses on secure
                platforms, practical AI, business services, compliance-aware
                operations, and enterprise technology support for clients with
                complex operational needs.
              </p>
            </div>
          </div>
        </div> */}
      </section>
    </main>
  );
};

export default AboutUs;
