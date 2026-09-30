/* Les scènes de la présentation dans l'espace (js/espace-plume.js les joue, l'une après l'autre, toute seule).
   (28/09, 20:39, Mathieu : « chaque scène doit être créative ! » : les terminaux par dizaines, en grille vue de biais, qui défilent à l'infini ;
   l'équipe : ma silhouette, puis d'un coup plein de gens derrière, plein de mains qui s'agitent, qui ressortent de moi en popant et y reviennent ;
   « épaissis le trait, prends le même que pour les chats »)
   Chaque scène : cles() : les points (x, y dans [-1, 1] autour du centre de l'écran du ciel) où les étoiles viennent se poser d'abord ;
   dessin(a, now) : l'animation, a secondes après que les étoiles se sont posées (elle tourne en boucle tant que la scène dure).
   Tout est au trait blanc, épais et rond comme celui des chats ; les formes pleines sont peintes de la nuit (ce qui est derrière disparaît). */
window.EspaceScenes = (() => {
const TAU = Math.PI * 2, BL = '244,244,238', NUIT = 'rgb(9,11,16)';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
const bruit = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const en = () => !!(window.I18N && I18N.lang && I18N.lang !== 'fr');
let ctx = null, G = null, O = null;   // (posés à chaque image par js/espace-plume.js : la toile, l'écran du ciel { cx, cy, s, sw, lw }, TrouNoir.outils)

/* ——— le trait ——— */
const X = x => G.cx + x * G.s, Y = y => G.cy + y * G.s, P = (x, y) => [X(x), Y(y)];   // (G.s : la demi-taille de l'écran du ciel)
function style(w = 1, a = 1) { ctx.globalAlpha = a; ctx.strokeStyle = ctx.fillStyle = `rgb(${BL})`; ctx.lineWidth = G.lw * w; ctx.lineCap = ctx.lineJoin = 'round'; }
function trait(L, ferme, w, a, nuit) { if (L.length < 2) return; ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (ferme) ctx.closePath();
  if (nuit) { ctx.globalAlpha = 1; ctx.fillStyle = NUIT; ctx.fill(); } style(w, a); ctx.stroke(); }
function rond(x, y, r, w, a, plein) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.2, r), 0, TAU); if (plein === 'nuit') { ctx.globalAlpha = 1; ctx.fillStyle = NUIT; ctx.fill(); } style(w, a); plein === true ? ctx.fill() : ctx.stroke(); }
function boite(x, y, w, h, r, lw, a, nuit) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  if (nuit) { ctx.globalAlpha = 1; ctx.fillStyle = NUIT; ctx.fill(); } style(lw, a); ctx.stroke(); }
function mot(t, x, y, px, a, al) { ctx.globalAlpha = a; ctx.fillStyle = `rgb(${BL})`; ctx.font = `600 ${px}px "Space Grotesk",system-ui,sans-serif`; ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
const eclat = (x, y, r, k, n = 7, ph = 0) => { if (k <= 0 || k >= 1) return; style(0.7, 1 - k); ctx.beginPath(); for (let i = 0; i < n; i++) { const a = ph + i / n * TAU, r0 = r * (0.6 + k), r1 = r0 + r * 0.6; ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); } ctx.stroke(); };
const brille = (x, y, R, k, br, now, ph) => { if (O) O.brille(ctx, x, y, R, k, br, now, ph); };
const coche = (x, y, r, u, w = 1) => { const L = [[x - r, y], [x - r * 0.3, y + r * 0.7], [x + r, y - r * 0.8]]; const l1 = Math.hypot(r * 0.7, r * 0.7), l2 = Math.hypot(r * 1.3, r * 1.5), d = (l1 + l2) * c01(u);
  const Q = [L[0]]; if (d <= l1) Q.push([lerp(L[0][0], L[1][0], d / l1), lerp(L[0][1], L[1][1], d / l1)]); else { Q.push(L[1]); Q.push([lerp(L[1][0], L[2][0], (d - l1) / l2), lerp(L[1][1], L[2][1], (d - l1) / l2)]); } trait(Q, false, w, 1); };
// en 3D : un point (x, y, z) tourné (lacet, tangage), vu en perspective ; [x, y, profondeur]
function p3(x, y, z, lac, tan, k = G.s) { const c = Math.cos(lac), s = Math.sin(lac), x1 = x * c + z * s, z1 = -x * s + z * c, c2 = Math.cos(tan), s2 = Math.sin(tan), y2 = y * c2 - z1 * s2, z2 = y * s2 + z1 * c2, f = 3.6 / (3.6 - z2);
  return [G.cx + x1 * k * f, G.cy + y2 * k * f, z2]; }

// une silhouette : la tête, les épaules ; bras : null (baissés) ou [gauche, droite] en radians (levés, qui s'agitent) ; moi : ses cheveux en épis et sa moustache
function perso(x, y, k, o = {}) {
  const sx = G.s * k, h = [X(x), Y(y) - sx * 0.3], a = o.a ?? 1;
  if (o.bras) o.bras.forEach((b, i) => { const sg = i ? 1 : -1, ep = [X(x) + sg * sx * 0.28, Y(y) + sx * 0.02], m = [ep[0] + sg * Math.cos(b) * sx * 0.2, ep[1] - Math.sin(b) * sx * 0.2], main = [m[0] + sg * Math.cos(b + 0.5) * sx * 0.18, m[1] - Math.abs(Math.sin(b + 0.5)) * sx * 0.2];
    trait([ep, m, main], false, 0.9 * (o.w || 1), a); rond(main[0], main[1], sx * 0.045, 0.8 * (o.w || 1), a, 'nuit'); });
  ctx.beginPath(); ctx.moveTo(X(x) - sx * 0.38, Y(y) + sx * 0.34); ctx.quadraticCurveTo(X(x) - sx * 0.36, Y(y) - sx * 0.04, X(x), Y(y) - sx * 0.06); ctx.quadraticCurveTo(X(x) + sx * 0.36, Y(y) - sx * 0.04, X(x) + sx * 0.38, Y(y) + sx * 0.34); ctx.closePath();
  ctx.globalAlpha = 1; ctx.fillStyle = NUIT; ctx.fill(); style(o.w || 1, a); ctx.stroke();
  rond(h[0], h[1], sx * 0.17, o.w || 1, a, 'nuit');
  if (o.moi) { style((o.w || 1) * 0.9, a); ctx.beginPath(); [-0.6, -0.2, 0.2, 0.6].forEach((d, i) => { const b = -Math.PI / 2 + d * 0.9, r0 = sx * 0.17; ctx.moveTo(h[0] + Math.cos(b) * r0, h[1] + Math.sin(b) * r0); ctx.lineTo(h[0] + Math.cos(b) * (r0 + sx * (0.07 + (i % 2) * 0.03)), h[1] + Math.sin(b) * (r0 + sx * (0.07 + (i % 2) * 0.03))); });
    // (la moustache en guidon, les pointes relevées ; le sourire dessous)
    [-1, 1].forEach(g => { ctx.moveTo(h[0], h[1] + sx * 0.035); ctx.quadraticCurveTo(h[0] + g * sx * 0.06, h[1] + sx * 0.075, h[0] + g * sx * 0.11, h[1] + sx * 0.03); ctx.quadraticCurveTo(h[0] + g * sx * 0.125, h[1] + sx * 0.005, h[0] + g * sx * 0.1, h[1] + sx * 0.0); });
    ctx.moveTo(h[0] - sx * 0.045, h[1] + sx * 0.095); ctx.quadraticCurveTo(h[0], h[1] + sx * 0.125, h[0] + sx * 0.045, h[1] + sx * 0.095); ctx.stroke();
    rond(h[0] - sx * 0.055, h[1] - sx * 0.03, sx * 0.012, 1, a, true); rond(h[0] + sx * 0.055, h[1] - sx * 0.03, sx * 0.012, 1, a, true); }
}
// (29/09, 07:49, Mathieu : « tes robots pour représenter l'IA sont à retravailler, tu es retombé dans la facilité ; revois le style pour qu'il soit
// dans le style des formes des chats mélangé à l'espace ») : un agent = un chat-robot astronaute, comme les chats du site : un seul contour à l'encre,
// rempli de papier, cerné de blanc (comme les chats qui flottent dans l'espace) ; les yeux : deux grands ovales noirs à deux reflets ; les oreilles ;
// une antenne à étoile ; le casque de verre, son reflet ; une combinaison avec son voyant. Il tourne la tête (o.lac), cligne, agite les bras
const PAP = 'rgb(250,248,242)', ENC = 'rgb(34,36,40)';
function cerne(path, w, a, remplir = PAP) { ctx.globalAlpha = a; ctx.lineJoin = ctx.lineCap = 'round';
  ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = G.lw * w * 2.3; path(); ctx.stroke(); if (remplir) { ctx.fillStyle = remplir; path(); ctx.fill(); } ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.95; path(); ctx.stroke(); }
function chabot(x, y, r, o = {}) {
  const a = o.a ?? 1, lac = o.lac ?? 0, sl = Math.sin(lac), w = clamp01(r / 30) * 0.7 + 0.35, now = o.now || 0, ph = o.ph || 0;
  if (r < 3) { rond(x, y, Math.max(1.2, r), 0.6, a, true); return; }
  // le corps : une combinaison arrondie, un sac à dos qui dépasse du côté où il ne regarde pas ; les bras
  const by = y + r * 1.02, bw = r * 0.78, bh = r * 0.72;
  let bras = o.bras ?? [Math.sin(now * 3 + ph) * 0.25, -Math.sin(now * 3 + ph) * 0.25];
  // (vague 49, l'audit : « le chat-robot », immersion) : il nous voit. La souris approche : ses yeux la suivent ; tout près, il lève le bras
  // de son côté et fait coucou (les chats-robots d'une foule se retournent vers nous un à un, au passage du pointeur)
  // (le pointeur est en pixels d'écran ; le dessin peut être déplacé ou tourné : on ramène le pointeur dans son repère)
  const Sp = r >= 6 ? sourisIci() : null;
  const dS = Sp ? Math.hypot(Sp.x - x, Sp.y - y) : 1e9, voit = dS < r * 6 ? 1 - dS / (r * 6) : 0;
  if (dS < r * 2.8) { const i = Sp.x > x ? 1 : 0; bras = bras.slice(); bras[i] = 1.25 + Math.sin(now * 14 + ph) * 0.4; }
  [-1, 1].forEach((g, i) => { const b = bras[i], ex = x + g * bw * 0.86, ey = by - bh * 0.35, mx = ex + g * Math.cos(b) * r * 0.42, my = ey - Math.sin(b) * r * 0.42;
    cerne(() => { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(mx, my); }, w * 1.5, a, null); cerne(() => { ctx.beginPath(); ctx.arc(mx, my, r * 0.13, 0, TAU); }, w, a); });
  // (vague 32, l'audit : « le chat-robot ») : une queue de chat mécanique, en anneaux qui rapetissent, qui ondule derrière lui ; le bout, une petite boule
  if (r >= 6) { const cq = sl > 0.05 ? -1 : sl < -0.05 ? 1 : (bruit(ph * 3.3) < 0.5 ? -1 : 1), n = 6, P = [];
    for (let i = 0; i <= n; i++) { const u = i / n, on = Math.sin(now * 3.2 + ph * 2 - u * 2.6) * 0.5 * u; P.push([x + cq * (bw * 0.7 + Math.sin(u * 1.9 + on) * r * 0.95), by + bh * 0.55 - Math.sin(u * 2.4) * r * 0.9 * (1 - on * 0.3) - u * r * 0.2]); }
    cerne(() => { ctx.beginPath(); P.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); }, w * 1.6, a, null);
    ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.6, G.lw * w * 0.45); for (let i = 1; i < n; i++) { const [qx, qy] = P[i], [px, py] = P[i - 1], d = Math.hypot(qx - px, qy - py) || 1, nx = -(qy - py) / d, ny = (qx - px) / d, e = r * 0.1 * (1 - i / n * 0.5); ctx.beginPath(); ctx.moveTo(qx - nx * e, qy - ny * e); ctx.lineTo(qx + nx * e, qy + ny * e); ctx.stroke(); }
    cerne(() => { ctx.beginPath(); ctx.arc(P[n][0], P[n][1], r * 0.1, 0, TAU); }, w, a); }
  cerne(() => { ctx.beginPath(); ctx.ellipse(x - sl * r * 0.9, by - bh * 0.1, r * 0.34, bh * 0.62, 0, 0, TAU); }, w, a * (Math.abs(sl) > 0.15 ? 1 : 0));
  cerne(() => { ctx.beginPath(); ctx.moveTo(x - bw, by - bh * 0.55); ctx.quadraticCurveTo(x - bw * 1.05, by + bh, x, by + bh); ctx.quadraticCurveTo(x + bw * 1.05, by + bh, x + bw, by - bh * 0.55); ctx.quadraticCurveTo(x, by - bh * 0.95, x - bw, by - bh * 0.55); ctx.closePath(); }, w, a);
  // le voyant de poitrine (il clignote quand il travaille), la ceinture
  ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.7; ctx.beginPath(); ctx.moveTo(x - bw * 0.8, by + bh * 0.35); ctx.quadraticCurveTo(x, by + bh * 0.5, x + bw * 0.8, by + bh * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + sl * bw * 0.4, by + bh * 0.02, r * 0.1, 0, TAU); ctx.fillStyle = o.travaille && Math.sin(now * 12 + ph) > 0 ? ENC : PAP; ctx.fill(); ctx.stroke();
  // (vague 23 de l'audit : « le chat-robot astronaute ») : du volume à la plume, comme la planète des chats : quelques hachures du côté de l'ombre
  const hach = (cx, cy, rx, ry, n) => { if (r < 9) return; ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip(); ctx.globalAlpha = a * 0.42; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.6, G.lw * w * 0.3); ctx.beginPath();
    for (let i = 0; i < n; i++) { const u = cx + rx * (0.5 + i * 0.5 / n) - sl * rx * 0.3; ctx.moveTo(u, cy - ry); ctx.lineTo(u + ry * 0.5, cy + ry); } ctx.stroke(); ctx.restore(); };
  hach(x, by + bh * 0.2, bw * 0.95, bh * 0.75, 4);
  // la tête : un rond un peu large, deux oreilles pointues (celle du fond plus petite quand il tourne)
  const hx = x + sl * r * 0.06, oe = g => { const ox = hx + (g * 0.52 + sl * 0.3) * r, k = 1 - Math.max(0, g * -sl) * 0.5; return [[ox - g * r * 0.3, y - r * 0.55], [ox + g * r * 0.05 * k, y - r * (0.62 + 0.5 * k)], [ox + g * r * 0.32, y - r * 0.38]]; };
  cerne(() => { ctx.beginPath(); const L = oe(-1), R = oe(1); ctx.moveTo(...L[0]); ctx.lineTo(...L[1]); ctx.lineTo(...L[2]); ctx.ellipse(hx, y, r * 0.95, r * 0.78, 0, -2.4, -0.74); ctx.lineTo(...R[0]); ctx.lineTo(...R[1]); ctx.lineTo(...R[2]);
    ctx.ellipse(hx, y, r * 0.95, r * 0.78, 0, -0.35, Math.PI + 0.35); ctx.closePath(); }, w, a);
  hach(hx, y, r * 0.93, r * 0.76, 3);
  // les yeux : deux grands ovales noirs, deux reflets ; ils suivent le regard ; parfois il cligne
  const cl = o.cligne || (now * 0.31 + bruit(ph * 5.1) * 4) % 4 < 0.1 ? 0.12 : 1;   // (il cligne tout seul, chacun à son heure)
  [-1, 1].forEach(g => { const ex = hx + (g * 0.36 + sl * 0.3) * r + (voit ? clamp((Sp.x - x) / (r * 3), -1, 1) * r * 0.06 * voit : 0), ey = y + r * 0.02 + (voit ? clamp((Sp.y - y) / (r * 3), -1, 1) * r * 0.05 * voit : 0), sq = 1 - Math.max(0, g * -sl) * 0.35;
    ctx.globalAlpha = a; ctx.fillStyle = ENC; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.15 * sq, r * 0.21 * cl, 0, 0, TAU); ctx.fill();
    if (cl > 0.5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - r * 0.05, ey - r * 0.08, r * 0.055, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(ex + r * 0.05, ey + r * 0.07, r * 0.028, 0, TAU); ctx.fill(); } });
  // la bouche en « w », le nez
  ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.6; const mx = hx + sl * r * 0.32, my = y + r * 0.3;
  ctx.beginPath(); ctx.moveTo(mx - r * 0.1, my); ctx.quadraticCurveTo(mx - r * 0.05, my + r * 0.07, mx, my); ctx.quadraticCurveTo(mx + r * 0.05, my + r * 0.07, mx + r * 0.1, my); ctx.stroke();
  // (vague 6, l'audit : « le chat-robot est un peu répété ») : chacun le sien. Selon son numéro : l'antenne à étoile, l'antenne à ressort,
  // la parabole, l'hélice sur la tête, le casque-micro ; et un pelage : des rayures au front, une tache autour d'un œil
  const v = o.v ?? (Math.abs(Math.round(ph * 7)) % 5), bx = hx - sl * r * 0.1, bt = y - r * 0.76; ctx.lineWidth = G.lw * w * 0.8; ctx.strokeStyle = ENC; ctx.globalAlpha = a;
  if (v === 1 || v === 3) { ctx.lineWidth = G.lw * w * 0.55; [-0.14, 0, 0.14].forEach(q => { ctx.beginPath(); ctx.moveTo(hx + (q + sl * 0.25) * r, y - r * 0.74); ctx.lineTo(hx + (q * 0.8 + sl * 0.25) * r, y - r * 0.52); ctx.stroke(); }); ctx.lineWidth = G.lw * w * 0.8; }
  if (v === 2) { const ex = hx + (-0.36 + sl * 0.3) * r; ctx.lineWidth = G.lw * w * 0.55; ctx.beginPath(); ctx.ellipse(ex, y + r * 0.02, r * 0.27, r * 0.31, 0.2, 0, TAU); ctx.stroke(); ctx.lineWidth = G.lw * w * 0.8; }
  if (v === 0) { const at = [hx - sl * r * 0.2, y - r * 1.45]; ctx.beginPath(); ctx.moveTo(bx, bt); ctx.quadraticCurveTo(hx + r * 0.15, y - r * 1.1, at[0], at[1]); ctx.stroke(); brille(at[0], at[1], Math.max(2, r * 0.12), a, !!o.travaille, now, ph); }
  else if (v === 1) { const n = 6, rb = Math.sin(now * 7 + ph) * r * 0.06; ctx.beginPath(); ctx.moveTo(bx, bt); for (let i = 1; i <= n; i++) ctx.lineTo(bx + (i % 2 ? 1 : -1) * r * 0.12 * (i < n ? 1 : 0) + rb * i / n, bt - i * r * 0.1); ctx.stroke();
    const tp = [bx + rb, bt - n * r * 0.1 - r * 0.1]; ctx.fillStyle = ENC; ctx.beginPath(); ctx.arc(tp[0], tp[1], r * 0.12, 0, TAU); ctx.fill(); }
  else if (v === 2) { const ang = Math.sin(now * 0.9 + ph) * 0.5 - 0.3, cx = bx + r * 0.05, cy = bt - r * 0.28; ctx.beginPath(); ctx.moveTo(bx, bt); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = PAP; ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.34, r * 0.14, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(0, -r * 0.34); ctx.stroke(); ctx.fillStyle = ENC; ctx.beginPath(); ctx.arc(0, -r * 0.36, r * 0.05, 0, TAU); ctx.fill(); ctx.restore(); }
  else if (v === 3) { const cy = bt - r * 0.22, sp = now * (o.travaille ? 16 : 7) + ph; ctx.beginPath(); ctx.moveTo(bx, bt); ctx.lineTo(bx, cy); ctx.stroke();
    ctx.fillStyle = PAP; ctx.beginPath(); ctx.ellipse(bx, bt + r * 0.02, r * 0.3, r * 0.12, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
    [0, Math.PI].forEach(q => { const c = Math.cos(sp + q); ctx.beginPath(); ctx.ellipse(bx + c * r * 0.25, cy, Math.abs(c) * r * 0.25 + 0.5, r * 0.06, 0, 0, TAU); ctx.fillStyle = PAP; ctx.fill(); ctx.stroke(); }); }
  else { ctx.beginPath(); ctx.ellipse(hx, y - r * 0.1, r * 1.0, r * 0.82, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    const sx = hx + (0.92 - sl * 0.2) * r, sy = y - r * 0.02; ctx.fillStyle = ENC; ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.1, r * 0.18, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx, sy + r * 0.12); ctx.quadraticCurveTo(sx, y + r * 0.42, hx + (sl * 0.32 + 0.22) * r, y + r * 0.36); ctx.stroke(); ctx.beginPath(); ctx.arc(hx + (sl * 0.32 + 0.2) * r, y + r * 0.36, r * 0.05, 0, TAU); ctx.fill(); }
  // le casque de verre : un rond au trait blanc, un reflet
  if (o.casque !== false) { style(0.55 * w, a * 0.8); ctx.beginPath(); ctx.arc(hx, y - r * 0.08, r * 1.32, 0, TAU); ctx.stroke(); style(0.9 * w, a * 0.7); ctx.beginPath(); ctx.arc(hx, y - r * 0.08, r * 1.16, -2.5, -1.9); ctx.stroke(); }
}
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v, pick2 = (L, i) => L[Math.abs(i) % L.length];
function robot(x, y, r, a = 1, cligne = 0, o = {}) { chabot(x, y - r * 0.15, r * 0.82, Object.assign({ a, cligne }, o)); }

