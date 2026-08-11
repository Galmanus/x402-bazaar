# x402-bazaar

Self-hostable **x402 facilitator for Stellar** with a native **Bazaar discovery layer** —
`/verify`, `/settle`, `/supported` plus `/discovery/resources` and `/discovery/search`,
so AI agents can find, price, and pay for x402-protected services on Stellar.

Built on the Apache-2.0 [`@x402/stellar`](https://www.npmjs.com/package/@x402/stellar)
package (verify/settle are **not** reimplemented) and the upstream
[`@x402/extensions`](https://www.npmjs.com/package/@x402/extensions) bazaar helpers.
Apache-2.0, no copyleft anywhere in the dependency path.

Status: **early development** (started 2026-08-11). What works today is exactly what the
test suite proves — see [Honest state](#honest-state).

## Why

- Every existing x402 Bazaar (Coinbase CDP, PayAI, 402.ad, …) is EVM-only. Stellar has
  facilitators but no discovery layer.
- The measured pain in x402 is **catalog trust**, not payment rails: a population-scale
  measurement on Base ([arXiv:2607.12575](https://arxiv.org/abs/2607.12575)) found 21.2%
  of settlements fictitious and 63.8% internal to linked clusters. A catalog that counts
  settlements as quality inherits that junk. This facilitator catalogs only payments it
  itself settled and exposes per-entry provenance (settle count, **distinct payers**,
  first/last tx hash) so rankers and buyers can discount self-dealing volume.
- Generic semantic search underperforms on tool retrieval
  ([ToolRet, arXiv:2503.01763](https://arxiv.org/abs/2503.01763)). The shipped default is
  a deterministic field-boosted BM25; search quality is an eval artifact, not an adjective.

## Architecture

```
packages/bazaar        catalog + search library (no HTTP)
  store.ts             CatalogStore — node:sqlite, zero external deps
  ingest.ts            settled payment → validated catalog entry (upstream
                       extractDiscoveryInfo + isValidRouteTemplate)
  bm25.ts, search.ts   field-boosted BM25, cursor pagination, partialResults
packages/facilitator   express service
  app.ts               /verify /settle /supported (+POST, OZ-client compat)
                       /discovery/resources /discovery/search /health
  server.ts            wires ExactStellarScheme (real verify/settle) + signers
```

Wire shapes mirror what `@x402/core`'s `HTTPFacilitatorClient` actually sends, so existing
x402 seller middleware works unchanged. Cataloging outcomes are reported via the
`EXTENSION-RESPONSES` header. Fees are sponsored (`extra.areFeesSponsored: true`); the
buyer needs only the payment asset, no XLM. Non-custodial: facilitator signers wrap and
submit, the payer signs auth entries. Any SEP-41 token, USDC by default (7 decimals).
CAIP-2 networks: `stellar:testnet`, `stellar:pubnet`.

## Run

```bash
npm install
npm test              # vitest, no network needed
npm run typecheck

# facilitator (testnet)
SIGNER_SECRET=S... npm start --workspace @x402-bazaar/facilitator
# optional: FEE_BUMP_SECRET=S...  NETWORKS=stellar:testnet,stellar:pubnet
#           RPC_URL=...  DB_PATH=./bazaar.db  PORT=8402
```

## Discovery API

- `GET /discovery/resources` — paginated catalog browsing with the spec's `type`, `payTo`,
  `scheme`, `network`, `extensions`, `limit`, `offset` filters.
- `GET /discovery/search?query=...` — natural-language search, cursor pagination,
  `partialResults` flag.

Resources are cataloged automatically when a settled `PaymentPayload` carries the bazaar
discovery extension. `routeTemplate` is validated with the upstream rules (percent-decode
before traversal/scheme checks); invalid templates fall back to the concrete URL path.

## Honest state

Done and tested (21 tests): facilitator HTTP surface against a stub scheme; catalog
ingest/upsert/provenance; routeTemplate poisoning defense; discovery filters and
pagination; BM25 ranking and cursor semantics.

**Proven live on testnet** (2026-08-11): a real $0.05 USDC purchase through this
facilitator with the standard upstream seller/buyer stack — verify, settle (tx
[`dae9569b…a696`](https://stellar.expert/explorer/testnet/tx/dae9569bc631550c5ae24eec06e6fb58557146a00b7f7b1b92d2e28a591aa696),
ledger 4079722), fees sponsored by the facilitator signer (payer spent USDC only),
automatic cataloging, and the service found via `/discovery/search`. Full evidence and
an upstream interop finding in [docs/CONFORMANCE.md](docs/CONFORMANCE.md).

An **MCP discovery server** (`packages/mcp-discovery`) exposes `search_services`,
`list_services`, `get_service`, and `paid_call` to MCP-compatible agents — the paid_call
run settled on-chain too (see CONFORMANCE.md, run 2).

Not built yet (roadmap): pubnet conformance run, `upto` scheme + `scheme_upto_stellar.md` upstream contribution,
seller/buyer SDK helpers, search eval set + published nDCG results, hybrid dense
retrieval, third-party security review, production runbook/monitoring.

## License

Apache-2.0. Direct dependencies: `@x402/stellar`, `@x402/core`, `@x402/extensions`
(Apache-2.0), `express` (MIT). Storage is Node's built-in `node:sqlite` (experimental API,
isolated behind `CatalogStore`).
