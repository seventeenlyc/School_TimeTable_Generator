import { useState, useEffect } from "react";
import { Plus, Loader2, X, Save, AlertTriangle, RefreshCw, Users, Edit3 } from "lucide-react";
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
              className="action-button retry-button"
              onClick={handleRegenerateWithCurrentData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="icon-ge animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="icon-ge" />
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
      <div className="dark-gradient-bg-ge">
        <div className="container-ge">
          <div className="timetable-header">
            <h2 className="section-title-ge">Generated Timetable</h2>
            <div className="action-buttons-container">
              <button
                className="action-button save-button"
                onClick={handleSavetoDb}
                title="Save"
              >
                <Save className="icon-ge" />
                Save
              </button>

              <button
                className="action-button edit-button"
                onClick={handleBackToTeachers}
                title="Go back to edit teachers"
              >
                <Users size={14} className="button-icon-td" />
                Edit Teachers
              </button>

              <button
                type="button"
                className="action-button primary-button"
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
                <Edit3 size={14} className="button-icon-td" />
                Edit timetable
              </button>

              <button
                className="action-button regenerate-button"
                onClick={handleRegenerateWithCurrentData}
                disabled={loading}
                title="Regenerate timetable with current data"
              >
                {loading ? (
                  <>
                    <Loader2 className="icon-ge animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Plus className="icon-ge" />
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
    <div className="dark-gradient-bg-ge">
      <div className="container-at">
        <div className="header-section">
          <h2 className="section-title-ge">Add Teachers</h2>
          {savedTeachersData && (
            <div className="info-alert">
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
              <div className="error-alert">
                <AlertTriangle className="icon-ge" />
                {error}
              </div>
            )}
          </div>
        )}

        <div className="teachers-container">
          {teachers.map((teacher, index) => {
            return (
              <div className="teacher-card" key={index}>
                {/* Delete Teacher Button */}
                {teachers.length > 1 && (
                  <button
                    onClick={() => handleDeleteTeacher(index)}
                    className="delete-teacher-btn"
                    title="Delete Teacher"
                  >
                    <X className="icon-ge" />
                  </button>
                )}

                <div className="teacher-info-row">
                  <div className="input-group-ge">
                    <label className="input-label">Name</label>
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

                  <div className="input-group-ge">
                    <label className="input-label">Subjects</label>
                    <DropdownChecklist
                      options={subjects}
                      selected={teacher.subjects}
                      onChange={(selected) =>
                        handleChangeSelectedSubjects(index, selected)
                      }
                    />
                  </div>

                  <div className="input-group-ge">
                    <label className="input-label">Main Subject</label>
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

                  <div className="input-group-ge">
                    <label className="input-label">Lab Period</label>
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

                <div className="class-teacher-section">
                  <label className="class-teacher-label">
                    If class teacher, select class
                  </label>
                  <select
                    className="form-select-ge class-select"
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

                <div className="periods-section">
                  <h3 className="periods-title">Assign Periods</h3>
                  <div className="periods-container">
                    {teacher.periods.map((period, ind) => {
                      return (
                        <div className="period-row" key={ind}>
                          {/* Delete Period Button - positioned absolutely in top-right */}
                          {teacher.periods.length > 1 && (
                            <button
                              onClick={() => handleDeletePeriod(index, ind)}
                              className="delete-period-btn"
                              title="Delete Period"
                            >
                              <X className="icon-ge" />
                            </button>
                          )}

                          <div className="input-group-ge">
                            <label className="input-label">Class</label>
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

                          <div className="input-group-ge">
                            <label className="input-label">Subject</label>
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

                          <div className="input-group-ge">
                            <label className="input-label">No of Periods</label>
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
                    <Plus className="icon-ge" />
                    Add another period
                  </button>
                </div>
              </div>
            );
          })}

          <div className="add-teacher-container">
            <button
              onClick={handleAddTeacher}
              className="add-button-ge add-teacher-btn"
            >
              <Plus className="icon-ge" />
              Add another Teacher
            </button>
          </div>

          <div className="next-button-container-ge">
            <button
              className="next-button-ge"
              onClick={generateTimetable}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="arrow-icon-ge animate-spin" />
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
