/* Les objets 3D en traits, comme la pédale : les jalons de l'histoire (fixation de ski 1951, PP65 1984,
   vélo de 1985, KEO 1998) et les petites pièces (roulement, vis, ressort, batterie, jauge…) qui flottent.
   Chaque objet est modelé en volumes (tours, extrusions, tubes) ; on en tire :
   - les arêtes vives (toujours dessinées), et leur double caché en pointillés pâles ;
   - les arêtes douces, candidates au contour : à chaque image, on garde celles où la surface se retourne vue de la caméra ;
   - un volume invisible qui cache ce qui est derrière.
   Tout est rendu sur une seule toile, en projection orthogonale, en pixels :
     Obj3D.put(nom, x, y, taillePx, [rx, ry, rz], { a: opacité, e: éclaté 0 → 1, z })   puis   Obj3D.render()
   Chaque objet est découpé en pièces qui s'écartent avec l'éclaté (e) : elles arrivent et repartent ainsi,
   jamais en poussière. Aucun modèle LOOK n'est nécessaire : sans PEDAL_MODEL, la KEO, l'axe et le Power Core manquent. */
window.Obj3D = (() => {
if (!window.THREE) return { ok: false, put: () => false, render() {}, init() {}, resize() {}, has: () => false, size: () => 1 };
const T = THREE, TAU = Math.PI * 2, inkNow = () => (window.THEME && THEME.inkHex) ?? 0xeef5ff, COS = Math.cos(33 * Math.PI / 180), M = window.PEDAL_MODEL;
let renderer = null, scene, camera, W = 1, H = 1, ok = false, used = {}, zc = 0, drawn = false;
const LIB = {}, proto = {}, pool = {};
const OCC = new T.MeshBasicMaterial({ colorWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
const V3 = (x, y, z) => new T.Vector3(x, y, z), eul = new T.Euler(), q0 = new T.Quaternion(), dir = new T.Vector3();

/* ——— de quoi modeler ——— */
function tf(g, p, r, s) {
  const k = s === undefined ? 1 : s, m = new T.Matrix4().compose(V3(...(p || [0, 0, 0])), new T.Quaternion().setFromEuler(new T.Euler(...(r || [0, 0, 0]))), Array.isArray(k) ? V3(...k) : V3(k, k, k));
  g.applyMatrix4(m); return g;
}
const lathe = (pr, seg) => new T.LatheGeometry(pr.map(p => new T.Vector2(p[0], p[1])), seg || 32);   // profil [r, y], autour de y
const latheX = (pr, seg) => tf(lathe(pr.map(p => [p[1], p[0]]), seg), 0, [0, 0, -Math.PI / 2]);      // profil [x, r], autour de x
const latheZ = (pr, seg) => tf(lathe(pr, seg), 0, [Math.PI / 2, 0, 0]);                             // profil [r, z], autour de z
const circ = (r, n, cx, cy, a0) => Array.from({ length: n }, (_, i) => { const t = (a0 || 0) + i / n * TAU; return [(cx || 0) + Math.cos(t) * r, (cy || 0) + Math.sin(t) * r]; });
function roundPoly(P, r, n) {
  const out = []; n = n || 4;
  P.forEach((B, i) => {
    const A = P[(i - 1 + P.length) % P.length], C = P[(i + 1) % P.length], la = Math.hypot(A[0] - B[0], A[1] - B[1]), lc = Math.hypot(C[0] - B[0], C[1] - B[1]);
    const ta = Math.min(r / la, 0.5), tc = Math.min(r / lc, 0.5), p1 = [B[0] + (A[0] - B[0]) * ta, B[1] + (A[1] - B[1]) * ta], p2 = [B[0] + (C[0] - B[0]) * tc, B[1] + (C[1] - B[1]) * tc];
    for (let j = 0; j <= n; j++) { const t = j / n, u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * B[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * B[1] + t * t * p2[1]]); }
  });
  return out;
}
const shape = (pts, holes) => { const s = new T.Shape(pts.map(p => new T.Vector2(p[0], p[1]))); (holes || []).forEach(h => s.holes.push(new T.Path(h.map(p => new T.Vector2(p[0], p[1]))))); return s; };
// une extrusion le long de z, centrée (le profil est dans le plan x, y)
function ext(pts, depth, o) {
  o = o || {}; const b = o.bevel || 0;
  const g = new T.ExtrudeGeometry(shape(pts, o.holes), { depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2); return g;
}
// vue de dessus : profil [x, z], épaisseur le long de y, centrée sur yc
const topExt = (pts, th, yc, o) => tf(ext(pts, th, o), [0, yc, 0], [Math.PI / 2, 0, 0]);
// vue de côté : profil [z, y], largeur le long de x, centrée sur xc
const sideExt = (pts, w, xc, o) => tf(ext(pts, w, o), [xc, 0, 0], [0, -Math.PI / 2, 0]);
function tube(pts, r, rad, seg) {
  const c = pts.length === 2 ? new T.LineCurve3(V3(...pts[0]), V3(...pts[1])) : new T.CatmullRomCurve3(pts.map(p => V3(...p)));
  return new T.TubeGeometry(c, seg || (pts.length === 2 ? 1 : 40), r, rad || 16, false);
}
const box = (w, h, d, p) => tf(new T.BoxGeometry(w, h, d), p);
const ball = (r, p) => tf(new T.IcosahedronGeometry(r, 1), p);
// des traits : une hélice (filetage), un polygone, une ligne brisée — en paires de points [x,y,z, x,y,z…]
function helixX(x0, x1, r, pitch, cy, cz) { const out = [], n = Math.ceil((x1 - x0) / pitch * 18); let prev = null; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, t = (x - x0) / pitch * TAU, p = [x, (cy || 0) + Math.cos(t) * r, (cz || 0) + Math.sin(t) * r]; if (prev) out.push(...prev, ...p); prev = p; } return out; }
function helixY(y0, y1, r, pitch) { const out = [], n = Math.ceil((y1 - y0) / pitch * 18); let prev = null; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n, t = (y - y0) / pitch * TAU, p = [Math.cos(t) * r, y, Math.sin(t) * r]; if (prev) out.push(...prev, ...p); prev = p; } return out; }
function poly(P, closed) { const out = []; for (let i = 0; i < P.length - (closed ? 0 : 1); i++) { const a = P[i], b = P[(i + 1) % P.length]; out.push(...a, ...b); } return out; }

/* ——— les arêtes : vives (dessinées), douces (candidates au contour) ——— */
function analyse(g) {
  const G = g.index ? g.toNonIndexed() : g, P = G.attributes.position.array, nF = P.length / 9;
  const key = i => Math.round(P[i] * 400) + ',' + Math.round(P[i + 1] * 400) + ',' + Math.round(P[i + 2] * 400);
  const E = new Map(), crease = [], cand = [];
  for (let f = 0; f < nF; f++) {
    const o = f * 9, ax = P[o + 3] - P[o], ay = P[o + 4] - P[o + 1], az = P[o + 5] - P[o + 2], bx = P[o + 6] - P[o], by = P[o + 7] - P[o + 1], bz = P[o + 8] - P[o + 2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz); if (l < 1e-9) continue; nx /= l; ny /= l; nz /= l;
    const ks = [key(o), key(o + 3), key(o + 6)];
    [[0, 1], [1, 2], [2, 0]].forEach(([u, v]) => {
      const ka = ks[u], kb = ks[v]; if (ka === kb) return;
      const k = ka < kb ? ka + '|' + kb : kb + '|' + ka; let r = E.get(k);
      if (!r) { r = { a: o + u * 3, b: o + v * 3, n: [] }; E.set(k, r); } r.n.push([nx, ny, nz]);
    });
  }
  E.forEach(r => {
    const a = [P[r.a], P[r.a + 1], P[r.a + 2]], b = [P[r.b], P[r.b + 1], P[r.b + 2]];
    if (r.n.length === 2) {
      const [m, n] = r.n, d = m[0] * n[0] + m[1] * n[1] + m[2] * n[2];
      if (d > 0.9995) return;                       // l'intérieur d'une face plane
      if (d > COS) { cand.push(...a, ...b, ...m, ...n); return; }
    }
    crease.push(...a, ...b);
  });
  return { g: G, crease, cand };
}

/* ——— un prototype : les pièces, leurs traits, leur boîte ——— */
function make(name) {
  const def = LIB[name], parts = []; let cur = null;
  const B = {
    part(ex) { cur = { ex: ex || [0, 0, 0], occ: [], crease: [], cand: [], soft: [] }; parts.push(cur); return B; },
    occ(g) { if (!cur) B.part(); cur.occ.push(g); return B; },   // un volume qui cache, sans traits
    solid(g) { if (!cur) B.part(); const a = analyse(g); cur.occ.push(a.g); for (const v of a.crease) cur.crease.push(v); for (const v of a.cand) cur.cand.push(v); return B; },
    lines(arr) { if (!cur) B.part(); for (const v of arr) cur.crease.push(v); return B; },
    soft(arr) { if (!cur) B.part(); for (const v of arr) cur.soft.push(v); return B; }
  };
  def.build(B);
  const bb = new T.Box3(), v = new T.Vector3();
  parts.forEach(p => { p.occ.forEach(g => { g.computeBoundingBox(); bb.union(g.boundingBox); }); for (let i = 0; i < p.crease.length; i += 3) bb.expandByPoint(v.set(p.crease[i], p.crease[i + 1], p.crease[i + 2])); });
  const c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), span = Math.max(sz.x, sz.y, sz.z) || 1;
  const lineGeo = arr => { if (!arr.length) return null; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(arr, 3)); new T.LineSegments(g).computeLineDistances(); return g; };
  return { span, k: 1 / span, c, parts: parts.map(p => {
    const pb = new T.Box3(); p.occ.forEach(g => pb.union(g.boundingBox)); for (let i = 0; i < p.crease.length; i += 3) pb.expandByPoint(v.set(p.crease[i], p.crease[i + 1], p.crease[i + 2]));
    return { ex: p.ex, pc: pb.isEmpty() ? c.clone() : pb.getCenter(new T.Vector3()), occ: p.occ, crease: lineGeo(p.crease), soft: lineGeo(p.soft), cand: new Float32Array(p.cand) };
  }) };
}
function instance(name) {
  const P = proto[name] || (proto[name] = make(name)), d = P.span * 0.011;
  const mats = { line: new T.LineBasicMaterial({ color: inkNow(), transparent: true, depthWrite: false }), soft: new T.LineBasicMaterial({ color: inkNow(), transparent: true, depthWrite: false }),
    hid: new T.LineDashedMaterial({ color: inkNow(), transparent: true, depthWrite: false, depthFunc: T.GreaterDepth, dashSize: d, gapSize: d }) };
  const root = new T.Group(), inner = new T.Group(); inner.position.copy(P.c).negate(); root.add(inner);
  const add = (g, o, ord) => { o.renderOrder = ord; o.frustumCulled = false; g.add(o); };
  const parts = P.parts.map(pp => {
    const g = new T.Group(); inner.add(g);
    pp.occ.forEach(o => add(g, new T.Mesh(o, OCC), 0));
    if (pp.crease) { add(g, new T.LineSegments(pp.crease, mats.line), 1); add(g, new T.LineSegments(pp.crease, mats.hid), 2); }
    if (pp.soft) { add(g, new T.LineSegments(pp.soft, mats.soft), 1); add(g, new T.LineSegments(pp.soft, mats.hid), 2); }
    let sil = null;
    if (pp.cand.length) { const arr = new Float32Array(pp.cand.length / 2), sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(arr, 3)); sg.setDrawRange(0, 0); add(g, new T.LineSegments(sg, mats.line), 1); sil = { arr, sg }; }
    return { g, pp, sil };
  });
  scene.add(root);
  return { root, parts, mats, P };
}
function silhouettes(p) {
  const C = p.pp.cand, A = p.sil.arr; p.g.getWorldQuaternion(q0).invert(); dir.set(0, 0, 1).applyQuaternion(q0);
  const dx = dir.x, dy = dir.y, dz = dir.z; let n = 0;
  for (let i = 0; i < C.length; i += 12) {
    const s1 = C[i + 6] * dx + C[i + 7] * dy + C[i + 8] * dz, s2 = C[i + 9] * dx + C[i + 10] * dy + C[i + 11] * dz;
    if ((s1 > 0) !== (s2 > 0)) { A[n] = C[i]; A[n + 1] = C[i + 1]; A[n + 2] = C[i + 2]; A[n + 3] = C[i + 3]; A[n + 4] = C[i + 4]; A[n + 5] = C[i + 5]; n += 6; }
  }
  p.sil.sg.attributes.position.needsUpdate = true; p.sil.sg.setDrawRange(0, n / 3);
}

