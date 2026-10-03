/* Un chat dessiné au stylo : rond, mignon, imaginaire (pas un chat « vrai »), en contours épais qui suivent la vue.
   Chaque volume est une silhouette gonflée : on dessine son contour (une fonction R(θ)), le moteur le gonfle en coussin.
   Le contour à l'écran est donc celui qu'on a dessiné : une boule de poils, un haricot, une miche, un boudin (le chat long).
   La tête est vue de face, comme dans un dessin (le corps de profil, le visage vers nous) ; les oreilles font partie de son contour.
   Les yeux sont grands, les pupilles pleines avec un reflet ; les pattes finissent par de vraies petites pattes (et leurs doigts).

   Le repère du chat (en « unités chat ») : x vers l'avant (le nez), y vers le haut, z vers sa droite (vers nous quand il marche vers la droite) ; le sol est en y = 0.
   Le pantin :
     racine (posée à l'écran : position, taille) ─ vue (d'un peu au-dessus, de trois quarts)
       corps (position, tangage) ─ gonflé (écrasé / étiré) : le corps
                                 ├ quatre pattes : la jambe (qui s'allonge, se replie) et la patte au bout
                                 ├ les cuisses (assis : deux gros ronds sur les côtés, la patte arrière devant)
                                 ├ la queue (neuf segments)
                                 └ la tête (droite, tournée vers nous ou vers l'avant) : les yeux, les pupilles, le visage
   Une pose est un tableau de nombres (POSE : les noms des cases) ; le comportement (js/chats.js) écrit une pose cible, le chat la rejoint (Chat.step). */
