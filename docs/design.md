# x402-bazaar — design

Date: 2026-08-11 · Status: approved by operator (option B, 2026-08-10 conversation) · License: Apache-2.0

## What this is

A self-hostable x402 facilitator for Stellar (`/verify`, `/settle`, `/supported`) built on the
Apache-2.0 `@x402/stellar` package, plus a Stellar-native **Bazaar discovery layer**
(`GET /discovery/resources`, `GET /discovery/search`) with automatic cataloging and an MCP
discovery server. Target: SCF #45 Build Award RFP "X402 Facilitator with Bazaar".

## Market map and the pain (verified sources)

- **Existing Bazaars are EVM-only**: Coinbase CDP facilitator, PayAI, 402.ad (39k indexed
  services), agent-tools.cloud, Disvr. None speak Stellar (`stellar:testnet` / `stellar:pubnet`,
  Soroban auth entries). This RFP exists because the hole is real.
- **The measured pain is catalog trust, not payment rails**: population-scale measurement of
  x402 on Base (arXiv:2607.12575) found 136.7M settlements / $44.1M over 280 days, of which
  21.2% fictitious and 63.8% internal to linked clusters; provably-real service revenue is
  bounded below by ~$188K. A catalog that treats "has settlements" as quality inherits that junk.
- **Naive semantic search fails on tools**: ToolRet (arXiv:2503.01763) shows retrievers that
  are strong on standard IR benchmarks degrade on tool retrieval; SciRet-class studies
  (arXiv:2608.03860) show off-domain cross-encoder rerankers can *reduce* precision.

## Design principle

Simplicity as the last degree of sophistication. Zero-dependency default path, standard
wire shapes reused verbatim from upstream, intelligence concentrated where the RFP scores:
catalog integrity and measurable search quality.

## Decisions

1. **Build on upstream, never reimplement.** `ExactStellarScheme` from
   `@x402/stellar/exact/facilitator` does verify (XDR decode, auth-entry validation,
   simulation, `maxTransactionFeeStroops` ceiling) and settle (fee-bump signer, polling).
   Bazaar helpers (`extractDiscoveryInfo`, `isValidRouteTemplate`,
   `sanitizeResourceServiceMetadata`, response types) come from `@x402/extensions/bazaar`.
   Our code is: HTTP shell, signer/config management, catalog store, search, integrity.
2. **Wire conformance is copied, not interpreted.** Endpoints mirror what
   `HTTPFacilitatorClient` (in `@x402/core`) actually sends: `POST /verify` and
   `POST /settle` with `{x402Version, paymentPayload, paymentRequirements}`,
   `GET /supported` (POST also accepted for OZ-client compat). Discovery responses use the
   `DiscoveryResourcesResponse` / `SearchDiscoveryResourcesResponse` types verbatim.
   Cataloging outcomes are reported via the `EXTENSION-RESPONSES` header (the client
   already logs it).
3. **Storage: `node:sqlite`** (Node ≥22.5, zero external deps; experimental — isolated
   behind a `CatalogStore` interface so swapping to better-sqlite3 is one file).
4. **Search: in-house BM25 as the shipped default.** ~150 lines, field-boosted
   (serviceName/tags/description > schema property names > URL tokens), no model download,
   deterministic, testable. An `EmbeddingProvider` interface exists for hybrid
   BM25+dense+RRF later; it is NOT shipped enabled — evidence above says off-domain dense
   components must be evaluated before trusted. Search quality is an eval artifact
   (nDCG@10 over an agent-query eval set), not an adjective.
5. **Catalog integrity** (the differentiator, informed by arXiv:2607.12575):
   - entries only from **settled** payments the facilitator itself verified (no open
     registration endpoint to spam);
   - `routeTemplate` validated with upstream `isValidRouteTemplate` (percent-decode before
     traversal/scheme checks) — invalid template ⇒ fall back to concrete URL path;
   - catalog key = `(network, payTo, routeTemplate || normalized resource URL)`;
   - per-entry provenance: first/last settled tx hash, settle count, distinct payer count —
     exposed so rankers and buyers can discount self-dealing volume;
   - metadata sanitized with upstream `sanitizeResourceServiceMetadata`.
6. **Non-custodial, fees sponsored.** Facilitator signers only wrap/submit; payer signs auth
   entries; `extra.areFeesSponsored: true` advertised from the scheme itself. Any SEP-41
   asset, USDC default, 7 decimals. CAIP-2 `stellar:testnet` + `stellar:pubnet`, both
   registrable simultaneously.

## Architecture

```
packages/
  bazaar/        no HTTP. CatalogStore (node:sqlite) · BM25 index · ingest()
                 (extractDiscoveryInfo → validate → upsert + provenance)
  facilitator/   express app. /verify /settle /supported (+POST) ·
                 /discovery/resources /discovery/search · DI: schemes map + store
                 injected, so tests run with a stub scheme, no network.
  mcp-discovery/ (phase 2) MCP server: search + get + paid-call tools
```

Data flow: seller middleware → POST /settle → ExactStellarScheme.settle() on-chain →
on success, ingest discovery extension from the PaymentPayload → catalog upsert →
`EXTENSION-RESPONSES: {"bazaar": {...outcome}}` on the settle response.

Error handling: verify/settle errors pass through upstream `VerifyResponse`/`SettleResponse`
shapes untouched; malformed discovery extensions never fail a settlement (cataloging is
best-effort, outcome reported in the header); store failures log and degrade to no-catalog.

## Testing

- Unit: BM25 ranking properties, routeTemplate fallback, filter semantics, cursor pagination,
  provenance counters (vitest, no network).
- Integration: express app with stub scheme → full verify/settle/catalog/discover/search loop.
- Acceptance (manual, testnet): pq402 paywall + CLI pointed at this facilitator; success =
  settled tx hash on testnet + resource appears in /discovery/resources.

## Out of scope tonight (roadmap, honest)

`upto` scheme + `scheme_upto_stellar.md`, mainnet deploy, third-party security review,
hybrid dense retrieval + published eval set, MCP paid-call tool, monitoring/runbook.
