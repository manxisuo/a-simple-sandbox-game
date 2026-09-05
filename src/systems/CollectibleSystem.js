import * as THREE from 'three';

export class CollectibleSystem {
  constructor({ scene, player, ui, rand }) {
    this.player = player;
    this.ui = ui;
    this.collected = 0;
    this.allCollectedShown = false;
    this.crystals = [];

    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.OctahedronGeometry(0.6, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x63e6ff,
      emissive: 0x126b85,
      emissiveIntensity: 1.6,
      roughness: 0.25,
      metalness: 0.2
    });

    const positions = [
      [-14, -18], [21, -12], [29, 24], [-31, 19], [7, 34], [-39, -27]
    ];

    for (const [x, z] of positions) {
      const crystal = new THREE.Mesh(geometry, material.clone());
      crystal.position.set(x, 1.15, z);
      crystal.castShadow = true;
      crystal.userData.baseY = crystal.position.y;
      crystal.userData.phase = rand() * Math.PI * 2;
      group.add(crystal);
      this.crystals.push(crystal);
    }
  }

  get total() {
    return this.crystals.length;
  }

  update(time, delta) {
    for (const crystal of this.crystals) {
      if (!crystal.visible) continue;

      crystal.rotation.y += delta * 1.3;
      crystal.rotation.x = Math.sin(time * 0.9 + crystal.userData.phase) * 0.12;
      crystal.position.y = crystal.userData.baseY + Math.sin(time * 2.2 + crystal.userData.phase) * 0.18;

      const dx = this.player.position.x - crystal.position.x;
      const dz = this.player.position.z - crystal.position.z;
      if (dx * dx + dz * dz < 2.2 * 2.2) {
        crystal.visible = false;
        this.collected += 1;
        this.ui.showMessage(`Crystal collected · ${this.collected}/${this.total}`);
      }
    }

    if (this.collected === this.total && !this.allCollectedShown) {
      this.allCollectedShown = true;
      this.ui.showMessage('All crystals found — the valley is yours.', 4);
    }
  }
}
