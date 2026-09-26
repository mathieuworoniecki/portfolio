/* Les objets vivants, les effets, les sons : branchés sur js/chats.js par ses crochets (Chats.K.H), comme js/vie.js.
   - La pelote se dévide en roulant (elle maigrit, son fil s'allonge) ; un joueur finit emmêlé dedans. Elle se rembobine à sa place.
   - La tasse tombée se casse (crac !) : des éclats au sol, et le coupable regarde ailleurs en sifflotant. Elle revient, entière, un moment après.
   - La plante se fait mâchouiller : une feuille tombe en tournoyant. Le coussin garde le creux du dormeur. Le carton se fait griffer : des confettis.
   - Le distributeur est vivant : ses yeux suivent la main, il s'endort (zzz) quand personne ne vient ; son bocal se vide,
     il faut le secouer (l'attraper, et secouer) pour le remplir.
   - La fontaine éclabousse ; qui y a bu laisse des traces de pattes mouillées.
   - La machine à cartons suit des yeux ses cartons ; elle se coince si on tire trop (un coup dessus la décoince) ;
     un chat saute parfois se pendre à son levier.
   - Un chat se pose sur les boutons (« Entrer dans mon univers », « Restez jouer ici ») s'il tombe dessus.
   - Les effets : l'ombre sous ce qui vole, l'écran qui tremble aux gros chocs, et de petits sons (quand le son est mis). */
window.Objets = (() => {
if (!window.Chats || !Chats.K || !window.Vie) return null;
const K = Chats.K, { Wd, H, ANIMS, STEPS, I, rnd, pick, clamp, sgn, sm, c01, sc, front, sOf, floorAt, say, dust, interrupt, free, free4, claim, go, pose, hop, fn, later, inView, groundAt } = K;
const TAU = Math.PI * 2, V = Vie.V, ptr = Vie.ptr;
const word = (text, x, y, size, rot) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.3, rot: rot ?? rnd(-0.15, 0.15), size: size || 17 });
const P = () => Wd.P;
let PAPER = null; const paper = () => PAPER || (PAPER = getComputedStyle(document.body).backgroundColor || '#ddd'); addEventListener('themechange', () => { PAPER = null; });
const ink = a => `rgba(${(window.THEME && THEME.ink) || Chalk.INK},${a})`;

/* ——— la pelote : elle se dévide, un joueur s'emmêle ——— */
H.pre.push(dt => Wd.props.forEach(it => {
  if (it.kind !== 'pelote') return;
  if (it.px0 === undefined) it.px0 = it.x;
  const moved = Math.abs((it.x || 0) - it.px0); it.px0 = it.x;
  if (!it.held && moved < 80) it.unrav = Math.min(1, (it.unrav || 0) + moved / (Wd.W * 2.5));
  // à sa place (revenue), elle se rembobine doucement
  if (it.home && Math.abs(it.fx - it.home.fx) < 0.02 && !it.fall && !it.vx) it.unrav = Math.max(0, (it.unrav || 0) - dt * 0.05);
  it.big = 1 - (it.unrav || 0) * 0.45; if (it.trail && it.unrav > 0.2 && it.trail.length < 60 && Math.random() < 0.1) it.trail.unshift(it.trail[0] || [it.x, it.y]);
}));
H.post.push(() => Wd.cats.forEach(c => {
  // le joueur qui tape une pelote bien dévidée : emmêlé (le fil l'entoure), il se débat, se secoue
  if (c.anim !== 'tape' || c.tangle || Math.random() > 0.02) return; const it = Wd.props.find(p => p.kind === 'pelote' && p.busy === c && (p.unrav || 0) > 0.35); if (!it) return;
  c.tangle = Wd.t; interrupt(c); c.task = null; say(c, pick(['mrr ?!', 'au secours', 'miaa !']));
  c.q = [pose('agrippe', 1.8), pose('secoue', 0.8), pose('assis', 1.2, { fx: c => { c.tangle = 0; it.unrav *= 0.5; } })];
}));

/* ——— la tasse : elle se casse, le coupable sifflote ——— */
H.post.push(() => Wd.props.forEach(it => {
  if (it.kind !== 'tasse') return;
  if (it.broken) { if (Wd.t - it.broken < 11) { it.fade = it.fadeT = 0; if (it.home && !it.home.on && Math.abs(it.fx - it.home.fx) > 0.001) it.fx = it.home.fx; } else it.broken = 0; return; }
  if (!it.fall || it.held || it.vy > -sOf(it.d) * 1.5 || it.lift - it.vy * 0.016 > 2) return;
  // elle touche le sol, vite : crac
  it.broken = Wd.t; it.fall = false; it.vy = it.vx = 0; const x = it.x, y = floorAt(it.d), s = it.s;
  V.push({ k: 'eclats', x, y, s, t0: Wd.t, life: 11, seed: Math.floor(Math.random() * 99) }); word('crac !', x, y - s * 0.4, 20, -0.1); dust(x, y, s * 0.4, 0.8); Wd.shake = { t0: Wd.t, a: 3 };
  const who = Wd.cats.find(c => c.perch && c.perch.it.kind === 'caisse' && Math.abs(c.x - x) < Wd.W * 0.3) || Wd.cats.find(c => Math.abs(c.x - x) < sc(c) * 2 && !c.temp);
  if (who) later(0.9, () => { if (who.perch || free4(who) || (who.task && who.task.k === 'pose')) { who.q.unshift(pose('innocent', 3, { face: sgn(who.x - x) || 1, fx: c => say(c, '♪ ~') })); if (who.task && who.task.k === 'pose') who.task = null; } });
  Wd.cats.forEach(c => { if (c !== who && Math.abs(c.x - x) < sc(c) * 2.5) K.startle(c, x, 0.8); });
}));

