/* Mathieu, en entier : sa tête dessinée d'un trait d'après sa photo (tools/mathieu/build.py, trait.py), posée sur un relief ; son corps en 3D, au trait, comme les chats.
   La tête : une grille de 256 × 256 sommets, texturée (visage.png ; de dos, dos.png), creusée par le relief de la photo (relief.png) ;
   de face et de trois quarts, on le reconnaît. Le corps (Obj3D) : le t-shirt Patagonia (l'encolure côtelée, les manches courtes, l'ourlet, le logo),
   les bras, le jean, les baskets ; articulé (hanches, épaules, coudes, genoux, chevilles) : il se tient debout, ou il court.

   La bouche : la mâchoire (relief.png, canal g : le visage sous la ligne des lèvres, jusqu'au menton) est une seconde copie de la grille,
   qui descend et avance ; à sa place, et entre la lèvre du haut et elle, de l'encre : c'est le trou noir.

   Les images : media/mathieu/ (visage.png, dos.png, relief.png, relief.json) ; ou window.MATHIEU_MEDIA = { visage, dos, relief, meta } (l'aperçu en ligne).
   Mathieu.create() crée le pantin (il apparaît quand ses images sont chargées) ; Mathieu.create({ logo: true }) : la tête seule, pour le logo du site
   (s : des pointes des cheveux au menton ; turn qui augmente sans fin devient un balancement de trois quarts en trois quarts, le relief venant d'une photo de face) ;
   Mathieu.pose(m, { x, y, s, turn, tilt, nod, look, open, run, speed, couche, a }) le pose :
     x, y : le centre de la tête à l'écran (px ; m.meta.head : où il est dans le cadre, en fractions ; m.meta.feet : les pieds)
     s : la taille du cadre, des pointes des cheveux aux semelles (px ; en logo, jusqu'au menton)
     turn : le tour sur lui-même (radians, 0 de face) · tilt : pencher en avant · look : la tête seule, à gauche ou à droite · open : la bouche, de 0 à 1 (biblique)
     run : où il en est de sa foulée (radians, qui augmente : 2π par paire de pas) · speed : 0 debout, 1 il court
     couche : 'habits' (par défaut), 'peau' (le corps nu, en volumes), 'os' (le squelette : ses articulations et ses os)
   Mathieu.mouthAt(m) : le centre du trou noir à l'écran et ses demi-axes (px), pour y plonger (docs/plan-transition.md). */
