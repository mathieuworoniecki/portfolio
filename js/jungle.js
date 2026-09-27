/* La jungle (27/09, Mathieu : « une partie jungle, qui apparaît sur un côté, seulement sur un plus grand écran » ;
   « plus d'interactions avec les plantes : je peux arracher une feuille ; si je la mets près d'un chat, il essaie de la manger, puis il vomit
   (des arcs-en-ciel, comme Nyan Cat) »).
   - Les grandes feuilles bougent doucement ; la souris qui passe les fait frémir ; un clic, elles tremblent.
   - Attraper une feuille : crac, elle s'arrache (elle repousse plus tard). Lâchée, elle tombe en virevoltant.
   - Une feuille près d'un chat (par terre, ou tendue près de sa tête) : il la mange… hic… et vomit un arc-en-ciel (js/arcenciel.js).
   - La petite plante en pot : un clic, une feuille tombe. Le souffleur arrache les feuilles. Un chat joueur tape une feuille qui pend.
   - Une feuille dans le bassin flotte. */
window.Jungle = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, floorAt, free4, interrupt, claim, pose, go, fn, free, inView, later } = K;
const T3 = Obj3D.T, V = new T3.Vector3();
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
const jungles = () => Wd.props.filter(it => it.kind === 'jungle' && it.a > 0.3);

// le milieu d'une feuille, à l'écran
function centre(it, f) { f.g.updateMatrix(); V.set(0, 0.21, 0).applyMatrix4(f.g.matrix); return Univers.at(it, [V.x, V.y, V.z]); }
function feuilleAt(x, y) {
  for (const it of jungles()) for (const f of it.parts.feuilles) { if (!f.on) continue; const p = centre(it, f), r = it.s * 0.2 * f.k; if (Math.hypot(x - p[0], y - p[1]) < Math.max(r, 16)) return { it, f, p }; }
  return null;
}
// arracher : la feuille de la plante disparaît, une feuille (un objet) apparaît à sa place
function arrache(it, f, p, vx, vy) {
  f.on = false; f.g.visible = false; f.t = Wd.t; it.wob = Wd.t; it.wobA = 0.4; word(pick(['crac !', 'scrountch', 'tchac']), p[0], p[1] - 16, 16);
  return tombe(p[0], p[1], it.d - 0.05, vx, vy);
}
function tombe(x, y, d, vx, vy) {
  d = Math.max(0, Math.min(1, d)); const L = K.prop('feuille', x / Wd.W, d); L.lift = Math.max(0, floorAt(d) - y); L.fade = L.fadeT = 1; L.a = 1; L.seed = rnd(0, 9);
  K.drop(L, vx || 0, vy || 0, rnd(-3, 3)); L.tmp = true; return L;
}

// (le survol demande aussi « qu'y a-t-il sous la main ? » pour le curseur : on n'arrache qu'au vrai appui)
// (plusieurs demandes pour le même appui : la même feuille)
let appui = 0, fin = true, deja = null;
addEventListener('pointerdown', () => { appui++; fin = false; }, true); addEventListener('pointerup', () => { fin = true; }, true); addEventListener('pointercancel', () => { fin = true; }, true);
H.grab.push((x, y) => {
  if (deja && deja.n === appui && !fin && Wd.props.includes(deja.L)) return deja.L;
  const h = feuilleAt(x, y); if (!h) return null; if (fin) return h.it;
  const L = arrache(h.it, h.f, h.p, 0, 0); L.fall = false; deja = { n: appui, L }; return L;
});
H.click.push((x, y) => {
  const h = feuilleAt(x, y); if (h) { h.f.wob = Wd.t; word(pick(['frrr', 'fshh']), x, y - 16, 14); return true; }
  // la petite plante en pot : une feuille tombe
  const pl = K.propAt(x, y); if (pl && pl.kind === 'plante' && !pl.held && Wd.t - (pl.feuT ?? -9) > 2) { pl.feuT = Wd.t; tombe(pl.x + rnd(-8, 8), pl.y - pl.s * 0.35, pl.d - 0.05, rnd(-40, 40), sOf(pl.d) * 0.5); word(pick(['oups', 'une feuille !']), pl.x, pl.y - pl.s * 0.5, 14); }
  return false;
});

