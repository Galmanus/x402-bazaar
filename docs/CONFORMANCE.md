# Conformance evidence

Run log for end-to-end conformance of the x402-bazaar facilitator. Every claim below is
checkable on-chain or reproducible from this repo.

## Run 1 — stellar:testnet, exact scheme, full loop (2026-08-11)

Stack: upstream `@x402/express` seller + `@x402/fetch` buyer (v2.21.0), **zero code
specific to this facilitator on either side** — the seller points `HTTPFacilitatorClient`
at `http://localhost:8402` and everything else is the standard x402 stack.

Flow proven, in order:

1. Buyer GET → 402 with `payment-required` requirements (scheme `exact`,
   `stellar:testnet`, USDC SAC `CBIELTK6…DAMA`, $0.05 = 500000 base units, 7 decimals).
2. Buyer signed Soroban auth entries only (no envelope, no sequence number, no XLM).
3. Facilitator `/verify`: XDR decode, transfer event validation, auth entry validation,
   on-chain simulation — via `ExactStellarScheme` from `@x402/stellar/exact/facilitator`.
4. Facilitator `/settle`: transaction assembled and submitted by the facilitator signer.
5. Seller returned 200 + resource body; buyer received base64 `payment-response` receipt.
6. Facilitator auto-cataloged the resource from the payment's bazaar discovery extension
   and reported `{"bazaar":{"status":"cataloged"}}` via `EXTENSION-RESPONSES`.
7. `GET /discovery/search?query=what+is+the+weather+in+my+city` returned the service,
   ranked, with provenance.

Settlement (verify on Horizon or stellar.expert):

| field | value |
|---|---|
| tx hash | `dae9569bc631550c5ae24eec06e6fb58557146a00b7f7b1b92d2e28a591aa696` |
| network | stellar:testnet, ledger 4079722, 2026-08-11T03:40:05Z |
| successful | true |
| payer (auth entries) | `GC26DQPIO2FTWOK3SHVOR6PU7Q3OZTBHG4VS7UMGPJBLYPLJX2YVRPWM` |
| recipient | `GDD6IPHRIPAJCKIIPRXKYUXWZ5DXVXGE4CVMPHRIV2FZD7EZCTYV3SOO` |
| amount | 500000 base units USDC (= $0.05, 7 decimals) |
| fee account | `GBGW26HBOLCO5Q45P73JVWUWTQZBABKBEWCD3C23ZEVPWIZALJDMWFQ7` (facilitator signer) |
| fee charged | 22973 stroops |

**Fee sponsorship proof:** `fee_account` = the facilitator's signer, not the payer. The
payer account spent USDC only.

**Non-custodial proof:** the transfer is payer → recipient directly (see the tx's
`fn_call` event: `transfer(GC26…, GDD6…, 500000)` on the USDC SAC). The facilitator
address appears only as source/fee account, never in the token movement, and upstream
verify rejects any payload whose auth entries involve a facilitator address.

Catalog state after the run (`GET /discovery/search`):

```
BazaarWeather http://localhost:4610/weather
  x402-bazaar/provenance: {"settleCount":1,"distinctPayers":1,
    "firstSettleTx":"dae9569…a696","lastSettleTx":"dae9569…a696"}
```

Reproduce: `examples/weather/` (seller.ts, buyer.ts) — see README env vars.

## Run 2 — MCP agent flow: discover → paid_call (2026-08-11)

The MCP discovery server (`packages/mcp-discovery`) was exercised over real stdio with an
MCP client: `search_services("weather in my city")` returned the cataloged service with
price and provenance; `paid_call("http://localhost:4610/weather?city=Blumenau")` executed
the full x402 payment from inside the tool call.

| field | value |
|---|---|
| tx hash | `904be536ade79b89002d662ce9c295276a4209b45c6d5f1c9d0ce24459104412` |
| initiated by | MCP tool call (`paid_call`) |
| payer | `GC26DQPIO2FTWOK3SHVOR6PU7Q3OZTBHG4VS7UMGPJBLYPLJX2YVRPWM` (USDC only, no XLM spent) |
| result | 200 + resource body + settlement receipt returned to the agent |

After the run the catalog entry shows `settleCount: 2` — provenance accumulates.

## Run 3 — custom `__check_auth` contract account pays (2026-08-11)

