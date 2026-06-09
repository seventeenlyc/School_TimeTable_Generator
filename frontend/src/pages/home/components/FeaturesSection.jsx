// Fixed FeaturesSection.jsx
import { Clock, Shield, School, FileText, Edit3, Download, Zap, Target, Database } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Time-Saving Automation",
    description: "Saves hours of manual scheduling with intelligent algorithms",
    backDescription: "Our advanced algorithms analyze hundreds of scheduling possibilities in seconds, automatically generating optimal timetables that would take hours to create manually.",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: Shield,
    title: "Conflict Prevention",
    description: "Prevents teacher/class conflicts with smart validation",
    backDescription: "Real-time conflict detection ensures no teacher is scheduled for multiple classes simultaneously and all classroom resources are properly allocated.",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: School,
    title: "Universal Compatibility",
    description: "Works for any school, college, or educational institution",
    backDescription: "Flexible system that adapts to any educational structure - from elementary schools to universities, with support for various academic calendars and scheduling formats.",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: FileText,
    title: "Export Options",
    description: "Export timetables as PDF or Excel with one click",
    backDescription: "Professional-quality exports with customizable templates, formatting options, and the ability to generate separate schedules for teachers, students, and administrators.",
    gradient: "from-orange-500 to-red-500"
  },
  {
    icon: Edit3,
    title: "Dynamic Editing",
    description: "Real-time editing with instant conflict detection",
    backDescription: "Make changes on the fly with immediate feedback. Our system instantly validates modifications and suggests alternatives for any scheduling conflicts.",
    gradient: "from-indigo-500 to-purple-500"
  },
  {
    icon: Download,
    title: "Multiple Formats",
    description: "Support for various export formats and templates",
    backDescription: "Choose from multiple professional templates and export formats including PDF, Excel, CSV, and printable versions optimized for different paper sizes.",
    gradient: "from-teal-500 to-blue-500"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Generate complex timetables in seconds",
    backDescription: "Optimized algorithms process complex scheduling requirements instantly, handling hundreds of classes, teachers, and constraints without any delays.",
    gradient: "from-yellow-500 to-orange-500"
  },
  {
    icon: Target,
    title: "Precision Scheduling",
    description: "Optimized resource allocation and time management",
    backDescription: "Maximize resource utilization while minimizing gaps and conflicts. Our system ensures optimal distribution of workload across all teaching staff and facilities.",
    gradient: "from-pink-500 to-rose-500"
  },
  {
    icon: Database,
    title: "Secure Data Storage",
    description: "Cloud-based storage with automatic backup and sync",
    backDescription: "Your timetables are securely stored in the cloud with automatic backups, version history, and seamless synchronization across all devices. Access your data anytime, anywhere.",
    gradient: "from-violet-500 to-purple-500"
  }
];

function FeaturesSection() {
  return (
    <div className="py-16 mt-16 relative">
      <div className="text-center mb-12">
        <h2 className="text-5xl font-black bg-gradient-to-r from-[#00ff87] to-[#32c8b8] bg-clip-text text-transparent mb-4 [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">
          Powerful Features
        </h2>
        <p className="text-[1.2rem] text-white/80 max-w-[600px] mx-auto">
          Everything you need to create perfect timetables
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8 max-w-[1200px] mx-auto px-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="group w-full h-[300px] md:h-[250px] max-[480px]:h-[220px] max-[480px]:hover:h-[400px] animate-slide-in-up [animation-fill-mode:both]"
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className="relative w-full h-full text-center transition-transform duration-600 [transform-style:preserve-3d] cursor-pointer group-hover:[transform:rotateY(180deg)]">
                {/* Front Side */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center bg-black/50 border-2 border-[#3282b8]/40 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
                  <div className={`w-[80px] h-[80px] rounded-[20px] flex items-center justify-center mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-gradient-to-br ${feature.gradient}`}>
                    <Icon size={32} className="text-white [filter:drop-shadow(0_0_10px_rgba(255,255,255,0.4))]" />
                  </div>
                  <h3 className="text-[1.4rem] font-bold text-white mb-4 leading-tight">{feature.title}</h3>
                  <p className="text-[1rem] text-white/85 leading-normal m-0">{feature.description}</p>
                </div>
                {/* Back Side */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[20px] p-8 flex flex-col justify-center items-center bg-black/85 border-2 border-[#00ff87]/60 [transform:rotateY(180deg)] backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
                  <div className={`w-[100px] h-[100px] rounded-[25px] flex items-center justify-center mb-8 shadow-[0_15px_40px_rgba(0,0,0,0.5)] bg-gradient-to-br ${feature.gradient}`}>
                    <Icon size={32} className="text-white [filter:drop-shadow(0_0_15px_rgba(255,255,255,0.6))]" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-[1.6rem] font-extrabold text-[#00ff87] mb-4">{feature.title}</h4>
                    <p className="text-[1.1rem] text-white/90 leading-relaxed m-0">{feature.backDescription}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FeaturesSection;
