/**
 * MCP discovery server for the x402-bazaar facilitator.
 *
 * Exposes the bazaar to MCP-compatible agents (Claude, Cursor, …) as tools:
 *   search_services  natural-language search over the catalog
 *   list_services    paginated browsing with the spec's filters
 *   get_service      full detail for one resource (schemas, provenance, price)
 *   paid_call        perform an x402 payment and call the resource (requires
 *                    STELLAR_SECRET_KEY; fees are sponsored by the facilitator,
 *                    the account needs the payment asset only)
 *
 * Env: FACILITATOR_URL (default http://localhost:8402),
 *      STELLAR_NETWORK (default stellar:testnet),
 *      STELLAR_SECRET_KEY (only needed for paid_call)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const FACILITATOR = process.env.FACILITATOR_URL ?? "http://localhost:8402";
const NETWORK = process.env.STELLAR_NETWORK ?? "stellar:testnet";

const server = new McpServer({ name: "x402-bazaar-discovery", version: "0.1.0" });

const filterShape = {
  type: z.enum(["http", "mcp"]).optional().describe("resource type filter"),
  network: z.string().optional().describe("CAIP-2 network, e.g. stellar:testnet"),
  payTo: z.string().optional().describe("payment recipient address filter"),
};

server.tool(
  "search_services",
  "Search the x402 bazaar catalog with a natural-language query. Returns ranked, payable services with price and provenance (settle count, distinct payers).",
  {
    query: z.string().describe("what you need, in natural language"),
    limit: z.number().int().min(1).max(50).optional(),
    ...filterShape,
  },
  async ({ query, limit, ...filters }) => {
    const params = new URLSearchParams({ query });
    if (limit) params.set("limit", String(limit));
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    const res = await fetch(`${FACILITATOR}/discovery/search?${params}`);
    if (!res.ok) return errorResult(`search failed: HTTP ${res.status}`);
    const body = (await res.json()) as { resources: Array<Record<string, unknown>>; total: number };
    return jsonResult({
      total: body.total,
      services: body.resources.map(summarize),
    });
  },
);

server.tool(
  "list_services",
  "Browse the x402 bazaar catalog (paginated, filterable). Use search_services when you know what you need.",
  {
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
    ...filterShape,
  },
  async ({ limit, offset, ...filters }) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    const res = await fetch(`${FACILITATOR}/discovery/resources?${params}`);
    if (!res.ok) return errorResult(`list failed: HTTP ${res.status}`);
    const body = (await res.json()) as { items: Array<Record<string, unknown>>; pagination: unknown };
    return jsonResult({ pagination: body.pagination, services: body.items.map(summarize) });
  },
);

server.tool(
  "get_service",
  "Full detail for one cataloged service by resource URL: input/output schemas, payment requirements, provenance.",
  { resource: z.string().describe("resource URL as returned by search/list") },
  async ({ resource }) => {
    const res = await fetch(`${FACILITATOR}/discovery/resources?limit=100`);
    if (!res.ok) return errorResult(`lookup failed: HTTP ${res.status}`);
    const body = (await res.json()) as { items: Array<Record<string, unknown>> };
    const hit = body.items.find((i) => i.resource === resource);
    return hit ? jsonResult(hit) : errorResult(`not cataloged: ${resource}`);
  },
);

server.tool(
  "paid_call",
  "Call an x402-protected HTTP resource, paying automatically with USDC on Stellar via the facilitator (fees sponsored — the wallet needs the payment asset only). Returns the response body and the settlement receipt.",
  {
    url: z.string().describe("full URL to call, including query parameters"),
    method: z.enum(["GET", "POST"]).optional(),
    body: z.string().optional().describe("JSON body for POST"),
  },
  async ({ url, method, body }) => {
    const secret = process.env.STELLAR_SECRET_KEY;
    if (!secret) return errorResult("paid_call requires STELLAR_SECRET_KEY in the MCP server env");
    const signer = createEd25519Signer(secret, NETWORK as never);
    const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [{ network: NETWORK as never, client: new ExactStellarScheme(signer) }],
    });
    const res = await fetchWithPayment(url, {
      method: method ?? "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    });
    const text = await res.text();
    const receiptHeader = res.headers.get("payment-response");
    const receipt = receiptHeader
      ? JSON.parse(Buffer.from(receiptHeader, "base64").toString())
      : undefined;
    return jsonResult({ status: res.status, body: tryJson(text), settlement: receipt });
  },
);

function summarize(item: Record<string, unknown>): Record<string, unknown> {
  const accepts = (item.accepts as Array<Record<string, unknown>>) ?? [];
  const extensions = (item.extensions as Record<string, unknown>) ?? {};
  return {
    resource: item.resource,
    type: item.type,
    serviceName: item.serviceName,
    description: item.description,
    tags: item.tags,
    price: accepts[0]
      ? { amount: accepts[0].amount, asset: accepts[0].asset, network: accepts[0].network }
      : undefined,
    provenance: extensions["x402-bazaar/provenance"],
  };
}

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function tryJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

await server.connect(new StdioServerTransport());
console.error(`x402-bazaar MCP discovery server up — facilitator: ${FACILITATOR}`);
