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
  if (Wd.t - (o.squashT ?? -9) < 2.5 || o.held || o.gone || o.hidden) return;   // caché (carton, coussin) : le géant passe dessus sans le voir o.squashT = Wd.t;
  if (o.perch || o.jump) { interrupt(o); o.hidden = 0; o.fall = true; o.vx = dir * sc(o) * rnd(3, 5); o.vy = -sc(o) * rnd(3, 5); say(o, pick(['waaah !', 'miaaa !'])); return; }
  interrupt(o); o.fall = false; o.pet = null;
  o.q = [pose('ecrase', 1.35, { fx: o => word(pick(['splotch', 'plof', 'crouiik']), o.x, o.y - sc(o) * 0.4, 18) }), pose('secoue', 0.55), pose(pick(['boude', 'assis', 'etourdi']), rnd(1.5, 2.5), { fx: o => say(o, pick(['…', 'aïe', 'pfff', '@_@'])) })];
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
  c.q = [{ k: 'rouleau', dir, Rb, air: true }, fn(c => { c.gone = true; })];
  later(0.6, () => watchers(Wd.W / 2, 6).forEach(o => { interrupt(o); o.q = [pose('affut', rnd(0.8, 1.6), { face: -dir, fx: o => say(o, pick(['!!', 'oh non', '?!'])) })]; }));
  return c;
}
STEPS.rouleau = (c, T, dt) => {
  const v = Math.max(Wd.W / 6.5, T.Rb * 1.4); c.x += T.dir * v * dt; c.anim = 'rouleau'; c.face = T.dir;
  const roll = c.x / T.Rb; c.spin = -roll * c.face;
  // posé sur son point le plus bas (le corps rond, ou la tête quand elle passe dessous) : mesuré sur l'image d'avant
  if (c.hp) { const b = Chat.where(c, c.body), low = Math.max(b[1] + c.b.body[1] * sc(c) * 1.05, c.hp[1] + c.b.head[0] * sc(c) * 1.1);
    T.off = (T.off || 0) - (low - floorAt(c.d)) * 0.8; }
  c.y = floorAt(c.d) + (T.off || 0);
  if ((T.bT = (T.bT || 0) + dt) > 0.45) { T.bT = 0; dust(c.x - T.dir * T.Rb * 0.6, floorAt(c.d), T.Rb * 0.5, 1); word(pick(['BOUM', 'boum', 'roule roule', 'BADABOUM']), c.x, floorAt(c.d) - T.Rb * 2.4, 26); }
  // devant lui : les chats, écrasés ; les objets légers valsent, les lourds s'aplatissent
  Wd.cats.forEach(o => { if (o !== c && !o.rare && Math.abs(o.x - c.x) < T.Rb * 0.7 && sgn(o.x - c.x) !== -T.dir) squash(o, T.dir); });
  Wd.props.forEach(it => { if (it.mur || it.held || it.gHit === c || Math.abs(it.x - c.x) > T.Rb * 0.8 || !Wd.props.includes(it)) return; it.gHit = c;
    if (LOURD[it.kind] || it.kind === 'distrib') it.sqT = Wd.t; else { kick(it, T.dir); if (it.fall) { it.vx *= 2.2; it.vy *= 1.4; } } });
  return T.dir > 0 ? c.x > Wd.W + T.Rb * 2.4 : c.x < -T.Rb * 2.4;
};

/* ——— l'interminable ——— */
// si long que le moindre angle du dos le fait pencher d'un mètre : le dos reste bien à plat
ANIMS.longPas = (c, p, t) => { ANIMS.pas(c, p, t); p[I.pitch] = 0; p[I.look] = 0.9; };
ANIMS.longPain = (c, p, t) => { ANIMS.pain(c, p, t); p[I.pitch] = 0; p[I.y] = c.D.h * 0.95; };
function interminable() {
  const d = 0.22, c = spawn('interminable', { d, face: 1 }), len = c.b.body[0] * 2 + 0.6;
  c.b.s = Math.max(Wd.W * 1.3, 1000) / len / sOf(d); const half = c.b.body[0] * sc(c); c.x = -half - sc(c) * 0.5; c.zo = 0;
  c.q = [{ k: 'defile', half, air: true }, fn(c => { c.gone = true; })];
  return c;
}
STEPS.defile = (c, T, dt) => {
  c.y = floorAt(c.d); c.face = 1; const v = Wd.W / 10;
  if (!T.ph) {   // il entre… et entre encore
    c.anim = 'longPas'; c.x += v * dt;
    if (!T.said && c.x + T.half > Wd.W * 0.3) { T.said = 1; say(c, pick(['bonjour', 'pardon…', 'je passe'])); }
    if (c.x + T.half > Wd.W * 0.94) { T.ph = 1; T.t1 = T.t; say(c, pick(['euh…', 'je fais une pause', 'mrr'])); }
  } else if (T.ph === 1) {   // couché en travers : il bloque le passage ; les autres sautent par-dessus
    c.anim = 'longPain';
    if (!T.hops) { T.hops = 1; watchers(Wd.W / 2, 3).forEach((o, i) => { const x = clamp(o.x, Wd.W * 0.1, Wd.W * 0.9);
      interrupt(o); o.q = [go(x, { d: 0.02 }), pose('affut', 0.5 + i * 0.4, { face: 1, fx: o => say(o, pick(['hé !', 'pardon ?', 'pfff'])) }),
        hop(() => groundAt(x, 0.5), { h: sc(c) * 0.35 + sc(o) * 0.5 }), pose('assis', 1, { fx: o => say(o, 'hop') })]; }); }
    if (T.t - T.t1 > 8) { T.ph = 2; say(c, pick(['bon, j\'y vais', 'à plus'])); }
  } else {   // et il repart… sans fin
    c.anim = 'longPas'; c.x += v * 1.8 * dt;
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
  Wd.props.forEach(it => { if (it.fall || it.held || it.mur || it.zoomT === T || LOURD[it.kind] || it.kind === 'distrib' || Math.abs(it.x - c.x) > sc(c) * 0.6) return; it.zoomT = T; kick(it, T.dir); if (it.fall) { it.vx *= 2.5; it.vy *= 1.5; } });
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
  c.x = top[0] + w; c.y = b.y - sc(b) * (T.i === 1 ? 0.52 : 0.46); c.face = b.face; c.anim = T.i === 3 ? 'coucou' : 'assis';
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
H.live.push(c => { if (!c.fil || !(c.task && c.task.k === 'fil')) return; const n = Chat.where(c, c.headA, [-c.b.head[0] * 0.45, c.b.head[1] * 0.75, 0]); c.x += c.fil.x - n[0]; c.y += c.fil.y - n[1]; });

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
  geant(c, o, z) { rebond(o, z, 1.6); word(pick(['BOING', 'boiing']), o.x, o.y - 30, 26); if (Wd.t - (c.saidT ?? -9) > 1.5) { c.saidT = Wd.t; say(c, pick(['hihi', 'ça chatouille', 'hé ho'])); } },
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

return { ...LIST, lance: go1, R };
})();
