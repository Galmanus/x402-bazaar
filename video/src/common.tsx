import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, SANS } from "./theme";

export const Bg: React.FC<{ children: React.ReactNode; tint?: string }> = ({ children, tint = "#14191f" }) => (
  <AbsoluteFill style={{ background: COLORS.bg, fontFamily: SANS }}>
    <AbsoluteFill style={{ background: `radial-gradient(1200px 600px at 50% 28%, ${tint} 0%, ${COLORS.bg} 70%)` }} />
    {children}
  </AbsoluteFill>
);

/** A receipt card with a title, a mono tx/hash line, and stat columns. */
export const ProofCard: React.FC<{
  kicker: string;
  kickerColor: string;
  mono: string;
  monoTail?: string;
  stats: [string, string][];
  accent: string;
  glow: number;
}> = ({ kicker, kickerColor, mono, monoTail, stats, accent, glow }) => (
  <div style={{ padding: "28px 40px", borderRadius: 16, background: COLORS.bg2, border: `1.5px solid ${accent}`, boxShadow: `0 0 ${glow * 50}px ${hexA(accent, 0.3 * glow)}` }}>
    <div style={{ color: kickerColor, fontSize: 18, marginBottom: 12, letterSpacing: 1 }}>{kicker}</div>
    <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', color: COLORS.ink, fontSize: 28 }}>
      {mono}<span style={{ color: COLORS.faint }}>{monoTail}</span>
    </div>
    <div style={{ display: "flex", gap: 44, marginTop: 20 }}>
      {stats.map(([k, v], i) => (
        <div key={i}>
          <div style={{ color: COLORS.faint, fontSize: 15 }}>{k}</div>
          <div style={{ color: accent, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{v}</div>
        </div>
      ))}
    </div>
  </div>
);

export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
