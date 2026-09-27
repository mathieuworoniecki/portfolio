/* Les scénarios de plus (à tour de rôle avec la horde et la tour : js/chats.js, SCEN), et l'heure du visiteur.
   - Le colis : il descend du ciel en parachute ; les chats viennent renifler ; ouvert, une surprise en sort (un chaton, des pelotes, un poisson).
   - La mouche : elle bourdonne, tous les yeux la suivent ; les chats la chassent, sautent, claquent des pattes ;
     elle finit par se poser sur un nez (atchoum !) puis s'en va.
   - Le concert : trois ou quatre chats en rang, chacun son miaou, de plus en plus vite… et tous ensemble pour finir.
   - Le tunnel : trois cartons en file ; un chat fonce dedans. Retiré du tirage (les cartons surgissaient de nulle part et restaient) ; la fonction reste pour plus tard.
   - La vitre : un chat curieux s'approche tout près de l'écran (il grandit), pattes et truffe contre le verre (de la buée), puis repart.
   - Le passager : l'aspirateur passe… un chat lui saute dessus et fait le trajet assis sur le tuyau.
   - Les croquettes au vol : un chat saute et en attrape une en l'air.
   - L'heure du visiteur : à midi, la sieste ; le soir, la folie ; et quand on revient sur l'onglet après un moment, tout le monde dort. */
window.Scenarios = (() => {
if (!window.Chats || !Chats.K || !window.Vie) return null;
const K = Chats.K, { Wd, H, ANIMS, STEPS, I, rnd, pick, clamp, sgn, sm, c01, sc, front, sOf, floorAt, say, dust, interrupt, free, free4, claim, go, pose, hop, fn, later, inView, groundAt } = K;
const TAU = Math.PI * 2, V = Vie.V;
const word = (text, x, y, size, rot) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.4, rot: rot ?? rnd(-0.15, 0.15), size: size || 18 });
const idle = () => Wd.cats.filter(c => !c.temp && free4(c) && !c.hidden && c.x > 0 && c.x < Wd.W);
const zOver = 25000;

/* ——— le colis ——— */
// (27/09, Mathieu : « le cadeau, il n'y a rien après » : il s'ouvre tout seul s'il n'y a pas de curieux, en tremblant, et ça explose :
//  une gerbe d'étoiles, puis une vraie surprise — des chatons, une pluie de pelotes ou de poissons, un feu d'artifice, une fontaine de croquettes, un visiteur)
const SURPRISES = ['chatons', 'pelotes', 'poissons', 'artifice', 'croquettes', 'visiteur'];
const COUL = ['231,76,60', '241,196,15', '46,204,113', '52,152,219', '155,89,182', '230,126,34'];
// une gerbe : des étoiles de couleur qui partent en rond (grosses, qui scintillent, freinées comme un feu d'artifice) et des rayons de craie
function gerbe(x, y, n, v) { v = v || 420; for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd(-0.15, 0.15), r = rnd(0.6, 1) * v * 1.6; Wd.fx.push({ k: 'etoile', x, y, vx: Math.cos(a) * r, vy: Math.sin(a) * r, frein: 2.2, g: 90, r: rnd(4, 8), tw: 1, t0: Wd.t, life: rnd(1.2, 2), col: pick(COUL) }); }
  Wd.fx.push({ k: 'rayons', x, y, R: v * 0.45, t0: Wd.t, life: 0.55, n: 14 }); }
function drawRayons() { const C = Chalk; Wd.fx.forEach(e => { if (e.k !== 'rayons') return; const u = (Wd.t - e.t0) / e.life; if (u > 1) return;
  for (let i = 0; i < e.n; i++) { const a = i / e.n * TAU, r0 = e.R * (0.25 + u * 0.8), r1 = e.R * (0.45 + u * 1.1); C.stroke([[e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0], [e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1]], 1, { w: 2.4, a: (1 - u) * 0.9 * Wd.a, seed: 200 + i, tip: false, amp: 0.2 }); } }); }