RFP 3.1 requires supporting "classic keypairs and custom __check_auth accounts". This
run pays from a Soroban custom account contract, not a classic keypair:

- Contract: `contracts/ed25519-account` (2.7KB wasm, 4 unit tests incl. a real ed25519
  positive path via ed25519-dalek), deployed at
  `CBSWCOS2LSGOXACLUR3LBOWKUJNMNA2SSQLS6EH3NXEG6ARXG6TZAPQ3`, funded with 0.2 USDC.
- Client: `examples/weather/contract-account-buyer.ts` mirrors the upstream payload
  construction and signs the auth entry with stellar-sdk `authorizeEntry` — the SDK's
  default signature ScVal (`vec![{ public_key, signature }]`) is exactly the format the
  contract's `__check_auth` verifies, so no custom wallet glue is needed.
- Facilitator verify returned `{"isValid": true, "payer": "CBSWCOS2…"}` — the payer IS
  the contract address; `__check_auth` executed in simulation and again on-chain.

| field | value |
|---|---|
| tx hash | `61f8872b010fd4f6faef5c043bf77c51cdbc0e7ee6b7bc0203c13b5040868c72` |
| ledger | 4087466, successful: true |
| payer (auth entries) | `CBSWCOS2…APQ3` — a contract account, `__check_auth` custom |
| fee account | `GBGW26HB…` (facilitator signer, 20,378 stroops — sponsorship holds) |
| catalog after | `settleCount: 3, distinctPayers: 2` — provenance distinguishes payers |

Wire note discovered doing this: the v2 PaymentPayload must carry the chosen
requirements in an `accepted` field; upstream `_verify` reads `payload.accepted.scheme`
and a payload without it fails with `unexpected_verify_error` (a TypeError, not a typed
reason) — filed alongside the expiration finding as an upstream error-reporting gap.

## Run 4 — non-USDC SEP-41 token (2026-08-11)

RFP 3.1: "Support any SEP-41 token, USDC by default." This run settles in a freshly
issued classic asset (`BAZ`, issuer `GDYQIGYW…NZYP`) wrapped as a SAC — with the
completely stock upstream buyer (`@x402/fetch`), no code changes anywhere: the seller
priced the route as `{ amount: "1000000", asset: "CAG5JKXM…73VE" }` and everything else
followed from the requirements.

| field | value |
|---|---|
| asset | BAZ SAC `CAG5JKXMFKSNC3DC26CJ6XHC472QQQHIQPNC3XPUTMQXJRWZLVJY73VE` (7 decimals) |
| tx hash | `2192305314732803be6f62709721082c9cf3f2f86a8edeffb10358882934a8ea` |
| ledger | 4090532, successful: true |
| amount | 1000000 base units = 0.1 BAZ (recipient classic balance confirms 0.1000000) |
| fee account | `GBGW26HB…` (facilitator signer, 22,953 stroops — sponsorship holds) |
| catalog | second entry auto-cataloged; per-entry provenance independent |

Setup (scripted, reproducible): issue classic asset → `stellar contract asset deploy`
→ trustlines for payer and recipient → mint. The trustline requirement (RFP 3.5) is
real and hit here: without `changeTrust` on the recipient the settle fails with
`op_no_trust`.

## Upstream finding (to be reported)

`@x402/stellar@2.21.0`: client and facilitator each estimate ledger close time
independently (`getEstimatedLedgerCloseTimeSeconds`, Horizon sample) and derive
`maxLedger = current + ceil(maxTimeoutSeconds / estimate)`. With
`maxTimeoutSeconds = 60` (the default), a 5s vs 6s estimate divergence produces offsets
12 vs 10, exceeding the facilitator's `SIGNATURE_EXPIRATION_LEDGER_TOLERANCE = 2` →
`invalid_exact_stellar_signature_expiration_too_far` with a fully honest client. With
30s the real-time window is so tight that one ledger of latency produces
`signature has expired` in simulation (observed: expiration 4079713, sim at 4079714).
45s sits inside both bounds and is what the example uses. Suggested upstream fix:
facilitator should derive its bound from the same requirement the client saw, with a
tolerance proportional to `maxTimeoutSeconds`, not a constant 2 ledgers.

## Not yet covered

`stellar:pubnet` run, `upto` scheme (not yet implemented), sustained-load
behavior, restart/crash recovery of the catalog (store is durable but not yet
exercised in anger).
