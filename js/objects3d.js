/* Le moteur 3D en traits (repris de LookAnimation) : des objets dessinés comme un plan, sans aucune surface visible.
   Chaque objet est modelé en volumes (tours, extrusions, tubes) ; on en tire :
   - les arêtes vives (toujours dessinées), et leur double caché en pointillés pâles ;
   - les arêtes douces, candidates au contour : à chaque image, on garde celles où la surface se retourne vue de la caméra ;
   - un volume invisible qui cache ce qui est derrière.
   Tout est rendu sur une seule toile, en projection orthogonale, en pixels :
     Obj3D.put(nom, x, y, taillePx, [rx, ry, rz], { a: opacité, e: éclaté 0 → 1, z })   puis   Obj3D.render()
   Chaque objet est découpé en pièces qui s'écartent avec l'éclaté (e) : elles arrivent et repartent ainsi,
   jamais en poussière. On peut attraper un objet (o.grab) : glisser le fait tourner (hit, drag). */
window.Obj3D = (() => {
if (!window.THREE) return { ok: false, put: () => false, render() {}, init() {}, resize() {}, has: () => false, size: () => 1 };
const T = THREE, TAU = Math.PI * 2, inkNow = () => (window.THEME && THEME.inkHex) ?? 0xeef5ff, COS = Math.cos(33 * Math.PI / 180);
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
  if (p.sil.fat) { p.sil.fat.userData.ib.needsUpdate = true; p.sil.fat.geometry.instanceCount = n / 6; return; }
  p.sil.sg.attributes.position.needsUpdate = true; p.sil.sg.setDrawRange(0, n / 3);
}

/* ——— les pantins (js/chats.js) : des objets articulés, dont chaque pièce est posée à chaque image ———
   piece(clé, build) : une pièce modelée une fois (même API que LIB : B.solid, B.occ, B.lines, B.soft), gardée en cache ;
   mount(pièce, mats) : une copie de la pièce (son groupe g, à accrocher où l'on veut) ;
   rig(racine, pièces) : la racine est ajoutée à la scène, ses pièces sont rendues (contours compris) tant qu'elle est visible. */
const pieces = {}, rigs = new Set();
function piece(key, build) {
  if (pieces[key]) return pieces[key];
  const P = { occ: [], crease: [], cand: [], soft: [] };
  const B = {
    occ(g) { P.occ.push(g); return B; },
    solid(g) { const a = analyse(g); P.occ.push(a.g); for (const v of a.crease) P.crease.push(v); for (const v of a.cand) P.cand.push(v); return B; },
    // un volume dont seuls les contours se dessinent (ni arêtes vives, ni bords ouverts) : les fûts d'une chaîne (queue, jambes)
    smooth(g) { const a = analyse(g); P.occ.push(a.g); for (const v of a.cand) P.cand.push(v); return B; },
    lines(arr) { for (const v of arr) P.crease.push(v); return B; },
    soft(arr) { for (const v of arr) P.soft.push(v); return B; }
  };
  build(B);
  const lineGeo = arr => { if (!arr.length) return null; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(arr, 3)); return g; };
  return (pieces[key] = { occ: P.occ, crease: lineGeo(P.crease), soft: lineGeo(P.soft), cand: new Float32Array(P.cand) });
}
// les matériaux d'un pantin : son trait (couleur r,g,b en hexadécimal), ses traits pâles, ses traits cachés
// o.fat : l'épaisseur du trait en px (un trait de stylo, arrondi aux bouts) ; sans, un trait fin d'un pixel
function mats(color, o) {
  const c = color ?? inkNow();
  if (o && o.fat) {
    const M = { line: fatMat(c, o.fat, 1), soft: fatMat(c, o.fatSoft || o.fat * 0.7, 0.5), hid: null, nohid: true, fat: o.fat };
    // o.uni (1…255) : un seul contour autour de toutes les pièces (le corps, les pattes, la queue fondus ensemble, comme un dessin d'un trait).
    // Les volumes inscrivent ce numéro au pochoir ; le contour, deux fois plus épais, ne se dessine que hors du pochoir : seule sa moitié extérieure reste.
    if (o.uni) { M.out = fatMat(c, o.fat * 2, 1, o.uni); M.occ = OCC.clone(); Object.assign(M.occ, { stencilWrite: true, stencilRef: o.uni, stencilFunc: T.AlwaysStencilFunc, stencilZPass: T.ReplaceStencilOp }); }
    return M;
  }
  return { line: new T.LineBasicMaterial({ color: c, transparent: true, depthWrite: false }), soft: new T.LineBasicMaterial({ color: c, transparent: true, opacity: 0.5, depthWrite: false }),
    hid: new T.LineBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, depthFunc: T.GreaterDepth }), nohid: true };
}
/* ——— les traits épais ———
   WebGL ne dessine que des traits d'un pixel : chaque segment devient ici un petit rectangle tourné vers l'écran,
   aux bouts arrondis (le fragment garde ce qui est à moins d'une demi-épaisseur du segment) ; les jointures se recouvrent, comme au stylo.
   Le trait est un peu avancé vers la caméra (bias) : sur un contour, la moitié intérieure n'est pas cachée par le volume lui-même. */
