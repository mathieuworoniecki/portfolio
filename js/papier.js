/* Le papier peint bleu (28/09, 20:42, Mathieu : « la transition vers le mode sérieux doit être bien plus rapide, avec une animation :
   par exemple les chats font du papier peint de la partie bleue, puis tous les éléments arrivent au fur et à mesure »).
   Papier.pose(o, fini) : une équipe de chats descend en rappel, chacun accroché à son rouleau ; le rouleau se déroule et colle un lé de bleu,
   du haut jusqu'en bas, en partant du bouton (o) vers les bords. Un coup de brosse, un « tadaa », et quand le dernier lé est collé : fini().
   Le bleu est exactement celui du mode sérieux (css/serieux.css) : quand il s'ouvre par-dessus, on ne voit pas la jointure ;
   c'est lui (js/serieux.js) qui fait arriver ses éléments un par un. Tout est sur une toile à part, au-dessus du mode chat, sous le mode sérieux. */
window.Papier = (() => {
const TAU = Math.PI * 2, c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); };
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INK = 'rgb(34,36,40)', PAPIER = 'rgb(250,248,242)';
let cv = null, ctx = null, run = null;

function toile() {
  if (cv) return; cv = document.createElement('canvas'); cv.className = 'papier-peint'; cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: 58, pointerEvents: 'none' }); document.body.appendChild(cv); ctx = cv.getContext('2d');
}
// le bleu du mode sérieux : un dégradé en ellipse, centré à 50 % / 40 % (comme son fond)
function bleu(W, H) { const rx = Math.SQRT2 * W / 2, ry = Math.SQRT2 * H * 0.6, g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, '#2468B6'); g.addColorStop(0.45, '#1C58A2'); g.addColorStop(1, '#133F7C'); return { g, rx, ry }; }

