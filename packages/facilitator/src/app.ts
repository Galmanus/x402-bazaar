/**
 * Facilitator HTTP app. Wire shapes mirror what @x402/core's
 * HTTPFacilitatorClient actually sends (POST /verify, POST /settle with
 * {x402Version, paymentPayload, paymentRequirements}; GET /supported), so any
 * existing x402 seller middleware works against this service unchanged.
 * POST /supported is also accepted for OZ-client compatibility.
 *
 * The scheme objects are injected (real: ExactStellarScheme from
 * @x402/stellar/exact/facilitator; tests: stub) — this app never reimplements
 * verify/settle.
 */
import express, { type Express, type Request, type Response } from "express";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import {
  CatalogStore,
  SearchEngine,
  ingestSettledPayment,
  readCredentialExtension,
  type CatalogEntry,
  type CredentialVerifier,
  type IngestOutcome,
} from "@x402-bazaar/catalog";

/** The subset of SchemeNetworkFacilitator this app needs. */
export interface FacilitatorScheme {
  scheme: string;
  caipFamily: string;
  verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<unknown>;
  settle(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
  ): Promise<{ success: boolean; transaction?: string; payer?: string; [k: string]: unknown }>;
  getExtra(network: string): Record<string, unknown> | undefined;
  getSigners(network: string): string[];
}

export interface AppDeps {
  /** network id (e.g. "stellar:testnet") → scheme facilitator */
  schemes: Map<string, FacilitatorScheme>;
  store: CatalogStore;
  engine: SearchEngine;
  /**
   * Optional anonymous-credential verifier. When set, a settled payment
   * carrying a valid credential proof contributes its nullifier to
   * Sybil-resistant provenance (distinctCredentialHolders). Absent = today's
   * behavior, unchanged.
   */
  credentialVerifier?: CredentialVerifier;
  x402Version?: number;
}

export function buildApp({ schemes, store, engine, credentialVerifier, x402Version = 2 }: AppDeps): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, networks: [...schemes.keys()], catalogSize: store.all().length });
  });

  const supported = (_req: Request, res: Response) => {
    const kinds = [...schemes.entries()].map(([network, scheme]) => ({
      x402Version,
      scheme: scheme.scheme,
      network,
      extra: scheme.getExtra(network),
    }));
    const signers: Record<string, string[]> = {};
    for (const [network, scheme] of schemes) signers[network] = scheme.getSigners(network);
    res.json({ kinds, extensions: ["bazaar"], signers });
  };
  app.get("/supported", supported);
  app.post("/supported", supported);

  app.post("/verify", async (req, res) => {
    const parsed = parseBody(req, res);
    if (!parsed) return;
    const scheme = findScheme(schemes, parsed.requirements);
    if (!scheme) return unsupportedNetwork(res, parsed.requirements);
    try {
      res.json(await scheme.verify(parsed.payload, parsed.requirements));
    } catch (err) {
      res.status(500).json({ isValid: false, invalidReason: `verify error: ${(err as Error).message}` });
    }
  });

  app.post("/settle", async (req, res) => {
    const parsed = parseBody(req, res);
    if (!parsed) return;
    const scheme = findScheme(schemes, parsed.requirements);
    if (!scheme) return unsupportedNetwork(res, parsed.requirements);
    try {
      const result = await scheme.settle(parsed.payload, parsed.requirements);
      if (result.success) {
        // Cataloging is best-effort and must never fail a settlement.
        let outcome: IngestOutcome;
        try {
          // Optional credential gate: verify (never trust a client-supplied
          // nullifier), and only if it validates does it count toward
          // Sybil-resistant provenance. Verification failure never fails the
          // settlement — the payment already happened.
          let credentialNullifier: string | undefined;
          if (credentialVerifier && readCredentialExtension(parsed.payload)) {
            try {
              const cred = await credentialVerifier.verify(parsed.payload, parsed.requirements);
              credentialNullifier = cred?.nullifier;
            } catch {
              credentialNullifier = undefined;
            }
          }
          outcome = ingestSettledPayment(store, parsed.payload, parsed.requirements, {
            txHash: result.transaction,
            payer: result.payer ?? payerFromPayload(parsed.payload),
            credentialNullifier,
          });
          if (outcome.status === "cataloged") engine.rebuild();
        } catch (err) {
          outcome = { status: "rejected", reason: (err as Error).message };
        }
        res.setHeader(
          "EXTENSION-RESPONSES",
          Buffer.from(
            JSON.stringify({ bazaar: { status: outcome.status, reason: outcome.reason } }),
          ).toString("base64"),
        );
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, errorReason: `settle error: ${(err as Error).message}` });
    }
  });

  app.get("/discovery/resources", (req, res) => {
    const q = req.query;
    const { items, total, limit, offset } = store.list({
      type: str(q.type),
      payTo: str(q.payTo),
      scheme: str(q.scheme),
      network: str(q.network),
      extensions: str(q.extensions),
      limit: num(q.limit),
      offset: num(q.offset),
    });
    res.json({
      x402Version,
      items: items.map(toDiscoveryResource),
      pagination: { limit, offset, total },
    });
  });

  app.get("/discovery/search", async (req, res) => {
    const q = req.query;
    const query = str(q.query);
    if (!query) {
      res.status(400).json({ error: "query parameter is required" });
      return;
    }
    const page = await engine.search({
      query,
      type: str(q.type),
      payTo: str(q.payTo),
      scheme: str(q.scheme),
      network: str(q.network),
      extensions: str(q.extensions),
      limit: num(q.limit),
      cursor: str(q.cursor),
    });
    res.json({
      x402Version,
      resources: page.items.map(toDiscoveryResource),
      nextCursor: page.nextCursor,
      partialResults: page.partialResults,
      total: page.total,
    });
  });

  return app;
}