// un objet extrudé en 3D (un profil plat, une épaisseur), dans le style des chats : cerné de blanc, rempli de papier, au trait d'encre ;
// V(u, v, d) : du repère de l'objet vers l'écran ; on peint la face du fond, les flancs du fond vers nous, puis la face de devant (rendue)
function prisme(V, P2, ep, a = 1, w = 0.8) {
  const F = P2.map(([u, v]) => V(u, v, -ep / 2)), B = P2.map(([u, v]) => V(u, v, ep / 2)), n = P2.length, zm = L => L.reduce((t, p) => t + p[2], 0) / L.length;
  const [P0, P1] = zm(F) < zm(B) ? [F, B] : [B, F], poly = L => { ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
  const cotes = []; for (let i = 0; i < n; i++) { const j = (i + 1) % n; cotes.push({ L: [F[i], F[j], B[j], B[i]], z: zm([F[i], F[j], B[i], B[j]]) }); }
  ctx.globalAlpha = a; ctx.lineJoin = ctx.lineCap = 'round'; ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = G.lw * w * 2.3; [P0, P1, ...cotes.map(c => c.L)].forEach(L => { poly(L); ctx.stroke(); });
  const face = L => { ctx.fillStyle = PAP; poly(L); ctx.fill(); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.9; ctx.stroke(); };
  face(P0); cotes.sort((p, q) => p.z - q.z).forEach(c => face(c.L)); face(P1); return P1;
}
// un repère local : centre (x, y, z), lacet r, taille s → V(u, v, d)
const repere = (V, x, y, z, r, s, t = 0) => (u, v, d) => { const u1 = u * Math.cos(t) - v * Math.sin(t), v1 = u * Math.sin(t) + v * Math.cos(t); return V(x + (u1 * Math.cos(r) + d * Math.sin(r)) * s, y + v1 * s, z + (-u1 * Math.sin(r) + d * Math.cos(r)) * s); };
// un mot à l'encre, posé sur une face (il tient dans sa largeur)
function encre(t, P, a = 1, echelle = 0.34) { const xs = P.map(p => p[0]), ys = P.map(p => p[1]), W = Math.max(...xs) - Math.min(...xs), H = Math.max(...ys) - Math.min(...ys), px = Math.min(H * echelle, W * 1.5 / Math.max(3, t.length));
  if (px < 6) return; ctx.globalAlpha = a; ctx.fillStyle = ENC; ctx.font = `700 ${px}px "Space Grotesk",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, xs.reduce((q, x) => q + x, 0) / xs.length, ys.reduce((q, y) => q + y, 0) / ys.length); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }

// un bloc de papier en 3D (x0..x1, y0..y1, z0..z1)
function bloc(V, x0, x1, y0, y1, z0, z1, a = 1, w = 0.8) { const zc = (z0 + z1) / 2; return prisme((u, v, d) => V(u, v, zc + d), [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z1 - z0, a, w); }
// un cylindre de papier : son flanc (la moitié qui nous regarde), son couvercle ; cerné de blanc
function cylindre(V, x, z, r, y0, y1, a = 1, w = 0.9) {
  const B = anneau(V, r, y0, 32, x, z).slice(0, 32), H = anneau(V, r, y1, 32, x, z).slice(0, 32), l = B.reduce((m, p, j) => p[0] < B[m][0] ? j : m, 0), rr = B.reduce((m, p, j) => p[0] > B[m][0] ? j : m, 0);
  const seg = d => { const L = []; for (let t = l; ; t = (t + d + 32) % 32) { L.push(B[t]); if (t === rr) break; } return L; }, zz = L => L.reduce((q, p) => q + p[2], 0) / L.length, s1 = seg(1), s2 = seg(-1), av = zz(s1) > zz(s2) ? s1 : s2;
  const path = L => () => { ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
  cerne(path([H[l], ...av, H[rr]]), w, a); cerne(path(H), w, a); return { B, H, av }; }
// un écran de papier épais (son épaisseur part en haut à droite) ; dedans : la nuit
function ecran(x, y, w, h, ep, r = 6, a = 1) { const V = (u, v, d) => [x + u + (d + ep / 2) * 0.6, y + v - (d + ep / 2) * 0.4, -d, 1];
  prisme(V, [[0, 0], [w, 0], [w, h], [0, h]], ep, a, 0.9); const i = Math.min(w, h) * 0.04; boite(x + i, y + i, w - 2 * i, h - 2 * i, r, 0.9, a, true); }
// un engrenage de papier
function rouage(x, y, r, t, a = 1) { cerne(() => { ctx.beginPath(); for (let k = 0; k < 20; k++) { const u = t + k / 20 * TAU, rr = r * (k % 2 ? 0.76 : 1); ctx.lineTo(x + Math.cos(u) * rr, y + Math.sin(u) * rr); } ctx.closePath(); }, 0.8, a);
  ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.5; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TAU); ctx.stroke(); }
// un caillou de l'espace, en papier
function caillou(x, y, r, t, n, a = 1, mechant = false) { if (!(r > 0.3)) return;   // (derrière la caméra, au téléphone : rien)
  cerne(() => { ctx.beginPath(); for (let i = 0; i < 11; i++) { const u = i / 11 * TAU + t, rr = r * (0.78 + 0.3 * bruit(n * 13 + i)); ctx.lineTo(x + Math.cos(u) * rr, y + Math.sin(u) * rr); } ctx.closePath(); }, 0.7, a);
  ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.4; if (!mechant) { ctx.beginPath(); ctx.arc(x + Math.cos(t) * r * 0.3, y + Math.sin(t) * r * 0.3, r * 0.2, 0, TAU); ctx.stroke(); return; }
  // (un méchant : deux yeux plissés, les sourcils en V, des crocs)
  ctx.fillStyle = ENC; [-1, 1].forEach(g => { ctx.beginPath(); ctx.ellipse(x + g * r * 0.3, y - r * 0.05, r * 0.13, r * 0.17, 0, 0, TAU); ctx.fill(); ctx.lineWidth = G.lw * 0.5; ctx.beginPath(); ctx.moveTo(x + g * r * 0.55, y - r * 0.4); ctx.lineTo(x + g * r * 0.12, y - r * 0.22); ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(x - r * 0.25, y + r * 0.35); ctx.lineTo(x - r * 0.12, y + r * 0.5); ctx.lineTo(x, y + r * 0.35); ctx.lineTo(x + r * 0.12, y + r * 0.5); ctx.lineTo(x + r * 0.25, y + r * 0.35); ctx.stroke(); }

// lui, dans le style des chats (29/09, 07:49, Mathieu : « ta forme d'humain pour la dernière étape de la partie 1, c'est vraiment super basique ») :
// un seul contour à l'encre, rempli de papier, cerné de blanc ; un visage long, les cheveux en épis, la moustache en guidon, deux grands yeux noirs
// à reflets ; un t-shirt (une petite montagne dessus) ; o.tp (0 → 1) : le bras abat le tampon sur o.cible ; o.hoche : la tête hoche
// (vague 33 de l'audit : « toi, dans le style des chats » : original et vivant) : en apesanteur, ses épis flottent ; ses yeux suivent la souris ;
// et un petit chat est assis sur son épaule : il balance la queue, remue une oreille, suit la souris lui aussi, et fait un bond quand le tampon tombe
const souris = () => { const W = window.Chats && Chats.K && Chats.K.Wd, P = W && W.ptr; return P && P.on ? P : null; };
// (le pointeur, ramené dans le repère du dessin en cours : le dessin peut être déplacé, tourné, à l'échelle de l'écran)
const sourisIci = () => { const P = souris(); if (!P) return null; const m = ctx.getTransform(), k = (ctx.canvas.width / (ctx.canvas.clientWidth || ctx.canvas.width)) || 1, i = m.inverse(), px = P.x * k, py = P.y * k; return { x: i.a * px + i.c * py + i.e, y: i.b * px + i.d * py + i.f }; };
function epaule(x, y, r, now, a, regard, saut) {
  const yb = y - saut * r * 0.5, qx = Math.sin(now * 1.9) * 0.5 + Math.sin(now * 0.7) * 0.3, w = clamp01(r / 20) * 0.6 + 0.4;
  // la queue qui pend derrière l'épaule et balance
  cerne(() => { ctx.beginPath(); ctx.moveTo(x + r * 0.5, yb - r * 0.3); ctx.bezierCurveTo(x + r * 1.3, yb, x + r * (0.9 + qx * 0.6), yb + r * 1.2, x + r * (1.3 + qx), yb + r * 1.7); }, w * 1.3, a, null);
  // le corps (une miche), les deux pattes avant
  cerne(() => { ctx.beginPath(); ctx.ellipse(x, yb - r * 0.45, r * 0.72, r * 0.52, 0, 0, TAU); }, w, a);
  [-0.28, 0.12].forEach(d => cerne(() => { ctx.beginPath(); ctx.ellipse(x + d * r, yb - r * 0.02, r * 0.17, r * 0.12, 0, 0, TAU); }, w * 0.8, a));
  // la tête, les oreilles dans son contour (l'une tressaille de temps en temps)
  const hy = yb - r * 1.2, tr = Math.sin(now * 0.9) > 0.93 ? Math.sin(now * 40) * 0.12 : 0;
  cerne(() => { ctx.beginPath(); ctx.moveTo(x - r * 0.62, hy + r * 0.1); ctx.lineTo(x - r * 0.6, hy - r * 0.62); ctx.lineTo(x - r * 0.22, hy - r * 0.38);
    ctx.quadraticCurveTo(x, hy - r * 0.46, x + r * 0.22, hy - r * 0.38); ctx.lineTo(x + r * (0.62 + tr), hy - r * (0.64 - tr)); ctx.lineTo(x + r * 0.62, hy + r * 0.1);
    ctx.quadraticCurveTo(x + r * 0.6, hy + r * 0.52, x, hy + r * 0.52); ctx.quadraticCurveTo(x - r * 0.6, hy + r * 0.52, x - r * 0.62, hy + r * 0.1); ctx.closePath(); }, w, a);
  const cl = (now * 0.37 + 1.3) % 3.3 < 0.12 ? 0.15 : 1, vx = r * 0.08 * regard[0], vy = r * 0.06 * regard[1];
  [-1, 1].forEach(sd => { const ex = x + sd * r * 0.25 + vx, ey = hy + r * 0.05 + vy; ctx.globalAlpha = a; ctx.fillStyle = ENC; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.12, r * 0.16 * cl, 0, 0, TAU); ctx.fill();
    if (cl > 0.5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - r * 0.04, ey - r * 0.06, r * 0.045, 0, TAU); ctx.fill(); } });
  ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.6; ctx.beginPath(); ctx.moveTo(x - r * 0.08, hy + r * 0.28); ctx.quadraticCurveTo(x, hy + r * 0.36, x, hy + r * 0.28); ctx.quadraticCurveTo(x, hy + r * 0.36, x + r * 0.08, hy + r * 0.28); ctx.stroke();
}
function lui(x, y, r, o = {}) {
  const nw = o.now || 0, P = sourisIci(), regard = P ? (() => { const dx = P.x - x, dy = P.y - y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; })() : [Math.sin(nw * 0.5) * 0.6, 0.2];
  // (vague 50, l'audit : « toi, dans le style des chats », immersion) : il nous voit arriver. La souris tout près : il hoche la tête et nous salue,
  // « salut ! » écrit au-dessus de lui (le petit chat de l'épaule regarde aussi) ; le reste du temps, il travaille
  const pres = P ? Math.hypot(P.x - x, P.y - y) < r * 3.6 : false; if (pres) { o = Object.assign({}, o, { hoche: Math.sin(nw * 7) * 0.8 }); if (r > 8) mot(en() ? 'hi!' : 'salut !', x + r * 0.2, y - r * 2.1 + Math.sin(nw * 5) * r * 0.05, Math.max(11, r * 0.42), o.a ?? 1); }
  const a = o.a ?? 1, w = clamp01(r / 30) * 0.7 + 0.45, hy = y + (o.hoche || 0) * r * 0.1, by = y + r * 0.95, bw = r * 1.2, bh = r * 1.45, g = o.cote || -1, tp = o.tp || 0;
  // le bras qui ne tamponne pas, derrière le corps
  cerne(() => { ctx.beginPath(); ctx.moveTo(x - g * bw * 0.8, by + r * 0.35); ctx.quadraticCurveTo(x - g * bw * 1.25, by + bh * 0.55, x - g * bw * 0.7, by + bh * 0.85); }, w * 1.9, a, null);
  // le buste : des épaules rondes, le col, une petite montagne sur la poitrine
  cerne(() => { ctx.beginPath(); ctx.moveTo(x - bw, by + bh); ctx.quadraticCurveTo(x - bw * 1.08, by + r * 0.1, x - r * 0.3, by); ctx.lineTo(x + r * 0.3, by); ctx.quadraticCurveTo(x + bw * 1.08, by + r * 0.1, x + bw, by + bh); ctx.closePath(); }, w, a);
  ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.7; ctx.beginPath(); ctx.moveTo(x - r * 0.32, by + r * 0.02); ctx.quadraticCurveTo(x, by + r * 0.32, x + r * 0.32, by + r * 0.02); ctx.stroke();
  const mx = x + r * 0.45, my = by + bh * 0.45; ctx.beginPath(); ctx.moveTo(mx - r * 0.28, my + r * 0.12); ctx.lineTo(mx - r * 0.1, my - r * 0.1); ctx.lineTo(mx, my); ctx.lineTo(mx + r * 0.08, my - r * 0.06); ctx.lineTo(mx + r * 0.26, my + r * 0.12); ctx.stroke();
  // (vague 25 de l'audit : « toi, dans le style des chats ») : du volume à la plume, comme les chats-robots : des hachures sur l'épaule dans l'ombre
  if (r > 12) { ctx.save(); ctx.beginPath(); ctx.moveTo(x - bw, by + bh); ctx.quadraticCurveTo(x - bw * 1.08, by + r * 0.1, x - r * 0.3, by); ctx.lineTo(x + r * 0.3, by); ctx.quadraticCurveTo(x + bw * 1.08, by + r * 0.1, x + bw, by + bh); ctx.closePath(); ctx.clip();
    ctx.globalAlpha = a * 0.42; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.7, G.lw * w * 0.3); ctx.beginPath(); const sd = g > 0 ? -1 : 1;
    for (let i = 0; i < 5; i++) { const u = x + sd * bw * (0.55 + i * 0.12); ctx.moveTo(u, by + r * 0.2); ctx.lineTo(u + sd * r * 0.25, by + bh); } ctx.stroke(); ctx.restore(); }
  // le cou, la tête : un visage long ; les cheveux en épis par-dessus
  cerne(() => { ctx.beginPath(); ctx.rect(x - r * 0.22, by - r * 0.35, r * 0.44, r * 0.45); }, w * 0.8, a);
  // (vague 8, l'audit : « ton dessin dans l'espace est raide ») : comme le logo (Mathieu, 29/09 : « je fais peur ») : des oreilles,
  // des épis bien nets, des sourcils ronds, un grand sourire
  [-1, 1].forEach(sd => cerne(() => { ctx.beginPath(); ctx.ellipse(x + sd * r * 0.68, hy + r * 0.12, r * 0.14, r * 0.2, 0, 0, TAU); }, w * 0.8, a));
  cerne(() => { ctx.beginPath(); ctx.ellipse(x, hy, r * 0.7, r * 0.98, 0, 0, TAU); }, w, a);
  cerne(() => { ctx.beginPath(); const n = 9; for (let i = 0; i <= n; i++) { const t = Math.PI + 0.25 + i / n * (Math.PI - 0.5), R = i % 2 ? 1.24 + 0.06 * Math.sin(i * 3.7) + 0.05 * Math.sin(nw * 2.3 + i * 1.7) : 0.96, j = i % 2 ? 0.12 * Math.sin(i * 2.1) + 0.06 * Math.sin(nw * 1.7 + i) : 0; ctx.lineTo(x + Math.cos(t + j) * r * 0.72 * R, hy - r * 0.18 + Math.sin(t + j) * r * 0.95 * R); }
    for (let i = 8; i >= 0; i--) { const t = Math.PI + 0.25 + i / 8 * (Math.PI - 0.5); ctx.lineTo(x + Math.cos(t) * r * 0.7, hy - r * 0.05 + Math.sin(t) * r * 0.72); } ctx.closePath(); }, w, a);
  // les yeux : deux grands ovales noirs, deux reflets (ils clignent) ; (vague 33) ils suivent la souris
  const cl = Math.sin(nw * 1.1 + 1) > 0.985 ? 0.12 : 1, vx = r * 0.07 * regard[0], vy = r * 0.05 * regard[1];
  [-1, 1].forEach(s => { const ex = x + s * r * 0.28 + vx, ey = hy + r * 0.08 + vy; ctx.globalAlpha = a; ctx.fillStyle = ENC; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.12, r * 0.17 * cl, 0, 0, TAU); ctx.fill();
    if (cl > 0.5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - r * 0.04, ey - r * 0.06, r * 0.045, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(ex + r * 0.04, ey + r * 0.06, r * 0.022, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.7; ctx.beginPath(); ctx.arc(ex, ey - r * 0.12, r * 0.15, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); });
  // la moustache en guidon (les pointes relevées), le sourire dessous
  ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.95; ctx.beginPath(); [-1, 1].forEach(s => { ctx.moveTo(x, hy + r * 0.42); ctx.quadraticCurveTo(x + s * r * 0.2, hy + r * 0.56, x + s * r * 0.38, hy + r * 0.42); ctx.quadraticCurveTo(x + s * r * 0.46, hy + r * 0.34, x + s * r * 0.4, hy + r * 0.28); }); ctx.stroke();
  ctx.lineWidth = G.lw * w * 0.6; ctx.fillStyle = ENC; ctx.beginPath(); ctx.moveTo(x - r * 0.24, hy + r * 0.6); ctx.quadraticCurveTo(x, hy + r * 0.66, x + r * 0.24, hy + r * 0.6); ctx.quadraticCurveTo(x + r * 0.16, hy + r * 0.86, x, hy + r * 0.86); ctx.quadraticCurveTo(x - r * 0.16, hy + r * 0.86, x - r * 0.24, hy + r * 0.6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, hy + r * 0.66, r * 0.14, r * 0.035, 0, 0, TAU); ctx.fill();
  // le bras qui tamponne : de l'épaule à la main, le tampon (sa poignée ronde, son bloc) ; au repos, levé ; abattu : sur la cible
  const ep = [x + g * bw * 0.8, by + r * 0.35], repos = [x + g * bw * 1.35, by - r * 0.7], ci = o.cible || repos, st = r * 0.55, main = [lerp(repos[0], ci[0], tp), lerp(repos[1], ci[1] - st * 1.1, tp)];
  cerne(() => { ctx.beginPath(); ctx.moveTo(...ep); ctx.quadraticCurveTo(lerp(ep[0], main[0], 0.5) + g * r * 0.3, lerp(ep[1], main[1], 0.5) + r * 0.3, main[0], main[1]); }, w * 1.9, a, null);
  cerne(() => { ctx.beginPath(); ctx.rect(main[0] - st * 0.55, main[1] + st * 0.35, st * 1.1, st * 0.45); }, w, a); cerne(() => { ctx.beginPath(); ctx.rect(main[0] - st * 0.12, main[1] - st * 0.1, st * 0.24, st * 0.48); }, w * 0.8, a);
  cerne(() => { ctx.beginPath(); ctx.arc(main[0], main[1] - st * 0.2, st * 0.22, 0, TAU); }, w, a);
  if (r > 8) epaule(x - g * r * 1.05, by + r * 0.08, r * 0.5, nw, a, regard, tp > 0.9 ? 0 : Math.max(0, Math.sin(Math.PI * c01((tp - 0.3) / 0.5))) * (tp > 0.3 ? 1 : 0));
}

// (28/09, 20:40, Mathieu : « revois toutes tes animations, c'est vraiment super basique » : tout passe en 3D, sur toute la largeur de l'écran du ciel)
// une caméra : lacet, tangage (négatif : on regarde d'en haut), échelle ; → (x, y, z) : [x, y à l'écran, profondeur, grossissement]
function cam(lac, tan, k = G.s, ox = 0, oy = 0, d = 3.6) {
  const c = Math.cos(lac), s = Math.sin(lac), c2 = Math.cos(tan), s2 = Math.sin(tan);
  return (x, y, z) => { const x1 = x * c + z * s, z1 = -x * s + z * c, y2 = y * c2 - z1 * s2, z2 = y * s2 + z1 * c2, f = d / (d - z2); return [G.cx + ox * G.s + x1 * k * f, G.cy + oy * G.s + y2 * k * f, z2, f]; };
}
const prof = (z, a = 1) => a * (0.3 + 0.7 * c01((z + 1.6) / 2.6));   // (au fond : plus pâle)
// l'échelle d'une scène : la hauteur de l'écran du ciel d'abord ; puis la demi-largeur dont elle dispose (au moins « besoin », au plus « max »)
function large(besoin, max) { const k = Math.min(G.s, G.sw / besoin); return [k, Math.max(besoin * 0.9, Math.min(max, G.sw / k * 0.92))]; }
// une silhouette posée sur ses pieds (p : à l'écran), de taille kk (en demi-écrans)
function gens(p, kk, o) { perso((p[0] - G.cx) / G.s, (p[1] - G.cy) / G.s - 0.34 * kk, kk, o); }
function anneau(V, r, y, n = 48, cx = 0, cz = 0) { const L = []; for (let i = 0; i <= n; i++) { const t = i / n * TAU; L.push(V(cx + Math.cos(t) * r, y, cz + Math.sin(t) * r)); } return L; }
// un tracé 3D, segment par segment, plus pâle au fond
function trait3(L, w, a) { for (let i = 0; i < L.length - 1; i++) trait([L[i], L[i + 1]], false, w, prof((L[i][2] + L[i + 1][2]) / 2, a)); }
function roue(x, y, r, t, w = 0.9, a = 1) { style(w, a); ctx.beginPath(); for (let k = 0; k < 16; k++) { const u = t + k / 16 * TAU, rr = r * (k % 2 ? 0.74 : 1); ctx.lineTo(x + Math.cos(u) * rr, y + Math.sin(u) * rr); } ctx.closePath(); ctx.globalAlpha = 1; ctx.fillStyle = NUIT; ctx.fill(); style(w, a); ctx.stroke(); rond(x, y, r * 0.25, w * 0.8, a); }
// une boîte 3D (fil de fer ; le dessus peint de la nuit)
function boite3(V, x0, x1, y0, y1, z0, z1, w = 0.9, a = 1) {
  const C = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [V(x, y0, z), V(x, y1, z)]);
  trait(C.map(c => c[1]), true, w, a, true); C.forEach(c => trait(c, false, w, a)); trait(C.map(c => c[0]), true, w, a, true); return C; }

// (vague 14) les scènes étalées sur tout le ciel passent sous la barre des chapitres et derrière la planète des chats
function sousLaBarre() { ctx.save(); ctx.beginPath(); ctx.rect(0, G.haut - 4, G.droite + 40, 1e4);
  const Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat; if (Pc) { ctx.moveTo(Pc.x + Pc.r * 1.25, Pc.y); ctx.arc(Pc.x, Pc.y, Pc.r * 1.25, 0, TAU, true); }
  ctx.clip('evenodd'); }

// les éléments d'interface qui flottent autour de l'écran (scène « Front & interfaces »)
const UI = Array.from({ length: 40 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (0.5 + bruit(i * 7.3) * 0.5), y: bruit(i * 3.1) * 2 - 1, z: bruit(i * 5.7), t: i % 6, ph: bruit(i * 9.1) * TAU }));
function uiNuee(now, e) {
  if (e <= 0) return; const HW = (G.droite - G.gauche) / 2, top = G.haut + 10, bas = G.caps, bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  UI.map(q => { const z = (q.z + now * 0.045) % 1, f = 0.35 + z * z * 1.6; return { q, z, f, x: G.cx + q.x * HW * (0.62 + 0.4 * z), y: (top + bas) / 2 + q.y * (bas - top) / 2 * (0.6 + 0.45 * z) }; })
    .sort((A, B) => A.z - B.z).forEach(({ q, z, f, x, y }) => {
      const s = G.s * 0.1 * f, al = e * Math.min(1, z * 4, (1 - z) * 5); if (al <= 0.02 || y - s < top || y + s > bas) return;
      if (bd && x + s * 2 > bd.x && x - s * 2 < bd.x + bd.w && y + s > bd.y && y - s < bd.y + bd.h) return;
      if (Pc && Math.hypot(x - Pc.x, y - Pc.y) < Pc.r * 1.3 + s * 2) return;
      const t = now * 1.1 + q.ph, on = Math.sin(t) > 0, g = sm(c01(Math.sin(t) * 3 + 0.5));
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(now * 0.4 + q.ph) * 0.25);
      if (q.t === 0) { cerne(() => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-s * 1.2, -s * 0.55, s * 2.4, s * 1.1, s * 0.55) : ctx.rect(-s * 1.2, -s * 0.55, s * 2.4, s * 1.1); }, 0.7, al, on ? '#ffe9a8' : PAP);
        cerne(() => { ctx.beginPath(); ctx.arc(lerp(-s * 0.62, s * 0.62, g), 0, s * 0.4, 0, TAU); }, 0.7, al); }
      else if (q.t === 1) { cerne(() => { ctx.beginPath(); ctx.moveTo(-s * 1.4, 0); ctx.lineTo(s * 1.4, 0); }, 0.9, al, null); cerne(() => { ctx.beginPath(); ctx.arc(Math.sin(t * 0.8) * s * 1.2, 0, s * 0.38, 0, TAU); }, 0.7, al); }
      else if (q.t === 2) { cerne(() => { ctx.beginPath(); ctx.rect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2); }, 0.7, al); if (on) { ctx.globalAlpha = al; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(1.2, s * 0.18); ctx.beginPath(); ctx.moveTo(-s * 0.35, 0); ctx.lineTo(-s * 0.08, s * 0.28); ctx.lineTo(s * 0.4, -s * 0.3); ctx.stroke(); } }
      else if (q.t === 3) { const p = 1 - 0.12 * Math.max(0, Math.sin(t * 2)) ** 8; ctx.scale(p, p); cerne(() => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-s * 1.4, -s * 0.5, s * 2.8, s, s * 0.3) : ctx.rect(-s * 1.4, -s * 0.5, s * 2.8, s); }, 0.7, al);
        ctx.globalAlpha = al; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(1, s * 0.12); ctx.beginPath(); ctx.moveTo(-s * 0.7, 0); ctx.lineTo(s * 0.7, 0); ctx.stroke(); }
      else if (q.t === 4) { const n = 1 + Math.floor(((now * 0.7 + q.ph) % 5)); for (let i = 0; i < 5; i++) cerne(() => { ctx.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? s * 0.2 : s * 0.46; ctx.lineTo((i - 2) * s * 1.05 + Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); }, 0.5, al, i < n ? '#ffe9a8' : PAP); }
      else { cerne(() => { ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); }, 0.7, al); ctx.globalAlpha = al; ctx.fillStyle = ENC; ctx.beginPath(); ctx.arc(0, -s * 0.12, s * 0.22, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, s * 0.42, s * 0.38, s * 0.22, 0, Math.PI, TAU); ctx.fill(); }
      ctx.restore(); });
}

/* ——— les scènes ——— */
const S = {};

// 1 dev = 1 équipe : lui, seul sous un projecteur ; pop, pop, pop : des dizaines de chats-robots jaillissent de lui et remplissent des gradins
// jusqu'au fond ; mains en l'air, une ola passe ; puis tout le monde est aspiré en tourbillon et rentre en lui : ×10 ; et ça recommence
// (vague 14 de l'audit : « la foule reste une bande au milieu ») : les gradins font maintenant le tour de lui, en arène, sur toute la largeur
// du ciel : quatre rangs en ellipse, les plus loin plus hauts ; l'arène tourne lentement, la ola en fait le tour ; plus d'une centaine d'agents
S.equipe = (() => {
  let F = null, cle = '';
  // les places : quatre rangs d'ellipses autour de lui (calculés à la taille de l'écran)
  function places() {
    const pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat, k = [G.cx, G.haut, G.caps, G.droite].map(Math.round).join();
    if (F && k === cle) return F; cle = k; F = [];
    const HW = (G.droite - G.gauche) / 2 * 0.96, bot = Math.max(7, Math.min(15, G.s * 0.055)), top = G.haut + bot * 3.4, bas = G.caps - bot * 0.3;
    // (un bol : chaque rang est plus large et plus haut que le précédent ; le devant de tous les rangs longe le bas du ciel, le fond du dernier touche le haut)
    const RX = [0.26, 0.47, 0.7, 0.95].map(f => HW * f), ry3 = Math.max(12, (bas - top) / 2), RY = [0, 1, 2, 3].map(i => ry3 * (1 + 0.45 * i) / 2.35), cyA = bas - RY[0];
    RX.forEach((rx, i) => { const ry = RY[i], n = Math.min(40, Math.floor(Math.PI * (rx + ry) / (bot * 2.1)));
      for (let j = 0; j < n; j++) F.push({ i, j, n, th: (j + (i % 2) * 0.5) / n * TAU, rx, ry, dy: (bas - ry) - cyA, ph: bruit(F.length * 3.1) * TAU, id: F.length }); });
    F.cyA = cyA; F.bot = bot; F.pc = pc; F.N = F.length;
    F.forEach(f => { f.o = (f.i + f.j / f.n) / 4; }); return F;
  }
  return {
    cles: () => [[0, 0.1], [0, -0.35], [-0.9, -0.3], [0.9, -0.3], [-0.6, 0.35], [0.6, 0.35]],
    dessin(a, now) {
      const P = places(), c = Math.min(a + 0.3, 9.2), N = P.N, rot = now * 0.06, pied = [G.cx, P.cyA], pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
      const rr0 = Math.max(18, P.bot * 2.6), podH = P.bot * 1.4, coeur = [pied[0], pied[1] - podH - rr0 * 1.9];
      let rentres = 0; const derriere = [], devant = [];
      const Sm = souris(), tW = window.Chats.K.Wd.t, PO = Sm && tW - Sm.moved < 1.5 && c > 1.5 && c < 7.6 ? { u: ((Math.atan2((Sm.y - pied[1]) / Math.max(20, P[P.length - 1].ry), (Sm.x - pied[0]) / Math.max(20, P[P.length - 1].rx)) / TAU) % 1 + 1) % 1, f: c01((1.5 - (tW - Sm.moved)) / 0.5) } : null;
      // les gradins : chaque rang, son ellipse au sol (sa moitié du fond, puis sa moitié de devant, par-dessus lui)
      const al0 = c01((c - 0.6) / 0.8);
      [0, 1, 2, 3].forEach(i => { const f = P.find(q => q.i === i); if (!f) return; const L0 = [], L1 = [];
        for (let u = 0; u <= 64; u++) { const t = u / 64 * TAU, q = [pied[0] + Math.cos(t) * f.rx * 1.04, pied[1] + Math.sin(t) * f.ry * 1.04 + f.dy + P.bot * 0.2]; (Math.sin(t) < 0 ? L0 : L1).push(q); }
        derriere.push({ z: -10 - i, f: () => trait(L0, false, 0.5, 0.25 * al0) }); devant.push({ z: 10 + i, f: () => trait(L1, false, 0.5, 0.3 * al0) }); });
      P.forEach(f => {
        const t1 = 0.7 + f.o * 1.9, t2 = 6.1 + (1 - f.o) * 1.5; if (c < t1) return;
        const th = f.th + rot, sn = Math.sin(th), x = pied[0] + Math.cos(th) * f.rx, y = pied[1] + sn * f.ry + f.dy, prof2 = 0.72 + 0.28 * (sn + 1) / 2 + f.i * 0.05, r = P.bot * prof2;
        // (ils ne passent ni sur la planète des chats ni hors du ciel)
        if (pc && Math.hypot(x - pc.x, y - r - pc.y) < pc.r * 1.3 + r) return;
        const L = sn < 0 ? derriere : devant, z = sn * (1 + f.i);
        if (c < t1 + 0.55) { const e = sm((c - t1) / 0.55), pop = 1 + 0.35 * Math.sin(Math.PI * e);
          devant.push({ z: 99, f: () => { const q = [lerp(coeur[0], x, e), lerp(coeur[1], y, e) - Math.sin(Math.PI * e) * G.s * 0.45]; chabot(q[0], q[1] - r * 1.75, lerp(r * 0.3, r, e) * pop, { now, ph: f.id, bras: [1.4, 1.4], casque: r > 9 });
            if (e > 0.8) eclat(q[0], q[1] - r * 1.5, r * 0.7, (e - 0.8) / 0.2, 6, f.id); } });
          return; }
        if (c >= t2) { const e = sm((c - t2) / 0.7); if (e >= 1) { rentres++; return; }
          const sg = Math.cos(th) < 0 ? 1 : -1, dx = x - coeur[0], dy = y - coeur[1], at = u => { const an = u * 4.4 * sg, rr = 1 - u; return [coeur[0] + (dx * Math.cos(an) - dy * Math.sin(an)) * rr, coeur[1] + (dx * Math.sin(an) + dy * Math.cos(an)) * rr]; };
          devant.push({ z: 98, f: () => { const Lq = [0.18, 0.12, 0.06, 0].map(d => at(Math.max(0, e - d))); trait(Lq, false, 0.6, 0.5); chabot(Lq[3][0], Lq[3][1] - r * 1.75, r * (1 - e * 0.7), { now, ph: f.id, bras: [1.5, 1.5], casque: r > 9 }); } });
          return; }
        // à sa place : les mains s'agitent ; la ola fait le tour de l'arène, deux fois (tous les rangs ensemble)
        const u = ((th / TAU) % 1 + 1) % 1, v = ((c - 3.3) / 1.3) % 1, dd = Math.min(Math.abs(u - v), 1 - Math.abs(u - v)), ola0 = c > 3.3 && c < 5.9 ? Math.exp(-((dd * 7) ** 2)) : 0, ag = c01((c - t1 - 0.55) / 0.3);
        // (vague 54 de l'audit, « l'équipe », immersion) : c'est nous qui menons la ola. La souris fait le tour de l'arène : la vague de bras levés la suit,
        // tous les rangs ensemble, là où elle pointe
        const dp = PO ? Math.min(Math.abs(u - PO.u), 1 - Math.abs(u - PO.u)) : 1, ola = Math.max(ola0, PO ? Math.exp(-((dp * 7) ** 2)) * PO.f * ag * 1.2 : 0);
        const b = [0.6 + Math.sin(now * 7 + f.ph) * 0.45 * ag + ola * 1.1, 0.6 + Math.sin(now * 7.6 + f.ph + 1.3) * 0.45 * ag + ola * 1.1];
        L.push({ z, f: () => chabot(x, y - r * 1.75 - (ola * 0.9 + Math.abs(Math.sin(now * 5 + f.ph)) * 0.12 * ag) * r, r, { bras: b, now, ph: f.id, casque: r > 9, lac: Math.cos(th) * -0.6 + Math.sin(now * 0.5 + f.ph) * 0.3, cligne: Math.sin(now * 1.3 + f.ph * 3) > 0.985 }) });
      });
      derriere.sort((p, q) => p.z - q.z).forEach(d => d.f()); devant.sort((p, q) => p.z - q.z); devant.filter(d => d.z < 90).forEach(d => d.f());
      // lui, debout sur un petit podium de papier au milieu de l'arène (au-dessus de tous) : le projecteur (seul au début, seul à la fin) ;
      // il dirige pendant que tout le monde s'agite ; il grossit de tous ceux qui rentrent
      const spot = Math.max(1 - c01((c - 0.7) / 0.5), c01((c - 7.9) / 0.4)), pw = rr0 * 1.5, pt = pied[1] - podH;
      if (spot > 0) { const h = [pied[0], G.haut + 4]; style(0.6, spot * 0.5); ctx.beginPath(); ctx.moveTo(h[0] - G.s * 0.04, h[1]); ctx.lineTo(pied[0] - pw * 1.6, pied[1]); ctx.moveTo(h[0] + G.s * 0.04, h[1]); ctx.lineTo(pied[0] + pw * 1.6, pied[1]); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(pied[0], pied[1], pw * 1.6, pw * 0.3, 0, 0, TAU); ctx.stroke(); }
      cerne(() => { ctx.beginPath(); ctx.moveTo(pied[0] - pw, pt); ctx.lineTo(pied[0] - pw, pied[1]); ctx.ellipse(pied[0], pied[1], pw, pw * 0.26, 0, Math.PI, 0, true); ctx.lineTo(pied[0] + pw, pt); ctx.closePath(); }, 0.9, 1);
      cerne(() => { ctx.beginPath(); ctx.ellipse(pied[0], pt, pw, pw * 0.26, 0, 0, TAU); }, 0.9, 1);
      const dirige = c > 2.6 && c < 6.2;
      { const rr = rr0 * (1 + 0.3 * rentres / N) * (c > 7.9 ? 1 + 0.06 * Math.sin(Math.PI * c01((c - 7.9) / 0.5)) : 1);
        lui(pied[0], pt - rr * 2.4, rr, { now, hoche: dirige ? Math.sin(now * 6) : 0, tp: dirige ? 0.25 + 0.25 * Math.sin(now * 3.2) : c > 8.1 ? 0 : 0.1 }); }
      devant.filter(d => d.z >= 90).forEach(d => d.f());
      if (c > 0.7 && c < 2.6) { const j = Math.floor((c - 0.7) / 0.45), u = ((c - 0.7) % 0.45) / 0.45; mot('pop !', coeur[0] + (j % 2 ? -1 : 1) * G.s * (0.4 + 0.2 * bruit(j)), coeur[1] - G.s * (0.25 + 0.2 * bruit(j * 3)) - u * 12, Math.max(13, G.s * 0.1), 1 - u); }
      if (c > 7.9) { const u = sm((c - 7.9) / 0.5); eclat(coeur[0], coeur[1], G.s * 0.35, (c - 7.9) / 0.7, 12, 0.2); mot('×10', pied[0] + G.s * 0.55, coeur[1] - G.s * 0.2, Math.max(22, G.s * 0.26) * (0.6 + 0.4 * u), u); }
    }
  };
})();

// plusieurs terminaux, plusieurs agents : une grille de terminaux par dizaines, vue de biais, qui défile sans fin ; chacun tape, un agent par fenêtre ;
// de temps en temps, l'un d'eux se soulève vers nous (on voit ce qu'il fait), coche, et reprend sa place
S.terminaux = (() => {
  const TERM_FR = [['$ git worktree add ../auth', '› agent : écrit le module', '  + auth/session.ts', '✓ prêt pour la relecture'],
    ['$ git worktree add ../tests', '› agent : écrit les tests', '$ npm test', '✓ tous les tests passent'],
    ['$ git worktree add ../revue', '› agent : relit le diff', '  2 remarques, corrigées', '✓ prêt à fusionner']];
  const TERM_EN = [['$ git worktree add ../auth', '› agent: writing the module', '  + auth/session.ts', '✓ ready for review'],
    ['$ git worktree add ../tests', '› agent: writing the tests', '$ npm test', '✓ all tests pass'],
    ['$ git worktree add ../review', '› agent: reviewing the diff', '  2 notes, fixed', '✓ ready to merge']];
  const COL = 9, W0 = 0.9, H0 = 0.56, GX = 1.02, GY = 0.7;
  return {
    cles: () => [[-0.45, -0.28], [0.45, -0.28], [0.45, 0.28], [-0.45, 0.28]],
    dessin(a, now) {
      const k = G.sw / 1.75, lac = -0.62, tan = 0.5, off = a * 0.32, i0 = Math.floor(off / GY), fr = off / GY - i0, cr = a * 4.5;
      const Tl = 3.4, nl = Math.floor(a / Tl), ul = (a % Tl) / Tl, cible = (Math.floor(nl * Tl * 0.32 / GY) + 1) * COL + 3 + (nl * 2) % 3, lev = Math.sin(Math.PI * c01((ul - 0.1) / 0.8)) * c01(a - 1);
      const L = [];
      for (let r = -11; r <= 10; r++) for (let c = 0; c < COL; c++) {
        const x = (c - (COL - 1) / 2) * GX, y = (r - fr) * GY, d = Math.hypot(c - (COL - 1) / 2, r - fr), id = (r + i0) * COL + c;
        if (d > cr) continue;   // (elles naissent du centre vers les bords)
        const lv = id === cible ? lev : 0, zl = lv * 1.1;
        const Q = [[x - W0 / 2, y - H0 / 2], [x + W0 / 2, y - H0 / 2], [x + W0 / 2, y + H0 / 2], [x - W0 / 2, y + H0 / 2]].map(([u, v]) => p3(u, v, zl, lac, tan, k));
        const z = (Q[0][2] + Q[2][2]) / 2, m = [(Q[0][0] + Q[2][0]) / 2, (Q[0][1] + Q[2][1]) / 2];
        if (m[0] < G.gauche - 80 || m[0] > G.droite + 80 || m[1] < -80 || m[1] > G.bas + 60) continue;
        const Qb = [[x - W0 / 2, y - H0 / 2], [x + W0 / 2, y - H0 / 2], [x + W0 / 2, y + H0 / 2], [x - W0 / 2, y + H0 / 2]].map(([u, v]) => p3(u, v, zl - 0.09, lac, tan, k));
        L.push({ x, y, Q, Qb, z: z + lv * 9, id, lv, pop: c01((cr - d) / 0.8), B: lv > 0.01 ? [[x - W0 / 2, y - H0 / 2], [x + W0 / 2, y - H0 / 2], [x + W0 / 2, y + H0 / 2], [x - W0 / 2, y + H0 / 2]].map(([u, v]) => p3(u, v, 0, lac, tan, k)) : null });
      }
      L.sort((a, b) => a.z - b.z);
      // (vague 13, l'audit : « le mur passe sur la barre des chapitres et sur la planète ») : il s'arrête sous la barre, et fait le tour de la planète des chats
      ctx.save(); ctx.beginPath(); ctx.rect(0, G.haut - 4, G.droite + 40, 1e4);
      { const Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat; if (Pc) { ctx.moveTo(Pc.x + Pc.r * 1.25, Pc.y); ctx.arc(Pc.x, Pc.y, Pc.r * 1.25, 0, TAU, true); } }
      ctx.clip('evenodd');
      // (vague 29, l'audit : « les terminaux ») : derrière le mur, le graphe Git : entre deux rangées court la branche principale, ses commits
      // défilent ; chaque terminal a sa branche (son worktree) qui en part et y revient quand son agent a fini : un point file et fusionne
      const XR = (COL / 2 + 0.3) * GX, frac = v => v - Math.floor(v);
      for (let r = -11; r <= 10; r++) { const yr = (r - fr) * GY + GY / 2, A = p3(-XR, yr, -0.12, lac, tan, k), B = p3(XR, yr, -0.12, lac, tan, k), al = 0.55 * c01(cr - Math.abs(r - fr));
        if (al <= 0.01) continue; trait([A, B], false, 0.9, al);
        for (let m = 0; m < 5; m++) { const u = frac(now * 0.05 + m / 5 + bruit(r + i0) * 0.3), q = p3(lerp(-XR, XR, u), yr, -0.12, lac, tan, k); brille(q[0], q[1], 2.6, al * 1.6, m % 2 === 0, now, r * 5 + m); rond(q[0], q[1], 3, 0.9, Math.min(1, al * 1.6), 'nuit'); } }
      L.forEach(({ x, y, id, pop, lv }) => { if (lv > 0.01 || pop < 0.5) return; const cyc = (now * 0.5 + bruit(id) * 3) % 3, yr = y + GY / 2;
        const P = [p3(x - W0 * 0.3, yr, -0.12, lac, tan, k), p3(x - W0 * 0.3, y, -0.12, lac, tan, k), p3(x + W0 * 0.3, y, -0.12, lac, tan, k), p3(x + W0 * 0.3, yr, -0.12, lac, tan, k)];
        trait(P, false, 0.5, 0.35 * pop);
        if (cyc > 2.4) { const u = (cyc - 2.4) / 0.6, sg = u < 0.5 ? [P[2], P[3], u * 2] : [P[3], P[3], 1], q = [lerp(sg[0][0], sg[1][0], sg[2]), lerp(sg[0][1], sg[1][1], sg[2])]; brille(q[0], q[1], 2.4, pop, true, now, id); } });
      L.forEach(({ Q, Qb, z, id, pop, lv, B }) => {
        const al = lv > 0.01 ? 1 : (0.35 + 0.65 * c01((z + 2.2) / 3.2)) * pop, at = (u, v) => [lerp(lerp(Q[0][0], Q[1][0], u), lerp(Q[3][0], Q[2][0], u), v), lerp(lerp(Q[0][1], Q[1][1], u), lerp(Q[3][1], Q[2][1], u), v)];
        if (B) { trait(B, true, 0.5, 0.35); B.forEach((b, j) => trait([b, Q[j]], false, 0.5, 0.5 * lv)); }
        // (vague 4 : « des rectangles plats ») : chaque terminal est une dalle épaisse : sa face arrière, ses quatre arêtes, puis la vitre
        trait(Qb, true, 0.6, al * 0.7, true); Qb.forEach((b, j) => trait([b, Q[j]], false, 0.6, al * 0.7));
        trait(Q, true, lv > 0.01 ? 1.2 : 0.8, al, true); trait([at(0, 0.18), at(1, 0.18)], false, 0.5, al * 0.8);
        // son agent : un petit chat-robot dans le coin qui tape ; celui du terminal soulevé sort la tête par-dessus et tape pour de bon
        const lw = Math.hypot(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]);
        if (lv > 0.3) { const hq = at(0.78, 0), r = lw * 0.075; chabot(hq[0], hq[1] - r * 0.5, r, { now, ph: id, lac: -0.4, casque: false, travaille: true, bras: [0.3 + Math.sin(now * 14) * 0.5, 0.3 - Math.sin(now * 14) * 0.5], a: lv }); }
        else if (al > 0.5 && lw > 50 && id % 2 === 0) { const hq = at(0.84, 0.6), r = lw * 0.08; chabot(hq[0], hq[1], r, { now, ph: id, casque: false, lac: -0.3, travaille: true, a: al, bras: [0.2 + Math.sin(now * 11 + id) * 0.4, 0.2 - Math.sin(now * 11 + id) * 0.4] }); }
        [0.06, 0.11, 0.16].forEach(u => { const p = at(u, 0.09); rond(p[0], p[1], 1.2, 0.5, al, true); });
        // les lignes qui s'écrivent : une invite, puis la commande ; le curseur clignote ; parfois l'agent coche sa tâche
        const cyc = lv > 0.01 ? c01(ul * 1.3) * 3 : (now * 0.5 + bruit(id) * 3) % 3;
        // (vague 53 de l'audit, « les terminaux », finition) : le terminal qui se soulève montre ce qu'il fait pour de vrai, en toutes lettres :
        // son worktree, la tâche de son agent (l'un écrit, un autre teste, un troisième relit, comme dans la légende), le résultat
        if (lv > 0.3) { const T = (en() ? TERM_EN : TERM_FR)[nl % 3], d0 = [Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]], d1 = [Q[3][0] - Q[0][0], Q[3][1] - Q[0][1]];
          ctx.save(); ctx.transform(d0[0] / 100, d0[1] / 100, d1[0] / 62, d1[1] / 62, Q[0][0], Q[0][1]); ctx.globalAlpha = Math.min(1, lv * 1.2); ctx.fillStyle = `rgb(${BL})`; ctx.font = '600 5.3px ui-monospace,Menlo,Consolas,monospace'; ctx.textBaseline = 'middle';
          let reste = cyc / 3 * T.join('').length * 1.15;
          T.forEach((l, j) => { if (reste <= 0) return; const n = Math.min(l.length, Math.floor(reste)); reste -= l.length; const y = 17 + j * 9.5, txt = l.slice(0, n);
            ctx.globalAlpha = Math.min(1, lv * 1.2) * (l[0] === '✓' ? 1 : 0.88); ctx.fillText(txt, 6, y); if (n < l.length && Math.sin(now * 9) > 0) ctx.fillRect(6 + ctx.measureText(txt).width + 1, y - 2.7, 2.9, 5.4); });
          ctx.restore(); }
        else for (let l = 0; l < 4; l++) { const v = 0.34 + l * 0.17, lg = 0.25 + 0.55 * bruit(id * 7 + l), p = c01(cyc * 1.6 - l * 0.8), a0 = at(0.07, v), a1 = at(0.12, v - 0.045), a2 = at(0.07, v - 0.09);
          if (p <= 0) break; trait([a2, a1, a0], false, 0.45, al * 0.9); const e = at(0.17 + lg * p, v - 0.045); trait([at(0.17, v - 0.045), e], false, 0.5, al * 0.85);
          if (p < 1 && Math.sin(now * 9) > 0) brille(e[0] + 2, e[1], 1.5, al, false, now, l); }
        if (cyc > 2.4) { const p = at(0.86, 0.72); coche(p[0], p[1], (lv > 0.01 ? 9 : 5) * pop, (cyc - 2.4) / 0.3, 0.7); }
        if (lv > 0.5) brille(Q[1][0], Q[1][1], 3, lv, true, now, 1);
      });
      ctx.restore();
    }
  };
})();

// des agents qui délèguent à des sous-agents : un arbre en 3D qui tourne ; l'agent principal au sommet, ses agents, leurs sous-agents, jusqu'au sol ;
// les consignes descendent, chacun travaille, les résultats remontent ; l'agent principal recompose, coche : c'est livré
S.agents = (() => {
  const N = [{ t: 0, r: 0, y: -0.82, n: 0, p: -1 }];
  for (let i = 0; i < 4; i++) { const t = i / 4 * TAU + 0.4; N.push({ t, r: 0.45, y: -0.3, n: 1, p: 0 }); const a1 = N.length - 1;
    for (let j = -1; j <= 1; j++) { const t2 = t + j * 0.45; N.push({ t: t2, r: 0.92, y: 0.16, n: 2, p: a1 }); const a2 = N.length - 1;
      for (let l = -1; l <= 1; l++) N.push({ t: t2 + l * 0.15, r: 1.35, y: 0.62, n: 3, p: a2 }); } }
  N.forEach((q, i) => q.i = i);
  return {
    cles: () => [[0, -0.82], [-0.5, -0.3], [0.5, -0.3], [0, 0.62]],
    dessin(a, now) {
      const [k] = large(1.45, 2), V0 = cam(now * 0.22, -0.36, k * 0.8, 0, -0.26), Cy = 6, c = a > 2.3 ? (a - 2.3) % Cy : -1;
      // (vague 14 de l'audit : « l'arbre reste un petit bouquet au milieu ») : il s'étale sur toute la largeur du ciel, comme un lustre qui tourne
      const hx = Math.max(1, ((G.droite - G.gauche) / 2 * 0.84) / (1.35 * 0.85 * k * 0.8 * 1.2)), V = (x, y, z) => { const p = V0(x * 0.85, y * 0.62, z * 0.55); p[0] = G.cx + (p[0] - G.cx) * hx; p[1] = yA0 + (p[1] - yA0) * syA - dyA; return p; };
      sousLaBarre();
      // (vague 44, l'audit : « les agents », finition) : le bas du lustre et son anneau remontaient sur la ligne du chapitre : tout remonte d'autant
      let dyA = 0, syA = 1, yA0 = 0; { let b = -1e9; for (let i = 0; i < 24; i++) { const t = i / 24 * TAU; b = Math.max(b, V(Math.cos(t) * 1.45, 0.88, Math.sin(t) * 1.45)[1], V(Math.cos(t) * 1.35, 0.62, Math.sin(t) * 1.35)[1] + k * 0.1); }
        const lim = (G.caps || G.bas) - 6, top = V(0, -0.82, 0)[1] - k * 0.16; dyA = Math.max(0, Math.min(b - lim, top - (G.haut + 8)));
        if (b - dyA > lim) { yA0 = top; syA = Math.max(0.6, (lim + dyA - top) / (b - top)); } }   // (pas assez de place : le lustre se tasse en hauteur)
      const pos = N.map(q => V(Math.cos(q.t) * q.r, q.y, Math.sin(q.t) * q.r)), nait = q => sm((a - q.n * 0.55 - bruit(q.i) * 0.25) / 0.45);
      trait3(anneau(V, 1.45, 0.88), 0.5, 0.35); trait3(anneau(V, 0.5, 0.88, 24), 0.5, 0.25);
      N.forEach(q => { if (q.p < 0) return; const e = nait(q); if (e <= 0) return; const A = pos[q.p], B = pos[q.i], al = prof(B[2]);
        trait([A, [lerp(A[0], B[0], e), lerp(A[1], B[1], e)]], false, q.n === 3 ? 0.55 : 0.85, al * 0.85);
        if (c >= 0) { const d = c01((c - (q.n - 1) * 0.45) / 0.45), u = c01((c - 2.7 - (3 - q.n) * 0.45) / 0.45);
          // (vague 39 de l'audit : « agents, peu original ») : ce qui descend se lit : une fiche de tâche pliée glisse le long de la branche comme
          // sur une tyrolienne ; ce qui remonte, c'est le résultat : une pastille cochée qui tire derrière elle un petit fil
          const sz = k * (q.n === 3 ? 0.022 : 0.03) * B[3], ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
          if (d > 0 && d < 1) { const x = lerp(A[0], B[0], d), y = lerp(A[1], B[1], d) + sz * 0.9; ctx.save(); ctx.translate(x, y); ctx.rotate(ang * 0.3 + Math.sin(now * 8 + q.i) * 0.15);
            cerne(() => { ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.7); ctx.lineTo(sz * 0.6, -sz * 0.7); ctx.lineTo(sz, -sz * 0.3); ctx.lineTo(sz, sz * 0.7); ctx.lineTo(-sz, sz * 0.7); ctx.closePath(); }, 0.5, al);
            ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.3; ctx.beginPath(); ctx.moveTo(-sz * 0.6, -sz * 0.15); ctx.lineTo(sz * 0.5, -sz * 0.15); ctx.moveTo(-sz * 0.6, sz * 0.3); ctx.lineTo(sz * 0.2, sz * 0.3); ctx.stroke(); ctx.restore(); }
          if (u > 0 && u < 1) { const x = lerp(B[0], A[0], u), y = lerp(B[1], A[1], u), r = sz * 0.9; trait([[lerp(B[0], A[0], Math.max(0, u - 0.25)), lerp(B[1], A[1], Math.max(0, u - 0.25))], [x, y]], false, 0.5, al * 0.6);
            cerne(() => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }, 0.6, al); if (r > 3) coche(x, y, r * 0.55, 1, 0.5); brille(x, y, 2.2 * B[3], al * 0.6, true, now, q.i); } } });
      N.slice().sort((p, q) => pos[p.i][2] - pos[q.i][2]).forEach(q => { const e = nait(q); if (e <= 0) return; const [x, y, z, f] = pos[q.i], pop = e < 1 ? 1 + 0.35 * Math.sin(Math.PI * e) : 1, al = 1;
        if (q.n < 3) robot(x, y, k * [0.14, 0.09, 0.06][q.n] * f * pop * (q.n ? Math.min(1.4, hx * 0.55) : 1), al, Math.sin(now * 1.5 + q.i) > 0.97, { now, ph: q.i, lac: Math.sin(now * 0.6 + q.i * 1.7) * 0.7, travaille: c > 1.3 && c < 2.9 });
        else { const r = k * 0.028 * f * pop * Math.min(1.6, hx * 0.6); if (r > 5) { chabot(x, y, r * 1.25, { now, ph: q.i, a: al, casque: false, lac: Math.sin(now * 0.8 + q.i) * 0.6, travaille: c > 1.3 && c < 2.9 }); } else rond(x, y, r, 0.8, al, 'nuit'); if (c > 1.3 && c < 2.9) { style(0.6, al); ctx.beginPath(); ctx.arc(x, y, r * 1.9, now * 6 + q.i, now * 6 + q.i + 2); ctx.stroke(); } } });
      // (vague 8, l'audit : le dessin doit servir le texte) : chaque sous-agent porte son métier, celui des sous-titres
      const MET = en() ? ['explore', 'code', 'tests', 'review'] : ['exploration', 'code', 'tests', 'revue'];
      const L1 = N.filter(q => q.n === 1), dev = L1.slice().sort((p, q) => pos[q.i][2] - pos[p.i][2]).slice(0, 2);   // (les deux de devant : les autres sont cachés derrière)
      L1.forEach((q, j) => { const e = nait(q); if (e < 0.5 || !dev.includes(q)) return; const [x, y, , f] = pos[q.i], o = dev.find(d => d !== q), sd = x < (o ? pos[o.i][0] : pos[0][0]) ? -1 : 1, px = Math.max(12, k * 0.07 * f);
        ctx.font = `600 ${px}px "Space Grotesk",system-ui,sans-serif`; const w = ctx.measureText(MET[j]).width + px, lx0 = x + sd * k * 0.2 * f - (sd < 0 ? w : 0), ly0 = y - px * 0.8;
        ctx.globalAlpha = (e - 0.5) * 2; ctx.fillStyle = '#07080C'; ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx0, ly0, w, px * 1.6, px * 0.5) : ctx.rect(lx0, ly0, w, px * 1.6); ctx.fill(); ctx.stroke();
        mot(MET[j], lx0 + w / 2, ly0 + px * 0.8, px, (e - 0.5) * 2); });
      if (c > 4.1 && c < 5.6) { const [x, y] = pos[0]; coche(x + k * 0.24, y - k * 0.12, k * 0.06, (c - 4.1) / 0.4, 1); eclat(x, y, k * 0.2, (c - 4.1) / 0.6, 10); }
      ctx.restore();
    }
  };
})();

// des skills et des plugins sur mesure : un noyau (un cube dans un octaèdre, qui tournent) ; les outils arrivent du fond et se mettent en orbite ;
// l'un après l'autre, chacun plonge vers le noyau et s'y branche (câble, flash, étincelles), puis reprend son orbite
S.skills = (() => {
  // (29/09, 07:49, Mathieu : « tout n'est pas dans le style espace, exemple tes labels skill, MCP ») : plus d'étiquettes ; chaque outil est un
  // vrai module en 3D, en papier, cerné de blanc comme les chats : une cartouche (skill), une touche de clavier (/commande), un petit chat-robot
  // (agent), une prise à broches (MCP), une pièce de puzzle (plugin). Ils gravitent autour d'une station en anneau où travaille l'agent principal ;
  // tour à tour, un rayon tracteur en attrape un et l'arrime : l'agent lève les bras, la station s'allume
  const LAB = () => en() ? ['skill', '/command', 'agent', 'MCP', 'plugin', 'skill'] : ['skill', '/commande', 'agent', 'MCP', 'plugin', 'skill'];
  const KIND = ['skill', 'cmd', 'agent', 'mcp', 'plugin', 'skill'];
  const puzzle = (() => { const L = [[-0.8, -0.8], [-0.3, -0.8]]; for (let i = 0; i <= 10; i++) { const t = Math.PI * (1 - i / 10); L.push([0.3 * Math.cos(t), -0.8 - 0.32 * Math.sin(t)]); }
    L.push([0.8, -0.8], [0.8, -0.3]); for (let i = 0; i <= 10; i++) { const t = Math.PI * i / 10; L.push([0.8 + 0.32 * Math.sin(t), -0.3 * Math.cos(t)]); } L.push([0.8, 0.8], [-0.8, 0.8]); return L; })();
  const PROF = { skill: [[-0.8, -1], [0.45, -1], [0.8, -0.65], [0.8, 1], [-0.8, 1]], cmd: [[-0.9, -0.65], [-0.65, -0.9], [0.65, -0.9], [0.9, -0.65], [0.9, 0.65], [0.65, 0.9], [-0.65, 0.9], [-0.9, 0.65]],
    mcp: [[-0.75, -0.35], [0.75, -0.35], [0.75, 0.6], [0.35, 1], [-0.35, 1], [-0.75, 0.6]], plugin: puzzle };
  function module(V, q, now, k, Vs, hx) {
    const [x, y, z] = q.w, s = 0.15 * (1 + q.e * 0.25), al = 1, rot = lerp(now * 0.7 + q.i * 1.3, 0.5, q.e), tl = Math.sin(now * 0.9 + q.i) * 0.25 * (1 - q.e);
    if (q.kind === 'agent') { chabot(q.p[0], q.p[1], k * 0.07 * Math.min(1.25, q.p[3]), { now, ph: q.i, lac: Math.sin(now * 0.8 + q.i) * 0.7, a: al, bras: q.e > 0.3 ? [1.4, 1.4] : null }); return; }
    const sh = (hx - 1) * (Vs(x, y, z)[0] - G.cx), Vm = (X, Y, Z) => { const p = Vs(X, Y, Z); p[0] += sh; return p; }, R = repere(Vm, x, y, z, rot, s, tl);
    if (q.kind === 'mcp') [-0.4, 0.4].forEach(u => prisme((uu, v, d) => R(u + uu, v, d), [[-0.12, -0.9], [0.12, -0.9], [0.12, -0.35], [-0.12, -0.35]], 0.18, al, 0.6));
    const F = prisme(R, PROF[q.kind], q.kind === 'cmd' ? 0.7 : 0.36, al, 0.8);
    ctx.globalAlpha = al; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35;
    if (q.kind === 'skill') { const zF = F[0][2] > R(0, 0, 0)[2] ? 0.18 : -0.18; for (let l = 0; l < 4; l++) { const A = R(-0.6, 0.55 + l * 0.1, zF), B = R(0.6, 0.55 + l * 0.1, zF); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } }
    if (q.kind === 'cmd') { const zF = F[0][2] > R(0, 0, 0)[2] ? 0.35 : -0.35, I = [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]].map(([u, v]) => R(u, v, zF)); ctx.beginPath(); I.forEach((p, j) => j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke(); }
    // (13 h 27, Mathieu : « revois l'apparence ») : le mot est posé au centre de la face (pas sur les tenons du puzzle), et seulement quand
    // la face nous regarde assez ; de profil, pas de lettres écrasées ni coupées
    { const ep = q.kind === 'cmd' ? 0.7 : 0.36, zF = F[0][2] > R(0, 0, 0)[2] ? ep / 2 : -ep / 2, Q = [[-0.62, -0.62], [0.62, -0.62], [0.62, 0.62], [-0.62, 0.62]].map(([u, v]) => R(u, v, zF)),
        w = Math.hypot(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]), h = Math.hypot(Q[3][0] - Q[0][0], Q[3][1] - Q[0][1]);
      if (w > h * 0.55) encre(q.l, Q, al * c01((w / h - 0.55) / 0.3), q.kind === 'cmd' ? 0.36 : 0.32); }
  }
  return {
    cles: () => [0, 1, 2, 3, 4, 5].map(i => { const t = i / 6 * TAU; return [Math.cos(t) * 0.35, Math.sin(t) * 0.35]; }),
    dessin(a, now) {
      const lab = LAB(), [k, lx] = large(1.5, 2), V0 = cam(0, -0.3, k * 0.88, 0, -0.34), Vs = (x, y, z) => V0(x, y, z * 0.5), Rr = Math.min(1.5, lx * 0.8), rot = now * 0.25;
      // (vague 14 de l'audit : « l'orbite reste petite au milieu ») : l'orbite s'étire sur toute la largeur du ciel (les modules gardent leur forme :
      // seul leur centre est écarté)
      const hx = Math.max(1, ((G.droite - G.gauche) / 2 * 0.8) / (Rr * k * 0.88 * 1.05)), V = (x, y, z) => { const p = Vs(x, y, z); p[0] = G.cx + (p[0] - G.cx) * hx; return p; };
      let flash = 0, nb = 0; sousLaBarre();
      const it = lab.map((l, i) => { const e0 = sm((a - 0.2 - i * 0.35) / 0.8), u = a > 2.6 ? (a - 2.6 - i * 1.25) % 7.5 : -1, e = u > 0 && u < 1.3 ? Math.sin(Math.PI * u / 1.3) : 0;
        if (u > 0.55 && u < 1.1) flash = Math.max(flash, 1 - (u - 0.55) / 0.55); if (e0 >= 1) nb++;
        const t = i / 6 * TAU + rot, r = lerp(2.4, lerp(Rr, 0.62, e), e0), y = lerp(-1.4, Math.sin(now * 1.2 + i) * 0.08 - e * 0.12, e0), w = [Math.cos(t) * r, y, Math.sin(t) * r];
        // (vague 55 de l'audit, « skills », immersion) : le module que la souris approche se tourne vers nous, grossit, et le rayon de la souris le tient
        const p = V(...w), Sm = souris(), hv = Sm && window.Chats.K.Wd.t - Sm.moved < 2.5 ? c01(1.6 - Math.hypot(Sm.x - p[0], Sm.y - p[1]) / (k * 0.3)) : 0;
        return { l, i, e: Math.max(e, hv), eb: e, hv, kind: KIND[i], w, p }; });
      // les orbites
      trait3(anneau(V, Rr, 0, 72), 0.6, 0.55); trait3(anneau(V, Rr * 0.72, 0.02, 60), 0.4, 0.3);
      const C = V(0, 0, 0), avant = q => q.p[2] >= 0;
      // les rayons tracteurs (sous les modules)
      it.forEach(q => { if (q.eb > 0.05) { const H = V(0, -0.02, 0); ctx.globalAlpha = q.eb * 0.18; ctx.fillStyle = `rgb(${BL})`; const d = Math.hypot(q.p[0] - H[0], q.p[1] - H[1]) || 1, nx = -(q.p[1] - H[1]) / d, ny = (q.p[0] - H[0]) / d, lw = k * 0.08 * q.p[3];
        ctx.beginPath(); ctx.moveTo(H[0] + nx * 3, H[1] + ny * 3); ctx.lineTo(q.p[0] + nx * lw, q.p[1] + ny * lw); ctx.lineTo(q.p[0] - nx * lw, q.p[1] - ny * lw); ctx.lineTo(H[0] - nx * 3, H[1] - ny * 3); ctx.fill();
        for (let j = 0; j < 3; j++) { const v = (now * 1.6 + j / 3) % 1; brille(lerp(q.p[0], H[0], v), lerp(q.p[1], H[1], v), 1.8, q.eb * 0.8, false, now, q.i * 3 + j); } } });
      { const Sm = souris(); it.forEach(q => { if (!Sm || q.hv < 0.05) return; style(0.5, 0.5 * q.hv); ctx.setLineDash([3, 5]); ctx.lineDashOffset = -now * 30; ctx.beginPath(); ctx.moveTo(Sm.x, Sm.y); ctx.lineTo(q.p[0], q.p[1]); ctx.stroke(); ctx.setLineDash([]);
        brille(q.p[0], q.p[1] - k * 0.12, 3, q.hv, true, now, q.i); }); }
      it.filter(q => !avant(q)).sort((p, q) => p.p[2] - q.p[2]).forEach(q => module(V, q, now, k, Vs, hx));
      // la station : un anneau épais (deux cercles, des rayons, des hublots qui s'allument), l'agent principal au milieu
      const Ra = 0.5, h0 = -0.04, h1 = 0.05, A0 = anneau(V, Ra, h0, 48), A1 = anneau(V, Ra, h1, 48), I0 = anneau(V, Ra * 0.82, h0, 48);
      for (let j = 0; j < 48; j += 4) { trait([A0[j], A1[j]], false, 0.6, prof(A0[j][2], 0.8)); }
      trait3(I0, 0.6, 0.6); trait3(A1, 1, 1); trait3(A0, 1.2, 1);
      [0, 1, 2, 3].forEach(j => { const t = j / 4 * TAU + now * 0.1; trait([V(Math.cos(t) * Ra * 0.82, h0, Math.sin(t) * Ra * 0.82), V(Math.cos(t) * 0.1, 0, Math.sin(t) * 0.1)], false, 0.5, 0.6); });
      for (let j = 0; j < 12; j++) { if (j >= nb * 2 && flash < 0.3) continue; const t = j / 12 * TAU + 0.13, q = V(Math.cos(t) * Ra, (h0 + h1) / 2, Math.sin(t) * Ra); if (q[2] > -0.2) brille(q[0], q[1], 2.2, 0.9, flash > 0.3, now, j); }
      const rb = k * 0.14 * (1 + flash * 0.08); chabot(C[0], C[1] - rb * 1.1, rb, { now, v: 3, lac: Math.sin(now * 0.5) * 0.5, travaille: true, bras: flash > 0.2 ? [1.5, 1.5] : null });
      if (flash > 0) eclat(C[0], C[1] - rb * 1.1, k * 0.3, 1 - flash, 10, now);
      it.filter(avant).sort((p, q) => p.p[2] - q.p[2]).forEach(q => module(V, q, now, k, Vs, hx));
      // (vague 40 de l'audit : « skills, peu original ») : la forge, sur le côté : la même tâche revient, trois fois (trois feuilles identiques
      // tombent sur la pile : ×1, ×2, ×3) ; la presse s'abat, « CLAC », et il en sort une cartouche neuve qui file rejoindre l'orbite
      { const cy = 5, u = now % cy, fx = G.gauche + (G.droite - G.gauche) * 0.1, fy = C[1] + k * 0.42, s = Math.max(10, k * 0.07), n = Math.min(3, Math.floor(u / 0.8));
        cerne(() => { ctx.beginPath(); ctx.rect(fx - s * 1.6, fy, s * 3.2, s * 0.35); }, 0.8, 1);
        for (let j = 0; j < 3; j++) { const t0 = j * 0.8, v = c01((u - t0) / 0.45); if (u >= 3.2 || v <= 0) continue; const y = lerp(fy - k * 0.9, fy - s * 0.25 * (j + 1), sm(v));
          ctx.save(); ctx.translate(fx + Math.sin(v * 6 + j) * s * 0.3 * (1 - v), y); ctx.rotate((1 - v) * 0.6 * (j % 2 ? 1 : -1)); cerne(() => { ctx.beginPath(); ctx.rect(-s, -s * 0.12, s * 2, s * 0.24); }, 0.6, 1);
          ctx.restore(); if (v >= 1 && u < 3.2) mot('×' + (j + 1), fx + s * 1.9, fy - s * 0.25 * (j + 1), Math.max(10, s * 0.6), j + 1 === n ? 1 : 0.4, 'left'); }
        const pr = u < 2.6 ? 0 : u < 3.0 ? sm((u - 2.6) / 0.4) : u < 3.3 ? 1 : 1 - sm((u - 3.3) / 0.5), ph = fy - s * 2.4 - k * 0.3 * (1 - pr);
        cerne(() => { ctx.beginPath(); ctx.moveTo(fx - s * 1.9, fy); ctx.lineTo(fx - s * 1.9, fy - s * 2.6 - k * 0.35); ctx.lineTo(fx + s * 1.9, fy - s * 2.6 - k * 0.35); ctx.lineTo(fx + s * 1.9, fy); }, 0.9, 1, null);
        cerne(() => { ctx.beginPath(); ctx.moveTo(fx, fy - s * 2.6 - k * 0.35); ctx.lineTo(fx, ph); }, 1.1, 1, null); cerne(() => { ctx.beginPath(); ctx.rect(fx - s * 1.4, ph, s * 2.8, s * 0.8); }, 0.9, 1);
        if (u > 3.0 && u < 3.5) { mot('CLAC', fx, fy - s * 3.4 - k * 0.3, Math.max(14, s * 0.9), 1 - (u - 3.0) / 0.5); eclat(fx, fy - s * 0.5, s * 2, (u - 3.0) / 0.5, 8, 0.3); }
        if (u > 3.3) { const v = sm(c01((u - 3.3) / 1.5)), mx = lerp(fx, C[0] - Rr * k * 0.88 * hx * 0.9, v), my = lerp(fy - s, C[1] - k * 0.1, v) - Math.sin(Math.PI * v) * k * 0.5;
          ctx.save(); ctx.translate(mx, my); ctx.rotate(v * TAU); cerne(() => { ctx.beginPath(); ctx.moveTo(-s * 0.7, -s); ctx.lineTo(s * 0.4, -s); ctx.lineTo(s * 0.7, -s * 0.7); ctx.lineTo(s * 0.7, s); ctx.lineTo(-s * 0.7, s); ctx.closePath(); }, 0.8, 1);
          ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; ctx.beginPath(); for (let l = 0; l < 3; l++) { ctx.moveTo(-s * 0.45, s * (0.2 + l * 0.22)); ctx.lineTo(s * 0.45, s * (0.2 + l * 0.22)); } ctx.stroke(); ctx.restore(); brille(mx, my, 3, 1 - v * 0.5, true, now, 5); } }
      ctx.restore();
    }
  };
})();

// tout tester, tout mesurer (29/09, l'audit : « piste plate, drapeau à damier, tableau de barres : trop schématique ») : un vélodrome
// dans l'espace, un anneau relevé en 3D ; cinq chats-robots sur des fusées de papier (chacune son harnais, son outil) ; 3, 2, 1, go ;
// les flammes, les traînées d'étoiles ; au bout d'un tour et demi, le podium de papier : le gagnant lève les bras, il est gardé (coche) ;
// les autres repartent au garage. Et on relance : ce n'est jamais le même qui gagne
S.bench = (() => {
  const NOMS = ['A', 'B', 'C', 'D', 'E'];
  return {
    cles: () => [[-1.2, -0.3], [1.2, -0.3], [-1, 0.6], [1, 0.6]],
    dessin(a, now) {
      const T0b = go => Math.PI / 2 + go * TAU * 1.5;
      // (vague 42, l'audit : « la course », finition) : le bord avant de la piste ne descend jamais sur les sous-titres ; sinon, tout rapetisse
      let [k, lx] = large(1.5, 2.1), oyb = -0.14; const lac0 = 0.3 + Math.sin(a * 0.15) * 0.15; let V = cam(lac0, -0.46, k, 0, oyb);
      for (let pas = 0; pas < 2; pas++) { const Rx0 = Math.min(1.55, lx * 0.82), bords = [0, 0.8, 1.6, 2.4].map(t => V(Math.cos(Math.PI / 2 + t * 0.5) * Rx0 * 1.2, 0, Math.sin(Math.PI / 2 + t * 0.5) * 0.62 * 1.2)[1]).concat([0, 0.8, 1.6].map(t => V(Math.cos(Math.PI / 2 - t * 0.5) * Rx0 * 1.2, 0, Math.sin(Math.PI / 2 - t * 0.5) * 0.62 * 1.2)[1])),
          f = Math.max(...bords) + k * 0.03, lim = (G.caps || G.bas) - 4, c0 = V(0, 0, 0)[1];
        if (f <= lim) break;
        if (!pas) { oyb -= Math.min(f - lim, k * 0.22) / G.s; V = cam(lac0, -0.46, k, 0, oyb); }   // d'abord, on remonte un peu (les tribunes ont de la place en haut)
        else if (f > c0) { k *= Math.max(0.6, (lim - c0) / (f - c0)); V = cam(lac0, -0.46, k, 0, oyb); } }   // puis, s'il le faut, on rapetisse
      const Cy = 7.5, n = Math.floor(a / Cy), c = a % Cy, Rx = Math.min(1.55, lx * 0.82), Rz = 0.62;
      const v = NOMS.map((_, i) => 0.75 + 0.5 * bruit(n * 11 + i * 3.7)), g = v.indexOf(Math.max(...v)), rang = v.map((x, i) => [x, i]).sort((p, q) => q[0] - p[0]).map(q => q[1]);
      // la piste : un anneau relevé (le bord intérieur plus bas), ses lignes de couloir, les traits de vitesse
      const piste = (t, l, y = 0) => { const r = 1 + (l - 2) * 0.07; return V(Math.cos(t) * Rx * r, y - (l - 2) * 0.025, Math.sin(t) * Rz * r); };
      [-0.6, 4.6].forEach(l => trait3((() => { const L = []; for (let i = 0; i <= 90; i++) L.push(piste(i / 90 * TAU, l)); return L; })(), l < 0 ? 0.9 : 1.2, 0.9));
      for (let l = 0.5; l < 4.5; l++) { const L = []; for (let i = 0; i <= 90; i++) L.push(piste(i / 90 * TAU, l)); for (let i = 0; i < 90; i += 3) trait([L[i], L[i + 1]], false, 0.35, prof(L[i][2], 0.5)); }
      for (let i = 0; i < 36; i++) { const t = i / 36 * TAU, A = piste(t, -0.6), B = piste(t, 4.6); trait([A, B], false, 0.3, prof(A[2], 0.25)); }
      // (vague 21 de l'audit : « la course ») : des tribunes de chats-robots font le tour du fond de la piste, derrière leur balustrade ;
      // ils se lèvent, bras en l'air, quand une fusée passe devant eux (une ola qui suit la tête de la course)
      { const go0 = c01((c - 1.1) / 3.4), tete = T0b(go0), R = [];
        for (let j = 0; j <= 40; j++) { const t = Math.PI + j / 40 * Math.PI; R.push(piste(t, 5.4, -0.06)); } trait(R, false, 0.8, 0.8);
        for (let j = 0; j < 34; j++) { const t = Math.PI + (j + 0.5) / 34 * Math.PI, p = piste(t, 6.1 + (j % 2) * 0.9, -0.05 - (j % 2) * 0.05), r = k * 0.045 * p[3] * (j % 2 ? 1.05 : 1);
          if (p[1] - r * 3 < G.haut) continue; const d = Math.abs(Math.atan2(Math.sin(t - tete), Math.cos(t - tete))), ola = go0 > 0 && go0 < 1 ? Math.exp(-((d * 2.2) ** 2)) : c > 4.6 ? 0.5 + 0.5 * Math.sin(now * 6 + j) : 0;
          chabot(p[0], p[1] - r * 1.75 - ola * r * 0.8, r, { now, ph: j + 50, casque: false, lac: Math.cos(t) * 0.6, bras: [0.3 + ola * 1.2 + Math.sin(now * 7 + j) * 0.2 * ola, 0.3 + ola * 1.2] }); } }
      // la ligne d'arrivée (un damier de papier sur la largeur de la piste)
      for (let l = 0; l < 5; l++) for (let j = 0; j < 2; j++) { const t0 = Math.PI / 2 - 0.02 + j * 0.04, Q = [piste(t0, l - 0.5), piste(t0 + 0.04, l - 0.5), piste(t0 + 0.04, l + 0.5), piste(t0, l + 0.5)];
        ctx.globalAlpha = 1; ctx.fillStyle = (l + j) % 2 ? PAP : ENC; ctx.beginPath(); Q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); }
      // la course
      const go = c01((c - 1.1) / 3.4), T0 = Math.PI / 2, fin = c > 4.6;
      const cour = NOMS.map((_, i) => { const d = go <= 0 ? 0 : Math.min(1, go * v[i] / Math.max(...v) * (i === g ? 1 : 0.97)), t = T0 + d * TAU * 1.5; return { i, t, d, p: piste(t, i) }; });
      if (!fin) cour.slice().sort((p, q) => p.p[2] - q.p[2]).forEach(({ i, t, d, p }) => {
        const al = 1, dir = piste(t + 0.05, i), ang = Math.atan2(dir[1] - p[1], dir[0] - p[0]), r = k * 0.125 * p[3], roule = go > 0 && d < 1; void r;
        // la traînée : des étoiles derrière la fusée
        if (roule) for (let j = 1; j <= 7; j++) { const q = piste(t - j * 0.06, i); brille(q[0], q[1] - r * 0.4, 1.6 + (7 - j) * 0.25, al * (1 - j / 8), false, now, i * 9 + j); }
        // la fusée de papier : un fuseau, un aileron, la flamme qui bat
        ctx.save(); ctx.translate(p[0], p[1] - r * 0.45); ctx.rotate(ang);
        if (roule) cerne(() => { ctx.beginPath(); const f = 1 + Math.sin(now * 30 + i) * 0.25; ctx.moveTo(-r * 1.2, -r * 0.22); ctx.quadraticCurveTo(-r * (1.6 + f), 0, -r * 1.2, r * 0.22); ctx.closePath(); }, 0.55, al);
        cerne(() => { ctx.beginPath(); ctx.moveTo(-r * 1.2, -r * 0.35); ctx.lineTo(r * 0.7, -r * 0.35); ctx.quadraticCurveTo(r * 1.4, 0, r * 0.7, r * 0.35); ctx.lineTo(-r * 1.2, r * 0.35); ctx.closePath(); }, 0.7, al);
        cerne(() => { ctx.beginPath(); ctx.moveTo(-r * 1.1, -r * 0.3); ctx.lineTo(-r * 1.35, -r * 0.8); ctx.lineTo(-r * 0.75, -r * 0.3); ctx.closePath(); }, 0.6, al);
        ctx.fillStyle = ENC; ctx.globalAlpha = al; ctx.font = `700 ${Math.max(7, r * 0.5)}px "Space Grotesk",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(NOMS[i], -r * 0.25, r * 0.02); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.restore();
        chabot(p[0] + Math.cos(ang) * r * 0.2, p[1] - r * 1.35 + (roule ? Math.sin(now * 16 + i) * r * 0.06 : 0), r * 0.62, { now, ph: i, a: al, lac: Math.cos(ang) > 0 ? 0.6 : -0.6, casque: false, bras: roule ? [-0.3, -0.3] : [0.2, 0.2] });
      });
      // (vague 56 de l'audit, « la course », immersion) : tout mesurer, pour de vrai : la fusée que la souris survole sort sa fiche de mesure,
      // un chrono qui tourne et une barre de progression, au bout d'un fil ; on suit la course comme au stand
      { const Sm = souris(); if (Sm && !fin && go > 0 && window.Chats.K.Wd.t - Sm.moved < 3) { let b = null, bd = k * 0.32; cour.forEach(q => { const d = Math.hypot(q.p[0] - Sm.x, q.p[1] - Sm.y); if (d < bd) { bd = d; b = q; } });
        if (b) { const r = k * 0.125 * b.p[3], fs = Math.max(12, k * 0.065), tx = b.p[0] + (b.p[0] > G.cx ? -1 : 1) * k * 0.28, ty = Math.max(G.haut + fs * 2, b.p[1] - r * 2.6), w = fs * 7.2, h = fs * 2.6, x0 = tx - w / 2;
          const sec = (c - 1.1) * v[b.i] * 1.7, txt = `${NOMS[b.i]}  ${Math.floor(sec)}.${String(Math.floor(sec * 100) % 100).padStart(2, '0')} s`, pr = b.d;
          style(0.5, 0.8); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(b.p[0], b.p[1] - r * 0.6); ctx.lineTo(tx, ty + h / 2); ctx.stroke(); ctx.setLineDash([]);
          cerne(() => { ctx.beginPath(); ctx.rect(x0, ty - h / 2, w, h); }, 0.7, 1);
          ctx.fillStyle = ENC; ctx.globalAlpha = 1; ctx.font = `700 ${fs}px ui-monospace,Menlo,Consolas,monospace`; ctx.textBaseline = 'middle'; ctx.fillText(txt, x0 + fs * 0.5, ty - h * 0.18);
          ctx.fillRect(x0 + fs * 0.5, ty + h * 0.18, (w - fs) * pr, fs * 0.28); ctx.strokeStyle = ENC; ctx.lineWidth = 1; ctx.strokeRect(x0 + fs * 0.5, ty + h * 0.18, w - fs, fs * 0.28); ctx.textBaseline = 'alphabetic'; } } }
      // 3, 2, 1, go
      if (c < 1.35) { const w = c < 0.3 ? '3' : c < 0.6 ? '2' : c < 0.9 ? '1' : 'go !', u = c < 0.9 ? (c % 0.3) / 0.3 : (c - 0.9) / 0.45, C = V(0, -0.45, 0); mot(w, C[0], C[1], Math.max(24, k * 0.26) * (1.3 - u * 0.3), 1 - u * 0.6); }
      // le chrono de papier, au milieu de l'anneau : sa couronne, son aiguille
      { const ch = V(0, -0.2, 0), rc = k * 0.13; cerne(() => { ctx.beginPath(); ctx.arc(ch[0], ch[1], rc, 0, TAU); }, 1, 1); cerne(() => { ctx.beginPath(); ctx.rect(ch[0] - rc * 0.14, ch[1] - rc * 1.35, rc * 0.28, rc * 0.3); }, 0.8, 1);
        ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.45; for (let j = 0; j < 12; j++) { const t = j / 12 * TAU; ctx.beginPath(); ctx.moveTo(ch[0] + Math.cos(t) * rc * 0.72, ch[1] + Math.sin(t) * rc * 0.72); ctx.lineTo(ch[0] + Math.cos(t) * rc * 0.86, ch[1] + Math.sin(t) * rc * 0.86); ctx.stroke(); }
        const an = c > 1.1 ? Math.min(c, 4.6) * 2.6 : 0; ctx.lineWidth = G.lw * 0.8; ctx.beginPath(); ctx.moveTo(ch[0], ch[1]); ctx.lineTo(ch[0] + Math.sin(an) * rc * 0.7, ch[1] - Math.cos(an) * rc * 0.7); ctx.stroke(); }
      // le podium de papier : trois blocs ; les trois premiers y montent ; le gagnant lève les bras, une gerbe, la coche
      if (fin) { const u = sm((c - 4.6) / 0.7), P = [[0, 0.34], [-0.36, 0.22], [0.36, 0.14]];
        P.map(([x, h], j) => ({ x, h, j, z: 0.25 })).forEach(({ x, h, j }) => { const H = h * u; bloc(V, x - 0.16, x + 0.16, 0.12, 0.12 - H, 0.1, 0.4, 1, 0.9); const F = V(x, 0.12 - H * 0.5, 0.4); mot(String(j + 1), F[0], F[1], Math.max(12, k * 0.09), 0.9);
          const q = V(x, 0.12 - H, 0.25), r = k * 0.06 * q[3], i = rang[j]; chabot(q[0], q[1] - r * 1.7, r, { now, ph: i, lac: 0, bras: j === 0 ? [1.5 + Math.sin(now * 8) * 0.2, 1.5 - Math.sin(now * 8) * 0.2] : [-0.4, -0.4] });
          if (j === 0 && u >= 1) { brille(q[0], q[1] - r * 3.6, 5, 1, true, now, 1); eclat(q[0], q[1] - r * 2.4, k * 0.2, (c - 5.3) % 1, 10, now); coche(q[0] + r * 1.9, q[1] - r * 2.6, r * 0.6, (c - 5.4) / 0.3, 1.1); }
          const L = V(x, 0.12 - H, 0.25); mot(NOMS[i], L[0] + k * 0.13, L[1] - k * 0.03, Math.max(10, k * 0.06), 0.8); }); }
    }
  };
})();

