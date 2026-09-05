import * as THREE from 'three';
import type { EntitySystem } from '../core/entities/EntitySystem';
import type { EntityId, EntitySnapshot } from '../core/entities/types';
import { interactionKey, t, type Locale } from '../i18n';
import type { UIController } from '../types';
import type { ThreeEntityRenderer } from '../rendering/three/ThreeEntityRenderer';

interface EntityInteractionControllerOptions {
  camera: THREE.PerspectiveCamera;
  playerPosition: THREE.Vector3;
  entities: EntitySystem;
  renderer: ThreeEntityRenderer;
  ui: UIController;
  getTime: () => number;
  getLocale: () => Locale;
}

export class EntityInteractionController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly playerPosition: THREE.Vector3;
  private readonly entities: EntitySystem;
  private readonly renderer: ThreeEntityRenderer;
  private readonly ui: UIController;
  private readonly getTime: () => number;
  private readonly getLocale: () => Locale;
  private focusedId: EntityId | null = null;
  private labels = new Map<EntityId, string>();

  constructor({ camera, playerPosition, entities, renderer, ui, getTime, getLocale }: EntityInteractionControllerOptions) {
    this.camera = camera;
    this.playerPosition = playerPosition;
    this.entities = entities;
    this.renderer = renderer;
    this.ui = ui;
    this.getTime = getTime;
    this.getLocale = getLocale;

    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyE' || event.repeat || !this.focusedId) return;
      this.entities.interact(this.focusedId, this.getTime());
    });
  }

  update(snapshots: EntitySnapshot[]): void {
    this.labels = new Map(snapshots.map(snapshot => [snapshot.id, snapshot.interactionLabel]));
    this.focusedId = this.renderer.findFocusedEntity(this.camera, this.playerPosition);
    if (!this.focusedId) {
      this.ui.setInteractionPrompt(null);
      return;
    }

    const key = interactionKey(this.focusedId);
    const label = key ? t(this.getLocale(), key) : this.labels.get(this.focusedId);
    this.ui.setInteractionPrompt(label ? `E · ${label}` : null);
  }
}
