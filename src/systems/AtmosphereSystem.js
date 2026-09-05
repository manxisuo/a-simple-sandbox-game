import * as THREE from 'three';

export class AtmosphereSystem {
  constructor({ scene, world, player, rand }) {
    this.world = world;
    this.player = player;
    this.fireflyCount = 70;
    this.fireflyPhases = [];

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.fireflyCount * 3);

    for (let i = 0; i < this.fireflyCount; i += 1) {
      positions[i * 3] = (rand() - 0.5) * 100;
      positions[i * 3 + 1] = 0.8 + rand() * 4.2;
      positions[i * 3 + 2] = (rand() - 0.5) * 100;
      this.fireflyPhases.push(rand() * Math.PI * 2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.fireflyGeometry = geometry;
    this.fireflyMaterial = new THREE.PointsMaterial({
      color: 0xffed77,
      size: 0.11,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });

    this.fireflies = new THREE.Points(geometry, this.fireflyMaterial);
    scene.add(this.fireflies);
  }

  setNightAmount(amount) {
    this.fireflyMaterial.opacity = Math.pow(amount, 1.7) * 0.92;
  }

  update(time, delta) {
    const localGroundY = this.world.getHeight(this.player.position.x, this.player.position.z);

    // Atmospheric effects remain observer-relative in the streamed world.
    this.world.clouds.position.set(this.player.position.x, localGroundY, this.player.position.z);
    this.fireflies.position.set(this.player.position.x, localGroundY, this.player.position.z);

    for (const cloud of this.world.clouds.children) {
      cloud.position.x += cloud.userData.speed * delta;
      if (cloud.position.x > 82) cloud.position.x = -82;
    }

    this.world.flame.scale.y = 0.85 + Math.sin(time * 11) * 0.13 + Math.sin(time * 17.4) * 0.08;
    this.world.flame.scale.x = 0.9 + Math.sin(time * 13.7) * 0.08;

    const positions = this.fireflyGeometry.attributes.position.array;
    for (let i = 0; i < this.fireflyCount; i += 1) {
      positions[i * 3 + 1] += Math.sin(time * 1.7 + this.fireflyPhases[i]) * delta * 0.16;
      positions[i * 3] += Math.cos(time * 0.65 + this.fireflyPhases[i]) * delta * 0.05;
    }
    this.fireflyGeometry.attributes.position.needsUpdate = true;
  }
}
