/* Mathieu, en entier : sa tête dessinée d'un trait d'après sa photo (tools/mathieu/build.py, trait.py), posée sur un relief ; son corps en 3D, au trait, comme les chats.
   La tête : une grille de 256 × 256 sommets, texturée (visage.png ; de dos, dos.png), creusée par le relief de la photo (relief.png) ;
   de face et de trois quarts, on le reconnaît. Le corps (Obj3D) : le t-shirt Patagonia (l'encolure côtelée, les manches courtes, l'ourlet, le logo),
   les bras, le jean, les baskets ; articulé (hanches, épaules, coudes, genoux, chevilles) : il se tient debout, ou il court.

   La bouche : la mâchoire (relief.png, canal g : le visage sous la ligne des lèvres, jusqu'au menton) est une seconde copie de la grille,
   qui descend et avance ; à sa place, et entre la lèvre du haut et elle, de l'encre : c'est le trou noir.

   Les images : media/mathieu/ (visage.png, dos.png, relief.png, relief.json) ; ou window.MATHIEU_MEDIA = { visage, dos, relief, meta } (l'aperçu en ligne).
   Mathieu.create() crée le pantin (il apparaît quand ses images sont chargées) ; Mathieu.create({ logo: true }) : la tête seule, pour le logo du site
   (s : des pointes des cheveux au menton ; turn qui augmente sans fin devient un balancement de trois quarts en trois quarts, le relief venant d'une photo de face) ;
   Mathieu.pose(m, { x, y, s, turn, tilt, nod, look, open, run, speed, a }) le pose :
     x, y : le centre de la tête à l'écran (px ; m.meta.head : où il est dans le cadre, en fractions ; m.meta.feet : les pieds)
     s : la taille du cadre, des pointes des cheveux aux semelles (px ; en logo, jusqu'au menton)
     turn : le tour sur lui-même (radians, 0 de face) · tilt : pencher en avant · look : la tête seule, à gauche ou à droite · open : la bouche, de 0 à 1 (biblique)
     run : où il en est de sa foulée (radians, qui augmente : 2π par paire de pas) · speed : 0 debout, 1 il court
   Mathieu.mouthAt(m) : le centre du trou noir à l'écran et ses demi-axes (px), pour y plonger (docs/plan-transition.md). */
