# SCF #45 — Build Award, RFP Track — submission (copy-paste ready)

RFP: **X402 Facilitator with Bazaar (discovery) support**
Repo: https://github.com/Galmanus/x402-bazaar (Apache-2.0)
Submit at: https://communityfund.stellar.org — Interest form first (deadline **Aug 16, 2026**),
Build form after the email invite.

Every claim below is verifiable on-chain or by public repo. Fill the referral code if you
have one. Language: English.

---

# PART A — Interest form

**Project name:** x402-bazaar

**Build Award track:** RFP

**Which open RFP:** X402 Facilitator with Bazaar (discovery) support

**Referral code:** _[add if you have an SCF referrer — leave blank otherwise]_

**One-line description:**
A self-hostable x402 facilitator for Stellar with a native Bazaar discovery layer —
already live on testnet and mainnet, built on the Apache-2.0 @x402/stellar package.

**What you're building (short):**
The discovery layer the Stellar x402 stack is missing. Facilitator (verify/settle/
supported) on both networks, a Bazaar (paginated catalog + natural-language search +
automatic cataloging of HTTP and MCP resources), an MCP discovery server for agents, and
the `upto` metered scheme the RFP calls novel work. Six real USDC settlements on-chain,
one on mainnet. No AGPL anywhere.

---

# PART B — Build form (full proposal)

## Summary

x402-bazaar is a production-oriented x402 facilitator for Stellar plus the Bazaar
discovery layer, built on the Apache-2.0 `@x402/stellar` package (verify/settle are not
reimplemented). It is already running: six USDC settlements through our own facilitator
are verifiable on-chain, including one on `stellar:pubnet` (mainnet). The RFP's two
committed-deliverable networks — testnet and mainnet — are both live today.

## Why us / relevant experience

A continuous line of shipped work in agentic payments + Soroban security on Stellar, all
public:
- **pq402** (github.com/Galmanus/pq402) — x402 on Stellar shipped before this RFP existed:
  seller SDKs (JS zero-dep + Python stdlib-only), an agent CLI, a Soroban spending-policy
  contract, and a post-quantum anonymous agent credential (Circle-STARK verified on
  Soroban).
- **stellar-agent-pay** (github.com/Galmanus/stellar-agent-pay) — the buyer side of the
  x402 loop (search → pay → unlock) as a CLI agent.
- **sorohunter** (github.com/Galmanus/sorohunter) — adversarial Soroban tooling for
  missing-auth analysis with shipped findings; the same discipline produced this project's
  own threat model (docs/THREAT_MODEL.md, 10 findings).
