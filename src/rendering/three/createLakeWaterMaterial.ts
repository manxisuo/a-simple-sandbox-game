import * as THREE from 'three';

export interface LakeWaterAppearance {
  material: THREE.MeshStandardMaterial;
  update(time: number, rainIntensity: number): void;
}

/**
 * Shared lake material. The shader only changes presentation: lake placement, shoreline shape,
 * and basin carving remain renderer-independent world rules.
 */
export function createLakeWaterMaterial(): LakeWaterAppearance {
  const uniforms = {
    lakeTime: { value: 0 },
    lakeRain: { value: 0 }
  };
  const material = new THREE.MeshStandardMaterial({
    color: 0x3c9fc4,
    roughness: 0.22,
    metalness: 0.02,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  material.onBeforeCompile = shader => {
    shader.uniforms.lakeTime = uniforms.lakeTime;
    shader.uniforms.lakeRain = uniforms.lakeRain;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float lakeTime;
uniform float lakeRain;
varying vec3 vLakeWorldPosition;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float lakeWave = sin(position.x * 8.0 + lakeTime * 0.9)
  + sin(position.z * 11.0 - lakeTime * 0.72);
transformed.y += lakeWave * (0.008 + lakeRain * 0.012);
vLakeWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float lakeTime;
uniform float lakeRain;
varying vec3 vLakeWorldPosition;

float lakeHash(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453);
}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec2 rainCell = floor(vLakeWorldPosition.xz * 0.75);
vec2 rainLocal = fract(vLakeWorldPosition.xz * 0.75) - 0.5;
float rainPhase = fract(lakeTime * 0.65 + lakeHash(rainCell));
float rainRadius = rainPhase * 0.62;
float rainRing = 1.0 - smoothstep(0.025, 0.07, abs(length(rainLocal) - rainRadius));
float breeze = 0.5 + 0.5 * sin((vLakeWorldPosition.x + vLakeWorldPosition.z) * 0.55 + lakeTime);
diffuseColor.rgb += vec3(0.035, 0.075, 0.09) * breeze;
diffuseColor.rgb += vec3(0.18, 0.24, 0.27) * rainRing * lakeRain;`
      );
  };
  material.customProgramCacheKey = () => 'lake-water-v2';

  return {
    material,
    update(time: number, rainIntensity: number): void {
      uniforms.lakeTime.value = time;
      uniforms.lakeRain.value = THREE.MathUtils.clamp(rainIntensity, 0, 1);
      material.roughness = THREE.MathUtils.lerp(0.22, 0.38, uniforms.lakeRain.value);
    }
  };
}
