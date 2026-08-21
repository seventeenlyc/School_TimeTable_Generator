import { useEffect, useState } from "react";
import {
  Settings,
  Users,
  BookOpen,
  CalendarDays,
  Code2,
  Download,
  BarChart2,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import SideRays from "../components/SideRays";
import BorderGlow from "../components/BorderGlow";

const NAV_SECTIONS = [
  { id: "tech-stack", label: "Tech Stack" },
  { id: "inputs", label: "What You Input" },
  { id: "workflow", label: "Workflow" },
  { id: "logic", label: "Generation Logic" },
  { id: "post-gen", label: "Post-Generation" },
];

const TECH_STACK = [
  { label: "Frontend", value: "React + Tailwind CSS" },
  { label: "Architecture", value: "Pure Local-First (Offline Desktop)" },
  { label: "Backend", value: "FastAPI (Python)" },
  { label: "Storage", value: "Atomic JSON Repository (Auto Backup)" },
  { label: "Timetable Engine", value: "Google OR-Tools · CP-SAT Solver" },
  { label: "Change Agent", value: "Deterministic Substitute & Swap Agent" },
];

const INPUT_CARDS = [
  {
    icon: Settings,
    title: "General Settings",
    summary: "Timetable title, working days per week, periods per day.",
    detail:
      "Configure the core structure of your timetable — give it a name, set how many days a week your school operates, and define the number of teaching periods in each day.",
  },
  {
    icon: Users,
    title: "Classes",
    summary: "List of class names — e.g. XA, XB, XIA.",
    detail:
      "Define every class that needs a timetable. The system generates independent, conflict-free schedules for each one.",
  },
  {
    icon: BookOpen,
    title: "Teachers",
    summary: "Name, subjects per class, base class, lab subjects.",
    detail:
      "Specify each teacher's name, which subjects they handle for which classes, their assigned base class if any, their main subject, and any lab subjects they take.",
  },
  {
    icon: CalendarDays,
    title: "Weekly Requirements",
    summary: "Number of periods per subject per class each week.",
    detail:
      "Set the exact period count for every subject in every class. The solver enforces these counts precisely — no subject is under- or over-scheduled.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Input Collection",
    description:
      "The React frontend collects all settings, class lists, teacher details, and weekly period requirements.",
  },
  {
    step: "02",
    title: "Data Transmission",
    description:
      "Validated data is sent to the FastAPI backend, where it is parsed and prepared for constraint modelling.",
  },
  {
    step: "03",
    title: "Teacher & Subject Mapping",
    description:
      "The backend builds an internal map of every valid teacher–subject–class combination to define the solution space.",
  },
  {
    step: "04",
    title: "Constraint Solver",
    description:
      "Google OR-Tools CP-SAT solver applies all constraints and finds a feasible, optimised timetable assignment.",
  },
  {
    step: "05",
    title: "Output Generation",
    description:
      "Two views are produced: a class-wise timetable and a teacher-wise timetable, both ready for preview and export.",
  },
  {
    step: "06",
    title: "Live Preview & Edit",
    description:
      "The frontend renders the result in an interactive grid. Changes are validated in real time for conflicts.",
  },
  {
    step: "07",
    title: "Export",
    description:
      "Download the finalised timetable as a PDF or Excel file in either view.",
  },
];

const CONSTRAINTS = [
  {
    title: "Single Slot Rule",
    description: "A teacher can only be assigned to one class at any given period.",
  },
  {
    title: "Period Count Matching",
    description:
      "The exact number of weekly periods required for each subject in each class is enforced without deviation.",
  },
  {
    title: "Daily Subject Cap",
    description:
      "Any subject may appear at most twice per day in a single class, preventing monotonous scheduling.",
  },
  {
    title: "Lab Scheduling",
    description:
      "Lab subjects are always scheduled as consecutive double-period blocks to reflect real-world lab requirements.",
  },
  {
    title: "Class Teacher Priority",
    description:
      "The class teacher's main subject is given priority for the first period of the day in their assigned class.",
  },
  {
    title: "Valid Assignments Only",
    description:
      "No teacher–subject–class combination that was not explicitly defined in the input can be scheduled.",
  },
];

const POST_GEN = [
  {
    icon: Code2,
    title: "Live Validation & Editing",
    description:
      "Swap subjects or move periods in the timetable grid. The system instantly flags any conflicts — overlapping teachers, double-booked classes — so every edit stays valid.",
  },
  {
    icon: Download,
    title: "Export Options",
    description:
      "Download the timetable as a formatted PDF or an Excel spreadsheet. Both class-wise and teacher-wise views are available for export.",
  },
  {
    icon: BarChart2,
    title: "Insights & Distribution",
    description:
      "A visual breakdown of subject and teacher period distribution helps you spot imbalances or missing slots at a glance, before printing or sharing.",
  },
];

function AccordionCard({ icon: Icon, title, summary, detail }) {
  const [open, setOpen] = useState(false);
  return (
    <BorderGlow
      borderRadius={16}
      backgroundColor={open ? "rgba(87, 241, 219, 0.05)" : "rgba(10, 18, 36, 0.4)"}
      glowColor="170 80 50"
      className="hover:scale-[1.005]"
      style={{
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        cursor: "pointer",
        userSelect: "none",
        border: `1px solid ${open ? "rgba(87, 241, 219, 0.22)" : "rgba(255, 255, 255, 0.06)"}`,
      }}
      onClick={() => setOpen((v) => !v)}
    >
      <div style={{ padding: 20, display: "flex", alignItems: "flex-start", gap: 16, width: "100%", height: "100%" }}>
        <div
          style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: open ? "#57f1db" : "rgba(87, 241, 219, 0.08)",
            color: open ? "#051424" : "#57f1db",
            transition: "all 0.25s ease"
          }}
        >
          <Icon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 750, color: "#fff", fontSize: 15.5, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 3, margin: 0 }}>{summary}</p>
          {open && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 13, color: "#d4e4fa", lineHeight: 1.6, margin: 0 }}>{detail}</p>
            </div>
          )}
        </div>
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            marginTop: 4,
            color: open ? "#57f1db" : "rgba(255,255,255,0.25)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.25s ease"
          }}
        />
      </div>
    </BorderGlow>
  );
}

