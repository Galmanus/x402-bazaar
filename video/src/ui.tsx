import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "./theme";

/** Fade+rise in, hold, fade out. Frames are LOCAL to the sequence. */
export const Appear: React.FC<{
  children: React.ReactNode;
  delay?: number;
  outAt?: number;
  y?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, outAt, y = 18, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 18 });
  const opIn = interpolate(s, [0, 1], [0, 1]);
  const op = outAt !== undefined ? opIn * interpolate(frame, [outAt, outAt + 10], [1, 0], { extrapolateRight: "clamp" }) : opIn;
  return (
    <div style={{ opacity: op, transform: `translateY(${(1 - s) * y}px)`, ...style }}>{children}</div>
  );
};

export const Node: React.FC<{
  label: string;
  sub?: string;
  color: string;
  active?: number; // frame at which it "lights up"
  width?: number;
}> = ({ label, sub, color, active, width = 230 }) => {
  const frame = useCurrentFrame();
  const lit = active !== undefined ? interpolate(frame, [active, active + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return (
    <div
      style={{
        width,
        padding: "18px 22px",
        borderRadius: 14,
        background: COLORS.bg2,
        border: `1.5px solid ${interpolateColor(COLORS.line, color, lit)}`,
        boxShadow: lit > 0.1 ? `0 0 ${lit * 34}px ${hexA(color, 0.35 * lit)}` : "none",
      }}
    >
      <div style={{ color: COLORS.ink, fontWeight: 700, fontSize: 26 }}>{label}</div>
      {sub && <div style={{ color: COLORS.dim, fontSize: 17, marginTop: 5 }}>{sub}</div>}
    </div>
  );
};

/** A packet that travels along a horizontal wire between two x positions. */
export const Packet: React.FC<{
  from: number; to: number; y: number; at: number; dur: number; color: string; label?: string;
}> = ({ from, to, y, at, dur, color, label }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = frame >= at && frame <= at + dur + 2 ? 1 : 0;
  const x = interpolate(p, [0, 1], [from, to]);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: vis, transform: "translate(-50%,-50%)" }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: color, boxShadow: `0 0 16px ${color}` }} />
      {label && <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", color, fontSize: 14, fontWeight: 600 }}>{label}</div>}
    </div>
  );
};

export const Wire: React.FC<{ x1: number; x2: number; y: number }> = ({ x1, x2, y }) => (
  <div style={{ position: "absolute", left: Math.min(x1, x2), top: y - 1, width: Math.abs(x2 - x1), height: 2, background: COLORS.line }} />
);

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function interpolateColor(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}
