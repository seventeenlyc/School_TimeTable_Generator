import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import WizardSteps from "../components/WizardSteps";

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

function GeneratePage() {
  const [workingDays, setWorkingDays] = useState("");
  const [periods, setPeriods] = useState("");
  const [title, setTitle] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const setupData = [
      { Title: "Spring 2026 Term", WorkingDays: 5, PeriodsPerDay: 8 }
    ];
    const wsSetup = XLSX.utils.json_to_sheet(setupData);
    XLSX.utils.book_append_sheet(wb, wsSetup, "Setup");

    const classesData = [
      { ClassName: "10A" },
      { ClassName: "10B" },
      { ClassName: "11A" }
    ];
    const wsClasses = XLSX.utils.json_to_sheet(classesData);
    XLSX.utils.book_append_sheet(wb, wsClasses, "Classes");

    const subjectsData = [
      { SubjectName: "Mathematics" },
      { SubjectName: "Physics" },
      { SubjectName: "Chemistry" },
      { SubjectName: "CS Lab" }
    ];
    const wsSubjects = XLSX.utils.json_to_sheet(subjectsData);
    XLSX.utils.book_append_sheet(wb, wsSubjects, "Subjects");

    const teachersData = [
      {
        TeacherName: "Mr. Green",
        MainSubject: "Mathematics",
        LabSubject: "",
        AssignedClass: "10A",
        UnavailableSlots: "0,0;0,1"
      },
      {
        TeacherName: "Mrs. Smith",
        MainSubject: "Physics",
        LabSubject: "CS Lab",
        AssignedClass: "",
        UnavailableSlots: ""
      }
    ];
    const wsTeachers = XLSX.utils.json_to_sheet(teachersData);
    XLSX.utils.book_append_sheet(wb, wsTeachers, "Teachers");

    const workloadsData = [
      { TeacherName: "Mr. Green", ClassName: "10A", SubjectName: "Mathematics", NoOfPeriods: 5 },
      { TeacherName: "Mr. Green", ClassName: "10B", SubjectName: "Mathematics", NoOfPeriods: 4 },
      { TeacherName: "Mrs. Smith", ClassName: "10A", SubjectName: "Physics", NoOfPeriods: 3 },
      { TeacherName: "Mrs. Smith", ClassName: "10A", SubjectName: "CS Lab", NoOfPeriods: 2 }
    ];
    const wsWorkloads = XLSX.utils.json_to_sheet(workloadsData);
    XLSX.utils.book_append_sheet(wb, wsWorkloads, "Workloads");

    XLSX.writeFile(wb, "Timetable_Template.xlsx");
    toast.success("Template downloaded successfully!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        let parsedWorkingDays = "5";
        let parsedPeriods = "8";
        let parsedTitle = "Imported Timetable";
        if (workbook.SheetNames.includes("Setup")) {
          const setupSheet = workbook.Sheets["Setup"];
          const setupRows = XLSX.utils.sheet_to_json(setupSheet);
          if (setupRows.length > 0) {
            const row = setupRows[0];
            parsedWorkingDays = String(row.WorkingDays || row.workingDays || "5");
            parsedPeriods = String(row.PeriodsPerDay || row.periods || "8");
            parsedTitle = String(row.Title || row.title || "Imported Timetable");
          }
        }

        let parsedClasses = [];
        if (workbook.SheetNames.includes("Classes")) {
          const classesSheet = workbook.Sheets["Classes"];
          const classesRows = XLSX.utils.sheet_to_json(classesSheet);
          parsedClasses = classesRows
            .map(row => String(row.ClassName || row.name || "").trim())
            .filter(name => name !== "");
        }

        let parsedSubjects = [];
        if (workbook.SheetNames.includes("Subjects")) {
          const subjectsSheet = workbook.Sheets["Subjects"];
          const subjectsRows = XLSX.utils.sheet_to_json(subjectsSheet);
          parsedSubjects = subjectsRows
            .map(row => String(row.SubjectName || row.name || "").trim())
            .filter(name => name !== "");
        }

        let parsedWorkloads = [];
        if (workbook.SheetNames.includes("Workloads")) {
          const workloadsSheet = workbook.Sheets["Workloads"];
          parsedWorkloads = XLSX.utils.sheet_to_json(workloadsSheet);
        }

        let parsedTeachers = [];
        if (workbook.SheetNames.includes("Teachers")) {
          const teachersSheet = workbook.Sheets["Teachers"];
          const teachersRows = XLSX.utils.sheet_to_json(teachersSheet);
          
          parsedTeachers = teachersRows.map(row => {
            const name = String(row.TeacherName || row.name || "").trim();
            const mainSubject = String(row.MainSubject || row.mainSubject || "").trim();
            const labPeriod = String(row.LabSubject || row.labSubject || row.labPeriod || "").trim();
            const assigned_class = String(row.AssignedClass || row.assignedClass || row.assigned_class || "").trim();
            
            const unavailableStr = String(row.UnavailableSlots || row.unavailableSlots || "").trim();
            let unavailable_slots = [];
            if (unavailableStr) {
              const slotsParts = unavailableStr.split(";");
              slotsParts.forEach(part => {
                const coords = part.split(",");
                if (coords.length === 2) {
                  const d = parseInt(coords[0]);
                  const p = parseInt(coords[1]);
                  if (!isNaN(d) && !isNaN(p)) {
                    unavailable_slots.push([d, p]);
                  }
                }
              });
            }

            const teacherWorkloads = parsedWorkloads.filter(w => 
              String(w.TeacherName || w.teacherName || "").trim().toLowerCase() === name.toLowerCase()
            );

            const periods = teacherWorkloads.map(w => ({
              class_name: String(w.ClassName || w.className || "").trim(),
              subject: String(w.SubjectName || w.subjectName || "").trim(),
              noOfPeriods: parseInt(w.NoOfPeriods || w.noOfPeriods) || 0
            })).filter(p => p.class_name !== "" && p.subject !== "" && p.noOfPeriods > 0);

            const subjectsSet = new Set();
            if (mainSubject) subjectsSet.add(mainSubject);
            if (labPeriod) subjectsSet.add(labPeriod);
            periods.forEach(p => subjectsSet.add(p.subject));

            return {
              name,
              mainSubject,
              labPeriod: labPeriod || "Select Lab Period",
              assigned_class: assigned_class || "Select Class",
              subjects: Array.from(subjectsSet),
              periods: periods.length > 0 ? periods : [{ class_name: "", subject: mainSubject || "", noOfPeriods: "" }],
              unavailable_slots
            };
          }).filter(t => t.name !== "");
        }

        setWorkingDays(parsedWorkingDays);
        setPeriods(parsedPeriods);
        setTitle(parsedTitle);
        
        if (parsedClasses.length > 0) {
          setClasses(parsedClasses);
        }
        if (parsedSubjects.length > 0) {
          setSubjects(parsedSubjects);
        }

        toast.success("Excel parsed successfully!");

        if (parsedTeachers.length > 0) {
          toast((t) => (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-800">
                Found {parsedTeachers.length} teachers in Excel. Import them directly?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    navigate("/generate/add-teachers", {
                      state: {
                        classes: parsedClasses.length > 0 ? parsedClasses : ["10A"],
                        subjects: parsedSubjects.length > 0 ? parsedSubjects : ["Math"],
                        workingDays: parseInt(parsedWorkingDays) || 5,
                        periods: parseInt(parsedPeriods) || 8,
                        title: parsedTitle,
                        teacherData: parsedTeachers,
                        timetableId: null
                      }
                    });
                  }}
                  className="bg-[#57f1db] text-[#051424] text-[10px] font-bold py-1 px-3.5 rounded-full border-none cursor-pointer"
                >
                  Yes, Go to Teachers
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="bg-slate-200 text-slate-700 text-[10px] font-bold py-1 px-3.5 rounded-full border-none cursor-pointer"
                >
                  No, Keep Setup
                </button>
              </div>
            </div>
          ), { duration: 8000 });
        }

      } catch (err) {
        console.error("Error reading file:", err);
        toast.error("Failed to parse Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [classInput, setClassInput] = useState("");
  const [subjectInput, setSubjectInput] = useState("");

  const handleAddSubject = () => {
    setSubjects([...subjects, ""]);
  };

  const handleChangeSubject = (index, value) => {
    const newSubjects = [...subjects];
    newSubjects[index] = value;
    setSubjects(newSubjects);
  };

  const handleAddClasses = () => {
    setClasses([...classes, ""]);
  };

  const handleChangeClasses = (index, value) => {
    const newClasses = [...classes];
    newClasses[index] = value;
    setClasses(newClasses);
  };

  const addChip = (type, value) => {
    const v = value.trim();
    if (!v) return;
    if (type === "class") {
      if (!classes.filter(Boolean).includes(v)) setClasses(prev => [...prev.filter(Boolean), v]);
      setClassInput("");
    } else {
      if (!subjects.filter(Boolean).includes(v)) setSubjects(prev => [...prev.filter(Boolean), v]);
      setSubjectInput("");
    }
  };

  const removeChip = (type, val) => {
    if (type === "class") setClasses(prev => prev.filter(c => c !== val));
    else setSubjects(prev => prev.filter(s => s !== val));
  };

  const handleNext = () => {
    // Validate input before proceeding
    if (!workingDays || !periods) {
      toast.error("Please enter working days and periods per day");
      return;
    }

    const daysCount = parseInt(workingDays);
    if (isNaN(daysCount) || daysCount <= 0 || daysCount > 6) {
      toast.error("Number of working days must be between 1 and 6");
      window.scrollTo(0, 0);
      return;
    }

    const periodsCount = parseInt(periods);
    if (isNaN(periodsCount) || periodsCount <= 0 || periodsCount > 12) {
      toast.error("Periods per day must be between 1 and 12");
      return;
    }

    const validClasses = classes.filter(c => c.trim() !== "");
    const validSubjects = subjects.filter(s => s.trim() !== "");
    
    if (validClasses.length === 0 || validSubjects.length === 0) {
      toast.error("Please add at least one class and one subject");
      return;
    }

    navigate("/generate/add-teachers", {
      state: { 
        classes: validClasses, 
        subjects: validSubjects,
        workingDays: daysCount,
        periods: periodsCount,
        title: title.trim() || "School Timetable",
        teacherData: null,
        timetableId: null
      },
    });
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
        paddingTop: "120px",
        paddingBottom: "80px",
      }}
    >
      <FloatingOrbs />
      
      <div className="max-w-[1050px] mx-auto px-5 relative z-10">
        <WizardSteps current={1} />

        {/* Title Header */}
        <div className="mb-10 text-left">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight m-0">
            Create New <span className="text-[#57f1db] font-black">Schedule</span>
          </h1>
          <p className="text-sm md:text-base text-slate-400 mt-2.5 m-0 max-w-2xl leading-relaxed">
            Configure the baseline constraints, classes, and subjects. The CP-SAT engine will construct a clash-free schedule based on these settings.
          </p>
        </div>

        {/* 2-Column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* Left Column: Settings */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* General Info Card */}
            <div 
              style={{
                background: "rgba(10, 18, 36, 0.45)",
                border: "1px solid rgba(87, 241, 219, 0.12)",
                borderRadius: "24px",
                padding: "24px",
                backdropFilter: "blur(24px)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
              }}
              className="space-y-5"
            >
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#57f1db] rounded-full inline-block" />
                Basic Settings
              </h3>
              
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-2">Timetable Title</label>
                <input
                  type="text"
                  className="w-full p-3.5 border border-slate-700/80 rounded-xl bg-slate-900/50 text-white text-sm focus:outline-none focus:border-[#57f1db] focus:shadow-[0_0_15px_rgba(87,241,219,0.15)] placeholder:text-slate-600 transition-all duration-300"
                  placeholder="e.g., Spring 2026 Term"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-2">Working Days / Week (1-6)</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  className="w-full p-3.5 border border-slate-700/80 rounded-xl bg-slate-900/50 text-white text-sm focus:outline-none focus:border-[#57f1db] focus:shadow-[0_0_15px_rgba(87,241,219,0.15)] placeholder:text-slate-600 transition-all duration-300"
                  placeholder="e.g., 5"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-2">Periods per Day (1-12)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="w-full p-3.5 border border-slate-700/80 rounded-xl bg-slate-900/50 text-white text-sm focus:outline-none focus:border-[#57f1db] focus:shadow-[0_0_15px_rgba(87,241,219,0.15)] placeholder:text-slate-600 transition-all duration-300"
                  placeholder="e.g., 8"
                  value={periods}
                  onChange={(e) => setPeriods(e.target.value)}
                />
              </div>
            </div>

            {/* Bulk Import Card */}
            <div
              style={{
                background: "rgba(10, 18, 36, 0.45)",
                border: "1px solid rgba(87, 241, 219, 0.12)",
                borderRadius: "24px",
                padding: "24px",
                backdropFilter: "blur(24px)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
              }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#00ff87] rounded-full inline-block" />
                Bulk Import
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Skip manual form configuration by uploading a completed spreadsheet.
              </p>

              <div 
                className="border-2 border-dashed border-slate-700/60 rounded-2xl p-6 text-center hover:border-[#57f1db]/50 transition-colors duration-300 relative cursor-pointer group bg-slate-900/10"
                onClick={() => document.getElementById("excel-upload-input").click()}
              >
                <input
                  id="excel-upload-input"
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">📊</span>
                  <span className="text-xs font-bold text-slate-300">Drag & Drop or Click to Upload</span>
                  <span className="text-[10px] text-slate-500">Supports Excel (.xlsx, .xls) files</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate();
                  }}
                  className="text-xs font-bold text-[#57f1db] hover:text-[#57f1db]/80 bg-transparent border-none cursor-pointer underline inline-flex items-center gap-1.5"
                >
                  📥 Download Excel Template
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Classes and Subjects lists */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Classes Card */}
            <div
              style={{
                background: "rgba(10, 18, 36, 0.45)",
                border: "1px solid rgba(87, 241, 219, 0.12)",
                borderRadius: "24px",
                padding: "24px",
                backdropFilter: "blur(24px)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
              }}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#a78bfa] rounded-full inline-block" />
                Classes Setup
              </h3>
              
              <div>
                {/* Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {classes.filter(Boolean).map((clas) => (
                    <span key={clas} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>
                      {clas}
                      <button onClick={() => removeChip("class", clas)} style={{ background: "none", border: "none", cursor: "pointer", color: "#a78bfa", opacity: 0.7, lineHeight: 1, padding: 0, fontSize: 13 }}>✕</button>
                    </span>
                  ))}
                </div>
                {/* Input to add new chip */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-3 border border-slate-700/80 rounded-xl bg-slate-900/50 text-white text-sm focus:outline-none focus:border-[#a78bfa] placeholder:text-slate-600 transition-all duration-300"
                    placeholder="Type class name and press Enter (e.g., 10A)"
                    value={classInput}
                    onChange={e => setClassInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChip("class", classInput); } }}
                  />
                  <button
                    onClick={() => addChip("class", classInput)}
                    className="px-4 py-3 rounded-xl bg-[#a78bfa]/10 border border-[#a78bfa]/30 text-[#a78bfa] font-bold text-sm hover:bg-[#a78bfa]/20 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Subjects Card */}
            <div
              style={{
                background: "rgba(10, 18, 36, 0.45)",
                border: "1px solid rgba(87, 241, 219, 0.12)",
                borderRadius: "24px",
                padding: "24px",
                backdropFilter: "blur(24px)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
              }}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#38bdf8] rounded-full inline-block" />
                Subjects Setup
              </h3>
              
              <div>
                {/* Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {subjects.filter(Boolean).map((subj) => (
                    <span key={subj} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.35)", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>
                      {subj}
                      <button onClick={() => removeChip("subject", subj)} style={{ background: "none", border: "none", cursor: "pointer", color: "#38bdf8", opacity: 0.7, lineHeight: 1, padding: 0, fontSize: 13 }}>✕</button>
                    </span>
                  ))}
                </div>
                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 p-3 border border-slate-700/80 rounded-xl bg-slate-900/50 text-white text-sm focus:outline-none focus:border-[#38bdf8] placeholder:text-slate-600 transition-all duration-300"
                    placeholder="Type subject name and press Enter (e.g., Mathematics)"
                    value={subjectInput}
                    onChange={e => setSubjectInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChip("subject", subjectInput); } }}
                  />
                  <button
                    onClick={() => addChip("subject", subjectInput)}
                    className="px-4 py-3 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] font-bold text-sm hover:bg-[#38bdf8]/20 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Next step button */}
            <div className="flex justify-end pt-4">
              <button
                className="flex items-center justify-center gap-2 py-3.5 px-8 border-none rounded-full bg-gradient-to-r from-[#3282b8] to-[#00ff87] text-[#051424] text-sm font-extrabold cursor-pointer transition-all duration-300 shadow-[0_8px_25px_rgba(50,130,184,0.3)] hover:-translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_12px_30px_rgba(50,130,184,0.4)]"
                style={{ borderRadius: "9999px" }}
                onClick={handleNext}
              >
                <span>Add Teachers</span>
                <ArrowRight size={16} />
              </button>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}

export default GeneratePage;