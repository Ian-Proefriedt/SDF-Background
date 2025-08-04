precision highp float;

uniform vec2 uResolution;    // viewport resolution (not used yet, but good for scaling)
uniform vec2 uRectSize;      // half-size of the rectangle in normalized coordinates
uniform float uCornerRadius; // radius for rounded corners
uniform float uValue;        // intensity, unused in debug mode

varying vec2 vUv;

// Signed distance for rounded rectangle
float roundedRectSDF(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + vec2(r);
    return length(max(d, 0.0)) - r;
}

void main() {
    // convert to centered space [-0.5, 0.5]
    vec2 centered = vUv - 0.5;

    // signed distance (negative inside)
    float dist = roundedRectSDF(centered, uRectSize, uCornerRadius);

    // hard edge mask
    float inside = step(dist, 0.0);

    // DEBUG: show mask directly (white = inside)
    gl_FragColor = vec4(vec3(inside), 1.0);
}