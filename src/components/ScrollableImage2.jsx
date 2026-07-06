import React, { useState, useEffect, useRef } from "react";
import service1 from "../Images/service1.png";
import service2 from "../Images/service2.png";
import service3 from "../Images/service3.png";
import service4 from "../Images/service4.png";
import logo from "../Images/mainlogo2.png";
import { Link } from "react-router-dom";

const ScrollableImage2 = () => {
  const images = [service1, service2, service3, service4];

  const tooltips = [
    "Chef Placements",
    "Staffing",
    "Event Catering",
    "Temporary Staffing",
  ];

  const text = [
    "Chef Placements",
    "Staffing",
    "Event Catering",
    "Temporary Staffing",
  ];

  const imageTooltips = [
    "Engage our expert chefs, from executive to pastry, for crafting exquisite culinary delights.",
    "Elevate dining with our expert front-of-house team, ensuring exceptional service and hospitality.",
    "Enhance events with our professional catering team: expert chefs, efficient managers, and polished staff for a superior experience.",
    "Our Temporary Staffing Solutions effortlessly cater to short-term needs with flexible options.",
  ];

  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tooltipText, setTooltipText] = useState("");
  const [isTooltipVisible, setTooltipVisible] = useState(false);
  const [clickedIndex, setClickedIndex] = useState(null);
  const [showAnotherComponent, setShowAnotherComponent] = useState(false);
  const [selectedButton, setSelectedButton] = useState(null);
  const [typedText2, setTypedText2] = useState("");
  const [animationFrameId2, setAnimationFrameId2] = useState(null);

  const components = [""];

  const handleDotHover = (index) => {
    const container = containerRef.current;
    const targetImage = container.querySelector(
      `.image-wrapper:nth-child(${index + 1})`
    );

    const imageWrappers = container.querySelectorAll(".image-wrapper");
    imageWrappers.forEach((wrapper) => {
      wrapper.classList.remove("small");
    });

    if (targetImage) {
      targetImage.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      setActiveIndex(index);
      setTooltipText(tooltips[index]);
      setTooltipVisible(true);
    }
  };

  const handleDotLeave = () => {
    setTooltipVisible(false);
  };

  const handleImageClick = (index) => {
    setActiveIndex(index);
    setShowAnotherComponent(true);
  };

  const handleScroll = () => {
    const container = containerRef.current;
    const imageWrappers = container.querySelectorAll(".image-wrapper");

    let inViewIndex = 0;

    imageWrappers.forEach((wrapper, index) => {
      const rect = wrapper.getBoundingClientRect();

      if (
        rect.top <= window.innerHeight / 2 &&
        rect.bottom >= window.innerHeight / 2
      ) {
        inViewIndex = index;
      }
    });

    setActiveIndex(inViewIndex);
  };

  useEffect(() => {
    const container = containerRef.current;
    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    let index2 = 0;

    const animateText2 = () => {
      const fullText = `
      OneSmarter Staffing excels in linking top culinary talent with premier industry players. Understanding the sector's unique demands, we specialize in creating meaningful collaborations that propel both individuals and businesses forward. Join us in redefining culinary excellence and shaping the industry's future.
      `;

      setTypedText2({
        __html: fullText.slice(0, index2),
      });

      if (index2 < fullText.length) {
        index2++;
        setAnimationFrameId2(requestAnimationFrame(animateText2));
      }
    };

    setAnimationFrameId2(requestAnimationFrame(animateText2));

    return () => {
      cancelAnimationFrame(animationFrameId2);
    };
  }, []);

  const buttonDescriptions = {
    Services: (
      <>
        <h2 className="text-2xl font-bold">
          Explore this retired legacy service content designed to meet the
          diverse needs of the food sector:
        </h2>
        <br />
        <br />

        <div className="flex gap-24 justify-center flex-wrap">
          <div>
            <h3 className="font-semibold">Chef Placements:</h3>
            <ul className="list-disc list-inside text-left">
              <li>Executive Chefs</li>
              <li>Sous Chefs</li>
              <li>Line Cooks</li>
              <li>Pastry Chefs</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">Front-of-House Staffing:</h3>
            <ul className="list-disc list-inside text-left">
              <li>Servers</li>
              <li>Bartenders</li>
              <li>Hosts/Hostesses</li>
              <li>Food Runners</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">Event Catering Teams:</h3>
            <ul className="list-disc list-inside text-left">
              <li>Event Chefs</li>
              <li>Catering Managers</li>
              <li>Waitstaff</li>
              <li>Event Setup Crew</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">Temporary Staffing Solutions:</h3>
            <ul className="list-disc list-inside text-left">
              <li>Short-term Kitchen Staff</li>
              <li>Seasonal Servers</li>
              <li>Event Staffing for Peak Periods</li>
            </ul>
          </div>
        </div>
        <br />
        <br />
        <div className="text-left">
          <h3 className="font-semibold">Chef Placements:</h3>
          <p>
            Secure the expertise of our accomplished culinary professionals,
            from Executive Chefs who lead kitchen operations to skilled Sous
            Chefs, Line Cooks crafting culinary masterpieces, and creative
            Pastry Chefs bringing delightful sweet creations to your table.
          </p>
          <br />
          <h3 className="font-semibold">Front-of-House Staffing:</h3>
          <p>
            Enhance the overall dining experience with our Front-of-House
            Staffing solutions. Our team of Servers ensures seamless service,
            Bartenders craft delightful beverages, Hosts/Hostesses welcome
            guests with warmth, and Food Runners ensure timely delivery of
            culinary delights to the table.
          </p>
          <br />
          <h3 className="font-semibold">Event Catering Teams:</h3>
          <p>
            Transform your events into culinary spectacles with our Event
            Catering Teams. Our talented Event Chefs design exquisite menus,
            Catering Managers coordinate flawless execution, Waitstaff deliver
            impeccable service, and Event Setup Crew ensures every detail is
            perfectly arranged.
          </p>
          <br />
          <h3 className="font-semibold">Temporary Staffing Solutions:</h3>
          <p>
            Addressing short-term staffing demands effortlessly, our Temporary
            Staffing Solutions provide adaptable solutions. From Short-term
            Kitchen Staff handling dynamic kitchen requirements to Seasonal
            Servers offering a personalized touch, and Event Staffing tailored
            for peak periods, we ensure your team meets every challenge with
            efficiency and professionalism.
          </p>
        </div>
      </>
    ),
    "About Us": (
      <div className="text-left text-white">
        OneSmarter Staffing excels in linking top culinary talent with premier
        industry players. Understanding the sector's unique demands, we
        specialize in creating meaningful collaborations that propel both
        individuals and businesses forward. Join us in redefining culinary
        excellence and shaping the industry's future.
      </div>
    ),
    "Contact Us": (
      <div className="text-left">
        <p className="text-white">
          Have questions or need assistance? Contact our team today. We're here
          to help route your request to the right OneSmarter team for your
          needs.
        </p>
        <p className="text-white">
          <strong>Contact: </strong>
          <Link to="mailto:care@onesmarter.com">
            care@onesmarter.com
          </Link>
        </p>
      </div>
    ),
  };

  const bottomRef = useRef(null);
  const scrollToBottom = () => {
    console.log("ScrollToBottom called", bottomRef.current);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleButtonClick = (button) => {
    scrollToBottom();
    if (button === "Services") {
      window.location.href = "#/services";
    } else {
      if (selectedButton === button) {
        setSelectedButton(null);
      } else {
        setSelectedButton(button);
      }
    }
  };

  return (
    <>
      <style>{`
        .scrollable-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollable-container::-webkit-scrollbar {
          display: none;
        }
        
        .image-wrapper.small {
          transform: scale(0.4);
          margin: 0 10px;
        }
        
        .updated-dot:hover .tooltip {
          opacity: 1;
        }
        
        @media screen and (max-width: 1200px) {
          .image-text {
            line-height: 30px;
            font-size: 22px;
            top: 80%;
            width: 60%;
            border-radius: 0px 70% 0px 0px;
          }
          .gallery-image {
            border-radius: 0px;
            max-width: 90%;
          }
        }
        
        @media screen and (max-width: 600px) {
          .gallery-image {
            max-width: 88%;
            border-radius: 0px;
          }
          .image-text {
            line-height: 30px;
            font-size: 20px;
            top: 65%;
            width: 97%;
            border-radius: 0px 70% 0px 0px;
            transform: translateX(-50%);
            padding: 5px;
            left: 54%;
          }
        }
      `}</style>

      {/* Gradient effect overlay */}
      <div 
        className="fixed top-0 left-0 right-0 w-full h-[20vh] z-[998]"
        style={{
          background: "linear-gradient(180deg, #000 10.18%, rgba(0, 0, 0, 0.87) 14.87%, rgba(0, 0, 0, 0) 100%)"
        }}
      />

      {/* Scrollable container */}
      <div 
        className="scrollable-container relative overflow-y-scroll h-screen"
        ref={containerRef}
      >
        {/* Dot navigation */}
        <div className="fixed top-1/2 right-5 -translate-y-1/2 flex flex-col items-center z-[1]">
          {images.map((_, index) => (
            <div
              key={index}
              className={`
                updated-dot w-2.5 bg-gray-400 rounded-full my-2.5 cursor-pointer
                transition-opacity duration-300 relative z-[1]
                ${index === activeIndex 
                  ? "opacity-100 h-[30px] bg-white" 
                  : "opacity-50 h-2.5"
                }
              `}
              onMouseEnter={() => handleDotHover(index)}
              onMouseLeave={handleDotLeave}
            >
              {isTooltipVisible && (
                <div className="tooltip absolute top-1/2 right-full -translate-y-1/2 whitespace-nowrap pr-1 bg-black text-white rounded font-bold opacity-0 transition-opacity duration-300">
                  {tooltipText}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Image gallery */}
        <div className="flex flex-col items-center">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className={`
                image-wrapper flex justify-center items-center mx-auto relative mb-5
                transition-opacity duration-300
                ${index === activeIndex ? "opacity-70" : "opacity-50"}
              `}
              onClick={() => handleImageClick(index)}
            >
              {index === clickedIndex && components[index]}
              {index !== clickedIndex && (
                <>
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="gallery-image max-w-[80%] h-screen object-cover block mb-[30px]"
                  />

                  <div 
                    className="image-text absolute w-1/2 top-[79%] left-[35%] mx-auto -translate-x-1/2 -translate-y-1/2 text-white text-xl font-normal text-left whitespace-pre-wrap h-[35vh] rounded-tr-[90%] p-0"
                    style={{
                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                      backgroundColor: "rgba(0, 0, 0, 0.9)",
                      fontFamily: "kanit"
                    }}
                  >
                    <div 
                      className="text-xl font-semibold text-white"
                      style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)" }}
                    >
                      {text[index]}
                    </div>
                    <div className="w-[70%]">{imageTooltips[index]}</div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Logo - responsive positioning */}
      <div className="fixed z-[999] bottom-2 ml-2 max-lg:bottom-[91%] max-lg:w-full max-lg:text-center max-lg:ml-0">
        <img
          src={logo}
          alt="Logo"
          className="w-[180px] lg:bg-black/50 rounded-t-[20px] rounded-b-[5px]"
        />
      </div>

      {/* Navigation buttons */}
      <div className="fixed bottom-0 right-0 z-[1] flex">
        <div 
          className="bg-black rounded-tl-[50px]"
          style={{ boxShadow: "1px -1px 5px 1px rgba(255, 255, 255, 0.7)" }}
        >
          {Object.keys(buttonDescriptions).map((button) => (
            <button
              key={button}
              onClick={() => handleButtonClick(button)}
              className={`
                px-4 py-2 rounded-tl-[50px] rounded-tr-[10px] rounded-br-[25px] rounded-bl-0
                text-white bg-black hover:bg-gray-800 transition-colors
                ${selectedButton === button ? "bg-teal-600 hover:bg-teal-700" : ""}
              `}
            >
              {button}
            </button>
          ))}
        </div>
      </div>

      {/* Selected button content */}
      {selectedButton && (
        <div>
          <p className="text-lg mt-10 mb-[200px] whitespace-pre-wrap p-10">
            {buttonDescriptions[selectedButton]}
          </p>
        </div>
      )}

      <div ref={bottomRef} className="h-[15vh]"></div>
    </>
  );
};

export default ScrollableImage2;
