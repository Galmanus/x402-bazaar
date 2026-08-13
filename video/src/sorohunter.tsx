import React from "react";
import { AbsoluteFill, Sequence, interpolate, random, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "./theme";

const RED = "#f85149";
const GRN = "#3fb950";
const AMBER = "#e3b341";
const MONO = '"JetBrains Mono", "SF Mono", ui-monospace, monospace';

// ---------- shared atoms ----------
const Screen: React.FC<{ children: React.ReactNode; scan?: boolean }> = ({ children, scan }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#07090b", fontFamily: MONO, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(1000px 500px at 50% 0%, #120a0b 0%, #07090b 60%)" }} />
      {/* scanlines */}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 2px, transparent 4px)", opacity: 0.6 }} />
      {scan && (
        <div style={{ position: "absolute", left: 0, right: 0, top: `${(f * 2.2) % 120 - 10}%`, height: 120, background: `linear-gradient(180deg, transparent, ${hexA(RED, 0.10)}, transparent)` }} />
      )}
      {children}
    </AbsoluteFill>
  );
};

function typed(text: string, frame: number, start: number, cps = 1.4) {
  const n = Math.max(0, Math.floor((frame - start) * cps));
  return text.slice(0, n);
}
const Cursor: React.FC = () => {
  const f = useCurrentFrame();
  return <span style={{ opacity: Math.floor(f / 14) % 2 ? 1 : 0.15 }}>▋</span>;
};

// ---------- 1. cold open ----------
const ColdOpen: React.FC = () => {
  const f = useCurrentFrame();
  const cmd = "$ sorohunter hunt --target CDLZ…K4A9 --fork";
  const t = typed(cmd, f, 6, 1.7);
  const done = t.length >= cmd.length;
  return (
    <Screen>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 180 }}>
        <div style={{ color: COLORS.ink, fontSize: 34 }}>
          <span style={{ color: GRN }}>{t}</span>{!done && <Cursor />}
        </div>
        {done && (
          <div style={{ marginTop: 30, fontSize: 24, color: COLORS.dim, lineHeight: 1.8 }}>
            <Line at={f} start={40} color={COLORS.dim}>fetching deployed WASM… <span style={{ color: GRN }}>ok</span></Line>
            <Line at={f} start={54} color={COLORS.dim}>reading ABI · 14 entry points</Line>
            <Line at={f} start={68} color={AMBER}>booting local soroban-sdk fork · isolated · <b style={{ color: GRN }}>never touches mainnet</b></Line>
          </div>
        )}
      </AbsoluteFill>
    </Screen>
  );
};
const Line: React.FC<{ at: number; start: number; color: string; children: React.ReactNode }> = ({ at, start, color, children }) => {
  const op = interpolate(at, [start, start + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity: op, color }}>{children}</div>;
};

