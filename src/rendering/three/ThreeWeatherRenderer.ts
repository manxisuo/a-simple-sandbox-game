import * as THREE from 'three';
import type { WeatherSnapshot } from '../../core/weather/WeatherSystem';

export class ThreeWeatherRenderer {
  private readonly rain: THREE.Points;
  private readonly rainMaterial: THREE.PointsMaterial;
  private readonly mist: THREE.Points;
  private readonly mistMaterial: THREE.PointsMaterial;
  private readonly rainPositions: Float32Array;
  private readonly mistPositions: Float32Array;
  private readonly flash = new THREE.PointLight(0xc8dcff, 0, 120, 1.8);
  private flashUntil = 0;

  constructor(scene: THREE.Scene) {
    const rainGeometry = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i += 1) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 46;
      this.rainPositions[i * 3 + 1] = Math.random() * 22;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMaterial = new THREE.PointsMaterial({ color: 0xbdd8e8, size: 0.055, transparent: true, opacity: 0, depthWrite: false });
    this.rain = new THREE.Points(rainGeometry, this.rainMaterial);
    scene.add(this.rain);

    const mistGeometry = new THREE.BufferGeometry();
    this.mistPositions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i += 1) {
      this.mistPositions[i * 3] = (Math.random() - 0.5) * 54;
      this.mistPositions[i * 3 + 1] = 0.6 + Math.random() * 5;
      this.mistPositions[i * 3 + 2] = (Math.random() - 0.5) * 54;
    }
    mistGeometry.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3));
    this.mistMaterial = new THREE.PointsMaterial({ color: 0xdce8e8, size: 1.6, transparent: true, opacity: 0, depthWrite: false });
    this.mist = new THREE.Points(mistGeometry, this.mistMaterial);
    scene.add(this.mist);

    scene.add(this.flash);
  }

  triggerLightning(time: number): void {
    this.flashUntil = time + 0.16;
  }

  update(snapshot: WeatherSnapshot, playerPosition: THREE.Vector3, time: number, delta: number): void {
    this.rain.position.set(playerPosition.x, playerPosition.y + 2, playerPosition.z);
    this.mist.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
    this.flash.position.set(playerPosition.x, playerPosition.y + 18, playerPosition.z);

    const rainAmount = snapshot.type === 'drizzle' ? 0.18 : snapshot.type === 'rain' ? 0.48 : snapshot.type === 'storm' ? 0.82 : 0;
    this.rainMaterial.opacity += (rainAmount - this.rainMaterial.opacity) * Math.min(1, delta * 1.6);
    this.mistMaterial.opacity += ((snapshot.type === 'mist' ? 0.095 : 0) - this.mistMaterial.opacity) * Math.min(1, delta * 0.7);

    const rainAttribute = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.rainPositions.length / 3; i += 1) {
      const yIndex = i * 3 + 1;
      this.rainPositions[yIndex] -= delta * (snapshot.type === 'storm' ? 22 : 15);
      this.rainPositions[i * 3] += snapshot.wind * delta * 1.8;
      if (this.rainPositions[yIndex] < -2) {
        this.rainPositions[yIndex] = 20 + Math.random() * 4;
        this.rainPositions[i * 3] = (Math.random() - 0.5) * 46;
        this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 46;
      }
    }
    rainAttribute.needsUpdate = true;

    const mistAttribute = this.mist.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.mistPositions.length / 3; i += 1) {
      this.mistPositions[i * 3] += Math.sin(time * 0.11 + i) * delta * 0.18;
      this.mistPositions[i * 3 + 2] += Math.cos(time * 0.09 + i * 0.7) * delta * 0.12;
    }
    mistAttribute.needsUpdate = true;

    const flashing = time < this.flashUntil;
    this.flash.intensity = flashing ? 3.8 : Math.max(0, this.flash.intensity - delta * 20);
  }
}