function ouvre(b) {   // il tremble, il saute… et BOUM
  if (!Wd.props.includes(b) || b.ouvert) return; b.ouvert = true; b.busy = b.busy || { colis: 1 };
  [0, 0.45, 0.9].forEach((t, i) => later(t, () => { if (!Wd.props.includes(b)) return; b.wob = Wd.t; b.wobA = 1 + i; K.drop(b, 0, sOf(b.d) * (0.6 + i * 0.4), rnd(-2, 2)); word(['…', '!', '!!!'][i], b.x, b.y - b.s * (0.7 + i * 0.1), 20 + i * 6); }));
  later(1.5, () => { if (!Wd.props.includes(b)) return; b.spot = [b.fx, b.d]; K.unprop(b); });
}
function colis(vite) {
  const d = rnd(0.25, 0.5), s = sOf(d), fx = pick([0.3, 0.42, 0.58, 0.7]) + rnd(-0.03, 0.03);
  const b = K.prop('caisse', fx, d, { size: 2 }); b.launched = Wd.t; b.fall = true; b.lift = vite ? Wd.H * 0.5 : Wd.H; b.vy = -s * 0.5; b.para = true; b.surprise = pick(SURPRISES); b.zo = 60;
  later(1.2, () => { const c = idle()[0]; if (c) say(c, pick(['?!', 'un colis !', 'oh ?'])); });
}
H.pre.push(dt => Wd.props.slice().forEach(b => {
  if (b.para) {
    if (b.fall && b.vy < 0) { b.vy = Math.max(b.vy, -b.s * 1.1); b.tilt = Math.sin(Wd.t * 2.3) * 0.12; b.tiltV = 0; b.vx = Math.sin(Wd.t * 0.9) * b.s * 0.15; }
    if (!b.fall) { b.para = false; b.tilt = 0; word('ploc', b.x, b.y - b.s * 0.5); dust(b.x, b.y, b.s * 0.4, 0.8);
      // on vient voir : deux curieux, tapis devant ; le plus hardi l'ouvre
      b.ouvreT = Wd.t + 6;   // personne ne l'ouvre ? il s'ouvre tout seul
      idle().slice(0, 2).forEach((c, i) => { interrupt(c); c.q = [fn(c => { const w = K.beside(c, b.x, sc(c) * 0.4); c.q.unshift(go(inView(w.x), { d: Math.max(0, b.d - 0.06), face: w.face })); }), pose('affut', rnd(1, 2)), ...(i === 0 ? [fn(c => { if (Wd.props.includes(b) && !b.busy) K.open(c, b); })] : [pose('assis', 2)])]; });
    }
  }
  if (b.surprise && !b.fall && b.kind === 'caisse') { b.spot = [b.fx, b.d]; if (b.ouvreT && Wd.t > b.ouvreT && !b.held && (!b.busy || b.busy.colis)) ouvre(b); }
}));
// ouvert (le carton remplace la caisse) : la surprise en sort
const seen = new Set();
H.post.push(() => {
  Wd.props.forEach(b => { if (b.surprise) seen.add(b); });
  seen.forEach(b => {
    if (Wd.props.includes(b)) return; seen.delete(b); if (b.suck || b.swept || !b.spot) return;
    jaillit(b.spot[0] * Wd.W, b.spot[1], b.surprise);
  });
});
function jaillit(x, d, quoi) {
  const s = sOf(d), y = floorAt(d) - s * 0.5, fx = x / Wd.W;
  Wd.shake = { t0: Wd.t, a: 6 }; dust(x, floorAt(d), s * 0.9, 1); gerbe(x, y, 40, 520);
  word(pick(['SURPRISE !', 'TA-DAAA !', 'BOUM !']), x, y - s * 1.1, 52, -0.08); later(0.25, () => gerbe(x + rnd(-1, 1) * s, y - s * 0.8, 24, 300));
  // tout le monde sursaute et regarde
  Wd.cats.forEach(c => { if (c.rare || c.held || c.fall || !c.hp || Math.abs(c.x - x) > Wd.W * 0.6 || !free4(c)) return; interrupt(c); c.q = [pose('sursaut', 0.6), pose('affut', rnd(1, 2), { face: sgn(x - c.x) || c.face })]; if (Math.random() < 0.5) later(0.3, () => say(c, pick(['oooh !', 'waouh', '!!']))); });
  const lance = (kind, n, v) => { for (let i = 0; i < n; i++) later(i * 0.12, () => { const it = K.prop(kind, clamp(fx + rnd(-0.02, 0.02), 0.03, 0.97), clamp(d + rnd(-0.12, 0.05), 0, 1)); it.launched = Wd.t; it.fall = true; it.lift = s * 0.4; it.vy = s * rnd(3, 4.5) * (v || 1); it.vx = rnd(-1.8, 1.8) * s; it.tiltV = rnd(-6, 6); }); };
  if (quoi === 'chatons' || quoi === 'chaton') { const n = Math.max(1, Math.min(3, K.MAXC + 4 - Wd.cats.length)); for (let i = 0; i < n; i++) later(i * 0.25, () => { const k = K.addCat({ id: 'chaton', x, d }); k.y = floorAt(d) - s * 0.3; k.fall = true; k.vy = -s * rnd(3, 4.2); k.vx = (i - (n - 1) / 2) * s * 1.4 + rnd(-0.3, 0.3) * s; k.spin = rnd(-1, 1); k.stay = rnd(50, 90); say(k, pick(['mia !', 'miaou !', 'coucou !'])); }); }
  else if (quoi === 'pelotes') lance('pelote', 6);
  else if (quoi === 'poissons' || quoi === 'poisson') { lance('poisson', 3); for (let i = 0; i < 6; i++) later(0.6 + i * 0.2, () => { const it = K.prop('poisson', rnd(0.15, 0.85), rnd(0.1, 0.5)); it.launched = Wd.t; it.fall = true; it.lift = Wd.H; it.vy = 0; it.tiltV = rnd(-4, 4); }); later(0.8, () => word('il pleut des poissons !', Wd.W / 2, (Wd.ceil || Wd.H * 0.3) + 40, 24)); }
  else if (quoi === 'artifice') { for (let i = 0; i < 6; i++) later(0.3 + i * 0.35, () => { const ax = Wd.W * rnd(0.2, 0.8), ay = (Wd.ceil || Wd.H * 0.25) + rnd(20, 140); gerbe(ax, ay, 34, 380); word(pick(['boum', 'pchiii', 'paf !']), ax, ay - 20, 18); }); later(0.6, () => Wd.cats.forEach(c => { if (!c.rare && c.hp && Math.random() < 0.6) say(c, pick(['oooh', 'aaah', '✨'])); })); }
  else if (quoi === 'croquettes') { const k = Wd.s0 / 160; for (let i = 0; i < 45 && Wd.kib.length < 140; i++) Wd.kib.push({ x, y: y - s * 0.2, vx: rnd(-520, 520) * k, vy: -rnd(500, 1000) * k, d: rnd(0, 0.12), t0: Wd.t + i * 0.02, rest: false, spin: Math.random() * 6 }); word('miam !!!', x, y - s * 1.3, 26); }
  else if (quoi === 'visiteur' && window.Rares && Rares.lance) later(0.4, () => Rares.lance(pick(['geant', 'ballon', 'totem', 'acrobate', 'eclair', 'interminable'])));
}
function drawParachutes() {
  const C = Chalk; Wd.props.forEach(b => { if (!b.para || b.a < 0.1) return; const s = b.s, w = b.box.w * s, top = b.y - b.box.h * s, cx = b.x + Math.sin(Wd.t * 2.3) * s * 0.1, cy = top - s * 0.95, R = s * 0.7, P = [];
    for (let i = 0; i <= 24; i++) { const q = Math.PI + i / 24 * Math.PI; P.push([cx + Math.cos(q) * R, cy + Math.sin(q) * R * 0.6]); }
    for (let i = 0; i <= 4; i++) { const q = i / 4; P.push([cx + R - q * 2 * R, cy + Math.sin(q * Math.PI * 4) * s * 0.03]); }
    C.stroke(P, 1, { w: 2, a: 0.85 * b.a, seed: 61, tip: false });
    [-1, -0.35, 0.35, 1].forEach((k, i) => C.line(cx + k * R, cy, b.x + (k < 0 ? -w / 2 : w / 2) * Math.min(1, Math.abs(k) + 0.3), top, 1, { w: 1, a: 0.6 * b.a, seed: 62 + i, tip: false, amp: 0.2 })); });
}

