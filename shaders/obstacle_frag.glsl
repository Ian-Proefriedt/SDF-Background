precision highp float;

uniform sampler2D tInfluence;
uniform sampler2D tLogo;

varying vec2 vUv;

void main() {
    float influenceValue = texture2D(tInfluence, vUv).r;
    float logoMask = texture2D(tLogo, vUv).r;

    float result = influenceValue * (1.0 - logoMask);
    gl_FragColor = vec4(result, 0.0, 0.0, 1.0);
}