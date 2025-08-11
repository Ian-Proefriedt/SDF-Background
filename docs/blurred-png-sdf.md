## Blurred PNG as SDF‑like Mask (Why the output looks crisp)

This project samples a blurred tile PNG as a continuous mask and then re‑thresholds it in the shader. The blur provides a smooth ramp near edges; the shader converts that ramp back into a near‑binary signal with controllable edge width, so the final image appears crisp while remaining smoothly animatable.

### Pipeline at a glance
- **Sample tile**: The red channel of `tTile` is sampled in tile UVs and inverted to form a mask where inside ≈ 1, outside ≈ 0.
- **Modulate threshold**: An animated noise field and GUI controls shift the effective threshold over time/space.
- **Curve + soft edge**: The threshold is remapped by a power curve and then applied via `smoothstep(adjustedT − uSharpness, adjustedT + uSharpness, mask)`.
- **Color mix**: Blend between `uColorInactive` and `uColorActive` using the activated mask.

Relevant shader lines:

```40:53:bg_fragment.glsl
float mask = 1.0 - texture2D(tTile, tileUV).r;   // 1 = inside shape

// animated per-tile noise
float n = noise(tiled * uNoiseScale + uTime * 0.1);
float localT = uThreshold + (n - 0.5) * uNoiseStrength;

// Apply threshold response mapping (curve strength only)
float adjustedT = tR_threshold(localT, uCurveStrength);

// Edge softness
float activated = smoothstep(adjustedT - uSharpness, adjustedT + uSharpness, mask);

vec3 color = mix(uColorInactive, uColorActive, activated);
gl_FragColor = vec4(color, 1.0);
```

### Why a blurred PNG yields a crisp render
- The blurred source is not displayed directly. It is treated as a continuous scalar field.
- The shader re‑binarizes that field via `smoothstep` with small `uSharpness`, producing hard‑looking edges.
- Because the input near boundaries is a smooth gradient, moving the threshold (plus noise) smoothly slides the isocontour, creating the organic “gooey” motion without visible blur in the interiors/exteriors.

### Controls that shape the effect
- **Threshold / Threshold Bias**: Grow/shrink shapes by moving the isocontour through the ramp.
- **Sharpness**: Width of the final transition band. Smaller → crisper edges.
- **Curve Strength**: Remaps threshold response; >1 holds off then snaps on.
- **Noise Scale / Noise Strength / Time Speed**: Organic spatial/temporal modulation of the threshold.
- **Nearest Filter (GUI)**: For testing; linear filtering preserves a smooth ramp for masking, nearest makes it jumpy.

### Verification checklist
- Swap between `Tiles/Tile_300_dm.png` (blurred) and a hard‑edged tile. Only the blurred version supports smooth growth/shrink with threshold.
- Reduce `uSharpness` and observe edges remain crisp even though the source is blurred.
- Toggle “Nearest Filter” and watch the edge become stair‑stepped; revert to linear for smooth isocontours.

### Practical notes
- **Color space**: Treat the tile as data, not color. Ensure no sRGB gamma decode is applied (linear sampling):
  - recent three.js (colorSpace API) → keep `texture.colorSpace = THREE.NoColorSpace` (default for data textures).
  - older versions (encoding API) → `texture.encoding = THREE.LinearEncoding`.
- **Mipmaps & filters**: Linear filtering is appropriate here; nearest is mainly for diagnostics.
- **Not a true SDF**: The blurred PNG is a monotonic proxy near edges, good for local animation. A true SDF would provide scale‑robust distances if you need sharper zoom invariance or precise morphological operations.

### If starting from a binary tile (automation path)
- You can replace manual blur/curves with an actual tiling SDF generated once (build‑time or on demand). Store the SDF as a grayscale ramp compatible with the current shader by normalizing a signed distance `d` (positive inside) by a chosen radius `r` in pixels:
  - `tex.r = clamp(0.5 - 0.5 * (d / r), 0.0, 1.0)`; the shader’s `1 - tex.r` keeps inside ≈ 1.
- Make the SDF tileable by computing distance on a 3×3 mosaic and cropping the center (toroidal distance).
- Pick `r` as a fraction of tile size (rule of thumb: 6–12% of the tile dimension). Use `uSharpness` to tune visual edge width at render time.
- See `docs/auto-sdf-options.md` for build‑time, worker/WASM, GPU JFA, and SVG‑based variants.


