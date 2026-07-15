import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ScrollableImage from "../components/ScrollableImage";
import ai2 from "../Images/ai2.mp4";
import logo from "../Images/mainlogo2.png";
import { Menu as MenuIcon, X as CloseIcon } from "lucide-react";

const StaffingHome = () => {
  const [isOpen, setIsOpen] = useState(false);
  const onToggle = () => setIsOpen((v) => !v);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Hide global footer on this page
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'none';
    }
    return () => {
      const footer = document.querySelector('footer');
      if (footer) {
        footer.style.display = '';
      }
    };
  }, []);

  return (
    <div className="text-white">
      <nav className="fixed bottom-1 left-0 right-0 z-[100] bg-black text-white p-4 flex items-center justify-between">
        <div className="w-32">
          <img src={logo} alt="logo" className="w-full" />
        </div>

        {isMobile && (
          <button onClick={onToggle} aria-label="menu-button" className="z-10">
            {isOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        )}

        {!isMobile && (
          <ul className="flex gap-6 ml-auto relative z-10">
            <li>
              <Link to="/" className="text-white cursor-pointer hover:text-gray-300 transition-colors">
                Services
              </Link>
            </li>
            <li>
              <Link to="/aboutus/introduction" className="text-white cursor-pointer hover:text-gray-300 transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <a href="mailto:care@onesmarter.com" className="text-white cursor-pointer hover:text-gray-300 transition-colors">
                Contact Us
              </a>
            </li>
          </ul>
        )}

        {isMobile && isOpen && (
          <div className="absolute left-0 right-0 top-full bg-red-600 text-white flex flex-col items-center py-4">
            <Link className="w-full text-center py-2" to="/" onClick={onToggle}>Services</Link>
            <Link className="w-full text-center py-2" to="/aboutus/introduction" onClick={onToggle}>About Us</Link>
            <a className="w-full text-center py-2" href="mailto:care@onesmarter.com" onClick={onToggle}>Contact Us</a>
          </div>
        )}
      </nav>

      <div className="w-full m-auto mb-12">
        <video autoPlay controls style={{ height: "100vh" }} width="100%">
          <source src={ai2} type="video/mp4" />
        </video>
      </div>

      <ScrollableImage />
    </div>
  );
};

export default StaffingHome;
