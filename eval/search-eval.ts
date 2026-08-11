/**
 * Search quality eval: nDCG@10 over a synthetic bazaar catalog.
 *
 * "Working natural language ranking" is an RFP deliverable; this harness makes
 * it measurable instead of asserted. ToolRet (arXiv:2503.01763) showed generic
 * retrievers degrade on tool retrieval — so we publish numbers, not adjectives.
 *
 * Method: 24 services across 8 domains ingested into a real CatalogStore; 16
 * agent-style queries with graded relevance (2 = the service the agent needs,
 * 1 = plausible substitute, 0 = everything else). Reported: nDCG@10 and
 * hit@1 for (a) the shipped BM25 engine, (b) a naive substring baseline.
 *
 * Run: npx tsx eval/search-eval.ts
 */
import { CatalogStore, LocalEmbeddingProvider, SearchEngine } from "@x402-bazaar/catalog";

interface Service {
  key: string;
  serviceName: string;
  description: string;
  tags: string[];
}

const SERVICES: Service[] = [
  { key: "weather", serviceName: "SkyData", description: "Current weather conditions and hourly forecast for any city", tags: ["weather", "forecast"] },
  { key: "geocode", serviceName: "GeoPoint", description: "Convert street addresses to latitude and longitude coordinates", tags: ["geocoding", "maps"] },
  { key: "fx", serviceName: "RateWire", description: "Live foreign exchange rates and currency conversion", tags: ["forex", "currency", "finance"] },
  { key: "stocks", serviceName: "TickerFeed", description: "Real-time stock price quotes and market data", tags: ["stocks", "finance", "market"] },
  { key: "translate", serviceName: "LinguaAPI", description: "Translate text between 90 languages", tags: ["translation", "nlp"] },
  { key: "sentiment", serviceName: "MoodScan", description: "Sentiment analysis for product reviews and social posts", tags: ["sentiment", "nlp"] },
  { key: "ocr", serviceName: "TextGrab", description: "Extract text from images and scanned documents", tags: ["ocr", "vision"] },
  { key: "imggen", serviceName: "PixelForge", description: "Generate images from text prompts", tags: ["image", "generation"] },
  { key: "email-verify", serviceName: "InboxCheck", description: "Verify email address deliverability and detect disposable domains", tags: ["email", "validation"] },
  { key: "phone-verify", serviceName: "DialProof", description: "Validate phone numbers and detect carrier and line type", tags: ["phone", "validation"] },
  { key: "vat", serviceName: "TaxMate", description: "Validate EU VAT numbers and compute VAT rates per country", tags: ["tax", "vat", "compliance"] },
  { key: "company", serviceName: "OrgBook", description: "Company registry lookup: incorporation data, officers, filings", tags: ["kyb", "compliance"] },
  { key: "news", serviceName: "PressHose", description: "Search news articles by keyword and date range", tags: ["news", "search"] },
  { key: "web-search", serviceName: "CrawlQuery", description: "General web search returning titles, URLs and snippets", tags: ["search", "web"] },
  { key: "pdf", serviceName: "SheafTools", description: "Convert HTML pages to PDF documents", tags: ["pdf", "conversion"] },
  { key: "speech", serviceName: "VoxOut", description: "Text to speech synthesis with natural voices", tags: ["tts", "audio"] },
  { key: "transcribe", serviceName: "EarWorm", description: "Transcribe audio recordings to text with timestamps", tags: ["stt", "audio", "transcription"] },
  { key: "wallet-risk", serviceName: "ChainSieve", description: "Risk score for blockchain wallet addresses based on transaction history", tags: ["risk", "blockchain", "compliance"] },
  { key: "gas", serviceName: "FeeOracle", description: "Current network fee estimates across blockchains", tags: ["blockchain", "fees"] },
  { key: "nft-meta", serviceName: "TokenLore", description: "NFT collection metadata and ownership lookup", tags: ["nft", "blockchain"] },
  { key: "shipping", serviceName: "ParcelPath", description: "Shipping rate quotes and package tracking across carriers", tags: ["shipping", "logistics"] },
  { key: "flights", serviceName: "AeroFare", description: "Flight availability and fare search", tags: ["flights", "travel"] },
  { key: "recipes", serviceName: "PanServer", description: "Recipe search by ingredients and dietary constraints", tags: ["food", "recipes"] },
  { key: "ip-geo", serviceName: "WhereWire", description: "IP address geolocation with city and timezone", tags: ["ip", "geolocation"] },
];

