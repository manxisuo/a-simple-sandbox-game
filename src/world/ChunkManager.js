import * as THREE from 'three';
import { WorldGenerator } from './WorldGenerator.js';

export class ChunkManager {
  constructor({ scene, config, resources }) {
    this.scene = scene;
    this.config = config;
    this.resources = resources;
    this.generator = new WorldGenerator({ config, resources });

    this.activeChunks = new Map();
    this.colliders = [];
    this.currentChunk = { x: Number.NaN, z: Number.NaN };
    this.dayGroundColor = new THREE.Color(0x35a853);
  }

  update(position) {
    const chunkX = Math.floor(position.x / this.config.chunkSize);
    const chunkZ = Math.floor(position.z / this.config.chunkSize);

    if (chunkX === this.currentChunk.x && chunkZ === this.currentChunk.z) return false;

    this.currentChunk = { x: chunkX, z: chunkZ };
    const wanted = new Set();
    const radius = this.config.viewDistance;

    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = chunkX + dx;
        const z = chunkZ + dz;
        const key = `${x},${z}`;
        wanted.add(key);
        if (!this.activeChunks.has(key)) this._loadChunk(x, z);
      }
    }

    for (const [key, chunk] of this.activeChunks) {
      if (!wanted.has(key)) this._unloadChunk(key, chunk);
    }

    this._rebuildColliders();
    return true;
  }

  _loadChunk(chunkX, chunkZ) {
    const chunk = this.generator.generate(chunkX, chunkZ);
    this.activeChunks.set(chunk.key, chunk);
    this.scene.add(chunk.group);
  }

  _unloadChunk(key, chunk) {
    this.scene.remove(chunk.group);
    chunk.grid.geometry.dispose();
    this._forEachGridMaterial(chunk.grid, material => material.dispose());
    this.activeChunks.delete(key);
  }

  _forEachGridMaterial(grid, callback) {
    if (Array.isArray(grid.material)) {
      for (const material of grid.material) callback(material);
    } else {
      callback(grid.material);
    }
  }

  _rebuildColliders() {
    this.colliders.length = 0;
    for (const chunk of this.activeChunks.values()) {
      this.colliders.push(...chunk.colliders);
    }
  }

  setDaylight(daylight) {
    this.resources.groundMaterial.color
      .set(0x173c2b)
      .lerp(this.dayGroundColor, daylight);

    const opacity = 0.1 + daylight * 0.24;
    this.resources.gridOpacity = opacity;
    for (const chunk of this.activeChunks.values()) {
      this._forEachGridMaterial(chunk.grid, material => {
        material.opacity = opacity;
      });
    }
  }

  get loadedChunkCount() {
    return this.activeChunks.size;
  }
}
