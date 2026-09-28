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

/* ——— les scènes ——— */
const S = {};

// 1 dev = 1 équipe : lui, seul ; pop ! des dizaines de gens jaillissent de sa silhouette et se rangent derrière lui, les mains en l'air qui s'agitent ;
// puis ils rentrent en lui, un à un (il grossit un peu à chaque fois), et ça recommence
S.equipe = (() => {
  const F = []; [[7, -0.3, 0.7, 0.6], [9, -0.5, 1.0, 0.5], [11, -0.68, 1.3, 0.42]].forEach(([n, y, lx, k], r) => { for (let i = 0; i < n; i++) F.push({ x: (i / (n - 1) - 0.5) * 2 * lx + (r % 2 ? 0.05 : 0), y, k, r, i: F.length }); });
  F.sort((a, b) => b.r - a.r);   // (le dernier rang d'abord : les plus proches passent devant)
  return {
    cles: () => [[0, -0.3], [-0.2, -0.36], [0.2, -0.36], [-0.44, 0.52], [0.44, 0.52], [0, 0.18]],
    dessin(a, now) {
      const Cy = 8, c = a < 0.6 ? -1 : (a - 0.6) % Cy, N = F.length;
      // chacun : sa sortie (0.4 → 2.2), sa rentrée (5.2 → 6.6)
      let absorbe = 0;
      F.forEach(f => { const t1 = 0.25 + f.i / N * 1.5, t2 = 5 + (N - f.i) / N * 1.3; let e;
        if (c < 0) return; if (c < t1) return; if (c < t1 + 0.5) e = sm((c - t1) / 0.5); else if (c < t2) e = 1; else if (c < t2 + 0.45) e = 1 - sm((c - t2) / 0.45); else { absorbe = Math.max(absorbe, 1 - (c - t2 - 0.45) * 3); return; }
        const pop = e < 1 ? 1 + 0.35 * Math.sin(Math.PI * e) : 1, x = lerp(0, f.x, e), y = lerp(0.05, f.y, e) - Math.sin(Math.PI * e) * 0.35, k = lerp(0.3, f.k, e) * pop;
        const ag = c > t1 + 0.4 && c < t2 ? c - t1 : 0, b = ag ? [1.1 + Math.sin(now * 7 + f.i * 1.3) * 0.5, 1.1 + Math.sin(now * 7.5 + f.i * 2.1 + 1) * 0.5] : null;
        perso(x, y + (ag ? Math.sin(now * 5 + f.i) * 0.015 : 0), k, { bras: b, w: 0.85, a: 0.55 + 0.45 * (1 - f.r / 3) });
        if (e > 0 && e < 1 && c < t2) eclat(X(x), Y(y) - G.s * k * 0.3, G.s * 0.08, e, 6, f.i);
        if (ag) brille(X(x), Y(y) - G.s * k * 0.5, 1.6, 0.6, false, now, f.i); });
      // lui : au premier plan ; il grandit un peu à chaque retour ; les bras en l'air pendant que tout le monde s'agite
      const ag = c > 2.2 && c < 5, s = 1 + 0.08 * absorbe, b = ag ? [1.25 + Math.sin(now * 3) * 0.25, 1.25 + Math.sin(now * 3 + 2) * 0.25] : null;
      perso(0, 0.3, 1.1 * s, { moi: true, bras: b, w: 1.2 });
      if (c >= 0 && c < 0.35) eclat(X(0), Y(-0.2), G.s * 0.3, c / 0.35, 10, 0.3);
      if (absorbe > 0) { style(0.8, absorbe * 0.8); ctx.beginPath(); ctx.arc(X(0), Y(-0.15), G.s * (0.5 + (1 - absorbe) * 0.3), 0, TAU); ctx.stroke(); }
      if (c > 0.3 && c < 1.4) mot('pop !', X(0.62 + Math.sin(c * 9) * 0.02), Y(-0.1), Math.max(13, G.s * 0.1), 1 - (c - 0.3) / 1.1);
    }
  };
})();

// plusieurs terminaux, plusieurs agents : une grille de terminaux par dizaines, vue de biais, qui défile sans fin ; chacun tape, un agent par fenêtre
S.terminaux = (() => {
  const COL = 7, W0 = 0.9, H0 = 0.56, GX = 1.02, GY = 0.7;
  return {
    cles: () => [[-0.45, -0.28], [0.45, -0.28], [0.45, 0.28], [-0.45, 0.28]],
    dessin(a, now) {
      const k = G.sw / 2.3, lac = -0.62, tan = 0.5, off = a * 0.32, i0 = Math.floor(off / GY), fr = off / GY - i0, cr = a * 4.5;
      const L = [];
      for (let r = -6; r <= 7; r++) for (let c = 0; c < COL; c++) {
        const x = (c - (COL - 1) / 2) * GX, y = (r - fr) * GY, d = Math.hypot(c - (COL - 1) / 2, r - fr);
        if (d > cr) continue;   // (elles naissent du centre vers les bords)
        const Q = [[x - W0 / 2, y - H0 / 2], [x + W0 / 2, y - H0 / 2], [x + W0 / 2, y + H0 / 2], [x - W0 / 2, y + H0 / 2]].map(([u, v]) => p3(u, v, 0, lac, tan, k));
        const z = (Q[0][2] + Q[2][2]) / 2, m = [(Q[0][0] + Q[2][0]) / 2, (Q[0][1] + Q[2][1]) / 2];
        if (m[0] < G.gauche || m[0] > G.droite || m[1] < G.haut - 20 || m[1] > G.bas + 20) continue;
        L.push({ Q, z, id: (r + i0) * COL + c, pop: c01((cr - d) / 0.8) });
      }
      L.sort((a, b) => a.z - b.z);
      L.forEach(({ Q, z, id, pop }) => {
        const al = (0.35 + 0.65 * c01((z + 2.2) / 3.2)) * pop, at = (u, v) => [lerp(lerp(Q[0][0], Q[1][0], u), lerp(Q[3][0], Q[2][0], u), v), lerp(lerp(Q[0][1], Q[1][1], u), lerp(Q[3][1], Q[2][1], u), v)];
        trait(Q, true, 0.8, al, true); trait([at(0, 0.18), at(1, 0.18)], false, 0.5, al * 0.8);
        [0.06, 0.11, 0.16].forEach(u => { const p = at(u, 0.09); rond(p[0], p[1], 1.2, 0.5, al, true); });
        // les lignes qui s'écrivent : une invite, puis la commande ; le curseur clignote ; parfois l'agent coche sa tâche
        const cyc = (now * 0.5 + bruit(id) * 3) % 3;
        for (let l = 0; l < 4; l++) { const v = 0.34 + l * 0.17, lg = 0.25 + 0.55 * bruit(id * 7 + l), p = c01(cyc * 1.6 - l * 0.8), a0 = at(0.07, v), a1 = at(0.12, v - 0.045), a2 = at(0.07, v - 0.09);
          if (p <= 0) break; trait([a2, a1, a0], false, 0.45, al * 0.9); const e = at(0.17 + lg * p, v - 0.045); trait([at(0.17, v - 0.045), e], false, 0.5, al * 0.85);
          if (p < 1 && Math.sin(now * 9) > 0) brille(e[0] + 2, e[1], 1.5, al, false, now, l); }
        if (cyc > 2.4) { const p = at(0.86, 0.72); coche(p[0], p[1], 5 * pop, (cyc - 2.4) / 0.3, 0.7); }
      });
    }
  };
})();

