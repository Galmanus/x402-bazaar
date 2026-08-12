/**
 * Example buyer/agent: pays for the weather API with USDC over the
 * x402-bazaar facilitator, then finds the service it just paid for via
 * /discovery/search. The buyer account needs USDC only — network fees are
 * sponsored by the facilitator (extra.areFeesSponsored).
 *
 * Env: STELLAR_SECRET_KEY (payer S...), SELLER_URL (default http://localhost:4600),
 *      FACILITATOR_URL (default http://localhost:8402)
 */
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const NETWORK = process.env.STELLAR_NETWORK ?? "stellar:testnet";
const secret = process.env.STELLAR_SECRET_KEY;
if (!secret) throw new Error("STELLAR_SECRET_KEY is required");

const seller = process.env.SELLER_URL ?? "http://localhost:4600";
const facilitator = process.env.FACILITATOR_URL ?? "http://localhost:8402";

const signer = createEd25519Signer(secret, NETWORK as never);
// Pubnet (unlike testnet) has no default Soroban RPC; the client builds the
// transfer via RPC, so mainnet requires an explicit rpcUrl.
const rpcConfig = process.env.RPC_URL ? { url: process.env.RPC_URL } : undefined;
const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: NETWORK as never, client: new ExactStellarScheme(signer, rpcConfig) }],
});

console.log("1. paying for GET /weather ...");
const res = await fetchWithPayment(`${seller}/weather?city=Blumenau`);
console.log("   status:", res.status);
console.log("   body:", await res.json());
const receipt = res.headers.get("payment-response");
if (receipt) {
  const decoded = JSON.parse(Buffer.from(receipt, "base64").toString());
  console.log("   settlement:", JSON.stringify(decoded));
}

console.log("2. discovering the service via the bazaar ...");
const search = await fetch(
  `${facilitator}/discovery/search?query=${encodeURIComponent("what is the weather in my city")}`,
);
const page = (await search.json()) as { resources: Array<Record<string, unknown>> };
console.log("   search hits:", page.resources.length);
for (const hit of page.resources) {
  console.log("   -", hit.serviceName, hit.resource, JSON.stringify((hit.extensions as Record<string, unknown>)?.["x402-bazaar/provenance"]));
}
