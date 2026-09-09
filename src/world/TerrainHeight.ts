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
    this.lakes = new LakeField(config.seed ^ 0x4c414b45, (x, z) => this.getBaseHeight(x, z));
  }

  getHeight(worldX: number, worldZ: number): number {
    let height = this.getBaseHeight(worldX, worldZ);

    for (const lake of this.lakes.getNearPoint(worldX, worldZ)) {
      const distance = this.lakes.normalizedDistance(lake, worldX, worldZ);
      if (distance >= 1) continue;

      const waterLevel = this.getLakeWaterLevel(lake);
      const waterRadius = 0.78;
      const basin = 1 - smoothstep(Math.min(1, distance / waterRadius));
      const targetBed = waterLevel - lake.depth * (0.42 + basin * 0.58);

      if (distance <= waterRadius) {
        // The visible water footprint is guaranteed to sit above carved terrain. This avoids a
        // flat water plane intersecting a hillside even when the original local terrain varied.
        height = Math.min(height, targetBed);
        continue;
      }

      // Outside the visible water footprint, blend the basin back into the original terrain over
      // the remaining radius to produce a soft bank instead of a sharp circular cut.
      const shoreT = (distance - waterRadius) / Math.max(0.001, 1 - waterRadius);
      const shoreBlend = 1 - smoothstep(Math.min(1, Math.max(0, shoreT)));
      height = Math.min(height, lerp(height, targetBed, shoreBlend));
    }

    return height;
  }

  getWaterSurface(worldX: number, worldZ: number): number | null {
    let surface: number | null = null;
    for (const lake of this.lakes.getNearPoint(worldX, worldZ)) {
      if (this.lakes.normalizedDistance(lake, worldX, worldZ) >= 0.78) continue;
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
    return this.getBaseHeight(lake.centerX, lake.centerZ) - 0.2;
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
