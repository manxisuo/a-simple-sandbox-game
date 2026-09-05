import * as THREE from 'three';

export class DayNightSystem {
  constructor({ scene, renderer, world, ui, collectibles, atmosphere, config }) {
    this.scene = scene;
    this.renderer = renderer;
    this.world = world;
    this.ui = ui;
    this.collectibles = collectibles;
    this.atmosphere = atmosphere;
    this.config = config;
    this.elapsed = config.cycleSeconds * config.initialProgress;

    this.daySky = new THREE.Color(0x78bdff);
    this.duskSky = new THREE.Color(0xe58a68);
    this.nightSky = new THREE.Color(0x071323);

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
    this.moonLight.position.set(-24, 36, -16);
    scene.add(this.moonLight);
  }

  update(delta) {
    this.elapsed += delta;
    const cycle = (this.elapsed % this.config.cycleSeconds) / this.config.cycleSeconds;
    const angle = cycle * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(angle);
    const daylight = THREE.MathUtils.smoothstep(sunHeight, -0.22, 0.35);
    const duskAmount = Math.max(0, 1 - Math.abs(sunHeight) / 0.34) * (1 - Math.abs(daylight - 0.5) * 1.2);

    const sky = this.nightSky.clone().lerp(this.daySky, daylight);
    if (duskAmount > 0) sky.lerp(this.duskSky, duskAmount * 0.56);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);

    this.sunLight.position.set(Math.cos(angle) * 48, Math.max(-8, sunHeight * 48), Math.sin(angle) * 38);
    this.sunLight.intensity = 0.12 + daylight * 2.25;
    this.sunLight.color.set(daylight < 0.45 ? 0xff9c72 : 0xffffff);
    this.hemisphereLight.intensity = 0.18 + daylight * 1.55;
    this.moonLight.intensity = (1 - daylight) * 0.7;

    this.world.fireLight.intensity = 1.4 + (1 - daylight) * 2.7;
    this.world.cloudMaterial.opacity = 0.24 + daylight * 0.6;
    this.world.groundMaterial.color.set(0x173c2b).lerp(new THREE.Color(0x35a853), daylight);
    this.world.grid.material.opacity = 0.1 + daylight * 0.24;
    this.renderer.toneMappingExposure = 0.62 + daylight * 0.48;
    this.atmosphere.setNightAmount(1 - daylight);

    const hours = Math.floor(cycle * 24);
    const minutes = Math.floor((cycle * 24 - hours) * 60);
    const phase = daylight > 0.68 ? 'Day' : daylight > 0.22 ? 'Twilight' : 'Night';

    this.ui.setHud(
      `<strong>${phase}</strong> · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` +
      `<br>Crystals: <strong>${this.collectibles.collected}/${this.collectibles.total}</strong>` +
      '<br><span style="opacity:.72">Shift to sprint · explore the glowing markers</span>'
    );
  }
}
