/* Les chocs : ce qu'on lance finit par toucher quelque chose (27/09, Mathieu : « chacun doit avoir une interaction
   avec chaque objet ou autre chat si on les jette dessus ou percute »). Voir le carnet des interactions.
   - un chat lancé sur un chat : tombé dessus, l'autre est aplati (plof) ; lancé fort à l'horizontale, il le renverse (bowling)
   - un objet lancé sur le corps d'un chat (pas seulement la tête) : le chat est bousculé, sursaute, râle
   - un chat lancé sur un objet sans perchoir : les petits valsent (clang), les gros tanguent et le renvoient (BONG)
   - un objet qui vole sur un autre objet : les petits sont renversés, les gros tanguent, le projectile rebondit (tonk)
   Branché sur js/chats.js par ses crochets (Chats.K.H.pre, H.fall). */
window.Chocs = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, dust, interrupt, pose, kick, later, LOURD } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 18 });
const LEGER = k => !LOURD[k.kind] && k.kind !== 'distrib' && !k.mur && !k.pivot;
// le poids : une petite chose (la pelote, le poisson) ne pousse pas une grande (le carton, le panier) : elle rebondit dessus
const masse = it => it.hull.w * it.hull.h * (it.big || 1) ** 2 * (LOURD[it.kind] || it.kind === 'distrib' ? 10 : 1);
// le corps d'un chat au sol : une ellipse autour du corps et de la tête
function corps(o) {
  const b = Chat.where(o, o.body), h = o.hp || b, s = sc(o), r = o.b.head[0] * s;
  return { x: (b[0] + h[0]) / 2, y: (b[1] + h[1]) / 2, rx: Math.abs(b[0] - h[0]) / 2 + Math.max(r, o.b.body[0] * s) * 1.1, ry: Math.abs(b[1] - h[1]) / 2 + Math.max(r, o.b.body[1] * s) * 1.3 };
}
const dans = (z, x, y) => ((x - z.x) / z.rx) ** 2 + ((y - z.y) / z.ry) ** 2 < 1;
// un chat qu'on peut toucher : au sol, visible, libre de ses mouvements
const cible = o => o.hp && !o.perch && !o.fall && !o.held && !o.hidden && !o.rare && !o.gone && !o.jump && !(o.task && o.task.air);
// le cadre d'un objet (x au centre, y en bas)
const boite = it => ({ x0: it.x - it.hull.w * it.s * 0.5, x1: it.x + it.hull.w * it.s * 0.5, y0: it.y - it.hull.h * it.s, y1: it.y });
const touche = (it, x, y, m) => { const b = boite(it); return x > b.x0 - m && x < b.x1 + m && y > b.y0 - m && y < b.y1 + m; };
const recent = (a, key, dt) => Wd.t - (a[key] ?? -9) < dt;
// vite, il peut sauter par-dessus en une image : on teste aussi le chemin parcouru depuis l'image d'avant
// ce qui dort dessus ou dedans : il en jaillit (objet léger) ou sursaute (objet lourd)
function sortir(it) {
  debusque(it);
  Wd.cats.filter(k => k.perch && k.perch.it === it && !k.held).forEach(k => { interrupt(k); say(k, pick(['!', 'mia !', '?!']));
    k.q = LOURD[it.kind] || it.tower ? [pose('affut', 0.8)] : [K.hop(() => K.groundAt(K.inView(it.x + (Math.random() < 0.5 ? -1 : 1) * sc(k) * 1.2), Math.max(0, it.d - 0.2)), { h: sc(k) * 0.9, zr: [0.2, 0.6] }), pose('feule', 0.6), pose('toilette', 2)]; });
}
// un gros objet tangue ; un gros objet léger (carton, coussin, panier…) glisse un peu en plus
function secoue(it, a, dir) {
  it.wob = Wd.t; it.wobA = a; sortir(it);
  // une caisse de la tour : la pile penche un peu plus (assez de coups, elle s'écroule)
  if (it.tower && it.tower.phase === 'debout') { it.tower.w += 0.12 + a * 0.35; it.tower.dir = dir || it.tower.dir; word(pick(['ooh…', 'ça penche !', 'crrr']), it.x, it.y - it.hull.h * it.s - 16, 16); }
  if (dir && LEGER(it) && !it.fall && !it.tower) { const s = sOf(it.d); it.on = null; it.fall = true; it.vx = dir * s * rnd(0.5, 0.9); it.vy = s * rnd(0.3, 0.5); it.tiltV = dir * rnd(0.5, 1.2); }
}
const chemin = (x, y, vx, vy, dt, f) => { for (let i = 0; i <= 3; i++) { const u = i / 3; if (f(x - vx * dt * u, y - vy * dt * u)) return true; } return false; };