function Section({ id, label, children }) {
  return (
    <section id={id} style={{ scrollMarginTop: 96, paddingTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 850, trackingLetter: "0.15em", color: "#57f1db", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255, 255, 255, 0.04)" }} />
      </div>
      {children}
    </section>
  );
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("tech-stack");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 100% 60% at 15% 10%, #081225 0%, #030814 60%, #02050b 100%)",
        color: "#d4e4fa",
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
        overflowX: "hidden",
        position: "relative",
      }}
    >
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
      {/* Hero */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(5, 12, 24, 0.25)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "100px 24px 40px" }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12, fontFamily: "monospace" }}>
            [Documentation]
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 2.75rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 16px", lineHeight: 1.15 }}>
            How the Timetable Generator Works
          </h1>
          <p style={{ fontSize: 15, color: "#64748b", maxWidth: 640, lineHeight: 1.6, margin: 0 }}>
            A complete breakdown of how our system intelligently creates optimised school timetables — from the inputs you provide to the exported schedules you use.
          </p>
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {NAV_SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                  color: "#d4e4fa",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={e => { e.target.style.borderColor="#57f1db"; e.target.style.color="#57f1db"; e.target.style.background="rgba(87,241,219,0.04)"; }}
                onMouseOut={e => { e.target.style.borderColor="rgba(255,255,255,0.08)"; e.target.style.color="#d4e4fa"; e.target.style.background="rgba(255,255,255,0.02)"; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 80px", display: "flex", gap: 48 }}>
        {/* Sticky nav sidebar */}
        <aside style={{ width: 180, flexShrink: 0, paddingTop: 48 }} className="max-lg:hidden">
          <div style={{ position: "sticky", top: 100 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>
              On this page
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV_SECTIONS.map(({ id, label }) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: isActive ? "rgba(87, 241, 219, 0.08)" : "transparent",
                      color: isActive ? "#57f1db" : "rgba(212, 228, 250, 0.5)",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={e => { if (!isActive) e.target.style.color="#57f1db"; }}
                    onMouseOut={e => { if (!isActive) e.target.style.color="rgba(212, 228, 250, 0.5)"; }}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Tech Stack */}
          <Section id="tech-stack" label="Tech Stack">
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14.5, lineHeight: 1.6 }}>
              Our platform is built on a modern, production-ready stack — each layer chosen for reliability and developer ergonomics.
            </p>
            <BorderGlow
              borderRadius={16}
              backgroundColor="rgba(10, 18, 36, 0.35)"
              glowColor="170 80 50"
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden"
              }}
            >
              <div style={{ width: "100%" }}>
                {TECH_STACK.map(({ label, value }, i) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      borderBottom: i < TECH_STACK.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none"
                    }}
                  >
                    <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 13.5, color: "#fff", fontWeight: 800 }}>{value}</span>
                  </div>
                ))}
              </div>
            </BorderGlow>
          </Section>

          {/* Inputs */}
          <Section id="inputs" label="What You Input">
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14.5, lineHeight: 1.6 }}>
              Four categories of information define every timetable. Click any card to learn more about what each one covers.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {INPUT_CARDS.map((card) => (
                <AccordionCard key={card.title} {...card} />
              ))}
            </div>
          </Section>

          {/* Workflow */}
          <Section id="workflow" label="Workflow">
            <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14.5, lineHeight: 1.6 }}>
              From the moment you submit your inputs to the moment you download a finished schedule, the system follows seven clean steps.
            </p>
            <div style={{ position: "relative", padding: "10px 0" }}>
              {/* Spine line */}
              <div style={{ position: "absolute", left: 22, top: 24, bottom: 24, width: 2, background: "linear-gradient(to bottom, #57f1db, #a78bfa)" }} />
              <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {WORKFLOW_STEPS.map(({ step, title, description }, i) => (
                  <li key={step} style={{ display: "flex", gap: 20, position: "relative" }}>
                    <div style={{
                      flexShrink: 0,
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#030814",
                      border: "2px solid #57f1db",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      boxShadow: "0 0 10px rgba(87,241,219,0.2)"
                    }}>
                      <span style={{ fontSize: 11, fontStyle: "normal", fontWeight: 850, color: "#57f1db", fontFamily: "monospace" }}>{step}</span>
                    </div>
                    <div style={{ flex: 1, paddingBottom: i === WORKFLOW_STEPS.length - 1 ? 0 : 28 }}>
                      <p style={{ fontWeight: 800, color: "#fff", marginTop: 10, fontSize: 15.5, margin: "10px 0 4px" }}>{title}</p>
                      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Section>

          {/* Generation Logic */}
          <Section id="logic" label="Generation Logic">
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14.5, lineHeight: 1.6 }}>
              At the core of the backend is a <span style={{ fontWeight: 800, color: "#fff" }}>Constraint Programming (CP)</span> model built with Google OR-Tools. Six hard constraints define what a valid timetable looks like.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
              {CONSTRAINTS.map(({ title, description }) => (
                <BorderGlow
                  key={title}
                  borderRadius={16}
                  backgroundColor="rgba(10, 18, 36, 0.35)"
                  glowColor="170 80 50"
                  style={{
                    transition: "all 0.2s"
                  }}
                  className="hover:border-[#57f1db]/35"
                >
                  <div style={{ padding: 20, width: "100%", height: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <CheckCircle2 size={16} style={{ color: "#2dd4bf", flexShrink: 0 }} />
                      <p style={{ fontWeight: 800, color: "#fff", fontSize: 14.5, margin: 0 }}>{title}</p>
                    </div>
                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0, paddingLeft: 26 }}>
                      {description}
                    </p>
                  </div>
                </BorderGlow>
              ))}
            </div>

            {/* Two callout boxes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <BorderGlow
                borderRadius={16}
                backgroundColor="rgba(87, 241, 219, 0.04)"
                glowColor="170 80 50"
                style={{
                  border: "1px solid rgba(87, 241, 219, 0.12)"
                }}
              >
                <div style={{ padding: 20, width: "100%", height: "100%" }}>
                  <p style={{ fontSize: 10.5, fontWeight: 850, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "monospace" }}>
                    Deterministic?
                  </p>
                  <p style={{ fontSize: 13, color: "#d4e4fa", lineHeight: 1.65, margin: 0 }}>
                    Yes. Given the same inputs, the solver always produces the same timetable. Results only change when you manually edit after generation.
                  </p>
                </div>
              </BorderGlow>
              <BorderGlow
                borderRadius={16}
                backgroundColor="rgba(255, 255, 255, 0.02)"
                glowColor="258 80 75"
                colors={['#a78bfa', '#38bdf8', '#7c3aed']}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.05)"
                }}
              >
                <div style={{ padding: 20, width: "100%", height: "100%" }}>
                  <p style={{ fontSize: 10.5, fontWeight: 850, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "monospace" }}>
                    Auto or Manual?
                  </p>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, margin: 0 }}>
                    Fully auto-generated. Every period is assigned without manual input, and a dynamic editing UI is available once the result is ready.
                  </p>
                </div>
              </BorderGlow>
            </div>
          </Section>

          {/* Post-Generation */}
          <Section id="post-gen" label="Post-Generation">
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14.5, lineHeight: 1.6 }}>
              Once the timetable is generated, three tools help you refine, verify, and distribute it.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {POST_GEN.map(({ icon: Icon, title, description }) => (
                <BorderGlow
                  key={title}
                  borderRadius={16}
                  backgroundColor="rgba(10, 18, 36, 0.35)"
                  glowColor="170 80 50"
                  style={{
                    transition: "all 0.2s"
                  }}
                  className="hover:border-[#57f1db]/35"
                >
                  <div style={{ padding: 20, display: "flex", alignItems: "start", gap: 16, width: "100%", height: "100%" }}>
                    <div style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(87, 241, 219, 0.08)",
                      color: "#57f1db",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: "#fff", fontSize: 15.5, margin: "0 0 4px" }}>{title}</p>
                      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{description}</p>
                    </div>
                  </div>
                </BorderGlow>
              ))}
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}