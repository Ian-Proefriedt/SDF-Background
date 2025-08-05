import * as THREE from 'three';
import { createDoubleFBO } from './fluid_core.js';

export function initFluidBuffers() {
    const w = 256;
    const h = 256;

    // Use HalfFloat if available, fallback to UnsignedByte
    let type = THREE.HalfFloatType;
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl.getExtension('OES_texture_half_float')) {
        console.warn('Half-float not supported, falling back to UnsignedByteType');
        type = THREE.UnsignedByteType;
    }

    const velocity = createDoubleFBO(w, h, { type });
    const dye = createDoubleFBO(w, h, { type });

    return { velocity, dye };
}
