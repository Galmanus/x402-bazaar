"use client";
import { useEffect, useRef, useState, useCallback } from "react";

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
function Card({ item, onOpen }: { item: Item; onOpen?: (it: Item) => void }) {
  const a = (item.accepts && item.accepts[0]) || {};
  const prov = provOf(item);
  const net = a.network || "";
  const tx = prov.lastSettleTx;
  return (
    <div
      className="card card--click"
      role="button"
      tabIndex={0}
      onClick={() => onOpen && onOpen(item)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onOpen) {
          e.preventDefault();
          onOpen(item);
        }
      }}
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
            <a href={explorer(net, tx)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              {tx.slice(0, 8)}…
            </a>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- copyable snippet ---------- */
function Snippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <div className="codewrap">
      <button className="codecopy" onClick={copy}>
        {copied ? "copied" : "copy"}
      </button>
      <pre className="code">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ---------- service detail modal ---------- */
function buyerSnippet(item: Item): string {
  const a = (item.accepts && item.accepts[0]) || {};
  const net = a.network || "stellar:testnet";
  const rpc = net.includes("pubnet") ? `, { url: process.env.RPC_URL! } // pubnet has no default RPC` : "";
  return `import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

// the agent holds USDC only — network fees are sponsored
const signer = createEd25519Signer(process.env.STELLAR_SECRET_KEY!, "${net}");
const payFetch = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "${net}", client: new ExactStellarScheme(signer${rpc}) }],
});

const res = await payFetch("${item.resource}");
console.log(await res.json()); // paid + settled in the same request`;
}

function Detail({ item, onClose }: { item: Item; onClose: () => void }) {
  const prov = provOf(item);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  const snippet = buyerSnippet(item);
  const copy = () => {
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={item.serviceName || item.resource} onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="kicker">service</div>
        <h3 className="modal__name">{item.serviceName || item.resource}</h3>
        <p className="modal__desc">{item.description}</p>
        <div className="card__tags">
          {(item.tags || []).map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>

        <div className="kicker modal__k">payment terms</div>
        {(item.accepts || []).map((a, i) => (
          <div className="kv" key={i}>
            <div>
              <span>scheme</span>
              <b>{a.scheme}</b>
            </div>
            <div>
              <span>network</span>
              <b>{a.network}</b>
            </div>
            <div>
              <span>price</span>
              <b>{priceOf(a)}</b>
            </div>
            <div>
              <span>asset</span>
              <b className="mono" title={a.asset}>
                {(a.asset || "").slice(0, 6)}…{(a.asset || "").slice(-4)}
              </b>
            </div>
            <div>
              <span>pay to</span>
              <b className="mono" title={a.payTo}>
                {(a.payTo || "").slice(0, 6)}…{(a.payTo || "").slice(-4)}
              </b>
            </div>
            <div>
              <span>fees</span>
              <b>sponsored</b>
            </div>
          </div>
        ))}

        <div className="kicker modal__k">provenance — written by settlements</div>
        <div className="kv">
          <div>
            <span>settlements</span>
            <b>{prov.settleCount ?? 0}</b>
          </div>
          <div>
            <span>distinct payers</span>
            <b>{prov.distinctPayers ?? 0}</b>
          </div>
          {prov.firstSettleTx ? (
            <div>
              <span>first tx</span>
              <b>
                <a
                  href={explorer((item.accepts && item.accepts[0] && item.accepts[0].network) || "", prov.firstSettleTx)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {prov.firstSettleTx.slice(0, 8)}…
                </a>
              </b>
            </div>
          ) : null}
          {prov.lastSettleTx && prov.lastSettleTx !== prov.firstSettleTx ? (
            <div>
              <span>last tx</span>
              <b>
                <a
                  href={explorer((item.accepts && item.accepts[0] && item.accepts[0].network) || "", prov.lastSettleTx)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {prov.lastSettleTx.slice(0, 8)}…
                </a>
              </b>
            </div>
          ) : null}
        </div>

        <div className="kicker modal__k">pay for it from your agent</div>
        <div className="codewrap">
          <button className="codecopy" onClick={copy}>
            {copied ? "copied" : "copy"}
          </button>
          <pre className="code">
            <code>{snippet}</code>
          </pre>
        </div>
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
  const [netFilter, setNetFilter] = useState<"all" | "stellar:pubnet" | "stellar:testnet">("all");
  const [selected, setSelected] = useState<Item | null>(null);

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
      <div className="ambient" aria-hidden="true" />

      <div className="shell">
        {/* NAV */}
        <nav className="nav">
          <div className="brand">
            x402<b>-</b>bazaar
          </div>
          <div className="navlinks">
            <a href="#search">Search</a>
            <a href="#pq">Post-quantum</a>
            <a href="#mcp">Agents</a>
            <a href="#list">Sell</a>
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
            live · x402 discovery on stellar
          </div>
          <h1>
            <span className="ln">
              <span>The Bazaar</span>
            </span>
            <span className="ln">
              <span>
                <em className="accent">agents can read.</em>
              </span>
            </span>
          </h1>
          <p className="lead">
            An agent finds a service and pays in USDC inside the same request. Every settlement writes the next
            entry in the catalog — provable, self-hostable, and yours to run. A native x402 discovery Bazaar,
            built on Stellar.
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
                  results.map((it) => <Card item={it} key={it.resource} onOpen={setSelected} />)
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
              on stellar.expert. Click a card for payment terms and a ready-to-run client.
            </p>
            <div className="filters" role="group" aria-label="Filter catalog by network">
              {(
                [
                  ["all", "all networks"],
                  ["stellar:pubnet", "mainnet"],
                  ["stellar:testnet", "testnet"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  className={"fbtn" + (netFilter === v ? " fbtn--on" : "")}
                  onClick={() => setNetFilter(v)}
                  aria-pressed={netFilter === v}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid">
              {catalog.length ? (
                (() => {
                  const shown = catalog.filter(
                    (it) => netFilter === "all" || ((it.accepts && it.accepts[0] && it.accepts[0].network) || "") === netFilter,
                  );
                  return shown.length ? (
                    shown.map((it) => <Card item={it} key={it.resource} onOpen={setSelected} />)
                  ) : (
                    <div className="empty">no services on this network yet.</div>
                  );
                })()
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
          {/* LIST YOUR SERVICE */}
          <section className="section reveal" id="list">
            <div className="kicker">Sell</div>
            <h2 className="sh">List your service — no form, no gatekeeper</h2>
            <p className="sdesc">
              There is no “submit your API” form. Wrap your endpoint with the standard <b>@x402/express</b> middleware,
              point it at the facilitator, and the moment the first agent pays, the Bazaar catalogs it automatically —
              with on-chain provenance from day one.
            </p>
            <div className="codewrap">
              <pre className="code">
                <code>{`import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";

const server = new x402ResourceServer(new HTTPFacilitatorClient({ url: FACILITATOR_URL }))
  .register("stellar:testnet", new ExactStellarScheme())
  .registerExtension(bazaarResourceServerExtension);

app.use(paymentMiddleware({
  "GET /weather": {
    accepts: {
      scheme: "exact",
      price: "$0.05",            // or any SEP-41 token: { amount, asset }
      network: "stellar:testnet",
      payTo: YOUR_STELLAR_ADDRESS,
      maxTimeoutSeconds: 45,
    },
  },
}, server));
// first settled payment ⇒ your service appears in the catalog, with provenance`}</code>
              </pre>
            </div>
            <p className="sdesc sdesc--after">
              Nothing here is specific to this facilitator — any unmodified x402 seller works. Full runnable example in{" "}
              <a href="https://github.com/Galmanus/x402-bazaar/tree/main/examples/weather" target="_blank" rel="noreferrer">
                examples/weather
              </a>
              .
            </p>
          </section>

          {/* CONNECT YOUR AGENT (MCP) */}
          <section className="section reveal" id="mcp">
            <div className="kicker">Agents</div>
            <h2 className="sh">Plug the Bazaar into your agent — one URL</h2>
            <p className="sdesc">
              The Bazaar is a hosted <b>remote MCP server</b>. Claude Code, Cursor, or any MCP client gets{" "}
              <b>search_services</b>, <b>list_services</b> and <b>get_service</b> with a single line — nothing to
              install, nothing to run.
            </p>
            <div className="mcpgrid">
              <div>
                <div className="kicker modal__k">claude code</div>
                <Snippet code={`claude mcp add --transport http x402-bazaar \\
  https://x402-bazaar-web-u87t.vercel.app/api/mcp`} />
              </div>
              <div>
                <div className="kicker modal__k">cursor · any streamable-http client</div>
                <Snippet code={`{
  "mcpServers": {
    "x402-bazaar": {
      "url": "https://x402-bazaar-web-u87t.vercel.app/api/mcp"
    }
  }
}`} />
              </div>
              <div>
                <div className="kicker modal__k">stdio-only clients (claude desktop)</div>
                <Snippet code={`{
  "mcpServers": {
    "x402-bazaar": {
      "command": "npx",
      "args": ["-y", "mcp-remote",
        "https://x402-bazaar-web-u87t.vercel.app/api/mcp"]
    }
  }
}`} />
              </div>
            </div>
            <p className="sdesc sdesc--after">
              Honest scope: the remote server is <b>read-only discovery</b>. <b>paid_call</b> — the tool that actually
              pays — signs with your key, so it stays in the{" "}
              <a
                href="https://github.com/Galmanus/x402-bazaar/tree/main/packages/mcp-discovery"
                target="_blank"
                rel="noreferrer"
              >
                local stdio server
              </a>
              : your private key never touches a shared endpoint.
            </p>
          </section>

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

      {selected ? <Detail item={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