window.Chat = (() => {
if (!window.Obj3D || !Obj3D.kit) return null;
const T = Obj3D.T, K = Obj3D.kit, TAU = Math.PI * 2;
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new T.Vector3(x, y, z);
function hsh(a, b) { let x = (Math.imul(a | 0, 374761393) + Math.imul((b | 0) + 1, 668265263)) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
const PEN = 2.8;
// un seul contour autour du chat (?trait=pieces : l'ancien dessin, pièce par pièce, pour comparer)
const UNI = !/[?&]trait=pieces/.test(location.search);   // l'épaisseur du trait, en px

/* ——— les chats : chacun sa silhouette, sa tête, ses yeux, sa couleur ———
   s : la taille · body [demi-longueur, demi-hauteur, rondeur (2 : ovale, plus : plus carré), demi-épaisseur], pear : le bas plus large, arch : le dos qui monte vers l'arrière
   head [demi-largeur, demi-hauteur, épaisseur], at : où se pose la tête (fractions du corps), cheek : les joues
   ear [hauteur, largeur (en angle), écart depuis le sommet (en angle)], legs [longueur, rayon, écart (fraction du corps)], tail [longueur, rayon, panache]
   Depuis le 27/09, tous dans le style de la miche (Mathieu) : lisses, deux points pour les yeux, peu de détails.
   fluff : les touffes (0 : lisse) · eyes : rond (grands yeux, pupille et reflet), brillant (tout noir, deux reflets), point (un ovale plein, un gros et un petit reflet, à la kawaii), blase (sourcils lourds), heureux (∩ ∩) · brow : un sourcil froncé
   mouth : w (ω), grogne, blep (le bout de la langue) · coat : uni, tigre, taches · blush : les joues roses · col : la couleur du trait (null : l'encre du thème) */
const TYPES = {
  boule:     { nom: 'la boule', s: 1.15, body: [0.29, 0.27, 2, 0.26], pear: 0.1, head: [0.22, 0.18, 0.16], at: [0.42, 0.9], cheek: 0.14, ear: [0.07, 0.3, 0.62], legs: [0.07, 0.045, 0.5], tail: [0.34, 0.045, 0.9], fluff: 0, eyes: 'point', eye: 0.054, mouth: 'w', coat: 'uni', col: null },
  grincheux: { nom: 'le grincheux', s: 1.05, body: [0.3, 0.2, 2.3, 0.2], pear: 0.06, head: [0.22, 0.15, 0.14], at: [0.62, 0.8], cheek: 0.16, ear: [0.05, 0.26, 0.72], legs: [0.1, 0.042, 0.55], tail: [0.42, 0.045, 1.6], fluff: 0, eyes: 'point', eye: 0.048, brow: 1, mouth: 'grogne', coat: 'uni', col: 0x4a3b30 },
  long:      { nom: 'le long', s: 1, body: [0.52, 0.1, 2.4, 0.1], pear: 0, head: [0.15, 0.13, 0.11], at: [0.93, 0.7], cheek: 0.06, ear: [0.07, 0.3, 0.66], legs: [0.13, 0.034, 0.78], tail: [0.5, 0.03, 0.3], fluff: 0, eyes: 'point', eye: 0.037, mouth: 'w', coat: 'uni', col: 0xc0561a },
  chaton:    { nom: 'le chaton', s: 0.8, body: [0.19, 0.14, 2.2, 0.14], pear: 0.08, head: [0.21, 0.18, 0.15], at: [0.6, 1.05], cheek: 0.1, ear: [0.1, 0.32, 0.6], legs: [0.1, 0.036, 0.55], tail: [0.3, 0.03, 0.3], fluff: 0, eyes: 'brillant', eye: 0.06, mouth: 'blep', coat: 'uni', blush: 0, col: 0x6e4fb0 },
  bleu:      { nom: 'le bleu', s: 1.05, body: [0.27, 0.15, 2.4, 0.15], pear: 0, arch: 0.35, head: [0.16, 0.14, 0.13], at: [0.86, 0.72], cheek: 0.04, ear: [0.12, 0.3, 0.68], legs: [0.18, 0.04, 0.62], tail: [0.5, 0.036, 0.25], fluff: 0, eyes: 'point', eye: 0.041, mouth: 'w', coat: 'uni', col: 0x1d20a6 },
  miche:     { nom: 'la miche', s: 1, body: [0.3, 0.17, 2.8, 0.17], pear: 0.05, head: [0.18, 0.14, 0.13], at: [0.78, 0.72], cheek: 0.08, ear: [0.045, 0.34, 0.66], legs: [0.09, 0.042, 0.62], tail: [0.4, 0.035, 0.4], fluff: 0, eyes: 'point', eye: 0.041, mouth: 'w', coat: 'taches', col: null },
  rose:      { nom: 'la gourmande', s: 1, body: [0.26, 0.22, 2.1, 0.22], pear: 0.14, head: [0.21, 0.17, 0.14], at: [0.55, 0.88], cheek: 0.16, ear: [0.07, 0.34, 0.62], legs: [0.08, 0.046, 0.52], tail: [0.36, 0.04, 0.5], fluff: 0, eyes: 'heureux', eye: 0.045, mouth: 'w', coat: 'uni', blush: 0, col: 0xc04a6c },
  tigre:     { nom: 'le tigré', s: 1, body: [0.28, 0.18, 2.3, 0.17], pear: 0.05, head: [0.18, 0.15, 0.13], at: [0.78, 0.78], cheek: 0.1, ear: [0.08, 0.3, 0.64], legs: [0.13, 0.04, 0.58], tail: [0.4, 0.036, 0.4], fluff: 0, eyes: 'point', eye: 0.045, mouth: 'w', coat: 'tigre', col: 0x2f6e8e },
  reveur:    { nom: 'le rêveur', s: 0.95, body: [0.22, 0.2, 2.6, 0.16], pear: 0.08, head: [0.17, 0.14, 0.12], at: [0.62, 0.92], cheek: 0.05, ear: [0.09, 0.28, 0.64], legs: [0.12, 0.038, 0.52], tail: [0.44, 0.032, 0.3], fluff: 0, eyes: 'point', eye: 0.043, mouth: 'w', coat: 'uni', col: 0x3a6e46 },
  nuage:     { nom: 'le nuage', s: 1.3, body: [0.3, 0.26, 2.1, 0.26], pear: 0.08, head: [0.23, 0.18, 0.16], at: [0.5, 0.88], cheek: 0.18, ear: [0.05, 0.3, 0.64], legs: [0.06, 0.05, 0.52], tail: [0.36, 0.06, 1], fluff: 0.06, eyes: 'point', eye: 0.05, mouth: 'w', coat: 'uni', col: null },
  pompon:    { nom: 'le pompon', s: 0.72, body: [0.2, 0.18, 2.1, 0.17], pear: 0.06, head: [0.22, 0.18, 0.15], at: [0.55, 1], cheek: 0.14, ear: [0.08, 0.32, 0.6], legs: [0.07, 0.04, 0.52], tail: [0.26, 0.05, 1.4], fluff: 0.07, eyes: 'point', eye: 0.056, mouth: 'w', coat: 'uni', col: 0x9a6a1c },
  gros:      { nom: 'le gros', s: 1.4, body: [0.33, 0.25, 2.4, 0.28], pear: 0.16, head: [0.19, 0.14, 0.14], at: [0.62, 0.78], cheek: 0.22, ear: [0.05, 0.32, 0.68], legs: [0.06, 0.05, 0.6], tail: [0.3, 0.04, 0.4], fluff: 0, eyes: 'point', eye: 0.042, mouth: 'w', coat: 'uni', col: 0x3e6b3a },
  mini:      { nom: 'la puce', s: 0.6, body: [0.18, 0.13, 2.3, 0.13], pear: 0.05, head: [0.2, 0.17, 0.14], at: [0.62, 1.05], cheek: 0.1, ear: [0.11, 0.3, 0.6], legs: [0.1, 0.034, 0.55], tail: [0.34, 0.028, 0.3], fluff: 0, eyes: 'point', eye: 0.058, mouth: 'blep', coat: 'uni', col: null },
  hirsute:   { nom: 'l\'ébouriffé', s: 1, body: [0.26, 0.18, 2.2, 0.17], pear: 0.04, head: [0.19, 0.15, 0.13], at: [0.74, 0.82], cheek: 0.12, ear: [0.09, 0.3, 0.64], legs: [0.12, 0.04, 0.58], tail: [0.4, 0.05, 1.2], fluff: 0.06, eyes: 'point', eye: 0.045, mouth: 'w', coat: 'uni', col: 0x7a3d8a },
  // les raretés (js/rares.js) : elles n'arrivent que rarement, puis repartent ; leur taille est réglée à l'arrivée (c.b.s)
  geant:     { rare: 1, nom: 'le géant', s: 1, body: [0.3, 0.28, 2, 0.28], pear: 0.08, head: [0.22, 0.18, 0.16], at: [0.45, 0.92], cheek: 0.16, ear: [0.07, 0.3, 0.62], legs: [0.06, 0.05, 0.5], tail: [0.34, 0.05, 0.9], fluff: 0, eyes: 'point', eye: 0.052, mouth: 'w', coat: 'uni', col: null },
  interminable: { rare: 1, nom: 'l\'interminable', s: 1, body: [3.6, 0.1, 2.6, 0.1], pear: 0, head: [0.15, 0.13, 0.11], at: [0.985, 0.7], cheek: 0.06, ear: [0.07, 0.3, 0.66], legs: [0.13, 0.034, 0.97], tail: [0.5, 0.03, 0.3], fluff: 0, eyes: 'point', eye: 0.037, mouth: 'w', coat: 'uni', col: 0xc0561a },
  ballon:    { rare: 1, nom: 'le ballon', s: 1.1, body: [0.3, 0.3, 2, 0.3], pear: 0, head: [0.2, 0.16, 0.15], at: [0.4, 0.95], cheek: 0.12, ear: [0.07, 0.3, 0.62], legs: [0.05, 0.035, 0.45], tail: [0.2, 0.03, 0.3], fluff: 0, eyes: 'point', eye: 0.05, mouth: 'blep', coat: 'uni', col: 0xc04a6c },
  eclair:    { rare: 1, nom: 'l\'éclair', s: 0.9, body: [0.3, 0.12, 2.4, 0.12], pear: 0, arch: 0.2, head: [0.16, 0.13, 0.12], at: [0.9, 0.7], cheek: 0.05, ear: [0.11, 0.28, 0.66], legs: [0.16, 0.034, 0.66], tail: [0.55, 0.03, 0.2], fluff: 0, eyes: 'point', eye: 0.04, mouth: 'w', coat: 'uni', col: 0xb8860b },
  acrobate:  { rare: 1, nom: 'l\'acrobate', s: 0.75, body: [0.19, 0.15, 2.2, 0.14], pear: 0.06, head: [0.21, 0.17, 0.15], at: [0.6, 1.02], cheek: 0.1, ear: [0.1, 0.32, 0.6], legs: [0.1, 0.036, 0.55], tail: [0.34, 0.03, 0.3], fluff: 0, eyes: 'point', eye: 0.056, mouth: 'w', coat: 'uni', col: 0x2f6e8e },
};
const IDS = Object.keys(TYPES).filter(k => !TYPES[k].rare);   // les raretés (js/rares.js) n'arrivent pas au hasard des clics

/* ——— une silhouette gonflée ———
   R(θ) : le contour (dans le plan x, y) ; D : la demi-épaisseur (le long de z).
   Un point : (R(θ) sin φ cos θ, R(θ) sin φ sin θ, D cos φ) ; φ = π/2 est le bord, où poussent les touffes (tuft : leur longueur, k : leur nombre).
   Elle est modelée dix fois plus grande (Z), puis montée réduite : le moteur confond les sommets trop proches (au 1/400). */
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
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(zup(pos), 3)); g.setIndex(idx);
  return g;
}
// un contour ovale, plus ou moins carré (n), un peu poire (pear : le bas plus large), le dos qui monte (arch)
const oval = (a, b, n, pear, arch) => th => { const c = Math.abs(Math.cos(th)) / a, s = Math.abs(Math.sin(th)) / b; return Math.pow(Math.pow(c, n) + Math.pow(s, n), -1 / n) * (1 - (pear || 0) * Math.sin(th)) * (1 + (arch || 0) * Math.max(0, Math.sin(th)) * Math.max(0, -Math.cos(th) + 0.3)); };
// une bosse douce, nulle hors de [−1, 1] (les oreilles, les joues)
const bump = x => { const q = 1 - x * x; return q > 0 ? q * Math.sqrt(q) : 0; };
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
  const [a, h, , d] = b.body, R = oval(a, h, b.body[2], b.pear, b.arch);
  const hipY = -R(-Math.PI / 2) * 0.45, lr = b.legs[1];
  return {
    a, h, d, R, hipY, lr, ll: b.legs[0],
    hips: { f: [a * b.legs[2], hipY, d * 0.5], h: [-a * b.legs[2], hipY, d * 0.5] },
    head: [a * b.at[0], h * b.at[1]], tail: [-R(Math.PI) * 0.88, h * 0.15],
    seat: [-a * 0.42, -h * 0.35], seatR: [Math.max(h, 0.12) * 0.62, Math.max(h, 0.12) * 0.56],
    stand: -hipY + b.legs[0] + lr * 0.75        // la hauteur du centre du corps, debout
  };
}

