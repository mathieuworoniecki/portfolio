/* Les raretés : des chats qu'on ne voit presque jamais. Ils arrivent au hasard (toutes les une à deux minutes environ),
   ou parfois au clic (un clic sur quinze, sur le sol vide), font leur numéro, puis repartent.
   - le géant : haut comme l'écran, il roule en boule d'un bord à l'autre ; il écrase les chats (tout plats, puis ils se secouent),
     envoie valser les petits objets et aplatit les gros (qui reprennent leur forme d'un coup)
   - l'interminable : un chat si long qu'il ne finit jamais d'entrer ; il se couche en travers et bloque le passage,
     les autres lui sautent par-dessus ; puis il repart, et n'en finit pas de sortir
   - le ballon : un chat tout gonflé qui flotte au-dessus de la scène, au bout de son fil ; en dessous, on essaie de l'attraper
   - l'éclair : il traverse l'écran si vite que les autres tournent sur eux-mêmes… et il repasse dans l'autre sens
   - le totem : quatre chatons empilés qui marchent ensemble ; au milieu, la pile vacille… et s'écroule
   - l'acrobate : il descend du plafond au bout d'un fil, se balance, fait coucou, et remonte
   Branché sur js/chats.js par ses crochets (Chats.K.H) ; les types sont dans js/chat.js (TYPES, rare: 1). */
window.Rares = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, ANIMS, STEPS, I, rnd, pick, clamp, sgn, sm, later, sc, sOf, floorAt, say, dust, interrupt, free4, go, pose, hop, fn, groundAt, residents, addCat, kick, LOURD, catAt, propAt } = K;
const word = (text, x, y, size, rot) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.4, rot: rot ?? rnd(-0.15, 0.15), size: size || 20 });
const R = { on: [], next: 0, last: null };
const alive = c => Wd.cats.includes(c) && !c.gone;
// un visiteur : un chat de passage (temp), qu'on ne peut pas attraper (c.rare), à sa taille (c.b.s : la sienne, pas celle de son type)
function spawn(id, o, px) {
  const c = addCat(Object.assign({ id, temp: true }, o)); c.rare = id; c.b = Object.assign({}, c.b); c.stay = 999; c.q = [];
  if (px) c.b.s = px / sOf(c.d);
  return c;
}
const watchers = (x, n) => residents().filter(c => free4(c) && !c.rare && !c.perch).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x)).slice(0, n);

/* ——— écrasé : le corps tout plat, les pattes en étoile, la tête aplatie au sol ; il reprend sa forme d'un coup ——— */
ANIMS.ecrase = (c, p, t) => {
  Chat.rest(c, p); const k = sm(t / 0.08) * (1 - sm((t - 1.1) / 0.25));
  p[I.sqz] = -0.75 * k; p[I.stretch] = 0.4 * k; p[I.y] *= 1 - 0.65 * k; p[I.hy] = -c.D.h * 0.9 * k; p[I.hnod] = 0.2 * k;
  p[I.fl] = 1.5 * k; p[I.fr] = 1.3 * k; p[I.hl] = -1.4 * k; p[I.hr] = -1.2 * k; p[I.fk] = p[I.fk2] = p[I.hk] = 1 - 0.5 * k;
  p[I.eyes] = 1; p[I.mouth] = k > 0.5 ? 1 : 0; p[I.tailUp] = -0.3; p[I.tailSide] = 0; p[I.tailWave] = 0;
};
function squash(o, dir) {
  if (Wd.t - (o.squashT ?? -9) < 2.5 || o.held || o.gone || o.hidden) return; o.squashT = Wd.t;   // caché (carton, coussin) : le géant passe dessus sans le voir
  if (o.perch || o.jump || o.fall || (o.task && o.task.air)) { interrupt(o);   // (en l'air ou pendu : projeté, pas aplati en plein vol)
    o.accr = null; o.hidden = 0; o.fall = true; o.vx = dir * sc(o) * rnd(3, 5); o.vy = -sc(o) * rnd(3, 5); say(o, pick(['waaah !', 'miaaa !'])); return; }
  interrupt(o); o.fall = false; o.pet = null;
  o.q = [pose('ecrase', 1.35, { fx: o => word(pick(['splotch', 'plof', 'crouiik']), o.x, o.y - sc(o) * 0.4, 18) }), pose('secoue', 0.55), pose(pick(['boude', 'assis', 'etourdi']), rnd(1.5, 2.5), { fx: o => say(o, pick(['…', 'aïe', 'pfff', '@_@'])) })];
}
// un visiteur énorme arrive (Mathieu, 27/09) : les chats de passage (ceux qu'on a fait tomber du ciel) détalent hors de l'écran,
// les résidents filent à l'autre bout ou restent bouche bée
function panique(x) {
  Wd.cats.forEach(o => {
    if (o.rare || o.held || o.hidden || o.gone || o.fight || o.fall) return; const away = sgn(o.x - x) || (Math.random() < 0.5 ? -1 : 1);
    const P = o.perch; interrupt(o); o.pet = null; const cri = o => say(o, pick(['!!', 'AAAH', 'miaaa !', 'sauve qui peut !', 'au secours !']));
    // (perché : il saute d'abord ; interrupt efface le perchoir, on le garde le temps de sauter)
    if (P) o.perch = P;
    const saut = P ? [hop(() => groundAt(K.inView(o.x + away * sc(o) * 1.2), Math.max(0, P.it.d - 0.2)), { h: sc(o) * 0.6, zr: [0.1, 0.5] })] : [];
    if (o.temp) o.q = [pose('sursaut', 0.45, { fx: cri }), ...saut, go(away < 0 ? -sc(o) * 1.5 : Wd.W + sc(o) * 1.5, { g: 'galop', v: rnd(1.1, 1.4) }), fn(o => { o.gone = true; })];
    else if (Math.random() < 0.65) o.q = [pose('sursaut', 0.45, { fx: cri }), ...saut, go(K.inView(away < 0 ? rnd(0.02, 0.12) * Wd.W : rnd(0.88, 0.98) * Wd.W), { g: 'galop' }), pose('affut', rnd(1.5, 3), { face: -away }), pose('toilette', 2)];
    else o.q = [...saut, pose('affut', rnd(2, 3.5), { face: -away, fx: o => say(o, pick(['waouh…', 'oh…', 'énorme…', '!!!'])) }), pose('assis', 1)];
    o.task = null;
  });
}
// les gros objets : aplatis puis, boing, leur forme revient (it.sq : voir Univers.place)
H.pre.push(() => {
  Wd.props.forEach(it => { if (it.sqT == null) return; const e = Wd.t - it.sqT;
    it.sq = e < 0.1 ? e / 0.1 : e < 1.3 ? 1 : e < 1.9 ? (1 - (e - 1.3) / 0.6) * Math.cos((e - 1.3) * 18) : 0;
    if (e >= 1.9) { it.sq = 0; it.sqT = null; } });
});

/* ——— le géant ——— */
ANIMS.rouleau = (c, p, t) => {
  Chat.rest(c, p); p[I.y] = 0; p[I.hx] = -c.D.h * 0.25; p[I.hy] = -c.D.h * 0.45; p[I.fk] = p[I.fk2] = p[I.hk] = 0.15; p[I.fl] = p[I.fr] = 0.9; p[I.hl] = p[I.hr] = -0.7;
  p[I.eyes] = 2; p[I.look] = 1; p[I.mouth] = 0; p[I.tailSide] = 2.2; p[I.tailCurl] = 1.6; p[I.tailUp] = 0; p[I.tailWave] = 0.1;
};
function geant(x) {
  const dir = x == null ? (Math.random() < 0.5 ? 1 : -1) : x < Wd.W / 2 ? 1 : -1;
  const c = spawn('geant', { d: 0.02, face: dir }, Math.min(Wd.H * 1.25, Wd.W * 1.3)); c.zo = 3000;
  const Rb = sc(c) * 0.36; c.x = dir > 0 ? -Rb * 2.2 : Wd.W + Rb * 2.2;
  c.q = [{ k: 'rouleau', dir, Rb, air: true }, fn(c => { c.gone = true; oeil(dir); })];
  later(0.4, () => panique(dir > 0 ? 0 : Wd.W));
  return c;
}
/* (vague 98 de l'audit, « le chat géant », pour l'inoubliable) : il ne disparaît pas, il habite dehors. Parti de la pièce, il fait le tour
   de la maison : son œil, énorme, vient se coller à la fenêtre, du côté où il est sorti. L'œil suit la souris, cligne ; les chats de la pièce
   lèvent la tête vers lui (« !! ») ; un clic sur la fenêtre, et il cligne, la vitre tremble (un petit « miaou » étouffé) ; puis il se retire
   en glissant. Il revient parfois de lui-même, plus tard : on sait maintenant qu'il est là, dehors. */
