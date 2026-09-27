/* L'arc-en-ciel (27/09, Mathieu : « les chats doivent faire caca et pipi de temps en temps, un peu partout ; pour que ce ne soit pas dégueu,
   comme pour le vomi, fais-les qui brillent de toutes les couleurs ; il vomit comme Nyan Cat, des arcs-en-ciel ; si je fais pipi sur un autre chat,
   sur un carton, sur une plante ou dans l'eau, ça devient arc-en-ciel »).
   - De temps en temps, un chat fait sa petite affaire : pipi (une flaque arc-en-ciel) ou caca (un petit tortillon arc-en-ciel, content, qui brille).
     Il gratte, fier (« tadaa »). S'il y a quelque chose juste derrière lui (un chat, un carton, une plante, le bassin), ça devient arc-en-ciel.
   - Le vomi : comme Nyan Cat, un ruban arc-en-ciel qui sort de la bouche, puis une flaque qui brille (Arc.vomit(c) : la feuille mangée, une boule de poils).
   - Ce qui est arc-en-ciel change de couleur (le trait), puis revient.
   - Un chat qui marche dedans laisse des traces de pattes de couleur ; un chat qui passe renifle, recouvre, ou fait « beurk » ;
     un clic dessus, et pouf, des étoiles : c'est propre. L'aspirateur les aspire. */
window.Arc = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, ANIMS, I, rnd, pick, sgn, sc, sOf, say, floorAt, free4, interrupt, pose, go, fn, free, inView, later, dust } = K;
const TAU = Math.PI * 2, COUL = ['231,76,60', '243,156,18', '241,196,15', '46,204,113', '52,152,219', '155,89,182'];
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.2, rot: rnd(-0.2, 0.2), size: size || 16 });
const T = [];   // les traces : { k: 'pipi' | 'caca' | 'vomi' | 'patte', x, y, r, t0, life, seed }

/* ——— ce qui devient arc-en-ciel : son trait change de couleur, puis revient ——— */
function colore(o, dur) { if (!o) return; o.arcT = Math.max(o.arcT || 0, Wd.t + (dur || 25)); o.arcH = o.arcH ?? Math.random(); }
const traits = M => [M.line, M.soft, M.out, M.out2].filter(x => x && x.color);
H.post.push(() => {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  [...Wd.cats, ...Wd.props].forEach(o => {
    if (!o.mats) return;
    if (o.arcT > Wd.t) {
      if (!o.arc0) o.arc0 = o.mats.map(M => traits(M).map(x => x.color.getHex()));
      const h = (o.arcH + Wd.t * 0.35) % 1, fin = Math.min(1, (o.arcT - Wd.t) / 3);   // (les trois dernières secondes, ça pâlit)
      o.mats.forEach((M, i) => traits(M).forEach((x, j) => { const c0 = o.arc0[i] && o.arc0[i][j]; x.color.setHSL((h + j * 0.08) % 1, 0.85, dark ? 0.66 : 0.5); if (fin < 1 && c0 != null) x.color.lerp(TMP.setHex(c0), 1 - fin); }));
    } else if (o.arc0) { o.mats.forEach((M, i) => traits(M).forEach((x, j) => { const c0 = o.arc0[i] && o.arc0[i][j]; if (c0 != null) x.color.setHex(c0); })); o.arc0 = null; }
  });
});
const TMP = new Obj3D.T.Color();

