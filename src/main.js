import * as THREE from 'three';

const app = document.querySelector('#app');

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#77bfff';
app.style.width = '100vw';
app.style.height = '100vh';

const uiFont = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const overlay = document.createElement('div');
overlay.innerHTML = '<div>Click to explore</div><span>WASD move · Mouse look · Space jump · Shift sprint · ESC release</span>';
overlay.style.position = 'fixed';
overlay.style.inset = '0';
overlay.style.display = 'flex';
overlay.style.flexDirection = 'column';
overlay.style.alignItems = 'center';
overlay.style.justifyContent = 'center';
overlay.style.gap = '12px';
overlay.style.color = 'white';
overlay.style.fontFamily = uiFont;
overlay.style.fontSize = '34px';
overlay.style.fontWeight = '700';
overlay.style.textShadow = '0 2px 18px rgba(0,0,0,0.45)';
overlay.style.background = 'rgba(10, 20, 34, 0.34)';
overlay.style.cursor = 'pointer';
overlay.style.zIndex = '20';
overlay.querySelector('span').style.fontSize = '15px';
overlay.querySelector('span').style.fontWeight = '500';
document.body.appendChild(overlay);

const hud = document.createElement('div');
hud.style.position = 'fixed';
hud.style.left = '18px';
hud.style.top = '18px';
hud.style.padding = '11px 13px';
hud.style.minWidth = '180px';
hud.style.color = 'white';
hud.style.background = 'rgba(7, 17, 30, 0.36)';
hud.style.border = '1px solid rgba(255,255,255,0.18)';
hud.style.borderRadius = '10px';
hud.style.backdropFilter = 'blur(6px)';
hud.style.fontFamily = uiFont;
hud.style.fontSize = '13px';
hud.style.lineHeight = '1.55';
hud.style.textShadow = '0 1px 5px rgba(0,0,0,0.4)';
hud.style.pointerEvents = 'none';
hud.style.zIndex = '9';
document.body.appendChild(hud);

const message = document.createElement('div');
message.style.position = 'fixed';
message.style.left = '50%';
message.style.bottom = '92px';
message.style.transform = 'translateX(-50%) translateY(8px)';
message.style.padding = '8px 12px';
message.style.color = 'white';
message.style.background = 'rgba(7, 17, 30, 0.62)';
message.style.borderRadius = '999px';
message.style.fontFamily = uiFont;
message.style.fontSize = '13px';
message.style.opacity = '0';
message.style.transition = 'opacity 180ms ease, transform 180ms ease';
message.style.pointerEvents = 'none';
message.style.zIndex = '9';
document.body.appendChild(message);

const crosshair = document.createElement('div');
crosshair.textContent = '+';
crosshair.style.position = 'fixed';
crosshair.style.left = '50%';
crosshair.style.top = '50%';
crosshair.style.transform = 'translate(-50%, -52%)';
crosshair.style.color = 'rgba(255,255,255,0.92)';
crosshair.style.fontFamily = 'monospace';
crosshair.style.fontSize = '24px';
crosshair.style.fontWeight = '300';
crosshair.style.textShadow = '0 1px 4px rgba(0,0,0,0.65)';
crosshair.style.pointerEvents = 'none';
crosshair.style.zIndex = '8';
document.body.appendChild(crosshair);

const codexBadge = document.createElement('div');
codexBadge.textContent = 'Made with Codex · Sandbox v2';
codexBadge.style.position = 'fixed';
codexBadge.style.right = '16px';
codexBadge.style.bottom = '14px';
codexBadge.style.padding = '7px 10px';
codexBadge.style.color = 'rgba(255, 255, 255, 0.92)';
codexBadge.style.background = 'rgba(10, 20, 34, 0.36)';
codexBadge.style.border = '1px solid rgba(255, 255, 255, 0.28)';
codexBadge.style.borderRadius = '8px';
codexBadge.style.fontFamily = uiFont;
codexBadge.style.fontSize = '12px';
codexBadge.style.fontWeight = '650';
codexBadge.style.pointerEvents = 'none';
codexBadge.style.zIndex = '9';
document.body.appendChild(codexBadge);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const daySky = new THREE.Color(0x78bdff);
const duskSky = new THREE.Color(0xe58a68);
const nightSky = new THREE.Color(0x071323);
scene.background = daySky.clone();
scene.fog = new THREE.Fog(daySky.clone(), 38, 135);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 240);

