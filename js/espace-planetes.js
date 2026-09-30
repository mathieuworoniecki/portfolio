/* Dans l'espace (l'écran 2) : dès l'arrivée, pendant que les compétences s'écrivent (js/espace-plume.js), deux planètes se dessinent, au stylo.
   - La Terre, en bas : une tranche, toute la largeur de l'écran, comme une atmosphère toute proche ; ses continents tournent doucement.
     C'est l'écran suivant (plus tard) ; pour l'instant, elle est solide : chats, dessins et lettres rebondissent dessus.
   - La planète des chats, plus loin : une tête de chat ronde (oreilles, moustaches, yeux qui suivent le curseur), un anneau de laine.
     Survolée : des choses poussent dessus (28/09, Mathieu : « la planète chat ne doit pas avoir de texte » : plus de texte qui tourne) (un arbre à chat, un carton, une maison, un drapeau-poisson…) ;
     elle ronronne. Elle attire un peu les chats qui passent près ; certains s'y posent, comme le Petit Prince.
     Un clic : tous les chats y tombent, attirés, en rapetissant ; puis elle grossit, grossit… et on est revenu à l'écran 1. */
window.EspacePlanetes = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, I, ANIMS, rnd, pick, clamp, sgn, sm, c01 } = K;
const TAU = Math.PI * 2, BL = '244,244,238';
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const en = () => window.I18N && I18N.lang && I18N.lang !== 'fr';

let P = null;   // { t0 (le début du dessin), terre: {cx, cy, R, top}, chat: {x, y, r}, survol, pousse (0 → 1), aspire }
function place() {
  const W = O.W, H = O.H, bas = O.BAS(), h = clamp(H * 0.085, 44, 84), R = Math.max(W * 1.15, (W * W / 4) / (2 * h) + h / 2);   // (sur un téléphone : une tranche, pas une boule)
  const r = clamp(Math.min(W, H) * 0.09, 38, 90), large = W >= 760;
  // (la planète des chats : à la place que lui laissent les constellations des compétences, js/espace-plume.js)
  const top = bas - h + 18, pl = window.EspacePlume && EspacePlume.planete;
  return { terre: { cx: W / 2, cy: bas - h + R + 18, R, top }, chat: pl ? { x: pl[0], y: pl[1], r } : { x: large ? W * 0.9 : W * 0.8, y: large ? H * 0.2 : H * 0.22, r } };
}
function naissance() { if (P) return; P = Object.assign(place(), { W: O.W, H: O.H, t0: Wd.t, survol: 0, pousse: 0, aspire: null, seed: Math.random() * 99 }); }
// (28/09, Mathieu : « fais apparaître la Terre et la planète des chats plus vite ») : elles se dessinent dès l'arrivée, pendant que la présentation s'écrit
let entreT = null;
X.entre.push(() => { P = null; entreT = Wd.t; if (reduit) naissance(); });
X.retour.push(() => { P = null; entreT = null; });
if (window.EspacePlume) EspacePlume.onFini = () => { naissance(); };
const trace = (dl, d) => P ? c01((Wd.t - P.t0 - dl) / d) : 0;

/* ——— la physique : la Terre est solide, la planète des chats attire ——— */
X.pas.push((dt, cats) => {
  if (!P && entreT != null && Wd.t - entreT > 1.2 && (!window.EspacePlume || EspacePlume.M || Wd.t - entreT > 4)) naissance();
  if (!P) return;
  // l'écran a changé de taille : elles reprennent leur place (après les constellations, qui se recomposent avant)
  if (P.W !== O.W || P.H !== O.H) Object.assign(P, place(), { W: O.W, H: O.H });
  const T = P.terre, Cp = P.chat, t = trace(0, 1.5);
  if (t > 0.5) {
    // la Terre : rien ne passe au travers (les chats, les dessins, les lettres rebondissent)
    const repousse = (x, y, r, fn) => { const dx = x - T.cx, dy = y - T.cy, d = Math.hypot(dx, dy); if (d < T.R + r) fn(dx / d, dy / d, T.R + r - d); };
    cats.forEach(c => { const S = c.sp; if (!S || c.held || X.mode[S.m] && S.m !== 'texte') return; const [x, y] = centreDe(c);
      repousse(x, y, rayon(c) * 0.85, (nx, ny, o) => { c.x += nx * o; c.y += ny * o; const vn = S.vx * nx + S.vy * ny; if (vn < 0) { S.vx -= 1.8 * vn * nx; S.vy -= 1.8 * vn * ny; S.w += rnd(-3, 3); if (-vn > 150 && Math.random() < 0.5) Wd.fx.push({ k: 'txt', text: pick(['boing', 'plonk', 'bonk']), x, y: y + 10, t0: Wd.t, life: 0.8, rot: rnd(-0.2, 0.2), size: 15 }); } }); });
    (O.corps || []).forEach(b => { if (b.fin || b.tenu) return; let o = 0, nx = 0, ny = 0; b.P.forEach(p => repousse(p[0], p[1], 2, (a, bb, q) => { if (q > o) { o = q; nx = a; ny = bb; } }));
      if (o) { b.x += nx * o; b.y += ny * o; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; b.w += rnd(-0.5, 0.5); } } });
    (O.lettres || []).forEach(l => repousse(l.x, l.y, l.px * 0.4, (nx, ny, o) => { l.x += nx * o; l.y += ny * o; const vn = l.vx * nx + l.vy * ny; if (vn < 0) { l.vx -= 1.8 * vn * nx; l.vy -= 1.8 * vn * ny; } }));
  }
  if (trace(0.8, 1.5) < 0.6) return;
  // la gravité (28/09, Mathieu : « les deux ont de la gravité : si les chats sont proches, ils sont attirés, puis repartent quand ils ont fait une révolution »)
  // un chat qui dérive près d'une planète est happé : il tombe en orbite, fait son tour (autour de la planète des chats ; le long de la Terre, un grand arc
  // en rase-mottes), puis la fronde le relance plus vite qu'il n'est venu. Parfois, autour de la planète des chats, il finit par s'y poser.
  cats.forEach(c => { const S = c.sp; if (!S || c.held || S.m !== 'derive' || P.aspire || Wd.t - (S.orbT ?? -99) < 9 || Wd.t - (S.lache ?? -99) < 2 || (O.enCage && O.enCage(c))) return;
    const [x, y] = centreDe(c), r = rayon(c), dx = x - Cp.x, dy = y - Cp.y, d = Math.hypot(dx, dy);
    if (d < Cp.r * 3 && d > Cp.r + r && Math.random() < dt * 3) return orbite(c, 'chat', Cp.x, Cp.y, d, Math.atan2(dy, dx));
    const T = P.terre, de = Math.hypot(x - T.cx, y - T.cy), a = Math.atan2(y - T.cy, x - T.cx), half = Math.asin(clamp(O.W / 2 / T.R, 0, 1));
    if (de < T.R + Wd.s0 * 1.6 && de > T.R + r && Math.abs(a + Math.PI / 2) < half * 0.8 && Math.random() < dt * 1.5) orbite(c, 'terre', T.cx, T.cy, de, a);
  });
  // tout près de la planète des chats : on rebondit dessus (ou on s'y pose, doucement)
  cats.forEach(c => { const S = c.sp; if (!S || c.held || S.m === 'aspire' || S.m === 'planete' || X.mode[S.m]) return; const [x, y] = centreDe(c), dx = Cp.x - x, dy = Cp.y - y, d = Math.hypot(dx, dy) || 1, r = rayon(c);
    if (d < Cp.r + r * 0.8) { const nx = -dx / d, ny = -dy / d; c.x += nx * (Cp.r + r * 0.8 - d); c.y += ny * (Cp.r + r * 0.8 - d); const vn = S.vx * nx + S.vy * ny;
      if (vn < 0) { if (-vn < 160 && Math.random() < 0.5 && !P.aspire) { pose(c, Math.atan2(-ny, -nx) + Math.PI); } else { S.vx -= 1.7 * vn * nx; S.vy -= 1.7 * vn * ny; S.w += rnd(-3, 3); } } } });
  // survolée (à la souris) : le texte autour, les choses qui poussent ; au doigt, un peu tout le temps
  const Q = Wd.ptr, on = !P.aspire && ((Q && Q.on && Math.hypot(Q.x - Cp.x, Q.y - Cp.y) < Cp.r * 1.25) || Wd.cats.some(c => c.sp && c.sp.m === 'planete'));
  P.survol += ((on ? 1 : 0) - P.survol) * Math.min(1, dt * 4); P.pousse = clamp(P.pousse + (on ? dt / 2.2 : -dt / 1.2), 0, 1);
  if (on && !P.onT) { P.onT = Wd.t; const c = voisin(Cp.x, Cp.y); if (c && Math.random() < 0.6) say(c, pick(['chez nous !', 'la planète !', 'miaou ?'])); }
  if (!on) P.onT = 0;
  if (P.aspire) aspire(dt, cats);
});
function voisin(x, y) { let b = null, bd = 1e9; Wd.cats.forEach(c => { if (!c.sp) return; const [a, bb] = centreDe(c), d = Math.hypot(a - x, bb - y); if (d < bd) { bd = d; b = c; } }); return b; }

