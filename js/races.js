/* Chaque race a ses manies (27/09, l'audit : « des heures à découvrir toutes les combinaisons »).
   Un geste signature par race, de temps en temps, et ses petites phrases à elle (quand il est assis sans rien faire).
   Chaque manie vue une fois entre dans le carnet (js/decouvertes.js, la famille « manies »). */
window.Races = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, ANIMS, I, rnd, pick, sgn, sc, sOf, say, pose, go, fn, hop, inView, groundAt, perchAt, floorAt, xOf, later, free } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.2, rot: rnd(-0.2, 0.2), size: size || 17 });
const dex = c => { if (window.Dex) Dex.vu('manie-' + c.breed); };
const ptr = () => window.Vie && Vie.ptr;

/* ——— les petites phrases ——— */
const MOTS = {
  boule: ['je suis ronde, et alors', 'roulons', 'mrrrond'], grincheux: ['quoi.', 'tss', 'non.', 'j’étais là avant'],
  long: ['je continue là-bas', 'ma queue est où ?', 'étiiiré'], chaton: ['on joue ?', 'mii !', 'encore !'],
  bleu: ['trop facile', '10/10', 'regarde ça'], miche: ['je suis du pain', 'miche.', 'mrrp ♥'],
  rose: ['coucou ♥', 'tu sens bon', 'câlin ?'], tigre: ['je chasse', 'grrr', 'ne bouge pas…'],
  reveur: ['zz… hein ?', 'j’ai rêvé d’un poisson', 'quel jour on est ?'], nuage: ['pfff…', 'moelleux', 'sieste ?'],
  pompon: ['boing !', 'hihi', 'on saute ?'], gros: ['à manger ?', 'je suis pas gros, je suis doux', 'miam ?'],
  mini: ['je suis grand !', 'là-haut !', 'mip'], hirsute: ['j’ai pas le temps de me coiffer', 'fshh', 'yo'],
};
H.live.push(c => {
  if (c.rare || c.anim !== 'assis' || !MOTS[c.breed] || Wd.t < (c.motT ?? c.born + rnd(8, 20))) return;
  c.motT = Wd.t + rnd(25, 60); if (Math.random() < 0.6) say(c, pick(MOTS[c.breed]));
});

/* ——— les manies ——— */
// le rêveur somnambule : il marche les yeux fermés, des z au-dessus de lui
H.live.push(c => { if (!(c.somna > Wd.t)) return; c.tgt[I.eyes] = 1; c.tgt[I.hnod] = (c.tgt[I.hnod] || 0) + 0.15; if (Wd.t > (c.somZ || 0)) { c.somZ = Wd.t + 1.1; const h = Chat.where(c, c.head); Wd.fx.push({ k: 'z', x: h[0], y: h[1] - sc(c) * 0.2, t0: Wd.t, life: 2.4, dx: c.face }); } });
// le long s'étire, s'étire, s'étire…
H.live.push(c => { if (!(c.etire > Wd.t) || c.anim !== 'etirement') return; const u = 1 - (c.etire - Wd.t) / 3; c.tgt[I.stretch] = (c.tgt[I.stretch] || 0) + Math.sin(Math.min(1, u) * Math.PI) * 0.9; });

