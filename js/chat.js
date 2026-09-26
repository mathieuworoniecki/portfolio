/* Un chat en traits : son modèle (par race), son squelette, ses poses et ses allures.
   Le moteur 3D (js/objects3d.js) le dessine comme le reste : contours qui suivent la vue, arêtes vives, rien de caché.
   Le chat est un pantin (Obj3D.piece / mount / rig) : chaque os est un groupe three.js, posé à chaque image.

   Le repère du chat (en « unités chat » : le corps, de la croupe au poitrail, mesure 0,68) :
     x vers l'avant (le nez), y vers le haut, z vers sa droite (vers nous quand il marche vers la droite) ; le sol est en y = 0.
   Le squelette :
     racine (posée à l'écran : position, taille, orientation)
       tronc (hauteur, tangage) ─ arrière : hanches ─ cuisse → jambe → métatarse → patte (×2) ; queue (8 segments)
                                 └ avant (pli du dos) : épaules ─ bras → avant-bras → patte (×2) ; cou → tête (oreilles, yeux, bouche)
   Une pose est un tableau de nombres (POSE : les noms des cases), qu'on mélange en douceur d'une pose à l'autre :
   le comportement (js/chats.js) calcule une pose cible à chaque image, le chat la rejoint (Chat.step).
   Les jambes se posent à la main (angles) ou par cinématique inverse (Chat.ik : on donne où va la patte, le genou suit).
   Les allures : pas, trot, galop, et l'escalade (le même pas, le long d'un poteau). */
