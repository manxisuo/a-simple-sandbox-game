export type EntityId = string;
export type EntityKind = 'creature' | 'relic' | 'flora' | 'device';
export type EntityScalar = string | number | boolean;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface EntitySnapshot {
  id: EntityId;
  kind: EntityKind;
  position: Vec3;
  rotationY: number;
  interactionLabel: string;
  state: Record<string, EntityScalar>;
}

export interface EntityEvent {
  type: string;
  sourceId: EntityId;
  targetId?: EntityId;
  time: number;
  data?: Record<string, EntityScalar>;
}

export interface EntityUpdateContext {
  time: number;
  delta: number;
  playerPosition: Vec3;
  daylight: number;
}

export type EntityEventListener = (event: EntityEvent) => void;
