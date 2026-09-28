/* Le mode sérieux : les objets 3D en traits, comme un plan (même esprit que LookAnimation, moteur à part).
   Une toile à lui (#serieux .sx-3d), un rendu three.js à lui : il ne touche pas au moteur du mode chat (js/objects3d.js).
   Les volumes sont invisibles et cachent seulement ce qui est derrière ; on ne voit que les arêtes.
   Chaque objet est découpé en pièces : il arrive en se rassemblant et repart en éclaté (e : 0 assemblé → 1 dispersé).
   Chaque objet illustre le texte qu'il accompagne : dans un écran épinglé, v.pas (0 → n) dit quelle étape on lit, et l'objet la joue.
     Serieux3D.init(toile, données)        une fois
     Serieux3D.rendu(poids, t, vue)        à chaque image ; poids = { nom: { w: présence 0 → 1, loc: progression dans son bloc, pas: étape (réel) } }
     Serieux3D.pres(x, y)                  un objet visible sous ce point ? (pour le tourner à la souris)
     Serieux3D.etiquettes()                les étiquettes accrochées aux objets : [{ nom, i, t }]
     Serieux3D.ancre(nom, i)               où tombe l'étiquette i d'un objet à l'écran : { x, y, op, on } */
window.Serieux3D = (() => {
if (!window.THREE) return { ok: false, init() {}, resize() {}, rendu() {}, pres: () => false, ancre: () => null, etiquettes: () => [] };
const T = THREE, TAU = Math.PI * 2, V = (x, y, z) => new T.Vector3(x, y, z);
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, k) => a + (b - a) * k;
const fen = (x, a, b) => sm((x - a) / (b - a));   // 0 avant a, 1 après b
let R = null, scene, cam, W = 1, H = 1, PR = 1, ok = false;
const ENCRE = new T.Color(0xeef5ff), ACCENT = new T.Color(0xffd98a);
const CACHE = new T.MeshBasicMaterial({ colorWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const OBJ = {}, q = new T.Quaternion(), vv = new T.Vector3(), ETQ = [];
let graine = 7; const rnd = () => { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; };

/* ——— de quoi modeler ——— */
const BASE = { l: 1, a: 1, s: 0.32, d: 0.45, p: 0.9, pa: 1 };
function matieres() {
  const m = o => new T.LineBasicMaterial(Object.assign({ color: ENCRE.clone(), transparent: true, depthWrite: false }, o));
  return { l: m(), a: m({ color: ACCENT.clone() }), s: m({ opacity: 0.32 }),
    d: new T.LineDashedMaterial({ color: ENCRE.clone(), transparent: true, opacity: 0.45, dashSize: 0.045, gapSize: 0.04, depthWrite: false }),
    p: new T.PointsMaterial({ color: ENCRE.clone(), size: 3, sizeAttenuation: false, transparent: true, depthWrite: false }),
    pa: new T.PointsMaterial({ color: ACCENT.clone(), size: 5, sizeAttenuation: false, transparent: true, depthWrite: false }) };
}
function opac(m, a) { for (const k in m) if (BASE[k] !== undefined) m[k].opacity = a * BASE[k]; }
function chaud(m, k) { m.l.color.copy(ENCRE).lerp(ACCENT, k); m.s.color.copy(ENCRE).lerp(ACCENT, k); m.d.color.copy(ENCRE).lerp(ACCENT, k); }
const MATS = [];   // toutes les matières, pour la taille des points
function objet(nom, o) {
  const g = new T.Group(); g.visible = false; scene.add(g);
  const ob = OBJ[nom] = Object.assign({ nom, g, parts: [], bb: [], m: matieres(), s: 1, e: 1, w: 0, op: 0, tick: null, rot: null, pl: null, etq: [] }, o);
  MATS.push(ob.m); return ob;
}
function piece(o, dir, spin, opt) {
  const g = new T.Group(); o.g.add(g);
  const p = Object.assign({ g, dir: V(...dir), spin: V(...(spin || [dir[1] * 0.8, dir[0] * 0.8, dir[2] * 0.5])), base: V(0, 0, 0) }, opt);
  o.parts.push(p); return p;
}
function etiquette(o, parent, pos, t, opt) {
  const a = new T.Object3D(); a.position.set(...pos); parent.add(a);
  const e = Object.assign({ a, t, on: false, op: 1 }, opt); e.i = o.etq.length; o.etq.push(e); ETQ.push({ nom: o.nom, i: e.i, t, cls: (opt && opt.cls) || '' }); return e;
}
const aretes = (geo, mat, seuil) => { const l = new T.LineSegments(new T.EdgesGeometry(geo, seuil === undefined ? 20 : seuil), mat); l.renderOrder = 1; return l; };
const cache = geo => { const m = new T.Mesh(geo, CACHE); m.renderOrder = 0; return m; };
function solide(g, geo, mat, seuil) { g.add(cache(geo)); const l = aretes(geo, mat, seuil); g.add(l); return l; }
function trait(pts, mat, boucle) {
  const l = new (boucle ? T.LineLoop : T.Line)(new T.BufferGeometry().setFromPoints(pts.map(a => V(...a))), mat); l.renderOrder = 1;
  if (mat.isLineDashedMaterial) l.computeLineDistances();
  return l;
}
function traits(segs, mat) {   // beaucoup de segments en une seule géométrie : [[x,y,z],[x,y,z], …] par paires
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(segs.flat(), 3));
  const l = new T.LineSegments(g, mat); l.renderOrder = 1; if (mat.isLineDashedMaterial) l.computeLineDistances(); return l;
}
const cercle = (r, n, ry) => Array.from({ length: n || 64 }, (_, i) => { const a = i / (n || 64) * TAU; return [Math.cos(a) * r, Math.sin(a) * r * (ry || 1), 0]; });
const cercleH = (r, n, cx, y, cz) => cercle(r, n).map(p => [p[0] + (cx || 0), y || 0, p[1] + (cz || 0)]);
function boucleSegs(pts) { const s = []; for (let i = 0; i < pts.length; i++) s.push(pts[i], pts[(i + 1) % pts.length]); return s; }
function segments(n, mat) {   // n segments mobiles (les impulsions)
  const pos = new Float32Array(n * 6), g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const l = new T.LineSegments(g, mat); l.renderOrder = 2; l.frustumCulled = false; return { l, pos, a: g.attributes.position };
}
function points(n, mat) {
  const pos = new Float32Array(n * 3), g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const p = new T.Points(g, mat); p.renderOrder = 2; p.frustumCulled = false; return { p, pos, a: g.attributes.position };
}
function silhouette(o, g, r, mat) { const l = trait(cercle(r, 72), mat, true); g.add(l); o.bb.push(l); return l; }
function boule(o, g, r, mat) { g.add(cache(new T.SphereGeometry(r * 0.985, 24, 16))); return silhouette(o, g, r, mat); }
function rrect(w, d, r) {   // un rectangle aux coins arrondis, centré (profil x, y)
  const s = new T.Shape(); s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r); s.lineTo(w, d - r); s.quadraticCurveTo(w, d, w - r, d);
  s.lineTo(-w + r, d); s.quadraticCurveTo(-w, d, -w, d - r); s.lineTo(-w, -d + r); s.quadraticCurveTo(-w, -d, -w + r, -d); return s;
}
function plaque(w, d, h, r) { const g = new T.ExtrudeGeometry(rrect(w, d, r), { depth: h, bevelEnabled: false, curveSegments: 4 }); g.rotateX(-Math.PI / 2); return g; }   // de y = 0 à y = h

/* un nuage de points ronds, qui peut prendre la couleur d'accent point par point (h) et s'effacer point par point (a) */
function nuageMat() {
  return new T.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { c: { value: ENCRE }, k: { value: ACCENT }, op: { value: 1 }, sz: { value: 3 } },
    vertexShader: 'attribute float a; attribute float h; varying float va; varying float vh; uniform float sz; void main() { va = a; vh = h; gl_PointSize = sz * (0.8 + 0.7 * h); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 c; uniform vec3 k; uniform float op; varying float va; varying float vh; void main() { vec2 d = gl_PointCoord - 0.5; if (dot(d, d) > 0.25) discard; gl_FragColor = vec4(mix(c, k, vh), va * op); }' });
}
function nuage(n) {
  const g = new T.BufferGeometry(), P = new Float32Array(n * 3), A = new Float32Array(n).fill(1), Hh = new Float32Array(n);
  g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('a', new T.BufferAttribute(A, 1)); g.setAttribute('h', new T.BufferAttribute(Hh, 1));
  const m = nuageMat(), p = new T.Points(g, m); p.frustumCulled = false; p.renderOrder = 2;
  return { p, m, P, A, H: Hh, n, maj() { g.attributes.position.needsUpdate = true; g.attributes.a.needsUpdate = true; g.attributes.h.needsUpdate = true; } };
}

/* ——— la puce : l'objet fil rouge ; ses six couches sont les six familles de compétences ———
   de bas en haut : la carte (DevOps & cloud), les pistes (leadership), le substrat et ses billes (back-end),
   l'anneau de garde (sécurité), la puce nue (l'IA, le cœur), le capot (le front, ce qu'on voit). */
