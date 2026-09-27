/* Les meubles (27/09, Mathieu : « il manque lit, canapé, étage, bibliothèque, table ; structurer la scène, plus de profondeur »).
   - La table : on saute dessus (la tasse n'a qu'à bien se tenir), on se cache dessous.
   - Le lit : la grande sieste, sur l'oreiller, au milieu, au pied ; lâché dessus, on rebondit sur le matelas.
   - La bibliothèque : on grimpe de rayon en rayon jusqu'en haut ; de là-haut, un coup de patte, et un livre tombe.
   - La mezzanine : on monte à l'échelle, on dort là-haut ou on surveille ; dessous, un tapis pour la sieste.
   Les perchoirs de chaque meuble sont dans js/univers.js (it.perches : lv, dodo, sous). */
window.Meubles = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, claim, pose, go, hop, fn, free, inView, groundAt, perchAt, beside, xOf, interrupt, floorAt } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
const dex = id => { if (window.Dex) Dex.vu(id); };
const KINDS = { table: 1, lit: 1, biblio: 1, etage: 1 };
const meubles = () => Wd.props.filter(b => KINDS[b.kind] && b.a > 0.3 && !b.held && !b.fall);
if (K.PORTE) Object.assign(K.PORTE, { table: 1, lit: 1, etage: 1 });

