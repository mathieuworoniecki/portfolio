/* Les scènes de la présentation dans l'espace (js/espace-plume.js les joue, l'une après l'autre, toute seule).
   (28/09, 20:39, Mathieu : « chaque scène doit être créative ! » : les terminaux par dizaines, en grille vue de biais, qui défilent à l'infini ;
   l'équipe : ma silhouette, puis d'un coup plein de gens derrière, plein de mains qui s'agitent, qui ressortent de moi en popant et y reviennent ;
   « épaissis le trait, prends le même que pour les chats »)
   Chaque scène : cles() : les points (x, y dans [-1, 1] autour du centre de l'écran du ciel) où les étoiles viennent se poser d'abord ;
   dessin(a, now) : l'animation, a secondes après que les étoiles se sont posées (elle tourne en boucle tant que la scène dure).
   Tout est au trait blanc, épais et rond comme celui des chats ; les formes pleines sont peintes de la nuit (ce qui est derrière disparaît). */
window.EspaceScenes = (() => {
const TAU = Math.PI * 2, BL = '244,244,238', NUIT = 'rgb(9,11,16)';
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
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
// un petit robot (un agent) : une tête carrée, deux yeux, une antenne
function robot(x, y, r, a = 1, cligne = 0) { boite(x - r, y - r * 0.8, r * 2, r * 1.6, r * 0.35, 0.9, a, true); trait([[x, y - r * 0.8], [x, y - r * 1.3]], false, 0.8, a); rond(x, y - r * 1.4, r * 0.14, 0.7, a, true);
  const e = cligne ? 0.15 : 1; ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.05, r * 0.16, r * 0.2 * e, 0, 0, TAU); ctx.ellipse(x + r * 0.4, y - r * 0.05, r * 0.16, r * 0.2 * e, 0, 0, TAU); ctx.fill(); }

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

/* ——— les scènes ——— */
const S = {};

// 1 dev = 1 équipe : lui, seul sous un projecteur ; pop, pop, pop : des dizaines de gens jaillissent de sa silhouette et remplissent des gradins
// jusqu'au fond ; mains en l'air, une ola passe ; puis tout le monde est aspiré en tourbillon et rentre en lui : ×10 ; et ça recommence
S.equipe = (() => {
  const F = [];
  [9, 13, 15, 19, 23].forEach((n, r) => { const z = -0.3 - r * 0.62, lx = 0.6 + r * 0.62; for (let i = 0; i < n; i++) F.push({ x: (i / (n - 1) - 0.5) * 2 * lx, z, r, u: i / (n - 1), i: F.length, ph: bruit(F.length * 3.1) * TAU }); });
  const N = F.length; F.slice().sort((p, q) => Math.hypot(p.x, p.z) - Math.hypot(q.x, q.z)).forEach((f, j) => f.o = j / (N - 1));
  const DOS = F.slice().sort((p, q) => p.z - q.z);
  return {
    cles: () => [[0, 0.1], [0, -0.35], [-0.9, -0.5], [0.9, -0.5], [-1.2, 0.1], [1.2, 0.1]],
    dessin(a, now) {
      const [k] = large(1.6, 2), V = cam(Math.sin(now * 0.15) * 0.05, -0.42, k * 0.82, 0, 0.02), Cy = 9.6, c = (a + 0.3) % Cy;
      const pied = V(0, 0.84, 0.7), km = 0.9 * pied[3] * k / G.s, coeur = [pied[0], pied[1] - G.s * km * 0.62];
      let rentres = 0; const vol = [];
      // les gradins : des lignes au sol, rang par rang
      [0, 1, 2, 3, 4].forEach(r => { const z = -0.3 - r * 0.62 + 0.2, lx = 0.8 + r * 0.62; trait([V(-lx, 0.84, z), V(lx, 0.84, z)], false, 0.5, prof(z, 0.3 * c01((c - 0.6) / 0.8))); });
      DOS.forEach(f => {
        const t1 = 0.7 + f.o * 1.9, t2 = 6.1 + (1 - f.o) * 1.5; if (c < t1) return;
        const p = V(f.x, 0.84, f.z), kk = 0.6 * p[3] * k / G.s, al = 0.4 + 0.6 * (1 - f.r / 5);
        if (c < t1 + 0.55) { const e = sm((c - t1) / 0.55), pop = 1 + 0.35 * Math.sin(Math.PI * e);
          vol.push(() => { const q = [lerp(coeur[0], p[0], e), lerp(coeur[1], p[1], e) - Math.sin(Math.PI * e) * G.s * 0.5]; gens(q, lerp(0.12, kk, e) * pop, { w: 0.8 });
            if (e > 0.8) eclat(q[0], q[1] - G.s * kk * 0.7, G.s * 0.05, (e - 0.8) / 0.2, 6, f.i); });
          return; }
        if (c >= t2) { const e = sm((c - t2) / 0.7); if (e >= 1) { rentres++; return; }
          const sg = f.x < 0 ? 1 : -1, dx = p[0] - coeur[0], dy = p[1] - coeur[1], at = u => { const an = u * 4.4 * sg, r = 1 - u; return [coeur[0] + (dx * Math.cos(an) - dy * Math.sin(an)) * r, coeur[1] + (dx * Math.sin(an) + dy * Math.cos(an)) * r]; };
          vol.push(() => { const L = [0.18, 0.12, 0.06, 0].map(d => at(Math.max(0, e - d))); trait(L, false, 0.6, 0.5); gens(L[3], kk * (1 - e * 0.75), { w: 0.8 }); });
          return; }
        // à sa place : les mains s'agitent ; la ola passe deux fois
        const ola = c > 3.3 && c < 5.9 ? Math.exp(-(((f.u - ((c - 3.3) / 1.3) % 1) * 5) ** 2)) : 0, ag = c01((c - t1 - 0.55) / 0.3);
        const b = [0.9 + Math.sin(now * 7 + f.ph) * 0.45 * ag + ola * 0.8, 0.9 + Math.sin(now * 7.6 + f.ph + 1.3) * 0.45 * ag + ola * 0.8];
        gens([p[0], p[1] - (ola * 0.16 + Math.abs(Math.sin(now * 5 + f.ph)) * 0.03 * ag) * G.s * kk], kk, { bras: b, w: 0.8, a: al });
      });
      // lui : le projecteur (seul au début, seul à la fin) ; il dirige pendant que tout le monde s'agite ; il grossit de tous ceux qui rentrent
      const spot = Math.max(1 - c01((c - 0.7) / 0.5), c01((c - 7.9) / 0.4));
      if (spot > 0) { const h = [pied[0], G.haut + 4]; style(0.6, spot * 0.5); ctx.beginPath(); ctx.moveTo(h[0] - G.s * 0.04, h[1]); ctx.lineTo(pied[0] - G.s * 0.55, pied[1]); ctx.moveTo(h[0] + G.s * 0.04, h[1]); ctx.lineTo(pied[0] + G.s * 0.55, pied[1]); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(pied[0], pied[1], G.s * 0.55, G.s * 0.09, 0, 0, TAU); ctx.stroke(); }
      const dirige = c > 2.6 && c < 6.2, b = dirige ? [1.2 + Math.sin(now * 3.2) * 0.45, 1.2 + Math.sin(now * 3.2 + Math.PI) * 0.45] : c > 8.1 ? [1.6, 1.6] : null;
      gens(pied, km * (1 + 0.14 * rentres / N) * (c > 7.9 ? 1 + 0.06 * Math.sin(Math.PI * c01((c - 7.9) / 0.5)) : 1), { moi: true, bras: b, w: 1.25 });
      vol.forEach(f => f());
      if (c > 0.7 && c < 2.6) { const j = Math.floor((c - 0.7) / 0.45), u = ((c - 0.7) % 0.45) / 0.45; mot('pop !', coeur[0] + (j % 2 ? -1 : 1) * G.s * (0.5 + 0.2 * bruit(j)), coeur[1] - G.s * (0.2 + 0.3 * bruit(j * 3)) - u * 12, Math.max(13, G.s * 0.1), 1 - u); }
      if (c > 7.9) { const u = sm((c - 7.9) / 0.5); eclat(coeur[0], coeur[1], G.s * 0.35, (c - 7.9) / 0.7, 12, 0.2); mot('×10', pied[0] + G.s * 0.8, coeur[1] - G.s * 0.15, Math.max(22, G.s * 0.26) * (0.6 + 0.4 * u), u); }
    }
  };
})();

// plusieurs terminaux, plusieurs agents : une grille de terminaux par dizaines, vue de biais, qui défile sans fin ; chacun tape, un agent par fenêtre ;
// de temps en temps, l'un d'eux se soulève vers nous (on voit ce qu'il fait), coche, et reprend sa place
S.terminaux = (() => {
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
        L.push({ Q, z: z + lv * 9, id, lv, pop: c01((cr - d) / 0.8), B: lv > 0.01 ? [[x - W0 / 2, y - H0 / 2], [x + W0 / 2, y - H0 / 2], [x + W0 / 2, y + H0 / 2], [x - W0 / 2, y + H0 / 2]].map(([u, v]) => p3(u, v, 0, lac, tan, k)) : null });
      }
      L.sort((a, b) => a.z - b.z);
      L.forEach(({ Q, z, id, pop, lv, B }) => {
        const al = lv > 0.01 ? 1 : (0.35 + 0.65 * c01((z + 2.2) / 3.2)) * pop, at = (u, v) => [lerp(lerp(Q[0][0], Q[1][0], u), lerp(Q[3][0], Q[2][0], u), v), lerp(lerp(Q[0][1], Q[1][1], u), lerp(Q[3][1], Q[2][1], u), v)];
        if (B) { trait(B, true, 0.5, 0.35); B.forEach((b, j) => trait([b, Q[j]], false, 0.5, 0.5 * lv)); }
        trait(Q, true, lv > 0.01 ? 1.2 : 0.8, al, true); trait([at(0, 0.18), at(1, 0.18)], false, 0.5, al * 0.8);
        [0.06, 0.11, 0.16].forEach(u => { const p = at(u, 0.09); rond(p[0], p[1], 1.2, 0.5, al, true); });
        // les lignes qui s'écrivent : une invite, puis la commande ; le curseur clignote ; parfois l'agent coche sa tâche
        const cyc = lv > 0.01 ? c01(ul * 1.3) * 3 : (now * 0.5 + bruit(id) * 3) % 3;
        for (let l = 0; l < 4; l++) { const v = 0.34 + l * 0.17, lg = 0.25 + 0.55 * bruit(id * 7 + l), p = c01(cyc * 1.6 - l * 0.8), a0 = at(0.07, v), a1 = at(0.12, v - 0.045), a2 = at(0.07, v - 0.09);
          if (p <= 0) break; trait([a2, a1, a0], false, 0.45, al * 0.9); const e = at(0.17 + lg * p, v - 0.045); trait([at(0.17, v - 0.045), e], false, 0.5, al * 0.85);
          if (p < 1 && Math.sin(now * 9) > 0) brille(e[0] + 2, e[1], 1.5, al, false, now, l); }
        if (cyc > 2.4) { const p = at(0.86, 0.72); coche(p[0], p[1], (lv > 0.01 ? 9 : 5) * pop, (cyc - 2.4) / 0.3, 0.7); }
        if (lv > 0.5) brille(Q[1][0], Q[1][1], 3, lv, true, now, 1);
      });
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
      const [k] = large(1.45, 2), V = cam(now * 0.22, -0.28, k), Cy = 6, c = a > 2.3 ? (a - 2.3) % Cy : -1;
      const pos = N.map(q => V(Math.cos(q.t) * q.r, q.y, Math.sin(q.t) * q.r)), nait = q => sm((a - q.n * 0.55 - bruit(q.i) * 0.25) / 0.45);
      trait3(anneau(V, 1.45, 0.88), 0.5, 0.35); trait3(anneau(V, 0.5, 0.88, 24), 0.5, 0.25);
      N.forEach(q => { if (q.p < 0) return; const e = nait(q); if (e <= 0) return; const A = pos[q.p], B = pos[q.i], al = prof(B[2]);
        trait([A, [lerp(A[0], B[0], e), lerp(A[1], B[1], e)]], false, q.n === 3 ? 0.55 : 0.85, al * 0.85);
        if (c >= 0) { const d = c01((c - (q.n - 1) * 0.45) / 0.45), u = c01((c - 2.7 - (3 - q.n) * 0.45) / 0.45);
          if (d > 0 && d < 1) brille(lerp(A[0], B[0], d), lerp(A[1], B[1], d), 2.6 * B[3], al, false, now, q.i);
          if (u > 0 && u < 1) brille(lerp(B[0], A[0], u), lerp(B[1], A[1], u), 3.2 * B[3], al, true, now, q.i); } });
      N.slice().sort((p, q) => pos[p.i][2] - pos[q.i][2]).forEach(q => { const e = nait(q); if (e <= 0) return; const [x, y, z, f] = pos[q.i], pop = e < 1 ? 1 + 0.35 * Math.sin(Math.PI * e) : 1, al = prof(z);
        if (q.n < 3) robot(x, y, k * [0.13, 0.08, 0.05][q.n] * f * pop, al, Math.sin(now * 1.5 + q.i) > 0.97);
        else { const r = k * 0.028 * f * pop; rond(x, y, r, 0.8, al, 'nuit'); if (c > 1.3 && c < 2.9) { style(0.6, al); ctx.beginPath(); ctx.arc(x, y, r * 1.9, now * 6 + q.i, now * 6 + q.i + 2); ctx.stroke(); } } });
      if (c > 4.1 && c < 5.6) { const [x, y] = pos[0]; coche(x + k * 0.24, y - k * 0.12, k * 0.06, (c - 4.1) / 0.4, 1); eclat(x, y, k * 0.2, (c - 4.1) / 0.6, 10); }
    }
  };
})();