const OE = { t0: -99, dur: 0, dir: 1, cl: -99, clic: -99, suivant: Infinity };
function oeil(dir) {
  if (Wd.espace || Wd.trou || Wd.fuite) return; const f = window.Piece && Piece.fen && Piece.fen() || { x: (dir || 1) > 0 ? Wd.W * 0.85 : Wd.W * 0.15, y: Wd.H * 0.4, w: 1, h: 1 };
  Object.assign(OE, { t0: Wd.t + 1.2, dur: 7.5, dir: dir || 1, cl: Wd.t + 4, suivant: Wd.t + rnd(70, 140) });
  later(1.9, () => { watchers(f.x + f.w / 2, 3).forEach((c, i) => later(i * 0.25, () => { if (alive(c)) { c.face = sgn(f.x + f.w / 2 - c.x) || 1; say(c, pick(['!!', 'il est là', 'le géant !', '…'])); } })); if (window.Dex && Dex.vu) Dex.vu('oeil-geant'); });
}
H.click.push((x, y) => { const u = Wd.t - OE.t0; if (u < 0.6 || u > OE.dur - 0.6) return false; const f = window.Piece && Piece.fen && Piece.fen(), B = OE.b;
  const dans = f ? x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h : B && Math.hypot(x - B.x, y - B.y) < B.r; if (!dans) return false;
  OE.clic = Wd.t; OE.cl = Wd.t; Wd.shake = { t0: Wd.t, a: f ? 5 : 9 }; word(pick(['miaou…', 'mrrr', 'miaou ?']), f ? f.x + f.w / 2 : B.x - OE.dir * B.r * 0.3, f ? f.y - 10 : B.y - B.r * 0.9, f ? 18 : 30); return true; });
H.draw.push(() => {
  if (Wd.t > OE.suivant && Wd.t - OE.t0 > OE.dur) oeil(pick([1, -1]));
  const u = Wd.t - OE.t0; if (u < 0 || u > OE.dur || Wd.a < 0.5) { OE.b = null; return; } const f = window.Piece && Piece.fen && Piece.fen();
  const ctx = window.Chalk && Chalk.ctx; if (!ctx) return;
  const ink = (window.THEME && THEME.ink) || (window.Chalk && Chalk.INK) || '34,36,40';
  if (!f) { tete(ctx, ink, u); return; }   // (pas de fenêtre, sur les écrans larges et bas : il passe la tête par le bord de l'écran)
  // il arrive en glissant du côté où il est sorti, et repart de même (aucun fondu)
  const e = sm(u / 0.9) * (1 - sm((u - OE.dur + 0.9) / 0.9)), off = (1 - e) * f.w * 1.1 * -OE.dir;
  const P = Wd.ptr, ix = f.x + 4, iy = f.y + 4, iw = f.w - 8, ih = f.h - 8, cx = ix + iw * 0.5 + off, cy = iy + ih * 0.55;
  const vx = P && P.on ? clamp((P.x - cx) / Wd.W, -0.5, 0.5) : 0, vy = P && P.on ? clamp((P.y - cy) / Wd.H, -0.5, 0.5) : 0;
  const cl = Wd.t - OE.cl, bl = cl >= 0 && cl < 0.22 ? 1 - Math.abs(cl / 0.11 - 1) : 0;   // le clignement
  if (cl > 0.3 && Math.random() < 0.004) OE.cl = Wd.t;
  ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip(); ctx.lineCap = ctx.lineJoin = 'round';
  // le papier du dedans de la vitre : le ciel s'efface derrière la tête qui bouche tout
  ctx.fillStyle = (getComputedStyle(document.documentElement).getPropertyValue('--bp').trim() || '#DADBD8'); ctx.globalAlpha = e; ctx.fillRect(ix, iy, iw, ih); ctx.globalAlpha = 1;
  ctx.strokeStyle = `rgb(${ink})`; ctx.fillStyle = `rgb(${ink})`;
  // la tête, trop grande pour la fenêtre : on n'en voit que le bord (la courbe de la joue, une oreille qui dépasse en haut), des moustaches
  const R = ih * 1.35; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(cx + OE.dir * iw * 0.1, cy + R * 0.62, R, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - iw * 0.62, iy + ih * 0.12); ctx.lineTo(cx - iw * 0.48, iy - ih * 0.2); ctx.lineTo(cx - iw * 0.3, iy + ih * 0.06); ctx.stroke();
  // l'œil : un grand ovale noir, deux reflets blancs ; il suit la souris
  const ex = cx + vx * iw * 0.2, ey = cy + vy * ih * 0.14, rx = iw * 0.2, ry = ih * 0.3 * (1 - bl * 0.94);
  ctx.beginPath(); ctx.ellipse(ex, ey, rx, Math.max(1.5, ry), 0, 0, Math.PI * 2); ctx.fill();
  if (bl < 0.6) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex - rx * 0.32 + vx * rx * 0.4, ey - ry * 0.36 + vy * ry * 0.3, rx * 0.26, ry * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + rx * 0.3 + vx * rx * 0.3, ey + ry * 0.3, rx * 0.1, 0, Math.PI * 2); ctx.fill(); }
  ctx.lineWidth = 1.6; ctx.globalAlpha = 0.8; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + OE.dir * iw * 0.35, cy + ih * 0.3 + i * 7); ctx.lineTo(cx + OE.dir * iw * 0.9, cy + ih * 0.26 + i * 12); ctx.stroke(); }
  // la buée de son souffle sur la vitre, qui grandit et rapetisse
  const bu = 0.5 + 0.5 * Math.sin(Wd.t * 1.6); ctx.globalAlpha = 0.18 * e; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx + OE.dir * iw * 0.3, cy + ih * 0.32, iw * (0.12 + bu * 0.08), ih * (0.07 + bu * 0.04), 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // la croisée et le cadre, par-dessus : il est bien derrière la vitre (au clic, la vitre tremble)
  const tr = Wd.t - OE.clic < 0.35 ? Math.sin((Wd.t - OE.clic) * 60) * 2 * (1 - (Wd.t - OE.clic) / 0.35) : 0;
  ctx.save(); ctx.strokeStyle = `rgb(${ink})`; ctx.globalAlpha = 0.75; ctx.lineWidth = 1.6; ctx.translate(tr, 0); ctx.beginPath();
  ctx.moveTo(f.x + f.w / 2, iy); ctx.lineTo(f.x + f.w / 2, iy + ih); ctx.moveTo(ix, f.y + f.h * 0.46); ctx.lineTo(ix + iw, f.y + f.h * 0.46); ctx.stroke();
  ctx.lineWidth = 1.1; ctx.globalAlpha = 0.4; ctx.strokeRect(ix, iy, iw, ih); ctx.restore();
});

