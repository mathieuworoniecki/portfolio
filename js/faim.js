/* La faim de toutes les nourritures (27/09, l'audit : « ça doit refléter la complexité du monde »).
   - La gamelle a un stock : elle baisse quand on mange, vide elle ne nourrit plus (« vide ?! ») et le chat file réclamer au distributeur.
     Des croquettes qui tombent dedans la remplissent (glisser la gamelle sous le bec du distributeur, et appuyer).
   - Le poisson en tissu : un chat affamé le prend pour un vrai, le mord… « c'est pas du vrai ». Il s'en souvient (le temps de la visite).
   - Le vol de croquette : un chat plus près d'une croquette qu'un autre visait la lui chipe ; le volé feule, le voleur prend l'air innocent.
   - La gamelle (pleine) ou le poisson qu'on promène : les affamés suivent la main ; posée, ils se jettent dessus. */
window.Faim = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, say, free4, interrupt, pose, go, fn, inView, later } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.2, rot: rnd(-0.2, 0.2), size: size || 17 });
const dex = id => { if (window.Dex) Dex.vu(id); };
const faim = c => Wd.t - (c.ate ?? c.born) > 30;
const gourmand = c => c.ch && c.ch.mange >= 3;
const ok = it => it.fade > 0.5 && !it.away;

/* ——— la gamelle : son stock ——— */
H.post.push(dt => {
  for (const g of Wd.props) {
    if (g.kind !== 'gamelle' || !ok(g)) continue;
    if (g.stock === undefined) g.stock = 1;
    const m = g.busy;
    if (m && m.anim === 'mange' && !g.held && Math.abs(m.x - g.x) < sc(m) * 1.2) {
      g.stock = Math.max(0, g.stock - dt * 0.06);
      // vide sous son nez : surprise, puis il va réclamer au distributeur
      if (g.stock <= 0.03 && !m.videT) {
        m.videT = Wd.t; interrupt(m); say(m, pick(['vide ?!', 'y’en a plus…', 'hé ! vide !']));
        const d = Wd.props.find(p => p.kind === 'distrib' && !p.busy && ok(p));
        m.q = [pose('curieux', 1.2), pose('miaule', 1.2, { fx: c => say(c, 'miaaaou…') })];
        if (d) m.q.push(fn(c => K.press(c, d)));
        dex('gamellevide');
      }
    } else if (m && m.videT && Wd.t - m.videT > 8) m.videT = 0;
    // les croquettes qui tombent dedans la remplissent
    if (g.stock < 1 && !g.held && !g.fall) {
      const w = g.hull.w * g.s * 0.5; let n = 0;
      for (const k of Wd.kib) if (!k.gone && !k.who && k.rest && Math.abs(k.x - g.x) < w && Math.abs(k.d - g.d) < 0.2) { k.gone = true; n++; }
      if (n) { const avant = g.stock; g.stock = Math.min(1, g.stock + n * 0.12); if (avant < 0.99 && g.stock >= 0.99) { word(pick(['pleine !', 'ding !', 'à table !']), g.x, g.y - 24, 20); if (avant < 0.5) dex('remplie'); } }
    }
    if (g.parts.grains) { g.parts.grains.visible = g.stock > 0.03; g.parts.grains.scale.y += (Math.max(0.05, g.stock) - g.parts.grains.scale.y) * Math.min(1, dt * 3); }
  }
});

/* ——— le poisson en tissu ——— */
const dupe = {};   // les races qui se sont déjà fait avoir (pendant la visite)
H.think.push((c, add) => {
  if (c.rare || !faim(c)) return;
  const it = Wd.props.find(p => p.kind === 'poisson' && !p.busy && !p.held && !p.fall && !p.on && ok(p)); if (!it) return;
  add(dupe[c.breed] ? 0.1 : (Wd.t - (c.ate ?? c.born) > 60 ? 3 : 1.2) + c.ch.mange * 0.5, () => {
    K.claim(c, it);
    c.q.push(fn(c => { const b = K.beside(c, K.xOf(it), -sc(c) * 0.1); c.q.unshift(go(b.x, { d: Math.max(0, it.d - 0.04), face: b.face, g: 'trot' })); }),
      pose('affut', rnd(0.6, 1.2), { fx: c => say(c, pick(['un poisson !', 'miam…', '!!'])) }),
      pose('mange', 1.1, { fx: c => word('nom', it.x, it.y - 18, 16) }),
      pose('curieux', 1.2, { fx: c => { say(c, pick(['c’est pas du vrai…', 'en tissu ?!', 'pfff, du faux'])); dupe[c.breed] = 1; dex('fauxpoisson'); } }),
      pose(pick(['boude', 'secoue']), rnd(1.2, 2)), fn(K.free));
  });
});

