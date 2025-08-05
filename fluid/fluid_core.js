import * as THREE from 'three';

export function createRenderTarget(w, h, options = {}) {
    const target = new THREE.WebGLRenderTarget(w, h, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: options.type || THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false
    });
    return target;
}

export function createDoubleFBO(w, h, options = {}) {
    const fbo1 = createRenderTarget(w, h, options);
    const fbo2 = createRenderTarget(w, h, options);

    return {
        width: w,
        height: h,
        texelSizeX: 1.0 / w,
        texelSizeY: 1.0 / h,
        read: fbo1,
        write: fbo2,
        swap() {
            const temp = this.read;
            this.read = this.write;
            this.write = temp;
        }
    };
}
