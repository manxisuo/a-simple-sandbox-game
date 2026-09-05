import * as THREE from 'three';
import type { Axis, HeightSampler, PlayerConfig } from '../types';

interface PlayerControllerOptions {
  colliders: THREE.Box3[];
  getGroundHeight: HeightSampler;
  config: PlayerConfig;
}

export class PlayerController {
  readonly position: THREE.Vector3;
  readonly velocity = new THREE.Vector3();
  facingYaw = 0;

  private readonly colliders: THREE.Box3[];
  private readonly getGroundHeight: HeightSampler;
  private readonly config: PlayerConfig;
  private readonly keys = new Set<string>();

  private viewYaw = 0;
  private grounded = false;

  constructor({ colliders, getGroundHeight, config }: PlayerControllerOptions) {
    this.colliders = colliders;
    this.getGroundHeight = getGroundHeight;
    this.config = config;
    this.position = new THREE.Vector3(0, getGroundHeight(0, 0) + config.height, 0);

    this.bindEvents();
  }

  setViewYaw(yaw: number): void {
    this.viewYaw = yaw;
  }

  private bindEvents(): void {
    document.addEventListener('keydown', event => {
      this.keys.add(event.code);
      if (event.code === 'Space' && this.grounded) {
        this.velocity.y = this.config.jumpSpeed;
        this.grounded = false;
      }
    });

    document.addEventListener('keyup', event => this.keys.delete(event.code));
  }

  private playerAabbAt(position: THREE.Vector3): THREE.Box3 {
    return new THREE.Box3(
      new THREE.Vector3(position.x - this.config.radius, position.y - this.config.height, position.z - this.config.radius),
      new THREE.Vector3(position.x + this.config.radius, position.y, position.z + this.config.radius)
    );
  }

  private collides(position: THREE.Vector3): boolean {
    const bounds = this.playerAabbAt(position);
    return this.colliders.some(collider => bounds.intersectsBox(collider));
  }

  private moveAxis(axis: Axis, amount: number): void {
    if (amount === 0) return;

    this.position[axis] += amount;

    if (axis === 'y') {
      const groundLevel = this.getGroundHeight(this.position.x, this.position.z) + this.config.height;
      if (this.position.y < groundLevel) {
        this.position.y = groundLevel;
        this.velocity.y = 0;
        this.grounded = true;
        return;
      }
      this.grounded = false;
    }

    if (this.collides(this.position)) {
      this.position[axis] -= amount;
      if (axis === 'y') {
        this.velocity.y = 0;
        if (amount < 0) this.grounded = true;
      }
    }
  }

  update(delta: number): void {
    const forwardInput = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const rightInput = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const forward = new THREE.Vector3(-Math.sin(this.viewYaw), 0, -Math.cos(this.viewYaw));
    const right = new THREE.Vector3(Math.cos(this.viewYaw), 0, -Math.sin(this.viewYaw));
    const wish = new THREE.Vector3()
      .addScaledVector(forward, forwardInput)
      .addScaledVector(right, rightInput);

    if (wish.lengthSq() > 1) wish.normalize();
    if (wish.lengthSq() > 0.0001) this.facingYaw = Math.atan2(-wish.x, -wish.z);

    const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = this.config.moveSpeed * (sprinting ? this.config.sprintMultiplier : 1);
    const horizontalStep = speed * delta;

    this.moveAxis('x', wish.x * horizontalStep);
    this.moveAxis('z', wish.z * horizontalStep);
    this.velocity.y -= this.config.gravity * delta;
    this.moveAxis('y', this.velocity.y * delta);
  }
}