/* ——— y aller, monter, faire, redescendre ——— */
const descend = (c, b) => hop(() => groundAt(inView(xOf(b) + sgn(Math.random() - 0.5) * (b.hull.w * 0.5 * b.s + sc(c) * rnd(0.4, 0.9))), Math.max(0, b.d - rnd(0.15, 0.4))), { zr: [0.3, 0.65] });
function monte(c, b, goal) {
  claim(c, goal);
  const sc0 = sc(c), up = pe => hop(() => perchAt(b, pe, 0), { h: sc0 * 0.25, zr: [0, 0.4] });
  // le chemin : un perchoir libre par niveau, du plus bas au but
  const path = []; for (let lv = 1; lv < goal.lv; lv++) { const o = b.perches.filter(p => p.lv === lv && p !== goal && !p.busy); if (o.length) path.push(pick(o)); }
  const pied = () => { const p = Univers.at(b, (path[0] || goal).p); return inView(p[0] + sgn(Math.random() - 0.5 || 1) * sc0 * 0.4); };
  c.q.push(fn(c => c.q.unshift(go(goal.sous ? inView(Univers.at(b, goal.p)[0] + sc0 * 0.9) : pied(), { d: Math.max(0, b.d - 0.1), g: 'trot' }))), pose('affut', rnd(0.4, 0.9)));
  if (goal.sous) { c.q.push(go(() => inView(Univers.at(b, goal.p)[0]), { d: Math.min(1, b.d + 0.02), face: -1 })); return; }
  path.forEach(pe => c.q.push(up(pe), pose(pe.id === 'echelle' ? 'dresse' : pick(['assis', 'affut']), rnd(0.3, 0.8))));
  c.q.push(up(goal));
}
function redescend(c, b, goal) {
  if (goal.sous) { c.q.push(go(() => inView(xOf(b) + sgn(Math.random() - 0.5 || 1) * (b.hull.w * 0.5 * b.s + sc(c) * 0.6)), { d: Math.max(0, b.d - 0.2) }), fn(free)); return; }
  if (goal.lv >= 3) { const mi = b.perches.find(p => p.lv === goal.lv - 2 && !p.busy); if (mi) c.q.push(hop(() => perchAt(b, mi, 0), { h: sc(c) * 0.15 }), pose('affut', 0.3)); }
  c.q.push(descend(c, b), pose('atterrit', 0.3), fn(free));
}
const ACT = {
  table: (c, b, pe) => pe.sous ? [pose('pain', rnd(5, 9), { fx: c => { say(c, pick(['cachette !', 'on ne me voit pas', '…'])); dex('soustable'); } }), pose('curieux', rnd(1.5, 3))]
    : [pose('assis', rnd(2, 4), { fx: c => { say(c, pick(['j’ai le droit ?', 'vue imprenable', 'mrr'])); dex('table'); } }), pose('toilette', rnd(2, 3))],
  lit: (c, b, pe) => pe.dodo ? [pose('petrit', rnd(1.5, 3), { fx: c => { say(c, '♥'); dex('lit'); } }), pose(pick(['dodo', 'donut', 'dodo']), rnd(12, 24), { zzz: 1 }), pose('etirement', 2.5)]
    : [pose('pain', rnd(4, 8), { fx: c => say(c, pick(['je veille', 'la tête de lit est à moi'])) })],
  biblio: (c, b, pe) => pe.sous ? [pose('pain', rnd(4, 8), { fx: c => { say(c, pick(['entre deux livres', 'chut, je lis'])); dex('biblio'); } })]
    : [pose('affut', rnd(1, 2), { fx: () => dex('biblio') }), ...(Math.random() < 0.6 ? [pose('tape', 0.6, { fx: c => K.later(0.25, () => livre(c, b)) })] : []), pose(pe.id === 'haut' ? 'pain' : 'assis', rnd(3, 6), { fx: c => pe.id === 'haut' && say(c, pick(['tout là-haut !', 'le roi du monde', 'vigie.'])) })],
  etage: (c, b, pe) => pe.sous ? [pose('dodo', rnd(8, 16), { zzz: 1, fx: () => dex('etage') })]
    : [pose(pe.dodo ? 'dodo' : 'pain', rnd(6, 14), pe.dodo ? { zzz: 1, fx: () => dex('etage') } : { fx: c => { say(c, pick(['vue d’en haut', 'coucou d’en haut !'])); dex('etage'); } }), pose('curieux', rnd(1, 2))],
};
H.think.push((c, add) => {
  if (c.temp || c.rare || c.perch) return;
  for (const b of meubles()) {
    if (Math.abs(b.x - c.x) > Wd.W * 0.6) continue; const libres = b.perches.filter(p => !p.busy && p.lv !== 1 || (!p.busy && p.id !== 'echelle' && p.lv === 1)); if (!libres.length) continue;
    const w = b.kind === 'lit' ? c.ch.dort * 0.5 : b.kind === 'biblio' ? c.ch.grimpe * 0.5 + c.ch.casse * 0.2 : b.kind === 'etage' ? c.ch.grimpe * 0.3 + c.ch.dort * 0.2 : c.ch.carton * 0.3 + c.ch.casse * 0.15;
    // (les gros ne grimpent pas en haut de la bibliothèque, ni à l'échelle)
    const ok = libres.filter(p => p.sous || c.b.s < 1.2 || p.lv <= 1 && b.kind !== 'etage');
    if (!ok.length) continue;
    add(w + 0.1, () => {
      const goal = c.ch.dort > 2 ? (ok.find(p => p.dodo) || pick(ok)) : c.ch.grimpe > 1.4 ? ok.slice().sort((p, q) => q.lv - p.lv)[0] : pick(ok);
      monte(c, b, goal); c.q.push(...ACT[b.kind](c, b, goal)); redescend(c, b, goal);
    });
  }
});

/* ——— lâché au-dessus : il se pose (le matelas fait rebondir) ——— */
H.fall.unshift((c, dt) => {
  if (c.vy <= 0 || c.held) return false;
  for (const b of meubles()) {
    if (!(Wd.t - (c.relT ?? -9) < 3) && Math.abs(c.d - b.d) > 0.2) continue;
    for (const pe of b.perches) {
      if (pe.sous || pe.id === 'echelle' || pe.busy) continue;
      const P = Univers.at(b, pe.p), half = Math.max(pe.w * b.s, sc(c) * 0.3) + sc(c) * 0.2;
      if (Math.abs(c.x - P[0]) > half || c.y + c.vy * dt < P[1] - 4 || c.y > P[1] + 24) continue;
      if (b.kind === 'lit' && pe.lv === 1 && (!c.boingL || Wd.t - c.boingL > 2)) { c.boingL = Wd.t; c.y = P[1] - 1; c.vy = -Math.min(Math.abs(c.vy) * 0.55, sOf(b.d) * 5) / Math.max(0.7, c.b.s); word(pick(['boing', 'boiing', 'pouf']), c.x, P[1] - 30, 18); dex('lit'); return true; }
      interrupt(c); c.fall = false; c.vx = c.vy = 0; c.spin = 0; c.boingL = 0; c.perch = { it: b, pe, dx: 0 }; claim(c, pe);
      c.q = [pose('atterrit', 0.3), pose(pe.dodo ? 'pain' : pick(['assis', 'affut']), rnd(2, 5))]; redescend(c, b, pe);
      return true;
    }
  }
  return false;
});

