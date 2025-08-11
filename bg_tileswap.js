import * as THREE from 'three';

// Initialize tile image hotswap via lil-gui.
// - Discovers top-level PNGs in `Tiles/` (excludes subfolders)
// - Preloads textures eagerly
// - Adds a dropdown to swap `uniforms.tTile`
// - defaultTileName is optional; falls back to first discovered
export function initTileHotswap({ gui, uniforms, defaultTileName }) {
  const modules = import.meta.glob('./Tiles/*.png', { as: 'url', eager: true });

  const nameToUrl = {};
  for (const path in modules) {
    const url = modules[path];
    const name = path.split('/').pop();
    if (name) nameToUrl[name] = url;
  }

  const names = Object.keys(nameToUrl).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (names.length === 0) return; // nothing to do

  const loader = new THREE.TextureLoader();
  const nameToTexture = {};

  for (const name of names) {
    const tex = loader.load(nameToUrl[name]);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    nameToTexture[name] = tex;
  }

  let selected = defaultTileName && nameToTexture[defaultTileName]
    ? defaultTileName
    : names[0];

  uniforms.tTile.value = nameToTexture[selected];

  const state = { tile: selected, nearestFilter: false };

  const applyFiltering = () => {
    const minF = state.nearestFilter ? THREE.NearestFilter : THREE.LinearFilter;
    const magF = state.nearestFilter ? THREE.NearestFilter : THREE.LinearFilter;
    for (const tex of Object.values(nameToTexture)) {
      tex.minFilter = minF;
      tex.magFilter = magF;
      tex.needsUpdate = true;
    }
  };

  // Ensure initial filter state is applied
  applyFiltering();

  gui
    .add(state, 'tile', names)
    .name('Tile')
    .onChange((name) => {
      uniforms.tTile.value = nameToTexture[name];
    });

  gui
    .add(state, 'nearestFilter')
    .name('Nearest Filter')
    .onChange(() => applyFiltering());
}


