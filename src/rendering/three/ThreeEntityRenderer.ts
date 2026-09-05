import * as THREE from 'three';
import type { EntityId, EntitySnapshot } from '../../core/entities/types';

interface EntityView {
  root: THREE.Object3D;
  sync(snapshot: EntitySnapshot, time: number, delta: number): void;
}

export class ThreeEntityRenderer {
  private readonly scene: THREE.Scene;
  private readonly views = new Map<EntityId, EntityView>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  sync(snapshots: EntitySnapshot[], time: number, delta: number): void {
    const active = new Set<EntityId>();

    for (const snapshot of snapshots) {
      active.add(snapshot.id);
      let view = this.views.get(snapshot.id);
      if (!view) {
        view = this.createView(snapshot);
        this.views.set(snapshot.id, view);
        this.scene.add(view.root);
      }
      view.sync(snapshot, time, delta);
    }

    for (const [id, view] of this.views) {
      if (active.has(id)) continue;
      this.scene.remove(view.root);
      this.views.delete(id);
    }
  }

  findFocusedEntity(camera: THREE.PerspectiveCamera, playerPosition: THREE.Vector3): EntityId | null {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    let bestId: EntityId | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const [id, view] of this.views) {
      const worldPosition = new THREE.Vector3();
      view.root.getWorldPosition(worldPosition);
      const offset = worldPosition.sub(playerPosition);
      const distance = offset.length();
      if (distance > 4.8 || distance < 0.001) continue;

      offset.normalize();
      const facing = forward.dot(offset);
      if (facing < 0.72) continue;

      const score = distance - facing * 1.4;
      if (score < bestScore) {
        bestId = id;
        bestScore = score;
      }
    }

    return bestId;
  }

  private createView(snapshot: EntitySnapshot): EntityView {
    switch (snapshot.id) {
      case 'memory-stone-origin': return this.createMemoryStoneView();
      case 'glow-bloom-origin': return this.createGlowBloomView();
      case 'whisperling-origin': return this.createWhisperlingView();
      case 'resonance-spire-origin': return this.createResonanceSpireView();
      default: return this.createFallbackView();
    }
  }

  private createMemoryStoneView(): EntityView {
    const root = new THREE.Group();
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.9, 0),
      new THREE.MeshStandardMaterial({ color: 0x58656d, roughness: 0.85 })
    );
    stone.scale.set(0.9, 1.6, 0.7);
    stone.position.y = 1.35;
    stone.castShadow = true;
    stone.receiveShadow = true;

    const runeMaterial = new THREE.MeshStandardMaterial({
      color: 0x7ce7ff,
      emissive: 0x23849c,
      emissiveIntensity: 1.8,
      roughness: 0.2
    });
    const rune = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.055, 8, 24), runeMaterial);
    rune.position.set(0, 1.4, 0.66);
    rune.rotation.x = Math.PI / 2;
    root.add(stone, rune);

    return {
      root,
      sync: (snapshot, time) => {
        this.syncTransform(root, snapshot);
        const touches = Number(snapshot.state.touches ?? 0);
        const pulse = touches > 0 ? 1 + Math.sin(time * 2.2) * Math.min(0.16, 0.05 + touches * 0.015) : 1;
        rune.scale.setScalar(pulse);
        runeMaterial.emissiveIntensity = 1.4 + Math.min(2.2, touches * 0.35);
      }
    };
  }

  private createGlowBloomView(): EntityView {
    const root = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.11, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x2d754b, roughness: 0.9 })
    );
    stem.position.y = 0.55;

    const bloomMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8ffcf,
      emissive: 0x3da663,
      emissiveIntensity: 0.7,
      roughness: 0.38
    });
    const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), bloomMaterial);
    bloom.position.y = 1.22;
    bloom.castShadow = true;
    root.add(stem, bloom);

    return {
      root,
      sync: (snapshot, time, delta) => {
        this.syncTransform(root, snapshot);
        const awake = Boolean(snapshot.state.awake);
        const target = awake ? 1.8 : 0.55;
        bloomMaterial.emissiveIntensity += (target - bloomMaterial.emissiveIntensity) * Math.min(1, delta * 4);
        bloom.scale.y = 0.94 + Math.sin(time * 1.8) * (awake ? 0.1 : 0.025);
        bloom.scale.x = bloom.scale.z = awake ? 1.08 : 0.96;
      }
    };
  }

  private createWhisperlingView(): EntityView {
    const root = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7e8b2,
      emissive: 0x314923,
      emissiveIntensity: 0.28,
      roughness: 0.72
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), bodyMaterial);
    body.scale.set(1.15, 0.82, 1.45);
    body.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), bodyMaterial);
    head.position.set(0, 0.2, -0.62);
    head.castShadow = true;

    const earGeometry = new THREE.ConeGeometry(0.12, 0.35, 6);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeometry, bodyMaterial);
      ear.position.set(side * 0.2, 0.52, -0.65);
      ear.rotation.z = side * 0.22;
      root.add(ear);
    }

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x1b2b2f });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMaterial);
      eye.position.set(side * 0.12, 0.25, -0.91);
      root.add(eye);
    }
    root.add(body, head);

    return {
      root,
      sync: (snapshot, time) => {
        this.syncTransform(root, snapshot);
        const mood = String(snapshot.state.mood ?? 'wary');
        bodyMaterial.emissiveIntensity = mood === 'drawn-to-light' ? 0.72 : mood === 'startled' ? 0.12 : 0.28;
        root.position.y += Math.sin(time * 3.1) * 0.035;
      }
    };
  }

  private createResonanceSpireView(): EntityView {
    const root = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.82, 2.4, 7),
      new THREE.MeshStandardMaterial({ color: 0x4f5861, roughness: 0.82 })
    );
    base.position.y = 1.2;
    base.castShadow = true;

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xa5ddff,
      emissive: 0x246f98,
      emissiveIntensity: 0.8,
      roughness: 0.24
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 8, 28), ringMaterial);
    ring.position.y = 2.35;
    ring.rotation.x = Math.PI / 2;
    root.add(base, ring);

    return {
      root,
      sync: (snapshot, time) => {
        this.syncTransform(root, snapshot);
        const charged = Boolean(snapshot.state.charged);
        const pulses = Number(snapshot.state.pulses ?? 0);
        ring.rotation.z = time * (charged ? 1.4 : 0.35);
        ringMaterial.emissiveIntensity = charged ? 2.4 : 0.75 + Math.min(1.2, pulses * 0.12);
        ring.scale.setScalar(charged ? 1.16 : 1);
      }
    };
  }

  private createFallbackView(): EntityView {
    const root = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    return { root, sync: snapshot => this.syncTransform(root, snapshot) };
  }

  private syncTransform(root: THREE.Object3D, snapshot: EntitySnapshot): void {
    root.position.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);
    root.rotation.y = snapshot.rotationY;
  }
}