/* ——— un chat qui vole (en premier : avant de se poser sur un perchoir, il peut heurter un chat) ——— */
H.fall.unshift((c, dt) => {
  if (c.rare || recent(c, 'chocT', 0.35)) return false;
  const s = sc(c), sp = Math.hypot(c.vx, c.vy); if (sp < s * 1.5) return false;
  const px = c.x, py = c.y - s * 0.35, dir = sgn(c.vx) || c.face;
  // sur un autre chat
  for (const o of Wd.cats) {
    if (o === c || !cible(o) || Math.abs(o.d - c.d) > 0.4 || recent(o, 'chocT', 1.2)) continue;
    const z = corps(o); if (!chemin(px, py, c.vx, c.vy, dt, (x, y) => dans(z, x, y))) continue;
    c.chocT = o.chocT = Wd.t; interrupt(o); o.pet = null;
    if (c.vy > 0 && Math.abs(c.vx) < c.vy * 1.2) {
      // tombé dessus : l'autre est aplati, lui rebondit
      o.q = [pose('ecrase', 0.9, { fx: o => word(pick(['plof', 'pouf', 'splotch']), o.x, z.y - z.ry, 20) }), pose('secoue', 0.5), pose(pick(['feule', 'boude', 'etourdi']), rnd(1.2, 2), { fx: o => say(o, pick(['hé !', 'aïe', 'descends !', '@_@'])) })];
      c.vy = -s * rnd(3, 4); c.vx = (sgn(c.x - o.x) || 1) * s * rnd(1, 2); say(c, pick(['boing', 'oups', 'pardon !']));
    } else {
      // lancé à l'horizontale : il le renverse, les deux roulent
      o.fall = true; o.vx = c.vx * 0.7; o.vy = -s * rnd(2, 3); o.spin = dir * rnd(1, 2); say(o, pick(['waaah', 'mia !', 'strike !']));
      c.vx *= -0.3; c.vy = -s * 1.5; word(pick(['BOUM', 'STRIKE', 'bam']), z.x, z.y - z.ry * 1.2, 24);
    }
    dust(z.x, K.floorAt(o.d), s * 0.5, 0.9); return false;
  }
  // sur un autre chat en l'air : les deux se cognent et repartent chacun de leur côté
  for (const o of Wd.cats) {
    if (o === c || !o.fall || o.held || o.rare || o.hidden || o.gone || Math.abs(o.d - c.d) > 0.45 || recent(o, 'chocT', 0.5)) continue;
    const r = (s + sc(o)) * 0.32, ox = o.x, oy = o.y - sc(o) * 0.35;
    if (!chemin(px, py, c.vx - o.vx, c.vy - o.vy, dt, (x, y) => Math.hypot(x - ox, y - oy) < r)) continue;
    c.chocT = o.chocT = Wd.t; const nx = sgn(ox - px) || dir, ux = c.vx, uy = c.vy;
    c.vx = o.vx * 0.6 - nx * s * 0.8; c.vy = Math.min(o.vy, 0) * 0.5 - s * 1.2; o.vx = ux * 0.6 + nx * sc(o) * 0.8; o.vy = Math.min(uy, 0) * 0.5 - sc(o) * 1.2;
    c.spin = -nx * rnd(1, 2); o.spin = nx * rnd(1, 2); word(pick(['BONK', 'boum', 'poc']), (px + ox) / 2, (py + oy) / 2 - 20, 22);
    say(c, pick(['aïe', 'mia !', 'pardon'])); later(0.2, () => say(o, pick(['hé !', 'aïe', '@_@']))); return false;
  }
  // sur un objet : les petits valsent, les gros tanguent et le renvoient ; sur un perchoir, il ne se pose que s'il retombe dessus
  // (les autres coups, de côté ou par en dessous, le cognent)
  for (const it of Wd.props) {
    if (it.held || it.suck || it.a < 0.5 || it.run || it === c.chocIt && recent(c, 'chocItT', 0.8)) continue;
    const per = it.perches && it.perches.length;
    if (per && ((c.vy > 0 && Math.abs(c.vx) < c.vy * 1.2) || py < it.y - it.hull.h * it.s * 0.8)) continue;
    if (Math.abs(it.d - c.d) > 0.45 || !chemin(px, py, c.vx, c.vy, dt, (x, y) => touche(it, x, y, s * 0.15))) continue;
    c.chocT = c.chocItT = Wd.t; c.chocIt = it;
    if (LEGER(it) && !it.fall && !it.tower) { kick(it, dir); if (it.fall) { it.vx *= 1.8; it.vy *= 1.5; } sortir(it); word(pick(['clang', 'bing', 'patatras']), it.x, it.y - it.hull.h * it.s - 10, 18); c.vx *= 0.6; }
    else { secoue(it, 0.9); c.vx = -dir * Math.max(Math.abs(c.vx) * 0.5, s); c.vy = Math.min(c.vy, 0) - s * 2; word('BONG', it.x, it.y - it.hull.h * it.s - 10, 24); say(c, pick(['aïe', 'mia !', 'ouch'])); }
    return false;
  }
  return false;
});

