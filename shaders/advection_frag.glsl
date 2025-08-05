precision highp float;

varying vec2 vUv;       // interpolated UV from vertex shader

uniform sampler2D uVelocity;  // velocity field texture
uniform sampler2D uSource;    // dye/color field texture
uniform float uDt;            // time step
uniform float uDissipation;   // how fast dye fades
uniform vec2 uTexelSize;      // size of one pixel (1/width, 1/height)

void main() {
    // --- Get velocity at current pixel ---
    vec2 velocity = texture2D(uVelocity, vUv).xy;

    // --- Backtrace position (semi-Lagrangian) ---
    vec2 coord = vUv - uDt * velocity * uTexelSize;

    // --- Sample color at backtraced position ---
    vec4 color = texture2D(uSource, coord);

    // --- Fade color slightly to simulate diffusion ---
    gl_FragColor = color * uDissipation;
}