- Non-custodial USDC on Stellar **mainnet** in production (the payer account for this
  submission's mainnet settlement is a live mainnet account already moving USDC).

Team: Manuel Galmanus, solo, named — AI engineer and security specialist (web2/web3),
Brazil. Solo-operator risk is mitigated in scope: the final tranche's third-party Audit
Bank review is the independent second set of eyes, monitoring + runbook are deliverables,
and the whole thing is built on upstream packages the ecosystem maintains collectively.

## What already works (checkable now)

| # | proof | tx / artifact |
|---|-------|---------------|
| Facilitator, both networks | /verify /settle /supported on ExactStellarScheme, wire-compatible with @x402/core's HTTPFacilitatorClient | repo |
| Stock buyer, testnet | $0.05 USDC | `dae9569b…` |
| MCP agent discover→pay | paid_call after search | `904be536…` |
| Custom `__check_auth` payer | contract-account pays (RFP 3.1) | `61f8872b…` |
| Any SEP-41 (non-USDC) | BAZ token settles (RFP 3.1) | `21923053…` |
| `upto` metered scheme | authorize → capture actual≤cap → replay refused | contract `CBSYBSM6…`, capture `03bca83b…` |
| **MAINNET** | real USDC on stellar:pubnet | **`07ecff0b…`** (ledger 63918501) |
| Search quality (measured) | nDCG@10 0.833 hybrid vs 0.497 BM25 vs 0.524 baseline | `eval/search-eval.ts` |
| Fees sponsored, non-custodial | fee account = facilitator signer on every tx; transfer payer→recipient | tx events |
| No AGPL | Apache-2.0/MIT dependency path | lockfile |

## Technical approach (references specific spec behaviors)

- **Facilitator:** builds on `@x402/stellar` (`ExactStellarScheme`); validates Soroban auth
  entries, simulates, sponsors fees, advertises `extra.areFeesSponsored`. Supports classic
  keypairs AND custom `__check_auth` accounts (both proven on-chain). Any SEP-41 token,
  USDC default, 7 decimals.
- **Bazaar:** `GET /discovery/resources` with the spec's `type/payTo/scheme/network/
  extensions/limit/offset` filters; `GET /discovery/search` with cursor pagination and
  `partialResults`; automatic cataloging from the PaymentPayload discovery extension for
  both HTTP and MCP resources; `routeTemplate` validated with percent-decoding before
  traversal/scheme checks (catalog-poisoning tested); cataloging outcomes via
  `EXTENSION-RESPONSES`.
- **Search quality is a deliverable, not a detail:** hybrid BM25 + local embedding (RRF),
  measured on a committed eval harness, because generic retrievers underperform on tool
  retrieval (ToolRet, arXiv:2503.01763).
- **Catalog integrity:** entries only from settlements this facilitator verified; per-entry
  provenance (settle count, distinct payers, distinct anonymous credential holders, tx
  hashes) so rankers discount manufactured volume — the measured failure mode of x402 on
  Base (21.2% fictitious, arXiv:2607.12575).
- **`upto`:** contract-backed (SEP-41 allowances alone cannot enforce recipient binding or
  single settlement); draft `scheme_upto_stellar.md` ready for the x402 Foundation
  new-scheme PR workflow.

Diagrams (Mermaid) + plain-English stack: **docs/DIAGRAMS.md**. Threat model:
**docs/THREAT_MODEL.md**. Conformance evidence: **docs/CONFORMANCE.md**.

## Milestones & budget (three tranches, $150K, final = mainnet launch)

**Tranche 1 — Facilitator, conformance-hardened, public testnet — $40K.**
Public always-on free testnet facilitator; multi-signer + fee-bump config; structured
machine-readable error codes (non-null reason on every rejection); the official x402 repo
e2e suite passing on testnet + diff-test vs the public x402.org facilitator, published;
configurable caller auth / rate limiting / metering with a documented business model;
self-facilitation packaging; conformance report v1. Acceptance: a third party points
unmodified @x402 middleware at our URL and settles.

**Tranche 2 — Bazaar + `upto` scheme (the novel work) — $70K.**
Bazaar: discovery spec tracked as it evolves; hybrid ranking shipped as default with the
eval set expanded to ≥100 services / ≥100 queries and published nDCG/hit@1; catalog-
integrity hardening (rate limits, poisoning battery, Sybil-resistant credential-holder
provenance); MCP discovery server hardened; ≥2 external e2e integrations cataloged.
`upto`: `scheme_upto_stellar.md` contributed upstream via the Foundation's new-scheme
workflow (spec PR → reference implementation), contract-backed, composed with smart-
account spending policies; seller + buyer/agent SDK helpers; role-based dev guide
(seller / buyer-agent / operator) contributed to Stellar Developer Docs; conformance
report v2 (exact + upto).

**Tranche 3 — Mainnet launch, security review, production — $40K.**
Third-party security review via SDF's Audit Bank (off-chain service + auth-entry
validation + discovery trust boundary + the upto contract) with resolved findings before
the production mainnet tag; hardened pubnet deployment with the configurable, removable
fee model; official e2e suite passing on pubnet; conformance report v3 with mainnet
hashes per network per scheme; operational runbook, monitoring/alerting, 99%+ uptime
target with a degraded-mode story; a maintenance commitment for post-grant conformance
upkeep. De-risked: a real mainnet settlement is already live.

## Maintenance (post-grant)

Conformance is graded as the spec moves. We monitor x402-foundation/x402 (spec dir +
releases) via automated diff alerts; a conformance CI job pins the current spec vectors
and fails on drift; committed turnaround of one tranche cycle for convention changes
during the grant, and a 12-month maintenance commitment (conformance updates + security
patches) plus handoff docs after it, coordinated through the x402 TSC.

## Open source & decentralization

Apache-2.0 (OSI-approved permissive); every dependency Apache-2.0 or MIT; no AGPL or
strong copyleft anywhere (the OZ Relayer x402 plugin is explicitly not used). Self-hostable
by design: a self-hoster runs the facilitator with one env var and can change or remove
the mainnet fee. The catalog is off-chain by default; no single hosted operator is
required for the ecosystem to use x402 discovery on Stellar.

## Ecosystem alignment

Built ON `@x402/stellar` (not a reimplementation); contributes `upto` upstream; already
produced two interop findings running a second independent facilitator against the
upstream client (docs/CONFORMANCE.md); coordinates with the x402 TSC where SDF holds a
Governing Board seat.

## Eligibility note (confirm before submitting)

Confirm this is distinct, non-overlapping work from any active SCF award (e.g. a prior
Slippay submission): x402-bazaar is a standalone public repo with zero code coupling to
those projects. State this plainly if asked.
