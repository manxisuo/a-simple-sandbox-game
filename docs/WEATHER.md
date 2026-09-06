# Weather System

Weather V1 adds several changing meteorological scenes while keeping weather semantics separate from Three.js presentation and browser audio.

## Current weather types

- clear
- drizzle
- rain
- storm
- mist

V1 cycles through all five in sequence so every scene can be play-tested easily. Durations vary slightly. A later version can replace this with probability-, season-, location-, or world-rule-driven transitions.

## Architecture

```text
core/weather/WeatherSystem
        │ WeatherSnapshot / WeatherEvent
        ├──────────────► ThreeWeatherRenderer
        └──────────────► AudioSystem
```

`WeatherSystem` owns semantic weather state such as type, intensity, wind, transitions, and thunder events. It has no dependency on Three.js, DOM APIs, materials, particles, or Web Audio.

`ThreeWeatherRenderer` owns rain particles, low mist, and lightning flashes.

`AudioSystem` consumes weather state/events and procedurally generates rain, mist, wind changes, and thunder. No weather audio files are bundled.

## Audio direction

The ordinary world ambience should remain quiet. Weather is allowed to become more noticeable, but rain noise is deliberately band-limited and kept below event effects so it does not recreate the uncomfortable constant-gale problem found in the first AudioSystem experiment.

## Future pressure points

Possible later work:

- weather affecting creatures and plants
- weather-sensitive world rules / anomalies
- wet ground or puddle presentation
- cloud density / sky darkening
- spatial thunder delay
- weather persistence in save state
- region-specific weather
- replacing the V1 deterministic play-test sequence with a richer weather model