/* ——— la petite affaire ——— */
ANIMS.pousse = (c, p, t) => { K.sit(c, p, 0.12); p[I.tailUp] = 1.6; p[I.tailCurl] = -0.2; p[I.tailWave] = 0.1; p[I.eyes] = 1; p[I.sqz] = 0.03 + Math.sin(t * 34) * 0.012; p[I.hk] = 0.5; p[I.hnod] = -0.1; };
ANIMS.gratte = (c, p, t) => { K.sit(c, p, -0.15); const w = Math.sin(t * 16); p[I.fr] = 0.9 + w * 0.6; p[I.fk2] = 0.9; p[I.hnod] = 0.35; p[I.look] = 0.2; p[I.tailWave] = 0.6; p[I.tailPhase] = t * 6; };
ANIMS.vomi = (c, p, t) => { K.sit(c, p, -0.2); p[I.hnod] = 0.45; p[I.mouth] = 1; p[I.eyes] = 1; p[I.sqz] = Math.sin(t * 20) * 0.02; p[I.puff] = 0.15; };
// ce qui est juste derrière lui (à portée de queue)
function derriere(c) {
  const k = sc(c), bx = c.x - c.face * k * 0.6, cats = Wd.cats.filter(o => o !== c && !o.gone && !o.hidden && o.hp && Math.abs(o.x - bx) < k * 0.7 && Math.abs(o.d - c.d) < 0.2 && !o.held);
  if (cats.length) return cats[0];
  return Wd.props.find(it => !it.held && !it.fall && (!it.mur || it.fixe) && !it.r && it.a > 0.5 && Math.abs(it.d - c.d) < 0.3 && Math.abs(it.x - bx) < (it.hull.w * 0.5 * it.s) + k * 0.2);
}
function besoin(c) {
  c.besoinT = Wd.t + rnd(90, 200); const pipi = Math.random() < 0.55;
  // parfois, il choisit : contre un carton, une plante, le bassin (les chats aiment marquer)
  const C = Wd.props.filter(it => ['carton', 'plante', 'caisse', 'bassin', 'coussin', 'panier', 'arbre', 'canape', 'jungle', 'souffleur'].includes(it.kind) && !it.held && !it.fall && it.a > 0.5 && (!it.mur || it.kind === 'jungle'));
  const cible = pipi && C.length && Math.random() < 0.5 ? pick(C) : null;
  if (cible) { const dir = sgn(c.x - cible.x) || 1, x = inView(cible.x + dir * (cible.hull.w * 0.5 * cible.s + sc(c) * 0.45)); c.q.push(go(x, { d: Math.max(0, cible.d - 0.05), face: dir })); }
  c.q.push(pose('pousse', pipi ? 2 : 2.6, { fx: c => say(c, pick(['…', 'hmm', '(chut)'])) }),
    fn(c => lache(c, pipi)), pose('gratte', 1.3, { fx: c => { c.face = -c.face; word('scritch', c.x, c.y - sc(c) * 0.4, 13); } }),
    pose('assis', rnd(1, 2), { fx: c => say(c, pick(['tadaa ✨', '✨', 'voilà !'])) }), fn(free));
}
function lache(c, pipi) {
  const k = sc(c), x = c.x - c.face * k * 0.45, y = floorAt(c.d) + 2;
  T.push({ k: pipi ? 'pipi' : 'caca', x, y, r: k * (pipi ? 0.3 : 0.14), t0: Wd.t, life: 45, seed: Math.floor(Math.random() * 99), d: c.d });
  if (!pipi) return;
  const o = derriere(c); if (!o) return;
  if (o.kind === 'bassin') { colore(o, 40); window.Bassin && Bassin.colore(o); word(pick(['✨ arc-en-ciel !', 'oups ✨']), o.x, o.y - o.s * 0.5, 17); return; }
  colore(o, o.hull ? 40 : 25);
  if (!o.hull) { interrupt(o); o.q = [pose('sursaut', 0.6, { fx: o => say(o, pick(['HÉ !', '!!', 'mais ?!'])) }), pose('secoue', 0.8), pose('boude', rnd(2, 4)), fn(free)]; }
  else word('✨', o.x, o.y - o.hull.h * o.s - 8, 20);
}
H.think.push((c, add) => {
  if (c.temp || c.rare || c.perch) return; if (c.besoinT == null) c.besoinT = Wd.t + rnd(40, 160);
  if (Wd.t > c.besoinT && T.filter(f => f.k !== 'patte').length < 8) add(2.5, () => besoin(c));
  // une trace pas loin : il renifle ; recouvre, ou « beurk »
  const f = T.find(f => f.k !== 'patte' && !f.vu && Wd.t - f.t0 > 3 && Math.abs(f.x - c.x) < sc(c) * 3 && Math.abs(f.d - c.d) < 0.3);
  if (f) add(0.7, () => { f.vu = 1; const dir = sgn(c.x - f.x) || 1; c.q.push(go(inView(f.x + dir * sc(c) * 0.5), { d: f.d, face: -dir }), pose('curieux', rnd(1, 1.8), { fx: c => say(c, pick(['snif', 'snif snif', '?'])) }),
    Math.random() < 0.5 ? pose('gratte', 1.2, { fx: c => { word('scritch', f.x, f.y - 14, 13); f.cache = Wd.t; } }) : pose('sursaut', 0.6, { fx: c => say(c, pick(['beurk ✨', 'bah !', 'pfff'])) }), fn(free)); });
  // une boule de poils (après la toilette, rarement)
  if (c.anim === 'toilette' && Math.random() < 0.04) add(0.3, () => vomit(c, 'poils'));
});

