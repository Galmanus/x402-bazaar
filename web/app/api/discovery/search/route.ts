import { search, toResource } from "@/lib/data";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("query") || "";
  if (!q)
    return Response.json({ code: "missing_query", reason: "query parameter is required" }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  const items = search(q);
  return Response.json(
    { x402Version: 2, resources: items.map(toResource), partialResults: false, total: items.length },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
