/* Le mode sérieux : les objets 3D en traits, comme un plan (même esprit que LookAnimation, moteur à part).
   Une toile à lui (#serieux .sx-3d), un rendu three.js à lui : il ne touche pas au moteur du mode chat (js/objects3d.js).
   Les volumes sont invisibles et cachent seulement ce qui est derrière ; on ne voit que les arêtes.
   Chaque objet est découpé en pièces : il arrive en se rassemblant et repart en éclaté (e : 0 assemblé → 1 dispersé).
     Serieux3D.init(toile)                 une fois
     Serieux3D.rendu(poids, t, vue)        à chaque image ; poids = { nom: { w: présence 0 → 1, loc: progression dans sa section, sel: index choisi } }
     Serieux3D.pres(x, y)                  un objet visible sous ce point ? (pour le tourner à la souris)
     Serieux3D.ancre(nom, i)               où tombe, à l'écran, le point d'ancrage i d'un objet (les étiquettes de la pile) */
window.Serieux3D = (() => {
if (!window.THREE) return { ok: false, init() {}, resize() {}, rendu() {}, pres: () => false, ancre: () => null };
const T = THREE, TAU = Math.PI * 2, V = (x, y, z) => new T.Vector3(x, y, z);
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, k) => a + (b - a) * k;
let R = null, scene, cam, W = 1, H = 1, ok = false;
const ENCRE = new T.Color(0xeef5ff), ACCENT = new T.Color(0xffd98a);
const CACHE = new T.MeshBasicMaterial({ colorWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const OBJ = {}, q = new T.Quaternion(), vv = new T.Vector3();

/* ——— de quoi modeler ——— */
function matieres() {
  const m = o => new T.LineBasicMaterial(Object.assign({ color: ENCRE, transparent: true, depthWrite: false }, o));
  return { l: m(), a: m({ color: ACCENT }), s: m({ opacity: 0.32 }), d: new T.LineDashedMaterial({ color: ENCRE, transparent: true, opacity: 0.4, dashSize: 0.05, gapSize: 0.05, depthWrite: false }),
    p: new T.PointsMaterial({ color: ENCRE, size: 3, sizeAttenuation: false, transparent: true, depthWrite: false }), pa: new T.PointsMaterial({ color: ACCENT, size: 5, sizeAttenuation: false, transparent: true, depthWrite: false }) };
}
function objet(nom, o) {
  const g = new T.Group(); g.visible = false; scene.add(g);
  return OBJ[nom] = Object.assign({ nom, g, parts: [], bb: [], m: matieres(), s: 1, e: 1, w: 0, rx: 0.35, ry: -0.6, tick: null, rot: null, ancres: [] }, o);
}
function piece(o, dir, spin, opt) {
  const g = new T.Group(); o.g.add(g);
  const p = Object.assign({ g, dir: V(...dir), spin: V(...(spin || [dir[1] * 0.8, dir[0] * 0.8, dir[2] * 0.5])), base: V(0, 0, 0) }, opt);
  o.parts.push(p); return p;
}
const aretes = (geo, mat, seuil) => { const l = new T.LineSegments(new T.EdgesGeometry(geo, seuil === undefined ? 20 : seuil), mat); l.renderOrder = 1; return l; };
const cache = geo => { const m = new T.Mesh(geo, CACHE); m.renderOrder = 0; return m; };
function solide(g, geo, mat, seuil) { g.add(cache(geo)); const l = aretes(geo, mat, seuil); g.add(l); return l; }
function trait(pts, mat, boucle) {
  const l = new (boucle ? T.LineLoop : T.Line)(new T.BufferGeometry().setFromPoints(pts.map(a => V(...a))), mat); l.renderOrder = 1;
  if (mat.isLineDashedMaterial) l.computeLineDistances();
  return l;
}
const cercle = (r, n, ry) => Array.from({ length: n || 64 }, (_, i) => { const a = i / (n || 64) * TAU; return [Math.cos(a) * r, Math.sin(a) * r * (ry || 1), 0]; });
function segments(n, mat) {   // n segments mobiles (les impulsions)
  const pos = new Float32Array(n * 6), g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const l = new T.LineSegments(g, mat); l.renderOrder = 2; l.frustumCulled = false; return { l, pos, a: g.attributes.position };
}
// un contour de sphère, toujours face à la caméra
function silhouette(o, g, r, mat) { const l = trait(cercle(r, 72), mat, true); g.add(l); o.bb.push(l); return l; }
function boule(o, g, r, mat) { g.add(cache(new T.SphereGeometry(r * 0.985, 24, 16))); return silhouette(o, g, r, mat); }

/* ——— les objets ——— */
function cerveau() {   // l'accueil et le contact : un noyau IA, une coque géodésique, des orbites
  const o = objet('cerveau', { rx: 0.3, ry: 0, s: 0.78 });
  const coque = piece(o, [-1.6, 1.1, 0.4]), geo = new T.IcosahedronGeometry(1, 1);
  solide(coque.g, geo, o.m.l, 1);
  coque.g.add(new T.Points(geo, o.m.p));
  const noyau = piece(o, [0.2, -0.4, 2.2]);
  solide(noyau.g, new T.OctahedronGeometry(0.34), o.m.a, 1);
  const pts = []; const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) pts.push(V(pa.getX(i), pa.getY(i), pa.getZ(i)));
  const imp = segments(5, o.m.a); noyau.g.add(imp.l);
  const cibles = Array.from({ length: 5 }, (_, i) => ({ v: pts[(i * 37) % pts.length], d: i * 0.37 }));
  const anneaux = [[1.34, 0.9, 0.2], [1.5, -0.5, 0.9], [1.22, 1.35, -0.6]].map((a, i) => {
    const p = piece(o, [i === 0 ? 1.8 : -1.2, i === 1 ? 1.5 : -1.3, 0.3]); const r = new T.Group(); r.rotation.set(a[1], a[2], 0); p.g.add(r);
    r.add(trait(cercle(a[0], 96), i === 0 ? o.m.l : o.m.s, true));
    const n = new T.Mesh(new T.OctahedronGeometry(0.05), CACHE); r.add(n); const na = aretes(n.geometry, o.m.a, 1); n.add(na);
    return { r, n, rad: a[0], v: 0.25 + i * 0.12 };
  });
  o.tick = (t) => {
    coque.g.rotation.y = t * 0.08; noyau.g.rotation.set(t * 0.4, t * 0.3, 0);
    anneaux.forEach((a, i) => { const k = t * a.v + i * 2; a.n.position.set(Math.cos(k) * a.rad, Math.sin(k) * a.rad, 0); });
    cibles.forEach((c, i) => {   // une impulsion du noyau vers la coque
      let u = ((t * 0.55 + c.d) % 1.4) / 1.1; if (u > 1) u = 1;
      const a = Math.max(0, u - 0.18), b = u; const w = c.v.clone().applyEuler(coque.g.rotation);
      imp.pos.set([w.x * a, w.y * a, w.z * a, w.x * b, w.y * b, w.z * b], i * 6);
    });
    imp.a.needsUpdate = true;
  };
  o.rot = t => [0.3 + Math.sin(t * 0.2) * 0.08, t * 0.12];
}

function reseau() {   // l'IA : un réseau de neurones, des signaux qui le traversent
  const o = objet('reseau', { s: 0.92 });
  const COUCHES = [[2, 2], [3, 3], [3, 3], [1, 3]], X = [-1.2, -0.4, 0.4, 1.2], ES = 0.42, nodes = [];
  COUCHES.forEach((c, i) => {
    const p = piece(o, [(i - 1.5) * 1.4, (i % 2 ? 1 : -1) * 1.2, 0.6]), L = [];
    for (let a = 0; a < c[0]; a++) for (let b = 0; b < c[1]; b++) {
      const y = (a - (c[0] - 1) / 2) * ES, z = (b - (c[1] - 1) / 2) * ES;
      const g = new T.Group(); g.position.set(X[i], y, z); p.g.add(g); solide(g, new T.IcosahedronGeometry(0.075, 0), i === 3 ? o.m.a : o.m.l, 1);
      L.push(V(X[i], y, z));
    }
    const hy = c[0] * ES / 2 + 0.06, hz = c[1] * ES / 2 + 0.06;
    p.g.add(trait([[X[i], -hy, -hz], [X[i], hy, -hz], [X[i], hy, hz], [X[i], -hy, hz]], o.m.d, true));
    nodes.push(L);
  });
  const liens = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }), seg = [];
  for (let i = 0; i < 3; i++) for (const a of nodes[i]) for (const b of nodes[i + 1]) seg.push(a.x, a.y, a.z, b.x, b.y, b.z);
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(seg, 3)); const ll = new T.LineSegments(lg, o.m.s); ll.renderOrder = 1; liens.g.add(ll);
  const N = 12, imp = segments(N, o.m.a); liens.g.add(imp.l);
  const pulses = Array.from({ length: N }, (_, i) => ({ c: 0, a: nodes[0][i % 4], b: nodes[1][(i * 5) % 9], u: -i * 0.23 }));
  const pick = L => L[Math.floor(Math.random() * L.length)];
  let last = 0;
  o.tick = (t) => {
    const dt = Math.min(0.05, t - last); last = t;
    pulses.forEach((p, i) => {
      p.u += dt * 1.6;
      if (p.u >= 1) { p.u = 0; p.c = (p.c + 1) % 3; p.a = p.c === 0 ? pick(nodes[0]) : p.b; p.b = pick(nodes[p.c + 1]); }
      const u0 = c01(p.u - 0.3), u1 = c01(p.u);
      imp.pos.set([lerp(p.a.x, p.b.x, u0), lerp(p.a.y, p.b.y, u0), lerp(p.a.z, p.b.z, u0), lerp(p.a.x, p.b.x, u1), lerp(p.a.y, p.b.y, u1), lerp(p.a.z, p.b.z, u1)], i * 6);
    });
    imp.a.needsUpdate = true;
  };
  o.rot = t => [0.32 + Math.sin(t * 0.23) * 0.06, -0.62 + Math.sin(t * 0.17) * 0.28];
}

