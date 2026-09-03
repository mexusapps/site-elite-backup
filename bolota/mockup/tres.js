// ---------------------------------------------------------------------------
// tres.js — teste de direção: a MESMA fase 1, renderizada em 3D.
//
// A referência que o Eduardo mandou não é ilustração 2D: é uma cena 3D com
// câmera inclinada, sombra projetada de verdade e material de brinquedo de
// vinil. Isso muda tudo, porque qualidade em 3D vem de GEOMETRIA, LUZ e
// MATERIAL — que são matemática, não pintura. É o tipo de coisa que código faz.
//
// A simulação continua sendo a de sempre: os mesmos polígonos da física viram
// o relevo, extrudados em profundidade.
// ---------------------------------------------------------------------------
import * as T from 'three';
import { FASE1 } from '../src/game/niveis.js';
import { colina, quad } from '../src/game/fisica.js';

const cena = new T.Scene();
// céu em degradê: cor chapada de fundo entrega na hora que a cena é pobre
{
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2f5f8c'); gr.addColorStop(0.45, '#8fbcd0');
  gr.addColorStop(0.78, '#ffd6a4'); gr.addColorStop(1, '#ffe9c8');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.mapping = T.EquirectangularReflectionMapping;
  cena.background = t;
}
cena.fog = new T.Fog('#cfd9d2', 1800, 5200);

const ren = new T.WebGLRenderer({ antialias: true, canvas: document.getElementById('c') });
ren.setPixelRatio(Math.min(devicePixelRatio, 2));
ren.setSize(innerWidth, innerHeight);
ren.shadowMap.enabled = true;
ren.shadowMap.type = T.PCFSoftShadowMap;
ren.toneMapping = T.ACESFilmicToneMapping;
ren.toneMappingExposure = 1.15;