/* ——— la plante : mâchouillée, une feuille tombe ——— */
H.think.push((c, add) => {
  const pl = Wd.props.find(p => p.kind === 'plante' && !p.fall && !p.held && p.fade > 0.9 && !(p.on && p.on.busy) && !p.busy); if (!pl) return;
  add(c.ch.casse * 0.4 + c.ch.mange * 0.15, () => {
    const b = pl.on; if (b) claim(c, b); else claim(c, pl);
    if (b) c.q.push(fn(c => { const x = K.xOf(b) - sgn(pl.onDx || 1) * (b.box.w / 2 * sOf(b.d) + front(c) * 0.6); c.q.unshift(go(inView(x), { d: Math.max(0, b.d - 0.06), face: sgn(pl.onDx || 1) })); }),
      hop(() => K.perchAt(b, b.perches[0], -sgn(pl.onDx || 1) * 0.08), { live: true, zr: [0, 0.4] }));
    else c.q.push(fn(c => { const w = K.beside(c, pl.x, sc(c) * 0.05); c.q.unshift(go(inView(w.x), { d: Math.max(0, pl.d - 0.04), face: w.face })); }));
    c.q.push(fn(c => { c.face = sgn(pl.x - c.x) || c.face; }), pose('mange', rnd(1.8, 2.6), { fx: c => { say(c, pick(['crounch', 'miam ?', 'nom'])); later(0.8, () => leaf(pl)); later(1.6, () => Math.random() < 0.6 && leaf(pl)); } }), pose('assis', rnd(1, 2)));
    if (b) c.q.push(hop(() => groundAt(inView(K.xOf(b) + sgn(Math.random() - 0.5) * sc(c) * 1.2), Math.max(0, b.d - 0.15))));
    c.q.push(fn(free));
  });
});
function leaf(pl) { if (!Wd.props.includes(pl)) return; const s = pl.s; V.push({ k: 'feuille', x: pl.x + rnd(-1, 1) * s * 0.1, y: pl.y - s * 0.35, y1: floorAt(Math.max(0, pl.d - 0.1)), t0: Wd.t, life: 9, seed: Math.floor(Math.random() * 99), s }); }

/* ——— le coussin garde le creux ; le carton se fait griffer ——— */
H.post.push(dt => Wd.props.forEach(it => {
  if (it.kind === 'coussin') {
    if (Wd.cats.some(c => c.perch && c.perch.it === it && c.anim === 'dodo')) it.dent = Math.min(1, (it.dent || 0) + dt * 0.3); else if (it.dent) it.dent = Math.max(0, it.dent - dt / 25);
    if (it.dent) it.root.scale.y *= 1 - it.dent * 0.28;
  }
}));
H.think.push((c, add) => {
  const cb = Wd.props.filter(p => p.kind === 'carton' && !p.busy && !p.fall && !p.held && p.fade > 0.9 && !Wd.cats.some(k => k.perch && k.perch.it === p)); if (!cb.length) return;
  add(c.ch.casse * 0.3 + 0.2, () => {
    const b = pick(cb); claim(c, b);
    c.q.push(fn(c => { const w = K.beside(c, K.xOf(b), b.hull.w / 2 * b.s - front(c) * 0.3); c.q.unshift(go(inView(w.x), { d: Math.max(0, b.d - 0.04), face: w.face })); }));
    for (let i = 0; i < 3; i++) c.q.push(pose('tape', 0.45, { fx: c => { if (i === 0) say(c, pick(['scritch scritch', 'kkrr kkrr'])); b.shred = Math.min(6, (b.shred || 0) + 1); b.wob = Wd.t;
      for (let k = 0; k < 3; k++) V.push({ k: 'confetti', x: c.x + c.face * front(c), y: c.y - sc(c) * 0.35, vx: c.face * rnd(20, 120), vy: -rnd(40, 160), y1: floorAt(c.d) + rnd(-2, 6), t0: Wd.t, life: 14, seed: Math.floor(Math.random() * 99) }); } }));
    c.q.push(pose('assis', 1.5), fn(free));
  });
});

