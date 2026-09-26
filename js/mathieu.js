/* Mathieu en 3D : la tête et le buste, dessinés au stylo (le même trait épais que les chats), mignon et caricatural.
   D'après ses photos : les cheveux bruns en pics, dressés ; la moustache ; le visage long, le menton étroit ; la chemise blanche à col ouvert.
   Tout est à l'encre : des contours qui suivent la vue ; les pupilles, les sourcils et la moustache sont pleins.

   Le repère (en « unités tête ») : y vers le haut, z vers nous ; le haut du crâne vers y = 5, le menton vers y = −5, le bas du buste en y = −13.
   Le pantin :
     racine (posée à l'écran : position en px, taille) ─ tour (tourner sur lui-même, pencher)
       buste : le torse, le cou, le col et les boutons de la chemise
       tête (pivot au cou : hocher) : le crâne et le visage, les cheveux, les oreilles, le nez, les yeux, les sourcils, la moustache, les dents
         la joue étirée et le trou noir (visibles quand la bouche s'ouvre)
         mâchoire (pivot près des oreilles) : le menton, la bouche fermée
   Mathieu.create() crée le pantin ; Mathieu.pose(m, { x, y, s, turn, tilt, nod, open, blink, a }) le pose :
     x, y : le centre de la tête à l'écran (px) · s : la hauteur de toute la figure (px) · turn : le tour sur lui-même (radians, 0 de face)
     open : la bouche, de 0 (fermée) à 1 (biblique : la mâchoire descend très bas, un trou d'encre) · blink : les yeux, de 0 (ouverts) à 1 (fermés)
   Mathieu.mouthAt(m) : le centre du trou noir à l'écran et sa taille (px), pour y plonger (docs/plan-transition.md). */
