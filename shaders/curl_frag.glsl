precision mediump float;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

varying vec2 vUv;

void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
    float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}


