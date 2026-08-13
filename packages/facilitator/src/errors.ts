/**
 * Machine-readable error catalog for the facilitator.
 *
 * RFP acceptance requirement: "a non null reason on every rejection." Reviewers
 * point stock SDK code at the deliverable, so every rejection carries BOTH the
 * scheme-shaped flag the upstream client expects (`isValid: false` for verify,
 * `success: false` for settle) AND a stable `code` from this enum plus a
 * human `reason` that is never null. Codes are stable identifiers an agent can
 * branch on; reasons are for humans and logs.
 */

export const ErrorCode = {
  // request shape
  MALFORMED_REQUEST: "malformed_request",
  MISSING_QUERY: "missing_query",
  // scheme/network routing
  UNSUPPORTED_SCHEME_NETWORK: "unsupported_scheme_network",
  // verify/settle execution
  VERIFY_ERROR: "verify_error",
  SETTLE_ERROR: "settle_error",
  // upto
  UPTO_NOT_CONFIGURED: "upto_not_configured",
  UPTO_UNKNOWN_NETWORK: "upto_unknown_network",
  UPTO_MISSING_FIELDS: "upto_missing_fields",
  UPTO_SETTLE_ERROR: "upto_settle_error",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Rejection body for /verify — carries the upstream-expected `isValid: false`. */
export function verifyReject(code: ErrorCode, reason: string) {
  return { isValid: false, code, reason, invalidReason: reason };
}

/** Rejection body for /settle and /upto/settle — carries `success: false`. */
export function settleReject(code: ErrorCode, reason: string) {
  return { success: false, code, reason, errorReason: reason };
}

/** Rejection body for plain request errors (discovery, bad body). */
export function requestReject(code: ErrorCode, reason: string) {
  return { code, reason, error: reason };
}
