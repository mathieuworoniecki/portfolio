/* Le passage au mode sérieux (28/09, Mathieu : « fais plutôt un bouton "mode sérieux" : au clic on vire les chats, qui s'en vont effrayés,
   les objets disparaissent dans des trous, tout se clean, on passe en mode page au scroll »).
   Ce fichier est du côté du mode chat : il fait place nette, puis passe la main au mode sérieux (js/serieux.js : Serieux.ouvre / ferme).
   (29/09, 20:41, Mathieu : « oublie le système de peinture ; fais juste comme le trou noir : tout tombe dans des trous, les chats partent
   rapidement, effrayés ; puis une animation pour amener le mode sérieux par étapes »). Le festival de peinture (js/peinture.js) est retiré.
   Trois étapes, sans aucun fondu :
   1. La fuite : les chats sursautent et filent au galop vers le bord le plus proche. Sous chaque objet, un trou s'ouvre en vague depuis
      le bouton ; il bascule dedans. Les lettres du titre et les deux boutons tombent aussi, chacun dans son trou.
   2. Le tracé : sur la pièce vide, trois plumes esquissent la première page du mode sérieux, à sa place (l'en-tête, le nom en lettres
      creuses, le texte, les cartes, les orbites, le cartouche).
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
const galeries = [];  // { x0, y0, x1, y1, t0, dur } : au retour, le chemin sous le plancher jusqu'à un trou

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
  // (vague 184 de l'audit : « le passage au mode sérieux ») : la colonne des événements aussi, bouton par bouton, du haut vers le bas (elle restait
  // plantée au bord, et l'esquisse du plan, au téléphone, se traçait par-dessus ses boutons)
  const EVB = () => [...document.querySelectorAll('.evts-list li > button')];
  EVB().forEach((b, i) => later(0.25 + i * 0.05, () => { if (F === moi) tombeBouton(b); }));
  // (vague 226 de l'audit, design : le plan du mode sérieux se traçait par-dessus le sélecteur de langue et les contrôles du bas du mode chat,
  // jusque sur la barre des chapitres) : le sélecteur tombe dans son trou, et les contrôles du bas glissent hors de l'écran, un par un
  const lp = document.getElementById('lang-pick'); if (lp) later(0.35, () => { if (F === moi) tombeBouton(lp); });
  BAS().forEach((b, i) => later(0.3 + i * 0.06, () => { if (F === moi) glisseBas(b); }));
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
  // (vague 227 de l'audit : refermé tôt, le mode sérieux laissait des boutons cachés pour de bon : « Entrer dans mon univers », lecture, rejouer…
  // leur chute finissait après le retour) : une chute qui finit après le retour ne cache plus rien, le bouton reste à sa place
  const moi = F; a.onfinish = () => { a.cancel(); if (!F || F !== moi) return; b.style.visibility = 'hidden'; word(pick(['gloup', 'plop']), x, fl - Wd.s0 * 0.2, 18); };
}
const BAS = () => [...document.querySelectorAll('.film-ui .ctrl > *, #chap')];
function glisseBas(b) {
  const r = b.getBoundingClientRect(); if (!r.width || b.style.visibility === 'hidden') return;
  if (!b.animate || reduit) { b.style.visibility = 'hidden'; return; }
  const dy = innerHeight - r.top + 20, a = b.animate([{ transform: 'none' }, { transform: 'translateY(-6px)', offset: 0.25 }, { transform: `translateY(${dy}px)` }], { duration: 520, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' });
  const moi = F; a.onfinish = () => { a.cancel(); if (!F || F !== moi) return; b.style.visibility = 'hidden'; };
}
function remonte(b, dl) {
  if (b.style.visibility !== 'hidden') return; setTimeout(() => { b.style.visibility = ''; if (!b.animate || reduit) return;
    const r = b.getBoundingClientRect(), dy = innerHeight - r.top + 20;
    b.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(-6px)', offset: 0.75 }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.6,.4,1)' }); }, dl);
}
// au retour, il ressort de son trou et reprend sa place d'un bond
function sortBouton(b, dl) {
  if (b.style.visibility !== 'hidden') return; setTimeout(() => {
    b.style.visibility = ''; const r = b.getBoundingClientRect(), x = r.left + r.width / 2, fl = floorAt(0.35), dy = fl - (r.top + r.height / 2); trou(x, fl, Math.max(Wd.s0 * 0.3, r.width * 0.42), 0.15, 0.6);
    // (vague 185) il ressort en disant « pop » au-dessus de son trou, et s'écrase un peu en reprenant sa place, comme il s'était écrasé en tombant
    word(pick(['pop', 'hop', 'plop']), Math.max(x, Wd.s0 * 0.5), fl - Wd.s0 * 0.25, 16);
    if (b.animate && !reduit) b.animate([{ transform: `translateY(${dy}px) scale(.35)` }, { transform: 'translateY(-18px) scale(.94, 1.08)', offset: 0.62 }, { transform: 'translateY(2px) scale(1.06, .93)', offset: 0.84 }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.3,1.3,.5,1)' }); }, dl);
}

/* ——— étapes 2 et 3 : le plan tracé à la plume, puis les carreaux qui se retournent en bleu ——— */
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let cvE = null, xE = null, bleu = null, E = null, vit = 1;   // (vit : pour les captures, on ralentit)
const FONTE = '"Barlow Condensed","Arial Narrow",sans-serif';
const T_TRACE = 1.0, T_TUILES = 2.25, FLIP = 0.42;
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
// (vague 14 de l'audit : « le tracé du plan est discret ») : les plumes tracent maintenant l'esquisse de la vraie première page du mode sérieux,
// à sa place : l'en-tête, le nom en grandes lettres creuses, le rôle, le texte (des lignes d'écriture), les deux cartes, le sommaire à gauche,
// les orbites et le cœur à droite, les immeubles, le cartouche. Trois plumes à la fois (comme ses agents). Quand un carreau devient bleu,
// les traits qui passent dessus deviennent blancs : le croquis au crayon devient le plan bleu, puis la vraie page arrive par-dessus.
function planSerieux(W, Hh) {
  const P = [], sx = W / 1280, sy = Hh / 760, tel = W < 900;
  const poly = (L, t, d) => P.push({ L, t, d }), rect = (x, y, w, h, t, d) => { poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], t, d); P[P.length - 1].R = [x, y, w, h]; };
  const ell = (cx, cy, rx, ry, rot, t, d) => { const L = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; L.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } poly(L, t, d); };
  const ecrit = (x, y, w, t, d) => { const L = [], n = Math.max(8, Math.round(w / 7)); for (let i = 0; i <= n; i++) L.push([x + w * i / n, y + Math.sin(i * 1.9) * 3 + (i % 3 === 0 ? -2 : 0)]); poly(L, t, d); };
  const mot = (s, x, y, fs, t, d) => P.push({ s, x, y, fs, t, d });
  // (la fonte du mode sérieux n'est peut-être pas encore chargée : le nom est réduit s'il dépasserait)
  const tient = (fs, w) => { xE.font = `700 ${fs}px ${FONTE}`; return Math.min(fs, fs * w / (xE.measureText('WORONIECKI').width || 1)); };
  const coeur = (cx, cy, r, t, d) => { const H6 = [0, 1, 2, 3, 4, 5, 0].map(i => [cx + Math.cos(i / 6 * TAU + 0.3) * r, cy + Math.sin(i / 6 * TAU + 0.3) * r]); poly(H6, t, d);
    const I = [[cx - r * 0.25, cy - r * 0.35], [cx + r * 0.35, cy - r * 0.1], [cx - r * 0.05, cy + r * 0.4], [cx - r * 0.25, cy - r * 0.35]]; poly(I, t + d * 0.5, d * 0.6);
    [0, 2, 4].forEach((k, j) => poly([H6[k], I[j]], t + d * 0.7, d * 0.3)); };
  // l'en-tête : la marque MW, le nom en petit, les boutons à droite
  const m = tel ? 16 : 38 * sx;
  rect(m, 18, 38, 38, 0, 0.18); mot('MW', m + 5, 45, 18, 0.1, 0.15);
  if (tel) rect(W - m - 110, 19, 110, 36, 0.05, 0.2);
  else { [[837, 136], [980, 49], [1036, 41], [1102, 139]].forEach(([x, w], i) => rect(x * sx, 19, w * sx, 36, 0.05 + i * 0.06, 0.18)); ecrit((88) * sx + 8, 38, 150 * sx, 0.12, 0.25); }
  if (!tel) {
    // le sommaire à gauche (00 à 08)
    for (let i = 0; i < 9; i++) poly([[38 * sx, 271 * sy + i * 27 * sy], [52 * sx + (i ? 0 : 12), 271 * sy + i * 27 * sy]], 0.25 + i * 0.03, 0.08);
    // le nom, en grandes lettres creuses ; le rôle ; le texte ; les deux cartes ; la ligne du bas
    const fs = tient(clamp(W * 0.072, 52, 112), 600 * sx), x0 = 141 * sx, b1 = 120 * sy + fs * 0.8, b2 = b1 + fs * 0.86;
    mot('MATHIEU', x0, b1, fs, 0.15, 0.45); mot('WORONIECKI', x0, b2, fs, 0.4, 0.55);
    ecrit(x0, b2 + 32 * sy, 300 * sx, 0.7, 0.2);
    [75, 101, 127].forEach((dy, i) => ecrit(x0, b2 + dy * sy, [570, 548, 575][i] * sx, 0.75 + i * 0.08, 0.28));
    const yc = b2 + 158 * sy, hc = Math.min(167 * sy, Hh - yc - 110 * sy);
    if (hc > 60) { rect(x0, yc, 294 * sx, hc, 0.85, 0.3); rect(x0 + 306 * sx, yc, 294 * sx, hc, 0.92, 0.3);
      ecrit(x0 + 16 * sx, yc + 28 * sy, 150 * sx, 1.0, 0.15); ecrit(x0 + 322 * sx, yc + 28 * sy, 210 * sx, 1.05, 0.15); }
    poly([[x0, Hh - 97 * sy], [x0 + 600 * sx, Hh - 97 * sy]], 1.0, 0.3);
    // à droite : les orbites, le cœur, les immeubles, le cartouche
    const cx = 985 * sx, cy = 290 * sy;
    ell(cx, cy, 225 * sx, 100 * sy, -0.1, 0.3, 0.55); ell(cx, cy - 10 * sy, 180 * sx, 70 * sy, -0.05, 0.45, 0.45); coeur(955 * sx, 290 * sy, 55 * Math.min(sx, sy), 0.55, 0.4);
    [[855, 490, 50, 62], [905, 410, 52, 180], [965, 438, 50, 150], [1026, 484, 50, 76]].forEach(([x, y, w, h], i) => { rect(x * sx, y * sy, w * sx, h * sy, 0.7 + i * 0.06, 0.25); poly([[x * sx, (y + h / 2) * sy], [(x + w) * sx, (y + h / 2) * sy]], 0.8 + i * 0.06, 0.1); });
    const kx = W - 38 * sx - 259 * sx, ky = Hh - 23 * sy - 152 * sy, kw = 259 * sx, kh = 152 * sy;
    rect(kx, ky, kw, kh, 0.6, 0.35); [0.25, 0.5, 0.75].forEach((f, i) => poly([[kx, ky + kh * f], [kx + kw, ky + kh * f]], 0.8 + i * 0.05, 0.12)); poly([[kx + kw / 2, ky + kh / 2], [kx + kw / 2, ky + kh * 0.75]], 0.95, 0.08);
  } else {
    // au téléphone : les orbites et le cœur en haut, le nom dessous, le texte, une carte
    const cx = W / 2, cy = Hh * 0.15, fs = tient(clamp(W * 0.155, 44, 80), W - 40), x0 = 20, b1 = Hh * 0.49 + fs * 0.8, b2 = b1 + fs * 0.86;
    ell(cx, cy, W * 0.44, Hh * 0.07, -0.1, 0.2, 0.5); ell(cx, cy, W * 0.32, Hh * 0.05, -0.05, 0.35, 0.4); coeur(cx, cy, W * 0.1, 0.4, 0.4);
    [[0.4, 0.26, 0.09, 0.08], [0.5, 0.24, 0.09, 0.1]].forEach(([x, y, w, h], i) => rect(W * x, Hh * y, W * w, Hh * h, 0.6 + i * 0.08, 0.25));
    mot('MATHIEU', x0, b1, fs, 0.15, 0.4); mot('WORONIECKI', x0, b2, fs, 0.35, 0.5);
    ecrit(x0, b2 + 30, W * 0.6, 0.7, 0.2); [60, 84, 108].forEach((dy, i) => ecrit(x0, b2 + dy, W - 2 * x0 - i * 20, 0.75 + i * 0.07, 0.25));
    if (b2 + 130 + 120 < Hh) rect(x0, b2 + 130, W - 2 * x0, 120, 0.9, 0.3);
  }
  // les durées : l'esquisse entière en ~1,5 s (T_TRACE + t)
  P.forEach(p => { if (p.L) { let tot = 0; for (let i = 1; i < p.L.length; i++) tot += Math.hypot(p.L[i][0] - p.L[i - 1][0], p.L[i][1] - p.L[i - 1][1]); p.tot = tot; } });
  return P;
}
function etapes(o, fini) {
  const [W, Hh] = toileE(), T = 48, tu = [], dmax = Math.hypot(Math.max(o.x, W - o.x), Math.max(o.y, Hh - o.y));
  for (let y = 0; y < Hh; y += T) for (let x = 0; x < W; x += T) { const d = Math.hypot(x + T / 2 - o.x, y + T / 2 - o.y); tu.push({ x, y, t: T_TUILES + d / dmax * 1.0 + Math.random() * 0.12 }); }
  E = { t0: performance.now() / 1000, w0: Wd.t, o, W, Hh, T, tu, pl: planSerieux(W, Hh), fini, fin: T_TUILES + 1.12 + FLIP };
  if (reduit) { E.t0 -= 99; E.w0 -= 99; }
  cvE.style.display = 'block'; requestAnimationFrame(image);
}
/* (vague 265 de l'audit, immersion : « le passage au mode sérieux ») : le plan ne reste plus dans ses cadres. Comme sur une table à dessin,
   chaque cadre que les plumes commencent lance ses lignes de construction : de ses coins, des traits fins filent jusqu'aux bords de l'écran,
   à l'horizontale et à la verticale, et les plus grands reçoivent leur cote (une flèche à chaque bout, la mesure écrite au milieu). Tout l'écran
   devient la feuille du plan ; quand les carreaux passent au bleu, ces traits deviennent blancs avec le reste. */
