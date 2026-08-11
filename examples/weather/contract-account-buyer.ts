/**
 * Contract-account buyer: pays for an x402 resource FROM a Soroban custom
 * account (`__check_auth`), not a classic keypair — the RFP's hard
 * requirement 3.1 ("Support classic keypairs and custom __check_auth
 * accounts"). The upstream client signer is ed25519-envelope-only, so this
 * script mirrors upstream `createPaymentPayload` step by step and signs the
 * auth entry with stellar-sdk's `authorizeEntry`, whose default signature
 * ScVal (vec of { public_key, signature }) is exactly what
 * contracts/ed25519-account expects.
 *
 * Env: CONTRACT_ACCOUNT (C...), OWNER_SECRET (S... of the contract's owner
 *      key), SELLER_URL (default http://localhost:4610),
 *      STELLAR_NETWORK (default stellar:testnet)
 */
import {
  authorizeEntry,
  contract,
  Keypair,
  nativeToScVal,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import {
  decodePaymentRequiredHeader,
  decodePaymentResponseHeader,
  encodePaymentSignatureHeader,
} from "@x402/core/http";
import {
  getEstimatedLedgerCloseTimeSeconds,
  getNetworkPassphrase,
  getRpcClient,
  getRpcUrl,
} from "@x402/stellar";

const NETWORK = (process.env.STELLAR_NETWORK ?? "stellar:testnet") as never;
const SELLER = process.env.SELLER_URL ?? "http://localhost:4610";
const contractAccount = process.env.CONTRACT_ACCOUNT;
const ownerSecret = process.env.OWNER_SECRET;
if (!contractAccount || !ownerSecret) throw new Error("CONTRACT_ACCOUNT and OWNER_SECRET are required");
const owner = Keypair.fromSecret(ownerSecret);

console.log("1. GET without payment ...");
const first = await fetch(`${SELLER}/weather?city=Blumenau`);
console.log("   status:", first.status);
const required = decodePaymentRequiredHeader(first.headers.get("payment-required")!);
const req = (required as { accepts: Array<Record<string, never>> }).accepts[0] as {
  scheme: string; network: string; payTo: string; asset: string; amount: string;
  maxTimeoutSeconds: number; extra: { areFeesSponsored?: boolean };
};
if (!req.extra.areFeesSponsored) throw new Error("facilitator does not sponsor fees");

console.log(`2. building transfer ${contractAccount} -> ${req.payTo} (${req.amount} base units) ...`);
const networkPassphrase = getNetworkPassphrase(NETWORK);
const rpcUrl = getRpcUrl(NETWORK);
const rpcServer = getRpcClient(NETWORK);
const latestLedger = await rpcServer.getLatestLedger();
const estimated = await getEstimatedLedgerCloseTimeSeconds(NETWORK);
const maxLedger = latestLedger.sequence + Math.ceil(req.maxTimeoutSeconds / estimated);

const tx = await contract.AssembledTransaction.build({
  contractId: req.asset,
  method: "transfer",
  args: [
    nativeToScVal(contractAccount, { type: "address" }), // from = the CONTRACT account
    nativeToScVal(req.payTo, { type: "address" }),
    nativeToScVal(req.amount, { type: "i128" }),
  ],
  networkPassphrase,
  rpcUrl,
  parseResultXdr: (r: unknown) => r,
});

console.log("3. signing auth entries for the contract account (__check_auth) ...");
const invokeOp = (tx.built!.operations[0] as { auth?: xdr.SorobanAuthorizationEntry[] });
const entries = invokeOp.auth ?? [];
let signed = 0;
for (const [i, entry] of entries.entries()) {
  if (entry.credentials().switch().name !== "sorobanCredentialsAddress") continue;
  const addr = Address.fromScAddress(entry.credentials().address().address()).toString();
  if (addr !== contractAccount) continue;
  entries[i] = await authorizeEntry(
    entry,
    async (_preimage, payload: Buffer) => ({
      signature: owner.sign(payload),
      publicKey: owner.publicKey(),
    }),
    maxLedger,
    networkPassphrase,
  );
  signed++;
}
if (!signed) throw new Error("no auth entry for the contract account — unexpected");
console.log(`   signed ${signed} entr${signed === 1 ? "y" : "ies"}, expiration ledger ${maxLedger}`);

await tx.simulate();
const still = tx.needsNonInvokerSigningBy();
if (still.length) throw new Error(`still unsigned after signing: ${still.join(", ")}`);

const paymentPayload = {
  x402Version: 2,
  scheme: req.scheme,
  network: req.network,
  accepted: req, // the PaymentRequirements this payment satisfies (v2 wire field)
  payload: { transaction: tx.built!.toXDR() },
  resource: (required as { resource?: unknown }).resource,
  extensions: (required as { extensions?: unknown }).extensions,
};

if (process.env.DEBUG_VERIFY) {
  const facilitator = process.env.FACILITATOR_URL ?? "http://localhost:8402";
  const vr = await fetch(`${facilitator}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: 2, paymentPayload, paymentRequirements: req }),
  });
  console.log("   direct /verify:", vr.status, await vr.text());
}

console.log("4. retrying with payment ...");
const paid = await fetch(`${SELLER}/weather?city=Blumenau`, {
  headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(paymentPayload as never) },
});
console.log("   status:", paid.status);
console.log("   body:", await paid.json());
const receipt = paid.headers.get("payment-response");
if (receipt) console.log("   settlement:", JSON.stringify(decodePaymentResponseHeader(receipt)));
