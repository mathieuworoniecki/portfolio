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
// (vague 96 de l'audit, finition : chaque mot d'une scène a son halo de nuit, lisible même posé sur un dessin, une route, un trait)
function mot(t, x, y, px, a, al) { ctx.globalAlpha = a; ctx.fillStyle = `rgb(${BL})`; ctx.font = `600 ${px}px "Space Grotesk",system-ui,sans-serif`; ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = NUIT; ctx.lineWidth = Math.max(2.5, px * 0.26); ctx.strokeText(t, x, y); ctx.fillText(t, x, y); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
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
const BUEE = { vu: false };
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
  // (vague 133 de l'audit : « le chat-robot », de très bien à inoubliable) : la buée. De temps en temps, chacun à son heure, il soupire dans son
  // casque : une tache de buée gagne le bas de la vitre, il y dessine un cœur du bout du doigt, puis la buée se resserre et disparaît en rétrécissant
  const cyB = 16 + bruit(ph * 1.7 + 3) * 10, tB = window.__bue ?? (now + bruit(ph * 2.3 + 1) * cyB) % cyB,   // (__bue : pour les captures de test)
    bue = o.casque !== false && r >= 12 && !o.cligne && tB < 2.8 && !(dS < r * 2.8) ? tB : -1, gB = bruit(ph * 4.1) < 0.5 ? -1 : 1;
  if (bue >= 0 && bue > 0.35 && bue < 2.1) { bras = bras.slice(); bras[gB < 0 ? 0 : 1] = 1.05 + Math.sin(bue * 9) * 0.18; }
  if (Sp && r >= 8 && o.vise !== false && !INST.q && !(AGV.e > 0.3 && now - AGV.t < 0.3) && dS < r * 4.5 && (!VISE.c || dS / r < VISE.c.d)) { const m = ctx.getTransform(), q = { d: dS / r, id: ph, x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, r: r * Math.hypot(m.a, m.b) }; if (q.x > 0 && q.y > 0 && q.x < ctx.canvas.width && q.y < ctx.canvas.height && q.r < ctx.canvas.height * 0.3) VISE.c = q; }
  [-1, 1].forEach((g, i) => { const b = bras[i], ex = x + g * bw * 0.86, ey = by - bh * 0.35, mx = ex + g * Math.cos(b) * r * 0.42, my = ey - Math.sin(b) * r * 0.42;
    cerne(() => { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(mx, my); }, w * 1.5, a, null); cerne(() => { ctx.beginPath(); ctx.arc(mx, my, r * 0.13, 0, TAU); }, w, a); });
  // (vague 32, l'audit : « le chat-robot ») : une queue de chat mécanique, en anneaux qui rapetissent, qui ondule derrière lui ; le bout, une petite boule
  if (r >= 6) { const cq = sl > 0.05 ? -1 : sl < -0.05 ? 1 : (bruit(ph * 3.3) < 0.5 ? -1 : 1), n = 6, P = [];
    for (let i = 0; i <= n; i++) { const u = i / n, on = Math.sin(now * 3.2 + ph * 2 - u * 2.6) * 0.5 * u; P.push([x + cq * (bw * 0.7 + Math.sin(u * 1.9 + on) * r * 0.95), by + bh * 0.55 - Math.sin(u * 2.4) * r * 0.9 * (1 - on * 0.3) - u * r * 0.2]); }
    cerne(() => { ctx.beginPath(); P.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); }, w * 1.6, a, null);
    ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.6, G.lw * w * 0.45); for (let i = 1; i < n; i++) { const [qx, qy] = P[i], [px, py] = P[i - 1], d = Math.hypot(qx - px, qy - py) || 1, nx = -(qy - py) / d, ny = (qx - px) / d, e = r * 0.1 * (1 - i / n * 0.5); ctx.beginPath(); ctx.moveTo(qx - nx * e, qy - ny * e); ctx.lineTo(qx + nx * e, qy + ny * e); ctx.stroke(); }
    cerne(() => { ctx.beginPath(); ctx.arc(P[n][0], P[n][1], r * 0.1, 0, TAU); }, w, a); }
  // (vague 152) : deux bottes rondes de scaphandre sous la combinaison (leurs semelles), qui battent doucement en apesanteur
  if (r >= 6 && (o.bottes ?? o.casque !== false)) [-1, 1].forEach(g => { const px = x + g * bw * 0.42 + sl * r * 0.1, py = by + bh * 0.92 + Math.sin(now * 2.4 + ph + g) * r * 0.04; cerne(() => { ctx.beginPath(); ctx.ellipse(px, py, r * 0.24, r * 0.15, g * 0.15, 0, TAU); }, w, a);
    ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.5; ctx.beginPath(); ctx.moveTo(px - r * 0.2, py + r * 0.05); ctx.quadraticCurveTo(px, py + r * 0.12, px + r * 0.2, py + r * 0.05); ctx.stroke(); });
  cerne(() => { ctx.beginPath(); ctx.ellipse(x - sl * r * 0.9, by - bh * 0.1, r * 0.34, bh * 0.62, 0, 0, TAU); }, w, a * (Math.abs(sl) > 0.15 ? 1 : 0));
  cerne(() => { ctx.beginPath(); ctx.moveTo(x - bw, by - bh * 0.55); ctx.quadraticCurveTo(x - bw * 1.05, by + bh, x, by + bh); ctx.quadraticCurveTo(x + bw * 1.05, by + bh, x + bw, by - bh * 0.55); ctx.quadraticCurveTo(x, by - bh * 0.95, x - bw, by - bh * 0.55); ctx.closePath(); }, w, a);
  // le voyant de poitrine (il clignote quand il travaille), la ceinture
  ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.7; ctx.beginPath(); ctx.moveTo(x - bw * 0.8, by + bh * 0.35); ctx.quadraticCurveTo(x, by + bh * 0.5, x + bw * 0.8, by + bh * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + sl * bw * 0.4, by + bh * 0.02, r * 0.1, 0, TAU); ctx.fillStyle = o.travaille && Math.sin(now * 12 + ph) > 0 ? ENC : PAP; ctx.fill(); ctx.stroke();
  // (vague 23 de l'audit : « le chat-robot astronaute ») : du volume à la plume, comme la planète des chats : quelques hachures du côté de l'ombre
  const hach = (cx, cy, rx, ry, n) => { if (r < 9) return; ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip(); ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.55, G.lw * w * 0.2); ctx.lineCap = 'round'; ctx.beginPath();
    // (vague 152 : à l'encre pleine, fines, en traits courts qui partent du bord : plus de gris boueux)
    for (let i = 0; i < n; i++) { const u = cx + rx * (0.55 + i * 0.45 / n) - sl * rx * 0.3; ctx.moveTo(u, cy - ry * (0.1 - i * 0.12)); ctx.lineTo(u + ry * 0.35, cy + ry); } ctx.stroke(); ctx.restore(); };
  hach(x, by + bh * 0.2, bw * 0.95, bh * 0.75, 4);
  // (vague 152) : le col rigide du scaphandre, où se visse le casque, et ses deux rivets (sous la tête : on n'en voit que les côtés)
  if (o.casque !== false && r >= 8) { const cy0 = by - bh * 0.7, hx0 = x + sl * r * 0.06; cerne(() => { ctx.beginPath(); ctx.ellipse(hx0, cy0, r * 0.95, r * 0.2, 0, 0, TAU); }, w * 0.8, a);
    ctx.globalAlpha = a; ctx.fillStyle = ENC; [-1, 1].forEach(g => { ctx.beginPath(); ctx.arc(hx0 + g * r * 0.78 + sl * r * 0.1, cy0 + r * 0.03, Math.max(0.8, r * 0.05), 0, TAU); ctx.fill(); }); }
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
  // (vague 152 de l'audit : « le chat-robot ») : le casque à l'encre pleine ; un reflet en deux traits (un long, un point) ; le col rigide du
  // scaphandre, où le casque se visse (ses deux rivets) ; le reflet glisse un peu quand il tourne la tête
  if (o.casque !== false) { style(0.55 * w, a); ctx.beginPath(); ctx.arc(hx, y - r * 0.08, r * 1.32, 0, TAU); ctx.stroke();
    const rf = -2.35 + sl * 0.4; style(0.95 * w, a); ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(hx, y - r * 0.08, r * 1.15, rf - 0.32, rf + 0.22); ctx.stroke(); ctx.beginPath(); ctx.arc(hx, y - r * 0.08, r * 1.15, rf + 0.38, rf + 0.42); ctx.stroke();
 }
  if (bue >= 0) { const gr = sm(c01(bue / 0.45)) * (1 - sm(c01((bue - 2.1) / 0.6))), fx = hx + gB * r * 0.78, fy = y + r * 0.5, rx = r * 0.5 * gr, ry = r * 0.36 * gr;
    if (gr > 0.02) { ctx.save(); ctx.beginPath(); ctx.arc(hx, y - r * 0.08, r * 1.3, 0, TAU); ctx.clip(); ctx.globalAlpha = a * 0.62; ctx.fillStyle = 'rgb(176,196,232)'; ctx.beginPath(); ctx.ellipse(fx, fy, rx, ry, gB * 0.3, 0, TAU); ctx.fill();
      for (let j = 0; j < 5; j++) { const t = j / 5 * TAU + ph; ctx.beginPath(); ctx.arc(fx + Math.cos(t) * rx * 0.95, fy + Math.sin(t) * ry * 0.95, r * 0.12 * gr, 0, TAU); ctx.fill(); }
      // le cœur, tracé du doigt : un seul trait qui avance
      const tc = c01((bue - 0.45) / 1.3), hs = r * 0.24 * gr; if (tc > 0) { ctx.globalAlpha = a; ctx.strokeStyle = '#ff7f9f'; ctx.lineWidth = Math.max(1.4, G.lw * w * 0.8); ctx.lineCap = 'round'; ctx.beginPath(); const N = Math.ceil(40 * tc);
        for (let i = 0; i <= N; i++) { const t = i / 40 * TAU, px = 16 * Math.sin(t) ** 3, py = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t), X = fx + px / 16 * hs, Y = fy - py / 16 * hs; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); }
      ctx.restore();
      if (bue < 0.5 && r >= 16) mot(en() ? 'haaa' : 'pfff', hx - gB * r * 1.2, y - r * 1.2, Math.max(10, r * 0.32), 1);
      if (tc >= 1 && !BUEE.vu && window.Dex && Dex.vu) { BUEE.vu = true; Dex.vu('buee'); } } }
}
// (vague 79, l'audit : « le chat-robot », il sort de sa scène) : c'est une IA, il nous analyse. La souris s'attarde près d'un chat-robot : de ses
// yeux partent deux traits de balayage jusqu'à elle, puis un cadre de détection se referme autour du pointeur, par-dessus tout l'écran, avec son
// étiquette de papier (« souris · 0,97 », le score qui hésite) ; la souris s'en va : le cadre se rétracte sur lui-même (jamais de fondu)
const VISE = { c: null, k: 0, id: null, px: 0, py: 0, t: 0 };
// (dessiné sur sa propre toile, tout en haut : par-dessus le chat qui s'agrippe au pointeur ; effacée dès qu'on ne l'appelle plus)
let VC = null, VT = 0;
const AGV = { t: 0, e: 0, p: null }, TH = { t: 0, e: 0, id: null }, ROUGE = { nc: -1, id: null, v: null }, OLA = { t: -99, el: null };
const LUI = { t: 0, h: 0, t0: -99 }, TAMPON = [];
function toileVise(cv0) {
  if (!VC) { VC = document.createElement('canvas'); VC.setAttribute('aria-hidden', 'true'); VC.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2'; document.body.appendChild(VC); }
  if (VC.width !== cv0.width || VC.height !== cv0.height) { VC.width = cv0.width; VC.height = cv0.height; }
  const o = VC.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, VC.width, VC.height);
  const n = ++VT; requestAnimationFrame(() => requestAnimationFrame(() => { if (n === VT && VC) VC.getContext('2d').clearRect(0, 0, VC.width, VC.height); })); return o;
}
// le coup de tampon sur la vitre : il descend de haut (grand, un peu flou de vitesse), frappe (une onde, des éclaboussures d'encre), reste,
// encré de travers avec ses manques ; puis se ratatine sur lui-même (jamais de fondu)
function tamponVitre(o, q, t) {
  const dp = q.dp, R = 58 * dp, desc = c01(t / 0.14), sc = t < 0.14 ? 2.4 - 1.4 * desc * desc : 1 + Math.max(0, 0.12 - (t - 0.14)) * 0.8, fin = 1 - sm(c01((t - 2.9) / 0.5));
  if (fin <= 0) return; o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.translate(q.x, q.y); o.lineCap = o.lineJoin = 'round';
  if (t > 0.14 && t < 0.6) { const u = (t - 0.14) / 0.46; o.globalAlpha = 1 - u; o.strokeStyle = `rgb(${BL})`; o.lineWidth = 2 * dp * (1 - u); o.beginPath(); o.arc(0, 0, R * (1.1 + u * 1.6), 0, TAU); o.stroke();
    for (let i = 0; i < 9; i++) { const b = i / 9 * TAU + q.rot * 3, d = R * (1.15 + u * (0.6 + (i % 3) * 0.3)); o.globalAlpha = 1; o.fillStyle = `rgb(${BL})`; o.beginPath(); o.arc(Math.cos(b) * d, Math.sin(b) * d, dp * (2.2 - u * 1.6) * (1 + (i % 2)), 0, TAU); o.fill(); } }
  o.rotate(q.rot + (1 - desc) * 0.4); o.scale(sc * fin, sc * fin); o.globalAlpha = t < 0.14 ? 0.35 + 0.5 * desc : 0.92;
  // (un liseré de nuit sous chaque trait : le tampon se lit aussi posé sur du papier blanc)
  const dbl = (lw, f) => { o.strokeStyle = NUIT; o.lineWidth = lw + 3.5 * dp; f(); o.stroke(); o.strokeStyle = `rgb(${BL})`; o.lineWidth = lw; f(); o.stroke(); };
  dbl(3.4 * dp, () => { o.beginPath(); o.arc(0, 0, R, 0, TAU); }); dbl(1.5 * dp, () => { o.beginPath(); o.arc(0, 0, R * 0.84, 0, TAU); });
  dbl(2 * dp, () => { o.beginPath(); o.moveTo(-R * 0.52, R * 0.17); o.lineTo(R * 0.52, R * 0.17); });
  const mt = (t, px, y) => { o.font = `700 ${Math.round(px * dp)}px "Space Grotesk",system-ui,sans-serif`; o.textAlign = 'center'; o.textBaseline = 'middle'; o.strokeStyle = NUIT; o.lineWidth = 4 * dp; o.strokeText(t, 0, y); o.fillStyle = `rgb(${BL})`; o.fillText(t, 0, y); };
  mt(en() ? 'APPROVED' : 'VALIDÉ', 18, -R * 0.08); mt(en() ? 'HUMAN IN THE LOOP' : 'DÉCISION HUMAINE', 9.5, R * 0.4);
  // l'encre qui a mal pris : des manques (on gratte des petits trous dans ce qu'on vient d'encrer)
  if (t >= 0.14) { o.globalCompositeOperation = 'destination-out'; o.globalAlpha = 1; for (let i = 0; i < 26; i++) { const b = bruit(i * 7.3 + q.rot * 50) * TAU, d = bruit(i * 3.1 + q.rot * 20) * R * 1.05; o.beginPath(); o.arc(Math.cos(b) * d, Math.sin(b) * d, dp * (0.8 + bruit(i * 1.7) * 2.2), 0, TAU); o.fill(); } o.globalCompositeOperation = 'source-over'; }
  o.restore();
}
// (vague 79, l'audit : « le bus », il sort de sa scène) : une étoile ramassée ne reste pas sur la route : elle s'envole hors de la scène,
// en arc, jusqu'à la barre de progression du haut de l'écran, où elle éclate ; un choc (bonk) secoue toute l'interface
const ENVOL = [];
function gagneEtoile(p, now) { const m = ctx.getTransform(); ENVOL.push({ x: m.a * p[0] + m.c * p[1] + m.e, y: m.b * p[0] + m.d * p[1] + m.f, t0: now, s: bruit(now * 13.7) }); }
function secoueUI(dx) { if (reduitMvt()) return; const g = dx > 0 ? -1 : 1;
  document.querySelectorAll('#brand, #lang-pick, #theme-pick, .film-ui .ctrl > *, #chap > *').forEach((e, i) => { const d = 4 + (i % 3) * 2;
    e.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${g * d}px,${-d * 0.6}px) rotate(${g * 4}deg)` }, { transform: `translate(${-g * d * 0.5}px,${d * 0.3}px) rotate(${-g * 2}deg)` }, { transform: 'translate(0,0) rotate(0deg)' }], { duration: 420, delay: i * 12, easing: 'ease-out', composite: 'add' }); }); }
const reduitMvt = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function cibleBarre() { const M = window.EspacePlume && EspacePlume.M, B = M && M.lay && M.lay.barre, C = M && M.sc; if (!B || !B.seg || !C) return null;
  const g = B.seg[C.S.ch] || B.seg[0]; return [g.x + g.w * c01((C.i - B.seg.slice(0, C.S.ch).reduce((n, q) => n + q.n, 0) + 0.5) / g.n), B.bas - 4]; }
function envols(o, now) {
  const cv = o.canvas, dp = dpDe(cv), T = cibleBarre(); if (!T) { ENVOL.length = 0; return; } const tx = T[0] * dp, ty = T[1] * dp;
  o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.lineCap = o.lineJoin = 'round';
  ENVOL.forEach(q => { const t = now - q.t0, u = c01(t / 0.95), e = u * u * (3 - 2 * u), cx = (q.x + tx) / 2 + (q.s - 0.5) * 300 * dp, cy = Math.min(q.y, ty) - 180 * dp;
    const at = v => [(1 - v) * (1 - v) * q.x + 2 * (1 - v) * v * cx + v * v * tx, (1 - v) * (1 - v) * q.y + 2 * (1 - v) * v * cy + v * v * ty];
    if (u < 1) { // la traîne d'étincelles, puis l'étoile qui tourne et rapetisse en approchant
      for (let k = 1; k < 9; k++) { const p = at(Math.max(0, e - k * 0.035)); o.globalAlpha = 1; o.fillStyle = `rgb(${BL})`; o.beginPath(); o.arc(p[0] + Math.sin(k * 2.3 + t * 20) * 3 * dp, p[1], dp * (2.6 - k * 0.25), 0, TAU); o.fill(); }
      const p = at(e), R = dp * (16 - 9 * e) * (0.6 + 0.4 * c01(t / 0.12)); o.save(); o.translate(p[0], p[1]); o.rotate(t * 9);
      o.beginPath(); for (let i = 0; i < 10; i++) { const b = i / 10 * TAU - Math.PI / 2, r = i % 2 ? R * 0.45 : R; o.lineTo(Math.cos(b) * r, Math.sin(b) * r); } o.closePath();
      o.strokeStyle = NUIT; o.lineWidth = 4 * dp; o.stroke(); o.fillStyle = PAP; o.fill(); o.strokeStyle = ENC; o.lineWidth = 1.4 * dp; o.stroke(); o.restore(); }
    else { // l'arrivée : un éclat en étoile sur la barre, un « +1 »
      const v = c01((t - 0.95) / 0.5), R = dp * (8 + v * 26); o.strokeStyle = `rgb(${BL})`; o.lineWidth = 2 * dp * (1 - v);
      for (let i = 0; i < 8; i++) { const b = i / 8 * TAU + q.s; o.beginPath(); o.moveTo(tx + Math.cos(b) * R * 0.5, ty + Math.sin(b) * R * 0.5); o.lineTo(tx + Math.cos(b) * R, ty + Math.sin(b) * R); o.stroke(); }
      if (v < 1) { o.font = `700 ${Math.round(13 * dp)}px "Space Grotesk",system-ui,sans-serif`; o.textAlign = 'center'; o.fillStyle = `rgb(${BL})`; o.fillText('+1', tx, ty + 22 * dp + v * 6 * dp); } } });
  o.restore(); for (let i = ENVOL.length - 1; i >= 0; i--) if (now - ENVOL[i].t0 > 1.5 || now < ENVOL[i].t0) ENVOL.splice(i, 1);
}
// (vague 83, l'audit : « la flotte ») : la tour MARKO livrée, le feu d'artifice ne tient plus dans la scène : des gerbes éclatent partout dans
// le ciel de l'écran, par-dessus tout (sauf les sous-titres et la planète des chats) ; chaque étincelle retombe en rapetissant, jamais en fondu
const FEUX = []; let feuT = 0;
function feuxDArtifice(now) { if (reduitMvt() || now - feuT < 0.45 || FEUX.length > 7) return; feuT = now;
  const W = window.innerWidth, H = window.innerHeight, bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  for (let essai = 0; essai < 8; essai++) { const hB = window.EspacePlume && EspacePlume.M && EspacePlume.M.lay && EspacePlume.M.lay.G ? EspacePlume.M.lay.G.haut : 0, R0 = 60 + Math.random() * 70, x = W * (0.06 + Math.random() * 0.88), y = Math.max(hB + R0 * 0.8, H * (0.12 + Math.random() * 0.4));
    if (bd && y > bd.y - 90) continue; if (Pc && Math.hypot(x - Pc.x, y - Pc.y) < Pc.r * 1.6 + 120) continue;
    const n = 14 + Math.floor(Math.random() * 10), R = R0; FEUX.push({ x, y, y0: bd ? Math.min(H, bd.y) : H, t0: now, R, n, rot: Math.random() * TAU, sorte: Math.floor(Math.random() * 3) }); return; } }
function feux(o, now) {
  const cv = o.canvas, dp = dpDe(cv); o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = 'round';
  const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  // (vague 162) jamais sous la barre du haut : les gerbes s'arrêtent net à son bord (au téléphone, une gerbe haute la recouvrait)
  const hB = window.EspacePlume && EspacePlume.M && EspacePlume.M.lay && EspacePlume.M.lay.G ? EspacePlume.M.lay.G.haut - 4 : 0;
  o.beginPath(); o.rect(0, hB, cv.width / dp, cv.height / dp - hB); if (bd) o.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); if (Pc) { o.moveTo(Pc.x + Pc.r * 1.35, Pc.y); o.arc(Pc.x, Pc.y, Pc.r * 1.35, 0, TAU); } o.clip('evenodd');
  FEUX.forEach(f => { const t = now - f.t0;
    // la fusée qui monte (un trait d'étincelles), puis la gerbe
    if (t < 0.45) { const u = t / 0.45, y = f.y0 + (f.y - f.y0) * (1 - (1 - u) * (1 - u)); o.strokeStyle = `rgb(${BL})`; o.lineWidth = 2; o.beginPath(); o.moveTo(f.x + Math.sin(t * 30) * 1.5, y); o.lineTo(f.x, y + 26); o.stroke(); return; }
    const u = (t - 0.45) / 1.6; if (u >= 1) return; const e = 1 - Math.pow(1 - u, 3), R = f.R * e, fall = u * u * 38, taille = 1 - sm((u - 0.55) / 0.45);
    for (let i = 0; i < f.n; i++) { const b = f.rot + i / f.n * TAU, cx = f.x + Math.cos(b) * R, cy = f.y + Math.sin(b) * R + fall, L = f.R * 0.28 * (1 - u) + 2;
      o.globalAlpha = 1; o.strokeStyle = NUIT; o.lineWidth = 4.5 * taille + 0.5; o.beginPath(); o.moveTo(cx - Math.cos(b) * L, cy - Math.sin(b) * L - fall * 0.2); o.lineTo(cx, cy); o.stroke();
      o.strokeStyle = f.sorte === 1 && i % 2 ? '#ffe9a8' : `rgb(${BL})`; o.lineWidth = 2.2 * taille; o.stroke();
      if (f.sorte !== 0 && taille > 0.05) { o.fillStyle = `rgb(${BL})`; o.beginPath(); o.arc(cx, cy, 2.4 * taille, 0, TAU); o.fill(); }
      if (f.sorte === 2 && u > 0.35) { const v = (u - 0.35) / 0.65, r2 = f.R * 0.25 * v; for (let j = 0; j < 4; j++) { const b2 = b + j * Math.PI / 2; o.fillStyle = `rgb(${BL})`; o.beginPath(); o.arc(cx + Math.cos(b2) * r2, cy + Math.sin(b2) * r2 + v * 8, 1.6 * taille, 0, TAU); o.fill(); } } }
    if (u < 0.2) { o.fillStyle = `rgb(${BL})`; o.beginPath(); o.arc(f.x, f.y, 10 * (1 - u / 0.2), 0, TAU); o.fill(); } });
  o.restore(); for (let i = FEUX.length - 1; i >= 0; i--) if (now - FEUX[i].t0 > 2.1 || now < FEUX[i].t0) FEUX.splice(i, 1);
}
// (vague 84, l'audit : « la puce ») : au « clac », la puce se referme et la décharge sort d'elle : des éclairs de craie filent de la puce jusqu'à
// chaque élément de l'interface (logo, langue, flèches, boutons, chapitres), qui s'allume d'un coup ; puis les éclairs se rétractent vers eux
const SURGE = { t0: -99, x: 0, y: 0, cib: [] };
function surge(x, y, now) { if (reduitMvt()) return; SURGE.t0 = now; SURGE.x = x; SURGE.y = y;
  SURGE.cib = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *')].map((e, i) => { const b = e.getBoundingClientRect(); return { e, x: b.left + b.width / 2, y: b.top + b.height / 2, s: bruit(i * 3.3 + now) }; }).filter(q => q.x > 0);
  SURGE.cib.forEach((q, i) => { const d = Math.hypot(q.x - x, q.y - y); setTimeout(() => q.e.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.2) drop-shadow(0 0 6px rgba(255,255,240,.95))', offset: 0.15 }, { filter: 'brightness(1)' }], { duration: 700, easing: 'ease-out' }), 120 + d * 0.35); }); }
function eclairs(o, now) {
  const t = now - SURGE.t0; if (t > 1.6 || t < 0) return; const cv = o.canvas, dp = dpDe(cv); o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  o.beginPath(); o.rect(0, 0, cv.width / dp, cv.height / dp); if (bd) o.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); if (Pc) { o.moveTo(Pc.x + Pc.r * 1.2, Pc.y); o.arc(Pc.x, Pc.y, Pc.r * 1.2, 0, TAU); } o.clip('evenodd');
  SURGE.cib.forEach((q, i) => { const d = Math.hypot(q.x - SURGE.x, q.y - SURGE.y), arr = 0.12 + d * 0.00035, u0 = c01((t - 0.05) / arr), u1 = c01((t - arr - 0.25) / 0.5);   // (le front qui part, la queue qui le rattrape)
    if (u0 <= u1) return; const n = Math.max(6, Math.round(d / 28)), P = [];
    for (let j = 0; j <= n; j++) { const v = j / n, nx = -(q.y - SURGE.y) / (d || 1), ny = (q.x - SURGE.x) / (d || 1), j2 = j === 0 || j === n ? 0 : (bruit(j * 7.1 + i * 13 + Math.floor(now * 14)) - 0.5) * 22 * Math.sin(Math.PI * v);
      P.push([lerp(SURGE.x, q.x, v) + nx * j2, lerp(SURGE.y, q.y, v) + ny * j2]); }
    const seg = (a0, a1) => { o.beginPath(); let first = true; for (let j = 0; j <= n; j++) { const v = j / n; if (v < a0 || v > a1) continue; first ? o.moveTo(P[j][0], P[j][1]) : o.lineTo(P[j][0], P[j][1]); first = false; } };
    seg(u1, u0); o.strokeStyle = NUIT; o.lineWidth = 5; o.stroke(); o.strokeStyle = `rgb(${BL})`; o.lineWidth = 2; o.stroke();
    const h = P[Math.min(n, Math.round(u0 * n))]; o.fillStyle = `rgb(${BL})`; o.beginPath(); o.arc(h[0], h[1], u0 < 1 ? 3.5 : 5 * (1 - u1), 0, TAU); o.fill(); });
  o.restore();
}
// (vague 85, l'audit : « front et interfaces ») : pendant la scène du front, la vraie interface du site devient inspectable, comme dans les
// outils de développement : l'élément sous la souris (logo, langue, flèches, boutons, chapitres) s'entoure de sa boîte (contenu, marge en
// hachures), ses cotes, et une étiquette « button.pp · 86 × 20 » ; la boîte se déplie vers lui quand on change d'élément
const INSP = { t: -99, el: null, b: null, k: 0, T: 0 };
function inspecteur(o, now) {
  const P = souris(), on = now - INSP.t < 0.3 && P; let el = null;
  if (on) { const e = document.elementFromPoint(P.x, P.y); el = e && e.closest && e.closest('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *, .nav, [class*="fleche"], [class*="arrow"], button, a'); if (el && el.closest('.scenes, #stage')) el = null; }
  const dt = Math.min(0.2, Math.max(0, now - (INSP.T || now))); INSP.T = now;
  if (el && el !== INSP.el) { INSP.el = el; INSP.k = 0; INSP.b0 = INSP.b; } INSP.k = el ? Math.min(1, INSP.k + dt / 0.25) : Math.max(0, INSP.k - dt / 0.2);
  if (!INSP.el || INSP.k <= 0) { if (!el) INSP.el = null; return; }
  const r = INSP.el.getBoundingClientRect(); if (!r.width) return; INSP.b = r; const cs = getComputedStyle(INSP.el), mg = ['Top', 'Right', 'Bottom', 'Left'].map(q => parseFloat(cs['margin' + q]) || 0), pd = ['Top', 'Right', 'Bottom', 'Left'].map(q => parseFloat(cs['padding' + q]) || 0);
  const e = sm(INSP.k), b0 = INSP.b0 && INSP.el ? INSP.b0 : null, L = (a, b) => b0 ? lerp(a, b, e) : b, x = L(b0 ? b0.left : 0, r.left), y = L(b0 ? b0.top : 0, r.top), w = L(b0 ? b0.width : 0, r.width) * (b0 ? 1 : e), h = L(b0 ? b0.height : 0, r.height) * (b0 ? 1 : e);
  const cv = o.canvas, dp = dpDe(cv); o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  const X0 = b0 ? x : r.left + r.width / 2 - w / 2, Y0 = b0 ? y : r.top + r.height / 2 - h / 2;
  // la marge (hachurée), le cadre du contenu (tirets), le rembourrage (un trait fin dedans)
  o.save(); o.beginPath(); o.rect(X0 - mg[3] - 6, Y0 - mg[0] - 6, w + mg[1] + mg[3] + 12, h + mg[0] + mg[2] + 12); o.rect(X0, Y0, w, h); o.clip('evenodd');
  o.strokeStyle = 'rgba(255,233,168,0.55)'; o.lineWidth = 1; o.beginPath(); for (let q = -h - 40; q < w + 40; q += 6) { o.moveTo(X0 + q, Y0 + h + 30); o.lineTo(X0 + q + h + 40, Y0 - 30); } o.stroke(); o.restore();
  o.setLineDash([5, 4]); o.lineDashOffset = -now * 20; o.strokeStyle = NUIT; o.lineWidth = 3.5; o.strokeRect(X0, Y0, w, h); o.strokeStyle = `rgb(${BL})`; o.lineWidth = 1.5; o.strokeRect(X0, Y0, w, h); o.setLineDash([]);
  if (pd.some(v => v > 0)) { o.strokeStyle = 'rgba(150,200,255,0.8)'; o.lineWidth = 1; o.strokeRect(X0 + pd[3], Y0 + pd[0], Math.max(0, w - pd[1] - pd[3]), Math.max(0, h - pd[0] - pd[2])); }
  // l'étiquette : balise.classe · largeur × hauteur, sous l'élément (au-dessus s'il est en bas de l'écran)
  if (e > 0.6) { const nom = INSP.el.tagName.toLowerCase() + (INSP.el.id ? '#' + INSP.el.id : INSP.el.classList[0] ? '.' + INSP.el.classList[0] : ''), t = `${nom} · ${Math.round(r.width)} × ${Math.round(r.height)}`;
    o.font = '600 11px ui-monospace,Menlo,Consolas,monospace'; const tw = o.measureText(t).width + 12, bas = r.bottom + 30 > window.innerHeight, lx = Math.max(6, Math.min(window.innerWidth - tw - 6, X0)), ly = bas ? Y0 - mg[0] - 26 : Y0 + h + mg[2] + 8;
    o.fillStyle = PAP; o.strokeStyle = ENC; o.lineWidth = 1.2; o.beginPath(); o.rect(lx, ly, tw * sm(c01((e - 0.6) / 0.4)), 18); o.fill(); o.stroke(); if (e > 0.85) { o.fillStyle = ENC; o.textBaseline = 'middle'; o.fillText(t, lx + 6, ly + 9.5); } }
  o.restore();
}
const INST = { t: 0, h: 0, hi: -1, q: null, fin: -99, vu: -99 };
function installe(o, now) {
  const q = INST.q, P = souris(); if (!q) return; const t = now - q.t0; if (t > 6.2 || now - INST.vu > 1.5) { INST.q = null; INST.fin = now; return; }
  const cv = o.canvas, dp = dpDe(cv); o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  const px = P ? P.x : q.x, py = P ? P.y : q.y, ax = px + 18, ay = py + 20, va = sm(c01(t / 0.6)), re = sm(c01((t - 5.3) / 0.9));
  // (l'aller : en arc depuis l'orbite ; le retour : vers sa place sur l'orbite, où il est redessiné par la scène)
  let x = lerp(q.x, ax, va), y = lerp(q.y, ay, va) - Math.sin(Math.PI * va) * 80 * (1 - re); if (re > 0) { x = lerp(ax, q.ox ?? q.x, re); y = lerp(ay, q.oy ?? q.y, re) - Math.sin(Math.PI * re) * 60; }
  const s = 1 - re * 0.6, rot = (1 - va) * 4 + re * 3 + Math.sin(now * 3) * 0.06 * va;
  if (va >= 1 && re <= 0) { // le câble : du pointeur à la cartouche, qui pend un peu ; au branchement, un éclair
    o.strokeStyle = NUIT; o.lineWidth = 4.5; o.beginPath(); o.moveTo(px + 2, py + 4); o.quadraticCurveTo(px + 4, ay + 14, x - 8, y); o.stroke(); o.strokeStyle = `rgb(${BL})`; o.lineWidth = 1.8; o.stroke();
    if (t < 0.9) { const u = (t - 0.6) / 0.3; o.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const b = i / 8 * TAU; o.beginPath(); o.moveTo(x + Math.cos(b) * 14 * (1 + u), y + Math.sin(b) * 14 * (1 + u)); o.lineTo(x + Math.cos(b) * 24 * (1 + u) * (1 - u * 0.3), y + Math.sin(b) * 24 * (1 + u) * (1 - u * 0.3)); o.stroke(); } } }
  o.translate(x, y); o.rotate(rot); o.scale(s, s); o.font = '600 12px ui-monospace,Menlo,Consolas,monospace'; const tw = o.measureText(q.l).width + 18, H = 26;
  o.beginPath(); o.moveTo(-8, -H / 2); o.lineTo(tw - 6, -H / 2); o.lineTo(tw, -H / 2 + 6); o.lineTo(tw, H / 2); o.lineTo(-8, H / 2); o.closePath();
  o.strokeStyle = `rgb(${BL})`; o.lineWidth = 5; o.stroke(); o.fillStyle = PAP; o.fill(); o.strokeStyle = ENC; o.lineWidth = 1.4; o.stroke();
  [-5, 1, 7].forEach(v => { o.beginPath(); o.moveTo(-8, v); o.lineTo(-13, v); o.stroke(); });   // (ses broches)
  o.fillStyle = ENC; o.textBaseline = 'middle'; o.fillText(q.l, 2, 1);
  o.restore();
}
// (vague 87, l'audit : « la course », elle sort d'elle-même) : on parie. La souris s'attarde sur une fusée avant ou au début de la course :
// un ticket de papier s'envole de la fusée et s'accroche au pointeur (« PARI · fusée C », son rang en direct). Arrivée : si elle gagne, le
// ticket est tamponné et crache une gerbe de pièces-étoiles sur tout l'écran, qui rebondissent sur les vrais boutons et tombent hors de
// l'écran ; si elle perd, le ticket se déchire en deux et les moitiés tombent (jamais de fondu)
const PARI = { i: -1, n: -1, h: 0, hi: -1, T: 0, t: -99, res: null, tr: -99, vu: -99, x: 0, y: 0, rg: 0, P: [], M: [], ui: [] };
const pariOn = now => PARI.i >= 0 && now - PARI.vu < 1.5 && (PARI.res === null || now - PARI.tr < 5);
function pariResout(now) {
  PARI.tr = now; const P = souris(), x0 = P ? P.x + 22 : PARI.x, y0 = P ? P.y + 18 : PARI.y; PARI.P = []; PARI.M = [];
  if (PARI.res) { if (reduitMvt()) return; PARI.ui = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *')].map(e => ({ e, b: e.getBoundingClientRect(), tc: -9 })).filter(q => q.b.width > 0);
    const dv = (window.innerWidth / 2 - x0) * 1.1; for (let j = 0; j < 46; j++) { const b = -Math.PI / 2 + (bruit(j * 3.1 + now) - 0.5) * 2.4, v = 520 + bruit(j * 7.7 + now) * 620; PARI.P.push({ x: x0 + 60, y: y0 + 16, vx: Math.cos(b) * v * 0.8 + dv * (0.4 + bruit(j * 9.1) * 0.8), vy: Math.sin(b) * v, rot: bruit(j) * TAU, vr: (bruit(j * 2.2) - 0.5) * 14, t0: now + j * 0.018, T: now + j * 0.018, reb: 0, r: 7 + bruit(j * 5.3) * 5 }); } }
  else [0, 1].forEach(g => PARI.M.push({ x: x0 + (g ? 50 : 0), y: y0, vx: (g ? 1 : -1) * (60 + bruit(now) * 40), vy: -140, rot: 0, vr: (g ? 1 : -1) * 2.6, T: now }));
}
function pari(o, now) {
  const P = souris(), cv = o.canvas, dp = dpDe(cv), t = now - PARI.t; o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  const W = window.innerWidth, H = window.innerHeight, bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  o.beginPath(); o.rect(0, 0, W, H); if (bd) o.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); if (Pc) { o.moveTo(Pc.x + Pc.r * 1.2, Pc.y); o.arc(Pc.x, Pc.y, Pc.r * 1.2, 0, TAU); } o.clip('evenodd');
  const nom = String.fromCharCode(65 + PARI.i), tw = 124, th = 44;
  // le ticket : une perforation à gauche, « PARI », la fusée et son rang ; il vole de la fusée au pointeur, puis pend et se balance
  const billet = (w0, w1) => { o.beginPath(); o.moveTo(w0, 0); o.lineTo(w1, 0); if (w1 >= tw) { o.lineTo(tw, th); } else for (let j = 0; j <= 6; j++) o.lineTo(w1 + (j % 2 ? -3 : 3), j / 6 * th); o.lineTo(w0, th); if (w0 > 0) for (let j = 6; j >= 0; j--) o.lineTo(w0 + (j % 2 ? -3 : 3), j / 6 * th); o.closePath();
    o.strokeStyle = `rgb(${BL})`; o.lineWidth = 5; o.stroke(); o.fillStyle = PAP; o.fill(); o.strokeStyle = ENC; o.lineWidth = 1.4; o.stroke(); };
  const texte = (x0) => { o.fillStyle = ENC; o.textBaseline = 'middle'; o.textAlign = 'left'; o.font = '700 10px "Space Grotesk",system-ui,sans-serif'; o.fillText(en() ? 'BET' : 'PARI', 14 - x0, 12);
    o.font = '700 15px "Space Grotesk",system-ui,sans-serif'; o.fillText((en() ? 'rocket ' : 'fusée ') + nom, 14 - x0, 29); };
  if (PARI.res === null || (PARI.res && now - PARI.tr < 5)) {
    const px = P ? P.x + 22 : PARI.x, py = P ? P.y + 18 : PARI.y, va = sm(c01(t / 0.55)), x = lerp(PARI.x, px, va), y = lerp(PARI.y, py, va) - Math.sin(Math.PI * va) * 70;
    PARI.bx = x; PARI.by = y; o.save(); o.translate(x, y); o.rotate((1 - va) * 3 + Math.sin(now * 2.2) * 0.07); o.scale(0.4 + 0.6 * va, 0.4 + 0.6 * va);
    if (va >= 1) { o.strokeStyle = `rgb(${BL})`; o.lineWidth = 1.2; o.beginPath(); o.moveTo(-22, -18); o.lineTo(6, 3); o.stroke(); }   // (son fil, jusqu'au pointeur)
    billet(0, tw); o.setLineDash([2, 3]); o.strokeStyle = ENC; o.lineWidth = 1; o.beginPath(); o.moveTo(8, 3); o.lineTo(8, th - 3); o.stroke(); o.setLineDash([]); texte(0);
    // le rang, en direct, à la craie ; à l'arrivée, le coup de tampon
    if (PARI.res === null && PARI.rg) { o.strokeStyle = ENC; o.lineWidth = 1.3; o.beginPath(); o.arc(tw - 19, th / 2, 13, 0, TAU); o.stroke(); o.font = '700 12px "Space Grotesk",system-ui,sans-serif'; o.textAlign = 'center'; o.fillText(PARI.rg + (PARI.rg === 1 ? (en() ? 'st' : 'er') : (en() ? ['', '', 'nd', 'rd', 'th', 'th'][PARI.rg] : 'e')), tw - 19, th / 2 + 1); }
    if (PARI.res) { const u = c01((now - PARI.tr) / 0.14), s = 2.2 - 1.2 * u * u; o.save(); o.translate(tw * 0.74, th * 0.5); o.rotate(-0.25); o.scale(s, s); o.globalAlpha = 0.4 + 0.55 * u;
      o.strokeStyle = '#e8574a'; o.lineWidth = 2.2; o.strokeRect(-30, -11, 60, 22); o.fillStyle = '#e8574a'; o.font = '800 13px "Space Grotesk",system-ui,sans-serif'; o.textAlign = 'center'; o.fillText(en() ? 'WON' : 'GAGNÉ', 0, 1); o.restore(); }
    o.restore(); }
  // la gerbe de pièces : chacune tourne, retombe, rebondit sur le dessus d'un vrai bouton (qui encaisse le choc), et tombe hors de l'écran
  PARI.P.forEach(q => { if (now < q.t0) return; const dt = Math.min(0.06, Math.max(0, now - q.T)); q.T = now; if (dt > 0) { const y0 = q.y; q.vy += 1500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.vy > 0 && q.reb < 2) PARI.ui.forEach(u => { const b = u.b; if (q.x > b.left - 4 && q.x < b.right + 4 && y0 + q.r <= b.top + 2 && q.y + q.r > b.top) { q.y = b.top - q.r; q.vy *= -0.55; q.vx *= 0.8; q.reb++;
        if (now - u.tc > 0.25) { u.tc = now; u.e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(4px) scaleY(0.9)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out', composite: 'add' }); } } }); }
    if (q.y > H + 30) return; const w = Math.abs(Math.cos(q.rot)) * q.r + 1;
    o.fillStyle = PAP; o.strokeStyle = `rgb(${BL})`; o.lineWidth = 4; o.beginPath(); o.ellipse(q.x, q.y, w, q.r, 0, 0, TAU); o.stroke(); o.fill(); o.strokeStyle = ENC; o.lineWidth = 1.3; o.stroke();
    if (w > q.r * 0.5) { o.fillStyle = '#ffe9a8'; o.beginPath(); for (let i = 0; i < 10; i++) { const b = i / 10 * TAU - Math.PI / 2, r = (i % 2 ? 0.28 : 0.62) * q.r; o.lineTo(q.x + Math.cos(b) * r * w / q.r, q.y + Math.sin(b) * r); } o.closePath(); o.fill(); o.stroke(); } });
  // raté : les deux moitiés du ticket déchiré tombent en tournoyant
  PARI.M.forEach((q, g) => { const dt = Math.min(0.06, Math.max(0, now - q.T)); q.T = now; q.vy += 1100 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; if (q.y > H + 60) return;
    o.save(); o.translate(q.x, q.y); o.rotate(q.rot); o.translate(g ? -50 : 0, 0); billet(g ? 50 : 0, g ? tw : 50); o.save(); o.beginPath(); o.rect(g ? 50 : 0, 0, g ? tw : 50, th); o.clip(); texte(0); o.restore(); o.restore(); });
  if (PARI.res === false && now - PARI.tr < 0.9) { const u = (now - PARI.tr) / 0.9, m = PARI.M[0]; if (m) { o.font = '700 16px "Space Grotesk",system-ui,sans-serif'; o.textAlign = 'center'; o.lineWidth = 4; o.strokeStyle = NUIT; o.strokeText(en() ? 'missed' : 'raté', m.x + 60, m.y - 22 - u * 20); o.fillStyle = `rgb(${BL})`; o.fillText(en() ? 'missed' : 'raté', m.x + 60, m.y - 22 - u * 20); } }
  o.restore();
}
// (vague 87, l'audit : « la vitesse sans perdre le contrôle », elle sort d'elle-même) : pendant la scène, les garde-fous gardent aussi le vrai
// site. La souris s'approche d'un bouton, d'une flèche, d'un chapitre : une barrière rayée tombe du haut devant lui, côté souris, son feu
// rouge qui clignote, un trait de contrôle balaie le pointeur ; si on attend, le feu passe au vert, coche, et la barrière se lève ; on s'en
// va : elle remonte d'où elle vient (jamais de fondu)
const GF = { t: -99, el: null, b: null, k: 0, s: 0, T: 0, ok: false, cote: 0, ui: null, uiT: -9 };
function gardeFou(o, now) {
  const P = souris(), dt = Math.min(0.2, Math.max(0, now - (GF.T || now))); GF.T = now;
  if (!GF.ui || now - GF.uiT > 1) { GF.uiT = now; GF.ui = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *, .nav, [class*="fleche"]')].filter(e => !e.closest('.scenes, #stage')).map(e => ({ e, b: e.getBoundingClientRect() })).filter(q => q.b.width > 0); }
  let el = null, bb = null, bd = 90; const on = now - GF.t < 0.3 && P && !reduitMvt();
  if (on) GF.ui.forEach(q => { const b = q.b, dx = Math.max(b.left - P.x, 0, P.x - b.right), dy = Math.max(b.top - P.y, 0, P.y - b.bottom), d = Math.hypot(dx, dy); if (d < bd) { bd = d; el = q.e; bb = b; } });
  if (el && el !== GF.el && GF.k < 0.05) { GF.el = el; GF.b = bb; GF.s = 0; GF.ok = false; const cx = (bb.left + bb.right) / 2, cy = (bb.top + bb.bottom) / 2, ux = (P.x - cx) / (bb.width / 2 + 20), uy = (P.y - cy) / (bb.height / 2 + 20); GF.cote = Math.abs(ux) > Math.abs(uy) ? (ux > 0 ? 1 : 3) : (uy > 0 ? 2 : 0); }
  const ici = el && el === GF.el; GF.k = ici ? Math.min(1, GF.k + dt / 0.35) : Math.max(0, GF.k - dt / 0.3); if (ici) GF.s += dt;
  if (!GF.el || GF.k <= 0) { if (!el) GF.el = null; return; }
  if (!GF.ok && GF.s > 1.1) { GF.ok = true; GF.tok = now; GF.el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out', composite: 'add' }); }
  const cv = o.canvas, dp = dpDe(cv); o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  // (on travaille dans le repère du côté gardé : l'axe x le long du côté, y vers la souris)
  const b = GF.b, m = 12, c = GF.cote, L = c % 2 ? b.height + 2 * m : b.width + 2 * m;
  const org = [[b.left - m, b.top - m], [b.right + m, b.top - m], [b.right + m, b.bottom + m], [b.left - m, b.bottom + m]][c], ang = [0, Math.PI / 2, Math.PI, -Math.PI / 2][c];
  const chute = 1 - (1 - sm(GF.k)) * (1 - sm(GF.k)) , rebond = GF.k < 1 ? 0 : Math.max(0, 0.25 - GF.s) * Math.sin(GF.s * 40) * 6;
  o.translate(org[0], org[1]); o.rotate(ang); o.translate(0, -(1 - chute) * 140 * (c === 0 ? 1 : 0.6) + rebond); o.scale(0.3 + 0.7 * chute, 0.3 + 0.7 * chute);
  const dbl = (lw, f, col) => { o.strokeStyle = NUIT; o.lineWidth = lw + 3.5; f(); o.stroke(); o.strokeStyle = col || `rgb(${BL})`; o.lineWidth = lw; f(); o.stroke(); };
  // les deux poteaux, leurs pieds
  [0, L].forEach(x => { dbl(2.2, () => { o.beginPath(); o.moveTo(x, 0); o.lineTo(x, -22); }); dbl(1.6, () => { o.beginPath(); o.moveTo(x - 5, 0); o.lineTo(x + 5, 0); }); });
  // le feu, sur le poteau de gauche : rouge qui clignote, puis vert
  const vert = GF.ok, cl = vert || Math.floor(now * 5) % 2; o.fillStyle = vert ? '#8fe0a0' : cl ? '#e8574a' : NUIT; o.strokeStyle = `rgb(${BL})`; o.lineWidth = 1.4; o.beginPath(); o.arc(0, -28, 5, 0, TAU); o.fill(); o.stroke();
  // la lisse rayée : charnière à gauche, elle se lève quand c'est bon
  const lev = vert ? sm(c01((now - GF.tok) / 0.45)) : 0, la = L - 4; o.save(); o.translate(0, -16); o.rotate(-lev * 1.35);
  o.beginPath(); o.rect(0, -3.5, la, 7); o.fillStyle = NUIT; o.fill(); o.save(); o.clip(); o.fillStyle = '#e8574a'; for (let x = -8; x < la + 8; x += 14) { o.beginPath(); o.moveTo(x, 4); o.lineTo(x + 7, 4); o.lineTo(x + 14, -4); o.lineTo(x + 7, -4); o.closePath(); o.fill(); } o.restore();
  o.strokeStyle = `rgb(${BL})`; o.lineWidth = 1.4; o.strokeRect(0, -3.5, la, 7); o.restore();
  o.restore();
  // le trait de contrôle : du feu jusqu'au pointeur, en tirets qui courent ; puis la coche, près du pointeur
  if (P && GF.k >= 1) { const f = [org[0] + Math.cos(ang) * 0 - Math.sin(ang) * -28, org[1] + Math.sin(ang) * 0 + Math.cos(ang) * -28];
    o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = 'round';
    if (!vert) { o.setLineDash([4, 5]); o.lineDashOffset = -now * 40; o.strokeStyle = '#e8574a'; o.lineWidth = 1.3; o.beginPath(); o.moveTo(f[0], f[1]); o.lineTo(P.x, P.y); o.stroke(); o.setLineDash([]);
      const u = (now * 1.6) % 1; o.strokeStyle = `rgb(${BL})`; o.lineWidth = 1.2; o.beginPath(); o.moveTo(P.x - 14, P.y - 14 + u * 28); o.lineTo(P.x + 14, P.y - 14 + u * 28); o.stroke();
      o.font = '600 10px ui-monospace,Menlo,Consolas,monospace'; o.fillStyle = `rgb(${BL})`; o.fillText(en() ? 'checking…' : 'contrôle…', P.x + 16, P.y + 22); }
    else { const u = c01((now - GF.tok) / 0.3), x = P.x + 18, y = P.y - 14; o.strokeStyle = NUIT; o.lineWidth = 6; o.beginPath(); o.moveTo(x - 7, y); o.lineTo(x - 2, y + 5 * Math.min(1, u * 2)); if (u > 0.5) o.lineTo(x - 2 + 10 * (u - 0.5) * 2, y + 5 - 11 * (u - 0.5) * 2); o.stroke(); o.strokeStyle = '#8fe0a0'; o.lineWidth = 2.5; o.stroke();
      if (u >= 1) { o.font = '600 10px ui-monospace,Menlo,Consolas,monospace'; o.fillStyle = '#8fe0a0'; o.fillText(en() ? 'passed' : 'validé', P.x + 16, P.y + 22); } }
    o.restore(); }
}
// (vague 88, l'audit : « IA et données », elle sort d'elle-même) : la question de la souris ne cherche plus seulement dans le nuage : elle
// cherche dans le vrai site. La souris s'arrête : des fils de recherche partent du pointeur vers chaque élément de l'interface (logo, langue,
// chapitres, boutons), chacun reçoit son score de similarité ; le meilleur s'entoure de crochets, son texte se détache en fiche de papier et
// revient en arc jusqu'au pointeur, où il se range dans la question (la réponse est retrouvée) ; la souris bouge : les fils se rétractent
const RAG = { t: -99, T: 0, k: 0, ui: null, uiT: -9, sel: null, x: 0, y: 0 };
function ragUI(o, now) {
  const P = souris(), W0 = window.Chats && Chats.K && Chats.K.Wd; if (!P || !W0) { RAG.k = 0; return; }
  const on = now - RAG.t < 0.3 && !reduitMvt(), st = W0.t - P.moved, dt = Math.min(0.2, Math.max(0, now - (RAG.T || now))); RAG.T = now;
  if (!RAG.ui || now - RAG.uiT > 1) { RAG.uiT = now; RAG.ui = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *')].filter(e => !e.closest('.scenes, #stage')).map(e => {
    const b = e.getBoundingClientRect(), tx = (e.innerText || e.getAttribute('aria-label') || e.title || e.id || '').replace(/\s+/g, ' ').trim().slice(0, 22); return { e, b, tx: tx || (e.id === 'brand' ? 'Mathieu' : '·') }; }).filter(q => q.b.width > 0); }
  const actif = on && st > 0.8; if (actif && RAG.k === 0) { RAG.x = P.x; RAG.y = P.y; RAG.sel = null; }
  RAG.k = actif ? RAG.k + dt : Math.max(0, Math.min(0.6, RAG.k) - dt * 2); if (RAG.k <= 0) return;
  const u = RAG.k, px = P.x, py = P.y, cv = o.canvas, dp = dpDe(cv);
  const Uq = RAG.ui.map((q, i) => { const cx = (q.b.left + q.b.right) / 2, cy = (q.b.top + q.b.bottom) / 2, d = Math.hypot(cx - RAG.x, cy - RAG.y);
    return { ...q, cx, cy, s: Math.min(0.97, 0.35 + 0.5 * Math.exp(-d / 500) + (bruit(i * 7.7 + Math.round(RAG.x / 40) * 3.1 + Math.round(RAG.y / 40)) - 0.5) * 0.2) }; });
  if (!RAG.sel && Uq.length) RAG.sel = Uq.reduce((a, b) => b.s > a.s ? b : a).e; const best = Uq.find(q => q.e === RAG.sel); if (best) best.s = Math.max(best.s, 0.87 + bruit(RAG.x * 0.01) * 0.1);
  o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  o.beginPath(); o.rect(0, 0, cv.width / dp, cv.height / dp); if (bd) o.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); if (Pc) { o.moveTo(Pc.x + Pc.r * 1.2, Pc.y); o.arc(Pc.x, Pc.y, Pc.r * 1.2, 0, TAU); } o.clip('evenodd');
  // les fils : ils poussent du pointeur vers chaque élément (les plus proches d'abord), leurs tirets courent vers nous
  Uq.forEach((q, i) => { const d = Math.hypot(q.cx - px, q.cy - py), g = c01((u - d / 2600) / 0.45); if (g <= 0) return; const ex = lerp(px, q.cx, g), ey = lerp(py, q.cy, g), mx = (px + ex) / 2, my = (py + ey) / 2 - d * 0.08 * g;
    const moi = q === best && u > 1; o.setLineDash([3, 5]); o.lineDashOffset = now * 30; o.strokeStyle = moi ? '#ffe9a8' : `rgba(${BL},0.6)`; o.lineWidth = moi ? 1.8 : 1; o.beginPath(); o.moveTo(px, py); o.quadraticCurveTo(mx, my, ex, ey); o.stroke(); o.setLineDash([]);
    if (g >= 1) { const sc = q.s.toFixed(2).replace('.', en() ? '.' : ','), ty = q.cy > window.innerHeight / 2 ? q.b.top - 12 : q.b.bottom + 14; o.font = '600 10px ui-monospace,Menlo,Consolas,monospace'; o.textAlign = 'center'; o.textBaseline = 'middle';
      const tw = o.measureText(sc).width + 8; o.fillStyle = moi ? '#ffe9a8' : PAP; o.strokeStyle = ENC; o.lineWidth = 1; o.beginPath(); o.rect(q.cx - tw / 2, ty - 7, tw, 14); o.fill(); o.stroke(); o.fillStyle = ENC; o.fillText(sc, q.cx, ty + 0.5); } });
  // le meilleur : ses crochets se referment ; son texte se détache et revient au pointeur, puis se range dans la question
  if (best && u > 1) { const f = sm(c01((u - 1) / 0.35)), m = 6 + (1 - f) * 18, b = best.b, L = 8; o.strokeStyle = NUIT; o.lineWidth = 4.5;
    const cro = () => { o.beginPath(); [[b.left - m, b.top - m, 1, 1], [b.right + m, b.top - m, -1, 1], [b.right + m, b.bottom + m, -1, -1], [b.left - m, b.bottom + m, 1, -1]].forEach(([x, y, sx, sy]) => { o.moveTo(x + sx * L, y); o.lineTo(x, y); o.lineTo(x, y + sy * L); }); };
    cro(); o.stroke(); o.strokeStyle = '#ffe9a8'; o.lineWidth = 2; cro(); o.stroke();
    if (u > 1.35) { const v = sm(c01((u - 1.35) / 0.8)), ran = sm(c01((u - 2.3) / 0.4)), x = lerp(best.cx, px + 16, v), y = lerp(best.cy, py - 18, v) - Math.sin(Math.PI * v) * 90, s = (1 - ran * 0.85);
      if (ran < 1) { o.save(); o.translate(x, y); o.rotate(Math.sin(v * 7) * 0.25 * (1 - v)); o.scale(s, s); o.font = '600 12px "Space Grotesk",system-ui,sans-serif'; const tw = o.measureText(best.tx).width + 16;
        o.beginPath(); o.rect(-tw / 2, -11, tw, 22); o.strokeStyle = `rgb(${BL})`; o.lineWidth = 5; o.stroke(); o.fillStyle = PAP; o.fill(); o.strokeStyle = ENC; o.lineWidth = 1.3; o.stroke(); o.fillStyle = ENC; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(best.tx, 0, 1); o.restore(); }
      if (ran >= 1 && u < 3.4) { const w = c01((u - 2.7) / 0.7); o.strokeStyle = '#ffe9a8'; o.lineWidth = 2 * (1 - w) + 0.5; o.beginPath(); o.arc(px, py, 14 + w * 30, 0, TAU); o.stroke();
        o.font = '600 10px ui-monospace,Menlo,Consolas,monospace'; o.fillStyle = '#ffe9a8'; o.textAlign = 'left'; o.fillText(en() ? 'found' : 'trouvé', px + 18, py + 24); } } }
  o.restore();
}
// (vague 88, l'audit : « back-end », elle sort d'elle-même) : le vrai site est un client de ce back-end. Chaque élément de l'interface envoie
// ses requêtes (des enveloppes qui filent en arc jusqu'à la passerelle de la scène) ; la réponse revient en fiche de données, l'élément la
// reçoit (un petit sursaut, « 200 »). La souris posée sur un bouton le fait mitrailler : au-delà de cinq requêtes, la passerelle limite
// le débit : les enveloppes reviennent tamponnées « 429 » et le bouton se fait secouer
const REQ = { t: -99, gx: 0, gy: 0, L: [], ui: null, uiT: -9, next: 0, hov: null, hT: 0 };
function requetes(o, now) {
  const on = now - REQ.t < 0.3 && !reduitMvt(), P = souris();
  if (!REQ.ui || now - REQ.uiT > 1) { REQ.uiT = now; REQ.ui = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *')].filter(e => !e.closest('.scenes, #stage')).map(e => ({ e, b: e.getBoundingClientRect(), h: [] })).filter(q => q.b.width > 0); }
  const envoie = q => { q.h = q.h.filter(t => now - t < 2); q.h.push(now); REQ.L.push({ q, t0: now, ok: q.h.length <= 4, s: bruit(now * 7.3) }); };
  if (on) { let h = null; if (P) h = REQ.ui.find(q => P.x > q.b.left - 8 && P.x < q.b.right + 8 && P.y > q.b.top - 8 && P.y < q.b.bottom + 8);
    if (h && now > REQ.hT) { REQ.hT = now + 0.16; envoie(h); } else if (!h && now > REQ.next && REQ.ui.length) { REQ.next = now + 0.5 + bruit(now) * 0.5; envoie(REQ.ui[Math.floor(bruit(now * 3.1) * REQ.ui.length)]); } }
  if (!REQ.L.length) return; const cv = o.canvas, dp = dpDe(cv); o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  o.beginPath(); o.rect(0, 0, cv.width / dp, cv.height / dp); if (bd) o.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); if (Pc) { o.moveTo(Pc.x + Pc.r * 1.2, Pc.y); o.arc(Pc.x, Pc.y, Pc.r * 1.2, 0, TAU); } o.clip('evenodd');
  const gx = REQ.gx, gy = REQ.gy, AL = 0.75, RT = 0.7, ATT = 0.25;
  const env = (x, y, rot, s, rouge) => { o.save(); o.translate(x, y); o.rotate(rot); o.scale(s * 1.25, s * 1.25); o.beginPath(); o.rect(-10, -7, 20, 14); o.strokeStyle = `rgb(${BL})`; o.lineWidth = 4.5; o.stroke(); o.fillStyle = PAP; o.fill(); o.strokeStyle = ENC; o.lineWidth = 1.2; o.stroke();
    o.beginPath(); o.moveTo(-10, -7); o.lineTo(0, 1); o.lineTo(10, -7); o.stroke(); if (rouge) { o.rotate(-0.3); o.strokeStyle = '#e8574a'; o.lineWidth = 1.4; o.strokeRect(-11, -5, 22, 10); o.fillStyle = '#e8574a'; o.font = '800 8px "Space Grotesk",system-ui,sans-serif'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText('429', 0, 0.5); } o.restore(); };
  const fiche = (x, y, rot, s) => { o.save(); o.translate(x, y); o.rotate(rot); o.scale(s * 1.25, s * 1.25); o.beginPath(); o.rect(-7, -10, 14, 20); o.strokeStyle = `rgb(${BL})`; o.lineWidth = 4.5; o.stroke(); o.fillStyle = PAP; o.fill(); o.strokeStyle = ENC; o.lineWidth = 1.2; o.stroke();
    o.lineWidth = 1; o.beginPath(); for (let j = 0; j < 3; j++) { o.moveTo(-4, -5 + j * 5); o.lineTo(j === 2 ? 1 : 4, -5 + j * 5); } o.stroke(); o.restore(); };
  REQ.L.forEach(r => { const b = r.q.b, ex = (b.left + b.right) / 2, ey = (b.top + b.bottom) / 2, t = now - r.t0, cx = (ex + gx) / 2 + (r.s - 0.5) * 220, cy = Math.min(ey, gy) - 120 - r.s * 80;
    const at = (v, a, b2) => [(1 - v) * (1 - v) * a[0] + 2 * (1 - v) * v * cx + v * v * b2[0], (1 - v) * (1 - v) * a[1] + 2 * (1 - v) * v * cy + v * v * b2[1]];
    if (t < AL) { const v = sm(t / AL), p = at(v, [ex, ey], [gx, gy]); env(p[0], p[1], Math.sin(t * 9 + r.s * 6) * 0.3, 1 - v * 0.45, false); return; }
    const t2 = t - AL - ATT; if (t2 < 0) return; if (t2 < RT) { const v = sm(t2 / RT), p = at(1 - v, [ex, ey], [gx, gy]); if (r.ok) fiche(p[0], p[1], Math.sin(t2 * 7) * 0.3, 0.55 + v * 0.45); else env(p[0], p[1], t2 * 12, 0.6 + v * 0.5, true); return; }
    if (!r.fait) { r.fait = true; r.q.e.animate(r.ok ? [{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }] : [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px) rotate(-3deg)' }, { transform: 'translateX(6px) rotate(3deg)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: r.ok ? 240 : 420, easing: 'ease-out', composite: 'add' }); }
    const v = (t2 - RT) / 0.6; if (v < 1) { const tx = r.ok ? '200' : (en() ? '429 · too many requests' : '429 · trop de requêtes'), ty = ey > window.innerHeight / 2 ? b.top - 10 - v * 14 : b.bottom + 14 + v * 10; o.font = `700 ${r.ok ? 10 : 11}px ui-monospace,Menlo,Consolas,monospace`; o.textAlign = 'center'; o.textBaseline = 'middle';
      o.save(); o.translate(ex, ty); o.scale(1 - v * 0.5, 1 - v * 0.5); o.strokeStyle = NUIT; o.lineWidth = 4; o.strokeText(tx, 0, 0); o.fillStyle = r.ok ? '#8fe0a0' : '#e8574a'; o.fillText(tx, 0, 0); o.restore(); } });
  o.restore(); for (let i = REQ.L.length - 1; i >= 0; i--) if (now - REQ.L[i].t0 > AL + ATT + RT + 0.6 || now < REQ.L[i].t0) REQ.L.splice(i, 1);
}
// (vague 88, l'audit : « DevOps », elle sort d'elle-même) : la mise à l'échelle ne reste pas sur le circuit. Plus la souris s'agite (la
// charge), plus chaque élément du vrai site se réplique : des copies au trait glissent de dessous lui, en éventail (« ×3 ») ; la charge
// retombe : elles rentrent sous lui une à une. Et toutes les quelques secondes, un déploiement progressif balaie l'interface de gauche à
// droite : chaque élément redémarre à son tour (il se tasse puis revient) avec sa nouvelle version
const DEP = { t: -99, ui: null, uiT: -9, n: 0, T: 0, v: 0, t0: -99 };
function deploieUI(o, now) {
  const on = now - DEP.t < 0.3 && !reduitMvt(), dt = Math.min(0.2, Math.max(0, now - (DEP.T || now))); DEP.T = now;
  if (!DEP.ui || now - DEP.uiT > 1) { DEP.uiT = now; DEP.ui = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *')].filter(e => !e.closest('.scenes, #stage')).map(e => ({ e, b: e.getBoundingClientRect() })).filter(q => q.b.width > 0).sort((a, b) => a.b.left - b.b.left); }
  const cible = on ? CHG * 2.6 : 0; DEP.n += (cible - DEP.n) * Math.min(1, dt * (cible > DEP.n ? 5 : 1.6));
  if (on && now - DEP.t0 > 9) { DEP.t0 = now; DEP.v++; DEP.ui.forEach((q, i) => setTimeout(() => q.e.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.86)', offset: 0.35 }, { transform: 'scale(1.06)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out', composite: 'add' }), 120 + i * 140)); }
  const tr = now - DEP.t0; if (DEP.n < 0.03 && tr > 3) return;
  const cv = o.canvas, dp = dpDe(cv); o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  DEP.ui.forEach((q, i) => { const b = q.b, cx = (b.left + b.right) / 2, dir = cx > window.innerWidth / 2 ? -1 : 1, bas = b.top > window.innerHeight / 2 ? -1 : 1;
    // les répliques : sous l'élément (on découpe sa place), décalées en éventail, du côté où il y a de la place
    const nr = Math.ceil(DEP.n - 0.001); if (nr > 0) { o.save(); o.beginPath(); o.rect(0, 0, cv.width / dp, cv.height / dp); o.rect(b.left - 2, b.top - 2, b.width + 4, b.height + 4); o.clip('evenodd');
      for (let j = nr; j >= 1; j--) { const f = c01(DEP.n - (j - 1)), dx = dir * j * 9 * f, dy = bas * j * 7 * f; o.strokeStyle = NUIT; o.lineWidth = 4; o.strokeRect(b.left + dx, b.top + dy, b.width, b.height); o.strokeStyle = `rgba(${BL},${0.85 - j * 0.15})`; o.lineWidth = 1.3; o.setLineDash(j % 2 ? [] : [4, 3]); o.strokeRect(b.left + dx, b.top + dy, b.width, b.height); o.setLineDash([]); }
      o.restore(); if (DEP.n > 0.6) { const tx = '×' + (1 + nr), x = dir > 0 ? b.right + nr * 9 + 8 : b.left - nr * 9 - 8, y = bas > 0 ? b.bottom + nr * 7 + 6 : b.top - nr * 7 - 6; o.font = '700 10px ui-monospace,Menlo,Consolas,monospace'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.strokeStyle = NUIT; o.lineWidth = 3.5; o.strokeText(tx, x, y); o.fillStyle = '#ffe9a8'; o.fillText(tx, x, y); } }
    // le déploiement progressif : une barre qui se remplit sous l'élément, puis sa nouvelle version
    const u = (tr - 0.12 - i * 0.14) / 0.5; if (u > 0 && u < 3) { const y = bas > 0 ? b.bottom + 4 : b.top - 6, w = b.width * c01(u), s = 1 - sm(c01((u - 2.3) / 0.7));
      if (s > 0) { o.fillStyle = '#8fe0a0'; o.fillRect(b.left + (b.width - w * s) / 2, y, w * s, 2.5 * s);
        if (u > 1) { const tx = 'v1.' + (DEP.v + 11), ty = bas > 0 ? y + 11 : y - 8; o.save(); o.translate(cx, ty); o.scale(s, s); o.font = '600 9px ui-monospace,Menlo,Consolas,monospace'; o.textAlign = 'center'; o.textBaseline = 'middle'; o.strokeStyle = NUIT; o.lineWidth = 3; o.strokeText(tx, 0, 0); o.fillStyle = '#8fe0a0'; o.fillText(tx, 0, 0); o.restore(); } } } });
  o.restore();
}
// (vague 88, l'audit : « sécurité », elle sort d'elle-même) : les petits méchants n'attaquent plus seulement le dôme : ils arrivent des bords
// de l'écran sur le vrai site, et visent l'élément le plus proche de la souris (c'est elle qui les attire). À un pas de lui, un bouclier
// d'alvéoles s'allume autour de l'élément là où ça frappe, le méchant rebondit, sonné, et repart en tournoyant hors de l'écran
const ATK = { t: -99, L: [], next: 0, ui: null, uiT: -9 };
function attaques(o, now) {
  const on = now - ATK.t < 0.3 && !reduitMvt(), P = souris(), W = window.innerWidth, H = window.innerHeight;
  if (!ATK.ui || now - ATK.uiT > 1) { ATK.uiT = now; ATK.ui = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *')].filter(e => !e.closest('.scenes, #stage')).map(e => ({ e, b: e.getBoundingClientRect() })).filter(q => q.b.width > 0); }
  const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  if (on && now > ATK.next && ATK.ui.length && ATK.L.length < 6) { ATK.next = now + 0.7 + bruit(now * 1.9) * 0.6;
    const q = P ? ATK.ui.reduce((m, q) => { const d = Math.hypot((q.b.left + q.b.right) / 2 - P.x, (q.b.top + q.b.bottom) / 2 - P.y); return d < m[0] ? [d, q] : m; }, [1e9, null])[1] : ATK.ui[Math.floor(bruit(now) * ATK.ui.length)];
    const cx = (q.b.left + q.b.right) / 2, cy = (q.b.top + q.b.bottom) / 2, s = bruit(now * 5.7), bord = cy < H / 2 ? [s * W, -40] : (s < 0.5 ? [-40, cy - 120 - s * 200] : [W + 40, cy - 120 - (s - 0.5) * 200]);
    ATK.L.push({ q, x0: bord[0], y0: bord[1], t0: now, n: Math.floor(now * 97) % 50, s }); }
  if (!ATK.L.length) return; const cv = o.canvas, dp = dpDe(cv), c0 = ctx; o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  o.beginPath(); o.rect(0, 0, W, H); if (bd) o.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); if (Pc) { o.moveTo(Pc.x + Pc.r * 1.2, Pc.y); o.arc(Pc.x, Pc.y, Pc.r * 1.2, 0, TAU); } o.clip('evenodd');
  ctx = o; const VOL = 0.95;
  try { ATK.L.forEach(a => { const b = a.q.b, cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2, rx = b.width / 2 + 16, ry = b.height / 2 + 14, t = now - a.t0;
    const dx = cx - a.x0, dy = cy - a.y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, k2 = 1 / Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2), hx = cx - ux * k2, hy = cy - uy * k2;   // (le point d'impact, sur l'ellipse du bouclier)
    if (t < VOL) { const v = t / VOL, e = v * v * (3 - 2 * v) * 0.3 + v * 0.7, x = lerp(a.x0, hx, e) + Math.sin(t * 11 + a.s * 9) * 6 * (1 - v), y = lerp(a.y0, hy, e); o.strokeStyle = `rgba(${BL},0.5)`; o.lineWidth = 1.2; o.setLineDash([2, 6]); o.beginPath(); o.moveTo(lerp(a.x0, hx, Math.max(0, e - 0.15)), lerp(a.y0, hy, Math.max(0, e - 0.15))); o.lineTo(x, y); o.stroke(); o.setLineDash([]);
      caillou(x, y, 13, now * 3 + a.s * 5, a.n, 1, true); return; }
    const u = t - VOL; if (!a.fait) { a.fait = true; a.q.e.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${ux * 5}px,${uy * 5}px)` }, { transform: 'translate(0,0)' }], { duration: 260, easing: 'ease-out', composite: 'add' }); }
    // le bouclier : des alvéoles le long de l'ellipse, vives près de l'impact ; l'ellipse elle-même, un instant
    const f = 1 - c01(u / 0.8), ai = Math.atan2((hy - cy) / ry, (hx - cx) / rx); if (f > 0) { o.strokeStyle = `rgba(150,200,255,${0.6 * f})`; o.lineWidth = 1; o.beginPath(); o.ellipse(cx, cy, rx, ry, 0, 0, TAU); o.stroke();
      for (let j = -6; j <= 6; j++) { const an = ai + j * 0.26, x = cx + Math.cos(an) * rx, y = cy + Math.sin(an) * ry, w = Math.exp(-(j * j) / 10) * f, r = 7 * (0.6 + 0.4 * w) * (1 + (1 - f) * 0.3); if (w < 0.05) continue;
        o.strokeStyle = NUIT; o.lineWidth = 3.5; o.beginPath(); for (let m = 0; m <= 6; m++) { const tt = m / 6 * TAU + Math.PI / 6; m ? o.lineTo(x + Math.cos(tt) * r, y + Math.sin(tt) * r) : o.moveTo(x + Math.cos(tt) * r, y + Math.sin(tt) * r); } o.stroke(); o.strokeStyle = `rgba(170,215,255,${w})`; o.lineWidth = 1.5; o.stroke(); } }
    // le méchant repart, sonné, en tournoyant (il rapetisse en s'éloignant, hors de l'écran)
    const v = u / 1.1; if (v < 1) { const x = hx - ux * v * 520 + (a.s - 0.5) * v * 300, y = hy - uy * v * 380 + v * v * 260; caillou(x, y, 13 * (1 - v * 0.6), now * 14, a.n, 1, true);
      if (v < 0.4) { o.font = '700 13px "Space Grotesk",system-ui,sans-serif'; o.textAlign = 'center'; o.strokeStyle = NUIT; o.lineWidth = 3.5; const tx = ['paf', 'bonk', 'toc'][a.n % 3]; o.strokeText(tx, hx, hy - 16); o.fillStyle = `rgb(${BL})`; o.fillText(tx, hx, hy - 16); }
      for (let j = 0; j < 3; j++) { const an = now * 8 + j * TAU / 3; o.fillStyle = '#ffe9a8'; o.beginPath(); o.arc(x + Math.cos(an) * 16, y - 14 + Math.sin(an) * 5, 2, 0, TAU); o.fill(); } } }); }
  finally { ctx = c0; o.restore(); }
  for (let i = ATK.L.length - 1; i >= 0; i--) if (now - ATK.L[i].t0 > VOL + 1.2 || now < ATK.L[i].t0) ATK.L.splice(i, 1);
}
// (vague 96, l'audit : « les terminaux », l'originalité) : ton écran devient le mien. Tant que la scène se dessine, tout l'écran se découpe
// en volets comme un tmux : un trait vertical part de la souris et coupe l'écran en deux, puis chaque moitié se recoupe ; chaque volet a
// son invite qui tape sa commande (un agent par volet), et la barre d'état en haut liste les fenêtres. Le volet où est la souris est l'actif
// (son cadre en vert, l'étoile dans la barre) : on passe d'un agent à l'autre en bougeant la souris. Toutes les 9 s, l'écran se redécoupe
// autour d'elle ; les éléments du vrai site que coupe un trait s'écartent d'un pas. La souris partie, les traits se rétractent vers elle.
const TMX = { t: -99, k: 0, T: 0, t0: -99, L: null, act: -1, ui: null, uiT: -9 };
function tmux(o, now) {
  const on = now - TMX.t < 0.3 && !reduitMvt(), dt = Math.min(0.2, Math.max(0, now - (TMX.T || now))); TMX.T = now;
  TMX.k += ((on ? 1 : 0) - TMX.k) * Math.min(1, dt * (on ? 2.5 : 4)); if (!on && TMX.k < 0.01) { TMX.k = 0; TMX.L = TMX.vieux = null; return; }
  const W = window.innerWidth, H = window.innerHeight, P = souris(), FR = !en();
  if (!TMX.ui || now - TMX.uiT > 1) { TMX.uiT = now; TMX.ui = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *')].filter(e => !e.closest('.scenes, #stage')).map(e => ({ e, b: e.getBoundingClientRect() })).filter(q => q.b.width > 0); }
  if (on && (!TMX.L || now - TMX.t0 > 9)) {   // un nouveau découpage, autour de la souris
    TMX.vieux = TMX.L; TMX.t0 = now; const x = clamp(P ? P.x : W / 2, W * 0.28, W * 0.72), yA = clamp(P ? P.y : H * 0.45, H * 0.25, H * 0.7), yB = clamp(H - yA + (bruit(now) - 0.5) * H * 0.15, H * 0.25, H * 0.75);
    TMX.L = { x, yA, yB, v: x < W / 2 ? 1 : 0, cmd: bruit(now * 3.1) };
    TMX.ui.forEach((q, i) => { const b = q.b; if (x > b.left - 4 && x < b.right + 4) setTimeout(() => q.e.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${(b.left + b.right) / 2 < x ? -6 : 6}px)`, offset: 0.4 }, { transform: 'translateX(0)' }], { duration: 420, easing: 'ease-out', composite: 'add' }), 160 + i * 20); });
  }
  if (!TMX.L) return;
  const cv = o.canvas, dp = dpDe(cv), bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.lineCap = o.lineJoin = 'round';
  o.beginPath(); o.rect(0, 0, W, H); if (bd) o.rect(bd.x - 16, bd.y - 12, bd.w + 32, bd.h + 24); if (Pc) { o.moveTo(Pc.x + Pc.r * 1.2, Pc.y); o.arc(Pc.x, Pc.y, Pc.r * 1.2, 0, TAU); } o.clip('evenodd');
  // (au redécoupage, l'ancien découpage se rétracte vers la souris pendant que le nouveau pousse : jamais d'image vide)
  const tN = now - TMX.t0, R = 0.45; if (TMX.vieux && tN < R) dessineL(TMX.vieux, 99, TMX.k * (1 - sm(tN / R)), false);
  dessineL(TMX.L, TMX.vieux ? tN - R : tN, TMX.k, true);
  o.restore();
  function dessineL(L, t, k, principal) {
  const g = (d, dur) => sm(c01((t - d) / dur)) * k;   // la pousse d'un trait (et sa rétractation, avec k)
  const panes = [[0, 0, L.x, L.yA], [0, L.yA, L.x, H], [L.x, 0, W, L.yB], [L.x, L.yB, W, H]];
  const act = P ? panes.findIndex(q => P.x >= q[0] && P.x < q[2] && P.y >= q[1] && P.y < q[3]) : -1; if (principal) TMX.act = act;
  const trait = (x0, y0, x1, y1, f, vert) => { if (f <= 0) return; const mx = lerp(x0, x1, 0.5), my = lerp(y0, y1, 0.5);
    [[NUIT, 4], [`rgba(${BL},0.55)`, 1.2]].forEach(([c, w]) => { o.strokeStyle = c; o.lineWidth = w; o.beginPath(); o.moveTo(lerp(mx, x0, f), lerp(my, y0, f)); o.lineTo(lerp(mx, x1, f), lerp(my, y1, f)); o.stroke(); }); };
  // les traits : le vertical part de la souris, puis les deux horizontaux ; sur le trait, les petits « │ » des bords de volets, comme dans un terminal
  const fV = g(0, 0.5), fA = g(0.35, 0.45), fB = g(0.55, 0.45);
  { const y0 = P ? clamp(P.y, 0, H) : H / 2; [[NUIT, 4], [`rgba(${BL},0.55)`, 1.2]].forEach(([c, w]) => { o.strokeStyle = c; o.lineWidth = w; o.beginPath(); o.moveTo(L.x, y0 - fV * (y0 + 10)); o.lineTo(L.x, y0 + fV * (H - y0 + 10)); o.stroke(); }); }
  trait(L.x, L.yA, 0, L.yA, fA * 2 > 1 ? 1 : fA * 2, false); trait(L.x, L.yB, W, L.yB, fB * 2 > 1 ? 1 : fB * 2, false);
  o.lineWidth = 1.2; o.strokeStyle = `rgba(${BL},0.55)`;
  // le volet actif : son cadre en vert, qui suit la souris d'un volet à l'autre
  if (act >= 0 && fB > 0.5) { const q = panes[act], m = 3; o.strokeStyle = NUIT; o.lineWidth = 4.5; o.strokeRect(q[0] + m, q[1] + m, q[2] - q[0] - m * 2, q[3] - q[1] - m * 2); o.strokeStyle = `rgba(143,224,160,${0.85 * k})`; o.lineWidth = 1.6; o.strokeRect(q[0] + m, q[1] + m, q[2] - q[0] - m * 2, q[3] - q[1] - m * 2); }
  // dans chaque volet, son invite et sa commande, tapées lettre à lettre, puis le résultat
  const CMD = FR ? [['claude', '« découpe le module auth »'], ['npm test', '-- --watch'], ['git worktree add', '../relecture'], ['claude', '« relis la PR, sois sévère »']]
                 : [['claude', '"split the auth module"'], ['npm test', '-- --watch'], ['git worktree add', '../review'], ['claude', '"review the PR, be harsh"']];
  const OK = FR ? ['✓ module découpé, tests verts', '✓ tout passe', '✓ branche prête', '✓ 2 remarques'] : ['✓ module split, tests green', '✓ all passing', '✓ branch ready', '✓ 2 comments'];
  const Ly = window.EspacePlume && EspacePlume.M && EspacePlume.M.lay, hautUI = Ly && Ly.barre ? Ly.barre.bas + 6 : 92;   // (sous la barre des chapitres)
  o.font = '600 10px ui-monospace,Menlo,Consolas,monospace'; o.textBaseline = 'alphabetic'; o.textAlign = 'left';
  panes.forEach((q, i) => { const d = 0.7 + i * 0.35, u = t - d; if (u < 0 || k < 0.5) return; const j = (i + Math.floor(L.cmd * 4)) % 4, c = CMD[j], x = q[0] + 12, y0 = (q[1] < 60 ? Math.max(92, hautUI) : q[1]) + 22;
    if (y0 + 20 > q[3]) return; o.save(); o.beginPath(); o.rect(q[0] + 6, q[1], q[2] - q[0] - 12, q[3] - q[1]); o.clip(); const txt = c[0] + ' ' + c[1], n = Math.min(txt.length, Math.floor(u * 22)), vu = txt.slice(0, n), pr = `agent-${i + 1} $ `;
    const ecrit = (s, x, y, col) => { o.strokeStyle = NUIT; o.lineWidth = 3.5; o.strokeText(s, x, y); o.fillStyle = col; o.fillText(s, x, y); };
    ecrit(pr, x, y0, '#8fe0a0'); const xp = x + o.measureText(pr).width; ecrit(vu, xp, y0, `rgb(${BL})`);
    if (n < txt.length || Math.floor(now * 2.4) % 2) { const xc = xp + o.measureText(vu).width + 1; o.fillStyle = act === i ? '#8fe0a0' : `rgba(${BL},0.7)`; o.fillRect(xc, y0 - 9, 6, 11); }
    if (u > txt.length / 22 + 1.2) ecrit(OK[j], x, y0 + 15, '#8fe0a0'); o.restore(); });
  // la barre d'état, en haut : la session, les fenêtres, l'étoile sur celle de la souris
  if (fV > 0.3) { const noms = FR ? ['claude', 'tests', 'relecture', 'revue'] : ['claude', 'tests', 'worktree', 'review'], s0 = '[portfolio] ', ws = noms.map((nm, i) => `${i}:${nm}${i === act ? '*' : ''}`).join('  ');
    o.font = '600 10px ui-monospace,Menlo,Consolas,monospace'; const w = o.measureText(s0 + ws).width, x = W / 2 - w / 2, y = 13; let xi = x;
    o.strokeStyle = NUIT; o.lineWidth = 3.5; o.strokeText(s0 + ws, x, y); o.fillStyle = '#8fe0a0'; o.fillText(s0, xi, y); xi += o.measureText(s0).width;
    noms.forEach((nm, i) => { const s = `${i}:${nm}${i === act ? '*' : ''}`; o.fillStyle = i === act ? '#8fe0a0' : `rgba(${BL},0.75)`; o.fillText(s, xi, y); xi += o.measureText(s + '  ').width; }); }
    }
}
// (vague 89 : la constellation de la nuée autour de l'élément que la souris approche, posée ici, par-dessus la Terre et tout le reste)
function constel(o) { const C = window.EspaceNuee && EspaceNuee.CST, L = C && C.pts; if (!L || !L.length) return; const dp = dpDe(o.canvas); o.save(); o.setTransform(dp, 0, 0, dp, 0, 0); o.globalCompositeOperation = 'lighter';
  for (let i = 0; i < L.length; i += 4) { o.globalAlpha = L[i + 3]; o.drawImage(C.lueur, L[i] - L[i + 2], L[i + 1] - L[i + 2], L[i + 2] * 2, L[i + 2] * 2); } o.restore(); }
function vise(c0, now) {
  const c = VISE.c, P = souris(); VISE.c = null; const dt = Math.min(0.2, Math.max(0, now - (VISE.t || now))); VISE.t = now;
  if (c && P && (VISE.id === null || VISE.id === c.id || VISE.k < 0.05)) { VISE.id = c.id; VISE.k = Math.min(1.6, VISE.k + dt * 1.4); VISE.rb = c; }
  else { VISE.k = Math.max(0, VISE.k - dt * 3); if (VISE.k === 0) VISE.id = null; }
  const R = VISE.rb; while (TAMPON.length && now - TAMPON[0].t0 > 3.4) TAMPON.shift(); const sg = now - SURGE.t0 < 1.6 && now >= SURGE.t0, ins = now - INSP.t < 0.3 || INSP.k > 0; if (!VC && (!R || VISE.k <= 0) && !TAMPON.length && !ENVOL.length && !FEUX.length && !sg && !ins && !INST.q && !pariOn(now) && !(now - GF.t < 0.3 || GF.k > 0) && !(now - RAG.t < 0.3 || RAG.k > 0) && !(now - REQ.t < 0.3 || REQ.L.length) && !(now - DEP.t < 0.3 || DEP.n > 0.03) && !(now - ATK.t < 0.3 || ATK.L.length) && !(now - TMX.t < 0.3 || TMX.k > 0.01) && !(window.EspaceNuee && EspaceNuee.CST.pts.length)) return; const o = toileVise(c0.canvas); constel(o); if (now - TMX.t < 0.3 || TMX.k > 0.01) tmux(o, now); if (now - ATK.t < 0.3 || ATK.L.length) attaques(o, now); if (now - DEP.t < 0.3 || DEP.n > 0.03 || now - DEP.t0 < 3) deploieUI(o, now); if (now - REQ.t < 0.3 || REQ.L.length) requetes(o, now); if (now - RAG.t < 0.3 || RAG.k > 0) ragUI(o, now); if (now - GF.t < 0.3 || GF.k > 0) gardeFou(o, now); if (sg) eclairs(o, now); if (pariOn(now)) pari(o, now); if (ins) inspecteur(o, now); if (INST.q) installe(o, now);
  TAMPON.forEach(q => tamponVitre(o, q, now - q.t0)); if (ENVOL.length) envols(o, now); if (FEUX.length) feux(o, now); if (!R || VISE.k <= 0 || !P) return;
  const W0 = window.Chats && Chats.K && Chats.K.Wd, chat = W0 && W0.cats.some(q => q.sp && q.sp.m === 'agrippe');
  const cv = o.canvas, dp = dpDe(cv), px = P.x * dp, py = P.y * dp, ln = Math.max(1, dp), k = VISE.k;
  o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.lineCap = o.lineJoin = 'round';
  // les deux traits de balayage, des yeux vers la souris (en tirets qui courent), qui se tendent en premier
  const bal = c01(k / 0.45), ex = R.x, ey = R.y;
  [-1, 1].forEach(g => { const sx = ex + g * R.r * 0.36, sy = ey, tx = sx + (px - sx) * bal, ty = sy + (py - sy) * bal;
    o.globalAlpha = 0.75; o.strokeStyle = `rgb(${BL})`; o.lineWidth = ln * 1.1; o.setLineDash([6 * ln, 7 * ln]); o.lineDashOffset = -now * 60 * ln; o.beginPath(); o.moveTo(sx, sy); o.lineTo(tx, ty); o.stroke(); });
  o.setLineDash([]);
  // le cadre : quatre coins qui se referment de loin sur le pointeur (puis respirent), un réticule au centre
  const f = sm(c01((k - 0.3) / 0.5)); if (f > 0) {
    const h0 = 32 * dp, h = h0 * (1 + (1 - f) * 2.2) + Math.sin(now * 5) * 1.5 * dp, cl = h * 0.42 * Math.min(1, f * 1.3), rot = (1 - f) * 0.6;
    o.translate(px, py); o.rotate(rot); o.globalAlpha = 1;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([gx, gy]) => { const cx = gx * h, cy = gy * h;
      o.strokeStyle = 'rgba(9,11,16,0.9)'; o.lineWidth = ln * 4.5; o.beginPath(); o.moveTo(cx - gx * cl, cy); o.lineTo(cx, cy); o.lineTo(cx, cy - gy * cl); o.stroke();
      o.strokeStyle = `rgb(${BL})`; o.lineWidth = ln * 2; o.stroke(); });
    o.lineWidth = ln; o.beginPath(); o.arc(0, 0, h * 0.18 * f, 0, TAU); o.stroke(); o.rotate(-rot);
    // l'étiquette de papier, accrochée au coin haut-droit : elle se déplie de la largeur
    const lab = c01((k - 0.7) / 0.35); if (lab > 0) {
      const sc = (0.97 - Math.abs(Math.sin(now * 1.7 + R.id)) * 0.04 - (Math.sin(now * 7.3) > 0.93 ? 0.09 : 0)).toFixed(2), t = (chat ? (en() ? 'cat · ' : 'chat · ') : en() ? 'mouse · ' : 'souris · ') + (en() ? sc : sc.replace('.', ','));
      const fs = Math.round(13 * dp); o.font = `600 ${fs}px "Space Grotesk",system-ui,sans-serif`; const tw = o.measureText(t).width + 12 * dp, th = fs * 1.6, lx = h - 2 * dp, ly = -h - th - 4 * dp, w = tw * sm(lab);
      o.fillStyle = PAP; o.strokeStyle = ENC; o.lineWidth = ln * 1.2; o.beginPath(); o.rect(lx, ly, w, th); o.fill(); o.stroke();
      if (lab > 0.6) { o.save(); o.beginPath(); o.rect(lx, ly, w, th); o.clip(); o.fillStyle = ENC; o.textBaseline = 'middle'; o.fillText(t, lx + 6 * dp, ly + th / 2 + 1); o.restore(); }
      o.strokeStyle = `rgb(${BL})`; o.lineWidth = ln; o.beginPath(); o.moveTo(h, -h); o.lineTo(lx + 4 * dp, ly + th); o.stroke(); }
  }
  o.restore();
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
const dpDe = cv => (cv.clientWidth ? cv.width / cv.clientWidth : cv.width / (window.innerWidth || cv.width)) || 1;   // (la toile hors champ n'a pas de taille à l'écran : on la compare à la fenêtre)
const sourisIci = () => { const P = souris(); if (!P) return null; const m = ctx.getTransform(), k = dpDe(ctx.canvas), i = m.inverse(), px = P.x * k, py = P.y * k; return { x: i.a * px + i.c * py + i.e, y: i.b * px + i.d * py + i.f }; };
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
const NID = { vu: false };
function lui(x, y, r, o = {}) {
  const nw = o.now || 0, P = sourisIci(), regard = P ? (() => { const dx = P.x - x, dy = P.y - y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; })() : [Math.sin(nw * 0.5) * 0.6, 0.2];
  // (vague 50, l'audit : « toi, dans le style des chats », immersion) : il nous voit arriver. La souris tout près : il hoche la tête et nous salue,
  // « salut ! » écrit au-dessus de lui (le petit chat de l'épaule regarde aussi) ; le reste du temps, il travaille
  const pres = P ? Math.hypot(P.x - x, P.y - y) < r * 3.6 : false;
  // (vague 79, l'audit : « toi », il sort de la scène) : la souris reste près de lui : il lève son tampon et le frappe sur la vitre, sous la souris
  { const m = ctx.getTransform(); LUI.x = m.a * x + m.c * y + m.e; LUI.y = m.b * x + m.d * y + m.f; LUI.r = r * Math.hypot(m.a, m.b);
    const dtl = Math.min(0.2, Math.max(0, nw - (LUI.t || nw))); LUI.t = nw; LUI.h = pres && r > 8 ? LUI.h + dtl : 0;
    if (LUI.h > 1.3 && nw - LUI.t0 > 7) { LUI.t0 = nw; LUI.h = 0; const S = souris(), cv = ctx.canvas, dp = dpDe(cv); if (S) TAMPON.push({ x: S.x * dp, y: S.y * dp, t0: nw, rot: (Math.random() - 0.5) * 0.5, dp }); }
    const ft = nw - LUI.t0; if (ft < 0.9) o = Object.assign({}, o, { tp: ft < 0.25 ? 1 - ft / 0.25 * 0.2 : Math.max(o.tp || 0, 1 - (ft - 0.25) / 0.65) }); } if (pres) { o = Object.assign({}, o, { hoche: Math.sin(nw * 7) * 0.8 }); if (r > 8) mot(en() ? 'hi!' : 'salut !', x + r * 0.2, y - r * 2.1 + Math.sin(nw * 5) * r * 0.05, Math.max(11, r * 0.42), o.a ?? 1); }
  const a = o.a ?? 1, w = clamp01(r / 30) * 0.7 + 0.45, hy = y + (o.hoche || 0) * r * 0.1, by = y + r * 0.95, bw = r * 1.2, bh = r * 1.45, g = o.cote || -1, tp = o.tp || 0;
  // le bras qui ne tamponne pas, derrière le corps
  cerne(() => { ctx.beginPath(); ctx.moveTo(x - g * bw * 0.8, by + r * 0.35); ctx.quadraticCurveTo(x - g * bw * 1.25, by + bh * 0.55, x - g * bw * 0.7, by + bh * 0.85); }, w * 1.9, a, null);
  // le buste : des épaules rondes, le col, une petite montagne sur la poitrine
  cerne(() => { ctx.beginPath(); ctx.moveTo(x - bw, by + bh); ctx.quadraticCurveTo(x - bw * 1.08, by + r * 0.1, x - r * 0.3, by); ctx.lineTo(x + r * 0.3, by); ctx.quadraticCurveTo(x + bw * 1.08, by + r * 0.1, x + bw, by + bh); ctx.closePath(); }, w, a);
  ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.7; ctx.beginPath(); ctx.moveTo(x - r * 0.32, by + r * 0.02); ctx.quadraticCurveTo(x, by + r * 0.32, x + r * 0.32, by + r * 0.02); ctx.stroke();
  // (vague 151 de l'audit : « toi ») : le t-shirt Patagonia : l'étiquette rectangulaire, la ligne de crêtes découpée, les bandes du ciel dessous ;
  // le col en V arrondi, l'ourlet des manches courtes
  { const mx = x + r * 0.45, my = by + bh * 0.42, lw2 = r * 0.27, lh = r * 0.17;
    if (r > 10) { cerne(() => { ctx.beginPath(); ctx.rect(mx - lw2, my - lh, lw2 * 2, lh * 2); }, w * 0.6, a, null);
      ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.6, G.lw * w * 0.4); ctx.lineJoin = 'round'; ctx.beginPath(); const C = [0, 0.55, 0.3, 0.75, 0.15, 0.95, 0.5, 0.65, 0.2, 0.45, 0]; C.forEach((v, i) => { const px = mx - lw2 + i / (C.length - 1) * lw2 * 2, py = my + lh * 0.25 - v * lh * 0.95; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
      ctx.lineWidth = Math.max(0.5, G.lw * w * 0.25); ctx.beginPath(); [0.5, 0.75].forEach(v => { ctx.moveTo(mx - lw2 * 0.85, my + lh * v); ctx.lineTo(mx + lw2 * 0.85, my + lh * v); }); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(mx - r * 0.28, my + r * 0.12); ctx.lineTo(mx - r * 0.1, my - r * 0.1); ctx.lineTo(mx, my); ctx.lineTo(mx + r * 0.08, my - r * 0.06); ctx.lineTo(mx + r * 0.26, my + r * 0.12); ctx.stroke(); }
    if (r > 10) { ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * w * 0.55; ctx.beginPath(); [-1, 1].forEach(sd => { ctx.moveTo(x + sd * bw * 0.62, by + r * 0.12); ctx.quadraticCurveTo(x + sd * bw * 0.86, by + r * 0.48, x + sd * bw * 1.02, by + r * 0.72); }); ctx.stroke(); } }
  // (vague 25 de l'audit : « toi, dans le style des chats ») : du volume à la plume, comme les chats-robots : des hachures sur l'épaule dans l'ombre
  if (r > 12) { ctx.save(); ctx.beginPath(); ctx.moveTo(x - bw, by + bh); ctx.quadraticCurveTo(x - bw * 1.08, by + r * 0.1, x - r * 0.3, by); ctx.lineTo(x + r * 0.3, by); ctx.quadraticCurveTo(x + bw * 1.08, by + r * 0.1, x + bw, by + bh); ctx.closePath(); ctx.clip();
    // (vague 151 : à l'encre pleine, plus fines et plus courtes : plus de gris boueux)
    ctx.globalAlpha = a; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.6, G.lw * w * 0.22); ctx.lineCap = 'round'; ctx.beginPath(); const sd = g > 0 ? -1 : 1;
    for (let i = 0; i < 4; i++) { const u = x + sd * bw * (0.62 + i * 0.12); ctx.moveTo(u, by + r * (0.45 + i * 0.08)); ctx.lineTo(u + sd * r * 0.16, by + bh * 0.92); } ctx.stroke(); ctx.restore(); }
  // le cou, la tête : un visage long ; les cheveux en épis par-dessus
  cerne(() => { ctx.beginPath(); ctx.rect(x - r * 0.22, by - r * 0.35, r * 0.44, r * 0.45); }, w * 0.8, a);
  // (vague 8, l'audit : « ton dessin dans l'espace est raide ») : comme le logo (Mathieu, 29/09 : « je fais peur ») : des oreilles,
  // des épis bien nets, des sourcils ronds, un grand sourire
  // (vague 151 : un visage plus long et plus fin, le menton qui descend, comme son modèle)
  [-1, 1].forEach(sd => cerne(() => { ctx.beginPath(); ctx.ellipse(x + sd * r * 0.62, hy + r * 0.1, r * 0.13, r * 0.2, 0, 0, TAU); }, w * 0.8, a));
  cerne(() => { ctx.beginPath(); ctx.moveTo(x - r * 0.63, hy); ctx.bezierCurveTo(x - r * 0.66, hy - r * 1.32, x + r * 0.66, hy - r * 1.32, x + r * 0.63, hy); ctx.bezierCurveTo(x + r * 0.6, hy + r * 0.72, x + r * 0.3, hy + r * 1.06, x, hy + r * 1.06); ctx.bezierCurveTo(x - r * 0.3, hy + r * 1.06, x - r * 0.6, hy + r * 0.72, x - r * 0.63, hy); ctx.closePath(); }, w, a);
  cerne(() => { ctx.beginPath(); const n = 9; for (let i = 0; i <= n; i++) { const t = Math.PI + 0.25 + i / n * (Math.PI - 0.5), R = i % 2 ? 1.24 + 0.06 * Math.sin(i * 3.7) + 0.05 * Math.sin(nw * 2.3 + i * 1.7) : 0.96, j = i % 2 ? 0.12 * Math.sin(i * 2.1) + 0.06 * Math.sin(nw * 1.7 + i) : 0; ctx.lineTo(x + Math.cos(t + j) * r * 0.66 * R, hy - r * 0.18 + Math.sin(t + j) * r * 0.95 * R); }
    for (let i = 8; i >= 0; i--) { const t = Math.PI + 0.25 + i / 8 * (Math.PI - 0.5); ctx.lineTo(x + Math.cos(t) * r * 0.64, hy - r * 0.05 + Math.sin(t) * r * 0.72); } ctx.closePath(); }, w, a);
  // les yeux : deux grands ovales noirs, deux reflets (ils clignent) ; (vague 33) ils suivent la souris
  const tN = window.__nid ?? (nw + 3) % 15, leve = !P && (o.tp || 0) < 0.9 && tN > 0.4 && tN < 4.2;   // (le nid, plus bas : il lève les yeux vers le chat sur sa tête)
  const cl = Math.sin(nw * 1.1 + 1) > 0.985 ? 0.12 : 1, vx = r * 0.07 * (leve ? -(o.cote || -1) * 0.4 : regard[0]), vy = r * 0.05 * (leve ? -1.2 : regard[1]);
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
  // (vague 134 de l'audit : « toi, dans le style des chats », de très bien à inoubliable) : le nid. Toutes les quinze secondes, le petit chat de
  // l'épaule saute sur sa tête et se love dans ses épis (sur le côté : sa queue pend à côté du visage, jamais dessus) ; lui lève les yeux vers
  // le chat sans s'arrêter de travailler ; une petite sieste (« zz »), puis le chat redescend d'un bond sur l'épaule
  const Sh = [x - g * r * 1.05, by + r * 0.08], tt = window.__nid ?? (nw + 3) % 15,   // (__nid : pour les captures de test)
    nid = r > 8 && tp < 0.9 && !pres && tt < 4.4 ? tt : -1;
  if (nid < 0) { if (r > 8) epaule(Sh[0], Sh[1], r * 0.5, nw, a, regard, tp > 0.9 ? 0 : Math.max(0, Math.sin(Math.PI * c01((tp - 0.3) / 0.5))) * (tp > 0.3 ? 1 : 0)); return; }
  const Hd = [x - g * r * 0.32, hy - r * 1.08], up = sm(c01(nid / 0.6)), down = sm(c01((nid - 3.8) / 0.6)), e = up * (1 - down), arc = Math.sin(Math.PI * (nid < 2 ? up : down)) * r * 0.9;
  const cx = lerp(Sh[0], Hd[0], e), cy = lerp(Sh[1], Hd[1], e) - arc, dors = nid > 1.4 && nid < 3.8;
  ctx.save(); ctx.translate(cx, cy); if (nid > 0.6 && nid < 1.4) ctx.rotate(Math.sin((nid - 0.6) * 16) * 0.18); if (dors) ctx.scale(1.06, 0.88 + Math.sin(nw * 3) * 0.03); ctx.translate(-cx, -cy);
  epaule(cx, cy, r * 0.5, nw, a, dors ? [0, 1] : [g * 0.6, 0.3], 0); ctx.restore();
  if (nid > 0.55 && nid < 0.95) mot('boing', Hd[0] - g * r * 0.9, Hd[1] - r * 0.4, Math.max(10, r * 0.3), 1);
  if (dors) { const z = (nw * 0.8) % 1; mot('z', cx + g * -r * 0.5 + z * r * 0.3, cy - r * 0.6 - z * r * 0.5, Math.max(9, r * (0.2 + z * 0.12)), 1);
    if (!NID.vu && window.Dex && Dex.vu) { NID.vu = true; Dex.vu('nid-epis'); } }
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
  UI.map(q => { const z = (q.z + now * 0.045) % 1, f = 0.3 + z * z * 1.05; return { q, z, f, x: G.cx + q.x * HW * (0.62 + 0.4 * z), y: (top + bas) / 2 + q.y * (bas - top) / 2 * (0.6 + 0.45 * z) }; })
    .sort((A, B) => A.z - B.z).forEach(({ q, z, f, x, y }) => {
      // (vague 145, l'audit : « front », design) : ils ne s'estompent plus en gris (des fantômes boueux au bord du ciel) : ils naissent petits
      // au fond, grossissent en venant vers nous et, au bout, rapetissent jusqu'à rien en filant vers les bords ; toujours nets, encre et papier
      // (vague 165) ils arrivent en grandissant, à pleine encre : avant, ils entraient en fondu et passaient par le gris
      const gr = sm(Math.min(1, z * 4, (1 - z) * 5)), s = G.s * 0.1 * f * gr * sm(e), al = 1; if (gr <= 0.03 || e <= 0.02 || y - s < top || y + s > bas) return;
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
const LIVRE = { vu: false }; const DIX = { vu: false };
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
      // (vague 86, l'audit : « l'équipe ») : la ola ne s'arrête pas aux gradins. Quand elle passe du côté d'un élément de l'interface (logo, langue,
      // flèches, boutons, chapitres), il se lève à son tour, bras en l'air (il saute), puis se rassoit : tout l'écran fait la ola
      if (c > 3.3 && c < 5.9 && !reduitMvt()) { const v = ((c - 3.3) / 1.3) % 1, tour = Math.floor((c - 3.3) / 1.3), m = ctx.getTransform(), dp = dpDe(ctx.canvas), R = P[P.length - 1];
        if (!OLA.el || now - OLA.t > 2) { OLA.t = now; OLA.el = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *, .nav, [class*="fleche"]')].map(e => ({ e, b: e.getBoundingClientRect(), n: -1 })).filter(q => q.b.width); }
        const px = (m.a * pied[0] + m.c * pied[1] + m.e) / dp, py = (m.b * pied[0] + m.d * pied[1] + m.f) / dp, sx = Math.hypot(m.a, m.b) / dp;
        OLA.el.forEach(q => { const cx = q.b.left + q.b.width / 2, cy = q.b.top + q.b.height / 2, u = ((Math.atan2((cy - py) / Math.max(20, R.ry * sx), (cx - px) / Math.max(20, R.rx * sx)) / TAU) % 1 + 1) % 1, d = Math.min(Math.abs(u - v), 1 - Math.abs(u - v));
          if (d < 0.03 && q.n !== tour) { q.n = tour; q.e.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-16px) scale(1.12, 1.18) rotate(-3deg)', offset: 0.35 }, { transform: 'translateY(-10px) scale(1.06) rotate(3deg)', offset: 0.6 }, { transform: 'translateY(0) scale(1)' }], { duration: 650, easing: 'ease-out', composite: 'add' }); } }); }
      // les gradins : chaque rang, son ellipse au sol (sa moitié du fond, puis sa moitié de devant, par-dessus lui)
      const al0 = c01((c - 0.6) / 0.8);
      [0, 1, 2, 3].forEach(i => { const f = P.find(q => q.i === i); if (!f) return; const L0 = [], L1 = [];
        // (vague 160) chaque gradin se trace au stylo depuis le devant, des deux côtés à la fois, au lieu d'apparaître en fondu
        if (al0 <= 0) return; const dem = Math.PI / 2, ouv = Math.PI * al0;
        for (let u = 0; u <= 64; u++) { const t = dem - ouv + u / 64 * 2 * ouv, q = [pied[0] + Math.cos(t) * f.rx * 1.04, pied[1] + Math.sin(t) * f.ry * 1.04 + f.dy + P.bot * 0.2]; (Math.sin(t) < 0 ? L0 : L1).push(q); }
        derriere.push({ z: -10 - i, f: () => L0.length > 1 && trait(L0, false, 0.5, 0.25) }); devant.push({ z: 10 + i, f: () => trait(L1, false, 0.5, 0.3) }); });
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
      // (vague 160) le projecteur s'ouvre et se referme comme un diaphragme (son faisceau s'élargit, puis se pince en un trait) : plus de fondu
      if (spot > 0.02) { const h = [pied[0], G.haut + 4], o = sm(spot), b = pw * 1.6 * o; style(0.6, 0.5); ctx.beginPath(); ctx.moveTo(h[0] - G.s * 0.04 * o, h[1]); ctx.lineTo(pied[0] - b, pied[1]); ctx.moveTo(h[0] + G.s * 0.04 * o, h[1]); ctx.lineTo(pied[0] + b, pied[1]); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(pied[0], pied[1], Math.max(1, b), Math.max(0.5, pw * 0.3 * o), 0, 0, TAU); ctx.stroke(); }
      cerne(() => { ctx.beginPath(); ctx.moveTo(pied[0] - pw, pt); ctx.lineTo(pied[0] - pw, pied[1]); ctx.ellipse(pied[0], pied[1], pw, pw * 0.26, 0, Math.PI, 0, true); ctx.lineTo(pied[0] + pw, pt); ctx.closePath(); }, 0.9, 1);
      cerne(() => { ctx.beginPath(); ctx.ellipse(pied[0], pt, pw, pw * 0.26, 0, 0, TAU); }, 0.9, 1);
      const dirige = c > 2.6 && c < 6.2;
      { const rr = rr0 * (1 + 0.3 * rentres / N) * (c > 7.9 ? 1 + 0.06 * Math.sin(Math.PI * c01((c - 7.9) / 0.5)) : 1);
        lui(pied[0], pt - rr * 2.4, rr, { now, hoche: dirige ? Math.sin(now * 6) : 0, tp: dirige ? 0.25 + 0.25 * Math.sin(now * 3.2) : c > 8.1 ? 0 : 0.1 }); }
      // (vague 121, l'audit : « l'équipe ») : la foule ne fait pas qu'applaudir, elle livre. Pendant qu'il dirige, des agents lancent leur travail
      // (une feuille de papier étiquetée : module, tests ✓, revue…) en arc par-dessus l'arène ; il les attrape et les empile sur le podium ;
      // la pile monte, et c'est elle qui fait ×10. Au tourbillon, la pile rentre en lui avec tout le monde (elle rapetisse, jamais de fondu)
      { const LIV = en() ? ['module', 'tests ✓', 'review', 'docs', 'API', 'deploy', 'fix', 'UI', 'migration', 'audit', 'CI ✓', 'release'] : ['module', 'tests ✓', 'revue', 'doc', 'API', 'déploiement', 'correctif', 'interface', 'migration', 'audit', 'CI ✓', 'version'];
        const t0 = 2.7, pas = 0.28, vol = 0.62, cw = Math.max(32, rr0 * 1.5), chh = Math.max(6.5, cw * 0.22), px0 = pied[0] + pw * 1.05 + cw * 0.5, rentre = 1 - sm((c - 6.4) / 0.9);
        const pos = f => { const th = f.th + rot; return [pied[0] + Math.cos(th) * f.rx, pied[1] + Math.sin(th) * f.ry + f.dy - P.bot * 2.6]; };
        const feuille = (x, y, an, k, lab, al) => { ctx.save(); ctx.translate(x, y); ctx.rotate(an); ctx.scale(k, k);
          cerne(() => { ctx.beginPath(); ctx.rect(-cw / 2, -chh / 2, cw, chh); }, 0.55, al); ctx.restore();
          if (k > 0.6 && Math.abs(an) < 0.5) { ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = ENC; ctx.font = `700 ${Math.max(7, chh * 0.78 * k)}px "Space Grotesk",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, x, y + 0.5); ctx.restore(); } };
        let n = 0;
        for (let i = 0; i < 12; i++) { const ta = t0 + i * pas, e = (c - ta) / vol; if (e < 0) break; const f = P[(i * 37 + 11) % N], lab = LIV[i], cible = [px0 + (bruit(i * 7) - 0.5) * cw * 0.18, pt - chh * 0.5 - i * chh * 0.92];
          if (e < 1) { const [x0, y0] = pos(f), u = sm(e), x = lerp(x0, cible[0], u), y = lerp(y0, cible[1], u) - Math.sin(Math.PI * e) * G.s * 0.55;
            feuille(x, y, (1 - e) * (bruit(i) < 0.5 ? -1 : 1) * 5, 0.45 + 0.55 * e, lab, 1); }
          else { n++; if (rentre <= 0) continue; const k = rentre, x = lerp(pied[0], cible[0], k), y = lerp(pt - rr0 * 1.6, cible[1], k);
            feuille(x, y, (bruit(i * 3) - 0.5) * 0.12 + (1 - k) * 3, Math.max(0.05, k), lab, 1); } }
        if (n && rentre > 0 && c < 6.4) mot(String(n), px0 + cw * 0.75, pt - n * chh * 0.92 - chh, Math.max(11, G.s * 0.07), 0.9);
        if (n >= 12 && !LIVRE.vu && window.Dex && Dex.vu) { LIVRE.vu = true; Dex.vu('livrables'); } }
      devant.filter(d => d.z >= 90).forEach(d => d.f());
      if (c > 0.7 && c < 2.6) { const j = Math.floor((c - 0.7) / 0.45), u = ((c - 0.7) % 0.45) / 0.45; const px = Math.max(G.gauche + 30, Math.min(G.droite - 30, coeur[0] + (j % 2 ? -1 : 1) * G.s * (0.4 + 0.2 * bruit(j)))); let py = coeur[1] - G.s * (0.25 + 0.2 * bruit(j * 3)) - u * 12;
        // (vague 160) jamais sur la planète des chats ni sous la barre du haut : le mot descend sous elle
        if (pc && Math.abs(px - pc.x) < pc.r * 1.6 + 30 && Math.abs(py - pc.y) < pc.r * 1.4 + 14) py = pc.y + pc.r * 1.4 + 14; py = Math.max(G.haut + 16, py);
        mot('pop !', px, py, Math.max(13, G.s * 0.1) * (1 + 0.3 * Math.sin(Math.PI * Math.min(1, u * 3))) * (1 - sm((u - 0.6) / 0.4) * 0.95), 1); }
      // (vague 139, l'audit : « l'équipe », originalité) : « là où il fallait une équipe de dix ». Le tourbillon fini, l'équipe qu'il aurait fallu
      // apparaît autour de lui en pointillés, dix silhouettes de développeurs penchés sur leur portable, une par une, un fil pointillé jusqu'à lui ;
      // puis elles rentrent en lui l'une après l'autre (elles rapetissent en filant, jamais de fondu), et chaque entrée fait monter le « ×10 »
      const GH = { t0: 7.0, pas: 0.07, ent: 8.0, pe: 0.09 }, gh = Math.max(8, G.s * 0.062), Rg = G.s * 0.62, ryG = Math.max(gh * 3, Math.min(Rg * 0.5, coeur[1] - G.haut - gh * 3.2));
      let entres = 0;
      if (c > GH.t0) for (let i = 0; i < 10; i++) { const ta = GH.t0 + i * GH.pas, te = GH.ent + i * GH.pe, ap = c01((c - ta) / 0.25), en1 = sm(c01((c - te) / 0.35)); if (ap <= 0) break; if (en1 >= 1) { entres++; continue; }
        const an = Math.PI * (1.1 + 0.8 * i / 9), x0 = coeur[0] + Math.cos(an) * Rg, y0 = coeur[1] + Math.sin(an) * ryG, x = lerp(x0, coeur[0], en1), y = lerp(y0, coeur[1], en1) - Math.sin(Math.PI * en1) * gh * 2,
          k = (0.4 + 0.6 * sm(ap) + 0.25 * Math.sin(Math.PI * c01(ap))) * (1 - en1 * 0.85), g = gh * k, hoche = Math.sin(now * 5 + i) * 0.08;
        ctx.save(); ctx.setLineDash([g * 0.28, g * 0.32]); style(0.55, 0.5); ctx.beginPath(); ctx.moveTo(x, y + g * 0.6); ctx.lineTo(lerp(x, coeur[0], 0.82 * sm(ap)), lerp(y + g * 0.6, coeur[1], 0.82 * sm(ap))); ctx.stroke();
          style(0.8, 0.95); ctx.translate(x, y); ctx.rotate(hoche);
          ctx.beginPath(); ctx.arc(0, -g * 1.25, g * 0.55, 0, TAU); ctx.stroke();   // la tête
          ctx.beginPath(); ctx.moveTo(-g * 0.95, g * 0.9); ctx.quadraticCurveTo(-g * 0.9, -g * 0.55, 0, -g * 0.55); ctx.quadraticCurveTo(g * 0.9, -g * 0.55, g * 0.95, g * 0.9); ctx.stroke();   // les épaules
          ctx.beginPath(); ctx.moveTo(-g * 0.75, g * 0.9); ctx.lineTo(g * 0.75, g * 0.9); ctx.lineTo(g * 0.55, g * 0.2); ctx.lineTo(-g * 0.55, g * 0.2); ctx.closePath(); ctx.stroke();   // le portable
          ctx.restore(); }
      if (entres && !DIX.vu && entres >= 10 && window.Dex && Dex.vu) { DIX.vu = true; Dex.vu('dix-en-un'); }
      if (c > 7.9) { const u = sm((c - 7.9) / 0.5), nx = Math.max(1, entres), pop = c > GH.ent ? 1 + 0.18 * Math.max(0, 1 - ((c - GH.ent) % GH.pe) / GH.pe) * (entres < 10 ? 1 : 0) : 1;
        eclat(coeur[0], coeur[1], G.s * 0.35, (c - 7.9) / 0.7, 12, 0.2); if (entres) mot('×' + nx, pied[0] + G.s * 0.55, coeur[1] - G.s * 0.2, Math.max(22, G.s * 0.26) * (0.1 + 0.9 * u + 0.15 * Math.sin(Math.PI * u)) * pop, 0.95); }
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
        const lv = id === cible ? lev : id === TH.id ? TH.e * c01(a - 1) : 0, zl = lv * 1.1;
        const Q = [[x - W0 / 2, y - H0 / 2], [x + W0 / 2, y - H0 / 2], [x + W0 / 2, y + H0 / 2], [x - W0 / 2, y + H0 / 2]].map(([u, v]) => p3(u, v, zl, lac, tan, k));
        const z = (Q[0][2] + Q[2][2]) / 2, m = [(Q[0][0] + Q[2][0]) / 2, (Q[0][1] + Q[2][1]) / 2];
        if (m[0] < G.gauche - 80 || m[0] > G.droite + 80 || m[1] < -80 || m[1] > G.bas + 60) continue;
        const Qb = [[x - W0 / 2, y - H0 / 2], [x + W0 / 2, y - H0 / 2], [x + W0 / 2, y + H0 / 2], [x - W0 / 2, y + H0 / 2]].map(([u, v]) => p3(u, v, zl - 0.09, lac, tan, k));
        L.push({ x, y, Q, Qb, z: z + lv * 9, id, lv, pop: c01((cr - d) / 0.8), B: lv > 0.01 ? [[x - W0 / 2, y - H0 / 2], [x + W0 / 2, y - H0 / 2], [x + W0 / 2, y + H0 / 2], [x - W0 / 2, y + H0 / 2]].map(([u, v]) => p3(u, v, 0, lac, tan, k)) : null });
      }
      L.sort((a, b) => a.z - b.z);
      // (vague 82, l'audit : « les terminaux ») : on choisit le sien. Le terminal sous la souris se soulève vers nous comme celui du moment :
      // son agent sort la tête et tape, sa tâche s'écrit en toutes lettres ; la souris s'en va, il se repose dans le mur
      TMX.t = now;   // (vague 96 : l'écran entier se découpe en volets, voir tmux())
      { const Sp = sourisIci(), dtT = Math.min(0.2, Math.max(0, now - (TH.t || now))); TH.t = now; let sous = null;
        if (Sp) for (let j = L.length - 1; j >= 0; j--) { const q = L[j], Q = q.lv > 0.01 && q.B ? q.B : q.Q; let np = 0, nn = 0; for (let m = 0; m < 4; m++) { const A = Q[m], B = Q[(m + 1) % 4], cr2 = (B[0] - A[0]) * (Sp.y - A[1]) - (B[1] - A[1]) * (Sp.x - A[0]); if (cr2 > 0) np++; else nn++; } if (np === 4 || nn === 4) { sous = q.id; break; } }
        if (sous !== null && sous !== cible && (TH.id === sous || TH.e < 0.05)) { TH.id = sous; TH.e = Math.min(1, TH.e + dtT / 0.35); } else { TH.e = Math.max(0, TH.e - dtT / 0.3); if (TH.e === 0) TH.id = null; } }
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
      // (vague 106 de l'audit, « les terminaux » vers 9,9) : rien n'est jamais simple. Toutes les 7 s, un terminal du mur passe au rouge (un test
      // qui casse : « ✗ 1 test échoue ») ; l'agent de la fenêtre voisine le voit, saute d'un terminal à l'autre en arc, tape à sa place, le rouge
      // vire au vert, il coche, et rentre chez lui d'un bond. Les agents s'entraident, sans qu'on ait à s'en mêler
      if (a > 2.5 && !reduitMvt()) { const Tc = 7, Dh = 4.2, nc = Math.floor((a - 2.5) / Tc), u = Math.min(1, ((a - 2.5) % Tc) / Dh), parId = new Map(L.map(q => [q.id, q]));
        if (ROUGE.nc !== nc) { ROUGE.nc = nc; ROUGE.id = null; const cand = L.filter(q => q.pop >= 1 && q.lv < 0.01 && ((q.id % COL) + COL) % COL > 0 && ((q.id % COL) + COL) % COL < COL - 1 && parId.has(q.id - 1) && parId.get(q.id - 1).pop >= 1 && q.Q[0][1] < G.bas - 40 && p3(q.x - W0 / 2, q.y - H0 / 2 - Dh * 0.32, 0, lac, tan, k)[1] > G.haut + 10).sort((A, B) => B.Q[0][1] - A.Q[0][1]).slice(0, 4);   // (parmi les plus bas : il reste à l'écran toute l'histoire)
          if (cand.length) { const f = cand[Math.floor(bruit(nc * 3.7 + 1) * cand.length)]; ROUGE.id = f.id; ROUGE.v = f.id - 1; } }
        const F = ROUGE.id != null && parId.get(ROUGE.id), V = F && parId.get(ROUGE.v);
        if (F && V && F.lv < 0.01 && V.lv < 0.01) { const at = (Q, u, v) => [lerp(lerp(Q[0][0], Q[1][0], u), lerp(Q[3][0], Q[2][0], u), v), lerp(lerp(Q[0][1], Q[1][1], u), lerp(Q[3][1], Q[2][1], u), v)];
          const lw = Math.hypot(F.Q[1][0] - F.Q[0][0], F.Q[1][1] - F.Q[0][1]), vert = sm(c01((u - 0.62) / 0.12)), rou = c01(u / 0.05) * (1 - vert) * (1 - sm(c01((u - 0.92) / 0.08)));
          // la vitre qui passe au rouge (elle palpite), puis au vert ; son message en toutes lettres
          const col = vert > 0 ? `rgba(143,224,160,${(vert * (1 - sm(c01((u - 0.9) / 0.1)))).toFixed(3)})` : `rgba(255,110,100,${(rou * (0.75 + 0.25 * Math.sin(now * 12))).toFixed(3)})`;
          ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = G.lw * 1.6; ctx.lineJoin = 'round'; ctx.beginPath(); F.Q.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke();
          const d0 = [F.Q[1][0] - F.Q[0][0], F.Q[1][1] - F.Q[0][1]], d1 = [F.Q[3][0] - F.Q[0][0], F.Q[3][1] - F.Q[0][1]], msg = vert > 0.5 ? (en() ? '✓ fixed, all green' : '✓ corrigé, tout est vert') : (en() ? '✗ 1 test failing' : '✗ 1 test échoue');
          const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, sous = q => bd && q[1] > bd.y - 14 && q[1] < bd.y + bd.h + 14 && q[0] > bd.x - 20 && q[0] < bd.x + bd.w + 20;   // (jamais de texte sur les sous-titres)
          if ((rou > 0.2 || vert > 0.2) && !sous(at(F.Q, 0.3, 0.8))) { ctx.save(); ctx.transform(d0[0] / 100, d0[1] / 100, d1[0] / 62, d1[1] / 62, F.Q[0][0], F.Q[0][1]); ctx.font = '700 7px ui-monospace,Menlo,Consolas,monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            ctx.lineWidth = 3; ctx.strokeStyle = NUIT; ctx.strokeText(msg, 8, 50); ctx.fillStyle = vert > 0.5 ? '#8fe0a0' : '#ff8a7e'; ctx.fillText(msg, 8, 50); ctx.restore(); }
          if (vert > 0.3) coche(...at(F.Q, 0.86, 0.72), 9, (vert - 0.3) / 0.4, 0.9);
          // l'agent voisin : il saute, tape chez l'autre, rentre (un arc au-dessus des deux vitres)
          const A = at(V.Q, 0.84, 0.6), B = at(F.Q, 0.2, 0.62), r = lw * 0.1, arc = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t) - Math.sin(Math.PI * t) * lw * 0.55];
          let pos = null, tape = false; if (u < 0.18) pos = null; else if (u < 0.3) pos = arc(A, B, sm((u - 0.18) / 0.12)); else if (u < 0.78) { pos = B; tape = true; } else if (u < 0.9) pos = arc(B, A, sm((u - 0.78) / 0.12));
          if (u > 0.12 && u < 0.18) { const p = at(V.Q, 0.84, 0.2); mot('!', p[0], p[1] - r, Math.max(12, r * 1.4), 1); }
          if (pos) { chabot(pos[0], pos[1], r, { now, ph: V.id, casque: false, lac: u < 0.78 ? 0.4 : -0.4, travaille: tape, a: 1, bras: tape ? [0.3 + Math.sin(now * 16) * 0.5, 0.3 - Math.sin(now * 16) * 0.5] : [1.2, 1.2] });
            if (tape && u > 0.34 && u < 0.6 && !sous(at(F.Q, 0.5, 0.35))) { const p = at(F.Q, 0.5, 0.35); mot(en() ? '› on it' : '› je m\u2019en occupe', p[0], p[1], Math.max(10, lw * 0.07), 0.9); } }
          if (u > 0.62 && u < 0.7) eclat(...at(F.Q, 0.86, 0.72), lw * 0.12, (u - 0.62) / 0.08, 8, nc); } }
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
      // (vague 81, l'audit : « agents et sous-agents ») : on entre dans l'arbre. La souris sur le ciel : la branche la plus proche pousse jusqu'à
      // elle, un sous-agent de plus s'y accroche (« vous »), pendu au pointeur ; les fiches de tâche descendent jusqu'à lui, les pastilles cochées remontent
      { const Sp = sourisIci(), bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, dtA = Math.min(0.2, Math.max(0, now - (AGV.t || now))); AGV.t = now;
        const ok = Sp && a > 2.3 && Sp.y > G.haut && !(bd && Sp.y > bd.y - 30); AGV.e = c01(AGV.e + (ok ? dtA / 0.6 : -dtA / 0.3));
        if (AGV.e > 0 && (Sp || AGV.p)) { if (Sp && ok) AGV.p = [Sp.x, Sp.y]; const P = AGV.p; let A = null, bd2 = 1e9;
          N.forEach(q => { if (q.n !== 2 || nait(q) < 1) return; const d = Math.hypot(pos[q.i][0] - P[0], pos[q.i][1] - P[1]); if (d < bd2) { bd2 = d; A = pos[q.i]; } });
          if (A) { const e = sm(AGV.e), E = [lerp(A[0], P[0], e), lerp(A[1], P[1], e)], r = Math.max(14, k * 0.075) * e;
            ctx.save(); ctx.setLineDash([G.lw * 4, G.lw * 3]); trait([A, E], false, 1.1, 1); ctx.restore();
            if (r > 3) { chabot(E[0], E[1] + r * 1.9, r, { now, ph: 77, vise: false, casque: true, lac: Math.sin(now * 0.9) * 0.5, bras: [1.45 + Math.sin(now * 6) * 0.1, 1.45 - Math.sin(now * 6) * 0.1], travaille: c > 1.3 && c < 2.9 });
              if (e > 0.9) { const px = Math.max(11, k * 0.045); ctx.font = `600 ${px}px "Space Grotesk",system-ui,sans-serif`; const t = en() ? 'you' : 'vous', w = ctx.measureText(t).width + px, lx = E[0] + r * 1.5, ly = E[1] + r * 1.2;
                ctx.globalAlpha = 1; ctx.fillStyle = PAP; ctx.strokeStyle = ENC; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.rect(lx, ly, w, px * 1.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = ENC; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, lx + w / 2, ly + px * 0.78); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
              if (c >= 0 && e > 0.95) { const d = c01((c - 1.35) / 0.5), u = c01((c - 2.75) / 0.5), sz = k * 0.03;
                if (d > 0 && d < 1) { const x = lerp(A[0], E[0], d), y = lerp(A[1], E[1], d) + sz; cerne(() => { ctx.beginPath(); ctx.rect(x - sz, y - sz * 0.7, sz * 2, sz * 1.4); }, 0.5, 1); }
                if (u > 0 && u < 1) { const x = lerp(E[0], A[0], u), y = lerp(E[1], A[1], u); cerne(() => { ctx.beginPath(); ctx.arc(x, y, sz * 0.9, 0, TAU); }, 0.6, 1); coche(x, y, sz * 0.5, 1, 0.5); brille(x, y, 2.2, 0.6, true, now, 77); } } } } } }
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
      // (vague 106 de l'audit, « agents et sous-agents » vers 9,9) : le travail livré. Tout est coché : une onde de lumière redescend du sommet
      // par chaque branche jusqu'au dernier sous-agent, puis l'agent principal plie la PR en avion de papier et la lance : elle fait
      // une boucle au-dessus du lustre et quitte l'écran par la gauche, un fil de tirets derrière elle (jamais vers la planète ni les sous-titres)
      if (c > 4.1 && c < 5.2 && !reduitMvt()) { const w = (c - 4.1) / 1.1 * 3.4;
        N.forEach(q => { if (q.p < 0 || nait(q) < 1) return; const t = c01(w - (q.n - 1)); if (t <= 0 || t >= 1) return; const A = pos[q.p], B = pos[q.i], x = lerp(A[0], B[0], t), y = lerp(A[1], B[1], t), al = prof(B[2]);
          trait([[lerp(A[0], B[0], Math.max(0, t - 0.35)), lerp(A[1], B[1], Math.max(0, t - 0.35))], [x, y]], false, 1.5, al); brille(x, y, 2.6 * (B[3] || 1), al, true, now, q.i); }); }
      if (c > 4.5 && c < 6 && !reduitMvt()) { const u = (c - 4.5) / 1.5, [x0, y0] = pos[0], xe = G.gauche - 80, ye = y0 + k * 0.1, R = k * 0.3;
        // (la trajectoire : un départ vers la droite, une boucle, puis la sortie vers la gauche)
        const at = t => { const lo = sm(c01(t / 0.55)) * TAU, g = 1 - c01((t - 0.45) / 0.3), bx = lerp(x0, xe, sm(c01((t - 0.35) / 0.65))), by = lerp(y0, ye, sm(c01((t - 0.35) / 0.65))); return [bx - Math.sin(lo) * R * g, by + (1 - Math.cos(lo)) * R * 0.5 * g]; };   // (la boucle descend, à gauche du sommet, sous la barre)
        ctx.save(); ctx.setLineDash([G.lw * 3, G.lw * 4]); const Tr = []; for (let j = 0; j <= 18; j++) Tr.push(at(Math.max(0, u - 0.3 + j / 18 * 0.3))); trait(Tr, false, 0.9, 0.75); ctx.restore();
        const p = at(u), q = at(Math.min(1, u + 0.02)), ang = Math.atan2(q[1] - p[1], q[0] - p[0]), sz = Math.max(18, k * 0.1);
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang); const fl = Math.sin(now * 9) * 0.15;
        cerne(() => { ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.8, -sz * (0.55 + fl)); ctx.lineTo(-sz * 0.45, 0); ctx.closePath(); }, 0.7, 1);
        cerne(() => { ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.8, sz * 0.45); ctx.lineTo(-sz * 0.45, 0); ctx.closePath(); }, 0.7, 1);
        ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.4; ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.45, 0); ctx.stroke(); ctx.restore();
        { const px = Math.max(11, sz * 0.8) * (1 - sm(c01((u - 0.2) / 0.15))); if (px > 2) mot('PR', p[0], p[1] - sz * 1.3, px, 1); } }   // (l'étiquette rapetisse, pas de fondu)
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
      // (vague 86, l'audit : « skills ») : on s'installe un skill. La souris qui tient un module une seconde l'arrache à son orbite : il vole jusqu'au
      // pointeur et s'y branche (une cartouche de papier, son nom, son câble), le suit partout sur l'écran, puis se débranche et rentre en orbite
      { const dtS = Math.min(0.2, Math.max(0, now - (INST.t || now))); INST.t = now; const m = ctx.getTransform(), dp = dpDe(ctx.canvas);
        const h = it.reduce((b, q) => q.hv > (b ? b.hv : 0.85) ? q : b, null); if (h && !INST.q) { INST.h = INST.hi === h.i ? INST.h + dtS : 0; INST.hi = h.i; } else if (!h) INST.h = 0; INST.mp = it.map(q => [(m.a * q.p[0] + m.c * q.p[1] + m.e) / dp, (m.b * q.p[0] + m.d * q.p[1] + m.f) / dp, q.p[2]]);
        if (INST.h > 1 && !INST.q && now - INST.fin > 2) { INST.q = { l: h.l, kind: h.kind, t0: now, x: (m.a * h.p[0] + m.c * h.p[1] + m.e) / dp, y: (m.b * h.p[0] + m.d * h.p[1] + m.f) / dp }; INST.h = 0; }
        if (INST.q) { const q = it.find(z => z.kind === INST.q.kind && z.l === INST.q.l); if (q) { INST.q.ox = (m.a * q.p[0] + m.c * q.p[1] + m.e) / dp; INST.q.oy = (m.b * q.p[0] + m.d * q.p[1] + m.f) / dp; } INST.vu = now; } }
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
      // (vague 106 de l'audit, « skills » vers 9,9) : chaque outil branché rend les autres plus forts. Au moment où un module s'arrime, une décharge
      // part de la station et court, en éclair, jusqu'à chacun des autres modules, qui s'allument à son arrivée
      if (flash > 0.02 && !reduitMvt()) { const v = 1 - flash, H = [C[0], C[1] - rb * 1.1];
        it.forEach(q => { if (q.eb > 0.05) return; const d = Math.hypot(q.p[0] - H[0], q.p[1] - H[1]) || 1, nx = -(q.p[1] - H[1]) / d, ny = (q.p[0] - H[0]) / d, t = c01(v * 1.4), P2 = [H];
          for (let j = 1; j <= 7; j++) { const f = j / 8 * t, g = (j % 2 ? 1 : -1) * k * 0.035 * Math.sin(j * 7.3 + q.i + Math.floor(now * 24)); P2.push([lerp(H[0], q.p[0], f) + nx * g, lerp(H[1], q.p[1], f) + ny * g]); }
          P2.push([lerp(H[0], q.p[0], t), lerp(H[1], q.p[1], t)]);
          ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(160,210,255,0.35)'; ctx.lineWidth = G.lw * 3; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); P2.forEach((p, j) => j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
          ctx.strokeStyle = 'rgb(235,245,255)'; ctx.lineWidth = G.lw * 0.9; ctx.stroke(); brille(P2[P2.length - 1][0], P2[P2.length - 1][1], 3, 1, true, now, q.i);
          if (t >= 1) eclat(q.p[0], q.p[1], k * 0.09 * q.p[3], c01((v * 1.4 - 1) / 0.4), 8, q.i); });
        }
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
const PHOTO = { vu: false };
S.bench = (() => {
  const NOMS = ['A', 'B', 'C', 'D', 'E'];
  return {
    cles: () => [[-1.2, -0.3], [1.2, -0.3], [-1, 0.6], [1, 0.6]],
    dessin(a, now) {
      const T0b = go => Math.PI / 2 + go * TAU * 1.5;
      // (vague 42, l'audit : « la course », finition) : le bord avant de la piste ne descend jamais sur les sous-titres ; sinon, tout rapetisse
      // (vague 140, l'audit : « la course », immersion) : la caméra suit la course comme une retransmission : pendant la course, elle pivote
      // pour garder la tête de course face à nous, plonge un peu plus bas sur la piste et s'approche ; à l'arrivée, elle revient sur le podium
      const cS = a % 7.5, goS = c01((cS - 1.1) / 3.4), suivi = sm(c01((cS - 0.9) / 0.6)) * (1 - sm(c01((cS - 4.6) / 0.9)));
      let [k, lx] = large(1.5, 2.1), oyb = -0.14; k *= 1 + 0.07 * suivi; const lac0 = 0.3 + Math.sin(a * 0.15) * 0.15 + suivi * (G.s > 300 ? 0.28 : 0.42) * Math.sin(goS * Math.PI * 3), tan0 = (G.droite < 600 ? -0.78 : -0.46) + 0.09 * suivi; let V = cam(lac0, tan0, k, 0, oyb);
      for (let pas = 0; pas < 2; pas++) { const Rx0 = Math.min(1.55, lx * 0.82), bords = [0, 0.8, 1.6, 2.4].map(t => V(Math.cos(Math.PI / 2 + t * 0.5) * Rx0 * 1.2, 0, Math.sin(Math.PI / 2 + t * 0.5) * 0.62 * 1.2)[1]).concat([0, 0.8, 1.6].map(t => V(Math.cos(Math.PI / 2 - t * 0.5) * Rx0 * 1.2, 0, Math.sin(Math.PI / 2 - t * 0.5) * 0.62 * 1.2)[1])),
          f = Math.max(...bords) + k * 0.03, lim = (G.caps || G.bas) - 4, c0 = V(0, 0, 0)[1];
        if (f <= lim) break;
        if (!pas) { oyb -= Math.min(f - lim, k * 0.22) / G.s; V = cam(lac0, tan0, k, 0, oyb); }   // d'abord, on remonte un peu (les tribunes ont de la place en haut)
        else if (f > c0) { k *= Math.max(0.6, (lim - c0) / (f - c0)); V = cam(lac0, tan0, k, 0, oyb); } }   // puis, s'il le faut, on rapetisse
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
          if (p[1] - r * 3 < G.haut) continue; { const pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat; if (pc && Math.hypot(p[0] - pc.x, p[1] - r * 1.75 - pc.y) < pc.r * 1.25 + r) continue; } const d = Math.abs(Math.atan2(Math.sin(t - tete), Math.cos(t - tete))), ola = go0 > 0 && go0 < 1 ? Math.exp(-((d * 2.2) ** 2)) : c > 4.6 ? 0.5 + 0.5 * Math.sin(now * 6 + j) : 0;
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
        if (roule) for (let j = 1; j <= 7; j++) { const q = piste(t - j * 0.06, i); brille(q[0], q[1] - r * 0.4, (1.6 + (7 - j) * 0.25) * (1 - j / 9), al, false, now, i * 9 + j); }
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
      // (vague 87) : le pari. La souris qui s'attarde 0,8 s sur une fusée, avant ou au début de la course, parie sur elle (voir pari())
      { const Sm = souris(), dt = Math.min(0.2, Math.max(0, now - (PARI.T || now))); PARI.T = now; PARI.vu = now; { const m = ctx.getTransform(), dq = dpDe(ctx.canvas); PARI.mp = cour.map(q => [(m.a * q.p[0] + m.c * q.p[1] + m.e) / dq, (m.b * q.p[0] + m.d * q.p[1] + m.f) / dq, q.i]); PARI.g = g; }
        if (PARI.n !== n && PARI.res === null && go <= 0) PARI.i = -1;
        let b = null, bd = k * 0.3; if (Sm && !fin && go < 0.7 && window.Chats.K.Wd.t - Sm.moved < 3) cour.forEach(q => { const d = Math.hypot(q.p[0] - Sm.x, q.p[1] - Sm.y); if (d < bd) { bd = d; b = q; } });
        PARI.h = b && b.i === PARI.hi ? PARI.h + dt : 0; PARI.hi = b ? b.i : -1;
        if (b && PARI.h > 0.8 && PARI.n !== n && !reduitMvt()) { const m = ctx.getTransform(), dq = dpDe(ctx.canvas); PARI.i = b.i; PARI.n = n; PARI.t = now; PARI.res = null; PARI.P = []; PARI.M = [];
          PARI.x = (m.a * b.p[0] + m.c * b.p[1] + m.e) / dq; PARI.y = (m.b * b.p[0] + m.d * b.p[1] + m.f) / dq; }
        if (PARI.i >= 0 && PARI.n === n) { const ord = cour.slice().sort((p, q) => q.d - p.d || rang.indexOf(p.i) - rang.indexOf(q.i)); PARI.rg = go > 0 ? ord.findIndex(q => q.i === PARI.i) + 1 : 0;
          if (fin && PARI.res === null) { PARI.res = PARI.i === g; pariResout(now); } } }
      // 3, 2, 1, go
      if (c < 1.35) { const w = c < 0.3 ? '3' : c < 0.6 ? '2' : c < 0.9 ? '1' : 'go !', u = c < 0.9 ? (c % 0.3) / 0.3 : (c - 0.9) / 0.45, C = V(0, -0.45, 0); mot(w, C[0], C[1], Math.max(24, k * 0.26) * (1.3 - u * 0.3) * (c < 0.9 ? 1 : 1 - sm((u - 0.55) / 0.45) * 0.95), 1); }
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
      // (vague 122, l'audit : « la course ») : on ne déclare pas un gagnant à l'œil. À l'arrivée, un éclair au trait sur la ligne (la photo est prise),
      // et la bande du photo-finish descend du haut du ciel : les cinq fusées sur une règle graduée en centièmes, chacune à son écart (« +0,12 s »),
      // la ligne d'arrivée en pointillé ; elle reste le temps de lire, puis remonte d'où elle vient (jamais de fondu)
      if (c > 4.45 && c < 7.3) { const ph = V(0, 0, 0), arr = piste(T0, 2), e0 = c01((c - 4.45) / 0.35), en0 = en();
        if (e0 < 1) { style(0.8, 1); for (let j = 0; j < 10; j++) { const an = j / 10 * TAU, r0 = k * 0.05 + e0 * k * 0.18, r1 = r0 + k * 0.08 * (1 - e0); ctx.beginPath(); ctx.moveTo(arr[0] + Math.cos(an) * r0, arr[1] + Math.sin(an) * r0 * 0.7); ctx.lineTo(arr[0] + Math.cos(an) * r1, arr[1] + Math.sin(an) * r1 * 0.7); ctx.stroke(); } void ph; }
        large0 = G.droite - G.gauche > 700, W0 = large0 ? Math.min(430, (G.droite - G.gauche) * 0.34) : Math.min((G.droite - G.gauche) * 0.8, k * 1.5, 520), H0 = Math.min(160, Math.max(128, k * 0.62)), bdS = Math.min(90, (G.droite + 16) * 0.1) + 6, x0 = Math.max(bdS, large0 ? G.gauche + 4 : Math.max(G.gauche + 2, G.cx - W0 * 0.56)),   // (vague 161 : hors de la bande où la scène s'estompe sur les côtés, sinon le papier y devenait gris)
            // (au bureau : sur le côté, le podium reste visible)
          vin = sm((c - 4.6) / 0.4), vout = sm((c - 6.8) / 0.45), y0 = G.haut + 6 - (1 - vin) * (H0 + 40) - vout * (H0 + 40);
        if (vin > 0 && vout < 1) { sousLaBarre();   // (vague 161) elle sort de sous la barre du haut et y rentre, comme d'une fente : jamais par-dessus
          const fs = Math.max(10, Math.min(15, k * 0.06)), gauche = x0 + fs * 0.8, droite = x0 + W0 - fs * 0.8, ligne = droite - fs * 1.6;
          const ecart = NOMS.map((_, i) => (Math.max(...v) / v[i] - 1) * 3.4), emax = Math.max(0.3, ...ecart), px = (ligne - gauche - fs * 6) / emax;
          cerne(() => { ctx.beginPath(); ctx.rect(x0, y0, W0, H0); }, 0.8, 1);
          // les perforations du film, en haut et en bas
          ctx.fillStyle = ENC; ctx.globalAlpha = 1; for (let xx = x0 + 8; xx < x0 + W0 - 8; xx += 12) { ctx.fillRect(xx, y0 + 3, 5, 3); ctx.fillRect(xx, y0 + H0 - 6, 5, 3); }
          ctx.font = `700 ${fs * 0.8}px ui-monospace,Menlo,Consolas,monospace`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
          ctx.fillText((en0 ? 'PHOTO FINISH · RUN ' : 'PHOTO-FINISH · ESSAI ') + (n + 1), gauche, y0 + fs * 1.15);
          // la règle : un trait tous les centièmes… de dixième en dixième, l'étiquette
          const yb = y0 + H0 - fs * 1.1; ctx.strokeStyle = ENC; ctx.lineWidth = 1;
          for (let t = 0; t * px <= ligne - gauche + 0.5; t += 0.05) { const xx = ligne - t * px, gr = Math.abs(t * 10 - Math.round(t * 10)) < 1e-6; ctx.beginPath(); ctx.moveTo(xx, yb); ctx.lineTo(xx, yb - (gr ? fs * 0.55 : fs * 0.28)); ctx.stroke(); }
          ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(ligne, y0 + fs * 1.9); ctx.lineTo(ligne, yb); ctx.stroke(); ctx.setLineDash([]);
          // les fusées, l'une sous l'autre, chacune à son écart ; le gagnant sur la ligne, coché
          const lh = (yb - y0 - fs * 2.3) / 5;
          rang.forEach((i, j) => { const yy = y0 + fs * 2.1 + lh * (j + 0.5), xx = ligne - ecart[i] * px * c01((c - 4.75 - j * 0.12) / 0.3) - (1 - c01((c - 4.75 - j * 0.12) / 0.3)) * 0, r = Math.min(lh * 0.42, fs * 0.9);
            ctx.save(); ctx.translate(xx - r * 0.7, yy); cerne(() => { ctx.beginPath(); ctx.moveTo(-r * 1.2, -r * 0.35); ctx.lineTo(r * 0.7, -r * 0.35); ctx.quadraticCurveTo(r * 1.4, 0, r * 0.7, r * 0.35); ctx.lineTo(-r * 1.2, r * 0.35); ctx.closePath(); }, 0.45, 1); ctx.restore();
            ctx.fillStyle = ENC; ctx.globalAlpha = 1; ctx.font = `700 ${Math.max(7, r * 0.55)}px "Space Grotesk",sans-serif`; ctx.textAlign = 'center'; ctx.fillText(NOMS[i], xx - r * 0.95, yy + 0.5);
            ctx.font = `600 ${fs * 0.72}px ui-monospace,Menlo,Consolas,monospace`; ctx.textAlign = 'left';
            const lab = j === 0 ? (en0 ? 'winner' : 'gagnant') : '+' + (en0 ? ecart[i].toFixed(2) : ecart[i].toFixed(2).replace('.', ',')) + ' s';
            ctx.textAlign = 'right'; ctx.fillText(lab, xx - r * 2.1, yy + 0.5);
            if (j === 0) coche(ligne + fs * 0.9, yy, fs * 0.45, (c - 5.0) / 0.3, 1); });
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          if (vin >= 1 && !PHOTO.vu && window.Dex && Dex.vu) { PHOTO.vu = true; Dex.vu('photo-finish'); } ctx.restore(); } }
    }
  };
})();

