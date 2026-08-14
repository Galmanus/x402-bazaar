// Real cataloged services from x402-bazaar conformance runs (docs/CONFORMANCE.md).
// Every provenance tx is a real on-chain settlement. Read-only, safe to host.
export const USDC_TESTNET = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
export const USDC_PUBNET = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

export interface Service {
  serviceName: string;
  resource: string;
  type: string;
  network: string;
  accepts: {
    scheme: string;
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    extra: { areFeesSponsored: boolean };
  }[];
  description: string;
  tags: string[];
  provenance: {
    settleCount: number;
    distinctPayers: number;
    distinctCredentialHolders: number;
    firstSettleTx: string;
    lastSettleTx: string;
  };
}

export const SERVICES: Service[] = [
  {
    serviceName: "BazaarWeather (mainnet)",
    resource: "https://api.example.com/weather",
    type: "http",
    network: "stellar:pubnet",
    accepts: [{ scheme: "exact", network: "stellar:pubnet", amount: "100000", asset: USDC_PUBNET, payTo: "GAX76QEXXTIWHAT464H7HFDS5AOPXJ52JSC6PTTJAT7YKJFD4GQQKAAQ", extra: { areFeesSponsored: true } }],
    description: "Current weather conditions and temperature for any city, settled on Stellar MAINNET.",
    tags: ["weather", "forecast", "temperature", "mainnet"],
    provenance: { settleCount: 1, distinctPayers: 1, distinctCredentialHolders: 0, firstSettleTx: "07ecff0b17403d4500e230f7f3d23cea347a495f1d3e0a193bb0cc2b0e275dbb", lastSettleTx: "07ecff0b17403d4500e230f7f3d23cea347a495f1d3e0a193bb0cc2b0e275dbb" },
  },
  {
    serviceName: "BazaarWeather (testnet)",
    resource: "https://api.example.com/weather-testnet",
    type: "http",
    network: "stellar:testnet",
    accepts: [{ scheme: "exact", network: "stellar:testnet", amount: "500000", asset: USDC_TESTNET, payTo: "GDD6IPHRIPAJCKIIPRXKYUXWZ5DXVXGE4CVMPHRIV2FZD7EZCTYV3SOO", extra: { areFeesSponsored: true } }],
    description: "Weather API paid via the standard @x402/express + @x402/fetch stack, an MCP agent paid_call, and a custom __check_auth contract-account payer.",
    tags: ["weather", "forecast", "mcp", "check_auth"],
    provenance: { settleCount: 3, distinctPayers: 2, distinctCredentialHolders: 0, firstSettleTx: "dae9569bc631550c5ae24eec06e6fb58557146a00b7f7b1b92d2e28a591aa696", lastSettleTx: "61f8872b010fd4f6faef5c043bf77c51cdbc0e7ee6b7bc0203c13b5040868c72" },
  },
  {
    serviceName: "BazaarWeather (BAZ token)",
    resource: "https://api.example.com/weather-baz",
    type: "http",
    network: "stellar:testnet",
    accepts: [{ scheme: "exact", network: "stellar:testnet", amount: "1000000", asset: "CAG5JKXMFKSNC3DC26CJ6XHC472QQQHIQPNC3XPUTMQXJRWZLVJY73VE", payTo: "GDD6IPHRIPAJCKIIPRXKYUXWZ5DXVXGE4CVMPHRIV2FZD7EZCTYV3SOO", extra: { areFeesSponsored: true } }],
    description: "The same weather service priced in a NON-USDC SEP-41 token (BAZ). Any SEP-41 asset settles, USDC by default.",
    tags: ["weather", "sep-41", "any-token"],
    provenance: { settleCount: 1, distinctPayers: 1, distinctCredentialHolders: 0, firstSettleTx: "2192305314732803be6f62709721082c9cf3f2f86a8edeffb10358882934a8ea", lastSettleTx: "2192305314732803be6f62709721082c9cf3f2f86a8edeffb10358882934a8ea" },
  },
];

export function toResource(s: Service) {
  return {
    resource: s.resource,
    type: s.type,
    x402Version: 2,
    accepts: s.accepts,
    lastUpdated: new Date(0).toISOString(),
    description: s.description,
    serviceName: s.serviceName,
    tags: s.tags,
    extensions: { "x402-bazaar/provenance": s.provenance },
  };
}

const BOOST: Record<string, number> = { serviceName: 3, tags: 3, description: 2 };
function tokenize(t: string): string[] {
  return String(t || "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
}
function docTerms(s: Service) {
  const tf: Record<string, number> = {};
  let len = 0;
  const add = (text: string, b: number) => { for (const w of tokenize(text)) { tf[w] = (tf[w] || 0) + b; len += b; } };
  add(s.serviceName, BOOST.serviceName);
  add(s.tags.join(" "), BOOST.tags);
  add(s.description, BOOST.description);
  return { tf, len };
}
const DOCS = SERVICES.map((s) => ({ s, ...docTerms(s) }));
const AVG = DOCS.reduce((a, d) => a + d.len, 0) / (DOCS.length || 1);
const DF: Record<string, number> = {};
for (const d of DOCS) for (const w of Object.keys(d.tf)) DF[w] = (DF[w] || 0) + 1;

export function search(query: string): Service[] {
  const terms = tokenize(query);
  if (!terms.length) return [];
  const K1 = 1.2, B = 0.75, N = DOCS.length;
  return DOCS
    .map((d) => {
      let sc = 0;
      for (const term of terms) {
        const tf = d.tf[term];
        if (!tf) continue;
        const df = DF[term] || 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        sc += (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * d.len) / AVG));
      }
      return { s: d.s, sc };
    })
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.s);
}

export function list(network?: string, type?: string): Service[] {
  return SERVICES.filter((s) => (!network || s.network === network) && (!type || s.type === type));
}
