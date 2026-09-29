/* Le festival de peinture : le passage au mode sérieux (29/09, 07:35, Mathieu : « c'est nos chats sur l'écran qui peignent avec un rouleau
   à peinture, pas du papier peint ; des échelles arrivent, hyper hautes, ils montent ou lancent des seaux de peinture, c'est un festival
   de peinture pour tout couvrir ; tous les chats sont mis à contribution (on en fait venir d'autres s'il n'y en a pas beaucoup) ; ils
   peignent tout en bleu ; d'autres chats poussent les objets en dehors de l'écran ; puis tout le monde disparaît logiquement et
   naturellement (ils s'en vont à pied, l'échelle s'envole…) ; et enfin le texte et l'animation du mode sérieux arrivent »).
   Peinture.go(o, { fini, sorti }) : o = le bouton ; sorti(it) = un objet poussé hors de l'écran (js/fuite.js le garde pour le retour) ;
   fini() = tout est bleu et tout le monde est parti : js/fuite.js ouvre le mode sérieux (Serieux.ouvre, sans cercle).
   - Les échelles tombent du ciel (« BAM »), plus hautes que l'écran ; un chat grimpe à chacune avec un rouleau à long manche :
     il peint une bande du bas jusqu'en haut. Les bandes laissent des jours entre elles…
   - … que les lanceurs comblent : au sol, ils balancent des seaux (un arc, une traînée de gouttes, « SPLASH » : une flaque qui coule).
   - Les pousseurs partent du milieu vers les bords, comme des bulldozers : chaque objet qu'ils rencontrent s'ajoute à leur tas,
     et tout le tas sort de l'écran. Les croquettes giclent devant eux.
   - Pas assez de chats ? D'autres tombent du ciel. À la fin : la grande salve (« SPLAAASH ») sur ce qui reste ; les grimpeurs
     glissent en bas, tout le monde file au galop hors de l'écran, les échelles s'envolent (« fiuuu »). Rien ne s'efface en fondu.
   Les toiles : la peinture (sous les chats, au-dessus de la pièce) ; les outils (échelles, seaux, rouleaux) ; les mots (au-dessus de tout).
   Le titre (#titles) passe sous la peinture le temps du festival ; les deux boutons disparaissent quand un coup de peinture les couvre.
   Le bleu est celui du mode sérieux (css/serieux.css) : quand il s'ouvre par-dessus, on ne voit pas la jointure. */
window.Peinture = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, STEPS, rnd, pick, clamp, sm, sOf, floorAt, interrupt, go, fn, pose, later, sc, addCat, LOURD, SPEED } = K;
const TAU = Math.PI * 2, c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INK = 'rgb(34,36,40)', PAPIER = 'rgb(250,248,242)', BORD = '#0F3468';
const en = () => !!(window.I18N && I18N.lang && I18N.lang !== 'fr');

let P = null;                       // le festival en cours
let cvP, xP, cvO, xO, cvM, xM, motif = null;   // les trois toiles, et le bleu (en motif)

function toile(apres, z) {
  const c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.className = 'peinture';
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: z, pointerEvents: 'none', display: 'none' });
  apres.after(c); return c;
}
function toiles() {
  if (cvP) return; const st = document.getElementById('stage'), ti = document.getElementById('titles');
  cvP = toile(st, 1); cvO = toile(cvP, 1); cvM = toile(ti || cvO, 1);
  xP = cvP.getContext('2d'); xO = cvO.getContext('2d'); xM = cvM.getContext('2d');
}
function taille(W, H) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  [cvP, cvO, cvM].forEach(c => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.display = ''; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); });
  // le bleu du mode sérieux : un dégradé en ellipse, centré à 50 % / 40 % ; peint une fois, puis utilisé comme motif
  const o = document.createElement('canvas'); o.width = Math.ceil(W); o.height = Math.ceil(H); const g = o.getContext('2d');
  const rx = Math.SQRT2 * W / 2, ry = Math.SQRT2 * H * 0.6, d = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  d.addColorStop(0, '#2468B6'); d.addColorStop(0.45, '#1C58A2'); d.addColorStop(1, '#133F7C');
  g.translate(W / 2, H * 0.4); g.scale(1, ry / rx); g.fillStyle = d; g.fillRect(-W * 2, -H * 4, W * 4, H * 8);
  motif = xP.createPattern(o, 'no-repeat');
}

/* ——— la couverture : une grille ; une case est couverte quand elle est entièrement peinte ——— */
const GX = 24, GY = 16;
function cases() { return new Uint8Array(GX * GY); }
function couvreRect(x0, y0, x1, y1) {
  const cw = P.W / GX, ch = P.H / GY;
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) if (i * cw >= x0 && (i + 1) * cw <= x1 && j * ch >= y0 && (j + 1) * ch <= y1) P.g[j * GX + i] = 1;
}
function couvreRond(x, y, r) {
  const cw = P.W / GX, ch = P.H / GY, in_ = (a, b) => Math.hypot(a - x, b - y) <= r;
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { const a = i * cw, b = j * ch; if (in_(a, b) && in_(a + cw, b) && in_(a, b + ch) && in_(a + cw, b + ch)) P.g[j * GX + i] = 1; }
}
const libres = () => { const L = []; for (let k = 0; k < GX * GY; k++) if (!P.g[k]) L.push(k); return L; };
const centre = k => [(k % GX + 0.5) * P.W / GX, (Math.floor(k / GX) + 0.5) * P.H / GY];
const couvert = (x, y) => { const i = clamp(Math.floor(x / P.W * GX), 0, GX - 1), j = clamp(Math.floor(y / P.H * GY), 0, GY - 1); return !!P.g[j * GX + i]; };

