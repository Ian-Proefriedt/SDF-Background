precision highp float;

uniform sampler2D tTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform vec2 prevPoint;
uniform float radius;
uniform bool isDye;

varying vec2 vUv;

float lineDist(vec2 uv, vec2 p1, vec2 p2) {
    vec2 pa = uv - p1;
    vec2 ba = p2 - p1;
    pa.x *= aspectRatio;
    ba.x *= aspectRatio;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float cubicIn(float t) { return t * t * t; }

void main() {
    vec3 base = texture2D(tTarget, vUv).xyz;
    float d = lineDist(vUv, prevPoint, point);
    vec3 splat = cubicIn(clamp(1.0 - d / radius, 0.0, 1.0)) * color;
    vec3 result = base + splat;
    if (isDye) result = clamp(result, vec3(0.0), vec3(1.0));
    gl_FragColor = vec4(result, 1.0);
}
