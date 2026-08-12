/**
 * Optional anonymous-credential gate for catalog provenance.
 *
 * Motivation (docs/THREAT_MODEL.md T3): `distinctPayers` counts ADDRESSES, and
 * addresses are free — a seller can inflate their own provenance with N funded
 * accounts, and fee sponsorship makes that free of gas too. Counting distinct
 * anonymous CREDENTIAL HOLDERS instead is Sybil-resistant: the count is bounded
 * by a curated association set, not by how many keypairs an attacker can mint.
 *
 * This module defines the integration point; it does NOT ship a prover. The
 * production verifier is the post-quantum Circle-STARK credential from pq402
 * (github.com/Galmanus/pq402): a payer proves membership + derives a per-round
 * nullifier without revealing which member it is, verified on-chain in Soroban.
 * Wire that in as a `CredentialVerifier`. The default here is null (no gate),
 * so the facilitator behaves exactly as before unless a verifier is configured.
 *
 * The audit lessons from that credential's own history (vineland F8/F11/F13)
 * are the reason the interface returns a NULLIFIER, not a proof blob: the caller
 * counts distinct nullifiers, and the verifier is responsible for (F8) canonical
 * encoding, (F11) pinning the round, and (F13) domain-separating the round per
 * facilitator so nullifiers do not link a holder across services.
 */
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";

/** Extension key a payer uses to attach a credential proof to a payment. */
export const CREDENTIAL_EXTENSION = "pq402/credential";

export interface CredentialResult {
  /** Stable per-(holder, round) tag. Distinct holders → distinct nullifiers. */
  nullifier: string;
}

export interface CredentialVerifier {
  /**
   * Verify a credential proof carried by a settled payment. Return its
   * nullifier if valid, or null to decline (payment still settles; it just
   * does not count toward credential-holder provenance).
   */
  verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
  ): Promise<CredentialResult | null> | CredentialResult | null;
}

/**
 * Pull the raw credential extension off a v2 payload, if present. Shape is
 * `extensions["pq402/credential"] = { proof, publics, nullifier?, ... }`; the
 * exact fields are the verifier's contract. Returns undefined when absent.
 */
export function readCredentialExtension(
  payload: PaymentPayload,
): Record<string, unknown> | undefined {
  const ext = (payload as { extensions?: Record<string, unknown> }).extensions;
  const cred = ext?.[CREDENTIAL_EXTENSION];
  return cred && typeof cred === "object" ? (cred as Record<string, unknown>) : undefined;
}

/**
 * Test/dev verifier: trusts a `nullifier` field already present in the
 * extension. NOT for production — a real verifier must check a proof and derive
 * the nullifier itself, never trust a client-supplied one (that would be
 * Sybil-inflatable again). Exists so the provenance plumbing is testable
 * without the STARK prover in the loop.
 */
export class TrustedNullifierVerifier implements CredentialVerifier {
  verify(payload: PaymentPayload): CredentialResult | null {
    const cred = readCredentialExtension(payload);
    const n = cred?.nullifier;
    return typeof n === "string" && n.length ? { nullifier: n } : null;
  }
}