// des agents qui délèguent à des sous-agents : un agent principal ; ses agents poussent en branches, qui lancent leurs sous-agents ;
// les consignes descendent, chacun travaille, les résultats remontent ; l'agent principal recompose, coche : c'est livré
S.agents = (() => {
  const N = [{ x: 0, y: -0.72, n: 0, p: -1 }];
  [-0.66, 0, 0.66].forEach((x, i) => { N.push({ x, y: -0.16, n: 1, p: 0 }); const a = N.length - 1; [-0.24, 0, 0.24].forEach(d => { N.push({ x: x + d, y: 0.3, n: 2, p: a }); const b = N.length - 1; [-0.07, 0.07].forEach(e => N.push({ x: x + d + e, y: 0.7, n: 3, p: b })); }); });
  return {
    cles: () => [[0, -0.72], [-0.66, -0.16], [0, -0.16], [0.66, -0.16]],
    dessin(a, now) {
      const sway = Math.sin(now * 0.4) * 0.05, pos = q => P(q.x * (1 + sway * q.y), q.y), Cy = 5.5, c = a > 2.2 ? (a - 2.2) % Cy : -1;
      const nait = q => sm((a - q.n * 0.55) / 0.5);
      N.forEach(q => { if (q.p < 0) return; const e = nait(q); if (e <= 0) return; const A = pos(N[q.p]), B = pos(q); trait([A, [lerp(A[0], B[0], e), lerp(A[1], B[1], e)]], false, q.n === 3 ? 0.6 : 0.85, 0.8);
        // les influx : la consigne descend (0 → 1.4), le résultat remonte (2.6 → 4)
        if (c >= 0) { const d = c01((c - (q.n - 1) * 0.45) / 0.45), u = c01((c - 2.6 - (3 - q.n) * 0.45) / 0.45); if (d > 0 && d < 1) brille(lerp(A[0], B[0], d), lerp(A[1], B[1], d), 3, 1, false, now, q.n);
          if (u > 0 && u < 1) brille(lerp(B[0], A[0], u), lerp(B[1], A[1], u), 3.4, 1, true, now, q.n); } });
      N.forEach((q, i) => { const e = nait(q); if (e <= 0) return; const [x, y] = pos(q), pop = e < 1 ? 1 + 0.3 * Math.sin(Math.PI * e) : 1;
        if (q.n === 0) robot(x, y, G.s * 0.12 * pop, 1, Math.sin(now * 1.3) > 0.97);
        else if (q.n === 1) robot(x, y, G.s * 0.075 * pop, 1, Math.sin(now * 1.7 + i) > 0.97);
        else { const r = G.s * (q.n === 2 ? 0.04 : 0.028) * pop; rond(x, y, r, 0.8, 1, 'nuit');
          // (au travail : un petit arc qui tourne)
          if (c > 1.2 && c < 2.9) { style(0.6, 0.9); ctx.beginPath(); ctx.arc(x, y, r * 1.7, now * 6 + i, now * 6 + i + 2); ctx.stroke(); } } });
      if (c > 3.9 && c < 5.2) { const [x, y] = pos(N[0]); coche(x + G.s * 0.22, y - G.s * 0.14, G.s * 0.06, (c - 3.9) / 0.4, 1); eclat(x, y, G.s * 0.16, (c - 3.9) / 0.6, 9); }
    }
  };
})();

