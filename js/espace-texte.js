/* Dans l'espace (l'écran 2) : le texte qui défile, comme au début de Star Wars. Il monte en fuyant vers l'horizon, en perspective.
   Pour l'instant, du faux texte (lorem ipsum) : plus tard, une courte bio de Mathieu (à lui de l'écrire ; ne rien inventer).
   Les chats le regardent passer (le nez en l'air) ; certains montent dessus et s'y laissent emporter (ils rapetissent avec la perspective,
   puis sautent avant l'horizon) ; ceux qui le traversent vite en arrachent des lettres, qui flottent ensuite : les chats les chassent et les tapent,
   on peut les attraper et les lancer. Le texte pousse les dessins (js/espace-dessin.js) vers le haut.
   À la fin, les planètes se dessinent (js/espace-planetes.js : EspaceTexte.fini). */
window.EspaceTexte = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, I, rnd, pick, clamp, sgn, sm, c01 } = K;
const TAU = Math.PI * 2, JAUNE = '255,214,120', BL = '244,244,238';
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
const LOREM2 = 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
const LOREM3 = 'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.';
const TXT = () => { const en = window.I18N && I18N.lang && I18N.lang !== 'fr';
  return { titre: [en ? 'EPISODE I' : 'ÉPISODE I', en ? 'MATHIEU\'S UNIVERSE' : 'L\'UNIVERS DE MATHIEU'], par: [LOREM, LOREM2, LOREM3] }; };

/* ——— la mise en page : des lignes justifiées, chaque lettre à sa place (pour pouvoir l'arracher) ——— */
let C = null;   // { lignes: [{ ch: [{c, x, parti}], w, titre }], taille, lh, larg, v0, t0, fin }
const mesure = document.createElement('canvas').getContext('2d');
function police(px, titre) { const f = getComputedStyle(document.documentElement).getPropertyValue('--display').trim() || '"Barlow Condensed",sans-serif'; return `${titre ? 700 : 600} ${px}px ${f}`; }
function compose() {
  const W = O.W, taille = W < 600 ? 19 : W < 1000 ? 24 : 30, larg = Math.min(W * 0.86, taille * 26), lh = taille * 1.45, T = TXT(), lignes = [];
  const pose = (mots, titre, justifie, px) => { mesure.font = police(px, titre); const esp = mesure.measureText(' ').width, ws = mots.map(m => mesure.measureText(m).width), tot = ws.reduce((a, b) => a + b, 0);
    const gap = justifie && mots.length > 1 ? (larg - tot) / (mots.length - 1) : esp, w = tot + gap * (mots.length - 1); let x = -w / 2; const ch = [];
    mots.forEach((m, i) => { for (const c of m) { const cw = mesure.measureText(c).width; ch.push({ c, x: x + cw / 2, w: cw, parti: false }); x += cw; } x += gap; });
    lignes.push({ ch, w, titre, px }); };
  T.titre.forEach((t, i) => { pose(t.split(' '), true, false, i ? taille * 1.5 : taille * 1.1); if (!i) lignes.push(null); });
  lignes.push(null);
  T.par.forEach(p => { mesure.font = police(taille, false); const mots = p.split(' '); let cur = [];
    mots.forEach(m => { const essai = cur.concat(m); if (mesure.measureText(essai.join(' ')).width > larg && cur.length) { pose(cur, false, true, taille); cur = [m]; } else cur = essai; });
    if (cur.length) pose(cur, false, false, taille); lignes.push(null); });
  return { lignes, taille, lh, larg };
}
// la perspective : v (le long du plan, en px), 0 en bas de l'écran ; k (1 → 0) l'échelle ; y à l'écran
const geo = () => { const yh = O.HAUT() + O.H * 0.05, yb = O.BAS() + 30; return { yh, yb, f: (yb - yh) * 0.75 }; };
const proj = (v, G) => { const k = G.f / (G.f + Math.max(0, v)); return { k, y: G.yh + (G.yb - G.yh) * k }; };
const VIT = () => (O.W < 600 ? 46 : 58);   // px par seconde, le long du plan
function ligneV(i, t) { return (t - C.t0) * VIT() - i * C.lh; }

