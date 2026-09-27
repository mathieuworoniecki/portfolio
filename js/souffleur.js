/* Le souffleur (27/09, Mathieu : « un objet type souffleur par terre : si je le prends, ça souffle tous les objets légers, et les chats aussi,
   qui vont partout en l'air »).
   - Dans la main, il souffle : la buse se tourne du côté où on l'emmène ; devant elle, un cône de vent (des traits de craie qui filent).
   - Dans le vent : les objets légers s'envolent (et restent en l'air tant qu'on souffle), les croquettes filent, les chats décollent
     (« wiii », « MIAAA »), les traces arc-en-ciel glissent, l'eau du bassin frissonne. Les lourds (l'arbre, le distributeur, le canapé) ne bougent pas.
   - Un clic dessus : une bouffée. Un chat curieux lui donne un coup de patte : pfff ! il saute en l'air. */
window.Souffleur = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, floorAt, free4, interrupt, claim, pose, go, fn, free, inView, LOURD, clamp } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
const souffleurs = () => Wd.props.filter(it => it.kind === 'souffleur' && it.a > 0.3);
const LOURDS = it => LOURD[it.kind] || it.kind === 'distrib' || it.kind === 'lanceur' || it.kind === 'bassin' || it.kind === 'canape';

// le cône : le bout de la buse, la direction (à l'écran), la portée
function cone(it) { const a = Univers.at(it, it.corps), t = Univers.at(it, it.buse); let dx = t[0] - a[0], dy = t[1] - a[1]; const n = Math.hypot(dx, dy) || 1; return { x: t[0], y: t[1], dx: dx / n, dy: dy / n, L: Wd.s0 * 3.4, k: 0.5 }; }
function dansCone(C, x, y) { const px = x - C.x, py = y - C.y, u = px * C.dx + py * C.dy; if (u < -10 || u > C.L) return 0; const v = Math.abs(-px * C.dy + py * C.dx); if (v > Math.max(0, u) * C.k + 24) return 0; return (1 - u / C.L) * (1 - 0.5 * v / (u * C.k + 24)); }

H.post.push(dt => {
  souffleurs().forEach(it => {
    // dans la main : la buse suit le geste (vers la droite, vers la gauche)
    if (it.held) { const s = sOf(it.d), hv = (it.hx - (it.phx ?? it.hx)) / Math.max(dt, 1 / 120); it.phx = it.hx; if (Math.abs(hv) > s * 1.2) it.dir = sgn(hv);
      const yaw = (it.dir ?? -1) > 0 ? -0.35 : Math.PI + 0.35; it.yaw += (yaw - it.yaw) * Math.min(1, dt * 8); if (!it.onT) { it.onT = Wd.t; word('vrrr', it.x, it.y - it.s * 0.4, 16); } }
    else { it.phx = null; if (it.onT && !(it.puff > Wd.t)) it.onT = 0; }
    const on = it.held || it.puff > Wd.t; if (!on) { it.pw = Math.max(0, (it.pw || 0) - dt * 4); return; }
    if (!it.onT) it.onT = Wd.t; it.pw = Math.min(1, (it.pw || 0) + dt * 3);
    const C = cone(it), P = it.pw, s0 = Wd.s0; it.cone = C;
    if (Wd.t - (it.motT ?? -9) > 1.6) { it.motT = Wd.t; word(pick(['FOUUU', 'fshhhh', 'VRRR']), C.x + C.dx * C.L * 0.4, C.y + C.dy * C.L * 0.4 - 20, 20); }
    // les objets
    Wd.props.forEach(o => {
      if (o === it || o.held || o.mur || o.run || o.suck || LOURDS(o) || o.a < 0.5) return;
      const f = dansCone(C, o.x, o.y - o.hull.h * o.s * 0.5) * P; if (f <= 0.02) return; const s = sOf(o.d), m = o.r ? 0.6 : Math.min(2.5, 0.5 + o.hull.w * o.hull.h * 6);
      if (!o.fall) { K.drop(o, C.dx * s * 5 * f / m, s * (2 + 3 * f) / m, rnd(-5, 5)); o.dans = null; o.soufT = Wd.t; return; }
      o.vx += C.dx * s * 14 * f / m * dt; o.vy += (s * 11 * f / m - C.dy * s * 6 * f) * dt; if (o.tiltV != null) o.tiltV += rnd(-8, 8) * f * dt;
    });
    // les croquettes
    Wd.kib.forEach(k => { const f = dansCone(C, k.x, k.y) * P; if (f <= 0.02 || k.who || k.suck) return; k.dans = null; k.rest = false; k.vx = (k.vx || 0) + C.dx * 900 * f * dt; k.vy = (k.vy || 0) - (700 * f - C.dy * 300 * f) * dt; });
    // les chats : ils décollent
    Wd.cats.forEach(c => {
      if (c.held || c.hidden || c.gone || !c.hp || (c.rare && ['geant', 'interminable', 'totem'].includes(c.rare))) return;
      const f = dansCone(C, c.x, c.y - sc(c) * 0.4) * P; if (f <= 0.05) return; const s = sOf(c.d);
      if (!c.fall) { interrupt(c); c.fall = true; c.jump = null; c.vx = C.dx * s * 6 * f; c.vy = -s * (3.5 + 4 * f); c.soufT = Wd.t; say(c, pick(c.breed === 'grincheux' ? ['KSSS !', 'ARRÊTE !', 'pfff !'] : ['wiiii !', 'MIAAA', 'wouhou !', 'aaah !', 'NYAAA'])); return; }
      c.vx += C.dx * s * 10 * f * dt; c.vy -= (s * 13 * f - C.dy * s * 5 * f) * dt; c.vx = clamp(c.vx, -s * 12, s * 12); c.vy = Math.max(c.vy, -s * 9);
    });
    // les traces arc-en-ciel glissent
    if (window.Arc) Arc.T.forEach(f => { const q = dansCone(C, f.x, f.y) * P; if (q > 0.05 && f.k !== 'patte') f.x += C.dx * 160 * q * dt; });
    // l'eau frissonne
    if (window.Bassin) Bassin.bassins().forEach(b => { const S = Bassin.surface(b), q = dansCone(C, S.x, S.y) * P; if (q > 0.05 && Math.random() < dt * 8 * q) (b.ronds || (b.ronds = [])).push({ x: S.x + rnd(-0.7, 0.7) * S.rx, y: S.y + rnd(-0.5, 0.5) * S.ry, r: 0.8, t0: Wd.t }); });
  });
});

