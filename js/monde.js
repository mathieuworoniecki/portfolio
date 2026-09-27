/* Le monde qui se tient (27/09, Mathieu : « audite tout… ça doit refléter la complexité du monde, un utilisateur peut y passer plusieurs heures
   pour découvrir toutes les combinaisons possibles »). Ce que l'audit a trouvé de creux, branché sur les crochets de js/chats.js :
   - les états se propagent : le mouillé (les voisins l'évitent, un ami le lèche jusqu'à ce qu'il sèche), l'arc-en-ciel (on le remarque,
     le grincheux feule, les chatons le suivent ; il colore son lit et l'ami contre qui il se frotte ; s'ébrouer colore les voisins) ;
   - les enchaînements : la croquette qui tombe sur un gourmand endormi le réveille (il la mange), le couvercle du coffre fait tomber la tasse,
     le chat lâché sur le canapé fait sauter ceux qui y dorment, le géant qui roule dans le bassin fait un raz-de-marée ;
   - chaque objet réagit à sa façon quand on le heurte (le distributeur sonne et lâche une croquette, le coussin fait pouf et perd une plume,
     la gamelle tinte et renverse, le bassin éclabousse, la tasse vacille puis tombe, l'arbre fait danser son pompon). */
window.Monde = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, free4, interrupt, pose, go, fn, inView, floorAt, later } = K;
const Ba = window.Bassin, Ar = window.Arc, Co = window.Contacts, Vi = window.Vie;
let motT = -9;
const word = (text, x, y, size) => { if (Wd.t - motT < 0.08) return; motT = Wd.t; Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.2, rot: rnd(-0.2, 0.2), size: size || 16 }); };
const recent = (a, key, dt) => Wd.t - (a[key] ?? -9) < dt;
const mouille = c => c.wet && Wd.t - c.wet < 8;
const arc = o => o.arcT > Wd.t;
const dort = c => /dodo|pain|couche|dort/.test((c.task && c.task.anim) || c.anim || '');
const calme = c => free4(c) && !c.temp && !c.rare && !c.perch && !c.hidden;
// une courte réaction qui garde la suite (le dormeur reprend sa sieste)
function reagit(c, L) { if (window.Liens && Liens.reagit) return Liens.reagit(c, L); if (!free4(c)) return; interrupt(c); c.q = L; }