/** query → graded relevance by service key (2 target, 1 substitute) */
const QUERIES: Array<{ q: string; rel: Record<string, number> }> = [
  { q: "will it rain tomorrow in Lisbon", rel: { weather: 2 } },
  { q: "turn this address into GPS coordinates", rel: { geocode: 2, "ip-geo": 1 } },
  { q: "how many euros is 100 dollars right now", rel: { fx: 2, stocks: 1 } },
  { q: "current price of AAPL shares", rel: { stocks: 2, fx: 1 } },
  { q: "translate a contract from german to portuguese", rel: { translate: 2 } },
  { q: "is this customer review positive or negative", rel: { sentiment: 2 } },
  { q: "read the text out of this scanned invoice", rel: { ocr: 2, transcribe: 1 } },
  { q: "check if these signup emails are real", rel: { "email-verify": 2, "phone-verify": 1 } },
  { q: "is this EU tax identifier valid", rel: { vat: 2, company: 1 } },
  { q: "who are the directors of this company", rel: { company: 2 } },
  { q: "latest headlines about stablecoin regulation", rel: { news: 2, "web-search": 1 } },
  { q: "make an mp3 that reads this paragraph aloud", rel: { speech: 2, transcribe: 1 } },
  { q: "get the words from this podcast episode", rel: { transcribe: 2, speech: 1 } },
  { q: "should I trust this wallet address", rel: { "wallet-risk": 2, "nft-meta": 1 } },
  { q: "how much to ship a 2kg box to Berlin", rel: { shipping: 2 } },
  { q: "cheap flights to Buenos Aires next month", rel: { flights: 2 } },
];

function seed(): CatalogStore {
  const store = new CatalogStore();
  for (const svc of SERVICES) {
    store.upsert({
      entry: {
        key: `stellar:testnet|GSELLER|https://api.example.com/${svc.key}`,
        resource: `https://api.example.com/${svc.key}`,
        type: "http",
        x402Version: 2,
        network: "stellar:testnet",
        payTo: "GSELLER",
        scheme: "exact",
        accepts: [],
        description: svc.description,
        serviceName: svc.serviceName,
        tags: svc.tags,
      },
      txHash: `tx-${svc.key}`,
    });
  }
  return store;
}

function keyOf(resource: string): string {
  return resource.split("/").at(-1)!;
}

function ndcgAt10(ranked: string[], rel: Record<string, number>): number {
  const dcg = ranked.slice(0, 10).reduce((sum, key, i) => sum + (rel[key] ?? 0) / Math.log2(i + 2), 0);
  const ideal = Object.values(rel).sort((a, b) => b - a);
  const idcg = ideal.slice(0, 10).reduce((sum, g, i) => sum + g / Math.log2(i + 2), 0);
  return idcg ? dcg / idcg : 0;
}

/** Naive baseline: rank by count of query words appearing as substrings. */
function substringRank(query: string, services: Service[]): string[] {
  const words = query.toLowerCase().split(/\s+/);
  return services
    .map((svc) => {
      const hay = `${svc.serviceName} ${svc.description} ${svc.tags.join(" ")}`.toLowerCase();
      return { key: svc.key, score: words.filter((w) => hay.includes(w)).length };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.key);
}

const store = seed();
const hybrid = process.env.EMBEDDINGS === "local";
const engine = new SearchEngine(store, hybrid ? new LocalEmbeddingProvider() : undefined);
await engine.ready();

let bm25Ndcg = 0, bm25Hit1 = 0, baseNdcg = 0, baseHit1 = 0;
const rows: string[] = [];
for (const { q, rel } of QUERIES) {
  const bm25 = (await engine.search({ query: q, limit: 10 })).items.map((e) => keyOf(e.resource));
  const base = substringRank(q, SERVICES);
  const nB = ndcgAt10(bm25, rel), nS = ndcgAt10(base, rel);
  bm25Ndcg += nB; baseNdcg += nS;
  const target = Object.entries(rel).find(([, g]) => g === 2)![0];
  if (bm25[0] === target) bm25Hit1++;
  if (base[0] === target) baseHit1++;
  rows.push(`${nB.toFixed(2)}  ${nS.toFixed(2)}  ${q}`);
}

const n = QUERIES.length;
console.log("nDCG@10 per query (bm25  baseline  query):");
for (const row of rows) console.log("  " + row);
console.log(`\ncatalog: ${SERVICES.length} services · queries: ${n}`);
console.log(`${hybrid ? "hybrid BM25+MiniLM":"BM25 (shipped)"}:  nDCG@10 = ${(bm25Ndcg / n).toFixed(3)}   hit@1 = ${bm25Hit1}/${n}`);
console.log(`substring baseline:  nDCG@10 = ${(baseNdcg / n).toFixed(3)}   hit@1 = ${baseHit1}/${n}`);
