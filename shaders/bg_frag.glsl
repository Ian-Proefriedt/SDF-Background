precision highp float;

#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

uniform sampler2D tTile;
uniform sampler2D tDye;
uniform sampler2D uVel;
uniform sampler2D tScene;      // composer scene texture (reserved)
uniform sampler2D uUV;         // elastic UV field (reserved)
uniform vec2 resolution;
uniform float uTime;
uniform vec3 uColorBase;
uniform vec3 uColorAccent;
uniform float uTileScale;     // GUI: overall tile frequency
uniform float uThreshold;     // GUI: opening/bias control
uniform float uSharpness;     // GUI: edge softness
uniform float uNoise3Strength; // GUI: strength for N3 branch only
uniform float uDyeInfluence;   // GUI: how much dye affects opening

uniform int uNoise;
uniform float uNoiseMultiplier;
uniform float uNoiseFlowStrength;   // flow-based domain warp for noise
uniform vec2  uNoise1Opts;
uniform vec2  uNoise2Opts;
uniform vec3  uNoise3Opts;
uniform vec4  uNoise4Opts;
uniform float uGlobalShape;
uniform float uGlobalOpen;

varying vec2 vUv;

// Utility functions ported from Yuga shader
vec2 rotateUV(vec2 uv, float rotation, vec2 mid) {
    return vec2(
        cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,
        cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y
    );
}

vec2 scaleUV(vec2 uv, float scale, vec2 mid) {
    uv -= mid;
    uv *= 1.0 / scale;
    uv += mid;
    return uv;
}

float quadraticOut(float t) { return -t * (t - 2.0); }

float ft(float x, float a1, float a2, float b1, float b2) {
    return b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);
}

float fc(float x, float a1, float a2, float b1, float b2) {
    return clamp(ft(x, a1, a2, b1, b2), min(b1, b2), max(b1, b2));
}

float stp(float a, float b, float t) {
    return clamp((t - a) / (b - a), 0.0, 1.0);
}

float fl(float a, float b, float c, float f, float e) {
    float p = mix(b - f, c, e);
    return stp(p + f, p, a);
}

vec3 hash3(vec3 p3) {
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy + p3.yxx)*p3.zyx) - 0.5;
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}

float noise3(in vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;

    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - 1.0 * K2);
    vec3 d2 = d0 - (i2 - 2.0 * K2);
    vec3 d3 = d0 - (1.0 - 3.0 * K2);
    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(dot(d0, hash3(i)), dot(d1, hash3(i + i1)), dot(d2, hash3(i + i2)), dot(d3, hash3(i + 1.0)));
    return dot(n, vec4(52.0));
}

float cellNoise(in vec2 uv, in float aspect) {
    uv -= 0.5;
    uv.x *= aspect;
    uv += 0.5;
    uv *= uNoise2Opts.x;

    vec2 i_st = floor(uv);
    vec2 f_st = fract(uv);

    float m_dist = 1.;

    for (int y= -1; y <= 1; y++) {
        for (int x= -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x),float(y));
            vec2 point = hash22(i_st + neighbor);
            point = 0.5 + 0.5*sin(uTime * uNoise2Opts.y + 6.2831*point);
            vec2 diff = neighbor + point - f_st;
            float dist = length(diff);
            m_dist = min(m_dist, dist);
        }
    }

    return m_dist;
}

float linearNoise(in vec2 uv, in float aspect) {
    uv -= 0.5;
    uv.x *= aspect;
    uv += 0.5;
    uv = rotateUV(uv, uNoise3Opts.z, vec2(0.5));
    uv *= uNoise3Opts.x;
    return (sin(uv.x + uTime * uNoise3Opts.y) + 1.0) * 0.5;
}

float linearNoise2(in vec2 uv, in float aspect) {
    uv = rotateUV(uv, uNoise4Opts.z, vec2(0.5));
    vec2 multX = rotateUV(vec2(aspect + uNoise4Opts.w * aspect, 1.0), uNoise4Opts.z, vec2(0.0));
    uv -= 0.5;
    uv *= multX;
    float len = (sin(length(uv) * uNoise4Opts.x + uTime * uNoise4Opts.y) + 1.0) * 0.5;
    return len;
}

void main() {
    float ww = fwidth(vUv.y);
    float aspect = resolution.x / resolution.y;

    vec2 bgUV = texture2D(uUV, vUv).rg;

    // optionally sample velocity for subtle flow; set to zero for pure elastic return
    vec2 vel = vec2(0.0);
    float dye = fc(quadraticOut(texture2D(tDye, bgUV).r), 0.05, 1.0, 0.0, 1.0);

    float n1 = 0.0;
    if (uNoise == 0) {
        n1 = fc(noise3(vec3(bgUV * uNoise1Opts.x + 24.143, uTime * uNoise1Opts.y + 65.343)), -0.2, 0.7, 0.0, 0.6);
    } else if (uNoise == 1) {
        n1 = fc(cellNoise(vUv, aspect), 0.4, 0.8, 0.0, 0.6);
    } else if (uNoise == 2) {
        n1 = fc(linearNoise(vUv, aspect), 0.0, 1.0, 0.0, 0.4) * uNoise3Strength;
    } else {
        n1 = fc(linearNoise2(vUv, aspect), 0.0, 1.0, 0.0, 0.4);
    }
    n1 *= uNoiseMultiplier;

    // Background sampling
    vec2 uv = bgUV;
    uv -= 0.5; uv.x *= aspect; uv += 0.5;
    // Map GUI tile scale (default 20.0) to Yuga-style screen-dependent scale
    float baseScale = resolution.y * 0.00003 + ww * 20.0;
    float guiScale = max(0.0001, baseScale * (uTileScale / 20.0));
    uv = scaleUV(uv, guiScale, vec2(0.5));

    float dist = 1.0 - texture2D(tTile, uv).r;

    // Threshold/open bias from GUI
    float diff = 0.075 + (uThreshold - 0.5) * 0.35; // slightly reduce global opening
    diff += n1;
    diff += uGlobalOpen;
    diff += dye * uDyeInfluence;
    diff *= uGlobalShape;

    // Anti-aliasing: derive smoothing from SDF gradients and GUI sharpness
    float sdfFwidth = fwidth(dist);
    float border = max(ww + 0.0175, uSharpness) + sdfFwidth * 0.5;
    float shape = fl(dist, 0.0, 1.0, border, fc(diff, 0.0, 1.0, 0.0, 1.0));

    // No logo: base and front colors only
    vec3 bg = uColorBase;
    vec3 colorFront = uColorAccent;
    bg = mix(bg, colorFront, shape);

    gl_FragColor = vec4(bg, 1.0);
}