/* ——— la toile ——— */
function init(canvas) {
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3)); renderer.setClearColor(0, 0);
    scene = new T.Scene(); camera = new T.OrthographicCamera(0, 1, 0, -1, 1, 4e5); camera.position.z = 2e5; ok = true;
  } catch (e) { ok = false; console.error(e); }
}
function resize(w, h) { W = w; H = h; if (!renderer) return; renderer.setSize(w, h, false); camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h; camera.updateProjectionMatrix(); }
const pc = new T.Vector3(), rq = new T.Quaternion(), AX = new T.Vector3();
/* attraper un objet (o.grab = sa clé) : glisser le fait tourner sur lui-même, comme la pédale ; la rotation donnée reste */
const grabs = {}; let frameId = 0;
function hit(x, y) { for (const k in grabs) { const G = grabs[k], b = G.box; if (G.seen === frameId - 1 && G.a > 0.3 && x > b[0] && x < b[2] && y > b[1] && y < b[3]) return k; } return null; }
function drag(k, dx, dy) { const G = grabs[k]; if (!G) return; if (dx) { rq.setFromAxisAngle(AX.set(0, 1, 0), dx * 0.009); G.q.premultiply(rq); } if (dy) { rq.setFromAxisAngle(AX.set(1, 0, 0), dy * 0.009); G.q.premultiply(rq); } G.q.normalize(); }
function put(name, x, y, size, rot, o) {
  if (!ok || !LIB[name]) return false;
  o = o || {}; const a = o.a === undefined ? 1 : o.a; if (a < 0.004 || size < 2) return true;
  const list = pool[name] || (pool[name] = []), n = used[name] || 0; used[name] = n + 1;
  const I = list[n] || (list[n] = instance(name)), P = I.P;
  I.root.visible = true;
  I.root.position.set(x, -y, o.z === undefined ? -(++zc) * 1400 : o.z);
  if (rot && rot.isQuaternion) I.root.quaternion.copy(rot); else { eul.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] || 0 : 0, 'YXZ'); I.root.quaternion.setFromEuler(eul); }
  if (o.grab) { const G = grabs[o.grab] || (grabs[o.grab] = { q: new T.Quaternion() }), h = size * 0.5; G.box = [x - h, y - h * 0.8, x + h, y + h * 0.8]; G.seen = frameId; G.a = a; I.root.quaternion.premultiply(G.q); }
  I.root.scale.setScalar(size * (LIB[name].scale || 1) * P.k);
  // l'éclaté : chaque pièce s'écarte (dans sa direction) en tournant un peu autour de son propre centre
  const e = o.e || 0;
  I.parts.forEach(p => {
    const v = p.pp.ex; eul.set(v[2] * e * 1.6, v[0] * e * 1.6, v[1] * e * 0.9, 'XYZ'); p.g.quaternion.setFromEuler(eul);
    rq.copy(p.g.quaternion); pc.copy(p.pp.pc).applyQuaternion(rq);
    p.g.position.set(v[0] * e * P.span + p.pp.pc.x - pc.x, v[1] * e * P.span + p.pp.pc.y - pc.y, v[2] * e * P.span + p.pp.pc.z - pc.z);
  });
  I.mats.line.opacity = Math.min(1, 0.95 * a); I.mats.soft.opacity = Math.min(1, 0.42 * a); I.mats.hid.opacity = Math.min(1, 0.15 * a);
  return true;
}
function render() {
  if (!ok) return;
  let any = false;
  for (const nm in pool) pool[nm].forEach((I, i) => { if (i >= (used[nm] || 0)) I.root.visible = false; else any = true; });
  if (any) {
    scene.updateMatrixWorld();
    for (const nm in pool) for (let i = 0; i < (used[nm] || 0); i++) pool[nm][i].parts.forEach(p => { if (p.sil) silhouettes(p); });
    renderer.clear(); renderer.render(scene, camera); drawn = true;
  } else if (drawn) { renderer.clear(); drawn = false; }
  used = {}; zc = 0; frameId++;
}

