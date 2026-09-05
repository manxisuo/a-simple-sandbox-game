import { GAME_CONFIG } from '../config';
import type { CameraMode } from '../camera/CameraController';
import type { TerrainConfig, WorldConfig } from '../types';

export interface RuntimeSettings {
  time: {
    cycleEnabled: boolean;
    allowNight: boolean;
    cycleSeconds: number;
    timeOfDay: number;
  };
  terrain: TerrainConfig;
  camera: {
    mode: CameraMode;
    thirdPersonDistance: number;
    lookSensitivity: number;
  };
  visual: {
    viewDistance: number;
    fogFar: number;
    shadows: boolean;
    showSun: boolean;
    showMoon: boolean;
  };
}

const STORAGE_KEY = 'a-simple-sandbox-game.settings.v1';

export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  time: {
    cycleEnabled: true,
    allowNight: true,
    cycleSeconds: GAME_CONFIG.dayNight.cycleSeconds,
    timeOfDay: GAME_CONFIG.dayNight.initialProgress
  },
  terrain: { ...GAME_CONFIG.world.terrain },
  camera: {
    mode: 'first-person',
    thirdPersonDistance: 5.4,
    lookSensitivity: GAME_CONFIG.player.lookSensitivity
  },
  visual: {
    viewDistance: GAME_CONFIG.world.viewDistance,
    fogFar: GAME_CONFIG.world.fogFar,
    shadows: true,
    showSun: true,
    showMoon: true
  }
};

function mergeSettings(saved: Partial<RuntimeSettings> | null): RuntimeSettings {
  return {
    time: { ...DEFAULT_RUNTIME_SETTINGS.time, ...(saved?.time ?? {}) },
    terrain: { ...DEFAULT_RUNTIME_SETTINGS.terrain, ...(saved?.terrain ?? {}) },
    camera: { ...DEFAULT_RUNTIME_SETTINGS.camera, ...(saved?.camera ?? {}) },
    visual: { ...DEFAULT_RUNTIME_SETTINGS.visual, ...(saved?.visual ?? {}) }
  };
}

export function loadRuntimeSettings(): RuntimeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeSettings(null);
    return mergeSettings(JSON.parse(raw) as Partial<RuntimeSettings>);
  } catch {
    return mergeSettings(null);
  }
}

export function saveRuntimeSettings(settings: RuntimeSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetRuntimeSettings(): RuntimeSettings {
  const settings = mergeSettings(null);
  saveRuntimeSettings(settings);
  return settings;
}

export function createRuntimeWorldConfig(settings: RuntimeSettings): WorldConfig {
  return {
    ...GAME_CONFIG.world,
    viewDistance: settings.visual.viewDistance,
    fogFar: settings.visual.fogFar,
    terrain: { ...settings.terrain }
  };
}