/* ——— un objet qui vole ——— */
H.pre.push(dt => {
  const L = Wd.props.filter(it => it.fall && !it.held && !it.suck && !it.run && Math.hypot(it.vx || 0, it.vy || 0) > sOf(it.d) * 1.2);
  for (const a of L) {
    if (recent(a, 'chocT', 0.3)) continue;
    const s = sOf(a.d), ax = a.x, ay = a.y - a.hull.h * a.s * 0.5, dir = sgn(a.vx || 0) || 1;
    // sur le corps d'un chat (la tête, en tombant, c'est le « bonk » de js/chats.js)
    let hit = false;
    for (const o of Wd.cats) {
      if (!cible(o) || Math.abs(o.d - a.d) > 0.4 || recent(o, 'chocT', 1.2)) continue;
      const z = corps(o); if (ay < z.y - z.ry * 0.5 || !chemin(ax, ay, a.vx || 0, -(a.vy || 0), dt || 0.016, (x, y) => dans(z, x, y))) continue;
      a.chocT = o.chocT = Wd.t; interrupt(o); o.pet = null;
      const lourd = !LEGER(a) || (a.big || 1) > 1.3;
      o.fall = true; o.vx = dir * sc(o) * (lourd ? rnd(2.5, 3.5) : rnd(1, 1.6)); o.vy = -sc(o) * (lourd ? 2.5 : 1.2); o.spin = dir * (lourd ? 1 : 0.3);
      say(o, pick(lourd ? ['OUCH', 'waaah', 'aïe aïe'] : ['hé !', 'aïe', 'qui a fait ça ?']));
      a.vx = -(a.vx || 0) * 0.35; a.vy = Math.abs(a.vy || 0) * 0.3 + s * 0.8; a.tiltV = (a.tiltV || 0) + rnd(-6, 6);
      word(pick(['paf', 'toc', 'boum']), z.x, z.y - z.ry, 20); hit = true; break;
    }
    if (hit) continue;
    // sur un chat en l'air : il est dévié, tourne, râle
    for (const o of Wd.cats) {
      if (!o.fall || o.held || o.rare || o.hidden || o.gone || Math.abs(o.d - a.d) > 0.45 || recent(o, 'chocT', 0.5)) continue;
      const r = sc(o) * 0.4 + a.hull.w * a.s * 0.3, ox = o.x, oy = o.y - sc(o) * 0.35;
      if (!chemin(ax, ay, (a.vx || 0) - o.vx, -(a.vy || 0) - o.vy, dt || 0.016, (x, y) => Math.hypot(x - ox, y - oy) < r)) continue;
      a.chocT = o.chocT = Wd.t; o.vx = o.vx * 0.3 + (a.vx || 0) * 0.5; o.vy = Math.min(o.vy, 0) - sc(o) * 1.2; o.spin = dir * rnd(1.5, 3);
      say(o, pick(['aïe', 'hé !', 'mia !'])); a.vx = -(a.vx || 0) * 0.3; a.vy = Math.abs(a.vy || 0) * 0.2 + s * 0.4; a.tiltV = (a.tiltV || 0) + rnd(-8, 8);
      word(pick(['poc', 'paf', 'bonk']), ox, oy - 20, 20); hit = true; break;
    }
    if (hit) continue;
    // sur un autre objet
    for (const b of Wd.props) {
      if (b === a || b.held || b.suck || b.run || b.a < 0.5 || b.on === a || a.on === b || (a.quitte === b && Wd.t - a.quitteT < 1) || Math.abs(b.d - a.d) > 0.4 || recent(b, 'chocT', 0.6)) continue;
      // un contenant ouvert : ce qui tombe au-dessus de son ouverture y entre (js/contenants.js), sans le cogner
      const Co = window.Contenants && Contenants.CONT[b.kind]; if (Co && (a.vy || 0) < 0 && Math.abs(ax - b.x) < (Co.w + 0.05) * b.s && Math.abs(b.tilt || 0) < 0.5) continue;
      if (!chemin(ax, ay, a.vx || 0, -(a.vy || 0), dt || 0.016, (x, y) => touche(b, x, y, 0))) continue;
      a.chocT = b.chocT = Wd.t;
      if (LEGER(b) && !b.fall && !b.tower && (b.hull.w * b.s) < (a.hull.w * a.s) * 1.6 && masse(a) > masse(b) * 0.5) { kick(b, dir); if (b.fall) { b.vx *= 1.6; b.vy *= 1.3; } sortir(b); }
      else { const fort = masse(a) > masse(b) * 0.5; secoue(b, fort ? 0.7 : 0.35, fort ? dir : 0);
        // (trop petit pour le renverser : il le pousse quand même un peu, et ce qui est posé dessus tombe)
        if (!fort && LEGER(b) && !b.fall && !b.tower) { if (b.on) kick(b, dir); else b.vx = dir * s * rnd(0.3, 0.5); } }
      a.vx = -(a.vx || 0) * 0.45; a.vy = Math.abs(a.vy || 0) * 0.3 + s * 0.6; a.tiltV = (a.tiltV || 0) + rnd(-8, 8);
      word(pick(['tonk', 'clonk', 'bing']), ax, ay - 10, 18); break;
    }
  }
});

