/* Le passage au mode sérieux (28/09, Mathieu : « fais plutôt un bouton "mode sérieux" : au clic on vire les chats, qui s'en vont effrayés,
   les objets disparaissent dans des trous, tout se clean, on passe en mode page au scroll »).
   Ce fichier est du côté du mode chat : il fait place nette, puis passe la main au mode sérieux (js/serieux.js : Serieux.ouvre / ferme).
   (29/09, 20:41, Mathieu : « oublie le système de peinture ; fais juste comme le trou noir : tout tombe dans des trous, les chats partent
   rapidement, effrayés ; puis une animation pour amener le mode sérieux par étapes »). Le festival de peinture (js/peinture.js) est retiré.
   Trois étapes, sans aucun fondu :
   1. La fuite : les chats sursautent et filent au galop vers le bord le plus proche. Sous chaque objet, un trou s'ouvre en vague depuis
      le bouton ; il bascule dedans. Les lettres du titre et les deux boutons tombent aussi, chacun dans son trou.
   2. Le tracé : sur la pièce vide, la plume trace le plan du mode sérieux (le filet du haut, le sommaire à gauche, le cartouche en bas à droite).
   3. Les tuiles : la grille se retourne, carreau après carreau, depuis le bouton ; chaque carreau montre sa face bleue (le bleu exact du
      mode sérieux). Quand tout est bleu, le mode sérieux s'ouvre par-dessus, sans cercle, et ses éléments arrivent un à un.
   Au retour (Serieux.ferme) : les trous se rouvrent et recrachent chaque objet à sa place, les lettres et les boutons ressortent, les chats reviennent. */
window.Fuite = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, clamp, sgn, sm, sOf, floorAt, say, interrupt, go, fn, later, grav, sc, pose } = K;
const TAU = Math.PI * 2, c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const en = () => !!(window.I18N && I18N.lang && I18N.lang !== 'fr');
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });

let F = null;         // la sortie en cours : { t0, trous, o (d'où s'ouvre le mode sérieux), ouvert }
let avales = [];      // les objets partis dans les trous (ils reviendront)
const trous = [];     // { x, y, r, t0, ouvre, ferme, fin } : un trou dans le sol (dessiné au trait)

