/**
 * Creates a Framebuffer Object (FBO) with an attached texture.
 * 
 * FBO = an off-screen rendering surface. 
 * We use it to store simulation data (like velocity or dye) instead of drawing directly to the screen.
 */
export function createFBO(gl, w, h, internalFormat, format, type, param) {
    // === 1) CREATE TEXTURE ===
    const tex = gl.createTexture();            // make an empty texture on the GPU
    gl.bindTexture(gl.TEXTURE_2D, tex);        // bind it so we can configure it
    
    // texture sampling and wrapping behavior
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);  // e.g., linear filtering
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // no repeat horizontally
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // no repeat vertically

    // allocate texture memory (but don’t fill it yet)
    // internalFormat = GPU storage format (like RGBA16F)
    // format         = how we provide data (like RGBA)
    // type           = pixel type (like float or half float)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    // === 2) CREATE FRAMEBUFFER ===
    const fbo = gl.createFramebuffer();       // an off-screen "canvas"
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);  // bind it so we can attach stuff
    gl.framebufferTexture2D(                 // attach our texture to the framebuffer
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT0, 
        gl.TEXTURE_2D, 
        tex, 
        0
    );

    // === 3) RETURN EASY-TO-USE OBJECT ===
    return {
        texture: tex,                         // actual GPU texture handle
        fbo,                                  // framebuffer handle
        width: w,                             // width of texture
        height: h,                            // height of texture

        // helper: quickly bind texture to a uniform
        attach: id => {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            return id;                        // return texture unit index
        }
    };
}

/**
 * Double FBO = two Framebuffer Objects we can swap.
 * 
 * Why?  
 * - When simulating (like fluid or displacement), you need to read from one texture (previous state)
 *   while writing into another (next state).  
 * - After writing, you swap them.  
 * - This avoids overwriting data you're still reading.
 * 
 * Returns: An object with `read`, `write`, and `swap()` for easy usage.
 */
export function createDoubleFBO(gl, w, h, internalFormat, format, type, param) {
    // Create first FBO
    let fbo1 = createFBO(gl, w, h, internalFormat, format, type, param);

    // Create second FBO (same size & format)
    let fbo2 = createFBO(gl, w, h, internalFormat, format, type, param);

    return {
        width: w,
        height: h,
        texelSizeX: 1.0 / w,   // handy for shaders: how big one pixel is
        texelSizeY: 1.0 / h,

        // Read target: the one you sample from in shaders
        get read() { return fbo1; },
        set read(value) { fbo1 = value; },

        // Write target: the one you render into
        get write() { return fbo2; },
        set write(value) { fbo2 = value; },

        // Swap read & write after each simulation step
        swap() {
            const temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        }
    };
}