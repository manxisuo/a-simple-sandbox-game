import * as THREE from 'three';
import type { PlayerConfig } from '../types';
import type { PlayerController } from '../player/PlayerController';

export type CameraMode = 'first-person' | 'third-person';

interface CameraControllerOptions {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  player: PlayerController;
  config: PlayerConfig;
  initialMode?: CameraMode;
  thirdPersonDistance?: number;
  lookSensitivity?: number;
  onModeChanged?: (mode: CameraMode) => void;
}

export class CameraController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly player: PlayerController;
  private readonly config: PlayerConfig;
  private readonly onModeChanged?: (mode: CameraMode) => void;

  private yaw = 0;
  private pitch = 0;
  private mode: CameraMode;
  private thirdPersonDistance: number;
  private lookSensitivity: number;
  private readonly target = new THREE.Vector3();
  private readonly desiredPosition = new THREE.Vector3();

  constructor({
    camera,
    renderer,
    player,
    config,
    initialMode = 'first-person',
    thirdPersonDistance = 5.4,
    lookSensitivity = config.lookSensitivity,
    onModeChanged
  }: CameraControllerOptions) {
    this.camera = camera;
    this.renderer = renderer;
    this.player = player;
    this.config = config;
    this.mode = initialMode;
    this.thirdPersonDistance = thirdPersonDistance;
    this.lookSensitivity = lookSensitivity;
    this.onModeChanged = onModeChanged;

    this.bindEvents();
    this.player.setViewYaw(this.yaw);
  }

  get currentMode(): CameraMode {
    return this.mode;
  }

  setMode(mode: CameraMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.65, 1.05);
    this.onModeChanged?.(this.mode);
  }

  setThirdPersonDistance(distance: number): void {
    this.thirdPersonDistance = THREE.MathUtils.clamp(distance, 2.5, 10);
  }

  setLookSensitivity(sensitivity: number): void {
    this.lookSensitivity = THREE.MathUtils.clamp(sensitivity, 0.0005, 0.01);
  }

  private bindEvents(): void {
    document.addEventListener('mousemove', event => {
      if (document.pointerLockElement !== this.renderer.domElement) return;

      this.yaw -= event.movementX * this.lookSensitivity;
      this.pitch -= event.movementY * this.lookSensitivity;
      const maxPitch = this.mode === 'first-person' ? Math.PI / 2 - 0.02 : 1.05;
      const minPitch = this.mode === 'first-person' ? -Math.PI / 2 + 0.02 : -0.65;
      this.pitch = THREE.MathUtils.clamp(this.pitch, minPitch, maxPitch);
      this.player.setViewYaw(this.yaw);
    });

    document.addEventListener('keydown', event => {
      if (event.code !== 'KeyV' || event.repeat) return;
      this.setMode(this.mode === 'first-person' ? 'third-person' : 'first-person');
    });
  }

  update(delta: number): void {
    this.player.setViewYaw(this.yaw);

    if (this.mode === 'first-person') {
      this.camera.position.copy(this.player.position);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      return;
    }

    this.target.copy(this.player.position);
    this.target.y -= this.config.height * 0.45;

    const distance = this.thirdPersonDistance;
    const horizontalDistance = Math.cos(this.pitch) * distance;
    this.desiredPosition.set(
      this.target.x + Math.sin(this.yaw) * horizontalDistance,
      this.target.y + 1.15 - Math.sin(this.pitch) * distance,
      this.target.z + Math.cos(this.yaw) * horizontalDistance
    );

    const smoothing = 1 - Math.exp(-10 * delta);
    this.camera.position.lerp(this.desiredPosition, smoothing);
    this.camera.lookAt(this.target);
  }
}