window.Chat = (() => {
if (!window.Obj3D || !Obj3D.kit) return null;
const T = Obj3D.T, K = Obj3D.kit, TAU = Math.PI * 2;
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new T.Vector3(x, y, z);

/* ——— les races : proportions, pelage, couleurs ———
   s taille · bl longueur du corps · bt épaisseur · ll jambes · hr tête · er/eh oreilles · tl/tr queue · muz museau
   fluff poils longs (joues, collerette, queue en panache) · coat le motif · col la couleur du trait · pts la couleur des extrémités
   eye la couleur des yeux · fold oreilles pliées · tufts plumets aux oreilles · wrinkles plis (chat nu) */
const BREEDS = {
  europeen:  { nom: 'européen tigré', s: 1, bl: 1, bt: 1, ll: 1, hr: 1, er: 1, eh: 1, tl: 1, tr: 1, muz: 1, coat: 'tigre', col: 0x6b4c30, eye: 0x6d8a2a },
  roux:      { nom: 'roux', s: 1.04, bl: 1.02, bt: 1.08, ll: 0.98, hr: 1.04, er: 1, eh: 0.95, tl: 1, tr: 1.05, muz: 1, coat: 'tigre', col: 0xc9621e, eye: 0xb88a1c },
  noir:      { nom: 'noir', s: 0.98, bl: 1, bt: 0.94, ll: 1.04, hr: 0.98, er: 1.05, eh: 1.05, tl: 1.08, tr: 0.9, muz: 1, coat: 'uni', col: 0x1c1d21, eye: 0xc9a11a },
  siamois:   { nom: 'siamois', s: 0.98, bl: 1.06, bt: 0.86, ll: 1.14, hr: 0.92, er: 1.25, eh: 1.25, tl: 1.12, tr: 0.8, muz: 1.25, coat: 'points', col: 0xb89a74, pts: 0x3d2a1d, eye: 0x2f7fd0 },
  maine:     { nom: 'maine coon', s: 1.28, bl: 1.08, bt: 1.08, ll: 1.05, hr: 1.02, er: 1.1, eh: 1.2, tl: 1.05, tr: 1.9, muz: 1.1, coat: 'tigre', col: 0x5b4632, eye: 0x9a8a2a, fluff: 1, tufts: 1 },
  persan:    { nom: 'persan', s: 1.02, bl: 0.94, bt: 1.2, ll: 0.78, hr: 1.16, er: 0.72, eh: 0.62, tl: 0.82, tr: 1.8, muz: 0.45, coat: 'uni', col: 0x9a8a78, eye: 0xc47a1a, fluff: 1 },
  chartreux: { nom: 'chartreux', s: 1.06, bl: 0.98, bt: 1.14, ll: 0.94, hr: 1.1, er: 0.9, eh: 0.88, tl: 0.92, tr: 1.2, muz: 0.9, coat: 'uni', col: 0x566a82, eye: 0xc97a14 },
  sphynx:    { nom: 'sphynx', s: 0.96, bl: 1, bt: 0.9, ll: 1.08, hr: 0.94, er: 1.55, eh: 1.45, tl: 1.02, tr: 0.62, muz: 1.05, coat: 'nu', col: 0xa86a5c, eye: 0x6aa03a, wrinkles: 1 },
  fold:      { nom: 'scottish fold', s: 0.98, bl: 0.96, bt: 1.1, ll: 0.94, hr: 1.12, er: 0.95, eh: 0.8, tl: 0.95, tr: 1.15, muz: 0.85, coat: 'uni', col: 0x8a8e94, eye: 0xc98a1a, fold: 1 },
  bengal:    { nom: 'bengal', s: 1.05, bl: 1.06, bt: 0.96, ll: 1.08, hr: 0.94, er: 0.95, eh: 0.95, tl: 1.02, tr: 1.05, muz: 1.1, coat: 'rosettes', col: 0xa8741f, eye: 0x6e9a28 },
  smoking:   { nom: 'smoking (noir et blanc)', s: 1, bl: 1, bt: 1, ll: 1, hr: 1, er: 1, eh: 1, tl: 1, tr: 1, muz: 1, coat: 'bicolore', col: 0x1c1d21, eye: 0x7da83a },
  calico:    { nom: 'tricolore', s: 0.96, bl: 0.98, bt: 1, ll: 0.98, hr: 1, er: 1, eh: 1, tl: 0.98, tr: 1, muz: 1, coat: 'calico', col: 0x6e6a64, pts: 0xc9621e, pts2: 0x1c1d21, eye: 0xb88a1c }
};
const IDS = Object.keys(BREEDS);

/* ——— les mesures d'une race (en unités chat) ——— */
function dims(b) {
  const bl = 0.64 * b.bl, bt = 0.135 * b.bt, ll = b.ll * 0.9;
  return {
    bl, bt, zs: 0.82,
    hip: [-bl * 0.3, -bt * 0.12, bt * 0.62], sh: [bl * 0.26, -bt * 0.2, bt * 0.6], spine: [0, 0, 0],
    // les jambes : avant (bras, avant-bras, patte), arrière (cuisse, jambe, métatarse)
    fa: [0.15 * ll, 0.145 * ll], ha: [0.155 * ll, 0.16 * ll, 0.1 * ll], paw: 0.028,
    neck: [bl * 0.44, bt * 0.35], hr: 0.108 * b.hr, tail: [-bl * 0.47, bt * 0.35], tl: 0.64 * b.tl, tr: 0.026 * b.tr,
    stand: (0.295 * ll) * 0.96 + 0.028 * 0.6 + bt * 0.2   // la hauteur du tronc debout : les pattes avant presque tendues
  };
}

/* ——— les pièces : modelées une fois par race (Obj3D.piece les garde) ——— */
// un profil [x, r] le long de x, écrasé en z (un corps plus haut que large)
const bodyX = (pr, zs, seg) => K.tf(K.latheX(pr, seg || 12), 0, 0, [1, 1, zs]);
const rOf = (pr, x) => { for (let i = 1; i < pr.length; i++) if (x <= pr[i][0]) { const a = pr[i - 1], b = pr[i], t = (x - a[0]) / ((b[0] - a[0]) || 1); return lerp(a[1], b[1], t); } return pr[pr.length - 1][1]; };
// un point de la surface d'un corps tourné : à l'abscisse x, à l'angle t autour de x (0 : le dessus, ±π/2 : les flancs)
const surf = (pr, zs, x, t, k) => [x, rOf(pr, x) * Math.cos(t) * (k || 1.02), rOf(pr, x) * Math.sin(t) * zs * (k || 1.02)];
const segs = P => { const out = []; for (let i = 0; i < P.length - 1; i++) out.push(...P[i], ...P[i + 1]); return out; };
// une gélule : le profil [t, r] d'un fuseau à bouts arrondis, de t = 0 à t = len (pas d'arête au bout : rien ne se dessine aux jointures)
function capsule(len, r0, r1, mid, n) {
  n = n || 4; const P = [];
  for (let k = 0; k <= n; k++) { const a = k / n * Math.PI / 2; P.push([-r0 * Math.cos(a) * 0.85, r0 * Math.sin(a)]); }
  if (mid) P.push([len * 0.45, mid]);
  for (let k = 0; k <= n; k++) { const a = k / n * Math.PI / 2; P.push([len + r1 * Math.sin(a) * 0.85, r1 * Math.cos(a)]); }
  return P;
}
function hsh(a, b) { let x = (Math.imul(a | 0, 374761393) + Math.imul((b | 0) + 1, 668265263)) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
// les motifs du pelage sur un corps : des rayures (tigré), des taches (rosettes), une limite de plastron (bicolore), des plis (nu)
function coatLines(B, coat, pr, zs, x0, x1, seed, part) {
  if (coat === 'tigre') for (let x = x0 + 0.03; x < x1 - 0.02; x += 0.055) {
    const P = []; for (let k = 0; k <= 10; k++) { const t = -1.25 + k / 10 * 2.5; P.push(surf(pr, zs, x + Math.sin(t * 2.3 + seed) * 0.012 + (hsh(k, seed) - 0.5) * 0.006, t)); } B.soft(segs(P));
  }
  if (coat === 'rosettes') for (let i = 0; i < 16; i++) {
    const x = lerp(x0 + 0.03, x1 - 0.03, hsh(i, seed)), t = (hsh(seed, i) - 0.5) * 2.6, c = surf(pr, zs, x, t), r = 0.014 + hsh(i, 9) * 0.008, P = [];
    for (let k = 0; k <= 7; k++) { const a = k / 7 * TAU * (k < 7 ? 1 : 0.85); P.push(surf(pr, zs, x + Math.cos(a) * r, t + Math.sin(a) * r / Math.max(0.05, rOf(pr, x)))); }
    B.soft(segs(P)); void c;
  }
  if (coat === 'bicolore' && part !== 'tail') { const P = []; for (let x = x0 + 0.01; x <= x1 - 0.01; x += 0.02) P.push(surf(pr, zs, x, 1.75 + Math.sin(x * 40) * 0.12)); B.soft(segs(P)); const Q = []; for (let x = x0 + 0.01; x <= x1 - 0.01; x += 0.02) Q.push(surf(pr, zs, x, -1.75 - Math.sin(x * 40) * 0.12)); B.soft(segs(Q)); }
  if (coat === 'nu') for (let i = 0; i < 5; i++) { const x = lerp(x0 + 0.05, x1 - 0.06, hsh(i, seed)), P = []; for (let k = 0; k <= 6; k++) { const t = 0.5 + k / 6 * 0.9; P.push(surf(pr, zs, x + Math.sin(k) * 0.006, t)); } B.soft(segs(P)); }
}
// les taches du tricolore : des contours fermés, sur une pièce à part (leur couleur)
function patchLines(B, pr, zs, x0, x1, seed, n) {
  for (let i = 0; i < n; i++) { const x = lerp(x0 + 0.05, x1 - 0.05, hsh(i, seed)), t = (hsh(seed, i * 3) - 0.3) * 2.2, r = 0.035 + hsh(i, seed + 4) * 0.03, P = [];
    for (let k = 0; k <= 12; k++) { const a = k / 12 * TAU, g = 1 + (hsh(k, i + seed) - 0.5) * 0.5; P.push(surf(pr, zs, x + Math.cos(a) * r * g, t + Math.sin(a) * r * g / Math.max(0.05, rOf(pr, x)))); } B.lines(segs(P)); }
}
function build(id) {
  const b = BREEDS[id], D = dims(b), P = {}, key = k => 'chat:' + id + ':' + k, zs = D.zs, bt = D.bt, bl = D.bl;
  // le tronc : l'arrière (croupe, ventre) et l'avant (poitrail), qui se recouvrent au milieu du dos
  const rear = [[-bl * 0.5, 0], [-bl * 0.495, bt * 0.35], [-bl * 0.47, bt * 0.66], [-bl * 0.4, bt * 0.88], [-bl * 0.28, bt * 1], [-bl * 0.1, bt * 1.02], [bl * 0.06, bt * 0.98], [bl * 0.12, bt * 0.75], [bl * 0.15, 0]];
  const front = [[-bl * 0.15, 0], [-bl * 0.12, bt * 0.75], [-bl * 0.06, bt * 0.98], [bl * 0.1, bt * 0.97], [bl * 0.26, bt * 0.93], [bl * 0.38, bt * 0.82], [bl * 0.45, bt * 0.6], [bl * 0.49, bt * 0.3], [bl * 0.5, 0]];
  if (b.fluff) { front[6][1] *= 1.12; front[7][1] *= 1.2; }   // la collerette
  P.rear = Obj3D.piece(key('arriere'), B => { B.solid(bodyX(rear, zs)); coatLines(B, b.coat, rear, zs, -bl * 0.48, bl * 0.04, 3, 'body'); });
  P.front = Obj3D.piece(key('avant'), B => { B.solid(bodyX(front, zs)); coatLines(B, b.coat, front, zs, -bl * 0.04, bl * 0.42, 7, 'body'); });
  if (b.coat === 'calico') { P.patchA = Obj3D.piece(key('tachesA'), B => patchLines(B, rear, zs, -bl * 0.46, bl * 0.02, 11, 3)); P.patchB = Obj3D.piece(key('tachesB'), B => patchLines(B, front, zs, -bl * 0.02, bl * 0.4, 17, 2)); }
  // le cou : un tronc de cône du poitrail vers la tête
  P.neck = Obj3D.piece(key('cou'), B => B.solid(K.tf(K.lathe(capsule(0.12, bt * 0.6, bt * 0.44, bt * 0.55).map(q => [q[1], q[0]]), 12), 0, [0, 0, -0.95], [1, 1, zs])));
  // la tête : un crâne arrondi, plus large que haut ; le museau (plus plat pour le persan) ; des joues (poils longs)
  const hr = D.hr, sk = [[-hr * 0.9, 0], [-hr * 0.86, hr * 0.45], [-hr * 0.62, hr * 0.8], [-hr * 0.2, hr * 0.96], [hr * 0.2, hr * 0.92], [hr * 0.5, hr * 0.72], [hr * 0.7, hr * 0.38], [hr * 0.74, 0]];
  const mz = [hr * (0.62 + 0.14 * (b.muz - 1)), -hr * 0.3, 0], mr = hr * 0.36;
  P.head = Obj3D.piece(key('tete'), B => {
    B.solid(K.tf(K.latheX(sk, 12), 0, 0, [1, 0.9, 1.12 * (b.muz > 1.15 ? 0.92 : 1)]));
    B.solid(K.tf(new T.IcosahedronGeometry(mr, 1), mz, 0, [0.8 * Math.max(0.6, b.muz), 0.72, 1.25]));
    if (b.fluff || b.hr > 1.08) [-1, 1].forEach(s => B.solid(K.tf(new T.IcosahedronGeometry(hr * 0.42, 1), [hr * 0.2, -hr * 0.34, s * hr * 0.62], 0, [1, 0.8, 0.7])));
    // la marque en M du tigré sur le front ; les plis du sphynx
    if (b.coat === 'tigre' || b.coat === 'rosettes') B.soft(segs([[hr * 0.45, hr * 0.62, -hr * 0.3], [hr * 0.6, hr * 0.5, -hr * 0.16], [hr * 0.52, hr * 0.64, 0], [hr * 0.6, hr * 0.5, hr * 0.16], [hr * 0.45, hr * 0.62, hr * 0.3]]));
    if (b.wrinkles) for (let k = 0; k < 3; k++) B.soft(segs([[hr * 0.4, hr * (0.72 - k * 0.1), -hr * 0.28], [hr * 0.56, hr * (0.66 - k * 0.1), 0], [hr * 0.4, hr * (0.72 - k * 0.1), hr * 0.28]]));
  });
  // le visage : le nez, la bouche, les moustaches ; les yeux ouverts / fermés ; la bouche ouverte (feulement, miaulement)
  const nose = [mz[0] + mr * 0.78 * Math.max(0.6, b.muz), mz[1] + mr * 0.35, 0];
  P.face = Obj3D.piece(key('visage'), B => {
    const n = nose, w = hr * 0.09;
    B.lines(segs([[n[0], n[1] + w * 0.5, -w], [n[0], n[1] + w * 0.5, w], [n[0] + 0.004, n[1] - w * 0.6, 0], [n[0], n[1] + w * 0.5, -w]]));
    B.lines(segs([[n[0] + 0.004, n[1] - w * 0.6, 0], [n[0] + 0.003, n[1] - w * 1.8, 0]]));
    [-1, 1].forEach(s => B.lines(segs([[n[0] + 0.003, n[1] - w * 1.8, 0], [n[0] - 0.002, n[1] - w * 2.3, s * w * 0.9], [n[0] - 0.01, n[1] - w * 2.0, s * w * 1.8]])));
    [-1, 1].forEach(s => [0, 1, 2].forEach(k => { const o = [mz[0] + mr * 0.2, mz[1] - mr * 0.1 + k * mr * 0.12, s * mr * 0.85]; B.soft([...o, o[0] + hr * 0.5, o[1] - hr * 0.12 + k * hr * 0.14, o[2] + s * hr * 0.75]); }));
  });
  // les yeux : en amande, dans le plan tangent au crâne ; la pupille fendue
  const eyeC = s => { const v = V(hr * 0.56, hr * 0.12, s * hr * 0.46); return v; };
  const eyeBasis = s => { const c = eyeC(s), n = c.clone().normalize(), up = V(0, 1, 0), u = up.clone().sub(n.clone().multiplyScalar(up.dot(n))).normalize(), r = n.clone().cross(u).normalize(); return { c: c.multiplyScalar(1.12), u, r }; };
  const eyePts = (s, f) => { const E = eyeBasis(s), w = hr * 0.2, h = hr * 0.12, P = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * TAU, x = Math.cos(a) * w, y = Math.sin(a) * h * (Math.sin(a) > 0 ? 1 : 0.85) * f; P.push([E.c.x + E.r.x * x + E.u.x * y, E.c.y + E.r.y * x + E.u.y * y, E.c.z + E.r.z * x + E.u.z * y]); } return P; };
  P.eyes = Obj3D.piece(key('yeux'), B => [-1, 1].forEach(s => { B.lines(segs(eyePts(s, 1))); const E = eyeBasis(s), h = hr * 0.1; B.lines([E.c.x + E.u.x * h, E.c.y + E.u.y * h, E.c.z + E.u.z * h, E.c.x - E.u.x * h, E.c.y - E.u.y * h, E.c.z - E.u.z * h]); }));
  P.shut = Obj3D.piece(key('yeuxclos'), B => [-1, 1].forEach(s => { const E = eyeBasis(s), w = hr * 0.19, Q = []; for (let k = 0; k <= 8; k++) { const t = k / 8, x = (t - 0.5) * 2 * w, y = -Math.sin(t * Math.PI) * hr * 0.06; Q.push([E.c.x + E.r.x * x + E.u.x * y, E.c.y + E.r.y * x + E.u.y * y, E.c.z + E.r.z * x + E.u.z * y]); } B.lines(segs(Q)); }));
  P.mouth = Obj3D.piece(key('bouche'), B => { const n = nose, Q = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * TAU; Q.push([n[0] - 0.002, n[1] - hr * 0.3 + Math.sin(a) * hr * 0.14, Math.cos(a) * hr * 0.16]); } B.lines(segs(Q)); [-1, 1].forEach(s => B.lines([n[0] - 0.002, n[1] - hr * 0.18, s * hr * 0.1, n[0] - 0.004, n[1] - hr * 0.26, s * hr * 0.07])); });
  // les oreilles : des pyramides à trois faces, l'intérieur en traits ; pliées (fold), à plumets (maine coon)
  const er = hr * 0.42 * b.er, eh = hr * 0.72 * b.eh;
  P.ear = Obj3D.piece(key('oreille'), B => {
    // la pyramide tournée pour présenter une face à plat vers l'avant (x = 0,3 er à la base), l'arête derrière
    B.solid(K.tf(K.lathe([[0, 0], [er, 0], [0, eh]], 3), 0, [0, -Math.PI / 2, 0], [1, 1, 0.6]));
    const fx = y => er * 0.3 * (1 - y / eh) + 0.002;
    B.soft(segs([[fx(eh * 0.1), eh * 0.1, er * 0.5], [fx(eh * 0.72), eh * 0.72, 0], [fx(eh * 0.1), eh * 0.1, -er * 0.5]]));
    if (b.tufts) B.lines([0, eh, 0, 0.004, eh * 1.35, 0, 0, eh, 0, -0.01, eh * 1.28, 0]);
  });
  // les jambes : des fuseaux (tournés autour de y), du haut de l'os vers le bas (y négatif)
  const bone = (len, r0, r1, bulge) => K.lathe(capsule(len, r0 * 0.9, r1 * 0.9, lerp(r0, r1, 0.45) * (bulge || 1)).map(q => [q[1], -q[0]]), 12);
  const fz = b.fluff ? 1.12 : 1;
  P.arm = Obj3D.piece(key('bras'), B => B.solid(bone(D.fa[0], 0.052 * b.bt * fz, 0.034 * fz, 1.05)));
  P.fore = Obj3D.piece(key('avantbras'), B => B.solid(bone(D.fa[1], 0.032 * fz, 0.024 * fz)));
  P.thigh = Obj3D.piece(key('cuisse'), B => B.solid(K.tf(bone(D.ha[0], 0.075 * b.bt * fz, 0.04 * fz, 1.1), 0, 0, [1, 1, 0.8])));
  P.shin = Obj3D.piece(key('jambe'), B => B.solid(bone(D.ha[1], 0.036 * fz, 0.024 * fz)));
  P.meta = Obj3D.piece(key('metatarse'), B => B.solid(bone(D.ha[2], 0.024 * fz, 0.021 * fz)));
  // la patte : un coussinet aplati, deux traits pour les doigts
  P.paw = Obj3D.piece(key('patte'), B => { B.solid(K.tf(new T.IcosahedronGeometry(D.paw * 1.2, 1), [D.paw * 0.55, -D.paw * 0.3, 0], 0, [1.35, 0.6, 1])); [-1, 1].forEach(s => B.soft([D.paw * 1.5, -D.paw * 0.2, s * D.paw * 0.3, D.paw * 1.95, -D.paw * 0.45, s * D.paw * 0.34])); });
  // la queue : huit segments, de plus en plus fins (en panache pour les poils longs), avec ses anneaux (tigré)
  const n = 8, sl = D.tl / n;
  P.tail = []; for (let i = 0; i < n; i++) {
    const r0 = D.tr * (1 - i / n * 0.45) * (b.fluff ? 1 + 0.35 * Math.sin((i + 0.5) / n * Math.PI) : 1), r1 = D.tr * (1 - (i + 1) / n * 0.45) * (b.fluff ? 1 + 0.35 * Math.sin((i + 1.5) / n * Math.PI) : 1) * (i === n - 1 ? 0.6 : 1);
    const pr = capsule(sl, r0, r1, (r0 + r1) / 2 * 1.03, 3);
    P.tail.push(Obj3D.piece(key('queue' + i), B => { B.solid(K.latheX(pr, 12)); if ((b.coat === 'tigre' && i % 2) || (b.coat === 'bicolore' && i === n - 1)) { const Q = []; for (let k = 0; k <= 10; k++) { const t = k / 10 * TAU; Q.push([sl * 0.5, Math.cos(t) * r0 * 1.05, Math.sin(t) * r0 * 1.05]); } B.soft(segs(Q)); } }));
  }
  return { P, D, n, sl };
}

/* ——— une pose : les noms des cases du tableau ——— */
const POSE = ['x', 'y', 'pitch', 'bend', 'twist', 'hyaw', 'hpitch', 'hroll', 'earL', 'earR', 'eyes', 'mouth', 'puff',
  'flA', 'flB', 'flC', 'frA', 'frB', 'frC', 'hlA', 'hlB', 'hlC', 'hlD', 'hrA', 'hrB', 'hrC', 'hrD', 'tailUp', 'tailCurl', 'tailSide', 'tailWave', 'tailPhase', 'neck'];
const I = {}; POSE.forEach((k, i) => { I[k] = i; });
const NP = POSE.length;
// les cases qui sont des angles de jambes (elles suivent la cinématique inverse, et se mélangent vite)
const LEGS = ['flA', 'flB', 'flC', 'frA', 'frB', 'frC', 'hlA', 'hlB', 'hlC', 'hlD', 'hrA', 'hrB', 'hrC', 'hrD'].map(k => I[k]);

/* ——— la cinématique inverse, dans le plan du chat (x vers l'avant, y vers le haut) ———
   deux os (l1, l2) depuis la racine r vers la cible t ; knee = +1 : le genou part vers l'avant (patte arrière), −1 : le coude vers l'arrière.
   Renvoie les angles absolus des deux os (0 : l'os pend vers le bas ; positif : vers l'avant). */
function ik2(r, t, l1, l2, knee) {
  let dx = t[0] - r[0], dy = t[1] - r[1], d = Math.hypot(dx, dy); const dm = (l1 + l2) * 0.999;
  if (d > dm) { dx *= dm / d; dy *= dm / d; d = dm; } if (d < 1e-4) d = 1e-4;
  const base = Math.atan2(dx, -dy), al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))), be = Math.acos(Math.max(-1, Math.min(1, (l2 * l2 + d * d - l1 * l1) / (2 * l2 * d))));
  return knee > 0 ? [base + al, base - be] : [base - al, base + be];
}
const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];

