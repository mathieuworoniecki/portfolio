/* Dans l'espace (l'écran 2) : on dessine, avec le même trait que les chats (blanc, rond, net).
   Appuyer et glisser dans le vide trace une ligne ; au lâcher, le dessin devient une chose, qui flotte et a une masse :
     un trait        une liane : les chats s'y accrochent (pattes de devant) et avancent dessus, patte après patte ; ils la font tanguer
     une forme close un objet : il a le poids de sa surface ; les chats le poussent, le tapent, rebondissent dessus ; dessinée autour d'eux, une cage
     une forme avec une entrée (qui tourne presque en rond) : un abri ; les chats y entrent par l'ouverture s'ils arrivent à s'y tenir
                     (secoué, qui file ou qui tourne vite : ils ratent, ou ils sont éjectés), et s'y roulent en boule
   Tout rebondit sur les bords ; on peut attraper un dessin et le lancer ; quatorze au plus, le plus vieux s'efface en poussière d'étoiles.
   Les planètes (js/espace-planetes.js) les poussent aussi : la liste est outils.corps. */
window.EspaceDessin = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, rnd, pick, clamp, sgn, sm } = K;
const TAU = Math.PI * 2, MAX = 14, TRAIT = 3, BL = '244,244,238';
const corps = O.corps = [];

/* ——— la géométrie ——— */
const long = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
// moins de points (Ramer-Douglas-Peucker), puis un peu arrondi (Chaikin) : le trait reste celui qu'on a tracé, en plus net
function rdp(P, e) {
  if (P.length < 3) return P.slice();
  const [a, b] = [P[0], P[P.length - 1]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  let im = 0, dm = 0; for (let i = 1; i < P.length - 1; i++) { const d = Math.abs((P[i][0] - a[0]) * dy - (P[i][1] - a[1]) * dx) / L; if (d > dm) { dm = d; im = i; } }
  if (dm <= e) return [a, b];
  const g = rdp(P.slice(0, im + 1), e), h = rdp(P.slice(im), e); return g.slice(0, -1).concat(h);
}
function chaikin(P, ferme) {
  const Q = [], n = P.length; if (!ferme) Q.push(P[0]);
  for (let i = 0; i < (ferme ? n : n - 1); i++) { const a = P[i], b = P[(i + 1) % n]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
  if (!ferme) Q.push(P[n - 1]); return Q;
}
const aire = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
// le tour total (en radians) : une forme qui tourne presque en rond, c'est un abri (ou une forme close)
function tour(P) { let t = 0; for (let i = 1; i < P.length - 1; i++) { const a = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]), b = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; t += d; } return t; }
function dedans(P, x, y) { let o = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) o = !o; } return o; }
// le point le plus proche sur un segment
function proche(ax, ay, bx, by, x, y) { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1); return [ax + dx * t, ay + dy * t, t]; }