/* ——— peindre (sur la toile de la peinture : elle reste) ——— */
// une bande de rouleau, de y0 (haut) à y1 (bas) : les bords un peu irréguliers, les traces du rouleau
function bande(x0, x1, y0, y1, R) {
  if (y1 - y0 < 0.5) return; const c = xP; c.save(); c.fillStyle = motif; c.beginPath();
  const n = Math.max(1, Math.ceil((y1 - y0) / 6)); c.moveTo(x0 + Math.sin(y0 * 0.07 + R.ph) * 2.5, y0);
  for (let k = 1; k <= n; k++) { const y = y0 + (y1 - y0) * k / n; c.lineTo(x0 + Math.sin(y * 0.07 + R.ph) * 2.5, y); }
  for (let k = n; k >= 0; k--) { const y = y0 + (y1 - y0) * k / n; c.lineTo(x1 + Math.sin(y * 0.05 + R.ph * 2) * 2.5, y); }
  c.closePath(); c.fill();
  // les traces du rouleau : des stries claires et sombres, dans le sens de la montée
  c.globalAlpha = 0.07; c.lineWidth = 1.2;
  R.stries.forEach((q, k) => { c.strokeStyle = k % 2 ? '#fff' : '#0A2350'; c.beginPath(); const x = x0 + (x1 - x0) * q; c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); });
  c.restore();
}
// une flaque : un rond biscornu, des éclaboussures autour, des coulures qui descendent (P.coul)
function flaque(x, y, r, gros) {
  const c = xP; c.save(); c.fillStyle = motif; c.beginPath(); const n = 22, ph = rnd(0, TAU);
  for (let k = 0; k <= n; k++) { const a = k / n * TAU, q = 1 + 0.16 * Math.sin(a * 3 + ph) + 0.1 * Math.sin(a * 7 + ph * 2) + (Math.random() < 0.18 ? rnd(0.1, 0.3) : 0);
    const X = x + Math.cos(a) * r * q, Y = y + Math.sin(a) * r * q; k ? c.lineTo(X, Y) : c.moveTo(X, Y); }
  c.closePath(); c.fill(); c.globalAlpha = 0.35; c.strokeStyle = BORD; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1;
  // les gouttes projetées
  for (let k = 0; k < (gros ? 16 : 10); k++) { const a = rnd(0, TAU), d = r * rnd(1.05, 1.7), rr = r * rnd(0.03, 0.09); c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, TAU); c.fill(); }
  c.restore(); couvreRond(x, y, r * 0.93);
  // les coulures : elles partent du bas de la flaque, et descendent un moment
  for (let k = 0; k < (gros ? 4 : 3); k++) { const a = Math.PI * rnd(0.2, 0.8); P.coul.push({ x: x + Math.cos(a) * r * 0.85, y: y + Math.sin(a) * r * 0.85, l: 0, L: r * rnd(0.6, 1.8), w: r * rnd(0.06, 0.12), v: r * rnd(1.2, 2.4) }); }
}
function coulures(dt) {
  const c = xP; c.save(); c.strokeStyle = motif; c.lineCap = 'round';
  P.coul.forEach(D => { if (D.l >= D.L) return; const l0 = D.l; D.l = Math.min(D.L, D.l + D.v * dt * (1 - D.l / D.L * 0.7));
    c.lineWidth = D.w * (1 - l0 / D.L * 0.5); c.beginPath(); c.moveTo(D.x, D.y + l0); c.lineTo(D.x, D.y + D.l); c.stroke(); });
  c.restore(); P.coul = P.coul.filter(D => D.l < D.L);
}

/* ——— les mots (au-dessus de tout : le titre est sous la peinture) ——— */
function mot(text, x, y, size, o) { P.mots.push(Object.assign({ text, x, y, size: size || 22, t0: Wd.t, life: 1.1, rot: rnd(-0.15, 0.15) }, o)); }
function dit(c, text) { P.dits = P.dits.filter(d => d.c !== c); P.dits.push({ c, text, t0: Wd.t, life: 1.3 }); }
const mots = {
  go: () => en() ? 'Paint party!' : 'À vos rouleaux !',
  cri: () => pick(en() ? ['paint!', 'yay', 'blue!', 'go go', 'mine!'] : ['peinture !', 'ouiii', 'du bleu !', 'à l’attaque', 'hop hop', 'miaou !']),
  splash: () => pick(['SPLASH', 'SPLOTCH', 'FLATCH', 'PLOF', 'SPLAF']),
  pousse: () => pick(en() ? ['heave', 'hup', 'move!', 'nngh'] : ['hop', 'hisse', 'pousse-toi', 'hnnng', 'allez']),
  fin: () => pick(en() ? ['done!', 'bye!', 'ta-da', 'see ya'] : ['fini !', 'tadaa', 'salut !', 'à plus', 'bravo nous'])
};

