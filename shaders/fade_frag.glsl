precision highp float;

uniform sampler2D tSource;
uniform float decay;

varying vec2 vUv;

void main() {
    float val = texture2D(tSource, vUv).r;
    val *= decay;
    gl_FragColor = vec4(val, 0.0, 0.0, 1.0);
}