/**
 * WebGL 2 rendering pipeline para o CapyEdit.
 *
 * Estratégia:
 *  1. Cria um WebGL2RenderingContext offscreen (OffscreenCanvas quando disponível,
 *     ou <canvas> fora do DOM).
 *  2. Faz upload da imagem como textura.
 *  3. Aplica todos os ajustes em um único fragment shader (1 draw call).
 *  4. Lê os pixels de volta como ImageData para compatibilidade com o pipeline atual.
 *
 * Ajustes implementados no shader:
 *  exposure · contrast · highlights · shadows · whites · blacks
 *  temperature · tint · vibrance · saturation · clarity · dehaze
 *  vignette · grain · curves (master) · HSL por banda (8 bandas)
 *
 * Otimizações v2:
 *  - uniform locations cacheadas uma única vez na inicialização
 *  - flip vertical feito apenas no shader (v_uv.y invertido); loop CPU removido
 *  - viewport só reconfigurado quando as dimensões de fato mudam
 */

import type { EditState } from '../../types/editor';

// ─── Vertex shader (full-screen quad) ──────────────────────────────────────
const VERT_SRC = /* glsl */`#version 300 es
precision highp float;
in vec2 a_pos;
out vec2 v_uv;
void main() {
  // v_uv já vai de 0→1 sem inversão; a inversão Y é feita no frag shader
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// ─── Fragment shader ────────────────────────────────────────────────────────
const FRAG_SRC = /* glsl */`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_image;

// Luz
uniform float u_exposure;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_whites;
uniform float u_blacks;

// Cor
uniform float u_temperature;
uniform float u_tint;
uniform float u_vibrance;
uniform float u_saturation;

// Detalhe / Efeitos
uniform float u_clarity;
uniform float u_dehaze;
uniform float u_vignette;
uniform float u_grain;

// Curves master (shadows / midtones / highlights offset)
uniform float u_curveShadows;
uniform float u_curveMidtones;
uniform float u_curveHighlights;

// HSL — 8 bandas × 3 valores (hue, sat, lum)
uniform vec3 u_hsl[8];

// Resolução para grain
uniform vec2 u_resolution;

// ─── Utilitários ─────────────────────────────────────────────────────────

float clamp01(float v) { return clamp(v, 0.0, 1.0); }

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 rgb2hsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float delta = maxC - minC;
  float l = (maxC + minC) * 0.5;
  float s = 0.0;
  float h = 0.0;
  if (delta > 0.0001) {
    s = delta / (1.0 - abs(2.0 * l - 1.0));
    if (maxC == c.r)      h = mod((c.g - c.b) / delta, 6.0);
    else if (maxC == c.g) h = (c.b - c.r) / delta + 2.0;
    else                  h = (c.r - c.g) / delta + 4.0;
    h = h / 6.0;
    if (h < 0.0) h += 1.0;
  }
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}
vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  if (s < 0.0001) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(
    hue2rgb(p, q, h + 1.0/3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0/3.0)
  );
}

float stableNoise(vec2 co) {
  return fract(sin(dot(co, vec2(127.1, 311.7))) * 43758.5453);
}

float applyCurveChannel(float v, float shadows, float midtones, float highlights) {
  float shadowW    = clamp01(1.0 - v * 2.0);
  float highlightW = clamp01((v - 0.5) * 2.0);
  float midW       = 1.0 - abs(v - 0.5) * 2.0;
  float o = v;
  o += shadows    * shadowW    * 0.28;
  o += highlights * highlightW * 0.28;
  if (abs(midtones) > 0.001) {
    float gamma = pow(1.85, -midtones);
    o = mix(o, pow(clamp01(o), gamma), midW);
  }
  return clamp01(o);
}

float bandWeight(float h, float center, float halfWidth) {
  float d = abs(mod(h - center + 0.5, 1.0) - 0.5);
  return clamp01(1.0 - d / halfWidth);
}

const float BAND_HUE[8] = float[8](
  0.0, 0.0556, 0.1111, 0.2778, 0.5, 0.6111, 0.7778, 0.9167
);
const float BAND_HALF = 0.0833;

