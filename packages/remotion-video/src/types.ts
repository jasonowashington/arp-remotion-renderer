export type WordCue = { startSec: number; endSec: number; word: string };
export type Scene = {
  id: number;
  type: "HOOK" | "TOOL" | "CTA" | string;
  durationSec: number;
  headline: string;
  subhead?: string;
  bullets?: string[];
  lowerThird?: string;
  uiMock?: { style: "glass-card" | "app-window"; title: string; lines: string[]; };
};
export type LongProps = {
  brand: string;
  theme: string;
  title: string;
  subtitle?: string;
  fps: number;
  audioPath: string;
  scenes: Scene[];
  captions?: WordCue[];
  cta?: { primary: string; secondary?: string; urlPrimary?: string; urlSecondary?: string; };
  disclosures?: { ftc?: string; education?: string; ai?: string; fairHousing?: string; };
};