/* ——— un dessin devient une chose ——— */
let nid = 0;
function nait(P0) {
  const L = long(P0); if (L < 26) return null;
  const xs = P0.map(p => p[0]), ys = P0.map(p => p[1]), D = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const gap = Math.hypot(P0[0][0] - P0[P0.length - 1][0], P0[0][1] - P0[P0.length - 1][1]), tr = Math.abs(tour(rdp(P0, 3)));
  let k = 'trait';
  if (L > 70 && gap < Math.max(22, D * 0.14)) k = 'forme';
  else if (L > 140 && gap < D * 0.65 && tr > 3.3) k = 'abri';
  let P = rdp(P0, 2.2); if (P.length > 2) P = chaikin(P, k === 'forme'); if (k === 'forme' && P.length > 3 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 6) P.pop();
  if (P.length < 2) return null;
  // le centre : de la surface pour une forme close, du trait pour le reste ; la masse : un rond de la taille d'un chat pèse un chat
  let cx = 0, cy = 0; P.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= P.length; cy /= P.length;
  const s0 = Wd.s0, A = Math.abs(aire(P)), m = k === 'forme' ? Math.max(0.15, A / (Math.PI * s0 * s0 * 0.25)) : Math.max(0.12, long(P) / (s0 * (k === 'abri' ? 2.4 : 3.2)));
  const loc = P.map(p => [p[0] - cx, p[1] - cy]), R = Math.max(...loc.map(p => Math.hypot(p[0], p[1]))), I = m * loc.reduce((q, p) => q + p[0] * p[0] + p[1] * p[1], 0) / loc.length + 1;
  const b = { id: ++nid, k, loc, P: loc.map(p => [0, 0]), x: cx, y: cy, a: 0, vx: rnd(-8, 8), vy: rnd(-8, 8), w: rnd(-0.08, 0.08), m, I, R, t0: performance.now() / 1000, fin: 0, dans: [], ferme: k !== 'trait',
    place: k === 'abri' ? Math.max(1, Math.floor(A / (Math.PI * Math.pow(s0 * 0.38, 2)))) : 0 };
  monde(b); corps.push(b);
  // trop de dessins : le plus vieux s'efface (ce qui s'y tenait flotte à nouveau)
  const vivants = corps.filter(o => !o.fin); if (vivants.length > MAX) efface(vivants[0]);
  // un chat le remarque
  const c = voisin(cx, cy, s0 * 4); if (c) say(c, pick(k === 'trait' ? ['une liane !', 'une corde !', 'à moi !', 'ooh'] : k === 'abri' ? ['une maison !', 'un abri !', 'chez moi !', 'je peux ?'] : ['un truc !', 'c\'est quoi ?', 'à moi !', 'ça bouge ?']));
  Wd.fx.push({ k: 'txt', text: k === 'trait' ? '~' : k === 'abri' ? '⌂' : '✦', x: cx, y: cy, t0: Wd.t, life: 0.9, rot: 0, size: 20 });
  return b;
}
function efface(b) { if (b.fin) return; b.fin = performance.now() / 1000; lacheTout(b); }
function lacheTout(b) { Wd.cats.forEach(c => { if (c.sp && c.sp.corps === b) libere(c, 60); }); b.dans.length = 0; }
function voisin(x, y, R) { let best = null, bd = R; Wd.cats.forEach(c => { if (!c.sp || c.held || c.sp.m === 'crache') return; const [a, b] = centreDe(c), d = Math.hypot(a - x, b - y); if (d < bd) { bd = d; best = c; } }); return best; }
// ses points à l'écran
function monde(b) { const co = Math.cos(b.a), si = Math.sin(b.a); for (let i = 0; i < b.loc.length; i++) { const p = b.loc[i]; b.P[i][0] = b.x + co * p[0] - si * p[1]; b.P[i][1] = b.y + si * p[0] + co * p[1]; } }
const versMonde = (b, lx, ly) => { const co = Math.cos(b.a), si = Math.sin(b.a); return [b.x + co * lx - si * ly, b.y + si * lx + co * ly]; };
const versLocal = (b, x, y) => { const co = Math.cos(b.a), si = Math.sin(b.a), dx = x - b.x, dy = y - b.y; return [co * dx + si * dy, -si * dx + co * dy]; };
// la vitesse d'un point du dessin (il avance et tourne)
const vitesse = (b, x, y) => [b.vx - b.w * (y - b.y), b.vy + b.w * (x - b.x)];
function pousse(b, x, y, jx, jy) { b.vx += jx / b.m; b.vy += jy / b.m; b.w += ((x - b.x) * jy - (y - b.y) * jx) / b.I; }
const segs = b => b.k === 'forme' ? b.P.length : b.P.length - 1;
// l'ouverture de l'abri, à l'écran : son milieu et, vers l'extérieur, sa normale
function porte(b) { const a = b.P[b.P.length - 1], z = b.P[0], mx = (a[0] + z[0]) / 2, my = (a[1] + z[1]) / 2; let nx = mx - b.x, ny = my - b.y; const n = Math.hypot(nx, ny) || 1; return { x: mx, y: my, nx: nx / n, ny: ny / n, w: Math.hypot(a[0] - z[0], a[1] - z[1]) }; }

/* ——— le tracé en cours ——— */
let trace = null;
X.trace = {
  debut(x, y) { trace = [[x, y]]; },
  suite(x, y) { if (!trace) return; const l = trace[trace.length - 1]; if (Math.hypot(x - l[0], y - l[1]) >= 3) trace.push([x, y]); },
  fin() { const P = trace; trace = null; if (!P) return false; return !!nait(P); }
};