// ─── MAIN ────────────────────────────────────────────────────────────────
void main() {
  // Inverte Y aqui — elimina o flip por CPU no readPixels
  vec4 src = texture(u_image, vec2(v_uv.x, 1.0 - v_uv.y));
  vec3 c = clamp(src.rgb, 0.0, 1.0);

  c *= pow(2.0, u_exposure);

  float contrastF = 1.0 + u_contrast / 100.0;
  c = (c - 0.5) * contrastF + 0.5;
  c = clamp(c, 0.0, 1.0);

  float lum = luminance(c);
  float hlW = clamp01((lum - 0.45) / 0.55);
  float shW = clamp01((0.55 - lum) / 0.55);
  float wW  = clamp01((lum - 0.72) / 0.28);
  float bkW = clamp01((0.28 - lum) / 0.28);

  float hlF = u_highlights / 100.0;
  float shF = u_shadows    / 100.0;
  float wF  = u_whites     / 100.0;
  float bkF = u_blacks     / 100.0;

  float toneOffset = hlF*hlW*0.50 + shF*shW*0.45 + wF*wW*0.35 + bkF*bkW*0.30;
  c = clamp(c + toneOffset, 0.0, 1.0);

  c.r = clamp01(c.r + u_temperature / 100.0 * 0.15);
  c.b = clamp01(c.b - u_temperature / 100.0 * 0.15);
  c.g = clamp01(c.g + u_tint        / 100.0 * 0.10);

  float lumS = luminance(c);
  c = mix(vec3(lumS), c, 1.0 + u_saturation / 100.0);
  c = clamp(c, 0.0, 1.0);

  vec3 hslV = rgb2hsl(c);
  float vibF = u_vibrance / 100.0;
  hslV.y = clamp01(hslV.y + vibF * (1.0 - hslV.y) * 0.6);
  c = hsl2rgb(hslV);

  if (abs(u_clarity) > 0.5) {
    float lumC  = luminance(c);
    float midW2 = clamp01(1.0 - abs(lumC - 0.5) * 2.2);
    float boosted = lumC + (u_clarity / 100.0) * (lumC - 0.5) * 0.35 * midW2;
    float ratio   = (boosted + 0.0001) / (lumC + 0.0001);
    c = clamp(c * ratio, 0.0, 1.0);
  }

  if (abs(u_dehaze) > 0.5) {
    float dehF    = u_dehaze / 100.0;
    float grayLift = 0.04 * dehF;
    c = clamp((c - grayLift) / (1.0 - grayLift), 0.0, 1.0);
    float lumD = luminance(c);
    c = mix(vec3(lumD), c, 1.0 + dehF * 0.18);
  }

  vec3 hslBand = rgb2hsl(c);
  float totalHue = 0.0, totalSat = 0.0, totalLum = 0.0, totalW = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = bandWeight(hslBand.x, BAND_HUE[i], BAND_HALF);
    if (w > 0.001) {
      totalHue += u_hsl[i].x / 180.0 * w;
      totalSat += u_hsl[i].y / 100.0 * w;
      totalLum += u_hsl[i].z / 100.0 * w;
      totalW   += w;
    }
  }
  if (totalW > 0.001) {
    hslBand.x = mod(hslBand.x + totalHue / totalW + 1.0, 1.0);
    hslBand.y = clamp01(hslBand.y + totalSat / totalW * 0.80);
    hslBand.z = clamp01(hslBand.z + totalLum / totalW * 0.60);
    c = hsl2rgb(hslBand);
  }

  c.r = applyCurveChannel(c.r, u_curveShadows, u_curveMidtones, u_curveHighlights);
  c.g = applyCurveChannel(c.g, u_curveShadows, u_curveMidtones, u_curveHighlights);
  c.b = applyCurveChannel(c.b, u_curveShadows, u_curveMidtones, u_curveHighlights);

  if (abs(u_vignette) > 0.5) {
    vec2 uv   = v_uv - 0.5;
    float dist = length(uv) * 1.414;
    float vig  = smoothstep(0.45, 1.0, dist);
    float vigF = u_vignette / 100.0;
    c = mix(c, c * (1.0 - vig * abs(vigF) * 1.4), sign(vigF) * 0.5 + 0.5);
    if (vigF < 0.0) c = clamp(c * (1.0 + vig * abs(vigF) * 0.6), 0.0, 1.0);
  }

  if (u_grain > 0.5) {
    float n      = stableNoise(floor(v_uv * u_resolution));
    float grainF = u_grain / 100.0;
    float lumG   = luminance(c);
    float grainMask = 1.0 - abs(lumG - 0.5) * 0.6;
    c += (n - 0.5) * grainF * 0.18 * grainMask;
    c  = clamp(c, 0.0, 1.0);
  }

  fragColor = vec4(c, src.a);
}
`;

// ─── Tipos internos ──────────────────────────────────────────────────────

/** Nomes de todos os uniforms escalares + vetoriais */
const UNIFORM_NAMES = [
  'u_exposure','u_contrast','u_highlights','u_shadows','u_whites','u_blacks',
  'u_temperature','u_tint','u_vibrance','u_saturation',
  'u_clarity','u_dehaze','u_vignette','u_grain',
  'u_curveShadows','u_curveMidtones','u_curveHighlights',
  'u_resolution','u_hsl','u_image',
] as const;

type UniformName = typeof UNIFORM_NAMES[number];

interface WebGLResources {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  texture: WebGLTexture;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /** Locations cacheadas — evita getUniformLocation por frame */
  locs: Record<UniformName, WebGLUniformLocation | null>;
}

// ─── Cache de contexto ───────────────────────────────────────────────────
let _resources: WebGLResources | null = null;
let _texWidth  = 0;
let _texHeight = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`WebGL shader compile error:\n${log}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vert: WebGLShader, frag: WebGLShader): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`WebGL program link error:\n${log}`);
  }
  return prog;
}

// ─── Inicialização lazy + cache ──────────────────────────────────────────

