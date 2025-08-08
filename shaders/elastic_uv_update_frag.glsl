precision highp float;

uniform sampler2D tDiffuse;
uniform sampler2D tVel;
uniform float dtRatio;
uniform float uStiffness;
uniform float uDamping;
uniform float uRelax;
uniform float uSnapThreshold;
uniform float uSnapStrength;

varying vec2 vUv;

float cubicIn(float t) { return t * t * t; }

void main(){
    vec2 vel = texture2D(tVel, vUv).rg;
    vec4 prev = texture2D(tDiffuse, vUv);
    vec2 prevUV = prev.rg;
    vec2 prevVel = prev.ba;

    vec2 disp = vUv - prevUV;
    vec2 dispNor = clamp(normalize(disp), vec2(-1.0), vec2(1.0));
    float len = length(disp);

    // integrate towards current UV (stiffness uniform)
    prevVel += dispNor * (len * uStiffness) * dtRatio;
    // no coupling from velocity to UV to keep effect strictly local

    // damping uniform
    prevVel *= exp2(log2(uDamping) * dtRatio);

    // advance UV by vel and relax slightly towards identity to smooth residuals
    prevUV += prevVel * dtRatio;
    // near rest: hard snap UV back to identity for exact SDF band
    float dispLen = length(disp);
    float velLen = length(prevVel);
    float nearRest = 1.0 - smoothstep(uSnapThreshold, uSnapThreshold * 4.0, max(dispLen, velLen));
    float snapAmt = clamp(uSnapStrength * nearRest, 0.0, 1.0);
    prevUV = mix(prevUV, vUv, snapAmt + clamp(uRelax, 0.0, 1.0) * dtRatio);

    gl_FragColor = vec4(prevUV, prevVel);
}


