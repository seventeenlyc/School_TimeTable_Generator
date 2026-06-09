import NavBar from "../components/NavBar";
import "./style.css";
import toast from "react-hot-toast";
import { 
  CalendarDays, 
  BookOpen, 
  Calculator, 
  Microscope, 
  Palette, 
  Music, 
  Globe, 
  Users, 
  Settings, 
  Mail, 
  FileText, 
  ArrowRight,
  ShieldAlert,
  Languages,
  Sparkles,
  Lock,
  FileSpreadsheet,
  Shuffle,
  X,
  Check,
  Send
} from "lucide-react";
import FeaturesSection from "./components/FeaturesSection";
import { useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

function FloatingInstruments() {
  const containerRef = useRef(null);
  const instruments = [
    { icon: BookOpen, size: 24 },
    { icon: Calculator, size: 28 },
    { icon: Microscope, size: 26 },
    { icon: Palette, size: 22 },
    { icon: Music, size: 25 },
    { icon: Globe, size: 30 },
    { icon: Users, size: 27 },
    { icon: Settings, size: 23 },
  ];

  useEffect(() => {
    const elements = containerRef.current.querySelectorAll('.floating-instrument');
    elements.forEach((el, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      const leftVal = col * 25 + Math.random() * 15;
      const topVal = row * 45 + Math.random() * 20;
      
      gsap.set(el, {
        left: `${leftVal}%`,
        top: `${topVal}%`,
        x: gsap.utils.random(-20, 20),
        y: gsap.utils.random(-20, 20),
        rotation: gsap.utils.random(-30, 30),
        opacity: gsap.utils.random(0.08, 0.18),
      });

      gsap.to(el, {
        x: `+=${gsap.utils.random(-40, 40)}`,
        y: `+=${gsap.utils.random(-60, 60)}`,
        rotation: `+=${gsap.utils.random(-60, 60)}`,
        duration: gsap.utils.random(12, 22),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
  }, []);

  return (
    <div ref={containerRef} className="floating-instruments">
      {instruments.map((instrument, index) => {
        const Icon = instrument.icon;
        return (
          <div key={index} className="floating-instrument">
            <Icon size={instrument.size} />
          </div>
        );
      })}
    </div>
  );
}

function SolverSimulationWidget() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    "Analyzing teacher workload matrices...",
    "Validating room availability conflicts...",
    "Optimizing class-subject pairings...",
    "Applying lunch & recess constraints...",
    "Resolving availability matrices..."
  ];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setStep((prevStep) => (prevStep + 1) % steps.length);
          return 0;
        }
        return prev + 4;
      });
    }, 150);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div className="h-24 rounded-2xl bg-white/5 border border-white/10 p-4.5 flex flex-col justify-between relative overflow-hidden group/solving w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#57f1db]/5 to-transparent -translate-x-full group-hover/solving:translate-x-full transition-transform duration-1000"></div>
      
      <div className="flex justify-between items-center w-full z-10">
        <span className="text-[10px] font-bold text-[#57f1db] uppercase tracking-widest flex items-center gap-1.5">
          <Shuffle size={10} className="text-[#57f1db] animate-spin" style={{ animationDuration: '4s' }} />
          <span>Optimization Engine</span>
        </span>
        <span className="text-[11px] font-extrabold text-[#57f1db] font-mono">{progress}%</span>
      </div>

      <div className="z-10 mt-1">
        <p className="text-xs text-white font-medium truncate tracking-wide">
          {steps[step]}
        </p>
      </div>

      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1 z-10 border border-white/5">
        <div 
          className="h-full bg-gradient-to-r from-[#57f1db] to-[#4fdbc8] rounded-full transition-all duration-150 ease-out shadow-[0_0_8px_rgba(87,241,219,0.3)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function InfoModal({ isOpen, type, onClose, navigate }) {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  // Form states for redesigned contact form
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(overlayRef.current, 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
      gsap.fromTo(modalRef.current, 
        { opacity: 0, scale: 0.94, y: 30 }, 
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.3)", delay: 0.05 }
      );
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleClose = () => {
    const tl = gsap.timeline({
      onComplete: onClose
    });
    tl.to(modalRef.current, { opacity: 0, scale: 0.94, y: 20, duration: 0.2, ease: "power2.in" });
    tl.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: "power2.in" }, "-=0.1");
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      toast.success("Feedback sent successfully! We will get back to you shortly.");
      setContactName("");
      setContactEmail("");
      setContactMessage("");
      setIsSubmitting(false);
    }, 1200);
  };

  return (
    <div ref={overlayRef} className="modal-overlay" onClick={handleClose}>
      <div ref={modalRef} className="modal-content glassmorphism-modal border border-[#57f1db]/20 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={handleClose} title="Close">
          <X size={18} />
        </button>
        
        {type === "about" && (
          <div className="modal-inner-content text-left items-start w-full">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="modal-header-icon text-[#57f1db] bg-[#57f1db]/5 border border-[#57f1db]/10 mb-0">
                <BookOpen size={28} />
              </div>
              <h2 className="mb-0 text-2xl font-extrabold text-white">About the Project</h2>
            </div>
            
            <div className="modal-grid-layout mt-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  We believe a school's schedule is its operational heartbeat, but crafting one is a monumental puzzle. Timetable Generator was born out of a desire to rescue administrators and teachers from the annual chaos of manual scheduling.
                </p>
                <p className="text-sm text-gray-300 leading-relaxed mt-3.5">
                  By marrying Google's state-of-the-art Operations Research solver (<strong>OR-Tools CP-SAT Solver</strong>) with a clean, intuitive human interface, we turn a week of frustration into a few clicks of satisfaction.
                </p>
              </div>
              
              <div className="flex flex-col justify-center gap-4">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex items-start gap-3.5 hover:border-[#57f1db]/30 transition-all duration-300">
                  <Lock size={18} className="text-[#57f1db] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Secure Sandbox</h4>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">Configurations are sandboxed, encrypted, and isolated by Clerk authentication frameworks.</p>
                  </div>
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex items-start gap-3.5 hover:border-amber-400/30 transition-all duration-300">
                  <Sparkles size={18} className="text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">SAT Engine</h4>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">Resolves teacher availability matrices and classroom constraints with 100% precision.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {type === "terms" && (
          <div className="modal-inner-content text-left items-start w-full">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="modal-header-icon text-[#4fdbc8] bg-[#4fdbc8]/5 border border-[#4fdbc8]/10 mb-0">
                <FileText size={28} />
              </div>
              <h2 className="mb-0 text-2xl font-extrabold text-white">Terms & Conditions</h2>
            </div>
            
            <div className="w-full max-h-[380px] overflow-y-auto pr-2 mt-4 space-y-5 text-left border-t border-white/10 pt-4 scrollbar-thin">
              <div className="pb-4 border-b border-white/5">
                <h4 className="text-sm font-extrabold text-[#4fdbc8] uppercase tracking-wider flex items-center gap-2 mb-1.5">
                  <Check size={14} className="shrink-0" />
                  <span>1. Service Agreement</span>
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed pl-5.5">
                  This generator is provided as a free utility for educational institutions worldwide to ensure equitable access to modern scheduling and planning tools.
                </p>
              </div>
              
              <div className="pb-4 border-b border-white/5">
                <h4 className="text-sm font-extrabold text-[#4fdbc8] uppercase tracking-wider flex items-center gap-2 mb-1.5">
                  <Check size={14} className="shrink-0" />
                  <span>2. Data Integrity & Control</span>
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed pl-5.5">
                  We respect your school's data. All input configurations (teachers, classes, classrooms) are sandboxed and encrypted using Clerk authentication frameworks. We do not sell or share institutional data.
                </p>
              </div>
              
              <div className="pb-4 border-b border-white/5">
                <h4 className="text-sm font-extrabold text-[#4fdbc8] uppercase tracking-wider flex items-center gap-2 mb-1.5">
                  <Check size={14} className="shrink-0" />
                  <span>3. Limitations of Solver Algorithms</span>
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed pl-5.5">
                  Timetable schedules are mathematically optimized against user-provided constraints using Google OR-Tools. Because scheduling contains real-world nuances, we strongly recommend thorough administrative verification before official implementation.
                </p>
              </div>
              
              <div className="pb-4 border-b border-white/5">
                <h4 className="text-sm font-extrabold text-[#4fdbc8] uppercase tracking-wider flex items-center gap-2 mb-1.5">
                  <Check size={14} className="shrink-0" />
                  <span>4. Acceptable Conduct</span>
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed pl-5.5">
                  Users agree to input authentic scheduling limits. Any automated load-testing or denial of solver endpoints is prohibited to ensure resource availability for all users.
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-extrabold text-[#4fdbc8] uppercase tracking-wider flex items-center gap-2 mb-1.5">
                  <Check size={14} className="shrink-0" />
                  <span>5. Modifications to Service</span>
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed pl-5.5">
                  We reserve the right to deploy algorithms updates. These terms remain valid across updates and changes to the generator.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {type === "contact" && (
          <div className="modal-inner-content text-left items-start w-full">
            <div className="flex items-center gap-3.5 mb-2">
              <div className="modal-header-icon text-purple-400 bg-purple-500/5 border border-purple-500/10 mb-0">
                <Mail size={28} />
              </div>
              <h2 className="mb-0 text-2xl font-extrabold text-white">Contact Support</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left mt-4 border-t border-white/10 pt-5">
              <div className="flex flex-col gap-4">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Have questions, custom constraint requirements, or feedback? Get in touch with our engineering team directly:
                </p>
                
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#57f1db]">Core Developer</span>
                    <h4 className="text-sm font-extrabold text-white mt-0.5">Abhinandh A</h4>
                    <p className="text-[10px] text-gray-400 mt-1 leading-normal">Algorithmic Engine & Optimization Lead</p>
                  </div>
                  <a href="mailto:a6hinandh@gmail.com" className="mt-3.5 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                    <Mail size={12} />
                    <span>a6hinandh@gmail.com</span>
                  </a>
                </div>
                
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-blue-500/30 transition-all duration-300">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-400">UI/UX Architect</span>
                    <h4 className="text-sm font-extrabold text-white mt-0.5">Jason Bobby</h4>
                    <p className="text-[10px] text-gray-400 mt-1 leading-normal">Frontend Engineer & Design Lead</p>
                  </div>
                  <a href="mailto:jasonbobbym@gmail.com" className="mt-3.5 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                    <Mail size={12} />
                    <span>jasonbobbym@gmail.com</span>
                  </a>
                </div>
              </div>

              <form onSubmit={handleContactSubmit} className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col gap-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Quick Message</h3>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#122131]/60 border border-white/10 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-[#57f1db] outline-none transition-colors"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full bg-[#122131]/60 border border-white/10 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-[#57f1db] outline-none transition-colors"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Message</label>
                  <textarea 
                    rows="3"
                    className="w-full bg-[#122131]/60 border border-white/10 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-[#57f1db] outline-none transition-colors resize-none"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-[#57f1db] to-[#4fdbc8] text-[#051424] font-bold py-2.5 rounded-lg text-xs mt-1 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_10px_rgba(87,241,219,0.15)]"
                >
                  <Send size={12} />
                  <span>{isSubmitting ? "Sending..." : "Send Message"}</span>
                </button>
              </form>
            </div>
          </div>
        )}
        
        {type === "language" && (
          <div className="modal-inner-content text-left items-start w-full">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="modal-header-icon text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 mb-0">
                <Languages size={28} />
              </div>
              <h2 className="mb-0 text-2xl font-extrabold text-white">Language / Region</h2>
            </div>
            
            <div className="flex flex-col gap-4 mt-4 text-left border-t border-white/10 pt-5 w-full">
              <p className="text-xs text-gray-300 leading-relaxed">
                Currently active locale environment for formatting, currency, and language translations. The Timetable Generator defaults to United States English to ensure international compatibility.
              </p>
              
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-[#57f1db]/30 w-full hover:border-[#57f1db]/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#57f1db]/10 rounded-lg text-[#57f1db]">
                      <Globe size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">English (US)</div>
                      <div className="text-[10px] text-gray-400">System formatting and solver labels</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#57f1db] font-bold uppercase tracking-wider bg-[#57f1db]/10 px-2 py-0.5 rounded border border-[#57f1db]/20">Active</span>
                </div>

                <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-xl border border-white/5 w-full opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                      <Languages size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-300">Spanish (ES)</div>
                      <div className="text-[10px] text-gray-500">Español traducción</div>
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">Coming Soon</span>
                </div>

                <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-xl border border-white/5 w-full opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                      <Languages size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-300">French (FR)</div>
                      <div className="text-[10px] text-gray-500">Français traducción</div>
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {type === "credits" && (
          <div className="modal-inner-content text-left items-start w-full">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="modal-header-icon text-amber-400 bg-amber-500/5 border border-amber-500/10 mb-0">
                <Users size={28} />
              </div>
              <h2 className="mb-0 text-2xl font-extrabold text-white">Credits & Assistance</h2>
            </div>
            
            <div className="flex flex-col gap-4 mt-4 text-left border-t border-white/10 pt-5 w-full">
              <p className="text-xs text-gray-300 leading-relaxed">
                This project is designed and engineered as a collaborative development project. We are passionate about making complex administrative scheduling tasks simple and error-free.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#57f1db] uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={12} />
                    <span>Development Team</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-[#57f1db]/30 transition-all">
                      <strong className="text-[#57f1db] block text-[9px] uppercase tracking-wider font-extrabold">Algorithms & Solving</strong>
                      <h4 className="text-sm font-extrabold text-white mt-0.5">Abhinandh A</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Core Python Solver Engine Lead</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:border-blue-400/30 transition-all">
                      <strong className="text-blue-400 block text-[9px] uppercase tracking-wider font-extrabold">Frontend & Styling</strong>
                      <h4 className="text-sm font-extrabold text-white mt-0.5">Jason Bobby</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">UI/UX Architect & Developer</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#4fdbc8] uppercase tracking-widest flex items-center gap-1.5">
                    <Settings size={12} />
                    <span>Technology Stack</span>
                  </h4>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2.5 text-xs text-gray-300">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="font-semibold text-white">Solver Engine</span>
                      <span className="text-[10px] text-gray-400 font-mono">OR-Tools CP-SAT</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="font-semibold text-white">Frontend Core</span>
                      <span className="text-[10px] text-gray-400 font-mono">React v19 & Vite</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="font-semibold text-white">Styling System</span>
                      <span className="text-[10px] text-gray-400 font-mono">Tailwind CSS</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">Animations</span>
                      <span className="text-[10px] text-gray-400 font-mono">GSAP Engine</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      className="w-full bg-gradient-to-r from-[#57f1db] to-[#4fdbc8] text-[#051424] font-bold py-2.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 text-xs shadow-[0_4px_10px_rgba(87,241,219,0.2)]"
                      onClick={() => {
                        handleClose();
                        navigate("/guide");
                      }}
                    >
                      Visit Help Guide
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(".bg-glow-blob-1",
      { opacity: 0, scale: 0.8 },
      { opacity: 0.45, scale: 1, duration: 2.0 }
    );

    tl.fromTo(".bg-glow-blob-2",
      { opacity: 0, scale: 0.8 },
      { opacity: 0.35, scale: 1, duration: 2.0 },
      "-=1.8"
    );

    tl.fromTo(".hero-title-segment", 
      { opacity: 0, y: 40 }, 
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.15 },
      "-=1.5"
    );

    tl.fromTo(".hero-subtitle", 
      { opacity: 0, y: 20 }, 
      { opacity: 1, y: 0, duration: 0.7 },
      "-=0.6"
    );

    tl.fromTo(".hero-actions button", 
      { opacity: 0, y: 15 }, 
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.15 },
      "-=0.5"
    );

    tl.fromTo(".hero-graphic-card", 
      { opacity: 0, scale: 0.92, y: 20 }, 
      { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "back.out(1.2)" },
      "-=0.8"
    );

    // Subtle drift for the hero card widget
    gsap.to(".hero-graphic-card", {
      y: "-=10",
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    // Ambient glow drift
    gsap.to(".bg-glow-blob-1", {
      x: "+=60",
      y: "+=40",
      duration: 10,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    gsap.to(".bg-glow-blob-2", {
      x: "-=80",
      y: "-=30",
      duration: 14,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

  }, []);

  return (
    <div className="dark-gradient-bg min-h-screen relative overflow-hidden">
      <div className="bg-glow-blob bg-glow-blob-1"></div>
      <div className="bg-glow-blob bg-glow-blob-2"></div>

      <FloatingInstruments />

      <div className="container mx-auto px-6 relative z-10">
        <div className="row pt-5 items-center">
          <div className="col">
            <div className="hero-text-container text-left">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#57f1db]/10 text-[#57f1db] font-semibold text-xs mb-6 border border-[#57f1db]/20 uppercase tracking-widest">
                AI-Powered Scheduling Engine
              </span>
              <h1 className="hero-title">
                <span className="hero-title-segment block">Generate School</span>
                <span className="hero-title-segment block gradient-text">Timetables</span>
                <span className="hero-title-segment block">Effortlessly</span>
              </h1>
              
              <h3 className="hero-subtitle">
                Create mathematically optimized class schedules with our intelligent solver algorithm.
                Save hours of manual alignment work and eliminate scheduling conflicts with
                our professional-grade generator. Built as a free, open tool to simplify your administrative workflow.
              </h3>

              <div className="hero-actions">
                <button
                  className="btn-classic-primary"
                  onClick={() => navigate(isSignedIn ? "/dashboard" : "/login")}
                >
                  <span>Get Started Now</span>
                  <ArrowRight size={18} />
                </button>
                
                <button
                  className="btn-classic-secondary"
                  onClick={() => navigate("/guide")}
                >
                  <span>Learn How It Works</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="col flex justify-center items-center">
            {/* Classy Visual Preview of Solver */}
            <div className="hero-graphic-card w-full max-w-[460px] glass-panel rounded-[28px] p-6 relative overflow-hidden shadow-2xl border border-white/10 group z-10">
              <div className="absolute inset-0 calendar-grid-line opacity-15"></div>
              
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  </div>
                  <span className="text-xs font-semibold text-[#57f1db] flex items-center gap-1.5">
                    <Sparkles size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
                    <span>Optimization Score: 98%</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-24 rounded-2xl bg-[#57f1db]/5 border border-[#57f1db]/20 p-3.5 flex flex-col justify-between hover:translate-y-[-3px] hover:border-[#57f1db]/40 hover:bg-[#57f1db]/10 transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-[#57f1db] tracking-tight">Grade 10-A</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase bg-white/5 px-2 py-0.5 rounded-md border border-white/5">MON</span>
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold text-white">Mathematics</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Users size={10} /> Room 302 • Mr. Jason
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-24 rounded-2xl bg-[#4fdbc8]/5 border border-[#4fdbc8]/20 p-3.5 flex flex-col justify-between hover:translate-y-[-3px] hover:border-[#4fdbc8]/40 hover:bg-[#4fdbc8]/10 transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-[#4fdbc8] tracking-tight">Grade 12-B</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase bg-white/5 px-2 py-0.5 rounded-md border border-white/5">TUE</span>
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold text-white">Physics Lab</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Users size={10} /> Lab B • Dr. Bobby
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-24 rounded-2xl bg-[#ffb875]/5 border border-[#ffb875]/20 p-3.5 flex flex-col justify-between hover:translate-y-[-3px] hover:border-[#ffb875]/40 hover:bg-[#ffb875]/10 transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-[#ffb875] tracking-tight">Grade 9-A</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase bg-white/5 px-2 py-0.5 rounded-md border border-white/5">WED</span>
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold text-white">History</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Users size={10} /> Room 105 • Mrs. Clara
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-24 rounded-2xl bg-[#57f1db]/5 border border-[#57f1db]/20 p-3.5 flex flex-col justify-between hover:translate-y-[-3px] hover:border-[#57f1db]/40 hover:bg-[#57f1db]/10 transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-[#57f1db] tracking-tight">Grade 11-A</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase bg-white/5 px-2 py-0.5 rounded-md border border-white/5">THU</span>
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold text-white">English Lit</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Users size={10} /> Room 401 • Mr. Abhinandh
                      </p>
                    </div>
                  </div>
                </div>
                
                <SolverSimulationWidget />
              </div>
            </div>
          </div>
        </div>

        <FeaturesSection />

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-left">
              <h4 className="footer-title">Timetable Generator</h4>
              <div className="footer-links">
                <a className="footer-link" onClick={() => setActiveModal("about")}>About Us</a>
                <a className="footer-link" onClick={() => setActiveModal("terms")}>Terms & Conditions</a>
                <a className="footer-link" onClick={() => setActiveModal("contact")}>Contact Support</a>
              </div>
            </div>
            <div className="footer-right">
              <div className="footer-social">
                <div className="social-icon" onClick={() => setActiveModal("language")} title="Language Options">
                  <Globe size={18} />
                </div>
                <div className="social-icon" onClick={() => setActiveModal("credits")} title="Credits & Help">
                  <Users size={18} />
                </div>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copyright">
              © {new Date().getFullYear()} Timetable Generator. Designed for educational efficiency.
            </div>
          </div>
        </footer>

        {/* Info Modals */}
        <InfoModal 
          isOpen={activeModal !== null} 
          type={activeModal} 
          onClose={() => setActiveModal(null)} 
          navigate={navigate}
        />
      </div>
    </div>
  );
}

export default HomePage;
