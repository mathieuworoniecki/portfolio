/* Le parcours au mur (27/09, Mathieu : « une animation où les chats s'accrochent : une sorte de parcours pour chats, accroché au mur,
   pour qu'ils atteignent les boutons ; ils doivent sauter, parfois se rater, s'accrocher avec leurs griffes, réussir à remonter, ou bien glisser et tomber »).
   Sur un grand écran : des étagères au mur, en zigzag, du sol jusqu'au bouton « Restez jouer ici ».
   - Un chat grimpeur s'y lance : il vise, saute d'étagère en étagère… parfois il se rate : pendu par les griffes au bord (scriiitch),
     il se hisse, ou glisse et tombe (et retombe sur ses pattes, ou sur l'étagère d'en dessous). En haut : le bouton.
   - Un chat lâché au-dessus d'une étagère s'y pose. Un clic sur une étagère la fait trembler (celui qui est dessus sursaute). */
window.Parcours = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, STEPS, rnd, pick, sgn, sc, sOf, say, floorAt, free4, interrupt, pose, go, fn, free, inView, clamp } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
const bouton = () => { const el = document.querySelector('#stay'); return el && !el.disabled && el.getClientRects().length ? el : null; };

// les étagères, à l'écran (recalculées : le bouton peut bouger)
let cache = null, cacheT = -1;
function etageres() {
  if (Wd.t === cacheT) return cache; cacheT = Wd.t; cache = null;
  if (Wd.mode !== 'large' || Wd.W < 1000 || Wd.a < 0.5) return null; const el = bouton(); if (!el) return null;
  const r = el.getBoundingClientRect(), s0 = Wd.s0, y0 = floorAt(1), h = y0 - r.top; if (h < s0 * 1.2) return null;
  const n = clamp(Math.round(h / (s0 * 0.8)) - 1, 2, 4), w = s0 * 0.5, L = [];
  for (let i = 1; i <= n; i++) L.push({ i, x: r.left - s0 * (i % 2 ? 0.95 : 0.3), y: y0 - h * i / (n + 1), w, wob: (cache && cache[i - 1] && cache[i - 1].wob) || -9 });
  return (cache = { L, r, el });
}
const surQuoi = (x, y) => { const E = etageres(); return E && E.L.find(e => Math.abs(x - e.x) < e.w * 0.5 && Math.abs(y - e.y) < 6); };