// la tête du géant qui entre par le bord de l'écran, du côté où il est sorti : la pièce est une maison de poupée, il regarde dedans
function tete(ctx, ink, u) {
  const d = OE.dir, W = Wd.W, Hh = Wd.H, R = Math.min(W * 0.2, Hh * 0.36), e = sm(u / 1.1) * (1 - sm((u - OE.dur + 1) / 1)), P = Wd.ptr;
  const cy = ((Wd.ceil || Hh * 0.3) + Wd.floor) / 2 + R * 0.15, cx = d > 0 ? W + R * (1.25 - e * 1.45) : -R * (1.25 - e * 1.45), pen = Math.sin(u * 0.9) * 0.05 * d;
  OE.b = { x: cx, y: cy, r: R };
  const vx = P && P.on ? clamp((P.x - cx) / W, -0.6, 0.6) : -d * 0.3, vy = P && P.on ? clamp((P.y - cy) / Hh, -0.5, 0.5) : 0;
  const cl = Wd.t - OE.cl, bl = cl >= 0 && cl < 0.24 ? 1 - Math.abs(cl / 0.12 - 1) : 0; if (cl > 0.3 && Math.random() < 0.004) OE.cl = Wd.t;
  const tr = Wd.t - OE.clic < 0.4 ? Math.sin((Wd.t - OE.clic) * 50) * 5 * (1 - (Wd.t - OE.clic) / 0.4) : 0;
  ctx.save(); ctx.translate(cx + tr, cy); ctx.rotate(pen); ctx.lineCap = ctx.lineJoin = 'round';
  const papier = (getComputedStyle(document.documentElement).getPropertyValue('--bp').trim() || '#DADBD8');
  // la tête (le même trait que les chats : un contour, deux oreilles), remplie de papier : elle passe devant la pièce
  ctx.beginPath(); ctx.moveTo(-R, R * 0.1); ctx.quadraticCurveTo(-R, -R * 0.75, -R * 0.72, -R * 0.86); ctx.lineTo(-R * 0.62, -R * 1.42); ctx.lineTo(-R * 0.22, -R * 0.96);
  ctx.quadraticCurveTo(0, -R * 1.03, R * 0.22, -R * 0.96); ctx.lineTo(R * 0.62, -R * 1.42); ctx.lineTo(R * 0.72, -R * 0.86); ctx.quadraticCurveTo(R, -R * 0.75, R, R * 0.1);
  ctx.quadraticCurveTo(R, R * 0.92, 0, R * 0.92); ctx.quadraticCurveTo(-R, R * 0.92, -R, R * 0.1); ctx.closePath();
  ctx.fillStyle = papier; ctx.fill(); ctx.strokeStyle = `rgb(${ink})`; ctx.lineWidth = Math.max(3, R * 0.022); ctx.stroke();
  ctx.lineWidth = Math.max(2, R * 0.014); ctx.globalAlpha = 0.6; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * R * 0.6, -R * 0.95); ctx.lineTo(sd * R * 0.58, -R * 1.25); ctx.lineTo(sd * R * 0.36, -R * 1.0); ctx.stroke(); }); ctx.globalAlpha = 1;
  // les yeux : deux grands ovales noirs, deux reflets ; ils suivent la souris ; il cligne
  ctx.fillStyle = `rgb(${ink})`; [-1, 1].forEach(sd => { const ex = sd * R * 0.4 + vx * R * 0.22, ey = -R * 0.05 + vy * R * 0.16, rx = R * 0.15, ry = R * 0.22 * (1 - bl * 0.94);
    ctx.beginPath(); ctx.ellipse(ex, ey, rx, Math.max(1.5, ry), 0, 0, Math.PI * 2); ctx.fill();
    if (bl < 0.6) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex - rx * 0.3 + vx * rx * 0.4, ey - ry * 0.35 + vy * ry * 0.3, rx * 0.3, ry * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(ex + rx * 0.32, ey + ry * 0.32, rx * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = `rgb(${ink})`; } });
  // le nez, la bouche en w, les moustaches qui dépassent vers la pièce
  const ny = R * 0.3 + vy * R * 0.08, nx = vx * R * 0.18; ctx.lineWidth = Math.max(2, R * 0.016);
  ctx.beginPath(); ctx.moveTo(nx - R * 0.05, ny); ctx.quadraticCurveTo(nx, ny - R * 0.03, nx + R * 0.05, ny); ctx.quadraticCurveTo(nx, ny + R * 0.05, nx - R * 0.05, ny); ctx.fill();
  ctx.beginPath(); ctx.moveTo(nx - R * 0.12, ny + R * 0.1); ctx.quadraticCurveTo(nx - R * 0.06, ny + R * 0.16, nx, ny + R * 0.06); ctx.quadraticCurveTo(nx + R * 0.06, ny + R * 0.16, nx + R * 0.12, ny + R * 0.1); ctx.stroke();
  ctx.globalAlpha = 0.75; for (let i = -1; i <= 1; i++) { const sd = -d; ctx.beginPath(); ctx.moveTo(sd * R * 0.55, ny + i * R * 0.07); ctx.lineTo(sd * R * (1.35 + Math.abs(i) * 0.05), ny - R * 0.05 + i * R * 0.16 + Math.sin(Wd.t * 2 + i) * 3); ctx.stroke(); }
  ctx.restore();
}

