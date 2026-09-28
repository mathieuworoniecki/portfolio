/* Les Nyan Cats (28/09, Mathieu : « on devrait aussi avoir des Nyan Cat »).
   Un chat qui vole tout droit, les pattes qui pédalent, et derrière lui un long ruban arc-en-ciel en escalier, qui ondule, semé d'étoiles.
   - Dans la pièce (l'écran 1) : le bouton arc-en-ciel du menu lance une parade (trois chats à des hauteurs différentes, l'un après l'autre) ;
     de temps en temps, un seul passe tout seul. Ce que son ruban frôle (un chat, un objet) devient arc-en-ciel un moment (js/arcenciel.js).
     Ce sont des visiteurs : ils entrent par un bord et sortent par l'autre (ils ne disparaissent jamais au milieu).
   - Dans l'espace (l'écran 2) : un chat à la dérive part parfois en Nyan Cat ; il traverse l'écran, ressort de l'autre côté, fait
     un ou deux passages, puis se remet à flotter. Un chat recraché par un petit trou blanc est parfois un Nyan Cat.
   - On peut attraper un Nyan Cat au vol : il s'arrête net (son ruban reste un instant là où il était). */
window.Nyan = (() => {
if (!window.Chats || !Chats.K || !window.Arc) return null;
const K = Chats.K, { Wd, H, STEPS, ANIMS, rnd, pick, clamp, sgn, sc, sOf, floorAt, say, later, fn, addCat, dust } = K;
const TAU = Math.PI * 2, COUL = Arc.COUL, VIE = 1.8;   // (le ruban : chaque bout vit VIE secondes, puis s'efface)
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

// le ruban : six bandes, en escalier (les marches de Nyan Cat) qui ondule ; P = [[x, y, t], …] du plus vieux au plus récent
function ruban(ctx, P, bw, now, a, dir) {
  if (P.length < 2) return;
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(${COUL[i]},${(0.9 * a).toFixed(3)})`; ctx.lineWidth = bw + 0.6; ctx.beginPath();
    let prevM = null;
    P.forEach(([x, y, t], j) => { const m = Math.floor(t * 9) % 2, yy = y + (i - 2.5) * bw + (m ? bw * 0.45 : -bw * 0.45);
      if (!j) ctx.moveTo(x, yy); else { if (m !== prevM) ctx.lineTo(x, P[j - 1][1] + (i - 2.5) * bw + (prevM ? bw * 0.45 : -bw * 0.45)); ctx.lineTo(x, yy); } prevM = m; });
    ctx.globalAlpha = 1; ctx.stroke(); }
  // les étoiles semées derrière : des petites croix qui clignotent
  for (let j = 0; j < P.length; j += 7) { const [x, y, t] = P[j], age = now - t, k = 1 - age / VIE; if (k <= 0) continue; const q = (t * 13) % 1, yy = y + (q - 0.5) * bw * 12, r = bw * (0.8 + 0.6 * Math.sin(now * 12 + t * 40));
    ctx.strokeStyle = `rgba(${COUL[(j / 7 | 0) % 6]},${(0.9 * a * k).toFixed(3)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - r, yy); ctx.lineTo(x + r, yy); ctx.moveTo(x, yy - r); ctx.lineTo(x, yy + r); ctx.stroke(); }
  ctx.restore();
}
// le bout du ruban s'efface par le début (le plus vieux), jamais d'un coup
const coupe = (P, now) => { while (P.length && now - P[0][2] > VIE) P.shift(); };

/* ——— dans la pièce ——— */
const VOLS = [];   // { c, P } : les rubans (ils restent le temps de s'effacer, même le chat parti)
STEPS.nyan = (c, T, dt) => {
  if (!T.P) { T.P = []; VOLS.push({ c, P: T.P }); T.y0 = c.y; c.face = T.dir; }
  const s = sc(c); c.anim = ANIMS.nage ? 'nage' : 'chute'; c.face = T.dir;
  c.x += T.dir * T.v * dt; c.y = T.y0 + Math.sin(T.t * 7) * s * 0.1; c.spin = Math.sin(T.t * 7) * 0.12;
  // le ruban part de derrière lui, à mi-corps
  T.P.push([c.x - T.dir * s * 0.55, c.y - s * 0.42, Wd.t]);
  // ce qu'il frôle devient arc-en-ciel, avec une gerbe d'étoiles
  Wd.cats.forEach(o => { if (o === c || o.nyanT > Wd.t || Math.abs(o.x - c.x) > s * 0.6 || Math.abs((o.y - sc(o) * 0.4) - (c.y - s * 0.4)) > s * 0.9) return; o.nyanT = Wd.t + 5; Arc.colore(o, 18); say(o, pick(['ooh ✨', 'wouah', '!?'])); etoiles(o.x, o.y - sc(o) * 0.6, 8); });
  Wd.props.forEach(it => { if (it.nyanT > Wd.t || it.a < 0.5 || Math.abs(it.x - c.x) > s * 0.5 || Math.abs(it.y - c.y) > s * 1.6) return; it.nyanT = Wd.t + 5; Arc.colore(it, 18); etoiles(it.x, it.y - s * 0.3, 6); });
  if (Wd.t > (T.dit || 0)) { T.dit = Wd.t + rnd(1.2, 2); if (Math.random() < 0.6) say(c, pick(['nyan nyan nyan', 'nya-nya-nyan ♪', 'nyaaan ✨', '♪♫'])); }
  return T.dir > 0 ? c.x > Wd.W + s * 1.5 : c.x < -s * 1.5;
};
function etoiles(x, y, n) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(60, 200); Wd.fx.push({ k: 'etoile', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 260, frein: 1.5, t0: Wd.t, life: rnd(0.8, 1.4), col: pick(COUL), r: rnd(3, 5), tw: true }); } }
// un Nyan Cat traverse la pièce, à une hauteur donnée (0 : au ras du sol, 1 : tout en haut)
function vol(o) {
  o = o || {}; if (Wd.cats.filter(c => c.nyan).length > 4) return false;
  const dir = o.dir || (Math.random() < 0.5 ? 1 : -1), c = addCat({ temp: true, d: o.d ?? rnd(0, 0.35), face: dir }), s = sc(c);
  const bas = floorAt(c.d) - s * 0.3, haut = Math.max((Wd.ceil || Wd.H * 0.25) - s * 0.2, s * 1.4), h = o.h ?? rnd(0.2, 0.8);
  c.nyan = true; c.x = dir > 0 ? -s * 1.2 : Wd.W + s * 1.2; c.y = bas + (haut - bas) * h; c.stay = 1e9;
  c.q = [{ k: 'nyan', air: true, dir, v: Wd.W / (o.dur || rnd(4.5, 6)) }, fn(k => { k.gone = true; })];
  return c;
}
// la parade (le bouton arc-en-ciel) : trois (deux sur un téléphone), l'un après l'autre, à des hauteurs différentes ; la pièce tremble
function parade() {
  const n = Wd.mode === 'large' ? 3 : 2, dir = Math.random() < 0.5 ? 1 : -1, H0 = [0.75, 0.3, 0.55];
  for (let i = 0; i < n; i++) later(i * 0.7, () => { vol({ dir, h: H0[i], d: [0.05, 0.3, 0.15][i], dur: 4.2 }); Wd.shake = { t0: Wd.t, a: 3 }; });
  later(0.4, () => Wd.fx.push({ k: 'txt', text: 'NYAN NYAN NYAN ♪', x: Wd.W / 2, y: (Wd.ceil || Wd.H * 0.3) + 20, t0: Wd.t, life: 2.2, rot: -0.06, size: 40 }));
}
// les rubans : dessinés sur la craie, par-dessus le décor ; un Nyan Cat attrapé au vol s'arrête (son ruban s'efface derrière lui)
H.draw.push(() => {
  const ctx = window.Chalk && Chalk.ctx; if (!ctx || Wd.a < 0.05) return; const now = Wd.t;
  for (let i = VOLS.length - 1; i >= 0; i--) { const V = VOLS[i]; coupe(V.P, now); if (!V.P.length && !(V.c.task && V.c.task.P === V.P)) { VOLS.splice(i, 1); continue; } ruban(ctx, V.P, Math.max(2.2, sc(V.c) * 0.035), now, Wd.a, 1); }
});
// de temps en temps, un seul passe, sans prévenir (à tour de rôle avec les autres scénarios)
if (K.SCEN) K.SCEN.push(() => { if (Wd.mode !== 'large' && Math.random() < 0.5) return false; return vol() ? undefined : false; });

