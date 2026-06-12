import {
  BookOpen,
  FileText,
  Plus,
  ExternalLink,
  Edit,
  Trash,
  Users,
  CalendarDays
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import Orb from "../../../styles/orb/Orb";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import { useAuth, useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";


const getClassCount = (timetable) => {
  if (timetable.classes && Array.isArray(timetable.classes)) {
    return timetable.classes.length;
  }
  if (timetable.class_timetable) {
    return Object.keys(timetable.class_timetable).length;
  }
  return 0;
};

const getTeacherCount = (timetable) => {
  if (timetable.teacherData && Array.isArray(timetable.teacherData)) {
    return timetable.teacherData.length;
  }
  if (timetable.teacher_timetable) {
    return Object.keys(timetable.teacher_timetable).length;
  }
  return 0;
};

const getDynamicSubjectsList = (timetable) => {
  if (timetable.subjects && Array.isArray(timetable.subjects) && timetable.subjects.length > 0) {
    return timetable.subjects;
  }
  const subjectsSet = new Set();
  if (timetable.class_timetable) {
    Object.values(timetable.class_timetable).forEach((daysList) => {
      if (Array.isArray(daysList)) {
        daysList.forEach((dayList) => {
          if (Array.isArray(dayList)) {
            dayList.forEach((cell) => {
              if (cell && cell !== "Free" && cell !== "") {
                const parts = cell.split("(");
                if (parts.length > 0) {
                  subjectsSet.add(parts[0].trim());
                }
              }
            });
          }
        });
      }
    });
  }
  return Array.from(subjectsSet);
};

const getWorkingDaysCount = (timetable) => {
  if (Array.isArray(timetable.workingDays)) {
    return timetable.workingDays.length;
  }
  if (typeof timetable.workingDays === "number") {
    return timetable.workingDays;
  }
  if (typeof timetable.workingDays === "string") {
    const parsed = parseInt(timetable.workingDays);
    if (!isNaN(parsed)) return parsed;
    return timetable.workingDays.length;
  }
  if (timetable.class_timetable) {
    const classes = Object.keys(timetable.class_timetable);
    if (classes.length > 0) {
      const firstClass = timetable.class_timetable[classes[0]];
      if (Array.isArray(firstClass)) {
        return firstClass.length;
      }
    }
  }
  return 0;
};

const getPeriodCount = (timetable) => {
  if (Array.isArray(timetable.periods)) {
    return timetable.periods.length;
  }
  if (typeof timetable.periods === "number") {
    return timetable.periods;
  }
  if (typeof timetable.periods === "string") {
    const parsed = parseInt(timetable.periods);
    if (!isNaN(parsed)) return parsed;
    return timetable.periods.length;
  }
  if (timetable.class_timetable) {
    const classes = Object.keys(timetable.class_timetable);
    if (classes.length > 0) {
      const firstClass = timetable.class_timetable[classes[0]];
      if (Array.isArray(firstClass) && firstClass.length > 0 && Array.isArray(firstClass[0])) {
        return firstClass[0].length;
      }
    }
  }
  return 0;
};

function DashbordPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, isSignedIn } = useUser();
  const [timetables, setTimetables] = useState([]);
  const [activeVersions, setActiveVersions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const { getToken } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const updateName = async () => {
      if (isSignedIn && user && state && typeof state.name === "string" && state.name.trim() !== "") {
        try {
          await user.update({ firstName: state.name });
        } catch (error) {
          console.error("Update failed:", error);
        }
      } else {
        console.log("Invalid or missing name, skipping update.");
      }
    };

    updateName();
  }, [user, isSignedIn, state?.name]);

  useEffect(() => {
    const fetchTimetables = async () => {
      setIsLoading(true);
      try {
        if (isSignedIn) {
          const token = await getToken();
          const res = await fetchWithAuth(
            token,
            `${import.meta.env.VITE_API_BASE_URL}/get-timetables/${user.id}`
          );
          const data = await res.json();
          setTimetables(data);

          // Initialize active versions to point to newest version of each parentGroupId group
          const initialActive = {};
          const grouped = {};
          data.forEach((t) => {
            const groupId = t.parentGroupId || t._id;
            if (!grouped[groupId]) {
              grouped[groupId] = [];
            }
            grouped[groupId].push(t);
          });

          Object.keys(grouped).forEach((groupId) => {
            grouped[groupId].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            initialActive[groupId] = grouped[groupId][0]._id;
          });
          setActiveVersions(initialActive);
        }
      } catch (error) {
        console.log("Error fetching timetables:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetables();
  }, [isSignedIn, user]);

  const handleDelete = async (timetableId) => {
    try {
      setDeletingId(timetableId);
      const token = await getToken();
      await fetchWithAuth(
        token,
        `${import.meta.env.VITE_API_BASE_URL}/delete-timetable/${timetableId}`,
        { method: "DELETE" }
      );
      
      setTimetables((prev) =>
        prev.filter((timetable) => timetable._id !== timetableId)
      );
      toast.success("Schedule version deleted successfully");
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete schedule version");
    } finally {
      setDeletingId("");
    }
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const welcomeName = isSignedIn && user?.firstName ? user.firstName : "Academic Planner";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 100% 60% at 15% 10%, #081225 0%, #030814 60%, #02050b 100%)",
        color: "#d4e4fa",
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
        overflowX: "hidden",
        position: "relative",
        paddingTop: "110px",
        paddingBottom: "80px",
      }}
    >
      <style>{`
        .create-card:hover { transform: translateY(-5px); border-color: rgba(87, 241, 219, 0.3) !important; box-shadow: 0 40px 80px rgba(0, 0, 0, 0.7), 0 0 30px rgba(87, 241, 219, 0.05) !important; }
        .timetable-card { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important; }
        .timetable-card:hover { transform: translateY(-4px) scale(1.01) !important; background: linear-gradient(135deg, rgba(16, 32, 60, 0.65) 0%, rgba(10, 20, 40, 0.8) 100%) !important; border-color: rgba(87, 241, 219, 0.35) !important; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(87, 241, 219, 0.08) !important; }
        .timetable-card-icon-container { transition: all 0.3s ease; }
        .timetable-card:hover .timetable-card-icon-container { transform: scale(1.08); background-color: rgba(87, 241, 219, 0.18) !important; box-shadow: 0 0 15px rgba(87, 241, 219, 0.15); }
        .delete-btn { transition: all 0.3s ease !important; }
        .delete-btn:hover { background: rgba(244, 63, 94, 0.2) !important; border-color: #f43f5e !important; transform: scale(1.08) !important; box-shadow: 0 0 15px rgba(244, 63, 94, 0.4) !important; }
        .config-btn { transition: all 0.3s ease !important; }
        .config-btn:hover { background: rgba(167, 139, 250, 0.25) !important; border-color: #a78bfa !important; transform: translateY(-1px) !important; box-shadow: 0 4px 15px rgba(167, 139, 250, 0.2) !important; }
      `}</style>

      <div className="max-w-[1200px] mx-auto px-5">
        
        {/* Welcome Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight m-0">
              Welcome back, <span className="text-[#57f1db] font-black">{welcomeName}</span>!
            </h1>
            <p className="text-sm md:text-base text-slate-400 mt-1.5 m-0">
              Access and manage your optimized timetable configurations.
            </p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 text-slate-300">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Main Area: Recent Timetables */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-xl md:text-2xl font-black m-0"
                style={{
                  background: "linear-gradient(90deg, #57f1db 0%, #a78bfa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.02em",
                }}
              >
                Recent Schedules
              </h3>
              {timetables.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {timetables.length} Saved
                </span>
              )}
            </div>

            {(isLoading || !isSignedIn) && (
              <div
                className="w-full flex gap-4 items-center justify-center p-12"
                style={{
                  background: "rgba(10, 18, 36, 0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "20px",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div className="w-8 h-8 border-3 border-[rgba(87,241,219,0.15)] border-t-[#57f1db] rounded-full animate-spin" />
                <p className="text-[1.15rem] m-0 text-[#64748b] font-semibold">Loading schedules...</p>
              </div>
            )}

            {!isLoading && isSignedIn && timetables.length === 0 && (
              <div
                className="w-full flex flex-col items-center justify-center p-12 text-center"
                style={{
                  background: "rgba(10, 18, 36, 0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "20px",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div className="p-4 rounded-full bg-slate-800/50 text-slate-500 mb-4">
                  <FileText size={40} />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">No schedules generated yet</h4>
                <p className="text-sm text-slate-400 max-w-sm mb-6 m-0 leading-relaxed">
                  Ready to construct a clash-free school timetable? Create a new schedule using the creator in the sidebar.
                </p>
                <button
                  className="bg-transparent text-xs font-extrabold py-2 px-6 transition-all duration-300 bg-gradient-to-r from-[#3282b8] to-[#00ff87] text-[#051424] rounded-full shadow-[0_4px_12px_rgba(50,130,184,0.25)] hover:scale-[1.02] cursor-pointer"
                  onClick={() => navigate("/generate")}
                >
                  Get Started
                </button>
              </div>
            )}
            {!isLoading && isSignedIn && timetables.length > 0 && (() => {
              const groupedTimetables = {};
              timetables.forEach((t) => {
                const groupId = t.parentGroupId || t._id;
                if (!groupedTimetables[groupId]) {
                  groupedTimetables[groupId] = [];
                }
                groupedTimetables[groupId].push(t);
              });

              Object.keys(groupedTimetables).forEach((groupId) => {
                groupedTimetables[groupId].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              });

              const groupIds = Object.keys(groupedTimetables).sort((a, b) => {
                const dateA = new Date(groupedTimetables[a][0].createdAt);
                const dateB = new Date(groupedTimetables[b][0].createdAt);
                return dateB - dateA;
              });

              return (
                <div className="space-y-4">
                  {groupIds.map((groupId) => {
                    const groupVersions = groupedTimetables[groupId];
                    const activeId = activeVersions[groupId] || groupVersions[0]._id;
                    const timetable = timetables.find(t => t._id === activeId) || groupVersions[0];

                    const classesList = timetable.classes && timetable.classes.length > 0 ? timetable.classes : Object.keys(timetable.class_timetable || {});
                    const teachersList = timetable.teacherData && timetable.teacherData.length > 0 ? timetable.teacherData : Object.keys(timetable.teacher_timetable || {});
                    const subjectsList = getDynamicSubjectsList(timetable);

                    const classCount = classesList.length;
                    const teacherCount = teachersList.length;
                    const subjectCount = subjectsList.length;
                    const workingDaysCount = getWorkingDaysCount(timetable);
                    const periodCount = getPeriodCount(timetable);

                    const displayState = {
                      classTimetable: timetable.class_timetable,
                      teacherTimetable: timetable.teacher_timetable,
                      timetableId: timetable._id.toString(),
                      teacherData: timetable.teacherData,
                      classes: classesList,
                      subjects: subjectsList,
                      workingDays: workingDaysCount,
                      periods: periodCount,
                      title: timetable.title,
                      versionName: timetable.versionName || "v1",
                      parentGroupId: timetable.parentGroupId || groupId,
                    };

                    return (
                      <div
                        key={groupId}
                        className="group relative p-6 rounded-[24px] cursor-pointer transition-all duration-300 ease-in-out timetable-card flex flex-col justify-between gap-5"
                        style={{
                          background: "linear-gradient(135deg, rgba(16, 28, 54, 0.45) 0%, rgba(10, 18, 36, 0.55) 100%)",
                          border: "1px solid rgba(87, 241, 219, 0.08)",
                          backdropFilter: "blur(10px)",
                          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)"
                        }}
                        onClick={() => navigate(`/display/${timetable._id}`, { state: displayState })}
                      >
                        {/* Top Header Row */}
                        <div className="flex justify-between items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-3.5">
                            <div className="timetable-card-icon-container p-3 rounded-2xl bg-teal-500/10 text-[#57f1db] flex items-center justify-center border border-teal-500/15">
                              <CalendarDays size={20} />
                            </div>
                            <div>
                              <p className="text-[1.2rem] m-0 text-white font-bold group-hover:text-[#57f1db] transition-colors leading-snug">{timetable.title}</p>
                              <p className="text-xs text-slate-400 mt-1 m-0">
                                Created on {timetable.createdAt.split("T")[0]} at{" "}
                                {timetable.createdAt.split("T")[1].slice(0, 5)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Version Selector Dropdown */}
                            {groupVersions.length > 1 && (
                              <select
                                value={activeId}
                                onChange={(e) => {
                                  setActiveVersions(prev => ({
                                    ...prev,
                                    [groupId]: e.target.value
                                  }));
                                }}
                                className="bg-slate-800/80 border border-slate-700/80 text-[#57f1db] text-xs font-bold px-3 py-1.5 rounded-full outline-none cursor-pointer focus:border-[#57f1db] hover:bg-slate-700/80"
                                style={{ borderRadius: "9999px" }}
                              >
                                {groupVersions.map((v) => (
                                  <option key={v._id} value={v._id} style={{ background: "#0a1224" }}>
                                    {v.versionName || "v1"}
                                  </option>
                                ))}
                              </select>
                            )}

                            {groupVersions.length === 1 && (
                              <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-800/50 border border-slate-700/80 text-slate-400 rounded-full">
                                {timetable.versionName || "v1"}
                              </span>
                            )}

                            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/80 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300">
                              <span className="text-[#57f1db] font-extrabold">{workingDaysCount}</span> Days
                              <span className="text-slate-500">·</span>
                              <span className="text-[#a78bfa] font-extrabold">{periodCount}</span> Periods
                            </div>
                            
                            {deletingId === timetable._id ? (
                              <div className="w-9 h-9 flex items-center justify-center border border-red-500/20 bg-red-950/10 rounded-full" style={{ borderRadius: "9999px" }}>
                                <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                              </div>
                            ) : (
                              <button
                                title="Delete Active Version"
                                className="delete-btn text-slate-400 hover:text-[#f43f5e] cursor-pointer p-2.5 rounded-full hover:bg-[#f43f5e]/10 border border-slate-700/50 hover:border-[#f43f5e]/25 flex items-center justify-center bg-slate-800/40 w-9 h-9"
                                style={{ borderRadius: "9999px" }}
                                onClick={() => handleDelete(timetable._id)}
                              >
                                <Trash size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Middle metadata chips row */}
                        <div className="flex flex-wrap gap-3 py-0.5">
                          <div className="flex-1 min-w-[90px] flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-teal-500/5 border border-teal-500/10 transition-all hover:bg-teal-500/10 hover:border-teal-500/20">
                            <span className="text-xs text-teal-400/70 font-semibold tracking-wider uppercase text-[0.65rem]">Classes</span>
                            <span className="text-base font-black text-[#57f1db] tracking-tight">{classCount}</span>
                          </div>
                          <div className="flex-1 min-w-[90px] flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-purple-500/5 border border-purple-500/10 transition-all hover:bg-purple-500/10 hover:border-purple-500/20">
                            <span className="text-xs text-purple-400/70 font-semibold tracking-wider uppercase text-[0.65rem]">Teachers</span>
                            <span className="text-base font-black text-[#a78bfa] tracking-tight">{teacherCount}</span>
                          </div>
                          <div className="flex-1 min-w-[90px] flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-sky-500/5 border border-sky-500/10 transition-all hover:bg-sky-500/10 hover:border-sky-500/20">
                            <span className="text-xs text-sky-400/70 font-semibold tracking-wider uppercase text-[0.65rem]">Subjects</span>
                            <span className="text-base font-black text-[#38bdf8] tracking-tight">{subjectCount}</span>
                          </div>
                        </div>

                        {/* Footer Actions Row */}
                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                          <span 
                            onClick={() => navigate(`/display/${timetable._id}`, { state: displayState })}
                            className="text-[0.8rem] font-bold text-[#57f1db] hover:text-[#00ff87] hover:underline flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            Open Schedule <ExternalLink size={14} />
                          </span>
                          <button
                            onClick={() => navigate("/edit-timetable", { state: displayState })}
                            className="config-btn text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                            style={{ borderRadius: "9999px" }}
                          >
                            <Edit size={13} className="text-[#a78bfa]" /> Configuration
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-6">
            
            {/* Sidebar Card 1: Create CTA */}
            <div
              className="create-card"
              style={{
                background: "rgba(10, 18, 36, 0.45)",
                border: "1px solid rgba(87, 241, 219, 0.15)",
                borderRadius: "24px",
                padding: "24px",
                transition: "all 0.3s ease-in-out",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <h4 className="text-lg font-bold text-white mb-2">Create New Schedule</h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Launch our interactive setup builder to specify your constraints, classrooms, teachers, and compile.
              </p>
              
              <div className="w-full h-[220px] relative flex justify-center items-center">
                <Orb
                  hoverIntensity={0.5}
                  rotateOnHover={true}
                  hue={170}
                  forceHoverState={false}
                >
                  <div
                    onClick={() => navigate("/generate")}
                    style={{ cursor: "pointer", background: "linear-gradient(90deg,#57f1db,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                    className="text-lg font-black text-center [text-shadow:0_0_20px_rgba(87,241,219,0.2)] flex flex-col items-center gap-1"
                  >
                    <Plus size={20} className="text-[#57f1db] mb-1" />
                    <span>Create Now</span>
                  </div>
                </Orb>
              </div>
            </div>

            {/* Sidebar Card 2: Rules & Documentation */}
            <div style={{
              background: "rgba(10, 18, 36, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "20px",
              padding: "24px",
              backdropFilter: "blur(10px)",
            }}>
              <h4 className="text-md font-bold text-white mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-[#a78bfa]" />
                <span>Configuration Tips</span>
              </h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Our timetabling engine runs mathematical checks. To get the best results:
              </p>
              <ul className="text-xs text-slate-350 space-y-2.5 pl-4 list-disc mb-4 leading-relaxed">
                <li>Assign base classrooms to avoid teacher transit conflicts.</li>
                <li>Verify period count requirements per subject.</li>
                <li>Set teacher workload availability metrics carefully.</li>
              </ul>
              <button
                onClick={() => navigate("/guide")}
                className="w-full text-xs font-bold py-2.5 px-4 rounded-full bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/25 transition-all text-center cursor-pointer"
                style={{ borderRadius: "9999px" }}
              >
                Read Configuration Guide
              </button>
            </div>

          </div>
          
        </div>

      </div>
    </div>
  );
}

export default DashbordPage;