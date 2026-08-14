// Smoke: connect to the REMOTE (streamable HTTP) MCP endpoint and search.
// Usage: npx tsx scripts/mcp-smoke-remote.mts [url]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const url = process.argv[2] ?? "http://localhost:3777/api/mcp";
const c = new Client({ name: "smoke-remote", version: "0.0.0" });
await c.connect(new StreamableHTTPClientTransport(new URL(url)));
const tools = await c.listTools();
console.log("tools:", tools.tools.map((x) => x.name).join(", "));
const r: any = await c.callTool({ name: "search_services", arguments: { query: "weather on mainnet" } });
console.log(r.content[0].text.slice(0, 300));
await c.close();
