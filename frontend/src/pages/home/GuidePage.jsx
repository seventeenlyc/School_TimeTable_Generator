import { 
  BookOpen, 
  Code, 
  Database, 
  Calendar, 
  Download, 
  Users, 
  Settings, 
  ArrowLeft, 
  ArrowRight,
  BookOpenCheck, 
  Layers, 
  RefreshCw, 
  Server,
  FileCheck,
  CheckCircle,
  Play,
  Activity,
  Lock,
  Sparkles,
  ArrowRightLeft
} from "lucide-react";
import "./guide-page.css";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { gsap } from "gsap";

function GuidePage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { isSignedIn } = useUser();
  const [currentChapter, setCurrentChapter] = useState(1);

  const chapters = [
    { id: 1, title: "The Quest", subtitle: "The Scheduling Problem" },
    { id: 2, title: "The Solver Magic", subtitle: "CP-SAT Logic Engine" },
    { id: 3, title: "Setting the Map", subtitle: "The 4 Core Inputs" },
    { id: 4, title: "The Flow Journey", subtitle: "Data Path Flowchart" },
    { id: 5, title: "The Reward", subtitle: "Exports & Control Power" }
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    // Initial entry animations
    gsap.fromTo(".back-btn-g", 
      { opacity: 0, x: -15 }, 
      { opacity: 1, x: 0, duration: 0.5, delay: 0.1 }
    );
    gsap.fromTo(".chapter-navigation", 
      { opacity: 0, y: -20 }, 
      { opacity: 1, y: 0, duration: 0.6, delay: 0.2 }
    );
  }, []);

  // Handle Chapter changes with direction-aware animations
  const handleChapterChange = (chapterId) => {
    if (chapterId === currentChapter) return;
    const direction = chapterId > currentChapter ? 1 : -1;
    
    // Slide current content out
    gsap.to(contentRef.current, {
      opacity: 0,
      x: -30 * direction,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        setCurrentChapter(chapterId);
        window.scrollTo(0, 0);
        // Slide new content in from the opposite direction
        gsap.fromTo(contentRef.current,
          { opacity: 0, x: 30 * direction },
          { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }
        );
      }
    });
  };

  const nextChapter = () => {
    if (currentChapter < 5) handleChapterChange(currentChapter + 1);
  };

  const prevChapter = () => {
    if (currentChapter > 1) handleChapterChange(currentChapter - 1);
  };

  return (
    <div ref={containerRef} className="dark-gradient-bgg min-h-screen relative overflow-hidden pb-24">
      {/* Background ambient glows */}
      <div className="bg-glow-blob bg-glow-blob-1"></div>
      <div className="bg-glow-blob bg-glow-blob-2"></div>

      <div className="containerg mx-auto px-6 relative z-10">
        
        {/* Back Button */}
        <div className="pt-5g pb-4 flex justify-between items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="back-btn-g inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold transition-all bg-white/5 border border-white/8 rounded-xl px-4.5 py-2.5 hover:bg-white/10 hover:border-white/20 duration-200"
          >
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>
          
          <span className="text-xs font-semibold uppercase tracking-widest text-[#57f1db] bg-[#57f1db]/10 px-3.5 py-1.5 rounded-full border border-[#57f1db]/20">
            Timetable Saga • Chapter {currentChapter} of 5
          </span>
        </div>

        {/* Story progress navigation */}
        <div className="chapter-navigation glass-panel rounded-2xl p-4 mb-8 border border-white/5 relative z-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2 hidden md:block z-0"></div>
            
            {chapters.map((chap) => (
              <button
                key={chap.id}
                onClick={() => handleChapterChange(chap.id)}
                className={`flex items-center gap-3.5 relative z-10 px-4 py-2.5 rounded-xl border transition-all duration-300 w-full md:w-auto ${
                  currentChapter === chap.id
                    ? "bg-gradient-to-r from-[#57f1db] to-[#4fdbc8] text-[#051424] border-transparent font-bold shadow-[0_0_20px_rgba(87,241,219,0.3)] scale-105"
                    : currentChapter > chap.id
                    ? "bg-white/5 border-[#57f1db]/30 text-[#57f1db] font-semibold"
                    : "bg-[#0c1929] border-white/5 text-gray-400 hover:border-white/10 hover:bg-white/3"
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentChapter === chap.id
                    ? "bg-[#051424] text-white"
                    : "bg-white/5"
                }`}>
                  {chap.id}
                </span>
                <div className="text-left">
                  <div className="text-xs font-bold leading-none">{chap.title}</div>
                  <div className={`text-[10px] opacity-75 mt-0.5 font-normal ${currentChapter === chap.id ? 'text-[#051424]' : 'text-gray-400'}`}>{chap.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Animated Chapter Content */}
        <div ref={contentRef} className="rowg text-left relative z-10 min-h-[50vh]">
          
          {/* CHAPTER 1: THE QUEST */}
          {currentChapter === 1 && (
            <div className="space-y-8 features-sectiong">
              <div className="max-w-3xl">
                <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-4">
                  Chapter 1: <span className="gradient-textg">The Scheduling Quest</span>
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed font-light">
                  Every academic year, school administrators worldwide embark on a grueling logistical mission: creating the Master Timetable. It is a quest to coordinate teachers, classes, and rooms without a single conflict.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="guide-card p-6 rounded-3xl border border-white/5 backdrop-blur-md flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                    <Users size={24} className="text-red-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Teacher Demands</h3>
                    <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                      Teachers specialize in specific subjects, have individual availability slots, and cannot teach in two places simultaneously.
                    </p>
                  </div>
                </div>

                <div className="guide-card p-6 rounded-3xl border border-white/5 backdrop-blur-md flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                    <Calendar size={24} className="text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Cohort Requirements</h3>
                    <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                      Different grades require distinct weekly period distributions, balancing core lectures (Math, English) and lab sessions.
                    </p>
                  </div>
                </div>

                <div className="guide-card p-6 rounded-3xl border border-white/5 backdrop-blur-md flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
                    <Layers size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Physical Assets</h3>
                    <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                      Limited classrooms and specialized labs must be carefully rationed, ensuring no physical room is double-booked.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-5.5 rounded-3xl border border-white/5 mt-8 max-w-4xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Activity size={28} className="text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">The Computational Nightmare</h4>
                    <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">
                      For a medium school with 30 teachers, 15 cohorts, and 5 periods/day, there are more than <strong>10^60 possible combinations</strong>. Finding a schedule that satisfies everyone is a mathematical nightmare when attempted on paper or spreadsheets.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHAPTER 2: THE BRAIN */}
          {currentChapter === 2 && (
            <div className="space-y-8 features-sectiong">
              <div className="max-w-3xl">
                <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-4">
                  Chapter 2: <span className="gradient-textg">The Solver Magic</span>
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed font-light">
                  To solve the puzzle, we built an algorithmic brain. Our system translates your requirements into a <strong>Constraint Satisfaction Problem (CSP)</strong>, which is then solved in seconds using Google OR-Tools.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="guide-card p-5.5 rounded-3xl hover:border-[#57f1db]/40">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#57f1db]/10 border border-[#57f1db]/20 flex items-center justify-center text-[#57f1db] shrink-0 mt-0.5 font-bold">
                      Ⅰ
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">The Single Allocation Law</h4>
                      <p className="text-[15px] text-gray-200 leading-relaxed mt-2 font-medium">
                        A teacher cannot be scheduled to teach in more than one classroom at the same period. The SAT solver assigns boolean values to states and rules out overlaps instantaneously.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="guide-card p-5.5 rounded-3xl hover:border-[#57f1db]/40">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#57f1db]/10 border border-[#57f1db]/20 flex items-center justify-center text-[#57f1db] shrink-0 mt-0.5 font-bold">
                      Ⅱ
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Subject Period Caps</h4>
                      <p className="text-[15px] text-gray-200 leading-relaxed mt-2 font-medium">
                        Students shouldn't have too much of one subject in a single day. The solver enforces daily caps (e.g. max 2 periods of Science per day) for balanced educational pacing.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="guide-card p-5.5 rounded-3xl hover:border-[#57f1db]/40">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#57f1db]/10 border border-[#57f1db]/20 flex items-center justify-center text-[#57f1db] shrink-0 mt-0.5 font-bold">
                      Ⅲ
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Lab Period Bundles</h4>
                      <p className="text-[15px] text-gray-200 leading-relaxed mt-2 font-medium">
                        Some subjects need uninterrupted hands-on hours. The solver automatically bundles lab lessons as double consecutive periods on the same day.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="guide-card p-5.5 rounded-3xl hover:border-[#57f1db]/40">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#57f1db]/10 border border-[#57f1db]/20 flex items-center justify-center text-[#57f1db] shrink-0 mt-0.5 font-bold">
                      Ⅳ
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Class Teacher Priority</h4>
                      <p className="text-[15px] text-gray-200 leading-relaxed mt-2 font-medium">
                        Enables morning administrative check-ins. The solver preferentially schedules the class teacher's main subject for the first period of the day.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHAPTER 3: THE SETUP */}
          {currentChapter === 3 && (
            <div className="space-y-8 features-sectiong">
              <div className="max-w-3xl">
                <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-4">
                  Chapter 3: <span className="gradient-textg">Setting the Map</span>
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed font-light">
                  Before the solver can operate, you must build the foundational map of your school. This simple 4-step wizard sets the ground rules.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
                <div className="guide-card rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 1</span>
                    <h3 className="text-base font-bold text-white mt-4 mb-2">General Settings</h3>
                    <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                      Establish the baseline constraints: name the timetable, input working days per week, and define the daily periods.
                    </p>
                  </div>
                </div>

                <div className="guide-card rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 2</span>
                    <h3 className="text-base font-bold text-white mt-4 mb-2">Classes</h3>
                    <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                      Configure your classes or grades (e.g. 10-A, 11-B) that will host individual schedules.
                    </p>
                  </div>
                </div>

                <div className="guide-card rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 3</span>
                    <h3 className="text-base font-bold text-white mt-4 mb-2">Teachers</h3>
                    <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                      Input the teaching staff, specify their main subjects, base classes, and custom constraints.
                    </p>
                  </div>
                </div>

                <div className="guide-card rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Step 4</span>
                    <h3 className="text-base font-bold text-white mt-4 mb-2">Weekly Slots</h3>
                    <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                      Assign subject quotas: specify how many hours each subject must be taught in each class per week.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHAPTER 4: THE JOURNEY */}
          {currentChapter === 4 && (
            <div className="space-y-8 features-sectiong">
              <div className="max-w-3xl">
                <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-4">
                  Chapter 4: <span className="gradient-textg">The Flow Journey</span>
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed font-light">
                  Once you click the "Generate" trigger, your school configurations embark on a coordinated journey from browser to Python engine.
                </p>
              </div>

              {/* Story flowchart */}
              <div className="workflow-sectiong bg-white/2 border border-white/5 p-6 rounded-[28px] backdrop-blur-md mt-6 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-stretch justify-between gap-3 relative">
                  
                  {/* Card 1 */}
                  <div className="workflow-card flex-1 w-full flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-md uppercase">1. Client Payload</span>
                      <h4 className="text-white font-bold text-sm mt-3">Packing Inputs</h4>
                      <p className="text-[13px] text-gray-300 mt-1.5 leading-relaxed font-medium">
                        React compiles your local wizard states into a structured JSON payload.
                      </p>
                    </div>
                  </div>

                  {/* Centered Arrow 1 */}
                  <div className="text-[#57f1db] flex items-center justify-center shrink-0 py-3 lg:py-0 select-none">
                    <ArrowRight size={20} className="rotate-90 lg:rotate-0 filter drop-shadow-[0_0_8px_rgba(87,241,219,0.3)]" />
                  </div>

                  {/* Card 2 */}
                  <div className="workflow-card flex-1 w-full flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-md uppercase">2. API Check</span>
                      <h4 className="text-white font-bold text-sm mt-3">FastAPI Sanitization</h4>
                      <p className="text-[13px] text-gray-300 mt-1.5 leading-relaxed font-medium">
                        Python handles validation. It audits teacher workloads against available slot limits to ensure feasibility.
                      </p>
                    </div>
                  </div>

                  {/* Centered Arrow 2 */}
                  <div className="text-[#57f1db] flex items-center justify-center shrink-0 py-3 lg:py-0 select-none">
                    <ArrowRight size={20} className="rotate-90 lg:rotate-0 filter drop-shadow-[0_0_8px_rgba(87,241,219,0.3)]" />
                  </div>

                  {/* Card 3 */}
                  <div className="workflow-card flex-1 w-full flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md uppercase">3. Solver Engine</span>
                      <h4 className="text-white font-bold text-sm mt-3">CP-SAT Computing</h4>
                      <p className="text-[13px] text-gray-300 mt-1.5 leading-relaxed font-medium">
                        Google OR-Tools solver runs, searching the combinations matrix to resolve constraints in milliseconds.
                      </p>
                    </div>
                  </div>

                  {/* Centered Arrow 3 */}
                  <div className="text-[#57f1db] flex items-center justify-center shrink-0 py-3 lg:py-0 select-none">
                    <ArrowRight size={20} className="rotate-90 lg:rotate-0 filter drop-shadow-[0_0_8px_rgba(87,241,219,0.3)]" />
                  </div>

                  {/* Card 4 */}
                  <div className="workflow-card flex-1 w-full flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-md uppercase">4. Return Matrix</span>
                      <h4 className="text-white font-bold text-sm mt-3">UI Grid Loading</h4>
                      <p className="text-[13px] text-gray-300 mt-1.5 leading-relaxed font-medium">
                        The solved state maps back to a grid in your browser, ready for review.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* CHAPTER 5: THE REWARD */}
          {currentChapter === 5 && (
            <div className="space-y-8 features-sectiong">
              <div className="max-w-3xl">
                <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-4">
                  Chapter 5: <span className="gradient-textg">The Reward & Control</span>
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed font-light">
                  Your timetable is complete. But the real power is in your hands: real-time editing control and instant multi-format distribution.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="guide-card p-6 rounded-3xl">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                    <ArrowRightLeft size={22} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Live Swap Checks</h3>
                  <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                    Manually swap cells in the grid. The engine validates teacher availability in the background and warns you instantly of double-bookings.
                  </p>
                </div>

                <div className="guide-card p-6 rounded-3xl">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                    <Layers size={22} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Master View</h3>
                  <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                    Filter schedules instantly: switch between individual grade layouts, specific teacher calendars, or a unified Master Grid.
                  </p>
                </div>

                <div className="guide-card p-6 rounded-3xl">
                  <div className="w-11 h-11 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4 text-green-400">
                    <Download size={22} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Export Delivery</h3>
                  <p className="text-[15px] text-gray-200 leading-relaxed font-medium">
                    Deliver outputs on demand. Export print-ready PDFs for physical notices, or export to Excel for database integrations.
                  </p>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => navigate(isSignedIn ? "/dashboard" : "/login")}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#57f1db] to-[#4fdbc8] text-[#051424] font-bold rounded-2xl text-base shadow-[0_5px_25px_rgba(87,241,219,0.35)] hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <span>Begin Your Scheduling Journey</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Chapter Navigation Controls */}
          <div className="flex justify-between items-center border-t border-white/5 pt-8 mt-12 w-full">
            <button
              onClick={prevChapter}
              disabled={currentChapter === 1}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border font-bold transition-all duration-200 ${
                currentChapter === 1
                  ? "opacity-30 cursor-not-allowed border-white/5 text-gray-500"
                  : "border-white/10 text-gray-300 hover:bg-white/5 active:scale-95"
              }`}
            >
              <ArrowLeft size={16} />
              <span>Previous Chapter</span>
            </button>

            <button
              onClick={nextChapter}
              disabled={currentChapter === 5}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all duration-200 ${
                currentChapter === 5
                  ? "opacity-30 cursor-not-allowed border-white/5 text-gray-500"
                  : "bg-white/5 border border-white/10 text-[#57f1db] hover:border-[#57f1db]/40 hover:bg-[#57f1db]/5 active:scale-95"
              }`}
            >
              <span>Next Chapter</span>
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function CpuIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 15h3" />
      <path d="M1 9h3" />
      <path d="M1 15h3" />
    </svg>
  );
}

export default GuidePage;
