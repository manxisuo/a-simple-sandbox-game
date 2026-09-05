import * as THREE from 'three';

function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function createWorld(scene, config) {
  const rand = random(32648517);
  const colliders = [];
  const worldObjects = new THREE.Group();
  scene.add(worldObjects);

  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x35a853, roughness: 0.86 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(config.size, config.size), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(config.size, 90, 0x1f6f42, 0x78c978);
  grid.position.y = 0.012;
  grid.material.opacity = 0.32;
  grid.material.transparent = true;
  scene.add(grid);

  const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.74 });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.82 });
  const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x19783a, roughness: 0.9 });
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x6d7677, roughness: 0.95 });

  function addCollider(mesh) {
    mesh.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(mesh));
  }

  function createBox(x, z) {
    const width = 1.2 + rand() * 1.8;
    const height = 1 + rand() * 2.3;
    const depth = 1.2 + rand() * 1.8;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), boxMaterial);
    mesh.position.set(x, height / 2, z);
    mesh.rotation.y = rand() * Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    worldObjects.add(mesh);
    addCollider(mesh);
  }

  function createTree(x, z) {
    const trunkHeight = 2.2 + rand() * 1.4;
    const trunkRadius = 0.24 + rand() * 0.12;
    const crownRadius = 1.05 + rand() * 0.55;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.15, trunkHeight, 10), trunkMaterial);
    trunk.position.set(x, trunkHeight / 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(crownRadius, 18, 14), crownMaterial);
    crown.position.set(x, trunkHeight + crownRadius * 0.62, z);
    crown.castShadow = true;
    crown.receiveShadow = true;
    worldObjects.add(trunk, crown);
    addCollider(trunk);
    addCollider(crown);
  }

  function createRock(x, z) {
    const scale = 0.7 + rand() * 1.2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), rockMaterial);
    rock.position.set(x, scale * 0.58, z);
    rock.scale.y = 0.65 + rand() * 0.4;
    rock.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.35);
    rock.castShadow = true;
    rock.receiveShadow = true;
    worldObjects.add(rock);
    addCollider(rock);
  }

  for (let i = 0; i < 72; i += 1) {
    let x = 0;
    let z = 0;
    do {
      x = (rand() - 0.5) * 132;
      z = (rand() - 0.5) * 132;
    } while (Math.hypot(x, z) < 11);

    const roll = rand();
    if (roll < 0.38) createBox(x, z);
    else if (roll < 0.82) createTree(x, z);
    else createRock(x, z);
  }

  const campfire = new THREE.Group();
  for (let i = 0; i < 7; i += 1) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), rockMaterial);
    const angle = (i / 7) * Math.PI * 2;
    stone.position.set(Math.cos(angle) * 0.75, 0.18, Math.sin(angle) * 0.75);
    stone.castShadow = true;
    campfire.add(stone);
  }

  for (const angle of [-0.55, 0.55]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.45, 8), trunkMaterial);
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
  campfire.position.set(5.5, 0, -4.5);
  worldObjects.add(campfire);

  const fireLight = new THREE.PointLight(0xff8a38, 2.6, 16, 2);
  fireLight.position.set(5.5, 1.35, -4.5);
  scene.add(fireLight);

  const clouds = new THREE.Group();
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.82 });
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
    colliders,
    groundMaterial,
    grid,
    flame,
    fireLight,
    clouds,
    cloudMaterial,
    rand
  };
}
