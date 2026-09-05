# Companion behavior and localization boundaries

This note records two design decisions introduced by the bilingual UI and Companion World Reactions work.

## Localization is presentation, not world state

The interface currently supports `zh-CN` and `en`, with Chinese as the default. The selected locale is persisted in runtime settings.

The important architectural rule is:

> Core simulation should expose semantic IDs, state, and events; presentation/input adapters turn those semantics into localized text.

For example, the entity core knows about:

```text
companion-origin
memory-stone-origin
glow-bloom-origin
resonance-spire-origin
```

The UI layer maps those identifiers and events to strings such as `摸摸你的同伴` or `pet your companion`.

This avoids putting user-facing language into renderer-independent simulation and keeps the same semantic state usable by tests, persistence, server simulation, replay/debugging, and future AI context construction.

## Companion is a semantic actor, not a follower mesh

The companion began as a loose follower, but its behavior is intentionally represented as semantic state in `src/core/entities/EntitySystem.ts` rather than inferred from animation.

Current state includes concepts such as:

```text
activity
mood
interest
nighttimeComfort
affection
bonded
```

Examples of activities include ordinary wandering/following plus investigation, leading, hesitation, and seeking company.

The companion can currently notice world semantics including:

- an awake Glow Bloom
- a charged Resonance Spire
- a Memory Stone that has been touched
- a greeted Whisperling

These interests are subordinate to the companion-player bond. Catch-up/reunion behavior remains higher priority so curiosity should not cause the companion to abandon the player.

At deep night the companion prefers a tighter radius and may return toward the player with a softer seeking-company behavior.

## Why this matters for future AI

The intended progression is not:

```text
mesh motion
  ↓
try to infer what the companion is doing
```

It is:

```text
semantic observation
  ↓
interest / mood / activity
  ↓
validated movement or interaction
  ↓
renderer presentation
```

That means a future memory or LLM layer can receive compact statements such as:

```text
activity = leading
interest = anomaly.echo-field
mood = curious
```

without knowing anything about Three.js meshes, animation, or UI strings.

## Design guardrails

- Do not move localized strings into `src/core/**`.
- Do not make companion decisions by inspecting Three.js objects.
- Prefer semantic world signals over renderer-specific cues.
- Keep ordinary deterministic/local behavior as the real-time executor even if an LLM later participates in higher-level planning.
- Preserve the player-companion bond as a gameplay constraint above optional curiosity behavior.
