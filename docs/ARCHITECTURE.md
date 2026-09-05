# Architecture

This document records the architectural direction of the project so that implementation choices remain consistent as the sandbox grows.

The architecture is intentionally lightweight. It is not an attempt to impose enterprise layering on a small game. The goal is to preserve a few boundaries that have high long-term value.

## Core principle: Three.js is a rendering adapter

The most important invariant is:

> **The game world should not be defined by the Three.js scene graph.**

Three.js currently provides rendering, camera objects, materials, meshes, lights, and related runtime facilities. Those are presentation/runtime concerns.

Semantic game concepts should increasingly be representable without Three.js:

- entity identity
- position and state
- interaction capabilities
- behavior
- world rules
- events
- memory/history
- AI-visible context

Conceptually:

```text
                    Game Core
                       │
           state / actions / events
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
 Three.js adapter  Browser input      UI
```

A useful architectural test is:

> If Three.js were removed tomorrow, could the world/entity simulation still run in a test or server process?

The answer is not yet "yes" for the whole project, but new core systems should move toward that property.

## Current entity boundary

The entity subsystem is the first concrete implementation of this principle.

```text
src/core/entities/
    EntitySystem.ts
    types.ts

src/rendering/three/
    ThreeEntityRenderer.ts

src/input/
    EntityInteractionController.ts
```

Responsibilities:

### Core entity system

Owns semantic state and behavior:

- stable entity IDs
- entity kinds
- position
- rotation/state
- memory-like fields
- interaction logic
- behavior updates
- semantic entity events
- entity-to-entity effects

It must not know about:

- `THREE.Mesh`
- `THREE.Scene`
- materials
- cameras
- DOM APIs
- keyboard events
- HUD/messages

### Three.js entity renderer

Owns visual representation:

- geometry
- materials
- meshes/groups
- visual animation
- translating core snapshots into scene state

It reads semantic entity state and presents it.

### Browser interaction controller

Owns browser/rendering-specific targeting and input:

- `E` key handling
- camera-facing selection
- interaction prompts
- translating a browser interaction into a semantic `interact(entityId)` call

This keeps camera and DOM knowledge outside the entity core.

## Player / camera boundary

The player subsystem is now beginning the same decoupling process.

`PlayerController` owns player movement/simulation concerns such as:

- position and velocity
- movement input state
- jump and gravity
- collision handling
- movement-facing direction

It no longer owns the render camera or renderer.

Camera/view concerns live separately:

```text
PlayerController
      │ player state / view yaw
      ▼
CameraController
      │
      ├── first-person camera placement
      └── third-person camera placement / smoothing
```

The third-person avatar is also a rendering concern:

```text
PlayerController state
        ↓
ThreePlayerAvatar
        ↓
THREE.Group / Mesh / Material
```

This is intentionally only a partial split. Browser movement input still lives with `PlayerController` for now. It should move out only when a concrete need justifies the next step.

The important invariant is:

> Camera mode and player simulation are separate concerns. Adding or changing a camera mode should not require rewriting player movement rules.

## Core data should be semantic and serializable

Prefer structures like:

```ts
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface EntitySnapshot {
  id: string;
  kind: string;
  position: Vec3;
  state: Record<string, unknown>;
}
```

over renderer types such as:

```ts
THREE.Vector3
THREE.Object3D
THREE.MeshStandardMaterial
```

inside the domain model.

This matters for:

- persistence
- testing
- Web Workers
- backend/server simulation
- replay/debugging
- AI context construction
- changing rendering technology later

## Events should describe meaning, not visuals

Good events:

```text
memory.touched
memory.resonance
resonance.pulse
bloom.awakened
creature.greeted
world.night-started
```

Bad core events:

```text
mesh.color-changed
material.emissive-updated
scene.object-added
```

The first group describes what happened in the world. The second describes how one renderer happened to present it.

The current event mechanism is intentionally local to the entity domain. A global Event Bus should be introduced only when multiple systems clearly need one.

## Authoritative state and rendering state

The game core should be authoritative for gameplay state.

Example:

```text
Core:
Glow Bloom state.awake = true

Renderer:
Increase emissive intensity
Animate bloom scale
```

The renderer may interpolate, animate, or decorate, but gameplay logic should not depend on reading material/mesh values back from the renderer.

The same applies to player presentation:

```text
Player simulation:
position + movement-facing direction

Renderer/camera:
avatar orientation + camera position + camera smoothing
```

