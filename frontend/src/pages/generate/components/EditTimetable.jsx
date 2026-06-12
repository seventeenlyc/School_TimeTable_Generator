import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { fetchWithAuth } from "../../../utils/fetchWithAuth";
import { useAuth, useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { ArrowLeft, Save, RotateCcw, HelpCircle } from "lucide-react";
import WizardSteps from "../../components/WizardSteps";
import { getSubjectColor } from "../../../utils/subjectColor";

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

const EditTimetable = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classTimetable, teacherTimetable, id } = location.state || {};
  const { getToken } = useAuth();
  const { user } = useUser();
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [currentClassTimeTable, setCurrentClassTimeTable] =
    useState(classTimetable);
  const [currentTeacherTimeTable, setCurrentTeacherTimeTable] =
    useState(teacherTimetable);

  const [showPositiveMessage, setShowPositiveMessage] = useState(false);
  const [showNegativeMessage, setShowNegativeMessage] = useState(false);

  // Versioning state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveVersionName, setSaveVersionName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Undo history: stack of [classTable, teacherTable] snapshots
  const [history, setHistory] = useState([]);

  // Dynamic configuration based on data or location state
  const [workingDays, setWorkingDays] = useState(5);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);

  const generateDayNames = (numDays) => {
    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return allDays.slice(0, Math.min(numDays, 7)); // Allow up to 7 days
  };

  const generatePeriodNames = (numPeriods) => {
    return Array.from({ length: numPeriods }, (_, i) => `Period ${i + 1}`);
  };

  // Get actual dimensions from current data
  const getCurrentDataDimensions = () => {
    const currentData = currentClassTimeTable;
    if (!currentData || Object.keys(currentData).length === 0) {
      return { maxDays: workingDays, maxPeriods: periodsPerDay };
    }

    let maxDays = 0;
    let maxPeriods = 0;

    Object.values(currentData).forEach(timetableData => {
      if (Array.isArray(timetableData)) {
        maxDays = Math.max(maxDays, timetableData.length);
        timetableData.forEach(dayData => {
          if (Array.isArray(dayData)) {
            maxPeriods = Math.max(maxPeriods, dayData.length);
          }
        });
      }
    });

    return {
      maxDays: maxDays || workingDays,
      maxPeriods: maxPeriods || periodsPerDay
    };
  };

  const { maxDays, maxPeriods } = getCurrentDataDimensions();
  const daysToShow = generateDayNames(maxDays);
  const periodsToShow = generatePeriodNames(maxPeriods);

  useEffect(() => {
    if (classTimetable) {
      setCurrentClassTimeTable(classTimetable);
    }
  }, [classTimetable]);

  useEffect(() => {
    if (teacherTimetable) {
      setCurrentTeacherTimeTable(teacherTimetable);
    }
  }, [teacherTimetable]);

  useEffect(() => {
    if (location.state) {
      if (location.state.workingDays) {
        setWorkingDays(Math.min(parseInt(location.state.workingDays), 7));
      }
      if (location.state.periods) {
        setPeriodsPerDay(Math.max(parseInt(location.state.periods), 1));
      }

      // Auto-detect dimensions from data if not present in state
      const timetableData = classTimetable || teacherTimetable || {};
      const firstClass = Object.values(timetableData)[0];
      if (firstClass && Array.isArray(firstClass)) {
        const detectedDays = firstClass.length;
        const detectedPeriods = firstClass[0]?.length || 8;
        if (!location.state.workingDays) {
          setWorkingDays(Math.min(detectedDays, 7));
        }
        if (!location.state.periods) {
          setPeriodsPerDay(Math.max(detectedPeriods, 1));
        }
      }
    }
  }, [location]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const items = currentClassTimeTable ? Object.keys(currentClassTimeTable) : [];

  // Auto-select first item when data is available
  useEffect(() => {
    if (items.length > 0 && !selectedItem) {
      setSelectedItem(items[0]);
    }
  }, [items, selectedItem]);

  if (!currentClassTimeTable) {
    return (
      <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden mt-[110px]">
        <div className="max-w-full m-0 p-0 w-full min-w-full box-border">
          <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-none p-8 text-[#fca5a5] text-[1.1rem] text-center backdrop-blur-[10px] m-0">
            <div className="text-center p-8 text-[rgba(255,255,255,0.6)] text-base">
              No timetable data available
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [dragSource, setDragSource] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);

  const handleDragStart = (dayIndex, periodIndex) => {
    setDragSource({ dayIndex, periodIndex });
  };

  const handleDragOver = (e, dayIndex, periodIndex) => {
    e.preventDefault();
    setDragOverTarget({ dayIndex, periodIndex });
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDragOverTarget(null);
  };

  const handleDrop = (targetDay, targetPeriod) => {
    if (!dragSource) return;
    const { dayIndex: srcDay, periodIndex: srcPeriod } = dragSource;
    if (srcDay === targetDay && srcPeriod === targetPeriod) {
      handleDragEnd();
      return;
    }
    // Reuse existing swap logic by simulating two-click selection
    setSelectedPeriods([{ dayIndex: srcDay, periodIndex: srcPeriod }, { dayIndex: targetDay, periodIndex: targetPeriod }]);
    handlePeriodSwapDirect(srcDay, srcPeriod, targetDay, targetPeriod);
    handleDragEnd();
  };

  const handlePeriodSwapDirect = (srcDay, srcPeriod, tgtDay, tgtPeriod) => {
    const newClass = JSON.parse(JSON.stringify(currentClassTimeTable));
    const newTeacher = JSON.parse(JSON.stringify(currentTeacherTimeTable));

    const period1 = newClass[selectedItem][srcDay][srcPeriod];
    const period2 = newClass[selectedItem][tgtDay][tgtPeriod];

    let teacher1 = null;
    if (period1 && period1 !== "Free" && period1.includes("(") && period1.includes(")")) {
      teacher1 = period1.split("(")[1].split(")")[0];
    }
    let teacher2 = null;
    if (period2 && period2 !== "Free" && period2.includes("(") && period2.includes(")")) {
      teacher2 = period2.split("(")[1].split(")")[0];
    }

    let isTeacher1Free = true;
    if (teacher1 && newTeacher[teacher1]) {
      const dest = newTeacher[teacher1][tgtDay][tgtPeriod];
      isTeacher1Free = (dest === "Free" || (teacher2 && teacher1 === teacher2));
    } else if (teacher1) {
      isTeacher1Free = false;
    }

    let isTeacher2Free = true;
    if (teacher2 && newTeacher[teacher2]) {
      const dest = newTeacher[teacher2][srcDay][srcPeriod];
      isTeacher2Free = (dest === "Free" || (teacher1 && teacher1 === teacher2));
    } else if (teacher2) {
      isTeacher2Free = false;
    }

    if (isTeacher1Free && isTeacher2Free) {
      setShowPositiveMessage(true);
      setTimeout(() => {
        setShowPositiveMessage(false);
        newClass[selectedItem][srcDay][srcPeriod] = period2;
        newClass[selectedItem][tgtDay][tgtPeriod] = period1;

        const val1_t1 = (teacher1 && newTeacher[teacher1]) ? newTeacher[teacher1][srcDay][srcPeriod] : null;
        const val2_t2 = (teacher2 && newTeacher[teacher2]) ? newTeacher[teacher2][tgtDay][tgtPeriod] : null;

        if (teacher1 && newTeacher[teacher1]) newTeacher[teacher1][srcDay][srcPeriod] = "Free";
        if (teacher2 && newTeacher[teacher2]) newTeacher[teacher2][tgtDay][tgtPeriod] = "Free";
        if (teacher1 && newTeacher[teacher1]) newTeacher[teacher1][tgtDay][tgtPeriod] = val1_t1;
        if (teacher2 && newTeacher[teacher2]) newTeacher[teacher2][srcDay][srcPeriod] = val2_t2;

        setCurrentClassTimeTable(newClass);
        setCurrentTeacherTimeTable(newTeacher);
        setSelectedPeriods([]);
      }, 500);
    } else {
      setShowNegativeMessage(true);
      setTimeout(() => {
        setShowNegativeMessage(false);
        setSelectedPeriods([]);
      }, 500);
    }
  };

  const handlePeriodSwap = (dayIndex, periodIndex) => {
    const alreadySelected = selectedPeriods.some(
      (sel) => sel.dayIndex === dayIndex && sel.periodIndex === periodIndex
    );

    let newSelected;

    if (alreadySelected) {
      newSelected = selectedPeriods.filter(
        (sel) => sel.dayIndex !== dayIndex || sel.periodIndex !== periodIndex
      );
    } else {
      newSelected = [...selectedPeriods, { dayIndex, periodIndex }];
    }

    setSelectedPeriods(newSelected);

    if (newSelected.length === 2) {
      const [first, second] = newSelected;

      const newClass = JSON.parse(JSON.stringify(currentClassTimeTable));
      const newTeacher = JSON.parse(JSON.stringify(currentTeacherTimeTable));

      const period1 = newClass[selectedItem][first.dayIndex][first.periodIndex];
      const period2 =
        newClass[selectedItem][second.dayIndex][second.periodIndex];

      let teacher1 = null;
      if (period1 && period1 !== "Free" && period1 !== "" && period1.includes("(") && period1.includes(")")) {
        teacher1 = period1.split("(")[1].split(")")[0];
      }
      let teacher2 = null;
      if (period2 && period2 !== "Free" && period2 !== "" && period2.includes("(") && period2.includes(")")) {
        teacher2 = period2.split("(")[1].split(")")[0];
      }
      console.log(teacher1, teacher2);

      let isTeacher1Free = true;
      if (teacher1 && newTeacher[teacher1]) {
        const destPeriod = newTeacher[teacher1][second.dayIndex][second.periodIndex];
        isTeacher1Free = (destPeriod === "Free" || (teacher2 && teacher1 === teacher2));
      } else if (teacher1) {
        isTeacher1Free = false;
      }

      let isTeacher2Free = true;
      if (teacher2 && newTeacher[teacher2]) {
        const destPeriod = newTeacher[teacher2][first.dayIndex][first.periodIndex];
        isTeacher2Free = (destPeriod === "Free" || (teacher1 && teacher1 === teacher2));
      } else if (teacher2) {
        isTeacher2Free = false;
      }

      if (isTeacher1Free && isTeacher2Free) {
        setShowPositiveMessage(true);
        setTimeout(() => {
          setShowPositiveMessage(false);
          // Snapshot before mutating
          setHistory(prev => [...prev.slice(-19), {
            classTable: JSON.parse(JSON.stringify(currentClassTimeTable)),
            teacherTable: JSON.parse(JSON.stringify(currentTeacherTimeTable)),
          }]);

          newClass[selectedItem][first.dayIndex][first.periodIndex] = period2;
          newClass[selectedItem][second.dayIndex][second.periodIndex] = period1;

          // Swap teacher periods safely
          const val1_t1 = (teacher1 && newTeacher[teacher1]) ? newTeacher[teacher1][first.dayIndex][first.periodIndex] : null;
          const val2_t2 = (teacher2 && newTeacher[teacher2]) ? newTeacher[teacher2][second.dayIndex][second.periodIndex] : null;

          if (teacher1 && newTeacher[teacher1]) {
            newTeacher[teacher1][first.dayIndex][first.periodIndex] = "Free";
          }
          if (teacher2 && newTeacher[teacher2]) {
            newTeacher[teacher2][second.dayIndex][second.periodIndex] = "Free";
          }

          if (teacher1 && newTeacher[teacher1]) {
            newTeacher[teacher1][second.dayIndex][second.periodIndex] = val1_t1;
          }
          if (teacher2 && newTeacher[teacher2]) {
            newTeacher[teacher2][first.dayIndex][first.periodIndex] = val2_t2;
          }

          setCurrentClassTimeTable(newClass);
          setCurrentTeacherTimeTable(newTeacher);
          setSelectedPeriods([]);
        }, 500);
      } else {
        setShowNegativeMessage(true);
        setTimeout(() => {
          setShowNegativeMessage(false);
          setSelectedPeriods([]);
        }, 500);
      }
    }
  };

  const handleReset = () => {
    setCurrentClassTimeTable(classTimetable);
    setCurrentTeacherTimeTable(teacherTimetable);
    setSelectedPeriods([]);
    setHistory([]);
  };

  const handleUndo = () => {
    if (history.length === 0) {
      toast("Nothing to undo", { icon: "ℹ️" });
      return;
    }
    const prev = history[history.length - 1];
    setCurrentClassTimeTable(prev.classTable);
    setCurrentTeacherTimeTable(prev.teacherTable);
    setHistory(h => h.slice(0, -1));
    setSelectedPeriods([]);
    toast.success("Undo successful");
  };

  // Keyboard shortcuts: Ctrl+Z → undo, Ctrl+S → save
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveClick();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history, currentClassTimeTable, currentTeacherTimeTable]);

  const getValidationData = () => {
    return {
      class_timetable: currentClassTimeTable,
      teacher_timetable: currentTeacherTimeTable,
      workingDays: parseInt(location.state.workingDays) || 5,
      periods: parseInt(location.state.periods) || 8,
      classes: location.state.classes || [],
      subjects: location.state.subjects || [],
      teachers: location.state.teacherData ? location.state.teacherData.map(teacher => ({
        name: teacher.name,
        subjects: teacher.subjects,
        mainSubject: teacher.mainSubject,
        labPeriod: (teacher.labPeriod && teacher.labPeriod !== "Select Lab Period") ? teacher.labPeriod : null,
        assigned_class: (teacher.assigned_class && teacher.assigned_class !== "Select Class") ? teacher.assigned_class : null,
        periods: teacher.periods.map(p => ({
          class_name: p.class_name,
          subject: p.subject,
          noOfPeriods: p.noOfPeriods
        })),
        unavailable_slots: teacher.unavailable_slots || []
      })) : []
    };
  };

  const checkValidation = async (validationData) => {
    const token = await getToken();
    const validationResponse = await fetchWithAuth(
      token,
      `${import.meta.env.VITE_API_BASE_URL}/validate-edit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validationData),
      }
    );

    if (!validationResponse.ok) {
      throw new Error("Validation check failed on the server.");
    }

    const validationResult = await validationResponse.json();
    if (!validationResult.valid) {
      validationResult.errors.forEach(err => {
        toast.error(err, { duration: 6000 });
      });
      return false;
    }

    if (validationResult.warnings && validationResult.warnings.length > 0) {
      validationResult.warnings.forEach(warn => {
        toast.error(`Warning: ${warn}`, { duration: 5000, icon: "⚠️" });
      });
    }
    return true;
  };

  const handleSaveClick = () => {
    const currentVersion = location.state?.versionName || "v1";
    let nextVersion = "v2";
    if (currentVersion.startsWith("v")) {
      const num = parseInt(currentVersion.substring(1));
      if (!isNaN(num)) {
        nextVersion = `v${num + 1}`;
      }
    } else {
      nextVersion = `${currentVersion} (New)`;
    }
    setSaveVersionName(nextVersion);
    setShowSaveModal(true);
  };

  const handleOverwrite = async () => {
    setIsSaving(true);
    try {
      const validationData = getValidationData();
      const isValid = await checkValidation(validationData);
      if (!isValid) return;

      const token = await getToken();
      const timetableData = {
        class_timetable: currentClassTimeTable,
        teacher_timetable: currentTeacherTimeTable,
        teacherData: location.state.teacherData,
        classes: location.state.classes,
        subjects: location.state.subjects,
        workingDays: location.state.workingDays,
        periods: location.state.periods,
        title: location.state.title,
        userId: user.id,
        versionName: location.state.versionName || "v1",
        parentGroupId: location.state.parentGroupId || id,
      };

      const response = await fetchWithAuth(
        token,
        `${import.meta.env.VITE_API_BASE_URL}/update-timetable/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(timetableData),
        }
      );
      const result = await response.json();
      toast.success("Timetable updated successfully");
      setShowSaveModal(false);
      navigate(`/display/${id}`, {
        state: {
          classTimetable: timetableData.class_timetable,
          teacherTimetable: timetableData.teacher_timetable,
          timetableId: id,
          teacherData: result.teacherData,
          classes: result.classes,
          subjects: result.subjects,
          workingDays: result.workingDays,
          periods: result.periods,
          title: result.title,
          versionName: result.versionName || "v1",
          parentGroupId: result.parentGroupId || id,
        },
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsNewVersion = async () => {
    if (!saveVersionName.trim()) {
      toast.error("Please enter a version name");
      return;
    }
    setIsSaving(true);
    try {
      const validationData = getValidationData();
      const isValid = await checkValidation(validationData);
      if (!isValid) return;

      const token = await getToken();
      const timetableData = {
        class_timetable: currentClassTimeTable,
        teacher_timetable: currentTeacherTimeTable,
        teacherData: location.state.teacherData,
        classes: location.state.classes,
        subjects: location.state.subjects,
        workingDays: location.state.workingDays,
        periods: location.state.periods,
        title: location.state.title,
        userId: user.id,
        versionName: saveVersionName.trim(),
        parentGroupId: location.state.parentGroupId || id,
      };

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
      toast.success(`Saved new version: ${saveVersionName}`);
      setShowSaveModal(false);
      navigate(`/display/${result._id}`, {
        state: {
          classTimetable: timetableData.class_timetable,
          teacherTimetable: timetableData.teacher_timetable,
          timetableId: result._id,
          teacherData: result.teacherData,
          classes: result.classes,
          subjects: result.subjects,
          workingDays: result.workingDays,
          periods: result.periods,
          title: result.title,
          versionName: result.versionName,
          parentGroupId: result.parentGroupId,
        },
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const formatPeriodContent = (period) => {
    if (period.includes("(") && period.includes(")")) {
      const parts = period.split("(");
      const subject = parts[0].trim();
      const teacher = parts[1].replace(")", "").trim();
      const col = getSubjectColor(subject);
      return (
        <div className="flex flex-col items-center justify-center gap-0.5 py-1" style={{ color: col.text }}>
          <span className="font-extrabold text-[0.825rem] tracking-wide leading-tight" style={{ color: col.text }}>{subject}</span>
          <span className="text-[0.65rem] font-medium tracking-normal" style={{ color: col.text, opacity: 0.7 }}>{teacher}</span>
        </div>
      );
    }
    return <span className="font-extrabold text-[0.825rem] tracking-wide text-white">{period}</span>;
  };

  const renderTimetable = (data) => {
    if (!data || data.length === 0) {
      return (
        <div className="p-8 text-[#fca5a5] text-base text-center backdrop-blur-[10px]"
          style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.1) 100%)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "16px"
          }}
        >
          No data available
        </div>
      );
    }

    // Get actual dimensions from this specific timetable data
    const actualDays = data.length;
    const actualPeriods = Math.max(...data.map(day => Array.isArray(day) ? day.length : 0));

    // Generate appropriate headers based on actual data
    const daysToShow = generateDayNames(actualDays);
    const periodsToShow = generatePeriodNames(actualPeriods);

    const dayColWidth = "12%";
    const periodColWidth = `${88 / periodsToShow.length}%`;

    return (
      <div className="overflow-x-auto rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] custom-scrollbar">
        <table className="w-full table-fixed border-collapse text-[0.9rem] bg-transparent min-w-[900px] max-md:text-[0.8rem] max-sm:text-[0.75rem]">
          <thead className="bg-slate-900/80">
            <tr>
              <th 
                style={{ width: dayColWidth }}
                className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center font-bold text-[#57f1db] border border-slate-800/80 relative text-[0.85rem] uppercase tracking-wider bg-slate-950/40"
              >
                Day/Period
              </th>
              {periodsToShow.map((period, index) => (
                <th 
                  key={index}
                  style={{ width: periodColWidth }}
                  className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center font-bold text-slate-300 border border-slate-800/80 relative text-[0.85rem] uppercase tracking-wider bg-slate-900/50"
                >
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[rgba(255,255,255,0.01)]">
            {data.map((dayData, dayIndex) => (
              <tr key={dayIndex} className="transition-all duration-300 ease-in-out border-b border-[rgba(255,255,255,0.05)] last:border-b-0 hover:bg-[rgba(255,255,255,0.03)] hover:scale-[1.002]">
                <td className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 font-extrabold text-white bg-gradient-to-r from-[#0f4c75]/80 to-[#3282b8]/60 border border-slate-800/60 text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] text-sm tracking-wide">
                  {daysToShow[dayIndex] || `Day ${dayIndex + 1}`}
                </td>
                {/* Render all periods, padding with "Free" if necessary */}
                {Array.from({ length: actualPeriods }, (_, periodIndex) => {
                  const isSelected = selectedPeriods.some(
                    (sel) => sel.dayIndex === dayIndex && sel.periodIndex === periodIndex
                  );
                  const period = dayData[periodIndex];

                  const isDragSrc = dragSource?.dayIndex === dayIndex && dragSource?.periodIndex === periodIndex;
                  const isDragOver = dragOverTarget?.dayIndex === dayIndex && dragOverTarget?.periodIndex === periodIndex;

                  return (
                    <td
                      key={periodIndex}
                      draggable
                      onDragStart={() => handleDragStart(dayIndex, periodIndex)}
                      onDragOver={(e) => handleDragOver(e, dayIndex, periodIndex)}
                      onDrop={() => handleDrop(dayIndex, periodIndex)}
                      onDragEnd={handleDragEnd}
                      className={`p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center border border-[rgba(255,255,255,0.05)] bg-transparent transition-all duration-300 ease-in-out cursor-grab active:cursor-grabbing relative hover:bg-[rgba(255,255,255,0.03)] ${
                        isSelected ? "selected-cell-pulse" : ""
                      } ${isDragSrc ? "opacity-40 scale-95" : ""} ${isDragOver && !isDragSrc ? "ring-2 ring-[#57f1db]/60 bg-[rgba(87,241,219,0.06)]" : ""}`}
                      onClick={() => handlePeriodSwap(dayIndex, periodIndex)}
                    >
                      {period === "Free" || period === "" || period === undefined || period === null ? (
                        <span className="text-slate-500/60 italic text-[0.85rem] font-medium tracking-wide">Free</span>
                      ) : (() => {
                        const subjectName = period.includes("(") ? period.split("(")[0].trim() : period;
                        const col = getSubjectColor(subjectName);
                        return (
                          <div
                            title={period}
                            className="inline-flex flex-col items-center justify-center py-1.5 px-3 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.2)] transition-all duration-300 w-full max-w-[130px] min-h-[50px] mx-auto hover:scale-[1.03]"
                            style={isSelected ? { background: "transparent", border: "1px solid transparent" } : {
                              background: col.bg,
                              border: `1px solid ${col.border}40`,
                              boxShadow: `0 2px 10px ${col.border}15`,
                            }}
                          >
                            {formatPeriodContent(period)}
                          </div>
                        );
                      })()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden pt-[120px]"
      style={{
        background: "radial-gradient(ellipse 100% 60% at 15% 10%, #081225 0%, #030814 60%, #02050b 100%)",
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
      }}
    >
      <FloatingOrbs />
      <div className="max-w-[1450px] mx-auto px-5 relative z-10" style={{ padding: "3rem", paddingTop: 0 }}>
        <WizardSteps current={4} />
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 mb-4 text-[#57f1db] hover:text-[#38bdf8] transition-colors duration-200 text-sm font-semibold border-none bg-transparent cursor-pointer p-0"
            >
              <ArrowLeft size={16} /> Back to View
            </button>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight m-0">
              Edit Timetable
            </h2>
            <p className="text-sm text-slate-400 mt-2 m-0 max-w-xl">
              {location.state?.title || "Modify saved timetable grid"}
            </p>
          </div>
        </div>

        {/* Shortcut hint bar */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 px-4 py-3 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[
            { keys: ["Ctrl", "Z"], label: "Undo" },
            { keys: ["Ctrl", "S"], label: "Save" },
            { keys: ["Drag"], label: "Swap cells" },
            { keys: ["Click×2"], label: "Swap cells" },
          ].map(({ keys, label }) => (
            <div key={label + keys[0]} className="flex items-center gap-1.5 text-xs text-slate-500">
              {keys.map(k => (
                <kbd key={k} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontFamily: "monospace", color: "#94a3b8" }}>{k}</kbd>
              ))}
              <span style={{ color: "#475569" }}>{label}</span>
            </div>
          ))}
          {history.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: "#57f1db" }}>
              <RotateCcw size={11} />
              <span style={{ fontWeight: 700 }}>{history.length} undo{history.length !== 1 ? "s" : ""} available</span>
            </div>
          )}
        </div>

        {/* Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-center p-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-slate-900/60 rounded-full p-1 backdrop-blur-[12px] border border-slate-800/80 gap-2 w-full sm:w-auto">
              <button
                type="button"
                className="flex items-center gap-2 py-2.5 px-6 border-none text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out text-white relative overflow-hidden bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] hover:scale-[1.02]"
                style={{ borderRadius: "9999px" }}
                onClick={handleSaveClick}
              >
                <Save size={16} />
                Save Changes
              </button>
              <button
                type="button"
                className="flex items-center gap-2 py-2.5 px-6 border-none text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out text-white relative overflow-hidden bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] hover:scale-[1.02]"
                style={{ borderRadius: "9999px" }}
                onClick={handleReset}
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
            <div
              className="m-0 py-2 px-4 rounded-full text-[0.85rem] font-bold transition-all duration-300 ease-in-out min-h-[2.5rem] flex items-center"
              style={{
                borderRadius: "9999px",
                background: showPositiveMessage 
                  ? "rgba(16, 185, 129, 0.1)" 
                  : showNegativeMessage 
                  ? "rgba(239, 68, 68, 0.1)" 
                  : "rgba(255, 255, 255, 0.03)",
                border: showPositiveMessage 
                  ? "1px solid rgba(16, 185, 129, 0.3)" 
                  : showNegativeMessage 
                  ? "1px solid rgba(239, 68, 68, 0.3)" 
                  : "1px solid rgba(255, 255, 255, 0.08)",
                color: showPositiveMessage 
                  ? "#10b981" 
                  : showNegativeMessage 
                  ? "#ef4444" 
                  : "#94a3b8"
              }}
            >
              {showPositiveMessage
                ? "✅ Updating..."
                : showNegativeMessage
                ? "❌ Cannot swap - Teacher conflict"
                : "Ready to edit"}
            </div>
          </div>

          <div className="flex justify-start lg:justify-end">
            <select
              className="item-selector-ett w-full max-w-md"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              style={{ borderRadius: "9999px" }}
            >
              <option value="" style={{ background: "#0a1224" }}>Select Class</option>
              {items.map((item) => (
                <option key={item} value={item} style={{ background: "#0a1224" }}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timetable Card */}
        {selectedItem && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(16, 28, 54, 0.45) 0%, rgba(10, 18, 36, 0.55) 100%)",
              border: "1px solid rgba(87, 241, 219, 0.12)",
              borderRadius: "24px",
              backdropFilter: "blur(24px)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
            }}
            className="overflow-hidden transition-all duration-300 hover:border-teal-500/25 mb-8 w-full mx-0"
          >
            <div className="flex justify-between items-center py-5 px-6 bg-slate-900/30 border-b border-[rgba(255,255,255,0.06)] flex-wrap gap-4 max-md:flex-col max-md:items-stretch">
              <h4 className="text-xl font-bold text-white m-0 [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-sm:text-lg">
                Class: {selectedItem}
              </h4>
            </div>
            <div className="py-6 px-4 max-sm:py-4">
              {renderTimetable(currentClassTimeTable[selectedItem])}
            </div>
          </div>
        )}

        {/* No Selection Alert */}
        {!selectedItem && (
          <div className="p-8 text-[#93c5fd] text-base text-center backdrop-blur-[10px] m-0 mb-8"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.1) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "20px"
            }}
          >
            Please select a class to view and edit the timetable
          </div>
        )}
      </div>

      {/* Save Version Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
          <div 
            style={{
              background: "linear-gradient(135deg, #0f1c3f 0%, #070e24 100%)",
              border: "1px solid rgba(87, 241, 219, 0.2)",
              borderRadius: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
            className="w-full max-w-md p-6 relative overflow-hidden"
          >
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#57f1db] rounded-full inline-block" />
              Save Options
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Choose whether to update your existing draft or preserve history by saving as a new version.
            </p>

            <div className="space-y-4">
              {/* Overwrite option */}
              <button
                type="button"
                onClick={handleOverwrite}
                disabled={isSaving}
                className="w-full text-left p-4 rounded-2xl border border-slate-700/80 hover:border-teal-500/50 bg-slate-900/40 hover:bg-teal-500/5 transition-all duration-300 cursor-pointer flex flex-col gap-1 disabled:opacity-50"
              >
                <span className="text-sm font-bold text-white">Overwrite Current Draft</span>
                <span className="text-[10px] text-slate-400">Updates the active schedule with your modifications.</span>
              </button>

              {/* Separator line */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-slate-800" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Or</span>
                <div className="flex-1 h-[1px] bg-slate-800" />
              </div>

              {/* Save as New Version Option */}
              <div className="p-4 rounded-2xl border border-slate-700/80 bg-slate-900/40 space-y-3">
                <span className="text-sm font-bold text-white block">Save as New Version</span>
                <span className="text-[10px] text-slate-400 block mb-1">Creates a separate revision. Good for comparing variations.</span>
                
                <input
                  type="text"
                  placeholder="e.g., v2, Draft 2, Science Focused"
                  value={saveVersionName}
                  onChange={(e) => setSaveVersionName(e.target.value)}
                  className="w-full p-2.5 border border-slate-700 rounded-xl bg-slate-950 text-white text-xs focus:outline-none focus:border-[#57f1db] placeholder:text-slate-600 transition-colors"
                />

                <button
                  type="button"
                  onClick={handleSaveAsNewVersion}
                  disabled={isSaving}
                  className="w-full py-2.5 bg-gradient-to-r from-[#3282b8] to-[#00ff87] text-[#051424] text-xs font-bold rounded-xl border-none cursor-pointer hover:scale-[1.02] active:scale-100 transition-all shadow-[0_4px_15px_rgba(50,130,184,0.2)] disabled:opacity-50"
                >
                  {isSaving ? "Saving Version..." : "Confirm & Save Version"}
                </button>
              </div>
            </div>

            {/* Close / Cancel Button */}
            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTimetable;