window.Mathieu = (() => {
if (!window.Obj3D || !Obj3D.T) return null;
const T = Obj3D.T, G = 256;
const DROP = 0.2, PUSH = 0.06;     // la mâchoire, bouche grande ouverte : combien elle descend, combien elle avance (en fractions du cadre)
const HAUT = 0.06, LOGO_BAS = 0.04;  // le haut des cheveux dans l'image ; en logo, on coupe un peu sous le menton
const BASE = (() => { const s = document.currentScript && document.currentScript.src; try { return s ? new URL('../media/mathieu/', s).href : 'media/mathieu/'; } catch (e) { return 'media/mathieu/'; } })();
const inkNow = () => (window.THEME && THEME.inkHex) ?? 0x222428, paperNow = () => (window.THEME && THEME.fog) ?? 0xdadbd8;

/* ——— les images, chargées une fois ——— */
let assets = null;
function load() {
  if (assets) return assets;
  const M = window.MATHIEU_MEDIA || {}, src = k => M[k] || BASE + k + '.png';
  const img = u => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = u; });
  // le visage et le dos en WebP sans perte (mêmes pixels, 2,6 fois plus légers : 27/09, « optimise tout ») ; le PNG si le WebP manque
  // (après avoir refait visage.png ou dos.png : python3 tools/webp.py)
  const webp = k => M[k] ? img(M[k]) : img(BASE + k + '.webp').catch(() => img(src(k)));
  const tex = i => { const t = new T.Texture(i); t.minFilter = T.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
  const meta = M.meta ? Promise.resolve(M.meta) : fetch(BASE + 'relief.json').then(r => r.json());
  assets = Promise.all([webp('visage'), webp('dos'), img(src('relief')), meta]).then(([v, d, r, meta]) => {
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

/* ——— le corps, couche par couche (27 septembre : « revois profondément le corps… couche par couche, le squelette, les points ») ———
   1. le squelette (couche 'os') : les articulations (des points) et les os qui les relient : le bassin, deux vertèbres (lombaires, thorax), le cou ;
      de chaque côté la clavicule, l'épaule, le coude, le poignet, les doigts, le pouce ; la hanche, le genou, la cheville, les orteils.
   2. le corps (couche 'peau') : des volumes modelés sur chaque os (le bassin, le ventre, la cage, les deltoïdes, les biceps, les avant-bras,
      les mains et leurs doigts, les cuisses, les mollets, les pieds), en sections ovales plus ou moins pleines devant et derrière.
   3. les habits (couche 'habits', par défaut) : le t-shirt (l'encolure côtelée, les coutures d'épaules, les manches et leurs ourlets, l'ourlet du bas,
      des plis, le logo Patagonia), le jean (la ceinture et ses passants, la braguette, les poches devant et derrière, les coutures, les plis, les ourlets),
      les baskets (la tige, la semelle, le bout, les lacets, le col) ; ce qui reste nu : les avant-bras, les mains.
   Unités : les fractions du cadre de la photo, comme la tête ; le centre de la tête à 0 ; y vers le haut, z vers nous. */
const TETE = 1.2;                  // la tête, plus grande que nature : un personnage de dessin
const PEN = 0.012;                 // le trait du corps, en fractions du cadre de la photo (comme celui du dessin de la tête)
const SOL = -2.25;                 // les semelles
// le squelette : chaque articulation, sa place au repos par rapport à la précédente [parent, x, y, z] ; x des deux côtés : multiplié par ±1
const OS = { bassin: [null, 0, -1.05, 0], lombaires: ['bassin', 0, 0.06, -0.01], thorax: ['lombaires', 0, 0.3, 0], cou: ['thorax', 0, 0.4, 0.01] };
const OS2 = {
  clavicule: ['thorax', 0.035, 0.33, 0.03], epaule: ['clavicule', 0.2, -0.03, -0.04], coude: ['epaule', 0, -0.36, 0], poignet: ['coude', 0, -0.31, 0],
  doigts: ['poignet', 0, -0.085, 0], pouce: ['poignet', -0.005, -0.02, 0.035],
  hanche: ['bassin', 0.11, -0.08, 0], genou: ['hanche', 0, -0.5, 0], cheville: ['genou', 0, -0.5, -0.01], orteils: ['cheville', 0, -0.1, 0.12]
};
const COTES = [['G', 1], ['D', -1]];           // G : sa gauche (à droite pour nous), D : sa droite
// toutes les articulations : [nom, parent, x, y, z]
const JOINTS = [...Object.entries(OS).map(([n, [p, x, y, z]]) => [n, p, x, y, z]),
  ...COTES.flatMap(([c, sd]) => Object.entries(OS2).map(([n, [p, x, y, z]]) => [n + c, OS2[p] ? p + c : p, sd * x, y, z]))];
const segs = (pts, out) => { for (let i = 1; i < pts.length; i++) out.push(...pts[i - 1], ...pts[i]); return out; };
/* un volume en sections : des anneaux [a, w, df, db, c] le long de l'axe (y, ou z pour les pieds) : a la position, w la demi-largeur (x),
   df et db l'épaisseur devant et derrière, c le décalage du centre ; les bouts sont fermés */
function loft(R, o) {
  o = o || {}; const n = o.n || 24, P = [], I = [], Z = o.axis === 'z';
  R.forEach(([a, w, df, db, c0]) => { for (let j = 0; j < n; j++) { const t = j / n * Math.PI * 2, s = Math.sin(t), c = Math.cos(t), d = (c0 || 0) + (c > 0 ? df ?? w : db ?? df ?? w) * c; P.push(w * s, Z ? d : a, Z ? a : d); } });
  for (let i = 0; i < R.length - 1; i++) for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n; I.push(a, a + n, b, b, a + n, b + n); }
  if (o.cap !== false) [0, R.length - 1].forEach((i, e) => { const r = R[i], k = P.length / 3; P.push(0, Z ? r[4] || 0 : r[0], Z ? r[0] : r[4] || 0); for (let j = 0; j < n; j++) { const u = i * n + j, v = i * n + (j + 1) % n; if (e) I.push(u, v, k); else I.push(u, k, v); } });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); return g;
}
// un point sur un volume en sections, à la hauteur a et à l'angle t (0 devant, π/2 sur son flanc x+), un peu au-dessus du tissu (lift)
function on(R, a, t, lift, Z) {
  let i = 1; while (i < R.length - 1 && (a - R[i - 1][0]) * (a - R[i][0]) > 0) i++;
  const A = R[i - 1], B = R[i], f = B[0] === A[0] ? 0 : Math.max(0, Math.min(1, (a - A[0]) / (B[0] - A[0]))), L = (x, y) => (x ?? 0) + ((y ?? 0) - (x ?? 0)) * f;
  const w = L(A[1], B[1]) + (lift || 0), c = Math.cos(t), s = Math.sin(t), df = L(A[2] ?? A[1], B[2] ?? B[1]), db = L(A[3] ?? A[2] ?? A[1], B[3] ?? B[2] ?? B[1]);
  const d = L(A[4], B[4]) + ((c > 0 ? df : db) + (lift || 0)) * c;
  return Z ? [w * s, d, a] : [w * s, a, d];
}
const around = (R, a, lift, n, t0, t1, Z) => { const P = []; n = n || 40; t0 = t0 ?? 0; t1 = t1 ?? Math.PI * 2; for (let i = 0; i <= n; i++) P.push(on(R, a, t0 + (t1 - t0) * i / n, lift, Z)); return P; };
const along = (R, a0, a1, t, lift, n, Z) => { const P = []; n = n || 12; for (let i = 0; i <= n; i++) P.push(on(R, a0 + (a1 - a0) * i / n, typeof t === 'function' ? t(i / n) : t, lift, Z)); return P; };
const E = 0.004;                                   // les traits des habits : juste au-dessus du tissu

// les volumes du corps nu (couche 'peau')
const PEAU = {
  bassin: [[0.1, 0.01, 0.01, 0.01], [0.09, 0.17, 0.1, 0.1], [0.02, 0.215, 0.115, 0.13], [-0.05, 0.225, 0.12, 0.14, -0.005], [-0.1, 0.2, 0.11, 0.12], [-0.15, 0.12, 0.08, 0.08], [-0.165, 0.02, 0.02, 0.02]],
  ventre: [[-0.02, 0.2, 0.11, 0.11], [0.1, 0.19, 0.105, 0.1], [0.22, 0.2, 0.11, 0.1], [0.34, 0.21, 0.12, 0.1]],
  cage: [[-0.04, 0.21, 0.12, 0.1], [0.1, 0.235, 0.135, 0.105, 0.005], [0.2, 0.25, 0.14, 0.11, 0.005], [0.28, 0.25, 0.13, 0.11], [0.34, 0.22, 0.1, 0.1, -0.005], [0.38, 0.16, 0.08, 0.08, -0.01], [0.41, 0.08, 0.06, 0.06, -0.01], [0.42, 0.01, 0.01, 0.01, -0.01]],
  bras: [[0.065, 0.01], [0.05, 0.055], [0.01, 0.075, 0.07, 0.07], [-0.1, 0.07, 0.065, 0.066], [-0.25, 0.058, 0.055, 0.055], [-0.35, 0.048], [-0.375, 0.01]],
  avantbras: [[0.035, 0.01], [0.02, 0.047], [-0.06, 0.053, 0.05, 0.05], [-0.2, 0.042, 0.038, 0.038], [-0.3, 0.033, 0.03, 0.03], [-0.325, 0.01]],
  paume: [[0.012, 0.006, 0.012, 0.012], [0, 0.02, 0.03, 0.03], [-0.04, 0.024, 0.045, 0.045], [-0.085, 0.021, 0.043, 0.043], [-0.097, 0.006, 0.03, 0.03]],
  cuisse: [[0.065, 0.01], [0.04, 0.09], [-0.05, 0.105, 0.1, 0.1], [-0.25, 0.09, 0.085, 0.09], [-0.45, 0.068, 0.065, 0.07], [-0.52, 0.055, 0.05, 0.05], [-0.545, 0.01]],
  mollet: [[0.04, 0.01], [0.02, 0.058], [-0.08, 0.064, 0.055, 0.075, -0.005], [-0.2, 0.058, 0.05, 0.07, -0.01], [-0.4, 0.042, 0.04, 0.042], [-0.49, 0.036], [-0.515, 0.01]],
  pied: [[-0.07, 0.01, 0.01, 0.01, -0.07], [-0.06, 0.035, 0.04, 0.04, -0.07], [0, 0.042, 0.05, 0.045, -0.075], [0.07, 0.048, 0.03, 0.035, -0.09], [0.1, 0.046, 0.025, 0.03, -0.095], [0.115, 0.01, 0.01, 0.01, -0.095]],
  orteils: [[-0.03, 0.045, 0.022, 0.025, 0.005], [0.03, 0.044, 0.018, 0.02, 0.002], [0.055, 0.03, 0.012, 0.014, 0], [0.065, 0.008, 0.006, 0.006, 0]]
};
// les habits
const HABITS = {
  // le t-shirt : un peu ample, il tombe droit sur les hanches ; ouvert à l'encolure et en bas
  tshirt: [[-0.37, 0.235, 0.14, 0.13], [-0.2, 0.235, 0.14, 0.125], [0, 0.242, 0.142, 0.12], [0.1, 0.257, 0.152, 0.12, 0.005], [0.2, 0.266, 0.152, 0.12, 0.005], [0.28, 0.262, 0.142, 0.12], [0.34, 0.232, 0.112, 0.112, -0.005], [0.38, 0.172, 0.092, 0.09, -0.01], [0.405, 0.112, 0.077, 0.07, -0.01]],
  manche: [[0.075, 0.015, 0.015, 0.015, -0.005], [0.06, 0.07], [0.02, 0.098, 0.095, 0.095], [-0.08, 0.1, 0.098, 0.098], [-0.19, 0.097, 0.094, 0.094]],
  // le jean : les hanches (la ceinture un peu sous le nombril), les jambes droites, l'ourlet qui tombe sur la basket
  jean: [[0.12, 0.215, 0.125, 0.13], [0.06, 0.23, 0.13, 0.145], [-0.02, 0.24, 0.135, 0.155, -0.005], [-0.1, 0.225, 0.125, 0.14], [-0.16, 0.13, 0.09, 0.09], [-0.175, 0.02, 0.02, 0.02]],
  jambe: [[0.07, 0.02], [0.05, 0.115, 0.11, 0.115], [-0.1, 0.12, 0.115, 0.12], [-0.3, 0.105, 0.1, 0.105], [-0.5, 0.088, 0.085, 0.088], [-0.56, 0.02]],
  bas: [[0.05, 0.02], [0.03, 0.086], [-0.2, 0.08, 0.078, 0.08], [-0.4, 0.08, 0.078, 0.08], [-0.5, 0.088, 0.09, 0.084]],
  // la basket : la tige (sur la cheville), l'avant (sur les orteils, qui plie), la semelle en deux
  tige: [[-0.088, 0.015, 0.02, 0.01, -0.06], [-0.078, 0.05, 0.07, 0.035, -0.06], [-0.02, 0.057, 0.075, 0.04, -0.065], [0.04, 0.059, 0.052, 0.04, -0.08], [0.1, 0.057, 0.037, 0.034, -0.09], [0.125, 0.052, 0.031, 0.03, -0.092]],
  bout: [[-0.03, 0.055, 0.03, 0.03, 0.005], [0.03, 0.053, 0.028, 0.022, 0], [0.07, 0.043, 0.02, 0.018, -0.003], [0.088, 0.01, 0.008, 0.008, -0.003]]
};

function build(meta) {
  const P = {}, K = 'mathieu:corps2:', kit = Obj3D.kit, pc = (k, f) => (P[k] = Obj3D.piece(K + k, f));
  // 1. le squelette : un point par articulation, un os vers chacune de ses suivantes
  const kids = {}; JOINTS.forEach(([n, p, x, y, z]) => { if (p) (kids[p] = kids[p] || []).push(0, 0, 0, x, y, z); });
  (kids.cou = kids.cou || []).push(0, 0, 0, 0, (meta.head[1] - HAUT) * TETE + 0.25, 0);          // jusqu'au sommet du crâne
  JOINTS.forEach(([n]) => pc('os:' + n, B => { B.smooth(new T.SphereGeometry(0.02, 10, 8)); if (kids[n]) B.lines(kids[n]); }));
  // 2. le corps nu
  const S = PEAU;
  pc('peau:bassin', B => B.smooth(loft(S.bassin))); pc('peau:ventre', B => B.smooth(loft(S.ventre))); pc('peau:cage', B => B.smooth(loft(S.cage, { n: 32 })));
  pc('peau:bras', B => B.smooth(loft(S.bras))); pc('peau:avantbras', B => B.smooth(loft(S.avantbras)));
  pc('peau:paume', B => B.smooth(loft(S.paume, { n: 16 })));
  // les doigts serrés, d'un bloc (une moufle : à cette taille, quatre doigts ne font que des gribouillis), qui se plie ; le pouce à part
  pc('peau:doigts', B => B.smooth(loft([[0.008, 0.012, 0.03, 0.03], [0, 0.02, 0.042, 0.042], [-0.045, 0.019, 0.04, 0.04], [-0.065, 0.015, 0.03, 0.03], [-0.075, 0.006, 0.012, 0.012]], { n: 16 })));
  pc('peau:pouce', B => { const g = loft([[0.012, 0.006], [0, 0.016], [-0.04, 0.014], [-0.055, 0.005]], { n: 12 }); g.rotateX(0.5); B.smooth(g); });
  pc('peau:cuisse', B => B.smooth(loft(S.cuisse))); pc('peau:mollet', B => B.smooth(loft(S.mollet)));
  pc('peau:pied', B => B.smooth(loft(S.pied, { axis: 'z', n: 20 }))); pc('peau:orteils', B => B.smooth(loft(S.orteils, { axis: 'z', n: 20 })));
  // 3. les habits
  const H = HABITS;
  pc('tshirt', B => {
    const R = H.tshirt, L = [], F = [];
    B.smooth(loft(R, { n: 40, cap: false }));
    // l'encolure côtelée (deux traits, plus bas devant), les coutures des épaules, l'ourlet
    segs(around(R, 0.405, E, 48), L); segs(around(R, 0.385, E, 48).map((p, i, a) => { const t = i / (a.length - 1) * Math.PI * 2; p[1] -= 0.02 * Math.max(0, Math.cos(t)) ** 2; return p; }), L);
    [1, -1].forEach(sd => segs(along(R, 0.395, 0.3, sd * (Math.PI / 2 + 0.2), E, 8), L));
    // les coutures des côtés, de l'aisselle à l'ourlet (on les voit de profil et de trois quarts dos)
    [1, -1].forEach(sd => segs(along(R, 0.2, -0.35, sd * Math.PI / 2, E, 12), L));
    // dans le dos : le creux des reins, deux plis doux
    [1, -1].forEach(sd => segs(along(R, -0.2, -0.3, u => Math.PI - sd * (0.25 + 0.15 * u), E, 4), F));
    segs(around(R, -0.35, E, 48), L);
    // des plis : à la taille, sous les bras
    [1, -1].forEach(sd => { segs(along(R, -0.3, -0.18, u => sd * (1.1 - 0.25 * u), E, 6), F); segs(along(R, 0.24, 0.12, u => sd * (1.35 - 0.3 * u), E, 6), F); segs(along(R, -0.25, -0.15, u => sd * (0.55 + 0.1 * u), E, 5), F); });
    // le logo Patagonia, sur le cœur (à sa gauche : à droite pour nous)
    const lx = 0.1, ly = 0.25, ls = 0.4;
    (meta.logo || []).forEach(p => segs(p.map(([x, y]) => { const Y = ly + y * ls, w = on(R, Y, Math.PI / 2, E)[0]; return on(R, Y, Math.asin(Math.max(-1, Math.min(1, (lx + x * ls) / w))), E); }), L));
    B.lines(L).soft(F);
  });
  pc('manche', B => { const R = H.manche; B.smooth(loft(R, { cap: false })); const L = segs(around(R, -0.185, E, 28), []); segs(along(R, 0.03, -0.185, Math.PI, E, 8), L); B.lines(L); B.soft(segs(along(R, -0.06, -0.15, Math.PI * 0.8, E, 5), [])); });
  pc('jean', B => {
    const R = H.jean, L = [], F = [];
    B.smooth(loft(R, { n: 40 }));
    // la ceinture et le haut des poches sont sous le t-shirt, qui tombe sur les hanches (a = 0) : on ne voit que ce qui dépasse dessous
    // la braguette (sa couture en J), le bas des poches devant, les poches derrière, la couture de l'entrejambe
    segs([...along(R, -0.01, -0.07, 0.075, E, 5), ...along(R, -0.07, -0.1, u => 0.075 * (1 - u), E, 3)], F);
    // dans le dos : l'empiècement en V au-dessus des poches, la couture du milieu ; sur les côtés, les coutures
    segs(along(R, -0.025, -0.055, u => Math.PI - 1.35 * (1 - u), E, 6), L); segs(along(R, -0.025, -0.055, u => Math.PI + 1.35 * (1 - u), E, 6), L);
    segs(along(R, -0.055, -0.165, Math.PI, E, 6), L);
    [1, -1].forEach(sd => segs(along(R, -0.01, -0.12, sd * Math.PI / 2, E, 5), F));
    [1, -1].forEach(sd => {
      segs(along(R, -0.01, -0.05, u => sd * (0.75 + 0.6 * u), E, 6), F);
      const bk = (a, t) => on(R, a, t, E); segs([bk(-0.058, Math.PI - sd * 0.2), bk(-0.13, Math.PI - sd * 0.23), bk(-0.15, Math.PI - sd * 0.5), bk(-0.13, Math.PI - sd * 0.77), bk(-0.052, Math.PI - sd * 0.8)], L);
    });
    B.lines(L).soft(F);
  });
  // les jambes du jean : la couture sur le côté (dehors), deux plis doux au pli du genou, derrière ; en bas, l'ourlet et le tissu qui tombe sur la basket
  [['jambe', 1], ['jambe-', -1]].forEach(([k, sd]) => pc(k, B => { const R = H.jambe; B.smooth(loft(R)); const F = []; segs(along(R, 0.0, -0.52, sd * Math.PI / 2, E, 10), F); segs(along(R, -0.05, -0.52, -sd * Math.PI / 2, E, 10), F); [-0.44, -0.48].forEach(a => segs(around(R, a, E, 8, Math.PI - 0.5, Math.PI + 0.5), F)); B.soft(F); }));
  pc('bas', B => { const R = H.bas; B.smooth(loft(R, { cap: false })); B.lines(segs(around(R, -0.495, E, 28), [])); const F = []; [1, -1].forEach(sd => segs(along(R, 0.02, -0.48, sd * Math.PI / 2, E, 10), F)); segs(around(R, -0.42, E, 8, -0.7, 0.2), F); segs(around(R, -0.45, E, 8, 0.4, 1.1), F); B.soft(F); });
  pc('tige', B => {
    const R = H.tige, L = [], F = []; B.smooth(loft(R, { axis: 'z', n: 28 }));
    // la semelle (la moitié du talon), le col, les lacets
    const so = kit.roundPoly([[-0.05, -0.085], [0.05, -0.085], [0.06, 0.1], [-0.058, 0.1]], 0.03, 5); B.solid(kit.topExt(so, 0.028, -0.117));
    for (let k = 0; k < 4; k++) { const z = 0.03 + k * 0.022, y = on(R, z, 0, E, true)[1]; F.push(-0.026, y, z, 0.026, y + 0.004, z); }
    segs(along(R, 0.0, 0.1, 0.42, E, 6, true), F); segs(along(R, 0.0, 0.1, -0.42, E, 6, true), F);
    // les flancs : le bord du panneau, le renfort du talon
    [1, -1].forEach(sd => { segs(along(R, -0.06, 0.1, u => sd * (1.2 - 0.5 * Math.sin(u * Math.PI)), E, 10, true), L); segs(along(R, -0.08, -0.03, sd * 1.05, E, 4, true), F); });
    B.lines(L).soft(F);
  });
  pc('bout', B => {
    const R = H.bout, L = []; B.smooth(loft(R, { axis: 'z', n: 28 }));
    const so = kit.roundPoly([[-0.058, -0.03], [0.058, -0.03], [0.05, 0.075], [0, 0.095], [-0.05, 0.075]], 0.025, 5); B.solid(kit.topExt(so, 0.028, -0.017));
    segs(around(R, 0.045, E, 20, -1.3, 1.3, true), L);         // le bout renforcé
    B.lines(L);
  });
  return P;
}
// les pièces de chaque articulation, et leur couche ; u : dans le contour unique du tronc (sinon, un contour à soi)
const MONTAGE = {
  bassin: [['peau:bassin', 'peau', 1], ['jean', 'habits', 1]], lombaires: [['peau:ventre', 'peau', 1]], thorax: [['peau:cage', 'peau', 1], ['tshirt', 'habits', 1]],
  epaule: [['peau:bras', 'peau habits'], ['manche', 'habits', 1]], coude: [['peau:avantbras', 'peau habits']], poignet: [['peau:paume', 'peau habits']],
  doigts: [['peau:doigts', 'peau habits']], pouce: [['peau:pouce', 'peau habits']],
  hanche: [['peau:cuisse', 'peau'], ['jambe', 'habits']], genou: [['peau:mollet', 'peau'], ['bas', 'habits']],
  cheville: [['peau:pied', 'peau'], ['tige', 'habits']], orteils: [['peau:orteils', 'peau'], ['bout', 'habits']]
};

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
      // le corps : les articulations (des groupes emboîtés, d'après le squelette), les pièces de chaque couche montées dessus
      const P = build(M); m.M = Obj3D.mats(inkNow(), { fat: 3, fatSoft: 2, uni: 255 });
      const J = m.J = {}, body = new T.Group(); turn.add(body); m.couches = { os: [], peau: [], habits: [] };
      JOINTS.forEach(([n, p, x, y, z]) => { const g = new T.Group(); g.position.set(x, y, z); (p ? J[p] : body).add(g); J[n] = g; g.userData.rest = [x, y, z]; });
      const put = (key, g, layers, uni) => { const x = Obj3D.mount(P[key], m.M, !uni); g.add(x.g); list.push(x); layers.split(' ').forEach(l => m.couches[l].push(x)); return x; };
      JOINTS.forEach(([n]) => {
        put('os:' + n, J[n], 'os', false);
        const base = n.replace(/[GD]$/, ''), cote = n.endsWith('D') && OS2[base] ? 'D' : 'G';
        (MONTAGE[base] || []).forEach(([k, l, u]) => put(k === 'jambe' && cote === 'D' ? 'jambe-' : k, J[n], l, u));
      });
      // la tête : un peu plus grande que nature (un dessin), le bas de son cou dans l'encolure, au-dessus de l'articulation du cou
      J.cou.add(head); head.scale.setScalar(TETE); head.position.y = (cut - M.head[1]) * TETE;
      // la racine : le centre de la tête
      const hc = [0, 0, 0]; for (let n = 'cou'; n; n = OS[n][0]) { hc[1] += OS[n][2]; } hc[1] += head.position.y;
      body.position.y = -hc[1]; m.body = body;
      const top = (M.head[1] - HAUT) * TETE, f = top - (SOL - hc[1]);
      m.frame = [0, f];
      m.meta = { head: [0.5, top / f], feet: [0.5, 1] };
    }
    m.ready = true;
    pose(m, {});
  }).catch(e => console.error('Mathieu : images introuvables', e));
  all.add(m);
  return m;
}
function destroy(m) { if (!m) return; Obj3D.unrig(m.R); m.R = null; all.delete(m); }

