import * as THREE from 'three';
import { CameraController } from './camera/CameraController';
import { GAME_CONFIG } from './config';
import { EntitySystem } from './core/entities/EntitySystem';
import type { EntityEvent } from './core/entities/types';
import { EntityInteractionController } from './input/EntityInteractionController';
import { PlayerController } from './player/PlayerController';
import { ThreeEntityRenderer } from './rendering/three/ThreeEntityRenderer';
import { ThreePlayerAvatar } from './rendering/three/ThreePlayerAvatar';
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
  private readonly cameraController: CameraController;
  private readonly ui: UIController;
  private readonly world: WorldRuntime;
  private readonly player: PlayerController;
  private readonly playerAvatar: ThreePlayerAvatar;
  private readonly entities: EntitySystem;
  private readonly entityRenderer: ThreeEntityRenderer;
  private readonly entityInteraction: EntityInteractionController;
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
      colliders: this.world.colliders,
      getGroundHeight: (x, z) => this.world.getHeight(x, z),
      config: GAME_CONFIG.player
    });

    this.playerAvatar = new ThreePlayerAvatar(this.scene, this.player, GAME_CONFIG.player);
    this.cameraController = new CameraController({
      camera: this.camera,
      renderer: this.renderer,
      player: this.player,
      config: GAME_CONFIG.player,
      onModeChanged: mode => {
        const thirdPerson = mode === 'third-person';
        this.playerAvatar.setVisible(thirdPerson);
        this.ui.showMessage(thirdPerson ? 'Third-person view' : 'First-person view', 1.4);
      }
    });
    this.cameraController.update(0);

    this.entities = new EntitySystem({
      rand: this.world.rand,
      getGroundHeight: (x, z) => this.world.getHeight(x, z)
    });
    this.entityRenderer = new ThreeEntityRenderer(this.scene);
    this.entityInteraction = new EntityInteractionController({
      camera: this.camera,
      playerPosition: this.player.position,
      entities: this.entities,
      renderer: this.entityRenderer,
      ui: this.ui,
      getTime: () => this.clock.elapsedTime
    });
    this.entities.onEvent(event => this.handleEntityEvent(event));

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
    this.entities.update({
      time: 0,
      delta: 0,
      playerPosition: this.player.position,
      daylight: this.dayNight.daylight
    });
    const initialEntities = this.entities.getSnapshots();
    this.entityRenderer.sync(initialEntities, 0, 0);
    this.entityInteraction.update(initialEntities);
  }

  private bindWindowEvents(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private handleEntityEvent(event: EntityEvent): void {
    switch (event.type) {
      case 'memory.touched':
        this.ui.showMessage(`The stone remembers this touch. Memory count: ${String(event.data?.touches ?? 1)}.`, 3.2);
        break;
      case 'memory.resonance':
        this.ui.showMessage('The stored memories resonate. Somewhere nearby, a dormant spire answers.', 4.2);
        break;
      case 'resonance.pulse':
        this.ui.showMessage('A resonance pulse crosses the clearing. The glow-bloom answers immediately.', 4.0);
        break;
      case 'bloom.awakened':
        this.ui.showMessage('The glow-bloom wakes. A greeted whisperling may be drawn toward its light.', 3.5);
        break;
      case 'bloom.slept':
        this.ui.showMessage('The glow-bloom dims again.', 2.4);
        break;
      case 'creature.greeted':
        this.ui.showMessage('The whisperling remembers your greeting and becomes curious about nearby phenomena.', 3.8);
        break;
      case 'world.night-started':
        this.ui.showMessage('Night settles in. Some entities obey different rules after dark.', 3.3);
        break;
      default:
        break;
    }
  }

  start(): void {
    const frame = (): void => {
      const delta = Math.min(this.clock.getDelta(), 0.05);
      const time = this.clock.elapsedTime;

      this.player.update(delta);
      this.playerAvatar.update(delta);
      this.cameraController.update(delta);
      this.world.chunkManager.update(this.player.position);
      this.collectibles.update(time, delta);
      this.dayNight.update(delta);

      this.entities.update({
        time,
        delta,
        playerPosition: this.player.position,
        daylight: this.dayNight.daylight
      });
      const entitySnapshots = this.entities.getSnapshots();
      this.entityRenderer.sync(entitySnapshots, time, delta);
      this.entityInteraction.update(entitySnapshots);

      this.atmosphere.update(time, delta);
      this.ui.update(delta);

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(frame);
    };

    frame();
  }
}