/* ——— les gestes des chats (des pas en plus, pour leur file) ——— */
// monter à l'échelle en peignant : le rouleau au-dessus de la tête, il peint du bas de l'écran jusqu'en haut
STEPS.peintMonte = (c, T, dt) => {
  if (!P) return true; const L = T.L, s = sc(c); c.x = L.x - s * 0.18; c.face = 1; c.d = L.d; L.rx = L.x;
  if (!T.y0) { T.y0 = c.y; T.bas = P.H; T.phase = 0; }
  if (T.phase === 0) {   // d'abord le bas : le rouleau descend au ras de l'écran, et remonte au-dessus de sa tête
    c.anim = 'dresse'; const u = c01(T.t / 0.45), top = c.y - s * 1.25; L.ry = u < 0.35 ? top + (P.H + 4 - top) * sm(u / 0.35) : P.H + 4 - (P.H + 4 - top) * sm((u - 0.35) / 0.65);
    if (u > 0.35) { const y = L.ry; bande(L.x - L.rw / 2, L.x + L.rw / 2, y, T.bas, L); T.bas = Math.min(T.bas, y); }
    if (u >= 1) { T.phase = 1; couvreRect(L.x - L.rw / 2, T.bas, L.x + L.rw / 2, P.H); }
    return false;
  }
  if (T.phase === 1) {   // la montée
    c.anim = 'grimpe'; const v = (P.H + s) / 2.4;   // (29/09, Mathieu : « d'un coup plein de bleu » : la montée prend son temps) c.y -= v * dt; L.ry = c.y - s * 1.25;
    const y = Math.max(-8, L.ry); bande(L.x - L.rw / 2, L.x + L.rw / 2, y, T.bas + 1, L); T.bas = y; couvreRect(L.x - L.rw / 2, y, L.x + L.rw / 2, P.H);
    if (Math.random() < dt * 1.3) P.coul.push({ x: L.x + rnd(-0.45, 0.45) * L.rw, y: y + s * 0.2, l: 0, L: s * rnd(0.4, 1.1), w: rnd(3, 6), v: s * 1.4 });
    if (L.ry <= -8) { T.phase = 2; dit(c, pick(en() ? ['top!', 'done'] : ['en haut !', 'fini', 'et voilà'])); }
    return false;
  }
  if (T.phase === 2) { c.anim = 'accroche'; L.ry = c.y - s * 1.25; return P.part; }   // là-haut, il attend la fin
  return true;
};
// glisser en bas de l'échelle (les pattes serrées sur les montants), puis on repart au sol
STEPS.peintGlisse = (c, T, dt) => {
  if (!P) return true; const L = T.L, s = sc(c), sol = floorAt(c.d); c.anim = 'accroche'; T.v = (T.v || 0) + 2400 * dt; c.y = Math.min(sol, c.y + T.v * dt); L.ry = c.y - s * 1.25;
  if (c.y >= sol) { L.libre = true; K.dust(c.x, sol, s * 0.4, 0.8); return true; } return false;
};
// lancer des seaux, jusqu'à la grande salve
STEPS.peintLance = (c, T) => {
  c.face = c.x < P.W / 2 ? 1 : -1; c.y = floorAt(c.d);
  if (!P || P.salve) { c.anim = 'dresse'; return !P || P.part; }
  if (T.t > (T.next ?? 0)) { T.next = T.t + rnd(0.42, 0.62); lance(c); }
  c.anim = T.t - (T.last ?? -9) < 0.25 ? 'dresse' : 'porte';
  return false;
};
// pousser : aller au milieu, puis foncer vers le bord en poussant tout ce qu'on rencontre (le tas grossit)
STEPS.peintPousse = (c, T, dt) => {
  if (!P) return true; const s = sc(c), dir = T.dir, x0 = P.W / 2 - dir * s * 0.6;
  c.d += clamp(T.dm - c.d, -dt * 1.2, dt * 1.2); c.y = floorAt(c.d);   // (air : ni les chocs ni les voisins ne le repoussent ; il reste au sol, à sa rangée)
  if (!T.pousse) {
    c.anim = 'galop'; c.face = Math.sign(x0 - c.x) || dir; const v = SPEED.galop * s * 1.2;
    if (Math.abs(x0 - c.x) <= v * dt) { c.x = x0; T.pousse = true; T.tas = []; c.face = dir; dit(c, mots.pousse()); } else c.x += c.face * v * dt;
    return false;
  }
  // le tas : on ramasse ce qui est devant, dans sa rangée
  const avant = c.x + dir * s * 0.45, lourds = T.tas.filter(it => LOURD[it.kind]).length;
  let bout = T.tas.reduce((a, it) => a + larg(it) * 0.9, 0);
  Wd.props.forEach(it => {
    if (it.gone || it.ventre || it.on || it.held || it.peint || it.mur || it.d < T.d0 || it.d >= T.d1) return;
    const x = it.fx * P.W, hw = larg(it) / 2;
    if ((x - dir * hw - avant) * dir <= bout + s * 0.05 && (x + dir * hw - c.x) * dir > 0) { it.peint = T; T.tas.push(it); bout += larg(it) * 0.9; it.wob = Wd.t; it.wobA = 0.8;
      if (LOURD[it.kind]) mot(pick(['boum', 'hnnng', 'lourd…']), x, floorAt(it.d) - sOf(it.d) * 0.8, 18); }
  });
  // on avance (moins vite avec un gros meuble devant) ; le tas suit
  const v = s * (T.tas.length ? 2.5 : 2.8) / (1 + 0.08 * lourds); c.x += dir * v * dt; c.face = dir; c.anim = 'trot'; c.pushing = 1;
  let a = 0; T.tas.forEach(it => { const hw = larg(it) / 2; it.fx = (avant + dir * (a + hw)) / P.W; a += hw * 2 * 0.9;
    Object.assign(it, { vx: 0, vy: 0, fall: false, run: null, suck: null }); it.tilt = Math.sin(Wd.t * 22 + a) * 0.03;
    if ((it.fx * P.W - dir * hw - (dir > 0 ? P.W : 0)) * dir > 2) sort(it); });
  T.tas = T.tas.filter(it => !it.ventre);
  if (Math.random() < dt * 0.7) dit(c, mots.pousse());
  return dir > 0 ? c.x > P.W + s * 1.6 : c.x < -s * 1.6;
};
const larg = it => (it.hull ? it.hull.w : 1) * sOf(it.d) * (it.big || 1);
// un objet (et ce qui est posé dessus) sort de l'écran : il attend le retour (js/fuite.js)
function sort(it) {
  if (it.ventre) return; it.fade = it.fadeT = 0; it.ventre = true; it.tilt = 0; P.sorti && P.sorti(it);
  Wd.props.forEach(p => { let b = p.on; while (b && b !== it) b = b.on; if (b === it) sort(p); });
}

