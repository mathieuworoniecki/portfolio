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
let R = null, scene, cam, W = 1, H = 1, PR = 1, ok = false, DIST = 1000;
/* une vraie perspective (Mathieu, 29/09 : « à chaque élément on rentre dans un univers ») : à z = 0, un pixel CSS vaut une unité, comme avant ;
   ce qui avance grossit, ce qui recule rapetisse, et les objets arrivent du fond. */
const FOV = 32;
/* le trait : un pixel de WebGL, c'est trop fin (Mathieu, 28/09 : « épaissis le trait, prends le même que pour les chats »).
   On dessine la scène dans une image, puis on la repasse en l'élargissant (chaque pixel prend le plus fort de ses voisins, sur un petit disque) :
   un trait de stylo, bouts ronds. Deux graisses, comme sur un vrai plan : le trait principal est épais, les traits pâles (quadrillages, fenêtres, orbites) restent fins. */
let IMG = null, passe = null, ecran = null, camE = null;
const EPAIS = +(new URLSearchParams(location.search).get('epais') || 1.15);   // (?epais=1.4 pour comparer) le rayon ajouté de chaque côté du trait, en pixels CSS (Mathieu, 29/09 : 1,9 était trop épais, « ça rend pas bien »)
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

/* se mettre en forme : les pièces d'un groupe tombent à leur place l'une après l'autre (b : 0 → rien, 1 → construit) */
function pieces(g, sauf) { return g.children.filter(ch => !(sauf || []).includes(ch)).map(ch => { ch.userData.y0 = ch.position.y; return ch; }); }
function construit(L, b, h) { const n = L.length; L.forEach((ch, k) => { const e = sm(b * (1 + n * 0.07) - k * 0.07); ch.position.y = ch.userData.y0 + (1 - e) * (1 - e) * h;
  if (e <= 0.01) { if (ch.visible) { ch.visible = false; ch.userData.cache = true; } } else if (ch.userData.cache) { ch.visible = true; ch.userData.cache = false; } }); }   // on ne rallume que ce qu'on a éteint

/* le sol de chaque univers : un quadrillage qui s'éteint en s'éloignant de l'objet, pour qu'il ne flotte pas dans le vide */
function sol(o, y, r, pas, parent) {
  const s = [], n = Math.round(r / (pas || 0.25)), e = r / n;
  for (let i = -n; i <= n; i++) s.push([i * e, y, -r], [i * e, y, r], [-r, y, i * e], [r, y, i * e]);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(s.flat(), 3));
  const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { c: { value: ENCRE }, op: { value: 0 }, r: { value: r }, cx: { value: 0 } },
    vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 c; uniform float op; uniform float r; uniform float cx; varying vec3 p; void main(){ float d = length(vec2(p.x - cx, p.z)) / r; gl_FragColor = vec4(c, op * 0.16 * pow(1.0 - smoothstep(0.0, 1.0, d), 1.5)); }' });
  const l = new T.LineSegments(g, m); l.renderOrder = 0; l.frustumCulled = false; (parent || o.g).add(l); o.sols = (o.sols || []).concat(m); return m;
}

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

/* ——— l'accueil : l'orchestre. Au centre le cœur IA ; autour, dix agents en orbite ; en dessous, le produit qu'ils bâtissent module par module.
   Puis le cœur descend dans le produit : l'IA y est intégrée. Les deux cartes de l'accueil le pilotent (survol : « j'intègre » / « je travaille avec »). ——— */
function orchestre(d) {
  const o = objet('accueil', { s: 0.95, pl: { x: 0.25, y: 0.03, s: 0.7 }, plT: { y: 0.26, s: 0.85 } });
  const CY = 0.85, SY = -1.2;
  sol(o, SY, 2.3, 0.3);
  /* le cœur : un icosaèdre, un octaèdre qui tourne à l'envers dedans */
  const pc = piece(o, [0, 2.2, 0.4]), coeur = new T.Group(); coeur.position.y = CY; pc.g.add(coeur);
  const ico = new T.Group(); coeur.add(ico); solide(ico, new T.IcosahedronGeometry(0.36, 0), o.m.l, 1);
  const noyau = new T.Group(); coeur.add(noyau); solide(noyau, new T.OctahedronGeometry(0.14), o.m.a, 1);
  /* les orbites : trois anneaux inclinés, dix agents */
  const ORB = [[0.95, 0.25, 0.2], [1.25, 0.6, -0.35], [1.55, -0.12, 0.45]].map(([r, rx, rz], j) => {
    const g = new T.Group(); g.position.y = CY; g.rotation.set(Math.PI / 2 + rx, 0, rz); const p = piece(o, [(j - 1) * 2, 1.4, -1]); p.g.add(g);
    const l = trait(cercle(r, 160), o.m.s, true); g.add(l); return { g, r, l };
  });
  const FORMES = [() => new T.TetrahedronGeometry(0.085), () => new T.OctahedronGeometry(0.075), () => new T.BoxGeometry(0.1, 0.1, 0.1)];
  const AG = []; for (let i = 0; i < 10; i++) { const j = i % 3, g = new T.Group(); o.g.add(g); solide(g, FORMES[j](), o.m.l, 1); AG.push({ g, j, ph: i / 10 * TAU + j * 0.7, v: [0.42, -0.33, 0.26][j] }); }
  const surOrbite = (a, t, out) => { const R0 = ORB[a.j]; vv.set(Math.cos(a.ph + t * a.v) * R0.r, Math.sin(a.ph + t * a.v) * R0.r, 0); vv.applyEuler(R0.g.rotation); return out.set(vv.x, vv.y + CY, vv.z); };
  /* le produit : douze modules, une architecture en gradins */
  const SLOTS = []; const HM = [[0.3, 0.55, 0.42, 0.25], [0.5, 0.9, 0.7, 0.38], [0.28, 0.62, 0.48, 0.3]];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) SLOTS.push({ x: (c - 1.5) * 0.4, z: (r - 1) * 0.4, h: HM[r][c] * 1.15 });
  const ordre = [5, 6, 1, 2, 9, 10, 4, 7, 0, 3, 8, 11];
  const MOD = SLOTS.map((s, k) => { const g = new T.Group(); o.g.add(g); solide(g, new T.BoxGeometry(0.32, s.h, 0.32).translate(0, s.h / 2, 0), o.m.l);
    const f = []; for (let y = 0.14; y < s.h - 0.05; y += 0.14) f.push([-0.161, y, 0.161], [0.161, y, 0.161], [0.161, y, 0.161], [0.161, y, -0.161]); if (f.length) g.add(traits(f, o.m.s));
    const toit = trait([[-0.16, s.h + 0.004, -0.16], [0.16, s.h + 0.004, -0.16], [0.16, s.h + 0.004, 0.16], [-0.16, s.h + 0.004, 0.16]], o.m.a, true); g.add(toit);
    return { g, s, toit, n: ordre.indexOf(k) }; });
  const scan = trait([[-0.85, 0, -0.65], [0.85, 0, -0.65], [0.85, 0, 0.65], [-0.85, 0, 0.65]], o.m.d, true); o.g.add(scan);
  const flux = points(24, o.m.p); o.g.add(flux.p); const FX = Array.from({ length: 24 }, (_, i) => ({ j: i % 3, ph: rnd() * TAU, v: 0.6 + rnd() * 0.5 }));   // des données qui circulent sur les orbites
  const rayons = segments(12, o.m.d); o.g.add(rayons.l); const liens = segments(10, o.m.a); o.g.add(liens.l);
  const E = d === window.SERIEUX_DONNEES_EN ? ['AI core', '10 agents in orbit', 'The product'] : ['Cœur IA', '10 agents en orbite', 'Le produit'];
  etiquette(o, coeur, [0.4, -0.1, 0], E[0], { cls: 'ia' }); etiquette(o, ORB[2].g, [ORB[2].r * 0.72, ORB[2].r * 0.69, 0], E[1]); etiquette(o, o.g, [0.78, SY + 0.35, 0.45], E[2]);
  o.etq.forEach(e => { e.on = true; });
  const P0 = V(0, 0, 0), P1 = V(0, 0, 0); let t0 = null, duo = -1, hDuo = [0, 0];
  const CYC = 17, PAS = 0.85;
  o.tick = (t, v) => {
    if (v.w < 0.03) t0 = null; if (t0 === null) t0 = t;
    const ec = t - t0, T0 = ec % CYC, dt = Math.min(0.2, Math.max(0, t - (o._t ?? t))); o._t = t;
    duo = window.Serieux3D && window.Serieux3D.duo !== undefined ? window.Serieux3D.duo : -1; hDuo = hDuo.map((h, i) => lerp(h, duo === i ? 1 : 0, 1 - Math.exp(-dt * 6)));
    /* l'arrivée : les orbites se tracent */
    ORB.forEach((R0, j) => R0.l.geometry.setDrawRange(0, Math.ceil(161 * c01((ec - j * 0.25) / 1.4))));
    ico.rotation.set(t * 0.21, t * 0.33, 0); noyau.rotation.set(-t * 0.5, -t * 0.7, 0);
    const nPose = T0 < 12 * PAS ? Math.floor(T0 / PAS) : 12, fin = T0 > 16;
    const integre = sm((T0 - 12 * PAS - 1.3) / 1.2) * (1 - sm((T0 - 15.4) / 0.6)) + hDuo[0] * 0.8;
    coeur.position.y = CY - integre * 0.35; coeur.scale.setScalar(1 + 0.05 * Math.sin(t * 2.2) + integre * 0.1);
    /* les agents : sur leur orbite, sauf celui qui porte un module */
    AG.forEach((a, i) => { surOrbite(a, t * (1 + hDuo[1] * 1.2), P0); a.g.rotation.set(t * 1.3 + i, t * 0.9, 0); a.g.position.copy(P0); a.g.scale.setScalar(1 + hDuo[1] * 0.35); });
    MOD.forEach((m, k) => {
      const debut = m.n * PAS, u = c01((T0 - debut) / PAS), a = AG[m.n % 10], cible = V(m.s.x, SY, m.s.z);
      let vis = T0 >= debut, y = SY, x = m.s.x, z = m.s.z, sc = 1;
      if (vis && u < 1) {   // l'agent quitte son orbite, descend, pose le module, remonte
        surOrbite(a, t * (1 + hDuo[1] * 1.2), P1); const aller = sm(u / 0.55), retour = sm((u - 0.6) / 0.4);
        const px = lerp(P1.x, cible.x, aller), py = lerp(P1.y, cible.y + m.s.h + 0.12, aller), pz = lerp(P1.z, cible.z, aller);
        a.g.position.set(lerp(px, P1.x, retour), lerp(py, P1.y, retour), lerp(pz, P1.z, retour));
        if (u < 0.55) { x = px; y = py - m.s.h - 0.1; z = pz; sc = 0.55 + 0.45 * aller; } else { const p = sm((u - 0.55) / 0.12); y = SY + (1 - p) * 0.02 - Math.sin(p * Math.PI) * 0.015; }
        liens.pos.set([a.g.position.x, a.g.position.y, a.g.position.z, x, y + m.s.h, z], (m.n % 10) * 6);
      }
      if (fin) { const r = sm((T0 - 16 - (11 - m.n) * 0.05) / 0.8); x = lerp(m.s.x, 0, r); y = lerp(SY, coeur.position.y - m.s.h / 2, r); z = lerp(m.s.z, 0, r); sc = 1 - r * 0.9; vis = r < 0.98; }   // tout remonte dans le cœur, et on recommence
      m.g.visible = vis; m.g.position.set(x, y, z); m.g.scale.set(sc, sc, sc);
      m.toit.visible = integre > 0.3 && !fin; const on = vis && integre > 0.05 && !fin;
      rayons.pos.set(on ? [coeur.position.x, coeur.position.y - 0.3, coeur.position.z, lerp(coeur.position.x, x, integre), lerp(coeur.position.y - 0.3, y + m.s.h, integre), lerp(coeur.position.z, z, integre)] : [0, -99, 0, 0, -99, 0], k * 6);
    });
    for (let i = 0; i < 10; i++) { const m = MOD.find(mm => mm.n % 10 === i && T0 >= mm.n * PAS && T0 < (mm.n + 1) * PAS); if (!m) liens.pos.set([0, -99, 0, 0, -99, 0], i * 6); }
    liens.a.needsUpdate = true; rayons.a.needsUpdate = true; rayons.l.computeLineDistances();
    const sk = c01((T0 - 12 * PAS) / 1.2); scan.visible = sk > 0 && sk < 1; scan.position.y = SY + sk * 1.0;
    ORB.forEach(R0 => { R0.l.material = hDuo[1] > 0.5 ? o.m.l : o.m.s; });
    FX.forEach((f, i) => { const R0 = ORB[f.j]; vv.set(Math.cos(f.ph + t * f.v) * R0.r, Math.sin(f.ph + t * f.v) * R0.r, 0).applyEuler(R0.g.rotation); flux.pos.set(ec > 1.6 ? [vv.x, vv.y + CY, vv.z] : [0, -99, 0], i * 3); }); flux.a.needsUpdate = true;
  };
  o.rot = t => [0.52, -0.55 + Math.sin(t * 0.14) * 0.28];
}

/* ——— la puce : l'objet fil rouge ; ses six couches sont les six familles de compétences ———
   de bas en haut : la carte (DevOps & cloud), les pistes (leadership), le substrat et ses billes (back-end),
   l'anneau de garde (sécurité), la puce nue (l'IA, le cœur), le capot (le front, ce qu'on voit). */
