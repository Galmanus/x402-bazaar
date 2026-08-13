import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Stage, Robot, Bubble, Vault, Caption, Pop, Fade, T, hexA } from "./toon";

const ease = (f: number, a: number, b: number, x: number, y: number) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 1 — the library forgets after ~7 days
const Forget: React.FC = () => {
  const f = useCurrentFrame();
  const books = ["📕", "📗", "📘", "📙", "📕", "📗", "📘"];
  return (
    <Stage a="#1a1430" b="#0f0b1c">
      <div style={{ position: "absolute", left: 960, top: 200, transform: "translate(-50%,-50%)", fontSize: 40, color: T.amber, fontWeight: 800 }}>⏳ 7 days…</div>
      <div style={{ position: "absolute", left: "50%", top: 400, transform: "translateX(-50%)", display: "flex", gap: 24 }}>
        {books.map((b, i) => {
          const gone = ease(f, 30 + i * 8, 44 + i * 8, 1, i < 5 ? 0 : 1);
          return <div key={i} style={{ fontSize: 72, opacity: gone, transform: `translateY(${(1 - gone) * -40}px)` }}>{b}</div>;
        })}
      </div>
      <Robot x={430} y={620} color={T.blue} face="o_o" look={1} />
      <Caption at={6} accent={T.ink}>the network <b>forgets</b> its private-payment history after about a week</Caption>
    </Stage>
  );
};

// 2 — the librarian keeps it all, complete
const Keep: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage a="#1a1430" b="#0f0b1c">
      <Robot x={470} y={520} color={T.violet} face="^_^" look={1} z={2} />
      <Bubble x={520} y={380} at={8} color={T.violet} tail="left">i keep every page 📚</Bubble>
      <div style={{ position: "absolute", left: 1050, top: 440, transform: "translate(-50%,-50%)", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16 }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <Pop key={i} at={14 + i * 4}><div style={{ fontSize: 46 }}>📄</div></Pop>
        ))}
      </div>
      <Caption at={6} accent={T.violet}>a librarian robot keeps the <b>whole history</b> — and proves none is missing</Caption>
    </Stage>
  );
};

// 3 — magic seal (STARK), tamper caught
const Seal: React.FC = () => {
  const f = useCurrentFrame();
  const glow = ease(f, 16, 36, 0, 1);
  return (
    <Stage a="#1a1430" b="#0f0b1c">
      <Pop at={10} style={{ position: "absolute", left: 720, top: 440 }}>
        <div style={{ transform: "translate(-50%,-50%)", fontSize: 130, filter: `drop-shadow(0 0 ${glow * 30}px ${hexA(T.violet, 0.9)})` }}>🕯️</div>
      </Pop>
      <div style={{ position: "absolute", left: 720, top: 620, transform: "translate(-50%,-50%)", color: T.violet, fontSize: 26, fontWeight: 700 }}>the seal ✔ complete &amp; untouched</div>
      <Robot x={1300} y={520} color={T.red} face=">_<" look={-1} />
      <Bubble x={1300} y={380} at={40} color={T.red} tail="down">let me sneak a page in… ✋</Bubble>
      {f > 60 && <Pop at={62} style={{ position: "absolute", left: 1300, top: 520 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 90 }}>❌</div></Pop>}
      <Caption at={62} accent={T.ink}>a <b>magic seal</b> proves the history is whole — tamper with it and the seal breaks</Caption>
    </Stage>
  );
};

// 4 — quantum-proof: others melt, this holds
const Quantum: React.FC = () => {
  const f = useCurrentFrame();
  const melt = ease(f, 24, 54, 0, 1);
  return (
    <Stage a="#1a1430" b="#0f0b1c">
      <Robot x={960} y={220} color={T.red} scale={1.1} face=">_<" />
      <div style={{ position: "absolute", left: 960, top: 110, transform: "translate(-50%,-50%)", fontSize: 40 }}>⚛️</div>
      {/* others: melting seals */}
      <div style={{ position: "absolute", left: 560, top: 470, transform: "translate(-50%,-50%)", textAlign: "center", opacity: 1 - melt * 0.85 }}>
        <div style={{ fontSize: 90, transform: `translateY(${melt * 60}px) scaleY(${1 - melt * 0.6})` }}>🔏</div>
        <div style={{ color: T.dim, fontSize: 22 }}>everyone else&apos;s seal (BN254)</div>
      </div>
      {/* ours: holds */}
      <div style={{ position: "absolute", left: 1360, top: 470, transform: "translate(-50%,-50%)", textAlign: "center" }}>
        <div style={{ fontSize: 96, filter: `drop-shadow(0 0 20px ${hexA(T.violet, 0.9)})` }}>🕯️</div>
        <div style={{ color: T.violet, fontSize: 22, fontWeight: 700 }}>ours — hash-based</div>
      </div>
      {f > 56 && <Pop at={58} style={{ position: "absolute", left: 1360, top: 400 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 44 }}>✅</div></Pop>}
      <Caption at={56} accent={T.violet}>a future quantum computer <b>melts</b> every other seal — this one <b>holds</b></Caption>
    </Stage>
  );
};

// 5 — gate on-chain
const Gate: React.FC = () => {
  const f = useCurrentFrame();
  const open = ease(f, 24, 60, 0, 1);
  return (
    <Stage a="#141a12" b="#0b0f0a">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Pop><div style={{ fontSize: 84 }}>🤖📚🕯️➡️🔓</div></Pop>
        <div style={{ marginTop: 16, color: T.ink, fontSize: 50, fontWeight: 900, textAlign: "center", opacity: ease(f, 12, 24, 0, 1) }}>compliance that outlives the quantum computer</div>
        <div style={{ marginTop: 14, color: T.violet, fontSize: 27, fontWeight: 700, opacity: ease(f, 26, 38, 0, 1) }}>the door only opens if the seal checks out — on-chain, on Stellar</div>
        <div style={{ marginTop: 24, color: T.dim, fontSize: 25, fontFamily: "monospace", opacity: ease(f, 40, 52, 0, 1) }}>github.com/Galmanus/spp-compliance-layer</div>
      </AbsoluteFill>
    </Stage>
  );
};

export const SPP: React.FC = () => {
  const S = [120, 114, 132, 126, 120];
  const XF = 12;
  let t = 0;
  const at = (l: number) => { const s = t; t += l - XF; return s; };
  const scenes = [<Forget />, <Keep />, <Seal />, <Quantum />, <Gate />];
  return (
    <AbsoluteFill>
      {scenes.map((sc, i) => (
        <Sequence key={i} from={at(S[i])} durationInFrames={S[i]}><Fade dur={S[i]} xf={XF}>{sc}</Fade></Sequence>
      ))}
    </AbsoluteFill>
  );
};
export const SPP_LEN = 120 + 114 + 132 + 126 + 120 - 12 * 4;
