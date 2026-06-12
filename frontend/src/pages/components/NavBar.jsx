// Fixed NavBar.jsx
import { SignedIn, SignedOut, useAuth, useUser } from "@clerk/clerk-react";
import { Outlet, useNavigate } from "react-router";
import { BookOpen, Menu, X } from "lucide-react";
import { useState } from "react";

function NavBar() {
  const navigate = useNavigate();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    closeMenu(); // Close mobile menu after navigation
  };

  return (
    <>
      <nav style={{
        position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
        background: "rgba(5, 12, 24, 0.65)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(87, 241, 219, 0.12)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 54, borderRadius: 999, width: "calc(100% - 40px)", maxWidth: 1320,
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        transition: "all 0.3s ease"
      }}>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-[12px] no-underline hover:scale-[1.02] hover:bg-[#00ff87]/10" onClick={() => handleNavigate("/")}>
            <BookOpen size={20} className="text-[#00ff87] [filter:drop-shadow(0_0_8px_rgba(0,255,135,0.4))]" />
            <span className="text-[1.05rem] font-black bg-gradient-to-r from-[#00ff87] to-[#32c8b8] bg-clip-text text-transparent tracking-tight">TimeTable Generator</span>
          </div>
        </div>

        {/* Center Navigation Links (desktop only) - dashboard only if signed in */}
        <div className="flex items-center gap-6 max-md:hidden">
          {isSignedIn && (
            <button
              className="bg-transparent border-none text-white cursor-pointer text-[0.85rem] font-bold py-1.5 px-4 rounded-full transition-all duration-300 relative overflow-hidden no-underline inline-flex items-center justify-center whitespace-nowrap bg-[#3282b8]/15 border border-[#3282b8]/40 hover:bg-[#3282b8]/25 hover:shadow-[0_4px_15px_rgba(50,130,184,0.3)]"
              style={{ borderRadius: "9999px" }}
              onClick={() => handleNavigate("/dashboard")}
            >
              Dashboard
            </button>
          )}
        </div>

        {/* Desktop Navigation (Auth Action Buttons) */}
        <div className="flex items-center gap-3 shrink-0 max-md:hidden">
          <SignedOut>
            <button
              className="bg-transparent border-none text-white cursor-pointer text-[0.85rem] font-bold py-1.5 px-4 rounded-[8px] transition-all duration-300 no-underline hover:text-[#57f1db]"
              onClick={() => handleNavigate("/login")}
            >
              Sign In
            </button>
            <button
              className="bg-transparent border-none text-white cursor-pointer text-[0.85rem] font-extrabold py-1.5 px-5 transition-all duration-300 no-underline bg-gradient-to-r from-[#3282b8] to-[#00ff87] text-[#051424] shadow-[0_4px_12px_rgba(50,130,184,0.25)] hover:scale-[1.02]"
              style={{ borderRadius: "9999px" }}
              onClick={() => handleNavigate("/sign-up")}
            >
              Get Started
            </button>
          </SignedOut>
          <SignedIn>
            {isLoaded && user && (
              <div className="flex items-center gap-3">
                <span className="text-[#00ff87] font-bold text-[0.85rem] [text-shadow:0_0_8px_rgba(0,255,135,0.2)]">Hi, {user.firstName}!</span>
                <button
                  className="bg-transparent border-none text-white cursor-pointer text-[0.85rem] font-bold py-1.5 px-4 rounded-full transition-all duration-300 no-underline bg-[#ff3b3b]/10 border border-[#ff3b3b]/30 text-[#ff6b6b] hover:bg-[#ff3b3b]/20"
                  style={{ borderRadius: "9999px" }}
                  onClick={handleLogOut}
                >
                  Log out
                </button>
              </div>
            )}
          </SignedIn>
        </div>

        {/* Mobile Menu Action Row */}
        <div className="hidden max-md:flex items-center gap-3">
          {isSignedIn && (
            <button
              className="bg-transparent border-none text-white cursor-pointer text-[0.8rem] font-bold py-1.5 px-3 rounded-full bg-[#3282b8]/15 border border-[#3282b8]/40"
              style={{ borderRadius: "9999px" }}
              onClick={() => handleNavigate("/dashboard")}
            >
              Dashboard
            </button>
          )}
          <button
            className="flex items-center justify-center bg-white/5 border border-white/10 text-white cursor-pointer p-2 rounded-[8px] transition-all hover:bg-white/10"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown Panel */}
        <div style={{
          position: "absolute", top: 62, left: 0, right: 0,
          background: "rgba(5, 12, 24, 0.95)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(87, 241, 219, 0.12)", borderRadius: 16,
          padding: 20, boxShadow: "0 15px 30px rgba(0,0,0,0.5)",
          display: isMenuOpen ? "flex" : "none", flexDirection: "column", gap: 10,
          zIndex: 1001
        }}>
          
          <div style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
            <SignedOut>
              <button
                className="block w-full bg-white/5 border border-white/10 text-white cursor-pointer text-[0.9rem] font-bold py-3 text-center rounded-[8px] mb-2 hover:bg-white/10"
                onClick={() => handleNavigate("/login")}
              >
                Sign In
              </button>
              <button
                className="block w-full text-[#051424] cursor-pointer text-[0.9rem] font-extrabold py-3 text-center bg-gradient-to-r from-[#3282b8] to-[#00ff87]"
                style={{ borderRadius: "9999px" }}
                onClick={() => handleNavigate("/sign-up")}
              >
                Get Started
              </button>
            </SignedOut>

            <SignedIn>
              {isLoaded && user && (
                <>
                  <div className="text-[#00ff87] font-bold text-[0.9rem] text-center bg-[#00ff87]/5 border border-[#00ff87]/20 rounded-[8px] py-2 mb-2">
                    Hi, {user.firstName}!
                  </div>
                  <button
                    className="block w-full bg-[#ff3b3b]/10 border border-[#ff3b3b]/30 text-[#ff6b6b] cursor-pointer text-[0.9rem] font-bold py-3 text-center rounded-full"
                    style={{ borderRadius: "9999px" }}
                    onClick={handleLogOut}
                  >
                    Log out
                  </button>
                </>
              )}
            </SignedIn>
          </div>
        </div>
      </nav>
      <Outlet />
    </>
  );
}

export default NavBar;