const COUCHES = ['devops', 'lead', 'back', 'secu', 'ia', 'front'];
function puce(nom, cfg) {
  const o = objet(nom, Object.assign({ s: 1 }, cfg)), C = {}, Y0 = { devops: -0.55, lead: -0.512, back: -0.4, secu: -0.325, ia: -0.32, front: -0.2 };
  COUCHES.forEach((id, k) => { const p = piece(o, [(k % 2 ? 1 : -1) * 1.6, (k - 2.5) * 0.9, (k % 3 - 1) * 0.8]); const g = new T.Group(); p.g.add(g); C[id] = { p, g, m: matieres(), k, hot: 0, f: 1 }; MATS.push(C[id].m); });
  /* la carte */
  { const c = C.devops, m = c.m; solide(c.g, new T.BoxGeometry(3.0, 0.07, 2.2), m.l);
    [[-1.35, -0.95], [1.35, -0.95], [-1.35, 0.95], [1.35, 0.95]].forEach(p => c.g.add(trait(cercleH(0.06, 20, p[0], 0.037, p[1]), m.l, true)));
    c.g.add(trait([[-1.02, 0.037, -1.02], [1.02, 0.037, -1.02], [1.02, 0.037, 1.02], [-1.02, 0.037, 1.02]], m.d, true));
    [[-1.2, 0.3], [-1.2, -0.3], [1.2, 0.35], [1.2, -0.1], [0.4, -1.0], [-0.5, 1.0]].forEach((p, i) => { const b = new T.Group(); b.position.set(p[0], 0.06, p[1]); c.g.add(b); solide(b, new T.BoxGeometry(i < 4 ? 0.1 : 0.18, 0.05, i < 4 ? 0.18 : 0.1), m.l); }); }
  /* les pistes : du bord de la puce vers les connecteurs, coudées à 45° */
  { const c = C.lead, m = c.m, segs = [], pads = [], rails = [];
    for (let s = 0; s < 4; s++) for (let i = 0; i < 6; i++) {
      const u = (i - 2.5) * 0.24, a = [0.9, u], b = [1.1 + Math.abs(u) * 0.35, u * 1.25], c2 = [1.36, u * 1.25];
      const rot = ([x, z]) => s === 0 ? [x, z] : s === 1 ? [-x, z] : s === 2 ? [z, x * 0.72] : [z, -x * 0.72];
      const P = [a, b, c2].map(rot).map(([x, z]) => [x, 0, z]); segs.push(P[0], P[1], P[1], P[2]); rails.push(P); pads.push(...boucleSegs(cercleH(0.03, 10, P[2][0], 0, P[2][2])));
    }
    c.g.add(traits(segs, m.l)); c.g.add(traits(pads, m.l)); c.rails = rails;
    c.imp = points(24, o.m.pa); c.g.add(c.imp.p); }
  /* le substrat et ses billes */
  { const c = C.back, m = c.m; solide(c.g, new T.BoxGeometry(1.7, 0.1, 1.7), m.l); const s = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) s.push(...boucleSegs(cercleH(0.045, 10, (i - 3.5) * 0.2, -0.08, (j - 3.5) * 0.2)));
    c.g.add(traits(s, m.s)); }
  /* l'anneau de garde */
  { const c = C.secu, m = c.m, sh = rrect(0.64, 0.64, 0.05); sh.holes.push(new T.Path(rrect(0.53, 0.53, 0.03).getPoints(4).reverse()));
    const g = new T.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }); g.rotateX(-Math.PI / 2); solide(c.g, g, m.l, 30); }
  /* la puce nue : une grille de cœurs, quelques-uns allumés */
  { const c = C.ia, m = c.m; solide(c.g, new T.BoxGeometry(0.9, 0.06, 0.9).translate(0, 0.03, 0), m.l); const s = [], hot = [];
    for (let i = 0; i <= 6; i++) { const u = -0.4 + i * 0.8 / 6; s.push([u, 0.062, -0.4], [u, 0.062, 0.4], [-0.4, 0.062, u], [0.4, 0.062, u]); }
    c.g.add(traits(s, m.s));
    [[1, 1], [2, 4], [4, 2], [3, 3], [5, 5], [0, 3]].forEach(([i, j]) => { const x = -0.4 + (i + 0.5) * 0.8 / 6, z = -0.4 + (j + 0.5) * 0.8 / 6; hot.push(...boucleSegs([[x - 0.045, 0.064, z - 0.045], [x + 0.045, 0.064, z - 0.045], [x + 0.045, 0.064, z + 0.045], [x - 0.045, 0.064, z + 0.045]])); });
    c.cores = traits(hot, o.m.a); c.g.add(c.cores); }
  /* le capot : gravé MW */
  { const c = C.front, m = c.m; solide(c.g, plaque(0.75, 0.75, 0.12, 0.1), m.l, 30); const y = 0.122, k = 0.7;
    const M = [[-0.35, -0.15], [-0.35, 0.15], [-0.2, -0.02], [-0.05, 0.15], [-0.05, -0.15]], Wl = [[0.05, 0.15], [0.12, -0.15], [0.2, 0.05], [0.28, -0.15], [0.35, 0.15]];
    [M, Wl].forEach(L => c.g.add(trait(L.map(([x, z]) => [x * k, y, -z * k]), m.l)));
    c.g.add(trait(cercleH(0.04, 16, -0.55, y, 0.55), m.l, true)); c.g.add(trait([[-0.3, y, 0.28], [0.3, y, 0.28]], m.s)); }
  const X = { devops: [1.5, 0.035, 1.1], lead: [1.36, 0, 0.6], back: [0.85, 0.05, 0.85], secu: [0.64, 0.05, 0.64], ia: [0.45, 0.06, 0.45], front: [0.75, 0.12, 0.75] };
  o.C = C;
  (cfg.etiq || []).forEach(([id, t]) => { C[id].e = etiquette(o, C[id].g, X[id], t, { cls: id === 'ia' ? 'ia' : '' }); });
  o.tick = (t, v) => {
    const ex = cfg.ex ? cfg.ex(t, v) : 0, hl = cfg.hl ? cfg.hl(t, v) : -1, lid = cfg.lid ? cfg.lid(t, v) : 0;
    COUCHES.forEach((id, k) => {
      const c = C[id]; c.hot = lerp(c.hot, hl === k ? 1 : 0, 0.12); c.f = lerp(c.f, hl < 0 || hl === k ? 1 : 0.3, 0.1);
      c.p.base.set(c.hot * 0.12, Y0[id] + (k - 2.5) * ex * 0.42 + (id === 'front' ? lid * 0.9 : 0) + c.hot * 0.05, c.hot * 0.12);
      if (id === 'front') c.g.rotation.x = -lid * 0.5;
      chaud(c.m, id === 'ia' ? Math.max(0.35, c.hot) : c.hot); opac(c.m, o.op * c.f);
      if (c.e) { c.e.on = hl === k || (hl < 0 && cfg.etiqToutes); c.e.op = hl < 0 ? 1 : c.f; }
    });
    C.ia.cores.material.opacity = o.op * (0.6 + 0.4 * Math.sin(t * 2.2));
    const imp = C.lead.imp, rails = C.lead.rails, n = cfg.impulsions ? cfg.impulsions(t, v) : 0;
    for (let i = 0; i < 24; i++) {
      const r = rails[(i * 7) % rails.length], u = ((t * 0.35 + i * 0.137) % 1); let P;
      if (i >= n) P = [0, -99, 0]; else { const a = u < 0.5 ? r[0] : r[1], b = u < 0.5 ? r[1] : r[2], k = u < 0.5 ? u * 2 : u * 2 - 1; P = [lerp(a[0], b[0], k), 0.01, lerp(a[2], b[2], k)]; }
      imp.pos.set(P, i * 3);
    }
    imp.a.needsUpdate = true;
  };
  return o;
}

/* ——— 01 L'IA : la chaîne que j'ai construite chez MARKO, une étape par paragraphe ———
   un document entre, il est lu (Document AI), ses champs sortent en blocs (extraction), le modèle retrouve ses sources (LLM / RAG),
   des agents enchaînent les tâches (agentic AI), le suivi et les rapports partent seuls (workflow automation). */