/* ——— un chat ——— */
let uid = 0;
function create(id, o) {
  o = o || {}; id = BREEDS[id] ? id : IDS[Math.floor(Math.random() * IDS.length)];
  const b = BREEDS[id], M = build(id), D = M.D, P = M.P;
  const col = o.color ?? b.col, mats = Obj3D.mats(col), eyeM = Obj3D.mats(b.eye), ptsM = b.pts ? Obj3D.mats(b.pts) : mats, pts2M = b.pts2 ? Obj3D.mats(b.pts2) : null;
  const all = [], G = () => new T.Group();
  const put = (pp, parent, m) => { const q = Obj3D.mount(pp, m || mats); parent.add(q.g); all.push(q); return q; };
  // les os
  const root = G(), view = G(), body = G(), torso = G(), rear = G(), front = G(), neck = G(), head = G();
  root.add(view); view.add(body); body.add(torso); torso.add(rear); torso.add(front); front.add(neck); neck.add(head);
  front.position.set(...D.spine);
  put(P.rear, rear); put(P.front, front); if (P.patchA) { put(P.patchA, rear, ptsM); put(P.patchB, front, pts2M); }
  neck.position.set(D.neck[0], D.neck[1], 0); put(P.neck, neck, b.coat === 'points' ? ptsM : mats);
  head.position.set(0.06 + D.hr * 0.25, 0.075, 0);
  // la tête et le visage : les extrémités du siamois sont plus sombres (le masque, les oreilles)
  const hm = b.coat === 'points' ? ptsM : mats;
  put(P.head, head, hm); put(P.face, head, b.coat === 'bicolore' ? mats : hm);
  const eyes = put(P.eyes, head, eyeM), shut = put(P.shut, head, hm), mouth = put(P.mouth, head, hm); shut.g.visible = false; mouth.g.visible = false;
  const ears = [-1, 1].map(s => { const e = G(); e.position.set(-D.hr * 0.12, D.hr * 0.68, s * D.hr * 0.5); head.add(e); const q = put(P.ear, e, hm); e.userData.s = s; return e; });
  // les jambes : un groupe par articulation
  const leg = (parent, at, s, bones, pieces, m) => {
    const j = [], hip = G(); hip.position.set(at[0], at[1], s * at[2]); parent.add(hip); let cur = hip;
    bones.forEach((len, i) => { const g = i === 0 ? hip : G(); if (i) { g.position.set(0, -bones[i - 1], 0); cur.add(g); } put(pieces[i], g, i >= bones.length - 1 && m ? m : mats); j.push(g); cur = g; });
    const pw = G(); pw.position.set(0, -bones[bones.length - 1], 0); cur.add(pw); put(P.paw, pw, m || mats); j.push(pw);
    return j;
  };
  const pm = b.coat === 'points' ? ptsM : null, legs = {
    fl: leg(front, D.sh, -1, D.fa, [P.arm, P.fore], pm), fr: leg(front, D.sh, 1, D.fa, [P.arm, P.fore], pm),
    hl: leg(rear, D.hip, -1, D.ha, [P.thigh, P.shin, P.meta], pm), hr: leg(rear, D.hip, 1, D.ha, [P.thigh, P.shin, P.meta], pm)
  };
  // la queue
  const tail = []; let tp = rear; const tb = G(); tb.position.set(D.tail[0], D.tail[1], 0); rear.add(tb); tp = tb;
  M.P.tail.forEach((pp, i) => { const g = G(); if (i) g.position.set(M.sl, 0, 0); tp.add(g); put(pp, g, b.coat === 'points' || (b.coat === 'bicolore' && false) ? ptsM : mats); tail.push(g); tp = g; });
  const R = Obj3D.rig(root, all);
  const cat = {
    id: ++uid, breed: id, b, D, root, view, body, torso, rear, front, neck, head, ears, legs, tail, eyes, shut, mouth, mats: [mats, eyeM, ptsM, pts2M].filter(Boolean), R, all,
    cur: new Float32Array(NP), tgt: new Float32Array(NP), rate: 10,
    // où il est : à l'écran (px), sa taille (px par unité), son orientation (yaw : 0 vers la droite), son corps entier (pitch, roll), sa profondeur (z)
    x: 0, y: 0, s: 160, yaw: 0, face: 1, all: 0, roll: 0, z: 0, a: 1
  };
  rest(cat, cat.cur); cat.tgt.set(cat.cur);
  return cat;
}
function destroy(c) { if (c && c.R) Obj3D.unrig(c.R); if (c) c.R = null; }