// des skills et des plugins sur mesure : un noyau (un cube dans un octaèdre, qui tournent) ; les outils arrivent du fond et se mettent en orbite ;
// l'un après l'autre, chacun plonge vers le noyau et s'y branche (câble, flash, étincelles), puis reprend son orbite
S.skills = (() => {
  const LAB = () => en() ? ['skill', '/command', 'agent', 'MCP', 'plugin', 'skill'] : ['skill', '/commande', 'agent', 'MCP', 'plugin', 'skill'];
  const CU = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], AC = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const OC = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], AO = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
  return {
    cles: () => [0, 1, 2, 3, 4, 5].map(i => { const t = i / 6 * TAU; return [Math.cos(t) * 0.35, Math.sin(t) * 0.35]; }),
    dessin(a, now) {
      const lab = LAB(), [k, lx] = large(1.5, 2), V = cam(0, -0.34, k, 0, 0.02), Rr = Math.min(1.6, lx * 0.85), rot = now * 0.3;
      let flash = 0, nb = 0;
      const it = lab.map((l, i) => { const e0 = sm((a - 0.2 - i * 0.35) / 0.8), u = a > 2.6 ? (a - 2.6 - i * 1.25) % 7.5 : -1, e = u > 0 && u < 1.3 ? Math.sin(Math.PI * u / 1.3) : 0;
        if (u > 0.55 && u < 1.1) flash = Math.max(flash, 1 - (u - 0.55) / 0.55); if (e0 >= 1) nb++;
        const t = i / 6 * TAU + rot, r = lerp(3.4, lerp(Rr, 0.45, e), e0), y = lerp(-1.4, Math.sin(now * 1.2 + i) * 0.06, e0);
        return { l, i, e, p: V(Math.cos(t) * r, y, Math.sin(t) * r) }; });
      trait3(anneau(V, Rr, 0, 60), 0.6, 0.55); trait3(anneau(V, Rr * 0.72, 0.02, 48), 0.4, 0.3);
      const C = V(0, 0, 0);
      const carte = q => { const [x, y, z, f] = q.p, al = prof(z), px = Math.max(10, k * 0.085 * f), w = q.l.length * 0.58 * px + px * 1.6, h = px * 2;
        if (q.e > 0.05) { trait([[x, y], C], false, 1, q.e); const v = (now * 1.5) % 1; brille(lerp(x, C[0], v), lerp(y, C[1], v), 2.8, q.e, true, now, q.i); }
        boite(x - w / 2, y - h / 2, w, h, h * 0.3, 0.95, al, true); mot(q.l, x, y + 1, px, al); };
      it.filter(q => q.p[2] < 0).sort((p, q) => p.p[2] - q.p[2]).forEach(carte);
      const Cm = cam(now * 0.7, now * 0.45, k * (1 + flash * 0.2), 0, 0.02), Co = cam(-now * 0.4, 0.5, k * (1 + flash * 0.12), 0, 0.02);
      const cu = CU.map(([x, y, z]) => Cm(x * 0.2, y * 0.2, z * 0.2)), oc = OC.map(([x, y, z]) => Co(x * 0.42, y * 0.42, z * 0.42));
      AO.forEach(([i, j]) => trait([oc[i], oc[j]], false, 0.8, 0.7)); AC.forEach(([i, j]) => trait([cu[i], cu[j]], false, 1.15, 1));
      for (let j = 0; j < nb; j++) { style(0.5, 0.2 + 0.05 * j); ctx.beginPath(); ctx.ellipse(C[0], C[1], k * (0.55 + j * 0.06), k * (0.55 + j * 0.06) * 0.34, 0, 0, TAU); ctx.stroke(); }
      brille(C[0], C[1], 3 + flash * 6, 1, flash > 0.3, now, 0); if (flash > 0) eclat(C[0], C[1], k * 0.3, 1 - flash, 10, now);
      it.filter(q => q.p[2] >= 0).sort((p, q) => p.p[2] - q.p[2]).forEach(carte);
    }
  };
})();