## Visual grammar is a presentation rule, not a voxel-world model

The project deliberately avoids an all-voxel / all-cube visual grammar.

This does **not** mean `BoxGeometry` is forbidden. A box is just one rendering primitive. The architectural concern is avoiding a design where semantic world structure is forced into a cube grid merely because the renderer can draw cubes efficiently.

Preferred direction:

- continuous height-field terrain
- low-poly / geometric forms with varied silhouettes
- different primitives or custom geometry for different kinds of objects
- stylized simplicity without requiring a voxel representation

Minecraft may be referenced for sandbox infrastructure, but not as the default visual or world-model representation.

This distinction is important because renderer choices must not dictate the domain model.

## Procedural generation vs mutable state

The project should keep these concepts distinct.

### Deterministic base

Generated from seed and coordinates:

- terrain
- initial object placement
- initial entity placement

Given the same seed and coordinates, this layer should be reproducible.

### Mutable overlay

Changes caused by simulation/player history:

- an entity has been greeted
- an artifact was activated
- an area has been visited
- a local rule has changed
- an object has been destroyed or transformed

### History / event log

Meaningful events that explain how the mutable overlay came to be.

This separation avoids baking history back into procedural-generation code and provides a clean foundation for persistence and AI memory.

## AI boundary

Future LLM/agent integration must sit above semantic game state, not inside rendering code.

```text
World / Entity State
        ↓
   Context Builder
        ↓
   LLM / Agent
        ↓
Intent / Structured Action
        ↓
 Game Rule Validation
        ↓
   Authoritative Action
        ↓
      Events
        ↓
 Renderer / UI
```

The LLM should never receive arbitrary access to mutate scene objects.

For example:

```text
LLM proposal:
"approach glow-bloom-origin"

Game:
- validate entity exists
- validate movement capability
- validate destination
- execute through normal simulation
```

This keeps latency, hallucination, and model changes from corrupting the world model.

## AI update frequency

AI is not a frame-loop system.

Recommended timescales:

```text
~60 Hz
rendering / immediate movement / physics

several Hz or event-driven
ordinary behavior / utility logic / local simulation

low-frequency or significant-event-driven
LLM reasoning / replanning / interpretation
```

This is important for latency, cost, determinism, and reliability.

## Incremental decoupling plan

Do not rewrite the entire project at once.

Current status / rough priority:

1. **Entities** — core simulation is already separated from Three.js presentation.
2. **Player / camera** — camera and avatar presentation are now separated from `PlayerController`; browser movement input remains coupled for now.
3. **World generation** — separate semantic `ChunkDescription` from Three.js mesh construction when gameplay requires it.
4. **Game time** — separate semantic clock/day phase from sky/light rendering.
5. **Shared types** — gradually move Three.js-specific runtime types into rendering-specific modules.

Each refactor should have a concrete reason and ideally be followed by gameplay that exercises the new boundary.

## What not to do

Avoid architecture for architecture's sake.

Do not prematurely introduce a large hierarchy such as:

```text
domain/application/infrastructure/repository/factory/facade/...
```

unless the project has real pressure that justifies it.

Likewise, do not introduce ECS merely because this is a game. A lightweight entity model is currently sufficient.

The preferred cycle is:

```text
add a concrete mechanic
        ↓
observe coupling / duplication
        ↓
extract the smallest useful abstraction
        ↓
use it for the next mechanic
```

## Dependency direction

As the project grows, the intended dependency direction is:

```text
rendering/three ───────► core / player state
input/browser ─────────► core / controllers
camera adapter ────────► player state
ui ────────────────────► semantic state/events

core ──X──► three
core ──X──► DOM
core ──X──► UI widgets
```

Adapters may depend on the core. The core should not depend on adapters.

## Practical review checklist

When adding a feature, ask:

1. Is this data part of the world, or just how the world is rendered?
2. Would an AI/server/test need to understand this state?
3. Am I storing gameplay state inside a Mesh/Material by accident?
4. Is this event semantic or renderer-specific?
5. Can the core action be represented with plain serializable data?
6. Does this abstraction solve a real current problem?
7. Is the LLM (if present) proposing an action, or directly controlling implementation details?
8. Am I forcing a cube/voxel representation because of rendering convenience rather than gameplay meaning?
9. Could another camera mode be added without changing the player's movement rules?

If those answers remain clean, the project should be able to grow without Three.js becoming the de facto game engine/domain model.
