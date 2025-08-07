precision highp float;

uniform sampler2D tTile;
uniform sampler2D tInfluence;
uniform sampler2D tDye;
uniform vec2 resolution;
uniform float uTileScale;
uniform float uThreshold;
uniform float uSharpness;
uniform vec3 uColorBase;
uniform vec3 uColorAccent;

varying vec2 vUv;

void main() {
    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);
    vec2 uv = (vUv - 0.5) * aspect + 0.5;

    vec2 tiled  = uv * uTileScale;
    vec2 tileUV = fract(tiled);
    float mask  = 1.0 - texture2D(tTile, tileUV).r;

    float influence = texture2D(tInfluence, vUv).r;
    // Use dye luminance to add ambient motion to threshold
    vec3 dye = texture2D(tDye, vUv).rgb;
    float dyeLum = dot(dye, vec3(0.299, 0.587, 0.114));
    influence += dyeLum * 0.15;
    float localThreshold = clamp(uThreshold + influence, 0.0, 1.0);

    float activated = smoothstep(localThreshold + uSharpness,
                                 localThreshold - uSharpness,
                                 mask);

    vec3 patternColor = mix(uColorBase, uColorAccent, activated);
    gl_FragColor = vec4(patternColor, 1.0);
}