/* ——— le distributeur vivant : ses yeux, son sommeil, son bocal ——— */
const look = (it, tx, ty, k) => {
  // les pupilles glissent vers la cible (dans le repère de l'objet, à peu près : l'écran est à peine tourné)
  const e = it.parts.yeux; if (!e) return; const dx = tx - it.x, dy = ty - (it.y - it.s * 0.4), d = Math.hypot(dx, dy) || 1, r = k * Math.min(1, d / (it.s * 1.5));
  e.position.x += (dx / d * r - e.position.x) * 0.2; e.position.y += (-dy / d * r - e.position.y) * 0.2;
};
H.post.push(dt => {
  const g = Wd.props.find(p => p.kind === 'distrib'); if (!g || !g.parts.yeux) return;
  if (g.stock === undefined) g.stock = 1;
  // ce qu'il regarde : la main, sinon un chat qui approche, sinon devant lui
  const near = Wd.cats.find(c => !c.hidden && Math.abs(c.x - g.x) < g.s * 1.2);
  if (g.shake > (g.used || 0)) g.used = g.shake;
  if (ptr.on && Wd.t - ptr.moved < 3) look(g, ptr.x, ptr.y, 0.009); else if (near) look(g, near.x, near.y - sc(near) * 0.4, 0.009); else look(g, g.x, g.y + 50, 0.004);
  const idle = Wd.t - Math.max(g.used || 0, ptr.moved || 0, g.born || (g.born = Wd.t)) > 35 && !near;
  g.parts.yeux.scale.y += ((idle ? 0.15 : 1) - g.parts.yeux.scale.y) * Math.min(1, dt * 4);
  if (idle && Wd.t > (g.zT || 0)) { g.zT = Wd.t + 1.6; Wd.fx.push({ k: 'z', x: g.x + g.s * 0.1, y: g.y - g.s * 0.62, t0: Wd.t, life: 2.4, dx: 1 }); }
  // le bocal : il se vide à chaque salve ; vide, le bouton fait « clic » dans le vide
  if (g.parts.grains) { g.parts.grains.visible = g.stock > 0.03; g.parts.grains.scale.y += (Math.max(0.05, g.stock) - g.parts.grains.scale.y) * Math.min(1, dt * 3); }
  // secoué (on le tient, et ça va et vient) : il se remplit
  if (g.held) { const v = g.vx || 0, sw = sgn(v); if (Math.abs(v) > 500 && sw !== g.swS) { g.swS = sw; g.shk = (g.shk || 0) + 1; }
    if (g.shk > 5 && g.stock < 0.99) { g.stock = 1; g.shk = 0; word(pick(['plein !', 'glou glou', 'ding ding !']), g.x, g.y - g.s * 0.9, 20); g.used = Wd.t; } }
  else g.shk = 0;
});
// une salve vide le bocal (d'un sixième) ; vide, il ne crache plus rien (la folie le vide d'un coup)
H.fire.push(g => {
  if (g.stock === undefined) g.stock = 1; g.used = Wd.t;
  if (g.stock <= 0.03) { if (Wd.t - (g.emptyT ?? -9) > 1) { g.emptyT = Wd.t; g.wob = Wd.t; g.wobA = 0.3; word(pick(['clic…', 'vide !']), g.x, g.y - g.s * 0.85, 17); } return true; }
  g.stock = Math.max(0, g.stock - 1 / 6); return false;
});
H.pre.push(() => { const g = Wd.P.distrib; if (!g) return; if (g.folle) g._fo = 1; else if (g._fo) { g._fo = 0; g.stock = 0; } });
// vide : le clic ne donne rien (« clic… ») ; les croquettes de la dernière salve partent quand même
H.click.push((x, y) => {
  const g = Wd.props.find(p => p.kind === 'distrib'); if (!g || g.stock === undefined || g.stock > 0.03 || g.folle || K.propAt(x, y) !== g) return false;
  g.wob = Wd.t; g.wobA = 0.4; word(pick(['clic…', 'vide !', 'secoue-moi !']), g.x, g.y - g.s * 0.85, 17);
  Wd.cats.forEach(c => { if (free4(c) && Math.abs(c.x - g.x) < Wd.W * 0.3 && Math.random() < 0.3) { interrupt(c); c.q = [pose('miaule', 1.5, { face: sgn(g.x - c.x), fx: c => say(c, 'miaou ?') })]; } });
  return true;
});

