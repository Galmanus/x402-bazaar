import React from "react";
import { Composition } from "remotion";
import { FPS } from "./theme";
import { Main, MAIN_LEN } from "./scenes";
import { PQ402, PQ402_LEN } from "./pq402";
import { Sorohunter, SORO_LEN } from "./sorohunter";
import { SPP, SPP_LEN } from "./spp";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="x402bazaar" component={Main} durationInFrames={MAIN_LEN} fps={FPS} width={1920} height={1080} />
    <Composition id="pq402" component={PQ402} durationInFrames={PQ402_LEN} fps={FPS} width={1920} height={1080} />
    <Composition id="sorohunter" component={Sorohunter} durationInFrames={SORO_LEN} fps={FPS} width={1920} height={1080} />
    <Composition id="spp" component={SPP} durationInFrames={SPP_LEN} fps={FPS} width={1920} height={1080} />
  </>
);