const FAT = { res: { value: new T.Vector2(1, 1) }, dpr: { value: 1 } };
const fatQuad = (() => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3)); g.setIndex([0, 2, 1, 1, 2, 3]); return g; })();
function fatMat(color, width, opacity, ref) {
  const u = { color: { value: new T.Color(color) }, opacity: { value: opacity }, width: { value: width }, res: FAT.res, dpr: FAT.dpr };
  const m = new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false,
    vertexShader: `attribute vec3 a; attribute vec3 b; uniform float width; uniform vec2 res; uniform float dpr;
      varying vec2 vP; varying vec2 vA; varying vec2 vB;
      void main() {
        vec4 A = projectionMatrix * modelViewMatrix * vec4(a, 1.0), B = projectionMatrix * modelViewMatrix * vec4(b, 1.0);
        vec2 sa = (A.xy / A.w * 0.5 + 0.5) * res, sb = (B.xy / B.w * 0.5 + 0.5) * res, d = sb - sa;
        float L = length(d); vec2 dir = L > 1e-4 ? d / L : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
        float h = width * dpr * 0.5 + 1.0; bool e = position.x > 0.5;
        vec2 p = (e ? sb : sa) + dir * (e ? h : -h) + nrm * position.y * h; vec4 C = e ? B : A;
        vP = p; vA = sa; vB = sb;
        gl_Position = vec4((p / res - 0.5) * 2.0, C.z / C.w - 1.2e-5 * width, 1.0);
      }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; uniform float width; uniform float dpr;
      varying vec2 vP; varying vec2 vA; varying vec2 vB;
      void main() {
        vec2 ab = vB - vA; float t = clamp(dot(vP - vA, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0), d = length(vP - vA - ab * t);
        float al = clamp(width * dpr * 0.5 + 0.5 - d, 0.0, 1.0); if (al <= 0.0) discard;
        gl_FragColor = vec4(color, opacity * al);
      }` });
  // comme un matériau ordinaire : m.opacity, m.color.setHex(…)
  Object.defineProperty(m, 'opacity', { get: () => u.opacity.value, set: v => { if (u) u.opacity.value = v; } });
  m.color = u.color.value; m.fat = true;
  // le contour d'un seul trait (js/chat.js) : jamais par-dessus le volume du même chat (le pochoir y porte son numéro)
  if (ref) { m.stencilWrite = true; m.stencilRef = ref; m.stencilFunc = T.NotEqualStencilFunc; m.stencilFail = m.stencilZFail = m.stencilZPass = T.KeepStencilOp; }
  return m;
}
// un paquet de segments épais (arr : des paires de points [x,y,z, x,y,z…]) ; n : combien en montrer
function fatSegs(arr, M) {
  const g = new T.InstancedBufferGeometry(); g.index = fatQuad.index; g.setAttribute('position', fatQuad.attributes.position);
  const ib = new T.InstancedInterleavedBuffer(arr, 6); g.setAttribute('a', new T.InterleavedBufferAttribute(ib, 3, 0)); g.setAttribute('b', new T.InterleavedBufferAttribute(ib, 3, 3));
  g.instanceCount = arr.length / 6; const o = new T.Mesh(g, M); o.userData.ib = ib; return o;
}
function mount(pp, M, own) {
  const g = new T.Group(), add = (o, ord) => { o.renderOrder = ord; o.frustumCulled = false; g.add(o); };
  pp.occ.forEach(o => add(new T.Mesh(o, M.occ || OCC), 0));
  if (M.fat) {
    if (pp.crease) add(fatSegs(pp.crease.attributes.position.array, M.line), 1);
    if (pp.soft) add(fatSegs(pp.soft.attributes.position.array, M.soft), 1);
    let sil = null;
    if (pp.cand.length) { const arr = new Float32Array(pp.cand.length / 2), o = fatSegs(arr, M.out && !own ? M.out : M.line); o.geometry.instanceCount = 0; add(o, 1); sil = { arr, fat: o }; }
    return { g, pp, sil };
  }
  // les traits cachés : seulement s'ils se voient (M.hid.opacity) — sinon autant de dessins en moins par image
  if (pp.crease) { add(new T.LineSegments(pp.crease, M.line), 1); if (!M.nohid) add(new T.LineSegments(pp.crease, M.hid), 2); }
  if (pp.soft) { add(new T.LineSegments(pp.soft, M.soft), 1); }
  let sil = null;
  if (pp.cand.length) { const arr = new Float32Array(pp.cand.length / 2), sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(arr, 3)); sg.setDrawRange(0, 0); add(new T.LineSegments(sg, M.line), 1); sil = { arr, sg }; }
  return { g, pp, sil };
}
function rig(root, list) { if (!ok) return null; const R = { root, list }; scene.add(root); rigs.add(R); return R; }
function unrig(R) { if (!R) return; scene.remove(R.root); rigs.delete(R); }