const hemisphereLight = new THREE.HemisphereLight(0xcfeaff, 0x59733c, 1.7);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
sunLight.position.set(26, 42, 18);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 110;
sunLight.shadow.camera.left = -55;
sunLight.shadow.camera.right = 55;
sunLight.shadow.camera.top = 55;
sunLight.shadow.camera.bottom = -55;
scene.add(sunLight);
scene.add(sunLight.target);

const moonLight = new THREE.DirectionalLight(0x8fb7ff, 0);
moonLight.position.set(-24, 36, -16);
scene.add(moonLight);

const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x35a853, roughness: 0.86 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(180, 90, 0x1f6f42, 0x78c978);
grid.position.y = 0.012;
grid.material.opacity = 0.32;
grid.material.transparent = true;
scene.add(grid);

const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.74 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.82 });
const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x19783a, roughness: 0.9 });
const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x6d7677, roughness: 0.95 });
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

function createRock(x, z) {
  const scale = 0.7 + rand() * 1.2;
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), rockMaterial);
  rock.position.set(x, scale * 0.58, z);
  rock.scale.y = 0.65 + rand() * 0.4;
  rock.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.35);
  rock.castShadow = true;
  rock.receiveShadow = true;
  worldObjects.add(rock);
  addMeshCollider(rock);
}

for (let i = 0; i < 72; i += 1) {
  let x = 0;
  let z = 0;
  do {
    x = (rand() - 0.5) * 132;
    z = (rand() - 0.5) * 132;
  } while (Math.hypot(x, z) < 11);
  const roll = rand();
  if (roll < 0.38) {
    createBox(x, z);
  } else if (roll < 0.82) {
    createTree(x, z);
  } else {
    createRock(x, z);
  }
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

const crystals = [];
const crystalGroup = new THREE.Group();
scene.add(crystalGroup);
const crystalGeometry = new THREE.OctahedronGeometry(0.6, 0);
const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0x63e6ff, emissive: 0x126b85, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.2 });
const crystalPositions = [
  [-14, -18], [21, -12], [29, 24], [-31, 19], [7, 34], [-39, -27]
];
for (const [x, z] of crystalPositions) {
  const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial.clone());
  crystal.position.set(x, 1.15, z);
  crystal.castShadow = true;
  crystal.userData.baseY = crystal.position.y;
  crystal.userData.phase = rand() * Math.PI * 2;
  crystalGroup.add(crystal);
  crystals.push(crystal);
}

const fireflyCount = 70;
const fireflyGeometry = new THREE.BufferGeometry();
const fireflyPositions = new Float32Array(fireflyCount * 3);
const fireflyPhases = [];
for (let i = 0; i < fireflyCount; i += 1) {
  fireflyPositions[i * 3] = (rand() - 0.5) * 100;
  fireflyPositions[i * 3 + 1] = 0.8 + rand() * 4.2;
  fireflyPositions[i * 3 + 2] = (rand() - 0.5) * 100;
  fireflyPhases.push(rand() * Math.PI * 2);
}
fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
const fireflyMaterial = new THREE.PointsMaterial({ color: 0xffed77, size: 0.11, transparent: true, opacity: 0, depthWrite: false });
const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
scene.add(fireflies);

const keys = new Set();
const clock = new THREE.Clock();
const player = {
  position: new THREE.Vector3(0, 1.7, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  pitch: 0,
  height: 1.7,
  radius: 0.35,
  grounded: false,
  collected: 0
};

const movementSpeed = 6.2;
const sprintMultiplier = 1.7;
const jumpSpeed = 6.4;
const gravity = 18.5;
const lookSensitivity = 0.0021;
const worldLimit = 88;
const dayLengthSeconds = 92;
let elapsedWorldTime = dayLengthSeconds * 0.18;
let messageTimer = 0;
let allCollectedShown = false;

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
  const speed = movementSpeed * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? sprintMultiplier : 1);
  const horizontalStep = speed * delta;
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

function showMessage(text, seconds = 2.2) {
  message.textContent = text;
  messageTimer = seconds;
  message.style.opacity = '1';
  message.style.transform = 'translateX(-50%) translateY(0)';
}

