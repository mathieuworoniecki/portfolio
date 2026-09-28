/* Dans l'espace (l'écran 2) : la présentation s'écrit toute seule, au stylo blanc, du même trait que les dessins au clic-glissé
   (28/09, Mathieu : « abandonne l'idée des textes lettres sur le deuxième écran ; toute ma présentation va se dessiner comme l'effet
   qu'on a au clic et drag sur l'écran deux »). Elle remplace le texte qui défilait (js/espace-texte.js, retiré).
   - Chaque mot est tracé lettre après lettre, contour après contour, par une pointe de stylo qui avance ; le mot fini reste là, en l'air.
   - Les mots sont des choses : un chat qui passe les bouscule (ils tanguent et reviennent à leur place, sur un ressort),
     un chat s'y accroche et pend en dessous (le mot ploie sous son poids), l'onde d'un clic les secoue, on peut les attraper et les lancer.
   - Pendant l'écriture, un chat court parfois après la pointe du stylo.
   - Le texte lui-même est à écrire par Mathieu (ne rien inventer) : pour l'instant, son titre, puis du faux texte.
   - À la fin, les planètes se dessinent (js/espace-planetes.js : EspacePlume.onFini). */
window.EspacePlume = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, rnd, pick, clamp, sgn, sm } = K;
const TAU = Math.PI * 2, BL = '244,244,238';
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const en = () => !!(window.I18N && I18N.lang && I18N.lang !== 'fr');
// le texte : le titre de Mathieu, puis (en attendant le sien) du faux texte
const TEXTE = () => ({
  titre: window.L ? L('salut.title') : 'Salut, moi c’est Mathieu.',
  par: ['Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.']
});

/* ——— le contour des lettres : on écrit le mot en blanc sur une petite toile, puis on suit le bord de l'encre (les carrés qui marchent) ——— */
const toile = document.createElement('canvas'), tx = toile.getContext('2d', { willReadFrequently: true });
function contours(txt, font, px) {
  const q = 2; tx.font = font; const w = Math.ceil(tx.measureText(txt).width + px * 0.6), h = Math.ceil(px * 1.7), W = w * q, H = h * q;
  toile.width = W; toile.height = H; tx.setTransform(q, 0, 0, q, 0, 0); tx.clearRect(0, 0, w, h);
  tx.font = font; tx.fillStyle = '#fff'; tx.textBaseline = 'alphabetic'; tx.fillText(txt, px * 0.3, px * 1.2);
  const d = tx.getImageData(0, 0, W, H).data, A = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(y * W + x) * 4 + 3] > 110 ? 1 : 0;
  // chaque bord de case traversé par le contour est un point ; deux points par case (quatre dans les cols) ; puis on les enchaîne
  const W2 = W + 2, adj = new Map(), pos = new Map();
  const lie = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
    const k = A(x, y) * 8 + A(x + 1, y) * 4 + A(x + 1, y + 1) * 2 + A(x, y + 1); if (!k || k === 15) continue;
    const T = ((y + 1) * W2 + x + 1) * 2, B = ((y + 2) * W2 + x + 1) * 2, L = ((y + 1) * W2 + x + 1) * 2 + 1, R = ((y + 1) * W2 + x + 2) * 2 + 1;
    pos.set(T, [x + 0.5, y]); pos.set(B, [x + 0.5, y + 1]); pos.set(L, [x, y + 0.5]); pos.set(R, [x + 1, y + 0.5]);
    const S = { 1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[T, R]], 5: [[T, R], [L, B]], 6: [[T, B]], 7: [[T, L]], 8: [[T, L]], 9: [[T, B]], 10: [[T, L], [R, B]], 11: [[T, R]], 12: [[L, R]], 13: [[R, B]], 14: [[L, B]] }[k];
    S.forEach(([a, b]) => lie(a, b));
  }
  const vu = new Set(), boucles = [];
  for (const k0 of adj.keys()) {
    if (vu.has(k0)) continue; const P = []; let prev = -1, k = k0;
    while (k != null && !vu.has(k)) { vu.add(k); const p = pos.get(k); P.push([p[0] / q, p[1] / q]); const n = adj.get(k), nx = n.find(v => v !== prev && !vu.has(v)); prev = k; k = nx; }
    if (P.length > 6) boucles.push(lisse(rdp(P, 0.35)));
  }
  // l'ordre d'un stylo : de gauche à droite, le contour extérieur avant le trou de la lettre ; chacun commence en haut à gauche
  boucles.forEach(b => { b.x0 = Math.min(...b.map(p => p[0])); b.aire = Math.abs(aire(b)); let i0 = 0; b.forEach((p, i) => { if (p[0] + p[1] < b[i0][0] + b[i0][1]) i0 = i; }); b.push(...b.splice(0, i0)); b.push(b[0]); });
  boucles.sort((a, b) => Math.abs(a.x0 - b.x0) < px * 0.12 ? b.aire - a.aire : a.x0 - b.x0);
  return { boucles, w, h, y0: px * 1.2 };
}
function rdp(P, e) {
  if (P.length < 3) return P; const a = P[0], b = P[P.length - 1]; let im = 0, dm = 0;
  for (let i = 1; i < P.length - 1; i++) { const p = P[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, dd = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L; if (dd > dm) { dm = dd; im = i; } }
  return dm > e ? rdp(P.slice(0, im + 1), e).slice(0, -1).concat(rdp(P.slice(im), e)) : [a, b];
}
const lisse = P => { const Q = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } return Q; };
const aire = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const long = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };

