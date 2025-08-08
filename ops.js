import * as THREE from 'three';
import fullscreenVert from './shaders/vert.glsl?raw';

export function createInfluenceOp(fullscreenTriangle, influenceFrag) {
    const uniforms = {
        tTarget: { value: null },
        point: { value: new THREE.Vector2(0.5, 0.5) },
        radius: { value: 0.05 },
        strength: { value: 1.0 }
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: fullscreenVert,
        fragmentShader: influenceFrag,
        blending: THREE.NoBlending,
        depthTest: false,
        depthWrite: false,
        transparent: false
    });

    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(fullscreenTriangle, material));

    function addInfluence(renderer, camera, influence, point, radius = 0.05, strength = 1.0) {
        uniforms.tTarget.value = influence.read.texture;
        uniforms.point.value.copy(point);
        uniforms.radius.value = radius;
        uniforms.strength.value = strength;

        renderer.setRenderTarget(influence.write);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        influence.swap();
    }

    return addInfluence;
}

export function createFadeOp(fullscreenTriangle, fadeFrag) {
    const uniforms = {
        tSource: { value: null },
        decay: { value: 0.98 }
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: fullscreenVert,
        fragmentShader: fadeFrag
    });

    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(fullscreenTriangle, material));

    function fadeInfluence(renderer, camera, influence) {
        uniforms.tSource.value = influence.read.texture;
        renderer.setRenderTarget(influence.write);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        influence.swap();
    }

    return fadeInfluence;
}

export function createLogoOp(fullscreenTriangle, logoFrag) {
    const uniforms = {
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uShapePos: { value: new THREE.Vector2(0.5, 0.5) },
        uShapeScale: { value: 0.25 },
        uCornerRadius: { value: 0.2 }
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: fullscreenVert,
        fragmentShader: logoFrag,
        transparent: true
    });

    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(fullscreenTriangle, material));

    function renderLogo(renderer, camera, logoTarget) {
        renderer.setRenderTarget(logoTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
    }

    return { renderLogo, uniforms };
}

export function createObstacleOp(fullscreenTriangle, obstacleFrag) {
    const uniforms = {
        tInfluence: { value: null },
        tLogo: { value: null }
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: fullscreenVert,
        fragmentShader: obstacleFrag
    });

    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(fullscreenTriangle, material));

    function applyObstacle(renderer, camera, influence, logo) {
        uniforms.tInfluence.value = influence.read.texture;
        uniforms.tLogo.value = logo.texture;

        renderer.setRenderTarget(influence.write);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        influence.swap();
    }

    return applyObstacle;
}

// Fluid-sim-like background pass chain (ambient only)
export function createAmbientFluidPasses(fullscreenTriangle, shaders, options = {}) {
    const { advectionFrag, divergenceFrag, curlFrag, vorticityFrag, pressureFrag, gradientSubtractFrag, displayFrag } = shaders;
    const manualFiltering = !!options.manualFiltering;

    // Materials
    const advectionMat = new THREE.ShaderMaterial({
        uniforms: {
            uVelocity: { value: null },
            uSource: { value: null },
            uTexelSize: { value: new THREE.Vector2(1,1) },
            uDyeTexelSize: { value: new THREE.Vector2(1,1) },
            uDt: { value: 0.016 },
            uDissipation: { value: 0.98 }
        },
        vertexShader: fullscreenVert,
        fragmentShader: advectionFrag,
        defines: manualFiltering ? { MANUAL_FILTERING: 1 } : {}
    });

    const divergenceMat = new THREE.ShaderMaterial({
        uniforms: {
            uVelocity: { value: null },
            uTexelSize: { value: new THREE.Vector2(1,1) }
        },
        vertexShader: fullscreenVert,
        fragmentShader: divergenceFrag
    });

    const curlMat = new THREE.ShaderMaterial({
        uniforms: {
            uVelocity: { value: null },
            uTexelSize: { value: new THREE.Vector2(1,1) }
        },
        vertexShader: fullscreenVert,
        fragmentShader: curlFrag
    });

    const vorticityMat = new THREE.ShaderMaterial({
        uniforms: {
            uVelocity: { value: null },
            uCurl: { value: null },
            uTexelSize: { value: new THREE.Vector2(1,1) },
            uCurlStrength: { value: 0.001 },
            uDt: { value: 0.016 }
        },
        vertexShader: fullscreenVert,
        fragmentShader: vorticityFrag
    });

    const pressureMat = new THREE.ShaderMaterial({
        uniforms: {
            uPressure: { value: null },
            uDivergence: { value: null },
            uTexelSize: { value: new THREE.Vector2(1,1) }
        },
        vertexShader: fullscreenVert,
        fragmentShader: pressureFrag
    });

    const gradientSubtractMat = new THREE.ShaderMaterial({
        uniforms: {
            uPressure: { value: null },
            uVelocity: { value: null },
            uTexelSize: { value: new THREE.Vector2(1,1) }
        },
        vertexShader: fullscreenVert,
        fragmentShader: gradientSubtractFrag
    });

    const displayMat = new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { value: null },
            uTexelSize: { value: new THREE.Vector2(1,1) },
            uBaseColor: { value: new THREE.Color(0x000000) },
            uShading: { value: 1.0 }
        },
        vertexShader: fullscreenVert,
        fragmentShader: displayFrag,
        transparent: true
    });

    const makeScene = (material) => {
        const s = new THREE.Scene();
        const m = new THREE.Mesh(fullscreenTriangle, material);
        s.add(m);
        return s;
    };

    const scenes = {
        advection: makeScene(advectionMat),
        divergence: makeScene(divergenceMat),
        curl: makeScene(curlMat),
        vorticity: makeScene(vorticityMat),
        pressure: makeScene(pressureMat),
        gradientSubtract: makeScene(gradientSubtractMat),
        display: makeScene(displayMat)
    };

    return { materials: { advectionMat, divergenceMat, curlMat, vorticityMat, pressureMat, gradientSubtractMat, displayMat }, scenes };
}

