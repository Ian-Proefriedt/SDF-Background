import * as THREE from 'three';
import GUI from 'lil-gui';
import vertexShader from './bg_vertex.glsl?raw';
import fragmentShader from './bg_fragment.glsl?raw';
import tileImage from './my_tile.png';

//
// Renderer
//
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//
// Scene & Camera
//
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

//
// Texture
//
const texture = new THREE.TextureLoader().load(tileImage);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;

//
// Uniforms
//
const uniforms = {
    tTile: { value: texture },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTileScale: { value: 20.0 },
    uThreshold: { value: 0.0 },
    uSharpness: { value: 0.03 },
    uNoiseScale: { value: .15 },
    uNoiseStrength: { value: 1.0 },   // Strong noise influence
    uTime: { value: 0.0 },
    uColorActive: { value: new THREE.Color(0x000000) },   // default black
    uColorInactive: { value: new THREE.Color(0x00ff00) }  // default green
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
// GUI Controls
//
const gui = new GUI();
gui.add(uniforms.uTileScale, 'value', 1.0, 20.0).name('Tile Scale');
gui.add(uniforms.uThreshold, 'value', 0.0, 1.0).name('Threshold');
gui.add(uniforms.uSharpness, 'value', 0.001, 0.2).name('Sharpness');
gui.add(uniforms.uNoiseScale, 'value', 0.1, 5.0).name('Noise Scale');
gui.add(uniforms.uNoiseStrength, 'value', 0.0, 2.0).name('Noise Strength');
gui.addColor({ color: `#${uniforms.uColorActive.value.getHexString()}` }, 'color')
    .name('Active Color')
    .onChange(c => uniforms.uColorActive.value.set(c));
gui.addColor({ color: `#${uniforms.uColorInactive.value.getHexString()}` }, 'color')
    .name('Inactive Color')
    .onChange(c => uniforms.uColorInactive.value.set(c));

//
// Resize
//
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
});

//
// Animate
//
function animate(t) {
    uniforms.uTime.value = t * 0.001;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