function barres() {   // les chiffres : des colonnes qui montent avec le défilement
  const o = objet('barres', { s: 0.95 });
  const socle = piece(o, [0, -1.6, 0.4]); solide(socle.g, new T.BoxGeometry(2.6, 0.08, 1.5), o.m.l);
  socle.base.y = -0.8;
  const HT = [0.55, 1.35, 0.95, 1.7, 0.75, 1.15, 2.0, 0.85], cols = [];
  HT.forEach((h, i) => {
    const x = (i % 4 - 1.5) * 0.6, z = (Math.floor(i / 4) - 0.5) * 0.66;
    const p = piece(o, [x * 2.2, 1.2 + (i % 3) * 0.4, z * 2.5]); const g = new T.Group(); p.g.add(g); g.position.set(x, -0.76, z);
    const box = new T.Group(); g.add(box); solide(box, new T.BoxGeometry(0.34, 1, 0.34).translate(0, 0.5, 0), h >= 2 ? o.m.a : o.m.l);
    cols.push({ box, h, d: (i % 4) * 0.07 + Math.floor(i / 4) * 0.12 });
  });
  o.tick = (t, v) => { const k = v.loc; cols.forEach(c => { const s = Math.max(0.02, c.h * sm((k * 2.2 - c.d) * 1.3)); c.box.scale.y = s; }); };
  o.rot = t => [0.42, -0.72 + Math.sin(t * 0.2) * 0.2];
}

