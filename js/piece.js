/* La pièce (27/09, la revue « wahou » : « les meubles flottent sur le papier, la scène ne raconte pas encore un lieu »).
   Dessinée au trait, derrière tout (sa propre toile, entre le quadrillage et les objets 3D) :
   - le bas du mur et sa plinthe, juste derrière la rangée du fond ; des lattes de parquet qui fuient vers le fond ;
   - une fenêtre au mur, dans le plus grand vide entre les meubles du fond : le ciel suit l'heure du visiteur
     (soleil et nuages le jour, soleil couchant le soir) ; (29/09, Mathieu : le mode nuit est retiré) ;
   - un cadre accroché (le portrait d'un chat) ; un tapis sous la table.
   On ne redessine que si quelque chose a bougé (la taille, le sol, l'heure, la table). */
window.Piece = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H } = K;
const stage = document.getElementById('stage'); if (!stage) return null;
const cv = document.createElement('canvas'); cv.id = 'piece'; cv.setAttribute('aria-hidden', 'true');
cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
stage.appendChild(cv); const ctx = cv.getContext('2d');
let cle = '', lune = null;
const ink = () => (window.THEME && THEME.ink) || (window.Chalk && Chalk.INK) || '34,36,40';
const ciel = () => { const h = new Date().getHours(); return h >= 18 ? 'soir' : 'jour'; };

// un trait un peu tremblé, comme à la plume (toujours le même tremblement pour le même trait)
function trait(P, a, w, seed) {
  let s = seed || 1; const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
  ctx.globalAlpha = a; ctx.lineWidth = w; ctx.beginPath();
  P.forEach(([x, y], i) => { const j = i && i < P.length - 1 ? 0.8 : 0; i ? ctx.lineTo(x + rn() * j, y + rn() * j) : ctx.moveTo(x, y); }); ctx.stroke();
}
const ligne = (x0, y0, x1, y1, a, w, seed, n) => { const P = []; n = n || Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 40)); for (let i = 0; i <= n; i++) P.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); trait(P, a, w, seed); };
const rect = (x, y, w, h, a, lw, seed) => { ligne(x, y, x + w, y, a, lw, seed); ligne(x + w, y, x + w, y + h, a, lw, seed + 1); ligne(x + w, y + h, x, y + h, a, lw, seed + 2); ligne(x, y + h, x, y, a, lw, seed + 3); };

// le plus grand vide entre les meubles du fond, dans une plage de l'écran
function vide(lo, hi, larg) {
  const occ = Wd.props.filter(p => p.d > 0.8 && !p.run && !p.held && !p.mur).map(p => { const w = p.hull.w * p.s * 0.5 * (p.big || 1); return [p.x - w, p.x + w]; }).sort((a, b) => a[0] - b[0]);
  let best = null, x = lo;
  const essaie = (a, b) => { if (b - a >= larg && (!best || b - a > best[1] - best[0])) best = [a, b]; };
  for (const [a, b] of occ) { if (b < lo) continue; if (a > hi) break; essaie(x, Math.min(a, hi)); x = Math.max(x, b); }
  essaie(x, hi); return best ? (best[0] + best[1]) / 2 : null;
}

