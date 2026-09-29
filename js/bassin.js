/* Le grand bassin (27/09, Mathieu : « la fontaine devrait être un peu centrale, une grande fontaine où les chats peuvent aussi se baigner ;
   ça nous donne un point d'eau, avec les interactions avec l'eau » ; « si je fais pipi dans l'eau, l'eau devient arc-en-ciel »).
   - L'eau jaillit en haut, retombe dans la coupe, déborde dans le bassin ; des ronds dans l'eau.
   - Les chats y boivent (au bord), s'y baignent (dedans, le bas du corps sous l'eau), en sortent trempés, s'ébrouent (et arrosent les voisins).
   - Un chat lâché ou lancé au-dessus : PLOUF, il en jaillit, s'ébroue, boude.
   - Ce qu'on y lâche : les objets légers flottent (et dérivent), les lourds coulent ; les croquettes flottent.
     Un chat pêche ce qui flotte (un coup de patte, et hop, dehors).
   - La souris qui passe sur l'eau fait des ronds ; un clic, une éclaboussure.
   - Le pipi dedans : l'eau devient arc-en-ciel (js/arcenciel.js). Emporté (lourd), il déborde. */
window.Bassin = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, floorAt, free4, interrupt, claim, pose, go, hop, fn, free, inView, groundAt, perchAt, beside, xOf, later, PORTE } = K;
const TAU = Math.PI * 2, BLEU = '60,110,180';
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
const bassins = () => Wd.props.filter(b => b.kind === 'bassin' && b.a > 0.3);
if (PORTE) PORTE.bassin = 1;
if (window.Contenants && Contenants.CONT) Contenants.CONT.bassin = { fond: 0.1, w: 0.5, bord: 0.15 };
const COUL = () => window.Arc ? Arc.COUL : [BLEU];
const arc = b => b.arcT > Wd.t;

// la surface, à l'écran : le centre, les demi-axes
function surface(b) { const c = Univers.at(b, [0, b.eau.y, 0]), e = Univers.at(b, [b.eau.r, b.eau.y, 0]), f = Univers.at(b, [0, b.eau.y, b.eau.r]); return { x: c[0], y: c[1], rx: Math.hypot(e[0] - c[0], e[1] - c[1]), ry: Math.max(4, Math.abs(f[1] - c[1])) }; }
const dedans = (S, x, y, k) => ((x - S.x) / (S.rx * (k || 1))) ** 2 + ((y - S.y) / (S.ry * (k || 1))) ** 2 < 1;
function rond(b, x, y, r, n) { (b.ronds || (b.ronds = [])).push({ x, y, r: r || 1, t0: Wd.t }); if (b.ronds.length > 24) b.ronds.shift(); }
function gerbe(b, x, y, n, f) { for (let i = 0; i < n; i++) Wd.fx.push({ k: 'goutteB', x, y, vx: rnd(-1, 1) * 140 * (f || 1), vy: -rnd(120, 320) * (f || 1), y1: y + rnd(10, 40), t0: Wd.t, life: 1.2, col: arc(b) ? pick(COUL()) : BLEU }); }
function colore(b) { b.arcT = Math.max(b.arcT || 0, Wd.t + 40); const S = surface(b); for (let i = 0; i < 4; i++) rond(b, S.x + rnd(-0.5, 0.5) * S.rx, S.y + rnd(-0.4, 0.4) * S.ry, 1.5); }

