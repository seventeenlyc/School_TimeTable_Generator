const STEPS = [
  { num: 1, label: "Setup" },
  { num: 2, label: "Teachers" },
  { num: 3, label: "Generate" },
  { num: 4, label: "Review" },
];

export default function WizardSteps({ current }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
      padding: "10px 0 18px",
      userSelect: "none",
    }}>
      {STEPS.map((step, i) => {
        const done = step.num < current;
        const active = step.num === current;
        return (
          <div key={step.num} style={{ display: "flex", alignItems: "center" }}>
            {/* Step bubble */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                transition: "all 0.3s",
                background: done
                  ? "linear-gradient(135deg,#57f1db,#38bdf8)"
                  : active
                  ? "linear-gradient(135deg,#57f1db,#a78bfa)"
                  : "rgba(255,255,255,0.06)",
                color: done || active ? "#051424" : "#475569",
                border: active
                  ? "2px solid #57f1db"
                  : done
                  ? "2px solid #38bdf8"
                  : "2px solid rgba(255,255,255,0.08)",
                boxShadow: active ? "0 0 14px rgba(87,241,219,0.4)" : "none",
              }}>
                {done ? "✓" : step.num}
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: active ? "#57f1db" : done ? "#38bdf8" : "#475569",
                transition: "color 0.3s",
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {i < STEPS.length - 1 && (
              <div style={{
                width: 60,
                height: 2,
                margin: "-16px 6px 0",
                borderRadius: 2,
                background: done
                  ? "linear-gradient(90deg,#57f1db,#38bdf8)"
                  : "rgba(255,255,255,0.07)",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
