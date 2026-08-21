import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Grid,
  Menu,
  Sliders,
  Sparkles,
  UserCheck,
  X,
  HelpCircle,
} from "lucide-react";

export default function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: "课表管理", path: "/", icon: Grid },
    { label: "基础数据", path: "/catalog", icon: Sliders },
    { label: "生成课表", path: "/generate", icon: Sparkles },
    { label: "智能调课", path: "/changes", icon: UserCheck },
    { label: "使用说明", path: "/guide", icon: HelpCircle },
  ];

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          background: "rgba(5, 12, 24, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(87, 241, 219, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 54,
          borderRadius: 999,
          width: "calc(100% - 40px)",
          maxWidth: 1280,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-3 no-underline group hover:scale-[1.02] transition-transform"
        >
          <BookOpen
            size={20}
            className="text-emerald-400 [filter:drop-shadow(0_0_8px_rgba(52,211,153,0.4))]"
          />
          <span className="text-[1.05rem] font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            排课调度专家
          </span>
          <span className="text-[0.65rem] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
            离线版
          </span>
        </Link>

        {/* Center Navigation Links (desktop) */}
        <div className="flex items-center gap-1 max-md:hidden">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                    : "text-gray-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon size={14} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Menu Button */}
        <div className="hidden max-md:flex items-center">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-gray-300 hover:text-white bg-slate-800/60 rounded-lg"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-999 bg-slate-950/90 backdrop-blur-xl md:hidden pt-24 px-6 flex flex-col gap-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 p-3.5 rounded-xl text-sm font-semibold no-underline transition-all ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-gray-300 hover:bg-slate-800/60"
                }`}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
