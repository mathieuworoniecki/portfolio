/* Dans l'espace (l'écran 2) : à la fin du texte qui défile, deux planètes se dessinent, au stylo.
   - La Terre, en bas : une tranche, toute la largeur de l'écran, comme une atmosphère toute proche ; ses continents tournent doucement.
     C'est l'écran suivant (plus tard) ; pour l'instant, elle est solide : chats, dessins et lettres rebondissent dessus.
   - La planète des chats, plus loin : une tête de chat ronde (oreilles, moustaches, yeux qui suivent le curseur), un anneau de laine.
     Survolée : un texte tourne autour d'elle et des choses poussent dessus (un arbre à chat, un carton, une maison, un drapeau-poisson…) ;
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
  const W = O.W, H = O.H, bas = O.BAS(), h = clamp(H * 0.13, 60, 130), R = Math.max(W * 1.15, (W * W / 4) / (2 * h) + h / 2);   // (sur un téléphone : une tranche, pas une boule)
  const r = clamp(Math.min(W, H) * 0.09, 38, 90), large = W >= 760;
  return { terre: { cx: W / 2, cy: bas - h + R + 18, R, top: bas - h + 18 }, chat: { x: large ? W * 0.76 : W * 0.66, y: large ? H * 0.3 : H * 0.28, r } };
}
function naissance() { if (P) return; P = Object.assign(place(), { t0: Wd.t, survol: 0, pousse: 0, aspire: null, seed: Math.random() * 99 }); }
X.entre.push(() => { P = null; if (reduit) naissance(); });
X.retour.push(() => { P = null; });
if (window.EspaceTexte) EspaceTexte.onFini = () => { naissance(); };
const trace = (dl, d) => P ? c01((Wd.t - P.t0 - dl) / d) : 0;

/* ——— la physique : la Terre est solide, la planète des chats attire ——— */
X.pas.push((dt, cats) => {
  if (!P) return;
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
  // la planète des chats : une petite gravité autour d'elle ; tout près, on rebondit dessus
  cats.forEach(c => { const S = c.sp; if (!S || c.held || S.m === 'aspire' || S.m === 'planete' || X.mode[S.m]) return; const [x, y] = centreDe(c), dx = Cp.x - x, dy = Cp.y - y, d = Math.hypot(dx, dy) || 1, r = rayon(c);
    if (d < Cp.r * 3.2) { const g = 900 * Cp.r * Cp.r / (d * d) * dt; S.vx += dx / d * Math.min(g, 60 * dt * 10); S.vy += dy / d * Math.min(g, 60 * dt * 10); }
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

/* ——— posé sur la planète, comme le Petit Prince : il se promène un peu à sa surface, puis repart ——— */
function pose(c, ang) { const S = c.sp;
  // (pas deux chats au même endroit de la planète : il se pose à côté de ceux qui y sont déjà)
  const gap = rayon(c) * 1.3 / P.chat.r, autres = Wd.cats.filter(o => o !== c && o.sp && o.sp.m === 'planete').map(o => o.sp.ang), loin = a => autres.every(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) > gap);
  if (!loin(ang)) { const k = [1, -1, 2, -2, 3, -3, 4, -4].map(i => ang + i * gap).find(loin); if (k == null) { S.vx = Math.cos(ang) * 120; S.vy = Math.sin(ang) * 120; return; } ang = k; } Object.assign(S, { m: 'planete', ang, fin: Wd.t + rnd(6, 14), anim: pick(['assis', 'pain', 'toilette', 'debout', 'dodo'].filter(a => ANIMS[a])), vx: 0, vy: 0, marche: Math.random() < 0.4 ? sgn(rnd(-1, 1)) * rnd(0.15, 0.3) : 0 }); if (Math.random() < 0.6) say(c, pick(['chez moi', 'ma planète', 'on est bien', '♥'])); }
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
  if ((tous || Wd.t - A.t0 > 4.5) && !A.fait) { A.fait = true; const Cp = P.chat; O.sortie({ x: Cp.x, y: Cp.y, dessine: (ctx, z, now) => { A.zoom = Math.max(0.001, z); } }); }
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
  ctx.restore();
}
// la planète des chats : une tête de chat ronde, qui nous regarde
function planete(ctx, now) {
  const Cp = P.chat, t = trace(0.8, 1.5), A = P.aspire, z = A ? A.zoom : 0, pur = 1 + P.survol * 0.025 * Math.sin(now * 32);
  const r = Cp.r * pur * (1 + z * (Math.hypot(O.W, O.H) * 1.3 / Cp.r)), x = Cp.x + (O.W / 2 - Cp.x) * z * 0.6, y = Cp.y + (O.H / 2 - Cp.y) * z * 0.6;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = `rgb(${BL})`;
  // l'anneau de laine, derrière (la moitié du haut)
  const ring = trace(2.1, 0.8);
  if (ring > 0 && z < 0.5) { ctx.lineWidth = 2; ctx.globalAlpha = ring; ctx.beginPath(); ctx.ellipse(x, y, r * 1.75, r * 0.38, -0.25, Math.PI, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  // le disque (noir : il cache l'anneau et les étoiles derrière), son contour qui se trace, les oreilles
  if (z > 0) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
    const col = `rgb(${lerpC(BL.split(',').map(Number), O.rgb((window.THEME && THEME.ink) || '34,36,40'), sm(z / 0.45))})`; ctx.strokeStyle = col; ctx.fillStyle = col; }
  else { ctx.fillStyle = '#07080C'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  ctx.lineWidth = 3; arc(ctx, x, y, r, -Math.PI / 2, t);
  const ear = trace(1.7, 0.4);
  if (ear > 0) [-1, 1].forEach(s => { const a = -Math.PI / 2 + s * 0.62, b = -Math.PI / 2 + s * 0.2, tip = -Math.PI / 2 + s * 0.45;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(tip) * r * (1 + 0.42 * ear), y + Math.sin(tip) * r * (1 + 0.42 * ear)); ctx.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r); ctx.stroke(); });
  // le visage : des yeux comme ceux des chats d'ici (blancs, un reflet noir), qui suivent le curseur ; le nez, la bouche en w, les moustaches
  const vis = trace(2.0, 0.6);
  if (vis > 0 && z < 0.6) { ctx.globalAlpha = vis;
    const Q = Wd.ptr, lx = Q && Q.on ? clamp((Q.x - x) / O.W * 4, -1, 1) : Math.sin(now * 0.5) * 0.4, ly = Q && Q.on ? clamp((Q.y - y) / O.H * 4, -1, 1) : 0;
    const cl = (now % 4.2) < 0.13 || (P.survol > 0.5 && P.pousse > 0.9);
    [-1, 1].forEach(s => { const ex = x + s * r * 0.34 + lx * r * 0.06, ey = y - r * 0.05 + ly * r * 0.05;
      if (cl) { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ex, ey + r * 0.03, r * 0.1, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else { ctx.fillStyle = `rgb(${BL})`; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.1, r * 0.13, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#07080C'; ctx.beginPath(); ctx.arc(ex - r * 0.03, ey - r * 0.04, r * 0.035, 0, TAU); ctx.fill(); } });
    ctx.lineWidth = 2.2; const ny = y + r * 0.14;
    ctx.beginPath(); ctx.moveTo(x - r * 0.05, ny); ctx.lineTo(x + r * 0.05, ny); ctx.lineTo(x, ny + r * 0.05); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * 0.07, ny + r * 0.07, r * 0.07, 0.1, Math.PI - 0.3); ctx.arc(x + r * 0.07, ny + r * 0.07, r * 0.07, 0.3, Math.PI - 0.1); ctx.stroke();
    ctx.lineWidth = 1.6; [-1, 1].forEach(s => [-0.1, 0, 0.1].forEach(k => { ctx.beginPath(); ctx.moveTo(x + s * r * 0.3, ny + r * (0.04 + k * 0.5)); ctx.lineTo(x + s * r * (1.05 + P.survol * 0.1), ny + r * (k * 1.6 - 0.02)); ctx.stroke(); }));
    // les rayures sur le front
    ctx.lineWidth = 2; [-0.12, 0, 0.12].forEach(k => { ctx.beginPath(); ctx.moveTo(x + k * r, y - r * 0.92); ctx.lineTo(x + k * r * 0.8, y - r * 0.68); ctx.stroke(); });
    ctx.globalAlpha = 1; }
  // l'anneau, devant (la moitié du bas)
  if (ring > 0 && z < 0.5) { ctx.lineWidth = 2; ctx.globalAlpha = ring; ctx.beginPath(); ctx.ellipse(x, y, r * 1.75, r * 0.38, -0.25, 0, Math.PI * ring); ctx.stroke(); ctx.globalAlpha = 1; }
  // ce qui pousse dessus quand on la survole
  if (P.pousse > 0 && z < 0.3) constructions(ctx, x, y, r, now);
  // le texte qui tourne autour
  if (P.survol > 0.02 && z < 0.3) couronne(ctx, x, y, r, now);
  ctx.restore();
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
// le texte qui tourne autour d'elle
function couronne(ctx, x, y, r, now) {
  const txt = (en() ? 'CAT PLANET · CLICK TO GO HOME · ' : 'PLANÈTE DES CHATS · CLIQUE POUR RENTRER · ').repeat(1), R = r * 1.55 + 10, n = txt.length, step = TAU / n;
  ctx.save(); ctx.globalAlpha = P.survol; ctx.fillStyle = `rgb(${BL})`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${clamp(r * 0.2, 10, 15)}px ${getComputedStyle(document.documentElement).getPropertyValue('--display').trim() || 'sans-serif'}`;
  for (let i = 0; i < n; i++) { const a = -now * 0.35 + i * step, lift = Math.sin(now * 3 + i * 0.5) * 2 * P.survol; ctx.save(); ctx.translate(x + Math.cos(a) * (R + lift), y + Math.sin(a) * (R + lift)); ctx.rotate(a + Math.PI / 2); ctx.fillText(txt[i], 0, 0); ctx.restore(); }
  ctx.restore();
}
X.fond.unshift((ctx, now) => { if (!P) return; terre(ctx, now); if (trace(0.8, 0.1) > 0 && !(P.aspire && P.aspire.zoom > 0)) planete(ctx, now); });
// (le zoom final passe devant tout : la planète grossit jusqu'à remplir l'écran)
X.devant.push((ctx, now) => { if (P && P.aspire && P.aspire.zoom > 0) planete(ctx, now); });

return { get P() { return P; }, naissance, lance };
})();
