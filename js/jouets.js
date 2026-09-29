/* Le coffre à jouets et la canne à plume.
   - Le coffre (Univers : 'coffre') est dans le décor ; un bout de canne dépasse sous le couvercle.
   - Un clic sur le coffre : le couvercle s'ouvre, on prend la canne. Avec une souris, on la tient : son bout suit le pointeur,
     la plume pend au fil (js/vie.js) et les chats la chassent. Sur un écran tactile, elle se plante devant le coffre.
   - Un clic ailleurs (dans la main) : on la plante là, penchée, la plume se balance toute seule ; les chats viennent jouer.
   - Un clic sur la canne plantée : on la reprend. Un clic sur le coffre quand elle est sortie : on la range.
   K.bout() donne le bout de la canne (là où pend le fil), ou null quand elle est rangée. */
window.Jouets = (() => {
if (!window.Chats || !Chats.K || !window.Vie) return null;
const K = Chats.K, { Wd, H, rnd, pick, clamp, sgn, sc, floorAt, say, dust, interrupt, free4, go, pose, fn, inView } = K;
const ptr = Vie.ptr;
const J = { st: 'coffre', fx: 0.5, d: 0.12, lean: 0, wob: 0, wobT: 0, lid: -9, o: 0, hx: 0, hy: 0 };
const box = () => { const b = Wd.P && Wd.P.coffre; return b && Wd.props.includes(b) && !b.suck ? b : null; };
const LEN = () => Wd.s0 * 1.25;
const mouse = () => ptr.on && Wd.t - ptr.moved < 20;
const at = (b, p) => Univers.at(b, p);

// le pied et le bout de la canne, à l'écran
function ends() {
  const L = LEN();
  if (J.st === 'main') {
    const tip = mouse() ? [ptr.x, ptr.y] : [J.hx, J.hy];
    // la main tient le manche plus bas ; la canne monte en biais jusqu'au bout (sous le pointeur)
    return [[tip[0] - L * 0.5, tip[1] + L * 0.62], tip];
  }
  if (J.st === 'posee') {
    const x = J.fx * Wd.W, y = floorAt(J.d), q = J.lean + Math.sin(Wd.t * 1.1) * 0.035 + J.wob * Math.sin((Wd.t - J.wobT) * 9) * Math.exp(-(Wd.t - J.wobT) * 2.5);
    return [[x, y], [x + Math.sin(q) * L, y - Math.cos(q) * L]];
  }
  return null;
}
K.bout = () => { const e = ends(); return e ? e[1] : null; };

// la plantée : la plume se balance d'elle-même (un souffle, de temps en temps)
H.pre.push(() => {
  if (J.st !== 'posee' || Wd.t < (J.gust || 0)) return; J.gust = Wd.t + rnd(1.5, 4);
  const pl = Vie.plume; if (pl) { pl.vx += rnd(-1, 1) * Wd.s0 * 2.5; pl.vy -= Wd.s0 * rnd(0, 1.5); }
});
// le couvercle : il s'ouvre quand on prend ou range la canne
H.post.push(dt => {
  const b = box(); if (!b || !b.parts.couvercle) return;
  J.o += ((Wd.t < J.lid ? 1 : 0) - J.o) * Math.min(1, dt * 9); b.parts.couvercle.rotation.x = -1.3 * J.o;
});
// un chat qui aime jouer va voir la canne plantée (la chasse fait le reste : js/vie.js)
H.think.push((c, add) => {
  if (J.st !== 'posee' || c.temp || Wd.t < (c.chaseCool || 0)) return; const tip = K.bout(), s = sc(c);
  // (deux joueurs à la fois, pas plus : sinon tous les chats bondissent au même endroit, en boucle)
  if (Wd.cats.filter(o => o !== c && (o.task && o.task.k === 'chasse' || o.q.some(q => q.k === 'chasse'))).length >= 2) return;
  add(0.4 + c.ch.joue * 0.6, () => { const side = sgn(c.x - tip[0]) || 1;
    c.q.push(go(inView(tip[0] + side * s * 1.1), { d: clamp(J.d + rnd(-0.08, 0.1), 0, 0.5), face: -side }), pose('affut', rnd(0.6, 1.2), { face: -side }), { k: 'chasse', max: rnd(6, 12) }); });
});

function take(b) {
  J.lid = Wd.t + 1.1; const top = at(b, [0, 0.35, 0]);
  if (mouse()) J.st = 'main';
  else { plant(b.x - sgn(b.x - Wd.W / 2 || 1) * Wd.s0 * 0.9, b.d * 0.5); }
  J.hx = top[0]; J.hy = top[1] - Wd.s0 * 0.3;
  Wd.fx.push({ k: 'txt', text: pick(['une canne à plume !', 'hop, un jouet', 'à vous, les chats !']), x: top[0], y: top[1] - Wd.s0 * 0.5, t0: Wd.t, life: 1.6, rot: -0.06, size: 18 });
  // les joueurs dressent l'oreille
  Wd.cats.forEach(c => { if (free4(c) && !c.temp && Math.random() < 0.3 + c.ch.joue * 0.2) say(c, pick(['!', '!!', 'oh ?'])); });
}
function stow() {
  const b = box(); J.st = 'coffre'; if (!b) return; J.lid = Wd.t + 0.8; const top = at(b, [0, 0.35, 0]);
  Wd.fx.push({ k: 'txt', text: pick(['rangée', 'au coffre !']), x: top[0], y: top[1] - Wd.s0 * 0.4, t0: Wd.t, life: 1.2, rot: 0.05, size: 16 });
  Wd.cats.forEach(c => { if (c.task && c.task.k === 'chasse' && !c.task.aim && Math.random() < 0.5) say(c, pick(['oh…', 'encore !', 'mrr ?'])); });
}
function plant(x, d) {
  J.st = 'posee'; J.fx = clamp(x, Wd.s0 * 0.4, Wd.W - Wd.s0 * 0.4) / Wd.W; J.d = d;
  // penchée vers le milieu de l'écran (la plume pend au-dessus du sol libre)
  J.lean = clamp((Wd.W / 2 - x) / Wd.W * 1.2, -0.35, 0.35) + rnd(-0.08, 0.08); J.wob = 0.25; J.wobT = Wd.t;
  dust(x, floorAt(d), Wd.s0 * 0.2, 0.5); Wd.fx.push({ k: 'txt', text: 'tchac', x, y: floorAt(d) - 10, t0: Wd.t, life: 1, rot: -0.1, size: 14 });
}
// la profondeur d'un point cliqué (sur le sol : la bande devant ; au-dessus, au premier plan)
function depthAt(y) { let best = 0.12, e = 1e9; for (let d = 0; d <= 0.5; d += 0.02) { const k = Math.abs(floorAt(d) - y); if (k < e) { e = k; best = d; } } return best; }
function nearStick(x, y) {
  const e = ends(); if (!e) return false; const [a, b] = e, vx = b[0] - a[0], vy = b[1] - a[1], u = clamp(((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy), 0, 1);
  const pl = Vie.plume, onPlume = pl && Math.hypot(pl.x - x, pl.y - y) < 22;
  return onPlume || Math.hypot(a[0] + vx * u - x, a[1] + vy * u - y) < 16;
}
H.click.unshift((x, y) => {
  const b = box(), onBox = b && K.propAt(x, y) === b && !K.catAt(x, y);
  if (onBox) { if (J.st === 'coffre') take(b); else stow(); return true; }
  if (J.st === 'main') { plant(x, depthAt(y)); return true; }
  if (J.st === 'posee' && nearStick(x, y)) { J.st = 'main'; const e = ends(); J.hx = e ? e[1][0] : x; J.hy = e ? e[1][1] : y; return true; }
  return false;
});
// le coffre sert aussi aux chats : on s'assoit dessus ; un joueur soulève le couvercle et en sort la canne tout seul
H.think.push((c, add) => {
  const b = box(); if (!b || c.temp || c.rare || b.held || b.fall || b.busy || Wd.t < 15) return; const s = sc(c), side = sgn(c.x - b.x) || 1, pe = b.perches && b.perches[0];
  if (pe) add(0.25 + c.ch.grimpe * 0.2, () => { K.claim(c, b);
    c.q.push(go(inView(b.x + side * s * 0.8), { g: 'trot', face: -side }), pose('affut', 0.5, { face: -side }), K.hop(() => K.perchAt(b, pe, rnd(-0.05, 0.05)), { live: true, zr: [0, 0.4] }),
      pose(pick(['assis', 'pain', 'toilette']), rnd(4, 9), { fx: c => { if (Math.random() < 0.4) say(c, pick(['mon coffre', 'mrrp', '♥'])); } }), fn(K.free)); });
  if (J.st === 'coffre') add(0.12 + c.ch.joue * 0.25, () => { K.claim(c, b);
    c.q.push(go(inView(b.x + side * s * 0.75), { g: 'trot', face: -side }), pose('affut', rnd(0.5, 1), { face: -side }),
      pose('tape', 0.7, { face: -side, fx: c => { J.lid = Wd.t + 1.4; say(c, pick(['!', 'hmm ?'])); } }),
      pose('tape', 0.6, { face: -side, fx: c => { if (J.st !== 'coffre' || !box()) return; plant(b.x + side * s * 1.3, b.d * 0.5);
        Wd.fx.push({ k: 'txt', text: pick(['il a trouvé la canne !', 'à moi le jouet !']), x: b.x, y: b.y - b.hull.h * b.s - Wd.s0 * 0.3, t0: Wd.t, life: 1.6, rot: -0.06, size: 17 }); } }),
      fn(K.free), { k: 'chasse', max: rnd(6, 10) }); });
});
// le coffre part (aspiré, remis à sa place) : la canne rangée revient avec lui ; une canne plantée reste
H.pre.push(() => { if (J.st === 'main' && !mouse() && Wd.t - J.lid > 30) plant(J.hx, 0.12); });

/* ——— la craie ——— */
function drawCanne() {
  const C = Chalk; if (!C.ctx) return; const b = box(), a = Wd.a;
  // rangée : le bout de la canne et une touffe de plume dépassent sous le couvercle ; « jouets » écrit à la main devant
  if (b && b.a > 0.3) {
    const f = at(b, [0, 0.13, 0.17]); C.text('jouets', f[0], f[1] + Wd.s0 * 0.02, 1, { size: Math.max(11, Wd.s0 * 0.085), align: 'center', a: 0.55 * a * b.a });
    if (J.st === 'coffre') { const p0 = at(b, [0.1, 0.27 + J.o * 0.05, 0.02]), p1 = at(b, [0.2, 0.45 + J.o * 0.15, -0.02]); C.line(p0[0], p0[1], p1[0], p1[1], 1, { w: 2.4, a: 0.85 * a * b.a, seed: 71, tip: false });
      for (let i = 0; i < 5; i++) { const q = -0.9 + i * 0.35 + Math.sin(Wd.t * 2 + i) * 0.08, r = Wd.s0 * (0.08 + (i % 2) * 0.03); C.line(p1[0], p1[1], p1[0] + Math.cos(q) * r, p1[1] + Math.sin(q) * r - r * 0.4, 1, { w: 1.1, a: 0.6 * a * b.a, seed: 72 + i, tip: false, amp: 0.2 }); } }
  }
  const e = ends(); if (!e) return; const [p, q] = e;
  // le manche (plus épais en bas), le bout ; plantée : un petit tas de terre au pied
  C.line(p[0], p[1], q[0], q[1], 1, { w: 3, a: 0.85 * a, seed: 73, tip: false, amp: 0.15 });
  const mx = p[0] + (q[0] - p[0]) * 0.18, my = p[1] + (q[1] - p[1]) * 0.18; C.line(p[0], p[1], mx, my, 1, { w: 5, a: 0.85 * a, seed: 74, tip: false, amp: 0.1 });
  if (J.st === 'posee') C.stroke([[p[0] - 9, p[1] + 1], [p[0] - 3, p[1] - 3], [p[0] + 4, p[1] - 3], [p[0] + 10, p[1] + 1]], 1, { w: 1.4, a: 0.6 * a, seed: 75, tip: false });
}
H.draw.push(drawCanne);

return { get etat() { return J.st; }, take: () => { const b = box(); if (b && J.st === 'coffre') take(b); }, stow, plant: (x, d) => plant(x, d ?? 0.12) };
})();