const COUCHES = ['devops', 'lead', 'back', 'secu', 'ia', 'front'];
let e0 = null;   // le graphe de l'équipe (compétences), partagé entre sa construction et son animation
function puce(nom, cfg) {
  const o = objet(nom, Object.assign({ s: 1 }, cfg)), C = {}, Y0 = { devops: -0.55, lead: -0.512, back: -0.4, secu: -0.325, ia: -0.32, front: -0.2 };
  COUCHES.forEach((id, k) => { const p = piece(o, [(k % 2 ? 1 : -1) * 1.6, (k - 2.5) * 0.9, (k % 3 - 1) * 0.8]); const g = new T.Group(); p.g.add(g); C[id] = { p, g, m: matieres(), k, hot: 0, f: 1 }; MATS.push(C[id].m); });
  /* la carte : un circuit imprimé aux coins arrondis, quatre trous de fixation, une zone réservée en pointillés, des composants alignés */
  { const c = C.devops, m = c.m; solide(c.g, plaque(1.5, 1.1, 0.06, 0.12).translate(0, -0.03, 0), m.l, 30);
    [[-1.34, -0.94], [1.34, -0.94], [-1.34, 0.94], [1.34, 0.94]].forEach(p => { c.g.add(trait(cercleH(0.065, 24, p[0], 0.032, p[1]), m.l, true)); c.g.add(trait(cercleH(0.035, 16, p[0], 0.032, p[1]), m.s, true)); });
    const zr = trait([[-1.1, 0.032, -0.8], [1.1, 0.032, -0.8], [1.1, 0.032, 0.8], [-1.1, 0.032, 0.8]], m.d, true); c.g.add(zr); c.zr = zr;
    for (let i = 0; i < 5; i++) { const b = new T.Group(); b.position.set(-0.5 + i * 0.25, 0.055, -0.98); c.g.add(b); solide(b, new T.BoxGeometry(0.12, 0.04, 0.07), m.l); }
    for (let i = 0; i < 3; i++) { const b = new T.Group(); b.position.set(1.25, 0.06, -0.3 + i * 0.3); c.g.add(b); solide(b, new T.BoxGeometry(0.1, 0.05, 0.18), m.l); } }
  /* les pistes : droites, parallèles, du bord du substrat à une rangée de pastilles ; les signaux y courent */
  { const c = C.lead, m = c.m, segs = [], pads = [], rails = [];
    for (let s2 = 0; s2 < 4; s2++) for (let i = 0; i < 6; i++) {
      const u = (i - 2.5) * 0.22, rot = ([x, z]) => s2 === 0 ? [x, z] : s2 === 1 ? [-x, z] : s2 === 2 ? [z, x * 0.68] : [z, -x * 0.68];
      const L2 = s2 < 2 ? 1.28 : 1.3, P = [[0.88, u], [(0.88 + L2) / 2, u], [L2, u]].map(rot).map(([x, z]) => [x, 0, z]);
      segs.push(P[0], P[2]); rails.push(P); const q = 0.028; pads.push(...boucleSegs([[P[2][0] - q, 0, P[2][2] - q], [P[2][0] + q, 0, P[2][2] - q], [P[2][0] + q, 0, P[2][2] + q], [P[2][0] - q, 0, P[2][2] + q]]));
    }
    c.g.add(traits(segs, m.s)); c.g.add(traits(pads, m.l)); c.rails = rails;
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
  /* le capot : une plaque nette, un chanfrein au coin de la broche 1, un cadre intérieur fin, deux lignes de marquage */
  { const c = C.front, m = c.m, w = 1.3, h = 0.12, sh = new T.Shape(), k = 0.16, r = w / 2;
    sh.moveTo(-r + k, -r); sh.lineTo(r, -r); sh.lineTo(r, r); sh.lineTo(-r, r); sh.lineTo(-r, -r + k); sh.closePath();
    const g = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); solide(c.g, g, m.l, 30); const y = h + 0.003;
    c.g.add(trait([[-0.52, y, -0.52], [0.52, y, -0.52], [0.52, y, 0.52], [-0.52, y, 0.52]], m.s, true));
    c.g.add(trait(cercleH(0.05, 24, -0.4, y, 0.4), m.l, true));
    c.g.add(traits([[-0.2, y, -0.12], [0.36, y, -0.12], [-0.2, y, 0.04], [0.16, y, 0.04]], m.s)); }
  const X = { devops: [1.5, 0.035, 1.1], lead: [1.36, 0, 0.6], back: [0.85, 0.05, 0.85], secu: [0.64, 0.05, 0.64], ia: [0.45, 0.06, 0.45], front: [0.75, 0.12, 0.75] };
  o.C = C; sol(o, cfg.solY ?? -1.65, 3.4, 0.34);
  /* compétences : au-dessus de la couche qu'on lit, son univers se construit (réseau de neurones, fenêtre, bases, boucle, bouclier, équipe) */
  const EM = {};
  if (cfg.univers) {
    const Y = 1.2, nv = (id, f) => { const p = piece(o, [0, 2.4, 0]), g = new T.Group(); g.position.y = Y; g.scale.setScalar(1.05); p.g.add(g); const m = C[id].m; f(g, m); EM[id] = { g, L: pieces(g), b: 0, imp: null }; return EM[id]; };
    { const e = nv('ia', (g, m) => { const P = [[-0.6, [-0.3, 0, 0.3]], [0, [-0.45, -0.15, 0.15, 0.45]], [0.6, [-0.2, 0.2]]], s2 = [], N = [];
        P.forEach(([x, ys]) => ys.forEach(y => { const n = new T.Group(); n.position.set(x, y + 0.45, 0); g.add(n); solide(n, new T.OctahedronGeometry(0.06), m.l, 1); N.push([x, y + 0.45]); }));
        P[0][1].forEach(a => P[1][1].forEach(b => s2.push([-0.6, a + 0.45, 0], [0, b + 0.45, 0]))); P[1][1].forEach(a => P[2][1].forEach(b => s2.push([0, a + 0.45, 0], [0.6, b + 0.45, 0]))); g.add(traits(s2, m.s)); });
      e.imp = points(10, o.m.pa); e.g.add(e.imp.p); e.mv = (t, P) => { for (let i = 0; i < 10; i++) { const u = (t * 0.6 + i * 0.1) % 1, a = [-0.6, [-0.3, 0, 0.3][i % 3] + 0.45], b = [0, [-0.45, -0.15, 0.15, 0.45][i % 4] + 0.45], c = [0.6, [-0.2, 0.2][i % 2] + 0.45];
        const [p, q, k] = u < 0.5 ? [a, b, u * 2] : [b, c, u * 2 - 1]; P.set([lerp(p[0], q[0], k), lerp(p[1], q[1], k), 0], i * 3); } }; }
    { const e = nv('front', (g, m) => { g.add(trait([[-0.6, 0.05, 0], [0.6, 0.05, 0], [0.6, 0.85, 0], [-0.6, 0.85, 0]], m.l, true)); g.add(trait([[-0.6, 0.73, 0], [0.6, 0.73, 0]], m.l));
        [-0.52, -0.45, -0.38].forEach(x => g.add(trait(cercle(0.022, 12).map(p => [p[0] + x, p[1] + 0.79, 0]), m.s, true)));
        [[-0.5, 0.6, 0.35, 0.08], [-0.5, 0.45, 0.5, 0.05], [-0.5, 0.36, 0.42, 0.05], [0.1, 0.18, 0.42, 0.45], [-0.5, 0.18, 0.5, 0.12]].forEach(([x, y, w, h]) => { const b = new T.Group(); b.position.set(x + w / 2, y - h / 2 + 0.05, 0.01); g.add(b); b.add(trait([[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]], m.l, true)); }); });
      e.imp = points(1, o.m.pa); e.g.add(e.imp.p); e.mv = (t, P) => P.set([Math.sin(t * 1.3) * 0.45, 0.4 + Math.sin(t * 2.1) * 0.25, 0.03], 0); }
    { const e = nv('back', (g, m) => { [-0.45, 0, 0.45].forEach((x, j) => { for (let k = 0; k < 3; k++) { const c = new T.Group(); c.position.set(x, 0.1 + k * 0.22, 0); g.add(c);
        c.add(trait(cercleH(0.16, 32, 0, 0, 0), m.l, true)); c.add(trait(cercleH(0.16, 32, 0, 0.16, 0), m.l, true)); c.add(traits([[-0.16, 0, 0], [-0.16, 0.16, 0], [0.16, 0, 0], [0.16, 0.16, 0]], m.l)); } }); });
      e.imp = points(6, o.m.pa); e.g.add(e.imp.p); e.mv = (t, P) => { for (let i = 0; i < 6; i++) { const u = (t * 0.5 + i / 6) % 1, x = lerp(-0.45, 0.45, Math.floor(u * 3) / 2); P.set([x + (i % 2 ? 0.2 : -0.2) * Math.sin(u * TAU), 0.2 + (u * 3 % 1) * 0.5, 0.16], i * 3); } }; }
    { const e = nv('devops', (g, m) => { const L8 = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * TAU; L8.push([Math.sin(a) * 0.6, 0.45 + Math.sin(a * 2) * 0.22, 0]); } g.add(trait(L8, m.l));
        [[-0.6, 'plan'], [-0.3, 'code'], [0.3, 'test'], [0.6, 'prod']].forEach(([x], k) => { const b = new T.Group(); b.position.set(x * 0.95, 0.45 + (k % 2 ? -0.26 : 0.26) * 0.6, 0); g.add(b); solide(b, new T.BoxGeometry(0.1, 0.1, 0.1), m.l); }); });
      e.imp = points(5, o.m.pa); e.g.add(e.imp.p); e.mv = (t, P) => { for (let i = 0; i < 5; i++) { const a = (t * 0.5 + i / 5) * TAU; P.set([Math.sin(a) * 0.6, 0.45 + Math.sin(a * 2) * 0.22, 0], i * 3); } }; }
    { const e = nv('secu', (g, m) => { const B = [[-0.4, 0.85, 0], [0.4, 0.85, 0]]; for (let i = 1; i <= 24; i++) { const u = i / 24; B.push([0.4 * Math.cos(u * Math.PI / 2), 0.85 - 0.8 * Math.sin(u * Math.PI / 2) * (0.35 + 0.65 * u), 0]); }
        for (let i = 23; i >= 1; i--) { const u = i / 24; B.push([-0.4 * Math.cos(u * Math.PI / 2), 0.85 - 0.8 * Math.sin(u * Math.PI / 2) * (0.35 + 0.65 * u), 0]); }
        g.add(trait(B, m.l, true)); g.add(trait([[-0.13, 0.5, 0.01], [-0.03, 0.4, 0.01], [0.15, 0.62, 0.01]], m.l));
        for (let k = 0; k < 3; k++) g.add(trait(cercle(0.75 + k * 0.12, 64).filter(p => p[1] >= 0).map(p => [p[0], p[1] + 0.05, 0]), m.s)); });
      e.imp = points(1, o.m.pa); e.g.add(e.imp.p); e.mv = (t, P) => { const a = Math.PI * ((t * 0.4) % 1); P.set([Math.cos(a) * 0.87, Math.sin(a) * 0.87 + 0.05, 0], 0); }; }
    { const e = nv('lead', (g, m) => { const N = [[0, 0.8], [-0.45, 0.45], [0, 0.45], [0.45, 0.45], [-0.6, 0.1], [-0.3, 0.1], [-0.08, 0.1], [0.12, 0.1], [0.35, 0.1], [0.6, 0.1]], A = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [2, 7], [3, 8], [3, 9]];
        N.forEach(([x, y], i) => g.add(trait(cercle(i ? 0.05 : 0.08, 20).map(p => [p[0] + x, p[1] + y, 0]), i ? m.l : m.l, true))); const s2 = []; A.forEach(([a, b]) => s2.push([N[a][0], N[a][1] - (a ? 0.05 : 0.08), 0], [N[b][0], N[b][1] + 0.05, 0])); g.add(traits(s2, m.s)); e0 = [N, A]; });
      e.imp = points(9, o.m.pa); e.g.add(e.imp.p); e.mv = (t, P) => { const [N, A] = e0; A.forEach(([a, b], i) => { const u = (t * 0.6 + i * 0.11) % 1; P.set([lerp(N[a][0], N[b][0], u), lerp(N[a][1], N[b][1], u), 0.01], i * 3); }); }; }
  }
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
    const dtt = o._t === undefined ? 0.05 : Math.min(0.2, Math.max(0, t - o._t)); o._t = t;   /* au temps, pas à l'image */
    if (!o.faisceau) { o.faisceau = { l: segments(4, o.m.s), p: points(16, o.m.pa), a: V(), b: V() }; o.g.add(o.faisceau.l.l, o.faisceau.p.p); }
    { const F = o.faisceau, id = COUCHES[hl], e = EM[id]; let k = 0;   // le faisceau : l'univers sort de la couche qu'on lit
      if (e && C[id]) { C[id].g.getWorldPosition(F.a); o.g.worldToLocal(F.a); e.g.getWorldPosition(F.b); o.g.worldToLocal(F.b); k = sm(e.b * 1.6); }
      const c4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      c4.forEach(([x, z], i) => F.l.pos.set(k > 0.02 ? [F.a.x + x * 0.32, F.a.y + 0.03, F.a.z + z * 0.32, lerp(F.a.x, F.b.x, k) + x * 0.12, lerp(F.a.y, F.b.y, k), lerp(F.a.z, F.b.z, k) + z * 0.12] : [0, -99, 0, 0, -99, 0], i * 6));
      for (let i = 0; i < 16; i++) { const [x, z] = c4[i % 4], u = (t * 0.7 + i * 0.29) % 1, w = 0.32 + (0.12 - 0.32) * u; F.p.pos.set(k > 0.5 ? [lerp(F.a.x, F.b.x, u * k) + x * w, lerp(F.a.y + 0.03, F.b.y, u * k), lerp(F.a.z, F.b.z, u * k) + z * w] : [0, -99, 0], i * 3); }
      F.l.a.needsUpdate = true; F.p.a.needsUpdate = true; }
    for (const id in EM) { const e = EM[id], on = COUCHES[hl] === id; e.b = on ? Math.min(1, e.b + dtt * 0.8) : Math.max(0, e.b - dtt * 2.5); construit(e.L, sm(e.b * 1.4), 0.6);
      e.g.visible = e.b > 0.01; e.g.rotation.y = -o.g.rotation.y * 0.6 + Math.sin(t * 0.4) * 0.15; if (e.imp) { if (e.b > 0.6) e.mv(t, e.imp.pos); else e.imp.pos.fill(-99); e.imp.a.needsUpdate = true; } }
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
  ST.forEach((s, i) => { const g = []; for (let k = -3; k <= 3; k++) g.push([k * 0.1, 0.001, -0.4], [k * 0.1, 0.001, -0.36], [k * 0.1, 0.001, 0.36], [k * 0.1, 0.001, 0.4]); s.g.add(traits(g, s.m.s));   // plus de grande dalle vide : un simple repère gradué
    if (i < 4) s.g.add(trait([[0.3, 0.004, 0], [0.58, 0.004, 0]], s.m.s)); });
  const pisteOn = segments(4, o.m.a); P.add(pisteOn.l); const solC = sol(o, -0.06, 3, 0.3, P);
  ST.forEach((s, i) => { s.g.add(trait([[-0.3, 0.004, -0.3], [0.3, 0.004, -0.3], [0.3, 0.004, 0.3], [-0.3, 0.004, 0.3]], s.m.l, true)); s.n0 = s.g.children.length; s.b = 0; });
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
  /* le contenu de chaque station, en grand : c'est lui qu'on regarde, pas le socle */
  const GR = 1.7; ST.forEach(s => s.g.children.slice(s.n0).forEach(ch => { ch.position.multiplyScalar(GR); ch.scale.multiplyScalar(GR); }));
  blocs.forEach((b, i) => { b.g.scale.setScalar(GR); b.b.set(X[1] + ((i % 3) - 1) * 0.1 * GR, (0.045 + Math.floor(i / 3) * 0.09) * GR, 0); b.a.set(X[0] + (b.a.x - X[0]) * GR, b.a.y * GR, b.a.z * GR); });
  ST.forEach(s => { s.L = pieces(s.g, s.g.children.slice(0, s.n0)); }); let t0 = null;   // chaque station se monte quand on l'approche
  o.tick = (t, v) => {
    const pas = v.pas === undefined ? 5 : v.pas, S = Math.min(4, Math.floor(pas)), u = pas >= 5 ? 1 : pas - S;
    const ec = t0 === null ? 0.05 : Math.min(0.2, Math.max(0, t - t0)); t0 = t;
    ST.forEach((s, i) => { s.b = lerp(s.b, pas >= i - 0.25 ? 1 : 0, 1 - Math.exp(-ec * 2.6)); construit(s.L, s.b, 1.1); });
    /* la planche glisse pour garder la station lue au centre ; après la dernière, elle recule et montre toute la chaîne */
    const fin = pas >= 5, cx = fin ? 0 : lerp(X[S], X[Math.min(4, S + 1)], fen(u, 0.75, 1));
    const dt = 1 - Math.exp(-ec * 5); P.position.x = lerp(P.position.x, -cx, dt); solC.uniforms.cx.value = cx; const zm = lerp(P.scale.x, fin ? 0.62 : 1.15, dt); P.scale.setScalar(zm);
    ST.forEach((s, i) => { const on = pas >= i ? 1 : 0, d = Math.abs(X[i] + P.position.x) * zm, loin = 1 - sm((d - 0.75) / 0.55);
      s.f = lerp(s.f, on ? 1 : 0.28, 0.1); s.hot = lerp(s.hot, S === i && !fin ? 1 : 0, 0.12); chaud(s.m, s.hot); opac(s.m, o.op * s.f * loin); s.e.on = S === i && !fin; s.e.op = (fin ? 0.8 : Math.min(1, s.hot * 1.4)) * loin; });
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
  o.rot = t => [0.48 + Math.sin(t * 0.2) * 0.03, -0.42 + Math.sin(t * 0.13) * 0.1];
}

/* ——— 02 La méthode : une salle de contrôle qui se construit une étape après l'autre ———
   0 les terminaux en éventail, chacun avec son agent · 1 l'agent principal délègue à des sous-agents · 2 les skills viennent s'emboîter
   3 le banc d'essai : les outils font la course, un seul reste · 4 une flotte d'agents construit le produit · 5 le portique de contrôle, un humain valide */