/* ——— les objets ——— */
const screw = (B, x, y, z, r, up) => {   // une vis à tête bombée, et sa fente
  B.solid(tf(lathe([[0, 0], [r, 0], [r, r * 0.3], [r * 0.7, r * 0.75], [0, r * 0.85]], 20), [x, y, z]));
  B.soft([x - r * 0.6, y + r * 0.82, z, x + r * 0.6, y + r * 0.82, z]);
};

// 1951 — Nevers : LOOK fabrique des fixations de ski. Un tronçon de ski, la butée avant et la talonnière.
LIB.ski1951 = { scale: 1.25, build(B) {
  B.part([0, -0.12, 0]);
  const bot = [], top = [], th = x => x < 20 ? 1.5 : 1.5 - (x - 20) / 22 * 0.7, yb = x => x < 22 ? 0 : 9 * Math.pow((x - 22) / 20, 2);
  for (let i = 0; i <= 40; i++) { const x = -40 + i / 40 * 82; bot.push([x, yb(x)]); top.push([x - (x > 22 ? 0.4 : 0), yb(x) + th(x)]); }
  B.solid(ext(bot.concat(top.reverse()), 8));
  B.soft([-40, 0.3, 3.7, 22, 0.3, 3.7, -40, 0.3, -3.7, 22, 0.3, -3.7]);                                  // les carres d'acier
  for (let k = 0; k < 6; k++) { const z = -4 + k * 1.6; B.soft([-40, 0, z, -40, 1.5, Math.min(4, z + 1.5)]); }  // la coupe, hachurée
  B.soft(poly(roundPoly([[-21, -3.4], [8.5, -3.2], [8.5, 3.2], [-21, 3.4]], 3).map(p => [p[0], 1.95, p[1]]), true));   // la chaussure, fantôme
  B.part([0, 0.34, 0]);                                                                                 // la chaussure de cuir
  B.solid(ext([[-21, 1.95], [8, 1.95], [8.7, 2.8], [7.9, 4.2], [5, 5.3], [0, 6.3], [-5, 8.6], [-7, 11.2], [-6.4, 17], [-17.2, 17.4], [-19.6, 12], [-21, 6]], 6.6, { bevel: 0.8 }));
  B.soft(poly([[-21.6, 3.3], [8.9, 3.3]].map(p => [p[0], p[1], 4.3])).concat(poly([[-21.6, 3.3], [8.9, 3.3]].map(p => [p[0], p[1], -4.3]))));
  for (let k = 0; k < 5; k++) { const x = -6.2 + k * 2.2, y = 9.6 - k * 1.1; B.soft([x - 0.6, y + 0.9, 2.2, x + 0.8, y - 0.2, -2.2, x - 0.6, y + 0.9, -2.2, x + 0.8, y - 0.2, 2.2]); }
  B.part([0.14, 0.1, 0]);                                                                               // la butée avant
  B.solid(box(10, 0.5, 6.5, [13.5, 1.75, 0]));
  B.solid(tf(latheX([[9.4, 0], [9.4, 1.5], [9.7, 1.7], [16, 1.7], [16.3, 1.45], [16.3, 1.0], [17.4, 0.6], [19, 0.6], [19, 0]], 28), [0, 3.7, 0]));
  [11, 15].forEach(x => B.solid(sideExt([[-2.8, 2], [2.8, 2], [2.8, 2.6], [1.8, 3.7], [-1.8, 3.7], [-2.8, 2.6]], 1.1, x)));
  B.solid(tf(lathe([[0, 0], [0.5, 0], [0.5, 0.9], [0.35, 1.1], [0, 1.1]], 16), [13.2, 5.35, 0]));
  [[9.4, 2.5], [9.4, -2.5], [17.8, 2.5], [17.8, -2.5]].forEach(([x, z]) => screw(B, x, 2, z, 0.55));
  B.part([0.22, 0.14, 0]);                                                                              // la mâchoire
  const cup = []; for (let i = 0; i <= 12; i++) { const t = -1.35 + i / 12 * 2.7; cup.push([5.6 + Math.cos(t) * 3.6, Math.sin(t) * 3.6]); }
  const inn = []; for (let i = 12; i >= 0; i--) { const t = -1.35 + i / 12 * 2.7; inn.push([5.6 + Math.cos(t) * 3.0, Math.sin(t) * 3.0]); }
  B.solid(topExt(cup.concat(inn), 1.8, 2.95));
  const lip = []; for (let i = 0; i <= 12; i++) { const t = -1.2 + i / 12 * 2.4; lip.push([5.6 + Math.cos(t) * 3.6, Math.sin(t) * 3.6]); } for (let i = 12; i >= 0; i--) { const t = -1.2 + i / 12 * 2.4; lip.push([5.6 + Math.cos(t) * 2.3, Math.sin(t) * 2.3]); }
  B.solid(topExt(lip, 0.35, 4.05));
  B.solid(box(1.2, 1, 1.6, [9.6, 3.4, 0]));
  B.part([-0.14, 0.1, 0]);                                                                              // la talonnière
  B.solid(box(9, 0.5, 6.5, [-25.5, 1.75, 0]));
  B.solid(ext([[-30, 2], [-21.2, 2], [-21.2, 4.2], [-22.4, 5.6], [-27.5, 5.6], [-30, 3.6]], 5, { bevel: 0.25 }));
  B.solid(tf(latheZ([[0, -3.1], [0.55, -3.1], [0.55, 3.1], [0, 3.1]], 16), [-24, 5, 0]));
  [[-29.2, 2.5], [-29.2, -2.5], [-21.8, 2.5], [-21.8, -2.5]].forEach(([x, z]) => screw(B, x, 2, z, 0.55));
  B.part([-0.04, 0.2, 0]);
  B.solid(ext([[-21.2, 3.5], [-17.9, 3.5], [-17.4, 3.95], [-17.9, 4.4], [-21.2, 4.7]], 4.4));             // l'étrier sur le talon
  B.part([-0.16, 0.26, 0]);
  B.solid(tube([[-24, 5.4, 0], [-27, 7.3, 0], [-31, 8.5, 0], [-35, 8.8, 0]], 0.45, 14, 24));            // le levier
  B.solid(ball(0.85, [-35.3, 8.8, 0]));
} };