/* ——— les livres qui tombent ——— */
const LIV = [];
function livre(c, b) {
  if (!Wd.cats.includes(c) || !c.perch || c.perch.it !== b) return;
  const x = c.x + c.face * sc(c) * 0.4, y = c.y - sc(c) * 0.15, s = sOf(b.d);
  LIV.push({ x, y, vx: c.face * s * rnd(0.8, 1.6), vy: -s * rnd(0.6, 1.4), r: 0, vr: c.face * rnd(5, 10), w: s * 0.2, h: s * 0.28, y1: floorAt(Math.max(0, b.d - 0.12)), t0: Wd.t, sol: 0, col: pick(['190,70,60', '60,110,170', '70,140,90', '200,150,40', null]) });
  say(c, pick(['oups', 'hop', '…pas moi'])); dex('livre');
  if (LIV.length > 10) LIV.shift();
}
H.post.push(dt => {
  const g = K.grav();
  for (const L of LIV) {
    if (L.sol) continue; L.vy += g * dt; L.x += L.vx * dt; L.y += L.vy * dt; L.r += L.vr * dt;
    if (L.y >= L.y1) { L.y = L.y1; L.sol = Wd.t; L.r = Math.round(L.r / (Math.PI / 2)) * (Math.PI / 2); word(pick(['poc', 'paf', 'boum']), L.x, L.y - 20, 16); K.dust(L.x, L.y, L.w * 2, 0.4);
      // un chat à côté sursaute
      Wd.cats.forEach(o => { if (!o.held && !o.fall && !o.perch && Math.abs(o.x - L.x) < sc(o) * 0.9 && Math.random() < 0.7) { interrupt(o); o.q = [pose('sursaut', 0.6, { fx: o => say(o, pick(['!!', 'hé !', 'un livre ?'])) }), pose('curieux', 1.2)]; } }); }
  }
  for (let i = LIV.length - 1; i >= 0; i--) if (LIV[i].sol && Wd.t - LIV[i].sol > 14) LIV.splice(i, 1);
});
H.draw.push(() => {
  const C = window.Chalk, ctx = C && C.ctx; if (!ctx || !LIV.length) return;
  ctx.save(); ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
  for (const L of LIV) {
    const a = Wd.a * (L.sol ? Math.min(1, 1 - (Wd.t - L.sol - 11) / 3) : 1); if (a <= 0) continue;
    ctx.save(); ctx.translate(L.x, L.y - L.h / 2); ctx.rotate(L.r);
    ctx.fillStyle = L.col ? `rgba(${L.col},${0.35 * a})` : 'transparent'; ctx.strokeStyle = `rgba(${(window.THEME && THEME.ink) || C.INK},${0.85 * a})`;
    ctx.beginPath(); ctx.rect(-L.w / 2, -L.h / 2, L.w, L.h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-L.w / 2 + 3, -L.h / 2); ctx.lineTo(-L.w / 2 + 3, L.h / 2); ctx.moveTo(-L.w * 0.2, -L.h * 0.2); ctx.lineTo(L.w * 0.3, -L.h * 0.2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
});

return { meubles, livre, va: (c, b, pe) => { monte(c, b, pe); c.q.push(...ACT[b.kind](c, b, pe)); redescend(c, b, pe); } };
})();