// des skills et des plugins sur mesure : un noyau hexagonal ; les outils arrivent de partout et s'y branchent (clac, étincelles) ; le noyau s'allume ;
// de temps en temps, un outil se débranche et un nouveau prend sa place (l'outillage change, la méthode reste)
S.skills = (() => {
  const LAB = () => en() ? ['skill', '/command', 'agent', 'MCP', 'plugin', 'skill'] : ['skill', '/commande', 'agent', 'MCP', 'plugin', 'skill'];
  return {
    cles: () => [0, 1, 2, 3, 4, 5].map(i => { const t = i / 6 * TAU - Math.PI / 2; return [Math.cos(t) * 0.3, Math.sin(t) * 0.3]; }),
    dessin(a, now) {
      const lab = LAB(), R0 = 0.3, sw = G.sw / G.s;
      let nb = 0;
      lab.forEach((l, i) => { const t = i / 6 * TAU - Math.PI / 2 + 0.52, t1 = 0.3 + i * 0.5, e = sm((a - t1) / 0.7), cyc = a > 5 ? (a - 5 - i * 1.3) % 7.8 : -1, sort = cyc > 0 && cyc < 1.3 ? Math.sin(Math.PI * cyc / 1.3) : 0;
        if (a < t1) return; const R = lerp(1.25 * Math.min(1.4, sw), 0.62, e) + sort * 0.5, x = Math.cos(t) * R, y = Math.sin(t) * R * 0.85;
        if (e >= 1 && !sort) nb++;
        const lk = e >= 1 ? 1 - sort : 0; if (lk > 0.05) { const A = P(Math.cos(t) * R0 * 1.05, Math.sin(t) * R0 * 0.9), B = P(x - Math.cos(t) * 0.14, y - Math.sin(t) * 0.08);
          trait([A, B], false, 0.8, lk); const v = (now * 0.8 + i / 6) % 1; brille(lerp(A[0], B[0], v), lerp(A[1], B[1], v), 2.4, lk, false, now, i); }
        const w = Math.max(0.3, (l.length * 0.045 + 0.1)), h = 0.17; boite(X(x - w / 2), Y(y - h / 2), w * G.s, h * G.s, h * G.s * 0.3, 0.9, 1, true);
        mot(l, X(x), Y(y), Math.max(10, G.s * 0.075), 1);
        const dk = a - t1 - 0.7; if (dk > 0 && dk < 0.6) eclat(X(Math.cos(t) * 0.5), Y(Math.sin(t) * 0.45), G.s * 0.06, dk / 0.6, 7, i); });
      // le noyau : ses anneaux s'allument avec le nombre d'outils branchés
      const H = [0, 1, 2, 3, 4, 5].map(i => { const t = i / 6 * TAU - Math.PI / 2 + now * 0.2; return P(Math.cos(t) * R0, Math.sin(t) * R0); });
      trait(H, true, 1.2, 1, true);
      for (let k = 0; k < nb; k++) { style(0.6, 0.35 + 0.1 * k); ctx.beginPath(); ctx.arc(X(0), Y(0), G.s * (0.08 + k * 0.03), 0, TAU); ctx.stroke(); }
      brille(X(0), Y(0), 3 + nb * 0.8, 0.9, nb >= 6, now, 0);
    }
  };
})();

// tout tester, tout mesurer : une course. Cinq couloirs, cinq concurrents (harness, plugins…) ; départ, chrono, arrivée ; le gagnant est gardé (coche),
// les autres retournent au départ ; et on relance une course, encore et encore (ce n'est jamais le même qui gagne)
S.bench = (() => ({
  cles: () => [[-0.95, -0.55], [-0.95, 0.55], [0.95, -0.55], [0.95, 0.55]],
  dessin(a, now) {
    const Cy = 5.2, n = Math.floor(a / Cy), c = a % Cy, x0 = -Math.min(1.35, G.sw / G.s * 0.9), x1 = -x0, ys = [-0.44, -0.22, 0, 0.22, 0.44];
    // la piste, le départ, l'arrivée en damier, le chrono
    ys.concat([0.55]).forEach(y => trait([P(x0 - 0.05, y - 0.11), P(x1 + 0.08, y - 0.11)], false, 0.5, 0.35));
    trait([P(x0, -0.55), P(x0, 0.55)], false, 0.9, 0.9);
    for (let k = 0; k < 10; k++) { const y = -0.55 + k * 0.11; ctx.globalAlpha = 1; ctx.fillStyle = `rgb(${BL})`; if (k % 2 === 0) ctx.fillRect(X(x1), Y(y), G.s * 0.055, G.s * 0.11); else ctx.fillRect(X(x1) + G.s * 0.055, Y(y), G.s * 0.055, G.s * 0.11); }
    const ch = P(0, -0.78); rond(ch[0], ch[1], G.s * 0.11, 1, 1, 'nuit'); trait([[ch[0], ch[1] - G.s * 0.11], [ch[0], ch[1] - G.s * 0.15]], false, 1, 1);
    const ang = c < 4 ? c * 3 : 12; trait([ch, [ch[0] + Math.sin(ang) * G.s * 0.08, ch[1] - Math.cos(ang) * G.s * 0.08]], false, 1, 1);
    // les concurrents : chacun sa vitesse (et ses à-coups) à chaque course
    const v = ys.map((_, i) => 0.62 + 0.4 * bruit(n * 11 + i * 3.7)), gagnant = v.indexOf(Math.max(...v));
    ys.forEach((y, i) => { const f = c < 0.5 ? 0 : Math.min(1, (c - 0.5) * v[i] * 0.33 + 0.02 * Math.sin(c * 5 + i)), e = sm(f), x = lerp(x0 + 0.08, x1 - 0.06, e), A = P(x, y);
      if (f > 0 && f < 1) trait([P(Math.max(x0 + 0.08, x - 0.25 * v[i]), y), A], false, 0.6, 0.5);
      robot(A[0], A[1], G.s * 0.045, 1, false);
      if (f >= 1 && i === gagnant) { coche(X(x1 + 0.3), Y(y), G.s * 0.05, (c - 0.5 - 1 / (v[i] * 0.33)) / 0.3, 1); brille(A[0], A[1] - G.s * 0.08, 3.5, 1, true, now, i); } });
  }
}))();

