import { describe, expect, test } from "vitest";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { CatalogStore } from "../src/store.ts";
import { ingestSettledPayment } from "../src/ingest.ts";
import { SearchEngine } from "../src/search.ts";
import { TrustedNullifierVerifier, readCredentialExtension } from "../src/credential.ts";

const requirements = {
  scheme: "exact",
  network: "stellar:testnet",
  amount: "10000",
  asset: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  payTo: "GRECIPIENT",
  resource: "https://api.example.com/weather",
  maxTimeoutSeconds: 60,
  extra: {},
} as unknown as PaymentRequirements;

function payloadWith(extras: Record<string, unknown> = {}): PaymentPayload {
  const ext = declareDiscoveryExtension(({
    method: "GET",
    input: { city: "Blumenau" },
    inputSchema: {
      type: "object",
      properties: { city: { type: "string", description: "city name" } },
      required: ["city"],
    },
    output: { example: { temp: 25 } },
  }) as never);
  return {
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
    extensions: ext,
    ...extras,
  } as unknown as PaymentPayload;
}

describe("ingestSettledPayment", () => {
  test("catalogs a valid v2 discovery extension with provenance", () => {
    const store = new CatalogStore();
    const outcome = ingestSettledPayment(store, payloadWith(), requirements, {
      txHash: "tx1",
      payer: "GPAYER1",
    });
    expect(outcome.status).toBe("cataloged");
    const entry = store.get(outcome.key!);
    expect(entry).toBeDefined();
    expect(entry!.resource).toBe("https://api.example.com/weather");
    expect(entry!.type).toBe("http");
    expect(entry!.serviceName).toBe("WeatherCo");
    expect(entry!.settleCount).toBe(1);
    expect(entry!.distinctPayers).toBe(1);
    expect(entry!.firstSettleTx).toBe("tx1");
  });

  test("repeat settlements from the same payer do not inflate distinctPayers", () => {
    const store = new CatalogStore();
    for (let i = 0; i < 3; i++) {
      ingestSettledPayment(store, payloadWith(), requirements, { txHash: `tx${i}`, payer: "GPAYER1" });
    }
    ingestSettledPayment(store, payloadWith(), requirements, { txHash: "tx9", payer: "GPAYER2" });
    const [entry] = store.all();
    expect(entry.settleCount).toBe(4);
    expect(entry.distinctPayers).toBe(2);
    expect(entry.lastSettleTx).toBe("tx9");
    expect(entry.firstSettleTx).toBe("tx0");
  });

  test("payment without discovery extension is skipped, not an error", () => {
    const store = new CatalogStore();
    const payload = payloadWith({ extensions: undefined });
    const outcome = ingestSettledPayment(store, payload, requirements);
    expect(outcome.status).toBe("skipped");
    expect(store.all()).toHaveLength(0);
  });

  test("malicious routeTemplate (traversal) is not used as catalog key", () => {
    const store = new CatalogStore();
    const payload = payloadWith();
    (payload as unknown as { extensions: Record<string, Record<string, unknown>> }).extensions.bazaar.routeTemplate =
      "/users/../admin";
    const outcome = ingestSettledPayment(store, payload, requirements, { txHash: "tx1" });
    expect(outcome.status).toBe("cataloged");
    const [entry] = store.all();
    expect(entry.routeTemplate).toBeUndefined();
    expect(entry.key).not.toContain("..");
  });

  test("valid routeTemplate consolidates concrete URLs into one entry", () => {
    const store = new CatalogStore();
    for (const id of ["123", "456"]) {
      const payload = payloadWith();
      const p = payload as unknown as {
        resource: { url: string };
        extensions: Record<string, Record<string, unknown>>;
      };
      p.resource.url = `https://api.example.com/users/${id}`;
      p.extensions.bazaar.routeTemplate = "/users/:userId";
      ingestSettledPayment(store, payload, requirements, { txHash: `tx-${id}` });
    }
    expect(store.all()).toHaveLength(1);
    expect(store.all()[0].routeTemplate).toBe("/users/:userId");
    expect(store.all()[0].settleCount).toBe(2);
  });
});

