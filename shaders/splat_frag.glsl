precision highp float;

uniform sampler2D tTarget;
uniform vec2 point;
uniform vec3 color;
uniform float radius;

varying vec2 vUv;

void main() {
    vec3 base = texture2D(tTarget, vUv).rgb;
    float d = distance(vUv, point);
    float influence = exp(-d * d / radius);
    gl_FragColor = vec4(base + color * influence, 1.0);
}