function pile(n) {   // les compétences : des couches d'architecture, qui s'écartent au défilement ; l'IA en haut
  const o = objet('pile', { s: 0.74, sel: -1 });
  const P = []; const pts = [], w = 1.1, d = 0.75, r = 0.14;
  const sh = new T.Shape(); sh.moveTo(-w + r, -d); sh.lineTo(w - r, -d); sh.quadraticCurveTo(w, -d, w, -d + r); sh.lineTo(w, d - r); sh.quadraticCurveTo(w, d, w - r, d);
  sh.lineTo(-w + r, d); sh.quadraticCurveTo(-w, d, -w, d - r); sh.lineTo(-w, -d + r); sh.quadraticCurveTo(-w, -d, -w + r, -d);
  const geo = new T.ExtrudeGeometry(sh, { depth: 0.09, bevelEnabled: false, curveSegments: 4 }); geo.rotateX(-Math.PI / 2);
  for (let i = 0; i < n; i++) {
    const p = piece(o, [(i % 2 ? 1 : -1) * 2.4, (n / 2 - i) * 0.7, 0.3]); const g = new T.Group(); p.g.add(g);
    solide(g, geo, i === 0 ? o.m.a : o.m.l, 30);
    if (i === 0) {   // la puce sur la couche IA
      const c = new T.Group(); c.position.y = 0.09; g.add(c); solide(c, new T.BoxGeometry(0.5, 0.07, 0.5).translate(0, 0.035, 0), o.m.a);
      const pins = []; for (let k = -2; k <= 2; k++) { const a = k * 0.09; pins.push([a, 0.01, 0.25], [a, 0.01, 0.36], [a, 0.01, -0.25], [a, 0.01, -0.36], [0.25, 0.01, a], [0.36, 0.01, a], [-0.25, 0.01, a], [-0.36, 0.01, a]); }
      const pg = new T.BufferGeometry().setFromPoints(pins.map(a => V(...a))); const pl = new T.LineSegments(pg, o.m.a); pl.renderOrder = 1; c.add(pl);
      c.add(trait(cercle(0.1, 24).map(a => [a[0], 0.075, a[1]]), o.m.a, true));
    }
    P.push({ g, p });
    const an = new T.Object3D(); an.position.set(w, 0.045, 0); g.add(an); o.ancres.push(an);
  }
  o.tick = (t, v) => {
    const gap = 0.16 + 0.3 * sm(v.loc * 1.8 - 0.1);
    P.forEach((c, i) => {
      const hot = o.sel === i ? 1 : 0; c.h = lerp(c.h || 0, hot, 0.12);
      c.g.position.set(c.h * 0.35, ((n - 1) / 2 - i) * gap + Math.sin(t * 0.8 + i) * 0.012, c.h * 0.25);
    });
  };
  o.rot = t => [0.52, -0.66 + Math.sin(t * 0.19) * 0.14];
}

