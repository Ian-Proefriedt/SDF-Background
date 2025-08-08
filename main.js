// main.js
import * as THREE from 'three';
import { getRecommendedTextureOptions, createDoubleFBO, createRenderTarget, getResolution } from './buffers.js';
import { createAmbientFluidPasses, createElasticUVPasses, createLineSplatOp, createFadeOp, createElasticUvSplatOp } from './ops.js';
import { initGUI } from './gui.js';

import tileImage from './tile_300_dm.png';

import vertexShader from './shaders/vert.glsl?raw';
import fragmentShader from './shaders/bg_frag.glsl?raw';
import fadeFrag from './shaders/fade_frag.glsl?raw';
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

const lineSplat = createLineSplatOp(fullscreenTriangle, splatFrag);
const uvSplat = createElasticUvSplatOp(fullscreenTriangle);
const { fade: fadeRT, uniforms: fadeUniforms } = createFadeOp(fullscreenTriangle, fadeFrag);
fadeUniforms.decay.value = 0.97; // decay velocity/dye every frame to kill wake

// Initialize sim defaults for a more elastic/less fluid look
fluid.materials.vorticityMat.uniforms.uCurlStrength.value = 0.0; // disable curl by default
fluid.materials.advectionMat.uniforms.uDissipation.value = 0.9995; // even stronger velocity decay

// No ambient emitters for truest Yuga-like background (noise-driven, interaction adds energy)
const emitters = [];

// Pointer interaction state (Yuga-style)
const pointer = {
    position: new THREE.Vector2(0.5, 0.5),
    prevPosition: new THREE.Vector2(0.5, 0.5),
    lastUpdate: 0,
    velocity: 0
};
const INTERACTION = {
    force: 2000,
    radiusBase: 0.035,
    radiusGain: 0.2,
    speedScale: 8.0,
    dyeStrength: 1.0
};
const aspectRatio = () => (uniforms.resolution.value.x / uniforms.resolution.value.y);

function onPointer(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = 1.0 - (e.clientY - rect.top) / rect.height;
    pointer.position.set(cx, cy);
}

renderer.domElement.addEventListener('pointerdown', onPointer);
renderer.domElement.addEventListener('pointermove', onPointer);
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
    uGlobalOpen: { value: 0.0 },
    uDyeInfluence: { value: 0.65 }
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
// Interaction GUI removed per request; values fixed below.