// la foulée : l'angle de chaque articulation (radians), selon la phase ph et l'allure k (0 debout, 1 il court) ; t : le temps (il respire)
function stride(m, ph, k, t) {
  const J = m.J, s = Math.sin, c = Math.cos, pos = x => Math.max(0, x), br = s(t * 1.6), R = (j, x, y, z) => J[j].rotation.set(x, y, z);
  // le tronc : le bassin rebondit à chaque pas, tourne avec la jambe qui avance et penche vers l'appui ; les vertèbres tournent à l'opposé ; la tête reste droite
  J.bassin.position.y = OS.bassin[2] + k * (0.045 * Math.abs(s(ph)) - 0.035) + (1 - k) * 0.003 * br;
  R('bassin', 0.05 * k, -0.1 * s(ph) * k, 0.04 * c(ph) * k);
  R('lombaires', 0.07 * k, 0.09 * s(ph) * k, -0.03 * c(ph) * k);
  R('thorax', 0.07 * k + 0.012 * br * (1 - k), 0.12 * s(ph) * k, -0.02 * c(ph) * k);
  R('cou', -0.13 * k, -0.11 * s(ph) * k, 0.01 * c(ph) * k);
  COTES.forEach(([n, sd]) => {
    const f = ph + (sd > 0 ? 0 : Math.PI), sw = s(f), up = c(f);     // sw > 0 : la jambe est devant ; up > 0 : elle revient vers l'avant, en l'air
    // la jambe : la cuisse, le genou qui plie en l'air (et un peu à l'appui), la cheville, les orteils qui plient quand le pied pousse
    R('hanche' + n, -(0.7 * sw + 0.1) * k, 0, sd * 0.03);
    R('genou' + n, (0.1 + 1.35 * pos(up) ** 1.3 + 0.2 * pos(-sw)) * k, 0, 0);
    R('cheville' + n, k * (0.12 - 0.3 * sw + 0.3 * pos(-sw) * pos(-up)), 0, 0);
    R('orteils' + n, -k * 0.7 * pos(-sw) * pos(-up), 0, 0);
    // le bras : à l'opposé de la jambe du même côté ; l'épaule monte un peu quand il avance ; le coude plié ; le poing à moitié fermé
    R('clavicule' + n, 0, 0, sd * 0.05 * k * pos(-sw));
    R('epaule' + n, (0.7 * sw - 0.05) * k, -sd * 0.25 * k, sd * (0.12 + 0.14 * k));
    R('coude' + n, -(0.14 + 1.2 * k + 0.35 * k * pos(-sw)), 0, 0);
    R('poignet' + n, -0.12 * k, 0, -sd * 0.08);
    R('doigts' + n, 0, 0, -sd * (0.3 + 1.0 * k));
    R('pouce' + n, 0, 0, -sd * (0.15 + 0.45 * k));
  });
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
    // la tête vient d'une photo de face : de profil, elle s'aplatit. Elle reste donc de trois quarts au plus, de face ou de dos,
    // et passe vite de l'un à l'autre quand le corps est de profil (un coup de tête, comme un personnage de dessin animé)
    const TAU = Math.PI * 2, rel = (((p.turn ?? 0) % TAU) + TAU + Math.PI) % TAU - Math.PI, cl = x => Math.max(-0.72, Math.min(0.72, x));
    const back = Math.max(0, Math.min(1, (Math.abs(rel) - 1.62) / 0.2)), bw = back * back * (3 - 2 * back), sg = rel < 0 ? -1 : 1;
    const want = (1 - bw) * cl(rel) + bw * (sg * Math.PI + cl(rel - sg * Math.PI));
    m.head.rotation.set(-(p.nod ?? 0), want - rel + Math.max(-0.5, Math.min(0.5, p.look ?? 0)), 0, 'YXZ');
    stride(m, p.run ?? 0, Math.max(0, Math.min(1, p.speed ?? 0)), performance.now() / 1000);
    // la couche à montrer : le squelette, le corps nu, ou habillé
    const cc = m.couches[p.couche] ? p.couche : 'habits'; Object.entries(m.couches).forEach(([l, xs]) => { if (l !== cc) xs.forEach(x => { x.g.visible = false; }); }); m.couches[cc].forEach(x => { x.g.visible = true; });
    const w = Math.max(1.2, Math.min(9, u * PEN));
    m.M.line.uniforms.width.value = w; m.M.soft.uniforms.width.value = w * 0.6; m.M.out.uniforms.width.value = w * 2; [m.M.line, m.M.out].forEach(x => { x.opacity = a; }); m.M.soft.opacity = a * 0.5;
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
  if (m.M) [m.M.line, m.M.soft, m.M.out].forEach(x => x.color.setHex(c));
}));
return { create, destroy, pose, mouthAt, load };
})();