function go0(btn) {
  if (F || !window.Serieux) return false;
  const r = btn && btn.getBoundingClientRect(), o = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
  F = { t0: Wd.t, o, scen: Wd.nextScen }; Wd.fuite = true; Wd.nextIn = Wd.nextScen = Infinity; const moi = F;
  // 1. les chats : un sursaut, le poil hérissé, puis la fuite au galop (ceux qu'on tenait tombent d'abord)
  Wd.cats.forEach((c, i) => {
    if (c.gone) return; c.held = false; interrupt(c); c.hidden = 0;
    const dir = c.x < Wd.W / 2 ? -1 : 1, s = sc(c);
    later(i * 0.02, () => { if (c.gone) return; c.fall = true; c.vy = -Math.sqrt(2 * grav() * s * 0.5); c.vx = -dir * 40; c.face = -dir;
      say(c, pick(en() ? ['!!', 'EEK', 'run!', 'hsss'] : ['!!', 'AAAH', 'fshhh', 'au secours', 'sauve qui peut !', 'mia !!'])); word(pick(['!', '!!', '⚡']), c.x, c.y - s * 1.1, 22); });
    later(0.15 + i * 0.02, () => { c.fuit = dir; });
  });
  // les objets : chacun son trou, en vague depuis le bouton
  const P = Wd.props.filter(it => !it.gone && it.fade > 0.3 && !it.ventre).sort((a, b) => Math.abs(a.fx * Wd.W - o.x) - Math.abs(b.fx * Wd.W - o.x));
  P.forEach((it, i) => later(0.15 + i * 0.035, () => { if (F === moi) avale(it); }));
  // les croquettes par terre : de petits trous
  Wd.kib.forEach((k, i) => { if (k.gone || k.suck) return; later(0.1 + i * 0.01, () => { if (k.gone) return; trou(k.x, k.y + 2, Wd.s0 * 0.07, 0.2, 0.5); later(0.2, () => { k.gone = true; }); }); });
  // les lettres du titre : chacune bascule et tombe dans un trou qui s'ouvre sous elle
  const Ls = window.Vie && Vie.LETTERS && Vie.LETTERS(), rt = Ls && Vie.RECT();
  if (Ls) Ls.slice().sort((a, b) => Math.abs(rt.left + a.cx - o.x) - Math.abs(rt.left + b.cx - o.x)).forEach((L, i) => later(0.3 + i * 0.04, () => { if (F !== moi || L.a <= 0) return;
    L.st = 'trou'; L.vx = rnd(-30, 30); L.vy = -rnd(60, 160); L.vr = rnd(-4, 4); L.trouX = null; }));
  // les deux boutons : ils tombent aussi, chacun dans son trou
  ['stay', 'enter'].map(id => document.getElementById(id)).filter(Boolean).forEach((b, i) => later(0.2 + i * 0.12, () => { if (F === moi) tombeBouton(b); }));
  // 2 et 3 : le tracé du plan, puis les tuiles bleues ; enfin le mode sérieux, sans cercle
  etapes(o, () => { if (F !== moi || F.ouvert) return; F.ouvert = true; const p = Serieux.ouvre({ x: o.x, y: o.y, instant: true, papier: true }); if (p && p.then) p.then(() => {}, () => {}); setTimeout(range, 450); });
  return true;
}
// un bouton tombe dans un trou : il se soulève, bascule, plonge jusqu'au sol et passe dedans (il ne s'efface pas : il est avalé)
function tombeBouton(b) {
  const r = b.getBoundingClientRect(); if (!r.width || b.style.visibility === 'hidden') return;
  const x = r.left + r.width / 2, fl = floorAt(0.35), dy = fl - (r.top + r.height / 2);
  trou(x, fl, Math.max(Wd.s0 * 0.3, r.width * 0.42), 0.15, 0.9);
  if (!b.animate || reduit) { b.style.visibility = 'hidden'; return; }
  const a = b.animate([{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.05, .92)', offset: 0.22 }, { transform: `translateY(${dy}px) scale(.3)` }], { duration: 620, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' });
  a.onfinish = () => { b.style.visibility = 'hidden'; a.cancel(); word(pick(['gloup', 'plop']), x, fl - Wd.s0 * 0.2, 18); };
}
// au retour, il ressort de son trou et reprend sa place d'un bond
function sortBouton(b, dl) {
  if (b.style.visibility !== 'hidden') return; setTimeout(() => {
    b.style.visibility = ''; const r = b.getBoundingClientRect(), fl = floorAt(0.35), dy = fl - (r.top + r.height / 2); trou(r.left + r.width / 2, fl, Math.max(Wd.s0 * 0.3, r.width * 0.42), 0.15, 0.6);
    if (b.animate && !reduit) b.animate([{ transform: `translateY(${dy}px) scale(.35)` }, { transform: 'translateY(-18px) scale(1.04)', offset: 0.7 }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.3,1.3,.5,1)' }); }, dl);
}

/* ——— étapes 2 et 3 : le plan tracé à la plume, puis les carreaux qui se retournent en bleu ——— */
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let cvE = null, xE = null, bleu = null, E = null, vit = 1;   // (vit : pour les captures, on ralentit)
const T_TRACE = 1.0, T_TUILES = 1.9, FLIP = 0.3;
function toileE() {
  if (!cvE) { cvE = document.createElement('canvas'); cvE.className = 'passage'; cvE.setAttribute('aria-hidden', 'true');
    Object.assign(cvE.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '57', pointerEvents: 'none', display: 'none' }); document.body.appendChild(cvE); xE = cvE.getContext('2d'); }
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, Hh = innerHeight; cvE.width = Math.round(W * dpr); cvE.height = Math.round(Hh * dpr); xE.setTransform(dpr, 0, 0, dpr, 0, 0);
  // le bleu du mode sérieux (css/serieux.css : radial-gradient(ellipse at 50% 40%, --sx-hi 0, --sx-fond 45%, --sx-bas 100%)) : les carreaux y découpent leur face
  bleu = document.createElement('canvas'); bleu.width = W; bleu.height = Hh; const b = bleu.getContext('2d'), cx = W / 2, cy = Hh * 0.4, rx = Math.max(cx, W - cx) * Math.SQRT2, ry = Math.max(cy, Hh - cy) * Math.SQRT2;
  b.fillStyle = '#133F7C'; b.fillRect(0, 0, W, Hh); b.save(); b.translate(cx, cy); b.scale(1, ry / rx); const g = b.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, '#2468B6'); g.addColorStop(0.45, '#1C58A2'); g.addColorStop(1, '#133F7C'); b.fillStyle = g; b.fillRect(-rx, -rx, rx * 2, rx * 2); b.restore();
  return [W, Hh];
}
function etapes(o, fini) {
  const [W, Hh] = toileE(), T = 48, tu = [], dmax = Math.hypot(Math.max(o.x, W - o.x), Math.max(o.y, Hh - o.y));
  for (let y = 0; y < Hh; y += T) for (let x = 0; x < W; x += T) { const d = Math.hypot(x + T / 2 - o.x, y + T / 2 - o.y); tu.push({ x, y, t: T_TUILES + d / dmax * 1.0 + Math.random() * 0.12 }); }
  // le plan du mode sérieux, en traits : le filet du haut, les crans du sommaire à gauche, le cartouche en bas à droite
  const m = Math.max(16, Math.min(40, W * 0.03)), hy = 62, cw = Math.min(260, W * 0.6), ch = 64, pl = [];
  pl.push({ L: [[m, hy], [W - m, hy]], d: 0.35 });
  if (W >= 700) pl.push({ L: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => [[m, Hh / 2 + (i - 4) * 23], [m + 14, Hh / 2 + (i - 4) * 23]]), d: 0.35, crans: true });
  pl.push({ L: [[W - m - cw, Hh - m - ch], [W - m, Hh - m - ch], [W - m, Hh - m], [W - m - cw, Hh - m], [W - m - cw, Hh - m - ch]], d: 0.4 });
  E = { t0: performance.now() / 1000, o, W, Hh, T, tu, pl, fini, fin: T_TUILES + 1.12 + FLIP };
  if (reduit) { E.t0 -= 99; }
  cvE.style.display = 'block'; requestAnimationFrame(image);
}
function image() {
  if (!E) return; const t = (performance.now() / 1000 - E.t0) * vit, { W, Hh, T } = E, c = xE; c.clearRect(0, 0, W, Hh);
  const ink = `rgb(${(window.THEME && THEME.ink) || '34,36,40'})`; c.lineCap = c.lineJoin = 'round';
  // 2. la plume trace le plan, trait après trait ; sa pointe est un point d'encre
  let t1 = T_TRACE; c.strokeStyle = ink; c.lineWidth = 2.6;
  E.pl.forEach(P => { const u = c01((t - t1) / P.d); t1 += P.d; if (u <= 0) return;
    if (P.crans) { P.L.forEach(([a, b], i) => { const v = c01(u * P.L.length - i); if (v <= 0) return; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + (b[0] - a[0]) * v, b[1]); c.stroke(); }); return; }
    const Ls = []; let tot = 0; for (let i = 1; i < P.L.length; i++) { const l = Math.hypot(P.L[i][0] - P.L[i - 1][0], P.L[i][1] - P.L[i - 1][1]); Ls.push(l); tot += l; }
    let reste = tot * u, x = P.L[0][0], y = P.L[0][1]; c.beginPath(); c.moveTo(x, y);
    for (let i = 1; i < P.L.length && reste > 0; i++) { const k = Math.min(1, reste / Ls[i - 1]); x = P.L[i - 1][0] + (P.L[i][0] - P.L[i - 1][0]) * k; y = P.L[i - 1][1] + (P.L[i][1] - P.L[i - 1][1]) * k; c.lineTo(x, y); reste -= Ls[i - 1]; }
    c.stroke(); if (u < 1) { c.fillStyle = ink; c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); } });
  // 3. les carreaux se retournent : la face papier se referme (un trait d'encre sur sa tranche), la face bleue s'ouvre
  let tous = true;
  E.tu.forEach(q => { const u = c01((t - q.t) / FLIP); if (u < 1) tous = false; if (u <= 0) return; const cx = q.x + T / 2;
    // (la face bleue s'ouvre depuis le milieu du carreau, comme une carte qu'on retourne ; sa tranche, un filet clair, disparaît à plat)
    // (vague d'essai : les carreaux qui s'ouvraient en largeur faisaient des rayures ; ils poussent maintenant depuis leur centre, en carré,
    // avec un petit rebond, et un filet clair tant qu'ils ne sont pas posés)
    const e = u < 1 ? 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2) : 1, w = T * Math.max(0.01, Math.min(1.12, e)), cy = q.y + T / 2;
    if (u < 1) { c.drawImage(bleu, q.x, q.y, T, T, cx - w / 2, cy - w / 2, w, w); c.strokeStyle = 'rgba(238,245,255,.5)'; c.lineWidth = 1; c.strokeRect(cx - w / 2 + 0.5, cy - w / 2 + 0.5, w - 1, w - 1); }
    else c.drawImage(bleu, q.x, q.y, T, T, q.x, q.y, T, T); });
  if (tous || t > E.fin + 0.3) { const f = E.fini; E.fini = null; if (f) f(); }
  requestAnimationFrame(image);
}
// le mode sérieux est ouvert par-dessus (opaque) : on range la toile
function range() { E = null; if (cvE) { xE.setTransform(1, 0, 0, 1, 0, 0); xE.clearRect(0, 0, cvE.width, cvE.height); cvE.style.display = 'none'; } }

