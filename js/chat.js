/* Un chat dessiné au stylo : rond, simple, imaginaire (pas un chat « vrai »), dessiné comme le reste en contours qui suivent la vue.
   Chaque volume est une silhouette gonflée : on dessine son contour vu de profil (une fonction R(θ)), le moteur le gonfle en coussin.
   Ainsi le contour à l'écran est celui qu'on a dessiné : un gros haricot, une miche de pain, un boudin (le chat long), une boule de poils.
   Les poils (fluff) sont des touffes pointues sur le bord : seul le bord se hérisse, le milieu reste lisse.
   La tête est vue de face, comme dans un dessin (le corps de profil, le visage vers nous) : deux yeux, un petit nez, une bouche en ω, des moustaches.

   Le repère du chat (en « unités chat ») : x vers l'avant (le nez), y vers le haut, z vers sa droite (vers nous quand il marche vers la droite) ; le sol est en y = 0.
   Le pantin :
     racine (posée à l'écran : position, taille) ─ vue (d'un peu au-dessus, de trois quarts)
       corps (position, tangage) ─ gonflé (écrasé / étiré) : le corps
                                 ├ quatre pattes courtes (elles balancent, se replient)
                                 ├ la queue (neuf segments)
                                 └ la tête (inclinée, tournée vers nous ou vers l'avant) : oreilles, yeux, pupilles, visage
   Une pose est un tableau de nombres (POSE : les noms des cases) ; le comportement (js/chats.js) écrit une pose cible, le chat la rejoint (Chat.step). */