/* ——— la mouche ——— */
function mouche() {
  const side = Math.random() < 0.5 ? -1 : 1;
  Wd.mouche = { x: side < 0 ? -20 : Wd.W + 20, y: (Wd.ceil || Wd.H * 0.3) + 60, vx: 0, vy: 0, t0: Wd.t, end: Wd.t + rnd(22, 30), tgt: null, nose: null, landT: 0 };
}
const M = () => Wd.mouche;
const flyAim = () => { const m = M(); return m ? [m.x, m.y] : [0, 0]; };
flyAim.alive = () => !!M() && !M().nose;
flyAim.caught = c => { const m = M(); if (!m) return; m.vx = rnd(-1, 1) * 600; m.vy = -500; word('bzz !', m.x, m.y - 14, 15); };
H.pre.push(dt => {
  const m = M(); if (!m) return; const fl = Wd.floor, top = (Wd.ceil || 0) + 30;
  if (m.nose) {
    // posée sur un nez : il louche… et éternue
    const c = m.nose; if (!Wd.cats.includes(c) || !c.hp || c.held) { m.nose = null; }
    else { m.x = c.hp[0] + c.face * sc(c) * 0.03; m.y = c.hp[1] - sc(c) * 0.02; if (Wd.t - m.landT > 2.2) { m.nose = null; m.vy = -600; m.vx = rnd(-400, 400); c.q.unshift(pose('eternue', 1.6)); c.task = null; later(0.6, () => say(c, 'ATCHOUM !')); m.bye = Wd.t + 3; } return; }
  }
  if (!m.tgt || Math.hypot(m.tgt[0] - m.x, m.tgt[1] - m.y) < 30 || Math.random() < dt * 0.4) m.tgt = Wd.t > m.end || (m.bye && Wd.t > m.bye) ? [m.x < Wd.W / 2 ? -80 : Wd.W + 80, top + 40] : [rnd(0.1, 0.9) * Wd.W, rnd(top + 20, fl - 60)];
  const ax = (m.tgt[0] - m.x) * 3 + Math.sin(Wd.t * 13) * 900, ay = (m.tgt[1] - m.y) * 3 + Math.cos(Wd.t * 11) * 900;
  m.vx = (m.vx + ax * dt) * Math.exp(-dt * 2); m.vy = (m.vy + ay * dt) * Math.exp(-dt * 2); m.x += m.vx * dt; m.y = clamp(m.y + m.vy * dt, top, fl - 10);
  if ((Wd.t > m.end || m.bye) && (m.x < -60 || m.x > Wd.W + 60)) { Wd.mouche = null; return; }
  // elle se pose sur le nez d'un chat assis
  if (!m.bye && Wd.t - m.t0 > 9 && Math.random() < dt * 0.2) { const c = Wd.cats.find(c => c.hp && !c.hidden && !c.rare && !c.perch && !(c.task && c.task.air) && /assis|pain|debout/.test(c.anim) && Math.abs(c.hp[0] - m.x) < 200); if (c) { m.nose = c; m.landT = Wd.t; interrupt(c); c.q = [pose('assis', 3)]; c.task = null; } }
  if (Wd.t > (m.buzz || 0)) { m.buzz = Wd.t + rnd(1.5, 3); word(pick(['bzzz', 'bzz', 'zzzz']), m.x + 12, m.y - 12, 13); }
});
// les yeux suivent la mouche ; qui aime jouer la chasse
H.live.push(c => { const m = M(); if (!m || c.hidden || !c.hp || c.tgt[I.eyes] >= 0.5) return; const dx = m.x - c.hp[0], dy = m.y - c.hp[1];
  if (m.nose === c) { c.tgt[I.px] = 0; c.tgt[I.py] = -1; c.tgt[I.htilt] = Math.sin(Wd.t * 9) * 0.05; return; }
  if (Math.hypot(dx, dy) < Wd.W * 0.5) { c.tgt[I.px] = clamp(dx / (sc(c) * 1.2), -1, 1) * c.face; c.tgt[I.py] = clamp(-dy / (sc(c) * 1.2), -1, 1); } });
