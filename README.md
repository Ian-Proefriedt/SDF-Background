## GPU Tiled Background Animation

Visual experiments using Three.js + GLSL to render a tiled SDF background with live controls via lil-gui.

### GUI Controls

- **Tile Scale**: Changes the size of the tile grid.
  - Larger values make tiles bigger (fewer repeats); smaller values increase repeats.

- **Threshold**: Sets the activation level of the pattern.
  - Higher values show less of the pattern; lower values show more.
  - Interactions: `Threshold Bias`, `Sharpness`, `Curve Strength`, `Noise Strength`

- **Sharpness**: Controls edge softness around transitions.
  - Smaller values give crisper edges; larger values soften edges.
  - Interactions: `Threshold`, `Curve Strength`

- **Noise Scale**: Sets the size of the animated noise.
  - Lower values create broad, slow variations; higher values create fine, busy detail.
  - Interactions: `Time Speed`, `Noise Strength`

- **Noise Strength**: Controls how strongly noise modulates the threshold.
  - Higher values add more variation and flicker.
  - Interactions: `Threshold`, `Curve Strength`

- **Curve Strength**: Remaps the threshold response.
  - Higher values hold off longer and then snap on; lower values make the transition more gradual.
  - Interactions: `Threshold`, `Threshold Bias`, `Sharpness`

#### Colors

- **Active Color / Inactive Color**: Picks the two colors blended by the effect.
- **Mask Invert**: Swaps Active and Inactive color roles to invert the pattern visually.

#### Tiles

- **Tile**: Chooses the tile image from top-level files in `Tiles/`.
- **Nearest Filter**: Toggles between crisp (nearest) and smooth (linear) sampling for the tile texture.
  - More visible on hard‑edged tiles and with larger Tile Scale.

#### Temp

- **Time Speed**: Speeds up or slows down the animation rate.
  - Interactions: `Noise Scale`, `Noise Strength`

- **Threshold Bias**: Shifts the threshold up or down before curve/softening.
  - Negative bias reveals more of the pattern; positive bias reveals less.
  - Interactions: `Threshold`, `Curve Strength`