/* ——— le départ (un peu après l'arrivée), la fin (les planètes) ——— */
const lettres = O.lettres = [];
let fini = false, onFini = [];
X.entre.push(() => { C = null; fini = false; lettres.length = 0; C = Object.assign(compose(), { t0: Wd.t + (reduit ? 0 : 5.5) }); });
X.retour.push(() => { C = null; lettres.length = 0; fini = false; });
function actif() { return C && !fini; }
function ligneEcran(i, G, t) {
  const L = C.lignes[i]; if (!L) return null; const v = ligneV(i, t); if (v < 0) return null;
  const p = proj(v, G); if (p.k < 0.17) return null;
  return { L, v, k: p.k, y: p.y, a: sm((p.k - 0.17) / 0.12), vy: -(G.yb - G.yh) * G.f / Math.pow(G.f + v, 2) * VIT() };
}
// le temps du texte (mouvement réduit : arrêté, au milieu, pour être lu)
const temps = () => reduit ? C.t0 + (C.lignes.length * C.lh * 0.45 + 300) / VIT() : Wd.t;

X.pas.push((dt, cats) => {
  if (!C) return;
  const t = temps(), G = geo();
  // la fin : la dernière ligne a passé l'horizon
  if (!fini && ligneV(C.lignes.length - 1, t) > G.f * (1 / 0.17 - 1)) { fini = true; onFini.forEach(f => f()); }
  if (fini) { lettresPas(dt, cats); return; }
  const vis = []; for (let i = 0; i < C.lignes.length; i++) { const e = ligneEcran(i, G, t); if (e) vis.push([i, e]); }
  // il pousse les dessins vers le haut
  (O.corps || []).forEach(b => { if (b.fin || b.tenu) return;
    for (const [, e] of vis) { if (e.k < 0.3) continue; const h = e.L.px * e.k * 0.6, x0 = O.W / 2 + (e.L.ch[0] ? e.L.ch[0].x : 0) * e.k - 10, x1 = O.W / 2 + e.L.w / 2 * e.k + 10;
      if (b.P.some(p => Math.abs(p[1] - e.y) < h && p[0] > x0 && p[0] < x1) && b.y > O.HAUT() + b.R * 0.6) { b.vy = Math.min(b.vy, e.vy * 1.15 - 12); break; } } });
  // les chats : ceux qui passent vite arrachent des lettres ; ceux qui flottent lentement dessus y montent
  cats.forEach(c => {
    const S = c.sp; if (!S || c.held || !['derive', 'nage'].includes(S.m)) return;
    const [x, y] = centreDe(c), r = rayon(c);
    for (const [i, e] of vis) {
      if (e.k < 0.45) continue; const h = e.L.px * e.k * 0.55; if (Math.abs(y - e.y) > h + r * 0.6) continue;
      const lx = (x - O.W / 2) / e.k; if (lx < -e.L.w / 2 - 10 || lx > e.L.w / 2 + 10) continue;
      const v = Math.hypot(S.vx, S.vy);
      // (une lettre de temps en temps, pas tout le texte : il faut qu'il reste lisible)
      if (v > 200 && Wd.t - (S.arrT ?? -9) > 2.5 && lettres.length < 24) { S.arrT = Wd.t; arrache(e, i, lx, r / e.k, S, x, y); S.vy = Math.abs(S.vy) * (y < e.y ? -0.6 : 0.6); break; }
      if (Wd.t - (S.surfT ?? -9) > 12 && Math.random() < 0.02) { monte(c, i, lx); break; }
    }
  });
  lettresPas(dt, cats);
});
// arracher des lettres : celles qui sont sous le chat s'envolent
function arrache(e, i, lx, rr, S, x, y) {
  let n = 0;
  e.L.ch.forEach(ch => { if (ch.parti || ch.c === ' ' || Math.abs(ch.x - lx) > rr * 0.7 || n >= 2) return; ch.parti = true; n++;
    const sx = O.W / 2 + ch.x * e.k; lettres.push({ c: ch.c, x: sx, y: e.y, vx: S.vx * 0.5 + rnd(-60, 60), vy: S.vy * 0.5 + e.vy + rnd(-60, 30), a: 0, w: rnd(-4, 4), px: e.L.px * e.k, titre: e.L.titre, t0: Wd.t }); });
  if (n) { Wd.fx.push({ k: 'txt', text: pick(['crac', 'scrountch', 'tchac']), x, y: y - 20, t0: Wd.t, life: 0.8, rot: rnd(-0.2, 0.2), size: 15 });
    if (lettres.length > 60) lettres.splice(0, lettres.length - 60); }
}
// monter sur une ligne : il s'y assoit et se laisse emporter (il rapetisse avec elle), puis saute avant l'horizon
function monte(c, i, lx) { const S = c.sp; Object.assign(S, { m: 'texte', ligne: i, lx, anim: pick(['assis', 'pain', 'assis', 'toilette']), vx: 0, vy: 0, surfT: Wd.t }); say(c, pick(['on m\'emmène !', 'wiii', 'je lis !', 'en voiture'])); }
X.mode.texte = (c, dt) => {
  const S = c.sp; if (!C || fini) { lacheTexte(c); return; }
  const e = ligneEcran(S.ligne, geo(), temps()); if (!e || e.k < 0.42) { lacheTexte(c); if (Math.random() < 0.6) say(c, pick(['hop !', 'terminus', 'je descends'])); return; }
  c.anim = S.anim; c.spin *= Math.exp(-dt * 4);
  c.s = S.s * clamp(e.k, 0.4, 1); c.x = O.W / 2 + S.lx * e.k; c.y = e.y - e.L.px * e.k * 0.45;
  c.z = 8000 + c.id * 3;
  // de temps en temps, il tape une lettre de sa ligne
  if (Math.random() < dt * 0.12 && lettres.length < 24) { const j = e.L.ch.findIndex(ch => !ch.parti && ch.c !== ' ' && Math.abs(ch.x - S.lx) < 60 && Math.abs(ch.x - S.lx) > 12); if (j >= 0) { const ch = e.L.ch[j]; ch.parti = true;
    lettres.push({ c: ch.c, x: O.W / 2 + ch.x * e.k, y: e.y, vx: sgn(ch.x - S.lx) * rnd(80, 160), vy: rnd(-120, -40), a: 0, w: rnd(-5, 5), px: e.L.px * e.k, titre: e.L.titre, t0: Wd.t }); c.anim = 'tape'; c.face = sgn(ch.x - S.lx) || c.face; } }
};
function lacheTexte(c) { const S = c.sp; S.m = 'derive'; S.next = Wd.t + rnd(2, 4); S.anim = 'chute'; S.vx = rnd(-80, 80); S.vy = rnd(40, 140); S.lache = Wd.t; }