/* ——— les seaux ——— */
function lance(c, cible, salve) {
  const s = sc(c), L = cible != null ? cible : (() => { const F = libres(); if (!F.length) return null;
    // plutôt une case libre loin des autres seaux en vol, et pas trop loin du lanceur
    let best = null, bs = -1; for (let k = 0; k < 8; k++) { const q = pick(F), [x, y] = centre(q), sc2 = rnd(0, 1) - Math.abs(x - c.x) / P.W * 0.6 - P.seaux.filter(b => Math.hypot(b.tx - x, b.ty - y) < P.W * 0.1).length; if (sc2 > bs) { bs = sc2; best = q; } } return best; })();
  if (L == null) return; const [tx, ty] = centre(L);
  const x0 = c.x + c.face * s * 0.25, y0 = c.y - s * 0.9;
  P.seaux.push({ x0, y0, tx: tx + rnd(-8, 8), ty: ty + rnd(-8, 8), t0: Wd.t, dur: clamp(Math.hypot(tx - x0, ty - y0) / (P.W * 1.1), 0.35, 0.6) * (salve ? 0.9 : 1), h: s * rnd(1.2, 2.2), rot: rnd(-1, 1), sp: rnd(6, 11) * (Math.random() < 0.5 ? -1 : 1), r: P.R * rnd(0.95, 1.15) * (salve ? 1.1 : 1), gros: salve });
  c.task && (c.task.last = c.task.t); if (Math.random() < 0.35) dit(c, pick(en() ? ['hup!', 'catch!', 'yeet'] : ['hop !', 'tiens !', 'et un !', 'zou']));
}
function seaux(dt) {
  P.seaux.forEach(B => {
    const u = (Wd.t - B.t0) / B.dur;
    if (!B.plouf && u >= 1) { B.plouf = true; flaque(B.tx, B.ty, B.r, B.gros);
      // (un mot par flaque, mais pas pendant la salve : là, un sur quatre, sinon on ne voit plus que ça)
      if (!B.gros || Math.random() < 0.25) mot(mots.splash(), B.tx, B.ty - B.r * 0.2, B.gros ? 26 : 22, { blanc: true });
      // le seau vide continue sa route : il retombe et sort par le bas de l'écran
      B.vx = (B.tx - B.x0) / B.dur * 0.35; B.vy = -P.H * 0.35; B.x = B.tx; B.y = B.ty; }
    if (B.plouf) { B.vy += 2600 * dt; B.x += B.vx * dt; B.y += B.vy * dt; B.rot += B.sp * dt; }
    else { const e = c01(u); B.x = B.x0 + (B.tx - B.x0) * e; B.y = B.y0 + (B.ty - B.y0) * e - B.h * 4 * e * (1 - e); B.rot += B.sp * 0.3 * dt; }
  });
  P.seaux = P.seaux.filter(B => !(B.plouf && B.y > P.H + 80));
}

