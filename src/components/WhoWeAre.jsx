import React from "react";

const WhoWeAre = () => {
  return (
    <section className="bg-white text-black py-10 px-4 sm:px-6 md:px-12 lg:px-20 xl:px-32 2xl:px-40">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="text-3xl sm:text-3xl md:text-4xl  font-semibold uppercase tracking-wider mb-6 text-left md:text-left">
          Who We Are
        </h2>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed sm:leading-loose text-left md:text-left max-w-4xl mx-auto md:mx-0">
          <span className="font-semibold">One Smarter, Inc.</span> develops innovative
          technology solutions to help you grow. We{" "}
          <span className="text-red-600 font-semibold">POWER</span> clients in the
          financial services, telecommunications, healthcare, and education industries.
        </p>
      </div>
    </section>
  );
};

export default WhoWeAre;