// une flotte d'agents sur un même produit : un chantier en 3D. L'essaim tourne autour de l'immeuble (MARKO) et l'élève étage après étage ;
// une grue grimpe avec lui ; les fenêtres s'allument ; au dernier étage, le drapeau, et un feu d'artifice
S.flotte = (() => {
  const E = Array.from({ length: 30 }, (_, i) => ({ r: 0.55 + bruit(i) * 0.9, v: (0.45 + bruit(i * 3) * 0.7) * (i % 3 ? 1 : -1), ph: bruit(i * 7) * TAU, h: -0.8 + bruit(i * 5) * 1.55, i }));
  const NE = 11, EH = 0.088, B0 = 0.84, LW = 0.22;
  const QU = Array.from({ length: 26 }, (_, i) => { const t = i * 2.39996 + 0.3, r = 1.0 + bruit(i * 4.1) * 1.25; return { x: Math.cos(t) * r, z: Math.sin(t) * r, w: 0.06 + bruit(i * 2.3) * 0.07, h: 0.14 + bruit(i * 6.7) * 0.42, v: 0.6 + bruit(i * 1.3) * 0.8, i }; });
  function quartier(V, k, a, now, c, Cy) {
    const hx = ((G.droite - G.gauche) / 2 * 0.97) / (k * 0.8 * 2.25), Vx = (x, y, z) => { const p = V(x, y, z); p[0] = G.cx + (p[0] - G.cx) * hx; return p; };
    sousLaBarre(); ctx.beginPath(); ctx.rect(-1e4, G.haut - 4, 2e4, (G.caps || G.bas) - G.haut + 4); ctx.clip();
    const tas = 1 - sm((c - Cy + 0.6) / 0.6);
    QU.map(q => ({ q, z: Vx(q.x, B0, q.z)[2] })).sort((A, B) => A.z - B.z).forEach(({ q }) => {
      const mont = sm((c - 0.3 - bruit(q.i * 9.1) * 3) / (4 / q.v)) * tas, hh = q.h * mont; if (hh < 0.01) { const p = Vx(q.x, B0, q.z); rond(p[0], p[1], 1.2, 0.4, 0.5, true); return; }
      const F = bloc(Vx, q.x - q.w, q.x + q.w, B0, B0 - hh, q.z - q.w, q.z + q.w, prof(Vx(q.x, B0, q.z)[2], 0.9), 0.6);
      // les fenêtres, par étages
      const et = Math.floor(hh / 0.05); for (let j = 0; j < et; j++) { const p = Vx(q.x, B0 - 0.035 - j * 0.05, q.z + q.w); if (bruit(q.i * 13 + j + Math.floor(now * 0.6 + q.i)) > 0.55) { ctx.globalAlpha = 1; ctx.fillStyle = '#ffe9a8'; ctx.fillRect(p[0] - 1.5, p[1] - 2, 3, 4); } }
      // le chantier en cours : un chat-robot sur le toit, qui pose ; fini : une petite coche
      const T = Vx(q.x, B0 - hh, q.z); if (mont < 0.98) { const r = Math.max(4, k * 0.03 * T[3]); chabot(T[0], T[1] - r * 1.2, r, { now, ph: q.i, a: 0.9, lac: 0.4, casque: false, travaille: true }); }
      else coche(T[0], T[1] - 7, Math.max(4, k * 0.025), 1, 0.9);
    });
    ctx.restore();
  }
  return {
    cles: () => [[-0.24, 0.86], [0.24, 0.86], [-0.24, -0.5], [0.24, -0.5]],
    dessin(a, now) {
      const [k, lx] = large(1.3, 1.9), V = cam(0.5 + a * 0.12, -0.3, k * 0.8, 0, G.sw < 500 ? -0.55 : -0.36), Cy = NE * 0.55 + 4.5, c = a % Cy;
      const tas = 1 - sm((c - Cy + 0.6) / 0.6), n = Math.min(NE, Math.floor(c / 0.55) + 1), f = c01((c % 0.55) / 0.35), top = B0 - (n - 1 + (n < NE ? f : 1)) * EH * tas;
      trait([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => V(x * 0.62, B0, z * 0.62)), true, 0.7, 0.5);
      // (vague 29, l'audit : « la flotte ») : autour de la tour, tout un quartier se bâtit en même temps, sur toute la largeur du ciel :
      // les chantiers parallèles du workflow multi-agents ; chacun monte à son rythme, un petit chat-robot sur son toit, ses fenêtres s'allument
      quartier(V, k, a, now, c, Cy);
      // (vague 57 : l'essaim, la tour et son drapeau restent entre la barre des chapitres et les sous-titres)
      sousLaBarre(); ctx.beginPath(); ctx.rect(-1e4, G.haut - 4, 2e4, (G.caps || G.bas) - G.haut + 4); ctx.clip();
      // l'essaim : chacun son orbite ; de temps en temps, l'un plonge vers le sommet avec son bloc
      const Rm = Math.min(1.6, lx * 0.8), Q = E.map(q => { const t = now * q.v + q.ph, dv = (now * 0.9 + q.i * 0.37) % 4.5, porte = dv < 1.1, e = porte ? Math.sin(Math.PI * dv / 1.1) : 0, r = q.r * Rm / 1.45 * (1 - e * 0.85), y = lerp(q.h, top - 0.1, e);
        return { p: V(Math.cos(t) * r, y, Math.sin(t) * r), pp: V(Math.cos(t - 0.14 * Math.sign(q.v)) * r, y, Math.sin(t - 0.14 * Math.sign(q.v)) * r), porte: porte && e > 0.05, i: q.i }; });
      // (29/09, l'audit : « les agents sont des points minuscules ») : les quatorze premiers sont des chats-robots à réacteur, qui portent leur bloc
      // de papier ; les autres restent des étincelles (la nuée derrière eux)
      // (vague 57 de l'audit, « la flotte », immersion) : l'essaim nous remarque. Ceux qui passent près de la souris s'en approchent, curieux,
      // et nous font signe, puis retournent à leur orbite
      { const Sm = souris(); if (Sm && window.Chats.K.Wd.t - Sm.moved < 2.5) { const Rs = k * 0.55; Q.forEach(q => { const dx = Sm.x - q.p[0], dy = Sm.y - q.p[1], d = Math.hypot(dx, dy); if (d > Rs) return;
        const w = Math.pow(1 - d / Rs, 1.4) * 0.55; q.p = [q.p[0] + dx * w, q.p[1] + dy * w, q.p[2], q.p[3]]; q.pp = [q.pp[0] + dx * w, q.pp[1] + dy * w, q.pp[2], q.pp[3]]; q.salue = w > 0.15; }); } }
      const agent = q => { const al = prof(q.p[2]); if (q.i < 18) trait([q.pp, q.p], false, 0.5, al * 0.5);
        // (09:57, Mathieu : « pas assez élaboré ») : les autres ne sont plus des ronds à queue : de petits blocs de papier qui tournent sur eux-mêmes, en route
        if (q.i >= 18) { const s2 = k * 0.022 * q.p[3], t = now * 2 + q.i; ctx.save(); ctx.translate(q.p[0], q.p[1]); ctx.rotate(t); cerne(() => { ctx.beginPath(); ctx.rect(-s2, -s2 * 0.7, s2 * 2, s2 * 1.4); }, 0.5, al); ctx.restore(); return; }
        const r = k * 0.055 * q.p[3], dx = q.p[0] - q.pp[0]; brille(q.p[0] - Math.sign(dx) * r * 0.9, q.p[1] + r * 1.3, 2.2, al, true, now, q.i);
        chabot(q.p[0], q.p[1], r, { now, ph: q.i, a: Math.max(0.55, al), lac: Math.sign(dx) * 0.7, casque: false, bras: q.porte ? [1.3, 1.3] : q.salue ? [0.2, 1.3 + Math.sin(now * 12 + q.i) * 0.35] : null, travaille: q.porte });
        if (q.porte) { const s2 = r * 0.8; cerne(() => { ctx.beginPath(); ctx.rect(q.p[0] - s2, q.p[1] - r * 2.3 - s2 * 1.4, s2 * 2, s2 * 1.4); }, 0.6, Math.max(0.55, al)); } };
      Q.filter(q => q.p[2] < -0.2).forEach(agent);
      // l'immeuble : ses étages ; les fenêtres qui s'allument
      // (la grue passe devant ou derrière l'immeuble, selon où elle est quand la caméra tourne)
      const grue = () => {
      // la grue : son mât en treillis monte avec l'immeuble ; la flèche tourne ; le crochet monte et descend
      const mx = 0.62, mz = -0.25, mt = Math.min(B0 - 0.3, top - 0.32), M0 = V(mx, B0, mz), M1 = V(mx, mt, mz);
      // (le mât : un pilier de papier carré, son treillis gravé à l'encre sur la face qui nous regarde)
      const Fm = bloc(V, mx - 0.035, mx + 0.035, B0, mt, mz - 0.035, mz + 0.035, 1, 0.6); ctx.globalAlpha = 1; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; ctx.beginPath();
      for (let j = 0; j < 12; j++) { const A = [lerp(Fm[0][0], Fm[3][0], j / 12), lerp(Fm[0][1], Fm[3][1], j / 12)], B = [lerp(Fm[1][0], Fm[2][0], (j + 1) / 12), lerp(Fm[1][1], Fm[2][1], (j + 1) / 12)]; ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); } ctx.stroke();
      const ja = now * 0.45, J = V(mx + Math.cos(ja) * 0.85, mt, mz + Math.sin(ja) * 0.85), Jc = V(mx - Math.cos(ja) * 0.28, mt, mz - Math.sin(ja) * 0.28); trait([Jc, M1, J], false, 1, 1); boite(Jc[0] - 5, Jc[1] - 3, 10, 8, 1, 0.7, 1, true);
      const hk = lerp(mt + 0.08, Math.min(B0 - 0.05, top + 0.1), 0.5 + 0.5 * Math.sin(now * 1.3)), Hj = V(mx + Math.cos(ja) * 0.72, mt, mz + Math.sin(ja) * 0.72), H = V(mx + Math.cos(ja) * 0.72, hk, mz + Math.sin(ja) * 0.72);
      trait([Hj, H], false, 0.5, 0.8); boite(H[0] - 6, H[1], 12, 9, 2, 0.8, 1, true);
      }, derriere = V(0.62, B0, -0.25)[2] < V(0, B0, 0)[2]; if (derriere) grue();
      // (une tour en gradins : un socle large, puis elle s'affine tous les quatre étages ; une corniche à chaque retrait)
      for (let j = 0; j < n; j++) { const y1 = B0 - j * EH * tas, y0 = j === n - 1 && n < NE ? y1 - EH * f * tas : y1 - EH * tas, LW = j === 0 ? 0.3 : j < 5 ? 0.24 : j < 9 ? 0.2 : 0.16;
        bloc(V, -LW, LW, y1, y0, -LW, LW, 1, 0.75);
        if ((j === 0 || j === 4 || j === 8) && j < n - 1) bloc(V, -LW - 0.02, LW + 0.02, y0 + 0.012, y0, -LW - 0.02, LW + 0.02, 1, 0.6);
        [[-LW, 0, 1, 0], [0, LW, 0, 1], [LW, 0, -1, 0], [0, -LW, 0, -1]].forEach(([fx, fz, ux, uz], s) => (j === 0 ? [-0.55, 0.55] : [-0.6, -0.2, 0.2, 0.6]).forEach((o, w) => {
          const p = V(fx + ux * o * LW, (y0 + y1) / 2, fz + uz * o * LW); if (p[2] < V(0, (y0 + y1) / 2, 0)[2]) return;
          const on = bruit(j * 17 + s * 5 + w + Math.floor(now * 0.8 + j)) > 0.6, fw = Math.max(2, k * (j === 0 ? 0.05 : 0.014) * p[3]), fh = Math.max(3, (V(0, y1, 0)[1] - V(0, y0, 0)[1]) * 0.28); ctx.globalAlpha = 1; ctx.fillStyle = on ? '#ffe9a8' : ENC; ctx.fillRect(p[0] - fw / 2, p[1] - fh / 2, fw, fh); if (on) brille(p[0], p[1], 1.6, 0.6, false, now, j + w); })); }
      if (!derriere) grue();
      Q.filter(q => q.p[2] >= -0.2).forEach(agent);
      if (n >= NE && tas > 0.5) { const t = V(0, top, 0), m = [t[0], t[1] - k * 0.3]; trait([t, m], false, 1, 1); trait([m, [m[0] + k * 0.16, m[1] + k * (0.05 + Math.sin(now * 5) * 0.015)], [m[0], m[1] + k * 0.11]], true, 0.9, 1, true);
        mot('MARKO', t[0], t[1] - k * 0.38, Math.max(11, k * 0.08), 1);
        for (let j = 0; j < 4; j++) { const u = ((c - NE * 0.55) * 0.9 + j / 4) % 1, px = t[0] + (bruit(j * 7 + Math.floor((c - NE * 0.55) * 0.9 + j / 4)) - 0.5) * k * 1.6, py = t[1] - k * (0.2 + 0.4 * bruit(j * 3 + 1)); eclat(px, py, k * 0.07, u, 9, j); } }
      ctx.restore();
    }
  };
})();