/* ——— le mouillé ——— */
H.post.push(() => {
  if (Wd.t < (Wd.mondeT || 0)) return; Wd.mondeT = Wd.t + 0.6;
  const W = Wd.cats.filter(c => mouille(c) && c.hp && !c.held && !c.fall && !c.hidden);
  W.forEach(c => Wd.cats.forEach(o => {
    if (o === c || !calme(o) || Math.abs(o.x - c.x) > (sc(o) + sc(c)) * 0.55 || Math.abs(o.d - c.d) > 0.3 || recent(o, 'eviteT', 8)) return;
    o.eviteT = Wd.t; const away = sgn(o.x - c.x) || 1;
    // un ami : il le lèche jusqu'à ce qu'il sèche ; les autres s'écartent
    if ((Vi && Vi.rel ? Vi.rel(c, o) : 0) > 0.3 || Math.random() < 0.15) { reagit(o, [pose('toilette', rnd(1.5, 2.5), { face: -away, fx: o => { say(o, pick(['slurp', 'je te sèche', 'mrrp'])); later(1.2, () => { if (mouille(c)) { c.wet = -99; say(c, '♥'); if (window.Dex) Dex.vu('leche'); } }); } })]); }
    else reagit(o, [go(inView(o.x + away * sc(o) * 0.9), { g: 'trot' }), pose('assis', rnd(0.8, 1.4), { face: -away, fx: o => say(o, pick(['beurk', 'mouillé…', 'pas près de moi'])) })]);
  }));
  // l'arc-en-ciel : on le remarque
  Wd.cats.filter(c => arc(c) && c.hp && !c.hidden && !c.held).forEach(c => Wd.cats.forEach(o => {
    if (o === c || !calme(o) || arc(o) || Math.abs(o.x - c.x) > Wd.W * 0.2 || recent(o, 'arcVuT', 20) || Math.random() > 0.35) return;
    o.arcVuT = Wd.t; const face = sgn(c.x - o.x) || 1;
    if (o.breed === 'grincheux') reagit(o, [pose('feule', 0.9, { face, fx: o => say(o, pick(['c’est quoi ÇA', 'kss', 'trop de couleurs'])) })]);
    else if (o.breed === 'chaton' || o.breed === 'pompon' || o.breed === 'mini') reagit(o, [go(inView(c.x - face * sc(o) * 0.8), { g: 'trot' }), pose('curieux', rnd(1, 2), { face, fx: o => say(o, pick(['ooh ✨', 'moi aussi !', 'joli !'])) })]);
    else reagit(o, [pose('curieux', rnd(1, 1.8), { face, fx: o => say(o, pick(['tu brilles ?', '✨ ?', 'hein ?'])) })]);
  }));
});
// l'arc-en-ciel déteint : sur le lit où il dort, sur l'ami contre qui il se frotte, sur les voisins quand il s'ébroue
H.live.push((c, dt) => {
  if (!Ar || !arc(c)) return;
  if (c.perch && c.perch.it && !c.perch.it.mur && dort(c) && Math.random() < dt * 0.3) Ar.colore(c.perch.it, 30);
  if (c.anim === 'frotte' || c.anim === 'secoue') {
    if (recent(c, 'deteintT', 1.2)) return; c.deteintT = Wd.t;
    Wd.cats.forEach(o => { if (o !== c && !o.held && Math.abs(o.x - c.x) < sc(c) * (c.anim === 'secoue' ? 1.4 : 0.9) && Math.abs(o.d - c.d) < 0.3) { Ar.colore(o, 20); if (!arc(o)) say(o, pick(['!?', 'mes poils !', 'oh ✨'])); } });
  }
});

/* ——— la croquette qui tombe sur un gourmand endormi ——— */
H.post.push(() => {
  for (const k of Wd.kib) {
    if (!k.rest || k.who || k.gone || k.vuDort) continue; k.vuDort = 1;
    const c = Wd.cats.find(c => !c.temp && !c.held && c.ch.mange > 2 && dort(c) && Math.abs(c.x - k.x) < sc(c) * 0.6 && Math.abs(c.d - k.d) < 0.3);
    if (!c) continue; interrupt(c); c.q = [pose('sursaut', 0.5, { fx: c => say(c, pick(['*snif*', 'miam ?', '!'])) })]; later(0.6, () => { if (Wd.cats.includes(c) && !c.held) { K.eat(c); if (window.Dex) Dex.vu('miam'); } });
  }
});

/* ——— le couvercle du coffre : ce qui est posé dessus tombe (la tasse !) ——— */
H.pre.push(() => {
  const b = Wd.P && Wd.P.coffre; if (!b || !b.parts || !b.parts.couvercle || b.parts.couvercle.rotation.x > -0.35) return;
  Wd.props.forEach(it => { if (it.on !== b || it.held) return; const dir = b.x < Wd.W * 0.88 ? 1 : -1; /* (vers le bord de l'écran : de l'autre côté, le canapé la renvoyait sur le coffre) */ if (recent(it, 'couvT', 1.5)) return; it.couvT = Wd.t; K.drop(it, dir * sOf(b.d) * rnd(3, 4), sOf(b.d) * 2, dir * rnd(5, 9)); word(pick(['cling', 'oups', 'glisse…']), it.x, it.y - 20, 16); if (window.Dex) Dex.vu('couvercle'); });
});