// une flotte d'agents sur un même produit : un essaim tourne autour d'un immeuble (MARKO) et l'élève étage après étage, chacun apportant son bloc
S.flotte = (() => {
  const E = Array.from({ length: 34 }, (_, i) => ({ r: 0.55 + bruit(i) * 0.6, v: (0.5 + bruit(i * 3) * 0.8) * (i % 3 ? 1 : -1), ph: bruit(i * 7) * TAU, h: -0.7 + bruit(i * 5) * 1.3, i }));
  return {
    cles: () => [[-0.22, 0.7], [0.22, 0.7], [-0.22, 0.52], [0.22, 0.52]],
    dessin(a, now) {
      const lac = 0.6 + a * 0.15, tan = 0.35, base = 0.7, eh = 0.16, n = Math.min(9, Math.floor(a / 0.75) + 1), f = c01((a % 0.75) / 0.4), haut = base - (n - 1 + (n < 9 ? f : 1)) * eh;
      // l'immeuble : ses étages empilés (le dernier se pose)
      const cube = (y0, y1, al) => { const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [p3(x * 0.2, y0, z * 0.2, lac, tan), p3(x * 0.2, y1, z * 0.2, lac, tan)]);
        trait(C.map(c => c[0]), true, 0.9, al, true); trait(C.map(c => c[1]), true, 0.9, al); C.forEach(c => trait(c, false, 0.9, al)); };
      for (let k = 0; k < n; k++) { const y1 = base - k * eh, y0 = k === n - 1 && n < 9 ? y1 - eh * f : y1 - eh; cube(y0, y1, 1); }
      if (n >= 9) { const t = p3(0, haut, 0, lac, tan), m = [t[0], t[1] - G.s * 0.28]; trait([t, m], false, 1, 1); trait([m, [m[0] + G.s * 0.14, m[1] + G.s * (0.05 + Math.sin(now * 5) * 0.015)], [m[0], m[1] + G.s * 0.1]], true, 0.9, 1); mot('MARKO', t[0], t[1] + G.s * 0.08, Math.max(10, G.s * 0.07), 0.9); }
      // l'essaim : chacun son orbite ; de temps en temps, l'un plonge vers le sommet avec un bloc
      E.forEach(q => { const t = now * q.v + q.ph, dv = ((now * 0.9 + q.i * 0.37) % 4.5), porte = dv < 1.1, e = porte ? Math.sin(Math.PI * dv / 1.1) : 0;
        const x = Math.cos(t) * q.r * (1 - e * 0.9), z = Math.sin(t) * q.r * (1 - e * 0.9), y = lerp(q.h, haut - 0.08, e), p = p3(x, y, z, lac * 0.3, 0.25), al = 0.45 + 0.55 * c01((p[2] + 1) / 2);
        const pp = p3(Math.cos(t - 0.15 * Math.sign(q.v)) * q.r * (1 - e * 0.9), y, Math.sin(t - 0.15 * Math.sign(q.v)) * q.r * (1 - e * 0.9), lac * 0.3, 0.25);
        trait([pp, p], false, 0.5, al * 0.5); rond(p[0], p[1], G.s * 0.022, 0.7, al, true);
        if (porte && e > 0.05) { ctx.globalAlpha = al; ctx.strokeRect(p[0] - 3, p[1] + 4, 6, 5); } });
    }
  };
})();

// la vitesse sans perdre le contrôle : un tapis ; chaque changement de code passe les portiques (tests, CI, scanners) ; ceux qui échouent tombent,
// les autres arrivent devant l'humain, qui regarde, hoche la tête et tamponne : ✓, fusionné
S.gardefous = (() => {
  const LAB = () => en() ? ['tests', 'CI review', 'scanners', 'human'] : ['tests', 'revue CI', 'scanners', 'humain'];
  return {
    cles: () => [[-0.75, -0.25], [-0.2, -0.25], [0.35, -0.25], [0.95, -0.3]],
    dessin(a, now) {
      const yT = 0.28, x0 = -Math.min(1.3, G.sw / G.s * 0.85), xs = [-0.75, -0.2, 0.35], xH = 0.95, lab = LAB();
      trait([P(x0, yT + 0.12), P(xH - 0.12, yT + 0.12)], false, 1, 1); for (let k = 0; k < 16; k++) { const x = x0 + ((k * 0.16 + a * 0.3) % (xH - 0.12 - x0)); rond(X(x), Y(yT + 0.16), 2, 0.6, 0.6); }
      // les cartes (un changement de code) : elles avancent ; à chaque portique, un faisceau les lit
      const T = 1.1, nb = Math.floor(a / T) + 1;
      for (let k = Math.max(0, nb - 8); k < nb; k++) { const t = a - k * T, x = x0 + t * 0.34, rate = bruit(k * 13.3) < 0.3 ? 1 + Math.floor(bruit(k * 5.1) * 3) : 0, g = rate ? xs[rate - 1] : 99;
        let px = x, py = yT, tomb = 0; if (x > g + 0.05) { tomb = (t - (g + 0.05 - x0) / 0.34); px = g + 0.05 + tomb * 0.2; py = yT + tomb * tomb * 2.2; if (py > 1.1) continue; }
        if (px > xH - 0.2) { const m = c01((px - xH + 0.2) / 0.15); if (m >= 1) continue; px = lerp(px, xH - 0.15, m); py = yT - m * 0.4; }
        const w = 0.2, h = 0.13; boite(X(px - w / 2), Y(py - h), w * G.s, h * G.s, 3, 0.8, 1, true); trait([P(px - 0.07, py - h * 0.65), P(px + 0.05, py - h * 0.65)], false, 0.5, 0.9); trait([P(px - 0.07, py - h * 0.35), P(px + 0.02, py - h * 0.35)], false, 0.5, 0.9);
        if (tomb > 0 && tomb < 0.6) { style(1, 1); const c = P(px + 0.1, py - 0.16); trait([[c[0] - 5, c[1] - 5], [c[0] + 5, c[1] + 5]], false, 1, 1); trait([[c[0] + 5, c[1] - 5], [c[0] - 5, c[1] + 5]], false, 1, 1); } }
      // les portiques : une arche, son nom, son faisceau qui passe
      xs.forEach((g, i) => { trait([P(g - 0.1, yT + 0.1), P(g - 0.1, yT - 0.3), P(g + 0.1, yT - 0.3), P(g + 0.1, yT + 0.1)], false, 1, 1); mot(lab[i], X(g), Y(yT - 0.4), Math.max(10, G.s * 0.07), 0.85);
        const v = (now * 1.4 + i) % 1; trait([P(g - 0.08, yT - 0.28 + v * 0.36), P(g + 0.08, yT - 0.28 + v * 0.36)], false, 0.7, 0.8); });
      // l'humain : il regarde ce qui arrive, hoche la tête, tamponne ; les changements validés s'empilent
      const hoche = Math.max(0, Math.sin(now * 2.2)) ** 6; perso(xH, yT - 0.05 + hoche * 0.03, 0.55, { w: 1 }); mot(lab[3], X(xH), Y(yT + 0.3), Math.max(10, G.s * 0.07), 0.85);
      if (hoche > 0.3) coche(X(xH + 0.28), Y(yT - 0.35), G.s * 0.05, hoche, 1);
      const pile = Math.min(6, Math.floor(a / 2)); for (let k = 0; k < pile; k++) boite(X(xH + 0.28), Y(yT + 0.08 - k * 0.07), G.s * 0.16, G.s * 0.06, 2, 0.7, 0.9, true);
    }
  };
})();