/* ——— les échelles ——— */
function echelles() {
  const W = P.W, n = clamp(Math.round(W / 260), 3, 7), bw = W / n;
  return Array.from({ length: n }, (_, i) => ({ i, x: (i + 0.5) * bw, d: 0.12 + (i % 2) * 0.06, rw: bw * 0.66, ph: rnd(0, TAU), stries: Array.from({ length: 7 }, () => rnd(0.05, 0.95)),
    t0: Wd.t + 0.05 + Math.abs(i - (n - 1) / 2) * 0.09 + rnd(0, 0.05), haut: -P.H * rnd(0.25, 0.45), pose: false, ry: null, chat: null, vol: null }));
}
function dessineEchelle(c, L, now) {
  const s0 = sOf(L.d), sol = floorAt(L.d), w = s0 * 0.42;
  let dy = 0, rot = 0, u = now - L.t0; if (u < 0) return;
  if (!L.pose) { const e = c01(u / 0.38); dy = -(1 - e * e) * (P.H * 1.6); if (e >= 1) { L.pose = true; L.tp = now; mot('BAM', L.x, sol - s0 * 0.4, 26); K.dust(L.x, sol, s0 * 0.6, 1); } }
  else if (now - L.tp < 0.4) { const q = now - L.tp; rot = Math.sin(q * 30) * 0.03 * (1 - q / 0.4); }
  if (L.vol) { const q = now - L.vol; dy = -q * q * P.H * 1.6 - q * 60; rot = Math.sin(q * 9 + L.ph) * 0.12; }
  const H = sol - L.haut;
  c.save(); c.translate(L.x, sol + dy); c.rotate(rot); c.strokeStyle = INK; c.lineWidth = 2.6; c.lineCap = 'round';
  c.fillStyle = PAPIER; [-1, 1].forEach(g => { c.beginPath(); c.moveTo(g * w / 2, 0); c.lineTo(g * w / 2 * 0.8, -H); c.stroke(); });
  for (let y = s0 * 0.28; y < H; y += s0 * 0.3) { const k = 1 - 0.2 * y / H; c.beginPath(); c.moveTo(-w / 2 * k, -y); c.lineTo(w / 2 * k, -y); c.stroke(); }
  // l'hélice : l'échelle qui s'en va
  if (L.vol) { const q = now - L.vol; c.beginPath(); c.moveTo(0, -H); c.lineTo(0, -H - s0 * 0.3); c.stroke(); const a = Math.cos(q * 40) * s0 * 0.6; c.beginPath(); c.moveTo(-a, -H - s0 * 0.3); c.lineTo(a, -H - s0 * 0.3); c.stroke(); }
  c.restore();
}
// le rouleau à long manche : du chat (ses pattes) au rouleau (au-dessus de lui)
function dessineRouleau(c, L) {
  const ch = L.chat; if (!ch || L.ry == null || !Wd.cats.includes(ch)) return; const s = sc(ch), px = ch.x + s * 0.12, py = ch.y - s * 0.75, rh = Math.max(10, s * 0.14);
  c.save(); c.strokeStyle = INK; c.lineWidth = 2.6; c.lineCap = c.lineJoin = 'round';
  const X = L.rx ?? L.x, rw = L.rw;
  c.beginPath(); c.moveTo(px, py); c.lineTo(X, L.ry + rh * 1.6); c.lineTo(X, L.ry + rh * 0.5); c.moveTo(X - rw / 2 - 4, L.ry); c.lineTo(X - rw / 2 - 4, L.ry + rh * 0.5); c.lineTo(X, L.ry + rh * 0.5); c.stroke();
  c.beginPath(); c.roundRect ? c.roundRect(X - rw / 2, L.ry - rh / 2, rw, rh, rh / 2) : c.rect(X - rw / 2, L.ry - rh / 2, rw, rh);
  c.fillStyle = '#1C58A2'; c.fill(); c.stroke();
  c.globalAlpha = 0.5; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X - rw / 2 + rh * 0.4, L.ry - rh * 0.18); c.lineTo(X + rw / 2 - rh * 0.4, L.ry - rh * 0.18); c.stroke();
  c.restore();
}
function dessineSeau(c, B) {
  const s = P.R * 0.36; c.save(); c.translate(B.x, B.y); c.rotate(B.rot); c.strokeStyle = INK; c.lineWidth = 2.6; c.lineJoin = c.lineCap = 'round';
  c.beginPath(); c.moveTo(-s * 0.5, -s * 0.45); c.lineTo(-s * 0.38, s * 0.45); c.lineTo(s * 0.38, s * 0.45); c.lineTo(s * 0.5, -s * 0.45); c.closePath(); c.fillStyle = PAPIER; c.fill(); c.stroke();
  c.beginPath(); c.ellipse(0, -s * 0.45, s * 0.5, s * 0.12, 0, 0, TAU); c.fillStyle = B.plouf ? PAPIER : '#1C58A2'; c.fill(); c.stroke();
  c.beginPath(); c.arc(0, -s * 0.45, s * 0.52, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  c.restore();
  // la traînée de peinture derrière le seau plein
  if (!B.plouf) { const u = c01((Wd.t - B.t0) / B.dur); c.save(); c.fillStyle = motif;
    for (let k = 1; k <= 6; k++) { const e = Math.max(0, u - k * 0.035), x = B.x0 + (B.tx - B.x0) * e, y = B.y0 + (B.ty - B.y0) * e - B.h * 4 * e * (1 - e);
      c.beginPath(); c.arc(x + Math.sin(k * 3.1) * 4, y + Math.cos(k * 2.3) * 4, P.R * 0.09 * (1 - k / 8), 0, TAU); c.fill(); } c.restore(); }
}
function dessineMots(c) {
  const now = Wd.t; c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const un = (text, x, y, size, rot, e, blanc) => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(e, e); c.font = `700 ${Math.round(size)}px "Patrick Hand","Comic Sans MS",cursive`;
    c.lineWidth = Math.max(3, size * 0.16); c.strokeStyle = blanc ? INK : PAPIER; c.strokeText(text, 0, 0); c.fillStyle = blanc ? PAPIER : INK; c.fillText(text, 0, 0); c.restore(); };
  // (ils apparaissent d'un coup, gonflent un peu, et rapetissent jusqu'à rien : pas de fondu)
  const ech = u => u < 0.12 ? 0.6 + 0.6 * sm(u / 0.12) : u > 0.8 ? 1.2 * (1 - sm((u - 0.8) / 0.2)) : 1.2 - 0.2 * sm((u - 0.12) / 0.3);
  P.mots.forEach(M => { const u = (now - M.t0) / M.life; if (u < 0 || u > 1) return; un(M.text, M.x, M.y - u * 16, M.size, M.rot, ech(u), M.blanc); });
  P.dits.forEach(D => { const u = (now - D.t0) / D.life; if (u > 1 || !Wd.cats.includes(D.c)) return; const h = window.Chat && Chat.where ? Chat.where(D.c, D.c.head) : [D.c.x, D.c.y - sc(D.c)];
    un(D.text, h[0] + D.c.face * sc(D.c) * 0.25, h[1] - sc(D.c) * 0.55, clamp(sc(D.c) * 0.15, 14, 21), D.c.face * 0.1, ech(u), false); });
  c.restore(); P.mots = P.mots.filter(M => now - M.t0 < M.life); P.dits = P.dits.filter(D => now - D.t0 < D.life);
}