/* ——— les lettres arrachées : elles flottent, tournent, rebondissent ; les chats les tapent ——— */
function lettresPas(dt, cats) {
  lettres.forEach(l => {
    if (l.tenu) return;
    l.vx *= Math.exp(-dt * 0.1); l.vy *= Math.exp(-dt * 0.1); l.w *= Math.exp(-dt * 0.2); l.x += l.vx * dt; l.y += l.vy * dt; l.a += l.w * dt;
    const r = l.px * 0.4;
    if (l.x < r && l.vx < 0 || l.x > O.W - r && l.vx > 0) { l.vx = -l.vx * 0.8; l.w += rnd(-3, 3); }
    if (l.y < O.HAUT() + r && l.vy < 0 || l.y > O.BAS() - r && l.vy > 0) { l.vy = -l.vy * 0.8; l.w += rnd(-3, 3); }
    l.x = clamp(l.x, r, O.W - r); l.y = clamp(l.y, O.HAUT() + r, O.BAS() - r);
    cats.forEach(c => { const S = c.sp; if (!S || c.held || !['derive', 'nage'].includes(S.m)) return; const [x, y] = centreDe(c), rc = rayon(c) * 0.85, dx = l.x - x, dy = l.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > rc + r) return; const nx = dx / d, ny = dy / d; l.x = x + nx * (rc + r); l.y = y + ny * (rc + r);
      const vn = (l.vx - S.vx) * nx + (l.vy - S.vy) * ny; if (vn < 0) { l.vx -= 1.8 * vn * nx; l.vy -= 1.8 * vn * ny; l.w += rnd(-6, 6); } });
  });
}
X.envie.push(c => {
  const L = lettres.filter(l => !l.tenu); if (!L.length || Math.random() < 0.6) return false;
  const l = pick(L), S = c.sp;
  S.m = 'nage'; S.cible = { get x() { return l.x; }, get y() { return l.y; }, r: 1.1, arrive: c => { const [x, y] = centreDe(c), dx = l.x - x, dy = l.y - y, d = Math.hypot(dx, dy) || 1; l.vx += dx / d * rnd(220, 380); l.vy += dy / d * rnd(220, 380); l.w += rnd(-8, 8);
    c.sp.m = 'derive'; c.sp.anim = 'tape'; c.sp.next = Wd.t + rnd(1.5, 3); c.face = sgn(dx) || c.face; say(c, pick(['un « ' + l.c + ' » !', 'paf', 'à moi la lettre', l.c + ' !'])); } };
  S.fin = Wd.t + 5; return true;
});
// attraper une lettre, la lancer
const MOD = { drag(k, x, y) { const l = k.l; l.tenu = true; const dt = Math.max(1 / 120, Wd.t - (k.t ?? Wd.t)); k.t = Wd.t; k.vx = (x - l.x) / dt; k.vy = (y - l.y) / dt; l.x = x; l.y = y; },
  release(k, vx, vy) { const l = k.l; l.tenu = false; l.vx = clamp(vx || 0, -1600, 1600); l.vy = clamp(vy || 0, -1600, 1600); l.w = rnd(-6, 6); } };