// ---------- 2. lock on / 11 techniques firing ----------
const TECHS = [
  "missing __check_auth", "auth-entry replay", "signature not bound", "reentrancy",
  "integer overflow", "unchecked arithmetic", "storage TTL griefing", "economic drain",
  "passkey smart-account bypass", "cross-contract auth confusion", "nonce reuse",
];
const LockOn: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Screen scan>
      <AbsoluteFill style={{ padding: "70px 180px" }}>
        <div style={{ color: RED, fontSize: 26, letterSpacing: 3, marginBottom: 8 }}>▶ LOCKED ON TARGET</div>
        <div style={{ color: COLORS.dim, fontSize: 20, marginBottom: 26 }}>11 adversary techniques · executed step-by-step in the fork</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 60px" }}>
          {TECHS.map((t, i) => {
            const s = 10 + i * 8;
            const op = interpolate(f, [s, s + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const landed = i === 8; // passkey bypass lands
            const flick = f > s + 6 ? (landed ? 1 : random(`${i}`) > 0.5 ? 1 : 0.55) : 0;
            return (
              <div key={i} style={{ opacity: op, fontSize: 23, display: "flex", justifyContent: "space-between", color: COLORS.ink }}>
                <span>{landed && f > 100 ? <b style={{ color: RED }}>{t}</b> : t}</span>
                <span style={{ color: landed && f > 100 ? RED : GRN, opacity: flick, fontWeight: 700 }}>
                  {landed && f > 100 ? "HIT" : "· clear"}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Screen>
  );
};

// ---------- 3. the breach ----------
const Breach: React.FC = () => {
  const f = useCurrentFrame();
  const lines = [
    ["> require_auth(attacker)", "call 1", GRN, 8],
    ["> __check_auth  →  bypassed", "call 2", RED, 26],
    ["> withdraw(vault, attacker)", "+12,000 USDC", RED, 46],
  ] as const;
  const flash = interpolate(f, [64, 70, 82], [0, 0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Screen>
      <AbsoluteFill style={{ background: `rgba(248,81,73,${flash})` }} />
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 180 }}>
        <div style={{ color: COLORS.dim, fontSize: 20, marginBottom: 18 }}>replaying the exact invocation sequence in the fork —</div>
        {lines.map(([code, tag, col, start], i) => {
          const op = interpolate(f, [start, start + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity: op, display: "flex", alignItems: "baseline", gap: 26, marginBottom: 12 }}>
              <span style={{ color: col, fontSize: 30 }}>{code}</span>
              <span style={{ color: COLORS.faint, fontSize: 20 }}>{tag}</span>
            </div>
          );
        })}
        <div style={{ opacity: interpolate(f, [66, 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), marginTop: 26 }}>
          <span style={{ color: RED, fontSize: 44, fontWeight: 800, letterSpacing: 2 }}>⚑ BREACH — AUTH BYPASS</span>
        </div>
        <div style={{ opacity: interpolate(f, [80, 88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), marginTop: 14 }}>
          <span style={{ color: COLORS.ink, fontSize: 26 }}>proven by <b style={{ color: GRN }}>execution</b> — the finding <b style={{ color: GRN }}>is</b> the call sequence, not an inference</span>
        </div>
      </AbsoluteFill>
    </Screen>
  );
};

// ---------- 4. it learns (loop) ----------
const Learn: React.FC = () => {
  const f = useCurrentFrame();
  const nodes = ["recon", "peer memory", "LLM-seeded corpus", "execution proof"];
  const cx = 960, cy = 360, R = 210;
  const spin = f * 2.4;
  return (
    <Screen>
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 70 }}>
        <div style={{ color: AMBER, fontSize: 24, letterSpacing: 2, marginBottom: 6 }}>◆ IT DOESN'T SCAN — IT HUNTS, AND REMEMBERS</div>
        <div style={{ color: COLORS.dim, fontSize: 20 }}>break one contract, start the next one primed by what paid off</div>
      </AbsoluteFill>
      {nodes.map((n, i) => {
        const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * R, y = cy + 120 + Math.sin(a) * R * 0.62;
        const op = interpolate(f, [10 + i * 8, 18 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", opacity: op, padding: "14px 22px", borderRadius: 12, background: "#12161b", border: `1.5px solid ${AMBER}`, color: COLORS.ink, fontSize: 22 }}>{n}</div>
        );
      })}
      {/* orbiting spark */}
      <div style={{ position: "absolute", left: cx + Math.cos((spin * Math.PI) / 180) * R, top: cy + 120 + Math.sin((spin * Math.PI) / 180) * R * 0.62, width: 12, height: 12, borderRadius: 6, background: RED, boxShadow: `0 0 18px ${RED}`, transform: "translate(-50%,-50%)" }} />
      <div style={{ position: "absolute", left: cx, top: cy + 120, transform: "translate(-50%,-50%)", color: COLORS.faint, fontSize: 20 }}>↻ sharper every target</div>
    </Screen>
  );
};

// ---------- 5. close ----------
const Close: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Screen>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" }), color: RED, fontSize: 84, fontWeight: 800, letterSpacing: 1 }}>
          it bites what it finds
        </div>
        <div style={{ opacity: interpolate(f, [16, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), color: COLORS.dim, fontSize: 24, marginTop: 22 }}>
          11 techniques · fork-validated · never sent to a live network · MIT
        </div>
        <div style={{ opacity: interpolate(f, [34, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), color: RED, fontSize: 26, marginTop: 30, fontFamily: MONO }}>
          github.com/Galmanus/sorohunter
        </div>
      </AbsoluteFill>
    </Screen>
  );
};

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const Sorohunter: React.FC = () => {
  const S = [96, 120, 132, 132, 108];
  const XF = 10;
  let t = 0;
  const at = (l: number) => { const s = t; t += l - XF; return s; };
  const F: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
    const f = useCurrentFrame();
    const op = interpolate(f, [0, XF, dur - XF, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
  };
  return (
    <AbsoluteFill>
      <Sequence from={at(S[0])} durationInFrames={S[0]}><F dur={S[0]}><ColdOpen /></F></Sequence>
      <Sequence from={at(S[1])} durationInFrames={S[1]}><F dur={S[1]}><LockOn /></F></Sequence>
      <Sequence from={at(S[2])} durationInFrames={S[2]}><F dur={S[2]}><Breach /></F></Sequence>
      <Sequence from={at(S[3])} durationInFrames={S[3]}><F dur={S[3]}><Learn /></F></Sequence>
      <Sequence from={at(S[4])} durationInFrames={S[4]}><F dur={S[4]}><Close /></F></Sequence>
    </AbsoluteFill>
  );
};
export const SORO_LEN = 96 + 120 + 132 + 132 + 108 - 10 * 4;