function construction(c, t, col) {
  const { W, Hh } = E, h0 = 64, h1 = Hh - 8;
  c.save(); c.strokeStyle = c.fillStyle = col; c.lineWidth = 0.8; c.setLineDash([6, 5]); c.globalAlpha = 0.45;
  E.pl.forEach(P => { if (!P.R) return; const u = c01((t - T_TRACE - P.t) / 0.35); if (u <= 0) return; const [x, y, w, h] = P.R, e = 1 - Math.pow(1 - u, 3);
    [[x, y], [x + w, y + h]].forEach(([px, py]) => { c.beginPath();
      c.moveTo(px, py); c.lineTo(px + (px < W / 2 ? -1 : 1) * (px < W / 2 ? px : W - px) * e, py);
      if (py > h0 && py < h1) { c.moveTo(px, py); c.lineTo(px, py + (py < Hh / 2 ? h0 - py : h1 - py) * e); }
      c.stroke(); }); });
  c.setLineDash([]); c.globalAlpha = 0.7; c.font = `500 11px ${FONTE}`; c.textAlign = 'center';
  E.pl.forEach(P => { if (!P.R || P.R[2] < 110) return; const u = c01((t - T_TRACE - P.t - 0.15) / 0.3); if (u <= 0) return; const [x, y, w] = P.R, yy = y - 9, m = x + w / 2, hw = w / 2 * u;
    if (yy < h0) return;
    c.beginPath(); c.moveTo(m - hw, yy); c.lineTo(m + hw, yy); [-1, 1].forEach(sd => { const ex = m + sd * hw; c.moveTo(ex - sd * 6, yy - 3); c.lineTo(ex, yy); c.lineTo(ex - sd * 6, yy + 3); c.moveTo(ex, yy - 5); c.lineTo(ex, yy + 5); }); c.stroke();
    if (u >= 1) c.fillText(String(Math.round(w)), m, yy - 4); });
  c.restore();
}
// dessine l'esquisse telle qu'elle est à l'instant t ; renvoie les pointes des plumes qui écrivent encore
function esquisse(c, t, col, pointes) {
  construction(c, t, col);
  c.strokeStyle = col; c.lineWidth = 2.2;
  E.pl.forEach(P => { const u = c01((t - T_TRACE - P.t) / P.d); if (u <= 0) return;
    if (P.s) { c.font = `700 ${P.fs}px ${FONTE}`; const w = c.measureText(P.s).width; c.save(); c.beginPath(); c.rect(P.x - 4, P.y - P.fs, (w + 8) * u, P.fs * 1.2); c.clip();
      c.lineWidth = Math.max(1.6, P.fs / 48); c.strokeText(P.s, P.x, P.y); c.restore(); c.lineWidth = 2.2;
      if (u < 1 && pointes) pointes.push([P.x + w * u, P.y - P.fs * (0.2 + 0.5 * Math.abs(Math.sin(t * 23)))]); return; }
    let reste = P.tot * u, x = P.L[0][0], y = P.L[0][1]; c.beginPath(); c.moveTo(x, y);
    for (let i = 1; i < P.L.length && reste > 0; i++) { const l = Math.hypot(P.L[i][0] - P.L[i - 1][0], P.L[i][1] - P.L[i - 1][1]) || 1, k = Math.min(1, reste / l);
      x = P.L[i - 1][0] + (P.L[i][0] - P.L[i - 1][0]) * k; y = P.L[i - 1][1] + (P.L[i][1] - P.L[i - 1][1]) * k; c.lineTo(x, y); reste -= l; }
    c.stroke(); if (u < 1 && pointes) pointes.push([x, y]); });
}
// une plume, au trait : le bec sur la pointe, le corps penché vers la droite
function plume(c, x, y, ink) {
  c.save(); c.translate(x, y); c.rotate(-0.55); c.lineWidth = 2; c.strokeStyle = ink; c.fillStyle = '#F7F5EF';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-5, -12); c.lineTo(-5, -54); c.quadraticCurveTo(0, -60, 5, -54); c.lineTo(5, -12); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-5, -14); c.lineTo(5, -14); c.moveTo(0, -1); c.lineTo(0, -9); c.stroke(); c.restore();
}
function image() {
  // (vague 319 de l'audit, finition) : l'horloge suit celle de la pièce. Sur un appareil qui rame, la pièce (les chats, les lettres du titre
  // qui tombent dans leurs trous) prenait du retard sur le tracé : le nom en lettres creuses s'écrivait par-dessus « Salut, moi c'est Mathieu. »
  // encore debout ; le plan attend maintenant la pièce (jusqu'à 2,5 s de retard au plus, il ne reste jamais figé ; sur un appareil qui suit, rien ne change)
  if (!E) return; const t = Math.max(Wd.t - E.w0, performance.now() / 1000 - E.t0 - 2.5) * vit, { W, Hh, T } = E, c = xE; c.clearRect(0, 0, W, Hh);
  const ink = `rgb(${(window.THEME && THEME.ink) || '34,36,40'})`; c.lineCap = c.lineJoin = 'round';
  // 2. les plumes tracent l'esquisse
  const pointes = []; esquisse(c, t, ink, pointes);
  // 3. les carreaux se retournent : ils poussent depuis leur centre, en carré, avec un petit rebond et un filet clair tant qu'ils ne sont pas posés
  let tous = true; const faits = [];
  E.tu.forEach(q => { const u = c01((t - q.t) / FLIP); if (u < 1) tous = false; if (u <= 0) return; const cx = q.x + T / 2, cy = q.y + T / 2;
    const e = u < 1 ? 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2) : 1, w = T * Math.max(0.01, Math.min(1.12, e));
    // (vague 68, l'audit : « le passage au mode sérieux ») : un vrai carreau qui se retourne en 3D, autour de son axe vertical, du côté opposé
    // au bouton : il se soulève (plus grand, une ombre), montre d'abord sa face papier (qui s'amincit en perspective), puis sa face bleue
    if (u < 1) { const th = Math.PI * Math.min(1, e), co = Math.cos(th), si = Math.sin(th), dir = cx < E.o.x ? -1 : 1, lv = 1 + 0.22 * si, h2 = T / 2 * lv;
      c.save(); c.fillStyle = 'rgba(10,20,40,.18)'; c.fillRect(cx - T / 2 * Math.abs(co) * lv + 6 * si, cy - h2 + 8 * si, T * Math.abs(co) * lv, T * lv); c.restore();
      c.save(); c.translate(cx, cy); c.transform(co * lv, si * 0.28 * dir * Math.sign(co || 1), 0, lv, 0, 0);
      if (co > 0) { c.fillStyle = '#F2F1EC'; c.fillRect(-T / 2, -T / 2, T, T); c.strokeStyle = ink; c.globalAlpha = 0.35; c.lineWidth = 1 / lv; c.strokeRect(-T / 2, -T / 2, T, T); }
      else { c.scale(-1, 1); c.drawImage(bleu, q.x, q.y, T, T, -T / 2, -T / 2, T, T); c.strokeStyle = 'rgba(238,245,255,.6)'; c.lineWidth = 1 / lv; c.strokeRect(-T / 2 + 0.5, -T / 2 + 0.5, T - 1, T - 1); }
      c.restore(); c.globalAlpha = 1; }
    else c.drawImage(bleu, q.x, q.y, T, T, q.x, q.y, T, T); faits.push([cx - w / 2, cy - w / 2, w]); });
  // sur le bleu, l'esquisse passe au blanc : le plan bleu du mode sérieux
  if (faits.length) { c.save(); c.beginPath(); faits.forEach(([x, y, w]) => c.rect(x, y, w, w)); c.clip(); esquisse(c, t, 'rgba(238,245,255,.85)', null); c.restore(); }
  pointes.forEach(([x, y]) => plume(c, x, y, ink));
  dernier(c, t, ink, pointes);
  if (tous || t > E.fin + 0.3) { const f = E.fini; E.fini = null; if (f) f(); }
  requestAnimationFrame(image);
}
/* (vague 103 de l'audit, « le passage au mode sérieux » vers 9,9) : le dernier chat. Un chat n'a pas fui : assis sur le papier,
   il suit des yeux les plumes qui tracent le plan. Quand la vague bleue arrive, il saute de carreau en carreau pour rester sur le papier,
   jusqu'au tout dernier… qui se retourne sous ses pattes et le catapulte hors de l'écran, par le haut. */