/* ——— la physique, à chaque image (le temps du monde) ——— */
X.pas.push((dt, cats) => {
  const now = performance.now() / 1000, Wc = O.W, Hc = O.H, hautY = O.HAUT(), basY = O.BAS();
  // (ceux qu'on a sortis de là autrement : attrapés, soufflés par une onde)
  corps.forEach(b => { if (b.dans.length) b.dans = b.dans.filter(c => c.sp && c.sp.m === 'abri' && c.sp.corps === b); });
  for (let i = corps.length - 1; i >= 0; i--) if (corps[i].fin && now - corps[i].fin > 0.9) corps.splice(i, 1);
  corps.forEach(b => {
    if (b.tenu) { b.vx *= 0.9; b.vy *= 0.9; b.w *= Math.exp(-dt * 4); monde(b); return; }
    b.vx *= Math.exp(-dt * 0.12); b.vy *= Math.exp(-dt * 0.12); b.w *= Math.exp(-dt * 0.35);
    b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt; monde(b);
    // les bords : il rebondit (et tourne un peu)
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; b.P.forEach(p => { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
    if (x0 < 2 && b.vx < 0) { b.vx = -b.vx * 0.7; b.x += 2 - x0; b.w += b.vy * 0.002; }
    if (x1 > Wc - 2 && b.vx > 0) { b.vx = -b.vx * 0.7; b.x -= x1 - Wc + 2; b.w -= b.vy * 0.002; }
    if (y0 < hautY && b.vy < 0 && y1 - y0 < basY - hautY) { b.vy = -b.vy * 0.7; b.y += hautY - y0; }
    if (y1 > basY && b.vy > 0 && y1 - y0 < basY - hautY) { b.vy = -b.vy * 0.7; b.y -= y1 - basY; }
    monde(b);
  });
  // les dessins entre eux : les sommets de l'un contre les traits de l'autre (un sur deux : assez pour ne pas se traverser)
  for (let i = 0; i < corps.length; i++) for (let j = 0; j < corps.length; j++) {
    const A = corps[i], B = corps[j]; if (i === j || A.fin || B.fin || Math.hypot(A.x - B.x, A.y - B.y) > A.R + B.R + TRAIT) continue;
    for (let v = 0; v < A.P.length; v += 2) { const q = A.P[v]; if (Math.hypot(q[0] - B.x, q[1] - B.y) > B.R + TRAIT) continue;
      for (let s = 0; s < segs(B); s++) { const a = B.P[s], z = B.P[(s + 1) % B.P.length], [px, py] = proche(a[0], a[1], z[0], z[1], q[0], q[1]), dx = q[0] - px, dy = q[1] - py, d = Math.hypot(dx, dy);
        if (d >= TRAIT * 1.2 || d < 1e-4) continue;
        const nx = dx / d, ny = dy / d, over = TRAIT * 1.2 - d, tot = A.m + B.m;
        if (!A.tenu) { A.x += nx * over * B.m / tot; A.y += ny * over * B.m / tot; } if (!B.tenu) { B.x -= nx * over * A.m / tot; B.y -= ny * over * A.m / tot; }
        const [avx, avy] = vitesse(A, q[0], q[1]), [bvx, bvy] = vitesse(B, px, py), vn = (avx - bvx) * nx + (avy - bvy) * ny;
        if (vn < 0) { const ra = (q[0] - A.x) * ny - (q[1] - A.y) * nx, rb = (px - B.x) * ny - (py - B.y) * nx, jj = -1.5 * vn / (1 / A.m + 1 / B.m + ra * ra / A.I + rb * rb / B.I);
          if (!A.tenu) pousse(A, q[0], q[1], jj * nx, jj * ny); if (!B.tenu) pousse(B, px, py, -jj * nx, -jj * ny);
          if (-vn > 200 && Math.random() < 0.3) Wd.fx.push({ k: 'txt', text: pick(['clac', 'tac', 'poc']), x: q[0], y: q[1] - 8, t0: Wd.t, life: 0.7, rot: rnd(-0.2, 0.2), size: 14 }); }
        monde(A); monde(B); break; } }
  }
  // les chats contre les dessins : chaque trait est un mur (des deux côtés) ; le choc se partage selon les masses
  cats.forEach(c => {
    const S = c.sp; if (!S || c.held || !['derive', 'nage'].includes(S.m)) return;
    const r = rayon(c), mc = Math.pow(r / (Wd.s0 * 0.4), 2);
    corps.forEach(b => {
      if (b.fin || b.tenu) return;
      let [cx, cy] = centreDe(c); if (Math.hypot(cx - b.x, cy - b.y) > b.R + r + 4) return;
      for (let i = 0; i < segs(b); i++) {
        const a = b.P[i], z = b.P[(i + 1) % b.P.length], [px, py] = proche(a[0], a[1], z[0], z[1], cx, cy), dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy);
        const lim = r * 0.85 + TRAIT / 2; if (d >= lim || d < 1e-3) continue;
        const nx = dx / d, ny = dy / d, over = lim - d, tot = mc + b.m;
        c.x += nx * over * b.m / tot; c.y += ny * over * b.m / tot; b.x -= nx * over * mc / tot; b.y -= ny * over * mc / tot;
        const [bvx, bvy] = vitesse(b, px, py), vn = (S.vx - bvx) * nx + (S.vy - bvy) * ny;
        if (vn < 0) {
          const rc = (px - b.x) * ny - (py - b.y) * nx, j = -1.7 * vn / (1 / mc + 1 / b.m + rc * rc / b.I);
          S.vx += j * nx / mc; S.vy += j * ny / mc; pousse(b, px, py, -j * nx, -j * ny); S.w += rnd(-2, 2);
          if (-vn > 140 && Math.random() < 0.5) Wd.fx.push({ k: 'txt', text: pick(['boing', 'poc', 'bonk']), x: px, y: py - 10, t0: Wd.t, life: 0.8, rot: rnd(-0.2, 0.2), size: 14 });
        }
        [cx, cy] = centreDe(c);
      }
      // (s'il est au calme dans un abri, et qu'il reste de la place : il s'y installe)
      if (b.k === 'abri' && b.dans.length < b.place && Math.hypot(S.vx - b.vx, S.vy - b.vy) < 120 && dedans(b.P, cx, cy) && Wd.t - (S.sortiAbri ?? -9) > 4) entreAbri(c, b);
    });
  });
});

/* ——— les chats et les dessins : leurs envies ——— */
X.envie.push(c => {
  const L = corps.filter(b => !b.fin && !b.tenu); if (!L.length || Math.random() < 0.35) return false;
  const S = c.sp, [x, y] = centreDe(c), b = L.slice().sort((p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y))[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * L.length)];
  // un abri avec de la place : il va à l'entrée, puis dedans
  if (b.k === 'abri' && b.dans.length < b.place) {
    const cible = { get x() { const p = porte(b); return p.x + p.nx * rayon(c) * 1.4; }, get y() { const p = porte(b); return p.y + p.ny * rayon(c) * 1.4; }, r: 1.2, arrive: c => versAbri(c, b) };
    S.m = 'nage'; S.cible = cible; S.fin = Wd.t + 7; if (Math.random() < 0.5) say(c, pick(['je rentre !', 'maison !', 'j\'arrive'])); return true; }
  // une liane (ou le bord d'un objet) : il y va pour s'y accrocher
  if (b.k === 'trait' || Math.random() < 0.3) { const i = Math.floor(Math.random() * Math.max(1, b.loc.length - 1)), l = b.loc[i];
    const cible = { get x() { return versMonde(b, l[0], l[1])[0]; }, get y() { return versMonde(b, l[0], l[1])[1]; }, r: 0.9, arrive: c => accroche(c, b) };
    S.m = 'nage'; S.cible = cible; S.fin = Wd.t + 6; return true; }
  // un objet : il va le taper (paf), ou le pousser
  const cible = { get x() { return b.x; }, get y() { return b.y; }, r: 1 + b.R / rayon(c), arrive: c => tape(c, b) };
  S.m = 'nage'; S.cible = cible; S.fin = Wd.t + 6; return true;
});
function tape(c, b) {
  const S = c.sp, [x, y] = centreDe(c), dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy) || 1, f = 260 * Wd.s0 / 150 * Math.min(2, 1 / Math.sqrt(b.m));
  pousse(b, x + dx / d * rayon(c), y + dy / d * rayon(c), dx / d * f * b.m * 0.6, dy / d * f * b.m * 0.6 + rnd(-20, 20));
  S.vx -= dx / d * 60; S.vy -= dy / d * 60; S.m = 'derive'; S.anim = 'tape' in K.ANIMS ? 'tape' : 'chute'; S.next = Wd.t + rnd(1.5, 3); c.face = sgn(dx) || c.face;
  say(c, pick(['paf !', 'tiens !', 'hop', 'bim'])); Wd.fx.push({ k: 'txt', text: pick(['poc', 'toc', 'pouf']), x: x + dx / d * rayon(c), y: y + dy / d * rayon(c) - 8, t0: Wd.t, life: 0.8, rot: rnd(-0.2, 0.2), size: 15 });
}

