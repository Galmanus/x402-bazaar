import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { C, MONO, Screen, In, Cursor, typed, hexA, Fade } from "./cinematic";

const P = C.violet;

// 1 — the RPC forgets
const Amnesia: React.FC = () => {
  const f = useCurrentFrame();
  const decay = interpolate(f, [30, 90], [1, 0.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Screen tint="#130f1e" sweep={P}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: MONO }}>
        <In><div style={{ color: C.amber, fontSize: 24, letterSpacing: 2 }}>⏳ THE RPC FORGETS</div></In>
        <In start={8}><div style={{ color: C.dim, fontSize: 22, marginTop: 14 }}>a private pool&apos;s history ages out — measured window <b style={{ color: C.ink }}>7.02 days</b></div></In>
        <div style={{ display: "flex", gap: 10, marginTop: 40 }}>
          {Array.from({ length: 15 }).map((_, i) => {
            const gone = interpolate(f, [30 + i * 3, 40 + i * 3], [1, i < 12 ? 0.1 : 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return <div key={i} style={{ width: 34, height: 46, borderRadius: 6, background: hexA(P, 0.22 * gone), border: `1.5px solid ${hexA(P, gone)}` }} />;
          })}
        </div>
        <In start={92} style={{ opacity: decay < 0.2 ? 1 : undefined }}><div style={{ marginTop: 34, color: C.dim, fontSize: 20 }}>the compliance trail vanishes exactly when an auditor needs it</div></In>
      </AbsoluteFill>
    </Screen>
  );
};

// 2 — serve it, prove it complete
const Serve: React.FC = () => {
  const f = useCurrentFrame();
  const rows: [string, string, number][] = [
    ["durable index", "serve the history the RPC dropped", 12],
    ["gap-free proof", "an append-only sequence, complete by index", 34],
    ["hash-based attestation", "Circle STARK · no curves · no pairings · no setup", 56],
  ];
  return (
    <Screen tint="#130f1e" sweep={P}>
      <AbsoluteFill style={{ padding: "80px 170px", fontFamily: MONO }}>
        <In><div style={{ color: P, fontSize: 24, letterSpacing: 2, marginBottom: 8 }}>◆ SO WE REBUILD IT — AND PROVE IT</div></In>
        <In start={4}><div style={{ color: C.dim, fontSize: 20, marginBottom: 32 }}>15 real ASP leaves, captured from testnet · nothing mocked</div></In>
        {rows.map(([k, v, s], i) => {
          const op = interpolate(f, [s, s + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity: op, display: "flex", alignItems: "baseline", gap: 22, marginBottom: 20 }}>
              <span style={{ color: P, fontSize: 27, fontWeight: 800, width: 430 }}>{k}</span>
              <span style={{ color: C.ink, fontSize: 22 }}>{v}</span>
            </div>
          );
        })}
      </AbsoluteFill>
    </Screen>
  );
};

// 3 — verified on-chain, gates state
const OnChain: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [34, 40, 54], [0, 0.36, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = interpolate(f, [14, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Screen tint="#130f1e">
      <AbsoluteFill style={{ background: `rgba(163,113,247,${flash})` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: MONO }}>
        <In><div style={{ color: P, fontSize: 22, letterSpacing: 2, fontWeight: 800, textAlign: "center", maxWidth: 1150 }}>◆ FIRST TRANSPARENT POST-QUANTUM PROOF VERIFIED ON-CHAIN ON STELLAR</div></In>
        <In start={14}>
          <div style={{ marginTop: 24, padding: "28px 42px", borderRadius: 16, background: "#0f0c17", border: `1.5px solid ${P}`, boxShadow: `0 0 ${glow * 52}px ${hexA(P, 0.3 * glow)}` }}>
            <div style={{ color: C.dim, fontSize: 17, marginBottom: 10 }}>the PQ proof GATES on-chain state · testnet</div>
            <div style={{ color: C.green, fontSize: 24 }}>✓ a2c3227c…  <span style={{ color: C.dim, fontSize: 18 }}>valid proof admits the root → emits `admitted`</span></div>
            <div style={{ color: C.red, fontSize: 24, marginTop: 8 }}>✕ tampered proof  <span style={{ color: C.dim, fontSize: 18 }}>refused, same transaction</span></div>
            <div style={{ display: "flex", gap: 44, marginTop: 20 }}>
              {[["tests", "31 JS + 15 Rust"], ["trusted setup", "none"], ["curves / pairings", "zero"]].map(([k, v]) => (
                <div key={k}><div style={{ color: C.faint, fontSize: 15 }}>{k}</div><div style={{ color: P, fontSize: 21, fontWeight: 700, marginTop: 4 }}>{v}</div></div>
              ))}
            </div>
          </div>
        </In>
        <In start={34}><div style={{ marginTop: 24, color: C.dim, fontSize: 21, textAlign: "center", maxWidth: 1050 }}>a root counts as compliance-valid <b style={{ color: C.ink }}>only if</b> the post-quantum proof verifies in the same transaction</div></In>
      </AbsoluteFill>
    </Screen>
  );
};

const Close: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Screen tint="#130f1e">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: MONO }}>
        <div style={{ opacity: interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" }), color: C.ink, fontSize: 52, fontWeight: 800, textAlign: "center", maxWidth: 1200 }}>compliance that outlives the pairing</div>
        <In start={18}><div style={{ color: C.dim, fontSize: 21, marginTop: 22 }}>every BN254 proof breaks under quantum · this one only bends · MIT</div></In>
        <In start={32}><div style={{ color: P, fontSize: 24, marginTop: 28 }}>github.com/Galmanus/spp-compliance-layer</div></In>
      </AbsoluteFill>
    </Screen>
  );
};

export const SPP: React.FC = () => {
  const S = [126, 126, 144, 108];
  const XF = 10;
  let t = 0;
  const at = (l: number) => { const s = t; t += l - XF; return s; };
  return (
    <AbsoluteFill>
      <Sequence from={at(S[0])} durationInFrames={S[0]}><Fade dur={S[0]} xf={XF}><Amnesia /></Fade></Sequence>
      <Sequence from={at(S[1])} durationInFrames={S[1]}><Fade dur={S[1]} xf={XF}><Serve /></Fade></Sequence>
      <Sequence from={at(S[2])} durationInFrames={S[2]}><Fade dur={S[2]} xf={XF}><OnChain /></Fade></Sequence>
      <Sequence from={at(S[3])} durationInFrames={S[3]}><Fade dur={S[3]} xf={XF}><Close /></Fade></Sequence>
    </AbsoluteFill>
  );
};
export const SPP_LEN = 126 + 126 + 144 + 108 - 10 * 3;