window.Chat = (() => {
if (!window.Obj3D || !Obj3D.kit) return null;
const T = Obj3D.T, K = Obj3D.kit, TAU = Math.PI * 2;
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new T.Vector3(x, y, z);
function hsh(a, b) { let x = (Math.imul(a | 0, 374761393) + Math.imul((b | 0) + 1, 668265263)) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; }

/* ——— les chats : leur silhouette, leur visage, leur couleur de trait ———
   body [demi-longueur, demi-hauteur, rondeur (2 : ovale, plus : plus carré), demi-épaisseur], pear : le bas plus large
   head [demi-largeur, demi-hauteur, épaisseur], at : où se pose la tête (en fractions du corps), cheek : les joues
   ear [largeur, hauteur], legs [longueur, rayon, écart (fraction du corps)], tail [longueur, rayon, panache]
   fluff : les touffes (0 : lisse), eyes : rond, point, blase (sourcils lourds), heureux (∩ ∩) ; mouth : w (ω), grogne
   coat : uni, tigre, taches ; col : la couleur du trait (null : l'encre du thème) */
const TYPES = {
  boule:     { nom: 'la boule', body: [0.27, 0.25, 2, 0.24], pear: 0.1, head: [0.2, 0.165, 0.15], at: [0.42, 0.9], cheek: 0.12, ear: [0.075, 0.1], legs: [0.07, 0.042, 0.5], tail: [0.34, 0.045, 0.9], fluff: 0.075, eyes: 'rond', eye: 0.045, mouth: 'w', coat: 'uni', col: null },
  grincheux: { nom: 'le grincheux', body: [0.29, 0.21, 2.2, 0.2], pear: 0.08, head: [0.2, 0.15, 0.14], at: [0.62, 0.82], cheek: 0.14, ear: [0.07, 0.085], legs: [0.08, 0.04, 0.55], tail: [0.42, 0.045, 1.5], fluff: 0.06, eyes: 'blase', eye: 0.04, mouth: 'grogne', coat: 'uni', col: null },
  long:      { nom: 'le long', body: [0.52, 0.1, 2.4, 0.1], pear: 0, head: [0.15, 0.125, 0.11], at: [0.93, 0.7], cheek: 0.06, ear: [0.06, 0.08], legs: [0.1, 0.034, 0.78], tail: [0.5, 0.03, 0.3], fluff: 0, eyes: 'point', eye: 0.03, mouth: 'w', coat: 'tigre', col: 0xb8561c },
  pain:      { nom: 'la miche', body: [0.3, 0.17, 2.8, 0.17], pear: 0.05, head: [0.17, 0.14, 0.13], at: [0.78, 0.72], cheek: 0.08, ear: [0.065, 0.08], legs: [0.065, 0.04, 0.62], tail: [0.4, 0.035, 0.4], fluff: 0, eyes: 'rond', eye: 0.035, mouth: 'w', coat: 'taches', col: null },
  rose:      { nom: 'la gourmande', body: [0.26, 0.21, 2.1, 0.21], pear: 0.12, head: [0.2, 0.16, 0.14], at: [0.55, 0.88], cheek: 0.14, ear: [0.075, 0.09], legs: [0.07, 0.045, 0.52], tail: [0.36, 0.04, 0.5], fluff: 0, eyes: 'heureux', eye: 0.04, mouth: 'w', coat: 'uni', blush: 1, col: 0xb0485e },
  noir:      { nom: 'le noir', body: [0.26, 0.16, 2.3, 0.15], pear: 0.04, head: [0.16, 0.14, 0.13], at: [0.8, 0.8], cheek: 0.05, ear: [0.07, 0.11], legs: [0.13, 0.034, 0.6], tail: [0.46, 0.032, 0.2], fluff: 0, eyes: 'rond', eye: 0.05, mouth: 'w', coat: 'uni', col: 0x3a3488 },
  tigre:     { nom: 'le tigré', body: [0.28, 0.18, 2.3, 0.17], pear: 0.05, head: [0.17, 0.14, 0.13], at: [0.78, 0.78], cheek: 0.08, ear: [0.068, 0.09], legs: [0.1, 0.038, 0.58], tail: [0.4, 0.036, 0.4], fluff: 0.03, eyes: 'point', eye: 0.032, mouth: 'w', coat: 'tigre', col: 0x2f5f8e },
  mince:     { nom: 'le rêveur', body: [0.23, 0.19, 2.6, 0.16], pear: 0.06, head: [0.16, 0.135, 0.12], at: [0.62, 0.9], cheek: 0.05, ear: [0.065, 0.1], legs: [0.09, 0.036, 0.52], tail: [0.42, 0.032, 0.3], fluff: 0, eyes: 'heureux', eye: 0.036, mouth: 'w', coat: 'uni', col: 0x3e6b48 }
};
const IDS = Object.keys(TYPES);

/* ——— une silhouette gonflée ———
   Elle est modelée dix fois plus grande (Z), puis montée réduite : le moteur confond les sommets trop proches (au 1/400). 
   R(θ) : le contour, vu de face (dans le plan x, y) ; D : la demi-épaisseur (le long de z).
   Un point : (R(θ) sin φ cos θ, R(θ) sin φ sin θ, D cos φ) ; φ = π/2 est le bord, où poussent les touffes (tuft : leur longueur, k : leur nombre). */
const Z = 10, zup = a => a.map(v => v * Z);
function blob(R, D, o) {
  o = o || {}; const k = o.k || 0, tuft = o.tuft || 0, n = k ? k * 8 : (o.n || 64), m = o.m || 9, pos = [], idx = [];
  const spike = (th, j) => { if (!tuft) return 0; const u = th / TAU * k, i = Math.floor(u), f = u - i, tri = 1 - Math.abs(2 * f - 1); return tuft * (0.55 + 0.45 * hsh(i, j)) * Math.pow(tri, 1.7) * (o.where ? o.where(th) : 1); };
  pos.push(0, 0, D);
  for (let j = 1; j < 2 * m; j++) {
    const ph = j / (2 * m) * Math.PI, s = Math.sin(ph), w = Math.pow(s, 10);
    for (let i = 0; i < n; i++) { const th = i / n * TAU, r = R(th) * (1 + spike(th, 7) * w) * s; pos.push(r * Math.cos(th), r * Math.sin(th), D * Math.cos(ph)); }
  }
  pos.push(0, 0, -D);
  const last = 1 + (2 * m - 1) * n, v = (j, i) => 1 + (j - 1) * n + (i % n);
  for (let i = 0; i < n; i++) { idx.push(0, v(1, i), v(1, i + 1)); idx.push(last, v(2 * m - 1, i + 1), v(2 * m - 1, i)); }
  for (let j = 1; j < 2 * m - 1; j++) for (let i = 0; i < n; i++) { const a = v(j, i), b = v(j, i + 1), c = v(j + 1, i), d = v(j + 1, i + 1); idx.push(a, c, b, b, c, d); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos.map(v => v * Z), 3)); g.setIndex(idx);
  return g;
}
// un contour ovale, plus ou moins carré (n), un peu poire (pear : le bas plus large)
const oval = (a, b, n, pear) => th => { const c = Math.abs(Math.cos(th)) / a, s = Math.abs(Math.sin(th)) / b; return Math.pow(Math.pow(c, n) + Math.pow(s, n), -1 / n) * (1 - (pear || 0) * Math.sin(th)); };
// sur une silhouette gonflée : la hauteur z de la surface au point (u, v) du plan
const zOn = (R, D) => (u, v) => { const r = Math.hypot(u, v), q = r / R(Math.atan2(v, u)); return q >= 1 ? 0 : D * Math.sqrt(1 - q * q); };
// un point de la surface par ses angles (θ autour, φ du devant au dos)
const onBlob = (R, D, th, ph, k) => { const r = R(th) * Math.sin(ph) * (k || 1.01); return [r * Math.cos(th), r * Math.sin(th), D * Math.cos(ph) * (k || 1.01)]; };
const segs = P => { const out = []; for (let i = 0; i < P.length - 1; i++) out.push(...P[i], ...P[i + 1]); return out; };
// une gélule : le profil [t, r] d'un fuseau à bouts arrondis, de t = 0 à t = len
function capsule(len, r0, r1, n) {
  n = n || 4; const P = [];
  for (let k = 0; k <= n; k++) { const a = k / n * Math.PI / 2; P.push([-r0 * Math.cos(a) * 0.85, r0 * Math.sin(a)]); }
  for (let k = 0; k <= n; k++) { const a = k / n * Math.PI / 2; P.push([len + r1 * Math.sin(a) * 0.9, r1 * Math.cos(a)]); }
  return P;
}

/* ——— les mesures d'un chat ——— */
function dims(b) {
  const [a, h, , d] = b.body, R = oval(a, h, b.body[2], b.pear);
  const hipY = -R(-Math.PI / 2) * 0.5;
  return {
    a, h, d, R, hipY,
    hips: { f: [a * b.legs[2], hipY, d * 0.5], h: [-a * b.legs[2], hipY, d * 0.5] },
    ll: b.legs[0], lr: b.legs[1],
    head: [a * b.at[0], h * b.at[1]], tail: [-R(Math.PI) * 0.88, h * 0.15],
    stand: -hipY + b.legs[0] + b.legs[1] * 0.8          // la hauteur du centre du corps, debout
  };
}

/* ——— les pièces : modelées une fois par chat (Obj3D.piece les garde) ——— */
function build(id) {
  const b = TYPES[id], D = dims(b), P = {}, key = k => 'chat:' + id + ':' + k;
  // le corps : sa silhouette, ses touffes (moins dessous, là où il se pose), son pelage
  P.body = Obj3D.piece(key('corps'), B => {
    B.solid(blob(D.R, D.d, { tuft: b.fluff, k: b.fluff ? 30 : 0, n: 72, where: th => Math.sin(th) < -0.6 ? 0.25 : 1 }));
    if (b.coat === 'tigre') [0.3, 0.4, 0.5, 0.6, 0.7, 0.8].forEach((f, i) => [1, -1].forEach(sd => {
      const th = f * Math.PI, Q = []; for (let q = 0; q <= 6; q++) { const ph = Math.PI / 2 - sd * q / 6 * (0.55 + 0.15 * (i % 2)); Q.push(onBlob(D.R, D.d, th + Math.sin(q * 0.9) * 0.03, ph)); } B.lines(zup(segs(Q))); }));
    if (b.coat === 'taches') [[2.2, 0.7, 0.3], [1.2, 0.95, 0.22], [2.9, 1.1, 0.2], [0.6, 0.55, 0.16]].forEach(([th, ph, r], i) => [1, -1].forEach(sd => {
      const Q = []; for (let q = 0; q <= 16; q++) { const a = q / 16 * TAU, g = 1 + (hsh(q % 16, i) - 0.5) * 0.35; Q.push(onBlob(D.R, D.d, th + Math.cos(a) * r * g, sd > 0 ? ph + Math.sin(a) * r * g * 0.8 : Math.PI - ph - Math.sin(a) * r * g * 0.8)); } B.lines(zup(segs(Q))); }));
    if (b.fluff) [[-0.35, 0.45], [-0.15, 0.5], [0.05, 0.47]].forEach(([th, ph]) => [1, -1].forEach(sd => {   // quelques mèches sur le poitrail
      const c = onBlob(D.R, D.d, th, sd > 0 ? ph : Math.PI - ph), e = onBlob(D.R, D.d, th - 0.12, sd > 0 ? ph + 0.18 : Math.PI - ph - 0.18); B.soft(zup([...c, ...e])); }));
  });
  // la tête : vue de face, plus large que haute, les joues rondes (ou en touffes)
  const [ha, hh, hd] = b.head, cheek = b.cheek, hR0 = oval(ha, hh, 2.3, 0);
  const HR = th => hR0(th) * (1 + cheek * (Math.exp(-Math.pow((th - (TAU - 0.5)) / 0.4, 2)) + Math.exp(-Math.pow((th - (Math.PI + 0.5)) / 0.4, 2)) + Math.exp(-Math.pow((th + 0.5) / 0.4, 2))));
  const zf = zOn(HR, hd), F = (u, v) => [u, v, zf(u, v) + hd * 0.04];
  P.head = Obj3D.piece(key('tete'), B => B.solid(blob(HR, hd, { tuft: b.fluff ? b.fluff * 1.3 : 0, k: b.fluff ? 26 : 0, n: 64, m: 8, where: th => { const s = Math.sin(th); return s < 0.1 && s > -0.85 ? 1 : 0; } })));
  // les oreilles : un triangle arrondi, aplati ; le dedans d'un trait
  const [ew, eh] = b.ear, epr = [[0, 0], [ew, 0], [ew * 0.74, eh * 0.42], [ew * 0.3, eh * 0.8], [ew * 0.08, eh * 0.97], [0, eh]], er = y => { for (let i = 1; i < epr.length; i++) if (y <= epr[i][1]) { const p = epr[i - 1], q = epr[i], t = (y - p[1]) / (q[1] - p[1]); return lerp(p[0], q[0], t); } return 0; };
  P.ear = Obj3D.piece(key('oreille'), B => {
    B.solid(K.tf(K.lathe(epr, 20), 0, 0, [1, 1, 0.35]));
    const Q = []; for (let q = 0; q <= 8; q++) { const t = q / 8, y = eh * (0.22 + 0.6 * Math.sin(t * Math.PI)), x = (t - 0.5) * 2 * er(y) * 0.5; Q.push([x, y, Math.sqrt(Math.max(0, er(y) ** 2 - x * x)) * 0.35 + 0.004]); } B.soft(segs(Q));
  });
  // le visage : les yeux, la bouche, les moustaches, en traits posés sur la tête
  const e = b.eye, ex = ha * 0.42, ey = hh * 0.1, arc = (cx, cy, rx, ry, a0, a1, n) => { const Q = []; n = n || 16; for (let q = 0; q <= n; q++) { const a = lerp(a0, a1, q / n); Q.push(F(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); } return segs(Q); };
  const dot = (B, cx, cy, r, half) => { for (let k = 1; k <= 7; k++) { const rr = r * k / 7; B.lines(half ? arc(cx, cy, rr, rr, Math.PI, TAU, 12) : arc(cx, cy, rr, rr, 0, TAU, 14)); } if (half) B.lines(segs([F(cx - r, cy), F(cx + r, cy)])); };
  const lid = e * 0.15;
  P.eyes = Obj3D.piece(key('yeux'), B => [-1, 1].forEach(s => {
    const cx = s * ex;
    if (b.eyes === 'rond') B.lines(arc(cx, ey, e, e * 1.08, 0, TAU, 22));
    if (b.eyes === 'blase') {
      const a0 = Math.asin(lid / e); B.lines(arc(cx, ey, e, e, Math.PI - a0, TAU + a0, 18)); B.lines(segs([F(cx - e * 1.15, ey + lid), F(cx + e * 1.15, ey + lid)]));
      for (let k = 0; k < 4; k++) { const y0 = ey + e * (0.7 + k * 0.1), dy = e * 0.25; B.lines(segs([F(cx - s * e * 1.3, y0 + dy), F(cx + s * e * 1.25, y0 - dy)])); }   // les sourcils lourds
    }
    if (b.eyes === 'heureux') B.lines(arc(cx, ey - e * 0.3, e, e * 0.75, Math.PI * 0.05, Math.PI * 0.95, 12));
  }));
  // les pupilles : un point plein, qui regarde autour (le groupe se déplace)
  P.pup = Obj3D.piece(key('pupilles'), B => [-1, 1].forEach(s => {
    if (b.eyes === 'rond') dot(B, s * ex + e * 0.1, ey - e * 0.05, e * 0.55);
    if (b.eyes === 'point') dot(B, s * ex, ey, e * 0.55);
    if (b.eyes === 'blase') dot(B, s * ex, ey + lid, e * 0.55, true);
  }));
  // les yeux clos (le sommeil, un clignement) ; les yeux ravis (∩ ∩)
  P.shut = Obj3D.piece(key('clos'), B => [-1, 1].forEach(s => B.lines(arc(s * ex, ey + e * 0.25, e, e * 0.6, Math.PI * 1.08, Math.PI * 1.92, 12))));
  P.joy = Obj3D.piece(key('ravi'), B => [-1, 1].forEach(s => B.lines(arc(s * ex, ey - e * 0.3, e, e * 0.75, Math.PI * 0.05, Math.PI * 0.95, 12))));
  // le nez (un petit triangle plein), la bouche (ω ou grognon), les moustaches, les joues roses
  const ny = -hh * 0.2, nw = ha * 0.07;
  P.face = Obj3D.piece(key('visage'), B => {
    for (let k = 1; k <= 3; k++) { const w = nw * k / 3; B.lines(segs([F(-w, ny + w * 0.35), F(w, ny + w * 0.35), F(0, ny - w * 0.55), F(-w, ny + w * 0.35)])); }
    if (b.mouth === 'w') [-1, 1].forEach(s => B.lines(arc(s * nw * 1.1, ny - nw * 0.6, nw * 1.1, nw * 1.1, Math.PI * 1.05, Math.PI * 1.95, 10)));
    else { B.lines(segs([F(0, ny - nw * 0.5), F(0, ny - nw * 1.2)])); B.lines(arc(0, ny - nw * 2.6, nw * 1.5, nw * 1.3, Math.PI * 0.2, Math.PI * 0.8, 10)); }
    [-1, 1].forEach(s => [0, 1].forEach(k => {
      const x0 = s * ha * 0.58, y0 = ny - hh * 0.02 - k * hh * 0.14, x1 = s * ha * (1.28 + k * 0.08), y1 = y0 + hh * (0.16 - k * 0.2);
      B.lines(segs([F(x0, y0), [lerp(x0, x1, 0.5), lerp(y0, y1, 0.5) + hh * 0.03, hd * 0.25], [x1, y1, hd * 0.1]]));
    }));
    if (b.blush) [-1, 1].forEach(s => [0, 1, 2].forEach(k => { const x = s * ha * 0.62 + (k - 1) * ha * 0.09; B.soft(segs([F(x - ha * 0.03, ny - hh * 0.02), F(x + ha * 0.03, ny + hh * 0.1)])); }));
    if (b.coat === 'tigre') [-1, 0, 1].forEach(k => B.lines(segs([F(k * ha * 0.14, hh * 0.72 - Math.abs(k) * hh * 0.08), F(k * ha * 0.12, hh * 0.46 - Math.abs(k) * hh * 0.06)])));
  });
  // la bouche ouverte (le miaulement, le feulement) : un petit ovale sous le nez
  P.mouth = Obj3D.piece(key('bouche'), B => B.lines(arc(0, ny - nw * 2.4, nw * 1.2, nw * 1.5, 0, TAU, 14)));
  // les pattes : de petites gélules (du haut, y = 0, vers le bas)
  P.leg = Obj3D.piece(key('patte'), B => B.solid(K.lathe(capsule(D.ll, D.lr * 0.95, D.lr * 1.08).map(q => [q[1], -q[0]]), 14)));
  // la queue : neuf segments (en panache pour certains), le bout un peu plus fin
  const n = 9, sl = b.tail[0] / n, tr = b.tail[1], bush = b.tail[2], rAt = t => tr * (1 + bush * Math.pow(Math.sin(Math.min(1, t * 1.15) * Math.PI), 0.9) * 0.9) * (1 - 0.25 * t) * (t > 0.92 ? 1 - (t - 0.92) * 4 : 1);
  P.tail = []; for (let i = 0; i < n; i++) { const r0 = rAt(i / n), r1 = rAt((i + 1) / n); P.tail.push(Obj3D.piece(key('queue' + i), B => B.solid(K.latheX(capsule(sl, r0, r1, 3), 12)))); }
  return { P, D, n, sl, HR, F };
}

/* ——— une pose : les noms des cases ———
   x, y : le centre du corps (y : sa hauteur) · pitch : le tangage (positif : le nez en l'air) · sqz : écrasé (−) / étiré en hauteur (+) · stretch : allongé
   look : le visage vers nous (1) ou vers l'avant (0) · hyaw, hnod, htilt : la tête qui tourne, hoche, penche · hx, hy : la tête déplacée
   ear : les oreilles couchées (1) ou dressées (−1) · eyes : ouverts (0), clos (1), ravis (2) · mouth : ouverte (1) · px, py : où regardent les pupilles
   fl, fr, hl, hr : l'angle de chaque patte (positif : vers l'avant) · fk, hk : pattes avant, arrière dépliées (1) ou repliées (0)
   tailUp, tailCurl, tailSide, tailWave, tailPhase : la queue · puff : hérissé */
const POSE = ['x', 'y', 'pitch', 'sqz', 'stretch', 'look', 'hyaw', 'hnod', 'htilt', 'hx', 'hy', 'ear', 'eyes', 'mouth', 'px', 'py',
  'fl', 'fr', 'hl', 'hr', 'fk', 'hk', 'tailUp', 'tailCurl', 'tailSide', 'tailWave', 'tailPhase', 'puff'];
const I = {}; POSE.forEach((k, i) => { I[k] = i; });
const NP = POSE.length;
const LEGS = new Set(['fl', 'fr', 'hl', 'hr', 'fk', 'hk'].map(k => I[k]));
const STEP = new Set(['eyes', 'mouth'].map(k => I[k]));   // les expressions changent d'un coup

/* ——— un chat ——— */
let uid = 0;
function create(id, o) {
  o = o || {}; id = TYPES[id] ? id : IDS[Math.floor(Math.random() * IDS.length)];
  const b = TYPES[id], M = build(id), D = M.D, P = M.P;
  const mats = Obj3D.mats(o.color ?? b.col ?? undefined), all = [], G = () => new T.Group();
  const put = (pp, parent) => { const q = Obj3D.mount(pp, mats); parent.add(q.g); all.push(q); return q; };
  const root = G(), view = G(), body = G(), puffy = G(), headA = G(), head = G(), pupils = G();
  root.add(view); view.add(body); body.add(puffy); body.add(headA); headA.add(head); head.add(pupils);
  put(P.body, puffy).g.scale.setScalar(1 / 10); put(P.head, head).g.scale.setScalar(1 / 10); put(P.face, head); put(P.pup, pupils);
  const eyes = put(P.eyes, head), shut = put(P.shut, head), joy = put(P.joy, head), mouth = put(P.mouth, head);
  // les oreilles : posées sur le haut du crâne, un peu écartées
  const ears = [-1, 1].map(s => { const g = G(), th = Math.PI / 2 - s * 0.62, r = M.HR(th) * 0.8; g.position.set(Math.cos(th) * r, Math.sin(th) * r, b.head[2] * 0.1); g.userData.s = s; head.add(g); put(P.ear, g); return g; });
  // les pattes : devant (f), derrière (h), à gauche (−z) et à droite (+z)
  const legs = {}; [['fl', 'f', -1], ['fr', 'f', 1], ['hl', 'h', -1], ['hr', 'h', 1]].forEach(([k, w, s]) => { const g = G(); g.userData.hip = [D.hips[w][0], D.hips[w][1], s * D.hips[w][2]]; body.add(g); const q = put(P.leg, g); legs[k] = { g, m: q.g }; });
  // la queue
  const tail = [], tailM = []; const tb = G(); body.add(tb); let tp = tb;
  P.tail.forEach((pp, i) => { const g = G(); if (i) g.position.set(M.sl, 0, 0); tp.add(g); tailM.push(put(pp, g).g); tail.push(g); tp = g; });
  const R = Obj3D.rig(root, all);
  const cat = {
    id: ++uid, breed: id, b, D, root, view, body, puffy, headA, head, pupils, ears, legs, tail, tailB: tb, tailM, eyes, shut, joy, mouth, mats: [mats], R, all,
    cur: new Float32Array(NP), tgt: new Float32Array(NP), rate: 10,
    // où il est : à l'écran (px), sa taille (px par unité), vers où il regarde (face : 1 à droite, −1 à gauche), un tour entier du corps (spin), sa profondeur (z)
    x: 0, y: 0, s: 160, face: 1, spin: 0, z: 0, a: 1
  };
  rest(cat, cat.cur); cat.tgt.set(cat.cur);
  return cat;
}
function destroy(c) { if (c && c.R) Obj3D.unrig(c.R); if (c) c.R = null; }

/* ——— la pose de base : debout, le visage vers nous ——— */
function rest(c, p) {
  p.fill(0);
  p[I.y] = c.D.stand; p[I.look] = 0.85; p[I.fk] = 1; p[I.hk] = 1;
  p[I.tailUp] = 0.9; p[I.tailCurl] = 0.8; p[I.tailWave] = 0.6;
  return p;
}
// les pattes gardées verticales quand le corps penche (assis, debout sur les pattes arrière)
function plumb(p, k) { const a = -p[I.pitch] * (k ?? 1); p[I.fl] = a; p[I.fr] = a; p[I.hl] = a; p[I.hr] = a; }
/* les allures : les pattes balancent (en diagonale au pas et au trot, par paires au galop), le corps sautille */
const GAITS = { pas: { amp: 0.5, bob: 0.012, lift: 0.3 }, trot: { amp: 0.65, bob: 0.018, lift: 0.4 }, galop: { amp: 0.95, bob: 0.05, lift: 0.5 } };
function gait(c, p, g, ph, k) {
  const G = GAITS[g], A = G.amp * k, w = ph * TAU;
  const off = g === 'galop' ? { fl: 0, fr: 0.08, hl: 0.5, hr: 0.58 } : { fl: 0, hr: 0, fr: 0.5, hl: 0.5 };
  for (const L in off) { const a = w + off[L] * TAU; p[I[L]] += Math.sin(a) * A; if (L === 'fl' || L === 'fr') p[I.fk] = Math.min(p[I.fk], 1 - Math.max(0, Math.cos(a)) * G.lift * k); else p[I.hk] = Math.min(p[I.hk], 1 - Math.max(0, Math.cos(a)) * G.lift * k); }
  if (g === 'galop') { p[I.pitch] += Math.sin(w) * 0.14 * k; p[I.stretch] += Math.cos(w) * 0.08 * k; p[I.y] += Math.max(0, Math.sin(w + 0.8)) * G.bob * k; p[I.sqz] -= Math.cos(w) * 0.05 * k; }
  else { p[I.y] += Math.abs(Math.sin(w)) * G.bob * k; p[I.pitch] += Math.sin(w * 2) * 0.02 * k; p[I.htilt] += Math.sin(w) * 0.06 * k; }
}

/* ——— poser le chat à l'écran, puis ses os ——— */
const qa = new T.Quaternion(), qb = new T.Quaternion(), AX = V(1, 0, 0), AY = V(0, 1, 0);
function step(c, dt, opts) {
  const k = 1 - Math.exp(-dt * c.rate), kl = 1 - Math.exp(-dt * (c.legRate || c.rate * 2.2));
  for (let i = 0; i < NP; i++) c.cur[i] = STEP.has(i) ? c.tgt[i] : c.cur[i] + (c.tgt[i] - c.cur[i]) * (LEGS.has(i) ? kl : k);
  apply(c, opts);
}
function apply(c, opts) {
  const p = c.cur, D = c.D, b = c.b;
  // la vue : de trois quarts, d'un peu au-dessus ; tourné vers la gauche : un demi-tour (le corps est le même des deux côtés)
  const yaw = c.face > 0 ? -VIEW.yaw : Math.PI + VIEW.yaw;
  c.root.position.set(c.x, -c.y, c.z); c.root.scale.setScalar(c.s);
  qa.setFromAxisAngle(AX, VIEW.tilt); qb.setFromAxisAngle(AY, yaw); qa.multiply(qb); c.view.quaternion.copy(qa);
  // le corps : sa place, son tangage, écrasé ou étiré
  const sx = 1 + p[I.stretch] - p[I.sqz] * 0.5, sy = 1 + p[I.sqz], pz = 1 + p[I.puff] * 0.12;
  c.body.position.set(p[I.x], p[I.y], 0); c.body.rotation.set(0, 0, p[I.pitch] + c.spin);
  c.puffy.scale.set(sx * pz, sy * pz, pz);
  // les pattes : accrochées sous le corps (qui s'écrase ou s'étire), elles balancent et se replient
  for (const k in c.legs) { const L = c.legs[k], h = L.g.userData.hip, e = p[I[k[0] === 'f' ? 'fk' : 'hk']];
    L.g.position.set(h[0] * sx, h[1] * sy, h[2]); L.g.rotation.set(0, 0, p[I[k]]); L.m.scale.set(1, lerp(0.2, 1, c01(e)), 1); }
  // la tête : droite quand le corps penche (tant qu'il ne tourne pas sur lui-même), tournée vers nous (look) ou vers l'avant
  c.headA.position.set(D.head[0] * sx + p[I.hx], D.head[1] * sy + p[I.hy], c.face * D.d * 0.5); c.headA.rotation.set(0, 0, -p[I.pitch] + p[I.htilt]);   // la tête devant le corps (vers nous)
  const toUs = c.face > 0 ? VIEW.yaw : Math.PI - VIEW.yaw;
  c.head.rotation.set(p[I.hnod], lerp(Math.PI / 2, toUs, c01(p[I.look])) + p[I.hyaw], 0, 'YXZ');
  c.pupils.position.set(p[I.px] * b.eye * 0.35, p[I.py] * b.eye * 0.3, 0);
  c.ears.forEach(e => { const s = e.userData.s, f = p[I.ear]; e.rotation.set(-f * 0.5, 0, s * (0.35 + f * 0.7)); e.scale.set(1, 1 - Math.max(0, f) * 0.35, 1); });
  const ey = p[I.eyes], happy = b.eyes === 'heureux';
  c.shut.g.visible = ey >= 0.5 && ey < 1.5; c.joy.g.visible = ey >= 1.5 || (happy && ey < 0.5);
  c.eyes.g.visible = ey < 0.5 && !happy; c.pupils.visible = ey < 0.5 && !happy;
  c.mouth.g.visible = p[I.mouth] > 0.5;
  // la queue : elle monte (tailUp), s'enroule (tailCurl), part de côté (tailSide), ondule (tailWave, tailPhase) ; hérissée (puff)
  c.tailB.position.set(D.tail[0] * sx, D.tail[1] * sy, 0);
  const n = c.tail.length, puff = 1 + p[I.puff];
  c.tail.forEach((g, i) => { const t = i / (n - 1);
    const rz = i === 0 ? Math.PI - p[I.tailUp] : -p[I.tailCurl] * 0.24 * (0.3 + t * 1.2) + Math.sin(p[I.tailPhase] - t * 2.4) * p[I.tailWave] * 0.1 * t;
    const ry = (i === 0 ? p[I.tailSide] * 0.5 : p[I.tailSide] * 0.15) + Math.cos(p[I.tailPhase] * 0.7 - t * 2) * p[I.tailWave] * 0.08 * t;
    g.rotation.set(0, ry, rz); c.tailM[i].scale.set(1, puff, puff); });
  const a = c.a * (opts && opts.a !== undefined ? opts.a : 1);
  c.mats.forEach(m => { m.line.opacity = Math.min(1, 0.95 * a); m.soft.opacity = 0.5 * a; });
  c.root.visible = a > 0.01;
}
/* où est, à l'écran, un point d'un os (en unités chat, dans le repère de l'os) */
const wv = V(0, 0, 0);
function where(c, g, pt) { c.root.updateMatrixWorld(true); wv.set(pt ? pt[0] : 0, pt ? pt[1] : 0, pt ? pt[2] : 0); g.localToWorld(wv); return [wv.x, -wv.y, wv.z]; }

// la vue commune : tout est vu d'un peu au-dessus (les objets du décor aussi : js/univers.js)
const VIEW = { tilt: 0.2, yaw: 0.34 };
return { TYPES, BREEDS: TYPES, IDS, POSE, I, NP, create, destroy, rest, plumb, gait, GAITS, step, apply, where, VIEW, dims, c01, sm, lerp };
})();
