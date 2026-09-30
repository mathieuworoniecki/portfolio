/* Le casque d'astronaute (28/09, Mathieu : « des fois il y a un casque d'astronaute qui flotte, et le chat nage vers lui pour l'attraper et le mettre »).
   Un casque, une bulle de verre avec son col et sa petite antenne, entre de temps en temps par un bord de l'écran et dérive doucement, en tournant.
   Un chat qui le voit passer nage vers lui, l'attrape… et le met : sa tête dans la bulle (un reflet qui glisse dessus), « astronaute ! ».
   Il le garde un bon moment ; puis le casque saute (pop), et repart à la dérive. Un seul casque à la fois. On peut aussi l'attraper et le lancer. */
window.EspaceCasque = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, rnd, pick, clamp, sgn } = K;
const TAU = Math.PI * 2, BL = '244,244,238';
const en = () => window.I18N && I18N.lang && I18N.lang !== 'fr';

let C = null, prochain = null;   // C : { x, y, vx, vy, rot, w, r, porte (le chat), vise (le chat qui nage vers lui), fin }
const tete = c => { const h = c.hp || centreDe(c); return { x: h[0], y: h[1], r: c.b.head[0] * K.sc(c) * 1.75 }; };
function arrive() {
  const W = O.W, H = O.H, g = Math.random() < 0.5 ? -1 : 1, r = clamp(Wd.s0 * 0.26, 22, 44);
  C = { x: g < 0 ? -r : W + r, y: rnd(0.25, 0.6) * H, vx: -g * rnd(35, 60) * Wd.s0 / 150, vy: rnd(-12, 12), rot: rnd(-0.5, 0.5), w: rnd(-0.6, 0.6), r, porte: null, vise: null, t0: Wd.t };
}
function met(c) {
  if (!C || C.porte) return; C.porte = c; C.vise = null; C.fin = Wd.t + rnd(18, 32); c.sp.m = 'derive'; c.sp.next = Wd.t + rnd(1, 3); if (window.Dex && Dex.vu) Dex.vu('astronaute');
  say(c, pick(en() ? ['astronaut!', 'ready for launch', 'one small step…'] : ['astronaute !', 'paré au décollage', 'un petit pas pour un chat…', 'houston ?']));
  // vague 3 : le casque vissé, il DÉCOLLE : 3, 2, 1… une poussée, une traînée d'étincelles, une boucle
  C.tMet = Wd.t; C.trace = []; C.feu = Wd.t + 1.1; C.dir = rnd(0, TAU);
  const h = tete(c); ['3', '2', '1'].forEach((n, i) => setTimeout(() => { if (C && C.porte === c) Wd.fx.push({ k: 'txt', text: n, x: h.x + (i - 1) * h.r, y: h.y - h.r * 1.8, t0: Wd.t, life: 0.5, rot: rnd(-0.2, 0.2), size: 18 }); }, i * 330));
}
function enleve(vx, vy) {
  const c = C.porte, h = tete(c); C.porte = null; C.x = h.x; C.y = h.y; C.vx = vx ?? rnd(-60, 60); C.vy = vy ?? -rnd(70, 120); C.w = rnd(-3, 3); C.lache = Wd.t;
  Wd.fx.push({ k: 'txt', text: 'pop', x: h.x, y: h.y - h.r, t0: Wd.t, life: 0.9, rot: rnd(-0.2, 0.2), size: 16 });
}
X.entre.push(() => { C = null; prochain = Wd.t + rnd(8, 14); });
X.retour.push(() => { C = null; prochain = null; });

