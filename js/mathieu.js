/* Mathieu en 3D : son portrait au stylo (tools/mathieu/trait.py, d'après sa photo) posé sur une vraie tête entière, qui peut faire le tour complet.
   La tête vient de la même photo (tools/mathieu/tete.py : les 468 points du visage de MediaPipe, sur un crâne) ; le dessin y est projeté de face
   (visage3d.png : le portrait, sans son contour) et de dos (dos.png : ses cheveux, vus de derrière) ; de profil, c'est la tête elle-même qui fait le trait :
   ses contours sont recalculés à chaque image, comme pour les chats (Obj3D). Le papier reste transparent, comme les chats : seul l'encre se voit.
   Autour : la calotte des cheveux (texturée aussi, avec des mèches sur les côtés et derrière), les oreilles, le cou, le buste en t-shirt Patagonia.

   La bouche : sous la ligne des lèvres, le visage se déforme (la mâchoire descend en arc, le dessin la suit) ; entre les lèvres, de l'encre : le trou noir.

   Les fichiers : media/mathieu/ (tete.json, visage3d.png, dos.png) ; ou window.MATHIEU_MEDIA = { tete, visage3d, dos } (l'aperçu en ligne).
   Mathieu.create() crée le pantin (il apparaît quand tout est chargé) ; Mathieu.create({ logo: true }) : la tête seule, pour le logo du site ;
   Mathieu.pose(m, { x, y, s, turn, tilt, nod, open, a }) le pose :
     x, y : le centre de la tête à l'écran (px) · s : la taille du cadre, du haut des cheveux au bas du buste (px ; en logo, jusqu'au menton)
     turn : le tour sur lui-même (radians, 0 de face) · tilt : pencher en avant · open : la bouche, de 0 à 1 (biblique)
   Mathieu.mouthAt(m) : le centre du trou noir à l'écran et ses demi-axes (px), pour y plonger (docs/plan-transition.md). */
