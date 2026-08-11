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

`stellar:pubnet` run, `upto` scheme (not yet implemented), custom `__check_auth`
contract-account payer (upstream client signer is ed25519-only today), sustained-load
behavior, restart/crash recovery of the catalog (store is durable but not yet
exercised in anger).
