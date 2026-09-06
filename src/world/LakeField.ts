export interface LakeDescriptor {
  id: string;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  depth: number;
}

function hash(seed: number, x: number, z: number, salt: number): number {
  let h = (seed ^ salt) >>> 0;
  h ^= Math.imul(x | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h ^= Math.imul(z | 0, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
  return (h ^ (h >>> 15)) >>> 0;
}

function unit(seed: number, x: number, z: number, salt: number): number {
  return hash(seed, x, z, salt) / 4294967295;
}

/**
 * Renderer-independent deterministic placement for shallow lakes.
 *
 * The field is intentionally sparse. Each large world cell can contribute at most one lake,
 * which keeps water as a landmark rather than turning low terrain into a global ocean.
 */
export class LakeField {
  private readonly seed: number;
  private readonly cellSize = 92;
  private readonly maxRadius = 20;

  constructor(seed: number) {
    this.seed = seed;
  }

  getNearPoint(worldX: number, worldZ: number): LakeDescriptor[] {
    return this.getInArea(worldX - this.maxRadius, worldX + this.maxRadius, worldZ - this.maxRadius, worldZ + this.maxRadius);
  }

  getInArea(minX: number, maxX: number, minZ: number, maxZ: number): LakeDescriptor[] {
    const minCellX = Math.floor((minX - this.maxRadius) / this.cellSize);
    const maxCellX = Math.floor((maxX + this.maxRadius) / this.cellSize);
    const minCellZ = Math.floor((minZ - this.maxRadius) / this.cellSize);
    const maxCellZ = Math.floor((maxZ + this.maxRadius) / this.cellSize);
    const lakes: LakeDescriptor[] = [];

    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const lake = this.lakeForCell(cellX, cellZ);
        if (!lake) continue;
        if (
          lake.centerX + lake.radiusX < minX || lake.centerX - lake.radiusX > maxX ||
          lake.centerZ + lake.radiusZ < minZ || lake.centerZ - lake.radiusZ > maxZ
        ) continue;
        lakes.push(lake);
      }
    }

    return lakes;
  }

  normalizedDistance(lake: LakeDescriptor, worldX: number, worldZ: number): number {
    const dx = (worldX - lake.centerX) / lake.radiusX;
    const dz = (worldZ - lake.centerZ) / lake.radiusZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private lakeForCell(cellX: number, cellZ: number): LakeDescriptor | null {
    // About one third of large cells contain a lake. Suppress the spawn clearing so the first
    // moments of the game remain predictable and the campfire does not start in water.
    if (unit(this.seed, cellX, cellZ, 0x1a2b3c4d) > 0.34) return null;

    const jitterX = (unit(this.seed, cellX, cellZ, 0x72b4a911) - 0.5) * this.cellSize * 0.48;
    const jitterZ = (unit(this.seed, cellX, cellZ, 0xc1f651c7) - 0.5) * this.cellSize * 0.48;
    const centerX = (cellX + 0.5) * this.cellSize + jitterX;
    const centerZ = (cellZ + 0.5) * this.cellSize + jitterZ;
    if (Math.hypot(centerX, centerZ) < 34) return null;

    const radiusX = 10 + unit(this.seed, cellX, cellZ, 0x91e10da5) * 9;
    const radiusZ = 8 + unit(this.seed, cellX, cellZ, 0x4ac3265b) * 8;
    const depth = 0.3 + unit(this.seed, cellX, cellZ, 0xdecafbad) * 0.38;

    return {
      id: `lake:${cellX},${cellZ}`,
      centerX,
      centerZ,
      radiusX,
      radiusZ,
      depth
    };
  }
}