/* ——— se baigner ——— */
// (27/09, l'audit : chacun son rapport à l'eau) le grincheux et le bleu détestent le bain ; le chaton et le pompon adorent
const EAU = { grincheux: 0, bleu: 0, chaton: 1.8, pompon: 1.6, nuage: 1.3, gros: 1.3 };
H.think.push((c, add) => {
  if (c.temp || c.rare || c.perch) return;
  const b = bassins().find(b => !b.held && !b.fall && b.perches.some(p => p.bain && !p.busy)); if (!b || Math.abs(c.x - b.x) > Wd.W * 0.6) return;
  const g = EAU[c.breed] ?? 1; if (g) add(((c.ch.joue || 0.3) * 0.4 + (Wd.t - (c.bainT ?? -99) > 60 ? 0.25 : 0)) * g, () => bain(c, b));
  // pêcher ce qui flotte
  const it = Wd.props.find(it => it.on === b && it.dans != null && it.flotte);
  if (it) add(1.2, () => peche(c, b, it));
});
function bain(c, b) {
  const pe = b.perches.find(p => p.bain && !p.busy); if (!pe) return; claim(c, pe); c.bainT = Wd.t;
  c.q.push(fn(c => { const w = beside(c, xOf(b), b.hull.w * 0.5 * b.s + sc(c) * 0.2); c.q.unshift(go(inView(w.x), { d: Math.max(0, b.d - 0.05), face: w.face })); }),
    hop(() => perchAt(b, pe, 0), { zr: [0, 0.4] }),
    fn(c => { const S = surface(b); gerbe(b, c.x, S.y, 8); rond(b, c.x, S.y, 1.4); word(pick(['plouf', 'splash']), c.x, S.y - 30, 18); }),
    pose('pain', rnd(4, 8), { fx: c => say(c, pick(['aaah ♥', 'mrr ♥', 'bain !', '♥'])) }), pose('assis', rnd(2, 4)),
    hop(() => groundAt(inView(xOf(b) + sgn(Math.random() - 0.5) * (b.hull.w * 0.5 * b.s + sc(c) * rnd(0.5, 1))), Math.max(0, b.d - rnd(0.1, 0.3))), { zr: [0.3, 0.65] }),
    fn(c => { c.wet = Wd.t; }), pose('secoue', 1.1, { fx: c => ebroue(c) }), fn(free));
}
// il s'ébroue : des gouttes partout, les voisins arrosés
function ebroue(c) {
  const k = sc(c); for (let i = 0; i < 12; i++) Wd.fx.push({ k: 'goutteB', x: c.x, y: c.y - k * 0.4, vx: rnd(-1, 1) * 260, vy: -rnd(60, 260), y1: floorAt(c.d), t0: Wd.t, life: 1, col: c.arcT > Wd.t && window.Arc ? pick(Arc.COUL) : BLEU });
  word(pick(['brrr', 'ébrou', 'fshhh']), c.x, c.y - k, 16);
  Wd.cats.forEach(o => { if (o === c || !free4(o) || Math.abs(o.x - c.x) > k * 1.4 || Math.abs(o.d - c.d) > 0.3) return; o.wet = Wd.t; interrupt(o); o.q = [pose('sursaut', 0.6, { fx: o => say(o, pick(['hé !', 'pfff', 'mouillé !'])) }), pose('secoue', 0.7), pose('boude', rnd(1.5, 3)), fn(free)]; });
}
function peche(c, b, it) {
  claim(c, it); const dir = sgn(c.x - it.x) || 1;
  c.q.push(go(inView(it.x + dir * sc(c) * 0.55), { d: Math.max(0, b.d - 0.05), face: -dir }), pose('affut', rnd(0.8, 1.5)),
    pose('tape', 0.5, { fx: c => { if (it.on !== b) return; const s = sOf(b.d), S = surface(b); K.drop(it, dir * s * rnd(2, 3.2), s * rnd(2.6, 3.4), rnd(-6, 6)); it.flotte = false; gerbe(b, it.x, S.y, 7); rond(b, it.x, S.y, 1.2); say(c, pick(['pêché !', 'hop !', 'à moi'])); } }),
    pose('assis', 1), fn(free));
}

