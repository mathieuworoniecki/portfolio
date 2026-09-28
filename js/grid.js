/* La grille du plan, dessinée à chaque image, qui réagit à la souris. Trois effets à comparer :
     deform  les lignes s'écartent autour de la souris, comme sous une loupe
     path    les cases survolées s'allument, un chemin lumineux qui s'éteint doucement
     chalk   un trait de craie se dessine là où passe la souris, puis s'efface
   Rien ne défile : la scène peut décaler la grille (Grid.frame(dy), en pixels) pour donner de la profondeur ; sinon 0. */
window.Grid = (() => {
const MINOR = 24, MAJOR = 120; let INK, GA, DOTS;
const sync = () => { const TH = window.THEME || {}; INK = TH.ink || '238,245,255'; GA = TH.gridA ?? 1; DOTS = TH.grid === 'dots'; };
sync(); addEventListener('themechange', sync);
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
let cv, ctx, W = 1, H = 1, dpr = 1, mode = 'deform', gy = 0, last = performance.now();
let mx = -1e4, my = -1e4, sx = -1e4, sy = -1e4, act = 0, on = 0;
const cells = new Map(), trail = []; let vu = '';
// le sol de la pièce (js/piece.js : Grid.sol(y, a)) : sous la plinthe, la grille s'efface presque, pour ne pas croiser les lattes du parquet
// (28/09, Mathieu : « les lignes de fond rentrent en conflit avec les lignes du sol »)
let solY = 0, solA = 0;
function sol(y, a) { solY = y; solA = a > 0.01 ? a : 0; }

function mark(x0, y0, x1, y1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
  for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n - gy; cells.set(Math.floor(x / MINOR) + ',' + Math.floor(y / MINOR), 1); }
}
function init(canvas, initial) {
  cv = canvas; ctx = cv.getContext('2d'); if (initial) mode = initial;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const px = mx, py = my; mx = e.clientX; my = e.clientY; on = 1;
    if (sx < -1e3) { sx = mx; sy = my; }
    if (mode === 'path' && px > -1e3) mark(px, py, mx, my);
    if (mode === 'chalk') trail.push({ x: mx, y: my - gy, t: performance.now(), j: [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5] });
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { on = 0; });
}
function resize(w, h) { W = w; H = h; dpr = Math.min(window.devicePixelRatio || 1, 3); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); vu = ''; }
function setMode(m) { mode = m; vu = ''; cells.clear(); trail.length = 0; }