// 1984 — la PP65, première pédale automatique, et sa cale triangulaire
LIB.pp65 = { build(B) {
  B.part([0, 0, 0]);
  const se = (cx, cz, ax, az, k, n) => Array.from({ length: n }, (_, i) => { const t = i / n * TAU, c = Math.cos(t), s = Math.sin(t); return [cx + ax * Math.sign(c) * Math.pow(Math.abs(c), k), cz + az * Math.sign(s) * Math.pow(Math.abs(s), k)]; });
  B.solid(topExt(se(35, 3, 36, 36, 0.55, 48), 13, 0, { bevel: 1.5 }));
  B.solid(topExt(se(35, 3, 26, 27, 0.5, 40), 1.2, 8.6));
  B.soft(poly(se(35, 3, 20, 21, 0.5, 36).map(p => [p[0], 9.25, p[1]]), true));
  B.part([-0.32, 0, 0]);                                                                               // l'axe
  B.solid(latheX([[-44, 0], [-44, 5.6], [-43.2, 6.5], [-31, 6.5], [-31, 9.5], [-29, 9.8], [-28.4, 8], [-1, 8], [-1, 0]], 28));
  B.solid(tf(new T.CylinderGeometry(11, 11, 7, 6), [-24, 0, 0], [0, 0, Math.PI / 2]));
  B.soft(helixX(-43, -31.5, 6.55, 1.25));
  B.solid(latheX([[70.5, 0], [70.5, 8.5], [72.5, 8.5], [74, 6.5], [74.5, 0]], 24));
  B.part([0, 0.08, 0.26]);                                                                            // le crochet avant
  B.solid(sideExt([[30, 8], [40, 8], [42.5, 10], [42.5, 17], [40, 19], [29, 19], [29, 16.5], [38.5, 16.5], [39, 11], [30, 10.5]], 40, 35));
  B.part([0, 0.06, -0.26]);                                                                           // la mâchoire arrière, son axe, ses ressorts, sa vis de tension
  B.solid(sideExt([[-24, 8], [-33, 8], [-36.5, 10], [-36.5, 17], [-34, 19], [-23, 19], [-23, 16.5], [-33, 16.5], [-33.5, 11], [-24, 10.5]], 44, 35));
  B.solid(tf(latheX([[8, 0], [8, 2], [62, 2], [62, 0]], 18), [0, 9, -35.5]));
  [14, 52].forEach(x0 => { const P = []; for (let i = 0; i <= 90; i++) { const t = i / 90 * 5 * TAU; P.push([x0 + i / 90 * 6, 9 + Math.cos(t) * 3.4, -35.5 + Math.sin(t) * 3.4]); } B.solid(tube(P, 0.7, 14, 180)); });
  B.solid(tf(lathe([[0, 0], [3, 0], [3, 3], [4.2, 3], [4.2, 5.4], [0, 5.4]], 24), [35, 17.5, -29]));
  B.soft([32, 22.95, -29, 38, 22.95, -29]);
  B.part([0, 0.36, 0]);                                                                               // la cale
  const cl = roundPoly([[35, 46], [7, -22], [63, -22]], 9, 5), holes = [[35, 18], [27, 3], [43, 3]].map(([x, z]) => circ(3.2, 18, x, z).reverse());
  B.solid(topExt(cl, 5, 34, { holes }));
  B.solid(topExt(roundPoly([[30, 34], [40, 34], [38.5, 45], [31.5, 45]], 1.5, 3), 2.2, 37.6));
  B.part([0, 0.58, 0]);
  [[35, 18], [27, 3], [43, 3]].forEach(([x, z]) => { B.solid(tf(lathe([[0, 0], [4.6, 0], [4.6, 2.6], [4.2, 3.1], [0, 3.1]], 20), [x, 36.5, z])); B.soft(poly(circ(1.8, 6, x, z).map(p => [p[0], 39.65, p[1]]), true)); });
} };