/* ——— les pièces : modelées une fois par chat (Obj3D.piece les garde) ——— */
function build(id) {
  const b = TYPES[id], D = dims(b), P = {}, key = k => 'chat:' + id + ':' + k;
  // le corps : sa silhouette, ses touffes (moins dessous), son pelage
  P.body = Obj3D.piece(key('corps'), B => {
    B.smooth(blob(D.R, D.d, { tuft: b.fluff, k: b.fluff ? 44 : 0, n: 80, where: th => Math.sin(th) < -0.6 ? 0.25 : 1 }));
    if (b.coat === 'tigre') [0.4, 0.55, 0.7].forEach((f, i) => [1, -1].forEach(sd => {
      const th = f * Math.PI, Q = []; for (let q = 0; q <= 6; q++) { const ph = Math.PI / 2 - sd * q / 6 * (0.5 + 0.15 * (i % 2)); Q.push(onBlob(D.R, D.d, th + Math.sin(q * 0.9) * 0.03, ph)); } B.lines(zup(segs(Q))); }));
    if (b.coat === 'taches') [[2.2, 0.7, 0.3], [1.2, 0.95, 0.22], [2.9, 1.1, 0.2], [0.6, 0.55, 0.16]].forEach(([th, ph, r], i) => [1, -1].forEach(sd => {
      const Q = []; for (let q = 0; q <= 16; q++) { const a = q / 16 * TAU, g = 1 + (hsh(q % 16, i) - 0.5) * 0.35; Q.push(onBlob(D.R, D.d, th + Math.cos(a) * r * g, sd > 0 ? ph + Math.sin(a) * r * g * 0.8 : Math.PI - ph - Math.sin(a) * r * g * 0.8)); } B.lines(zup(segs(Q))); }));
  });
  // la tête : lisse même chez les poilus (ses touffes faisaient des traits sur le corps), vue de face, plus large que haute, les joues rondes, les oreilles dans le contour (deux bosses au sommet)
  const [ha, hh, hd] = b.head, cheek = b.cheek, hR0 = oval(ha, hh, 2.3, 0), [eh, ew, eo] = b.ear;
  const earAt = th => bump((th - (Math.PI / 2 - eo)) / ew) + bump((th - (Math.PI / 2 + eo)) / ew);
  const cheeks = th => Math.exp(-Math.pow((th - (TAU - 0.45)) / 0.45, 2)) + Math.exp(-Math.pow((th - (Math.PI + 0.45)) / 0.45, 2)) + Math.exp(-Math.pow((th + 0.45) / 0.45, 2));
  const HR0 = th => hR0(th) * (1 + cheek * cheeks(th)), HR = th => HR0(th) + eh * earAt(th);
  const zf = zOn(HR, hd), F = (u, v) => [u, v, zf(u, v) + hd * 0.05];
  P.head = Obj3D.piece(key('tete'), B => {
    // (smooth : seulement le contour, pas les arêtes vives : les oreilles faisaient des plis dessinés dans la tête)
    B.smooth(blob(HR, hd, { n: 180, m: 8, where: th => { const s = Math.sin(th); return s < 0.1 && s > -0.85 ? 1 : 0; } }));
    // les oreilles : juste leur bord, dans le contour de la tête (pas de trait dedans : Mathieu, 27/09)
  });
  // le visage : les yeux, la bouche, les moustaches, en traits posés sur la tête
  const e = b.eye, ex = ha * (b.eyes === 'brillant' ? 0.44 : 0.45), ey = hh * 0.04;
  const arc = (cx, cy, rx, ry, a0, a1, n) => { const Q = []; n = n || 16; for (let q = 0; q <= n; q++) { const a = lerp(a0, a1, q / n); Q.push(F(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); } return segs(Q); };
  // un rond plein (des cercles serrés), percé de reflets (holes : [x, y, r]) ; half : seulement la moitié basse
  const fill = (B, cx, cy, rx, ry, holes, half, pad) => {
    const nR = Math.max(2, Math.ceil(Math.max(rx, ry) / 0.0035)), out = [];
    for (let k = 0; k <= nR; k++) { const f = k / nR, n = Math.max(8, Math.round(44 * f)), a0 = half ? Math.PI : 0; let prev = null;
      for (let q = 0; q <= n; q++) { const a = lerp(a0, TAU, q / n), x = cx + Math.cos(a) * rx * f, y = cy + Math.sin(a) * ry * f;
        const inHole = (holes || []).some(h => Math.hypot(x - h[0], y - h[1]) < h[2] + (pad || 0.005)), p = inHole ? null : F(x, y);
        if (p && prev) out.push(...prev, ...p); prev = p; } }
    if (half) out.push(...F(cx - rx, cy), ...F(cx + rx, cy));
    B.lines(out);
  };
  const lid = e * 0.15;
  P.eyes = Obj3D.piece(key('yeux'), B => [-1, 1].forEach(s => {
    const cx = s * ex;
    if (b.brow) B.lines(segs([F(cx - s * e * 1.1, ey + e * 1.35), F(cx + s * e * 1.1, ey + e * 0.95)]));   // un sourcil froncé, pas plus
    if (b.eyes === 'rond') B.lines(arc(cx, ey, e, e * 1.08, 0, TAU, 26));
    if (b.eyes === 'blase') {
      const a0 = Math.asin(lid / e); B.lines(arc(cx, ey, e, e, Math.PI - a0, TAU + a0, 18)); B.lines(segs([F(cx - e * 1.15, ey + lid), F(cx + e * 1.15, ey + lid)]));
      B.lines(segs([F(cx - s * e * 1.2, ey + e * 1.05), F(cx + s * e * 1.2, ey + e * 0.6)])); B.lines(segs([F(cx - s * e * 1.2, ey + e * 0.95), F(cx + s * e * 1.2, ey + e * 0.52)]));   // les sourcils froncés
    }
  }));
  // les pupilles : pleines, avec un reflet ; elles regardent autour (le groupe se déplace)
  P.pup = Obj3D.piece(key('pupilles'), B => [-1, 1].forEach(s => {
    const cx = s * ex;
    if (b.eyes === 'rond') { const px = cx + e * 0.08, py = ey - e * 0.06, r = e * 0.64; fill(B, px, py, r, r * 1.05, [[px - r * 0.35, py + r * 0.38, r * 0.3]]); B.lines(arc(px - r * 0.35, py + r * 0.38, r * 0.3, r * 0.3, 0, TAU, 12)); }
    if (b.eyes === 'brillant') { const r = e, H = [[cx - r * 0.3, ey + r * 0.38, r * 0.3], [cx + r * 0.32, ey - r * 0.42, r * 0.14]]; fill(B, cx, ey, r * 0.9, r, H); H.forEach(h => B.lines(arc(h[0], h[1], h[2], h[2], 0, TAU, 12))); }
    // 'point' : pas de traits ici, de vrais ovales pleins avec leurs reflets blancs (voir eyeDisc dans create)
    if (b.eyes === 'blase') fill(B, cx, ey + lid, e * 0.6, e * 0.6, null, true);
  }));
  // les yeux clos (le sommeil, un clignement) ; les yeux ravis (∩ ∩)
  P.shut = Obj3D.piece(key('clos'), B => [-1, 1].forEach(s => B.lines(arc(s * ex, ey + e * 0.25, e, e * 0.6, Math.PI * 1.08, Math.PI * 1.92, 12))));
  P.joy = Obj3D.piece(key('ravi'), B => [-1, 1].forEach(s => B.lines(arc(s * ex, ey - e * 0.3, e, e * 0.8, Math.PI * 0.05, Math.PI * 0.95, 12))));
  // le nez (un petit triangle plein), la bouche, les moustaches, les joues roses
  const ny = -hh * 0.22, nw = ha * 0.07;
  P.face = Obj3D.piece(key('visage'), B => {
    fill(B, 0, ny + nw * 0.05, nw * 0.9, nw * 0.55);
    if (b.mouth === 'w' || b.mouth === 'blep') [-1, 1].forEach(s => B.lines(arc(s * nw * 1.05, ny - nw * 0.55, nw * 1.05, nw * 1.1, Math.PI * 1.05, Math.PI * 1.95, 10)));
    if (b.mouth === 'blep') { B.lines(arc(0, ny - nw * 1.8, nw * 0.7, nw * 1.1, Math.PI * 1.02, Math.PI * 1.98, 10)); B.soft(segs([F(0, ny - nw * 1.9), F(0, ny - nw * 2.5)])); }
    if (b.mouth === 'grogne') { B.lines(segs([F(0, ny - nw * 0.4), F(0, ny - nw * 1.1)])); B.lines(arc(0, ny - nw * 2.5, nw * 1.5, nw * 1.3, Math.PI * 0.2, Math.PI * 0.8, 10)); }
    [-1, 1].forEach(s => [0, 1].forEach(k => {
      const x0 = s * ha * 0.62, y0 = ny - hh * 0.02 - k * hh * 0.14, x1 = s * ha * (1.3 + k * 0.08), y1 = y0 + hh * (0.14 - k * 0.2);
      B.lines(segs([F(x0, y0), [lerp(x0, x1, 0.5), lerp(y0, y1, 0.5) + hh * 0.03, hd * 0.25], [x1, y1, hd * 0.1]]));
    }));
    if (b.blush) [-1, 1].forEach(s => [0, 1, 2].forEach(k => { const x = s * ha * 0.64 + (k - 1) * ha * 0.08; B.soft(segs([F(x - ha * 0.025, ny - hh * 0.02), F(x + ha * 0.025, ny + hh * 0.1)])); }));
  });
  // la bouche ouverte (le miaulement, le feulement) : un petit ovale sous le nez
  P.mouth = Obj3D.piece(key('bouche'), B => B.lines(arc(0, ny - nw * 2.3, nw * 1.1, nw * 1.4, 0, TAU, 14)));
  // les jambes : un fuseau (plus large en haut), du haut (y = 0) vers le bas (y = −1 : il est étiré à la longueur voulue)
  P.leg = Obj3D.piece(key('jambe'), B => B.smooth(K.lathe([[D.lr * 1.25, 0], [D.lr * 1.12, -0.35], [D.lr * 0.95, -0.8], [D.lr * 0.92, -1.05]].map(q => [q[0], q[1] * D.ll]), 14)));
  // la hanche : une boule qui cache le haut de la jambe (sans trait : elle est dans le corps)
  P.hip = Obj3D.piece(key('hanche'), B => B.occ(new T.SphereGeometry(D.lr * 1.25, 12, 8)));
  // la patte : un petit pain rond, pointé vers l'avant, deux doigts dessinés
  // (vague 174 de l'audit : « les chats ») : un seul trait de doigt de chaque côté (il y en avait deux : de face, au pied d'un chat assis, quatre pattes
  // à quatre traits faisaient un pâté d'encre)
  const pw = D.lr * 1.08;
  P.paw = Obj3D.piece(key('patte'), B => {
    B.solid(K.tf(new T.SphereGeometry(pw, 16, 10), [pw * 0.35, -pw * 0.1, 0], 0, [1.45, 0.72, 1.05]));
    [-1, 1].forEach(sd => [1.05].forEach(f => { const x = pw * (0.35 + f * 0.62), z = sd * pw * 1.05 * Math.sqrt(Math.max(0, 1 - Math.pow((x - pw * 0.35) / (pw * 1.45), 2))) * 0.96; B.lines([x, -pw * 0.1 + pw * 0.2, z, x + pw * 0.04, -pw * 0.1 - pw * 0.42, z * 0.97]); }));
  });
  // la cuisse (assis) : un gros rond sur le côté, et la patte arrière posée devant
  const [sr, sh2] = D.seatR, sR = oval(sr, sh2, 2.1, 0.05);
  P.seat = Obj3D.piece(key('cuisse'), B => B.smooth(blob(sR, D.d * 0.45, { n: 64, m: 7 })));
  // la queue : neuf segments (en panache pour certains), le bout un peu plus fin
  const n = 9, sl = b.tail[0] / n, tr = b.tail[1], bush = b.tail[2], rAt = t => tr * (1 + bush * Math.pow(Math.sin(Math.min(1, t * 1.15) * Math.PI), 0.9) * 0.9) * (1 - 0.25 * t) * (t > 0.92 ? 1 - (t - 0.92) * 4 : 1);
  P.tail = []; for (let i = 0; i < n; i++) { const r0 = rAt(i / n), r1 = rAt((i + 1) / n); P.tail.push(Obj3D.piece(key('queue' + i), B => { B.occ(K.latheX([[0, r0], [sl * 0.5, (r0 + r1) / 2], [sl, r1]], 12)); B.occ(new T.SphereGeometry(r1, 12, 8).translate(sl, 0, 0)); if (!i) B.occ(new T.SphereGeometry(r0, 12, 8)); })); }
  const tailR = []; for (let i = 0; i <= n; i++) tailR.push(rAt(i / n));
  return { P, D, n, sl, HR, F, pw, tailR, eye: { ex, ey, e, z: F(0, ey)[2] } };
}

/* ——— une pose : les noms des cases ———
   x, y : le centre du corps (y : sa hauteur) · pitch : le tangage (positif : le nez en l'air) · sqz : écrasé (−) / étiré en hauteur (+) · stretch : allongé
   look : le visage vers nous (1) ou vers l'avant (0) · hyaw, hnod, htilt : la tête qui tourne, hoche, penche · hx, hy : la tête déplacée
   seat : les cuisses de chat assis (0 → 1) · eyes : ouverts (0), clos (1), ravis (2) · mouth : ouverte (1) · px, py : où regardent les pupilles
   fl, fr, hl, hr : l'angle de chaque patte (positif : vers l'avant) · fk, fk2, hk : la longueur des pattes avant (gauche, droite), arrière (1 : normale, 0 : repliée, plus : étirée)
   tailUp, tailCurl, tailSide, tailWave, tailPhase : la queue · puff : hérissé */
const POSE = ['x', 'y', 'pitch', 'sqz', 'stretch', 'look', 'hyaw', 'hnod', 'htilt', 'hx', 'hy', 'seat', 'eyes', 'mouth', 'px', 'py',
  'fl', 'fr', 'hl', 'hr', 'fk', 'hk', 'fk2', 'tailUp', 'tailCurl', 'tailSide', 'tailWave', 'tailPhase', 'puff'];
const I = {}; POSE.forEach((k, i) => { I[k] = i; });
const NP = POSE.length;
const LEGS = new Set(['fl', 'fr', 'hl', 'hr', 'fk', 'hk', 'fk2'].map(k => I[k]));
const STEP = new Set(['eyes', 'mouth'].map(k => I[k]));   // les expressions changent d'un coup

/* ——— un chat ——— */
let uid = 0;
function create(id, o) {
  o = o || {}; id = TYPES[id] ? id : IDS[Math.floor(Math.random() * IDS.length)];
  const b = TYPES[id], M = build(id), D = M.D, P = M.P;
  // UNI : le corps, les pattes et la queue n'ont qu'un contour (pas de trait sur le ventre là où passe une patte) ; la tête a son contour à elle (sans les plis des oreilles), les cuisses (assis) aussi
  const mats = Obj3D.mats(o.color ?? undefined, { fat: PEN, fatSoft: PEN * 0.8, uni: UNI ? 1 + (uid % 127) * 2 : 0, uni2: UNI ? 2 + (uid % 127) * 2 : 0 }), all = [], G = () => new T.Group();
  const put = (pp, parent, own) => { const q = Obj3D.mount(pp, mats, own); parent.add(q.g); all.push(q); return q; };
  const root = G(), view = G(), body = G(), puffy = G(), headA = G(), head = G(), pupils = G();
  root.add(view); view.add(body); body.add(puffy); body.add(headA); headA.add(head); head.add(pupils);
  put(P.body, puffy).g.scale.setScalar(1 / Z); put(P.head, head, 2).g.scale.setScalar(1 / Z); put(P.face, head, true); put(P.pup, pupils, true);
  // les yeux kawaii : un ovale plein à l'encre, un gros reflet blanc en haut, un petit en bas (des disques, pas des traits : bords nets)
  const discs = [];
  if (b.eyes === 'point') { const E = M.eye, disc = DISC || (DISC = new T.CircleGeometry(1, 32));
    const ink = new T.MeshBasicMaterial({ color: mats.line.color, transparent: true }), glint = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true }); ink.userData.own = glint.userData.own = 1;
    [-1, 1].forEach(s => { const cx = s * E.ex;
      [[cx, E.ey, E.e * 0.8, E.e * 0.95, ink, 0], [cx - E.e * 0.22, E.ey + E.e * 0.3, E.e * 0.3, E.e * 0.3, glint, 1], [cx + E.e * 0.27, E.ey - E.e * 0.4, E.e * 0.13, E.e * 0.13, glint, 2]].forEach(([x, y, rx, ry, m, k]) => {
        const o = new T.Mesh(disc, m); o.position.set(x, y, E.z + E.e * (0.3 + k * 0.1)); o.scale.set(rx, ry, 1); o.renderOrder = 1; o.frustumCulled = false; pupils.add(o); }); });
    discs.push(ink, glint); }
  const eyes = put(P.eyes, head, true), shut = put(P.shut, head, true), joy = put(P.joy, head, true), mouth = put(P.mouth, head, true);
  // les pattes : devant (f), derrière (h), à gauche (−z) et à droite (+z) ; la jambe s'étire, la patte reste ronde
  const legs = {}; [['fl', 'f', -1], ['fr', 'f', 1], ['hl', 'h', -1], ['hr', 'h', 1]].forEach(([k, w, s]) => {
    const g = G(), foot = G(); g.userData.hip = [D.hips[w][0], D.hips[w][1], s * D.hips[w][2]]; body.add(g);
    const q = put(P.leg, g); put(P.hip, g); g.add(foot); put(P.paw, foot); legs[k] = { g, m: q.g, foot }; });
  // les cuisses (assis) : de chaque côté, droites, et la patte arrière devant
  const seats = [-1, 1].map(s => { const g = G(); body.add(g); const q = put(P.seat, g, true); q.g.scale.setScalar(1 / Z); const f = G(); f.position.set(D.seatR[0] * 0.55, -D.seatR[1] * 0.78, 0); g.add(f); put(P.paw, f, true); g.userData.s = s; return g; });
  // la queue
  const tail = [], tailM = []; const tb = G(); body.add(tb); let tp = tb;
  P.tail.forEach((pp, i) => { const g = G(); if (i) g.position.set(M.sl, 0, 0); tp.add(g); tailM.push(put(pp, g).g); tail.push(g); tp = g; });
  // le contour de la queue : calculé à chaque image (deux traits parallèles à sa ligne, le bout arrondi) ; les segments ne font que cacher
  const tailArr = new Float32Array((2 * P.tail.length + 8) * 6), tailLine = Obj3D.fatSegs(tailArr, mats.out || mats.line); tailLine.renderOrder = 1; tailLine.frustumCulled = false; root.add(tailLine);
  const R = Obj3D.rig(root, all);
  const cat = { tailArr, tailLine, tailR: M.tailR, sl: M.sl,
    id: ++uid, breed: id, b, D, root, view, body, puffy, headA, head, pupils, legs, seats, tail, tailB: tb, tailM, eyes, shut, joy, mouth, mats: [mats], discs, R, all, pw: M.pw,
    cur: new Float32Array(NP), tgt: new Float32Array(NP), rate: 10,
    // où il est : à l'écran (px), sa taille (px par unité), vers où il regarde (face : 1 à droite, −1 à gauche), un tour entier du corps (spin), sa profondeur (z)
    x: 0, y: 0, s: 160, face: 1, spin: 0, z: 0, a: 1
  };
  rest(cat, cat.cur); cat.tgt.set(cat.cur);
  return cat;
}
let DISC = null;   // (le disque des yeux : un seul pour tous)
function destroy(c) { if (c && c.R) Obj3D.unrig(c.R); if (c) c.R = null; }