STEPS.rouleau = (c, T, dt) => {
  // (vague 9, l'audit : « il passe, c'est tout ») : au milieu de la pièce, il s'arrête. Il se balance, nous regarde (« …? »),
  // puis pousse un MIAOU énorme : l'écran tremble, le souffle balaie les chats et les objets légers ; puis il repart en roulant
  if (T.arret == null && (c.x - Wd.W / 2) * T.dir > 0) T.arret = Wd.t;
  const ua = T.arret != null ? Wd.t - T.arret : -1, stop = ua >= 0 && ua < 2.8;
  const v = Math.max(Wd.W / 6.5, T.Rb * 1.4); if (!stop) c.x += T.dir * v * dt; c.anim = 'rouleau'; c.face = T.dir;
  const roll = c.x / T.Rb; c.spin = -roll * c.face + (stop ? Math.sin(ua * 5) * 0.25 * Math.max(0, 1 - ua / 2.8) : 0);
  if (stop && !T.vu && ua > 0.5) { T.vu = true; say(c, '…?'); }
  if (stop && !T.cri && ua > 1.5) { T.cri = true; Wd.shake = { t0: Wd.t, a: 18 }; word('MIAOU', c.x, floorAt(c.d) - T.Rb * 3, 96); if (window.Dex && Dex.vu) Dex.vu('miaou-geant');
    // (vague 34 de l'audit : « le MIAOU reste au milieu ») : le cri part en ondes sonores, des cercles au trait qui traversent tout l'écran ;
    // chaque chose est soufflée quand l'onde l'atteint (les voisins d'abord, les bords ensuite), et des lettres du titre se décrochent sur son passage
    const V = Math.hypot(Wd.W, Wd.H) / 1.1; T.onde = { t0: Wd.t, x: c.x + T.dir * T.Rb * 0.4, y: floorAt(c.d) - T.Rb * 1.7, V, vus: new Set() };
    // (vague 70) le cri sort de la pièce : l'interface aussi est soufflée quand l'onde la touche (le logo, la langue, les boutons de la barre,
    // les chapitres, le menu des événements) ; chaque élément bascule et se rattrape, dans le sens de l'onde
    T.onde.ui = [...document.querySelectorAll('#brand, #lang-pick, #theme-pick, .film-ui .ctrl > *, #chap > *, .evts li, .ctas > *')].filter(e => e.getClientRects().length);
    Wd.fx.push({ k: 'cri', x: T.onde.x, y: T.onde.y, v: V, t0: Wd.t, life: 1.9, seed: Math.floor(Math.random() * 99) }); }
  if (T.onde && Wd.t - T.onde.t0 < 1.9) { const O = T.onde, R = (Wd.t - O.t0) * O.V, loin = (x, y) => Math.hypot(x - O.x, y - O.y) < R;
    Wd.cats.forEach(o => { if (o === c || o.rare || o.held || o.gone || o.hidden || O.vus.has(o) || !loin(o.x, o.y - sOf(o.d) * 0.5)) return; O.vus.add(o);
      const sd = sgn(o.x - O.x) || 1; interrupt(o); o.perch = null; o.fall = true; o.vx = sd * sOf(o.d) * rnd(3, 6); o.vy = -sOf(o.d) * rnd(2.5, 4.5); o.spin = sd * rnd(3, 7); if (Math.random() < 0.5) say(o, pick(['waaah', '!!', 'mes oreilles !'])); });
    Wd.props.forEach(it => { if (it.mur || it.held || LOURD[it.kind] || it.kind === 'distrib' || O.vus.has(it) || !Wd.props.includes(it) || !loin(it.x, it.y)) return; O.vus.add(it); kick(it, sgn(it.x - O.x) || 1); if (it.fall) { it.vx *= 2.5; it.vy *= 1.5; } });
    (O.ui || []).forEach(e => { if (O.vus.has(e)) return; const q = e.getBoundingClientRect(), ex = q.left + q.width / 2, ey = q.top + q.height / 2; if (!loin(ex, ey)) return; O.vus.add(e);
      const sd = sgn(ex - O.x) || 1, k = clamp(1.4 - Math.hypot(ex - O.x, ey - O.y) / (O.V * 1.6), 0.5, 1.2), up = sgn(ey - O.y) || -1;
      if (e.animate) try { e.animate([{ transform: 'none' }, { transform: `translate(${sd * 16 * k}px,${up * 7 * k}px) rotate(${sd * 9 * k}deg)`, offset: 0.25 },
        { transform: `translate(${-sd * 6 * k}px,${-up * 2 * k}px) rotate(${-sd * 4 * k}deg)`, offset: 0.55 }, { transform: `rotate(${sd * 1.5 * k}deg)`, offset: 0.8 }, { transform: 'none' }], { duration: 850, easing: 'ease-out', composite: 'add' }); } catch (x) {} });
    const Ls = window.Vie && Vie.LETTERS && Vie.LETTERS(), r = Ls && Vie.RECT();
    if (Ls && r) Ls.forEach(L => { if (L.st || L.a < 0.8 || O.vus.has(L) || !loin(Vie.lx(L, r), Vie.ly(L, r))) return; O.vus.add(L);
      if ((O.lettres || 0) < 3 && Math.random() < 0.18) { O.lettres = (O.lettres || 0) + 1; const sd = sgn(Vie.lx(L, r) - O.x) || 1; Vie.tumble(L, sd * Wd.s0 * rnd(0.6, 1.4), -Wd.s0 * rnd(0.4, 0.9), sd * rnd(4, 9)); } else { L.wob = Wd.t; L.wobA = 2.5; L.hopA = 12; } }); }
  // posé sur son point le plus bas (le corps rond, ou la tête quand elle passe dessous) : mesuré sur l'image d'avant
  if (c.hp) { const b = Chat.where(c, c.body), low = Math.max(b[1] + c.b.body[1] * sc(c) * 1.05, c.hp[1] + c.b.head[0] * sc(c) * 1.1);
    T.off = (T.off || 0) - (low - floorAt(c.d)) * 0.8; }
  c.y = floorAt(c.d) + (T.off || 0);
  if ((T.bT = (T.bT || 0) + dt) > 0.45) { T.bT = 0; dust(c.x - T.dir * T.Rb * 0.6, floorAt(c.d), T.Rb * 0.5, 1); word(pick(['BOUM', 'boum', 'roule roule', 'BADABOUM']), c.x, floorAt(c.d) - T.Rb * 2.4, 26); }
  // devant lui : les chats, écrasés ; les objets légers valsent, les lourds s'aplatissent
  Wd.cats.forEach(o => { if (o !== c && !o.rare && Math.abs(o.x - c.x) < T.Rb * 0.7 && sgn(o.x - c.x) !== -T.dir) squash(o, T.dir); });
  Wd.props.forEach(it => { if (it.mur || it.held || it.gHit === c || Math.abs(it.x - c.x) > T.Rb * 0.8 || !Wd.props.includes(it)) return; it.gHit = c;
    if (it.run) { Chocs.bond(it, sOf(it.d) * 0.7); it.run.v *= 1.3; word('couic !', it.x, it.y - 30, 16); return; }   // la souris : un bond, elle continue sa course
    if (LOURD[it.kind] || it.kind === 'distrib') it.sqT = Wd.t; else { kick(it, T.dir); if (it.fall) { it.vx *= 2.2; it.vy *= 1.4; } } });
  return T.dir > 0 ? c.x > Wd.W + T.Rb * 2.4 : c.x < -T.Rb * 2.4;
};

/* ——— l'interminable ——— */
// si long que le moindre angle du dos le fait pencher d'un mètre : le dos reste bien à plat
ANIMS.longPas = (c, p, t) => { ANIMS.pas(c, p, t); p[I.pitch] = 0; p[I.look] = 0.9; };
ANIMS.longPain = (c, p, t) => { ANIMS.pain(c, p, t); p[I.pitch] = 0; p[I.y] = c.D.h * 0.95; };
function interminable() {
  const d = 0.22, c = spawn('interminable', { d, face: 1 }), len = c.b.body[0] * 2 + 0.6;
  c.vyaw = 0;   // bien de profil : le dos reste à plat, d'un bord à l'autre
  // (long, mais pas géant : sa tête reste à peine plus grosse que celle d'un chat)
  c.b.s = clamp(Math.max(Wd.W * 1.1, 900) / len / sOf(d), 1.1, 1.6); const half = c.b.body[0] * sc(c); c.x = -half - sc(c) * 0.5; c.zo = 0;
  c.q = [{ k: 'defile', half, air: true }, fn(c => { c.gone = true; })];
  later(0.8, () => { if (alive(c)) panique(0); });
  return c;
}
// devant sa tête : les chats sont renversés (poussés en l'air) ou écrasés
function bouscule(c) {
  if (!c.hp) return; const hx = c.hp[0], r = c.b.head[0] * sc(c);
  Wd.cats.forEach(o => { if (o === c || o.rare || o.held || o.hidden || o.gone || o.fall || o.d > 0.6 || o.x < hx - r || o.x > hx + r * 2.5 || Wd.t - (o.squashT ?? -9) < 2.5) return;
    if (o.perch || Math.random() < 0.5) squash(o, 1);
    else { o.squashT = Wd.t; interrupt(o); o.pet = null; o.fall = true; o.vx = sc(o) * rnd(3, 5); o.vy = -sc(o) * rnd(2.5, 4); o.spin = rnd(1, 2); say(o, pick(['waaah !', 'hé !', 'pousse-toi !'])); word(pick(['pouf', 'hop là']), o.x, o.y - sc(o), 18); } });
}
STEPS.defile = (c, T, dt) => {
  c.y = floorAt(c.d); c.face = 1; const v = Wd.W / 10;
  if (!T.ph) {   // il entre… et entre encore
    c.anim = 'longPas'; c.x += v * dt; bouscule(c);
    if (!T.said && c.x + T.half > Wd.W * 0.3) { T.said = 1; say(c, pick(['bonjour', 'pardon…', 'je passe'])); }
    if (c.x + T.half > Wd.W * 0.94) { T.ph = 1; T.t1 = T.t; say(c, pick(['euh…', 'je fais une pause', 'mrr'])); }
  } else if (T.ph === 1) {   // couché en travers : il bloque le passage ; les autres sautent par-dessus
    c.anim = 'longPain';
    if (!T.hops) { T.hops = 1; watchers(Wd.W / 2, 3).forEach((o, i) => { const x = clamp(o.x, Wd.W * 0.1, Wd.W * 0.9);
      interrupt(o); o.q = [go(x, { d: 0.02 }), pose('affut', 0.5 + i * 0.4, { face: 1, fx: o => say(o, pick(['hé !', 'pardon ?', 'pfff'])) }),
        hop(() => groundAt(x, 0.5), { h: sc(c) * 0.35 + sc(o) * 0.5 }), pose('assis', 1, { fx: o => say(o, 'hop') })]; }); }
    if (T.t - T.t1 > 8) { T.ph = 2; say(c, pick(['bon, j\'y vais', 'à plus'])); }
  } else {   // et il repart… sans fin
    c.anim = 'longPas'; c.x += v * 1.8 * dt; bouscule(c);
    if (c.x - T.half - sc(c) * 0.8 > Wd.W) return true;
  }
  return false;
};

