/**
 * Optional local embedding provider + reciprocal rank fusion.
 *
 * Disabled by default (BM25-only). Our own eval (eval/search-eval.ts) shows why
 * it exists: BM25 scores 0 whenever agent vocabulary diverges from catalog
 * vocabulary ("will it rain" vs "weather forecast") — the ToolRet failure mode.
 * A small local model (all-MiniLM-L6-v2, ~23MB, runs in-process, no API calls,
 * self-hostable) closes that gap; RRF fuses both rankings without score
 * calibration. Enable with `EmbeddingProvider` injection or EMBEDDINGS=local.
 */

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

/** all-MiniLM-L6-v2 via @huggingface/transformers (ONNX, CPU, in-process). */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  private pipe: Promise<(texts: string[], opts: object) => Promise<{ tolist(): number[][] }>>;

  constructor(model = "Xenova/all-MiniLM-L6-v2") {
    this.pipe = import("@huggingface/transformers").then(
      ({ pipeline }) => pipeline("feature-extraction", model) as never,
    );
  }

  async embed(texts: string[]): Promise<number[][]> {
    const pipe = await this.pipe;
    const output = await pipe(texts, { pooling: "mean", normalize: true });
    return output.tolist();
  }
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are normalized
}

/**
 * Reciprocal rank fusion (k=60, the standard constant): fuses rankings without
 * needing comparable scores. Items missing from a ranking contribute nothing.
 */
export function rrfFuse(rankings: string[][], k = 60): string[] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((key, i) => {
      scores.set(key, (scores.get(key) ?? 0) + 1 / (k + i + 1));
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key);
}
