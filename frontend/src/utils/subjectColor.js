// Deterministic color palette for subjects — consistent across Edit and Display views
const PALETTE = [
  { bg: "rgba(45,212,191,0.15)", border: "#2dd4bf", text: "#2dd4bf" },  // teal
  { bg: "rgba(167,139,250,0.15)", border: "#a78bfa", text: "#a78bfa" }, // purple
  { bg: "rgba(251,146,60,0.15)",  border: "#fb923c", text: "#fb923c" }, // orange
  { bg: "rgba(56,189,248,0.15)",  border: "#38bdf8", text: "#38bdf8" }, // sky
  { bg: "rgba(244,63,94,0.15)",   border: "#f43f5e", text: "#f43f5e" }, // rose
  { bg: "rgba(129,140,248,0.15)", border: "#818cf8", text: "#818cf8" }, // indigo
  { bg: "rgba(74,222,128,0.15)",  border: "#4ade80", text: "#4ade80" }, // green
  { bg: "rgba(250,204,21,0.15)",  border: "#facc15", text: "#facc15" }, // yellow
  { bg: "rgba(240,171,252,0.15)", border: "#f0abfc", text: "#f0abfc" }, // fuchsia
  { bg: "rgba(52,211,153,0.15)",  border: "#34d399", text: "#34d399" }, // emerald
];

function hashSubject(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % PALETTE.length;
}

export function getSubjectColor(subjectName) {
  if (!subjectName) return PALETTE[0];
  return PALETTE[hashSubject(subjectName.trim().toLowerCase())];
}