H.post.push(() => {
  const m = M(); if (!m || m.nose || Wd.t < (m.chk || 0)) return; m.chk = Wd.t + 0.6;
  idle().forEach(c => { if ((c.task && c.task.k === 'chasse') || Math.abs(c.x - m.x) > sc(c) * 4 || Math.random() > 0.15 * (0.5 + c.ch.joue * 0.4)) return; interrupt(c); c.q = [{ k: 'chasse', max: rnd(5, 10), aim: flyAim }]; });
});
function drawFly() {
  const m = M(); if (!m) return; const C = Chalk, ctx = C.ctx; if (!ctx) return; const f = Math.sin(Wd.t * 60) * 0.5 + 0.5;
  C.dot(m.x, m.y, 2.6, 0.9 * Wd.a); ctx.save(); ctx.strokeStyle = `rgba(${(window.THEME && THEME.ink) || Chalk.INK},${0.6 * Wd.a})`; ctx.lineWidth = 1;
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(m.x + s * 3, m.y - 3, 3.2, 1.6 + f * 1.4, s * 0.6, 0, TAU); ctx.stroke(); }); ctx.restore();
}

/* ——— le concert ——— */
function concert() {
  const dispo = Wd.cats.filter(c => !c.temp && !c.held && !c.fall && !c.jump && !c.perch && !c.hidden && !c.fight && !c.sulk && c.x > 0 && c.x < Wd.W);
  const L = (idle().length >= 3 ? idle() : dispo).slice(0, Wd.mode === 'large' ? 4 : 3); if (L.length < 2) return false;   // à deux, c'est un duo
  const C = Wd.concert = { L, t0: Wd.t, on: false, beat: 0, next: 0 }; Wd.busyScen = true;
  const mid = Wd.W * 0.5, gap = Math.min(Wd.W * 0.8 / L.length, Wd.s0 * 1.3);
  L.sort((a, b) => a.x - b.x).forEach((c, i) => { interrupt(c); const x = mid + (i - (L.length - 1) / 2) * gap;
    c.q = [go(inView(x), { d: 0.1, g: 'trot' }), { k: 'concert', C, i, face: i < L.length / 2 ? 1 : -1 }]; });
  later(1.5, () => say(L[0], pick(['un, deux…', 'la la ?'])));
}
STEPS.concert = (c, T) => {
  const C = T.C; if (Wd.concert !== C) return true; c.face = T.face;
  if (!C.on) { c.anim = 'assis'; return false; }
  const solo = C.who === c || C.who === 'tous';
  c.anim = solo && Wd.t - C.beatT < 0.55 ? 'miaule' : 'assis';
  if (!solo && C.who && C.who.hp && c.tgt) c.face = sgn(C.who.x - c.x) || c.face;
  return C.done;
};
H.pre.push(() => {
  const C = Wd.concert; if (!C) return;
  if (!C.on) { if (C.L.every(c => c.task && c.task.k === 'concert') || Wd.t - C.t0 > 10) { C.on = true; C.next = Wd.t + 0.6; C.beat = 0; } return; }
  if (C.L.some(c => !Wd.cats.includes(c) || c.held)) C.done = true;
  if (!C.done && Wd.t > C.next) {
    const n = C.L.length, round = Math.floor(C.beat / n), tempo = [0.75, 0.55, 0.38][Math.min(2, round)];
    if (round >= 3) { C.who = 'tous'; C.beatT = Wd.t; C.L.forEach(c => { c.q.length = 0; }); word('MIAOUUU ♪♫', Wd.W / 2, floorAt(0.1) - Wd.s0 * 1.4, 28, -0.05); C.next = Wd.t + 1.4; C.beat = -99; later(1.4, () => { C.done = true; Wd.busyScen = false; C.L.forEach(c => { if (Wd.cats.includes(c)) c.q = [pose('assis', 1, { fx: c => say(c, pick(['bravo !', 'merci', '♥'])) })]; }); Wd.concert = null; }); return; }
    if (C.beat < 0) return;
    const c = C.L[C.beat % n]; C.who = c; C.beatT = Wd.t; C.beat++; C.next = Wd.t + tempo;
    if (c.hp) Wd.fx.push({ k: 'txt', text: pick(['♪', '♫', 'miaou', '♪ mia']), x: c.hp[0], y: c.hp[1] - sc(c) * 0.5, t0: Wd.t, life: 1.2, rot: rnd(-0.2, 0.2), size: 18 });
  }
  if (C.done && Wd.concert === C) { Wd.concert = null; Wd.busyScen = false; }
});