/* ——— la toile ——— */
function init(canvas) {
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3)); renderer.setClearColor(0, 0);
    scene = new T.Scene(); camera = new T.OrthographicCamera(0, 1, 0, -1, 1, 4e5); camera.position.z = 2e5; ok = true;
  } catch (e) { ok = false; console.error(e); }
}
function resize(w, h) { W = w; H = h; if (!renderer) return; renderer.setSize(w, h, false); renderer.getDrawingBufferSize(FAT.res.value); FAT.dpr.value = renderer.getPixelRatio(); camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h; camera.updateProjectionMatrix(); }
const pc = new T.Vector3(), rq = new T.Quaternion(), AX = new T.Vector3();
/* attraper un objet (o.grab = sa clé) : glisser le fait tourner sur lui-même ; la rotation donnée reste */
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
  I.mats.line.opacity = Math.min(1, 0.95 * a); I.mats.soft.opacity = Math.min(1, 0.42 * a); I.mats.hid.opacity = Math.min(1, (o.hid ?? 0.15) * a);
  // une couleur à soi (o.color, en hexadécimal), sinon le trait du thème
  const col = o.color ?? inkNow(); if (I.col !== col) { I.col = col; I.mats.line.color.setHex(col); I.mats.soft.color.setHex(col); I.mats.hid.color.setHex(col); }
  return true;
}
// où tombe, à l'écran, le point (px, py, pz) du modèle d'un objet posé avec put(nom, x, y, size, rot)
const wo = new T.Object3D(), wv = new T.Vector3();
function where(name, x, y, size, rot, pt) {
  if (!LIB[name]) return null; const P = proto[name] || (proto[name] = make(name));
  eul.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] || 0 : 0, 'YXZ'); wo.quaternion.setFromEuler(eul); wo.position.set(x, -y, 0); wo.scale.setScalar(size * (LIB[name].scale || 1) * P.k); wo.updateMatrix();
  wv.set(pt[0] - P.c.x, pt[1] - P.c.y, (pt[2] || 0) - P.c.z).applyMatrix4(wo.matrix); return [wv.x, -wv.y];
}
function render() {
  if (!ok) return;
  let any = false;
  for (const nm in pool) pool[nm].forEach((I, i) => { if (i >= (used[nm] || 0)) I.root.visible = false; else any = true; });
  rigs.forEach(R => { if (R.root.visible) any = true; });
  if (any) {
    scene.updateMatrixWorld();
    for (const nm in pool) for (let i = 0; i < (used[nm] || 0); i++) pool[nm][i].parts.forEach(p => { if (p.sil) silhouettes(p); });
    rigs.forEach(R => { if (R.root.visible) R.list.forEach(p => { if (p.sil && p.g.visible) silhouettes(p); }); });
    renderer.clear(); renderer.render(scene, camera); drawn = true;
  } else if (drawn) { renderer.clear(); drawn = false; }
  used = {}; zc = 0; frameId++;
}

