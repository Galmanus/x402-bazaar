/**
 * CatalogStore — persistence for discovered x402 resources.
 *
 * Backed by node:sqlite (zero external deps, Node >= 22.5; experimental API,
 * which is why every caller goes through this interface — swapping the engine
 * is a one-file change).
 *
 * Integrity model (see docs/design.md): entries are created ONLY from payments
 * this facilitator itself settled. Provenance (settle count, distinct payers,
 * first/last tx hash) is stored per entry so consumers can discount
 * self-dealing volume.
 */
import { DatabaseSync } from "node:sqlite";
import type { PaymentRequirements } from "@x402/core/types";

export interface CatalogEntry {
  /** primary key: `${network}|${payTo}|${routeTemplate ?? normalizedResource}` */
  key: string;
  resource: string;
  type: "http" | "mcp";
  x402Version: number;
  network: string;
  payTo: string;
  scheme: string;
  routeTemplate?: string;
  accepts: PaymentRequirements[];
  description?: string;
  mimeType?: string;
  serviceName?: string;
  tags?: string[];
  iconUrl?: string;
  extensions?: Record<string, unknown>;
  discoveryInfo?: unknown;
  lastUpdated: string;
  // provenance
  firstSettleTx?: string;
  lastSettleTx?: string;
  settleCount: number;
  distinctPayers: number;
  /**
   * Distinct anonymous credential holders (nullifiers) that paid for this
   * resource, when payers attach a credential proof. Sybil-resistant where
   * distinctPayers is not: addresses are free, credentials are bounded by the
   * association set. Zero when no credential-gated payments were seen.
   */
  distinctCredentialHolders: number;
}

export interface ListFilters {
  type?: string;
  payTo?: string;
  scheme?: string;
  network?: string;
  /** extension key that must be present on the entry's extensions object */
  extensions?: string;
  limit?: number;
  offset?: number;
}

export interface UpsertInput {
  entry: Omit<
    CatalogEntry,
    | "lastUpdated"
    | "settleCount"
    | "distinctPayers"
    | "distinctCredentialHolders"
    | "firstSettleTx"
    | "lastSettleTx"
  >;
  txHash?: string;
  payer?: string;
  /** Anonymous credential nullifier, if the payment carried a verified credential. */
  credentialNullifier?: string;
  now?: string;
}

export class CatalogStore {
  private db: DatabaseSync;