H.post.push(dt => {
  const t = Wd.t, P = Wd.ptr;
  jungles().forEach(it => it.parts.feuilles.forEach((f, i) => {
    // repousse
    if (!f.on && t - f.t > 25) { f.on = true; f.g.visible = true; f.pousse = t; }
    const g = f.pousse ? Math.min(1, (t - f.pousse) / 1.2) : 1; f.g.scale.setScalar(f.k * g);
    // frémit (la souris, un clic, le vent du souffleur)
    if (P && P.on && t - P.moved < 0.2 && f.on) { const p = centre(it, f); if (Math.hypot(P.x - p[0], P.y - p[1]) < it.s * 0.25) f.wob = t; }
    const w = f.wob != null ? Math.exp(-(t - f.wob) * 3) : 0;
    f.g.rotation.x = 0.3 * (i % 2 ? 1 : -1) + Math.sin(t * 1.3 + i) * 0.05 + Math.sin(t * 14 + i) * 0.25 * w;
    f.g.rotation.z = -f.a * 1.1 + Math.sin(t * 0.9 + i * 2) * 0.04 + Math.sin(t * 11 + i) * 0.15 * w;
    if (window.Souffleur && f.on) Souffleur.souffleurs().forEach(s => { if (!(s.pw > 0.2) || !s.cone) return; const p = centre(it, f), C = s.cone, px = p[0] - C.x, py = p[1] - C.y, u = px * C.dx + py * C.dy;
      if (u < 0 || u > C.L || Math.abs(-px * C.dy + py * C.dx) > u * C.k + 30) return; f.wob = t; if (Math.random() < dt * 0.9) arrache(it, f, p, C.dx * sOf(it.d) * 4, sOf(it.d) * 2); });
  }));
  // la feuille qui tombe virevolte
  Wd.props.forEach(L => { if (L.kind !== 'feuille' || !L.fall || L.held) return; const s = sOf(L.d); L.vy = Math.max(L.vy, -s * 1.3); L.vx += Math.sin(t * 4 + L.seed) * s * 3 * dt; L.tilt = Math.sin(t * 5 + L.seed) * 0.5 * Math.min(1, Math.max(0, L.lift) / (s * 0.4)); });
  // près d'un chat : il la mange
  Wd.props.forEach(L => {
    if (L.kind !== 'feuille' || L.busy || L.suck || L.fall && !L.held) return;
    const c = Wd.cats.filter(c => free4(c) && !c.temp && !c.rare && !c.perch && Wd.t - (c.feuT ?? -99) > 25).sort((a, b) => Math.abs(a.x - L.x) - Math.abs(b.x - L.x))[0]; if (!c) return;
    const k = sc(c);
    if (L.held) { const h = c.hp; if (!h || Math.hypot(L.hx - h[0], L.hy - h[1]) > k * 0.9) { L.presT = null; return; } if (L.presT == null) { L.presT = t; say(c, pick(['?', 'snif…', 'miam ?'])); } if (t - L.presT < 0.9) return;
      // il l'attrape dans la main
      L.held = false; K.drop(L, 0, 0, 0); word(pick(['chop !', 'hop']), h[0], h[1] - 20, 16); }
    else if (Math.abs(L.x - c.x) > k * 1.6 || Math.abs(L.d - c.d) > 0.35) return;
    mange(c, L);
  });
});
function mange(c, L) {
  c.feuT = Wd.t; interrupt(c); claim(c, L); const dir = sgn(c.x - L.x) || 1;
  c.q = [go(inView(L.x + dir * sc(c) * 0.45), { d: L.d, face: -dir }), pose('curieux', rnd(0.6, 1.2), { fx: c => say(c, pick(['une feuille !', 'miam ?', 'ooh'])) }),
    pose('mange', rnd(1.4, 2.2), { fx: c => { say(c, pick(['crunch', 'scrountch', 'nom nom'])); later(1, () => { if (Wd.props.includes(L)) K.unprop(L); }); } }),
    pose('assis', 0.8, { fx: c => say(c, pick(['…', 'hmm…', 'oh oh'])) }), fn(c => { free(c); window.Arc ? Arc.vomit(c, 'feuille') : null; })];
}
// un chat joueur tape une feuille qui pend
H.think.push((c, add) => {
  if (c.temp || c.rare || c.perch) return; const it = jungles().find(it => Math.abs(it.x - c.x) < Wd.W * 0.35); if (!it) return;
  const f = it.parts.feuilles.find(f => f.on && centre(it, f)[1] > floorAt(c.d) - sc(c) * 2.2); if (!f) return;
  add((c.ch.joue || 0.5) * 0.3, () => { const p = centre(it, f);
    c.q.push(go(inView(p[0] + (sgn(c.x - p[0]) || 1) * sc(c) * 0.3), { d: Math.max(0, it.d - 0.1) }), pose('affut', rnd(0.8, 1.5)),
      pose('coucou', 1.2, { fx: c => { f.wob = Wd.t; say(c, pick(['tap', 'hihi', 'à moi'])); if (Math.random() < 0.4 && f.on) later(0.4, () => { if (f.on) arrache(it, f, centre(it, f), rnd(-30, 30), 0); }); } }), fn(free)); });
});
if (window.Bassin && Bassin.FLOTTE) Bassin.FLOTTE.feuille = 1;

return { feuilleAt, arrache, tombe };
})();