/* ——— le parcours ——— */
STEPS.etagere = (c, T, dt) => {   // posé sur une étagère : il reste à sa hauteur
  const E = etageres(), e = E && E.L[T.i - 1]; if (!e) { c.fall = true; c.vy = 0; return true; }
  c.y = e.y + (Wd.t - e.wob < 0.4 ? Math.sin((Wd.t - e.wob) * 40) * 2 : 0); c.x = clamp(c.x, e.x - e.w * 0.45, e.x + e.w * 0.45); c.anim = T.anim || 'affut'; if (T.face) c.face = T.face;
  return T.t > T.dur;
};
STEPS.pendu = (c, T, dt) => {   // raté : pendu au bord par les griffes
  const E = etageres(), e = E && E.L[T.i - 1]; if (!e) { c.fall = true; c.vy = 0; return true; }
  const k = sc(c); c.x = e.x + T.side * e.w * 0.46; c.y = e.y + k * 0.62 + Math.min(T.t, 0.3) * 20 * (T.glisse ? T.t : 0); c.face = -T.side; c.anim = 'accroche';
  if (!T.dit) { T.dit = 1; word(pick(['scriiitch', 'kkrrr !', '!!']), c.x, e.y - 10, 16); say(c, pick(['aaah', 'mia !', 'nyaa'])); T.dur = rnd(0.8, 1.6); T.ok = Math.random() < (c.b.s > 1.2 ? 0.4 : 0.65); }
  if (T.t < T.dur) return false;
  if (T.ok) { c.q.unshift({ k: 'bond', x: e.x + T.side * e.w * 0.25, y: e.y, air: true, then: () => ({ k: 'etagere', i: T.i, dur: rnd(0.5, 1), anim: 'assis', air: true, fx: 0 }) }); say(c, pick(['hnnn…', 'hop !', 'ouf'])); return true; }
  // il glisse… et tombe
  if (!T.glisse) { T.glisse = Wd.t; T.dur += 0.5; word('scriiiii…', c.x, c.y - k * 0.3, 14); return false; }
  c.fall = true; c.vy = 0; c.vx = T.side * sOf(c.d) * 0.3; say(c, pick(['MIAAA', 'nooon', 'aaah !'])); return true;
};
function grimpe(c) {
  const E = etageres(); if (!E) return; const e1 = E.L[0];
  c.q.push(go(inView(e1.x - sgn(e1.x - c.x || 1) * sc(c) * 0.8), { g: 'trot', d: 0.9 }), pose('affut', rnd(0.8, 1.4), { face: sgn(e1.x - c.x) || c.face, fx: c => say(c, pick(['là-haut !', 'hmm…', 'le bouton !'])) }), fn(c => etape(c, 1)));
}
// sauter vers l'étagère i (ou le bouton, après la dernière)
function etape(c, i) {
  const E = etageres(); if (!E) return; const e = E.L[i - 1];
  if (!e) { const r = E.el.getBoundingClientRect(); c.q.unshift({ k: 'bond', x: clamp(c.x + sgn(r.left + 30 - c.x) * sc(c), r.left + 10, r.right - 10), y: r.top, air: true, then: () => ({ k: 'rebord', el: E.el, air: true }) }); return; }
  const rate = Math.random() < (c.b.s > 1.2 ? 0.35 : 0.22), side = sgn(c.x - e.x) || 1;
  if (rate) { c.q.unshift({ k: 'bond', x: e.x + side * e.w * 0.46, y: e.y + sc(c) * 0.62, air: true, then: () => ({ k: 'pendu', i, side, air: true }) }); c.q.splice(1, 0, fn(c => etape(c, i + 1))); return; }
  c.q.unshift({ k: 'bond', x: e.x + rnd(-0.2, 0.2) * e.w, y: e.y, air: true, then: () => ({ k: 'etagere', i, dur: rnd(0.4, 1.2), air: true }) }, fn(c => etape(c, i + 1)));
}
H.think.push((c, add) => {
  if (c.rare || c.temp || c.perch || !etageres()) return;
  if (Wd.cats.some(o => o.task && ['etagere', 'pendu', 'rebord'].includes(o.task.k))) return;
  add((c.ch.grimpe || 0.5) * 0.35 + 0.05, () => grimpe(c));
});
// tombé (ou lâché) au-dessus d'une étagère : il s'y pose
H.fall.push((c, dt) => {
  if (c.vy <= 0 || c.held) return false; const E = etageres(); if (!E) return false;
  const ny = c.y + c.vy * dt, e = E.L.find(e => Math.abs(c.x - e.x) < e.w * 0.5 && c.y <= e.y + 2 && ny >= e.y - 2); if (!e) return false;
  interrupt(c); c.fall = false; c.vx = c.vy = 0; c.spin = 0; c.y = e.y; say(c, pick(['ouf', 'hop', 'rattrapé !']));
  c.q = [{ k: 'etagere', i: e.i, dur: rnd(1, 2.5), anim: 'assis', air: true }, fn(c => etape(c, e.i + 1))];
  return true;
});
H.click.push((x, y) => { const E = etageres(); if (!E) return false; const e = E.L.find(e => Math.abs(x - e.x) < e.w * 0.55 && y > e.y - 8 && y < e.y + 16); if (!e) return false;
  e.wob = Wd.t; word(pick(['toc', 'tac']), x, y - 16, 15);
  Wd.cats.forEach(c => { if (c.task && c.task.k === 'etagere' && c.task.i === e.i) { say(c, pick(['!!', 'hé !'])); c.task.anim = 'sursaut'; c.task.dur = Math.max(c.task.dur, c.task.t + 0.7); } });
  return true; });

// le dessin : une planche, deux équerres au mur
H.draw.push(() => {
  const E = etageres(); if (!E || !window.Chalk) return; const a = Wd.a * 0.85;
  E.L.forEach((e, j) => { const w = e.w / 2, q = Wd.t - e.wob < 0.4 ? Math.sin((Wd.t - e.wob) * 40) * 2 * (1 - (Wd.t - e.wob) / 0.4) : 0, y = e.y + q;
    Chalk.stroke([[e.x - w, y], [e.x + w, y]], 1, { w: 2.4, a, seed: 70 + j, tip: false, amp: 0.3 });
    Chalk.stroke([[e.x - w + 2, y + 5], [e.x + w - 2, y + 5]], 1, { w: 1.2, a: a * 0.7, seed: 80 + j, tip: false, amp: 0.3 });
    [-1, 1].forEach(sd => { const bx = e.x + sd * w * 0.6; Chalk.stroke([[bx, y + 5], [bx, y + 22], [bx + sd * 14, y + 5]], 1, { w: 1.2, a: a * 0.8, seed: 90 + j + sd, tip: false, amp: 0.2 }); }); });
});

return { etageres, grimpe };
})();
