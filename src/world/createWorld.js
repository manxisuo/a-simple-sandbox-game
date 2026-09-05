import * as THREE from 'three';
import { ChunkManager } from './ChunkManager.js';
import { createSeededRandom } from './WorldGenerator.js';

export function createWorld(scene, config) {
  const rand = createSeededRandom(config.seed ^ 0x51f15e);

  const resources = {
    boxGeometry: new THREE.BoxGeometry(1, 1, 1),
    trunkGeometry: new THREE.CylinderGeometry(1, 1, 1, 10),
    crownGeometry: new THREE.SphereGeometry(1, 18, 14),
    rockGeometry: new THREE.DodecahedronGeometry(1, 0),
    groundMaterial: new THREE.MeshStandardMaterial({ color: 0x35a853, roughness: 0.9 }),
    boxMaterial: new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.74 }),
    trunkMaterial: new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.82 }),
    crownMaterial: new THREE.MeshStandardMaterial({ color: 0x19783a, roughness: 0.9 }),
    rockMaterial: new THREE.MeshStandardMaterial({ color: 0x6d7677, roughness: 0.95 })
  };

  const chunkManager = new ChunkManager({ scene, config, resources });
  chunkManager.update(new THREE.Vector3(0, 0, 0));

  // The campfire remains a unique landmark near world origin, on the terrain surface.
  const campfireX = 5.5;
  const campfireZ = -4.5;
  const campfireY = chunkManager.getHeight(campfireX, campfireZ);
  const campfire = new THREE.Group();

  for (let i = 0; i < 7; i += 1) {
    const stone = new THREE.Mesh(resources.rockGeometry, resources.rockMaterial);
    const angle = (i / 7) * Math.PI * 2;
    stone.scale.setScalar(0.28);
    stone.position.set(Math.cos(angle) * 0.75, 0.18, Math.sin(angle) * 0.75);
    stone.castShadow = true;
    campfire.add(stone);
  }

  for (const angle of [-0.55, 0.55]) {
    const log = new THREE.Mesh(resources.trunkGeometry, resources.trunkMaterial);
    log.scale.set(0.13, 1.45, 0.13);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = angle;
    log.position.y = 0.2;
    log.castShadow = true;
    campfire.add(log);
  }

  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xff9b38, transparent: true, opacity: 0.92 });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.33, 1.05, 10), flameMaterial);
  flame.position.y = 0.72;
  campfire.add(flame);
  campfire.position.set(campfireX, campfireY, campfireZ);
  scene.add(campfire);

  const fireLight = new THREE.PointLight(0xff8a38, 2.6, 16, 2);
  fireLight.position.set(campfireX, campfireY + 1.35, campfireZ);
  scene.add(fireLight);

  const clouds = new THREE.Group();
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    transparent: true,
    opacity: 0.82
  });

  for (let i = 0; i < 10; i += 1) {
    const cloud = new THREE.Group();
    const parts = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < parts; p += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(2 + rand() * 2, 12, 9), cloudMaterial);
      puff.scale.y = 0.55 + rand() * 0.18;
      puff.position.set((p - parts / 2) * 2.1, rand() * 0.6, rand() * 1.5);
      cloud.add(puff);
    }
    cloud.position.set((rand() - 0.5) * 150, 22 + rand() * 12, (rand() - 0.5) * 150);
    cloud.userData.speed = 0.45 + rand() * 0.45;
    clouds.add(cloud);
  }
  scene.add(clouds);

  return {
    chunkManager,
    colliders: chunkManager.colliders,
    flame,
    fireLight,
    clouds,
    cloudMaterial,
    rand,
    getHeight(worldX, worldZ) {
      return chunkManager.getHeight(worldX, worldZ);
    },
    setDaylight(daylight) {
      chunkManager.setDaylight(daylight);
    }
  };
}
