import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import EditTimetable from "./components/EditTimetable";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { AlertTriangle, RefreshCw, Edit3, Users } from "lucide-react";

import "./TimetableDisplay.css";

const TimetableDisplay = ({
  classTimetable: initialClass,
  teacherTimetable: initialTeacher,
  showEditOptions,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState("class");
  const [selectedItem, setSelectedItem] = useState("all");
  const [selectedDay, setSelectedDay] = useState(0);
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
      <div className="error-details-container">
        <div className="error-header">
          <AlertTriangle className="icon-ge error-icon" />
          <h3>Timetable Generation Failed</h3>
        </div>
        
        <div className="error-content">
          <p className="error-main-message">
            {errorMessage || "An error occurred while generating the timetable"}
          </p>
          
          {errorType && errorType !== "UNKNOWN" && (
            <div className="error-type">
              <strong>Error Type:</strong> {errorType.replace(/_/g, ' ')}
            </div>
          )}
          
          {errorDetails && (
            <div className="error-specific-details">
              <strong>Details:</strong>
              {typeof errorDetails === 'string' ? (
                <p>{errorDetails}</p>
              ) : typeof errorDetails === 'object' ? (
                <div className="error-details-list">
                  {Object.entries(errorDetails).map(([key, value]) => (
                    <div key={key} className="error-detail-item">
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
          
          <div className="error-suggestions">
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
                className="action-button retry-button"
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
                <RefreshCw className="icon-ge" />
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
      <div className="dark-gradient-bg-td">
        <div className="container-td">
          <div className="error-state-container">
            {hasError ? renderErrorDetails() : (
              <div className="no-data-alert-td">
                <AlertTriangle className="icon-ge" />
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

    if (viewMode === "master") {
      const classNames = Object.keys(classTimetable);
      const titleElement = document.createElement("h2");
      titleElement.textContent = `Master School Schedule`;
      titleElement.style.textAlign = "center";
      titleElement.style.marginBottom = "30px";
      container.appendChild(titleElement);

      days.forEach((dayName, dayIdx) => {
        const section = document.createElement("div");
        section.style.marginBottom = "50px";
        if (dayIdx < days.length - 1) {
          section.style.pageBreakAfter = "always";
        }

        const header = document.createElement("h3");
        header.textContent = `Schedule: ${dayName}`;
        header.style.marginBottom = "10px";
        header.style.textAlign = "left";
        header.style.color = "#000";
        section.appendChild(header);

        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.fontSize = "12px";

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");

        const thClass = document.createElement("th");
        thClass.textContent = "Class / Period";
        thClass.style.border = "1px solid #000";
        thClass.style.padding = "6px";
        thClass.style.backgroundColor = "#eaeaea";
        headRow.appendChild(thClass);

        periods.forEach((period) => {
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
        classNames.forEach((className) => {
          const tr = document.createElement("tr");

          const tdClass = document.createElement("td");
          tdClass.textContent = className;
          tdClass.style.border = "1px solid #000";
          tdClass.style.padding = "6px";
          tdClass.style.backgroundColor = "#f5f5f5";
          tr.appendChild(tdClass);

          const dayData = classTimetable[className]?.[dayIdx] || [];
          for (let periodIdx = 0; periodIdx < periods.length; periodIdx++) {
            const td = document.createElement("td");
            td.textContent = dayData[periodIdx] || "Free";
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
      });
    } else {
      // Optional title
      const title = document.createElement("h2");
      title.textContent = isAll
        ? `All ${viewMode === "class" ? "Class" : "Teacher"} Timetables`
        : `${viewMode === "class" ? "Class" : "Teacher"}: ${selectedItem}`;
      title.style.textAlign = "center";
      title.style.marginBottom = "30px";
      container.appendChild(title);

      const itemsToExport = isAll ? items : [selectedItem];
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

      const filename = viewMode === "master"
        ? `master_school_schedule.pdf`
        : isAll
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

    if (viewMode === "master") {
      const classNames = Object.keys(classTimetable);
      days.forEach((dayName, dayIdx) => {
        const sheetData = [];
        sheetData.push(["Class / Period", ...periods]);
        classNames.forEach((className) => {
          const row = [...(classTimetable[className]?.[dayIdx] || [])];
          while (row.length < periods.length) {
            row.push("Free");
          }
          sheetData.push([className, ...row]);
        });
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, dayName);
      });

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const filename = `master_school_schedule.xlsx`;

      saveAs(
        new Blob([wbout], { type: "application/octet-stream" }),
        filename
      );
      return;
    }

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
      return <div className="no-data-message-td">No data available</div>;
    }

    // Get actual dimensions from this specific timetable data
    const actualDays = data.length;
    const actualPeriods = Math.max(...data.map(day => Array.isArray(day) ? day.length : 0));
    
    // Generate appropriate headers based on actual data
    const daysToShow = generateDayNames(actualDays);
    const periodsToShow = generatePeriodNames(actualPeriods);

    return (
      <div className="table-container-td">
        <table className="timetable-table-td">
          <thead className="table-header-td">
            <tr>
              <th className="header-cell-td">Day/Period</th>
              {periodsToShow.map((period, index) => (
                <th key={index} className="header-cell-td period-header-td">
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body-td">
            {data.map((dayData, dayIndex) => (
              <tr key={dayIndex} className="table-row-td">
                <td className="day-cell-td">
                  {daysToShow[dayIndex] || `Day ${dayIndex + 1}`}
                </td>
                {/* Render all periods, padding with "Free" if necessary */}
                {Array.from({ length: actualPeriods }, (_, periodIndex) => (
                  <td key={periodIndex} className="period-cell-td">
                    {(() => {
                      const period = dayData[periodIndex];
                      if (period === "Free" || period === "" || period === undefined || period === null) {
                        return <span className="free-period-td">Free</span>;
                      } else {
                        return <span className="subject-badge-td">{period}</span>;
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
      return <div className="no-data-message-td">No data available</div>;
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

  const renderMasterGrid = () => {
    const classNames = Object.keys(classTimetable);
    if (classNames.length === 0) {
      return <div className="no-data-message-td">No data available</div>;
    }

    return (
      <div className="table-container-td">
        <table className="timetable-table-td">
          <thead className="table-header-td">
            <tr>
              <th className="header-cell-td">Class / Period</th>
              {periods.map((period, index) => (
                <th key={index} className="header-cell-td period-header-td">
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body-td">
            {classNames.map((className) => {
              const classSchedule = classTimetable[className];
              const daySchedule = classSchedule && classSchedule[selectedDay] ? classSchedule[selectedDay] : [];
              return (
                <tr key={className} className="table-row-td">
                  <td className="day-cell-td">{className}</td>
                  {Array.from({ length: maxPeriods }, (_, periodIndex) => {
                    const period = daySchedule[periodIndex];
                    if (period === "Free" || period === "" || period === undefined || period === null) {
                      return (
                        <td key={periodIndex} className="period-cell-td">
                          <span className="free-period-td">Free</span>
                        </td>
                      );
                    } else {
                      return (
                        <td key={periodIndex} className="period-cell-td">
                          <span className="subject-badge-td">{period}</span>
                        </td>
                      );
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={`${!showEditOptions ? "dark-gradient-bg-td" : ""}`}>
      <div
        className={`${!showEditOptions ? "container" : ""}`}
        style={{ padding: `${showEditOptions ? "" : "5rem"}`, paddingTop: 0 }}
      >
        {location.state?.timetableId && !showEditOptions && (
          <div className="timetable-header">
            <h2 className="section-title-ge">{location.state.title}</h2>
            <div className="action-buttons-container">
              <button
                type="button"
                className="action-button-td edit-timetable-button-td"
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
                <Edit3 size={14} className="button-icon-td" />
                Edit timetable
              </button>

              <button
                type="button"
                className="action-button-td edit-teachers-button-td"
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
                <Users size={14} className="button-icon-td" />
                Edit teachers
              </button>
            </div>
          </div>
        )}
        <div className="container-td">
          <div className="controls-section-td">
            <div className="view-mode-controls-td">
              <div className="button-group-td relative">
                <div 
                  className="active-tab-indicator-td"
                  style={{
                    transform: `translateX(${viewMode === 'class' ? '0%' : viewMode === 'teacher' ? '100%' : '200%'})`
                  }}
                />
                <button
                  type="button"
                  className={`mode-button-td ${
                    viewMode === "class" ? "active-mode-td" : ""
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
                  className={`mode-button-td ${
                    viewMode === "teacher" ? "active-mode-td" : ""
                  }`}
                  onClick={() => {
                    setViewMode("teacher");
                    setSelectedItem("all");
                  }}
                >
                  Teacher Timetables
                </button>
                <button
                  type="button"
                  className={`mode-button-td ${
                    viewMode === "master" ? "active-mode-td" : ""
                  }`}
                  onClick={() => {
                    setViewMode("master");
                    setSelectedItem("all");
                  }}
                >
                  Master Grid
                </button>
              </div>
            </div>
            <div
              className="selector-controls-td"
              style={{ paddingLeft: "10px" }}
            >
              {viewMode === "master" ? (
                <select
                  className="item-selector-td"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                >
                  {days.map((dayName, idx) => (
                    <option key={idx} value={idx}>
                      {dayName}
                    </option>
                  ))}
                </select>
              ) : (
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
              )}
            </div>
          </div>

          <div className="timetable-card-td">
            <div
              className="card-header-td"
              style={{ paddingRight: "1rem", paddingLeft: "1rem" }}
            >
              <h4 className="card-title-td">
                {viewMode === "master"
                  ? `Master Grid: ${days[selectedDay] || 'Schedule'}`
                  : selectedItem === "all" 
                  ? `All ${viewMode === "class" ? "Classes" : "Teachers"}` 
                  : `${viewMode === "class" ? "Class" : "Teacher"}: ${selectedItem}`
                }
              </h4>
              <div className="export-buttons-td">
                <button
                  className="export-button-td pdf-button-td"
                  onClick={exportAsPDF}
                >
                  <span className="button-icon-td">📄</span>
                  Export as PDF
                </button>
                <button
                  className="export-button-td excel-button-td"
                  onClick={exportAsExcel}
                >
                  <span className="button-icon-td">📊</span>
                  Export as Excel
                </button>
              </div>
            </div>
            <div className="card-body-td" id="timetable-container">
              {viewMode === "master"
                ? renderMasterGrid()
                : selectedItem === "all" 
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