/* ——— la mise en page : des lignes de mots, centrées ; chaque mot a sa place (hx, hy), ses contours, son heure d'écriture ——— */
let M = null;   // { mots, t0, fin, W, H, total }
// le titre : la police du grand titre de l'écran 1 ; le reste : l'écriture à la main (--hand)
const police = (px, titre) => { const h1 = titre && document.querySelector('h1[data-title]'), cs = h1 && getComputedStyle(h1);
  return cs ? `${cs.fontWeight} ${px}px ${cs.fontFamily}` : `400 ${px}px ${getComputedStyle(document.documentElement).getPropertyValue('--hand').trim() || 'cursive'}`; };
function compose(t0) {
  const W = O.W, H = O.H, T = TEXTE(), px = W < 600 ? 19 : W < 1000 ? 23 : 27, pt = px * (W < 600 ? 1.6 : 1.9), larg = Math.min(W * 0.84, px * 34), mots = [];
  let y = O.HAUT() + H * (W < 600 ? 0.1 : 0.1);
  const ligne = (liste, taille, titre) => {
    const font = police(taille, titre); tx.font = font; const esp = tx.measureText(' ').width * 1.1, ws = liste.map(m => tx.measureText(m).width);
    const lignes = []; let cur = [], lw = 0;
    liste.forEach((m, i) => { const w = ws[i]; if (cur.length && lw + esp + w > larg) { lignes.push([cur, lw]); cur = []; lw = 0; } lw += (cur.length ? esp : 0) + w; cur.push([m, w]); });
    if (cur.length) lignes.push([cur, lw]);
    lignes.forEach(([L, lw]) => { let x = (W - lw) / 2;
      L.forEach(([m, w]) => { const C = contours(m, font, taille); mots.push({ txt: m, titre, px: taille, boucles: C.boucles, w: C.w, h: C.h, hx: x - taille * 0.3, hy: y - C.y0, cx: C.w / 2, cy: C.h / 2,
        dx: 0, dy: 0, vx: 0, vy: 0, a: 0, va: 0, poids: 0, tenu: false }); x += w + esp; });
      y += taille * 1.45; });
    y += taille * 0.5;
  };
  ligne(T.titre.split(' '), pt, true); y += px * 0.3;
  T.par.forEach(p => ligne(p.split(' '), px, false));
  // l'horaire du stylo : chaque contour à la suite, une petite pause entre les mots (le stylo se lève), plus longue entre les lignes
  const v = px * 46; let t = 0, yl = null;
  mots.forEach(m => { if (yl != null) t += m.hy !== yl ? 0.3 : 0.07; yl = m.hy; m.t0 = t;
    m.boucles.forEach(b => { b.L = long(b); b.t0 = t; b.d = b.L / (m.titre ? v * 1.25 : v); t += b.d + 0.015; }); m.t1 = t; });
  return { mots, t0, total: t, W, H, fin: false };
}