// la vitesse sans perdre le contrôle : un tapis en perspective ; chaque changement de code passe les portiques (tests, revue CI, scanners), chacun avec
// son faisceau ; ceux qui échouent sont éjectés (✗) ; les autres arrivent devant l'humain, qui hoche la tête et tamponne : ✓, sur la pile des fusionnés
S.gardefous = (() => {
  const LAB = () => en() ? ['tests', 'CI review', 'scanners', 'human', 'merged'] : ['tests', 'revue CI', 'scanners', 'humain', 'fusionnés'];
  return {
    cles: () => [[-0.95, -0.2], [-0.35, -0.2], [0.25, -0.2], [1.2, -0.3]],
    dessin(a, now) {
      const [k, lx] = large(1.55, 2.1), V = cam(-0.3, -0.42, k * 1.02, -0.08, -0.14), yT = 0.3, x0 = -lx, xS = lx * 0.5, xs = [-lx * 0.62, -lx * 0.28, lx * 0.06], lab = LAB(), vit = 0.36, T = 1.0;
      // (vague 17 de l'audit : « le tapis part du bord gauche, le reste du ciel est vide ») : les changements arrivent de tout le ciel, par dizaines,
      // comme des feuilles de papier qui planent, et se posent au début du tapis
      sousLaBarre();
      { const A = V(x0 + 0.05, yT - 0.02, 0), Wn = G.droite - G.gauche, n = G.cx * 2 < 700 ? 8 : 16, pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
        for (let j = 0; j < n; j++) { const v = (now * 0.12 + j / n) % 1, cyc = Math.floor(now * 0.12 + j / n), sx = G.gauche + bruit(j * 3.1 + cyc * 7) * Wn, sy = G.haut + 10 + bruit(j * 5.3 + cyc) * (G.caps - G.haut) * 0.35, e = sm(v);
          const x = lerp(sx, A[0], e) + Math.sin(v * 9 + j) * k * 0.06 * (1 - v), y = lerp(sy, A[1], e * e), w = k * lerp(0.05, 0.035, e), h = w * 1.35;
          if (pc && Math.hypot(x - pc.x, y - pc.y) < pc.r * 1.3) continue;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(v * 7 + j * 2) * 0.6 * (1 - e)); cerne(() => { ctx.beginPath(); ctx.rect(-w, -h, 2 * w, 2 * h); }, 0.5, 1);
          ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.3; ctx.beginPath(); ctx.moveTo(-w * 0.55, -h * 0.4); ctx.lineTo(w * 0.55, -h * 0.4); ctx.moveTo(-w * 0.55, 0); ctx.lineTo(w * 0.3, 0); ctx.stroke(); ctx.restore(); } }
      ctx.restore();
      [-0.2, 0.2].forEach(z => trait([V(x0, yT, z), V(xS + 0.1, yT, z)], false, 0.9, prof(z)));
      for (let j = 0; j < 26; j++) { const x = x0 + ((j * 0.13 + a * vit) % (xS + 0.1 - x0)); trait([V(x, yT, -0.2), V(x, yT, 0.2)], false, 0.35, 0.4); }
      const carte = (x, y, z, al, rt = 0) => { const R = (u, w) => [x + u * Math.cos(rt) - w * Math.sin(rt), z + u * Math.sin(rt) + w * Math.cos(rt)], Q = [[-0.09, -0.13], [0.09, -0.13], [0.09, 0.13], [-0.09, 0.13]].map(([u, w]) => { const [px, pz] = R(u, w); return V(px, y, pz); });
        cerne(() => { ctx.beginPath(); Q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }, 0.6, al); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; [[-0.06, 0.05], [0.02, 0.05]].forEach(([u1, u2], l) => { const [a1, b1] = R(-0.05, -0.06 + l * 0.08), [a2, b2] = R(u2 + 0.02, -0.06 + l * 0.08), A = V(a1, y, b1), B = V(a2, y, b2); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }); return Q; };
      // la pile des fusionnés, derrière l'humain
      const xP = xS + 0.35, zP = -0.55, nb = Math.floor(a / T) + 1; let pile = 0;
      for (let q = 0; q < nb; q++) { const t = a - q * T, rate = bruit(q * 13.3) < 0.3 ? 1 + Math.floor(bruit(q * 5.1) * 3) : 0; if (!rate && t > (xS - 0.05 - x0) / vit + 1.4) pile++; }
      for (let j = 0; j < Math.min(14, pile); j++) carte(xP, yT - j * 0.03, zP, 0.9);
      if (pile) mot(`✓ ${pile} ${lab[4]}`, V(xP, yT - Math.min(14, pile) * 0.03 - 0.16, zP)[0], V(xP, yT - Math.min(14, pile) * 0.03 - 0.16, zP)[1], Math.max(10, k * 0.065), 0.85);
      let tampon = 0;
      for (let q = Math.max(0, nb - 10); q < nb; q++) { const t = a - q * T, x = x0 + t * vit, rate = bruit(q * 13.3) < 0.3 ? 1 + Math.floor(bruit(q * 5.1) * 3) : 0, g = rate ? xs[rate - 1] : 99;
        if (x > g + 0.03) { const d = (x - g - 0.03) / vit, px = g + 0.03 + d * 0.12, pz = d * 1.0, py = yT - Math.sin(Math.min(d, 0.5) * Math.PI) * 0.2 + Math.max(0, d - 0.25) ** 2 * 3; if (py > 1.4) continue;
          carte(px, py, pz, 1, d * 4); if (d < 0.8) { const c = V(px + 0.12, py - 0.2, pz); trait([[c[0] - 6, c[1] - 6], [c[0] + 6, c[1] + 6]], false, 1.1, 1); trait([[c[0] + 6, c[1] - 6], [c[0] - 6, c[1] + 6]], false, 1.1, 1); } continue; }
        const xa = xS - 0.05; if (x < xa) { carte(x, yT - 0.015, 0, 1); continue; }
        const ts = (x - xa) / vit; if (ts < 0.6) { carte(xa, yT - 0.015, 0, 1); tampon = Math.max(tampon, ts < 0.25 ? sm(ts / 0.25) : 1 - sm((ts - 0.3) / 0.3)); if (ts > 0.2) { const c = V(xa, yT - 0.1, 0); coche(c[0], c[1], k * 0.05, (ts - 0.2) / 0.25, 1.1); } continue; }
        const m = sm((ts - 0.6) / 0.8); if (m >= 1) continue; carte(lerp(xa, xP, m), lerp(yT, yT - Math.min(14, pile) * 0.03, m) - Math.sin(Math.PI * m) * 0.3, lerp(0, zP, m), 1); }
      // (vague 41 de l'audit : « la vitesse sans perdre le contrôle, peu original ») : l'atelier de réparation, sous le tapis : un chat-robot
      // à la clé répare une feuille recalée (un pansement en croix), puis un ressort la renvoie en cloche au début du tapis : « on corrige, on repasse »
      { const B = [x0 + 0.3, yT + 0.2, 0.6], cyc = 2.6, u = now % cyc, P0 = V(B[0], B[1] - 0.08, B[2]), s0 = k * 0.05 * P0[3];
        boite3(V, B[0] - 0.22, B[0] + 0.22, B[1], B[1] - 0.08, B[2] - 0.12, B[2] + 0.12, 0.8, 0.9);
        const r = k * 0.075 * P0[3], cb = V(B[0] + 0.3, B[1], B[2]), fr = Math.sin(now * 9) * 0.5; chabot(cb[0], cb[1] - r * 1.75, r, { now, ph: 21, lac: -0.7, casque: false, travaille: u < 1.6, bras: [0.6 + fr, -0.2] });
        if (u < 1.6) { carte(B[0], B[1] - 0.1, B[2], 1, 0.2); const c = V(B[0], B[1] - 0.1, B[2]); style(1.4, 1); ctx.beginPath(); ctx.moveTo(c[0] - s0, c[1] - s0 * 0.4); ctx.lineTo(c[0] + s0, c[1] + s0 * 0.4); ctx.moveTo(c[0] - s0, c[1] + s0 * 0.4); ctx.lineTo(c[0] + s0, c[1] - s0 * 0.4); ctx.stroke();
          if (Math.sin(now * 9) > 0.8) mot('tac', c[0] + s0 * 2, c[1] - s0 * 1.5, Math.max(9, k * 0.05), 0.8); }
        else { const v = sm((u - 1.6) / 1.0), x = lerp(B[0], x0 + 0.08, v), y = lerp(B[1] - 0.1, yT - 0.02, v) - Math.sin(Math.PI * v) * 0.55, z = lerp(B[2], 0, v); carte(x, y, z, 1, v * 6);
          const rs = V(B[0], B[1] - 0.1, B[2]); style(0.8, 1); ctx.beginPath(); for (let j = 0; j <= 8; j++) { const yy = rs[1] - j / 8 * s0 * 2 * (1 - v * 0.6); ctx.lineTo(rs[0] + (j % 2 ? s0 * 0.6 : -s0 * 0.6), yy); } ctx.stroke();
          if (v < 0.4) mot(en() ? 'fixed!' : 'réparé !', rs[0], rs[1] - s0 * 3, Math.max(10, k * 0.055), 1 - v * 2.5); } }
      // les portiques : l'arche, son nom, son faisceau qui balaie
      xs.forEach((g, i) => { bloc(V, g - 0.03, g + 0.03, yT, yT - 0.5, -0.34, -0.27, 1, 0.7); bloc(V, g - 0.035, g + 0.035, yT - 0.46, yT - 0.55, -0.34, 0.34, 1, 0.7); bloc(V, g - 0.03, g + 0.03, yT, yT - 0.5, 0.27, 0.34, 1, 0.7);
        const v = (now * 1.3 + i * 0.3) % 1, y = yT - 0.46 + v * 0.44; trait([V(g, y, -0.28), V(g, y, 0.28)], false, 0.8, 0.9); brille(V(g, y, 0.28)[0], V(g, y, 0.28)[1], 2.2, 0.8, false, now, i);
        // (vague 4 : « des portiques tous pareils ») : chacun son gardien, sur son linteau
        const top = V(g, yT - 0.55, 0), tf = top[3];
        if (i === 0) [-0.2, 0, 0.2].forEach((z, j) => { const p = V(g, yT - 0.58, z), on = Math.floor(now * 3) % 3 === j; cerne(() => { ctx.beginPath(); ctx.arc(p[0], p[1], k * 0.028 * tf, 0, TAU); }, 0.6, 1, on ? '#ffe9a8' : PAP); if (on) brille(p[0], p[1], 3, 1, true, now, j); });
        else if (i === 1) { const r = k * 0.1 * tf, x = top[0], y = top[1] - r * 1.9, lac = Math.sin(now * 1.4) * 0.8; chabot(x, y, r, { now, ph: 5, lac, casque: false, bras: [-0.6, 0.9] });
          const lx = x + r * 1.2 + lac * r * 0.3, ly = y + r * 1.1; cerne(() => { ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + r * 0.5, ly + r * 0.6); }, 1.2, 1, null); cerne(() => { ctx.beginPath(); ctx.arc(lx, ly, r * 0.38, 0, TAU); }, 0.8, 1, 'rgba(200,225,255,0.55)'); }
        else { const t = now * 1.6, m0 = V(g, yT - 0.55, 0), m1 = V(g, yT - 0.68, 0), r = k * 0.09 * tf; cerne(() => { ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.lineTo(m1[0], m1[1]); }, 1.1, 1, null);
          cerne(() => { ctx.beginPath(); ctx.ellipse(m1[0], m1[1], r * Math.abs(Math.cos(t)) + 1, r, 0, 0, TAU); }, 0.8, 1); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.5; ctx.beginPath(); ctx.moveTo(m1[0], m1[1]); ctx.lineTo(m1[0] + Math.sin(t) * r * 1.4, m1[1] - r * 0.2); ctx.stroke();
          style(0.5, 0.35); ctx.beginPath(); ctx.moveTo(m1[0], m1[1]); ctx.lineTo(m1[0] + Math.sin(t) * k * 0.6, m1[1] + k * 0.25); ctx.stroke(); }
        const L = V(g, yT - (i === 2 ? 0.84 : i === 1 ? 1.0 : 0.76), -0.34); const fl = Math.max(10, k * 0.07); mot(lab[i], L[0], Math.max(L[1], G.haut + fl * 1.1), fl, 0.9); });   // (vague 58 : jamais sur la barre des chapitres)
      // l'humain : il regarde, hoche la tête, tamponne
      const hp = V(xS + 0.34, yT, -0.28), rr = k * 0.15 * hp[3], hoche = Math.max(0, Math.sin(now * 2.2)) ** 6, ci = V(xS - 0.05, yT - 0.02, 0);
      lui(hp[0], hp[1] - rr * 2.5, rr, { now, hoche, tp: tampon, cible: ci, cote: -1 }); mot(lab[3], hp[0], hp[1] + k * 0.06, Math.max(10, k * 0.07), 0.85);
      // (vague 58 de l'audit, « la vitesse sans perdre le contrôle », immersion) : l'humain dans la boucle, c'est nous. La souris devient une loupe
      // de relecture : sous le verre, le diff grossi défile (lignes ajoutées +, retirées −) ; si on s'attarde, on le valide d'une coche
      { const Sm = souris(), tW = window.Chats.K.Wd.t; if (Sm && tW - Sm.moved < 3 && Sm.y > G.haut + 10 && Sm.y < (G.caps || G.bas) - 10) { const R = Math.max(34, k * 0.2), x = Sm.x, y = Math.min(Sm.y, (G.caps || G.bas) - R - 8), fs = Math.max(8, R * 0.2);
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.globalAlpha = 1; ctx.fillStyle = PAP; ctx.fill(); ctx.clip();
        ctx.font = `600 ${fs}px ui-monospace,Menlo,Consolas,monospace`; ctx.textBaseline = 'middle'; const off = (now * fs * 1.2) % (fs * 1.5);
        for (let l = -4; l <= 4; l++) { const yy = y + l * fs * 1.5 - off, j = Math.floor(now * 0.8) + l + 40, sg = bruit(j * 3.3) < 0.35 ? '+' : bruit(j * 3.3) < 0.55 ? '−' : ' ', lw = R * (0.6 + bruit(j * 7.1) * 0.9);
          if (sg !== ' ') { ctx.globalAlpha = 0.18; ctx.fillStyle = ENC; ctx.fillRect(x - R, yy - fs * 0.7, R * 2, fs * 1.4); }
          ctx.globalAlpha = 0.9; ctx.fillStyle = ENC; ctx.fillText(sg, x - R * 0.82, yy); ctx.globalAlpha = 0.55; ctx.fillRect(x - R * 0.6, yy - fs * 0.12, lw * 0.9, fs * 0.24); }
        ctx.restore();
        cerne(() => { ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); }, 1.1, 1, null); cerne(() => { ctx.beginPath(); ctx.moveTo(x + R * 0.72, y + R * 0.72); ctx.lineTo(x + R * 1.45, y + R * 1.45); }, 1.8, 1, null);
        const st = tW - Sm.moved; if (st > 0.8) coche(x + R * 0.9, y - R * 0.9, R * 0.35, (st - 0.8) / 0.3, 1.1); } }
    }
  };
})();