/* ——— accroché à un trait (une liane, le bord d'un objet ou d'un abri) : il avance dessus, patte après patte ——— */
function accroche(c, b) {
  if (b.fin) { c.sp.m = 'derive'; return; }
  const [x, y] = centreDe(c); let bi = 0, bt = 0, bd = 1e9;
  for (let i = 0; i < segs(b); i++) { const a = b.P[i], z = b.P[(i + 1) % b.P.length], [px, py, t] = proche(a[0], a[1], z[0], z[1], x, y), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; bi = i; bt = t; } }
  const S = c.sp, mc = Math.pow(rayon(c) / (Wd.s0 * 0.4), 2);
  // il arrive avec son élan : la liane l'encaisse
  const [px, py] = pt(b, bi + bt); pousse(b, px, py, S.vx * mc * 0.6, S.vy * mc * 0.6);
  Object.assign(S, { m: 'liane', corps: b, u: bi + bt, sens: Math.random() < 0.5 ? 1 : -1, fin: Wd.t + rnd(6, 16), vx: 0, vy: 0, pas: 0 });
  S.ancre = () => S.corps && !S.corps.fin ? pt(S.corps, S.u) : null;
  if (Math.random() < 0.6) say(c, pick(['accroché !', 'hop', 'je tiens !', 'wiii']));
}
// un point du trait à l'abscisse u (le segment i, puis la fraction)
function pt(b, u) { const n = segs(b), i = clamp(Math.floor(u), 0, n - 1), t = clamp(u - i, 0, 1), a = b.P[i], z = b.P[(i + 1) % b.P.length]; return [a[0] + (z[0] - a[0]) * t, a[1] + (z[1] - a[1]) * t]; }
X.mode.liane = (c, dt) => {
  const S = c.sp, b = S.corps; c.anim = 'agrippe'; c.spin *= Math.exp(-dt * 3);
  if (!b || b.fin) { libere(c, 80); return; }
  // il avance, patte après patte (un petit à-coup à chaque prise) ; au bout, il repart dans l'autre sens, ou il saute
  const n = segs(b), segL = Math.max(8, long([b.P[0], b.P[Math.min(1, b.P.length - 1)]])), v = (40 + 30 * Math.max(0, Math.sin(S.t * 8))) * Wd.s0 / 150;
  S.u += S.sens * v * dt / segL * (b.loc.length > 2 ? 1 : 0.5);
  if (b.k === 'forme') S.u = (S.u + n) % n;
  else if (S.u <= 0 || S.u >= n) { S.u = clamp(S.u, 0, n); if (Math.random() < 0.5) S.sens = -S.sens; else { saute(c, b); return; } }
  // il gigote : la liane tangue sous lui ; et elle tourne trop vite, ou file : il lâche prise
  if ((S.pas = (S.pas || 0) + dt) > 0.35) { S.pas = 0; const [px, py] = pt(b, S.u); pousse(b, px, py, rnd(-30, 30) * b.m * 0.3, rnd(-30, 30) * b.m * 0.3); }
  if (Math.abs(b.w) > 3.2 || Math.hypot(b.vx, b.vy) > 900) { libere(c, 200); say(c, pick(['aaah !', 'trop vite !', 'miaaa'])); return; }
  if (Wd.t > S.fin) saute(c, b);
  c.face = S.sens >= 0 ? 1 : -1;
};
function saute(c, b) { const [px, py] = pt(b, c.sp.u); libere(c, 160); const [x, y] = centreDe(c), dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy) || 1; c.sp.vx += dx / d * 120; c.sp.vy += dy / d * 120; pousse(b, px, py, -dx / d * 40 * b.m, -dy / d * 40 * b.m); if (Math.random() < 0.4) say(c, pick(['hop !', 'youpi', 'wiii'])); }
function libere(c, v) {
  const S = c.sp, b = S.corps; S.ancre = null; S.corps = null; S.m = 'derive'; S.next = Wd.t + rnd(2, 4); S.anim = 'chute'; S.lache = Wd.t;
  if (b) { const i = b.dans.indexOf(c); if (i >= 0) b.dans.splice(i, 1); S.sortiAbri = Wd.t; S.vx = b.vx + rnd(-v, v); S.vy = b.vy + rnd(-v, v); S.w = rnd(-4, 4); }
  c.hidden = 0;
}

