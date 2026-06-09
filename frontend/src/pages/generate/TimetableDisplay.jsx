import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import EditTimetable from "./components/EditTimetable";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { AlertTriangle, RefreshCw } from "lucide-react";



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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
      alert("PDF export failed. Please try again.");
    } finally {
      document.body.removeChild(container);
    }
  };

  const exportAsExcel = () => {
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

    return (
      <div className="overflow-x-auto rounded-none bg-[rgba(255,255,255,0.02)] border-none border-t border-b border-[rgba(255,255,255,0.1)] custom-scrollbar">
        <table className="w-full border-collapse text-[0.9rem] bg-transparent min-w-full max-md:text-[0.8rem] max-sm:text-[0.75rem]">
          <thead className="bg-[linear-gradient(135deg,#1f2937_0%,#374151_100%)]">
            <tr>
              <th className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center font-semibold text-white border border-[rgba(255,255,255,0.1)] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] relative">Day/Period</th>
              {periodsToShow.map((period, index) => (
                <th key={index} className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center font-semibold text-white border border-[rgba(255,255,255,0.1)] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] relative bg-[linear-gradient(135deg,#374151_0%,#4b5563_100%)]">
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[rgba(255,255,255,0.02)]">
            {data.map((dayData, dayIndex) => (
              <tr key={dayIndex} className="transition-all duration-300 ease-in-out border-b border-[rgba(255,255,255,0.05)] last:border-b-0 hover:bg-[rgba(255,255,255,0.05)] hover:scale-[1.01]">
                <td className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 font-semibold text-white bg-[linear-gradient(135deg,#0f4c75_0%,#3282b8_100%)] border border-[rgba(255,255,255,0.1)] text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
                  {daysToShow[dayIndex] || `Day ${dayIndex + 1}`}
                </td>
                {/* Render all periods, padding with "Free" if necessary */}
                {Array.from({ length: actualPeriods }, (_, periodIndex) => (
                  <td key={periodIndex} className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.05)]">
                    {(() => {
                      const period = dayData[periodIndex];
                      if (period === "Free" || period === "" || period === undefined || period === null) {
                        return <span className="text-[rgba(255,255,255,0.5)] italic text-[0.85rem]">Free</span>;
                      } else {
                        return <span className="inline-block py-1.5 px-3 bg-[linear-gradient(135deg,#3b82f6_0%,#1d4ed8_100%)] text-white rounded-lg text-xs font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition-all duration-300 ease-in-out hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(59,130,246,0.4)] max-md:py-1 max-md:px-2 max-md:text-[0.7rem] max-sm:py-1 max-sm:px-2 max-sm:text-[0.65rem]">{period}</span>;
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

    return (
      <div className="all-timetables-container">
        {items.map((item) => (
          <div key={item} className="individual-timetable-section" style={{ marginBottom: '3rem' }}>
            <h5 style={{
              marginBottom: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f8f9fa',
              color: '#212529',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}>
              {viewMode === "class" ? "Class" : "Teacher"}: {item}
            </h5>
            {renderTimetable(currentData[item])}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`${!showEditOptions ? "bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden mt-[60px]" : ""}`}>
      <div
        className={`${!showEditOptions ? "max-w-[1200px] mx-auto px-5" : ""}`}
        style={{ padding: `${showEditOptions ? "" : "5rem"}`, paddingTop: 0 }}
      >
        {location.state?.timetableId && !showEditOptions && (
          <div className="timetable-header">
            <h2 className="section-title-ge">{location.state.title}</h2>
            <div className="action-buttons-container">
              <button
                type="button"
                className="flex items-center gap-2 py-4 px-8 border-none rounded-xl text-base font-medium cursor-pointer transition-all duration-300 ease-in-out text-white no-underline relative overflow-hidden focus:outline-[#3282b8] focus:outline-2 focus:outline-offset-2 before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] before:transition-[left] before:duration-500 before:ease-in-out hover:before:left-full max-md:justify-center max-sm:py-3.5 max-sm:px-6 max-sm:text-[0.9rem] bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] hover:bg-[linear-gradient(135deg,#d97706_0%,#b45309_100%)] hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(245,158,11,0.4)]"
                onClick={() =>
                  navigate("/edit-timetable", {
                    state: {
                      classTimetable: classTimetable,
                      teacherTimetable: teacherTimetable,
                      id: location.state.timetableId,
                      teacherData: location.state.teacherData,
                    },
                  })
                }
              >
                <span className="text-[1.1rem]">✏️</span>
                Edit timetable
              </button>

              <button
                type="button"
                className="flex items-center gap-2 py-4 px-8 border-none rounded-xl text-base font-medium cursor-pointer transition-all duration-300 ease-in-out text-white no-underline relative overflow-hidden focus:outline-[#3282b8] focus:outline-2 focus:outline-offset-2 before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] before:transition-[left] before:duration-500 before:ease-in-out hover:before:left-full max-md:justify-center max-sm:py-3.5 max-sm:px-6 max-sm:text-[0.9rem] bg-[linear-gradient(135deg,#3b82f6_0%,#2563eb_100%)] hover:bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_100%)] hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(59,130,246,0.4)]"
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
                <span className="text-[1.1rem]">👥</span>
                Edit teachers
              </button>
            </div>
          </div>
        )}
        <div className="max-w-full m-0 p-0 w-full min-w-full box-border">
          <div className="grid grid-cols-2 gap-8 mb-8 items-end p-0 max-md:grid-cols-1 max-md:gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex bg-[rgba(255,255,255,0.05)] rounded-xl p-1 backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)]">
                <button
                  type="button"
                  className={`py-4 px-6 border-none rounded-lg bg-transparent text-[rgba(255,255,255,0.7)] text-base font-medium cursor-pointer transition-all duration-300 ease-in-out relative overflow-hidden focus:outline-[#3282b8] focus:outline-2 focus:outline-offset-2 hover:not-[.active-mode-td]:bg-[rgba(255,255,255,0.1)] hover:not-[.active-mode-td]:text-white ${
                    viewMode === "class" ? "bg-[linear-gradient(135deg,#3282b8_0%,#0f4c75_100%)] text-white shadow-[0_4px_15px_rgba(50,130,184,0.3)]" : ""
                  }`}
                  onClick={() => {
                    setViewMode("class");
                    setSelectedItem("all");
                  }}
                >
                  Class Timetables
                </button>
                <button
                  type="button"
                  className={`py-4 px-6 border-none rounded-lg bg-transparent text-[rgba(255,255,255,0.7)] text-base font-medium cursor-pointer transition-all duration-300 ease-in-out relative overflow-hidden focus:outline-[#3282b8] focus:outline-2 focus:outline-offset-2 hover:not-[.active-mode-td]:bg-[rgba(255,255,255,0.1)] hover:not-[.active-mode-td]:text-white ${
                    viewMode === "teacher" ? "bg-[linear-gradient(135deg,#3282b8_0%,#0f4c75_100%)] text-white shadow-[0_4px_15px_rgba(50,130,184,0.3)]" : ""
                  }`}
                  onClick={() => {
                    setViewMode("teacher");
                    setSelectedItem("all");
                  }}
                >
                  Teacher Timetables
                </button>
              </div>
            </div>
            <div
              className="flex flex-col gap-2"
              style={{ paddingLeft: "10px" }}
            >
              <select
                className="item-selector-td"
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

          <div className="bg-[rgba(255,255,255,0.05)] border-2 border-[rgba(255,255,255,0.1)] rounded-none overflow-hidden backdrop-blur-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-300 ease-in-out mb-8 w-full mx-0 hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
            <div
              className="flex justify-between items-center py-6 px-0 bg-[rgba(255,255,255,0.05)] border-b border-[rgba(255,255,255,0.1)] flex-wrap gap-4 max-md:flex-col max-md:items-stretch max-md:p-4 max-md:py-4"
              style={{ paddingRight: "1rem", paddingLeft: "1rem" }}
            >
              <h4 className="text-2xl font-semibold text-white m-0 [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-sm:text-xl">
                {selectedItem === "all" 
                  ? `All ${viewMode === "class" ? "Classes" : "Teachers"}` 
                  : `${viewMode === "class" ? "Class" : "Teacher"}: ${selectedItem}`
                }
              </h4>
              <div className="flex gap-4 flex-wrap max-md:justify-center max-sm:flex-col max-sm:gap-2">
                <button
                  className="flex items-center gap-2 py-3 px-6 border-none rounded-xl text-[0.9rem] font-medium cursor-pointer transition-all duration-300 ease-in-out color-white relative overflow-hidden focus:outline-[#3282b8] focus:outline-2 focus:outline-offset-2 before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] before:transition-[left] before:duration-500 before:ease-in-out hover:before:left-full max-md:flex-1 max-md:justify-center bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] hover:bg-[linear-gradient(135deg,#059669_0%,#047857_100%)] hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)]"
                  onClick={exportAsPDF}
                >
                  <span className="text-[1.1rem]">📄</span>
                  Export as PDF
                </button>
                <button
                  className="flex items-center gap-2 py-3 px-6 border-none rounded-xl text-[0.9rem] font-medium cursor-pointer transition-all duration-300 ease-in-out color-white relative overflow-hidden focus:outline-[#3282b8] focus:outline-2 focus:outline-offset-2 before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] before:transition-[left] before:duration-500 before:ease-in-out hover:before:left-full max-md:flex-1 max-md:justify-center bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] hover:bg-[linear-gradient(135deg,#d97706_0%,#b45309_100%)] hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)]"
                  onClick={exportAsExcel}
                >
                  <span className="text-[1.1rem]">📊</span>
                  Export as Excel
                </button>
              </div>
            </div>
            <div className="py-8 px-0 max-sm:py-4" id="timetable-container">
              {selectedItem === "all" 
                ? renderAllTimetables() 
                : renderTimetable(currentData[selectedItem])
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableDisplay;