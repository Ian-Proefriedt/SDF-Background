#ifdef GL_ES
precision highp float;
#endif

uniform vec2  uResolution;      // screen resolution
uniform vec2  uShapePos;        // shape position (normalized)
uniform float uShapeScale;      // overall scale of shape (half-size)
uniform float uCornerRatio;     // ratio of corner radius to shape size
uniform float uInteriorValue;   // brightness inside shape
uniform float uHaloRadius;      // how far halo extends outside edge
uniform float uHaloStrength;    // brightness of halo relative to interior

varying vec2 vUv;

// --- Rounded box Signed Distance Field ---
float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 d = abs(p) - halfSize + vec2(radius);
    return length(max(d, 0.0)) - radius;
}

void main() {
    // Aspect-correct UV and translate to shape position
    vec2 uv = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    vec2 pos = uv - uShapePos;

    // Shape size & corner radius linked to scale
    float shapeSize = uShapeScale;
    float cornerRadius = uShapeScale * uCornerRatio;

    // Signed distance (negative = inside, 0 = edge, positive = outside)
    float dist = sdRoundedBox(pos, vec2(shapeSize), cornerRadius);

    // Interior fill: inside = constant value
    float interior = step(dist, 0.0) * uInteriorValue;

    // Halo: smooth fade outside edge (only for dist > 0)
    float halo = smoothstep(uHaloRadius, 0.0, dist) * uHaloStrength;

    // Combine (max ensures interior dominates inside)
    float sdfValue = max(interior, halo);

    gl_FragColor = vec4(vec3(sdfValue), 1.0);
}
