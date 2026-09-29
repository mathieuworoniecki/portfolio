/* La nuée : des milliers d'étoiles, sur tout l'écran, qui se transforment d'une scène à l'autre
   (29/09, 05:44, Mathieu : « chaque visualisation doit être mind blowing : pas juste un truc qui bouge, à chaque élément on rentre dans un univers,
   les choses bougent, se mettent en forme ; tu te limites à un seul espace limité pour une animation, je veux un truc qui nous emporte,
   à l'image de la scène galaxie qu'on a créée (HUman) »).
   Comme la galaxie de HUman : une seule nuée, persistante ; chaque scène lui donne sa forme (FORMES, plus bas), en 3D, sur tout l'écran ;
   au changement de scène, chaque étoile quitte la forme d'avant et file vers la nouvelle, en tourbillonnant, pas toutes en même temps.
   Les dessins au trait (js/espace-scenes.js) se posent par-dessus : la nuée est leur univers.
   Une forme : (a, now, E) → { V, f } ; a : le temps de la scène (celui de son dessin), V : sa caméra (E.vue), f(R, o) : où va l'étoile R
   (o.x, o.y, o.z ; o.s : sa taille ; o.a : son éclat, 0 = cachée ; o.t : une traîne jusqu'à o.tx, o.ty, o.tz). */