/* ——— les rôles : chaque chat au sol reçoit une tâche ; il en manque ? d'autres tombent du ciel ——— */
const pret = c => !c.gone && !c.fall && !c.jump && !c.held && !c.role && Wd.cats.includes(c);
const pt = T => Object.assign(T, { pt: 1 });   // (un pas du festival : sa file le reconnaît)
const aLui = c => c.task && (c.task.pt || c.task.fuite) || c.q.some(T => T.pt || T.fuite);
function roles() {
  Wd.cats.forEach(c => {
    if (c.gone || !Wd.cats.includes(c)) return;
    // perché (tombé du ciel sur un meuble) : il saute en bas d'abord
    if (c.perch && !c.fall && !c.jump && !c.held) { interrupt(c); c.perch = null; c.fall = true; c.vy = 0; c.vx = 0; return; }
    // un chat dont la file a été remplacée (écrasé par un autre qui tombait, bousculé…) : on lui redonne sa tâche
    if (c.role && !c.fall && !c.jump && !c.held && !aLui(c)) {
      if (c.role === 'part') return;
      if (c.role === 'pousse' && c.roleT) { if (c.roleT.tas) c.roleT.tas.forEach(it => { it.peint = null; }); P.pous.unshift({ dir: c.roleT.dir, d0: c.roleT.d0, d1: c.roleT.d1, dm: c.roleT.dm }); }
      if (c.role === 'grimpe') P.ech.forEach(L => { if (L.chat === c && !L.libre) { L.chat = null; L.ry = null; } });
      if (c.role === 'lance') P.lanceurs = Math.max(0, P.lanceurs - 1);
      c.role = null;
    }
    if (!pret(c)) return;
    if (P.part) { pars(c); return; }
    const L = P.ech.filter(L => !L.chat && !L.vol).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0];
    interrupt(c); c.hidden = 0;
    if (P.pous.length) { const T = pt(Object.assign({ k: 'peintPousse', air: true }, P.pous.shift())); c.role = 'pousse'; c.roleT = T; c.q = [T, pt(fn(c => { c.gone = true; }))]; return; }
    if (L) { L.chat = c; c.role = 'grimpe'; c.q = [pt(go(L.x - sc(c) * 0.18, { g: 'galop', v: 1.8, d: L.d })), pt({ k: 'wait', anim: 'affut', until: () => L.pose, max: 2 }),
      pt({ k: 'peintMonte', L, air: true }), pt({ k: 'peintGlisse', L, air: true })]; dit(c, mots.cri()); return; }
    const xs = P.lanceurs++, x = P.W * (0.18 + ((xs * 0.618) % 1) * 0.64);
    c.role = 'lance'; c.q = [pt(go(x, { g: 'galop', v: 1.6 })), pt({ k: 'peintLance', air: true })]; dit(c, mots.cri());
  });
  // les renforts : ils tombent du ciel, là où il manque du monde
  const besoin = P.ech.filter(L => !L.chat).length + P.pous.length + Math.max(0, P.nLance - P.lanceurs), en_route = Wd.cats.filter(c => !c.role && !c.gone).length;
  if (!P.part && besoin > en_route && Wd.cats.length < K.MAXC && Wd.t > P.renfort) {
    P.renfort = Wd.t + 0.07; const k = addCat({ x: rnd(0.08, 0.92) * P.W, temp: true, d: rnd(0.05, 0.6) }); k.y = -sc(k) * 1.2; k.fall = true; k.vy = 0; k.vx = 0;
    if (Math.random() < 0.5) mot(pick(en() ? ['incoming!', 'me too!'] : ['j’arrive !', 'moi aussi !', 'attendez-moi']), k.x, sc(k) * 0.8, 18);
  }
}

