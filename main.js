// main.js
import * as THREE from 'three';
import { getRecommendedTextureOptions, createDoubleFBO, createRenderTarget, getResolution } from './buffers.js';
import { createAmbientFluidPasses, createSplatOp, createElasticUVPasses } from './ops.js';
import { initGUI } from './gui.js';

import tileImage from './tile_300_dm.png';

import vertexShader from './shaders/vert.glsl?raw';
import fragmentShader from './shaders/bg_frag.glsl?raw';
import influenceFrag from './shaders/influence_frag.glsl?raw';
import fadeFrag from './shaders/fade_frag.glsl?raw';
import logoFrag from './shaders/logo_frag.glsl?raw';
import obstacleFrag from './shaders/obstacle_frag.glsl?raw';
import advectionFrag from './shaders/advection_frag.glsl?raw';
import divergenceFrag from './shaders/divergence_frag.glsl?raw';
import curlFrag from './shaders/curl_frag.glsl?raw';
import vorticityFrag from './shaders/vorticity_frag.glsl?raw';
import pressureFrag from './shaders/pressure_frag.glsl?raw';
import gradientSubtractFrag from './shaders/gradient_subtract_frag.glsl?raw';
import displayFrag from './shaders/display_frag.glsl?raw';
import splatFrag from './shaders/splat_frag.glsl?raw';

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const fullscreenTriangle = new THREE.BufferGeometry();
fullscreenTriangle.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 0,
     3, -1, 0,
    -1,  3, 0
]), 3));
fullscreenTriangle.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
    0, 0,
    2, 0,
    0, 2
]), 2));

const texOpts = getRecommendedTextureOptions();

// Elastic UV feedback buffer (RG: UV, BA: velocity)
const elasticUV = createDoubleFBO(
    Math.max(1, Math.floor(window.innerWidth * renderer.getPixelRatio())),
    Math.max(1, Math.floor(window.innerHeight * renderer.getPixelRatio())),
    texOpts
);
const { initElasticUV, updateElasticUV } = createElasticUVPasses(fullscreenTriangle);

// Set up a minimal fluid field for ambient background motion (no user interaction)
const simBaseRes = 128; // mirrors yuga's simRes
const dyeBaseRes = 128; // mirrors yuga's dyeRes for parity
const dpr = renderer.getPixelRatio();
const drawW = Math.max(1, Math.floor(window.innerWidth * dpr));
const drawH = Math.max(1, Math.floor(window.innerHeight * dpr));
const simRes = getResolution(simBaseRes, drawW, drawH);
const dyeRes = getResolution(dyeBaseRes, drawW, drawH);
const velocity = createDoubleFBO(simRes.width, simRes.height, texOpts);
const dye = createDoubleFBO(dyeRes.width, dyeRes.height, texOpts);
const divergence = createRenderTarget(simRes.width, simRes.height, texOpts);
const curl = createRenderTarget(simRes.width, simRes.height, texOpts);
const pressure = createDoubleFBO(simRes.width, simRes.height, texOpts);

const fluid = createAmbientFluidPasses(fullscreenTriangle, {
    advectionFrag,
    divergenceFrag,
    curlFrag,
    vorticityFrag,
    pressureFrag,
    gradientSubtractFrag,
    displayFrag
}, { manualFiltering: !texOpts.supportLinearFiltering });

const splat = createSplatOp(fullscreenTriangle, splatFrag);

// No ambient emitters for truest Yuga-like background (noise-driven, interaction adds energy)
const emitters = [];
let startTimeMs = performance.now();

// Removed logo/influence pipeline to focus on tile-based background parity

const texture = new THREE.TextureLoader().load(tileImage);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;

const uniforms = {
    tTile: { value: texture },
    tDye: { value: dye.read.texture },
    uVel: { value: velocity.read.texture },
    uUV: { value: elasticUV.read.texture },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTime: { value: 0 },
    uTileScale: { value: 20.0 },
    uThreshold: { value: 0.0 },
    uSharpness: { value: 0.0000000001 },
    uColorBase: { value: new THREE.Color(0x000000) },
    uColorAccent: { value: new THREE.Color(0xffffff) },
    uWarpStrength: { value: 0.0 },
    uNoiseWarpStrength: { value: 0.0 },
    uNoise: { value: 0 },
    uNoiseMultiplier: { value: 1.5 },
    uNoiseFlowStrength: { value: 0.015 },
    uNoise1Opts: { value: new THREE.Vector2(1.25, 0.15) },
    uNoise2Opts: { value: new THREE.Vector2(1.75, 0.15) },
    // uNoise3Opts: x=scaleX, y=speed, z=angle (radians)
    uNoise3Opts: { value: new THREE.Vector3(3.0, 1.25, 0.4) },
    uNoise3Strength: { value: 0.65 },
    uNoise4Opts: { value: new THREE.Vector4(-0.6, -0.3, -0.7, -0.4) },
    uGlobalShape: { value: 1.5 },
    uGlobalOpen: { value: 0.0 }
};

const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader
});
const mesh = new THREE.Mesh(fullscreenTriangle, material);
mesh.frustumCulled = false;
scene.add(mesh);

