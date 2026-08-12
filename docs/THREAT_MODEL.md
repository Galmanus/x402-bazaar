# Threat model — x402-bazaar facilitator + discovery layer

Self-assessment, 2026-08-12. Scope: the off-chain facilitator service
(`packages/facilitator`), the catalog/search library (`packages/bazaar`), the MCP
discovery server, and the planned `upto` Soroban contract. Format and discipline
follow the riverrun/vineland audit practice: one finding per row, concrete failure
scenario, regression test named when one exists. Findings that transfer from that
audit are cited as F-numbers with their original lesson.

This document precedes the third-party review (SDF Audit Bank, tranche 4). It is the
map we hand the auditor, not a substitute for them.

| # | severity | where | status |
|---|----------|-------|--------|
| T1 | high | catalog trust boundary — poisoned routeTemplate | **mitigated + tested** |
| T2 | high | settlement replay | **delegated upstream + verified live** |
| T3 | medium | provenance Sybil inflation | **integration point shipped; STARK verifier pending** |
| T4 | medium | catalog spam / storage griefing | open (rate limits scheduled T1) |
| T5 | medium | seller spoofing in listings | **mitigated by construction** |
| T6 | medium | front-running of settlements | analyzed, low impact on Stellar |
| T7 | low | EXTENSION-RESPONSES information leak | analyzed, allowlisted upstream |
| T8 | medium | facilitator signer key compromise | operational (runbook, T4) |
| T9 | low | catalog durability vs node:sqlite | documented, interface-isolated |
| T10 | info | MCP paid_call budget | documented, wallet-scoped |

## T1 — poisoned discovery metadata at the trust boundary  ·  MITIGATED + TESTED

The facilitator's catalog is written from client-echoed data: the payment payload
carries the `resource` block and the bazaar extension, so a hostile client controls
every byte of what would become a catalog entry. Attack shapes: a `routeTemplate` of
`/users/../admin` (traversal into another entry's key), `%2e%2e` (the same, hidden
behind percent-encoding), `http://evil` (scheme injection into the key space).

Mitigation is the upstream spec's own soft-drop validation (`isValidRouteTemplate`,
percent-decode BEFORE traversal and scheme checks), applied at ingest; an invalid
template falls back to the concrete URL path and the settlement is unaffected.
Regression test: `catalog.test.ts` — "malicious routeTemplate (traversal) is not used
as catalog key".

Transferred lesson (vineland F8, CRITICAL there): a value used as a key must be a
function of its CANONICAL form, never its raw bytes — F8 was a double-spend because
non-canonical field encodings hashed to fresh nullifiers. Our catalog key is the same
class of problem: percent-decoding before validation is exactly the canonicalization
step, and the reason the order (decode, then check) is load-bearing.

Residual: `serviceName`/`tags`/`iconUrl` are sanitized by upstream
`sanitizeResourceServiceMetadata`, but a seller can still write a misleading
description for their OWN resource. That is not spoofing (see T5); it is marketing.
Rankers should weigh provenance, not prose.

## T2 — settlement replay  ·  DELEGATED UPSTREAM + VERIFIED LIVE

A captured payment payload replayed against `/settle` must not settle twice. Defense
is layered and none of it is ours to reimplement (by RFP design): Soroban auth
entries carry a per-address nonce consumed on-chain (a replayed transaction fails in
simulation and on submission), and `signatureExpirationLedger` bounds the window.
Verified live: the expiration path rejected honest payments during conformance run 1
(`expiration_too_far` — see the upstream finding in CONFORMANCE.md), which is the
control working, tuned too tight.

Transferred lesson (vineland F5): single-use state must live in storage that ARCHIVES
rather than deletes. On Stellar the nonce is ledger state; for the planned `upto`
contract the settlement tag must be `persistent()`, never `temporary()` — a deleted
tag is a re-usable tag.

## T3 — provenance Sybil inflation  ·  DOCUMENTED LIMIT; UPGRADE DESIGNED

Per-entry provenance (settleCount, distinctPayers, tx hashes) exists because 21.2% of
x402 settlements on Base were measured fictitious (arXiv:2607.12575). But
`distinctPayers` counts ADDRESSES, and addresses are free: a seller can inflate their
own entry with N funded payer accounts for N × ($0.05 + no fee, since we sponsor).
The field raises the cost of fake volume from zero to linear; it does not make it
impossible. README says this plainly (Honest limits).