/* ——— le déroulé ——— */
function go0(o, opts) {
  if (P) return false; toiles(); const W = Wd.W, Hh = Wd.H;
  P = { t0: Wd.t, o, W, H: Hh, g: cases(), coul: [], mots: [], dits: [], seaux: [], fini: opts.fini, sorti: opts.sorti, R: Math.max(W, Hh) * (W < 700 ? 0.16 : 0.1),
    lanceurs: 0, nLance: W < 700 ? 2 : 3, renfort: Wd.t + 0.15, part: false, fait: false, kib: Wd.nextKib, extra: Wd.nextExtra };
  taille(W, Hh); Wd.nextKib = Wd.nextExtra = Infinity;
  const ti = document.getElementById('titles'); if (ti) { P.tiZ = ti.style.zIndex; ti.style.zIndex = '0'; }
  P.boutons = ['stay', 'enter'].map(id => document.getElementById(id)).filter(Boolean);
  if (reduit) { xP.fillStyle = motif; xP.fillRect(0, 0, W, Hh); P.g.fill(1); Wd.props.forEach(it => { if (!it.gone && !it.ventre && !it.on) sort(it); }); Wd.cats.forEach(c => { c.gone = true; c.fin = true; }); P.boutons.forEach(b => b.style.visibility = 'hidden'); P.fait = true; later(0.05, () => P && P.fini && P.fini()); return true; }
  P.ech = echelles();
  // les pousseurs : de chaque côté, une rangée devant et une derrière (une seule sur téléphone)
  const nr = W < 700 ? 1 : 2; P.pous = [];
  for (let r = 0; r < nr; r++) [-1, 1].forEach(dir => P.pous.push({ dir, d0: r / nr, d1: r === nr - 1 ? 9 : (r + 1) / nr, dm: (r + 0.5) / nr * 0.9 }));
  // la trappe accrochée au mur : elle glisse le long du mur, hors de l'écran
  Wd.props.forEach(it => { if (it.mur && !it.ventre && !it.gone) later(0.9, () => { if (!P) return; it.peintFixe = it.fixe; it.fixe = true; it.peintMur = true; mot('scrrr', P.W - 40, floorAt(it.d) - it.lift, 20); }); });
  // tout le monde est réquisitionné : ceux qu'on tenait tombent, les perchés sautent
  Wd.cats.forEach(c => { c.held = false; interrupt(c); c.hidden = 0; c.role = null; });
  mot(mots.go(), W / 2, Hh * 0.22, W < 700 ? 30 : 42, { life: 1.4, rot: -0.05 });
  // les croquettes : elles giclent vers les bords
  Wd.kib.forEach(k => { if (k.gone || k.suck) return; k.rest = false; k.swept = true; k.who = null; k.vx = (k.x < W / 2 ? -1 : 1) * rnd(300, 700); k.vy = -rnd(120, 380); });
  return true;
}
H.pre.push(dt => {
  if (!P || P.fait && !P.part) return; const u = Wd.t - P.t0;
  (P.ech || []).forEach(L => { const c = L.chat; if (!c || !Wd.cats.includes(c) || c.task && (c.task.k === 'peintMonte' || c.task.k === 'peintGlisse')) return;
    const s = sc(c); L.rx = c.x + c.face * s * 0.15; L.ry = c.y - s * 1.25; });
  if (!P.fait) {
    roles(); seaux(dt); coulures(dt);
    Wd.props.forEach(it => { if (it.peintMur && !it.ventre) { it.fx += dt * 0.35; if (it.fx * P.W - larg(it) / 2 > P.W + 2) sort(it); } });
    // les boutons : quand un coup de peinture les recouvre, ils sont sous la peinture
    P.boutons.forEach(b => { if (b.style.visibility === 'hidden') return; const r = b.getBoundingClientRect(); if (couvert(r.left + r.width / 2, r.top + r.height / 2)) { b.style.visibility = 'hidden'; } });
    // la grande salve : quand les grimpeurs sont en haut (ou qu'il est l'heure), tous les lanceurs, tout ce qui reste
    const hauts = P.ech.every(L => L.chat && L.chat.task && L.chat.task.k === 'peintMonte' && L.chat.task.phase === 2);
    if (!P.salve && (hauts && u > 2.5 || u > 5.5)) {
      P.salve = Wd.t; mot('SPLAAASH', P.W / 2, P.H * 0.3, P.W < 700 ? 38 : 60, { life: 1.3, blanc: true, rot: -0.06 });
      const L = Wd.cats.filter(c => c.role === 'lance' && Wd.cats.includes(c) && !c.gone), F = libres(); let k = 0;
      // chaque case libre qui n'est pas déjà sous une flaque prévue reçoit son seau
      // (29/09, Mathieu : « d'un coup plein de bleu arrive, tout n'est pas logique ») : la salve n'est plus un coup de tonnerre ; chaque seau part
      // d'un lanceur qu'on voit, les uns après les autres, sur deux secondes et demie, et du bas vers le haut ; sans lanceur, c'est un chat qui passe
      // qui le jette (jamais une flaque qui tombe de nulle part)
      const vus = []; F.slice().sort((a, b) => centre(b)[1] - centre(a)[1]).forEach(q => { const [x, y] = centre(q); if (vus.some(([a, b]) => Math.hypot(a - x, b - y) < P.R * 0.85)) return; vus.push([x, y]); });
      const pas = 2.5 / Math.max(1, vus.length); vus.forEach(([x, y], i) => { const q = F.find(f => { const [a, b] = centre(f); return a === x && b === y; }); later(i * pas, () => { if (!P || P.fait) return;
        const Ls = Wd.cats.filter(c => c.role === 'lance' && !c.gone && c.x > 0 && c.x < P.W), c = Ls.length ? Ls[i % Ls.length] : L[i % Math.max(1, L.length)];
        if (c && Wd.cats.includes(c)) lance(c, q, true); else flaque(x, y, P.R * 1.1, true); }); });
      P.salveFin = Wd.t + 2.5 + 0.7;
    }
    if (P.salve && Wd.t > (P.salveFin || 0) && !P.seaux.some(B => !B.plouf) && !P.part) {
      // plus rien en vol : les derniers trous sont bouchés d'un coup de pinceau, et tout le monde s'en va
      libres().forEach((q, i) => { const [x, y] = centre(q); later(i * 0.05, () => { if (P && !P.fait) flaque(x, y, P.R * 0.8, false); }); });
      xP.fillStyle = motif; P.boutons.forEach(b => b.style.visibility = 'hidden');
      depart();
    }
  }
  if (P.part) {
    seaux(dt); coulures(dt); roles();
    const reste = Wd.cats.filter(c => !c.gone && c.x > -sc(c) * 0.8 && c.x < P.W + sc(c) * 0.8), vol = P.ech.some(L => !L.vol || Wd.t - L.vol < 1.1);
    if (!P.fait && (!reste.length && !vol || Wd.t - P.part > 4.5)) { P.fait = true; xP.fillStyle = motif; xP.fillRect(0, 0, P.W, P.H);
      Wd.props.forEach(it => { if (!it.gone && !it.ventre && !it.on && it.fade > 0.3) sort(it); }); P.fini && P.fini(); }
  }
});
// s'en aller à pied, au galop, par le bord le plus proche
function pars(c, side) {
  side = side || (c.x < P.W / 2 ? -1 : 1); interrupt(c); c.role = 'part';
  // (js/fuite.js s'en charge : c.fuit, il file au galop vers son bord, et repart aussitôt si quelque chose l'a distrait en chemin)
  c.fuit = side; if (Math.random() < 0.5) dit(c, mots.fin());
}
function depart() {
  P.part = Wd.t;
  Wd.cats.forEach((c, i) => {
    if (c.gone) return; const s = sc(c), side = c.x < P.W / 2 ? -1 : 1, dehors = side < 0 ? -s * 2 : P.W + s * 2;
    const monte = c.task && (c.task.k === 'peintMonte' && c.task.phase >= 1 || c.task.k === 'peintGlisse');
    if (c.role === 'grimpe' && monte) { later(i * 0.04 + rnd(0, 0.15), () => { if (!Wd.cats.includes(c)) return; dit(c, mots.fin()); }); return; }   // (il glisse d'abord : peintMonte rend la main, puis peintGlisse)
    if (c.role === 'pousse') return;
    if (c.role === 'grimpe') { const L = P.ech.find(L => L.chat === c); if (L) L.libre = true; }
    if (c.fall || c.jump || c.held) { c.role = null; return; }   // (encore en l'air : il partira en atterrissant, pars())
    pars(c, side);
  });
  // les grimpeurs : en bas de l'échelle, ils filent aussi ; puis l'échelle s'envole
  P.ech.forEach((L, i) => { const c = L.chat;
    if (c && Wd.cats.includes(c) && c.role === 'grimpe') { const s = sc(c), side = c.x < P.W / 2 ? -1 : 1; c.q.push(pt(go(side < 0 ? -s * 2 : P.W + s * 2, { g: 'galop', v: 1.4 })), pt(fn(c => { c.gone = true; }))); }
    const vole = () => { if (!P || L.vol) return; if (L.chat && Wd.cats.includes(L.chat) && !L.libre && Wd.t - P.part < 1.5) { later(0.1, vole); return; } L.vol = Wd.t + i * 0.06; later(i * 0.06 + 0.1, () => P && mot('fiuuu', L.x, P.H * 0.25, 22, { blanc: true })); };
    later(0.35, vole); });
}
H.draw.push(() => {
  if (!P || !cvO) return; const W = P.W, Hh = P.H;
  xO.clearRect(0, 0, W, Hh); xM.clearRect(0, 0, W, Hh); if (P.fait) return;
  const now = Wd.t; (P.ech || []).forEach(L => dessineEchelle(xO, L, now));
  (P.ech || []).forEach(L => dessineRouleau(xO, L));
  P.seaux.forEach(B => dessineSeau(xO, B));
  dessineMots(xM);
});
// après l'ouverture du mode sérieux (par-dessus, opaque) : on range tout
function range() {
  if (!P) return; const ti = document.getElementById('titles'); if (ti) ti.style.zIndex = P.tiZ || '';
  [cvP, cvO, cvM].forEach(c => { if (c) { c.getContext('2d').clearRect(0, 0, c.width, c.height); c.style.display = 'none'; } });
  // (ceux qui n'étaient pas encore sortis : le mode sérieux les cache, ils finissent leur sortie hors champ)
  Wd.cats.forEach(c => { if (c.role && !c.gone) { interrupt(c); c.x = c.x < P.W / 2 ? -P.W : P.W * 2; c.gone = true; } c.role = null; c.roleT = null; });
  Wd.props.forEach(it => { if (it.peintMur) { it.fixe = it.peintFixe; delete it.peintFixe; delete it.peintMur; } delete it.peint; });
  Wd.nextKib = Wd.t + rnd(16, 32); Wd.nextExtra = Wd.t + rnd(1.5, 4);
  P = null;
}
// au retour (le mode sérieux se ferme) : les boutons sont de nouveau là
function stop() { range(); ['stay', 'enter'].forEach(id => { const b = document.getElementById(id); if (b) b.style.visibility = ''; }); }
addEventListener('serieux:ferme', stop);
return { go: go0, range, stop, get actif() { return !!P; }, get P() { return P; } };
})();
