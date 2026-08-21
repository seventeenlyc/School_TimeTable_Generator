import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import NavBar from "./pages/components/NavBar";
import DashboardPage from "./pages/dashboard/DashboardPage";
import CatalogPage from "./pages/catalog/CatalogPage";
import ChangeAgentPage from "./pages/agent/ChangeAgentPage";
import TimetablePage from "./pages/timetable/TimetablePage";
import EditTimetablePage from "./pages/timetable/EditTimetablePage";
import GeneratePage from "./pages/generate/GeneratePage";
import GuidePage from "./pages/home/GuidePage";
import TimetableDisplay from "./pages/generate/TimetableDisplay";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#f8fafc",
            border: "1px solid #1e293b",
            borderRadius: "0.75rem",
          },
        }}
      />
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/changes" element={<ChangeAgentPage />} />
          <Route path="/timetables/:id" element={<TimetablePage />} />
          <Route path="/timetables/:id/edit" element={<EditTimetablePage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/display/:id" element={<TimetableDisplay />} />
          <Route path="/guide" element={<GuidePage />} />

          {/* Legacy & Redirects */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/sign-up" element={<Navigate to="/" replace />} />
          <Route path="/sso-callback" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
