import React, { useState } from "react";
import qualityImg from "../assets/quality.jpg";
import product1 from "../assets/product-01.jpg";
import product2 from "../assets/enterpriseApplications.jpg";
import product3 from "../assets/digitalTransformation.jpg";
import architecture from "../assets/architectureAnalysis.jpg";
import db from "../assets/product-02.jpg";
import proskills from "../assets/product-03.jpg";

import projectImg from "../assets/projectManagement.jpg";
import humanImg from "../assets/humanPerformance.jpg";
import leadsImg from "../assets/team-collage-new.png";
import swaroop from "../assets/leadby/swaroop.jpg";
import ajesh from "../assets/leadby/ajesh.jpg";
import aswathy from "../assets/leadby/aswathy.jpg";
import deepak from "../assets/leadby/deepak.jpg";
import jinto from "../assets/leadby/jinto.jpg";
import minhaj from "../assets/leadby/minhaj.jpg";
import subhash from "../assets/leadby/subhash.jpg";
import vishnu from "../assets/leadby/vishnu.jpg";
import { AnimatePresence, motion } from "framer-motion";

const tabContent = {
  STRENGTHS: (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 text-left">
      {/* Left Text Content */}

      <div className="space-y-4">
        {/* Block 1 */}
        <p className="text-2xl font-semibold">STRENGTHS</p>
        <div>
          <h4 className="text-xl text-red-600 font-semibold uppercase mb-1">
            Programming Skills
          </h4>
          <div className="md:flex lg:flex gap-4 mt-3">
            <img
              src={db}
              alt="Quality"
              className="w-full md:w-70 md:h-40 lg:w-70 lg:h-40  object-cover"
            />
            <div className="flex flex-col">
              <p className="text-sm mt-2 md:mt-0 lg:mt-0">
                Programming functional solutions by understanding problems is
                our core <strength className={" "}></strength>
                <br />
                <span className="text-gray-800 font-semibold">
                  Let's restate this a bit:
                </span>{" "}
                We develop functional technology solutions by understanding
                your needs and delivering practical, supportable software.
              </p>
              <div className="flex items-end justify-end gap-2 mt-auto">
                {/* <img
                  src={ajesh}
                  alt="swaroop"
                  className="h-8 w-8 rounded-full"
                />

                <p className="text-md font-semibold mt-5 md:mt-0 lg:mt-0">
                  Practice Leads:{" "}
                  <span className="font-normal">Ajesh Anand</span>
                </p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Block 2 */}
        <div>
          <h4 className="mt-5 md:mt-0 lg:mt-0 text-xl text-red-600 font-semibold uppercase mb-1">
            Database Management and Administration
          </h4>
          <div className="md:flex lg:flex gap-4 mt-3">
            <img
              src={proskills}
              alt="Project Mgmt"
              className="w-full md:w-65 md:h-40 lg:w-65 lg:h-40 object-cover"
            />
            <div className="flex flex-col ">
              <p className="text-sm mt-2 md:mt-0 lg:mt-0">
                We support multiple databases: Microsoft SQL Server, My SQL,
                MongoDB, PostgresSQL and others. We can manage, maintain and
                support your technology environment 24/7.
              </p>
              <div className="flex items-end justify-end gap-2 mt-auto">
                {/* <img
                  src={minhaj}
                  alt="swaroop"
                  className="h-8 w-8 rounded-full"
                />

                <p className="text-md font-semibold mt-5 md:mt-0 lg:mt-0">
                  Practice Leads:{" "}
                  <span className="font-normal">Minhaj Raheem</span>
                </p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Block 3 */}
        <div>
          <h4 className="mt-5 md:mt-0 lg:mt-0 text-xl text-red-600 font-semibold uppercase mb-1">
            Architecture Analysis
          </h4>
          <div className="md:flex lg:flex gap-4 mt-3">
            <img
              src={architecture}
              alt="Human Performance"
              className="w-full md:w-90 md:h-40 lg:w-90 lg:h-40 object-cover"
            />
            <div className="flex flex-col">
              <p className="text-sm mt-2 md:mt-0 lg:mt-0">
                Our technology solutions are driven by requirements analysis,
                prototyping, user interface design, and analysis. This enables
                our solutions to meet your vision.
              </p>
              <div className="flex items-end justify-end gap-2 mt-auto">
                {/* <img
                  src={swaroop}
                  alt="minhaj"
                  className="h-8 w-8 rounded-full"
                />
                <img
                  src={vishnu}
                  alt="minhaj"
                  className="h-8 w-8 rounded-full"
                />
                <p className="text-md font-semibold mt-5 md:mt-0 lg:mt-0">
                  Practice Leads:{" "}
                  <span className="font-normal">Swaroop Lal & Vishnu Raj</span>
                </p> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Practice Leads */}
      <div className=" p-2 pt-6 relative">
        <h5 className="mt-10 md:mt-0 lg:mt-0 w-full absolute -top-15 left-1/2 -translate-x-1/2 px-8 py-3 text-md text-center font-bold bg-gray-800 text-white rounded-tr-3xl rounded-bl-3xl">
          MEET OUR CORE TEAM
        </h5>
        <img
          src={leadsImg}
          alt="Practice Leads Grid"
          className="w-full h-auto object-cover mt-5 md:mt-0 lg:mt-0"
        />
      </div>
    </div>
  ),
  CAPABILITIES: (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 text-left">
      {/* Left Text Content */}

      <div className="space-y-4">
        {/* Block 1 */}
        <p className="text-2xl font-semibold">CAPABILITIES</p>
        <div>
          <h4 className="text-xl text-red-600 font-semibold uppercase mb-1">
            Robotic Process Automation
          </h4>
          <div className="md:flex lg:flex gap-4 mt-3">
            <img
              src={product1}
              alt="Quality"
              className="w-full md:w-70 md:h-40 lg:w-70 lg:h-40 object-cover"
            />
            <div className="flex flex-col">
              <p className="text-sm mt-2 md:mt-0 lg:mt-0">
                We reengineer and automate your recurring, repetitive, and
                high-cost processes. Our intelligent BOTS take over
                labor-intensive tasks and integrate across multiple systems and
                organizations.
              </p>
              <div className="flex items-end justify-end gap-2 mt-auto">
                {/* <img
                  src={subhash}
                  alt="swaroop"
                  className="h-8 w-8 rounded-full"
                />

                <p className="text-md font-semibold mt-5 md:mt-0 lg:mt-0">
                  Practice Leads:{" "}
                  <span className="font-normal">Subhash CK</span>
                </p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Block 2 */}
        <div>
          <h4 className="mt-5 md:mt-0 lg:mt-0 text-xl text-red-600 font-semibold uppercase mb-1">
            Enterprise Applications
          </h4>
          <div className="md:flex lg:flex gap-4 mt-3">
            <img
              src={product2}
              alt="Project Mgmt"
              className="w-full md:w-65 md:h-40 lg:w-65 lg:h-40 object-cover"
            />
            <div className="flex flex-col ">
              <p className="text-sm mt-2 md:mt-0 lg:mt-0">
                We create the enterprise-grade customer experience with our
                scalable and feature rich solutions. These include the finest
                customer experience with stunning web solutions and to mobility
                apps. We craft user experiences by blending art and human
                behavior to build consistent and modern user interfaces for our
                clients.
              </p>
              <div className="flex items-end justify-end gap-2 mt-auto">
                {/* <img
                  src={deepak}
                  alt="swaroop"
                  className="h-8 w-8 rounded-full"
                />
                <img
                  src={jinto}
                  alt="minhaj"
                  className="h-8 w-8 rounded-full"
                />
                <p className="text-md font-semibold mt-5 md:mt-0 lg:mt-0">
                  Practice Leads:{" "}
                  <span className="font-normal">
                    Deepak Krishna & Jinto Paul
                  </span>
                </p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Block 3 */}
        <div>
          <h4 className="mt-5 md:mt-0 lg:mt-0 text-xl text-red-600 font-semibold uppercase mb-1">
            Digital Transformation
          </h4>
          <div className="md:flex lg:flex gap-4 mt-3">
            <img
              src={product3}
              alt="Human Performance"
              className="w-full md:w-90 md:h-40 lg:w-90 lg:h-40 object-cover"
            />
            <div className="flex flex-col">
              <p className="text-sm mt-2 md:mt-0 lg:mt-0">
                We work with you to digitally transform your business - connect
                with your customers, clients, and external stakeholders. Whether
                you want a dynamic digital marketplace or an executive
                dashboard; we can work with you from ideation to implementation.
              </p>
              <div className="flex items-end justify-end gap-2 mt-auto">
                {/* <img
                  src={swaroop}
                  alt="minhaj"
                  className="h-8 w-8 rounded-full"
                />
                <p className="text-md font-semibold mt-5 md:mt-0 lg:mt-0">
                  Practice Leads:{" "}
                  <span className="font-normal">Swaroop Lal</span>
                </p> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Practice Leads */}
      <div className="p-2 pt-6 relative">
        <h5 className="mt-10 md:mt-0 lg:mt-0 w-full absolute -top-15 left-1/2 -translate-x-1/2 px-8 py-3 text-md text-center font-bold bg-gray-800 text-white rounded-tr-3xl rounded-bl-3xl">
          MEET OUR CORE TEAM
        </h5>
        <img
          src={leadsImg}
          alt="Practice Leads Grid"
          className="w-full h-auto object-cover"
        />
      </div>
    </div>
  ),
  "WHY US?": (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 text-left">
      {/* Left Text Content */}

      <div className="space-y-4">
        {/* Block 1 */}
        <p className="text-2xl font-semibold">WHY US?</p>
        <div>
          <h4 className="text-xl text-red-600 font-semibold uppercase mb-1">
            Quality & Compliance
          </h4>
          <div className="md:flex lg:flex gap-4 mt-3">
            <img
              src={qualityImg}
              alt="Quality"
              className="w-full md:w-70 md:h-40 lg:w-70 lg:h-40 object-cover"
            />
            <div className="flex flex-col">
              <p className="text-sm mt-2 md:mt-0 lg:mt-0">
                We align development with software validation, remediation, risk
                assessment, quality review and data integrity assessments.
              </p>
              <div className="flex items-end justify-end gap-2 mt-auto">
                {/* <img
                  src={aswathy}
                  alt="swaroop"
                  className="h-8 w-8 rounded-full"
                />

                <p className="text-md font-semibold mt-5 md:mt-0 lg:mt-0">
                  Practice Leads:{" "}
                  <span className="font-normal">Aswathy Krishan</span>
                </p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Block 2 */}
        <div>
          <h4 className="mt-5 md:mt-0 lg:mt-0 text-xl text-red-600 font-semibold uppercase mb-1">
            Global Project Management & Delivery
          </h4>
          <div className="md:flex lg:flex gap-4 mt-3">
            <img
              src={projectImg}
              alt="Project Mgmt"
              className="w-full md:w-65 md:h-40 lg:w-65 lg:h-40 object-cover"
            />
            <div className="flex flex-col ">
              <p className="text-sm mt-2 md:mt-0 lg:mt-0">
                We manage global, integrated teams efficiently and effectively;
                weaving operational diversity into our cultural fabric.
              </p>
              <div className="flex items-end justify-end gap-2 mt-auto">
                {/* <img
                  src={swaroop}
                  alt="swaroop"
                  className="h-8 w-8 rounded-full"
                />
                <img
                  src={minhaj}
                  alt="minhaj"
                  className="h-8 w-8 rounded-full"
                />
                <p className="text-md font-semibold mt-5 md:mt-0 lg:mt-0">
                  Practice Leads:{" "}
                  <span className="font-normal">
                    Swaroop Lal & Minhaj Raheem
                  </span>
                </p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Block 3 */}
        <div>
          <h4 className="mt-5 md:mt-0 lg:mt-0 text-xl text-red-600 font-semibold uppercase mb-1">
            Human Performance Excellence
          </h4>
          <div className="md:flex lg:flex gap-4 mt-3">
            <img
              src={humanImg}
              alt="Human Performance"
              className="w-full md:w-90 md:h-40 lg:w-90 lg:h-40 object-cover"
            />
            <div className="flex flex-col">
              <p className="text-sm mt-2 md:mt-0 lg:mt-0">
                We continue to seek ways to improve our performance -
                individually and as a team. This means preparation, education,
                certifications, and bringing a richness to our work which is
                meaningful and engaging.
              </p>
              <div className="flex items-end justify-end gap-2 mt-auto">
                {/* <img
                  src={vishnu}
                  alt="swaroop"
                  className="h-8 w-8 rounded-full"
                />
                <img
                  src={swaroop}
                  alt="minhaj"
                  className="h-8 w-8 rounded-full"
                />
                <p className="text-md font-semibold mt-5 md:mt-0 lg:mt-0">
                  Practice Leads:{" "}
                  <span className="font-normal">Vishu raj & Swaroop Lal</span>
                </p> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Practice Leads */}
      <div className="p-2 pt-6 relative">
        <h5 className="mt-10 md:mt-0 lg:mt-0 w-full absolute -top-15 left-1/2 -translate-x-1/2 px-8 py-3 text-md text-center font-bold bg-gray-800 text-white rounded-tr-3xl rounded-bl-3xl">
          MEET OUR CORE TEAM
        </h5>
        <img
          src={leadsImg}
          alt="Practice Leads Grid"
          className="w-full h-auto object-cover"
        />
      </div>
    </div>
  ),
};

const TabsSection = () => {
  const [activeTab, setActiveTab] = useState("STRENGTHS");

  return (
    <section className="bg-white py-12 px-4 md:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {Object.keys(tabContent).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-t-xl cursor-pointer px-4 py-2 font-semibold text-sm uppercase transition-all rounded ${activeTab === tab
                ? "bg-red-600 text-white"
                : "bg-black text-white hover:bg-red-600"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-4 text-gray-800 text-sm md:text-base">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              {tabContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default TabsSection;
