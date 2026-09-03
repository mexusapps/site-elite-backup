// ---------------------------------------------------------------------------
// posfx.js — pós-processamento em WebGL.
//
// Por que sair do canvas 2D justamente no acabamento: bloom, gradação, vinheta,
// grão e aberração cromática são operações POR PIXEL. No canvas 2D cada uma
// custa uma varredura de tela inteira feita pela CPU, e a soma delas era o item
// mais caro do quadro — além de dar um bloom pobre, feito de duas cópias
// borradas na mão. Aqui a cena pintada em 2D vira uma textura e todo o
// acabamento acontece numa passada de fragmento:
//
//   1. CORTE DE BRILHO com joelho suave (nada de limiar duro, que serrilha).
//   2. DOIS NÍVEIS DE HALO. Um borrão gaussiano separável a meia resolução dá
//      o brilho junto ao objeto; outro a 1/8 dá o halo largo e macio. Somar os
//      dois é o que faz a luz "vazar" como numa lente de verdade em vez de
//      virar um anel.
//   3. ACABAMENTO NUM PASSE SÓ: exposição, curva filmica (ACES), tonalização
//      partida (sombra fria / luz quente), saturação, vinheta, grão animado e
//      aberração cromática radial — que aumenta com a distância do centro,
//      como numa lente real.
//
// Se o navegador não tiver WebGL, `ok` fica falso e a cena volta ao caminho 2D
// inteiro. O jogo nunca depende disto para funcionar.
// ---------------------------------------------------------------------------

