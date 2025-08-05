precision highp float;

uniform sampler2D tSource;
uniform float decay; // e.g. 0.98

varying vec2 vUv;

void main() {
    float influence = texture2D(tSource, vUv).r;
    gl_FragColor = vec4(influence * decay, 0.0, 0.0, 1.0);
}