window.EspaceNuee = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K } = O, { Wd } = K;
const TAU = Math.PI * 2, c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); }, lerp = (a, b, t) => a + (b - a) * t;
const eio = v => { v = c01(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const fr = v => v - Math.floor(v), h = n => fr(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

// la lueur d'une étoile : dessinée une fois
const LUEUR = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,250,1)'); g.addColorStop(0.1, 'rgba(255,255,250,0.85)'); g.addColorStop(0.28, 'rgba(236,242,255,0.22)'); g.addColorStop(1, 'rgba(236,242,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c; })();

/* ——— les étoiles : chacune a ses tirages (a…e : uniformes ; gx, gy, gz : gaussiens), toujours les mêmes ——— */
let N = 0, R = [], P = null, F = null, T0 = -1e9, dern = null, rot = 1;
function prepare(W, H) {
  const n = Math.round(Math.max(700, Math.min(1800, W * H / 700)) * ((window.devicePixelRatio || 1) >= 2.5 ? 0.7 : 1));
  if (n === N) return; N = n; R = [];
  const g = (i, k) => { const u = Math.max(1e-6, h(i * 9.13 + k)), v = h(i * 5.71 + k + 3.3); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  for (let i = 0; i < N; i++) R.push({ i, u: i / N, a: h(i * 1.37 + 0.1), b: h(i * 2.71 + 0.2), c: h(i * 3.97 + 0.3), d: h(i * 4.33 + 0.4), e: h(i * 6.11 + 0.5), gx: g(i, 1), gy: g(i, 2), gz: g(i, 3) });
  P = new Float32Array(N * 4); F = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { P[i * 4] = R[i].a * W; P[i * 4 + 1] = R[i].b * H; P[i * 4 + 2] = 0.8; P[i * 4 + 3] = 0; }
}

/* ——— la caméra : lacet, tangage (négatif : on regarde d'en haut), échelle (px par unité), centre, recul ——— */
const Q = [0, 0, 0, 0];
const E = {
  vue(lac, tan, k = E.K, cx = E.cx, cy = E.cy, d = 3.6) { const c = Math.cos(lac), s = Math.sin(lac), c2 = Math.cos(tan), s2 = Math.sin(tan);
    return (x, y, z) => { const x1 = x * c + z * s, z1 = -x * s + z * c, y2 = y * c2 - z1 * s2, z2 = y * s2 + z1 * c2; if (z2 > d - 0.15) { Q[3] = 0; return Q; }
      const f = d / (d - z2); Q[0] = cx + x1 * k * f; Q[1] = cy + y2 * k * f; Q[2] = z2; Q[3] = f; return Q; }; },
  // (comme les dessins, js/espace-scenes.js : l'échelle d'une scène qui a besoin d'une demi-largeur « besoin »)
  large: besoin => Math.min(E.G.s, E.G.sw / besoin), h, sm, c01, lerp, fr, eio
};

/* ——— les formes ——— */
const FORMES = {};
// l'accueil (et toute scène sans forme) : une galaxie à deux bras, qui tourne, vue d'en haut et de biais
FORMES.galaxie = (a, now) => {
  const V = E.vue(0.4, -1.0, E.K * 0.95), w = now * 0.06;
  return { V, f(r, o) {
    if (r.u < 0.22) { o.x = r.gx * 0.28; o.y = r.gy * 0.07; o.z = r.gz * 0.28; o.s = 0.7 + r.e; o.a = 0.9; return; }
    const bras = r.a < 0.5 ? 0 : Math.PI, rr = 0.2 + Math.pow(r.b, 0.8) * 2.6, t = bras + Math.log(rr) * 2.3 + w * (1.4 - rr * 0.3), sp = 0.1 * rr + 0.05;
    o.x = Math.cos(t) * rr + r.gx * sp; o.y = r.gy * 0.05; o.z = Math.sin(t) * rr + r.gz * sp; o.s = r.e > 0.97 ? 2 : 0.5 + r.e * 0.8; o.a = 0.45 + r.c * 0.55; } };
};

// 1 dev = 1 équipe : une aura autour de lui ; pop : chaque étoile devient quelqu'un, une foule jusqu'à l'horizon (et des mains en l'air) ;
// une ola traverse la foule ; puis un tourbillon, tout le monde rentre en lui (le même cycle que le dessin : 9,6 s)
FORMES.equipe = (a, now) => {
  const G = E.G, kd = E.large(1.6) * 0.82, Vd = E.vue(Math.sin(now * 0.15) * 0.05, -0.42, kd, G.cx, G.cy + 0.02 * G.s), pd = Vd(0, 0.84, 0.7), hx = pd[0], hy = pd[1] - 0.558 * pd[3] * kd;
  const V = E.vue(Math.sin(now * 0.08) * 0.1, -0.3, E.K * 0.78, E.cx, E.cy + E.K * 0.2), Cy = 9.6, c = fr((a + 0.3) / Cy) * Cy, wx = -1.6 + (c - 3.2) / 2.6 * 3.2;
  return { V, f(r, o) {
    const rg = Math.floor(r.b * 24), ord = rg / 23, Rr = 1.05 + rg * 0.15, th = (r.a * 2 - 1) * (1.0 + ord * 0.3), x = Math.sin(th) * Rr * 1.15, z = 0.3 - Math.cos(th) * Rr * 0.8, main = r.e < 0.3;
    let y = 0.62 - rg * 0.085 - Math.abs(Math.sin(now * 3 + r.c * TAU)) * 0.02, sx = x, s = 1, al = 1;
    if (main) { const g = r.e < 0.15 ? -1 : 1; sx += g * 0.05; y -= 0.07 + Math.sin(now * 7 + r.d * TAU) * 0.015; s = 0.7; al = 0.8; }
    const w = c > 3.2 && c < 5.8 ? Math.exp(-(th / 1.5 - wx) * (th / 1.5 - wx) * 6) : 0; y -= w * 0.14; s *= 1 + w * 1.4; al *= 1 + w * 0.6;
    // (où il est sur l'écran, son siège dans la foule)
    const q = V(sx, y, z), px = q[0], py = q[1], pf = q[3]; if (pf <= 0) { o.a = 0; return; }
    const an = r.c * TAU + now * (0.9 + r.d * 1.4), ra = (0.1 + r.e * 0.25) * G.s, ax = hx + Math.cos(an) * ra, ay = hy + Math.sin(an) * ra * 0.7 + r.gy * 4;
    const t1 = 0.7 + ord * 1.9, t2 = 6.1 + (1 - ord) * 1.5; o.p2 = 1;
    if (c < t1) { o.x = ax; o.y = ay; o.f = 1; o.s = 0.6; o.a = 0.5; return; }
    if (c < t2) { const p = sm((c - t1) / 0.7); o.x = lerp(ax, px, p); o.y = lerp(ay, py, p) - Math.sin(Math.PI * p) * G.s * 1.4; o.f = lerp(1, pf, p); o.s = s; o.a = al; return; }
    // le tourbillon : la foule tourne autour de lui en se resserrant, et rentre en lui
    const k = c01((c - t2) / 1.1), e = k * k, an2 = e * 4 * (th < 0 ? -1 : 1), dx = px - hx, dy = py - hy, ca = Math.cos(an2), sa = Math.sin(an2);
    o.x = hx + (dx * ca - dy * sa * 0.5) * (1 - e); o.y = hy + (dx * sa * 0.5 + dy * ca) * (1 - e); o.f = lerp(pf, 1, e); o.s = s * (1 - 0.4 * e); o.a = al;
    if (k >= 1) { o.x = ax; o.y = ay; o.f = 1; o.s = 0.6; o.a = 0.5; } } };
};

// plusieurs terminaux, plusieurs agents : on est au milieu d'un mur circulaire de terminaux ; chaque colonne s'écrit à sa vitesse
// (des caractères qui tombent, une tête plus vive), le mur tourne lentement autour de nous
FORMES.terminaux = (a, now) => {
  const V = E.vue(now * 0.035, -0.08, E.K * 0.9, E.cx, E.cy, 3.6), NC = 150;
  return { V, f(r, o) {
    const j = Math.floor(r.a * NC), rad = 2.7 + h(j * 3.3) * 2.4, an = j / NC * TAU + h(j) * 0.02, v = Math.floor(r.b * 44) / 44;
    o.x = Math.cos(an) * rad; o.z = Math.sin(an) * rad; o.y = -2.3 + v * 4.6;
    const sp = 0.12 + h(j * 7.7) * 0.22, tete = fr(h(j * 1.9) + a * sp), d = fr(tete - v);
    const vif = d < 0.025 ? 2.4 : d < 0.4 ? 0.25 + 0.95 * (1 - d / 0.4) : 0.16;
    o.s = d < 0.02 ? 1.8 : 0.8; o.a = vif * (0.4 + 0.6 * h(j * 2.2 + v * 50)); } };
};

// des agents qui délèguent : un arbre immense qui pousse du haut de l'écran, branche après branche (3 par nœud, 6 étages),
// qui tourne ; des influx descendent de la racine jusqu'aux feuilles
FORMES.agents = (a, now) => {
  const V = E.vue(now * 0.1, Math.sin(now * 0.07) * 0.2, E.K * 0.9, E.cx, E.cy), D = 4;
  return { V, f(r, o) {
    const L = Math.min(D - 1, Math.floor(Math.pow(r.a, 0.6) * D)), t = r.c;
    let x = 0, y = 0, z = 0, px = 0, py = 0, pz = 0, code = r.b * 729, az = 0, el = 0;
    for (let l = 0; l <= L; l++) { const dg = Math.floor(code) % (l ? 3 : 6); code /= l ? 3 : 6;
      if (l === 0) { az = dg * TAU / 6 + 0.3; el = (dg % 2 ? 0.45 : -0.45); } else { az += (dg - 1) * 0.62; el += (dg === 1 ? 0.4 : -0.2) * (l % 2 ? 1 : -1); }
      const ln = 0.95 * Math.pow(0.8, l); px = x; py = y; pz = z;
      x += Math.cos(az) * Math.cos(el) * ln; z += Math.sin(az) * Math.cos(el) * ln; y += Math.sin(el) * ln * 0.8; }
    o.x = lerp(px, x, t); o.y = lerp(py, y, t); o.z = lerp(pz, z, t); o.t = 1; o.tx = lerp(px, x, t - 0.07); o.ty = lerp(py, y, t - 0.07); o.tz = lerp(pz, z, t - 0.07);
    const pousse = c01((a - (L + t) * 0.4) / 0.3), onde = fr(a * 0.3 - (L + t) / D * 0.5), flux = Math.exp(-onde * onde * 300) + Math.exp(-(onde - 1) * (onde - 1) * 300);
    o.s = (L === D - 1 && t > 0.92 ? 2.2 : 0.8) * (1 + flux * 1.5); o.a = pousse * (0.55 + flux * 1.3); } };
};

// des skills et des plugins : une sphère armillaire, six anneaux inclinés qui tournent chacun à sa vitesse ;
// tour à tour, un anneau lâche un chapelet d'étoiles qui vient se brancher dans le cœur (qui grossit à chaque branchement)
FORMES.skills = (a, now) => {
  const V = E.vue(now * 0.09, -0.28, E.K * 0.95), per = 1.6, n = Math.floor(Math.max(0, a) / per), p = fr(Math.max(0, a) / per), anneau = n % 6;
  return { V, f(r, o) {
    if (r.u < 0.12) { const rc = 0.2 + 0.05 * Math.exp(-p * 5) * (a > 0 ? 1 : 0); o.x = r.gx * rc * 0.6; o.y = r.gy * rc * 0.6; o.z = r.gz * rc * 0.6; o.s = 1.1; o.a = 0.9; return; }
    const k = Math.floor(r.a * 6), rad = 0.75 + k * 0.32, th = r.b * TAU + a * (0.35 - k * 0.03) * (k % 2 ? 1 : -1);
    let x = Math.cos(th) * rad, y = 0, z = Math.sin(th) * rad; const i1 = 0.35 + k * 0.42, i2 = k * 1.05;
    let y1 = y * Math.cos(i1) - z * Math.sin(i1), z1 = y * Math.sin(i1) + z * Math.cos(i1); const x2 = x * Math.cos(i2) + z1 * Math.sin(i2), z2 = -x * Math.sin(i2) + z1 * Math.cos(i2);
    x = x2; y = y1; z = z2; let s = 1, al = 0.9;
    const part = k === anneau && r.c < 0.16 && a > 0;
    if (part) { const q = sm(c01(p * 1.5 - r.c * 2)), qe = q * q; o.x = x * (1 - qe); o.y = y * (1 - qe); o.z = z * (1 - qe); o.s = 1.4; o.a = q < 1 ? 1 : c01((1 - p) * 4); o.t = q > 0 && q < 1 ? 1 : 0;
      o.tx = x * (1 - qe * 0.8); o.ty = y * (1 - qe * 0.8); o.tz = z * (1 - qe * 0.8); return; }
    o.x = x; o.y = y; o.z = z; o.s = s; o.a = al; } };
};

// tout tester, tout mesurer : l'hyperespace ; on file dans un tunnel d'étoiles de plus en plus vite ; au milieu, cinq concurrents
// font la course (ils avancent et reculent l'un par rapport à l'autre)
FORMES.bench = (a, now) => {
  const V = E.vue(Math.sin(now * 0.2) * 0.04, Math.sin(now * 0.17) * 0.03, E.K * 0.8), aa = Math.max(0, a), v = 0.25 + Math.min(aa, 4) * 0.22, dist = aa < 4 ? 0.25 * aa + 0.11 * aa * aa : 1 + 1.13 * (aa - 4);
  return { V, f(r, o) {
    if (r.u < 0.02) { const l = Math.floor(r.u / 0.02 * 5), n = r.u / 0.02 * 5 - l; o.x = (l - 2) * 0.28; o.y = 0.35 + Math.sin(l * 2.1) * 0.05; o.z = 1.6 - n * 1.4 + Math.sin(now * (0.8 + l * 0.3) + l) * 0.5; o.s = n < 0.12 ? 2.2 : 1.2 * (1 - n); o.a = 1; return; }
    const an = r.a * TAU, rad = 0.55 + Math.pow(r.b, 0.6) * 2.4, z = -14 + fr(r.c + dist * 0.09) * 17.4;
    o.x = Math.cos(an) * rad; o.y = Math.sin(an) * rad * 0.8; o.z = z; o.s = 0.7 + r.e * 0.6; o.a = 0.3 + 0.7 * c01((z + 14) / 3);
    o.t = 1; o.tx = o.x; o.ty = o.y; o.tz = z - v * 1.6; } };
};

// une flotte d'agents : une nuée d'étourneaux (une murmuration) qui ondule sur tout l'écran ; puis elle se pose en une tour,
// étage par étage, de bas en haut ; puis s'envole de nouveau (cycle de 9 s)
FORMES.flotte = (a, now) => {
  const V = E.vue(Math.sin(now * 0.1) * 0.3, -0.18, E.K * 1.0), Cy = 9, c = fr(Math.max(0, a) / Cy) * Cy, t = now * 0.5;
  const cx = Math.sin(t * 0.8) * 1.4, cy = Math.sin(t * 1.06) * 0.35 - 0.2, cz = Math.cos(t * 0.62) * 0.8;
  return { V, f(r, o) {
    const u = (r.a - 0.5) * 3.2 + r.gx * 0.08, w = (r.c - 0.5) * 1.6 + r.gz * 0.05, pli = Math.sin(u * 1.6 + t * 1.3) * 0.45 + Math.cos(w * 2.4 - t * 0.9) * 0.2, bord = 1 - Math.pow(Math.abs(r.a - 0.5) * 2, 3);
    const fx = cx + u * Math.cos(t * 0.35) - w * Math.sin(t * 0.35), fz = cz + u * Math.sin(t * 0.35) + w * Math.cos(t * 0.35), fy = cy + pli + r.gy * 0.05 * bord + Math.sin(u * 0.8 + t) * w * 0.4;
    const et = Math.floor(r.a * 22), hh = et / 21, an = r.b * TAU + t * 0.9 + hh * 3, rr = 0.62 * (1 - hh * 0.72), carre = Math.max(Math.abs(Math.cos(an)), Math.abs(Math.sin(an)));
    const tx = Math.cos(an) * rr / carre, tz = Math.sin(an) * rr / carre, ty = 0.95 - hh * 2.3;
    const q = c < 3.5 ? 0 : c < 7.6 ? sm((c - 3.5 - hh * 1.8) / 1) : 1 - sm((c - 7.6 - (1 - hh) * 0.5) / 0.7);
    o.x = lerp(fx, tx, q); o.y = lerp(fy, ty, q); o.z = lerp(fz, tz, q); o.s = 0.95 + q * 0.2 + (et === 21 && q > 0.9 ? 1.2 : 0); o.a = 0.85 + 0.15 * q; } };
};

// la vitesse sans perdre le contrôle : une rivière d'étoiles traverse l'écran de part en part et passe quatre portes ;
// à chaque porte, certaines sont refusées (elles rebondissent et tombent) ; les autres filent jusqu'au bout
FORMES.gardefous = (a, now) => {
  const V = E.vue(-0.55, -0.22, E.K * 0.62, E.cx, E.cy + E.K * 0.05), PX = [-2.4, -0.8, 0.8, 2.4];
  return { V, f(r, o) {
    if (r.u < 0.14) { const g = Math.floor(r.u / 0.14 * 4), an = r.b * TAU + now * (g % 2 ? 0.8 : -0.8); o.x = PX[g] + r.gx * 0.015; o.y = 0.05 + Math.sin(an) * 0.58; o.z = Math.cos(an) * 0.58; o.s = 0.8; o.a = 0.7; return; }
    const x0 = -5.5 + fr(r.a + a * 0.09) * 11, y0 = 0.05 + r.gy * 0.1 + Math.sin(x0 * 1.2 + a * 1.5) * 0.08, z0 = r.gz * 0.16;
    let g = -1; for (let k = 0; k < 4; k++) if (x0 > PX[k] && h(r.i * 7.1 + k) < 0.2) { g = k; break; }
    if (g < 0) { o.x = x0; o.y = y0; o.z = z0; o.s = 0.9; o.a = 0.85; o.t = 1; o.tx = x0 - 0.12; o.ty = y0; o.tz = z0; return; }
    const d = x0 - PX[g]; o.x = PX[g] - d * 0.35; o.y = y0 - d * 1.2 + d * d * 1.8; o.z = z0 + d * (r.c - 0.5) * 1.6; o.s = 1; o.a = c01(1 - d * 0.7);
    o.t = 1; o.tx = o.x + 0.06; o.ty = o.y - (1.2 - d * 3.6) * 0.06; o.tz = o.z; } };
};

// six couches, comme une puce : la puce est posée sur une carte mère qui s'étend jusqu'aux bords de l'écran ;
// des pistes partent de ses quatre côtés, tournent à angle droit, repartent ; des impulsions de lumière y filent vers l'extérieur
FORMES.puce = (a, now) => {
  const V = E.vue(0.35 + Math.sin(now * 0.06) * 0.25, -0.62, E.K * 0.9, E.cx, E.cy + E.K * 0.12), NT = 56;
  return { V, f(r, o) {
    const j = Math.floor(r.a * NT), cote = j % 4, off = (h(j * 1.7) - 0.5) * 1.3, L1 = 0.25 + h(j * 2.3) * 0.9, L2 = (h(j * 3.1) - 0.5) * 2.2, L3 = 1 + h(j * 4.7) * 3.5, tot = L1 + Math.abs(L2) + L3;
    const bouge = r.c < 0.14, d = (bouge ? fr(r.b + a * (0.18 + h(j) * 0.12)) : r.b) * tot;
    // (le long de la piste : sortir du bord de la puce, tourner, repartir vers le bord de l'écran)
    let u, v; if (d < L1) { u = 0.85 + d; v = off; } else if (d < L1 + Math.abs(L2)) { u = 0.85 + L1; v = off + Math.sign(L2) * (d - L1); } else { u = 0.85 + L1 + (d - L1 - Math.abs(L2)); v = off + L2; }
    const x = [u, -v, -u, v][cote], z = [v, u, -v, -u][cote];
    o.x = x; o.z = z; o.y = 0.25; const loin = c01(1 - d / tot * 0.6);
    if (bouge) { o.s = 1.5; o.a = 1.2 * loin; o.t = 1; const d2 = Math.max(0, d - 0.08); let u2, v2; if (d2 < L1) { u2 = 0.85 + d2; v2 = off; } else if (d2 < L1 + Math.abs(L2)) { u2 = 0.85 + L1; v2 = off + Math.sign(L2) * (d2 - L1); } else { u2 = 0.85 + L1 + (d2 - L1 - Math.abs(L2)); v2 = off + L2; }
      o.tx = [u2, -v2, -u2, v2][cote]; o.tz = [v2, u2, -v2, -u2][cote]; o.ty = 0.25; return; }
    o.s = 0.75; o.a = 0.75 * loin + (d > tot - 0.05 ? 0.6 : 0); if (d > tot - 0.05) o.s = 1.3; } };
};

// IA & données : on entre dans un nuage de vecteurs (des amas de documents) ; une question s'allume ;
// ses voisins les plus proches filent vers elle, puis la réponse repart
FORMES.rag = (a, now) => {
  const V = E.vue(now * 0.05, Math.sin(now * 0.04) * 0.15 - 0.1, E.K * 0.8, E.cx, E.cy, 3.0), per = 3.2, n = Math.floor(Math.max(0, a) / per), p = fr(Math.max(0, a) / per), cq = n % 14;
  const C = k => [(h(k * 1.3) - 0.5) * 5.2, (h(k * 2.9) - 0.5) * 2.4, (h(k * 4.1) - 0.5) * 5.2 - 0.6];
  const cc = C(cq), qx = cc[0] + 0.3, qy = cc[1] - 0.2, qz = cc[2] + 0.3;
  return { V, f(r, o) {
    const k = Math.floor(r.a * 14), c = C(k), x = c[0] + r.gx * 0.34, y = c[1] + r.gy * 0.22, z = c[2] + r.gz * 0.34;
    if (k === cq && r.b < 0.45 && a > 0) { const q = sm(p * 3 - r.c) * (1 - sm((p - 0.7) * 4)); o.x = lerp(x, qx, q * 0.85); o.y = lerp(y, qy, q * 0.85); o.z = lerp(z, qz, q * 0.85); o.s = 1 + q; o.a = 0.7 + q * 0.8;
      o.t = q > 0.05 && q < 0.95 ? 1 : 0; o.tx = lerp(x, qx, q * 0.6); o.ty = lerp(y, qy, q * 0.6); o.tz = lerp(z, qz, q * 0.6); return; }
    o.x = x; o.y = y; o.z = z; o.s = 1.1; o.a = k === cq ? 1 : 0.75; } };
};

// front & interfaces : un sol de points jusqu'à l'horizon (un écran infini, le dessin flotte au-dessus) ; chaque clic y fait une onde
FORMES.front = (a, now) => {
  const V = E.vue(Math.sin(now * 0.1) * 0.25, -0.13, E.K * 0.85, E.cx, E.cy), per = 2.4, n = Math.floor(Math.max(0, a) / per), p = fr(Math.max(0, a) / per);
  const ox = (h(n * 1.7) - 0.5) * 4, oz = -1 - h(n * 2.3) * 6, ro = p * 5;
  return { V, f(r, o) {
    const i = Math.floor(r.a * 46), j = Math.floor(r.b * 30), x = (i / 45 - 0.5) * 12, z = 1.4 - j * 0.45, d = Math.hypot(x - ox, z - oz), w = Math.exp(-(d - ro) * (d - ro) * 3) * (1 - p) + 0.5 * Math.exp(-(d - ro * 0.6) * (d - ro * 0.6) * 5) * (1 - p);
    o.x = x; o.z = z; o.y = 0.62 - w * 0.5; o.s = 1 + w * 1.4; o.a = 0.75 + w; } };
};

// back-end & données : des requêtes tombent du haut de l'écran par milliers, convergent vers la passerelle,
// se répartissent en files, et viennent tourner dans des bases séparées (une par client)
FORMES.back = (a, now) => {
  const V = E.vue(Math.sin(now * 0.07) * 0.3, -0.3, E.K * 0.62, E.cx, E.cy + E.K * 0.05), NB = 4;
  return { V, f(r, o) {
    const j = Math.floor(r.c * NB), xl = (j - (NB - 1) / 2) * 1.25;
    if (r.u < 0.16) { const bas = r.d < 0.5, an = r.b * TAU + now * 0.4; o.x = xl + Math.cos(an) * 0.42; o.z = Math.sin(an) * 0.42; o.y = (bas ? 1.35 : 0.75) + (r.e < 0.3 ? 0.3 : 0) * (bas ? -1 : 1) * 0; o.s = 0.8; o.a = 0.75; return; }
    const p = fr(r.a + a * 0.16);
    if (p < 0.38) { const q = p / 0.38, e = q * q, x0 = (r.b - 0.5) * 9, z0 = r.gz * 0.8; o.x = lerp(x0, 0, e); o.z = lerp(z0, 0, e); o.y = -2.8 + q * 2.6; o.s = 0.7 + e * 0.6; o.a = 0.3 + 0.6 * q;
      o.t = 1; o.tx = lerp(x0, 0, Math.max(0, q - 0.05) ** 2); o.tz = o.z; o.ty = o.y - 0.12; return; }
    if (p < 0.6) { const q = sm((p - 0.38) / 0.22); o.x = lerp(0, xl, q) + r.gx * 0.04; o.z = r.gz * 0.04; o.y = -0.2 + q * 0.6; o.s = 1; o.a = 0.9; return; }
    const q = (p - 0.6) / 0.4, an = r.b * TAU + q * 7, rad = 0.4 * sm(q * 3); o.x = xl + Math.cos(an) * rad; o.z = Math.sin(an) * rad; o.y = 0.75 + q * 0.6; o.s = 0.9; o.a = 0.9 - q * 0.3; } };
};

// devops & cloud : une boucle sans fin géante (le lemniscate), en 3D ; un flot d'étoiles la parcourt, comme une piste
FORMES.devops = (a, now) => {
  const V = E.vue(Math.sin(now * 0.12) * 0.35, -0.42, E.K * 0.72), rot = now * 0.05;
  return { V, f(r, o) {
    const pt = u => { const d = 1 + Math.sin(u) ** 2; return [2.3 * Math.cos(u) / d, 0.35 * Math.sin(u * 2), 1.5 * Math.sin(u) * Math.cos(u) / d]; };
    const u = fr(r.a + a * 0.07 * (r.u < 0.8 ? 1 : 0.4)) * TAU, c = pt(u), c2 = pt(u - 0.06), tub = r.u < 0.8 ? 0.16 : 0.5;
    o.x = c[0] + r.gx * tub * 0.6; o.y = c[1] + r.gy * tub * 0.4; o.z = c[2] + r.gz * tub * 0.6; o.s = r.u < 0.8 ? 0.9 : 0.6; o.a = r.u < 0.8 ? 0.85 : 0.35;
    if (r.u < 0.8) { o.t = 1; o.tx = c2[0] + r.gx * tub * 0.6; o.ty = c2[1] + r.gy * tub * 0.4; o.tz = c2[2] + r.gz * tub * 0.6; } } };
};

// sécurité & qualité : un dôme d'étoiles protège un cœur de données ; des menaces arrivent de partout, heurtent le dôme,
// qui ondule à l'impact et les renvoie
FORMES.secu = (a, now) => {
  const V = E.vue(now * 0.07, -0.3, E.K * 0.66, E.cx, E.cy + E.K * 0.1), per = 0.9, aa = Math.max(0, a), n = Math.floor(aa / per), p = fr(aa / per), RD = 1.7;
  const imp = k => { const th = h(k * 1.7) * 1.2 + 0.15, ph = h(k * 2.3) * TAU; return [Math.sin(th) * Math.cos(ph), -Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
  const I = imp(n);
  return { V, f(r, o) {
    if (r.u < 0.6) { const k = r.u / 0.6, th = Math.acos(1 - k) , ph = r.i * 2.39996; let nx = Math.sin(th) * Math.cos(ph), ny = -Math.cos(th), nz = Math.sin(th) * Math.sin(ph);
      const dd = Math.acos(Math.max(-1, Math.min(1, nx * I[0] + ny * I[1] + nz * I[2]))), w = Math.exp(-(dd - p * 1.6) * (dd - p * 1.6) * 30) * (1 - p), rr = RD * (1 + w * 0.12);
      o.x = nx * rr; o.y = 0.8 + ny * rr; o.z = nz * rr; o.s = 0.8 + w * 2; o.a = 0.5 + w * 1.2; return; }
    if (r.u < 0.72) { const k = (r.u - 0.6) / 0.12, t = now * 0.6, s = 0.32, cx = (h(r.i) - 0.5) * 2, cy = (h(r.i * 1.3) - 0.5) * 2, cz = (h(r.i * 1.7) - 0.5) * 2;
      const x = cx * s, y = cy * s, z = cz * s; o.x = x * Math.cos(t) - z * Math.sin(t); o.z = x * Math.sin(t) + z * Math.cos(t); o.y = 0.45 + y; o.s = 1.1; o.a = 0.95; return; }
    // les menaces : chacune part de loin vers un point du dôme, heurte, rebondit en s'éteignant
    const m = Math.floor(r.b * 1000), pe = 2.2 + r.c * 1.6, q = fr(aa / pe + r.d), J = imp(m + Math.floor(aa / pe + r.d) * 13), far = 5.5;
    const hx = J[0] * RD, hy = 0.8 + J[1] * RD, hz = J[2] * RD;
    if (q < 0.7) { const e = q / 0.7, sx = J[0] * far + r.gx * 0.8, sy = 0.8 + J[1] * far + r.gy * 0.8, sz = J[2] * far + r.gz * 0.8; o.x = lerp(sx, hx, e); o.y = lerp(sy, hy, e); o.z = lerp(sz, hz, e); o.s = 1; o.a = 0.7 * c01(e * 4);
      o.t = 1; o.tx = lerp(sx, hx, e - 0.08); o.ty = lerp(sy, hy, e - 0.08); o.tz = lerp(sz, hz, e - 0.08); return; }
    const e = (q - 0.7) / 0.3; o.x = hx + J[0] * e * 1.4 + r.gx * e * 0.5; o.y = hy + J[1] * e * 1.4 + r.gy * e * 0.5 + e * e; o.z = hz + J[2] * e * 1.4 + r.gz * e * 0.5; o.s = 1.2 * (1 - e); o.a = 1 - e; } };
};

// leadership & méthode : une route d'étoiles jusqu'à l'horizon, qu'on remonte ; au bout, l'étoile du nord ; au-dessus, la voie lactée
FORMES.pilotage = (a, now) => {
  const V = E.vue(0, -0.12, E.K * 0.8, E.cx, E.cy), aa = Math.max(0, a);
  return { V, f(r, o) {
    if (r.u < 0.5) { const b = (r.a - 0.5) * 3.6, x = b * 3.2, y = -1.1 - Math.cos(b * 0.8) * 0.5 + r.gy * 0.16 * (1.2 - Math.abs(b) * 0.2), z = -8 + r.gz * 0.6;
      o.x = x + r.gx * 0.1; o.y = y; o.z = z; o.s = r.e > 0.96 ? 1.8 : 0.6; o.a = 0.35 + r.c * 0.4; return; }
    if (r.u < 0.505) { o.x = r.gx * 0.02; o.y = 0.05 + r.gy * 0.02; o.z = -10; o.s = 3.2; o.a = 1; return; }
    const lane = Math.floor(r.b * 5), bx = [-1.5, -0.75, 0, 0.75, 1.5][lane], z = -12 + fr(r.c + aa * 0.12) * 15.2;
    if (lane === 2 && fr(z * 0.6) > 0.5) { o.a = 0; return; }
    o.x = bx + (lane === 0 || lane === 4 ? r.gx * 0.02 : 0); o.y = 0.8 + Math.sin(z * 0.25) * 0.05; o.z = z; o.s = lane === 1 || lane === 3 ? 0.6 : 1.1; o.a = (lane === 1 || lane === 3 ? 0.5 : 1) * c01((z + 12) / 3);
    o.t = 1; o.tx = o.x; o.ty = o.y; o.tz = z - 0.25; } };
};

/* ——— l'image ——— */
const o = { x: 0, y: 0, z: 0, s: 1, a: 1, t: 0, tx: 0, ty: 0, tz: 0, p2: 0, f: 1 };
X.fond.push((ctx, now) => {
  const EP = window.EspacePlume, M = EP && EP.M; if (!M || !M.lay || !M.lay.G) { dern = null; return; }
  const L = M.lay, G = L.G, W = L.W, H = L.H; prepare(W, H);
  E.G = G; E.W = W; E.H = H; E.cx = W / 2; E.cy = G.cy; E.K = Math.min(W * 0.46, H * 0.5);
  const C = M.sc, id = C || M;
  if (id !== dern) { F.set(P); T0 = Wd.t; dern = id; rot = Math.random() < 0.5 ? -1 : 1; }
  const a = C ? Wd.t - C.t0 - 1.5 : Wd.t - M.t0, fo = (C && FORMES[C.S.d]) || FORMES.galaxie, { V, f } = fo(reduit ? 3 : a, reduit ? 0 : now, E);
  const ap = reduit ? 1 : c01((Wd.t - M.t0) / 2.5), bd = M.bande, haut = L.barre.bas + 8, br = L.L ? 1.6 : 1.3, mx = W / 2, my = G.cy, dt = Wd.t - T0;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgb(236,240,255)';
  for (let i = 0; i < N; i++) {
    const r = R[i], j = i * 4; o.s = 1; o.a = 1; o.t = 0; o.p2 = 0; f(r, o);
    let x = P[j], y = P[j + 1], s = 0, al = 0, fz = 1, tl = null;
    if (o.a > 0 && o.p2) { x = o.x; y = o.y; fz = o.f; s = br * o.s * Math.min(2.2, Math.pow(fz, 0.8)); al = o.a * c01(0.3 + fz * 0.8); }
    else if (o.a > 0) { const q = V(o.x, o.y, o.z); if (q[3] > 0) { x = q[0]; y = q[1]; fz = q[3]; s = br * o.s * Math.min(2.2, Math.pow(fz, 0.8)); al = o.a * c01(0.3 + fz * 0.8);
      if (o.t) { const q2 = V(o.tx, o.ty, o.tz); if (q2[3] > 0) tl = [q2[0], q2[1]]; } } }
    // la transformation : chaque étoile part de là où elle était, à son heure, et tourne un peu autour du centre en chemin
    const e = reduit ? 1 : eio((dt - r.d * 0.6) / 1.4);
    if (e < 1) { const x0 = F[j], y0 = F[j + 1], lx = lerp(x0, x, e) - mx, ly = lerp(y0, y, e) - my, b = Math.sin(Math.PI * e), an = b * (0.5 + r.a * 0.7) * rot, gr = 1 + b * 0.18 * r.b;
      x = mx + (lx * Math.cos(an) - ly * Math.sin(an)) * gr; y = my + (lx * Math.sin(an) + ly * Math.cos(an)) * gr; s = lerp(F[j + 2], s, e); al = lerp(F[j + 3], al, e); tl = null; }
    P[j] = x; P[j + 1] = y; P[j + 2] = s; P[j + 3] = al;
    if (al <= 0.01 || x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    // (discrètes derrière les sous-titres et la barre des chapitres ; elles scintillent)
    let k = al * ap * (0.8 + 0.2 * Math.sin(now * (1.2 + r.b * 2) + r.c * TAU));
    if (bd && x > bd.x && x < bd.x + bd.w && y > bd.y && y < bd.y + bd.h) k *= 0.22;
    if (y < haut) k *= 0.3;
    if (k > 1.6) k = 1.6;
    if (tl) { ctx.globalAlpha = Math.min(1, k * 0.55); ctx.lineWidth = Math.max(0.6, s * 0.9); ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(x, y); ctx.stroke(); }
    const rr = s * 4 * (k > 1 ? 1 + (k - 1) * 0.8 : 1); ctx.globalAlpha = Math.min(1, k); ctx.drawImage(LUEUR, x - rr, y - rr, rr * 2, rr * 2);
  }
  ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
});
return { FORMES, E, get N() { return N; }, get P() { return P; }, fige() { T0 = -1e9; const M = window.EspacePlume && EspacePlume.M; if (M) dern = M.sc || M; } };
})();