function chaine() {
  const o = objet('chaine', { s: 0.82, pl: { x: 0.26, y: 0.04, s: 1.38 }, plT: { y: 0.24, s: 1.6 } });
  const X = [-1.76, -0.88, 0, 0.88, 1.76], pan = piece(o, [0, -1.8, 0], [0, 0, 0]), P = new T.Group(); pan.g.add(P);
  const ST = X.map(() => { const m = matieres(); MATS.push(m); return { m, g: new T.Group(), f: 0.3, hot: 0 }; });
  ST.forEach((s, i) => { s.g.position.x = X[i]; P.add(s.g); });
  /* le socle : une dalle gravée par station (elle s'efface avec sa station), la piste qui mène à la suivante */
  ST.forEach((s, i) => { solide(s.g, new T.BoxGeometry(0.86, 0.05, 1.45).translate(0, -0.025, 0), s.m.l); const g = [];
    for (let k = -4; k <= 4; k++) g.push([k * 0.1, 0.001, -0.72], [k * 0.1, 0.001, -0.66], [k * 0.1, 0.001, 0.66], [k * 0.1, 0.001, 0.72]); s.g.add(traits(g, s.m.s));
    if (i < 4) s.g.add(trait([[0.3, 0.004, 0], [0.58, 0.004, 0]], s.m.s)); });
  const pisteOn = segments(4, o.m.a); P.add(pisteOn.l);
  ST.forEach((s, i) => { s.g.add(trait([[-0.3, 0.004, -0.3], [0.3, 0.004, -0.3], [0.3, 0.004, 0.3], [-0.3, 0.004, 0.3]], s.m.l, true)); });
  ['Document AI', 'Extraction', 'LLM / RAG', 'Agents', 'Automatisation'].forEach((t, i) => { ST[i].e = etiquette(o, ST[i].g, [0, -0.03, 0.42], t, { bas: true }); });
  /* 1 · le document et le lecteur qui passe dessus */
  const doc = new T.Group(); ST[0].g.add(doc); doc.position.y = 0.02;
  solide(doc, new T.BoxGeometry(0.4, 0.012, 0.52), ST[0].m.l);
  const lignes = []; for (let i = 0; i < 7; i++) { const z = -0.19 + i * 0.058, w = i === 0 ? 0.2 : 0.3 - (i % 3) * 0.05; lignes.push([[-0.15, 0.008, z], [-0.15 + w, 0.008, z]]); }
  const lg = lignes.map(l => { const t = trait(l, ST[0].m.s); doc.add(t); return t; });
  const lu = lignes.map(l => { const t = trait(l, ST[0].m.a); t.visible = false; doc.add(t); return t; });
  const portique = new T.Group(); ST[0].g.add(portique);
  portique.add(trait([[0, 0, -0.34], [0, 0.32, -0.34], [0, 0.32, 0.34], [0, 0, 0.34]], ST[0].m.l));
  const rayon = trait([[0, 0.3, -0.3], [0, 0.03, -0.3], [0, 0.03, 0.3], [0, 0.3, 0.3]], ST[0].m.a); portique.add(rayon);
  /* 2 · les champs extraits : des blocs qui quittent les lignes du document et se rangent */
  const blocs = lignes.slice(1).map((l, i) => { const g = new T.Group(); P.add(g); solide(g, new T.BoxGeometry(0.075, 0.075, 0.075), ST[1].m.l); return { g, a: V(X[0] + l[0][0] + 0.08, 0.06, l[0][2]), b: V(X[1] + (i % 2 ? 0.07 : -0.07), 0.05 + Math.floor(i / 2) * 0.085, (i % 2) * 0 - 0.02 + Math.floor(i / 2) * 0.0) }; });
  blocs.forEach((b, i) => { b.b.set(X[1] + ((i % 3) - 1) * 0.1, 0.045 + Math.floor(i / 3) * 0.09, 0); });
  /* 3 · le modèle et ses sources : un espace de vecteurs ; la requête allume les plus proches */
  const esp = new T.Group(); esp.position.set(0, 0.62, 0); ST[2].g.add(esp);
  const NV = 140, vec = [], vp = new Float32Array(NV * 3); for (let i = 0; i < NV; i++) { const u = rnd() * TAU, c = rnd() * 2 - 1, r = 0.34 * Math.cbrt(rnd()), s = Math.sqrt(1 - c * c); vec.push(V(Math.cos(u) * s * r, c * r, Math.sin(u) * s * r)); vp.set([vec[i].x, vec[i].y, vec[i].z], i * 3); }
  const vg = new T.BufferGeometry(); vg.setAttribute('position', new T.BufferAttribute(vp, 3)); const vpts = new T.Points(vg, ST[2].m.p); vpts.renderOrder = 2; esp.add(vpts);
  const cible = V(0.12, 0.05, 0.08), proches = vec.map((v, i) => [v.distanceTo(cible), i]).sort((a, b) => a[0] - b[0]).slice(0, 6).map(a => vec[a[1]]);
  const pp = new T.BufferGeometry().setFromPoints(proches); const ppts = new T.Points(pp, ST[2].m.pa); ppts.renderOrder = 3; esp.add(ppts);
  const liensR = traits(proches.flatMap(p => [p.toArray(), cible.toArray()]), ST[2].m.a); esp.add(liensR);
  const llm = new T.Group(); llm.position.copy(cible); esp.add(llm); solide(llm, new T.OctahedronGeometry(0.06), ST[2].m.a, 1);
  const requete = trait([[0, -0.55, 0], [0.12, 0.05, 0.08]], ST[2].m.d); esp.add(requete);
  esp.add(trait([[0, -0.62, 0], [0, -0.36, 0]], ST[2].m.s));
  /* 4 · les agents : planifier, agir, vérifier ; trois tâches cochées l'une après l'autre */
  const ag = new T.Group(); ag.position.y = 0.3; ST[3].g.add(ag);
  ag.add(trait(cercleH(0.26, 64), ST[3].m.l, true));
  const noeuds = [0, 1, 2].map(i => { const g = new T.Group(); ag.add(g); solide(g, new T.OctahedronGeometry(0.05), ST[3].m.l, 1); return g; });
  const fleches = new T.Group(); ag.add(fleches); [0, 1, 2].forEach(i => { const a = i / 3 * TAU + 1; fleches.add(trait([[Math.cos(a - 0.12) * 0.22, 0, Math.sin(a - 0.12) * 0.22], [Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26], [Math.cos(a - 0.12) * 0.3, 0, Math.sin(a - 0.12) * 0.3]], ST[3].m.a)); });
  const taches = [0, 1, 2].map(i => { const g = new T.Group(); g.position.set((i - 1) * 0.16, -0.28, 0.2); ST[3].g.add(g); solide(g, new T.BoxGeometry(0.1, 0.02, 0.1), ST[3].m.l); const c = trait([[-0.03, 0.012, 0], [-0.005, 0.012, 0.025], [0.035, 0.012, -0.03]], ST[3].m.a); g.add(c); c.visible = false; return { g, c }; });
  ST[3].g.add(traits(taches.flatMap(t => [[0, 0.3 - 0.26, 0], [t.g.position.x, 0.02, 0.2]]), ST[3].m.d));
  /* 5 · l'automatisation : les rapports s'empilent, les signaux partent vers la sortie */
  const rapports = [0, 1, 2, 3, 4].map(i => { const g = new T.Group(); g.position.y = 0.012 + i * 0.045; ST[4].g.add(g); solide(g, new T.BoxGeometry(0.34, 0.012, 0.44), ST[4].m.l); g.add(trait([[-0.1, 0.008, -0.12], [0.1, 0.008, -0.12]], ST[4].m.s)); return g; });
  const sortie = segments(3, ST[4].m.a); ST[4].g.add(sortie.l); ST[4].g.add(trait([[0.3, 0.004, 0], [0.6, 0.004, 0]], ST[4].m.d));
  const jeton = new T.Group(); P.add(jeton); solide(jeton, new T.BoxGeometry(0.05, 0.05, 0.05), o.m.a);
  o.tick = (t, v) => {
    const pas = v.pas === undefined ? 5 : v.pas, S = Math.min(4, Math.floor(pas)), u = pas >= 5 ? 1 : pas - S;
    /* la planche glisse pour garder la station lue au centre ; après la dernière, elle recule et montre toute la chaîne */
    const fin = pas >= 5, cx = fin ? 0 : lerp(X[S], X[Math.min(4, S + 1)], fen(u, 0.75, 1));
    P.position.x = lerp(P.position.x, -cx, 0.1); const zm = lerp(P.scale.x, fin ? 0.62 : 1, 0.08); P.scale.setScalar(zm);
    ST.forEach((s, i) => { const on = pas >= i ? 1 : 0, d = Math.abs(X[i] + P.position.x) * zm, loin = 1 - sm((d - 0.75) / 0.55);
      s.f = lerp(s.f, on ? 1 : 0.28, 0.1); s.hot = lerp(s.hot, S === i && !fin ? 1 : 0, 0.12); chaud(s.m, s.hot); opac(s.m, o.op * s.f * loin); s.e.on = S === i && !fin; s.e.op = (0.45 + 0.55 * s.f) * loin; });
    const k = i => pas >= 5 ? 1 : c01(pas - i);   // l'avancement de l'étape i
    /* 1 */ const k0 = k(0); portique.position.x = lerp(-0.26, 0.26, sm(k0)); lu.forEach((l, i) => { l.visible = k0 > (0.2 + i * 0.1); lg[i].visible = !l.visible; }); rayon.visible = k0 > 0.02 && k0 < 0.98;
    /* 2 */ const k1 = k(1); blocs.forEach((b, i) => { const q2 = sm((k1 - i * 0.1) / 0.45); b.g.position.lerpVectors(b.a, b.b, q2); b.g.position.y += Math.sin(q2 * Math.PI) * 0.25; b.g.visible = k1 > 0.001; });
    /* 3 */ const k2 = k(2); requete.visible = k2 > 0.1; liensR.visible = ppts.visible = k2 > 0.45; llm.rotation.y = t * 1.5; llm.scale.setScalar(k2 > 0.6 ? 1 + 0.15 * Math.sin(t * 5) : 0.7); esp.rotation.y = t * 0.2;
    /* 4 */ const k3 = k(3); ag.rotation.y = -t * (0.4 + k3 * 1.2); noeuds.forEach((n, i) => { const a = i / 3 * TAU; n.position.set(Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26); }); taches.forEach((ta, i) => { ta.c.visible = k3 > 0.25 + i * 0.25; }); fleches.visible = k3 > 0.05;
    /* 5 */ const k4 = k(4); rapports.forEach((r, i) => { r.visible = k4 > i * 0.18; }); for (let i = 0; i < 3; i++) { const q2 = k4 > 0.2 ? (t * 0.8 + i / 3) % 1 : -1, x = 0.3 + q2 * 0.35; sortie.pos.set(q2 < 0 ? [0, -9, 0, 0, -9, 0] : [x, 0.006, 0, x + 0.08, 0.006, 0], i * 6); } sortie.a.needsUpdate = true;
    /* la piste allumée derrière le jeton */
    for (let i = 0; i < 4; i++) { const a = X[i] + 0.3, b = X[i + 1] - 0.3, q2 = c01((pas - i - 0.75) * 4), vu = fin || i >= S - 1; pisteOn.pos.set(vu ? [a, 0.006, 0, lerp(a, b, q2), 0.006, 0] : [0, -9, 0, 0, -9, 0], i * 6); } pisteOn.a.needsUpdate = true;
    const jx = pas >= 5 ? X[4] : lerp(X[S], X[Math.min(4, S + 1)], fen(u, 0.75, 1)); jeton.position.set(jx + (pas >= 5 ? 0.5 : 0), 0.05 + Math.abs(Math.sin(t * 3)) * 0.03, 0.34); jeton.rotation.y = t * 2;
  };
  o.rot = t => [0.62 + Math.sin(t * 0.2) * 0.03, -0.42 + Math.sin(t * 0.13) * 0.1];
}

/* ——— 02 La méthode : une salle de contrôle qui se construit une étape après l'autre ———
   0 les terminaux en éventail, chacun avec son agent · 1 l'agent principal délègue à des sous-agents · 2 les skills viennent s'emboîter
   3 le banc d'essai : les outils font la course, un seul reste · 4 une flotte d'agents construit le produit · 5 le portique de contrôle, un humain valide */
