# video

The README explainer, built with [Remotion](https://www.remotion.dev/) (programmatic
video in React). ~22s, 1920×1080, 30fps.

```sh
cd video
npm install
# render (uses system Chrome; drop the env var to let Remotion fetch its own)
REMOTION_CHROME_EXECUTABLE=/opt/google/chrome/chrome \
  npx remotion render src/index.ts x402bazaar out/x402-bazaar.mp4 --codec=h264
```

Scenes: title → payment + auto-cataloging flow → mainnet settlement proof (real tx) →
natural-language search with provenance → close. Output committed at
`../assets/x402-bazaar.mp4`.