window.Mathieu = (() => {
if (!window.Obj3D || !Obj3D.kit) return null;
const T = Obj3D.T, K = Obj3D.kit, TAU = Math.PI * 2;
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = (a, b, v) => { v = c01((v - a) / (b - a)); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new T.Vector3(x, y, z);
function hsh(a, b) { let x = (Math.imul(a | 0, 374761393) + Math.imul((b | 0) + 1, 668265263)) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
const H = 22;          // la hauteur de la figure, en unités (des pointes des cheveux au bas du buste)
const PEN = 3;         // le trait, en px, pour une figure de 400 px ; il épaissit avec la taille

/* ——— les volumes ——— */
// un ellipsoïde (centre c, rayons r), déformable : f(x, y, z) reçoit la direction (sphère unité) et rend le point, en unités
function ell(c, r, f, ws, hs) {
  const g = new T.SphereGeometry(1, ws || 44, hs || 30), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const d = [p.getX(i), p.getY(i), p.getZ(i)], q = f ? f(d[0], d[1], d[2]) : [c[0] + r[0] * d[0], c[1] + r[1] * d[1], c[2] + r[2] * d[2]];
    p.setXYZ(i, q[0], q[1], q[2]);
  }
  g.computeVertexNormals(); return g;
}
// la surface avant d'un ellipsoïde : sa profondeur z au point (x, y) (null en dehors)
const front = (c, r) => (x, y) => { const q = 1 - Math.pow((x - c[0]) / r[0], 2) - Math.pow((y - c[1]) / r[1], 2); return q <= 0 ? null : c[2] + r[2] * Math.sqrt(q); };
const segs = P => { const out = []; for (let i = 0; i < P.length - 1; i++) out.push(...P[i], ...P[i + 1]); return out; };
// un fuseau : une courbe (points), un rayon qui varie le long (rf(t), t de 0 à 1) ; fermé aux deux bouts
function fuseau(P, rf, n) {
  n = n || 10; const curve = new T.CatmullRomCurve3(P.map(p => V(...p))), N = 48, pos = [], idx = [];
  const fr = curve.computeFrenetFrames(N, false);
  for (let i = 0; i <= N; i++) {
    const t = i / N, c = curve.getPointAt(t), r = rf(t), nn = fr.normals[i], bb = fr.binormals[i];
    for (let k = 0; k < n; k++) { const a = k / n * TAU, ca = Math.cos(a) * r, sa = Math.sin(a) * r; pos.push(c.x + nn.x * ca + bb.x * sa, c.y + nn.y * ca + bb.y * sa, c.z + nn.z * ca + bb.z * sa); }
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < n; k++) { const a = i * n + k, b = i * n + (k + 1) % n, cc = a + n, d = b + n; idx.push(a, cc, b, b, cc, d); }
  const e0 = pos.length / 3, c0 = curve.getPointAt(0), e1 = e0 + 1, c1 = curve.getPointAt(1); pos.push(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z);
  for (let k = 0; k < n; k++) { idx.push(e0, (k + 1) % n, k); idx.push(e1, N * n + k, N * n + (k + 1) % n); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
// une ellipse pleine, vue de face (dans le plan x, y)
const disc = n => new T.CircleGeometry(1, n || 32);

/* ——— les mesures ——— */
const HEAD = { c: [0, 0.6, 0], r: [3.45, 4.3, 3.9] };                 // le crâne et le haut du visage
const JAW = { c: [0, -2.55, 0.35], r: [2.75, 2.55, 3.2], pivot: [0, -0.6, -1.4], top: 0.4 };   // top : le haut de la mâchoire aplati (la lèvre du bas, bouche ouverte)
const zHead = front(HEAD.c, HEAD.r);
const jawPt = (ux, uy, uz) => { const k = uy < 0 ? 1 - 0.32 * Math.pow(-uy, 1.5) : 1; return [JAW.c[0] + JAW.r[0] * ux * k, JAW.c[1] + JAW.r[1] * uy * (uy > 0 ? JAW.top : 1), JAW.c[2] + JAW.r[2] * uz * (uy < 0 ? 1 - 0.12 * Math.pow(-uy, 2) : 1)]; };
const zJaw = (x, y) => { let uy = (y - JAW.c[1]) / JAW.r[1]; if (uy > 0) uy /= JAW.top; const k = uy < 0 ? 1 - 0.32 * Math.pow(-uy, 1.5) : 1, kz = uy < 0 ? 1 - 0.12 * uy * uy : 1, q = 1 - Math.pow(x / (JAW.r[0] * k), 2) - uy * uy; return q <= 0 ? null : JAW.c[2] + JAW.r[2] * kz * Math.sqrt(q); };
const zFace = (x, y) => Math.max(zHead(x, y) ?? -9, zJaw(x, y) ?? -9);
// le buste : un tour (rayon selon la hauteur), aplati d'avant en arrière
const TORSO = [[1.55, -5.7], [3.3, -6.35], [5.4, -7.05], [6.7, -7.95], [7.2, -9.2], [7.25, -11], [7.1, -13]], TZ = 0.5, TZ0 = -0.7;
const rTorso = y => { for (let i = 1; i < TORSO.length; i++) { const a = TORSO[i - 1], b = TORSO[i]; if (y <= a[1] && y >= b[1]) return lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1])); } return 0; };
const zTorso = (x, y) => { const r = rTorso(y); return TZ0 + TZ * Math.sqrt(Math.max(0, r * r - x * x)); };
const onT = (x, y) => [x, y, zTorso(x, y) + 0.05];

/* ——— les pièces, modelées une fois ——— */
let P = null;
function build() {
  if (P) return P; P = {};
  const piece = (k, f) => Obj3D.piece('mathieu:' + k, f);
  // le crâne et le haut du visage
  P.head = piece('crane', B => B.smooth(ell(HEAD.c, HEAD.r)));
  // la mâchoire : le menton étroit, un peu en avant
  P.jaw = piece('machoire', B => B.smooth(ell(null, null, jawPt)));
  // la bouche fermée : un petit sourire, sous la moustache
  P.smile = piece('sourire', B => { const Q = []; for (let i = 0; i <= 16; i++) { const x = -1.05 + 2.1 * i / 16, y = -2.78 + 0.22 * Math.pow(x / 1.05, 2); Q.push([x, y, zJaw(x, y) + 0.03]); } B.lines(segs(Q)); });
  // les oreilles : aplaties, un trait dedans
  P.ears = piece('oreilles', B => [-1, 1].forEach(s => {
    B.smooth(K.tf(ell([0, 0, 0], [0.34, 1.0, 0.72]), [s * 3.42, 0.05, -0.35], [0, s * 0.35, s * -0.08]));
    const Q = []; for (let i = 0; i <= 12; i++) { const a = -1.2 + i / 12 * 2.6; Q.push([s * 3.62, 0.05 + Math.sin(a) * 0.62, -0.35 + Math.cos(a) * 0.38]); } B.soft(segs(Q));
  }));
  // le nez : long, le bout un peu tombant
  P.nose = piece('nez', B => B.smooth(K.tf(ell([0, 0, 0], [0.5, 1.3, 0.72]), [0, -0.55, 3.72], [-0.28, 0, 0])));
  // les dents du haut : une rangée, visible quand la bouche s'ouvre
  P.teeth = piece('dents', B => { B.solid(K.box(2.0, 0.6, 0.5, [0, -2.5, 2.45])); B.lines([-0.5, -2.2, 2.71, -0.5, -2.8, 2.71, 0, -2.2, 2.71, 0, -2.8, 2.71, 0.5, -2.2, 2.71, 0.5, -2.8, 2.71]); });
  // la joue étirée (une sphère unité, mise à l'échelle à chaque image)
  P.cheek = piece('joue', B => B.smooth(ell([0, 0, 0], [1, 1, 1], null, 36, 24)));
  // les cheveux : une calotte qui s'arrête à la ligne des cheveux (le front dégagé, les tempes, la nuque), puis des mèches en pics
  const HC = [0, 1.25, -0.3], HR = [3.8, 4.05, 4.3];
  const hl = az => { const A = [[0, 2.75], [0.55, 2.55], [0.95, 2.1], [1.3, 0.35], [1.75, 0.1], [2.4, -0.9], [Math.PI, -1.5]], a = Math.abs(az); for (let i = 1; i < A.length; i++) if (a <= A[i][0]) return lerp(A[i - 1][1], A[i][1], (a - A[i - 1][0]) / (A[i][0] - A[i - 1][0])); return -1.5; };
  const capPt = (ux, uy, uz) => {
    const x = HC[0] + HR[0] * ux, y = HC[1] + HR[1] * uy, z = HC[2] + HR[2] * uz, az = Math.atan2(x, z), k = sm(hl(az) - 0.4, hl(az) + 0.15, y);
    const rough = 1 + 0.035 * Math.sin(ux * 9 + uz * 7) * Math.sin(uy * 11), f = lerp(0.8, rough, k), c = [0, 0.4, 0];
    return [c[0] + (x - c[0]) * f, c[1] + (y - c[1]) * f, c[2] + (z - c[2]) * f];
  };
  P.hair = piece('cheveux', B => {
    B.smooth(ell(null, null, capPt, 56, 40));
    // les pics : sur le dessus, dressés, un peu vers l'avant ; la frange part vers le haut et vers sa gauche (notre droite)
    const up = V(0, 1, 0), n = 22;
    for (let i = 0; i < n; i++) {
      const u = hsh(i, 3), v = hsh(i, 7), w = hsh(i, 11);
      const az = (i < 9 ? -1.1 + i / 8 * 2.2 : lerp(-2.9, 2.9, (i - 9) / (n - 10))) + (u - 0.5) * 0.25, el = i < 9 ? 0.5 + 0.35 * v : 0.35 + 0.8 * v;
      const d = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), q = capPt(d.x, d.y, d.z), p = V(...q);
      const nrm = p.clone().sub(V(0, 0.4, 0)).normalize(), dir = nrm.multiplyScalar(0.55).add(up.clone().multiplyScalar(i < 9 ? 1.1 : 0.7)).add(V(0.35 + (w - 0.5) * 0.6, 0, i < 9 ? 0.35 : 0)).normalize();
      const L = (i < 9 ? 1.5 : 1.1) + 1.1 * w, rb = 0.55 + 0.3 * u;
      const g = K.lathe([[0, -0.7], [rb, -0.7], [rb, 0], [rb * 0.72, L * 0.4], [rb * 0.35, L * 0.78], [0, L]], 12);
      g.applyMatrix4(new T.Matrix4().compose(p.clone().add(dir.clone().multiplyScalar(-0.2)), new T.Quaternion().setFromUnitVectors(up, dir), V(1, 1, 1)));
      B.smooth(g);
    }
    // quelques mèches dessinées sur le devant
    [[-1.6, 0.9], [-0.4, 1.1], [0.8, 1.0], [1.9, 0.8]].forEach(([x0, h], j) => { const Q = []; for (let i = 0; i <= 8; i++) { const t = i / 8, x = x0 + t * 0.7, y = 3.05 + t * h * 1.4, d = V(x, y - 0.4, 0); const zz = HC[2] + HR[2] * Math.sqrt(Math.max(0, 1 - Math.pow(x / HR[0], 2) - Math.pow((y - HC[1]) / HR[1], 2))); Q.push([x, y, zz + 0.05]); } B.soft(segs(Q)); });
  });
  // le cou, le buste
  P.neck = piece('cou', B => B.smooth(K.tf(new T.CylinderGeometry(1.32, 1.5, 4.6, 28, 1, true), [0, -4.7, -1.4], 0, [1, 1, 0.9])));
  P.torso = piece('buste', B => {
    const g = K.lathe(TORSO.map(p => [p[0], p[1]]), 56); g.scale(1, 1, TZ); g.translate(0, 0, TZ0); B.smooth(g);
    // le bas du buste : une ellipse
    const Q = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU; Q.push([Math.cos(a) * 7.1, -13, TZ0 + Math.sin(a) * 7.1 * TZ]); } B.lines(segs(Q));
  });
  // la chemise : le pied de col autour du cou, les deux pans du col, l'ouverture, la patte de boutonnage, les boutons
  P.shirt = piece('chemise', B => {
    const band = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; band.push([Math.sin(a) * 1.58, -5.35 - 0.25 * Math.max(0, Math.cos(a)), -1.4 + Math.cos(a) * 1.45]); } B.lines(segs(band));
    [-1, 1].forEach(s => {
      const C = [[1.45, -5.55], [2.95, -6.35], [2.25, -8.05], [0.3, -7.05], [1.25, -5.9]].map(([x, y]) => onT(s * x, y)); B.lines(segs(C));
      B.soft(segs([onT(s * 1.7, -6.1), onT(s * 1.0, -6.9)]));
    });
    B.lines(segs([onT(-0.3, -7.05), onT(0, -8.4), onT(0.3, -7.05)]));
    B.lines(segs([onT(0.45, -8.2), onT(0.45, -13)])); B.soft(segs([onT(-0.25, -8.4), onT(-0.25, -13)]));
    [-9.4, -10.9, -12.3].forEach(y => { const Q = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU; Q.push(onT(0.1 + Math.cos(a) * 0.17, y + Math.sin(a) * 0.17)); } B.lines(segs(Q)); });
    // les plis des épaules, à peine
    [-1, 1].forEach(s => B.soft(segs([onT(s * 4.6, -7.4), onT(s * 5.4, -8.6), onT(s * 5.6, -10)])));
  });
  // les pupilles (pleines) : on les pose dans create
  P.eye = [[-1.32, 0.75], [1.32, 0.75]].map(([x, y]) => ({ x, y, z: zHead(x, y) }));
  // les sourcils : épais, droits, un peu relevés vers l'extérieur
  P.brows = [-1, 1].map(s => { const Q = [0.45, 1.3, 2.1].map((x, i) => { const y = 1.72 + [0, 0.12, 0.05][i]; return [s * x, y, zHead(s * x, y) + 0.05]; }); return fuseau(Q, t => 0.15 + 0.07 * Math.sin(t * Math.PI), 8); });
  // la moustache : épaisse au milieu, les pointes qui tombent aux coins de la bouche
  const MQ = []; for (let i = 0; i <= 14; i++) { const t = -1 + 2 * i / 14, a = Math.abs(t), x = 2.05 * t, y = -1.98 - 0.12 * a - 0.42 * Math.pow(a, 3); MQ.push([x, y, zFace(x, y) + 0.12]); }
  P.stache = fuseau(MQ, t => { const a = Math.abs(2 * t - 1); return (0.3 * (1 - Math.pow(a, 2.4)) + 0.04) * (0.78 + 0.22 * Math.min(1, a * 5)); }, 10);
  return P;
}

