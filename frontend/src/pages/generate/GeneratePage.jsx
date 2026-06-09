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
    <div className="min-h-screen bg-gradient-to-br from-[#030712] via-[#0b1329] to-[#0d285c] py-8 mt-[60px] text-white overflow-x-hidden relative">
      <div className="max-w-[90%] md:max-w-[80%] mx-auto px-4 md:px-6 relative z-10">
        <div className="mb-8">
          <h3 className="text-xl md:text-2xl font-semibold mb-4 text-white drop-shadow-md">Title</h3>
          <input
            type="text"
            className="w-full p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] placeholder:text-white/60"
            placeholder="Enter timetable title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="mb-8">
          <h3 className="text-xl md:text-2xl font-semibold mb-4 text-white drop-shadow-md">No of working days</h3>
          <input
            type="number"
            className="w-full p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] placeholder:text-white/60"
            placeholder="Enter working days (e.g., 5)"
            value={workingDays}
            onChange={(e) => setWorkingDays(e.target.value)}
          />
        </div>

        <div className="mb-8">
          <h3 className="text-xl md:text-2xl font-semibold mb-4 text-white drop-shadow-md">No of periods per day</h3>
          <input
            type="number"
            className="w-full p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] placeholder:text-white/60"
            placeholder="Enter periods per day (e.g., 8)"
            value={periods}
            onChange={(e) => setPeriods(e.target.value)}
          />
        </div>

        <div className="mb-12">
          <h3 className="text-xl md:text-2xl font-semibold mb-4 text-white drop-shadow-md">Add Classes</h3>
          <div className="flex flex-col gap-4">
            {classes.map((clas, index) => {
              return (
                <input
                  key={index}
                  type="text"
                  className="w-full p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] placeholder:text-white/60 mb-0"
                  placeholder={`Class ${index + 1} (e.g., Grade 10A)`}
                  value={clas}
                  onChange={(e) => handleChangeClasses(index, e.target.value)}
                />
              );
            })}

            <button
              onClick={handleAddClasses}
              className="flex items-center justify-center p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-base font-medium cursor-pointer transition-all duration-300 gap-2 min-h-[56px] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] active:translate-y-0"
            >
              <Plus className="w-5 h-5" />
              <span>Add one more Class</span>
            </button>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-xl md:text-2xl font-semibold mb-4 text-white drop-shadow-md">Add subjects</h3>
          <div className="flex flex-col gap-4">
            {subjects.map((subject, index) => {
              return (
                <input
                  key={index}
                  type="text"
                  className="w-full p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white text-base transition-all duration-300 focus:outline-none focus:border-blue-500 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] placeholder:text-white/60 mb-0"
                  placeholder={`Subject ${index + 1} (e.g., Mathematics)`}
                  value={subject}
                  onChange={(e) => handleChangeSubject(index, e.target.value)}
                />
              );
            })}

            <button
              onClick={handleAddSubject}
              className="flex items-center justify-center p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-base font-medium cursor-pointer transition-all duration-300 gap-2 min-h-[56px] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] active:translate-y-0"
            >
              <Plus className="w-5 h-5" />
              <span>Add one more Subject</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center mt-12 mb-8">
          <button
            className="flex items-center justify-center py-4 px-8 border-none rounded-[15px] bg-gradient-to-r from-slate-800 to-slate-700 text-white text-xl font-semibold cursor-pointer transition-all duration-300 gap-3 min-w-[200px] relative overflow-hidden group hover:translate-y-[-3px] hover:shadow-2xl active:translate-y-[-1px]"
            onClick={handleNext}
          >
            <span>Add Teachers</span>
            <ArrowBigRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default GeneratePage;