/* ——— le ballon ——— */
ANIMS.ballon = (c, p, t) => {
  Chat.rest(c, p); const w = Math.sin(t * 2.2); p[I.puff] = 0.9; p[I.pitch] = w * 0.12; p[I.fl] = 0.3 + w * 0.3; p[I.fr] = 0.1 - w * 0.3; p[I.hl] = -0.2 - w * 0.2; p[I.hr] = w * 0.2;
  p[I.fk] = p[I.fk2] = p[I.hk] = 1; p[I.eyes] = (t % 4) < 0.15 ? 1 : 0; p[I.look] = 1; p[I.py] = -1; p[I.tailUp] = -1; p[I.tailWave] = 0.5; p[I.tailPhase] = t * 2;
};
function ballon() {
  const dir = Math.random() < 0.5 ? 1 : -1, c = spawn('ballon', { d: 0.1, face: dir }); c.zo = 1500;
  c.x = dir > 0 ? -sc(c) : Wd.W + sc(c); c.q = [{ k: 'flotte', dir, air: true }, fn(c => { c.gone = true; })];
  later(1.5, () => watchers(Wd.W / 2, 2).forEach(o => { interrupt(o); o.chasseBallon = c; o.q = [pose('affut', 1, { fx: o => say(o, pick(['!', 'miam ?', 'oh !'])) })]; }));
  return c;
}
STEPS.flotte = (c, T, dt) => {
  c.anim = 'ballon'; c.x += T.dir * Wd.W / 16 * dt; const top = Wd.ceil || Wd.H * 0.3, fl = floorAt(c.d);
  const base = top + (fl - top) * 0.35 - Math.max(0, (T.t - 12)) * sc(c) * 0.8;
  c.y = base + Math.sin(T.t * 1.3) * sc(c) * 0.12;
  return c.y < -sc(c) * 2 || (T.dir > 0 ? c.x > Wd.W + sc(c) * 1.5 : c.x < -sc(c) * 1.5);
};
// ceux d'en dessous : ils suivent le ballon, dressés, les pattes en l'air
H.live.push(o => {
  const b = o.chasseBallon; if (!b) return; if (!alive(b) || !free4(o) && !(o.task && o.task.k === 'pose')) { if (!alive(b)) o.chasseBallon = null; return; }
  if (o.task && o.task.k === 'pose' && !o.q.length) o.q.push(go(clamp(b.x + rnd(-1, 1) * sc(o) * 0.4, 20, Wd.W - 20), { g: 'trot' }), pose('dresse', rnd(0.8, 1.4), { face: sgn(b.x - o.x) || 1 }));
});

/* ——— l'éclair ——— */
function eclair() {
  const dir = Math.random() < 0.5 ? 1 : -1, c = spawn('eclair', { d: rnd(0.1, 0.3), face: dir }); c.zo = 800;
  c.x = dir > 0 ? -sc(c) * 1.5 : Wd.W + sc(c) * 1.5; c.q = [{ k: 'zoom', dir, air: true }, { k: 'zoom', dir: -dir, wait: 1.1, air: true }, fn(c => { c.gone = true; })];
  return c;
}
STEPS.zoom = (c, T, dt) => {
  c.y = floorAt(c.d); if (T.t < (T.wait || 0)) { c.hidden = 1; return false; } c.hidden = 0;
  if (c.stun > Wd.t) { c.anim = 'etourdi'; if ((T.sT = (T.sT || 0) - dt) < 0) { T.sT = 0.4; word(pick(['✦', '★', '✧']), c.x + rnd(-1, 1) * sc(c) * 0.4, c.y - sc(c) * 0.9, 16); } return false; }
  c.anim = 'galop'; c.face = T.dir; c.x += T.dir * Math.max(Wd.W / 0.75, sc(c) * 12) * dt;
  Wd.props.forEach(it => { if (it.fall || it.held || it.mur || it.zoomT === T || LOURD[it.kind] || it.kind === 'distrib' || Math.abs(it.x - c.x) > sc(c) * 0.6) return; it.zoomT = T; if (it.run) { Chocs.bond(it, sOf(it.d) * 0.6); it.run.v *= 1.3; return; } kick(it, T.dir); if (it.fall) { it.vx *= 2.5; it.vy *= 1.5; } });
  if ((T.dT = (T.dT || 0) + dt) > 0.04) { T.dT = 0; dust(c.x - T.dir * sc(c) * 0.5, floorAt(c.d), sc(c) * 0.35, 0.7); }
  Wd.cats.forEach(o => { if (o === c || o.rare || !free4(o) || Math.abs(o.x - c.x) > sc(o) * 0.8 || o.zoomT === T) return; o.zoomT = T;
    interrupt(o); o.face = -o.face; o.q = [pose('etourdi', rnd(1, 1.6), { fx: o => say(o, pick(['?!', 'hein ?', 'quoi ?'])) }), pose('assis', 1)]; });
  if (!T.said && Math.abs(c.x - Wd.W / 2) < sc(c)) { T.said = 1; word(pick(['ZOOM', 'FIIIT', 'VROUM']), Wd.W / 2, floorAt(c.d) - sc(c) * 1.4, 34, -0.08); }
  return T.dir > 0 ? c.x > Wd.W + sc(c) * 1.5 : c.x < -sc(c) * 1.5;
};

/* ——— le totem ——— */
function totem() {
  const dir = Math.random() < 0.5 ? 1 : -1, d = 0.15, n = 4, L = [];
  for (let i = 0; i < n; i++) { const c = spawn('chaton', { d, face: dir }); c.rare = 'totem'; c.zo = 400 + i * 10; c.x = dir > 0 ? -Wd.s0 : Wd.W + Wd.s0; L.push(c); }
  L.forEach((c, i) => { c.q = [i ? { k: 'etage', below: L[i - 1], i, air: true } : { k: 'totem', dir, L, air: true }]; });
  return L[0];
}
STEPS.totem = (c, T, dt) => {
  R.totem = T; c.y = floorAt(c.d); c.anim = 'pas'; c.face = T.dir; c.x += T.dir * sc(c) * 0.9 * dt;
  if (T.said == null && Math.abs(c.x - Wd.W / 2) < Wd.W * 0.25) { T.said = T.t; say(T.L[T.L.length - 1], pick(['on est grands !', 'hop hop hop'])); }
  const mid = Math.abs(c.x - Wd.W / 2) < sc(c) * 0.5;
  if (mid && T.wob == null) { T.wob = T.t; say(T.L[2], pick(['ça penche…', 'oh oh'])); }
  T.L.forEach(k => { k.wob = T.wob == null ? 0.08 : 0.08 + sm((T.t - T.wob) / 2) * 0.5; });
  if (T.wob != null && T.t - T.wob > 2.2) {   // la pile s'écroule
    T.L.forEach((k, i) => { interrupt(k); k.rare = null; k.fall = true; k.vx = (i - 1.5) * sc(k) * rnd(1.5, 2.5); k.vy = -sc(k) * rnd(1, 3); k.spin = rnd(-2, 2); if (i) say(k, pick(['waaah', 'aaah !', 'miaaa'])); });
    word('PATATRAS', c.x, c.y - sc(c) * 3, 30); return true;
  }
  return !alive(T.L[T.L.length - 1]) || (T.dir > 0 ? c.x > Wd.W + Wd.s0 : c.x < -Wd.s0);
};
STEPS.etage = (c, T, dt) => {
  const b = T.below; if (!alive(b) || b.fall) return true;
  const top = Chat.where(b, b.body), w = Math.sin(Wd.t * 3.2 + T.i) * sc(b) * (b.wob || 0.08) * T.i * 0.6;
  // (le test des téléportations : quand celui du dessous se retournait, celui du dessus sautait d'un coup de côté ; il suit, vite, mais il suit)
  const tx = top[0] + w, k = T.t < 0.05 ? 1 : Math.min(1, dt * 14); c.x += (tx - c.x) * k; c.y = b.y - sc(b) * (T.i === 1 ? 0.52 : 0.46); c.face = b.face; c.anim = T.i === 3 ? 'coucou' : 'assis';
  return false;
};

