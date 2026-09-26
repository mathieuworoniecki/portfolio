/* Mathieu en 3D, décalqué : sa photo, redessinée en noir et blanc (tools/mathieu/build.py), posée sur un relief.
   Le relief vient de la photo elle-même : les 468 points du visage (MediaPipe) pour le nez, les yeux, la bouche, le menton ;
   un ellipsoïde pour le crâne et les cheveux, un cylindre pour le cou, un tonneau aplati pour le buste (en t-shirt Patagonia).
   C'est une grille de 256 × 256 sommets, texturée : de face et de trois quarts on le reconnaît comme sur la photo ;
   de dos, on voit ses cheveux et le dos du t-shirt (dos.png).

   La bouche : la mâchoire (relief.png, canal g : le visage sous la ligne des lèvres, jusqu'au menton) est une seconde copie de la grille,
   qui descend et avance ; à sa place, et entre la lèvre du haut et elle, de l'encre : c'est le trou noir.

   Les images : media/mathieu/ (visage.png, dos.png, relief.png, relief.json) ; ou window.MATHIEU_MEDIA = { visage, dos, relief, meta } (l'aperçu en ligne).
   Mathieu.create() crée le pantin (il apparaît quand ses images sont chargées) ; Mathieu.pose(m, { x, y, s, turn, tilt, nod, open, a }) le pose :
     x, y : le centre de la tête à l'écran (px) · s : la taille du cadre, des pointes des cheveux au bas du buste (px)
     turn : le tour sur lui-même (radians, 0 de face) · tilt : pencher en avant · open : la bouche, de 0 à 1 (biblique)
   Mathieu.mouthAt(m) : le centre du trou noir à l'écran et ses demi-axes (px), pour y plonger (docs/plan-transition.md). */
window.Mathieu = (() => {
if (!window.Obj3D || !Obj3D.T) return null;
const T = Obj3D.T, G = 256;
const DROP = 0.2, PUSH = 0.06;     // la mâchoire, bouche grande ouverte : combien elle descend, combien elle avance (en fractions du cadre)
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

/* ——— la grille ——— */
function geometry(A) {
  const g = new T.PlaneGeometry(1, 1, G - 1, G - 1), n = G * G, dep = new Float32Array(n), jaw = new Float32Array(n), side = null;
  const [d0, d1] = A.meta.depth, hx = A.meta.head[0], hy = A.meta.head[1], p = g.attributes.position;
  for (let i = 0; i < n; i++) {
    dep[i] = d0 + (d1 - d0) * A.data[i * 4] / 255; jaw[i] = A.data[i * 4 + 1] / 255;
    p.setX(i, p.getX(i) + 0.5 - hx); p.setY(i, p.getY(i) - 0.5 + hy);     // l'origine : le centre de la tête
  }
  g.setAttribute('aDepth', new T.BufferAttribute(dep, 1)); g.setAttribute('aJaw', new T.BufferAttribute(jaw, 1));
  return g;
}
// part 0 : toute la figure, sauf la mâchoire quand la bouche s'ouvre (sa place devient de l'encre) ; part 1 : la mâchoire seule, qui descend
function material(A, part) {
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
        if (t.a < 0.5) discard;
        float l = t.r;
        ${part ? `if (vJaw < 0.5) discard; if (vJaw < 0.62) l = 0.0;   /* le bord de la mâchoire : un trait */`
               : `if (open > 0.015 && vJaw > 0.5) l = 0.0;             /* la place de la mâchoire : le fond de la bouche */`}
        gl_FragColor = vec4(mix(ink, paper, l), opacity);
      }` });
}

/* ——— le pantin ——— */
const all = new Set();
function create() {
  const root = new T.Group(), turn = new T.Group(); root.add(turn); root.visible = false;
  const R = Obj3D.rig(root, []);
  const m = { root, turn, R, cur: {}, ready: false, mesh: null, meta: null };
  load().then(A => {
    if (!m.R) return;
    const geo = geometry(A), mk = part => { const x = new T.Mesh(geo, material(A, part)); x.frustumCulled = false; x.renderOrder = 1; turn.add(x); return x; };
    const mesh = mk(0), jaw = mk(1); jaw.visible = false; m.jaw = jaw;
    // le trou noir : une ellipse d'encre, en retrait derrière les lèvres ; elle suit l'ouverture de la bouche
    const hole = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ color: inkNow(), transparent: true })); hole.frustumCulled = false; turn.add(hole); hole.visible = false;
    m.mesh = mesh; m.hole = hole; m.meta = A.meta; m.ready = true; pose(m, {});
  }).catch(e => console.error('Mathieu : images introuvables', e));
  all.add(m);
  return m;
}
function destroy(m) { if (!m) return; Obj3D.unrig(m.R); m.R = null; all.delete(m); }

function pose(m, o) {
  const p = Object.assign(m.cur, o), s = p.s ?? 400, a = p.a ?? 1;
  m.root.position.set(p.x ?? 0, -(p.y ?? 0), p.z ?? 0); m.root.scale.setScalar(s);
  m.turn.rotation.set((p.tilt ?? 0) - (p.nod ?? 0), p.turn ?? 0, p.roll ?? 0, 'YXZ');
  m.root.visible = m.ready && a > 0.004;
  if (m.mesh) {
    const open = Math.max(0, Math.min(1, p.open ?? 0)), M = m.meta.mouth, gap = open * DROP;
    [m.mesh, m.jaw].forEach(x => { x.material.uniforms.open.value = open; x.material.uniforms.opacity.value = a; }); m.jaw.visible = open > 0.015;
    m.hole.visible = open > 0.015; m.hole.material.opacity = a;
    m.hole.position.set(M.x - m.meta.head[0], -(M.y - m.meta.head[1]) - gap / 2, M.z - 0.01); m.hole.scale.set(M.jaw, gap / 2 + 0.01, 1);
  }
  return m;
}
// le centre du trou noir à l'écran (px) et ses demi-axes (px) ; null bouche fermée
const wv = new T.Vector3();
function mouthAt(m) {
  const open = m.cur.open ?? 0; if (!m.meta || open < 0.015) return null;
  const M = m.meta, hx = M.head[0], hy = M.head[1], gap = open * DROP;
  m.root.updateMatrixWorld(true);
  wv.set(M.mouth.x - hx, -(M.mouth.y - hy) - gap / 2, M.mouth.z).applyMatrix4(m.turn.matrixWorld);
  const s = m.root.scale.x; return { x: wv.x, y: -wv.y, rx: M.mouth.jaw * s, ry: gap / 2 * s };
}
addEventListener('themechange', () => all.forEach(m => { if (m.mesh) { [m.mesh, m.jaw].forEach(x => { x.material.uniforms.ink.value.setHex(inkNow()); x.material.uniforms.paper.value.setHex(paperNow()); }); m.hole.material.color.setHex(inkNow()); } }));
return { create, destroy, pose, mouthAt, load };
})();
