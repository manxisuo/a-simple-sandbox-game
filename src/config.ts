import type { GameConfig } from './types';

export const GAME_CONFIG = {
  world: {
    seed: 32648517,
    chunkSize: 32,
    viewDistance: 3,
    objectsPerChunk: 7,
    fogNear: 42,
    fogFar: 105,
    terrain: {
      segments: 32,
      macroScale: 0.0045,
      macroAmplitude: 8.5,
      hillScale: 0.014,
      hillAmplitude: 3.2,
      detailScale: 0.045,
      detailAmplitude: 0.55,
      spawnFlatRadius: 11,
      spawnBlendRadius: 24
    }
  },
  player: {
    height: 1.7,
    radius: 0.35,
    moveSpeed: 6.2,
    sprintMultiplier: 1.7,
    jumpSpeed: 6.4,
    gravity: 18.5,
    lookSensitivity: 0.0021
  },
  dayNight: {
    cycleSeconds: 92,
    initialProgress: 0.18
  },
  renderer: {
    maxPixelRatio: 2,
    exposure: 1.05
  }
} satisfies GameConfig;
