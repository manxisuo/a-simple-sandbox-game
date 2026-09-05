import * as THREE from 'three';

const app = document.querySelector('#app');

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#77bfff';
app.style.width = '100vw';
app.style.height = '100vh';

const overlay = document.createElement('div');
overlay.innerHTML = '<div>Click to play</div><span>WASD move · Mouse look · Space jump · ESC release</span>';
overlay.style.position = 'fixed';
overlay.style.inset = '0';
overlay.style.display = 'flex';
overlay.style.flexDirection = 'column';
overlay.style.alignItems = 'center';
overlay.style.justifyContent = 'center';
overlay.style.gap = '12px';
overlay.style.color = 'white';
overlay.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
overlay.style.fontSize = '34px';
overlay.style.fontWeight = '700';
overlay.style.textShadow = '0 2px 18px rgba(0,0,0,0.45)';
overlay.style.background = 'rgba(10, 20, 34, 0.34)';
overlay.style.cursor = 'pointer';
overlay.style.zIndex = '10';
overlay.querySelector('span').style.fontSize = '15px';
overlay.querySelector('span').style.fontWeight = '500';
document.body.appendChild(overlay);

const codexBadge = document.createElement('div');
codexBadge.textContent = 'Made with Codex';
codexBadge.style.position = 'fixed';
codexBadge.style.right = '16px';
codexBadge.style.bottom = '14px';
codexBadge.style.padding = '7px 10px';
codexBadge.style.color = 'rgba(255, 255, 255, 0.92)';
codexBadge.style.background = 'rgba(10, 20, 34, 0.36)';
codexBadge.style.border = '1px solid rgba(255, 255, 255, 0.28)';
codexBadge.style.borderRadius = '8px';
codexBadge.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
codexBadge.style.fontSize = '12px';
codexBadge.style.fontWeight = '650';
codexBadge.style.letterSpacing = '0';
codexBadge.style.textShadow = '0 1px 8px rgba(0, 0, 0, 0.35)';
codexBadge.style.pointerEvents = 'none';
codexBadge.style.zIndex = '9';
document.body.appendChild(codexBadge);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x78bdff);
scene.fog = new THREE.Fog(0x78bdff, 38, 135);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 220);

const hemisphereLight = new THREE.HemisphereLight(0xcfeaff, 0x59733c, 1.7);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
sunLight.position.set(26, 42, 18);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 95;
sunLight.shadow.camera.left = -55;
sunLight.shadow.camera.right = 55;
sunLight.shadow.camera.top = 55;
sunLight.shadow.camera.bottom = -55;
scene.add(sunLight);

const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x35a853, roughness: 0.86 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(180, 90, 0x1f6f42, 0x78c978);
grid.position.y = 0.012;
scene.add(grid);

const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.74 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.82 });
const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x19783a, roughness: 0.9 });
const colliders = [];
const worldObjects = new THREE.Group();
scene.add(worldObjects);

function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const rand = random(32648517);

function addMeshCollider(mesh) {
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
  addMeshCollider(mesh);
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
  addMeshCollider(trunk);
  addMeshCollider(crown);
}

for (let i = 0; i < 60; i += 1) {
  let x = 0;
  let z = 0;
  do {
    x = (rand() - 0.5) * 132;
    z = (rand() - 0.5) * 132;
  } while (Math.hypot(x, z) < 11);
  if (rand() < 0.48) {
    createBox(x, z);
  } else {
    createTree(x, z);
  }
}

const keys = new Set();
const clock = new THREE.Clock();
const player = {
  position: new THREE.Vector3(0, 1.7, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  pitch: 0,
  height: 1.7,
  radius: 0.35,
  grounded: false
};

const movementSpeed = 6.2;
const jumpSpeed = 6.4;
const gravity = 18.5;
const lookSensitivity = 0.0021;
const worldLimit = 88;

function playerAabbAt(position) {
  return {
    min: new THREE.Vector3(position.x - player.radius, position.y - player.height, position.z - player.radius),
    max: new THREE.Vector3(position.x + player.radius, position.y, position.z + player.radius)
  };
}

function intersects(a, b) {
  return a.min.x < b.max.x && a.max.x > b.min.x && a.min.y < b.max.y && a.max.y > b.min.y && a.min.z < b.max.z && a.max.z > b.min.z;
}

function collides(position) {
  const bounds = playerAabbAt(position);
  for (const collider of colliders) {
    if (intersects(bounds, collider)) {
      return true;
    }
  }
  return false;
}

function moveAxis(axis, amount) {
  if (amount === 0) {
    return;
  }
  player.position[axis] += amount;
  if (axis === 'x' || axis === 'z') {
    player.position[axis] = THREE.MathUtils.clamp(player.position[axis], -worldLimit, worldLimit);
  }
  if (axis === 'y') {
    if (player.position.y < player.height) {
      player.position.y = player.height;
      player.velocity.y = 0;
      player.grounded = true;
      return;
    }
    player.grounded = false;
  }
  if (collides(player.position)) {
    player.position[axis] -= amount;
    if (axis === 'y') {
      player.velocity.y = 0;
      if (amount < 0) {
        player.grounded = true;
      }
    }
  }
}

function updateMovement(delta) {
  const forwardInput = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const rightInput = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const wish = new THREE.Vector3();
  wish.addScaledVector(forward, forwardInput);
  wish.addScaledVector(right, rightInput);
  if (wish.lengthSq() > 1) {
    wish.normalize();
  }
  const horizontalStep = movementSpeed * delta;
  moveAxis('x', wish.x * horizontalStep);
  moveAxis('z', wish.z * horizontalStep);
  player.velocity.y -= gravity * delta;
  moveAxis('y', player.velocity.y * delta);
}

function updateCamera() {
  camera.position.copy(player.position);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  camera.rotation.z = 0;
}

overlay.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  overlay.style.display = document.pointerLockElement === renderer.domElement ? 'none' : 'flex';
});

document.addEventListener('mousemove', event => {
  if (document.pointerLockElement !== renderer.domElement) {
    return;
  }
  player.yaw -= event.movementX * lookSensitivity;
  player.pitch -= event.movementY * lookSensitivity;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
});

document.addEventListener('keydown', event => {
  keys.add(event.code);
  if (event.code === 'Space' && player.grounded) {
    player.velocity.y = jumpSpeed;
    player.grounded = false;
  }
});

document.addEventListener('keyup', event => {
  keys.delete(event.code);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  updateMovement(delta);
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateCamera();
animate();
