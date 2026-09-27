/* Les chocs : ce qu'on lance finit par toucher quelque chose (27/09, Mathieu : « chacun doit avoir une interaction
   avec chaque objet ou autre chat si on les jette dessus ou percute »). Voir le carnet des interactions.
   - un chat lancé sur un chat : tombé dessus, l'autre est aplati (plof) ; lancé fort à l'horizontale, il le renverse (bowling)
   - un objet lancé sur le corps d'un chat (pas seulement la tête) : le chat est bousculé, sursaute, râle
   - un chat lancé sur un objet sans perchoir : les petits valsent (clang), les gros tanguent et le renvoient (BONG)
   - un objet qui vole sur un autre objet : les petits sont renversés, les gros tanguent, le projectile rebondit (tonk)
   Branché sur js/chats.js par ses crochets (Chats.K.H.pre, H.fall). */
window.Chocs = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, dust, interrupt, pose, kick, LOURD } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 18 });
const LEGER = k => !LOURD[k.kind] && k.kind !== 'distrib' && !k.mur && !k.pivot;
// le corps d'un chat au sol : une ellipse autour du corps et de la tête
function corps(o) {
  const b = Chat.where(o, o.body), h = o.hp || b, s = sc(o), r = o.b.head[0] * s;
  return { x: (b[0] + h[0]) / 2, y: (b[1] + h[1]) / 2, rx: Math.abs(b[0] - h[0]) / 2 + Math.max(r, o.b.body[0] * s) * 1.1, ry: Math.abs(b[1] - h[1]) / 2 + Math.max(r, o.b.body[1] * s) * 1.3 };
}
const dans = (z, x, y) => ((x - z.x) / z.rx) ** 2 + ((y - z.y) / z.ry) ** 2 < 1;
// un chat qu'on peut toucher : au sol, visible, libre de ses mouvements
const cible = o => o.hp && !o.fall && !o.held && !o.hidden && !o.rare && !o.gone && !o.jump && !(o.task && o.task.air);
// le cadre d'un objet (x au centre, y en bas)
const boite = it => ({ x0: it.x - it.hull.w * it.s * 0.5, x1: it.x + it.hull.w * it.s * 0.5, y0: it.y - it.hull.h * it.s, y1: it.y });
const touche = (it, x, y, m) => { const b = boite(it); return x > b.x0 - m && x < b.x1 + m && y > b.y0 - m && y < b.y1 + m; };
const recent = (a, key, dt) => Wd.t - (a[key] ?? -9) < dt;
// vite, il peut sauter par-dessus en une image : on teste aussi le chemin parcouru depuis l'image d'avant
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
  // sur un objet sans perchoir (les perchoirs, le titre et les boutons sont tenus par js/vie.js et js/objets.js)
  for (const it of Wd.props) {
    if (it.held || it.suck || it.a < 0.5 || it.run || (it.perches && it.perches.length) || it === c.chocIt && recent(c, 'chocItT', 0.8)) continue;
    if (Math.abs(it.d - c.d) > 0.45 || !chemin(px, py, c.vx, c.vy, dt, (x, y) => touche(it, x, y, s * 0.15))) continue;
    c.chocT = c.chocItT = Wd.t; c.chocIt = it;
    if (LEGER(it) && !it.fall) { kick(it, dir); if (it.fall) { it.vx *= 1.8; it.vy *= 1.5; } word(pick(['clang', 'bing', 'patatras']), it.x, it.y - it.hull.h * it.s - 10, 18); c.vx *= 0.6; }
    else { it.wob = Wd.t; it.wobA = 0.9; c.vx = -dir * Math.max(Math.abs(c.vx) * 0.5, s); c.vy = Math.min(c.vy, 0) - s * 2; word('BONG', it.x, it.y - it.hull.h * it.s - 10, 24); say(c, pick(['aïe', 'mia !', 'ouch'])); }
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
    // sur un autre objet
    for (const b of Wd.props) {
      if (b === a || b.held || b.suck || b.run || b.a < 0.5 || b.on === a || a.on === b || Math.abs(b.d - a.d) > 0.4 || recent(b, 'chocT', 0.6)) continue;
      if (!chemin(ax, ay, a.vx || 0, -(a.vy || 0), dt || 0.016, (x, y) => touche(b, x, y, 0))) continue;
      a.chocT = b.chocT = Wd.t;
      if (LEGER(b) && !b.fall && (b.hull.w * b.s) < (a.hull.w * a.s) * 1.6) { kick(b, dir); if (b.fall) { b.vx *= 1.6; b.vy *= 1.3; } }
      else { b.wob = Wd.t; b.wobA = 0.7; }
      a.vx = -(a.vx || 0) * 0.45; a.vy = Math.abs(a.vy || 0) * 0.3 + s * 0.6; a.tiltV = (a.tiltV || 0) + rnd(-8, 8);
      word(pick(['tonk', 'clonk', 'bing']), ax, ay - 10, 18); break;
    }
  }
});

return { corps };
})();