function parseBody(
  req: Request,
  res: Response,
): { payload: PaymentPayload; requirements: PaymentRequirements } | undefined {
  const body = req.body as {
    x402Version?: number;
    paymentPayload?: PaymentPayload;
    paymentRequirements?: PaymentRequirements;
  };
  if (!body?.paymentPayload || !body?.paymentRequirements) {
    res.status(400).json({ error: "expected {x402Version, paymentPayload, paymentRequirements}" });
    return undefined;
  }
  return { payload: body.paymentPayload, requirements: body.paymentRequirements };
}

function findScheme(
  schemes: Map<string, FacilitatorScheme>,
  requirements: PaymentRequirements,
): FacilitatorScheme | undefined {
  const exact = schemes.get(requirements.network);
  if (exact && exact.scheme === requirements.scheme) return exact;
  for (const [network, scheme] of schemes) {
    if (scheme.scheme !== requirements.scheme) continue;
    const family = scheme.caipFamily.replace(/\*$/, "");
    if (requirements.network.startsWith(family) && network.startsWith(family)) return scheme;
  }
  return undefined;
}

function unsupportedNetwork(res: Response, requirements: PaymentRequirements): void {
  res.status(400).json({
    isValid: false,
    invalidReason: `unsupported scheme/network: ${requirements.scheme}/${requirements.network}`,
  });
}

function payerFromPayload(payload: PaymentPayload): string | undefined {
  const inner = (payload as { payload?: Record<string, unknown> }).payload;
  const from = inner?.from ?? inner?.payer;
  return typeof from === "string" ? from : undefined;
}

export function toDiscoveryResource(entry: CatalogEntry): Record<string, unknown> {
  return {
    resource: entry.resource,
    type: entry.type,
    x402Version: entry.x402Version,
    accepts: entry.accepts,
    lastUpdated: entry.lastUpdated,
    description: entry.description,
    mimeType: entry.mimeType,
    serviceName: entry.serviceName,
    tags: entry.tags,
    iconUrl: entry.iconUrl,
    extensions: {
      ...(entry.extensions ?? {}),
      // Provenance so rankers/buyers can discount self-dealing volume
      // (21.2% of x402 settlements on Base measured fictitious, arXiv:2607.12575).
      "x402-bazaar/provenance": {
        settleCount: entry.settleCount,
        distinctPayers: entry.distinctPayers,
        // Sybil-resistant when payers attach an anonymous credential proof
        // (bounded by the association set, not by keypair count). 0 otherwise.
        distinctCredentialHolders: entry.distinctCredentialHolders,
        firstSettleTx: entry.firstSettleTx,
        lastSettleTx: entry.lastSettleTx,
      },
    },
  };
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length ? value : undefined;
}

function num(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : undefined;
  return n !== undefined && Number.isFinite(n) ? n : undefined;
}