/* ——— les croquettes : un choc au sol les disperse ; un clic les fait sauter ; le géant, l'éclair et le chat fou les envoient valser ——— */
function eparpille(x, d, R, force) {
  let n = 0;
  Wd.kib.forEach(k => { if (!k.rest || k.who || k.suck || Math.abs(k.d - d) > 0.3) return; const dx = k.x - x; if (Math.abs(dx) > R) return;
    const u = 1 - Math.abs(dx) / R; k.rest = false; k.vx = (sgn(dx) || (Math.random() < 0.5 ? -1 : 1)) * force * u * rnd(0.6, 1.2) + rnd(-40, 40); k.vy = -force * u * rnd(0.5, 1); n++; });
  return n;
}
H.pre.push(dt => {
  if (!Wd.kib.length) return;
  // ce qui retombe au sol (un chat lancé, un objet) : les croquettes autour sautent
  Wd.cats.forEach(c => { const s = sc(c);
    if (c.fall && c.vy > s * 2 && K.floorAt(c.d) - c.y < c.vy * dt * 2 + s * 0.1) eparpille(c.x, c.d, s * 1.1, Math.min(c.vy * 0.6, 600));
    // ce qui court vite dessus les chasse devant lui
    const g = c.task && c.task.k === 'walk' && (c.task.g === 'galop' || c.fou) || (c.rare === 'geant' || c.rare === 'eclair');
    if (g && !c.balai && !c.fall && !c.jump && Wd.t - (c.kibT ?? -9) > 0.15) { c.kibT = Wd.t; eparpille(c.x + c.face * s * 0.3, c.d, s * (c.rare === 'geant' ? 1.2 : 0.4), s * 2.5); }
  });
  Wd.props.forEach(it => { if (!it.fall || it.held || it.run || it.vy > 0) return; const s = sOf(it.d);
    if (it.lift < Math.abs(it.vy) * dt * 2 + 4 && Math.abs(it.vy) > s * 1.5) eparpille(it.x, it.d, it.hull.w * it.s * 0.9, Math.min(Math.abs(it.vy) * 0.5, 450)); });
});
H.click.push((x, y) => {
  const near = Wd.kib.filter(k => k.rest && !k.who && Math.hypot(k.x - x, k.y - y) < Math.max(14, Wd.s0 * 0.08)); if (!near.length) return false;
  eparpille(x, near[0].d, Wd.s0 * 0.25, Wd.s0 * 2.4); word(pick(['tic', 'crr', 'pic']), x, y - 16, 14); return true;
});