/* ——— le vol de croquette ——— */
H.post.push(() => {
  if (Wd.t < (Wd.volT || 0)) return; Wd.volT = Wd.t + 0.7;
  for (const k of Wd.kib) {
    const a = k.who; if (!a || k.gone || !k.rest || a.anim === 'mange' || !Wd.cats.includes(a)) continue;
    const da = Math.abs(a.x - k.x);
    const b = Wd.cats.find(o => o !== a && free4(o) && !o.rare && (faim(o) || gourmand(o)) && Math.abs(o.d - k.d) < 0.3 && Math.abs(o.x - k.x) < Math.min(da * 0.6, sc(o) * 2));
    if (!b || Math.random() > 0.35) continue;
    k.who = b; interrupt(b); interrupt(a); const side = sgn(k.x - b.x) || 1;
    b.q = [go(inView(k.x - side * sc(b) * 0.35), { d: Math.min(0.75, k.d), face: side, g: 'trot' }),
      pose('mange', 0.8, { fx: c => { k.gone = true; say(c, pick(['crounch ♪', 'merci !', 'miam'])); } }), pose('innocent', rnd(1.5, 2.5))];
    a.q = [pose('feule', 1.1, { face: sgn(b.x - a.x), fx: c => say(c, pick(['hé ! c’était la mienne', 'VOLEUR', 'grrr'])) }), pose('boude', rnd(1.2, 2))];
    dex('vol'); return;
  }
});

/* ——— on promène la gamelle ou le poisson : les affamés suivent ——— */
let suivi = null;
H.post.push(() => {
  if (Wd.t < (Wd.suitT || 0)) return; Wd.suitT = Wd.t + 0.8;
  const it = Wd.props.find(p => p.held && ((p.kind === 'gamelle' && p.stock > 0.03) || p.kind === 'poisson'));
  if (!it) {
    // posée : ceux qui suivaient se jettent dessus (la gamelle seulement ; le poisson, ils le reniflent)
    if (suivi && !suivi.held && !suivi.fall) {
      const g = suivi; Wd.cats.filter(c => c.suit === g).forEach((c, i) => { c.suit = null; if (!free4(c)) return;
        interrupt(c); if (g.kind === 'gamelle' && i === 0 && !g.busy) K.eat(c, g); else c.q = [go(inView(g.x - (sgn(g.x - c.x) || 1) * sc(c) * 0.7), { g: 'trot', face: sgn(g.x - c.x) }), pose(i ? 'assis' : 'curieux', rnd(1.5, 3))]; });
      suivi = null;
    }
    return;
  }
  suivi = it; let n = Wd.cats.filter(c => c.suit === it).length;
  for (const c of Wd.cats) {
    if (c.rare || c.perch || c.hidden || !free4(c) && c.suit !== it) continue;
    if (c.suit !== it) { if (n >= 3 || !(faim(c) || gourmand(c)) || Math.random() > 0.5) continue; c.suit = it; n++; }
    if (c.held || c.fall || c.jump) continue;
    const side = sgn(it.x - c.x) || 1, x = inView(it.x - side * sc(c) * (0.5 + Wd.cats.indexOf(c) % 3 * 0.35));
    if (Math.abs(x - c.x) < sc(c) * 0.3) { if (c.task && c.task.k === 'walk') continue; c.q = [pose('dresse', 0.8, { face: side, fx: c => Math.random() < 0.4 && say(c, pick(['miaou ?', 'donne !', 'j’ai faim !', 'par ici !'])) })]; continue; }
    c.task = null; c.q = [go(x, { g: Math.abs(x - c.x) > sc(c) * 2 ? 'galop' : 'trot', face: side })];
  }
  if (n >= 3) dex('suiveurs');
});

return { faim };
})();
