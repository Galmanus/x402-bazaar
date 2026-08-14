"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Constellation, { type SkyNode } from "./Constellation";

/* ---------- types ---------- */
type Provenance = {
  settleCount?: number;
  distinctPayers?: number;
  distinctCredentialHolders?: number;
  firstSettleTx?: string;
  lastSettleTx?: string;
};
type Accept = { scheme?: string; network?: string; amount?: string; asset?: string; payTo?: string };
type Item = {
  resource: string;
  serviceName?: string;
  description?: string;
  tags?: string[];
  accepts?: Accept[];
  extensions?: { "x402-bazaar/provenance"?: Provenance };
};

/* ---------- helpers ---------- */
const explorer = (net: string, tx: string) =>
  net.includes("pubnet")
    ? `https://stellar.expert/explorer/public/tx/${tx}`
    : `https://stellar.expert/explorer/testnet/tx/${tx}`;

function priceOf(a: Accept): string {
  if (!a.amount) return "";
  const net = a.network || "";
  const label = net.includes("pubnet") ? "USDC" : net.includes("testnet") ? "USDC*" : "token";
  const n = Number(a.amount) / 1e7;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 7 })} ${label}`;
}

function provOf(item: Item): Provenance {
  return (item.extensions && item.extensions["x402-bazaar/provenance"]) || {};
}

/* ---------- card ---------- */
function Card({ item }: { item: Item }) {
  const a = (item.accepts && item.accepts[0]) || {};
  const prov = provOf(item);
  const net = a.network || "";
  const tx = prov.lastSettleTx;
  return (
    <div
      className="card"
      onMouseEnter={() => window.dispatchEvent(new CustomEvent("bazaar:hover", { detail: item.resource }))}
    >
      <div className="card__top">
        <div className="card__name">{item.serviceName || item.resource}</div>
        <div className="card__price">{priceOf(a)}</div>
      </div>
      <div className="card__desc">{item.description}</div>
      <div className="card__tags">
        {(item.tags || []).map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
        {net ? <span className="tag tag--net">{net}</span> : null}
      </div>
      <div className="card__prov">
        <span>
          settlements <b>{prov.settleCount ?? 0}</b>
        </span>
        <span>
          distinct payers <b>{prov.distinctPayers ?? 0}</b>
        </span>
        {tx ? (
          <span>
            last tx{" "}
            <a href={explorer(net, tx)} target="_blank" rel="noreferrer">
              {tx.slice(0, 8)}…
            </a>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- count-up (reduced-motion safe) ---------- */
function useCountUp(target: number, run: boolean, decimals = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    const reduce =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Number((target * eased).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, decimals]);
  return v;
}

/* ---------- reveal-on-scroll hook (graceful degrade) ---------- */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

/* ---------- ticker: only the real, verified settlement hashes ---------- */
function realHashes(items: Item[]): { tx: string; net: string }[] {
  const out: { tx: string; net: string }[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const net = (it.accepts && it.accepts[0] && it.accepts[0].network) || "";
    const prov = provOf(it);
    for (const tx of [prov.firstSettleTx, prov.lastSettleTx]) {
      if (tx && !seen.has(tx)) {
        seen.add(tx);
        out.push({ tx, net });
      }
    }
  }
  return out;
}

/* ===================================================================== */
export default function Home() {
  const [pills, setPills] = useState<{ label: string; value?: string; live?: boolean }[]>([]);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [results, setResults] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // enable scroll-reveal only once JS is present (no-JS => content visible)
  useEffect(() => {
    document.documentElement.classList.add("anim");
  }, []);

  // Global reveal observer: reveals EVERY `.reveal` section on scroll (the
  // per-section hooks below only drive count-up/canvas; this guarantees the
  // catalog + how-it-works sections, which have no hook, never stay hidden).
  // Fail-safe timer reveals anything the observer misses.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const t = window.setTimeout(() => els.forEach((el) => el.classList.add("in")), 2600);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [catalog.length]);

  useEffect(() => {
    fetch("/api/supported")
      .then((r) => r.json())
      .then((d) => {
        const nets = Array.from(new Set((d.kinds || []).map((k: { network?: string }) => k.network))).filter(
          Boolean,
        ) as string[];
        const netPills = nets.map((n) => ({ label: "network", value: n, live: true }));
        setPills([
          ...netPills,
          { label: "scheme", value: "exact" },
          { label: "fees", value: "sponsored" },
          { label: "buyer needs", value: "USDC only", live: true },
        ]);
      })
      .catch(() => setPills([{ label: "facilitator", value: "offline" }]));

    fetch("/api/discovery/resources?limit=50")
      .then((r) => r.json())
      .then((d) => setCatalog((d.items || []) as Item[]))
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
        setResults((d.resources || []) as Item[]);
        setLoading(false);
      })
      .catch(() => {
        setResults([]);
        setLoading(false);
      });
  }, []);

  // signature nodes — resources.map (never a hardcoded count)
  const skyNodes: SkyNode[] = catalog.map((r) => ({
    id: r.resource,
    settleCount: provOf(r).settleCount ?? 1,
  }));

  // HONEST stat: settlements = sum of real settleCount (== what the chain backs).
  // data.ts sums to 5; computed live so the numeral never outruns the catalog.
  const settlementCount = catalog.reduce((acc, it) => acc + (provOf(it).settleCount ?? 0), 0);
  const hashes = realHashes(catalog);

  // reveal wiring
  const statsR = useReveal<HTMLDivElement>();
  const pqR = useReveal<HTMLElement>();

  const nSettle = useCountUp(settlementCount, statsR.inView, 0);
  const nNdcg = useCountUp(0.833, statsR.inView, 3);

  return (
    <>
      {skyNodes.length > 0 && <Constellation nodes={skyNodes} />}

      <div className="shell">
        {/* NAV */}
        <nav className="nav">
          <div className="brand">
            x402<b>-</b>bazaar
          </div>
          <div className="navlinks">
            <a href="#search">Search</a>
            <a href="#pq">Post-quantum</a>
            <a href="#how">How it works</a>
            <a href="https://github.com/Galmanus/x402-bazaar" target="_blank" rel="noreferrer">
              Source
            </a>
          </div>
        </nav>

        {/* HERO */}
        <header className="hero">
          <div className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            live · watched in real time
          </div>
          <h1>
            <span className="ln">
              <span>The marketplace layer</span>
            </span>
            <span className="ln">
              <span>
                for the <em className="accent">agent economy</em>
              </span>
            </span>
            <span className="ln">
              <span>on Stellar.</span>
            </span>
          </h1>
          <p className="lead">
            Agents find a service, pay in USDC over x402, and the catalog writes itself — one settled payment at a time.
            A self-hostable facilitator plus a native discovery Bazaar, built on the Apache-2.0 @x402/stellar package.
          </p>
          <div className="cta-row">
            <a className="btn btn--primary" href="#search">
              Search the catalog
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a className="btn btn--ghost" href="https://github.com/Galmanus/x402-bazaar" target="_blank" rel="noreferrer">
              Read the source
            </a>
          </div>
        </header>
      </div>

      {/* BELOW-FOLD: opaque, canvas bounded to the hero */}
      <div className="below">
        {/* LIVE STATUS STRIP */}
        <section className="status" aria-label="Live facilitator status">
          <div className="status__pills">
            {pills.map((p, i) => (
              <span className={"pill" + (p.live ? " pill--live" : "")} key={i}>
                {p.live ? <span className="live-dot" aria-hidden="true" /> : null}
                {p.label} {p.value ? <b>{p.value}</b> : null}
              </span>
            ))}
          </div>
          {hashes.length > 0 && (
            <div className="ticker">
              <div className="ticker__label" aria-hidden="true">
                on-chain
              </div>
              <div className="ticker__track">
                {[...hashes, ...hashes].map((h, i) => (
                  <a key={i} href={explorer(h.net, h.tx)} target="_blank" rel="noreferrer">
                    <span className="net">{h.net.includes("pubnet") ? "pubnet" : "testnet"}</span> · {h.tx.slice(0, 10)}…
                    {h.tx.slice(-6)}
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="wrap">
          {/* PROOF STATS */}
          <div className="stats reveal" ref={statsR.ref}>
            <div className="stat stat--accent">
              <div className="kicker">settled on-chain</div>
              <div className="num">{nSettle}</div>
              <div className="cap">real settlements on Stellar testnet + mainnet, each one a verifiable transaction.</div>
            </div>
            <div className="stat">
              <div className="kicker">measured</div>
              <div className="num">{nNdcg.toFixed(3)}</div>
              <div className="cap">natural-language search quality, nDCG@10 — measured, not asserted.</div>
            </div>
            <div className="stat stat--accent">
              <div className="kicker">buyer cost</div>
              <div className="num">0</div>
              <div className="cap">XLM the buyer needs — fees are sponsored, the agent holds only USDC.</div>
            </div>
          </div>

          {/* SEARCH */}
          <section className="section" id="search">
            <div className="kicker">Discover</div>
            <h2 className="sh">Search the Bazaar in plain language</h2>
            <p className="sdesc">The catalog is written by real settlements. Ask like an agent would.</p>
            <div className="searchbar">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") run(q);
                }}
                placeholder="e.g. what is the weather in my city"
                aria-label="Search the Bazaar catalog"
              />
              <button onClick={() => run(q)}>Search</button>
            </div>
            <div className="chips">
              {["weather", "sep-41 token", "mcp agent"].map((c) => (
                <button className="chip" key={c} onClick={() => run(c)}>
                  {c}
                </button>
              ))}
            </div>
            {results !== null && (
              <div className="grid" aria-live="polite">
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

          {/* LIVE CATALOG */}
          <section className="section reveal">
            <div className="kicker">Live catalog</div>
            <h2 className="sh">Written by settlements, not by us</h2>
            <p className="sdesc">
              Every entry appeared because an agent actually paid for it. Each provenance link opens the real transaction
              on stellar.expert.
            </p>
            <div className="grid">
              {catalog.length ? (
                catalog.map((it) => <Card item={it} key={it.resource} />)
              ) : (
                <div className="empty">loading…</div>
              )}
            </div>
          </section>
        </div>

        {/* POST-QUANTUM BAND */}
        <section className="pq reveal" id="pq" ref={pqR.ref}>
          <div className="pq__trace" aria-hidden="true" />
          <div className="pq__inner">
            <div className="kicker">The part no other x402 facilitator has</div>
            <h2>Post-quantum, anonymous agent identity</h2>
            <p>
              An agent proves it belongs to an allowed set and pays — <b>without revealing which agent it is</b> — and
              the catalog counts <b>distinct credential holders</b>, not addresses, so provenance resists Sybil
              inflation. The credential is a hash-based Circle-STARK: no curves, no pairings, no trusted setup — nothing
              Shor&apos;s algorithm can break. The verifier is live on Stellar mainnet in{" "}
              <a href="https://github.com/Galmanus/pq402" target="_blank" rel="noreferrer">
                pq402
              </a>
              .
            </p>
            <p className="pq__scope">
              honest scope: the USDC settlement itself uses standard Soroban signatures. the post-quantum, anonymous part
              is the agent-credential and provenance layer — whose quantum-proof verifier is real and live on mainnet in
              pq402 today.
            </p>
          </div>
        </section>

        <div className="wrap">
          {/* HOW IT WORKS */}
          <section className="section reveal" id="how">
            <div className="kicker">How it works</div>
            <h2 className="sh">402 → sign → settle → catalog → discover</h2>
            <div className="flow">
              <div className="flow__edge" aria-hidden="true" />
              <div className="flow__photon" aria-hidden="true" />
              <div className="flow__steps">
                {[
                  { k: "1 · 402", t: "agent hits a paid API, gets payment terms" },
                  { k: "2 · sign", t: "signs a USDC auth entry — no XLM, no account" },
                  { k: "3 · settle", t: "facilitator verifies, sponsors the fee, submits" },
                  { k: "4 · catalog", t: "the service is cataloged automatically, with provenance" },
                  { k: "5 · discover", t: "any agent finds it in natural language" },
                ].map((s) => (
                  <div className="step" key={s.k}>
                    <div className="step__node" aria-hidden="true" />
                    <div className="step__k">{s.k}</div>
                    <div className="step__t">{s.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer__inner">
            Built on the Apache-2.0{" "}
            <a href="https://www.npmjs.com/package/@x402/stellar" target="_blank" rel="noreferrer">
              @x402/stellar
            </a>{" "}
            package · verify &amp; settle not reimplemented.
            <br />
            <a href="https://github.com/Galmanus/x402-bazaar" target="_blank" rel="noreferrer">
              source
            </a>
            <span className="sep">·</span>
            <a href="https://github.com/Galmanus/x402-bazaar/blob/main/docs/CONFORMANCE.md" target="_blank" rel="noreferrer">
              on-chain evidence
            </a>
            <span className="sep">·</span>
            <a href="https://github.com/Galmanus/pq402" target="_blank" rel="noreferrer">
              pq402 verifier
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
