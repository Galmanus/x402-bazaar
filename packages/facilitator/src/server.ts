/**
 * Entry point: wires ExactStellarScheme (real verify/settle from
 * @x402/stellar) into the HTTP app.
 *
 * Env:
 *   SIGNER_SECRET      required — comma-separated S... secrets (settlement signers)
 *   FEE_BUMP_SECRET    optional — separate fee-bump signer (decouples fees from sequence numbers)
 *   NETWORKS           default "stellar:testnet" — comma-separated CAIP-2 ids
 *   RPC_URL            optional — custom Soroban RPC (applies to all networks listed)
 *   EMBEDDINGS         optional — "local" enables hybrid BM25+dense search
 *                      (all-MiniLM-L6-v2 in-process; first start downloads ~23MB)
 *   DB_PATH            default "./bazaar.db"
 *   PORT               default 8402
 *   UPTO_CONTRACT      optional — deployed upto-authorization contract id;
 *                      enables the upto scheme (advertised on /supported,
 *                      capture via POST /upto/settle). Uses the first NETWORKS
 *                      entry unless UPTO_NETWORK is set.
 *   UPTO_NETWORK       optional — CAIP-2 network for UPTO_CONTRACT
 */
import { ExactStellarScheme } from "@x402/stellar/exact/facilitator";
import { createEd25519Signer } from "@x402/stellar";
import type { Network } from "@x402/core/types";
import { CatalogStore, LocalEmbeddingProvider, SearchEngine } from "@x402-bazaar/catalog";
import { buildApp, type FacilitatorScheme, type UptoConfig } from "./app.ts";
import { CliUptoSettler } from "./upto-settler.ts";

const secrets = (process.env.SIGNER_SECRET ?? "").split(",").filter(Boolean);
if (!secrets.length) {
  console.error("SIGNER_SECRET is required (comma-separated Stellar S... secrets)");
  process.exit(1);
}
const networks = (process.env.NETWORKS ?? "stellar:testnet").split(",").filter(Boolean);

const store = new CatalogStore(process.env.DB_PATH ?? "./bazaar.db");
const engine = new SearchEngine(
  store,
  process.env.EMBEDDINGS === "local" ? new LocalEmbeddingProvider() : undefined,
);

const schemes = new Map<string, FacilitatorScheme>();
for (const network of networks) {
  const signers = secrets.map((secret) => createEd25519Signer(secret, network as Network));
  const feeBumpSigner = process.env.FEE_BUMP_SECRET
    ? createEd25519Signer(process.env.FEE_BUMP_SECRET, network as Network)
    : undefined;
  schemes.set(
    network,
    new ExactStellarScheme(signers, {
      feeBumpSigner,
      rpcConfig: process.env.RPC_URL ? { url: process.env.RPC_URL } : undefined,
    }) as unknown as FacilitatorScheme,
  );
}

let upto: UptoConfig | undefined;
if (process.env.UPTO_CONTRACT) {
  const uptoNetwork = process.env.UPTO_NETWORK ?? networks[0];
  const cliNetwork = uptoNetwork === "stellar:pubnet" ? "mainnet" : "testnet";
  upto = {
    contracts: { [uptoNetwork]: process.env.UPTO_CONTRACT },
    settler: new CliUptoSettler({
      signerSecret: secrets[0],
      cliNetwork: { [uptoNetwork]: cliNetwork },
    }),
  };
}

const port = Number(process.env.PORT ?? 8402);
buildApp({ schemes, store, engine, upto }).listen(port, () => {
  console.log(
    `x402-bazaar facilitator on :${port} — networks: ${networks.join(", ")}` +
      (upto ? ` — upto: ${Object.values(upto.contracts)[0]}` : ""),
  );
});
