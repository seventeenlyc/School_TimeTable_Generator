import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import gsap from "gsap";
import {
  CalendarDays, BookOpen, Calculator, Microscope, Palette,
  Music, Globe, Users, Settings, Mail, FileText, ArrowRight,
  Sparkles, Lock, Shuffle, X, Check, Send, ChevronRight,
  Zap, Shield, Clock, Download, Star, Menu, BarChart2,
  CheckCircle2, AlertCircle, Coffee, Layers, GitBranch, Terminal
} from "lucide-react";
import SideRays from "../components/SideRays";
import BorderGlow from "../components/BorderGlow";

// ─── Floating background orbs ────────────────────────────────────────────────
function FloatingOrbs() {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute top-[8%] left-[3%] w-[550px] h-[550px] rounded-full opacity-[0.08]"
        style={{ background: "radial-gradient(circle, #57f1db 0%, transparent 70%)", filter: "blur(90px)", animation: "drift1 24s ease-in-out infinite alternate" }} />
      <div className="absolute bottom-[10%] right-[2%] w-[680px] h-[680px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)", filter: "blur(110px)", animation: "drift2 28s ease-in-out infinite alternate" }} />
      <div className="absolute top-[40%] left-[35%] w-[420px] h-[420px] rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle, #0284c7 0%, transparent 70%)", filter: "blur(90px)", animation: "drift3 20s ease-in-out infinite alternate" }} />
    </div>
  );
}

