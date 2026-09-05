import type { HeightSampler, RandomSource } from '../../types';
import type { EntityEvent, EntityEventListener, EntityId, EntitySnapshot, EntityUpdateContext, Vec3 } from './types';

interface CoreEntity extends EntitySnapshot {
  home?: Vec3;
  target?: Vec3;
  retargetIn?: number;
  pulseUntil?: number;
  idleUntil?: number;
  interestTargetId?: EntityId;
  interestUntil?: number;
  noticeCooldownUntil?: number;
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

function pointNear(source: Vec3, target: Vec3, stopDistance: number): Vec3 {
  const dx = source.x - target.x;
  const dz = source.z - target.z;
  const length = Math.hypot(dx, dz) || 1;
  return {
    x: target.x + (dx / length) * stopDistance,
    y: target.y,
    z: target.z + (dz / length) * stopDistance
  };
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

    if (id === 'companion-origin') {
      const affection = Number(entity.state.affection ?? 0) + 1;
      entity.state.affection = affection;
      entity.state.mood = 'happy';
      entity.idleUntil = time + 1.8;
      this.emit({ type: 'companion.petted', sourceId: id, time, data: { affection } });
      return;
    }

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

    this.updateEchoField(context);
    this.updateBloom(context);
    this.updateWhisperling(context);
    this.updateCompanion(context);
  }

