"use client";
import { useEffect, useState, useCallback } from "react";

type Provenance = { settleCount?: number; distinctPayers?: number; distinctCredentialHolders?: number; lastSettleTx?: string };
type Item = { resource: string; serviceName?: string; description?: string; tags?: string[]; accepts?: any[]; extensions?: { "x402-bazaar/provenance"?: Provenance } };

const explorer = (net: string, tx: string) =>
  net === "stellar:pubnet" ? `https://stellar.expert/explorer/public/tx/${tx}` : `https://stellar.expert/explorer/testnet/tx/${tx}`;

function Card({ item }: { item: Item }) {
  const a = (item.accepts && item.accepts[0]) || {};
  const prov = (item.extensions && item.extensions["x402-bazaar/provenance"]) || {};
  const net = a.network || "";
  const price = a.amount
    ? `${(Number(a.amount) / 1e7).toLocaleString(undefined, { maximumFractionDigits: 7 })} ${net.includes("pubnet") ? "USDC" : net.includes("testnet") ? "USDC*" : "token"}`
    : "";
  const tx = prov.lastSettleTx;
  return (
    <div className="card">
      <div className="top">
        <div className="name">{item.serviceName || item.resource}</div>
        <div className="price">{price}</div>
      </div>
      <div className="desc">{item.description}</div>
      <div className="tags">
        {(item.tags || []).map((t) => (
          <span className="tag" key={t}>{t}</span>
        ))}
        <span className="tag">{net}</span>
      </div>
      <div className="prov">
        <span>settlements <b>{prov.settleCount ?? 0}</b></span>
        <span>distinct payers <b>{prov.distinctPayers ?? 0}</b></span>
        {tx ? (
          <span>
            last tx <a href={explorer(net, tx)} target="_blank" rel="noreferrer">{tx.slice(0, 8)}…</a>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function Home() {
  const [pills, setPills] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [results, setResults] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/supported")
      .then((r) => r.json())
      .then((d) => {
        const nets = Array.from(new Set((d.kinds || []).map((k: any) => k.network))) as string[];
        setPills([...nets.map((n) => `network ${n}`), "scheme exact", "fees sponsored", "buyer needs USDC only"]);
      })
      .catch(() => setPills(["facilitator offline"]));
    fetch("/api/discovery/resources?limit=50")
      .then((r) => r.json())
      .then((d) => setCatalog(d.items || []))
      .catch(() => {});
  }, []);

  const run = useCallback((query: string) => {
    const s = query.trim();
    if (!s) return;
    setQ(s);
    setLoading(true);
    fetch("/api/discovery/search?query=" + encodeURIComponent(s))
      .then((r) => r.json())
      .then((d) => {
        setResults(d.resources || []);
        setLoading(false);
      })
      .catch(() => {
        setResults([]);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <div className="wrap">
        <div className="nav">
          <div className="brand">x402<b>-</b>bazaar</div>
          <div className="navlinks">
            <a href="#search">Search</a>
            <a href="#pq">Post-quantum</a>
            <a href="#how">How it works</a>
            <a href="https://github.com/Galmanus/x402-bazaar" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>

        <div className="hero">
          <div className="eyebrow"><span className="dot" /> live on Stellar testnet &amp; mainnet</div>
          <h1>The marketplace layer for the <span className="y">agent economy</span> on Stellar.</h1>
          <p className="lead">
            Agents find a service, pay in USDC, and the catalog writes itself — one settled payment at a time. A
            self-hostable x402 facilitator plus a native discovery Bazaar, built on the Apache-2.0 @x402/stellar package.
          </p>
          <div className="pills">
            {pills.map((p, i) => (
              <span
                className={"pill" + (p.includes("fees") || p.includes("USDC") ? " live" : "")}
                key={i}
                dangerouslySetInnerHTML={{ __html: p.replace(/(network|scheme|fees|buyer needs) (.+)/, "$1 <b>$2</b>") }}
              />
            ))}
          </div>
        </div>

        <div className="stats">
          <div className="stat"><div className="n y">6</div><div className="l">real settlements on-chain — testnet + mainnet</div></div>
          <div className="stat"><div className="n">0.833</div><div className="l">natural-language search, nDCG@10 (measured)</div></div>
          <div className="stat"><div className="n y">0</div><div className="l">XLM the buyer needs — fees are sponsored</div></div>
        </div>

        <section id="search">
          <div className="kicker">Discover</div>
          <h2 className="sh">Search the Bazaar in plain language</h2>
          <p className="sdesc">The catalog is written by real settlements. Ask like an agent would.</p>
          <div className="searchbar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") run(q); }}
              placeholder="e.g. what is the weather in my city"
            />
            <button onClick={() => run(q)}>Search</button>
          </div>
          <div className="chips">
            {["weather in my city", "pay with any token", "mcp agent"].map((c) => (
              <button className="chip" key={c} onClick={() => run(c)}>{c}</button>
            ))}
          </div>
          {results !== null && (
            <div className="grid">
              {loading ? (
                <div className="empty">searching…</div>
              ) : results.length ? (
                results.map((it) => <Card item={it} key={it.resource} />)
              ) : (
                <div className="empty">nothing matched “{q}”.</div>
              )}
            </div>
          )}
        </section>

        <section id="pq">
          <div className="pq">
            <div className="kicker">The part no other x402 facilitator has</div>
            <h2>Post-quantum, anonymous agent identity</h2>
            <p>
              An agent proves it belongs to an allowed set and pays — <b style={{ color: "#fff" }}>without revealing which
              agent it is</b> — and the catalog counts <b style={{ color: "#fff" }}>distinct credential holders</b>, not
              addresses, so provenance resists Sybil inflation. The credential is a hash-based Circle-STARK: no curves, no
              pairings, no trusted setup — nothing Shor&apos;s algorithm can break. The verifier is live on Stellar mainnet
              in <a href="https://github.com/Galmanus/pq402" style={{ color: "var(--yellow)" }}>pq402</a>.
            </p>
            <div className="scope">
              Honest scope: the USDC settlement itself uses standard Soroban signatures. The post-quantum, anonymous part
              is the agent-credential and provenance layer — whose quantum-proof verifier is real and live on mainnet in
              pq402 today.
            </div>
          </div>
        </section>

        <section>
          <div className="kicker">Live catalog</div>
          <h2 className="sh">Written by real settlements</h2>
          <p className="sdesc">
            Every entry appeared because an agent actually paid for it. Each provenance link opens the real transaction on
            stellar.expert.
          </p>
          <div className="grid">
            {catalog.length ? catalog.map((it) => <Card item={it} key={it.resource} />) : <div className="empty">loading…</div>}
          </div>
        </section>

        <section id="how">
          <div className="kicker">How it works</div>
          <h2 className="sh">402 → pay → the stall writes itself</h2>
          <div className="flow">
            <div className="step"><div className="n">1 · 402</div><div className="t">agent hits a paid API, gets payment terms</div></div>
            <div className="step"><div className="n">2 · sign</div><div className="t">signs a USDC auth entry — no XLM, no account</div></div>
            <div className="step"><div className="n">3 · settle</div><div className="t">facilitator verifies, sponsors the fee, submits</div></div>
            <div className="step"><div className="n">4 · catalog</div><div className="t">the service is cataloged automatically, with provenance</div></div>
            <div className="step"><div className="n">5 · discover</div><div className="t">any agent finds it in natural language</div></div>
          </div>
        </section>
      </div>
      <footer>
        <div className="wrap">
          Built on the Apache-2.0{" "}
          <a href="https://www.npmjs.com/package/@x402/stellar" target="_blank" rel="noreferrer">@x402/stellar</a> package ·
          verify &amp; settle not reimplemented ·{" "}
          <a href="https://github.com/Galmanus/x402-bazaar" target="_blank" rel="noreferrer">source</a> ·{" "}
          <a href="https://github.com/Galmanus/x402-bazaar/blob/main/docs/CONFORMANCE.md" target="_blank" rel="noreferrer">on-chain evidence</a>
        </div>
      </footer>
    </>
  );
}
