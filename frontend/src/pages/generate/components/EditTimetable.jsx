import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { fetchWithAuth } from "../../../utils/fetchWithAuth";
import { useAuth, useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";

const EditTimetable = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classTimetable, teacherTimetable, id } = location.state;
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

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periods = [
    "Period 1",
    "Period 2",
    "Period 3",
    "Period 4",
    "Period 5",
    "Period 6",
    "Period 7",
    "Period 8",
  ];

  const currentData = currentClassTimeTable;
  const items = currentData ? Object.keys(currentData) : [];

  // Auto-select first item when data is available
  React.useEffect(() => {
    if (items.length > 0 && !selectedItem) {
      setSelectedItem(items[0]);
    }
  }, [items, selectedItem]);

  if (!currentClassTimeTable) {
    return (
      <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden">
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

      let teacher1 =
        period1 !== "Free" && period1 !== ""
          ? period1.split("(")[1].split(")")[0]
          : null;
      let teacher2 =
        period2 !== "Free" && period2 !== ""
          ? period2.split("(")[1].split(")")[0]
          : null;
      console.log(teacher1, teacher2);

      if (
        teacher1 &&
        teacher2 &&
        newTeacher[teacher1][second.dayIndex][second.periodIndex] === "Free" &&
        newTeacher[teacher2][first.dayIndex][first.periodIndex] === "Free"
      ) {
        setShowPositiveMessage(true);
        setTimeout(() => {
          setShowPositiveMessage(false);
          newClass[selectedItem][first.dayIndex][first.periodIndex] = period2;
          newClass[selectedItem][second.dayIndex][second.periodIndex] = period1;

          // Swap teacher periods
          newTeacher[teacher1][second.dayIndex][second.periodIndex] =
            newTeacher[teacher1][first.dayIndex][first.periodIndex];
          newTeacher[teacher1][first.dayIndex][first.periodIndex] = "Free";

          newTeacher[teacher2][first.dayIndex][first.periodIndex] =
            newTeacher[teacher2][second.dayIndex][second.periodIndex];
          newTeacher[teacher2][second.dayIndex][second.periodIndex] = "Free";

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
  };

  const handleSave = async () => {
    try {
      const timetableData = {
        class_timetable: currentClassTimeTable,
        teacher_timetable: currentTeacherTimeTable,
        teacherData: location.state.teacherData,
        classes: location.state.classes,
        subjects: location.state.subjects,
        workingDays: location.state.workingDays,
        periods: location.state.periods ,
        title: location.state.title ,
        userId : user.id,
      };
      if (id) {
        const token = await getToken();
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
        toast.success("Timetable saved successfully");
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
          },
        });
      }

    } catch (error) {
      console.log(error);
      toast.error(error)
    }
  };

  const renderTimetable = (data) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-none p-8 text-[#fca5a5] text-[1.1rem] text-center backdrop-blur-[10px] m-0">
          <div className="text-center p-8 text-[rgba(255,255,255,0.6)] text-base">No data available</div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-none bg-[rgba(255,255,255,0.02)] border-none border-t border-b border-[rgba(255,255,255,0.1)] custom-scrollbar">
        <table className="w-full border-collapse text-[0.9rem] bg-transparent min-w-full max-md:text-[0.8rem] max-sm:text-[0.75rem]">
          <thead className="bg-[linear-gradient(135deg,#1f2937_0%,#374151_100%)]">
            <tr>
              <th className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center font-semibold text-white border border-[rgba(255,255,255,0.1)] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] relative">Day/Period</th>
              {periods.slice(0, data[0]?.length || 8).map((period, index) => (
                <th key={index} className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center font-semibold text-white border border-[rgba(255,255,255,0.1)] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] relative bg-[linear-gradient(135deg,#374151_0%,#4b5563_100%)]">
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[rgba(255,255,255,0.02)]">
            {data.map((dayData, dayIndex) => (
              <tr key={dayIndex} className="transition-all duration-300 ease-in-out border-b border-[rgba(255,255,255,0.05)] last:border-b-0 hover:bg-[rgba(255,255,255,0.05)] hover:scale-[1.01]">
                <td className="p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 font-semibold text-white bg-[linear-gradient(135deg,#0f4c75_0%,#3282b8_100%)] border border-[rgba(255,255,255,0.1)] text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">{days[dayIndex]}</td>
                {dayData.map((period, periodIndex) => (
                  <td
                    key={periodIndex}
                    className={`p-4 max-md:py-3 max-md:px-2 max-sm:py-2 max-sm:px-1 text-center border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] transition-all duration-300 ease-in-out cursor-pointer relative hover:bg-[rgba(255,255,255,0.05)] hover:scale-[1.02] ${
                      selectedPeriods.some(
                        (sel) =>
                          sel.dayIndex === dayIndex &&
                          sel.periodIndex === periodIndex) ? "bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] shadow-[0_4px_15px_rgba(16,185,129,0.4)] scale-[1.02]" : ""
                    }`}
                    onClick={() => handlePeriodSwap(dayIndex, periodIndex)}
                  >
                    {period === "Free" || period === "" ? (
                      <span className="text-[rgba(255,255,255,0.5)] italic text-[0.85rem]">Free</span>
                    ) : (
                      <span className="inline-block py-1.5 px-3 bg-[linear-gradient(135deg,#3b82f6_0%,#1d4ed8_100%)] text-white rounded-lg text-xs font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition-all duration-300 ease-in-out hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(59,130,246,0.4)] max-md:py-1 max-md:px-2 max-md:text-[0.7rem] max-sm:py-1 max-sm:px-2 max-sm:text-[0.65rem]">{period}</span>
                    )}
                    {/* {selectedPeriods.some(
                      (sel) =>
                        sel.dayIndex === dayIndex &&
                        sel.periodIndex === periodIndex
                    ) && <div className="selection-indicator-ett">Selected</div>} */}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden mt-[60px]">
      <div className="max-w-[1200px] mx-auto px-5" style={{ paddingTop: 0 }}>
        {/* Instruction Message */}
        <div className="bg-[rgba(50,130,184,0.1)] border border-[rgba(50,130,184,0.3)] rounded-xl p-6 text-[#93c5fd] text-base mb-8 backdrop-blur-[10px] max-md:mx-4 max-sm:mx-3">
          <div className="font-semibold mb-2 text-white">How to Edit Timetable</div>
          <div className="m-0 leading-normal">
            Select two periods to swap them. The system will automatically check
            if teachers are available for the swap.
          </div>
        </div>

        {/* Controls Section */}
        <div className="grid grid-cols-2 gap-8 mb-8 items-end p-0 max-md:grid-cols-1 max-md:gap-4 max-md:px-4">
          <div className="flex items-center gap-4 flex-wrap max-md:justify-center" style={{ paddingLeft: "1rem" }}>
            <div className="flex bg-[rgba(255,255,255,0.05)] rounded-xl p-1 backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] gap-2 max-md:flex-col max-md:w-full">
              <button
                type="button"
                className="flex items-center gap-2 py-4 px-6 border-none rounded-lg text-base font-medium cursor-pointer transition-all duration-300 ease-in-out text-white relative overflow-hidden focus:outline-[#3282b8] focus:outline-2 focus:outline-offset-2 before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] before:transition-[left] before:duration-500 before:ease-in-out hover:before:left-full max-md:justify-center max-md:w-full max-sm:py-3.5 max-sm:px-6 max-sm:text-[0.9rem] bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] hover:bg-[linear-gradient(135deg,#059669_0%,#047857_100%)] hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)]"
                onClick={handleSave}
              >
                <span>💾</span>
                Save Changes
              </button>
              <button
                type="button"
                className="flex items-center gap-2 py-4 px-6 border-none rounded-lg text-base font-medium cursor-pointer transition-all duration-300 ease-in-out text-white relative overflow-hidden focus:outline-[#3282b8] focus:outline-2 focus:outline-offset-2 before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] before:transition-[left] before:duration-500 before:ease-in-out hover:before:left-full max-md:justify-center max-md:w-full max-sm:py-3.5 max-sm:px-6 max-sm:text-[0.9rem] bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] hover:bg-[linear-gradient(135deg,#d97706_0%,#b45309_100%)] hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)]"
                onClick={handleReset}
              >
                <span>🔄</span>
                Reset
              </button>
            </div>
            <div
              className={`m-0 py-2 px-4 rounded-lg text-[0.9rem] font-medium transition-all duration-300 ease-in-out min-h-[2.5rem] flex items-center ${
                showPositiveMessage ? "bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.3)]" : showNegativeMessage ? "bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]" : ""
              }`}
            >
              {showPositiveMessage
                ? "✅ Updating..."
                : showNegativeMessage
                ? "❌ Cannot swap - Teacher conflict"
                : "Ready to edit"}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <select
              className="item-selector-ett"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
            >
              <option value="">Select Class</option>
              {items.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timetable Card */}
        {selectedItem && (
          <div className="bg-[rgba(255,255,255,0.05)] border-2 border-[rgba(255,255,255,0.1)] rounded-none overflow-hidden backdrop-blur-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-300 ease-in-out mb-8 w-full mx-0 hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-center py-6 px-0 bg-[rgba(255,255,255,0.05)] border-b border-[rgba(255,255,255,0.1)] flex-wrap gap-4 max-md:flex-col max-md:items-stretch max-md:p-4 max-md:py-4" style={{ paddingLeft: "1rem" }}>
              <h4 className="text-2xl font-semibold text-white m-0 [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-sm:text-xl">Class: {selectedItem}</h4>
            </div>
            <div className="py-8 px-0 max-sm:py-4">
              {renderTimetable(currentData[selectedItem])}
            </div>
          </div>
        )}

        {/* No Selection Alert */}
        {!selectedItem && (
          <div className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] rounded-none p-6 text-[#93c5fd] text-base text-center backdrop-blur-[10px] m-0 mb-8">
            Please select a class to view and edit the timetable
          </div>
        )}
      </div>
    </div>
  );
};

export default EditTimetable;