/* ——— le tunnel de cartons ——— */
function tunnel() {
  const d = 0.22, s = sOf(d), w = 0.56 * 1.25 * s, n = 3, span = w * 0.95 * (n - 1) + w;
  // la place la plus dégagée (pas sur le distributeur, ni sur les autres objets)
  let x0 = Wd.W * 0.3, best = 1e9;
  for (let i = 0; i < 14; i++) { const x = Wd.W * rnd(0.08, 0.92) - span / 2; if (x < w || x + span > Wd.W - w) continue;
    const hit = Wd.props.reduce((a, p) => a + (!p.fall && Math.abs(p.d - d) < 0.3 && p.x > x - w * 0.8 && p.x < x + span + w * 0.8 ? (p.kind === 'distrib' || p.kind === 'trappe' ? 5 : 1) : 0), 0);
    if (hit < best) { best = hit; x0 = x + w / 2; } }
  const cats = idle(); if (!cats.length) return false; const c = cats.sort((a, b) => b.ch.fou + b.ch.carton - a.ch.fou - a.ch.carton)[0];
  const boxes = []; for (let i = 0; i < n; i++) { const b = K.prop('carton', (x0 + i * w * 0.95) / Wd.W, d); b.big = 1.25; b.launched = Wd.t; b.fade = 0; b.fadeT = 1; b.yaw = Math.PI / 2 + 0.3; b.tun = true; boxes.push(b); }
  dust(x0 + w, floorAt(d), s, 0.8); word(pick(['un tunnel !', 'oh !']), x0 + w, floorAt(d) - s, 20);
  interrupt(c); const a = x0 - w * 1.2, bx = x0 + (n - 1) * w * 0.95 + w * 1.2;
  c.q = [go(inView(a), { d, g: 'trot', face: 1 }), pose('affut', 1.2, { face: 1 }), { k: 'tunnel', boxes, to: bx, dir: 1, air: false }, pose('affut', 0.8, { face: -1 }), { k: 'tunnel', boxes, to: a, dir: -1 }, pose('assis', 1.5, { fx: c => say(c, pick(['encore !', 'tadaa', 'mrrp !'])) })];
}
STEPS.tunnel = (c, T, dt) => {
  const v = K.SPEED.galop * sc(c) * 0.9; c.face = T.dir; c.anim = 'galop'; c.x += T.dir * v * dt;
  const inside = T.boxes.find(b => Wd.props.includes(b) && Math.abs(c.x - b.x) < b.hull.w / 2 * b.s * 0.85);
  c.hidden = inside ? 1 : 0; if (inside && inside !== T.last) { T.last = inside; inside.wob = Wd.t; inside.tilt = 0.08 * T.dir; later(0.15, () => { if (Wd.props.includes(inside)) inside.tilt = 0; }); word(pick(['brrr', 'tap tap', '…']), inside.x, inside.y - inside.s * 0.45, 14); }
  if (T.dir * (T.to - c.x) <= 0 || c.x < -50 || c.x > Wd.W + 50) { c.hidden = 0; c.x = inView(c.x); return true; }
  return false;
};

