import * as THREE from 'three';

interface CelestialRendererOptions {
  scene: THREE.Scene;
}

export class CelestialRenderer {
  private readonly sun = new THREE.Group();
  private readonly moon = new THREE.Group();
  private showSun = true;
  private showMoon = true;

  constructor({ scene }: CelestialRendererOptions) {
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xffd56a })
    );
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(3.25, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffc95a, transparent: true, opacity: 0.16, depthWrite: false })
    );
    this.sun.add(sunHalo, sunCore);

    const moonCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.15, 2),
      new THREE.MeshBasicMaterial({ color: 0xd8e5f0 })
    );
    const moonGlow = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.1, depthWrite: false })
    );
    this.moon.add(moonGlow, moonCore);

    scene.add(this.sun, this.moon);
  }

  setVisibility(showSun: boolean, showMoon: boolean): void {
    this.showSun = showSun;
    this.showMoon = showMoon;
  }

  update(
    centerX: number,
    centerY: number,
    centerZ: number,
    sunOffsetX: number,
    sunOffsetY: number,
    sunOffsetZ: number
  ): void {
    this.sun.position.set(centerX + sunOffsetX, centerY + sunOffsetY, centerZ + sunOffsetZ);
    this.moon.position.set(centerX - sunOffsetX, centerY - sunOffsetY, centerZ - sunOffsetZ);

    this.sun.visible = this.showSun && sunOffsetY > -2;
    this.moon.visible = this.showMoon && -sunOffsetY > -2;
  }
}