// une ligne de la grille, déformée autour de la souris (effet loupe)
function warpLine(x0, y0, x1, y1) {
  const R = 170, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10);
  ctx.beginPath();
  for (let k = 0; k <= n; k++) {
    let x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
    const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy);
    if (d < R && act > 0.01) { const f = Math.pow(1 - d / R, 2) * 34 * act / (d || 1); x += dx * f; y += dy * f; }
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
}
function frame(dy) {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  gy = -(dy || 0);
  sx += (mx - sx) * 0.18; sy += (my - sy) * 0.18; act += (on - act) * 0.08;
  // rien n'a bougé (la loupe au repos, le téléphone sans souris) : l'image d'avant reste, on ne redessine pas tout l'écran
  // (27/09, « optimise tout » : la grille était retracée à chaque image, même immobile)
  if (mode === 'deform') { const sig = [gy, W, H, dpr, INK, GA, DOTS, Math.round(solY), Math.round(solA * 20), act > 0.01 ? Math.round(sx * 2) + ',' + Math.round(sy * 2) + ',' + Math.round(act * 300) : 0].join('|'); if (sig === vu) return; vu = sig; } else vu = '';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const oy = ((gy % MINOR) + MINOR) % MINOR, j0 = Math.floor(-gy / MINOR);
  ctx.lineWidth = 1;
  // les lignes : fines tous les 24 px, marquées tous les 120 px
  // en points (thème CAO) : un point à chaque croisement, déplacé par la loupe comme les lignes
  if (DOTS) {
    const o = ((gy % MINOR) + MINOR) % MINOR, R = 170;
    for (let x = 0; x <= W; x += MINOR) for (let y = o; y <= H; y += MINOR) {
      let X = x, Y = y; const dx = X - sx, dy = Y - sy, d = Math.hypot(dx, dy);
      if (mode === 'deform' && d < R && act > 0.01) { const f = Math.pow(1 - d / R, 2) * 34 * act / (d || 1); X += dx * f; Y += dy * f; }
      const j = Math.round((y - gy) / MINOR), major = Math.round(x / MINOR) % 5 === 0 && ((j % 5) + 5) % 5 === 0;
      ctx.fillStyle = `rgba(${INK},${(major ? 0.5 : 0.22) * GA})`; ctx.fillRect(X - (major ? 1 : 0.6), Y - (major ? 1 : 0.6), major ? 2 : 1.2, major ? 2 : 1.2);
    }
  }
  else [[MINOR, 0.065], [MAJOR, 0.16]].forEach(([step, a]) => {
    ctx.strokeStyle = `rgba(${INK},${a * GA})`;
    const o = ((gy % step) + step) % step;
    for (let x = 0; x <= W; x += step) { const X = Math.round(x) + 0.5; mode === 'deform' ? warpLine(X, -20, X, H + 20) : (ctx.beginPath(), ctx.moveTo(X, 0), ctx.lineTo(X, H), ctx.stroke()); }
    for (let y = o; y <= H; y += step) { const Y = Math.round(y) + 0.5; mode === 'deform' ? warpLine(-20, Y, W + 20, Y) : (ctx.beginPath(), ctx.moveTo(0, Y), ctx.lineTo(W, Y), ctx.stroke()); }
  });
  if (solA) {
    const y0 = solY - 4, y1 = solY + 36, g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.85 * solA})`);
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0); ctx.globalCompositeOperation = 'source-over';
  }
  if (mode === 'deform' && act > 0.01) {
    // un léger halo sous la loupe
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 170); g.addColorStop(0, `rgba(${INK},${0.06 * act})`); g.addColorStop(1, `rgba(${INK},0)`);
    ctx.fillStyle = g; ctx.fillRect(sx - 170, sy - 170, 340, 340);
  }
  if (mode === 'path') {
    const k = Math.exp(-dt / 1.4);
    cells.forEach((v, key) => {
      const [i, j] = key.split(',').map(Number), x = i * MINOR, y = j * MINOR + gy;
      if (y > -MINOR && y < H) {
        ctx.fillStyle = `rgba(${INK},${(0.2 * v).toFixed(3)})`; ctx.fillRect(x + 1, y + 1, MINOR - 1, MINOR - 1);
        ctx.strokeStyle = `rgba(${INK},${(0.55 * v).toFixed(3)})`; ctx.strokeRect(x + 0.5, y + 0.5, MINOR, MINOR);
      }
      v *= k; if (v < 0.01) cells.delete(key); else cells.set(key, v);
    });
  }
  if (mode === 'chalk') {
    while (trail.length && now - trail[0].t > 5000) trail.shift();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // le trait passe par le milieu des segments (courbes lisses) ; le grain de chaque point est fixé à sa naissance
    const seg = [];
    for (let i = 1; i < trail.length; i++) { const a = trail[i - 1], b = trail[i]; if (b.t - a.t > 120 || Math.hypot(b.x - a.x, b.y - a.y) > 90) { if (seg.length > 1) draw(seg); seg.length = 0; } seg.push(b); if (seg.length === 1) seg.unshift(a); }
    if (seg.length > 1) draw(seg);
    function draw(P) {
      for (let s = 0; s < 3; s++) {
        ctx.lineWidth = s ? 1 : 1.8;
        for (let i = 1; i < P.length - 1; i++) {
          const a = P[i - 1], b = P[i], c = P[i + 1], age = c01((now - b.t) / 5000), al = (1 - age) * (1 - age);
          const o = s ? b.j[s] * 1.4 : 0, m0 = [(a.x + b.x) / 2, (a.y + b.y) / 2 + gy], m1 = [(b.x + c.x) / 2, (b.y + c.y) / 2 + gy];
          ctx.strokeStyle = `rgba(${INK},${(al * (s ? 0.3 : 0.8)).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(m0[0] + o, m0[1] - o); ctx.quadraticCurveTo(b.x + o, b.y + gy - o, m1[0] + o, m1[1] - o); ctx.stroke();
          if (!s && b.j[3] > 0.2) { ctx.fillStyle = `rgba(${INK},${(al * 0.45).toFixed(3)})`; ctx.fillRect(b.x + b.j[0] * 8, b.y + gy + b.j[1] * 8, 1.2, 1.2); }
        }
      }
    }
  }
}
return { init, resize, frame, setMode, sol, get mode() { return mode; } };
})();
