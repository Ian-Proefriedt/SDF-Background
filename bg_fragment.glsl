precision highp float;

uniform sampler2D  tTile;         // pattern texture
uniform sampler2D  tMask;         // shape mask texture (SDF interior+halo)
uniform vec2       resolution;    // viewport resolution
uniform float      uTileScale;
uniform float      uThreshold;    // 0 → blank, 0.5 → pattern, 1 → blank
uniform float      uSharpness;    // edge softness
uniform float      uNoiseScale;
uniform float      uTime;
uniform float      uNoiseStrength;
uniform vec3       uColorActive;
uniform vec3       uColorInactive;

uniform int   uDebugMode;         // 0 = final, 1 = mask only

varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0,0.0));
    float c = hash(i + vec2(0.0,1.0));
    float d = hash(i + vec2(1.0,1.0));
    vec2  u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}

void main() {
    vec2 aspect = vec2(resolution.x / resolution.y, 1.0);
    vec2 uv     = (vUv - 0.5) * aspect + 0.5;

    // --- Shape mask (SDF interior=1, halo fade to 0) ---
    float maskTex = texture2D(tMask, vUv).r;

    // Debug view: show mask directly
    if (uDebugMode == 1) {
        gl_FragColor = vec4(vec3(maskTex), 1.0);
        return;
    }

    // --- Tile pattern sampling ---
    vec2 tiled  = uv * uTileScale;
    vec2 tileUV = fract(tiled);
    float mask = 1.0 - texture2D(tTile, tileUV).r;

    // --- Noise field ---
    // Influence reduces noise near shape (maskTex = 1 inside, 0 outside)
    float localNoiseStrength = mix(uNoiseStrength, 0.0, maskTex);
    float n = noise(tiled * uNoiseScale + uTime * 0.1);

    // Adjust threshold based on influenced noise
    float localT = uThreshold + (n - 0.5) * localNoiseStrength;

    // --- Pattern activation based on influenced threshold ---
    float activated = smoothstep(localT + uSharpness,
                                 localT - uSharpness,
                                 mask);

    // --- Final color (pattern only, no direct shape fill) ---
    vec3 patternColor = mix(uColorInactive, uColorActive, activated);
    gl_FragColor = vec4(patternColor, 1.0);
}