X.pas.push(dt => {
  if (prochain == null) return;
  if (!C) { if (Wd.t > prochain) arrive(); return; }
  if (C.porte) {
    const c = C.porte, S = c.sp;
    // il le perd : le temps est passé, on l'aspire, on le secoue fort, ou il a disparu
    if (!Wd.cats.includes(c) || c.gone || !S || S.m === 'aspire' || Wd.t > C.fin) { enleve(); return; }
    if (c.held && c.pend && Math.abs(c.pend.w || 0) > 9) { enleve((S.vx || 0) + rnd(-150, 150), -rnd(150, 250)); say(c, pick(['mon casque !', 'hé !'])); return; }
    const h = tete(c); C.x = h.x; C.y = h.y; C.rot = c.spin || 0;
    // le décollage : poussée tournante (une boucle) pendant 2,6 s, la traînée garde les positions
    if (C.feu && Wd.t > C.feu && Wd.t < C.feu + 2.6) {
      const u = (Wd.t - C.feu) / 2.6, a = C.dir + u * TAU * 0.9, v = 330 * Wd.s0 / 150 * (1 - u * 0.5);
      S.m = 'derive'; S.cible = null; S.next = Wd.t + 1; S.anim = 'apesanteur'; S.vx = Math.cos(a) * v; S.vy = Math.sin(a) * v;
      if (h.y < O.HAUT() + h.r * 2 && S.vy < 0) C.dir += 0.2; if (h.y > O.BAS() - h.r * 2 && S.vy > 0) C.dir -= 0.2;
      C.trace.push({ x: h.x - Math.cos(a) * h.r * 1.4, y: h.y - Math.sin(a) * h.r * 1.4, t: Wd.t, a });
      if (Math.random() < dt * 8) Wd.fx.push({ k: 'txt', text: pick(['✦', '·', '*']), x: h.x - Math.cos(a) * h.r * 1.8 + rnd(-6, 6), y: h.y - Math.sin(a) * h.r * 1.8 + rnd(-6, 6), t0: Wd.t, life: 0.7, rot: rnd(-1, 1), size: 12 });
    }
    if (C.trace) C.trace = C.trace.filter(p => Wd.t - p.t < 1.4);
    return;
  }
  // à la dérive : il tourne lentement ; il rebondit sur les bords (sauf pour entrer et sortir) et sur la Terre
  C.x += C.vx * dt; C.y += C.vy * dt; C.rot += C.w * dt; C.w *= Math.exp(-dt * 0.3);
  if (!C.tenu) { if (C.y - C.r < O.HAUT() && C.vy < 0) C.vy = -C.vy * 0.8; if (C.y + C.r > O.BAS() && C.vy > 0) C.vy = -C.vy * 0.8;
    const T = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.terre; if (T) { const dx = C.x - T.cx, dy = C.y - T.cy, d = Math.hypot(dx, dy); if (d < T.R + C.r) { const nx = dx / d, ny = dy / d, vn = C.vx * nx + C.vy * ny; C.x += nx * (T.R + C.r - d); C.y += ny * (T.R + C.r - d); if (vn < 0) { C.vx -= 1.8 * vn * nx; C.vy -= 1.8 * vn * ny; C.w += rnd(-2, 2); } } }
    if (Wd.t - C.t0 > 6 && ((C.x < C.r && C.vx < 0) || (C.x > O.W - C.r && C.vx > 0))) C.vx = -C.vx * 0.8; }
  // tout le monde l'a ignoré longtemps : il repart par où il veut, un autre viendra plus tard
  if (Wd.t - C.t0 > 70 && (C.x < -C.r * 2 || C.x > O.W + C.r * 2)) { C = null; prochain = Wd.t + rnd(20, 40); return; }
  // un chat qui dérive tout près le voit : il nage vers lui (un seul à la fois)
  if (C.vise && (!Wd.cats.includes(C.vise) || !C.vise.sp || C.vise.sp.m !== 'nage' || C.vise.sp.cible !== C.cible)) C.vise = null;
  if (!C.vise && Wd.t - (C.lache ?? -99) > 4 && Wd.t - C.t0 > 1.5 && C.x > 0 && C.x < O.W) {
    const c = Wd.cats.filter(c => c.sp && !c.held && c.sp.m === 'derive' && Math.hypot(centreDe(c)[0] - C.x, centreDe(c)[1] - C.y) < O.W * 0.45).sort((a, b) => Math.hypot(centreDe(a)[0] - C.x, centreDe(a)[1] - C.y) - Math.hypot(centreDe(b)[0] - C.x, centreDe(b)[1] - C.y))[0];
    if (c && Math.random() < dt * 1.2) {
      const Cc = C; C.cible = { get x() { return Cc.x; }, get y() { return Cc.y; }, r: 1.2, arrive: k => { if (C === Cc && !Cc.porte) met(k); } };
      c.sp.m = 'nage'; c.sp.cible = C.cible; c.sp.fin = Wd.t + 9; C.vise = c; say(c, pick(en() ? ['a helmet!', 'mine!', 'ooh!'] : ['un casque !', 'à moi !', 'oooh', 'je le veux !']));
    }
  }
});
// l'attraper, le lancer
const MOD = { drag(k, x, y) { C.x = x; C.y = y; }, release(k, vx, vy) { C.tenu = false; C.vx = clamp(vx || 0, -900, 900); C.vy = clamp(vy || 0, -900, 900); C.w = rnd(-4, 4); C.lache = Wd.t - 2; } };
X.grab.push((x, y) => { if (!C || C.porte || Math.hypot(x - C.x, y - C.y) > C.r * 1.2) return null; C.tenu = true; C.vise = null; return { mod: MOD }; });

