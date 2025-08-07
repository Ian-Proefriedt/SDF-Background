precision mediump float;

uniform sampler2D uTexture;
uniform float uValue;

varying vec2 vUv;

void main() {
    vec4 src = texture2D(uTexture, vUv);
    gl_FragColor = src * uValue;
}


