import React, { useState } from "react";
import lifeAtPoster from "../assets/life-at-ms.jpg"; // Background image
import lifeAtVideo from "../assets/onesmarterLife.mp4"; // Actual video
import { FaPlay } from "react-icons/fa";
import "../index.css"; // External CSS for animation
import soclogo from "../assets/soc.jpg";

const ConnectSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="w-full bg-white ">
      <div className="py-0  md:pl-45 lg:pl-45 w-full mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Text Section */}
        <div className="px-5 md:col-span-1 space-y-4">
          <h2 className="text-4xl md:text-4xl font-semibold text-red-600 uppercase mt-4">
            LET'S WORK TOGETHER
          </h2>
          <h3 className="text-2xl md:text-2xl font-semibold text-black">
            CONNECT WITH US TO KNOW
          </h3>
          <div className="w-20 h-[2px] bg-red-600 my-2" />
          <p className="text-md md:text-base text-gray-700">
            How we can transform your business with our future proof solutions?
          </p>
        </div>
        <div className="flex justify-center md:col-span-1">
          <img
            src={soclogo}
            alt="SOC LOGO"
           className="w-16 sm:w-20 md:w-24 lg:w-38 object-contain"
          />
        </div>
        {/* Video Section */}
        <div
          className="relative md:col-span-2  w-full lg:w-full md:w-full  overflow-hidden min-h-[300px] text-white ml-auto"
          style={{
            backgroundImage: `url(${lifeAtPoster})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-red-900 opacity-60 z-0"></div>

          {/* Text Content */}
          <div className="absolute top-6 left-6 z-10">
            <h2 className="text-2xl md:text-3xl font-bold leading-tight">
              LIFE AT <br /> ONESMARTER
            </h2>
            <ul className="mt-6 text-base md:text-lg font-medium space-y-1">
              <li>- UI/UX Designer</li>
              <li>- Web Developer</li>
            </ul>
          </div>

          {/* Play Button or Video */}
          {!isPlaying ? (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
              onClick={() => setIsPlaying(true)}
            >
              <div className="play-pulse">
                <FaPlay className="text-white text-2xl z-30" />
              </div>
            </div>
          ) : (
            <video
              className="w-full h-full object-cover z-20"
              controls
              autoPlay
              muted
            >
              <source src={lifeAtVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>
    </section>
  );
};

export default ConnectSection;