/* ——— dans l'espace ——— */
if (window.TrouNoir && TrouNoir.outils) {
  const O = TrouNoir.outils, { X, centreDe, rayon } = O;
  const part = (c, passes) => { const S = c.sp; Object.assign(S, { m: 'nyan', dir: S.vx ? sgn(S.vx) : (Math.random() < 0.5 ? 1 : -1), y0: centreDe(c)[1], passes: passes || (Math.random() < 0.5 ? 1 : 2), P: S.P || [], nt: 0 });
    if (S.y0 < O.HAUT() + 60) S.y0 = O.HAUT() + 60; if (S.y0 > O.BAS() - 60) S.y0 = O.BAS() - 60; say(c, pick(['nyan !', 'nyaaan ✨', 'nya-nya-nyan ♪'])); };
  X.mode.nyan = (c, dt) => {
    const S = c.sp, s = rayon(c) / 0.8, v = O.W / 3.2; c.anim = ANIMS.nage ? 'nage' : 'chute'; c.face = S.dir; S.nt += dt;
    const [x, y] = centreDe(c), ty = S.y0 + Math.sin(S.nt * 7) * s * 0.12;
    c.x += S.dir * v * dt; c.y += ty - y; c.spin = Math.sin(S.nt * 7) * 0.12; S.vx = S.dir * v; S.vy = 0;
    S.P.push([x - S.dir * s * 0.5, ty - s * 0.1, Wd.t]);
    // sorti d'un côté : il revient de l'autre (le ruban reste de ce côté-ci et s'efface) ; ses passages faits, il se remet à flotter, au milieu
    const sort = S.dir > 0 ? x > O.W + s * 1.3 : x < -s * 1.3;
    if (sort) { S.passes--; (S.vieux || (S.vieux = [])).push(S.P); S.P = []; c.x -= S.dir * (O.W + s * 2.6); S.y0 = clamp(S.y0 + rnd(-0.25, 0.25) * O.H, O.HAUT() + 60, O.BAS() - 60); }
    if (S.passes <= 0 && Math.abs(x - O.W / 2) < O.W * 0.2) { S.m = 'derive'; S.next = Wd.t + rnd(2, 4); S.vx = S.dir * v * 0.25; S.w = rnd(-2, 2); S.anim = 'apesanteur'; }
  };
  X.envie.push(c => { if (reduit || Math.random() > 0.07 || Wd.cats.some(o => o.sp && o.sp.m === 'nyan')) return false; part(c); return true; });
  // les rubans : derrière les chats ; ils s'effacent même quand le chat a fini (ou qu'on l'a attrapé)
  X.fond.push((ctx, now) => {
    const t = Wd.t; Wd.cats.forEach(c => { const S = c.sp; if (!S) return;
      if (S.P) { coupe(S.P, t); if (S.P.length) ruban(ctx, S.P, Math.max(2.4, rayon(c) * 0.045), t, 1, 1); else if (S.m !== 'nyan') S.P = null; }
      if (S.vieux) { S.vieux = S.vieux.filter(P => { coupe(P, t); if (P.length) ruban(ctx, P, Math.max(2.4, rayon(c) * 0.045), t, 1, 1); return P.length; }); if (!S.vieux.length) S.vieux = null; } });
  });
  X.retour.push(() => Wd.cats.forEach(c => { if (c.sp) { c.sp.P = null; c.sp.vieux = null; } }));
  // un chat recraché par un petit trou blanc (un clic dans le vide) : une fois sur six, il sort en Nyan Cat
  X.pas.push(() => { Wd.cats.forEach(c => { const S = c.sp; if (!S || S.nyanVu || S.m !== 'derive' || !S.o) return; S.nyanVu = true; if (Math.random() < 0.17 && !reduit) part(c, 1); }); });
  var espace = { part };
}

return { vol, parade, espace };
})();