/* ——— les boutons : un objet lancé dedans rebondit, le bouton tremble ——— */
const boutons = () => K.boutons().map(o => o.el);
function tremble(el) { if (el.animate && Wd.t - (el.chocT ?? -9) > 0.4) { el.chocT = Wd.t; el.animate([{ transform: 'none' }, { transform: 'rotate(-3deg) translateY(2px)' }, { transform: 'rotate(2deg)' }, { transform: 'none' }], { duration: 380, easing: 'ease-out' }); } }
H.pre.push(dt => {
  const B = boutons(); if (!B.length) return; const R = K.boutons().map(o => o.r);
  const dans = (r, x, y, m) => x > r.left - m && x < r.right + m && y > r.top - m && y < r.bottom + m;
  Wd.props.forEach(it => {
    if (!it.fall || it.held || it.run || recent(it, 'btnT', 0.3)) return; const vx = it.vx || 0, vy = -(it.vy || 0), x = it.x, y = it.y - it.hull.h * it.s * 0.5, m = it.hull.w * it.s * 0.3;
    R.forEach((r, i) => { if (!chemin(x, y, vx, vy, dt, (a, b) => dans(r, a, b, m))) return; it.btnT = Wd.t; tremble(B[i]);
      // de haut ou de bas : il rebondit ; de côté : il repart en arrière
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, s = sOf(it.d);
      if (Math.abs(x - cx) / r.width > Math.abs(y - cy) / r.height) it.vx = -vx * 0.4; else { it.vy = y < cy ? Math.abs(it.vy || 0) * 0.4 + s * 0.5 : -Math.abs(it.vy || 0) * 0.3; it.vx = vx * 0.7; }
      it.tiltV = (it.tiltV || 0) + rnd(-6, 6); word(pick(['toc', 'poc', 'bonk']), x, r.top - 14, 17); });
  });
  // un chat lancé de côté (ou par-dessous) : il se cogne (de haut, js/objets.js le pose dessus)
  Wd.cats.forEach(c => {
    if (!c.fall || c.held || c.rare || recent(c, 'btnT', 0.4) || (c.vy > 0 && Math.abs(c.vx) < c.vy * 1.2)) return; const s = sc(c), x = c.x, y = c.y - s * 0.35;
    R.forEach((r, i) => { if (!chemin(x, y, c.vx, c.vy, dt, (a, b) => dans(r, a, b, s * 0.15))) return; c.btnT = Wd.t; tremble(B[i]);
      c.vx = -c.vx * 0.35; c.vy = Math.max(c.vy, 0) * 0.3 + s * 0.3; c.spin = (c.spin || 0) + rnd(-1, 1); word('BONK', x, r.top - 14, 20); say(c, pick(['aïe', 'mia !', 'ouille'])); });
  });
});

/* ——— le chat qu'on porte : les autres lèvent la tête ; balancé fort, il bouscule ce qu'il frôle ——— */
H.pre.push(dt => {
  Wd.cats.forEach(c => {
    if (!c.held) { c.porteX = null; return; } const s = sc(c), px = c.porteX ?? c.x, py = c.porteY ?? c.y; c.porteX = c.x; c.porteY = c.y;
    const vx = (c.x - px) / Math.max(dt, 1 / 120), vy = (c.y - py) / Math.max(dt, 1 / 120), sp = Math.hypot(vx, vy);
    if (!recent(c, 'porteT', 2.5)) { c.porteT = Wd.t;
      Wd.cats.forEach(o => { if (o !== c && K.free4(o) && !o.rare && Math.abs(o.x - c.x) < Wd.W * 0.3 && Math.random() < 0.45) { interrupt(o); o.q = [pose('affut', rnd(1, 2), { face: sgn(c.x - o.x) || o.face })]; if (Math.random() < 0.3) say(o, pick(['?', 'et moi ?', '!'])); } }); }
    if (sp < s * 3) return; const bx = c.x, by = c.y + s * 0.2;   // (tenu par la peau du cou : le corps pend sous la main)
    for (const o of Wd.cats) {
      if (o === c || !cible(o) || recent(o, 'chocT', 1.2)) continue; const z = corps(o); if (!dans(z, bx, by) && !dans(z, bx, by + s * 0.3)) continue;
      o.chocT = Wd.t; interrupt(o); o.pet = null; o.fall = true; o.vx = sgn(vx || 1) * sc(o) * rnd(1, 1.8); o.vy = -sc(o) * 1.2; o.spin = sgn(vx || 1) * 0.4;
      say(o, pick(['hé !', 'attention !', 'mia !'])); say(c, pick(['pardon', 'wiii', 'oups'])); word(pick(['pof', 'boum']), z.x, z.y - z.ry, 18); break;
    }
    for (const it of Wd.props) {
      if (!LEGER(it) || it.fall || it.held || it.run || it.tower || recent(it, 'chocT', 0.8) || !(touche(it, bx, by, s * 0.1) || touche(it, bx, by + s * 0.3, s * 0.1))) continue;
      it.chocT = Wd.t; kick(it, sgn(vx || 1)); sortir(it); word(pick(['clang', 'bing']), it.x, it.y - it.hull.h * it.s - 10, 16); break;
    }
  });
});