/* ——— les poses de base ——— */
// debout, immobile : les pattes sous les épaules et les hanches
function rest(c, p) {
  p.fill(0); const D = c.D;
  p[I.y] = D.stand; p[I.pitch] = 0.02; p[I.tailUp] = 0.3; p[I.tailCurl] = 1.1; p[I.hpitch] = -0.05; p[I.neck] = 0;
  standLegs(c, p);
  return p;
}
// les pattes posées au sol sous le corps (x : le décalage des pattes), par cinématique inverse
function standLegs(c, p, feet) {
  const D = c.D; feet = feet || {};
  ['fl', 'fr', 'hl', 'hr'].forEach(k => { const f = feet[k] || [k[0] === 'f' ? D.sh[0] + 0.02 : D.hip[0] + 0.03, 0]; legIK(c, p, k, f[0], f[1] + D.paw * 0.6, f[2]); });
}
// la racine d'une jambe (hanche, épaule) dans le repère du chat, pour la pose p
function legRoot(c, p, k) {
  const D = c.D, pitch = p[I.pitch];
  if (k[0] === 'h') { const q = rot([D.hip[0], D.hip[1]], pitch); return [p[I.x] + q[0], p[I.y] + q[1], pitch]; }
  const s = rot([D.spine[0], D.spine[1]], pitch), q = rot([D.sh[0], D.sh[1]], pitch + p[I.bend]);
  return [p[I.x] + s[0] + q[0], p[I.y] + s[1] + q[1], pitch + p[I.bend]];
}
// poser une patte en (fx, fy) : le coude / le genou suivent ; meta : l'angle absolu du métatarse (patte arrière) ou de la patte avant
function legIK(c, p, k, fx, fy, meta) {
  const D = c.D, r = legRoot(c, p, k), par = r[2];
  if (k[0] === 'f') {
    const a = ik2(r, [fx, fy], D.fa[0], D.fa[1], -1), o = I[k + 'A'];
    p[o] = a[0] - par; p[o + 1] = a[1] - a[0]; p[o + 2] = (meta ?? 0) - a[1];   // la patte reste à plat (ou suit meta)
  } else {
    // le métatarse : presque vertical debout (la patte un peu en avant du jarret) ; couché au sol quand il est assis
    const m = meta ?? 0.22, hx = fx - Math.sin(m) * D.ha[2], hy = fy + Math.cos(m) * D.ha[2];
    const a = ik2(r, [hx, hy], D.ha[0], D.ha[1], 1), o = I[k + 'A'];
    p[o] = a[0] - par; p[o + 1] = a[1] - a[0]; p[o + 2] = m - a[1]; p[o + 3] = -m;
  }
}
// une jambe par ses angles absolus (pendre, tendre) : A, B, C (et D) sont les angles de chaque os par rapport à la verticale
function legAbs(c, p, k, angs) {
  const par = legRoot(c, p, k)[2], o = I[k + 'A']; let prev = par;
  angs.forEach((a, i) => { p[o + i] = a - prev; prev = a; });
}

