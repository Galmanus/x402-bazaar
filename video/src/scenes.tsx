import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Stage, Robot, Coin, Bubble, Stall, Caption, Fly, Pop, Fade, T, hexA } from "./toon";

const ease = (f: number, a: number, b: number, x: number, y: number) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 1 — a market of robot shops
const Market: React.FC = () => {
  const f = useCurrentFrame();
  const bx = ease(f, 10, 60, -160, 470);
  return (
    <Stage>
      <Stall x={760} y={360} color={T.blue} sign="☀️" />
      <Stall x={1000} y={360} color={T.violet} sign="💱" />
      <Stall x={1240} y={360} color={T.green} sign="🗺️" />
      <Robot x={bx} y={560} color={T.gold} face="^_^" look={1} hold={<Coin label="$" />} />
      <Bubble x={bx} y={430} at={54} color={T.white} tail="down">i want the weather ☀️</Bubble>
      <Caption at={8} accent={T.ink}>the internet is becoming a market where <b>robots</b> shop</Caption>
    </Stage>
  );
};

// 2 — pay, and the cashier covers the fee
const Pay: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <Stall x={520} y={330} color={T.blue} sign="☀️" scale={1.1} />
      <Robot x={1050} y={540} color={T.gold} hold={<Coin label="$" />} look={-1} />
      <Robot x={720} y={560} color={T.teal} face="^_^" look={1} z={2} />
      <Bubble x={720} y={430} at={6} color={T.teal} tail="down">i&apos;m the cashier 🤝</Bubble>
      <Fly from={[1010, 540]} to={[760, 560]} at={30} dur={26}><Coin label="$" /></Fly>
      {f > 60 && <Pop at={62} style={{ position: "absolute", left: 760, top: 470 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 44 }}>✅</div></Pop>}
      {/* the tiny toll the cashier pays itself */}
      <Fly from={[720, 610]} to={[720, 760]} at={70} dur={22} arc={40}><div style={{ fontSize: 30 }}>🪙 fee</div></Fly>
      <Caption at={72} accent={T.green}>you pay a coin — the cashier pays the network fee <b>for you</b></Caption>
    </Stage>
  );
};

// 3 — the map writes itself
const MapGrows: React.FC = () => {
  const f = useCurrentFrame();
  const lit = [f > 20, f > 44, f > 68];
  const count = lit.filter(Boolean).length;
  return (
    <Stage>
      <div style={{ position: "absolute", top: 90, width: "100%", textAlign: "center", color: T.dim, fontSize: 30, fontWeight: 700 }}>the Bazaar map</div>
      <Stall x={640} y={360} color={T.blue} sign="☀️" on={lit[0]} />
      <Stall x={960} y={360} color={T.violet} sign="💱" on={lit[1]} />
      <Stall x={1280} y={360} color={T.green} sign="🗺️" on={lit[2]} />
      {lit.map((on, i) => on && <Pop key={i} at={20 + i * 24} style={{ position: "absolute", left: 640 + i * 320, top: 250 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 40 }}>✨</div></Pop>)}
      <div style={{ position: "absolute", left: "50%", top: 560, transform: "translateX(-50%)", color: T.gold, fontSize: 34, fontWeight: 800 }}>shops on the map: {count}</div>
      <Caption at={6} accent={T.ink}>every time a robot buys, that shop lights up on the map — <b>by itself</b></Caption>
    </Stage>
  );
};

// 4 — another robot just asks
const Find: React.FC = () => {
  const f = useCurrentFrame();
  const beam = f > 40;
  return (
    <Stage>
      <Robot x={330} y={540} color={T.pink} face="?" look={1} />
      <Bubble x={430} y={410} at={8} color={T.white} tail="left">who sells weather? 🤔</Bubble>
      <Stall x={760} y={360} color={T.blue} sign="☀️" on={beam} />
      <Stall x={1010} y={360} color={T.violet} sign="💱" on={false} />
      <Stall x={1260} y={360} color={T.green} sign="🗺️" on={false} />
      {beam && <Pop at={42} style={{ position: "absolute", left: 760, top: 250 }}><div style={{ transform: "translate(-50%,-50%)", fontSize: 46 }}>👉☀️</div></Pop>}
      <Caption at={44} accent={T.blue}>ask in plain words — the Bazaar points you to the right shop</Caption>
    </Stage>
  );
};

// 5 — impact / real
const Real: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage a="#12261c" b="#0b1712">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Pop><div style={{ fontSize: 90 }}>🤖🪙➡️🏪</div></Pop>
        <div style={{ marginTop: 16, color: T.ink, fontSize: 58, fontWeight: 900, opacity: ease(f, 12, 24, 0, 1) }}>the first Bazaar for Stellar</div>
        <div style={{ marginTop: 14, color: T.green, fontSize: 30, fontWeight: 700, opacity: ease(f, 26, 38, 0, 1) }}>and it&apos;s live on <b>mainnet</b> — real money, real robots</div>
        <div style={{ marginTop: 26, color: T.dim, fontSize: 26, fontFamily: "monospace", opacity: ease(f, 40, 52, 0, 1) }}>github.com/Galmanus/x402-bazaar</div>
      </AbsoluteFill>
    </Stage>
  );
};

export const Main: React.FC = () => {
  const S = [120, 132, 114, 108, 114];
  const XF = 12;
  let t = 0;
  const at = (l: number) => { const s = t; t += l - XF; return s; };
  return (
    <AbsoluteFill>
      <Sequence from={at(S[0])} durationInFrames={S[0]}><Fade dur={S[0]} xf={XF}><Market /></Fade></Sequence>
      <Sequence from={at(S[1])} durationInFrames={S[1]}><Fade dur={S[1]} xf={XF}><Pay /></Fade></Sequence>
      <Sequence from={at(S[2])} durationInFrames={S[2]}><Fade dur={S[2]} xf={XF}><MapGrows /></Fade></Sequence>
      <Sequence from={at(S[3])} durationInFrames={S[3]}><Fade dur={S[3]} xf={XF}><Find /></Fade></Sequence>
      <Sequence from={at(S[4])} durationInFrames={S[4]}><Fade dur={S[4]} xf={XF}><Real /></Fade></Sequence>
    </AbsoluteFill>
  );
};
export const MAIN_LEN = 120 + 132 + 114 + 108 + 114 - 12 * 4;
