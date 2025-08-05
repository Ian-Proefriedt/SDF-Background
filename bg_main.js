import * as THREE from 'three';
import GUI from 'lil-gui';
import vertexShader from './bg_vertex.glsl?raw';
import fragmentShader from './bg_fragment.glsl?raw';
import splatFragment from './splat_fragment.glsl?raw';
import tileImage from '/Tiles/Tile_300_dm.png';

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
// Pattern Texture
//
const texture = new THREE.TextureLoader().load(tileImage);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;

//
// Mask render target
//
const maskTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType
});

//
// Main Background Shader
//
const uniforms = {
    tTile: { value: texture },
    tMask: { value: maskTarget.texture },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTileScale: { value: 20.0 },
    uThreshold: { value: 1.0 },
    uSharpness: { value: 0.04 },
    uNoiseScale: { value: 0.35 },
    uNoiseStrength: { value: 1.0 },
    uTime: { value: 0.0 },
    uColorActive: { value: new THREE.Color(0x000000) },
    uColorInactive: { value: new THREE.Color(0xffffff) },

    // Influence controls
    uInfluenceRadius:   { value: 0.025 },
    uInfluenceStrength: { value: 1.0 },
    uDebugMode:         { value: 0 }
};

const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader
});

//
// Fullscreen Triangle
//
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 0,
     3, -1, 0,
    -1,  3, 0
]), 3));
geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
    0, 0,
    2, 0,
    0, 2
]), 2));

const mesh = new THREE.Mesh(geometry, material);
mesh.frustumCulled = false;
scene.add(mesh);

//
// Logo mask scene (SDF logo fragment)
//
const splatUniforms = {
    uResolution:     { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uShapePos:       { value: new THREE.Vector2(0.0, 0.0) },
    uShapeScale:     { value: 0.25 },
    uCornerRatio:    { value: 0.3 },
    uInteriorValue:  { value: 1.0 },  // new
    uHaloRadius:     { value: 0.05 }, // new
    uHaloStrength:   { value: 0.5 }   // new
};


const splatMaterial = new THREE.ShaderMaterial({
    uniforms: splatUniforms,
    vertexShader,
    fragmentShader: splatFragment
});
const splatScene = new THREE.Scene();
splatScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), splatMaterial));

//
// GUI Controls
//
const gui = new GUI();
gui.add(uniforms.uTileScale, 'value', 1.0, 20.0).name('Tile Scale');
gui.add(uniforms.uThreshold, 'value', 0.0, 1.0).name('Threshold');
gui.add(uniforms.uSharpness, 'value', 0.001, 0.2).name('Sharpness');
gui.add(uniforms.uNoiseScale, 'value', 0.1, 5.0).name('Noise Scale');
gui.add(uniforms.uNoiseStrength, 'value', 0.0, 2.0).name('Noise Strength');

gui.add(splatUniforms.uShapeScale, 'value', 0.01, 0.5).name('Shape Scale');
gui.add(splatUniforms.uCornerRatio, 'value', 0.0, 1.0).name('Corner Ratio');
gui.add(splatUniforms.uShapePos.value, 'x', -1.0, 1.0).name('Shape X');
gui.add(splatUniforms.uShapePos.value, 'y', -1.0, 1.0).name('Shape Y');

gui.add(splatUniforms.uInteriorValue, 'value', 0.0, 1.0).name('Interior Value');
gui.add(splatUniforms.uHaloRadius, 'value', 0.0, 0.2).name('Halo Radius');
gui.add(splatUniforms.uHaloStrength, 'value', 0.0, 1.0).name('Halo Strength');

gui.add(uniforms.uInfluenceRadius, 'value', 0.0, 0.5).name('Influence Radius');
gui.add(uniforms.uInfluenceStrength, 'value', 0.0, 1.0).name('Influence Strength');
gui.add(uniforms.uDebugMode, 'value', { Final: 0, MaskSDF: 1, Influence: 2 }).name('Debug Mode');
gui.addColor(uniforms.uColorActive, 'value').name('Active Color');
gui.addColor(uniforms.uColorInactive, 'value').name('Inactive Color');

//
// Resize
//
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    splatUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    maskTarget.setSize(window.innerWidth, window.innerHeight);
});

//
// Animate
//
function animate(t) {
    uniforms.uTime.value = t * 0.001;

    // Render logo mask (SDF) to maskTarget
    renderer.setRenderTarget(maskTarget);
    renderer.clear();
    renderer.render(splatScene, camera);
    renderer.setRenderTarget(null);

    // Render main scene using SDF mask
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
}
animate();