/* ——— l'acrobate ——— */
function acrobate(x) {
  const c = spawn('acrobate', { d: 0.05, face: Math.random() < 0.5 ? 1 : -1 }); c.zo = 2500;
  const fx = x ?? Wd.W * rnd(0.2, 0.8); c.x = fx; c.y = -sc(c) * 2; c.fil = { x: fx, y: -sc(c) * 1.5 };
  c.q = [{ k: 'fil', air: true }, fn(c => { c.gone = true; })];
  later(2, () => watchers(fx, 2).forEach(o => { interrupt(o); o.q = [go(clamp(fx + rnd(-1, 1) * sc(o) * 0.6, 20, Wd.W - 20), { g: 'trot' }), pose('dresse', rnd(1.5, 2.5), { fx: o => say(o, pick(['!', 'miaou ?', 'descends !'])) }), pose('assis', 1)]; }));
  return c;
}
STEPS.fil = (c, T, dt) => {
  const top = Wd.ceil || Wd.H * 0.3, low = top + (floorAt(c.d) - top) * 0.3, u = T.t;
  const y = u < 1.6 ? -sc(c) + (low + sc(c)) * sm(u / 1.6) : u < 6.5 ? low + Math.sin(u * 2.4) * sc(c) * 0.08 : low - (low + sc(c) * 3) * sm((u - 6.5) / 1.4);
  c.fil.y = y; c.fil.x = c.fil.x0 ?? (c.fil.x0 = c.fil.x);
  c.anim = 'porte'; c.spin = Math.sin(u * 2.1) * 0.35 * c.face;
  if (!T.said && u > 2.4) { T.said = 1; say(c, pick(['coucou !', 'tadaa', 'salut en bas'])); }
  return u > 8;
};
// il pend par la peau du cou, au bout du fil (comme quand on le porte : js/chats.js, live)
H.live.push(c => { if (!c.fil || !(c.task && c.task.k === 'fil') || c.task.t < 0.05) return; const n = Chat.where(c, c.headA, [-c.b.head[0] * 0.45, c.b.head[1] * 0.75, 0]); c.x += c.fil.x - n[0]; c.y += c.fil.y - n[1]; });

/* ——— ce qu'on leur jette dessus : un objet, un chat (lâché, lancé, qui tombe) ; chacun réagit à sa façon ——— */
// la zone du corps (une ellipse autour du corps et de la tête)
function zone(c) { const b = Chat.where(c, c.body), s = sc(c); return { x: b[0], y: b[1], rx: (c.b.body[0] + c.b.head[0] * 0.6) * s * 1.05, ry: Math.max(c.b.body[1], c.b.head[0]) * s * 1.35 }; }
const inZone = (z, x, y) => ((x - z.x) / z.rx) ** 2 + ((y - z.y) / z.ry) ** 2 < 1;
// le projectile rebondit : un objet (vy > 0 : vers le haut) ou un chat (vy > 0 : vers le bas)
function rebond(o, z, k) {
  if (o.main) return;   // un clic : rien à renvoyer
  const dir = sgn(o.x - z.x) || 1;
  if (o.hull) { const s = sOf(o.d); o.vx = dir * s * rnd(1.5, 2.5) * k; o.vy = s * rnd(2, 3) * k; o.tiltV = rnd(-8, 8); }
  else { const s = sc(o); o.vx = dir * s * rnd(2, 3) * k; o.vy = -s * rnd(3, 4.5) * k; o.spin = rnd(-1, 1); say(o, pick(['boiing', 'waaah', 'mia !'])); }
}
const REACT = {
  // le géant : ça rebondit sur lui comme sur un trampoline ; ça le chatouille
  // (28/09, « ils rebondissent à l'infini » : chaque rebond de suite est plus petit ; au troisième, il glisse sur le côté et descend)
  geant(c, o, z) { o.trampN = Wd.t - (o.trampT ?? -99) < 3 ? (o.trampN || 0) + 1 : 0; o.trampT = Wd.t; if (o.trampN >= 2) { rebond(o, z, 0.35); o.vx = (sgn(o.x - z.x) || 1) * (o.hull ? sOf(o.d) : sc(o)) * 2.5; } else rebond(o, z, 1.6 * Math.pow(0.6, o.trampN)); word(pick(['BOING', 'boiing']), o.x, o.y - 30, 26); if (Wd.t - (c.saidT ?? -9) > 1.5) { c.saidT = Wd.t; say(c, pick(['hihi', 'ça chatouille', 'hé ho'])); } },
  // l'interminable : il ondule de tout son long, râle… et s'en va plus tôt
  interminable(c, o, z) { rebond(o, z, 1); c.ondule = Wd.t; say(c, pick(['aïe !', 'ouille', 'hé !'])); const T = c.task; if (T && T.k === 'defile' && T.ph === 1) T.t1 = Math.min(T.t1, T.t - 6.5); },
  // le ballon : POP ; il se dégonfle en filant dans tous les sens, pfffrrrt
  ballon(c, o, z) { if (c.task && c.task.k === 'degonfle') return; rebond(o, z, 0.6); word('POP !', z.x, z.y, 38, -0.1); dust(z.x, z.y, sc(c) * 0.6, 1);
    interrupt(c); c.q = [{ k: 'degonfle', air: true }, fn(c => { c.gone = true; })]; Wd.cats.forEach(k => { if (k.chasseBallon === c) { k.chasseBallon = null; interrupt(k); k.q = [pose('sursaut', 0.75, { fx: k => say(k, pick(['!!!', 'AH !'])) }), pose('assis', 1)]; } }); },
  // l'éclair : touché en pleine course, il fait un tonneau, voit des étoiles… et repart de plus belle
  eclair(c, o, z) { rebond(o, z, 1.2); const T = c.task; if (T && T.k === 'zoom' && !(c.stun > Wd.t)) { c.stun = Wd.t + 1.6; word(pick(['PAF', 'BONK']), z.x, z.y - sc(c) * 0.5, 30); say(c, '@_@'); } },
  // le totem : la pile s'écroule tout de suite
  totem(c, o, z) { rebond(o, z, 0.8); const T = R.totem; if (T && T.wob == null) { T.wob = T.t - 1.9; } else if (T) T.wob = Math.min(T.wob, T.t - 1.9); },
  // l'acrobate : touché, il tourne comme une toupie au bout du fil ; touché deux fois, le fil casse et il tombe
  acrobate(c, o, z) { rebond(o, z, 1); const T = c.task; if (!T || T.k !== 'fil') return;
    if ((c.hits = (c.hits || 0) + 1) < 2) { c.toupie = Wd.t; say(c, pick(['wiiii', 'ouh là', 'hihi'])); return; }
    word('clac !', c.fil.x, c.fil.y - sc(c) * 0.8, 24); say(c, pick(['oh non', 'aaah !'])); interrupt(c); c.fil = null; c.fall = true; c.vx = (sgn(c.x - o.x) || 1) * sc(c); c.vy = 0; c.stay = 0; },
};
H.pre.push(() => {
  const L = Wd.cats.filter(c => c.rare && alive(c) && !c.hidden && c.hp && REACT[c.rare]); if (!L.length) return;
  const shots = Wd.props.filter(it => it.fall && !it.held && !it.suck && Wd.props.includes(it)).concat(Wd.cats.filter(o => o.fall && !o.held && !o.rare && !o.gone));
  for (const c of L) { const z = zone(c);
    for (const o of shots) { if (o.gHit === c || (o.zoomT && o.zoomT === c.task) || Wd.t - (o.rareT ?? -9) < 0.5) continue; const y = o.hull ? o.y - sOf(o.d) * 0.2 : o.y - sc(o) * 0.4;
      if (!inZone(z, o.x, y)) continue; o.rareT = Wd.t; REACT[c.rare](c, o, z); } }
});
// un clic sur une rareté : la même réaction que si on lui jetait quelque chose (le géant glousse, le ballon fait POP…)
H.click.push((x, y) => {
  const c = Wd.cats.find(c => c.rare && alive(c) && !c.hidden && c.hp && REACT[c.rare] && inZone(zone(c), x, y)); if (!c) return false;
  REACT[c.rare](c, { main: true, x, y, d: c.d }, zone(c)); return true;
});
// ses effets sur la pose : l'interminable ondule, l'acrobate tourne comme une toupie, l'éclair sonné
H.live.push(c => {
  if (!c.rare) return; const p = c.tgt;
  if (c.ondule && Wd.t - c.ondule < 1.2) { const u = Wd.t - c.ondule; p[I.sqz] += Math.sin(u * 22) * 0.12 * (1 - u / 1.2); p[I.eyes] = 1; p[I.mouth] = 1; }
  if (c.toupie && Wd.t - c.toupie < 1.6) { const u = (Wd.t - c.toupie) / 1.6; c.face = Math.sin(u * 30 * (1 - u * 0.5)) >= 0 ? 1 : -1; p[I.eyes] = 2; }
  // un visiteur sans rien à faire (le fil cassé, un tour qui s'arrête) : il s'en va
  if (!c.task && !c.q.length && !c.fall && !c.held && c.rare !== 'totem') c.stay = 0;
});
// le ballon crevé : il file au hasard, de plus en plus plat, en faisant pfffrrrt, puis sort par le haut
ANIMS.degonfle = (c, p, t) => { ANIMS.ballon(c, p, t); p[I.puff] = Math.max(0, 0.9 - t * 0.35); p[I.sqz] = Math.sin(t * 30) * 0.08; p[I.eyes] = 0; p[I.mouth] = 1; p[I.fl] = p[I.fr] = 1.2; p[I.hl] = p[I.hr] = -1.2; };
STEPS.degonfle = (c, T, dt) => {
  c.anim = 'degonfle'; const s = sc(c), v = Math.max(Wd.W / 1.6, s * 7);
  if (!T.a || (T.n = (T.n || 0) - dt) < 0) { T.n = rnd(0.12, 0.3); T.a = T.t < 2 ? rnd(0, Math.PI * 2) : -Math.PI / 2 + rnd(-0.6, 0.6); }
  c.x += Math.cos(T.a) * v * dt; c.y += Math.sin(T.a) * v * dt; c.spin += dt * 12; c.face = Math.cos(T.a) >= 0 ? 1 : -1;
  if (c.x < s * 0.5 && T.t < 2) T.a = Math.PI - T.a; if (c.x > Wd.W - s * 0.5 && T.t < 2) T.a = Math.PI - T.a;
  if (c.y > floorAt(c.d) - s * 0.5) T.a = -Math.abs(T.a);
  if ((T.w = (T.w || 0) - dt) < 0) { T.w = 0.5; word(pick(['pfffrrrt', 'prrrt', 'fffff']), c.x, c.y, 18); }
  return c.y < -s * 2;
};