/* ——— la pose de base : debout, le visage vers nous ——— */
function rest(c, p) {
  p.fill(0);
  p[I.y] = c.D.stand; p[I.look] = 0.85; p[I.fk] = 1; p[I.hk] = 1; p[I.fk2] = 1;
  p[I.tailUp] = 0.9; p[I.tailCurl] = 0.8; p[I.tailWave] = 0.6;
  return p;
}
// où est, dans le repère du chat (sans la vue), la hanche d'une patte pour la pose p
function hipAt(c, p, k) {
  const h = c.D.hips[k[0]], sx = 1 + p[I.stretch] - p[I.sqz] * 0.5, sy = 1 + p[I.sqz], a = p[I.pitch], x = h[0] * sx, y = h[1] * sy;
  return [p[I.x] + x * Math.cos(a) - y * Math.sin(a), p[I.y] + x * Math.sin(a) + y * Math.cos(a)];
}
// une patte droite jusqu'au sol (sa longueur s'ajuste) : assis, debout contre un mur
function toGround(c, p, k) {
  const h = hipAt(c, p, k); p[I[k]] = -p[I.pitch];
  p[k[0] === 'f' ? (k === 'fr' ? I.fk2 : I.fk) : I.hk] = Math.min(2.4, Math.max(0.3, (h[1] - c.pw * 0.5) / c.D.ll));
}
/* les allures : les pattes balancent (en diagonale au pas et au trot, par paires au galop), le corps sautille */
const GAITS = { pas: { amp: 0.5, bob: 0.012, lift: 0.3 }, trot: { amp: 0.65, bob: 0.018, lift: 0.4 }, galop: { amp: 0.95, bob: 0.05, lift: 0.5 } };
function gait(c, p, g, ph, k) {
  const G = GAITS[g], A = G.amp * k, w = ph * TAU;
  const off = g === 'galop' ? { fl: 0, fr: 0.08, hl: 0.5, hr: 0.58 } : { fl: 0, hr: 0, fr: 0.5, hl: 0.5 };
  for (const L in off) { const a = w + off[L] * TAU, lift = 1 - Math.max(0, Math.cos(a)) * G.lift * k, ki = L === 'fl' ? I.fk : L === 'fr' ? I.fk2 : I.hk;
    p[I[L]] += Math.sin(a) * A; if (L[0] === 'h') p[ki] = Math.min(p[ki], lift); else p[ki] *= lift; }
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
  // (c.vyaw : un chat peut se montrer plus de profil ; l'interminable, sinon son long dos partirait en biais sur tout l'écran)
  const vy = c.vyaw ?? VIEW.yaw, yaw = c.face > 0 ? -vy : Math.PI + vy;
  c.root.position.set(c.x, -c.y, c.z); c.root.scale.setScalar(c.s * b.s);
  qa.setFromAxisAngle(AX, VIEW.tilt); qb.setFromAxisAngle(AY, yaw); qa.multiply(qb); c.view.quaternion.copy(qa);
  // le corps : sa place, son tangage, écrasé ou étiré
  const sx = 1 + p[I.stretch] - p[I.sqz] * 0.5, sy = 1 + p[I.sqz], pz = 1 + p[I.puff] * 0.12;
  c.body.position.set(p[I.x], p[I.y], 0); c.body.rotation.set(0, 0, p[I.pitch] + c.spin + (c.roll || 0));   // roll : couché sur le dos (js/vie.js)
  c.puffy.scale.set(sx * pz, sy * pz, pz);
  // les pattes : accrochées sous le corps, elles balancent ; la jambe s'allonge ou se replie, la patte garde sa forme (et reste à plat)
  for (const k in c.legs) { const L = c.legs[k], h = L.g.userData.hip, e = Math.max(0.12, p[k === 'fr' ? I.fk2 : I[k[0] === 'f' ? 'fk' : 'hk']]), len = D.ll * e;
    L.g.position.set(h[0] * sx, h[1] * sy, h[2]); L.g.rotation.set(0, 0, p[I[k]]); L.m.scale.set(1, e, 1);
    L.foot.position.set(0, -len, 0); L.foot.rotation.set(0, 0, -p[I[k]] - p[I.pitch] - c.spin - (c.roll || 0)); L.foot.visible = e > 0.15; }
  // assis : les cuisses sur les côtés, droites
  const st = p[I.seat]; c.seats.forEach(g => { g.visible = st > 0.05; g.position.set(D.seat[0] * sx, D.seat[1] * sy, g.userData.s * D.d * 0.62); g.rotation.set(0, 0, -p[I.pitch]); g.scale.setScalar(Math.max(0.01, st)); });
  // la tête : droite quand le corps penche (tant qu'il ne tourne pas sur lui-même), devant le corps, tournée vers nous (look) ou vers l'avant
  c.headA.position.set(D.head[0] * sx + p[I.hx], D.head[1] * sy + p[I.hy], c.face * D.d * 0.5); c.headA.rotation.set(0, 0, -p[I.pitch] + p[I.htilt]);
  const toUs = c.face > 0 ? VIEW.yaw : Math.PI - VIEW.yaw;
  c.head.rotation.set(p[I.hnod], lerp(Math.PI / 2, toUs, c01(p[I.look])) + p[I.hyaw], 0, 'YXZ');
  c.pupils.position.set(p[I.px] * b.eye * 0.3, p[I.py] * b.eye * 0.25, 0);
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
  tailOutline(c, puff);
  const a = c.a * (opts && opts.a !== undefined ? opts.a : 1);
  // (vague 153 de l'audit : « les chats ») : le trait suit la taille du chat ; un petit chat (au fond, au téléphone) n'a plus un contour de gros feutre
  const kp = Math.max(0.7, Math.min(1, 0.55 + 0.45 * c.s * b.s / 140));
  if (c.kp !== kp) { c.kp = kp; c.mats.forEach(m => [m.line, m.soft, m.out, m.out2].forEach(q => { const u = q && q.uniforms && q.uniforms.width; if (u) { q.w0 ??= u.value; u.value = q.w0 * kp; } })); }
  c.mats.forEach(m => { m.line.opacity = Math.min(1, 0.95 * a); m.soft.opacity = 0.5 * a; if (m.out) m.out.opacity = m.line.opacity; if (m.out2) m.out2.opacity = m.line.opacity; const f = Math.min(1, a); [m.fill, m.occ, m.occ2].forEach(o => { if (o && o.paper) o.opacity = f; }); }); c.discs.forEach(m => { m.opacity = Math.min(1, a); });
  c.root.visible = a > 0.01;
}
/* le contour de la queue : sa ligne (les jointures) vue de face ; de chaque côté, à la distance du rayon, perpendiculairement ; le bout en demi-cercle.
   Les points sont dans le repère de la racine (position, taille : pas de rotation) ; le trait garde la profondeur de la ligne. */
