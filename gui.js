import GUI from 'lil-gui';

export function initGUI(uniforms) {
    const gui = new GUI();

    // --- Basic pattern controls ---
    gui.add(uniforms.uTileScale, 'value', 1.0, 20.0).name('Tile Scale');
    gui.add(uniforms.uThreshold, 'value', 0.0, 1.0).name('Threshold');
    gui.add(uniforms.uSharpness, 'value', 0.001, 0.2).name('Sharpness');

    // --- Colors ---
    gui.addColor(uniforms.uColorBase, 'value').name('Base Color');
    gui.addColor(uniforms.uColorAccent, 'value').name('Accent Color');

    return gui;
}