/* ——— le vomi, façon Nyan Cat ——— */
function vomit(c, pourquoi) {
  if (!Wd.cats.includes(c) || c.held) return; interrupt(c);
  c.q = [pose('hoquet', 1.3, { fx: c => say(c, pick(['hic', 'hoc…', 'blbl'])) }), pose('vomi', 1.5, { fx: c => { Wd.fx.push({ k: 'nyan', c, t0: Wd.t, life: 1.5 }); later(1.3, () => {
      if (!Wd.cats.includes(c)) return; const k = sc(c); T.push({ k: 'vomi', x: c.x + c.face * k * 0.9, y: floorAt(c.d) + 2, r: k * 0.32, t0: Wd.t, life: 40, seed: Math.floor(Math.random() * 99), d: c.d }); }); } }),
    pose('assis', 1.2, { fx: c => say(c, pick(['ouf… ✨', 'ça va mieux', pourquoi === 'feuille' ? 'plus jamais de feuille' : 'mrr'])) }), fn(free)];
}

/* ——— les pattes qui y marchent ; le clic qui nettoie ; l'aspirateur ——— */
H.post.push(() => {
  for (let i = T.length - 1; i >= 0; i--) { const f = T[i]; if (Wd.t - f.t0 > f.life || f.pouf && Wd.t - f.pouf > 0.6) T.splice(i, 1); }
  Wd.cats.forEach(c => {
    if (c.perch || c.jump || c.fall || c.held || !c.hp) return;
    const walk = /pas|trot|galop/.test(c.anim);
    if (walk) { const f = T.find(f => f.k !== 'patte' && !f.pouf && Math.abs(f.x - c.x) < f.r + sc(c) * 0.1 && Math.abs(f.d - c.d) < 0.12); if (f && c.arcPas !== f) { c.arcPas = f; c.arcPasT = Wd.t; if (Math.random() < 0.5) say(c, pick(['oups', '✨?', 'hé'])); } }
    if (c.arcPasT && Wd.t - c.arcPasT < 6 && walk && (c.arcLx == null || Math.abs(c.x - c.arcLx) > sc(c) * 0.22)) {
      c.arcLx = c.x; c.arcN = (c.arcN || 0) + 1; T.push({ k: 'patte', x: c.x + (c.arcN % 2 ? 4 : -4), y: floorAt(c.d) + (c.arcN % 2 ? 2 : -2), r: sc(c) * 0.035, t0: Wd.t, life: 14, seed: c.arcN, d: c.d, col: COUL[c.arcN % 6] }); }
  });
  // l'aspirateur (js/chats.js, Wd.vac)
  const V = Wd.vac; if (V && V.x != null) T.forEach(f => { if (!f.pouf && Math.abs(f.x - V.x) < sOf(f.d) * 0.6) f.pouf = Wd.t; });
});
H.click.push((x, y) => {
  const f = T.find(f => f.k !== 'patte' && !f.pouf && Math.abs(x - f.x) < f.r + 12 && Math.abs(y - (f.y - f.r * 0.4)) < f.r + 14); if (!f) return false;
  f.pouf = Wd.t; word(pick(['pouf ✨', 'propre !', '✨✨']), f.x, f.y - 20, 18);
  for (let i = 0; i < 10; i++) Wd.fx.push({ k: 'etoile', x: f.x, y: f.y - 6, vx: rnd(-120, 120), vy: -rnd(80, 260), t0: Wd.t, life: 0.9, col: COUL[i % 6] });
  return true;
});

