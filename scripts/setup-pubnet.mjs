/**
 * setup-pubnet.mjs — prepare the accounts for a MAINNET (pubnet) x402 settlement.
 *
 * Real money. This script ONLY creates and funds accounts and adds one
 * trustline; it NEVER runs a settlement. Two-phase by design:
 *
 *   dry-run (default):  node scripts/setup-pubnet.mjs
 *       reads balances, prints the exact plan, spends nothing.
 *   broadcast:          FUNDER_SECRET=S... node scripts/setup-pubnet.mjs --confirm
 *       creates the two accounts from the funder and adds the recipient's
 *       USDC trustline. Idempotent: generated keys are saved to
 *       scripts/.keys-pubnet.json and reused; on-chain steps are skipped if
 *       already done.
 *
 * Model (see the chat): the PAYER is GCEYFLGN itself (already funded, already
 * holds pubnet USDC with a trustline) — it is NOT touched here except as the
 * funding source. We create a fresh facilitator signer and a fresh recipient.
 *
 *   facilitator signer  ← 5 XLM   (1 reserve + fee buffer; no USDC, no trustline)
 *   recipient           ← 3 XLM   (1.5 reserve+trustline + slack) + USDC trustline
 *
 * Env:
 *   FUNDER_SECRET   S... of GCEYFLGN (required only with --confirm)
 *   FUNDER_PUBLIC   G... of the funder (default: GCEYFLGN…242P)
 *   SIGNER_XLM      default "5"
 *   RECIPIENT_XLM   default "3"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KEYS_PATH = path.join(HERE, ".keys-pubnet.json");
const ENV_OUT = path.join(HERE, "..", ".env.pubnet");

const HORIZON = "https://horizon.stellar.org";
const FUNDER_PUBLIC =
  process.env.FUNDER_PUBLIC ?? "GCEYFLGNHCW4EIEX5LAVYGIGPT2KLHHVB6EOUWKKALA2FT7RMCHI242P";
const SIGNER_XLM = process.env.SIGNER_XLM ?? "5";
const RECIPIENT_XLM = process.env.RECIPIENT_XLM ?? "3";
const CONFIRM = process.argv.includes("--confirm");
const FEE = String(Math.max(Number(BASE_FEE), 10000)); // 0.001 XLM, mainnet-safe

const horizon = new Horizon.Server(HORIZON);

function log(...a) {
  console.log(...a);
}

/** Load persisted keypairs or generate+persist fresh ones (never overwrite). */
function loadOrCreateKeys() {
  if (fs.existsSync(KEYS_PATH)) {
    const saved = JSON.parse(fs.readFileSync(KEYS_PATH, "utf8"));
    return {
      signer: Keypair.fromSecret(saved.signerSecret),
      recipient: Keypair.fromSecret(saved.recipientSecret),
      reused: true,
    };
  }
  const signer = Keypair.random();
  const recipient = Keypair.random();
  fs.writeFileSync(
    KEYS_PATH,
    JSON.stringify(
      {
        note: "pubnet keys for x402-bazaar settlement. KEEP PRIVATE. Do not commit.",
        signerPublic: signer.publicKey(),
        signerSecret: signer.secret(),
        recipientPublic: recipient.publicKey(),
        recipientSecret: recipient.secret(),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  return { signer, recipient, reused: false };
}

async function accountExists(pubkey) {
  try {
    return await horizon.loadAccount(pubkey);
  } catch (e) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

function nativeBalance(acct) {
  return Number(acct.balances.find((b) => b.asset_type === "native")?.balance ?? 0);
}

/** Read the pubnet USDC asset (code+issuer) straight off the funder's own balance. */
function usdcFromFunder(funder) {
  const line = funder.balances.find(
    (b) => b.asset_code === "USDC" && b.asset_type !== "native",
  );
  if (!line) {
    throw new Error(
      "funder has no USDC trustline on pubnet — cannot determine the USDC issuer. " +
        "Fund the funder with USDC first, or set the issuer manually.",
    );
  }
  return { asset: new Asset("USDC", line.asset_issuer), balance: Number(line.balance) };
}

async function main() {
  log("x402-bazaar · pubnet settlement setup");
  log(CONFIRM ? "MODE: --confirm (WILL broadcast real mainnet transactions)" : "MODE: dry-run (no broadcast)");
  log("");

  const funder = await accountExists(FUNDER_PUBLIC);
  if (!funder) throw new Error(`funder ${FUNDER_PUBLIC} does not exist on pubnet`);
  const { asset: usdc, balance: usdcBal } = usdcFromFunder(funder);
  const funderXlm = nativeBalance(funder);

  const { signer, recipient, reused } = loadOrCreateKeys();
  const signerAcct = await accountExists(signer.publicKey());
  const recipientAcct = await accountExists(recipient.publicKey());

  const needSigner = !signerAcct;
  const needRecipient = !recipientAcct;
  const recipientHasTrust =
    recipientAcct?.balances.some(
      (b) => b.asset_code === "USDC" && b.asset_issuer === usdc.getIssuer(),
    ) ?? false;

  const xlmOut =
    (needSigner ? Number(SIGNER_XLM) : 0) + (needRecipient ? Number(RECIPIENT_XLM) : 0);

  log("Funder (also the PAYER for the settlement):");
  log(`  ${FUNDER_PUBLIC}`);
  log(`  XLM: ${funderXlm.toFixed(4)}   USDC: ${usdcBal} (issuer ${usdc.getIssuer().slice(0, 12)}…)`);
  log("");
  log(`Keys ${reused ? "REUSED from" : "GENERATED and saved to"} scripts/.keys-pubnet.json`);
  log("");
  log("Facilitator signer (submits + sponsors fees; no USDC, no trustline):");
  log(`  ${signer.publicKey()}`);
  log(`  action: ${needSigner ? `createAccount, fund ${SIGNER_XLM} XLM` : "already exists — skip"}`);
  log("");
  log("Recipient (payTo; needs USDC trustline):");
  log(`  ${recipient.publicKey()}`);
  log(`  action: ${needRecipient ? `createAccount, fund ${RECIPIENT_XLM} XLM` : "already exists — skip"}`);
  log(`  trustline: ${recipientHasTrust ? "present — skip" : "will add USDC trustline"}`);
  log("");
  log(`Total XLM to send from funder: ${xlmOut} (funder keeps ${(funderXlm - xlmOut).toFixed(4)})`);
  log(`Payment USDC: reuse funder's ${usdcBal} USDC as the payer balance (no new USDC needed)`);
  log("");

  if (funderXlm - xlmOut < 2) {
    log("WARNING: funder would drop below ~2 XLM reserve buffer. Add XLM or lower amounts.");
  }

  if (!CONFIRM) {
    log("Dry run only. Re-run with FUNDER_SECRET=S... and --confirm to broadcast.");
    writeEnv(signer, recipient, usdc);
    return;
  }

  const funderSecret = process.env.FUNDER_SECRET;
  if (!funderSecret) throw new Error("--confirm requires FUNDER_SECRET=S... in the environment");
  const funderKp = Keypair.fromSecret(funderSecret);
  if (funderKp.publicKey() !== FUNDER_PUBLIC) {
    throw new Error(`FUNDER_SECRET is for ${funderKp.publicKey()}, expected ${FUNDER_PUBLIC}`);
  }

  // Phase 1: create + fund the accounts that don't exist yet.
  if (needSigner || needRecipient) {
    const src = await horizon.loadAccount(FUNDER_PUBLIC);
    const b = new TransactionBuilder(src, { fee: FEE, networkPassphrase: Networks.PUBLIC });
    if (needSigner)
      b.addOperation(Operation.createAccount({ destination: signer.publicKey(), startingBalance: SIGNER_XLM }));
    if (needRecipient)
      b.addOperation(Operation.createAccount({ destination: recipient.publicKey(), startingBalance: RECIPIENT_XLM }));
    const tx = b.setTimeout(120).build();
    tx.sign(funderKp);
    const res = await horizon.submitTransaction(tx);
    log(`created accounts: ${res.hash}`);
  } else {
    log("both accounts already exist — skipping creation");
  }

  // Phase 2: recipient adds its own USDC trustline.
  if (!recipientHasTrust) {
    const recAcct = await horizon.loadAccount(recipient.publicKey());
    const tx = new TransactionBuilder(recAcct, { fee: FEE, networkPassphrase: Networks.PUBLIC })
      .addOperation(Operation.changeTrust({ asset: usdc }))
      .setTimeout(120)
      .build();
    tx.sign(recipient);
    const res = await horizon.submitTransaction(tx);
    log(`recipient USDC trustline: ${res.hash}`);
  } else {
    log("recipient already trusts USDC — skipping trustline");
  }

  writeEnv(signer, recipient, usdc);
  log("");
  log("Done. Accounts ready. NO settlement was run.");
  log("Next (when you decide): start the facilitator with the printed .env.pubnet,");
  log("point a seller at it priced in pubnet USDC, and pay from the funder.");
}

function writeEnv(signer, recipient, usdc) {
  const body = [
    "# x402-bazaar pubnet settlement config. Generated by scripts/setup-pubnet.mjs.",
    "# The SIGNER secret is real-mainnet — keep this file private (gitignored).",
    "NETWORKS=stellar:pubnet",
    "RPC_URL=https://mainnet.sorobanrpc.com",
    `SIGNER_SECRET=${signer.secret()}`,
    `FACILITATOR_SIGNER_PUBLIC=${signer.publicKey()}`,
    `STELLAR_RECIPIENT=${recipient.publicKey()}`,
    `PAYER_PUBLIC=${FUNDER_PUBLIC}   # the funder GCEYFLGN is the payer; its secret is in stellar keys`,
    `USDC_ISSUER=${usdc.getIssuer()}`,
    "USDC_SAC=CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75  # pubnet USDC SAC",
    "DB_PATH=./bazaar-pubnet.db",
    "PORT=8402",
    "",
  ].join("\n");
  fs.writeFileSync(ENV_OUT, body, { mode: 0o600 });
  log(`wrote ${path.relative(path.join(HERE, ".."), ENV_OUT)} (signer secret inside — gitignored)`);
}

main().catch((e) => {
  console.error("\nERROR:", e?.response?.data?.extras?.result_codes ?? e.message ?? e);
  process.exit(1);
});