window.Mathieu = (() => {
if (!window.Obj3D || !Obj3D.T) return null;
const T = Obj3D.T;
const DROP = 0.6, PUSH = 0.1;     // la mâchoire, bouche grande ouverte : combien elle descend, combien elle avance (en hauteurs de visage)
const LIFT = 0.07;                 // la lèvre du haut, qui remonte un peu
const BAS = -2.25;                 // le bas du buste
const PEN = 0.02;                  // l'épaisseur du trait, en hauteurs de visage
const BASE = (() => { const s = document.currentScript && document.currentScript.src; try { return s ? new URL('../media/mathieu/', s).href : 'media/mathieu/'; } catch (e) { return 'media/mathieu/'; } })();
const inkNow = () => (window.THEME && THEME.inkHex) ?? 0x222428;

/* ——— les fichiers, chargés une fois ——— */
let assets = null;
function load() {
  if (assets) return assets;
  const M = window.MATHIEU_MEDIA || {}, src = k => M[k] || BASE + k + '.png';
  const img = u => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = u; });
  const tex = i => { const t = new T.Texture(i); t.minFilter = T.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
  const tete = M.tete ? Promise.resolve(M.tete) : fetch(BASE + 'tete.json').then(r => r.json());
  assets = Promise.all([tete, img(src('visage3d')), img(src('dos'))]).then(([D, v, d]) => ({ D, front: tex(v), back: tex(d) }));
  return assets;
}

/* ——— le dessin, projeté sur la tête ———
   Un point (x, y) du modèle → sa place sur la photo (l'inverse de tete.py : amincir, décaler, tourner, mettre à l'échelle), puis dans l'image du dessin
   (build.py : le cadre X0, Y0, S de la photo). Devant, le dessin de face ; derrière, celui de dos (enregistré en miroir) ; sur les côtés, rien que les contours. */
const X0 = 110, Y0 = 60, S = 1034;
function toUv(pr, x, y) {
  const x0 = x / pr.thin + pr.mx, ca = Math.cos(pr.a), sa = Math.sin(pr.a);
  const xr = x0 * ca - y * sa, yr = x0 * sa + y * ca, px = xr / pr.k + pr.c[0], py = pr.c[1] - yr / pr.k;
  return [(px - X0) / S, 1 - (py - Y0) / S];
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function inkMat(A) {
  const u = { front: { value: A.front }, back: { value: A.back }, ink: { value: new T.Color(inkNow()) }, opacity: { value: 1 } };
  return new T.ShaderMaterial({ uniforms: u, side: T.DoubleSide, transparent: true, depthWrite: false, depthFunc: T.LessEqualDepth, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
    vertexShader: `attribute vec2 aUv; attribute vec2 aW; varying vec2 vUv; varying vec2 vW;
      void main() { vUv = aUv; vW = aW; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D front; uniform sampler2D back; uniform vec3 ink; uniform float opacity; varying vec2 vUv; varying vec2 vW;
      void main() {
        vec4 f = texture2D(front, vUv), b = texture2D(back, vec2(1.0 - vUv.x, vUv.y));
        float k = vW.x * f.a * (1.0 - f.r) + vW.y * b.a * (1.0 - b.r);
        gl_FragColor = vec4(ink, clamp(k * 1.15, 0.0, 1.0) * opacity);   /* le papier reste transparent, mais cache ce qui est derrière */
      }` });
}

/* ——— une surface (une grille nv × nu refermée autour), texturée, avec ses contours ———
   Ses contours sont calculés à chaque image : les arêtes où la surface se retourne, vue de la caméra.
   J (le poids de mâchoire de chaque sommet) : la surface peut s'ouvrir (la tête) ; sinon elle reste telle quelle (les cheveux). */
function mouthField(D) {
  const lip = D.lip, Mo = D.mouth, xw = Mo.hw * 1.3;
  const lipY = x => { if (x <= lip[0][0]) return lip[0][1]; for (let i = 1; i < lip.length; i++) if (x <= lip[i][0]) { const [x0, y0] = lip[i - 1], [x1, y1] = lip[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return lip[lip.length - 1][1]; };
  // le déplacement d'un point (x, y, z) de poids de mâchoire w, la bouche ouverte à open : la mâchoire descend et avance en arc, la lèvre du haut remonte
  const f = (x, y, z, w, open, out) => {
    const ly = lipY(x), u = (x - Mo.x) / xw, pr = Math.sqrt(Math.max(0, 1 - u * u)); let dy = 0, dz = 0;
    if (w > 0.001) { const t = Math.min(1, Math.max(0, (ly - y) / 0.16)), g = pr + (1 - pr) * t; dy = -open * DROP * w * g; dz = open * PUSH * w * g; }
    else if (z > 0.05 && y >= ly && y < ly + 0.09) {
      dy = open * LIFT * pr * (1 - (y - ly) / 0.09);
      if (y < ly + 0.03 && pr > 0) dy += (ly - y) * Math.min(1, open * 12);   // le trou commence sous la moustache, pas dedans
    }
    out[0] = dy; out[1] = dz; return out;
  };
  f.xw = xw; f.lipY = lipY; return f;
}
function surface(D, A, V, J, M, fill, mat) {
  const nu = D.nu, nv = D.nv, V0 = Float32Array.from(V), n = V0.length / 3, field = J ? mouthField(D) : null, o2 = [0, 0];
  // les sommets confondus (les pôles, la couture) : un seul
  const km = new Map(), cn = new Uint32Array(n);
  for (let i = 0; i < n; i++) { const k = Math.round(V0[i * 3] * 2000) + ',' + Math.round(V0[i * 3 + 1] * 2000) + ',' + Math.round(V0[i * 3 + 2] * 2000); if (!km.has(k)) km.set(k, i); cn[i] = km.get(k); }
  const tris = [];
  for (let r = 0; r < nv - 1; r++) for (let c = 0; c < nu; c++) {
    const a = cn[r * nu + c], b = cn[r * nu + (c + 1) % nu], d = cn[(r + 1) * nu + c], e = cn[(r + 1) * nu + (c + 1) % nu];
    [[a, d, b], [b, d, e]].forEach(t => { if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) tris.push(...t); });
  }
  const F = new Uint32Array(tris), nf = F.length / 3;
  // les arêtes partagées par deux triangles : les candidates au contour
  const E = new Map();
  for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) { const a = F[f * 3 + k], b = F[f * 3 + (k + 1) % 3], key = a < b ? a * n + b : b * n + a; const r = E.get(key); if (r) r.push(f); else E.set(key, [a, b, f]); }
  const ed = []; E.forEach(r => { if (r.length === 4) ed.push(...r); }); const ED = new Uint32Array(ed), ne = ED.length / 4;
  const P = new Float32Array(V0), pos = new T.BufferAttribute(P, 3), Nf = new Float32Array(nf * 3);
  const faceN = () => {
    for (let f = 0; f < nf; f++) {
      const a = F[f * 3] * 3, b = F[f * 3 + 1] * 3, c = F[f * 3 + 2] * 3, ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      Nf[f * 3] = uy * vz - uz * vy; Nf[f * 3 + 1] = uz * vx - ux * vz; Nf[f * 3 + 2] = ux * vy - uy * vx;
    }
  };
  // où lire le dessin (d'après la forme au repos : le dessin suit la mâchoire quand elle descend), et lequel : devant, derrière
  faceN();
  const Nv = new Float32Array(n * 3); let out = 0;
  for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) { const i = F[f * 3 + k]; Nv[i * 3] += Nf[f * 3]; Nv[i * 3 + 1] += Nf[f * 3 + 1]; Nv[i * 3 + 2] += Nf[f * 3 + 2]; }
  for (let i = 0; i < n; i++) out += Nv[i * 3] * V0[i * 3] + Nv[i * 3 + 1] * (V0[i * 3 + 1] - 0.2) + Nv[i * 3 + 2] * V0[i * 3 + 2];
  const sg = out < 0 ? -1 : 1, UV = new Float32Array(n * 2), W = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const j = cn[i], x = Nv[j * 3], y = Nv[j * 3 + 1], z = Nv[j * 3 + 2], l = Math.hypot(x, y, z) || 1, nz = sg * z / l;
    const uv = toUv(D.proj, V0[i * 3], V0[i * 3 + 1]); UV[i * 2] = uv[0]; UV[i * 2 + 1] = uv[1];
    W[i * 2] = smooth(0.28, 0.55, nz); W[i * 2 + 1] = smooth(0.28, 0.55, -nz);
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', pos); geo.setAttribute('aUv', new T.BufferAttribute(UV, 2)); geo.setAttribute('aW', new T.BufferAttribute(W, 2)); geo.setIndex(new T.BufferAttribute(F, 1));
  const g = new T.Group(), add = (o, ord) => { o.renderOrder = ord; o.frustumCulled = false; g.add(o); return o; };
  // d'abord le volume, qui cache (sans couleur) ; puis l'encre du dessin, seulement sur la face la plus proche
  const occ = mat.clone(); occ.colorWrite = false; occ.depthWrite = true; occ.transparent = false;   // le même calcul de profondeur : pas de trait haché
  add(new T.Mesh(geo, occ), 0); add(new T.Mesh(geo, mat), 0.5);
  // la bouche : les triangles qui enjambent la ligne des lèvres, devant, entre les coins ; ils ne se voient que bouche ouverte (ils sont plats, fermée)
  if (J) {
    const blk = [];
    for (let f = 0; f < nf; f++) {
      const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2], w = [J[a], J[b], J[c]], cx = (V0[a * 3] + V0[b * 3] + V0[c * 3]) / 3, cz = (V0[a * 3 + 2] + V0[b * 3 + 2] + V0[c * 3 + 2]) / 3;
      if (Math.max(...w) - Math.min(...w) > 0.5 && Math.abs(cx - D.mouth.x) < field.xw && cz > 0.1) blk.push(a, b, c);
    }
    const gBlk = new T.BufferGeometry(); gBlk.setAttribute('position', pos); gBlk.setIndex(blk);
    const bm = fill.clone(); bm.polygonOffset = true; bm.polygonOffsetFactor = 1; bm.polygonOffsetUnits = 1; add(new T.Mesh(gBlk, bm), 0); g.userData.blk = bm;
  }
  const sil = new Float32Array(ne * 6), silO = add(Obj3D.fatSegs(sil, M.line), 1); silO.geometry.instanceCount = 0;
  let cur = -1;
  function deform(open) {
    if (!J || open === cur) return; cur = open;
    for (let i = 0; i < n; i++) { const x = V0[i * 3], y = V0[i * 3 + 1], z = V0[i * 3 + 2]; field(x, y, z, J[i], open, o2); P[i * 3] = x; P[i * 3 + 1] = y + o2[0]; P[i * 3 + 2] = z + o2[1]; }
    pos.needsUpdate = true; faceN();
  }
  const q = new T.Quaternion(), dir = new T.Vector3();
  function contour() {
    g.getWorldQuaternion(q).invert(); dir.set(0, 0, 1).applyQuaternion(q); const dx = dir.x, dy = dir.y, dz = dir.z; let k = 0;
    for (let e = 0; e < ne; e++) {
      const f1 = ED[e * 4 + 2] * 3, f2 = ED[e * 4 + 3] * 3, s1 = Nf[f1] * dx + Nf[f1 + 1] * dy + Nf[f1 + 2] * dz, s2 = Nf[f2] * dx + Nf[f2 + 1] * dy + Nf[f2 + 2] * dz;
      if ((s1 > 0) !== (s2 > 0)) { const a = ED[e * 4] * 3, b = ED[e * 4 + 1] * 3; sil[k] = P[a]; sil[k + 1] = P[a + 1]; sil[k + 2] = P[a + 2]; sil[k + 3] = P[b]; sil[k + 4] = P[b + 1]; sil[k + 5] = P[b + 2]; k += 6; }
    }
    silO.userData.ib.needsUpdate = true; silO.geometry.instanceCount = k / 6;
  }
  return { g, deform, contour, field };
}