const gui = initGUI(uniforms);
// Add sim parity controls (limited, to avoid GUI bloat)
const simFolder = gui.addFolder('Fluid (core)');
simFolder.add({curl: 0.00015}, 'curl', 0.00001, 0.002, 0.00001).name('Curl Strength').onChange(v=>{
    // applied each frame below
    fluid.materials.vorticityMat.uniforms.uCurlStrength.value = v;
});
simFolder.add({velDiss: 0.992}, 'velDiss', 0.96, 0.999, 0.0005).name('Velocity Diss').onChange(v=>{
    // applied each frame
    fluid.materials.advectionMat.uniforms.uDissipation.value = v;
});
simFolder.add({dyeDiss: 0.985}, 'dyeDiss', 0.93, 0.999, 0.0005).name('Dye Diss');
simFolder.close();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    const dpr = renderer.getPixelRatio();
    const drawW = Math.max(1, Math.floor(window.innerWidth * dpr));
    const drawH = Math.max(1, Math.floor(window.innerHeight * dpr));
    uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    elasticUV.resize(drawW, drawH);
    // re-initialize elastic UV after resize to avoid garbage feedback
    initElasticUV(renderer, camera, elasticUV);
});

// Ambient-only: no click interaction, no ambient emitters

function animate() {
    // Minimal fluid sim step each frame to produce ambient motion
    const now = performance.now();
    const dt = 1 / 60;
    uniforms.uTime.value += dt;

    // Curl
    fluid.materials.curlMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.curlMat.uniforms.uTexelSize.value.set(velocity.read.texture.image ? (1/velocity.read.texture.image.width) : (1/velocity.read.width), velocity.read.texture.image ? (1/velocity.read.texture.image.height) : (1/velocity.read.height));
    renderer.setRenderTarget(curl);
    renderer.render(fluid.scenes.curl, camera);
    renderer.setRenderTarget(null);

    // Vorticity confinement
    fluid.materials.vorticityMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.vorticityMat.uniforms.uCurl.value = curl.texture;
    fluid.materials.vorticityMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    fluid.materials.vorticityMat.uniforms.uCurlStrength.value = 0.00015;
    fluid.materials.vorticityMat.uniforms.uDt.value = dt;
    renderer.setRenderTarget(velocity.write);
    renderer.render(fluid.scenes.vorticity, camera);
    renderer.setRenderTarget(null);
    velocity.swap();

    // Divergence
    fluid.materials.divergenceMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.divergenceMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    renderer.setRenderTarget(divergence);
    renderer.render(fluid.scenes.divergence, camera);
    renderer.setRenderTarget(null);

    // Pressure solve (few iterations)
    fluid.materials.pressureMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    for (let i = 0; i < 2; i++) {
        fluid.materials.pressureMat.uniforms.uPressure.value = pressure.read.texture;
        fluid.materials.pressureMat.uniforms.uDivergence.value = divergence.texture;
        renderer.setRenderTarget(pressure.write);
        renderer.render(fluid.scenes.pressure, camera);
        renderer.setRenderTarget(null);
        pressure.swap();
    }

    // Subtract pressure gradient
    fluid.materials.gradientSubtractMat.uniforms.uPressure.value = pressure.read.texture;
    fluid.materials.gradientSubtractMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.gradientSubtractMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    renderer.setRenderTarget(velocity.write);
    renderer.render(fluid.scenes.gradientSubtract, camera);
    renderer.setRenderTarget(null);
    velocity.swap();
    uniforms.uVel.value = velocity.read.texture;

    // Elastic UV update (feedback field)
    updateElasticUV(renderer, camera, elasticUV, velocity.read.texture, 1.0);
    uniforms.uUV.value = elasticUV.read.texture;

    // Advect velocity
    fluid.materials.advectionMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.advectionMat.uniforms.uSource.value = velocity.read.texture;
    fluid.materials.advectionMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    fluid.materials.advectionMat.uniforms.uDyeTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    fluid.materials.advectionMat.uniforms.uDt.value = dt;
    fluid.materials.advectionMat.uniforms.uDissipation.value = 0.992;
    renderer.setRenderTarget(velocity.write);
    renderer.render(fluid.scenes.advection, camera);
    renderer.setRenderTarget(null);
    velocity.swap();

    // Advect dye
    fluid.materials.advectionMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.advectionMat.uniforms.uSource.value = dye.read.texture;
    fluid.materials.advectionMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    fluid.materials.advectionMat.uniforms.uDyeTexelSize.value.set(1 / dyeRes.width, 1 / dyeRes.height);
    fluid.materials.advectionMat.uniforms.uDt.value = dt;
    fluid.materials.advectionMat.uniforms.uDissipation.value = 0.985;
    renderer.setRenderTarget(dye.write);
    renderer.render(fluid.scenes.advection, camera);
    renderer.setRenderTarget(null);
    dye.swap();
    uniforms.tDye.value = dye.read.texture;

    // Deterministic continuous seeding along slow orbits for constant presence (disabled by default)
    const t = (now - startTimeMs) * 0.001;
    for (let i = 0; i < emitters.length; i++) {
        const e = emitters[i];
        const ang = t * e.speed + e.phase;
        const r = 0.35 + 0.1 * Math.sin(ang * 0.7 + i);
        const p = new THREE.Vector2(0.5 + r * Math.cos(ang), 0.5 + r * Math.sin(ang));
        // approximate tangent direction for velocity push
        const vel = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0).multiplyScalar(150);
        splat(renderer, camera, velocity, p, e.radius, vel);
        // low-saturation dye
        const hue = (i * 0.3 + t * 0.02) % 1.0;
        const dyeStrength = 0.4;
        const dyeColor = new THREE.Vector3(
            dyeStrength * (0.5 + 0.5 * Math.sin(6.2831 * hue)),
            dyeStrength * (0.5 + 0.5 * Math.sin(6.2831 * (hue + 0.33))),
            dyeStrength * (0.5 + 0.5 * Math.sin(6.2831 * (hue + 0.66)))
        );
        splat(renderer, camera, dye, p, e.radius, dyeColor);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
// Initialize elastic UV feedback before starting the loop
initElasticUV(renderer, camera, elasticUV);
animate();