/* ——— l'abri : il entre par l'ouverture (s'il arrive à s'y tenir), se roule en boule, part avec lui ——— */
function versAbri(c, b) {
  if (b.fin || b.dans.length >= b.place) { c.sp.m = 'derive'; return; }
  // l'abri file ou tourne : il rate son entrée
  if (Math.hypot(b.vx, b.vy) > 160 || Math.abs(b.w) > 1.6) { c.sp.m = 'derive'; c.sp.vx = rnd(-120, 120); c.sp.vy = rnd(-120, 120); c.sp.anim = 'chute'; say(c, pick(['raté !', 'attends !', 'ça bouge !'])); return; }
  const p = porte(b), cible = { get x() { const l = versMonde(b, S0[0], S0[1]); return l[0]; }, get y() { return versMonde(b, S0[0], S0[1])[1]; }, r: 0.6, arrive: c => entreAbri(c, b) };
  // le fond de l'abri : à l'opposé de l'entrée
  const S0 = versLocal(b, b.x - p.nx * b.R * 0.25, b.y - p.ny * b.R * 0.25);
  c.sp.m = 'nage'; c.sp.cible = cible; c.sp.fin = Wd.t + 4;
}
function entreAbri(c, b) {
  if (b.fin || b.dans.length >= b.place || b.dans.includes(c)) return;
  const S = c.sp, [x, y] = centreDe(c);
  // (chacun sa place dans l'abri : pas sur un autre)
  let loc = versLocal(b, x, y); const r = rayon(c) * 1.3, occupe = l => b.dans.some(o => o.sp && o.sp.loc && Math.hypot(o.sp.loc[0] - l[0], o.sp.loc[1] - l[1]) < r);
  if (occupe(loc)) { const L = b.loc.map(p => [p[0] * 0.55, p[1] * 0.55]).filter(l => !occupe(l)); if (!L.length) return; loc = L[Math.floor(Math.random() * L.length)]; }
  b.dans.push(c);
  Object.assign(S, { m: 'abri', corps: b, loc, fin: Wd.t + rnd(8, 22), anim: pick(['dodo', 'pain', 'donut', 'ronron'].filter(a => K.ANIMS[a])), vx: 0, vy: 0 });
  // il arrive avec son élan : l'abri l'encaisse
  say(c, pick(['chez moi', 'rrrr', 'on est bien', '♥', 'zzz']));
}
X.mode.abri = (c, dt) => {
  const S = c.sp, b = S.corps; if (!b || b.fin) { libere(c, 80); return; }
  c.anim = S.anim; c.spin += (b.a * 0.3 - c.spin) * Math.min(1, dt * 2);
  // secoué (il tourne vite, ou file) : éjecté par l'entrée
  if (Math.abs(b.w) > 2.8 || Math.hypot(b.vx, b.vy) > 700) { sortAbri(c, b, 260); say(c, pick(['aaah !', 'miaaa', 'hé !'])); return; }
  // il suit son abri ; au bout d'un moment, il sort par l'entrée
  const [tx, ty] = versMonde(b, S.loc[0], S.loc[1]), [x, y] = centreDe(c), k = Math.min(1, dt * 6); c.x += (tx - x) * k; c.y += (ty - y) * k;
  if (Wd.t > S.fin) sortAbri(c, b, 90);
};
function sortAbri(c, b, v) { const p = porte(b); libere(c, 0); c.sp.vx = b.vx + p.nx * v; c.sp.vy = b.vy + p.ny * v; c.sp.m = 'nage'; c.sp.cible = { x: p.x + p.nx * Wd.s0 * 1.5, y: p.y + p.ny * Wd.s0 * 1.5 }; c.sp.fin = Wd.t + 2; }

