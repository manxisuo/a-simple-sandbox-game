# Roadmap

This roadmap describes direction rather than a fixed release schedule.

The project is deliberately exploratory. New mechanics should be judged by whether they strengthen the identity of the world, not by whether they move the project closer to reproducing another sandbox game.

## Current foundation

Already implemented or actively being established:

- TypeScript + Vite + Three.js
- GitHub Pages deployment
- strict static type checking in CI
- first-person movement and collision
- deterministic chunk streaming
- procedural continuous terrain
- day/night and atmosphere
- entity IDs, state, interaction, and behavior
- renderer-independent entity core
- Three.js entity rendering adapter
- entity-domain events and entity-to-entity effects

## Near term

### 1. Stabilize the entity/world interaction model

Continue using concrete gameplay to pressure-test the new entity core.

Likely work:

- more reusable behavior primitives
- clearer entity lifecycle
- interaction capabilities rather than one-off conditionals
- relationships between entities
- better event semantics
- observable entity state for debugging
- basic tests for renderer-independent entity logic

Do not generalize into a large ECS or universal framework unless the actual game requires it.

### 2. Build small world-rule networks

Prefer connected mechanics over simply adding more object types.

Examples:

```text
player action
   ↓
entity memory
   ↓
world event
   ↓
second entity changes
   ↓
creature behavior changes
```

Useful experiments include:

- entities that remember repeated visits/interactions
- plants/objects that react to time or weather
- creatures attracted to or repelled by environmental states
- entities that trigger remote or delayed effects
- local chains of cause and effect

The aim is to make the world feel like a system rather than a collection of props.

### 3. Introduce a broader World Event model when needed

The current event mechanism is intentionally local to the entity domain.

When multiple independent systems need to participate, evolve toward a semantic world event stream such as:

```text
entity.interacted
entity.awakened
entity.moved
world.night-started
area.visited
resonance.pulse
weather.changed
```

The important property is that events describe **game meaning**, not renderer operations.

### 4. World memory / traces

Introduce mutable history separately from deterministic generation.

Potential first version:

- visited areas
- repeat-visit counts
- lightweight player trails / traffic
- entities remembering interactions
- local state changes caused by history

Conceptual split:

```text
Deterministic Base
seed + coordinates
        │
        ├── terrain
        └── initial content

Mutable Overlay
        ├── entity state
        ├── world changes
        └── player traces

History
        └── meaningful events
```

This is also important groundwork for future AI context and persistence.

## Medium term

### World model cleanup

The entity subsystem is the first part being decoupled from Three.js. Other areas should follow gradually when there is practical benefit.

Candidates:

- split procedural world description from Three.js chunk construction
- split player simulation from browser input and camera control
- split game time from day/night rendering
- move renderer-specific types out of shared/domain types

Target property:

> The core world simulation should eventually be runnable without constructing a Three.js scene.

### Procedural world evolution

Improve procedural generation without turning the roadmap into a Minecraft feature sequence.

Possible directions:

- more distinctive terrain formations
- points of interest with semantic meaning
- rare anomalies
- environmental rule zones
- dynamic or history-dependent world features
- procedural structures only when they support gameplay/world rules

Biomes, water, caves, crafting, mining, etc. are not automatic milestones. They should only be added if they serve the emerging identity of the project.

### Entity population and streaming

When the world contains more entities:

- chunk-aware entity activation/deactivation
- deterministic initial entity placement
- persistent mutable state for entities that have changed
- simulation budgets / update frequencies
- distance-based behavior simplification

### Persistence

Persist semantic state rather than renderer state.

Likely data:

- world seed
- player state
- modified entities
- world-memory overlays
- meaningful event/history summaries

Browser-first candidates include IndexedDB. A backend may later own authoritative persistence if multiplayer or AI services require it.

## Long term: AI-native world elements

The project is expected to experiment with LLM/agent capabilities inside the world.

This does not mean every entity needs an LLM.

Potential uses:

### Intelligent entities

An entity may have:

- identity
- goals
- beliefs / world knowledge
- relationships
- short-term state
- long-term memory
- available actions

The LLM participates in higher-level interpretation or planning while ordinary game logic handles execution.

### Intelligent objects and locations

Examples:

- a ruin that remembers how the player treated it
- an artifact that learns or misinterprets player actions
- a location whose behavior changes according to history
- an environmental system that communicates indirectly

### World Director

A low-frequency agent may observe summarized world state and meaningful history and propose events.

```text
World State + Event Summary
          ↓
      AI Director
          ↓
 Structured proposal
          ↓
 Game validation
          ↓
   World Event / Action
```

The director must not directly mutate arbitrary scene or game objects.

## AI architecture requirements

Before substantial LLM integration, the following seams should exist:

- stable entity IDs
- serializable world/entity state
- semantic events
- structured action vocabulary
- action validation
- context builder
- selective/summarized memory
- async request handling
- timeout and fallback behavior
- request/cost budgets
- stale-response detection

AI APIs should be accessed through a backend or trusted service. API keys must not be embedded in the GitHub Pages frontend.

## Performance direction

Optimize when profiling shows pressure.

Likely progression:

```text
Mesh per object
  → shared geometry/materials
  → InstancedMesh
  → LOD
  → chunk batching
```

Terrain generation may evolve from:

```text
main-thread CPU generation
  → generation budget / queue
  → Web Worker
  → more advanced GPU/WebGPU approaches if justified
```

Do not optimize solely because a more complex solution exists.

## Architectural guardrails

The following should remain true as the project grows:

- `src/core/**` must not depend on Three.js or browser UI APIs.
- Three.js objects are presentation/runtime adapter details, not semantic world state.
- AI should operate on semantic state/events/actions, never raw scene graphs.
- deterministic procedural generation and mutable world history remain conceptually separate.
- game rules validate all actions that change authoritative state.
- abstractions are introduced in response to concrete mechanics, not speculative framework design.

## Things intentionally not committed to

The project currently has no commitment to:

- a Minecraft-like progression tree
- crafting as the central loop
- mining as the central loop
- combat
- survival meters
- multiplayer
- a specific visual style
- a specific engine forever
- making every NPC/entity AI-driven

Any of these may appear later if they genuinely improve the project, but none are assumptions built into the roadmap.
