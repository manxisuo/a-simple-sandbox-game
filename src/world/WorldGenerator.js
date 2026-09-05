import * as THREE from 'three';
import { TerrainHeight } from './TerrainHeight.js';

export function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function hashChunk(seed, chunkX, chunkZ) {
  let h = seed >>> 0;
  h ^= Math.imul(chunkX, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h ^= Math.imul(chunkZ, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
  return (h ^ (h >>> 15)) >>> 0;
}

export class WorldGenerator {
  constructor({ config, resources }) {
    this.config = config;
    this.resources = resources;
    this.terrainHeight = new TerrainHeight(config);
  }

  getHeight(worldX, worldZ) {
    return this.terrainHeight.getHeight(worldX, worldZ);
  }

  generate(chunkX, chunkZ) {
    const { chunkSize, seed, objectsPerChunk, terrain } = this.config;
    const rand = createSeededRandom(hashChunk(seed, chunkX, chunkZ));
    const group = new THREE.Group();
    const colliders = [];
    const half = chunkSize / 2;
    const centerX = chunkX * chunkSize + half;
    const centerZ = chunkZ * chunkSize + half;

    group.position.set(centerX, 0, centerZ);
    group.name = `chunk:${chunkX},${chunkZ}`;

    const groundGeometry = new THREE.PlaneGeometry(chunkSize, chunkSize, terrain.segments, terrain.segments);
    groundGeometry.rotateX(-Math.PI / 2);
    const positions = groundGeometry.attributes.position;

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

    const objectCount = Math.max(0, Math.round(objectsPerChunk * (0.65 + rand() * 0.7)));
    for (let i = 0; i < objectCount; i += 1) {
      const margin = 2.5;
      const x = -half + margin + rand() * (chunkSize - margin * 2);
      const z = -half + margin + rand() * (chunkSize - margin * 2);
      const worldX = centerX + x;
      const worldZ = centerZ + z;

      if (Math.hypot(worldX, worldZ) < 11) continue;

      const groundY = this.getHeight(worldX, worldZ);
      const roll = rand();
      if (roll < 0.38) this._createBox(group, colliders, x, groundY, z, rand);
      else if (roll < 0.82) this._createTree(group, colliders, x, groundY, z, rand);
      else this._createRock(group, colliders, x, groundY, z, rand);
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

  _createBox(group, colliders, x, groundY, z, rand) {
    const mesh = new THREE.Mesh(this.resources.boxGeometry, this.resources.boxMaterial);
    const width = 1.2 + rand() * 1.8;
    const height = 1 + rand() * 2.3;
    const depth = 1.2 + rand() * 1.8;
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, groundY + height / 2, z);
    mesh.rotation.y = rand() * Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push({ mesh, box: new THREE.Box3() });
  }

  _createTree(group, colliders, x, groundY, z, rand) {
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
    colliders.push({ mesh: trunk, box: new THREE.Box3() });
    colliders.push({ mesh: crown, box: new THREE.Box3() });
  }

  _createRock(group, colliders, x, groundY, z, rand) {
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