/* ——— attraper un dessin, le lancer ——— */
const MOD = {
  drag(k, x, y) { const b = k.b; if (b.fin) return; if (!b.tenu) { b.tenu = true; k.px = x; k.py = y; k.t = Wd.t; }
    const [wx, wy] = versMonde(b, k.lx, k.ly), dt = Math.max(1 / 120, Wd.t - k.t); k.t = Wd.t;
    k.vx = (x - k.px) / dt; k.vy = (y - k.py) / dt; k.px = x; k.py = y; b.x += x - wx; b.y += y - wy; monde(b);
    // (les chats accrochés dessus sont secoués)
    if (Math.hypot(k.vx, k.vy) > 1600) Wd.cats.forEach(c => { if (c.sp && c.sp.corps === b && c.sp.m === 'liane') { libere(c, 300); say(c, 'wiii !'); } }); },
  release(k, vx, vy) { const b = k.b; b.tenu = false; b.vx = clamp(vx || 0, -1800, 1800); b.vy = clamp(vy || 0, -1800, 1800); b.w += clamp(((k.lx || 0) * (vy || 0) - (k.ly || 0) * (vx || 0)) / (b.I / b.m) * 0.3, -6, 6); }
};
X.grab.push((x, y) => {
  for (let j = corps.length - 1; j >= 0; j--) { const b = corps[j]; if (b.fin || Math.hypot(x - b.x, y - b.y) > b.R + 16) continue;
    for (let i = 0; i < segs(b); i++) { const a = b.P[i], z = b.P[(i + 1) % b.P.length], [px, py] = proche(a[0], a[1], z[0], z[1], x, y);
      if (Math.hypot(px - x, py - y) < 13) { const [lx, ly] = versLocal(b, x, y); return { mod: MOD, b, lx, ly }; } }
    if (b.k === 'forme' && dedans(b.P, x, y)) { const [lx, ly] = versLocal(b, x, y); return { mod: MOD, b, lx, ly }; } }
  return null;
});