/* ——— le canapé : un chat lâché dessus fait sauter ceux qui y dorment ——— */
H.fall.unshift((c, dt) => {
  if (c.vy <= 0 || c.held || !window.Canape) return false;
  for (const b of Canape.canapes()) {
    if (b.held || b.fall || recent(b, 'bascT', 1.5)) continue; const L = Univers.at(b, [-0.66, 0.27, 0.05]), R = Univers.at(b, [0.66, 0.27, 0.05]), y = (L[1] + R[1]) / 2;
    if (c.x < Math.min(L[0], R[0]) || c.x > Math.max(L[0], R[0]) || c.y + c.vy * dt < y - 4 || c.y > y + 30) continue;
    const S = Wd.cats.filter(o => o !== c && o.perch && o.perch.it === b && !o.held); if (!S.length) continue; b.bascT = Wd.t;
    S.forEach(o => { interrupt(o); o.fall = true; o.vx = (sgn(o.x - c.x) || 1) * sOf(o.d) * rnd(0.6, 1.2); o.vy = -sOf(o.d) * rnd(3, 4.5) * Math.min(1.6, c.b.s / Math.max(0.6, o.b.s)); o.spin = rnd(-1, 1); say(o, pick(['HEIN ?!', 'wiii !', 'qui m’a lancé ?'])); });
    word('BOING-BOING', (L[0] + R[0]) / 2, y - 50, 24);
    return false;   // (le boing de celui qui tombe : js/canape.js)
  }
  return false;
});

/* ——— le géant qui roule dans le bassin : raz-de-marée ——— */
H.pre.push(() => {
  if (!Ba) return;
  Wd.cats.forEach(c => {
    if (c.rare !== 'geant' || !c.task || c.task.k !== 'rouleau') return;
    Ba.bassins().forEach(b => {
      const S = Ba.surface(b); if (Math.abs(c.x - S.x) > S.rx * 0.8 || c.task.vague === b) return; c.task.vague = b;
      Ba.eclabousse(b, c.x, 3); Ba.gerbe(b, S.x, S.y, 30, 2); word('RAZ-DE-MARÉE', S.x, S.y - Wd.s0 * 1.2, 34);
      Wd.cats.forEach(o => { if (o.perch && o.perch.it === b && o.perch.pe.bain) { interrupt(o); o.fall = true; o.wet = Wd.t; o.vx = (sgn(o.x - c.x) || 1) * sOf(o.d) * rnd(1.5, 2.5); o.vy = -sOf(o.d) * rnd(3, 4); o.spin = rnd(-2, 2); say(o, pick(['GLOUBS', 'AAAH', 'le bain !'])); } });
      Wd.props.forEach(it => { if (it.on === b && it.flotte) { K.drop(it, (sgn(it.x - c.x) || 1) * sOf(b.d) * 2.5, sOf(b.d) * 3, rnd(-8, 8)); it.flotte = false; } });
    });
  });
});

