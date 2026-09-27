/* La nuit (27/09, l'audit) : entre 22 h et 6 h (l'heure du visiteur), le monde des chats vit la nuit.
   - Une lune et quelques étoiles au-dessus de la scène ; le distributeur dort (il ronfle, des z) ;
   - la mouche est un papillon de nuit (de grandes ailes poudrées, js/scenarios.js) ;
   - les chats dorment plus souvent (roulés en boule, par terre) ; les petits ont la folie de minuit.
   Pour essayer : ?nuit dans l'adresse. */
window.Nuit = (() => {
const force = /[?&]nuit\b/.test(location.search);
const on = () => { if (force) return true; const h = new Date().getHours(); return h >= 22 || h < 6; };
if (!window.Chats || !Chats.K) return { on };
const K = Chats.K, { Wd, H, rnd, pick, sc, say, pose, fn } = K;
const TAU = Math.PI * 2;
let vu = false;
const ETOILES = Array.from({ length: 9 }, (_, i) => ({ u: (i * 0.137 + 0.05) % 1, v: ((i * 0.61) % 1) * 0.8, p: i * 1.7 }));

// la lune et les étoiles (au trait, comme le reste)
H.draw.push(() => {
  if (!on() || !Wd.W || (window.Piece && Piece.lune && Piece.lune())) return;   // (la pièce a une fenêtre : la lune est dedans, js/piece.js)
  const C = window.Chalk, ctx = C && C.ctx; if (!ctx) return;
  const top = Wd.ceil || Wd.H * 0.3, x = Wd.W * 0.78, y = Math.max(46, top * 0.35), r = Math.max(14, Wd.s0 * 0.12);
  ctx.save(); ctx.strokeStyle = `rgba(${(window.THEME && THEME.ink) || C.INK},${0.7 * Wd.a})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r, -1.2, 1.9 + 0.35); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.15, r * 0.82, 1.55, -1.1 + TAU, true); ctx.stroke();
  for (const e of ETOILES) { const ex = Wd.W * (0.12 + e.u * 0.76), ey = 30 + e.v * Math.max(40, top * 0.5), a = 0.35 + 0.35 * Math.sin(Wd.t * 1.6 + e.p), k = 3 + (e.p % 2);
    ctx.globalAlpha = a * Wd.a; ctx.beginPath(); ctx.moveTo(ex - k, ey); ctx.lineTo(ex + k, ey); ctx.moveTo(ex, ey - k); ctx.lineTo(ex, ey + k); ctx.stroke(); }
  ctx.restore();
});
H.post.push(() => {
  if (!on()) return;
  if (!vu && Wd.t > 3 && window.Dex) { vu = true; Dex.vu('nuit'); }
  if (Wd.mouche && window.Dex && Wd.t - Wd.mouche.t0 > 2) Dex.vu('papillon');
});
// dormir plus ; la folie de minuit pour les petits
H.think.push((c, add) => {
  if (!on() || c.rare || c.temp) return;
  add(1 + c.ch.dort * 0.8, () => c.q.push(pose('dodo', rnd(8, 16), { zzz: 1, fx: c => Math.random() < 0.3 && say(c, pick(['bonne nuit', 'zz…', 'mrr…'])) }), pose('etirement', 2), pose('assis', 1)));
  if (c.ch.fou > 1) add(c.ch.fou * 0.4, () => { say(c, pick(['MINUIT !', 'nyaaa !', 'la folie !'])); K.zoomies(c); });
});

return { on };
})();