function helice(ans) {   // le parcours : les années sur une hélice, le poste choisi vient au centre
  const o = objet('helice', { s: 0.9, sel: 0 });
  const A0 = 2012.4, A1 = 2026.8, TOURS = 2.6, LEN = 3.6, RAY = 0.62;
  const at = an => { const u = (an - A0) / (A1 - A0), a = u * TOURS * TAU; return { v: V(Math.cos(a) * RAY, (u - 0.5) * LEN, Math.sin(a) * RAY), a }; };
  const corps = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }), tige = new T.Group(); corps.g.add(tige);
  const pts = []; for (let i = 0; i <= 420; i++) { const an = A0 + (A1 - A0) * i / 420; pts.push(at(an).v.toArray()); }
  tige.add(trait(pts, o.m.l));
  tige.add(trait([[0, -LEN / 2 - 0.3, 0], [0, LEN / 2 + 0.3, 0]], o.m.d));
  const ticks = []; for (let y = 2013; y <= 2026; y++) { const p = at(y).v; ticks.push([-0.06, p.y, 0], [0.06, p.y, 0]); }
  const tg = new T.BufferGeometry().setFromPoints(ticks.map(a => V(...a))); const tl = new T.LineSegments(tg, o.m.s); tl.renderOrder = 1; tige.add(tl);
  const M = ans.map((an, i) => {
    const p = piece(o, [(i % 2 ? 1 : -1) * 2, (i - ans.length / 2) * 0.3, 0.8]); const g = new T.Group(); p.g.add(g);
    const w = at(an); g.position.copy(w.v);
    const m = new T.Group(); g.add(m); solide(m, new T.OctahedronGeometry(0.075), o.m.l, 1); const ma = aretes(new T.OctahedronGeometry(0.075), o.m.a, 1); ma.visible = false; m.add(ma);
    const halo = silhouette(o, g, 0.17, o.m.a); halo.visible = false;
    g.add(trait([[0, 0, 0], [-w.v.x, 0, -w.v.z]], o.m.s));
    return { p, g, m, ma, halo, y: w.v.y, a: w.a };
  });
  const S = { y: 0, a: 0 };
  o.tick = (t, v) => {
    const s = Math.max(0, Math.min(M.length - 1, o.sel)), c = M[s];
    S.y = lerp(S.y, -c.y, 0.08); S.a = lerp(S.a, c.a + Math.PI / 2, 0.06);
    corps.g.position.y = S.y; M.forEach((k, i) => { k.p.base.y = S.y; const on = i === s; k.ma.visible = on; k.halo.visible = on; k.m.scale.setScalar(lerp(k.m.scale.x, on ? 1.8 : 1, 0.15)); k.m.rotation.y = t * (on ? 1.2 : 0.3); });
    o.g.userData.ry = S.a;
  };
  o.rot = t => [0.18, (o.g.userData.ry || 0) + Math.sin(t * 0.3) * 0.1];
}