// une flotte d'agents sur un même produit : un chantier en 3D. L'essaim tourne autour de l'immeuble (MARKO) et l'élève étage après étage ;
// une grue grimpe avec lui ; les fenêtres s'allument ; au dernier étage, le drapeau, et un feu d'artifice
const PATROUILLE = { vu: false };
S.flotte = (() => {
  const E = Array.from({ length: 30 }, (_, i) => ({ r: 0.55 + bruit(i) * 0.9, v: (0.45 + bruit(i * 3) * 0.7) * (i % 3 ? 1 : -1), ph: bruit(i * 7) * TAU, h: -0.8 + bruit(i * 5) * 1.55, i }));
  const NE = 11, EH = 0.088, B0 = 0.84, LW = 0.22;
  const QU = Array.from({ length: 26 }, (_, i) => { const t = i * 2.39996 + 0.3, r = 1.0 + bruit(i * 4.1) * 1.25; return { x: Math.cos(t) * r, z: Math.sin(t) * r, w: 0.06 + bruit(i * 2.3) * 0.07, h: 0.14 + bruit(i * 6.7) * 0.42, v: 0.6 + bruit(i * 1.3) * 0.8, i }; });
  function quartier(V, k, a, now, c, Cy) {
    const hx = ((G.droite - G.gauche) / 2 * 0.97) / (k * 0.8 * 2.25), Vx = (x, y, z) => { const p = V(x, y, z); p[0] = G.cx + (p[0] - G.cx) * hx; return p; };
    sousLaBarre(); ctx.beginPath(); ctx.rect(-1e4, G.haut - 4, 2e4, (G.caps || G.bas) - G.haut + 4); ctx.clip();
    const tas = 1 - sm((c - Cy + 0.6) / 0.6);
    QU.map(q => ({ q, z: Vx(q.x, B0, q.z)[2] })).sort((A, B) => A.z - B.z).forEach(({ q }) => {
      // (vague 162) quand la caméra fait tourner le quartier, un immeuble qui arrive au bord du ciel (sur les sous-titres, ou dans la bande où la
      // scène s'estompe sur les côtés) rentre dans le sol en rapetissant, au lieu d'être tranché net ou de virer au gris
      const p0 = Vx(q.x, B0, q.z), bdQ = Math.min(90, (G.droite + 16) * 0.1), sf = c01(((G.caps || G.bas) - 8 - p0[1]) / Math.max(20, k * 0.12)) * c01((p0[0] - bdQ) / 50) * c01((G.droite + 16 - bdQ - p0[0]) / 50), w = q.w * (0.3 + 0.7 * sf);
      const mont = sm((c - 0.3 - bruit(q.i * 9.1) * 3) / (4 / q.v)) * tas, hh = q.h * mont * sf; if (hh < 0.01) { if (sf > 0.2) rond(p0[0], p0[1], 1.2, 0.4, 0.5, true); return; }
      const F = bloc(Vx, q.x - w, q.x + w, B0, B0 - hh, q.z - w, q.z + w, prof(Vx(q.x, B0, q.z)[2], 0.9), 0.6);
      // les fenêtres, par étages
      const et = Math.floor(hh / 0.05); for (let j = 0; j < et; j++) { const p = Vx(q.x, B0 - 0.035 - j * 0.05, q.z + w); if (bruit(q.i * 13 + j + Math.floor(now * 0.6 + q.i)) > 0.55) { ctx.globalAlpha = 1; ctx.fillStyle = '#ffe9a8'; ctx.fillRect(p[0] - 1.5, p[1] - 2, 3, 4); } }
      // le chantier en cours : un chat-robot sur le toit, qui pose ; fini : une petite coche
      const T = Vx(q.x, B0 - hh, q.z); if (mont < 0.98) { const r = Math.max(4, k * 0.03 * T[3]); chabot(T[0], T[1] - r * 1.2, r, { now, ph: q.i, a: 0.9, lac: 0.4, casque: false, travaille: true }); }
      else coche(T[0], T[1] - 7, Math.max(4, k * 0.025), 1, 0.9);
    });
    ctx.restore();
  }
  return {
    cles: () => [[-0.24, 0.86], [0.24, 0.86], [-0.24, -0.5], [0.24, -0.5]],
    dessin(a, now) {
      // (vague 141, l'audit : « la flotte », immersion) : la caméra est sur une grue, elle aussi : à chaque étage posé, elle monte d'un cran et
      // regarde un peu plus d'en haut ; la tour livrée, elle plane au-dessus du toit ; au chantier suivant, elle redescend avec le tas qui s'effondre
      const CyA = NE * 0.55 + 4.5, cA = a % CyA, tasA = 1 - sm((cA - CyA + 0.6) / 0.6), mo = sm(c01(cA / (NE * 0.55 + 0.4))) * tasA;
      let [k, lx] = large(1.3, 1.9), oyF = (G.sw < 500 ? -0.55 : -0.42) + 0.06 * mo, V = cam(0.5 + a * 0.12, -0.3 - 0.2 * mo, k * (0.8 + 0.04 * mo), 0, oyF);
      // (vague 162, l'audit : « la flotte ») : la tour entière tient entre la barre et les sous-titres (sa base était tranchée net au bureau) :
      // si elle dépasse, la grue recule (tout rapetisse) puis se recale
      for (let pas = 0; pas < 2; pas++) { const lim = (G.caps || G.bas) - 8, hautT = G.haut + 30, bas0 = Math.max(...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z]) => V(x * LW * 1.15, B0, z * LW * 1.15)[1])), som = V(0, B0 - NE * EH - 0.42, 0)[1];
        if (bas0 <= lim && som >= hautT) break;
        if (bas0 - som > lim - hautT) k *= Math.max(0.6, (lim - hautT) / (bas0 - som));
        else oyF -= (bas0 > lim ? bas0 - lim : som - hautT) / G.s;
        V = cam(0.5 + a * 0.12, -0.3 - 0.2 * mo, k * (0.8 + 0.04 * mo), 0, oyF); }
      const Cy = CyA, c = cA;
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
      // (vague 123, l'audit : « la flotte ») : la tour livrée, la flotte fait sa patrouille. Les quatorze chats-robots quittent leur orbite, se mettent
      // en file et tracent à travers tout le ciel une immense coche, leur traînée derrière eux ; puis ils sortent par le haut de l'écran et la traînée
      // se rembobine depuis son début (jamais de fondu). Au cycle suivant, ils reviennent tourner autour du nouveau chantier
      let traineeP = null; const uP = c - NE * 0.55, sL = (uP - 0.4) / 2.0, Wc = G.droite - G.gauche, hC = (G.caps || G.bas) - G.haut, myC = G.haut + hC * 0.5;
      const PA = [[G.cx - Wc * 0.34, myC - hC * 0.02], [G.cx - Wc * 0.1, myC + hC * 0.26], [G.cx + Wc * 0.38, myC - hC * 0.34]];
      const LA = Math.hypot(PA[1][0] - PA[0][0], PA[1][1] - PA[0][1]), LB = Math.hypot(PA[2][0] - PA[1][0], PA[2][1] - PA[1][1]), cut = LA / (LA + LB);
      const chemin = s0 => { if (s0 <= cut) { const t = s0 / cut; return [lerp(PA[0][0], PA[1][0], t), lerp(PA[0][1], PA[1][1], t)]; } if (s0 <= 1) { const t = (s0 - cut) / (1 - cut); return [lerp(PA[1][0], PA[2][0], t), lerp(PA[1][1], PA[2][1], t)]; }
        const dx = PA[2][0] - PA[1][0], dy = PA[2][1] - PA[1][1], L = Math.hypot(dx, dy), e = (s0 - 1) * (LA + LB); return [PA[2][0] + dx / L * e, PA[2][1] + dy / L * e]; };
      if (n >= NE && tas > 0.5 && sL > -0.05 && !reduitMvt()) {
        Q.forEach(q => { if (q.i >= 14) return; const sq = sL - q.i * 0.045; if (sq <= 0) return; const e = c01(sq / 0.08), P1 = chemin(sq), P0 = chemin(Math.max(0, sq - 0.02));
          q.p = [lerp(q.p[0], P1[0], e), lerp(q.p[1], P1[1], e), 1, 1]; q.pp = [lerp(q.pp[0], P0[0], e), lerp(q.pp[1], P0[1], e), 1, 1]; q.porte = false; q.salue = false; });
        const s1 = Math.min(1, sL), s0 = c01((uP - 2.9) / 0.7); if (s1 > s0) { traineeP = []; for (let j = 0; j <= 40; j++) traineeP.push(chemin(lerp(s0, s1, j / 40))); }
        if (sL > 1 && !PATROUILLE.vu && window.Dex && Dex.vu) { PATROUILLE.vu = true; Dex.vu('patrouille'); } }
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
      if (traineeP) trait(traineeP, false, 2.4, 0.95);   // (la traînée de la patrouille, devant la tour)
      Q.filter(q => q.p[2] >= -0.2).forEach(agent);
      if (n >= NE && tas > 0.5) { const t = V(0, top, 0), m = [t[0], t[1] - k * 0.3]; trait([t, m], false, 1, 1); trait([m, [m[0] + k * 0.16, m[1] + k * (0.05 + Math.sin(now * 5) * 0.015)], [m[0], m[1] + k * 0.11]], true, 0.9, 1, true);
        mot('MARKO', t[0], t[1] - k * 0.38, Math.max(11, k * 0.08), 1);
        feuxDArtifice(now);
        for (let j = 0; j < 4; j++) { const u = ((c - NE * 0.55) * 0.9 + j / 4) % 1, px = t[0] + (bruit(j * 7 + Math.floor((c - NE * 0.55) * 0.9 + j / 4)) - 0.5) * k * 1.6, py = t[1] - k * (0.2 + 0.4 * bruit(j * 3 + 1)); eclat(px, py, k * 0.07, u, 9, j); } }
      ctx.restore();
    }
  };
})();

