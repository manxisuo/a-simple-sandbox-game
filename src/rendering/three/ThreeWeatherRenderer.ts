import * as THREE from 'three';
import type { WeatherSnapshot } from '../../core/weather/WeatherSystem';

function createSnowflakeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.translate(32, 32);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i += 1) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * i);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -22);
      ctx.moveTo(0, -12);
      ctx.lineTo(-5, -17);
      ctx.moveTo(0, -12);
      ctx.lineTo(5, -17);
      ctx.stroke();
      ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export class ThreeWeatherRenderer {
  private readonly rain: THREE.Points;
  private readonly rainMaterial: THREE.PointsMaterial;
  private readonly snow: THREE.Points;
  private readonly snowMaterial: THREE.PointsMaterial;
  private readonly mist: THREE.Points;
  private readonly mistMaterial: THREE.PointsMaterial;
  private readonly rainPositions: Float32Array;
  private readonly snowPositions: Float32Array;
  private readonly snowPhases: Float32Array;
  private readonly mistPositions: Float32Array;
  private readonly flash = new THREE.PointLight(0xc8dcff, 0, 120, 1.8);
  private readonly lightning = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xe9f4ff, transparent: true, opacity: 0, depthWrite: false })
  );
  private flashUntil = 0;
  private lightningUntil = 0;

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

    const snowGeometry = new THREE.BufferGeometry();
    const snowCount = 420;
    this.snowPositions = new Float32Array(snowCount * 3);
    this.snowPhases = new Float32Array(snowCount);
    for (let i = 0; i < snowCount; i += 1) {
      this.snowPositions[i * 3] = (Math.random() - 0.5) * 42;
      this.snowPositions[i * 3 + 1] = Math.random() * 20;
      this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 42;
      this.snowPhases[i] = Math.random() * Math.PI * 2;
    }
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    this.snowMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      map: createSnowflakeTexture(),
      alphaTest: 0.06,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.snow = new THREE.Points(snowGeometry, this.snowMaterial);
    scene.add(this.snow);

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

    this.lightning.frustumCulled = false;
    scene.add(this.flash, this.lightning);
  }

  triggerLightning(time: number, playerPosition?: THREE.Vector3): void {
    this.flashUntil = time + 0.18;
    this.lightningUntil = time + 0.22;

    const origin = playerPosition ?? new THREE.Vector3();
    const strikeX = origin.x + (Math.random() - 0.5) * 34;
    const strikeZ = origin.z - 8 - Math.random() * 26;
    const topY = origin.y + 30 + Math.random() * 10;
    const bottomY = origin.y + 1;
    const segments = 12;
    const points: number[] = [];
    let prevX = strikeX;
    let prevY = topY;
    let prevZ = strikeZ;
    for (let i = 1; i <= segments; i += 1) {
      const t = i / segments;
      const nextX = strikeX + (Math.random() - 0.5) * (1.2 + t * 2.2);
      const nextY = topY + (bottomY - topY) * t;
      const nextZ = strikeZ + (Math.random() - 0.5) * (0.8 + t * 1.4);
      points.push(prevX, prevY, prevZ, nextX, nextY, nextZ);
      prevX = nextX;
      prevY = nextY;
      prevZ = nextZ;
    }
    this.lightning.geometry.dispose();
    this.lightning.geometry = new THREE.BufferGeometry();
    this.lightning.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  }

  update(snapshot: WeatherSnapshot, playerPosition: THREE.Vector3, time: number, delta: number): void {
    this.rain.position.set(playerPosition.x, playerPosition.y + 2, playerPosition.z);
    this.snow.position.set(playerPosition.x, playerPosition.y + 2, playerPosition.z);
    this.mist.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
    this.flash.position.set(playerPosition.x, playerPosition.y + 18, playerPosition.z);

    const rainAmount = snapshot.type === 'drizzle' ? 0.18 : snapshot.type === 'rain' ? 0.48 : snapshot.type === 'storm' ? 0.82 : 0;
    this.rainMaterial.opacity += (rainAmount - this.rainMaterial.opacity) * Math.min(1, delta * 1.6);
    this.snowMaterial.opacity += ((snapshot.type === 'snow' ? 0.92 : 0) - this.snowMaterial.opacity) * Math.min(1, delta * 1.2);
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

    const snowAttribute = this.snow.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.snowPositions.length / 3; i += 1) {
      const xIndex = i * 3;
      const yIndex = xIndex + 1;
      const zIndex = xIndex + 2;
      const phase = this.snowPhases[i];
      this.snowPositions[yIndex] -= delta * (1.6 + (i % 7) * 0.12);
      this.snowPositions[xIndex] += Math.sin(time * 0.7 + phase) * delta * 0.7 + snapshot.wind * delta * 0.35;
      this.snowPositions[zIndex] += Math.cos(time * 0.55 + phase) * delta * 0.45;
      if (this.snowPositions[yIndex] < -2) {
        this.snowPositions[yIndex] = 18 + Math.random() * 4;
        this.snowPositions[xIndex] = (Math.random() - 0.5) * 42;
        this.snowPositions[zIndex] = (Math.random() - 0.5) * 42;
      }
    }
    snowAttribute.needsUpdate = true;

    const mistAttribute = this.mist.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.mistPositions.length / 3; i += 1) {
      this.mistPositions[i * 3] += Math.sin(time * 0.11 + i) * delta * 0.18;
      this.mistPositions[i * 3 + 2] += Math.cos(time * 0.09 + i * 0.7) * delta * 0.12;
    }
    mistAttribute.needsUpdate = true;

    const flashing = time < this.flashUntil;
    this.flash.intensity = flashing ? 4.4 : Math.max(0, this.flash.intensity - delta * 24);
    const lightningMaterial = this.lightning.material as THREE.LineBasicMaterial;
    lightningMaterial.opacity = time < this.lightningUntil ? 0.96 : Math.max(0, lightningMaterial.opacity - delta * 16);
  }
}
