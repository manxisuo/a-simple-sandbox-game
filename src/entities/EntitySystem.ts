import * as THREE from 'three';
import type { HeightSampler, RandomSource, UIController } from '../types';

export type EntityKind = 'creature' | 'relic' | 'flora';

interface EntityRecord {
  id: string;
  kind: EntityKind;
  object: THREE.Object3D;
  interactionLabel: string;
  state: Record<string, string | number | boolean>;
  interact(): void;
  update?(time: number, delta: number): void;
}

interface EntitySystemOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  playerPosition: THREE.Vector3;
  ui: UIController;
  rand: RandomSource;
  getGroundHeight: HeightSampler;
}

export class EntitySystem {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly playerPosition: THREE.Vector3;
  private readonly ui: UIController;
  private readonly getGroundHeight: HeightSampler;
  private readonly entities = new Map<string, EntityRecord>();
  private focusedEntity: EntityRecord | null = null;

  constructor({ scene, camera, playerPosition, ui, rand, getGroundHeight }: EntitySystemOptions) {
    this.camera = camera;
    this.playerPosition = playerPosition;
    this.ui = ui;
    this.getGroundHeight = getGroundHeight;

    this.addMemoryStone(scene);
    this.addGlowBloom(scene);
    this.addWhisperling(scene, rand);

    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyE' || event.repeat || !this.focusedEntity) return;
      this.focusedEntity.interact();
    });
  }

  update(time: number, delta: number): void {
    for (const entity of this.entities.values()) {
      entity.update?.(time, delta);
    }

    this.focusedEntity = this.findFocusedEntity();
    this.ui.setInteractionPrompt(
      this.focusedEntity ? `E · ${this.focusedEntity.interactionLabel}` : null
    );
  }

  private register(entity: EntityRecord): void {
    this.entities.set(entity.id, entity);
  }

  private findFocusedEntity(): EntityRecord | null {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);

    let best: EntityRecord | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const entity of this.entities.values()) {
      const worldPosition = new THREE.Vector3();
      entity.object.getWorldPosition(worldPosition);

      const offset = worldPosition.sub(this.playerPosition);
      const distance = offset.length();
      if (distance > 4.8 || distance < 0.001) continue;

      offset.normalize();
      const facing = forward.dot(offset);
      if (facing < 0.72) continue;

      const score = distance - facing * 1.4;
      if (score < bestScore) {
        best = entity;
        bestScore = score;
      }
    }

    return best;
  }

  private addMemoryStone(scene: THREE.Scene): void {
    const x = 11.5;
    const z = -6.5;
    const y = this.getGroundHeight(x, z);

    const group = new THREE.Group();
    group.position.set(x, y, z);

    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.9, 0),
      new THREE.MeshStandardMaterial({ color: 0x58656d, roughness: 0.85 })
    );
    stone.scale.set(0.9, 1.6, 0.7);
    stone.position.y = 1.35;
    stone.castShadow = true;
    stone.receiveShadow = true;

    const rune = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.055, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x7ce7ff,
        emissive: 0x23849c,
        emissiveIntensity: 1.8,
        roughness: 0.2
      })
    );
    rune.position.set(0, 1.4, 0.66);
    rune.rotation.x = Math.PI / 2;

    group.add(stone, rune);
    scene.add(group);

    const state = { touched: false };
    this.register({
      id: 'memory-stone-origin',
      kind: 'relic',
      object: group,
      interactionLabel: 'touch the memory stone',
      state,
      interact: () => {
        state.touched = true;
        rune.scale.setScalar(1.18);
        this.ui.showMessage('The stone answers with a faint pulse. It seems to remember you.', 3.6);
      },
      update: (time: number) => {
        const pulse = state.touched ? 1 + Math.sin(time * 2.2) * 0.08 : 1;
        rune.scale.setScalar(pulse);
      }
    });
  }

  private addGlowBloom(scene: THREE.Scene): void {
    const x = -8.5;
    const z = -10.5;
    const y = this.getGroundHeight(x, z);

    const group = new THREE.Group();
    group.position.set(x, y, z);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.11, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x2d754b, roughness: 0.9 })
    );
    stem.position.y = 0.55;

    const bloomMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8ffcf,
      emissive: 0x3da663,
      emissiveIntensity: 0.8,
      roughness: 0.38
    });
    const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), bloomMaterial);
    bloom.position.y = 1.22;
    bloom.castShadow = true;

    group.add(stem, bloom);
    scene.add(group);

    const state = { awake: false };
    this.register({
      id: 'glow-bloom-origin',
      kind: 'flora',
      object: group,
      interactionLabel: 'wake the glow-bloom',
      state,
      interact: () => {
        state.awake = !state.awake;
        this.ui.showMessage(
          state.awake ? 'The bloom opens and holds a quiet inner light.' : 'The bloom folds back into itself.',
          2.8
        );
      },
      update: (time: number, delta: number) => {
        const target = state.awake ? 1.35 : 0.78;
        bloomMaterial.emissiveIntensity += (target - bloomMaterial.emissiveIntensity) * Math.min(1, delta * 4);
        bloom.scale.y = 0.94 + Math.sin(time * 1.8) * (state.awake ? 0.08 : 0.025);
      }
    });
  }

  private addWhisperling(scene: THREE.Scene, rand: RandomSource): void {
    const home = new THREE.Vector3(15, 0, 13);
    home.y = this.getGroundHeight(home.x, home.z) + 0.85;

    const group = new THREE.Group();
    group.position.copy(home);

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
      group.add(ear);
    }

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x1b2b2f });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMaterial);
      eye.position.set(side * 0.12, 0.25, -0.91);
      group.add(eye);
    }

    group.add(body, head);
    scene.add(group);

    let target = home.clone();
    let retargetIn = 0;
    const state = { mood: 'wary', greeted: false };

    this.register({
      id: 'whisperling-origin',
      kind: 'creature',
      object: group,
      interactionLabel: 'greet the whisperling',
      state,
      interact: () => {
        state.greeted = true;
        state.mood = 'curious';
        this.ui.showMessage('The whisperling tilts its head, then decides not to flee.', 3.2);
      },
      update: (_time: number, delta: number) => {
        const playerDistance = group.position.distanceTo(this.playerPosition);

        if (playerDistance < 3.2 && !state.greeted) {
          const away = group.position.clone().sub(this.playerPosition).setY(0);
          if (away.lengthSq() > 0.001) {
            away.normalize();
            target = group.position.clone().addScaledVector(away, 4.5);
          }
          retargetIn = 1.2;
        } else {
          retargetIn -= delta;
          if (retargetIn <= 0) {
            const angle = rand() * Math.PI * 2;
            const radius = 2.2 + rand() * 4.5;
            target.set(home.x + Math.cos(angle) * radius, 0, home.z + Math.sin(angle) * radius);
            retargetIn = 2.5 + rand() * 3.5;
          }
        }

        const direction = target.clone().sub(group.position);
        direction.y = 0;
        const distance = direction.length();
        if (distance > 0.08) {
          direction.normalize();
          const speed = playerDistance < 3.2 && !state.greeted ? 2.5 : 0.85;
          const step = Math.min(distance, speed * delta);
          group.position.addScaledVector(direction, step);
          group.rotation.y = Math.atan2(direction.x, direction.z);
        }

        group.position.y = this.getGroundHeight(group.position.x, group.position.z) + 0.85;
      }
    });
  }
}