// ─── Interactive Timetable Dashboard (Hero Graphic) ──────────────────────────
const SUBJECTS = [
  { name: "Mathematics", color: "#2dd4bf", teacher: "Mr. Jason", room: "Rm 302" },
  { name: "Physics Lab", color: "#a78bfa", teacher: "Dr. Bobby", room: "Lab B" },
  { name: "History", color: "#fb923c", teacher: "Mrs. Clara", room: "Rm 105" },
  { name: "English Lit", color: "#38bdf8", teacher: "Mr. Abhinandh", room: "Rm 401" },
  { name: "Chemistry", color: "#f43f5e", teacher: "Dr. Priya", room: "Lab A" },
  { name: "Computer Sci", color: "#818cf8", teacher: "Ms. Anita", room: "Lab C" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PERIODS = ["P1", "P2", "P3", "P4"];

function LiveTimetableDashboard() {
  const [activeTab, setActiveTab] = useState("solve"); // solve | conflict | workload
  const [filledSlots, setFilledSlots] = useState(new Map());
  const [pct, setPct] = useState(0);
  const [isSolving, setIsSolving] = useState(true);
  
  // Conflict simulation states
  const [conflictStep, setConflictStep] = useState(0); // 0: clear, 1: conflict, 2: resolved
  
  // Workload states
  const [workloads, setWorkloads] = useState([
    { name: "Mr. Jason", hours: 4, max: 6, color: "#2dd4bf" },
    { name: "Dr. Bobby", hours: 6, max: 6, color: "#a78bfa" },
    { name: "Mr. Abhinandh", hours: 3, max: 6, color: "#38bdf8" },
    { name: "Mrs. Clara", hours: 5, max: 6, color: "#fb923c" },
  ]);

  const timerRef = useRef(null);

  // Simulation Mode 1: Auto-Solving
  const runAutoSolver = useCallback(() => {
    setFilledSlots(new Map());
    setPct(0);
    setIsSolving(true);
    let currentPct = 0;
    
    const fillNext = () => {
      if (currentPct < 100) {
        currentPct += 5;
        setPct(currentPct);
        
        // Add random slots
        setFilledSlots(prev => {
          const next = new Map(prev);
          const randDay = Math.floor(Math.random() * DAYS.length);
          const randPeriod = Math.floor(Math.random() * PERIODS.length);
          const key = `${randDay}-${randPeriod}`;
          const subj = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
          next.set(key, subj);
          return next;
        });
        
        timerRef.current = setTimeout(fillNext, 80);
      } else {
        setIsSolving(false);
        // Pause at completion, then restart
        timerRef.current = setTimeout(() => {
          runAutoSolver();
        }, 3000);
      }
    };

    fillNext();
  }, []);

  // Conflict Simulation Timer Loop
  useEffect(() => {
    if (activeTab === "solve") {
      runAutoSolver();
    } else if (activeTab === "conflict") {
      setConflictStep(1);
      const step1 = setTimeout(() => {
        setConflictStep(2); // resolve conflict
      }, 2500);
      const loop = setTimeout(() => {
        setConflictStep(1); // restart loop
      }, 5500);

      return () => {
        clearTimeout(step1);
        clearTimeout(loop);
      };
    } else {
      // Animate workload bars leveling out
      const t = setTimeout(() => {
        setWorkloads([
          { name: "Mr. Jason", hours: 5, max: 6, color: "#2dd4bf" },
          { name: "Dr. Bobby", hours: 5, max: 6, color: "#a78bfa" },
          { name: "Mr. Abhinandh", hours: 5, max: 6, color: "#38bdf8" },
          { name: "Mrs. Clara", hours: 5, max: 6, color: "#fb923c" },
        ]);
      }, 1500);
      return () => clearTimeout(t);
    }
    
    return () => clearTimeout(timerRef.current);
  }, [activeTab, runAutoSolver]);

  return (
    <BorderGlow
      borderRadius={24}
      backgroundColor="rgba(10, 18, 36, 0.55)"
      glowColor="170 80 50"
      style={{
        width: "100%",
        maxWidth: 480,
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(87, 241, 219, 0.15)",
        boxShadow: "0 40px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "24px", width: "100%", height: "100%", position: "relative" }}>
      {/* Mesh Overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.08,
        backgroundImage: "linear-gradient(rgba(87,241,219,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(87,241,219,0.3) 1px,transparent 1px)",
        backgroundSize: "24px 24px",
        pointerEvents: "none",
      }} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, background: "rgba(0,0,0,0.35)", padding: 4, borderRadius: 12, marginBottom: 18, border: "1px solid rgba(255,255,255,0.04)" }}>
        {["solve", "conflict", "workload"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              // Reset state variations
              if (tab === "workload") {
                setWorkloads([
                  { name: "Mr. Jason", hours: 4, max: 6, color: "#2dd4bf" },
                  { name: "Dr. Bobby", hours: 6, max: 6, color: "#a78bfa" },
                  { name: "Mr. Abhinandh", hours: 3, max: 6, color: "#38bdf8" },
                  { name: "Mrs. Clara", hours: 5, max: 6, color: "#fb923c" },
                ]);
              }
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              background: activeTab === tab ? "rgba(87, 241, 219, 0.12)" : "transparent",
              color: activeTab === tab ? "#57f1db" : "rgba(212, 228, 250, 0.5)",
              transition: "all 0.2s ease",
            }}
          >
            {tab === "solve" ? "Auto Solver" : tab === "conflict" ? "Conflict Sim" : "Workload Balancing"}
          </button>
        ))}
      </div>

      {/* Mode 1: Auto Solving Grid */}
      {activeTab === "solve" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#57f1db", display: "flex", alignItems: "center", gap: 6 }}>
              <Shuffle size={12} className={isSolving ? "animate-spin" : ""} style={{ animationDuration: "3s" }} />
              <span>OR-Tools Engine Running</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>{pct}%</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {DAYS.map((day, di) => (
              <div key={day} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.3)", textAlign: "center", textTransform: "uppercase" }}>{day}</div>
                {PERIODS.map((period, pi) => {
                  const key = `${di}-${pi}`;
                  const slot = filledSlots.get(key);
                  return (
                    <div
                      key={key}
                      style={{
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${slot ? slot.color + "35" : "rgba(255,255,255,0.05)"}`,
                        background: slot ? `${slot.color}10` : "rgba(255,255,255,0.01)",
                        transition: "all 0.2s ease",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: "4px 6px",
                        overflow: "hidden",
                        position: "relative"
                      }}
                      className="group/grid-slot"
                    >
                      {slot ? (
                        <>
                          <div style={{ fontSize: 8, fontWeight: 800, color: slot.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slot.name}</div>
                          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden" }}>{slot.room}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.12)", textAlign: "center" }}>{period}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.03)", borderRadius: 999, height: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #57f1db, #38bdf8)", transition: "width 0.1s linear" }} />
          </div>
        </div>
      )}

      {/* Mode 2: Conflict Resolution Simulation */}
      {activeTab === "conflict" && (
        <div style={{ minHeight: 236, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              Constraint Validation Loop:
            </div>
            
            <div style={{ position: "relative", background: "rgba(0,0,0,0.3)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Row 1: Teacher A */}
              <div style={{ display: "flex", justifyBetween: "center", alignItems: "center" }}>
                <div style={{ width: 100, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Mr. Jason</div>
                <div style={{ flex: 1, display: "flex", gap: 6 }}>
                  <div style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }} />
                  <div style={{
                    flex: 1, height: 32, borderRadius: 8,
                    border: conflictStep === 1 ? "1px solid #f43f5e" : "1px solid #2dd4bf",
                    background: conflictStep === 1 ? "rgba(244, 63, 94, 0.15)" : "rgba(45, 212, 191, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800,
                    color: conflictStep === 1 ? "#f43f5e" : "#2dd4bf", transition: "all 0.3s ease"
                  }}>
                    Math (Grade 9)
                  </div>
                  <div style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }} />
                </div>
              </div>

              {/* Row 2: Teacher B */}
              <div style={{ display: "flex", justifyBetween: "center", alignItems: "center" }}>
                <div style={{ width: 100, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Dr. Bobby</div>
                <div style={{ flex: 1, display: "flex", gap: 6 }}>
                  <div style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }} />
                  
                  {/* The colliding period slot */}
                  {conflictStep === 1 && (
                    <div style={{
                      flex: 1, height: 32, borderRadius: 8, border: "1px solid #f43f5e", background: "rgba(244, 63, 94, 0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#f43f5e",
                      animation: "pulse 1s infinite", transition: "all 0.3s ease"
                    }}>
                      Physics (Grade 9)
                    </div>
                  )}

                  {conflictStep === 2 && (
                    <div style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)", transition: "all 0.3s ease" }} />
                  )}

                  {/* Shifting destination */}
                  <div style={{
                    flex: 1, height: 32, borderRadius: 8,
                    border: conflictStep === 2 ? "1px solid #a78bfa" : "1px solid rgba(255,255,255,0.05)",
                    background: conflictStep === 2 ? "rgba(167, 139, 250, 0.15)" : "rgba(255,255,255,0.01)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800,
                    color: conflictStep === 2 ? "#a78bfa" : "transparent", transition: "all 0.3s ease"
                  }}>
                    Physics (Grade 9)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: conflictStep === 1 ? "rgba(244,63,94,0.08)" : "rgba(45,212,191,0.08)", border: `1px solid ${conflictStep === 1 ? "#f43f5e30" : "#2dd4bf30"}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, transition: "all 0.3s ease" }}>
            {conflictStep === 1 ? (
              <>
                <AlertCircle size={16} style={{ color: "#f43f5e", flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#f43f5e" }}>Conflict: Grade 9 has overlapping period at Period 2</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} style={{ color: "#2dd4bf", flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#2dd4bf" }}>Solved: Shifted Dr. Bobby to Period 3 to resolve clash</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Workload Balancing */}
      {activeTab === "workload" && (
        <div style={{ minHeight: 236, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
              Distribute Teaching Load Fairly:
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {workloads.map((wl) => {
                const percentage = (wl.hours / wl.max) * 100;
                return (
                  <div key={wl.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(212, 228, 250, 0.75)" }}>{wl.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: wl.color, fontFamily: "monospace" }}>{wl.hours} hrs / day</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 4, height: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{
                        height: "100%", width: `${percentage}%`, background: wl.color, borderRadius: 4,
                        transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: `0 0 8px ${wl.color}40`
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: "rgba(87,241,219,0.06)", border: "1px solid rgba(87,241,219,0.15)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={16} style={{ color: "#57f1db", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#57f1db" }}>Workload standard deviation reduced to 0.0 (Perfect distribution)</span>
          </div>
        </div>
      )}
      </div>
    </BorderGlow>
  );
}

// ─── Stats strip data ──────────────────────────────────────────────────────────
const STATS = [
  { value: "< 2 min", label: "Solver execution time" },
  { value: "100%", label: "Conflict-free guarantee" },
  { value: "0 cost", label: "Open educational project" },
  { value: "CP-SAT", label: "Google OR-Tools solver" },
];

// ─── Step-by-Step workflow data ───────────────────────────────────────────────
const STEPS = [
  {
    num: "01",
    icon: <Layers size={20} />, 
    title: "Define Constraints",
    body: "List your teachers, classrooms, subjects, and specific conditions. Specify availability matrices and consecutive teaching caps.",
    color: "#57f1db",
  },
  {
    num: "02",
    icon: <GitBranch size={20} />,
    title: "Resolve Variables",
    body: "Google's OR-Tools SAT optimizer evaluates millions of combinations, ensuring mathematical correctness and zero overlaps.",
    color: "#a78bfa",
  },
  {
    num: "03",
    icon: <Download size={20} />,
    title: "Export & Synchronize",
    body: "Render structured timetables class-wise or teacher-wise. Export instantly to PDF or Excel formats with professional templates.",
    color: "#fb923c",
  },
];

// ─── Custom Asymmetric Feature Grid ───────────────────────────────────────────
function FeatureGrid() {
  const [logs, setLogs] = useState([
    "Initializing CP-SAT Solver model...",
    "Defining boolean variables for 120 slots...",
    "Injecting classroom uniqueness constraints...",
    "Injecting teacher single-booking matrices..."
  ]);

  useEffect(() => {
    const logInterval = setInterval(() => {
      const solverLogs = [
        "Scanning teacher workload matrices...",
        "Validating consecutiveness rules...",
        "Branching variables: node depth 24...",
        "Sub-solver found feasible solution (cost=0)...",
        "Validating Class Teacher priority constraint...",
        "CP-SAT engine terminated successfully.",
        "Timetable matrix constructed: 100% optimized.",
        "Initializing CP-SAT Solver model..."
      ];
      setLogs((prev) => {
        const next = [...prev];
        next.shift();
        const nextLog = solverLogs[Math.floor(Math.random() * solverLogs.length)];
        next.push(nextLog);
        return next;
      });
    }, 2000);

    return () => clearInterval(logInterval);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* Card 1: Double Width - Real-time SAT solver log demo */}
      <BorderGlow
        className="feature-card"
        borderRadius={20}
        backgroundColor="rgba(10, 18, 36, 0.45)"
        glowColor="170 80 50"
        colors={['#57f1db', '#38bdf8', '#7c3aed']}
        style={{
          gridColumn: "span 8",
          border: "1px solid rgba(87,241,219,0.08)",
          transition: "all 0.3s ease",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ padding: 30, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 20, height: "100%", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
            <div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(87,241,219,0.08)", border: "1px solid rgba(87,241,219,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#57f1db", marginBottom: 16 }}>
                <Terminal size={20} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Bespoke SAT Constraint Optimization</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, maxWidth: 440, margin: 0 }}>
                Say goodbye to simple shuffling. We translate your constraints into linear inequality vectors solved by Google's Operations Research solver.
              </p>
            </div>
            
            {/* Active solver terminal */}
            <div style={{
              width: 260,
              background: "#030712",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "12px",
              fontFamily: "monospace",
              fontSize: 9,
              color: "#4ade80",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              flexShrink: 0
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#eab308" }} />
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8, marginLeft: 4 }}>Solver Logs</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: i === 3 ? 1 : 0.65 }}>
                    <span style={{ color: "#38bdf8", marginRight: 4 }}>&gt;</span>{log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 16 }}>
            {["Concurrences Resolved", "Daily Class Caps", "No Overlaps", "Lab Blocks"].map(label => (
              <span key={label} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#57f1db", background: "rgba(87,241,219,0.06)", border: "1px solid rgba(87,241,219,0.15)", borderRadius: 6, padding: "4px 8px" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </BorderGlow>

      {/* Card 2: Single Width - Secure authentication */}
      <BorderGlow
        className="feature-card"
        borderRadius={20}
        backgroundColor="rgba(10, 18, 36, 0.45)"
        glowColor="258 80 75"
        colors={['#a78bfa', '#38bdf8', '#7c3aed']}
        style={{
          gridColumn: "span 4",
          border: "1px solid rgba(167,139,250,0.08)",
          transition: "all 0.3s ease"
        }}
      >
        <div style={{ padding: 30, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", width: "100%" }}>
          <div>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa", marginBottom: 16 }}>
              <Lock size={20} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Clerk Sandbox Encryption</h3>
            <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
              Your school rosters and teacher schedules are isolated with end-to-end sandbox security via Clerk authentication.
            </p>
          </div>
          <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sandbox State: Isolated ✓
          </div>
        </div>
      </BorderGlow>

      {/* Card 3: Single Width - Availability */}
      <BorderGlow
        className="feature-card"
        borderRadius={20}
        backgroundColor="rgba(10, 18, 36, 0.45)"
        glowColor="28 95 60"
        colors={['#fb923c', '#fb7185', '#7c3aed']}
        style={{
          gridColumn: "span 4",
          border: "1px solid rgba(251,146,60,0.08)",
          transition: "all 0.3s ease"
        }}
      >
        <div style={{ padding: 30, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", width: "100%" }}>
          <div>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fb923c", marginBottom: 16 }}>
              <Clock size={20} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Bespoke Availability Matrices</h3>
            <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
              Accommodate part-time staff, administration duties, or custom research hours. The solver automatically blocks off unavailable periods.
            </p>
          </div>
          <div style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Real-time checkouts
          </div>
        </div>
      </BorderGlow>

      {/* Card 4: Double Width - Workload charts */}
      <BorderGlow
        className="feature-card"
        borderRadius={20}
        backgroundColor="rgba(10, 18, 36, 0.45)"
        glowColor="142 70 45"
        colors={['#4ade80', '#2dd4bf', '#38bdf8']}
        style={{
          gridColumn: "span 8",
          border: "1px solid rgba(74,222,128,0.08)",
          transition: "all 0.3s ease",
          position: "relative"
        }}
      >
        <div style={{ padding: 30, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 20, height: "100%", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" }}>
            <div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", marginBottom: 16 }}>
                <BarChart2 size={20} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Automated Workload Analytics</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, maxWidth: 460, margin: 0 }}>
                Avoid burnout. View distributed hours across classes and teaching staffs instantly. Perfect parity ensures teachers are scheduled equitably.
              </p>
            </div>

            {/* Mini Chart Mockup */}
            <div style={{
              width: 240,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: 12,
              flexShrink: 0
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase" }}>Workload Distribution</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { name: "Grade 9", pct: "75%", color: "#2dd4bf" },
                  { name: "Grade 10", pct: "88%", color: "#a78bfa" },
                  { name: "Grade 11", pct: "60%", color: "#fb923c" },
                  { name: "Grade 12", pct: "80%", color: "#4ade80" }
                ].map(item => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", width: 44 }}>{item.name}</span>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", height: 6, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ background: item.color, height: "100%", width: item.pct }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Perfect Parity Engine
          </div>
        </div>
      </BorderGlow>
    </div>
  );
}

// ─── Comparison Row ──────────────────────────────────────────────────────────
const COMPARE = [
  { feature: "Zero scheduling conflicts", manual: false, us: true },
  { feature: "Automatic constraint resolution", manual: false, us: true },
  { feature: "Generates in under 2 minutes", manual: false, us: true },
  { feature: "Part-time scheduling matrices", manual: false, us: true },
  { feature: "Dynamic post-generation edits", manual: false, us: true },
  { feature: "Completely open & free", manual: true, us: true },
];

// ─── FAQ Accordion ─────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Is the Timetable Generator truly free?",
    a: "Yes — completely free and open. We built this as an administrative utility for schools, colleges, and educational hubs worldwide.",
  },
  {
    q: "How many constraints can the solver handle?",
    a: "Virtually infinite. Because the engine is backed by Google OR-Tools CP-SAT, it resolves highly complex scheduling puzzles with 100+ teachers, room locks, and daily period configurations.",
  },
  {
    q: "What if there is no mathematical solution?",
    a: "Our dashboard highlights conflicting variables in red, letting you know exactly which teacher or class constraint is causing the bottleneck.",
  },
  {
    q: "Is Clerk sandbox data secure?",
    a: "Yes, data is sandboxed and stored securely. Configurations are never shared or indexed.",
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(o => !o)}
      style={{
        width: "100%", textAlign: "left", background: open ? "rgba(87,241,219,0.04)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${open ? "rgba(87,241,219,0.2)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 14, padding: "16px 20px", cursor: "pointer",
        transition: "all 0.2s ease", display: "block", outline: "none"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", lineHeight: 1.4 }}>{q}</span>
        <ChevronRight size={15} style={{ color: "#57f1db", flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s ease" }} />
      </div>
      {open && (
        <p style={{ marginTop: 10, fontSize: 13.5, color: "#64748b", lineHeight: 1.7, marginBottom: 0 }}>{a}</p>
      )}
    </button>
  );
}

// ─── Legal & Contact Modals ───────────────────────────────────────────────────
function Modal({ isOpen, type, onClose, navigate }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const submit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) { toast.error("Please fill in all fields"); return; }
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you shortly.");
      setName(""); setEmail(""); setMessage(""); setSubmitting(false);
      onClose();
    }, 1200);
  };

  const ModalContent = () => {
    if (type === "about") return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ padding: 12, background: "rgba(87,241,219,0.08)", border: "1px solid rgba(87,241,219,0.2)", borderRadius: 14 }}>
            <BookOpen size={24} style={{ color: "#57f1db" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>About the Project</h2>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="max-sm:grid-cols-1">
          <div>
            <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.7, marginBottom: 14 }}>
              Timetable Generator was built as a human-centric solution to a complex administrative task. We turn scheduling tables from weekly headaches into clean, optimized workflows.
            </p>
            <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.7, margin: 0 }}>
              Backed by Google's Operations Research solver (OR-Tools CP-SAT), the solver resolves constraints automatically, generating conflict-free layouts in minutes.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[{ icon: <Lock size={15} />, title: "Secure Sandbox", body: "Sandboxed configurations via Clerk.", color: "#57f1db" },
              { icon: <Sparkles size={15} />, title: "CP-SAT Optimization", body: "100% constraint precision.", color: "#fb923c" }].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14, display: "flex", gap: 12 }}>
                <span style={{ color: item.color, marginTop: 2, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{item.title}</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    if (type === "terms") return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ padding: 12, background: "rgba(79,219,200,0.08)", border: "1px solid rgba(79,219,200,0.2)", borderRadius: 14 }}>
            <FileText size={24} style={{ color: "#4fdbc8" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>Terms & Conditions</h2>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, maxHeight: 340, overflowY: "auto" }}>
          {[["Service Agreement", "This generator is provided as a free utility for educational institutions worldwide to ensure equitable access to modern scheduling tools."],
            ["Data Integrity & Control", "All input configurations are sandboxed and encrypted. We do not sell or share institutional data under any circumstances."],
            ["Solver Limitations", "Schedules are mathematically optimized. We recommend administrative validation before official school deployment."],
            ["Acceptable Use", "Automated load-testing or denial-of-service attempts against solver endpoints are prohibited."]
          ].map(([title, body], i) => (
            <div key={i} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Check size={12} style={{ color: "#4fdbc8", flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#4fdbc8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{`${i + 1}. ${title}`}</span>
              </div>
              <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    );

    if (type === "contact") return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ padding: 12, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 14 }}>
            <Mail size={24} style={{ color: "#a78bfa" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>Contact Support</h2>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.7, margin: 0 }}>
            Need support or have custom constraint inquiries? Reach out to the core development team directly at our support channels:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="max-sm:grid-cols-1">
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Support Roster A</p>
              <a href="mailto:jasonbobbym@gmail.com" style={{ fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none" }} className="hover:text-[#57f1db]">jasonbobbym@gmail.com</a>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Support Roster B</p>
              <a href="mailto:a6hinandh@gmail.com" style={{ fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none" }} className="hover:text-[#a78bfa]">a6hinandh@gmail.com</a>
            </div>
          </div>
        </div>
      </div>
    );

    if (type === "language") return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ padding: 12, background: "rgba(87,241,219,0.08)", border: "1px solid rgba(87,241,219,0.2)", borderRadius: 14 }}>
            <Globe size={24} style={{ color: "#57f1db" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>Supported Language</h2>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
          <p style={{ fontSize: 14.5, color: "#d4e4fa", lineHeight: 1.7, margin: 0 }}>
            The Timetable Generator currently only supports <strong>English (US/UK)</strong> for the workspace user interface, PDF exports, and Excel spreadsheets.
          </p>
        </div>
      </div>
    );

    if (type === "credits") return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ padding: 12, background: "rgba(87,241,219,0.08)", border: "1px solid rgba(87,241,219,0.2)", borderRadius: 14 }}>
            <Users size={24} style={{ color: "#57f1db" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>Meet the Creators</h2>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
            This Timetable Generator is a combined vision to automate complex school administration scheduling.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="max-sm:grid-cols-1">
            {/* Author 1 */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Algorithm & Solver</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Abhinandh A</h3>
              <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                Worked on the backend API development, CP-SAT constraint modelling, and data structure mapping logic.
              </p>
            </div>
            
            {/* Author 2 */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Design & Workspace</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Jason Bobby</h3>
              <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                Worked on the frontend client interface, interactive dashboard components, and layout styling design.
              </p>
            </div>
          </div>
        </div>
      </div>
    );

    return null;
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(3,7,18,0.85)", backdropFilter: "blur(16px)", zIndex: 9999, display: "grid", placeItems: "center", padding: 24 }}
      onClick={onClose}
    >
      <BorderGlow
        borderRadius={24}
        backgroundColor="rgba(10,18,36,0.98)"
        glowColor="170 80 50"
        style={{
          width: "100%",
          maxWidth: 740,
          border: "1px solid rgba(87,241,219,0.18)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(87,241,219,0.05)"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: 32, width: "100%", height: "100%", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", zIndex: 10 }}>
            <X size={16} />
          </button>
          <ModalContent />
        </div>
      </BorderGlow>
    </div>
  );
}


// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const [activeModal, setActiveModal] = useState(null);

  const heroHeadingRef = useRef(null);
  const heroSubRef = useRef(null);
  const heroBtnsRef = useRef(null);
  const heroSocialRef = useRef(null);
  const heroDashRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(heroHeadingRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.85 })
      .fromTo(heroSubRef.current,     { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.5")
      .fromTo(heroBtnsRef.current,    { opacity: 0, y: 20, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6 }, "-=0.45")
      .fromTo(heroSocialRef.current,  { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.35")
      .fromTo(heroDashRef.current,    { opacity: 0, x: 40, scale: 0.95 }, { opacity: 1, x: 0, scale: 1, duration: 0.9 }, "-=0.8");
  }, []);

  const ctaPath = isSignedIn ? "/dashboard" : "/login";

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse 100% 60% at 15% 10%, #081225 0%, #030814 60%, #02050b 100%)",
      color: "#d4e4fa",
      fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
      overflowX: "hidden",
      position: "relative",
    }}>
      <style>{`
        @keyframes drift1 { from { transform: translate(0,0); } to { transform: translate(70px,50px); } }
        @keyframes drift2 { from { transform: translate(0,0); } to { transform: translate(-90px,-40px); } }
        @keyframes drift3 { from { transform: translate(0,0); } to { transform: translate(50px,-60px); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        .fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hero-card-float { animation: float 6s ease-in-out infinite; }
        .nav-link { font-size:13.5px; color:rgba(212,228,250,0.65); text-decoration:none; transition:all 0.2s; font-weight:600; letter-spacing:0.02em; }
        .nav-link:hover { color:#57f1db; text-shadow:0 0 10px rgba(87,241,219,0.3); }
        .feature-card:hover { transform:translateY(-5px) !important; border-color:rgba(87,241,219,0.22) !important; box-shadow:0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(87,241,219,0.03) !important; }
        .step-card:hover { border-color:rgba(87,241,219,0.18) !important; transform:translateY(-3px) !important; }
        .cta-btn:hover { transform:translateY(-1px); box-shadow:0 12px 36px rgba(87,241,219,0.35) !important; filter:brightness(1.05); }
        .cta-btn:active { transform:translateY(1px); }
        .outline-btn:hover { background:rgba(255,255,255,0.06) !important; border-color:rgba(255,255,255,0.2) !important; }
      `}</style>

      <FloatingOrbs />
      <div style={{ position: "absolute", top: 0, right: 0, width: "100%", height: "100%", minHeight: "100vh", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <SideRays
          speed={1.0}
          rayColor1="#57f1db"
          rayColor2="#7c3aed"
          intensity={1.2}
          spread={2.0}
          origin="top-right"
          tilt={-10}
          saturation={1.5}
          blend={0.65}
          falloff={1.5}
          opacity={0.35}
        />
      </div>

      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px clamp(20px,6vw,80px) 40px", maxWidth: 1450, margin: "0 auto", display: "flex", alignItems: "center", gap: "50px", flexWrap: "wrap", minHeight: "80vh" }}>
        {/* Left Copy */}
        <div style={{ flex: "1 1 480px", minWidth: 320 }}>
          

          <h1 ref={heroHeadingRef} style={{ opacity: 0, fontSize: "clamp(2.5rem,5.5vw,4rem)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.03em", margin: "50px 0 20px", color: "#fff" }}>
            Generate School<br />
            <span style={{ background: "linear-gradient(90deg,#57f1db 0%,#a78bfa 50%,#38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Timetables
            </span>
            <br />Bespoke. Fast. Free.
          </h1>

          <p ref={heroSubRef} style={{ opacity: 0, fontSize: "clamp(1rem,2vw,1.15rem)", color: "#64748b", lineHeight: 1.7, maxWidth: 520, marginBottom: 32 }}>
            A mathematical optimization suite powered by Google OR-Tools. Build scheduling matrices, prevent teacher overlap conflicts, and distribute classroom workloads equitably in under two minutes.
          </p>

          <div ref={heroBtnsRef} style={{ opacity: 0, display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 44 }}>
            <button className="cta-btn" onClick={() => navigate(ctaPath)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "linear-gradient(135deg,#57f1db,#38bdf8)", color: "#051424", fontWeight: 850, fontSize: 15, borderRadius: 14, border: "none", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 16px 36px rgba(87,241,219,0.22)" }}>
              Get Started Now <ArrowRight size={16} />
            </button>
            <button className="outline-btn" onClick={() => navigate("/guide")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#d4e4fa", fontWeight: 700, fontSize: 15, borderRadius: 14, cursor: "pointer", transition: "all 0.2s" }}>
              See interactive guide
            </button>
          </div>

          {/* Social Proof Strip */}
          <div ref={heroSocialRef} style={{ opacity: 0, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex" }}>
              {["#2dd4bf","#a78bfa","#fb923c","#4ade80","#38bdf8"].map((c,i) => (
                <div key={i} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: "2px solid #030814", marginLeft: i ? -8 : 0, opacity: 0.9 }} />
              ))}
            </div>
            <div>
              <div style={{ display: "flex", gap: 2, marginBottom: 1 }}>
                {[...Array(5)].map((_,i) => <Star key={i} size={11} style={{ color: "#fb923c", fill: "#fb923c" }} />)}
              </div>
              <p style={{ fontSize: 11.5, color: "#64748b", margin: 0, fontWeight: 600 }}>Optimum workload balancing verified</p>
            </div>
          </div>
        </div>

        {/* Right - Live timetable dashboard demo */}
        <div ref={heroDashRef} className="hero-card-float" style={{ opacity: 0, flex: "1 1 380px", display: "flex", justifyContent: "center" }}>
          <LiveTimetableDashboard />
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)", padding: "16px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 24 }}>
          {STATS.map(({ value, label }, i) => (
            <div key={i} style={{ textAlign: "center", minWidth: 140 }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#57f1db", letterSpacing: "-0.02em" }}>{value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "32px clamp(20px,6vw,80px)", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>[The Core Blueprint]</span>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", margin: "10px 0 10px" }}>Structured Scheduling Flow</h2>
          <p style={{ fontSize: 14.5, color: "#64748b", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>Input variables, optimize via constraint validation, and export clean sheets.</p>
        </div>
        
        <div style={{ position: "relative", display: "flex", gap: 30, justifyContent: "space-between", flexWrap: "wrap", padding: "20px 0" }}>
          {/* Connected line in background (desktop only) */}
          <div className="max-md:hidden" style={{
            position: "absolute", top: 48, left: 60, right: 60, height: 2,
            background: "linear-gradient(90deg, rgba(87,241,219,0.3) 0%, rgba(167,139,250,0.3) 50%, rgba(251,146,60,0.3) 100%)",
            zIndex: 0
          }} />
          
          {STEPS.map(({ num, icon, title, body, color }) => {
            let glowCol = "170 80 50";
            let colorsArray = ['#57f1db', '#38bdf8', '#7c3aed'];
            if (color === "#a78bfa") {
              glowCol = "258 80 75";
              colorsArray = ['#a78bfa', '#38bdf8', '#7c3aed'];
            } else if (color === "#fb923c") {
              glowCol = "28 95 60";
              colorsArray = ['#fb923c', '#fb7185', '#7c3aed'];
            }
            return (
              <BorderGlow
                key={num}
                borderRadius={24}
                glowColor={glowCol}
                colors={colorsArray}
                backgroundColor="rgba(10, 18, 36, 0.35)"
                className="step-card"
                style={{
                  flex: "1 1 280px",
                  minWidth: 260,
                  position: "relative",
                  zIndex: 1,
                  border: "1px solid rgba(255,255,255,0.04)",
                  transition: "all 0.3s ease",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
                }}
              >
                <div style={{ padding: 24, width: "100%", height: "100%" }}>
                  {/* Stepper Node Icon & Number */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: "50%", background: "#030712",
                      border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center",
                      color: color, boxShadow: `0 0 15px ${color}35`, flexShrink: 0
                    }}>
                      {icon}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: color, fontFamily: "monospace", letterSpacing: "0.1em" }}>STEP {num}</span>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>{title}</h3>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{body}</p>
                </div>
              </BorderGlow>
            );
          })}
        </div>
      </section>

      {/* ── BESPOKE FEATURES GRID ───────────────────────────────────────────── */}
      <section id="features" style={{ padding: "32px clamp(20px,6vw,80px) 32px", background: "rgba(255,255,255,0.005)", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>[Bespoke capabilities]</span>
            <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", margin: "10px 0 0" }}>Engineered for Complex Schedules</h2>
          </div>
          
          <FeatureGrid />
        </div>
      </section>

      {/* ── COMPARATIVE BENCHMARK ───────────────────────────────────────────── */}
      <section style={{ padding: "32px clamp(20px,6vw,80px)", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "monospace" }}>[Benchmark comparisons]</span>
          <h2 style={{ fontSize: "clamp(1.6rem,3.5vw,2.2rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", margin: "10px 0 0" }}>Bespoke Solver vs. Manual Layouts</h2>
        </div>
        
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {/* Card A: The Manual Chaos */}
          <BorderGlow
            borderRadius={24}
            backgroundColor="rgba(244, 63, 94, 0.02)"
            glowColor="350 80 55"
            colors={['#f43f5e', '#fda4af', '#fb7185']}
            style={{
              flex: "1 1 380px",
              border: "1px solid rgba(244, 63, 94, 0.15)"
            }}
          >
            <div style={{ padding: 30, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 20, height: "100%", width: "100%" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", marginBottom: 14 }}>
                  <AlertCircle size={12} style={{ color: "#f43f5e" }} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#f43f5e", textTransform: "uppercase", letterSpacing: "0.08em" }}>The Manual Roster</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>The Weekly Administration Headache</h3>
                <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: "0 0 20px" }}>
                  Manually sliding subjects across paper grids or spreadsheets invites human error and scheduling gridlocks.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    "Prone to double-booked rooms & teachers",
                    "Hours of administrative fatigue each week",
                    "Unequal distribution of teaching workload",
                    "Difficult to adjust for part-time availability"
                  ].map((text, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <X size={15} style={{ color: "#f43f5e", flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ borderTop: "1px solid rgba(244,63,94,0.1)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f43f5e", textTransform: "uppercase" }}>Administrative Strain</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>High Risk</span>
              </div>
            </div>
          </BorderGlow>

          {/* Card B: The Bespoke Solver */}
          <BorderGlow
            borderRadius={24}
            backgroundColor="rgba(87, 241, 219, 0.02)"
            glowColor="170 80 50"
            colors={['#57f1db', '#38bdf8', '#7c3aed']}
            style={{
              flex: "1 1 380px",
              border: "1px solid rgba(87, 241, 219, 0.2)",
              boxShadow: "0 15px 35px rgba(87, 241, 219, 0.03)"
            }}
          >
            <div style={{ padding: 30, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 20, height: "100%", width: "100%" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(87,241,219,0.06)", border: "1px solid rgba(87,241,219,0.18)", marginBottom: 14 }}>
                  <CheckCircle2 size={12} style={{ color: "#2dd4bf" }} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#2dd4bf", textTransform: "uppercase", letterSpacing: "0.08em" }}>OR-Tools Engine</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>Bespoke Mathematical Resolution</h3>
                <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: "0 0 20px" }}>
                  Google's CP-SAT solver validates millions of parameters, compiling optimal schedules mathematically.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    "100% guarantee of conflict-free slots",
                    "Compiled & generated in under 2 minutes",
                    "Perfect parity for teacher workloads",
                    "Custom availability matrix compliance"
                  ].map((text, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <CheckCircle2 size={15} style={{ color: "#2dd4bf", flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: "#e2eaf5", fontWeight: 600 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ borderTop: "1px solid rgba(87,241,219,0.1)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#2dd4bf", textTransform: "uppercase" }}>Optimization Speed</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#2dd4bf", fontFamily: "monospace" }}>&lt; 42ms Solve Time</span>
              </div>
            </div>
          </BorderGlow>
        </div>
      </section>

      {/* ── CTA ACCENT BOARD ────────────────────────────────────────────────── */}
      <section style={{ padding: "50px clamp(20px,6vw,80px)", position: "relative" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <BorderGlow
            borderRadius={28}
            backgroundColor="rgba(87, 241, 219, 0.03)"
            glowColor="170 80 50"
            style={{
              width: "100%",
              border: "1px solid rgba(87,241,219,0.12)",
              overflow: "hidden"
            }}
          >
            <div style={{ padding: "50px 30px", width: "100%", position: "relative", height: "100%" }}>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle,rgba(87,241,219,0.05) 0%,transparent 70%)", pointerEvents: "none" }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>[Operational Efficiency]</span>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", margin: "14px 0 16px" }}>
                Configure, Optimize, and Export.<br />Ready in Minutes.
              </h2>
              <p style={{ fontSize: 15, color: "#64748b", maxWidth: 440, margin: "0 auto 28px", lineHeight: 1.65 }}>
                Completely free for schools. Cloud storage secured by Clerk encryption frameworks.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="cta-btn" onClick={() => navigate(ctaPath)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 30px", background: "linear-gradient(135deg,#57f1db,#38bdf8)", color: "#051424", fontWeight: 850, fontSize: 15, borderRadius: 12, border: "none", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 16px 36px rgba(87,241,219,0.22)" }}>
                  Start Scheduling <ArrowRight size={16} />
                </button>
                <button className="outline-btn" onClick={() => navigate("/guide")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 26px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#d4e4fa", fontWeight: 700, fontSize: 15, borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}>
                  Read instruction guide
                </button>
              </div>
            </div>
          </BorderGlow>
        </div>
      </section>

      {/* ── FOOTER SECTION ──────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "36px clamp(20px,6vw,80px) 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 40 }}>
            {/* Brand column */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg,#57f1db,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CalendarDays size={13} style={{ color: "#051424" }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, background: "linear-gradient(90deg,#57f1db,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Timetable Generator</span>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", maxWidth: 240, lineHeight: 1.6, margin: 0 }}>
                Free, open constraint solver for academic institutions worldwide.
              </p>
            </div>

            {/* Link directories */}
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12, fontFamily: "monospace" }}>[Product]</p>
                {[["Features", "#features"], ["How it works", "#how-it-works"], ["Interactive Guide", "/guide"]].map(([label, href]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    {href.startsWith("/") ? (
                      <a onClick={() => navigate(href)} style={{ fontSize: 13, color: "#64748b", textDecoration: "none", transition: "color 0.2s", cursor: "pointer" }}
                        onMouseOver={e => e.target.style.color="#57f1db"} onMouseOut={e => e.target.style.color="#64748b"}>{label}</a>
                    ) : (
                      <a href={href} style={{ fontSize: 13, color: "#64748b", textDecoration: "none", transition: "color 0.2s" }}
                        onMouseOver={e => e.target.style.color="#57f1db"} onMouseOut={e => e.target.style.color="#64748b"}>{label}</a>
                    )}
                  </div>
                ))}
              </div>
              
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12, fontFamily: "monospace" }}>[Sandbox Legal]</p>
                {[["About the Project", "about"], ["Terms & Conditions", "terms"], ["Contact Support", "contact"]].map(([label, modal]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <button onClick={() => setActiveModal(modal)} style={{ fontSize: 13, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.2s", fontFamily: "inherit" }}
                      onMouseOver={e => e.target.style.color="#57f1db"} onMouseOut={e => e.target.style.color="#64748b"}>{label}</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 12, color: "#334155", margin: 0 }}>
              © {new Date().getFullYear()} Timetable Generator — Designed for educational efficiency.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ icon: <Globe size={16} />, action: () => setActiveModal("language") }, { icon: <Users size={16} />, action: () => setActiveModal("credits") }].map((item, i) => (
                <button key={i} onClick={item.action}
                  style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                  onMouseOver={e => { e.currentTarget.style.color="#57f1db"; e.currentTarget.style.borderColor="rgba(87,241,219,0.3)"; }}
                  onMouseOut={e => { e.currentTarget.style.color="#475569"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; }}>
                  {item.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <Modal isOpen={activeModal !== null} type={activeModal} onClose={() => setActiveModal(null)} navigate={navigate} />
    </div>
  );
}