// un trou s'ouvre sous l'objet ; il tremble, bascule, tombe dedans en rapetissant ; le trou se referme
function avale(it) {
  if (!Wd.props.includes(it) || it.gone) return;
  Wd.cats.forEach(c => { if (c.perch && c.perch.it === it) interrupt(c); });
  const s = sOf(it.d) * (it.big || 1), x = it.fx * Wd.W, y = floorAt(it.d), R = clamp(s * (K.LOURD[it.kind] ? 0.75 : 0.45), Wd.s0 * 0.18, Wd.s0 * 1.2);
  trou(x, y, R, 0.15, 0.7);
  Object.assign(it, { on: null, dans: null, fall: false, held: false, run: null, vx: 0, vy: 0, suck: null });
  it.trou = { t0: Wd.t, rapide: true, lift: it.lift, big: it.big || 1, tilt: it.tilt || 0, sens: Math.random() < 0.5 ? -1 : 1 };
}
function trou(x, y, r, ouvre, ferme) { trous.push({ x, y, r, t0: Wd.t, ouvre, ferme, fin: Wd.t + ouvre + ferme + 0.45 }); }

// la fuite : chacun file vers son bord ; perché (sur le titre, un bouton, un meuble), il saute d'abord ; si autre chose lui donne
// une autre idée en chemin (le tuto, un jeu), il repart aussitôt
function fuit(c) {
  if (c.gone || c.held || c.fall || !Wd.cats.includes(c)) return; const s = sc(c);
  if (c.y < floorAt(c.d) - 4 && !(c.task && c.task.fuite)) { interrupt(c); c.fall = true; c.vy = 0; c.vx = c.fuit * 60; return; }
  if (c.task && c.task.fuite || c.q.some(T => T.fuite)) return;
  interrupt(c); const T = go(c.fuit < 0 ? -s * 2.2 : Wd.W + s * 2.2, { g: 'galop', v: 2.1 }); T.fuite = true; c.q = [T, fn(c => { c.gone = true; })];
}
// chaque image : les chats qui fuient ; les objets qui tombent dans leur trou (ou en ressortent, au retour)
H.pre.push(dt0 => {
  if (F) Wd.cats.forEach(c => { if (c.fuit) fuit(c); });
  Wd.props.forEach(it => {
    const T = it.trou; if (!T) return; const u = Wd.t - T.t0, s = sOf(it.d);
    if (!T.retour) {
      const tr = T.rapide ? 0.12 : 0.3; if (u < tr) { it.tilt = T.tilt + Math.sin(u * 60) * 0.06; return; }   // (il tremble au bord)
      const e = sm((u - tr) / (T.rapide ? 0.32 : 0.55));
      it.lift = T.lift * (1 - e) - e * s * 0.25; it.big = T.big * (1 - e * 0.96); it.tilt = T.tilt + T.sens * e * 1.6;
      if (e >= 1) { it.trou = null; it.fade = it.fadeT = 0; it.ventre = true; it.big = T.big; if (!avales.includes(it)) avales.push(it); if (Math.random() < 0.4) word(pick(['gloup', 'ploc', 'bloup']), it.fx * Wd.W, floorAt(it.d) - s * 0.2, 17); }
    } else {
      // au retour : il jaillit du trou, retombe à sa place
      // (29/09, vague 5) il jaillit bien plus haut, en faisant un tour complet sur lui-même, et retombe à sa place (il rebondit)
      const e = sm(u / 0.75);
      if (u < 0.12) return;
      it.fade = it.fadeT = 1; it.big = T.big * Math.max(0.05, Math.min(1, e * 1.6)); it.tilt = T.sens * (1 - e) * Math.PI * 2;
      if (e >= 1) { it.trou = null; it.big = T.big; it.tilt = 0; it.fall = true; it.lift = Math.max(it.lift, s * 0.6); it.vy = 0; it.away = Wd.t;
        // (vague 10) le trou se referme dans un nuage de poussière ; un meuble lourd fait trembler la pièce
        K.dust(it.fx * Wd.W, floorAt(it.d), s * 0.35, 0.7); if (K.LOURD[it.kind]) Wd.shake = { t0: Wd.t, a: 2 }; }
      else it.lift = Math.sin(e * Math.PI) * s * (K.LOURD[it.kind] ? 1.3 : 2.2);
    }
  });
  // les lettres du titre : elles tombent ; un trou s'ouvre là où elles vont toucher le sol ; au sol, elles passent dedans
  const Ls = window.Vie && Vie.LETTERS && Vie.LETTERS();
  if (Ls && Ls.some(L => L.st === 'trou')) { const r = Vie.RECT(), fl = Wd.floor - 2, dt = Math.min(0.05, dt0 || 1 / 60);
    Ls.forEach(L => { if (L.st !== 'trou') return; L.vy += grav() * 0.9 * dt; L.dx += L.vx * dt; L.dy += L.vy * dt; L.rot += L.vr * dt;
      const x = r.left + L.cx + L.dx, y = r.top + L.cy + L.dy, w = L.x1 - L.x0;
      if (L.trouX == null && L.vy > 0) { L.trouX = x; trou(x, fl, Math.max(w * 0.8, Wd.s0 * 0.14), 0.15, 0.8); }
      if (y > fl) { L.st = 'avale'; L.a = 0; if (Math.random() < 0.3) word(pick(['plop', 'gloup', 'bloup']), x, fl - Wd.s0 * 0.2, 15); } }); }
  for (let i = trous.length - 1; i >= 0; i--) if (Wd.t > trous[i].fin) trous.splice(i, 1);
});
// les trous : au trait, comme le reste (un bord, et des cercles de plus en plus petits vers le fond)
H.draw.push(S => {
  if (!trous.length) return; const C = window.Chalk; if (!C) return;
  trous.forEach((T, k) => {
    const u = Wd.t - T.t0, o = sm(u / T.ouvre), f = 1 - sm((u - T.ouvre - T.ferme) / 0.45), g = Math.min(o, f); if (g <= 0.01) return;
    const r = T.r * g, ry = r * 0.28;
    [1, 0.72, 0.46, 0.24].forEach((q, j) => { const P = []; for (let a = 0; a <= 24; a++) { const t = a / 24 * Math.PI * 2; P.push([T.x + Math.cos(t) * r * q, T.y + Math.sin(t) * ry * q + (1 - q) * ry * 0.5]); }
      C.stroke(P, 1, { w: j ? 1.2 : 2, a: (j ? 0.55 - j * 0.1 : 0.9) * Wd.a, seed: 70 + k * 5 + j, tip: false, amp: 0.5 }); });
  });
});

