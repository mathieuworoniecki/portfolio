/* Les Nyan Cats (28/09, Mathieu : « on devrait aussi avoir des Nyan Cat »).
   Un chat qui vole tout droit, les pattes qui pédalent, et derrière lui un long ruban arc-en-ciel en escalier, qui ondule, semé d'étoiles.
   - Dans la pièce (l'écran 1) : le bouton arc-en-ciel du menu lance une parade (trois chats à des hauteurs différentes, l'un après l'autre) ;
     de temps en temps, un seul passe tout seul. Ce que son ruban frôle (un chat, un objet) devient arc-en-ciel un moment (js/arcenciel.js).
     Ce sont des visiteurs : ils entrent par un bord et sortent par l'autre (ils ne disparaissent jamais au milieu).
   - Dans l'espace (l'écran 2) : un chat à la dérive part parfois en Nyan Cat ; il traverse l'écran, ressort de l'autre côté, fait
     un ou deux passages, puis se remet à flotter. Un chat recraché par un petit trou blanc est parfois un Nyan Cat.
   - On peut attraper un Nyan Cat au vol : il s'arrête net (son ruban reste un instant là où il était). */
window.Nyan = (() => {
if (!window.Chats || !Chats.K || !window.Arc) return null;
const K = Chats.K, { Wd, H, STEPS, ANIMS, rnd, pick, clamp, sgn, sc, sOf, floorAt, say, later, fn, addCat, dust } = K;
const TAU = Math.PI * 2, COUL = Arc.COUL, VIE = 1.8;   // (le ruban : chaque bout vit VIE secondes, puis s'efface)
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

// le ruban : six bandes, en escalier (les marches de Nyan Cat) qui ondule ; P = [[x, y, t], …] du plus vieux au plus récent
// (29/09, vague 5) les bandes suivent la direction du vol (la normale) : le ruban tient dans une boucle, sur une arche ; le rouge reste dehors
function ruban(ctx, P, bw, now, a, dir, vie) {
  if (P.length < 2) return; dir = dir || 1; vie = vie || VIE;
  const N = P.map((p, j) => { const q = P[Math.max(0, j - 2)], r = P[Math.min(P.length - 1, j + 2)]; let nx = -(r[1] - q[1]), ny = r[0] - q[0]; const L = Math.hypot(nx, ny) || 1; return [nx / L * dir, ny / L * dir]; });
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(${COUL[i]},${(0.9 * a).toFixed(3)})`; ctx.lineWidth = bw + 0.6; ctx.beginPath();
    let prevM = null;
    const off = (j, m) => (i - 2.5) * bw + (m ? bw * 0.45 : -bw * 0.45);
    P.forEach(([x, y, t], j) => { const m = Math.floor(t * 9) % 2, o = off(j, m), n = N[j];
      if (!j) ctx.moveTo(x + n[0] * o, y + n[1] * o); else { if (m !== prevM) { const o2 = off(j, prevM); ctx.lineTo(x + n[0] * o2, y + n[1] * o2); } ctx.lineTo(x + n[0] * o, y + n[1] * o); } prevM = m; });
    ctx.stroke(); }
  // les étoiles semées derrière : des petites croix qui clignotent
  for (let j = 0; j < P.length; j += 7) { const [x, y, t] = P[j], age = now - t, k = Math.min(1, (1 - age / vie) * 3); if (k <= 0) continue; const q = (t * 13) % 1, o = (q - 0.5) * bw * 12, n = N[j], r = bw * (0.8 + 0.6 * Math.sin(now * 12 + t * 40)) * Math.min(1.6, 2.2 / Math.max(1, bw / 3)), xx = x + n[0] * o, yy = y + n[1] * o;
    ctx.strokeStyle = `rgba(${COUL[(j / 7 | 0) % 6]},${(0.9 * a * k).toFixed(3)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(xx - r, yy); ctx.lineTo(xx + r, yy); ctx.moveTo(xx, yy - r); ctx.lineTo(xx, yy + r); ctx.stroke(); }
  ctx.restore();
}
// le bout du ruban s'efface par le début (le plus vieux), jamais d'un coup
const coupe = (P, now, vie) => { vie = vie || VIE; while (P.length && now - P[0][2] > vie) P.shift(); };

/* ——— dans la pièce ——— */
const VOLS = [];   // { c, P } : les rubans (ils restent le temps de s'effacer, même le chat parti)
// (vague 221 de l'audit, design) : au bureau, le sommet de l'arche passait sur la consigne des boutons (« clique : un chat tombe du ciel… »),
// et « un pont !! » s'écrivait par-dessus ; l'arche reste sous la consigne, le mot s'écrit sous la voûte
const sousBoutons = () => { const q = document.querySelector('.ctas'), b = q && q.getClientRects().length ? q.getBoundingClientRect() : null; return b && b.width ? b.bottom + 46 : 0; };
let ARCHE = null, PAP = null;   // la grande arche (le bouquet de la parade) : { xs, xe, yb, yp, dir, bw, pret, fin }
const archePt = (A, u) => [A.xs + (A.xe - A.xs) * u, A.yb - (A.yb - A.yp) * Math.sin(Math.PI * clamp(u, 0, 1))];
STEPS.nyan = (c, T, dt) => {
  if (!T.P) { T.P = []; VOLS.push({ c, P: T.P, vie: T.vie, bw: T.bw, dir: T.dir }); T.y0 = c.y; c.face = T.dir; }
  const s = sc(c); c.anim = ANIMS.nage ? 'nage' : 'chute'; c.face = T.dir;
  let pt = null;
  if (T.arche) {
    // l'arche : il la dessine d'un bord à l'autre de la pièce, par le plafond ; son ruban, c'est l'arche
    const A = T.arche; T.u = (T.u || 0) + dt / T.dur;
    if (T.u <= 1) { const [x, y] = archePt(A, T.u); pt = [x, y]; c.x = x; c.y = y + s * 0.42; const [x2, y2] = archePt(A, T.u + 0.01); c.spin = Math.atan2(y2 - y, (x2 - x) * T.dir) * 0.8; }
    else { if (!A.pret) { A.pret = Wd.t; Wd.shake = { t0: Wd.t, a: 4 }; Wd.fx.push({ k: 'txt', text: 'un pont !!', x: (A.xs + A.xe) / 2, y: A.yp + A.bw * 5 + 24, t0: Wd.t, life: 2, rot: -0.05, size: 30 }); }
      c.x += T.dir * T.v * dt; c.y = A.yb + s * 0.42; c.spin *= Math.exp(-dt * 5); }
  } else if (T.boucle != null && !T.bf && (T.dir > 0 ? c.x >= T.boucle : c.x <= T.boucle)) { T.bf = { a: 0, cx: c.x, cy: c.y }; T.R = clamp((c.y - s * 0.42 - ((Wd.ceil || Wd.H * 0.3) + s * 0.4)) / 2, s * 0.7, Math.min(T.R, Wd.H * 0.15));  /* (la boucle ne monte pas sur le titre) */ say(c, pick(['wiiii ✨', 'looping !', 'nyaaaan !'])); etoiles(c.x, c.y - s * 0.4, 12); }
  if (!T.arche) {
    if (T.bf && T.bf.a < TAU) { const R = T.R, B = T.bf; B.a = Math.min(TAU, B.a + dt * TAU / 1.5); c.x = B.cx + T.dir * R * Math.sin(B.a); c.y = B.cy - R + R * Math.cos(B.a); c.spin = -T.dir * B.a; T.y0 = B.cy; if (B.a >= TAU) c.spin = 0; }
    else { c.x += T.dir * T.v * dt; c.y = T.y0 + Math.sin(T.t * 7) * s * 0.1; c.spin = Math.sin(T.t * 7) * 0.12; }
  }
  // le ruban part de derrière lui, à mi-corps (dans la boucle : derrière, le long de la courbe)
  if (pt) T.P.push([pt[0], pt[1], Wd.t]);
  else if (!T.arche || T.u <= 1) T.P.push([c.x - T.dir * s * 0.55, c.y - s * 0.42, Wd.t]);   // (après l'arche, il file au ras du sol sans ruban : l'arche ne finit pas en V)
  // (vague 75, l'audit : « l'arc-en-ciel ») : l'interface aussi. Ce qu'il frôle en passant (le titre, un bouton, un chapitre, le logo…)
  // prend un ruban arc-en-ciel en escalier derrière lui, qui se replie dans l'élément ; l'élément fait un petit bond, dans le sens du vol
  if (!T.ui) T.ui = [...document.querySelectorAll('#brand, #lang-pick, #theme-pick, .film-ui .ctrl > *, #chap > *, .evts li, .ctas > *, #titles')].filter(e => e.getClientRects().length && e.animate).map(e => ({ e, vu: false }));
  T.ui.forEach(u => { if (u.vu) return; const q = u.e.getBoundingClientRect(); if (c.x < q.left - s * 0.3 || c.x > q.right + s * 0.3 || c.y - s * 0.42 < q.top - s * 0.8 || c.y - s * 0.42 > q.bottom + s * 0.8 || Math.abs(c.x - (q.left + q.width / 2)) > Math.min(q.width / 2, s) + s * 0.3) return;
    u.vu = true; const D = -T.dir, ombre = k => COUL.map((col, i) => `drop-shadow(${(D * (i + 1) * 2.2 * k).toFixed(1)}px ${((i - 2.5) * 1.1 * k).toFixed(1)}px 0 rgb(${col}))`).join(' ');
    try { u.e.animate([{ filter: ombre(0.2), transform: 'none' }, { filter: ombre(1.6), transform: `translate(${T.dir * 5}px,-7px) rotate(${T.dir * 3}deg)`, offset: 0.2 }, { filter: ombre(1), transform: 'translate(0,1px)', offset: 0.55 }, { filter: ombre(0.01), transform: 'none' }], { duration: 1700, easing: 'ease-out', composite: 'add' }); } catch (x) {}
    etoiles(c.x, c.y - s * 0.4, 5); });
  // ce qu'il frôle devient arc-en-ciel, avec une gerbe d'étoiles
  Wd.cats.forEach(o => { if (o === c || o.nyanT > Wd.t || Math.abs(o.x - c.x) > s * 0.6 || Math.abs((o.y - sc(o) * 0.4) - (c.y - s * 0.4)) > s * 0.9) return; o.nyanT = Wd.t + 5; Arc.colore(o, 18); say(o, pick(['ooh ✨', 'wouah', '!?'])); etoiles(o.x, o.y - sc(o) * 0.6, 8); });
  Wd.props.forEach(it => { if (it.nyanT > Wd.t || it.a < 0.5 || Math.abs(it.x - c.x) > s * 0.5 || Math.abs(it.y - c.y) > s * 1.6) return; it.nyanT = Wd.t + 5; Arc.colore(it, 18); etoiles(it.x, it.y - s * 0.3, 6); });
  // (vague 259 de l'audit, « l'arc-en-ciel », immersion) : toute la pièce le suit des yeux (où qu'ils soient, les chats lèvent la tête vers lui) ;
  // et ceux qu'il survole bondissent pour attraper son ruban, pattes en l'air (« attrape ! »), trois par passage, chacun une fois
  if (!T.arche && !reduit) { Wd.mire = { x: c.x, y: c.y - s * 0.4, fin: Wd.t + 0.3 };
    if ((T.sauts || 0) < 3) { const o = Wd.cats.find(o => o !== c && !o.rare && !(o.sautNyan > Wd.t) && K.free4(o) && !o.perch && T.dir * (o.x - c.x) > s * 0.2 && T.dir * (o.x - c.x) < s * 2.2 && o.y - (c.y - s * 0.4) < sc(o) * 4.5);
      if (o) { T.sauts = (T.sauts || 0) + 1; o.sautNyan = Wd.t + 12; K.interrupt(o); const h = clamp(o.y - (c.y - s * 0.4) - sc(o) * 0.6, sc(o) * 0.7, sc(o) * 2.4);
        o.q = [K.hop(() => K.groundAt(K.inView(o.x + T.dir * sc(o) * 0.5), o.d), { h }), K.pose('assis', rnd(0.8, 1.4), { face: T.dir })];
        later(0.1, () => { if (Wd.cats.includes(o)) say(o, pick(['attrape !', 'hop !', 'je l’ai presque !', 'nyan ?!'])); }); later(0.35, () => { if (Wd.cats.includes(o)) etoiles(o.x, o.y - sc(o) * 1.2, 6); }); } } }
  if (Wd.t > (T.dit || 0)) { T.dit = Wd.t + rnd(1.2, 2); if (Math.random() < 0.6) say(c, pick(['nyan nyan nyan', 'nya-nya-nyan ♪', 'nyaaan ✨', '♪♫'])); }
  return T.dir > 0 ? c.x > Wd.W + s * 1.5 : c.x < -s * 1.5;
};
function etoiles(x, y, n) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(60, 200); Wd.fx.push({ k: 'etoile', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 260, frein: 1.5, t0: Wd.t, life: rnd(0.8, 1.4), col: pick(COUL), r: rnd(3, 5), tw: true }); } }
// un Nyan Cat traverse la pièce, à une hauteur donnée (0 : au ras du sol, 1 : tout en haut)
function vol(o) {
  o = o || {}; if (Wd.cats.filter(c => c.nyan).length > 4) return false;
  const dir = o.dir || (Math.random() < 0.5 ? 1 : -1), c = addCat({ temp: true, d: o.d ?? rnd(0, 0.35), face: dir }), s = sc(c);
  const bas = floorAt(c.d) - s * 0.3, haut = Math.max((Wd.ceil || Wd.H * 0.25) - s * 0.2, s * 1.4), h = o.h ?? rnd(0.2, 0.8);
  c.nyan = true; c.x = dir > 0 ? -s * 1.2 : Wd.W + s * 1.2; c.y = bas + (haut - bas) * h; c.stay = 1e9;
  const T = { k: 'nyan', air: true, dir, v: Wd.W / (o.dur || rnd(4.5, 6)) };
  if (o.boucle) { T.boucle = Wd.W * (dir > 0 ? 0.42 : 0.58); T.R = clamp((bas - haut) * 0.42, s * 1.2, Wd.H * 0.2); }
  if (o.arche) { const yb = floorAt(0.2), A = { xs: Wd.W * (dir > 0 ? 0.1 : 0.9), xe: Wd.W * (dir > 0 ? 0.9 : 0.1), yb: yb - 2, yp: Math.max((Wd.ceil || Wd.H * 0.25) + s * 0.3, yb - Wd.H * 0.55, sousBoutons() + Math.max(5, s * 0.075) * 4), dir, bw: Math.max(5, s * 0.075) };
    A.t0 = Wd.t; ARCHE = A; T.arche = A; T.dur = 2.6; T.vie = 20; T.bw = A.bw; c.d = 0.2; c.x = A.xs; c.y = A.yb + s * 0.42; }
  c.q = [T, fn(k => { k.gone = true; })];
  return c;
}
// sur l'arche : les chats y montent en galopant, et redescendent en glissant, assis, comme sur un toboggan
STEPS.arche = (c, T, dt) => {
  const A = ARCHE; if (!A || A.pret && Wd.t - A.pret > 14 && !T.u) return true;
  if (!A.pret) { c.anim = ANIMS.assis ? 'assis' : c.anim; c.face = T.rev ? -A.dir : A.dir; return T.t > 8; }   // (arrivé avant que l'arche soit finie : il attend au pied, assis)
  const s = sc(c); T.u = T.u || 0.001;
  const monte = T.u < 0.5; T.u += dt * (monte ? 0.2 : 0.2 + (T.u - 0.5) * 1.6);
  // (chacun monte par le bout le plus proche de lui : T.rev, il part de l'autre pied)
  const u = Math.min(1, T.u), D = T.rev ? -A.dir : A.dir, P = v => archePt(A, T.rev ? 1 - v : v), [x, y] = P(u), [x2, y2] = P(Math.min(1, u + 0.01));
  c.x = x; c.y = y - A.bw * 3.4; c.face = D; c.anim = monte ? 'galop' : (ANIMS.assis ? 'assis' : 'chute'); c.spin = Math.atan2(y2 - y, Math.abs(x2 - x)) * 0.7;
  if (!monte && !T.wi) { T.wi = 1; say(c, pick(['wiiiiiii !', 'youpiii ✨', 'wiiiii'])); etoiles(x, y - s * 0.5, 10); }
  if (!monte && Math.random() < dt * 14) Wd.fx.push({ k: 'etoile', x: x - D * s * 0.3, y: y - A.bw * 3, vx: -D * rnd(20, 80), vy: rnd(-60, -10), g: 120, frein: 1.5, t0: Wd.t, life: 0.9, col: pick(COUL), r: rnd(2.5, 4), tw: true });
  if (u >= 1) { c.fall = true; c.vx = D * s * 3.2; c.vy = -s * 1.6; c.spin = 0; if (window.Dex && Dex.vu) Dex.vu('toboggan'); later(0.6, () => say(c, pick(['encore !', 'hihi', 'on recommence ?']))); return true; }
  return false;
};
// la parade (le bouton arc-en-ciel) : trois (deux sur un téléphone), l'un après l'autre, à des hauteurs différentes ; la pièce tremble
function parade() {
  // (vague 180 de l'audit : « l'arc-en-ciel ») : au téléphone, les deux Nyan Cats volent plus bas, sous le carton « Découverte ! » posé sur le mur
  const n = Wd.mode === 'large' ? 3 : 2, dir = Math.random() < 0.5 ? 1 : -1, H0 = n === 2 && Wd.W < 600 ? [0.42, 0.14] : [0.75, 0.3, 0.55];
  for (let i = 0; i < n; i++) later(i * 0.7, () => { vol({ dir, h: H0[i], d: [0.05, 0.3, 0.15][i], dur: 4.2, boucle: i === 1 || n === 2 && i === 0 }); Wd.shake = { t0: Wd.t, a: 3 }; });
  // le bouquet : le dernier trace une arche immense d'un bout à l'autre de la pièce ; les chats de la maison courent dessus
  later(n * 0.7 + 1.4, () => { vol({ dir, arche: true, dur: 3 });
    const A = ARCHE; if (!A) return;
    const want = Wd.mode === 'large' ? 4 : 2, L = Wd.cats.filter(c => !c.temp && !c.nyan && !c.held && !c.hidden && !c.fall).sort((a, b) => Math.min(Math.abs(a.x - A.xs), Math.abs(a.x - A.xe)) - Math.min(Math.abs(b.x - A.xs), Math.abs(b.x - A.xe))).slice(0, want);
    // pas assez de chats libres : ceux d'à côté débarquent par le bord, exprès pour le toboggan (et repartent après)
    for (let i = L.length; i < want; i++) { const c = addCat({ temp: true, d: 0.2 }), g = i % 2 ? 1 : -1; c.x = g < 0 ? -sc(c) * 1.2 : Wd.W + sc(c) * 1.2; c.face = -g; c.visiteur = true; L.push(c); }
    const n = [0, 0];
    L.forEach((c, i) => { K.interrupt(c); const rev = Math.abs(c.x - A.xe) < Math.abs(c.x - A.xs), x0 = rev ? A.xe : A.xs, D = rev ? -A.dir : A.dir, k = n[+rev]++;
      c.q.push(K.go(x0 - D * sc(c) * (0.3 + k * 0.5), { d: 0.2, g: 'galop', face: D }), K.pose('assis', 0.2 + k * 0.7), { k: 'arche', air: true, rev });
      if (c.visiteur) c.q.push(K.pose('assis', 1.2), fn(k => K.leave(k)));
      if (!i) say(c, pick(['un pont !', 'ooh ✨', 'j’y vais !'])); }); });
  later(n * 0.7 + 6, miniNyan);
  later(0.4, () => Wd.fx.push({ k: 'txt', text: 'NYAN NYAN NYAN ♪', x: Wd.W / 2, y: (Wd.ceil || Wd.H * 0.3) + 20, t0: Wd.t, life: 2.2, rot: -0.06, size: 40 }));
}
// les rubans : dessinés sur la craie, par-dessus le décor ; un Nyan Cat attrapé au vol s'arrête (son ruban s'efface derrière lui)
H.draw.push(() => {
  const ctx = window.Chalk && Chalk.ctx; if (!ctx || Wd.a < 0.05) return; const now = Wd.t;
  for (let i = VOLS.length - 1; i >= 0; i--) { const V = VOLS[i]; coupe(V.P, now, V.vie); if (!V.P.length && !(V.c.task && V.c.task.P === V.P)) { VOLS.splice(i, 1); continue; } ruban(ctx, V.P, V.bw || Math.max(2.2, sc(V.c) * 0.035), now, Wd.a, V.dir, V.vie); }
  // (vague 43, l'audit : « l'arc-en-ciel », finition) : l'arche ne sort pas du plancher, elle naît d'un nuage de craie et finit dans un autre ;
  // chaque nuage gonfle quand l'arche le touche, se dégonfle quand elle s'en retire (et les chats du toboggan atterrissent dedans)
  const A = ARCHE; if (A && A.t0) { const r0 = A.bw * 4.2, p1 = A.pret ? A.pret : 1e9;
    [[A.xs, A.t0, A.t0 + 20], [A.xe, p1, p1 + 20]].forEach(([x, t1, t2], j) => { const g = Math.min(1, (now - t1) / 0.35), e = 1 - Math.min(1, Math.max(0, (now - t2 + 0.2) / 0.5)), k = g <= 0 ? 0 : (1 + 0.25 * Math.sin(Math.min(1, g) * Math.PI)) * Math.min(1, g) * e; if (k <= 0.02) return;
      const r = r0 * k, y = A.yb - r * 0.35, B = [[-1.3, 0.25, 0.62], [-0.5, -0.2, 0.85], [0.45, -0.28, 0.95], [1.3, 0.2, 0.66], [0, 0.35, 0.8]].map(([dx, dy, rr]) => [x + dx * r, y + dy * r, rr * r * (1 + 0.04 * Math.sin(now * 3 + dx * 4 + j))]);
      if (!PAP) { const c = getComputedStyle(document.body).backgroundColor; PAP = c && !/rgba\(.*,\s*0\)$|transparent/.test(c) ? c : 'rgb(237,236,231)'; }
      ctx.save(); ctx.globalAlpha = Wd.a; ctx.strokeStyle = `rgb(${(window.THEME && THEME.ink) || Chalk.INK || "40,40,48"})`; ctx.lineWidth = 4.4; B.forEach(([bx, by, br]) => { ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.stroke(); });
      ctx.fillStyle = PAP; B.forEach(([bx, by, br]) => { ctx.beginPath(); ctx.arc(bx, by, br - 0.2, 0, TAU); ctx.fill(); });
      if (window.Titles && Titles.bouche) Titles.bouche(ctx, c => B.forEach(([bx, by, br]) => { c.moveTo(bx + br, by); c.arc(bx, by, br, 0, TAU); }), PAP);
      ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5 * Wd.a; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.35, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); ctx.restore(); }); }
});
// (vague 100 de l'audit, « l'arc-en-ciel » vers 9,9) : la parade finie, un tout petit Nyan Cat surgit au bord de la barre des chapitres,
// court dessus d'un bout à l'autre et y laisse son arc-en-ciel : une frise de six couleurs, sous la barre, qui reste pour toute la visite.
// Au bout, il saute : il s'envole en diagonale et sort par le haut de l'écran, son ruban derrière lui.
const MINI = { m: null };
function frise() {
  const chap = document.getElementById('chap'); if (!chap) return null; let f = chap.querySelector('.frise-arc');
  if (!f) { f = document.createElement('i'); f.className = 'frise-arc'; f.setAttribute('aria-hidden', 'true'); chap.appendChild(f); }
  return f;
}
function miniNyan() {
  const chap = document.getElementById('chap'), bars = chap && [...chap.querySelectorAll('.bar')]; if (!bars || !bars.length || Wd.espace || MINI.m) return;
  const r0 = bars[0].getBoundingClientRect(), r1 = bars[bars.length - 1].getBoundingClientRect(), rc = chap.getBoundingClientRect(); if (!r0.width) return;
  const f = frise(); f.style.top = (r0.bottom - rc.top + 2) + 'px'; f.style.left = (r0.left - rc.left) + 'px';
  const w0 = parseFloat(f.dataset.w || 0); f.style.width = w0 + 'px';
  MINI.m = { x0: r0.left, x1: r1.right, y: r0.top, x: r0.left - 30, t0: Wd.t, v: Math.max(140, (r1.right - r0.left) / 4.5), P: [], ph: 'court', f, rc, w0 };
}
H.draw.push(() => {
  const M = MINI.m, ctx = window.Chalk && Chalk.ctx; if (!M || !ctx) return; const now = Wd.t, dt = Math.min(0.05, now - (M.tl ?? now)); M.tl = now;
  if (M.ph === 'court') { M.x += M.v * dt; const w = Math.max(M.w0, Math.min(M.x1 - M.x0, M.x - 14 - M.x0)); if (w > 0) { M.f.style.width = w + 'px'; M.f.dataset.w = w; }
    if (Math.random() < dt * 3) Wd.fx.push({ k: 'etoile', x: M.x - 16, y: M.y - 4, vx: -rnd(20, 60), vy: -rnd(40, 120), g: 160, t0: now, life: 0.8, col: pick(COUL), r: rnd(2, 3), tw: true });
    if (M.x >= M.x1 - 8) { M.f.style.width = (M.x1 - M.x0) + 'px'; M.f.dataset.w = M.x1 - M.x0; M.ph = 'saute'; M.vx = M.v * 1.2; M.vy = -Math.max(420, Wd.H * 0.7); M.x1 = M.x; if (window.Dex && Dex.vu) Dex.vu('frise');
      Wd.fx.push({ k: 'txt', text: 'nyan !', x: Math.min(Wd.W - 60, M.x), y: M.y - 34, t0: now, life: 1.2, rot: -0.2, size: 18 }); } }
  else { M.x += M.vx * dt; M.y += M.vy * dt; M.vy += 60 * dt; if (M.y < -40 || M.x > Wd.W + 40) M.dehors = true; }
  const y = M.y - 6 + (M.ph === 'court' ? Math.sin(now * 18) * 1.2 : 0);
  if (!M.dehors) M.P.push([M.x - 11, y, now]); coupe(M.P, now, M.ph === 'court' ? 0.35 : 0.9);
  if (Wd.a > 0.05 && !Wd.espace) { ctx.save(); ctx.globalAlpha = Wd.a; ruban(ctx, M.P, 1.3, now, 1, 1, 0.9);
    // le chat : un petit gâteau rose (les pépites), la tête devant, les pattes qui moulinent
    const ink = (window.THEME && THEME.ink) || Chalk.INK || '40,40,48', a = M.ph === 'court' ? 0 : Math.atan2(M.vy, M.vx) * 0.6; ctx.translate(M.x, y); ctx.rotate(a);
    ctx.strokeStyle = `rgb(${ink})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; const k = Math.floor(now * 12) % 2;
    ctx.beginPath(); [-7, -2, 3, 7].forEach((lx, i) => { const s = (i + k) % 2 ? 2 : -2; ctx.moveTo(lx, 4); ctx.lineTo(lx + s, 8); }); ctx.stroke();
    ctx.fillStyle = 'rgb(255,214,160)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-10, -6, 18, 11, 3) : ctx.rect(-10, -6, 18, 11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgb(255,153,204)'; ctx.fillRect(-8, -4, 14, 7); ctx.fillStyle = 'rgb(231,76,60)'; [[-6, -2], [-2, 1], [2, -2], [4, 1]].forEach(([px, py]) => ctx.fillRect(px, py, 1.5, 1.5));
    ctx.fillStyle = PAP || 'rgb(237,236,231)'; ctx.beginPath(); ctx.moveTo(5, -4); ctx.lineTo(7, -9); ctx.lineTo(9.5, -5); ctx.lineTo(12, -9); ctx.lineTo(14, -3); ctx.quadraticCurveTo(15.5, 3, 10, 3.5); ctx.quadraticCurveTo(5, 3.5, 5, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgb(${ink})`; ctx.beginPath(); ctx.arc(8.3, -1.5, 1, 0, TAU); ctx.arc(12, -1.5, 1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -1); ctx.quadraticCurveTo(-14, -4 + k * 3, -16, -1); ctx.stroke(); ctx.restore(); }
  if (M.dehors && !M.P.length) MINI.m = null;
});
// de temps en temps, un seul passe, sans prévenir (à tour de rôle avec les autres scénarios)
if (K.SCEN) K.SCEN.push(() => { if (Wd.mode !== 'large' && Math.random() < 0.5) return false; return vol() ? undefined : false; });

