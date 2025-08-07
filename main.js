// main.js
import * as THREE from 'three';
import { createInfluenceBuffer, createLogoBuffer, getRecommendedTextureOptions, createDoubleFBO, createRenderTarget, getResolution } from './buffers.js';
import { createInfluenceOp, createFadeOp, createLogoOp, createObstacleOp, createAmbientFluidPasses, createSplatOp } from './ops.js';
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
// Allow running the influence buffer at a lower resolution for perf
const influenceScale = 1.0; // set to 0.5 for large perf win
const influence = createInfluenceBuffer(
    Math.max(1, Math.floor(window.innerWidth * influenceScale * renderer.getPixelRatio())),
    Math.max(1, Math.floor(window.innerHeight * influenceScale * renderer.getPixelRatio())),
    texOpts
);
const logoTarget = createLogoBuffer(
    Math.max(1, Math.floor(window.innerWidth * renderer.getPixelRatio())),
    Math.max(1, Math.floor(window.innerHeight * renderer.getPixelRatio())),
    texOpts
);

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

// Deterministic, low-amplitude ambient emitters (constant gentle motion)
const emitters = [
    { speed: 0.02, phase: 0.0, radius: 0.02 },
    { speed: 0.017, phase: 2.1, radius: 0.018 },
    { speed: 0.013, phase: 4.2, radius: 0.022 }
];
let startTimeMs = performance.now();

const addInfluence = createInfluenceOp(fullscreenTriangle, influenceFrag);
const fadeInfluence = createFadeOp(fullscreenTriangle, fadeFrag);
const { renderLogo, uniforms: logoUniforms } = createLogoOp(fullscreenTriangle, logoFrag);
const applyObstacle = createObstacleOp(fullscreenTriangle, obstacleFrag);

const texture = new THREE.TextureLoader().load(tileImage);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;

const uniforms = {
    tTile: { value: texture },
    tInfluence: { value: influence.read.texture },
    tDye: { value: dye.read.texture },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTileScale: { value: 20.0 },
    uThreshold: { value: 0.0 },
    uSharpness: { value: 0.04 },
    uColorBase: { value: new THREE.Color(0x000000) },
    uColorAccent: { value: new THREE.Color(0xffffff) }
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

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    const dpr = renderer.getPixelRatio();
    const drawW = Math.max(1, Math.floor(window.innerWidth * dpr));
    const drawH = Math.max(1, Math.floor(window.innerHeight * dpr));
    uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    influence.resize(
        Math.max(1, Math.floor(window.innerWidth * influenceScale * dpr)),
        Math.max(1, Math.floor(window.innerHeight * influenceScale * dpr))
    );
    logoTarget.setSize(drawW, drawH);
    logoUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

// Ambient-only: no click interaction

function animate() {
    // Minimal fluid sim step each frame to produce ambient motion
    const now = performance.now();
    const dt = 1 / 60;

    // Curl
    fluid.materials.curlMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.curlMat.uniforms.uTexelSize.value.set(velocity.read.texture.image ? (1/velocity.read.texture.image.width) : (1/velocity.read.width), velocity.read.texture.image ? (1/velocity.read.texture.image.height) : (1/velocity.read.height));
    renderer.setRenderTarget(curl); renderer.render(fluid.scenes.curl, camera);

    // Vorticity confinement
    fluid.materials.vorticityMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.vorticityMat.uniforms.uCurl.value = curl.texture;
    fluid.materials.vorticityMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    fluid.materials.vorticityMat.uniforms.uCurlStrength.value = 0.0003;
    fluid.materials.vorticityMat.uniforms.uDt.value = dt;
    renderer.setRenderTarget(velocity.write); renderer.render(fluid.scenes.vorticity, camera); velocity.swap();

    // Divergence
    fluid.materials.divergenceMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.divergenceMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    renderer.setRenderTarget(divergence); renderer.render(fluid.scenes.divergence, camera);

    // Pressure solve (few iterations)
    fluid.materials.pressureMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    for (let i = 0; i < 2; i++) {
        fluid.materials.pressureMat.uniforms.uPressure.value = pressure.read.texture;
        fluid.materials.pressureMat.uniforms.uDivergence.value = divergence.texture;
        renderer.setRenderTarget(pressure.write); renderer.render(fluid.scenes.pressure, camera); pressure.swap();
    }

    // Subtract pressure gradient
    fluid.materials.gradientSubtractMat.uniforms.uPressure.value = pressure.read.texture;
    fluid.materials.gradientSubtractMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.gradientSubtractMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    renderer.setRenderTarget(velocity.write); renderer.render(fluid.scenes.gradientSubtract, camera); velocity.swap();

    // Advect velocity
    fluid.materials.advectionMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.advectionMat.uniforms.uSource.value = velocity.read.texture;
    fluid.materials.advectionMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    fluid.materials.advectionMat.uniforms.uDyeTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    fluid.materials.advectionMat.uniforms.uDt.value = dt;
    fluid.materials.advectionMat.uniforms.uDissipation.value = 0.985;
    renderer.setRenderTarget(velocity.write); renderer.render(fluid.scenes.advection, camera); velocity.swap();

    // Advect dye
    fluid.materials.advectionMat.uniforms.uVelocity.value = velocity.read.texture;
    fluid.materials.advectionMat.uniforms.uSource.value = dye.read.texture;
    fluid.materials.advectionMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
    fluid.materials.advectionMat.uniforms.uDyeTexelSize.value.set(1 / dyeRes.width, 1 / dyeRes.height);
    fluid.materials.advectionMat.uniforms.uDt.value = dt;
    fluid.materials.advectionMat.uniforms.uDissipation.value = 0.97;
    renderer.setRenderTarget(dye.write); renderer.render(fluid.scenes.advection, camera); dye.swap();
    uniforms.tDye.value = dye.read.texture;

    // Deterministic continuous seeding along slow orbits for constant presence
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

    // For now, just fade and render background using current influence buffer
    renderLogo(renderer, camera, logoTarget);
    applyObstacle(renderer, camera, influence, logoTarget);
    fadeInfluence(renderer, camera, influence);
    uniforms.tInfluence.value = influence.read.texture;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