  constructor(path: string = ":memory:") {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resources (
        key TEXT PRIMARY KEY,
        resource TEXT NOT NULL,
        type TEXT NOT NULL,
        x402_version INTEGER NOT NULL,
        network TEXT NOT NULL,
        pay_to TEXT NOT NULL,
        scheme TEXT NOT NULL,
        route_template TEXT,
        accepts TEXT NOT NULL,
        description TEXT,
        mime_type TEXT,
        service_name TEXT,
        tags TEXT,
        icon_url TEXT,
        extensions TEXT,
        discovery_info TEXT,
        last_updated TEXT NOT NULL,
        first_settle_tx TEXT,
        last_settle_tx TEXT,
        settle_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS payers (
        key TEXT NOT NULL,
        payer TEXT NOT NULL,
        PRIMARY KEY (key, payer)
      );
      CREATE TABLE IF NOT EXISTS credentials (
        key TEXT NOT NULL,
        nullifier TEXT NOT NULL,
        PRIMARY KEY (key, nullifier)
      );
      CREATE INDEX IF NOT EXISTS idx_resources_network ON resources(network);
      CREATE INDEX IF NOT EXISTS idx_resources_pay_to ON resources(pay_to);
    `);
  }

  upsert({ entry, txHash, payer, credentialNullifier, now }: UpsertInput): CatalogEntry {
    const ts = now ?? new Date().toISOString();
    const existing = this.get(entry.key);
    if (existing) {
      this.db
        .prepare(
          `UPDATE resources SET resource=?, x402_version=?, accepts=?, description=?, mime_type=?,
           service_name=?, tags=?, icon_url=?, extensions=?, discovery_info=?, last_updated=?,
           last_settle_tx=COALESCE(?, last_settle_tx), settle_count=settle_count+? WHERE key=?`,
        )
        .run(
          entry.resource,
          entry.x402Version,
          JSON.stringify(entry.accepts),
          entry.description ?? null,
          entry.mimeType ?? null,
          entry.serviceName ?? null,
          entry.tags ? JSON.stringify(entry.tags) : null,
          entry.iconUrl ?? null,
          entry.extensions ? JSON.stringify(entry.extensions) : null,
          entry.discoveryInfo !== undefined ? JSON.stringify(entry.discoveryInfo) : null,
          ts,
          txHash ?? null,
          txHash ? 1 : 0,
          entry.key,
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO resources (key, resource, type, x402_version, network, pay_to, scheme,
           route_template, accepts, description, mime_type, service_name, tags, icon_url,
           extensions, discovery_info, last_updated, first_settle_tx, last_settle_tx, settle_count)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          entry.key,
          entry.resource,
          entry.type,
          entry.x402Version,
          entry.network,
          entry.payTo,
          entry.scheme,
          entry.routeTemplate ?? null,
          JSON.stringify(entry.accepts),
          entry.description ?? null,
          entry.mimeType ?? null,
          entry.serviceName ?? null,
          entry.tags ? JSON.stringify(entry.tags) : null,
          entry.iconUrl ?? null,
          entry.extensions ? JSON.stringify(entry.extensions) : null,
          entry.discoveryInfo !== undefined ? JSON.stringify(entry.discoveryInfo) : null,
          ts,
          txHash ?? null,
          txHash ?? null,
          txHash ? 1 : 0,
        );
    }
    if (payer) {
      this.db.prepare(`INSERT OR IGNORE INTO payers (key, payer) VALUES (?,?)`).run(entry.key, payer);
    }
    if (credentialNullifier) {
      this.db
        .prepare(`INSERT OR IGNORE INTO credentials (key, nullifier) VALUES (?,?)`)
        .run(entry.key, credentialNullifier);
    }
    const result = this.get(entry.key);
    if (!result) throw new Error(`upsert failed for ${entry.key}`);
    return result;
  }

  get(key: string): CatalogEntry | undefined {
    const row = this.db.prepare(`SELECT * FROM resources WHERE key=?`).get(key) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToEntry(row) : undefined;
  }

  /** List with the spec's filters. Returns page + total matching count. */
  list(filters: ListFilters = {}): { items: CatalogEntry[]; total: number; limit: number; offset: number } {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.type) { where.push("type=?"); params.push(filters.type); }
    if (filters.payTo) { where.push("pay_to=?"); params.push(filters.payTo); }
    if (filters.scheme) { where.push("scheme=?"); params.push(filters.scheme); }
    if (filters.network) { where.push("network=?"); params.push(filters.network); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    let rows = (this.db
      .prepare(`SELECT * FROM resources ${whereSql} ORDER BY last_updated DESC, key ASC`)
      .all(...(params as never[])) as Record<string, unknown>[]).map((r) => this.rowToEntry(r));
    // extensions filter needs JSON inspection; catalog scale makes in-process filtering fine
    if (filters.extensions) {
      rows = rows.filter((e) => e.extensions && Object.hasOwn(e.extensions, filters.extensions!));
    }
    const total = rows.length;
    const limit = clampLimit(filters.limit);
    const offset = Math.max(0, filters.offset ?? 0);
    return { items: rows.slice(offset, offset + limit), total, limit, offset };
  }

  /** All entries — used to (re)build the search index. */
  all(): CatalogEntry[] {
    return (this.db.prepare(`SELECT * FROM resources`).all() as Record<string, unknown>[]).map((r) =>
      this.rowToEntry(r),
    );
  }

  close(): void {
    this.db.close();
  }

  private rowToEntry(row: Record<string, unknown>): CatalogEntry {
    const key = row.key as string;
    const payerRow = this.db
      .prepare(`SELECT COUNT(*) AS c FROM payers WHERE key=?`)
      .get(key) as { c: number };
    const credRow = this.db
      .prepare(`SELECT COUNT(*) AS c FROM credentials WHERE key=?`)
      .get(key) as { c: number };
    return {
      key,
      resource: row.resource as string,
      type: row.type as "http" | "mcp",
      x402Version: row.x402_version as number,
      network: row.network as string,
      payTo: row.pay_to as string,
      scheme: row.scheme as string,
      routeTemplate: (row.route_template as string | null) ?? undefined,
      accepts: JSON.parse(row.accepts as string),
      description: (row.description as string | null) ?? undefined,
      mimeType: (row.mime_type as string | null) ?? undefined,
      serviceName: (row.service_name as string | null) ?? undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      iconUrl: (row.icon_url as string | null) ?? undefined,
      extensions: row.extensions ? JSON.parse(row.extensions as string) : undefined,
      discoveryInfo: row.discovery_info ? JSON.parse(row.discovery_info as string) : undefined,
      lastUpdated: row.last_updated as string,
      firstSettleTx: (row.first_settle_tx as string | null) ?? undefined,
      lastSettleTx: (row.last_settle_tx as string | null) ?? undefined,
      settleCount: row.settle_count as number,
      distinctPayers: payerRow.c,
      distinctCredentialHolders: credRow.c,
    };
  }
}

export function clampLimit(limit: number | undefined, fallback = 100, max = 100): number {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) return fallback;
  return Math.min(Math.floor(limit), max);
}