function immeuble() {   // MARKO : des immeubles, et la couche IA qui flotte au-dessus
  const o = objet('immeuble', { s: 0.8 });
  const socle = piece(o, [0, -1.5, 0.3]); solide(socle.g, new T.BoxGeometry(2.4, 0.06, 1.5).translate(0, -0.95, 0), o.m.l);
  [[-0.62, 1.1, 0.5, 0.5, -0.1], [0.05, 1.7, 0.55, 0.55, 0.15], [0.72, 0.8, 0.5, 0.6, -0.2]].forEach((b, i) => {
    const p = piece(o, [(i - 1) * 2.4, 1.3, (i - 1) * 0.6]), g = new T.Group(); p.g.add(g); g.position.set(b[0], -0.92, b[4]);
    solide(g, new T.BoxGeometry(b[2], b[1], b[3]).translate(0, b[1] / 2, 0), o.m.l);
    const f = []; for (let y = 0.14; y < b[1] - 0.05; y += 0.14) { const x = b[2] / 2 + 0.002, z = b[3] / 2 + 0.002; f.push([-x, y, z], [x, y, z], [x, y, z], [x, y, -z]); }
    const fg = new T.BufferGeometry().setFromPoints(f.map(a => V(...a))); const fl = new T.LineSegments(fg, o.m.s); fl.renderOrder = 1; g.add(fl);
    if (i === 1) g.add(trait([[0, b[1], 0], [0, b[1] + 0.25, 0]], o.m.l));
  });
  const ia = piece(o, [0, 2.2, 0.5]), anneau = new T.Group(); anneau.position.y = 1.35; ia.g.add(anneau);
  anneau.add(trait(cercle(0.95, 96).map(a => [a[0], 0, a[1]]), o.m.a, true));
  const nds = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, g = new T.Group(); g.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95); anneau.add(g); solide(g, new T.OctahedronGeometry(0.05), o.m.a, 1); nds.push(g); }
  const fils = segments(3, o.m.d); ia.g.add(fils.l);
  o.tick = (t) => {
    anneau.rotation.y = t * 0.25;
    [[-0.62, 0.18, -0.1], [0.05, 0.8, 0.15], [0.72, -0.12, -0.2]].forEach((b, i) => { const n = nds[i * 2]; n.getWorldPosition(vv); ia.g.worldToLocal(vv); fils.pos.set([vv.x, vv.y, vv.z, b[0], b[1], b[2]], i * 6); });
    fils.a.needsUpdate = true; fils.l.computeLineDistances();
  };
  o.rot = t => [0.3, -0.7 + Math.sin(t * 0.2) * 0.25];
}