// six couches, comme une puce (29/09, 07:49, Mathieu : « la pile d'éléments de la partie deux, c'est vraiment super basique ») : une vraie puce en 3D,
// ses plaques épaisses, ses broches, ses pistes gravées ; elle s'ouvre en éclaté, et sur chaque couche se monte son objet, en 3D, dans le style
// des chats : un écran (le front), le chat-robot au cœur (l'IA), des serveurs (le back), la boucle et un conteneur (le DevOps), un bouclier
// (la sécurité), le bus de l'équipe en miniature (le leadership). Des données montent et descendent par les vias ; de temps en temps, tout se
// referme d'un coup (clac) puis se rouvre
S.puce = (() => {
  const LAB = () => en() ? ['Front', 'AI', 'Back-end', 'DevOps', 'Security', 'Leadership'] : ['Front', 'IA', 'Back-end', 'DevOps', 'Sécurité', 'Leadership'];
  // une plaque épaisse : ses flancs (du fond vers nous), puis son dessus ; peinte de la nuit, au trait
  function plaque(V, y, s, th, w, a) {
    const T = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([x, z]) => V(x, y, z)), B = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([x, z]) => V(x, y + th, z));
    [0, 1, 2, 3].map(i => ({ i, z: (T[i][2] + T[(i + 1) % 4][2]) / 2 })).sort((p, q) => p.z - q.z).forEach(({ i }) => { const j = (i + 1) % 4; trait([T[i], T[j], B[j], B[i]], true, w * 0.8, a, true); });
    trait(T, true, w, a, true); return T; }
  // les objets posés sur les couches (en 3D, avec la même caméra)
  const OBJ = {
    0(V, y, s, now, e, a) { // un écran : le pied, la dalle, l'interface qui se monte dessus
      const h = 0.26 * e, z = 0; trait([V(-0.1, y, 0.05), V(0.1, y, 0.05)], false, 1, a); trait([V(0, y, 0.05), V(0, y - 0.08, 0.05)], false, 1, a);
      const Q = [V(-0.3, y - 0.08, 0), V(0.3, y - 0.08, 0), V(0.3, y - 0.08 - h, 0), V(-0.3, y - 0.08 - h, 0)]; trait(Q, true, 1.1, a, true);
      const at = (u, v) => [lerp(lerp(Q[3][0], Q[2][0], u), lerp(Q[0][0], Q[1][0], u), v), lerp(lerp(Q[3][1], Q[2][1], u), lerp(Q[0][1], Q[1][1], u), v)];
      if (e > 0.6) { trait([at(0.08, 0.15), at(0.92, 0.15)], false, 0.5, a); [0, 1, 2].forEach(i => { const u = 0.1 + i * 0.28, v = c01((now * 0.6 + i * 0.2) % 1.4); trait([at(u, 0.3), at(u + 0.24, 0.3), at(u + 0.24, 0.8), at(u, 0.8)], true, 0.5, a * (0.5 + 0.5 * v)); }); } },
    1(V, y, s, now, e, a) { // le cœur : le chat-robot, assis sur la puce, qui travaille ; les pistes qui partent de lui s'allument
      const p = V(0.26, y - 0.02, 0.3); chabot(p[0], p[1] - G.s * 0.2 * p[3] * e, G.s * 0.13 * p[3] * e, { now, v: 2, lac: Math.sin(now * 0.7) * 0.6, travaille: true, a }); },
    2(V, y, s, now, e, a) { // trois serveurs : des boîtes, leurs fentes, leurs voyants
      [-0.28, 0, 0.28].forEach((x, i) => { const hh = 0.3 * e; boite3(V, x - 0.1, x + 0.1, y, y - hh, -0.12, 0.12, 0.8, a);
        for (let l = 1; l < 4; l++) { const yy = y - hh * l / 4, A = V(x - 0.08, yy, 0.12), B = V(x + 0.06, yy, 0.12); trait([A, B], false, 0.4, a * 0.8); if (bruit(i * 7 + l + Math.floor(now * 3)) > 0.5) brille(B[0], B[1], 1.6, a, false, now, i + l); } }); },
    3(V, y, s, now, e, a) { // la boucle sans fin, debout ; un conteneur en fait le tour
      const L = []; for (let i = 0; i <= 60; i++) { const t = i / 60 * TAU, d = 1 + Math.sin(t) ** 2; L.push(V(0.34 * Math.cos(t) / d * e, y - 0.2 * e - 0.16 * Math.sin(t) * Math.cos(t) / d * e * 2, 0)); } trait(L, false, 1, a);
      const t = now * 1.5, d = 1 + Math.sin(t) ** 2, c = V(0.34 * Math.cos(t) / d * e, y - 0.2 * e - 0.32 * Math.sin(t) * Math.cos(t) / d * e, 0); boite(c[0] - 6, c[1] - 4, 12, 8, 1, 0.8, a, true); },
    4(V, y, s, now, e, a) { // un bouclier debout, sa serrure ; un anneau qui tourne autour
      const Sh = []; for (let i = 0; i <= 24; i++) { const u = i / 24, x = (u - 0.5) * 0.44, yy = u < 0.5 ? 0 : 0; Sh.push(V(x, y - 0.4 * e, 0)); }
      const P = [V(-0.2, y - 0.42 * e, 0), V(0.2, y - 0.42 * e, 0), V(0.2, y - 0.2 * e, 0), V(0, y - 0.04, 0), V(-0.2, y - 0.2 * e, 0)]; trait(P, true, 1.1, a, true);
      const c = V(0, y - 0.24 * e, 0); rond(c[0], c[1], 3, 0.8, a, true); trait(anneau(V, 0.3, y - 0.23 * e, 32).map((q, i) => q), false, 0.5, a * 0.6); },
    5(V, y, s, now, e, a) { // le bus de l'équipe en miniature, qui roule sur une petite route en rond
      const t = now * 0.8, R = 0.32; trait(anneau(V, R, y, 40), false, 0.5, a * 0.6); const p = V(Math.cos(t) * R, y, Math.sin(t) * R), r = G.s * 0.05 * p[3] * e;
      cerne(() => { ctx.beginPath(); ctx.rect(p[0] - r * 1.4, p[1] - r * 1.6, r * 2.8, r * 1.4); }, 0.7, a); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.5; for (let k = 0; k < 3; k++) { ctx.strokeRect(p[0] - r * 1.1 + k * r * 0.8, p[1] - r * 1.35, r * 0.55, r * 0.5); } }
  };
  // (vague 27, l'audit : « la puce reste une pile au milieu ») : elle est posée sur une carte mère qui couvre tout le ciel, jusqu'à l'horizon ;
  // des pistes partent de chacune de ses broches, tournent en équerre et à 45°, filent vers des composants ; des paquets de lumière y courent
  const PISTES = Array.from({ length: 76 }, (_, i) => { const cote = i % 4, u = (bruit(i * 3.7) - 0.5) * 1.7, d = [[0, -1], [1, 0], [0, 1], [-1, 0]][cote], t = [-d[1], d[0]], sg = bruit(i * 5.3) < 0.5 ? -1 : 1;
    const x0 = d[0] * 0.62 + t[0] * u * 0.62, z0 = d[1] * 0.62 + t[1] * u * 0.62, l1 = 0.15 + bruit(i * 2.1) * 0.5, l2 = 0.2 + bruit(i * 4.9) * 0.6, l3 = cote === 2 ? 0.3 + bruit(i * 6.1) * 0.6 : 1 + bruit(i * 6.1) * 5.5;
    const P = [[x0, z0]], a = () => P[P.length - 1], pas = (dx, dz, l) => P.push([a()[0] + dx * l, a()[1] + dz * l]);
    pas(d[0], d[1], l1); pas((d[0] + t[0] * sg) * 0.7071, (d[1] + t[1] * sg) * 0.7071, l2); pas(d[0], d[1], l3);
    let L = 0; const cum = [0]; for (let k = 1; k < P.length; k++) { L += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); cum.push(L); }
    return { P, L, cum, comp: bruit(i * 8.3) < 0.45 ? 1 : 0, v: 0.25 + bruit(i * 1.9) * 0.5, ph: bruit(i * 7.7) }; });
  function carte(V0, yP, a, now, ferme) {
    const pousse = sm(a / 2.2) * (1 - ferme * 0.9); if (pousse < 0.01) return;
    sousLaBarre(); ctx.beginPath(); ctx.rect(-1e4, G.haut - 4, 2e4, (G.caps || G.bas) - G.haut + 4); ctx.clip();
    const au = (R, l) => { let k = 1; while (k < R.cum.length - 1 && R.cum[k] < l) k++; const q = c01((l - R.cum[k - 1]) / ((R.cum[k] - R.cum[k - 1]) || 1)); return [lerp(R.P[k - 1][0], R.P[k][0], q), lerp(R.P[k - 1][1], R.P[k][1], q)]; };
    const ok = z => z < 1.3;
    PISTES.forEach((R, i) => {
      const lv = R.L * pousse, pts = []; for (let k = 0; k < R.P.length; k++) { if (R.cum[k] > lv) { pts.push(au(R, lv)); break; } pts.push(R.P[k]); }
      const S = pts.filter(q => ok(q[1])).map(([x, z]) => V0(x, yP, z)); if (S.length < 2) return; const al = prof(S[S.length - 1][2], 0.95);
      trait(S, false, 0.75, al); const b = V0(R.P[0][0], yP, R.P[0][1]); rond(b[0], b[1], 1.2, 0.4, al, true);
      // le composant au bout : une petite puce (une boîte) ou une pastille
      if (lv >= R.L - 1e-3) { const [ex, ez] = R.P[R.P.length - 1]; if (!ok(ez)) return; if (R.comp) boite3(V0, ex - 0.09, ex + 0.09, yP, yP - 0.05, ez - 0.07, ez + 0.07, 0.6, al); else { const q = V0(ex, yP, ez); rond(q[0], q[1], 2.2 * q[3], 0.5, al, true); } }
      // les paquets : du bout vers la puce (les données qui arrivent), un sur deux dans l'autre sens
      const v = fr(now * R.v / Math.max(0.6, R.L) + R.ph), l = (i % 2 ? v : 1 - v) * lv, [px, pz] = au(R, l); if (!ok(pz)) return; const q = V0(px, yP, pz); brille(q[0], q[1], 1.3 + q[3], al * 1.2, false, now, i);
    });
    ctx.restore();
  }
  const fr = v => v - Math.floor(v);
  let LB = null; const HV = [0, 0, 0, 0, 0, 0];   // (vague 59 : où sont les étiquettes, et la couche que la souris ouvre)
  return {
    cles: () => [[-0.45, 0], [0.45, 0], [0, -0.3], [0, 0.3]],
    dessin(a, now) {
      const [k] = large(2, 2.4), lab = LAB(), Cy = 8, c = a % Cy, ferme = c > 6 && c < 7 ? Math.sin(Math.PI * (c - 6)) : 0;
      // (en escalier : chaque couche décalée en biais, pour qu'on voie l'objet posé sur chacune)
      const V0 = cam(0.35 + Math.sin(a * 0.2) * 0.25, -0.5, k * 0.93, -0.12, 0.02), ec = sm(a / 1.6) * (1 - ferme * 0.92), th = 0.05, ks = 0.62;
      // (vague 3) une couche après l'autre se soulève et s'allume, de haut en bas : on voit enfin ce que porte chacune
      const act = c > 1.9 && c < 6.1 ? Math.min(5, Math.floor((c - 1.9) / 0.7)) : -1, lev0 = lab.map((l, j) => j === act ? Math.sin(Math.PI * c01((c - 1.9 - j * 0.7) / 0.7)) : 0);
      // (vague 59 de l'audit, « la puce », immersion) : on ouvre soi-même les tiroirs. La souris sur une étiquette (ou sur le coin d'une couche)
      // fait glisser cette couche hors de la pile, allumée, tant qu'on reste dessus
      { const Sm = souris(), ok = Sm && LB && window.Chats.K.Wd.t - Sm.moved < 4 && ferme < 0.1; let hj = -1;
        if (ok) { let bd = 1e9; LB.TY.forEach((y, j) => { const d = Sm.x > LB.x - 30 && Sm.x < LB.x + 190 ? Math.abs(Sm.y - y) : Math.hypot(Sm.x - LB.EQ[j][0], Sm.y - LB.EQ[j][1]); if (d < bd && d < LB.gap * 0.8) { bd = d; hj = j; } }); }
        HV.forEach((v, j) => { HV[j] += ((j === hj ? 1 : 0) - v) * 0.12; }); }
      const lev = lev0.map((v, j) => Math.max(v, sm(HV[j])));
      // (comme un tiroir : elle glisse hors de la pile, vers nous, puis rentre)
      const ys = lab.map((l, j) => (j - 2.5) * 0.34 * ec - lev[j] * 0.05), dxs = lab.map((l, j) => (j - 2.5) * 0.46 * ec + lev[j] * 0.55), dzs = lab.map((l, j) => -(j - 2.5) * 0.1 * ec + lev[j] * 0.45);
      // les broches du socle (sous la couche du bas), les pistes gravées
      const V = (x, y, z) => V0(dxs[5] + x * ks, y, dzs[5] + z * ks), yb = ys[5] + th, S0 = 0.62;
      carte((x, y, z) => V0(dxs[5] + x * ks, y, dzs[5] + z * ks), yb + 0.12, a, now, ferme);
      for (let i = 0; i < 12; i++) { const u = -S0 + (i + 0.5) / 12 * 2 * S0; [[u, -S0, 0, -1], [u, S0, 0, 1], [-S0, u, -1, 0], [S0, u, 1, 0]].forEach(([x, z, dx, dz]) => { const A = V(x, yb, z), B = V(x + dx * 0.07, yb + 0.04, z + dz * 0.07), C = V(x + dx * 0.08, yb + 0.12, z + dz * 0.08); if (A[2] > -0.2) trait([A, B, C], false, 0.55, 0.7); }); }
      // les vias : quatre colonnes qui traversent toutes les couches ; les données y courent
      const VIA = [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]], EQ = [];
      // une colonne commune pour les étiquettes, à droite de toutes les couches
      const xcol = Math.min(G.droite - 130, Math.max(...lab.flatMap((l, j) => [[1, 1], [1, -1], [-1, 1]].map(([u, v]) => V0(dxs[j] + u * 0.62 * ks, ys[j], dzs[j] + v * 0.62 * ks)[0]))) + k * 0.12);
      for (let j = 5; j >= 0; j--) {
        const V = (x, y, z) => V0(dxs[j] + x * ks, y, dzs[j] + z * ks), s = j === 1 ? 0.62 : 0.54, y = ys[j], al = j === 1 ? 1 : 0.9, T = plaque(V, y, s, th, j === 1 || lev[j] > 0.3 ? 1.35 : 1, al);
        // la couche soulevée : son contour s'illumine, un balayage de lumière traverse son dessus
        if (lev[j] > 0.05) { const u = c01((c - 1.9 - j * 0.7) / 0.7), zz = lerp(-s, s, u); trait([V(-s, y, zz), V(s, y, zz)], false, 1.4, lev[j]); brille(V(s, y, zz)[0], V(s, y, zz)[1], 4, lev[j], true, now, j); T.forEach((q, i) => brille(q[0], q[1], 2.5 * lev[j], lev[j], false, now, i + j)); }
        // les pistes gravées sur le dessus : des lignes en équerre, une lumière qui y court
        for (let i = 0; i < 6; i++) { const z = -s * 0.8 + i * s * 0.32, x0 = -s * 0.85, x1 = -s * 0.3 + bruit(i + j * 7) * s * 0.4, L = [V(x0, y, z), V(x1, y, z), V(x1 + 0.08, y, z + 0.08 * (i % 2 ? 1 : -1))];
          trait(L, false, 0.4, al * 0.55); const v = (now * 0.5 + i * 0.17 + j * 0.3) % 1; if (v < 0.6) { const q = V(lerp(x0, x1, v / 0.6), y, z); brille(q[0], q[1], 1.5, al * 0.8, false, now, i + j * 6); } }
        // les vias qui montent jusqu'à la couche d'au-dessus
        if (j > 0) VIA.forEach(([x, z], v) => { const A = V(x * s, y, z * s), B = V0(dxs[j - 1] + x * s * ks, ys[j - 1] + th, dzs[j - 1] + z * s * ks); trait([A, B], false, 0.5, 0.5); const u = (now * 0.8 + v * 0.25 + j * 0.13) % 1, w = v % 2 ? u : 1 - u; brille(lerp(A[0], B[0], w), lerp(A[1], B[1], w), 2, 0.9, false, now, v * 7 + j); });
        // l'objet de la couche : il se monte quand la puce est ouverte
        const e = sm(c01((a - 1.2 - (5 - j) * 0.25) / 0.6)) * (1 - ferme); if (e > 0.02) OBJ[j](V, y, s, now, e * (1 + lev[j] * 0.25), al);
        // l'étiquette : un trait jusqu'au bord, le nom en petites capitales
        EQ[j] = T.reduce((b, q) => q[0] > b[0] ? q : b, T[0]);
      }
      // les étiquettes, rangées de haut en bas sans se chevaucher
      let yl = -1e9; const gap = Math.max(15, k * 0.085), TY = EQ.map(R => (yl = Math.max(R[1], yl + gap)));
      // (vague 12) la colonne ne descend jamais sous le haut des sous-titres : si elle déborde, elle remonte d'un bloc
      const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, lim = bd ? bd.y - gap * 0.6 : G.bas, dep = Math.max(0, TY[5] - lim); if (dep) TY.forEach((y, j) => { TY[j] = y - dep; });
      LB = { x: xcol, TY: TY.slice(), EQ: EQ.map(q => [q[0], q[1]]), gap };
      EQ.forEach((R, j) => { const ty = TY[j]; const tx = xcol;
        trait([R, [tx - 16, ty], [tx - 6, ty]], false, 0.45, 0.6 * (1 - ferme)); rond(R[0], R[1], 2, 0.6, 0.8 * (1 - ferme), true); mot(lab[j].toUpperCase(), tx + lev[j] * 8, ty, Math.max(11, k * (j === 1 ? 0.085 : 0.065) * (1 + lev[j] * 0.3)), (j === 1 || lev[j] > 0.3 ? 1 : 0.85) * (1 - ferme), 'left'); });
      if (ferme > 0.9) { const C = V0(0, 0, 0); eclat(C[0], C[1], k * 0.6, (ferme - 0.9) * 10, 14, 0.3); mot('clac', C[0] + k * 0.5, C[1] - k * 0.3, Math.max(14, k * 0.1), 1); }
    }
  };
})();

