import React from "react";

export const GlassPanel: React.FC<{ title: string; lines: string[] }> = ({ title, lines }) => {
  const items = lines?.length ? lines : ["Add UI lines in props"];
  return (
    <div style={{
      width: 560,
      borderRadius: 22,
      padding: 22,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
      boxShadow: "0 30px 90px rgba(0,0,0,0.55)"
    }}>
      <div style={{ fontSize: 16, letterSpacing: 0.5, opacity: 0.85, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gap: 10, fontSize: 18, opacity: 0.92 }}>
        {items.slice(0,6).map((l, i) => (
          <div key={i} style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", backgroundColor: "rgba(0,0,0,0.25)" }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};