function atelier() {
  const o = objet('atelier', { s: 0.86, pl: { x: 0.29, y: 0.02, s: 1.02 }, plT: { y: 0.25, s: 1.12 } });
  const L = [0, 1, 2, 3, 4, 5].map(() => { const m = matieres(); MATS.push(m); return m; }), f = [0, 0, 0, 0, 0, 0];
  const pc = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }), R = new T.Group(); pc.g.add(R);
  /* le sol : des cercles gradués */
  const sol = new T.Group(); sol.position.y = -0.42; R.add(sol); [0.6, 1.2, 1.7].forEach(r => sol.add(trait(cercleH(r, 96), o.m.s, true)));
  { const g = []; for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, r0 = i % 3 ? 1.62 : 1.5; g.push([Math.cos(a) * r0, 0, Math.sin(a) * r0], [Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7]); } sol.add(traits(g, o.m.s)); }
  /* le poste, au centre */
  const poste = new T.Group(); poste.position.y = -0.42; R.add(poste); solide(poste, new T.BoxGeometry(0.42, 0.05, 0.26).translate(0, 0.2, 0.05), L[0].l);
  { const e = new T.Group(); e.position.set(0, 0.34, -0.06); poste.add(e); solide(e, new T.BoxGeometry(0.34, 0.22, 0.02), L[0].l); e.rotation.x = -0.12; }
  /* 0 · six terminaux en éventail derrière le poste, leurs lignes défilent */
  const NT = 6, TR = [], P0 = V(0, 0.78, 0);
  for (let i = 0; i < NT; i++) {
    const a = Math.PI * (1.12 + i * 0.152), g = new T.Group(); g.position.set(Math.cos(a) * 1.25, 0.06, Math.sin(a) * 1.25); g.lookAt(0, 0.06, 0); R.add(g);
    solide(g, new T.BoxGeometry(0.52, 0.34, 0.02), L[0].l); g.add(trait([[-0.24, 0.13, 0.012], [0.24, 0.13, 0.012]], L[0].s));
    [-0.22, -0.19, -0.16].forEach(x => g.add(trait(cercle(0.008, 8).map(p => [p[0] + x, p[1] + 0.15, 0.012]), L[0].s, true)));
    const lg = segments(6, L[0].l); g.add(lg.l);
    const ag = new T.Group(); ag.position.set(g.position.x * 0.9, 0.46, g.position.z * 0.9); R.add(ag); solide(ag, new T.OctahedronGeometry(0.05), L[0].a, 1);
    TR.push({ g, lg, ag, sous: [], ph: rnd() * 10 });
  }
  /* 1 · l'agent principal, ses liens vers les agents, les sous-agents qui naissent */
  const chef = new T.Group(); chef.position.copy(P0); R.add(chef); solide(chef, new T.OctahedronGeometry(0.1), L[1].a, 1); chef.add(trait(cercleH(0.16, 40), L[1].s, true));
  const liens = segments(NT, L[1].d); R.add(liens.l); const sousL = segments(NT * 3, L[1].l); R.add(sousL.l); const sousP = points(NT * 3, L[1].pa); R.add(sousP.p);
  const impul = points(NT, L[1].pa); R.add(impul.p);
  TR.forEach((tr, i) => { for (let k = 0; k < 3; k++) { const d = V(tr.ag.position.x, 0, tr.ag.position.z).normalize(), up = 0.18 + k * 0.1, lat = (k - 1) * 0.22; tr.sous.push(V(tr.ag.position.x + d.x * 0.25 - d.z * lat, 0.46 + up, tr.ag.position.z + d.z * 0.25 + d.x * lat)); } });
  /* 2 · les skills : des modules qui arrivent de loin et s'emboîtent autour de l'agent principal */
  const NS = 6, SK = [];
  for (let i = 0; i < NS; i++) { const g = new T.Group(); R.add(g); solide(g, new T.BoxGeometry(0.075, 0.075, 0.075), L[2].l); g.add(trait([[-0.02, 0.038, 0], [0.02, 0.038, 0]], L[2].a));
    const a = i / NS * TAU; SK.push({ g, dep: V((rnd() - 0.5) * 3.4, 1.4 + rnd() * 0.8, (rnd() - 0.5) * 2.4), a }); }
  const bague = trait(cercleH(0.24, 48), L[2].s, true); bague.position.copy(P0); R.add(bague);
  /* 3 · le banc d'essai : cinq outils font la course, un seul reste en tête */
  const banc = new T.Group(); banc.position.set(0.95, -0.42, 0.72); R.add(banc); solide(banc, new T.BoxGeometry(0.72, 0.03, 0.2).translate(0, 0.015, 0), L[3].l);
  const BB = [0, 1, 2, 3, 4].map(i => { const g = new T.Group(); g.position.set(-0.28 + i * 0.14, 0.03, 0); banc.add(g); solide(g, new T.BoxGeometry(0.08, 1, 0.08).translate(0, 0.5, 0), i === 2 ? L[3].a : L[3].l); g.scale.y = 0.05; return g; });
  const podium = trait([[-0.36, 0.78, 0], [0.36, 0.78, 0]], L[3].d); banc.add(podium);
  /* 4 · le produit qui monte au centre, nourri par une flotte d'agents (des points qui descendent des sous-agents) */
  const prod = new T.Group(); prod.position.set(0, -0.42, 0.62); R.add(prod); const ET = [];
  for (let k = 0; k < 5; k++) { const e = new T.Group(); e.position.y = k * 0.075; prod.add(e); solide(e, new T.BoxGeometry(0.34, 0.07, 0.26).translate(0, 0.035, 0), k === 4 ? L[4].a : L[4].l); ET.push(e); }
  const NE = 90, ess = points(NE, L[4].pa); R.add(ess.p); const EP = Array.from({ length: NE }, (_, i) => ({ s: i % (NT * 3), o: rnd(), v: 0.35 + rnd() * 0.3 }));
  /* 5 · le portique : tout ce qui entre dans le produit passe par un anneau de contrôle ; un humain valide */
  const port = new T.Group(); port.position.set(0, 0.12, 0.62); R.add(port); const anneau = trait(cercle(0.3, 64), L[5].a, true); port.add(anneau); port.add(trait(cercle(0.34, 64), L[5].s, true));
  const coche = trait([[-0.07, 0, 0.01], [-0.02, -0.05, 0.01], [0.08, 0.06, 0.01]], L[5].a); port.add(coche);
  const hum = new T.Group(); hum.position.set(0.5, -0.42, 0.9); R.add(hum); solide(hum, new T.CylinderGeometry(0.045, 0.065, 0.26, 12).translate(0, 0.13, 0), L[5].l, 30);
  { const tt = new T.Group(); tt.position.y = 0.32; hum.add(tt); boule(o, tt, 0.05, L[5].l); }
  /* la caméra : chaque étape a son point de vue et son cadrage */
  const VUE = [[0.32, -0.15, 1.0, [0, 0, -0.9]], [0.5, 0.35, 1.05, [0, 0.55, -0.4]], [0.3, 0.7, 1.35, [0, 0.78, 0]], [0.38, -0.75, 1.2, [0.95, -0.1, 0.72]], [0.55, 0.15, 1.0, [0, 0.1, 0.3]], [0.4, -0.35, 1.2, [0, -0.1, 0.62]], [0.5, -0.4, 0.92, [0, 0.1, 0]]];
  const cam = { rx: 0.4, ry: 0, z: 1, F: V(0, 0, 0) };
  o.tick = (t, v) => {
    const pas = v.pas === undefined ? 6 : v.pas, S = Math.min(6, Math.floor(pas)), k = i => c01(pas - i), dt = 0.06;
    for (let i = 0; i < 6; i++) { f[i] = lerp(f[i], pas < i ? 0 : S === i ? 1 : 0.5, 0.1); chaud(L[i], S === i ? 0.25 : 0); opac(L[i], o.op * f[i]); }
    const V1 = VUE[S], V2 = VUE[Math.min(6, S + 1)], u = sm(fen(pas - S, 0.75, 1));
    cam.rx = lerp(cam.rx, lerp(V1[0], V2[0], u), dt); cam.ry = lerp(cam.ry, lerp(V1[1], V2[1], u), dt); cam.z = lerp(cam.z, lerp(V1[2], V2[2], u), dt);
    cam.F.lerp(V(...V1[3]).lerp(V(...V2[3]), u), dt); R.scale.setScalar(cam.z); R.position.copy(cam.F).multiplyScalar(-cam.z * 0.55);
    /* 0 */ const k0 = pas >= 6 ? 1 : Math.max(k(0), pas > 0 ? 1 : 0);
    TR.forEach((tr, i) => { const on = c01(k(0) * 8 - i * 1.1) || (pas >= 1 ? 1 : 0); tr.g.scale.setScalar(Math.max(0.001, sm(on))); tr.ag.scale.setScalar(Math.max(0.001, sm(on)));
      tr.ag.rotation.y = t * 1.5 + i; for (let j = 0; j < 6; j++) { const w = 0.08 + 0.34 * Math.abs(Math.sin(tr.ph + j * 1.7 + Math.floor(t * 2.2 + i) * 0.9)), y = 0.07 - j * 0.045; tr.lg.pos.set([-0.22, y, 0.012, -0.22 + w, y, 0.012], j * 6); } tr.lg.a.needsUpdate = true; });
    /* 1 */ const k1 = k(1);
    TR.forEach((tr, i) => { const e = sm(k1 * 1.6 - i * 0.1), a = tr.ag.position; liens.pos.set([P0.x, P0.y, P0.z, lerp(P0.x, a.x, e), lerp(P0.y, a.y, e), lerp(P0.z, a.z, e)], i * 6);
      const q = (t * 0.7 + i / NT) % 1; impul.pos.set(e > 0.99 ? [lerp(P0.x, a.x, q), lerp(P0.y, a.y, q), lerp(P0.z, a.z, q)] : [0, -99, 0], i * 3);
      tr.sous.forEach((sp, j) => { const g2 = sm(k1 * 2.2 - 0.9 - j * 0.15), n = i * 3 + j; sousL.pos.set([a.x, a.y, a.z, lerp(a.x, sp.x, g2), lerp(a.y, sp.y, g2), lerp(a.z, sp.z, g2)], n * 6); sousP.pos.set(g2 > 0.05 ? [lerp(a.x, sp.x, g2), lerp(a.y, sp.y, g2) + Math.sin(t * 2 + n) * 0.01, lerp(a.z, sp.z, g2)] : [0, -99, 0], n * 3); }); });
    liens.a.needsUpdate = true; liens.l.computeLineDistances(); sousL.a.needsUpdate = true; sousP.a.needsUpdate = true; impul.a.needsUpdate = true; chef.rotation.y = t * 0.8;
    /* 2 */ const k2 = k(2);
    SK.forEach((sk, i) => { const e = sm(k2 * 1.8 - i * 0.14), a = sk.a + t * 0.5, fin = V(P0.x + Math.cos(a) * 0.24, P0.y, P0.z + Math.sin(a) * 0.24);
      sk.g.position.lerpVectors(sk.dep, fin, e); sk.g.position.y += Math.sin(e * Math.PI) * 0.3; sk.g.rotation.set((1 - e) * t * 2, a, 0); sk.g.visible = k2 > 0; });
    /* 3 */ const k3 = k(3), FIN = [0.28, 0.2, 0.74, 0.3, 0.16];
    BB.forEach((g, i) => { const course = 0.12 + 0.55 * Math.abs(Math.sin(t * (1.6 + i * 0.37) + i * 1.3)), h = pas < 3 ? 0.03 : lerp(course, FIN[i], sm((k3 - 0.55) / 0.45)); g.scale.y = lerp(g.scale.y, Math.max(0.03, h), 0.15); });
    podium.visible = k3 > 0.7;
    /* 4 */ const k4 = k(4), nE = Math.floor(NE * sm(k4 * 1.5));
    ET.forEach((e, i) => { const q = sm(k4 * 5.5 - i); e.visible = q > 0.02; e.scale.set(1, Math.max(0.02, q), 1); });
    EP.forEach((p, i) => { if (i >= nE) { ess.pos.set([0, -99, 0], i * 3); return; } const tr = TR[Math.floor(p.s / 3)], a = tr.sous[p.s % 3], b = prod.position, u2 = (t * p.v * 0.5 + p.o) % 1, m = 1 - u2;
      ess.pos.set([a.x * m * m + (a.x + b.x) * 0.5 * 2 * m * u2 + b.x * u2 * u2, a.y * m * m + 1.3 * 2 * m * u2 + (b.y + 0.4) * u2 * u2, a.z * m * m + (a.z + b.z) * 0.5 * 2 * m * u2 + b.z * u2 * u2], i * 3); });
    ess.a.needsUpdate = true;
    /* 5 */ const k5 = k(5); port.visible = k5 > 0.01; port.scale.setScalar(Math.max(0.01, sm(k5 * 2))); port.lookAt(R.worldToLocal(V(0, 0, 5000))); anneau.scale.setScalar(1 + Math.sin(t * 4) * 0.04 * k5);
    coche.visible = k5 > 0.5 && (t % 1.6) > 0.5; hum.visible = k5 > 0.2; hum.rotation.y = Math.sin(t * 0.8) * 0.4;
  };
  o.rot = t => [cam.rx, cam.ry + Math.sin(t * 0.15) * 0.06];
}