/* ——— le monde : le stylo avance ; les mots, sur leur ressort ——— */
let pret = false, onFini = null;
const tps = () => M ? Wd.t - M.t0 : 0;
const ecrit = m => M && tps() >= m.t0;
const fini = m => M && tps() >= m.t1;
// un point d'un mot (coordonnées du mot) vers l'écran, et l'inverse
const vers = (m, lx, ly) => { const co = Math.cos(m.a), si = Math.sin(m.a), x = lx - m.cx, y = ly - m.cy; return [m.hx + m.dx + m.cx + co * x - si * y, m.hy + m.dy + m.cy + si * x + co * y]; };
const depuis = (m, X0, Y0) => { const co = Math.cos(-m.a), si = Math.sin(-m.a), x = X0 - (m.hx + m.dx + m.cx), y = Y0 - (m.hy + m.dy + m.cy); return [m.cx + co * x - si * y, m.cy + si * x + co * y]; };
const centreMot = m => vers(m, m.cx, m.cy);
// la pointe du stylo, maintenant
function pointe() {
  if (!M || M.fin) return null; const t = tps(); if (t < 0) return null;
  for (const m of M.mots) { if (t > m.t1 + 0.05) continue; if (t < m.t0) return null;
    for (const b of m.boucles) { if (t > b.t0 + b.d) continue; if (t < b.t0) return vers(m, b[0][0], b[0][1]); const p = pas(b, (t - b.t0) / b.d); return vers(m, p[0], p[1]); } }
  return null;
}
function pas(b, u) { let r = b.L * clamp(u, 0, 1); for (let i = 1; i < b.length; i++) { const a = b[i - 1], z = b[i], l = Math.hypot(z[0] - a[0], z[1] - a[1]); if (r <= l) { const k = l ? r / l : 0; return [a[0] + (z[0] - a[0]) * k, a[1] + (z[1] - a[1]) * k]; } r -= l; } return b[b.length - 1]; }

X.entre.push(() => { M = null; pret = false;
  const go = () => { pret = true; M = compose(Wd.t + (reduit ? -999 : 3)); };
  // (la police à la main doit être chargée, sinon les contours seraient ceux d'une autre)
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(police(24)), document.fonts.load(police(24, true))]).then(go, go); else go(); });
X.retour.push(() => { M = null; pret = false; });

