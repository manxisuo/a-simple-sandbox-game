export const GAME_CONFIG = {
  world: {
    seed: 32648517,
    chunkSize: 32,
    viewDistance: 3,
    objectsPerChunk: 7,
    fogNear: 42,
    fogFar: 105
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
};
