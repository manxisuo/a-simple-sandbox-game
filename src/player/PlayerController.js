import * as THREE from 'three';

export class PlayerController {
  constructor({ camera, renderer, colliders, config }) {
    this.camera = camera;
    this.renderer = renderer;
    this.colliders = colliders;
    this.config = config;
    this.keys = new Set();

    this.position = new THREE.Vector3(0, config.height, 0);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.grounded = false;

    this._bindEvents();
    this.updateCamera();
  }

  _bindEvents() {
    document.addEventListener('mousemove', event => {
      if (document.pointerLockElement !== this.renderer.domElement) return;
      this.yaw -= event.movementX * this.config.lookSensitivity;
      this.pitch -= event.movementY * this.config.lookSensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    });

    document.addEventListener('keydown', event => {
      this.keys.add(event.code);
      if (event.code === 'Space' && this.grounded) {
        this.velocity.y = this.config.jumpSpeed;
        this.grounded = false;
      }
    });

    document.addEventListener('keyup', event => this.keys.delete(event.code));
  }

  _playerAabbAt(position) {
    return {
      min: new THREE.Vector3(position.x - this.config.radius, position.y - this.config.height, position.z - this.config.radius),
      max: new THREE.Vector3(position.x + this.config.radius, position.y, position.z + this.config.radius)
    };
  }

  _intersects(a, b) {
    return a.min.x < b.max.x && a.max.x > b.min.x &&
      a.min.y < b.max.y && a.max.y > b.min.y &&
      a.min.z < b.max.z && a.max.z > b.min.z;
  }

  _collides(position) {
    const bounds = this._playerAabbAt(position);
    return this.colliders.some(collider => this._intersects(bounds, collider));
  }

  _moveAxis(axis, amount) {
    if (amount === 0) return;

    this.position[axis] += amount;

    if (axis === 'y') {
      if (this.position.y < this.config.height) {
        this.position.y = this.config.height;
        this.velocity.y = 0;
        this.grounded = true;
        return;
      }
      this.grounded = false;
    }

    if (this._collides(this.position)) {
      this.position[axis] -= amount;
      if (axis === 'y') {
        this.velocity.y = 0;
        if (amount < 0) this.grounded = true;
      }
    }
  }

  update(delta) {
    const forwardInput = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const rightInput = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3()
      .addScaledVector(forward, forwardInput)
      .addScaledVector(right, rightInput);

    if (wish.lengthSq() > 1) wish.normalize();

    const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = this.config.moveSpeed * (sprinting ? this.config.sprintMultiplier : 1);
    const horizontalStep = speed * delta;

    this._moveAxis('x', wish.x * horizontalStep);
    this._moveAxis('z', wish.z * horizontalStep);
    this.velocity.y -= this.config.gravity * delta;
    this._moveAxis('y', this.velocity.y * delta);
    this.updateCamera();
  }

  updateCamera() {
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
