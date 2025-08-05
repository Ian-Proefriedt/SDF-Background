attribute vec2 aPosition;   // input positions of quad (clip-space)
varying vec2 vUv;           // pass UV to fragment

void main() {
    // Convert from clip-space (-1 to 1) to 0-1 UV
    vUv = (aPosition + 1.0) * 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
