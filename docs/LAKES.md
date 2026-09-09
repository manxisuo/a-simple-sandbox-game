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
LakeField (deterministic, terrain-aware lake placement)
        ↓
TerrainHeight (shallow basin shaping + water level)
        ↓
WorldGenerator (water surface presentation + object exclusion)
```

`LakeField` contains no Three.js objects. It produces semantic/geometric lake descriptors such as center, radii, and shallow depth. Candidate sites are sampled against the unmodified height field and rejected when the local relief is too steep, so lakes prefer broad low/level ground rather than hillsides.

`TerrainHeight` applies a softly blended basin to the normal terrain height and exposes the corresponding local water level. The visible water footprint sits inside the strongly carved part of the basin; the wider outer ring is reserved for shoreline transition. This guarantees the flat water surface does not cut through raised terrain at its edge.

`WorldGenerator` renders a deterministic irregular shoreline using a shared Three.js water material and avoids spawning trees or rocks under water. The same shoreline function shapes both the water mesh and the terrain basin, so visual variation cannot push water back through uncarved terrain.

## Water presentation V2

- each lake derives a stable multi-frequency shoreline profile from its deterministic descriptor;
- the water shader adds restrained wind ripples without changing semantic water height;
- drizzle, rain, and storms increase surface roughness and add short-lived impact rings;
- clear, mist, and snow smoothly remove the rain response;
- animation uniforms are shared by all streamed lakes, keeping per-frame work independent of lake count.

Weather affects presentation only. It does not currently change water level, basin geometry, or lake persistence.

## Discoverability tuning

Lake placement uses 72-metre candidate cells with a 48% attempt rate. Terrain-relief rejection remains unchanged, so the higher encounter rate does not weaken the hillside-disc safeguard. With the default seed this produces roughly 42 accepted lakes per square kilometre and places the nearest lake about 53 metres from spawn, compared with roughly 19 per square kilometre and 88 metres in V1.

## Hillside-disc safeguard

The first implementation could place a large flat water ellipse on sloped terrain, producing an obvious blue disc intersecting a hillside. V1.1 addresses that in three layers:

1. reject candidate sites whose sampled local relief is too large;
2. guarantee all terrain under the visible water footprint is carved below water level;
3. shrink rendered water to the inner basin while leaving the outer ring as natural shoreline transition.

The long-term direction is still a terrain-clipped or irregular shoreline mesh, but the V1.1 rules remove the most artificial failure mode without prematurely building a full hydrology system.

## Why the lakes are shallow in V1

The player controller does not yet implement swimming or buoyancy. Deeply carved lakes would make the player walk along the lake bed while the camera could end up underwater. V1 therefore uses shallow basins that can be waded through while still giving the landscape a visible body of water.

This is an intentional staging choice, not the final water model.

## Future pressure points

- swimming / buoyancy and underwater camera behavior
- terrain-clipped shorelines and shoreline foam
- physically richer reflection/refraction and underwater presentation
- reflections or environment-aware water shading
- aquatic plants and creatures
- lake-specific world events or anomalies
- rivers connecting height-field drainage basins
- persistent or weather-driven water-level changes
