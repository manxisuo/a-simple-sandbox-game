import type { HeightSampler, RandomSource } from '../../types';
import type { EntityEvent, EntityEventListener, EntityId, EntitySnapshot, EntityUpdateContext, Vec3 } from './types';

interface CoreEntity extends EntitySnapshot {
  home?: Vec3;
  target?: Vec3;
  retargetIn?: number;
  pulseUntil?: number;
}

interface EntitySystemOptions {
  rand: RandomSource;
  getGroundHeight: HeightSampler;
}

function distance2D(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

export class EntitySystem {
  private readonly rand: RandomSource;
  private readonly getGroundHeight: HeightSampler;
  private readonly entities = new Map<EntityId, CoreEntity>();
  private readonly listeners = new Set<EntityEventListener>();
  private previousNight = false;

  constructor({ rand, getGroundHeight }: EntitySystemOptions) {
    this.rand = rand;
    this.getGroundHeight = getGroundHeight;
    this.seedEntities();
  }

  onEvent(listener: EntityEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshots(): EntitySnapshot[] {
    return [...this.entities.values()].map(entity => ({
      id: entity.id,
      kind: entity.kind,
      position: cloneVec3(entity.position),
      rotationY: entity.rotationY,
      interactionLabel: entity.interactionLabel,
      state: { ...entity.state }
    }));
  }

  interact(id: EntityId, time: number): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    if (id === 'memory-stone-origin') {
      const touches = Number(entity.state.touches ?? 0) + 1;
      entity.state.touches = touches;
      entity.state.remembersPlayer = true;
      entity.state.lastTouchedAt = Math.round(time * 10) / 10;
      this.emit({ type: 'memory.touched', sourceId: id, time, data: { touches } });
      if (touches % 3 === 0) this.emit({ type: 'memory.resonance', sourceId: id, time, data: { touches } });
      return;
    }

    if (id === 'glow-bloom-origin') {
      entity.state.playerAwake = !Boolean(entity.state.playerAwake);
      this.emit({
        type: Boolean(entity.state.playerAwake) ? 'bloom.player-awakened' : 'bloom.player-released',
        sourceId: id,
        time
      });
      return;
    }

    if (id === 'whisperling-origin') {
      entity.state.greeted = true;
      entity.state.mood = 'curious';
      this.emit({ type: 'creature.greeted', sourceId: id, time });
      return;
    }

    if (id === 'resonance-spire-origin') {
      entity.state.pulses = Number(entity.state.pulses ?? 0) + 1;
      entity.state.charged = false;
      this.emit({ type: 'resonance.pulse', sourceId: id, time, data: { pulses: Number(entity.state.pulses) } });
    }
  }

  update(context: EntityUpdateContext): void {
    const isNight = context.daylight < 0.22;
    if (isNight !== this.previousNight) {
      this.previousNight = isNight;
      this.emit({
        type: isNight ? 'world.night-started' : 'world.day-started',
        sourceId: 'world',
        time: context.time
      });
    }

    this.updateBloom(context);
    this.updateWhisperling(context);
  }

  private seedEntities(): void {
    const at = (x: number, z: number, offsetY = 0): Vec3 => ({
      x,
      y: this.getGroundHeight(x, z) + offsetY,
      z
    });

    this.entities.set('memory-stone-origin', {
      id: 'memory-stone-origin',
      kind: 'relic',
      position: at(11.5, -6.5),
      rotationY: 0,
      interactionLabel: 'touch the memory stone',
      state: { touches: 0, remembersPlayer: false, lastTouchedAt: -1 }
    });

    this.entities.set('glow-bloom-origin', {
      id: 'glow-bloom-origin',
      kind: 'flora',
      position: at(-8.5, -10.5),
      rotationY: 0,
      interactionLabel: 'touch the glow-bloom',
      state: { awake: false, playerAwake: false, nightAwake: false, pulseAwake: false }
    });

    const whisperlingHome = at(15, 13, 0.85);
    this.entities.set('whisperling-origin', {
      id: 'whisperling-origin',
      kind: 'creature',
      position: cloneVec3(whisperlingHome),
      rotationY: 0,
      interactionLabel: 'greet the whisperling',
      state: { mood: 'wary', greeted: false, attractedToBloom: false },
      home: whisperlingHome,
      target: cloneVec3(whisperlingHome),
      retargetIn: 0
    });

    this.entities.set('resonance-spire-origin', {
      id: 'resonance-spire-origin',
      kind: 'device',
      position: at(-15, 7.5),
      rotationY: 0,
      interactionLabel: 'send a resonance pulse',
      state: { pulses: 0, charged: false }
    });
  }

  private updateBloom(context: EntityUpdateContext): void {
    const bloom = this.entities.get('glow-bloom-origin');
    if (!bloom) return;

    const wasAwake = Boolean(bloom.state.awake);
    const nightAwake = context.daylight < 0.24;
    const pulseAwake = (bloom.pulseUntil ?? 0) > context.time;
    const playerAwake = Boolean(bloom.state.playerAwake);
    const awake = nightAwake || pulseAwake || playerAwake;

    bloom.state.nightAwake = nightAwake;
    bloom.state.pulseAwake = pulseAwake;
    bloom.state.awake = awake;

    if (awake !== wasAwake) {
      this.emit({ type: awake ? 'bloom.awakened' : 'bloom.slept', sourceId: bloom.id, time: context.time });
    }
  }

  private updateWhisperling(context: EntityUpdateContext): void {
    const creature = this.entities.get('whisperling-origin');
    const bloom = this.entities.get('glow-bloom-origin');
    if (!creature || !creature.home || !creature.target || !bloom) return;

    const playerDistance = distance2D(creature.position, context.playerPosition);
    const greeted = Boolean(creature.state.greeted);
    const attracted = greeted && Boolean(bloom.state.awake);
    creature.state.attractedToBloom = attracted;

    if (playerDistance < 3.2 && !greeted) {
      const dx = creature.position.x - context.playerPosition.x;
      const dz = creature.position.z - context.playerPosition.z;
      const length = Math.hypot(dx, dz) || 1;
      creature.target = {
        x: creature.position.x + (dx / length) * 4.5,
        y: creature.position.y,
        z: creature.position.z + (dz / length) * 4.5
      };
      creature.state.mood = 'wary';
      creature.retargetIn = 1.2;
    } else if (attracted) {
      creature.target = { x: bloom.position.x + 1.4, y: bloom.position.y, z: bloom.position.z + 1.1 };
      creature.state.mood = 'drawn-to-light';
    } else {
      creature.retargetIn = (creature.retargetIn ?? 0) - context.delta;
      if ((creature.retargetIn ?? 0) <= 0) {
        const angle = this.rand() * Math.PI * 2;
        const radius = 2.2 + this.rand() * 4.5;
        creature.target = {
          x: creature.home.x + Math.cos(angle) * radius,
          y: creature.home.y,
          z: creature.home.z + Math.sin(angle) * radius
        };
        creature.retargetIn = 2.5 + this.rand() * 3.5;
      }
      creature.state.mood = greeted ? 'curious' : 'wary';
    }

    const dx = creature.target.x - creature.position.x;
    const dz = creature.target.z - creature.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.08) {
      const speed = playerDistance < 3.2 && !greeted ? 2.5 : attracted ? 1.25 : 0.85;
      const step = Math.min(distance, speed * context.delta);
      creature.position.x += (dx / distance) * step;
      creature.position.z += (dz / distance) * step;
      creature.rotationY = Math.atan2(dx, dz);
    }
    creature.position.y = this.getGroundHeight(creature.position.x, creature.position.z) + 0.85;
  }

  private emit(event: EntityEvent): void {
    this.applyWorldReaction(event);
    for (const listener of this.listeners) listener(event);
  }

  private applyWorldReaction(event: EntityEvent): void {
    if (event.type === 'resonance.pulse') {
      const bloom = this.entities.get('glow-bloom-origin');
      const creature = this.entities.get('whisperling-origin');
      if (bloom) bloom.pulseUntil = event.time + 7;
      if (creature && !Boolean(creature.state.greeted)) creature.state.mood = 'startled';
    }

    if (event.type === 'memory.resonance') {
      const spire = this.entities.get('resonance-spire-origin');
      if (spire) spire.state.charged = true;
    }
  }
}