/* ——— ce qui tombe dedans ——— */
H.fall.push((c, dt) => {
  if (c.vy <= 0 || c.held || Wd.fuite) return false;
  for (const b of bassins()) {
    if (b.held || b.fall) continue; const S = surface(b);
    // (lâché par la main : on juge à l'écran ; sinon, il faut être à la bonne profondeur)
    if (!(Wd.t - (c.relT ?? -9) < 3) && Math.abs(c.d - b.d) > 0.2) continue;
    // (il traverse la surface pendant cette image : à faible cadence, il peut la franchir d'un coup)
    if (Math.abs(c.x - S.x) > S.rx * 0.9 || c.y + c.vy * dt < S.y - 4 || c.y > S.y + S.ry) continue;
    const pe = b.perches.filter(p => p.bain).sort((p, q) => Math.abs(Univers.at(b, p.p)[0] - c.x) - Math.abs(Univers.at(b, q.p)[0] - c.x))[0];
    interrupt(c); c.fall = false; c.vx = c.vy = 0; c.spin = 0; c.perch = { it: b, pe, dx: 0 }; c.wet = Wd.t; c.trempe = Wd.t; if (arc(b) && window.Arc) { Arc.colore(c, 30); if (window.Dex) Dex.vu('bainarc'); }   /* (27/09, Mathieu : tombé dedans, il est trempé et laisse des traces ; l'eau arc-en-ciel le colore) */
    gerbe(b, c.x, S.y, 16, 1.4); rond(b, c.x, S.y, 2); word(pick(['PLOUF', 'SPLASH']), c.x, S.y - 40, 26); say(c, EAU[c.breed] === 0 ? pick(['KSSSS !!', 'AU SECOURS', 'NOOON']) : c.b.s >= 1.3 ? pick(['je flotte ♥', 'glouglou', 'plof ♥']) : pick(['MIAAA !', 'NYAAA', '!!!']));
    c.q = [pose('sursaut', 0.6), hop(() => groundAt(inView(xOf(b) + (sgn(c.x - b.x) || 1) * (b.hull.w * 0.5 * b.s + sc(c) * rnd(0.6, 1.1))), Math.max(0, b.d - rnd(0.1, 0.3))), { zr: [0.3, 0.65] }),
      pose('secoue', 1.2, { fx: c => ebroue(c) }), pose('boude', rnd(2, 4), { fx: c => say(c, pick(['pfff.', 'hmpf', 'trempé…'])) }), fn(free)];
    return true;
  }
  return false;
});
// les objets : ils flottent (légers) ou coulent (lourds) ; ça éclabousse en entrant
const FLOTTE = { pelote: 1, poisson: 1, coussin: 1, panier: 1, tasse: 1, carton: 1, plante: 0 };
H.post.push(dt => {
  bassins().forEach(b => {
    const S = surface(b);
    Wd.props.forEach(it => {
      if (it.on !== b || it.dans == null) { if (it.bainB === b) it.bainB = null; return; }
      if (it.bainB !== b) { it.bainB = b; it.flotte = !!FLOTTE[it.kind]; gerbe(b, it.x, S.y, 10); rond(b, it.x, S.y, 1.5); word(it.flotte ? pick(['plouf', 'ploc']) : pick(['blub', 'glou glou']), it.x, S.y - 26, 16); it.drift = rnd(0, TAU); }
      // (flotte : à la surface, il danse et dérive ; coule : au fond, sous l'eau)
      if (it.flotte) { it.dans = 0.09 + Math.sin(Wd.t * 2.2 + it.drift) * 0.01; it.onDx = Math.max(-0.42, Math.min(0.42, (it.onDx || 0) + Math.sin(Wd.t * 0.3 + it.drift) * dt * 0.03)); it.tilt = Math.sin(Wd.t * 1.7 + it.drift) * 0.08; if (Math.random() < dt * 0.4) rond(b, it.x, S.y, 0.7); }
      else it.dans = 0.02;
    });
    // les croquettes : elles flottent
    Wd.kib.forEach(k => { if (k.dans === b) { if (!k.bainB) { k.bainB = 1; rond(b, k.x, S.y, 0.5); } k.ddy = Math.sin(Wd.t * 2 + k.ddx * 9) * 1.5; } });
    // emporté : ça déborde
    if ((b.held || b.fall) && Math.random() < 0.5) gerbe(b, S.x + rnd(-1, 1) * S.rx, S.y, 1, 0.6);
    // les chats dans l'eau : ils flottent un peu, font des ronds
    Wd.cats.forEach(c => { if (!c.perch || c.perch.it !== b || !c.perch.pe.bain) return; c.wet = Wd.t; c.trempe = Wd.t; if (arc(b) && window.Arc && !(c.arcT > Wd.t + 20)) Arc.colore(c, 30); c.y += Math.sin(Wd.t * 2 + c.x) * 1.5; if (Math.random() < dt * 1.2) rond(b, c.x + rnd(-10, 10), S.y + rnd(-3, 3), 0.9); });
    // la souris qui passe sur l'eau
    const P = Wd.ptr; if (P && P.on && Wd.t - P.moved < 0.2 && dedans(S, P.x, P.y) && Wd.t - (b.ptrT ?? -9) > 0.18) { b.ptrT = Wd.t; rond(b, P.x, P.y, 0.6); }
  });
});
H.click.push((x, y) => {
  for (const b of bassins()) { const S = surface(b); if (!dedans(S, x, y, 1.05)) continue;
    gerbe(b, x, y, 10); rond(b, x, y, 1.6); word(pick(['splash', 'plic', 'ploc']), x, y - 24, 16);
    Wd.cats.forEach(c => { if (c.perch && c.perch.it === b && Math.abs(c.x - x) < sc(c) * 1.2) { say(c, pick(['hé !', 'hihi', 'splash !'])); c.wet = Wd.t; } });
    return true; }
  return false;
});

