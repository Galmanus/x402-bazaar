import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { C, MONO, Screen, In, Cursor, typed, hexA, Fade } from "./cinematic";

const ACC = C.green;

// 1 — cold open: an agent hits a paywall
const Open: React.FC = () => {
  const f = useCurrentFrame();
  const cmd = "$ agent GET https://api/weather";
  const t = typed(cmd, f, 6, 1.8);
  const done = t.length >= cmd.length;
  return (
    <Screen tint="#0b1410" sweep={C.green}>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 180, fontFamily: MONO }}>
        <div style={{ fontSize: 34, color: C.ink }}><span style={{ color: C.green }}>{t}</span>{!done && <Cursor />}</div>
        {done && (
          <div style={{ marginTop: 28, fontSize: 26, lineHeight: 1.8 }}>
            <In start={38}><span style={{ color: C.amber }}>← 402 Payment Required</span> <span style={{ color: C.dim }}>· 0.05 USDC</span></In>
            <In start={54}><span style={{ color: C.dim }}>no account · no API key · sign one auth entry, retry</span></In>
            <In start={70}><span style={{ color: C.dim }}>the buyer holds </span><span style={{ color: C.green }}>USDC only — zero XLM</span></In>
          </div>
        )}
      </AbsoluteFill>
    </Screen>
  );
};

