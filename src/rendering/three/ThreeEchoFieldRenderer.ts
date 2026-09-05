import * as THREE from 'three';
import type { EntitySnapshot } from '../../core/entities/types';

export class ThreeEchoFieldRenderer {
  private readonly scene: THREE.Scene;
  private readonly root = new THREE.Group();
  private readonly ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x77ddff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    fog: false
  });
  private readonly shardMaterial = new THREE.MeshStandardMaterial({
    color: 0x93dff2,
    emissive: 0x236b80,
    emissiveIntensity: 1.1,
    roughness: 0.48
  });
  private readonly shards: THREE.Mesh[] = [];
  private readonly baseOffsets: Array<{ x: number; y: number; z: number; phase: number }> = [];
  private readonly anomalyFog = new THREE.Color(0x467f99);
  private readonly anomalySky = new THREE.Color(0x527f98);
  private environmentMix = 0;
  private lastUpdateTime = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(10, 48),
      new THREE.MeshBasicMaterial({
        color: 0x5ec9e8,
        transparent: true,
        opacity: 0.045,
        depthWrite: false
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.035;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(9.6, 0.055, 6, 64), this.ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.035, 6, 48), this.ringMaterial);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.06;

    this.root.add(disc, ring, innerRing);

    const shardGeometry = new THREE.OctahedronGeometry(0.33, 0);
    const radii = [2.8, 4.1, 5.2, 6.7, 7.6, 8.4, 4.9, 7.1, 3.5];
    for (let i = 0; i < radii.length; i += 1) {
      const angle = i * 2.399963229728653;
      const radius = radii[i];
      const shard = new THREE.Mesh(shardGeometry, this.shardMaterial);
      shard.castShadow = true;
      shard.scale.set(0.65 + (i % 3) * 0.18, 0.8 + (i % 4) * 0.18, 0.65 + ((i + 1) % 3) * 0.14);
      const offset = {
        x: Math.cos(angle) * radius,
        y: 0.75 + (i % 4) * 0.32,
        z: Math.sin(angle) * radius,
        phase: i * 0.91
      };
      this.baseOffsets.push(offset);
      this.shards.push(shard);
      this.root.add(shard);
    }

    scene.add(this.root);
  }

  update(snapshot: EntitySnapshot | undefined, time: number): void {
    const delta = Math.min(0.05, Math.max(0, time - this.lastUpdateTime));
    this.lastUpdateTime = time;

    if (!snapshot) {
      this.root.visible = false;
      this.environmentMix += (0 - this.environmentMix) * Math.min(1, delta * 3.2);
      return;
    }

    this.root.visible = Boolean(snapshot.state.active ?? true);
    this.root.position.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);

    const intensity = Number(snapshot.state.intensity ?? 1);
    const inside = Boolean(snapshot.state.playerInside);
    const amplified = Boolean(snapshot.state.nightAmplified);

    this.ringMaterial.opacity = 0.17 + Math.min(0.18, (intensity - 1) * 0.18);
    this.shardMaterial.emissiveIntensity = 0.9 + intensity * 0.65;

    for (let i = 0; i < this.shards.length; i += 1) {
      const shard = this.shards[i];
      const offset = this.baseOffsets[i];
      shard.position.set(
        offset.x + Math.sin(time * 0.7 + offset.phase) * 0.12,
        offset.y + Math.sin(time * (1.15 + i * 0.025) + offset.phase) * (amplified ? 0.42 : 0.26),
        offset.z + Math.cos(time * 0.6 + offset.phase) * 0.12
      );
      shard.rotation.x = time * (0.28 + i * 0.017) + offset.phase;
      shard.rotation.y = time * (0.36 + i * 0.013);
    }

    // The day/night system establishes the normal sky/fog earlier in the frame. Blend a stronger,
    // cooler anomaly atmosphere over that baseline while inside, but ease it in/out so crossing the
    // field boundary feels like entering different air rather than toggling a full-screen filter.
    const targetMix = inside ? (amplified ? 1 : 0.82) : 0;
    this.environmentMix += (targetMix - this.environmentMix) * Math.min(1, delta * 2.4);

    if (this.environmentMix > 0.001) {
      const fogAmount = 0.52 * this.environmentMix;
      const skyAmount = 0.28 * this.environmentMix;
      if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.lerp(this.anomalyFog, fogAmount);
      if (this.scene.background instanceof THREE.Color) this.scene.background.lerp(this.anomalySky, skyAmount);
    }
  }
}
