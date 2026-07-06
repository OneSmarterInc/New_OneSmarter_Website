import React, { useEffect, useRef, useState } from "react";
import img from "../assets/PeterMHager.jpg";
import img2 from "../assets/drv2.jpg";
import img3 from "../assets/john5.jpg";

import { useParams } from "react-router-dom";
import Loader from "./Loader/Loader";

const AboutUs = () => {
  const { value } = useParams();
  useEffect(() => {
    console.log(value);
    setActiveLink(value);
  }, [value]);
  const [activeLink, setActiveLink] = useState("");
  const links = ["Introduction", "Mission", "Vision"];

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
    <div className="md:mx-32 mt-20 md:mt-50 lg:mt-50">
      <div className="w-full mt-10 bg-white text-black px-4 md:px-4 py-10">
        <div className="flex flex-col-reverse md:flex-row justify-between gap-10 items-center md:items-start">
          <div className="text-center w-full mt-6 md:mt-0">
            {activeLink === "" && (
              <h1 className="text-2xl md:text-3xl font-bold text-center leading-snug">
                One Smarter is a comprehensive{" "}
                <span className="text-red-600">IT</span> services company that
                offers solutions at affordable prices.
              </h1>
            )}
            {activeLink === "Introduction" && (
              <h1 className="text-2xl md:text-3xl font-bold text-center leading-snug">
                One Smarter is a comprehensive{" "}
                <span className="text-red-600">IT</span> services company that
                offers solutions at affordable prices.
              </h1>
            )}
            {activeLink === "Vision" && (
              <h1 className="text-2xl md:text-3xl font-bold text-center leading-snug">
                Revolutionizing <span className="text-red-600">IT</span>{" "}
                services by doing it cheaper, better, smarter.
              </h1>
            )}
            {activeLink === "Mission" && (
              <h1 className="text-2xl md:text-3xl font-bold text-center leading-snug">
                Our mission is to simplify{" "}
                <span className="text-red-600">IT</span> services by providing
                quality affordable solutions to ALL business.
              </h1>
            )}
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
                  <p className="text-xs">
                    <i className="fa-solid fa-chevron-right"></i>
                  </p>
                  <p>{item}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row mt-10 gap-5 md:gap-2 px-4 md:px-10 items-center">
          <img
            src={img2}
            alt="Pete M. Hager"
            className="w-40 h-32 md:w-48 md:h-36 rounded-md object-cover"
          />
          <div className="md:ml-6 mt-4 md:mt-0 text-center md:text-left">
            <h2 className="text-xl md:text-xl font-bold">Dr. Vikram Sethi</h2>
            <p className="text-red-600 font-semibold">President</p>
            <p className="text-sm md:text-sm text-justify mt-1">
              Vikram is the founder and President of One Smarter, Inc. He has
              over 20 years of experience in advising startup organizations with
              developing business success stories, funding, cash allocation and
              position, product development and market positioning activities in
              the United States.
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row mt-10 gap-5 md:gap-2 px-4 md:px-10 items-center">
          <img
            src={img3}
            alt="Pete M. Hager"
            className="w-[190px] h-[160px] rounded-md object-cover"
          />
          <div className="md:ml-6 mt-4 md:mt-0 text-center md:text-left">
            <h2 className="text-xl md:text-xl font-bold">John Gingel</h2>
            <p className="text-red-600 font-semibold">Advisor</p>
            <p className="text-sm md:text-sm text-justify mt-1">
              With over 20 years of work experience in the insurance and
              nonprofit sectors, John sets the strategic direction for the
              company. He oversees the strategic direction, operations, and
              financial performance of the organizations, while leveraging his
              skills in management, change management, and nonprofit leadership.
              Previously, he was the chief practice officer at Segal, a leading
              consulting firm, where he led the development and execution of
              innovative solutions for clients across various industries.
            </p>
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
            <p className="text-red-600 font-semibold">COO</p>
            <p className="text-sm md:text-sm text-justify mt-1">
              Under the leadership of the CEO, the company continues to focus on
              delivering innovative and customized solutions tailored to each
              industry’s challenges. While IT services remain a core strength,
              the organization is also expanding into product development —
              offering tools and platforms designed to empower clients and drive
              sustainable business transformation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