function initResources(width: number, height: number): WebGLResources {
  if (_resources && _texWidth === width && _texHeight === height) {
    return _resources;
  }

  if (_resources) {
    const { gl, texture, vao, program } = _resources;
    gl.deleteTexture(texture);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
  }

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let gl: WebGL2RenderingContext;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!ctx) throw new Error('WebGL2 não suportado neste navegador.');
    gl = ctx as unknown as WebGL2RenderingContext;
  } else {
    canvas = document.createElement('canvas');
    (canvas as HTMLCanvasElement).width  = width;
    (canvas as HTMLCanvasElement).height = height;
    const ctx = (canvas as HTMLCanvasElement).getContext('webgl2', { preserveDrawingBuffer: true });
    if (!ctx) throw new Error('WebGL2 não suportado neste navegador.');
    gl = ctx;
  }

  gl.viewport(0, 0, width, height);

  const vert    = compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
  const frag    = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  const program = linkProgram(gl, vert, frag);
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  // Full-screen quad
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Cache de todas as locations de uma só vez
  gl.useProgram(program);
  const locs = {} as Record<UniformName, WebGLUniformLocation | null>;
  for (const name of UNIFORM_NAMES) {
    locs[name] = gl.getUniformLocation(program, name);
  }

  _resources = { gl, program, vao, texture, canvas, locs };
  _texWidth  = width;
  _texHeight = height;
  return _resources;
}

// ─── Upload de uniforms (usa locations cacheadas) ────────────────────────

function uploadUniforms(
  gl: WebGL2RenderingContext,
  locs: Record<UniformName, WebGLUniformLocation | null>,
  edit: EditState,
  width: number,
  height: number
) {
  const s = (name: UniformName, v: number) => {
    if (locs[name] !== null) gl.uniform1f(locs[name]!, v);
  };

  s('u_exposure',    edit.exposure);
  s('u_contrast',    edit.contrast);
  s('u_highlights',  edit.highlights);
  s('u_shadows',     edit.shadows);
  s('u_whites',      edit.whites);
  s('u_blacks',      edit.blacks);
  s('u_temperature', edit.temperature);
  s('u_tint',        edit.tint);
  s('u_vibrance',    edit.vibrance);
  s('u_saturation',  edit.saturation);
  s('u_clarity',     edit.clarity);
  s('u_dehaze',      edit.dehaze);
  s('u_vignette',    edit.vignette);
  s('u_grain',       edit.grain);

  const master = edit.curves.master;
  s('u_curveShadows',    master.shadows);
  s('u_curveMidtones',   master.midtones);
  s('u_curveHighlights', master.highlights);

  if (locs['u_resolution'] !== null) gl.uniform2f(locs['u_resolution']!, width, height);

  const HSL_BANDS = ['red','orange','yellow','green','aqua','blue','purple','magenta'] as const;
  const hslData = new Float32Array(8 * 3);
  HSL_BANDS.forEach((band, i) => {
    const b = edit.hsl[band];
    hslData[i * 3 + 0] = b.hue;
    hslData[i * 3 + 1] = b.saturation;
    hslData[i * 3 + 2] = b.luminance;
  });
  if (locs['u_hsl'] !== null) gl.uniform3fv(locs['u_hsl']!, hslData);
}

// ─── API pública ──────────────────────────────────────────────────────────

/**
 * Verifica se WebGL2 está disponível no browser atual.
 */
export function isWebGL2Supported(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Processa um ImageData com WebGL2 aplicando todos os ajustes do EditState.
 * Retorna um novo ImageData com os pixels processados.
 *
 * Melhorias v2:
 *  - uniform locations cacheadas (zero lookups por frame)
 *  - flip Y feito no shader; loop de inversão CPU removido
 *  - viewport reconfigurado somente quando dimensões mudam
 *
 * @throws se WebGL2 não estiver disponível ou ocorrer erro de compilação.
 */
export function processPixelsWebGL(imageData: ImageData, edit: EditState): ImageData {
  const { width, height } = imageData;
  const { gl, program, vao, texture, canvas, locs } = initResources(width, height);

  // Redimensiona apenas se necessário
  const cvs = canvas as HTMLCanvasElement;
  if (cvs.width !== undefined && (cvs.width !== width || cvs.height !== height)) {
    cvs.width  = width;
    cvs.height = height;
    gl.viewport(0, 0, width, height);
  }

  // Upload da textura
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);

  // Uniforms via locations cacheadas
  gl.useProgram(program);
  uploadUniforms(gl, locs, edit, width, height);

  // Bind textura na unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (locs['u_image'] !== null) gl.uniform1i(locs['u_image']!, 0);

  // Draw
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);

  // readPixels — o flip Y já foi feito no shader; não há loop de inversão aqui
  const output = new Uint8ClampedArray(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, output);

  return new ImageData(output, width, height);
}

/**
 * Libera todos os recursos WebGL em cache.
 * Chamar ao desmontar o editor ou ao trocar de imagem grande.
 */
export function disposeWebGL(): void {
  if (!_resources) return;
  const { gl, texture, vao, program } = _resources;
  gl.deleteTexture(texture);
  gl.deleteVertexArray(vao);
  gl.deleteProgram(program);
  _resources = null;
  _texWidth  = 0;
  _texHeight = 0;
}
