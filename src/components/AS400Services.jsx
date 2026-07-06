import React, { useEffect, useState } from "react";
import img from "../assets/PeterMHager.jpg";
import { useParams } from "react-router-dom";
import Loader from "./Loader/Loader";

const AS400Services = () => {
  const [loading, setLoading] = useState(true);
    
 
  const [activeLink, setActiveLink] = useState("");
  const links = [
    "Architecture Analysis",
    "Cyber Resiliency",
    "Data Management",
    "Digital Transformation",
    "Enterprise Applications",
    "Programming Services",
  ];

   const {value} = useParams();
    useEffect(()=>{
      if(value == "architecture"){

        setActiveLink("Architecture Analysis")
      }
      else if(value == "cyber"){
        setActiveLink("Cyber Resiliency")
      }
      else if(value == "data"){
        setActiveLink("Data Management")
      }else if(value == "digital"){
        setActiveLink("Digital Transformation")
      }else if(value == "enterprise"){
        setActiveLink("Enterprise Applications")
      }else if(value == "programming"){
        setActiveLink("Programming Services")
      }
    },[value])

    useEffect(() => {
      // Simulate loading (e.g. image loading or content mount)
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300); // You can adjust delay
  
      return () => clearTimeout(timer);
    }, []);
  
    if (loading) return <Loader />;
  

  return (
    <div className="md:mx-32 mt-20 md:mt-50">
      <div className="w-full mt-10 bg-white text-black px-4 md:px-4 py-10">
        <div className="flex flex-col-reverse md:flex-row justify-between gap-10 items-center md:items-start">
          <div className="md:ml-6 mt-4 md:mt-0 ">
            {activeLink === "" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  Our technology solutions are driven by requirements analysis,
                  prototyping, user interface design, and analysis. This enables
                  our solutions to meet your vision.
                </p>
                <br />
              </div>
            )}
            {activeLink === "Architecture Analysis" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  Our technology solutions are driven by requirements analysis,
                  prototyping, user interface design, and analysis. This enables
                  our solutions to meet your vision.
                </p>
                <br />
              </div>
            )}
            {activeLink === "Cyber Resiliency" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  We help clients transform into a cyber resilient
                  organizations. We support your goals of cyber security, risk
                  mitigation, and business continuity so that you can deliver
                  uninterrupted services. Our services include threat hunting,
                  incident response, and cyber training.
                </p>
                <br />
              </div>
            )}{" "}
            {activeLink === "Data Management" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  We support multiple databases: Microsoft SQL Server, My SQL,
                  MongoDB, PostgresSQL and others. We can manage, maintain and
                  support your technology environment 24/7.
                </p>
                <br />
              </div>
            )}{" "}
            {activeLink === "Digital Transformation" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  We work with you to digitally transform your business –
                  connect with your customers, clients, and external
                  stakeholders. Whether you want a dynamic digital marketplace
                  or an executive dashboard; we can work with you from ideation
                  to implementation.
                </p>
                <br />
              </div>
            )}{" "}
            {activeLink === "Enterprise Applications" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  We create the enterprise-grade customer experience with our
                  scalable and feature rich solutions. These include the finest
                  customer experience with stunning web solutions and to
                  mobility apps. We craft user experiences by blending art and
                  human behavior to build consistent and modern user interfaces
                  for our clients.
                </p>
                <br />
              </div>
            )}{" "}
            {activeLink === "Programming Services" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  Programming functional solutions by understanding problems is
                  our core strength.{" "}
                  <span className=" text-red-600 underline">
                    {" "}
                    Let's restate this a bit:
                  </span>{" "}
                  We develop functional technology solutions for you by
                  understanding your needs and delivering practical,
                  supportable software.
                </p>
                <br />
              </div>
            )}
          </div>

          <div className="flex flex-col w-full md:w-auto items-center md:items-start">
          <h2 className="text-red-600 font-semibold text-xl md:text-2xl mb-4">
              SERVICES
            </h2>
            <div className="flex flex-col gap-4 w-full items-center md:items-start">
              {links.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveLink(item)}
                  className={`w-full md:w-52 border border-purple-800 text-start rounded-full px-5 py-1 text-sm md:text-sm text-red-600 hover:text-white hover:bg-red-500 transition-all flex justify-start items-center gap-2 cursor-pointer hover:ease-in-out delay-75 ${
                    activeLink === item ? "bg-red-500 text-white" : ""
                  }`}
                >
                  <p className="text-xs">
                    <i className="fa-solid fa-chevron-right"></i>
                  </p>
                  <p>{item}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AS400Services;
