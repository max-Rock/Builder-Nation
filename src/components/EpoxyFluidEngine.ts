// ═══════════════════════════════════════════════════════════════════════
// EpoxyFluidEngine.ts — WebGL2 Navier-Stokes Fluid Simulation
// Simulates viscous epoxy resin mixing with GPU-accelerated physics
// ═══════════════════════════════════════════════════════════════════════

export interface FluidConfig {
  simResolution: number;
  dyeResolution: number;
  velocityDissipation: number;
  dyeDissipation: number;
  pressureIterations: number;
  curlStrength: number;
  splatRadius: number;
}

const DEFAULTS: FluidConfig = {
  simResolution: 256,
  dyeResolution: 1024,
  velocityDissipation: 0.97,   // thick fluid → velocity decays moderately
  dyeDissipation: 1.0,         // 1.0 = no fade, epoxy colors persist forever
  pressureIterations: 40,
  curlStrength: 12,
  splatRadius: 0.005,
};

// ─── GLSL Shader Sources ──────────────────────────────────────────────

const baseVS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPosition;
out vec2 vUv;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const clearFS = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 fragColor;
void main () {
  fragColor = uColor;
}`;

const splatFS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTarget;
uniform float uAspectRatio;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
out vec4 fragColor;
void main () {
  vec2 p = vUv - uPoint;
  p.x *= uAspectRatio;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}`;

const advectionFS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;
out vec4 fragColor;
void main () {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexelSize;
  vec4 result = uDissipation * texture(uSource, coord);
  fragColor = result;
}`;

const divergenceFS = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 fragColor;
void main () {
  float L = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
  float div = 0.5 * (R - L + T - B);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const pressureFS = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;
out vec4 fragColor;
void main () {
  float L = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float C = texture(uDivergence, vUv).x;
  float pressure = (L + R + B + T - C) * 0.25;
  fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

const gradientSubtractFS = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 fragColor;
void main () {
  float L = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

const curlFS = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 fragColor;
void main () {
  float L = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
  float R = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
  float vorticity = R - L - T + B;
  fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`;

