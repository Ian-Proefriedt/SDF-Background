import * as THREE from 'three';
import GUI from 'lil-gui';

import vertexShader from './shaders/bg_vert.glsl?raw';
import fragmentShader from './shaders/bg_frag.glsl?raw';

import influenceFrag from './shaders/influence_frag.glsl?raw';
import fadeFrag from './shaders/fade_frag.glsl?raw';

import tileImage from '/Tiles/Tile_300_dm.png';
import { createDoubleFBO } from './fluid/fluid_core.js';

//
// Renderer
//
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = true;
document.body.appendChild(renderer.domElement);

//
// Scene & Camera
//
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

//
// Fullscreen Triangle
//
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

//
// Tile Texture
//
const texture = new THREE.TextureLoader().load(tileImage);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;

//
// Influence Buffer (scalar)
//
const influence = createDoubleFBO(window.innerWidth, window.innerHeight, THREE.RGBAFormat, THREE.FloatType);

//
// Influence Splat Pass
//
const influenceUniforms = {
    tTarget: { value: influence.read.texture },
    point: { value: new THREE.Vector2(0.5, 0.5) },
    radius: { value: 0.05 },
    strength: { value: 1.0 }
};
const influenceMaterial = new THREE.ShaderMaterial({
    uniforms: influenceUniforms,
    vertexShader,
    fragmentShader: influenceFrag
});
const influenceScene = new THREE.Scene();
influenceScene.add(new THREE.Mesh(fullscreenTriangle, influenceMaterial));

function addInfluence(point, radius = 0.05, strength = 1.0) {
    influenceUniforms.point.value.copy(point);
    influenceUniforms.radius.value = radius;
    influenceUniforms.strength.value = strength;

    renderer.setRenderTarget(influence.write);
    renderer.render(influenceScene, camera);
    renderer.setRenderTarget(null);

    influence.swap();
}

//
// Influence Fade Pass
//
const fadeUniforms = {
    tSource: { value: influence.read.texture },
    decay: { value: 0.98 }
};
const fadeMaterial = new THREE.ShaderMaterial({
    uniforms: fadeUniforms,
    vertexShader,
    fragmentShader: fadeFrag
});
const fadeScene = new THREE.Scene();
fadeScene.add(new THREE.Mesh(fullscreenTriangle, fadeMaterial));

function fadeInfluence() {
    fadeUniforms.tSource.value = influence.read.texture;

    renderer.setRenderTarget(influence.write);
    renderer.render(fadeScene, camera);
    renderer.setRenderTarget(null);

    influence.swap();
}

//
// Background Shader (Tile + Influence)
const uniforms = {
    tTile: { value: texture },
    tInfluence: { value: influence.read.texture }, // <- new buffer
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

//
// GUI
//
const gui = new GUI();
gui.add(uniforms.uTileScale, 'value', 1.0, 20.0).name('Tile Scale');
gui.add(uniforms.uThreshold, 'value', 0.0, 1.0).name('Threshold');
gui.add(uniforms.uSharpness, 'value', 0.001, 0.2).name('Sharpness');
gui.addColor(uniforms.uColorBase, 'value').name('Base Color');
gui.addColor(uniforms.uColorAccent, 'value').name('Accent Color');

//
// Resize
//
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    influence.resize(window.innerWidth, window.innerHeight);
});

//
// Mouse Input
//
window.addEventListener('click', e => {
    const point = new THREE.Vector2(
        e.clientX / window.innerWidth,
        1.0 - e.clientY / window.innerHeight
    );
    addInfluence(point, 0.05, 1.0);
});

//
// Animation Loop
//
function animate() {
    fadeInfluence();
    uniforms.tInfluence.value = influence.read.texture;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