function atome() {   // HUman : un atome, des électrons
  const o = objet('atome', { s: 0.95, rx: 0.2 });
  const noyau = piece(o, [0, 0, 2]);
  [[0, 0, 0, 0.26], [0.2, 0.12, 0.05, 0.16], [-0.18, -0.1, 0.1, 0.15], [0.05, -0.2, -0.12, 0.14]].forEach(b => { const g = new T.Group(); g.position.set(b[0], b[1], b[2]); noyau.g.add(g); boule(o, g, b[3], o.m.l); });
  const orb = [0, 1, 2].map(i => {
    const p = piece(o, [Math.cos(i * 2.1) * 2.2, Math.sin(i * 2.1) * 2.2, 0.4]), r = new T.Group(); r.rotation.set(1.2, 0, i * Math.PI / 3); p.g.add(r);
    r.add(trait(cercle(1.25, 96, 0.36), i === 0 ? o.m.l : o.m.s, true));
    const e = new T.Group(); r.add(e); boule(o, e, 0.06, o.m.a); return { e, v: 0.9 + i * 0.25 };
  });
  o.tick = t => orb.forEach((b, i) => { const a = t * b.v + i * 2; b.e.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25 * 0.36, 0); });
  o.rot = t => [0.2 + Math.sin(t * 0.3) * 0.1, t * 0.15];
}

function globe() {   // Digiplace : le globe, des liaisons entre les sites
  const o = objet('globe', { s: 0.98, rx: 0.35 });
  const sph = piece(o, [0, 0, 2], [0, 0, 0]); boule(o, sph.g, 1, o.m.l);
  const mer = piece(o, [-2, 0.8, 0]); for (let i = 0; i < 6; i++) { const l = trait(cercle(1, 96), o.m.s, true); l.rotation.y = i / 6 * Math.PI; mer.g.add(l); }
  const par = piece(o, [2, -0.8, 0]); [-60, -30, 0, 30, 60].forEach(d => { const a = d * Math.PI / 180, l = trait(cercle(Math.cos(a), 96), o.m.s, true); l.rotation.x = Math.PI / 2; l.position.y = Math.sin(a); par.g.add(l); });
  const liens = piece(o, [0, 2.2, 0.5]);
  const sur = (la, lo) => { la *= Math.PI / 180; lo *= Math.PI / 180; return V(Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)); };
  const SITES = [[48.8, 2.3], [40.7, -74], [-23.5, -46.6], [1.3, 103.8], [51.5, -0.1], [35.7, 139.7], [-33.9, 18.4]].map(a => sur(a[0], a[1]));
  const arcs = [[0, 1], [0, 2], [0, 3], [0, 5], [0, 6], [4, 1]].map(([i, j]) => {
    const a = SITES[i], b = SITES[j], P = [];
    for (let k = 0; k <= 40; k++) { const u = k / 40, v = a.clone().lerp(b, u).normalize().multiplyScalar(1 + 0.28 * Math.sin(Math.PI * u) * a.distanceTo(b) / 2); P.push(v); }
    liens.g.add(trait(P.map(p => p.toArray()), o.m.a)); return P;
  });
  const pts = new T.BufferGeometry(); pts.setAttribute('position', new T.BufferAttribute(new Float32Array(arcs.length * 3), 3));
  const pp = new T.Points(pts, o.m.pa); pp.renderOrder = 2; liens.g.add(pp);
  SITES.forEach(s => { const g = new T.Group(); g.position.copy(s); liens.g.add(g); solide(g, new T.OctahedronGeometry(0.035), o.m.a, 1); });
  o.tick = t => { arcs.forEach((P, i) => { const u = ((t * 0.35 + i * 0.27) % 1), p = P[Math.floor(u * (P.length - 1))]; pts.attributes.position.setXYZ(i, p.x, p.y, p.z); }); pts.attributes.position.needsUpdate = true; };
  o.rot = t => [0.35, t * 0.18];
}