/* ——— 02 Impact : un nuage de points qui prend la forme de chaque chiffre ——— */
function impact() {
  const o = objet('impact', { s: 1.12 });
  const N = 2600, nu = nuage(N), pc = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }); pc.g.add(nu.p);
  const fant = new T.Group(); pc.g.add(fant);
  const F = [];   // les formes : (u) → remplit dst {p, a, h}
  const mk = () => ({ p: new Float32Array(N * 3), a: new Float32Array(N).fill(1), h: new Float32Array(N) });
  const R = Array.from({ length: N }, () => [rnd(), rnd(), rnd()]);
  /* 10+ ans : les cernes d'un tronc, un par année */
  { const f = mk(); for (let i = 0; i < N; i++) { const j = Math.floor(R[i][0] * 11), a = R[i][1] * TAU, r = 0.12 + j * 0.095 * (1 + 0.035 * Math.sin(a * 5 + j)); f.p.set([Math.cos(a) * r, (R[i][2] - 0.5) * 0.05, Math.sin(a) * r], i * 3); f.h[i] = j === 10 ? 1 : 0; } F.push(() => f); }
  /* 150 000+ : une sphère dense, des gens partout */
  { const f = mk(); for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), a = i * 2.39996; f.p.set([Math.cos(a) * r * 1.05, y * 1.05, Math.sin(a) * r * 1.05], i * 3); } F.push(() => f); }
  /* 99,99 % : un anneau complet ; un seul point clignote, le 0,01 % */
  { const f = mk(); for (let i = 0; i < N; i++) { const a = i / N * TAU, r = 1.0 + (R[i][0] - 0.5) * 0.08; f.p.set([Math.cos(a) * r, (R[i][1] - 0.5) * 0.08, Math.sin(a) * r], i * 3); } f.h[0] = 1; F.push(() => f); }
  /* −40 % : une barre (le temps de chargement) qui se tasse à 60 % de sa longueur */
  { const f = mk(), b = new Float32Array(N * 3); for (let i = 0; i < N; i++) b.set([R[i][0] * 2.6 - 1.3, (R[i][1] - 0.5) * 0.3, (R[i][2] - 0.5) * 0.3], i * 3);
    F.push(u => { const k = 1 - 0.4 * sm(u * 1.4); for (let i = 0; i < N; i++) { f.p[i * 3] = -1.3 + (b[i * 3] + 1.3) * k; f.p[i * 3 + 1] = b[i * 3 + 1]; f.p[i * 3 + 2] = b[i * 3 + 2]; } return f; }); }
  /* +35 % : une colonne (la productivité) qui gagne 35 % de hauteur, en couleur */
  { const f = mk(); F.push(u => { const k = sm(u * 1.4); for (let i = 0; i < N; i++) { const hi = i < N * 0.26, y = hi ? 0.2 + R[i][1] * 0.35 * k : -0.8 + R[i][1] * 1.0; f.p.set([(R[i][0] - 0.5) * 0.5, y, (R[i][2] - 0.5) * 0.5], i * 3); f.h[i] = hi ? 1 : 0; f.a[i] = hi ? Math.max(0.05, k) : 1; } return f; }); }
  /* 25 pays : vingt-cinq foyers, posés comme des graines (137,5°) */
  { const f = mk(), c = []; for (let j = 0; j < 25; j++) { const r = 0.24 * Math.sqrt(j + 0.5), a = j * 2.39996; c.push([Math.cos(a) * r, Math.sin(a) * r]); }
    for (let i = 0; i < N; i++) { const j = i % 25, u = R[i][0] * TAU, cz = R[i][1] * 2 - 1, r = 0.07 * Math.cbrt(R[i][2]), s = Math.sqrt(1 - cz * cz); f.p.set([c[j][0] + Math.cos(u) * s * r, cz * r, c[j][1] + Math.sin(u) * s * r], i * 3); f.h[i] = j === 0 ? 1 : 0; } F.push(() => f); }
  /* 85+ projets : quatre-vingt-cinq petits cubes */
  { const f = mk(); for (let i = 0; i < N; i++) { const j = i % 85, cx = (j % 10 - 4.5) * 0.22, cy = (Math.floor(j / 10) - 4) * 0.22, e = Math.floor(R[i][0] * 12), t = R[i][1] - 0.5, s = 0.07;
      const E = [[t, -.5, -.5], [t, .5, -.5], [t, -.5, .5], [t, .5, .5], [-.5, t, -.5], [.5, t, -.5], [-.5, t, .5], [.5, t, .5], [-.5, -.5, t], [.5, -.5, t], [-.5, .5, t], [.5, .5, t]][e];
      f.p.set([cx + E[0] * s * 2, cy + E[1] * s * 2, E[2] * s * 2], i * 3); f.h[i] = j === 84 ? 1 : 0; } F.push(() => f); }
  o.formes = F.length;
  /* les repères en pointillés : l'ancienne longueur (−40 %), le niveau d'avant (+35 %) */
  const g40 = trait([[-1.3, -0.17, 0], [1.3, -0.17, 0], [1.3, 0.17, 0], [-1.3, 0.17, 0]], o.m.d, true); fant.add(g40);
  const g35 = trait([[-0.4, 0.2, 0], [0.4, 0.2, 0]], o.m.d); fant.add(g35);
  const ROT = [[1.05, 0], [0.25, 0], [1.1, 0], [0.25, -0.35], [0.2, -0.5], [1.0, 0], [0.18, -0.25]];
  const cur = { rx: 0.9 };
  o.tick = (t, v) => {
    const pas = v.pas === undefined ? 0 : Math.min(F.length - 0.001, v.pas), s = Math.floor(pas), u = pas - s;
    const A = F[s](Math.min(1, u / 0.7)), B = F[Math.min(F.length - 1, s + 1)](0), m = s + 1 < F.length ? c01((u - 0.72) / 0.28) : 0;
    for (let i = 0; i < N; i++) {
      const d = R[i][2] * 0.45, k = sm((m - d) / 0.55), i3 = i * 3;
      nu.P[i3] = lerp(A.p[i3], B.p[i3], k); nu.P[i3 + 1] = lerp(A.p[i3 + 1], B.p[i3 + 1], k) + Math.sin(k * Math.PI) * (R[i][0] - 0.5) * 0.6; nu.P[i3 + 2] = lerp(A.p[i3 + 2], B.p[i3 + 2], k);
      nu.A[i] = lerp(A.a[i], B.a[i], k); nu.H[i] = lerp(A.h[i], B.h[i], k);
    }
    if (s === 2) nu.H[0] = (Math.sin(t * 6) > 0 ? 1 : 0.2) * (1 - m);
    nu.maj(); nu.m.uniforms.op.value = o.op; nu.m.uniforms.sz.value = 2.4 * PR;
    g40.visible = s === 3 && u > 0.1 && m < 0.5; g35.visible = s === 4 && m < 0.5;
    const rr = ROT[s], rn = ROT[Math.min(F.length - 1, s + 1)]; cur.rx = lerp(rr[0], rn[0], sm(m)); cur.ry = lerp(rr[1], rn[1], sm(m));
    const tourne = rr[1] === 0 && rn[1] === 0; pc.g.rotation.y = tourne ? t * 0.15 : cur.ry + Math.sin(t * 0.3) * 0.12;   // les formes rondes tournent sur elles-mêmes
  };
  o.rot = t => [cur.rx, 0];
}

