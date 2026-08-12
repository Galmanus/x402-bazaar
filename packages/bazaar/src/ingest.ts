/**
 * Cataloging pipeline: settled payment → validated catalog entry.
 *
 * Uses upstream helpers from @x402/extensions/bazaar so validation semantics
 * (routeTemplate rules incl. percent-decoding before traversal checks,
 * metadata sanitization) stay in lockstep with the spec. Cataloging is
 * best-effort: it never fails a settlement; the outcome is reported to the
 * client via the EXTENSION-RESPONSES header.
 */
import {
  extractDiscoveryInfo,
  isValidRouteTemplate,
  type DiscoveredResource,
} from "@x402/extensions/bazaar";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import type { CatalogStore, CatalogEntry } from "./store.ts";

export interface IngestOutcome {
  status: "cataloged" | "skipped" | "rejected";
  /** allowlisted for EXTENSION-RESPONSES client logging */
  reason?: string;
  key?: string;
}

/** Strip query and hash, per upstream URL normalization for catalog entries. */
export function normalizeResourceUrl(resource: string): string {
  try {
    const url = new URL(resource);
    return `${url.origin}${url.pathname}`;
  } catch {
    return resource;
  }
}

export function catalogKey(network: string, payTo: string, template: string): string {
  return `${network}|${payTo}|${template}`;
}

export function ingestSettledPayment(
  store: CatalogStore,
  paymentPayload: PaymentPayload,
  requirements: PaymentRequirements,
  opts: { txHash?: string; payer?: string; credentialNullifier?: string } = {},
): IngestOutcome {
  let discovered: DiscoveredResource | null;
  try {
    discovered = extractDiscoveryInfo(paymentPayload, requirements, true);
  } catch (err) {
    return { status: "rejected", reason: `invalid discovery extension: ${(err as Error).message}` };
  }
  if (!discovered) return { status: "skipped", reason: "no discovery extension" };

  const isMcp = "toolName" in discovered;
  const normalized = normalizeResourceUrl(discovered.resourceUrl);

  // routeTemplate is the catalog key contract. Invalid template (traversal,
  // scheme injection, bad charset — checked post percent-decode by upstream)
  // falls back to the concrete URL path, per spec.
  let template = normalized;
  const raw = !isMcp ? (discovered as { routeTemplate?: string }).routeTemplate : undefined;
  if (raw !== undefined && isValidRouteTemplate(raw)) {
    try {
      template = `${new URL(discovered.resourceUrl).origin}${raw}`;
    } catch {
      template = raw;
    }
  }
  if (isMcp) {
    template = `${normalized}#${(discovered as { toolName: string }).toolName}`;
  }

  const entry: Omit<
    CatalogEntry,
    | "lastUpdated"
    | "settleCount"
    | "distinctPayers"
    | "distinctCredentialHolders"
    | "firstSettleTx"
    | "lastSettleTx"
  > = {
    key: catalogKey(requirements.network, requirements.payTo, template),
    resource: normalized,
    type: isMcp ? "mcp" : "http",
    x402Version: discovered.x402Version,
    network: requirements.network,
    payTo: requirements.payTo,
    scheme: requirements.scheme,
    routeTemplate: raw !== undefined && isValidRouteTemplate(raw) ? raw : undefined,
    accepts: [requirements],
    description: discovered.description,
    mimeType: discovered.mimeType,
    serviceName: discovered.serviceName,
    tags: discovered.tags,
    iconUrl: discovered.iconUrl,
    extensions: discovered.extensions,
    discoveryInfo: discovered.discoveryInfo,
  };

  try {
    const saved = store.upsert({
      entry,
      txHash: opts.txHash,
      payer: opts.payer,
      credentialNullifier: opts.credentialNullifier,
    });
    return { status: "cataloged", key: saved.key };
  } catch (err) {
    return { status: "rejected", reason: `store error: ${(err as Error).message}` };
  }
}
