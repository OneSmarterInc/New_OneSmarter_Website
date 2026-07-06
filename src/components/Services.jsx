import React from "react";
import service1 from "../assets/services-01.jpg";
import service2 from "../assets/services-02.jpg";
import service3 from "../assets/services-03.jpg";
import service4 from "../assets/services-04.jpg";

const services = [
  {
    title: "BENEFITS MANAGEMENT",
    description:
      "Extensive deployment of BOTS to change processes to near-real time with incredible accuracy. These include treasury operations, tax submissions, EDI, NACHA files and accounts payable functions.",
    image: service1,
  },
  {
    title: "HUMAN RESOURCES",
    description:
      "We support HR forms processing with OCR/OMR and process automation. Working closely with HR clients, we have created solutions for I-9 audits improving compliance.",
    image: service2,
  },
  {
    title: "HEALTHCARE",
    description:
      "One Smarter, Inc. developed virtual encounter options for clinics and large multi-specialty hospitals to help healthcare facilities meet the needs of changing times.",
    image: service3,
  },
  {
    title: "TELECOM",
    description:
      "Using dynamics portals and process automation tools, we support telecom clients in building expense management portals and decision tools.",
    image: service4,
  },
];

const Services = () => {
  return (
    <section className="bg-[#f8f9fa] py-12 px-4 sm:px-6 md:px-12 lg:px-20 xl:px-32 2xl:px-40">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="text-3xl sm:text-3xl md:text-4xl font-semibold uppercase text-black mb-10 text-left md:text-left">
          Where We Work
        </h2>

        <div className="grid gap-8 lg:grid-cols-2">
        {services.map((service, index) => (
  <div
    key={index}
    className="flex flex-col lg:flex-row bg-white shadow-sm rounded overflow-hidden"
  >
    {/* Image First on Mobile, Second on Desktop */}
    <div className="order-1 lg:order-2 lg:w-1/2 h-60 lg:h-auto">
      <img
        src={service.image}
        alt={service.title}
        className="w-full h-full object-cover"
      />
    </div>

    {/* Text Section */}
    <div className="order-2 lg:order-1 bg-[#e30613] text-white p-6 flex flex-col justify-between lg:w-1/2">
      <div>
        <h3 className="text-lg sm:text-xl font-bold uppercase">
          {service.title}
        </h3>
        <div className="w-12 h-[2px] bg-white my-3" />
        <p className="text-sm sm:text-base leading-relaxed">
          {service.description}
        </p>
      </div>
    </div>
  </div>
))}

        </div>
      </div>
    </section>
  );
};

export default Services;