window.Mathieu = (() => {
if (!window.Obj3D || !Obj3D.T) return null;
const T = Obj3D.T, G = 256;
const DROP = 0.2, PUSH = 0.06;     // la mâchoire, bouche grande ouverte : combien elle descend, combien elle avance (en fractions du cadre)
const HAUT = 0.06, LOGO_BAS = 0.04;  // le haut des cheveux dans l'image ; en logo, on coupe un peu sous le menton
const PEN = 0.013;                 // le trait du corps, en fractions du cadre de la photo (comme celui du dessin de la tête)
const BASE = (() => { const s = document.currentScript && document.currentScript.src; try { return s ? new URL('../media/mathieu/', s).href : 'media/mathieu/'; } catch (e) { return 'media/mathieu/'; } })();
const inkNow = () => (window.THEME && THEME.inkHex) ?? 0x222428, paperNow = () => (window.THEME && THEME.fog) ?? 0xdadbd8;

/* ——— les images, chargées une fois ——— */
let assets = null;
function load() {
  if (assets) return assets;
  const M = window.MATHIEU_MEDIA || {}, src = k => M[k] || BASE + k + '.png';
  const img = u => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = u; });
  const tex = i => { const t = new T.Texture(i); t.minFilter = T.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
  const meta = M.meta ? Promise.resolve(M.meta) : fetch(BASE + 'relief.json').then(r => r.json());
  assets = Promise.all([img(src('visage')), img(src('dos')), img(src('relief')), meta]).then(([v, d, r, meta]) => {
    const c = document.createElement('canvas'); c.width = G; c.height = G; const x = c.getContext('2d'); x.drawImage(r, 0, 0, G, G);
    return { front: tex(v), back: tex(d), data: x.getImageData(0, 0, G, G).data, meta };
  });
  return assets;
}

/* ——— la tête : la grille ——— */
function geometry(A) {
  const g = new T.PlaneGeometry(1, 1, G - 1, G - 1), n = G * G, dep = new Float32Array(n), jaw = new Float32Array(n);
  const [d0, d1] = A.meta.depth, hx = A.meta.head[0], hy = A.meta.head[1], p = g.attributes.position;
  for (let i = 0; i < n; i++) {
    dep[i] = d0 + (d1 - d0) * A.data[i * 4] / 255; jaw[i] = A.data[i * 4 + 1] / 255;
    p.setX(i, p.getX(i) + 0.5 - hx); p.setY(i, p.getY(i) - 0.5 + hy);     // l'origine : le centre de la tête
  }
  g.setAttribute('aDepth', new T.BufferAttribute(dep, 1)); g.setAttribute('aJaw', new T.BufferAttribute(jaw, 1));
  return g;
}
// part 0 : toute la figure, sauf la mâchoire quand la bouche s'ouvre (sa place devient de l'encre) ; part 1 : la mâchoire seule, qui descend
// cut : rien sous cette hauteur (en fractions du cadre) ; seule la tête du dessin (son alpha : 1 la tête, 0,78 le buste de la photo, remplacé par le corps en 3D)
function material(A, part, cut) {
  const u = { front: { value: A.front }, back: { value: A.back }, ink: { value: new T.Color(inkNow()) }, paper: { value: new T.Color(paperNow()) }, open: { value: 0 }, opacity: { value: 1 } };
  return new T.ShaderMaterial({ uniforms: u, side: T.DoubleSide, transparent: true,
    vertexShader: `attribute float aDepth; attribute float aJaw; uniform float open;
      varying vec2 vUv; varying float vJaw;
      void main() {
        vUv = uv; vJaw = aJaw;
        vec3 p = vec3(position.xy, aDepth);
        ${part ? `p.y -= open * ${DROP.toFixed(3)}; p.z += open * ${PUSH.toFixed(3)};` : ''}
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `uniform sampler2D front; uniform sampler2D back; uniform vec3 ink; uniform vec3 paper; uniform float open; uniform float opacity;
      varying vec2 vUv; varying float vJaw;
      void main() {
        vec4 t = gl_FrontFacing ? texture2D(front, vUv) : texture2D(back, vec2(1.0 - vUv.x, vUv.y));
        if (t.a < 0.9) discard;
        if (vUv.y < ${(1 - cut).toFixed(4)}) discard;
        float l = t.r;
        ${part ? `if (vJaw < 0.5) discard; if (vJaw < 0.62) l = 0.0;   /* le bord de la mâchoire : un trait */`
               : `if (open > 0.015 && vJaw > 0.5) l = 0.0;             /* la place de la mâchoire : le fond de la bouche */`}
        gl_FragColor = vec4(mix(ink, paper, l), opacity);
      }` });
}

/* ——— le corps : des volumes (Obj3D), en fractions du cadre de la photo, comme la tête ———
   Les mesures (le centre de la tête à 0) : le cou finit à -0,23, les épaules à -0,34, les hanches à -1,1, les chevilles à -2,12, le sol à -2,2 :
   un peu plus de cinq têtes de haut, un corps de dessin, pas de mannequin. Chaque pièce est modelée autour de son articulation. */
const HIP = -1.05, LEGX = 0.13, LEGY = -0.05, THIGH = 0.52, SHIN = 0.5, SOL = -2.2;
const SHX = 0.265, SHY = 0.7, ARM = 0.4, FORE = 0.36, NECK = 0.82;     // les épaules, le cou : au-dessus des hanches
const ZS = 0.62, ZC = -0.03;
const TETE = 1.2;                                                    // la tête, plus grande que nature : un personnage de dessin                                         // le buste : aplati d'avant en arrière, un peu en retrait de la tête
const segs = (pts, out) => { for (let i = 1; i < pts.length; i++) out.push(...pts[i - 1], ...pts[i]); return out; };
const ring = (r, y, n, zs, zc, f) => { const c = []; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; c.push([r * Math.sin(t), y + (f ? f(t) : 0), r * Math.cos(t) * (zs || 1) + (zc || 0)]); } return c; };
// un profil [rayon, hauteur], du bas vers le haut, tourné autour de y
const lathe = (P, n) => new T.LatheGeometry(P.map(([r, y]) => new T.Vector2(Math.max(r, 1e-4), y)), n || 32);
// un membre : une gélule, de 0 (rayon r0) à -L (rayon r1), les bouts arrondis
function capsule(r0, r1, L) {
  const P = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI / 2; P.push([r1 * Math.cos(a), -L + r1 * Math.sin(a)]); }
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; P.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
  return lathe(P, 24);
}
function build(meta) {
  const P = {}, key = k => 'mathieu:corps1:' + k;
  // le t-shirt : de l'ourlet (aux hanches) à l'encolure ; les épaules arrondies ; le logo sur le cœur
  const TOR = [[0.265, -0.05], [0.265, 0.12], [0.272, 0.3], [0.285, 0.5], [0.29, 0.62], [0.275, 0.7], [0.235, 0.76], [0.17, 0.8], [0.115, 0.83], [0.1, 0.86]];
  const rT = y => { for (let i = 1; i < TOR.length; i++) if (y <= TOR[i][1]) { const [r0, y0] = TOR[i - 1], [r1, y1] = TOR[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return TOR[TOR.length - 1][0]; };
  P.torse = Obj3D.piece(key('torse'), B => {
    const g = lathe(TOR, 40); g.scale(1, 1, ZS); g.translate(0, 0, ZC); B.smooth(g);
    const L = [];
    // l'encolure côtelée : deux traits, plus bas devant
    const col = (dr, dy) => ring(rT(0.8) + dr, 0.8 + dy, 40, ZS, ZC, t => -0.03 * Math.max(0, Math.cos(t)) ** 2);
    segs(col(0.004, 0), L); segs(col(0.006, -0.03), L);
    // l'ourlet du bas
    segs(ring(rT(-0.03) + 0.004, -0.03, 48, ZS, ZC), L);
    // le logo Patagonia, sur le cœur (à sa gauche : à droite pour nous), posé sur le tissu
    const lx = 0.11, ly = 0.6, ls = 0.42;
    (meta.logo || []).forEach(p => segs(p.map(([x, y]) => { const X = lx + x * ls, Y = ly + y * ls, r = rT(Y) + 0.004; return [X, Y, Math.sqrt(Math.max(0, r * r - X * X)) * ZS + ZC]; }), L));
    B.lines(L);
  });
  // le jean : les hanches, l'entrejambe
  P.bassin = Obj3D.piece(key('bassin'), B => {
    const g = lathe([[0.05, -0.2], [0.2, -0.17], [0.27, -0.1], [0.285, 0], [0.28, 0.1]], 32); g.scale(1, 1, ZS); g.translate(0, 0, ZC); B.smooth(g);
  });
  P.cuisse = Obj3D.piece(key('cuisse'), B => B.smooth(capsule(0.115, 0.09, THIGH)));
  P.mollet = Obj3D.piece(key('mollet'), B => {
    B.smooth(capsule(0.09, 0.075, SHIN - 0.02));
    B.lines(segs(ring(0.083, -SHIN + 0.1, 24), []));                // l'ourlet du jean
  });
  // les baskets : une coque allongée vers l'avant, la semelle, les lacets
  P.pied = Obj3D.piece(key('pied'), B => {
    const g = new T.SphereGeometry(1, 20, 14); g.scale(0.085, 0.06, 0.16); g.translate(0, -0.025, 0.06); B.smooth(g);
    const so = []; for (let i = 0; i <= 32; i++) { const t = i / 32 * Math.PI * 2; so.push([Math.sin(t) * 0.086, -0.05, 0.06 + Math.cos(t) * 0.162]); }
    const S = [];
    for (let k = 0; k < 3; k++) { const z = 0.08 + k * 0.03; S.push(-0.03, 0.01 - k * 0.006, z, 0.03, 0.01 - k * 0.006, z); }
    B.lines(segs(so, [])).soft(S);
  });
  // le bras : la manche courte (évasée, son ourlet), le bras nu dessous
  P.bras = Obj3D.piece(key('bras'), B => {
    B.smooth(capsule(0.062, 0.055, ARM));
    B.smooth(lathe([[0.088, -0.19], [0.092, -0.1], [0.086, 0], [0.05, 0.065]], 24));
    B.lines(segs(ring(0.088, -0.19, 24), []));
  });
  P.avantbras = Obj3D.piece(key('avantbras'), B => B.smooth(capsule(0.056, 0.045, FORE)));
  // la main : un rond, simple, comme les pattes des chats
  P.main = Obj3D.piece(key('main'), B => { const g = new T.SphereGeometry(1, 16, 12); g.scale(0.05, 0.062, 0.045); g.translate(0, -0.045, 0); B.smooth(g); });
  return P;
}

/* ——— le pantin ——— */
const all = new Set();
function create(opt) {
  const logo = !!(opt && opt.logo);
  const root = new T.Group(), turn = new T.Group(); root.add(turn); root.visible = false;
  const list = [], R = Obj3D.rig(root, list);
  const m = { root, turn, R, list, cur: {}, ready: false, mesh: null, meta: null, logo };
  load().then(A => {
    if (!m.R) return;
    const M = A.meta, cut = logo ? M.chin + LOGO_BAS : (M.neck ? M.neck[2] + 0.012 : M.chin + 0.06);
    // la tête : la grille, sa mâchoire, le trou noir ; dans son groupe, qui se tourne et hoche
    const head = new T.Group(), geo = geometry(A), mk = part => { const x = new T.Mesh(geo, material(A, part, cut)); x.frustumCulled = false; x.renderOrder = 1; head.add(x); return x; };
    const mesh = mk(0), jaw = mk(1); jaw.visible = false; m.jaw = jaw;
    const hole = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ color: inkNow(), transparent: true })); hole.frustumCulled = false; head.add(hole); hole.visible = false;
    Object.assign(m, { mesh, hole, head, A: M });
    if (logo) {
      turn.add(head);
      m.frame = [HAUT, cut];
      m.meta = { head: [M.head[0], (M.head[1] - HAUT) / (cut - HAUT)] };
    } else {
      // le corps : les articulations (des groupes emboîtés), les pièces montées dessus
      const P = build(M); m.M = Obj3D.mats(inkNow(), { fat: 3, fatSoft: 2 });
      const grp = (parent, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; };
      const put = (pp, g) => { const x = Obj3D.mount(pp, m.M, true); g.add(x.g); list.push(x); return x; };
      const J = m.J = {};
      J.hips = grp(turn, 0, HIP); put(P.bassin, J.hips);
      J.spine = grp(J.hips); put(P.torse, J.spine);
      J.neck = grp(J.spine, 0, NECK, 0.01); J.neck.add(head); head.scale.setScalar(TETE); head.position.y = (-HIP - NECK) * TETE;     // la tête : un peu plus grande que nature (un dessin), son cou dans l'encolure
      [-1, 1].forEach(sd => {
        const k = sd < 0 ? 'R' : 'L';                      // sa droite est à notre gauche
        const th = J['thigh' + k] = grp(J.hips, sd * LEGX, LEGY); put(P.cuisse, th);
        const kn = J['knee' + k] = grp(th, 0, -THIGH); put(P.mollet, kn);
        const an = J['ankle' + k] = grp(kn, 0, -SHIN); put(P.pied, an);
        const sh = J['shoulder' + k] = grp(J.spine, sd * SHX, SHY); put(P.bras, sh);
        const el = J['elbow' + k] = grp(sh, 0, -ARM); put(P.avantbras, el);
        const wr = J['wrist' + k] = grp(el, 0, -FORE); put(P.main, wr);
      });
      m.frame = [M.head[1] - (M.head[1] - HAUT) * TETE, M.head[1] - SOL];                   // des cheveux aux semelles, en fractions du cadre de la photo
      const f = m.frame[1] - m.frame[0];
      m.meta = { head: [0.5, (M.head[1] - m.frame[0]) / f], feet: [0.5, 1] };
    }
    m.ready = true;
    pose(m, {});
  }).catch(e => console.error('Mathieu : images introuvables', e));
  all.add(m);
  return m;
}
function destroy(m) { if (!m) return; Obj3D.unrig(m.R); m.R = null; all.delete(m); }

// la foulée : l'angle de chaque articulation (radians), selon la phase ph et l'allure k (0 debout, 1 il court)
function stride(m, ph, k, t) {
  const J = m.J, s = Math.sin, c = Math.cos, bend = x => Math.max(0, x);
  [['L', 0], ['R', Math.PI]].forEach(([n, o]) => {
    const f = ph + o, sw = s(f);                      // la cuisse : devant (sw > 0) ou derrière
    J['thigh' + n].rotation.set(-(0.72 * sw + 0.12) * k, 0, 0);
    // le genou plie quand la jambe revient vers l'avant (la jambe en l'air), un peu à l'appui
    J['knee' + n].rotation.set((0.15 + 1.25 * bend(c(f)) ** 1.3 + 0.25 * bend(-sw)) * k, 0, 0);
    J['ankle' + n].rotation.set(k * (-0.2 * sw + 0.15), 0, 0);
    // les bras : à l'opposé des jambes, les coudes pliés ; debout, le long du corps
    const a = -s(f + Math.PI);
    J['shoulder' + n].rotation.set(-0.75 * a * k, 0, (n === 'L' ? 1 : -1) * (0.13 + 0.05 * k));
    J['elbow' + n].rotation.set(-(0.15 + 1.2 * k + 0.25 * k * bend(a)), 0, 0);
  });
  // le buste penché en avant, qui tourne un peu avec les épaules ; les hanches à l'opposé ; il rebondit à chaque pas ; debout, il respire
  J.spine.rotation.set(0.14 * k + 0.01 * s(t * 1.6) * (1 - k), 0.14 * s(ph) * k, 0);
  J.hips.rotation.set(0, -0.08 * s(ph) * k, 0);
  J.hips.position.y = HIP + k * (0.05 * Math.abs(s(ph)) - 0.03) + (1 - k) * 0.004 * s(t * 1.6);
  J.neck.rotation.set(-0.12 * k, -0.1 * s(ph) * k, 0);        // la tête reste droite, le regard devant
}

function pose(m, o) {
  const p = Object.assign(m.cur, o), a = p.a ?? 1, f = m.frame ? m.frame[1] - m.frame[0] : 1, u = (p.s ?? 400) / f;
  m.root.position.set(p.x ?? 0, -(p.y ?? 0), p.z ?? 0); m.root.scale.setScalar(u);
  m.root.visible = m.ready && a > 0.004;
  if (!m.ready) return m;
  if (m.logo) {
    m.turn.rotation.set((p.tilt ?? 0) - (p.nod ?? 0), Math.sin(p.turn ?? 0) * 0.7, p.roll ?? 0, 'YXZ');
  } else {
    m.turn.rotation.set(p.tilt ?? 0, p.turn ?? 0, p.roll ?? 0, 'YXZ');
    // la tête ne va pas au-delà du trois quarts (le relief vient d'une photo de face)
    m.head.rotation.set(-(p.nod ?? 0), Math.max(-0.7, Math.min(0.7, p.look ?? 0)), 0, 'YXZ');
    stride(m, p.run ?? 0, Math.max(0, Math.min(1, p.speed ?? 0)), performance.now() / 1000);
    const w = Math.max(1.2, Math.min(9, u * PEN));
    m.M.line.uniforms.width.value = w; m.M.soft.uniforms.width.value = w * 0.6; m.M.line.opacity = a; m.M.soft.opacity = a * 0.5;
  }
  const open = Math.max(0, Math.min(1, p.open ?? 0)), M = m.A.mouth, gap = open * DROP;
  [m.mesh, m.jaw].forEach(x => { x.material.uniforms.open.value = open; x.material.uniforms.opacity.value = a; }); m.jaw.visible = open > 0.015;
  m.hole.visible = open > 0.015; m.hole.material.opacity = a;
  m.hole.position.set(M.x - m.A.head[0], -(M.y - m.A.head[1]) - gap / 2, M.z - 0.01); m.hole.scale.set(M.jaw, gap / 2 + 0.01, 1);
  return m;
}
// le centre du trou noir à l'écran (px) et ses demi-axes (px) ; null bouche fermée
const wv = new T.Vector3();
function mouthAt(m) {
  const open = m.cur.open ?? 0; if (!m.A || open < 0.015) return null;
  const M = m.A, hx = M.head[0], hy = M.head[1], gap = open * DROP;
  m.root.updateMatrixWorld(true);
  wv.set(M.mouth.x - hx, -(M.mouth.y - hy) - gap / 2, M.mouth.z).applyMatrix4(m.head.matrixWorld);
  const s = m.root.scale.x; return { x: wv.x, y: -wv.y, rx: M.mouth.jaw * s, ry: gap / 2 * s };
}
addEventListener('themechange', () => all.forEach(m => {
  if (!m.mesh) return; const c = inkNow();
  [m.mesh, m.jaw].forEach(x => { x.material.uniforms.ink.value.setHex(c); x.material.uniforms.paper.value.setHex(paperNow()); }); m.hole.material.color.setHex(c);
  if (m.M) [m.M.line, m.M.soft].forEach(x => x.color.setHex(c));
}));
return { create, destroy, pose, mouthAt, load };
})();
