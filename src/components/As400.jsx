import React, { useEffect, useState } from "react";
import as400Banner from "../assets/services-bg.jpg";
import check from "../assets/check-circle-white.svg";
import { Link } from "react-router-dom";
import Loader from "./Loader/Loader";

const AS400Banner = () => {
   
  return (
    <section
      className="w-full bg-cover bg-no-repeat bg-center"
      style={{
        backgroundImage: `url(${as400Banner})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="max-w-screen-xl mx-auto px-4 md:px-16 py-12 md:py-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Side is covered by the background image itself */}
          <div className="hidden md:block w-1/2" />

          {/* Right Text Section */}
          <div className="w-full md:w-1/2 text-center lg:text-left  md:text-left sm:text-center">
            <h5 className="text-3xl md:text-4xl font-semibold text-red-600 mb-2">
              AS400/IBMi
            </h5>
            <p className="text-black text-base md:text-lg mb-4">
              We Support Your AS400/IBMi Programming and Administration Needs
            </p>
            <p className="text-red-600 text-sm md:text-base mb-1">
              Application Development | Application Support and Maintenance
            </p>
            <p className="text-red-600 text-sm md:text-base mb-1">
              Application Modernization | AS400L1 ADMIN Activities
            </p>
            <p className="text-red-600 text-sm md:text-base mb-6">
              EDI Programming in AS400
            </p>

            <Link
              to="/as400services"
              className="inline-flex items-center gap-2 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition font-semibold text-sm md:text-base px-5 py-2 rounded-full"
            >
              <img src={check} alt="check" className="h-5 w-5" />
              Discover More
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AS400Banner;





// import React from "react";
// import as400Banner from "../assets/services-bg.jpg";
// import check from "../assets/check-circle-white.svg";

// const AS400Banner = () => {
//   return (
//     <section
//       className="relative w-full bg-cover bg-no-repeat bg-center"
//       style={{ backgroundImage: `url(${as400Banner})` }}
//     >
//       <div className="max-w-5xl mx-auto px-4 md:px-16 py-20 flex justify-end">
//         <div className="text-left max-w-2xl">
//           <h2 className="text-2xl md:text-3xl font-bold text-red-600 mb-2">
//             AS400/IBMi
//           </h2>
//           <h3 className="text-base md:text-lg font-sm text-black mb-4">
//             We Support Your AS400/IBMi Programming and Administration Needs
//           </h3>

//           <p className="text-sm md:text-base text-red-600 mb-1">
//             Application Development | Application Support and Maintenance
//           </p>
//           <p className="text-sm md:text-base text-red-600 mb-1">
//             Application Modernization | AS400L1 ADMIN Activities
//           </p>
//           <p className="text-sm md:text-base text-red-600 mb-6">
//             EDI Programming in AS400
//           </p>

//           <button className="bg-red-600 text-white text-sm px-3 py-2 rounded-full font-semibold hover:bg-red-700 transition">
//             <div className="flex"><img src={check} alt="check" className="h-5 w-5"/> Discover More</div>
//           </button>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default AS400Banner;