/* ——— la fontaine : les éclaboussures ; les pattes mouillées ——— */
H.post.push(() => Wd.cats.forEach(c => {
  const e = Wd.props.find(p => p.kind === 'eau'); if (!e) return;
  if (c.anim === 'mange' && Math.abs(c.x - e.x) < e.s * 0.8) { c.wet = Wd.t; if (Math.random() < 0.05) splash(e, 2); }
  // il marche, les pattes mouillées : une trace tous les petits pas
  if (c.wet && Wd.t - c.wet < 8 && /pas|trot|galop/.test(c.anim) && !c.perch && !c.jump && (c.lastPrint === undefined || Math.abs(c.x - c.lastPrint) > sc(c) * 0.22)) {
    c.lastPrint = c.x; c.printN = (c.printN || 0) + 1; V.push({ k: 'patte', x: c.x + (c.printN % 2 ? 4 : -4), y: floorAt(c.d) + (c.printN % 2 ? 2 : -2), r: sc(c) * 0.035, t0: Wd.t, life: 12 * (1 - (Wd.t - c.wet) / 10), seed: c.printN });
  }
}));
function splash(e, n) { const top = e.jet ? Univers.at(e, e.jet) : [e.x, e.y - e.s * 0.2]; for (let i = 0; i < n; i++) V.push({ k: 'goutte', x: top[0], y: top[1] + e.s * 0.1, vx: rnd(-80, 80), vy: -rnd(60, 180), y1: floorAt(e.d), t0: Wd.t, life: 1.2, seed: i }); }
H.pre.push(() => Wd.props.forEach(e => { if (e.kind === 'eau' && (e.fall || e.held) && Math.random() < 0.3) splash(e, 1); }));

/* ——— la machine à cartons : ses yeux suivent ses cartons ; elle se coince ; un chat se pend à son levier ——— */
H.post.push(dt => {
  const g = Wd.props.find(p => p.kind === 'trappe'); if (!g || !g.parts.yeux) return;
  const fly = Wd.props.filter(p => p.launched && p.fall).sort((a, b) => b.launched - a.launched)[0];
  if (fly) look(g, fly.x, fly.y, 0.012); else if (ptr.on && Wd.t - ptr.moved < 3) look(g, ptr.x, ptr.y, 0.012); else look(g, g.x - 200, g.y + 100, 0.006);
  g.shots = Math.max(0, (g.shots || 0) - dt * 0.8);
  if (g.jam) { g.parts.yeux.scale.y = 0.3 + Math.abs(Math.sin(Wd.t * 7)) * 0.2; if (Wd.t > (g.smokeT || 0)) { g.smokeT = Wd.t + 0.35; const m = Univers.at(g, g.bouche); dust(m[0], m[1], g.s * 0.12, 0.5); } }
  else g.parts.yeux.scale.y += (1 - g.parts.yeux.scale.y) * Math.min(1, dt * 5);
});
// trop de tirs d'affilée : elle se coince (de la fumée, « bzzt »), plus rien ne sort ; un coup dessus (un clic) la décoince
H.shoot.push(g => {
  if (g.jam) { if (Wd.t - (g.jamSay ?? -9) > 1.2) { g.jamSay = Wd.t; word(pick(['coincée !', 'krrk', '…']), g.x - g.s * 0.3, g.y - g.s * 0.7, 18); } return true; }
  g.shots = (g.shots || 0) + 1; if (g.shots > 12) { g.jam = Wd.t; word(pick(['coincée !', 'bzzt…', 'krrk']), g.x - g.s * 0.3, g.y - g.s * 0.7, 20); }
  return false;
});
H.click.push((x, y) => {
  const g = Wd.props.find(p => p.kind === 'trappe'); if (!g || !g.jam || K.propAt(x, y) !== g) return false;
  g.jam = 0; g.shots = 0; g.wob = Wd.t; g.wobA = 1; word(pick(['clonk !', 'et hop', 'ça repart']), g.x - g.s * 0.3, g.y - g.s * 0.8, 20); Wd.shake = { t0: Wd.t, a: 3 }; return true;
});
// un chat saute, s'accroche au pommeau du levier, s'y balance (le levier baisse : les cartons partent), puis se laisse tomber
ANIMS.pendu = (c, p, t) => { Chat.rest(c, p); p[I.pitch] = 1.5; p[I.y] = 0; p[I.fl] = 3; p[I.fr] = 2.9; p[I.fk] = p[I.fk2] = 1.2; const sw = Math.sin(t * 3); p[I.hl] = -0.3 + sw * 0.4; p[I.hr] = -0.1 + sw * 0.4; p[I.hk] = 1.1; p[I.look] = 1; p[I.eyes] = 0; p[I.py] = 1; p[I.mouth] = (t % 2) < 0.3 ? 1 : 0; p[I.tailUp] = -0.5; p[I.tailWave] = 1; p[I.tailPhase] = t * 5; };
H.think.push((c, add) => {
  const g = Wd.props.find(p => p.kind === 'trappe' && !p.busy && !p.jam && p.a > 0.5); if (!g || c.D.a > 0.4 || c.b.s > 1.1) return;
  add(c.ch.joue * 0.25 + c.ch.casse * 0.15, () => {
    claim(c, g);
    c.q.push(fn(c => { const k = knobXY(g); c.q.unshift(go(inView(k[0] - sc(c) * 0.3), { d: g.d > 0.6 ? 0.55 : g.d, face: 1 })); }), pose('affut', rnd(0.8, 1.4), { face: 1 }), { k: 'pendu', g, dur: rnd(2.5, 4), air: true }, pose('atterrit', 0.35), pose('assis', 1, { fx: c => say(c, pick(['encore !', 'hé hé', 'mrrp'])) }), fn(free));
  });
});
const knobXY = g => { const a = (g.lev0 ?? 0.3) + (g.pull || 0) * (g.levK ?? 1.3); return Univers.at(g, [g.pivot[0] - Math.sin(a) * 0.3, g.pivot[1] + Math.cos(a) * 0.3, g.pivot[2]]); };
STEPS.pendu = (c, T, dt) => {
  const g = T.g, s = sc(c); if (!Wd.props.includes(g) || g.held) { g.pulling = false; free(c); c.fall = true; c.vy = 0; c.task = null; return true; }
  if (!T.on) {
    // le saut jusqu'au pommeau
    if (!T.j) { T.j = { x0: c.x, y0: c.y, t: 0 }; say(c, '!'); }
    T.j.t += dt; const u = Math.min(1, T.j.t / 0.5), k = knobXY(g), tx = k[0] - s * 0.05, ty = k[1] + s * 0.62;
    c.anim = 'saut'; c.x = T.j.x0 + (tx - T.j.x0) * u; c.y = T.j.y0 + (ty - T.j.y0) * u - Math.sin(u * Math.PI) * s * 0.4;
    if (u >= 1) { T.on = Wd.t; g.pulling = true; }
    return false;
  }
  // pendu : son poids baisse le levier ; il se balance
  c.anim = 'pendu'; g.pulling = true; g.pull = Math.min(1, (g.pull || 0) + dt * 1.5); const k = knobXY(g); c.x = k[0] - s * 0.05 + Math.sin(Wd.t * 3) * s * 0.06; c.y = k[1] + s * 0.62;
  if (Wd.t - T.on > T.dur) { g.pulling = false; free(c); c.fall = true; c.vy = 0; c.vx = -s * 0.5; c.task = null; return true; }
  return false;
};

