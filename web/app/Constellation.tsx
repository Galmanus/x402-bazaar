"use client";
import { useEffect, useRef } from "react";

// THE SIGNATURE — one vanilla-canvas constellation.
// Nodes = the real cataloged services (resources.map — never a hardcoded count).
// Node brightness = real provenance.settleCount (busiest service = brightest star).
// Positions = deterministic hash of the resource URL (stable across reloads).
// Photons = ambient yellow pulses along edges = "the network is live," NOT a
//           per-settlement counter.
// Bounded: alive + spawning only while the hero is in view; frozen (rAF cancelled)
//           once the hero scrolls off, so reading sections are calm and battery-safe.
// Reduced motion: one static frame (stars + edges + every node at full settleCount
//           brightness, zero photons, zero rAF).

export type SkyNode = { id: string; settleCount: number };

// deterministic 0..1 hash (FNV-1a) so the map is STABLE across reloads
function hash01(str: string, seed: number): number {
  let x = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    x ^= str.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return ((x >>> 0) % 100000) / 100000;
}

type Layout = {
  id: string;
  hx: number;
  hy: number;
  ph: number;
  base: number;
  x: number;
  y: number;
  glow: number; // hover / arrival bloom, decays
};

type Photon = { e: number; t: number; sp: number };

export default function Constellation({ nodes }: { nodes: SkyNode[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const small = window.innerWidth < 640;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const MAX_PHOTONS = small ? 2 : 4;
    const SPAWN_MS = small ? 3200 : 2200;

    let W = 0;
    let H = 0;
    let raf = 0;
    let running = false;
    let heroInView = true;

    // --- layout: settleCount drives brightness -------------------------------
    const maxS = Math.max(1, ...nodes.map((n) => n.settleCount));
    const N: Layout[] = nodes.map((n) => ({
      id: n.id,
      // bias nodes toward the right / upper field so the left-aligned hero type
      // sits on the calmest region of the canvas (protects the 5-second read)
      hx: 0.42 + hash01(n.id, 1) * 0.54,
      hy: 0.1 + hash01(n.id, 2) * 0.8,
      ph: hash01(n.id, 3) * Math.PI * 2,
      base: 0.4 + 0.6 * (n.settleCount / maxS),
      x: 0,
      y: 0,
      glow: 0,
    }));

    // --- edges: each node to its 1-2 hash-nearest neighbours -----------------
    const E: [number, number][] = [];
    const seen = new Set<string>();
    for (let i = 0; i < N.length; i++) {
      const order = N.map((_, j) => j)
        .filter((j) => j !== i)
        .sort((a, b) => {
          const da = (N[a].hx - N[i].hx) ** 2 + (N[a].hy - N[i].hy) ** 2;
          const db = (N[b].hx - N[i].hx) ** 2 + (N[b].hy - N[i].hy) ** 2;
          return da - db;
        });
      const k = Math.min(order.length, 2);
      for (let c = 0; c < k; c++) {
        const j = order[c];
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          E.push([Math.min(i, j), Math.max(i, j)]);
        }
      }
    }

    // --- deterministic sparse starfield --------------------------------------
    const STAR_N = small ? 34 : 58;
    const stars = Array.from({ length: STAR_N }, (_, i) => ({
      x: hash01("star" + i, 7),
      y: hash01("star" + i, 11),
      a: 0.06 + hash01("star" + i, 13) * 0.22,
      ph: hash01("star" + i, 17) * Math.PI * 2,
    }));

    // --- offscreen node glow sprite (drawImage instead of per-frame gradient)-
    const SPRITE = 96;
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE;
    sprite.height = SPRITE;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const g = sctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
      g.addColorStop(0, "rgba(255,233,107,0.95)");
      g.addColorStop(0.35, "rgba(253,218,36,0.42)");
      g.addColorStop(1, "rgba(253,218,36,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, SPRITE, SPRITE);
    }

    const photons: Photon[] = [];
    const t0 = performance.now();

    function resize() {
      W = cv!.clientWidth;
      H = cv!.clientHeight;
      cv!.width = Math.max(1, Math.floor(W * dpr));
      cv!.height = Math.max(1, Math.floor(H * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const n of N) {
        n.x = 48 + n.hx * Math.max(1, W - 96);
        n.y = 64 + n.hy * Math.max(1, H - 128);
      }
    }

    function drawSprite(x: number, y: number, radius: number, alpha: number) {
      if (alpha <= 0.01) return;
      const d = radius * 2;
      ctx!.globalAlpha = Math.min(1, alpha);
      ctx!.drawImage(sprite, x - radius, y - radius, d, d);
      ctx!.globalAlpha = 1;
    }

    function drawStatic() {
      // one calm frame: stars + edges + every node pre-bloomed at full brightness
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = "#0d0d0d";
      ctx!.fillRect(0, 0, W, H);
      for (const s of stars) {
        ctx!.fillStyle = `rgba(250,250,250,${s.a})`;
        ctx!.fillRect(s.x * W, s.y * H, 1, 1);
      }
      ctx!.strokeStyle = "rgba(27,33,64,0.9)";
      ctx!.lineWidth = 1;
      for (const [a, b] of E) {
        ctx!.beginPath();
        ctx!.moveTo(N[a].x, N[a].y);
        ctx!.lineTo(N[b].x, N[b].y);
        ctx!.stroke();
      }
      ctx!.globalCompositeOperation = "lighter";
      for (const n of N) {
        drawSprite(n.x, n.y, 8 + n.base * 22, n.base);
        ctx!.globalCompositeOperation = "source-over";
        ctx!.fillStyle = `rgba(250,250,250,${0.7 * n.base})`;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, 1.6, 0, 7);
        ctx!.fill();
        ctx!.globalCompositeOperation = "lighter";
      }
      ctx!.globalCompositeOperation = "source-over";
    }

    function frame(now: number) {
      const elapsed = now - t0;

      // phosphor decay: translucent void over the frame instead of clearing ->
      // photons leave a comet trail; persistent stars/edges/nodes are redrawn
      // crisp each frame so the fade is imperceptible on them.
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = "rgba(13,13,13,0.22)";
      ctx!.fillRect(0, 0, W, H);

      // stars (twinkle on desktop only)
      for (const s of stars) {
        const tw = small ? 1 : 0.7 + 0.3 * Math.sin(elapsed * 0.0006 + s.ph);
        ctx!.fillStyle = `rgba(250,250,250,${s.a * tw})`;
        ctx!.fillRect(s.x * W, s.y * H, 1, 1);
      }

      // edges (faint indigo hairlines)
      ctx!.strokeStyle = "rgba(27,33,64,0.9)";
      ctx!.lineWidth = 1;
      for (const [a, b] of E) {
        ctx!.beginPath();
        ctx!.moveTo(N[a].x, N[a].y);
        ctx!.lineTo(N[b].x, N[b].y);
        ctx!.stroke();
      }

      // ignition cascade: static field first ~400ms, then nodes bloom in a
      // 60ms staggered radial cascade so the constellation assembles itself.
      const dimTarget = heroInView ? 1 : 0.28;

      ctx!.globalCompositeOperation = "lighter";
      N.forEach((n, i) => {
        const igniteAt = 400 + i * 60;
        const intro = Math.max(0, Math.min(1, (elapsed - igniteAt) / 520));
        const twinkle = small ? 1 : 0.78 + 0.22 * Math.sin(elapsed * 0.001 + n.ph);
        const b = Math.min(1.4, n.base * twinkle * intro * dimTarget + n.glow);
        drawSprite(n.x, n.y, 8 + b * 22, b);
        n.glow *= 0.92;
      });

      // ambient photons (hero only)
      if (heroInView) {
        for (let i = photons.length - 1; i >= 0; i--) {
          const p = photons[i];
          const [a, b] = E[p.e];
          p.t += p.sp;
          const x = N[a].x + (N[b].x - N[a].x) * p.t;
          const y = N[a].y + (N[b].y - N[a].y) * p.t;
          drawSprite(x, y, 12, 1);
          if (p.t >= 1) {
            N[b].glow = 1.2; // ignite destination on arrival
            photons.splice(i, 1);
          }
        }
      }
      ctx!.globalCompositeOperation = "source-over";

      // node cores
      N.forEach((n, i) => {
        const igniteAt = 400 + i * 60;
        const intro = Math.max(0, Math.min(1, (elapsed - igniteAt) / 520));
        ctx!.fillStyle = `rgba(250,250,250,${0.7 * n.base * intro * dimTarget})`;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, 1.6, 0, 7);
        ctx!.fill();
      });

      raf = requestAnimationFrame(frame);
    }

    let spawn = 0;
    let lastSpawn = performance.now();
    function spawnLoop(now: number) {
      if (heroInView && E.length && photons.length < MAX_PHOTONS && now - lastSpawn > SPAWN_MS) {
        lastSpawn = now;
        photons.push({
          e: Math.floor(Math.random() * E.length),
          t: 0,
          sp: 0.004 + Math.random() * 0.004,
        });
      }
      spawn = requestAnimationFrame(spawnLoop);
    }

    function start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
      spawn = requestAnimationFrame(spawnLoop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(spawn);
    }

    resize();

    if (reduce) {
      drawStatic();
      const onResizeStatic = () => {
        resize();
        drawStatic();
      };
      window.addEventListener("resize", onResizeStatic);
      return () => window.removeEventListener("resize", onResizeStatic);
    }

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    // bound liveness to the hero viewport
    const hero = document.querySelector(".hero");
    let io: IntersectionObserver | null = null;
    if (hero && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          heroInView = entries[0].isIntersecting;
          if (heroInView && !document.hidden) start();
          else stop();
        },
        { threshold: 0.05 },
      );
      io.observe(hero);
    }

    const onVis = () => {
      if (document.hidden) stop();
      else if (heroInView) start();
    };
    document.addEventListener("visibilitychange", onVis);

    // card hover bridge: brighten the matching star
    const onHover = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      const n = N.find((v) => v.id === detail);
      if (n) n.glow = 1.4;
    };
    window.addEventListener("bazaar:hover", onHover as EventListener);

    start();

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("bazaar:hover", onHover as EventListener);
      if (io) io.disconnect();
    };
  }, [nodes]);

  return <canvas ref={ref} className="sky" aria-hidden="true" />;
}
