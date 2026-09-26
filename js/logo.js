/* Le logo : le prénom de Mathieu, écrit à la main d'un seul trait (le même tracé que les titres : Titles.traceText),
   qui devient un petit chat.
   - À l'arrivée, le prénom s'écrit, lettre après lettre.
   - Deux oreilles poussent sur les pointes du M ; de temps en temps, l'une d'elles frémit.
   - Une queue sort du dernier u, se déroule, puis se balance doucement (et remue plus vite au survol).
   - Au survol, les lettres ondulent l'une après l'autre ; un clic ramène au début du film (js/film.js).
   Une petite toile dans l'en-tête (.brand), à la densité de l'écran ; le texte reste dans la page pour la lecture. */
window.Logo = (() => {
const brand = document.getElementById('brand'); if (!brand || !window.Titles || !Titles.traceText) return null;
const TAU = Math.PI * 2, c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); };
const root = document.documentElement, reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const NAME = brand.textContent.trim() || 'Mathieu';
brand.innerHTML = `<span class="vh">${NAME}</span><canvas aria-hidden="true"></canvas>`;
const cv = brand.querySelector('canvas'), ctx = cv.getContext('2d');
let G = null, W = 1, H = 1, dpr = 1, born = null, clock = 0, last = performance.now(), hov = 0, twitch = { t: -9, side: 0 }, nextTwitch = 3;
const PAD = { l: 6, t: 16, r: 46, b: 8 };   // la place des oreilles (au-dessus) et de la queue (à droite)

// la mise en page : le prénom en traits, les pointes du M (les oreilles), la fin du dernier trait (la queue)
function build() {
  const small = innerWidth < 760 || innerWidth / innerHeight < 1, size = small ? 25 : 31, lh = size * 1.1;
  const font = `700 ${size}px "Caveat","Segoe Print",cursive`;
  const T = Titles.traceText([NAME], font, size, lh, 0, 'left', 0);
  T.strokes = T.strokes.map((P, i) => { const Q = Titles.hand(P, 40 + i * 7, 0.25, 2.5); Q.len = P.len; Q.x = P.x; return Q; });
  T.total = T.strokes.reduce((q, P) => q + P.len, 0);
  // le M : ses deux pointes, les points les plus hauts de chaque moitié de la lettre
  const m = document.createElement('canvas').getContext('2d'); m.font = font; const wM = m.measureText(NAME[0]).width;
  // les pointes : les creux de y (les sommets) le long des traits du M, au moins à un tiers de lettre l'une de l'autre
  const peaks = [];
  T.strokes.forEach(P => P.forEach((p, i) => { if (p[0] > wM * 1.05) return; const a = P[Math.max(0, i - 3)], b = P[Math.min(P.length - 1, i + 3)]; if (p[1] <= a[1] && p[1] <= b[1]) peaks.push(p); }));
  peaks.sort((a, b) => a[1] - b[1]); const ears = [];
  for (const p of peaks) { if (ears.every(e => Math.abs(e[0] - p[0]) > wM * 0.3)) ears.push(p); if (ears.length === 2) break; }
  T.ears = ears.sort((a, b) => a[0] - b[0]);
  // la queue part du bout le plus à droite du prénom
  let end = null; T.strokes.forEach(P => [P[0], P[P.length - 1]].forEach(p => { if (!end || p[0] > end[0]) end = p; }));
  T.end = end; T.size = size;
  G = T; dpr = Math.min(window.devicePixelRatio || 1, 3);
  W = Math.ceil(T.w + PAD.l + PAD.r); H = Math.ceil(T.h + PAD.t + PAD.b);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
}
const ink = () => (window.THEME && THEME.ink) || '34,36,40';
function line(P, lw, a) { ctx.lineWidth = lw; ctx.strokeStyle = `rgba(${ink()},${a})`; ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
// tracer une ligne jusqu'à une longueur ; renvoie la pointe
function upto(P, L) { const Q = [P[0]]; let used = 0; for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (used + d >= L) { const f = (L - used) / d; Q.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f]); return Q; } Q.push(P[i]); used += d; } return Q; }

