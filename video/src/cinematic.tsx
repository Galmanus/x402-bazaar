import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const MONO = '"JetBrains Mono", "SF Mono", ui-monospace, monospace';
export const SANS = 'Inter, -apple-system, "Segoe UI", Roboto, system-ui, sans-serif';
export const C = {
  ink: "#e8edf2", dim: "#8a97a6", faint: "#4a5563",
  red: "#f85149", green: "#3fb950", blue: "#58a6ff", violet: "#a371f7",
  amber: "#e3b341", gold: "#e3b341",
};

export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** CRT-ish dark screen with scanlines + optional colored sweep + vignette. */
export const Screen: React.FC<{ children: React.ReactNode; tint?: string; sweep?: string }> = ({ children, tint = "#0d0f13", sweep }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#07090b", fontFamily: SANS, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(1100px 560px at 50% 8%, ${tint} 0%, #07090b 62%)` }} />
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 2px, transparent 4px)", opacity: 0.55 }} />
      {sweep && (
        <div style={{ position: "absolute", left: 0, right: 0, top: `${(f * 2.2) % 130 - 15}%`, height: 130, background: `linear-gradient(180deg, transparent, ${hexA(sweep, 0.10)}, transparent)` }} />
      )}
      {children}
      <AbsoluteFill style={{ boxShadow: "inset 0 0 260px rgba(0,0,0,0.75)" }} />
    </AbsoluteFill>
  );
};

export function typed(text: string, frame: number, start: number, cps = 1.5) {
  const n = Math.max(0, Math.floor((frame - start) * cps));
  return text.slice(0, n);
}

export const Cursor: React.FC<{ color?: string }> = ({ color }) => {
  const f = useCurrentFrame();
  return <span style={{ opacity: Math.floor(f / 14) % 2 ? 1 : 0.15, color }}>▋</span>;
};

/** fade+rise in at `start` (local frames). */
export const In: React.FC<{ start?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ start = 0, y = 14, children, style }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [start, start + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * y}px)`, ...style }}>{children}</div>;
};

/** Standard crossfade sequencer wrapper. */
export const Fade: React.FC<{ dur: number; xf: number; children: React.ReactNode }> = ({ dur, xf, children }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, xf, dur - xf, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};
