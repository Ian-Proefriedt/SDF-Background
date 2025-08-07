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
        fragmentShader: displayFrag
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
