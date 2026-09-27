/* La molette et l'appui long sur l'écran des chats (27/09, l'audit : la molette ne faisait rien ici).
   - La molette sur un chat : la gratouille (il se met sur le dos, ronronne ; le grincheux, lui, n'aime pas ça).
   - Sur le distributeur : la manivelle (quelques crans, et il crache) ; sur la pelote ou le poisson : ils roulent ;
     sur le bassin : des vagues (les baigneurs tanguent).
   - L'appui long dans le vide (sans bouger) : « psst psst », les chats d'à côté viennent voir. */
window.Molette = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, pose, go, fn, inView, interrupt, free4 } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
const dex = id => { if (window.Dex) Dex.vu(id); };
const actif = () => Wd.W && Wd.a > 0.5 && !document.documentElement.classList.contains('locked');

// renvoie vrai quand la molette a servi ici (film.js ne change alors rien d'autre)
function molette(x, y, dy) {
  if (!actif()) return false;
  const c = K.catAt(x, y);
  if (c && !c.held && !c.fall && !c.jump) {
    c.molA = (c.molA || 0) + Math.abs(dy); if (c.molA < 90) return true; c.molA = 0;
    if (c.breed === 'grincheux' || c.grudge > Wd.t) { interrupt(c); c.q = [pose('feule', 0.9, { fx: c => say(c, pick(['pas la molette.', 'PFFT', 'non.'])) }), pose('boude', rnd(1.5, 2.5))]; return true; }
    if (c.anim !== 'ventre') { interrupt(c); c.q = [pose('ventre', rnd(2.5, 3.5), { fx: c => say(c, pick(['gratouille ♥', 'oh oui…', 'mrrrr ♥'])) }), pose('assis', 1)]; }
    c.purr = Wd.t + 3; Wd.fx.push({ k: 'heart', x: c.x + rnd(-10, 10), y: c.y - sc(c) * 0.9, t0: Wd.t, life: 1.4, r: Math.max(6, sc(c) * 0.06) });
    if (window.Amis && !c.rare && Math.random() < 0.3) Amis.change(c, 0.3); dex('molette');
    return true;
  }
  const it = K.propAt(x, y); if (!it || it.held) return false;
  it.molA = (it.molA || 0) + Math.abs(dy);
  if (it.kind === 'distrib') {
    if (it.molA > 60 && Wd.t > (it.crT || 0)) { it.crT = Wd.t + 0.3; word(pick(['crr', 'cric', 'crac']), it.x + it.s * 0.3, it.y - it.s * 0.5, 14); it.wob = Wd.t; it.wobA = 0.12; }
    if (it.molA > 360) { it.molA = 0; K.fire(it); dex('manivelle'); }
    return true;
  }
  if (it.r) { if (it.molA > 40) { it.molA = 0; K.kick(it, sgn(dy) || 1); } return true; }
  if (it.kind === 'bassin' && window.Bassin) {
    if (it.molA > 50) { it.molA = 0; const S = Bassin.surface(it), px = S.x + rnd(-0.6, 0.6) * S.rx; Bassin.rond(it, px, S.y, 2); Bassin.gerbe(it, px, S.y, 4, 0.6);
      Wd.cats.forEach(o => { if (o.perch && o.perch.it === it) { o.y += rnd(-3, 3); if (Math.random() < 0.3) say(o, pick(['wouh', 'ça tangue !', 'hihi'])); } }); dex('vagues'); }
    return true;
  }
  return false;
}

/* ——— l'appui long : psst psst ——— */
let appui = null, psstT = -9;
addEventListener('pointerdown', e => {
  if (!actif() || e.button > 0 || (e.target.closest && e.target.closest('a,button,select,input,label,.top,.film-ui,.tuto,.evts,.dex'))) return;
  const x = e.clientX, y = e.clientY; if (K.catAt(x, y) || K.propAt(x, y)) return;
  appui = { x, y, id: setTimeout(() => { appui = null; psst(x, y); }, 650) };
});
const annule = () => { if (appui) { clearTimeout(appui.id); appui = null; } };
addEventListener('pointermove', e => { if (appui && Math.hypot(e.clientX - appui.x, e.clientY - appui.y) > 10) annule(); });
addEventListener('pointerup', annule); addEventListener('pointercancel', annule);
function psst(x, y) {
  psstT = performance.now(); word('psst psst', x, y - 20, 18);
  const L = Wd.cats.filter(c => free4(c) && !c.rare && Math.abs(c.x - x) < Wd.W * 0.45).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x)).slice(0, 3);
  L.forEach((c, i) => {
    const side = sgn(x - c.x) || 1; interrupt(c);
    if (c.breed === 'grincheux' || c.grudge > Wd.t) { c.q = [pose('curieux', 0.8, { face: side }), pose('boude', 1.5, { face: -side, fx: c => say(c, pick(['non.', 'tss'])) })]; return; }
    c.q = [pose('curieux', 0.5 + i * 0.2, { face: side, fx: c => say(c, pick(['?', 'mrr ?', 'oui ?'])) }), go(inView(x - side * sc(c) * (0.6 + i * 0.5)), { g: 'trot', face: side }), pose('dresse', rnd(1.2, 2), { face: side })];
  });
  if (L.length) dex('psst');
}
// le clic qui suit un appui long ne fait pas tomber un chat du ciel
H.click.unshift(() => performance.now() - psstT < 400);

molette.psstT = () => psstT;
return molette;
})();
