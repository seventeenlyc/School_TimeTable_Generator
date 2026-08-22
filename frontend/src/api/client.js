import { normalizeApiError } from "./errors";

const rawBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE = rawBase ? rawBase.replace(/\/+$/, "") : "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const normalized = normalizeApiError(payload, "请求失败");
    const error = new Error(normalized.message);
    error.status = response.status;
    error.payload = payload;
    error.details = normalized.details;
    throw error;
  }
  return payload;
}

export const api = {
  getState: () => request("/api/state"),
  updateCatalog: (payload) => request("/api/catalog", { method: "PUT", body: JSON.stringify(payload) }),
  updateSettings: (payload) => request("/api/settings", { method: "PUT", body: JSON.stringify(payload) }),
  generateTimetable: (payload) => request("/api/timetables/generate", { method: "POST", body: JSON.stringify(payload) }),
  saveTimetable: (payload) => request("/api/timetables", { method: "POST", body: JSON.stringify(payload) }),
  createChildVersion: (id, payload) => request(`/api/timetables/${encodeURIComponent(id)}/versions`, { method: "POST", body: JSON.stringify(payload) }),
  listTimetables: () => request("/api/timetables"),
  getTimetable: (id) => request(`/api/timetables/${id}`),
  listBackups: () => request("/api/backups"),
  restoreBackup: (name) => request(`/api/backups/${encodeURIComponent(name)}/restore`, { method: "POST", body: JSON.stringify({ confirmed: true }) }),
  proposeChange: (event) => request("/api/change-proposals", { method: "POST", body: JSON.stringify({ event }) }),
  applyChange: (proposal) => request("/api/changes/apply", { method: "POST", body: JSON.stringify({ proposal }) }),
  listChanges: () => request("/api/changes"),
  getCalendarDay: (date) => request(`/api/calendar/day?date=${encodeURIComponent(date)}`),
};
