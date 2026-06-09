import { BookOpen, Code, Database, Server, Calendar, Download, Users, Settings, Globe } from "lucide-react";

import { useEffect } from "react";

function GuidePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden">
      <div className="max-w-[1400px] my-[50px] mx-auto px-8 relative z-10 max-md:px-4">
        <div className="flex flex-col min-h-screen pt-8">
          <div className="flex-1">
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-tight mb-6 [text-shadow:2px_2px_8px_rgba(0,0,0,0.6)] tracking-[-0.02em] text-center max-md:text-[2.5rem] max-sm:text-[2rem]">
              How the <span className="bg-[linear-gradient(45deg,#00ff87,#32c8b8)] bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(0,255,135,0.3)]">Timetable Generator</span> Works
            </h1>
            <h3 className="text-[1.2rem] text-[rgba(255,255,255,0.85)] leading-relaxed mb-12 text-center font-normal max-w-[800px] mx-auto max-md:text-[1.1rem] max-sm:text-[1rem]">
              A detailed breakdown of how our system intelligently creates optimized school timetables using powerful algorithms, dynamic editing, and export capabilities.
            </h3>
            
            <section className="py-12 mb-8 relative animate-[fadeInUp_0.8s_ease-out_forwards]">
              <h2 className="text-[2.5rem] font-extrabold bg-[linear-gradient(45deg,#00ff87,#32c8b8)] bg-clip-text text-transparent mb-8 [text-shadow:0_0_10px_rgba(0,255,135,0.3)] relative before:content-[''] before:absolute before:-bottom-[10px] before:left-0 before:w-[60px] before:h-[3px] before:bg-[linear-gradient(90deg,#00ff87,#32c8b8)] before:rounded-[2px] max-md:text-[2rem] max-sm:text-[1.8rem]">Tech Stack</h2>
              <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed mb-6 max-md:text-[1rem] max-sm:text-[0.9rem]">
                Our platform is built on a modern, scalable, and developer-friendly architecture:
              </p>
              <ul className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed mb-6 max-md:text-[1rem] max-sm:text-[0.9rem]" style={{ listStyleType: "disc", paddingLeft: "2rem" }}>
                <li><strong className="text-[#00ff87] font-bold">Frontend:</strong> React</li>
                <li><strong className="text-[#00ff87] font-bold">Authentication:</strong> Clerk</li>
                <li><strong className="text-[#00ff87] font-bold">Backend:</strong> FastAPI (Python)</li>
                <li><strong className="text-[#00ff87] font-bold">Database:</strong> MongoDB</li>
                <li><strong className="text-[#00ff87] font-bold">Timetable Engine:</strong> Google OR-Tools (Constraint Programming Solver)</li>
                <li><strong className="text-[#00ff87] font-bold">Deployment:</strong> Render</li>
              </ul>
            </section>

            <section className="py-12 mb-8 relative animate-[fadeInUp_0.8s_ease-out_forwards]">
              <h2 className="text-[2.5rem] font-extrabold bg-[linear-gradient(45deg,#00ff87,#32c8b8)] bg-clip-text text-transparent mb-8 [text-shadow:0_0_10px_rgba(0,255,135,0.3)] relative before:content-[''] before:absolute before:-bottom-[10px] before:left-0 before:w-[60px] before:h-[3px] before:bg-[linear-gradient(90deg,#00ff87,#32c8b8)] before:rounded-[2px] max-md:text-[2rem] max-sm:text-[1.8rem]">What You Input</h2>
              <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed mb-6 max-md:text-[1rem] max-sm:text-[0.9rem]">
                When generating a timetable, the following inputs are provided by the user:
              </p>
              <div className="grid grid-cols-4 gap-8 max-md:grid-cols-1 max-md:gap-6">
                {/* Feature 1 */}
                <div className="group w-full h-[300px] max-md:h-[280px] max-sm:h-[250px] [perspective:1000px] animate-[fadeInUp_0.8s_ease-out_both]" style={{ "--index": 0 }}>
                  <div className="relative w-full h-full text-center transition-transform duration-[0.6s] [transform-style:preserve-3d] cursor-pointer group-hover:[transform:rotateY(180deg)]">
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.6)] border-2 border-[rgba(50,130,184,0.4)] backdrop-blur-[20px]">
                      <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6 bg-[rgba(0,255,135,0.1)] border-2 border-[rgba(0,255,135,0.3)]">
                        <Settings className="text-[#00ff87] filter drop-shadow-[0_0_10px_rgba(0,255,135,0.4)]" size={40} />
                      </div>
                      <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">General Settings</h3>
                      <p className="text-sm md:text-base text-[rgba(255,255,255,0.85)] leading-normal m-0">
                        Title, number of working days, and periods per day.
                      </p>
                    </div>
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.85)] border-2 border-[rgba(0,255,135,0.6)] [transform:rotateY(180deg)] backdrop-blur-[20px]">
                      <h3 className="text-[1.6rem] font-extrabold text-[#00ff87] mb-4 [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">General Settings</h3>
                      <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed m-0 max-md:text-[1rem] max-sm:text-[0.9rem]">
                        Configure the timetable's title, the number of working days in a week, and the number of periods per day to suit your school's schedule.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Feature 2 */}
                <div className="group w-full h-[300px] max-md:h-[280px] max-sm:h-[250px] [perspective:1000px] animate-[fadeInUp_0.8s_ease-out_both]" style={{ "--index": 1 }}>
                  <div className="relative w-full h-full text-center transition-transform duration-[0.6s] [transform-style:preserve-3d] cursor-pointer group-hover:[transform:rotateY(180deg)]">
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.6)] border-2 border-[rgba(50,130,184,0.4)] backdrop-blur-[20px]">
                      <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6 bg-[rgba(0,255,135,0.1)] border-2 border-[rgba(0,255,135,0.3)]">
                        <Users className="text-[#00ff87] filter drop-shadow-[0_0_10px_rgba(0,255,135,0.4)]" size={40} />
                      </div>
                      <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">Classes</h3>
                      <p className="text-sm md:text-base text-[rgba(255,255,255,0.85)] leading-normal m-0">
                        List of class names (e.g., XA, XB).
                      </p>
                    </div>
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.85)] border-2 border-[rgba(0,255,135,0.6)] [transform:rotateY(180deg)] backdrop-blur-[20px]">
                      <h3 className="text-[1.6rem] font-extrabold text-[#00ff87] mb-4 [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">Classes</h3>
                      <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed m-0 max-md:text-[1rem] max-sm:text-[0.9rem]">
                        Define the classes for which the timetable will be generated, such as XA, XB, etc.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Feature 3 */}
                <div className="group w-full h-[300px] max-md:h-[280px] max-sm:h-[250px] [perspective:1000px] animate-[fadeInUp_0.8s_ease-out_both]" style={{ "--index": 2 }}>
                  <div className="relative w-full h-full text-center transition-transform duration-[0.6s] [transform-style:preserve-3d] cursor-pointer group-hover:[transform:rotateY(180deg)]">
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.6)] border-2 border-[rgba(50,130,184,0.4)] backdrop-blur-[20px]">
                      <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6 bg-[rgba(0,255,135,0.1)] border-2 border-[rgba(0,255,135,0.3)]">
                        <BookOpen className="text-[#00ff87] filter drop-shadow-[0_0_10px_rgba(0,255,135,0.4)]" size={40} />
                      </div>
                      <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">Teachers</h3>
                      <p className="text-sm md:text-base text-[rgba(255,255,255,0.85)] leading-normal m-0">
                        Name, subjects taught, base class, and lab subjects.
                      </p>
                    </div>
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.85)] border-2 border-[rgba(0,255,135,0.6)] [transform:rotateY(180deg)] backdrop-blur-[20px]">
                      <h3 className="text-[1.6rem] font-extrabold text-[#00ff87] mb-4 [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">Teachers</h3>
                      <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed m-0 max-md:text-[1rem] max-sm:text-[0.9rem]">
                        Specify teacher details including their name, subjects they teach per class, assigned base class (if any), main subject, and optional lab subjects.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Feature 4 */}
                <div className="group w-full h-[300px] max-md:h-[280px] max-sm:h-[250px] [perspective:1000px] animate-[fadeInUp_0.8s_ease-out_both]" style={{ "--index": 3 }}>
                  <div className="relative w-full h-full text-center transition-transform duration-[0.6s] [transform-style:preserve-3d] cursor-pointer group-hover:[transform:rotateY(180deg)]">
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.6)] border-2 border-[rgba(50,130,184,0.4)] backdrop-blur-[20px]">
                      <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6 bg-[rgba(0,255,135,0.1)] border-2 border-[rgba(0,255,135,0.3)]">
                        <Calendar className="text-[#00ff87] filter drop-shadow-[0_0_10px_rgba(0,255,135,0.4)]" size={40} />
                      </div>
                      <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">Weekly Requirements</h3>
                      <p className="text-sm md:text-base text-[rgba(255,255,255,0.85)] leading-normal m-0">
                        Periods required for each subject per class.
                      </p>
                    </div>
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.85)] border-2 border-[rgba(0,255,135,0.6)] [transform:rotateY(180deg)] backdrop-blur-[20px]">
                      <h3 className="text-[1.6rem] font-extrabold text-[#00ff87] mb-4 [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">Weekly Requirements</h3>
                      <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed m-0 max-md:text-[1rem] max-sm:text-[0.9rem]">
                        Set the number of periods required for each subject in each class to ensure proper scheduling.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-12 mb-8 relative animate-[fadeInUp_0.8s_ease-out_forwards]">
              <h2 className="text-[2.5rem] font-extrabold bg-[linear-gradient(45deg,#00ff87,#32c8b8)] bg-clip-text text-transparent mb-8 [text-shadow:0_0_10px_rgba(0,255,135,0.3)] relative before:content-[''] before:absolute before:-bottom-[10px] before:left-0 before:w-[60px] before:h-[3px] before:bg-[linear-gradient(90deg,#00ff87,#32c8b8)] before:rounded-[2px] max-md:text-[2rem] max-sm:text-[1.8rem]">Workflow Overview</h2>
              <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed mb-6 max-md:text-[1rem] max-sm:text-[0.9rem]">
                The system follows a clean, modular flow:
              </p>
              <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(0,255,135,0.2)] rounded-[15px] p-8 max-md:p-6 max-sm:p-4 my-8">
                <ol className="[counter-reset:workflow-counter] list-none p-0">
                  <li className="[counter-increment:workflow-counter] bg-[rgba(255,255,255,0.05)] rounded-[10px] py-4 px-6 mb-4 relative border-l-[3px] border-[#3282b8] transition-all duration-300 ease-in-out before:content-[counter(workflow-counter)] before:absolute before:-left-[15px] before:top-1/2 before:-translate-y-1/2 before:bg-[linear-gradient(45deg,#3282b8,#00ff87)] before:text-white before:w-[30px] before:h-[30px] before:rounded-full before:flex before:items-center before:justify-center before:font-bold before:text-[0.9rem] before:shadow-[0_0_15px_rgba(50,130,184,0.5)] hover:bg-[rgba(255,255,255,0.1)] hover:translate-x-[10px] hover:border-l-[#00ff87]">Frontend (React) collects inputs and allows real-time editing.</li>
                  <li className="[counter-increment:workflow-counter] bg-[rgba(255,255,255,0.05)] rounded-[10px] py-4 px-6 mb-4 relative border-l-[3px] border-[#3282b8] transition-all duration-300 ease-in-out before:content-[counter(workflow-counter)] before:absolute before:-left-[15px] before:top-1/2 before:-translate-y-1/2 before:bg-[linear-gradient(45deg,#3282b8,#00ff87)] before:text-white before:w-[30px] before:h-[30px] before:rounded-full before:flex before:items-center before:justify-center before:font-bold before:text-[0.9rem] before:shadow-[0_0_15px_rgba(50,130,184,0.5)] hover:bg-[rgba(255,255,255,0.1)] hover:translate-x-[10px] hover:border-l-[#00ff87]">Backend (FastAPI) receives the data and processes it.</li>
                  <li className="[counter-increment:workflow-counter] bg-[rgba(255,255,255,0.05)] rounded-[10px] py-4 px-6 mb-4 relative border-l-[3px] border-[#3282b8] transition-all duration-300 ease-in-out before:content-[counter(workflow-counter)] before:absolute before:-left-[15px] before:top-1/2 before:-translate-y-1/2 before:bg-[linear-gradient(45deg,#3282b8,#00ff87)] before:text-white before:w-[30px] before:h-[30px] before:rounded-full before:flex before:items-center before:justify-center before:font-bold before:text-[0.9rem] before:shadow-[0_0_15px_rgba(50,130,184,0.5)] hover:bg-[rgba(255,255,255,0.1)] hover:translate-x-[10px] hover:border-l-[#00ff87]">Teacher & Subject Mapping is done to prepare constraint models.</li>
                  <li className="[counter-increment:workflow-counter] bg-[rgba(255,255,255,0.05)] rounded-[10px] py-4 px-6 mb-4 relative border-l-[3px] border-[#3282b8] transition-all duration-300 ease-in-out before:content-[counter(workflow-counter)] before:absolute before:-left-[15px] before:top-1/2 before:-translate-y-1/2 before:bg-[linear-gradient(45deg,#3282b8,#00ff87)] before:text-white before:w-[30px] before:h-[30px] before:rounded-full before:flex before:items-center before:justify-center before:font-bold before:text-[0.9rem] before:shadow-[0_0_15px_rgba(50,130,184,0.5)] hover:bg-[rgba(255,255,255,0.1)] hover:translate-x-[10px] hover:border-l-[#00ff87]">OR-Tools CP Solver is invoked to generate a feasible timetable.</li>
                  <li className="[counter-increment:workflow-counter] bg-[rgba(255,255,255,0.05)] rounded-[10px] py-4 px-6 mb-4 relative border-l-[3px] border-[#3282b8] transition-all duration-300 ease-in-out before:content-[counter(workflow-counter)] before:absolute before:-left-[15px] before:top-1/2 before:-translate-y-1/2 before:bg-[linear-gradient(45deg,#3282b8,#00ff87)] before:text-white before:w-[30px] before:h-[30px] before:rounded-full before:flex before:items-center before:justify-center before:font-bold before:text-[0.9rem] before:shadow-[0_0_15px_rgba(50,130,184,0.5)] hover:bg-[rgba(255,255,255,0.1)] hover:translate-x-[10px] hover:border-l-[#00ff87]">Outputs are generated: Class-wise and Teacher-wise timetables.</li>
                  <li className="[counter-increment:workflow-counter] bg-[rgba(255,255,255,0.05)] rounded-[10px] py-4 px-6 mb-4 relative border-l-[3px] border-[#3282b8] transition-all duration-300 ease-in-out before:content-[counter(workflow-counter)] before:absolute before:-left-[15px] before:top-1/2 before:-translate-y-1/2 before:bg-[linear-gradient(45deg,#3282b8,#00ff87)] before:text-white before:w-[30px] before:h-[30px] before:rounded-full before:flex before:items-center before:justify-center before:font-bold before:text-[0.9rem] before:shadow-[0_0_15px_rgba(50,130,184,0.5)] hover:bg-[rgba(255,255,255,0.1)] hover:translate-x-[10px] hover:border-l-[#00ff87]">Live Preview & Editing available on the frontend.</li>
                  <li className="[counter-increment:workflow-counter] bg-[rgba(255,255,255,0.05)] rounded-[10px] py-4 px-6 mb-4 relative border-l-[3px] border-[#3282b8] transition-all duration-300 ease-in-out before:content-[counter(workflow-counter)] before:absolute before:-left-[15px] before:top-1/2 before:-translate-y-1/2 before:bg-[linear-gradient(45deg,#3282b8,#00ff87)] before:text-white before:w-[30px] before:h-[30px] before:rounded-full before:flex before:items-center before:justify-center before:font-bold before:text-[0.9rem] before:shadow-[0_0_15px_rgba(50,130,184,0.5)] hover:bg-[rgba(255,255,255,0.1)] hover:translate-x-[10px] hover:border-l-[#00ff87]">Export as PDF or Excel formats.</li>
                </ol>
              </div>
            </section>

            <section className="py-12 mb-8 relative animate-[fadeInUp_0.8s_ease-out_forwards]">
              <h2 className="text-[2.5rem] font-extrabold bg-[linear-gradient(45deg,#00ff87,#32c8b8)] bg-clip-text text-transparent mb-8 [text-shadow:0_0_10px_rgba(0,255,135,0.3)] relative before:content-[''] before:absolute before:-bottom-[10px] before:left-0 before:w-[60px] before:h-[3px] before:bg-[linear-gradient(90deg,#00ff87,#32c8b8)] before:rounded-[2px] max-md:text-[2rem] max-sm:text-[1.8rem]">Timetable Generation Logic</h2>
              <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed mb-6 max-md:text-[1rem] max-sm:text-[0.9rem]">
                At the core of our backend is a Constraint Programming (CP) model built using Google OR-Tools. The following constraints are applied:
              </p>
              <div className="bg-[rgba(0,0,0,0.4)] border border-[rgba(50,130,184,0.3)] rounded-[15px] p-8 max-md:p-6 max-sm:p-4 my-8 backdrop-blur-[10px]">
                <ul>
                  <li className="bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[#3282b8] py-[0.8rem] px-[1.2rem] mb-[0.8rem] rounded-r-[8px] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.1)] hover:border-l-[#00ff87] hover:translate-x-[5px]"><strong className="text-[#00ff87] font-bold">Single Slot Rule:</strong> Each teacher can only teach in one class at a time.</li>
                  <li className="bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[#3282b8] py-[0.8rem] px-[1.2rem] mb-[0.8rem] rounded-r-[8px] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.1)] hover:border-l-[#00ff87] hover:translate-x-[5px]"><strong className="text-[#00ff87] font-bold">Period Count Matching:</strong> The number of periods per subject is enforced exactly.</li>
                  <li className="bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[#3282b8] py-[0.8rem] px-[1.2rem] mb-[0.8rem] rounded-r-[8px] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.1)] hover:border-l-[#00ff87] hover:translate-x-[5px]"><strong className="text-[#00ff87] font-bold">Daily Subject Cap:</strong> A subject can appear at most twice a day in a class.</li>
                  <li className="bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[#3282b8] py-[0.8rem] px-[1.2rem] mb-[0.8rem] rounded-r-[8px] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.1)] hover:border-l-[#00ff87] hover:translate-x-[5px]"><strong className="text-[#00ff87] font-bold">Lab Scheduling:</strong> Lab subjects are scheduled as double-period blocks.</li>
                  <li className="bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[#3282b8] py-[0.8rem] px-[1.2rem] mb-[0.8rem] rounded-r-[8px] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.1)] hover:border-l-[#00ff87] hover:translate-x-[5px]"><strong className="text-[#00ff87] font-bold">Class Teacher Priority:</strong> The class teacher's main subject is prioritized for the first period of the day.</li>
                  <li className="bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[#3282b8] py-[0.8rem] px-[1.2rem] mb-[0.8rem] rounded-r-[8px] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.1)] hover:border-l-[#00ff87] hover:translate-x-[5px]"><strong className="text-[#00ff87] font-bold">Valid Assignments:</strong> No invalid (undefined) teacher-subject-class combinations are scheduled.</li>
                </ul>
              </div>
              
              <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">Optimization Goals</h3>
              <div className="bg-[rgba(0,0,0,0.4)] border border-[rgba(50,130,184,0.3)] rounded-[15px] p-8 max-md:p-6 max-sm:p-4 my-8 backdrop-blur-[10px]">
                <ul>
                  <li className="bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[#3282b8] py-[0.8rem] px-[1.2rem] mb-[0.8rem] rounded-r-[8px] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.1)] hover:border-l-[#00ff87] hover:translate-x-[5px]">Honor all constraints without violation.</li>
                  <li className="bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[#3282b8] py-[0.8rem] px-[1.2rem] mb-[0.8rem] rounded-r-[8px] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.1)] hover:border-l-[#00ff87] hover:translate-x-[5px]">Fairly distribute workload across teachers.</li>
                  <li className="bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[#3282b8] py-[0.8rem] px-[1.2rem] mb-[0.8rem] rounded-r-[8px] transition-all duration-300 ease-in-out hover:bg-[rgba(255,255,255,0.1)] hover:border-l-[#00ff87] hover:translate-x-[5px]">Avoid teacher overlaps and class conflicts.</li>
                </ul>
              </div>
              
              <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">Deterministic or Randomized?</h3>
              <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed mb-6 max-md:text-[1rem] max-sm:text-[0.9rem]">
                The timetable generation is deterministic. Given the same inputs, the system produces the same output unless manual edits are made.
              </p>
              
              <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">Auto or Manual?</h3>
              <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed mb-6 max-md:text-[1rem] max-sm:text-[0.9rem]">
                The timetable is fully auto-generated based on all constraints. Manual editing is supported post-generation through a dynamic UI.
              </p>
            </section>

            <section className="py-12 mb-8 relative animate-[fadeInUp_0.8s_ease-out_forwards]">
              <h2 className="text-[2.5rem] font-extrabold bg-[linear-gradient(45deg,#00ff87,#32c8b8)] bg-clip-text text-transparent mb-8 [text-shadow:0_0_10px_rgba(0,255,135,0.3)] relative before:content-[''] before:absolute before:-bottom-[10px] before:left-0 before:w-[60px] before:h-[3px] before:bg-[linear-gradient(90deg,#00ff87,#32c8b8)] before:rounded-[2px] max-md:text-[2rem] max-sm:text-[1.8rem]">Post-Generation Features</h2>
              <div className="grid grid-cols-4 gap-8 max-md:grid-cols-1 max-md:gap-6">
                {/* Feature A */}
                <div className="group w-full h-[300px] max-md:h-[280px] max-sm:h-[250px] [perspective:1000px] animate-[fadeInUp_0.8s_ease-out_both]" style={{ "--index": 0 }}>
                  <div className="relative w-full h-full text-center transition-transform duration-[0.6s] [transform-style:preserve-3d] cursor-pointer group-hover:[transform:rotateY(180deg)]">
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.6)] border-2 border-[rgba(50,130,184,0.4)] backdrop-blur-[20px]">
                      <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6 bg-[rgba(0,255,135,0.1)] border-2 border-[rgba(0,255,135,0.3)]">
                        <Code className="text-[#00ff87] filter drop-shadow-[0_0_10px_rgba(0,255,135,0.4)]" size={40} />
                      </div>
                      <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">Live Validation & Editing</h3>
                      <p className="text-sm md:text-base text-[rgba(255,255,255,0.85)] leading-normal m-0">
                        Make changes dynamically with instant conflict validation.
                      </p>
                    </div>
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.85)] border-2 border-[rgba(0,255,135,0.6)] [transform:rotateY(180deg)] backdrop-blur-[20px]">
                      <h3 className="text-[1.6rem] font-extrabold text-[#00ff87] mb-4 [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">Live Validation & Editing</h3>
                      <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed m-0 max-md:text-[1rem] max-sm:text-[0.9rem]">
                        Dynamically edit the timetable and instantly validate for conflicts, such as overlapping periods.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Feature B */}
                <div className="group w-full h-[300px] max-md:h-[280px] max-sm:h-[250px] [perspective:1000px] animate-[fadeInUp_0.8s_ease-out_both]" style={{ "--index": 1 }}>
                  <div className="relative w-full h-full text-center transition-transform duration-[0.6s] [transform-style:preserve-3d] cursor-pointer group-hover:[transform:rotateY(180deg)]">
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.6)] border-2 border-[rgba(50,130,184,0.4)] backdrop-blur-[20px]">
                      <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6 bg-[rgba(0,255,135,0.1)] border-2 border-[rgba(0,255,135,0.3)]">
                        <Download className="text-[#00ff87] filter drop-shadow-[0_0_10px_rgba(0,255,135,0.4)]" size={40} />
                      </div>
                      <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">Export Options</h3>
                      <p className="text-sm md:text-base text-[rgba(255,255,255,0.85)] leading-normal m-0">
                        Download in PDF or Excel format with class-wise and teacher-wise views.
                      </p>
                    </div>
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.85)] border-2 border-[rgba(0,255,135,0.6)] [transform:rotateY(180deg)] backdrop-blur-[20px]">
                      <h3 className="text-[1.6rem] font-extrabold text-[#00ff87] mb-4 [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">Export Options</h3>
                      <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed m-0 max-md:text-[1rem] max-sm:text-[0.9rem]">
                        Export the timetable in PDF or Excel formats, with options for both class-wise and teacher-wise views.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Feature C */}
                <div className="group w-full h-[300px] max-md:h-[280px] max-sm:h-[250px] [perspective:1000px] animate-[fadeInUp_0.8s_ease-out_both]" style={{ "--index": 2 }}>
                  <div className="relative w-full h-full text-center transition-transform duration-[0.6s] [transform-style:preserve-3d] cursor-pointer group-hover:[transform:rotateY(180deg)]">
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.6)] border-2 border-[rgba(50,130,184,0.4)] backdrop-blur-[20px]">
                      <div className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6 bg-[rgba(0,255,135,0.1)] border-2 border-[rgba(0,255,135,0.3)]">
                        <Database className="text-[#00ff87] filter drop-shadow-[0_0_10px_rgba(0,255,135,0.4)]" size={40} />
                      </div>
                      <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight max-md:text-[1.2rem] max-sm:text-[1.1rem]">Insights & Usability</h3>
                      <p className="text-sm md:text-base text-[rgba(255,255,255,0.85)] leading-normal m-0">
                        Visual display of subject/teacher distribution and imbalance detection.
                      </p>
                    </div>
                    <div className="absolute w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[rgba(0,0,0,0.85)] border-2 border-[rgba(0,255,135,0.6)] [transform:rotateY(180deg)] backdrop-blur-[20px]">
                      <h3 className="text-[1.6rem] font-extrabold text-[#00ff87] mb-4 [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">Insights & Usability</h3>
                      <p className="text-[1.1rem] text-[rgba(255,255,255,0.9)] leading-relaxed m-0 max-md:text-[1rem] max-sm:text-[0.9rem]">
                        Easily spot imbalances or missing periods with a visual display of subject and teacher distribution.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuidePage;