function atelier() {   // Méthode : un geste par étape, en grand (Mathieu, 28/09 : « chaque scène doit être créative »)
  const o = objet('atelier', { s: 0.9, pl: { x: 0.28, y: 0.0, s: 1.12 }, plT: { y: 0.24, s: 1.05 } });
  const L = [0, 1, 2, 3, 4, 5].map(() => { const m = matieres(); MATS.push(m); return m; }), f = [0, 0, 0, 0, 0, 0];
  const pc = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }), R = new T.Group(); pc.g.add(R);

  /* 0 · le mur de terminaux : des dizaines, en biais, qui défilent sans fin (les rangées qui sortent en haut reviennent en bas) */
  const NC = 7, NR = 10, PASY = 0.36, mur = new T.Group(); mur.rotation.set(-0.3, 0.98, 0.1); mur.position.set(0.1, 0, -0.4); R.add(mur);
  const RANGS = [], RM = [];
  for (let r = 0; r < NR; r++) {
    const m = matieres(); MATS.push(m); RM.push(m); const g = new T.Group(); mur.add(g);
    for (let c = 0; c < NC; c++) {
      const t0 = new T.Group(); t0.position.set((c - (NC - 1) / 2) * 0.6, 0, 0); g.add(t0);
      solide(t0, new T.BoxGeometry(0.52, 0.3, 0.02), m.l); t0.add(trait([[-0.24, 0.115, 0.012], [0.24, 0.115, 0.012]], m.s));
    }
    const lg = segments(NC * 4, m.l); g.add(lg.l); RANGS.push({ g, lg, ph: rnd() * 10, cur: Array.from({ length: NC }, () => rnd()) });
  }
  const curseurs = points(NC * NR, L[0].pa); mur.add(curseurs.p);

  /* 1 · la silhouette (moi : cheveux en pointes, moustache en guidon) ; d'un coup, une foule de moi sort de moi, les bras s'agitent, puis tout rentre */
  const buste = [[-0.4, -0.34], [-0.38, -0.05], [-0.3, 0.08], [-0.12, 0.15], [-0.07, 0.24], [-0.07, 0.26]].concat([[0.07, 0.26], [0.07, 0.24], [0.12, 0.15], [0.3, 0.08], [0.38, -0.05], [0.4, -0.34]]);
  const tete = Array.from({ length: 40 }, (_, i) => { const a = -Math.PI / 2 + i / 39 * TAU; return [Math.cos(a) * 0.12, 0.42 + Math.sin(a) * 0.16]; });
  const cheveux = [[-0.12, 0.47], [-0.09, 0.62], [-0.05, 0.54], [-0.01, 0.66], [0.03, 0.55], [0.07, 0.64], [0.1, 0.52], [0.12, 0.47]];
  const moust = [[-0.1, 0.4], [-0.06, 0.36], [0, 0.37], [0.06, 0.36], [0.1, 0.4]];
  function perso(m, moi) {
    const g = new T.Group(); [buste, tete, cheveux, moust].forEach(p => g.add(trait(p.map(q => [q[0], q[1], 0]), moi && p === moust ? L[1].a : m)));
    return g;
  }
  sol(o, -0.78, 3, 0.3, R); const foule = new T.Group(); R.add(foule); const moi = perso(L[1].l, true); moi.position.set(0, -0.2, 0.9); foule.add(moi);
  const FM = [0, 1, 2].map(() => { const m = matieres(); MATS.push(m); return m; }), CL = [];
  [[4, 0.7, 0.35], [6, 1.05, -0.25], [8, 1.4, -0.85]].forEach(([n, r, z], rang) => { for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - 0.5) * 2.1, g = perso(FM[rang].l, false); foule.add(g); CL.push({ g, fin: V(Math.sin(a) * r, 0.02 + rang * 0.26, z), rang, ph: rnd() * TAU, d: rnd() * 0.25 });
  } });
  const bras = segments((CL.length + 1) * 8, L[1].l); foule.add(bras.l); const mains = points((CL.length + 1) * 4, L[1].pa); foule.add(mains.p);
  const bouge = (fig, t, s, n, e) => {   // quatre bras : deux paires, épaule → coude → main, qui tapent, attrapent, désignent
    const P = fig.position, sc = fig.scale.x;
    for (let b = 0; b < 4; b++) {
      const cote = b % 2 ? 1 : -1, haut = b < 2 ? 0.08 : -0.06, sh = [P.x + cote * 0.3 * sc, P.y + haut * sc, P.z];
      const a1 = cote * (0.9 + 0.5 * Math.sin(t * (3 + b) + s)) * e + (1 - e) * cote * 0.2, a2 = a1 + cote * (0.8 + 0.6 * Math.sin(t * (5 + b * 0.7) + s * 2)) * e;
      const el = [sh[0] + Math.sin(a1) * 0.22 * sc, sh[1] - Math.cos(a1) * 0.22 * sc * (b < 2 ? -1 : 0.3), sh[2] + 0.05], ma = [el[0] + Math.sin(a2) * 0.2 * sc, el[1] + Math.cos(a2) * 0.2 * sc * (b < 2 ? 1 : 0.2), el[2] + 0.04];
      const vu = e > 0.02 && (fig === moi || b < 2);   // moi seul a quatre bras ; mes copies en ont deux
      bras.pos.set(vu ? [...sh, ...el, ...el, ...ma] : [0, -99, 0, 0, -99, 0, 0, -99, 0, 0, -99, 0], (n * 8 + b * 2) * 6);
      mains.pos.set(vu ? ma : [0, -99, 0], (n * 4 + b) * 3);
    }
  };

  /* 2 · l'outillage : des modules (skills, plugins, serveurs MCP) arrivent de partout et se branchent un à un dans les prises d'un socle autour de moi ; chaque prise allume un fil jusqu'à moi */
  const NS = 10, SK = [], ceinture = new T.Group(); ceinture.position.set(0, -0.36, 0.9); R.add(ceinture); ceinture.add(trait(cercleH(0.62, 72), L[2].s, true)); ceinture.add(trait(cercleH(0.48, 72), L[2].s, true));
  const PR = []; for (let i = 0; i < NS; i++) { const a = i / NS * TAU, x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55; PR.push([x, z]); ceinture.add(trait(cercleH(0.065, 4).map(p => [p[0] + x, 0.002, p[2] + z]), L[2].d, true)); }
  for (let i = 0; i < NS; i++) { const g = new T.Group(); R.add(g); const f3 = i % 3;
    if (f3 === 0) solide(g, new T.BoxGeometry(0.11, 0.11, 0.11), L[2].l);                                                   // un skill
    else if (f3 === 1) { solide(g, new T.BoxGeometry(0.14, 0.03, 0.1), L[2].l); g.add(trait([[-0.05, 0.016, 0], [0.04, 0.016, 0]], L[2].s)); }   // une carte, un plugin
    else { solide(g, new T.OctahedronGeometry(0.075), L[2].a, 1); }                                                            // un serveur MCP
    g.add(traits([[-0.025, -0.06, 0], [-0.025, -0.1, 0], [0.025, -0.06, 0], [0.025, -0.1, 0]], L[2].l));                      // ses broches
    SK.push({ g, dep: V((rnd() - 0.5) * 4, 1.2 + rnd() * 1.2, (rnd() - 0.5) * 3), i }); }
  const FILS = segments(NS, L[2].a), ETIN = segments(NS, L[2].d); R.add(FILS.l); R.add(ETIN.l); const ETC = []; for (let i = 0; i < NS; i++) { const r = trait(cercleH(0.08, 24), L[2].a, true); ceinture.add(r); ETC.push(r); }

  /* 3 · le banc d'essai : dix couloirs, dix outils qui courent ; un seul franchit la ligne en tête */
  const piste = new T.Group(); piste.position.set(-0.22, -0.35, 0.2); piste.rotation.y = -0.2; piste.scale.setScalar(0.82); R.add(piste); const NL = 10, CO = [];
  for (let i = 0; i < NL; i++) { const z = (i - (NL - 1) / 2) * 0.16; piste.add(trait([[-1.5, 0, z - 0.08], [1.5, 0, z - 0.08]], L[3].s)); }
  piste.add(trait([[1.2, 0, -0.85], [1.2, 0, 0.85]], L[3].a)); piste.add(trait([[1.2, 0.18, -0.85], [1.2, 0.18, 0.85]], L[3].d));
  for (let i = 0; i < NL; i++) { const g = new T.Group(); piste.add(g); solide(g, new T.BoxGeometry(0.1, 0.08, 0.08).translate(0, 0.04, 0), i === 6 ? L[3].a : L[3].l); CO.push({ g, z: (i - (NL - 1) / 2) * 0.16, v: i === 6 ? 1 : 0.55 + rnd() * 0.35 }); }
  const sillages = segments(NL * 2, L[3].l); piste.add(sillages.l); const eclat = trait(cercleH(0.2, 48), L[3].a, true); piste.add(eclat);   // les traînées de vitesse, l'éclat du vainqueur
  const BAR = CO.map((c, i) => { const g = new T.Group(); g.position.set(1.42, 0, c.z); piste.add(g); solide(g, new T.BoxGeometry(0.1, 1, 0.1).translate(0, 0.5, 0), i === 6 ? L[3].a : L[3].l); g.scale.y = 0.001; return g; });   // chaque arrivée dresse sa barre : le banc d'essai devient un classement

  /* 4 · le produit monte au centre, nourri par tout le mur de terminaux */
  const prod = new T.Group(); prod.position.set(0, -0.55, 0.75); R.add(prod); const ET = [];
  const NF = 12, FEN = [];   // le produit : un immeuble qui monte étage par étage ; chaque paquet de travail qui arrive allume une fenêtre
  for (let k = 0; k < NF; k++) { const e = new T.Group(), w = 0.62 - k * 0.012, d = 0.42 - k * 0.008; e.position.y = k * 0.1; prod.add(e); solide(e, new T.BoxGeometry(w, 0.09, d).translate(0, 0.045, 0), k === NF - 1 ? L[4].a : L[4].l);
    const f2 = []; for (let j = 0; j < 5; j++) { const x = -w / 2 + (j + 0.75) * w / 5.5; f2.push([x, 0.025, d / 2 + 0.003], [x, 0.065, d / 2 + 0.003]); FEN.push([x, k * 0.1 + 0.045, d / 2 + 0.006, k]); } e.add(traits(f2, L[4].s)); ET.push(e); }
  const allume = points(FEN.length, L[4].pa); prod.add(allume.p);
  const NE = 140, ess = points(NE, L[4].pa); R.add(ess.p); const EP = Array.from({ length: NE }, () => ({ x: (rnd() - 0.5) * 3.6, y: (rnd() - 0.3) * 2.4, o: rnd(), v: 0.3 + rnd() * 0.35 }));

  /* 5 · le portique : les livraisons passent sur un tapis à travers l'anneau ; ce qui n'est pas bon est éjecté dans le bac ; ce qui passe s'empile, et je valide */
  const port = new T.Group(); port.position.set(-0.55, 0.0, 0.75); R.add(port); const anneau = new T.Group(); anneau.rotation.y = 0.75; port.add(anneau);
  const ann = trait(cercle(0.34, 72), L[5].a, true); anneau.add(ann); anneau.add(trait(cercle(0.4, 72), L[5].s, true));
  const scan = trait(cercle(0.3, 48), L[5].d, true); anneau.add(scan);
  port.add(traits([[-1.3, -0.2, -0.12], [1.0, -0.2, -0.12], [-1.3, -0.2, 0.12], [1.0, -0.2, 0.12]], L[5].s));
  { const r = []; for (let x = -1.3; x <= 1.0; x += 0.2) r.push([x, -0.2, -0.12], [x, -0.2, 0.12]); port.add(traits(r, L[5].d)); }
  const bac = new T.Group(); bac.position.set(-0.35, -0.72, -0.55); port.add(bac); solide(bac, new T.BoxGeometry(0.42, 0.18, 0.32).translate(0, 0.09, 0), L[5].l);
  const pile = new T.Group(); pile.position.set(0.95, -0.2, 0); port.add(pile);
  const coche = new T.Group(); coche.position.set(0.95, 0.6, 0); port.add(coche); coche.add(trait(cercle(0.13, 40), L[5].a, true)); coche.add(trait([[-0.06, 0, 0.01], [-0.015, -0.045, 0.01], [0.07, 0.055, 0.01]], L[5].a));
  const NGI = 9, COL = []; for (let i = 0; i < NGI; i++) { const g = new T.Group(); port.add(g); solide(g, new T.BoxGeometry(0.13, 0.13, 0.13).translate(0, 0.065, 0), L[5].l); g.add(trait([[-0.04, 0.132, 0], [0.04, 0.132, 0]], L[5].s)); COL.push({ g, rejet: i % 4 === 2 }); }
  const PIL = []; for (let k = 0; k < 5; k++) { const g = new T.Group(); g.position.y = k * 0.1; pile.add(g); solide(g, new T.BoxGeometry(0.2, 0.09, 0.2).translate(0, 0.045, 0), k === 4 ? L[5].a : L[5].l); PIL.push(g); }
  const juge = perso(L[5].l, true); juge.position.set(0.72, -0.3, 0.3); juge.scale.setScalar(0.72); R.add(juge);

  /* la caméra de chaque étape : [rx, ry, zoom, décalage x, décalage y] */
  const VUE = [[0.05, -0.05, 0.8, 0.1, 0], [0.12, 0, 0.85, -0.05, 0.05], [0.3, 0.1, 1.05, 0, 0.05], [0.55, -0.1, 0.95, 0, 0.1], [0.2, -0.1, 0.9, 0, 0], [0.1, -0.05, 1.05, 0, -0.05], [0.2, 0, 0.9, 0, 0]];
  const cam = { rx: 0.1, ry: 0, z: 0.8, x: 0, y: 0 }; let t0 = null;
  o.tick = (t, v) => {
    const pas = v.pas === undefined ? 6 : v.pas, S = Math.min(5, Math.floor(pas)), k = i => c01(pas - i);
    const ec = t0 === null ? 0.05 : Math.min(0.2, Math.max(0, t - t0)); t0 = t; const dt = 1 - Math.exp(-ec * 3.5), df = 1 - Math.exp(-ec * 5);
    const vis = [S === 0 ? 1 : S === 4 ? 0.35 : 0, S === 1 || S === 2 ? 1 : 0, S === 2 ? 1 : 0, S === 3 ? 1 : 0, S === 4 ? 1 : 0, S === 5 ? 1 : 0];
    for (let i = 0; i < 6; i++) { f[i] = lerp(f[i], vis[i], df); opac(L[i], o.op * f[i]); }
    const V1 = VUE[S], V2 = VUE[Math.min(6, S + 1)], u = sm(fen(pas - S, 0.82, 1));
    cam.rx = lerp(cam.rx, lerp(V1[0], V2[0], u), dt); cam.ry = lerp(cam.ry, lerp(V1[1], V2[1], u), dt); cam.z = lerp(cam.z, lerp(V1[2], V2[2], u), dt);
    cam.x = lerp(cam.x, lerp(V1[3], V2[3], u), dt); cam.y = lerp(cam.y, lerp(V1[4], V2[4], u), dt); R.scale.setScalar(cam.z); R.position.set(cam.x, cam.y, 0);
    /* 0 : le mur défile ; chaque rangée s'estompe en entrant et en sortant */
    const fm = f[0], vit = 0.22;
    RANGS.forEach((rg, r) => {
      let y = ((r * PASY + t * vit) % (NR * PASY)) - NR * PASY / 2; rg.g.position.y = y;
      const a = sm((NR * PASY / 2 - Math.abs(y)) / 0.55); opac(RM[r], o.op * fm * a); rg.g.visible = fm * a > 0.01;
      for (let c = 0; c < NC; c++) for (let j = 0; j < 4; j++) {
        const w = 0.08 + 0.32 * Math.abs(Math.sin(rg.ph + c * 2.1 + j * 1.7 + Math.floor(t * 2.4 + c + r) * 0.9)), x0 = (c - (NC - 1) / 2) * 0.6 - 0.22, yy = 0.06 - j * 0.055;
        rg.lg.pos.set([x0, yy, 0.012, x0 + w, yy, 0.012], (c * 4 + j) * 6);
      }
      rg.lg.a.needsUpdate = true;
      for (let c = 0; c < NC; c++) curseurs.pos.set(fm * a > 0.2 && (t * 2 + rg.cur[c] * 3) % 1 > 0.5 ? [(c - (NC - 1) / 2) * 0.6 + 0.2, y - 0.1, 0.02] : [0, -99, 0], (r * NC + c) * 3);
    });
    curseurs.a.needsUpdate = true; mur.visible = fm > 0.01;
    /* 1 : la foule sort de moi, s'agite, rentre ; en boucle tant qu'on lit l'étape */
    foule.visible = f[1] > 0.01; const cyc = S === 1 ? (t * 0.19) % 1 : S === 2 ? 0 : 0, sortie = S === 1 ? sm(cyc / 0.22) * (1 - sm((cyc - 0.78) / 0.2)) : 0;
    CL.forEach((c, i) => { const e = sm((sortie - c.d) / (1 - c.d)), pop = e * (1 + 0.25 * Math.sin(Math.PI * c01(e * 1.2))); c.g.visible = e > 0.01;
      c.g.position.lerpVectors(moi.position, c.fin, e); c.g.position.y += Math.sin(Math.PI * e) * 0.25; c.g.scale.setScalar(Math.max(0.01, pop * (0.82 - c.rang * 0.1))); bouge(c.g, t, c.ph, i, e); });
    moi.scale.setScalar(1 + 0.08 * Math.sin(Math.PI * sortie)); bouge(moi, t, 0, CL.length, S === 1 ? 0.35 + 0.65 * sortie : 0.15);
    FM.forEach((m, r) => opac(m, o.op * f[1] * (1 - r * 0.22))); bras.a.needsUpdate = true; mains.a.needsUpdate = true;
    /* 2 : les modules arrivent un à un et se branchent ; chaque branchement fait une étincelle et tire un fil jusqu'à moi */
    const k2 = S >= 2 ? k(2) : 0; ceinture.visible = f[2] > 0.01; const bat = (t * 0.9) % NS, cb = ceinture.position;
    SK.forEach((sk, i) => { const e = c01(k2 * 1.6 - i * 0.06) >= 1 ? 1 : sm(c01(k2 * 1.6 - i * 0.06) * 1.0), P2 = PR[i], fin = V(cb.x + P2[0], cb.y + 0.1 + (1 - Math.min(1, e * 1.4)) * 0.3, cb.z + P2[1]);
      const pos = V().lerpVectors(sk.dep, fin, Math.min(1, e * 1.15)); pos.y += Math.sin(Math.min(1, e * 1.15) * Math.PI) * 0.45; sk.g.position.copy(pos);
      const pose = e > 0.85; sk.g.rotation.set(pose ? 0 : (1 - e) * t * 3, pose ? -i / NS * TAU : t * 2, pose ? 0 : (1 - e) * t); sk.g.visible = f[2] > 0.01;
      const on = e > 0.85 && f[2] > 0.05, pouls = on && Math.floor(bat) === i ? sm((bat % 1) * 2) : 0;
      FILS.pos.set(on && pouls > 0 ? [fin.x, fin.y, fin.z, lerp(fin.x, moi.position.x, pouls), lerp(fin.y, moi.position.y + 0.1, pouls), lerp(fin.z, moi.position.z, pouls)] : [0, -99, 0, 0, -99, 0], i * 6);
      ETIN.pos.set(on ? [fin.x, fin.y, fin.z, moi.position.x, moi.position.y + 0.1, moi.position.z] : [0, -99, 0, 0, -99, 0], i * 6);
      const ec2 = c01((e - 0.85) / 0.15); ETC[i].position.set(P2[0], 0, P2[1]); ETC[i].scale.setScalar(1 + ec2 * 2.5 * (1 - ec2) + pouls * 0.8); ETC[i].visible = on; });
    FILS.a.needsUpdate = true; ETIN.a.needsUpdate = true; ceinture.rotation.y = 0;
    /* 3 : la course, qui recommence */
    piste.visible = f[3] > 0.01; const tc = (t * 0.28) % 1;
    CO.forEach((c, i) => { const x = -1.4 + Math.min(2.7, 2.9 * tc * c.v * 1.1), va = x < 1.3 ? c.v : 0; const chute = c.v === 1 ? 0 : c01((tc - 0.8 - i * 0.012) / 0.16); c.g.position.set(x + chute * 0.25, -chute * chute * 1.6, c.z); c.g.rotation.set(chute * 1.5 * (i % 2 ? 1 : -1), 0, -chute * 2.2); c.g.scale.y = x > 1.2 && c.v === 1 ? 1.6 : 1;   // un seul reste : les autres basculent hors de la piste
      for (let j = 0; j < 2; j++) { const dy = 0.02 + j * 0.04, l = va * (1 - chute) * (0.35 + 0.25 * Math.sin(t * 20 + i + j)); sillages.pos.set([x - 0.06 - l, dy, c.z + (j - 0.5) * 0.03, x - 0.06, dy, c.z + (j - 0.5) * 0.03], (i * 2 + j) * 6); } });
    CO.forEach((c, i) => { const arr = 2.9 * tc * c.v * 1.1 >= 2.6, cible = arr ? 0.12 + 0.75 * Math.pow(c.v, 3) : 0.001; BAR[i].scale.y = Math.max(0.001, lerp(BAR[i].scale.y, cible, arr ? 0.12 : 0.4)); BAR[i].visible = f[3] > 0.01; });
    sillages.a.needsUpdate = true; { const w = CO.find(c => c.v === 1), xg = -1.4 + 2.9 * tc * 1.1, k = c01((xg - 1.2) / 0.9); eclat.position.set(1.2, 0.02, w.z); eclat.scale.setScalar(0.2 + k * 5); eclat.visible = k > 0 && k < 1; }
    /* 4 : le produit, étage par étage, nourri par le mur */
    const k4 = S >= 4 ? k(4) : 0; prod.visible = f[4] > 0.01;
    ET.forEach((e, i) => { const q = sm(k4 * (NF + 1) - i); e.visible = q > 0.02; e.scale.set(1, Math.max(0.02, q), 1); });
    FEN.forEach(([x, y, z, et], i) => { const bati = sm(k4 * (NF + 1) - et) > 0.95, on = bati && Math.sin(i * 12.9898 + Math.floor(t * 1.3 + i * 0.37) * 78.233) > 0.1; allume.pos.set(on ? [x, y, z] : [0, -99, 0], i * 3); }); allume.a.needsUpdate = true;
    EP.forEach((p, i) => { if (f[4] < 0.05) { ess.pos.set([0, -99, 0], i * 3); return; } const u2 = (t * p.v * 0.45 + p.o) % 1, m = 1 - u2, b = prod.position;
      ess.pos.set([p.x * m + b.x * u2, p.y * m * m + 1.2 * 2 * m * u2 + (b.y + 0.2 + k4 * 1.1) * u2 * u2, -0.4 * m + b.z * u2], i * 3); });
    ess.a.needsUpdate = true;
    /* 5 : le tapis avance ; l'anneau lit chaque colis ; le mauvais saute dans le bac, le bon rejoint la pile ; je coche */
    port.visible = juge.visible = f[5] > 0.01; let passe = 0, mauvais = 0;
    COL.forEach((c, i) => { const u3 = (t * 0.11 + i / NGI) % 1, x = lerp(-1.25, 0.85, u3); let y = -0.2, z = 0, r = 0;
      if (c.rejet && x > 0.02) { const e = c01((x - 0.02) / 0.5); passe = passe || e < 0.25; mauvais = mauvais || e < 0.3;
        const bx = bac.position; c.g.position.set(lerp(0.02, bx.x, e), lerp(-0.2, bx.y + 0.12, e) + Math.sin(e * Math.PI) * 0.55, lerp(0, bx.z, e)); c.g.rotation.set(e * 4, e * 2, 0); c.g.visible = f[5] > 0.01 && e < 0.98; return; }
      if (Math.abs(x) < 0.12) passe = 1; c.g.position.set(x, y, z); c.g.rotation.set(0, r, 0); c.g.visible = f[5] > 0.01 && x < 0.82; });
    ann.scale.setScalar(1 + (passe ? 0.08 : 0) + (mauvais ? Math.sin(t * 40) * 0.04 : 0)); scan.visible = !!passe; scan.scale.setScalar(passe ? 0.6 + ((t * 3) % 1) * 0.4 : 1);
    const np = Math.floor((t * 0.11 * NGI * 0.78) % 6); PIL.forEach((g, k) => g.visible = k < Math.max(1, np)); coche.visible = np >= 4 && (t % 1.4) > 0.3;
    juge.rotation.y = Math.sin(t * 0.8) * 0.3;
  };
  o.rot = t => [cam.rx, cam.ry + Math.sin(t * 0.15) * 0.05];
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
  let TT = 0;   // l'horloge des formes : chacune vit, pas seulement le passage de l'une à l'autre
  { const f = mk(); F.push(u => { const nb = 1 + sm(u * 1.3) * 10.5;   // les années poussent une à une, du cœur vers l'écorce
    for (let i = 0; i < N; i++) { const j = Math.floor(R[i][0] * 11), a = R[i][1] * TAU + TT * 0.05 * (j % 2 ? 1 : -1), on = c01(nb - j), r = (0.12 + j * 0.095 * (1 + 0.035 * Math.sin(a * 5 + j))) * (0.3 + 0.7 * on);
      f.p.set([Math.cos(a) * r, (R[i][2] - 0.5) * 0.05, Math.sin(a) * r], i * 3); f.a[i] = Math.max(0.04, on); f.h[i] = j === Math.floor(nb - 0.01) || j === 10 && on > 0.9 ? 1 : 0; } return f; }); }
  /* 150 000+ : une sphère dense, des gens partout */
  { const f = mk(); F.push(() => { for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), a = i * 2.39996, b = 1.05 * (1 + 0.035 * Math.sin(TT * 2.2 + y * 4));   // la sphère respire ; des gens s'allument partout
    f.p.set([Math.cos(a) * r * b, y * b, Math.sin(a) * r * b], i * 3); f.h[i] = Math.sin(TT * 1.7 + i * 12.9898) > 0.985 ? 1 : 0; } return f; }); }
  /* 99,99 % : un anneau complet ; un seul point clignote, le 0,01 % */
  { const f = mk(); f.h[0] = 1; F.push(() => { for (let i = 0; i < N; i++) { const a = i / N * TAU + (i ? TT * 0.35 : 0), r = 1.0 + (R[i][0] - 0.5) * 0.08; f.p.set([Math.cos(a) * r, (R[i][1] - 0.5) * 0.08, Math.sin(a) * r], i * 3); } return f; }); }   // le flux tourne sans s'arrêter ; le point du 0,01 % reste figé
  /* −40 % : la cascade réseau d'un chargement de page (comme dans les outils du navigateur) ; toutes les requêtes se tassent à 60 % */
  const WL = Array.from({ length: 12 }, (_, j) => 0.45 + 0.35 * Math.sin(j * 1.7) ** 2), W0 = WL.map((l, j) => j / 11 * (2.6 - l));
  { const f = mk(); F.push(u => { const k = 1 - 0.4 * sm(u * 1.4);
    for (let i = 0; i < N; i++) { const j = i % 12, t = (R[i][0] + TT * (0.18 + j * 0.01)) % 1, x = -1.3 + (W0[j] + t * WL[j]) * k, bord = R[i][2] < 0.5;
      const yb = 0.8 - j * 0.145, ct = R[i][2] < 0.25, xs = ct ? x : -1.3 + (W0[j] + R[i][1] * WL[j]) * k;   // un quart des points file au centre de la barre, le reste en dessine le contour
      f.p.set(ct ? [x, yb, 0] : bord ? [xs, yb + (R[i][1] * 7 % 1 < 0.5 ? -1 : 1) * 0.035, 0] : [-1.3 + (W0[j] + (R[i][1] < 0.5 ? 0 : WL[j])) * k, yb + (R[i][0] - 0.5) * 0.07, 0], i * 3); f.h[i] = ct && t > 0.85 ? 1 : 0; f.a[i] = ct ? 1 : 0.8; } return f; }); }
  /* +35 % : l'équipe autour d'une table, une colonne par personne ; chacune gagne 35 % de hauteur, en couleur, et des étincelles montent */
  const HJ = Array.from({ length: 8 }, (_, j) => 0.75 + 0.35 * ((j * 0.618) % 1));
  { const f = mk(); F.push(u => { const k = sm(u * 1.4);
    for (let i = 0; i < N; i++) { const j = i % 8, a = j / 8 * TAU, cx = Math.cos(a) * 0.72, cz = Math.sin(a) * 0.72, H = HJ[j], y0 = -0.75, et = R[i][0] > 0.95;
      if (et) { const v = (R[i][1] + TT * 0.3) % 1; f.p.set([cx + (R[i][2] - 0.5) * 0.2, y0 + H * (1 + 0.35 * k) + v * 0.7, cz + Math.sin(v * 9 + i) * 0.06], i * 3); f.a[i] = k * (1 - v); f.h[i] = 1; continue; }
      const s = 0.1, Ht = H * (1 + 0.35 * k), arete = R[i][1] < 0.45, c = Math.floor(R[i][2] * 4), sx = c % 2 ? 1 : -1, sz = c < 2 ? 1 : -1;   // un prisme : 4 arêtes verticales et des étages carrés
      let y, px, pz; if (arete) { y = y0 + R[i][0] / 0.95 * Ht; px = sx * s; pz = sz * s; }
      else { const ne = Math.max(1, Math.round(Ht / 0.1)), n = Math.floor(R[i][0] / 0.95 * (ne + 1)), q = R[i][1] * 8 % 1 * 2 - 1; y = y0 + Math.min(n, ne) * Ht / ne; px = c < 2 ? q * s : sx * s; pz = c < 2 ? sz * s : q * s; }
      const hi2 = y > y0 + H + 0.001; f.p.set([cx + px, y, cz + pz], i * 3);
      f.h[i] = hi2 ? 1 : 0; f.a[i] = 1; } return f; }); }
  /* 25 pays : vingt-cinq foyers, posés comme des graines (137,5°) */
  { const f = mk(), c = []; for (let j = 0; j < 25; j++) { const r = 0.24 * Math.sqrt(j + 0.5), a = j * 2.39996; c.push([Math.cos(a) * r, Math.sin(a) * r]); }
    F.push(u => { const nj = Math.max(1, Math.ceil(sm(u * 1.3) * 25)), vif = Math.floor(TT * 2.5) % nj;   // les pays s'allument un à un, puis chacun à son tour
      for (let i = 0; i < N; i++) { const j = i % 25, w = R[i][0] * TAU + TT * 0.8, cz = R[i][1] * 2 - 1, r = 0.07 * Math.cbrt(R[i][2]) * (j === vif ? 1.35 : 1), s = Math.sqrt(1 - cz * cz), on = j < nj;
        f.p.set(on ? [c[j][0] + Math.cos(w) * s * r, cz * r, c[j][1] + Math.sin(w) * s * r] : [c[j][0] * 0.2, 0, c[j][1] * 0.2], i * 3); f.a[i] = on ? 1 : 0.03; f.h[i] = j === vif ? 1 : 0; } return f; }); }
  /* 85+ projets : quatre-vingt-cinq petits cubes */
  { const f = mk(); F.push(u => { const nc = Math.ceil(sm(u * 1.3) * 85);   // les projets se livrent un à un ; le dernier arrivé s'allume
    for (let i = 0; i < N; i++) { const j = i % 85, cx = (j % 10 - 4.5) * 0.22, cy = (Math.floor(j / 10) - 4) * 0.22, e = Math.floor(R[i][0] * 12), t = R[i][1] - 0.5, s = 0.07, on = j < nc;
      const E = [[t, -.5, -.5], [t, .5, -.5], [t, -.5, .5], [t, .5, .5], [-.5, t, -.5], [.5, t, -.5], [-.5, t, .5], [.5, t, .5], [-.5, -.5, t], [.5, -.5, t], [-.5, .5, t], [.5, .5, t]][e];
      f.p.set(on ? [cx + E[0] * s * 2, cy + E[1] * s * 2, E[2] * s * 2] : [cx, cy + 1.6, 0], i * 3); f.a[i] = on ? 1 : 0.02; f.h[i] = j === nc - 1 ? 1 : 0; } return f; }); }
  o.formes = F.length;
  /* les repères en pointillés : l'ancienne longueur (−40 %), le niveau d'avant (+35 %) */
  const g40 = trait([[1.3, -0.95, 0], [1.3, 0.95, 0]], o.m.d); fant.add(g40);
  const g35 = trait(cercleH(0.72, 64, 0, -0.75, 0), o.m.d, true); fant.add(g35);
  const ROT = [[1.05, 0], [0.25, 0], [1.1, 0], [0.12, -0.3], [0.38, 0], [1.0, 0], [0.18, -0.25]];
  const cur = { rx: 0.9 };
  o.tick = (t, v) => {
    TT = t; const pas = v.pas === undefined ? 0 : Math.min(F.length - 0.001, v.pas), s = Math.floor(pas), u = pas - s;
    const A = F[s](Math.min(1, u / 0.7)), B = F[Math.min(F.length - 1, s + 1)](0), m = s + 1 < F.length ? c01((u - 0.72) / 0.28) : 0;
    for (let i = 0; i < N; i++) {
      const d = R[i][2] * 0.45, k = sm((m - d) / 0.55), i3 = i * 3;
      nu.P[i3] = lerp(A.p[i3], B.p[i3], k); nu.P[i3 + 1] = lerp(A.p[i3 + 1], B.p[i3 + 1], k) + Math.sin(k * Math.PI) * (R[i][0] - 0.5) * 0.6; nu.P[i3 + 2] = lerp(A.p[i3 + 2], B.p[i3 + 2], k);
      nu.A[i] = lerp(A.a[i], B.a[i], k); nu.H[i] = lerp(A.h[i], B.h[i], k);
    }
    if (s === 2) nu.H[0] = (Math.sin(t * 6) > 0 ? 1 : 0.2) * (1 - m);
    nu.maj(); nu.m.uniforms.op.value = o.op; nu.m.uniforms.sz.value = 3.1 * PR;
    g40.visible = s === 3 && u > 0.1 && m < 0.5; g35.visible = s === 4 && m < 0.9;
    const rr = ROT[s], rn = ROT[Math.min(F.length - 1, s + 1)]; cur.rx = lerp(rr[0], rn[0], sm(m)); cur.ry = lerp(rr[1], rn[1], sm(m));
    const tourne = rr[1] === 0 && rn[1] === 0; pc.g.rotation.y = tourne ? t * 0.15 : cur.ry + Math.sin(t * 0.3) * 0.12;   // les formes rondes tournent sur elles-mêmes
  };
  o.rot = t => [cur.rx, 0];
}

