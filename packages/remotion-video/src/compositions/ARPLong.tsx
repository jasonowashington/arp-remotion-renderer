import React, { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { LongProps, Scene } from "../types";
import { CaptionsWordByWord } from "../ui/CaptionsWordByWord";
import { GlassPanel } from "../ui/GlassPanel";
import { AppWindow } from "../ui/AppWindow";

const bg: React.CSSProperties = {
  background: "radial-gradient(circle at top, rgba(0,168,255,0.15) 0%, rgba(2,3,8,1) 55%, rgba(0,0,0,1) 100%)",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  color: "white",
};

const frames = (sec: number, fps: number) => Math.max(1, Math.round(sec * fps));

const withOffsets = (scenes: Scene[], fps: number) => {
  let start = 0;
  return scenes.map((s: Scene) => {
    const dur = frames(s.durationSec, fps);
    const out = { ...s, startFrame: start, durationFrames: dur };
    start += dur;
    return out;
  });
};

export const ARPLong: React.FC<LongProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const scenes = useMemo(() => withOffsets(props.scenes, fps), [props.scenes, fps]);

  const active = scenes.find((s: any) => frame >= s.startFrame && frame < s.startFrame + s.durationFrames) as any;
  const local = active ? frame - active.startFrame : 0;

  const enter = spring({ fps, frame: local, config: { damping: 200 } });
  const y = interpolate(enter, [0, 1], [18, 0]);
  const o = interpolate(enter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={bg}>
      {props.audioSrc ? <Audio src={props.audioSrc} /> : null}

      <AbsoluteFill style={{
        opacity: 0.55,
        transform: `translateY(${Math.sin(frame / 50) * 6}px)`,
        background: "radial-gradient(circle at 20% 20%, rgba(0,168,255,0.18), transparent 55%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.06), transparent 50%)"
      }} />

      <AbsoluteFill style={{ padding: 72 }}>
        <div style={{ display: "flex", gap: 32, height: "100%" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ opacity: o, transform: `translateY(${y}px)` }}>
              <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.05 }}>
                {active?.headline || props.title}
              </div>
              {active?.subhead ? <div style={{ marginTop: 18, fontSize: 22, opacity: 0.85, maxWidth: 760, lineHeight: 1.35 }}>{active.subhead}</div> : null}
              {active?.bullets?.length ? (
                <ul style={{ marginTop: 22, fontSize: 20, opacity: 0.9, lineHeight: 1.45 }}>
                  {active.bullets.slice(0, 5).map((b: string, i: number) => <li key={i}>{b}</li>)}
                </ul>
              ) : null}
            </div>
            {active?.lowerThird ? <div style={{ marginTop: 28, fontSize: 16, opacity: 0.7 }}>{active.lowerThird}</div> : null}
          </div>

          <div style={{ width: 560, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ opacity: o, transform: `translateY(${y}px)` }}>
              {active?.uiMock?.style === "app-window"
                ? <AppWindow title={active.uiMock.title} lines={active.uiMock.lines} />
                : <GlassPanel title={active?.uiMock?.title || props.brand} lines={active?.uiMock?.lines || []} />
              }
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <CaptionsWordByWord cues={props.captions || []} />

      <div style={{ position: "absolute", top: 28, left: 36, fontSize: 18, opacity: 0.85, letterSpacing: 0.6 }}>
        {props.brand}
      </div>

      {frame > durationInFrames - fps * 3 ? (
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 800, textAlign: "center", maxWidth: 1100 }}>
            {props.cta?.primary || "Get the Free 2026 AI Toolkit"}
          </div>
          <div style={{ marginTop: 14, fontSize: 18, opacity: 0.85 }}>
            {props.cta?.secondary || "Subscribe for weekly ARP workflows"}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