// 1985 — Bernard Hinault gagne le Tour de France, sur des pédales LOOK : un vélo de route de l'époque, en acier
LIB.bike1985 = { scale: 1.2, build(B) {
  const RA = [-50, 0], FA = [50, 0], BB = [-8, -7];
  B.part([0, 0, 0]);                                                                                  // le cadre
  B.solid(tube([[BB[0], BB[1], 0], [-25, 45, 0]], 1.4));
  B.solid(tube([[-24.6, 43, 0], [33.8, 44.2, 0]], 1.3));
  B.solid(tube([[BB[0], BB[1], 0], [36.6, 34.2, 0]], 1.5));
  B.solid(tube([[37.2, 32.6, 0], [33.4, 46.4, 0]], 1.7));
  [1, -1].forEach(s => { B.solid(tube([[RA[0] + 0.5, 0.4, 4.8 * s], [-24.2, 41.5, 1.6 * s]], 0.75, 14)); B.solid(tube([[RA[0] + 0.5, 0, 4.8 * s], [-10.5, -6.4, 2.2 * s]], 0.8, 14)); });
  B.solid(tf(latheZ([[0, -3.6], [2.1, -3.6], [2.1, 3.6], [0, 3.6]], 20), [BB[0], BB[1], 0]));
  B.part([0.1, 0, 0]);                                                                               // la fourche
  B.solid(tf(latheZ([[0, -5.6], [1.7, -5.6], [1.7, 5.6], [0, 5.6]], 16), [37.8, 30.2, 0]));
  [1, -1].forEach(s => B.solid(tube([[37.9, 30, 4.6 * s], [40.6, 18, 4.8 * s], [44.6, 7, 5 * s], [50, 0, 5 * s]], 1.0, 14, 24)));
  const wheel = (H, rear) => {
    B.solid(tf(new T.TorusGeometry(31, 0.9, 12, 96), [H[0], H[1], 0]));
    B.solid(tf(new T.TorusGeometry(33.1, 1.25, 12, 96), [H[0], H[1], 0]));
    B.solid(tf(latheZ([[0, -5], [1.2, -5], [1.2, -3.9], [3.2, -3.9], [3.2, -3.3], [1.6, -3.3], [1.6, 3.3], [3.2, 3.3], [3.2, 3.9], [1.2, 3.9], [1.2, 5], [0, 5]], 20), [H[0], H[1], 0]));
    if (rear) B.solid(tf(latheZ([[0, 4.2], [5.6, 4.2], [5.6, 4.7], [3.6, 4.7], [3.6, 5.2], [5.1, 5.2], [5.1, 5.7], [3.6, 5.7], [3.6, 6.2], [4.6, 6.2], [4.6, 6.7], [0, 6.7]], 28), [H[0], H[1], 0]));
    const sp = []; for (let i = 0; i < 32; i++) { const t = i / 32 * TAU, s = i % 2 ? 1 : -1, h = t + (i % 4 < 2 ? 0.4 : -0.4); sp.push(H[0] + Math.cos(h) * 3, H[1] + Math.sin(h) * 3, 3.6 * s, H[0] + Math.cos(t) * 30.2, H[1] + Math.sin(t) * 30.2, 0); }
    B.soft(sp);
  };
  B.part([0.26, 0, 0.04]); wheel(FA, false);
  B.part([-0.26, 0, -0.04]); wheel(RA, true);
  B.soft([RA[0] + 1, -5.2, 5.6, RA[0] + 1.5, -9, 6, RA[0] + 1.5, -9, 6, RA[0] - 1, -12, 6]);             // le dérailleur
  B.part([0.08, 0.2, 0]);                                                                            // la potence, le cintre, les leviers
  B.solid(tube([[33.4, 46, 0], [34.2, 50.4, 0]], 1.2)); B.solid(tube([[34, 50.2, 0], [44, 50.6, 0]], 1.1));
  B.solid(tube([[44, 50.6, -20], [44, 50.6, 20]], 1.2, 16));
  [1, -1].forEach(s => {
    B.solid(tube([[44, 50.6, 20 * s], [49.6, 49.8, 20.4 * s], [52.4, 45, 20.6 * s], [50.2, 40.2, 20.6 * s], [43, 39.6, 20.6 * s]], 1.1, 14, 30));
    B.solid(ext([[49.4, 49.6], [52.4, 50], [53.2, 48.2], [52.2, 42.8], [51, 43.2], [51.3, 47.6], [49.4, 48.2]], 2.2, { bevel: 0.25 }).translate(0, 0, 20.5 * s));
  });
  B.part([0, 0.2, 0]);                                                                               // la selle
  B.solid(tube([[-25, 44.5, 0], [-27.2, 52.6, 0]], 1.1));
  const sad = []; for (let i = 0; i <= 24; i++) { const t = i / 24, x = -40 + t * 27, w = 7.2 * Math.pow(1 - t, 0.7) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.6 + 0.2))) + 1.8; sad.push([x, w]); }
  B.solid(topExt(sad.concat(sad.slice().reverse().map(p => [p[0], -p[1]])), 1.6, 54.2, { bevel: 0.5 }));
  [1, -1].forEach(s => B.solid(tube([[-37, 53.2, 2.2 * s], [-33, 52.4, 2.2 * s], [-21, 52.4, 2.2 * s], [-17, 53.4, 1.6 * s]], 0.3, 10, 12)));
  B.part([0, -0.06, 0.24]);                                                                          // le pédalier, les pédales LOOK, la chaîne
  const ring = (n, ro, ri, hole, z) => { const P = []; for (let i = 0; i < n * 2; i++) { const t = i / (n * 2) * TAU, r = i % 2 ? ri : ro; P.push([BB[0] + Math.cos(t) * r, BB[1] + Math.sin(t) * r]); } B.solid(ext(P, 0.35, { holes: [circ(hole, 40, BB[0], BB[1]).reverse()] }).translate(0, 0, z)); };
  ring(52, 10.6, 10.1, 8.4, 4.4); ring(42, 8.7, 8.25, 6.9, 3.6);
  const star = []; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + 0.3; star.push([BB[0] + Math.cos(a - 0.12) * 9.3, BB[1] + Math.sin(a - 0.12) * 9.3], [BB[0] + Math.cos(a + 0.12) * 9.3, BB[1] + Math.sin(a + 0.12) * 9.3], [BB[0] + Math.cos(a + 0.63) * 2.8, BB[1] + Math.sin(a + 0.63) * 2.8]); }
  B.solid(ext(star, 0.6).translate(0, 0, 4.9));
  const arm = (ang, z) => {
    const L = 17, P = []; for (let i = 0; i <= 10; i++) { const t = -Math.PI / 2 + i / 10 * Math.PI; P.push([L + Math.cos(t) * 1.3, Math.sin(t) * 1.3]); } for (let i = 0; i <= 10; i++) { const t = Math.PI / 2 + i / 10 * Math.PI; P.push([Math.cos(t) * 2.1, Math.sin(t) * 2.1]); }
    const c = Math.cos(ang), s = Math.sin(ang), end = [BB[0] + c * L, BB[1] + s * L];
    B.solid(ext(P.map(p => [BB[0] + p[0] * c - p[1] * s, BB[1] + p[0] * s + p[1] * c]), 1.1, { bevel: 0.2 }).translate(0, 0, z));
    const zs = Math.sign(z); B.solid(tf(latheZ([[0, 0], [0.7, 0], [0.7, 3.2 * zs], [0, 3.2 * zs]].map(p => [p[0], p[1]]), 12), [end[0], end[1], z]));
    B.solid(box(8, 1.6, 7, [end[0] + 0.5, end[1] - 0.2, z + 6.8 * zs]));
  };
  arm(-0.95, 6.1); arm(Math.PI - 0.95, -6.1);
  B.soft([BB[0], BB[1] + 10.3, 4.4, RA[0], 5.4, 5.4, BB[0], BB[1] - 10.3, 4.4, RA[0] + 1.5, -9, 5.6]);
} };

