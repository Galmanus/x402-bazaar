import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT, SANS } from "./theme";
import { Appear, Node, Packet, Wire } from "./ui";

const Bg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: COLORS.bg, fontFamily: SANS }}>
    <AbsoluteFill style={{ background: "radial-gradient(1200px 600px at 50% 30%, #14191f 0%, #0b0d10 70%)" }} />
    {children}
  </AbsoluteFill>
);

// ---- Scene 1: title ----
export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const caret = Math.floor(frame / 15) % 2 === 0 ? "▋" : " ";
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Appear>
          <div style={{ fontFamily: FONT, color: COLORS.ink, fontSize: 92, fontWeight: 800, letterSpacing: -2 }}>
            x402<span style={{ color: COLORS.violet }}>-</span>bazaar<span style={{ color: COLORS.green }}>{caret}</span>
          </div>
        </Appear>
        <Appear delay={16}>
          <div style={{ color: COLORS.dim, fontSize: 30, marginTop: 18, textAlign: "center", maxWidth: 900, lineHeight: 1.35 }}>
            the marketplace layer for the agent economy on <span style={{ color: COLORS.blue }}>Stellar</span>
          </div>
        </Appear>
        <Appear delay={34}>
          <div style={{ fontFamily: FONT, color: COLORS.faint, fontSize: 20, marginTop: 26 }}>
            agents find a service · pay in USDC · the catalog writes itself
          </div>
        </Appear>
      </AbsoluteFill>
    </Bg>
  );
};

// ---- Scene 2: payment + cataloging flow ----
export const Flow: React.FC = () => {
  const cx = 960;
  const yRow = 300;
  const agentX = 240, sellerX = 660, facX = 1080, chainX = 1560;
  return (
    <Bg>
      <Appear>
        <div style={{ position: "absolute", top: 90, width: "100%", textAlign: "center", color: COLORS.dim, fontSize: 24, fontFamily: FONT }}>
          402 → sign auth entries → verify → settle → cataloged
        </div>
      </Appear>

      {/* wires */}
      <Wire x1={agentX + 90} x2={sellerX - 110} y={yRow} />
      <Wire x1={sellerX + 110} x2={facX - 110} y={yRow} />
      <Wire x1={facX + 110} x2={chainX - 110} y={yRow} />

      <div style={{ position: "absolute", left: agentX, top: yRow, transform: "translate(-50%,-50%)" }}>
        <Node label="Agent" sub="USDC only, no XLM" color={COLORS.violet} active={10} width={210} />
      </div>
      <div style={{ position: "absolute", left: sellerX, top: yRow, transform: "translate(-50%,-50%)" }}>
        <Node label="Seller" sub="@x402/express" color={COLORS.blue} active={70} width={200} />
      </div>
      <div style={{ position: "absolute", left: facX, top: yRow, transform: "translate(-50%,-50%)" }}>
        <Node label="Facilitator" sub="/verify /settle" color={COLORS.green} active={120} width={220} />
      </div>
      <div style={{ position: "absolute", left: chainX, top: yRow, transform: "translate(-50%,-50%)" }}>
        <Node label="Stellar" sub="fee sponsored" color={COLORS.gold} active={170} width={200} />
      </div>

      {/* packets */}
      <Packet from={sellerX} to={agentX} y={yRow + 44} at={40} dur={20} color={COLORS.dim} label="402 payment required" />
      <Packet from={agentX} to={facX} y={yRow - 44} at={95} dur={30} color={COLORS.violet} label="signed payment" />
      <Packet from={facX} to={chainX} y={yRow} at={150} dur={26} color={COLORS.green} label="settle" />
      <Packet from={chainX} to={facX} y={yRow + 44} at={185} dur={20} color={COLORS.gold} label="tx hash" />

      {/* cataloging drop */}
      <div style={{ position: "absolute", left: facX, top: yRow + 20, width: 2, height: 130, background: COLORS.line, transform: "translateX(-50%)" }} />
      <div style={{ position: "absolute", left: facX, top: yRow + 160, transform: "translate(-50%,0)" }}>
        <Node label="Catalog" sub="auto-cataloged + provenance" color={COLORS.green} active={205} width={320} />
      </div>

      <Appear delay={210} y={0}>
        <div style={{ position: "absolute", top: 600, left: cx, transform: "translateX(-50%)", color: COLORS.dim, fontSize: 22, textAlign: "center" }}>
          built on <span style={{ color: COLORS.ink, fontFamily: FONT }}>@x402/stellar</span> — verify &amp; settle <b style={{ color: COLORS.ink }}>not reimplemented</b>
        </div>
      </Appear>
    </Bg>
  );
};