/* ——— le carton marqué : un chat (surtout le grincheux) recule contre un carton, la queue dressée qui frémit… « psss » ;
   les autres reniflent, font la grimace et l'évitent ; l'aspirateur l'emporte ——— */
ANIMS.marque = (c, p, t) => { Chat.rest(c, p); p[I.tailUp] = 1.7; p[I.tailCurl] = 0; p[I.tailWave] = 0.5; p[I.tailPhase] = t * 40; p[I.hk] = 0.25; p[I.look] = 0.6; p[I.eyes] = (t % 1.4) < 0.9 ? 1 : 0; p[I.hnod] = -0.1; };
H.think.push((c, add) => {
  if (c.b.s < 0.8 && c.breed !== 'grincheux') return;
  const cb = Wd.props.filter(p => p.kind === 'carton' && !p.busy && !p.fall && !p.held && !p.suck && !p.marked && p.fade > 0.9 && !p.mur && !Wd.cats.some(k => k.perch && k.perch.it === p)); if (!cb.length) return;
  add((c.breed === 'grincheux' ? 0.5 : 0.04) + c.ch.casse * 0.05, () => {
    const b = pick(cb); claim(c, b);
    // il se place à côté, le dos tourné au carton
    c.q.push(fn(c => { const w = K.beside(c, K.xOf(b), b.hull.w / 2 * b.s + front(c) * 0.25); c.q.unshift(go(inView(w.x), { d: Math.max(0, b.d - 0.03), face: -w.face })); }),
      pose('marque', 2.2, { fx: c => { c.face = sgn(c.x - b.x) || c.face; later(0.7, () => { if (!Wd.props.includes(b)) return; say(c, 'psss'); b.marked = Wd.t;
        V.push({ k: 'flaque', x: (c.x + b.x) / 2, y: floorAt(b.d) + 3, s: b.s, t0: Wd.t, life: 30, seed: Math.floor(Math.random() * 99), it: b }); }); } }),
      pose('assis', 1.2, { fx: c => say(c, pick(['à moi.', 'voilà.', 'hmpf.'])) }), fn(free));
  });
});
// les autres : un détour pour renifler, la grimace, et on s'en va
H.post.push(() => {
  if (Wd.t < (Wd.marqChk || 0)) return; Wd.marqChk = Wd.t + 0.5;
  Wd.props.forEach(b => {
    if (!b.marked) return; if (b.suck || !Wd.props.includes(b) || Wd.t - b.marked > 40) { b.marked = 0; return; }
    if (!b.away) b.away = Wd.t - 3;   // l'aspirateur le compte comme du bazar
    Wd.cats.forEach(c => {
      if (!free4(c) || c.temp || Wd.t - b.marked < 3 || Wd.t < (c.beurkT || 0) || Math.abs(c.x - b.x) > sc(c) * 1.6 || Math.abs(c.d - b.d) > 0.25 || Math.random() > 0.3) return;
      c.beurkT = Wd.t + 12; interrupt(c); const away = sgn(c.x - b.x) || 1;
      c.q = [pose('affut', 0.9, { face: -away }), pose('feule', 0.7, { face: -away, fx: c => say(c, pick(['beurk !', 'pouah', 'bleh'])) }), go(inView(c.x + away * sc(c) * 2.2), { d: c.d, g: 'trot', face: away })];
    });
  });
});
// en passant, on l'évite : la marche vers lui est détournée
H.think.push((c, add) => { if (Wd.props.some(b => b.marked && Math.abs(c.x - b.x) < sc(c) * 2)) add(0.6, () => { const b = Wd.props.find(b => b.marked); const away = sgn(c.x - b.x) || 1; c.q.push(go(inView(c.x + away * sc(c) * 1.8), { d: c.d })); }); });

