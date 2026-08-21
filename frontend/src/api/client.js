const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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
    const error = new Error(payload?.detail?.message || payload?.detail || "请求失败");
    error.status = response.status;
    error.payload = payload;
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
  listTimetables: () => request("/api/timetables"),
  getTimetable: (id) => request(`/api/timetables/${id}`),
  listBackups: () => request("/api/backups"),
  restoreBackup: (name) => request(`/api/backups/${encodeURIComponent(name)}/restore`, { method: "POST", body: JSON.stringify({ confirmed: true }) }),
  proposeChange: (event) => request("/api/change-proposals", { method: "POST", body: JSON.stringify({ event }) }),
  applyChange: (proposal) => request("/api/changes/apply", { method: "POST", body: JSON.stringify({ proposal }) }),
  listChanges: () => request("/api/changes"),
  getCalendarDay: (date) => request(`/api/calendar/day?date=${encodeURIComponent(date)}`),
};