/* ——— le pantin ——— */
const inkNow = () => (window.THEME && THEME.inkHex) ?? 0x222428;
const all = new Set();
function create(o) {
  o = o || {}; const P = build(), G = () => new T.Group();
  const mats = Obj3D.mats(o.color ?? undefined, { fat: PEN, fatSoft: PEN * 0.75 }), list = [];
  const ink = new T.MeshBasicMaterial({ color: o.color ?? inkNow(), transparent: true, side: T.DoubleSide });
  const hole = new T.MeshBasicMaterial({ colorWrite: false });
  const put = (pp, parent) => { const q = Obj3D.mount(pp, mats); parent.add(q.g); list.push(q); return q; };
  const mesh = (g, m, parent, ord) => { const x = new T.Mesh(g, m); x.renderOrder = ord ?? 1; x.frustumCulled = false; parent.add(x); return x; };
  const root = G(), turn = G(), bust = G(), head = G(), jaw = G(), mouth = G(), brows = G();
  root.add(turn); turn.add(bust); turn.add(head);
  // la tête pivote au cou (y = −3.2) : ses pièces sont dans hk, décalé d'autant
  head.position.set(0, -3.2, 0); const hk = G(); hk.position.set(0, 3.2, 0); head.add(hk); hk.add(jaw); hk.add(mouth); hk.add(brows);
  put(P.torso, bust); put(P.neck, bust); put(P.shirt, bust);
  put(P.head, hk); put(P.hair, hk); put(P.ears, hk); put(P.nose, hk); put(P.teeth, hk);
  jaw.position.set(...JAW.pivot); const jk = G(); jk.position.set(-JAW.pivot[0], -JAW.pivot[1], -JAW.pivot[2]); jaw.add(jk);
  put(P.jaw, jk); const smile = put(P.smile, jk);
  // les yeux : une pupille pleine, un reflet (un petit trou qui laisse voir le papier)
  const eyes = P.eye.map(e => {
    const g = G(); g.position.set(e.x, e.y, e.z + 0.02); g.lookAt(V(e.x, e.y, e.z).sub(V(...HEAD.c)).multiply(V(1 / HEAD.r[0] ** 2, 1 / HEAD.r[1] ** 2, 1 / HEAD.r[2] ** 2)).normalize().add(g.position)); hk.add(g);
    const pup = G(); g.add(pup); mesh(disc(28), ink, pup).scale.set(0.4, 0.5, 1);
    const hi = mesh(disc(16), hole, pup, 0); hi.scale.set(0.13, 0.14, 1); hi.position.set(0.12, 0.19, 0.02);
    const hi2 = mesh(disc(12), hole, pup, 0); hi2.scale.set(0.05, 0.05, 1); hi2.position.set(-0.1, -0.14, 0.02);
    return pup;
  });
  P.brows.forEach(g => mesh(g, ink, brows));
  mesh(P.stache, ink, hk);
  // la bouche ouverte : la joue étirée (derrière), le trou d'encre, et le bord des lèvres (un trait épais, en ellipse)
  const cheek = put(P.cheek, mouth); cheek.g.visible = false;
  const cav = mesh(disc(48), ink, mouth); cav.visible = false;
  const lipArr = []; for (let i = 0; i < 64; i++) { const a = i / 64 * TAU, b = (i + 1) / 64 * TAU; lipArr.push(Math.cos(a), Math.sin(a), 0, Math.cos(b), Math.sin(b), 0); }
  const lip = Obj3D.fatSegs(new Float32Array(lipArr), mats.line); lip.renderOrder = 1; lip.frustumCulled = false; mouth.add(lip); lip.visible = false;
  const R = Obj3D.rig(root, list);
  const m = { root, turn, bust, head, jaw, mouth, cheek, cav, lip, smile, eyes, brows, mats, ink, R, list, cur: {}, a: 1 };
  all.add(m); pose(m, {});
  return m;
}
function destroy(m) { if (!m) return; Obj3D.unrig(m.R); all.delete(m); }

