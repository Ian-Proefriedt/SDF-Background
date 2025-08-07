precision highp float;

uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexelSize;
uniform float uCurlStrength;
uniform float uDt;

varying vec2 vUv;

void main() {
    float L = texture2D(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
    float T = texture2D(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
    float B = texture2D(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
    float C = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= uCurlStrength * C;
    force.y *= -1.0;

    vec2 vel = texture2D(uVelocity, vUv).xy;
    vel += force * uDt;
    gl_FragColor = vec4(vel, 0.0, 1.0);
}