// 1998 — la KEO : le corps (contours LOOK), l'axe, la cale
if (M) {
  const side = M.side.slice().sort((a, b) => a[0] - b[0]);
  const sideAt = y => { if (y <= side[0][0]) return [side[0][1], side[0][2]]; for (let i = 1; i < side.length; i++) if (y <= side[i][0]) { const a = side[i - 1], b = side[i], f = (y - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; } const l = side[side.length - 1]; return [l[1], l[2]]; };
  // comme dans pedal3d.js : à l'entrée de l'axe, le corps n'est qu'un fût autour de l'axe
  const XB = Math.min(...M.front.concat(M.rear).flatMap(s => s.outer.filter(p => Math.abs(p[1] - M.spindle.axis) > 0.75).map(p => p[0])));
  const RB = M.spindle.profile[M.spindle.profile.length - 1][1] * 1.02;
  const topAt = (y, x) => x !== undefined && x < XB - 0.01 ? Math.min(sideAt(y)[0], RB) : sideAt(y)[0];
  const botAt = (y, x) => x !== undefined && x < XB - 0.01 ? Math.max(sideAt(y)[1], -RB) : sideAt(y)[1];
  const up = g => tf(g, 0, [-Math.PI / 2, 0, 0]);
  const walls = (loops, zt, zb) => { const w = []; loops.forEach(L => { for (let i = 0; i < L.length; i++) { const a = L[i], b = L[(i + 1) % L.length];
    w.push(a[0], a[1], zb(a), b[0], b[1], zb(b), b[0], b[1], zt(b), a[0], a[1], zb(a), b[0], b[1], zt(b), a[0], a[1], zt(a)); } });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(w, 3)); return g; };
  const sculpt = (shapes, zOf) => { const g = new T.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 4 }), pos = g.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, zOf(pos.getY(i), pos.getZ(i), pos.getX(i))); return g; };
  const upL = arr => { const out = []; for (let i = 0; i < arr.length; i += 3) out.push(arr[i], arr[i + 2], -arr[i + 1]); return out; };
  // la KEO d'aujourd'hui (le corps, la plaque et son logo, l'axe) ; la KEO 1998 y ajoute sa cale
  const keoBody = B => {
    B.part([0, 0, 0]);
    const shapes = M.front.concat(M.rear).map(s => shape(s.outer, s.holes));
    B.occ(up(sculpt(shapes, (y, z, x) => botAt(y, x) + (topAt(y, x) - botAt(y, x)) * z)));
    // les parois, seules analysées : le bord du dessus, le bord du dessous, les arêtes et le contour vu de la caméra
    B.solid(up(walls(M.front.concat(M.rear).flatMap(s => [s.outer].concat(s.holes || [])), p => topAt(p[1], p[0]), p => botAt(p[1], p[0]))));
    // les dessins du dessus, posés sur la surface ; la plaque LOOK en relief, et son logo
    const tl = []; M.topLines.forEach(l => { for (let i = 0; i < l.length - 1; i++) { const a = l[i], b = l[i + 1]; tl.push(a[0], a[1], topAt(a[1], a[0]) + 0.004, b[0], b[1], topAt(b[1], b[0]) + 0.004); } });
    B.soft(upL(tl));
    const pz = p => topAt(p[1]) + 0.1;
    B.occ(up(sculpt(M.plate.map(s => shape(s.outer, s.holes)), (y, z) => topAt(y) - 0.01 + 0.11 * z)));
    B.solid(up(walls(M.plate.map(s => s.outer), pz, p => topAt(p[1]))));
    const lg = []; M.logoLines.forEach(l => { for (let i = 0; i < l.length - 1; i++) { const a = l[i], b = l[i + 1]; lg.push(a[0], a[1], pz(a) + 0.006, b[0], b[1], pz(b) + 0.006); } });
    B.lines(upL(lg));
    B.part([-0.3, 0, 0]);
    B.solid(up(tf(latheX(M.spindle.profile, 28), [0, M.spindle.axis, 0])));
    B.soft(upL(helixX(M.spindle.profile[0][0] + 0.05, M.spindle.profile[0][0] + 1.1, 0.16, 0.07, M.spindle.axis, 0)));
  };
  LIB.powerrs = { build: keoBody };
  LIB.keo1998 = { build(B) {
    keoBody(B);
    B.part([0, 0.34, 0]);
    const top = Math.max(...side.map(s => s[1])) + 0.9, cl = roundPoly([[0, 2.2], [1.3, -0.4], [1.15, -1.9], [-1.15, -1.9], [-1.3, -0.4]], 0.45, 4);
    B.solid(up(ext(cl, 0.34, { holes: [[0, 0.85], [-0.52, -0.55], [0.52, -0.55]].map(([x, y]) => circ(0.17, 14, x, y).reverse()) }).translate(0, 0, top)));
    B.solid(up(ext(roundPoly([[-0.9, -1.85], [0.9, -1.85], [0.8, -1.2], [-0.8, -1.2]], 0.15, 3), 0.12).translate(0, 0, top + 0.23)));
  } };
  LIB.axe = { scale: 1.1, build(B) { B.part(); B.solid(latheX(M.spindle.profile, 28)); B.soft(helixX(M.spindle.profile[0][0] + 0.05, M.spindle.profile[0][0] + 1.1, 0.16, 0.07)); } };
  LIB.powercore = { scale: 1.1, build(B) { B.part(); B.solid(latheX(M.core.profile, 28)); const x0 = M.core.profile[0][0], x1 = M.core.profile[M.core.profile.length - 1][0]; [0.3, 0.5, 0.7].forEach(f => { const x = x0 + (x1 - x0) * f; B.soft(poly(circ(0.3, 24).map(p => [x, p[0], p[1]]), true)); }); } };
}

