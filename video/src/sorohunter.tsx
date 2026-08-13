import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Stage, Robot, Coin, Bubble, Vault, Caption, Fly, Pop, Fade, Burst, T, hexA } from "./toon";

const ease = (f: number, a: number, b: number, x: number, y: number) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const CoinPile: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", display: "flex", gap: -6 }}>
    {[0, 1, 2].map((i) => <div key={i} style={{ marginLeft: -8 }}><Coin size={40} /></div>)}
  </div>
);

// 1 — a safe full of money, a worried owner
const Safe: React.FC = () => (
  <Stage a="#1a1113" b="#0e0a0b">
    <Vault x={980} y={420} scale={1.35} color={T.teal} />
    <CoinPile x={980} y={250} />
    <Robot x={430} y={560} color={T.blue} face="o_o" look={1} />
    <Bubble x={470} y={420} at={12} color={T.white} tail="left">is my safe actually safe?</Bubble>
    <Caption at={6} accent={T.ink}>a smart contract is a <b>safe full of money</b> on the internet</Caption>
  </Stage>
);

// 2 — hire the hunter; it clones the safe
const Clone: React.FC = () => {
  const f = useCurrentFrame();
  const grow = ease(f, 22, 48, 0.2, 1.0);
  return (
    <Stage a="#1a1113" b="#0e0a0b">
      <Robot x={430} y={540} color={T.red} face="^_^" look={1} />
      <Bubble x={480} y={400} at={8} color={T.red} tail="left">i&apos;ll test it — on a copy</Bubble>
      <Vault x={720} y={430} scale={0.95} color={T.teal} />
      <div style={{ position: "absolute", left: 720, top: 300, transform: "translate(-50%,-50%)", color: T.dim, fontSize: 20 }}>the REAL one — untouched</div>
      {f > 20 && <Vault x={1330} y={430} scale={grow} color={T.amber} />}
      {f > 46 && <div style={{ position: "absolute", left: 1330, top: 300, transform: "translate(-50%,-50%)", color: T.amber, fontSize: 20 }}>a perfect COPY</div>}
      {f > 24 && <Fly from={[820, 430]} to={[1330, 430]} at={24} dur={22} arc={70}><div style={{ fontSize: 34 }}>📋</div></Fly>}
      <Caption at={48} accent={T.amber}>sorohunter copies your safe — and <b>never touches the real one</b></Caption>
    </Stage>
  );
};

// 3 — it tries to break in; one move works
const Break: React.FC = () => {
  const f = useCurrentFrame();
  const moves = ["try owner key…  ✗", "try again…  ✗", "pull lever, THEN push  ✓"];
  const open = ease(f, 62, 92, 0, 1);
  const cracked = f > 76;
  return (
    <Stage a="#1a1113" b="#0e0a0b">
      <Vault x={1320} y={430} scale={1.3} color={cracked ? T.red : T.amber} open={open} />
      {cracked && <CoinPile x={1320} y={260} />}
      <Robot x={480} y={560} color={T.red} look={1} />
      <div style={{ position: "absolute", left: 700, top: 320, fontFamily: "monospace", fontSize: 32 }}>
        {moves.map((m, i) => (
          <div key={i} style={{ opacity: ease(f, 10 + i * 18, 18 + i * 18, 0, 1), color: i === 2 ? T.green : T.dim, marginBottom: 18 }}>{m}</div>
        ))}
      </div>
      {cracked && <><div style={{ position: "absolute", left: 1320, top: 250 }}><Burst at={76} color={T.red} /></div>
        <Pop at={78} style={{ position: "absolute", left: 1320, top: 250 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 58 }}>🚨</div></Pop></>}
      <Caption at={80} accent={T.red}>it shouts <b>“hole!”</b> only when it actually breaks in — with the exact steps</Caption>
    </Stage>
  );
};

// 4 — it learns across safes
const Learn: React.FC = () => {
  const f = useCurrentFrame();
  const safes = [[560, "vault"], [800, "token"], [1120, "wallet"], [1360, "lending"]] as const;
  return (
    <Stage a="#1a1113" b="#0e0a0b">
      <Robot x={960} y={430} color={T.red} scale={1.1} face="^_^" />
      <Pop at={10} style={{ position: "absolute", left: 960, top: 300 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 52 }}>🧠</div></Pop>
      {safes.map(([x, label], i) => (
        <div key={i} style={{ opacity: ease(f, 18 + i * 12, 28 + i * 12, 0, 1) }}>
          <Vault x={x} y={640} scale={0.5} color={i < 2 ? T.red : T.teal} />
          <div style={{ position: "absolute", left: x, top: 720, transform: "translate(-50%,-50%)", color: T.dim, fontSize: 20 }}>{label}</div>
        </div>
      ))}
      <Caption at={6} accent={T.amber}>crack one, remember the trick — <b>every next safe, it&apos;s sharper</b></Caption>
    </Stage>
  );
};

const End: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage a="#1a1113" b="#0e0a0b">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Robot x={960} y={360} color={T.red} scale={1.3} face="^_^" bob />
        <div style={{ marginTop: 130, color: T.ink, fontSize: 54, fontWeight: 900, opacity: ease(f, 12, 24, 0, 1) }}>proof, or silence</div>
        <div style={{ marginTop: 14, color: T.red, fontSize: 27, fontWeight: 700, textAlign: "center", opacity: ease(f, 26, 38, 0, 1) }}>never a false alarm — a break-in you can replay, or nothing at all</div>
        <div style={{ marginTop: 24, color: T.dim, fontSize: 26, fontFamily: "monospace", opacity: ease(f, 40, 52, 0, 1) }}>github.com/Galmanus/sorohunter</div>
      </AbsoluteFill>
    </Stage>
  );
};

export const Sorohunter: React.FC = () => {
  const S = [114, 120, 132, 120, 120];
  const XF = 12;
  let t = 0;
  const at = (l: number) => { const s = t; t += l - XF; return s; };
  const scenes = [<Safe />, <Clone />, <Break />, <Learn />, <End />];
  return (
    <AbsoluteFill>
      {scenes.map((sc, i) => (
        <Sequence key={i} from={at(S[i])} durationInFrames={S[i]}><Fade dur={S[i]} xf={XF}>{sc}</Fade></Sequence>
      ))}
    </AbsoluteFill>
  );
};
export const SORO_LEN = 114 + 120 + 132 + 120 + 120 - 12 * 4;
