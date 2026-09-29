/* Les outils des scènes (repris de LookAnimation, js/scenes.js) : ce qui servira partout, sans aucun contenu.
     sketchBox(r, prog, seed, extra)   un rectangle à main levée autour d'une boîte (un bouton) : un seul trait continu
     ctaLoop(r, prog, seed, extra)     un ovale à main levée, qui fait un peu plus d'un tour
     hull(P)                           l'enveloppe convexe de points (pour découper sous un objet : cutUnder)
     Pops                              des objets 3D qui jaillissent d'un clic, tombent, rebondissent, se cognent ;
                                       on les attrape, on les lance ; au plus MAX (au-delà, le plus ancien s'en va)
     Debris                            des objets qui flottent, tenus par un ressort à leur place ; la souris les bouscule
     Burst                             la rupture : un éclat de craie (particules, éclats, cercles) autour d'un point
   Tout se dessine sur la toile de la craie (Chalk.ctx) et sur la toile 3D (Obj3D.put). */
window.Outils = (() => {
const C = Chalk, TAU = Math.PI * 2;
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
const mouse = { x: -1e4, y: -1e4, on: false };
addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; }, { passive: true });
document.documentElement.addEventListener('mouseleave', () => { mouse.on = false; });
// adoucir une ligne brisée (coins arrondis)
const chaikin = (P, n) => { for (let k = 0; k < n; k++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } Q.push(P[P.length - 1]); P = Q; } return P; };

/* ——— les cadres à la craie ——— */
// un rectangle tracé à main levée, d'un seul trait continu (coins un peu arrondis, bords pas tout à fait droits)
function sketchBox(r, prog, seed, extra) {
  const o = extra || 0, x0 = r.left - 6 - o, y0 = r.top - 4 - o, x1 = r.right + 6 + o, y1 = r.bottom + 4 + o, c = 4;
  const P = [[x0 + c, y0], [lerp(x0, x1, 0.5), y0 - 1.2], [x1 - c, y0 + 0.6], [x1, y0 + c], [x1 + 1, lerp(y0, y1, 0.5)], [x1, y1 - c], [x1 - c, y1], [lerp(x0, x1, 0.5), y1 + 1.2], [x0 + c, y1 - 0.4], [x0, y1 - c], [x0 - 0.8, lerp(y0, y1, 0.5)], [x0, y0 + c], [x0 + c, y0]];
  C.stroke(chaikin(P, 2), prog, { w: 1.6, seed, amp: 0.35, tip: prog < 1 });
}
function ctaLoop(r, prog, seed, extra) {
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rx = r.width / 2 + 22 + (extra || 0), ry = r.height / 2 + 12 + (extra || 0) * 0.5;
  C.circle(cx, cy, rx, ry, prog, { seed, w: 2, amp: 0.7, tip: prog < 1, start: -2.6 });
}
// un bouton de scène : son cadre se trace (prog), un second trait et quelques points qui tournent au survol
function button(el, prog, seed, clock) {
  if (!el || prog <= 0.001 || el.style.visibility === 'hidden') return;   // (tombé dans son trou : js/fuite.js)
  const r = el.getBoundingClientRect(); if (!r.width) return;
  el.hov = (el.hov || 0) + (((el.matches(':hover') || el.matches(':focus-visible')) ? 1 : 0) - (el.hov || 0)) * 0.15;
  sketchBox(r, prog, seed);
  if (el.hov > 0.02) { sketchBox(r, el.hov, seed + 5, 5); for (let k = 0; k < 8; k++) { const ang = k / 8 * TAU + clock * 0.9, rr = 14 + ((clock * 50 + k * 13) % 30); C.dot(r.left + r.width / 2 + Math.cos(ang) * (r.width / 2 + rr), r.top + r.height / 2 + Math.sin(ang) * (r.height / 2 + rr * 0.5), 1.6, el.hov * 0.8); } }
  el.classList.toggle('drawn', prog > 0.6);
}