const tv = V(0, 0, 0);
function tailOutline(c, puff) {
  c.root.updateMatrixWorld(true);
  const n = c.tail.length, P = [], sc = c.root.scale.x, o = c.root.position;
  for (let i = 0; i <= n; i++) { tv.set(i < n ? 0 : c.sl, 0, 0); c.tail[Math.min(i, n - 1)].localToWorld(tv); P.push([(tv.x - o.x) / sc, (tv.y - o.y) / sc, (tv.z - o.z) / sc]); }
  const A = c.tailArr; let k = 0; const seg = (a, b) => { A[k++] = a[0]; A[k++] = a[1]; A[k++] = a[2]; A[k++] = b[0]; A[k++] = b[1]; A[k++] = b[2]; };
  const side = [[], []];
  for (let i = 0; i <= n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const r = c.tailR[i] * puff * 1.04; side[0].push([P[i][0] - ty * r, P[i][1] + tx * r, P[i][2]]); side[1].push([P[i][0] + ty * r, P[i][1] - tx * r, P[i][2]]);
    if (i === n) { for (let q = 0; q < 6; q++) { const a0 = Math.PI / 2 - q / 6 * Math.PI, a1 = Math.PI / 2 - (q + 1) / 6 * Math.PI, pt = a => [P[i][0] + (Math.cos(a) * tx - Math.sin(a) * ty) * r, P[i][1] + (Math.cos(a) * ty + Math.sin(a) * tx) * r, P[i][2]]; seg(pt(a0), pt(a1)); } }
  }
  side.forEach(S => { for (let i = 1; i < S.length; i++) seg(S[i - 1], S[i]); });
  c.tailLine.userData.ib.needsUpdate = true; c.tailLine.geometry.instanceCount = k / 6;
}
/* où est, à l'écran, un point d'un os (en unités chat, dans le repère de l'os) */
const wv = V(0, 0, 0);
function where(c, g, pt) { c.root.updateMatrixWorld(true); wv.set(pt ? pt[0] : 0, pt ? pt[1] : 0, pt ? pt[2] : 0); g.localToWorld(wv); return [wv.x, -wv.y, wv.z]; }

/* le préchauffage (27/09, « optimise tout ») : la première apparition d'une race coûtait ~120 ms (ses pièces modelées d'un coup) ;
   une race par moment de repos du navigateur, après le chargement, et elles sont prêtes avant d'être appelées */
function prewarm() {
  const L = Object.keys(TYPES), idle = window.requestIdleCallback || (f => setTimeout(f, 80));
  const run = () => { const id = L.shift(); if (!id) return; try { build(id); } catch (e) {} idle(run, { timeout: 1000 }); };
  idle(run, { timeout: 1500 });
}
if (document.readyState === 'complete') prewarm(); else addEventListener('load', prewarm, { once: true });

// la vue commune : tout est vu d'un peu au-dessus (les objets du décor aussi : js/univers.js)
const VIEW = { tilt: 0.2, yaw: 0.34 };
return { TYPES, BREEDS: TYPES, IDS, POSE, I, NP, PEN, create, destroy, rest, hipAt, toGround, gait, GAITS, step, apply, where, VIEW, dims, c01, sm, lerp };
})();