let dernierVu = false;
function chat2D(c, x, y, s, ink, rot, yeuxX, peur) {
  const pap = '#F4F4EE'; c.save(); c.translate(x, y); c.rotate(rot || 0); c.lineWidth = Math.max(2, s * 0.045); c.strokeStyle = ink; c.fillStyle = pap; c.lineJoin = c.lineCap = 'round';
  c.beginPath(); c.moveTo(s * 0.3, -s * 0.08); c.quadraticCurveTo(s * 0.62, -s * 0.05, s * 0.55, -s * 0.4); c.stroke();   // la queue
  c.beginPath(); c.ellipse(0, -s * 0.3, s * 0.34, s * 0.32, 0, 0, TAU); c.fill(); c.stroke();   // le corps
  c.beginPath(); c.moveTo(-s * 0.12, 0); c.lineTo(-s * 0.12, -s * 0.12); c.moveTo(s * 0.1, 0); c.lineTo(s * 0.1, -s * 0.12); c.stroke();
  const hy = -s * 0.78, r = s * 0.3; c.beginPath(); c.moveTo(-r, hy + r * 0.3); c.quadraticCurveTo(-r * 1.05, hy - r * 0.6, -r * 0.7, hy - r * 0.8); c.lineTo(-r * 0.62, hy - r * 1.35); c.lineTo(-r * 0.2, hy - r * 0.95);
  c.quadraticCurveTo(0, hy - r, r * 0.2, hy - r * 0.95); c.lineTo(r * 0.62, hy - r * 1.35); c.lineTo(r * 0.7, hy - r * 0.8); c.quadraticCurveTo(r * 1.05, hy - r * 0.6, r, hy + r * 0.3);
  c.quadraticCurveTo(0, hy + r * 1.05, -r, hy + r * 0.3); c.fill(); c.stroke();
  const ex = (yeuxX || 0) * r * 0.12; [-1, 1].forEach(sd => { c.fillStyle = ink; c.beginPath(); c.ellipse(sd * r * 0.4 + ex, hy, r * 0.17, r * (peur ? 0.26 : 0.21), 0, 0, TAU); c.fill();
    c.fillStyle = pap; c.beginPath(); c.arc(sd * r * 0.4 + ex - r * 0.06, hy - r * 0.08, r * 0.07, 0, TAU); c.fill(); });
  c.restore();
}
function dernier(c, t, ink, pointes) {
  if (reduit || !E) return; const { T, tu } = E;
  if (!E.DC) { // les carreaux : un au milieu de la vague, loin du bouton, puis deux sauts vers le tout dernier
    const tri = tu.filter(q => q.y > E.Hh * 0.18 && q.y < E.Hh - T * 3 && q.x > T && q.x < E.W - T * 2).sort((a, b) => a.t - b.t); if (tri.length < 6) { E.DC = { rien: true }; return; }
    const C = tri[tri.length - 1], A = tri[Math.floor(tri.length * 0.55)], B = tri.filter(q => q.t > A.t + 0.2 && q.t < C.t - 0.15).sort((p, q) => Math.hypot(p.x - (A.x + C.x) / 2, p.y - (A.y + C.y) / 2) - Math.hypot(q.x - (A.x + C.x) / 2, q.y - (A.y + C.y) / 2))[0] || A;
    E.DC = { L: [A, B, C], s: T * 1.45 }; }
  const D = E.DC; if (D.rien || t < T_TRACE * 0.6) return; const s = D.s, pos = q => [q.x + T / 2, q.y + T * 0.78];
  // où il est : sur un carreau ; il saute juste avant que le bleu l'atteigne
  let i = 0; while (i < 2 && t > D.L[i].t - 0.18) i++;
  const q = D.L[i], [x1, y1] = pos(q); let x = x1, y = y1, rot = 0, peur = t > T_TUILES - 0.2;
  if (i > 0) { const [x0, y0] = pos(D.L[i - 1]), u = c01((t - (D.L[i - 1].t - 0.18)) / 0.3); x = x0 + (x1 - x0) * u; y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * T * 1.4; rot = Math.sin(u * Math.PI) * 0.3 * Math.sign(x1 - x0); }
  // le dernier carreau se retourne sous lui : la catapulte
  if (i === 2 && t > q.t + FLIP * 0.35) { const u = t - q.t - FLIP * 0.35, dx = Math.sign(x1 - E.o.x) || 1; x = x1 + dx * u * 260; y = y1 - u * 1500 + u * u * 700; rot = u * 11 * dx; if (y < -s * 2) return; }
  // ses yeux suivent la plume la plus proche (pendant le tracé), puis regardent la vague
  const pl = pointes.reduce((m, p) => !m || Math.hypot(p[0] - x, p[1] - y) < Math.hypot(m[0] - x, m[1] - y) ? p : m, null), yx = pl ? clamp((pl[0] - x) / 120, -1, 1) : clamp((E.o.x - x) / 200, -1, 1);
  chat2D(c, x, y, s, ink, rot, yx, peur);
  const EN = en(), mot = i === 2 && t > q.t + FLIP * 0.35 ? (EN ? 'WAAAH!' : 'WAAAH !') : i > 0 && t - (D.L[i - 1].t - 0.18) < 0.5 ? (EN ? 'hop!' : 'hop !') : peur && i === 0 ? (EN ? 'uh oh…' : 'oh oh…') : '';
  if (mot) { c.save(); c.font = `${Math.round(s * 0.4)}px ${(getComputedStyle(document.body).getPropertyValue('--hand') || 'serif').trim() || 'serif'}`; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#F4F4EE'; c.fillStyle = ink;
    const ty = Math.max(20, y - s * 1.35); c.strokeText(mot, x, ty); c.fillText(mot, x, ty); c.restore(); }
  if (i === 2 && !D.dit && t > q.t) { D.dit = true; dernierVu = true; }   // (la découverte s'inscrit au retour dans la pièce)
}
// le mode sérieux est ouvert par-dessus (opaque) : on range la toile
function range() { E = null; if (cvE) { xE.setTransform(1, 0, 0, 1, 0, 0); xE.clearRect(0, 0, cvE.width, cvE.height); cvE.style.display = 'none'; } }