  private seedEntities(): void {
    const at = (x: number, z: number, offsetY = 0): Vec3 => ({
      x,
      y: this.getGroundHeight(x, z) + offsetY,
      z
    });

    const companionStart = at(2.8, 2.2, 0.46);
    this.entities.set('companion-origin', {
      id: 'companion-origin',
      kind: 'creature',
      position: cloneVec3(companionStart),
      rotationY: Math.PI,
      interactionLabel: 'pet your companion',
      state: {
        mood: 'content',
        activity: 'wandering',
        affection: 0,
        bonded: true,
        interest: 'none',
        nighttimeComfort: false
      },
      target: cloneVec3(companionStart),
      retargetIn: 0.5,
      idleUntil: 0,
      interestUntil: 0,
      noticeCooldownUntil: 0
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

    this.entities.set('echo-field-origin', {
      id: 'echo-field-origin',
      kind: 'anomaly',
      position: at(22, -16, 0.08),
      rotationY: 0,
      interactionLabel: '',
      state: {
        radius: 10,
        active: true,
        intensity: 1,
        playerInside: false,
        nightAmplified: false
      }
    });
  }

  private updateEchoField(context: EntityUpdateContext): void {
    const field = this.entities.get('echo-field-origin');
    if (!field) return;

    const radius = Number(field.state.radius ?? 10);
    const wasInside = Boolean(field.state.playerInside);
    const inside = distance2D(field.position, context.playerPosition) <= radius;
    const nightAmplified = context.daylight < 0.3;

    field.state.playerInside = inside;
    field.state.nightAmplified = nightAmplified;
    field.state.intensity = 1 + (1 - context.daylight) * 0.8;

    if (inside !== wasInside) {
      this.emit({
        type: inside ? 'anomaly.entered' : 'anomaly.exited',
        sourceId: field.id,
        time: context.time,
        data: { radius, intensity: Number(field.state.intensity) }
      });
    }
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

  private chooseCompanionInterest(companion: CoreEntity, context: EntityUpdateContext): CoreEntity | null {
    const bloom = this.entities.get('glow-bloom-origin');
    const spire = this.entities.get('resonance-spire-origin');
    const memory = this.entities.get('memory-stone-origin');
    const whisperling = this.entities.get('whisperling-origin');
    const echoField = this.entities.get('echo-field-origin');

    const candidates: Array<{ entity: CoreEntity; weight: number }> = [];
    const add = (entity: CoreEntity | undefined, weight: number, maxDistance: number): void => {
      if (!entity) return;
      const distance = distance2D(entity.position, context.playerPosition);
      if (distance >= 5 && distance <= maxDistance) candidates.push({ entity, weight });
    };

    if (bloom && Boolean(bloom.state.awake)) add(bloom, 5, 22);
    if (echoField && Boolean(echoField.state.active)) add(echoField, 4.4, 30);
    if (spire && Boolean(spire.state.charged)) add(spire, 3.5, 20);
    if (memory && Number(memory.state.touches ?? 0) > 0) add(memory, 2.5, 20);
    if (whisperling && Boolean(whisperling.state.greeted)) add(whisperling, 2, 16);

    if (candidates.length === 0) return null;
    const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let roll = this.rand() * total;
    for (const candidate of candidates) {
      roll -= candidate.weight;
      if (roll <= 0) return candidate.entity;
    }
    return candidates[candidates.length - 1]?.entity ?? null;
  }

  private companionStopDistance(entity: CoreEntity): number {
    if (entity.id === 'resonance-spire-origin') return 5.6;
    if (entity.id === 'echo-field-origin') return 6.4;
    if (entity.id === 'glow-bloom-origin') return 1.8;
    return 2.2;
  }

  private updateCompanion(context: EntityUpdateContext): void {
    const companion = this.entities.get('companion-origin');
    if (!companion || !companion.target) return;

    const playerDistance = distance2D(companion.position, context.playerPosition);
    const spire = this.entities.get('resonance-spire-origin');
    const isNight = context.daylight < 0.18;
    companion.state.nighttimeComfort = isNight && playerDistance < 4.2;

    if (playerDistance > 42) {
      const angle = this.rand() * Math.PI * 2;
      companion.position.x = context.playerPosition.x + Math.cos(angle) * 3.5;
      companion.position.z = context.playerPosition.z + Math.sin(angle) * 3.5;
      companion.position.y = this.getGroundHeight(companion.position.x, companion.position.z) + 0.46;
      companion.target = cloneVec3(companion.position);
      companion.state.activity = 'rejoined';
      companion.state.interest = 'player';
      companion.interestTargetId = undefined;
      companion.retargetIn = 0.8;
      return;
    }

    const resting = (companion.idleUntil ?? 0) > context.time && playerDistance < 5;
    if (resting) {
      companion.state.activity = 'resting';
      companion.state.mood = 'happy';
      companion.position.y = this.getGroundHeight(companion.position.x, companion.position.z) + 0.46;
      return;
    }

    const catchUp = playerDistance > 8.5;
    const close = playerDistance < 1.8;
    companion.retargetIn = (companion.retargetIn ?? 0) - context.delta;

    if (catchUp) {
      const angle = Math.atan2(companion.position.z - context.playerPosition.z, companion.position.x - context.playerPosition.x);
      companion.target = {
        x: context.playerPosition.x + Math.cos(angle) * 2.8,
        y: companion.position.y,
        z: context.playerPosition.z + Math.sin(angle) * 2.8
      };
      companion.state.activity = playerDistance > 14 ? 'bounding' : 'following';
      companion.state.mood = 'focused';
      companion.state.interest = 'player';
      companion.interestTargetId = undefined;
      companion.retargetIn = 0.35;
    } else if (spire && distance2D(companion.position, spire.position) < 4.8) {
      companion.target = pointNear(context.playerPosition, spire.position, 6.2);
      companion.state.activity = 'hesitating';
      companion.state.mood = 'uneasy';
      companion.state.interest = 'resonance-spire';
      companion.interestTargetId = undefined;
      companion.retargetIn = 1.1;
    } else if (isNight && playerDistance > 4.2) {
      const angle = this.rand() * Math.PI * 2;
      companion.target = {
        x: context.playerPosition.x + Math.cos(angle) * 2.4,
        y: companion.position.y,
        z: context.playerPosition.z + Math.sin(angle) * 2.4
      };
      companion.state.activity = 'seeking-company';
      companion.state.mood = 'soft';
      companion.state.interest = 'player';
      companion.interestTargetId = undefined;
      companion.retargetIn = 0.8;
    } else if (close) {
      const dx = companion.position.x - context.playerPosition.x;
      const dz = companion.position.z - context.playerPosition.z;
      const length = Math.hypot(dx, dz) || 1;
      companion.target = {
        x: context.playerPosition.x + (dx / length) * 3.2,
        y: companion.position.y,
        z: context.playerPosition.z + (dz / length) * 3.2
      };
      companion.state.activity = 'making-room';
      companion.state.mood = 'content';
      companion.state.interest = 'player';
      companion.interestTargetId = undefined;
      companion.retargetIn = 0.9;
    } else {
      const activeInterest = companion.interestTargetId ? this.entities.get(companion.interestTargetId) : undefined;
      const interestActive = activeInterest && (companion.interestUntil ?? 0) > context.time;

      if (interestActive && activeInterest) {
        const targetDistanceFromPlayer = distance2D(activeInterest.position, context.playerPosition);
        if (targetDistanceFromPlayer <= 30) {
          companion.target = pointNear(context.playerPosition, activeInterest.position, this.companionStopDistance(activeInterest));
          companion.state.activity = targetDistanceFromPlayer > 8 ? 'leading' : 'investigating';
          companion.state.mood = activeInterest.id === 'resonance-spire-origin'
            ? 'uneasy'
            : activeInterest.id === 'echo-field-origin'
              ? 'alert-curious'
              : 'curious';
          companion.state.interest = activeInterest.id;
        } else {
          companion.interestTargetId = undefined;
        }
      } else if ((companion.retargetIn ?? 0) <= 0) {
        companion.interestTargetId = undefined;
        const interest = playerDistance < 7 && this.rand() < 0.48 ? this.chooseCompanionInterest(companion, context) : null;

        if (interest) {
          companion.interestTargetId = interest.id;
          companion.interestUntil = context.time + 5 + this.rand() * 3;
          const targetDistanceFromPlayer = distance2D(interest.position, context.playerPosition);
          companion.target = pointNear(context.playerPosition, interest.position, this.companionStopDistance(interest));
          companion.state.activity = targetDistanceFromPlayer > 8 ? 'leading' : 'investigating';
          companion.state.mood = interest.id === 'resonance-spire-origin'
            ? 'uneasy'
            : interest.id === 'echo-field-origin'
              ? 'alert-curious'
              : 'curious';
          companion.state.interest = interest.id;
          companion.retargetIn = 1.2;

          if (targetDistanceFromPlayer > 8 && (companion.noticeCooldownUntil ?? 0) <= context.time) {
            companion.noticeCooldownUntil = context.time + 12;
            this.emit({
              type: 'companion.leads',
              sourceId: companion.id,
              targetId: interest.id,
              time: context.time,
              data: { interest: interest.id }
            });
          }
        } else {
          const angle = this.rand() * Math.PI * 2;
          const radius = isNight ? 2.2 + this.rand() * 2.3 : 2.4 + this.rand() * 3.2;
          companion.target = {
            x: context.playerPosition.x + Math.cos(angle) * radius,
            y: companion.position.y,
            z: context.playerPosition.z + Math.sin(angle) * radius
          };
          companion.state.activity = this.rand() < 0.22 ? 'sniffing' : 'wandering';
          companion.state.mood = isNight ? 'soft' : 'content';
          companion.state.interest = 'none';
          companion.retargetIn = 1.6 + this.rand() * 3.2;

          if (companion.state.activity === 'sniffing') companion.idleUntil = context.time + 0.7 + this.rand() * 1.2;
        }
      }
    }

    const dx = companion.target.x - companion.position.x;
    const dz = companion.target.z - companion.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.1) {
      const activity = String(companion.state.activity ?? 'wandering');
      const speed = playerDistance > 14 ? 12.5 : catchUp ? 6.8 : activity === 'leading' ? 2.8 : activity === 'seeking-company' ? 2.2 : 1.55;
      const step = Math.min(distance, speed * context.delta);
      companion.position.x += (dx / distance) * step;
      companion.position.z += (dz / distance) * step;
      companion.rotationY = Math.atan2(dx, dz);
    }

    companion.position.y = this.getGroundHeight(companion.position.x, companion.position.z) + 0.46;
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