/* ——— en orbite : happé, il tourne, puis la fronde le relance ——— */
function orbite(c, pl, cx, cy, d, a) {
  const S = c.sp, sens = (S.vx * -Math.sin(a) + S.vy * Math.cos(a)) >= 0 ? 1 : -1, cible = pl === 'chat' ? P.chat.r * 1.5 + rayon(c) * 0.6 : P.terre.R + rayon(c) * 1.4;
  Object.assign(S, { m: 'orbite', pl, a, d, d1: cible, sens, tour: 0, fin: pl === 'chat' ? TAU : rnd(0.35, 0.6) * Math.asin(clamp(O.W / 2 / P.terre.R, 0, 1)) * 2, anim: pick(['apesanteur', 'nage', 'chute'].filter(k => ANIMS[k])) });
  if (Math.random() < 0.5) say(c, pick(en() ? ['whoa!', 'pulled!', 'wheee'] : ['ooh !', 'ça tire !', 'wiii', 'je tourne !']));
}
X.mode.orbite = (c, dt) => {
  const S = c.sp; if (!P || P.aspire) { S.m = 'derive'; return; }
  const chat = S.pl === 'chat', cx = chat ? P.chat.x : P.terre.cx, cy = chat ? P.chat.y : P.terre.cy;
  // il descend vers son orbite en tournant, de plus en plus vite près de la planète (Kepler, à peu près)
  S.d += (S.d1 - S.d) * Math.min(1, dt * 1.6); const v = chat ? TAU / 3.2 * Math.pow(S.d1 / Math.max(S.d, 1), 1.5) : S.fin / 2.6, da = S.sens * v * dt;
  S.a += da; S.tour += Math.abs(da);
  // (28/09, Mathieu : « la planète en 3D, sur un plan plus lointain ») : autour de la planète des chats, l'orbite est un anneau incliné, vu de biais ;
  // devant (en bas), le chat est un peu plus gros ; derrière (en haut), plus petit, et caché par la planète quand il passe derrière elle
  const tx = cx + Math.cos(S.a) * S.d, ty = chat ? cy + Math.sin(S.a) * S.d * 0.34 - Math.cos(S.a) * S.d * 0.06 : cy + Math.sin(S.a) * S.d, [x, y] = centreDe(c); c.x += tx - x; c.y += ty - y; S.prof = chat ? Math.sin(S.a) : 1;
  // le ventre vers la planète, les pattes qui pédalent ; il tourne sur lui-même avec son orbite
  c.anim = S.anim; c.face = S.sens; c.spin = chat ? Math.sin(S.a * 2) * 0.4 * S.sens : -(S.a + Math.PI / 2) * c.face;
  if (S.tour >= S.fin) {
    // la fin du tour : autour de la planète des chats, il s'y pose parfois ; sinon la fronde : lancé le long de sa trajectoire, plus vite
    if (chat && Math.random() < 0.3) { pose(c, S.a); return; }
    const vt = v * S.d * 1.4 + 60; if (window.Dex && Dex.vu) Dex.vu('fronde'); S.m = 'derive'; S.orbT = Wd.t; S.lache = Wd.t; S.next = Wd.t + rnd(2, 4); S.anim = pick(O.DERIVE);
    S.vx = -Math.sin(S.a) * S.sens * vt + Math.cos(S.a) * 40; S.vy = Math.cos(S.a) * S.sens * vt + Math.sin(S.a) * 40; S.w = rnd(-3, 3); c.spin = 0;
    if (Math.random() < 0.6) say(c, pick(en() ? ['wheee!', 'bye!', 'again!'] : ['wiiiii !', 'encore !', 'à plus !', 'youhou']));
  }
};

// (28/09, 20:46, Mathieu : « quand les chats sont sur la planète chat ou en approche, ils doivent devenir plus petits au fur et à mesure,
// pour qu'on les voie bien tout autour, comme si la planète était loin ») : la taille d'un chat selon sa distance à la planète des chats
const LOIN = 0.3;
X.loin = c => {
  const S = c.sp; if (!P || !S || S.m === 'aspire' || S.m === 'cine' || trace(0.8, 1.5) < 0.5) return 1; const Cp = P.chat;
  if (S.m === 'planete') return LOIN;
  if (S.m === 'orbite' && S.pl === 'chat') { const [x, y] = centreDe(c), dd = Math.hypot(x - Cp.x, y - Cp.y), pr = S.prof || 0, cache = pr < 0 ? c01((dd - Cp.r * 0.8) / (Cp.r * 0.35)) : 1;
    return Math.max(0.004, LOIN * (1 + 0.3 * pr) * cache); }
  const [x, y] = centreDe(c), d = Math.hypot(x - Cp.x, y - Cp.y); return LOIN + (1 - LOIN) * sm(c01((d - Cp.r * 1.2) / (Cp.r * 4.5)));
};

/* ——— posé sur la planète, comme le Petit Prince : il se promène un peu à sa surface, puis repart ——— */
function pose(c, ang) { const S = c.sp;
  // (pas deux chats au même endroit de la planète : il se pose à côté de ceux qui y sont déjà)
  const gap = rayon(c) * 1.3 / P.chat.r, autres = Wd.cats.filter(o => o !== c && o.sp && o.sp.m === 'planete').map(o => o.sp.ang), loin = a => autres.every(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) > gap);
  if (!loin(ang)) { const k = [1, -1, 2, -2, 3, -3, 4, -4].map(i => ang + i * gap).find(loin); if (k == null) { S.vx = Math.cos(ang) * 120; S.vy = Math.sin(ang) * 120; return; } ang = k; } Object.assign(S, { m: 'planete', ang, fin: Wd.t + rnd(6, 14), anim: pick(['assis', 'pain', 'toilette', 'debout', 'dodo'].filter(a => ANIMS[a])), vx: 0, vy: 0, marche: Math.random() < 0.4 ? sgn(rnd(-1, 1)) * rnd(0.15, 0.3) : 0 }); if (Math.random() < 0.6) say(c, pick(['chez moi', 'ma planète', 'on est bien', '♥'])); if (window.Dex && Dex.vu) Dex.vu('petitprince'); }
X.mode.planete = (c, dt) => {
  const S = c.sp, Cp = P && P.chat; if (!Cp || P.aspire) { S.m = 'derive'; return; }
  S.ang += S.marche * dt; c.anim = S.marche ? 'pas' : S.anim;
  { const gap = rayon(c) * 1.2 / Cp.r; Wd.cats.forEach(o => { if (o === c || !o.sp || o.sp.m !== 'planete') return; const d = Math.atan2(Math.sin(S.ang - o.sp.ang), Math.cos(S.ang - o.sp.ang)); if (Math.abs(d) < gap) { S.ang += Math.sign(d || 1) * (gap - Math.abs(d)) * 0.5; if (S.marche && Math.sign(S.marche) === -Math.sign(d || 1)) S.marche = -S.marche; } }); }
  // debout sur la surface, les pattes vers le centre : il tourne avec l'endroit où il est
  const r = Cp.r * (1 + (P.pousse * 0.02)), up = S.ang; c.spin = -(up + Math.PI / 2) * c.face;
  c.x = Cp.x + Math.cos(up) * r; c.y = Cp.y + Math.sin(up) * r;
  if (Wd.t > S.fin) { S.m = 'derive'; S.vx = Math.cos(up) * 110; S.vy = Math.sin(up) * 110; S.next = Wd.t + rnd(2, 4); S.anim = 'apesanteur'; S.lache = Wd.t; c.spin = 0; if (Math.random() < 0.5) say(c, pick(['hop !', 'à plus !', 'wiii'])); }
};
X.envie.push(c => { if (!P || P.aspire || trace(0.8, 1.5) < 1 || Math.random() < 0.8) return false; const S = c.sp, Cp = P.chat;
  S.m = 'nage'; S.cible = { x: Cp.x, y: Cp.y, r: 1 + Cp.r / rayon(c), arrive: c => { const [x, y] = centreDe(c); pose(c, Math.atan2(y - Cp.y, x - Cp.x)); } }; S.fin = Wd.t + 7; return true; });

