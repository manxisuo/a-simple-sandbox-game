import * as THREE from 'three';
import type { EntitySystem } from '../core/entities/EntitySystem';
import type { EntityId, EntitySnapshot } from '../core/entities/types';
import type { UIController } from '../types';
import type { ThreeEntityRenderer } from '../rendering/three/ThreeEntityRenderer';

interface EntityInteractionControllerOptions {
  camera: THREE.PerspectiveCamera;
  playerPosition: THREE.Vector3;
  entities: EntitySystem;
  renderer: ThreeEntityRenderer;
  ui: UIController;
  getTime: () => number;
}

export class EntityInteractionController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly playerPosition: THREE.Vector3;
  private readonly entities: EntitySystem;
  private readonly renderer: ThreeEntityRenderer;
  private readonly ui: UIController;
  private readonly getTime: () => number;
  private focusedId: EntityId | null = null;
  private labels = new Map<EntityId, string>();

  constructor({ camera, playerPosition, entities, renderer, ui, getTime }: EntityInteractionControllerOptions) {
    this.camera = camera;
    this.playerPosition = playerPosition;
    this.entities = entities;
    this.renderer = renderer;
    this.ui = ui;
    this.getTime = getTime;

    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyE' || event.repeat || !this.focusedId) return;
      this.entities.interact(this.focusedId, this.getTime());
    });
  }

  update(snapshots: EntitySnapshot[]): void {
    this.labels = new Map(snapshots.map(snapshot => [snapshot.id, snapshot.interactionLabel]));
    this.focusedId = this.renderer.findFocusedEntity(this.camera, this.playerPosition);
    const label = this.focusedId ? this.labels.get(this.focusedId) : null;
    this.ui.setInteractionPrompt(label ? `E · ${label}` : null);
  }
}
