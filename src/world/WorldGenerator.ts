import * as THREE from 'three';
import { TerrainHeight } from './TerrainHeight';
import type { GeneratedChunk, RandomSource, WorldConfig, WorldResources } from '../types';

interface WorldGeneratorOptions {
  config: WorldConfig;
  resources: WorldResources;
}

interface ColliderEntry {
  mesh: THREE.Object3D;
  box: THREE.Box3;
}

export function createSeededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function hashChunk(seed: number, chunkX: number, chunkZ: number): number {
  let h = seed >>> 0;
  h ^= Math.imul(chunkX, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h ^= Math.imul(chunkZ, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
  return (h ^ (h >>> 15)) >>> 0;
}

export class WorldGenerator {
  private readonly config: WorldConfig;
  private readonly resources: WorldResources;
  private readonly terrainHeight: TerrainHeight;

  constructor({ config, resources }: WorldGeneratorOptions) {
    this.config = config;
    this.resources = resources;
    this.terrainHeight = new TerrainHeight(config);
  }

  getHeight(worldX: number, worldZ: number): number {
    return this.terrainHeight.getHeight(worldX, worldZ);
  }

  generate(chunkX: number, chunkZ: number): GeneratedChunk {
    const { chunkSize, seed, objectsPerChunk, terrain } = this.config;
    const rand = createSeededRandom(hashChunk(seed, chunkX, chunkZ));
    const group = new THREE.Group();
    const colliders: ColliderEntry[] = [];
    const half = chunkSize / 2;
    const centerX = chunkX * chunkSize + half;
    const centerZ = chunkZ * chunkSize + half;

    group.position.set(centerX, 0, centerZ);
    group.name = `chunk:${chunkX},${chunkZ}`;

    const groundGeometry = new THREE.PlaneGeometry(chunkSize, chunkSize, terrain.segments, terrain.segments);
    groundGeometry.rotateX(-Math.PI / 2);
    const positions = groundGeometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i += 1) {
      const localX = positions.getX(i);
      const localZ = positions.getZ(i);
      positions.setY(i, this.getHeight(centerX + localX, centerZ + localZ));
    }

    positions.needsUpdate = true;
    groundGeometry.computeVertexNormals();
    groundGeometry.computeBoundingSphere();

    const ground = new THREE.Mesh(groundGeometry, this.resources.groundMaterial);
    ground.receiveShadow = true;
    group.add(ground);

    // A lake is owned by the chunk containing its center. The radius is smaller than a chunk and
    // the normal view distance is several chunks, so the complete water surface remains loaded
    // while it is meaningfully visible without duplicating the same lake in neighboring chunks.
    const lakes = this.terrainHeight.getLakesInArea(
      centerX - half,
      centerX + half,
      centerZ - half,
      centerZ + half
    );
    for (const lake of lakes) {
      if (
        lake.centerX < centerX - half || lake.centerX >= centerX + half ||
        lake.centerZ < centerZ - half || lake.centerZ >= centerZ + half
      ) continue;

      const water = new THREE.Mesh(this.resources.lakeGeometry, this.resources.waterMaterial);
      water.scale.set(lake.radiusX * 0.96, lake.radiusZ * 0.96, 1);
      water.position.set(lake.centerX - centerX, lake.waterLevel + 0.025, lake.centerZ - centerZ);
      water.receiveShadow = true;
      water.renderOrder = 1;
      group.add(water);
    }

    const objectCount = Math.max(0, Math.round(objectsPerChunk * (0.65 + rand() * 0.7)));
    for (let i = 0; i < objectCount; i += 1) {
      const margin = 2.5;
      const x = -half + margin + rand() * (chunkSize - margin * 2);
      const z = -half + margin + rand() * (chunkSize - margin * 2);
      const worldX = centerX + x;
      const worldZ = centerZ + z;

      if (Math.hypot(worldX, worldZ) < 11) continue;
      if (this.terrainHeight.getWaterSurface(worldX, worldZ) !== null) continue;

      const groundY = this.getHeight(worldX, worldZ);
      // The early prototype scattered generic wooden boxes across every chunk. They were useful
      // as collision test objects, but they do not belong to the world's visual language. Keep
      // procedural decoration natural for now: mostly trees with occasional rocks.
      if (rand() < 0.68) this.createTree(group, colliders, x, groundY, z, rand);
      else this.createRock(group, colliders, x, groundY, z, rand);
    }

    group.updateMatrixWorld(true);
    for (const entry of colliders) entry.box.setFromObject(entry.mesh);

    return {
      key: `${chunkX},${chunkZ}`,
      chunkX,
      chunkZ,
      group,
      colliders: colliders.map(entry => entry.box),
      ground
    };
  }

  private createTree(
    group: THREE.Group,
    colliders: ColliderEntry[],
    x: number,
    groundY: number,
    z: number,
    rand: RandomSource
  ): void {
    const trunkHeight = 2.2 + rand() * 1.4;
    const trunkRadius = 0.24 + rand() * 0.12;
    const crownRadius = 1.05 + rand() * 0.55;

    const trunk = new THREE.Mesh(this.resources.trunkGeometry, this.resources.trunkMaterial);
    trunk.scale.set(trunkRadius, trunkHeight, trunkRadius);
    trunk.position.set(x, groundY + trunkHeight / 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    const crown = new THREE.Mesh(this.resources.crownGeometry, this.resources.crownMaterial);
    crown.scale.setScalar(crownRadius);
    crown.position.set(x, groundY + trunkHeight + crownRadius * 0.62, z);
    crown.castShadow = true;
    crown.receiveShadow = true;

    group.add(trunk, crown);

    // Only the trunk blocks movement. Using the crown's full Box3 made a large invisible
    // rectangular collision volume around the foliage, which could wedge the player between
    // a tree and another nearby obstacle even when there was visible space to move through.
    colliders.push({ mesh: trunk, box: new THREE.Box3() });
  }

  private createRock(
    group: THREE.Group,
    colliders: ColliderEntry[],
    x: number,
    groundY: number,
    z: number,
    rand: RandomSource
  ): void {
    const mesh = new THREE.Mesh(this.resources.rockGeometry, this.resources.rockMaterial);
    const scale = 0.7 + rand() * 1.2;
    mesh.scale.set(scale, scale * (0.65 + rand() * 0.4), scale);
    mesh.position.set(x, groundY + scale * 0.58, z);
    mesh.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.35);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push({ mesh, box: new THREE.Box3() });
  }
}