/* ——— l'enveloppe convexe de points ; cutUnder efface la craie sous une forme (un objet devant un dessin) ——— */
function hull(P) {
  if (P.length < 3) return P; P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function cutUnder(ctx, P, grow) {
  const H = hull(P); if (H.length < 3) return;
  const cx = H.reduce((s, p) => s + p[0], 0) / H.length, cy = H.reduce((s, p) => s + p[1], 0) / H.length, g = grow ?? 8;
  ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; ctx.beginPath();
  H.forEach((p, i) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1, x = p[0] + dx / l * g, y = p[1] + dy / l * g; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.closePath(); ctx.fill(); ctx.restore();
}

/* ——— les objets qui jaillissent d'un clic : ils tombent, rebondissent, se cognent ; on les attrape, on les lance ———
   Le monde est partagé par toutes les scènes (les objets restent quand on change de scène) ; step() une fois par image. */
const Pops = (() => {
  const L = [], MAX = 20; let names = ['roulement', 'vis'], stepped = -1, held = null;
  // un clic : un objet différent du précédent (au hasard dans la liste)
  function spawn(x, y, S) {
    if (!window.Obj3D || !Obj3D.ok) return false;
    const prev = L.length ? L[L.length - 1].nm : null, pool = names.length > 1 ? names.filter(n => n !== prev) : names, nm = pool[Math.floor(Math.random() * pool.length)];
    L.push({ nm, x, y, vx: (Math.random() - 0.5) * 520, vy: -380 - Math.random() * 420, r: [Math.random() * 6, Math.random() * 6, Math.random() * 6], vr: [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4], s: (96 + Math.random() * 56) * S.K, t0: S.clock, die: 0, bx: x, by: y });
    const alive = L.filter(o => !o.die); if (alive.length > MAX) alive[0].die = S.clock;
    if (window.Film) Film.sound('pop');
    return true;
  }
  function step(S) {
    if (stepped === S.frame) return; stepped = S.frame;
    const dt = Math.min(0.033, S.dt || 0), floor = S.H - (S.wide ? 96 : 118) * Math.max(0.8, S.K);
    L.forEach(o => {
      if (o === held) { o.r = o.r.map((v, i) => v + o.vr[i] * dt); return; }
      o.vy += 1900 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= Math.pow(0.6, dt);
      const R = o.s * 0.42;
      if (o.y > floor - R) { o.y = floor - R; if (o.vy > 60) { o.vy *= -0.48; o.vr = o.vr.map(v => v * 0.7 + (Math.random() - 0.5) * 2); } else o.vy = 0; o.vx *= 0.9; o.vr = o.vr.map(v => v * 0.96); }
      if (o.x < R) { o.x = R; o.vx = Math.abs(o.vx) * 0.6; } if (o.x > S.W - R) { o.x = S.W - R; o.vx = -Math.abs(o.vx) * 0.6; }
      if (o.y < R + 40) { o.y = R + 40; o.vy = Math.abs(o.vy) * 0.5; }
      // la souris les pousse
      if (mouse.on && !held) { const dx = o.x - mouse.x, dy = o.y - mouse.y, d = Math.hypot(dx, dy) || 1, RR = 90 * S.K; if (d < RR) { const f = Math.pow(1 - d / RR, 2) * 5200; o.vx += dx / d * f * dt; o.vy += dy / d * f * dt; o.vr[1] += dx / d * f * dt * 0.004; } }
      o.r = o.r.map((v, i) => v + o.vr[i] * dt);
    });
    // les chocs : ils s'écartent et échangent leur élan
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const A = L[i], B = L[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, m = (A.s + B.s) * 0.4;
      if (d < m) { const nx = dx / d, ny = dy / d, push = (m - d) / 2, wa = A === held ? 0 : 1, wb = B === held ? 0 : 1;
        A.x -= nx * push * wa * (wb ? 1 : 2); A.y -= ny * push * wa * (wb ? 1 : 2); B.x += nx * push * wb * (wa ? 1 : 2); B.y += ny * push * wb * (wa ? 1 : 2);
        const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny; if (rv < 0) { const k = -rv * 0.8; if (wa) { A.vx -= nx * k; A.vy -= ny * k; } if (wb) { B.vx += nx * k; B.vy += ny * k; } } }
    }
  }
  // a : l'opacité de la scène qui les montre
  function put(S, a) {
    for (let i = L.length - 1; i >= 0; i--) {
      const o = L[i], age = S.clock - o.t0, grow = c01(age / 0.35), pop = grow < 1 ? 1 + 1.7 * Math.pow(grow - 1, 3) + 0.7 * Math.pow(grow - 1, 2) : 1, fade = o.die ? 1 - c01((S.clock - o.die) / 0.45) : 1;
      if (fade <= 0) { L.splice(i, 1); continue; }
      Obj3D.put(o.nm, o.x, o.y, o.s * Math.max(0.05, pop) * (o.die ? 0.6 + 0.4 * fade : 1) * (o === held ? 1.08 : 1), o.r, { a: a * fade });
    }
  }
  // l'éclat du clic : deux cercles de craie qui s'ouvrent
  function draw(S, ctx) {
    L.forEach(o => { const age = S.clock - o.t0; if (age >= 0.5) return; const ga = ctx.globalAlpha; ctx.globalAlpha = ga * (1 - age / 0.5); [0, 1].forEach(j => { const r = (18 + age * (160 + j * 90)) * S.K; C.circle(o.bx, o.by, r, r, 1, { seed: 1300 + j, w: 2 * (1 - age / 0.5), tip: false }); }); ctx.globalAlpha = ga; });
  }
  // attraper : l'objet le plus proche sous le doigt ; il suit la main, et part avec sa vitesse au lâcher
  function hit(x, y) { for (let i = L.length - 1; i >= 0; i--) { const o = L[i]; if (!o.die && Math.hypot(o.x - x, o.y - y) < o.s * 0.45) return o; } return null; }
  function hold(o, x, y) { held = o; o.x = x; o.y = y; o.vx = o.vy = 0; o.vr = [o.vr[0] * 0.9 + 0.4, o.vr[1] * 0.9 + 0.6, o.vr[2]]; }
  function release(o, vx, vy) { if (held !== o) return; held = null; o.vx = Math.max(-2600, Math.min(2600, vx)); o.vy = Math.max(-2600, Math.min(2600, vy)); o.vr = [vy * 0.004, vx * 0.006, (Math.random() - 0.5) * 3]; }
  return { spawn, step, put, draw, hit, hold, release, clear: () => { L.length = 0; held = null; }, set names(n) { names = n; }, get list() { return L; }, MAX };
})();

/* ——— des objets qui flottent : chacun tenu par un ressort vers sa place (une dérive lente sur tout l'écran) ;
   la souris qui passe à côté les expulse, ils tournoient, puis reviennent ——— */
function Debris(n, names) {
  const D = Array.from({ length: n }, (_, i) => ({ nm: names[i % names.length], x: -1, y: -1, vx: 0, vy: 0, a: i, b: i * 0.9, va: 0.2 + (i % 5) * 0.06, fx: 0.07 + (i % 7) * 0.013, fy: 0.05 + (i % 5) * 0.017, ph: i * 1.7 }));
  let stepped = -1;
  return { frame(S, a, size) {
    if (stepped === S.frame) return; stepped = S.frame;
    const dt = Math.min(0.05, S.dt || 0), T = S.clock;
    D.forEach((d, i) => {
      const tx = S.W * (0.5 + 0.42 * Math.sin(T * d.fx + d.ph)), ty = S.H * (0.5 + 0.36 * Math.sin(T * d.fy + d.ph * 1.3));
      // à l'arrivée, ils entrent par les côtés
      if (d.x < 0) { const side = i % 2 ? 1 : -1; d.x = side > 0 ? S.W + 60 : -60; d.y = ty; d.vx = -side * (900 + (i % 5) * 160); d.vy = (i % 3 - 1) * 120; }
      let ax = (tx - d.x) * 7 - d.vx * 3.4, ay = (ty - d.y) * 7 - d.vy * 3.4;
      if (mouse.on) { const mx = d.x - mouse.x, my = d.y - mouse.y, md = Math.hypot(mx, my) || 1, R = 170 * S.K; if (md < R) { const f = Math.pow(1 - md / R, 2) * 5200; ax += mx / md * f; ay += my / md * f; d.va += (mx * my > 0 ? 1 : -1) * f * 0.0004; } }
      d.vx += ax * dt; d.vy += ay * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      d.va += ((0.2 + (i % 5) * 0.06) * (i % 2 ? -1 : 1) - d.va) * dt * 0.8; d.a += d.va * dt; d.b += (d.va * 1.6 + (i % 2 ? 0.12 : -0.12)) * dt;
      if (a > 0.01) Obj3D.put(d.nm, d.x, d.y, (size || 60) * S.K, [0.55 * Math.sin(T * 0.23 + d.ph), d.b, d.a * 0.35], { a: a * 0.55 });
    });
  }, reset() { D.forEach(d => { d.x = -1; }); } };
}

/* ——— la rupture : un éclat de craie — des éclats qui partent en tournant, de la poussière, deux cercles ——— */
const Burst = (() => {
  let B = null;
  function fire(x, y, S) {
    const P = Array.from({ length: 90 }, (_, i) => { const ang = Math.random() * TAU, v = (280 + Math.random() * 900) * S.K; return { x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 120, l: (6 + Math.random() * 22) * S.K, ang: Math.random() * TAU, va: (Math.random() - 0.5) * 16, dust: i % 3 === 0 }; });
    B = { x, y, t0: S.clock, P };
    if (window.Film) Film.sound('pop');
  }
  function draw(S, ctx) {
    if (!B) return; const age = S.clock - B.t0; if (age > 1.6) { B = null; return; }
    const dt = Math.min(0.033, S.dt || 0.016), ga = ctx.globalAlpha, fade = 1 - c01((age - 0.5) / 1.1);
    B.P.forEach((p, i) => {
      p.vy += 900 * dt; p.vx *= Math.pow(0.35, dt); p.vy *= Math.pow(0.5, dt); p.x += p.vx * dt; p.y += p.vy * dt; p.ang += p.va * dt;
      ctx.globalAlpha = ga * fade;
      if (p.dust) C.dot(p.x, p.y, 1.2 + (i % 3) * 0.5, 0.7);
      else C.line(p.x - Math.cos(p.ang) * p.l / 2, p.y - Math.sin(p.ang) * p.l / 2, p.x + Math.cos(p.ang) * p.l / 2, p.y + Math.sin(p.ang) * p.l / 2, 1, { w: 2, seed: 1500 + i, amp: 0.4, tip: false });
    });
    ctx.globalAlpha = ga * (1 - c01(age / 0.7));
    [0, 1, 2].forEach(j => { const r = (30 + sm(age / 0.7) * (380 + j * 220)) * S.K; C.circle(B.x, B.y, r, r * 0.92, 1, { seed: 1600 + j, w: 2.6 - j * 0.6, tip: false }); });
    ctx.globalAlpha = ga;
  }
  return { fire, draw, get on() { return !!B; } };
})();

return { sketchBox, ctaLoop, button, hull, cutUnder, chaikin, Pops, Debris, Burst, mouse, c01, sm, lerp };
})();