const M = {
  boule: c => [pose('roule', rnd(2.5, 4), { fx: c => say(c, 'roule roule') }), pose('assis', 1)],
  grincheux: c => { const P = ptr(); const f = P && P.on ? sgn(P.x - c.x) || c.face : c.face; return [pose('boude', rnd(2, 3), { face: f, fx: c => say(c, pick(['je te vois.', 'tss.', '…'])) }), pose('assis', 1)]; },
  long: c => [pose('etirement', 3, { fx: c => { c.etire = Wd.t + 3; say(c, 'strrrrretch'); } }), pose('assis', 1)],
  chaton: c => [pose('queue', rnd(2.5, 4), { fx: c => say(c, pick(['ma queue !', 'attends !', 'mii !'])) }), pose('etourdi', 1.2, { fx: c => word('@_@', c.x, c.y - sc(c) * 1.1) })],
  bleu: c => {
    const tr = Wd.P.arbre; if (!tr || tr.fall || tr.held) return null;
    const pe = tr.perches.filter(p => !p.busy && p.lv >= 2).sort((a, b) => b.lv - a.lv)[0]; if (!pe) return null; K.claim(c, pe);
    const sc0 = sc(c);
    return [fn(c => c.q.unshift(go(inView(xOf(tr) + sOf(tr.d) * 0.9), { d: Math.max(0, tr.d - 0.12), face: -1 }))), pose('affut', rnd(0.8, 1.4), { fx: c => say(c, 'regarde') }),
      hop(() => perchAt(tr, pe, 0), { h: sc0 * 0.9, zr: [0, 0.4] }), pose('assis', rnd(2, 4), { fx: c => { word(pick(['10/10', 'D’UN BOND !', '✦ parfait ✦']), c.x, c.y - sc(c) * 1.2, 20); } }),
      hop(() => groundAt(inView(xOf(tr) + sOf(tr.d) * 0.8 + sc0 * rnd(0.8, 1.4)), Math.max(0, tr.d - 0.3))), pose('atterrit', 0.3)];
  },
  miche: c => [pose('pain', rnd(6, 10), { fx: c => { say(c, 'miche.'); later(1.5, () => word('♥', c.x, c.y - sc(c) * 0.9, 18)); } })],
  rose: c => {
    const o = Wd.cats.find(o => o !== c && !o.rare && K.free4(o) && Math.abs(o.x - c.x) < Wd.W * 0.4); if (!o) return null; const side = sgn(o.x - c.x) || 1;
    return [go(() => inView(o.x - side * sc(c) * 0.55), { g: 'trot', face: side }), pose('frotte', 2, { face: side, fx: c => { say(c, pick(['câlin ♥', 'mrrr ♥'])); Wd.fx.push({ k: 'heart', x: (c.x + o.x) / 2, y: c.y - sc(c), t0: Wd.t, life: 1.6, r: Math.max(7, sc(c) * 0.07) }); } }), pose('assis', 1)];
  },
  tigre: c => {
    const P = ptr(); const tx = P && P.on && Wd.t - P.moved < 4 ? P.x : c.x + c.face * sc(c) * 2; const side = sgn(tx - c.x) || c.face;
    return [pose('affut', rnd(1.5, 2.5), { face: side, fx: c => say(c, 'ne bouge pas…') }), hop(() => groundAt(inView(tx), c.d), { h: sc(c) * 0.5 }), pose('atterrit', 0.3), pose('assis', 1, { fx: c => say(c, pick(['raté ?', 'je t’ai eu !', 'hmpf'])) })];
  },
  reveur: c => [pose('dodo', 1.5, { zzz: 1 }), fn(c => { c.somna = Wd.t + 7; }), go(() => inView(c.x + (Math.random() < 0.5 ? -1 : 1) * sc(c) * rnd(2, 4)), { g: 'pas' }), fn(c => { c.somna = 0; }), pose('sursaut', 0.6, { fx: c => say(c, pick(['hein ?', 'où suis-je ?', 'zz… !'])) })],
  nuage: c => [pose('dodo', rnd(4, 7), { zzz: 1, fx: c => say(c, '(debout… zz)') }), pose('etirement', 1.5)],
  pompon: c => { const L = []; for (let i = 0; i < 3; i++) L.push(hop(() => groundAt(inView(c.x + c.face * sc(c) * 0.3), c.d), { h: sc(c) * rnd(0.4, 0.7) }), pose('atterrit', 0.15, { fx: c => word('boing', c.x, c.y - sc(c), 15) })); return L.concat([pose('assis', 1)]); },
  gros: c => [pose('ventre', rnd(3, 5), { fx: c => say(c, pick(['gratouille ?', 'le ventre… ♥', 'vas-y'])) }), pose('assis', 1)],
  mini: c => {
    const g = Wd.props.find(p => p.kind === 'gamelle' && !p.busy && !p.held && !p.fall); if (!g) return null; K.claim(c, g);
    return [go(() => inView(xOf(g) - c.face * sc(c) * 0.1), { g: 'trot' }), hop(() => ({ x: xOf(g), y: floorAt(g.d) - g.hull.h * g.s * 0.5, d: g.d }), { h: sc(c) * 0.3 }), pose('pain', rnd(3, 5), { fx: c => say(c, pick(['c’est ma gamelle', 'je rentre pile', 'mip ♥'])) }), hop(() => groundAt(inView(xOf(g) + sc(c) * 0.8), g.d))];
  },
  hirsute: c => [pose('secoue', 1.2, { fx: c => { if (window.Vie && Vie.puffs) Vie.puffs(c, 12); word('fshhhh', c.x, c.y - sc(c), 18); } }), pose('assis', 1, { fx: c => say(c, 'yo') })],
};
H.think.push((c, add) => {
  const f = M[c.breed]; if (!f || c.rare || c.temp) return;
  add(0.9, () => { const L = f(c); if (!L) return K.idle(c); c.q.push(...L, fn(c => { dex(c); free(c); })); });
});

return { MOTS, M };
})();
