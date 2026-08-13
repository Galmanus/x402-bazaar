```
 ██
 ██▄███▄    ▄█████▄  ████████   ▄█████▄   ▄█████▄   ██▄████
 ██▀  ▀██   ▀ ▄▄▄██      ▄█▀    ▀ ▄▄▄██   ▀ ▄▄▄██   ██▀
 ██    ██  ▄██▀▀▀██    ▄█▀     ▄██▀▀▀██  ▄██▀▀▀██   ██
 ███▄▄██▀  ██▄▄▄███  ▄██▄▄▄▄▄  ██▄▄▄███  ██▄▄▄███   ██
 ▀▀ ▀▀▀     ▀▀▀▀ ▀▀  ▀▀▀▀▀▀▀▀   ▀▀▀▀ ▀▀   ▀▀▀▀ ▀▀   ▀▀

                            ▸ x402 · stellar
```

**The marketplace layer for the agent economy on Stellar. Agents find a service, pay in USDC, and the catalog writes itself — one settled payment at a time.**

![x402-bazaar explainer](assets/x402-bazaar-v2.gif)

<sub>▶️ 22-second explainer — payment flow, the real mainnet settlement, and natural-language search. Full-quality MP4: [assets/x402-bazaar.mp4](assets/x402-bazaar.mp4) · source: [`video/`](video/).</sub>