/* ——— la pose ——— */
const wv = new T.Vector3();
function pose(m, o) {
  const p = Object.assign(m.cur, o), s = (p.s ?? 400) / H, open = c01(p.open ?? 0), a = p.a ?? 1;
  m.root.position.set(p.x ?? 0, -(p.y ?? 0), p.z ?? 0); m.root.scale.setScalar(s);
  // le centre de la tête est en (0, 0.6) : la racine est posée là
  m.turn.position.set(0, -0.6, 0);
  m.turn.rotation.set(p.tilt ?? 0, p.turn ?? 0, p.roll ?? 0, 'YXZ');
  m.head.rotation.set((p.nod ?? 0) - open * 0.12, 0, 0);
  // la bouche : la mâchoire tourne et descend (très bas : c'est un dessin animé), la tête s'étire un peu
  const drop = open * 7, ang = open * 0.22;
  m.jaw.rotation.set(-ang, 0, 0); m.jaw.position.set(JAW.pivot[0], JAW.pivot[1] - drop, JAW.pivot[2] + open * 1.8);
  m.jaw.scale.setScalar(1 + open * 0.14);   // uniforme : les contours restent justes
  m.smile.g.visible = open < 0.06;
  m.brows.position.set(0, open * 0.55 + (p.brow ?? 0) * 0.4, 0);
  // le trou : entre les dents du haut (y ≈ −2.8) et la lèvre du bas (un point de la mâchoire, suivi)
  const on = open > 0.02; m.cav.visible = m.lip.visible = m.cheek.g.visible = on;
  if (on) {
    m.jaw.updateMatrix(); wv.set(0, -1.9, 3.1).sub(V(...JAW.pivot)).applyMatrix4(m.jaw.matrix);   // la lèvre du bas, dans la tête
    const top = -2.35, bot = wv.y, cy = (top + bot) / 2, ry = Math.max(0.05, (top - bot) / 2), rx = lerp(1.2, 3.3, sm(0, 0.6, open));
    m.cav.position.set(0, cy, 2.55); m.cav.scale.set(rx, ry, 1);
    m.lip.position.set(0, cy, 2.62); m.lip.scale.set(rx, ry, 1);
    m.cheek.g.position.set(0, cy + 0.3, 0.2); m.cheek.g.scale.set(lerp(2.6, 3.45, sm(0, 0.6, open)), ry + 1.6, 2.3);
    m.mouthAt = { y: cy, r: [rx, ry] };
  }
  // les yeux : ils clignent (écrasés), grands ouverts quand la bouche s'ouvre
  const bl = 1 - c01(p.blink ?? 0) * 0.92, wide = 1 + open * 0.25; m.eyes.forEach(e => { e.scale.set(wide, bl * wide, 1); e.position.set(p.lookX ?? 0, p.lookY ?? 0, 0); });
  // l'opacité, et le trait qui s'épaissit avec la taille
  const pen = Math.max(2.2, Math.min(10, PEN * (p.s ?? 400) / 400));
  [m.mats.line, m.mats.soft].forEach((M, i) => { M.opacity = a * (i ? 0.5 : 1); if (M.uniforms) M.uniforms.width.value = pen * (i ? 0.75 : 1); });
  m.ink.opacity = a; m.root.visible = a > 0.004;
  return m;
}
// le centre du trou noir à l'écran (px) et ses demi-axes (px) ; null bouche fermée
function mouthAt(m) {
  if (!m.cav.visible) return null;
  m.root.updateMatrixWorld(true); const c = V(0, 0, 0).applyMatrix4(m.cav.matrixWorld), e1 = V(1, 0, 0).applyMatrix4(m.cav.matrixWorld), e2 = V(0, 1, 0).applyMatrix4(m.cav.matrixWorld);
  return { x: c.x, y: -c.y, rx: e1.distanceTo(c), ry: e2.distanceTo(c) };
}
// le thème change : l'encre pleine reprend la couleur du trait
addEventListener('themechange', () => all.forEach(m => m.ink.color.setHex(inkNow())));
return { create, destroy, pose, mouthAt, H };
})();
