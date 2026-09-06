import type { WorldConfig } from '../types';
import { LakeField, type LakeDescriptor } from './LakeField';

function hash2D(seed: number, x: number, z: number): number {
  let h = seed >>> 0;
  h ^= Math.imul(x | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h ^= Math.imul(z | 0, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
  return (h ^ (h >>> 15)) >>> 0;
}

function hashToSignedUnit(seed: number, x: number, z: number): number {
  return (hash2D(seed, x, z) / 4294967295) * 2 - 1;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function valueNoise2D(seed: number, x: number, z: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const z1 = z0 + 1;
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);

  const n00 = hashToSignedUnit(seed, x0, z0);
  const n10 = hashToSignedUnit(seed, x1, z0);
  const n01 = hashToSignedUnit(seed, x0, z1);
  const n11 = hashToSignedUnit(seed, x1, z1);

  const nx0 = lerp(n00, n10, tx);
  const nx1 = lerp(n01, n11, tx);
  return lerp(nx0, nx1, tz);
}

function fbm(seed: number, x: number, z: number, octaves = 4): number {
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  let normalization = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise2D(seed + octave * 1013, x * frequency, z * frequency) * amplitude;
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / normalization;
}

export interface LakeSurface extends LakeDescriptor {
  waterLevel: number;
}

export class TerrainHeight {
  private readonly seed: number;
  private readonly terrain: WorldConfig['terrain'];
  private readonly lakes: LakeField;

  constructor(config: WorldConfig) {
    this.seed = config.seed;
    this.terrain = config.terrain;
    this.lakes = new LakeField(config.seed ^ 0x4c414b45);
  }

  getHeight(worldX: number, worldZ: number): number {
    let height = this.getBaseHeight(worldX, worldZ);

    for (const lake of this.lakes.getNearPoint(worldX, worldZ)) {
      const distance = this.lakes.normalizedDistance(lake, worldX, worldZ);
      if (distance >= 1) continue;

      const waterLevel = this.getLakeWaterLevel(lake);
      // Keep the basin shallow for V1: the player can wade through it without requiring a full
      // swimming controller yet. The last ~25% of the radius becomes a soft natural shoreline.
      const basin = 1 - smoothstep(Math.min(1, distance / 0.78));
      const targetBed = waterLevel - lake.depth * (0.3 + basin * 0.7);
      const shoreBlend = 1 - smoothstep(Math.max(0, (distance - 0.72) / 0.28));
      height = Math.min(height, lerp(height, targetBed, shoreBlend));
    }

    return height;
  }

  getWaterSurface(worldX: number, worldZ: number): number | null {
    let surface: number | null = null;
    for (const lake of this.lakes.getNearPoint(worldX, worldZ)) {
      if (this.lakes.normalizedDistance(lake, worldX, worldZ) >= 0.96) continue;
      const waterLevel = this.getLakeWaterLevel(lake);
      if (this.getHeight(worldX, worldZ) >= waterLevel - 0.02) continue;
      surface = surface === null ? waterLevel : Math.max(surface, waterLevel);
    }
    return surface;
  }

  getLakesInArea(minX: number, maxX: number, minZ: number, maxZ: number): LakeSurface[] {
    return this.lakes.getInArea(minX, maxX, minZ, maxZ).map(lake => ({
      ...lake,
      waterLevel: this.getLakeWaterLevel(lake)
    }));
  }

  private getLakeWaterLevel(lake: LakeDescriptor): number {
    // Anchor each lake to its own local terrain rather than one global sea level. This keeps the
    // world as a landscape with occasional inland water instead of accidentally creating oceans.
    return this.getBaseHeight(lake.centerX, lake.centerZ) - 0.18;
  }

  private getBaseHeight(worldX: number, worldZ: number): number {
    const {
      macroScale,
      macroAmplitude,
      hillScale,
      hillAmplitude,
      detailScale,
      detailAmplitude,
      spawnFlatRadius,
      spawnBlendRadius
    } = this.terrain;

    const macro = fbm(this.seed ^ 0x1f123bb5, worldX * macroScale, worldZ * macroScale, 4) * macroAmplitude;
    const hills = fbm(this.seed ^ 0x5f356495, worldX * hillScale, worldZ * hillScale, 3) * hillAmplitude;
    const detail = fbm(this.seed ^ 0x6d2b79f5, worldX * detailScale, worldZ * detailScale, 2) * detailAmplitude;
    let height = macro + hills + detail;

    const distance = Math.hypot(worldX, worldZ);
    if (distance < spawnBlendRadius) {
      const t = Math.max(
        0,
        Math.min(1, (distance - spawnFlatRadius) / Math.max(0.001, spawnBlendRadius - spawnFlatRadius))
      );
      height *= smoothstep(t);
    }

    return height;
  }
}
