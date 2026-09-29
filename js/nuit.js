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
  const top = Wd.ceil || Wd.H * 0.3, x = Wd.W * 0.78, y = Math.max(46, top * 0.35), r = Math.max(20, Wd.s0 * 0.2);
  ctx.save(); ctx.strokeStyle = `rgba(${(window.THEME && THEME.ink) || C.INK},${0.7 * Wd.a})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r, -1.2, 1.9 + 0.35); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.15, r * 0.82, 1.55, -1.1 + TAU, true); ctx.stroke();
  for (const e of ETOILES) { const ex = Wd.W * (0.12 + e.u * 0.76), ey = 30 + e.v * Math.max(40, top * 0.5), a = 0.35 + 0.35 * Math.sin(Wd.t * 1.6 + e.p), k = 3 + (e.p % 2);
    ctx.globalAlpha = a * Wd.a; ctx.beginPath(); ctx.moveTo(ex - k, ey); ctx.lineTo(ex + k, ey); ctx.moveTo(ex, ey - k); ctx.lineTo(ex, ey + k); ctx.stroke(); }
  ctx.restore();
});
/* ——— (29/09, vague 5 : « tout doit être immersif ») la pièce plonge dans le noir bleu ; le pointeur devient une lampe de poche ;
   les yeux des chats brillent dans l'ombre ; des lucioles traversent tout l'écran ; la lune pose une flaque de lumière au sol ——— */
const mxL = W => W * 0.78;
const LUC = Array.from({ length: 16 }, (_, i) => ({ x: Math.random(), y: Math.random(), p: i * 2.1, vx: 0, vy: 0 }));
const lampe = { x: -1e4, y: -1e4, on: 0 };
H.draw.push(() => {
  if (!on() || !Wd.W || Wd.a < 0.05 || (window.Piece && Piece.lune && Piece.lune())) return;
  const C = window.Chalk, ctx = C && C.ctx; if (!ctx) return;
  const top = Wd.ceil || Wd.H * 0.3, W = Wd.W, Hh = Wd.H, s0 = Wd.s0 || 100, P = Wd.ptr, A = Wd.a;
  // la lampe suit le pointeur (sur un téléphone, sans pointeur : elle balaie la pièce toute seule)
  const vise = P && P.on && Wd.t - P.moved < 6 ? [P.x, P.y] : [W * (0.5 + 0.35 * Math.sin(Wd.t * 0.23)), top + (Hh - top) * (0.55 + 0.2 * Math.sin(Wd.t * 0.37))];
  lampe.x += (vise[0] - lampe.x) * (lampe.x < -1e3 ? 1 : 0.25); lampe.y += (vise[1] - lampe.y) * (lampe.y < -1e3 ? 1 : 0.25); lampe.on = Math.min(1, lampe.on + 0.02);
  // le noir : un calque à part (sinon on creuserait aussi le reste du dessin)
  const cv = lampe.cv || (lampe.cv = document.createElement('canvas')), m = ctx.getTransform(), dpr = m.a || 1;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, Hh);
  // (le ciel aussi est de nuit, mais plus clair : le titre se lit toujours)
  const v = g.createLinearGradient(0, 0, 0, top + s0 * 0.5); v.addColorStop(0, `rgba(14,20,48,${0.34 * A})`); v.addColorStop(Math.max(0.01, (top - s0 * 0.6) / (top + s0 * 0.5)), `rgba(14,20,48,${0.3 * A})`); v.addColorStop(1, `rgba(14,20,48,${0.62 * A})`);
  g.fillStyle = v; g.fillRect(0, 0, W, Hh);
  g.globalCompositeOperation = 'destination-out';
  // la lune éclaire le ciel autour d'elle
  { const ly = Math.max(46, top * 0.35), lr = Math.max(20, s0 * 0.2) * 3.2, lg0 = g.createRadialGradient(mxL(W), ly, 0, mxL(W), ly, lr); lg0.addColorStop(0, 'rgba(0,0,0,0.8)'); lg0.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg0; g.beginPath(); g.arc(mxL(W), ly, lr, 0, TAU); g.fill(); }
  // la flaque de lune : un faisceau qui tombe de la fenêtre de la lune jusqu'au sol
  const mx = W * 0.78, fl = Wd.floor || Hh * 0.85, bx = mx - (fl - top) * 0.35;
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); const my = Math.max(46, top * 0.35); g.moveTo(mx - s0 * 0.2, my); g.lineTo(mx + s0 * 0.2, my); g.lineTo(bx + s0 * 1.3, fl); g.lineTo(bx - s0 * 1.3, fl); g.closePath(); g.fill();
  g.save(); g.translate(bx, fl - s0 * 0.1); g.scale(1, 0.28); const fg = g.createRadialGradient(0, 0, 0, 0, 0, s0 * 1.5); fg.addColorStop(0, 'rgba(0,0,0,0.55)'); fg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fg; g.beginPath(); g.arc(0, 0, s0 * 1.5, 0, TAU); g.fill(); g.restore();
  // la lampe de poche : un rond de lumière franc, au bord doux, qui tremble un peu
  const R = s0 * 1.5 * (1 + 0.02 * Math.sin(Wd.t * 23)), lg = g.createRadialGradient(lampe.x, lampe.y, R * 0.15, lampe.x, lampe.y, R);
  lg.addColorStop(0, `rgba(0,0,0,${lampe.on})`); lg.addColorStop(0.7, `rgba(0,0,0,${0.92 * lampe.on})`); lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lg; g.beginPath(); g.arc(lampe.x, lampe.y, R, 0, TAU); g.fill();
  // les lucioles éclairent un tout petit peu autour d'elles
  LUC.forEach(l => { const lx = l.x * W, ly = l.y * Hh, a = 0.5 + 0.5 * Math.sin(Wd.t * 2.2 + l.p); if (a < 0.2) return; const rg = g.createRadialGradient(lx, ly, 0, lx, ly, s0 * 0.35); rg.addColorStop(0, `rgba(0,0,0,${0.35 * a})`); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.beginPath(); g.arc(lx, ly, s0 * 0.35, 0, TAU); g.fill(); });
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cv, 0, 0); ctx.restore();
  // le halo chaud de la lampe (par-dessus : un jaune très léger)
  ctx.save(); const hg = ctx.createRadialGradient(lampe.x, lampe.y, 0, lampe.x, lampe.y, R); hg.addColorStop(0, `rgba(255,236,170,${0.16 * A * lampe.on})`); hg.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(lampe.x, lampe.y, R, 0, TAU); ctx.fill();
  // les yeux dans le noir : deux points qui brillent (et clignent) chez les chats éveillés hors de la lampe
  Wd.cats.forEach((c, i) => { if (!c.hp || c.hidden || /dodo|dort|boule/.test(c.anim || '') || c.hp[1] < top - s0 * 0.3) return;
    const d = Math.hypot(c.hp[0] - lampe.x, c.hp[1] - lampe.y); if (d < R * 0.8) return;
    const cl = (Wd.t * 0.7 + i * 0.37) % 3.3 < 0.12, r = sc(c) * 0.035, ex = sc(c) * 0.13, x = c.hp[0] + (c.face || 1) * sc(c) * 0.05, y = c.hp[1];
    [-1, 1].forEach(k => { const gx = x + k * ex, gg = ctx.createRadialGradient(gx, y, 0, gx, y, r * 4); gg.addColorStop(0, `rgba(230,255,140,${0.55 * A})`); gg.addColorStop(1, 'rgba(230,255,140,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx, y, r * 4, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(240,255,170,${0.95 * A})`; ctx.beginPath(); ctx.ellipse(gx, y, r, cl ? r * 0.15 : r * 1.3, 0, 0, TAU); ctx.fill(); }); });
  // les lucioles : elles errent partout, montent, redescendent
  LUC.forEach(l => { l.vx += (Math.random() - 0.5) * 0.0008; l.vy += (Math.random() - 0.5) * 0.0008; l.vx *= 0.97; l.vy *= 0.97; l.x = (l.x + l.vx + 1) % 1; l.y = Math.min(0.97, Math.max(0.05, l.y + l.vy));
    const lx = l.x * W, ly = l.y * Hh, a = 0.5 + 0.5 * Math.sin(Wd.t * 2.2 + l.p); if (a < 0.15) return;
    const rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 9); rg.addColorStop(0, `rgba(250,255,160,${0.9 * a * A})`); rg.addColorStop(1, 'rgba(250,255,160,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(lx, ly, 9, 0, TAU); ctx.fill(); });
  ctx.restore();
  // un chat pris dans la lampe : il plisse les yeux
  Wd.cats.forEach(c => { if (!c.hp || c.hidden || c.temp || Math.hypot(c.hp[0] - lampe.x, c.hp[1] - lampe.y) > R * 0.5 || Wd.t < (c.lampeT || 0)) return; c.lampeT = Wd.t + rnd(8, 14);
    if (/dodo|dort/.test(c.anim || '')) { if (Math.random() < 0.5) say(c, pick(['mmh… éteins', 'zz… hein ?'])); } else say(c, pick(['aïe, mes yeux !', 'baisse ça !', '!?', 'qui va là ?'])); if (window.Dex) Dex.vu('lampe'); });
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