// la vitesse sans perdre le contrôle : un tapis en perspective ; chaque changement de code passe les portiques (tests, revue CI, scanners), chacun avec
// son faisceau ; ceux qui échouent sont éjectés (✗) ; les autres arrivent devant l'humain, qui hoche la tête et tamponne : ✓, sur la pile des fusionnés
const TURBO = { vu: false };
S.gardefous = (() => {
  const LAB = () => en() ? ['tests', 'CI review', 'scanners', 'human', 'merged'] : ['tests', 'revue CI', 'scanners', 'humain', 'fusionnés'];
  return {
    cles: () => [[-0.95, -0.2], [-0.35, -0.2], [0.25, -0.2], [1.2, -0.3]],
    dessin(a, now) {
      // (vague 124, l'audit : « la vitesse sans perdre le contrôle ») : la vitesse, pour de vrai. Toutes les 9 s, le tapis passe en turbo (jusqu'à ×3) :
      // un compteur de papier en haut du ciel, son aiguille qui grimpe dans la zone hachurée ; les feuilles filent, les portiques suivent,
      // les recalées sont toujours éjectées : rien ne passe sans contrôle. (aw : le temps du tapis, qui avance plus vite pendant le turbo)
      const CYT = 9, ut = a % CYT, bt = ut < 3 ? Math.sin(Math.PI * ut / 3) ** 2 : 0, It = u => u / 2 - 3 / (4 * Math.PI) * Math.sin(2 * Math.PI * u / 3), aw = a + 2 * (Math.floor(a / CYT) * 1.5 + It(Math.min(ut, 3))), vt = 1 + 2 * bt;
      // (vague 142, l'audit : « la vitesse », immersion) : en turbo, on y est. La caméra pivote le long du tapis, descend vers lui et s'approche,
      // comme un travelling embarqué ; elle vibre un peu avec la vitesse ; le turbo passé, elle reprend sa place
      const [k, lx0] = large(1.55, 2.1), lx = lx0 * (G.droite > 700 ? 0.88 : 1), V = cam(-0.3 + 0.2 * bt + Math.sin(now * 37) * 0.006 * bt, -0.42 + 0.08 * bt + Math.sin(now * 29) * 0.005 * bt, k * 1.02 * (1 + 0.05 * bt), -0.08 - 0.06 * bt, -0.14), yT = 0.3, x0 = -lx, xS = lx * 0.5, xs = [-lx * 0.62, -lx * 0.28, lx * 0.06], lab = LAB(), vit = 0.36, T = 1.0;
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
      for (let j = 0; j < 26; j++) { const x = x0 + ((j * 0.13 + aw * vit) % (xS + 0.1 - x0)); trait([V(x, yT, -0.2), V(x, yT, 0.2)], false, 0.35, 0.4); }
      const carte = (x, y, z, al, rt = 0) => { const R = (u, w) => [x + u * Math.cos(rt) - w * Math.sin(rt), z + u * Math.sin(rt) + w * Math.cos(rt)], Q = [[-0.09, -0.13], [0.09, -0.13], [0.09, 0.13], [-0.09, 0.13]].map(([u, w]) => { const [px, pz] = R(u, w); return V(px, y, pz); });
        cerne(() => { ctx.beginPath(); Q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }, 0.6, al); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; [[-0.06, 0.05], [0.02, 0.05]].forEach(([u1, u2], l) => { const [a1, b1] = R(-0.05, -0.06 + l * 0.08), [a2, b2] = R(u2 + 0.02, -0.06 + l * 0.08), A = V(a1, y, b1), B = V(a2, y, b2); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }); return Q; };
      // la pile des fusionnés, derrière l'humain
      const xP = xS + 0.35, zP = -0.55, nb = Math.floor(aw / T) + 1; let pile = 0;
      for (let q = 0; q < nb; q++) { const t = aw - q * T, rate = bruit(q * 13.3) < 0.3 ? 1 + Math.floor(bruit(q * 5.1) * 3) : 0; if (!rate && t > (xS - 0.05 - x0) / vit + 1.4) pile++; }
      for (let j = 0; j < Math.min(14, pile); j++) carte(xP, yT - j * 0.03, zP, 0.9);
      // (vague 142, finition : le compteur des fusionnés passait derrière l'humain ; il est écrit après lui, par-dessus)
      const motPile = yh => { if (!pile) return; const q = V(xP, yT - Math.min(14, pile) * 0.03 - 0.16, zP), fs = Math.max(10, k * 0.065); mot(`✓ ${pile} ${lab[4]}`, q[0], Math.max(G.haut + fs, Math.min(q[1], yh)), fs, 0.85); };
      let tampon = 0;
      for (let q = Math.max(0, nb - 10); q < nb; q++) { const t = aw - q * T, x = x0 + t * vit, rate = bruit(q * 13.3) < 0.3 ? 1 + Math.floor(bruit(q * 5.1) * 3) : 0, g = rate ? xs[rate - 1] : 99;
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
          if (v < 0.4) mot(en() ? 'fixed!' : 'réparé !', rs[0], rs[1] - s0 * 3 - v * k * 0.1, Math.max(10, k * 0.055) * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, v * 6))) * (1 - sm((v - 0.2) / 0.2) * 0.9), 1); } }
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
      // le compteur (en haut à gauche du ciel) : un demi-cadran de papier, ses graduations ×1 ×2 ×3, la zone rapide hachurée, l'aiguille
      { const rg = Math.max(36, Math.min(60, k * 0.18)), gx = Math.max(G.gauche + rg * 1.25, Math.min(90, (G.droite + 16) * 0.1) + rg + 4),   // (vague 163 : hors de la bande estompée du bord, où le cadran virait au gris)
           gy = G.haut + rg * 1.35, A0 = Math.PI, A1 = TAU, an = A0 + (A1 - A0) * (vt - 1) / 2.2;
        cerne(() => { ctx.beginPath(); ctx.arc(gx, gy, rg, A0, A1); ctx.closePath(); }, 0.8, 1);
        ctx.save(); ctx.beginPath(); ctx.arc(gx, gy, rg * 0.92, A0 + (A1 - A0) * 0.62, A1); ctx.arc(gx, gy, rg * 0.66, A1, A0 + (A1 - A0) * 0.62, true); ctx.closePath(); ctx.clip();
        ctx.strokeStyle = ENC; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; for (let h = -rg * 2; h < rg * 2; h += 4) { ctx.beginPath(); ctx.moveTo(gx + h, gy); ctx.lineTo(gx + h + rg, gy - rg); ctx.stroke(); } ctx.restore();
        ctx.globalAlpha = 1; ctx.strokeStyle = ENC; ctx.fillStyle = ENC; ctx.lineWidth = G.lw * 0.45; ctx.font = `700 ${Math.max(8, rg * 0.24)}px "Space Grotesk",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let j = 0; j <= 11; j++) { const t = A0 + (A1 - A0) * j / 11, gr = j % 5 === 0; ctx.beginPath(); ctx.moveTo(gx + Math.cos(t) * rg * (gr ? 0.7 : 0.8), gy + Math.sin(t) * rg * (gr ? 0.7 : 0.8)); ctx.lineTo(gx + Math.cos(t) * rg * 0.9, gy + Math.sin(t) * rg * 0.9); ctx.stroke(); }
        [1, 2, 3].forEach(m => { const t = A0 + (A1 - A0) * (m - 1) / 2.2; ctx.fillText('×' + m, gx + Math.cos(t) * rg * 0.5, gy + Math.sin(t) * rg * 0.5); });
        const tr = Math.sin(now * 40) * 0.025 * bt; ctx.lineWidth = G.lw * 0.9; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(an + tr) * rg * 0.86, gy + Math.sin(an + tr) * rg * 0.86); ctx.stroke(); ctx.beginPath(); ctx.arc(gx, gy, rg * 0.08, 0, TAU); ctx.fill();
        ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        mot((en() ? 'speed ×' : 'vitesse ×') + vt.toFixed(1).replace('.', en() ? '.' : ','), gx, gy + Math.max(10, rg * 0.32), Math.max(10, rg * 0.26), 0.95);
        if (bt > 0.3) for (let j = 0; j < 3; j++) { const yy = G.haut + (G.caps - G.haut) * (0.45 + j * 0.08), xx = G.gauche + ((now * 900 * bt + j * 260) % ((G.droite - G.gauche) * 1.2)); trait([[xx, yy], [xx + k * 0.25 * bt, yy]], false, 0.5, 0.5); }
        if (vt > 2.9 && !TURBO.vu && window.Dex && Dex.vu) { TURBO.vu = true; Dex.vu('turbo'); } }
      GF.t = now;   // (vague 87 : les garde-fous du vrai site, voir gardeFou())
      // l'humain : il regarde, hoche la tête, tamponne
      const hp = V(xS + 0.34, yT, -0.28), rr = k * 0.15 * hp[3], hoche = Math.max(0, Math.sin(now * 2.2)) ** 6, ci = V(xS - 0.05, yT - 0.02, 0);
      lui(hp[0], hp[1] - rr * 2.5, rr, { now, hoche, tp: tampon, cible: ci, cote: -1 }); mot(lab[3], hp[0], hp[1] + k * 0.06, Math.max(10, k * 0.07), 0.85); motPile(hp[1] - rr * 4.4);
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
const PAQUET = { vu: false };
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
    const ok = z => z < 1.3, limB0 = (G.caps || G.bas) - 10;
    PISTES.forEach((R, i) => {
      const lv = R.L * pousse, pts = []; for (let k = 0; k < R.P.length; k++) { if (R.cum[k] > lv) { pts.push(au(R, lv)); break; } pts.push(R.P[k]); }
      // (vague 143, finition : la carte mère s'arrêtait sur une règle, coupée net au-dessus des sous-titres ; chaque piste s'arrête maintenant
      // d'elle-même avant la limite, sur une pastille, comme une vraie piste qui plonge dans la carte)
      const S0 = pts.filter(q => ok(q[1])).map(([x, z]) => V0(x, yP, z)), S = [], limB = limB0 - bruit(i * 9.7) * G.s * 0.22; let coupe = false;
      for (let q = 0; q < S0.length; q++) { const P = S0[q]; if (P[1] <= limB) { S.push(P); continue; } if (q) { const A = S0[q - 1], u = (limB - A[1]) / ((P[1] - A[1]) || 1); S.push([lerp(A[0], P[0], u), limB, P[2], P[3]]); } coupe = true; break; }
      if (S.length < 2) return; const al = prof(S[S.length - 1][2], 0.95); if (coupe) { const E = S[S.length - 1]; rond(E[0], E[1], 1.8, 0.5, al, 'nuit'); }
      trait(S, false, 0.75, al); const b = V0(R.P[0][0], yP, R.P[0][1]); rond(b[0], b[1], 1.2, 0.4, al, true);
      // le composant au bout : une petite puce (une boîte) ou une pastille
      if (lv >= R.L - 1e-3 && !coupe) { const [ex, ez] = R.P[R.P.length - 1]; if (!ok(ez)) return; if (R.comp) boite3(V0, ex - 0.09, ex + 0.09, yP, yP - 0.05, ez - 0.07, ez + 0.07, 0.6, al); else { const q = V0(ex, yP, ez); rond(q[0], q[1], 2.2 * q[3], 0.5, al, true); } }
      // les paquets : du bout vers la puce (les données qui arrivent), un sur deux dans l'autre sens
      const v = fr(now * R.v / Math.max(0.6, R.L) + R.ph), l = (i % 2 ? v : 1 - v) * lv, [px, pz] = au(R, l); if (!ok(pz)) return; const q = V0(px, yP, pz); if (q[1] > limB0) return; brille(q[0], q[1], 1.3 + q[3], al * 1.2, false, now, i);
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
      // (vague 143, l'audit : « la puce », design) : au téléphone, la pile était posée tout en bas, le haut du ciel vide, et les étiquettes mordaient
      // sur l'escalier ; elle remonte au milieu du ciel et se décale à gauche, pour laisser aux étiquettes leur colonne
      const tel = G.sw < 500, V0 = cam(0.35 + Math.sin(a * 0.2) * 0.25, -0.5, k * (tel ? 0.78 : 0.93), tel ? -0.2 : -0.12, tel ? -0.2 : 0.02), ec = sm(a / 1.6) * (1 - ferme * 0.92), th = 0.05, ks = 0.62;
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
      // (vague 125, l'audit : « la puce ») : une requête traverse toute la pile. Pendant que les couches se soulèvent l'une après l'autre, un paquet
      // de lumière descend de la couche du haut à celle du bas par un via, en suivant la couche allumée ; sur chacune, il fait son métier
      // (« clic », « idée », « requête », « mise en ligne », « contrôle », « livré ») ; en bas, il file par une piste jusqu'au bord du ciel
      if (c > 1.9 && c < 6.6 && !reduitMvt()) { const MOTS = en() ? ['click', 'idea', 'request', 'deploy', 'check', 'shipped'] : ['clic', 'idée', 'requête', 'mise en ligne', 'contrôle', 'livré'];
        const pos = jf => { const j = Math.min(5, Math.floor(jf)), u = jf - j, sj = j === 1 ? 0.62 : 0.54, P0 = V0(dxs[j] + 0.4 * sj * ks, ys[j], dzs[j] + 0.4 * sj * ks);
          if (j >= 5 || u < 0.55) return P0; const sk = j + 1 === 1 ? 0.62 : 0.54, P1 = V0(dxs[j + 1] + 0.4 * sk * ks, ys[j + 1], dzs[j + 1] + 0.4 * sk * ks), e = sm((u - 0.55) / 0.45); return [lerp(P0[0], P1[0], e), lerp(P0[1], P1[1], e)]; };
        const jf = (c - 1.9) / 0.7;
        if (jf < 6) { const P = pos(jf); for (let i = 1; i <= 6; i++) { const q = pos(Math.max(0, jf - i * 0.05)); brille(q[0], q[1], 2.2 - i * 0.25, 0.9 - i * 0.12, false, now, 70 + i); }
          brille(P[0], P[1], 5, 1, true, now, 77); const j = Math.floor(jf), u = jf - j; if (u < 0.6) mot(MOTS[j], P[0] - k * 0.05, P[1] - k * 0.13 - u * 10, Math.max(13, k * 0.075) * (1 - sm((u - 0.35) / 0.25) * 0.9), 1, 'right'); }
        else { const e = sm((c - 1.9 - 6 * 0.7) / 0.5), P0 = pos(5.99), P1 = [G.gauche - 20, P0[1] + k * 0.25]; const P = [lerp(P0[0], P1[0], e), lerp(P0[1], P1[1], e)]; trait([P0, P], false, 0.6, 0.8); brille(P[0], P[1], 5 * (1 - e * 0.5), 1, true, now, 77); }
        if (c > 1.9 + 6 * 0.7 && !PAQUET.vu && window.Dex && Dex.vu) { PAQUET.vu = true; Dex.vu('paquet'); } }
      // les étiquettes, rangées de haut en bas sans se chevaucher
      let yl = -1e9; const gap = Math.max(15, k * 0.085), TY = EQ.map(R => (yl = Math.max(R[1], yl + gap)));
      // (vague 12) la colonne ne descend jamais sous le haut des sous-titres : si elle déborde, elle remonte d'un bloc
      const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, lim = bd ? bd.y - gap * 0.6 : G.bas, dep = Math.max(0, TY[5] - lim); if (dep) TY.forEach((y, j) => { TY[j] = y - dep; });
      LB = { x: xcol, TY: TY.slice(), EQ: EQ.map(q => [q[0], q[1]]), gap };
      EQ.forEach((R, j) => { const ty = TY[j]; const tx = xcol;
        // (vague 164) au « clac », les étiquettes ne s'estompent plus : leur fil se rembobine jusqu'à la couche et le nom rapetisse avec lui
        const fo = 1 - ferme, lq = q => [lerp(R[0], q[0], fo), lerp(R[1], q[1], fo)], kf = 0.12 + 0.88 * fo, txf = lerp(R[0], tx, fo), tyf = lerp(R[1], ty, fo);
        trait([R, lq([tx - 16, ty]), lq([tx - 6, ty])], false, 0.45, 0.6); rond(R[0], R[1], 2, 0.6, 0.8, true);
        // (vague 91, finition : au téléphone, les couches passaient sur les noms ; un liseré de nuit les détache)
        { const px = Math.max(11, k * (j === 1 ? 0.085 : 0.065) * (1 + lev[j] * 0.3)); ctx.font = `600 ${px}px "Space Grotesk",system-ui,sans-serif`; ctx.font = `600 ${px * kf}px "Space Grotesk",system-ui,sans-serif`; ctx.globalAlpha = 1; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, px * 0.35) * kf; ctx.strokeStyle = 'rgb(9,11,18)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.strokeText(lab[j].toUpperCase(), txf + lev[j] * 8, tyf); }
        mot(lab[j].toUpperCase(), txf + lev[j] * 8, tyf, Math.max(11, k * (j === 1 ? 0.085 : 0.065) * (1 + lev[j] * 0.3)) * kf, j === 1 || lev[j] > 0.3 ? 1 : 0.85, 'left'); });
      if (ferme > 0.9 && now - SURGE.t0 > 2) { const C = V0(0, 0, 0), m = ctx.getTransform(), dp = dpDe(ctx.canvas); surge((m.a * C[0] + m.c * C[1] + m.e) / dp, (m.b * C[0] + m.d * C[1] + m.f) / dp, now); }
      if (ferme > 0.9) { const C = V0(0, 0, 0); eclat(C[0], C[1], k * 0.6, (ferme - 0.9) * 10, 14, 0.3); mot('clac', C[0] + k * 0.5, C[1] - k * 0.3, Math.max(14, k * 0.1), 1); }
    }
  };
})();

// IA & données : des documents sont lus (un faisceau) ; leurs morceaux s'envolent dans un grand nuage de vecteurs en 3D ; une question arrive,
// ses voisins s'allument et se relient ; la réponse s'écrit, file vers un agent, qui agit (son engrenage tourne) et coche
const CITE = { vu: false };
S.ia = (() => {
  const HALO = Array.from({ length: 170 }, (_, i) => { const t = i * 2.39996, r = 1.25 + bruit(i * 2.7) * 1.0, y = (bruit(i * 8.3) - 0.5) * 1.6; return [Math.cos(t) * r, y, Math.sin(t) * r]; });
  const Nn = 130, Vs = Array.from({ length: Nn }, (_, i) => { const y = 1 - (i + 0.5) / Nn * 2, r = Math.sqrt(1 - y * y), t = i * 2.39996, j = 0.85 + 0.3 * bruit(i * 1.7); return [Math.cos(t) * r * j, y * j, Math.sin(t) * r * j]; });
  const VO = Vs.map((p, i) => Vs.map((q, j) => [Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), j]).filter(d => d[1] > i).sort((a, b) => a[0] - b[0]).slice(0, 2).map(d => d[1]));
  const Qp = [0.35, -0.3, 0.55], PR = Vs.map((p, i) => [Math.hypot(p[0] - Qp[0], p[1] - Qp[1], p[2] - Qp[2]), i]).sort((a, b) => a[0] - b[0]).slice(0, 7).map(d => d[1]);
  return {
    cles: () => [[-0.95, -0.3], [-0.95, 0.35], [0, 0], [0.95, 0]],
    dessin(a, now) {
      // (vague 170) au téléphone, la scène était posée en bas du ciel, le haut vide : elle remonte
      const [k, lx] = large(1.5, 2.1), dyT = G.droite < 600 ? -Math.min(k * 0.55, (G.cy - G.haut) * 0.4) : 0, Pk = (x, y) => [G.cx + x * k, G.cy + dyT + y * k], xd = -lx * 0.8, xa = lx * 0.7, Cy = 7, c = a % Cy, R = 0.78, V = cam(now * 0.28, -0.25, k * 0.92, 0, -0.18 + dyT / G.s);
      // (vague 16 de l'audit : « le nuage reste une boule au milieu ») : tout le ciel est l'espace des vecteurs : un grand halo de fiches tourne
      // lentement, de bord à bord, derrière les documents et l'écran ; celles du fond ne sont que des points
      sousLaBarre();
      { const hx = ((G.droite - G.gauche) / 2 * 0.95) / (k * 0.92 * 2.2), H = HALO.map(([x, y, z], i) => { const p = V(x, y * 0.55, z); p[0] = G.cx + (p[0] - G.cx) * hx; return [p, i]; }).sort((A, B) => A[0][2] - B[0][2]);
        // (vague 170) les fiches qui dérivent vers les bords rapetissent avant la bande où la scène s'estompe, au lieu d'y grisailler
        const bdH = Math.min(90, (G.droite + 16) * 0.1);
        H.forEach(([q, i]) => { if (q[1] < G.haut || q[1] > G.caps) return; const sE = c01((q[0] - bdH * 0.5) / bdH) * c01((G.droite + 16 - bdH * 0.5 - q[0]) / bdH); if (sE < 0.08) return; const al = prof(q[2] * 0.5, 0.9); if (q[2] < 0.2) { rond(q[0], q[1], (0.9 + q[3] * 0.8) * sE, 0.5, al, true); return; }
          const w = k * 0.026 * q[3] * sE, h = w * 0.72; ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(bruit(i * 5.1) - 0.5); cerne(() => { ctx.beginPath(); ctx.rect(-w, -h, 2 * w, 2 * h); }, 0.4, al, null); ctx.restore(); }); }
      ctx.restore();
      // les documents, en éventail ; le faisceau de lecture
      [2, 1, 0].forEach(j => { const p = Pk(xd + j * 0.08, -0.05 - j * 0.04); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-0.09 * j); ctx.translate(j * k * 0.02, -j * k * 0.02); cerne(() => { ctx.beginPath(); ctx.moveTo(-0.2 * k, -0.34 * k); ctx.lineTo(0.1 * k, -0.34 * k); ctx.lineTo(0.2 * k, -0.24 * k); ctx.lineTo(0.2 * k, 0.34 * k); ctx.lineTo(-0.2 * k, 0.34 * k); ctx.closePath(); }, 0.9, 1);
        ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.5; ctx.beginPath(); ctx.moveTo(0.1 * k, -0.34 * k); ctx.lineTo(0.1 * k, -0.24 * k); ctx.lineTo(0.2 * k, -0.24 * k); ctx.stroke();
        if (!j) { ctx.lineWidth = G.lw * 0.4; ctx.beginPath(); for (let l = 0; l < 7; l++) { ctx.moveTo(-0.13 * k, (-0.2 + l * 0.08) * k); ctx.lineTo((0.13 - (l % 3) * 0.05) * k, (-0.2 + l * 0.08) * k); } ctx.stroke(); } ctx.restore(); });
      const lb = -0.32 + ((now * 0.35) % 1) * 0.6, A0 = Pk(xd - 0.25, lb), A1 = Pk(xd + 0.25, lb); trait([A0, A1], false, 1.1, 1); brille(A1[0], A1[1], 3, 1, false, now, 1);
      // le nuage : il tourne ; ses liens ; il se remplit
      const Q = Vs.map(([x, y, z]) => V(x * R, y * R, z * R)), nb = Math.max(1, Math.min(Nn, 30 + Math.floor(a * 16)));
      sousLaBarre();   // (vague 60 : le nuage ne passe plus sur la barre des chapitres)
      for (let i = 0; i < nb; i++) VO[i].forEach(j => { if (j < nb) trait([Q[i], Q[j]], false, 0.35, prof(Q[i][2], 0.35)); });
      // (vague 4 : « un nuage de points trop sage ») : chaque vecteur est une petite fiche de papier ; celles de devant, plus grandes, portent deux lignes d'encre
      Q.slice(0, nb).map((q, i) => [q, i]).sort((p, r) => p[0][2] - r[0][2]).forEach(([q, i]) => { const al = prof(q[2]); if (q[2] < -0.1) { rond(q[0], q[1], 1.3 + q[3] * 0.9, 0.5, al, true); return; }
        const w = k * 0.03 * q[3], h = w * 0.72, rt = bruit(i * 3.3) - 0.5; ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(rt); cerne(() => { ctx.beginPath(); ctx.rect(-w, -h, 2 * w, 2 * h); }, 0.45, al, al < 0.8 ? null : undefined);
        if (w > 5 && al >= 0.8) { ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.3; ctx.beginPath(); ctx.moveTo(-w * 0.6, -h * 0.25); ctx.lineTo(w * 0.6, -h * 0.25); ctx.moveTo(-w * 0.6, h * 0.3); ctx.lineTo(w * 0.2, h * 0.3); ctx.stroke(); } ctx.restore(); });
      RAG.t = now;   // (vague 88 : la question cherche aussi dans le vrai site, voir ragUI())
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
        { const sv = 1 - 0.75 * sm(v);   // (vague 170 : la fiche en vol rapetisse en arrivant, elle ne s'estompe plus)
          style(0.6, 1); ctx.strokeRect(lerp(A1[0], B[0], sm(v)) - 4 * sv, lerp(A1[1], B[1], sm(v)) - Math.sin(Math.PI * v) * k * 0.2 - 3 * sv, 8 * sv, 6 * sv); } }
      // la question ; ses voisins s'allument et se relient
      const qA = Pk(0.15, -0.78), Qc = V(Qp[0] * R, Qp[1] * R, Qp[2] * R), qu = c01((c - 1) / 0.8), on = c > 1.8 && c < 5.2;
      if (c > 0.6 && c < 2.2) { const e = sm(c01((c - 0.6) / 0.3)) * (1 - sm(c01((c - 1.9) / 0.3))), bw = k * 0.2 * e, bh = k * 0.15 * e;
        if (e > 0.05) { cerne(() => { ctx.beginPath(); ctx.ellipse(qA[0], qA[1], bw, bh, 0, 0, TAU); ctx.moveTo(qA[0] - bw * 0.3, qA[1] + bh * 0.85); ctx.lineTo(qA[0] - bw * 0.55, qA[1] + bh * 1.5); ctx.lineTo(qA[0], qA[1] + bh * 0.95); }, 0.9, 1);
          ctx.globalAlpha = 1; ctx.fillStyle = ENC; ctx.font = `700 ${Math.max(12, bh * 1.2)}px "Space Grotesk",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', qA[0], qA[1] + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; } if (qu > 0 && qu < 1) brille(lerp(qA[0], Qc[0], qu), lerp(qA[1], Qc[1], qu), 3.5, 1, true, now, 2); }
      if (on) { rond(Qc[0], Qc[1], 6, 1, 1); PR.forEach((i, j) => { const q = Q[i], u = c01((c - 1.8 - j * 0.12) / 0.3); trait([Qc, [lerp(Qc[0], q[0], u), lerp(Qc[1], q[1], u)]], false, 0.8, 0.9); if (u >= 1) brille(q[0], q[1], 3, 1, false, now, i); }); }
      // la réponse s'écrit, puis va à l'agent ; il agit
      // (vague 144, finition : au bureau, l'écran de la réponse passait sur la planète des chats ; il se range à sa gauche)
      const wr = 0.52 * k, hr = 0.34 * k, R0 = Pk(xa, -0.38); { const pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
        if (pc && R0[0] + wr / 2 > pc.x - pc.r * 1.3 && R0[1] - hr / 2 < pc.y + pc.r * 1.3) R0[0] = Math.min(R0[0], pc.x - pc.r * 1.3 - wr / 2 - 8); } ecran(R0[0] - wr / 2, R0[1] - hr / 2, wr, hr, k * 0.06, 6);
      const ec = c01((c - 2.6) / 1.2); for (let l = 0; l < 3; l++) { const u = c01(ec * 3 - l); if (u > 0) trait([[R0[0] - wr * 0.38, R0[1] - hr * 0.22 + l * hr * 0.22], [R0[0] - wr * 0.38 + wr * (0.76 - (l === 2 ? 0.3 : 0)) * u, R0[1] - hr * 0.22 + l * hr * 0.22]], false, 0.6, 0.9); }
      // (29/09, l'audit : « trop sage ») : chaque voisin retrouvé devient une petite fiche de papier qui file, en arc, jusqu'à l'écran de la réponse
      PR.forEach((i, j) => { const v = c01((c - 2.1 - j * 0.09) / 0.75); if (v <= 0 || v >= 1) return; const q = Q[i], e = sm(v), x = lerp(q[0], R0[0] - wr * 0.3, e), y = lerp(q[1], R0[1], e) - Math.sin(Math.PI * e) * k * 0.3, w = k * 0.07, h = k * 0.05;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(v * 9 + j) * 0.4); cerne(() => { ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); }, 0.55, 1); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.3; ctx.beginPath(); ctx.moveTo(-w * 0.35, -h * 0.1); ctx.lineTo(w * 0.35, -h * 0.1); ctx.moveTo(-w * 0.35, h * 0.18); ctx.lineTo(w * 0.1, h * 0.18); ctx.stroke(); ctx.restore(); });
      // (vague 126 de l'audit : « de très bien à inoubliable ») : la réponse cite ses sources. Chaque fiche qui atterrit laisse un renvoi
      // numéroté [1]…[7] sous les lignes ; puis un fil part de chaque renvoi vers sa fiche dans le nuage, qui porte le même numéro, un à la fois
      { const nM = PR.length, fs = Math.max(10, k * 0.05), mw0 = Math.min(wr * 0.8 / nM, fs * 1.9), y0 = R0[1] + hr * 0.33, x0 = R0[0] - mw0 * (nM - 1) / 2, act = c > 3.1 && c < 5.6 ? Math.floor((c - 3.1) * 3.2) % nM : -1;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        PR.forEach((i, j) => { const ap = c - 2.85 - j * 0.09; if (ap <= 0 || c > 6.6) return; const e = Math.min(1, ap / 0.18) * (c > 6.3 ? 1 - (c - 6.3) / 0.3 : 1), pop = 1 + Math.sin(Math.min(1, ap / 0.3) * Math.PI) * 0.45, mx = x0 + j * mw0, hi = j === act;
          if (e <= 0) return; ctx.save(); ctx.translate(mx, y0); ctx.scale(e * pop, e * pop);
          cerne(() => { ctx.beginPath(); ctx.rect(-mw0 * 0.42, -fs * 0.62, mw0 * 0.84, fs * 1.24); }, hi ? 0.7 : 0.45, 1, hi ? '#fff4c8' : PAP);
          ctx.globalAlpha = 1; ctx.fillStyle = ENC; ctx.font = `700 ${fs * 0.8}px "Space Grotesk",sans-serif`; ctx.fillText(String(j + 1), 0, 1); ctx.restore();
          if (c > 3.1 && c < 5.6) { const q = Q[i], z = Math.max(9, fs * 0.85);
            // le numéro sur la fiche source, dans le nuage
            ctx.save(); ctx.translate(q[0] + z * 0.7, q[1] - z * 0.7); cerne(() => { ctx.beginPath(); ctx.arc(0, 0, z * 0.62, 0, TAU); }, hi ? 0.7 : 0.4, 1, hi ? '#fff4c8' : PAP);
            ctx.globalAlpha = 1; ctx.fillStyle = ENC; ctx.font = `700 ${z * 0.72}px "Space Grotesk",sans-serif`; ctx.fillText(String(j + 1), 0, 1); ctx.restore();
            if (hi) { const u = c01(((c - 3.1) * 3.2 % 1) / 0.45); ctx.save(); ctx.setLineDash([5, 5]); ctx.lineDashOffset = -now * 30; trait([[mx, y0 - fs * 0.62], [lerp(mx, q[0], u), lerp(y0 - fs * 0.62, q[1], u) - Math.sin(Math.PI * u) * k * 0.12]], false, 0.6, 1); ctx.restore();
              if (u >= 1) brille(q[0], q[1], 3, 1, true, now, 30 + j); } } });
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        if (c > 5.4 && !CITE.vu && window.Dex && Dex.vu) { CITE.vu = true; Dex.vu('citations'); } }
      const ag = Pk(xa, 0.16); robot(ag[0], ag[1], k * 0.17, 1, Math.sin(now * 1.5) > 0.97, { now, v: 4, lac: Math.sin(now * 0.8) * 0.5, travaille: c > 4.5 && c < 5.5 });
      if (c > 3.9 && c < 4.6) { const v = (c - 3.9) / 0.7; brille(lerp(R0[0], ag[0], v), lerp(R0[1] + hr / 2, ag[1] - k * 0.1, v), 3, 1, true, now, 4); }
      rouage(ag[0] + k * 0.22, ag[1] + k * 0.22, k * 0.06, c > 4.5 ? (c - 4.5) * 4 : 0);
      if (c > 5) coche(ag[0] + k * 0.2, ag[1] - k * 0.16, k * 0.05, (c - 5) / 0.4, 1);
    }
  };
})();