// tout tester, tout mesurer : une vraie course, en perspective. 3, 2, 1, go ; cinq concurrents, la poussière, le chrono ; l'arrivée en damier ;
// puis le tableau des mesures, du meilleur au moins bon : le gagnant est gardé (coche). Et on relance : ce n'est jamais le même qui gagne
S.bench = (() => ({
  cles: () => [[-1.2, -0.3], [1.2, -0.3], [-1, 0.6], [1, 0.6]],
  dessin(a, now) {
    const [k, lx] = large(1.5, 2.1), V = cam(-0.28, -0.55, k, 0, 0.14), Cy = 7, n = Math.floor(a / Cy), c = a % Cy, x0 = -lx * 0.95, x1 = lx * 0.85, zs = [-0.8, -0.4, 0, 0.4, 0.8], yF = 0.3;
    for (let j = 0; j <= 5; j++) { const z = -1 + j * 0.4; trait([V(x0 - 0.25, yF, z), V(x1 + 0.35, yF, z)], false, 0.6, prof(z, 0.6)); }
    trait([V(x0, yF, -1), V(x0, yF, 1)], false, 1.1, 1);
    for (let j = 0; j < 10; j++) for (let col = 0; col < 2; col++) { const z = -1 + j * 0.2, x = x1 + col * 0.1, Q = [V(x, yF, z), V(x + 0.1, yF, z), V(x + 0.1, yF, z + 0.2), V(x, yF, z + 0.2)];
      ctx.beginPath(); Q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.globalAlpha = 1; ctx.fillStyle = (j + col) % 2 ? `rgb(${BL})` : NUIT; ctx.fill(); }
    const v = zs.map((_, i) => 0.6 + 0.45 * bruit(n * 11 + i * 3.7)), g = v.indexOf(Math.max(...v)), fin = v.map(s => 1.1 + 1 / (s * 0.36));
    zs.map((z, i) => ({ z, i })).sort((p, q) => p.z - q.z).forEach(({ z, i }) => { const f = c < 1.1 ? 0 : Math.min(1, (c - 1.1) * v[i] * 0.36), x = lerp(x0 + 0.1, x1 + 0.05, f), p = V(x, yF, z), r = k * 0.08 * p[3], saut = f > 0 && f < 1 ? Math.abs(Math.sin(now * 14 + i)) * r * 0.35 : 0;
      if (f > 0 && f < 1) for (let d = 1; d <= 5; d++) { const q = V(x - d * 0.1, yF, z); rond(q[0] + Math.sin(now * 9 + d + i) * 2, q[1] - d * 1.6, r * (0.12 + d * 0.06), 0.5, (1 - d / 6) * 0.7); }
      robot(p[0], p[1] - r * 0.85 - saut, r, prof(z), false);
      if (f >= 1 && i === g) { brille(p[0], p[1] - r * 2.4, 4, 1, true, now, i); coche(p[0] + r * 1.7, p[1] - r * 2, r * 0.6, (c - fin[i]) / 0.3, 1); } });
    if (c < 1.3) { const w = c < 0.3 ? '3' : c < 0.6 ? '2' : c < 0.9 ? '1' : 'go !', u = c < 0.9 ? (c % 0.3) / 0.3 : (c - 0.9) / 0.4; mot(w, G.cx, G.cy - k * 0.5, Math.max(22, k * 0.24) * (1.3 - u * 0.3), 1 - u * 0.6); }
    // le chrono
    const ch = [G.cx - lx * k * 0.75, G.cy - k * 0.66], rc = k * 0.13; rond(ch[0], ch[1], rc, 1.1, 1, 'nuit'); trait([[ch[0], ch[1] - rc], [ch[0], ch[1] - rc * 1.35]], false, 1, 1); rond(ch[0], ch[1] - rc * 1.45, rc * 0.12, 0.9, 1);
    for (let j = 0; j < 12; j++) { const t = j / 12 * TAU; trait([[ch[0] + Math.cos(t) * rc * 0.78, ch[1] + Math.sin(t) * rc * 0.78], [ch[0] + Math.cos(t) * rc * 0.9, ch[1] + Math.sin(t) * rc * 0.9]], false, 0.5, 0.7); }
    const an = c > 1.1 ? Math.min(c, 5.6) * 2.6 : 0; trait([ch, [ch[0] + Math.sin(an) * rc * 0.75, ch[1] - Math.cos(an) * rc * 0.75]], false, 1.1, 1);
    // le tableau des mesures
    if (c > 4.3) { const u = sm((c - 4.3) / 0.8), o = v.map((s, i) => [s, i]).sort((p, q) => q[0] - p[0]), bx = G.cx + lx * k * 0.3, by = G.cy - k * 0.86, bw = k * Math.min(0.9, lx * 0.45);
      o.forEach(([s, i], j) => { const y = by + j * k * 0.08, l = bw * (s - 0.4) / 0.65 * u; mot('ABCDE'[i], bx - 8, y, Math.max(9, k * 0.06), 0.8, 'right'); boite(bx, y - k * 0.024, Math.max(2, l), k * 0.048, 2, j ? 0.6 : 1.3, j ? 0.6 : 1);
        if (!j && u >= 1) coche(bx + l + k * 0.07, y, k * 0.032, (c - 5.1) / 0.3, 0.9); }); }
  }
}))();

