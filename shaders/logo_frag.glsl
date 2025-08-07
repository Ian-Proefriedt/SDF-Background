precision highp float;

uniform vec2 uResolution;
uniform vec2 uShapePos;   // normalized [0,1]
uniform float uShapeScale;
uniform float uCornerRadius;

varying vec2 vUv;

float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return length(max(d, 0.0)) - r;
}

void main() {
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 uv = (vUv * 2.0 - 1.0);
    vec2 shapeCenter = uShapePos * 2.0 - 1.0;
    uv = ((uv - shapeCenter) / uShapeScale) * aspect;

    vec2 halfSize = vec2(0.5);
    float dist = roundedBoxSDF(uv, halfSize, uCornerRadius);
    float mask = step(-0.001, -dist);  // crisp hard edge

    gl_FragColor = vec4(vec3(mask), 1.0);
}