// front & interfaces : une page se monte toute seule (l'en-tête glisse, les cartes se retournent) ; un clic : un cube en 3D jaillit de l'écran ;
// puis la même page devient tablette, puis téléphone : le cadre se resserre, les cartes se réorganisent (3 colonnes, 2, 1), le menu devient burger ; et retour
const FOCUS = { vu: false };
const PIV = { y: 0, p: 0, t: null };
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
      INSP.t = now;   // (vague 85 : l'inspecteur est actif tant que cette scène se dessine)
      // (vague 156 de l'audit : « front », immersion) : l'écran n'est plus collé au fond : il pivote doucement en 3D, il regarde la souris
      // (il tourne vers elle, s'incline), et sans souris il se balance ; l'univers d'interface reste autour, l'écran flotte dedans
      { const Sm = souris(), on = Sm && window.Chats.K.Wd.t - Sm.moved < 3, ty = on ? clamp((Sm.x - G.cx) / (G.sw * 0.5), -1, 1) * 0.17 : Math.sin(now * 0.35) * 0.08,
          tp = on ? clamp((Sm.y - Yc) / G.s, -1, 1) * 0.1 : Math.sin(now * 0.27) * 0.045, dtf = Math.min(0.1, Math.max(0, now - (PIV.t ?? now))); PIV.t = now;
        PIV.y += (ty - PIV.y) * Math.min(1, dtf * 3); PIV.p += (tp - PIV.p) * Math.min(1, dtf * 3);
        sousLaBarre(); ctx.save(); ctx.translate(G.cx, Yc); ctx.transform(Math.cos(PIV.y), Math.sin(PIV.y) * 0.24, -Math.sin(PIV.p) * 0.2, Math.cos(PIV.p), 0, 0); ctx.translate(-G.cx, -Yc); }
      const T = Pk(-w, -h); { // (vague 8) le chat-robot assis sur l'écran : quand l'écran se resserre, le bord se dérobe sous lui ; il saute, bras en l'air, et retombe dessus
        const P = Pk(w * 0.55, -h), r = k * 0.1, sa = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
        chabot(P[0], P[1] - r * 0.55 - Math.abs(Math.sin(now * 2)) * r * 0.15 * (1 - sa) - sa * r * 1.6, r, { now, v: 1, lac: sa ? 0 : Math.sin(now * 0.7) * 0.6, cligne: sa > 0.3, bras: sa ? [1.5, 1.5] : [1.2 + Math.sin(now * 6) * 0.4, -0.4] });
        if (sa > 0.2) mot(A < B ? (en() ? 'whoa' : 'oh là') : 'hop', P[0] + r * 1.4, P[1] - r * 2.6 - sa * r, Math.max(11, k * 0.06), sa); }
      ecran(T[0], T[1], 2 * w * k, 2 * h * k, k * 0.1, k * lerp(0.1, 0.03, large01));
      if (large01 < 1) { const n = Pk(0, -h + 0.05), q = 1 - large01; boite(n[0] - k * 0.07 * q, n[1] - k * 0.015, k * 0.14 * q, k * 0.03, k * 0.015, 0.7, 1); }   // (vague 156 : l'encoche se rétracte, sans fondu)
      trait([Pk(-w, -h + 0.16), Pk(w, -h + 0.16)], false, 0.8, 0.9);
      [0, 1, 2].forEach(i => { const p = Pk(-w + 0.09 + i * 0.07, -h + 0.08); if (large01 > 0.02) rond(p[0], p[1], 2.2 * large01, 0.6, 1, true); });
      if (large01 < 1) [0, 1, 2].forEach(i => { const p = Pk(w - 0.14, -h + 0.05 + i * 0.03); trait([[p[0], p[1]], [p[0] + k * 0.07 * (1 - large01), p[1]]], false, 0.7, 1); });
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
        if (c > 8.6 && c < 9.4 && i === 1) { const r = (c - 8.6) / 0.8, q = Pk(x + cw / 2, y + ch / 2); style(0.05 + 0.75 * (1 - r), 1); ctx.beginPath(); ctx.arc(q[0], q[1], k * 0.2 * r, 0, TAU); ctx.stroke(); rond(q[0], q[1], k * 0.035 * (1 - r) + 0.5, 0.9, 1); } });
      // le bouton
      const eb = b1 ? sm((a - 1.6) / 0.4) : 1, bw = Math.min(0.4, w * 1.1), bx = large01 * w * 0.5, by = h - 0.15; if (eb > 0) { const p = Pk(bx - bw / 2, by - 0.06); boite(p[0], p[1], bw * k * eb, 0.12 * k, 6, 0.95, 1, true); }
      // le curseur : il va au bouton, clique ; l'onde ; le cube jaillit
      const vc = sm((c - 1.8) / 1), cu = Pk(lerp(-0.2, bx, vc), lerp(h + 0.2, by, vc)), clic = c - 2.8;
      if (c > 1.8 && c < 4.4) cerne(() => { ctx.beginPath(); ctx.moveTo(cu[0], cu[1]); ctx.lineTo(cu[0], cu[1] + k * 0.13); ctx.lineTo(cu[0] + k * 0.035, cu[1] + k * 0.095); ctx.lineTo(cu[0] + k * 0.06, cu[1] + k * 0.14); ctx.lineTo(cu[0] + k * 0.08, cu[1] + k * 0.13); ctx.lineTo(cu[0] + k * 0.055, cu[1] + k * 0.085); ctx.lineTo(cu[0] + k * 0.095, cu[1] + k * 0.085); ctx.closePath(); }, 0.8, 1);
      if (clic > 0 && clic < 0.6) { style(0.05 + 0.85 * (1 - clic / 0.6), 1); ctx.beginPath(); ctx.arc(cu[0], cu[1], k * 0.25 * clic / 0.6, 0, TAU); ctx.stroke(); }   // (vague 156 : l'onde s'amincit au lieu de s'effacer)
      const ec = clic > 0.2 ? Math.sin(Math.PI * c01((clic - 0.2) / 3.2)) : 0;
      if (ec > 0.01) { const s = 0.1 + ec * 0.17, Cm = cam(now * 0.6, now * 0.4, k), o = Pk(0, -0.05 - ec * 0.12);
        const Vc = (u, v, d) => { const q = Cm(u * s, v * s, d * s); return [q[0] + o[0] - G.cx, q[1] + o[1] - G.cy, q[2], q[3]]; }, F = prisme(Vc, [[-1, -1], [1, -1], [1, 1], [-1, 1]], 2, 1, 1); encre('</>', F, 1, 0.3);
        [[-1, -1, -1], [1, 1, 1], [1, -1, 1], [-1, 1, -1]].forEach(([x, y, z], i) => { const q = Vc(x, y, z); brille(q[0], q[1], 2, ec, false, now, i); }); }
      // (vague 127 de l'audit : « rapides, animées, accessibles » : l'accessible ne se voyait pas) : sur la tablette, quelqu'un navigue au clavier.
      // La touche Tab s'enfonce, l'anneau de focus saute de l'en-tête aux cartes puis au bouton, et le lecteur d'écran lit chaque élément à voix haute
      if (c > 5.3 && c < 7.15) { const pas = 0.36, st = Math.min(4, Math.floor((c - 5.3) / pas)), f = (c - 5.3 - st * pas) / pas, gl = sm(c01(f / 0.35)),
          R = [[-w + 0.08, -h + 0.21, 2 * w - 0.16, 0.09], ...CC.map(([x, y, cw, ch]) => [x, y, cw, ch]), [bx - bw / 2, by - 0.06, bw, 0.12]],
          r0 = R[Math.max(0, st - 1)], r1 = R[st], rr = st ? r0.map((v, j) => lerp(v, r1[j], gl)) : r1, o = k * 0.035, q = Pk(rr[0], rr[1]), ap = c01((c - 5.3) / 0.15) * c01((7.15 - c) / 0.15);
        ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = Math.max(2.5, G.lw * 1.1); ctx.lineJoin = 'round'; ctx.beginPath();
        const X0 = q[0] - o * ap, Y0 = q[1] - o * ap, Wf = rr[2] * k + 2 * o * ap, Hf = rr[3] * k + 2 * o * ap, rad = Math.min(8, Hf / 2); ctx.moveTo(X0 + rad, Y0); ctx.arcTo(X0 + Wf, Y0, X0 + Wf, Y0 + Hf, rad); ctx.arcTo(X0 + Wf, Y0 + Hf, X0, Y0 + Hf, rad); ctx.arcTo(X0, Y0 + Hf, X0, Y0, rad); ctx.arcTo(X0, Y0, X0 + Wf, Y0, rad); ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.lineDashOffset = -now * 20; ctx.strokeRect(X0 - 4, Y0 - 4, Wf + 8, Hf + 8); ctx.restore();
        if (gl >= 1 && f < 0.6) brille(X0 + Wf, Y0, 3, 1, true, now, 50 + st);
        // la touche Tab (enfoncée au début de chaque pas) et la bulle du lecteur d'écran
        const fs = Math.max(12, k * 0.07), yR = Math.min(Pk(0, h + 0.15)[1] + fs * 0.4, (G.caps || G.bas) - fs * 0.9), kw = fs * 3.2, kh = fs * 1.7, enf = f < 0.18 ? fs * 0.18 : 0, kx = G.cx - kw - fs * 5.2;
        ctx.save(); ctx.translate(G.cx, yR); ctx.scale(Math.max(0.01, ap), Math.max(0.01, ap)); ctx.translate(-G.cx, -yR);   // pas de fondu : la rangée grandit puis rapetisse
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(kx + 2, yR - kh / 2 + 3, kw, kh); boite(kx, yR - kh / 2 + enf, kw, kh, 4, 0.95, 1, true); mot('⇥ Tab', kx + kw / 2, yR + enf, fs * 0.85, 1);
        const L = en() ? ['heading, level 1', 'card 1 of 3', 'card 2 of 3', 'card 3 of 3', 'button, Send'] : ['titre, niveau 1', 'carte 1 sur 3', 'carte 2 sur 3', 'carte 3 sur 3', 'bouton, Envoyer'], tx = kx + kw + fs * 1.6;
        ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; for (let n = 1; n <= 3; n++) { ctx.beginPath(); ctx.arc(tx - fs * 0.9, yR, fs * 0.28 * n, -0.7, 0.7); ctx.stroke(); } ctx.restore();
        const lu = L[st], nch = Math.ceil(lu.length * c01(f / 0.5)); mot('« ' + lu.slice(0, nch) + (nch < lu.length ? '' : ' »'), tx, yR, fs, 1, 'left'); ctx.restore();
        if (st === 4 && f > 0.55 && f < 0.95) { const v = (f - 0.55) / 0.4, bq = Pk(bx, by); style(0.05 + 0.75 * (1 - v), 1); ctx.beginPath(); ctx.arc(bq[0], bq[1], k * 0.2 * v, 0, TAU); ctx.stroke(); mot(en() ? 'Enter ↵' : 'Entrée ↵', bq[0], bq[1] - k * 0.13 - v * k * 0.05, fs * 0.8 * (1 - v * 0.6), 1); }
        if (st === 4 && !FOCUS.vu && window.Dex && Dex.vu) { FOCUS.vu = true; Dex.vu('focus-clavier'); } }
      const nom = NOMS()[u < 0.5 ? A : B], al = u > 0 ? Math.abs(u - 0.5) * 2 : 1, L = Pk(0, h + 0.12); if (c > 4 && !(c > 5.3 && c < 7.15)) { const pn = Math.max(10, k * 0.07) * al; if (pn > 1) mot(nom, L[0], L[1], pn, 0.9); }   // (vague 156 : le nom rapetisse puis regrandit pendant le changement)
      ctx.restore(); ctx.restore();
    }
  };
})();