/* ——— 03 Parcours : une piste de circuit, un composant par poste ; le défilement fait avancer le signal jusqu'à MARKO ——— */
function circuit(postes) {
  const o = objet('circuit', { s: 0.9, pl: { x: 0.27, y: -0.02, s: 1.1 }, plT: { y: 0.24, s: 1.35 } });
  const ES = 1.5, n = postes.length, pan = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }), P = new T.Group(); pan.g.add(P);
  const X = postes.map((_, i) => i * ES);
  /* la piste : une ligne qui serpente d'un composant à l'autre, avec des vias */
  const pts = []; X.forEach((x, i) => { pts.push([x, 0, 0]); if (i < n - 1) { const z = i % 2 ? 0.45 : -0.45; pts.push([x + 0.35, 0, 0], [x + 0.55, 0, z], [x + ES - 0.55, 0, z], [x + ES - 0.35, 0, 0]); } });
  const luL = trait(pts, o.m.a); P.add(luL); luL.geometry.setDrawRange(0, 0);
  const signal = new T.Group(); P.add(signal); boule(o, signal, 0.045, o.m.a);
  const K = postes.map((p, i) => { const m = matieres(); MATS.push(m); const g = new T.Group(); g.position.x = X[i]; P.add(g); const c = { m, g, f: 0.3, hot: 0, parts: [] };
    g.add(trait(cercleH(0.34, 48), m.s, true));
    COMPOSANT[p.c](c, m, o);
    c.e = etiquette(o, g, [0, 0, 0.44], p.an0 + '  ' + p.lieu, { bas: true });
    /* la piste vers le poste suivant et son via : elles s'effacent avec le composant */
    if (i < n - 1) { const z = i % 2 ? 0.45 : -0.45, gp = new T.Group(); gp.position.x = X[i]; P.add(gp); gp.add(trait([[0, 0, 0], [0.35, 0, 0], [0.55, 0, z], [ES - 0.55, 0, z], [ES - 0.35, 0, 0], [ES, 0, 0]], m.s)); gp.add(trait(cercleH(0.03, 10, 0.55, 0, z), m.s, true)); }
    return c; });
  o.tick = (t, v) => {
    const pas = v.pas === undefined ? 0 : v.pas, S = Math.min(n - 1, Math.floor(pas)), u = pas - S, x = lerp(X[S], X[Math.min(n - 1, S + 1)], fen(u, 0.7, 1));
    P.position.x = -x; signal.position.set(x, 0.05, 0);
    const ip = Math.min(pts.length, 1 + Math.round((x / ES) * 5)), d0 = Math.max(0, ip - 7); luL.geometry.setDrawRange(d0, ip - d0);   // seule la dernière longueur reste allumée
    K.forEach((c, i) => { const on = i === S ? 1 : 0, d = Math.abs(X[i] - x); c.hot = lerp(c.hot, on, 0.12); c.f = lerp(c.f, on ? 1 : i < S ? 0.45 : 0.22, 0.1); chaud(c.m, c.hot * 0.6);
      opac(c.m, o.op * c.f * (1 - sm((d - 0.9) / 1.0))); c.e.on = on === 1; c.e.op = c.f * (1 - sm((d - 0.6) / 0.7));
      c.g.position.y = on ? Math.sin(t * 1.5) * 0.02 : 0; c.g.scale.setScalar(0.85 + 0.25 * c.hot); if (c.tick) c.tick(t, c.hot); });
  };
  o.rot = t => [0.5, -0.32 + Math.sin(t * 0.2) * 0.1];
}
/* les composants : chacun dit ce que le poste a été */
const COMPOSANT = {
  gtb(c, m) {   /* Schneider : de l'équipement à la base, les maillons que je suivais */
    const s = []; for (let i = 0; i < 5; i++) { const b = new T.Group(); b.position.set(-0.24 + i * 0.12, 0.04, (i % 2 ? 0.06 : -0.06)); c.g.add(b); solide(b, new T.BoxGeometry(0.08, 0.08 + i * 0.02, 0.08).translate(0, 0.01 * i, 0), m.l); if (i) s.push([-0.24 + (i - 1) * 0.12, 0.05, (i % 2 ? -0.06 : 0.06)], [-0.24 + i * 0.12, 0.05, (i % 2 ? 0.06 : -0.06)]); }
    c.g.add(traits(s, m.d));
  },
  sites(c, m) {   /* Indexel : 100+ sites intégrés, un carré par site */
    const s = []; for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { const x = -0.22 + i * 0.049, z = -0.22 + j * 0.049; s.push(...boucleSegs([[x, 0.02, z], [x + 0.036, 0.02, z], [x + 0.036, 0.02, z + 0.036], [x, 0.02, z + 0.036]])); }
    c.g.add(traits(s, m.l));
  },
  equipe(c, m) {   /* 1min30 : l'équipe de cinq, et celui qui la mène */
    const pers = (x, z, h) => { const g = new T.Group(); g.position.set(x, 0, z); c.g.add(g); solide(g, new T.CylinderGeometry(0.035, 0.05, h, 12).translate(0, h / 2, 0), m.l, 30); const t = new T.Group(); t.position.y = h + 0.04; g.add(t); solide(t, new T.IcosahedronGeometry(0.035, 1), m.l, 25); };
    pers(0, 0, 0.2); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; pers(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.13); }
  },
  missions(c, m) {   /* Malt : 85+ missions, un bloc chacune */
    for (let i = 0; i < 85; i++) { const b = new T.Group(); b.position.set(((i % 9) - 4) * 0.055, 0.02 + Math.floor(i / 27) * 0.05, ((Math.floor(i / 9) % 3) - 1) * 0.055 + (Math.floor(i / 27) - 1) * 0.0); c.g.add(b); if (i % 3 === 0 || i === 84) solide(b, new T.BoxGeometry(0.04, 0.04, 0.04), i === 84 ? m.a : m.l); else b.add(aretes(new T.BoxGeometry(0.04, 0.04, 0.04), m.s)); }
  },
  entonnoir(c, m, o) {   /* AXA : le tunnel de conversion, +25 % */
    const g = new T.Group(); c.g.add(g); const pr = [[0.04, 0.02], [0.05, 0.12], [0.24, 0.34], [0.26, 0.36]].map(p => new T.Vector2(p[0], p[1]));
    solide(g, new T.LatheGeometry(pr, 24), m.l, 40); g.add(trait(cercleH(0.26, 48, 0, 0.36, 0), m.l, true));
    const gouttes = points(12, o.m.pa); g.add(gouttes.p); c.tick = t => { for (let i = 0; i < 12; i++) { const k = (t * 0.5 + i / 12) % 1, r = lerp(0.2, 0.03, k) * (i % 2 ? 1 : -1); gouttes.pos.set([Math.cos(i) * r, lerp(0.42, 0.0, k), Math.sin(i) * r], i * 3); } gouttes.a.needsUpdate = true; };
  },
  monde(c, m, o) {   /* Sodexo : 25 pays */
    const g = new T.Group(); g.position.y = 0.24; c.g.add(g); boule(o, g, 0.22, m.l);
    for (let k = 0; k < 3; k++) { const l = trait(cercle(0.22, 48), m.s, true); l.rotation.y = k / 3 * Math.PI; g.add(l); }
    const pins = []; for (let j = 0; j < 25; j++) { const y = 1 - 2 * (j + 0.5) / 25, r = Math.sqrt(1 - y * y), a = j * 2.39996; pins.push([Math.cos(a) * r * 0.225, y * 0.225, Math.sin(a) * r * 0.225]); }
    const pg = new T.BufferGeometry().setFromPoints(pins.map(p => V(...p))); const pp = new T.Points(pg, o.m.pa); pp.renderOrder = 2; g.add(pp);
    c.tick = t => { g.rotation.y = t * 0.5; };
  },
  tour(c, m) {   /* ENGIE : la plateforme (150 000+), son bouclier (OWASP), 99,99 % */
    const g = new T.Group(); c.g.add(g); solide(g, new T.BoxGeometry(0.18, 0.5, 0.18).translate(0, 0.25, 0), m.l); const f = [];
    for (let y = 0.07; y < 0.5; y += 0.07) f.push([-0.091, y, 0.091], [0.091, y, 0.091], [0.091, y, 0.091], [0.091, y, -0.091]); g.add(traits(f, m.s));
    const b = new T.Group(); b.position.set(0.24, 0.16, 0.08); c.g.add(b);
    const sh = [[0, 0.12], [0.09, 0.09], [0.08, -0.03], [0, -0.12], [-0.08, -0.03], [-0.09, 0.09]]; b.add(trait(sh.map(p => [p[0], p[1], 0]), m.l, true)); b.add(trait([[-0.04, 0, 0], [-0.01, -0.03, 0], [0.045, 0.035, 0]], m.l));
  },
  conteneurs(c, m) {   /* LWA : 15+ projets passés sous Docker ; et l'IA qui s'allume */
    for (let i = 0; i < 15; i++) { const b = new T.Group(); b.position.set(((i % 5) - 2) * 0.1, 0.03 + Math.floor(i / 5) * 0.065, 0); c.g.add(b); solide(b, new T.BoxGeometry(0.09, 0.055, 0.2), m.l); }
    const s = new T.Group(); s.position.set(0, 0.34, 0); c.g.add(s); solide(s, new T.OctahedronGeometry(0.06), m.a, 1); c.tick = t => { s.rotation.y = t * 1.3; };
  },
  puce(c, m) {   /* MARKO : la puce, le cœur IA allumé */
    solide(c.g, new T.BoxGeometry(0.46, 0.04, 0.46).translate(0, 0.02, 0), m.l); const d = new T.Group(); d.position.y = 0.04; c.g.add(d); solide(d, new T.BoxGeometry(0.24, 0.03, 0.24).translate(0, 0.015, 0), m.a);
    const cap = new T.Group(); c.g.add(cap); solide(cap, plaque(0.19, 0.19, 0.05, 0.03), m.l, 30); const s = [];
    for (let i = 0; i < 6; i++) { const u = -0.2 + i * 0.08; s.push([u, 0.001, 0.23], [u, 0.001, 0.36], [u, 0.001, -0.23], [u, 0.001, -0.36], [0.23, 0.001, u], [0.36, 0.001, u], [-0.23, 0.001, u], [-0.36, 0.001, u]); } c.g.add(traits(s, m.l));
    c.tick = (t, hot) => { cap.position.y = 0.07 + hot * (0.18 + Math.sin(t * 2) * 0.02); };
  }
};