/* ——— le dessin ——— */
function etoile(ctx, x, y, r, col, a) { ctx.fillStyle = `rgba(${col},${a.toFixed(3)})`; ctx.beginPath(); for (let i = 0; i < 8; i++) { const q = i / 8 * TAU, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(q) * rr, y + Math.sin(q) * rr); } ctx.fill(); }
function paillettes(ctx, f, n, a, w, h) { for (let i = 0; i < n; i++) { const q = f.seed * 7 + i * 2.3, tw = 0.5 + 0.5 * Math.sin(Wd.t * 5 + q * 3); etoile(ctx, f.x + Math.sin(q) * w, f.y - Math.abs(Math.cos(q * 1.3)) * h, 2 + tw * 2.5, COUL[i % 6], a * tw); } }
H.draw.push(() => {
  const ctx = Chalk.ctx; if (!ctx || Wd.a < 0.05) return; const t = Wd.t;
  T.forEach(f => {
    const u = (t - f.t0) / f.life, a = Wd.a * Math.min(1, (t - f.t0) * 3) * (1 - Math.max(0, (u - 0.8) / 0.2)) * (f.pouf ? Math.max(0, 1 - (t - f.pouf) / 0.5) : 1) * (f.cache ? Math.max(0.25, 1 - (t - f.cache) / 2) : 1);
    if (a <= 0.01) return;
    if (f.k === 'patte') { ctx.fillStyle = `rgba(${f.col},${(0.55 * a).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.55, 0, 0, TAU); ctx.fill();
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(f.x + i * f.r * 0.8, f.y - f.r * 0.85, f.r * 0.32, f.r * 0.22, 0, 0, TAU); ctx.fill(); } return; }
    if (f.k === 'pipi' || f.k === 'vomi') {
      // une flaque aux bandes arc-en-ciel (le vomi, en vagues), qui s'étale d'abord
      const g = Math.min(1, (t - f.t0) / 1.2), R = f.r * g;
      for (let i = 0; i < 6; i++) { const q = 1 - i / 6; ctx.fillStyle = `rgba(${COUL[i]},${(0.32 * a).toFixed(3)})`; ctx.beginPath();
        if (f.k === 'vomi') { for (let j = 0; j <= 24; j++) { const s = j / 24 * TAU, w = 1 + 0.12 * Math.sin(s * 5 + f.seed + i); ctx.lineTo(f.x + Math.cos(s) * R * q * w, f.y + Math.sin(s) * R * q * 0.24 * w); } }
        else ctx.ellipse(f.x, f.y, R * q, R * q * 0.22, 0, 0, TAU);
        ctx.fill(); }
      paillettes(ctx, f, f.k === 'vomi' ? 7 : 5, a, R * 0.9, R * 0.35); return;
    }
    if (f.k === 'caca') {
      // un petit tortillon en trois étages, chacun sa couleur, deux yeux contents, et des paillettes
      const r = f.r, bob = Math.sin(t * 3 + f.seed) * 0.6;
      [[0, 1], [-0.55, 0.78], [-1.0, 0.52]].forEach(([dy, w], i) => { const y = f.y - r * 0.45 + dy * r * 0.9 + bob * (i / 2);
        ctx.fillStyle = `rgba(${COUL[(i * 2 + Math.floor(t * 2)) % 6]},${(0.75 * a).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(f.x, y, r * w, r * 0.42, 0, 0, TAU); ctx.fill();
        Chalk.circle(f.x, y, r * w, r * 0.42, 1, { w: 1.3, a: 0.8 * a, seed: f.seed + i }); });
      const ty = f.y - r * 1.35; ctx.fillStyle = `rgba(${Chalk.INK},${(0.9 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(f.x - r * 0.3, f.y - r * 0.5, r * 0.09, 0, TAU); ctx.arc(f.x + r * 0.3, f.y - r * 0.5, r * 0.09, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(f.x, ty - r * 0.3); ctx.quadraticCurveTo(f.x + r * 0.35, ty - r * 0.55, f.x + r * 0.15, ty - r * 0.75); ctx.strokeStyle = `rgba(${COUL[5]},${(0.8 * a).toFixed(3)})`; ctx.lineWidth = 2; ctx.stroke();
      paillettes(ctx, f, 5, a, r * 1.4, r * 1.6);
    }
  });
  // le ruban de Nyan Cat : six bandes qui ondulent, de la bouche jusqu'au sol
  Wd.fx.forEach(e => {
    if (e.k === 'etoile') { const dt = t - e.t0; if (dt > e.life) return; etoile(ctx, e.x + e.vx * dt * (e.frein ? Math.exp(-dt * e.frein) : 1), e.y + e.vy * dt * (e.frein ? Math.exp(-dt * e.frein) : 1) + (e.g ?? 400) * dt * dt, (e.r || 3.5) * (e.tw ? 0.7 + 0.3 * Math.sin(t * 20 + e.x) : 1), e.col, Wd.a * (1 - dt / e.life)); return; }
    if (e.k !== 'nyan' || !Wd.cats.includes(e.c) || !e.c.hp) return; const dt = t - e.t0; if (dt > e.life) return;
    const c = e.c, k = sc(c), m = [e.c.hp[0] + c.face * k * 0.12, e.c.hp[1] + k * 0.08], g = floorAt(c.d), L = Math.min(1, dt / 0.35), a = Wd.a * Math.min(1, (e.life - dt) / 0.3), bw = Math.max(2, k * 0.028);
    for (let i = 0; i < 6; i++) { const P = []; for (let j = 0; j <= 16; j++) { const u = j / 16 * L, x = m[0] + c.face * u * k * 0.9, y = m[1] + (g - m[1]) * u * u + (i - 2.5) * bw + Math.sin(u * 12 - t * 14) * bw * 0.8; P.push([x, y]); }
      ctx.strokeStyle = `rgba(${COUL[i]},${(0.85 * a).toFixed(3)})`; ctx.lineWidth = bw; ctx.lineCap = 'round'; ctx.beginPath(); P.forEach((p, j) => j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
    for (let i = 0; i < 3; i++) etoile(ctx, m[0] + c.face * k * rnd(0.1, 0.9), m[1] + rnd(-k * 0.3, k * 0.2), 3, COUL[(i * 2 + Math.floor(t * 8)) % 6], a);
  });
});

return { colore, vomit, besoin, T, COUL };
})();