const places = {};
function fixe(nom, W, Hh, f) { const k = W + 'x' + Hh + Wd.mode, P = places[nom]; if (P && P.k === k) return P.v; const v = f(); if (Wd.props.length) places[nom] = { k, v }; return v; }
function dessine() {
  const W = Wd.W, Hh = Wd.H, s0 = Wd.s0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Hh);
  // l'arrivée : la pièce se trace de gauche à droite, une plume au bout du trait
  const tr = trace(); ctx.save(); if (tr < 1) { ctx.beginPath(); ctx.rect(0, 0, W * tr, Hh); ctx.clip(); }
  ctx.strokeStyle = `rgb(${ink()})`; ctx.fillStyle = `rgb(${ink()})`; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const yB = K.floorAt(1) - s0 * 0.05, top = (Wd.ceil || 0) + 14, large = Wd.mode === 'large';
  // le bas du mur : la plinthe
  ligne(0, yB, W, yB, 0.55, 1.6, 3); ligne(0, yB - s0 * 0.08, W, yB - s0 * 0.08, 0.3, 1.1, 5);
  // le parquet : des lattes qui fuient vers le fond (le point de fuite, loin au-dessus)
  const vx = W / 2, vy = yB - Wd.depth * 2.2, bas = Math.min(Hh, Wd.floor + s0 * 0.4), n = large ? 14 : 7;
  for (let i = 0; i <= n; i++) { const x0 = W * (i / n - 0.5) * 1.1 + vx, k = (bas - yB) / (bas - vy), xb = vx + (x0 - vx) / (1 - k) * 1, xh = x0; ligne(xh, yB, vx + (xh - vx) * (bas - vy) / (yB - vy), bas, 0.09, 1, 20 + i); }
  for (let j = 1; j <= 3; j++) { const y = yB + (bas - yB) * Math.pow(j / 4, 1.6); ligne(0, y, W, y, 0.07, 1, 40 + j); }
  // la fenêtre
  lune = null;
  const fw = s0 * (large ? 1.5 : 1.1), fh = Math.min(s0 * 1.25, yB - s0 * 1.2 - top);
  if (fh > s0 * 0.55) {
    // (au-dessus des meubles du fond : elle peut passer derrière eux ; on préfère un vide, sinon le milieu)
    // (28/09, Mathieu : « le tableau et la fenêtre se téléportent » : leur place est choisie une fois pour cette taille d'écran, puis ne bouge plus,
    // même quand on déplace un meuble — un mur ne change pas de fenêtre)
    const cx = fixe('fen', W, Hh, () => vide(W * 0.22, W * 0.8, fw * 0.9) ?? W * 0.5);
    {
      const x = cx - fw / 2, y = yB - s0 * 1.25 - fh, c = ciel();
      // le ciel, derrière les carreaux
      ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 4, fw - 8, fh - 8); ctx.clip();
      if (c === 'jour') {
        const sx = x + fw * 0.7, sy = y + fh * 0.32, r = fh * 0.12; ctx.beginPath(); ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4; ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ligne(sx + Math.cos(a) * r * 1.4, sy + Math.sin(a) * r * 1.4, sx + Math.cos(a) * r * 1.9, sy + Math.sin(a) * r * 1.9, 0.4, 1.2, 60 + i, 1); }
        nuage(x + fw * 0.28, y + fh * 0.5, fh * 0.13); nuage(x + fw * 0.62, y + fh * 0.72, fh * 0.09);
      } else if (c === 'soir') {
        const hy = y + fh * 0.72; ligne(x, hy, x + fw, hy, 0.4, 1.2, 70); ctx.beginPath(); ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4; ctx.arc(x + fw * 0.45, hy, fh * 0.16, Math.PI, 0); ctx.stroke();
        for (let i = 0; i < 3; i++) { const bx = x + fw * (0.2 + i * 0.22), by = y + fh * (0.25 + (i % 2) * 0.1), k = fh * 0.04; trait([[bx - k, by - k * 0.6], [bx, by], [bx + k, by - k * 0.6]], 0.45, 1.2, 80 + i); }
      } else {
        lune = { x: x + fw * 0.66, y: y + fh * 0.36, r: fh * 0.15 }; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(lune.x, lune.y, lune.r, -1.2, 2.25); ctx.stroke(); ctx.beginPath(); ctx.arc(lune.x + lune.r * 0.45, lune.y - lune.r * 0.15, lune.r * 0.82, 1.55, -1.1 + Math.PI * 2, true); ctx.stroke();
        for (let i = 0; i < 6; i++) { const ex = x + fw * ((i * 0.37 + 0.1) % 1), ey = y + fh * ((i * 0.53 + 0.15) % 0.85), k = 2.5; ligne(ex - k, ey, ex + k, ey, 0.45, 1.1, 90 + i, 1); ligne(ex, ey - k, ex, ey + k, 0.45, 1.1, 95 + i, 1); }
      }
      ctx.restore();
      // le cadre, la croisée, l'appui ; les rideaux
      rect(x, y, fw, fh, 0.7, 2, 100); rect(x + 4, y + 4, fw - 8, fh - 8, 0.35, 1.1, 110);
      ligne(x + fw / 2, y + 4, x + fw / 2, y + fh - 4, 0.55, 1.5, 120); ligne(x + 4, y + fh * 0.46, x + fw - 4, y + fh * 0.46, 0.55, 1.5, 121);
      ligne(x - fw * 0.08, y + fh + 3, x + fw * 1.08, y + fh + 3, 0.65, 2, 122); ligne(x - fw * 0.08, y + fh + 9, x + fw * 1.08, y + fh + 9, 0.35, 1.2, 123);
      [-1, 1].forEach((sd, i) => { const bx = sd < 0 ? x - fw * 0.02 : x + fw * 1.02, P = []; for (let k = 0; k <= 8; k++) P.push([bx - sd * fw * 0.1 * Math.sin(k / 8 * Math.PI) - sd * Math.sin(k * 1.9) * 2, y - fh * 0.08 + (fh * 1.1) * k / 8]); trait(P, 0.4, 1.2, 130 + i); });
      ligne(x - fw * 0.15, y - fh * 0.08, x + fw * 1.15, y - fh * 0.08, 0.6, 1.8, 140);
    }
  }
  // un cadre accroché : le portrait d'un chat (la miche), dans un autre vide
  const pw = s0 * 0.55, ph = s0 * 0.66;
  if (large && yB - s0 * 1.5 - ph > top) {
    const cx = fixe('cadre', W, Hh, () => vide(W * 0.06, W * 0.32, pw * 1.6) ?? vide(W * 0.78, W * 0.97, pw * 1.6));
    if (cx != null) { const x = cx - pw / 2, y = yB - s0 * 1.6 - ph; rect(x, y, pw, ph, 0.6, 1.8, 150); rect(x + 5, y + 5, pw - 10, ph - 10, 0.3, 1, 151);
      ligne(x + pw / 2, y - ph * 0.22, x + pw * 0.2, y, 0.4, 1, 152, 1); ligne(x + pw / 2, y - ph * 0.22, x + pw * 0.8, y, 0.4, 1, 153, 1);
      // le chat du portrait : une tête, deux oreilles, deux yeux
      const hx = x + pw / 2, hy = y + ph * 0.56, r = pw * 0.24; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(hx - r, hy); ctx.quadraticCurveTo(hx - r, hy - r * 0.8, hx - r * 0.75, hy - r * 0.9); ctx.lineTo(hx - r * 0.65, hy - r * 1.4); ctx.lineTo(hx - r * 0.25, hy - r * 0.95);
      ctx.quadraticCurveTo(hx, hy - r * 1.02, hx + r * 0.25, hy - r * 0.95); ctx.lineTo(hx + r * 0.65, hy - r * 1.4); ctx.lineTo(hx + r * 0.75, hy - r * 0.9); ctx.quadraticCurveTo(hx + r, hy - r * 0.8, hx + r, hy);
      ctx.quadraticCurveTo(hx + r, hy + r * 0.85, hx, hy + r * 0.85); ctx.quadraticCurveTo(hx - r, hy + r * 0.85, hx - r, hy); ctx.stroke();
      [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(hx + sd * r * 0.38, hy, r * 0.13, r * 0.19, 0, 0, Math.PI * 2); ctx.fill(); }); }
  }
  // le tapis sous la table
  const t = Wd.P && Wd.P.table;
  if (t && Wd.props.includes(t) && !t.held && !t.fall) {
    const rx = t.hull.w * t.s * 0.75, ry = rx * 0.2 * (0.6 + Wd.depth / (s0 * 3)), cy = K.floorAt(t.d) - ry * 0.1;
    ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(t.x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.22; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(t.x, cy, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, px = t.x + Math.cos(a) * rx, py = cy + Math.sin(a) * ry; ligne(px, py, px + Math.cos(a) * 5, py + Math.sin(a) * 3, 0.3, 1, 200 + i, 1); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
  if (tr < 1) plume(W * tr, K.floorAt(1) - s0 * 0.05);
}
// la plume : un bec d'encre, penché, qui avance au bout du trait
function plume(x, y) {
  const k = Math.max(18, Wd.s0 * 0.16); ctx.save(); ctx.translate(x, y); ctx.rotate(-0.7); ctx.globalAlpha = 0.85; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-k * 0.18, -k * 0.5); ctx.lineTo(-k * 0.18, -k * 2.2); ctx.lineTo(k * 0.18, -k * 2.2); ctx.lineTo(k * 0.18, -k * 0.5); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -k * 0.05); ctx.lineTo(0, -k * 0.45); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -k * 0.5, k * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}
