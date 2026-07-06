import React, { useEffect, useState } from "react";
import img from "../assets/servicesimg.png";
import icon1 from "../assets/services-icon-1.svg";
import icon2 from "../assets/services-icon-2.svg";
import icon3 from "../assets/services-icon-3.svg";
import icon4 from "../assets/services-icon-4.svg";
import icon5 from "../assets/services-icon-5.svg";
import Loader from "./Loader/Loader";

export default function ServicesPage() {

   const [loading, setLoading] = useState(true);
      
          useEffect(() => {
            // Simulate loading (e.g. image loading or content mount)
            const timer = setTimeout(() => {
              setLoading(false);
            }, 1000); // You can adjust delay
        
            return () => clearTimeout(timer);
          }, []);
        
          if (loading) return <Loader />;

  const techToolsData = [
    {
      title: "AS400/IBMi Technologies",
      items: [
        "DB2/400",
        "Integration with SQL servers",
        "Communication with external datasources",
        "API access and connectivity",
      ],
    },
    {
      title: "Tools",
      items: ["TLA FORMS", "ROBOT", "EZVIEW", "Rdi"],
    },
    {
      title: "Source controls",
      items: ["Aldon", "Implementer"],
    },
    {
      title: "Application Expertise",
      items: [
        "ICBS (Integrative Comprehensive Banking System)",
        "HUB (HSBC Universal Banking)",
        "Infor LX (ERP)",
        "Infor XA",
        "Infor System21 Installation",
      ],
    },
    {
      title: "Domain",
      items: [
        "Banking and Finance",
        "Insurance",
        "E-Commerce",
        "Retail",
        "Manufacturing",
        "Pension systems",
        "Healthcare",
      ],
    },
    {
      title: "Languages",
      items: ["RPG-Free", "SQLRPGLE", "CLLE", "RPG II, RPG III, IV"],
    },
  ];

  return (
    <div className="font-sans text-[#1c1c1c] bg-white mt-25 md:mt-50 lg:mt-50">
      {/* Top Icons Section */}
      <div className="flex flex-wrap justify-center md:justify-between items-start py-10 border-b px-4 md:px-40">
        {[
          { label: "APPLICATION DEVELOPMENT", icon: icon1 },
          { label: "APPLICATION SUPPORT AND MAINTENANCE", icon: icon2 },
          { label: "APPLICATION MODERNIZATION", icon: icon3 },
          { label: "AS400L1 ADMIN ACTIVITIES", icon: icon4 },
          { label: "AS400 EDI PROGRAMMING", icon: icon5 },
        ].map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center w-36 sm:w-40 mb-6"
          >
            <div className="border-[3px] border-red-500 rounded-full p-5 w-[90px] h-[90px] md:w-[100px] md:h-[100px] flex items-center justify-center mb-4">
              <img
                src={item.icon}
                alt={item.label}
                className="w-12 h-12 md:w-14 md:h-14"
              />
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#1c1c1c] leading-5">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Banner Section */}
      <div className="w-full h-40 sm:h-48 md:h-48 relative">
  {/* Background image */}
  <div
    className="absolute inset-0 bg-cover bg-no-repeat bg-center md:bg-center"
    style={{
      backgroundImage: `url(${img})`,
    }}
  ></div>

  {/* Overlay text only for sm screens */}
  <div className="absolute inset-0 flex space-y-2 flex-col justify-center items-center px-4 sm:px-8 md:hidden bg-black/40">
    <h2 className="text-white text-2xl font-semibold tracking-wider">OPERATING SYSTEM</h2>
    <p className="text-md text-gray-300 font-semibold mt-1">
      OS/400 | V6R1 | V5R3, V5R4
    </p>
    <p className="text-sm text-red-500 font-bold">
      V7R1, V7R2, V7R3, V7R4
    </p>
  </div>

  {/* Optional: show nothing or show static content in md+ */}
  <div className="hidden md:block text-center text-white pt-6">
    {/* Keep blank or add desktop-specific content */}
  </div>
</div>


      {/* Technologies and Tools Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-4 md:px-10 md:mx-24 py-10">
        {techToolsData.map((section, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-300 rounded-lg p-4"
          >
            <h3 className="text-red-600 mb-1 inline-block">{section.title}</h3>
            <div className="h-0.5 w-10 bg-red-400"></div>
            <ul className="space-y-1 text-sm mt-4">
              {section.items.map((item, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <i className="fa-solid fa-chevron-right text-red-500 mt-1 text-xs"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