const vorticityFS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float uDt;
uniform vec2 uTexelSize;
out vec4 fragColor;
void main () {
  float L = texture(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
  float T = texture(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
  float B = texture(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= uCurlStrength * C;
  force.y *= -1.0;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity += force * uDt;
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

const displayFS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTexture;
out vec4 fragColor;
void main () {
  vec3 c = texture(uTexture, vUv).rgb;
  // Clamp to valid range (fluid sim can exceed 0-1)
  c = clamp(c, 0.0, 1.0);
  fragColor = vec4(c, 1.0);
}`;

// ─── Helper Types ─────────────────────────────────────────────────────

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
}

interface DoubleFBO {
  width: number;
  height: number;
  read: FBO;
  write: FBO;
  swap: () => void;
}

interface ProgramInfo {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

// ─── Main Engine Class ────────────────────────────────────────────────

export class EpoxyFluidEngine {
  private gl: WebGL2RenderingContext;
  private config: FluidConfig;
  private quadVAO: WebGLVertexArrayObject;

  // Compiled shader programs
  private clearProg!: ProgramInfo;
  private splatProg!: ProgramInfo;
  private advectionProg!: ProgramInfo;
  private divergenceProg!: ProgramInfo;
  private pressureProg!: ProgramInfo;
  private gradSubProg!: ProgramInfo;
  private curlProg!: ProgramInfo;
  private vorticityProg!: ProgramInfo;
  private displayProg!: ProgramInfo;

  // Simulation framebuffers
  private velocity!: DoubleFBO;
  private dye!: DoubleFBO;
  private pressure!: DoubleFBO;
  private divergenceFBO!: FBO;
  private curlFBO!: FBO;

  private _paused = false;
  private _destroyed = false;

  constructor(canvas: HTMLCanvasElement, config?: Partial<FluidConfig>) {
    this.config = { ...DEFAULTS, ...config };

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    // Required extensions for float texture rendering
    gl.getExtension("EXT_color_buffer_float");
    gl.getExtension("OES_texture_float_linear");

    // Compile all programs
    const vs = this.compileShader(gl.VERTEX_SHADER, baseVS);
    this.clearProg = this.createProgram(vs, this.compileShader(gl.FRAGMENT_SHADER, clearFS), ["uColor"]);
    this.splatProg = this.createProgram(vs, this.compileShader(gl.FRAGMENT_SHADER, splatFS), ["uTarget", "uAspectRatio", "uColor", "uPoint", "uRadius"]);
    this.advectionProg = this.createProgram(vs, this.compileShader(gl.FRAGMENT_SHADER, advectionFS), ["uVelocity", "uSource", "uTexelSize", "uDt", "uDissipation"]);
    this.divergenceProg = this.createProgram(vs, this.compileShader(gl.FRAGMENT_SHADER, divergenceFS), ["uVelocity", "uTexelSize"]);
    this.pressureProg = this.createProgram(vs, this.compileShader(gl.FRAGMENT_SHADER, pressureFS), ["uPressure", "uDivergence", "uTexelSize"]);
    this.gradSubProg = this.createProgram(vs, this.compileShader(gl.FRAGMENT_SHADER, gradientSubtractFS), ["uPressure", "uVelocity", "uTexelSize"]);
    this.curlProg = this.createProgram(vs, this.compileShader(gl.FRAGMENT_SHADER, curlFS), ["uVelocity", "uTexelSize"]);
    this.vorticityProg = this.createProgram(vs, this.compileShader(gl.FRAGMENT_SHADER, vorticityFS), ["uVelocity", "uCurl", "uCurlStrength", "uDt", "uTexelSize"]);
    this.displayProg = this.createProgram(vs, this.compileShader(gl.FRAGMENT_SHADER, displayFS), ["uTexture"]);

    // Fullscreen quad VAO
    this.quadVAO = this.createQuad();

    // Allocate simulation textures
    this.initFramebuffers();
  }

  // ═══ PUBLIC API ═════════════════════════════════════════════════════

  /** Fill entire canvas with a solid base color (r, g, b in 0-1) */
  fillBase(r: number, g: number, b: number): void {
    // Fill both dye buffers with base color
    this.clearFBO(this.dye, r, g, b, 1);
    // Zero out velocity & pressure
    this.clearFBO(this.velocity, 0, 0, 0, 0);
    this.clearFBO(this.pressure, 0, 0, 0, 0);
    this.display();
  }

  /** Pour a drop of color at (x, y) in normalized coords [0-1] */
  pourColor(x: number, y: number, color: [number, number, number], radius?: number): void {
    const r = radius ?? this.config.splatRadius * 1.5;
    this.doSplat(this.dye, x, y, color[0], color[1], color[2], r);
    // Add slight outward velocity to simulate pouring spread
    const angle = Math.random() * Math.PI * 2;
    const force = 80;
    this.doSplat(this.velocity, x, y, Math.cos(angle) * force, Math.sin(angle) * force, 0, r * 0.6);
    this.display();
  }

  /** Apply mixing force at (x, y) with velocity (dx, dy) */
  mix(x: number, y: number, dx: number, dy: number, force?: number): void {
    const f = force ?? 6000;
    this.doSplat(this.velocity, x, y, dx * f, dy * f, 0, this.config.splatRadius * 0.8);
  }

  /** Advance the simulation by dt seconds */
  step(dt: number): void {
    if (this._paused || this._destroyed) return;

    const gl = this.gl;
    const cfg = this.config;
    const tx = 1.0 / cfg.simResolution;
    const ty = 1.0 / cfg.simResolution;

    // 1 ─── Curl
    gl.useProgram(this.curlProg.program);
    gl.uniform2f(this.curlProg.uniforms["uTexelSize"]!, tx, ty);
    gl.uniform1i(this.curlProg.uniforms["uVelocity"]!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    this.blit(this.curlFBO);

    // 2 ─── Vorticity confinement
    gl.useProgram(this.vorticityProg.program);
    gl.uniform2f(this.vorticityProg.uniforms["uTexelSize"]!, tx, ty);
    gl.uniform1f(this.vorticityProg.uniforms["uCurlStrength"]!, cfg.curlStrength);
    gl.uniform1f(this.vorticityProg.uniforms["uDt"]!, dt);
    gl.uniform1i(this.vorticityProg.uniforms["uVelocity"]!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.vorticityProg.uniforms["uCurl"]!, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.curlFBO.texture);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // 3 ─── Self-advect velocity
    gl.useProgram(this.advectionProg.program);
    gl.uniform2f(this.advectionProg.uniforms["uTexelSize"]!, tx, ty);
    gl.uniform1f(this.advectionProg.uniforms["uDt"]!, dt);
    gl.uniform1f(this.advectionProg.uniforms["uDissipation"]!, cfg.velocityDissipation);
    gl.uniform1i(this.advectionProg.uniforms["uVelocity"]!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.advectionProg.uniforms["uSource"]!, 0);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // 4 ─── Divergence
    gl.useProgram(this.divergenceProg.program);
    gl.uniform2f(this.divergenceProg.uniforms["uTexelSize"]!, tx, ty);
    gl.uniform1i(this.divergenceProg.uniforms["uVelocity"]!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    this.blit(this.divergenceFBO);

    // 5 ─── Clear pressure
    gl.useProgram(this.clearProg.program);
    gl.uniform4f(this.clearProg.uniforms["uColor"]!, 0, 0, 0, 1);
    this.blit(this.pressure.write);
    this.pressure.swap();

    // 6 ─── Pressure Jacobi iterations
    gl.useProgram(this.pressureProg.program);
    gl.uniform2f(this.pressureProg.uniforms["uTexelSize"]!, tx, ty);
    gl.uniform1i(this.pressureProg.uniforms["uDivergence"]!, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.divergenceFBO.texture);
    for (let i = 0; i < cfg.pressureIterations; i++) {
      gl.uniform1i(this.pressureProg.uniforms["uPressure"]!, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    // 7 ─── Gradient subtraction (enforce incompressibility)
    gl.useProgram(this.gradSubProg.program);
    gl.uniform2f(this.gradSubProg.uniforms["uTexelSize"]!, tx, ty);
    gl.uniform1i(this.gradSubProg.uniforms["uPressure"]!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
    gl.uniform1i(this.gradSubProg.uniforms["uVelocity"]!, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // 8 ─── Advect dye (at higher resolution)
    gl.useProgram(this.advectionProg.program);
    gl.uniform2f(this.advectionProg.uniforms["uTexelSize"]!, tx, ty);
    gl.uniform1f(this.advectionProg.uniforms["uDt"]!, dt);
    gl.uniform1f(this.advectionProg.uniforms["uDissipation"]!, cfg.dyeDissipation);
    gl.uniform1i(this.advectionProg.uniforms["uVelocity"]!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
    gl.uniform1i(this.advectionProg.uniforms["uSource"]!, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
    this.blit(this.dye.write);
    this.dye.swap();

    // 9 ─── Render to screen
    this.display();
  }

  pause(): void { this._paused = true; }
  resume(): void { this._paused = false; }
  get isPaused(): boolean { return this._paused; }

  /** Reset everything to black */
  clear(): void {
    this.clearFBO(this.dye, 0, 0, 0, 1);
    this.clearFBO(this.velocity, 0, 0, 0, 0);
    this.clearFBO(this.pressure, 0, 0, 0, 0);
    this.display();
  }

  /** Capture the current canvas as a PNG data URL */
  getSnapshot(): string {
    this.display();
    return (this.gl.canvas as HTMLCanvasElement).toDataURL("image/png");
  }

  /** Update canvas drawing buffer to match CSS size */
  resize(): void {
    const canvas = this.gl.canvas as HTMLCanvasElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  destroy(): void {
    this._destroyed = true;
    // WebGL resources are cleaned up when the context is lost/canvas is removed
  }

  // ═══ PRIVATE METHODS ═══════════════════════════════════════════════

  private display(): void {
    const gl = this.gl;
    gl.useProgram(this.displayProg.program);
    gl.uniform1i(this.displayProg.uniforms["uTexture"]!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
    this.blit(null);
  }

  private doSplat(target: DoubleFBO, x: number, y: number, cr: number, cg: number, cb: number, radius: number): void {
    const gl = this.gl;
    const aspect = (gl.canvas as HTMLCanvasElement).clientWidth / (gl.canvas as HTMLCanvasElement).clientHeight;

    gl.useProgram(this.splatProg.program);
    gl.uniform1i(this.splatProg.uniforms["uTarget"]!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, target.read.texture);
    gl.uniform1f(this.splatProg.uniforms["uAspectRatio"]!, aspect);
    gl.uniform2f(this.splatProg.uniforms["uPoint"]!, x, 1.0 - y);
    gl.uniform3f(this.splatProg.uniforms["uColor"]!, cr, cg, cb);
    gl.uniform1f(this.splatProg.uniforms["uRadius"]!, radius);
    this.blit(target.write);
    target.swap();
  }

  /** Clear both buffers of a DoubleFBO */
  private clearFBO(dfbo: DoubleFBO, r: number, g: number, b: number, a: number): void {
    const gl = this.gl;
    gl.useProgram(this.clearProg.program);
    gl.uniform4f(this.clearProg.uniforms["uColor"]!, r, g, b, a);
    this.blit(dfbo.write);
    dfbo.swap();
    gl.useProgram(this.clearProg.program);
    gl.uniform4f(this.clearProg.uniforms["uColor"]!, r, g, b, a);
    this.blit(dfbo.write);
    dfbo.swap();
  }

  /** Draw a fullscreen quad to the given target (null = screen) */
  private blit(target: FBO | null): void {
    const gl = this.gl;
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.width, target.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  // ─── Initialization Helpers ─────────────────────────────────────────

  private initFramebuffers(): void {
    const gl = this.gl;
    const sim = this.config.simResolution;
    const dye = this.config.dyeResolution;

    this.velocity = this.createDoubleFBO(sim, sim, gl.RG16F, gl.RG, gl.HALF_FLOAT, gl.LINEAR);
    this.dye = this.createDoubleFBO(dye, dye, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR);
    this.pressure = this.createDoubleFBO(sim, sim, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST);
    this.divergenceFBO = this.createFBO(sim, sim, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST);
    this.curlFBO = this.createFBO(sim, sim, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}\n${source}`);
    }
    return shader;
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader, uniformNames: string[]): ProgramInfo {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
    }
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
  }

  private createQuad(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create VAO");
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return vao;
  }

  private createFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): FBO {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture, fbo, width: w, height: h };
  }

  private createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): DoubleFBO {
    const fbo1 = this.createFBO(w, h, internalFormat, format, type, filter);
    const fbo2 = this.createFBO(w, h, internalFormat, format, type, filter);
    const result: DoubleFBO = {
      width: w,
      height: h,
      read: fbo1,
      write: fbo2,
      swap() {
        const tmp = result.read;
        result.read = result.write;
        result.write = tmp;
      },
    };
    return result;
  }
}
