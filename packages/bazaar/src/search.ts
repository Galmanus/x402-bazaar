/**
 * /discovery/search backend: BM25 over the catalog with opaque cursor
 * pagination and the spec's partialResults flag.
 *
 * The cursor encodes {queryHash, offset}. If the catalog changed between
 * pages (entry count or latest update differs from what the cursor saw),
 * results may be inconsistent across pages — that is exactly what
 * partialResults signals.
 */
import { createHash } from "node:crypto";
import { Bm25Index, type IndexableDoc } from "./bm25.ts";
import { clampLimit, type CatalogEntry, type CatalogStore, type ListFilters } from "./store.ts";

export interface SearchParams extends Omit<ListFilters, "limit" | "offset"> {
  query: string;
  limit?: number;
  cursor?: string;
}

export interface SearchPage {
  items: CatalogEntry[];
  nextCursor?: string;
  partialResults: boolean;
  total: number;
}

interface CursorState {
  q: string; // query+filters hash
  o: number; // offset
  s: string; // catalog snapshot hash the first page was served from
}

export class SearchEngine {
  private index = new Bm25Index();
  private snapshot = "";

  constructor(private store: CatalogStore) {
    this.rebuild();
  }

  /** Rebuild after catalog writes. O(catalog); call sites are settle-time only. */
  rebuild(): void {
    const entries = this.store.all();
    this.index.build(entries.map(toDoc));
    this.snapshot = hash(
      entries.length + "|" + (entries.map((e) => e.lastUpdated).sort().at(-1) ?? ""),
    );
  }

  search(params: SearchParams): SearchPage {
    const limit = clampLimit(params.limit, 20, 100);
    const qhash = hash(
      JSON.stringify([params.query, params.type, params.payTo, params.scheme, params.network, params.extensions]),
    );

    let offset = 0;
    let partialResults = false;
    if (params.cursor) {
      const state = decodeCursor(params.cursor);
      if (state && state.q === qhash) {
        offset = state.o;
        partialResults = state.s !== this.snapshot;
      } else {
        // cursor for another query or unreadable — restart, flag partial
        partialResults = true;
      }
    }

    const hits = this.index.search(params.query);
    const byKey = new Map(this.store.all().map((e) => [e.key, e]));
    const filtered: CatalogEntry[] = [];
    for (const hit of hits) {
      const entry = byKey.get(hit.key);
      if (!entry) continue;
      if (params.type && entry.type !== params.type) continue;
      if (params.payTo && entry.payTo !== params.payTo) continue;
      if (params.scheme && entry.scheme !== params.scheme) continue;
      if (params.network && entry.network !== params.network) continue;
      if (params.extensions && !(entry.extensions && Object.hasOwn(entry.extensions, params.extensions))) continue;
      filtered.push(entry);
    }

    const page = filtered.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const nextCursor =
      nextOffset < filtered.length
        ? encodeCursor({ q: qhash, o: nextOffset, s: this.snapshot })
        : undefined;
    return { items: page, nextCursor, partialResults, total: filtered.length };
  }
}

function toDoc(entry: CatalogEntry): IndexableDoc {
  const schemaText = entry.discoveryInfo ? flattenKeysAndStrings(entry.discoveryInfo).join(" ") : "";
  return {
    key: entry.key,
    fields: {
      serviceName: entry.serviceName ?? "",
      tags: (entry.tags ?? []).join(" "),
      description: entry.description ?? "",
      schema: schemaText,
      resource: entry.resource + " " + (entry.routeTemplate ?? ""),
    },
  };
}

/** Collect JSON object keys and short string values — schema property names and descriptions. */
export function flattenKeysAndStrings(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 6 || out.length > 500) return out;
  if (typeof value === "string") {
    if (value.length <= 120) out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) flattenKeysAndStrings(v, depth + 1, out);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.push(k);
      flattenKeysAndStrings(v, depth + 1, out);
    }
  }
  return out;
}

function hash(text: string): string {
  return createHash("sha256").update(text).digest("base64url").slice(0, 12);
}

function encodeCursor(state: CursorState): string {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeCursor(cursor: string): CursorState | undefined {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString());
    if (typeof parsed?.q === "string" && typeof parsed?.o === "number" && typeof parsed?.s === "string") {
      return parsed as CursorState;
    }
  } catch {
    /* fall through */
  }
  return undefined;
}