> **⛓️ Live on Stellar MAINNET.** A real USDC payment settled on `stellar:pubnet`
> through this facilitator — tx
> [`07ecff0b`](https://stellar.expert/explorer/public/tx/07ecff0b17403d4500e230f7f3d23cea347a495f1d3e0a193bb0cc2b0e275dbb),
> ledger 63918501, fees sponsored, non-custodial, auto-cataloged. Both networks
> the RFP names as committed deliverables — testnet **and** mainnet — are live
> and checkable. Full evidence: [docs/CONFORMANCE.md](docs/CONFORMANCE.md).

[![tests](https://img.shields.io/badge/tests-21%20green%20%2B%20typecheck-4c1)](#reproduce)
[![testnet](https://img.shields.io/badge/MAINNET-live%20on%20stellar%3Apubnet-brightgreen)](#seven-facts-you-can-check-in-minutes)
[![search](https://img.shields.io/badge/search-nDCG%4010%200.833%2C%20measured-1f6feb)](#the-numbers)
[![built on](https://img.shields.io/badge/%40x402%2Fstellar-verify%2Fsettle%20NOT%20reimplemented-8A2BE2)](#in-one-breath)
[![license](https://img.shields.io/badge/license-Apache--2.0%2C%20zero%20copyleft-blue)](#license)

> A bazaar is a market that no one designed: stalls appear where buyers already
> walk. This repo is that mechanism for machine commerce on Stellar — every
> settled x402 payment leaves a catalog entry behind it, so the map of paid
> services is drawn by the payments themselves, not by a registration form.

## The problem, in the ecosystem's own words

Stellar's own RFP states the gap plainly: the network needs **"a facilitator
other teams can rely on, live on stellar:testnet and stellar:pubnet"** under
**"a permissive OSI Approved License"**, and **"a working Bazaar for Stellar"**
— because today every x402 discovery layer in existence (Coinbase CDP, PayAI,
402.ad and its 39,058 indexed services) speaks EVM, and the one facilitator
running on Stellar is AGPL-licensed infrastructure you cannot embed.

And there is a second, measured problem that a naive Bazaar would import
wholesale. A population-scale study of x402 on Base
([arXiv:2607.12575](https://arxiv.org/abs/2607.12575)) counted 136,708,672
settlements worth $44.1M over 280 days — and found **21.2% fictitious, 63.8%
internal to linked clusters**, payer/recipient concentration with Gini above
0.98. Settlement count is the one metric an interested party can manufacture
almost for free. A catalog that treats "has settlements" as "is real" becomes a
directory of stalls selling to themselves.

So this repo answers both: a facilitator anyone can self-host under Apache-2.0,
and a catalog with **provenance** — every entry carries its settle count,
**distinct payer count**, and first/last transaction hash, so rankers and
buyers can discount self-dealing volume at query time.

## First on Stellar, not first on Earth

Claims discipline, because a checkable repo should check its own superlatives:

- **Not a first anywhere:** x402 Bazaars run in production on EVM — Coinbase's
  CDP facilitator catalogs and searches, PayAI operates one, 402.ad indexes
  tens of thousands of services. Discovery-for-agents is a crowded field there.
- **First Bazaar for Stellar, to the best of public knowledge:** discovery
  endpoints (`/discovery/resources`, `/discovery/search`), automatic
  cataloging from Stellar settlements, and an MCP discovery server, none of
  which exist in the Stellar x402 stack today (the OpenZeppelin facilitator
  exposes verify/settle/supported only).
- **First x402 catalog with on-chain provenance per entry, to the best of
  public knowledge:** existing Bazaars list what sellers declare; this one
  additionally records what the ledger witnessed — settle count, distinct
  payers, tx hashes — as a first-class, queryable field.
- The honest form of the comparison: what EVM got from a company-operated
  hosted service, Stellar gets here as an ordinary Apache-2.0 repo anyone can
  run with one env var.

If prior art exists that public search did not surface, this README will be
corrected, in this section.

## Seven facts you can check in minutes

1. **A real USDC payment settled on Stellar MAINNET through THIS facilitator.**
   `stellar:pubnet`, tx
   [`07ecff0b`](https://stellar.expert/explorer/public/tx/07ecff0b17403d4500e230f7f3d23cea347a495f1d3e0a193bb0cc2b0e275dbb),
   ledger 63918501, `successful: true`; recipient received 0.0100000 USDC
   (confirmed on-chain), fee paid by the facilitator signer `GBVWCEV5…`. Same
   stock upstream stack as testnet, only the network flipped. Both networks the
   RFP calls committed deliverables are live.
2. **The same, on testnet, at $0.05.** Standard upstream seller
   (`@x402/express`) and buyer (`@x402/fetch`), zero code specific to this
   facilitator on either side. Tx
   [`dae9569b`](https://stellar.expert/explorer/testnet/tx/dae9569bc631550c5ae24eec06e6fb58557146a00b7f7b1b92d2e28a591aa696),
   ledger 4079722, `successful: true`.
3. **The buyer spent USDC and nothing else.** On the testnet run the fee
   account is `GBGW26HB…` — the facilitator's signer — which paid 22,973
   stroops (on mainnet, the pubnet signer paid); the payer signed Soroban auth
   entries only: no envelope, no sequence number, no XLM.
   `extra.areFeesSponsored: true` is advertised on `/supported` and honored
   on-chain on both networks.
4. **Non-custodial, visible in the events.** The settled transaction's
   `fn_call` event is `transfer(payer → recipient, …)` on the USDC SAC —
   funds never touch a facilitator address, and upstream verify rejects any
   payload whose auth entries involve one.
5. **An MCP agent discovered and paid in the same session.** Tx
   [`904be536`](https://stellar.expert/explorer/testnet/tx/904be536ade79b89002d662ce9c295276a4209b45c6d5f1c9d0ce24459104412),
   ledger 4079750, was initiated by the `paid_call` tool of the MCP discovery
   server after `search_services("weather in my city")` found the freshly
   auto-cataloged service. Full agent loop: search → select → pay → receipt.
6. **Search quality is measured, not asserted: nDCG@10 = 0.833.** On this
   repo's eval harness (24 services, 16 agent queries, graded relevance), the
   substring baseline scores 0.524, plain BM25 scores 0.497, and the shipped
   hybrid (BM25 + local MiniLM + reciprocal rank fusion) scores **0.833**,
   hit@1 12/16 — with a 23MB in-process model, no external API. Reproduce with
   one command below.
7. **Catalog poisoning is a test, not a hope.** A payment payload carrying
   `routeTemplate: "/users/../admin"` settles fine but is cataloged under the
   concrete URL — the traversal never becomes a catalog key. The validation is
   the upstream spec's own (`isValidRouteTemplate`, percent-decode before
   traversal and scheme checks), exercised in the suite.

## In one breath

An agent hits a paid API and gets HTTP 402. It signs Soroban auth entries for a
USDC transfer — nothing else — and retries. This facilitator verifies the
payload against the requirements (decode, simulate, validate auth entries; all
via the Apache-2.0 `@x402/stellar` package, **verify and settle are not
reimplemented here**), wraps it, pays the network fee, and submits. If the
payment carried the bazaar discovery extension, the catalog learns the service
existed — schema, price, route — and the next agent can find it in natural
language. The stall exists because someone bought from it.

```
  agent                    seller                   x402-bazaar               Stellar
    │  GET /weather          │                      facilitator                  │
    ├────────────────────────▶                           │                       │
    │  402 payment-required  │                           │                       │
    ◀────────────────────────┤                           │                       │
    │  sign auth entries     │                           │                       │
    │  (USDC only, no XLM)   │                           │                       │
    │  GET + payment payload │                           │                       │
    ├────────────────────────▶   POST /verify            │                       │
    │                        ├───────────────────────────▶   simulate            │
    │                        │   { isValid: true }       ├───────────────────────▶
    │                        ◀───────────────────────────┤                       │
    │                        │   POST /settle            │                       │
    │                        ├───────────────────────────▶   fee-sponsored tx    │
    │                        │                           ├───────────────────────▶
    │                        │   { success, tx hash }    │        settled ✓      │
    │                        │   EXTENSION-RESPONSES:    │                       │
    │                        │   {bazaar: cataloged}     │                       │
    │  200 + resource        ◀───────────────────────────┤                       │
    ◀────────────────────────┤                           │                       │
    │                                                    │
    │  GET /discovery/search?query=weather in my city    │
    ├────────────────────────────────────────────────────▶
    │  ranked results + provenance (distinct payers, txs)│
    ◀────────────────────────────────────────────────────┤
```

## Architecture

```
                       ┌────────────────────────────────────────────┐
                       │  packages/facilitator  (express)           │
                       │                                            │
   any x402 seller ───▶│  POST /verify   ─┐                         │
   (@x402/express,     │  POST /settle   ─┼─▶ ExactStellarScheme    │──▶ Soroban RPC
    hono, fastapi…)    │  GET  /supported─┘   (@x402/stellar —      │    testnet/pubnet
                       │                       verify/settle live   │
                       │                       upstream, not here)  │
                       │        │ on success                        │
                       │        ▼                                   │
                       │  ┌──────────────────────────────────┐      │
                       │  │  packages/bazaar (no HTTP)       │      │
   agents, MCP ───────▶│  │  ingest: extractDiscoveryInfo +  │      │
   clients, humans     │  │    routeTemplate validation      │      │
                       │  │  store: node:sqlite + provenance │      │
   GET /discovery/     │  │  search: BM25 ⊕ MiniLM via RRF   │      │
     resources|search  │  └──────────────────────────────────┘      │
                       └────────────────────────────────────────────┘
                                          ▲
                       ┌──────────────────┴─────────────────────────┐
                       │  packages/mcp-discovery (stdio MCP server) │
                       │  search_services · list_services ·         │
                       │  get_service · paid_call (x402 client)     │
                       └────────────────────────────────────────────┘
```

Design rule throughout: **build on upstream, never reinterpret it.** Wire
shapes are the ones `@x402/core`'s `HTTPFacilitatorClient` actually sends (so
any existing seller middleware works unchanged, and `POST /supported` is also
accepted for OZ-client compatibility); discovery validation is the upstream
spec functions; cataloging outcomes ride the `EXTENSION-RESPONSES` header the
client already logs. Any SEP-41 token, USDC by default, 7 decimals — proven with a non-USDC asset in CONFORMANCE run 4. CAIP-2
networks `stellar:testnet` and `stellar:pubnet`, both registrable at once.

## The numbers

Search, on the committed eval harness (`eval/search-eval.ts` — 24 services
across 8 domains, 16 agent-style queries, graded relevance, nDCG@10 and hit@1):

| ranking | nDCG@10 | hit@1 |
|---|---|---|
| substring baseline | 0.524 | 6/16 |
| BM25, field-boosted (zero-dependency default) | 0.497 | 9/16 |
| **hybrid BM25 + all-MiniLM-L6-v2 + RRF** (`EMBEDDINGS=local`) | **0.833** | **12/16** |

The failure the hybrid fixes is structural, not cosmetic: BM25 scores exactly
0 whenever agent vocabulary diverges from catalog vocabulary ("will it rain
tomorrow" vs "weather forecast") — the published tool-retrieval failure mode
([ToolRet, arXiv:2503.01763](https://arxiv.org/abs/2503.01763)) reproduced on
our own data. Fusion is reciprocal rank (k=60): no score calibration, degrades
to BM25 if the model is absent or mid-download.

Six settlements through this facilitator, every one checkable on-chain (full
evidence and the two upstream findings: [docs/CONFORMANCE.md](docs/CONFORMANCE.md)):

| run | network | what it proves | tx |
|---|---|---|---|
| 1 | testnet | stock buyer, $0.05 USDC | `dae9569b…a696` |
| 2 | testnet | MCP agent `paid_call` — discover then pay | `904be536…4412` |
| 3 | testnet | custom `__check_auth` contract account pays | `61f8872b…8c72` |
| 4 | testnet | non-USDC SEP-41 token (BAZ) | `21923053…a8ea` |
| 5 | testnet | `upto` authorize → settle → replay-refused | (contract `CBSYBSM6…`) |
| **6** | **MAINNET** | **real USDC on `stellar:pubnet`** | [`07ecff0b…5dbb`](https://stellar.expert/explorer/public/tx/07ecff0b17403d4500e230f7f3d23cea347a495f1d3e0a193bb0cc2b0e275dbb) |

Every run: fees sponsored by the facilitator signer, payer spends the asset only,
funds move payer→recipient directly, resource auto-cataloged with provenance.

## Why this matters to Stellar

- **The Bazaar gap gets an existence proof.** Not a design document: discovery
  endpoints serving real cataloged services, populated by real settlements,
  searchable in natural language, on Stellar, under Apache-2.0.
- **Provenance turns a measured weakness into a ranking signal.** The Base
  study showed manufactured volume dominates x402 metrics. A Stellar Bazaar
  that ships distinct-payer counts per entry from day one gives agents a
  fraud-aware default no EVM Bazaar currently offers.
- **Interop findings flow upstream.** Running a second independent facilitator
  against the upstream client surfaced a real bug: client and facilitator
  estimate ledger close time independently, and at the default 60s timeout the
  divergence can exceed the 2-ledger tolerance, rejecting honest payments with
  `expiration_too_far` (observed live; 45s sits inside both bounds — repro in
  CONFORMANCE.md, fix proposed). This is what "a facilitator other teams can
  rely on" looks like in practice: more implementations, tighter spec.

## Reproduce

Node ≥ 22.5 (uses built-in `node:sqlite`).

```sh
npm install
npm test                                # 21 tests, no network
npm run typecheck

# search eval — BM25 default, then hybrid (downloads 23MB model once):
npx tsx eval/search-eval.ts
EMBEDDINGS=local npx tsx eval/search-eval.ts

# run the facilitator on testnet (signer needs friendbot XLM only):
SIGNER_SECRET=S... npm start --workspace @x402-bazaar/facilitator
# → :8402  /verify /settle /supported /discovery/resources /discovery/search

# full live loop (seller + buyer, real USDC on testnet):
STELLAR_RECIPIENT=G... FACILITATOR_URL=http://localhost:8402 PORT=4610 \
  npx tsx examples/weather/seller.ts
SELLER_URL=http://localhost:4610 STELLAR_SECRET_KEY=S... \
  npx tsx examples/weather/buyer.ts

# MCP discovery server (Claude, Cursor, any MCP client):
#   command: npx  args: [tsx, packages/mcp-discovery/src/server.ts]
#   env: FACILITATOR_URL, STELLAR_SECRET_KEY (paid_call only)
```

## Honest limits

- **Mainnet is live, security review still pending.** A real USDC settlement
  ran on `stellar:pubnet` (tx `07ecff0b…`, CONFORMANCE run 6). The third-party
  security review (SDF Audit Bank) comes before any production mainnet TAG and
  before this is advertised as a service others should rely on — the run proves
  the path works, it does not certify the service.
- **`exact` on the wire; `upto` proven on-chain but not yet wired into the
  facilitator surface.** The upto contract ran its full authorize→settle→replay-
  refused cycle on testnet (CONFORMANCE run 5) and the draft
  `scheme_upto_stellar.md` lives in docs/ — upstream contribution and facilitator
  wiring are scheduled work.
- **Contract-account payers are proven, with a hand-rolled client.** A custom
  `__check_auth` account paid end to end (tx `61f8872b…`, CONFORMANCE run 3),
  but the upstream client signer is ed25519-only — our example signs the auth
  entry manually via `authorizeEntry`. Packaging that as a reusable signer is
  scheduled work.
- **The eval is small.** 16 queries and 24 services measure the mechanism, not
  the ceiling; scaling it (and publishing the larger set) is scheduled work.
  The 0.833 is honest for this set and should be read as "the hybrid closes
  the vocabulary gap", not as a leaderboard number.
- **Sybil-resistant provenance is wired but not yet backed by the STARK
  verifier.** The catalog counts distinct credential holders (nullifiers), not
  just addresses (`distinctCredentialHolders`), so two Sybil addresses sharing
  one credential collapse to one — tested. The production verifier is pq402's
  post-quantum anonymous credential (its crowd-gate verifier is live on Stellar
  mainnet); wiring it in is scheduled. Until then the field reads 0 and
  distinct-address provenance is the honest signal — exposed to rankers, never
  hidden behind a "verified" badge.
- **`node:sqlite` is experimental** in Node 22 and isolated behind the
  `CatalogStore` interface; swapping engines is a one-file change.
- **CI exists but lives on branch `ci-pending`** — the repo's push token
  lacked `workflow` scope at creation time.

## License

Apache-2.0. Direct dependencies: `@x402/stellar`, `@x402/core`,
`@x402/extensions`, `@huggingface/transformers` (Apache-2.0), `express`,
`zod`, `@modelcontextprotocol/sdk` (MIT). No AGPL or copyleft anywhere in the
dependency path — verified against the lockfile.