// Elastic GUI removed per request; fixed values applied below.

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

    // Vorticity confinement (disabled for elastic look)
    if (fluid.materials.vorticityMat.uniforms.uCurlStrength.value > 0.0) {
        fluid.materials.vorticityMat.uniforms.uVelocity.value = velocity.read.texture;
        fluid.materials.vorticityMat.uniforms.uCurl.value = curl.texture;
        fluid.materials.vorticityMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
        fluid.materials.vorticityMat.uniforms.uDt.value = dt;
        renderer.setRenderTarget(velocity.write);
        renderer.render(fluid.scenes.vorticity, camera);
        renderer.setRenderTarget(null);
        velocity.swap();
    }

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

    // Additional decay to suppress wake and keep locality
    fadeUniforms.decay.value = 0.985; // velocity fade
    fadeRT(renderer, camera, velocity);
    fadeUniforms.decay.value = 0.95;  // stronger dye fade to remove tails
    fadeRT(renderer, camera, dye);

    // Elastic UV update (feedback field)
    const stiffness = (window.__ELASTIC_STIFFNESS__ ?? 0.25);
    const damping = (window.__ELASTIC_DAMPING__ ?? 0.60);
    const relax =  (window.__ELASTIC_RELAX__ ?? 0.04);
    const snapThresh = (window.__ELASTIC_SNAP_THRESH__ ?? 0.002);
    const snapStrength = (window.__ELASTIC_SNAP_STRENGTH__ ?? 1.0);
    updateElasticUV(renderer, camera, elasticUV, velocity.read.texture, 1.0, stiffness, damping, relax, snapThresh, snapStrength);
    // After update, bg shader samples latest elasticUV
    uniforms.uUV.value = elasticUV.read.texture;

    // Advect velocity (disabled to avoid propagation along geometry)
    const ADVECT_VELOCITY = false;
    if (ADVECT_VELOCITY) {
        fluid.materials.advectionMat.uniforms.uVelocity.value = velocity.read.texture;
        fluid.materials.advectionMat.uniforms.uSource.value = velocity.read.texture;
        fluid.materials.advectionMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
        fluid.materials.advectionMat.uniforms.uDyeTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
        fluid.materials.advectionMat.uniforms.uDt.value = dt;
        renderer.setRenderTarget(velocity.write);
        renderer.render(fluid.scenes.advection, camera);
        renderer.setRenderTarget(null);
        velocity.swap();
    }

    // Advect dye (disabled to avoid trailing tail). Enable if you want dye to flow.
    const ADVECT_DYE = false;
    if (ADVECT_DYE) {
        fluid.materials.advectionMat.uniforms.uVelocity.value = velocity.read.texture;
        fluid.materials.advectionMat.uniforms.uSource.value = dye.read.texture;
        fluid.materials.advectionMat.uniforms.uTexelSize.value.set(1 / simRes.width, 1 / simRes.height);
        fluid.materials.advectionMat.uniforms.uDyeTexelSize.value.set(1 / dyeRes.width, 1 / dyeRes.height);
        fluid.materials.advectionMat.uniforms.uDt.value = dt;
        fluid.materials.advectionMat.uniforms.uDissipation.value = 0.995;
        renderer.setRenderTarget(dye.write);
        renderer.render(fluid.scenes.advection, camera);
        renderer.setRenderTarget(null);
        dye.swap();
    }
    uniforms.tDye.value = dye.read.texture;

    // Yuga-style pointer splats (line-based)
    const delta = pointer.position.clone().sub(pointer.prevPosition);
    if (Math.abs(delta.x) > 0.0 || Math.abs(delta.y) > 0.0) {
        const elapsed = (now - pointer.lastUpdate) * 0.001;
        if (elapsed >= 0.014) {
            pointer.velocity += 3.0 * delta.length();
            const skipLine = elapsed > 0.1; // if long gap, collapse to point

            // Perpendicular UV displacement: elastic local move of the pattern
            const instSpeed = Math.min(1.0, delta.length() * INTERACTION.speedScale);
            const radius = Math.max(0.0005, INTERACTION.radiusBase + INTERACTION.radiusGain * instSpeed);
            // jello-like: stronger pull with speed but still small (GUI-tunable)
            const base = (window.__UV_STRENGTH_BASE__ ?? 0.015);
            const gain = (window.__UV_STRENGTH_GAIN__ ?? 0.035);
            // reduce pull-in by biasing strength downward and clamping
            const uvStrength = Math.max(0.0, base + gain * Math.min(1.0, delta.length() * 6.0));
            uvSplat(
                renderer,
                camera,
                elasticUV,
                aspectRatio(),
                pointer.position,
                skipLine ? pointer.position : pointer.prevPosition,
                radius,
                uvStrength
            );

            // into velocity (keep minimal to avoid wake)
            const force = new THREE.Vector3(delta.x, delta.y, 0).multiplyScalar(INTERACTION.force * 0.25);
            lineSplat(
                renderer,
                camera,
                velocity,
                aspectRatio(),
                pointer.position,
                skipLine ? pointer.position : pointer.prevPosition,
                radius,
                force,
                false
            );

            // into dye (clamped)
            const dyeColor = new THREE.Vector3(INTERACTION.dyeStrength,INTERACTION.dyeStrength,INTERACTION.dyeStrength);
            lineSplat(
                renderer,
                camera,
                dye,
                aspectRatio(),
                pointer.position,
                skipLine ? pointer.position : pointer.prevPosition,
                radius,
                dyeColor,
                true
            );

            pointer.lastUpdate = now;
            pointer.prevPosition.copy(pointer.position);
        }
        pointer.velocity *= Math.exp(Math.log(0.85));
        pointer.velocity = Math.min(1, pointer.velocity);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
// Initialize elastic UV feedback before starting the loop
initElasticUV(renderer, camera, elasticUV);
animate();
