import * as THREE from 'three';
import type { PlayerConfig } from '../../types';
import type { PlayerController } from '../../player/PlayerController';

export class ThreePlayerAvatar {
  private readonly group = new THREE.Group();
  private readonly player: PlayerController;
  private readonly config: PlayerConfig;

  constructor(scene: THREE.Scene, player: PlayerController, config: PlayerConfig) {
    this.player = player;
    this.config = config;

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x6f8f72, roughness: 0.85 });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xd5b18c, roughness: 0.9 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x39454a, roughness: 0.9 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.9, 0.42), bodyMaterial);
    torso.position.y = 1.2;
    torso.castShadow = true;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), skinMaterial);
    head.position.y = 1.93;
    head.castShadow = true;

    const createLimb = (x: number, y: number, height: number, material: THREE.Material): THREE.Mesh => {
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.22, height, 0.24), material);
      limb.position.set(x, y, 0);
      limb.castShadow = true;
      return limb;
    };

    const leftArm = createLimb(-0.49, 1.18, 0.82, bodyMaterial);
    const rightArm = createLimb(0.49, 1.18, 0.82, bodyMaterial);
    const leftLeg = createLimb(-0.2, 0.48, 0.9, darkMaterial);
    const rightLeg = createLimb(0.2, 0.48, 0.9, darkMaterial);

    this.group.add(torso, head, leftArm, rightArm, leftLeg, rightLeg);
    this.group.visible = false;
    scene.add(this.group);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  update(delta: number): void {
    const feetY = this.player.position.y - this.config.height;
    const targetPosition = new THREE.Vector3(this.player.position.x, feetY, this.player.position.z);
    const smoothing = 1 - Math.exp(-14 * delta);
    this.group.position.lerp(targetPosition, smoothing);

    const current = this.group.rotation.y;
    const target = this.player.facingYaw;
    const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    this.group.rotation.y += difference * smoothing;
  }
}