X.pas.push((dt, cats) => {
  if (!M) return;
  // l'écran a changé de taille : on recompose, sans perdre où en était le stylo
  if (M.W !== O.W || M.H !== O.H) { const t0 = M.t0, f = M.fin; M = compose(t0); M.fin = f; }
  if (!M.fin && tps() > M.total + 2.5) { M.fin = true; if (onFini) onFini(); }
  const k = 60, amo = 7, ondes = O.E.ondes;
  M.mots.forEach(m => {
    if (!ecrit(m) || m.tenu) return;
    // le ressort : il revient à sa place ; les chats pendus le font ployer
    m.vx += (-k * m.dx - amo * m.vx) * dt; m.vy += (-k * m.dy - amo * m.vy + m.poids * 260) * dt; m.va += (-k * 1.4 * m.a - amo * m.va) * dt;
    m.dx += m.vx * dt; m.dy += m.vy * dt; m.a += m.va * dt; m.a = clamp(m.a, -0.9, 0.9);
    // l'onde d'un clic dans le vide : elle le secoue
    ondes.forEach(o => { if (o.plume && o.plume.has(m)) return; const [x, y] = centreMot(m), d = Math.hypot(x - o.x, y - o.y); if (d > Wd.s0 * 3) return;
      (o.plume || (o.plume = new Set())).add(m); const f = 520 * (1 - d / (Wd.s0 * 3)); m.vx += (x - o.x) / (d || 1) * f; m.vy += (y - o.y) / (d || 1) * f; m.va += rnd(-3, 3); });
    m.poids = 0;
  });
  // les chats qui passent : ils bousculent les mots (et rebondissent un peu)
  cats.forEach(c => { const S = c.sp; if (!S || c.held || !(S.m === 'derive' || S.m === 'nage')) return; const [x, y] = centreDe(c), r = rayon(c) * 0.8;
    M.mots.forEach(m => { if (!ecrit(m) || m.tenu) return; const [lx, ly] = depuis(m, x, y), px = clamp(lx, 0, m.w), py = clamp(ly, m.h * 0.2, m.h * 0.85), d = Math.hypot(lx - px, ly - py);
      if (d > r) return; const [wx, wy] = vers(m, px, py), nx = (x - wx) / (d || 1), ny = (y - wy) / (d || 1), vn = S.vx * nx + S.vy * ny;
      if (vn < 0) { const g = m.titre ? 0.25 : 0.45; m.vx += S.vx * g; m.vy += S.vy * g; m.va += (px - m.cx) / m.w * vn * -0.01; S.vx -= 1.3 * vn * nx; S.vy -= 1.3 * vn * ny;
        if (Math.random() < 0.3 && Wd.t - (m.tocT || -9) > 0.6) { m.tocT = Wd.t; Wd.fx.push({ k: 'txt', text: pick(['toc', 'poc', 'bonk']), x: wx, y: wy - 12, t0: Wd.t, life: 0.8, rot: rnd(-0.2, 0.2), size: 14 }); } }
      const o = r - d; c.x += nx * o; c.y += ny * o; }); });
  // les chats pendus : leur poids
  cats.forEach(c => { const S = c.sp; if (S && S.m === 'mot' && S.mot) S.mot.poids += Math.pow(rayon(c) / (Wd.s0 * 0.4), 2) * (S.mot.titre ? 0.25 : 0.6); });
});

/* ——— les chats : pendus à un mot, ou après la pointe du stylo ——— */
function pend(c, m) {
  const S = c.sp, [x, y] = centreDe(c), [lx] = depuis(m, x, y);
  Object.assign(S, { m: 'mot', mot: m, lx: clamp(lx, m.w * 0.1, m.w * 0.9), fin: Wd.t + rnd(4, 10) });
  m.vx += S.vx * 0.3; m.vy += S.vy * 0.3 + 60; m.va += rnd(-0.6, 0.6);
  S.ancre = () => S.mot ? vers(S.mot, S.lx, S.mot.h * 0.8) : null;
  if (Math.random() < 0.6) say(c, pick(en() ? ['hanging!', 'got it', 'wheee'] : ['accroché !', 'je lis…', 'wiii', 'c\'est écrit quoi ?']));
}
function lache(c, v) { const S = c.sp; S.ancre = null; S.mot = null; S.m = 'derive'; S.next = Wd.t + rnd(2, 4); S.lache = Wd.t; S.vx = rnd(-v, v); S.vy = rnd(-v, v * 0.3); S.w = rnd(-3, 3); }
X.mode.mot = (c, dt) => {
  const S = c.sp, m = S.mot; c.anim = 'agrippe'; c.spin *= Math.exp(-dt * 3);
  if (!m || !M || !M.mots.includes(m)) { lache(c, 60); return; }
  // il avance le long du mot, patte après patte ; secoué fort (ou lassé), il lâche
  S.lx = clamp(S.lx + Math.sin(S.t * 1.3) * 12 * dt, 0, m.w);
  if (Math.hypot(m.vx, m.vy) > 700 || Math.abs(m.va) > 6) { lache(c, 220); say(c, pick(['aaah !', 'mia !', 'trop fort'])); return; }
  if (Wd.t > S.fin) { lache(c, 120); if (Math.random() < 0.4) say(c, pick(['hop', 'bon.', 'suivant !'])); }
};
X.envie.push(c => {
  if (!M) return false; const S = c.sp;
  // pendant l'écriture : courir après la pointe du stylo
  if (!M.fin && Math.random() < 0.18 && pointe()) { S.m = 'nage'; S.fin = Wd.t + 4;
    S.cible = { get x() { const p = pointe(); return p ? p[0] : -9999; }, get y() { const p = pointe(); return p ? p[1] : -9999; }, r: 1,
      arrive: c => { c.sp.m = 'derive'; c.sp.next = Wd.t + rnd(1.5, 3); c.sp.vx += rnd(-60, 60); c.sp.vy -= 40; say(c, pick(en() ? ['got the pen!', 'mine!'] : ['le stylo !', 'attrapé !', 'à moi !', 'qu\'est-ce qu\'il écrit ?'])); } };
    return true; }
  // un mot déjà écrit : s'y pendre
  const L = M.mots.filter(m => fini(m) && !Wd.cats.some(o => o.sp && o.sp.mot === m)); if (!L.length || Math.random() < 0.55) return false;
  const m = pick(L), lx = rnd(0.2, 0.8) * m.w;
  S.m = 'nage'; S.fin = Wd.t + 6; S.cible = { get x() { return vers(m, lx, m.h)[0]; }, get y() { return vers(m, lx, m.h)[1] + rayon(c) * 0.6; }, r: 1.2, arrive: c => pend(c, m) };
  return true;
});

