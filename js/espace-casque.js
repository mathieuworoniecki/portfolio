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
    const h = tete(c); C.x = h.x; C.y = h.y; C.rot = c.spin || 0; return;
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
function dessine(ctx, x, y, r, rot, now) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = `rgb(${BL})`;
  ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  // le reflet sur le verre : deux arcs, en haut à gauche
  ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${BL},0.75)`; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, Math.PI * 1.08, Math.PI * 1.38); ctx.stroke();
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, Math.PI * 1.45, Math.PI * 1.52); ctx.stroke();
  // le col : un anneau épais en bas
  ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(0, r * 0.9, r * 0.62, r * 0.16, 0, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, r * 0.9, r * 0.5, r * 0.1, 0, 0, Math.PI); ctx.stroke();
  // l'antenne, avec sa petite boule qui clignote
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.89); ctx.lineTo(r * 0.62, -r * 1.3); ctx.stroke();
  ctx.fillStyle = `rgba(${BL},${0.5 + 0.5 * (Math.sin(now * 5) > 0 ? 1 : 0.2)})`; ctx.beginPath(); ctx.arc(r * 0.64, -r * 1.36, r * 0.07, 0, TAU); ctx.fill();
  ctx.restore();
}
X.devant.push((ctx, now) => {
  if (!C) return;
  if (C.porte) { const h = tete(C.porte); dessine(ctx, h.x, h.y, h.r, C.porte.spin || 0, now); }
  else dessine(ctx, C.x, C.y, C.r, C.rot, now);
});

return { get C() { return C; }, arrive };
})();
