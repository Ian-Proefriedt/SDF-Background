precision highp float;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform vec2 uDyeTexelSize;
uniform float uDt;
uniform float uDissipation;

vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main() {
#ifdef MANUAL_FILTERING
    vec2 coord = vUv - uDt * bilerp(uVelocity, vUv, uTexelSize).xy * uTexelSize;
    vec4 result = bilerp(uSource, coord, uDyeTexelSize);
#else
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
    vec4 result = texture2D(uSource, coord);
#endif
    float decay = 1.0 + uDissipation * uDt;
    gl_FragColor = result / decay;
}
