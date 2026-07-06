import React, { useEffect, useState } from "react";
import img from "../assets/PeterMHager.jpg";
import { useParams } from "react-router-dom";
import Loader from "./Loader/Loader";

const Products = () => {
  const [activeLink, setActiveLink] = useState("");
  const { value } = useParams();
  const links = [
    "Intelligent HR Solutions",
    "Knowledge Portals",
    "Smart Health",
  ];

  useEffect(() => {
    if (value == "Intelligent") {
      setActiveLink("Intelligent HR Solutions");
    }
    else if(value == "Knowledge"){
      setActiveLink("Knowledge Portals")
    }
    else{
      setActiveLink("Smart Health")
    }
  }, [value]);

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
    <div className="md:mx-32 lg:mt-50 md:mt-50 lg:mb-20 md:mb-20">
      <div className="w-full mt-10 bg-white text-black px-4 md:px-4 py-10">
        <div className="flex flex-col-reverse md:flex-row justify-between gap-10 items-center md:items-start">
          <div className="md:ml-6 mt-4 md:mt-0 ">
            {activeLink === "" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  Complete your I-9 audit using our smart AI-driven solutions.
                  Non-compliance can lead to serious civil sanctions and
                  criminal penalties. Use our automated solution to conduct an
                  audit, find systemic issues, train personnel, and develop
                  compliance tracking.
                </p>
                <br />
                <p className="text-sm md:text-sm text-justify mt-1">
                  AI-9 uses pioneering deep learning, machine learning, and
                  Natural Language Processing (NLP) algorithms to work for HR
                  professionals. Our rapid assessment solution works with
                  hand-written, scanned forms just as easily as with
                  electronically completed I-9's and recognizes issues with
                  remarkable accuracy. Our solutions can process high volumes of
                  I-9's daily without compromising precision.
                </p>
                <br />
                <p>
                  Visit us at <span className="text-red-400"> A-I9.com</span>{" "}
                  (Coming Soon...)
                </p>
              </div>
            )}
            {activeLink === "Intelligent HR Solutions" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  Complete your I-9 audit using our smart AI-driven solutions.
                  Non-compliance can lead to serious civil sanctions and
                  criminal penalties. Use our automated solution to conduct an
                  audit, find systemic issues, train personnel, and develop
                  compliance tracking.
                </p>
                <br />
                <p className="text-sm md:text-sm text-justify mt-1">
                  AI-9 uses pioneering deep learning, machine learning, and
                  Natural Language Processing (NLP) algorithms to work for HR
                  professionals. Our rapid assessment solution works with
                  hand-written, scanned forms just as easily as with
                  electronically completed I-9's and recognizes issues with
                  remarkable accuracy. Our solutions can process high volumes of
                  I-9's daily without compromising precision.
                </p>
                <br />
                <p>
                  Visit us at <span className="text-red-400"> A-I9.com</span>{" "}
                  (Coming Soon...)
                </p>
              </div>
            )}
            {activeLink === "Knowledge Portals" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  We created KPortals to make it easier for publishers to
                  present selected content from RSS feeds in a meaningful way to
                  internal/external audiences. A knowledge portal can be used in
                  multiple areas such as education, HR, functional disciplines,
                  external clients - there are endless possibilities!
                </p>
                <br />
                <p className="text-sm md:text-sm text-justify mt-1">
                  Visit our own site:{" "}
                  <a href="https://cyberbriefs.org/" className="text-red-400">
                    {" "}
                    cyberbriefs.org{" "}
                  </a>{" "}
                  {/* &{" "}
                  <a href="http://cxbriefs.org/" className="text-red-400">
                    {" "}
                    cxbriefs.org.
                  </a>{" "} */}
                  {/* to see exemplar sites - easy, effective, and flexible. Both
                  sites are directly connected to social media platforms for
                  instant updates. */}
                   to see exemplar site - easy, effective, and flexible. This
                  site is directly connected to social media platforms for
                  instant updates.
                </p>
                <br />
                <p>
                  Visit:{" "}
                  <a href="https://cyberbriefs.org/" className="text-red-400">
                    {" "}
                    cyberbriefs.org{" "}
                  </a>
                  {/* &{" "}
                  <a href="http://cxbriefs.org/" className="text-red-400">
                    {" "}
                    cxbriefs.org.
                  </a>{" "} */}
                </p>
              </div>
            )}
            {activeLink === "Smart Health" && (
              <div className="text-center md:text-left">
                {" "}
                <p className="text-sm md:text-sm text-justify mt-1">
                  Virtual encounters have changed the practice of healthcare
                  dramatically. The power of information technology in
                  transforming the complex ecosystem of health services is
                  intense and long term. We work with healthcare providers to
                  provide alternatives to clinic-based provision of services.
                </p>
                <br />
                <p className="text-sm md:text-sm text-justify mt-1">
                  These include creation of specialized portals such as{" "}
                  <a
                    href="https://onesmarterhealthweb.com/"
                    className="text-red-400"
                  >
                    OneSmarterHealthWeb.com
                  </a>{" "}
                  which opens up medical second opinion services to
                  international patients. Specializing in cancer-care and
                  support services, this portal connects patients who need
                  e-consults and second-opinions from world class cancer care
                  facilities in the United States.
                </p>
                <br />
                <p>
                  Visit:{" "}
                  <a
                    href="https://onesmarterhealthweb.com/"
                    className="text-red-400"
                  >
                    OneSmarterHealthWeb.com
                  </a>
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col w-full md:w-auto items-center md:items-start">
            <h2 className="text-red-600 font-semibold text-xl md:text-2xl mt-5 md:mt-0 lg:mt-0 mb-0 md:mb-4 lg:mb-4">
              PRODUCTS
            </h2>
            <div className="mt-10 md:mt-0 lg:mt-0 flex flex-col gap-4 w-full items-center md:items-start">
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

export default Products;