/* ——— la bagarre : les voisins accourent voir, les peureux filent, ceux qui dormaient se réveillent ——— */
H.pre.push(() => {
  const F = [...new Set(Wd.cats.filter(c => c.fight).map(c => c.fight))];
  F.forEach(f => {
    if (f.vu) return; f.vu = true;
    Wd.cats.forEach(o => {
      if (f.L.includes(o) || o.rare || o.held || o.fall || o.hidden || Math.abs(o.x - f.x) > Wd.W * 0.45) return; const side = sgn(o.x - f.x) || 1;
      if (o.perch) { o.face = -side; if (Math.random() < 0.6) say(o, pick(['!', '?!', 'ouh là'])); return; }
      if (!K.free4(o) && !(o.task && o.task.k === 'pose')) return; interrupt(o);
      const r = Math.random();
      if (r < 0.35) o.q = [pose('affut', 0.5, { face: -side, fx: o => say(o, pick(['!', '?!'])) }), K.go(K.inView(o.x + side * Wd.W * 0.3), { g: 'galop' }), pose('toilette', 2)];
      else if (r < 0.75) o.q = [K.go(K.inView(f.x + side * sc(o) * rnd(1.4, 2)), { g: 'trot', face: -side }), pose('affut', rnd(1.5, 2.5), { face: -side }), pose('assis', 1, { face: -side, fx: o => say(o, pick(['ouh là', 'vas-y !', '…', 'hé hé'])) })];
      else o.q = [pose('affut', rnd(1.5, 2.5), { face: -side })];
    });
  });
});

/* ——— la souris de la horde : touchée, elle fait un bond et file plus vite ; elle saute par-dessus ce qui lui barre la route ——— */
function bond(m, h) { if (m.bond && Wd.t - m.bond.t0 < m.bond.d) return; m.bond = { t0: Wd.t, d: 0.45, h: h || sOf(m.d) * 0.35 }; }
H.pre.push(dt => {
  Wd.props.forEach(m => {
    if (!m.run) return; const s = sOf(m.d);
    // en l'air (un bond)
    if (m.bond) { const u = (Wd.t - m.bond.t0) / m.bond.d; if (u >= 1) { m.bond = null; m.lift = 0; } else m.lift = Math.sin(u * Math.PI) * m.bond.h; }
    // un objet sur sa route : elle saute par-dessus
    const nx = m.x + m.run.dir * s * 0.3;
    const mur = Wd.props.find(it => it !== m && !it.run && !it.held && !it.mur && it.a > 0.5 && Math.abs(it.d - m.d) < 0.25 && Math.abs(it.x - nx) < it.hull.w * it.s * 0.5);
    if (mur && !m.bond) bond(m, mur.hull.h * mur.s + s * 0.1);
    // touchée : un objet ou un chat lancé
    const hit = Wd.props.find(it => it !== m && it.fall && !it.held && Math.abs(it.x - m.x) < s * 0.3 && it.lift < s * 0.4 && Math.abs(it.d - m.d) < 0.35)
      || Wd.cats.find(c => c.fall && !c.held && Math.abs(c.x - m.x) < sc(c) * 0.4 && K.floorAt(c.d) - c.y < sc(c) * 0.5);
    if (hit && !recent(m, 'chocT', 0.8)) { m.chocT = Wd.t; bond(m, s * 0.5); m.run.v *= 1.25; word(pick(['couic !', 'hiii', 'couic']), m.x, m.y - s * 0.4, 16); }
  });
});
H.click.unshift((x, y) => {
  const m = Wd.props.find(m => m.run && Math.abs(m.x - x) < sOf(m.d) * 0.35 && Math.abs(m.y - sOf(m.d) * 0.1 - y) < sOf(m.d) * 0.35); if (!m) return false;
  bond(m, sOf(m.d) * 0.5); m.run.v *= 1.2; word(pick(['couic !', 'hiii !', 'pas moi !']), m.x, m.y - sOf(m.d) * 0.4, 16); return true;
});

/* ——— ce qui se cache : la bosse sous le coussin, le carton-piège, le nuage de bagarre ——— */
// (sortir() les fait aussi jaillir : voir plus haut) ; un projectile dans la bagarre la fait cesser net
function debusque(it) {
  if (it.lump) it.lump = null;   // la bosse : il en sort (js/vie.js, « coucou ! »)
  if (it.trap && it.trap.task && it.trap.task.k === 'piege') it.trap.task.end = 0;
}
H.pre.push(dt => {
  const F = [...new Set(Wd.cats.filter(c => c.fight).map(c => c.fight))]; if (!F.length) return;
  const shots = Wd.props.filter(it => it.fall && !it.held && !it.run).map(it => [it, it.x, it.y - it.hull.h * it.s * 0.5]).concat(Wd.cats.filter(c => c.fall && !c.held && !c.fight).map(c => [c, c.x, c.y - sc(c) * 0.35]));
  F.forEach(f => { const s = sc(f.L[0]), y = K.floorAt(f.L[0].d) - s * 0.35;
    for (const [o, x, yy] of shots) { if (Math.hypot(x - f.x, yy - y) > s * 0.8 || recent(o, 'chocT', 0.5)) continue; o.chocT = Wd.t;
      f.end = Wd.t; word(pick(['STOP !', 'BOUM', 'pouf']), f.x, y - s * 0.8, 24); dust(f.x, K.floorAt(f.L[0].d), s * 0.6, 1);
      if (o.hull) { o.vx = -(o.vx || 0) * 0.3; o.vy = Math.abs(o.vy || 0) * 0.3 + sOf(o.d) * 0.5; } else { o.vx *= -0.3; o.vy = -sc(o) * 1.2; } break; } });
});