export function createSplatOp(fullscreenTriangle, splatFrag) {
    const uniforms = {
        tTarget: { value: null },
        point: { value: new THREE.Vector2(0.5, 0.5) },
        color: { value: new THREE.Vector3(0, 0, 0) },
        radius: { value: 0.02 }
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: fullscreenVert,
        fragmentShader: splatFrag,
        blending: THREE.NoBlending,
        depthTest: false,
        depthWrite: false,
        transparent: false
    });

    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(fullscreenTriangle, material));

    function splat(renderer, camera, targetDoubleFBO, point, radius, colorVec3) {
        uniforms.tTarget.value = targetDoubleFBO.read.texture;
        uniforms.point.value.copy(point);
        uniforms.radius.value = radius;
        uniforms.color.value.set(colorVec3.x, colorVec3.y, colorVec3.z);

        renderer.setRenderTarget(targetDoubleFBO.write);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        targetDoubleFBO.swap();
    }

    return splat;
}

// Elastic UV feedback passes (Yuga-style)
// Maintains a 4-channel texture where RG stores previous UV and BA stores previous velocity.
// Two passes are used:
// - init: writes initial UV = vUv and velocity = 0
// - update: integrates towards current vUv with damping and adds small velocity from the fluid field
export function createElasticUVPasses(fullscreenTriangle) {
    const initMaterial = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: fullscreenVert,
        fragmentShader: `
precision highp float;
varying vec2 vUv;
void main(){
    gl_FragColor = vec4(vUv, 0.0, 0.0);
}
        `,
        depthTest: false,
        depthWrite: false,
        transparent: false
    });

    const updateUniforms = {
        tDiffuse: { value: null }, // previous elastic UV buffer
        tVel: { value: null },     // velocity field (RG)
        dtRatio: { value: 1.0 }
    };

    const updateMaterial = new THREE.ShaderMaterial({
        uniforms: updateUniforms,
        vertexShader: fullscreenVert,
        fragmentShader: `
precision highp float;
uniform sampler2D tDiffuse;
uniform sampler2D tVel;
uniform float dtRatio;
varying vec2 vUv;

// Mirrors the logic in Yuga's elastic pass
float cubicIn(float t) { return t * t * t; }

void main(){
    vec2 vel = texture2D(tVel, vUv).rg;
    vec4 prev = texture2D(tDiffuse, vUv);
    vec2 prevUV = prev.rg;
    vec2 prevVel = prev.ba;

    vec2 disp = vUv - prevUV;
    vec2 dispNor = clamp(normalize(disp), vec2(-1.0), vec2(1.0));
    float len = length(disp);

    // integrate towards current UV
    prevVel += dispNor * (len * 0.03) * dtRatio;
    // add small contribution from fluid velocity (scaled as in Yuga)
    prevVel += vel * -0.00002 * dtRatio;

    // damping
    prevVel *= exp2(log2(0.925) * dtRatio);

    // advance UV by vel
    prevUV += prevVel * dtRatio;

    gl_FragColor = vec4(prevUV, prevVel);
}
        `,
        depthTest: false,
        depthWrite: false,
        transparent: false
    });

    const initScene = new THREE.Scene();
    initScene.add(new THREE.Mesh(fullscreenTriangle, initMaterial));

    const updateScene = new THREE.Scene();
    updateScene.add(new THREE.Mesh(fullscreenTriangle, updateMaterial));

    function initElasticUV(renderer, camera, uvDoubleFBO) {
        // write initial UV once (twice to ensure both ping and pong have valid data)
        renderer.setRenderTarget(uvDoubleFBO.write);
        renderer.render(initScene, camera);
        renderer.setRenderTarget(null);
        uvDoubleFBO.swap();

        renderer.setRenderTarget(uvDoubleFBO.write);
        renderer.render(initScene, camera);
        renderer.setRenderTarget(null);
        uvDoubleFBO.swap();
    }

    function updateElasticUV(renderer, camera, uvDoubleFBO, velocityTexture, dtRatio) {
        updateUniforms.tDiffuse.value = uvDoubleFBO.read.texture;
        updateUniforms.tVel.value = velocityTexture;
        updateUniforms.dtRatio.value = dtRatio;

        renderer.setRenderTarget(uvDoubleFBO.write);
        renderer.render(updateScene, camera);
        renderer.setRenderTarget(null);
        uvDoubleFBO.swap();
    }

    return { initElasticUV, updateElasticUV };
}