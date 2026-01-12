import React from "react";

export const AppWindow: React.FC<{ title: string; lines: string[] }> = ({ title, lines }) => {
  const items = lines?.length ? lines : ["Add lines in props"];
  return (
    <div style={{
      width: 560,
      borderRadius: 22,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(8,10,16,0.65)",
      boxShadow: "0 30px 90px rgba(0,0,0,0.60)"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))"
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.35)" }} />
          <div style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.25)" }} />
          <div style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.18)" }} />
        </div>
        <div style={{ fontSize: 14, opacity: 0.9, letterSpacing: 0.4 }}>{title}</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: 18, display: "grid", gap: 10 }}>
        {items.slice(0,6).map((l, i) => (
          <div key={i} style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            backgroundColor: "rgba(0,0,0,0.28)",
            fontSize: 18,
            opacity: 0.95
          }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};
