import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { C, MONO, Screen, In, Cursor, typed, hexA, Fade } from "./cinematic";

const V = C.violet;

const Open: React.FC = () => {
  const f = useCurrentFrame();
  const cmd = "$ agent pay https://api/premium";
  const t = typed(cmd, f, 6, 1.8);
  const done = t.length >= cmd.length;
  return (
    <Screen tint="#140f1c" sweep={V}>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 180, fontFamily: MONO }}>
        <div style={{ fontSize: 34, color: C.ink }}><span style={{ color: V }}>{t}</span>{!done && <Cursor color={V} />}</div>
        {done && (
          <div style={{ marginTop: 28, fontSize: 26, lineHeight: 1.85 }}>
            <In start={38}><span style={{ color: C.amber }}>← 402</span> <span style={{ color: C.dim }}>· x402 on Stellar · pay in USDC</span></In>
            <In start={54}><span style={{ color: C.dim }}>but the unlock wants more than money —</span></In>
            <In start={70}><span style={{ color: V }}>prove you're allowed to buy.</span> <span style={{ color: C.dim }}>a Soroban contract will check.</span></In>
          </div>
        )}
      </AbsoluteFill>
    </Screen>
  );
};

const Credential: React.FC = () => {
  const f = useCurrentFrame();
  const rows: [string, string, number][] = [
    ["set membership", "you belong to an allowed set", 12],
    ["zero knowledge", "the seller never learns which member", 34],
    ["post-quantum", "a hash-based Circle STARK — nothing Shor breaks", 56],
  ];
  return (
    <Screen tint="#140f1c" sweep={V}>
      <AbsoluteFill style={{ padding: "84px 180px", fontFamily: MONO }}>
        <In><div style={{ color: V, fontSize: 24, letterSpacing: 2, marginBottom: 8 }}>◆ THE CREDENTIAL</div></In>
        <In start={4}><div style={{ color: C.dim, fontSize: 20, marginBottom: 34 }}>checked by contract code — not by a server you have to trust</div></In>
        {rows.map(([k, v, s], i) => {
          const op = interpolate(f, [s, s + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity: op, display: "flex", alignItems: "baseline", gap: 24, marginBottom: 20 }}>
              <span style={{ color: V, fontSize: 30, fontWeight: 800, width: 320 }}>{k}</span>
              <span style={{ color: C.ink, fontSize: 24 }}>{v}</span>
            </div>
          );
        })}
      </AbsoluteFill>
    </Screen>
  );
};

const Proof: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [30, 36, 50], [0, 0.36, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = interpolate(f, [14, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Screen tint="#140f1c">
      <AbsoluteFill style={{ background: `rgba(163,113,247,${flash})` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: MONO }}>
        <In><div style={{ color: V, fontSize: 24, letterSpacing: 3, fontWeight: 800 }}>◆ VERIFIED IN THE CONTRACT · ONE COMMAND · TESTNET</div></In>
        <In start={14}>
          <div style={{ marginTop: 24, padding: "28px 42px", borderRadius: 16, background: "#100c17", border: `1.5px solid ${V}`, boxShadow: `0 0 ${glow * 52}px ${hexA(V, 0.3 * glow)}` }}>
            <div style={{ color: C.green, fontSize: 24, marginBottom: 8 }}>✓ dfca24a0…  <span style={{ color: C.dim, fontSize: 18 }}>nullifier burn</span></div>
            <div style={{ color: C.green, fontSize: 24 }}>✓ 9a4ac383…  <span style={{ color: C.dim, fontSize: 18 }}>USDC settlement</span></div>
            <div style={{ display: "flex", gap: 44, marginTop: 20 }}>
              {[["credential", "Circle STARK"], ["trusted setup", "none"], ["agent XLM", "zero"]].map(([k, v]) => (
                <div key={k}><div style={{ color: C.faint, fontSize: 15 }}>{k}</div><div style={{ color: V, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{v}</div></div>
              ))}
            </div>
          </div>
        </In>
        <In start={34}><div style={{ marginTop: 24, color: C.dim, fontSize: 21, textAlign: "center", maxWidth: 1000 }}>the STARK candidate Stellar&apos;s own Quantum Preparedness Plan names for the ZK layer it hasn&apos;t solved</div></In>
      </AbsoluteFill>
    </Screen>
  );
};

const Unlink: React.FC = () => {
  const f = useCurrentFrame();
  const cut = interpolate(f, [30, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Screen tint="#140f1c">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: MONO }}>
        <In><div style={{ color: C.dim, fontSize: 22, marginBottom: 40 }}>pay and prove are separated —</div></In>
        <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
          <In start={10}><Chip label="payment #1" color={V} /></In>
          <div style={{ position: "relative", width: 160, height: 4 }}>
            <div style={{ position: "absolute", inset: 0, background: C.faint, opacity: 1 - cut }} />
            <div style={{ position: "absolute", left: "50%", top: -22, transform: "translateX(-50%)", color: C.red, fontSize: 34, opacity: cut }}>✕</div>
          </div>
          <In start={16}><Chip label="payment #2" color={V} /></In>
        </div>
        <In start={50}><div style={{ marginTop: 44, color: C.green, fontSize: 26 }}>two payments by one credential cannot be linked</div></In>
      </AbsoluteFill>
    </Screen>
  );
};
const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div style={{ padding: "18px 30px", borderRadius: 12, background: "#100c17", border: `1.5px solid ${color}`, color: C.ink, fontSize: 24 }}>{label}</div>
);

const Close: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Screen tint="#140f1c">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: MONO }}>
        <div style={{ opacity: interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" }), color: C.ink, fontSize: 54, fontWeight: 800, textAlign: "center", maxWidth: 1200 }}>pay an API · prove you may · stay anonymous</div>
        <In start={18}><div style={{ color: C.dim, fontSize: 22, marginTop: 22 }}>self-audited · every claim carries a transaction hash · MIT</div></In>
        <In start={32}><div style={{ color: V, fontSize: 26, marginTop: 28 }}>github.com/Galmanus/pq402</div></In>
      </AbsoluteFill>
    </Screen>
  );
};

export const PQ402: React.FC = () => {
  const S = [96, 126, 138, 120, 108];
  const XF = 10;
  let t = 0;
  const at = (l: number) => { const s = t; t += l - XF; return s; };
  return (
    <AbsoluteFill>
      <Sequence from={at(S[0])} durationInFrames={S[0]}><Fade dur={S[0]} xf={XF}><Open /></Fade></Sequence>
      <Sequence from={at(S[1])} durationInFrames={S[1]}><Fade dur={S[1]} xf={XF}><Credential /></Fade></Sequence>
      <Sequence from={at(S[2])} durationInFrames={S[2]}><Fade dur={S[2]} xf={XF}><Proof /></Fade></Sequence>
      <Sequence from={at(S[3])} durationInFrames={S[3]}><Fade dur={S[3]} xf={XF}><Unlink /></Fade></Sequence>
      <Sequence from={at(S[4])} durationInFrames={S[4]}><Fade dur={S[4]} xf={XF}><Close /></Fade></Sequence>
    </AbsoluteFill>
  );
};
export const PQ402_LEN = 96 + 126 + 138 + 120 + 108 - 10 * 4;