// back-end & données : un plan en 3D, vu d'en haut. Les requêtes arrivent de partout ; la passerelle (API) les range dans la file de leur client ;
// les engrenages les traitent ; chaque client a sa propre base, séparée des autres par un mur (l'isolation)
const ISOLE = { vu: false };
const ETQ = [];
S.back = (() => ({
  cles: () => [[-0.62, -0.5], [-0.62, 0.5], [0.85, -0.45], [0.85, 0.45]],
  dessin(a, now) {
    // (vague 146, l'audit : « back-end », design : au téléphone, la scène tenait dans le bas du ciel, le haut vide ; elle remonte et grandit)
    sousLaBarre(); const [k, lx] = large(1.5, 2.1), tel = G.sw < 500; let oyB = tel ? -0.42 : -0.26, V = cam(0.42, -0.5, k * (tel ? 1.02 : 0.92), 0, oyB);
    // (vague 166, l'audit : « back-end ») : au bureau, le pied de la passerelle API était tranché net au-dessus des sous-titres ; la scène remonte
    // juste ce qu'il faut pour que tout son socle tienne dans le ciel
    let kB = k * (tel ? 1.02 : 0.92);
    for (let pas = 0; pas < 2; pas++) { const xa = -lx * 0.55, xd = lx * 0.68, bas0 = Math.max(...[[-0.16, -0.56], [0.1, -0.56], [-0.16, 0.5], [0.1, 0.5]].map(([x, z]) => V(xa + x, 0.3, z)[1])) + k * 0.03, lim = (G.caps || G.bas) - 10,
        som = Math.min(...[-0.45, 0, 0.45].map(z => V(xd, 0.3 - 0.36 - 0.2, z)[1])), hautB = G.haut + 18;
      if (bas0 <= lim && som >= hautB) break;
      if (bas0 - som > lim - hautB) kB *= Math.max(0.7, (lim - hautB) / (bas0 - som)); else oyB -= (bas0 > lim ? bas0 - lim : som - hautB) / G.s;
      V = cam(0.42, -0.5, kB, 0, oyB); }
    const xA = -lx * 0.55, xW = lx * 0.05, xD = lx * 0.68, zs = [-0.45, 0, 0.45], yS = 0.3;
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
    // (vague 128 de l'audit : « des bases isolées par client » ne se voyait qu'en deux traits fins) : toutes les sept secondes, une requête masquée
    // (un bandeau de voleur) sort de la base A (ou C) et tente de se glisser chez la voisine ; le mur jaillit vers le ciel, brique par brique,
    // elle s'y cogne (« 403 »), retombe en tournoyant dans sa propre base, et le mur redescend
    { const n = Math.floor(a / 7), ti = a % 7, sg = n % 2 ? 1 : -1, zw = 0.225 * sg, zA = 0.45 * sg, mh = sm(c01((ti - 0.6) / 0.5)) * (1 - sm(c01((ti - 3.2) / 0.7))), Yb = V(xD, yS - 0.42, zw)[1], dY = Yb - V(xD, yS - 1.42, zw)[1], eMax = Math.max(0.3, Math.min(0.95, (Yb - G.haut - k * 0.2) / Math.max(1, dY))), ext = eMax * mh + Math.sin(c01((ti - 1.55) / 0.5) * Math.PI * 3) * 0.04 * (ti > 1.55 && ti < 2.05 ? 1 : 0);
      if (mh > 0.01) { const y0 = yS - 0.42, nb = 9, Q = [V(xD - 0.32, y0, zw), V(xD + 0.32, y0, zw), V(xD + 0.32, y0 - ext, zw), V(xD - 0.32, y0 - ext, zw)];
        cerne(() => { ctx.beginPath(); Q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }, 0.9, 1);
        ctx.globalAlpha = 0.8; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; ctx.beginPath();
        for (let j = 1; j * 0.105 < ext; j++) { const yy = y0 - j * 0.105, A0 = V(xD - 0.32, yy, zw), B0 = V(xD + 0.32, yy, zw); ctx.moveTo(A0[0], A0[1]); ctx.lineTo(B0[0], B0[1]);
          for (let m = 0; m < 4; m++) { const xx = xD - 0.32 + (m + (j % 2 ? 0.5 : 0.25)) * 0.16, P0 = V(xx, yy, zw), P1 = V(xx, Math.max(yy - 0.105, y0 - ext), zw); if (xx < xD + 0.3) { ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); } } }
        ctx.stroke(); const T = V(xD, y0 - ext, zw), fsI = Math.max(10, k * 0.065); ETQ.push(() => mot(en() ? 'tenant isolation' : 'isolation', T[0], Math.max(G.haut + fsI * 1.2, T[1] - k * 0.06), fsI, 1)); }
      // la requête masquée
      if (ti > 0.8 && ti < 3.1) { let z, y, rot = 0;
        if (ti < 1.6) { const e = sm((ti - 0.8) / 0.8); z = lerp(zA, zw - sg * 0.05, e); y = yS - 0.55 - Math.sin(Math.PI * e) * 0.18; }
        else { const e = c01((ti - 1.6) / 1.4); z = lerp(zw - sg * 0.05, zA, e); y = yS - 0.55 - Math.sin(Math.PI * Math.min(1, e * 1.3)) * 0.4 + e * e * 0.3; rot = -sg * e * 11; }
        const p = V(xD, y, z), s = Math.max(9, k * 0.085 * p[3]);
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(rot); cerne(() => { ctx.beginPath(); ctx.rect(-s, -s * 0.7, s * 2, s * 1.4); }, 0.7, 1);
        ctx.globalAlpha = 1; ctx.fillStyle = ENC; ctx.fillRect(-s, -s * 0.38, s * 2, s * 0.36); ctx.fillStyle = PAP; ctx.beginPath(); ctx.arc(-s * 0.4, -s * 0.2, s * 0.11, 0, TAU); ctx.arc(s * 0.4, -s * 0.2, s * 0.11, 0, TAU); ctx.fill();
        ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; ctx.beginPath(); ctx.moveTo(-s, -s * 0.7); ctx.lineTo(0, -s * 0.38); ctx.lineTo(s, -s * 0.7); ctx.stroke(); ctx.restore();
        mot(['A', 'C'][n % 2], p[0], p[1] + s * 1.35, Math.max(9, k * 0.05), 1);
        if (ti > 1.6 && ti < 2.4) { const v = (ti - 1.6) / 0.8, W = V(xD, yS - 0.6, zw), Wl = V(xD - 0.32, yS - 0.42 - ext * 0.6, zw); eclat(W[0], W[1], k * 0.12, v, 8, n); const f4 = Math.max(11, k * 0.07) * (1 + 0.3 * Math.sin(Math.min(1, v * 3) * Math.PI)); ETQ.push(() => mot(en() ? '403 · not your base' : '403 · pas ta base', Math.max(k * 0.5, Wl[0] - k * 0.32), Math.max(G.haut + f4 * 1.2, Wl[1] - v * k * 0.08), f4, 1)); }
        if (ti > 1.62 && !ISOLE.vu && window.Dex && Dex.vu) { ISOLE.vu = true; Dex.vu('mur-isole'); } } }
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
      if (refus && t >= 0.25) { if (t > 0.55) continue; const e = (t - 0.25) / 0.3, b = V(xA - 0.3 - e * 0.9, yS - 0.12 - Math.sin(Math.PI * Math.min(1, e * 1.4)) * 0.45 - e * 0.3, z0), rap = 1 - sm(c01((e - 0.65) / 0.35)), sb = k * 0.045 * b[3] * rap;   // (vague 146 : refoulée, elle rapetisse jusqu'à rien en s'envolant ; avant, elle disparaissait d'un coup)
        ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(-e * 9); cerne(() => { ctx.beginPath(); ctx.rect(-sb, -sb * 0.7, sb * 2, sb * 1.4); }, 0.6, 1); ctx.restore();
        if (rap > 0.05) mot('429', b[0], b[1] - sb * 1.6, Math.max(9, k * 0.055) * (0.4 + 0.6 * rap), 1); continue; }
      if (t < 0.25) { const e = sm(t / 0.25), x0 = (bruit(q * 4.7) * 2 - 1) * lx * 1.45, y0 = yS - 0.35 - bruit(q * 2.2) * 1.1; p = V(lerp(x0, xA - 0.12, e), lerp(y0, yS - 0.1, e) - Math.sin(Math.PI * e) * 0.15, lerp(z0 * 1.4, z, e)); } else if (t < 0.6) p = V(lerp(xA + 0.14, xW - 0.14, (t - 0.25) / 0.35), yS - 0.03, z); else if (t < 0.7) p = V(xW, yS - 0.1 - Math.sin((t - 0.6) / 0.1 * Math.PI) * 0.08, z); else { const u = (t - 0.7) / 0.3; p = V(lerp(xW + 0.14, xD, u), yS - 0.05 - u * 0.36 - Math.sin(Math.PI * u) * 0.25, z); }
      // (vague 8, l'audit : « des enveloppes qui flottent, grises ») : opaques ; en file vers la passerelle ; l'engrenage les ouvre : elles
      // ressortent en fiches de données (des lignes) et plongent dans leur base, qui fait « +1 »
      const s = k * 0.045 * p[3], al = Math.max(0.85, prof(p[2]));
      if (t < 0.65) { cerne(() => { ctx.beginPath(); ctx.rect(p[0] - s, p[1] - s * 0.7, s * 2, s * 1.4); }, 0.6, al); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; ctx.beginPath(); ctx.moveTo(p[0] - s, p[1] - s * 0.7); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + s, p[1] - s * 0.7); ctx.stroke(); }
      else { cerne(() => { ctx.beginPath(); ctx.rect(p[0] - s * 0.75, p[1] - s, s * 1.5, s * 2); }, 0.6, al); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.35; ctx.beginPath(); for (let j = 0; j < 3; j++) { ctx.moveTo(p[0] - s * 0.45, p[1] - s * 0.5 + j * s * 0.45); ctx.lineTo(p[0] + s * (j === 2 ? 0.1 : 0.45), p[1] - s * 0.5 + j * s * 0.45); } ctx.stroke(); }
      if (t > 0.94) { const m = V(xD + 0.12, yS - 0.5, z); const u1 = (t - 0.94) / 0.06; mot('+1', m[0], m[1] - (t - 0.94) * k * 1.2, Math.max(10, k * 0.07) * (1 - u1 * 0.85), 1); } }
    { const g = V(xA - 0.12, yS - 0.14, 0), m = ctx.getTransform(), dq = dpDe(ctx.canvas); REQ.t = now; REQ.gx = (m.a * g[0] + m.c * g[1] + m.e) / dq; REQ.gy = (m.b * g[0] + m.d * g[1] + m.f) / dq; }   // (vague 88 : le vrai site est client, voir requetes())
    // (vague 61 de l'audit, « back-end », immersion) : nous aussi, on est un client. La souris porte sa propre requête (une enveloppe) ;
    // présentée au videur, elle passe (« 200 OK ») si on arrive calmement, elle est refoulée (« 429 ») si on arrive en trombe
    { const Sm = souris(); if (Sm && window.Chats.K.Wd.t - Sm.moved < 2.5 && Sm.y > G.haut && Sm.y < (G.caps || G.bas)) { const s = k * 0.05, ex = Sm.x + s * 1.4, ey = Sm.y + s * 1.2, P = V(xA - 0.2, yS - 0.1, 0), d = Math.hypot(Sm.x - P[0], Sm.y - P[1]), vit = Math.hypot(Sm.vx || 0, Sm.vy || 0);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(Math.sin(now * 3) * 0.12); cerne(() => { ctx.beginPath(); ctx.rect(-s, -s * 0.7, s * 2, s * 1.4); }, 0.7, 1); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.4; ctx.beginPath(); ctx.moveTo(-s, -s * 0.7); ctx.lineTo(0, 0); ctx.lineTo(s, -s * 0.7); ctx.stroke(); ctx.restore();
      if (d < k * 0.45) { const trop = vit > 900; mot(trop ? '429' : '200 OK', P[0] - k * 0.12, Math.max(G.haut + k * 0.06, P[1] - k * 0.66), Math.max(13, k * 0.08), 1); if (!trop) coche(ex + s * 1.4, ey - s, s * 0.6, 1, 1.1); else { style(1.2, 1); ctx.beginPath(); ctx.moveTo(ex + s, ey - s * 1.6); ctx.lineTo(ex + s * 1.8, ey - s * 0.8); ctx.moveTo(ex + s * 1.8, ey - s * 1.6); ctx.lineTo(ex + s, ey - s * 0.8); ctx.stroke(); } } } }
    ctx.restore();
    // (vague 146, finition : « isolation » et « 403 » étaient recouverts par les requêtes qui passent ; ils s'écrivent par-dessus tout, sous la barre)
    ETQ.forEach(f => f()); ETQ.length = 0;
  }
}))();