/* ——— attraper un mot, le lancer (il revient à sa place, sur son ressort) ——— */
const MOD = {
  drag(k, x, y) { const m = k.m; if (!m.tenu) { m.tenu = true; k.px = x; k.py = y; k.t = Wd.t; }
    const dt = Math.max(1 / 120, Wd.t - k.t); k.t = Wd.t; k.vx = (x - k.px) / dt; k.vy = (y - k.py) / dt; m.dx += x - k.px; m.dy += y - k.py; k.px = x; k.py = y;
    m.a += (clamp(-k.vx * 0.0004, -0.5, 0.5) - m.a) * 0.2;
    if (Math.hypot(k.vx, k.vy) > 1600) Wd.cats.forEach(c => { if (c.sp && c.sp.mot === m) { lache(c, 300); say(c, 'wiii !'); } }); },
  release(k, vx, vy) { const m = k.m; m.tenu = false; m.vx = clamp(vx || 0, -1600, 1600); m.vy = clamp(vy || 0, -1600, 1600); m.va += clamp((vx || 0) * 0.002, -5, 5); }
};
X.grab.push((x, y) => {
  if (!M) return null;
  for (const m of M.mots) { if (!ecrit(m)) continue; const [lx, ly] = depuis(m, x, y); if (lx > 0 && lx < m.w && ly > m.h * 0.15 && ly < m.h * 0.9) return { mod: MOD, m }; }
  return null;
});

/* ——— le dessin : au stylo blanc, le trait qui avance ; la pointe, au bout ——— */
X.fond.push((ctx, now) => {
  if (!M) return; const t = tps(); if (t < 0) return;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = `rgb(${BL})`;
  M.mots.forEach(m => {
    if (t < m.t0) return; ctx.save(); const [ox, oy] = vers(m, 0, 0); ctx.translate(ox, oy); ctx.rotate(m.a); ctx.lineWidth = m.titre ? 2.4 : 1.7;
    m.boucles.forEach(b => { if (t < b.t0) return; const u = (t - b.t0) / b.d; ctx.beginPath(); ctx.moveTo(b[0][0], b[0][1]);
      if (u >= 1) { for (let i = 1; i < b.length; i++) ctx.lineTo(b[i][0], b[i][1]); }
      else { let r = b.L * u; for (let i = 1; i < b.length && r > 0; i++) { const a = b[i - 1], z = b[i], l = Math.hypot(z[0] - a[0], z[1] - a[1]); if (r >= l) ctx.lineTo(z[0], z[1]); else ctx.lineTo(a[0] + (z[0] - a[0]) * r / l, a[1] + (z[1] - a[1]) * r / l); r -= l; } }
      ctx.stroke(); });
    ctx.restore(); });
  ctx.restore();
});
X.devant.push(ctx => { const p = pointe(); if (!p) return; ctx.save(); ctx.fillStyle = `rgb(${BL})`; ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, TAU); ctx.fill(); ctx.restore(); });

return { get M() { return M; }, pointe, get bas() { return M && M.mots.length ? Math.max(...M.mots.map(m => m.hy + m.h * 0.9)) : 0; }, set onFini(f) { onFini = f; }, get fini() { return !!(M && M.fin); } };
})();
