import { useState, useEffect } from "react";
import { Plus, Loader2, X, Save, AlertTriangle, RefreshCw } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import DropdownChecklist from "./components/DropdownChecklist";
import TimetableDisplay from "./TimetableDisplay";
import EditTimetable from "./components/EditTimetable";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import toast from "react-hot-toast";

function AddTeacher() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { state } = useLocation();
  const location = useLocation();
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);

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
      return teacherData;
    }
    return [
      {
        name: "",
        subjects: [],
        assigned_class: "",
        mainSubject: "",
        labPeriod: "",
        periods: [{ class_name: "", subject: "", noOfPeriods: "" }],
      },
    ];
  });

  const [loading, setLoading] = useState(false);
  const [timetableData, setTimetableData] = useState(null);

  // Store the teachers data when timetable is generated
  const [savedTeachersData, setSavedTeachersData] = useState(null);

  

  // Component functions remain the same until generateTimetable...
  const handleAddTeacher = () => {
    setTeachers([
      ...teachers,
      {
        name: "",
        assigned_class: "",
        mainSubject: "",
        labPeriod: "",
        periods: [{ _name: "", subject: "", noOfPeriods: "" }],
        subjects: [],
      },
    ]);
  };

  const handleDeleteTeacher = (index) => {
    if (teachers.length > 1) {
      const newTeachers = teachers.filter((_, i) => i !== index);
      setTeachers(newTeachers);
    }
  };

  const handleAddPeriod = (index) => {
    const newTeachers = [...teachers];
    newTeachers[index].periods = [
      ...newTeachers[index].periods,
      {
        class_name: "",
        subject: newTeachers[index].mainSubject,
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
    console.log(teachers);
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

  // Updated generateTimetable function with proper error handling
  const generateTimetable = async () => {
    setLoading(true);
    setError("");
    setErrorDetails(null);

    try {
      // Validate input
      for (const teacher of teachers) {
        if (!teacher.name.trim()) {
          throw new Error("Please enter all teacher names");
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

      // Save current teachers data before generating timetable
      setSavedTeachersData(JSON.parse(JSON.stringify(teachers)));

      // Prepare data for API
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
      // Check if the response indicates an error or infeasible solution
      if (data.status === "ERROR" || data.status === "INFEASIBLE") {
        setError(data.message || "Failed to generate timetable");
        setErrorDetails(data);
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate timetable");
      }

      // Check if timetables are empty (additional safety check)
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
    console.log(savedTeachersData);
    // Restore the saved teachers data when going back
    if (savedTeachersData) {
      setTeachers(savedTeachersData);
    }
    setTimetableData(null);
    setError("");
    setErrorDetails(null);
  };

  const handleRegenerateWithCurrentData = async () => {
    // Use current teachers data to regenerate
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

  // Helper function to render error details
  const renderErrorDetails = () => {
    if (!errorDetails) return null;

    return (
      <div className="error-details-container">
        <div className="error-header">
          <AlertTriangle className="icon-ge error-icon" />
          <h4>Timetable Generation Failed</h4>
        </div>

        <div className="error-content">
          <p className="error-main-message">{error}</p>

          {errorDetails.error_type && (
            <div className="error-type">
              <strong>Error Type:</strong> {errorDetails.error_type}
            </div>
          )}

          {errorDetails.error_details && (
            <div className="error-specific-details">
              <strong>Details:</strong>
              {typeof errorDetails.error_details === "string" ? (
                <p>{errorDetails.error_details}</p>
              ) : (
                <ul>
                  {Object.entries(errorDetails.error_details).map(
                    ([key, value]) => (
                      <li key={key}>
                        <strong>{key.replace(/_/g, " ")}:</strong>{" "}
                        {Array.isArray(value)
                          ? value.join(", ")
                          : typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="error-suggestions">
            <h5>Suggestions to fix this issue:</h5>
            <ul>
              <li>
                Check if teacher period assignments don't exceed available time
                slots
              </li>
              <li>
                Ensure class schedules don't conflict with teacher
                availabilities
              </li>
              <li>
                Verify that subject assignments are realistic for the given time
                frame
              </li>
              <li>
                Consider reducing the number of periods or adjusting teacher
                workload
              </li>
              <li>
                Make sure all teachers have feasible subject-class combinations
              </li>
            </ul>
          </div>

          <div className="error-actions">
            <button
              className="flex items-center gap-2 bg-[linear-gradient(135deg,#dc2626_0%,#b91c1c_100%)] text-white py-3 px-6 border-none rounded-lg font-medium cursor-pointer transition-all duration-200 ease-in-out no-underline hover:bg-[linear-gradient(135deg,#b91c1c_0%,#991b1b_100%)] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)] active:translate-y-0 max-md:w-full max-md:justify-center"
              onClick={handleRegenerateWithCurrentData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If timetable is generated, show the timetable display
  if (timetableData) {
    return (
      <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden py-8 mt-[60px] max-md:py-4">
        <div className="max-w-[80%] mx-auto px-6 max-md:px-4 max-md:max-w-full max-sm:px-3">
          <div className="timetable-header">
            <h2 className="text-2xl font-semibold mb-4 text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-md:text-xl max-sm:text-lg">Generated Timetable</h2>
            <div className="action-buttons-container">
              <button
                className="flex items-center gap-2 py-3 px-6 border-none rounded-xl text-base font-medium cursor-pointer transition-all duration-300 ease-in-out text-white no-underline max-md:w-full max-md:justify-center bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] hover:bg-[linear-gradient(135deg,#d97706_0%,#b45309_100%)] hover:-translate-y-[2px]"
                onClick={handleSavetoDb}
                title="Save"
              >
                <Save className="w-5 h-5" />
                Save
              </button>

              <button
                className="flex items-center gap-2 py-3 px-6 border-none rounded-xl text-base font-medium cursor-pointer transition-all duration-300 ease-in-out text-white no-underline max-md:w-full max-md:justify-center bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] hover:bg-[linear-gradient(135deg,#d97706_0%,#b45309_100%)] hover:-translate-y-[2px]"
                onClick={handleBackToTeachers}
                title="Go back to edit teachers"
              >
                <span className="button-icon-td">👥</span>
                Edit Teachers
              </button>

              <button
                type="button"
                className="flex items-center gap-2 py-3 px-6 border-none rounded-xl text-base font-medium cursor-pointer transition-all duration-300 ease-in-out text-white no-underline max-md:w-full max-md:justify-center bg-[linear-gradient(135deg,#3b82f6_0%,#2563eb_100%)] hover:bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_100%)] hover:-translate-y-[2px]"
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
                <span className="button-icon-td">✏️</span>
                Edit timetable
              </button>

              <button
                className="flex items-center gap-2 py-3 px-6 border-none rounded-xl text-base font-medium cursor-pointer transition-all duration-300 ease-in-out text-white no-underline max-md:w-full max-md:justify-center bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] hover:bg-[linear-gradient(135deg,#059669_0%,#047857_100%)] hover:-translate-y-[2px] disabled:bg-[linear-gradient(135deg,#6b7280_0%,#4b5563_100%)] disabled:cursor-not-allowed disabled:transform-none"
                onClick={handleRegenerateWithCurrentData}
                disabled={loading}
                title="Regenerate timetable with current data"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
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
    <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden py-8 mt-[60px] max-md:py-4">
      <div className="max-w-full w-full px-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-md:text-xl max-sm:text-lg">Add Teachers</h2>
          {savedTeachersData && (
            <div className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] rounded-lg p-4 text-[#93c5fd] text-[0.9rem] backdrop-blur-[10px]">
              <strong>Note:</strong> You can edit the data below and regenerate
              the timetable
            </div>
          )}
        </div>

        {/* Enhanced Error Display */}
        {error && (
          <div className="error-section">
            {errorDetails ? (
              renderErrorDetails()
            ) : (
              <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg p-4 text-[#fca5a5] text-[0.9rem] mb-6 backdrop-blur-[10px]">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-8">
          {teachers.map((teacher, index) => {
            return (
              <div className="bg-[rgba(255,255,255,0.05)] border-2 border-[rgba(255,255,255,0.1)] rounded-2xl p-8 relative backdrop-blur-[10px] transition-all duration-300 ease-in-out w-full box-border hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] hover:-translate-y-[2px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-sm:p-6" key={index}>
                {/* Delete Teacher Button */}
                {teachers.length > 1 && (
                  <button
                    onClick={() => handleDeleteTeacher(index)}
                    className="absolute top-4 right-4 bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_100%)] border-none rounded-lg p-2 text-white cursor-pointer transition-all duration-300 ease-in-out flex items-center justify-center hover:bg-[linear-gradient(135deg,#dc2626_0%,#b91c1c_100%)] hover:scale-105"
                    title="Delete Teacher"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 mb-8 max-md:grid-cols-1 max-md:gap-4 max-sm:gap-3">
                  <div className="flex flex-col gap-4">
                    <label className="block mb-2 font-medium text-white text-[0.9rem] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">Name</label>
                    <input
                      type="text"
                      className="form-input-ge"
                      placeholder={`Teacher ${index + 1}`}
                      value={teacher.name}
                      onChange={(e) =>
                        handleChangeTeacherName(index, e.target.value)
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="block mb-2 font-medium text-white text-[0.9rem] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">Subjects</label>
                    <DropdownChecklist
                      options={subjects}
                      selected={teacher.subjects}
                      onChange={(selected) =>
                        handleChangeSelectedSubjects(index, selected)
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="block mb-2 font-medium text-white text-[0.9rem] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">Main Subject</label>
                    <select
                      className="form-select-ge"
                      value={teacher.mainSubject}
                      onChange={(e) =>
                        handleChangeMainSubject(index, e.target.value)
                      }
                    >
                      <option>Select Main Subject</option>
                      {teacher.subjects.map((subject, ind) =>
                        subject !== "" ? (
                          <option key={ind} value={subject}>
                            {subject}
                          </option>
                        ) : null
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="block mb-2 font-medium text-white text-[0.9rem] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">Lab Period</label>
                    <select
                      className="form-select-ge"
                      value={teacher.labPeriod}
                      onChange={(e) =>
                        handleChangeLabPeriod(index, e.target.value)
                      }
                    >
                      <option>Select Lab Period</option>
                      {teacher.subjects.map((subject, ind) =>
                        subject !== "" ? (
                          <option key={ind} value={subject}>
                            {subject}
                          </option>
                        ) : null
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-8 p-4 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.1)] max-md:flex-col max-md:items-stretch">
                  <label className="text-[1.1rem] font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] whitespace-nowrap">
                    If class teacher, select class
                  </label>
                  <select
                    className="form-select-ge max-w-[200px] max-md:max-w-full"
                    value={teacher.assigned_class}
                    onChange={(e) => handleChangeClass(index, e.target.value)}
                  >
                    <option>Select Class</option>
                    {classes.map((clas, ind) =>
                      clas !== "" ? (
                        <option
                          key={ind}
                          value={clas}
                          disabled={
                            assignedClasses.includes(clas) &&
                            clas !== teacher.assigned_class
                          }
                        >
                          {clas}
                        </option>
                      ) : null
                    )}
                  </select>
                </div>

                <div className="mt-8">
                  <h3 className="text-[1.3rem] font-semibold text-white mb-6 [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]">Assign Periods</h3>
                  <div className="flex flex-col gap-4 mb-6">
                    {teacher.periods.map((period, ind) => {
                      return (
                        <div className="grid grid-cols-3 gap-4 items-end p-4 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.1)] relative max-md:grid-cols-1 max-md:pt-8 max-sm:p-6 max-sm:pt-6" key={ind}>
                          {/* Delete Period Button - positioned absolutely in top-right */}
                          {teacher.periods.length > 1 && (
                            <button
                              onClick={() => handleDeletePeriod(index, ind)}
                              className="absolute top-2 right-2 bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_100%)] border-none rounded-md p-1 text-white cursor-pointer transition-all duration-300 ease-in-out flex items-center justify-center h-8 w-8 z-10 hover:bg-[linear-gradient(135deg,#dc2626_0%,#b91c1c_100%)] hover:scale-105 max-sm:h-7 max-sm:w-7"
                              title="Delete Period"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}

                          <div className="flex flex-col gap-4">
                            <label className="block mb-2 font-medium text-white text-[0.9rem] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">Class</label>
                            <select
                              className="form-select-ge"
                              value={period.class_name}
                              onChange={(e) =>
                                handleChangePeriodClass(
                                  index,
                                  ind,
                                  e.target.value
                                )
                              }
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

                          <div className="flex flex-col gap-4">
                            <label className="block mb-2 font-medium text-white text-[0.9rem] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">Subject</label>
                            <select
                              className="form-select-ge"
                              value={period.subject}
                              onChange={(e) =>
                                handleChangePeriodSubject(
                                  index,
                                  ind,
                                  e.target.value
                                )
                              }
                            >
                              <option>
                                {teacher.mainSubject
                                  ? teacher.mainSubject
                                  : "Select Subject"}
                              </option>
                              {teacher.subjects.map((sub, subInd) =>
                                sub !== "" && sub !== teacher.mainSubject ? (
                                  <option key={subInd} value={sub}>
                                    {sub}
                                  </option>
                                ) : null
                              )}
                            </select>
                          </div>

                          <div className="flex flex-col gap-4">
                            <label className="block mb-2 font-medium text-white text-[0.9rem] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">No of Periods</label>
                            <input
                              type="number"
                              className="form-input-ge"
                              placeholder="No of periods"
                              value={period.noOfPeriods}
                              onChange={(e) =>
                                handleChangePeriodNumber(
                                  index,
                                  ind,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleAddPeriod(index)}
                    className="add-button-ge"
                  >
                    <Plus className="w-5 h-5" />
                    Add another period
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex justify-center mt-8">
            <button
              onClick={handleAddTeacher}
              className="flex items-center justify-center p-4 border-2 border-transparent rounded-[12px] bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] text-white text-[1.1rem] font-medium cursor-pointer transition-all duration-300 ease-in-out gap-2 min-h-[56px] hover:bg-[linear-gradient(135deg,#059669_0%,#047857_100%)] hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] active:translate-y-0 w-full max-w-[400px] p-5"
            >
              <Plus className="w-5 h-5" />
              Add another Teacher
            </button>
          </div>

          <div className="flex justify-center items-center mt-12 mb-8">
            <button
              className="flex items-center justify-center py-5 px-10 border-none rounded-[15px] bg-[linear-gradient(135deg,#1f2937_0%,#374151_100%)] text-white text-[1.25rem] font-semibold cursor-pointer transition-all duration-300 ease-in-out gap-3 min-w-[200px] relative overflow-hidden group hover:bg-[linear-gradient(135deg,#374151_0%,#4b5563_100%)] hover:-translate-y-[3px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] active:-translate-y-[1px] max-md:py-4 max-md:px-8 max-md:text-[1.1rem] max-md:min-w-[180px] max-sm:py-3.5 max-sm:px-6 max-sm:text-base max-sm:min-w-[160px] before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] before:transition-[left] before:duration-500 before:ease-in-out hover:before:left-full"
              onClick={generateTimetable}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
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
      </div>
    </div>
  );
}

export default AddTeacher;
