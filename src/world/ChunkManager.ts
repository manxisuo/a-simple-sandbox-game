import * as THREE from 'three';
import { WorldGenerator } from './WorldGenerator';
import type { GeneratedChunk, WorldConfig, WorldResources } from '../types';

interface ChunkManagerOptions {
  scene: THREE.Scene;
  config: WorldConfig;
  resources: WorldResources;
}

export class ChunkManager {
  readonly colliders: THREE.Box3[] = [];
  currentChunk = { x: Number.NaN, z: Number.NaN };

  private readonly scene: THREE.Scene;
  private readonly config: WorldConfig;
  private readonly resources: WorldResources;
  private readonly generator: WorldGenerator;
  private readonly activeChunks = new Map<string, GeneratedChunk>();
  private readonly dayGroundColor = new THREE.Color(0x35a853);

  constructor({ scene, config, resources }: ChunkManagerOptions) {
    this.scene = scene;
    this.config = config;
    this.resources = resources;
    this.generator = new WorldGenerator({ config, resources });
  }

  update(position: THREE.Vector3): boolean {
    const chunkX = Math.floor(position.x / this.config.chunkSize);
    const chunkZ = Math.floor(position.z / this.config.chunkSize);

    if (chunkX === this.currentChunk.x && chunkZ === this.currentChunk.z) return false;

    this.currentChunk = { x: chunkX, z: chunkZ };
    const wanted = new Set<string>();
    const radius = this.config.viewDistance;

    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = chunkX + dx;
        const z = chunkZ + dz;
        const key = `${x},${z}`;
        wanted.add(key);
        if (!this.activeChunks.has(key)) this.loadChunk(x, z);
      }
    }

    for (const [key, chunk] of this.activeChunks) {
      if (!wanted.has(key)) this.unloadChunk(key, chunk);
    }

    this.rebuildColliders();
    return true;
  }

  setViewDistance(distance: number, position: THREE.Vector3): void {
    this.config.viewDistance = Math.max(1, Math.round(distance));
    this.currentChunk = { x: Number.NaN, z: Number.NaN };
    this.update(position);
  }

  private loadChunk(chunkX: number, chunkZ: number): void {
    const chunk = this.generator.generate(chunkX, chunkZ);
    this.activeChunks.set(chunk.key, chunk);
    this.scene.add(chunk.group);
  }

  private unloadChunk(key: string, chunk: GeneratedChunk): void {
    this.scene.remove(chunk.group);
    chunk.ground.geometry.dispose();
    this.activeChunks.delete(key);
  }

  private rebuildColliders(): void {
    this.colliders.length = 0;
    for (const chunk of this.activeChunks.values()) {
      this.colliders.push(...chunk.colliders);
    }
  }

  getHeight(worldX: number, worldZ: number): number {
    return this.generator.getHeight(worldX, worldZ);
  }

  setDaylight(daylight: number): void {
    this.resources.groundMaterial.color
      .set(0x173c2b)
      .lerp(this.dayGroundColor, daylight);
  }

  get loadedChunkCount(): number {
    return this.activeChunks.size;
  }
}