/* ——— chaque objet heurté réagit à sa façon ——— */
if (Co && Co.REACT && Co.REACT.prop) {
  const avant = Co.REACT.prop;
  const PROPRE = {
    distrib(it, s) { it.shake = Wd.t; word('ding', it.x, it.y - it.hull.h * it.s - 8, 15); if (s.f === 2 && Math.random() < 0.35 && Wd.kib.length < 120) { const m = Univers.at(it, it.bec || [0, 0.3, 0]), k = Wd.s0 / 160; Wd.kib.push({ x: m[0], y: m[1], vx: rnd(-200, 200) * k, vy: -rnd(300, 600) * k, d: rnd(0, 0.12), t0: Wd.t, rest: false, spin: Math.random() * 6 }); } },
    coussin(it) { word('pouf', it.x, it.y - 20, 16); if (Vi) Wd.fx.push({ k: 'txt', text: '❋', x: it.x + rnd(-10, 10), y: it.y - 24, t0: Wd.t, life: 1.6, rot: rnd(-1, 1), size: 12 }); },
    panier(it) { word(pick(['crr', 'tchik']), it.x, it.y - 18, 14); },
    gamelle(it, s) { word('tiiing', it.x, it.y - 16, 15); if (s.f === 2) { const k = Wd.s0 / 160; for (let i = 0; i < 3 && Wd.kib.length < 120; i++) Wd.kib.push({ x: it.x, y: it.y - 8, vx: rnd(-300, 300) * k, vy: -rnd(200, 420) * k, d: it.d, t0: Wd.t, rest: false, spin: Math.random() * 6 }); } },
    bassin(it, s) { if (Ba) { Ba.eclabousse(it, s.x, s.f === 2 ? 2 : 1); word(pick(['plic', 'splash', 'floc']), s.x, it.y - 30, 16); } },
    tasse(it, s) { word(pick(['tink', 'ting']), it.x, it.y - 16, 14); if (it.on && s.f >= 1) later(0.5, () => { if (it.on && !it.held) { const dir = sgn(it.onDx) || 1; K.drop(it, dir * sOf(it.d) * 0.9, sOf(it.d) * 0.6, dir * rnd(5, 8)); } }); },
    arbre(it) { it.pompT = Wd.t; word(pick(['dong', 'doïng']), it.x, it.y - it.hull.h * it.s * 0.6, 15); Wd.cats.forEach(c => { if (c.perch && c.perch.it === it && free4(c) === false && Math.random() < 0.5) say(c, pick(['ça bouge !', 'hé !', 'wo wo'])); }); },
    coffre(it) { word(pick(['bonk', 'clac']), it.x, it.y - 20, 15); },
    canape(it) { word(pick(['pouf', 'fff']), it.x, it.y - 20, 15); },
  };
  Co.REACT.prop = (t, s, dir) => { const it = t.ref, f = PROPRE[it.kind]; if (f && s.f >= 1 && !recent(it, 'propreT', 0.5)) { it.propreT = Wd.t; try { f(it, s); } catch (e) {} } return avant(t, s, dir); };
  Co.REACT.lance = Co.REACT.prop;
}

/* ——— les garde-fous d'une longue visite (27/09, l'audit : des heures sans recharger) ——— */
H.live.push(c => {
  // une taille ou une place folle (plus jamais : js/scenarios.js) : on remet d'aplomb
  if (!isFinite(c.s) || c.s > sOf(c.d) * 8) c.s = sOf(c.d);
  if (!isFinite(c.x) || !isFinite(c.y)) { c.x = c.x > 0 ? Wd.W + sc(c) : -sc(c); c.y = floorAt(c.d); c.vx = c.vy = 0; }
  // parti à pied hors de l'écran depuis trop longtemps : il est sorti (hors de vue, il ne disparaît sous les yeux de personne)
  const hors = c.x < -sc(c) * 0.8 || c.x > Wd.W + sc(c) * 0.8;
  if (!hors || c.held || c.rare) { c.horsT = null; return; }
  if (c.horsT == null) c.horsT = Wd.t; else if (Wd.t - c.horsT > 25 && (c.adieu || c.temp || (c.task && c.task.sortie))) { c.fin = true; c.gone = true; }
});
H.post.push(() => {
  if (Wd.t < (Wd.menageT || 0)) return; Wd.menageT = Wd.t + 5;
  // les croquettes : pas plus de 120 à terre (les plus vieilles s'en vont)
  const R = Wd.kib.filter(k => k.rest && !k.who && !k.gone); if (R.length > 120) R.sort((a, b) => a.t0 - b.t0).slice(0, R.length - 120).forEach(k => { k.gone = true; });
  // les vieilles rancunes notées (la liste grandissait sans fin)
  if (Wd.hiss) for (const k in Wd.hiss) if (Wd.t - Wd.hiss[k] > 20) delete Wd.hiss[k];
  // les feuilles arrachées : pas plus de huit par terre
  const F = Wd.props.filter(it => it.tmp && !it.held && !it.fall); if (F.length > 8) F.slice(0, F.length - 8).forEach(it => { it.fadeT = 0; it.away = 'menage'; K.unprop(it); });
});

return { mouille, arc };
})();