// DevOps & cloud : la boucle sans fin, en 3D, comme un circuit vu d'en haut ; des conteneurs en font le tour et passent sous les portiques
// (build, test, déploie, surveille), qui s'allument à leur passage ; dessous, l'écran du monitoring et son pouls
let CHG = 0;   // (vague 64 : la charge que la souris fait peser sur DevOps, lissée)
const ROLL = { vu: false };
S.devops = (() => ({
  cles: () => [[-1, 0], [1, 0], [0, 0], [-0.5, -0.35]],
  dessin(a, now) {
    // (vague 147, finition : les nuages sautaient d'un bord à l'autre en plein ciel, ils sortent maintenant de l'écran avant de revenir ; au téléphone,
    // la boucle débordait sous les flèches des bords, elle se resserre)
    const [k, lx] = large(1.4, 2.1), V = cam(Math.sin(now * 0.25) * 0.18, -0.62, k, 0, -0.04), sx = lx * (G.sw < 500 ? 0.8 : 0.92);
    const at = t => { const d = 1 + Math.sin(t) ** 2; return [sx * Math.cos(t) / d, -0.16 * Math.sin(t), 1.35 * Math.sin(t) * Math.cos(t) / d]; };
    const nor = t => { const p = at(t - 0.01), q = at(t + 0.01), dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    const bord = o => { const L = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * TAU, p = at(t), [tx, tz] = nor(t); L.push(V(p[0] - tz * o, p[1], p[2] + tx * o)); } return L; };
    // (vague 16 de l'audit : « le circuit tourne seul au milieu ») : au-dessus, tout le ciel est le cloud : des nuages de papier (chacun ses serveurs)
    // dérivent d'un bord à l'autre ; à chaque déploiement, une étincelle part du portique « déploie » vers l'un d'eux, qui s'allume et coche
    sousLaBarre();
    { const top = G.haut + 18, y1 = Math.max(top + 10, G.cy - k * 0.6), mw = Math.min(0.9, lx * 0.5) * k * 0.62 + k * 0.1, my = G.cy - k * 0.72, Wn = G.droite - G.gauche, Tq = 1.1, n = Math.floor(now / Tq), u = (now % Tq) / Tq, cible = Math.floor(bruit(n * 3.7) * 16), dep = V(...at(3.5));
      for (let j = 0; j < 16; j++) { const r = k * (0.07 + bruit(j * 2.9) * 0.06), x = G.gauche - r * 2 + ((bruit(j * 4.1) + now * 0.012 * (0.6 + bruit(j))) % 1) * (Wn + r * 4), y = lerp(top, y1, bruit(j * 6.3)), on = j === cible && u > 0.55 ? 1 - (u - 0.55) / 0.45 : 0, pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
        // (vague 167) un nuage ne disparaît plus d'un coup près de la planète ou du circuit, ni ne grisaille dans la bande estompée des bords :
        // il rapetisse en s'en approchant et regrossit après
        const bdN = Math.min(90, (G.droite + 16) * 0.1), sE = c01((x - G.gauche - bdN * 0.2) / bdN) * c01((G.droite - bdN * 0.2 - x) / bdN),
          sP = pc ? c01((Math.hypot(x - pc.x, y - pc.y) - pc.r * 1.3 - r) / (r * 2.5)) : 1, sC = c01(Math.max(Math.abs(x - G.cx) - mw - r * 1.5, Math.abs(y - my) - k * 0.2 - r) / (r * 2.5) + 0.0001);
        const r0 = r, fR = Math.min(sE, sP, sC); if (fR * r0 < 2) continue; { const r = r0 * fR;
        cerne(() => { ctx.beginPath(); ctx.arc(x - r * 0.9, y + r * 0.2, r * 0.6, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(x, y - r * 0.2, r * 0.85, Math.PI, 0); ctx.arc(x + r * 0.95, y + r * 0.2, r * 0.55, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); }, 0.7, 1, on > 0 ? '#ffe9a8' : PAP);
        ctx.fillStyle = ENC; for (let l = 0; l < 3; l++) { ctx.globalAlpha = 1; ctx.fillRect(x - r * 0.5 + l * r * 0.38, y + r * 0.05, r * 0.26, r * 0.4); }
        if (on > 0) { coche(x + r * 1.1, y - r * 0.9, r * 0.35, 1, 0.9); eclat(x, y, r * 1.2, 1 - on, 8, j); }
        if (j === cible && u < 0.55) { const e = sm(u / 0.55), sx = lerp(dep[0], x, e), sy = lerp(dep[1], y, e) - Math.sin(Math.PI * e) * k * 0.4; brille(sx, sy, 3, 1, true, now, j); } } } }
    ctx.restore();
    trait3(bord(0.08), 1, 1); trait3(bord(-0.08), 1, 1);
    const lab = en() ? ['build', 'test', 'deploy', 'monitor'] : ['build', 'test', 'déploie', 'surveille'], ST = [0.35, 1.25, 3.5, 4.4];
    // (vague 64 de l'audit, « DevOps », immersion) : la souris, c'est le trafic. Plus elle s'agite, plus la charge monte : le pouls du monitoring
    // s'emballe, et le circuit se met à l'échelle (des conteneurs en renfort s'intercalent, « autoscale ») ; quand elle se calme, tout redescend
    { const Sm = souris(), v = Sm && window.Chats.K.Wd.t - Sm.moved < 0.3 ? Math.hypot(Sm.vx || 0, Sm.vy || 0) : 0; CHG += (c01(v / 1600) - CHG) * (v / 1600 > CHG ? 0.2 : 0.02); }
    DEP.t = now;   // (vague 88 : l'autoscale et le déploiement sortent sur le vrai site, voir deploieUI())
    // (vague 129 de l'audit : « de très bien à inoubliable ») : le retour arrière. Toutes les dix secondes, une version fautive passe : le pouls
    // s'affole (« 500 »), tout le circuit recule d'un coup (« rollback », des flèches qui tournent à l'envers), la boîte fautive est éjectée
    // en tournoyant hors de la boucle, puis tout repart vers l'avant, plus vite, jusqu'à rattraper son retard ; le pouls se calme, une coche
    const tr = a % 10, alerte = tr > 4.6 && tr < 6, rb = 2.4 * sm(c01((tr - 5.2) / 1.3)) - 2.4 * sm(c01((tr - 6.6) / 3)), ejq = 2, ej = c01((tr - 5.3) / 1.6);
    const nC = 12 + Math.round(CHG * 12), conts = []; for (let q = 0; q < nC; q++) conts.push(((now * (0.5 + CHG * 0.4) + q / nC * TAU - rb) % TAU + TAU) % TAU);
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
      if (q === ejq && tr > 3.6 && tr < 9.6) { // la version fautive : noire, une croix ; éjectée pendant le retour arrière ; la version suivante, saine, reprend sa place
        if (ej > 0 && tr < 8) { const e = ej, o = c(0, 0, 0), P = [lerp(o[0], G.gauche - k * 0.4, e * e), lerp(o[1], o[1] - k * 0.5, Math.sin(Math.PI * Math.min(1, e * 1.2)) * 0.8) + e * e * k * 0.3], sb = k * 0.07 * (1 - e * 0.3);
          ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(-e * 12); cerne(() => { ctx.beginPath(); ctx.rect(-sb, -sb * 0.7, sb * 2, sb * 1.4); }, 0.9, 1, ENC); style(1.2, 1); ctx.strokeStyle = '#ff8a7a'; ctx.beginPath(); ctx.moveTo(-sb * 0.4, -sb * 0.4); ctx.lineTo(sb * 0.4, sb * 0.4); ctx.moveTo(sb * 0.4, -sb * 0.4); ctx.lineTo(-sb * 0.4, sb * 0.4); ctx.stroke(); ctx.restore();
          if (e < 0.5) mot(en() ? 'bad build' : 'version fautive', P[0], P[1] - sb * 1.6, Math.max(10, k * 0.055), 1); return; }
        if (tr < 5.3) { const h = c(0, 0, -0.05), sb = k * 0.035 * h[3]; prisme((u, v, d) => c(u, d, v), [[-0.08, 0], [0.08, 0], [0.08, -0.09], [-0.08, -0.09]], 0.1, prof(c(0, 0, 0)[2], 1), 0.6);
          ctx.globalAlpha = 1; ctx.fillStyle = ENC; ctx.beginPath(); ctx.arc(h[0], h[1], sb * 1.3, 0, TAU); ctx.fill(); style(1, 1); ctx.strokeStyle = '#ff8a7a'; ctx.beginPath(); ctx.moveTo(h[0] - sb * 0.6, h[1] - sb * 0.6); ctx.lineTo(h[0] + sb * 0.6, h[1] + sb * 0.6); ctx.moveTo(h[0] + sb * 0.6, h[1] - sb * 0.6); ctx.lineTo(h[0] - sb * 0.6, h[1] + sb * 0.6); ctx.stroke(); return; }
        if (tr < 8) return; }
      prisme((u, v, d) => c(u, d, v), [[-0.08, 0], [0.08, 0], [0.08, -0.09], [-0.08, -0.09]], 0.1, prof(c(0, 0, 0)[2], 1), 0.6);
      // (vague 154 de l'audit : « DevOps », design) : de vrais conteneurs maritimes : la tôle ondulée sur le flanc qu'on voit, les deux portes
      // au bout qui nous fait face (leur fente, les barres de verrouillage), un liseré en haut
      { const L = Math.hypot(c(0.08, 0, 0)[0] - c(-0.08, 0, 0)[0], c(0.08, 0, 0)[1] - c(-0.08, 0, 0)[1]);
        if (L > 16) { const sw = c(0, 0.05, -0.045)[2] > c(0, -0.05, -0.045)[2] ? 0.05 : -0.05, su = c(0.08, 0, -0.045)[2] > c(-0.08, 0, -0.045)[2] ? 0.08 : -0.08, seg2 = (A, B) => { ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); };
          ctx.globalAlpha = 1; ctx.strokeStyle = ENC; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.6, G.lw * 0.3); ctx.beginPath();
          for (let i = 1; i < 8; i++) { const u = -0.08 + i * 0.02; seg2(c(u, sw, -0.012), c(u, sw, -0.08)); }
          seg2(c(-0.075, sw, -0.084), c(0.075, sw, -0.084));
          seg2(c(su, 0, -0.008), c(su, 0, -0.084)); [-0.03, -0.012, 0.012, 0.03].forEach(w => seg2(c(su, w, -0.014), c(su, w, -0.08))); ctx.stroke();
          ctx.lineWidth = Math.max(0.7, G.lw * 0.45); ctx.beginPath(); [-1, 1].forEach(g => { const h = c(su, g * 0.006, -0.045); ctx.moveTo(h[0], h[1]); ctx.arc(h[0], h[1], Math.max(0.7, L * 0.012), 0, TAU); }); ctx.stroke(); } }
      if (q === 0) { const h = c(0, 0, -0.09), r = k * 0.05 * h[3]; chabot(h[0], h[1] - r * 1.7, r, { now, v: 1, lac: 0.5, bras: [1.3, 1.3] }); } });
    // le monitoring : un écran, son pouls qui défile
    // (vague 42, l'audit : « devops », finition) : l'étiquette ne sort jamais de l'écran, et un liseré d'encre la détache des portiques
    ST.forEach((t, i) => { const p = at(t), m = V(p[0], p[1] - 0.47, p[2]), px = Math.max(11, k * 0.08); ctx.font = `600 ${px}px "Space Grotesk",system-ui,sans-serif`;
      const w2 = ctx.measureText(lab[i]).width / 2 + 4, x = Math.max(G.gauche + w2, Math.min(G.droite - w2, m[0]));
      // (vague 154 : une étiquette ne se pose jamais sur la planète-chat : elle descend sous son anneau)
      { const Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat; if (Pc && Math.abs(x - Pc.x) < Pc.r * 1.3 + w2 && Math.abs(m[1] - Pc.y) < Pc.r * 1.3 + px) m[1] = Pc.y + Pc.r * 1.3 + px; }
      ctx.globalAlpha = 1; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, px * 0.32); ctx.strokeStyle = 'rgb(9,11,18)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(lab[i], x, m[1]);
      mot(lab[i], x, m[1], px, 1); });
    if (tr > 5.1 && tr < 6.7) { const e = Math.sin(Math.PI * c01((tr - 5.1) / 1.6)), L = 10, ofs = (tr - 5.1) * 0.9;   // les flèches du retour arrière, à rebours, tout autour de la boucle
      for (let j = 0; j < L; j++) { const t = ((j / L) * TAU - ofs + TAU * 4) % TAU, p = at(t), [tx, tz] = nor(t), Pa = V(p[0] - tz * 0.2, p[1] - 0.02, p[2] + tx * 0.2), Pb = V(p[0] - tz * 0.2 - tx * 0.09, p[1] - 0.02, p[2] + tx * 0.2 - tz * 0.09), d = Math.atan2(Pb[1] - Pa[1], Pb[0] - Pa[0]), r = Math.max(5, k * 0.07 * Pa[3]) * e;
        cerne(() => { ctx.beginPath(); ctx.moveTo(Pa[0] + Math.cos(d) * r, Pa[1] + Math.sin(d) * r); ctx.lineTo(Pa[0] + Math.cos(d + 2.4) * r, Pa[1] + Math.sin(d + 2.4) * r); ctx.lineTo(Pa[0] + Math.cos(d - 2.4) * r, Pa[1] + Math.sin(d - 2.4) * r); ctx.closePath(); }, 0.8, 1, '#fff4c8'); }
      const m = V(0, -0.05, 0); mot('⟲ rollback', m[0], m[1] + k * 0.22, Math.max(16, k * 0.1) * (0.6 + 0.4 * e), 1);
      if (!ROLL.vu && tr > 5.6 && window.Dex && Dex.vu) { ROLL.vu = true; Dex.vu('rollback'); } }
    const mw = Math.min(0.9, lx * 0.5) * k, mh = 0.2 * k, mc = [G.cx, G.cy - k * 0.72]; ecran(mc[0] - mw / 2, mc[1] - mh / 2, mw, mh, k * 0.06, 5);
    const M = []; for (let i = 0; i <= 70; i++) { const u = i / 70, t = u * (3.5 + CHG * 4) - now * (0.8 + CHG * 1.6), f = t - Math.floor(t), b = f > 0.4 && f < 0.5 ? Math.sin((f - 0.4) / 0.1 * TAU) * (0.35 + CHG * 0.1) * (alerte ? 2.2 : 1) : (alerte ? Math.sin(u * 60 + now * 30) * 0.12 : 0); M.push([mc[0] - mw * 0.45 + u * mw * 0.9, mc[1] - b * mh]); } trait(M, false, 0.8, 1);
    if (alerte) mot('500 !', mc[0] + mw * 0.36, mc[1] - mh * 0.15, Math.max(12, k * 0.08) * (1 + 0.15 * Math.sin(now * 20)), 1); else if (tr > 6.6 && tr < 8) coche(mc[0] + mw * 0.38, mc[1] - mh * 0.1, mh * 0.25, (tr - 6.6) / 0.4, 1);
    if (CHG > 0.25) mot((en() ? 'autoscale ×' : 'mise à l’échelle ×') + (nC / 12).toFixed(1).replace('.0', ''), mc[0], mc[1] + mh * 0.95, G.sw < 500 ? 9 : Math.max(11, k * 0.06), c01((CHG - 0.25) / 0.2));
  }
}))();