// six couches, comme une puce : la puce s'ouvre en éclaté, couche par couche ; chacune a son nom (l'IA au cœur, la plus grande et la plus vive)
S.puce = (() => {
  const LAB = () => en() ? ['Front', 'AI', 'Back-end', 'DevOps', 'Security', 'Leadership'] : ['Front', 'IA', 'Back-end', 'DevOps', 'Sécurité', 'Leadership'];
  return {
    cles: () => [[-0.45, 0], [0.45, 0], [0, -0.3], [0, 0.3]],
    dessin(a, now) {
      const lac = 0.7 + a * 0.18, tan = 0.55, lab = LAB(), ec = sm(a / 1.4) * (0.2 + 0.05 * Math.sin(now * 0.9));
      lab.forEach((l, k) => { const s = k === 1 ? 0.55 : 0.46, y = (k - 2.5) * ec, Q = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([x, z]) => p3(x, y, z, lac, tan));
        trait(Q, true, k === 1 ? 1.3 : 0.9, k === 1 ? 1 : 0.8, true);
        if (k === 1) { const q = [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]].map(([x, z]) => p3(x, y, z, lac, tan)); trait(q, true, 0.9, 1);
          for (let j = 0; j < 12; j++) { const d = [[1, 0], [0, 1], [-1, 0], [0, -1]][j % 4], o = (Math.floor(j / 4) - 1) * 0.2, A = p3(d[0] * s + d[1] * o, y, d[1] * s + d[0] * o, lac, tan), B = p3(d[0] * (s + 0.14) + d[1] * o, y, d[1] * (s + 0.14) + d[0] * o, lac, tan); trait([A, B], false, 0.7, 0.9);
            const v = (now * 0.7 + j * 0.13) % 1; if (v < 0.5) brille(lerp(A[0], B[0], v * 2), lerp(A[1], B[1], v * 2), 1.8, 0.9, false, now, j); } }
        // (son nom, à droite, au bout d'un trait)
        const R = Q.reduce((b, q) => q[0] > b[0] ? q : b, Q[0]), tx = G.cx + G.s * 1.05; trait([R, [tx - 6, R[1]]], false, 0.4, 0.5);
        mot(l, tx, R[1], Math.max(11, G.s * (k === 1 ? 0.1 : 0.075)), k === 1 ? 1 : 0.8, 'left'); });
    }
  };
})();