// la France, en relief, et une épingle sur Nevers (longitude, latitude → degrés, la longitude resserrée)
const FR = [[2.37, 51.05], [4.15, 49.95], [5.8, 49.5], [6.8, 49.15], [8.2, 48.97], [7.6, 47.6], [6.1, 46.25], [7.0, 45.9], [7.0, 44.2], [7.5, 43.78], [6.2, 43.1], [5.0, 43.35], [4.0, 43.5], [3.1, 43.1], [3.17, 42.43], [1.7, 42.5], [0, 42.7], [-1.78, 43.36], [-1.25, 44.6], [-1.2, 46.2], [-2.2, 47.1], [-2.8, 47.5], [-4.4, 47.8], [-4.75, 48.35], [-4.3, 48.7], [-3.0, 48.8], [-1.6, 48.65], [-1.9, 49.7], [-1.3, 49.7], [-0.2, 49.3], [0.2, 49.7], [1.5, 50.2], [1.6, 50.9]];
LIB.france = { build(B) {
  const pr = ([lon, lat]) => [(lon - 2.6) * 0.69, lat - 46.6];
  B.part([0, 0, 0]); B.solid(ext(FR.map(pr), 0.45, { bevel: 0.06 }));
  const cx = pr([9.05, 42.15]); B.solid(ext(Array.from({ length: 16 }, (_, i) => { const t = i / 16 * TAU; return [cx[0] + Math.cos(t) * 0.26, cx[1] + Math.sin(t) * 0.55]; }), 0.45, { bevel: 0.06 }));
  B.part([0, 0, 0.5]); const nv = pr([3.16, 46.99]);
  B.solid(tf(latheZ([[0, 0.28], [0.1, 0.5], [0.1, 1.2], [0, 1.2]], 14), [nv[0], nv[1], 0])); B.solid(ball(0.28, [nv[0], nv[1], 1.4]));
  B.soft(poly(circ(0.4, 20, nv[0], nv[1]).map(p => [p[0], p[1], 0.3]), true));
} };

