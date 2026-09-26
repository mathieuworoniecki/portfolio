/* L'écran d'accès servi par le serveur (middleware.js) : la grille qui se déforme sous la souris,
   et des dizaines d'objets 3D (les exemples de js/objects3d.js) qui flottent partout ; la souris les bouscule, elles tournoient.
   Le bon code : les pièces s'envolent, l'écran s'efface, et le site commence en fondu (même fond). */
(() => {
const TAU = Math.PI * 2, PIECES = window.GATE_PIECES || [], reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const gridCv = document.getElementById('grid'), cv = document.getElementById('debris'), ctx = cv.getContext('2d');
let W = 1, H = 1, dpr = 1, last = performance.now(), leaving = 0;
const mouse = { x: -1e4, y: -1e4, on: false, vx: 0, vy: 0 };
Grid.init(gridCv, 'deform');
// les pièces en 3D (objects3d.js), sinon à la craie
const obj = window.Obj3D && Obj3D.ok !== false && document.getElementById('obj'); if (obj) Obj3D.init(obj);
const NAMES = ['roulement', 'vis'].filter(n => obj && Obj3D.has(n));
function resize() { W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 3); cv.width = W * dpr; cv.height = H * dpr; Grid.resize(W, H); if (obj) Obj3D.resize(W, H); Chalk.scale = Math.max(0.6, Math.min(1, Math.min(W / 1600, H / 1000))); }
addEventListener('resize', resize); resize();
addEventListener('pointermove', e => { mouse.vx = e.clientX - mouse.x; mouse.vy = e.clientY - mouse.y; mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; }, { passive: true });
document.documentElement.addEventListener('mouseleave', () => { mouse.on = false; });

// beaucoup de pièces, de toutes les tailles, réparties sur tout l'écran
const N = Math.round(Math.min(90, Math.max(40, W * H / 22000)));
const D = Array.from({ length: N }, (_, i) => ({ p: PIECES[i % PIECES.length], x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
  b: Math.random() * TAU, c: Math.random() * TAU, a: Math.random() * TAU, va: (Math.random() - 0.5) * 0.6, s: 24 + Math.random() * 46, seed: 900 + i * 7, al: 0.35 + Math.random() * 0.4, born: Math.random() * 1.2 }));
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000), T = now / 1000; last = now;
  Grid.frame(0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); Chalk.ctx = ctx;
  D.forEach((d, i) => {
    // une dérive lente, un peu de courant, et la souris qui pousse fort (et fait tournoyer)
    let ax = Math.sin(T * 0.3 + i) * 14, ay = Math.cos(T * 0.25 + i * 1.7) * 14;
    if (mouse.on) { const mx = d.x - mouse.x, my = d.y - mouse.y, md = Math.hypot(mx, my) || 1, R = 190; if (md < R) { const f = Math.pow(1 - md / R, 2) * 9000; ax += mx / md * f + mouse.vx * 30 * (1 - md / R); ay += my / md * f + mouse.vy * 30 * (1 - md / R); d.va += (mx * mouse.vy - my * mouse.vx) / (md * 400); } }
    if (leaving) { const cx = d.x - W / 2, cy = d.y - H / 2, cd = Math.hypot(cx, cy) || 1; ax += cx / cd * 5200; ay += cy / cd * 5200; }
    d.vx = (d.vx + ax * dt) * Math.pow(0.55, dt); d.vy = (d.vy + ay * dt) * Math.pow(0.55, dt); d.va *= Math.pow(0.6, dt);
    if (reduced) { d.vx = d.vy = 0; d.va = 0; }
    d.x += d.vx * dt; d.y += d.vy * dt; d.a += (d.va + 0.08 * Math.sign(d.va || 1)) * dt;
    // les bords : elles rebondissent (sauf à la sortie)
    const m = d.s * 0.6; if (!leaving) { if (d.x < m) { d.x = m; d.vx = Math.abs(d.vx); } if (d.x > W - m) { d.x = W - m; d.vx = -Math.abs(d.vx); } if (d.y < m) { d.y = m; d.vy = Math.abs(d.vy); } if (d.y > H - m) { d.y = H - m; d.vy = -Math.abs(d.vy); } }
    const prog = Math.min(1, Math.max(0, (T - d.born - 0.2) / 1.2)); if (prog <= 0) return;
    // en 3D : chaque objet tourne sur lui-même, arrive en pièces qui s'assemblent, repart en éclaté
    if (NAMES.length) { d.b += (d.va * 1.8 + 0.15) * dt; d.c += 0.07 * dt;
      Obj3D.put(NAMES[i % NAMES.length], d.x, d.y, d.s * 1.85 * Chalk.scale, [0.6 * Math.sin(d.c * 3 + i), d.b, d.a * 0.4], { a: Math.min(1, d.al * 1.7) * (1 - leaving) * Math.min(1, prog * 2), e: Math.max(1 - prog, leaving * 1.5) }); return; }
    if (!d.p) return;
    const sc = d.s * d.p.size * Chalk.scale;
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.globalAlpha = d.al * (1 - leaving);
    d.p.lines.forEach((l, k) => Chalk.stroke(l.map(q => [q[0] * sc, q[1] * sc]), prog, { w: 1, seed: d.seed + k, amp: 0.25, tip: false }));
    ctx.restore();
  });
  if (NAMES.length) Obj3D.render();
  if (leaving) leaving = Math.min(1, leaving + dt * 1.4);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// le code : on vérifie sans quitter la page, pour pouvoir animer la sortie
