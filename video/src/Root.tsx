import React from "react";
import { AbsoluteFill, Composition, Sequence, useCurrentFrame, interpolate } from "remotion";
import { FPS } from "./theme";
import { Title, Flow, Mainnet, Search, Close } from "./scenes";

// scene lengths (frames @30fps)
const S1 = 78, S2 = 240, S3 = 132, S4 = 132, S5 = 120;
const XF = 12; // crossfade overlap
const TOTAL = S1 + S2 + S3 + S4 + S5;

const Fade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, XF, dur - XF, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

const Main: React.FC = () => {
  let t = 0;
  const at = (len: number) => { const s = t; t += len - XF; return s; };
  return (
    <AbsoluteFill>
      <Sequence from={at(S1)} durationInFrames={S1}><Fade dur={S1}><Title /></Fade></Sequence>
      <Sequence from={at(S2)} durationInFrames={S2}><Fade dur={S2}><Flow /></Fade></Sequence>
      <Sequence from={at(S3)} durationInFrames={S3}><Fade dur={S3}><Mainnet /></Fade></Sequence>
      <Sequence from={at(S4)} durationInFrames={S4}><Fade dur={S4}><Search /></Fade></Sequence>
      <Sequence from={at(S5)} durationInFrames={S5}><Fade dur={S5}><Close /></Fade></Sequence>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="x402bazaar"
    component={Main}
    durationInFrames={TOTAL - XF * 4}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