/* ——— 05 Projets ——— */
function immeuble() {   // MARKO : des immeubles, et la couche IA qui flotte au-dessus
  const o = objet('immeuble', { s: 0.8 });
  const socle = piece(o, [0, -1.5, 0.3]); solide(socle.g, new T.BoxGeometry(2.4, 0.06, 1.5).translate(0, -0.95, 0), o.m.l);
  [[-0.62, 1.1, 0.5, 0.5, -0.1], [0.05, 1.7, 0.55, 0.55, 0.15], [0.72, 0.8, 0.5, 0.6, -0.2]].forEach((b, i) => {
    const p = piece(o, [(i - 1) * 2.4, 1.3, (i - 1) * 0.6]), g = new T.Group(); p.g.add(g); g.position.set(b[0], -0.92, b[4]);
    solide(g, new T.BoxGeometry(b[2], b[1], b[3]).translate(0, b[1] / 2, 0), o.m.l);
    const f = []; for (let y = 0.14; y < b[1] - 0.05; y += 0.14) { const x = b[2] / 2 + 0.002, z = b[3] / 2 + 0.002; f.push([-x, y, z], [x, y, z], [x, y, z], [x, y, -z]); }
    g.add(traits(f, o.m.s)); if (i === 1) g.add(trait([[0, b[1], 0], [0, b[1] + 0.25, 0]], o.m.l));
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
function fleur() {   // HUman : chaque graine à 137,5° de la précédente ; elles poussent avec le défilement
  const o = objet('fleur', { s: 0.95 });
  const N = 1100, nu = nuage(N), pc = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }); pc.g.add(nu.p);
  for (let i = 0; i < N; i++) { const r = 0.034 * Math.sqrt(i), a = i * 137.5 * Math.PI / 180; nu.P.set([Math.cos(a) * r, -r * r * 0.25, Math.sin(a) * r], i * 3); nu.H[i] = i < 21 ? 1 : 0; }
  const tige = piece(o, [0, -2, 0]); tige.g.add(trait([[0, -0.2, 0], [0.05, -0.8, 0.02], [0, -1.3, 0]], o.m.l));
  o.tick = (t, v) => { const k = 0.25 + 0.75 * sm(v.loc * 1.6); for (let i = 0; i < N; i++) nu.A[i] = i < N * k ? 1 : 0; nu.maj(); nu.m.uniforms.op.value = o.op; nu.m.uniforms.sz.value = 2.2 * PR; pc.g.rotation.y = t * 0.12; };
  o.rot = t => [0.75, 0];
}
function globe() {   // Digiplace : le globe, des liaisons entre les sites
  const o = objet('globe', { s: 0.98 });
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
  const pts = points(arcs.length, o.m.pa); liens.g.add(pts.p);
  SITES.forEach(s => { const g = new T.Group(); g.position.copy(s); liens.g.add(g); solide(g, new T.OctahedronGeometry(0.035), o.m.a, 1); });
  o.tick = t => { arcs.forEach((P, i) => { const u = ((t * 0.35 + i * 0.27) % 1), p = P[Math.floor(u * (P.length - 1))]; pts.pos.set([p.x, p.y, p.z], i * 3); }); pts.a.needsUpdate = true; };
  o.rot = t => [0.35, t * 0.18];
}
function chat() {   // ce portfolio : une tête de chat, au trait, comme ceux du mode chat
  const o = objet('chat', { s: 0.9 });
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
    f.add(trait(cercle(0.15, 48, 1.3).map(a => [a[0] + x, a[1] + 0.02, 0]), o.m.l, true));
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

function archive() {   // Archon : une pile de documents lus (OCR), leurs entités qui montent former un graphe
  const o = objet('archive', { s: 0.9 });
  const pile = piece(o, [-1.8, -0.6, 0.4]), F = [];
  for (let i = 0; i < 9; i++) { const g = new T.Group(); g.position.set(-0.75 + (i % 3 - 1) * 0.02, -0.7 + i * 0.07, (i % 2 ? 0.03 : -0.03)); g.rotation.y = (i % 4 - 1.5) * 0.06; pile.g.add(g);
    solide(g, new T.BoxGeometry(0.72, 0.03, 0.95), o.m.l); const l = []; for (let k = 0; k < 6; k++) { const z = -0.34 + k * 0.12, w = k === 0 ? 0.3 : 0.48 - (k % 3) * 0.08; l.push([-0.28, 0.017, z], [-0.28 + w, 0.017, z]); } if (i === 8) g.add(traits(l, o.m.s)); F.push(g); }
  const scan = new T.Group(); pile.g.add(scan); scan.add(trait([[-0.42, 0, 0], [0.42, 0, 0]], o.m.a));
  const gr = piece(o, [1.8, 1.2, 0.3]), N = [], E = [];
  const NP = [[0.55, 0.35, 0], [0.95, 0.75, 0.2], [1.1, 0.15, -0.25], [0.7, 0.95, -0.3], [1.35, 0.55, 0.1], [0.4, 0.8, 0.3], [1.0, 1.2, 0.05]];
  NP.forEach((p, i) => { const g = new T.Group(); g.position.set(...p); gr.g.add(g); solide(g, new T.OctahedronGeometry(i === 0 ? 0.08 : 0.055), i === 0 ? o.m.a : o.m.l, 1); N.push(g); });
  [[0, 1], [0, 2], [1, 3], [1, 4], [0, 5], [3, 6], [1, 6], [2, 4], [5, 3]].forEach(([a, b]) => E.push(NP[a], NP[b])); const lien = traits(E, o.m.d); gr.g.add(lien);
  const vol = points(6, o.m.pa); o.g.add(vol.p);
  o.tick = (t, v) => {
    const k = sm(v.loc * 1.8);
    scan.position.set(-0.75, -0.7 + 8 * 0.07 + 0.03, lerp(-0.45, 0.45, (Math.sin(t * 1.4) + 1) / 2));
    F.forEach((g, i) => { g.position.x = -0.75 + (i % 3 - 1) * 0.02 + Math.sin(t * 0.8 + i) * 0.004; });
    N.forEach((g, i) => { g.scale.setScalar(c01(k * 9 - i)); g.rotation.y = t * 0.8 + i; });
    for (let i = 0; i < 6; i++) { const u = (t * 0.45 + i / 6) % 1, dst = NP[1 + (i % 6)], src = [-0.75, -0.1, 0]; vol.pos.set([lerp(src[0], dst[0], u), lerp(src[1], dst[1], u) + Math.sin(u * Math.PI) * 0.35, lerp(src[2], dst[2], u)], i * 3); }
    vol.a.needsUpdate = true;
  };
  o.rot = t => [0.32, -0.45 + Math.sin(t * 0.2) * 0.2];
}
function bougies() {   // NumerusX : des chandeliers, des agents qui les lisent, une stratégie qui évolue
  const o = objet('bougies', { s: 0.92 });
  const socle = piece(o, [0, -1.6, 0.3]); socle.g.add(trait([[-1.3, -0.62, -0.35], [1.3, -0.62, -0.35], [1.3, -0.62, 0.35], [-1.3, -0.62, 0.35]], o.m.s, true));
  { const s = []; for (let i = 0; i <= 6; i++) { const y = -0.6 + i * 0.2; s.push([-1.3, y, -0.35], [1.3, y, -0.35]); } socle.g.add(traits(s, o.m.s)); }
  const B = [], n = 16; let prix = -0.2; const courbe = [];
  for (let i = 0; i < n; i++) {
    const ouv = prix, clo = prix + Math.sin(i * 1.7) * 0.16 + (i > 8 ? 0.06 : -0.02), hi = Math.max(ouv, clo) + 0.06 + (i % 3) * 0.03, lo = Math.min(ouv, clo) - 0.05 - (i % 2) * 0.04; prix = clo;
    const x = -1.2 + i * 0.16, p = piece(o, [(i - n / 2) * 0.25, (i % 2 ? 1 : -1) * 1.2, 0.8]), g = new T.Group(); g.position.x = x; p.g.add(g);
    const h = Math.max(0.025, Math.abs(clo - ouv)), m = clo >= ouv ? o.m.a : o.m.l;
    solide(g, new T.BoxGeometry(0.07, h, 0.07).translate(0, (ouv + clo) / 2, 0), m); g.add(trait([[0, lo, 0], [0, Math.min(ouv, clo), 0]], o.m.l)); g.add(trait([[0, Math.max(ouv, clo), 0], [0, hi, 0]], o.m.l));
    B.push(g); courbe.push([x, (ouv + clo) / 2 + 0.28, 0.2]);
  }
  const strat = piece(o, [0, 1.8, 0.5]); const cl = trait(courbe, o.m.d); strat.g.add(cl);
  const ag = piece(o, [0, 2.2, -0.5]), A = []; for (let i = 0; i < 3; i++) { const g = new T.Group(); ag.g.add(g); solide(g, new T.OctahedronGeometry(0.07), i === 0 ? o.m.a : o.m.l, 1); g.add(trait(cercleH(0.13, 24), o.m.s, true)); A.push(g); }
  o.tick = (t, v) => {
    const k = 0.25 + 0.75 * sm(v.loc * 1.7), vis = Math.ceil(k * n);
    B.forEach((g, i) => { g.visible = i < vis; g.scale.y = i === vis - 1 ? 0.6 + 0.4 * ((t * 1.5) % 1) : 1; });
    cl.geometry.setDrawRange(0, vis);
    A.forEach((g, i) => { const a = t * 0.5 + i * TAU / 3, x = Math.cos(a) * 0.9; g.position.set(x, 0.75 + Math.sin(t * 1.2 + i) * 0.05, Math.sin(a) * 0.35); g.rotation.y = t; });
  };
  o.rot = t => [0.22, -0.35 + Math.sin(t * 0.25) * 0.15];
}
function reseau() {   // NumOSINT : huit outils en conteneurs autour d'un orchestrateur qui recoupe leurs résultats
  const o = objet('reseau', { s: 0.95 });
  const coeur = piece(o, [0, 0, 2.2]); boule(o, coeur.g, 0.2, o.m.a); coeur.g.add(trait(cercleH(0.34, 48), o.m.s, true));
  const S = [], segs = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, x = Math.cos(a) * 1.05, z = Math.sin(a) * 1.05, y = (i % 2 ? 0.18 : -0.18), p = piece(o, [x * 1.8, y * 4, z * 1.8]), g = new T.Group(); g.position.set(x, y, z); p.g.add(g);
    solide(g, new T.BoxGeometry(0.2, 0.14, 0.14), o.m.l); g.add(trait([[-0.06, 0.071, -0.03], [0.06, 0.071, -0.03]], o.m.s)); S.push(g); segs.push([0, 0, 0], [x, y, z]);
  }
  const fils = piece(o, [0, -2, 0]); fils.g.add(traits(segs, o.m.d));
  const pts = [], ext = []; for (let i = 0; i < 90; i++) { const u = rnd() * TAU, r = 1.45 + rnd() * 0.35; ext.push([Math.cos(u) * r, (rnd() - 0.5) * 0.7, Math.sin(u) * r]); }
  const nu = points(90, o.m.p); ext.forEach((p, i) => nu.pos.set(p, i * 3)); nu.a.needsUpdate = true; const cl = piece(o, [0, 0, -2.5]); cl.g.add(nu.p);
  const imp = points(16, o.m.pa); o.g.add(imp.p);
  o.tick = (t, v) => {
    for (let i = 0; i < 16; i++) { const s = S[i % 8].position, u = (t * 0.6 + i * 0.37) % 1, k = i < 8 ? u : 1 - u; imp.pos.set([s.x * (1 - k), s.y * (1 - k), s.z * (1 - k)], i * 3); }   // les requêtes partent, les résultats reviennent
    imp.a.needsUpdate = true;
    S.forEach((g, i) => { g.rotation.y = -Math.atan2(g.position.z, g.position.x); g.position.y = (i % 2 ? 0.18 : -0.18) + Math.sin(t * 1.3 + i) * 0.02; });
    coeur.g.scale.setScalar(1 + Math.sin(t * 3) * 0.03);
  };
  o.rot = t => [0.45, t * 0.12];
}
function caviarde() {   // SafeShare : la page, les données sensibles repérées puis masquées ; tout reste dans le navigateur
  const o = objet('caviarde', { s: 0.95 });
  const nav = piece(o, [0, 0, -2]); { const w = 0.95, h = 1.25; nav.g.add(trait([[-w, -h, -0.05], [w, -h, -0.05], [w, h, -0.05], [-w, h, -0.05]], o.m.s, true)); nav.g.add(trait([[-w, h - 0.14, -0.05], [w, h - 0.14, -0.05]], o.m.s));
    [0, 1, 2].forEach(i => nav.g.add(trait(cercle(0.025, 12).map(p => [p[0] - w + 0.1 + i * 0.08, p[1] + h - 0.07, -0.05]), o.m.s, true))); }
  const page = piece(o, [0, 0, 1.5]); solide(page.g, new T.BoxGeometry(1.3, 1.7, 0.02).translate(0, -0.1, 0), o.m.l);
  const L = [], M = [], sens = [1, 4, 6, 9];
  for (let i = 0; i < 11; i++) { const y = 0.6 - i * 0.13, w = i === 0 ? 0.6 : 1.0 - (i % 4) * 0.12; L.push([-0.52, y, 0.012], [-0.52 + w, y, 0.012]);
    if (sens.includes(i)) { const x0 = -0.52 + w * 0.35, x1 = -0.52 + w * 0.8, p = piece(o, [(i % 2 ? 1.6 : -1.6), 0.4, 1.2]), g = new T.Group(); g.position.set((x0 + x1) / 2, y, 0.02); p.g.add(g);
      const mk = new T.Mesh(new T.PlaneGeometry(x1 - x0, 0.085), new T.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9, depthWrite: false })); mk.renderOrder = 2; g.add(mk);
      const cad = trait([[-(x1 - x0) / 2 - 0.02, -0.06, 0.004], [(x1 - x0) / 2 + 0.02, -0.06, 0.004], [(x1 - x0) / 2 + 0.02, 0.06, 0.004], [-(x1 - x0) / 2 - 0.02, 0.06, 0.004]], o.m.d, true); g.add(cad); M.push({ g, mk, cad, w: x1 - x0 }); } }
  page.g.add(traits(L, o.m.s));
  const scan = trait([[-0.66, 0, 0.03], [0.66, 0, 0.03]], o.m.a); page.g.add(scan);
  const cad = piece(o, [1.8, -1, 0.5]), c = new T.Group(); c.position.set(0.85, -0.85, 0.1); cad.g.add(c); solide(c, new T.BoxGeometry(0.2, 0.16, 0.06), o.m.l);
  c.add(trait(cercle(0.065, 24).filter(p => p[1] >= 0).map(p => [p[0], p[1] + 0.08, 0]), o.m.l));
  o.tick = (t, v) => {
    const k = sm(v.loc * 1.6), yS = lerp(0.72, -0.8, (t * 0.35) % 1); scan.position.y = yS;
    M.forEach((m, i) => { const on = c01(k * 5 - i); m.mk.scale.x = Math.max(0.001, on); m.mk.position.x = -m.w / 2 * (1 - on); m.mk.material.opacity = 0.85 * o.op; m.cad.visible = on < 1; });
  };
  o.rot = t => [0.18 + Math.sin(t * 0.3) * 0.05, -0.4 + Math.sin(t * 0.22) * 0.2];
}