/* ——— le hoquet : hic ! le corps sursaute, à intervalles ——— */
ANIMS.hoquet = (c, p, t) => { K.sit(c, p); const u = t % 1.1, h = u < 0.12 ? Math.sin(u / 0.12 * Math.PI) : 0; p[I.sqz] = -0.1 * h; p[I.hnod] = 0.25 * h - 0.05; p[I.eyes] = h > 0.3 ? 1 : 0; p[I.mouth] = h > 0.5 ? 1 : 0; p[I.tailWave] = 0.4 + h; };
H.think.push((c, add) => { if (Wd.t - (c.mangeT || -99) > 20) return; add(0.35, () => c.q.push(pose('hoquet', 3.3, { fx: c => [0, 1.1, 2.2].forEach(k => later(k + 0.04, () => { if (c.anim === 'hoquet') say(c, 'hic !'); })) }), pose('assis', 1))); });
H.post.push(() => Wd.cats.forEach(c => { if (c.anim === 'mange') c.mangeT = Wd.t; }));

/* ——— les boutons : un chat qui tombe dessus s'y pose, un moment ——— */
const ledges = () => ['#enter', '#stay'].map(q => document.querySelector(q)).filter(el => el && !el.disabled && el.getClientRects().length);
H.fall.push((c, dt) => {
  if (c.vy <= 0 || c.sulk) return false; const ny = c.y + (c.vy + K.grav() * dt) * dt;
  for (const el of ledges()) {
    const r = el.getBoundingClientRect(); const drop = Wd.t - (c.relT ?? -9) < 0.3 && c.y - sc(c) * 0.9 < r.top + r.height * 0.5; if (c.x < r.left + 6 || c.x > r.right - 6 || ((c.y > r.top + r.height * 0.75 || ny < r.top) && !drop)) continue;
    interrupt(c); c.fall = false; c.spin = 0; c.vx = 0; c.y = r.top; c.task = null; c.q = [{ k: 'rebord', el, air: true }]; say(c, pick(['hop', 'tadaa'])); return true;
  }
  return false;
});
STEPS.rebord = (c, T, dt) => {
  const r = T.el.getBoundingClientRect(); if (!r.width || T.el.disabled || c.x < r.left - 4 || c.x > r.right + 4) { c.fall = true; c.vy = 0; c.task = null; return true; }
  c.y = r.top; if (!T.plan) { T.plan = [['assis', rnd(2, 4)], [pick(['toilette', 'pain', 'assis']), rnd(3, 6)], ['miaule', 1.5]]; T.i = 0; T.u = 0; }
  const A = T.plan[T.i]; T.u += dt;
  if (!A) { const x = inView(c.x + c.face * sc(c) * rnd(0.5, 1)), d = rnd(0, 0.4); c.q.unshift(pose('affut', 0.5), hop(() => groundAt(x, d), { h: sc(c) * 0.3 }), pose('atterrit', 0.35)); return true; }
  c.anim = A[0]; if (A[0] === 'miaule' && T.u < dt * 1.5) say(c, pick(['miaou !', 'clique pas !', 'mrrp']));
  if (T.u > A[1]) { T.i++; T.u = 0; }
  return false;
};

