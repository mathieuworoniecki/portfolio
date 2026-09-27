/* Emporté sur son support (27/09, Mathieu : « quand je mets un panier ou un coussin sous un chat, je devrais l'emporter ; il devrait avoir peur
   et s'accrocher au coussin : soit il reste dessus, soit, avec le mouvement et la vitesse, il tombe sur un côté du coussin si je le bouge très vite,
   et s'accroche avec ses griffes, réussit à se rattraper et remonter, ou bien tombe. Tu vois, rien n'est jamais simple »).
   - Le panier, le coussin (comme le carton, js/vie.js) glissés sous un chat le cueillent.
   - Sur ce qu'on emporte (panier, coussin, caisse, coffre, arbre) : il a peur, aplati, les yeux ronds.
   - Bougé vite : il glisse vers l'arrière (l'inertie) ; au bord, il bascule et reste pendu par les griffes (scriiitch).
   - Pendu : secoué encore, il lâche et tombe ; au calme, il se hisse et remonte (ou pas : il se laisse tomber).
   La pose d'accroche (ANIMS.accroche, js/vie.js) sert aussi au poteau de l'arbre, et servira au parcours au mur. */
window.Accroche = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, dust, interrupt, claim, pose, hop, fn, free, groundAt, inView, floorAt, PORTE } = K;
const CUEILLE = { panier: 1, coussin: 1 };
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// garder le perchoir en changeant de geste (interrupt l'efface)
function tache(c, T) { const P = c.perch; interrupt(c); c.perch = P; if (P) claim(c, P.it); c.task = Object.assign({ t: 0 }, T); c.q = []; }
function descend(c, it) {
  c.q = [pose('pain', rnd(1.5, 3)), pose('assis', rnd(1, 2)), hop(() => groundAt(inView(it.x + sgn(Math.random() - 0.5) * sc(c) * 1.1), Math.max(0, it.d - 0.2)), { zr: [0.3, 0.65] }), fn(free)];
}
function lache(c, it, v) {
  const s = sOf(it.d); interrupt(c); c.accr = null; c.fall = true; c.spin = 0; c.vx = clamp(v * 0.4, -s * 6, s * 6); c.vy = -s * 0.4;
  say(c, pick(['miaaa !', 'aaah', 'nyaaa !'])); c.lacheT = Wd.t;
}

/* ——— cueilli : le panier ou le coussin glissé sous lui ——— */
H.post.push(() => {
  Wd.props.forEach(it => {
    if (!CUEILLE[it.kind] || !it.held || it.lift > Wd.s0 * 0.6 || !it.perches.length) return;
    const pe = it.perches[0]; if (Wd.cats.some(o => o.perch && o.perch.it === it)) return;
    const c = Wd.cats.find(c => !c.held && !c.fall && !c.jump && !c.perch && !c.hidden && !c.fight && !c.gone && !c.rare && !c.pet && Wd.t - (c.lacheT ?? -9) > 2
      && Math.abs(c.x - it.x) < it.hull.w / 2 * it.s * 0.8 && Math.abs(it.y - floorAt(c.d)) < sc(c) * 0.4);
    if (!c) return;
    interrupt(c); claim(c, it); it.d = it.dT = c.d; c.perch = { it, pe, dx: 0 };
    say(c, pick(['?!', 'mia ?', 'oh.'])); dust(it.x, it.y, it.s * 0.3, 0.6);
    c.task = { k: 'wait', anim: 'pain', until: c => !c.perch || !c.perch.it.held, max: 60, t: 0 }; descend(c, it);
  });
});

/* ——— emporté : il a peur, glisse, s'accroche ——— */
H.live.push((c, dt) => {
  const P = c.perch, it = P && P.it;
  if (!it || !(PORTE[it.kind] || it.kind === 'carton')) { c.accr = null; c.ride = null; return; }
  const R = c.ride || (c.ride = { px: it.x, v: 0, calme: 0 }), s = sOf(it.d);
  const v = (it.x - R.px) / Math.max(dt, 1 / 120); R.px = it.x; R.v += (v - R.v) * Math.min(1, dt * 12);
  if (!it.held && !c.accr) { c.ride = null; return; }
  if (it.kind === 'carton' && P.pe.inside) return;   // (dans le carton : à l'abri, il regarde, js/vie.js)
  // la première fois qu'on l'emporte : aplati, les griffes plantées
  if (it.held && !R.peur) { R.peur = 1; if (!c.accr) { tache(c, { k: 'wait', anim: 'pain', until: c => !c.perch || !c.perch.it.held, max: 60 }); descend(c, it); }
    say(c, pick(['?!', 'hé !', 'mia ?!'])); }
  const bord = Math.max(0.12, it.hull.w * 0.5 - 0.04), fort = Math.abs(R.v) > s * 4.5;
  if (!c.accr) {
    // l'inertie : il glisse vers l'arrière de ce qui file sous lui
    if (fort) { P.dx = clamp((P.dx || 0) - R.v * dt / it.s * 0.35, -bord - 0.01, bord + 0.01); if (Math.random() < dt * 2) word(pick(['scriii', 'kkrr']), c.x, c.y - sc(c) * 0.6, 13); }
    else P.dx = (P.dx || 0) * Math.exp(-dt * 0.8);
    if (Math.abs(P.dx) > bord) {
      // au bord : il bascule, pendu par les griffes
      const side = sgn(P.dx); P.dx = side * bord;
      tache(c, { k: 'wait', anim: 'accroche', until: c => !c.accr, max: 30 }); c.accr = { side, t0: Wd.t, calme: 0, risque: 0 };
      c.face = -side; say(c, pick(['scriiitch', '!!', 'kkrr !'])); word('scriiitch', c.x, c.y - sc(c) * 0.3, 15);
    }
  }
  const A = c.accr; if (!A) return;
  // pendu sur le flanc : le corps sous le bord, face à l'objet
  const k = sc(c); c.x += A.side * k * 0.25; c.y += k * 0.55; c.face = -A.side; c.anim = 'accroche';
  if (fort) { A.calme = 0; A.choix = null; A.risque += dt * Math.abs(R.v) / (s * 5); } else A.calme += dt;
  // secoué encore : il lâche
  if (A.risque > rnd(0.8, 2.2) || (!it.held && it.fall)) { lache(c, it, R.v); return; }
  // au calme (ou posé) : il se hisse… ou se laisse tomber
  if (A.calme > (it.held ? 0.7 : 0.3) && !A.choix) {
    A.choix = Math.random() < (c.b.s > 1.2 ? 0.45 : 0.75) ? 'monte' : 'tombe'; A.tc = Wd.t;
    if (A.choix === 'monte') say(c, pick(['hnnn…', 'grr…', 'hop…']));
  }
  if (A.choix === 'tombe' && Wd.t - A.tc > 0.4) { lache(c, it, 0); return; }
  if (A.choix === 'monte') {
    const u = clamp((Wd.t - A.tc) / 0.9, 0, 1); c.y -= k * 0.55 * u; c.x -= A.side * k * 0.25 * u; c.anim = u < 1 ? 'grimpe' : 'pain';
    if (u >= 1) { c.accr = null; P.dx = A.side * bord * 0.6; say(c, pick(['ouf', 'ouf…', 'hmpf'])); c.task = null; if (!c.q.length) descend(c, it); }
  }
});

return { CUEILLE };
})();
