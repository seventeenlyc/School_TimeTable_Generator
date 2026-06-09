import { DeleteIcon, Loader, Trash } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import Orb from "../../../styles/orb/Orb";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import { useAuth, useUser } from "@clerk/clerk-react";


function DashbordPage() {
  const navigate = useNavigate();
  const {state} = useLocation()
  const { user, isSignedIn } = useUser();
  const [timetables, setTimetables] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const { getToken } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const updateName = async () => {
      if (isSignedIn && user && state && typeof state.name === "string" && state.name.trim() !== "") {
        try {
          await user.update({ firstName: state.name });
        } catch (error) {
          console.error("Update failed:", error);
        }
      } else {
        console.log("Invalid or missing name, skipping update.");
      }
    };

    updateName();
  }, [user, isSignedIn, state?.name]);

  useEffect(() => {
    const fetchTimetables = async () => {
      setIsLoading(true);
      try {
        if (isSignedIn) {
          const token = await getToken();
          const res = await fetchWithAuth(
            token,
            `${import.meta.env.VITE_API_BASE_URL}/get-timetables/${user.id}`
          );
          const data = await res.json();
          setTimetables(data);
        }
      } catch (error) {
        console.log("Error fetching timetables:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetables();
  }, [isSignedIn, user]);

  const handleDelete = async (timetableId) => {
    try {
      setDeletingId(timetableId);
      const token = await getToken();
      const res = await fetchWithAuth(
        token,
        `${import.meta.env.VITE_API_BASE_URL}/delete-timetable/${timetableId}`,
        { method: "DELETE" }
      );
      setTimetables((prev) =>
        prev.filter((timetable) => timetable._id !== timetableId)
      );
    } catch (error) {
      console.log(error);
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="bg-[linear-gradient(135deg,#000000_0%,#0a1a2e_25%,#16213e_50%,#0f4c75_75%,#3282b8_100%)] min-h-screen text-white relative overflow-x-hidden mt-[55px]">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="h-[5vh]" />
        <div
          className="w-full flex justify-center items-center bg-black border-4 border-[#3282b8] h-[35vh] md:h-[45vh] rounded-[20px] md:rounded-[30px] transition-all duration-300 ease-in-out shadow-[0_10px_30px_rgba(50,130,184,0.3)] hover:-translate-y-[5px] hover:border-[#5ba3d4] hover:shadow-[0_15px_40px_rgba(50,130,184,0.5)]"
          
        >
          <div className="flex flex-col justify-center items-center">
            <div className="w-full h-[600px] relative">
              <Orb
                hoverIntensity={0.5}
                rotateOnHover={true}
                hue={0}
                forceHoverState={false}
                
              >
                <p onClick={() => navigate("/generate")} style={{cursor:"pointer"}} className="text-xl md:text-2xl font-semibold text-center text-white [text-shadow:0_2px_10px_rgba(50,130,184,0.5)]">Create new timetable</p>
              </Orb>
            </div>
          </div>
        </div>
        
        <div className="mt-12">
          <h3 className="text-2xl md:text-[2rem] font-bold text-white mb-6 [text-shadow:0_2px_10px_rgba(50,130,184,0.3)]">Recent Timetables</h3>

          {(isLoading || !isSignedIn) && (
            <div className="w-full flex gap-4 items-center justify-center mt-6 border-2 border-[#3282b8] rounded-[20px] p-8 bg-[rgba(50,130,184,0.1)] backdrop-blur-[5px]">
              <div className="w-10 h-10 border-4 border-[rgba(50,130,184,0.3)] border-t-[#3282b8] rounded-full animate-spin" />
              <p className="text-[1.25rem] m-0 text-white font-medium">Loading</p>
            </div>
          )}

          {!isLoading && isSignedIn && timetables.length === 0 && (
            <div className="w-full flex gap-4 items-center justify-center mt-6 border-2 border-[#5ba3d4] rounded-[20px] p-8 bg-[rgba(91,163,212,0.1)] backdrop-blur-[5px]">
              <p className="text-[1.25rem] m-0 text-white font-medium">No timetables created</p>
            </div>
          )}

          <div className="mt-6">
            {timetables.map((timetable, index) => {
              return (
                <div
                  className="flex w-full items-center justify-center gap-4 mb-4 max-md:gap-3 max-md:items-stretch"
                  key={index}
                >
                  <div
                    className="bg-[rgba(15,76,117,0.8)] p-6 max-md:p-4 mb-4 max-md:mb-0 flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-2 rounded-[20px] w-full cursor-pointer min-h-[80px] transition-all duration-300 ease-in-out backdrop-blur-[10px] border border-[rgba(50,130,184,0.3)] hover:-translate-y-[2px] hover:bg-[rgba(15,76,117,0.9)] hover:shadow-[0_8px_25px_rgba(50,130,184,0.3)] hover:border-[#3282b8]"
                    onClick={() =>
                      navigate(`/display/${timetable._id}`, {
                        state: {
                          classTimetable: timetable.class_timetable,
                          teacherTimetable: timetable.teacher_timetable,
                          timetableId: timetable._id.toString(),
                          teacherData: timetable.teacherData,
                          classes: timetable.classes,
                          subjects: timetable.subjects,
                          workingDays: timetable.workingDays,
                          periods: timetable.periods,
                          title: timetable.title,
                        },
                      })
                    }
                  >
                    <div>
                      <p className="text-[1.25rem] m-0 text-white font-semibold">{timetable.title}</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 max-md:w-full max-md:justify-start">
                      <p className="text-[0.9rem] m-0 text-[#d4e1ee] font-normal">
                        Created on {timetable.createdAt.split("T")[0]} at{" "}
                        {timetable.createdAt.split("T")[1].slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  {deletingId === timetable._id ? (
                    <div className="w-9 h-9 border-3 border-[rgba(0,255,127,0.3)] border-t-[#00ff7f] rounded-full animate-spin mb-3 shadow-[0_0_20px_rgba(0,255,127,0.4)] shrink-0 max-md:mb-0 max-md:w-10 max-md:h-10 max-md:self-start max-md:mt-2" />
                  ) : (
                    <Trash
                      className="text-[#00ff7f] mb-3 cursor-pointer transition-all duration-300 ease-in-out p-3 rounded-[12px] bg-[rgba(0,255,127,0.1)] border-2 border-[rgba(0,255,127,0.3)] shadow-[0_0_15px_rgba(0,255,127,0.2)] backdrop-blur-[5px] w-12 h-12 flex items-center justify-center shrink-0 hover:text-[#39ff7f] hover:scale-115 hover:bg-[rgba(0,255,127,0.2)] hover:border-[#00ff7f] hover:shadow-[0_0_25px_rgba(0,255,127,0.5),0_0_50px_rgba(0,255,127,0.3)] max-md:mb-0 max-md:w-10 max-md:h-10 max-md:p-2 max-md:self-start max-md:mt-2"
                      onClick={() => handleDelete(timetable._id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashbordPage;