// WebGL Fluid Simulation Engine for Epoxy Floor Visualizer
// Implements an Eulerian fluid simulation based on Navier-Stokes equations

export class EpoxyFluidEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null;
  private ext: any;

  private active: boolean = false;
  private width: number = 0;
  private height: number = 0;

  // Fluid config
  private config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 0.0, // Epoxy doesn't fade
    VELOCITY_DISSIPATION: 0.98,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 0,
    SPLAT_RADIUS: 0.1,
    SPLAT_FORCE: 6000,
  };

  private programs: any = {};
  private fbos: any = {
    velocity: null,
    density: null,
    divergence: null,
    pressure: null,
  };

  private blitQuad: WebGLBuffer | null = null;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const { gl, ext } = this.initWebGL();
    this.gl = gl;
    this.ext = ext;

    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    this.initShaders();
    this.initFramebuffers();
    this.initQuad();
  }

  private initWebGL() {
    let gl: any = this.canvas.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: true });
    let isWebGL2 = !!gl;
    if (!gl) {
      gl = this.canvas.getContext('webgl', { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: true }) || 
           this.canvas.getContext('experimental-webgl', { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: true });
    }

    let ext = {
      formatRGBA: null as any,
      formatRG: null as any,
      formatR: null as any,
      halfFloatTexType: null as any,
      supportLinearFiltering: null as any
    };

    if (gl) {
      if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float');
        ext.supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
      } else {
        ext.halfFloatTexType = gl.getExtension('OES_texture_half_float');
        ext.supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        gl.getExtension('OES_texture_float');
        gl.getExtension('OES_texture_float_linear');
      }

      const halfFloat = isWebGL2 ? gl.HALF_FLOAT : ext.halfFloatTexType?.HALF_FLOAT_OES || gl.FLOAT;
      
      ext.formatRGBA = { internalFormat: isWebGL2 ? gl.RGBA16F : gl.RGBA, format: gl.RGBA, type: halfFloat };
      ext.formatRG = { internalFormat: isWebGL2 ? gl.RG16F : gl.RGBA, format: isWebGL2 ? gl.RG : gl.RGBA, type: halfFloat };
      ext.formatR = { internalFormat: isWebGL2 ? gl.R16F : gl.RGBA, format: isWebGL2 ? gl.RED : gl.RGBA, type: halfFloat };
    }
    return { gl, ext };
  }

  public isSupported(): boolean {
    return this.gl !== null;
  }

  public start() {
    if (!this.gl || this.active) return;
    this.active = true;
    this.lastTime = Date.now();
    this.loop();
  }

  public stop() {
    this.active = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.initFramebuffers();
    }
  }

  private initQuad() {
    const gl = this.gl!;
    this.blitQuad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.blitQuad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  }

  private createProgram(vertexSource: string, fragmentSource: string) {
    const gl = this.gl!;
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader!);
    gl.attachShader(program, fragmentShader!);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return null;
    }

    return {
      program,
      uniforms: this.getUniforms(program)
    };
  }

  private getUniforms(program: WebGLProgram) {
    const gl = this.gl!;
    const uniforms: any = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformName = gl.getActiveUniform(program, i)!.name;
      uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
  }

  private createShader(type: number, source: string) {
    const gl = this.gl!;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  private initShaders() {
    const baseVertexShader = `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const clearShader = `
      precision mediump float;
      varying vec2 vUv;
      uniform float value;
      void main () {
        gl_FragColor = vec4(value);
      }
    `;

    const displayShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
        vec3 C = texture2D(uTexture, vUv).rgb;
        gl_FragColor = vec4(C, 1.0);
      }
    `;

    const splatShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `;

    const splatColorShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        float alpha = exp(-dot(p, p) / radius);
        vec3 base = texture2D(uTarget, vUv).xyz;
        vec3 outColor = mix(base, color, alpha);
        gl_FragColor = vec4(outColor, 1.0);
      }
    `;
    
    const fillShader = `
      precision highp float;
      uniform vec3 color;
      void main () {
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const advectionShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = dissipation * texture2D(uSource, coord);
      }
    `;

    const divergenceShader = `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) L = -C.x;
        if (vR.x > 1.0) R = -C.x;
        if (vT.y > 1.0) T = -C.y;
        if (vB.y < 0.0) B = -C.y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `;

    const pressureShader = `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `;

    const gradientSubtractShader = `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `;

    this.programs = {
      clear: this.createProgram(baseVertexShader, clearShader),
      display: this.createProgram(baseVertexShader, displayShader),
      splat: this.createProgram(baseVertexShader, splatShader),
      splatColor: this.createProgram(baseVertexShader, splatColorShader),
      fill: this.createProgram(baseVertexShader, fillShader),
      advection: this.createProgram(baseVertexShader, advectionShader),
      divergence: this.createProgram(baseVertexShader, divergenceShader),
      pressure: this.createProgram(baseVertexShader, pressureShader),
      gradienSubtract: this.createProgram(baseVertexShader, gradientSubtractShader)
    };
  }

  private initFramebuffers() {
    let simRes = this.getResolution(this.config.SIM_RESOLUTION);
    let dyeRes = this.getResolution(this.config.DYE_RESOLUTION);

    const texType = this.ext.formatRGBA.type;
    const supportLinearFiltering = this.ext.supportLinearFiltering;

    this.fbos.velocity = this.createDoubleFBO(simRes.width, simRes.height, this.ext.formatRGBA.internalFormat, this.ext.formatRGBA.format, texType, supportLinearFiltering ? this.gl!.LINEAR : this.gl!.NEAREST);
    this.fbos.density = this.createDoubleFBO(dyeRes.width, dyeRes.height, this.ext.formatRGBA.internalFormat, this.ext.formatRGBA.format, texType, supportLinearFiltering ? this.gl!.LINEAR : this.gl!.NEAREST);
    this.fbos.divergence = this.createFBO(simRes.width, simRes.height, this.ext.formatR.internalFormat, this.ext.formatR.format, texType, this.gl!.NEAREST);
    this.fbos.pressure = this.createDoubleFBO(simRes.width, simRes.height, this.ext.formatR.internalFormat, this.ext.formatR.format, texType, this.gl!.NEAREST);
  }

  private getResolution(resolution: number) {
    let aspectRatio = this.gl!.drawingBufferWidth / this.gl!.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

    let min = Math.round(resolution);
    let max = Math.round(resolution * aspectRatio);

    if (this.gl!.drawingBufferWidth > this.gl!.drawingBufferHeight) {
      return { width: max, height: min };
    } else {
      return { width: min, height: max };
    }
  }

  private createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
    const gl = this.gl!;
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      attach: (id: number) => {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      }
    };
  }

  private createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);

    return {
      width: w,
      height: h,
      texelSizeX: 1.0 / w,
      texelSizeY: 1.0 / h,
      get read() { return fbo1; },
      set read(value) { fbo1 = value; },
      get write() { return fbo2; },
      set write(value) { fbo2 = value; },
      swap() {
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      }
    };
  }

  private blit(target: any) {
    const gl = this.gl!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.blitQuad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private lastTime: number = 0;

  private loop = () => {
    if (!this.active) return;

    let dt = Math.min((Date.now() - this.lastTime) / 1000, 0.016);
    this.lastTime = Date.now();

    this.step(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private step(dt: number) {
    const gl = this.gl!;

    // Advection for Velocity
    gl.useProgram(this.programs.advection.program);
    gl.uniform2f(this.programs.advection.uniforms.texelSize, this.fbos.velocity.texelSizeX, this.fbos.velocity.texelSizeY);
    gl.uniform1i(this.programs.advection.uniforms.uVelocity, this.fbos.velocity.read.attach(0));
    gl.uniform1i(this.programs.advection.uniforms.uSource, this.fbos.velocity.read.attach(1));
    gl.uniform1f(this.programs.advection.uniforms.dt, dt);
    gl.uniform1f(this.programs.advection.uniforms.dissipation, this.config.VELOCITY_DISSIPATION);
    this.blit(this.fbos.velocity.write);
    this.fbos.velocity.swap();

    // Advection for Density (Dye)
    gl.uniform1i(this.programs.advection.uniforms.uVelocity, this.fbos.velocity.read.attach(0));
    gl.uniform1i(this.programs.advection.uniforms.uSource, this.fbos.density.read.attach(1));
    gl.uniform1f(this.programs.advection.uniforms.dissipation, 1.0 - this.config.DENSITY_DISSIPATION);
    this.blit(this.fbos.density.write);
    this.fbos.density.swap();

    // Divergence
    gl.useProgram(this.programs.divergence.program);
    gl.uniform2f(this.programs.divergence.uniforms.texelSize, this.fbos.velocity.texelSizeX, this.fbos.velocity.texelSizeY);
    gl.uniform1i(this.programs.divergence.uniforms.uVelocity, this.fbos.velocity.read.attach(0));
    this.blit(this.fbos.divergence);

    // Clear Pressure
    gl.useProgram(this.programs.clear.program);
    gl.uniform1i(this.programs.clear.uniforms.uTexture, this.fbos.pressure.read.attach(0));
    gl.uniform1f(this.programs.clear.uniforms.value, this.config.PRESSURE);
    this.blit(this.fbos.pressure.write);
    this.fbos.pressure.swap();

    // Pressure Solver (Jacobi)
    gl.useProgram(this.programs.pressure.program);
    gl.uniform2f(this.programs.pressure.uniforms.texelSize, this.fbos.velocity.texelSizeX, this.fbos.velocity.texelSizeY);
    gl.uniform1i(this.programs.pressure.uniforms.uDivergence, this.fbos.divergence.attach(0));
    for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(this.programs.pressure.uniforms.uPressure, this.fbos.pressure.read.attach(1));
      this.blit(this.fbos.pressure.write);
      this.fbos.pressure.swap();
    }

    // Gradient Subtract
    gl.useProgram(this.programs.gradienSubtract.program);
    gl.uniform2f(this.programs.gradienSubtract.uniforms.texelSize, this.fbos.velocity.texelSizeX, this.fbos.velocity.texelSizeY);
    gl.uniform1i(this.programs.gradienSubtract.uniforms.uPressure, this.fbos.pressure.read.attach(0));
    gl.uniform1i(this.programs.gradienSubtract.uniforms.uVelocity, this.fbos.velocity.read.attach(1));
    this.blit(this.fbos.velocity.write);
    this.fbos.velocity.swap();
  }

  private render() {
    const gl = this.gl!;
    gl.useProgram(this.programs.display.program);
    gl.uniform1i(this.programs.display.uniforms.uTexture, this.fbos.density.read.attach(0));
    this.blit(null);
  }

  // --- Public API for User Interaction ---

  public hexToRgb(hex: string): {r: number, g: number, b: number} {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return { r, g, b };
  }

  public fillBase(hexColor: string) {
    if (!this.gl) return;
    const { r, g, b } = this.hexToRgb(hexColor);
    const gl = this.gl;
    
    gl.useProgram(this.programs.fill.program);
    gl.uniform3f(this.programs.fill.uniforms.color, r, g, b);
    this.blit(this.fbos.density.write);
    this.fbos.density.swap();
  }

  public clear() {
    if (!this.gl) return;
    const gl = this.gl;
    
    gl.useProgram(this.programs.clear.program);
    gl.uniform1f(this.programs.clear.uniforms.value, 0);
    
    this.blit(this.fbos.density.write);
    this.fbos.density.swap();
    this.blit(this.fbos.velocity.write);
    this.fbos.velocity.swap();
    this.blit(this.fbos.pressure.write);
    this.fbos.pressure.swap();
  }

  public splatPointer(x: number, y: number, dx: number, dy: number, hexColor: string | null) {
    if (!this.gl) return;
    const gl = this.gl;

    const tx = x / this.width;
    const ty = 1.0 - y / this.height;

    // Splat Velocity
    gl.useProgram(this.programs.splat.program);
    gl.uniform1i(this.programs.splat.uniforms.uTarget, this.fbos.velocity.read.attach(0));
    gl.uniform1f(this.programs.splat.uniforms.aspectRatio, this.width / this.height);
    gl.uniform2f(this.programs.splat.uniforms.point, tx, ty);
    gl.uniform3f(this.programs.splat.uniforms.color, dx, -dy, 0.0);
    gl.uniform1f(this.programs.splat.uniforms.radius, this.config.SPLAT_RADIUS / 100.0);
    this.blit(this.fbos.velocity.write);
    this.fbos.velocity.swap();

    // Splat Dye
    if (hexColor) {
      const { r, g, b } = this.hexToRgb(hexColor);
      gl.useProgram(this.programs.splatColor.program);
      gl.uniform1i(this.programs.splatColor.uniforms.uTarget, this.fbos.density.read.attach(0));
      gl.uniform1f(this.programs.splatColor.uniforms.aspectRatio, this.width / this.height);
      gl.uniform2f(this.programs.splatColor.uniforms.point, tx, ty);
      gl.uniform3f(this.programs.splatColor.uniforms.color, r, g, b);
      gl.uniform1f(this.programs.splatColor.uniforms.radius, this.config.SPLAT_RADIUS / 100.0);
      this.blit(this.fbos.density.write);
      this.fbos.density.swap();
    }
  }

  // Set the fluid to be more viscous for epoxy
  public setEpoxyMode() {
    this.config.VELOCITY_DISSIPATION = 0.99; // Retains velocity slightly longer for swirls
    this.config.DENSITY_DISSIPATION = 0.0;   // Colors never fade
    this.config.SPLAT_RADIUS = 0.15;         // Thicker strokes
    this.config.PRESSURE_ITERATIONS = 30;    // More stable flow
  }
}