/* ——— le clic sur la planète des chats : ils y tombent tous, elle grossit, retour à l'écran 1 ——— */
function lance() {
  if (!P || P.aspire) return;
  P.aspire = { t0: Wd.t, zoom: 0, fait: false };
  Wd.cats.forEach(c => { if (!c.sp) return; c.held = false; const S = c.sp; S.ancre = null; S.corps = null; S.m = 'aspire'; S.d0 = null; S.w = rnd(-6, 6); });
  const c = voisin(P.chat.x, P.chat.y); if (c) say(c, pick(['on rentre !', 'à la maison !', 'wiiii']));
}
X.mode.aspire = (c, dt) => {
  const S = c.sp, Cp = P && P.chat; if (!Cp) { S.m = 'derive'; return; }
  const [x, y] = centreDe(c), dx = Cp.x - x, dy = Cp.y - y, d = Math.hypot(dx, dy) || 1; if (S.d0 == null) { S.d0 = d; S.s0 = c.s; }
  const a = 2600 * Wd.s0 / 150; S.vx += dx / d * a * dt; S.vy += dy / d * a * dt; S.vx *= Math.exp(-dt * 1.5); S.vy *= Math.exp(-dt * 1.5);
  c.x += S.vx * dt; c.y += S.vy * dt; c.spin += S.w * dt; c.anim = 'chute';
  // il rapetisse en approchant ; arrivé, il disparaît dans la planète (un petit cœur)
  c.s = Math.max(0.001, S.s0 * clamp(d / S.d0, 0.02, 1));
  if (d < Cp.r * 0.5 && !S.dedans) { S.dedans = true; Wd.fx.push({ k: 'heart', x: Cp.x + rnd(-10, 10), y: Cp.y - Cp.r * 0.6, t0: Wd.t, life: 1, r: 7 }); }
  if (S.dedans) { c.s = 0.001; c.x = Cp.x; c.y = Cp.y; }
};
function aspire(dt) {
  const A = P.aspire, tous = Wd.cats.every(c => !c.sp || c.sp.dedans);
  // tous dedans : la planète grandit et son disque s'ouvre sur la pièce (js/trounoir.js, la sortie : elle recrache tout de l'autre côté)
  if ((tous || Wd.t - A.t0 > 4.5) && !A.fait) { A.fait = true; if (window.Dex && Dex.vu) Dex.vu('retourplanete'); POUS.attend = true; const Cp = P.chat; O.sortie({ x: Cp.x, y: Cp.y, dessine: (ctx, z, now) => { A.zoom = Math.max(0.001, z); } }); }
}

/* ——— attraper : la planète des chats (un clic la lance), la Terre (elle frémit) ——— */
const MOD = { drag() {}, release(k) { if (k.p === 'chat') lance(); else { P.frisson = Wd.t; const c = voisin(P.terre.cx, P.terre.top); if (c) say(c, pick(en() ? ['Earth!', 'soon…'] : ['la Terre !', 'bientôt…', 'on y va quand ?'])); } } };
X.grab.push((x, y) => {
  if (!P || P.aspire) return null;
  if (trace(0.8, 1.5) > 0.6 && Math.hypot(x - P.chat.x, y - P.chat.y) < P.chat.r * 1.1) return { mod: MOD, p: 'chat' };
  if (trace(0, 1.5) > 0.6 && Math.hypot(x - P.terre.cx, y - P.terre.cy) < P.terre.R && y < O.BAS()) return { mod: MOD, p: 'terre' };
  return null;
});