/* ——— les allures : où sont les pattes, selon la phase (0 → 1) ———
   pas : les pattes l'une après l'autre (arrière gauche, avant gauche, arrière droite, avant droite) ;
   trot : les diagonales ensemble ; galop : les arrière, puis les avant, le dos qui se plie et se déplie. */
const GAITS = {
  pas:   { duty: 0.64, off: { hl: 0, fl: 0.25, hr: 0.5, fr: 0.75 }, stride: 0.2, lift: 0.045, bob: 0.008 },
  trot:  { duty: 0.48, off: { fl: 0, hr: 0.02, fr: 0.5, hl: 0.52 }, stride: 0.28, lift: 0.06, bob: 0.012 },
  galop: { duty: 0.32, off: { hl: 0, hr: 0.08, fl: 0.46, fr: 0.56 }, stride: 0.36, lift: 0.09, bob: 0.05 }
};
// une allure : v la vitesse (unités par seconde) ; la phase avance avec la distance parcourue ; k la part de l'allure (0 → 1, pour s'arrêter en douceur)
function gait(c, p, g, ph, k, o) {
  o = o || {}; const G = GAITS[g], D = c.D, S = G.stride * (o.stride || 1) * k, tilt = o.tilt || 0;
  const feet = {};
  Object.keys(G.off).forEach(leg => {
    const f = ((ph + G.off[leg]) % 1 + 1) % 1, home = leg[0] === 'f' ? D.sh[0] + 0.02 : D.hip[0] + 0.03;
    let fx, fy;
    if (f < G.duty) { fx = home + S / 2 - S * (f / G.duty); fy = 0; }
    else { const u = (f - G.duty) / (1 - G.duty), e = sm(u); fx = home - S / 2 + S * e; fy = Math.sin(u * Math.PI) * G.lift * k * (o.lift || 1); }
    feet[leg] = [fx, fy + (o.floor || 0), leg[0] === 'h' ? 0.22 + (fy > 0 ? 0.5 * fy / G.lift : 0) : (fy > 0 ? -0.6 * fy / G.lift : 0)];
  });
  // le corps : un léger balancement (pas, trot), le dos qui s'arque et s'étire (galop)
  p[I.y] += (g === 'galop' ? Math.sin(ph * TAU) * G.bob : Math.cos(ph * TAU * 2) * G.bob) * k;
  if (g === 'galop') { p[I.bend] += Math.sin(ph * TAU + 0.6) * 0.32 * k; p[I.pitch] += Math.cos(ph * TAU) * 0.1 * k; p[I.hpitch] -= Math.sin(ph * TAU + 0.6) * 0.25 * k; }
  p[I.pitch] += tilt;
  standLegs(c, p, feet);
}