// IA & données : des documents sont lus (un faisceau) ; leurs morceaux s'envolent dans un grand nuage de vecteurs en 3D ; une question arrive,
// ses voisins s'allument et se relient ; la réponse s'écrit, file vers un agent, qui agit (son engrenage tourne) et coche
S.ia = (() => {
  const HALO = Array.from({ length: 170 }, (_, i) => { const t = i * 2.39996, r = 1.25 + bruit(i * 2.7) * 1.0, y = (bruit(i * 8.3) - 0.5) * 1.6; return [Math.cos(t) * r, y, Math.sin(t) * r]; });
  const Nn = 130, Vs = Array.from({ length: Nn }, (_, i) => { const y = 1 - (i + 0.5) / Nn * 2, r = Math.sqrt(1 - y * y), t = i * 2.39996, j = 0.85 + 0.3 * bruit(i * 1.7); return [Math.cos(t) * r * j, y * j, Math.sin(t) * r * j]; });
  const VO = Vs.map((p, i) => Vs.map((q, j) => [Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), j]).filter(d => d[1] > i).sort((a, b) => a[0] - b[0]).slice(0, 2).map(d => d[1]));
  const Qp = [0.35, -0.3, 0.55], PR = Vs.map((p, i) => [Math.hypot(p[0] - Qp[0], p[1] - Qp[1], p[2] - Qp[2]), i]).sort((a, b) => a[0] - b[0]).slice(0, 7).map(d => d[1]);
  return {
    cles: () => [[-0.95, -0.3], [-0.95, 0.35], [0, 0], [0.95, 0]],
    dessin(a, now) {
      const [k, lx] = large(1.5, 2.1), Pk = (x, y) => [G.cx + x * k, G.cy + y * k], xd = -lx * 0.8, xa = lx * 0.7, Cy = 7, c = a % Cy, R = 0.78, V = cam(now * 0.28, -0.25, k * 0.92, 0, -0.18);
      // (vague 16 de l'audit : « le nuage reste une boule au milieu ») : tout le ciel est l'espace des vecteurs : un grand halo de fiches tourne
      // lentement, de bord à bord, derrière les documents et l'écran ; celles du fond ne sont que des points
      sousLaBarre();
      { const hx = ((G.droite - G.gauche) / 2 * 0.95) / (k * 0.92 * 2.2), H = HALO.map(([x, y, z], i) => { const p = V(x, y * 0.55, z); p[0] = G.cx + (p[0] - G.cx) * hx; return [p, i]; }).sort((A, B) => A[0][2] - B[0][2]);
        H.forEach(([q, i]) => { if (q[1] < G.haut || q[1] > G.caps) return; const al = prof(q[2] * 0.5, 0.9); if (q[2] < 0.2) { rond(q[0], q[1], 0.9 + q[3] * 0.8, 0.5, al, true); return; }
          const w = k * 0.026 * q[3], h = w * 0.72; ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(bruit(i * 5.1) - 0.5); cerne(() => { ctx.beginPath(); ctx.rect(-w, -h, 2 * w, 2 * h); }, 0.4, al); ctx.restore(); }); }
      ctx.restore();
      // les documents, en éventail ; le faisceau de lecture
      [2, 1, 0].forEach(j => { const p = Pk(xd + j * 0.08, -0.05 - j * 0.04); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-0.09 * j); ctx.translate(j * k * 0.02, -j * k * 0.02); cerne(() => { ctx.beginPath(); ctx.moveTo(-0.2 * k, -0.34 * k); ctx.lineTo(0.1 * k, -0.34 * k); ctx.lineTo(0.2 * k, -0.24 * k); ctx.lineTo(0.2 * k, 0.34 * k); ctx.lineTo(-0.2 * k, 0.34 * k); ctx.closePath(); }, 0.9, 1);
        ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.5; ctx.beginPath(); ctx.moveTo(0.1 * k, -0.34 * k); ctx.lineTo(0.1 * k, -0.24 * k); ctx.lineTo(0.2 * k, -0.24 * k); ctx.stroke();
        if (!j) { ctx.lineWidth = G.lw * 0.4; ctx.beginPath(); for (let l = 0; l < 7; l++) { ctx.moveTo(-0.13 * k, (-0.2 + l * 0.08) * k); ctx.lineTo((0.13 - (l % 3) * 0.05) * k, (-0.2 + l * 0.08) * k); } ctx.stroke(); } ctx.restore(); });
      const lb = -0.32 + ((now * 0.35) % 1) * 0.6, A0 = Pk(xd - 0.25, lb), A1 = Pk(xd + 0.25, lb); trait([A0, A1], false, 1.1, 1); brille(A1[0], A1[1], 3, 1, false, now, 1);
      // le nuage : il tourne ; ses liens ; il se remplit
      const Q = Vs.map(([x, y, z]) => V(x * R, y * R, z * R)), nb = Math.min(Nn, 30 + Math.floor(a * 16));
      sousLaBarre();   // (vague 60 : le nuage ne passe plus sur la barre des chapitres)
      for (let i = 0; i < nb; i++) VO[i].forEach(j => { if (j < nb) trait([Q[i], Q[j]], false, 0.35, prof(Q[i][2], 0.35)); });
      // (vague 4 : « un nuage de points trop sage ») : chaque vecteur est une petite fiche de papier ; celles de devant, plus grandes, portent deux lignes d'encre
      Q.slice(0, nb).map((q, i) => [q, i]).sort((p, r) => p[0][2] - r[0][2]).forEach(([q, i]) => { const al = prof(q[2]); if (q[2] < -0.1) { rond(q[0], q[1], 1.3 + q[3] * 0.9, 0.5, al, true); return; }
        const w = k * 0.03 * q[3], h = w * 0.72, rt = bruit(i * 3.3) - 0.5; ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(rt); cerne(() => { ctx.beginPath(); ctx.rect(-w, -h, 2 * w, 2 * h); }, 0.45, al);
        if (w > 5) { ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.3; ctx.beginPath(); ctx.moveTo(-w * 0.6, -h * 0.25); ctx.lineTo(w * 0.6, -h * 0.25); ctx.moveTo(-w * 0.6, h * 0.3); ctx.lineTo(w * 0.2, h * 0.3); ctx.stroke(); } ctx.restore(); });
      // (vague 60 de l'audit, « IA et données », immersion) : la souris pose sa propre question au nuage. Ses cinq plus proches voisins s'allument
      // et se relient à elle par des fils pointillés qui courent vers le pointeur (une recherche par similarité, en direct)
      { const Sm = souris(); if (Sm && window.Chats.K.Wd.t - Sm.moved < 2.5) { const Nv = Q.slice(0, nb).map((q, i) => [Math.hypot(q[0] - Sm.x, q[1] - Sm.y), i]).filter(d => d[0] < k * 0.7).sort((p, r) => p[0] - r[0]).slice(0, 5);
        if (Nv.length) { Nv.forEach(([d, i], n) => { const q = Q[i]; style(0.9, 1 - n * 0.1); ctx.setLineDash([3, 4]); ctx.lineDashOffset = now * 24; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(Sm.x, Sm.y); ctx.stroke(); ctx.setLineDash([]);
            brille(q[0], q[1], 3.6 - n * 0.3, 1, true, now, 90 + i); });
          const rq = Math.max(9, k * 0.035); cerne(() => { ctx.beginPath(); ctx.arc(Sm.x, Sm.y, rq, 0, TAU); }, 0.8, 1); ctx.globalAlpha = 1; ctx.fillStyle = ENC; ctx.font = `700 ${rq * 1.3}px "Space Grotesk",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', Sm.x, Sm.y + rq * 0.08); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; } } }
      ctx.restore();
      // (vague 38 de l'audit : « IA et données, peu original ») : le chercheur : un chat-robot bibliothécaire, lampe frontale allumée, fait le tour
      // du nuage en fouillant les fiches de son faisceau ; quand la question arrive, il pique vers elle et braque sa lampe sur les voisins
      { const Qc = V(Qp[0] * R, Qp[1] * R, Qp[2] * R), on = c > 1.8 && c < 5.2, an = now * 0.45, orb = V(Math.cos(an) * R * 1.35, -0.1 + Math.sin(an * 1.7) * 0.25, Math.sin(an) * R * 1.35), ci = on ? Qc : V(Math.cos(an + 2.4) * R * 0.3, Math.sin(now * 0.9) * R * 0.4, Math.sin(an + 2.4) * R * 0.3),
          px = on ? lerp(orb[0], Qc[0] + k * 0.35, 0.6) : orb[0], py = on ? lerp(orb[1], Qc[1] - k * 0.3, 0.6) : orb[1], r = k * 0.065 * (on ? 1.15 : orb[3]), hx = px, hy = py - r * 1.2;
        const dx = ci[0] - hx, dy = ci[1] - hy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, L = Math.min(d * 1.15, k * 0.9), wv = L * 0.32;
        ctx.globalAlpha = on ? 0.2 : 0.12; ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + ux * L - uy * wv, hy + uy * L + ux * wv); ctx.lineTo(hx + ux * L + uy * wv, hy + uy * L - ux * wv); ctx.closePath(); ctx.fill();
        style(0.4, on ? 0.6 : 0.35); ctx.stroke(); if (orb[2] > -0.2 || on) chabot(px, py - r * 0.6, r, { now, ph: 14, lac: ux * 0.9, casque: true, bras: [0.9, -0.4] }); brille(hx, hy, 3, 1, true, now, 7); }
      // les morceaux qui s'envolent vers le nuage (chacun vers son point)
      for (let m = 0; m < 6; m++) { const v = (now * 0.55 + m / 6) % 1, i = Math.floor(bruit(m * 5 + Math.floor(now * 0.55 + m / 6)) * nb), B = Q[i]; brille(lerp(A1[0], B[0], sm(v)), lerp(A1[1], B[1], sm(v)) - Math.sin(Math.PI * v) * k * 0.2, 1.9, 1 - v * 0.4, false, now, m);
        style(0.6, 1 - v); ctx.strokeRect(lerp(A1[0], B[0], sm(v)) - 4, lerp(A1[1], B[1], sm(v)) - Math.sin(Math.PI * v) * k * 0.2 - 3, 8, 6); }
      // la question ; ses voisins s'allument et se relient
      const qA = Pk(0.15, -0.78), Qc = V(Qp[0] * R, Qp[1] * R, Qp[2] * R), qu = c01((c - 1) / 0.8), on = c > 1.8 && c < 5.2;
      if (c > 0.6 && c < 2.2) { const e = sm(c01((c - 0.6) / 0.3)) * (1 - sm(c01((c - 1.9) / 0.3))), bw = k * 0.2 * e, bh = k * 0.15 * e;
        if (e > 0.05) { cerne(() => { ctx.beginPath(); ctx.ellipse(qA[0], qA[1], bw, bh, 0, 0, TAU); ctx.moveTo(qA[0] - bw * 0.3, qA[1] + bh * 0.85); ctx.lineTo(qA[0] - bw * 0.55, qA[1] + bh * 1.5); ctx.lineTo(qA[0], qA[1] + bh * 0.95); }, 0.9, 1);
          ctx.globalAlpha = 1; ctx.fillStyle = ENC; ctx.font = `700 ${Math.max(12, bh * 1.2)}px "Space Grotesk",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', qA[0], qA[1] + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; } if (qu > 0 && qu < 1) brille(lerp(qA[0], Qc[0], qu), lerp(qA[1], Qc[1], qu), 3.5, 1, true, now, 2); }
      if (on) { rond(Qc[0], Qc[1], 6, 1, 1); PR.forEach((i, j) => { const q = Q[i], u = c01((c - 1.8 - j * 0.12) / 0.3); trait([Qc, [lerp(Qc[0], q[0], u), lerp(Qc[1], q[1], u)]], false, 0.8, 0.9); if (u >= 1) brille(q[0], q[1], 3, 1, false, now, i); }); }
      // la réponse s'écrit, puis va à l'agent ; il agit
      const R0 = Pk(xa, -0.38), wr = 0.52 * k, hr = 0.34 * k; ecran(R0[0] - wr / 2, R0[1] - hr / 2, wr, hr, k * 0.06, 6);
      const ec = c01((c - 2.6) / 1.2); for (let l = 0; l < 3; l++) { const u = c01(ec * 3 - l); if (u > 0) trait([[R0[0] - wr * 0.38, R0[1] - hr * 0.22 + l * hr * 0.22], [R0[0] - wr * 0.38 + wr * (0.76 - (l === 2 ? 0.3 : 0)) * u, R0[1] - hr * 0.22 + l * hr * 0.22]], false, 0.6, 0.9); }
      // (29/09, l'audit : « trop sage ») : chaque voisin retrouvé devient une petite fiche de papier qui file, en arc, jusqu'à l'écran de la réponse
      PR.forEach((i, j) => { const v = c01((c - 2.1 - j * 0.09) / 0.75); if (v <= 0 || v >= 1) return; const q = Q[i], e = sm(v), x = lerp(q[0], R0[0] - wr * 0.3, e), y = lerp(q[1], R0[1], e) - Math.sin(Math.PI * e) * k * 0.3, w = k * 0.07, h = k * 0.05;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(v * 9 + j) * 0.4); cerne(() => { ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); }, 0.55, 1); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.3; ctx.beginPath(); ctx.moveTo(-w * 0.35, -h * 0.1); ctx.lineTo(w * 0.35, -h * 0.1); ctx.moveTo(-w * 0.35, h * 0.18); ctx.lineTo(w * 0.1, h * 0.18); ctx.stroke(); ctx.restore(); });
      const ag = Pk(xa, 0.16); robot(ag[0], ag[1], k * 0.17, 1, Math.sin(now * 1.5) > 0.97, { now, v: 4, lac: Math.sin(now * 0.8) * 0.5, travaille: c > 4.5 && c < 5.5 });
      if (c > 3.9 && c < 4.6) { const v = (c - 3.9) / 0.7; brille(lerp(R0[0], ag[0], v), lerp(R0[1] + hr / 2, ag[1] - k * 0.1, v), 3, 1, true, now, 4); }
      rouage(ag[0] + k * 0.22, ag[1] + k * 0.22, k * 0.06, c > 4.5 ? (c - 4.5) * 4 : 0);
      if (c > 5) coche(ag[0] + k * 0.2, ag[1] - k * 0.16, k * 0.05, (c - 5) / 0.4, 1);
    }
  };
})();

// front & interfaces : une page se monte toute seule (l'en-tête glisse, les cartes se retournent) ; un clic : un cube en 3D jaillit de l'écran ;
// puis la même page devient tablette, puis téléphone : le cadre se resserre, les cartes se réorganisent (3 colonnes, 2, 1), le menu devient burger ; et retour
S.front = (() => {
  const NOMS = () => en() ? ['desktop', 'tablet', 'mobile'] : ['ordinateur', 'tablette', 'mobile'];
  return {
    cles: () => [[-1, -0.62], [1, -0.62], [1, 0.62], [-1, 0.62]],
    dessin(a, now) {
      const [k0, lx] = large(1.2, 1.8), bT = G.haut + 6, bB = (G.caps || G.bas) - 6, k = Math.max(20, Math.min(k0 * 0.84, (bB - bT) / 1.8)), Yc = Math.max(bT + 0.9 * k, Math.min(bB - 0.9 * k, G.cy - 0.16 * k)), Pk = (x, y) => [G.cx + x * k, Yc + y * k], Cy = 12, c = a % Cy, b1 = a < Cy;   // (09:57 : l'écran passait sous les sous-titres : plus petit, remonté)
      const FO = [[Math.min(1.5, lx * 0.85), 0.66, 3], [0.64, 0.8, 2], [0.36, 0.86, 1]];
      let A = 0, B = 0, u = 0;
      if (c > 4.4 && c < 5.2) [A, B, u] = [0, 1, sm((c - 4.4) / 0.8)]; else if (c >= 5.2 && c < 7.2) A = B = 1; else if (c >= 7.2 && c < 8) [A, B, u] = [1, 2, sm((c - 7.2) / 0.8)]; else if (c >= 8 && c < 10.4) A = B = 2; else if (c >= 10.4 && c < 11.4) [A, B, u] = [2, 0, sm((c - 10.4) / 1)];
      const w = lerp(FO[A][0], FO[B][0], u), h = lerp(FO[A][1], FO[B][1], u), large01 = c01((w - 0.45) / 0.7);
      const cartes = n => { const [W, H, nc] = FO[n], rows = Math.ceil(3 / nc), cw = (2 * W - 0.16 - (nc - 1) * 0.06) / nc, top = -H + 0.34, bot = H - 0.3, ch = Math.min(0.46, (bot - top - (rows - 1) * 0.05) / rows);
        return [0, 1, 2].map(i => [-W + 0.08 + (i % nc) * (cw + 0.06), top + Math.floor(i / nc) * (ch + 0.05), cw, ch]); };
      const CA = cartes(A), CB = cartes(B), CC = CA.map((q, i) => q.map((v, j) => lerp(v, CB[i][j], u)));
      // le cadre (l'écran) ; en téléphone : l'encoche
      // (vague 15 de l'audit : « un écran plat au milieu du vide ») : tout autour, un univers d'éléments d'interface en papier (interrupteurs,
      // curseurs, cases, boutons, étoiles d'avis, avatars) qui arrivent du fond vers nous sur toute la largeur du ciel, et vivent (ils basculent,
      // glissent, se cochent) ; ils passent derrière l'écran, jamais sur les sous-titres ni sur la planète des chats
      uiNuee(now, b1 ? sm(a / 1.2) : 1);
      const T = Pk(-w, -h); { // (vague 8) le chat-robot assis sur l'écran : quand l'écran se resserre, le bord se dérobe sous lui ; il saute, bras en l'air, et retombe dessus
        const P = Pk(w * 0.55, -h), r = k * 0.1, sa = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
        chabot(P[0], P[1] - r * 0.55 - Math.abs(Math.sin(now * 2)) * r * 0.15 * (1 - sa) - sa * r * 1.6, r, { now, v: 1, lac: sa ? 0 : Math.sin(now * 0.7) * 0.6, cligne: sa > 0.3, bras: sa ? [1.5, 1.5] : [1.2 + Math.sin(now * 6) * 0.4, -0.4] });
        if (sa > 0.2) mot(A < B ? (en() ? 'whoa' : 'oh là') : 'hop', P[0] + r * 1.4, P[1] - r * 2.6 - sa * r, Math.max(11, k * 0.06), sa); }
      ecran(T[0], T[1], 2 * w * k, 2 * h * k, k * 0.1, k * lerp(0.1, 0.03, large01));
      if (large01 < 1) { const n = Pk(0, -h + 0.05); boite(n[0] - k * 0.07, n[1] - k * 0.015, k * 0.14, k * 0.03, k * 0.015, 0.7, 1 - large01); }
      trait([Pk(-w, -h + 0.16), Pk(w, -h + 0.16)], false, 0.8, 0.9);
      [0, 1, 2].forEach(i => { const p = Pk(-w + 0.09 + i * 0.07, -h + 0.08); rond(p[0], p[1], 2.2, 0.6, large01, true); });
      if (large01 < 1) [0, 1, 2].forEach(i => { const p = Pk(w - 0.14, -h + 0.05 + i * 0.03); trait([[p[0], p[1]], [p[0] + k * 0.07, p[1]]], false, 0.7, 1 - large01); });
      // l'en-tête
      const e1 = b1 ? sm((a - 0.2) / 0.5) : 1; if (e1 > 0) { const p = Pk(-w + 0.08 - (1 - e1) * 0.6, -h + 0.21); boite(p[0], p[1], (2 * w - 0.16) * k, 0.09 * k, 3, 0.8, 1); }
      // les cartes : elles se retournent (la première fois), puis suivent la mise en page
      CC.forEach(([x, y, cw, ch], i) => { const e = b1 ? sm((a - 0.6 - i * 0.3) / 0.5) : 1, fl = Math.cos((1 - e) * Math.PI / 2); if (e <= 0) return;
        // (vague 63 de l'audit, « front », immersion) : l'interface répond vraiment à la souris : la carte survolée se soulève (état :hover),
        // son ombre se décale dessous, un liseré s'allume
        const Sm = souris(), q0 = Pk(x, y), q1 = Pk(x + cw, y + ch), hv = Sm && fl > 0.9 && window.Chats.K.Wd.t - Sm.moved < 3 && Sm.x > q0[0] && Sm.x < q1[0] && Sm.y > q0[1] && Sm.y < q1[1], lift = hv ? k * 0.05 : 0;
        if (hv) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.fillRect(q0[0] + k * 0.02, q0[1] + k * 0.03, cw * k, ch * k); }
        const p = Pk(x + cw / 2 - cw / 2 * fl, y); p[1] -= lift; boite(p[0], p[1], cw * fl * k, ch * k, 5, hv ? 1.3 : 0.85, 1, true);
        if (hv) { brille(p[0] + cw * k, p[1], 3, 1, true, now, 40 + i); mot(':hover', p[0] + cw * k * 0.5, p[1] - k * 0.05, Math.max(10, k * 0.05), 0.8); }
        if (fl > 0.6) { const im = Pk(x + cw / 2, y + ch * 0.38 - lift / k); rond(im[0], im[1], Math.min(cw, ch) * 0.2 * k, 0.6, 0.9); trait([Pk(x + 0.05, y + ch * 0.78), Pk(x + cw * 0.7, y + ch * 0.78)], false, 0.5, 0.8); }
        if (c > 8.6 && c < 9.4 && i === 1) { const r = (c - 8.6) / 0.8, q = Pk(x + cw / 2, y + ch / 2); style(0.8, 1 - r); ctx.beginPath(); ctx.arc(q[0], q[1], k * 0.2 * r, 0, TAU); ctx.stroke(); rond(q[0], q[1], k * 0.035, 0.9, 1 - r); } });
      // le bouton
      const eb = b1 ? sm((a - 1.6) / 0.4) : 1, bw = Math.min(0.4, w * 1.1), bx = large01 * w * 0.5, by = h - 0.15; if (eb > 0) { const p = Pk(bx - bw / 2, by - 0.06); boite(p[0], p[1], bw * k * eb, 0.12 * k, 6, 0.95, 1, true); }
      // le curseur : il va au bouton, clique ; l'onde ; le cube jaillit
      const vc = sm((c - 1.8) / 1), cu = Pk(lerp(-0.2, bx, vc), lerp(h + 0.2, by, vc)), clic = c - 2.8;
      if (c > 1.8 && c < 4.4) cerne(() => { ctx.beginPath(); ctx.moveTo(cu[0], cu[1]); ctx.lineTo(cu[0], cu[1] + k * 0.13); ctx.lineTo(cu[0] + k * 0.035, cu[1] + k * 0.095); ctx.lineTo(cu[0] + k * 0.06, cu[1] + k * 0.14); ctx.lineTo(cu[0] + k * 0.08, cu[1] + k * 0.13); ctx.lineTo(cu[0] + k * 0.055, cu[1] + k * 0.085); ctx.lineTo(cu[0] + k * 0.095, cu[1] + k * 0.085); ctx.closePath(); }, 0.8, 1);
      if (clic > 0 && clic < 0.6) { style(0.8, 1 - clic / 0.6); ctx.beginPath(); ctx.arc(cu[0], cu[1], k * 0.25 * clic / 0.6, 0, TAU); ctx.stroke(); }
      const ec = clic > 0.2 ? Math.sin(Math.PI * c01((clic - 0.2) / 3.2)) : 0;
      if (ec > 0.01) { const s = 0.1 + ec * 0.17, Cm = cam(now * 0.6, now * 0.4, k), o = Pk(0, -0.05 - ec * 0.12);
        const Vc = (u, v, d) => { const q = Cm(u * s, v * s, d * s); return [q[0] + o[0] - G.cx, q[1] + o[1] - G.cy, q[2], q[3]]; }, F = prisme(Vc, [[-1, -1], [1, -1], [1, 1], [-1, 1]], 2, 1, 1); encre('</>', F, 1, 0.3);
        [[-1, -1, -1], [1, 1, 1], [1, -1, 1], [-1, 1, -1]].forEach(([x, y, z], i) => { const q = Vc(x, y, z); brille(q[0], q[1], 2, ec, false, now, i); }); }
      const nom = NOMS()[u < 0.5 ? A : B], al = u > 0 ? Math.abs(u - 0.5) * 2 : 1, L = Pk(0, h + 0.12); if (c > 4) mot(nom, L[0], L[1], Math.max(10, k * 0.07), al * 0.85);
    }
  };
})();

