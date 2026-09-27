/* Le canapé (27/09, Mathieu : « il faut aussi un canapé, je pense »). Au fond, sur un grand écran.
   - Les chats y font la sieste (l'assise), surveillent du haut du dossier, se posent sur un accoudoir.
   - Ils font leurs griffes sur les accoudoirs (scritch : des traces qui restent un moment).
   - Un chat lâché dessus rebondit (boing) avant de s'y poser ; un objet lâché dessus reste sur l'assise.
   - Lourd : on le déplace lentement, ceux qui sont dessus suivent (et s'accrochent, js/accroche.js). */
window.Canape = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, floorAt, free4, interrupt, claim, pose, go, hop, fn, free, inView, groundAt, perchAt, beside, xOf, PORTE } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
const canapes = () => Wd.props.filter(b => b.kind === 'canape' && b.a > 0.3);
if (PORTE) PORTE.canape = 1;
if (window.Contenants && Contenants.CONT) Contenants.CONT.canape = { fond: 0.27, w: 0.6, bord: 0.3 };
const descend = (c, b) => hop(() => groundAt(inView(xOf(b) + sgn(Math.random() - 0.5) * (b.hull.w * 0.5 * b.s + sc(c) * rnd(0.4, 0.9))), Math.max(0, b.d - rnd(0.15, 0.4))), { zr: [0.3, 0.65] });

H.think.push((c, add) => {
  if (c.temp || c.rare || c.perch) return; const b = canapes().find(b => !b.held && !b.fall && Math.abs(b.x - c.x) < Wd.W * 0.5); if (!b) return;
  const libres = b.perches.filter(p => !p.busy);
  // la sieste (l'assise), la vigie (le dossier), l'accoudoir
  if (libres.length) add(c.ch.dort * 0.2 + 0.1, () => {
    const pe = pick(libres); claim(c, pe);
    c.q.push(fn(c => { const w = beside(c, xOf(b), b.hull.w * 0.5 * b.s * 0.6); c.q.unshift(go(inView(w.x), { d: Math.max(0, b.d - 0.1), face: w.face })); }),
      ...(pe.lv === 2 ? [hop(() => perchAt(b, b.perches[0], 0), { zr: [0, 0.4] }), pose('affut', 0.6)] : []),
      hop(() => perchAt(b, pe, rnd(-0.5, 0.5) * pe.w), { zr: [0, 0.4] }),
      ...(pe.id.startsWith('assise') ? [pose('petrit', rnd(1.5, 3), { fx: c => say(c, '♥') }), pose(pick(['dodo', 'donut', 'dodo']), rnd(10, 20), { zzz: 1 }), pose('etirement', 2.5)]
        : pe.id === 'dossier' ? [pose('pain', rnd(5, 10), { fx: c => say(c, pick(['vigie.', 'je surveille', 'mrr'])) }), pose('curieux', rnd(2, 4))]
        : [pose('assis', rnd(3, 6)), pose('toilette', rnd(2, 4))]),
      descend(c, b), fn(free));
  });
  // les griffes sur l'accoudoir
  add(c.ch.casse * 0.25 + 0.05, () => {
    const sd = Math.random() < 0.5 ? -1 : 1, e = () => Univers.at(b, [sd * 0.86, 0.2, 0.1]);
    c.q.push(fn(c => { const p = e(); c.q.unshift(go(inView(p[0] + sd * sc(c) * 0.35), { d: Math.max(0, b.d - 0.08), face: -sd })); }),
      pose('dresse', rnd(1.5, 2.8), { fx: c => { say(c, pick(['scritch scritch', 'krrr', '♪'])); (b.griffes || (b.griffes = [])).push({ sd, t0: Wd.t, seed: Math.floor(Math.random() * 99), y: rnd(0.15, 0.32) }); } }),
      pose('assis', 1, { fx: c => say(c, pick(['voilà.', 'parfait', '✨'])) }), fn(free));
  });
});

// lâché dessus : il rebondit (boing), puis s'y pose (en premier : sinon les places de l'assise le rattrapent avant le rebond)
H.fall.unshift((c, dt) => {
  if (c.vy <= 0 || c.held) return false;
  for (const b of canapes()) {
    if (b.held || b.fall) continue; if (!(Wd.t - (c.relT ?? -9) < 3) && Math.abs(c.d - b.d) > 0.2) continue;
    const L = Univers.at(b, [-0.66, 0.27, 0.05]), R = Univers.at(b, [0.66, 0.27, 0.05]), y = (L[1] + R[1]) / 2;
    if (c.x < Math.min(L[0], R[0]) || c.x > Math.max(L[0], R[0]) || c.y + c.vy * dt < y - 4 || c.y > y + 30) continue;
    if (!c.boing || Wd.t - c.boing > 2) { c.boing = Wd.t; c.y = y - 1; c.vy = -Math.min(Math.abs(c.vy) * 0.5, sOf(b.d) * 5); word(pick(['boing', 'boiing', 'pouf']), c.x, y - 30, 20); say(c, pick(['wiii', 'hihi', '!'])); b.wob = Wd.t; b.wobA = 0.12; return true; }
    const pe = b.perches.filter(p => p.lv === 1 && p.id.startsWith('assise')).sort((p, q) => Math.abs(Univers.at(b, p.p)[0] - c.x) - Math.abs(Univers.at(b, q.p)[0] - c.x))[0];
    interrupt(c); c.fall = false; c.vx = c.vy = 0; c.spin = 0; c.boing = 0; c.perch = { it: b, pe, dx: 0 };
    c.q = [pose('atterrit', 0.3), pose(pick(['assis', 'pain']), rnd(2, 5)), descend(c, b), fn(free)];
    return true;
  }
  return false;
});

// les traces de griffes sur les accoudoirs
H.draw.push(() => {
  if (!window.Chalk || Wd.a < 0.3) return;
  canapes().forEach(b => {
    (b.griffes || []).forEach(g => { const u = (Wd.t - g.t0) / 40; if (u > 1) return; const a = Wd.a * b.a * (1 - Math.max(0, (u - 0.7) / 0.3));
      for (let j = 0; j < 3; j++) { const p0 = Univers.at(b, [g.sd * 0.845, g.y + 0.1, 0.12 + j * 0.05]), p1 = Univers.at(b, [g.sd * 0.845, g.y, 0.13 + j * 0.05]); Chalk.line(p0[0], p0[1], p1[0], p1[1], Math.min(1, (Wd.t - g.t0) * 1.5), { w: 1.2, a: 0.6 * a, seed: g.seed + j, tip: false, amp: 0.4 }); } });
    if (b.griffes && b.griffes.length > 12) b.griffes.shift();
  });
});

return { canapes };
})();