function nuage(x, y, s) { ctx.globalAlpha = 0.45; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - s * 2, y); ctx.arc(x - s * 1.1, y, s * 0.9, Math.PI, Math.PI * 1.9); ctx.arc(x, y - s * 0.3, s * 1.1, Math.PI * 1.1, Math.PI * 1.95); ctx.arc(x + s * 1.2, y, s * 0.8, Math.PI * 1.2, 0); ctx.lineTo(x - s * 2, y); ctx.stroke(); }

/* ——— l'arrivée à la plume (27/09, la revue ; Mathieu a choisi « la pièce et l'arrivée ») ———
   À l'ouverture de la page : la pièce se trace en une seconde, puis les meubles apparaissent un à un, du fond vers l'avant,
   chacun avec un petit gribouillis d'encre à sa base. (Pas pour qui préfère moins d'animations.) */
const calme = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let t0 = null; const DUREE = 1.1;
const trace = () => calme || t0 == null ? 1 : Math.min(1, Math.max(0, (Wd.t - t0) / DUREE));
function arrivee() {
  t0 = Wd.t; if (calme) return;
  const L = Wd.props.filter(p => !p.run && !p.mur).sort((a, b) => (b.d - a.d) || (a.x - b.x)), n = L.length;
  L.forEach((it, i) => { it.fade = it.fadeT = 0; K.later(0.45 + i * Math.min(0.09, 1.5 / Math.max(1, n)), () => {
    if (!Wd.props.includes(it)) return; it.fadeT = 1; it.fade = Math.max(it.fade, 0.15);
    for (let j = 0; j < 3; j++) Wd.fx.push({ k: 'dust', x: it.x + K.rnd(-0.3, 0.3) * it.hull.w * it.s, y: it.y, r: it.s * 0.18, a: 0.6, t0: Wd.t + j * 0.05, life: 0.5, seed: Math.floor(Math.random() * 99) }); }); });
}
H.pre.push(() => {
  if (!Wd.W || !Wd.floor) return;
  if (t0 == null && Wd.props.length) arrivee();
  if (trace() < 1 || (t0 != null && Wd.t - t0 < DUREE + 0.1)) { cle = ''; }
  cv.style.opacity = Wd.a;
  if (window.Grid && Grid.sol) Grid.sol(K.floorAt(1) - Wd.s0 * 0.05, Wd.a * trace());
  const t = Wd.P && Wd.P.table, m = new Date();
  const k = [Wd.W, Wd.H, Math.round(Wd.floor), Math.round(Wd.depth / 4), Math.round((Wd.ceil || 0) / 8), Math.round(Wd.s0), ciel(), t && Wd.props.includes(t) && !t.held && !t.fall ? Math.round(t.x / 6) + ':' + t.d.toFixed(2) : '-',
    m.getHours() >= 18 ? 1 : 0].join('|');
  if (k === cle) return; cle = k; dessine();
});

return { lune: () => lune, dessine };
})();