Integration SHIPPED (packages/bazaar/src/credential.ts): the catalog now counts
distinct CREDENTIAL HOLDERS (nullifiers) alongside distinct addresses, exposed as
`distinctCredentialHolders` in provenance. A payer attaches a credential proof
(extension `pq402/credential`); the facilitator verifies it via a configured
`CredentialVerifier` and counts the nullifier — never a client-supplied one (that would
be Sybil-inflatable again). Tests prove two addresses sharing one credential collapse to
one holder. What is NOT yet wired: the production verifier, the post-quantum Circle-STARK
credential from pq402 (github.com/Galmanus/pq402), whose crowd-gate verifier is deployed
on Stellar mainnet. The vineland audit maps the sharp edges it must own: F13 (round
domain-separated per facilitator or nullifiers link across services), F11 (round pinned
or one member mints unlimited nullifiers), F8 (canonical limbs before hashing). Fee
sponsorship makes the Sybil economics WORSE for us than for other facilitators (the
attacker doesn't even pay gas) — which is exactly why credential-holder counting matters
here more than elsewhere.

## T4 — catalog spam / storage griefing  ·  OPEN (scheduled T1)

Entries are only created by settled payments, so listing costs at least one real
settlement — but a hostile seller can register unlimited ROUTES cheaply: each new
routeTemplate on their own domain is a new catalog row. Cost today: one $0.001+
payment per row, fees sponsored by us. Transferred lesson (vineland F14): self-funded
griefing is still griefing when the operator inherits storage/rent. Mitigations
scheduled for tranche 1: per-payTo row caps, per-caller rate limits on /settle, and
catalog eviction policy for entries with zero distinct external payers. Until then:
the store is SQLite on disk; exhaustion is an availability, not integrity, risk.

## T5 — seller spoofing in listings  ·  MITIGATED BY CONSTRUCTION

Can client A create a catalog entry that impersonates seller B — B's URL with A's
`payTo`, or B's payTo with A's URL? The catalog key is `(network, payTo,
routeTemplate|url)` and the entry is only written after a settlement in which the
payer actually paid THAT payTo for THAT resource, verified against the requirements
by upstream verify (amount, recipient, asset all checked against the transfer event
in simulation). A listing claiming B's payTo requires a real payment to B — which B
presumably does not mind. A listing claiming B's URL under A's payTo is a distinct
catalog key, so it cannot overwrite B's entry; it shows as a separate (A-paid)
listing whose provenance exposes it. Note the price-honesty consequence: `accepts`
in the catalog is what the SELLER's 402 declared at settle time, so a seller can
advertise one price and later charge another — but the buyer always re-reads the
live 402 before paying, so stale catalog prices are a UX issue, not a theft vector.

## T6 — front-running of settlements  ·  ANALYZED, LOW IMPACT

A mempool observer replaying or reordering a captured auth entry gains nothing: the
transfer's destination and amount are inside the signed entry (vineland F11's lesson
pre-applied by the upstream design — every context field is pinned), the facilitator
address cannot appear in the auth tree (upstream check), and executing someone
else's transfer earlier only pays their bill for them. Stellar has no public
mempool in the Ethereum sense; the residual is a griefing race on the payer's nonce,
bounded by the expiration ledger.

## T7 — EXTENSION-RESPONSES information leak  ·  ANALYZED

Cataloging outcomes ride a response header. Upstream clients log only an allowlist
(`status`, `reason`, `code`); our reasons are static strings ("no discovery
extension", "invalid discovery extension: …schema path…"). Schema-validation errors
could echo attacker-chosen strings back to the seller's logs — bounded by the 1MB
JSON body cap and header size limits. Keep reasons enumerated, never reflected raw.

## T8 — facilitator signer key compromise  ·  OPERATIONAL

The signer sponsors fees and submits; it never holds user funds (non-custodial by
construction, and upstream verify rejects any payload whose auth entries involve a
facilitator address — so a stolen signer cannot be made a party to transfers). Blast
radius of compromise: fee drain of the signer's XLM and settlement denial — an
availability and cost problem, not fund theft. Controls (T4 tranche): separate
fee-bump signer, balance alarms, key rotation runbook, per-key settlement caps.

## T9 — catalog durability  ·  DOCUMENTED

`node:sqlite` is experimental in Node 22. Risk is availability (a crash losing
recent rows re-catalogable from chain data), not integrity (provenance tx hashes are
recomputable from the ledger). Isolated behind `CatalogStore`; swap is one file.

## T10 — MCP paid_call spends real money on tool-call  ·  INFO

An MCP client with `STELLAR_SECRET_KEY` set can be induced (by prompt injection in
the agent's context) to call `paid_call` against an expensive resource. Mitigations
are wallet-side and documented rather than enforced here: fund the MCP wallet with
spending-money only, and/or route it through a spending-policy account — the
pq402 `agent-treasury` contract (rolling daily cap, allow-list) or an upto
authorization once the contract ships. The tool also reports price in search results
so the agent can reason before paying.

## Planned `upto` contract — inherited requirements, stated before design freeze

From the vineland audit, as REQUIREMENTS not suggestions:

1. Settlement tag = function of the authorization's canonical serialization (F8).
2. The client-signed authorization pins ALL context: recipient, asset, cap,
   expiration ledger, and a unique authorization id (F11 — an unpinned field is an
   unlimited-use field).
3. Verify-then-burn ordering: a rejected settlement consumes nothing (F4).
4. `Spent` state in `persistent()` storage, TTL bumped long, never `temporary()` (F5).
5. Security parameters are not free config: cap and expiry get validated floors, and
   the contract refuses zero/negative amounts (vineland F2's class).