/* ——— 03 Parcours : une piste de circuit, un composant par poste ; le défilement fait avancer le signal jusqu'à MARKO ——— */
function circuit(postes) {
  const o = objet('circuit', { s: 0.9, pl: { x: 0.25, y: 0.0, s: 1.5 }, plT: { y: 0.24, s: 1.6 } }); let t0 = null;
  const ES = 1.5, n = postes.length, pan = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }), P = new T.Group(); pan.g.add(P);
  const X = postes.map((_, i) => i * ES);
  /* la piste : une ligne qui serpente d'un composant à l'autre, avec des vias */
  const pts = []; X.forEach((x, i) => { pts.push([x, 0, 0]); if (i < n - 1) { const z = i % 2 ? 0.45 : -0.45; pts.push([x + 0.35, 0, 0], [x + 0.55, 0, z], [x + ES - 0.55, 0, z], [x + ES - 0.35, 0, 0]); } });
  const solP = sol(o, -0.02, X[n - 1] + 3, 0.3, P); const luL = trait(pts, o.m.a); P.add(luL); luL.geometry.setDrawRange(0, 0);
  const signal = new T.Group(); P.add(signal); boule(o, signal, 0.045, o.m.a);
  const NQ = 14, queue = points(NQ, o.m.pa); P.add(queue.p); const hist = [];   // la comète : le signal laisse une traîne
  const pilier = trait([[0, 0, 0], [0, 1.1, 0]], o.m.d); P.add(pilier);
  /* « chaque poste a ajouté une couche » : derrière la piste, une pile de plaques qui gagne un étage à chaque poste */
  const pile = new T.Group(); P.add(pile); const PL = postes.map((_, i) => { const g = new T.Group(); g.position.y = i * 0.06; pile.add(g); solide(g, plaque(0.19, 0.19, 0.03, 0.04), i === postes.length - 1 ? o.m.a : o.m.l, 30); g.userData.y0 = g.position.y; return g; });
  pile.add(trait([[0, -0.02, 0.3], [0, -0.02, 0.62]], o.m.s));
  const K = postes.map((p, i) => { const m = matieres(); MATS.push(m); const g = new T.Group(); g.position.x = X[i]; P.add(g); const c = { m, g, f: 0.3, hot: 0, parts: [] };
    const socle = trait(cercleH(0.34, 48), m.s, true); g.add(socle);
    COMPOSANT[p.c](c, m, o); c.L = pieces(g, [socle]); c.b = 0;
    c.e = etiquette(o, g, [0, 0, 0.44], p.an0 + '  ' + p.lieu, { bas: true });
    /* la piste vers le poste suivant et son via : elles s'effacent avec le composant */
    if (i < n - 1) { const z = i % 2 ? 0.45 : -0.45, gp = new T.Group(); gp.position.x = X[i]; P.add(gp); gp.add(trait([[0, 0, 0], [0.35, 0, 0], [0.55, 0, z], [ES - 0.55, 0, z], [ES - 0.35, 0, 0], [ES, 0, 0]], m.s)); gp.add(trait(cercleH(0.03, 10, 0.55, 0, z), m.s, true)); }
    return c; });
  o.tick = (t, v) => {
    const pas = v.pas === undefined ? 0 : v.pas, S = Math.min(n - 1, Math.floor(pas)), u = pas - S, x = lerp(X[S], X[Math.min(n - 1, S + 1)], fen(u, 0.7, 1));
    const ec = t0 === null ? 0.05 : Math.min(0.2, Math.max(0, t - t0)); t0 = t;   /* au temps, pas à l'image */
    P.position.x = -x; const zS = (() => { const j = Math.min(n - 2, Math.floor(x / ES)), u2 = x / ES - j, z = j % 2 ? 0.45 : -0.45; const d = Math.min(u2, 1 - u2) * ES; return z * c01((d - 0.35) / 0.2); })();   // le signal suit la piste, coudes compris
    signal.position.set(x, 0.05, S >= n - 1 ? 0 : zS); solP.uniforms.cx.value = x; solP.uniforms.r.value = 3;
    if (hist.length && hist[0].distanceTo(signal.position) > 0.3) hist.length = 0; hist.unshift(signal.position.clone()); if (hist.length > NQ * 2) hist.pop(); for (let i = 0; i < NQ; i++) { const h = hist[Math.min(hist.length - 1, i * 2)]; queue.pos.set([h.x, h.y, h.z], i * 3); } queue.a.needsUpdate = true;
    pile.position.set(x - 0.55, 0, -0.75); PL.forEach((g, i) => { const e = c01(pas + 1 - i); g.visible = e > 0.02; g.position.y = g.userData.y0 + (1 - sm(e)) * 0.9; g.rotation.y = (1 - sm(e)) * 1.2; });
    pilier.position.set(X[S], 0, 0); pilier.scale.y = 0.4 + 0.6 * sm(1 - Math.abs(u - 0.35) * 2);
    const ip = Math.min(pts.length, 1 + Math.round((x / ES) * 5)), d0 = Math.max(0, ip - 5); luL.geometry.setDrawRange(d0, ip - d0);   // seule la dernière longueur reste allumée
    K.forEach((c, i) => { const on = i === S ? 1 : 0, d = Math.abs(X[i] - x); c.hot = lerp(c.hot, on, 0.12); c.f = lerp(c.f, on ? 1 : i < S ? 0.3 : 0.18, 0.1); chaud(c.m, c.hot * 0.6);
      opac(c.m, o.op * c.f * (1 - sm((d - 0.6) / 0.6))); c.e.on = on === 1; c.e.op = c.f * (1 - sm((d - 0.6) / 0.7));
      c.b = lerp(c.b, i <= S ? 1 : 0, 1 - Math.exp(-ec * (i === S ? 2.2 : 5))); construit(c.L, c.b, 1.4);   // le poste se construit quand le signal arrive
      c.g.position.y = on ? Math.sin(t * 1.5) * 0.02 : 0; c.g.scale.setScalar(0.8 + 0.5 * c.hot); if (c.tick) c.tick(t, c.hot); });
  };
  o.rot = t => [0.34, -0.42 + Math.sin(t * 0.2) * 0.1];
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
    const gouttes = points(12, m.pa); g.add(gouttes.p); c.tick = t => { for (let i = 0; i < 12; i++) { const k = (t * 0.5 + i / 12) % 1, r = lerp(0.2, 0.03, k) * (i % 2 ? 1 : -1); gouttes.pos.set([Math.cos(i) * r, lerp(0.42, 0.0, k), Math.sin(i) * r], i * 3); } gouttes.a.needsUpdate = true; };
  },
  monde(c, m, o) {   /* Sodexo : 25 pays */
    const g = new T.Group(); g.position.y = 0.24; c.g.add(g); boule(o, g, 0.22, m.l);
    for (let k = 0; k < 3; k++) { const l = trait(cercle(0.22, 48), m.s, true); l.rotation.y = k / 3 * Math.PI; g.add(l); }
    const pins = []; for (let j = 0; j < 25; j++) { const y = 1 - 2 * (j + 0.5) / 25, r = Math.sqrt(1 - y * y), a = j * 2.39996; pins.push([Math.cos(a) * r * 0.225, y * 0.225, Math.sin(a) * r * 0.225]); }
    const pg = new T.BufferGeometry().setFromPoints(pins.map(p => V(...p))); const pp = new T.Points(pg, m.pa); pp.renderOrder = 2; g.add(pp);
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
function immeuble() {   // MARKO : un parc d'immeubles ; l'anneau IA descend lire chacun, ses documents montent, sa jauge de covenant se remplit, et l'alerte part avant la casse
  const o = objet('immeuble', { s: 0.78 });
  const Y0 = -0.92, socle = piece(o, [0, -1.5, 0.3]); solide(socle.g, new T.BoxGeometry(2.9, 0.06, 1.8).translate(0, -0.95, 0), o.m.l); sol(o, -0.98, 3.2, 0.3);
  const BAT = [[-1.0, 0.8, 0.42, 0.42, -0.45], [-0.45, 1.25, 0.45, 0.45, 0.35], [0.05, 1.75, 0.5, 0.5, -0.2], [0.62, 1.05, 0.42, 0.5, 0.4], [1.05, 0.7, 0.4, 0.4, -0.45], [-1.0, 0.55, 0.38, 0.38, 0.45], [0.55, 0.5, 0.36, 0.36, -0.55]];
  const G = [], J = [];
  BAT.forEach((b, i) => {
    const p = piece(o, [(b[0]) * 2.2, 1.3, b[4] * 2]), g = new T.Group(); p.g.add(g); g.position.set(b[0], Y0, b[4]);
    solide(g, new T.BoxGeometry(b[2], b[1], b[3]).translate(0, b[1] / 2, 0), o.m.l);
    const f = []; for (let y = 0.14; y < b[1] - 0.05; y += 0.14) { const x = b[2] / 2 + 0.002, z = b[3] / 2 + 0.002; f.push([-x, y, z], [x, y, z], [x, y, z], [x, y, -z]); }
    g.add(traits(f, o.m.s)); if (i === 2) g.add(trait([[0, b[1], 0], [0, b[1] + 0.25, 0]], o.m.l));
    /* la jauge du covenant, plantée sur le toit */
    const jg = new T.Group(); jg.position.set(b[2] / 2 - 0.05, b[1] + 0.06, b[3] / 2 - 0.05); g.add(jg);
    jg.add(trait([[-0.03, 0, 0], [0.03, 0, 0], [0.03, 0.3, 0], [-0.03, 0.3, 0]], o.m.s, true)); jg.add(trait([[-0.05, 0.21, 0], [0.05, 0.21, 0]], o.m.d));   // le seuil
    const rem = new T.Group(); jg.add(rem); solide(rem, new T.BoxGeometry(0.04, 1, 0.02).translate(0, 0.5, 0), i === 3 ? o.m.a : o.m.l); rem.scale.y = 0.001;
    G.push(g); J.push({ rem, v: 0, cible: [0.12, 0.15, 0.1, 0.27, 0.13, 0.09, 0.16][i] });
  });
  /* l'alerte : un triangle au-dessus de l'immeuble qui franchit son seuil */
  const al = new T.Group(); G[3].add(al); al.position.set(0, BAT[3][1] + 0.55, 0); al.visible = false;
  al.add(trait([[-0.13, -0.1, 0], [0.13, -0.1, 0], [0, 0.13, 0]], o.m.a, true)); al.add(trait([[0, -0.02, 0], [0, 0.06, 0]], o.m.a)); al.add(trait(cercle(0.006, 6).map(p => [p[0], p[1] - 0.06, 0]), o.m.a, true));
  const ia = piece(o, [0, 2.2, 0.5]), anneau = new T.Group(); ia.g.add(anneau);
  anneau.add(trait(cercle(0.34, 64).map(a => [a[0], 0, a[1]]), o.m.a, true)); anneau.add(trait(cercle(0.22, 48).map(a => [a[0], 0, a[1]]), o.m.s, true));
  const nds = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, g = new T.Group(); g.position.set(Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34); anneau.add(g); solide(g, new T.OctahedronGeometry(0.04), o.m.a, 1); nds.push(g); }
  const cone = segments(4, o.m.d); o.g.add(cone.l);
  const etg = segments(4 * 13, o.m.a); o.g.add(etg.l);   // les étages lus, qui s'allument de bas en haut
  const doc = new T.Group(); o.g.add(doc); doc.add(trait([[-0.07, 0, -0.09], [0.07, 0, -0.09], [0.07, 0, 0.09], [-0.07, 0, 0.09]], o.m.l, true)); doc.add(traits([[-0.04, 0, -0.04], [0.04, 0, -0.04], [-0.04, 0, 0.01], [0.03, 0, 0.01]], o.m.s));
  let der = -1;
  o.tick = (t, v) => {
    const T0 = t * 0.32, i = Math.floor(T0) % BAT.length, e = T0 % 1, b = BAT[i], k = sm(v.loc * 1.6);
    if (Math.floor(T0) !== der) { der = Math.floor(T0); if (i === 0) { J.forEach(j => j.v = 0); al.visible = false; } }
    /* l'anneau glisse au-dessus de l'immeuble à lire */
    const hx = b[0], hz = b[4], hy = Y0 + b[1] + 0.55, prev = BAT[(i + BAT.length - 1) % BAT.length], m = sm(Math.min(1, e / 0.25));
    anneau.position.set(lerp(prev[0], hx, m), lerp(Y0 + prev[1] + 0.55, hy, m), lerp(prev[4], hz, m)); anneau.rotation.y = t * 0.6;
    const lit = e > 0.25 && e < 0.8, lk = c01((e - 0.25) / 0.45), rx = b[2] / 2 + 0.01, rz = b[3] / 2 + 0.01;
    [[-rx, -rz], [rx, -rz], [rx, rz], [-rx, rz]].forEach(([x, z], c) => { const a = anneau.position;
      cone.pos.set(lit ? [a.x + x * 0.5, a.y, a.z + z * 0.5, hx + x, Y0 + b[1] * (1 - lk), hz + z] : [0, -9, 0, 0, -9, 0], c * 6); });
    cone.a.needsUpdate = true;
    const nf = Math.floor((b[1] - 0.05) / 0.14);
    for (let f = 0; f < 13; f++) { const on = lit && f < nf && (f + 1) / nf <= lk + 0.01, y = Y0 + 0.14 * (f + 1);
      const q = on ? [hx - rx, y, hz + rz, hx + rx, y, hz + rz, hx + rx, y, hz + rz, hx + rx, y, hz - rz, hx + rx, y, hz - rz, hx - rx, y, hz - rz, hx - rx, y, hz - rz, hx - rx, y, hz + rz] : new Array(24).fill(0).map((_, j) => j % 3 === 1 ? -9 : 0);
      etg.pos.set(q, f * 24); }
    etg.a.needsUpdate = true;
    /* le document lu monte dans l'anneau ; la jauge prend sa valeur */
    const d = c01((e - 0.55) / 0.3); doc.visible = d > 0 && d < 1; doc.position.set(hx, lerp(Y0 + b[1] + 0.05, anneau.position.y, sm(d)) + Math.sin(d * Math.PI) * 0.15, hz); doc.rotation.y = d * 3;
    if (e > 0.8) J[i].v = J[i].cible;
    J.forEach((j, n) => { j.rem.scale.y = Math.max(0.001, lerp(j.rem.scale.y, j.v * (0.5 + 0.5 * k) / 0.3 * 0.3, 0.1)); });
    if (i === 3 && e > 0.85) al.visible = true;
    al.scale.setScalar(1 + 0.2 * Math.max(0, Math.sin(t * 6))); al.rotation.y = -o.g.rotation.y;
  };
  o.rot = t => [0.34, -0.6 + Math.sin(t * 0.2) * 0.22];
}
function fleur() {   // HUman : une seule nuée de particules raconte le livre, d'un mot dans un modèle à la fleur, l'atome, l'univers et le cerveau
  const o = objet('fleur', { s: 1.2 });
  const N = 2200, nu = nuage(N), pc = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }); pc.g.add(nu.p);
  const R = Array.from({ length: N }, () => [rnd(), rnd(), rnd()]), F = [];
  const mk = () => ({ p: new Float32Array(N * 3), h: new Float32Array(N) });
  /* un mot dans un modèle : une phrase découpée en jetons (des cadres) ; les arcs d'attention convergent vers le jeton suivant, qui s'allume */
  { const f = mk(), W = [0.34, 0.22, 0.4, 0.18, 0.3, 0.26], tot = W.reduce((a, b) => a + b, 0) + 0.06 * (W.length - 1); let x = -tot / 2; const B = W.map(w => { const b = [x, w]; x += w + 0.06; return b; });
    for (let i = 0; i < N; i++) { const j = i % W.length, [x0, w] = B[j], u = R[i][0] * 2 * (w + 0.18), hh = 0.18; let px, py;
      if (u < w) { px = x0 + u; py = hh / 2; } else if (u < w + hh) { px = x0 + w; py = hh / 2 - (u - w); } else if (u < 2 * w + hh) { px = x0 + w - (u - w - hh); py = -hh / 2; } else { px = x0; py = -hh / 2 + (u - 2 * w - hh); }
      f.p.set([px, py + 0.1, (R[i][1] - 0.5) * 0.02], i * 3); f.h[i] = j === 5 ? 1 : 0;
      if (i % 5 < 2) { const k = i % 5 ? (i >> 1) % 5 : (i >> 3) % 5, xs = B[k][0] + B[k][1] / 2, xe = B[5][0] + B[5][1] / 2, v = R[i][0], hh2 = 0.22 + 0.09 * (5 - k);   // l'attention : chaque jeton passé tend un arc vers le mot à prédire
        f.p.set([lerp(xs, xe, v), 0.19 + Math.sin(Math.PI * v) * hh2, (R[i][1] - 0.5) * 0.015], i * 3); f.h[i] = v > 0.86 ? 1 : 0; } } F.push(f); }
  /* la fleur : chaque graine à 137,5° de la précédente */
  { const f = mk(); for (let i = 0; i < N; i++) { const r = 0.03 * Math.sqrt(i), a = i * 137.5 * Math.PI / 180; f.p.set([Math.cos(a) * r, 0.25 - r * r * 0.3, Math.sin(a) * r], i * 3); f.h[i] = i < 21 ? 1 : 0; } F.push(f); }
  /* l'atome : un noyau, trois orbites */
  { const f = mk(), E = [new T.Euler(1.2, 0, 0), new T.Euler(1.2, 1.05, 0), new T.Euler(1.2, -1.05, 0)];
    for (let i = 0; i < N; i++) { if (i < N * 0.18) { const u = R[i][0] * TAU, cz = R[i][1] * 2 - 1, r = 0.14 * Math.cbrt(R[i][2]), s = Math.sqrt(1 - cz * cz); f.p.set([Math.cos(u) * s * r, cz * r + 0.1, Math.sin(u) * s * r], i * 3); f.h[i] = 1; continue; }
      const a = R[i][0] * TAU; vv.set(Math.cos(a) * 0.95, Math.sin(a) * 0.38, 0).applyEuler(E[i % 3]); f.p.set([vv.x, vv.y + 0.1, vv.z], i * 3); } F.push(f); }
  /* l'univers : une galaxie à deux bras */
  { const f = mk(); for (let i = 0; i < N; i++) { const bras = i % 2, r = Math.pow(R[i][0], 0.7) * 1.15, a = r * 4.2 + bras * Math.PI + (R[i][1] - 0.5) * 0.5 / (0.3 + r);
    f.p.set([Math.cos(a) * r, 0.1 + (R[i][2] - 0.5) * 0.06 * (1.2 - r), Math.sin(a) * r], i * 3); f.h[i] = r < 0.12 ? 1 : 0; } F.push(f); }
  /* le cerveau : deux lobes plissés */
  { const f = mk(); for (let i = 0; i < N; i++) { const s = i % 2 ? 1 : -1, u = R[i][0] * TAU, v = Math.acos(R[i][1] * 2 - 1), pl = 1 + 0.07 * Math.sin(u * 7 + v * 9) * Math.sin(v * 5);
    const x = s * (0.36 + 0.34 * Math.sin(v) * Math.abs(Math.cos(u)) * pl), y = 0.18 + 0.48 * Math.cos(v) * pl, z = 0.72 * Math.sin(v) * Math.sin(u) * pl; f.p.set([x, y, z], i * 3); f.h[i] = R[i][2] > 0.985 ? 1 : 0; } F.push(f); }
  const ROT = [0.1, 0.75, 0.45, 0.9, 0.2];
  let rx = 0.3;
  o.tick = (t, v) => {
    const DUR = 4.2, T0 = t / DUR, s = Math.floor(T0) % F.length, u = T0 % 1, A = F[s], B = F[(s + 1) % F.length], m = c01((u - 0.62) / 0.38);
    for (let i = 0; i < N; i++) { const k = sm((m - R[i][2] * 0.4) / 0.6), i3 = i * 3;
      nu.P[i3] = lerp(A.p[i3], B.p[i3], k); nu.P[i3 + 1] = lerp(A.p[i3 + 1], B.p[i3 + 1], k) + Math.sin(k * Math.PI) * (R[i][0] - 0.5) * 0.5; nu.P[i3 + 2] = lerp(A.p[i3 + 2], B.p[i3 + 2], k);
      nu.H[i] = lerp(A.h[i], B.h[i], k); nu.A[i] = 1; }
    nu.maj(); nu.m.uniforms.op.value = o.op; nu.m.uniforms.sz.value = 2.4 * PR;
    rx = lerp(ROT[s], ROT[(s + 1) % F.length], sm(m)); pc.g.rotation.y = t * 0.15;
  };
  o.rot = t => [rx, 0];
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
function chat() {   // ce portfolio : la tête de chat se dessine d'un trait de plume, puis suit des yeux une pelote qui roule en déroulant son fil
  const o = objet('chat', { s: 0.82 });
  sol(o, -1.05, 3, 0.3);
  const pts = [];
  for (let i = 0; i < 160; i++) {
    const a = i / 160 * TAU; let r = 1;
    const oreille = c => { const x = (a - c) / 0.32; return Math.abs(x) < 1 ? (1 - Math.abs(x)) * 0.62 : 0; };
    r += oreille(Math.PI * 0.3) + oreille(Math.PI * 0.7);
    pts.push(new T.Vector2(Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.86 - 0.08));
  }
  const tete = piece(o, [0, -1.8, 0]), corps = new T.Group(); tete.g.add(corps);
  const geo = new T.ExtrudeGeometry(new T.Shape(pts), { depth: 0.36, bevelEnabled: false }); geo.translate(0, 0, -0.18); solide(corps, geo, o.m.l, 40);
  /* le trait de plume qui dessine le contour avant que la tête ne prenne son volume */
  const plume = trait(pts.concat([pts[0]]).map(p => [p.x, p.y, 0.19]), o.m.l); tete.g.add(plume); const bout = points(1, o.m.pa); tete.g.add(bout.p);
  const face = piece(o, [0, 0.4, 2.4]), f = new T.Group(); f.position.z = 0.185; face.g.add(f);
  const PU = [];
  [-0.36, 0.36].forEach(x => {
    f.add(trait(cercle(0.15, 48, 1.3).map(a => [a[0] + x, a[1] + 0.02, 0]), o.m.l, true));
    const pu = new T.Group(); pu.position.x = x; f.add(pu); PU.push(pu);
    pu.add(trait(cercle(0.045, 20).map(a => [a[0] + 0.05, a[1] + 0.1, 0]), o.m.l, true));
    pu.add(trait(cercle(0.022, 14).map(a => [a[0] - 0.04, a[1] - 0.04, 0]), o.m.l, true));
  });
  f.add(trait([[-0.06, -0.24, 0], [0.06, -0.24, 0], [0, -0.31, 0]], o.m.a, true));
  f.add(trait([[-0.16, -0.36, 0], [-0.08, -0.41, 0], [0, -0.33, 0], [0.08, -0.41, 0], [0.16, -0.36, 0]], o.m.l));
  const mous = piece(o, [0, 0.2, 2.8]), m = new T.Group(); m.position.z = 0.19; mous.g.add(m);
  [-1, 1].forEach(s => [-0.08, 0, 0.08].forEach((dy, k) => { const w = new T.Group(); w.position.set(s * 0.24, -0.28 + dy * 0.5, 0); m.add(w); w.add(trait([[0, 0, 0], [s * 0.64, dy * 1.1 + (k - 1) * 0.02 + 0.04, 0]], o.m.s)); }));
  /* la pelote et son fil */
  const pel = piece(o, [2, 0, 1]), ball = new T.Group(); pel.g.add(ball); boule(o, ball, 0.16, o.m.l);
  [0, 1, 2].forEach(k => { const r = new T.Group(); r.rotation.set(k * 1.05, k * 0.7, 0); ball.add(r); r.add(trait(cercle(0.158, 40), o.m.a, true)); });
  const NF = 40, fil = new T.Line(new T.BufferGeometry(), o.m.a); fil.geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(NF * 3), 3)); fil.frustumCulled = false; fil.renderOrder = 1; pel.g.add(fil);
  let t0 = null;
  o.tick = (t, v) => {
    if (v.w < 0.05) t0 = null; if (t0 === null) t0 = t; const ec = t - t0;
    const d = c01(ec / 1.6); plume.geometry.setDrawRange(0, Math.max(2, Math.ceil(d * 161)));   // la plume trace le contour
    const pp = pts[Math.min(159, Math.floor(d * 160))]; bout.pos.set(d < 1 ? [pp.x, pp.y, 0.2] : [0, -9, 0], 0); bout.a.needsUpdate = true;
    const vol = sm((ec - 1.4) / 0.6); corps.scale.z = Math.max(0.001, vol); corps.visible = vol > 0.01; f.visible = m.visible = ec > 1.7;
    /* la pelote roule d'un bord à l'autre, rebondit ; son fil se couche derrière elle */
    const u = (t * 0.18) % 2, x = u < 1 ? lerp(1.9, -1.9, sm(u)) : lerp(-1.9, 1.9, sm(u - 1)), y = -1.05 + 0.16 + Math.abs(Math.sin(t * 3)) * 0.06 * (1 - Math.abs(sm(u % 1) - 0.5) * 2);
    ball.position.set(x, y, 0.75); ball.rotation.z = -x / 0.16;
    const P = fil.geometry.attributes.position.array; for (let i = 0; i < NF; i++) { const s = i / (NF - 1), xx = lerp(x, 2.1, s); P.set([xx, -1.045, 0.75 + Math.sin(s * 9 + t) * 0.1 * s], i * 3); } fil.geometry.attributes.position.needsUpdate = true;
    /* les yeux suivent la pelote, les moustaches frémissent, une oreille tressaille */
    const r = c01((x + 2) / 4) * 2 - 1; PU.forEach(p => p.position.set((p.position.x > 0 ? 0.36 : -0.36) + r * 0.05, -0.05, 0));
    m.children.forEach((w, i) => { w.rotation.z = Math.sin(t * 7 + i) * 0.04; });
    const b = (ec % 4.2) > 4.05 ? 0.1 : 1; f.children.forEach(c => { if (c.type === 'LineLoop' && c.geometry.attributes.position.count === 48) c.scale.y = b; }); PU.forEach(p => p.scale.y = b);
    corps.rotation.z = (t % 3.1) > 2.95 ? Math.sin(t * 40) * 0.01 : 0;
  };
  o.rot = t => [0.14 + Math.sin(t * 0.4) * 0.05, Math.sin(t * 0.3) * 0.35];
}
function archive() {   // Archon : la pile avale, chaque document passe sous le portique de lecture, ses entités montent tisser le graphe
  const o = objet('archive', { s: 0.82 });
  sol(o, -0.74, 3, 0.3);
  const feuille = (g, lignes) => { solide(g, new T.BoxGeometry(0.62, 0.03, 0.8), o.m.l); if (lignes) { const l = []; for (let k = 0; k < 5; k++) { const z = -0.28 + k * 0.13, w = k === 0 ? 0.24 : 0.42 - (k % 3) * 0.08; l.push([-0.24, 0.017, z], [-0.24 + w, 0.017, z]); } g.add(traits(l, o.m.s)); } };
  /* la pile à lire, à gauche, et la pile lue, à droite */
  const pile = piece(o, [-2, -0.6, 0.4]), F = [];
  for (let i = 0; i < 8; i++) { const g = new T.Group(); g.position.set(-1.25 + (i % 3 - 1) * 0.02, -0.7 + i * 0.06, (i % 2 ? 0.03 : -0.03)); g.rotation.y = (i % 4 - 1.5) * 0.07; pile.g.add(g); feuille(g, i === 7); F.push(g); }
  const lus = piece(o, [2, -0.6, 0.4]), R = [];
  for (let i = 0; i < 6; i++) { const g = new T.Group(); g.position.set(1.25, -0.7 + i * 0.06, 0); g.rotation.y = (i % 3 - 1) * 0.05; lus.g.add(g); feuille(g, true); R.push(g); }
  /* le portique : un cadre, et le plan de lecture qui balaie la feuille */
  const port = piece(o, [0, -1.8, 0.6]); const H = 0.62;
  port.g.add(trait([[0, -0.72, -0.55], [0, -0.72 + H, -0.55], [0, -0.72 + H, 0.55], [0, -0.72, 0.55]], o.m.l));
  port.g.add(trait([[-0.12, -0.72 + H, -0.55], [0.12, -0.72 + H, -0.55], [0.12, -0.72 + H, 0.55], [-0.12, -0.72 + H, 0.55]], o.m.l, true));
  const plan = new T.Group(); port.g.add(plan); plan.add(trait([[0, 0, -0.5], [0, 0, 0.5]], o.m.a)); plan.add(traits([[0, 0, -0.5], [0, H - 0.02, -0.5], [0, 0, 0.5], [0, H - 0.02, 0.5]], o.m.d));
  const vole = new T.Group(); o.g.add(vole); feuille(vole, true);
  /* le graphe : de grandes entités (personnes, lieux, dates, sociétés) reliées au-dessus */
  const gr = piece(o, [0, 2.2, -0.4]), N = [];
  const NP = [[0, 0.95, 0], [-0.75, 0.7, 0.25], [0.8, 0.75, -0.2], [-0.35, 1.4, -0.3], [0.45, 1.45, 0.2], [-1.25, 1.15, -0.1], [1.3, 1.2, 0.15], [0.05, 1.85, 0.05], [-0.95, 1.75, 0.3], [0.95, 1.8, -0.3], [-0.2, 0.45, -0.45], [0.55, 0.3, 0.35]];
  const FORMES = [() => new T.OctahedronGeometry(0.11), () => new T.BoxGeometry(0.13, 0.13, 0.13), () => new T.TetrahedronGeometry(0.11), () => new T.OctahedronGeometry(0.08)];
  NP.forEach((p, i) => { const g = new T.Group(); g.position.set(...p); gr.g.add(g); solide(g, FORMES[i % 4](), i === 0 ? o.m.a : o.m.l, 1); g.add(trait(cercleH(0.17, 28), o.m.s, true)); N.push(g); });
  const AR = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6], [3, 7], [4, 7], [1, 3], [2, 4], [5, 8], [3, 8], [6, 9], [4, 9], [1, 10], [0, 10], [2, 11], [0, 11], [8, 7], [9, 7]];
  const E = []; AR.forEach(([a, b]) => E.push(NP[a], NP[b])); const lien = traits(E, o.m.d); gr.g.add(lien);
  const vif = segments(AR.length, o.m.a); gr.g.add(vif.l);   // les liens qui viennent de naître s'allument
  const monte = points(12, o.m.pa); o.g.add(monte.p);
  let lu = -1, ne = 0;
  o.tick = (t, v) => {
    const k = sm(v.loc * 1.6), T0 = t * 0.42, cyc = Math.floor(T0), u = T0 - cyc;
    if (cyc !== lu) { lu = cyc; ne = Math.min(NP.length, ne + 2); }
    const vis = Math.max(1, Math.min(NP.length, Math.round(ne * (0.35 + 0.65 * k))));
    /* la feuille : se lève de la pile, glisse sous le portique, se pose sur la pile lue */
    const top = [-1.25, -0.7 + 8 * 0.06, 0], bas = [1.25, -0.7 + 6 * 0.06, 0];
    let x, y; if (u < 0.2) { const e = sm(u / 0.2); x = lerp(top[0], -0.6, e); y = top[1] + Math.sin(e * Math.PI) * 0.25; }
    else if (u < 0.7) { const e = (u - 0.2) / 0.5; x = lerp(-0.6, 0.6, e); y = -0.5; }
    else { const e = sm((u - 0.7) / 0.3); x = lerp(0.6, bas[0], e); y = lerp(-0.5, bas[1], e) + Math.sin(e * Math.PI) * 0.2; }
    vole.position.set(x, y, 0); vole.rotation.z = u < 0.2 ? -0.25 * Math.sin(u / 0.2 * Math.PI) : 0; vole.rotation.y = Math.sin(t) * 0.05;
    F[7].visible = u > 0.95; R[5].visible = u > 0.95 || u < 0.02;
    const lit = u > 0.2 && u < 0.7; plan.position.set(lit ? x : 0, -0.72, 0);
    /* les entités lues montent vers leur place dans le graphe */
    for (let i = 0; i < 12; i++) { const d = NP[i], w = c01((u - 0.3 - (i % 4) * 0.08) / 0.5), on = lit || (u >= 0.7 && w < 1);
      monte.pos.set(on && i < vis && w > 0 ? [lerp(x, d[0], sm(w)), lerp(-0.45, d[1] + 0.3, sm(w)), lerp(0, d[2], sm(w))] : [0, -9, 0], i * 3); }
    monte.a.needsUpdate = true;
    N.forEach((g, i) => { const s = c01((vis - i) * 1.2); g.scale.setScalar(s * (1 + 0.25 * Math.max(0, Math.sin(t * 3 - i)))); g.rotation.y = t * 0.6 + i; });
    const ok = AR.map(([a, b]) => a < vis && b < vis); let nE = 0; ok.forEach((b, j) => { if (b) nE = j + 1; }); lien.geometry.setDrawRange(0, nE * 2);
    AR.forEach(([a, b], j) => { const neuf = ok[j] && (b === vis - 1 || a === vis - 1), e = neuf ? sm(u * 2) : 0;
      vif.pos.set(neuf ? [...NP[a], NP[a][0] + (NP[b][0] - NP[a][0]) * e, NP[a][1] + (NP[b][1] - NP[a][1]) * e, NP[a][2] + (NP[b][2] - NP[a][2]) * e] : [0, -9, 0, 0, -9, 0], j * 6); });
    vif.a.needsUpdate = true;
  };
  o.rot = t => [0.3, -0.5 + Math.sin(t * 0.2) * 0.18];
}
function bougies() {   // NumerusX : des chandeliers, des agents qui les lisent, une stratégie qui évolue
  const o = objet('bougies', { s: 0.8 });
  sol(o, -0.64, 2.8, 0.3); const socle = piece(o, [0, -1.6, 0.3]); socle.g.add(trait([[-1.3, -0.62, -0.35], [1.3, -0.62, -0.35], [1.3, -0.62, 0.35], [-1.3, -0.62, 0.35]], o.m.s, true));
  { const s = []; for (let i = 0; i <= 6; i++) { const y = -0.6 + i * 0.2; s.push([-1.3, y, -0.35], [1.3, y, -0.35]); } socle.g.add(traits(s, o.m.s)); }
  const B = [], n = 16; let prix = -0.2; const courbe = [], CL = [];
  for (let i = 0; i < n; i++) {
    const ouv = prix, clo = prix + Math.sin(i * 1.7) * 0.16 + (i > 8 ? 0.06 : -0.02), hi = Math.max(ouv, clo) + 0.06 + (i % 3) * 0.03, lo = Math.min(ouv, clo) - 0.05 - (i % 2) * 0.04; prix = clo;
    const x = -1.2 + i * 0.16, p = piece(o, [(i - n / 2) * 0.25, (i % 2 ? 1 : -1) * 1.2, 0.8]), g = new T.Group(); g.position.x = x; p.g.add(g);
    const h = Math.max(0.025, Math.abs(clo - ouv)), m = clo >= ouv ? o.m.a : o.m.l;
    solide(g, new T.BoxGeometry(0.07, h, 0.07).translate(0, (ouv + clo) / 2, 0), m); g.add(trait([[0, lo, 0], [0, Math.min(ouv, clo), 0]], o.m.l)); g.add(trait([[0, Math.max(ouv, clo), 0], [0, hi, 0]], o.m.l));
    B.push(g); CL.push(clo); courbe.push([x, (ouv + clo) / 2 + 0.28, 0.2]);
  }
  const strat = piece(o, [0, 1.8, 0.5]); const cl = trait(courbe, o.m.d); strat.g.add(cl);
  /* la profondeur du marché : d'autres séries derrière, de plus en plus pâles, qui s'allument au passage */
  const fonds = [-0.55, -1.1].map((z, r) => { const p = piece(o, [0, -0.5, -1.5 - r]), segs = []; let px = (r - 0.5) * 0.2;
    for (let i = 0; i < 22; i++) { const x = -1.25 + i * 0.12, ouv = px, clo = px + Math.sin(i * 2.3 + r * 4) * 0.14; px = clo; const a = Math.min(ouv, clo), b = Math.max(ouv, clo) + 0.02;
      segs.push([x - 0.025, a, z], [x + 0.025, a, z], [x + 0.025, a, z], [x + 0.025, b, z], [x + 0.025, b, z], [x - 0.025, b, z], [x - 0.025, b, z], [x - 0.025, a, z], [x, a - 0.05, z], [x, a, z], [x, b, z], [x, b + 0.05, z]); }
    const l = traits(segs, o.m.s); p.g.add(l); return p; });
  const rayons = segments(3, o.m.a); o.g.add(rayons.l);   // chaque agent lit la dernière bougie
  const ag = piece(o, [0, 2.2, -0.5]), A = []; for (let i = 0; i < 3; i++) { const g = new T.Group(); ag.g.add(g); solide(g, new T.OctahedronGeometry(0.07), i === 0 ? o.m.a : o.m.l, 1); g.add(trait(cercleH(0.13, 24), o.m.s, true)); A.push(g); }
  /* l'évolution : devant la dernière bougie, une génération de stratégies s'ouvre en éventail vers nous ; les moins bonnes tombent, la meilleure s'allume et engendre la suivante */
  const NP = 8, NK = 6, pop = segments(NP * NK, o.m.s), elu = segments(NK, o.m.a); o.g.add(pop.l, elu.l);
  let gen = -1, G = [], best = { d: 0.4, f: 2.2 };
  const genere = g => { let r = Math.sin(g * 91.7) * 43758.5; const al = () => { r = Math.sin(r) * 43758.5; return r - Math.floor(r); };
    G = Array.from({ length: NP }, (_, j) => ({ d: best.d + (al() - 0.5) * 1.2, f: best.f + (al() - 0.5) * 1.5, ph: al() * TAU, z: (j / (NP - 1) - 0.5) * 1.6 }));
    G.forEach(c => { c.y = k2 => c.d * k2 * 0.05 + Math.sin(k2 * c.f * 0.5 + c.ph) * 0.07 * Math.min(1, k2 / 2); c.fit = c.y(NK); });
    G.forEach((c, j) => { c.j = j; }); G.best = G.reduce((m, c) => c.fit > m.fit ? c : m, G[0]); };
  o.tick = (t, v) => {
    const k = 0.25 + 0.75 * sm(v.loc * 1.7), vis = Math.ceil(k * n);
    B.forEach((g, i) => { g.visible = i < vis; g.scale.y = i === vis - 1 ? 0.6 + 0.4 * ((t * 1.5) % 1) : 1; });
    cl.geometry.setDrawRange(0, vis);
    { const DUR = 3.4, g = Math.floor(t / DUR), ph = (t / DUR) % 1; if (g !== gen) { if (G.best) best = { d: G.best.d, f: G.best.f }; gen = g; genere(g); }
      const b0 = B[Math.max(0, vis - 1)], x0 = b0.position.x, y0 = CL[Math.max(0, vis - 1)], pousse = c01(ph / 0.45) * NK, chute = c01((ph - 0.72) / 0.28), on = o.op > 0.02;
      G.forEach((c, j) => { const lui = c === G.best; for (let k2 = 0; k2 < NK; k2++) { const vu = on && k2 < pousse, e = Math.min(1, pousse - k2), dy = lui ? 0 : -chute * chute * 0.9;
        const P0 = [x0 + k2 * 0.075, y0 + c.y(k2) + dy, c.z * k2 / NK], P1 = [x0 + (k2 + e) * 0.075, y0 + c.y(k2 + e) + dy, c.z * (k2 + e) / NK];
        pop.pos.set(vu && !(lui && ph > 0.6) ? [...P0, ...P1] : [0, -99, 0, 0, -99, 0], (j * NK + k2) * 6);
        if (lui) elu.pos.set(vu && ph > 0.6 ? [...P0, ...P1] : [0, -99, 0, 0, -99, 0], k2 * 6); } });
      pop.a.needsUpdate = true; elu.a.needsUpdate = true; }

    A.forEach((g, i) => { const a = t * 0.5 + i * TAU / 3, x = Math.cos(a) * 0.9; g.position.set(x, 0.75 + Math.sin(t * 1.2 + i) * 0.05, Math.sin(a) * 0.35); g.rotation.y = t; });
    const cible = B[Math.max(0, vis - 1)]; A.forEach((g, i) => { const on = (t * 0.7 + i / 3) % 1 < 0.35; rayons.pos.set(on ? [g.position.x, g.position.y, g.position.z, cible.position.x, 0.2, 0] : [0, -9, 0, 0, -9, 0], i * 6); }); rayons.a.needsUpdate = true;
  };
  o.rot = t => [0.3, -0.45 + Math.sin(t * 0.25) * 0.15];
}
function reseau() {   // NumOSINT : une question entre, l'orchestrateur la confie à huit outils, chacun fouille le web ouvert, les résultats remontent et se recoupent dans le dossier
  const o = objet('reseau', { s: 0.86 });
  sol(o, -0.85, 3, 0.3);
  const coeur = piece(o, [0, 0, 2.2]); boule(o, coeur.g, 0.2, o.m.a); const halo = trait(cercleH(0.34, 48), o.m.s, true); coeur.g.add(halo);
  const S = [], C = [], BAR = [], segs = [], RA = 1.15;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, x = Math.cos(a) * RA, z = Math.sin(a) * RA, y = (i % 2 ? 0.1 : -0.1), p = piece(o, [x * 1.8, y * 6, z * 1.8]), g = new T.Group(); g.position.set(x, y, z); g.rotation.y = -a; p.g.add(g);
    solide(g, new T.BoxGeometry(0.24, 0.16, 0.18).translate(0, 0, 0), o.m.l);   // le conteneur
    const cap = new T.Group(); cap.position.set(-0.12, 0.08, 0); g.add(cap); solide(cap, new T.BoxGeometry(0.24, 0.02, 0.18).translate(0.12, 0.01, 0), o.m.l);   // son couvercle, charnière d'un côté
    const bar = new T.Group(); bar.position.set(-0.1, -0.03, 0.091); g.add(bar); bar.add(trait([[0, 0, 0], [0.2, 0, 0]], o.m.a)); g.add(trait([[-0.1, -0.03, 0.091], [0.1, -0.03, 0.091]], o.m.s));
    S.push(g); C.push(cap); BAR.push(bar); segs.push([0, 0, 0], [x, y, z]);
  }
  const fils = piece(o, [0, -2, 0]); fils.g.add(traits(segs, o.m.d));
  /* le web ouvert autour : des points qu'on va chercher */
  const ext = []; for (let i = 0; i < 110; i++) { const u = rnd() * TAU, r = 1.7 + rnd() * 0.5; ext.push([Math.cos(u) * r, -0.3 + rnd() * 0.9, Math.sin(u) * r]); }
  const nu = points(110, o.m.p); ext.forEach((p, i) => nu.pos.set(p, i * 3)); nu.a.needsUpdate = true; const cl = piece(o, [0, 0, -2.5]); cl.g.add(nu.p);
  const cib = S.map((g, i) => { const a = i / 8 * TAU; let best = 0, bd = 9; ext.forEach((p, j) => { const d = Math.hypot(p[0] - Math.cos(a) * 2, p[2] - Math.sin(a) * 2) + j * 1e-4; if (d < bd) { bd = d; best = j; } }); return ext[best]; });
  /* le dossier : un tableau d'enquête au-dessus, où les résultats se rangent et se recoupent */
  const dos = piece(o, [0, 2.4, 0]); const DY = 1.05;
  dos.g.add(trait([[-0.75, DY - 0.35, 0], [0.75, DY - 0.35, 0], [0.75, DY + 0.35, 0], [-0.75, DY + 0.35, 0]], o.m.l, true));
  dos.g.add(trait([[-0.75, DY + 0.22, 0], [0.75, DY + 0.22, 0]], o.m.s));
  const CASE = []; for (let i = 0; i < 8; i++) CASE.push([-0.56 + (i % 4) * 0.37, DY + 0.02 - Math.floor(i / 4) * 0.25, 0.01]);
  const RECOUPE = [[0, 5], [1, 2], [2, 7], [3, 4], [5, 6]];   // les résultats qui se confirment l'un l'autre
  const croix = segments(RECOUPE.length, o.m.a); dos.g.add(croix.l);
  const cases = segments(8, o.m.l); dos.g.add(cases.l);
  const imp = points(9, o.m.pa); o.g.add(imp.p);
  o.tick = (t, v) => {
    const u = (t * 0.22) % 1, k = sm(v.loc * 1.6), P = (x, y, z, i) => imp.pos.set([x, y, z], i * 3);
    /* 0-0.12 : la question tombe au centre */
    P(0, u < 0.12 ? lerp(1.4, 0, sm(u / 0.12)) : -9, 0, 8);
    halo.scale.setScalar(1 + (u > 0.1 && u < 0.2 ? Math.sin((u - 0.1) / 0.1 * Math.PI) * 0.6 : 0));
    for (let i = 0; i < 8; i++) {
      const s = S[i].position, c = cib[i], d = i * 0.012, w = u - d; let q = null;
      if (w > 0.14 && w < 0.26) { const e = sm((w - 0.14) / 0.12); q = [s.x * e, s.y * e, s.z * e]; }                        // la requête part vers l'outil
      else if (w >= 0.3 && w < 0.42) { const e = sm((w - 0.3) / 0.12); q = [lerp(s.x, c[0], e), lerp(s.y, c[1], e) + Math.sin(e * Math.PI) * 0.2, lerp(s.z, c[2], e)]; }   // l'outil fouille le web
      else if (w >= 0.42 && w < 0.52) { const e = sm((w - 0.42) / 0.1); q = [lerp(c[0], s.x, e), lerp(c[1], s.y, e), lerp(c[2], s.z, e)]; }
      else if (w >= 0.58 && w < 0.74) { const e = sm((w - 0.58) / 0.16), cs = CASE[i]; q = [lerp(s.x, cs[0], e), lerp(s.y, cs[1], e) + Math.sin(e * Math.PI) * 0.5, lerp(s.z, cs[2], e)]; }   // le résultat monte au dossier
      P(...(q || [0, -9, 0]), i);
      const trav = c01((w - 0.26) / 0.04) * (1 - c01((w - 0.56) / 0.04)); C[i].rotation.z = trav * 1.1;
      BAR[i].scale.x = Math.max(0.001, c01((w - 0.26) / 0.3)) * (w < 0.95 ? 1 : 0.001);
      S[i].position.y = (i % 2 ? 0.1 : -0.1) + trav * Math.sin(t * 9 + i) * 0.015;
      const f = CASE[i], on = w >= 0.74 && w < 0.98; const h = 0.07;   // la fiche rangée dans sa case
      cases.pos.set(on ? [f[0] - h, f[1], f[2], f[0] + h, f[1], f[2]] : [0, -9, 0, 0, -9, 0], i * 6);
    }
    cases.a.needsUpdate = true; imp.a.needsUpdate = true;
    RECOUPE.forEach(([a, b], j) => { const e = c01((u - 0.8 - j * 0.02) / 0.1) * (u < 0.98 ? 1 : 0), A = CASE[a], B = CASE[b];
      croix.pos.set(e > 0 ? [...A, lerp(A[0], B[0], sm(e)), lerp(A[1], B[1], sm(e)), 0.01] : [0, -9, 0, 0, -9, 0], j * 6); });
    croix.a.needsUpdate = true;
    coeur.g.scale.setScalar(1 + Math.sin(t * 3) * 0.03 + k * 0);
  };
  o.rot = t => [0.4, -0.35 + Math.sin(t * 0.15) * 0.25];
}
function caviarde() {   // SafeShare : on dépose le document, le repérage passe, les masques se posent, l'agent IA les ajuste sans voir les valeurs, la copie aplatie sort ; tout reste dans le navigateur
  const o = objet('caviarde', { s: 0.95 });
  const w = 0.95, h = 1.25, nav = piece(o, [0, 0, -2]);
  nav.g.add(trait([[-w, -h, -0.05], [w, -h, -0.05], [w, h, -0.05], [-w, h, -0.05]], o.m.l, true)); nav.g.add(trait([[-w, h - 0.14, -0.05], [w, h - 0.14, -0.05]], o.m.s));
  [0, 1, 2].forEach(i => nav.g.add(trait(cercle(0.025, 12).map(p => [p[0] - w + 0.1 + i * 0.08, p[1] + h - 0.07, -0.05]), o.m.s, true)));
  const page = piece(o, [0, 0, 1.5]), pg = new T.Group(); page.g.add(pg); solide(pg, new T.BoxGeometry(1.3, 1.7, 0.02).translate(0, -0.1, 0), o.m.l);
  const L = [], M = [], sens = [1, 4, 6, 9];
  for (let i = 0; i < 11; i++) { const y = 0.6 - i * 0.13, ww = i === 0 ? 0.6 : 1.0 - (i % 4) * 0.12; L.push([-0.52, y, 0.012], [-0.52 + ww, y, 0.012]);
    if (sens.includes(i)) { const x0 = -0.52 + ww * 0.35, x1 = -0.52 + ww * 0.8, g = new T.Group(); g.position.set((x0 + x1) / 2, y, 0.02); pg.add(g);
      const mk = new T.Mesh(new T.PlaneGeometry(x1 - x0, 0.085), new T.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9, depthWrite: false })); mk.renderOrder = 2; g.add(mk);
      const cad = trait([[-(x1 - x0) / 2 - 0.02, -0.06, 0.004], [(x1 - x0) / 2 + 0.02, -0.06, 0.004], [(x1 - x0) / 2 + 0.02, 0.06, 0.004], [-(x1 - x0) / 2 - 0.02, 0.06, 0.004]], o.m.a, true); g.add(cad); M.push({ g, mk, cad, w: x1 - x0, y }); } }
  pg.add(traits(L, o.m.s));
  const scan = trait([[-0.66, 0, 0.03], [0.66, 0, 0.03]], o.m.a); pg.add(scan);
  /* l'agent IA, hors du document : ses fils s'arrêtent au bord des masques */
  const ag = piece(o, [2, 1, 0]), agent = new T.Group(); agent.position.set(1.35, 0.55, 0.3); ag.g.add(agent); solide(agent, new T.OctahedronGeometry(0.1), o.m.l, 1); agent.add(trait(cercleH(0.17, 32), o.m.s, true));
  const fils = segments(4, o.m.d); o.g.add(fils.l);
  /* la copie aplatie qui sort, et le cadenas : rien ne quitte le navigateur */
  const cp = piece(o, [2, -1, 0]), copie = new T.Group(); cp.g.add(copie); copie.add(trait([[-0.45, -0.6, 0], [0.45, -0.6, 0], [0.45, 0.6, 0], [-0.45, 0.6, 0]], o.m.l, true));
  { const s2 = []; for (let i = 0; i < 8; i++) { const y = 0.45 - i * 0.13; s2.push([-0.35, y, 0.01], [0.3 - (i % 3) * 0.1, y, 0.01]); } copie.add(traits(s2, o.m.s)); [1, 3, 5].forEach(i => { const y = 0.45 - i * 0.13; copie.add(traits([[-0.1, y, 0.012], [0.15, y, 0.012], [-0.1, y + 0.02, 0.012], [0.15, y + 0.02, 0.012], [-0.1, y - 0.02, 0.012], [0.15, y - 0.02, 0.012]], o.m.a)); }); }
  const cad = piece(o, [1.8, -1, 0.5]), c = new T.Group(); c.position.set(0.85, -0.95, 0.1); cad.g.add(c); solide(c, new T.BoxGeometry(0.2, 0.16, 0.06), o.m.l);
  c.add(trait(cercle(0.065, 24).filter(p => p[1] >= 0).map(p => [p[0], p[1] + 0.08, 0]), o.m.l));
  /* les valeurs sensibles : sous chaque masque, elles se défont en poussière qui rebondit contre le cadre du navigateur ; rien ne sort */
  const NV = 72, pv = points(NV, o.m.pa); nav.g.add(pv.p); const PV = Array.from({ length: NV }, () => ({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, on: 0 })); let tp = null;
  sol(o, -h - 0.02, 2.2, 0.25, nav.g);
  o.tick = (t, v) => {
    const u = (t * 0.1) % 1;
    const tombe = sm(u / 0.1); pg.position.set(0, (1 - tombe) * 1.4, (1 - tombe) * 0.4); pg.rotation.z = (1 - tombe) * 0.25;
    const ks = c01((u - 0.12) / 0.3), yS = lerp(0.72, -0.8, ks); scan.visible = ks > 0 && ks < 1; scan.position.y = yS;
    M.forEach((m, i) => { const vu = ks >= 1 || yS < m.y, pose = c01((u - 0.45 - i * 0.03) / 0.08), ret = u > 0.97;
      m.cad.visible = vu && pose < 1 && !ret; m.mk.visible = pose > 0 && !ret; m.mk.scale.x = Math.max(0.001, pose); m.mk.position.x = -m.w / 2 * (1 - pose); m.mk.material.opacity = 0.85 * o.op;
      const f = c01((u - 0.6 - i * 0.03) / 0.06) * (1 - c01((u - 0.78) / 0.04)), mp = V(m.g.position.x + m.w / 2 + 0.03, m.y + pg.position.y, 0.03);
      fils.pos.set(f > 0 ? [agent.position.x, agent.position.y, agent.position.z, lerp(agent.position.x, mp.x, f), lerp(agent.position.y, mp.y, f), lerp(agent.position.z, mp.z, f)] : [0, -99, 0, 0, -99, 0], i * 6);
      if (f > 0.9) m.g.scale.x = 1 + 0.12 * Math.sin((u - 0.6) * 80) * (1 - c01((u - 0.74) / 0.04)); else m.g.scale.x = 1; });
    { const dt = tp === null ? 0 : Math.min(0.05, t - tp); tp = t;
      PV.forEach((q, i) => { const m = M[i % M.length], pose = c01((u - 0.45 - (i % M.length) * 0.03) / 0.08);
        if (u < 0.44 || u > 0.985) { q.on = 0; pv.pos.set([0, -99, 0], i * 3); return; }
        if (!q.on && pose > 0.3) { q.on = 1; q.x = m.g.position.x + (rnd() - 0.5) * m.w; q.y = m.y + pg.position.y; q.z = 0.05; const a = rnd() * TAU, sp = 0.35 + rnd() * 0.5; q.vx = Math.cos(a) * sp; q.vy = Math.sin(a) * sp + 0.2; q.vz = (rnd() - 0.3) * 0.3; }
        if (!q.on) { pv.pos.set([0, -99, 0], i * 3); return; }
        q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
        if (Math.abs(q.x) > w - 0.04) { q.vx = -q.vx; q.x = Math.sign(q.x) * (w - 0.04); } if (q.y > h - 0.18 || q.y < -h + 0.04) { q.vy = -q.vy; q.y = Math.max(-h + 0.04, Math.min(h - 0.18, q.y)); } if (q.z < -0.04 || q.z > 0.35) q.vz = -q.vz;
        pv.pos.set([q.x, q.y, q.z], i * 3); }); pv.a.needsUpdate = true; }
    fils.a.needsUpdate = true; fils.l.computeLineDistances(); agent.rotation.y = t * 1.2; agent.position.y = 0.55 + Math.sin(t * 1.5) * 0.05;
    const e = sm((u - 0.8) / 0.14); copie.visible = u > 0.8; copie.position.set(lerp(0, 1.45, e), lerp(-0.1, -0.35, e), lerp(0.05, 0.4, e)); copie.rotation.y = -e * 0.4;
    c.scale.setScalar(1 + (u > 0.8 && u < 0.86 ? 0.2 * Math.sin((u - 0.8) / 0.06 * Math.PI) : 0));
  };
  o.rot = t => [0.18 + Math.sin(t * 0.3) * 0.05, -0.4 + Math.sin(t * 0.22) * 0.2];
}
function preuve(M) {
  const o = objet('preuve', { s: 0.9, pl: { x: 0.245, y: 0.04, s: 0.92 }, plT: { y: 0.25, s: 1.0 } }); let t0 = null;
  const L = [0, 1, 2, 3, 4].map(() => { const m = matieres(); MATS.push(m); return m; }), f = [0, 0, 0, 0, 0];
  const pc = piece(o, [0, 0, 0], [0, 0, 0], { fond: true }), R = new T.Group(); pc.g.add(R); sol(o, -0.5, 2.4, 0.2, R);
  /* 0 · 1 — la ville des jours */
  const J = M.jours, NJ = J.length, d0 = M.d0 || 1, NC = Math.ceil((NJ + d0) / 7), maxJ = Math.max(...J), pic = J.indexOf(maxJ), ville = new T.Group(); R.add(ville);
  const ex = 0.075, x0 = -(NC - 1) * ex / 2, COL = [];
  ville.add(traits([[x0 - 0.06, -0.5, -0.3], [-x0 + 0.06, -0.5, -0.3], [x0 - 0.06, -0.5, 0.3], [-x0 + 0.06, -0.5, 0.3]], L[0].s));
  (M.mois || []).forEach(mo => { const c = Math.floor((mo.j + d0) / 7), x = x0 + c * ex - ex / 2; ville.add(trait([[x, -0.5, 0.3], [x, -0.5, 0.4]], L[0].s)); });
  for (let i = 0; i < NJ; i++) {
    if (!J[i]) { COL.push(null); continue; }
    const c = Math.floor((i + d0) / 7), r = (i + d0) % 7, g = new T.Group(); g.position.set(x0 + c * ex, -0.5, -0.24 + r * 0.08); ville.add(g);
    const juil = M.juillet && i >= M.juillet[0] && i <= M.juillet[1];
    solide(g, new T.BoxGeometry(0.055, 1, 0.055).translate(0, 0.5, 0), i === pic ? L[1].a : juil ? L[1].l : L[0].l);
    g.scale.y = 0.001; COL.push({ g, h: 1.25 * Math.sqrt(J[i] / maxJ), i, juil });
  }
  const phare = new T.Group(); ville.add(phare); { const c = COL[pic]; if (c) { phare.position.set(c.g.position.x, -0.5 + c.h + 0.1, c.g.position.z); phare.add(trait(cercle(0.06, 32), L[1].a, true)); phare.add(trait([[0, -0.08, 0], [0, 0.25, 0]], L[1].d)); } }
  /* 2 — l'horloge de 24 heures */
  const hor = new T.Group(); hor.position.y = -0.5; R.add(hor); const HH = M.heures, maxH = Math.max(...HH), BH = [];
  hor.add(trait(cercleH(0.95, 96), L[2].s, true)); hor.add(trait(cercleH(0.55, 72), L[2].s, true));
  for (let h = 0; h < 24; h++) { const a = h / 24 * TAU - Math.PI / 2, g = new T.Group(); g.position.set(Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75); g.rotation.y = -a; hor.add(g);
    solide(g, new T.BoxGeometry(0.1, 1, 0.06).translate(0, 0.5, 0), h < 6 ? L[2].a : L[2].l); g.scale.y = 0.001; BH.push({ g, h: 0.9 * HH[h] / maxH });
    hor.add(trait([[Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95], [Math.cos(a) * 1.02, 0, Math.sin(a) * 1.02]], L[2].s)); }
  const aiguille = trait([[0, 0.01, 0], [0.98, 0.01, 0]], L[2].a); hor.add(aiguille);
  const NET = 60, etin = points(NET, L[2].pa); hor.add(etin.p);   // chaque barre que l'aiguille franchit lâche des commits, au prorata de son heure
  /* 3 — deux tours : le produit (1,2 M de lignes), ses tests (0,9 M) ; une dalle = 100 000 lignes */
  const tours = new T.Group(); tours.position.y = -0.5; R.add(tours); const DAL = [];
  [[-0.38, 12, L[3].l], [0.38, 9, L[3].a]].forEach(([x, n, m], j) => { for (let k = 0; k < n; k++) { const g = new T.Group(); g.position.set(x, k * 0.085, 0); tours.add(g); solide(g, new T.BoxGeometry(0.46, 0.07, 0.46).translate(0, 0.035, 0), m); DAL.push({ g, k, j }); } });
  tours.add(trait([[-0.75, 0, 0.4], [0.75, 0, 0.4]], L[3].s));
  const liens = segments(9, L[3].d); tours.add(liens.l);   // chaque étage de tests est relié à l'étage de code qu'il couvre
  const grue = new T.Group(); tours.add(grue); grue.add(trait([[-0.38, 0, 0], [-0.38, 0.35, 0], [0.38, 0.35, 0], [0.38, 0, 0]], L[3].s)); const cable = segments(2, L[3].l); grue.add(cable.l);
  /* 4 — l'anneau : 100 crans, 95 pour moi et mes agents */
  const ann = new T.Group(); ann.position.y = -0.1; R.add(ann); const CR = [];
  for (let k = 0; k < 100; k++) { const a = k / 100 * TAU - Math.PI / 2, g = new T.Group(); g.position.set(Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85); g.rotation.y = -a; ann.add(g);
    solide(g, new T.BoxGeometry(0.03, 0.14, 0.02).translate(0, 0.07, 0), k < 95 ? L[4].a : L[4].l); g.scale.y = 0.001; CR.push(g); }
  ann.add(trait(cercleH(0.72, 96), L[4].s, true)); { const c = new T.Group(); c.position.y = 0.05; ann.add(c); boule(o, c, 0.12, L[4].a); }
  const AG = []; for (let i = 0; i < 6; i++) { const g = new T.Group(); ann.add(g); solide(g, new T.OctahedronGeometry(0.045), L[4].l, 1); AG.push(g); }   // mes agents, en orbite autour de moi
  const tirs = segments(8, L[4].a); ann.add(tirs.l);   // chaque cran posé part du centre (moi et mes agents) ; les 5 derniers viennent de l'extérieur
  /* la caméra de chaque étape : [rx, ry, zoom] */
  const VUE = [[0.42, -0.5, 0.95], [0.32, -0.3, 1.0], [0.95, 0.2, 1.05], [0.3, -0.6, 1.05], [1.05, 0, 1.05], [0.5, -0.4, 0.95]];
  const cam = { rx: 0.4, ry: -0.5, z: 1 };
  o.rot = t => [cam.rx, cam.ry + Math.sin(t * 0.15) * 0.05];
  o.tick = (t, v) => {
    const pas = v.pas === undefined ? 5 : v.pas, S = Math.min(5, Math.floor(pas)), k = i => c01(pas - i);
    const ec = t0 === null ? 0.05 : Math.min(0.2, Math.max(0, t - t0)); t0 = t; const dt = 1 - Math.exp(-ec * 4), df = 1 - Math.exp(-ec * 6);   /* au temps, pas à l'image : pareil sur une machine lente */
    const vis = [S <= 1 ? 1 : 0, S === 1 ? 1 : 0, S === 2 ? 1 : 0, S === 3 ? 1 : 0, S >= 4 ? 1 : 0];
    for (let i = 0; i < 5; i++) { f[i] = lerp(f[i], vis[i], df); chaud(L[i], S === i && i !== 1 ? 0.2 : 0); opac(L[i], o.op * f[i]); }
    ville.visible = f[0] > 0.01 || f[1] > 0.01; hor.visible = f[2] > 0.01; tours.visible = f[3] > 0.01; ann.visible = f[4] > 0.01;
    const V1 = VUE[S], V2 = VUE[Math.min(5, S + 1)], u = sm(fen(pas - S, 0.8, 1));
    cam.rx = lerp(cam.rx, lerp(V1[0], V2[0], u), dt); cam.ry = lerp(cam.ry, lerp(V1[1], V2[1], u), dt); cam.z = lerp(cam.z, lerp(V1[2], V2[2], u), dt); R.scale.setScalar(cam.z);
    /* 0 : les jours montent dans l'ordre ; 1 : juillet ressort */
    const front = pas >= 1 ? NJ : NJ * sm(k(0) * 1.3), k1 = S >= 1 ? 1 : 0;
    COL.forEach(c => { if (!c) return; const on = c01((front - c.i) / 12), h = S >= 2 ? 0.001 : c.h * sm(on) * (S === 1 && !c.juil ? 0.55 : 1); c.g.scale.y = Math.max(0.001, lerp(c.g.scale.y, h, df)); });
    phare.visible = k1 > 0 && S <= 1 && (t % 1.2) > 0.3; phare.rotation.y = t;
    /* 2 : l'horloge */
    const k2 = S >= 2 ? sm(k(2) * 1.5) : 0; BH.forEach((b, i) => { const e = sm(k2 * 2 - i / 24); b.g.scale.y = Math.max(0.001, b.h * e); }); aiguille.rotation.y = -t * 0.9;
    for (let i = 0; i < NET; i++) { const u = (t * 0.7 + i / NET) % 1, tb = t - u / 0.7, a = tb * 0.9, h = ((Math.floor((a + Math.PI / 2) / TAU * 24) % 24) + 24) % 24, b = BH[h];
      const vu = f[2] > 0.05 && k2 > 0.5 && Math.abs(Math.sin(i * 12.9898 + Math.floor(tb / 7) * 3.1)) < HH[h] / maxH, r = 0.75 + u * 0.18, aa = a + (Math.sin(i * 7.1) * 0.06);
      etin.pos.set(vu ? [Math.cos(aa) * r, b.g.scale.y + u * 0.7, Math.sin(aa) * r] : [0, -99, 0], i * 3); } etin.a.needsUpdate = true;
    /* 3 : les tours, dalle par dalle */
    const k3 = S >= 3 ? k(3) : 0, H3 = [0, 0];
    DAL.forEach(d => { const e = c01(k3 * 14 - d.k * 0.9 - d.j * 0.5), y0 = d.k * 0.085; d.g.visible = e > 0.02; if (e >= 1) H3[d.j] = Math.max(H3[d.j], d.k + 1);
      const ch = e < 0.7 ? 1 - sm(e / 0.7) : Math.abs(Math.sin((e - 0.7) / 0.3 * Math.PI)) * 0.05 * (1 - e) / 0.3;   // la dalle tombe, rebondit, se pose
      d.g.position.y = y0 + ch * 1.1; d.g.rotation.y = (1 - sm(e)) * (d.j ? -0.8 : 0.8); });
    for (let n = 0; n < 9; n++) { const on = n < Math.min(H3[0], H3[1]) && f[3] > 0.05, y = n * 0.085 + 0.035, a = (t * 1.5 + n * 0.3) % 1; liens.pos.set(on ? [-0.15, y, 0.1, lerp(-0.15, 0.15, a < 0.5 ? a * 2 : 1), y, 0.1] : [0, -99, 0, 0, -99, 0], n * 6); } liens.a.needsUpdate = true;
    { const top = Math.max(H3[0], H3[1]) * 0.085; grue.position.y = top + 0.2; cable.pos.set([-0.38, 0.35, 0, -0.38, 0.35 - 0.2 - 0.3 * ((t * 0.7) % 1), 0, 0.38, 0.35, 0, 0.38, 0.35 - 0.2 - 0.3 * ((t * 0.7 + 0.5) % 1), 0], 0); cable.a.needsUpdate = true; grue.visible = f[3] > 0.05 && k3 < 0.999; }
    /* 4 : l'anneau, cran par cran */
    const k4 = S >= 4 ? k(4) : 0; let nt = 0;
    CR.forEach((g, i) => { const b = k4 * 3 - i / 100 * 1.6, e = sm(b); g.scale.y = Math.max(0.001, e * (i < 95 ? 1 + 0.15 * Math.sin(t * 3 + i * 0.3) : 0.6));
      if (b > -0.25 && b < 0 && nt < 8 && f[4] > 0.05) { const w = 1 + b / 0.25, a = i / 100 * TAU - Math.PI / 2, P = [Math.cos(a) * 0.85, 0.07, Math.sin(a) * 0.85], O = i < 95 ? [0, 0.05, 0] : [Math.cos(a) * 1.6, 0.07, Math.sin(a) * 1.6];
        tirs.pos.set([lerp(O[0], P[0], Math.max(0, w - 0.25)), lerp(O[1], P[1], w), lerp(O[2], P[2], Math.max(0, w - 0.25)), lerp(O[0], P[0], w), lerp(O[1], P[1], w), lerp(O[2], P[2], w)], nt * 6); nt++; } });
    for (; nt < 8; nt++) tirs.pos.set([0, -99, 0, 0, -99, 0], nt * 6); tirs.a.needsUpdate = true;
    AG.forEach((g, i) => { const a = t * 0.9 + i * TAU / 6; g.position.set(Math.cos(a) * 0.3, 0.05 + Math.sin(t * 2 + i) * 0.04, Math.sin(a) * 0.3); g.rotation.y = t * 2; });
    ann.rotation.y = t * 0.12;
  };
}