// (vague 69, l'audit : « le retour du mode sérieux ») : le mode sérieux se referme sur son bouton et laisse le plan bleu ; au lieu que la pièce
// revienne d'un coup, les carreaux bleus se retournent en 3D, en vague depuis le bouton de retour : chacun se soulève, pivote,
// montre sa face papier, et se pose en rapetissant jusqu'à rien ; la pièce apparaît dessous, carreau après carreau
let D = null;
function defait() {
  if (reduit) return; const [W, Hh] = toileE(), T = 48, sx = document.getElementById('serieux'), st = sx && getComputedStyle(sx);
  const o = { x: parseFloat(st && st.getPropertyValue('--ox')) || W / 2, y: parseFloat(st && st.getPropertyValue('--oy')) || Hh / 2 }, dmax = Math.hypot(Math.max(o.x, W - o.x), Math.max(o.y, Hh - o.y)), tu = [];
  for (let y = 0; y < Hh; y += T) for (let x = 0; x < W; x += T) { const d = Math.hypot(x + T / 2 - o.x, y + T / 2 - o.y); tu.push({ x, y, t: d / dmax * 0.9 + Math.random() * 0.1 }); }
  D = { t0: performance.now() / 1000, o, W, Hh, T, tu }; cvE.style.display = 'block'; requestAnimationFrame(defaitImage);
}
function defaitImage() {
  if (!D || E) { D = null; return; } const t = (performance.now() / 1000 - D.t0) * vit, { W, Hh, T } = D, c = xE, DUR = 0.45; c.clearRect(0, 0, W, Hh);
  const ink = `rgb(${(window.THEME && THEME.ink) || '34,36,40'})`; let reste = false;
  D.tu.forEach(q => { const u = c01((t - q.t) / DUR); if (u >= 1) return; reste = true;
    if (u <= 0) { c.drawImage(bleu, q.x, q.y, T, T, q.x, q.y, T, T); return; }
    const cx = q.x + T / 2, cy = q.y + T / 2, e = u * u * (3 - 2 * u), th = Math.PI * e, co = Math.cos(th), si = Math.sin(th), dir = cx < D.o.x ? -1 : 1, lv = (1 + 0.22 * si) * (1 - sm((u - 0.55) / 0.45));
    if (lv < 0.01) return;
    c.save(); c.fillStyle = 'rgba(10,20,40,.18)'; c.fillRect(cx - T / 2 * Math.abs(co) * lv + 6 * si, cy - T / 2 * lv + 8 * si, T * Math.abs(co) * lv, T * lv); c.restore();
    c.save(); c.translate(cx, cy); c.transform(co * lv, si * 0.28 * dir * Math.sign(co || 1), 0, lv, 0, 0);
    if (co > 0) { c.drawImage(bleu, q.x, q.y, T, T, -T / 2, -T / 2, T, T); c.strokeStyle = 'rgba(238,245,255,.6)'; c.lineWidth = 1 / lv; c.strokeRect(-T / 2 + 0.5, -T / 2 + 0.5, T - 1, T - 1); }
    else { c.scale(-1, 1); c.fillStyle = '#F2F1EC'; c.fillRect(-T / 2, -T / 2, T, T); c.strokeStyle = ink; c.globalAlpha = 0.35; c.lineWidth = 1 / lv; c.strokeRect(-T / 2, -T / 2, T, T); }
    c.restore(); c.globalAlpha = 1; });
  if (!reste) { D = null; range(); return; }
  requestAnimationFrame(defaitImage);
}
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
  if (!trous.length && !galeries.length) return; const C = window.Chalk; if (!C) return;
  for (let i = galeries.length - 1; i >= 0; i--) if (Wd.t > galeries[i].t0 + galeries[i].dur + 1.2) galeries.splice(i, 1);
  galeries.forEach(Gl => { const u = (Wd.t - Gl.t0) / Gl.dur; if (u < 0) return; const e = Math.min(1, u), dp = Wd.s0 * 0.35, at = v => { const x = Gl.x0 + (Gl.x1 - Gl.x0) * v, yb = Gl.y0 + (Gl.y1 - Gl.y0) * v; return [x, yb + Math.sin(Math.PI * v) * dp + (1 - Math.abs(2 * v - 1)) * 0]; };
    const al = (u < 1 ? 0.6 : 0.6 * Math.max(0, 1 - (u - 1) * Gl.dur / 1.2)) * Wd.a; if (al <= 0.01) return;
    // les pointillés (le chemin déjà creusé)
    for (let j = 0; j < 16; j++) { const v0 = j / 16, v1 = v0 + 0.5 / 16; if (v0 > e) break; C.stroke([at(v0), at(Math.min(v1, e))], 1, { w: 1.3, a: al, seed: Gl.seed * 7 + j, tip: false }); }
    // la bosse qui file dans la galerie : un petit dôme, un peu de terre qui saute
    if (u < 1) { const [bx, by] = at(e), r = Wd.s0 * 0.07, P = []; for (let a = 0; a <= 10; a++) { const t = Math.PI + a / 10 * Math.PI; P.push([bx + Math.cos(t) * r, by + Math.sin(t) * r * 0.8]); }
      C.stroke(P, 1, { w: 1.8, a: 0.85 * Wd.a, seed: Gl.seed + 40, tip: false });
      for (let q = 0; q < 3; q++) { const w = (Wd.t * 7 + q * 0.33 + Gl.seed) % 1; C.stroke([[bx + (q - 1) * r * 0.6, by - r * 0.8 - w * r * 1.2], [bx + (q - 1) * r * 0.75, by - r * 0.85 - w * r * 1.2]], 1, { w: 1.4, a: 0.7 * (1 - w) * Wd.a, seed: q, tip: false }); } } });
  trous.forEach((T, k) => {
    const u = Wd.t - T.t0, o = sm(u / T.ouvre), f = 1 - sm((u - T.ouvre - T.ferme) / 0.45), g = Math.min(o, f); if (g <= 0.01) return;
    const r = T.r * g, ry = r * 0.28;
    [1, 0.72, 0.46, 0.24].forEach((q, j) => { const P = []; for (let a = 0; a <= 24; a++) { const t = a / 24 * Math.PI * 2; P.push([T.x + Math.cos(t) * r * q, T.y + Math.sin(t) * ry * q + (1 - q) * ry * 0.5]); }
      C.stroke(P, 1, { w: j ? 1.2 : 2, a: (j ? 0.55 - j * 0.1 : 0.9) * Wd.a, seed: 70 + k * 5 + j, tip: false, amp: 0.5 }); });
  });
});

