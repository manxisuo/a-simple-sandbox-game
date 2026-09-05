import type * as THREE from 'three';

export type RandomSource = () => number;
export type HeightSampler = (worldX: number, worldZ: number) => number;
export type Axis = 'x' | 'y' | 'z';

export interface TerrainConfig {
  segments: number;
  macroScale: number;
  macroAmplitude: number;
  hillScale: number;
  hillAmplitude: number;
  detailScale: number;
  detailAmplitude: number;
  spawnFlatRadius: number;
  spawnBlendRadius: number;
}

export interface WorldConfig {
  seed: number;
  chunkSize: number;
  viewDistance: number;
  objectsPerChunk: number;
  fogNear: number;
  fogFar: number;
  terrain: TerrainConfig;
}

export interface PlayerConfig {
  height: number;
  radius: number;
  moveSpeed: number;
  sprintMultiplier: number;
  jumpSpeed: number;
  gravity: number;
  lookSensitivity: number;
}

export interface DayNightConfig {
  cycleSeconds: number;
  initialProgress: number;
}

export interface RendererConfig {
  maxPixelRatio: number;
  exposure: number;
}

export interface GameConfig {
  world: WorldConfig;
  player: PlayerConfig;
  dayNight: DayNightConfig;
  renderer: RendererConfig;
}

export interface ChunkCoordinate {
  x: number;
  z: number;
}

export interface UIController {
  setHud(html: string): void;
  setInteractionPrompt(text: string | null): void;
  showMessage(text: string, seconds?: number): void;
  update(delta: number): void;
}

export interface WorldResources {
  boxGeometry: THREE.BufferGeometry;
  trunkGeometry: THREE.BufferGeometry;
  crownGeometry: THREE.BufferGeometry;
  rockGeometry: THREE.BufferGeometry;
  groundMaterial: THREE.MeshStandardMaterial;
  boxMaterial: THREE.MeshStandardMaterial;
  trunkMaterial: THREE.MeshStandardMaterial;
  crownMaterial: THREE.MeshStandardMaterial;
  rockMaterial: THREE.MeshStandardMaterial;
}

export interface GeneratedChunk {
  key: string;
  chunkX: number;
  chunkZ: number;
  group: THREE.Group;
  colliders: THREE.Box3[];
  ground: THREE.Mesh;
}

export interface ChunkManagerView {
  colliders: THREE.Box3[];
  currentChunk: ChunkCoordinate;
  readonly loadedChunkCount: number;
  update(position: THREE.Vector3): boolean;
  setViewDistance(distance: number, position: THREE.Vector3): void;
  getHeight(worldX: number, worldZ: number): number;
  setDaylight(daylight: number): void;
}

export interface WorldRuntime {
  chunkManager: ChunkManagerView;
  colliders: THREE.Box3[];
  flame: THREE.Mesh;
  fireLight: THREE.PointLight;
  clouds: THREE.Group;
  cloudMaterial: THREE.MeshStandardMaterial;
  rand: RandomSource;
  getHeight(worldX: number, worldZ: number): number;
  setDaylight(daylight: number): void;
}
