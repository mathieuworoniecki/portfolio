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
// (vague 137, l'audit : « la nuée », design) : de vraies étoiles n'ont pas toutes la même couleur : quelques-unes bleutées (chaudes, jeunes),
// quelques-unes dorées (vieilles) ; le cœur reste blanc, seule la lueur se teinte : discret, mais le ciel prend de la profondeur
const teinte = (r, g, b) => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), d = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  d.addColorStop(0, 'rgba(255,255,252,1)'); d.addColorStop(0.1, `rgba(${r},${g},${b},0.85)`); d.addColorStop(0.28, `rgba(${r},${g},${b},0.24)`); d.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = d; x.fillRect(0, 0, 64, 64); return c; };
const BLEUE = teinte(176, 204, 255), DOREE = teinte(255, 222, 170);

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

// plusieurs terminaux, plusieurs agents : le mur de terminaux du dessin (même caméra, même grille, qui défile de même) ;
// dans les allées entre les terminaux, un trafic incessant : des paquets de lumière filent d'un terminal à l'autre, dans les deux sens
FORMES.terminaux = (a, now) => {
  const G = E.G, V = E.vue(-0.62, 0.5, G.sw / 1.75, G.cx, G.cy), GX = 1.02, GY = 0.7, off = Math.max(0, a) * 0.32;
  return { V, f(r, o) {
    const sens = r.d < 0.5 ? -1 : 1, v = (0.6 + r.e * 1.6) * sens, lg = 0.1 + r.e * 0.2;
    if (r.u < 0.55) { const c = Math.floor(r.a * 10) - 5, x = (c + 0.5) * GX, y = -11 * GY + fr(r.b + a * v * 0.04) * 21 * GY - (off % GY);
      o.x = x; o.y = y; o.z = 0; o.s = 1.1; o.a = 0.9; o.t = 1; o.tx = x; o.ty = y - lg * sens; o.tz = 0; return; }
    const rg = Math.floor(r.a * 22) - 11, y = (rg + 0.5) * GY - (off % GY), x = -5 * GX + fr(r.b + a * v * 0.08) * 10 * GX;
    o.x = x; o.y = y; o.z = 0; o.s = 1.1; o.a = 0.9; o.t = 1; o.tx = x - lg * sens; o.ty = y; o.tz = 0; } };
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

/* ——— le titre en étoiles (29/09, 06:24, Mathieu : « comment le rendre vraiment incroyable ? ») ———
   au début de chaque scène, la nuée écrit son titre en grand, au milieu de l'écran ; une lueur le parcourt ; puis il se défait et devient la scène */
let TXT = { cle: '', pts: [] };
const PLUME = { d: 0.15, v: 1.25 };   // la plume part à 0,15 s et écrit tout le titre en 1,25 s
const plumeU = tl => c01((tl - PLUME.d) / PLUME.v);
const plumeXY = (pts, u) => { const lg = pts.lg, n = lg.length, li = Math.min(n - 1, Math.floor(u * n)), g = lg[li], f = u * n - li; return [g.x0 + (g.x1 - g.x0) * c01(f), g.y]; };
const LETTRES = '"Space Grotesk","Barlow",system-ui,sans-serif';
function titre(txt, W, H, y1, y2) {
  // (vague 6) le titre ne passe plus derrière la planète des chats : il tient entre le bord gauche et elle (sur grand écran, elle est en haut à droite)
  const Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
  // (vague 175 de l'audit : « titres écrits en étoiles ») : au téléphone, coincé à gauche de la planète, le titre n'avait que 60 % de la largeur
  // et restait petit ; s'il y a la place sous la planète, il s'y écrit sur toute la largeur, en grandes lettres
  const yP = Pc ? Math.round(Pc.y + Pc.r * 1.45) : y1; if (Pc && W < 700 && Pc.x > W * 0.6 && yP > y1 && y2 - yP > (y2 - y1) * 0.5) y1 = yP;
  const xr = Pc && Pc.x > W * 0.6 && Pc.y + Pc.r * 1.3 > y1 && Pc.y - Pc.r * 1.3 < y2 ? Math.round(Math.max(W * 0.6, Pc.x - Pc.r * 1.6)) : W;
  // (vague 229 de l'audit, design : calé entre le bord gauche et la planète, le titre était centré vers 0,43 de la largeur, à côté du sous-titre
  // et du chapitre, eux centrés : deux axes) : si la planète laisse au moins les trois quarts de la largeur, le titre garde des marges égales
  // et partage l'axe du sous-titre
  const xl = xr >= W ? 0 : xr >= W * 0.75 ? W - xr : W * 0.04, Wt = xr - xl;
  const cy = (y1 + y2) / 2, cle = txt + '|' + W + 'x' + H + '|' + N + '|' + xr + '|' + y1; if (TXT.cle === cle) return TXT.pts;
  const k = 0.5, w = Math.round(W * k), hh = Math.round(H * k), cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
  const x = cv.getContext('2d', { willReadFrequently: true }), mots = txt.split(' ');
  // (vague 96 de l'audit, finition au téléphone : le titre y était petit et flou ; il a droit à quatre lignes, donc à des lettres plus grandes)
  let px = Math.min(H * 0.15, W < 700 ? 60 : 108) * k, L = [];
  for (;;) { x.font = `700 ${px}px ${LETTRES}`; L = []; let cur = '';
    mots.forEach(m => { const t = cur ? cur + ' ' + m : m; if (cur && x.measureText(t).width > Wt * k * 0.86) { L.push(cur); cur = m; } else cur = t; }); L.push(cur);
    if ((L.length <= (W < 500 ? 4 : 3) && L.every(l => x.measureText(l).width <= Wt * k * 0.9) && L.length * px * 1.15 <= (y2 - y1) * k) || px < 12) break; px *= 0.92; }
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; const lh = px * 1.15, y0 = cy * k - (L.length - 1) * lh / 2;
  L.forEach((l, i) => x.fillText(l, (xl + Wt / 2) * k, y0 + i * lh));
  const d = x.getImageData(0, 0, w, hh).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++;
  const pas = Math.max(1, Math.sqrt(n / (N * 0.95))), pts = [];
  // (vague 10) les lignes du titre, pour la plume-comète qui l'écrit de gauche à droite : chaque étoile sait à quel instant (u, de 0 à 1) la plume passe sur elle
  const lg = L.map((l, i) => { const lw = x.measureText(l).width / k, xc = xl + Wt / 2; return { y: (y0 + i * lh) / k, x0: xc - lw / 2, x1: xc + lw / 2 }; });
  for (let yy = 0; yy < hh; yy += pas) for (let xx = 0; xx < w; xx += pas) if (d[(Math.floor(yy) * w + Math.floor(xx)) * 4 + 3] > 128) {
    const X0 = xx / k, Y0 = yy / k, li = Math.max(0, Math.min(L.length - 1, Math.round((yy - y0) / lh))), g = lg[li];
    pts.push([X0, Y0, (li + c01((X0 - g.x0) / Math.max(1, g.x1 - g.x0))) / L.length]); }
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(h(i * 3.7 + 0.5) * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
  pts.lg = lg; pts.px = px / k; pts.y2 = y2; TXT = { cle, pts }; return pts;
}
let NID = 0, sauter = false, FIN = null;   // (FIN : où la plume a fini le titre, pour l'onde de choc)   // (sauter : pour les captures, js de test : pas de transformation)
// les étoiles sur les lettres (écran) ; une lueur passe de gauche à droite ; elles frémissent
// (vague 10) plus de lueur qui balaie : la lueur, c'est la plume ; les étoiles qu'elle vient de poser brillent un instant, puis se posent
const ecrit = (pts, tl, W, now) => { const M = pts.length;
  return (r, o) => { const q = pts[r.i % M], dup = r.i >= M; o.p2 = 1; o.f = 1;
    o.x = q[0] + Math.sin(now * 2.1 + r.a * TAU) * 0.8 + (dup ? r.gx * 1.5 : 0); o.y = q[1] + Math.cos(now * 1.7 + r.b * TAU) * 0.8 + (dup ? r.gy * 1.5 : 0);
    // (vague 52) le titre a de l'épaisseur : chaque étoile a sa profondeur, et le titre pivote un peu quand la souris bouge (parallaxe), comme un hologramme
    const pz = r.a - 0.5, pp = Wd.ptr; if (pp && pp.on && Wd.t - pp.moved < 4) { o.x += (pp.x / W - 0.5) * pz * 46; o.y += (pp.y / (E.H || 800) - 0.5) * pz * 30; }
    o.x += Math.sin(now * 0.8) * pz * 10;
    // (vague 89 de l'audit, « les titres en étoiles ») : les lettres qu'on frôle se défont et tourbillonnent autour du pointeur, comme de la
    // poussière d'étoiles qu'on remue ; la souris s'éloigne : elles retombent sur leur lettre
    if (pp && pp.on && Wd.t - pp.moved < 1.5 && !dup) { const dx = q[0] - pp.x, dy = q[1] - pp.y, d = Math.hypot(dx, dy); if (d < 110) { const w = Math.pow(1 - d / 110, 0.6) * 0.9, an = now * (2.4 + r.b * 2) + r.a * TAU, rr = 14 + r.c * 34;
      o.x = lerp(o.x, pp.x + Math.cos(an) * rr, w); o.y = lerp(o.y, pp.y + Math.sin(an) * rr * 0.8, w); o.s *= 1 + w * 0.3; } }
    // (vague 198) le coup de patte : les étoiles que la plume posait à cet instant partent de travers (un trait raté), puis se remettent en place
    const ec = Wd.t - PEN.coup; if (ec < 2.4 && PEN.cid === PEN.id) { const w = Math.max(0, 1 - Math.abs(q[2] - PEN.uc + 0.012) / 0.04); if (w > 0) { const px = pts.px || 40, k = w * Math.exp(-ec * 1.5) * (1 + 0.25 * Math.sin(ec * 14));
      o.x += (r.a - 0.5) * px * 1.1 * k + PEN.dx * px * 0.35 * k; o.y += (r.b - 0.3) * px * 0.9 * k + px * 0.3 * k; } }
    const e = tl - PLUME.d - q[2] * PLUME.v, l = e > 0 ? Math.exp(-e * 5) : 0; o.s = 0.9 + l * 0.6; o.a = (dup ? 0.45 : 1.3) + l * 0.5; }; };
// la plume-comète : une tête blanche, une queue d'étincelles qui retombent derrière elle ; elle file sur chaque ligne, saute à la suivante, puis s'éteint en fin de titre
function plume(ctx, pts, tl, now, br) {
  const u = plumeU(tl); if (tl < PLUME.d || u >= 1 && tl > PLUME.d + PLUME.v + PARA.d) return;
  const ec = Wd.t - PEN.coup, sh = PEN.cid === PEN.id && ec < 0.6 ? Math.exp(-ec * 6) : 0;   // (giflée : la plume valdingue)
  const [x0, y] = plumeXY(pts, Math.min(u, 0.999)), px = pts.px || 40, fin = u >= 1 ? 1 - 0.5 * c01((tl - PLUME.d - PLUME.v) / PARA.d) : 1, x = x0 + PEN.dx * px * 0.8 * sh, yy = y + Math.sin(now * 23) * px * 0.18 + Math.sin(ec * 40) * px * 0.7 * sh;
  if (u < 1) { PEN.x = x; PEN.y = yy; PEN.u = u; PEN.T = Wd.t; const [vx, vy] = plumeXY(pts, Math.min(0.999, u + 0.16)); PEN.vise.x = vx; PEN.vise.y = vy; }   // (le chat vise un peu devant : il lui tend une embuscade)
  ctx.globalAlpha = 0.5 * fin; ctx.lineWidth = 1.2;
  for (let i = 1; i <= 14; i++) { const uu = u - i * 0.012; if (uu < 0) break; const [sx, sy] = plumeXY(pts, uu), dy = i * i * 0.35 + Math.sin(i * 1.7 + now * 9) * px * 0.2, rr = br * (2.6 - i * 0.14) * 2.2;
    ctx.globalAlpha = (1 - i / 15) * 0.8 * fin; ctx.drawImage(LUEUR, sx - rr, sy + dy - rr, rr * 2, rr * 2); }
  const R0 = br * 11 * (0.9 + 0.1 * Math.sin(now * 31)); ctx.globalAlpha = fin; ctx.drawImage(LUEUR, x - R0, yy - R0, R0 * 2, R0 * 2);
  ctx.globalAlpha = 0.9 * fin; ctx.lineWidth = 1.4; ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4 + now * 2; ctx.moveTo(x - Math.cos(a) * R0 * 0.9, yy - Math.sin(a) * R0 * 0.9); ctx.lineTo(x + Math.cos(a) * R0 * 0.9, yy + Math.sin(a) * R0 * 0.9); } ctx.stroke();
}
/* (vague 138, l'audit : « les titres en étoiles », design) : la plume signe. Le titre écrit, elle ne s'éteint plus au bout de la ligne : elle boucle
   et revient en paraphe sous tout le titre, une volute d'étoiles épaisse au milieu, fine aux deux bouts, comme un trait de plume ; au moment où le
   titre se défait, le paraphe rapetisse jusqu'à rien et l'onde de choc part de là où la plume a levé */
const PARA = { d: 0.08, v: 0.5 };
function paraphe(pts, s) {   // s de 0 à 1 : de la fin de la dernière ligne, une boucle, puis le trait vers la gauche, sous tout le titre
  const lg = pts.lg, g = lg[lg.length - 1], px = pts.px || 40, xL = Math.min(...lg.map(l => l.x0)) + px * 0.3, xR = g.x1 + px * 0.15, rl = px * 0.26;
  const yb = Math.min(g.y + px * 0.62, (pts.y2 || 1e9) - rl * 1.4 - 4), q = (1 - s) * (1 - s);
  return [xR - (xR - xL) * s + rl * Math.sin(TAU * s * 2.2) * q * 1.4, yb + rl * (1 - Math.cos(TAU * s * 2.2)) * q * 0.7 - Math.sin(Math.PI * s) * px * 0.1]; }
function signe(ctx, pts, tl, now, br, tFin) {
  const t0 = PLUME.d + PLUME.v + PARA.d, p = c01((tl - t0) / PARA.v); if (p <= 0) return null;
  const pe = eio(p), rap = 1 - sm(c01((tl - (tFin - 0.28)) / 0.26)), n = 70; if (rap <= 0) return paraphe(pts, 1);
  for (let i = 0; i <= n; i++) { const s = i / n; if (s > pe) break; const [x, y] = paraphe(pts, s), ep = 0.45 + 1.1 * Math.sin(Math.PI * Math.min(1, s * 1.15)), age = (pe - s) * PARA.v,
      rr = br * 2.6 * ep * rap * (1 + 0.9 * Math.exp(-age * 9)) * (0.9 + 0.1 * Math.sin(now * 3 + i));
    ctx.globalAlpha = Math.min(1, 0.75 + Math.exp(-age * 9) * 0.5); ctx.drawImage(i % 3 ? LUEUR : (i % 2 ? BLEUE : DOREE), x - rr, y - rr, rr * 2, rr * 2); }
  if (p < 1) { const [px0, py0] = paraphe(pts, pe); PEN.x = px0; PEN.y = py0; PEN.u = 1; PEN.T = Wd.t; }
  if (p < 1) { const [x, y] = paraphe(pts, pe), R0 = br * 10 * (0.9 + 0.1 * Math.sin(now * 31)); ctx.globalAlpha = 1; ctx.drawImage(LUEUR, x - R0, y - R0, R0 * 2, R0 * 2); }
  return paraphe(pts, pe); }

/* (vague 42, l'audit : « la nuée », originalité) : entre deux formes, toute la nuée se rassemble un instant en une immense tête de chat
   qui nous fait un clin d'œil, puis se disperse vers la forme suivante ; u : la place de l'étoile sur le dessin, cl : l'œil droit fermé (0 → 1) */
function tete(u, v, cl) {
  if (u < 0.46) { const an = u / 0.46 * TAU; return [Math.cos(an) * 1.05, Math.sin(an) * 0.84 + 0.05]; }
  if (u < 0.6) { const w = (u - 0.46) / 0.14, g = w < 0.5 ? -1 : 1, t = (w % 0.5) * 2, q = t < 0.5 ? t * 2 : (t - 0.5) * 2;   // les oreilles
    const A = [0.92, -0.38], B = [0.78, -1.12], Cc = [0.3, -0.76], [p0, p1] = t < 0.5 ? [A, B] : [B, Cc];
    return [g * lerp(p0[0], p1[0], q), lerp(p0[1], p1[1], q)]; }
  if (u < 0.82) { const d = u < 0.71, cx = d ? -0.4 : 0.4, an = v * TAU, rr = Math.sqrt((u - (d ? 0.6 : 0.71)) / 0.11);   // les yeux : deux grands ovales pleins
    let x = cx + Math.cos(an) * 0.15 * rr, y = -0.02 + Math.sin(an) * 0.21 * rr;
    if (!d && cl > 0) { const t = (x - cx) / 0.15, ya = -0.02 - 0.07 * (1 - t * t); x = lerp(x, cx + t * 0.19, cl); y = lerp(y, ya, cl); }   // fermé : un petit arc ^
    return [x, y]; }
  if (u < 0.87) { const t = (u - 0.82) / 0.05 * 2 - 1; return [t * 0.16, 0.3 + 0.06 * Math.abs(Math.sin(t * Math.PI))]; }   // la bouche en w
  const w = (u - 0.87) / 0.13, k = Math.floor(w * 6), t = w * 6 - k, g = k < 3 ? -1 : 1, m = k % 3;   // les moustaches
  return [g * (0.45 + t * 0.75), 0.2 + (m - 1) * 0.1 + (m - 1) * t * 0.1]; }

/* (vague 89 de l'audit, « la nuée », elle sort d'elle-même) : la souris qui s'approche d'un élément du vrai site (logo, langue, flèches,
   boutons, chapitres) y attire une poignée d'étoiles de la nuée : elles quittent leur forme et viennent tracer le contour de l'élément,
   une constellation qui file le long de son bord ; la souris s'en va : elles repartent à leur place dans la forme */
const CST = { el: null, b: null, g: 0, T: 0, ui: null, uiT: -9, pts: [], lueur: LUEUR };
function constellation(pt) {
  const dt = Math.min(0.2, Math.max(0, Wd.t - (CST.T || Wd.t))); CST.T = Wd.t;
  if (!CST.ui || Wd.t - CST.uiT > 1) { CST.uiT = Wd.t; CST.ui = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *, .nav, [class*="fleche"]')].filter(e => !e.closest('.scenes, #stage')).map(e => ({ e, b: e.getBoundingClientRect() })).filter(q => q.b.width > 0); }
  let el = null, bb = null, bd = 70; if (pt) CST.ui.forEach(q => { const b = q.b, d = Math.hypot(Math.max(b.left - pt.x, 0, pt.x - b.right), Math.max(b.top - pt.y, 0, pt.y - b.bottom)); if (d < bd) { bd = d; el = q.e; bb = b; } });
  if (el && el !== CST.el && CST.g < 0.05) { CST.el = el; CST.b = bb; }
  CST.g = el && el === CST.el ? Math.min(1, CST.g + dt / 0.7) : Math.max(0, CST.g - dt / 0.9); if (CST.g <= 0) CST.el = null;
}
// (sa place sur le contour de l'élément, un rectangle aux coins arrondis un peu plus grand que lui ; u de 0 à 1 fait le tour)
function surBord(b, u) { const m = 9, x0 = b.left - m, y0 = b.top - m, w = b.width + 2 * m, hh = b.height + 2 * m, L = 2 * (w + hh); let d = fr(u) * L;
  if (d < w) return [x0 + d, y0]; d -= w; if (d < hh) return [x0 + w, y0 + d]; d -= hh; if (d < w) return [x0 + w - d, y0 + hh]; d -= w; return [x0, y0 + hh - d]; }

/* ——— l'image ——— */
const o = { x: 0, y: 0, z: 0, s: 1, a: 1, t: 0, tx: 0, ty: 0, tz: 0, p2: 0, f: 1 };
X.fond.push((ctx, now) => {
  const EP = window.EspacePlume, M = EP && EP.M; if (!M || !M.lay || !M.lay.G) { dern = null; return; }
  const L = M.lay, G = L.G, W = L.W, H = L.H; prepare(W, H);
  E.G = G; E.W = W; E.H = H; E.cx = W / 2; E.cy = G.cy; E.K = Math.min(W * 0.46, H * 0.5);
  const C = M.sc, D = EP.DUREE || { A: 1.7 }, tl = C ? Wd.t - C.t0 : 0, pts = C && !reduit && tl < D.A - 0.35 ? titre(C.S.t, W, H, L.barre.bas + 16, (M.bande ? M.bande.y : G.caps || G.bas) - 10) : null;
  if (C && !C.nid) C.nid = ++NID;
  const id = C ? C.nid * 2 + (pts ? 0 : 1) : 'intro';
  if (id !== dern) { F.set(P); T0 = sauter ? -1e9 : Wd.t; sauter = false; dern = id; rot = Math.random() < 0.5 ? -1 : 1; if (C && !pts && T0 > 0) { VENT.t0 = T0; VENT.rot = rot; VENT.dit = 0; } }
  const a = C ? tl - D.A + 0.2 : Wd.t - M.t0, fo = (C && FORMES[C.S.d]) || FORMES.galaxie, { V, f } = pts && pts.length ? { V: null, f: ecrit(pts, tl, W, now) } : fo(reduit ? 3 : a, reduit ? 0 : now, E);
  const duree = pts ? 0.95 : 1.4, etale = pts ? 0.35 : 0.6;
  const ap = reduit ? 1 : c01((Wd.t - M.t0) / 2.5), bd = M.bande, haut = L.barre.bas + 8, br = L.L ? 1.6 : 1.3, mx = W / 2, my = G.cy, dt = Wd.t - T0;
  const pp = Wd.ptr, pt = !reduit && pp && pp.on && Wd.t - pp.moved < 4 ? pp : null, RP = L.L ? 130 : 95, pax = pt ? (pt.x - W / 2) / W : 0, pay = pt ? (pt.y - H / 2) / H : 0;
  CST.pts = []; if (!reduit && !pts) constellation(pt); const cg = CST.el && !pts && C && C.cs ? sm(CST.g) : 0;
  // (29/09, 13 h 27, Mathieu : « trop d'effets lumineux ; garde les effets pour les animations utiles ») : une fois le titre écrit et le dessin
  // de la scène arrivé, la nuée se calme : plus pâle, plus petite, sans traînées ; elle reste un ciel, le dessin est le sujet
  const dessinee = C && !pts && window.EspaceScenes && EspaceScenes.S && EspaceScenes.S[C.S.d], calme0 = dessinee ? 1 - 0.7 * c01((a - 0.3) / 1.4) : 1;
  const gT = C && !pts && !reduit && dt < 3 ? eio(c01((dt - 0.1) / 0.45)) * (1 - eio(c01((dt - 1.35) / 0.6))) : 0, clin = c01((dt - 0.8) / 0.12) * (1 - c01((dt - 1.12) / 0.12));
  const calme = Math.max(calme0, gT);
  // (la tête tient entre la barre des chapitres et les sous-titres : jamais sur eux)
  const bas = (bd ? bd.y : G.caps || G.bas || H * 0.7) - 14; let KT = Math.min(E.K * 0.62, W * 0.4, (bas - haut - 10) / 2.05), YT = haut + 10 + KT * 1.14;
  // (vague 186, finition : au téléphone, l'oreille droite de la grande tête passait sur la planète chat, deux têtes de chat l'une sur l'autre ;
  // si la planète est dans la largeur de la tête, la tête descend sous elle, quitte à être un peu plus petite)
  { const Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat; if (Pc && Pc.x - Pc.r * 1.2 < mx + KT * 1.1 && Pc.x + Pc.r * 1.2 > mx - KT * 1.1 && Pc.y + Pc.r * 1.2 > YT - KT * 1.2) {
    const h0 = Math.max(haut + 10, Pc.y + Pc.r * 1.2 + 6), k2 = Math.min(KT, (bas - h0) / 2.05); if (k2 > KT * 0.6) { KT = k2; YT = h0 + KT * 1.14; } } }
  aimPrepare(!reduit && C && !pts && gT < 0.01 && dt > 2.2, !!pts || gT > 0.01);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgb(236,240,255)';
  for (let i = 0; i < N; i++) {
    const r = R[i], j = i * 4; o.s = 1; o.a = 1; o.t = 0; o.p2 = 0; f(r, o);
    let x = P[j], y = P[j + 1], s = 0, al = 0, fz = 1, tl = null;
    if (o.a > 0 && (o.p2 || !V)) { x = o.x; y = o.y; fz = o.f; s = br * o.s * Math.min(2.2, Math.pow(fz, 0.8)); al = o.a * c01(0.3 + fz * 0.8); }
    else if (o.a > 0) { const q = V(o.x, o.y, o.z); if (q[3] > 0) { x = q[0]; y = q[1]; fz = q[3]; s = br * o.s * Math.min(2.2, Math.pow(fz, 0.8)); al = o.a * c01(0.3 + fz * 0.8);
      if (o.t) { const q2 = V(o.tx, o.ty, o.tz); if (q2[3] > 0) tl = [q2[0], q2[1]]; } } }
    // la transformation : chaque étoile part de là où elle était, à son heure, et tourne un peu autour du centre en chemin
    const qq = pts && pts.length ? pts[r.i % pts.length] : null, e = reduit ? 1 : qq ? eio((dt - PLUME.d - qq[2] * PLUME.v + 0.3) / 0.4) : eio((dt - r.d * etale) / duree);
    if (e < 1 && qq) {   // (vague 10) l'étoile attend la plume, file vers sa pointe, puis tombe sur sa lettre
      const [cx2, cy2] = plumeXY(pts, qq[2]), v = 1 - e, x0 = F[j], y0 = F[j + 1];
      x = v * v * x0 + 2 * v * e * cx2 + e * e * x; y = v * v * y0 + 2 * v * e * (cy2 - (pts.px || 40) * 0.6) + e * e * y; s = lerp(F[j + 2], s, e); al = lerp(F[j + 3] * 0.8, al, e); tl = null; }
    else if (e < 1) {
      // (vague 26, l'audit : « la nuée ») : le passage d'une forme à l'autre est un vol à travers la nuée : en chemin, chaque étoile vient vers nous
      // (elle grossit, s'écarte du centre), laisse une traînée de vitesse derrière elle, et s'allume en se posant
      const x0 = F[j], y0 = F[j + 1], x1 = x, y1 = y, vol = ee => { const lx = lerp(x0, x1, ee) - mx, ly = lerp(y0, y1, ee) - my, b = Math.sin(Math.PI * ee), an = b * (0.5 + r.a * 0.7) * rot, gr = 1 + b * (0.2 + 0.6 * r.b * r.b);
        return [mx + (lx * Math.cos(an) - ly * Math.sin(an)) * gr, my + (lx * Math.sin(an) + ly * Math.cos(an)) * gr]; };
      // (vague 138, finition : la traînée de la forme d'arrivée partait de la cible, pas de l'étoile en vol : au début et à la fin d'un vol, de longs traits
      // barraient l'écran pendant quelques images ; en vol, seule la traînée du vol compte)
      tl = null; [x, y] = vol(e); s = lerp(F[j + 2], s, e) * (1 + Math.sin(Math.PI * e) * 1.3 * r.b * r.b); al = lerp(F[j + 3], al, e);
      // (la traînée : là où l'étoile était un peu plus tôt sur son chemin, pas à l'image d'avant : nette même si l'écran rame)
      if (e > 0.06 && e < 0.9) { const q = vol(e - 0.035), d2 = (q[0] - x) ** 2 + (q[1] - y) ** 2; tl = d2 > 16 && d2 < 14400 ? q : null; }
      if (e > 0.82) al *= 1 + 1.6 * Math.sin(Math.PI * (e - 0.82) / 0.18); }
    // (la tête de chat : même heure pour toutes les étoiles, pour que le dessin se lise d'un coup ; puis chacune repart vers sa forme)
    if (gT > 0.01) { const [hx, hy] = tete(r.e, r.c, clin), tk = Math.sin(now * 1.3) * 0.06, K2 = KT, hx2 = hx * Math.cos(tk) - hy * Math.sin(tk), hy2 = hx * Math.sin(tk) + hy * Math.cos(tk),
        jx = mx + hx2 * K2 + Math.sin(now * 3 + r.a * 9) * 2, jy = YT + hy2 * K2 + Math.cos(now * 2.7 + r.b * 9) * 2;
      x = lerp(x, jx, gT); y = lerp(y, jy, gT); s = lerp(s, br * 1.15, gT); al = lerp(al, 0.95, gT); tl = null; }
    // (la constellation : une étoile sur quatorze quitte sa forme pour le bord de l'élément approché, et y file)
    if (cg > 0 && i % 14 === 0) { const w = sm(c01(cg * 1.6 - r.c * 0.6)), [bx, by] = surBord(CST.b, r.e + Wd.t * (0.04 + r.a * 0.03)); x = lerp(x, bx + Math.sin(now * 4 + r.a * 9) * 1.5, w); y = lerp(y, by + Math.cos(now * 3.3 + r.b * 9) * 1.5, w); s = lerp(s, br * 1.25, w); al = lerp(al, 1.1, w); tl = null; P[j] = x; P[j + 1] = y; P[j + 2] = s; P[j + 3] = al;
      CST.pts.push(x, y, s * 3.4, Math.min(1, al * ap)); continue; }   // (dessinées par-dessus tout, sur la toile du haut de js/espace-scenes.js : sinon la Terre les cache)
    if (i % 4 === 0 && (AIM.on || AC[i] || AR[i])) { const q = aimant(i, j, x, y); if (q) { x = q[0]; y = q[1]; s = Math.max(s, br * q[2]); al = Math.max(al, q[3]); tl = null; if (calme < 1) al /= Math.max(0.3, calme); } }
    // (le doigt ou la souris : les étoiles s'écartent sur son passage, et tout le ciel penche un peu vers lui, les proches plus que les lointaines)
    if (pt) { const dx = x - pt.x, dy = y - pt.y, d2 = dx * dx + dy * dy; if (d2 < RP * RP) { const dd = Math.sqrt(d2) || 1, q = 1 - dd / RP; x += dx / dd * q * q * RP * 0.5; y += dy / dd * q * q * RP * 0.5; al *= 1 + q * 0.8; }
      x -= pax * Math.min(2, fz) * 18; y -= pay * Math.min(2, fz) * 12; }
    P[j] = x; P[j + 1] = y; P[j + 2] = s; P[j + 3] = al;
    if (al <= 0.01 || x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
    // (discrètes derrière les sous-titres et la barre des chapitres ; elles scintillent)
    let k = al * ap * (0.8 + 0.2 * Math.sin(now * (1.2 + r.b * 2) + r.c * TAU));
    if (bd && x > bd.x - 20 && x < bd.x + bd.w + 20 && y > bd.y - 20 && y < bd.y + bd.h + 20) k *= 0.06;
    k *= calme; if (calme < 0.9) tl = null;
    if (y < haut) k *= 0.3;
    if (pts && pts.length) k *= 1.5;
    if (k > 1.6) k = 1.6;
    if (tl) { ctx.globalAlpha = Math.min(1, k * 0.55); ctx.lineWidth = Math.max(0.6, s * 0.9); ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(x, y); ctx.stroke(); }
    // (vague 228 de l'audit, design : posées sur le titre, les lueurs se chevauchaient en une brume grise et les lettres paraissaient floues) :
    // sur un titre, chaque étoile garde une lueur serrée, la lettre se lit comme une constellation nette
    const rr = pts && pts.length ? s * 2.5 * (k > 1 ? 1 + (k - 1) * 0.3 : 1) : s * (2.6 + 1.4 * calme) * (k > 1 ? 1 + (k - 1) * 0.8 : 1); ctx.globalAlpha = Math.min(1, k); ctx.drawImage(r.c < 0.2 ? BLEUE : r.c > 0.87 ? DOREE : LUEUR, x - rr, y - rr, rr * 2, rr * 2);
    // (vague 137, finition) : les plus brillantes, une sur soixante-dix, ont leurs aigrettes de diffraction, comme sur une photo du ciel : une croix fine
    // qui tourne très lentement et dont les branches battent un peu ; seulement une fois posées (pas en vol), et plus courtes quand la nuée se calme
    if (r.e > 0.986 && !tl && !pts && k > 0.35 && !reduit) { const lg = rr * (1.6 + 1.2 * calme) * (0.85 + 0.15 * Math.sin(now * 2.1 + r.a * 9)), an = r.a * TAU + now * 0.05 * (r.b < 0.5 ? 1 : -1);
      ctx.globalAlpha = Math.min(0.75, k * 0.5); ctx.lineWidth = Math.max(0.5, s * 0.35);
      for (let q = 0; q < 2; q++) { const ca = Math.cos(an + q * Math.PI / 2) * lg, sa = Math.sin(an + q * Math.PI / 2) * lg; ctx.beginPath(); ctx.moveTo(x - ca, y - sa); ctx.lineTo(x + ca, y + sa); ctx.stroke(); } }
  }
  if (pts && pts.lg && !reduit) { PEN.id = C.nid; plume(ctx, pts, dt, now, br); const sg = signe(ctx, pts, dt, now, br, D.A - 0.35); FIN = sg ? { x: sg[0], y: sg[1], id: C.nid, t: 0 } : { x: pts.lg[pts.lg.length - 1].x1, y: pts.lg[pts.lg.length - 1].y, id: C.nid, t: 0 }; }
  // (vague 52 de l'audit, « les titres en étoiles », immersion) : quand le titre se défait, là où la plume s'est arrêtée part une onde de choc
  // d'étoiles, deux anneaux qui balaient tout l'écran jusqu'aux bords ; les étoiles de l'anneau rapetissent en s'éloignant (aucun fondu)
  else if (FIN && C && FIN.id === C.nid && !reduit) { if (!FIN.t) { FIN.t = Wd.t; CHOC.x = FIN.x; CHOC.y = FIN.y; CHOC.t = Wd.t; CHOC.Rm = Math.hypot(Math.max(FIN.x, W - FIN.x), Math.max(FIN.y, H - FIN.y)); CHOC.vus = new Set(); CHOC.dit = false; } const e = Wd.t - FIN.t, Rm = Math.hypot(Math.max(FIN.x, W - FIN.x), Math.max(FIN.y, H - FIN.y));
    if (e > 1.1) FIN = null; else for (let j = 0; j < 2; j++) { const u = c01((e - j * 0.16) / 0.95); if (u <= 0 || u >= 1) continue; const R = Rm * (1 - Math.pow(1 - u, 2.2)), n = 64, rr = br * (5 - j * 1.6) * (1 - u);
      ctx.globalAlpha = 1; for (let i = 0; i < n; i++) { const an = i / n * TAU + j * 0.05 + Math.sin(i * 2.3) * 0.02, x = FIN.x + Math.cos(an) * R, y = FIN.y + Math.sin(an) * R * 0.92;
        if (x < -rr || x > W + rr || y < -rr || y > H + rr || bd && y > bd.y && y < bd.y + bd.h && x > bd.x && x < bd.x + bd.w) continue; ctx.drawImage(LUEUR, x - rr, y - rr, rr * 2, rr * 2); } } }
  ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
});
/* (vague 198 de l'audit, « titres écrits en étoiles », originalité) : la plume-comète, c'est un jouet. Pendant qu'elle écrit, le chat le plus
   proche du titre la prend en chasse à la nage ; s'il l'attrape, PAF, un coup de patte : la plume valdingue, et les étoiles qu'elle posait
   à cet instant partent de travers (un trait raté au milieu du titre), puis se remettent en place peu à peu ; le chat, lui, part en vrille */
const PEN = { x: 0, y: 0, u: 0, T: -9, id: 0, chasse: 0, coup: -9, cid: -1, uc: 0, dx: 1, chat: null, vise: { x: 0, y: 0, r: 0.3 } };
PEN.paf = c => { const S = c.sp; S.m = 'derive'; S.next = Wd.t + 2; PEN.chat = null; if (Wd.t - PEN.T > 0.1 || PEN.cid === PEN.id) return;
  PEN.coup = Wd.t; PEN.cid = PEN.id; PEN.uc = PEN.u; PEN.dx = c.face > 0 ? 1 : -1; S.vx = -PEN.dx * Wd.s0 * 0.9; S.vy -= Wd.s0 * 0.5; S.w = (S.w || 0) + PEN.dx * 7; S.bonk = Wd.t;
  Wd.fx.push({ k: 'txt', text: ['PAF', 'TCHAK', 'POF'][Math.floor(Math.random() * 3)], x: PEN.x, y: PEN.y - 30, t0: Wd.t, life: 0.9, rot: (Math.random() - 0.5) * 0.4, size: 24 });
  O.apres(0.5, () => K.say(c, ['attrapée !', 'oups', 'j’ai rien fait', 'hé hé'][Math.floor(Math.random() * 4)])); };
// (la chasse : il fonce vers où la plume va passer, à toute vitesse, freine, se remet dans l'axe ; à portée de patte : PAF)
X.mode.chasse = (c, dt) => { const S = c.sp;
  if (Wd.t - PEN.T > 0.1 || Wd.t > S.fin) { S.m = 'derive'; S.next = Wd.t + 2; PEN.chat = null; return; }   // (la plume a fini : il laisse tomber)
  const [x, y] = O.centreDe(c), dx = PEN.vise.x - x, dy = PEN.vise.y - y, d = Math.hypot(dx, dy) || 1, a = 2600 * Wd.s0 / 150, vm = 900 * Wd.s0 / 150, fr = Math.exp(-dt * 2.5);
  S.vx = (S.vx + dx / d * a * dt) * fr; S.vy = (S.vy + dy / d * a * dt) * fr; const v = Math.hypot(S.vx, S.vy); if (v > vm) { S.vx *= vm / v; S.vy *= vm / v; }
  c.x += S.vx * dt; c.y += S.vy * dt; c.face = dx < 0 ? -1 : 1; c.anim = 'nage'; c.spin = (c.spin || 0) * Math.exp(-dt * 4);
  if (Math.hypot(x - PEN.x, y - PEN.y) < O.rayon(c) * 3.2) PEN.paf(c); };
X.pas.push((dt, cats) => {
  if (reduit || Wd.t - PEN.T > 0.1 || PEN.chasse === PEN.id || !PEN.id) return; PEN.chasse = PEN.id;
  const L = cats.filter(c => c.sp && !c.held && !c.rare && /^(derive|nage|orbite|calin)$/.test(c.sp.m)); if (!L.length) return;
  const d = c => { const [x, y] = O.centreDe(c); return Math.hypot(x - PEN.x, (y - PEN.y) * 1.6); }, c = L.sort((a, b) => d(a) - d(b))[0];
  c.sp.m = 'chasse'; c.sp.fin = Wd.t + 2.4; PEN.chat = c; K.say(c, ['une comète !', 'à moi !', '!!', 'je l’ai…'][Math.floor(Math.random() * 4)]);
});
/* (vague 197 de l'audit, « la nuée », originalité) : l'électricité statique. Un chat qui dérive à travers la nuée la ramasse : les étoiles
   qu'il frôle restent collées à son poil (une auréole qui tourne avec lui) ; trop chargé, ça le chatouille : ATCHOUM, il éternue tout,
   un jet d'étoiles devant son nez, et le recul l'envoie à reculons en vrille ; les étoiles éternuées freinent puis regagnent leur forme */
const AIM = { on: false, L: [] }, AC = [], AX = [], AY = [], AS = [], AR = [];
function aimPrepare(on, lache) {
  AIM.on = on; AIM.lache = lache; AIM.L = on ? Wd.cats.filter(c => c.sp && (c.sp.m === 'derive' || c.sp.m === 'nage') && !c.held && !c.gone && c.s > 0.01 && Wd.t > (c.atchoumT || 0) + 6).map(c => { const [x, y] = O.centreDe(c); return { c, x, y, r: O.rayon(c) }; }) : [];
}
function aimant(i, j, x, y) {
  const r = AR[i];
  if (r) { const u = Wd.t - r.t, e = c01(u / 1.6); if (e >= 1) { AR[i] = null; return null; }
    const k = 2.6, f = (1 - Math.exp(-k * u)) / k, fx = r.x + r.vx * f, fy = r.y + r.vy * f, w = eio(c01((u - 0.35) / 1.25));
    return [lerp(fx, x, w), lerp(fy, y, w), 1.5 * (1 - w) + 1, 1]; }
  const c = AC[i];
  if (c) { if (c.gone || c.held || !c.sp || (c.sp.m !== 'derive' && c.sp.m !== 'nage' && c.sp.m !== 'tenu') || AIM.lache || c.atchoumT > AS[i].t) {   // éternué (ou attrapé, aspiré) : il part
      const pr = [P[j], P[j + 1]], ex = c.atchoumT > AS[i].t, sp = ex ? Wd.s0 * (4 + 5 * Math.random()) : Wd.s0 * 0.8, an = ex ? (c.face > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.1 : Math.atan2(pr[1] - c.y, pr[0] - c.x);
      AR[i] = { t: Wd.t, x: pr[0], y: pr[1], vx: Math.cos(an) * sp, vy: Math.sin(an) * sp }; AC[i] = null; c.aimN = Math.max(0, (c.aimN || 1) - 1); return [pr[0], pr[1], 2, 1]; }
    const [cx, cy] = O.centreDe(c), a = (c.spin || 0) - AS[i].sp, R = O.rayon(c) * AS[i].k,   // (O.rayon : le corps seul ; le poil va plus loin)
      ca = Math.cos(a), sa = Math.sin(a), wob = 1 + 0.04 * Math.sin(Wd.t * 9 + i);
    return [cx + (AX[i] * ca - AY[i] * sa) * R * wob, cy + (AX[i] * sa + AY[i] * ca) * R * wob, 1.7, 1.3]; }
  if (!AIM.on) return null;
  for (const q of AIM.L) { const dx = x - q.x, dy = y - q.y, d = Math.hypot(dx, dy); if (d > q.r * 2.6 || (q.c.aimN || 0) >= 24 || Wd.t < (q.c.aimNext || 0)) continue; q.c.aimNext = Wd.t + 0.22;   // (une à la fois : il se charge peu à peu)
    const dd = d || 1; AC[i] = q.c; AX[i] = dx / dd; AY[i] = dy / dd; AS[i] = { t: Wd.t, sp: q.c.spin || 0, k: 1.9 + Math.random() * 0.5 }; q.c.aimN = (q.c.aimN || 0) + 1; if (!q.c.aimT0) q.c.aimT0 = Wd.t;
    return [q.x + AX[i] * q.r * 2, q.y + AY[i] * q.r * 2, 1.7, 1.3]; }
  return null;
}
X.pas.push((dt, cats) => {
  if (reduit) return;
  cats.forEach(c => { const n = c.aimN || 0; if (!n) { c.aimT0 = 0; return; } if (!c.sp || (c.sp.m !== 'derive' && c.sp.m !== 'nage') || c.held) return;
    if (n === 6 && !c.aimDit) { c.aimDit = true; K.say(c, ['ça gratte', 'ça pique…', 'hiii', 'ah… ah…'][Math.floor(Math.random() * 4)]); }
    if (n >= 16 || (n >= 4 && Wd.t - c.aimT0 > 6)) {   // ATCHOUM : le jet part devant le nez, le chat recule en vrille
      c.atchoumT = Wd.t; c.aimN = 0; c.aimT0 = 0; c.aimDit = false; const S = c.sp, f = c.face > 0 ? 1 : -1;
      S.vx -= f * Wd.s0 * 1.8; S.vy += (Math.random() - 0.5) * Wd.s0 * 0.6; S.w = (S.w || 0) - f * 6; S.bonk = Wd.t;
      const [x, y] = O.centreDe(c); Wd.fx.push({ k: 'txt', text: ['ATCHOUM', 'ATCHA', 'TCHOUM'][Math.floor(Math.random() * 3)], x: x + f * O.rayon(c) * 1.6, y: y - O.rayon(c) * 0.8, t0: Wd.t, life: 1, rot: f * 0.15, size: 26 });
      O.apres(0.7, () => K.say(c, ['pardon', 'mieux', 'snif', 'à vos souhaits ?'][Math.floor(Math.random() * 4)])); } });
});
/* (vague 120, l'audit : « les titres en étoiles ») : l'onde de choc du titre qui se défait n'est plus une image : elle souffle.
   Chaque chat qu'elle rattrape est projeté vers l'extérieur, en vrille, sonné ; les plus proches de la fin du titre volent le plus loin */
const CHOC = { t: -9, x: 0, y: 0, Rm: 1, vus: new Set(), dit: false };
X.pas.push((dt, cats) => {
  const e = Wd.t - CHOC.t; if (reduit || e < 0 || e > 1.1) return; const u = c01(e / 0.95), R = CHOC.Rm * (1 - Math.pow(1 - u, 2.2));
  cats.forEach(c => { const S = c.sp; if (!S || c.held || CHOC.vus.has(c) || X.mode[S.m] || S.m === 'crache' || S.m === 'agrippe') return;
    const [x, y] = O.centreDe(c), dx = x - CHOC.x, dy = (y - CHOC.y) / 0.92, d = Math.hypot(dx, dy) || 1; if (d > R) return; CHOC.vus.add(c);
    const f = (1 - u * 0.7) * Wd.s0 * 3.2, sd = Math.random() < 0.5 ? -1 : 1; S.m = 'derive'; S.vx += dx / d * f; S.vy += dy / d * f * 0.92; S.w = (S.w || 0) + sd * (5 + 5 * (1 - u)); S.bonk = Wd.t;
    if (!CHOC.dit) { CHOC.dit = true; K.say(c, ['ouaaah !', 'pfiou !', 'hé !', 'whoosh'][Math.floor(Math.random() * 4)]); if (window.Dex && Dex.vu) Dex.vu('souffle-titre'); } });
});
/* (vague 119, l'audit : « la nuée ») : la nuée n'est plus un décor derrière les chats. Quand elle se rassemble en tête de chat géante,
   les chats qui flottent se tournent vers elle (l'un d'eux lui parle) ; quand elle se disperse vers la forme suivante, son tourbillon
   les emporte : ils partent en vrille dans le sens des étoiles, puis la dérive les reprend */
const VENT = { t0: -9, rot: 1, dit: 0 };
X.pas.push((dt, cats) => {
  const e = Wd.t - VENT.t0; if (reduit || e < 0 || e > 3) return;
  const tt = c01((e - 0.1) / 0.45) * (1 - c01((e - 1.35) / 0.6)), souffle = Math.sin(Math.PI * c01((e - 1.3) / 1.5)), L = cats.filter(c => !c.held && c.sp && c.sp.m === 'derive');
  if (!L.length) return;
  if (tt > 0.6 && !(VENT.dit & 1)) { VENT.dit |= 1; const c = L[Math.floor(Math.random() * L.length)], en = !/^fr/.test(document.documentElement.lang || 'fr');
    K.say(c, en ? ['is that me?', 'hi, big one!', 'mom?'][Math.floor(Math.random() * 3)] : ['c’est moi ?', 'coucou, le géant !', 'maman ?'][Math.floor(Math.random() * 3)]); }
  if (souffle > 0.3 && !(VENT.dit & 2)) { VENT.dit |= 2; const c = L[Math.floor(Math.random() * L.length)]; K.say(c, ['wiiii !', 'whoaaa', 'youhou !'][Math.floor(Math.random() * 3)]); if (window.Dex && Dex.vu) Dex.vu('vent-nuee'); }
  L.forEach(c => { const dx = c.x - E.cx, dy = c.y - E.cy, d = Math.hypot(dx, dy) || 1;
    if (tt > 0.5) c.face = dx < 0 ? 1 : -1;   // ils regardent la grosse tête
    if (souffle > 0) { const v = souffle * Wd.s0 * 1.5 * dt; c.sp.vx += (-dy / d * VENT.rot + dx / d * 0.25) * v; c.sp.vy += (dx / d * VENT.rot + dy / d * 0.25) * v; c.sp.w = (c.sp.w || 0) + VENT.rot * souffle * dt * 3; } });
});
return { FORMES, E, CST, get N() { return N; }, get P() { return P; }, fige() { T0 = -1e9; sauter = true; }, vers(t) { T0 = Wd.t - t; } };
})();