/* ——— le dessin (au stylo blanc) ——— */
// un cercle qui se trace (de 0 à p)
function arc(ctx, x, y, r, a0, p, ry) { ctx.beginPath(); ctx.ellipse(x, y, r, ry ?? r, 0, a0, a0 + TAU * p); ctx.stroke(); }
// un contour tremblé et fermé (un continent), autour de (x, y)
function blob(ctx, x, y, r, seed) { ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, k = 1 + 0.28 * Math.sin(a * 3 + seed) + 0.16 * Math.sin(a * 5 + seed * 2.3); const px = x + Math.cos(a) * r * k * 1.4, py = y + Math.sin(a) * r * k * 0.7; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
function terre(ctx, now) {
  const T = P.terre, t = trace(0, 1.5), fr = P.frisson ? Math.sin((Wd.t - P.frisson) * 30) * Math.exp(-(Wd.t - P.frisson) * 4) * 3 : 0;
  ctx.save(); ctx.translate(0, fr);
  // l'atmosphère (deux fins cercles), puis le sol, qui se trace depuis le milieu vers les bords
  const half = Math.asin(clamp(O.W / 2 / T.R, 0, 1)) + 0.05, a0 = -Math.PI / 2;
  ctx.strokeStyle = `rgba(${BL},0.9)`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(T.cx, T.cy, T.R, a0 - half * t, a0 + half * t); ctx.stroke();
  [[10, 0.28], [22, 0.12]].forEach(([d, al]) => { ctx.strokeStyle = `rgba(150,200,255,${al * t})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(T.cx, T.cy, T.R + d, a0 - half * t, a0 + half * t); ctx.stroke(); });
  // les continents et les nuages : ils tournent doucement (dans le disque seulement)
  const tc = trace(1.2, 1.2);
  if (tc > 0) { ctx.save(); ctx.beginPath(); ctx.arc(T.cx, T.cy, T.R - 2, 0, TAU); ctx.clip(); ctx.globalAlpha = tc;
    const off = (Wd.t * 12) % (O.W * 1.5);
    for (let i = 0; i < 7; i++) { const x = ((i * O.W * 0.27 + off + P.seed * 50) % (O.W * 1.5)) - O.W * 0.25, y = T.top + 18 + (i % 3) * 16 + 10, r = (22 + (i * 37 % 30)) * clamp(O.W / 1200, 0.45, 1);
      blob(ctx, x, y + (T.cy - T.R - T.top) * 0 + Math.pow((x - T.cx) / T.R, 2) * T.R * 0.5, r, i * 1.7 + P.seed); ctx.strokeStyle = `rgba(${BL},0.75)`; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.strokeStyle = `rgba(${BL},0.35)`; ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) { const x = ((i * O.W * 0.33 + off * 1.6) % (O.W * 1.5)) - O.W * 0.25, y = T.top + 8 + (i % 2) * 22 + Math.pow((x - T.cx) / T.R, 2) * T.R * 0.5;
      ctx.beginPath(); for (let k = 0; k <= 10; k++) { const px = x + k * 7, py = y + Math.sin(k * 1.2 + i) * 2.5; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
    ctx.restore(); }
  // (29/09, l'audit : « la Terre, correcte mais passive ») : elle vit. Des villes s'allument le long de l'horizon (la nuit de ce côté) ;
  // un satellite de papier passe au-dessus de l'atmosphère, ses panneaux ; de temps en temps, une petite fusée décolle et monte en arc
  if (tc > 0.5) { const yA = x => T.cy - Math.sqrt(Math.max(0, T.R * T.R - (x - T.cx) ** 2));
    // (vague 45, l'audit : « la Terre », immersion) : une aurore boréale se lève de temps en temps sur tout l'horizon, d'un bord à l'autre :
    // des rideaux de traits verticaux qui ondulent, se plient, courent le long de la courbe, puis retombent dans l'atmosphère (jamais sur les sous-titres)
    { const cyc = 26, u = ((now + 4) % cyc) / 9; if (u < 1 && !reduit) { const lev = sm(u / 0.25) * (1 - sm((u - 0.72) / 0.28)), bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Hm = Math.min(130, O.H * 0.17);
      ctx.save(); if (bd) { ctx.beginPath(); ctx.rect(0, 0, O.W, O.H); ctx.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); ctx.clip('evenodd'); }
      ctx.lineCap = 'round'; ctx.lineWidth = 2.2; const n = Math.round(O.W / 7), C3 = ['140,255,200', '150,215,255', '190,165,255'], A3 = [0.42, 0.24, 0.1];
      for (let sg = 0; sg < 3; sg++) { ctx.strokeStyle = `rgba(${C3[sg]},${(A3[sg] * lev).toFixed(3)})`; ctx.beginPath();
        for (let i = 0; i <= n; i++) { const x = i / n * O.W, ph = x / O.W * 9 + now * 0.9, h = Hm * lev * (0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(ph + Math.sin(ph * 0.37 + now * 0.5) * 1.5), 1.5)), y0 = yA(x) - 12, sw = (Math.sin(x * 0.012 + now * 1.3) * 14 + Math.sin(x * 0.05 - now * 2.1) * 4) * lev;
          if (h < 2) continue; const q = v => [x + sw * 1.6 * v * v, y0 - h * v]; const [x1, y1] = q(sg / 3), [x2, y2] = q((sg + 1) / 3); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
        ctx.stroke(); }
      ctx.restore(); } }
    for (let i = 0; i < 26; i++) { const u = (i * 0.618 + P.seed * 0.1) % 1, x = O.W * (0.03 + u * 0.94), y = yA(x) + 6 + (i % 4) * 5, on = Math.sin(now * (0.7 + (i % 5) * 0.23) + i * 2.1) > -0.3;
      if (on) O.brille(ctx, x, y, 1.1 + (i % 3) * 0.35, 0.75 * tc, false, now, i + 40); }
    const sa = ((now * 0.035 + P.seed * 0.1) % 1.4) - 0.2, sx = O.W * sa, sy = yA(sx) - 34 - Math.sin(sa * Math.PI) * 26, ang = Math.atan2(yA(sx + 1) - yA(sx), 1);
    if (sa > -0.1 && sa < 1.1) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang + Math.sin(now * 0.8) * 0.1); ctx.globalAlpha = tc;
      const papier = (f) => { ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 4.5; f(); ctx.stroke(); ctx.fillStyle = 'rgb(250,248,242)'; f(); ctx.fill(); ctx.strokeStyle = 'rgb(34,36,40)'; ctx.lineWidth = 1.6; f(); ctx.stroke(); };
      [-1, 1].forEach(g => papier(() => { ctx.beginPath(); ctx.rect(g > 0 ? 7 : -25, -4, 18, 8); }));
      ctx.strokeStyle = 'rgb(34,36,40)'; ctx.lineWidth = 1; [-19, -13, 13, 19].forEach(x => { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x, 4); ctx.stroke(); });
      papier(() => { ctx.beginPath(); ctx.rect(-7, -6, 14, 12); }); ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -12); ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore(); O.brille(ctx, sx, sy - 12, 1.6, tc, Math.sin(now * 4) > 0.6, now, 99); }
    // (vague 18 de l'audit : « la Terre ») : de temps en temps, une baleine de papier jaillit de l'océan le long de l'horizon, fait un arc et replonge dans une gerbe
    { const bu = ((now + 9) % 17) / 3.2; if (bu < 1) { const x0 = O.W * (0.12 + ((Math.floor((now + 9) / 17) * 0.53) % 0.76)), dir = Math.floor((now + 9) / 17) % 2 ? 1 : -1, L = Math.min(90, O.W * 0.08), x = x0 + dir * (bu - 0.5) * L, y = yA(x) + 8 - Math.sin(Math.PI * bu) * L * 0.32, ang = dir * (bu - 0.5) * 2.2, s = Math.min(1.25, O.W / 900);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, O.W, yA(x) + 6); ctx.clip(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(dir * s, s); ctx.globalAlpha = tc;
        const corps = () => { ctx.beginPath(); ctx.moveTo(-26, 2); ctx.quadraticCurveTo(-24, -14, 0, -13); ctx.quadraticCurveTo(22, -12, 26, 0); ctx.quadraticCurveTo(22, 9, 0, 9); ctx.quadraticCurveTo(-16, 9, -26, 2); ctx.moveTo(-26, 2); ctx.lineTo(-38, -8); ctx.lineTo(-35, 3); ctx.lineTo(-40, 12); ctx.closePath(); };
        ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 4.5; corps(); ctx.stroke(); ctx.fillStyle = 'rgb(250,248,242)'; corps(); ctx.fill(); ctx.strokeStyle = 'rgb(34,36,40)'; ctx.lineWidth = 1.6; corps(); ctx.stroke();
        ctx.fillStyle = 'rgb(34,36,40)'; ctx.beginPath(); ctx.ellipse(15, -3, 2.2, 3, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(14.4, -4, 0.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgb(34,36,40)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4, 3); for (let j = 0; j < 4; j++) { ctx.moveTo(-6 + j * 6, 4); ctx.lineTo(-4 + j * 6, 8); } ctx.stroke(); ctx.restore(); }
      // les gerbes : au départ et à l'arrivée
      [[0, 0.18], [1, 0.22]].forEach(([b0, d]) => { const v2 = b0 ? (bu - 0.88) / 0.3 : bu / 0.25; if (v2 <= 0 || v2 >= 1) return; const xs = O.W * (0.12 + ((Math.floor((now + 9) / 17) * 0.53) % 0.76)) + (Math.floor((now + 9) / 17) % 2 ? 1 : -1) * (b0 - 0.5) * Math.min(90, O.W * 0.08), ys = yA(xs) + 4;
        ctx.globalAlpha = tc * (1 - v2); ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1.4; for (let j = 0; j < 7; j++) { const a = -Math.PI / 2 + (j - 3) * 0.32, r = 6 + v2 * 22; ctx.beginPath(); ctx.arc(xs + Math.cos(a) * r, ys + Math.sin(a) * r * 1.2 + v2 * v2 * 16, 1.6, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1; }); }
    const fu = (now % 23) / 5; if (fu < 1) { const x0 = O.W * (0.2 + ((Math.floor(now / 23) * 0.37) % 0.6)), y0 = yA(x0), e = fu * fu, x = x0 + e * O.W * 0.12, y = y0 - e * O.H * 0.28, ang = Math.atan2(-O.H * 0.28, O.W * 0.12);
      for (let j = 1; j < 9; j++) { const v = Math.max(0, fu - j * 0.035), ex = x0 + v * v * O.W * 0.12, ey = y0 - v * v * O.H * 0.28; ctx.globalAlpha = (1 - j / 9) * 0.6 * tc; ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(ex + Math.sin(j * 2.3) * 2, ey, 2 + j * 0.8, 0, TAU); ctx.stroke(); }
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2); ctx.globalAlpha = tc; ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(5, -3, 4, 6); ctx.lineTo(-4, 6); ctx.quadraticCurveTo(-5, -3, 0, -9); ctx.closePath();
      ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = 'rgb(250,248,242)'; ctx.fill(); ctx.strokeStyle = 'rgb(34,36,40)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore(); O.brille(ctx, x - Math.cos(ang) * 9, y - Math.sin(ang) * 9, 2.2, tc, true, now, 98); } 
    // (vague 80, l'audit : « la Terre ») : on pose la souris sur la Terre, on attend : une fusée de papier décolle de ce point-là, fumée qui roule
    // le long de l'horizon ; elle monte droit, s'incline, prend un grand arc à travers tout l'écran et sort par le haut,
    // sa fumée derrière elle (jamais sur les sous-titres)
    { const S = Wd.ptr, bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, L = P.lanc || (P.lanc = { h: 0, t: now, f: [] }), dtl = Math.min(0.2, Math.max(0, now - L.t)); L.t = now;
      const vise = S && S.on && !reduit && S.y > yA(S.x) + 4 && S.y < O.H - 64 && Wd.t - S.moved < 6;
      L.h = vise ? L.h + dtl : 0;
      if (L.h > 0.9 && now > (L.cal || 0) && L.f.length < 3) { L.h = 0; L.cal = now + 3; const x0 = S.x, g = x0 > O.W / 2 ? -1 : 1;
        L.f.push({ t0: now, P: [[x0, yA(x0) + 2], [x0 + g * 20, yA(x0) - O.H * 0.45], [x0 + g * O.W * 0.3, -O.H * 0.1], [x0 + g * O.W * 0.55, -O.H * 0.4]] }); }
      L.f = L.f.filter(f => now - f.t0 < 4.2);
      if (L.f.length) { ctx.save(); if (bd) { ctx.beginPath(); ctx.rect(0, 0, O.W, O.H); ctx.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); ctx.clip('evenodd'); }
        L.f.forEach(f => { const t = now - f.t0, pos = v => { const [A, B, C, D] = f.P, w = 1 - v; return [w * w * w * A[0] + 3 * w * w * v * B[0] + 3 * w * v * v * C[0] + v * v * v * D[0], w * w * w * A[1] + 3 * w * w * v * B[1] + 3 * w * v * v * C[1] + v * v * v * D[1]]; };
          const pre = c01(t / 0.5), u = Math.pow(c01((t - 0.5) / 3.2), 1.6), p0 = f.P[0];
          // le décollage : il tremble sur le pas de tir, un nuage de fumée roule de chaque côté le long de l'horizon
          ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1.4;
          for (let j = 0; j < 10; j++) { const sd = j % 2 ? 1 : -1, v = c01((t - j * 0.03) / 1.6), xx = p0[0] + sd * (8 + v * (40 + j * 7)), yy = yA(xx) - 4 - Math.sin(v * Math.PI) * 6, r = (3 + j % 3) * (1 + v * 2) * (1 - sm((t - 1.8) / 0.8));
            if (r > 0.4) { ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(xx, yy, r, 0, TAU); ctx.stroke(); } }
          // la traîne : des bouffées rondes qui gonflent et rapetissent
          for (let j = 1; j < 18; j++) { const v = u - j * 0.018; if (v <= 0) continue; const q = pos(v), r = (2 + j * 0.9) * (1 - sm((t - 0.5 - j * 0.04 - 1.6) / 1)); if (r < 0.4) continue;
            ctx.globalAlpha = 0.75; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(q[0] + Math.sin(j * 2.1 + t * 3) * 3, q[1], r, 0, TAU); ctx.stroke(); }
          const q = pre < 1 ? [p0[0] + Math.sin(t * 60) * 1.2, p0[1] - 8] : pos(u), q2 = pos(Math.min(1, u + 0.01)), ang = pre < 1 ? -Math.PI / 2 : Math.atan2(q2[1] - q[1], q2[0] - q[0]), sc = 1.8;
          ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(ang + Math.PI / 2); ctx.scale(sc, sc); ctx.globalAlpha = 1;
          const corps = () => { ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(6, -4, 5, 7); ctx.lineTo(-5, 7); ctx.quadraticCurveTo(-6, -4, 0, -11); ctx.closePath(); ctx.moveTo(5, 3); ctx.lineTo(9, 9); ctx.lineTo(4, 7); ctx.moveTo(-5, 3); ctx.lineTo(-9, 9); ctx.lineTo(-4, 7); };
          ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 3; corps(); ctx.stroke(); ctx.fillStyle = 'rgb(250,248,242)'; corps(); ctx.fill(); ctx.strokeStyle = 'rgb(34,36,40)'; ctx.lineWidth = 0.9; corps(); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, -2.5, 2, 0, TAU); ctx.stroke();   // le hublot
          const fl = 5 + Math.sin(t * 50) * 2 + (pre < 1 ? 0 : 4); ctx.beginPath(); ctx.moveTo(-3, 8); ctx.quadraticCurveTo(0, 8 + fl * 1.4, 3, 8); ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1.4; ctx.stroke();
          ctx.restore(); O.brille(ctx, q[0] - Math.cos(ang) * 16, q[1] - Math.sin(ang) * 16, 2.6, 1, true, now, 97); });
        ctx.restore(); } } }
  ctx.restore();
}
// la planète des chats : une tête de chat ronde, qui nous regarde
// (28/09, Mathieu : « la planète des chats est moche » : redessinée comme les chats d'ici — un seul contour, joues rondes, oreilles avec leur creux,
// les grands yeux noirs aux deux reflets, un volume à la plume (hachures du côté de l'ombre, quelques cratères), un anneau de laine torsadée
// dont un bout pend, et une petite lune-poisson qui tourne autour)
function tete(ctx, x, y, r, ear) {
  // le contour d'une tête de chat : le haut rond, les oreilles qui en sortent, les joues un peu plus larges en bas
  const N = 96; ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 2 + i / N * TAU, sx = Math.cos(a), sy = Math.sin(a);
    let k = 1 + 0.16 * Math.max(0, sy) * sx * sx;   // les joues
    [-1, 1].forEach(sd => { const c = -Math.PI / 2 + sd * 0.62, d = Math.atan2(Math.sin(a - c), Math.cos(a - c)); if (Math.abs(d) < 0.27) k += 0.46 * ear * Math.pow(1 - Math.abs(d) / 0.27, 1.25); });   // les oreilles, pointues
    const px = x + sx * r * k, py = y + sy * r * k * 0.97; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function laine(ctx, x, y, r, a0, a1, ring, now) {
  // l'anneau de laine : deux fils qui s'enroulent l'un autour de l'autre (une torsade), sur l'arc a0 → a1 de l'ellipse
  // (plus bas que l'équateur, comme un collier : il ne barre plus le visage)
  const R = r * 1.6, ry = r * 0.27, rot = -0.1, cy = y + r * 0.5, pt = (a, o) => { const ex = Math.cos(a) * (R + o), ey = Math.sin(a) * (ry + o * 0.25); return [x + ex * Math.cos(rot) - ey * Math.sin(rot), cy + ex * Math.sin(rot) + ey * Math.cos(rot)]; };
  const n = Math.max(8, Math.round((a1 - a0) * 40 * ring));
  [0, Math.PI].forEach(ph => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * ring * i / n, o = Math.sin(a * 14 + ph + now * 0.6) * r * 0.045, p = pt(a, o); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); });
  return pt;
}
function planete(ctx, now) {
  const Cp = P.chat, t = trace(0.8, 1.5), A = P.aspire, z = A ? A.zoom : 0, pur = 1 + P.survol * 0.025 * Math.sin(now * 32);
  const r = Cp.r * pur * (1 + z * (Math.hypot(O.W, O.H) * 1.3 / Cp.r)), x = Cp.x + (O.W / 2 - Cp.x) * z * 0.6, y = Cp.y + (O.H / 2 - Cp.y) * z * 0.6;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = `rgb(${BL})`;
  const ring = trace(2.1, 0.8), lune = trace(2.6, 0.6), la = now * 0.45;
  // (vague 6, l'audit : « elle ne fait que regarder ») : elle a ses humeurs, de temps en temps : elle bâille (les oreilles se couchent,
  // la gueule s'ouvre grand), tire la langue au poisson-lune quand il passe devant elle, fait un clin d'œil ; sans curseur, elle suit les chats des yeux
  const Hm = P.hum || (P.hum = { k: null, next: now + 5 });
  if (!Hm.k && now > Hm.next && z === 0 && t >= 1 && !reduit) { Hm.k = Math.sin(la) > 0.2 && Math.abs(Math.cos(la)) < 0.7 ? 'langue' : pick(['baille', 'baille', 'clin', 'ronron', 'ronron']); Hm.t0 = now; Hm.d = { baille: 2.6, langue: 1.6, clin: 0.9, ronron: 3.4 }[Hm.k]; }
  if (Hm.k && now - Hm.t0 > Hm.d) { Hm.k = null; Hm.next = now + rnd(6, 12); }
  // (vague 80, l'audit : « la planète chat ») : on la caresse (la souris posée dessus un moment) : elle ronronne aussitôt ; et son ronron
  // sort de l'espace : chaque onde, en atteignant un élément de l'interface (logo, langue, boutons, chapitres), le fait vibrer
  if (P.survol > 0.85 && z === 0 && t >= 1 && !reduit && Hm.k !== 'ronron' && now > (Hm.cal || 0)) { Hm.k = 'ronron'; Hm.t0 = now; Hm.d = 4.2; Hm.cal = now + 9; }
  if (Hm.k === 'ronron' && z === 0 && !reduit) { if (Hm.ui0 !== Hm.t0) { Hm.ui0 = Hm.t0; Hm.ui = [...document.querySelectorAll('#brand, #lang-pick, #theme-pick, .film-ui .ctrl > *, #chap > *')].map(e => { const b = e.getBoundingClientRect(); return { e, d: Math.hypot(b.left + b.width / 2 - x, b.top + b.height / 2 - y), n: 0 }; }).filter(q => q.d > 0); }
    const u = now - Hm.t0, v = Math.hypot(O.W, O.H) * 1.1 / 2.2;
    Hm.ui.forEach(q => { const n = [0, 1, 2].filter(i => r * 1.15 + (u - i * 0.42) * v >= q.d).length; if (n > q.n && q.n < 3) { q.n = n; const k = 2.4 - q.n * 0.5;
      q.e.animate(Array.from({ length: 9 }, (_, j) => ({ transform: j === 0 || j === 8 ? 'translate(0,0)' : `translate(${(j % 2 ? k : -k).toFixed(1)}px,${(j % 3 - 1) * k * 0.5}px) rotate(${(j % 2 ? 1 : -1) * k * 0.6}deg)` })), { duration: 380, easing: 'linear', composite: 'add' }); } }); }
  const hu = Hm.k ? Math.sin(Math.min(1, (now - Hm.t0) / Hm.d) * Math.PI) : 0, bai = Hm.k === 'baille' ? sm(hu * 1.4) : 0, lan = Hm.k === 'langue' ? sm(hu * 1.6) : 0, cli = Hm.k === 'clin' && hu > 0.3;
  const ear = trace(1.4, 0.5) * (1 - bai * 0.45);
  // un halo, très léger (deux fins cercles, comme l'atmosphère de la Terre)
  if (z === 0 && t > 0.5) [[1.12, 0.1], [1.24, 0.05]].forEach(([k, al]) => { ctx.strokeStyle = `rgba(${BL},${al * t})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * k, 0, TAU); ctx.stroke(); });
  // (vague 44, l'audit : « la planète chat », immersion) : elle ronronne. Les yeux mi-clos, « rrrr », et son ronron se voit : des ondes tremblées
  // partent d'elle et traversent tout l'écran, jusqu'aux bords (jamais sur les sous-titres)
  if (Hm.k === 'ronron' && z === 0) { const u = now - Hm.t0, M = Math.hypot(O.W, O.H) * 1.1, v = M / 2.2, bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande;
    ctx.save(); if (bd) { ctx.beginPath(); ctx.rect(0, 0, O.W, O.H); ctx.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); ctx.clip('evenodd'); }
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) { const rr = r * 1.15 + (u - i * 0.42) * v; if (rr < r * 1.15 || rr > M) continue; const al = 0.34 * (1 - rr / M) * c01(u / 0.3) * c01((Hm.d - u) / 0.5 + (rr / M));
      ctx.strokeStyle = `rgba(${BL},${al.toFixed(3)})`; ctx.beginPath(); for (let k = 0; k <= 120; k++) { const a = k / 120 * TAU, w = rr + Math.sin(a * 11 + now * 26 + i) * (2 + rr * 0.006); k ? ctx.lineTo(x + Math.cos(a) * w, y + Math.sin(a) * w) : ctx.moveTo(x + Math.cos(a) * w, y + Math.sin(a) * w); } ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.fillStyle = `rgba(${BL},${(0.8 * Math.sin(Math.min(1, u / Hm.d) * Math.PI)).toFixed(3)})`; ctx.font = `600 ${Math.max(12, r * 0.24)}px "Caveat","Segoe Print",cursive`; ctx.textAlign = 'center';
    ctx.translate(x - r * 1.05, y + r * 0.95); ctx.rotate(-0.25 + Math.sin(now * 30) * 0.03); ctx.fillText('rrrrr…', 0, 0); ctx.restore(); }
  ctx.strokeStyle = `rgb(${BL})`;
  // la lune-poisson, derrière, quand elle passe de l'autre côté
  const lp = [x + Math.cos(la) * r * 2.25, y + Math.sin(la) * r * 0.55 - r * 0.25], devantL = Math.sin(la) > 0;
  if (lune > 0 && z < 0.3 && !devantL) poisson(ctx, lp[0], lp[1], r * 0.16 * lune, Math.cos(la) < 0 ? 1 : -1, now);
  // l'anneau, derrière (la moitié du haut)
  if (ring > 0 && z < 0.5) { ctx.lineWidth = 1.6; ctx.globalAlpha = 0.85; laine(ctx, x, y, r, Math.PI, TAU, ring, now); ctx.globalAlpha = 1; }
  // le disque (noir : il cache l'anneau et les étoiles derrière), son contour qui se trace
  if (z > 0) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; tete(ctx, x, y, r, ear); ctx.fill(); ctx.restore();
    const col = `rgb(${lerpC(BL.split(',').map(Number), O.rgb((window.THEME && THEME.ink) || '34,36,40'), sm(z / 0.45))})`; ctx.strokeStyle = col; ctx.fillStyle = col; }
  else { ctx.fillStyle = '#07080C'; tete(ctx, x, y, r, ear); ctx.fill(); }
  ctx.lineWidth = 3;
  if (t < 1) { ctx.save(); ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 3, -Math.PI / 2, -Math.PI / 2 + TAU * t); ctx.closePath(); ctx.clip(); tete(ctx, x, y, r, ear); ctx.stroke(); ctx.restore(); }
  else { tete(ctx, x, y, r, ear); ctx.stroke(); }
  const vis = trace(2.0, 0.6);
  if (vis > 0 && z < 0.6) { ctx.globalAlpha = vis;
    // le creux des oreilles
    ctx.lineWidth = 1.8; [-1, 1].forEach(sd => { const c = -Math.PI / 2 + sd * 0.62, p = k => [x + Math.cos(c + sd * k * 0.2) * r * (1 + 0.28 * ear - Math.abs(k) * 0.12), y + Math.sin(c + sd * k * 0.2) * r * (1 + 0.28 * ear - Math.abs(k) * 0.12)];
      const b1 = [x + Math.cos(c - 0.15) * r * 0.99, y + Math.sin(c - 0.15) * r * 0.99], b2 = [x + Math.cos(c + 0.15) * r * 0.99, y + Math.sin(c + 0.15) * r * 0.99], tp = [x + Math.cos(c) * r * (1 + 0.3 * ear), y + Math.sin(c) * r * (1 + 0.3 * ear)];
      ctx.beginPath(); ctx.moveTo(b1[0] + (x - b1[0]) * 0.08, b1[1] + (y - b1[1]) * 0.08); ctx.quadraticCurveTo(tp[0] + (x - tp[0]) * 0.12, tp[1] + (y - tp[1]) * 0.12, b2[0] + (x - b2[0]) * 0.08, b2[1] + (y - b2[1]) * 0.08); ctx.stroke(); });
    // le volume : des hachures courbes du côté de l'ombre (en bas à droite), qui suivent la sphère
    ctx.save(); tete(ctx, x, y, r * 0.985, 0); ctx.clip(); ctx.lineWidth = 1.1; ctx.strokeStyle = `rgba(${BL},0.26)`;
    // le globe : des méridiens qui tournent et des parallèles (une sphère vue au loin, qui tourne sur elle-même)
    for (let j = 0; j < 8; j++) { const ph = now * 0.3 + j * Math.PI / 8, sx = Math.sin(ph), fr = Math.cos(ph); if (fr < 0) continue; ctx.globalAlpha = 0.1 + 0.16 * fr; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, Math.abs(sx) * r), r, 0, -Math.PI / 2, Math.PI / 2, sx < 0); ctx.stroke(); }
    [-0.55, -0.2, 0.2, 0.55].forEach(k => { const rx = r * Math.sqrt(1 - k * k); ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.ellipse(x, y + k * r, rx, rx * 0.16, 0, 0, Math.PI); ctx.stroke(); }); ctx.globalAlpha = vis;
    for (let i = 0; i < 7; i++) { const k = 0.62 + i * 0.065, a0 = -0.35 + i * 0.05, a1 = 1.75 - i * 0.07; ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.12, r * (k + 0.34), a0, a1); ctx.stroke(); }
    // quelques cratères (des creux ronds : un cercle, un arc d'ombre dedans)
    ctx.strokeStyle = `rgba(${BL},0.55)`; [[-0.55, -0.45, 0.09], [0.52, -0.52, 0.06], [-0.62, 0.3, 0.07], [0.2, 0.62, 0.05]].forEach(([u, v, k]) => { ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x + u * r, y + v * r, r * k, r * k * 0.8, 0.3, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + u * r + r * k * 0.15, y + v * r + r * k * 0.1, r * k * 0.7, r * k * 0.55, 0.3, 0.2, 2.2); ctx.stroke(); });
    ctx.restore(); ctx.strokeStyle = ctx.fillStyle = z > 0 ? ctx.strokeStyle : `rgb(${BL})`;
    // les yeux : de grands ovales pleins, deux reflets (comme la miche), qui suivent le curseur ; fermés quand elle ronronne
    const Q = Wd.ptr, vc = !(Q && Q.on) && voisin(x, y), vp = vc && centreDe(vc);
    const lx = Q && Q.on ? clamp((Q.x - x) / O.W * 4, -1, 1) : vp ? clamp((vp[0] - x) / O.W * 5, -1, 1) : Math.sin(now * 0.5) * 0.4, ly = Q && Q.on ? clamp((Q.y - y) / O.H * 4, -1, 1) : vp ? clamp((vp[1] - y) / O.H * 5, -1, 1) : 0;
    const cl = (now % 4.2) < 0.13 || (P.survol > 0.5 && P.pousse > 0.9) || Hm.k === 'ronron', ink = z > 0 ? ctx.fillStyle : `rgb(${BL})`;
    [-1, 1].forEach(s => { const ex = x + s * r * 0.33 + lx * r * 0.05, ey = y + r * 0.02 + ly * r * 0.05;
      if (bai > 0.35) { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(ex - s * r * 0.09, ey - r * 0.06); ctx.lineTo(ex + s * r * 0.05, ey); ctx.lineTo(ex - s * r * 0.09, ey + r * 0.05); ctx.stroke(); }   // plissés, > <
      else if (cl || (cli && s > 0)) { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(ex, ey - r * 0.02, r * 0.1, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
      else { ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.115, r * 0.155, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#07080C';
        ctx.beginPath(); ctx.arc(ex - r * 0.035 + lx * r * 0.02, ey - r * 0.055, r * 0.042, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(ex + r * 0.04, ey + r * 0.06, r * 0.02, 0, TAU); ctx.fill(); } });
    // les joues : trois petits traits (la plume ne rougit pas)
    ctx.lineWidth = 1.3; [-1, 1].forEach(s => [0, 1, 2].forEach(i => { const bx = x + s * r * (0.5 + i * 0.06), by = y + r * 0.26; ctx.beginPath(); ctx.moveTo(bx - r * 0.025, by + r * 0.03); ctx.lineTo(bx + r * 0.02, by - r * 0.03); ctx.stroke(); }));
    // le nez (arrondi), la bouche en w, les moustaches (courbes, qui dépassent)
    ctx.lineWidth = 2.2; const ny = y + r * 0.2;
    ctx.beginPath(); ctx.moveTo(x - r * 0.055, ny - r * 0.02); ctx.quadraticCurveTo(x, ny - r * 0.05, x + r * 0.055, ny - r * 0.02); ctx.quadraticCurveTo(x + r * 0.02, ny + r * 0.045, x, ny + r * 0.045); ctx.quadraticCurveTo(x - r * 0.02, ny + r * 0.045, x - r * 0.055, ny - r * 0.02); ctx.stroke();
    if (bai > 0.12) { // la gueule grande ouverte : un ovale noir, la langue au fond, deux crocs
      const my = ny + r * (0.1 + bai * 0.1), rx = r * (0.07 + bai * 0.06), ry = r * (0.03 + bai * 0.13); ctx.fillStyle = '#07080C';
      ctx.beginPath(); ctx.moveTo(x, ny + r * 0.045); ctx.lineTo(x, my - ry); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, my, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, my + ry * 0.55, rx * 0.6, ry * 0.35, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      [-1, 1].forEach(q => { ctx.beginPath(); ctx.moveTo(x + q * rx * 0.55, my - ry * 0.85); ctx.lineTo(x + q * rx * 0.45, my - ry * 0.5); ctx.lineTo(x + q * rx * 0.35, my - ry * 0.9); ctx.stroke(); }); ctx.lineWidth = 2.2; }
    else { ctx.beginPath(); ctx.moveTo(x, ny + r * 0.045); ctx.lineTo(x, ny + r * 0.08); ctx.arc(x - r * 0.06, ny + r * 0.08, r * 0.06, 0, Math.PI * 0.85); ctx.moveTo(x, ny + r * 0.08); ctx.arc(x + r * 0.06, ny + r * 0.08, r * 0.06, Math.PI, Math.PI * 0.15, true); ctx.stroke(); }
    if (lan > 0) { // la langue tirée vers le poisson : une goutte ronde, un trait au milieu
      const dx = Math.cos(la) * r * 0.05 * lan, ty = ny + r * 0.1, L = r * 0.24 * lan; ctx.fillStyle = '#07080C';
      ctx.beginPath(); ctx.moveTo(x - r * 0.045, ty); ctx.quadraticCurveTo(x - r * 0.05 + dx, ty + L, x + dx, ty + L); ctx.quadraticCurveTo(x + r * 0.05 + dx, ty + L, x + r * 0.045, ty); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, ty + r * 0.01); ctx.lineTo(x + dx * 0.7, ty + L * 0.6); ctx.stroke(); ctx.lineWidth = 2.2; }
    ctx.lineWidth = 1.5; [-1, 1].forEach(s => [-1, 0, 1].forEach(k => { const w = 1.12 + P.survol * 0.1 + Math.sin(now * 2 + k) * 0.015; ctx.beginPath(); ctx.moveTo(x + s * r * 0.36, ny + r * (0.03 + k * 0.05)); ctx.quadraticCurveTo(x + s * r * 0.75, ny + r * (k * 0.07 - 0.02), x + s * r * w, ny + r * (k * 0.16 + 0.02)); ctx.stroke(); }));
    // les rayures du front
    ctx.lineWidth = 2; [-0.13, 0, 0.13].forEach(k => { ctx.beginPath(); ctx.moveTo(x + k * r, y - r * 0.9); ctx.quadraticCurveTo(x + k * r * 0.9, y - r * 0.78, x + k * r * 0.75, y - r * 0.64); ctx.stroke(); });
    ctx.globalAlpha = 1; }
  // l'anneau, devant (la moitié du bas) ; le bout de laine qui pend, avec sa boucle
  if (ring > 0 && z < 0.5) { ctx.lineWidth = 1.6; const pt = laine(ctx, x, y, r, 0, Math.PI, ring, now);
    if (ring >= 1) { const e = pt(0.35, 0), sw = Math.sin(now * 1.3) * r * 0.08; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.bezierCurveTo(e[0] + r * 0.1, e[1] + r * 0.25, e[0] - r * 0.12 + sw, e[1] + r * 0.35, e[0] + r * 0.05 + sw, e[1] + r * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(e[0] + r * 0.09 + sw, e[1] + r * 0.53, r * 0.04, Math.PI, Math.PI * 2.6); ctx.stroke(); } }
  if (lune > 0 && z < 0.3 && devantL) poisson(ctx, lp[0], lp[1], r * 0.16 * lune, Math.cos(la) < 0 ? 1 : -1, now);
  // (vague 20 de l'audit : « la planète chat ») : un tout petit chat de papier y habite : il se promène sur le haut de la tête, escalade
  // les oreilles, s'assoit entre elles un moment pour regarder l'espace, puis repart dans l'autre sens
  if (t >= 1 && z < 0.2) { const Tt = 26, u = (now % Tt) / Tt, tri = u < 0.5 ? u * 2 : 2 - u * 2, pause = Math.abs(tri - 0.5) < 0.08, th = -Math.PI / 2 + (sm(Math.min(1, Math.max(0, (tri - 0.08) / 0.84))) - 0.5) * 2.3, dir = u < 0.5 ? 1 : -1;
    let k = 1; [-1, 1].forEach(sd => { const c = -Math.PI / 2 + sd * 0.62, d = Math.atan2(Math.sin(th - c), Math.cos(th - c)); if (Math.abs(d) < 0.27) k += 0.46 * ear * Math.pow(1 - Math.abs(d) / 0.27, 1.25); });
    const px = x + Math.cos(th) * r * k, py = y + Math.sin(th) * r * k * 0.97, s = r * 0.13, pas = pause ? 0 : Math.sin(now * 14) * 0.25;
    ctx.save(); ctx.translate(px, py); ctx.rotate(th + Math.PI / 2); ctx.scale(dir, 1);
    const corps = () => { ctx.beginPath(); if (pause) { ctx.ellipse(0, -s * 0.75, s * 0.55, s * 0.75, 0, 0, TAU); } else { ctx.ellipse(0, -s * 0.55, s * 0.9, s * 0.45, 0, 0, TAU); }
      const hx = pause ? 0 : s * 0.85, hy = pause ? -s * 1.65 : -s * 0.95; ctx.moveTo(hx + s * 0.45, hy); ctx.arc(hx, hy, s * 0.45, 0, TAU); ctx.moveTo(hx - s * 0.4, hy - s * 0.2); ctx.lineTo(hx - s * 0.3, hy - s * 0.7); ctx.lineTo(hx - s * 0.05, hy - s * 0.4); ctx.moveTo(hx + s * 0.4, hy - s * 0.2); ctx.lineTo(hx + s * 0.3, hy - s * 0.7); ctx.lineTo(hx + s * 0.05, hy - s * 0.4); };
    ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 3.4; corps(); ctx.stroke(); ctx.fillStyle = 'rgb(250,248,242)'; corps(); ctx.fill(); ctx.strokeStyle = 'rgb(34,36,40)'; ctx.lineWidth = 1.2; corps(); ctx.stroke();
    // la queue, les pattes qui trottent ; assis : la queue autour des pattes
    ctx.beginPath(); if (pause) { ctx.moveTo(s * 0.4, -s * 0.2); ctx.quadraticCurveTo(s * 1.1, -s * 0.1, s * 0.8, -s * 0.9 + Math.sin(now * 3) * s * 0.2); } else { ctx.moveTo(-s * 0.85, -s * 0.6); ctx.quadraticCurveTo(-s * 1.4, -s * 1.3, -s * 1.2 + Math.sin(now * 4) * s * 0.2, -s * 1.6);
      [-0.5, 0.5].forEach((o, i) => { ctx.moveTo(o * s, -s * 0.2); ctx.lineTo(o * s + (i ? pas : -pas) * s, s * 0.05); }); } ctx.stroke(); ctx.restore(); }
  // ce qui pousse dessus quand on la survole
  if (P.pousse > 0 && z < 0.3) constructions(ctx, x, y, r, now);
  // le texte qui tourne autour
  ctx.restore();
}
// la lune : un petit poisson qui nage en rond autour de la planète
function poisson(ctx, x, y, k, d, now) {
  ctx.save(); ctx.translate(x, y); ctx.scale(d, 1); ctx.rotate(Math.sin(now * 3) * 0.08); ctx.lineWidth = 1.6; ctx.fillStyle = '#07080C';
  ctx.beginPath(); ctx.moveTo(k * 1.1, 0); ctx.quadraticCurveTo(k * 0.2, -k * 0.75, -k * 0.7, 0); ctx.quadraticCurveTo(k * 0.2, k * 0.75, k * 1.1, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-k * 0.6, 0); ctx.lineTo(-k * 1.2, -k * 0.45); ctx.lineTo(-k * 1.1, 0); ctx.lineTo(-k * 1.2, k * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgb(${BL})`; ctx.beginPath(); ctx.arc(k * 0.6, -k * 0.12, k * 0.1, 0, TAU); ctx.fill(); ctx.restore();
}
function papier() { try { const v = getComputedStyle(document.documentElement).getPropertyValue('--bp').trim(); if (v[0] === '#' && v.length === 7 && v !== '#07080C') return [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16)); } catch (e) {} return [218, 219, 216]; }
const lerpC = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',');
// des choses qui poussent à sa surface, chacune son tour : un arbre à chat, un carton, une maison, un drapeau-poisson, une pelote, une gamelle
function constructions(ctx, x, y, r, now) {
  const L = [[-2.2, 'arbre'], [-1.6, 'maison'], [-0.95, 'drapeau'], [-2.75, 'carton'], [-0.45, 'pelote'], [0.15, 'gamelle'], [-3.3, 'fusee']];
  ctx.lineWidth = 2; ctx.strokeStyle = `rgb(${BL})`;
  L.forEach(([a, k], i) => {
    const g = sm((P.pousse - i * 0.1) / 0.35); if (g <= 0) return;
    ctx.save(); ctx.translate(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.rotate(a + Math.PI / 2); ctx.scale(g, g); const u = r * 0.22;
    ctx.beginPath();
    if (k === 'arbre') { ctx.moveTo(0, 0); ctx.lineTo(0, -u * 2.2); ctx.moveTo(-u * 0.7, -u * 1.1); ctx.lineTo(u * 0.7, -u * 1.1); ctx.moveTo(-u * 0.5, -u * 2.2); ctx.lineTo(u * 0.5, -u * 2.2); }
    else if (k === 'maison') { ctx.rect(-u * 0.6, -u, u * 1.2, u); ctx.moveTo(-u * 0.8, -u); ctx.lineTo(0, -u * 1.7); ctx.lineTo(u * 0.8, -u); ctx.moveTo(-u * 0.15, 0); ctx.arc(0, -u * 0.35, u * 0.15, Math.PI, 0); ctx.lineTo(u * 0.15, 0); }
    else if (k === 'drapeau') { ctx.moveTo(0, 0); ctx.lineTo(0, -u * 2); const f = Math.sin(now * 6) * u * 0.1; ctx.moveTo(0, -u * 2); ctx.lineTo(u * 0.9, -u * 1.75 + f); ctx.lineTo(u * 1.1, -u * 1.95); ctx.lineTo(u * 1.1, -u * 1.45); ctx.lineTo(u * 0.9, -u * 1.65 + f); ctx.lineTo(0, -u * 1.4); }
    else if (k === 'carton') { ctx.rect(-u * 0.6, -u * 0.9, u * 1.2, u * 0.9); ctx.moveTo(-u * 0.6, -u * 0.9); ctx.lineTo(-u, -u * 1.25); ctx.moveTo(u * 0.6, -u * 0.9); ctx.lineTo(u, -u * 1.25); }
    else if (k === 'pelote') { ctx.arc(0, -u * 0.45, u * 0.45, 0, TAU); ctx.moveTo(-u * 0.3, -u * 0.7); ctx.quadraticCurveTo(0, -u * 0.3, u * 0.3, -u * 0.75); ctx.moveTo(u * 0.4, -u * 0.2); ctx.quadraticCurveTo(u, 0, u * 1.3, -u * 0.3); }
    else if (k === 'gamelle') { ctx.moveTo(-u * 0.6, -u * 0.35); ctx.lineTo(-u * 0.45, 0); ctx.lineTo(u * 0.45, 0); ctx.lineTo(u * 0.6, -u * 0.35); ctx.closePath(); }
    else if (k === 'fusee') { ctx.moveTo(0, -u * 2); ctx.quadraticCurveTo(u * 0.5, -u * 1.3, u * 0.35, -u * 0.3); ctx.lineTo(-u * 0.35, -u * 0.3); ctx.quadraticCurveTo(-u * 0.5, -u * 1.3, 0, -u * 2); ctx.moveTo(-u * 0.35, -u * 0.5); ctx.lineTo(-u * 0.6, 0); ctx.moveTo(u * 0.35, -u * 0.5); ctx.lineTo(u * 0.6, 0); }
    ctx.stroke(); ctx.restore();
  });
}
X.fond.unshift((ctx, now) => { if (!P) return; terre(ctx, now); if (trace(0.8, 0.1) > 0 && !(P.aspire && P.aspire.zoom > 0)) planete(ctx, now); });
// (le zoom final passe devant tout : la planète grossit jusqu'à remplir l'écran)
X.devant.push((ctx, now) => { if (P && P.aspire && P.aspire.zoom > 0) planete(ctx, now); });

/* (vague 102 de l'audit, « le retour par la planète chat » vers 9,9) : on revient avec un peu d'espace sur soi. Dans la pièce,
   de la poussière d'étoiles tombe encore du plafond un moment, en tournoyant ; les chats lèvent la tête, en attrapent au vol d'un coup
   de patte (l'étoile rebondit et éclate en étincelles) ; celles qui touchent le sol s'y éteignent en rapetissant. */
const POUS = { attend: false, L: [] };
X.retour.push(() => { if (!POUS.attend) return; POUS.attend = false; if (reduit) return; const W = innerWidth, n = W < 600 ? 22 : 40;
  POUS.L = Array.from({ length: n }, (_, i) => ({ x: rnd(0.04, 0.96) * W, y: (Wd.ceil || innerHeight * 0.3) - rnd(0, 90), t0: Wd.t + 0.4 + i * rnd(0.1, 0.22), d: rnd(0, 0.7), v: rnd(50, 95), ph: rnd(0, 6), r: rnd(6, 11) * (W < 600 ? 0.8 : 1), col: pick(['241,196,15', '243,156,18', '52,152,219', '155,89,182', '255,255,255']) }));
  POUS.tc = Wd.t + 1.5; });
function etoile4(ctx, x, y, r, rot, col, ink) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = `rgba(${col},0.16)`; ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, TAU); ctx.fill(); ctx.rotate(rot); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, q = i % 2 ? r * 0.32 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath();
  ctx.fillStyle = `rgb(${col})`; ctx.fill(); ctx.strokeStyle = `rgb(${ink})`; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
K.H.draw.push(() => {
  const L = POUS.L, ctx = window.Chalk && Chalk.ctx; if (!L.length || !ctx || Wd.espace || Wd.trou || Wd.a < 0.05) return; const now = Wd.t, dt = Math.min(0.05, now - (POUS.tl ?? now)); POUS.tl = now;
  const ink = (window.THEME && THEME.ink) || Chalk.INK || '40,40,48';
  // de temps en temps, un chat libre repère une étoile qui descend près de lui et l'attrape d'un coup de patte
  if (now > POUS.tc) { POUS.tc = now + rnd(0.8, 1.6); const Ls = L.filter(s => !s.pris && !s.sol && now > s.t0 && s.y > (Wd.ceil || 0) + 40);
    for (const c of Wd.cats) { if (c.gone || c.temp || !K.free4(c) || c.fall || c.hidden) continue; const s = K.sc(c), e = Ls.find(e => Math.abs(e.x - c.x) < s * 1.6 && e.y > c.y - s * 2.2 && e.y < c.y);
      if (!e) continue; e.vise = c; K.interrupt(c); const f = sgn(e.x - c.x); c.face = f;
      c.q = [K.pose('affut', 0.35, { face: f }), K.hop(() => K.groundAt(c.x, c.d), { h: Math.max(s * 0.4, c.y - e.y - s * 0.6), dur: 0.5 }), K.pose('assis', 0.8, { face: f })];
      K.later(0.45, () => { if (e.sol || e.pris) return; e.pris = now + 0.45; e.vx = f * rnd(60, 140); e.vy = -rnd(180, 260); say(c, pick(en() ? ['got it!', '✨!', 'mine!'] : ['attrapée !', '✨ !', 'à moi !'])); if (window.Dex && Dex.vu) Dex.vu('poussiere'); });
      break; } }
  for (let i = L.length - 1; i >= 0; i--) { const e = L[i]; if (now < e.t0) continue; const u = now - e.t0;
    if (e.pris) { const k = (now - e.pris) / 0.5; e.vy += 500 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
      if (k > 1) { for (let j = 0; j < 5; j++) Wd.fx.push({ k: 'etoile', x: e.x, y: e.y, vx: rnd(-120, 120), vy: -rnd(40, 200), g: 200, t0: now, life: 0.7, col: e.col, r: rnd(1.5, 2.5), tw: true }); L.splice(i, 1); continue; } }
    else if (!e.sol) { e.y += e.v * dt; const x = e.x + Math.sin(u * 1.7 + e.ph) * 14, sol = K.floorAt(e.d); if (e.y >= sol) { e.sol = now; e.y = sol; } e.dx = x; }
    const x = e.pris ? e.x : e.dx ?? e.x, r = e.sol ? e.r * Math.max(0, 1 - (now - e.sol) / 1.6) : e.r * (0.8 + 0.25 * Math.sin(now * 7 + e.ph));
    if (e.sol && r <= 0.05) { L.splice(i, 1); continue; }
    if (e.pris) e.x = x;
    if (!e.sol && !e.pris) { ctx.fillStyle = `rgba(${e.col},0.5)`; for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.arc(x - Math.cos(u * 1.7 + e.ph) * 4 * j, e.y - e.r * 1.6 * j, e.r * 0.22 * (4 - j) / 3, 0, TAU); ctx.fill(); } }
    etoile4(ctx, x, e.y, r, u * 1.5 + e.ph, e.col, ink); }
});
return { get P() { return P; }, naissance, lance, POUS };
})();
