import * as THREE from 'three';
import { GAME_CONFIG } from './config';
import { PlayerController } from './player/PlayerController';
import { createWorld } from './world/createWorld';
import { CollectibleSystem } from './systems/CollectibleSystem';
import { AtmosphereSystem } from './systems/AtmosphereSystem';
import { DayNightSystem } from './systems/DayNightSystem';
import { createUI } from './ui/createUI';
import type { UIController, WorldRuntime } from './types';

export class Game {
  private readonly app: HTMLElement;
  private readonly clock = new THREE.Clock();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly ui: UIController;
  private readonly world: WorldRuntime;
  private readonly player: PlayerController;
  private readonly collectibles: CollectibleSystem;
  private readonly atmosphere: AtmosphereSystem;
  private readonly dayNight: DayNightSystem;

  constructor(app: HTMLElement) {
    this.app = app;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME_CONFIG.renderer.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = GAME_CONFIG.renderer.exposure;
    this.app.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x78bdff);
    this.scene.fog = new THREE.Fog(0x78bdff, GAME_CONFIG.world.fogNear, GAME_CONFIG.world.fogFar);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 240);
    this.ui = createUI(this.renderer);
    this.world = createWorld(this.scene, GAME_CONFIG.world);

    this.player = new PlayerController({
      camera: this.camera,
      renderer: this.renderer,
      colliders: this.world.colliders,
      getGroundHeight: (x, z) => this.world.getHeight(x, z),
      config: GAME_CONFIG.player
    });

    this.collectibles = new CollectibleSystem({
      scene: this.scene,
      player: this.player,
      ui: this.ui,
      rand: this.world.rand,
      getGroundHeight: (x, z) => this.world.getHeight(x, z)
    });

    this.atmosphere = new AtmosphereSystem({
      scene: this.scene,
      world: this.world,
      player: this.player,
      rand: this.world.rand
    });

    this.dayNight = new DayNightSystem({
      scene: this.scene,
      renderer: this.renderer,
      world: this.world,
      player: this.player,
      ui: this.ui,
      collectibles: this.collectibles,
      atmosphere: this.atmosphere,
      config: GAME_CONFIG.dayNight
    });

    this.bindWindowEvents();
    this.dayNight.update(0);
  }

  private bindWindowEvents(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  start(): void {
    const frame = (): void => {
      const delta = Math.min(this.clock.getDelta(), 0.05);
      const time = this.clock.elapsedTime;

      this.player.update(delta);
      this.world.chunkManager.update(this.player.position);
      this.collectibles.update(time, delta);
      this.dayNight.update(delta);
      this.atmosphere.update(time, delta);
      this.ui.update(delta);

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(frame);
    };

    frame();
  }
}
