import React, { useState, useEffect, useRef } from "react";
import service1 from "../Images/S1.png";
import service2 from "../Images/S2.png";
import service3 from "../Images/S3.png";
import service4 from "../Images/S4.png";
import service5 from "../Images/S5.png";
import service6 from "../Images/S6.png";
import service7 from "../Images/S7.png";
import service8 from "../Images/healthcare.webp";
import logo from "../Images/mainlogo2.png";
import { Link } from "react-router-dom";

const ScrollableImage = () => {
  const images = [service1, service2, service3, service4, service5, service6, service7, service8];

  const text = [
    "Administrative & Office",
    "General Labour",
    "Heavy Labour and Construction",
    "Manufacturing",
    "Warehouse and Distribution",
    "Cooking",
    "Information Technology",
    "Healthcare"
  ];

  const imageRoutes = [
    "/services/staffing/administrative",
    "/services/staffing/general",
    "/services/staffing/heavy",
    "/services/staffing/manufacturing",
    "/services/staffing/warehouse",
    "/services/staffing/food",
    "/services/staffing/it",
    "/services/staffing/healthcare"
  ];

  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleDotClick = (index) => {
    const container = containerRef.current;
    const targetImage = container.querySelector(
      `.image-wrapper:nth-child(${index + 1})`
    );

    if (targetImage) {
      targetImage.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setActiveIndex(index);
    }
  };

  const handleScroll = () => {
    const container = containerRef.current;
    const imageWrappers = container.querySelectorAll(".image-wrapper");

    imageWrappers.forEach((wrapper, index) => {
      const rect = wrapper.getBoundingClientRect();
      if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
        setActiveIndex(index);
      }
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
        
        .scroll-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-snap-type: y mandatory;
        }
        .scroll-container::-webkit-scrollbar {
          display: none;
        }
        
        .image-wrapper {
          scroll-snap-align: center;
        }
        
        .image-wrapper img {
          transition: transform 0.8s ease, filter 0.5s ease;
        }
        
        .image-wrapper:hover img {
          transform: scale(1.02);
        }
        
        .dot-nav {
          transition: all 0.3s ease;
        }
        
        .dot-nav:hover {
          transform: scale(1.3);
        }
      `}</style>

      {/* Main scrollable container */}
      <div 
        className="scroll-container w-full h-full overflow-y-scroll py-8"
        ref={containerRef}
      >
        <div className="flex flex-col items-center gap-6">
          {images.map((imageUrl, index) => (
            <Link 
              to={imageRoutes[index]} 
              key={index}
              className="image-wrapper relative flex-shrink-0"
              style={{
                width: "85%",
                maxWidth: "1200px",
                height: "75vh"
              }}
            >
              {/* Image */}
              <img
                src={imageUrl}
                alt={text[index]}
                className="w-full h-full object-cover rounded-lg"
                style={{
                  filter: activeIndex === index ? "brightness(0.9)" : "brightness(0.5)"
                }}
              />
              
              {/* Text overlay - bottom left with curved edge */}
              <div 
                className="absolute bottom-0 left-0 bg-black/85 flex items-center"
                style={{
                  borderRadius: "0 50px 0 8px",
                  padding: "16px 50px 16px 20px",
                  minWidth: "240px"
                }}
              >
                <h2 
                  className="text-white text-lg md:text-xl font-medium"
                  style={{ 
                    fontFamily: "'Kanit', sans-serif",
                    letterSpacing: "0.02em"
                  }}
                >
                  {text[index]}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Dot navigation - right side */}
      <div className="fixed top-1/2 right-4 -translate-y-1/2 flex flex-col items-center gap-2.5 z-50">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`
              dot-nav rounded-full border-0 outline-none cursor-pointer
              ${index === activeIndex 
                ? "w-2 h-6 bg-white" 
                : "w-2 h-2 bg-white/50 hover:bg-white/80"
              }
            `}
            aria-label={`Go to ${text[index]}`}
          />
        ))}
      </div>

      {/* Page indicator - bottom center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <span 
          className="text-white/50 text-sm tracking-[0.25em]"
          style={{ fontFamily: "'Kanit', sans-serif" }}
        >
          {String(activeIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

export default ScrollableImage;