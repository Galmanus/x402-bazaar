# `upto` scheme — Stellar network specification (DRAFT)

Status: **draft for upstream contribution** to x402-foundation/x402
(`specs/schemes/upto/scheme_upto_stellar.md`), authored in the x402-bazaar repo where
its reference implementation lives. The EVM and SVM upto specs define the scheme's
semantics; this document defines how those semantics bind on Stellar. To be reworked
against maintainer feedback via the x402 TSC — wire-format details below are the
reference implementation's, not yet ratified.

## Semantics

`upto` authorizes a payment **up to a cap** and settles the **actual usage**, once.
The fit is metered services: token-billed inference, per-row data, per-second media.
Two guarantees distinguish it from a bare allowance, and both MUST hold:

1. **Recipient binding** — funds can only reach the recipient the buyer authorized.
2. **Single settlement** — one authorization settles at most once, for at most the cap.

## Why a contract (normative on Stellar)

SEP-41 allowances (`approve`/`transfer_from`) alone cannot provide either guarantee:
an allowance names a spender and an amount, not a destination or a settlement count.
A contract-free upto design on Stellar therefore carries a weaker trust model (the
spender chooses recipient and may split settlements) and MUST be documented as such.
This specification uses a contract: the allowance's spender IS the contract, and the
contract's code pins both guarantees. Reference implementation:
`contracts/upto-authorization` (Apache-2.0, ~9KB optimized wasm), deployed on
`stellar:testnet` at `CBSYBSM6DFKDA5QR22PWLMLXSHGYUHHJ74W7HTXBZ76O5DSDA2EJLUTY`.

## Flow

```
buyer                    facilitator                        upto contract          token (SAC)
  │  sign ONE auth entry:     │                                  │                    │
  │  authorize(buyer, to,     │                                  │                    │
  │    token, cap, expiry,    │                                  │                    │
  │    auth_id) + sub-invoke  │                                  │                    │
  │    approve(buyer, upto,   │                                  │                    │
  │    cap, expiry)           │                                  │                    │
  ├──────────────────────────▶│  submit (fee-sponsored)          │                    │
  │                           ├─────────────────────────────────▶│  store Auth        │
  │                           │                                  ├───────────────────▶│ approve
  │      … metered usage happens off-chain, bounded by cap …     │                    │
  │                           │  settle(auth_id, actual)         │                    │
  │                           ├─────────────────────────────────▶│  burn, then        │
  │                           │        (permissionless call)     ├───────────────────▶│ transfer_from
  │                           │                                  │  buyer → recipient, actual ≤ cap
```

Every value in the buyer's auth entry is known at signing time — the unknown
(`actual`) appears only in the facilitator's later `settle` call, which needs no
buyer signature. That is the scheme. Both transactions are facilitator-submitted and
fee-sponsored; the buyer needs the payment asset only.

## Payment requirements (402 response)

As `exact`, with `scheme: "upto"`; `amount` is the **cap** in the asset's base units
(7 decimals for SACs). `extra` MUST include `areFeesSponsored` and the upto contract
address:

```json
{ "scheme": "upto", "network": "stellar:testnet", "amount": "3000000",
  "asset": "C…SAC", "payTo": "G…", "maxTimeoutSeconds": 300,
  "extra": { "areFeesSponsored": true, "uptoContract": "C…UPTO" } }
```

## Payment payload

As the Stellar `exact` payload (`payload: { transaction: <base64 XDR> }`, the
`accepted` requirements echoed), where the transaction invokes
`uptoContract.authorize(buyer, payTo, asset, cap, expiry_ledger, auth_id)` and the
buyer's auth entry covers that invocation and its `approve` sub-invocation.
`auth_id` MUST be 32 bytes drawn fresh per authorization (canonical fixed-length
bytes by construction — no re-encoding ambiguity between signing and storage).
`expiry_ledger` derives from `maxTimeoutSeconds` as in `exact`.

## Facilitator obligations

- **verify**: decode, check the invocation targets the advertised upto contract with
  args matching the requirements (recipient=payTo, token=asset, cap=amount), validate
  auth entries and expiration, simulate. Reject with typed reasons.
- **settle (authorize phase)**: submit the authorization transaction; report its hash.
- **settle (capture phase)**: call `settle(auth_id, actual)` with metered usage;
  `actual ≤ cap` enforced on-chain; report the settlement hash. The call is
  permissionless — everything that matters was pinned by the buyer's signature.
- A settlement response for upto SHOULD carry both hashes.

## Contract requirements (inherited from an audited nullifier design)

The reference contract enforces, and any alternative implementation MUST preserve:

1. All context pinned inside the buyer-signed tuple: recipient, token, cap, expiry,
   auth_id. An unpinned field is an unlimited-use field.
2. Settlement tag = the auth_id's exact stored bytes; refuse reuse of an auth_id
   that is live OR already settled.
3. Verify-then-burn ordering: a rejected settle consumes nothing; the burn and the
   transfer share one transaction so a failed transfer reverts the burn.
4. Single-use state in `persistent()` storage (archivable-restorable), never
   `temporary()` (deletable = reusable). Settled tags keep a long TTL.
5. Zero/negative caps and amounts refused; expiry must be future at authorize time.

## Composition with spending policies

The buyer address may itself be a smart account (custom `__check_auth`) enforcing
budgets — e.g. a rolling daily cap over authorized amounts. Since the cap is inside
the signed tuple, a policy account can meter authorizations against it without
trusting the facilitator. Demonstrated pattern: pq402's `agent-treasury` (rolling
24h cap + allow-list) and this repo's `ed25519-account` (conformance run 3 proves
the facilitator path accepts contract-account buyers).

## Reference evidence (testnet)

Live cycle, 2026-08-12: authorize (buyer-signed, cap 3000000 = 0.3 BAZ, approve
event to the contract), settle actual 1700000 by an unrelated caller (transfer
buyer→recipient + `settled` event), immediate replay refused on-chain with
`Error(Contract, #7) AlreadySettled`. Details in docs/CONFORMANCE.md run 5.

## Deferred

Partial/multiple captures (batch-settlement territory), auth-capture, refund flows.
This spec deliberately settles once — the metered case the RFP names.
