/**
 * Standalone DEMO server for SCF reviewers: a clickable, hostable instance.
 *
 * Serves the demo UI at / plus the real discovery API, seeded with the actual
 * services our conformance runs settled on-chain (real tx hashes — see
 * docs/CONFORMANCE.md). Read-only and safe to host publicly: no signer, no
 * settlement, no funds. For the full facilitator (verify/settle) use server.ts.
 *
 * Run:  PORT=8402 npx tsx packages/facilitator/src/demo-server.ts
 */
import express from "express";
import { CatalogStore, SearchEngine } from "@x402-bazaar/catalog";
import type { PaymentRequirements } from "@x402/core/types";

const USDC_TESTNET = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const USDC_PUBNET = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

interface Seed {
  serviceName: string;
  resource: string;
  network: string;
  asset: string;
  payTo: string;
  amount: string;
  description: string;
  tags: string[];
  tx: string;
  payers: string[];
}

// The real cataloged services from our on-chain conformance runs.
const SEEDS: Seed[] = [
  {
    serviceName: "BazaarWeather (mainnet)",
    resource: "https://api.example.com/weather",
    network: "stellar:pubnet",
    asset: USDC_PUBNET,
    payTo: "GAX76QEXXTIWHAT464H7HFDS5AOPXJ52JSC6PTTJAT7YKJFD4GQQKAAQ",
    amount: "100000",
    description: "Current weather conditions and temperature for any city — settled on Stellar MAINNET.",
    tags: ["weather", "forecast", "temperature", "mainnet"],
    tx: "07ecff0b17403d4500e230f7f3d23cea347a495f1d3e0a193bb0cc2b0e275dbb",
    payers: ["GCEYFLGNHCW4EIEX5LAVYGIGPT2KLHHVB6EOUWKKALA2FT7RMCHI242P"],
  },
  {
    serviceName: "BazaarWeather (testnet)",
    resource: "https://api.example.com/weather-testnet",
    network: "stellar:testnet",
    asset: USDC_TESTNET,
    payTo: "GDD6IPHRIPAJCKIIPRXKYUXWZ5DXVXGE4CVMPHRIV2FZD7EZCTYV3SOO",
    amount: "500000",
    description: "Weather API paid via the standard @x402/express + @x402/fetch stack, plus an MCP agent paid_call and a custom __check_auth contract-account payer.",
    tags: ["weather", "forecast", "mcp", "check_auth"],
    tx: "61f8872b010fd4f6faef5c043bf77c51cdbc0e7ee6b7bc0203c13b5040868c72",
    payers: [
      "GC26DQPIO2FTWOK3SHVOR6PU7Q3OZTBHG4VS7UMGPJBLYPLJX2YVRPWM",
      "CBSWCOS2LSGOXACLUR3LBOWKUJNMNA2SSQLS6EH3NXEG6ARXG6TZAPQ3",
    ],
  },
  {
    serviceName: "BazaarWeather (BAZ token)",
    resource: "https://api.example.com/weather-baz",
    network: "stellar:testnet",
    asset: "CAG5JKXMFKSNC3DC26CJ6XHC472QQQHIQPNC3XPUTMQXJRWZLVJY73VE",
    payTo: "GDD6IPHRIPAJCKIIPRXKYUXWZ5DXVXGE4CVMPHRIV2FZD7EZCTYV3SOO",
    amount: "1000000",
    description: "Same weather service priced in a NON-USDC SEP-41 token (BAZ) — any SEP-41 asset settles, USDC by default.",
    tags: ["weather", "sep-41", "any-token"],
    tx: "2192305314732803be6f62709721082c9cf3f2f86a8edeffb10358882934a8ea",
    payers: ["GC26DQPIO2FTWOK3SHVOR6PU7Q3OZTBHG4VS7UMGPJBLYPLJX2YVRPWM"],
  },
];

function seed(store: CatalogStore) {
  for (const s of SEEDS) {
    const requirements = {
      scheme: "exact",
      network: s.network,
      amount: s.amount,
      asset: s.asset,
      payTo: s.payTo,
      resource: s.resource,
      maxTimeoutSeconds: 45,
      extra: { areFeesSponsored: true },
    } as unknown as PaymentRequirements;
    const key = `${s.network}|${s.payTo}|${s.resource}`;
    store.upsert({
      entry: {
        key,
        resource: s.resource,
        type: "http",
        x402Version: 2,
        network: s.network,
        payTo: s.payTo,
        scheme: "exact",
        accepts: [requirements],
        description: s.description,
        serviceName: s.serviceName,
        tags: s.tags,
      },
      txHash: s.tx,
      payer: s.payers[0],
    });
    for (const p of s.payers.slice(1)) store.upsert({ entry: rawEntry(key, s, requirements), txHash: s.tx, payer: p });
  }
}
function rawEntry(key: string, s: Seed, requirements: PaymentRequirements) {
  return {
    key, resource: s.resource, type: "http" as const, x402Version: 2, network: s.network,
    payTo: s.payTo, scheme: "exact", accepts: [requirements], description: s.description,
    serviceName: s.serviceName, tags: s.tags,
  };
}

const store = new CatalogStore(":memory:");
seed(store);
const engine = new SearchEngine(store);

const app = express();
app.use((_req, res, next) => { res.setHeader("Access-Control-Allow-Origin", "*"); next(); });
app.use(express.static(new URL("../public/", import.meta.url).pathname));

app.get("/health", (_req, res) => res.json({ ok: true, demo: true, catalogSize: store.all().length }));

app.get("/supported", (_req, res) => {
  res.json({
    kinds: [
      { x402Version: 2, scheme: "exact", network: "stellar:testnet", extra: { areFeesSponsored: true } },
      { x402Version: 2, scheme: "exact", network: "stellar:pubnet", extra: { areFeesSponsored: true } },
    ],
    extensions: ["bazaar"],
    signers: {},
  });
});

app.get("/discovery/resources", (req, res) => {
  const { items, total, limit, offset } = store.list({
    type: str(req.query.type), network: str(req.query.network), payTo: str(req.query.payTo),
    limit: num(req.query.limit), offset: num(req.query.offset),
  });
  res.json({ x402Version: 2, items: items.map(toResource), pagination: { limit, offset, total } });
});

app.get("/discovery/search", async (req, res) => {
  const query = str(req.query.query);
  if (!query) { res.status(400).json({ code: "missing_query", reason: "query parameter is required" }); return; }
  const page = await engine.search({ query, limit: num(req.query.limit) });
  res.json({ x402Version: 2, resources: page.items.map(toResource), nextCursor: page.nextCursor, partialResults: page.partialResults, total: page.total });
});

function toResource(e: ReturnType<CatalogStore["all"]>[number]) {
  return {
    resource: e.resource, type: e.type, x402Version: e.x402Version, accepts: e.accepts,
    lastUpdated: e.lastUpdated, description: e.description, serviceName: e.serviceName, tags: e.tags,
    extensions: {
      "x402-bazaar/provenance": {
        settleCount: e.settleCount, distinctPayers: e.distinctPayers,
        distinctCredentialHolders: e.distinctCredentialHolders,
        firstSettleTx: e.firstSettleTx, lastSettleTx: e.lastSettleTx,
      },
    },
  };
}
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown) => { const n = typeof v === "string" ? Number(v) : NaN; return Number.isFinite(n) ? n : undefined; };

const port = Number(process.env.PORT ?? 8402);
app.listen(port, () => console.log(`x402-bazaar DEMO on :${port} — ${store.all().length} real cataloged services`));