// IA & données : un document est lu (un faisceau) ; ses mots s'envolent en points dans un nuage (les vecteurs) ; une question arrive,
// les points proches s'allument et se relient ; la réponse file vers un agent, qui agit (son engrenage tourne) et coche
S.ia = (() => {
  const Nn = 60, V = Array.from({ length: Nn }, (_, i) => { const y = 1 - (i + 0.5) / Nn * 2, r = Math.sqrt(1 - y * y), t = i * 2.39996; return [Math.cos(t) * r, y, Math.sin(t) * r]; });
  const proches = [3, 11, 17, 29, 38];
  return {
    cles: () => [[-0.95, -0.3], [-0.95, 0.35], [0, 0], [0.95, 0]],
    dessin(a, now) {
      const xd = -Math.min(1.1, G.sw / G.s * 0.75), xa = -xd, Cy = 6.5, c = a % Cy, lac = now * 0.3, R = 0.4;
      // le document, et son faisceau de lecture
      boite(X(xd - 0.18), Y(-0.3), G.s * 0.36, G.s * 0.62, 4, 1, 1, true); for (let l = 0; l < 6; l++) trait([P(xd - 0.12, -0.2 + l * 0.09), P(xd + 0.12 - (l % 3) * 0.05, -0.2 + l * 0.09)], false, 0.55, 0.8);
      const lb = -0.28 + ((now * 0.35) % 1) * 0.58; trait([P(xd - 0.22, lb), P(xd + 0.22, lb)], false, 1.1, 1); brille(X(xd + 0.22), Y(lb), 3, 1, false, now, 1);
      // les mots qui s'envolent vers le nuage
      for (let k = 0; k < 5; k++) { const v = (now * 0.6 + k / 5) % 1, A = P(xd + 0.2, lb), B = P(0, 0); brille(lerp(A[0], B[0], sm(v)), lerp(A[1], B[1], sm(v)) - Math.sin(Math.PI * v) * G.s * 0.15, 1.8, 1 - v * 0.5, false, now, k); }
      // le nuage de vecteurs (il tourne) ; la question ; les voisins qui s'allument
      const Q = V.map(([x, y, z]) => p3(x * R, y * R, z * R, lac, 0.3)); const nb = Math.min(Nn, 20 + Math.floor(a * 8));
      Q.slice(0, nb).forEach((q, i) => rond(q[0], q[1], 1.4 + (q[2] + 1) * 0.6, 0.5, 0.45 + 0.4 * c01((q[2] + 0.5)), true));
      const qu = c01((c - 1.2) / 0.8), qA = P(0.5, -0.75), on = c > 2 && c < 5.2;
      if (c > 1 && c < 2.2) { mot('?', qA[0], qA[1], Math.max(16, G.s * 0.16), 1); const B = P(0, 0); if (qu > 0) brille(lerp(qA[0], B[0], qu), lerp(qA[1], B[1], qu), 3.5, 1, true, now, 2); }
      if (on) { proches.forEach((i, k) => { const q = Q[i], r = Q[proches[(k + 1) % 5]]; trait([q, r], false, 0.7, 0.9); brille(q[0], q[1], 3, 1, false, now, i); }); }
      // la réponse file vers l'agent ; il agit
      const ag = P(xa, 0.02); robot(ag[0], ag[1], G.s * 0.09, 1, Math.sin(now * 1.5) > 0.97);
      if (c > 3 && c < 4.2) { const v = (c - 3) / 1.2, B = P(0.3, 0); brille(lerp(B[0], ag[0] - G.s * 0.1, v), lerp(B[1], ag[1], v), 3.2, 1, true, now, 3); }
      const eg = [ag[0], ag[1] + G.s * 0.26], rot = c > 4 ? (c - 4) * 4 : 0; style(0.9, 1); ctx.beginPath(); for (let k = 0; k < 16; k++) { const t = rot + k / 16 * TAU, r = G.s * (k % 2 ? 0.05 : 0.065); ctx.lineTo(eg[0] + Math.cos(t) * r, eg[1] + Math.sin(t) * r); } ctx.closePath(); ctx.stroke();
      if (c > 4.6) coche(ag[0] + G.s * 0.17, ag[1] - G.s * 0.14, G.s * 0.05, (c - 4.6) / 0.4, 1);
    }
  };
})();

// front & interfaces : une page se monte toute seule (l'en-tête glisse, les cartes se retournent en 3D, le bouton arrive) ;
// un curseur clique sur le bouton (une onde), et un cube en 3D jaillit de l'écran, tourne, puis y retourne
S.front = (() => ({
  cles: () => [[-1, -0.62], [1, -0.62], [1, 0.62], [-1, 0.62]],
  dessin(a, now) {
    const Cy = 7, c = a % Cy, w = Math.min(1.25, G.sw / G.s * 0.8);
    boite(X(-w), Y(-0.62), 2 * w * G.s, 1.24 * G.s, 8, 1.1, 1, true); trait([P(-w, -0.46), P(w, -0.46)], false, 0.8, 0.9); [0, 1, 2].forEach(i => rond(X(-w + 0.08 + i * 0.07), Y(-0.54), 2.2, 0.6, 1, true));
    const e1 = sm((a - 0.2) / 0.5); if (e1 > 0) boite(X(-w + 0.08 - (1 - e1) * 0.6), Y(-0.38), (2 * w - 0.16) * G.s, 0.12 * G.s, 3, 0.8, 1);
    [0, 1, 2].forEach(i => { const e = sm((a - 0.6 - i * 0.3) / 0.5), fl = Math.cos((1 - e) * Math.PI / 2), cw = (2 * w - 0.4) / 3, x = -w + 0.12 + i * (cw + 0.08); if (e <= 0) return;
      boite(X(x + cw / 2 - cw / 2 * fl), Y(-0.18), cw * fl * G.s, 0.42 * G.s, 5, 0.8, 1, true); if (fl > 0.6) { trait([P(x + 0.05, 0.12), P(x + cw * 0.7, 0.12)], false, 0.5, 0.8); rond(X(x + cw / 2), Y(-0.02), G.s * 0.06, 0.6, 0.9); } });
    const eb = sm((a - 1.6) / 0.4), bx = 0.55 * w, by = 0.44; if (eb > 0) { boite(X(bx - 0.18), Y(by - 0.06), 0.36 * G.s * eb, 0.12 * G.s, 6, 0.9, 1, true); }
    // le curseur : il va au bouton, clique ; l'onde ; le cube jaillit
    const vc = sm((c - 1.8) / 1), cu = P(lerp(-0.2, bx, vc), lerp(0.8, by, vc)), clic = c - 2.8;
    if (c > 1.8) trait([cu, [cu[0], cu[1] + G.s * 0.12], [cu[0] + G.s * 0.035, cu[1] + G.s * 0.085], [cu[0] + G.s * 0.08, cu[1] + G.s * 0.08]], true, 0.9, 1, true);
    if (clic > 0 && clic < 0.6) { style(0.8, 1 - clic / 0.6); ctx.beginPath(); ctx.arc(cu[0], cu[1], G.s * 0.25 * clic / 0.6, 0, TAU); ctx.stroke(); }
    const ec = clic > 0.2 ? Math.sin(Math.PI * c01((clic - 0.2) / 3.4)) : 0;
    if (ec > 0.01) { const s = 0.12 + ec * 0.32, lac = now * 1.1, tan = now * 0.7, cz = ec * 1.2, cx0 = 0, cy0 = -0.05 - ec * 0.1;
      const V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => { const q = p3(x * s, y * s, z * s, lac, tan); return [q[0] + X(cx0) - G.cx, q[1] + Y(cy0) - G.cy]; });
      [[0, 1, 2, 3], [4, 5, 6, 7]].forEach(f => trait(f.map(i => V[i]), true, 1.1, 1, true)); [0, 1, 2, 3].forEach(i => trait([V[i], V[i + 4]], false, 1.1, 1)); V.forEach((v, i) => brille(v[0], v[1], 2, ec, false, now, i)); }
  }
}))();