/* ——— le dessin : le même trait que les chats (blanc, rond) ; une forme close est un peu pleine, l'entrée d'un abri a deux petits crans ——— */
function chemin(ctx, P, ferme) { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (ferme) ctx.closePath(); }
X.fond.push((ctx, now) => {
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
  corps.forEach(b => {
    const age = now - b.t0, fin = b.fin ? 1 - (now - b.fin) / 0.9 : 1, a = Math.max(0, fin);
    if (b.fin) { // il s'efface en poussière d'étoiles
      ctx.fillStyle = `rgba(${BL},${a})`; for (let i = 0; i < b.P.length; i += 2) { const p = b.P[i], u = (now - b.fin) * 30; ctx.beginPath(); ctx.arc(p[0] + Math.sin(i * 7.3) * u, p[1] + Math.cos(i * 3.1) * u, 1.3, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = a * a; }
    else ctx.globalAlpha = 1;
    if (b.k === 'forme') { chemin(ctx, b.P, true); ctx.fillStyle = `rgba(${BL},${0.05 + 0.2 * Math.max(0, 1 - age / 0.6)})`; ctx.fill(); }
    chemin(ctx, b.P, b.k === 'forme'); ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = TRAIT + Math.max(0, 1 - age / 0.4) * 3; ctx.stroke();
    if (b.k === 'abri') { const z = b.P[0], y = b.P[b.P.length - 1], p = porte(b); ctx.lineWidth = 2;
      [z, y].forEach(q => { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + p.nx * 7, q[1] + p.ny * 7); ctx.stroke(); }); }
    ctx.globalAlpha = 1;
  });
  // le trait en train d'être tracé
  if (trace && trace.length > 1) { chemin(ctx, trace, false); ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = TRAIT; ctx.stroke(); }
  ctx.restore();
});
// (le trait à main levée : la pointe du stylo, au bout)
X.devant.push(ctx => { if (!trace || !trace.length) return; const p = trace[trace.length - 1]; ctx.save(); ctx.fillStyle = `rgb(${BL})`; ctx.beginPath(); ctx.arc(p[0], p[1], TRAIT * 0.9, 0, TAU); ctx.fill(); ctx.restore(); });

X.retour.push(() => { corps.length = 0; trace = null; });
return { corps, nait, efface };
})();