function radar() {   // ScanRift : une cible autorisée passée au scanner couche par couche, chaque trouvaille triée par le LLM (les faux positifs tombent), notée, puis validée à la main
  const o = objet('radar', { s: 0.88 });
  sol(o, -0.02, 3, 0.3);
  const CX = -0.6, HT = 0.9;
  /* la cible, et son autorisation accrochée devant (un cadenas) */
  const cible = piece(o, [-2, 0, 0.5]), c = new T.Group(); c.position.x = CX; cible.g.add(c);
  solide(c, new T.BoxGeometry(0.5, HT, 0.5).translate(0, HT / 2, 0), o.m.l);
  { const f = []; for (let y = 0.15; y < HT; y += 0.15) f.push([-0.251, y, 0.251], [0.251, y, 0.251], [0.251, y, 0.251], [0.251, y, -0.251]); c.add(traits(f, o.m.s)); }
  const cad = new T.Group(); cad.position.set(0.16, 0.55, 0.26); c.add(cad); cad.add(trait([[-0.05, 0, 0], [0.05, 0, 0], [0.05, -0.08, 0], [-0.05, -0.08, 0]], o.m.a, true)); cad.add(trait(cercle(0.035, 16).filter(p => p[1] >= 0).map(p => [p[0], p[1], 0]), o.m.a));
  /* le plan de balayage qui monte, et les scanners qui tournent autour */
  const plan = new T.Group(); c.add(plan); plan.add(trait([[-0.34, 0, -0.34], [0.34, 0, -0.34], [0.34, 0, 0.34], [-0.34, 0, 0.34]], o.m.a, true));
  const scs = piece(o, [-1.5, 1.8, -0.5]), SC = []; for (let i = 0; i < 3; i++) { const g = new T.Group(); scs.g.add(g); solide(g, new T.OctahedronGeometry(0.07), o.m.l, 1); SC.push(g); }
  const fx = segments(3, o.m.d); o.g.add(fx.l);
  /* le filtre du LLM : un anneau à traverser */
  const LX = 0.5, LY = 0.55; const len = piece(o, [0, 2, 0]), lens = new T.Group(); lens.position.set(LX, LY, 0); len.g.add(lens);
  lens.add(trait(cercle(0.28, 60).map(p => [0, p[1], p[0]]), o.m.l, true)); lens.add(trait(cercle(0.2, 48).map(p => [0, p[1], p[0]]), o.m.s, true));
  /* les étagères de gravité, et le rapport que l'humain valide */
  const barres = piece(o, [2, 0.5, 0]), B = [], BX = 1.35;
  for (let k = 0; k < 4; k++) { const g = new T.Group(); g.position.set(BX, 0, -0.33 + k * 0.22); g.scale.y = 0.02; barres.g.add(g); solide(g, new T.BoxGeometry(0.11, 1, 0.11).translate(0, 0.5, 0), k < 1 ? o.m.a : o.m.l); B.push(g); }
  const rap = piece(o, [2, 2, 0]), R = new T.Group(); R.position.set(BX, 1.05, 0); rap.g.add(R);
  R.add(trait([[0, -0.2, -0.28], [0, 0.2, -0.28], [0, 0.2, 0.28], [0, -0.2, 0.28]], o.m.l, true)); R.add(traits([[0, 0.1, -0.2], [0, 0.1, 0.1], [0, 0.02, -0.2], [0, 0.02, 0.16], [0, -0.06, -0.2], [0, -0.06, 0.05]], o.m.s));
  const tampon = new T.Group(); R.add(tampon); tampon.add(trait(cercle(0.13, 40).map(p => [0.01, p[1], p[0]]), o.m.a, true)); tampon.add(trait([[0.01, -0.005, -0.06], [0.01, -0.05, -0.015], [0.01, 0.06, 0.07]], o.m.a));
  const N = 14, F = []; for (let i = 0; i < N; i++) F.push({ y: 0.08 + (i / N) * (HT - 0.16), a: rnd() * TAU, faux: i % 3 === 1, g: [0, 1, 2, 3, 1, 2, 3, 2, 3, 3, 1, 2, 3, 2][i] });
  const pts = points(N, o.m.pa); o.g.add(pts.p);
  o.tick = (t, v) => {
    const u = (t * 0.14) % 1, k = sm(v.loc * 1.6), yP = HT * sm(u / 0.45);
    plan.position.y = u < 0.5 ? yP : HT * (1 - sm((u - 0.5) / 0.3)); plan.visible = u < 0.8;
    SC.forEach((g, i) => { const a = t * 0.9 + i * TAU / 3; g.position.set(CX + Math.cos(a) * 0.75, 0.25 + i * 0.28 + Math.sin(t + i) * 0.05, Math.sin(a) * 0.75); g.rotation.y = t * 2;
      fx.pos.set(u < 0.5 ? [g.position.x, g.position.y, g.position.z, CX + Math.cos(a) * 0.3, plan.position.y, Math.sin(a) * 0.3] : [0, -9, 0, 0, -9, 0], i * 6); });
    fx.a.needsUpdate = true;
    const h = [0, 0, 0, 0], nMax = Math.round(N * (0.4 + 0.6 * k));
    F.forEach((f, i) => { const b = 0.45 * Math.acos(1 - 2 * f.y / HT) / Math.PI, w = u - b; let q = null;   // né quand le plan le touche
      const s0 = [CX + Math.cos(f.a) * 0.26, f.y, Math.sin(f.a) * 0.26];
      if (i < nMax && w > 0) {
        if (w < 0.16) { const e = sm(w / 0.16); q = [lerp(s0[0], LX, e), lerp(s0[1], LY, e) + Math.sin(e * Math.PI) * 0.2, lerp(s0[2], 0, e)]; }
        else if (f.faux) { const e = c01((w - 0.16) / 0.12); q = [LX + 0.12 + e * 0.25, Math.max(-0.01, LY - e * e * 0.6), (i % 2 ? 0.2 : -0.2) * e]; }   // le faux positif tombe et reste au sol
        else { const e = sm((w - 0.16) / 0.14), top = 0.05 + 0.08 * (h[f.g]); q = [lerp(LX, BX, e), lerp(LY, top, e) + Math.sin(e * Math.PI) * 0.25, lerp(0, -0.33 + f.g * 0.22, e)]; if (e >= 1) { h[f.g]++; q = null; } }
      }
      pts.pos.set(q || [0, -9, 0], i * 3); });
    pts.a.needsUpdate = true;
    B.forEach((g, i) => { g.scale.y = Math.max(0.02, (u < 0.97 ? h[i] : 0) * 0.09); });
    const e = c01((u - 0.82) / 0.06); tampon.visible = u > 0.82 && u < 0.99; tampon.position.x = (1 - sm(e)) * 0.5; tampon.scale.setScalar(1 + (1 - sm(e)) * 0.8);
    lens.rotation.x = t * 0.5;
  };
  o.rot = t => [0.42, -0.4 + Math.sin(t * 0.2) * 0.15];
}
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
    const z = -DIST * 2.2 * (1 - d.z), k = (DIST - z) / DIST;   // la profondeur : les lointains sont petits et lents
    P[i * 3] = ((d.x - 0.5) * W * 1.1 + (vue.mx || 0) * 60 * v) * k; P[i * 3 + 1] = (H * 0.6 - y - (vue.my || 0) * 40 * v) * k; P[i * 3 + 2] = z; }
  pous.g.attributes.position.needsUpdate = true; pous.m.uniforms.sz.value = 2.2 * PR; pous.m.uniforms.op.value = 0.55;
}

