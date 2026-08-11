/**
 * Zero-dependency BM25 index over catalog entries.
 *
 * Shipped default for /discovery/search. Field-boosted: service metadata and
 * tags carry more weight than schema property names, which carry more than
 * URL tokens. Deterministic and testable — search quality is measured by the
 * eval harness, not asserted.
 */

export interface IndexableDoc {
  /** catalog key — returned by search */
  key: string;
  /** field name → text; each field has a boost in FIELD_BOOSTS */
  fields: Record<string, string>;
}

export interface SearchHit {
  key: string;
  score: number;
}

const FIELD_BOOSTS: Record<string, number> = {
  serviceName: 3.0,
  tags: 3.0,
  description: 2.0,
  schema: 1.2,
  resource: 1.0,
};

const K1 = 1.2;
const B = 0.75;

/** Lowercase, split on non-alphanumerics, drop 1-char tokens, split camelCase. */
export function tokenize(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

interface PostedDoc {
  key: string;
  /** term → weighted term frequency (sum of boost per occurrence) */
  tf: Map<string, number>;
  /** boosted length */
  len: number;
}

export class Bm25Index {
  private docs: PostedDoc[] = [];
  private df = new Map<string, number>();
  private avgLen = 0;

  /** Rebuild the whole index. Catalog sizes here are small (<100k); O(n) rebuild is fine. */
  build(input: IndexableDoc[]): void {
    this.docs = [];
    this.df = new Map();
    let totalLen = 0;
    for (const doc of input) {
      const tf = new Map<string, number>();
      let len = 0;
      for (const [field, text] of Object.entries(doc.fields)) {
        const boost = FIELD_BOOSTS[field] ?? 1.0;
        for (const term of tokenize(text)) {
          tf.set(term, (tf.get(term) ?? 0) + boost);
          len += boost;
        }
      }
      for (const term of tf.keys()) {
        this.df.set(term, (this.df.get(term) ?? 0) + 1);
      }
      this.docs.push({ key: doc.key, tf, len });
      totalLen += len;
    }
    this.avgLen = this.docs.length ? totalLen / this.docs.length : 0;
  }

  get size(): number {
    return this.docs.length;
  }

  search(query: string): SearchHit[] {
    const terms = tokenize(query);
    if (!terms.length || !this.docs.length) return [];
    const n = this.docs.length;
    const hits: SearchHit[] = [];
    for (const doc of this.docs) {
      let score = 0;
      for (const term of terms) {
        const tf = doc.tf.get(term);
        if (!tf) continue;
        const df = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score += (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.len) / this.avgLen));
      }
      if (score > 0) hits.push({ key: doc.key, score });
    }
    hits.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
    return hits;
  }
}
