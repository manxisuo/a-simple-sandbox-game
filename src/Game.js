import * as THREE from 'three';
import { GAME_CONFIG } from './config.js';
import { PlayerController } from './player/PlayerController.js';
import { createWorld } from './world/createWorld.js';
import { CollectibleSystem } from './systems/CollectibleSystem.js';
import { AtmosphereSystem } from './systems/AtmosphereSystem.js';
import { DayNightSystem } from './systems/DayNightSystem.js';
import { createUI } from './ui/createUI.js';

export class Game {
  constructor(app) {
    this.app = app;
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME_CONFIG.renderer.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = GAME_CONFIG.renderer.exposure;
    app.appendChild(this.renderer.domElement);

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
      config: { ...GAME_CONFIG.player, worldLimit: GAME_CONFIG.world.limit }
    });

    this.collectibles = new CollectibleSystem({
      scene: this.scene,
      player: this.player,
      ui: this.ui,
      rand: this.world.rand
    });

    this.atmosphere = new AtmosphereSystem({
      scene: this.scene,
      world: this.world,
      rand: this.world.rand
    });

    this.dayNight = new DayNightSystem({
      scene: this.scene,
      renderer: this.renderer,
      world: this.world,
      ui: this.ui,
      collectibles: this.collectibles,
      atmosphere: this.atmosphere,
      config: GAME_CONFIG.dayNight
    });

    this._bindWindowEvents();
    this.dayNight.update(0);
  }

  _bindWindowEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  start() {
    const frame = () => {
      const delta = Math.min(this.clock.getDelta(), 0.05);
      const time = this.clock.elapsedTime;

      this.player.update(delta);
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
