import React from "react";
import { Composition } from "remotion";
import { ARPLong } from "./compositions/ARPLong";
import { ARPShort, type ARPShortProps } from "./compositions/ARPShort";
import type { LongProps } from "./types";

export const RemotionRoot: React.FC = () => {
  const fps = 30;
  const defaultProps: LongProps = {
    brand: "Automated Realty Playbook",
    theme: "tesla-clean-futurism",
    title: "AI Real Estate Workflow",
    subtitle: "Premium faceless format",
    fps,
    audioSrc: "",
    scenes: [
      { id: 1, type: "HOOK", durationSec: 8, headline: "Automate Your Follow-Up", subhead: "In minutes, not hours.", uiMock: { style: "app-window", title: "ARP Workflow", lines: ["Lead captured →", "AI follow-up →", "Appointment booked →"] } },
      { id: 2, type: "TOOL", durationSec: 12, headline: "AI Listing Generator", subhead: "Clean, compliant drafts.", uiMock: { style: "glass-card", title: "Listing Panel", lines: ["Inputs →", "Tone →", "Draft →", "Compliance check"] } },
      { id: 3, type: "CTA", durationSec: 8, headline: "Get the Free 2026 AI Toolkit", uiMock: { style: "glass-card", title: "CTA", lines: ["Toolkit", "Prompts", "Email pack", "Deal analyzer"] } }
    ],
    captions: []
  };

  const defaultShortProps: ARPShortProps = {
    brand: defaultProps.brand,
    theme: defaultProps.theme,
    title: defaultProps.title,
    subtitle: defaultProps.subtitle,
    fps: defaultProps.fps,
    audioSrc: defaultProps.audioSrc,
    captions: defaultProps.captions
  };

  return (
    <>
      <Composition id="ARP-Long-16x9" component={ARPLong} durationInFrames={fps * 210} fps={fps} width={1920} height={1080} defaultProps={defaultProps} />
      <Composition id="ARP-Short-9x16" component={ARPShort} durationInFrames={fps * 30} fps={fps} width={1080} height={1920} defaultProps={defaultShortProps} />
    </>
  );
};
