# A Simple Sandbox Game

A small browser-based 3D sandbox experiment built with **TypeScript + Three.js + Vite**.

The project started as a quick Codex-generated prototype, but it is now being evolved deliberately into something more long-lived: a procedural world where exploration, entities, interaction, memory, events, and eventually AI can participate in the evolution of the world.

This project may borrow mature infrastructure ideas from games such as Minecraft, but **it is not intended to become a Minecraft clone**. The goal is to discover its own interaction language and world rules.

## Live demo

GitHub Pages:

https://manxisuo.github.io/a-simple-sandbox-game/

## Current features

- first-person movement, jumping, sprinting, pointer-lock mouse look
- switchable first-person / third-person camera
- simple third-person player avatar
- deterministic infinite chunk streaming
- seamless procedural height-field terrain with more varied, steeper hills
- day/night cycle, atmosphere, clouds, fireflies, campfire lighting
- collectibles and simple environmental objects
- general-purpose entity + interaction system
- entity memory/state
- entity-to-entity effects
- entity-domain events
- Three.js-independent entity simulation core

The current entity experiment includes examples such as:

- **Memory Stone** — remembers repeated player interactions
- **Glow Bloom** — responds to interaction, resonance, and the day/night cycle
- **Whisperling** — wanders, flees, can become curious, and reacts to other entities
- **Resonance Spire** — can be charged by another entity and emit events that affect the local world

## Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look |
| Space | Jump |
| Shift | Sprint |
| E | Interact |
| V | Toggle first / third person view |
| Esc | Release pointer lock |

## Development

Requirements:

- Node.js 22+
- npm

```bash
npm ci
npm run dev
```

Static type checking:

```bash
npm run typecheck
```

Production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Pull requests run static type checking and a Vite production build in GitHub Actions. Merges to `main` are deployed to GitHub Pages.

## Architecture direction

One of the most important project rules is:

> **Three.js is the current rendering adapter, not the game world itself.**

The game should gradually become capable of representing and simulating its world independently from Three.js.

Conceptually:

```text
                    Game Core
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   World Model      Entities       Events
        │              │              │
        └──────────────┼──────────────┘
                       │ state / events
             ┌─────────┼─────────┐
             ▼         ▼         ▼
        Three.js     Browser      UI
        Renderer      Input
```

The first concrete version of this separation already exists for entities, and the player/camera boundary is beginning to follow the same direction:

```text
src/core/entities/                  # renderer-independent entity simulation
src/rendering/three/                # Three.js presentation, including player avatar
src/input/                          # browser-specific interaction/input
src/player/CameraController.ts      # first/third-person camera behavior outside PlayerController
```

The intended invariant is that code under `src/core/` does not import `three`, DOM APIs, rendering objects, or UI objects.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the architectural principles and intended layering.

## Product / game-design direction

The project is intentionally exploratory rather than feature-checklist driven.

Instead of reproducing a familiar crafting-survival progression, the current direction favors ideas such as:

- discovering hidden world rules
- entities that remember the player or world history
- entities that affect one another
- small emergent ecological or behavioral systems
- anomalies and unusual local rules
- world events caused by combinations of state, time, place, and interaction
- player powers based on observing, connecting, activating, marking, or modifying rather than only collecting tools/resources

A useful long-term loop is:

```text
explore
  ↓
discover rules
  ↓
interact / manipulate
  ↓
observe consequences
  ↓
world changes
```

## Visual direction

The project deliberately avoids treating the world as a grid of cubes.

Minecraft can be a useful reference for sandbox infrastructure, procedural worlds, streaming, persistence, and interaction design, but **its all-voxel / all-cube visual grammar is not a target for this project**.

The current visual language favors:

- continuous height-field terrain rather than block terrain
- low-poly / geometric forms without requiring everything to be cubic
- mixed primitives and irregular silhouettes for plants, creatures, relics, and structures
- stylized simplicity without turning every object into voxel blocks

Using a box as one modeling primitive is fine; making the whole world visually read as a cube grid is not.

## AI / LLM direction

AI is a long-term direction, but it is **not** intended to mean merely adding chatbots to NPCs.

Potential intelligent participants include:

- characters and creatures
- objects and relics
- locations
- events
- local ecosystems
- a world-level director

The intended boundary is:

```text
LLM / Agent Layer
        ↓ intent / plan / interpretation
Game Core
        ↓ validation / rules / execution
Authoritative World State
```

LLMs should not directly mutate arbitrary game state. They should propose intentions or structured actions that the deterministic game layer validates and executes.

The world model, entity IDs, event history, and serializable state being introduced now are meant to make this possible later without coupling AI to rendering internals.

## Project principles

1. **Do not build a Minecraft clone.** Use existing sandbox games as infrastructure references, not as the product roadmap.
2. **Do not adopt an all-cube visual grammar.** Preserve continuous terrain and a varied low-poly/geometric visual language instead of converging on a voxel-block world.
3. **Three.js is a renderer, not the domain model.** Core simulation should increasingly work without it.
4. **Prefer semantic world state over scene-graph state.** `Entity`, `Event`, `WorldState`, and memory matter more than `Mesh` and `Material` outside rendering code.
5. **Keep the engine authoritative.** Future LLM/agent output must be validated before affecting the world.
6. **Do not call AI at frame rate.** AI should be asynchronous, event-driven, and low-frequency.
7. **Let architecture follow real gameplay pressure.** Avoid building abstract frameworks before concrete mechanics need them.
8. **Favor interactions between world elements.** A world becomes interesting when entities affect each other, not only when everything reacts to the player.
9. **Keep deterministic generation separate from mutable history.** Seed-based terrain/world generation should remain reproducible; player/world changes should live in explicit mutable state.

## Roadmap

The roadmap is intentionally directional rather than a fixed promise. See [ROADMAP.md](ROADMAP.md).

## Status

Early experimental development. APIs, architecture, game mechanics, and visual style are expected to change significantly within the principles above.