// ---- Scene 3: mainnet proof ----
export const Mainnet: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Appear>
          <div style={{ color: COLORS.green, fontSize: 26, letterSpacing: 3, fontWeight: 700 }}>⛓ LIVE ON STELLAR MAINNET</div>
        </Appear>
        <Appear delay={14}>
          <div style={{ marginTop: 26, padding: "28px 40px", borderRadius: 16, background: COLORS.bg2, border: `1.5px solid ${COLORS.green}`, boxShadow: `0 0 ${glow * 50}px rgba(63,185,80,${0.3 * glow})` }}>
            <div style={{ color: COLORS.dim, fontSize: 18, marginBottom: 10 }}>real USDC settlement · stellar:pubnet</div>
            <div style={{ fontFamily: FONT, color: COLORS.ink, fontSize: 30 }}>
              07ecff0b<span style={{ color: COLORS.faint }}>17403d4500e230f7f3d23cea347a495f1d3e0a19</span>
            </div>
            <div style={{ display: "flex", gap: 40, marginTop: 18 }}>
              <Stat k="ledger" v="63 918 501" />
              <Stat k="fee paid by" v="facilitator" />
              <Stat k="payer spent" v="USDC only" />
            </div>
          </div>
        </Appear>
        <Appear delay={32}>
          <div style={{ marginTop: 26, color: COLORS.dim, fontSize: 22 }}>
            testnet <b style={{ color: COLORS.ink }}>and</b> mainnet — both the RFP&apos;s committed deliverables, live
          </div>
        </Appear>
      </AbsoluteFill>
    </Bg>
  );
};

const Stat: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div>
    <div style={{ color: COLORS.faint, fontSize: 15 }}>{k}</div>
    <div style={{ color: COLORS.green, fontSize: 22, fontWeight: 700, marginTop: 3 }}>{v}</div>
  </div>
);

// ---- Scene 4: search ----
export const Search: React.FC = () => {
  const frame = useCurrentFrame();
  const q = "what is the weather in my city";
  const typed = q.slice(0, Math.max(0, Math.floor(interpolate(frame, [8, 55], [0, q.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))));
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Appear>
          <div style={{ color: COLORS.dim, fontSize: 22, marginBottom: 16 }}>GET /discovery/search — natural language, ranked</div>
        </Appear>
        <Appear delay={4}>
          <div style={{ width: 820, padding: "18px 24px", borderRadius: 12, background: COLORS.bg2, border: `1.5px solid ${COLORS.blue}`, fontFamily: FONT, color: COLORS.ink, fontSize: 26 }}>
            <span style={{ color: COLORS.blue }}>?</span> {typed}
            <span style={{ opacity: Math.floor(frame / 15) % 2 ? 1 : 0.2 }}>▋</span>
          </div>
        </Appear>
        <Appear delay={58}>
          <div style={{ width: 820, marginTop: 20, padding: "20px 24px", borderRadius: 12, background: COLORS.bg2, border: `1.5px solid ${COLORS.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ color: COLORS.ink, fontSize: 26, fontWeight: 700 }}>BazaarWeather</div>
              <div style={{ color: COLORS.green, fontFamily: FONT, fontSize: 20 }}>nDCG@10 0.833</div>
            </div>
            <div style={{ color: COLORS.dim, fontSize: 19, marginTop: 6 }}>current weather &amp; temperature · 0.01 USDC</div>
            <div style={{ color: COLORS.faint, fontFamily: FONT, fontSize: 16, marginTop: 10 }}>
              provenance · distinct payers 2 · distinct credential holders — sybil-resistant
            </div>
          </div>
        </Appear>
        <Appear delay={78}>
          <div style={{ marginTop: 22, color: COLORS.dim, fontSize: 20 }}>hybrid BM25 + local embedding · measured, not asserted</div>
        </Appear>
      </AbsoluteFill>
    </Bg>
  );
};

// ---- Scene 5: close ----
export const Close: React.FC = () => {
  const rows = [
    ["6 settlements on-chain", "testnet + mainnet, every one checkable"],
    ["Bazaar", "browse · natural-language search · auto-cataloging"],
    ["upto scheme", "metered: authorize a cap, settle actual, once"],
    ["Apache-2.0", "no AGPL anywhere in the dependency path"],
  ];
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Appear>
          <div style={{ fontFamily: FONT, color: COLORS.ink, fontSize: 46, fontWeight: 800 }}>first Bazaar for Stellar</div>
        </Appear>
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((r, i) => (
            <Appear key={i} delay={16 + i * 10}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, width: 720 }}>
                <div style={{ color: COLORS.green, fontSize: 24 }}>✓</div>
                <div style={{ color: COLORS.ink, fontSize: 26, fontWeight: 700, width: 320 }}>{r[0]}</div>
                <div style={{ color: COLORS.dim, fontSize: 20 }}>{r[1]}</div>
              </div>
            </Appear>
          ))}
        </div>
        <Appear delay={66}>
          <div style={{ marginTop: 34, fontFamily: FONT, color: COLORS.blue, fontSize: 24 }}>github.com/Galmanus/x402-bazaar</div>
        </Appear>
      </AbsoluteFill>
    </Bg>
  );
};
