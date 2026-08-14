import { list, toResource } from "@/lib/data";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const items = list(p.get("network") || undefined, p.get("type") || undefined);
  return Response.json(
    { x402Version: 2, items: items.map(toResource), pagination: { limit: 100, offset: 0, total: items.length } },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