/* ——— les volumes autour : les oreilles, le cou, le buste ——— */
const segs = (pts, out) => { for (let i = 1; i < pts.length; i++) out.push(...pts[i - 1], ...pts[i]); return out; };
// le buste : un tour (profil [rayon, hauteur]), aplati d'avant en arrière
const PROF = [[0.2, -0.62], [0.23, -0.84], [0.4, -0.92], [0.72, -0.98], [0.98, -1.08], [1.1, -1.28], [1.14, -1.6], [1.12, -1.95], [1.1, BAS]], ZS = 0.55, ZB = -0.1;
const rAt = y => { for (let i = 1; i < PROF.length; i++) { const [r0, y0] = PROF[i - 1], [r1, y1] = PROF[i]; if (y >= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return PROF[PROF.length - 1][0]; };
const chest = (x, y, lift) => { const r = rAt(y) + (lift || 0); return [x, y, Math.sqrt(Math.max(0, r * r - x * x)) * ZS + ZB]; };
const around = (th, y, lift) => { const r = rAt(y) + (lift || 0); return [r * Math.sin(th), y, r * Math.cos(th) * ZS + ZB]; };
function build(D) {
  const P = {};
  // les mèches, sur les côtés et derrière (devant, le dessin s'en charge) : des traits pâles
  P.meches = Obj3D.piece('mathieu:meches6', B => {
    const s = [];
    D.strands.forEach((p, i) => { const z = p.reduce((t, q) => t + q[2], 0) / p.length; if (z < 0.12 && i % 3 === 0) segs(p.slice(0, 7), s); });
    B.soft(s);
  });
  // les oreilles : des ellipsoïdes aplatis, un peu tournés vers l'avant, un pli à l'intérieur
  P.oreilles = Obj3D.piece('mathieu:oreilles', B => {
    const inner = [];
    D.ears.forEach(([x, y, z]) => {
      const sd = Math.sign(x), g = new T.SphereGeometry(1, 18, 14); g.scale(0.045, 0.13, 0.085); g.rotateY(sd * 0.5); g.translate(x + sd * 0.025, y, z); B.smooth(g);
      const c = []; for (let i = 0; i <= 14; i++) { const a = -1.9 + i / 14 * 3.4; c.push([x + sd * 0.07, y + Math.sin(a) * 0.075, z + 0.02 + Math.cos(a) * 0.045]); } segs(c, inner);
    });
    B.soft(inner);
  });
  P.cou = Obj3D.piece('mathieu:cou', B => { const g = new T.CylinderGeometry(0.2, 0.23, 0.62, 28, 1, true); g.translate(0, -0.66, -0.07); B.smooth(g); });
  P.buste = Obj3D.piece('mathieu:buste', B => {
    const g = new T.LatheGeometry(PROF.map(([r, y]) => new T.Vector2(r, y)).reverse(), 48); g.scale(1, 1, ZS); g.translate(0, 0, ZB); B.smooth(g);
    const L = [], S = [], N = 64;
    // l'encolure ronde : un ourlet double, plus bas devant
    for (const dy of [0, -0.045]) { const c = []; for (let i = 0; i <= N; i++) { const th = i / N * Math.PI * 2, y = -0.9 + dy - 0.07 * Math.max(0, Math.cos(th)) ** 2; c.push(around(th, y, 0.012)); } segs(c, dy ? S : L); }
    // les coutures des épaules et des manches
    [-1, 1].forEach(sd => {
      const sh = []; for (let i = 0; i <= 10; i++) { const f = i / 10, th = sd * (Math.PI / 2 - 0.05), y = -0.97 - f * 0.2; sh.push(around(th * (0.35 + 0.65 * f), y, 0.01)); } segs(sh, S);
      const sl = []; for (let i = 0; i <= 16; i++) { const f = i / 16, y = -1.12 - f * 0.62; sl.push(around(sd * (1.2 + 0.1 * Math.sin(f * Math.PI)), y, 0.01)); } segs(sl, L);
    });
    // l'ourlet du bas
    const h = []; for (let i = 0; i <= N; i++) h.push(around(i / N * Math.PI * 2, BAS + 0.02, 0.005)); segs(h, L);
    // le logo Patagonia, sur le cœur (à sa gauche : à droite pour nous)
    const lx = 0.45, ly = -1.24, ls = 0.85;
    D.logo.forEach(p => segs(p.map(([x, y]) => chest(lx + x * ls, ly + y * ls, 0.012)), L));
    B.lines(L).soft(S);
  });
  return P;
}

/* ——— le pantin ——— */
const all = new Set();
function create(opt) {
  const logo = !!(opt && opt.logo);
  const root = new T.Group(), turn = new T.Group(); root.add(turn); root.visible = false;
  const list = [], R = Obj3D.rig(root, list);
  const m = { root, turn, R, list, cur: {}, ready: false, meta: null, logo };
  load().then(A => {
    if (!m.R) return;
    const D = A.D, P = build(D), ink = inkNow();
    m.M = Obj3D.mats(ink, { fat: 3, fatSoft: 2 });
    m.fill = new T.MeshBasicMaterial({ color: ink, transparent: true, side: T.DoubleSide });
    m.ink = inkMat(A);
    const head = new T.Group(); turn.add(head);
    const F = surface(D, A, D.head, D.jaw, m.M, m.fill, m.ink), H = surface(D, A, D.hair, null, m.M, m.fill, m.ink);
    head.add(F.g, H.g);
    const put = (pp, g) => { const x = Obj3D.mount(pp, m.M); g.add(x.g); list.push(x); return x; };
    ['meches', 'oreilles'].forEach(k => put(P[k], head));
    if (!logo) ['cou', 'buste'].forEach(k => put(P[k], turn));
    // le haut : le sommet des cheveux
    let top = 0; for (let i = 1; i < D.hair.length; i += 3) top = Math.max(top, D.hair[i]);
    const bas = logo ? D.chin - 0.04 : BAS;          // le logo : la tête seule, du haut des cheveux au menton
    Object.assign(m, { head, F, H, D, ready: true, fig: top - bas });
    m.meta = { head: [0.5, top / (top - bas)] };
    pose(m, {});
  }).catch(e => console.error('Mathieu : fichiers introuvables', e));
  all.add(m);
  return m;
}
function destroy(m) { if (!m) return; Obj3D.unrig(m.R); m.R = null; all.delete(m); }

function pose(m, o) {
  const p = Object.assign(m.cur, o), s = p.s ?? 400, a = p.a ?? 1;
  m.root.position.set(p.x ?? 0, -(p.y ?? 0), p.z ?? 0);
  m.root.visible = m.ready && a > 0.004;
  if (!m.ready) return m;
  const u = s / m.fig; m.root.scale.setScalar(u);
  m.turn.rotation.set(p.tilt ?? 0, p.turn ?? 0, p.roll ?? 0, 'YXZ');
  m.head.rotation.set(-(p.nod ?? 0), 0, 0);
  // le trait : proportionné à sa taille, comme un dessin (ni fil, ni pâté)
  const w = Math.max(1.3, Math.min(9, u * PEN));
  m.M.line.uniforms.width.value = w; m.M.soft.uniforms.width.value = w * 0.6;
  // en logo, tout petit : sans les traits pâles
  m.M.line.opacity = a; m.M.soft.opacity = a * (m.logo ? 0 : 0.5); m.fill.opacity = a; m.F.g.userData.blk.opacity = a; m.ink.uniforms.opacity.value = a;
  m.F.deform(Math.round(Math.max(0, Math.min(1, p.open ?? 0)) * 400) / 400);
  m.root.updateMatrixWorld(true); m.F.contour(); m.H.contour();
  return m;
}
// le centre du trou noir à l'écran (px) et ses demi-axes (px) ; null bouche fermée
const wv = new T.Vector3();
function mouthAt(m) {
  const open = m.cur.open ?? 0; if (!m.ready || open < 0.01) return null;
  const Mo = m.D.mouth, ly = m.F.field.lipY(Mo.x), gap = open * (DROP + LIFT);
  m.root.updateMatrixWorld(true);
  wv.set(Mo.x, ly + open * LIFT - gap / 2, Mo.z + open * PUSH / 2).applyMatrix4(m.head.matrixWorld);
  const s = m.root.scale.x; return { x: wv.x, y: -wv.y, rx: Mo.hw * 1.2 * s, ry: gap / 2 * s };
}
addEventListener('themechange', () => all.forEach(m => { if (!m.ready) return; const c = inkNow(); [m.M.line, m.M.soft].forEach(x => x.color.setHex(c)); m.fill.color.setHex(c); m.F.g.userData.blk.color.setHex(c); m.ink.uniforms.ink.value.setHex(c); }));
return { create, destroy, pose, mouthAt, load };
})();