// un clic : une bouffée
H.click.push((x, y) => { const it = K.propAt(x, y); if (!it || it.kind !== 'souffleur') return false; it.puff = Wd.t + 0.7; word('pfff !', x, y - 24, 18); return true; });
// un chat curieux : un coup de patte… pfff ! il saute en l'air
H.think.push((c, add) => {
  if (c.temp || c.rare || c.perch) return; const it = souffleurs().find(it => !it.held && !it.fall && !it.busy && Math.abs(it.x - c.x) < Wd.W * 0.4); if (!it) return;
  add(c.ch.joue * 0.12 + 0.03, () => { claim(c, it); const dir = sgn(c.x - it.x) || 1;
    c.q.push(go(inView(it.x + dir * sc(c) * 0.6), { d: Math.max(0, it.d - 0.03), face: -dir }), pose('curieux', rnd(1, 2), { fx: c => say(c, pick(['?', 'snif', 'hmm'])) }),
      pose('tape', 0.5, { fx: c => { it.puff = Wd.t + 0.5; } }), pose('sursaut', 0.7, { fx: c => say(c, pick(['!!!', 'pfff !?', 'MIA !'])) }),
      fn(c => { free(c); c.q.push(go(inView(c.x + dir * sc(c) * 2), { g: 'galop' }), pose('boude', rnd(1.5, 3)), fn(free)); })); });
});

// le vent : des traits de craie qui filent dans le cône
H.draw.push(() => {
  if (!window.Chalk || Wd.a < 0.3) return;
  souffleurs().forEach(it => {
    if (!(it.pw > 0.02) || !it.cone) return; const C = it.cone, t = Wd.t, A = it.pw * Wd.a;
    for (let i = 0; i < 7; i++) {
      const u0 = ((t * 1.6 + i * 0.37) % 1), v = (((i * 0.618) % 1) - 0.5) * 2, P = [];
      for (let j = 0; j <= 6; j++) { const u = (u0 + j * 0.035) * C.L, w = v * (u * C.k * 0.8 + 10) + Math.sin(t * 9 + i + j * 0.8) * 5; P.push([C.x + C.dx * u - C.dy * w, C.y + C.dy * u + C.dx * w]); }
      Chalk.stroke(P, 1, { w: 1.3, a: 0.5 * A * Math.sin(u0 * Math.PI), seed: 60 + i, tip: false, amp: 0.2 });
    }
  });
});

return { cone, souffleurs };
})();