// sécurité & qualité : un dôme en 3D (méridiens, parallèles) posé sur les données (un cadenas) ; au sol, le radar balaie ;
// ce qui arrive du dehors frappe le dôme : une onde se propage à sa surface, la menace éclate ; le compteur des bloqués monte
const RX = { vu: false };
const CAD = { t: -9 };
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
    // (vague 155 de l'audit : « sécurité », design) : un vrai cadenas en volume, qui tourne avec la scène : le corps épais (bloc de papier),
    // l'anse en arceau (deux traits, l'avant et l'arrière du métal), la serrure et ses quatre rivets sur la face qui nous regarde ; il tressaute
    // un peu à chaque menace qui frappe le dôme (le claquement de l'anse)
    { const cl = Math.max(0, 1 - (now - (CAD.t || -9)) / 0.25) * 0.012, zf = V(0, -0.11, 0.065)[2] > V(0, -0.11, -0.065)[2] ? 0.065 : -0.065;
      const ans = dz => { const L = []; for (let i = 0; i <= 16; i++) { const t = i / 16 * Math.PI; L.push(V(Math.cos(t) * 0.095, -0.2 - cl - Math.sin(t) * 0.13, dz)); } return L; };
      [-zf * 0.4, zf * 0.4].sort((p, q) => V(0, -0.25, p)[2] - V(0, -0.25, q)[2]).forEach(dz => { const L = ans(dz); cerne(() => { ctx.beginPath(); L.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); }, 2.4, 1, null); });
      bloc(V, -0.145, 0.145, -0.02, -0.21, -0.065, 0.065, 1, 1);
      const P = (x, y) => V(x, y, zf), h = P(0, -0.135), u = Math.hypot(P(0.1, -0.1)[0] - P(-0.1, -0.1)[0], P(0, -0.2)[1] - P(0, -0.1)[1]) / 0.2 * 0.012;
      ctx.globalAlpha = 1; ctx.fillStyle = ENC; ctx.beginPath(); ctx.arc(h[0], h[1], u * 2.2, 0, TAU); ctx.fill(); const b0 = P(-0.007, -0.135), b1 = P(0.007, -0.085); ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(P(0.007, -0.135)[0], P(0.007, -0.135)[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(P(-0.007, -0.085)[0], P(-0.007, -0.085)[1]); ctx.closePath(); ctx.fill();
      [[-0.12, -0.04], [0.12, -0.04], [-0.12, -0.19], [0.12, -0.19]].forEach(([x, y]) => { const q = P(x, y); ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1, u * 0.7), 0, TAU); ctx.fill(); });
      ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.6, G.lw * 0.35); ctx.beginPath(); const e0 = P(-0.13, -0.17), e1 = P(0.13, -0.17); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.stroke(); }
    { const g = V(0.4, 0, 0.25), r = k * 0.075 * g[3]; chabot(g[0], g[1] - r * 1.75, r, { now, v: 2, lac: Math.sin(now * 0.6) * 0.9, travaille: true, bras: [0.9 + Math.sin(now * 4) * 0.3, -0.3] }); }
    // les menaces (vague 15 de l'audit : « quelques cailloux près du dôme ») : une pluie qui vient de tout le ciel, de loin, par dizaines
    const T = 2.4, NQ = G.cx * 2 < 700 ? 9 : 14; let bloq = 0;
    // (vague 36 de l'audit : « sécurité, peu original ») : les menaces repoussées ne repartent plus dans le vide : elles filent dans un bocal
    // de quarantaine posé à côté du dôme, où elles s'entassent et s'agitent ; un chat-robot au filet à papillons fait le guet devant
    const o0 = V(0, 0, 0), J = [o0[0] - Math.min(k * 1.4, G.cx * 0.72), o0[1] + k * 0.02], jr = Math.max(14, k * 0.17), jm = [J[0], J[1] - jr * 2.1];
    // (vague 148, finition : au bureau, les menaces qui arrivent de loin et celles qui rebondissent passaient sous la barre du haut)
    sousLaBarre();
    for (let q = 0; q < NQ; q++) { const tt = a + q * T / NQ, t = tt % T, n = Math.floor(tt / T), th = bruit(q * 7 + n * 13) * TAU, ph = 0.2 + bruit(q * 3 + n * 5) * 1.1, dir = [Math.cos(th) * Math.cos(ph), -Math.sin(ph), Math.sin(th) * Math.cos(ph)];
      bloq += n; const pt = d => V(dir[0] * d, dir[1] * d, dir[2] * d);
      if (t < 1.2) { const d = lerp(4.2, R, sm(t / 1.2) * 0.4 + t / 1.2 * 0.6), p = pt(d), p0 = pt(d + 0.3); trait([p0, p], false, 0.9, 0.9); caillou(p[0], p[1], k * 0.08 * p[3], Math.sin(now * 3 + q) * 0.3, q * 7 + n, 1, true); }
      else if (t < 2.2) { const u = (t - 1.2) / 1, p = pt(R); if (u < 0.05) CAD.t = now; eclat(p[0], p[1], 12, u, 7, th);
        // (vague 7) repoussé : le petit méchant rebondit sur le dôme et repart en tournoyant, sonné
        if (u < 0.8) { const b0 = pt(R), e = sm(u / 0.8), r0 = k * 0.08 * b0[3] * (1 - e * 0.55), bx = lerp(b0[0], jm[0], e), by = lerp(b0[1], jm[1], e) - Math.sin(e * Math.PI) * k * 0.45;
          caillou(bx, by, r0, u * 9, q * 7 + n, 1, true); if (u < 0.35) mot(pick2(['paf', 'bonk', 'toc'], q + n), b0[0], b0[1] - r0 * 2.2, Math.max(10, k * 0.06) * Math.max(0.05, 1 - u * 2.5), 1); }   // (vague 148 : le mot rapetisse, il ne s'estompe plus)
        // l'onde, à la surface du dôme
        const up = Math.abs(dir[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0], cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nz = v => { const l = Math.hypot(...v); return v.map(x => x / l); }, e1 = nz(cr(dir, up)), e2 = cr(dir, e1), rho = 0.06 + u * 0.55, L = [];
        for (let i = 0; i <= 28; i++) { const w = i / 28 * TAU, v = dir.map((x, j) => x * Math.cos(rho) + (e1[j] * Math.cos(w) + e2[j] * Math.sin(w)) * Math.sin(rho)); if (v[1] > 0.02) { if (L.length > 1) trait(L, false, 1.3 * (1 - u) + 0.05, 0.9); L.length = 0; continue; } L.push(V(v[0] * R, v[1] * R, v[2] * R)); }
        // (vague 168) l'onde s'amincit en s'élargissant, à pleine encre, au lieu de s'estomper
        if (L.length > 1) trait(L, false, 1.3 * (1 - u) + 0.05, 0.9); } }
    ctx.restore();
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
    // (vague 130 de l'audit : « on scanne » ne se voyait pas) : le cheval de Troie. Toutes les huit secondes, un joli paquet-cadeau flotte vers
    // le dôme ; une bande de scanner le traverse de haut en bas et, sous elle, on voit au travers : un petit méchant caché dedans. Alarme,
    // le paquet éclate en papiers, et le méchant file rejoindre les autres dans le bocal de quarantaine
    // (vague 148, finition : au téléphone, le paquet et son « scan… » se posaient sous la flèche du bord droit, à moitié hors de l'écran)
    { const ti = a % 8, bs = Math.max(20, k * 0.12), X1 = Math.min(G.droite - bs * 1.6 - 30, o0[0] + R * k * 1.15), Y1 = o0[1] - k * (G.cx * 2 < 700 ? 0.42 : 0.1), X0 = G.droite + bs * 2, Y0 = Y1 - k * 0.3;
      if (ti < 3.4) { const e = sm(c01(ti / 1.6)), x = lerp(X0, X1, e), y = lerp(Y0, Y1, e) + Math.sin(now * 2.2) * bs * 0.12, tr = ti > 2.9 ? Math.sin(now * 60) * bs * 0.08 : 0, sc = c01((ti - 1.7) / 1.1);
        ctx.save(); ctx.translate(x + tr, y); ctx.rotate(Math.sin(now * 1.3) * 0.08);
        // le paquet : opaque, ruban et nœud ; la partie déjà scannée devient transparente et laisse voir le méchant
        const yb = -bs + sc * bs * 2;
        if (sc < 1) { ctx.save(); ctx.beginPath(); ctx.rect(-bs * 2, yb, bs * 4, bs * 3); ctx.clip(); cerne(() => { ctx.beginPath(); ctx.rect(-bs, -bs, 2 * bs, 2 * bs); }, 0.9, 1, '#ffe9a8');
          ctx.globalAlpha = 1; ctx.fillStyle = '#e8735f'; ctx.fillRect(-bs * 0.16, -bs, bs * 0.32, 2 * bs); ctx.fillRect(-bs, -bs * 0.16, 2 * bs, bs * 0.32); ctx.restore(); }
        if (sc > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-bs * 2, -bs * 2, bs * 4, yb + bs * 2); ctx.clip();
          ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(150,200,255,0.18)'; ctx.fillRect(-bs, -bs, 2 * bs, 2 * bs); ctx.setLineDash([4, 3]); style(0.7, 1); ctx.strokeStyle = '#bfe3ff'; ctx.strokeRect(-bs, -bs, 2 * bs, 2 * bs); ctx.setLineDash([]);
          caillou(0, bs * 0.15, bs * 0.55, now * 3, 77, 1, true); ctx.restore(); }
        cerne(() => { ctx.beginPath(); ctx.ellipse(-bs * 0.3, -bs * 1.18, bs * 0.32, bs * 0.18, -0.5, 0, TAU); ctx.moveTo(bs * 0.62, -bs * 1.18); ctx.ellipse(bs * 0.3, -bs * 1.18, bs * 0.32, bs * 0.18, 0.5, 0, TAU); }, 0.7, 1, '#e8735f');
        if (sc > 0 && sc < 1) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(191,227,255,0.55)'; ctx.fillRect(-bs * 1.5, yb - 2, bs * 3, 4); style(1, 1); ctx.strokeStyle = '#bfe3ff'; ctx.beginPath(); ctx.moveTo(-bs * 1.5, yb); ctx.lineTo(bs * 1.5, yb); ctx.stroke(); }
        ctx.restore();
        // le rayon du scanner part du dôme
        if (sc > 0 && sc < 1) { const D = [o0[0] + R * k * 0.7, o0[1] - k * 0.3]; ctx.globalAlpha = 0.16; ctx.fillStyle = '#bfe3ff'; ctx.beginPath(); ctx.moveTo(D[0], D[1]); ctx.lineTo(x - bs * 1.5, y + yb); ctx.lineTo(x + bs * 1.5, y + yb); ctx.closePath(); ctx.fill(); mot(en() ? 'scanning…' : 'scan…', x, y - bs * 1.9, Math.max(11, k * 0.06), 1); }
        if (ti > 2.9) mot(en() ? '⚠ Trojan horse' : '⚠ cheval de Troie', Math.min(x, G.droite - k * 0.5), y - bs * 1.9, Math.max(12, k * 0.07) * (1 + 0.12 * Math.sin(now * 18)), 1); }
      else if (ti < 4.8) { const u = (ti - 3.4) / 1.4, e = sm(u);
        for (let f = 0; f < 6; f++) { const an = f / 6 * TAU + 0.4, d = bs * (0.6 + u * 3.2), fx = X1 + Math.cos(an) * d, fy = Y1 + Math.sin(an) * d + u * u * bs * 2.5, fr = bs * 0.45 * (1 - u * 0.7);
          ctx.save(); ctx.translate(fx, fy); ctx.rotate(u * 7 + f); cerne(() => { ctx.beginPath(); ctx.rect(-fr, -fr * 0.7, fr * 2, fr * 1.4); }, 0.7, 1, f % 2 ? '#ffe9a8' : '#e8735f'); ctx.restore(); }
        const mx = lerp(X1, jm[0], e), my = lerp(Y1, jm[1], e) - Math.sin(Math.PI * e) * k * 0.5; caillou(mx, my, bs * 0.55 * (1 - e * 0.45), u * 10, 77, 1, true);
        if (u < 0.4) mot(en() ? 'crack!' : 'crac !', X1, Y1 - bs * 1.6, Math.max(12, k * 0.07), 1);
        if (!RX.vu && window.Dex && Dex.vu) { RX.vu = true; Dex.vu('rayons-x'); } } }
    // le compteur, en haut du dôme, sur un petit écran de papier (il était caché sous les sous-titres)
    { const o = V(0, 0, 0), w = Math.max(k * 0.52, 108), h = Math.max(k * 0.14, 28), m = [Math.min(o[0] + R * k * 1.2, G.cx * 2 - w * 0.62 - 10), o[1] - R * k * (G.cx * 2 < 700 ? 1.25 : 0.8)]; ecran(m[0] - w / 2, m[1] - h / 2, w, h, k * 0.03, 3); mot(`${en() ? 'blocked' : 'bloqués'} : ${Math.max(0, bloq)}`, m[0], m[1], Math.max(12, k * 0.075), 1); }
    ctx.restore();
    ATK.t = now;   // (vague 88 : les méchants attaquent aussi le vrai site, voir attaques())
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
const SAUT = { vu: false };
const TRAPPE = { vu: false };
S.pilotage = (() => {
  const E = { t: null, bx: 0, lane: 0, obs: [], next: 0, jal: 0, bonk: -9, mots: [], roul: 0, n: 0 };
  const ptr = () => { const W = window.Chats && Chats.K && Chats.K.Wd, P = W && W.ptr; return P && P.on && W.t - P.moved < 2.5 ? P : null; };
  const SORTES = ['bug', 'roc', 'cone', 'bug', 'horloge', 'roc', 'etoile', 'etoile'];
  return {
    cles: () => [[0, -0.55], [-1, 0.8], [1, 0.8], [0, 0.45]],
    dessin(a, now) {
      const dt = E.t == null ? 0 : Math.min(0.05, Math.max(0, now - E.t)); E.t = now; if (a < 0.1) { E.obs = []; E.jal = 0; E.n = 0; }
      // (le bus se pose juste au-dessus des sous-titres ; la caméra est un peu à gauche : on voit son flanc)
      const hz = G.haut + (G.caps - G.haut) * 0.2, zb = 2.5, hc = 1.35, f = (G.caps - 8 - hz) * zb / hc, D = G.caps - hz, V = 9.5, tel = G.sw < 500, camX0 = G.sw < 300 ? -0.75 : -1.5, cx = G.cx + camX0 * f / zb * (tel ? 0.95 : 0.8);
      // (vague 149 de l'audit : « le bus ») : la caméra suit le bus d'une voie à l'autre (au téléphone surtout : il ne sort plus par le bord gauche)
      const camX = camX0 + E.bx * (tel ? 0.75 : 0.25);
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
      // (vague 149 de l'audit : « le bus ») : portiques et lampadaires ne passent plus sur la planète-chat ni sous la barre du haut
      const horsPlanete = () => { sousLaBarre(); ctx.beginPath(); ctx.rect(G.gauche - 60, G.haut + 4, G.droite - G.gauche + 120, G.caps - G.haut - 4); ctx.clip(); };
      horsPlanete();
      for (let j = 13; j >= 0; j--) { const z = 1.7 + j * 3.2 - (E.roul * 1.6) % 3.2, sd = j % 2 ? 1 : -1; if (z < 1.6 || z > 40) continue;
        const b = Pp(sd * 2.5, 0, z), h = Pp(sd * 2.5, 1.5, z), bras = Pp(sd * 2.05, 1.5, z), r = Math.max(2, (b[1] - h[1]) * 0.16), al = c01(9 / z);
        cerne(() => { ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(h[0], h[1]); ctx.lineTo(bras[0], bras[1]); }, Math.max(0.35, 0.9 * al), 1, null);
        if (r > 3) { cerne(() => { ctx.beginPath(); ctx.arc(bras[0], bras[1] + r, r, 0, TAU); ctx.moveTo(bras[0] - r * 0.9, bras[1] + r * 0.6); ctx.lineTo(bras[0] - r * 0.7, bras[1] - r * 0.3); ctx.lineTo(bras[0] - r * 0.2, bras[1] + r * 0.1); ctx.moveTo(bras[0] + r * 0.9, bras[1] + r * 0.6); ctx.lineTo(bras[0] + r * 0.7, bras[1] - r * 0.3); ctx.lineTo(bras[0] + r * 0.2, bras[1] + r * 0.1); }, 0.7, 1);
          [-1, 1].forEach(g => { ctx.globalAlpha = 1; ctx.fillStyle = z < 12 ? '#ffe9a8' : ENC; ctx.beginPath(); ctx.ellipse(bras[0] + g * r * 0.35, bras[1] + r * 1.05, r * 0.16, r * 0.24, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = ENC; ctx.lineWidth = 1; ctx.stroke(); }); }
        else rond(bras[0], bras[1], 1.5, 0.5, al, true); }
      ctx.restore();
      // (vague 131 de l'audit : « de très bien à inoubliable ») : le grand saut. Toutes les quinze secondes, la route s'ouvre sur un trou dans le
      // planning, annoncé par un panneau ; un tremplin rayé le précède : le bus y monte, décolle avec toute l'équipe (« tous ensemble ! »),
      // survole le vide plein d'étoiles, son ombre glisse en dessous, et retombe de l'autre côté en rebondissant
      const perS = 15, nS = Math.floor(a / perS), zr = 46 - (a - nS * perS) * V, sS = (zb + 0.6 - zr) / (V * 0.75), hS = clamp((Pp(0, 2.2, zb)[1] - G.haut - 8) / (f / zb), 0.15, G.sw < 500 ? 0.5 : 0.6), saut = sS > 0 && sS < 1 ? 4 * hS * sS * (1 - sS) : 0, atterrit = sS >= 1 && sS < 1.35 ? Math.sin((sS - 1) / 0.35 * Math.PI) * 0.12 : 0;
      if (zr > -3 && zr < 46) { ctx.save(); ctx.beginPath(); ctx.rect(G.gauche - 60, hz - 2, G.droite - G.gauche + 120, G.caps + 2 - hz); ctx.clip();
        const g0 = Math.max(1.05, zr + 0.1), g1 = zr + 2.1, al = c01((46 - zr) / 5);
        if (g1 > 1.05) { const Q = [Pp(-1.6, 0, g0), Pp(1.6, 0, g0), Pp(1.6, 0, g1), Pp(-1.6, 0, g1)];
          cerne(() => { ctx.beginPath(); ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i <= 8; i++) { const p = Pp(-1.6 + i * 0.4, 0, g0 + (i % 2 ? 0.12 : 0)); ctx.lineTo(p[0], p[1]); } ctx.lineTo(Q[2][0], Q[2][1]); for (let i = 7; i >= 0; i--) { const p = Pp(-1.6 + i * 0.4, 0, g1 - (i % 2 ? 0.12 : 0)); ctx.lineTo(p[0], p[1]); } ctx.closePath(); }, 1, al, NUIT);
          for (let j = 0; j < 10; j++) { const u = bruit(j * 3.7 + nS), v = fr2(bruit(j * 1.3) + now * 0.6), p = Pp(-1.4 + u * 2.8, -v * 0.8, lerp(g0, g1, bruit(j * 8.1))); if (p[1] < G.caps) brille(p[0], p[1], 1.6, al * (1 - v), false, now, j); } }
        // le tremplin, rayé comme un chantier
        const r0 = Math.max(1.05, zr - 0.9), r1 = zr; if (r1 > 1.05) { const A0 = Pp(-1.55, 0, r0), B0 = Pp(1.55, 0, r0), A1 = Pp(-1.55, 0.38, r1), B1 = Pp(1.55, 0.38, r1);
          cerne(() => { ctx.beginPath(); ctx.moveTo(A0[0], A0[1]); ctx.lineTo(B0[0], B0[1]); ctx.lineTo(B1[0], B1[1]); ctx.lineTo(A1[0], A1[1]); ctx.closePath(); }, 1, al, '#ffe9a8');
          ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(1, (A0[1] - A1[1]) * 0.12); for (let i = 0; i < 7; i++) { const x = -1.4 + i * 0.47, p = Pp(x, 0, r0), q = Pp(x + 0.25, 0.38, r1); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); } ctx.restore(); }
        ctx.restore();
        // le panneau, sur deux poteaux, avant le tremplin
        const zp = zr - 3; if (zp > 1.4 && zp < 44) { const a0 = Pp(-1.9, 0, zp), a1 = Pp(-1.9, 1.7, zp), b0 = Pp(1.9, 0, zp), b1 = Pp(1.9, 1.7, zp), pa = Pp(-1.75, 2.05, zp), pb = Pp(1.75, 1.45, zp), hh = pb[1] - pa[1];
          cerne(() => { ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); }, Math.max(0.4, c01(8 / zp)), al, null);
          cerne(() => { ctx.beginPath(); ctx.rect(pa[0], pa[1], pb[0] - pa[0], hh); }, 0.9, al, '#ffe9a8');
          if (hh > 6) { ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = ENC; const t = en() ? '⚠ gap in the plan' : '⚠ trou dans le planning'; let fp = Math.round(hh * 0.5); ctx.font = `700 ${fp}px "Space Grotesk",system-ui,sans-serif`; const mw = (pb[0] - pa[0]) * 0.88, tw = ctx.measureText(t).width; if (tw > mw) { fp = Math.floor(fp * mw / tw); ctx.font = `700 ${fp}px "Space Grotesk",system-ui,sans-serif`; } ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, (pa[0] + pb[0]) / 2, pa[1] + hh / 2); ctx.restore(); } } }
      // les obstacles : ils viennent de l'horizon, sur une des trois voies (pas autour du trou)
      if (now > E.next && !(zr > 41 && zr < 50)) { E.next = now + 0.75 + bruit(E.n * 3.3) * 0.7; const sorte = SORTES[Math.floor(bruit(E.n * 7.1) * SORTES.length)], l = Math.floor(bruit(E.n * 1.9) * 3) - 1; E.obs.push({ x: l * 1.06, z: 46, sorte, ph: bruit(E.n) * TAU, n: E.n++ }); }
      E.obs.forEach(o => { o.z -= V * dt; });
      // la conduite : le pilote automatique regarde loin devant et prend la voie la plus libre ; la souris sur le ciel : c'est vous
      const P = ptr(), libre = l => Math.min(99, ...E.obs.filter(o => o.sorte !== 'etoile' && !o.fini && Math.abs(o.x - l * 1.06) < 0.5 && o.z > zb - 0.5).map(o => o.z - zb));
      const etoile = l => E.obs.some(o => o.sorte === 'etoile' && !o.fini && Math.abs(o.x - l * 1.06) < 0.5 && o.z > zb && o.z < zb + 9);
      if (P) E.lane = clamp(((P.x - cx) / (f / zb) + camX) / 1.06, -1.2, 1.2);
      else { const sc = l => Math.min(libre(l), 16) + (etoile(l) ? 3 : 0) - Math.abs(l - E.lane) * 0.6; E.lane = [-1, 0, 1].reduce((b, l) => sc(l) > sc(b) + 0.4 ? l : b, Math.round(clamp(E.lane, -1, 1))); }
      const vis = E.lane * 1.06, vbx = clamp(vis - E.bx, -dt * 3.2, dt * 3.2); E.bx += vbx; const roulis = -vbx / Math.max(dt, 1e-3) / 3.2 * 0.06;
      // les chocs et les jalons
      E.obs.forEach(o => { if (o.fini || o.z > zb + 2.4 || o.z < zb || saut > 0.3) return; if (Math.abs(o.x - E.bx) > 0.72) return; o.fini = now;
        if (o.sorte === 'etoile') { E.jal++; E.etoileT = now; E.mots.push({ t: '+1', x: o.x, z: zb + 1, t0: now }); gagneEtoile(Pp(o.x, 0.6, zb + 1), now); } else { E.bonk = now; E.mots.push({ t: pick2(['bonk', 'boum', 'ouille'], o.n), x: o.x, z: zb + 1, t0: now }); secoueUI(o.x - E.bx); } });
      E.obs = E.obs.filter(o => o.z > 0.8 && !(o.fini && now - o.fini > 0.5));
      // dessin, du fond vers nous
      // (vague 27, l'audit : « le bus ») : des portiques d'autoroute enjambent la route, un panneau par étape de la feuille de route
      // (les mots du sous-titre) ; ils arrivent de l'horizon et passent au-dessus du bus
      const PQ = en() ? ['Tech lead', 'Management', 'Mentoring', 'Augmented dev', 'Agile', 'ADR', 'Pre-sales'] : ['Tech lead', 'Management', 'Mentorat', 'Dév. augmenté', 'Agile', 'ADR', 'Avant-vente'];
      const portique = () => { const per = 4.6, n = Math.floor(now / per), z = 44 - (now / per - n) * per * V; if (z < 1.2 || z > 44) return null; return { z, txt: PQ[n % PQ.length] }; }, pq = portique();
      const dessinePortique = ({ z, txt }) => { horsPlanete();
        const al = c01((44 - z) / 5), H2 = 2.3, g0 = Pp(-2.3, 0, z), g1 = Pp(-2.3, H2, z), d0 = Pp(2.3, 0, z), d1 = Pp(2.3, H2, z), pa = Pp(-1.35, H2 + 0.1, z), pb = Pp(1.35, H2 - 0.6, z);
        cerne(() => { ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(d1[0], d1[1]); ctx.lineTo(d0[0], d0[1]); }, Math.max(0.4, 1.1 * c01(8 / z)), al, null);
        cerne(() => { ctx.beginPath(); ctx.rect(pa[0], pa[1], pb[0] - pa[0], pb[1] - pa[1]); }, 0.9, al);
        const hh = pb[1] - pa[1]; if (hh > 6) { ctx.strokeStyle = ENC; ctx.lineWidth = Math.max(0.5, G.lw * 0.35); ctx.strokeRect(pa[0] + hh * 0.08, pa[1] + hh * 0.08, pb[0] - pa[0] - hh * 0.16, hh * 0.84);
          ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = ENC; let fp = Math.round(hh * 0.42); ctx.font = `700 ${fp}px "Space Grotesk",system-ui,sans-serif`; const mw = (pb[0] - pa[0]) * 0.86, tw = ctx.measureText(txt).width; if (tw > mw) { fp = Math.floor(fp * mw / tw); ctx.font = `700 ${fp}px "Space Grotesk",system-ui,sans-serif`; } ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + hh * 0.03); ctx.restore(); }
        ctx.restore(); };
      if (pq && pq.z > zb + 0.5) dessinePortique(pq);
      E.obs.filter(o => o.z > zb + 1).sort((p, q) => q.z - p.z).forEach(o => obstacle(o, Pp, now, D));
      if (saut > 0) { const o = Pp(E.bx, 0, zb + 0.4), o2 = Pp(E.bx + 0.75, 0, zb + 0.4), rw = Math.abs(o2[0] - o[0]) * (1 - saut * 0.35); ctx.globalAlpha = 0.45; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(o[0], o[1], rw, rw * 0.18, 0, 0, TAU); ctx.fill(); }
      bus(saut || atterrit ? (x, y, z) => Pp(x, y + saut + atterrit, z) : Pp, E.bx, zb, roulis + (saut ? (0.5 - sS) * 0.25 : 0), now, E.bonk, a, camX);
      if (saut > 0) { const p = Pp(E.bx + (E.bx > 0 ? -1.5 : 1.5), 1.1 + saut, zb + 1); mot(sS < 0.5 ? (en() ? 'all together!' : 'tous ensemble !') : (en() ? 'wheee!' : 'youhou !'), clamp(p[0], G.gauche + 70, G.droite - 70), Math.max(G.haut + 60, p[1]), Math.max(14, D * 0.075), 1);
        if (sS > 0.4 && !SAUT.vu && window.Dex && Dex.vu) { SAUT.vu = true; Dex.vu('grand-saut'); } }
      if (atterrit > 0.05) { const p = Pp(E.bx, 0.2, zb + 0.2); mot(en() ? 'ba-boom' : 'badaboum', p[0] + 30, p[1], Math.max(12, D * 0.06), 1); }
      // (vague 31, l'audit : « le bus ») : le pot d'échappement crache des petits nuages de papier, ronds, qui gonflent, montent et restent
      // sur la route derrière (ils défilent vers nous) ; au choc, un gros nuage noirâtre et un « pouêt »
      { const kb = G.sw < 500 ? 0.72 : 1, cote = E.bx - camX > 0 ? -1 : 1;
        for (let j = 0; j < 7; j++) { const t = fr2(now * 1.6 + j / 7), x = E.bx + (-cote * 0.3 + (bruit(j * 3.1 + Math.floor(now * 1.6 + j / 7)) - 0.5) * 0.3) * kb, y = (0.12 + t * 0.9) * kb, z = zb - 0.1 - t * 1.6, p = Pp(x, y, z), r = (4 + t * 16) * p[2] ** -0.4 * (G.sw < 500 ? 0.7 : 1) * (now - E.bonk < 0.8 ? 1.8 : 1);
          if (z < 0.4 || p[1] > G.caps) continue; cerne(() => { ctx.beginPath(); for (let q = 0; q < 4; q++) { const aq = q / 4 * TAU + j; ctx.moveTo(p[0] + Math.cos(aq) * r * 0.55 + r * 0.45, p[1] + Math.sin(aq) * r * 0.4); ctx.arc(p[0] + Math.cos(aq) * r * 0.55, p[1] + Math.sin(aq) * r * 0.4, r * 0.45, 0, TAU); } }, 0.6, 1 - t * 0.6); }
        if (now - E.bonk < 0.6) { const p = Pp(E.bx, 1.5 * kb, zb + 1.2); const kp = (now - E.bonk) / 0.6; mot(en() ? 'honk!' : 'pouêt !', p[0], p[1] - 10, Math.max(13, D * 0.06) * (1 + 0.3 * Math.sin(Math.min(1, kp * 4) * Math.PI)) * Math.max(0.05, 1 - kp * kp), 1); } }
      if (pq && pq.z <= zb + 0.5) dessinePortique(pq);
      E.obs.filter(o => o.z <= zb + 1).sort((p, q) => q.z - p.z).forEach(o => obstacle(o, Pp, now, D));
      E.mots = E.mots.filter(m => now - m.t0 < 0.9); E.mots.forEach(m => { const u = (now - m.t0) / 0.9, p = Pp(m.x, 1.3 + u * 0.6, m.z); mot(m.t, p[0], Math.max(G.haut + 24, p[1]), Math.max(14, D * 0.08) * (1 + 0.4 * Math.sin(Math.min(1, u * 4) * Math.PI)) * Math.max(0.05, 1 - u * u * u), 1); });   // (vague 149 : le mot bondit puis rapetisse, sans fondu)
      // le compteur des jalons ; la consigne (la souris prend le volant)
      // (vague 169) hors de la bande estompée du bord (au bureau, le compteur y grisaillait)
      const bdJ = Math.min(90, (G.droite + 16) * 0.1) + 6, t0 = [Math.max(G.gauche + 24, bdJ), G.haut + 18], ue = now - (E.etoileT ?? -9), pop = ue < 0.6 ? Math.sin(ue / 0.6 * Math.PI) * (1 - ue / 0.6 * 0.5) : 0;
      // (vague 149 : le compteur bondit à chaque jalon, son étoile s'allume puis se rétracte)
      { const px = Math.max(12, D * 0.055) * (1 + 0.45 * pop), lb = `${en() ? 'milestones' : 'jalons'} ★ `; mot(lb, t0[0], t0[1], px, 1, 'left'); ctx.font = `600 ${px}px "Space Grotesk",system-ui,sans-serif`; const xw = t0[0] + ctx.measureText(lb).width;
        mot(String(E.jal), xw, t0[1], px, 1, 'left'); if (pop > 0.02) brille(xw - px * 0.62, t0[1], px * 0.9 * pop, 1, true, now, E.jal); }
      mot(P ? (en() ? 'you drive' : 'c’est vous qui conduisez') : (en() ? 'mouse: take the wheel' : 'la souris : prenez le volant'), t0[0], t0[1] + Math.max(16, D * 0.075), Math.max(10, D * 0.042), 0.9, 'left');
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
    // (vague 135 de l'audit : « le bus », de très bien à inoubliable) : la trappe du toit. Chaque jalon attrapé : la trappe à l’arrière du toit (près de nous)
    // s'ouvre d'un coup, un chat-robot de l'équipe en jaillit, bras levés, et agite un fanion « ★ n » au vent de la route, puis redescend et referme
    { const ut = window.__trappe ?? (now - (E.etoileT ?? -9)), z0 = 0.02, z1 = 0.27, hw = 0.24, ouv = sm(c01(ut / 0.18)) * (1 - sm(c01((ut - 1.75) / 0.25)));
      const H4 = [Q(-hw, h, z0), Q(hw, h, z0), Q(hw, h, z1), Q(-hw, h, z1)]; ctx.globalAlpha = 1; ctx.fillStyle = ouv > 0.05 ? NUIT : PAP; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.7; ctx.beginPath(); H4.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
      // le couvercle, ouvert à la verticale sur sa charnière avant (derrière lui)
      if (ouv > 0.01) { const L4 = [Q(-hw, h, z1), Q(hw, h, z1), Q(hw, h + (z1 - z0) * ouv * 1.4, z1 + 0.05 * ouv), Q(-hw, h + (z1 - z0) * ouv * 1.4, z1 + 0.05 * ouv)]; ctx.fillStyle = PAP; ctx.beginPath(); L4.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (ouv > 0.01 && ut < 2) { const sor = sm(c01((ut - 0.08) / 0.3)) * (1 - sm(c01((ut - 1.5) / 0.3))), pr = Q(0, h, (z0 + z1) / 2), r0 = Math.min(Math.abs(Q(0, h + 0.2, (z0 + z1) / 2)[1] - pr[1]) * 1.1, (pr[1] - G.haut - 8) / 4.4),
          lev = Math.min(r0 * 1.9 * sor, Math.max(0, pr[1] - r0 * 2.4 - G.haut - 6)), m = [pr[0], pr[1] - lev];   // (r0 : assez petit pour sortir en entier sous la barre du haut)
        // il sort par la trappe : on ne voit que ce qui dépasse du toit
        ctx.save(); ctx.beginPath(); ctx.rect(m[0] - r0 * 4, G.haut, r0 * 8, pr[1] - G.haut); ctx.clip();
        chabot(m[0], m[1] + r0 * 0.4, r0, { now, ph: 21, lac: Math.sin(now * 4) * 0.4, casque: false, bras: [1.4 + Math.sin(now * 12) * 0.2, 0.9], cligne: false });
        const hx = m[0] + r0 * 0.75, hy = m[1] - r0 * 0.1, ty = hy - r0 * 1.6; cerne(() => { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, ty); }, 0.6, 1, null);
        const fl = Math.sin(now * 16) * r0 * 0.12; cerne(() => { ctx.beginPath(); ctx.moveTo(hx, ty); ctx.quadraticCurveTo(hx + r0 * 0.6, ty + fl, hx + r0 * 1.25, ty + r0 * 0.3 - fl); ctx.lineTo(hx, ty + r0 * 0.7); ctx.closePath(); }, 0.6, 1, '#ffe9a8');
        ctx.restore(); mot('★ ' + Math.max(1, E.jal), hx + r0 * 0.5, ty + r0 * 0.33, Math.max(9, r0 * 0.42), 1);
        if (sor > 0.9 && !TRAPPE.vu && window.Dex && Dex.vu) { TRAPPE.vu = true; Dex.vu('trappe-toit'); } } }
    const B = [Q(-w, 0.12, 0), Q(w, 0.12, 0), Q(w, h, 0), Q(-w, h, 0)]; cerne(() => { ctx.beginPath(); B.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }, 1, 1);
    const Wv = [Q(-w * 0.8, 0.5, 0), Q(w * 0.8, 0.5, 0), Q(w * 0.8, 0.86, 0), Q(-w * 0.8, 0.86, 0)]; ctx.globalAlpha = 1; ctx.fillStyle = NUIT; ctx.beginPath(); Wv.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ENC; ctx.lineWidth = G.lw; ctx.stroke();
    // de dos, par la vitre : l'équipe (des têtes rondes, des oreilles de chat), et lui au volant, plus loin (ses épis)
    // (vague 150 de l'audit : « le bus ») : les têtes sortent en entier au lieu de deux oreilles au ras du cadre ; tour à tour,
    // l'un d'eux se retourne et nous regarde (les grands yeux noirs des chats) ; un reflet barre la vitre
    const vw = Wv[1][0] - Wv[0][0], vy = Wv[0][1], vh = vy - Wv[3][1];
    ctx.save(); ctx.beginPath(); Wv.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
    { const xl = Wv[0][0] + vw * 0.66, yl = vy - vh * 0.5 + Math.sin(now * 3) * 1, rl = vw * 0.065;
      cerne(() => { ctx.beginPath(); ctx.ellipse(xl, vy - vh * 0.08, rl * 2.2, rl * 0.55, 0, 0, TAU); }, 0.6, 1, null);
      cerne(() => { ctx.beginPath(); ctx.arc(xl, yl, rl, 0, TAU); }, 0.7, 1);
      ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.6; ctx.beginPath(); [-0.7, -0.25, 0.2, 0.65].forEach(d => { const b = -Math.PI / 2 + d; ctx.moveTo(xl + Math.cos(b) * rl * 0.9, yl + Math.sin(b) * rl * 0.9); ctx.lineTo(xl + Math.cos(b + 0.15) * rl * 1.55, yl + Math.sin(b + 0.15) * rl * 1.55); }); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = `rgb(${BL})`; ctx.beginPath(); [-0.7, -0.25, 0.2, 0.65].forEach(d => { const b = -Math.PI / 2 + d; ctx.moveTo(xl + Math.cos(b) * rl, yl + Math.sin(b) * rl); ctx.lineTo(xl + Math.cos(b + 0.15) * rl * 1.5, yl + Math.sin(b + 0.15) * rl * 1.5); }); ctx.stroke(); }
    const qui = Math.floor(now / 3.2) % 3, tour = sm(c01((now % 3.2 - 0.4) / 0.25)) * (1 - sm(c01((now % 3.2 - 2.2) / 0.25)));
    [0.15, 0.4, 0.87].forEach((fx, j) => { const r = vw * 0.125, x = Wv[0][0] + vw * fx, y = vy - r * 0.6 + Math.abs(Math.sin(now * 3 + j * 1.7)) * r * 0.12, t = j === qui ? tour : 0;
      ctx.globalAlpha = 1; ctx.fillStyle = PAP; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.8;
      ctx.beginPath(); ctx.moveTo(x - r * 0.95, y - r * 0.15); ctx.lineTo(x - r * 0.85, y - r * 1.15); ctx.lineTo(x - r * 0.3, y - r * 0.85); ctx.quadraticCurveTo(x, y - r * 0.95, x + r * 0.3, y - r * 0.85); ctx.lineTo(x + r * 0.85, y - r * 1.15); ctx.lineTo(x + r * 0.95, y - r * 0.15);
      ctx.quadraticCurveTo(x + r, y + r * 0.7, x + r * 1.4, y + r * 1.6); ctx.lineTo(x - r * 1.4, y + r * 1.6); ctx.quadraticCurveTo(x - r, y + r * 0.7, x - r * 0.95, y - r * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (t > 0.02) { ctx.fillStyle = ENC; [-1, 1].forEach(g => { const ex = x + g * r * 0.36, ey = y - r * 0.3; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.17 * t, r * 0.24, 0, 0, TAU); ctx.fill(); ctx.fillStyle = PAP; ctx.beginPath(); ctx.arc(ex - r * 0.05 * t, ey - r * 0.09, r * 0.06 * t, 0, TAU); ctx.arc(ex + r * 0.06 * t, ey + r * 0.07, r * 0.03 * t, 0, TAU); ctx.fill(); ctx.fillStyle = ENC; }); }
 });
    ctx.globalAlpha = 1; ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = Math.max(1, vw * 0.018); ctx.lineCap = 'round'; [[0.08, 0.3], [0.2, 0.36]].forEach(([u0, u1]) => { ctx.beginPath(); ctx.moveTo(Wv[3][0] + vw * u0, Wv[3][1] + vh * 0.12); ctx.lineTo(Wv[3][0] + vw * (u0 - 0.06), Wv[3][1] + vh * 0.45); ctx.stroke(); });
    ctx.restore();
    // (vague 150) : le pare-chocs (une bande noire cernée, ses deux butoirs), la grille du moteur, l'échelle jusqu'au toit, les clignotants
    { const pc = [Q(-w * 1.03, 0.1, -0.05), Q(w * 1.03, 0.1, -0.05), Q(w * 1.03, 0.19, -0.05), Q(-w * 1.03, 0.19, -0.05)];
      cerne(() => { ctx.beginPath(); pc.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }, 0.9, 1, NUIT);
      [-0.72, 0.72].forEach(u => { const b0 = Q(w * u - 0.06, 0.1, -0.08), b1 = Q(w * u + 0.06, 0.19, -0.08); cerne(() => { ctx.beginPath(); ctx.rect(b0[0], b1[1], b1[0] - b0[0], b0[1] - b1[1]); }, 0.6, 1); });
      ctx.globalAlpha = 1; ctx.strokeStyle = ENC; ctx.lineWidth = G.lw * 0.6; for (let k = 0; k < 4; k++) { const y = 0.385 + k * 0.025, a0 = Q(-w * 0.42, y, 0), a1 = Q(w * 0.42, y, 0); ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke(); }
      const e0 = Q(w * 0.86, 0.45, 0), e1 = Q(w * 0.97, h, 0); ctx.lineWidth = G.lw * 0.7; ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e0[0], e1[1]); ctx.moveTo(e1[0], e0[1]); ctx.lineTo(e1[0], e1[1]); for (let k = 1; k < 6; k++) { const y = lerp(e0[1], e1[1], k / 6); ctx.moveTo(e0[0], y); ctx.lineTo(e1[0], y); } ctx.stroke(); }
    // les feux (rouges : ils brillent au freinage) ; au-dessus, le clignotant ambré du côté où il change de voie
    const cli = Math.abs(roulis) > 0.012 && Math.sin(now * 16) > 0 ? (roulis < 0 ? 1 : -1) : 0;
    [[-w * 0.78, 0.25, -1], [w * 0.78, 0.25, 1]].forEach(([x, y, g]) => { const p = Q(x, y, 0), rf = vw * 0.045; cerne(() => { ctx.beginPath(); ctx.arc(p[0], p[1], rf, 0, TAU); }, 0.7, 1, '#ffb3a8'); brille(p[0], p[1], vw * 0.03, 0.9, Math.abs(roulis) > 0.02, now, x);
      const c = Q(x, y + 0.09, 0); cerne(() => { ctx.beginPath(); ctx.ellipse(c[0], c[1], rf * 0.75, rf * 0.42, 0, 0, TAU); }, 0.6, 1, cli === g ? '#ffd27a' : PAP); if (cli === g) brille(c[0], c[1], rf * 0.9, 1, true, now, g); });
    const pl = Q(0, 0.3, 0), pw = vw * 0.34, ph = vw * 0.1; boite(pl[0] - pw / 2, pl[1] - ph / 2, pw, ph, 3, 0.7, 1, true); mot('MW · 2026', pl[0], pl[1] + 1, Math.max(8, ph * 0.62), 1);
    for (let j = 0; j < 4; j++) { const u = (now * 2 + j / 4) % 1, p = Q(w * 0.6 + u * 0.1, 0.16 + u * 0.3, -u * 1.2); rond(p[0], p[1], vw * (0.03 + u * 0.07) * (1 - u * u), 0.6, 0.8); }   // (vague 149 : la bouffée se dégonfle au lieu de s'effacer)
  }
})();
S.rag = S.ia;

// la toile, l'écran du ciel, les outils ; puis : une scène existe-t-elle ?
return { S, vise, VISE, LUI, ENVOL, TH, TMX, FEUX, SURGE, INSP, INST, PARI, GF, RAG, REQ, DEP, ATK, pose(c, g, o) { ctx = c; G = g; O = o; } };
})();