// une flotte d'agents sur un même produit : un chantier en 3D. L'essaim tourne autour de l'immeuble (MARKO) et l'élève étage après étage ;
// une grue grimpe avec lui ; les fenêtres s'allument ; au dernier étage, le drapeau, et un feu d'artifice
S.flotte = (() => {
  const E = Array.from({ length: 40 }, (_, i) => ({ r: 0.55 + bruit(i) * 0.9, v: (0.45 + bruit(i * 3) * 0.7) * (i % 3 ? 1 : -1), ph: bruit(i * 7) * TAU, h: -0.8 + bruit(i * 5) * 1.55, i }));
  const NE = 11, EH = 0.105, B0 = 0.84, LW = 0.22;
  return {
    cles: () => [[-0.24, 0.86], [0.24, 0.86], [-0.24, -0.5], [0.24, -0.5]],
    dessin(a, now) {
      const [k, lx] = large(1.3, 1.9), V = cam(0.5 + a * 0.12, -0.3, k * 0.92, 0, 0.06), Cy = NE * 0.55 + 4.5, c = a % Cy;
      const tas = 1 - sm((c - Cy + 0.6) / 0.6), n = Math.min(NE, Math.floor(c / 0.55) + 1), f = c01((c % 0.55) / 0.35), top = B0 - (n - 1 + (n < NE ? f : 1)) * EH * tas;
      trait([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => V(x * 0.62, B0, z * 0.62)), true, 0.7, 0.5);
      // l'essaim : chacun son orbite ; de temps en temps, l'un plonge vers le sommet avec son bloc
      const Rm = Math.min(1.6, lx * 0.8), Q = E.map(q => { const t = now * q.v + q.ph, dv = (now * 0.9 + q.i * 0.37) % 4.5, porte = dv < 1.1, e = porte ? Math.sin(Math.PI * dv / 1.1) : 0, r = q.r * Rm / 1.45 * (1 - e * 0.85), y = lerp(q.h, top - 0.1, e);
        return { p: V(Math.cos(t) * r, y, Math.sin(t) * r), pp: V(Math.cos(t - 0.14 * Math.sign(q.v)) * r, y, Math.sin(t - 0.14 * Math.sign(q.v)) * r), porte: porte && e > 0.05, i: q.i }; });
      const agent = q => { const al = prof(q.p[2]); trait([q.pp, q.p], false, 0.5, al * 0.5); rond(q.p[0], q.p[1], k * 0.026 * q.p[3], 0.7, al, true); if (q.porte) boite(q.p[0] - 4, q.p[1] + 4, 8, 6, 1, 0.7, al, true); };
      Q.filter(q => q.p[2] < -0.2).forEach(agent);
      // l'immeuble : ses étages ; les fenêtres qui s'allument
      for (let j = 0; j < n; j++) { const y1 = B0 - j * EH * tas, y0 = j === n - 1 && n < NE ? y1 - EH * f * tas : y1 - EH * tas;
        const C = boite3(V, -LW, LW, y1, y0, -LW, LW, 0.9, 1);
        [[-LW, 0, 1, 0], [0, LW, 0, 1], [LW, 0, -1, 0], [0, -LW, 0, -1]].forEach(([fx, fz, ux, uz], s) => [-0.5, 0, 0.5].forEach((o, w) => {
          const p = V(fx + ux * o * LW, (y0 + y1) / 2, fz + uz * o * LW); if (p[2] < V(0, (y0 + y1) / 2, 0)[2]) return;
          trait([[p[0], p[1] - 3], [p[0], p[1] + 3]], false, 0.6, 0.8); if (bruit(j * 17 + s * 5 + w + Math.floor(now * 0.8 + j)) > 0.72) brille(p[0], p[1], 2, 0.9, false, now, j + w); })); }
      // la grue : son mât en treillis monte avec l'immeuble ; la flèche tourne ; le crochet monte et descend
      const mx = 0.62, mz = -0.25, mt = Math.min(B0 - 0.3, top - 0.32), M0 = V(mx, B0, mz), M1 = V(mx, mt, mz); trait([M0, M1], false, 1, 1);
      const Z = []; for (let j = 0; j <= 14; j++) Z.push(V(mx + (j % 2 ? 0.05 : -0.05), lerp(B0, mt, j / 14), mz)); trait(Z, false, 0.5, 0.7);
      const ja = now * 0.45, J = V(mx + Math.cos(ja) * 0.85, mt, mz + Math.sin(ja) * 0.85), Jc = V(mx - Math.cos(ja) * 0.28, mt, mz - Math.sin(ja) * 0.28); trait([Jc, M1, J], false, 1, 1); boite(Jc[0] - 5, Jc[1] - 3, 10, 8, 1, 0.7, 1, true);
      const hk = lerp(mt + 0.08, Math.min(B0 - 0.05, top + 0.1), 0.5 + 0.5 * Math.sin(now * 1.3)), Hj = V(mx + Math.cos(ja) * 0.72, mt, mz + Math.sin(ja) * 0.72), H = V(mx + Math.cos(ja) * 0.72, hk, mz + Math.sin(ja) * 0.72);
      trait([Hj, H], false, 0.5, 0.8); boite(H[0] - 6, H[1], 12, 9, 2, 0.8, 1, true);
      Q.filter(q => q.p[2] >= -0.2).forEach(agent);
      if (n >= NE && tas > 0.5) { const t = V(0, top, 0), m = [t[0], t[1] - k * 0.3]; trait([t, m], false, 1, 1); trait([m, [m[0] + k * 0.16, m[1] + k * (0.05 + Math.sin(now * 5) * 0.015)], [m[0], m[1] + k * 0.11]], true, 0.9, 1, true);
        mot('MARKO', t[0], t[1] - k * 0.38, Math.max(11, k * 0.08), 1);
        for (let j = 0; j < 4; j++) { const u = ((c - NE * 0.55) * 0.9 + j / 4) % 1, px = t[0] + (bruit(j * 7 + Math.floor((c - NE * 0.55) * 0.9 + j / 4)) - 0.5) * k * 1.6, py = t[1] - k * (0.2 + 0.4 * bruit(j * 3 + 1)); eclat(px, py, k * 0.07, u, 9, j); } }
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
      const [k, lx] = large(1.55, 2.1), V = cam(-0.3, -0.42, k * 1.15, -0.05, 0.12), yT = 0.3, x0 = -lx, xS = lx * 0.5, xs = [-lx * 0.62, -lx * 0.28, lx * 0.06], lab = LAB(), vit = 0.36, T = 1.0;
      [-0.2, 0.2].forEach(z => trait([V(x0, yT, z), V(xS + 0.1, yT, z)], false, 0.9, prof(z)));
      for (let j = 0; j < 26; j++) { const x = x0 + ((j * 0.13 + a * vit) % (xS + 0.1 - x0)); trait([V(x, yT, -0.2), V(x, yT, 0.2)], false, 0.35, 0.4); }
      const carte = (x, y, z, al, rt = 0) => { const R = (u, w) => [x + u * Math.cos(rt) - w * Math.sin(rt), z + u * Math.sin(rt) + w * Math.cos(rt)], Q = [[-0.09, -0.13], [0.09, -0.13], [0.09, 0.13], [-0.09, 0.13]].map(([u, w]) => { const [px, pz] = R(u, w); return V(px, y, pz); });
        trait(Q, true, 0.8, al, true); [[-0.06, 0.05], [0.02, 0.05]].forEach(([u1, u2], l) => { const [a1, b1] = R(-0.05, -0.06 + l * 0.08), [a2, b2] = R(u2 + 0.02, -0.06 + l * 0.08); trait([V(a1, y, b1), V(a2, y, b2)], false, 0.5, al); }); return Q; };
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
        const ts = (x - xa) / vit; if (ts < 0.6) { carte(xa, yT - 0.015, 0, 1); if (ts > 0.2) { tampon = 1; const c = V(xa, yT - 0.1, 0); coche(c[0], c[1], k * 0.05, (ts - 0.2) / 0.25, 1.1); } continue; }
        const m = sm((ts - 0.6) / 0.8); if (m >= 1) continue; carte(lerp(xa, xP, m), lerp(yT, yT - Math.min(14, pile) * 0.03, m) - Math.sin(Math.PI * m) * 0.3, lerp(0, zP, m), 1); }
      // les portiques : l'arche, son nom, son faisceau qui balaie
      xs.forEach((g, i) => { const A = [V(g, yT, -0.3), V(g, yT - 0.5, -0.3), V(g, yT - 0.5, 0.3), V(g, yT, 0.3)]; trait(A, false, 1.1, 1); trait([V(g - 0.04, yT - 0.5, -0.3), V(g - 0.04, yT - 0.5, 0.3)], false, 0.5, 0.6);
        const v = (now * 1.3 + i * 0.3) % 1, y = yT - 0.46 + v * 0.44; trait([V(g, y, -0.28), V(g, y, 0.28)], false, 0.8, 0.9); brille(V(g, y, 0.28)[0], V(g, y, 0.28)[1], 2.2, 0.8, false, now, i);
        const L = V(g, yT - 0.64, 0); mot(lab[i], L[0], L[1], Math.max(10, k * 0.07), 0.9); });
      // l'humain : il regarde, hoche la tête, tamponne
      const hp = V(xS + 0.18, yT, 0.35), kk = 0.62 * hp[3] * k / G.s, hoche = Math.max(0, Math.sin(now * 2.2)) ** 6;
      gens([hp[0], hp[1] + hoche * 3], kk, { w: 1, bras: tampon ? [1.5, -0.2] : null }); mot(lab[3], hp[0], hp[1] + k * 0.1, Math.max(10, k * 0.07), 0.85);
    }
  };
})();