// le retour du mode sérieux : les trous recrachent les objets, les chats reviennent
function retour() {
  if (!F || !F.ouvert) return; if (dernierVu && window.Dex && Dex.vu) { dernierVu = false; later(3, () => Dex.vu('dernier-carreau')); } Wd.nextScen = Wd.t + rnd(20, 30); const o = F.o; F = null; Wd.fuite = false;
  // (29/09, vague 5) les trous s'ouvrent en vague, depuis le bouton (13 h 21, Mathieu : pas de fissures)
  range(); defait();
  // (vague 320 : la pièce s'arrête pendant le mode sérieux ; les trous du départ étaient donc encore grands ouverts au retour, une vingtaine,
  // et tapissaient le sol) : ils se referment tout de suite, en rétrécissant, avant que les nouveaux s'ouvrent
  trous.forEach(T => { const u = Wd.t - T.t0; if (u < T.ouvre + T.ferme) T.t0 = Wd.t - T.ouvre - T.ferme; T.fin = Math.min(T.fin, Wd.t + 0.5); });
  // les lettres : elles ressortent de leur trou et remontent à leur place d'un bond ; les boutons aussi
  const Ls = window.Vie && Vie.LETTERS && Vie.LETTERS(), rt = Ls && Vie.RECT();
  // (vague 320 de l'audit, design : un trou par lettre, c'était vingt-cinq ovales en même temps qui tapissaient le sol, illisible) : un trou par MOT.
  // Il s'ouvre sous le mot, et ses lettres en sortent l'une derrière l'autre, à la file, comme les foulards du chapeau d'un magicien ;
  // chacune file en arc jusqu'à sa place ; le trou se referme après la dernière
  if (Ls) { const fl = Wd.floor - 2, dehors = Ls.filter(Lt => Lt.st === 'avale' || Lt.st === 'trou').sort((a, b) => (a.row || 0) - (b.row || 0) || a.x0 - b.x0), mots = [];
    dehors.forEach(Lt => { const m = mots[mots.length - 1], p = m && m[m.length - 1], w = Lt.x1 - Lt.x0; if (m && (p.row || 0) === (Lt.row || 0) && Lt.x0 - p.x1 < Math.max(4, w * 0.3)) m.push(Lt); else mots.push([Lt]); });
    mots.forEach((m, k) => { const xa = rt.left + m[0].x0, xb = rt.left + m[m.length - 1].x1, x = (xa + xb) / 2, t0 = 0.2 + k * 0.28;
      later(t0, () => trou(x, fl, clamp((xb - xa) * 0.32, Wd.s0 * 0.16, Wd.s0 * 0.5), 0.15, 0.25 + m.length * 0.07));
      m.forEach((Lt, j) => later(t0 + 0.12 + j * 0.07, () => { Lt.a = 1; Lt.st = 'back'; Lt.t = Wd.t; Lt.from = [x - (rt.left + Lt.cx), fl - (rt.top + Lt.cy), (j % 2 ? 1 : -1) * 1.4]; Lt.dx = Lt.from[0]; Lt.dy = Lt.from[1]; Lt.rot = Lt.from[2]; Lt.out0 = 0;
        if (j === 0 && Math.random() < 0.5) word(pick(['flap', 'zip', 'pfuit']), x, fl - Wd.s0 * 0.3, 14); })); }); }
  ['stay', 'enter'].map(id => document.getElementById(id)).filter(Boolean).forEach((b, i) => sortBouton(b, 350 + i * 180));
  document.querySelectorAll('.evts-list li > button').forEach((b, i) => sortBouton(b, 500 + i * 70));
  { const lp = document.getElementById('lang-pick'); if (lp) sortBouton(lp, 420); }
  BAS().forEach((b, i) => remonte(b, 300 + i * 80));
  const L = avales.slice(); avales = [];
  const ox = o ? o.x : Wd.W / 2, oy = floorAt(0.5), pos = it => { const h = it.home && !it.home.on ? it.home : it; return [h.fx * Wd.W, floorAt(h.d)]; };
  L.sort((a, b) => Math.abs(pos(a)[0] - ox) - Math.abs(pos(b)[0] - ox));
  // (vague 31, l'audit : « le retour du mode sérieux ») : tout revient par-dessous. Avant chaque trou, une galerie se creuse sous le plancher
  // depuis le bouton, en pointillés ; une bosse y file (quelque chose arrive), et le trou s'ouvre juste quand elle y est
  L.forEach((it, i) => { const [hx, hy] = pos(it); galeries.push({ x0: ox, y0: Wd.floor, x1: hx, y1: hy, t0: Wd.t + 0.3 + i * 0.12 - 0.55, dur: 0.55, seed: i }); });
  L.forEach((it, i) => later(0.3 + i * 0.12, () => {
    if (!Wd.props.includes(it)) return; it.ventre = false;
    if (it.home && !it.home.on) { it.fx = it.home.fx; it.d = it.home.d; it.dT = it.home.d; }
    it.tilt = 0; it.vx = it.vy = 0; it.fall = false;
    // (vague 320 : le trou se referme juste après que l'objet en a jailli ; ouverts plus longtemps, ils étaient dix à la fois sur le sol)
    const s = sOf(it.d); trou(it.fx * Wd.W, floorAt(it.d), clamp(s * 0.5, Wd.s0 * 0.18, Wd.s0 * 1.2), 0.15, 0.3);
    it.lift = 0; it.big = it.big || 1; it.trou = { t0: Wd.t, retour: true, big: it.big, sens: Math.random() < 0.5 ? -1 : 1 }; it.big *= 0.05;
    later(0.25, () => word(pick(['pop !', 'plop', 'tadaa']), it.fx * Wd.W, floorAt(it.d) - s * 0.8, 18));
    later(0.28, () => recrache(it.fx * Wd.W, floorAt(it.d), s, K.LOURD[it.kind]));
  }));
  // (29/09, l'audit : au retour, la pièce restait vide de chats) : deux chats jaillissent des derniers trous avec les objets, en criant,
  // deux autres rentrent en courant par les côtés
  const n = L.length, tr = [...new Set([L[n - 1], L[n - 2], L[Math.max(0, n - 4)], L[Math.floor(n / 2)]])].filter(Boolean).slice(0, 4);
  tr.forEach((it, i) => later(0.55 + (n - 1) * 0.12 + i * 0.3, () => { if (K.residents().length >= K.MAXC) return; const d = it.d ?? 0.3, c = K.addCat({ x: it.fx * Wd.W, d }), s = sc(c);
    c.y = floorAt(d) - s * 0.3; c.fall = true; c.vy = -s * rnd(5.5, 7); if (!CRAV.some(o => o.c)) cravate(c); c.vx = s * rnd(1, 2.4) * (i % 2 ? -1 : 1); c.face = sgn(c.vx) || 1; later(0.2, () => say(c, pick(en() ? ['woohoo!', 'I’m back!', 'hi!', 'hop!'] : ['youhou !', 'me revoilà !', 'coucou !', 'hop !']))); }));
  // (la pièce était pleine, personne n'a jailli : la cravate va à un chat de la maison)
  later(1.3 + n * 0.12, () => { if (CRAV.some(o => o.c)) return; const c = Wd.cats.find(c => !c.gone && !c.temp && !c.rare && K.free4(c)); if (c) cravate(c); });
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
/* (vague 266 de l'audit, immersion : « le retour du mode sérieux ») : un trou qui recrache ne reste pas dans son coin. Le jet secoue toute
   la pièce : une secousse court sur le plancher depuis le trou (sans trait dessiné : les ondes au trait s'emmêlaient en gribouillis), et tout ce qu'elle touche le sent passer, de plus en plus faiblement en s'éloignant :
   les objets déjà revenus tanguent, les croquettes sautillent, les lettres du titre frémissent, les chats sur le sol font un bond (« ouh ! »),
   et le plancher tremble sous les lourds. Comme les trous s'ouvrent en vague depuis le bouton, les ondes se croisent et la pièce
   entière remue, de proche en proche, jusqu'au dernier objet. */
function recrache(x, y, s, lourd) {
  const R = Wd.W * (lourd ? 0.5 : 0.32), f = lourd ? 1 : 0.6;
  if (lourd) Wd.shake = { t0: Wd.t, a: 2.5 };
  const quand = d => 0.05 + d / (Wd.W * 1.6), force = d => f * Math.max(0, 1 - d / R);
  Wd.props.forEach(p => { if (p.gone || p.ventre || (p.trou && Wd.t - p.trou.t0 < 0.6)) return; const d = Math.abs(p.fx * Wd.W - x), k = force(d); if (k < 0.08) return;
    later(quand(d), () => { p.wob = Wd.t; p.wobA = 0.25 + 0.6 * k; }); });
  Wd.kib.forEach(kb => { if (kb.gone || kb.suck || kb.who) return; const d = Math.abs(kb.x - x), k = force(d); if (k < 0.1) return; later(quand(d), () => { if (!kb.gone) { kb.vy = -Wd.s0 * (1.2 + 2.5 * k); kb.rest = false; } }); });
  const Ls = window.Vie && Vie.LETTERS && Vie.LETTERS(), rt = Ls && Vie.RECT(); if (Ls) Ls.forEach(L => { if (L.st) return; const d = Math.abs(rt.left + L.cx - x), k = force(d); if (k < 0.15) return; later(quand(d), () => { L.wob = Wd.t; L.wobA = 0.4 * k; }); });
  let dit = 0; Wd.cats.forEach(c => { if (c.gone || c.fall || c.held || c.perch || c.jump || c.dormeur) return; const d = Math.abs(c.x - x), k = force(d); if (k < 0.2) return;
    later(quand(d), () => { if (c.fall || c.held || c.gone) return; c.fall = true; c.vy = -Math.sqrt(2 * K.grav() * sc(c) * (0.12 + 0.35 * k)); c.vx = (c.x < x ? -1 : 1) * sc(c) * 0.6 * k;
      if (dit++ < 2 && Math.random() < 0.6) say(c, pick(en() ? ['whoa!', 'ooh!', 'hey!'] : ['ouh !', 'oh !', 'hé !', 'ça bouge !'])); }); });
}
/* (vague 101-102 de l'audit, « le retour du mode sérieux » vers 9,9) : le premier chat qui jaillit revient du mode sérieux… en cravate
   (bleue, comme le plan). Il la garde un moment, très fier (« réunion terminée ! »), puis, un peu plus tard, fait sa toilette et l'arrache :
   elle vole, retombe au sol et s'y ratatine jusqu'à rien. */
const CRAV = [];   // { c } sur un chat ; { x, y, vx, vy, rot, vr, sol, t } quand elle vole
function cravate(c) { if (!c || CRAV.some(o => o.c === c)) return; c.cravate = true; CRAV.push({ c, t0: Wd.t });
  later(1.1, () => say(c, pick(en() ? ['meeting over!', 'very serious.', 'Q3 was great'] : ['réunion terminée !', 'très sérieux.', 'on a bien bossé'])));
  if (window.Dex && Dex.vu) later(2.5, () => Dex.vu('cravate'));
  later(rnd(40, 70), () => { if (!c.cravate || !Wd.cats.includes(c)) return; const go2 = () => { if (!c.cravate || !Wd.cats.includes(c)) return; if (!K.free4(c) || c.fall || c.held) { later(2, go2); return; }
    interrupt(c); c.q = [pose('toilette', 1.2, { fx: c => { say(c, pick(en() ? ['enough.', 'weekend!'] : ['bon, ça suffit.', 'c’est le week-end !'])); const o = CRAV.find(o => o.c === c); if (!o || !c.hp) return;
      c.cravate = false; const s = sc(c); Object.assign(o, { c: null, x: c.hp[0], y: c.hp[1] + s * 0.3, vx: c.face * s * rnd(2, 3), vy: -s * 3.5, rot: 0, vr: c.face * 9, sol: floorAt(c.d) - 2, s, t: 0 }); } }), pose('assis', 1.2)]; };
    go2(); }); }
function dessineCravate(ctx, x, y, s, rot, k, ink) {
  const L = s * 0.34 * k, w = s * 0.11 * k; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.4, s * 0.018);
  ctx.strokeStyle = `rgb(${ink})`; ctx.fillStyle = 'rgb(52,120,219)';
  ctx.beginPath(); ctx.moveTo(-w * 0.5, 0); ctx.lineTo(w * 0.5, 0); ctx.lineTo(w * 0.35, w * 0.7); ctx.lineTo(-w * 0.35, w * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();   // le nœud
  ctx.beginPath(); ctx.moveTo(-w * 0.3, w * 0.7); ctx.lineTo(w * 0.3, w * 0.7); ctx.lineTo(w * 0.62, L * 0.82); ctx.lineTo(0, L); ctx.lineTo(-w * 0.62, L * 0.82); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < 4; i++) { const yy = w * 0.7 + (L * 0.75 - w * 0.7) * i / 4; ctx.moveTo(-w * 0.35, yy); ctx.lineTo(w * 0.35, yy + w * 0.5); } ctx.stroke(); ctx.restore(); }
