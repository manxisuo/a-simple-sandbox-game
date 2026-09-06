# Lakes

Lakes are the first step away from a world that reads as uniformly grassy terrain.

## V1 goals

- remove the generic wooden box clutter left from the earliest collision-test prototype
- introduce sparse deterministic inland lakes as landscape landmarks
- keep the world continuous-height-field rather than converting it to voxel terrain
- keep lake placement and basin shape deterministic from the world seed
- avoid a global sea level so the world does not accidentally become an ocean map

## Structure

```text
LakeField (deterministic lake placement)
        ↓
TerrainHeight (shallow basin shaping + water level)
        ↓
WorldGenerator (water surface presentation + object exclusion)
```

`LakeField` contains no Three.js objects. It produces semantic/geometric lake descriptors such as center, radii, and shallow depth.

`TerrainHeight` applies a softly blended basin to the normal terrain height and exposes the corresponding local water level.

`WorldGenerator` renders an oval water surface using shared Three.js resources and avoids spawning trees or rocks under water.

## Why the lakes are shallow in V1

The player controller does not yet implement swimming or buoyancy. Deeply carved lakes would make the player walk along the lake bed while the camera could end up underwater. V1 therefore uses shallow basins that can be waded through while still giving the landscape a visible body of water.

This is an intentional staging choice, not the final water model.

## Future pressure points

- swimming / buoyancy and underwater camera behavior
- ripples and shoreline foam
- rain affecting lake surface presentation
- reflections or environment-aware water shading
- aquatic plants and creatures
- lake-specific world events or anomalies
- rivers connecting height-field drainage basins
- persistent or weather-driven water-level changes