// --- texturas procedurais ----------------------------------------------------
function tela(w, h, pintar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  pintar(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function ruidoEm(g, w, h, a, cor) {
  for (let i = 0; i < w * h / 26; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 1 + Math.random() * 3;
    g.fillStyle = `rgba(${cor},${(Math.random() * a).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
}
const texGrama = tela(512, 512, (g, w, h) => {
  g.fillStyle = '#79b544'; g.fillRect(0, 0, w, h);
  // as faixas de grama cortada, que é o que faz um gramado parecer gramado
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.09)' : 'rgba(0,40,0,0.07)';
    g.fillRect((i * w) / 8, 0, w / 8, h);
  }
  ruidoEm(g, w, h, 0.30, '40,90,30');
  ruidoEm(g, w, h, 0.24, '190,230,140');
});
texGrama.repeat.set(6, 6);
const texTerra = tela(512, 512, (g, w, h) => {
  g.fillStyle = '#7a5636'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 14 + Math.random() * 46;
    g.fillStyle = Math.random() > 0.5 ? 'rgba(150,120,88,0.45)' : 'rgba(46,32,22,0.45)';
    g.beginPath(); g.ellipse(x, y, r, r * 0.7, Math.random() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 3 + Math.random() * 9;
    g.fillStyle = 'rgba(178,166,146,0.8)';
    g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.25, r * 0.5, r * 0.35, 0, 0, 7); g.fill();
  }
  ruidoEm(g, w, h, 0.22, '30,20,14');
});
texTerra.repeat.set(3, 3);

const matGrama = new T.MeshStandardMaterial({ map: texGrama, roughness: 0.92, metalness: 0 });
const matTerra = new T.MeshStandardMaterial({ map: texTerra, roughness: 0.95, metalness: 0 });

// --- relevo: os polígonos da física, extrudados ------------------------------
function formasDaFase() {
  const saida = [];
  for (const t of FASE1.terreno) {
    const f = t.tipo === 'colina'
      ? colina(t.cx, t.topo, t.larg, t.alt, t.base, 16, {})
      : quad(t.p[0], t.p[1], t.p[2], t.p[3], {});
    saida.push(f);
  }
  return saida;
}
const grupoMundo = new T.Group();
cena.add(grupoMundo);

for (const f of formasDaFase()) {
  const forma = new T.Shape();
  f.p.forEach(([x, y], i) => (i ? forma.lineTo(x, -y) : forma.moveTo(x, -y)));
  const geo = new T.ExtrudeGeometry(forma, {
    depth: 340, bevelEnabled: true, bevelThickness: 12, bevelSize: 12, bevelSegments: 3,
  });
  geo.translate(0, 0, -170);
  const malha = new T.Mesh(geo, [matTerra, matTerra]);
  malha.castShadow = true; malha.receiveShadow = true;
  grupoMundo.add(malha);

  // tampo de grama: uma casquinha por cima das arestas viradas para cima
  for (let i = 0; i < f.p.length; i++) {
    const a = f.p[i], b = f.p[(i + 1) % f.p.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], comp = Math.hypot(dx, dy);
    if (comp < 24) continue;
    const ny = -dx / comp;
    if (ny > -0.42) continue;
    const g2 = new T.BoxGeometry(comp, 30, 372);
    const m2 = new T.Mesh(g2, matGrama);
    m2.position.set((a[0] + b[0]) / 2, -(a[1] + b[1]) / 2 + 9, 0);
    m2.rotation.z = -Math.atan2(dy, dx);
    m2.castShadow = true; m2.receiveShadow = true;
    grupoMundo.add(m2);
  }
}

// --- luz ---------------------------------------------------------------------
// É esta parte, e não a modelagem, que faz a cena parecer de estúdio: uma chave
// quente com sombra suave, um preenchimento frio vindo do céu e um contraluz.
const sol = new T.DirectionalLight('#fff0d0', 3.1);
sol.position.set(900, 1400, 900);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
sol.shadow.radius = 5;
sol.shadow.bias = -0.0015;
const s = sol.shadow.camera;
s.left = -1400; s.right = 1400; s.top = 1400; s.bottom = -1400; s.near = 100; s.far = 4200;
cena.add(sol);
cena.add(new T.HemisphereLight('#a8d8ff', '#4a7a2e', 1.25));
const contra = new T.DirectionalLight('#bfe4ff', 0.9);
contra.position.set(-700, 500, -900);
cena.add(contra);

// --- a Bolota em 3D ----------------------------------------------------------
function perfilNoz(r) {
  const p = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const y = -r * 1.02 + t * r * 2.06;
    const k = Math.sqrt(Math.max(0, 1 - Math.pow((y + r * 0.1) / (r * 1.05), 2)));
    p.push(new T.Vector2(Math.max(0.01, r * 0.98 * k * (1 - t * 0.10)), y));
  }
  return p;
}
function bolota3d() {
  const g = new T.Group();
  const casca = new T.MeshPhysicalMaterial({
    color: '#d29455', roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.5 });
  const chapeuMat = new T.MeshPhysicalMaterial({
    color: '#7a4a26', roughness: 0.62, metalness: 0, clearcoat: 0.2 });
  const corpoMat = new T.MeshPhysicalMaterial({
    color: '#f2dcb4', roughness: 0.5, metalness: 0, clearcoat: 0.3 });
  const membroMat = new T.MeshPhysicalMaterial({
    color: '#a86c3c', roughness: 0.5, metalness: 0, clearcoat: 0.25 });

  const cabeca = new T.Mesh(new T.LatheGeometry(perfilNoz(30), 40), casca);
  cabeca.position.y = 74; cabeca.castShadow = true; g.add(cabeca);

  const chapeu = new T.Mesh(new T.SphereGeometry(31.5, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.46), chapeuMat);
  chapeu.position.y = 88; chapeu.castShadow = true; g.add(chapeu);
  // escamas do chapéu
  for (let a = 0; a < 22; a++) {
    for (let f = 0; f < 2; f++) {
      const ang = (a / 22) * Math.PI * 2 + f * 0.14;
      const rr = 30 - f * 4, alt = 90 + f * 9;
      const e = new T.Mesh(new T.SphereGeometry(4.4 - f * 0.7, 10, 8), chapeuMat);
      e.position.set(Math.cos(ang) * rr * (1 - f * 0.16), alt, Math.sin(ang) * rr * (1 - f * 0.16));
      e.castShadow = true; g.add(e);
    }
  }
  const tronco = new T.Mesh(new T.CapsuleGeometry(20, 14, 8, 24), corpoMat);
  tronco.position.y = 36; tronco.castShadow = true; g.add(tronco);

  const olhoBranco = new T.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.25 });
  const irisMat = new T.MeshStandardMaterial({ color: '#2f6f63', roughness: 0.3 });
  const pupilaMat = new T.MeshStandardMaterial({ color: '#160f0b', roughness: 0.2 });
  for (const lado of [-1, 1]) {
    const o = new T.Mesh(new T.SphereGeometry(9.5, 24, 18), olhoBranco);
    o.position.set(lado * 11, 76, 24); o.scale.set(1, 1.14, 0.62); g.add(o);
    const ir = new T.Mesh(new T.SphereGeometry(5.6, 20, 16), irisMat);
    ir.position.set(lado * 11.6, 75.4, 29.6); ir.scale.z = 0.5; g.add(ir);
    const pu = new T.Mesh(new T.SphereGeometry(2.9, 16, 12), pupilaMat);
    pu.position.set(lado * 11.9, 75.2, 31.6); pu.scale.z = 0.5; g.add(pu);
    const br = new T.Mesh(new T.SphereGeometry(1.5, 10, 8),
      new T.MeshBasicMaterial({ color: '#ffffff' }));
    br.position.set(lado * 13.6, 78.4, 32.4); g.add(br);
    // sobrancelha
    const sb = new T.Mesh(new T.TorusGeometry(6, 1.5, 8, 14, 2.0), chapeuMat);
    sb.position.set(lado * 11, 85, 25); sb.rotation.set(0.2, 0, Math.PI);
    g.add(sb);
    // braço e perna
    const br2 = new T.Mesh(new T.CapsuleGeometry(5.2, 15, 6, 14), membroMat);
    br2.position.set(lado * 23, 40, 4); br2.rotation.z = lado * -0.42; br2.castShadow = true; g.add(br2);
    const mao = new T.Mesh(new T.SphereGeometry(6.6, 16, 12), membroMat);
    mao.position.set(lado * 30, 27, 5); mao.scale.set(1, 0.8, 0.85); mao.castShadow = true; g.add(mao);
    const pn = new T.Mesh(new T.CapsuleGeometry(6, 14, 6, 14), membroMat);
    pn.position.set(lado * 10, 14, 0); pn.castShadow = true; g.add(pn);
    const pe = new T.Mesh(new T.SphereGeometry(8, 16, 12), membroMat);
    pe.position.set(lado * 10, 5, 5); pe.scale.set(1, 0.55, 1.35); pe.castShadow = true; g.add(pe);
  }
  // broto
  const cauleMat = new T.MeshStandardMaterial({ color: '#5f9c46', roughness: 0.6 });
  const folhaMat = new T.MeshStandardMaterial({
    color: '#82c95c', roughness: 0.5, side: T.DoubleSide });
  const caule = new T.Mesh(new T.CylinderGeometry(2.2, 3.2, 22, 10), cauleMat);
  caule.position.y = 116; caule.castShadow = true; g.add(caule);
  for (const lado of [-1, 1]) {
    const fo = new T.Mesh(new T.SphereGeometry(9, 16, 10), folhaMat);
    fo.position.set(lado * 9, 128, 0);
    fo.scale.set(1.1, 0.28, 0.55); fo.rotation.z = lado * 0.5;
    fo.castShadow = true; g.add(fo);
  }
  return g;
}
const boneco = bolota3d();
boneco.position.set(FASE1.inicio.x, -FASE1.inicio.y + 20, 0);
boneco.rotation.y = 0.35;
grupoMundo.add(boneco);

// --- adereços ----------------------------------------------------------------
function cogumelo(x, y, esc) {
  const g = new T.Group();
  const pe = new T.Mesh(new T.CylinderGeometry(5, 7, 22, 14),
    new T.MeshStandardMaterial({ color: '#f6e6cc', roughness: 0.7 }));
  pe.position.y = 11; pe.castShadow = true; g.add(pe);
  const ch = new T.Mesh(new T.SphereGeometry(16, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new T.MeshPhysicalMaterial({ color: '#e2603a', roughness: 0.42, clearcoat: 0.4 }));
  ch.position.y = 22; ch.scale.y = 0.78; ch.castShadow = true; g.add(ch);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, r = 6 + (i % 3) * 3;
    const p = new T.Mesh(new T.SphereGeometry(2.4, 10, 8),
      new T.MeshStandardMaterial({ color: '#fff3e0', roughness: 0.5 }));
    p.position.set(Math.cos(a) * r, 26 + Math.sin(i) * 1.5, Math.sin(a) * r);
    p.scale.y = 0.4; g.add(p);
  }
  g.position.set(x, y, (Math.random() - 0.5) * 200);
  g.scale.setScalar(esc);
  return g;
}
function pedra(x, y, esc) {
  const geo = new T.IcosahedronGeometry(16, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) * (0.8 + Math.random() * 0.4),
      pos.getY(i) * (0.6 + Math.random() * 0.3), pos.getZ(i) * (0.8 + Math.random() * 0.4));
  }
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: '#8d8577', roughness: 0.95, flatShading: true }));
  m.position.set(x, y + 8, (Math.random() - 0.5) * 220);
  m.scale.setScalar(esc); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function arvore(x, y, alt) {
  const g = new T.Group();
  const tr = new T.Mesh(new T.CylinderGeometry(16, 26, alt, 12),
    new T.MeshStandardMaterial({ color: '#6b4830', roughness: 0.9 }));
  tr.position.y = alt / 2; tr.castShadow = true; g.add(tr);
  const copaMat = new T.MeshStandardMaterial({ color: '#4f9243', roughness: 0.85 });
  for (let i = 0; i < 7; i++) {
    const r = 60 + Math.random() * 60;
    const b = new T.Mesh(new T.IcosahedronGeometry(r, 1), copaMat);
    b.position.set((Math.random() - 0.5) * 150, alt + (Math.random() - 0.2) * 120,
      (Math.random() - 0.5) * 150);
    b.castShadow = true; g.add(b);
  }
  g.position.set(x, y, -180 - Math.random() * 160);
  return g;
}
const topoEm = (x) => {
  let melhor = 1e9;
  for (const f of formasDaFase()) {
    const a = f.aabb;
    if (x < a.x || x > a.x + a.w) continue;
    for (let i = 0; i < f.p.length; i++) {
      const p = f.p[i], q = f.p[(i + 1) % f.p.length];
      if ((p[0] - x) * (q[0] - x) > 0) continue;
      const dx = q[0] - p[0]; if (Math.abs(dx) < 1e-6) continue;
      const yy = p[1] + (q[1] - p[1]) * ((x - p[0]) / dx);
      if (yy < melhor) melhor = yy;
    }
  }
  return melhor;
};
for (let i = 0; i < 16; i++) {
  const x = 60 + Math.random() * 1300, y = -topoEm(x);
  if (!isFinite(y)) continue;
  grupoMundo.add(Math.random() > 0.45 ? cogumelo(x, y, 0.8 + Math.random() * 0.7)
    : pedra(x, y, 0.7 + Math.random() * 0.8));
}
// árvores próximas, plantadas no relevo
for (let i = 0; i < 5; i++) {
  const x = 80 + i * 330 + Math.random() * 90;
  const t = topoEm(x);
  if (!isFinite(t)) continue;
  grupoMundo.add(arvore(x, -t, 260 + Math.random() * 200));
}
// bosque de fundo: é ele que dá fundo à cena em vez de céu vazio
for (let i = 0; i < 30; i++) {
  const a = arvore(-900 + Math.random() * 4200, -1500 + Math.random() * 60, 320 + Math.random() * 460);
  a.position.z = -1400 - Math.random() * 2600;
  a.scale.setScalar(1.2 + Math.random() * 1.1);
  grupoMundo.add(a);
}
// chão distante, para o bosque não flutuar
const chaoFundo = new T.Mesh(new T.PlaneGeometry(9000, 4000), matGrama);
chaoFundo.rotation.x = -Math.PI / 2;
chaoFundo.position.set(1200, -1520, -2600);
chaoFundo.receiveShadow = true;
grupoMundo.add(chaoFundo);

// --- câmera: a inclinação é metade do efeito ---------------------------------
// Enquadramento de perfil, com a câmera só um pouco acima da linha do chão:
// a referência que motivou este teste é vista de cima porque aquele jogo é de
// arena; a BOLOTA é de perfil, e é a inclinação PEQUENA que dá volume sem
// transformar o campo de jogo num tabuleiro.
const cam = new T.PerspectiveCamera(27, innerWidth / innerHeight, 10, 9000);
const alvo = new T.Vector3(FASE1.inicio.x + 520, -FASE1.inicio.y + 60, 0);
cam.position.set(alvo.x - 40, alvo.y + 620, 2150);
cam.lookAt(alvo.x, alvo.y - 60, 0);
ren.render(cena, cam);
window.__pronto = true;
