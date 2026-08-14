// Remote MCP endpoint — any MCP client (Claude Code, Cursor, Claude Desktop
// via mcp-remote) can discover the Bazaar catalog with a single URL:
//   https://x402-bazaar-web-u87t.vercel.app/api/mcp
//
// Read-only by design: search/list/get only. `paid_call` signs with the
// buyer's secret key, so it stays in the LOCAL stdio server
// (packages/mcp-discovery) — a private key never belongs in a shared
// remote MCP server.
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { SERVICES, toResource, search, list, type Service } from "../../../lib/data";

function summarize(s: Service) {
  const a = s.accepts[0];
  return {
    resource: s.resource,
    type: s.type,
    serviceName: s.serviceName,
    description: s.description,
    tags: s.tags,
    price: a ? { amount: a.amount, asset: a.asset, network: a.network } : undefined,
    provenance: s.provenance,
  };
}

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_services",
      {
        title: "Search the x402 Bazaar",
        description:
          "Search the x402 bazaar catalog with a natural-language query. Returns ranked, payable services with price and on-chain provenance (settle count, distinct payers, tx hashes).",
        inputSchema: z.object({
          query: z.string().describe("what you need, in natural language"),
          network: z.string().optional().describe("CAIP-2 filter, e.g. stellar:pubnet"),
        }),
      },
      async ({ query, network }) => {
        const hits = search(query).filter((s) => !network || s.network === network);
        return json({ total: hits.length, services: hits.map(summarize) });
      },
    );

    server.registerTool(
      "list_services",
      {
        title: "Browse the x402 Bazaar",
        description:
          "Browse the x402 bazaar catalog. Use search_services when you know what you need.",
        inputSchema: z.object({
          network: z.string().optional().describe("CAIP-2 filter, e.g. stellar:testnet"),
          type: z.enum(["http", "mcp"]).optional(),
        }),
      },
      async ({ network, type }) => {
        const items = list(network, type);
        return json({ total: items.length, services: items.map(summarize) });
      },
    );

    server.registerTool(
      "get_service",
      {
        title: "Get one Bazaar service",
        description:
          "Full x402 detail for one cataloged service by resource URL: payment requirements (scheme, network, amount, asset, payTo, sponsored fees) and provenance.",
        inputSchema: z.object({
          resource: z.string().describe("resource URL as returned by search/list"),
        }),
      },
      async ({ resource }) => {
        const hit = SERVICES.find((s) => s.resource === resource);
        return hit
          ? json(toResource(hit))
          : { content: [{ type: "text" as const, text: `not cataloged: ${resource}` }], isError: true };
      },
    );
  },
  {
    serverInfo: { name: "x402-bazaar", version: "0.1.0" },
  },
);

export { handler as GET, handler as POST, handler as DELETE };