// back-end & données : les requêtes arrivent ; l'API les trie en files de tâches ; des engrenages les traitent ; chaque client a sa propre base
S.back = (() => ({
  cles: () => [[-0.62, -0.5], [-0.62, 0.5], [0.85, -0.45], [0.85, 0.45]],
  dessin(a, now) {
    const wd = Math.min(1.35, G.sw / G.s * 0.9), xA = -wd * 0.5, xW = wd * 0.35, xD = wd * 0.8, ys = [-0.4, 0, 0.4];
    boite(X(xA - 0.1), Y(-0.55), 0.2 * G.s, 1.1 * G.s, 6, 1.1, 1, true); mot('API', X(xA), Y(0), Math.max(11, G.s * 0.09), 1);
    ys.forEach((y, i) => { trait([P(xA + 0.12, y), P(xW - 0.12, y)], false, 0.5, 0.4);
      // l'engrenage de la file (il tourne)
      style(0.9, 1); ctx.beginPath(); for (let k = 0; k < 16; k++) { const t = now * 2 * (i % 2 ? -1 : 1) + k / 16 * TAU, r = G.s * (k % 2 ? 0.055 : 0.075); ctx.lineTo(X(xW) + Math.cos(t) * r, Y(y) + Math.sin(t) * r); } ctx.closePath(); ctx.stroke(); rond(X(xW), Y(y), G.s * 0.02, 0.8, 1);
      // la base du client : un cylindre qui se remplit
      const cx = X(xD), cy = Y(y), rw = G.s * 0.13, rh = G.s * 0.04, hh = G.s * 0.2; ctx.beginPath(); ctx.ellipse(cx, cy - hh / 2, rw, rh, 0, 0, TAU); style(1, 1); ctx.stroke();
      trait([[cx - rw, cy - hh / 2], [cx - rw, cy + hh / 2]], false, 1, 1); trait([[cx + rw, cy - hh / 2], [cx + rw, cy + hh / 2]], false, 1, 1); ctx.beginPath(); ctx.ellipse(cx, cy + hh / 2, rw, rh, 0, 0, Math.PI); ctx.stroke();
      const nv = Math.floor((a * 1.5 + i) % 5); for (let l = 0; l < nv; l++) { ctx.beginPath(); ctx.ellipse(cx, cy + hh / 2 - (l + 1) * hh / 6, rw, rh, 0, 0, Math.PI); style(0.5, 0.6); ctx.stroke(); }
      mot(['A', 'B', 'C'][i], cx + rw + 12, cy, Math.max(10, G.s * 0.07), 0.8, 'left'); });
    // les requêtes : elles entrent, l'API les range dans la file de leur client, l'engrenage les traite, elles vont dans leur base
    for (let k = 0; k < 14; k++) { const t = (now * 0.35 + k / 14) % 1, cl = Math.floor(bruit(k * 3.3) * 3), y = ys[cl], y0 = -0.5 + bruit(k * 9.1);
      let x, yy; if (t < 0.3) { x = lerp(-wd - 0.2, xA - 0.12, t / 0.3); yy = lerp(y0 * 0.6, y0 * 0.6, 0); } else if (t < 0.7) { x = lerp(xA + 0.12, xW - 0.1, (t - 0.3) / 0.4); yy = y; } else { x = lerp(xW + 0.1, xD - 0.15, (t - 0.7) / 0.3); yy = y; }
      if (t < 0.7 && t > 0.3) { boite(X(x) - 5, Y(yy) - 4, 10, 8, 2, 0.6, 1, true); } else rond(X(x), Y(yy), 2.6, 0.6, 1, true); }
  }
}))();

// DevOps & cloud : la boucle sans fin ; des conteneurs en font le tour (construire, tester, déployer, surveiller) ; dessous, le pouls du service
S.devops = (() => ({
  cles: () => [[-1, 0], [1, 0], [0, 0], [-0.5, -0.35]],
  dessin(a, now) {
    const sx = Math.min(1.3, G.sw / G.s * 0.85), pt = t => { const d = 1 + Math.sin(t) ** 2; return P(sx * Math.cos(t) / d, 0.95 * Math.sin(t) * Math.cos(t) / d - 0.08); };
    const L = []; for (let i = 0; i <= 80; i++) L.push(pt(i / 80 * TAU)); trait(L, false, 1.3, 1);
    const lab = en() ? ['build', 'test', 'deploy', 'monitor'] : ['build', 'test', 'déploie', 'surveille'];
    [0.3, 1.2, 3.45, 4.35].forEach((t, i) => { const p = pt(t); mot(lab[i], p[0], p[1] + (i % 2 ? G.s * 0.16 : -G.s * 0.16), Math.max(10, G.s * 0.068), 0.85); });
    for (let k = 0; k < 10; k++) { const t = now * 0.55 + k / 10 * TAU, p = pt(t), q = pt(t + 0.05), an = Math.atan2(q[1] - p[1], q[0] - p[0]), s = G.s * 0.05;
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(an); boite(-s, -s * 0.65, s * 2, s * 1.3, 2, 0.8, 1, true); trait([[-s * 0.5, -s * 0.65], [-s * 0.5, s * 0.65]], false, 0.4, 0.8); trait([[s * 0.2, -s * 0.65], [s * 0.2, s * 0.65]], false, 0.4, 0.8); ctx.restore(); }
    // le pouls : il défile, un battement de temps en temps
    const y0 = 0.62, M = []; for (let i = 0; i <= 60; i++) { const u = i / 60, t = u * 3 - now * 0.8, f = t - Math.floor(t), b = f > 0.4 && f < 0.5 ? Math.sin((f - 0.4) / 0.1 * TAU) * 0.12 : 0; M.push(P(-sx + u * 2 * sx, y0 - b)); } trait(M, false, 0.8, 0.8);
  }
}))();