/* ——— à la main (27/09, Mathieu : « il faut pouvoir drag tous les chats spéciaux ») ———
   le géant : trop lourd pour le soulever, mais on le fait rouler où l'on veut (il glousse) ;
   le ballon : on le tient par son fil, il flotte au-dessus de la main ; lâché, il s'envole ;
   l'acrobate (décroché de son fil), l'éclair, l'interminable : on les soulève par la peau du cou comme les autres ;
   lâchés, ils retombent et reprennent leur numéro (l'éclair repart en trombe, l'interminable s'en va) ;
   le totem : attraper un chaton fait s'écrouler la pile, on garde celui qu'on tient. */
const prenable = c => c.rare && alive(c) && !c.hidden && c.hp && !(c.task && c.task.k === 'degonfle');
// (le corps, ou la tête : celle de l'interminable est bien loin de son milieu)
const sousMain = (c, x, y) => inZone(zone(c), x, y) || Math.hypot(x - c.hp[0], y - c.hp[1]) < c.b.head[0] * sc(c) * 1.3;
H.grab.push((x, y) => Wd.cats.filter(prenable).sort((a, b) => b.z - a.z).find(c => sousMain(c, x, y)) || null);
function ecroule(T) {
  T.L.forEach((k, i) => { if (!alive(k)) return; interrupt(k); k.rare = null; k.fall = true; k.vx = (i - 1.5) * sc(k) * rnd(1, 2); k.vy = -sc(k) * rnd(1, 2); k.spin = rnd(-2, 2); k.stay = Wd.t - k.born + rnd(8, 20); if (i) say(k, pick(['waaah', 'aaah !', 'miaaa'])); });
  word('PATATRAS', T.L[0].x, T.L[0].y - sc(T.L[0]) * 3, 30);
}
H.drag.push((c, x, y) => {
  if (!c || !c.rare || c.hull) return false; c.tire = true;
  if (c.rare === 'geant') {
    // on le pousse : il roule vers la main
    const T = c.task; if (T && T.k === 'rouleau' && Math.abs(x - c.x) > T.Rb * 0.3) T.dir = sgn(x - c.x);
    if (Wd.t - (c.saidT ?? -9) > 1.6) { c.saidT = Wd.t; say(c, pick(['hihi', 'trop lourd !', 'hé ho', 'on roule ?'])); word(pick(['hnnng', 'pousse pousse']), x, y - 30, 20); }
    return true;
  }
  if (c.rare === 'ballon') {
    if (!c.task || c.task.k !== 'tenu') { interrupt(c); const b = Chat.where(c, c.body); c.task = { k: 'tenu', air: true, t: 0, ox: b[0] - x, oy: b[1] - y }; say(c, pick(['hihi', 'pouic', 'on se promène ?'])); }
    c.task.hx = x; c.task.hy = y; return true;
  }
  if (c.rare === 'totem') { const T = R.totem; if (T && T.L.includes(c)) ecroule(T); c.rare = null; return false; }   // un chaton comme un autre
  // les autres : soulevés par la peau du cou (le reste : js/chats.js, drag)
  if (!c.held) { interrupt(c); c.fil = null; c.fall = false; c.held = true; c.spin = 0; c.pend = { th: 0, w: 0, px: x, py: y, vx: 0, vy: 0, ax: 0 }; c.suite = c.rare; say(c, pick(['hé !', 'lâche-moi !', 'wiii', '?!'])); }
  return false;
});
H.release.push(c => {
  if (!c || !c.rare || c.hull) return false; const tire = c.tire; c.tire = false;
  if (!tire) return false;   // un simple clic : sa réaction (H.click)
  if (c.rare === 'geant') return true;
  if (c.rare === 'ballon') { if (c.task && c.task.k === 'tenu') { c.task = null; c.q = [{ k: 'envole', air: true }, fn(c => { c.gone = true; })]; say(c, pick(['bye !', 'wiiii', 'au revoir'])); } return true; }
  return false;
});
// tenu par son fil : il flotte au-dessus de la main, un peu en retard
STEPS.tenu = (c, T, dt) => {
  c.anim = 'ballon'; if (T.hx == null) return false; const b = Chat.where(c, c.body), s = sc(c);
  // (pris n'importe où, il glisse doucement jusqu'à pendre au bout de son fil, au-dessus de la main)
  const k = Math.min(1, dt * 5), r = Math.min(1, dt * 1.5); T.ox += (0 - T.ox) * r; T.oy += (-(c.D.h * 1.1 + 1.2) * s - T.oy) * r;
  c.x += (T.hx + T.ox - b[0]) * k; c.y += (T.hy + T.oy - b[1]) * k; c.face = sgn(T.hx - b[0]) || c.face;
  return false;
};
STEPS.envole = (c, T, dt) => { c.anim = 'ballon'; const s = sc(c); c.y -= s * (0.6 + T.t * 0.8) * dt; c.x += Math.sin(T.t * 1.3) * s * 0.4 * dt; return c.y < -s * 2.5; };
// lâché, retombé : il reprend son numéro
H.live.push(c => {
  if (!c.suite || c.held || c.fall || !alive(c)) return; const k = c.suite; c.suite = null;
  if (k === 'eclair') { const dir = c.x < Wd.W / 2 ? -1 : 1; c.q.push(fn(c => say(c, pick(['bon.', 'ZOOM !', 'trop lent !']))), { k: 'zoom', dir, air: true }, fn(c => { c.gone = true; })); }
  else if (k === 'interminable') c.q.push(fn(c => say(c, pick(['bon, j\'y vais', 'pfff']))), { k: 'defile', half: c.b.body[0] * sc(c), ph: 2, air: true }, fn(c => { c.gone = true; }));
  else c.q.push(fn(c => say(c, pick(['bon…', 'salut !', 'la prochaine fois'])))) ;   // l'acrobate : il s'en va à pied (sans rien à faire, un visiteur part)
});