function draw(dt) {
  if (!G) return;
  const age = born === null ? 0 : clock - born, write = reduced ? 1 : c01(age / 1.5), w = Math.max(2, G.th * 1.05);
  hov += ((brand.matches(':hover') || brand.matches(':focus-visible') ? 1 : 0) - hov) * Math.min(1, dt * 8);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.translate(PAD.l, PAD.t);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // le prénom : écrit jusqu'à write ; au survol, chaque trait ondule selon sa place dans le mot
  let budget = G.total * write, tip = null;
  for (const P of G.strokes) {
    if (budget <= 0) break;
    const dy = hov > 0.01 && !reduced ? -Math.max(0, Math.sin(clock * 9 - P.x * 0.09)) * 3.2 * hov : 0;
    const Q = (P.len <= budget ? P : upto(P, budget)).map(p => [p[0], p[1] + dy]); budget -= P.len;
    line(Q, w, 0.9); line(Q.map(p => [p[0] - 0.4, p[1] - 0.5]), w * 0.3, 0.25); tip = Q[Q.length - 1];
  }
  if (write < 1 && tip) { ctx.fillStyle = `rgba(${ink()},0.95)`; ctx.beginPath(); ctx.arc(tip[0], tip[1], w * 0.6, 0, TAU); ctx.fill(); }
  // les oreilles : elles poussent sur les pointes du M ; parfois l'une frémit (un petit coup de côté, amorti)
  const grow = reduced ? 1 : sm((age - 1.45) / 0.35), s = G.size;
  if (clock > nextTwitch && !reduced) { twitch = { t: clock, side: Math.random() < 0.5 ? 0 : 1 }; nextTwitch = clock + 3 + Math.random() * 5; }
  G.ears.forEach((e, i) => {
    if (grow <= 0) return;
    const tw = i === twitch.side ? Math.sin((clock - twitch.t) * 38) * Math.exp(-(clock - twitch.t) * 7) * 0.5 : 0, lean = (i ? 0.2 : -0.2) + tw + (hov * Math.sin(clock * 12 + i) * 0.08);
    const h = s * 0.24 * grow, b = s * 0.11, bx = e[0], by = e[1] + s * 0.06;
    const apex = [bx + Math.sin(lean) * h, by - Math.cos(lean) * h];
    line([[bx - b, by + 1], apex, [bx + b, by + 1]], w * 0.8, 0.9);
    line([[bx - b * 0.45, by - h * 0.12], [apex[0] * 0.75 + bx * 0.25, apex[1] * 0.75 + by * 0.25], [bx + b * 0.45, by - h * 0.12]], w * 0.35, 0.45);
  });
  // la queue : elle sort du dernier trait, se déroule, puis se balance (plus vite au survol)
  const out = reduced ? 1 : sm((age - 1.35) / 0.6);
  if (out > 0 && G.end) {
    const n = 16, L = s * 0.95 * out, speed = 1.7 + hov * 6, amp = 0.28 + hov * 0.3, P = [[G.end[0], G.end[1]]];
    // la direction du trait le long de la queue : vers la droite, puis elle s'enroule vers le haut ; le balancement grandit vers le bout
    for (let k = 1; k <= n; k++) { const t = k / n, ang = -0.25 - 2.3 * Math.pow(t, 1.4) * out + amp * t * Math.sin(clock * speed - t * 2.6) * (reduced ? 0 : 1), p = P[k - 1]; P.push([p[0] + Math.cos(ang) * L / n, p[1] + Math.sin(ang) * L / n]); }
    // de plus en plus fine vers le bout
    for (let k = 0; k < n; k++) line([P[k], P[k + 1]], w * (1 - k / n * 0.55), 0.9);
  }
}
/* ——— la tête de Mathieu en 3D (js/mathieu.js), au trait, qui tourne sur elle-même : elle remplace le prénom quand la 3D est là.
   Elle est dessinée dans la toile 3D commune (Obj3D), à la place du logo ; le prénom reste dans la page pour la lecture. ——— */
let head = null;
function headFrame(dt) {
  if (!head) {
    if (!window.Mathieu || !window.Obj3D || !Obj3D.ok) return false;
    try { const m = Mathieu.create({ logo: true }); if (!m) return false; head = { m, turn: 0 }; } catch (e) { return false; }
    brand.innerHTML = `<span class="vh">${NAME}</span><span class="tete" aria-hidden="true"></span>`; brand.classList.add('en-tete');
  }
  const box = brand.querySelector('.tete'), r = box.getBoundingClientRect(), m = head.m, s = r.height, hy = m.meta ? m.meta.head[1] : 0.4;
  const show = born === null ? 0 : sm((clock - born) / 0.8);
  // il tourne doucement ; au survol il accélère et fait un petit signe de tête
  head.turn += dt * (reduced ? 0 : 0.7 + hov * 3.5);
  Mathieu.pose(m, { x: r.left + r.width / 2, y: r.top + s * hy, z: 90000, s, turn: head.turn, tilt: 0.06, nod: hov * Math.sin(clock * 9) * 0.12, a: show });
  hov += ((brand.matches(':hover') || brand.matches(':focus-visible') ? 1 : 0) - hov) * Math.min(1, dt * 8);
  return true;
}
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  // le prénom s'écrit quand le site apparaît (après l'accès réservé)
  if (born === null && !root.classList.contains('locked') && !root.classList.contains('entering')) born = clock + 0.2;
  if (!headFrame(dt)) draw(dt); requestAnimationFrame(loop);
}
// au clic : il se réécrit
brand.addEventListener('click', () => { born = clock; if (head) head.turn += Math.PI * 2; });
// la police d'abord (la feuille de Google Fonts doit être lue avant de pouvoir charger Caveat)
const ready = document.fonts && document.fonts.load ? document.fonts.ready.then(() => document.fonts.load('700 31px "Caveat"')) : Promise.resolve();
ready.then(() => { build(); requestAnimationFrame(loop); }, () => { build(); requestAnimationFrame(loop); });
let rt = 0; addEventListener('resize', () => { if (head) return; clearTimeout(rt); rt = setTimeout(build, 150); });
return { rewrite() { born = clock; } };
})();