describe("Sybil-resistant credential provenance", () => {
  test("distinctCredentialHolders counts nullifiers, not addresses", () => {
    const store = new CatalogStore();
    // Two different addresses (Sybil), SAME credential holder → 1 holder, 2 payers.
    ingestSettledPayment(store, payloadWith(), requirements, {
      txHash: "tx1",
      payer: "GADDR1",
      credentialNullifier: "nullifierA",
    });
    ingestSettledPayment(store, payloadWith(), requirements, {
      txHash: "tx2",
      payer: "GADDR2",
      credentialNullifier: "nullifierA",
    });
    const [e1] = store.all();
    expect(e1.distinctPayers).toBe(2);
    expect(e1.distinctCredentialHolders).toBe(1); // the Sybil is collapsed

    // A genuinely distinct holder bumps it to 2.
    ingestSettledPayment(store, payloadWith(), requirements, {
      txHash: "tx3",
      payer: "GADDR3",
      credentialNullifier: "nullifierB",
    });
    expect(store.all()[0].distinctCredentialHolders).toBe(2);
  });

  test("no credential → distinctCredentialHolders stays 0, behavior unchanged", () => {
    const store = new CatalogStore();
    ingestSettledPayment(store, payloadWith(), requirements, { txHash: "tx1", payer: "GADDR1" });
    expect(store.all()[0].distinctCredentialHolders).toBe(0);
  });

  test("TrustedNullifierVerifier reads a nullifier from the credential extension", () => {
    const verifier = new TrustedNullifierVerifier();
    const payload = payloadWith({
      extensions: { "pq402/credential": { nullifier: "n1", proof: "…" } },
    });
    expect(readCredentialExtension(payload)).toEqual({ nullifier: "n1", proof: "…" });
    expect(verifier.verify(payload)).toEqual({ nullifier: "n1" });
    // Absent credential → declines.
    expect(verifier.verify(payloadWith())).toBeNull();
  });
});

describe("CatalogStore.list filters", () => {
  function seed(store: CatalogStore, key: string, over: Partial<Parameters<CatalogStore["upsert"]>[0]["entry"]>) {
    store.upsert({
      entry: {
        key,
        resource: `https://api.example.com/${key}`,
        type: "http",
        x402Version: 2,
        network: "stellar:testnet",
        payTo: "GRECIPIENT",
        scheme: "exact",
        accepts: [requirements],
        ...over,
      },
    });
  }

  test("type/payTo/network/extensions filters and pagination", () => {
    const store = new CatalogStore();
    seed(store, "a", {});
    seed(store, "b", { type: "mcp" });
    seed(store, "c", { payTo: "GOTHER", extensions: { bazaar: {} } });

    expect(store.list({ type: "mcp" }).items.map((e) => e.key)).toEqual(["b"]);
    expect(store.list({ payTo: "GOTHER" }).items.map((e) => e.key)).toEqual(["c"]);
    expect(store.list({ extensions: "bazaar" }).items.map((e) => e.key)).toEqual(["c"]);
    const page = store.list({ limit: 2, offset: 2 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(1);
  });
});

describe("SearchEngine", () => {
  test("finds by natural language, paginates with cursor, flags catalog drift", async () => {
    const store = new CatalogStore();
    ingestSettledPayment(store, payloadWith(), requirements, { txHash: "tx1", payer: "GPAYER1" });
    const engine = new SearchEngine(store);

    const page = await engine.search({ query: "what is the weather like" });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].serviceName).toBe("WeatherCo");
    expect(page.partialResults).toBe(false);
    expect(page.nextCursor).toBeUndefined();

    // cursor from a different query restarts and flags partial
    const drifted = await engine.search({ query: "weather", cursor: "not-a-cursor" });
    expect(drifted.partialResults).toBe(true);
  });

  test("filters compose with ranking", async () => {
    const store = new CatalogStore();
    ingestSettledPayment(store, payloadWith(), requirements, { txHash: "tx1" });
    const engine = new SearchEngine(store);
    expect((await engine.search({ query: "weather", network: "stellar:pubnet" })).items).toHaveLength(0);
    expect((await engine.search({ query: "weather", network: "stellar:testnet" })).items).toHaveLength(1);
  });
});