function chat() {   // ce portfolio : une tête de chat, au trait, comme ceux du mode chat
  const o = objet('chat', { s: 0.95, rx: 0.1 });
  const pts = [];
  for (let i = 0; i < 160; i++) {
    const a = i / 160 * TAU; let r = 1;
    const oreille = c => { const x = (a - c) / 0.32; return Math.abs(x) < 1 ? (1 - Math.abs(x)) * 0.62 : 0; };
    r += oreille(Math.PI * 0.3) + oreille(Math.PI * 0.7);
    pts.push(new T.Vector2(Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.86 - 0.08));
  }
  const tete = piece(o, [0, -1.8, 0]), geo = new T.ExtrudeGeometry(new T.Shape(pts), { depth: 0.36, bevelEnabled: false }); geo.translate(0, 0, -0.18);
  solide(tete.g, geo, o.m.l, 40);
  const face = piece(o, [0, 0.4, 2.4]), f = new T.Group(); f.position.z = 0.185; face.g.add(f);
  [-0.36, 0.36].forEach(x => {
    const oe = trait(cercle(0.15, 48, 1.3).map(a => [a[0] + x, a[1] + 0.02, 0]), o.m.l, true); f.add(oe);
    f.add(trait(cercle(0.045, 20).map(a => [a[0] + x + 0.05, a[1] + 0.1, 0]), o.m.l, true));
    f.add(trait(cercle(0.022, 14).map(a => [a[0] + x - 0.04, a[1] - 0.04, 0]), o.m.l, true));
  });
  f.add(trait([[-0.06, -0.24, 0], [0.06, -0.24, 0], [0, -0.31, 0]], o.m.a, true));
  f.add(trait([[-0.16, -0.36, 0], [-0.08, -0.41, 0], [0, -0.33, 0], [0.08, -0.41, 0], [0.16, -0.36, 0]], o.m.l));
  const mous = piece(o, [0, 0.2, 2.8]), m = new T.Group(); m.position.z = 0.19; mous.g.add(m);
  [-1, 1].forEach(s => [-0.08, 0, 0.08].forEach((dy, k) => m.add(trait([[s * 0.24, -0.28 + dy * 0.5, 0], [s * 0.88, -0.24 + dy * 1.6 + (k - 1) * 0.02, 0]], o.m.s))));
  o.tick = t => { const b = (t % 4.2) > 4.05 ? 0.1 : 1; f.children.forEach((c, i) => { if (i < 6) c.scale.y = b; }); };
  o.rot = t => [0.12 + Math.sin(t * 0.4) * 0.06, Math.sin(t * 0.35) * 0.6];
}

