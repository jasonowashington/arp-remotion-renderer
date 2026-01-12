import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { WordCue } from "../types";

export const CaptionsWordByWord: React.FC<{ cues: WordCue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const activeIndex = cues.findIndex(c => t >= c.startSec && t < c.endSec);
  if (activeIndex < 0) return null;

  const start = Math.max(0, activeIndex - 3);
  const end = Math.min(cues.length, activeIndex + 4);
  const window = cues.slice(start, end);

  const denom = Math.max(0.001, cues[activeIndex].endSec - cues[activeIndex].startSec);
  const progress = (t - cues[activeIndex].startSec) / denom;
  const opacity = interpolate(progress, [0, 0.2, 1], [0.6, 1, 1]);

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 72, display: "flex", justifyContent: "center", padding: "0 48px", pointerEvents: "none" }}>
      <div style={{ maxWidth: 1400, fontSize: 44, fontWeight: 800, lineHeight: 1.15, textAlign: "center", textShadow: "0 10px 30px rgba(0,0,0,0.55)", opacity }}>
        {window.map((w, i) => {
          const isActive = start + i === activeIndex;
          return (
            <span key={`${w.startSec}-${w.word}`} style={{
              padding: "0 8px",
              borderRadius: 10,
              background: isActive ? "rgba(0,168,255,0.28)" : "transparent",
              boxShadow: isActive ? "0 10px 24px rgba(0,168,255,0.18)" : "none"
            }}>
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
