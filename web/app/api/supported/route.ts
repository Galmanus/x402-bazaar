export const dynamic = "force-static";
export async function GET() {
  return Response.json(
    {
      kinds: [
        { x402Version: 2, scheme: "exact", network: "stellar:testnet", extra: { areFeesSponsored: true } },
        { x402Version: 2, scheme: "exact", network: "stellar:pubnet", extra: { areFeesSponsored: true } },
      ],
      extensions: ["bazaar"],
      signers: {},
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
