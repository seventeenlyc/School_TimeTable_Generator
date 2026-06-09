import { ArrowBigRight, ArrowBigRightIcon, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

import toast from "react-hot-toast";

function GeneratePage() {
  const [workingDays, setWorkingDays] = useState();
  const [periods, setPeriods] = useState();
  const [title, setTitle] = useState();
  const [subjects, setSubjects] = useState([""]);
  const [classes, setClasses] = useState([""]);
  const navigate = useNavigate();

  useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

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

  const handleNext = () => {
    // Validate input before proceeding
    if (!workingDays || !periods) {
      alert("Please enter working days and periods per day");
      return;
    }

    if(workingDays>6){
      toast.error("Number of working days cannot exceed 6")
      window.scrollTo(0, 0);
      return;
    }
    
    const validClasses = classes.filter(c => c.trim() !== "");
    const validSubjects = subjects.filter(s => s.trim() !== "");
    
    if (validClasses.length === 0 || validSubjects.length === 0) {
      alert("Please add at least one class and one subject");
      return;
    }

    navigate("/generate/add-teachers", {
      state: { 
        classes: validClasses, 
        subjects: validSubjects,
        workingDays,
        periods,
        title,
        teacherData:null,
        timetableId:null
      },
    });
  };

  return (
    <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden py-8 mt-[60px] max-md:py-4">
      <div className="max-w-[80%] mx-auto px-6 max-md:px-4 max-md:max-w-full max-sm:px-3">
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-4 text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-md:text-xl max-sm:text-lg">Title</h3>
          <input
            type="text"
            className="w-full p-4 border-2 border-[rgba(255,255,255,0.1)] rounded-[12px] bg-[rgba(255,255,255,0.05)] text-white text-base transition-all duration-300 ease-in-out backdrop-blur-[10px] focus:outline-none focus:border-[#3282b8] focus:bg-[rgba(255,255,255,0.1)] focus:shadow-[0_0_20px_rgba(50,130,184,0.3)] placeholder:text-[rgba(255,255,255,0.6)] max-md:p-3.5 max-sm:p-3 max-sm:text-sm"
            placeholder="Enter timetable title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-4 text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-md:text-xl max-sm:text-lg">No of working days</h3>
          <input
            type="number"
            className="w-full p-4 border-2 border-[rgba(255,255,255,0.1)] rounded-[12px] bg-[rgba(255,255,255,0.05)] text-white text-base transition-all duration-300 ease-in-out backdrop-blur-[10px] focus:outline-none focus:border-[#3282b8] focus:bg-[rgba(255,255,255,0.1)] focus:shadow-[0_0_20px_rgba(50,130,184,0.3)] placeholder:text-[rgba(255,255,255,0.6)] max-md:p-3.5 max-sm:p-3 max-sm:text-sm"
            placeholder="Enter working days (e.g., 5)"
            value={workingDays}
            onChange={(e) => setWorkingDays(e.target.value)}
          />
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-4 text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-md:text-xl max-sm:text-lg">No of periods per day</h3>
          <input
            type="number"
            className="w-full p-4 border-2 border-[rgba(255,255,255,0.1)] rounded-[12px] bg-[rgba(255,255,255,0.05)] text-white text-base transition-all duration-300 ease-in-out backdrop-blur-[10px] focus:outline-none focus:border-[#3282b8] focus:bg-[rgba(255,255,255,0.1)] focus:shadow-[0_0_20px_rgba(50,130,184,0.3)] placeholder:text-[rgba(255,255,255,0.6)] max-md:p-3.5 max-sm:p-3 max-sm:text-sm"
            placeholder="Enter periods per day (e.g., 8)"
            value={periods}
            onChange={(e) => setPeriods(e.target.value)}
          />
        </div>

        <div className="mb-12">
          <h3 className="text-2xl font-semibold mb-4 text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-md:text-xl max-sm:text-lg">Add Classes</h3>
          <div className="flex flex-col gap-4">
            {classes.map((clas, index) => {
              return (
                <input
                  key={index}
                  type="text"
                  className="w-full p-4 border-2 border-[rgba(255,255,255,0.1)] rounded-[12px] bg-[rgba(255,255,255,0.05)] text-white text-base transition-all duration-300 ease-in-out backdrop-blur-[10px] focus:outline-none focus:border-[#3282b8] focus:bg-[rgba(255,255,255,0.1)] focus:shadow-[0_0_20px_rgba(50,130,184,0.3)] placeholder:text-[rgba(255,255,255,0.6)] max-md:p-3.5 max-sm:p-3 max-sm:text-sm"
                  placeholder={`Class ${index + 1} (e.g., Grade 10A)`}
                  value={clas}
                  onChange={(e) => handleChangeClasses(index, e.target.value)}
                />
              );
            })}

            <button
              onClick={handleAddClasses}
              className="flex items-center justify-center p-4 border-2 border-transparent rounded-[12px] bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] text-white text-base font-medium cursor-pointer transition-all duration-300 ease-in-out gap-2 min-h-[56px] hover:bg-[linear-gradient(135deg,#059669_0%,#047857_100%)] hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] active:translate-y-0 max-md:p-3.5 max-md:text-sm max-sm:p-3 max-sm:text-xs"
            >
              <Plus className="w-5 h-5" />
              <span>Add one more Class</span>
            </button>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-2xl font-semibold mb-4 text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.3)] max-md:text-xl max-sm:text-lg">Add subjects</h3>
          <div className="flex flex-col gap-4">
            {subjects.map((subject, index) => {
              return (
                <input
                  key={index}
                  type="text"
                  className="w-full p-4 border-2 border-[rgba(255,255,255,0.1)] rounded-[12px] bg-[rgba(255,255,255,0.05)] text-white text-base transition-all duration-300 ease-in-out backdrop-blur-[10px] focus:outline-none focus:border-[#3282b8] focus:bg-[rgba(255,255,255,0.1)] focus:shadow-[0_0_20px_rgba(50,130,184,0.3)] placeholder:text-[rgba(255,255,255,0.6)] max-md:p-3.5 max-sm:p-3 max-sm:text-sm"
                  placeholder={`Subject ${index + 1} (e.g., Mathematics)`}
                  value={subject}
                  onChange={(e) => handleChangeSubject(index, e.target.value)}
                />
              );
            })}

            <button
              onClick={handleAddSubject}
              className="flex items-center justify-center p-4 border-2 border-transparent rounded-[12px] bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] text-white text-base font-medium cursor-pointer transition-all duration-300 ease-in-out gap-2 min-h-[56px] hover:bg-[linear-gradient(135deg,#059669_0%,#047857_100%)] hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] active:translate-y-0 max-md:p-3.5 max-md:text-sm max-sm:p-3 max-sm:text-xs"
            >
              <Plus className="w-5 h-5" />
              <span>Add one more Subject</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center mt-12 mb-8">
          <button
            className="flex items-center justify-center py-5 px-10 border-none rounded-[15px] bg-[linear-gradient(135deg,#1f2937_0%,#374151_100%)] text-white text-[1.25rem] font-semibold cursor-pointer transition-all duration-300 ease-in-out gap-3 min-w-[200px] relative overflow-hidden group hover:bg-[linear-gradient(135deg,#374151_0%,#4b5563_100%)] hover:-translate-y-[3px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] active:-translate-y-[1px] max-md:py-4 max-md:px-8 max-md:text-[1.1rem] max-md:min-w-[180px] max-sm:py-3.5 max-sm:px-6 max-sm:text-base max-sm:min-w-[160px] before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] before:transition-[left] before:duration-500 before:ease-in-out hover:before:left-full"
            onClick={handleNext}
          >
            <span>Add Teachers</span>
            <ArrowBigRight className="w-6 h-6 transition-transform duration-300 ease-in-out group-hover:translate-x-[5px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default GeneratePage;