// les petites pièces
LIB.roulement = { scale: 0.62, build(B) {
  B.part([0, 0, 0]); B.solid(lathe([[9.2, -3.5], [12, -3.5], [12.3, -3.2], [12.3, 3.2], [12, 3.5], [9.2, 3.5], [9.2, 1.4], [8.6, 0], [9.2, -1.4], [9.2, -3.5]], 48));
  B.part([0, 0.3, 0]); B.solid(lathe([[4, -3.5], [6.8, -3.5], [6.8, -1.4], [7.3, 0], [6.8, 1.4], [6.8, 3.5], [4, 3.5], [3.7, 3.2], [3.7, -3.2], [4, -3.5]], 40));
  B.part([0, 0.16, 0]); for (let i = 0; i < 9; i++) { const t = i / 9 * TAU; B.solid(ball(1.25, [Math.cos(t) * 7.95, 0, Math.sin(t) * 7.95])); }
} };
LIB.vis = { scale: 0.5, build(B) {
  B.part([0, 0.25, 0]); B.solid(lathe([[0, 0], [4.2, 0], [4.2, 3.4], [3.8, 4], [0, 4]], 28)); B.lines(poly(circ(1.8, 6).map(p => [p[0], 4.01, p[1]]), true));
  B.part([0, 0, 0]); B.solid(lathe([[0, -14], [1.7, -14], [2, -13.6], [2, 0], [0, 0]], 20)); B.soft(helixY(-13.5, -0.6, 2.02, 0.7));
} };
LIB.rondelle = { scale: 0.36, build(B) { B.part(); B.solid(lathe([[2.2, -0.5], [4.5, -0.5], [4.5, 0.5], [2.2, 0.5], [2.2, -0.5]], 36)); } };
LIB.ressort = { scale: 0.5, build(B) {
  B.part(); const P = []; for (let i = 0; i <= 7 * 24; i++) { const t = i / 24 * TAU; P.push([Math.cos(t) * 4, -8 + i / (7 * 24) * 16, Math.sin(t) * 4]); }
  B.solid(tube(P, 0.55, 12, 7 * 30));
} };
LIB.batterie = { scale: 0.6, build(B) {
  B.part(); B.solid(lathe([[0, -9], [3.1, -9], [3.3, -8.8], [3.3, 8.4], [3.1, 8.6], [1.2, 8.6], [1.2, 9.4], [0, 9.4]], 32));
  [4.5, -6].forEach(y => B.soft(poly(circ(3.32, 32).map(p => [p[0], y, p[1]]), true)));
  B.soft([-0.9, 6.6, 3.33, 0.9, 6.6, 3.33, 0, 5.7, 3.33, 0, 7.5, 3.33]);
} };
LIB.jauge = { scale: 0.46, build(B) {
  B.part(); B.solid(box(12, 0.3, 7));
  const zz = []; for (let i = 0; i < 11; i++) { const x = -3.8 + i * 0.8; zz.push([x, i % 2 ? 2.4 : -2.4], [x, i % 2 ? -2.4 : 2.4]); }
  B.soft(poly(zz.map(p => [p[0], 0.16, p[1]])));
  B.solid(box(1.8, 0.35, 1.6, [4.6, 0.3, 1.4])); B.solid(box(1.8, 0.35, 1.6, [4.6, 0.3, -1.4]));
  B.soft([5.5, 0.3, 1.4, 9, 0.8, 2.4, 5.5, 0.3, -1.4, 9, 0.8, -2.2]);
} };
LIB.carte = { scale: 0.7, build(B) {
  B.part([0, 0, 0]); B.solid(box(18, 0.8, 7));
  B.part([0, 0.25, 0]); B.solid(box(4, 1, 4, [-4, 0.9, 0])); B.solid(box(3, 0.8, 2, [2.5, 0.8, 1.6])); B.solid(box(3, 0.8, 2, [2.5, 0.8, -1.6])); B.solid(tf(latheZ([[0, -1], [0.7, -1], [0.7, 1], [0, 1]], 14), [6.8, 1.1, 0]));
  B.soft([-2, 0.42, 1, 1, 0.42, 1.6, -2, 0.42, -1, 1, 0.42, -1.6, 4, 0.42, 1.6, 6.2, 0.42, 0.4, -6, 0.42, 2.8, 8.4, 0.42, 2.8, -6, 0.42, -2.8, 8.4, 0.42, -2.8]);
  for (let i = 0; i < 5; i++) B.soft([-5.5 + i * 0.75, 1.41, 2, -5.5 + i * 0.75, 1.41, 2.6]);
} };
LIB.embout = { scale: 0.46, build(B) {
  B.part(); B.solid(lathe([[0, 0], [9, 0], [9, 2], [8.2, 3], [6, 3], [6, 2.4], [0, 2.4]], 40));
  [0.6, 2.7, 4.8].forEach(t => B.soft(poly(circ(0.7, 12, Math.cos(t) * 7.4, Math.sin(t) * 7.4).map(p => [p[0], 3.01, p[1]]), true)));
  B.soft(poly(circ(3.2, 28).map(p => [p[0], 2.41, p[1]]), true));
} };
LIB.cale = { scale: 0.62, build(B) {
  B.part(); B.solid(ext(roundPoly([[0, 2.2], [1.3, -0.4], [1.15, -1.9], [-1.15, -1.9], [-1.3, -0.4]], 0.45, 4), 0.34, { holes: [[0, 0.85], [-0.52, -0.55], [0.52, -0.55]].map(([x, y]) => circ(0.17, 14, x, y).reverse()) }));
  B.solid(ext(roundPoly([[-0.9, -1.85], [0.9, -1.85], [0.8, -1.2], [-0.8, -1.2]], 0.15, 3), 0.12).translate(0, 0, 0.23));
} };

// le thème change : les objets déjà créés reprennent la couleur du trait
addEventListener('themechange', () => { const c = inkNow(); for (const nm in pool) pool[nm].forEach(I => { I.mats.line.color.setHex(c); I.mats.soft.color.setHex(c); I.mats.hid.color.setHex(c); }); });
/* des images de l'objet, rendues hors écran (trait blanc sur fond transparent) : une par rotation.
   Sert aux aperçus du sélecteur de thème (js/picker.js), qui les teintent à la couleur de chaque thème. */
let snapR = null, snapS = null, snapC = null; const snapI = {};   // l'objet est construit une fois, puis réutilisé
function frames(name, w, h, rots, size) {
  if (!LIB[name]) return [];
  try {
    if (!snapR) { snapR = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); snapR.setClearColor(0, 0); snapS = new T.Scene(); snapC = new T.OrthographicCamera(0, 1, 0, -1, 1, 4e5); snapC.position.z = 2e5; }
  } catch (e) { return []; }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  snapR.setPixelRatio(dpr); snapR.setSize(w, h, false); snapC.right = w; snapC.bottom = -h; snapC.updateProjectionMatrix();
  const I = snapI[name] || (snapI[name] = instance(name)); scene.remove(I.root); snapS.add(I.root);
  I.mats.line.color.setHex(0xffffff); I.mats.soft.color.setHex(0xffffff); I.mats.hid.color.setHex(0xffffff);
  I.mats.line.opacity = 0.95; I.mats.soft.opacity = 0.45; I.mats.hid.opacity = 0.16;
  I.root.position.set(w / 2, -h / 2, -1000); I.root.scale.setScalar((size || Math.min(w, h) * 0.9) * (LIB[name].scale || 1) * I.P.k);
  const out = rots.map(r => {
    eul.set(r[0], r[1], r[2] || 0, 'YXZ'); I.root.quaternion.setFromEuler(eul);
    snapS.updateMatrixWorld(); I.parts.forEach(p => { if (p.sil) silhouettes(p); });
    snapR.clear(); snapR.render(snapS, snapC);
    const c = document.createElement('canvas'); c.width = snapR.domElement.width; c.height = snapR.domElement.height; c.getContext('2d').drawImage(snapR.domElement, 0, 0); return c;
  });
  snapS.remove(I.root);
  return out;
}
return { frames, get ok() { return ok; }, init, resize, put, render, hit, drag, has: n => ok && !!LIB[n], names: () => Object.keys(LIB) };
})();