X.grab.push((x, y) => { for (let i = lettres.length - 1; i >= 0; i--) { const l = lettres[i]; if (Math.hypot(x - l.x, y - l.y) < Math.max(14, l.px * 0.6)) return { mod: MOD, l }; } return null; });

/* ——— les chats regardent le texte passer : le nez en l'air, les yeux vers le haut ——— */
X.pose.push(c => { if (!actif() || !c.sp || !['derive', 'texte'].includes(c.sp.m) || C.t0 > Wd.t) return; c.tgt[I.hnod] -= 0.22; c.tgt[I.py] = -1; c.tgt[I.px] = 0; });

/* ——— le dessin : les lignes en perspective, en jaune ; les lettres arrachées en blanc ——— */
X.fond.unshift((ctx) => {
  if (!C) return;
  const t = temps(), G = geo();
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (!fini) for (let i = 0; i < C.lignes.length; i++) {
    const e = ligneEcran(i, G, t); if (!e) continue;
    ctx.font = police(e.L.px, e.L.titre); ctx.fillStyle = `rgba(${JAUNE},${e.a})`;
    ctx.save(); ctx.translate(O.W / 2, e.y); ctx.scale(e.k, e.k * 0.92);
    e.L.ch.forEach(ch => { if (!ch.parti && ch.c !== ' ') ctx.fillText(ch.c, ch.x, 0); });
    ctx.restore();
  }
  lettres.forEach(l => { ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.a); ctx.font = police(l.px, l.titre); ctx.fillStyle = `rgb(${JAUNE})`; ctx.fillText(l.c, 0, 0); ctx.restore(); });
  ctx.restore();
});

return { get C() { return C; }, get fini() { return fini; }, set onFini(f) { onFini.push(f); }, get actif() { return actif(); }, lettres };
})();