/* ——— l'aspirateur : il fait aussi le ménage des oubliés ——— */
H.pre.push(dt => {
  const V = Wd.vac; if (!V || V.ph !== 'balaye') return; const R = Wd.s0 * 0.9, my = V.y + Wd.s0 * 0.05;
  // la souris de la horde : aspirée (couic)
  Wd.props.forEach(m => { if (!m.run || m.suck || Math.abs(m.x - V.x) > R) return; m.run = null; m.launched = true; m.suck = { t0: Wd.t, fx: m.fx, lift: m.lift }; word('couic !', m.x, m.y - 20, 16); });
  // les objets à leur place tremblent au passage ; la tour tangue
  Wd.props.forEach(it => { if (it.suck || it.held || it.mur || Math.abs(it.x - V.x) > R * 1.2 || recent(it, 'vacT', 1.5)) return; it.vacT = Wd.t; it.wob = Wd.t; it.wobA = it.tower ? 0.8 : 0.35; });
  // les lettres tombées : aspirées un moment, puis recrachées (elles remonteront à leur place)
  const Vi = window.Vie; if (Vi && Vi.LETTERS) { const Ls = Vi.LETTERS(); if (Ls) { const r = Vi.RECT();
    Ls.forEach(L => { if (L.st !== 'sol' || Math.abs(Vi.lx(L, r) - V.x) > R) return; Vi.tumble(L, (V.x - Vi.lx(L, r)) * 2, -Wd.s0 * rnd(2.5, 3.5), rnd(-12, 12)); later(0.8, () => word('ptoui', V.x, my + 10, 16)); }); } }
  Wd.cats.forEach(c => {
    if (c.held || c.hidden || c.gone || Math.abs(c.x - V.x) > R * 1.3 || recent(c, 'vacT', 3)) return;
    // un chat en l'air est attiré vers la bouche
    if (c.fall) { c.vx += (V.x - c.x) * 4 * dt; c.vy -= Wd.s0 * 6 * dt; if (!recent(c, 'vacSay', 1)) { c.vacSay = Wd.t; say(c, pick(['miaaa !', 'nooon'])); } return; }
    c.vacT = Wd.t;
    // perché : il saute de son perchoir et file
    if (c.perch && !c.rare) { const it = c.perch.it; interrupt(c); say(c, pick(['!!', 'fshhh'])); c.q = [K.hop(() => K.groundAt(K.inView(c.x - V.dir * sc(c) * 1.5), Math.max(0, it.d - 0.2)), { h: sc(c) * 0.6, zr: [0.2, 0.6] }), K.go(K.inView(c.x - V.dir * Wd.W * 0.3), { g: 'galop' }), pose('affut', 1.5, { face: V.dir })]; return; }
    // les visiteurs : le géant bloque l'aspirateur, le ballon est tiré vers lui, les autres râlent
    if (c.rare === 'geant') { V.ph = 'remonte'; V.tu = Wd.t; word('BONG', V.x, my - 20, 26); say(c, pick(['hé ho !', 'pas moi !'])); }
    else if (c.rare === 'ballon') { c.x += (V.x - c.x) * 0.3; say(c, pick(['pouic !', 'au secours !'])); }
    else if (c.rare) say(c, pick(['!!', 'hé !', 'pas touche']));
  });
});

