# Weather System

Weather V1 adds several changing meteorological scenes while keeping weather semantics separate from Three.js presentation and browser audio.

## Current weather types

- clear
- drizzle
- rain
- storm
- mist
- snow

V1 cycles through all six in sequence so every scene can be play-tested easily. Durations vary slightly. For testing and experience tuning, Runtime Settings also exposes a direct weather selector with `Automatic cycle` plus every concrete weather type. Manual selection is persisted and freezes automatic transitions until automatic mode is restored.

## Architecture

```text
core/weather/WeatherSystem
        │ WeatherSnapshot / WeatherEvent
        ├──────────────► ThreeWeatherRenderer
        └──────────────► AudioSystem
```

`WeatherSystem` owns semantic weather state such as type, intensity, wind, transitions, manual override, and thunder events. It has no dependency on Three.js, DOM APIs, materials, particles, or Web Audio.

`ThreeWeatherRenderer` owns rain particles, low mist, snowflake presentation, lightning bolts, and lightning flashes. Snow uses a small generated six-arm snowflake texture rather than cube-like precipitation geometry.

`AudioSystem` consumes weather state/events and procedurally generates rain, mist/snow hush, wind changes, and thunder. No weather audio files are bundled.

## Audio direction

The ordinary world ambience should remain quiet. Weather is allowed to become more noticeable, but rain noise is deliberately band-limited and kept below event effects so it does not recreate the uncomfortable constant-gale problem found in the first AudioSystem experiment. Snow is intentionally quieter than rain and uses only a subtle hushed air layer.

## Lightning

Thunder remains a semantic `weather.thunder` event. The renderer turns that event into both a short scene flash and a visible jagged bolt at a randomized nearby location, while the audio layer generates the thunder independently. Manual storm mode still schedules thunder, so lightning can be tested without waiting for the automatic weather sequence.

## Future pressure points

Possible later work:

- weather affecting creatures and plants
- weather-sensitive world rules / anomalies
- wet ground or puddle presentation
- snow accumulation / melting
- cloud density / sky darkening
- spatial thunder delay based on strike distance
- weather persistence in save state
- region-specific weather
- replacing the V1 deterministic play-test sequence with a richer weather model
