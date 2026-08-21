import { useState, useEffect } from "react";
import { Plus, Loader2, X, Save, AlertTriangle, RefreshCw, Users, Edit3, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import WizardSteps from "../components/WizardSteps";
const useAuth = () => ({ getToken: async () => "" });
const useUser = () => ({ user: { id: "local-user" } });
import DropdownChecklist from "./components/DropdownChecklist";
import TimetableDisplay from "./TimetableDisplay";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import toast from "react-hot-toast";

function FloatingOrbs() {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute top-[8%] left-[3%] w-[550px] h-[550px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, #57f1db 0%, transparent 70%)", filter: "blur(95px)" }} />
      <div className="absolute bottom-[10%] right-[2%] w-[680px] h-[680px] rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)", filter: "blur(115px)" }} />
    </div>
  );
}

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DIAG_TYPES = [
  {
    key: "double_book",
    test: (s) => /is double-booked/i.test(s),
    icon: "👥",
    label: "Teacher Double-Booking",
    bg: "rgba(239,68,68,0.08)",
    border: "#ef4444",
    badge: "#ef4444",
    text: "#fca5a5",
  },
  {
    key: "unavailable",
    test: (s) => /was scheduled on blocked slot/i.test(s),
    icon: "🚫",
    label: "Unavailability Violation",
    bg: "rgba(249,115,22,0.08)",
    border: "#f97316",
    badge: "#f97316",
    text: "#fdba74",
  },
  {
    key: "lab_room",
    test: (s) => /Specialized Lab Room.*double-booked/i.test(s),
    icon: "🧪",
    label: "Lab Room Conflict",
    bg: "rgba(124,58,237,0.08)",
    border: "#7c3aed",
    badge: "#7c3aed",
    text: "#c4b5fd",
  },
  {
    key: "lab_consec",
    test: (s) => /not scheduled consecutively/i.test(s),
    icon: "🔗",
    label: "Lab Consecutive Block",
    bg: "rgba(56,189,248,0.08)",
    border: "#38bdf8",
    badge: "#38bdf8",
    text: "#7dd3fc",
  },
  {
    key: "period_shortage",
    test: (s) => /has only \d+ periods assigned.*requires/i.test(s),
    icon: "📊",
    label: "Period Count Shortage",
    bg: "rgba(234,179,8,0.08)",
    border: "#eab308",
    badge: "#eab308",
    text: "#fde047",
  },
  {
    key: "daily_limit",
    test: (s) => /exceeding the daily limit/i.test(s),
    icon: "⚠️",
    label: "Daily Subject Limit",
    bg: "rgba(245,158,11,0.08)",
    border: "#f59e0b",
    badge: "#f59e0b",
    text: "#fcd34d",
  },
  {
    key: "class_teacher",
    test: (s) => /Class Teacher.*not assigned the first period/i.test(s),
    icon: "🎓",
    label: "Class Teacher Priority",
    bg: "rgba(20,184,166,0.08)",
    border: "#14b8a6",
    badge: "#14b8a6",
    text: "#5eead4",
  },
];

function classifyDiagnostic(msg) {
  return DIAG_TYPES.find((t) => t.test(msg)) || {
    key: "other",
    icon: "ℹ️",
    label: "Constraint Violation",
    bg: "rgba(100,116,139,0.08)",
    border: "#64748b",
    badge: "#64748b",
    text: "#94a3b8",
  };
}

