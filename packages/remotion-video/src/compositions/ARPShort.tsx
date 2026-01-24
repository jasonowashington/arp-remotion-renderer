import React from "react";
import { AbsoluteFill, Audio } from "remotion";
import type { LongProps } from "../types";

export type ARPShortProps = Pick<
  LongProps,
  "brand" | "theme" | "title" | "subtitle" | "fps" | "audioSrc" | "captions"
>;

export const ARPShort: React.FC<ARPShortProps> = (props) => {
  return (
    <AbsoluteFill style={{
      background: "radial-gradient(circle at top, rgba(0,168,255,0.18) 0%, rgba(2,3,8,1) 55%, rgba(0,0,0,1) 100%)",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      color: "white",
      padding: 48
    }}>
      {props.audioSrc ? <Audio src={props.audioSrc} /> : null}

      <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 16 }}>
        {props.brand}
      </div>

      <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.05 }}>
        {props.title.toUpperCase()}
      </div>
    </AbsoluteFill>
  );
};
