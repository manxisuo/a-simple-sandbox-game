import * as THREE from 'three';
import type { DayNightConfig, UIController, WorldRuntime } from '../types';
import type { PlayerController } from '../player/PlayerController';
import type { CollectibleSystem } from './CollectibleSystem';
import type { AtmosphereSystem } from './AtmosphereSystem';

interface DayNightSystemOptions {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  world: WorldRuntime;
  player: PlayerController;
  ui: UIController;
  collectibles: CollectibleSystem;
  atmosphere: AtmosphereSystem;
  config: DayNightConfig;
}

export class DayNightSystem {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  readonly world: WorldRuntime;
  readonly player: PlayerController;
  readonly ui: UIController;
  readonly collectibles: CollectibleSystem;
  readonly atmosphere: AtmosphereSystem;
  readonly config: DayNightConfig;
  daylight = 1;

  private elapsed: number;
  private readonly daySky = new THREE.Color(0x78bdff);
  private readonly duskSky = new THREE.Color(0xe58a68);
  private readonly nightSky = new THREE.Color(0x071323);
  private readonly hemisphereLight: THREE.HemisphereLight;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly moonLight: THREE.DirectionalLight;

  constructor({ scene, renderer, world, player, ui, collectibles, atmosphere, config }: DayNightSystemOptions) {
    this.scene = scene;
    this.renderer = renderer;
    this.world = world;
    this.player = player;
    this.ui = ui;
    this.collectibles = collectibles;
    this.atmosphere = atmosphere;
    this.config = config;
    this.elapsed = config.cycleSeconds * config.initialProgress;

    this.hemisphereLight = new THREE.HemisphereLight(0xcfeaff, 0x59733c, 1.7);
    scene.add(this.hemisphereLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 110;
    this.sunLight.shadow.camera.left = -55;
    this.sunLight.shadow.camera.right = 55;
    this.sunLight.shadow.camera.top = 55;
    this.sunLight.shadow.camera.bottom = -55;
    scene.add(this.sunLight, this.sunLight.target);

    this.moonLight = new THREE.DirectionalLight(0x8fb7ff, 0);
    scene.add(this.moonLight);
  }

  update(delta: number): void {
    this.elapsed += delta;
    const cycle = (this.elapsed % this.config.cycleSeconds) / this.config.cycleSeconds;
    const angle = cycle * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(angle);
    this.daylight = THREE.MathUtils.smoothstep(sunHeight, -0.22, 0.35);
    const duskAmount = Math.max(0, 1 - Math.abs(sunHeight) / 0.34) * (1 - Math.abs(this.daylight - 0.5) * 1.2);

    const sky = this.nightSky.clone().lerp(this.daySky, this.daylight);
    if (duskAmount > 0) sky.lerp(this.duskSky, duskAmount * 0.56);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(sky);
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(sky);

    const px = this.player.position.x;
    const pz = this.player.position.z;
    const terrainY = this.world.getHeight(px, pz);
    this.sunLight.position.set(px + Math.cos(angle) * 48, terrainY + Math.max(-8, sunHeight * 48), pz + Math.sin(angle) * 38);
    this.sunLight.target.position.set(px, terrainY, pz);
    this.sunLight.intensity = 0.12 + this.daylight * 2.25;
    this.sunLight.color.set(this.daylight < 0.45 ? 0xff9c72 : 0xffffff);

    this.moonLight.position.set(px - 24, terrainY + 36, pz - 16);
    this.hemisphereLight.intensity = 0.18 + this.daylight * 1.55;
    this.moonLight.intensity = (1 - this.daylight) * 0.7;

    this.world.fireLight.intensity = 1.4 + (1 - this.daylight) * 2.7;
    this.world.cloudMaterial.opacity = 0.24 + this.daylight * 0.6;
    this.world.setDaylight(this.daylight);
    this.renderer.toneMappingExposure = 0.62 + this.daylight * 0.48;
    this.atmosphere.setNightAmount(1 - this.daylight);

    const hours = Math.floor(cycle * 24);
    const minutes = Math.floor((cycle * 24 - hours) * 60);
    const phase = this.daylight > 0.68 ? 'Day' : this.daylight > 0.22 ? 'Twilight' : 'Night';
    const chunk = this.world.chunkManager.currentChunk;

    this.ui.setHud(
      `<strong>${phase}</strong> · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` +
      `<br>Crystals: <strong>${this.collectibles.collected}/${this.collectibles.total}</strong>` +
      `<br>Chunk: <strong>${chunk.x}, ${chunk.z}</strong> · loaded ${this.world.chunkManager.loadedChunkCount}` +
      `<br>Terrain elevation: <strong>${terrainY.toFixed(1)}m</strong>` +
      '<br><span style="opacity:.72">Shift to sprint · E to interact · watch how entities affect each other</span>'
    );
  }
}