function DiagnosticsPanel({ errorDetails }) {
  const details = errorDetails.error_details;
  if (!details) return null;

  if (typeof details === "string") {
    return (
      <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "14px 16px" }}>
        <p style={{ color: "#fca5a5", fontSize: "13px", margin: 0 }}>{details}</p>
      </div>
    );
  }

  const conflictDiagnostics = details.conflict_diagnostics || [];
  const constraintErrors = details.constraint_errors || [];
  const otherEntries = Object.entries(details).filter(
    ([k]) => k !== "conflict_diagnostics" && k !== "constraint_errors"
  );

  // Group conflict diagnostics by type
  const groups = {};
  conflictDiagnostics.forEach((msg) => {
    const type = classifyDiagnostic(msg);
    if (!groups[type.key]) groups[type.key] = { type, items: [] };
    groups[type.key].items.push(msg);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Conflict Diagnostics structured panel */}
      {conflictDiagnostics.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#f87171", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Conflict Diagnostics
            </span>
            <span style={{ background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: 700, borderRadius: "999px", padding: "1px 8px" }}>
              {conflictDiagnostics.length}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.values(groups).map(({ type, items }) => (
              <div
                key={type.key}
                style={{
                  background: type.bg,
                  border: `1px solid ${type.border}40`,
                  borderLeft: `3px solid ${type.border}`,
                  borderRadius: "10px",
                  padding: "10px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: items.length > 1 ? "8px" : "4px" }}>
                  <span style={{ fontSize: "15px" }}>{type.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: type.badge, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {type.label}
                  </span>
                  {items.length > 1 && (
                    <span style={{ background: type.badge + "22", color: type.badge, fontSize: "10px", fontWeight: 700, borderRadius: "999px", padding: "1px 7px", marginLeft: "auto" }}>
                      ×{items.length}
                    </span>
                  )}
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 22px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {items.map((msg, i) => (
                    <li key={i} style={{ fontSize: "12px", color: type.text, lineHeight: 1.5 }}>{msg}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constraint errors */}
      {constraintErrors.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px 0" }}>
            Constraint Errors
          </p>
          <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {constraintErrors.map((e, i) => (
              <li key={i} style={{ fontSize: "12px", color: "#fca5a5" }}>{e.message || JSON.stringify(e)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Other fields */}
      {otherEntries.length > 0 && (
        <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {otherEntries.map(([key, value]) => (
            <li key={key} style={{ fontSize: "12px", color: "#94a3b8" }}>
              <strong style={{ color: "#cbd5e1", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}:</strong>{" "}
              {Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddTeacher() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { state } = useLocation();
  const location = useLocation();
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);

  const handleToggleSlot = (teacherIndex, dayIndex, periodIndex) => {
    const newTeachers = [...teachers];
    const currentTeacher = newTeachers[teacherIndex];
    if (!currentTeacher.unavailable_slots) {
      currentTeacher.unavailable_slots = [];
    }
    
    const slotIndex = currentTeacher.unavailable_slots.findIndex(
      (slot) => slot[0] === dayIndex && slot[1] === periodIndex
    );
    
    if (slotIndex > -1) {
      currentTeacher.unavailable_slots = currentTeacher.unavailable_slots.filter(
        (_, i) => i !== slotIndex
      );
    } else {
      currentTeacher.unavailable_slots.push([dayIndex, periodIndex]);
    }
    setTeachers(newTeachers);
  };

  const isSlotBlocked = (teacher, dayIndex, periodIndex) => {
    if (!teacher || !teacher.unavailable_slots) return false;
    return teacher.unavailable_slots.some(
      (slot) => slot[0] === dayIndex && slot[1] === periodIndex
    );
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const {
    classes,
    subjects,
    workingDays,
    periods,
    title,
    teacherData,
    timetableId,
  } = state || {};

  const [teachers, setTeachers] = useState(() => {
    if (teacherData) {
      return teacherData.map(t => ({
        ...t,
        unavailable_slots: t.unavailable_slots || []
      }));
    }
    return [
      {
        name: "",
        subjects: [],
        assigned_class: "",
        mainSubject: "",
        labPeriod: "",
        periods: [{ class_name: "", subject: "", noOfPeriods: "" }],
        unavailable_slots: [],
      },
    ];
  });

  const [loading, setLoading] = useState(false);
  const [timetableData, setTimetableData] = useState(null);

  // Store the teachers data when timetable is generated
  const [savedTeachersData, setSavedTeachersData] = useState(null);

  // Active teacher index for the sidebar directory workspace view
  const [activeTeacherIndex, setActiveTeacherIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddTeacher = () => {
    const newTeachers = [
      ...teachers,
      {
        name: "",
        assigned_class: "",
        mainSubject: "",
        labPeriod: "",
        periods: [{ class_name: "", subject: "", noOfPeriods: "" }],
        subjects: [],
        unavailable_slots: [],
      },
    ];
    setTeachers(newTeachers);
    setActiveTeacherIndex(newTeachers.length - 1);
  };

  const handleDeleteTeacher = (index) => {
    if (teachers.length > 1) {
      const newTeachers = teachers.filter((_, i) => i !== index);
      setTeachers(newTeachers);
      
      // Adjust active index so it remains valid
      if (activeTeacherIndex >= newTeachers.length) {
        setActiveTeacherIndex(newTeachers.length - 1);
      } else if (activeTeacherIndex === index && index > 0) {
        setActiveTeacherIndex(index - 1);
      }
    }
  };

  const handleAddPeriod = (index) => {
    const newTeachers = [...teachers];
    newTeachers[index].periods = [
      ...newTeachers[index].periods,
      {
        class_name: "",
        subject: newTeachers[index].mainSubject || "",
        noOfPeriods: "",
      },
    ];
    setTeachers(newTeachers);
  };

  const handleDeletePeriod = (teacherIndex, periodIndex) => {
    const newTeachers = [...teachers];
    if (newTeachers[teacherIndex].periods.length > 1) {
      newTeachers[teacherIndex].periods = newTeachers[
        teacherIndex
      ].periods.filter((_, i) => i !== periodIndex);
      setTeachers(newTeachers);
    }
  };

  const handleChangePeriodClass = (index, ind, clas) => {
    const newTeachers = [...teachers];
    newTeachers[index].periods[ind].class_name = clas;
    setTeachers(newTeachers);
  };

  const handleChangePeriodSubject = (index, ind, sub) => {
    const newTeachers = [...teachers];
    newTeachers[index].periods[ind].subject = sub;
    setTeachers(newTeachers);
  };

  const handleChangePeriodNumber = (index, ind, no) => {
    const newTeachers = [...teachers];
    newTeachers[index].periods[ind].noOfPeriods = parseInt(no) || null;
    setTeachers(newTeachers);
  };

  const handleChangeTeacherName = (index, teacherName) => {
    const newTeachers = [...teachers];
    newTeachers[index].name = teacherName;
    setTeachers(newTeachers);
  };

  const handleChangeClass = (index, grade) => {
    const newTeachers = [...teachers];
    const previousClass = newTeachers[index].assigned_class;
    newTeachers[index].assigned_class = grade;
    setTeachers(newTeachers);
    setAssignedClasses((prev) => {
      const withoutOld = previousClass
        ? prev.filter((c) => c !== previousClass)
        : prev;
      return [...withoutOld, grade];
    });
  };

  const handleChangeMainSubject = (index, mainSub) => {
    const newTeachers = [...teachers];
    newTeachers[index].mainSubject = mainSub;
    newTeachers[index].periods = newTeachers[index].periods.map((obj) => ({
      ...obj,
      subject: mainSub,
    }));
    setTeachers(newTeachers);
  };

  const handleChangeLabPeriod = (index, lab) => {
    const newTeachers = [...teachers];
    newTeachers[index].labPeriod = lab;
    setTeachers(newTeachers);
  };

  const handleChangeSelectedSubjects = (index, subjects) => {
    const newTeachers = [...teachers];
    newTeachers[index].subjects = subjects;
    setTeachers(newTeachers);
  };

  // Helper to validate complete profile status
  const isTeacherComplete = (teacher) => {
    if (!teacher.name || !teacher.name.trim()) return false;
    if (!teacher.mainSubject || teacher.mainSubject === "Select Main Subject") return false;
    if (!teacher.subjects || teacher.subjects.length === 0) return false;
    if (!teacher.periods || teacher.periods.length === 0) return false;
    for (const p of teacher.periods) {
      if (!p.class_name || p.class_name === "Select Class") return false;
      if (!p.subject || p.subject === "Select Subject" || p.subject === "") return false;
      if (!p.noOfPeriods || isNaN(p.noOfPeriods) || p.noOfPeriods <= 0) return false;
    }
    return true;
  };

  // Helper to get total assigned periods
  const getTeacherTotalPeriods = (teacher) => {
    return teacher.periods ? teacher.periods.reduce((sum, p) => sum + (parseInt(p.noOfPeriods) || 0), 0) : 0;
  };

  const generateTimetable = async () => {
    setLoading(true);
    setError("");
    setErrorDetails(null);

    try {
      // Validate inputs
      for (const teacher of teachers) {
        if (!teacher.name.trim()) {
          throw new Error("Please enter names for all teachers.");
        }
        if (
          !teacher.mainSubject ||
          teacher.mainSubject === "Select Main Subject"
        ) {
          throw new Error(`Please select main subject for ${teacher.name}`);
        }
        if (
          teacher.periods.some(
            (p) => !p.class_name || !p.subject || !p.noOfPeriods
          )
        ) {
          throw new Error(
            `Please fill all period assignments for ${teacher.name}`
          );
        }
      }

      setSavedTeachersData(JSON.parse(JSON.stringify(teachers)));

      const requestData = {
        userId: user.id,
        title: title,
        workingDays: parseInt(workingDays) || 5,
        periods: parseInt(periods) || 8,
        classes: classes.filter((c) => c.trim()),
        subjects: subjects.filter((s) => s.trim()),
        teachers: teachers.map((teacher) => ({
          name: teacher.name,
          subjects: teacher.subjects,
          mainSubject: teacher.mainSubject,
          labPeriod:
            teacher.labPeriod !== "Select Lab Period"
              ? teacher.labPeriod
              : null,
          assigned_class:
            teacher.assigned_class !== "Select Class"
              ? teacher.assigned_class
              : null,
          periods: teacher.periods.map((p) => ({
            class_name: p.class_name,
            subject: p.subject,
            noOfPeriods: p.noOfPeriods,
          })),
          unavailable_slots: teacher.unavailable_slots || [],
        })),
      };

      const token = await getToken();
      const response = await fetchWithAuth(
        token,
        `${import.meta.env.VITE_API_BASE_URL}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      const data = await response.json();
      if (data.status === "ERROR" || data.status === "INFEASIBLE") {
        setError(data.message || "Failed to generate timetable");
        setErrorDetails(data);
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate timetable");
      }

      if (
        !data.class_timetable ||
        Object.keys(data.class_timetable).length === 0
      ) {
        setError(
          "No feasible timetable could be generated with the current constraints."
        );
        setErrorDetails(data);
        return;
      }

      setTimetableData(data);
    } catch (err) {
      console.error("Error generating timetable:", err);
      setError(err.message || "Failed to generate timetable");
      setErrorDetails(null);
    } finally {
      setLoading(false);
      window.scrollTo(0, 0);
    }
  };

  const handleBackToTeachers = () => {
    if (savedTeachersData) {
      setTeachers(savedTeachersData);
    }
    setTimetableData(null);
    setError("");
    setErrorDetails(null);
  };

  const handleRegenerateWithCurrentData = async () => {
    await generateTimetable();
  };

  const handleSavetoDb = async () => {
    try {
      if (timetableData !== null) {
        if (timetableId) {
          const token = await getToken();
          const response = await fetchWithAuth(
            token,
            `${
              import.meta.env.VITE_API_BASE_URL
            }/update-timetable/${timetableId}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(timetableData),
            }
          );
          const result = await response.json();
          toast.success("Timetable saved successfully");
          navigate(`/display/${timetableId}`, {
            state: {
              classTimetable: timetableData.class_timetable,
              teacherTimetable: timetableData.teacher_timetable,
              timetableId: timetableId,
              teacherData: result.teacherData,
              classes: result.classes,
              subjects: result.subjects,
              workingDays: result.workingDays,
              periods: result.periods,
              title: result.title,
            },
          });
        } else {
          const token = await getToken();
          const response = await fetchWithAuth(
            token,
            `${import.meta.env.VITE_API_BASE_URL}/add`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(timetableData),
            }
          );
          const result = await response.json();
          toast.success("Timetable saved successfully");
          navigate(`/display/${result._id.toString()}`, {
            state: {
              classTimetable: timetableData.class_timetable,
              teacherTimetable: timetableData.teacher_timetable,
              timetableId: result._id.toString(),
              teacherData: result.teacherData,
              classes: result.classes,
              subjects: result.subjects,
              workingDays: result.workingDays,
              periods: result.periods,
              title: result.title,
            },
          });
        }
      }
    } catch (error) {
      console.log("Error in saving", error);
    }
  };

  const renderErrorDetails = () => {
    if (!errorDetails) return null;

    return (
      <div className="bg-[#fee2e2] border-2 border-[#ef4444] rounded-2xl p-6 my-4 shadow-[0_8px_25px_rgba(239,68,68,0.15)] text-[#7f1d1d] font-sans">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#fca5a5]">
          <AlertTriangle className="text-[#dc2626] w-6 h-6 shrink-0" />
          <h4 className="text-lg font-bold m-0 text-[#991b1b]">Timetable Generation Failed</h4>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold text-[#991b1b] leading-normal">{error}</p>

          {errorDetails.error_type && (
            <div className="bg-[#dc2626]/10 py-2 px-3 rounded-lg text-xs font-semibold text-[#dc2626] inline-block">
              <strong>Error Type:</strong> {errorDetails.error_type.replace(/_/g, " ")}
            </div>
          )}

          {errorDetails.error_details && (
            <DiagnosticsPanel errorDetails={errorDetails} />
          )}

          <div className="bg-[#fef3c7] border border-[#f59e0b] rounded-xl p-4 text-xs text-[#92400e] leading-relaxed">
            <h5 className="font-bold text-sm text-[#78350f] mb-1.5">Suggestions to resolve this constraint conflict:</h5>
            <ul className="list-disc pl-4 space-y-1">
              <li>Check if teacher period assignments don't exceed available time slots</li>
              <li>Ensure class schedules don't conflict with teacher availabilities</li>
              <li>Verify that subject assignments are realistic for the given time frame</li>
              <li>Consider reducing the number of periods or adjusting teacher workload</li>
              <li>Make sure all teachers have feasible subject-class combinations</li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              className="flex items-center gap-2 bg-[linear-gradient(135deg,#dc2626_0%,#b91c1c_100%)] text-white py-2.5 px-6 border-none rounded-full font-bold cursor-pointer transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)]"
              style={{ borderRadius: "9999px" }}
              onClick={handleRegenerateWithCurrentData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Filter teachers list based on search query
  const filteredTeachersWithIndices = teachers
    .map((teacher, index) => ({ teacher, index }))
    .filter(item => item.teacher.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Active teacher selection safety
  const activeTeacher = teachers[activeTeacherIndex] || teachers[0] || {
    name: "",
    subjects: [],
    assigned_class: "",
    mainSubject: "",
    labPeriod: "",
    periods: [{ class_name: "", subject: "", noOfPeriods: "" }]
  };

  if (timetableData) {
    return (
      <div 
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse 100% 60% at 15% 10%, #081225 0%, #030814 60%, #02050b 100%)",
          color: "#d4e4fa",
          fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
          overflowX: "hidden",
          position: "relative",
          paddingTop: "120px",
          paddingBottom: "80px",
        }}
      >
        <FloatingOrbs />
        <div className="max-w-[1450px] mx-auto px-5 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-3xl font-extrabold text-white tracking-tight m-0">Generated <span className="text-[#57f1db] font-black">Timetable</span></h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="flex items-center gap-2 py-2.5 px-5 border-none rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out text-[#051424] no-underline bg-gradient-to-r from-[#3282b8] to-[#00ff87] hover:scale-[1.02] shadow-[0_4px_15px_rgba(50,130,184,0.2)]"
                style={{ borderRadius: "9999px" }}
                onClick={handleSavetoDb}
                title="Save to database"
              >
                <Save className="w-4 h-4" />
                Save
              </button>

              <button
                className="flex items-center gap-2 py-2.5 px-5 border border-slate-700/80 rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out text-slate-200 bg-slate-800/60 hover:bg-slate-700/60 hover:scale-[1.02]"
                style={{ borderRadius: "9999px" }}
                onClick={handleBackToTeachers}
                title="Go back to edit teachers"
              >
                <Users size={14} />
                Edit Teachers
              </button>

              <button
                type="button"
                className="flex items-center gap-2 py-2.5 px-5 border border-[#a78bfa]/40 rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out text-[#a78bfa] bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 hover:scale-[1.02]"
                style={{ borderRadius: "9999px" }}
                onClick={() =>
                  navigate("/edit-timetable", {
                    state: {
                      classTimetable: timetableData.class_timetable,
                      teacherTimetable: timetableData.teacher_timetable,
                      id: location.state?.timetableId,
                      teacherData:
                        location.state?.teacherData ||
                        timetableData.teacherData,
                      classes: location.state?.classes || timetableData.classes,
                      subjects:
                        location.state?.subjects || timetableData.subjects,
                      workingDays:
                        location.state?.workingDays ||
                        timetableData.workingDays,
                      periods: location.state?.periods || timetableData.periods,
                      title: location.state?.title || timetableData.title,
                    },
                  })
                }
              >
                <Edit3 size={14} />
                Edit timetable
              </button>

              <button
                className="flex items-center gap-2 py-2.5 px-5 border-none rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out text-white bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] hover:scale-[1.02] shadow-[0_4px_15px_rgba(16,185,129,0.2)] disabled:bg-[linear-gradient(135deg,#6b7280_0%,#4b5563_100%)] disabled:cursor-not-allowed disabled:transform-none"
                style={{ borderRadius: "9999px" }}
                onClick={handleRegenerateWithCurrentData}
                disabled={loading}
                title="Regenerate timetable with current data"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Regenerate
                  </>
                )}
              </button>
            </div>
          </div>

          <TimetableDisplay
            classTimetable={timetableData.class_timetable}
            teacherTimetable={timetableData.teacher_timetable}
            showEditOptions={savedTeachersData}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 100% 60% at 15% 10%, #081225 0%, #030814 60%, #02050b 100%)",
        color: "#d4e4fa",
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
        overflowX: "hidden",
        position: "relative",
        paddingTop: "120px",
        paddingBottom: "80px",
      }}
    >
      <FloatingOrbs />
      <div className="max-w-[1400px] mx-auto px-5 relative z-10 animate-[fadeInUp_0.6s_ease-out]">
        <WizardSteps current={2} />

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-[rgba(255,255,255,0.06)] pb-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight m-0">Configure <span className="text-[#57f1db] font-black">Teachers</span></h2>
            <p className="text-sm text-slate-400 mt-2 m-0 max-w-xl leading-relaxed">
              Define teacher profiles, main subject areas, lab requirements, and period counts.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            {savedTeachersData && (
              <div className="bg-[#3282b8]/10 border border-[#3282b8]/30 rounded-xl p-3 text-[#93c5fd] text-xs backdrop-blur-[10px] max-w-xs">
                <strong>Note:</strong> Edit values below and click Regenerate.
              </div>
            )}
            <button
              className="w-full sm:w-auto flex items-center justify-center py-3.5 px-8 border-none rounded-full bg-gradient-to-r from-[#3282b8] to-[#00ff87] text-[#051424] text-sm font-extrabold cursor-pointer transition-all duration-300 shadow-[0_8px_25px_rgba(50,130,184,0.3)] hover:-translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_12px_30px_rgba(50,130,184,0.4)] disabled:opacity-50"
              style={{ borderRadius: "9999px" }}
              onClick={generateTimetable}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : savedTeachersData ? (
                "Regenerate Timetable"
              ) : (
                "Generate Timetable"
              )}
            </button>
          </div>
        </div>

        {/* Enhanced Error Display */}
        {error && (
          <div className="error-section mb-8">
            {errorDetails ? (
              renderErrorDetails()
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm backdrop-blur-[10px] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Teacher Directory (Sidebar) */}
          <div className="lg:col-span-4 space-y-4">
            <div 
              style={{
                background: "linear-gradient(135deg, rgba(16, 28, 54, 0.45) 0%, rgba(10, 18, 36, 0.55) 100%)",
                border: "1px solid rgba(87, 241, 219, 0.12)",
                borderRadius: "24px",
                padding: "24px",
                backdropFilter: "blur(24px)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
              }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 m-0">
                    <span className="w-1.5 h-4 bg-[#57f1db] rounded-full inline-block" />
                    Teachers ({teachers.length})
                  </h3>
                  {(() => {
                    const ready = teachers.filter(isTeacherComplete).length;
                    const total = teachers.length;
                    return (
                      <p style={{ fontSize: 10, color: ready === total ? "#10b981" : "#f59e0b", margin: "3px 0 0 16px", fontWeight: 700 }}>
                        {ready}/{total} ready
                      </p>
                    );
                  })()}
                </div>
                <button
                  onClick={handleAddTeacher}
                  className="flex items-center justify-center p-1.5 px-4 border border-teal-500/30 rounded-full bg-teal-500/10 hover:bg-teal-500/20 text-[#57f1db] text-xs font-bold cursor-pointer transition-all duration-200"
                  style={{ borderRadius: "9999px" }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search 
                  className="absolute text-slate-500" 
                  size={16}
                  style={{ right: "0.95rem", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  className="w-full p-3 pr-8 border border-slate-700/80 rounded-xl bg-slate-900/50 text-white text-xs focus:outline-none focus:border-[#57f1db] placeholder:text-slate-500 transition-all duration-300"
                  placeholder="Search teacher by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "2.65rem" }}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer p-0"
                    style={{ top: "50%", transform: "translateY(-50%)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Scrollable list directory */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredTeachersWithIndices.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs italic">
                    {searchQuery ? "No teachers match search" : "Add a teacher to get started"}
                  </div>
                ) : (
                  filteredTeachersWithIndices.map(({ teacher, index }) => {
                    const active = index === activeTeacherIndex;
                    const complete = isTeacherComplete(teacher);
                    const totalPeriods = getTeacherTotalPeriods(teacher);
                    
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          setActiveTeacherIndex(index);
                          setError("");
                        }}
                        style={{
                          background: active 
                            ? "linear-gradient(135deg, rgba(87, 241, 219, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)" 
                            : "rgba(10, 18, 36, 0.25)",
                          border: active 
                            ? "1px solid rgba(87, 241, 219, 0.45)" 
                            : "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: "16px",
                          cursor: "pointer"
                        }}
                        className={`p-3.5 transition-all duration-300 hover:border-teal-500/35 relative flex items-center justify-between group ${
                          active ? "shadow-[0_0_15px_rgba(87,241,219,0.1)]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Avatar circle with initials */}
                          {(() => {
                            const name = teacher.name.trim() || "?";
                            const initials = name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
                            const hue = name.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
                            return (
                              <div style={{
                                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                                background: `hsl(${hue},55%,28%)`,
                                border: `2px solid hsl(${hue},55%,45%)`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800,
                                color: `hsl(${hue},80%,80%)`,
                              }}>
                                {initials}
                              </div>
                            );
                          })()}

                          <div className="overflow-hidden flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate m-0">
                              {teacher.name.trim() || <span className="text-slate-500/60 italic font-normal">Unnamed</span>}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {teacher.mainSubject && (
                                <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(87,241,219,0.12)", color: "#57f1db", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.04em" }}>
                                  {teacher.mainSubject}
                                </span>
                              )}
                              <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>
                                {totalPeriods}p
                              </span>
                            </div>
                            {/* Readiness bar */}
                            <div style={{ marginTop: 4, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 2, transition: "width 0.4s ease",
                                width: complete ? "100%" : (teacher.name && teacher.mainSubject ? "60%" : "20%"),
                                background: complete ? "#10b981" : "#f59e0b",
                              }} />
                            </div>
                          </div>
                        </div>

                        {/* Delete Trash Button */}
                        {teachers.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeacher(index);
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500 text-red-400 p-1.5 rounded-full cursor-pointer transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center w-7 h-7 shrink-0"
                            style={{ borderRadius: "9999px" }}
                            title="Delete Teacher"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Workarea Editor Panel */}
          <div className="lg:col-span-8">
            {teachers.length === 0 ? (
              <div 
                style={{
                  background: "rgba(10, 18, 36, 0.45)",
                  border: "1px solid rgba(87, 241, 219, 0.12)",
                  borderRadius: "24px",
                  padding: "48px",
                  backdropFilter: "blur(24px)",
                }}
                className="text-center"
              >
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">No Teachers Added</h4>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">Create profiles to configure teaching subject loads and schedule details.</p>
                <button
                  onClick={handleAddTeacher}
                  className="py-3 px-6 border-none rounded-full bg-gradient-to-r from-[#3282b8] to-[#00ff87] text-[#051424] text-sm font-extrabold cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  style={{ borderRadius: "9999px" }}
                >
                  Create First Profile
                </button>
              </div>
            ) : (
              <div 
                style={{
                  background: "linear-gradient(135deg, rgba(16, 28, 54, 0.45) 0%, rgba(10, 18, 36, 0.55) 100%)",
                  border: "1px solid rgba(87, 241, 219, 0.12)",
                  borderRadius: "24px",
                  padding: "32px",
                  backdropFilter: "blur(24px)",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
                }}
                className="transition-all duration-300 hover:border-teal-500/25 w-full box-border max-sm:p-6"
              >
                
                {/* Editor Header */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[rgba(255,255,255,0.06)] flex-wrap gap-3">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0">
                    <span className="w-1.5 h-4 bg-[#a78bfa] rounded-full inline-block" />
                    Configure: {activeTeacher.name.trim() || "Unnamed Profile"}
                  </h3>
                  <span 
                    className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      isTeacherComplete(activeTeacher) 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {isTeacherComplete(activeTeacher) ? "✓ Ready" : "⚠️ Details Missing"}
                  </span>
                </div>

                {/* Info Card Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="flex flex-col gap-2">
                    <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Teacher Name</label>
                    <input
                      type="text"
                      className="form-input-ge"
                      placeholder="e.g., Mr. Jason"
                      value={activeTeacher.name}
                      onChange={(e) => handleChangeTeacherName(activeTeacherIndex, e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Subjects Taught</label>
                    <DropdownChecklist
                      options={subjects}
                      selected={activeTeacher.subjects}
                      onChange={(selected) => handleChangeSelectedSubjects(activeTeacherIndex, selected)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Primary Subject</label>
                    <select
                      className="form-select-ge"
                      value={activeTeacher.mainSubject}
                      onChange={(e) => handleChangeMainSubject(activeTeacherIndex, e.target.value)}
                    >
                      <option>Select Main Subject</option>
                      {activeTeacher.subjects.map((subject, ind) =>
                        subject !== "" ? (
                          <option key={ind} value={subject}>
                            {subject}
                          </option>
                        ) : null
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Lab Subject (Optional)</label>
                    <select
                      className="form-select-ge"
                      value={activeTeacher.labPeriod}
                      onChange={(e) => handleChangeLabPeriod(activeTeacherIndex, e.target.value)}
                    >
                      <option>Select Lab Period</option>
                      {activeTeacher.subjects.map((subject, ind) =>
                        subject !== "" ? (
                          <option key={ind} value={subject}>
                            {subject}
                          </option>
                        ) : null
                      )}
                    </select>
                  </div>
                </div>

                {/* Class Teacher Dropdown */}
                <div className="flex items-center gap-4 mb-8 p-4 bg-slate-900/30 rounded-2xl border border-slate-800/80 flex-wrap max-md:flex-col max-md:items-stretch">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                    If Class Teacher, Select Grade Assignment:
                  </label>
                  <select
                    className="form-select-ge max-w-[200px] max-md:max-w-full"
                    value={activeTeacher.assigned_class}
                    onChange={(e) => handleChangeClass(activeTeacherIndex, e.target.value)}
                  >
                    <option>Select Class</option>
                    {classes.map((clas, ind) =>
                      clas !== "" ? (
                        <option
                          key={ind}
                          value={clas}
                          disabled={
                            assignedClasses.includes(clas) &&
                            clas !== activeTeacher.assigned_class
                          }
                        >
                          {clas}
                        </option>
                      ) : null
                    )}
                  </select>
                </div>

                {/* Period Workloads */}
                <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                  <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-[#a78bfa] rounded-full inline-block" />
                    Period Workloads
                  </h3>
                  
                  <div className="flex flex-col gap-4 mb-6">
                    {activeTeacher.periods.map((period, ind) => {
                      return (
                        <div 
                          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-4 bg-slate-950/20 rounded-2xl border border-slate-800/60 relative max-md:pt-8" 
                          key={ind}
                        >
                          {/* Remove Period Button */}
                          {activeTeacher.periods.length > 1 && (
                            <button
                              onClick={() => handleDeletePeriod(activeTeacherIndex, ind)}
                              className="absolute top-2 right-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500 text-red-400 p-1.5 rounded-full cursor-pointer transition-all duration-200 flex items-center justify-center h-7 w-7"
                              style={{ borderRadius: "9999px" }}
                              title="Remove Assignment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div className="flex flex-col gap-2">
                            <label className="block text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">Target Class</label>
                            <select
                              className="form-select-ge"
                              value={period.class_name}
                              onChange={(e) => handleChangePeriodClass(activeTeacherIndex, ind, e.target.value)}
                            >
                              <option>Select Class</option>
                              {classes.map((clas, i) =>
                                clas !== "" ? (
                                  <option key={i} value={clas}>
                                    {clas}
                                  </option>
                                ) : null
                              )}
                            </select>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="block text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                            <select
                              className="form-select-ge"
                              value={period.subject}
                              onChange={(e) => handleChangePeriodSubject(activeTeacherIndex, ind, e.target.value)}
                            >
                              <option value="">Select Subject</option>
                              <option value={activeTeacher.mainSubject}>{activeTeacher.mainSubject}</option>
                              {activeTeacher.subjects.map((sub, subInd) =>
                                sub !== "" && sub !== activeTeacher.mainSubject ? (
                                  <option key={subInd} value={sub}>
                                    {sub}
                                  </option>
                                ) : null
                              )}
                            </select>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="block text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">No. of Periods / Week</label>
                            <input
                              type="number"
                              className="form-input-ge"
                              placeholder="e.g., 4"
                              value={period.noOfPeriods || ""}
                              onChange={(e) => handleChangePeriodNumber(activeTeacherIndex, ind, e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleAddPeriod(activeTeacherIndex)}
                    className="flex items-center justify-center gap-1.5 p-2 px-4 border border-dashed border-[#57f1db]/40 hover:border-[#57f1db] rounded-xl text-[#57f1db] text-xs font-bold bg-[#57f1db]/5 hover:bg-[#57f1db]/10 transition-all cursor-pointer"
                    style={{ borderRadius: "12px" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assign another class/period
                  </button>
                </div>

                {/* Teacher Availability Matrix */}
                <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                  <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#57f1db] rounded-full inline-block" />
                    Teacher Availability Matrix
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Click slots to toggle teacher availability. Blocked slots (marked in red) will prevent the solver from scheduling classes for this teacher.
                  </p>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5">
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)" }} />
                      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)" }} />
                      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Blocked (solver will not schedule here)</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3">
                    <table className="border-collapse" style={{ minWidth: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)", minWidth: 70 }}>Day</th>
                          {Array.from({ length: parseInt(periods) || 8 }).map((_, pIndex) => (
                            <th key={pIndex} style={{ padding: "8px 6px", textAlign: "center", fontSize: 10, color: "#475569", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.06)", minWidth: 52 }}>
                              P{pIndex + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: parseInt(workingDays) || 5 }).map((_, dIndex) => {
                          const dayName = dayNames[dIndex] || `Day ${dIndex + 1}`;
                          return (
                            <tr key={dIndex}>
                              <td style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap" }}>{dayName}</td>
                              {Array.from({ length: parseInt(periods) || 8 }).map((_, pIndex) => {
                                const blocked = isSlotBlocked(activeTeacher, dIndex, pIndex);
                                return (
                                  <td key={pIndex} style={{ padding: "4px 4px", textAlign: "center" }}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSlot(activeTeacherIndex, dIndex, pIndex)}
                                      title={`${dayName} · Period ${pIndex + 1}: click to ${blocked ? "unblock" : "block"}`}
                                      style={{
                                        width: 44, height: 44, borderRadius: 10, cursor: "pointer",
                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                                        transition: "all 0.18s",
                                        background: blocked ? "rgba(239,68,68,0.12)" : "rgba(52,211,153,0.06)",
                                        border: blocked ? "1.5px solid rgba(239,68,68,0.55)" : "1.5px solid rgba(52,211,153,0.15)",
                                        boxShadow: blocked ? "0 0 10px rgba(239,68,68,0.12)" : "none",
                                      }}
                                    >
                                      <span style={{ fontSize: 14 }}>{blocked ? "🔒" : "✓"}</span>
                                      <span style={{ fontSize: 8, fontWeight: 700, color: blocked ? "#f87171" : "#6ee7b7", letterSpacing: "0.02em" }}>P{pIndex + 1}</span>
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}

export default AddTeacher;