// six couches, comme une puce : la puce s'ouvre en éclaté, couche par couche ; des vias la traversent (les données montent et descendent) ;
// de temps en temps, tout se referme d'un coup (clac, un éclair), puis se rouvre. L'IA au cœur, la plus grande et la plus vive
S.puce = (() => {
  const LAB = () => en() ? ['Front', 'AI', 'Back-end', 'DevOps', 'Security', 'Leadership'] : ['Front', 'IA', 'Back-end', 'DevOps', 'Sécurité', 'Leadership'];
  return {
    cles: () => [[-0.45, 0], [0.45, 0], [0, -0.3], [0, 0.3]],
    dessin(a, now) {
      const [k] = large(1.5, 2), lac = 0.7 + a * 0.18, tan = 0.55, lab = LAB(), Cy = 7, c = a % Cy, ferme = c > 4.6 && c < 5.6 ? Math.sin(Math.PI * (c - 4.6)) : 0;
      const ec = sm(a / 1.4) * (0.2 + 0.04 * Math.sin(now * 0.9)) * (1 - ferme * 0.9), q3 = (x, y, z) => p3(x, y, z, lac, tan, k * 1.05);
      const Qs = lab.map((l, j) => { const s = j === 1 ? 0.62 : 0.52, y = (j - 2.5) * ec; return { l, j, s, y, Q: [[-s, -s], [s, -s], [s, s], [-s, s]].map(([x, z]) => q3(x, y, z)) }; });
      const tx = Math.min(Math.max(...Qs.map(q => Math.max(...q.Q.map(p => p[0])))) + 26, G.droite - Math.max(11, k * 0.11) * 5.6);
      // les vias : quatre colonnes qui traversent toutes les couches ; les données y courent
      [[-0.32, -0.32], [0.32, -0.32], [0.32, 0.32], [-0.32, 0.32]].forEach(([x, z], v) => { const A = q3(x, -2.5 * ec - 0.05, z), B = q3(x, 2.5 * ec + 0.05, z); trait([A, B], false, 0.5, 0.45);
        for (let d = 0; d < 2; d++) { const u = (now * 0.5 + v * 0.25 + d * 0.5) % 1, w = v % 2 ? u : 1 - u; brille(lerp(A[0], B[0], w), lerp(A[1], B[1], w), 2.2, 0.9, false, now, v * 2 + d); } });
      Qs.slice().reverse().forEach(({ l, j, s, y, Q }) => {
        trait(Q, true, j === 1 ? 1.35 : 0.95, j === 1 ? 1 : 0.8, true);
        if (j === 1) { trait([[-0.22, -0.22], [0.22, -0.22], [0.22, 0.22], [-0.22, 0.22]].map(([x, z]) => q3(x, y, z)), true, 1, 1);
          for (let i = 0; i < 16; i++) { const d = [[1, 0], [0, 1], [-1, 0], [0, -1]][i % 4], o = (Math.floor(i / 4) - 1.5) * 0.15, A = q3(d[0] * s + d[1] * o, y, d[1] * s + d[0] * o), B = q3(d[0] * (s + 0.16) + d[1] * o, y, d[1] * (s + 0.16) + d[0] * o); trait([A, B], false, 0.7, 0.9);
            const v = (now * 0.7 + i * 0.13) % 1; if (v < 0.5) brille(lerp(A[0], B[0], v * 2), lerp(A[1], B[1], v * 2), 1.8, 0.9, false, now, i); }
          brille(q3(0, y, 0)[0], q3(0, y, 0)[1], 4, 1, true, now, 9); }
        const R = Q.reduce((b, q) => q[0] > b[0] ? q : b, Q[0]); trait([R, [tx - 6, R[1]]], false, 0.4, 0.5);
        mot(l, tx, R[1], Math.max(11, k * (j === 1 ? 0.11 : 0.08)), (j === 1 ? 1 : 0.8) * (1 - ferme), 'left'); });
      if (ferme > 0.9) { const C = q3(0, 0, 0); eclat(C[0], C[1], k * 0.5, (ferme - 0.9) * 10, 12, 0.3); }
    }
  };
})();

