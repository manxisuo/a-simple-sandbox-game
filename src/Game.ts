import * as THREE from 'three';
import { CameraController } from './camera/CameraController';
import { GAME_CONFIG } from './config';
import { EntitySystem } from './core/entities/EntitySystem';
import type { EntityEvent } from './core/entities/types';
import { t } from './i18n';
import { EntityInteractionController } from './input/EntityInteractionController';
import { PlayerController } from './player/PlayerController';
import { ThreeEntityRenderer } from './rendering/three/ThreeEntityRenderer';
import { ThreePlayerAvatar } from './rendering/three/ThreePlayerAvatar';
import {
  createRuntimeWorldConfig,
  loadRuntimeSettings,
  resetRuntimeSettings,
  saveRuntimeSettings,
  type RuntimeSettings
} from './settings/RuntimeSettings';
import { createWorld } from './world/createWorld';
import { CollectibleSystem } from './systems/CollectibleSystem';
import { AtmosphereSystem } from './systems/AtmosphereSystem';
import { DayNightSystem } from './systems/DayNightSystem';
import { createSettingsPanel } from './ui/createSettingsPanel';
import { createUI } from './ui/createUI';
import type { UIController, WorldConfig, WorldRuntime } from './types';

export class Game {
  private readonly app: HTMLElement;
  private readonly clock = new THREE.Clock();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly cameraController: CameraController;
  private readonly ui: UIController;
  private readonly world: WorldRuntime;
  private readonly worldConfig: WorldConfig;
  private readonly player: PlayerController;
  private readonly playerAvatar: ThreePlayerAvatar;
  private readonly entities: EntitySystem;
  private readonly entityRenderer: ThreeEntityRenderer;
  private readonly entityInteraction: EntityInteractionController;
  private readonly collectibles: CollectibleSystem;
  private readonly atmosphere: AtmosphereSystem;
  private readonly dayNight: DayNightSystem;
  private settings: RuntimeSettings;

  constructor(app: HTMLElement) {
    this.app = app;
    this.settings = loadRuntimeSettings();
    this.worldConfig = createRuntimeWorldConfig(this.settings);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME_CONFIG.renderer.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = this.settings.visual.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = GAME_CONFIG.renderer.exposure;
    this.app.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x78bdff);
    this.scene.fog = new THREE.Fog(0x78bdff, this.worldConfig.fogNear, this.worldConfig.fogFar);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 240);
    this.ui = createUI(this.renderer, this.settings.language);
    this.world = createWorld(this.scene, this.worldConfig);

    this.player = new PlayerController({
      colliders: this.world.colliders,
      getGroundHeight: (x, z) => this.world.getHeight(x, z),
      config: GAME_CONFIG.player
    });

    this.playerAvatar = new ThreePlayerAvatar(this.scene, this.player, GAME_CONFIG.player);
    this.playerAvatar.setVisible(this.settings.camera.mode === 'third-person');
    this.cameraController = new CameraController({
      camera: this.camera,
      renderer: this.renderer,
      player: this.player,
      config: GAME_CONFIG.player,
      initialMode: this.settings.camera.mode,
      thirdPersonDistance: this.settings.camera.thirdPersonDistance,
      lookSensitivity: this.settings.camera.lookSensitivity,
      onModeChanged: mode => {
        const thirdPerson = mode === 'third-person';
        this.playerAvatar.setVisible(thirdPerson);
        this.settings.camera.mode = mode;
        saveRuntimeSettings(this.settings);
        this.ui.showMessage(t(this.settings.language, thirdPerson ? 'camera.third' : 'camera.first'), 1.4);
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
      getTime: () => this.clock.elapsedTime,
      getLocale: () => this.settings.language
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
      config: {
        cycleSeconds: this.settings.time.cycleSeconds,
        initialProgress: this.settings.time.timeOfDay
      },
      getLocale: () => this.settings.language
    });
    this.applyTimeSettings();
    this.dayNight.setCelestialVisibility(this.settings.visual.showSun, this.settings.visual.showMoon);

    createSettingsPanel({
      settings: this.settings,
      onLanguageChanged: settings => {
        this.settings = settings;
        saveRuntimeSettings(this.settings);
        window.location.reload();
      },
      onTimeChanged: settings => {
        this.settings = settings;
        this.applyTimeSettings();
        saveRuntimeSettings(this.settings);
      },
      onCameraChanged: settings => {
        this.settings = settings;
        this.cameraController.setThirdPersonDistance(settings.camera.thirdPersonDistance);
        this.cameraController.setLookSensitivity(settings.camera.lookSensitivity);
        this.cameraController.setMode(settings.camera.mode);
        saveRuntimeSettings(this.settings);
      },
      onVisualChanged: settings => {
        this.settings = settings;
        this.renderer.shadowMap.enabled = settings.visual.shadows;
        if (this.scene.fog instanceof THREE.Fog) this.scene.fog.far = settings.visual.fogFar;
        this.worldConfig.fogFar = settings.visual.fogFar;
        this.world.chunkManager.setViewDistance(settings.visual.viewDistance, this.player.position);
        this.dayNight.setCelestialVisibility(settings.visual.showSun, settings.visual.showMoon);
        saveRuntimeSettings(this.settings);
      },
      onApplyTerrain: settings => {
        this.settings = settings;
        saveRuntimeSettings(this.settings);
        window.location.reload();
      },
      onReset: () => {
        const defaults = resetRuntimeSettings();
        window.location.reload();
        return defaults;
      }
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

  private applyTimeSettings(): void {
    this.dayNight.setCycleEnabled(this.settings.time.cycleEnabled);
    this.dayNight.setAllowNight(this.settings.time.allowNight);
    this.dayNight.setCycleSeconds(this.settings.time.cycleSeconds);
    this.dayNight.setTimeOfDay(this.settings.time.timeOfDay);
    this.dayNight.update(0);
  }

  private bindWindowEvents(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private handleEntityEvent(event: EntityEvent): void {
    const locale = this.settings.language;
    switch (event.type) {
      case 'companion.petted':
        this.ui.showMessage(t(locale, 'message.companionPetted', { affection: Number(event.data?.affection ?? 1) }), 2.6);
        break;
      case 'companion.leads': {
        const interest = String(event.data?.interest ?? event.targetId ?? '');
        const key = interest === 'glow-bloom-origin'
          ? 'message.companionLeadsBloom'
          : interest === 'resonance-spire-origin'
            ? 'message.companionLeadsSpire'
            : interest === 'memory-stone-origin'
              ? 'message.companionLeadsMemory'
              : 'message.companionLeadsWhisperling';
        this.ui.showMessage(t(locale, key), 3.4);
        break;
      }
      case 'memory.touched':
        this.ui.showMessage(t(locale, 'message.memoryTouched', { touches: Number(event.data?.touches ?? 1) }), 3.2);
        break;
      case 'memory.resonance':
        this.ui.showMessage(t(locale, 'message.memoryResonance'), 4.2);
        break;
      case 'resonance.pulse':
        this.ui.showMessage(t(locale, 'message.resonancePulse'), 4.0);
        break;
      case 'bloom.awakened':
        this.ui.showMessage(t(locale, 'message.bloomAwakened'), 3.5);
        break;
      case 'bloom.slept':
        this.ui.showMessage(t(locale, 'message.bloomSlept'), 2.4);
        break;
      case 'creature.greeted':
        this.ui.showMessage(t(locale, 'message.creatureGreeted'), 3.8);
        break;
      case 'world.night-started':
        this.ui.showMessage(t(locale, 'message.nightStarted'), 3.3);
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
