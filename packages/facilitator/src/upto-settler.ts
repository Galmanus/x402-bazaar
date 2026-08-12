/**
 * Production UptoSettler: performs the upto capture phase by invoking the
 * deployed upto-authorization contract's `settle(auth_id, actual)` with the
 * facilitator's own signer (permissionless call — everything that matters was
 * pinned by the buyer's authorize signature). The contract enforces
 * `actual <= cap` and single-settlement on-chain.
 *
 * Uses the `stellar` CLI so it stays a thin shell over the same tooling the
 * conformance runs use; swap for an SDK invocation if the CLI is unavailable.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { UptoSettler } from "./app.ts";

const run = promisify(execFile);

export interface UptoSettlerConfig {
  /** S... secret of the facilitator signer that submits the capture. */
  signerSecret: string;
  /** stellar CLI network name per CAIP-2 id, e.g. { "stellar:pubnet": "mainnet" }. */
  cliNetwork: Record<string, string>;
}

export class CliUptoSettler implements UptoSettler {
  constructor(private config: UptoSettlerConfig) {}

  async settle(input: {
    network: string;
    contractId: string;
    authId: string;
    actual: string;
  }): Promise<{ success: boolean; transaction?: string; errorReason?: string }> {
    const cliNet = this.config.cliNetwork[input.network];
    if (!cliNet) return { success: false, errorReason: `no CLI network mapping for ${input.network}` };
    try {
      const { stdout, stderr } = await run("stellar", [
        "contract", "invoke",
        "--id", input.contractId,
        "--source-account", this.config.signerSecret,
        "--network", cliNet,
        "--send", "yes",
        "--",
        "settle",
        "--auth_id", input.authId,
        "--actual", input.actual,
      ]);
      // The CLI prints the tx hash on the "Signing transaction: <hash>" line.
      const hash = /Signing transaction:\s*([0-9a-f]{64})/i.exec(stderr + stdout)?.[1];
      return { success: true, transaction: hash };
    } catch (err) {
      const e = err as { stderr?: string; message?: string };
      return { success: false, errorReason: (e.stderr ?? e.message ?? "settle failed").slice(0, 300) };
    }
  }
}