// sécurité & qualité : un bouclier en dôme autour des données (un cadenas) ; le radar balaie ; ce qui arrive du dehors est repéré, rebondit, éclate
S.secu = (() => ({
  cles: () => [0, 1, 2, 3, 4, 5].map(i => [Math.cos(i / 6 * TAU) * 0.6, Math.sin(i / 6 * TAU) * 0.6]),
  dessin(a, now) {
    const R = 0.6, sw = now * 1.4;
    rond(X(0), Y(0), G.s * R, 1.3, 1); rond(X(0), Y(0), G.s * R * 1.06, 0.6, 0.5); [0.2, 0.4].forEach(r => rond(X(0), Y(0), G.s * r, 0.4, 0.3));
    for (let k = 0; k < 8; k++) { const t = sw - k * 0.06; trait([P(0, 0), P(Math.cos(t) * R, Math.sin(t) * R)], false, 0.9 - k * 0.08, 0.9 - k * 0.11); }
    // le cadenas, au centre
    const s = 0.12; boite(X(-s), Y(-0.02), 2 * s * G.s, 1.5 * s * G.s, 4, 1, 1, true); style(1, 1); ctx.beginPath(); ctx.arc(X(0), Y(-0.02), G.s * s * 0.65, Math.PI, 0); ctx.stroke(); rond(X(0), Y(0.07), 2.4, 0.8, 1, true);
    // les menaces : elles arrivent de loin, touchent le bouclier, éclatent ; repérées par le radar au passage
    for (let k = 0; k < 7; k++) { const T = 2.6, t = (a + k * T / 7) % T, n = Math.floor((a + k * T / 7) / T), ang = bruit(k * 7 + n * 13) * TAU, d = lerp(1.35, R, c01(t / 1.4)), p = P(Math.cos(ang) * d, Math.sin(ang) * d * 0.9);
      if (t < 1.4) { trait([P(Math.cos(ang) * (d + 0.12), Math.sin(ang) * (d + 0.12) * 0.9), p], false, 0.8, 0.9); rond(p[0], p[1], 2.4, 0.6, 1, true);
        const vu = Math.abs(Math.atan2(Math.sin(sw - ang), Math.cos(sw - ang))) < 0.4; if (vu) rond(p[0], p[1], 9, 0.6, 0.9); }
      else if (t < 2) { eclat(p[0], p[1], 10, (t - 1.4) / 0.6, 7, ang); } }
  }
}))();

// leadership & méthode : une route en perspective (la feuille de route) ; les jalons défilent ; l'équipe avance derrière celui qui porte le drapeau
S.pilotage = (() => ({
  cles: () => [[0, -0.6], [-1, 0.75], [1, 0.75], [0, 0.4]],
  dessin(a, now) {
    const hz = -0.62, wd = Math.min(1.3, G.sw / G.s * 0.85), route = (u, cote) => { const y = lerp(hz, 0.8, u), x = cote * lerp(0.04, wd, u) + Math.sin(u * 3 + 0.5) * 0.08 * (1 - u); return P(x, y); };
    [-1, 1].forEach(cote => { const L = []; for (let i = 0; i <= 30; i++) L.push(route(i / 30, cote)); trait(L, false, 1.2, 1); });
    trait([P(-wd * 1.1, hz), P(wd * 1.1, hz)], false, 0.5, 0.4);
    // la ligne du milieu et les jalons : ils viennent vers nous (la route avance)
    for (let k = 0; k < 7; k++) { const u = ((k / 7 + a * 0.12) % 1), e = u * u, A = route(e, 0), B = route(Math.min(1, e + 0.03 + e * 0.04), 0); trait([A, B], false, 0.4 + e, 0.9); }
    for (let k = 0; k < 3; k++) { const u = ((k / 3 + a * 0.08) % 1), e = u * u, cote = k % 2 ? 1 : -1, B = route(e, cote), h = G.s * (0.05 + e * 0.3), x = B[0] + cote * G.s * 0.04;
      trait([[x, B[1]], [x, B[1] - h]], false, 0.5 + e, 1); trait([[x, B[1] - h], [x + cote * h * 0.45, B[1] - h * 0.82], [x, B[1] - h * 0.64]], true, 0.5 + e, 1, true); }
    // l'équipe : cinq silhouettes qui marchent (elles dodelinent), le chef devant avec son drapeau
    [[0, 0.3, 0.42, 1], [-0.28, 0.5, 0.36, 0], [0.26, 0.52, 0.36, 0], [-0.13, 0.7, 0.4, 0], [0.14, 0.72, 0.4, 0]].forEach(([x, y, k, chef], i) => { const b = Math.abs(Math.sin(now * 4 + i * 1.3)) * 0.02;
      perso(x, y - b, k, { w: 1, bras: chef ? [1.3, -0.4] : null });
      if (chef) { const m = [X(x + 0.13), Y(y - b - 0.12)], t = [m[0], m[1] - G.s * 0.36]; trait([m, t], false, 1, 1); const f = Math.sin(now * 5) * 0.02; trait([t, P(x + 0.34, y - b - 0.4 + f), [t[0], t[1] + G.s * 0.14]], true, 0.9, 1, true); } });
  }
}))();
S.rag = S.ia;

// la toile, l'écran du ciel, les outils ; puis : une scène existe-t-elle ?
return { S, pose(c, g, o) { ctx = c; G = g; O = o; } };
})();