/* ——— les objets ———
   La bibliothèque est vide : on y ajoutera les modèles du portfolio (les chats, Mathieu, le bureau…).
   Pour ajouter un objet : LIB.nom = { scale, build(B) { … } }, puis Obj3D.put('nom', x, y, taillePx, [rx, ry, rz], { a, e, grab }).
   Dans build, on modèle en volumes :
     B.part([dx, dy, dz])   une nouvelle pièce, et sa direction dans l'éclaté (en fractions de la taille de l'objet)
     B.solid(géométrie)     un volume : ses arêtes vives sont dessinées, ses contours suivent la vue, il cache ce qui est derrière
     B.occ(géométrie)       un volume qui cache, sans aucun trait
     B.lines([x,y,z, x,y,z…]) des traits nets (paires de points) ; B.soft([…]) des traits plus pâles
   Les formes : lathe (tour autour de y), latheX, latheZ, ext (extrusion le long de z), topExt, sideExt, tube, box, ball ;
   des traits : helixX, helixY (filetages), poly (polygone), circ, roundPoly.
   Deux exemples, gardés pour montrer la méthode (et servir aux essais) : */

// exemple 1 — un roulement : deux bagues tournées, et les billes (trois pièces qui s'écartent dans l'éclaté)
LIB.roulement = { scale: 0.62, build(B) {
  B.part([0, 0, 0]); B.solid(lathe([[9.2, -3.5], [12, -3.5], [12.3, -3.2], [12.3, 3.2], [12, 3.5], [9.2, 3.5], [9.2, 1.4], [8.6, 0], [9.2, -1.4], [9.2, -3.5]], 48));
  B.part([0, 0.3, 0]); B.solid(lathe([[4, -3.5], [6.8, -3.5], [6.8, -1.4], [7.3, 0], [6.8, 1.4], [6.8, 3.5], [4, 3.5], [3.7, 3.2], [3.7, -3.2], [4, -3.5]], 40));
  B.part([0, 0.16, 0]); for (let i = 0; i < 9; i++) { const t = i / 9 * TAU; B.solid(ball(1.25, [Math.cos(t) * 7.95, 0, Math.sin(t) * 7.95])); }
} };
// exemple 2 — une vis : la tête (et son empreinte six pans, en traits), la tige et son filetage (une hélice de traits pâles)
LIB.vis = { scale: 0.5, build(B) {
  B.part([0, 0.25, 0]); B.solid(lathe([[0, 0], [4.2, 0], [4.2, 3.4], [3.8, 4], [0, 4]], 28)); B.lines(poly(circ(1.8, 6).map(p => [p[0], 4.01, p[1]]), true));
  B.part([0, 0, 0]); B.solid(lathe([[0, -14], [1.7, -14], [2, -13.6], [2, 0], [0, 0]], 20)); B.soft(helixY(-13.5, -0.6, 2.02, 0.7));
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
return { frames, get ok() { return ok; }, init, resize, put, render, hit, drag, where, has: n => ok && !!LIB[n], names: () => Object.keys(LIB),
  piece, mount, mats, rig, unrig, fatSegs, T, kit: { analyse, tf, lathe, latheX, latheZ, ext, topExt, sideExt, tube, box, ball, helixX, helixY, poly, circ, roundPoly, shape } };
})();
