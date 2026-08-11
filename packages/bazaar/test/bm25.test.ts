import { describe, expect, test } from "vitest";
import { Bm25Index, tokenize } from "../src/bm25.ts";

describe("tokenize", () => {
  test("lowercases, splits camelCase and non-alphanumerics, drops 1-char tokens", () => {
    expect(tokenize("getWeatherData /api/v2/weather-now")).toEqual([
      "get", "weather", "data", "api", "v2", "weather", "now",
    ]);
  });
});

describe("Bm25Index", () => {
  const docs = [
    { key: "weather", fields: { description: "current weather data for any location", tags: "weather forecast" } },
    { key: "stocks", fields: { description: "stock price quotes and market data", tags: "finance stocks" } },
    { key: "translate", fields: { description: "translate text between languages", tags: "nlp translation" } },
  ];

  test("ranks the on-topic document first", () => {
    const index = new Bm25Index();
    index.build(docs);
    const hits = index.search("weather forecast for tomorrow");
    expect(hits[0]?.key).toBe("weather");
  });

  test("field boost: a tag match outranks a description-only match", () => {
    const index = new Bm25Index();
    index.build([
      { key: "tagged", fields: { tags: "translation", description: "misc service" } },
      { key: "described", fields: { tags: "misc", description: "translation" } },
    ]);
    const hits = index.search("translation");
    expect(hits.map((h) => h.key)).toEqual(["tagged", "described"]);
  });

  test("no matches → empty; empty query → empty", () => {
    const index = new Bm25Index();
    index.build(docs);
    expect(index.search("quantum blockchain unicorns")).toEqual([]);
    expect(index.search("")).toEqual([]);
  });

  test("deterministic tie-break by key", () => {
    const index = new Bm25Index();
    index.build([
      { key: "b", fields: { description: "same text" } },
      { key: "a", fields: { description: "same text" } },
    ]);
    expect(index.search("same text").map((h) => h.key)).toEqual(["a", "b"]);
  });
});
