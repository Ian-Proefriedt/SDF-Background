import GUI from 'lil-gui';

export function initGUI(uniforms) {
    const gui = new GUI();

    // --- Basic pattern controls ---
    if (uniforms.uTileScale) gui.add(uniforms.uTileScale, 'value', 1.0, 20.0).name('Tile Scale');
    if (uniforms.uThreshold) gui.add(uniforms.uThreshold, 'value', 0.0, 1.0).name('Threshold');
    if (uniforms.uSharpness) gui.add(uniforms.uSharpness, 'value', 0.001, 0.2).name('Sharpness');

    // --- Colors ---
    gui.addColor(uniforms.uColorBase, 'value').name('Base Color');
    gui.addColor(uniforms.uColorAccent, 'value').name('Accent Color');

    // --- Noise controls ---
    const noiseFolder = gui.addFolder('Noise');
    noiseFolder.add(uniforms.uNoise, 'value', { Mode0: 0, Mode1: 1, Mode2: 2, Mode3: 3 }).name('Mode');
    noiseFolder.add(uniforms.uNoiseMultiplier, 'value', 0.0, 1.0, 0.001).name('Strength');
    noiseFolder.add(uniforms.uNoiseFlowStrength, 'value', 0.0, 0.05, 0.0005).name('Flow Warp');
    noiseFolder.add(uniforms.uNoise1Opts.value, 'x', 0.1, 10.0, 0.01).name('N1 Scale');
    noiseFolder.add(uniforms.uNoise1Opts.value, 'y', 0.0, 5.0, 0.001).name('N1 Speed');
    noiseFolder.add(uniforms.uNoise2Opts.value, 'x', 0.1, 10.0, 0.01).name('N2 Scale');
    noiseFolder.add(uniforms.uNoise2Opts.value, 'y', 0.0, 5.0, 0.001).name('N2 Speed');
    // N3 controls: x=scaleX, y=speed, z=angle
    noiseFolder.add(uniforms.uNoise3Opts.value, 'x', 0.1, 10.0, 0.01).name('N3 ScaleX');
    noiseFolder.add(uniforms.uNoise3Opts.value, 'y', 0.0, 5.0, 0.001).name('N3 Speed');
    noiseFolder.add(uniforms.uNoise3Opts.value, 'z', -3.14159, 3.14159, 0.001).name('N3 Angle');
    if (uniforms.uNoise3Strength) noiseFolder.add(uniforms.uNoise3Strength, 'value', 0.0, 2.0, 0.001).name('N3 Strength');
    noiseFolder.add(uniforms.uNoise4Opts.value, 'x', -5.0, 5.0, 0.001).name('N4 vx');
    noiseFolder.add(uniforms.uNoise4Opts.value, 'y', -5.0, 5.0, 0.001).name('N4 vy');
    noiseFolder.add(uniforms.uNoise4Opts.value, 'z', -5.0, 5.0, 0.001).name('N4 ux');
    noiseFolder.add(uniforms.uNoise4Opts.value, 'w', -5.0, 5.0, 0.001).name('N4 uy');
    noiseFolder.open();

    // Dye influence (opening contribution from dye)
    if (uniforms.uDyeInfluence) gui.add(uniforms.uDyeInfluence, 'value', 0.0, 1.5, 0.01).name('Dye Influence');

    // --- Global controls (match Yuga shader params) ---
    if (uniforms.uGlobalShape) gui.add(uniforms.uGlobalShape, 'value', 0.0, 2.0, 0.001).name('Global Shape');
    if (uniforms.uGlobalOpen) gui.add(uniforms.uGlobalOpen, 'value', -1.0, 1.0, 0.001).name('Global Open');

    return gui;
}