/* ——— la vitre ——— */
ANIMS.vitre = (c, p, t) => { ANIMS.dresse(c, p, 0); p[I.fl] = 2.2 + Math.sin(t * 2) * 0.1; p[I.fr] = 2.35 - Math.sin(t * 2) * 0.1; p[I.fk] = p[I.fk2] = 1.1; p[I.look] = 1; p[I.hnod] = 0; p[I.py] = 0; p[I.px] = Math.sin(t * 0.8) * 0.5; p[I.eyes] = (t % 3) < 0.15 ? 1 : 0; p[I.mouth] = 0; p[I.tailWave] = 0.8; };
function vitre() {
  const c = idle().sort((a, b) => Math.abs(a.x - Wd.W / 2) - Math.abs(b.x - Wd.W / 2))[0]; if (!c) return false;
  interrupt(c); const x = Wd.W * rnd(0.35, 0.65);
  c.q = [go(inView(x), { d: 0 }), pose('assis', 0.8, { fx: c => say(c, '?') }), { k: 'vitre', dur: rnd(5, 7), air: true }, pose('assis', 1)];
}
STEPS.vitre = (c, T, dt) => {
  if (T.z0 === undefined) { T.z0 = c.zo; c.zo = zOver; }
  const u = T.t, zin = sm(u / 0.9), zout = sm((u - T.dur + 0.9) / 0.9), z = 1 + 1.4 * zin * (1 - zout); c.zoom = z;
  c.anim = z > 1.15 ? 'vitre' : 'assis'; c.y = floorAt(c.d) + (z - 1) * sc(c) * 0.25;
  // la buée : les pattes, puis la truffe, contre le verre
  if (!T.fog && u > 1.2 && c.hp) { T.fog = 1; const s = sc(c) * z; V.push({ k: 'buee', x: c.hp[0], y: c.hp[1] + s * 0.05, r: s * 0.09, t0: Wd.t, life: 7 }); say(c, pick(['mrrp ?', 'coucou', '…'])); }
  if (!T.paws && u > 0.95) { T.paws = 1; later(0.1, () => { if (!c.legs) return; ['fl', 'fr'].forEach(k => { const f = Chat.where(c, c.legs[k].foot); V.push({ k: 'buee', x: f[0], y: f[1], r: sc(c) * 0.07, t0: Wd.t, life: 6, paw: 1 }); }); }); }
  if (u >= T.dur) { c.zoom = 1; c.zo = T.z0; c.y = floorAt(c.d); return true; }
  return false;
};
H.live.push(c => { if (c.zoom && c.zoom !== 1) c.s *= c.zoom; });
function drawFog() {
  const ctx = Chalk.ctx; if (!ctx) return;
  V.forEach(f => { if (f.k !== 'buee') return; const u = (Wd.t - f.t0) / f.life, a = (1 - sm((u - 0.5) / 0.5)) * Wd.a; if (u < 0) return;
    ctx.save(); ctx.globalAlpha = a; const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 1.6); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 1.6, 0, TAU); ctx.fill();
    if (f.paw) { ctx.fillStyle = 'rgba(120,120,125,0.18)'; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 0.55, f.r * 0.45, 0, 0, TAU); ctx.fill(); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(f.x + i * f.r * 0.5, f.y - f.r * 0.6, f.r * 0.2, 0, TAU); ctx.fill(); } }
    ctx.restore(); });
}