// le dessin : la bulle, son reflet, le col, l'antenne ; posé sur un chat, par-dessus sa tête
function dessine(ctx, x, y, r, rot, now, porte) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = `rgb(${BL})`;
  // (vague 46, l'audit : « le casque », finition) : un vrai verre. Une teinte bleutée, plus dense sur les bords (le bombé) ; un liseré d'encre
  // sous le bord blanc qui détache la bulle de tout ce qui passe derrière ; dans le bas du verre, le reflet courbe de l'horizon de la Terre
  { const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r); g.addColorStop(0, 'rgba(170,210,255,0)'); g.addColorStop(0.7, 'rgba(170,210,255,0.05)'); g.addColorStop(1, 'rgba(170,210,255,0.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(7,8,12,0.9)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r + 1.5, 0, TAU); ctx.stroke(); ctx.strokeStyle = `rgb(${BL})`;
  ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.save(); ctx.rotate(-rot); ctx.strokeStyle = 'rgba(150,200,255,0.45)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(0, r * 1.9, r * 1.55, r * 1.2, 0, Math.PI * 1.3, Math.PI * 1.7); ctx.stroke(); ctx.restore();
  // le reflet sur le verre : deux arcs, en haut à gauche
  ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${BL},0.75)`; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, Math.PI * 1.08, Math.PI * 1.38); ctx.stroke();
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, Math.PI * 1.45, Math.PI * 1.52); ctx.stroke();
  // l'éclat qui balaie la visière toutes les quelques secondes, et deux étoiles reflétées dans le verre
  const bal = (now * 0.35) % 1; if (bal < 0.25) { const e = -1 + bal * 8; ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.96, 0, TAU); ctx.clip();
    ctx.strokeStyle = `rgba(${BL},0.55)`; ctx.lineWidth = r * 0.18; ctx.beginPath(); ctx.moveTo(e * r - r * 0.4, -r); ctx.lineTo(e * r + r * 0.4, r); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = `rgba(${BL},0.8)`; [[0.42, -0.35, 0.05], [0.55, 0.1, 0.035]].forEach(([u, v, t]) => { ctx.beginPath(); ctx.arc(u * r, v * r, r * t * (0.7 + 0.3 * Math.sin(now * 3 + u * 9)), 0, TAU); ctx.fill(); });
  // (vague 30, l'audit : « le casque ») : porté, il s'embue : à chaque souffle du chat, un nuage de buée monte du bas de la visière puis s'évapore ;
  // de temps en temps, il y dessine un cœur du bout de la patte, qui s'efface avec la buée
  if (porte) { const cyc = (now + (porte.id || 0) * 0.7) % 3.2, b = cyc < 0.5 ? cyc / 0.5 : Math.max(0, 1 - (cyc - 0.5) / 2.2);
    if (b > 0.01) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, TAU); ctx.clip(); ctx.fillStyle = `rgba(${BL},${0.3 * b})`;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse((i - 2) * r * 0.28, r * (0.72 - 0.25 * b) - Math.abs(i - 2) * r * 0.05, r * 0.3 * (0.6 + 0.4 * b), r * 0.22 * (0.5 + 0.5 * b), 0, 0, TAU); ctx.fill(); }
      if (Math.floor((now + (porte.id || 0) * 0.7) / 3.2) % 3 === 1 && cyc > 0.7) { const u = Math.min(1, (cyc - 0.7) / 0.9), hx = -r * 0.18, hy = r * 0.5, hs = r * 0.16, P = [];
        for (let i = 0; i <= 24 * u; i++) { const q = i / 24 * TAU; P.push([hx + 16 * Math.pow(Math.sin(q), 3) * hs / 16, hy - (13 * Math.cos(q) - 5 * Math.cos(2 * q) - 2 * Math.cos(3 * q) - Math.cos(4 * q)) * hs / 16]); }
        ctx.strokeStyle = `rgba(7,8,12,${0.8 * b + 0.1})`; ctx.lineWidth = 1.4; ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
      ctx.restore(); } }
  // (vague 80, l'audit : « le casque », il sort de l'espace) : sa visière, c'est aussi notre vitre. Elle reflète le pointeur (une petite flèche
  // courbée par le bombé, du côté où il est) ; et quand la souris passe sur le verre, elle y laisse une trace de doigt, qui tourne avec le casque
  { const S = Wd.ptr; if (S && S.on) { const cs = Math.cos(-rot), sn = Math.sin(-rot), gx = S.x - x, gy = S.y - y, dx = gx * cs - gy * sn, dy = gx * sn + gy * cs, d = Math.hypot(dx, dy) || 1;
      if (d < r * 6) { const k = r * 0.62 * d / (d + r * 0.9), px = dx / d * k, py = dy / d * k, s2 = r * 0.16 * (1 - k / r * 0.5), al = 0.55 * (1 - d / (r * 6));
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, TAU); ctx.clip(); ctx.translate(px, py); ctx.rotate(-rot - 0.2); ctx.scale(s2 / 10, s2 / 10 * (1 - k / r * 0.35));
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(3.8, 11.5); ctx.lineTo(6.6, 17.5); ctx.lineTo(9, 16.4); ctx.lineTo(6.3, 10.6); ctx.lineTo(11, 10.4); ctx.closePath();
        ctx.fillStyle = `rgba(${BL},${al.toFixed(3)})`; ctx.fill(); ctx.strokeStyle = `rgba(7,8,12,${(al * 0.8).toFixed(3)})`; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
      const T = dessine.traces || (dessine.traces = new WeakMap()), cle = porte || C, L = T.get(cle) || []; T.set(cle, L);
      if (d < r * 0.85 && Wd.t - S.moved < 0.2 && !(L.length && Math.hypot(L[L.length - 1].x - dx, L[L.length - 1].y - dy) < r * 0.35)) { L.push({ x: dx, y: dy, t: Wd.t, a: Math.random() * TAU }); if (L.length > 5) L.shift(); }
      for (let i = L.length - 1; i >= 0; i--) if (Wd.t - L[i].t > 7) L.splice(i, 1);
      if (L.length) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, TAU); ctx.clip(); ctx.strokeStyle = `rgba(${BL},0.32)`; ctx.lineWidth = 0.9;
        L.forEach(q => { const e = 1 - Math.max(0, (Wd.t - q.t - 5.5) / 1.5), R = r * 0.13 * e; if (R < 0.5) return;   // (elle se résorbe en rapetissant)
          for (let j = 1; j <= 4; j++) { ctx.beginPath(); ctx.ellipse(q.x, q.y, R * j / 4, R * j / 4 * 1.35, q.a, 0.3 + j * 0.5, TAU - 0.4 + j * 0.3); ctx.stroke(); } });
        ctx.restore(); } } }
  // le col : un anneau épais en bas
  ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(0, r * 0.9, r * 0.62, r * 0.16, 0, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, r * 0.9, r * 0.5, r * 0.1, 0, 0, Math.PI); ctx.stroke();
  ctx.fillStyle = `rgb(${BL})`; for (let i = 0; i < 6; i++) { const a = Math.PI * (0.12 + i * 0.152); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.62, r * 0.9 + Math.sin(a) * r * 0.16, Math.max(0.9, r * 0.035), 0, TAU); ctx.fill(); }   // (ses rivets)
  // l'antenne, avec sa petite boule qui clignote
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.89); ctx.lineTo(r * 0.62, -r * 1.3); ctx.stroke();
  ctx.fillStyle = `rgba(${BL},${0.5 + 0.5 * (Math.sin(now * 5) > 0 ? 1 : 0.2)})`; ctx.beginPath(); ctx.arc(r * 0.64, -r * 1.36, r * 0.07, 0, TAU); ctx.fill();
  ctx.restore();
}
X.devant.push((ctx, now) => {
  if (!C) return;
  // la traînée du décollage : une flamme de papier (deux traits qui s'effilent) derrière le chat
  if (C.trace && C.trace.length > 2) { ctx.save(); ctx.lineCap = 'round';
    for (let i = 1; i < C.trace.length; i++) { const p = C.trace[i], q = C.trace[i - 1], k = 1 - (Wd.t - p.t) / 1.4;
      ctx.strokeStyle = `rgba(255,${190 + 50 * k | 0},90,${0.8 * k})`; ctx.lineWidth = 2 + 12 * k * k; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = `rgba(${BL},${0.9 * k})`; ctx.lineWidth = 1 + 4 * k * k; ctx.stroke(); }
    ctx.restore(); }
  // (vague 19 de l'audit : « le casque ») : pendant le décollage, un réacteur dorsal de papier (deux tuyères, ses rivets) pousse le chat ;
  // il se déplie au « 1 », crache sa flamme, puis se replie
  if (C.porte && C.feu && Wd.t > C.feu - 0.4 && Wd.t < C.feu + 3) { const h = tete(C.porte), u = (Wd.t - C.feu) / 2.6, a = C.dir + Math.max(0, Math.min(1, u)) * TAU * 0.9,
      ou = Math.min(1, (Wd.t - C.feu + 0.4) / 0.3, (C.feu + 3 - Wd.t) / 0.3), r = h.r * 0.62 * ou;
    if (r > 1) { ctx.save(); ctx.translate(h.x - Math.cos(a) * h.r * 1.25, h.y - Math.sin(a) * h.r * 1.25); ctx.rotate(a + Math.PI / 2); ctx.lineJoin = ctx.lineCap = 'round';
      const papier = f => { ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 4.5; f(); ctx.stroke(); ctx.fillStyle = 'rgb(250,248,242)'; f(); ctx.fill(); ctx.strokeStyle = 'rgb(34,36,40)'; ctx.lineWidth = 1.6; f(); ctx.stroke(); };
      [-1, 1].forEach(g => papier(() => { ctx.beginPath(); ctx.moveTo(g * r * 0.55 - r * 0.28, -r * 0.7); ctx.lineTo(g * r * 0.55 + r * 0.28, -r * 0.7); ctx.lineTo(g * r * 0.55 + r * 0.36, r * 0.9); ctx.lineTo(g * r * 0.55 - r * 0.36, r * 0.9); ctx.closePath(); }));
      papier(() => { ctx.beginPath(); ctx.rect(-r * 0.42, -r * 0.9, r * 0.84, r * 1.3); });
      ctx.fillStyle = 'rgb(34,36,40)'; [[-0.25, -0.65], [0.25, -0.65], [-0.25, 0.2], [0.25, 0.2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * r, y * r, Math.max(0.8, r * 0.06), 0, TAU); ctx.fill(); });
      if (u > 0 && u < 1) [-1, 1].forEach(g => { const L = r * (1.1 + 0.5 * Math.sin(now * 40 + g)); ctx.fillStyle = '#ffd27a'; ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g * r * 0.55 - r * 0.3, r * 0.95); ctx.quadraticCurveTo(g * r * 0.55, r * 0.95 + L * 1.6, g * r * 0.55 + r * 0.3, r * 0.95); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      ctx.restore(); } }
  if (C.porte) { const h = tete(C.porte); dessine(ctx, h.x, h.y, h.r, C.porte.spin || 0, now, C.porte); }
  else dessine(ctx, C.x, C.y, C.r, C.rot, now);
});

return { get C() { return C; }, arrive, met };
})();
