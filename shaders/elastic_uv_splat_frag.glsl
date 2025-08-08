precision highp float;

uniform sampler2D tUV;
uniform float aspectRatio;
uniform vec2 point;
uniform vec2 prevPoint;
uniform float radius;
uniform float strength;

varying vec2 vUv;

float lineDist(vec2 uv, vec2 p1, vec2 p2) {
    vec2 pa = uv - p1;
    vec2 ba = p2 - p1;
    // aspect correction
    pa.x *= aspectRatio;
    ba.x *= aspectRatio;
    float baLen2 = dot(ba, ba);
    if (baLen2 < 1e-8) {
        // treat as point splat
        return length(pa);
    }
    float h = clamp(dot(pa, ba) / baLen2, 0.0, 1.0);
    return length(pa - ba * h);
}

float cubicIn(float t) { return t * t * t; }

void main() {
    vec4 base = texture2D(tUV, vUv);
    vec2 uv0 = base.rg;

    // Radial push away from cursor (repulsion), aspect-corrected
    vec2 toCursor = vUv - point;
    vec2 toCursorAC = vec2(toCursor.x * aspectRatio, toCursor.y);
    float d = length(toCursorAC);
    vec2 dirAC = d > 1e-6 ? (toCursorAC / d) : vec2(0.0);
    // convert back to UV space
    vec2 dirUv = vec2(dirAC.x / aspectRatio, dirAC.y);

    float w = cubicIn(clamp(1.0 - d / radius, 0.0, 1.0));
    // Add inner dead-zone to avoid attraction exactly under the cursor
    float innerR = radius * 0.35;
    float inner = smoothstep(innerR, innerR * 1.6, d);
    w *= inner;

    vec2 displaced = uv0 + dirUv * (strength * w);
    displaced = clamp(displaced, vec2(0.0), vec2(1.0));
    gl_FragColor = vec4(displaced, base.ba);
}