/* ——— le passager de l'aspirateur ——— */
H.post.push(() => {
  const Vc = Wd.vac; if (!Vc || Vc.ph !== 'balaye' || Vc.rider !== undefined) return;
  Vc.rider = null; if (Math.random() > 0.5) return;
  const c = idle().filter(c => (c.x - Vc.x) * Vc.dir > 0).sort((a, b) => b.ch.fou - a.ch.fou)[0]; if (!c) return;
  Vc.rider = c; interrupt(c); c.q = [{ k: 'passager', air: true, V: Vc }];
});
STEPS.passager = (c, T, dt) => {
  const Vc = T.V, s0 = Wd.s0; if (T.z0 === undefined) { T.z0 = c.zo; c.zo = zOver; }
  if (Wd.vac !== Vc || Vc.ph === 'remonte') { c.zo = T.z0; c.q.unshift(hop(() => groundAt(inView(c.x + sc(c) * 0.5), rnd(0, 0.3)), { h: sc(c) * 0.4 }), pose('assis', 1, { fx: c => say(c, pick(['encore !', 'wouhou'])) })); return true; }
  const tx = Vc.x, ty = Vc.y - s0 * 0.36;
  if (!T.on) { if (!T.j) T.j = { x0: c.x, y0: c.y, t: 0 }; T.j.t += dt; const u = Math.min(1, T.j.t / 0.55); c.anim = 'saut'; c.face = sgn(tx - T.j.x0) || 1;
    c.x = T.j.x0 + (tx - T.j.x0) * u; c.y = T.j.y0 + (ty - T.j.y0) * u - Math.sin(u * Math.PI) * sc(c) * 0.6; if (u >= 1) { T.on = 1; say(c, pick(['wiii !', 'en voiture !', 'yahou'])); } return false; }
  c.x = tx; c.y = ty; c.face = Vc.dir; c.anim = 'assis'; return false;
};

