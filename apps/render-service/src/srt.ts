export type CaptionSegment = { startSec: number; endSec: number; text: string };
export type WordCue = { startSec: number; endSec: number; word: string };

function timeToSec(t: string): number {
  const m = t.match(/(\d+):(\d+):(\d+),(\d+)/);
  if (!m) return 0;
  const hh = Number(m[1]), mm = Number(m[2]), ss = Number(m[3]), ms = Number(m[4]);
  return hh * 3600 + mm * 60 + ss + ms / 1000;
}

export function parseSrt(srt: string): CaptionSegment[] {
  const blocks = srt.replace(/\r/g, "").trim().split(/\n\n+/);
  const out: CaptionSegment[] = [];
  for (const b of blocks) {
    const lines = b.split("\n").filter(Boolean);
    if (lines.length < 3) continue;
    const times = lines[1].split("-->").map(s => s.trim());
    if (times.length !== 2) continue;
    const start = timeToSec(times[0]);
    const end = timeToSec(times[1]);
    const text = lines.slice(2).join(" ").replace(/\s+/g, " ").trim();
    if (text) out.push({ startSec: start, endSec: end, text });
  }
  return out;
}

export function segmentsToWordCues(segments: CaptionSegment[]): WordCue[] {
  const cues: WordCue[] = [];
  for (const seg of segments) {
    const words = seg.text.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const dur = Math.max(0.08, seg.endSec - seg.startSec);
    const per = dur / words.length;
    for (let i = 0; i < words.length; i++) {
      const start = seg.startSec + i * per;
      const end = i === words.length - 1 ? seg.endSec : start + per;
      cues.push({ startSec: start, endSec: end, word: words[i] });
    }
  }
  return cues;
}
