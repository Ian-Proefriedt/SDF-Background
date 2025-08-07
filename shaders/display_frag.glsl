precision highp float;

uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform vec3 uBaseColor;
uniform float uShading; // 0..1 amount

varying vec2 vUv;

float luminance(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

void main(){
    vec3 c  = texture2D(uTexture, vUv).rgb;
    vec3 lc = texture2D(uTexture, vUv - vec2(uTexelSize.x, 0.0)).rgb;
    vec3 rc = texture2D(uTexture, vUv + vec2(uTexelSize.x, 0.0)).rgb;
    vec3 tc = texture2D(uTexture, vUv + vec2(0.0, uTexelSize.y)).rgb;
    vec3 bc = texture2D(uTexture, vUv - vec2(0.0, uTexelSize.y)).rgb;

    float dx = luminance(rc) - luminance(lc);
    float dy = luminance(tc) - luminance(bc);
    vec3 n = normalize(vec3(dx, dy, length(uTexelSize)));
    vec3 l = vec3(0.0, 0.0, 1.0);
    float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
    vec3 shaded = mix(c, c * diffuse, uShading);

    // Subtle procedural dithering to reduce banding
    float noise = fract(sin(dot(vUv * 1234.5, vec2(12.9898,78.233))) * 43758.5453);
    shaded += (noise - 0.5) / 255.0;

    gl_FragColor = vec4(max(shaded, uBaseColor), 1.0);
}