/* ——— les croquettes au vol ——— */
H.post.push(() => {
  if (Wd.t < (Wd.volChk || 0)) return; Wd.volChk = Wd.t + 0.1;
  for (const k of Wd.kib) {
    if (k.rest || k.gone || k.swept || k.suck || Wd.t < k.t0 || k.vy < -120 || k.vy > 200) continue;
    const c = Wd.cats.find(c => free4(c) && !c.temp && !c.perch && Wd.t - (c.volT ?? -9) > 4 && (c.ch.joue + c.ch.mange) > 2 && Math.abs(c.x - k.x) < sc(c) * 0.8 && floorAt(c.d) - k.y > sc(c) * 0.6 && floorAt(c.d) - k.y < sc(c) * 1.7);
    if (!c || Math.random() > 0.35) continue;
    c.volT = Wd.t; interrupt(c); c.face = sgn(k.x - c.x) || c.face; const h = floorAt(c.d) - k.y - sc(c) * 0.4, x = inView(k.x), d = c.d;
    c.q = [hop(() => groundAt(x, d), { h, dur: 0.5 }), pose('mange', 0.8, { fx: c => say(c, pick(['hop ! crounch', 'attrapée !', 'miam'])) })];
    later(0.25, () => { k.gone = true; }); break;
  }
});

/* ——— l'heure du visiteur ——— */
const hour = () => new Date().getHours();
H.think.push((c, add) => {
  const h = hour();
  if (h >= 12 && h < 14) add(c.ch.dort * 2.5, () => c.q.push(pose(pick(['pain', 'dodo']), rnd(10, 20), { zzz: 1 }), pose('etirement', 3)));
  if (h >= 19 && h < 23) add(c.ch.fou * 1.5 + 0.4, () => K.zoomies(c));
});
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = performance.now(); else if (hiddenAt && performance.now() - hiddenAt > 40000) Wd.retour = true; });
H.pre.push(() => {
  if (!Wd.retour) return; Wd.retour = false;
  // on revient : tout le monde dort (là où il est), puis se réveille peu à peu, en bâillant
  Wd.cats.forEach(c => { if (c.held || c.fall || c.hidden || c.temp) return; interrupt(c); c.task = null; c.q = [pose('dodo', rnd(5, 12), { zzz: 1 }), pose('baille', 1.7), pose('etirement', 3)]; });
});

/* ——— la craie d'ici ——— */
H.draw.push(() => { drawParachutes(); drawFog(); drawFly(); drawRayons(); });

K.SCEN.push(colis, mouche, concert, vitre);
return { colis, mouche, concert, tunnel, vitre, gerbe, jaillit };
})();