// IA & données : des documents sont lus (un faisceau) ; leurs morceaux s'envolent dans un grand nuage de vecteurs en 3D ; une question arrive,
// ses voisins s'allument et se relient ; la réponse s'écrit, file vers un agent, qui agit (son engrenage tourne) et coche
S.ia = (() => {
  const Nn = 130, Vs = Array.from({ length: Nn }, (_, i) => { const y = 1 - (i + 0.5) / Nn * 2, r = Math.sqrt(1 - y * y), t = i * 2.39996, j = 0.85 + 0.3 * bruit(i * 1.7); return [Math.cos(t) * r * j, y * j, Math.sin(t) * r * j]; });
  const VO = Vs.map((p, i) => Vs.map((q, j) => [Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), j]).filter(d => d[1] > i).sort((a, b) => a[0] - b[0]).slice(0, 2).map(d => d[1]));
  const Qp = [0.35, -0.3, 0.55], PR = Vs.map((p, i) => [Math.hypot(p[0] - Qp[0], p[1] - Qp[1], p[2] - Qp[2]), i]).sort((a, b) => a[0] - b[0]).slice(0, 7).map(d => d[1]);
  return {
    cles: () => [[-0.95, -0.3], [-0.95, 0.35], [0, 0], [0.95, 0]],
    dessin(a, now) {
      const [k, lx] = large(1.5, 2.1), Pk = (x, y) => [G.cx + x * k, G.cy + y * k], xd = -lx * 0.8, xa = lx * 0.78, Cy = 7, c = a % Cy, R = 0.66, V = cam(now * 0.28, -0.25, k);
      // les documents, en éventail ; le faisceau de lecture
      [2, 1, 0].forEach(j => { const p = Pk(xd + j * 0.08, -0.05 - j * 0.04); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(-0.09 * j); boite(-0.2 * k, -0.34 * k, 0.4 * k, 0.68 * k, 4, 1, j ? 0.7 : 1, true);
        if (!j) for (let l = 0; l < 7; l++) trait([[-0.13 * k, (-0.23 + l * 0.08) * k], [(0.13 - (l % 3) * 0.05) * k, (-0.23 + l * 0.08) * k]], false, 0.55, 0.8); ctx.restore(); });
      const lb = -0.32 + ((now * 0.35) % 1) * 0.6, A0 = Pk(xd - 0.25, lb), A1 = Pk(xd + 0.25, lb); trait([A0, A1], false, 1.1, 1); brille(A1[0], A1[1], 3, 1, false, now, 1);
      // le nuage : il tourne ; ses liens ; il se remplit
      const Q = Vs.map(([x, y, z]) => V(x * R, y * R, z * R)), nb = Math.min(Nn, 30 + Math.floor(a * 16));
      for (let i = 0; i < nb; i++) VO[i].forEach(j => { if (j < nb) trait([Q[i], Q[j]], false, 0.35, prof(Q[i][2], 0.35)); });
      for (let i = 0; i < nb; i++) rond(Q[i][0], Q[i][1], 1.3 + Q[i][3] * 0.9, 0.5, prof(Q[i][2]), true);
      // les morceaux qui s'envolent vers le nuage (chacun vers son point)
      for (let m = 0; m < 6; m++) { const v = (now * 0.55 + m / 6) % 1, i = Math.floor(bruit(m * 5 + Math.floor(now * 0.55 + m / 6)) * nb), B = Q[i]; brille(lerp(A1[0], B[0], sm(v)), lerp(A1[1], B[1], sm(v)) - Math.sin(Math.PI * v) * k * 0.2, 1.9, 1 - v * 0.4, false, now, m);
        style(0.6, 1 - v); ctx.strokeRect(lerp(A1[0], B[0], sm(v)) - 4, lerp(A1[1], B[1], sm(v)) - Math.sin(Math.PI * v) * k * 0.2 - 3, 8, 6); }
      // la question ; ses voisins s'allument et se relient
      const qA = Pk(0.15, -0.78), Qc = V(Qp[0] * R, Qp[1] * R, Qp[2] * R), qu = c01((c - 1) / 0.8), on = c > 1.8 && c < 5.2;
      if (c > 0.6 && c < 2.2) { mot('?', qA[0], qA[1], Math.max(18, k * 0.18), 1); if (qu > 0 && qu < 1) brille(lerp(qA[0], Qc[0], qu), lerp(qA[1], Qc[1], qu), 3.5, 1, true, now, 2); }
      if (on) { rond(Qc[0], Qc[1], 6, 1, 1); PR.forEach((i, j) => { const q = Q[i], u = c01((c - 1.8 - j * 0.12) / 0.3); trait([Qc, [lerp(Qc[0], q[0], u), lerp(Qc[1], q[1], u)]], false, 0.8, 0.9); if (u >= 1) brille(q[0], q[1], 3, 1, false, now, i); }); }
      // la réponse s'écrit, puis va à l'agent ; il agit
      const R0 = Pk(xa, -0.5), wr = 0.52 * k, hr = 0.34 * k; boite(R0[0] - wr / 2, R0[1] - hr / 2, wr, hr, 6, 1, 1, true);
      const ec = c01((c - 2.6) / 1.2); for (let l = 0; l < 3; l++) { const u = c01(ec * 3 - l); if (u > 0) trait([[R0[0] - wr * 0.38, R0[1] - hr * 0.22 + l * hr * 0.22], [R0[0] - wr * 0.38 + wr * (0.76 - (l === 2 ? 0.3 : 0)) * u, R0[1] - hr * 0.22 + l * hr * 0.22]], false, 0.6, 0.9); }
      if (c > 2.2 && c < 2.9) { const v = (c - 2.2) / 0.7; brille(lerp(Qc[0], R0[0] - wr / 2, v), lerp(Qc[1], R0[1], v), 3.2, 1, true, now, 3); }
      const ag = Pk(xa, 0.28); robot(ag[0], ag[1], k * 0.1, 1, Math.sin(now * 1.5) > 0.97);
      if (c > 3.9 && c < 4.6) { const v = (c - 3.9) / 0.7; brille(lerp(R0[0], ag[0], v), lerp(R0[1] + hr / 2, ag[1] - k * 0.1, v), 3, 1, true, now, 4); }
      roue(ag[0], ag[1] + k * 0.3, k * 0.075, c > 4.5 ? (c - 4.5) * 4 : 0, 0.9, 1);
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
      const [k, lx] = large(1.2, 1.8), Pk = (x, y) => [G.cx + x * k, G.cy + y * k], Cy = 12, c = a % Cy, b1 = a < Cy;
      const FO = [[Math.min(1.5, lx * 0.85), 0.66, 3], [0.64, 0.8, 2], [0.36, 0.86, 1]];
      let A = 0, B = 0, u = 0;
      if (c > 4.4 && c < 5.2) [A, B, u] = [0, 1, sm((c - 4.4) / 0.8)]; else if (c >= 5.2 && c < 7.2) A = B = 1; else if (c >= 7.2 && c < 8) [A, B, u] = [1, 2, sm((c - 7.2) / 0.8)]; else if (c >= 8 && c < 10.4) A = B = 2; else if (c >= 10.4 && c < 11.4) [A, B, u] = [2, 0, sm((c - 10.4) / 1)];
      const w = lerp(FO[A][0], FO[B][0], u), h = lerp(FO[A][1], FO[B][1], u), large01 = c01((w - 0.45) / 0.7);
      const cartes = n => { const [W, H, nc] = FO[n], rows = Math.ceil(3 / nc), cw = (2 * W - 0.16 - (nc - 1) * 0.06) / nc, top = -H + 0.34, bot = H - 0.3, ch = Math.min(0.46, (bot - top - (rows - 1) * 0.05) / rows);
        return [0, 1, 2].map(i => [-W + 0.08 + (i % nc) * (cw + 0.06), top + Math.floor(i / nc) * (ch + 0.05), cw, ch]); };
      const CA = cartes(A), CB = cartes(B), CC = CA.map((q, i) => q.map((v, j) => lerp(v, CB[i][j], u)));
      // le cadre (l'écran) ; en téléphone : l'encoche
      const T = Pk(-w, -h); boite(T[0], T[1], 2 * w * k, 2 * h * k, k * lerp(0.1, 0.03, large01), 1.2, 1, true);
      if (large01 < 1) { const n = Pk(0, -h + 0.05); boite(n[0] - k * 0.07, n[1] - k * 0.015, k * 0.14, k * 0.03, k * 0.015, 0.7, 1 - large01); }
      trait([Pk(-w, -h + 0.16), Pk(w, -h + 0.16)], false, 0.8, 0.9);
      [0, 1, 2].forEach(i => { const p = Pk(-w + 0.09 + i * 0.07, -h + 0.08); rond(p[0], p[1], 2.2, 0.6, large01, true); });
      if (large01 < 1) [0, 1, 2].forEach(i => { const p = Pk(w - 0.14, -h + 0.05 + i * 0.03); trait([[p[0], p[1]], [p[0] + k * 0.07, p[1]]], false, 0.7, 1 - large01); });
      // l'en-tête
      const e1 = b1 ? sm((a - 0.2) / 0.5) : 1; if (e1 > 0) { const p = Pk(-w + 0.08 - (1 - e1) * 0.6, -h + 0.21); boite(p[0], p[1], (2 * w - 0.16) * k, 0.09 * k, 3, 0.8, 1); }
      // les cartes : elles se retournent (la première fois), puis suivent la mise en page
      CC.forEach(([x, y, cw, ch], i) => { const e = b1 ? sm((a - 0.6 - i * 0.3) / 0.5) : 1, fl = Math.cos((1 - e) * Math.PI / 2); if (e <= 0) return;
        const p = Pk(x + cw / 2 - cw / 2 * fl, y); boite(p[0], p[1], cw * fl * k, ch * k, 5, 0.85, 1, true);
        if (fl > 0.6) { const im = Pk(x + cw / 2, y + ch * 0.38); rond(im[0], im[1], Math.min(cw, ch) * 0.2 * k, 0.6, 0.9); trait([Pk(x + 0.05, y + ch * 0.78), Pk(x + cw * 0.7, y + ch * 0.78)], false, 0.5, 0.8); }
        if (c > 8.6 && c < 9.4 && i === 1) { const r = (c - 8.6) / 0.8, q = Pk(x + cw / 2, y + ch / 2); style(0.8, 1 - r); ctx.beginPath(); ctx.arc(q[0], q[1], k * 0.2 * r, 0, TAU); ctx.stroke(); rond(q[0], q[1], k * 0.035, 0.9, 1 - r); } });
      // le bouton
      const eb = b1 ? sm((a - 1.6) / 0.4) : 1, bw = Math.min(0.4, w * 1.1), bx = large01 * w * 0.5, by = h - 0.15; if (eb > 0) { const p = Pk(bx - bw / 2, by - 0.06); boite(p[0], p[1], bw * k * eb, 0.12 * k, 6, 0.95, 1, true); }
      // le curseur : il va au bouton, clique ; l'onde ; le cube jaillit
      const vc = sm((c - 1.8) / 1), cu = Pk(lerp(-0.2, bx, vc), lerp(h + 0.2, by, vc)), clic = c - 2.8;
      if (c > 1.8 && c < 4.4) trait([cu, [cu[0], cu[1] + k * 0.12], [cu[0] + k * 0.035, cu[1] + k * 0.085], [cu[0] + k * 0.08, cu[1] + k * 0.08]], true, 0.9, 1, true);
      if (clic > 0 && clic < 0.6) { style(0.8, 1 - clic / 0.6); ctx.beginPath(); ctx.arc(cu[0], cu[1], k * 0.25 * clic / 0.6, 0, TAU); ctx.stroke(); }
      const ec = clic > 0.2 ? Math.sin(Math.PI * c01((clic - 0.2) / 3.2)) : 0;
      if (ec > 0.01) { const s = 0.12 + ec * 0.3, Cm = cam(now * 1.1, now * 0.7, k), o = Pk(0, -0.05 - ec * 0.12);
        const Vv = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => { const q = Cm(x * s, y * s, z * s); return [q[0] + o[0] - G.cx, q[1] + o[1] - G.cy]; });
        [[0, 1, 2, 3], [4, 5, 6, 7]].forEach(f => trait(f.map(i => Vv[i]), true, 1.1, 1, true)); [0, 1, 2, 3].forEach(i => trait([Vv[i], Vv[i + 4]], false, 1.1, 1)); Vv.forEach((v, i) => brille(v[0], v[1], 2, ec, false, now, i)); }
      const nom = NOMS()[u < 0.5 ? A : B], al = u > 0 ? Math.abs(u - 0.5) * 2 : 1, L = Pk(0, h + 0.12); if (c > 4) mot(nom, L[0], L[1], Math.max(10, k * 0.07), al * 0.85);
    }
  };
})();