/* ——— la mise en place ——— */
function init(toile, d) {
  if (ok) return true;
  try { R = new T.WebGLRenderer({ canvas: toile, alpha: true, antialias: (window.devicePixelRatio || 1) < 2.5 }); } catch (e) { return false; }
  R.setClearColor(0x000000, 0); scene = new T.Scene(); cam = new T.OrthographicCamera(-1, 1, 1, -1, -5000, 5000); cam.position.z = 1000;
  cerveau(); reseau(); barres(); pile(d.competences.length); helice(d.parcours.map(p => p.an)); immeuble(); atome(); globe(); chat();
  ok = true; resize(); return true;
}
function resize() {
  if (!ok) return;
  const c = R.domElement; W = c.clientWidth || innerWidth; H = c.clientHeight || innerHeight;
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); R.setSize(W, H, false);
  Object.assign(cam, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); cam.updateProjectionMatrix();
  const pr = R.getPixelRatio(); for (const k in OBJ) { OBJ[k].m.p.size = 3 * pr; OBJ[k].m.pa.size = 5 * pr; }
}
/* où poser l'objet : à droite du texte sur écran large, en haut derrière le texte sur écran étroit */
function place(o, vue) {
  if (vue.large) { const s = Math.min(W * 0.17, H * 0.3) * o.s; return { x: W * (vue.accueil ? 0.25 : 0.235), y: -H * 0.02, s }; }
  const s = Math.min(W * 0.3, H * 0.15) * o.s * 0.9; return { x: W * 0.12, y: H * 0.26, s };
}
function rendu(poids, t, vue) {
  if (!ok) return;
  let rien = true;
  for (const k in OBJ) {
    const o = OBJ[k], p = poids[k] || { w: 0, loc: 0 };
    o.w = p.w; if (p.sel !== undefined) o.sel = p.sel;
    const e = 1 - p.w; o.e = e;
    if (p.w < 0.004) { o.g.visible = false; continue; }
    rien = false; o.g.visible = true;
    const pl = place(o, Object.assign({}, vue, { accueil: k === 'cerveau' && vue.accueil }));
    const r = o.rot ? o.rot(t) : [o.rx, o.ry + t * 0.1];
    o.g.position.set(pl.x + (vue.mx || 0) * 8, pl.y - (vue.my || 0) * 6, 0); o.g.scale.setScalar(pl.s * (0.9 + 0.1 * p.w));
    o.g.rotation.set(r[0] + (vue.my || 0) * 0.08 + (vue.prx || 0), r[1] + (vue.mx || 0) * 0.14 + (vue.pry || 0), 0, 'YXZ');
    const k2 = Math.pow(e, 1.4) * 3.2, op = 1 - sm((e - 0.5) / 0.5);
    for (const part of o.parts) {
      if (part.fond) { part.g.visible = e < 0.45; part.g.position.copy(part.base); continue; }
      part.g.visible = true; part.g.position.copy(part.base).addScaledVector(part.dir, k2);
      part.g.rotation.set(part.spin.x * k2 * 0.6, part.spin.y * k2 * 0.6, part.spin.z * k2 * 0.6);
    }
    for (const m in o.m) o.m[m].opacity = op * (m === 's' ? 0.32 : m === 'd' ? 0.4 : 1);
    if (o.tick) o.tick(t, p);
    o.g.updateMatrixWorld(true);
    for (const b of o.bb) { b.parent.getWorldQuaternion(q); b.quaternion.copy(q.invert()); b.updateMatrixWorld(true); }
  }
  R.render(scene, cam);
  return !rien;
}
function pres(x, y) {
  for (const k in OBJ) { const o = OBJ[k]; if (!o.g.visible || o.w < 0.6) continue; const sx = W / 2 + o.g.position.x, sy = H / 2 - o.g.position.y; if (Math.hypot(x - sx, y - sy) < o.g.scale.x * 1.6) return true; }
  return false;
}
function ancre(nom, i) {
  const o = OBJ[nom]; if (!o || !o.g.visible || !o.ancres[i]) return null;
  o.ancres[i].getWorldPosition(vv); return { x: W / 2 + vv.x, y: H / 2 - vv.y, w: o.w };
}
return { get ok() { return ok; }, init, resize, rendu, pres, ancre, OBJ };
})();
