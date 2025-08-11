## Auto-generating the SDF-like mask from a binary tile (options)

Goal: Start with a binary, tileable image (or SVG) and automatically produce the continuous ramp the shader expects, eliminating manual blur/curve work while keeping the same “gooey but crisp” behavior.

### Current runtime expectation
- The shader samples a grayscale tile where inside ≈ black (0), outside ≈ white (1), then does:
  - `mask = 1 - tex.r`  → inside ≈ 1, outside ≈ 0
  - noise + threshold shaping → `smoothstep` for crisp output

To auto‑generate the ramp, compute a signed distance field (SDF) once per tile, then store it as a normalized grayscale ramp consistent with the above convention:

Let `d` be signed distance in pixels (positive inside, negative outside), and choose a normalization radius `r` (in pixels). Store the texture channel as:

```
tex.r = clamp(0.5 - 0.5 * (d / r), 0.0, 1.0)
```

This yields `tex.r ≈ 0` deep inside, `tex.r ≈ 1` far outside; the shader’s `1 - tex.r` keeps inside ≈ 1.

---

### Option A — Build-time SDF (recommended default)
Quality: High  | Perf: Free at runtime  | Complexity: Low‑moderate

Pipeline:
1) Take a binary, tileable PNG (e.g., `Tiles/Binary/Tile_300_Binary.png`). Ensure it tiles seamlessly.
2) Compute a toroidal signed distance transform (wrap at borders so the SDF also tiles seamlessly). A practical trick: replicate the tile to a 3×3 mosaic, compute SDF, then crop the center tile.
3) Normalize by radius `r` and write grayscale to a new PNG (e.g., `Tiles/Tile_300_sdf.png`).
4) Use that file at runtime (exactly as the blurred tile is used today).

Notes:
- Algorithms: 2-pass Euclidean Distance Transform (Felzenszwalb/Huttenlocher), Danielsson, or Meijster. Any EDT that gives exact Euclidean distance works well.
- Tooling: Node script with `pngjs`/`sharp` for I/O; EDT in JS/WASM; or CLI tools (e.g., msdfgen can produce SDFs from vector paths; for bitmap→SDF, use an EDT lib).
- The choice of `r` replaces “blur amount” and is directly visible/controllable; shader `uSharpness` still controls final edge width.

Pseudo (build step):

```text
readBinaryMask()               // 0 outside, 1 inside
tile3x3 = repeat(mask, 3, 3)   // enforce wrap distance
insideDist  = EDT(tile3x3 == 1)
outsideDist = EDT(tile3x3 == 0)
signed = insideDist - outsideDist
crop = signed.centerTile()
texR = clamp(0.5 - 0.5 * (crop / r), 0, 1)
savePNG(texR)
```

---

### Option B — Client runtime (on demand, once per tile)
Quality: High  | Perf: Small one‑time cost  | Complexity: Moderate

When the app starts or when the user swaps tiles:
1) Send the binary tile to a Web Worker (optionally via `OffscreenCanvas`).
2) Compute toroidal SDF (same 3×3 trick) using a JS/WASM EDT.
3) Normalize by `r`, build `ImageData`, and upload the texture; reuse thereafter.

Estimates (typical, modern laptop/desktop): 512×512 tile → a few ms with WASM EDT; tens of ms with plain JS. Hides well behind a loading spinner.

Pros: Automatic, no build step; works for user-provided tiles. Cons: Adds worker+WASM plumbing; small first‑use latency.

---

### Option C — Pure GPU runtime via Jump Flooding (WebGL2)
Quality: High (approximate)  | Perf: Excellent on GPU  | Complexity: High

Use a ping‑pong FBO pipeline to implement Jump Flooding Algorithm (JFA):
1) Seed texture encodes nearest “feature” positions (inside and outside). 
2) Log2(N) passes propagate nearest seeds with halving jump lengths.
3) Final pass computes distances, signs them via inside/outside mask, then normalizes to `tex.r`.

Pros: Super fast and scalable, all‑GPU. Cons: Several shader passes and FBO setup; trickier correctness around sign and wrap; more code to maintain.

---

### Option D — SVG as input
Two uses:
1) Offline: Vector → SDF via msdfgen (SDF or MSDF). Store result as grayscale (SDF) for our thresholding shader. Highest precision, authoring‑friendly.
2) Runtime (advanced): Evaluate distance to vector paths in a shader (segments, arcs, Beziers) in tile‑space. Produces analytic SDF without rasterization. Great quality but substantial shader complexity; best if tiles are parametric and simple.

When to prefer MSDF? If you need very sharp rendering across extreme zoom levels or colored edges. For threshold‑based “inside/outside” masks, plain SDF is sufficient and simpler.

---

### Histogram “feel” vs manual blur
Manual blur+curves tuned by histogram can be replicated by choosing `r` and the shader’s `uCurveStrength`/`uSharpness`:
- `r` ≈ blur radius surrogate (choose per tile size, e.g., `r ≈ 0.06–0.12 × tileSize`).
- `uCurveStrength` shapes activation response (hold/snap).
- `uSharpness` sets the final visual edge width.

If you want a build tool to “auto‑pick” `r`, compute edge pixels, analyze their distance histogram, and select `r` at a percentile (e.g., 95th) to match a target ramp width.

---

### Recommendation
- Default: Build‑time SDF (Option A). It’s robust, fast at runtime, and removes manual image authoring. Keep the same shader and controls.
- If tiles are user‑supplied at runtime: add a Worker‑based EDT (Option B) so each tile self‑converts once when loaded.
- Explore JFA (Option C) only if you want a purely GPU pipeline or frequent on‑the‑fly regeneration.
- Prefer SVG only if your source of truth is already vector and you want maximum fidelity (Option D → offline).