/* ——— les visiteurs et le reste du monde (carnet des interactions) ——— */
// l'éclair et le totem : les chats de la maison les regardent passer (les perchés aussi, de là-haut)
function spectateurs(c, n, quoi) {
  const dir = c.face || 1;
  watchers(Wd.W / 2, n).forEach(o => { interrupt(o); o.q = [pose('affut', rnd(1, 2), { face: sgn(c.x - o.x) || -dir, fx: o => say(o, pick(quoi)) })]; });
  Wd.cats.forEach(o => { if (o.perch && !o.rare && !o.held && Math.random() < 0.7) { o.face = sgn(c.x - o.x) || o.face; if (Math.random() < 0.5) say(o, pick(quoi)); } });
}
H.pre.push(() => {
  Wd.cats.forEach(c => {
    if (!c.rare || c.vu || !c.task || c.hidden || c.x < 0 || c.x > Wd.W) return;
    if (c.rare === 'eclair' && c.task.k === 'zoom') { c.vu = 1; later(0.25, () => spectateurs(c, 4, ['?!', 'quoi ?', 'hein ?!', 'c\'était quoi ?'])); }
    else if (c.rare === 'totem' && c.task.k === 'totem') { c.vu = 1; spectateurs(c, 3, ['oh !', 'des chatons !', 'hihi', 'attention !']);
      // un curieux les suit un moment
      const o = watchers(c.x, 1)[0]; if (o) { o.q.push(go(() => clamp(c.x - c.face * sc(o) * 1.3, 20, Wd.W - 20), { g: 'trot' }), pose('dresse', rnd(1, 1.6), { face: c.face })); } }
  });
});
// l'interminable et le totem ne passent plus au travers du décor : ce qui est devant eux est poussé (les gros tanguent, il s'excuse)
H.pre.push(() => {
  Wd.cats.forEach(c => {
    const T = c.task; if (!c.hp || !T || !((c.rare === 'interminable' && T.k === 'defile' && T.ph !== 1) || (c.rare === 'totem' && T.k === 'totem'))) return;
    const s = sc(c), x = c.rare === 'totem' ? c.x + c.face * s * 0.35 : c.hp[0] + c.face * s * 0.3;
    Wd.props.forEach(it => {
      if (it.fall || it.held || it.run || it.mur || it.tower || it.pushT === T || Math.abs(it.d - c.d) > 0.35 || Math.abs(it.x - x) > it.hull.w * it.s * 0.5) return; it.pushT = T;
      if (LOURD[it.kind] || it.kind === 'distrib') { it.wob = Wd.t; it.wobA = 0.6; say(c, pick(['pardon', 'oups', 'excusez-moi'])); if (c.rare === 'totem' && R.totem && R.totem.wob == null) R.totem.wob = R.totem.t - 1; }
      else { kick(it, c.face); if (it.fall) { it.vx *= 0.8; } word(pick(['pouf', 'tac']), it.x, it.y - it.hull.h * it.s - 10, 15); }
    });
  });
});
// les croquettes sur un visiteur : chacun à sa façon (le géant les renvoie haut, l'acrobate et l'interminable les croquent, le ballon fait pouic)
H.pre.push(() => {
  const L = Wd.cats.filter(c => c.rare && alive(c) && !c.hidden && c.hp); if (!L.length || !Wd.kib.length) return;
  Wd.kib.forEach(k => {
    if (k.rest || k.suck || k.vy <= 0 || Wd.t < k.t0) return;
    for (const c of L) { const z = zone(c); if (!inZone(z, k.x, k.y)) continue; const quoi = c.rare;
      if (quoi === 'acrobate' || quoi === 'interminable') { k.gone = true; if (Wd.t - (c.kibT ?? -9) > 1.2) { c.kibT = Wd.t; say(c, pick(['miam', 'crounch', 'merci !'])); } }
      else { k.vy = -Math.abs(k.vy) * (quoi === 'geant' ? 1.1 : 0.6) - 120; k.vx += rnd(-120, 120);
        if (Wd.t - (c.kibT ?? -9) > 1.5) { c.kibT = Wd.t; say(c, pick(quoi === 'geant' ? ['hihi', 'ça pique'] : quoi === 'ballon' ? ['pouic', 'pouic pouic'] : quoi === 'eclair' ? ['?!'] : ['hé !', 'des croquettes !'])); } }
      break; }
  });
});

/* ——— la craie : le fil de l'acrobate, la ficelle du ballon ——— */
H.draw.push(() => {
  const C = window.Chalk; if (!C || !C.ctx) return;
  Wd.cats.forEach(c => {
    if (c.fil && c.task && c.task.k === 'fil') C.line(c.fil.x, 0, c.fil.x, c.fil.y, 1, { w: 1.3, a: 0.75 * Wd.a, seed: 91, tip: false, amp: 0.2 });
    if (c.rare === 'ballon' && c.hp) { const b = Chat.where(c, c.body), y0 = b[1] + c.D.h * sc(c) * 1.1, sw = Math.sin(Wd.t * 1.7) * sc(c) * 0.2, P = [];
      for (let i = 0; i <= 6; i++) { const f = i / 6; P.push([b[0] + Math.sin(f * 3 + Wd.t * 2) * sc(c) * 0.06 + sw * f, y0 + f * sc(c) * 1.3]); }
      C.stroke(P, 1, { w: 1.3, a: 0.75 * Wd.a, seed: 93, tip: false }); }
  });
});

/* ——— quand : au hasard, rarement ; ou au clic, une fois sur quinze ——— */
const LIST = { geant, interminable, ballon, eclair, totem, acrobate };
function busy() { R.on = R.on.filter(alive); return R.on.length > 0 || Wd.busyScen || !(Wd.a > 0.5) || !Wd.W; }
function go1(id, x) { if (busy()) return null; const names = Object.keys(LIST).filter(k => k !== R.last), k = id || pick(names); R.last = k; const c = LIST[k](x); R.on = [c]; return c; }
H.post.push(() => {
  if (!R.next) { R.next = Wd.t + rnd(30, 50); return; }
  if (Wd.t < R.next || residents().length < 2) return;
  R.next = Wd.t + rnd(60, 120); go1();
});
H.click.push((x, y) => {
  if (catAt(x, y) || propAt(x, y) || Math.random() > 1 / 15 || busy()) return false;
  const k = pick(['geant', 'acrobate', 'eclair', 'ballon', 'totem', 'interminable']); Wd.clicks++;
  return !!go1(k, k === 'acrobate' || k === 'geant' ? x : undefined);
});

// pour les voir tout de suite : ?rare=geant (ou interminable, ballon, eclair, totem, acrobate)
try { const q = new URLSearchParams(location.search).get('rare'); if (q && LIST[q]) { R.next = 1; const t = setInterval(() => { if (Wd.W && Wd.t > 3 && go1(q)) clearInterval(t); }, 500); } } catch (e) {}

// pour js/contacts.js : la réaction d'un visiteur à ce qui le touche (o.main : un geste léger, rien à renvoyer)
const react = (c, o) => { if (c.rare && REACT[c.rare] && alive(c)) REACT[c.rare](c, o, zone(c)); };
return { ...LIST, lance: go1, R, react, zone, panique, oeil, OE };
})();