/* ——— la mouche : elle se pose aussi sur les objets et sur les visiteurs ; un clic la chasse ——— */
H.pre.push(dt => {
  const m = Wd.mouche; if (!m) return; if (m.nose) m.sur = null;
  if (m.sur) { const o = m.sur, ok = o.hull ? Wd.props.includes(o) && !o.fall && !o.held : Wd.cats.includes(o) && o.hp && !o.held && !o.fall;
    if (!ok || Wd.t > m.surEnd) { m.sur = null; m.vy = -500; m.vx = rnd(-400, 400); word('bzz', m.x, m.y - 12, 13); return; }
    if (o.hull) { m.x = o.x + m.surDx; m.y = o.y - o.hull.h * o.s; } else { m.x = o.hp[0]; m.y = o.hp[1] - o.b.head[0] * sc(o) * 0.9; }
    m.vx = m.vy = 0; return; }
  if (m.nose || m.bye || Wd.t - m.t0 < 5 || Math.random() > dt * 0.25) return;
  const P = Wd.props.filter(it => !it.fall && !it.held && !it.run && !it.mur && it.a > 0.5 && Math.abs(it.x - m.x) < 250).concat(Wd.cats.filter(c => c.rare && c.hp && !c.hidden && Math.abs(c.hp[0] - m.x) < 300));
  if (!P.length) return; const o = pick(P); m.sur = o; m.surEnd = Wd.t + rnd(2, 4); m.surDx = o.hull ? rnd(-0.3, 0.3) * o.hull.w * o.s : 0;
  if (!o.hull) later(0.6, () => say(o, pick(['hihi', 'ça chatouille', '?', 'atchoum !'])));
  else if (o.kind === 'distrib') later(0.5, () => word('hihi', o.x, o.y - o.hull.h * o.s - 20, 14));
});
H.click.unshift((x, y) => {
  const m = Wd.mouche; if (!m || Math.hypot(m.x - x, m.y - y) > 36) return false;
  if (m.nose) { const c = m.nose; m.nose = null; if (c && c.hp) say(c, pick(['merci', '!'])); }
  m.sur = null; m.vx = (sgn(m.x - x) || 1) * 800; m.vy = -600; m.tgt = null; word(pick(['bzz !', 'BZZ', 'raté !']), m.x, m.y - 14, 15); return true;
});

/* ——— la plume de la canne : elle frôle les objets (la pelote roule, le pompon de l'arbre se balance, le distributeur rit) ;
   un chat perché, tout près, saute en bas pour la chasser ——— */
H.pre.push(dt => {
  const Vi = window.Vie; if (!Vi || !(Vi.ptr.plume > Wd.t)) return; const P = Vi.plume, sp = Math.hypot(P.vx, P.vy);
  if (sp > Wd.s0 * 0.6) Wd.props.forEach(it => {
    if (it.held || it.fall || it.run || it.a < 0.5 || recent(it, 'plumeT', 0.8) || !touche(it, P.x, P.y, 4)) return; it.plumeT = Wd.t; const d = sgn(P.vx) || 1, s = sOf(it.d);
    if (it.r) { it.vx = d * s * rnd(0.8, 1.4); it.fall = true; it.vy = s * 0.3; }
    else if (it.kind === 'arbre') { it.poke = it.wob = Wd.t; it.wobA = 0.4; }
    else { it.wob = Wd.t; it.wobA = 0.25; if (it.kind === 'distrib' && Math.random() < 0.5) word(pick(['hihi', 'ça chatouille']), it.x, it.y - it.hull.h * it.s - 16, 14); }
    if (Math.random() < 0.4) word(pick(['frr', 'fshh']), P.x, P.y - 12, 13);
  });
  Wd.cats.forEach(c => {
    if (!c.perch || c.rare || c.held || c.task && c.task.k === 'jump' || recent(c, 'plumeT', 4) || Math.hypot(P.x - c.x, P.y - c.y) > sc(c) * 1.6 || Math.random() > dt * 1.5 * (0.5 + c.ch.joue * 0.5)) return;
    c.plumeT = Wd.t; const it = c.perch.it; interrupt(c); say(c, pick(['!', 'à moi !']));
    c.q = [pose('affut', 0.4, { face: sgn(P.x - c.x) || c.face }), K.hop(() => K.groundAt(K.inView(P.x), Math.max(0, it.d - 0.1)), { h: sc(c) * 0.5, zr: [0.2, 0.6] }), pose('atterrit', 0.3)];
  });
});

/* ——— le pointeur (la souris) : ce qu'il survole frémit un peu (les chats, eux, ne le chassent plus : seulement la plume) ——— */
H.pre.push(() => {
  const Vi = window.Vie, P = Vi && Vi.ptr; if (!P || !P.on || Wd.t - P.moved > 0.2 || Math.hypot(P.vx || 0, P.vy || 0) < 200) return;
  const it = K.propAt(P.x, P.y); if (!it || it.held || it.fall || it.run || it.mur || recent(it, 'survolT', 1.5)) return;
  it.survolT = Wd.t; it.wob = Wd.t; it.wobA = LOURD[it.kind] ? 0.12 : 0.25;
});

return { corps, eparpille, debusque, bond, tremble, sortir, secoue, masse };
})();
