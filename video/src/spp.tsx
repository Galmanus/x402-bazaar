import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Stage, Robot, Bubble, Caption, Pop, Fade, Seal, Pages, Burst, T, hexA } from "./toon";

const ease = (f: number, a: number, b: number, x: number, y: number) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 1 — the library forgets after ~7 days
const Forget: React.FC = () => {
  const f = useCurrentFrame();
  const books = ["📕", "📗", "📘", "📙", "📕", "📗", "📘"];
  return (
    <Stage a="#1a1430" b="#0f0b1c">
      <div style={{ position: "absolute", left: 960, top: 190, transform: "translate(-50%,-50%)", fontSize: 40, color: T.amber, fontWeight: 800 }}>⏳ 7 days…</div>
      <div style={{ position: "absolute", left: "50%", top: 400, transform: "translateX(-50%)", display: "flex", gap: 24 }}>
        {books.map((b, i) => {
          const gone = ease(f, 30 + i * 8, 44 + i * 8, 1, i < 5 ? 0 : 1);
          return <div key={i} style={{ fontSize: 72, opacity: gone, transform: `translateY(${(1 - gone) * -50}px) rotate(${(1 - gone) * 30}deg)` }}>{b}</div>;
        })}
      </div>
      <Robot x={430} y={620} color={T.blue} face="o_o" look={1} />
      <Bubble x={480} y={470} at={60} color={T.white} tail="left">wait, where did the history go?</Bubble>
      <Caption at={6} accent={T.ink}>the network <b>forgets</b> its private-payment history after about a week</Caption>
    </Stage>
  );
};

// 2 — the librarian keeps it all, complete
const Keep: React.FC = () => (
  <Stage a="#1a1430" b="#0f0b1c">
    <Robot x={470} y={520} color={T.violet} face="^_^" look={1} z={2} />
    <Bubble x={530} y={380} at={8} color={T.violet} tail="left">i keep every page 📚</Bubble>
    <div style={{ position: "absolute", left: 940, top: 340 }}><Pages n={15} at={14} color={T.violet} /></div>
    <Caption at={6} accent={T.violet}>a librarian robot keeps the <b>whole history</b> — and proves none is missing</Caption>
  </Stage>
);

// 3 — magic seal (STARK), tamper caught
const SealScene: React.FC = () => {
  const f = useCurrentFrame();
  const glow = ease(f, 16, 36, 0, 1);
  const broken = ease(f, 60, 72, 0, 1);
  return (
    <Stage a="#1a1430" b="#0f0b1c">
      <div style={{ position: "absolute", left: 700, top: 440, transform: "translate(-50%,-50%)" }}><Seal size={180} color={T.violet} glow={glow} broken={f > 60 ? broken : 0} /></div>
      <div style={{ position: "absolute", left: 700, top: 600, transform: "translate(-50%,-50%)", color: T.violet, fontSize: 26, fontWeight: 700 }}>the seal ✔ complete &amp; untouched</div>
      <Robot x={1300} y={520} color={T.red} face=">_<" look={-1} />
      <Bubble x={1300} y={380} at={40} color={T.red} tail="down">let me sneak a page in…</Bubble>
      {f > 62 && <><div style={{ position: "absolute", left: 700, top: 440 }}><Burst at={62} color={T.red} /></div>
        <Pop at={64} style={{ position: "absolute", left: 1300, top: 520 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 84 }}>❌</div></Pop></>}
      <Caption at={62} accent={T.ink}>a <b>magic seal</b> proves it&apos;s whole — tamper with it and the seal breaks</Caption>
    </Stage>
  );
};

// 4 — quantum-proof: others melt, this holds
const Quantum: React.FC = () => {
  const f = useCurrentFrame();
  const melt = ease(f, 24, 54, 0, 1);
  return (
    <Stage a="#1a1430" b="#0f0b1c">
      <Robot x={960} y={210} color={T.red} scale={1.05} face=">_<" />
      <Pop at={2} style={{ position: "absolute", left: 960, top: 110 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 40 }}>⚛️</div></Pop>
      {/* others: melting seal */}
      <div style={{ position: "absolute", left: 560, top: 470, transform: `translate(-50%,-50%) translateY(${melt * 50}px) scaleY(${1 - melt * 0.55})`, opacity: 1 - melt * 0.7 }}><Seal size={130} color={T.faint} glow={0} /></div>
      <div style={{ position: "absolute", left: 560, top: 610, transform: "translate(-50%,-50%)", color: T.dim, fontSize: 22 }}>everyone else&apos;s seal (BN254)</div>
      {/* ours: holds */}
      <div style={{ position: "absolute", left: 1360, top: 470, transform: "translate(-50%,-50%)" }}><Seal size={150} color={T.violet} glow={1} /></div>
      <div style={{ position: "absolute", left: 1360, top: 620, transform: "translate(-50%,-50%)", color: T.violet, fontSize: 22, fontWeight: 700 }}>ours — hash-based</div>
      {f > 56 && <Pop at={58} style={{ position: "absolute", left: 1360, top: 380 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 44 }}>✅</div></Pop>}
      <Caption at={56} accent={T.violet}>a future quantum computer <b>melts</b> every other seal — this one <b>holds</b></Caption>
    </Stage>
  );
};

const Gate: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage a="#141a12" b="#0b0f0a">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative" }}><Seal size={150} color={T.violet} /></div>
        <div style={{ marginTop: 30, color: T.ink, fontSize: 48, fontWeight: 900, textAlign: "center", opacity: ease(f, 12, 24, 0, 1) }}>compliance that outlives the quantum computer</div>
        <div style={{ marginTop: 14, color: T.violet, fontSize: 27, fontWeight: 700, opacity: ease(f, 26, 38, 0, 1) }}>the door opens only if the seal checks out — on-chain, on Stellar</div>
        <div style={{ marginTop: 24, color: T.dim, fontSize: 25, fontFamily: "monospace", opacity: ease(f, 40, 52, 0, 1) }}>github.com/Galmanus/spp-compliance-layer</div>
      </AbsoluteFill>
    </Stage>
  );
};

export const SPP: React.FC = () => {
  const S = [120, 114, 126, 126, 120];
  const XF = 12;
  let t = 0;
  const at = (l: number) => { const s = t; t += l - XF; return s; };
  const scenes = [<Forget />, <Keep />, <SealScene />, <Quantum />, <Gate />];
  return (
    <AbsoluteFill>
      {scenes.map((sc, i) => (
        <Sequence key={i} from={at(S[i])} durationInFrames={S[i]}><Fade dur={S[i]} xf={XF}>{sc}</Fade></Sequence>
      ))}
    </AbsoluteFill>
  );
};
export const SPP_LEN = 120 + 114 + 126 + 126 + 120 - 12 * 4;