// back-end & données : un plan en 3D, vu d'en haut. Les requêtes arrivent de partout ; la passerelle (API) les range dans la file de leur client ;
// les engrenages les traitent ; chaque client a sa propre base, séparée des autres par un mur (l'isolation)
S.back = (() => ({
  cles: () => [[-0.62, -0.5], [-0.62, 0.5], [0.85, -0.45], [0.85, 0.45]],
  dessin(a, now) {
    const [k, lx] = large(1.5, 2.1), V = cam(0.42, -0.62, k * 0.95, 0, 0.16), xA = -lx * 0.7, xW = lx * 0.05, xD = lx * 0.68, zs = [-0.6, 0, 0.6], yS = 0.3;
    // les murs entre les bases
    [-0.3, 0.3].forEach(z => { const Q = [V(xD - 0.32, yS, z), V(xD + 0.32, yS, z), V(xD + 0.32, yS - 0.42, z), V(xD - 0.32, yS - 0.42, z)]; trait(Q, true, 0.7, 0.6);
      for (let j = 1; j < 4; j++) trait([V(xD - 0.32, yS - j * 0.105, z), V(xD + 0.32, yS - j * 0.105, z)], false, 0.35, 0.4); });
    // les files : deux rails ; l'engrenage
    zs.forEach((z, i) => { [-0.07, 0.07].forEach(o => trait([V(xA + 0.14, yS, z + o), V(xW - 0.14, yS, z + o)], false, 0.5, 0.5)); trait([V(xW + 0.14, yS - 0.05, z), V(xD - 0.2, yS - 0.3, z)], false, 0.4, 0.35);
      const g = V(xW, yS - 0.1, z); roue(g[0], g[1], k * 0.085 * g[3], now * 2 * (i % 2 ? -1 : 1), 0.9, 1); });
    // la passerelle
    boite3(V, xA - 0.1, xA + 0.1, yS, yS - 0.45, -0.75, 0.75, 1, 1); const la = V(xA, yS - 0.64, 0); mot('API', la[0], la[1], Math.max(11, k * 0.09), 1);
    // les bases : des cylindres qui se remplissent
    zs.forEach((z, i) => { const r = 0.17, hh = 0.36, B = anneau(V, r, yS, 28, xD, z), H = anneau(V, r, yS - hh, 28, xD, z), l = B.reduce((m, p, j) => p[0] < B[m][0] ? j : m, 0), rr = B.reduce((m, p, j) => p[0] > B[m][0] ? j : m, 0);
      ctx.beginPath(); ctx.moveTo(H[l][0], H[l][1]); ctx.lineTo(B[l][0], B[l][1]); B.slice(Math.min(l, rr), Math.max(l, rr) + 1).forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(H[rr][0], H[rr][1]); ctx.globalAlpha = 1; ctx.fillStyle = NUIT; ctx.fill();
      trait([B[l], H[l]], false, 1, 1); trait([B[rr], H[rr]], false, 1, 1); trait(B, true, 1, 1); trait(H, true, 1, 1, true);
      const nv = Math.floor((a * 1.2 + i * 1.7) % 5); for (let j = 1; j <= nv; j++) trait(anneau(V, r, yS - j * hh / 6, 28, xD, z), true, 0.45, 0.55);
      const t = V(xD, yS - hh - 0.14, z); mot(['A', 'B', 'C'][i], t[0], t[1], Math.max(10, k * 0.08), 0.9); });
    // les requêtes : elles arrivent, sont triées, traitées, rangées
    for (let q = 0; q < 18; q++) { const t = (now * 0.3 + q / 18) % 1, cl = Math.floor(bruit(q * 3.3) * 3), z = zs[cl], z0 = (bruit(q * 9.1) - 0.5) * 1.6; let p;
      if (t < 0.25) p = V(lerp(-lx * 1.15, xA - 0.12, t / 0.25), yS - 0.1, z0); else if (t < 0.6) p = V(lerp(xA + 0.14, xW - 0.14, (t - 0.25) / 0.35), yS - 0.03, z); else if (t < 0.7) p = V(xW, yS - 0.1 - Math.sin((t - 0.6) / 0.1 * Math.PI) * 0.08, z); else { const u = (t - 0.7) / 0.3; p = V(lerp(xW + 0.14, xD, u), yS - 0.05 - u * 0.36 - Math.sin(Math.PI * u) * 0.25, z); }
      const s = k * 0.04 * p[3]; boite(p[0] - s, p[1] - s * 0.7, s * 2, s * 1.4, 2, 0.7, prof(p[2]), true); }
  }
}))();

// DevOps & cloud : la boucle sans fin, en 3D, comme un circuit vu d'en haut ; des conteneurs en font le tour et passent sous les portiques
// (build, test, déploie, surveille), qui s'allument à leur passage ; dessous, l'écran du monitoring et son pouls
S.devops = (() => ({
  cles: () => [[-1, 0], [1, 0], [0, 0], [-0.5, -0.35]],
  dessin(a, now) {
    const [k, lx] = large(1.4, 2.1), V = cam(Math.sin(now * 0.25) * 0.18, -0.95, k, 0, -0.1), sx = lx * 0.92;
    const at = t => { const d = 1 + Math.sin(t) ** 2; return [sx * Math.cos(t) / d, -0.16 * Math.sin(t), 1.35 * Math.sin(t) * Math.cos(t) / d]; };
    const nor = t => { const p = at(t - 0.01), q = at(t + 0.01), dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    const bord = o => { const L = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * TAU, p = at(t), [tx, tz] = nor(t); L.push(V(p[0] - tz * o, p[1], p[2] + tx * o)); } return L; };
    trait3(bord(0.08), 1, 1); trait3(bord(-0.08), 1, 1);
    const lab = en() ? ['build', 'test', 'deploy', 'monitor'] : ['build', 'test', 'déploie', 'surveille'], ST = [0.35, 1.25, 3.5, 4.4];
    const conts = []; for (let q = 0; q < 12; q++) conts.push((now * 0.5 + q / 12 * TAU) % TAU);
    ST.forEach((t, i) => { const p = at(t), [tx, tz] = nor(t), A = V(p[0] - tz * 0.13, p[1], p[2] + tx * 0.13), B = V(p[0] + tz * 0.13, p[1], p[2] - tx * 0.13), A1 = V(p[0] - tz * 0.13, p[1] - 0.22, p[2] + tx * 0.13), B1 = V(p[0] + tz * 0.13, p[1] - 0.22, p[2] - tx * 0.13);
      const vif = conts.some(u => Math.abs(Math.atan2(Math.sin(u - t), Math.cos(u - t))) < 0.12); trait([A, A1, B1, B], false, vif ? 1.3 : 0.9, 1); if (vif) brille((A1[0] + B1[0]) / 2, (A1[1] + B1[1]) / 2, 3.5, 1, true, now, i);
      const m = V(p[0], p[1] - 0.34, p[2]); mot(lab[i], m[0], m[1], Math.max(10, k * 0.075), 0.9); });
    // les conteneurs : de vraies petites boîtes, orientées dans le sens de la marche
    conts.map(t => ({ t, p: at(t) })).sort((p, q) => p.p[2] - q.p[2]).forEach(({ t, p }) => { const [tx, tz] = nor(t), c = (u, w, y) => V(p[0] + tx * u - tz * w, p[1] + y, p[2] + tz * u + tx * w);
      const C = [[-0.08, -0.05], [0.08, -0.05], [0.08, 0.05], [-0.08, 0.05]].map(([u, w]) => [c(u, w, 0), c(u, w, -0.09)]);
      C.forEach(q => trait(q, false, 0.8, 1)); trait(C.map(q => q[1]), true, 0.8, 1, true); trait([c(-0.03, -0.05, -0.09), c(-0.03, 0.05, -0.09)], false, 0.4, 0.8); trait([c(0.03, -0.05, -0.09), c(0.03, 0.05, -0.09)], false, 0.4, 0.8); });
    // le monitoring : un écran, son pouls qui défile
    const mw = Math.min(1.1, lx * 0.6) * k, mh = 0.24 * k, mc = [G.cx, G.cy + k * 0.66]; boite(mc[0] - mw / 2, mc[1] - mh / 2, mw, mh, 5, 0.9, 1, true);
    const M = []; for (let i = 0; i <= 70; i++) { const u = i / 70, t = u * 3.5 - now * 0.8, f = t - Math.floor(t), b = f > 0.4 && f < 0.5 ? Math.sin((f - 0.4) / 0.1 * TAU) * 0.35 : 0; M.push([mc[0] - mw * 0.45 + u * mw * 0.9, mc[1] - b * mh]); } trait(M, false, 0.8, 1);
  }
}))();