const VS = `
attribute vec2 pos;
varying vec2 uv;
void main() {
  uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

const FS_BRILHO = `
precision mediump float;
uniform sampler2D tex;
uniform float limiar, joelho;
varying vec2 uv;
void main() {
  vec3 c = texture2D(tex, uv).rgb;
  float l = max(max(c.r, c.g), c.b);
  float s = clamp((l - limiar) / max(joelho, 1e-4), 0.0, 1.0);
  s = s * s * (3.0 - 2.0 * s);
  // o halo é somado em LUZ, não em valor de tela: por isso linearizamos aqui
  gl_FragColor = vec4(c * c * s, 1.0);
}`;

const FS_BORRAO = `
precision mediump float;
uniform sampler2D tex;
uniform vec2 passo;
varying vec2 uv;
void main() {
  vec3 s = texture2D(tex, uv).rgb * 0.227027;
  s += (texture2D(tex, uv + passo * 1.3846).rgb
      + texture2D(tex, uv - passo * 1.3846).rgb) * 0.316216;
  s += (texture2D(tex, uv + passo * 3.2308).rgb
      + texture2D(tex, uv - passo * 3.2308).rgb) * 0.070270;
  gl_FragColor = vec4(s, 1.0);
}`;

const FS_FINAL = `
precision mediump float;
uniform sampler2D base, haloPerto, haloLonge;
uniform float forcaBloom, exposicao, vinheta, grao, aberracao, tempo, saturacao, contraste;
uniform vec3 sombraCor, luzCor;
varying vec2 uv;

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
float ruido(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 d = uv - 0.5;
  float r2 = dot(d, d);

  // Aberração cromática: um a dois pixels de separação nos cantos, não mais.
  // Medida em fração de tela, o exagero aparece na hora — a primeira versão
  // usava um valor cinquenta vezes maior e a tela inteira ficou com franjas.
  float ab = aberracao * r2;
  vec3 c;
  c.r = texture2D(base, uv + d * ab).r;
  c.g = texture2D(base, uv).g;
  c.b = texture2D(base, uv - d * ab).b;

  // Todo o resto acontece em espaço LINEAR. Somar brilho e aplicar curva
  // filmica direto nos valores de tela achatava o contraste e lavava a cor.
  vec3 lin = c * c;
  lin += (texture2D(haloPerto, uv).rgb + texture2D(haloLonge, uv).rgb * 0.9) * forcaBloom;
  lin = aces(lin * exposicao);
  // contraste em torno do cinza médio: a curva filmica levanta os meios-tons,
  // e sem devolver esse contraste a cena inteira fica leitosa
  lin = max(mix(vec3(0.16), lin, contraste), 0.0);

  // tonalização partida: a sombra puxa para o azul, a luz para o âmbar
  float l = dot(lin, vec3(0.299, 0.587, 0.114));
  lin = mix(lin * sombraCor, lin * luzCor, smoothstep(0.05, 0.7, l));
  lin = mix(vec3(l), lin, saturacao);
  lin *= 1.0 - vinheta * smoothstep(0.05, 0.40, r2);

  vec3 saida = sqrt(max(lin, 0.0));
  saida += (ruido(uv * 512.0 + tempo) - 0.5) * grao;
  gl_FragColor = vec4(saida, 1.0);
}`;

function compilar(gl, tipo, fonte) {
  const s = gl.createShader(tipo);
  gl.shaderSource(s, fonte);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

function programa(gl, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compilar(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compilar(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'pos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('programa: ' + gl.getProgramInfoLog(p));
  }
  return p;
}

class Alvo {
  constructor(gl, w, h) {
    this.gl = gl; this.w = w; this.h = h;
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
  }
  destruir() {
    this.gl.deleteTexture(this.tex);
    this.gl.deleteFramebuffer(this.fb);
  }
}

/**
 * Rasterizadores por software. Sem GPU de verdade, esta conta toda (uma textura
 * de tela cheia por quadro mais sete passadas de fragmento) sai mais cara na CPU
 * do que o acabamento em canvas 2D que ela substitui — medido: 28 ms contra
 * 75 ms por quadro. Quando é o caso, o jogo simplesmente não usa WebGL.
 */
const SOFTWARE = /swiftshader|llvmpipe|software|basic render|microsoft basic/i;

export class PosFX {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} op `forcar` liga o caminho WebGL mesmo sem GPU (para teste)
   */
  /**
   * Sonda o suporte numa tela DESCARTÁVEL.
   *
   * Isto não é preciosismo: pedir um contexto WebGL a um canvas o compromete
   * para sempre — depois disso `getContext('2d')` devolve null nele. A primeira
   * versão sondava direto na tela do jogo e, ao desistir do WebGL, ficava sem
   * contexto nenhum para voltar ao caminho 2D.
   */
  static sondar(forcar) {
    try {
      const t = document.createElement('canvas');
      t.width = t.height = 2;
      const gl = t.getContext('webgl') || t.getContext('experimental-webgl');
      if (!gl) return { ok: false, motivo: 'sem webgl', placa: '' };
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const placa = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
      const perder = gl.getExtension('WEBGL_lose_context');
      if (perder) perder.loseContext();
      if (!forcar && SOFTWARE.test(placa)) {
        return { ok: false, motivo: 'rasterizacao por software: ' + placa, placa };
      }
      return { ok: true, motivo: '', placa };
    } catch (e) {
      return { ok: false, motivo: 'erro: ' + e.message, placa: '' };
    }
  }

  constructor(canvas, op0 = {}) {
    this.ok = false;
    this.motivo = '';
    this.canvas = canvas;
    const sonda = PosFX.sondar(!!op0.forcar);
    this.placa = sonda.placa;
    if (!sonda.ok) { this.motivo = sonda.motivo; return; }
    try {
      const op = { alpha: false, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
      const gl = canvas.getContext('webgl', op) || canvas.getContext('experimental-webgl', op);
      if (!gl) { this.motivo = 'sem webgl'; return; }
      this.gl = gl;
      this.pBrilho = programa(gl, FS_BRILHO);
      this.pBorrao = programa(gl, FS_BORRAO);
      this.pFinal = programa(gl, FS_FINAL);
      this.quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this.texBase = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texBase);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      this.alvos = null;
      this.ok = true;
    } catch (e) { this.ok = false; this.motivo = 'erro: ' + e.message; }
  }

  redimensionar(w, h, escalaHalo = 1) {
    if (!this.ok) return;
    const gl = this.gl;
    this.w = Math.max(2, Math.round(w));
    this.h = Math.max(2, Math.round(h));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    if (this.alvos) for (const a of this.alvos) a.destruir();
    const d1 = Math.max(2, Math.round(this.w * 0.5 * escalaHalo));
    const e1 = Math.max(2, Math.round(this.h * 0.5 * escalaHalo));
    const d2 = Math.max(2, Math.round(this.w * 0.125 * escalaHalo));
    const e2 = Math.max(2, Math.round(this.h * 0.125 * escalaHalo));
    this.a1 = new Alvo(gl, d1, e1);
    this.a1b = new Alvo(gl, d1, e1);
    this.a2 = new Alvo(gl, d2, e2);
    this.a2b = new Alvo(gl, d2, e2);
    this.alvos = [this.a1, this.a1b, this.a2, this.a2b];
  }

  _passe(prog, alvo, ligar) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, alvo ? alvo.fb : null);
    gl.viewport(0, 0, alvo ? alvo.w : this.w, alvo ? alvo.h : this.h);
    gl.useProgram(prog);
    if (ligar) ligar(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  _tex(prog, nome, unidade, tex) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unidade);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(prog, nome), unidade);
  }

  /**
   * @param {HTMLCanvasElement} fonte a cena já pintada em 2D
   * @param {object} o parâmetros de acabamento
   */
  render(fonte, o) {
    if (!this.ok || !this.alvos) return false;
    const gl = this.gl;
    try {
      gl.bindTexture(gl.TEXTURE_2D, this.texBase);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte);

      const forca = o.bloom === undefined ? 1 : o.bloom;
      if (forca > 0.02) {
        this._passe(this.pBrilho, this.a1, (p) => {
          this._tex(p, 'tex', 0, this.texBase);
          gl.uniform1f(gl.getUniformLocation(p, 'limiar'), o.limiar ?? 0.78);
          gl.uniform1f(gl.getUniformLocation(p, 'joelho'), 0.22);
        });
        const borrar = (de, para, dx, dy) => this._passe(this.pBorrao, para, (p) => {
          this._tex(p, 'tex', 0, de.tex);
          gl.uniform2f(gl.getUniformLocation(p, 'passo'), dx / para.w, dy / para.h);
        });
        borrar(this.a1, this.a1b, 1, 0);
        borrar(this.a1b, this.a1, 0, 1);
        borrar(this.a1, this.a2b, 1, 0);
        borrar(this.a2b, this.a2, 0, 1);
        borrar(this.a2, this.a2b, 2, 0);
        borrar(this.a2b, this.a2, 0, 2);
      } else {
        for (const a of [this.a1, this.a2]) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb);
          gl.viewport(0, 0, a.w, a.h);
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      }

      this._passe(this.pFinal, null, (p) => {
        this._tex(p, 'base', 0, this.texBase);
        this._tex(p, 'haloPerto', 1, this.a1.tex);
        this._tex(p, 'haloLonge', 2, this.a2.tex);
        const u = (n, v) => gl.uniform1f(gl.getUniformLocation(p, n), v);
        u('forcaBloom', forca * (o.forcaBloom ?? 0.55));
        u('exposicao', o.exposicao ?? 0.92);
        u('vinheta', o.vinheta ?? 0.45);
        u('grao', o.grao ?? 0.035);
        u('aberracao', o.aberracao ?? 0.006);
        u('saturacao', o.saturacao ?? 1.06);
        u('contraste', o.contraste ?? 1.14);
        u('tempo', (o.tempo ?? 0) % 100);
        const s = o.sombraCor || [0.84, 0.93, 1.12];
        const c = o.luzCor || [1.12, 1.02, 0.86];
        gl.uniform3f(gl.getUniformLocation(p, 'sombraCor'), s[0], s[1], s[2]);
        gl.uniform3f(gl.getUniformLocation(p, 'luzCor'), c[0], c[1], c[2]);
      });
      return true;
    } catch (_) { this.ok = false; return false; }
  }
}
