# Audio architecture

Audio V1 deliberately uses **procedural Web Audio** rather than bundled music or sound-effect assets.

## Boundary

Audio is a presentation/runtime adapter. Core entity and world simulation emit semantic state/events; they do not call browser audio APIs.

```text
Entity / World state + semantic events
                │
                ▼
            AudioSystem
                │
                ▼
          Web Audio API
```

Examples:

```text
memory.resonance  → resonance tone
bloom.awakened    → soft rising tone
anomaly.entered   → low sweep + Echo Field ambience
world daylight    → day/night ambience mix
```

The core remains usable without an `AudioContext`.

## Procedural layers

V1 creates its sounds at runtime:

- filtered noise for a light wind/air layer
- low oscillators for night ambience
- detuned/slowly modulated oscillators for Echo Field ambience
- short oscillator envelopes and frequency sweeps for semantic event effects

No audio files or copyrighted music assets are required.

## Browser autoplay policy

`AudioContext` is created lazily and resumed after the first pointer or keyboard interaction. This is required by modern browser autoplay policies and keeps page load silent until the player actually interacts with the game.

## Runtime settings

Audio settings are persisted with the other runtime preferences:

- mute
- master volume
- ambient volume
- effects volume

Music volume is intentionally not present yet because V1 has no music layer. If music is added later, it should be a separate bus rather than being mixed into ambience or effects.

## World-driven ambience

`AudioSystem` receives compact semantic world state instead of reading Three.js scene objects:

```text
daylight
anomalyInside
anomalyIntensity
```

This currently drives day/night ambience and Echo Field hum. Future inputs could include weather, biome-like rule zones, nearby semantic locations, or world-event intensity.

## Future direction

Potential extensions, only when gameplay needs them:

- positional/spatial audio for world entities
- footsteps and surface-dependent movement sounds
- distance attenuation for phenomena
- sparse ambient music with a dedicated music bus
- audio cues generated from richer world-rule combinations
- accessibility options such as event-cue emphasis

The engine should continue to produce semantic events; audio remains one consumer alongside rendering and UI.
