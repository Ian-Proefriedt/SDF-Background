import * as THREE from 'three';

function detectWebGLSupport() {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
        return { version: 2, gl: gl2 };
    }
    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return { version: gl1 ? 1 : 0, gl: gl1 };
}

export function getRecommendedTextureOptions() {
    const { version, gl } = detectWebGLSupport();
    let supportLinearFiltering = true;
    if (version === 2) {
        // WebGL2 linear filtering for float types varies; check common extensions
        const hasFloatLinear = gl.getExtension('OES_texture_float_linear');
        const hasHalfFloatLinear = gl.getExtension('OES_texture_half_float_linear');
        supportLinearFiltering = !!(hasFloatLinear || hasHalfFloatLinear);
        return {
            type: THREE.HalfFloatType,
            minFilter: supportLinearFiltering ? THREE.LinearFilter : THREE.NearestFilter,
            magFilter: supportLinearFiltering ? THREE.LinearFilter : THREE.NearestFilter,
            supportLinearFiltering
        };
    }

    // WebGL1: be conservative and use UnsignedByte to ensure renderable FBOs everywhere
    const hasHalfFloat = gl && gl.getExtension('OES_texture_half_float');
    const hasHalfFloatLinear = gl && gl.getExtension('OES_texture_half_float_linear');
    supportLinearFiltering = !!hasHalfFloatLinear;
    return {
        type: hasHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
        minFilter: supportLinearFiltering ? THREE.LinearFilter : THREE.NearestFilter,
        magFilter: supportLinearFiltering ? THREE.LinearFilter : THREE.NearestFilter,
        supportLinearFiltering
    };
}

export function createRenderTarget(width, height, opts = {}) {
    const options = {
        minFilter: opts.minFilter ?? THREE.LinearFilter,
        magFilter: opts.magFilter ?? THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: opts.type ?? THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping
    };
    return new THREE.WebGLRenderTarget(width, height, options);
}

export function createDoubleFBO(width, height, opts = {}) {
    const read = createRenderTarget(width, height, opts);
    const write = createRenderTarget(width, height, opts);

    return {
        read,
        write,
        swap() {
            const temp = this.read;
            this.read = this.write;
            this.write = temp;
        },
        resize(w, h) {
            this.read.setSize(w, h);
            this.write.setSize(w, h);
        }
    };
}

export function createInfluenceBuffer(width, height, opts = {}) {
    return createDoubleFBO(width, height, opts);
}

export function createLogoBuffer(width, height, opts = {}) {
    return createRenderTarget(width, height, opts);
}

export function getResolution(baseResolution, drawWidth, drawHeight) {
    let aspectRatio = drawWidth / drawHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;
    const min = Math.round(baseResolution);
    const max = Math.round(baseResolution * aspectRatio);
    if (drawWidth > drawHeight) return { width: max, height: min };
    return { width: min, height: max };
}