const form = document.querySelector('form'), input = form.querySelector('input'), msg = form.querySelector('.msg'), body = document.body;
// la langue du navigateur (ou celle choisie sur le site)
const TX = { fr: ['Accès réservé', 'code', 'Entrer', 'Ce n’est pas le bon code.'], en: ['Private access', 'code', 'Enter', 'That’s not the right code.'], de: ['Geschützter Zugang', 'Code', 'Weiter', 'Das ist nicht der richtige Code.'],
  it: ['Accesso riservato', 'codice', 'Entra', 'Il codice non è corretto.'], es: ['Acceso reservado', 'código', 'Entrar', 'El código no es correcto.'], zh: ['限定访问', '访问码', '进入', '访问码不正确。'] };
const LG = (() => { try { const s = localStorage.getItem('pf-lang'); if (TX[s]) return s; } catch (e) {} for (const l of (navigator.languages || [navigator.language || 'en'])) { const c = String(l).slice(0, 2).toLowerCase(); if (TX[c]) return c; } return 'en'; })(), tx = TX[LG];
document.documentElement.lang = LG; { const k = document.querySelector('.kick'), bt = form.querySelector('button'); if (k) k.textContent = tx[0]; input.placeholder = tx[1]; if (bt) bt.textContent = tx[2]; if (msg.textContent.trim()) msg.textContent = tx[3]; }
input.addEventListener('input', () => { body.classList.remove('bad'); msg.textContent = ''; });
form.addEventListener('submit', async e => {
  e.preventDefault();
  let ok = false;
  try { const r = await fetch('/__acces', { method: 'POST', body: new URLSearchParams({ code: input.value }), headers: { 'x-pf-gate': '1' }, credentials: 'same-origin' }); ok = r.ok; } catch (er) {}
  if (!ok) { body.classList.remove('bad'); void body.offsetWidth; body.classList.add('bad', 'shake'); msg.textContent = tx[3]; input.select(); return; }
  body.classList.add('good'); input.blur();
  try { sessionStorage.setItem('pf-enter', '1'); } catch (er) {}
  setTimeout(() => { leaving = 0.001; body.classList.add('leaving'); }, 450);
  setTimeout(() => location.replace('/'), 1250);
});
})();
