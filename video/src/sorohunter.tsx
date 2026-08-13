import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Stage, Robot, Coin, Bubble, Vault, Caption, Fly, Pop, Fade, T, hexA } from "./toon";

const ease = (f: number, a: number, b: number, x: number, y: number) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 1 — a safe full of money, a worried owner
const Safe: React.FC = () => (
  <Stage a="#1a1113" b="#0e0a0b">
    <Vault x={960} y={420} scale={1.3} color={T.teal} />
    <div style={{ position: "absolute", left: 960, top: 250, transform: "translate(-50%,-50%)", fontSize: 40 }}>💰💰💰</div>
    <Robot x={430} y={560} color={T.blue} face="o_o" look={1} />
    <Bubble x={470} y={420} at={12} color={T.white} tail="left">is my safe actually safe? 😰</Bubble>
    <Caption at={6} accent={T.ink}>a smart contract is a <b>safe full of money</b> on the internet</Caption>
  </Stage>
);

// 2 — hire the hunter, it clones the safe
const Clone: React.FC = () => {
  const f = useCurrentFrame();
  const cx = ease(f, 20, 46, 960, 1360);
  return (
    <Stage a="#1a1113" b="#0e0a0b">
      <Robot x={430} y={540} color={T.red} face="^_^" look={1} />
      <Bubble x={470} y={400} at={8} color={T.red} tail="left">i&apos;ll test it — on a copy 🐾</Bubble>
      <Vault x={640} y={430} scale={1.0} color={T.teal} />
      <div style={{ position: "absolute", left: 640, top: 300, transform: "translate(-50%,-50%)", color: T.dim, fontSize: 22 }}>the REAL one — untouched</div>
      {f > 18 && <Vault x={cx} y={430} scale={1.0} color={T.amber} />}
      {f > 46 && <div style={{ position: "absolute", left: 1360, top: 300, transform: "translate(-50%,-50%)", color: T.amber, fontSize: 22 }}>a perfect COPY</div>}
      <Caption at={48} accent={T.amber}>sorohunter copies your safe — and <b>never touches the real one</b></Caption>
    </Stage>
  );
};

// 3 — it tries to break in; one move works
const Break: React.FC = () => {
  const f = useCurrentFrame();
  const moves = ["try owner key… ❌", "try again… ❌", "pull lever, THEN push 🔓", ""];
  const open = ease(f, 60, 90, 0, 1);
  const cracked = f > 74;
  return (
    <Stage a="#1a1113" b="#0e0a0b">
      <Vault x={1300} y={420} scale={1.25} color={cracked ? T.red : T.amber} open={open} />
      <Robot x={520} y={560} color={T.red} look={1} />
      <div style={{ position: "absolute", left: 760, top: 300, fontFamily: "monospace", fontSize: 30, color: T.ink }}>
        {moves.map((m, i) => (
          <div key={i} style={{ opacity: ease(f, 10 + i * 16, 18 + i * 16, 0, 1), color: i === 2 ? T.green : T.dim, marginBottom: 14 }}>{m}</div>
        ))}
      </div>
      {cracked && <Pop at={76} style={{ position: "absolute", left: 1300, top: 250 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 60 }}>🚨</div></Pop>}
      <Caption at={78} accent={T.red}>it only shouts <b>“hole!”</b> when it actually breaks in — and shows the exact steps</Caption>
    </Stage>
  );
};

// 4 — it learns
const Learn: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage a="#1a1113" b="#0e0a0b">
      <Robot x={960} y={470} color={T.red} scale={1.15} face="^_^" />
      <Pop at={10} style={{ position: "absolute", left: 960, top: 330 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 56 }}>🧠</div></Pop>
      {[[540, "vault"], [740, "token"], [1180, "wallet"], [1380, "lending"]].map(([x, label], i) => (
        <div key={i} style={{ position: "absolute", left: x as number, top: 640, transform: "translate(-50%,-50%)", textAlign: "center", opacity: ease(f, 20 + i * 12, 30 + i * 12, 0, 1) }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <div style={{ color: T.dim, fontSize: 20 }}>{label as string}</div>
        </div>
      ))}
      <Caption at={6} accent={T.amber}>crack one safe, remember the trick — <b>every next safe, it&apos;s sharper</b></Caption>
    </Stage>
  );
};

const End: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage a="#1a1113" b="#0e0a0b">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Pop><div style={{ fontSize: 84 }}>🤖🐾🔓🚨</div></Pop>
        <div style={{ marginTop: 16, color: T.ink, fontSize: 54, fontWeight: 900, opacity: ease(f, 12, 24, 0, 1) }}>proof, or silence</div>
        <div style={{ marginTop: 14, color: T.red, fontSize: 28, fontWeight: 700, textAlign: "center", opacity: ease(f, 26, 38, 0, 1) }}>never a false alarm — a break-in you can replay, or nothing at all</div>
        <div style={{ marginTop: 24, color: T.dim, fontSize: 26, fontFamily: "monospace", opacity: ease(f, 40, 52, 0, 1) }}>github.com/Galmanus/sorohunter</div>
      </AbsoluteFill>
    </Stage>
  );
};

export const Sorohunter: React.FC = () => {
  const S = [108, 120, 132, 114, 114];
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
export const SORO_LEN = 108 + 120 + 132 + 114 + 114 - 12 * 4;