/* ——— les effets ——— */
// l'écran tremble aux gros chocs (un lourd qui retombe, la tour qui s'écroule)
let shakeEls = null;
H.pre.push(() => {
  const S = Wd.shake; if (!shakeEls) shakeEls = Array.from(document.querySelectorAll('canvas')).filter(c => c.width > 200);
  if (!S) return; const u = Wd.t - S.t0, a = S.a * Math.exp(-u * 9) * (document.documentElement.classList.contains('reduced') ? 0 : 1);
  const tr = u > 0.45 ? '' : `translate(${(Math.sin(u * 90) * a).toFixed(1)}px,${(Math.cos(u * 70) * a * 0.6).toFixed(1)}px)`;
  shakeEls.forEach(el => { el.style.transform = tr; }); if (u > 0.45) Wd.shake = null;
});
// l'ombre sous ce qui vole (un chat lancé, sauté, porté ; un objet en l'air)
function drawShadows() {
  const ctx = Chalk.ctx; if (!ctx) return; ctx.save();
  const one = (x, d, h, w) => { if (h < 6) return; const k = 1 / (1 + h / (Wd.s0 * 1.4)), y = floorAt(d); ctx.fillStyle = ink((0.16 * k * Wd.a).toFixed(3)); ctx.beginPath(); ctx.ellipse(x, y, w * k, w * k * 0.22, 0, 0, TAU); ctx.fill(); };
  Wd.cats.forEach(c => { if (c.hidden || c.perch || !(c.fall || c.jump || c.held || (c.task && c.task.air))) return; one(c.x, c.d, floorAt(c.d) - c.y, sc(c) * 0.32); });
  Wd.props.forEach(it => { if (it.mur || it.run || it.a < 0.3 || !(it.fall || it.held) || it.on) return; one(it.x, it.d, it.lift, (it.r ? it.r * 1.4 : it.hull.w / 2) * it.s); });
  ctx.restore();
}
// les petites choses dessinées : éclats, feuille, confettis, traces de pattes, gouttes
function drawBits() {
  const C = Chalk, t = Wd.t;
  V.forEach(f => {
    const u = (t - f.t0) / f.life; if (u < 0) return; const a = (1 - sm((u - 0.7) / 0.3)) * Wd.a;
    if (f.k === 'eclats') { for (let i = 0; i < 5; i++) { const x = f.x + (i - 2) * f.s * 0.09 + Math.sin(f.seed + i) * 4, y = f.y - 2 - (i % 2) * 3, r = f.s * (0.025 + (i % 3) * 0.01), q = f.seed + i * 1.7;
      C.stroke([[x - r, y], [x + Math.cos(q) * r, y - r * 1.2], [x + r, y - Math.sin(q) * r * 0.3], [x - r, y]], 1, { w: 1.4, a: 0.8 * a, seed: f.seed + i, tip: false, amp: 0.2 }); } }
    else if (f.k === 'feuille') { const dt = t - f.t0, fall = Math.min(1, dt / 2.4), x = f.x + Math.sin(dt * 3 + f.seed) * f.s * 0.2 * (1 - fall * 0.5), y = f.y + (f.y1 - f.y) * fall, q = Math.sin(dt * 4) * (1 - fall) + 0.3, r = f.s * 0.06;
      const L = [[x - Math.cos(q) * r, y - Math.sin(q) * r], [x + Math.cos(q) * r, y + Math.sin(q) * r]]; C.stroke([L[0], [x - Math.sin(q) * r * 0.5, y + Math.cos(q) * r * 0.5], L[1], [x + Math.sin(q) * r * 0.5, y - Math.cos(q) * r * 0.5], L[0]], 1, { w: 1.4, a: 0.85 * a, seed: f.seed, tip: false, amp: 0.2, color: '58,110,70' }); }
    else if (f.k === 'confetti') { const dt = Math.min(t - f.t0, 1.2), x = f.x + f.vx * dt, y = Math.min(f.y1, f.y + f.vy * dt + 300 * dt * dt), q = f.seed + dt * 6;
      C.line(x - Math.cos(q) * 3, y - Math.sin(q) * 3, x + Math.cos(q) * 3, y + Math.sin(q) * 3, 1, { w: 1.6, a: 0.7 * a, seed: f.seed, tip: false, amp: 0, color: '176,128,78' }); }
    else if (f.k === 'patte') { const ctx = C.ctx; if (!ctx) return; ctx.fillStyle = ink((0.3 * a).toFixed(3)); ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.55, 0, 0, TAU); ctx.fill();
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(f.x + i * f.r * 0.8, f.y - f.r * 0.85, f.r * 0.32, f.r * 0.22, 0, 0, TAU); ctx.fill(); } }
    else if (f.k === 'flaque') { const ctx = C.ctx; if (!ctx) return; const aa = f.it && !Wd.props.includes(f.it) ? a * 0.3 : a, r = f.s * 0.2 * Math.min(1, (t - f.t0) / 1.2);
      ctx.fillStyle = `rgba(214,190,90,${(0.22 * aa).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(f.x, f.y, r * 0.8, r * 0.18, 0, 0, TAU); ctx.fill();
      if (t - f.t0 > 1 && f.it && f.it.marked) { const b = f.it; for (let i = -1; i <= 1; i++) { const x = b.x + i * b.s * 0.14, y0 = b.y - (b.box ? b.box.h : 0.4) * b.s - 6, P = [];
        for (let k = 0; k <= 8; k++) P.push([x + Math.sin(k * 1.2 + t * 3 + i) * 4, y0 - k * 3.5 - ((t * 10 + i * 7) % 8)]); C.stroke(P, 1, { w: 1.2, a: 0.45 * aa, seed: f.seed + i, tip: false, amp: 0.1, color: '120,140,60' }); } } }
    else if (f.k === 'goutte') { const dt = t - f.t0, x = f.x + f.vx * dt, y = f.y + f.vy * dt + 500 * dt * dt; if (y > f.y1) return; C.dot(x, y, 1.7, 0.6 * a, '60,110,180'); }
  });
}
H.draw.unshift(drawShadows);
H.draw.push(drawBits);

/* ——— les sons (seulement quand le son est mis : le bouton « son ») : calculés, discrets, d'après ce que disent les chats ——— */
const SND = [[/^mia|^miaou|^MIAOU|^miaa|j’ai faim/i, 'miaou'], [/rrrr|♥/, 'ronron'], [/ding|glou|plein/, 'ding'], [/pouf|ploc|tchac|pop|et hop|hop/, 'pop'], [/boum|bam|poum|bonk|BONK|toc|aïe|crac|clonk/i, 'boum'],
  [/crounch|miam|scrountch|nom|burp/, 'crounch'], [/KSS|pfff|grr|kss|fsh/, 'fsss'], [/scritch|kkrr|scriii/, 'gratte'], [/atchoum|tchi/, 'atchoum'], [/VROUUUM/, 'vroum'], [/BZZ|bzzt|krrk/, 'bzz']];
let lastSnd = 0;
H.pre.push(() => {
  if (!window.Film || !Film.soundOn) { Wd.fx.forEach(f => { f._s = 1; }); return; }
  for (const f of Wd.fx) { if (f._s) continue; f._s = 1; if (f.k !== 'txt' || performance.now() - lastSnd < 70) continue; const m = SND.find(([re]) => re.test(f.text)); if (m) { lastSnd = performance.now(); play(m[1], f.x); } }
});
function play(kind, x) {
  const A = Film.audio; if (!A) return; const t = A.currentTime, out = A.createGain(), pan = A.createStereoPanner ? A.createStereoPanner() : null;
  out.gain.value = 0.16; if (pan) { pan.pan.value = clamp((x / (Wd.W || 1)) * 2 - 1, -0.8, 0.8); out.connect(pan); pan.connect(A.destination); } else out.connect(A.destination);
  const osc = (type, f0, f1, dur, g) => { const o = A.createOscillator(), e = A.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(e); e.connect(out); o.start(t); o.stop(t + dur + 0.02); return o; };
  const noise = (dur, f, q, g, type) => { const n = Math.floor(A.sampleRate * dur), b = A.createBuffer(1, n, A.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = A.createBufferSource(), fl = A.createBiquadFilter(), e = A.createGain(); fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q; e.gain.value = g; s.buffer = b; s.connect(fl); fl.connect(e); e.connect(out); s.start(t); };
  if (kind === 'miaou') { const o = osc('sawtooth', 520 + Math.random() * 200, 380, 0.45, 0.25), f = A.createBiquadFilter(); o.disconnect(); f.type = 'bandpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1600, t + 0.15); f.frequency.linearRampToValueAtTime(700, t + 0.45); f.Q.value = 3; const e = A.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.35, t + 0.06); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(f); f.connect(e); e.connect(out); }
  else if (kind === 'ronron') { const o = osc('sawtooth', 26, 24, 0.9, 0.2), f = A.createBiquadFilter(); o.disconnect(); f.type = 'lowpass'; f.frequency.value = 180; const e = A.createGain(); e.gain.value = 0.5; o.connect(f); f.connect(e); e.connect(out); }
  else if (kind === 'ding') { osc('sine', 1320, 1300, 0.5, 0.25); osc('sine', 1980, 1960, 0.3, 0.08); }
  else if (kind === 'pop') osc('sine', 700, 180, 0.09, 0.3);
  else if (kind === 'boum') { osc('sine', 140, 45, 0.25, 0.5); noise(0.08, 400, 0.8, 0.4); }
  else if (kind === 'crounch') { for (let i = 0; i < 3; i++) { const s = A.createBufferSource(); } noise(0.06, 2500, 1.5, 0.5); setTimeout(() => Film.soundOn && noise(0.05, 2200, 1.5, 0.4), 90); }
  else if (kind === 'fsss') noise(0.35, 4200, 0.7, 0.35, 'highpass');
  else if (kind === 'gratte') noise(0.25, 3000, 2, 0.35);
  else if (kind === 'atchoum') { noise(0.18, 1800, 1, 0.5); osc('triangle', 600, 300, 0.15, 0.1); }
  else if (kind === 'vroum') { const o = osc('sawtooth', 70, 90, 1.2, 0.15); }
  else if (kind === 'bzz') osc('square', 120, 110, 0.3, 0.08);
}

return { play };
})();
