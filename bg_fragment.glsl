precision highp float;

uniform sampler2D  tTile;         // pattern texture
uniform sampler2D  tMask;         // circle mask texture
uniform vec2       resolution;    // viewport resolution
uniform float      uTileScale;
uniform float      uThreshold;    // 0 → blank, 0.5 → pattern, 1 → blank
uniform float      uSharpness;    // edge softness
uniform float      uNoiseScale;
uniform float      uTime;
uniform float      uNoiseStrength;
uniform vec3       uColorActive;
uniform vec3       uColorInactive;

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

    vec2 tiled  = uv * uTileScale;
    vec2 tileUV = fract(tiled);

    float mask = 1.0 - texture2D(tTile, tileUV).r;

    float n = noise(tiled * uNoiseScale + uTime * 0.1);
    float localT = uThreshold + (n - 0.5) * uNoiseStrength;

    float activated = smoothstep(localT + uSharpness,
                                 localT - uSharpness,
                                 mask);

    // --- Mask sampling (no inversion now) ---
    float maskTex = texture2D(tMask, vUv).r;

// Hard edge: if maskTex > 0.5, block the pattern completely
if (maskTex > 0.5) {
    gl_FragColor = vec4(uColorInactive, 1.0);  // flat white
    return;
}

vec3 color = mix(uColorInactive, uColorActive, activated);
gl_FragColor = vec4(color, 1.0);
}