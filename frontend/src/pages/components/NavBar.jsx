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
      <nav className="bg-gradient-to-r from-black/98 to-[#14283c]/98 backdrop-blur-[20px] border-b border-[#3282b8]/30 fixed top-0 left-0 right-0 z-[1000] py-3 shadow-[0_6px_40px_rgba(0,0,0,0.4)] transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-8 flex items-center justify-between w-full">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-3 cursor-pointer transition-all duration-300 py-2 px-4 rounded-[16px] no-underline hover:scale-105 hover:bg-[#00ff87]/15 hover:shadow-[0_4px_20px_rgba(0,255,135,0.3)]" onClick={() => handleNavigate("/")}>
              <BookOpen size={28} className="text-[#00ff87] [filter:drop-shadow(0_0_12px_rgba(0,255,135,0.5))]" />
              <span className="text-[1.25rem] font-extrabold bg-gradient-to-r from-[#00ff87] to-[#32c8b8] bg-clip-text text-transparent tracking-tight">TimeTable Generator</span>
            </div>
            {/* Navbar Center */}
            <div className="flex items-center gap-4 grow justify-center">
              {isSignedIn && (
                <button
                  className="bg-transparent border-none text-white cursor-pointer text-[0.9rem] font-semibold py-2.5 px-6 rounded-[12px] transition-all duration-300 relative overflow-hidden no-underline inline-flex items-center justify-center whitespace-nowrap after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-gradient-to-r after:from-[#00ff87] after:to-[#3282b8] after:scale-x-0 after:origin-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-left bg-[#3282b8]/15 border border-[#3282b8]/40 hover:bg-[#3282b8]/25 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(50,130,184,0.3)]"
                  onClick={() => handleNavigate("/dashboard")}
                >
                  Dashboard
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="flex items-center gap-4 shrink-0 max-md:hidden">
            <SignedOut>
              <button
                className="bg-transparent border-none text-white cursor-pointer text-[0.9rem] font-semibold py-2.5 px-6 rounded-[12px] transition-all duration-300 relative overflow-hidden no-underline inline-flex items-center justify-center whitespace-nowrap after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-gradient-to-r after:from-[#00ff87] after:to-[#3282b8] after:scale-x-0 after:origin-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-left bg-white/10 border border-white/20 hover:bg-white/20 hover:-translate-y-0.5"
                onClick={() => handleNavigate("/sign-up")}
              >
                Sign Up
              </button>
              <button
                className="bg-transparent border-none text-white cursor-pointer text-[0.9rem] font-semibold py-2.5 px-6 rounded-[12px] transition-all duration-300 relative overflow-hidden no-underline inline-flex items-center justify-center whitespace-nowrap after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-gradient-to-r after:from-[#00ff87] after:to-[#3282b8] after:scale-x-0 after:origin-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-left bg-gradient-to-r from-[#3282b8] to-[#00ff87] text-white font-bold shadow-[0_6px_20px_rgba(50,130,184,0.4)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(50,130,184,0.5)]"
                onClick={() => handleNavigate("/login")}
              >
                Login
              </button>
            </SignedOut>
            <SignedIn>
              {isLoaded && user && (
                <div className="flex items-center gap-4">
                  <span className="text-[#00ff87] font-bold text-[0.9rem] [text-shadow:0_0_10px_rgba(0,255,135,0.3)]">Hi, {user.firstName}!</span>
                  <button
                    className="bg-transparent border-none text-white cursor-pointer text-[0.9rem] font-semibold py-2.5 px-6 rounded-[12px] transition-all duration-300 relative overflow-hidden no-underline inline-flex items-center justify-center whitespace-nowrap after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-gradient-to-r after:from-[#00ff87] after:to-[#3282b8] after:scale-x-0 after:origin-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-left bg-[#ff3b3b]/15 border border-[#ff3b3b]/40 text-[#ff6b6b] hover:bg-[#ff3b3b]/25 hover:-translate-y-0.5"
                    onClick={handleLogOut}
                  >
                    Log out
                  </button>
                </div>
              )}
            </SignedIn>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="flex md:hidden items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer p-3 rounded-[12px] transition-all duration-300 text-[1.25rem] hover:bg-white/20 hover:scale-105"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`absolute top-full left-0 right-0 bg-gradient-to-b from-black/98 to-[#14283c]/98 backdrop-blur-[20px] border-t border-[#3282b8]/30 py-6 px-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-slide-in-down ${isMenuOpen ? 'flex flex-col' : 'hidden'}`}>
          <SignedOut>
            <button
              className="block w-full bg-white/10 border border-white/20 text-white cursor-pointer text-[1rem] font-semibold py-4 px-6 my-1 text-center rounded-[12px] transition-all duration-300 no-underline hover:bg-[#3282b8]/25 hover:border-[#3282b8]/40 hover:-translate-y-0.5"
              onClick={() => handleNavigate("/sign-up")}
            >
              Sign Up
            </button>
            <button
              className="block w-full bg-white/10 border border-white/20 text-white cursor-pointer text-[1rem] font-semibold py-4 px-6 my-1 text-center rounded-[12px] transition-all duration-300 no-underline hover:bg-[#3282b8]/25 hover:border-[#3282b8]/40 hover:-translate-y-0.5"
              onClick={() => handleNavigate("/login")}
            >
              Login
            </button>
          </SignedOut>

          <SignedIn>
            {isLoaded && user && (
              <>
                <div className="text-[#00ff87] font-bold text-[0.95rem] [text-shadow:0_0_10px_rgba(0,255,135,0.3)] py-2 px-4 text-center bg-[#00ff87]/10 border border-[#00ff87]/30 rounded-[12px] my-1">
                  Hi, {user.firstName}!
                </div>
                <button
                  className="block w-full bg-white/10 border border-white/20 text-white cursor-pointer text-[1rem] font-semibold py-4 px-6 my-1 text-center rounded-[12px] transition-all duration-300 no-underline hover:bg-[#3282b8]/25 hover:border-[#3282b8]/40 hover:-translate-y-0.5"
                  onClick={() => handleNavigate("/dashboard")}
                >
                  Dashboard
                </button>
                <button
                  className="block w-full bg-white/10 border border-white/20 text-white cursor-pointer text-[1rem] font-semibold py-4 px-6 my-1 text-center rounded-[12px] transition-all duration-300 no-underline hover:bg-[#3282b8]/25 hover:border-[#3282b8]/40 hover:-translate-y-0.5 text-[#ff6b6b]"
                  onClick={handleLogOut}
                >
                  Log out
                </button>
              </>
            )}
          </SignedIn>
        </div>
      </nav>
      <Outlet />
    </>
  );
}

export default NavBar;