/* ——— dans l'espace ——— */
if (window.TrouNoir && TrouNoir.outils) {
  const O = TrouNoir.outils, { X, centreDe, rayon } = O;
  const part = (c, passes) => { const S = c.sp; Object.assign(S, { m: 'nyan', dir: S.vx ? sgn(S.vx) : (Math.random() < 0.5 ? 1 : -1), y0: centreDe(c)[1], passes: passes || (Math.random() < 0.5 ? 1 : 2), P: S.P || [], nt: 0 });
    if (S.y0 < O.HAUT() + 60) S.y0 = O.HAUT() + 60; if (S.y0 > O.BAS() - 60) S.y0 = O.BAS() - 60;
    // (29/09, 13 h 27 : jamais sur les sous-titres ; il passe dans le haut du ciel)
    const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande; if (bd && S.y0 > bd.y - 50) S.y0 = Math.max(O.HAUT() + 60, Math.min(bd.y - 50, O.HAUT() + (bd.y - O.HAUT()) * rnd(0.15, 0.45))); say(c, pick(['nyan !', 'nyaaan ✨', 'nya-nya-nyan ♪'])); if (window.Dex && Dex.vu) Dex.vu('nyanespace'); };
  X.mode.nyan = (c, dt) => {
    const S = c.sp, s = rayon(c) / 0.8, v = O.W / 3.2; c.anim = ANIMS.nage ? 'nage' : 'chute'; c.face = S.dir; S.nt += dt;
    const [x, y] = centreDe(c), ty = S.y0 + Math.sin(S.nt * 7) * s * 0.12;
    c.x += S.dir * v * dt; c.y += ty - y; c.spin = Math.sin(S.nt * 7) * 0.12; S.vx = S.dir * v; S.vy = 0;
    S.P.push([x - S.dir * s * 0.5, ty - s * 0.1, Wd.t]);
    // sorti d'un côté : il revient de l'autre (le ruban reste de ce côté-ci et s'efface) ; ses passages faits, il se remet à flotter, au milieu
    const sort = S.dir > 0 ? x > O.W + s * 1.3 : x < -s * 1.3;
    if (sort) { S.passes--; (S.vieux || (S.vieux = [])).push(S.P); S.P = []; c.x -= S.dir * (O.W + s * 2.6); const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande; S.y0 = clamp(S.y0 + rnd(-0.25, 0.25) * O.H, O.HAUT() + 60, bd ? Math.max(O.HAUT() + 60, bd.y - 50) : O.BAS() - 60); }
    if (S.passes <= 0 && Math.abs(x - O.W / 2) < O.W * 0.2) { S.m = 'derive'; S.next = Wd.t + rnd(2, 4); S.vx = S.dir * v * 0.25; S.w = rnd(-2, 2); S.anim = 'apesanteur'; }
  };
  X.envie.push(c => { if (reduit || (window.EspacePlume && EspacePlume.M && EspacePlume.M.sc) || Math.random() > 0.03 || Wd.cats.some(o => o.sp && o.sp.m === 'nyan')) return false; part(c); return true; });
  // les rubans : derrière les chats ; ils s'effacent même quand le chat a fini (ou qu'on l'a attrapé)
  X.fond.push((ctx, now) => {
    const t = Wd.t; Wd.cats.forEach(c => { const S = c.sp; if (!S) return;
      if (S.P) { coupe(S.P, t); if (S.P.length) ruban(ctx, S.P, Math.max(2.4, rayon(c) * 0.045), t, 1, 1); else if (S.m !== 'nyan') S.P = null; }
      if (S.vieux) { S.vieux = S.vieux.filter(P => { coupe(P, t); if (P.length) ruban(ctx, P, Math.max(2.4, rayon(c) * 0.045), t, 1, 1); return P.length; }); if (!S.vieux.length) S.vieux = null; } });
  });
  X.retour.push(() => Wd.cats.forEach(c => { if (c.sp) { c.sp.P = null; c.sp.vieux = null; } }));
  // un chat recraché par un petit trou blanc (un clic dans le vide) : une fois sur six, il sort en Nyan Cat
  X.pas.push(() => { Wd.cats.forEach(c => { const S = c.sp; if (!S || S.nyanVu || S.m !== 'derive' || !S.o) return; S.nyanVu = true; if (Math.random() < 0.17 && !reduit) part(c, 1); }); });
  var espace = { part };
}

return { vol, parade, espace, miniNyan, MINI };
})();
