import * as THREE from 'three';
import type { HeightSampler, RandomSource, UIController } from '../types';
import type { PlayerController } from '../player/PlayerController';

interface CollectibleSystemOptions {
  scene: THREE.Scene;
  player: PlayerController;
  ui: UIController;
  rand: RandomSource;
  getGroundHeight: HeightSampler;
}

export class CollectibleSystem {
  collected = 0;
  private readonly player: PlayerController;
  private readonly ui: UIController;
  private readonly crystals: THREE.Mesh[] = [];
  private allCollectedShown = false;

  constructor({ scene, player, ui, rand, getGroundHeight }: CollectibleSystemOptions) {
    this.player = player;
    this.ui = ui;

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

    const positions: Array<[number, number]> = [
      [-14, -18], [21, -12], [29, 24], [-31, 19], [7, 34], [-39, -27]
    ];

    for (const [x, z] of positions) {
      const crystal = new THREE.Mesh(geometry, material.clone());
      crystal.position.set(x, getGroundHeight(x, z) + 1.15, z);
      crystal.castShadow = true;
      crystal.userData.baseY = crystal.position.y;
      crystal.userData.phase = rand() * Math.PI * 2;
      group.add(crystal);
      this.crystals.push(crystal);
    }
  }

  get total(): number {
    return this.crystals.length;
  }

  update(time: number, delta: number): void {
    for (const crystal of this.crystals) {
      if (!crystal.visible) continue;

      const phase = Number(crystal.userData.phase ?? 0);
      const baseY = Number(crystal.userData.baseY ?? crystal.position.y);
      crystal.rotation.y += delta * 1.3;
      crystal.rotation.x = Math.sin(time * 0.9 + phase) * 0.12;
      crystal.position.y = baseY + Math.sin(time * 2.2 + phase) * 0.18;

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