// un chat accroché à son rouleau (au trait, comme les autres : un contour, de grands yeux noirs à deux reflets) ; il se balance, la queue bat
function chat(x, y, s, t, ph, fin) {
  const bal = Math.sin(t * 7 + ph) * 0.12 * (1 - fin), q = Math.sin(t * 9 + ph);
  ctx.save(); ctx.translate(x, y); ctx.rotate(bal); ctx.lineWidth = Math.max(2, s * 0.05); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.fillStyle = PAPIER;
  // le corps qui pend sous le rouleau, les pattes arrière, la queue
  ctx.beginPath(); ctx.ellipse(0, s * 0.42, s * 0.26, s * 0.34, 0, 0, TAU); ctx.fill(); ctx.stroke();
  [-1, 1].forEach(g => { ctx.beginPath(); ctx.moveTo(g * s * 0.13, s * 0.7); ctx.quadraticCurveTo(g * s * (0.16 + 0.05 * q * g), s * 0.86, g * s * 0.12, s * 0.95); ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.62); ctx.bezierCurveTo(s * 0.55, s * 0.7, s * (0.45 + 0.2 * q), s * 1.0, s * (0.62 + 0.15 * q), s * 1.05); ctx.stroke();
  // le rouleau (un cylindre au trait) et la brosse
  const rw = s * 0.95, rh = s * 0.2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-rw / 2, -rh / 2, rw, rh, rh / 2) : ctx.rect(-rw / 2, -rh / 2, rw, rh); ctx.fillStyle = '#1C58A2'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(rw / 2 - rh * 0.25, 0, rh * 0.22, rh * 0.45, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = PAPIER;
  // la tête, au-dessus du rouleau ; les oreilles ; les pattes avant agrippées
  ctx.beginPath(); ctx.moveTo(-s * 0.28, -s * 0.2); ctx.lineTo(-s * 0.3, -s * 0.62); ctx.lineTo(-s * 0.1, -s * 0.47); ctx.quadraticCurveTo(0, -s * 0.5, s * 0.1, -s * 0.47); ctx.lineTo(s * 0.3, -s * 0.62); ctx.lineTo(s * 0.28, -s * 0.2);
  ctx.quadraticCurveTo(s * 0.3, -s * 0.02, 0, -s * 0.02); ctx.quadraticCurveTo(-s * 0.3, -s * 0.02, -s * 0.28, -s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  [-1, 1].forEach(g => { ctx.beginPath(); ctx.ellipse(g * s * 0.2, -s * 0.03, s * 0.08, s * 0.06, 0, 0, TAU); ctx.fill(); ctx.stroke(); });
  const cl = (t * 0.7 + ph) % 3 < 0.08 ? 0.15 : 1;
  [-1, 1].forEach(g => { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(g * s * 0.11, -s * 0.26, s * 0.055, s * 0.075 * cl, 0, 0, TAU); ctx.fill();
    if (cl > 0.5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(g * s * 0.11 - s * 0.018, -s * 0.29, s * 0.02, 0, TAU); ctx.arc(g * s * 0.11 + s * 0.02, -s * 0.23, s * 0.01, 0, TAU); ctx.fill(); } });
  ctx.beginPath(); ctx.moveTo(-s * 0.04, -s * 0.15); ctx.quadraticCurveTo(-s * 0.02, -s * 0.12, 0, -s * 0.15); ctx.quadraticCurveTo(s * 0.02, -s * 0.12, s * 0.04, -s * 0.15); ctx.stroke();
  ctx.restore();
}

function image() {
  const now = performance.now();
  const R = run; if (!R) return; const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const t = (now - R.t0) / 1000, B = bleu(W, H), s = Math.min(64, Math.max(40, R.lw * 0.55));
  let tous = true;
  R.les.forEach(L => {
    const u = t - L.t, e = reduit ? 1 : sm(u / R.duree), bas = -s + (H + s * 1.2) * e; if (e < 1) tous = false; if (u <= 0) return;
    // le lé : le bleu, collé du haut jusqu'au rouleau ; un peu gondolé sous le rouleau (pas encore lissé)
    ctx.save(); ctx.beginPath(); ctx.moveTo(L.x - 0.5, 0); ctx.lineTo(L.x + R.lw + 0.5, 0); ctx.lineTo(L.x + R.lw + 0.5, Math.max(0, bas));
    for (let k = 8; k >= 0; k--) { const x = L.x + R.lw * k / 8; ctx.lineTo(x, Math.max(0, bas) + Math.sin(k * 1.7 + t * 12) * 2.5 * (1 - e)); }
    ctx.closePath(); ctx.clip(); ctx.translate(W / 2, H * 0.4); ctx.scale(1, B.ry / B.rx); ctx.fillStyle = B.g; ctx.fillRect(-W, -H * 2, W * 2, H * 4); ctx.restore();
    // la jointure entre deux lés (un fil clair), qui s'efface quand le mode sérieux s'ouvre
    ctx.globalAlpha = 0.28 * (1 - R.fond); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L.x + 0.5, 0); ctx.lineTo(L.x + 0.5, Math.max(0, bas)); ctx.stroke(); ctx.globalAlpha = 1;
    // le chat, accroché au rouleau ; arrivé en bas, il lâche et tombe hors de l'écran
    const fin = c01((u - R.duree) / 0.35), y = bas + fin * fin * H * 0.6;
    if (y < H + s * 2) chat(L.x + R.lw / 2, y, s, t, L.ph, fin);
    if (u > R.duree * 0.2 && u < R.duree * 0.2 + 0.6) { ctx.globalAlpha = 1 - (u - R.duree * 0.2) / 0.6; ctx.fillStyle = PAPIER; ctx.font = `600 ${Math.round(s * 0.34)}px "Patrick Hand","Comic Sans MS",cursive`; ctx.textAlign = 'center'; ctx.fillText(L.mot, L.x + R.lw / 2 + s * 0.6, bas - s * 0.7); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }
  });
  if (tous && !R.fait) { R.fait = true; R.fini(); R.tf = now; }
  if (R.fait) { R.fond = c01((now - R.tf) / 250); if (now - R.tf > 700) { stop(); return; } }
  requestAnimationFrame(image);
}
function stop() { run = null; if (ctx) ctx.clearRect(0, 0, cv.width, cv.height); if (cv) cv.style.display = 'none'; }

// o : d'où ça part (le bouton) ; fini : appelé quand le dernier lé est collé
function pose(o, fini) {
  toile(); cv.style.display = ''; const W = innerWidth, n = Math.max(4, Math.round(W / (W < 700 ? 95 : 150))), lw = W / n, ox = o && o.x != null ? o.x : W / 2;
  const mots = window.I18N && I18N.lang && I18N.lang !== 'fr' ? ['hop', 'meow', 'slap', 'there', 'swoosh', 'tadaa'] : ['hop', 'miaou', 'clac', 'et hop', 'fshhh', 'tadaa'];
  const les = Array.from({ length: n }, (_, i) => ({ x: i * lw, d: Math.abs((i + 0.5) * lw - ox) / W, ph: i * 1.9, mot: mots[i % mots.length] }));
  les.forEach(L => { L.t = 0.12 + L.d * 0.5 + Math.random() * 0.05; });
  run = { t0: performance.now(), les, lw, duree: 0.55, fini, fait: false, fond: 0 };
  requestAnimationFrame(image);
}
addEventListener('serieux:ferme', stop);
return { pose, stop };
})();
