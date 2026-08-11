/**
 * Integration tests: the express app with a stub scheme — full
 * verify → settle → catalog → discover → search loop, no network.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { Server } from "node:http";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { CatalogStore, SearchEngine } from "@x402-bazaar/catalog";
import { buildApp, type FacilitatorScheme } from "../src/app.ts";

const stubScheme: FacilitatorScheme = {
  scheme: "exact",
  caipFamily: "stellar:*",
  async verify(_payload, requirements) {
    return { isValid: true, payer: "GPAYER1", requirements: requirements.network };
  },
  async settle() {
    return { success: true, transaction: "txhash-1", network: "stellar:testnet", payer: "GPAYER1" };
  },
  getExtra() {
    return { areFeesSponsored: true };
  },
  getSigners() {
    return ["GSIGNER1"];
  },
};

const requirements = {
  scheme: "exact",
  network: "stellar:testnet",
  amount: "10000",
  asset: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  payTo: "GRECIPIENT",
  resource: "https://api.example.com/weather",
  maxTimeoutSeconds: 60,
  extra: {},
};

const paymentPayload = {
  x402Version: 2,
  scheme: "exact",
  network: "stellar:testnet",
  payload: { from: "GPAYER1" },
  resource: {
    url: "https://api.example.com/weather?city=x",
    description: "Current weather data",
    mimeType: "application/json",
    serviceName: "WeatherCo",
    tags: ["weather", "forecast"],
  },
  extensions: declareDiscoveryExtension(({
    method: "GET",
    input: { city: "Blumenau" },
    inputSchema: {
      type: "object",
      properties: { city: { type: "string", description: "city name" } },
      required: ["city"],
    },
    output: { example: { temp: 25 } },
  }) as never),
};

let server: Server;
let base: string;

beforeAll(async () => {
  const store = new CatalogStore();
  const app = buildApp({
    schemes: new Map([["stellar:testnet", stubScheme]]),
    store,
    engine: new SearchEngine(store),
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});

afterAll(() => server?.close());

describe("facilitator endpoints", () => {
  test("GET /supported advertises kind, areFeesSponsored, bazaar extension, signers", async () => {
    const res = await fetch(`${base}/supported`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kinds).toEqual([
      { x402Version: 2, scheme: "exact", network: "stellar:testnet", extra: { areFeesSponsored: true } },
    ]);
    expect(body.extensions).toContain("bazaar");
    expect(body.signers["stellar:testnet"]).toEqual(["GSIGNER1"]);
    // OZ-client compat
    expect((await fetch(`${base}/supported`, { method: "POST" })).status).toBe(200);
  });

  test("POST /verify round-trips the wire shape HTTPFacilitatorClient sends", async () => {
    const res = await fetch(`${base}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x402Version: 2, paymentPayload, paymentRequirements: requirements }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).isValid).toBe(true);
  });

  test("POST /verify on unsupported network → 400 with invalidReason", async () => {
    const res = await fetch(`${base}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x402Version: 2,
        paymentPayload,
        paymentRequirements: { ...requirements, network: "eip155:8453" },
      }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).isValid).toBe(false);
  });

  test("POST /settle settles, catalogs, and reports via EXTENSION-RESPONSES", async () => {
    const res = await fetch(`${base}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x402Version: 2, paymentPayload, paymentRequirements: requirements }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    const header = res.headers.get("EXTENSION-RESPONSES");
    expect(header).toBeTruthy();
    const decoded = JSON.parse(Buffer.from(header!, "base64").toString());
    expect(decoded.bazaar.status).toBe("cataloged");
  });

  test("GET /discovery/resources lists the cataloged resource with spec pagination", async () => {
    const res = await fetch(`${base}/discovery/resources?network=stellar:testnet&type=http`);
    const body = await res.json();
    expect(body.x402Version).toBe(2);
    expect(body.pagination.total).toBe(1);
    const [item] = body.items;
    expect(item.resource).toBe("https://api.example.com/weather");
    expect(item.accepts[0].payTo).toBe("GRECIPIENT");
    expect(item.extensions["x402-bazaar/provenance"].settleCount).toBe(1);
    expect(item.extensions["x402-bazaar/provenance"].lastSettleTx).toBe("txhash-1");
  });

  test("GET /discovery/resources with non-matching filter → empty", async () => {
    const res = await fetch(`${base}/discovery/resources?type=mcp`);
    expect((await res.json()).pagination.total).toBe(0);
  });

  test("GET /discovery/search ranks by natural language query", async () => {
    const res = await fetch(`${base}/discovery/search?query=${encodeURIComponent("weather forecast today")}`);
    const body = await res.json();
    expect(body.resources).toHaveLength(1);
    expect(body.resources[0].serviceName).toBe("WeatherCo");
    expect(body.partialResults).toBe(false);
  });

  test("GET /discovery/search without query → 400", async () => {
    expect((await fetch(`${base}/discovery/search`)).status).toBe(400);
  });
});
