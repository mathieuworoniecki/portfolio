/* Dans l'espace (l'écran 2) : les croquettes aspirées avec la pièce.
   (29/09, vague 9 de l'audit : « l'arrivée dans l'espace : les chats arrivent seuls ») : le trou blanc recrache aussi les croquettes
   de la pièce, en gerbe, juste après les chats. Elles flottent, tournent sur elles-mêmes, rebondissent sur les bords ;
   un chat qui flotte près d'une croquette nage vers elle et la croque (« miam »).
   Pas de lumière : de petites croquettes à l'encre, cernées de blanc, comme les chats. */
window.EspaceCroquettes = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, rnd, pick } = K;
const TAU = Math.PI * 2, reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const en = () => window.I18N && I18N.lang && I18N.lang !== 'fr';
const L = [];   // { x, y, vx, vy, a (angle), w (rotation), r, forme }
let avalees = 0;   // celles que la planète des chats a avalées : elle les rend au retour

// à l'entrée : une gerbe, du centre (là où s'ouvre le trou blanc), un peu après les chats
X.entre.push(() => {
  L.length = 0; avalees = 0; if (reduit) return;
  const n = Wd.W < 700 ? 6 : 11, [cx, cy] = O.centre ? O.centre() : [O.W / 2, O.H / 2];
  for (let i = 0; i < n; i++) setTimeout(() => { if (!Wd.espace) return; const a = rnd(0, TAU), v = rnd(60, 220) * Wd.s0 / 150;
    L.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: rnd(0, TAU), w: rnd(-3, 3), r: Wd.s0 * rnd(0.055, 0.075), forme: i % 3, t0: Wd.t }); }, 900 + i * 60);
});
// chaque image : elles flottent, freinent un peu, rebondissent sur les bords ; un chat qui les touche les mange
X.pas.push(dt => {
  if (!L.length) return; const W = O.W, H = O.H, haut = O.HAUT(), bas = O.BAS();
  for (let i = L.length - 1; i >= 0; i--) { const k = L[i];
    // (au bout d'un moment, la planète des chats les attire et les avale : elles ne traînent pas sur les sous-titres)
    const Pc = window.EspacePlanetes && EspacePlanetes.P && EspacePlanetes.P.chat;
    if (Pc && Wd.t - k.t0 > 35) { const dx = Pc.x - k.x, dy = Pc.y - k.y, d = Math.hypot(dx, dy) || 1; k.vx += dx / d * 260 * dt; k.vy += dy / d * 260 * dt; if (d < Pc.r * 0.8) { L.splice(i, 1); avalees++; continue; } }
    k.x += k.vx * dt; k.y += k.vy * dt; k.a += k.w * dt; const f = Math.exp(-dt * 0.35); k.vx *= f; k.vy *= f;
    if (Wd.t - k.t0 <= 35 && (k.x < k.r || k.x > W - k.r)) { k.vx = -k.vx; k.x = Math.max(k.r, Math.min(W - k.r, k.x)); }
    if (Wd.t - k.t0 <= 35 && (k.y < haut + k.r || k.y > bas - k.r)) { k.vy = -k.vy; k.y = Math.max(haut + k.r, Math.min(bas - k.r, k.y)); }
    // (vague 11) elles ne passent pas sur les sous-titres : le bandeau du texte les repousse, doucement, vers le haut ou le bas
    const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande;
    if (bd && k.x > bd.x - k.r * 2 && k.x < bd.x + bd.w + k.r * 2 && k.y > bd.y - k.r * 2 && k.y < bd.y + bd.h + k.r * 2) {
      const haut2 = k.y < bd.y + bd.h / 2; k.vy += (haut2 ? -1 : 1) * 900 * dt; k.vy = haut2 ? Math.min(k.vy, -40) : Math.max(k.vy, 40);
      // (vague 247, design : « doucement » ne suffisait pas, au téléphone une croquette se posait sur le titre) : le bord du bandeau est un mur
      if (k.x > bd.x - k.r && k.x < bd.x + bd.w + k.r) k.y = haut2 ? Math.min(k.y, bd.y - k.r * 1.2) : Math.max(k.y, bd.y + bd.h + k.r * 1.2); }
    const c = Wd.cats.find(c => c.sp && !c.held && c.sp.m !== 'crache' && !c.rare && (() => { const [x, y] = centreDe(c); return Math.hypot(x - k.x, y - k.y) < rayon(c) * 0.75; })());
    if (c) { L.splice(i, 1); if (Wd.t - (c.miamT || -9) > 2) { c.miamT = Wd.t; say(c, pick(en() ? ['yum', 'crunch', 'space snack!'] : ['miam', 'crounch', 'croquette de l’espace !'])); }
      if (window.Dex && Dex.vu) Dex.vu('croquette-espace'); if (c.sp.cible && c.sp.cible.croq === k) { c.sp.m = 'derive'; c.sp.next = Wd.t + rnd(2, 4); } }
  }
});
// l'envie : un chat qui flotte près d'une croquette nage vers elle
X.envie.push(c => {
  if (!L.length || c.rare || Math.random() < 0.5) return false; const [x, y] = centreDe(c);
  const k = L.reduce((b, q) => { const d = Math.hypot(q.x - x, q.y - y); return d < b[1] ? [q, d] : b; }, [null, Wd.s0 * 4])[0]; if (!k) return false;
  const S = c.sp; S.m = 'nage'; S.cible = { get x() { return k.x; }, get y() { return k.y; }, r: 0.7, croq: k, arrive: c => { c.sp.m = 'derive'; c.sp.next = Wd.t + rnd(2, 4); } }; S.fin = Wd.t + rnd(3, 5);
  if (Math.random() < 0.4) say(c, en() ? '!' : pick(['!', 'une croquette !', 'à moi !'])); return true;
});
// le dessin : une croquette, trois formes (un rond, un triangle arrondi, un petit os), cernée de blanc, à l'encre
X.fond.push(ctx => {
  if (!L.length || !Wd.espace) return;
  ctx.save(); ctx.lineJoin = ctx.lineCap = 'round';
  L.forEach(k => { ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.a); const r = k.r; ctx.beginPath();
    if (k.forme === 0) ctx.arc(0, 0, r, 0, TAU);
    else if (k.forme === 1) { for (let i = 0; i < 3; i++) { const a = i / 3 * TAU - Math.PI / 2, b = a + TAU / 6; ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); ctx.quadraticCurveTo(Math.cos(b) * r * 0.9, Math.sin(b) * r * 0.9, Math.cos(a + TAU / 3) * r * 1.15, Math.sin(a + TAU / 3) * r * 1.15); } ctx.closePath(); }
    else { ctx.ellipse(0, 0, r * 1.2, r * 0.55, 0, 0, TAU); }
    ctx.fillStyle = 'rgb(34,36,40)'; ctx.strokeStyle = 'rgb(244,244,238)'; ctx.lineWidth = Math.max(1.6, r * 0.28); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(244,244,238,0.8)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.18, 0, TAU); ctx.fill(); ctx.restore(); });
  ctx.restore();
});
// (vague 10, l'audit : « le retour par la planète chat ») : au retour dans la pièce, les croquettes restées là-haut (qui flottaient,
// ou que la planète avait avalées) retombent en pluie avec tout le monde ; les chats se jettent dessus (le « crunch » de js/chats.js)
X.retour.push(() => { const n = Math.min(24, L.length + avalees); L.length = 0; avalees = 0;
  if (!n || reduit || !Array.isArray(Wd.kib)) return; const k = Wd.s0 / 160, x0 = Wd.W / 2, y0 = Wd.H * 0.42;
  for (let i = 0; i < n; i++) Wd.kib.push({ x: x0 + rnd(-40, 40), y: y0, vx: rnd(-1, 1) * rnd(150, 700) * k, vy: -rnd(250, 700) * k, d: rnd(0, 0.5), t0: Wd.t + 0.25 + i * 0.03, rest: false, spin: Math.random() * 6 });
  K.later(0.9, () => { const c = Wd.cats.find(c => !c.gone && !c.rare && !c.fall); if (c) say(c, pick(en() ? ['our kibbles!', 'they came back!'] : ['nos croquettes !', 'elles sont revenues !', 'la planète les rend !'])); });
});
return { L };
})();
