// ---------------------------------------------------------------------------
// math.js — vetores, easing e utilidades numéricas. Sem alocação em loop.
// ---------------------------------------------------------------------------

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

/** Aproximação exponencial independente de framerate. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const dist2 = (ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
};
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));

/** Menor diferença angular entre dois ângulos, em [-PI, PI]. */
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function approachAngle(cur, target, maxStep) {
  const d = angleDelta(cur, target);
  if (Math.abs(d) <= maxStep) return target;
  return cur + sign(d) * maxStep;
}

// --- easing ---------------------------------------------------------------
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutElastic = (t) => {
  const c4 = TAU / 3;
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/** Colisão círculo x retângulo alinhado aos eixos. Devolve profundidade/normal. */
export function circleRect(cx, cy, r, rx, ry, rw, rh, out) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 > r * r) return false;
  const d = Math.sqrt(d2) || 0.0001;
  out.nx = dx / d; out.ny = dy / d; out.depth = r - d;
  if (d2 < 0.0001) {
    // centro dentro do retângulo: empurra pelo eixo de menor penetração
    const left = cx - rx, right = rx + rw - cx, top = cy - ry, bottom = ry + rh - cy;
    const m = Math.min(left, right, top, bottom);
    out.nx = m === left ? -1 : m === right ? 1 : 0;
    out.ny = m === top ? -1 : m === bottom ? 1 : 0;
    out.depth = r + m;
  }
  return true;
}

/** Ponto dentro de um setor circular (usado pelo golpe em arco). */
export function inArc(px, py, ox, oy, radius, facing, halfAngle) {
  const dx = px - ox, dy = py - oy;
  const d2 = dx * dx + dy * dy;
  if (d2 > radius * radius) return false;
  if (d2 < 1) return true;
  return Math.abs(angleDelta(facing, Math.atan2(dy, dx))) <= halfAngle;
}