// le retour du mode sérieux : les trous recrachent les objets, les chats reviennent
function retour() {
  if (!F || !F.ouvert) return; Wd.nextScen = Wd.t + rnd(20, 30); const o = F.o; F = null; Wd.fuite = false;
  // (29/09, vague 5) les trous s'ouvrent en vague, depuis le bouton (13 h 21, Mathieu : pas de fissures)
  range();
  // les lettres : elles ressortent de leur trou et remontent à leur place d'un bond ; les boutons aussi
  const Ls = window.Vie && Vie.LETTERS && Vie.LETTERS(), rt = Ls && Vie.RECT();
  if (Ls) Ls.forEach((Lt, i) => { if (Lt.st !== 'avale' && Lt.st !== 'trou') return; later(0.2 + i * 0.05, () => { const x = rt.left + Lt.cx, fl = Wd.floor - 2; trou(x, fl, Wd.s0 * 0.16, 0.15, 0.6);
    Lt.a = 1; Lt.st = 'back'; Lt.t = Wd.t; Lt.from = [0, fl - (rt.top + Lt.cy), 0]; Lt.dx = 0; Lt.dy = Lt.from[1]; Lt.rot = 0; Lt.out0 = 0; }); });
  ['stay', 'enter'].map(id => document.getElementById(id)).filter(Boolean).forEach((b, i) => sortBouton(b, 350 + i * 180));
  const L = avales.slice(); avales = [];
  const ox = o ? o.x : Wd.W / 2, oy = floorAt(0.5), pos = it => { const h = it.home && !it.home.on ? it.home : it; return [h.fx * Wd.W, floorAt(h.d)]; };
  L.sort((a, b) => Math.abs(pos(a)[0] - ox) - Math.abs(pos(b)[0] - ox));
  L.forEach((it, i) => later(0.3 + i * 0.12, () => {
    if (!Wd.props.includes(it)) return; it.ventre = false;
    if (it.home && !it.home.on) { it.fx = it.home.fx; it.d = it.home.d; it.dT = it.home.d; }
    it.tilt = 0; it.vx = it.vy = 0; it.fall = false;
    const s = sOf(it.d); trou(it.fx * Wd.W, floorAt(it.d), clamp(s * 0.5, Wd.s0 * 0.18, Wd.s0 * 1.2), 0.15, 0.6);
    it.lift = 0; it.big = it.big || 1; it.trou = { t0: Wd.t, retour: true, big: it.big, sens: Math.random() < 0.5 ? -1 : 1 }; it.big *= 0.05;
    later(0.25, () => word(pick(['pop !', 'plop', 'tadaa']), it.fx * Wd.W, floorAt(it.d) - s * 0.8, 18));
  }));
  // (29/09, l'audit : au retour, la pièce restait vide de chats) : deux chats jaillissent des derniers trous avec les objets, en criant,
  // deux autres rentrent en courant par les côtés
  const n = L.length, tr = [...new Set([L[n - 1], L[n - 2], L[Math.max(0, n - 4)], L[Math.floor(n / 2)]])].filter(Boolean).slice(0, 4);
  tr.forEach((it, i) => later(0.55 + (n - 1) * 0.12 + i * 0.3, () => { if (K.residents().length >= K.MAXC) return; const d = it.d ?? 0.3, c = K.addCat({ x: it.fx * Wd.W, d }), s = sc(c);
    c.y = floorAt(d) - s * 0.3; c.fall = true; c.vy = -s * rnd(5.5, 7); c.vx = s * rnd(1, 2.4) * (i % 2 ? -1 : 1); c.face = sgn(c.vx) || 1; later(0.2, () => say(c, pick(en() ? ['woohoo!', 'I’m back!', 'hi!', 'hop!'] : ['youhou !', 'me revoilà !', 'coucou !', 'hop !']))); }));
  [0, 1].forEach(i => later(1.4 + n * 0.12 + i * 0.7, () => { if (K.residents().length < K.MAXC) { const c = K.enter(); c.q.unshift(go(c.x + (c.x < Wd.W / 2 ? 1 : -1) * sc(c) * 3, { g: 'galop', v: 1.5 })); } }));
  // (vague 10, l'audit : « le retour du mode sérieux ») : quand tout est revenu, un dernier trou s'ouvre, là où il n'y a rien ;
  // il en sort un chat qui dormait dedans, toujours endormi ; il se pose, ronfle, s'étire et découvre qu'il a tout raté
  later(1.2 + n * 0.12, () => { if (K.residents().length >= K.MAXC || Wd.fuite) return;
    const libre = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map(f => [f, Math.min(...Wd.props.filter(p => !p.gone && !p.on).map(p => Math.abs(p.fx - f)), 1)]).sort((a, b) => b[1] - a[1])[0][0];
    const d = 0.45, x = libre * Wd.W, y = floorAt(d); trou(x, y, Wd.s0 * 0.3, 0.3, 1.4);
    later(0.45, () => { const c = K.addCat({ x, d }), s = sc(c); c.y = y - s * 0.2; c.fall = true; c.vy = -s * 3.2; c.vx = 0; c.dormeur = true;
      const dort = () => { if (c.gone || c.held || !Wd.cats.includes(c)) return; if (c.fall) { later(0.2, dort); return; } interrupt(c); c.q = [pose('dodo', 2.6, { zzz: 1 }), pose('etirement', 1.3, { fx: c => say(c, pick(en() ? ['…is it over?', 'did I miss something?'] : ['…c’était fini ?', 'j’ai raté un truc ?'])) })]; }; later(0.3, dort);
      word('pop…', x, y - s * 0.7, 16); if (window.Dex && Dex.vu) later(2, () => Dex.vu('dormeur')); }); });
  Wd.nextIn = Wd.t + 6 + n * 0.1;
}
addEventListener('serieux:ferme', retour);
return { go: go0, avale, get actif() { return !!F; }, set vitesse(v) { vit = v; } };
})();