// back-end & données : un plan en 3D, vu d'en haut. Les requêtes arrivent de partout ; la passerelle (API) les range dans la file de leur client ;
// les engrenages les traitent ; chaque client a sa propre base, séparée des autres par un mur (l'isolation)
S.back = (() => ({
  cles: () => [[-0.62, -0.5], [-0.62, 0.5], [0.85, -0.45], [0.85, 0.45]],
  dessin(a, now) {
    sousLaBarre(); const [k, lx] = large(1.5, 2.1), V = cam(0.42, -0.5, k * 0.92, 0, -0.26), xA = -lx * 0.55, xW = lx * 0.05, xD = lx * 0.68, zs = [-0.45, 0, 0.45], yS = 0.3;
    // les murs entre les bases
    [-0.225, 0.225].forEach(z => { const Q = [V(xD - 0.32, yS, z), V(xD + 0.32, yS, z), V(xD + 0.32, yS - 0.42, z), V(xD - 0.32, yS - 0.42, z)]; trait(Q, true, 0.7, 0.6);
      for (let j = 1; j < 4; j++) trait([V(xD - 0.32, yS - j * 0.105, z), V(xD + 0.32, yS - j * 0.105, z)], false, 0.35, 0.4); });
    // les files : deux rails ; l'engrenage
    zs.forEach((z, i) => { [-0.07, 0.07].forEach(o => trait([V(xA + 0.14, yS, z + o), V(xW - 0.14, yS, z + o)], false, 0.5, 0.5)); trait([V(xW + 0.14, yS - 0.05, z), V(xD - 0.2, yS - 0.3, z)], false, 0.4, 0.35);
      const g = V(xW, yS - 0.1, z); rouage(g[0], g[1], k * 0.12 * g[3], now * 2 * (i % 2 ? -1 : 1)); const w = V(xW, yS, z + 0.2), r = k * 0.045 * w[3]; chabot(w[0], w[1] - r * 1.7, r, { now, ph: i, lac: -0.6, casque: false, travaille: true, bras: [0.6 + Math.sin(now * 6 + i) * 0.5, 0.6 - Math.sin(now * 6 + i) * 0.5] }); });
    // la passerelle
    // (09:57 : « le bloc API tordu » : une passerelle basse et large, avec son toit en gradin et trois portes, au lieu d'un monolithe)
    bloc(V, xA - 0.16, xA + 0.1, yS, yS - 0.26, -0.56, 0.5, 1, 0.9); bloc(V, xA - 0.12, xA + 0.06, yS - 0.26, yS - 0.34, -0.4, 0.34, 1, 0.8); zs.forEach(z => { const d = [V(xA + 0.1, yS, z - 0.08), V(xA + 0.1, yS, z + 0.08), V(xA + 0.1, yS - 0.14, z + 0.08), V(xA + 0.1, yS - 0.14, z - 0.08)]; ctx.globalAlpha = 1; ctx.fillStyle = ENC; ctx.beginPath(); d.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill(); });
    { const t = V(xA, yS - 0.34, 0.2), r = k * 0.075 * t[3]; chabot(t[0], t[1] - r * 1.75, r, { now, v: 4, lac: Math.sin(now * 0.9) * 0.9, travaille: true }); } const la = V(xA, yS - 0.34, -0.3); mot('API', la[0], la[1] - k * 0.08, Math.max(11, k * 0.09), 1);
    // les bases : des cylindres qui se remplissent
    zs.forEach((z, i) => { const r = 0.15, hh = 0.36; cylindre(V, xD, z, r, yS, yS - hh);
      const nv = Math.floor((a * 1.2 + i * 1.7) % 5); ctx.globalAlpha = 0.7; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.45; for (let j = 1; j <= 3; j++) { const C = cylindre.av || null; const L = anneau(V, r, yS - j * hh / 4, 28, xD, z), D = L.filter(p => p[2] >= V(xD, yS - j * hh / 4, z)[2] - 1e-3); if (j <= nv) { ctx.beginPath(); D.forEach((p, q) => q ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); } }
      const t = V(xD, yS - hh - 0.14, z); mot(['A', 'B', 'C'][i], t[0], t[1], Math.max(10, k * 0.08), 0.9); });
    // le cordon de velours devant la passerelle : deux potelets, la corde qui pend ; le videur, bras croisés, qui hoche la tête
    { const p0 = V(xA - 0.32, yS, -0.5), p1 = V(xA - 0.32, yS, 0.5), h0 = k * 0.2 * p0[3], h1 = k * 0.2 * p1[3];
      [[p0, h0], [p1, h1]].forEach(([p, h]) => { cerne(() => { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - h); }, 1.1, 1, null); cerne(() => { ctx.beginPath(); ctx.arc(p[0], p[1] - h, h * 0.12, 0, TAU); }, 0.7, 1); });
      cerne(() => { ctx.beginPath(); ctx.moveTo(p0[0], p0[1] - h0 * 0.9); ctx.quadraticCurveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - (h0 + h1) * 0.2, p1[0], p1[1] - h1 * 0.9); }, 1.3, 1, null);
      const v = V(xA - 0.34, yS, -0.05), r = k * 0.07 * v[3]; chabot(v[0], v[1] - r * 1.75, r, { now, ph: 12, lac: 0.7 + Math.sin(now * 0.8) * 0.2, casque: false, bras: [-0.9, -0.9] }); }
    // les requêtes : elles arrivent, sont triées, traitées, rangées
    // (vague 15 de l'audit : « la file reste une ligne à gauche ») : les requêtes arrivent de tout le ciel, par dizaines, et convergent en essaim vers la passerelle
    for (let q = 0; q < 42; q++) { const t = (now * 0.3 + q / 42) % 1, cl = Math.floor(bruit(q * 3.3) * 3), z = zs[cl], z0 = (bruit(q * 9.1) - 0.5) * 1.6; let p;
      // (vague 38 de l'audit : « back-end, peu original ») : le videur de la passerelle : une requête sur sept est refoulée au cordon (« 429 »),
      // renvoyée en tournoyant vers le ciel, un tampon sur le front
      const refus = bruit(q * 5.9) < 0.15;
      if (refus && t >= 0.25) { if (t > 0.55) continue; const e = (t - 0.25) / 0.3, b = V(xA - 0.3 - e * 0.9, yS - 0.12 - Math.sin(Math.PI * Math.min(1, e * 1.4)) * 0.45 - e * 0.3, z0), sb = k * 0.045 * b[3];
        ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(-e * 9); cerne(() => { ctx.beginPath(); ctx.rect(-sb, -sb * 0.7, sb * 2, sb * 1.4); }, 0.6, 1); ctx.restore();
        mot('429', b[0], b[1] - sb * 1.6, Math.max(9, k * 0.055), 1 - e); continue; }
      if (t < 0.25) { const e = sm(t / 0.25), x0 = (bruit(q * 4.7) * 2 - 1) * lx * 1.45, y0 = yS - 0.35 - bruit(q * 2.2) * 1.1; p = V(lerp(x0, xA - 0.12, e), lerp(y0, yS - 0.1, e) - Math.sin(Math.PI * e) * 0.15, lerp(z0 * 1.4, z, e)); } else if (t < 0.6) p = V(lerp(xA + 0.14, xW - 0.14, (t - 0.25) / 0.35), yS - 0.03, z); else if (t < 0.7) p = V(xW, yS - 0.1 - Math.sin((t - 0.6) / 0.1 * Math.PI) * 0.08, z); else { const u = (t - 0.7) / 0.3; p = V(lerp(xW + 0.14, xD, u), yS - 0.05 - u * 0.36 - Math.sin(Math.PI * u) * 0.25, z); }
      // (vague 8, l'audit : « des enveloppes qui flottent, grises ») : opaques ; en file vers la passerelle ; l'engrenage les ouvre : elles
      // ressortent en fiches de données (des lignes) et plongent dans leur base, qui fait « +1 »
      const s = k * 0.045 * p[3], al = Math.max(0.85, prof(p[2]));
      if (t < 0.65) { cerne(() => { ctx.beginPath(); ctx.rect(p[0] - s, p[1] - s * 0.7, s * 2, s * 1.4); }, 0.6, al); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; ctx.beginPath(); ctx.moveTo(p[0] - s, p[1] - s * 0.7); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + s, p[1] - s * 0.7); ctx.stroke(); }
      else { cerne(() => { ctx.beginPath(); ctx.rect(p[0] - s * 0.75, p[1] - s, s * 1.5, s * 2); }, 0.6, al); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; ctx.beginPath(); for (let j = 0; j < 3; j++) { ctx.moveTo(p[0] - s * 0.45, p[1] - s * 0.5 + j * s * 0.45); ctx.lineTo(p[0] + s * (j === 2 ? 0.1 : 0.45), p[1] - s * 0.5 + j * s * 0.45); } ctx.stroke(); }
      if (t > 0.94) { const m = V(xD + 0.12, yS - 0.5, z); mot('+1', m[0], m[1] - (t - 0.94) * k * 1.2, Math.max(10, k * 0.07), 1 - (t - 0.94) / 0.06); } }
    // (vague 61 de l'audit, « back-end », immersion) : nous aussi, on est un client. La souris porte sa propre requête (une enveloppe) ;
    // présentée au videur, elle passe (« 200 OK ») si on arrive calmement, elle est refoulée (« 429 ») si on arrive en trombe
    { const Sm = souris(); if (Sm && window.Chats.K.Wd.t - Sm.moved < 2.5 && Sm.y > G.haut && Sm.y < (G.caps || G.bas)) { const s = k * 0.05, ex = Sm.x + s * 1.4, ey = Sm.y + s * 1.2, P = V(xA - 0.2, yS - 0.1, 0), d = Math.hypot(Sm.x - P[0], Sm.y - P[1]), vit = Math.hypot(Sm.vx || 0, Sm.vy || 0);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(Math.sin(now * 3) * 0.12); cerne(() => { ctx.beginPath(); ctx.rect(-s, -s * 0.7, s * 2, s * 1.4); }, 0.7, 1); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.4; ctx.beginPath(); ctx.moveTo(-s, -s * 0.7); ctx.lineTo(0, 0); ctx.lineTo(s, -s * 0.7); ctx.stroke(); ctx.restore();
      if (d < k * 0.45) { const trop = vit > 900; mot(trop ? '429' : '200 OK', P[0] - k * 0.12, Math.max(G.haut + k * 0.06, P[1] - k * 0.66), Math.max(13, k * 0.08), 1); if (!trop) coche(ex + s * 1.4, ey - s, s * 0.6, 1, 1.1); else { style(1.2, 1); ctx.beginPath(); ctx.moveTo(ex + s, ey - s * 1.6); ctx.lineTo(ex + s * 1.8, ey - s * 0.8); ctx.moveTo(ex + s * 1.8, ey - s * 1.6); ctx.lineTo(ex + s, ey - s * 0.8); ctx.stroke(); } } } }
    ctx.restore();
  }
}))();

// DevOps & cloud : la boucle sans fin, en 3D, comme un circuit vu d'en haut ; des conteneurs en font le tour et passent sous les portiques
// (build, test, déploie, surveille), qui s'allument à leur passage ; dessous, l'écran du monitoring et son pouls
S.devops = (() => ({
  cles: () => [[-1, 0], [1, 0], [0, 0], [-0.5, -0.35]],
  dessin(a, now) {
    const [k, lx] = large(1.4, 2.1), V = cam(Math.sin(now * 0.25) * 0.18, -0.62, k, 0, -0.04), sx = lx * 0.92;
    const at = t => { const d = 1 + Math.sin(t) ** 2; return [sx * Math.cos(t) / d, -0.16 * Math.sin(t), 1.35 * Math.sin(t) * Math.cos(t) / d]; };
    const nor = t => { const p = at(t - 0.01), q = at(t + 0.01), dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    const bord = o => { const L = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * TAU, p = at(t), [tx, tz] = nor(t); L.push(V(p[0] - tz * o, p[1], p[2] + tx * o)); } return L; };
    // (vague 16 de l'audit : « le circuit tourne seul au milieu ») : au-dessus, tout le ciel est le cloud : des nuages de papier (chacun ses serveurs)
    // dérivent d'un bord à l'autre ; à chaque déploiement, une étincelle part du portique « déploie » vers l'un d'eux, qui s'allume et coche
    sousLaBarre();
    { const top = G.haut + 18, y1 = Math.max(top + 10, G.cy - k * 0.6), mw = Math.min(0.9, lx * 0.5) * k * 0.62 + k * 0.1, my = G.cy - k * 0.72, Wn = G.droite - G.gauche, Tq = 1.1, n = Math.floor(now / Tq), u = (now % Tq) / Tq, cible = Math.floor(bruit(n * 3.7) * 16), dep = V(...at(3.5));
      for (let j = 0; j < 16; j++) { const x = G.gauche + ((bruit(j * 4.1) + now * 0.012 * (0.6 + bruit(j))) % 1) * Wn, y = lerp(top, y1, bruit(j * 6.3)), r = k * (0.07 + bruit(j * 2.9) * 0.06), on = j === cible && u > 0.55 ? 1 - (u - 0.55) / 0.45 : 0, pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
        if (pc && Math.hypot(x - pc.x, y - pc.y) < pc.r * 1.3 + r * 2) continue; if (Math.abs(x - G.cx) < mw + r * 1.5 && Math.abs(y - my) < k * 0.2 + r) continue;
        cerne(() => { ctx.beginPath(); ctx.arc(x - r * 0.9, y + r * 0.2, r * 0.6, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(x, y - r * 0.2, r * 0.85, Math.PI, 0); ctx.arc(x + r * 0.95, y + r * 0.2, r * 0.55, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); }, 0.7, 1, on > 0 ? '#ffe9a8' : PAP);
        ctx.fillStyle = ENC; for (let l = 0; l < 3; l++) { ctx.globalAlpha = 1; ctx.fillRect(x - r * 0.5 + l * r * 0.38, y + r * 0.05, r * 0.26, r * 0.4); }
        if (on > 0) { coche(x + r * 1.1, y - r * 0.9, r * 0.35, 1, 0.9); eclat(x, y, r * 1.2, 1 - on, 8, j); }
        if (j === cible && u < 0.55) { const e = sm(u / 0.55), sx = lerp(dep[0], x, e), sy = lerp(dep[1], y, e) - Math.sin(Math.PI * e) * k * 0.4; brille(sx, sy, 3, 1, true, now, j); } } }
    ctx.restore();
    trait3(bord(0.08), 1, 1); trait3(bord(-0.08), 1, 1);
    const lab = en() ? ['build', 'test', 'deploy', 'monitor'] : ['build', 'test', 'déploie', 'surveille'], ST = [0.35, 1.25, 3.5, 4.4];
    const conts = []; for (let q = 0; q < 12; q++) conts.push((now * 0.5 + q / 12 * TAU) % TAU);
    ST.forEach((t, i) => { const p = at(t), [tx, tz] = nor(t), G3 = (u, v, d) => V(p[0] - tz * u + tx * d, p[1] + v, p[2] + tx * u + tz * d);
      const vif = conts.some(u => Math.abs(Math.atan2(Math.sin(u - t), Math.cos(u - t))) < 0.12);
      [[-0.15, -0.12], [0.12, 0.15]].forEach(([u0, u1]) => prisme(G3, [[u0, 0], [u1, 0], [u1, -0.24], [u0, -0.24]], 0.04, 1, 0.7)); prisme(G3, [[-0.16, -0.22], [0.16, -0.22], [0.16, -0.28], [-0.16, -0.28]], 0.05, 1, 0.7);
      // (vague 7, l'audit : « des portiques plats, qui ne font rien ») : chaque portique agit sur ce qui passe dessous.
      // build : une presse descend et tamponne la boîte ; test : une coche jaillit ; déploie : la boîte file dans un petit nuage de papier ; surveille : un œil la suit
      const pr = conts.reduce((m, u) => Math.min(m, Math.abs(Math.atan2(Math.sin(u - t), Math.cos(u - t)))), 9), e = Math.max(0, 1 - pr / 0.25);
      if (i === 0) { const y = -0.2 + Math.sin(e * Math.PI / 2) * 0.1; prisme(G3, [[-0.02, -0.28], [0.02, -0.28], [0.02, y - 0.02], [-0.02, y - 0.02]], 0.03, 1, 0.6); prisme(G3, [[-0.08, y - 0.02], [0.08, y - 0.02], [0.08, y + 0.01], [-0.08, y + 0.01]], 0.08, 1, 0.7);
        if (e > 0.85) { const q = G3(0, -0.02, 0); mot('tchac', q[0] + k * 0.12, q[1] - k * 0.05, Math.max(10, k * 0.055), e); } }
      else if (i === 1 && e > 0.2) { const q = G3(0, -0.36 - e * 0.08, 0), r = k * 0.045 * q[3] * (0.6 + e * 0.4);
        cerne(() => { ctx.beginPath(); ctx.moveTo(q[0] - r, q[1]); ctx.lineTo(q[0] - r * 0.25, q[1] + r * 0.75); ctx.lineTo(q[0] + r * 1.1, q[1] - r * 0.9); }, 1.8, e, null); }
      else if (i === 2) { const q = G3(0, -0.34, 0), r = k * 0.05 * q[3] * (1 + e * 0.35);
        cerne(() => { ctx.beginPath(); ctx.arc(q[0] - r * 0.7, q[1], r * 0.55, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(q[0], q[1] - r * 0.35, r * 0.75, Math.PI, 0); ctx.arc(q[0] + r * 0.75, q[1], r * 0.5, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); }, 1, 1);
        if (e > 0.3) mot('↑', q[0], q[1] + r * 0.2, Math.max(10, k * 0.06), e); }
      else if (i === 3) { const q = G3(0, -0.36, 0), r = k * 0.05 * q[3], near = conts.map(u => [u, Math.atan2(Math.sin(u - t), Math.cos(u - t))]).sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0], lo = clamp(-near[1] * 2, -1, 1);
        cerne(() => { ctx.beginPath(); ctx.moveTo(q[0] - r * 1.2, q[1]); ctx.quadraticCurveTo(q[0], q[1] - r * 0.95, q[0] + r * 1.2, q[1]); ctx.quadraticCurveTo(q[0], q[1] + r * 0.95, q[0] - r * 1.2, q[1]); ctx.closePath(); }, 1, 1);
        ctx.fillStyle = ENC; ctx.beginPath(); ctx.arc(q[0] + lo * r * 0.45, q[1], r * 0.32, 0, TAU); ctx.fill(); ctx.fillStyle = PAP; ctx.beginPath(); ctx.arc(q[0] + lo * r * 0.45 - r * 0.1, q[1] - r * 0.1, r * 0.09, 0, TAU); ctx.fill(); }
      });
    // les conteneurs : de vraies petites boîtes, orientées dans le sens de la marche
    conts.map((t, q) => ({ t, q, p: at(t) })).sort((p, q) => p.p[2] - q.p[2]).forEach(({ t, q, p }) => { const [tx, tz] = nor(t), c = (u, w, y) => V(p[0] + tx * u - tz * w, p[1] + y, p[2] + tz * u + tx * w);
      prisme((u, v, d) => c(u, d, v), [[-0.08, 0], [0.08, 0], [0.08, -0.09], [-0.08, -0.09]], 0.1, prof(c(0, 0, 0)[2], 1), 0.6);
      if (q === 0) { const h = c(0, 0, -0.09), r = k * 0.05 * h[3]; chabot(h[0], h[1] - r * 1.7, r, { now, v: 1, lac: 0.5, bras: [1.3, 1.3] }); } });
    // le monitoring : un écran, son pouls qui défile
    // (vague 42, l'audit : « devops », finition) : l'étiquette ne sort jamais de l'écran, et un liseré d'encre la détache des portiques
    ST.forEach((t, i) => { const p = at(t), m = V(p[0], p[1] - 0.47, p[2]), px = Math.max(11, k * 0.08); ctx.font = `600 ${px}px "Space Grotesk",system-ui,sans-serif`;
      const w2 = ctx.measureText(lab[i]).width / 2 + 4, x = Math.max(G.gauche + w2, Math.min(G.droite - w2, m[0]));
      ctx.globalAlpha = 1; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, px * 0.32); ctx.strokeStyle = 'rgb(9,11,18)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(lab[i], x, m[1]);
      mot(lab[i], x, m[1], px, 1); });
    const mw = Math.min(0.9, lx * 0.5) * k, mh = 0.2 * k, mc = [G.cx, G.cy - k * 0.72]; ecran(mc[0] - mw / 2, mc[1] - mh / 2, mw, mh, k * 0.06, 5);
    const M = []; for (let i = 0; i <= 70; i++) { const u = i / 70, t = u * 3.5 - now * 0.8, f = t - Math.floor(t), b = f > 0.4 && f < 0.5 ? Math.sin((f - 0.4) / 0.1 * TAU) * 0.35 : 0; M.push([mc[0] - mw * 0.45 + u * mw * 0.9, mc[1] - b * mh]); } trait(M, false, 0.8, 1);
  }
}))();

// sécurité & qualité : un dôme en 3D (méridiens, parallèles) posé sur les données (un cadenas) ; au sol, le radar balaie ;
// ce qui arrive du dehors frappe le dôme : une onde se propage à sa surface, la menace éclate ; le compteur des bloqués monte
S.secu = (() => ({
  cles: () => [0, 1, 2, 3, 4, 5].map(i => [Math.cos(i / 6 * TAU) * 0.6, Math.sin(i / 6 * TAU) * 0.6]),
  dessin(a, now) {
    sousLaBarre(); const [k, lx] = large(1.2, 2), V = cam(now * 0.2, -0.42, k, 0, 0.14), R = 0.82, sw = now * 1.3;
    trait3(anneau(V, Math.min(1.8, lx * 0.9), 0, 64), 0.5, 0.35); trait3(anneau(V, R * 1.3, 0, 64), 0.5, 0.5);
    for (let j = 0; j < 9; j++) { const t = sw - j * 0.05; trait([V(0, 0, 0), V(Math.cos(t) * R * 1.3, 0, Math.sin(t) * R * 1.3)], false, 0.9 - j * 0.07, 0.9 - j * 0.1); }
    // le dôme
    [15, 35, 55, 75].forEach(d => { const f = d * Math.PI / 180; trait3(anneau(V, R * Math.cos(f), -R * Math.sin(f), 40), 0.7, 0.9); });
    for (let j = 0; j < 10; j++) { const t = j / 10 * TAU, L = []; for (let i = 0; i <= 12; i++) { const f = i / 12 * Math.PI / 2; L.push(V(Math.cos(t) * R * Math.cos(f), -R * Math.sin(f), Math.sin(t) * R * Math.cos(f))); } trait3(L, 0.7, 0.9); }
    trait3(anneau(V, R, 0, 48), 1.3, 1);
    // le cadenas
    const c0 = V(0, -0.12, 0), s = k * 0.12; cerne(() => { ctx.beginPath(); ctx.arc(c0[0], c0[1] - s * 0.1, s * 0.62, Math.PI, 0); }, 1.6, 1, null); cerne(() => { ctx.beginPath(); ctx.rect(c0[0] - s, c0[1] - s * 0.1, 2 * s, 1.5 * s); }, 1, 1);
    ctx.fillStyle = ENC; ctx.beginPath(); ctx.arc(c0[0], c0[1] + s * 0.5, s * 0.16, 0, TAU); ctx.fill(); ctx.fillRect(c0[0] - s * 0.06, c0[1] + s * 0.5, s * 0.12, s * 0.4);
    { const g = V(0.4, 0, 0.25), r = k * 0.075 * g[3]; chabot(g[0], g[1] - r * 1.75, r, { now, v: 2, lac: Math.sin(now * 0.6) * 0.9, travaille: true, bras: [0.9 + Math.sin(now * 4) * 0.3, -0.3] }); }
    // les menaces (vague 15 de l'audit : « quelques cailloux près du dôme ») : une pluie qui vient de tout le ciel, de loin, par dizaines
    const T = 2.4, NQ = G.cx * 2 < 700 ? 9 : 14; let bloq = 0;
    // (vague 36 de l'audit : « sécurité, peu original ») : les menaces repoussées ne repartent plus dans le vide : elles filent dans un bocal
    // de quarantaine posé à côté du dôme, où elles s'entassent et s'agitent ; un chat-robot au filet à papillons fait le guet devant
    const o0 = V(0, 0, 0), J = [o0[0] - Math.min(k * 1.4, G.cx * 0.72), o0[1] + k * 0.02], jr = Math.max(14, k * 0.17), jm = [J[0], J[1] - jr * 2.1];
    for (let q = 0; q < NQ; q++) { const tt = a + q * T / NQ, t = tt % T, n = Math.floor(tt / T), th = bruit(q * 7 + n * 13) * TAU, ph = 0.2 + bruit(q * 3 + n * 5) * 1.1, dir = [Math.cos(th) * Math.cos(ph), -Math.sin(ph), Math.sin(th) * Math.cos(ph)];
      bloq += n; const pt = d => V(dir[0] * d, dir[1] * d, dir[2] * d);
      if (t < 1.2) { const d = lerp(4.2, R, sm(t / 1.2) * 0.4 + t / 1.2 * 0.6), p = pt(d), p0 = pt(d + 0.3); trait([p0, p], false, 0.9, 0.9); caillou(p[0], p[1], k * 0.08 * p[3], Math.sin(now * 3 + q) * 0.3, q * 7 + n, 1, true); }
      else if (t < 2.2) { const u = (t - 1.2) / 1, p = pt(R); eclat(p[0], p[1], 12, u, 7, th);
        // (vague 7) repoussé : le petit méchant rebondit sur le dôme et repart en tournoyant, sonné
        if (u < 0.8) { const b0 = pt(R), e = sm(u / 0.8), r0 = k * 0.08 * b0[3] * (1 - e * 0.55), bx = lerp(b0[0], jm[0], e), by = lerp(b0[1], jm[1], e) - Math.sin(e * Math.PI) * k * 0.45;
          caillou(bx, by, r0, u * 9, q * 7 + n, 1, true); if (u < 0.35) mot(pick2(['paf', 'bonk', 'toc'], q + n), b0[0], b0[1] - r0 * 2.2, Math.max(10, k * 0.06), 1 - u * 2.5); }
        // l'onde, à la surface du dôme
        const up = Math.abs(dir[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0], cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nz = v => { const l = Math.hypot(...v); return v.map(x => x / l); }, e1 = nz(cr(dir, up)), e2 = cr(dir, e1), rho = 0.06 + u * 0.55, L = [];
        for (let i = 0; i <= 28; i++) { const w = i / 28 * TAU, v = dir.map((x, j) => x * Math.cos(rho) + (e1[j] * Math.cos(w) + e2[j] * Math.sin(w)) * Math.sin(rho)); if (v[1] > 0.02) { if (L.length > 1) trait(L, false, 0.9, (1 - u) * 0.9); L.length = 0; continue; } L.push(V(v[0] * R, v[1] * R, v[2] * R)); }
        if (L.length > 1) trait(L, false, 0.9, (1 - u) * 0.9); } }
    // le bocal : le verre (un peu bleuté), son couvercle, son étiquette ; dedans, les petits méchants capturés qui s'agitent
    { const hB = jr * 2, n = Math.min(12, bloq), br = jr * 0.26;
      cerne(() => { ctx.beginPath(); ctx.moveTo(J[0] - jr * 0.7, J[1] - hB); ctx.quadraticCurveTo(J[0] - jr * 1.05, J[1] - hB * 0.85, J[0] - jr, J[1] - hB * 0.6); ctx.lineTo(J[0] - jr, J[1] - jr * 0.15);
        ctx.quadraticCurveTo(J[0] - jr, J[1], J[0] - jr * 0.8, J[1]); ctx.lineTo(J[0] + jr * 0.8, J[1]); ctx.quadraticCurveTo(J[0] + jr, J[1], J[0] + jr, J[1] - jr * 0.15); ctx.lineTo(J[0] + jr, J[1] - hB * 0.6);
        ctx.quadraticCurveTo(J[0] + jr * 1.05, J[1] - hB * 0.85, J[0] + jr * 0.7, J[1] - hB); ctx.closePath(); }, 0.9, 1, 'rgba(200,225,255,0.22)');
      for (let i = 0; i < n; i++) { const cx = J[0] + (bruit(i * 5.3) - 0.5) * jr * 1.3 + Math.sin(now * 9 + i * 2) * jr * 0.06, cy = J[1] - br * 1.1 - Math.floor(i / 4) * br * 1.5 - Math.abs(Math.sin(now * 7 + i * 1.7)) * jr * 0.12;
        caillou(cx, cy, br, now * 2 + i, i * 11 + 3, 1, true); }
      cerne(() => { ctx.beginPath(); ctx.rect(J[0] - jr * 0.82, J[1] - hB - jr * 0.28 - (n && Math.sin(now * 11) > 0.7 ? jr * 0.06 : 0), jr * 1.64, jr * 0.3); }, 0.9, 1);
      mot(en() ? 'quarantine' : 'quarantaine', J[0], J[1] - hB * 0.45, Math.max(9, jr * 0.3), 0.85);
      const g = [J[0] + jr * 1.7, J[1]], r = jr * 0.55, sw = Math.sin(now * 2.6); chabot(g[0], g[1] - r * 1.75, r, { now, ph: 9, lac: -0.5, casque: false, bras: [0.4 + sw * 0.5, -0.2] });
      const hx = g[0] - r * 0.9, hy = g[1] - r * 2.3, fx = hx - r * 1.3 * Math.cos(sw * 0.6), fy = hy - r * 1.6 + Math.sin(sw * 0.6) * r * 0.6;
      cerne(() => { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy); }, 1, 1, null); cerne(() => { ctx.beginPath(); ctx.ellipse(fx, fy - r * 0.35, r * 0.42, r * 0.55, sw * 0.3, 0, TAU); }, 0.8, 1, 'rgba(255,255,255,0.35)'); }
    // le compteur, en haut du dôme, sur un petit écran de papier (il était caché sous les sous-titres)
    { const o = V(0, 0, 0), w = Math.max(k * 0.52, 108), h = Math.max(k * 0.14, 28), m = [Math.min(o[0] + R * k * 1.2, G.cx * 2 - w * 0.62 - 10), o[1] - R * k * (G.cx * 2 < 700 ? 1.25 : 0.8)]; ecran(m[0] - w / 2, m[1] - h / 2, w, h, k * 0.03, 3); mot(`${en() ? 'blocked' : 'bloqués'} : ${bloq}`, m[0], m[1], Math.max(12, k * 0.075), 1); }
    ctx.restore();
    // (vague 62 de l'audit, « sécurité », immersion) : la souris est une intruse. En approchant du dôme, elle y allume des alvéoles hexagonales
    // (le bouclier se renforce là où elle pousse) ; si elle entre, « accès refusé »
    { const Sm = souris(); if (Sm && window.Chats.K.Wd.t - Sm.moved < 2.5) { const C = V(0, -R * 0.4, 0), Rs = Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map(j => { const p = V(Math.cos(j / 8 * TAU) * R, -R * 0.4, Math.sin(j / 8 * TAU) * R); return Math.hypot(p[0] - C[0], p[1] - C[1]); }).concat([Math.hypot(V(0, -R, 0)[1] - C[1], 0)]));
      const dx = Sm.x - C[0], dy = Sm.y - C[1], d = Math.hypot(dx, dy) || 1, pr = c01((Rs * 1.5 - d) / (Rs * 0.5)); if (pr > 0.02) { const ux = dx / d, uy = dy / d, P = [C[0] + ux * Math.min(d, Rs * 0.95), C[1] + uy * Math.min(d, Rs * 0.95)], hr = Math.max(7, k * 0.045);
        const hex = (x, y, r, al) => { style(0.8, al); ctx.beginPath(); for (let j = 0; j <= 6; j++) { const t = j / 6 * TAU + Math.PI / 6; j ? ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r) : ctx.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } ctx.stroke(); };
        hex(P[0], P[1], hr, pr); for (let j = 0; j < 6; j++) { const t = j / 6 * TAU, rr = hr * 1.75, pul = 0.6 + 0.4 * Math.sin(now * 8 - j); hex(P[0] + Math.cos(t) * rr, P[1] + Math.sin(t) * rr, hr, pr * 0.7 * pul); }
        for (let j = 0; j < 12; j++) { const t = j / 12 * TAU, rr = hr * 3.4; hex(P[0] + Math.cos(t) * rr, P[1] + Math.sin(t) * rr, hr * 0.9, pr * 0.3 * (0.5 + 0.5 * Math.sin(now * 6 - j))); }
        brille(P[0], P[1], 4, pr, true, now, 3);
        if (d < Rs) mot(en() ? 'access denied' : 'accès refusé', Sm.x, Sm.y + k * 0.12, Math.max(12, k * 0.065), 1); } } }
  }
}))();

