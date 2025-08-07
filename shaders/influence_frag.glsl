precision highp float;

uniform sampler2D tTarget;
uniform vec2 point;
uniform float radius;
uniform float strength;

varying vec2 vUv;

void main() {
    float d = distance(vUv, point);
    float influence = smoothstep(radius, 0.0, d) * strength;

    float existing = texture2D(tTarget, vUv).r;
    float result = existing + influence;

    gl_FragColor = vec4(result, 0.0, 0.0, 1.0);
}