/* ——— le dessin : le jet, la coupe qui déborde, les ronds ——— */
H.draw.unshift(() => {
  const ctx = Chalk.ctx; if (!ctx) return; const t = Wd.t;
  bassins().forEach(b => {
    const A = b.a * Wd.a, rb = arc(b), CO = COUL(), col = i => rb ? CO[(i + Math.floor(t * 3)) % CO.length] : null;
    const top = Univers.at(b, b.jet), S = surface(b);
    // le jet : quatre filets qui retombent dans la coupe
    [0.4, 2, 3.6, 5.2].forEach((a, i) => { const e = Univers.at(b, [Math.cos(a) * b.coupe.r * 0.8, b.coupe.y + 0.01, Math.sin(a) * b.coupe.r * 0.8]), cx = top[0] + (e[0] - top[0]) * 0.4, cy = top[1] - b.s * 0.1, P = [];
      for (let j = 0; j <= 10; j++) { const u = j / 10, v = 1 - u; P.push([v * v * top[0] + 2 * v * u * cx + u * u * e[0], v * v * top[1] + 2 * v * u * cy + u * u * e[1]]); }
      Chalk.stroke(P, 1, { w: 1.3, a: 0.5 * A, amp: 0.3, seed: 21 + i, tip: false, color: col(i) });
      const u = (t * 1.3 + i / 4) % 1, v = 1 - u; Chalk.dot(v * v * top[0] + 2 * v * u * cx + u * u * e[0], v * v * top[1] + 2 * v * u * cy + u * u * e[1], 1.8, 0.6 * A, col(i) || undefined); });
    // la coupe déborde : des rideaux d'eau jusqu'au bassin
    [0.3, 1.9, 3.3, 4.7].forEach((a, i) => { const e0 = Univers.at(b, [Math.cos(a) * b.coupe.r, b.coupe.y, Math.sin(a) * b.coupe.r]), e1 = Univers.at(b, [Math.cos(a) * b.coupe.r * 1.25, b.eau.y, Math.sin(a) * b.coupe.r * 1.25]);
      if (Math.sin(a) < -0.2) return;   // (derrière la colonne)
      Chalk.stroke([e0, [e0[0] + (e1[0] - e0[0]) * 0.3, e0[1] + (e1[1] - e0[1]) * 0.5], e1], 1, { w: 1.1, a: 0.35 * A, amp: 0.4, seed: 31 + i, tip: false, color: col(i + 2) });
      const u = (t * 1.1 + i / 4) % 1; Chalk.dot(e0[0] + (e1[0] - e0[0]) * u, e0[1] + (e1[1] - e0[1]) * u * u, 1.6, 0.55 * A, col(i + 2) || undefined);
      if (Math.random() < 0.03) rond(b, e1[0], e1[1], 0.6); });
    // les ronds dans l'eau (bornés au bassin)
    (b.ronds || []).forEach((r, i) => { const u = (t - r.t0) / 1.6; if (u > 1) return; const R = Math.min(S.rx * 0.9 - Math.abs(r.x - S.x) * 0.5, (6 + u * 34) * r.r);
      if (R < 2) return; Chalk.circle(r.x, r.y, R, R * S.ry / S.rx, 1, { w: 1.1, a: 0.45 * A * (1 - u), seed: i + 3, color: col(i) }); });
    // l'arc-en-ciel : des reflets de couleur à la surface
    if (rb) for (let i = 0; i < 6; i++) { const q = t * 0.6 + i; Chalk.circle(S.x + Math.sin(q) * S.rx * 0.35, S.y + Math.cos(q * 1.3) * S.ry * 0.3, S.rx * (0.22 - i * 0.02), S.ry * (0.22 - i * 0.02), 1, { w: 2, a: 0.35 * A * Math.min(1, (b.arcT - t) / 3), seed: 40 + i, color: CO[i % CO.length] }); }
  });
  // les gouttes
  Wd.fx.forEach(f => { if (f.k !== 'goutteB') return; const dt = t - f.t0, x = f.x + f.vx * dt, y = f.y + f.vy * dt + 600 * dt * dt; if (y > f.y1 && dt > 0.2) return; Chalk.dot(x, y, 1.9, 0.7 * Wd.a * (1 - dt / f.life), f.col); });
});

// une grosse éclaboussure (un lourd qui tombe dedans, js/liens.js) : les voisins sont arrosés
function eclabousse(b, x, f) { const S = surface(b); gerbe(b, x, S.y, Math.round(14 * f), f); rond(b, x, S.y, 2 * f); rond(b, x, S.y, 1.2 * f);
  Wd.cats.forEach(c => { if (!c.hp || c.held || c.rare || Math.abs(c.x - x) > S.rx * 1.6) return; c.wet = Wd.t; if (Math.random() < 0.6) say(c, EAU[c.breed] === 0 ? pick(['KSSS !', 'BEURK', 'pas l’eau !!']) : pick(['hé !', 'mouillé !', 'pfff'])); }); }

return { EAU, surface, colore, bain, bassins, FLOTTE, eclabousse, rond, gerbe };
})();
