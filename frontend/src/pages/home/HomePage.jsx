import NavBar from "../components/NavBar";
import { CalendarDays, BookOpen, Calculator, Microscope, Palette, Music, Globe, Users, Settings } from "lucide-react";
import FeaturesSection from "./components/FeaturesSection";
import { useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";

function FloatingInstruments() {
  const instruments = [
    { icon: BookOpen, size: 24, delay: 0 },
    { icon: Calculator, size: 28, delay: 2 },
    { icon: Microscope, size: 26, delay: 4 },
    { icon: Palette, size: 22, delay: 6 },
    { icon: Music, size: 25, delay: 8 },
    { icon: Globe, size: 30, delay: 10 },
    { icon: Users, size: 27, delay: 12 },
    { icon: Settings, size: 23, delay: 14 },
  ];

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-[1]">
      {instruments.map((instrument, index) => {
        const Icon = instrument.icon;
        return (
          <div
            key={index}
            className="absolute text-[#00ff87]/10 animate-float"
            style={{
              animationDelay: `${instrument.delay}s`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          >
            <Icon size={instrument.size} />
          </div>
        );
      })}
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden">
      <FloatingInstruments />
      <div className="max-w-[1400px] mx-auto mt-10 px-8 relative z-[2]">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20 min-h-[90vh] pt-[120px] text-center md:text-left">
          <div className="flex-1 w-full">
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] max-[480px]:text-[2rem] font-black leading-[1.1] mb-6 [text-shadow:2px_2px_8px_rgba(0,0,0,0.6)] tracking-tight">
              Generate School
              <span className="bg-gradient-to-r from-[#00ff87] to-[#32c8b8] bg-clip-text text-transparent"> Timetables</span>
              <br />
              Effortlessly
            </h1>
            <h3 className="text-[1.3rem] max-[480px]:text-[1.1rem] text-white/85 leading-relaxed mb-10 max-w-[600px] font-normal mx-auto md:mx-0">
              Create optimized class schedules with our intelligent algorithm.
              Save hours of manual work and eliminate scheduling conflicts with
              our professional-grade timetable generator. This is a free tool
              made to simplify your scheduling process.
            </h3>
            <div
              className="group relative bg-gradient-to-r from-[#3282b8] to-[#00ff87] text-white rounded-[16px] py-5 px-10 font-bold text-[1.25rem] cursor-pointer transition-all duration-300 overflow-hidden shadow-[0_15px_40px_rgba(50,130,184,0.4)] hover:shadow-[0_20px_50px_rgba(50,130,184,0.5)] hover:-translate-y-1 block text-center mt-6 w-full"
              onClick={() => navigate(`${isSignedIn ? "/dashboard" : "/login"}`)}
            >
              <span>Get Started Now</span>
              <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-[left] duration-500 group-hover:left-full"></div>
            </div>
            <div
              className="group relative bg-gradient-to-r from-[#3282b8] to-[#00ff87] text-white rounded-[16px] py-5 px-10 font-bold text-[1.25rem] cursor-pointer transition-all duration-300 overflow-hidden shadow-[0_15px_40px_rgba(50,130,184,0.4)] hover:shadow-[0_20px_50px_rgba(50,130,184,0.5)] hover:-translate-y-1 block text-center mt-6 w-full"
              onClick={() => navigate("/guide")}
            >
              <span>Learn How It Works</span>
              <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-[left] duration-500 group-hover:left-full"></div>
            </div>
          </div>
          {/* SolverSimulationWidget */}
          <div className="flex-1 w-full">
            <div className="flex justify-center items-center relative">
              <div className="relative bg-black/90 text-[#00ff87] border-4 border-[#00ff87] rounded-full p-14 inline-flex justify-center items-center shadow-[0_0_60px_rgba(0,255,135,0.5)]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(0,255,135,0.2)_0%,transparent_70%)] rounded-full animate-pulse-slow"></div>
                <CalendarDays size={120} className="animate-bounce-custom" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px]">
                  <div className="absolute w-2.5 h-2.5 bg-[#3282b8] rounded-full animate-orbit shadow-[0_0_10px_rgba(50,130,184,0.6)] top-0 left-1/2 [animation-delay:0s]"></div>
                  <div className="absolute w-2.5 h-2.5 bg-[#3282b8] rounded-full animate-orbit shadow-[0_0_10px_rgba(50,130,184,0.6)] top-1/4 right-0 [animation-delay:2.4s]"></div>
                  <div className="absolute w-2.5 h-2.5 bg-[#3282b8] rounded-full animate-orbit shadow-[0_0_10px_rgba(50,130,184,0.6)] bottom-0 left-1/2 [animation-delay:4.8s]"></div>
                  <div className="absolute w-2.5 h-2.5 bg-[#3282b8] rounded-full animate-orbit shadow-[0_0_10px_rgba(50,130,184,0.6)] top-1/4 left-0 [animation-delay:7.2s]"></div>
                  <div className="absolute w-2.5 h-2.5 bg-[#3282b8] rounded-full animate-orbit shadow-[0_0_10px_rgba(50,130,184,0.6)] top-1/2 right-1/4 [animation-delay:9.6s]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FeaturesSection />

        {/* FOOTER */}
        <footer className="bg-gradient-to-b from-black/95 to-[#14283c]/95 border-t border-[#3282b8]/40 py-16 pb-8 mt-16 relative shadow-[0_-4px_30px_rgba(0,0,0,0.4)] w-screen ml-[calc(-50vw+50%)]">
          <div className="max-w-[1400px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center md:items-start gap-8 md:gap-0 mb-8">
            <div className="flex flex-col items-center md:items-start gap-6">
              <h4 className="text-2xl font-extrabold bg-gradient-to-r from-[#00ff87] to-[#32c8b8] bg-clip-text text-transparent m-0 [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">Timetable Generator</h4>
              <div className="flex flex-row md:flex-col justify-center flex-wrap md:flex-nowrap gap-6 md:gap-3">
                <a className="relative text-white/80 no-underline text-[0.95rem] font-medium transition-all duration-300 inline-block w-fit cursor-pointer hover:text-[#00ff87] hover:translate-x-1 [text-shadow:0_0_8px_rgba(0,255,135,0)] hover:[text-shadow:0_0_8px_rgba(0,255,135,0.4)] after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-[#00ff87] after:to-[#32c8b8] after:transition-all after:duration-300 hover:after:w-full" onClick={() => setActiveModal("about")}>About</a>
                <a className="relative text-white/80 no-underline text-[0.95rem] font-medium transition-all duration-300 inline-block w-fit cursor-pointer hover:text-[#00ff87] hover:translate-x-1 [text-shadow:0_0_8px_rgba(0,255,135,0)] hover:[text-shadow:0_0_8px_rgba(0,255,135,0.4)] after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-[#00ff87] after:to-[#32c8b8] after:transition-all after:duration-300 hover:after:w-full" onClick={() => setActiveModal("terms")}>Terms</a>
                <a className="relative text-white/80 no-underline text-[0.95rem] font-medium transition-all duration-300 inline-block w-fit cursor-pointer hover:text-[#00ff87] hover:translate-x-1 [text-shadow:0_0_8px_rgba(0,255,135,0)] hover:[text-shadow:0_0_8px_rgba(0,255,135,0.4)] after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-[#00ff87] after:to-[#32c8b8] after:transition-all after:duration-300 hover:after:w-full" onClick={() => setActiveModal("contact")}>Contact</a>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-[#32c8b8] transition-all duration-300 cursor-pointer border border-[#3282b8]/30 hover:bg-[#00ff87]/20 hover:text-[#00ff87] hover:-translate-y-0.75 hover:shadow-[0_6px_20px_rgba(0,255,135,0.4)] hover:border-[#00ff87]/50" onClick={() => setActiveModal("language")}>
                  <Globe size={20} />
                </div>
                <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-[#32c8b8] transition-all duration-300 cursor-pointer border border-[#3282b8]/30 hover:bg-[#00ff87]/20 hover:text-[#00ff87] hover:-translate-y-0.75 hover:shadow-[0_6px_20px_rgba(0,255,135,0.4)] hover:border-[#00ff87]/50" onClick={() => setActiveModal("credits")}>
                  <Users size={20} />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-[#3282b8]/30 pt-8 text-center">
            <div className="text-white/60 text-sm font-normal">
              © 2025 Timetable Generator. All rights reserved.
            </div>
          </div>
        </footer>

        {/* MODALS */}
        {activeModal && (
          <div className="fixed inset-0 w-full h-full bg-black/75 flex items-center justify-center z-[9999]" onClick={closeModal}>
            <div className="bg-[#0f192c] border border-[#3282b8] p-8 rounded-[20px] w-[45%] max-w-full md:min-w-0 min-w-[95%] text-white relative shadow-[0_10px_40px_rgba(0,0,0,0.6)]" onClick={e => e.stopPropagation()}>
              <button className="absolute top-3 right-4 bg-transparent border-none text-white text-2xl cursor-pointer hover:text-[#00ff87] transition-colors duration-200" onClick={closeModal}>×</button>
              {activeModal === "about" && (
                <>
                  <h2 className="text-[#00ff87] text-2xl font-bold mb-4">About</h2>
                  <p className="text-[1rem] leading-relaxed text-white/85 mb-4">
                    Timetable Generator is a free tool designed to help schools and colleges
                    create optimized class schedules quickly and efficiently.
                    It eliminates hours of manual work and prevents scheduling conflicts.
                  </p>
                </>
              )}
              {activeModal === "terms" && (
                <>
                  <h2 className="text-[#00ff87] text-2xl font-bold mb-4">Terms</h2>
                  <p className="text-[1rem] leading-relaxed text-white/85 mb-4">
                    By using Timetable Generator, you agree that:
                    <br />- You are responsible for the input data.
                    <br />- The app does not store or share any data with third parties.
                    <br />- Generated timetables are for reference and should be reviewed by humans.
                  </p>
                </>
              )}
              {activeModal === "contact" && (
                <>
                  <h2 className="text-[#00ff87] text-2xl font-bold mb-4">Contact</h2>
                  <p className="text-[1rem] leading-relaxed text-white/85 mb-4">abhinandh2670@gmail.com – Abhinandh A</p>
                  <p className="text-[1rem] leading-relaxed text-white/85 mb-4">jasonbobbym@gmail.com – Jason Bobby</p>
                </>
              )}
              {activeModal === "language" && (
                <>
                  <h2 className="text-[#00ff87] text-2xl font-bold mb-4">Select Language</h2>
                  <p className="text-[1rem] leading-relaxed text-white/85 mb-4">Currently available: English</p>
                </>
              )}
              {activeModal === "credits" && (
                <>
                  <h2 className="text-[#00ff87] text-2xl font-bold mb-4">Credits & Help</h2>
                  <p className="text-[1rem] leading-relaxed text-white/85 mb-4">Abhinandh A</p>
                  <p className="text-[1rem] leading-relaxed text-white/85 mb-4">Jason Bobby</p>
                  <p className="text-[1rem] leading-relaxed text-white/85 mb-4">
                    <a href="/guide" className="relative text-white/80 no-underline text-[0.95rem] font-medium transition-all duration-300 inline-block w-fit cursor-pointer hover:text-[#00ff87] hover:translate-x-1 [text-shadow:0_0_8px_rgba(0,255,135,0)] hover:[text-shadow:0_0_8px_rgba(0,255,135,0.4)] after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-[#00ff87] after:to-[#32c8b8] after:transition-all after:duration-300 hover:after:w-full">
                      Need Help? Click here to visit the guide page.
                    </a>
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