/* ——— la mise en place ——— */
function init(toile, d) {
  if (ok) return true;
  try { R = new T.WebGLRenderer({ canvas: toile, alpha: true, antialias: (window.devicePixelRatio || 1) < 2.5 }); } catch (e) { return false; }
  R.setClearColor(0x000000, 0); scene = new T.Scene();
  IMG = new T.WebGLRenderTarget(4, 4, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, depthBuffer: true });
  passe = new T.ShaderMaterial({ uniforms: { img: { value: IMG.texture }, px: { value: new T.Vector2(1, 1) }, r: { value: 2 } }, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 u; void main(){ u = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `uniform sampler2D img; uniform vec2 px; uniform float r; varying vec2 u;
      void main(){ vec4 m = texture2D(img, u);
        for (int i = 0; i < 16; i++) { float a = float(i) * 0.3926991; vec2 d = vec2(cos(a), sin(a)) * px;
          vec4 c = texture2D(img, u + d * r); if (c.a > m.a && c.a > 0.62) m = c; c = texture2D(img, u + d * r * 0.66); if (c.a > m.a && c.a > 0.4) m = c; c = texture2D(img, u + d * r * 0.33); if (c.a > m.a) m = c; }
        gl_FragColor = vec4(m.rgb / max(m.a, 0.0001), m.a); }` });   /* l'image est dessinée sur du noir transparent : on rend au trait sa vraie couleur */
  ecran = new T.Scene(); ecran.add(new T.Mesh(new T.PlaneGeometry(2, 2), passe)); camE = new T.Camera(); cam = new T.PerspectiveCamera(FOV, 1, 20, 40000);
  /* la puce, quatre fois : l'accueil (en éclaté léger, annotée), les compétences (une couche par étape), le contact (refermée, les signaux partent) */
  orchestre(d);
  puce('couches', { s: 0.9, pl: { x: 0.23, y: -0.04, s: 0.66 }, rot: t => [0.58, -0.62 + Math.sin(t * 0.16) * 0.1],
    ex: (t, v) => 0.42 + 0.2 * sm((v.pas || 0) * 0.8), hl: (t, v) => v.pas === undefined || v.pas >= 6 ? -1 : [4, 5, 2, 0, 3, 1][Math.floor(v.pas)], impulsions: (t, v) => Math.floor(v.pas || 0) === 5 ? 24 : 0,
    etiq: d.competences.map(c => [c.couche, c.court]), univers: true });
  { /* le contact : la puce se referme et émet ; des ondes partent sur le sol, vers vous */
    const oc = puce('contact', { fin: true, s: 0.85, pl: { x: 0.22, y: -0.02, s: 0.6 }, plT: { y: 0.33, s: 0.6 }, solY: -0.62, rot: t => [0.5, t * 0.15], ex: (t, v) => 0.5 * (1 - sm(v.loc * 1.5)), impulsions: () => 24 });
    const ondes = [0, 1, 2, 3].map(() => { const m = oc.m.a.clone(); const l = trait(cercleH(1, 120, 0, -0.6, 0), m, true); oc.g.add(l); return l; }), tk = oc.tick;
    /* les messages : de la puce partent six pistes vers la gauche, vers vos liens ; des signaux y courent en continu */
    const PIS = [0, 1, 2, 3, 4, 5].map(i => { const a = Math.PI + 0.85 + (i - 2.5) * 0.1, L2 = 4.2; return [Math.cos(a) * L2, Math.sin(a) * L2]; });
    const G2 = new T.Group(); oc.g.add(G2); G2.add(traits(PIS.flatMap(([x, z]) => [[0, -0.6, 0], [x, -0.6, z]]), oc.m.d)); const sig = points(36, oc.m.pa); G2.add(sig.p);
    oc.tick = (t, v) => { tk(t, v); G2.rotation.y = -t * 0.15; for (let i = 0; i < 36; i++) { const [x, z] = PIS[i % 6], u = (t * 0.22 + i * 0.137) % 1; sig.pos.set([x * (0.3 + u * 0.7), -0.6 + Math.sin(u * Math.PI) * 0.08, z * (0.3 + u * 0.7)], i * 3); } sig.a.needsUpdate = true; ondes.forEach((l, i) => { const k = (t * 0.28 + i / 4) % 1; l.scale.set(0.9 + k * 3.4, 1, 0.9 + k * 3.4); l.material.opacity = oc.op * Math.pow(1 - k, 1.6) * 0.9; }); }; }
  poussiere(); chaine(); atelier(); if (d.marko) preuve(d.marko); impact(); circuit(d.parcours.slice().reverse()); immeuble(); fleur(); globe(); chat(); archive(); bougies(); reseau(); caviarde(); radar();
  ok = true; resize();
  /* les shaders se compilent tout de suite (l'accueil suffit : les autres scènes partagent ses programmes), pas au moment où la page se pose */
  setTimeout(() => { try { const a = OBJ.accueil; if (a) a.g.visible = true; R.compile(scene, cam); R.compile(ecran, camE); if (a) a.g.visible = false; } catch (e) {} }, 0);
  return true;
}
function resize() {
  if (!ok) return;
  const c = R.domElement; W = c.clientWidth || innerWidth; H = c.clientHeight || innerHeight;
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); R.setSize(W, H, false); PR = R.getPixelRatio();
  IMG.setSize(Math.round(W * PR), Math.round(H * PR)); passe.uniforms.px.value.set(1 / Math.round(W * PR), 1 / Math.round(H * PR)); passe.uniforms.r.value = EPAIS * PR;
  DIST = H / 2 / Math.tan(FOV / 2 * Math.PI / 180); cam.aspect = W / H; cam.position.set(0, 0, DIST); cam.far = DIST * 12; cam.updateProjectionMatrix();
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
    /* l'entrée : l'objet monte du fond en se rassemblant ; la sortie : il passe à côté de nous et file derrière */
    const vient = o.fin || (p.loc || 0) < 0.5, dz = (1 - sm(p.w)) * DIST * (vient ? -1.6 : 0.55);
    o.g.position.set(pl.x + (vue.mx || 0) * 8, pl.y - (vue.my || 0) * 6, dz); o.g.scale.setScalar(pl.s);
    o.g.rotation.set(r[0] + (vue.my || 0) * 0.08 + (vue.prx || 0), r[1] + (vue.mx || 0) * 0.14 + (vue.pry || 0), 0, 'YXZ');
    o.op = 1 - sm((e - 0.5) / 0.5); opac(o.m, o.op); if (o.sols) for (const m of o.sols) m.uniforms.op.value = o.op * (o.solOp ?? 1);
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
  R.setRenderTarget(IMG); R.clear(); R.render(scene, cam); R.setRenderTarget(null); R.clear(); R.render(ecran, camE);
}
function pres(x, y) {
  for (const k in OBJ) { const o = OBJ[k]; if (!o.g.visible || o.w < 0.6) continue; vv.copy(o.g.position).project(cam); const sx = (vv.x + 1) / 2 * W, sy = (1 - vv.y) / 2 * H; if (Math.hypot(x - sx, y - sy) < o.g.scale.x * 1.6) return true; }
  return false;
}
function ancre(nom, i) {
  const o = OBJ[nom]; if (!o || !o.g.visible || !o.etq[i]) return null;
  const e = o.etq[i]; e.a.getWorldPosition(vv); vv.project(cam);
  return { x: (vv.x + 1) / 2 * W, y: (1 - vv.y) / 2 * H, op: o.op * e.op, on: e.on, bas: !!e.bas };
}
return { get ok() { return ok; }, init, resize, rendu, pres, ancre, etiquettes: () => ETQ, OBJ };
})();