/* ——— poser le chat à l'écran, puis ses os ——— */
const qa = new T.Quaternion(), qb = new T.Quaternion(), E = new T.Euler(), AX = V(1, 0, 0), AY = V(0, 1, 0), AZ = V(0, 0, 1);
function step(c, dt, opts) {
  const k = 1 - Math.exp(-dt * c.rate), kl = 1 - Math.exp(-dt * (c.legRate || c.rate * 2.2));
  for (let i = 0; i < NP; i++) c.cur[i] += (c.tgt[i] - c.cur[i]) * (LEGS.includes(i) ? kl : k);
  apply(c, opts);
}
function apply(c, opts) {
  const p = c.cur, D = c.D;
  // la racine : où il est, sa taille ; la vue (tout le monde est vu de trois quarts, d'un peu au-dessus : VIEW)
  c.root.position.set(c.x, -c.y, c.z); c.root.scale.setScalar(c.s * c.b.s);
  qa.setFromAxisAngle(AX, VIEW.tilt); qb.setFromAxisAngle(AY, c.yaw); qa.multiply(qb);
  qb.setFromAxisAngle(AZ, c.all); qa.multiply(qb); qb.setFromAxisAngle(AX, c.roll); qa.multiply(qb);
  c.view.quaternion.copy(qa);
  c.torso.position.set(p[I.x], p[I.y], 0); c.torso.rotation.set(0, 0, p[I.pitch]);
  c.front.rotation.set(0, p[I.twist], p[I.bend]);
  c.neck.rotation.set(0, p[I.hyaw] * 0.35, p[I.neck]);
  c.head.rotation.set(p[I.hroll], p[I.hyaw] * 0.65, p[I.hpitch] - p[I.neck] * 0.5, 'YZX');
  c.ears.forEach((e, i) => { const s = e.userData.s, f = c.b.fold ? 0.9 : 0; e.rotation.set(s * (0.28 + (i ? p[I.earR] : p[I.earL]) * 0.9), 0, -0.2 + f * 1.4 - (i ? p[I.earR] : p[I.earL]) * 0.6); });
  c.eyes.g.visible = p[I.eyes] < 0.5; c.shut.g.visible = p[I.eyes] >= 0.5; c.mouth.g.visible = p[I.mouth] > 0.5;
  ['fl', 'fr', 'hl', 'hr'].forEach(k => { const j = c.legs[k], o = I[k + 'A']; j.forEach((g, i) => { g.rotation.set(0, 0, p[o + i] || 0); }); });
  // la queue : elle monte (tailUp), s'enroule (tailCurl), part de côté (tailSide), ondule (tailWave, tailPhase) ; gonflée (puff)
  const n = c.tail.length, puff = 1 + p[I.puff];
  c.tail.forEach((g, i) => { const t = i / (n - 1);
    const rz = i === 0 ? Math.PI - p[I.tailUp] : p[I.tailCurl] * 0.22 * (0.4 + t) * -1 + Math.sin(p[I.tailPhase] - t * 2.4) * p[I.tailWave] * 0.08 * t;
    const ry = (i === 0 ? p[I.tailSide] * 0.5 : p[I.tailSide] * 0.12) + Math.cos(p[I.tailPhase] * 0.7 - t * 2) * p[I.tailWave] * 0.1 * t;
    g.rotation.set(0, ry, rz); g.scale.set(1, puff, puff); });
  // l'opacité : celle du monde qui le montre
  const a = c.a * (opts && opts.a !== undefined ? opts.a : 1);
  c.mats.forEach(m => { m.line.opacity = Math.min(1, 0.95 * a); m.soft.opacity = 0.42 * a; });
  c.root.visible = a > 0.01;
}
/* où est, à l'écran, un point d'un os (en unités chat, dans le repère de l'os) */
const wv = V(0, 0, 0);
function where(c, g, pt) { c.root.updateMatrixWorld(true); wv.set(pt ? pt[0] : 0, pt ? pt[1] : 0, pt ? pt[2] : 0); g.localToWorld(wv); return [wv.x, -wv.y, wv.z]; }

// la vue commune : tout est vu d'un peu au-dessus (les objets du décor aussi : js/univers.js)
const VIEW = { tilt: 0.2, yaw: 0.34 };
return { BREEDS, IDS, POSE, I, NP, create, destroy, rest, standLegs, legIK, legAbs, legRoot, gait, GAITS, step, apply, where, ik2, VIEW, dims, c01, sm, lerp };
})();