// 2 — the flow, as a live pipeline
const Flow: React.FC = () => {
  const f = useCurrentFrame();
  const steps: [string, string, number][] = [
    ["/verify", "decode · validate auth entries · simulate", 10],
    ["/settle", "facilitator submits · sponsors the fee", 34],
    ["settled", "payer → recipient · non-custodial", 58],
    ["cataloged", "the stall writes itself into the Bazaar", 82],
  ];
  return (
    <Screen tint="#0b1410" sweep={C.green}>
      <AbsoluteFill style={{ padding: "80px 180px", fontFamily: MONO }}>
        <In><div style={{ color: C.green, fontSize: 24, letterSpacing: 2, marginBottom: 8 }}>▶ ON THE FACILITATOR</div></In>
        <In start={4}><div style={{ color: C.dim, fontSize: 20, marginBottom: 34 }}>built on @x402/stellar — verify &amp; settle NOT reimplemented</div></In>
        {steps.map(([k, v, s], i) => {
          const op = interpolate(f, [s, s + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const on = f > s + 6;
          return (
            <div key={i} style={{ opacity: op, display: "flex", alignItems: "baseline", gap: 24, marginBottom: 18 }}>
              <span style={{ color: C.green, fontSize: 20 }}>{on ? "●" : "○"}</span>
              <span style={{ color: C.ink, fontSize: 30, width: 220 }}>{k}</span>
              <span style={{ color: C.dim, fontSize: 22 }}>{v}</span>
            </div>
          );
        })}
      </AbsoluteFill>
    </Screen>
  );
};

// 3 — the mainnet proof (the "money shot")
const Mainnet: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [30, 36, 50], [0, 0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = interpolate(f, [14, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Screen tint="#0b1410">
      <AbsoluteFill style={{ background: `rgba(63,185,80,${flash})` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: MONO }}>
        <In><div style={{ color: C.green, fontSize: 26, letterSpacing: 3, fontWeight: 800 }}>⛓ LIVE ON STELLAR MAINNET</div></In>
        <In start={14}>
          <div style={{ marginTop: 26, padding: "30px 44px", borderRadius: 16, background: "#0c110e", border: `1.5px solid ${C.green}`, boxShadow: `0 0 ${glow * 55}px ${hexA(C.green, 0.3 * glow)}` }}>
            <div style={{ color: C.dim, fontSize: 18, marginBottom: 12 }}>real USDC settlement · stellar:pubnet</div>
            <div style={{ color: C.ink, fontSize: 30 }}>07ecff0b<span style={{ color: C.faint }}>17403d4500e230f7f3d23cea347a495f</span></div>
            <div style={{ display: "flex", gap: 44, marginTop: 20 }}>
              {[["ledger", "63 918 501"], ["fee paid by", "facilitator"], ["payer spent", "USDC only"]].map(([k, v]) => (
                <div key={k}><div style={{ color: C.faint, fontSize: 15 }}>{k}</div><div style={{ color: C.green, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{v}</div></div>
              ))}
            </div>
          </div>
        </In>
        <In start={34}><div style={{ marginTop: 24, color: C.dim, fontSize: 22 }}>testnet <b style={{ color: C.ink }}>and</b> mainnet — both committed deliverables, live &amp; checkable</div></In>
      </AbsoluteFill>
    </Screen>
  );
};

// 4 — natural-language search
const Search: React.FC = () => {
  const f = useCurrentFrame();
  const q = "what's the weather in my city";
  const t = typed(q, f, 8, 1.3);
  return (
    <Screen tint="#0b1014" sweep={C.blue}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: MONO }}>
        <In><div style={{ color: C.dim, fontSize: 22, marginBottom: 16 }}>GET /discovery/search — natural language, ranked</div></In>
        <In start={4}>
          <div style={{ width: 900, padding: "18px 24px", borderRadius: 12, background: "#0c1016", border: `1.5px solid ${C.blue}`, color: C.ink, fontSize: 26 }}>
            <span style={{ color: C.blue }}>?</span> {t}<Cursor color={C.blue} />
          </div>
        </In>
        <In start={54}>
          <div style={{ width: 900, marginTop: 20, padding: "20px 24px", borderRadius: 12, background: "#0c1016", border: `1.5px solid #1b2027` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ color: C.ink, fontSize: 26, fontWeight: 700 }}>BazaarWeather</span>
              <span style={{ color: C.green, fontSize: 20 }}>nDCG@10 0.833</span>
            </div>
            <div style={{ color: C.dim, fontSize: 19, marginTop: 6 }}>current weather &amp; temperature · 0.01 USDC</div>
            <div style={{ color: C.faint, fontSize: 16, marginTop: 10 }}>provenance · distinct payers · distinct credential holders — sybil-resistant</div>
          </div>
        </In>
        <In start={78}><div style={{ marginTop: 20, color: C.dim, fontSize: 20 }}>hybrid BM25 + local embedding · measured, not asserted</div></In>
      </AbsoluteFill>
    </Screen>
  );
};

// 5 — close
const Close: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Screen tint="#0b1410">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: MONO }}>
        <div style={{ opacity: interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" }), color: C.ink, fontSize: 60, fontWeight: 800 }}>the first Bazaar for Stellar</div>
        <In start={16}><div style={{ color: C.dim, fontSize: 23, marginTop: 22 }}>6 settlements on-chain · Bazaar · upto scheme · Apache-2.0, no AGPL</div></In>
        <In start={32}><div style={{ color: C.green, fontSize: 26, marginTop: 28 }}>github.com/Galmanus/x402-bazaar</div></In>
      </AbsoluteFill>
    </Screen>
  );
};

export const Main: React.FC = () => {
  const S = [96, 126, 138, 126, 108];
  const XF = 10;
  let t = 0;
  const at = (l: number) => { const s = t; t += l - XF; return s; };
  return (
    <AbsoluteFill>
      <Sequence from={at(S[0])} durationInFrames={S[0]}><Fade dur={S[0]} xf={XF}><Open /></Fade></Sequence>
      <Sequence from={at(S[1])} durationInFrames={S[1]}><Fade dur={S[1]} xf={XF}><Flow /></Fade></Sequence>
      <Sequence from={at(S[2])} durationInFrames={S[2]}><Fade dur={S[2]} xf={XF}><Mainnet /></Fade></Sequence>
      <Sequence from={at(S[3])} durationInFrames={S[3]}><Fade dur={S[3]} xf={XF}><Search /></Fade></Sequence>
      <Sequence from={at(S[4])} durationInFrames={S[4]}><Fade dur={S[4]} xf={XF}><Close /></Fade></Sequence>
    </AbsoluteFill>
  );
};
export const MAIN_LEN = 96 + 126 + 138 + 126 + 108 - 10 * 4;
