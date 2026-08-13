import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Stage, Robot, Coin, Bubble, Vault, Caption, Fly, Pop, Fade, T, hexA } from "./toon";

const ease = (f: number, a: number, b: number, x: number, y: number) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 1 — a premium door with a guard
const Door: React.FC = () => (
  <Stage a="#1c1630" b="#100b1e">
    <Vault x={1360} y={430} scale={1.0} color={T.violet} />
    <div style={{ position: "absolute", left: 1360, top: 300, transform: "translate(-50%,-50%)", fontSize: 44 }}>💎</div>
    <Robot x={560} y={560} color={T.gold} face="^_^" look={1} hold={<Coin label="$" />} />
    <Robot x={1050} y={560} color={T.teal} look={-1} z={2} />
    <Bubble x={1050} y={430} at={10} color={T.teal} tail="down">are you allowed to buy this? 🛡️</Bubble>
    <Caption at={6} accent={T.ink}>some things, you must be <b>allowed</b> to buy</Caption>
  </Stage>
);

// 2 — mask + glowing badge: proves membership, hides identity
const Prove: React.FC = () => {
  const f = useCurrentFrame();
  const glow = ease(f, 20, 40, 0, 1);
  return (
    <Stage a="#1c1630" b="#100b1e">
      <Robot x={640} y={540} color={T.gold} look={1} />
      <Pop at={12} style={{ position: "absolute", left: 640, top: 470 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 56 }}>🎭</div></Pop>
      <Pop at={22} style={{ position: "absolute", left: 820, top: 470 }}>
        <div style={{ transform: "translate(-50%,-50%)", fontSize: 70, filter: `drop-shadow(0 0 ${glow * 26}px ${hexA(T.violet, 0.9)})` }}>🏅</div>
      </Pop>
      <Robot x={1180} y={560} color={T.teal} look={-1} />
      <Bubble x={1180} y={420} at={40} color={T.teal} tail="down">member? ✅  who? …no idea 🤷</Bubble>
      <Caption at={44} accent={T.violet}>prove you belong to the club — <b>without showing who you are</b></Caption>
    </Stage>
  );
};

// 3 — the guard is a contract; vault opens
const Open: React.FC = () => {
  const f = useCurrentFrame();
  const open = ease(f, 24, 60, 0, 1);
  return (
    <Stage a="#1c1630" b="#100b1e">
      <Vault x={1150} y={430} scale={1.15} color={T.violet} open={open} />
      <Fly from={[560, 560]} to={[1150, 470]} at={30} dur={30}><Coin label="$" /></Fly>
      <Robot x={560} y={560} color={T.gold} look={1} />
      {f > 62 && <Pop at={64} style={{ position: "absolute", left: 1150, top: 300 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 50 }}>🔓✅</div></Pop>}
      <Caption at={6} accent={T.ink}>the guard is a <b>contract on Stellar</b> — not a nosy website keeping your name</Caption>
    </Stage>
  );
};

// 4 — two visits can't be linked
const Unlink: React.FC = () => {
  const f = useCurrentFrame();
  const cut = ease(f, 34, 50, 0, 1);
  return (
    <Stage a="#1c1630" b="#100b1e">
      <Robot x={560} y={520} color={T.gold} scale={0.9} />
      <div style={{ position: "absolute", left: 560, top: 430, transform: "translate(-50%,-50%)", fontSize: 40 }}>🎭</div>
      <div style={{ position: "absolute", left: 560, top: 640, color: T.dim, fontSize: 24, transform: "translateX(-50%)" }}>monday</div>
      <Robot x={1360} y={520} color={T.gold} scale={0.9} />
      <div style={{ position: "absolute", left: 1360, top: 430, transform: "translate(-50%,-50%)", fontSize: 40 }}>🎭</div>
      <div style={{ position: "absolute", left: 1360, top: 640, color: T.dim, fontSize: 24, transform: "translateX(-50%)" }}>tuesday</div>
      {/* the link, cut */}
      <div style={{ position: "absolute", left: 700, top: 520, width: 520, height: 6, background: hexA(T.faint, 1 - cut), borderRadius: 4 }} />
      <Pop at={36} style={{ position: "absolute", left: 960, top: 490 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 54, opacity: cut }}>✂️</div></Pop>
      <Caption at={52} accent={T.green}>come back tomorrow — <b>nobody can link your two visits</b></Caption>
    </Stage>
  );
};

// 5 — quantum-proof
const Quantum: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage a="#1c1630" b="#100b1e">
      <Robot x={520} y={520} color={T.red} scale={1.25} face=">_<" look={1} />
      <Bubble x={560} y={380} at={8} color={T.red} tail="left">i&apos;ll fake the badge! ⚛️</Bubble>
      <Pop at={20} style={{ position: "absolute", left: 1150, top: 460 }}>
        <div style={{ transform: "translate(-50%,-50%)", fontSize: 90, filter: `drop-shadow(0 0 22px ${hexA(T.violet, 0.9)})` }}>🏅</div>
      </Pop>
      {f > 46 && <Pop at={48} style={{ position: "absolute", left: 1150, top: 460 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 100 }}>❌</div></Pop>}
      <Caption at={50} accent={T.violet}>even a <b>future quantum computer</b> can&apos;t fake the badge — it&apos;s hash-based</Caption>
    </Stage>
  );
};

const End: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage a="#1c1630" b="#100b1e">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Pop><div style={{ fontSize: 88 }}>🤖🎭🏅➡️🔓</div></Pop>
        <div style={{ marginTop: 16, color: T.ink, fontSize: 52, fontWeight: 900, textAlign: "center", opacity: ease(f, 12, 24, 0, 1) }}>pay · prove you may · stay anonymous</div>
        <div style={{ marginTop: 14, color: T.violet, fontSize: 28, fontWeight: 700, opacity: ease(f, 26, 38, 0, 1) }}>post-quantum credentials for agent payments on Stellar</div>
        <div style={{ marginTop: 24, color: T.dim, fontSize: 26, fontFamily: "monospace", opacity: ease(f, 40, 52, 0, 1) }}>github.com/Galmanus/pq402</div>
      </AbsoluteFill>
    </Stage>
  );
};

export const PQ402: React.FC = () => {
  const S = [108, 120, 114, 120, 120, 114];
  const XF = 12;
  let t = 0;
  const at = (l: number) => { const s = t; t += l - XF; return s; };
  const scenes = [<Door />, <Prove />, <Open />, <Unlink />, <Quantum />, <End />];
  return (
    <AbsoluteFill>
      {scenes.map((sc, i) => (
        <Sequence key={i} from={at(S[i])} durationInFrames={S[i]}><Fade dur={S[i]} xf={XF}>{sc}</Fade></Sequence>
      ))}
    </AbsoluteFill>
  );
};
export const PQ402_LEN = 108 + 120 + 114 + 120 + 120 + 114 - 12 * 5;
