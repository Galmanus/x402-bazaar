import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const SANS = 'Inter, "Segoe UI", system-ui, sans-serif';
export const T = {
  sky1: "#1a2436", sky2: "#0e1420", floor: "#0b1018",
  ink: "#eef3f8", dim: "#9fb0c3", faint: "#5b6b7e", white: "#ffffff",
  green: "#48d597", blue: "#5aa9ff", violet: "#b18bff", red: "#ff6b6b",
  gold: "#ffcf5c", amber: "#ffb84d", pink: "#ff8fb1", teal: "#4fd6c8",
};

export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Warm, friendly stage — soft gradient, floor, floating dots. NO scanlines. */
export const Stage: React.FC<{ children: React.ReactNode; a?: string; b?: string }> = ({ children, a = T.sky1, b = T.sky2 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${a} 0%, ${b} 78%)`, fontFamily: SANS, overflow: "hidden" }}>
      {/* soft floating bokeh */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = (i * 223) % 1920;
        const y = 120 + ((i * 137) % 500);
        const drift = Math.sin((f + i * 40) / 40) * 14;
        return <div key={i} style={{ position: "absolute", left: x, top: y + drift, width: 8 + (i % 3) * 5, height: 8 + (i % 3) * 5, borderRadius: 99, background: hexA(T.white, 0.05) }} />;
      })}
      {/* floor */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 300, background: `linear-gradient(180deg, transparent, ${hexA(T.floor, 0.9)})` }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 240, height: 2, background: hexA(T.white, 0.06) }} />
      {children}
    </AbsoluteFill>
  );
};

/** A cute robot. Idle bob + blink. Optional wave, look direction, hold slot. */
export const Robot: React.FC<{
  x: number; y: number; scale?: number; color?: string; face?: string; look?: number;
  bob?: boolean; blinkAt?: number; hold?: React.ReactNode; z?: number;
}> = ({ x, y, scale = 1, color = T.blue, face = "^_^", look = 0, bob = true, blinkAt = 0, hold, z = 1 }) => {
  const f = useCurrentFrame();
  const by = bob ? Math.sin((f + blinkAt) / 14) * 6 : 0;
  const blink = Math.abs(Math.sin((f + blinkAt) / 40)) > 0.94 ? 0.15 : 1;
  const dark = "#101722";
  return (
    <div style={{ position: "absolute", left: x, top: y + by, transform: `translate(-50%,-50%) scale(${scale})`, zIndex: z }}>
      {/* antenna */}
      <div style={{ position: "absolute", left: "50%", top: -18, transform: "translateX(-50%)", width: 4, height: 20, background: color, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: "50%", top: -30, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: 99, background: T.gold, boxShadow: `0 0 14px ${hexA(T.gold, 0.8)}` }} />
      {/* head */}
      <div style={{ width: 150, height: 118, borderRadius: 30, background: color, boxShadow: `0 12px 30px rgba(0,0,0,0.35), inset 0 -10px 0 ${hexA("#000000", 0.12)}`, position: "relative" }}>
        {/* face screen */}
        <div style={{ position: "absolute", inset: 18, borderRadius: 20, background: dark, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {/* eyes */}
          <div style={{ display: "flex", gap: 26, transform: `translateX(${look * 8}px)` }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ width: 22, height: 30 * blink, borderRadius: 12, background: color === T.gold ? "#101722" : T.white, boxShadow: `0 0 12px ${hexA(color, 0.6)}` }} />
            ))}
          </div>
          {/* mouth */}
          <div style={{ position: "absolute", bottom: 14, width: 34, height: 8, borderRadius: 8, background: hexA(color, 0.8) }} />
        </div>
      </div>
      {/* body */}
      <div style={{ width: 120, height: 70, borderRadius: 22, background: color, margin: "10px auto 0", boxShadow: `0 10px 24px rgba(0,0,0,0.35), inset 0 -8px 0 ${hexA("#000000", 0.12)}`, position: "relative" }}>
        <div style={{ position: "absolute", inset: "14px 22px", borderRadius: 12, background: hexA(dark, 0.9) }} />
      </div>
      {/* hold slot (coin, badge…) */}
      {hold && <div style={{ position: "absolute", left: "50%", top: 150, transform: "translateX(-50%)" }}>{hold}</div>}
    </div>
  );
};

export const Coin: React.FC<{ size?: number; label?: string; color?: string }> = ({ size = 56, label = "$", color = T.gold }) => {
  const f = useCurrentFrame();
  const spin = Math.sin(f / 12);
  return (
    <div style={{ width: size * Math.abs(spin) + 6, height: size, borderRadius: 99, background: color, border: `3px solid ${hexA("#000", 0.15)}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a3a00", fontWeight: 900, fontSize: size * 0.42, boxShadow: `0 6px 16px ${hexA(color, 0.5)}` }}>{Math.abs(spin) > 0.4 ? label : ""}</div>
  );
};