// leadership & méthode (29/09, 07:51, Mathieu : « vois plus grand ; tu peux faire un bus que je conduis, comme les vieux jeux où tu dois conduire
// sur la route pour éviter les obstacles ») : une route de l'espace, à la manière des jeux d'arcade, vers une planète à anneaux qui se lève ;
// le bus de l'équipe (Mathieu au volant, l'équipe aux fenêtres : des chats-robots et des collègues) change de voie pour éviter les bugs,
// les astéroïdes, les cônes et les deadlines, et ramasse les étoiles (les jalons). La souris sur le ciel : c'est vous qui conduisez
S.pilotage = (() => {
  const E = { t: null, bx: 0, lane: 0, obs: [], next: 0, jal: 0, bonk: -9, mots: [], roul: 0, n: 0 };
  const ptr = () => { const W = window.Chats && Chats.K && Chats.K.Wd, P = W && W.ptr; return P && P.on && W.t - P.moved < 2.5 ? P : null; };
  const SORTES = ['bug', 'roc', 'cone', 'bug', 'horloge', 'roc', 'etoile', 'etoile'];
  return {
    cles: () => [[0, -0.55], [-1, 0.8], [1, 0.8], [0, 0.45]],
    dessin(a, now) {
      const dt = E.t == null ? 0 : Math.min(0.05, Math.max(0, now - E.t)); E.t = now; if (a < 0.1) { E.obs = []; E.jal = 0; E.n = 0; }
      // (le bus se pose juste au-dessus des sous-titres ; la caméra est un peu à gauche : on voit son flanc)
      const hz = G.haut + (G.caps - G.haut) * 0.2, zb = 2.5, hc = 1.35, f = (G.caps - 8 - hz) * zb / hc, D = G.caps - hz, V = 9.5, camX = G.sw < 300 ? -0.75 : -1.5, cx = G.cx + camX * f / zb * 0.8;
      const Pp = (x, y, z) => { const zz = Math.max(0.3, z); return [cx + (x - camX) * f / zz, hz + (hc - y) * f / zz, zz]; };
      // le ciel : la planète à anneaux se lève derrière l'horizon, ses anneaux ; les étoiles filent vers nous
      ctx.save(); ctx.beginPath(); ctx.rect(G.gauche - 40, G.haut + 4, G.droite - G.gauche + 80, hz - G.haut - 4); ctx.clip();
      const R = Math.min(D * 0.42, (hz - G.haut - 12) / 0.72), py = hz + R * 0.55 - Math.min(1, a / 5) * R * 0.25;   // (vague 44 : la planète ne touche plus le haut, son anneau n'est plus coupé)
      trait((() => { const L = []; for (let i = 0; i <= 60; i++) { const t = Math.PI + i / 60 * Math.PI; L.push([cx + Math.cos(t) * R * 1.7, py + Math.sin(t) * R * 0.28]); } return L; })(), false, 0.8, 0.8);
      rond(cx, py, R, 1.2, 1, 'nuit');
      for (let j = 1; j < 5; j++) { ctx.save(); ctx.beginPath(); ctx.arc(cx, py, R, 0, TAU); ctx.clip(); style(0.5, 0.45); ctx.beginPath(); ctx.ellipse(cx, py - R + j * R * 0.38, R * 1.1, R * 0.08, -0.08, 0, TAU); ctx.stroke(); ctx.restore(); }
      trait((() => { const L = []; for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI; L.push([cx + Math.cos(t) * R * 1.7, py + Math.sin(t) * R * 0.28]); } return L; })(), false, 1.1, 1);
      ctx.restore();
      // le sol : des lignes de grille qui défilent (l'arcade), les bords de la route, ses pointillés (rien sous les sous-titres)
      ctx.save(); ctx.beginPath(); ctx.rect(G.gauche - 60, hz - 2, G.droite - G.gauche + 120, G.caps + 6 - hz); ctx.clip();
      E.roul = (E.roul + dt * V) % 2;
      for (let j = 0; j < 22; j++) { const z = zb * 0.8 + j * 2 - E.roul; if (z < 1) continue; const L = Pp(-9, 0, z), Rr = Pp(9, 0, z); trait([L, Rr], false, 0.45, 0.12 + 0.35 * c01(4 / z)); }
      for (let x = -8; x <= 8; x += 1.6) trait([Pp(x, 0, 1.6), Pp(x, 0, 60)], false, 0.4, 0.14);
      [-1.6, 1.6].forEach(x => trait([Pp(x, 0, 1.4), Pp(x, 0, 60)], false, 1.2, 1));
      [-0.53, 0.53].forEach(x => { for (let j = 0; j < 16; j++) { const z0 = 1.6 + j * 2.4 - (E.roul * 1.2) % 2.4, z1 = z0 + 1.1; if (z0 < 1.4) continue; trait([Pp(x, 0, z0), Pp(x, 0, z1)], false, 0.9 * c01(6 / z0 + 0.3), 0.8); } });
      ctx.restore();
      // (vague 44, l'audit : « le bus », finition) : le sol ne s'arrête plus sur une coupe nette : il finit sur le bord d'une dalle d'arcade,
      // une lèvre épaisse avec son chant, et des rivets qui défilent au rythme de la route
      { const zf = hc * f / (G.caps + 4 - hz), A = Pp(-8, 0, zf), B = Pp(8, 0, zf), xa = Math.max(G.gauche - 20, A[0]), xb = Math.min(G.droite + 20, B[0]), y = G.caps + 4, ep = Math.max(3, Math.min(6, D * 0.025));
        ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = NUIT; ctx.fillRect(xa, y - 1, xb - xa, ep + 2); ctx.restore();
        trait([[xa, y], [xb, y]], false, 1.3, 1); trait([[xa, y + ep], [xb, y + ep]], false, 0.6, 0.5);
        for (let x = xa + ((E.roul * 40) % 40); x < xb; x += 40) rond(x, y + ep * 0.5, Math.max(1.2, ep * 0.18), 0.6, 0.6); }
      // (vague 22 de l'audit : « le bus ») : le long de la route défilent des lampadaires de papier à tête de chat, en alternance à gauche et à droite ;
      // leurs oreilles, leurs yeux-ampoules qui s'allument : la vitesse se sent, la route a un décor
      for (let j = 13; j >= 0; j--) { const z = 1.7 + j * 3.2 - (E.roul * 1.6) % 3.2, sd = j % 2 ? 1 : -1; if (z < 1.6 || z > 40) continue;
        const b = Pp(sd * 2.5, 0, z), h = Pp(sd * 2.5, 1.5, z), bras = Pp(sd * 2.05, 1.5, z), r = Math.max(2, (b[1] - h[1]) * 0.16), al = c01(9 / z);
        cerne(() => { ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(h[0], h[1]); ctx.lineTo(bras[0], bras[1]); }, Math.max(0.35, 0.9 * al), 1, null);
        if (r > 3) { cerne(() => { ctx.beginPath(); ctx.arc(bras[0], bras[1] + r, r, 0, TAU); ctx.moveTo(bras[0] - r * 0.9, bras[1] + r * 0.6); ctx.lineTo(bras[0] - r * 0.7, bras[1] - r * 0.3); ctx.lineTo(bras[0] - r * 0.2, bras[1] + r * 0.1); ctx.moveTo(bras[0] + r * 0.9, bras[1] + r * 0.6); ctx.lineTo(bras[0] + r * 0.7, bras[1] - r * 0.3); ctx.lineTo(bras[0] + r * 0.2, bras[1] + r * 0.1); }, 0.7, 1);
          [-1, 1].forEach(g => { ctx.globalAlpha = 1; ctx.fillStyle = z < 12 ? '#ffe9a8' : ENC; ctx.beginPath(); ctx.ellipse(bras[0] + g * r * 0.35, bras[1] + r * 1.05, r * 0.16, r * 0.24, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = ENC; ctx.lineWidth = 1; ctx.stroke(); }); }
        else rond(bras[0], bras[1], 1.5, 0.5, al, true); }
      // les obstacles : ils viennent de l'horizon, sur une des trois voies
      if (now > E.next) { E.next = now + 0.75 + bruit(E.n * 3.3) * 0.7; const sorte = SORTES[Math.floor(bruit(E.n * 7.1) * SORTES.length)], l = Math.floor(bruit(E.n * 1.9) * 3) - 1; E.obs.push({ x: l * 1.06, z: 46, sorte, ph: bruit(E.n) * TAU, n: E.n++ }); }
      E.obs.forEach(o => { o.z -= V * dt; });
      // la conduite : le pilote automatique regarde loin devant et prend la voie la plus libre ; la souris sur le ciel : c'est vous
      const P = ptr(), libre = l => Math.min(99, ...E.obs.filter(o => o.sorte !== 'etoile' && !o.fini && Math.abs(o.x - l * 1.06) < 0.5 && o.z > zb - 0.5).map(o => o.z - zb));
      const etoile = l => E.obs.some(o => o.sorte === 'etoile' && !o.fini && Math.abs(o.x - l * 1.06) < 0.5 && o.z > zb && o.z < zb + 9);
      if (P) E.lane = clamp(((P.x - cx) / (f / zb) + camX) / 1.06, -1.2, 1.2);
      else { const sc = l => Math.min(libre(l), 16) + (etoile(l) ? 3 : 0) - Math.abs(l - E.lane) * 0.6; E.lane = [-1, 0, 1].reduce((b, l) => sc(l) > sc(b) + 0.4 ? l : b, Math.round(clamp(E.lane, -1, 1))); }
      const vis = E.lane * 1.06, vbx = clamp(vis - E.bx, -dt * 3.2, dt * 3.2); E.bx += vbx; const roulis = -vbx / Math.max(dt, 1e-3) / 3.2 * 0.06;
      // les chocs et les jalons
      E.obs.forEach(o => { if (o.fini || o.z > zb + 2.4 || o.z < zb) return; if (Math.abs(o.x - E.bx) > 0.72) return; o.fini = now;
        if (o.sorte === 'etoile') { E.jal++; E.mots.push({ t: '+1', x: o.x, z: zb + 1, t0: now }); } else { E.bonk = now; E.mots.push({ t: pick2(['bonk', 'boum', 'ouille'], o.n), x: o.x, z: zb + 1, t0: now }); } });
      E.obs = E.obs.filter(o => o.z > 0.8 && !(o.fini && now - o.fini > 0.5));
      // dessin, du fond vers nous
      // (vague 27, l'audit : « le bus ») : des portiques d'autoroute enjambent la route, un panneau par étape de la feuille de route
      // (les mots du sous-titre) ; ils arrivent de l'horizon et passent au-dessus du bus
      const PQ = en() ? ['Tech lead', 'Management', 'Mentoring', 'Augmented dev', 'Agile', 'ADR', 'Pre-sales'] : ['Tech lead', 'Management', 'Mentorat', 'Dév. augmenté', 'Agile', 'ADR', 'Avant-vente'];
      const portique = () => { const per = 4.6, n = Math.floor(now / per), z = 44 - (now / per - n) * per * V; if (z < 1.2 || z > 44) return null; return { z, txt: PQ[n % PQ.length] }; }, pq = portique();
      const dessinePortique = ({ z, txt }) => { ctx.save(); ctx.beginPath(); ctx.rect(G.gauche - 60, G.haut + 4, G.droite - G.gauche + 120, G.caps - G.haut - 4); ctx.clip();
        const al = c01((44 - z) / 5), H2 = 2.3, g0 = Pp(-2.3, 0, z), g1 = Pp(-2.3, H2, z), d0 = Pp(2.3, 0, z), d1 = Pp(2.3, H2, z), pa = Pp(-1.35, H2 + 0.1, z), pb = Pp(1.35, H2 - 0.6, z);
        cerne(() => { ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(d1[0], d1[1]); ctx.lineTo(d0[0], d0[1]); }, Math.max(0.4, 1.1 * c01(8 / z)), al, null);
        cerne(() => { ctx.beginPath(); ctx.rect(pa[0], pa[1], pb[0] - pa[0], pb[1] - pa[1]); }, 0.9, al);
        const hh = pb[1] - pa[1]; if (hh > 6) { ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.5, G.lw * 0.35); ctx.strokeRect(pa[0] + hh * 0.08, pa[1] + hh * 0.08, pb[0] - pa[0] - hh * 0.16, hh * 0.84);
          ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = ENC; let fp = Math.round(hh * 0.42); ctx.font = `700 ${fp}px "Space Grotesk",system-ui,sans-serif`; const mw = (pb[0] - pa[0]) * 0.86, tw = ctx.measureText(txt).width; if (tw > mw) { fp = Math.floor(fp * mw / tw); ctx.font = `700 ${fp}px "Space Grotesk",system-ui,sans-serif`; } ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + hh * 0.03); ctx.restore(); }
        ctx.restore(); };
      if (pq && pq.z > zb + 0.5) dessinePortique(pq);
      E.obs.filter(o => o.z > zb + 1).sort((p, q) => q.z - p.z).forEach(o => obstacle(o, Pp, now, D));
      bus(Pp, E.bx, zb, roulis, now, E.bonk, a, camX);
      // (vague 31, l'audit : « le bus ») : le pot d'échappement crache des petits nuages de papier, ronds, qui gonflent, montent et restent
      // sur la route derrière (ils défilent vers nous) ; au choc, un gros nuage noirâtre et un « pouêt »
      { const kb = G.sw < 500 ? 0.72 : 1, cote = E.bx - camX > 0 ? -1 : 1;
        for (let j = 0; j < 7; j++) { const t = fr2(now * 1.6 + j / 7), x = E.bx + (-cote * 0.3 + (bruit(j * 3.1 + Math.floor(now * 1.6 + j / 7)) - 0.5) * 0.3) * kb, y = (0.12 + t * 0.9) * kb, z = zb - 0.1 - t * 1.6, p = Pp(x, y, z), r = (4 + t * 16) * p[2] ** -0.4 * (G.sw < 500 ? 0.7 : 1) * (now - E.bonk < 0.8 ? 1.8 : 1);
          if (z < 0.4 || p[1] > G.caps) continue; cerne(() => { ctx.beginPath(); for (let q = 0; q < 4; q++) { const aq = q / 4 * TAU + j; ctx.moveTo(p[0] + Math.cos(aq) * r * 0.55 + r * 0.45, p[1] + Math.sin(aq) * r * 0.4); ctx.arc(p[0] + Math.cos(aq) * r * 0.55, p[1] + Math.sin(aq) * r * 0.4, r * 0.45, 0, TAU); } }, 0.6, 1 - t * 0.6); }
        if (now - E.bonk < 0.6) { const p = Pp(E.bx, 1.5 * kb, zb + 1.2); mot(en() ? 'honk!' : 'pouêt !', p[0], p[1] - 10, Math.max(13, D * 0.06), 1 - (now - E.bonk) / 0.6); } }
      if (pq && pq.z <= zb + 0.5) dessinePortique(pq);
      E.obs.filter(o => o.z <= zb + 1).sort((p, q) => q.z - p.z).forEach(o => obstacle(o, Pp, now, D));
      E.mots = E.mots.filter(m => now - m.t0 < 0.9); E.mots.forEach(m => { const u = (now - m.t0) / 0.9, p = Pp(m.x, 1.3 + u * 0.6, m.z); mot(m.t, p[0], p[1], Math.max(14, D * 0.08), 1 - u); });
      // le compteur des jalons ; la consigne (la souris prend le volant)
      const t0 = [G.gauche + 24, G.haut + 18]; mot(`${en() ? 'milestones' : 'jalons'} ★ ${E.jal}`, t0[0], t0[1], Math.max(12, D * 0.055), 0.9, 'left');
      mot(P ? (en() ? 'you drive' : 'c’est vous qui conduisez') : (en() ? 'mouse: take the wheel' : 'la souris : prenez le volant'), t0[0], t0[1] + Math.max(16, D * 0.075), Math.max(10, D * 0.042), P ? 0.9 : 0.55, 'left');
    }
  };
  function pick2(L, n) { return L[Math.floor(bruit(n * 5.7) * L.length)]; }
  function fr2(v) { return v - Math.floor(v); }
  // un obstacle, à sa distance : un bug (un vrai petit insecte), un astéroïde, un cône de chantier, une horloge (la deadline) ; ou une étoile (un jalon)
  function obstacle(o, Pp, now, D) {
    const p = Pp(o.x, 0, o.z), s = D * 1.55 / o.z * 0.36, al = c01((46 - o.z) / 6), fin = o.fini ? c01((now - o.fini) / 0.5) : 0; if (s < 1.5) return;
    if (o.sorte === 'etoile') { const y = p[1] - s * 1.4 - Math.sin(now * 5 + o.ph) * s * 0.15; if (fin) { eclat(p[0], y, s * 0.9, fin, 8, o.ph); return; } brille(p[0], y, Math.max(2.5, s * 0.35), al, true, now, o.n);
      style(0.9, al); ctx.beginPath(); for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i / 10 * TAU, r = s * (i % 2 ? 0.28 : 0.7); ctx.lineTo(p[0] + Math.cos(t) * r, y + Math.sin(t) * r); } ctx.closePath(); ctx.stroke(); return; }
    if (fin) { eclat(p[0], p[1] - s * 0.6, s * 1.2, fin, 9, o.ph); return; }
    ctx.globalAlpha = al;
    if (o.sorte === 'roc') { const y = p[1] - s * 0.75; cerne(() => { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const t = i / 12 * TAU + now * 0.8, r = s * 0.75 * (0.8 + 0.25 * bruit(o.n * 13 + i % 12)); ctx.lineTo(p[0] + Math.cos(t) * r, y + Math.sin(t) * r); } ctx.closePath(); }, 0.8, al);
      ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.5; [[0.2, -0.2, 0.18], [-0.3, 0.15, 0.12], [0.15, 0.35, 0.1]].forEach(([u, v, r]) => { const t = now * 0.8; ctx.beginPath(); ctx.arc(p[0] + (u * Math.cos(t) - v * Math.sin(t)) * s, y + (u * Math.sin(t) + v * Math.cos(t)) * s, r * s, 0, TAU); ctx.stroke(); }); }
    else if (o.sorte === 'cone') { cerne(() => { ctx.beginPath(); ctx.moveTo(p[0] - s * 0.55, p[1]); ctx.lineTo(p[0] - s * 0.1, p[1] - s * 1.35); ctx.quadraticCurveTo(p[0], p[1] - s * 1.45, p[0] + s * 0.1, p[1] - s * 1.35); ctx.lineTo(p[0] + s * 0.55, p[1]); ctx.closePath(); }, 0.8, al);
      ctx.fillStyle = ENC; [0.35, 0.8].forEach(v => { const w0 = 0.55 - v * 0.34, w1 = 0.55 - (v + 0.2) * 0.34; ctx.beginPath(); ctx.moveTo(p[0] - s * w0, p[1] - s * v); ctx.lineTo(p[0] + s * w0, p[1] - s * v); ctx.lineTo(p[0] + s * w1, p[1] - s * (v + 0.2)); ctx.lineTo(p[0] - s * w1, p[1] - s * (v + 0.2)); ctx.closePath(); ctx.fill(); }); }
    else if (o.sorte === 'horloge') { const y = p[1] - s * 0.95; cerne(() => { ctx.beginPath(); ctx.arc(p[0], y, s * 0.7, 0, TAU); }, 0.8, al); cerne(() => { ctx.beginPath(); ctx.arc(p[0] - s * 0.55, y - s * 0.6, s * 0.2, 0, TAU); }, 0.7, al); cerne(() => { ctx.beginPath(); ctx.arc(p[0] + s * 0.55, y - s * 0.6, s * 0.2, 0, TAU); }, 0.7, al);
      ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.7; const t = now * 6; ctx.beginPath(); ctx.moveTo(p[0], y); ctx.lineTo(p[0] + Math.sin(t) * s * 0.5, y - Math.cos(t) * s * 0.5); ctx.moveTo(p[0], y); ctx.lineTo(p[0] + s * 0.3, y); ctx.stroke();
      [-1, 1].forEach(g => { ctx.beginPath(); ctx.moveTo(p[0] + g * s * 0.4, y + s * 0.6); ctx.lineTo(p[0] + g * s * 0.55, y + s * 0.95); ctx.stroke(); }); }
    else { // le bug : un scarabée, six pattes qui s'agitent, deux antennes, deux yeux ; il trottine d'un côté à l'autre
      const y = p[1] - s * 0.5, x = p[0] + Math.sin(now * 2 + o.ph) * s * 0.3, w = Math.sin(now * 18 + o.ph);
      ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = G.lw * 0.8; ctx.globalAlpha = al;
      for (let i = 0; i < 3; i++) [-1, 1].forEach(g => { const yy = y - s * 0.25 + i * s * 0.25, k = (i % 2 ? w : -w) * 0.15; ctx.beginPath(); ctx.moveTo(x + g * s * 0.4, yy); ctx.lineTo(x + g * s * 0.75, yy - s * (0.1 + k)); ctx.lineTo(x + g * s * 0.9, yy + s * 0.15); ctx.stroke(); });
      [-1, 1].forEach(g => { ctx.beginPath(); ctx.moveTo(x + g * s * 0.12, y - s * 0.62); ctx.quadraticCurveTo(x + g * s * 0.3, y - s * 1.05, x + g * s * 0.45, y - s * (0.95 + w * 0.05)); ctx.stroke(); });
      cerne(() => { ctx.beginPath(); ctx.ellipse(x, y, s * 0.46, s * 0.55, 0, 0, TAU); }, 0.8, al);
      ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.5; ctx.beginPath(); ctx.moveTo(x, y - s * 0.3); ctx.lineTo(x, y + s * 0.5); ctx.stroke();
      ctx.fillStyle = ENC; ctx.beginPath(); ctx.arc(x - s * 0.18, y - s * 0.35, s * 0.08, 0, TAU); ctx.arc(x + s * 0.18, y - s * 0.35, s * 0.08, 0, TAU); ctx.fill(); }
  }
  // le bus : une vraie boîte en 3D (l'arrière, le toit, le flanc qu'on voit), des fenêtres avec l'équipe ; le chauffeur, c'est lui ; il penche dans les virages
  function bus(Pp, bx, zb, roulis, now, bonk, a, camX) {
    const kb = G.sw < 500 ? 0.72 : 1, w = 0.56, h = 1.2, Lg = 3.4, sh = now - bonk < 0.35 ? Math.sin((now - bonk) * 60) * 0.03 : 0, bump = Math.abs(Math.sin(now * 9)) * 0.012 + sh;
    const Q = (x, y, z) => { const r = roulis * (y - 0.1); return Pp(bx + (x + r) * kb, (y + bump) * kb, zb + z * kb); };   // (kb : plus petit sur téléphone)
    const cote = bx - camX > 0 ? -1 : 1;   // (le flanc qu'on voit : celui qui regarde le milieu de la route)
    // le flanc : ses fenêtres, l'équipe qui y passe la tête
    const F = [Q(cote * w, 0.12, 0), Q(cote * w, 0.12, Lg), Q(cote * w, h, Lg), Q(cote * w, h, 0)];
    cerne(() => { ctx.beginPath(); F.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }, 1, 1);
    for (let j = 0; j < 4; j++) { const z0 = 0.2 + j * 0.58, z1 = z0 + 0.45, W4 = [Q(cote * w, 0.55, z0), Q(cote * w, 0.55, z1), Q(cote * w, 0.86, z1), Q(cote * w, 0.86, z0)];
      trait(W4, true, 0.7, 1, false); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.8; ctx.beginPath(); W4.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
      const m = Q(cote * w, 0.64, (z0 + z1) / 2), rr = Math.abs(W4[1][1] - W4[2][1]) * 0.42; if (j < 3 && rr > 3) chabot(m[0], m[1] - Math.abs(Math.sin(now * 3 + j)) * rr * 0.1, rr, { now, ph: j * 2, lac: cote * 0.6, casque: false, bras: [-1.4, -1.4], cligne: Math.sin(now * 1.3 + j * 2) > 0.97 }); }
    // (vague 5, l'audit : « le flanc reste peu détaillé ») : une bande peinte sur toute la longueur, la porte à soufflet à l'avant (deux vantaux
    // vitrés, les charnières, la marche), le rétroviseur ; des passages de roue en arc ; des roues rondes, avec leur pneu, leur jante et leurs écrous
    const pl3 = (L, f) => { ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (f) ctx.closePath(); };
    ctx.globalAlpha = 1; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.7;
    [0.4, 0.46].forEach(y => { pl3([Q(cote * w, y, 0.05), Q(cote * w, y, Lg - 0.05)]); ctx.stroke(); });
    for (let z = 0.35; z < Lg - 0.9; z += 0.5) { const p = Q(cote * w, 0.43, z), r = Math.abs(Q(cote * w, 0.46, z)[1] - Q(cote * w, 0.4, z)[1]) * 0.35; if (r > 1) { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fillStyle = ENC; ctx.fill(); } }
    { const z0 = Lg - 0.78, z1 = Lg - 0.22, zm = (z0 + z1) / 2, D = [Q(cote * w, 0.14, z0), Q(cote * w, 0.14, z1), Q(cote * w, 1.02, z1), Q(cote * w, 1.02, z0)];
      ctx.fillStyle = PAP; pl3(D, true); ctx.fill(); ctx.lineWidth = G.lw * 0.9; ctx.stroke();
      [[z0 + 0.04, zm - 0.02], [zm + 0.02, z1 - 0.04]].forEach(([a0, a1]) => { const Wd = [Q(cote * w, 0.5, a0), Q(cote * w, 0.5, a1), Q(cote * w, 0.95, a1), Q(cote * w, 0.95, a0)]; ctx.fillStyle = NUIT; pl3(Wd, true); ctx.fill(); ctx.lineWidth = G.lw * 0.6; ctx.stroke();
        const g = [Q(cote * w, 0.2, a0), Q(cote * w, 0.2, a1), Q(cote * w, 0.44, a1), Q(cote * w, 0.44, a0)]; pl3(g, true); ctx.stroke(); });
      pl3([Q(cote * w, 0.14, zm), Q(cote * w, 1.02, zm)]); ctx.lineWidth = G.lw * 0.9; ctx.stroke();
      const st = [Q(cote * (w + 0.08), 0.1, z0), Q(cote * (w + 0.08), 0.1, z1), Q(cote * w, 0.1, z1), Q(cote * w, 0.1, z0)]; ctx.fillStyle = PAP; pl3(st, true); ctx.fill(); ctx.lineWidth = G.lw * 0.7; ctx.stroke(); }
    { const a0 = Q(cote * w, 0.92, Lg - 0.05), a1 = Q(cote * (w + 0.22), 0.98, Lg + 0.05), rm = Math.abs(Q(cote * w, 0.12, Lg)[1] - Q(cote * w, 0.24, Lg)[1]);
      ctx.lineWidth = G.lw * 0.8; pl3([a0, a1]); ctx.stroke(); cerne(() => { ctx.beginPath(); ctx.ellipse(a1[0], a1[1] + rm * 0.6, rm * 0.35, rm * 0.7, 0, 0, TAU); }, 0.7, 1); }
    [0.45, Lg - 1.05].forEach(z => { const c = Q(cote * w, 0.12, z), r = Math.abs(Q(cote * w, 0.36, z)[1] - c[1]);
      ctx.fillStyle = NUIT; ctx.beginPath(); ctx.ellipse(c[0], c[1], r * 0.72, r * 1.18, 0, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.8; ctx.stroke();
      // la roue : le pneu (épais, noir, cerné de blanc), la jante de papier, le moyeu, cinq écrous qui tournent
      cerne(() => { ctx.beginPath(); ctx.ellipse(c[0], c[1], r * 0.62, r, 0, 0, TAU); }, 0.9, 1, NUIT);
      ctx.globalAlpha = 1; ctx.fillStyle = PAP; ctx.beginPath(); ctx.ellipse(c[0], c[1], r * 0.36, r * 0.6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.7; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(c[0], c[1], r * 0.13, r * 0.22, 0, 0, TAU); ctx.stroke();
      for (let k = 0; k < 5; k++) { const t = now * 14 + k * TAU / 5; ctx.beginPath(); ctx.arc(c[0] + Math.cos(t) * r * 0.24, c[1] + Math.sin(t) * r * 0.4, Math.max(1, r * 0.045), 0, TAU); ctx.fillStyle = ENC; ctx.fill(); }
      // les rainures du pneu, qui défilent
      style(0.5, 0.8); for (let k = 0; k < 8; k++) { const t = now * 14 + k * TAU / 8, cx = Math.cos(t), sy = Math.sin(t); if (cx < -0.2) continue; ctx.beginPath(); ctx.moveTo(c[0] + cx * r * 0.44, c[1] + sy * r * 0.72); ctx.lineTo(c[0] + cx * r * 0.58, c[1] + sy * r * 0.94); ctx.stroke(); } });
    // le toit ; l'arrière (la grande vitre, l'équipe de dos, les feux)
    const T = [Q(-w, h, 0), Q(w, h, 0), Q(w, h, Lg), Q(-w, h, Lg)]; cerne(() => { ctx.beginPath(); T.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }, 1, 1);
    // (vague 4 : « une boîte blanche ») : sur le toit, les bagages de l'équipe, en papier, sanglés ; une valise qui tressaute
    { const Vq = (x, y, z) => { const p = Q(x, y, z); return [p[0], p[1], -p[2]]; };
      [[-0.35, 0.05, 0.3, 0.9, 0.22], [0.08, 0.4, 0.5, 1.3, 0.3], [-0.3, 0.1, 1.5, 2.1, 0.18], [0.12, 0.42, 1.9, 2.6, 0.26]].forEach(([x0, x1, z0, z1, hh], j) => {
        const sa = j === 1 ? Math.abs(Math.sin(now * 9 + 1)) * 0.03 : 0; bloc(Vq, x0, x1, h + sa, h + hh + sa, z0, z1, 1, 0.6); }); }
    const B = [Q(-w, 0.12, 0), Q(w, 0.12, 0), Q(w, h, 0), Q(-w, h, 0)]; cerne(() => { ctx.beginPath(); B.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }, 1, 1);
    const Wv = [Q(-w * 0.8, 0.5, 0), Q(w * 0.8, 0.5, 0), Q(w * 0.8, 0.86, 0), Q(-w * 0.8, 0.86, 0)]; ctx.globalAlpha = 1; ctx.fillStyle = NUIT; ctx.beginPath(); Wv.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw; ctx.stroke();
    // de dos, par la vitre : l'équipe (des têtes rondes, des oreilles de chat), et lui au volant, tout devant (ses épis)
    const vw = Wv[1][0] - Wv[0][0], vy = Wv[0][1];
    ctx.save(); ctx.beginPath(); Wv.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
    const lui = Q(0.1, 0.62, 2.2), rl = vw * 0.06; style(0.7, 0.9); rond(lui[0], lui[1] + Math.sin(now * 3) * 1, rl, 0.7, 0.9, 'nuit'); ctx.beginPath(); [-0.6, -0.2, 0.2, 0.6].forEach(d => { const b = -Math.PI / 2 + d; ctx.moveTo(lui[0] + Math.cos(b) * rl, lui[1] + Math.sin(b) * rl); ctx.lineTo(lui[0] + Math.cos(b) * rl * 1.5, lui[1] + Math.sin(b) * rl * 1.5); }); ctx.stroke();
    const vo = Q(0.1, 0.55, 2.3); style(0.6, 0.8); ctx.beginPath(); ctx.ellipse(vo[0], vo[1], rl * 1.6, rl * 0.5, 0, 0, TAU); ctx.stroke();
    [-0.55, 0, 0.55].forEach((u, j) => { const x = Wv[0][0] + vw * (0.5 + u * 0.72), y = vy - vw * 0.02 + Math.abs(Math.sin(now * 3 + j * 1.7)) * 2, r = vw * 0.11;
      ctx.globalAlpha = 1; ctx.fillStyle = PAP; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.8; ctx.beginPath(); ctx.moveTo(x - r, y + r); ctx.lineTo(x - r * 0.9, y - r * 0.9); ctx.lineTo(x - r * 0.35, y - r * 0.6); ctx.quadraticCurveTo(x, y - r * 0.75, x + r * 0.35, y - r * 0.6); ctx.lineTo(x + r * 0.9, y - r * 0.9); ctx.lineTo(x + r, y + r); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    ctx.restore();
    // les feux (rouges : ils brillent au freinage), la plaque, le pot et ses bouffées
    [[-w * 0.78, 0.25], [w * 0.78, 0.25]].forEach(([x, y]) => { const p = Q(x, y, 0); cerne(() => { ctx.beginPath(); ctx.arc(p[0], p[1], vw * 0.045, 0, TAU); }, 0.7, 1); brille(p[0], p[1], vw * 0.03, 0.9, Math.abs(roulis) > 0.02, now, x); });
    const pl = Q(0, 0.3, 0), pw = vw * 0.34, ph = vw * 0.1; boite(pl[0] - pw / 2, pl[1] - ph / 2, pw, ph, 3, 0.7, 1, true); mot('MW · 2026', pl[0], pl[1] + 1, Math.max(8, ph * 0.62), 1);
    for (let j = 0; j < 4; j++) { const u = (now * 2 + j / 4) % 1, p = Q(w * 0.6 + u * 0.1, 0.16 + u * 0.3, -u * 1.2); rond(p[0], p[1], vw * (0.03 + u * 0.07), 0.6, 0.6 * (1 - u)); }
  }
})();
S.rag = S.ia;

// la toile, l'écran du ciel, les outils ; puis : une scène existe-t-elle ?
return { S, pose(c, g, o) { ctx = c; G = g; O = o; } };
})();
