import React, { useState, useEffect } from "react";
import Service1 from "../Images/S2.1.png";
import Service2 from "../Images/S2.2.png";
import Service3 from "../Images/S2.3.png";
import Service4 from "../Images/S2.4.png";
import Service5 from "../Images/S2.5.png";
import logo from "../Images/mainlogo2.png";
import { Link } from "react-router-dom";

const General = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const services = [
    {
      image: Service1,
      title: "Residential and Commercial Moving",
      description:
        "Offering services for packing, transporting, and unpacking belongings for both homes and businesses.",
    },
    {
      image: Service2,
      title: "Landscaping and Gardening",
      description:
        "This could include lawn mowing, garden maintenance, planting, and landscape design services.",
    },
    {
      image: Service3,
      title: "Construction Labor",
      description:
        "Providing skilled labor for construction projects, such as carpentry, masonry, painting, and drywall installation.",
    },
    {
      image: Service4,
      title: "Cleaning Services",
      description:
        "Offering both residential and commercial cleaning services, including regular maintenance cleaning, deep cleaning, and specialized services like window washing or carpet cleaning.",
    },
    {
      image: Service5,
      title: "Handyman Services",
      description:
        "For smaller home repair tasks like fixing leaky faucets, hanging pictures, or assembling furniture.",
    },
  ];

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % services.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, services.length]);

  return (
    <div className="min-h-screen bg-black relative pt-20 md:pt-24">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
        
        .card-enter {
          animation: slideIn 0.5s ease forwards;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .nav-link {
          position: relative;
        }
        
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          width: 0;
          height: 1px;
          background: white;
          transition: all 0.3s ease;
          transform: translateX(-50%);
        }
        
        .nav-link:hover::after {
          width: 70%;
        }
      `}</style>

      {/* Header */}
      <div className="pb-6 text-center">
        <h1
          className="text-white text-3xl md:text-4xl font-semibold"
          style={{ fontFamily: "'Kanit', sans-serif" }}
        >
          General Labour
        </h1>
        <p className="text-white/60 mt-2 text-sm md:text-base">
          Professional labour solutions for every need
        </p>
      </div>

      {/* Main Card Display */}
      <div
        className="relative w-full max-w-4xl mx-auto px-4 py-8"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Active Card */}
        <div
          key={activeIndex}
          className="card-enter bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-xl overflow-hidden shadow-2xl"
        >
          {/* Image */}
          <div className="w-full h-48 md:h-64 overflow-hidden">
            <img
              src={services[activeIndex].image}
              alt={services[activeIndex].title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            <h2
              className="text-white text-xl md:text-2xl font-semibold mb-3"
              style={{ fontFamily: "'Kanit', sans-serif" }}
            >
              {services[activeIndex].title}
            </h2>
            <p className="text-white/70 text-sm md:text-base leading-relaxed">
              {services[activeIndex].description}
            </p>
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center gap-3 mt-6">
          {services.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`
                w-2.5 h-2.5 rounded-full transition-all duration-300
                ${
                  index === activeIndex
                    ? "bg-white w-8"
                    : "bg-white/30 hover:bg-white/50"
                }
              `}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() =>
            setActiveIndex(
              (prev) => (prev - 1 + services.length) % services.length,
            )
          }
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:translate-x-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          aria-label="Previous"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          onClick={() => setActiveIndex((prev) => (prev + 1) % services.length)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          aria-label="Next"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Service Thumbnails */}
      <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {services.map((service, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`
                relative rounded-lg overflow-hidden transition-all duration-300
                ${
                  index === activeIndex
                    ? "ring-2 ring-white scale-105"
                    : "opacity-50 hover:opacity-80"
                }
              `}
            >
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-20 md:h-24 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                <span
                  className="text-white text-[10px] md:text-xs font-medium line-clamp-2"
                  style={{ fontFamily: "'Kanit', sans-serif" }}
                >
                  {service.title}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Logo - Fixed Bottom Left */}
      <div className="fixed bottom-5 left-5 z-50">
        <Link to="/">
          <img
            src={logo}
            alt="OneSmarter Inc."
            className="w-[120px] md:w-[150px]"
          />
        </Link>
      </div>

      {/* Page Counter - Fixed Bottom Center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <span
          className="text-white/40 text-sm tracking-[0.3em]"
          style={{ fontFamily: "'Kanit', sans-serif" }}
        >
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(services.length).padStart(2, "0")}
        </span>
      </div>

      {/* Navigation - Fixed Bottom Right */}
      <nav className="fixed bottom-0 right-0 z-50">
        <div
          className="flex items-center bg-black/90 backdrop-blur-sm rounded-tl-[40px] px-4 md:px-6 py-3"
          style={{ boxShadow: "-2px -2px 15px rgba(255,255,255,0.1)" }}
        >
          <Link
            to="/as400services"
            className="nav-link px-3 md:px-4 py-2 text-white text-sm tracking-wider"
            style={{ fontFamily: "'Kanit', sans-serif" }}
          >
            Services
          </Link>
          <Link
            to="/aboutus/Introduction"
            className="nav-link px-3 md:px-4 py-2 text-white text-sm tracking-wider"
            style={{ fontFamily: "'Kanit', sans-serif" }}
          >
            About Us
          </Link>
          <a
            href="mailto:care@onesmarter.com"
            className="nav-link px-3 md:px-4 py-2 text-white text-sm tracking-wider"
            style={{ fontFamily: "'Kanit', sans-serif" }}
          >
            Contact Us
          </a>
        </div>
      </nav>
    </div>
  );
};

export default General;
