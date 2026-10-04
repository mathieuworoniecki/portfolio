/* La craie : de quoi dessiner à la main sur le plan (traits, flèches, cercles, cotes, écriture, points).
   Tout est dessiné sur la toile des titres, qui applique ensuite le grain de la craie.
   Chaque trait a un tremblé de main fixé par une graine : il ne bouge pas tant que ses extrémités ne bougent pas.
   prog (0 → 1) : la part du trait déjà tracée ; la pointe de craie suit l'extrémité.
   o.color ("r,g,b") : une craie de couleur au lieu du trait du thème. */
window.Chalk = (() => {
// les couleurs, la police et le tremblé viennent du thème (js/theme.js) ; sans thème (écran d'accès) : la craie blanche
let INK, HAND, WOB, HS, HW;
const sync = () => { const TH = window.THEME || {}; INK = TH.ink || '238,245,255'; HAND = TH.hand || '"Caveat","Segoe Print",cursive'; WOB = TH.wobble ?? 1; HS = TH.handScale || 1; HW = TH.handWeight || 600; };
sync(); addEventListener('themechange', sync);   // le thème change en direct
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
let ctx = null, K = 1;   // K : l'échelle de l'écran (textes, épaisseurs, pointes), réglée par les scènes
function hash(a, b) { let x = (Math.imul(a | 0, 374761393) + Math.imul((b | 0) + 1, 668265263)) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
// densifier une ligne et lui donner le tremblé de la main
function hand(P, seed, amp) {
  const Q = [];
  for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5)); for (let k = 0; k < n; k++) Q.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  Q.push(P[P.length - 1]);
  let L = 0; return Q.map((p, i) => { if (i) L += Math.hypot(p[0] - Q[i - 1][0], p[1] - Q[i - 1][1]); const u = L * 0.07 + seed * 7.3; return [p[0] + amp * (Math.sin(u) * 0.6 + Math.sin(u * 2.7 + seed) * 0.4), p[1] + amp * (Math.sin(u * 1.3 + 2) * 0.6 + Math.sin(u * 3.1 + seed * 2) * 0.4)]; });
}
function trace(P, prog) {
  let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  let rem = L * c01(prog), tip = P[0];
  ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length && rem > 0; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (d <= rem) { ctx.lineTo(P[i][0], P[i][1]); rem -= d; tip = P[i]; } else { const f = rem / d; tip = [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f]; ctx.lineTo(tip[0], tip[1]); rem = 0; } }
  ctx.stroke(); return tip;
}
function tip(x, y, w, col) { ctx.fillStyle = `rgba(${col || INK},0.95)`; ctx.beginPath(); ctx.arc(x, y, w * 0.9, 0, Math.PI * 2); ctx.fill(); }
/* un trait à la craie le long des points P : deux passages, le second décalé et plus fin */
function stroke(P, prog, o) {
  o = o || {}; if (!ctx || prog <= 0.001 || P.length < 2) return null;
  const w = (o.w || 2.4) * Math.max(0.7, K) * (WOB ? 1 : 0.7), a = o.a ?? 0.85, seed = o.seed || 1, amp = (o.amp ?? 1.1) * Math.max(0.7, K) * WOB;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  const ink = o.color || INK;
  ctx.strokeStyle = `rgba(${ink},${a})`; ctx.lineWidth = w; const t = trace(hand(P, seed, amp), prog);
  if (WOB) { ctx.strokeStyle = `rgba(${ink},${a * 0.4 * Math.min(1, WOB)})`; ctx.lineWidth = w * 0.45; trace(hand(P.map(p => [p[0] + 0.9, p[1] + 0.6]), seed + 3, amp * 1.3), prog); }
  ctx.setLineDash([]);
  if (prog < 0.999 && o.tip !== false) tip(t[0], t[1], w, o.color);
  return t;
}
const line = (x0, y0, x1, y1, prog, o) => stroke([[x0, y0], [x1, y1]], prog, o);
// une flèche : le trait, puis la pointe
function arrow(P, prog, o) {
  o = o || {}; const t = stroke(P, c01(prog / 0.8), o); if (prog < 0.8 || !t) return;
  const a = P[P.length - 2], b = P[P.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = (o.head || 14) * K, q = c01((prog - 0.8) / 0.2);
  stroke([[b[0] - Math.cos(ang - 0.45) * L, b[1] - Math.sin(ang - 0.45) * L], b, [b[0] - Math.cos(ang + 0.45) * L, b[1] - Math.sin(ang + 0.45) * L]], q, Object.assign({}, o, { seed: (o.seed || 1) + 9 }));
}
// un cercle (ou une ellipse) à main levée, qui dépasse un peu de son départ
function circle(cx, cy, rx, ry, prog, o) {
  o = o || {}; const P = [], s = o.seed || 1, n = 48;
  for (let k = 0; k <= n; k++) { const t = (o.start ?? -2.2) + k / n * Math.PI * 2 * 1.06, g = 1 + (hash(k, s) - 0.5) * 0.04; P.push([cx + Math.cos(t) * rx * g, cy + Math.sin(t) * ry * g + k * 0.05]); }
  return stroke(P, prog, o);
}
// de l'écriture à la main, qui se découvre de gauche à droite
function text(str, x, y, prog, o) {
  o = o || {}; if (!ctx || prog <= 0.001) return;
  const fs = (o.size || 26) * K * HS;
  ctx.save(); ctx.font = `${HW} ${fs}px ${HAND}`; const tw = ctx.measureText(str).width, x0 = o.align === 'center' ? -tw / 2 : o.align === 'right' ? -tw : 0;
  // jamais hors de l'écran (les textes traduits sont parfois plus longs) : sans décalage de repère, on ramène le texte dans la toile
  { const m = ctx.getTransform(); if (!m.b && !m.c && !m.e && !m.f && m.a > 0) { const cw = ctx.canvas.width / m.a, pad = 10; if (x + x0 + tw > cw - pad) x = cw - pad - tw - x0; if (x + x0 < pad) x = pad - x0; } }
  ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.textBaseline = 'middle';
  ctx.beginPath(); ctx.rect(x0 - 4, -fs, (tw + 8) * c01(prog), fs * 2); ctx.clip();
  const ink = o.color || INK;
  // (vague 192, finition : dans l'espace, l'encre est claire ; les petits mots des chats, « couiiic », « c'est moi », se posaient sur un chat noir
  // ou sur la nuée et s'y perdaient en gris) : sur un fond sombre, le mot a toujours un liseré de la couleur du fond, comme les autres textes de l'espace
  const TH = window.THEME; if (TH && TH.dark && TH.lens && !o.color) { ctx.globalAlpha = 0.9 * (o.a ?? 0.9); ctx.strokeStyle = TH.lens; ctx.lineWidth = Math.max(2.5, fs * 0.2); ctx.lineJoin = 'round'; ctx.strokeText(str, x0, 0); ctx.globalAlpha = 1; }
  ctx.fillStyle = `rgba(${ink},${o.a ?? 0.9})`; ctx.fillText(str, x0, 0);
  if (WOB) { ctx.strokeStyle = `rgba(${ink},0.3)`; ctx.lineWidth = 0.8; ctx.strokeText(str, x0 + 0.8, 0.6); }
  ctx.restore();
  if (prog < 0.999) { const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0), px = x0 + tw * prog; tip(x + px * c, y + px * s, 2); }
  return tw;
}
const measure = (str, size) => { if (!ctx) return 0; ctx.save(); ctx.font = `${HW} ${(size || 26) * K * HS}px ${HAND}`; const w = ctx.measureText(str).width; ctx.restore(); return w; };
// une cote : deux traits de rappel, la ligne avec ses flèches, la valeur au milieu
function dim(x0, y0, x1, y1, label, prog, o) {
  o = o || {}; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, off = o.off ?? 0;
  const a0 = [x0 + nx * off, y0 + ny * off], a1 = [x1 + nx * off, y1 + ny * off];
  if (off) { line(x0, y0, a0[0] + nx * 6, a0[1] + ny * 6, prog, { w: 1.2, a: 0.5, seed: (o.seed || 1) + 1, tip: false }); line(x1, y1, a1[0] + nx * 6, a1[1] + ny * 6, prog, { w: 1.2, a: 0.5, seed: (o.seed || 1) + 2, tip: false }); }
  const q = c01((prog - 0.15) / 0.55);
  arrow([[ (a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2 ], a1], q, { w: 1.6, head: 9, seed: (o.seed || 1) + 3 });
  arrow([[ (a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2 ], a0], q, { w: 1.6, head: 9, seed: (o.seed || 1) + 4 });
  if (label) text(label, (a0[0] + a1[0]) / 2 + nx * 18, (a0[1] + a1[1]) / 2 + ny * 18, c01((prog - 0.6) / 0.4), { size: o.size || 24, align: 'center', rot: Math.abs(dx) >= Math.abs(dy) ? Math.atan2(dy, dx) * (dx < 0 ? 1 : 1) : 0 });
}
function dot(x, y, r, a, col) { if (!ctx) return; ctx.fillStyle = `rgba(${col || INK},${a ?? 0.85})`; ctx.beginPath(); ctx.arc(x, y, r || 2, 0, Math.PI * 2); ctx.fill(); }
// un voile de craie étalée (trace d'effaçage)
function smudge(x, y, w, h, a) { if (!ctx || !WOB) return; ctx.save(); ctx.translate(x, y); ctx.scale(1, h / w); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2); g.addColorStop(0, `rgba(${INK},${a ?? 0.06})`); g.addColorStop(1, `rgba(${INK},0)`); ctx.fillStyle = g; ctx.fillRect(-w / 2, -w / 2, w, w); ctx.restore(); }
return { set ctx(c) { ctx = c; }, get ctx() { return ctx; }, set scale(k) { K = k; }, get scale() { return K; }, stroke, line, arrow, circle, text, measure, dim, dot, smudge, tip, hash, INK };
})();
