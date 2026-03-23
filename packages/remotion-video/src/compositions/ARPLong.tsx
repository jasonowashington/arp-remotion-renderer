import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { LongProps, Scene } from "../types";
import { CaptionsWordByWord } from "../ui/CaptionsWordByWord";
import { GlassPanel } from "../ui/GlassPanel";
import { AppWindow } from "../ui/AppWindow";

const DEFAULT_ACCENT = "#00a8ff";

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

const GradientBackground: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(circle at top, rgba(0,168,255,0.18) 0%, rgba(2,3,8,1) 55%, rgba(0,0,0,1) 100%)",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      color: "white",
    }}
  >
    <AbsoluteFill
      style={{
        opacity: 0.52,
        transform: `translateY(${Math.sin(frame / 50) * 8}px)`,
        background:
          "radial-gradient(circle at 20% 20%, rgba(0,168,255,0.20), transparent 55%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.06), transparent 50%)",
      }}
    />
  </AbsoluteFill>
);

const KenBurnsBackground: React.FC<{ src: string; frame: number; durationFrames: number }> = ({
  src,
  frame,
  durationFrames,
}) => {
  const progress = Math.min(1, frame / Math.max(1, durationFrames));
  const scale = interpolate(progress, [0, 1], [1.08, 1.0]);
  const translateX = interpolate(progress, [0, 1], [0, -12]);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${translateX}px)`,
          transformOrigin: "center center",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(135deg, rgba(2,3,8,0.72) 0%, rgba(0,0,0,0.58) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const ARPLong: React.FC<LongProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const scenes = useMemo(() => withOffsets(props.scenes || [], fps), [props.scenes, fps]);
  const accent = props.accentColor || DEFAULT_ACCENT;

  const active = scenes.find((s: any) => frame >= s.startFrame && frame < s.startFrame + s.durationFrames) as any;
  const local = active ? frame - active.startFrame : 0;
  const sceneAccent = active?.accentColor || accent;

  const enter = spring({ fps, frame: local, config: { damping: 200 } });
  const y = interpolate(enter, [0, 1], [22, 0]);
  const o = interpolate(enter, [0, 1], [0, 1]);
  const fadeOut = interpolate(frame, [durationInFrames - fps * 1.5, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "white",
        opacity: fadeOut,
      }}
    >
      {active?.bgImageUrl ? (
        <KenBurnsBackground src={active.bgImageUrl} frame={local} durationFrames={active.durationFrames} />
      ) : (
        <GradientBackground frame={frame} />
      )}

      {props.audioSrc ? <Audio src={props.audioSrc} /> : null}

      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 6,
          background: `linear-gradient(180deg, ${sceneAccent}, transparent)`,
          opacity: o,
        }}
      />

      <AbsoluteFill style={{ padding: "72px 80px" }}>
        <div style={{ display: "flex", gap: 40, height: "100%" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              opacity: o,
              transform: `translateY(${y}px)`,
            }}
          >
            {active?.type && active.type !== "CTA" ? (
              <div
                style={{
                  display: "inline-block",
                  marginBottom: 20,
                  padding: "5px 18px",
                  borderRadius: 999,
                  background: `${sceneAccent}22`,
                  border: `1px solid ${sceneAccent}55`,
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: sceneAccent,
                  textTransform: "uppercase",
                  alignSelf: "flex-start",
                }}
              >
                {active.type}
              </div>
            ) : null}

            <div style={{ fontSize: 62, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.04, textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>
              {active?.headline || props.title}
            </div>

            {active?.subhead ? (
              <div style={{ marginTop: 20, fontSize: 24, opacity: 0.82, maxWidth: 720, lineHeight: 1.35, fontWeight: 400 }}>
                {active.subhead}
              </div>
            ) : null}

            {active?.stat ? (
              <div style={{ marginTop: 28, display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 80, fontWeight: 900, color: sceneAccent, lineHeight: 1 }}>{active.stat.value}</span>
                <span style={{ fontSize: 22, opacity: 0.82, maxWidth: 280, lineHeight: 1.2 }}>{active.stat.label}</span>
              </div>
            ) : null}

            {active?.bullets?.length ? (
              <ul style={{ marginTop: 24, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {active.bullets.slice(0, 5).map((b: string, i: number) => {
                  const bulletEnter = spring({ fps, frame: Math.max(0, local - i * 5), config: { damping: 160 } });
                  return (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        fontSize: 22,
                        lineHeight: 1.4,
                        opacity: interpolate(bulletEnter, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(bulletEnter, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      <span style={{ color: sceneAccent, fontWeight: 900, fontSize: 18, marginTop: 3 }}>▶</span>
                      <span style={{ opacity: 0.92 }}>{b}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {active?.lowerThird ? <div style={{ marginTop: "auto", paddingTop: 20, fontSize: 16, opacity: 0.68, letterSpacing: 0.4 }}>{active.lowerThird}</div> : null}
          </div>

          <div style={{ width: 540, display: "flex", alignItems: "center", justifyContent: "center", opacity: o, transform: `translateY(${y}px)` }}>
            {active?.uiMock?.style === "app-window" ? (
              <AppWindow title={active.uiMock.title} lines={active.uiMock.lines} />
            ) : (
              <GlassPanel title={active?.uiMock?.title || props.brand} lines={active?.uiMock?.lines || []} />
            )}
          </div>
        </div>
      </AbsoluteFill>

      <CaptionsWordByWord cues={props.captions || []} />

      <div
        style={{
          position: "absolute",
          top: 28,
          left: 32,
          fontSize: 16,
          fontWeight: 700,
          opacity: 0.88,
          letterSpacing: 1.8,
          textTransform: "uppercase",
          color: sceneAccent,
        }}
      >
        {props.brand}
      </div>

      {frame > durationInFrames - fps * 3 ? (
        <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 52, fontWeight: 900, textAlign: "center", maxWidth: 1100, lineHeight: 1.1, textShadow: "0 4px 32px rgba(0,168,255,0.35)" }}>
            {props.cta?.primary || "Get the Free 2026 AI Toolkit"}
          </div>
          <div style={{ fontSize: 22, opacity: 0.82 }}>
            {props.cta?.secondary || "Subscribe for weekly ARP workflows"}
          </div>
          <div style={{ marginTop: 12, padding: "14px 36px", borderRadius: 999, background: sceneAccent, fontSize: 20, fontWeight: 800 }}>
            Subscribe Now
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
