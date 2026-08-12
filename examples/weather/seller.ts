/**
 * Example seller: a paid weather API using the standard upstream stack
 * (@x402/express + @x402/stellar server scheme + bazaar discovery extension),
 * pointed at the x402-bazaar facilitator. Nothing here is specific to this
 * facilitator — which is the point: any x402 seller works unchanged.
 *
 * Env: FACILITATOR_URL (default http://localhost:8402), STELLAR_RECIPIENT, PORT (4600)
 */
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";

const NETWORK = process.env.STELLAR_NETWORK ?? "stellar:testnet";
const payTo = process.env.STELLAR_RECIPIENT;
if (!payTo) throw new Error("STELLAR_RECIPIENT is required");

const facilitator = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL ?? "http://localhost:8402",
});

const server = new x402ResourceServer(facilitator)
  .register(NETWORK as never, new ExactStellarScheme())
  .registerExtension(bazaarResourceServerExtension);

const app = express();
app.use(
  paymentMiddleware(
    {
      "GET /weather": {
        accepts: {
          scheme: "exact",
          // Default USDC; set PRICE_ASSET (a SEP-41 SAC C... address) and
          // PRICE_AMOUNT (base units, 7 decimals) to charge any other token.
          price: process.env.PRICE_ASSET
            ? { amount: process.env.PRICE_AMOUNT ?? "1000000", asset: process.env.PRICE_ASSET }
            : (process.env.PRICE_USD ?? "$0.05"),
          network: NETWORK as never,
          payTo,
          // Interim: client and facilitator estimate ledger close time independently
          // (Horizon sample); at 60s the offset divergence can exceed the +2 ledger
          // tolerance and verify fails with expiration_too_far. 30s keeps the
          // divergence within tolerance while leaving enough real-time window. Reported upstream.
          maxTimeoutSeconds: 45,
        },
        description: "Current weather conditions and temperature for any city",
        mimeType: "application/json",
        serviceName: "BazaarWeather",
        tags: ["weather", "forecast", "temperature"],
        extensions: declareDiscoveryExtension({
          input: { city: "Blumenau" },
          inputSchema: {
            type: "object",
            properties: { city: { type: "string", description: "city name" } },
            required: ["city"],
          },
          output: { example: { city: "Blumenau", tempC: 25, conditions: "clear" } },
        } as never),
      },
    },
    server,
  ),
);

app.get("/weather", (req, res) => {
  res.json({ city: req.query.city ?? "Blumenau", tempC: 25, conditions: "clear" });
});

const port = Number(process.env.PORT ?? 4600);
app.listen(port, () => console.log(`weather seller on :${port} (${NETWORK})`));