export const Bubble: React.FC<{ x: number; y: number; children: React.ReactNode; color?: string; at?: number; tail?: "down" | "left" | "right" }> = ({ x, y, children, color = T.white, at = 0, tail = "down" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 12, mass: 0.6 }, durationInFrames: 20 });
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${s})`, zIndex: 5 }}>
      <div style={{ background: color, color: "#12202f", borderRadius: 20, padding: "16px 24px", fontSize: 30, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,0.35)", whiteSpace: "nowrap" }}>{children}</div>
      <div style={{ position: "absolute", ...(tail === "down" ? { bottom: -10, left: "50%", transform: "translateX(-50%)" } : tail === "left" ? { left: -10, top: "50%", transform: "translateY(-50%)" } : { right: -10, top: "50%", transform: "translateY(-50%)" }), width: 22, height: 22, background: color, borderRadius: 4, rotate: "45deg" }} />
    </div>
  );
};

export const Stall: React.FC<{ x: number; y: number; color: string; sign: string; on?: boolean; scale?: number }> = ({ x, y, color, sign, on = true, scale = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${scale})`, opacity: on ? 1 : 0.28, filter: on ? "none" : "grayscale(1)", transition: "none" }}>
    {/* awning */}
    <div style={{ width: 160, height: 40, background: `repeating-linear-gradient(90deg, ${color} 0 20px, ${hexA("#fff", 0.85)} 20px 40px)`, borderRadius: "10px 10px 0 0" }} />
    {/* board */}
    <div style={{ width: 160, height: 96, background: "#16202e", borderRadius: "0 0 10px 10px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", boxShadow: on ? `0 0 24px ${hexA(color, 0.5)}` : "none" }}>
      <div style={{ fontSize: 40 }}>{sign}</div>
    </div>
    {/* posts */}
    <div style={{ position: "absolute", left: 8, top: 0, width: 6, height: 150, background: "#0e1620" }} />
    <div style={{ position: "absolute", right: 8, top: 0, width: 6, height: 150, background: "#0e1620" }} />
  </div>
);

export const Vault: React.FC<{ x: number; y: number; scale?: number; color?: string; open?: number }> = ({ x, y, scale = 1, color = T.teal, open = 0 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${scale})` }}>
      <div style={{ width: 200, height: 200, borderRadius: 24, background: "#132030", border: `6px solid ${color}`, boxShadow: `0 0 40px ${hexA(color, 0.4)}`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 24, borderRadius: 99, border: `8px solid ${hexA(color, 0.5)}` }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%,-50%) rotate(${f * 3 + open * 120}deg)`, width: 14, height: 90, background: color, borderRadius: 8 }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%,-50%) rotate(${f * 3 + 90 + open * 120}deg)`, width: 14, height: 90, background: color, borderRadius: 8 }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 26, height: 26, borderRadius: 99, background: color }} />
      </div>
      <div style={{ textAlign: "center", marginTop: 12, color: T.dim, fontSize: 20, fontWeight: 700 }}>Stellar</div>
    </div>
  );
};

/** Caption bar — the ELI5 narration at the bottom, like a storybook. */
export const Caption: React.FC<{ children: React.ReactNode; at?: number; accent?: string }> = ({ children, at = 0, accent = T.ink }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [at, at + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(f, [at, at + 10], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", opacity: op, transform: `translateY(${y}px)` }}>
      <span style={{ fontSize: 40, fontWeight: 800, color: accent, background: hexA("#0a0f16", 0.55), padding: "12px 30px", borderRadius: 16, lineHeight: 1.5 }}>{children}</span>
    </div>
  );
};

/** flying coin/particle from A to B */
export const Fly: React.FC<{ from: [number, number]; to: [number, number]; at: number; dur: number; children: React.ReactNode; arc?: number }> = ({ from, to, at, dur, children, arc = 120 }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = f >= at && f <= at + dur + 2 ? 1 : 0;
  const x = interpolate(p, [0, 1], [from[0], to[0]]);
  const y = interpolate(p, [0, 1], [from[1], to[1]]) - Math.sin(p * Math.PI) * arc;
  return <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", opacity: vis, zIndex: 6 }}>{children}</div>;
};

export const Pop: React.FC<{ at?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at = 0, children, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 11, mass: 0.5 }, durationInFrames: 18 });
  return <div style={{ transform: `scale(${s})`, ...style }}>{children}</div>;
};

export const Fade: React.FC<{ dur: number; xf: number; children: React.ReactNode }> = ({ dur, xf, children }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, xf, dur - xf, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};