function updateCrystals(time, delta) {
  for (const crystal of crystals) {
    if (!crystal.visible) {
      continue;
    }
    crystal.rotation.y += delta * 1.3;
    crystal.rotation.x = Math.sin(time * 0.9 + crystal.userData.phase) * 0.12;
    crystal.position.y = crystal.userData.baseY + Math.sin(time * 2.2 + crystal.userData.phase) * 0.18;
    const dx = player.position.x - crystal.position.x;
    const dz = player.position.z - crystal.position.z;
    if (dx * dx + dz * dz < 2.2 * 2.2) {
      crystal.visible = false;
      player.collected += 1;
      showMessage(`Crystal collected · ${player.collected}/${crystals.length}`);
    }
  }

  if (player.collected === crystals.length && !allCollectedShown) {
    allCollectedShown = true;
    showMessage('All crystals found — the valley is yours.', 4);
  }
}

function updateDayNight(delta) {
  elapsedWorldTime += delta;
  const cycle = (elapsedWorldTime % dayLengthSeconds) / dayLengthSeconds;
  const angle = cycle * Math.PI * 2 - Math.PI / 2;
  const sunHeight = Math.sin(angle);
  const daylight = THREE.MathUtils.smoothstep(sunHeight, -0.22, 0.35);
  const duskAmount = Math.max(0, 1 - Math.abs(sunHeight) / 0.34) * (1 - Math.abs(daylight - 0.5) * 1.2);

  const sky = nightSky.clone().lerp(daySky, daylight);
  if (duskAmount > 0) {
    sky.lerp(duskSky, duskAmount * 0.56);
  }
  scene.background.copy(sky);
  scene.fog.color.copy(sky);

  sunLight.position.set(Math.cos(angle) * 48, Math.max(-8, sunHeight * 48), Math.sin(angle) * 38);
  sunLight.intensity = 0.12 + daylight * 2.25;
  sunLight.color.set(daylight < 0.45 ? 0xff9c72 : 0xffffff);
  hemisphereLight.intensity = 0.18 + daylight * 1.55;
  moonLight.intensity = (1 - daylight) * 0.7;
  fireLight.intensity = 1.4 + (1 - daylight) * 2.7;
  fireflyMaterial.opacity = Math.pow(1 - daylight, 1.7) * 0.92;
  cloudMaterial.opacity = 0.24 + daylight * 0.6;
  groundMaterial.color.set(0x173c2b).lerp(new THREE.Color(0x35a853), daylight);
  grid.material.opacity = 0.1 + daylight * 0.24;
  renderer.toneMappingExposure = 0.62 + daylight * 0.48;

  const hours = Math.floor(cycle * 24);
  const minutes = Math.floor((cycle * 24 - hours) * 60);
  const phase = daylight > 0.68 ? 'Day' : daylight > 0.22 ? 'Twilight' : 'Night';
  hud.innerHTML = `<strong>${phase}</strong> · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}<br>Crystals: <strong>${player.collected}/${crystals.length}</strong><br><span style="opacity:.72">Shift to sprint · explore the glowing markers</span>`;
}

function updateAtmosphere(time, delta) {
  for (const cloud of clouds.children) {
    cloud.position.x += cloud.userData.speed * delta;
    if (cloud.position.x > 82) {
      cloud.position.x = -82;
    }
  }

  flame.scale.y = 0.85 + Math.sin(time * 11) * 0.13 + Math.sin(time * 17.4) * 0.08;
  flame.scale.x = 0.9 + Math.sin(time * 13.7) * 0.08;

  const positions = fireflyGeometry.attributes.position.array;
  for (let i = 0; i < fireflyCount; i += 1) {
    positions[i * 3 + 1] += Math.sin(time * 1.7 + fireflyPhases[i]) * delta * 0.16;
    positions[i * 3] += Math.cos(time * 0.65 + fireflyPhases[i]) * delta * 0.05;
  }
  fireflyGeometry.attributes.position.needsUpdate = true;
}

overlay.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  const playing = document.pointerLockElement === renderer.domElement;
  overlay.style.display = playing ? 'none' : 'flex';
  crosshair.style.display = playing ? 'block' : 'none';
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
  const time = clock.elapsedTime;
  updateMovement(delta);
  updateCamera();
  updateCrystals(time, delta);
  updateDayNight(delta);
  updateAtmosphere(time, delta);

  if (messageTimer > 0) {
    messageTimer -= delta;
    if (messageTimer <= 0) {
      message.style.opacity = '0';
      message.style.transform = 'translateX(-50%) translateY(8px)';
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

crosshair.style.display = 'none';
updateCamera();
updateDayNight(0);
animate();
