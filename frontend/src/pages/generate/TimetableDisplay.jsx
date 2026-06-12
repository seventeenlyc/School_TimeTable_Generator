import React, { useState, useEffect } from "react";
import WizardSteps from "../components/WizardSteps";
import { getSubjectColor } from "../../utils/subjectColor";
import { useLocation, useNavigate } from "react-router";
import EditTimetable from "./components/EditTimetable";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { AlertTriangle, RefreshCw, Save, Edit3, Users, ExternalLink, Download, Loader2, Printer, Clock } from "lucide-react";
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

const TimetableDisplay = ({
  classTimetable: initialClass,
  teacherTimetable: initialTeacher,
  showEditOptions,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState("class");
  const [selectedItem, setSelectedItem] = useState("all");
  const [classTimetable, setClassTimetable] = useState(initialClass || []);
  const [teacherTimetable, setTeacherTimetable] = useState(
    initialTeacher || []
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDetails, setErrorDetails] = useState(null);
  const [errorType, setErrorType] = useState("");
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Dynamic configuration based on data or location state
  const [workingDays, setWorkingDays] = useState(5);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);

  // Generate dynamic arrays based on configuration
  const generateDayNames = (numDays) => {
    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return allDays.slice(0, Math.min(numDays, 7)); // Allow up to 7 days
  };

  const generatePeriodNames = (numPeriods) => {
    return Array.from({length: numPeriods}, (_, i) => `Period ${i + 1}`);
  };

  // Get actual dimensions from current data
  const getCurrentDataDimensions = () => {
    const currentData = viewMode === "class" ? classTimetable : teacherTimetable;
    if (!currentData || Object.keys(currentData).length === 0) {
      return { maxDays: workingDays, maxPeriods: periodsPerDay };
    }

    let maxDays = 0;
    let maxPeriods = 0;

    // Check all timetables to find maximum dimensions
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
  const days = generateDayNames(maxDays);
  const periods = generatePeriodNames(maxPeriods);

  useEffect(() => {
    if (location.state) {
      if (location.state.classTimetable || location.state.teacherTimetable) {
        setClassTimetable(location.state.classTimetable || {});
        setTeacherTimetable(location.state.teacherTimetable || {});
        
        // Auto-detect working days and periods from actual data
        const timetableData = location.state.classTimetable || location.state.teacherTimetable || {};
        const firstClass = Object.values(timetableData)[0];
        
        if (firstClass && Array.isArray(firstClass)) {
          const detectedDays = firstClass.length;
          const detectedPeriods = firstClass[0]?.length || 8;
          
          setWorkingDays(Math.min(detectedDays, 7)); // Max 7 days
          setPeriodsPerDay(Math.max(detectedPeriods, 1)); // Min 1 period
        }
      }

      // Use configuration from location state if available
      if (location.state.workingDays) {
        setWorkingDays(Math.min(location.state.workingDays, 7));
      }
      if (location.state.periods) {
        setPeriodsPerDay(Math.max(location.state.periods, 1));
      }

      // Enhanced error handling from location state
      if (location.state.status === "ERROR" || location.state.status === "INFEASIBLE") {
        setErrorMessage(location.state.message || "An error occurred while generating the timetable");
        setErrorDetails(location.state.error_details || null);
        setErrorType(location.state.error_type || "UNKNOWN");
      } else if (location.state.message && location.state.message.includes("❌")) {
        // Handle error messages that start with ❌
        setErrorMessage(location.state.message);
        setErrorDetails(location.state.error_details || null);
        setErrorType(location.state.error_type || "UNKNOWN");
      }
    }
  }, [location]);

  const [teacherData, setTeacherData] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (location.state?.teacherData) {
      setTeacherData(location.state.teacherData);
    }
  }, [location]);

  // Compute workload stats from teacher timetable
  const computeWorkloads = () => {
    if (!teacherTimetable || Object.keys(teacherTimetable).length === 0) return [];
    return Object.entries(teacherTimetable).map(([name, schedule]) => {
      const assigned = schedule.flat().filter(s => s && s !== "Free").length;
      const total = schedule.flat().length;
      // Try to get max from teacherData if available
      const info = teacherData.find(t => t.name === name);
      const maxPeriods = info
        ? (info.periods || []).reduce((sum, p) => sum + (parseInt(p.noOfPeriods) || 0), 0)
        : null;
      return { name, assigned, total, maxPeriods };
    }).sort((a, b) => b.assigned - a.assigned);
  };

  const [startTime, setStartTime] = useState("08:30");
  const [periodDuration, setPeriodDuration] = useState(50); // minutes

  const getPeriodTime = (periodIndex) => {
    const [h, m] = startTime.split(":").map(Number);
    const totalMins = h * 60 + m + periodIndex * periodDuration;
    const endMins = totalMins + periodDuration;
    const fmt = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    return `${fmt(totalMins)}–${fmt(endMins)}`;
  };

  const currentData = viewMode === "class" ? classTimetable : teacherTimetable;
  const items = currentData ? Object.keys(currentData) : [];

  useEffect(() => {
    if (items.length > 0 && selectedItem !== "all" && !selectedItem) {
      setSelectedItem(items[0]);
    }
  }, [items, selectedItem]);

  // Helper function to render detailed error information
  const renderErrorDetails = () => {
    if (!errorDetails && !errorMessage) return null;

    return (
      <div className="bg-[linear-gradient(135deg,#fee2e2_0%,#fef2f2_100%)] border-2 border-[#ef4444] rounded-xl p-6 my-4 shadow-[0_8px_25px_rgba(239,68,68,0.15)] max-md:m-4 max-md:p-4">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#fca5a5] max-md:flex-col max-md:items-start max-md:gap-2">
          <AlertTriangle className="text-[#dc2626] w-6 h-6 shrink-0" />
          <h3>Timetable Generation Failed</h3>
        </div>
        
        <div className="text-[#7f1d1d]">
          <p className="text-base font-medium mb-4 color-[#991b1b] leading-normal">
            {errorMessage || "An error occurred while generating the timetable"}
          </p>
          
          {errorType && errorType !== "UNKNOWN" && (
            <div className="bg-[rgba(220,38,38,0.1)] py-2 px-3 rounded-md mb-4 text-[0.875rem] text-[#dc2626]">
              <strong>Error Type:</strong> {errorType.replace(/_/g, ' ')}
            </div>
          )}
          
          {errorDetails && (
            <div className="bg-[rgba(239,68,68,0.05)] p-4 rounded-lg mb-4 border-l-4 border-[#ef4444]">
              <strong>Details:</strong>
              {typeof errorDetails === 'string' ? (
                <p>{errorDetails}</p>
              ) : typeof errorDetails === 'object' ? (
                <div className="mt-2">
                  {Object.entries(errorDetails).map(([key, value]) => (
                    <div key={key} className="mb-3 p-2 bg-[rgba(255,255,255,0.5)] rounded">
                      <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
                      {Array.isArray(value) ? (
                        <ul>
                          {value.map((item, idx) => (
                            <li key={idx}>{String(item)}</li>
                          ))}
                        </ul>
                      ) : typeof value === 'object' ? (
                        <pre>{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        <span>{String(value)}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>{String(errorDetails)}</p>
              )}
            </div>
          )}
          
          <div className="bg-[linear-gradient(135deg,#fef3c7_0%,#fef7cd_100%)] border border-[#f59e0b] rounded-lg p-4 mb-4">
            <h4>Possible solutions:</h4>
            <ul>
              <li>Check if teacher period assignments don't exceed available time slots</li>
              <li>Ensure class schedules don't conflict with teacher availabilities</li>
              <li>Verify that subject assignments are realistic for the given time frame</li>
              <li>Consider reducing the number of periods or adjusting teacher workload</li>
              <li>Make sure all teachers have feasible subject-class combinations</li>
              <li>Ensure that the total periods assigned to each class don't exceed the daily limit</li>
            </ul>
          </div>
          
          {location.state && (location.state.teacherData || location.state.classes) && (
            <div className="error-actions">
              <button
                className="flex items-center gap-2 bg-[linear-gradient(135deg,#dc2626_0%,#b91c1c_100%)] text-white py-3 px-6 border-none rounded-lg font-medium cursor-pointer transition-all duration-200 ease-in-out no-underline hover:bg-[linear-gradient(135deg,#b91c1c_0%,#991b1b_100%)] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)] active:translate-y-0 max-md:w-full max-md:justify-center"
                onClick={() => navigate("/generate/add-teachers", {
                  state: {
                    teacherData: location.state.teacherData,
                    classes: location.state.classes,
                    subjects: location.state.subjects,
                    workingDays: location.state.workingDays,
                    periods: location.state.periods,
                    title: location.state.title,
                    timetableId: location.state.timetableId,
                  },
                })}
              >
                <RefreshCw className="w-5 h-5" />
                Edit Teachers & Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Check if we should show error state
  const hasError = errorMessage || (location.state?.status === "ERROR") || (location.state?.status === "INFEASIBLE");
  const hasNoData = (!classTimetable || Object.keys(classTimetable).length === 0) &&
                    (!teacherTimetable || Object.keys(teacherTimetable).length === 0);

  // Show error state if there's an error or no data with error conditions
  if (hasError || (hasNoData && !showEditOptions)) {
    return (
      <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden mt-[60px]">
        <div className="max-w-full m-0 p-0 w-full min-w-full box-border">
          <div className="max-w-[900px] mx-auto px-4 my-8">
            {hasError ? renderErrorDetails() : (
              <div className="bg-[linear-gradient(135deg,#fee2e2_0%,#fef2f2_100%)] border-2 border-[#ef4444] rounded-xl p-8 text-[#dc2626] font-medium text-[1.1rem] flex items-center justify-center gap-3 max-w-[600px] mx-auto my-8 shadow-[0_8px_25px_rgba(239,68,68,0.15)]">
                <AlertTriangle className="w-5 h-5" />
                No timetable data available.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const exportAsPDF = async () => {
    setExportingPDF(true);
    const isAll = selectedItem === "all";
    const itemsToExport = isAll ? items : [selectedItem];
    const container = document.createElement("div");

    // Style container
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "1120px"; // ~A4 width in px at 96 DPI
    container.style.padding = "20px";
    container.style.backgroundColor = "#fff";
    container.style.color = "#000";
    container.style.fontFamily = "Arial, sans-serif";

    // Optional title
    const title = document.createElement("h2");
    title.textContent = isAll
      ? `All ${viewMode === "class" ? "Class" : "Teacher"} Timetables`
      : `${viewMode === "class" ? "Class" : "Teacher"}: ${selectedItem}`;
    title.style.textAlign = "center";
    title.style.marginBottom = "30px";
    container.appendChild(title);

    // Loop through items (all or just one)
    for (const item of itemsToExport) {
      const data = currentData[item];
      if (!data || !data.length) continue;

      const section = document.createElement("div");
      section.style.marginBottom = "40px";

      const header = document.createElement("h3");
      header.textContent = `${viewMode === "class" ? "Class" : "Teacher"}: ${item}`;
      header.style.marginBottom = "10px";
      header.style.textAlign = "left";
      header.style.color = "#000";
      section.appendChild(header);

      // Create simple clean table
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = "12px";

      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");

      const thDay = document.createElement("th");
      thDay.textContent = "Day/Period";
      thDay.style.border = "1px solid #000";
      thDay.style.padding = "6px";
      thDay.style.backgroundColor = "#eaeaea";
      headRow.appendChild(thDay);

      // Use dynamic periods based on actual data length
      const actualPeriods = Math.max(...data.map(day => day.length));
      const periodsToShow = generatePeriodNames(actualPeriods);
      
      periodsToShow.forEach((period) => {
        const th = document.createElement("th");
        th.textContent = period;
        th.style.border = "1px solid #000";
        th.style.padding = "6px";
        th.style.backgroundColor = "#eaeaea";
        headRow.appendChild(th);
      });

      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      data.forEach((rowData, dayIndex) => {
        const tr = document.createElement("tr");

        const tdDay = document.createElement("td");
        tdDay.textContent = days[dayIndex] || `Day ${dayIndex + 1}`;
        tdDay.style.border = "1px solid #000";
        tdDay.style.padding = "6px";
        tdDay.style.backgroundColor = "#f5f5f5";
        tr.appendChild(tdDay);

        // Ensure we render all periods, even if some days have fewer periods
        for (let periodIndex = 0; periodIndex < actualPeriods; periodIndex++) {
          const td = document.createElement("td");
          td.textContent = rowData[periodIndex] || "Free";
          td.style.border = "1px solid #000";
          td.style.padding = "6px";
          td.style.textAlign = "center";
          td.style.color = "#000";
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      section.appendChild(table);
      container.appendChild(section);
    }

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.9); // Good compression
      const pdf = new jsPDF("portrait", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (imgHeight > pdf.internal.pageSize.getHeight()) {
        let y = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();
        while (y < imgHeight) {
          if (y > 0) pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, -y, pdfWidth, imgHeight);
          y += pageHeight;
        }
      } else {
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgHeight);
      }

      const filename = isAll
        ? `all_${viewMode}_timetables.pdf`
        : `${viewMode}_${selectedItem}_timetable.pdf`;

      pdf.save(filename);
    } catch (err) {
      console.error("PDF export failed", err);
      toast.error("PDF export failed. Please try again.");
    } finally {
      document.body.removeChild(container);
      setExportingPDF(false);
    }
  };

  const getNextWeekdayDate = (dayIndex) => {
    const today = new Date();
    const resultDate = new Date(today);
    const targetJsDay = dayIndex === 6 ? 0 : dayIndex + 1;
    const currentJsDay = today.getDay();
    
    let distance = targetJsDay - currentJsDay;
    if (distance < 0) {
      distance += 7;
    }
    
    resultDate.setDate(today.getDate() + distance);
    
    const yyyy = resultDate.getFullYear();
    const mm = String(resultDate.getMonth() + 1).padStart(2, "0");
    const dd = String(resultDate.getDate()).padStart(2, "0");
    
    return `${yyyy}${mm}${dd}`;
  };

  const exportAsICS = () => {
    const isAll = selectedItem === "all";
    const itemsToExport = isAll ? items : [selectedItem];
    
    const icsDays = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
    const periodTimes = [
      { start: "083000", end: "091500" },
      { start: "091500", end: "100000" },
      { start: "100000", end: "104500" },
      { start: "110000", end: "114500" },
      { start: "114500", end: "123000" },
      { start: "123000", end: "131500" },
      { start: "140000", end: "144500" },
      { start: "144500", end: "153000" },
      { start: "153000", end: "161500" },
      { start: "161500", end: "170000" },
      { start: "170000", end: "174500" },
      { start: "174500", end: "183000" }
    ];

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Antigravity//School Timetable Generator//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    itemsToExport.forEach((item) => {
      const data = currentData[item];
      if (!data) return;

      data.forEach((rowData, dayIndex) => {
        const dayStr = icsDays[dayIndex] || "MO";
        const startDateStr = getNextWeekdayDate(dayIndex);

        rowData.forEach((period, periodIndex) => {
          if (period === "Free" || !period) return;

          const timeSlot = periodTimes[periodIndex] || { start: "080000", end: "084500" };
          
          let summary = period;
          let description = "";

          if (viewMode === "class") {
            if (period.includes("(") && period.includes(")")) {
              const parts = period.split("(");
              const subject = parts[0].trim();
              const teacher = parts[1].replace(")", "").trim();
              summary = `${subject} (${item})`;
              description = `Teacher: ${teacher}`;
            } else {
              summary = `${period} (${item})`;
            }
          } else {
            if (period.includes("-")) {
              const parts = period.split("-");
              const subject = parts[0].trim();
              const cls = parts[1].trim();
              summary = `${subject} - Class ${cls}`;
              description = `Teacher: ${item}`;
            } else {
              summary = `${period} (Teacher: ${item})`;
            }
          }

          const uid = `${item}_d${dayIndex}_p${periodIndex}_${Math.random().toString(36).substring(2, 9)}@timetable`;
          const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

          icsContent.push("BEGIN:VEVENT");
          icsContent.push(`UID:${uid}`);
          icsContent.push(`DTSTAMP:${dtstamp}`);
          icsContent.push(`DTSTART;TZID=Asia/Kolkata:${startDateStr}T${timeSlot.start}`);
          icsContent.push(`DTEND;TZID=Asia/Kolkata:${startDateStr}T${timeSlot.end}`);
          icsContent.push(`RRULE:FREQ=WEEKLY;BYDAY=${dayStr}`);
          icsContent.push(`SUMMARY:${summary}`);
          icsContent.push(`DESCRIPTION:${description}`);
          icsContent.push("END:VEVENT");
        });
      });
    });

    icsContent.push("END:VCALENDAR");
    const icsString = icsContent.join("\r\n");

    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    const filename = isAll
      ? `all_${viewMode}_timetables.ics`
      : `${viewMode}_${selectedItem}_timetable.ics`;

    saveAs(blob, filename);
    toast.success("iCalendar exported successfully!");
  };

  const exportAsExcel = () => {
    setExportingExcel(true);
    try {
    const wb = XLSX.utils.book_new();
    const combined = [];

    if (selectedItem === "all") {
      items.forEach((item) => {
        const data = currentData[item];
        if (data) {
          const actualPeriods = Math.max(...data.map(day => day.length));
          const periodsToShow = generatePeriodNames(actualPeriods);
          
          combined.push([`${viewMode === "class" ? "Class" : "Teacher"}: ${item}`]);
          combined.push(["Day/Period", ...periodsToShow]);
          data.forEach((row, i) => {
            const paddedRow = [...row];
            // Pad row to match maximum periods
            while (paddedRow.length < actualPeriods) {
              paddedRow.push("Free");
            }
            combined.push([days[i] || `Day ${i + 1}`, ...paddedRow]);
          });
          combined.push([]); // empty row between timetables
        }
      });
    } else {
      const data = currentData[selectedItem];
      if (data) {
        const actualPeriods = Math.max(...data.map(day => day.length));
        const periodsToShow = generatePeriodNames(actualPeriods);
        
        combined.push(["Day/Period", ...periodsToShow]);
        data.forEach((row, i) => {
          const paddedRow = [...row];
          // Pad row to match maximum periods
          while (paddedRow.length < actualPeriods) {
            paddedRow.push("Free");
          }
          combined.push([days[i] || `Day ${i + 1}`, ...paddedRow]);
        });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(combined);
    XLSX.utils.book_append_sheet(wb, ws, "Timetables");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const filename = selectedItem === "all" 
      ? `all_${viewMode}_timetables.xlsx`
      : `${viewMode}_${selectedItem}_timetable.xlsx`;

    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      filename
    );
    toast.success("Excel exported successfully!");
    } catch (err) {
      console.error("Excel export failed", err);
      toast.error("Excel export failed.");
    } finally {
      setExportingExcel(false);
    }
  };

  const formatPeriodContent = (period) => {
    if (period.includes("(") && period.includes(")")) {
      const parts = period.split("(");
      const subject = parts[0].trim();
      const teacher = parts[1].replace(")", "").trim();
      const col = getSubjectColor(subject);
      return (
        <div className="flex flex-col items-center justify-center gap-0.5 py-1">
          <span className="font-extrabold text-[0.825rem] tracking-wide leading-tight" style={{ color: col.text }}>{subject}</span>
          <span className="text-[0.65rem] font-medium tracking-normal" style={{ color: col.text, opacity: 0.7 }}>{teacher}</span>
        </div>
      );
    }
    return <span className="font-extrabold text-[0.825rem] tracking-wide text-white">{period}</span>;
  };

  const renderTimetable = (data) => {
    if (!data || data.length === 0) {
      return <div className="text-center p-8 text-[rgba(255,255,255,0.6)] text-base">No data available</div>;
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
                  className="p-3 max-md:py-2 max-md:px-2 max-sm:py-1 max-sm:px-1 text-center font-bold text-slate-300 border border-slate-800/80 relative bg-slate-900/50"
                >
                  <div className="text-[0.75rem] uppercase tracking-wider">{period}</div>
                  <div className="text-[0.6rem] text-slate-500 font-medium mt-0.5 tabular-nums">{getPeriodTime(index)}</div>
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
                {Array.from({ length: actualPeriods }, (_, periodIndex) => (
                  <td key={periodIndex} className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center border border-[rgba(255,255,255,0.05)] bg-transparent transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.03)]">
                    {(() => {
                      const period = dayData[periodIndex];
                      if (period === "Free" || period === "" || period === undefined || period === null) {
                        return <span className="text-slate-500/60 italic text-[0.85rem] font-medium tracking-wide">Free</span>;
                      } else {
                        const subjectName = period.includes("(") ? period.split("(")[0].trim() : period;
                        const col = getSubjectColor(subjectName);
                        return (
                          <div
                            title={period}
                            className="inline-flex flex-col items-center justify-center py-1.5 px-3 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.2)] hover:scale-[1.03] transition-all duration-300 w-full max-w-[130px] min-h-[50px] mx-auto"
                            style={{ background: col.bg, border: `1px solid ${col.border}40` }}
                          >
                            {formatPeriodContent(period)}
                          </div>
                        );
                      }
                    })()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAllTimetables = () => {
    if (!currentData || Object.keys(currentData).length === 0) {
      return <div className="text-center p-8 text-[rgba(255,255,255,0.6)] text-base">No data available</div>;
    }

    const scrollToSection = (item) => {
      const el = document.getElementById(`tt-section-${item.replace(/\s/g, "_")}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
      <div className="all-timetables-container">
        {/* Horizontal scrollable tab strip */}
        <div style={{ overflowX: "auto", display: "flex", gap: 8, padding: "0 0 12px", marginBottom: 8 }} className="no-scrollbar">
          {items.map((item) => (
            <button
              key={item}
              onClick={() => scrollToSection(item)}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 999,
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: "rgba(87,241,219,0.07)",
                border: "1px solid rgba(87,241,219,0.2)",
                color: "#57f1db",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(87,241,219,0.14)"; e.currentTarget.style.borderColor = "rgba(87,241,219,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(87,241,219,0.07)"; e.currentTarget.style.borderColor = "rgba(87,241,219,0.2)"; }}
            >
              {item}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
        {items.map((item) => (
          <div key={item} id={`tt-section-${item.replace(/\s/g, "_")}`} className="individual-timetable-section" style={{ scrollMarginTop: "120px" }}>
            <h5 style={{
              marginBottom: '1rem',
              padding: '0.6rem 1.2rem',
              background: "linear-gradient(135deg, rgba(16, 28, 54, 0.45) 0%, rgba(10, 18, 36, 0.55) 100%)",
              border: "1px solid rgba(87, 241, 219, 0.15)",
              color: '#57f1db',
              borderRadius: '12px',
              fontWeight: 'bold',
              backdropFilter: 'blur(10px)',
              fontSize: '1rem',
              display: 'inline-block'
            }}>
              {viewMode === "class" ? "Class" : "Teacher"}: {item}
            </h5>
            {renderTimetable(currentData[item])}
          </div>
        ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`${!showEditOptions ? "min-h-screen text-white relative overflow-x-hidden pt-[120px]" : ""}`}
      style={!showEditOptions ? {
        background: "radial-gradient(ellipse 100% 60% at 15% 10%, #081225 0%, #030814 60%, #02050b 100%)",
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
      } : {}}
    >
      {!showEditOptions && <FloatingOrbs />}
      <div
        className={`${!showEditOptions ? "max-w-[1450px] mx-auto px-5 relative z-10" : ""}`}
        style={{ padding: `${showEditOptions ? "" : "3rem"}`, paddingTop: 0 }}
      >
        {!showEditOptions && <WizardSteps current={3} />}
        {location.state?.timetableId && !showEditOptions && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight m-0">{location.state.title}</h2>
              <p className="text-sm text-slate-400 mt-2 m-0 max-w-xl">Saved configurations and timetable grids.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-2 py-2.5 px-5 border border-[#a78bfa]/40 rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out text-[#a78bfa] bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 hover:scale-[1.02]"
                style={{ borderRadius: "9999px" }}
                onClick={() =>
                  navigate("/edit-timetable", {
                    state: {
                      classTimetable: classTimetable,
                      teacherTimetable: teacherTimetable,
                      id: location.state.timetableId,
                      teacherData: location.state.teacherData,
                      classes: location.state.classes,
                      subjects: location.state.subjects,
                      workingDays: location.state.workingDays,
                      periods: location.state.periods,
                      title: location.state.title,
                    },
                  })
                }
              >
                <Edit3 size={14} />
                Edit timetable
              </button>

              <button
                type="button"
                className="flex items-center gap-2 py-2.5 px-5 border border-slate-700/80 rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out text-slate-200 bg-slate-800/60 hover:bg-slate-700/60 hover:scale-[1.02]"
                style={{ borderRadius: "9999px" }}
                onClick={() =>
                  navigate("/generate/add-teachers", {
                    state: {
                      teacherData: location.state.teacherData,
                      classes: location.state.classes,
                      subjects: location.state.subjects,
                      workingDays: location.state.workingDays,
                      periods: location.state.periods,
                      title: location.state.title,
                      timetableId: location.state.timetableId,
                    },
                  })
                }
              >
                <Users size={14} />
                Edit Teachers
              </button>
            </div>
          </div>
        )}
        <div className="max-w-full m-0 p-0 w-full min-w-full box-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-center p-0">
            <div className="flex justify-start">
              <div className="flex bg-slate-900/60 rounded-full p-1 backdrop-blur-[12px] border border-slate-800/80 w-full max-w-md">
                <button
                  type="button"
                  className={`flex-1 py-2.5 px-5 border-none rounded-full bg-transparent text-slate-400 text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out hover:text-white ${
                    viewMode === "class" ? "bg-teal-500/10 text-[#57f1db] border border-teal-500/20 shadow-[0_0_15px_rgba(87,241,219,0.1)]" : ""
                  }`}
                  style={{ borderRadius: "9999px" }}
                  onClick={() => {
                    setViewMode("class");
                    setSelectedItem("all");
                  }}
                >
                  Class View
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2.5 px-5 border-none rounded-full bg-transparent text-slate-400 text-sm font-bold cursor-pointer transition-all duration-300 ease-in-out hover:text-white ${
                    viewMode === "teacher" ? "bg-purple-500/10 text-[#a78bfa] border border-purple-500/20 shadow-[0_0_15px_rgba(167,139,250,0.1)]" : ""
                  }`}
                  style={{ borderRadius: "9999px" }}
                  onClick={() => {
                    setViewMode("teacher");
                    setSelectedItem("all");
                  }}
                >
                  Teacher View
                </button>
              </div>
            </div>
            
            <div className="flex justify-start md:justify-end">
              <select
                className="item-selector-td w-full max-w-md"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                <option value="all">
                  All {viewMode === "class" ? "Classes" : "Teachers"}
                </option>
                {items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
            <div
              className="flex justify-between items-center py-5 px-6 bg-slate-900/30 border-b border-[rgba(255,255,255,0.06)] flex-wrap gap-4 max-md:flex-col max-md:items-stretch"
            >
              <h4 className="text-xl font-bold text-white m-0 [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-sm:text-lg">
                {selectedItem === "all" 
                  ? `All ${viewMode === "class" ? "Classes" : "Teachers"}` 
                  : `${viewMode === "class" ? "Class" : "Teacher"}: ${selectedItem}`
                }
              </h4>
              <div className="flex gap-2 flex-wrap max-md:justify-center items-center">
                {/* Time config */}
                <div className="flex items-center gap-2 py-1.5 px-3 rounded-full border border-slate-700/60 bg-slate-900/40 text-xs text-slate-400">
                  <Clock size={12} />
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="bg-transparent border-none outline-none text-slate-300 text-xs w-[70px] cursor-pointer"
                    title="First period start time"
                  />
                  <span className="text-slate-600">·</span>
                  <input
                    type="number"
                    value={periodDuration}
                    onChange={e => setPeriodDuration(Math.max(15, Math.min(120, parseInt(e.target.value) || 50)))}
                    className="bg-transparent border-none outline-none text-slate-300 text-xs w-[30px] text-center cursor-pointer"
                    title="Period duration (minutes)"
                    min={15} max={120}
                  />
                  <span className="text-slate-600">min</span>
                </div>

                <button
                  className="flex items-center gap-2 py-2.5 px-5 border border-teal-500/30 hover:border-teal-500 rounded-full text-xs font-bold cursor-pointer transition-all duration-300 ease-in-out text-[#57f1db] bg-teal-500/5 hover:bg-teal-500/10 hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: "9999px" }}
                  onClick={exportAsPDF}
                  disabled={exportingPDF}
                >
                  {exportingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {exportingPDF ? "Generating…" : "Export PDF"}
                </button>
                <button
                  className="flex items-center gap-2 py-2.5 px-5 border border-purple-500/30 hover:border-purple-500 rounded-full text-xs font-bold cursor-pointer transition-all duration-300 ease-in-out text-[#a78bfa] bg-purple-500/5 hover:bg-purple-500/10 hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: "9999px" }}
                  onClick={exportAsExcel}
                  disabled={exportingExcel}
                >
                  {exportingExcel ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {exportingExcel ? "Generating…" : "Export Excel"}
                </button>
                <button
                  className="flex items-center gap-2 py-2.5 px-5 border border-blue-500/30 hover:border-blue-500 rounded-full text-xs font-bold cursor-pointer transition-all duration-300 ease-in-out text-[#60a5fa] bg-blue-500/5 hover:bg-blue-500/10 hover:-translate-y-[1px]"
                  style={{ borderRadius: "9999px" }}
                  onClick={exportAsICS}
                >
                  <Download size={14} />
                  Export iCal
                </button>
                <button
                  className="flex items-center gap-2 py-2.5 px-4 border border-slate-700/40 hover:border-slate-500 rounded-full text-xs font-bold cursor-pointer transition-all duration-300 ease-in-out text-slate-400 hover:text-slate-200 bg-slate-800/20 hover:bg-slate-700/30 hover:-translate-y-[1px]"
                  style={{ borderRadius: "9999px" }}
                  onClick={() => window.print()}
                  title="Print timetable"
                >
                  <Printer size={14} />
                  Print
                </button>
              </div>
            </div>
            <div className="py-6 px-4 max-sm:py-4" id="timetable-container">
              {selectedItem === "all" 
                ? renderAllTimetables() 
                : renderTimetable(currentData[selectedItem])
              }
            </div>
          </div>
        </div>

        {/* Teacher Workload Summary */}
        {teacherTimetable && Object.keys(teacherTimetable).length > 0 && (() => {
          const workloads = computeWorkloads();
          return (
            <div style={{
              background: "rgba(10, 18, 36, 0.45)",
              border: "1px solid rgba(87, 241, 219, 0.12)",
              borderRadius: "24px",
              backdropFilter: "blur(24px)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              padding: "24px",
              marginBottom: "32px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <Users size={18} style={{ color: "#57f1db" }} />
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#fff" }}>Teacher Workload Summary</h4>
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                  {workloads.length} teachers
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                {workloads.map(({ name, assigned, total, maxPeriods }) => {
                  const cap = maxPeriods ?? total;
                  const pct = cap > 0 ? Math.min(100, Math.round((assigned / cap) * 100)) : 0;
                  const isOver = maxPeriods !== null && assigned > maxPeriods;
                  const barColor = isOver ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#57f1db";
                  return (
                    <div key={name} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${barColor}22`,
                      borderRadius: "14px",
                      padding: "14px 16px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0", maxWidth: "65%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={name}>{name}</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: barColor }}>
                          {assigned}{maxPeriods !== null ? `/${maxPeriods}` : ""} periods
                        </span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "999px", height: "6px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: "999px", transition: "width 0.6s ease" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>{pct}% utilised</span>
                        {isOver && <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700 }}>⚠ Over limit</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};

export default TimetableDisplay;