// sécurité & qualité : un dôme en 3D (méridiens, parallèles) posé sur les données (un cadenas) ; au sol, le radar balaie ;
// ce qui arrive du dehors frappe le dôme : une onde se propage à sa surface, la menace éclate ; le compteur des bloqués monte
S.secu = (() => ({
  cles: () => [0, 1, 2, 3, 4, 5].map(i => [Math.cos(i / 6 * TAU) * 0.6, Math.sin(i / 6 * TAU) * 0.6]),
  dessin(a, now) {
    const [k, lx] = large(1.2, 2), V = cam(now * 0.2, -0.42, k, 0, 0.3), R = 0.82, sw = now * 1.3;
    trait3(anneau(V, Math.min(1.8, lx * 0.9), 0, 64), 0.5, 0.35); trait3(anneau(V, R * 1.3, 0, 64), 0.5, 0.5);
    for (let j = 0; j < 9; j++) { const t = sw - j * 0.05; trait([V(0, 0, 0), V(Math.cos(t) * R * 1.3, 0, Math.sin(t) * R * 1.3)], false, 0.9 - j * 0.07, 0.9 - j * 0.1); }
    // le dôme
    [15, 35, 55, 75].forEach(d => { const f = d * Math.PI / 180; trait3(anneau(V, R * Math.cos(f), -R * Math.sin(f), 40), 0.7, 0.9); });
    for (let j = 0; j < 10; j++) { const t = j / 10 * TAU, L = []; for (let i = 0; i <= 12; i++) { const f = i / 12 * Math.PI / 2; L.push(V(Math.cos(t) * R * Math.cos(f), -R * Math.sin(f), Math.sin(t) * R * Math.cos(f))); } trait3(L, 0.7, 0.9); }
    trait3(anneau(V, R, 0, 48), 1.3, 1);
    // le cadenas
    const c0 = V(0, -0.12, 0), s = k * 0.12; boite(c0[0] - s, c0[1] - s * 0.1, 2 * s, 1.5 * s, 4, 1, 1, true); style(1, 1); ctx.beginPath(); ctx.arc(c0[0], c0[1] - s * 0.1, s * 0.65, Math.PI, 0); ctx.stroke(); rond(c0[0], c0[1] + s * 0.6, 2.4, 0.8, 1, true);
    // les menaces
    const T = 2.4; let bloq = 0;
    for (let q = 0; q < 6; q++) { const tt = a + q * T / 6, t = tt % T, n = Math.floor(tt / T), th = bruit(q * 7 + n * 13) * TAU, ph = 0.2 + bruit(q * 3 + n * 5) * 1.1, dir = [Math.cos(th) * Math.cos(ph), -Math.sin(ph), Math.sin(th) * Math.cos(ph)];
      bloq += n; const pt = d => V(dir[0] * d, dir[1] * d, dir[2] * d);
      if (t < 1.2) { const d = lerp(2.6, R, t / 1.2), p = pt(d), p0 = pt(d + 0.3); trait([p0, p], false, 0.9, 0.9); rond(p[0], p[1], 3, 0.6, 1, true); }
      else if (t < 2.2) { const u = (t - 1.2) / 1, p = pt(R); eclat(p[0], p[1], 12, u, 7, th);
        // l'onde, à la surface du dôme
        const up = Math.abs(dir[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0], cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nz = v => { const l = Math.hypot(...v); return v.map(x => x / l); }, e1 = nz(cr(dir, up)), e2 = cr(dir, e1), rho = 0.06 + u * 0.55, L = [];
        for (let i = 0; i <= 28; i++) { const w = i / 28 * TAU, v = dir.map((x, j) => x * Math.cos(rho) + (e1[j] * Math.cos(w) + e2[j] * Math.sin(w)) * Math.sin(rho)); if (v[1] > 0.02) { if (L.length > 1) trait(L, false, 0.9, (1 - u) * 0.9); L.length = 0; continue; } L.push(V(v[0] * R, v[1] * R, v[2] * R)); }
        if (L.length > 1) trait(L, false, 0.9, (1 - u) * 0.9); } }
    const m = V(R * 1.25, 0.12, R * 0.6); mot(`${en() ? 'blocked' : 'bloqués'} : ${bloq}`, m[0], m[1] + k * 0.1, Math.max(10, k * 0.07), 0.8);
  }
}))();

// leadership & méthode : une route en perspective (la feuille de route) vers le soleil qui se lève ; les jalons défilent ;
// l'équipe avance derrière celui qui porte le drapeau
S.pilotage = (() => ({
  cles: () => [[0, -0.6], [-1, 0.75], [1, 0.75], [0, 0.4]],
  dessin(a, now) {
    const [k, lx] = large(1.35, 2.1), Pk = (x, y) => [G.cx + x * k, G.cy + y * k], hz = -0.55, wd = Math.min(1.6, lx * 0.85), route = (u, cote) => { const y = lerp(hz, 0.85, u), x = cote * lerp(0.04, wd, u) + Math.sin(u * 3 + 0.5) * 0.08 * (1 - u); return Pk(x, y); };
    // le soleil, à l'horizon : il se lève, ses rayons tournent
    const so = Pk(0, hz - 0.02 - 0.08 * sm(a / 4)), rs = k * 0.2; ctx.save(); ctx.beginPath(); ctx.rect(G.gauche, G.haut - 12, G.droite - G.gauche, Pk(0, hz)[1] - G.haut + 12); ctx.clip();
    rond(so[0], so[1], rs, 1, 1, 'nuit'); for (let j = 0; j < 14; j++) { const t = j / 14 * TAU + now * 0.15; trait([[so[0] + Math.cos(t) * rs * 1.25, so[1] + Math.sin(t) * rs * 1.25], [so[0] + Math.cos(t) * rs * (1.5 + 0.15 * Math.sin(now * 2 + j)), so[1] + Math.sin(t) * rs * (1.5 + 0.15 * Math.sin(now * 2 + j))]], false, 0.7, 0.8); } ctx.restore();
    [-1, 1].forEach(cote => { const L = []; for (let i = 0; i <= 30; i++) L.push(route(i / 30, cote)); trait(L, false, 1.2, 1); });
    trait([Pk(-lx * 1.1, hz), Pk(lx * 1.1, hz)], false, 0.6, 0.5);
    for (let j = 0; j < 7; j++) { const u = ((j / 7 + a * 0.12) % 1), e = u * u, A = route(e, 0), B = route(Math.min(1, e + 0.03 + e * 0.04), 0); trait([A, B], false, 0.4 + e, 0.9); }
    for (let j = 0; j < 4; j++) { const u = ((j / 4 + a * 0.08) % 1), e = u * u, cote = j % 2 ? 1 : -1, B = route(e, cote), h = k * (0.05 + e * 0.32), x = B[0] + cote * k * 0.05;
      trait([[x, B[1]], [x, B[1] - h]], false, 0.5 + e, 1); trait([[x, B[1] - h], [x + cote * h * 0.45, B[1] - h * 0.82], [x, B[1] - h * 0.64]], true, 0.5 + e, 1, true); }
    // l'équipe : sept silhouettes qui marchent, le chef devant avec son drapeau
    [[0, 0.3, 0.42, 1], [-0.3, 0.46, 0.36, 0], [0.3, 0.48, 0.36, 0], [-0.52, 0.66, 0.4, 0], [-0.16, 0.7, 0.42, 0], [0.18, 0.72, 0.42, 0], [0.5, 0.68, 0.4, 0]].forEach(([x, y, kk, chef], i) => { const b = Math.abs(Math.sin(now * 4 + i * 1.3)) * 0.02, p = Pk(x, y - b);
      gens(p, kk * k / G.s, { w: 1, bras: chef ? [1.3, -0.4] : [0.1 + Math.sin(now * 4 + i) * 0.3, 0.1 - Math.sin(now * 4 + i) * 0.3] });
      if (chef) { const m = [p[0] + k * 0.13, p[1] - k * 0.46], t = [m[0], m[1] - k * 0.36]; trait([m, t], false, 1, 1); const f = Math.sin(now * 5) * 0.02 * k; trait([t, [t[0] + k * 0.22, t[1] + k * 0.07 + f], [t[0], t[1] + k * 0.14]], true, 0.9, 1, true); } });
  }
}))();
S.rag = S.ia;

// la toile, l'écran du ciel, les outils ; puis : une scène existe-t-elle ?
return { S, pose(c, g, o) { ctx = c; G = g; O = o; } };
})();