H.draw.push(() => {
  const ctx = window.Chalk && Chalk.ctx; if (!CRAV.length || !ctx || Wd.espace || Wd.trou || Wd.a < 0.05) return; const ink = (window.THEME && THEME.ink) || Chalk.INK || '40,40,48', dt = Math.min(0.05, Wd.t - (CRAV.tl ?? Wd.t)); CRAV.tl = Wd.t;
  for (let i = CRAV.length - 1; i >= 0; i--) { const o = CRAV[i];
    if (o.c) { const c = o.c; if (!Wd.cats.includes(c) || c.gone) { CRAV.splice(i, 1); continue; } if (!c.hp || c.hidden || c.held) continue; const s = sc(c);
      // sous le menton, qui se balance au pas
      dessineCravate(ctx, c.hp[0] + c.face * s * 0.02, c.hp[1] + s * 0.16, s, Math.sin(Wd.t * 6 + i) * 0.12 - (c.vx || 0) * 0.0006, 1, ink); continue; }
    // arrachée : elle vole, retombe, puis se ratatine au sol
    if (o.y < o.sol) { o.vy += o.s * 12 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; if (o.y >= o.sol) { o.y = o.sol; o.rot = Math.PI / 2 * sgn(o.vr); } }
    else { o.t += dt; if (o.t > 3) { CRAV.splice(i, 1); continue; } }
    dessineCravate(ctx, o.x, o.y - (o.t ? 3 : 0), o.s, o.rot, o.t > 1.8 ? 1 - (o.t - 1.8) / 1.2 : 1, ink); }
});
addEventListener('serieux:ferme', retour);
return { go: go0, avale, CRAV, get actif() { return !!F; }, set vitesse(v) { vit = v; } };
})();
