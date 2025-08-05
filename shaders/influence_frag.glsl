precision highp float;

uniform sampler2D tTarget; // current influence texture
uniform vec2 point;        // normalized click position (0–1)
uniform float radius;      // influence radius
uniform float strength;    // influence strength

varying vec2 vUv;

void main() {
    vec4 base = texture2D(tTarget, vUv);
    float d = distance(vUv, point);
    float splat = exp(-d * d / radius);
    gl_FragColor = vec4(base.r + splat * strength, 0.0, 0.0, 1.0);
}
