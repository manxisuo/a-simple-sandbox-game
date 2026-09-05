# Anomalies

Anomalies are the first experiment with world meaning that is spatial rather than only attached to ordinary creatures, relics, flora, or devices.

## Echo Field V1

The first anomaly is `echo-field-origin`, a fixed semantic region centered away from the spawn clearing.

Its core state includes:

```text
kind = anomaly
radius
active
intensity
playerInside
nightAmplified
```

The entity core owns those semantics and emits meaningful events when the player crosses the region boundary:

```text
anomaly.entered
anomaly.exited
```

The Three.js adapter is responsible only for presentation:

- faint ground rings
- floating low-poly shards
- slow drift / rotation
- stronger emissive response at night
- subtle local sky/fog tint while the player is inside

The visual implementation does not define whether the player is inside the field and does not own anomaly intensity.

## Companion reaction

The companion can treat an active Echo Field as a semantic interest target. It may notice the field while near the player and lead toward it, but normal catch-up/reunion constraints still have higher priority.

The companion does not inspect floating meshes or shader values. It reacts to the anomaly entity/state in the same way it reacts to other semantic world elements.

## Why V1 uses an anomaly entity

V1 deliberately represents the region inside the existing lightweight entity model rather than immediately introducing a separate universal `WorldRegionSystem`.

This is an intentional pressure test:

- if a few spatial world rules remain simple, the current semantic entity abstraction may be enough;
- if future anomalies, weather zones, gravity fields, ecology regions, or overlapping rules require region-specific queries/lifecycle/streaming, that concrete pressure should justify extracting a dedicated renderer-independent region model.

This follows the project rule: introduce the smallest abstraction that solves a real mechanic, then generalize only after the next mechanic exposes the limitation.

## Likely evolution

Possible future anomaly rules include:

- resonance-created temporary fields
- gravity or movement changes
- time-rate changes
- altered plant/entity behavior
- anomalies that remember visits
- anomalies that migrate or decay
- combinations of night, memory, resonance, and location that create or transform a field

The long-term goal is not to collect visual effects. Anomalies should become discoverable world rules that participate in the loop:

```text
explore
  → notice a rule
  → test / manipulate it
  → observe consequences
  → world changes
```