function radar() {   // ScanRift : le balayage passe sur la cible, les résultats s'allument, chacun est noté ; un humain valide
  const o = objet('radar', { s: 0.95 });
  const sol = piece(o, [0, -1.8, 0]); [0.45, 0.8, 1.15].forEach(r => sol.g.add(trait(cercleH(r, 96), o.m.s, true)));
  { const s2 = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; s2.push([Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2], [Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15]); } sol.g.add(traits(s2, o.m.s)); }
  const cible = piece(o, [0, 1.6, 1.2]), c = new T.Group(); cible.g.add(c); solide(c, new T.BoxGeometry(0.3, 0.42, 0.3).translate(0, 0.21, 0), o.m.l);
  { const f = []; for (let y = 0.1; y < 0.4; y += 0.1) f.push([-0.151, y, 0.151], [0.151, y, 0.151], [0.151, y, 0.151], [0.151, y, -0.151]); c.add(traits(f, o.m.s)); }
  const bal = piece(o, [0, 0.4, -1.5], [0, 0, 0]), faisceau = new T.Group(); bal.g.add(faisceau);
  faisceau.add(trait([[0, 0.005, 0], [1.15, 0.005, 0]], o.m.a));
  { const e = []; for (let k = 1; k <= 8; k++) { const a = -k * 0.045; e.push([Math.cos(a) * 1.15, 0.005, Math.sin(a) * 1.15]); } faisceau.add(trait([[0, 0.005, 0], ...e, [0, 0.005, 0]], o.m.d)); }
  /* les résultats : des points sur le disque ; le faisceau les allume, ils montent se ranger en barres de gravité */
  const N = 14, P = [], res = points(N, o.m.pa); bal.g.add(res.p);
  for (let i = 0; i < N; i++) { const a = rnd() * TAU, r = 0.35 + rnd() * 0.75; P.push({ a, r, g: i % 5 }); }
  const barres = piece(o, [2, 0.5, 0]), B = [];
  for (let k = 0; k < 5; k++) { const g = new T.Group(); g.position.set(1.2, 0, -0.4 + k * 0.2); g.scale.y = 0.03; barres.g.add(g); solide(g, new T.BoxGeometry(0.09, 1, 0.09).translate(0, 0.5, 0), k < 2 ? o.m.a : o.m.l); B.push(g); }
  const coche = piece(o, [0, 2.2, 0]), ck = new T.Group(); ck.position.set(0, 0.95, 0); coche.g.add(ck);
  ck.add(trait(cercle(0.16, 40), o.m.l, true)); ck.add(trait([[-0.07, 0, 0], [-0.02, -0.05, 0], [0.08, 0.06, 0]], o.m.a));
  o.tick = (t, v) => {
    const ang = -t * 1.1, k = sm(v.loc * 1.6); faisceau.rotation.y = ang;
    const h = [0, 0, 0, 0, 0];
    P.forEach((p, i) => { const d = ((p.a - ang) % TAU + TAU) % TAU, vu = d < 2.2 && i < N * (0.3 + 0.7 * k); res.pos.set(vu ? [Math.cos(p.a) * p.r, 0.02, -Math.sin(p.a) * p.r] : [0, -9, 0], i * 3); if (i < N * (0.3 + 0.7 * k)) h[p.g]++; });
    res.a.needsUpdate = true;
    const hm = Math.max(1, ...h); B.forEach((g, i) => { g.scale.y = lerp(g.scale.y, 0.03 + 0.34 * h[i] / hm * k, 0.08); });
    ck.visible = k > 0.8 && Math.sin(t * 1.5) > -0.2;
  };
  o.rot = t => [0.5, -0.5 + Math.sin(t * 0.2) * 0.15];
}

/* ——— la profondeur : une poussière de points à plusieurs distances ; au défilement, les proches filent, les lointains traînent ——— */
let pous = null;
function poussiere() {
  const N = 420, g = new T.BufferGeometry(), P = new Float32Array(N * 3), A = new Float32Array(N), Hh = new Float32Array(N), D = [];
  for (let i = 0; i < N; i++) { const z = Math.pow(rnd(), 1.8); D.push({ x: rnd(), y: rnd(), z }); A[i] = 0.12 + 0.5 * z; Hh[i] = rnd() < 0.06 ? 1 : 0; }
  g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('a', new T.BufferAttribute(A, 1)); g.setAttribute('h', new T.BufferAttribute(Hh, 1));
  const m = nuageMat(), p = new T.Points(g, m); p.frustumCulled = false; p.renderOrder = -1; scene.add(p);
  pous = { p, m, P, D, g, N };
}
function bougePoussiere(t, vue) {
  if (!pous) return; const { P, D, N } = pous, sc = vue.sc || 0;
  for (let i = 0; i < N; i++) { const d = D[i], v = 0.08 + 0.9 * d.z, y = ((d.y * H * 1.2 - sc * v * 0.5 + t * 4 * v) % (H * 1.2) + H * 1.2) % (H * 1.2);
    P[i * 3] = (d.x - 0.5) * W * 1.1 + (vue.mx || 0) * 60 * v; P[i * 3 + 1] = H * 0.6 - y - (vue.my || 0) * 40 * v; P[i * 3 + 2] = -900; }
  pous.g.attributes.position.needsUpdate = true; pous.m.uniforms.sz.value = 2.2 * PR; pous.m.uniforms.op.value = 0.55;
}

/* ——— la mise en place ——— */
function init(toile, d) {
  if (ok) return true;
  try { R = new T.WebGLRenderer({ canvas: toile, alpha: true, antialias: (window.devicePixelRatio || 1) < 2.5 }); } catch (e) { return false; }
  R.setClearColor(0x000000, 0); scene = new T.Scene(); cam = new T.OrthographicCamera(-1, 1, 1, -1, -5000, 5000); cam.position.z = 1000;
  /* la puce, quatre fois : l'accueil (en éclaté léger, annotée), les compétences (une couche par étape), le contact (refermée, les signaux partent) */
  puce('accueil', { s: 0.95, pl: { x: 0.235, y: 0.05, s: 0.74 }, rot: t => [0.62, -0.62 + Math.sin(t * 0.18) * 0.35],
    ex: (t, v) => 0.85 + Math.sin(t * 0.7) * 0.06 - 0.4 * sm(v.loc * 2), etiqToutes: true, impulsions: () => 8,
    etiq: [['front', 'Front · Vue, Nuxt, React'], ['ia', 'Cœur · IA générative, RAG, agents'], ['devops', 'Socle · Docker, CI/CD, cloud']] });
  puce('couches', { s: 0.9, pl: { x: 0.25, y: 0.02, s: 0.82 }, rot: t => [0.55, -0.7 + Math.sin(t * 0.16) * 0.12],
    ex: (t, v) => 0.6 + 0.4 * sm((v.pas || 0) * 0.8), hl: (t, v) => v.pas === undefined || v.pas >= 6 ? -1 : [4, 5, 2, 0, 3, 1][Math.floor(v.pas)], impulsions: (t, v) => Math.floor(v.pas || 0) === 5 ? 24 : 0,
    etiq: d.competences.map(c => [c.couche, c.court]) });
  puce('contact', { s: 0.85, rot: t => [0.5, t * 0.15], ex: (t, v) => 0.5 * (1 - sm(v.loc * 1.5)), impulsions: () => 24 });
  poussiere(); chaine(); atelier(); impact(); circuit(d.parcours.slice().reverse()); immeuble(); fleur(); globe(); chat(); archive(); bougies(); reseau(); caviarde(); radar();
  ok = true; resize(); return true;
}
function resize() {
  if (!ok) return;
  const c = R.domElement; W = c.clientWidth || innerWidth; H = c.clientHeight || innerHeight;
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); R.setSize(W, H, false); PR = R.getPixelRatio();
  Object.assign(cam, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); cam.updateProjectionMatrix();
  for (const m of MATS) { m.p.size = 2.5 * PR; m.pa.size = 5 * PR; }
}
/* où poser l'objet : à droite du texte sur écran large, en haut derrière le texte sur écran étroit */
function place(o, vue) {
  if (vue.large) { const p = o.pl || {}, s = Math.min(W * 0.17, H * 0.3) * o.s * (p.s || 1); return { x: W * (p.x ?? 0.235), y: -H * (p.y ?? 0.02), s }; }
  const p = o.plT || {}, s = Math.min(W * 0.3, H * 0.15) * o.s * (p.s || 1); return { x: W * (p.x ?? 0), y: H * (p.y ?? 0.25), s };
}
function rendu(poids, t, vue) {
  if (!ok) return;
  bougePoussiere(t, vue);
  for (const k in OBJ) {
    const o = OBJ[k], p = poids[k] || { w: 0, loc: 0 };
    o.w = p.w; const e = 1 - p.w; o.e = e;
    if (p.w < 0.004) { o.g.visible = false; continue; }
    o.g.visible = true;
    const pl = place(o, vue), r = o.rot ? o.rot(t) : [0.35, t * 0.1];
    o.g.position.set(pl.x + (vue.mx || 0) * 8, pl.y - (vue.my || 0) * 6, 0); o.g.scale.setScalar(pl.s * (0.9 + 0.1 * p.w));
    o.g.rotation.set(r[0] + (vue.my || 0) * 0.08 + (vue.prx || 0), r[1] + (vue.mx || 0) * 0.14 + (vue.pry || 0), 0, 'YXZ');
    o.op = 1 - sm((e - 0.5) / 0.5); opac(o.m, o.op);
    if (o.tick) o.tick(t, p);
    const k2 = Math.pow(e, 1.4) * 3.2;
    for (const part of o.parts) {
      if (part.fond) { part.g.visible = e < 0.45; part.g.position.copy(part.base); continue; }
      part.g.visible = true; part.g.position.copy(part.base).addScaledVector(part.dir, k2);
      part.g.rotation.set(part.spin.x * k2 * 0.6, part.spin.y * k2 * 0.6, part.spin.z * k2 * 0.6);
    }
    o.g.updateMatrixWorld(true);
    for (const b of o.bb) { b.parent.getWorldQuaternion(q); b.quaternion.copy(q.invert()); b.updateMatrixWorld(true); }
  }
  R.render(scene, cam);
}
function pres(x, y) {
  for (const k in OBJ) { const o = OBJ[k]; if (!o.g.visible || o.w < 0.6) continue; const sx = W / 2 + o.g.position.x, sy = H / 2 - o.g.position.y; if (Math.hypot(x - sx, y - sy) < o.g.scale.x * 1.6) return true; }
  return false;
}
function ancre(nom, i) {
  const o = OBJ[nom]; if (!o || !o.g.visible || !o.etq[i]) return null;
  const e = o.etq[i]; e.a.getWorldPosition(vv);
  return { x: W / 2 + vv.x, y: H / 2 - vv.y, op: o.op * e.op, on: e.on, bas: !!e.bas };
}
return { get ok() { return ok; }, init, resize, rendu, pres, ancre, etiquettes: () => ETQ, OBJ };
})();
