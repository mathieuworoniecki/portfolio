/* La suite de la vie des chats : branchée sur js/chats.js par ses crochets (Chats.K.H), avec les outils du monde (Chats.K).
   - La chasse au pointeur : les yeux suivent la souris ; un chat tout près se tapit, se dandine et bondit dessus,
     se dresse sur ses pattes arrière pour l'attraper quand elle passe au-dessus de lui. Les joueurs chassent plus, les dormeurs ouvrent un œil.
     La canne à plume (prise dans le coffre à jouets, js/jouets.js) : la plume au bout du fil, les chats la chassent.
   - L'arbre : lâché contre le poteau, le chat s'y agrippe, glisse (les griffes laissent leurs traces), puis grimpe à la première plateforme.
     Lâché au-dessus d'un perchoir (une plateforme, une caisse, le carton, le coussin), il s'y pose.
   - La rébellion : porté trop longtemps (ou secoué), il fouette de la queue, se tord, se retourne vers la main, feule…
     puis griffe (l'écran en garde les marques), s'échappe et boude. La patience dépend de la race.
   - Le carton : un carton ouvert qu'on glisse sous un chat l'attrape (on l'emporte, la tête qui dépasse).
     Un carton lancé qui tombe sur un chat le recouvre : le carton court partout sur de petites pattes, jusqu'à ce qu'il se libère (ou qu'on le soulève). */
window.Vie = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, ANIMS, STEPS, I, rnd, pick, clamp, sgn, sm, c01, sc, front, sOf, floorAt, say, dust, interrupt, free, free4, claim, go, pose, hop, fn, later, inView, groundAt, perchAt } = K;
const TAU = Math.PI * 2;
// un effet à la craie, écrit dans le monde (un mot, à un endroit)
const word = (text, x, y, size, rot) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.3, rot: rot ?? rnd(-0.15, 0.15), size: size || 17 });
const V = [];   // les effets d'ici : les griffures sur l'écran, sur le poteau

/* ——— de nouvelles poses ——— */
// dressé sur ses pattes arrière : les pattes avant qui battent l'air, au-dessus de lui
ANIMS.dresse = (c, p, t) => {
  Chat.rest(c, p); const D = c.D, sw = Math.sin(t * 9);
  p[I.pitch] = 1.2; p[I.y] = D.a * 0.78; p[I.sqz] = 0.04; p[I.stretch] = 0.06;
  p[I.fl] = 0.7 + sw * 0.9; p[I.fr] = 0.7 - sw * 0.9; p[I.fk] = 1.15 - Math.max(0, sw) * 0.3; p[I.fk2] = 1.15 - Math.max(0, -sw) * 0.3;
  Chat.toGround(c, p, 'hl'); Chat.toGround(c, p, 'hr');
  p[I.look] = 0.8; p[I.py] = 1; p[I.hnod] = -0.25; p[I.tailUp] = -0.2; p[I.tailCurl] = -0.3; p[I.tailWave] = 1; p[I.tailPhase] = t * 6; p[I.mouth] = sw > 0.6 ? 1 : 0;
};
// accroché au poteau : immobile, les griffes plantées, les yeux ronds
ANIMS.accroche = (c, p, t) => { ANIMS.grimpe(c, p, 0.3); p[I.fl] = 0.45; p[I.fr] = 0.25; p[I.hl] = -1.1; p[I.hr] = -1.4; p[I.eyes] = 0; p[I.py] = -1; p[I.mouth] = 1; p[I.puff] = 0.4; p[I.tailWave] = 1.2; p[I.tailPhase] = t * 10; };
// il boude : assis, de profil (il ne nous regarde plus), le nez en l'air, les yeux mi-clos, le bout de la queue qui claque
ANIMS.boude = (c, p, t) => { K.sit(c, p); p[I.look] = 0.05; p[I.hnod] = -0.22; p[I.eyes] = (t % 3) < 2.2 ? 1 : 0; p[I.tailWave] = 0.9; p[I.tailPhase] = t * 7; p[I.tailCurl] = 0.4; };

/* ——— le pointeur (la souris seulement : au doigt, on attrape) ——— */
const ptr = Wd.ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, moved: -99, on: false, plume: -99 };
let lastE = 0;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const now = performance.now() / 1000, dt = clamp(now - (lastE || now - 0.016), 0.008, 0.1); lastE = now;
  if (ptr.on) { ptr.vx += ((e.clientX - ptr.x) / dt - ptr.vx) * 0.35; ptr.vy += ((e.clientY - ptr.y) / dt - ptr.vy) * 0.35; }
  ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; ptr.moved = Wd.t;
}, { passive: true });
document.addEventListener('mouseleave', () => { ptr.on = false; });
// la plume au bout du fil : elle pend sous le bout de la canne (K.bout, js/jouets.js) et traîne derrière lui (un pendule)
const plume = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 };
const busyHand = () => Wd.cats.some(c => c.held) || Wd.props.some(it => it.held);
// ce que les chats visent : la plume si elle est là, sinon le pointeur
const aim = () => ptr.plume > Wd.t ? [plume.x, plume.y] : [ptr.x, ptr.y];
H.pre.push(dt => {
  if (Wd.t - ptr.moved > 0.06) { const k = Math.exp(-dt * 10); ptr.vx *= k; ptr.vy *= k; }
  const v = Math.hypot(ptr.vx, ptr.vy);
  // la canne est sortie (dans la main ou plantée) : la plume pend au bout
  const tip = K.bout && K.bout();
  if (tip) { if (ptr.plume < Wd.t) { plume.x = tip[0]; plume.y = tip[1] + Wd.s0 * 0.5; plume.vx = plume.vy = 0; } ptr.plume = Wd.t + 0.25; plume.ax = tip[0]; plume.ay = tip[1]; }
  if (ptr.plume > Wd.t - 1) {
    const L = Wd.s0 * 0.55;
    plume.vy += 1400 * dt * Wd.s0 / 160; plume.vx *= Math.exp(-dt * 1.5); plume.vy *= Math.exp(-dt * 1.5);
    plume.x += plume.vx * dt; plume.y += plume.vy * dt;
    const d2 = Math.hypot(plume.x - plume.ax, plume.y - plume.ay) || 1; if (d2 > L) { const nx = (plume.x - plume.ax) / d2, ny = (plume.y - plume.ay) / d2, vr = plume.vx * nx + plume.vy * ny; plume.x = plume.ax + nx * L; plume.y = plume.ay + ny * L; if (vr > 0) { plume.vx -= vr * nx; plume.vy -= vr * ny; } }
    plume.y = Math.min(plume.y, Wd.floor - 4);
  }
});
function drawPlume() {
  const f = c01((ptr.plume - Wd.t) / 0.25) * Wd.a; if (f < 0.02) return;
  const C = Chalk, s = Wd.s0, ang = Math.atan2(plume.vy + 300, plume.vx) - Math.PI / 2;
  // le fil qui pend (un peu courbe), la plume (une tige, ses barbes) ; la canne elle-même : js/jouets.js
  const mx = (plume.ax + plume.x) / 2 - plume.vx * 0.02, my = (plume.ay + plume.y) / 2 + 6;
  C.stroke([[plume.ax, plume.ay], [mx, my], [plume.x, plume.y]], 1, { w: 1, a: 0.6 * f, seed: 92, tip: false, amp: 0.3 });
  const L = s * 0.32, ca = Math.cos(ang), sa = Math.sin(ang), at = (u, w) => [plume.x + (-sa * u + ca * w) * L, plume.y + (ca * u + sa * w) * L];
  const spine = []; for (let i = 0; i <= 6; i++) spine.push(at(i / 6, Math.sin(i / 6 * 3) * 0.05));
  C.stroke(spine, 1, { w: 1.6, a: 0.85 * f, seed: 93, tip: false });
  for (let i = 1; i < 7; i++) { const u = i / 7, w = 0.28 * Math.sin(u * Math.PI) + 0.05; [-1, 1].forEach(sd => { const a = at(u, 0), b = at(u + 0.12, sd * w); C.line(a[0], a[1], b[0], b[1], 1, { w: 1.1, a: 0.6 * f, seed: 94 + i + sd, tip: false, amp: 0.2 }); }); }
}

/* ——— la chasse ——— */
// les yeux suivent le pointeur ; un dormeur ouvre un œil quand il passe tout près
H.live.push((c, dt) => {
  if (c.hidden || c.held || !c.hp || ((!ptr.on || Wd.t - ptr.moved > 4) && !(ptr.plume > Wd.t))) return;
  const [ax, ay] = aim(), dx = ax - c.hp[0], dy = ay - c.hp[1], s = sc(c), d = Math.hypot(dx, dy);
  if (d > s * 4.5) return; const p = c.tgt;
  if (p[I.eyes] >= 0.5) {
    if (!(c.task && c.task.zzz) || d > s * 2 || Wd.t - ptr.moved > 1) return;
    if (!c.peek || Wd.t > c.peek + 2.5) c.peek = Wd.t;
    if (Wd.t - c.peek < 0.9) { p[I.eyes] = 0; p[I.hnod] -= 0.08; } else return;
  }
  const k = 1 - sm((d - s * 3) / (s * 1.5));
  p[I.px] = p[I.px] * (1 - k) + clamp(dx / (s * 1.2), -1, 1) * c.face * k; p[I.py] = p[I.py] * (1 - k) + clamp(-dy / (s * 1.2), -1, 1) * k;
  if (p[I.look] > 0.4) p[I.htilt] += clamp(dx / (s * 3), -0.2, 0.2) * c.face * k;
});
// qui part en chasse : un chat libre, tout près, qui aime jouer (la plume : plus loin, plus souvent)
H.post.push(dt => {
  // seulement la plume (le pointeur seul n'attire plus : c'est la canne du coffre à jouets qui les fait jouer)
  if (!(ptr.plume > Wd.t) || busyHand() || Wd.t < (Wd.chaseChk || 0)) return; Wd.chaseChk = Wd.t + 0.35;
  const [ax, ay] = aim(), pl = ptr.plume > Wd.t;
  Wd.cats.forEach(c => {
    if (c.temp || !free4(c) || c.hidden || (c.task && c.task.k === 'chasse') || Wd.t < (c.chaseCool || 0) || c.x < 0 || c.x > Wd.W) return;
    const s = sc(c), dx = Math.abs(ax - c.x), hy = floorAt(c.d) - ay;
    if (dx > s * (pl ? 5 : 2.6) || hy > s * 3.2 || hy < -s * 0.3) return;
    if (Math.random() < clamp((pl ? 0.55 : 0.2) * (0.4 + c.ch.joue * 0.3), 0.05, 0.95)) { interrupt(c); c.q = [{ k: 'chasse', max: rnd(7, 14) }]; say(c, pick(['!', '?', 'oh ?'])); }
    else c.chaseCool = Wd.t + rnd(1, 3);
  });
});
// (vague 78, l'audit : « la pièce nous voit ») : le pointeur seul ne lance plus de chasse (la plume, oui) ; mais s'il reste immobile tout près
// d'un chat, de temps en temps, celui-ci se tapit, se dandine… et bondit dessus : sa patte griffe la vitre, trois traits de craie sous la souris
H.post.push(dt => {
  if (ptr.plume > Wd.t || !ptr.on || Wd.fuite || busyHand() || Wd.t < (Wd.guetteChk || 12)) return; Wd.guetteChk = Wd.t + 0.4;
  const calme = Wd.t - ptr.moved; if (calme < 0.7 || calme > 6 || Wd.t < (Wd.guetteCool || 0)) return;
  const [ax, ay] = aim(), c = Wd.cats.find(c => !c.temp && !c.rare && !c.hidden && c.hp && free4(c) && Wd.t > (c.chaseCool || 0)
    && Math.hypot(ax - c.hp[0], ay - c.hp[1]) < sc(c) * 2.2 && floorAt(c.d) - ay > -sc(c) * 0.2 && K.catAt(ax, ay) !== c);
  if (!c || Math.random() > 0.35) return;
  Wd.guetteCool = Wd.t + rnd(25, 45); c.chaseCool = Wd.t + rnd(12, 20);
  const s = sc(c), f = sgn(ax - c.x) || c.face, d = c.d; let px, py;
  interrupt(c); c.q = [pose('affut', rnd(0.9, 1.4), { face: f, fx: c => say(c, pick(['…', 'chut…', '…!'])) }),
    fn(c => { [px, py] = aim(); const tx = inView(px - f * front(c) * 0.5), h = clamp((floorAt(d) - py) * 0.9, s * 0.4, s * 2.4);
      c.q.unshift(hop(() => groundAt(tx, d), { h, dur: 0.38 + h / s * 0.08 }), pose('tape', 0.5, { face: f, fx: c => {
        const [qx, qy] = aim(), bouge = Math.hypot(qx - px, qy - py) > s * 0.6;
        if (!bouge) { Wd.fx.push({ k: 'griffe', x: qx, y: qy, face: f, s, t0: Wd.t, life: 2.8, seed: Math.floor(Math.random() * 99) }); say(c, pick(['kss !', 'à moi !', 'tchac !'])); }
        else say(c, pick(['raté…', 'hé !', 'triche !'])); } }), pose('assis', rnd(1.2, 2), { fx: c => Math.random() < 0.5 && say(c, pick(['c’était quoi ?', 'la vitre…', 'hm.'])) })); })];
});
STEPS.chasse = (c, T, dt) => {
  if (T.t0 === undefined) { T.t0 = Wd.t; T.w = 0; T.wait = rnd(0.5, 1.1); T.n = 0; }
  // la proie : la plume de la canne ; ou une autre (T.aim : la mouche…)
  c.aimF = T.aim || null; const [ax, ay] = T.aim ? T.aim() : aim(), s = sc(c), dx = ax - c.x, hy = floorAt(c.d) - ay, far = Math.abs(dx), pl = !T.aim && ptr.plume > Wd.t;
  const stale = T.aim ? !T.aim.alive() : !pl;   // la canne rangée : fini
  if (Wd.t - T.t0 > T.max || far > s * (pl ? 7 : 5) || hy > s * 4 || (stale && Wd.t - T.t0 > 1.2) || T.n > 5) {
    c.chaseCool = Wd.t + rnd(10, 20); c.aimF = null; c.q.unshift(pose(T.n ? 'toilette' : 'assis', rnd(1.5, 3))); return true; }   // (puis il passe à autre chose un moment : il ne rejoue pas en boucle)
  c.face = sgn(dx) || c.face;
  // la main sur lui : il ne bouge plus (on va l'attraper, le caresser) ; il la regarde
  if (!pl && !T.aim && K.catAt(ptr.x, ptr.y) === c) { c.anim = 'assis'; T.w = 0; T.px = undefined; return false; }
  // trop loin : il s'approche (au trot, la tête basse)
  if (far > s * (hy > s * 0.55 ? 0.7 : 1.3)) {
    // bloqué (le bord, un voisin, un objet) : il n'avance plus, il abandonne plutôt que de trotter sur place
    if (T.px === undefined || Math.abs(c.x - T.px) > s * 0.05) { T.px = c.x; T.pt = Wd.t; }
    else if (Wd.t - T.pt > 0.7) { c.chaseCool = Wd.t + rnd(3, 6); c.aimF = null; c.q.unshift(pose('affut', rnd(0.8, 1.5))); return true; }
    c.anim = 'trot'; c.x = inView(c.x + sgn(dx) * Math.min(far - s * 0.6, K.SPEED.trot * s * 1.3 * dt)); T.w = 0; return false; }
  T.w += dt; T.px = undefined;
  if (hy < s * 0.55) {
    // au ras du sol : tapi, l'arrière qui se dandine… et il bondit dessus, la patte en avant
    c.anim = 'affut';
    if (T.w > T.wait) { T.w = 0; T.wait = rnd(0.4, 1.1); T.n++; const tx = inView(ax - c.face * front(c) * 0.55), d = c.d;
      c.q.unshift(hop(() => groundAt(tx, d), { h: s * 0.45, dur: 0.4 }), pose('tape', 0.4, { fx: catchIt }), T); return true; }
  } else if (hy < s * 1.7) {
    // au-dessus de lui : il se dresse et bat l'air de ses pattes
    c.anim = 'dresse';
    if (T.w > 0.4 && Math.random() < dt * 1.5) { T.w = 0; catchIt(c, true); }
  } else {
    // trop haut : assis, il regarde en l'air… et tente un grand saut
    c.anim = 'affut';
    if (T.w > T.wait + 0.5) { T.w = 0; T.n++; const x0 = c.x, d = c.d, top = Math.min(hy + s * 0.2, s * 3);
      c.q.unshift(hop(() => groundAt(inView(ax - c.face * s * 0.1), d), { h: top, dur: 0.75 }), pose('atterrit', 0.3), T); return true; }
  }
  return false;
};
// la patte arrive-t-elle sur la proie ? (le pointeur ne s'attrape pas… la plume, si : elle saute)
function catchIt(c, up) {
  const [ax, ay] = c.aimF ? c.aimF() : aim(), s = sc(c), paw = [c.x + c.face * front(c), floorAt(c.d) - (up ? s * 0.9 : s * 0.15)];
  if (Math.hypot(ax - paw[0], ay - paw[1]) < s * (up ? 0.7 : 0.55)) {
    say(c, pick(['attrapé !', 'hop !', 'je l’ai !', 'mrrp !'])); if (c.aimF && c.aimF.caught) c.aimF.caught(c);
    if (ptr.plume > Wd.t) { plume.vx += c.face * s * 6; plume.vy -= s * 5; }
  } else if (Math.random() < 0.35) say(c, pick(['?', 'raté…', 'hein ?']));
}

/* ——— l'arbre, les perchoirs : lâché au-dessus, il s'y pose ; lâché contre le poteau, il s'y agrippe ——— */
H.fall.push((c, dt) => {
  if (c.vy <= 0 || c.sulk || Wd.fuite) return false;
  const ny = c.y + (c.vy + K.grav() * dt) * dt, s = sc(c);
  for (const it of Wd.props) {
    if (!it.perches.length || it.held || it.fall || it.run || it.suck || it.fade < 0.9 || it.trap || (it.busy && it.busy !== c)) continue;
    for (const pe of it.perches) {
      if (pe.busy) continue; const p = Univers.at(it, pe.p), w = (pe.w + 0.08) * it.s;
      if (Math.abs(c.x - p[0]) > w || c.y > p[1] - 1 || ny < p[1]) continue;
      if (Wd.cats.some(o => o !== c && o.perch && o.perch.it === it && o.perch.pe === pe)) continue;
      // posé : sur la plateforme, dans le carton, sur la caisse
      interrupt(c); c.fall = false; c.spin = 0; c.vx = 0; c.d = it.d; c.task = null;
      if (it.kind === 'arbre') { pe.busy = c; c.claims.push(pe); } else claim(c, it);
      c.perch = { it, pe, dx: clamp((c.x - p[0]) / it.s, -pe.w, pe.w) }; c.y = p[1];
      dust(p[0], p[1], s * 0.3, 0.6); if (LOURD(it)) { it.wob = Wd.t; it.wobA = 0.6; }
      c.q = [pose('atterrit', 0.3), pose(pe.inside ? 'pain' : pick(['assis', 'assis', 'toilette']), rnd(2.5, 6), { fx: c => say(c, pick(pe.inside ? ['…', 'mrr'] : ['hop', 'ouf', 'tadaa'])) }),
        hop(() => groundAt(inView(xOfIt(it) + sgn(Math.random() - 0.5) * s * rnd(0.9, 1.4)), Math.max(0, it.d - 0.2)), { zr: [0.3, 0.65] }), fn(free)];
      return true;
    }
  }
  const tr = Wd.P.arbre; if (!tr || !tr.post || tr.held || tr.fall || Wd.t - (c.clingT ?? -9) < 2) return false;
  const a = Univers.at(tr, [tr.post.x, tr.post.y0 + 0.1, 0]), b = Univers.at(tr, [tr.post.x, tr.post.y1 - 0.1, 0]);
  if (Math.abs(c.x - a[0]) > s * 0.45 || c.y < b[1] || c.y > a[1] - s * 0.25) return false;
  // agrippé au poteau : il glisse un peu (scriiitch), puis grimpe jusqu'à la plateforme
  c.clingT = Wd.t; interrupt(c); c.fall = false; c.spin = 0; c.task = null; c.face = c.x < a[0] ? 1 : -1; c.d = Math.max(0, tr.d - 0.1); c.x = a[0] - c.face * front(c) * 0.7;
  say(c, pick(['scriiitch', 'kkrr !', '!!']));
  const pe = tr.perches.find(p => p.id === 'plateau' && !p.busy) || tr.perches.find(p => p.lv === 1 && !p.busy);
  c.q = [{ k: 'glisse', v: Math.min(c.vy, s * 3), air: true, x: a[0] }];
  if (pe) { claim(c, pe); c.q.push({ k: 'climb', tree: tr, face: c.face, air: true }, hop(() => perchAt(tr, pe, 0), { h: s * 0.15, zr: [0, 0.4] }), pose('assis', rnd(3, 6), { fx: c => say(c, 'ouf') }),
    hop(() => groundAt(inView(K.xOf(tr) + sOf(tr.d) * 0.7 + s * rnd(0.8, 1.6)), Math.max(0, tr.d - rnd(0.2, 0.5)))), pose('atterrit', 0.3), fn(free)); }
  return true;
});
const LOURD = it => !!K.LOURD[it.kind], xOfIt = it => it.fx * Wd.W;
STEPS.glisse = (c, T, dt) => {
  c.anim = 'accroche'; const s = sc(c), bot = floorAt(c.d) - s * 0.45;
  T.v *= Math.exp(-dt * 5); const y0 = c.y; c.y = Math.min(bot, c.y + T.v * dt);
  // les griffes laissent deux traits sur le poteau
  if (!T.mark) { T.mark = { k: 'poteau', x: T.x, y0, y1: y0, t0: Wd.t, life: 6, seed: Math.floor(Math.random() * 99), w: s * 0.06 }; V.push(T.mark); }
  T.mark.y1 = c.y - s * 0.25; T.mark.y0 = Math.min(T.mark.y0, c.y - s * 0.3);
  return T.v < s * 0.4 || c.y >= bot || T.t > 1.2;
};

/* ——— la rébellion ——— */
const PATIENCE = { grincheux: 4, chaton: 11, boule: 12, reveur: 12, miche: 9, rose: 8, long: 7, bleu: 6, tigre: 6, nuage: 13, pompon: 10, gros: 14, mini: 5, hirsute: 7 };
H.live.push((c, dt) => {
  if (!c.held) { c.heldT0 = 0; if (c.anger) c.anger = Math.max(0, c.anger - dt * 0.25); return; }
  // secoué : le balancier change de sens souvent et fort (un simple transport ne compte pas)
  const P = c.pend; if (!c.heldT0) c.heldT0 = Wd.t; if (P) { const sw = sgn(P.w); if (Math.abs(P.w) > 3 && sw !== c.swS) { c.swS = sw; c.shakeN = (c.shakeN || 0) + 1; } c.shakeN = Math.max(0, (c.shakeN || 0) - dt * 1.2); }
  const shake = clamp((c.shakeN || 0) / 3, 0, 3), p = c.tgt, grace = Wd.t - c.heldT0 < 1.2;
  const a = c.anger = (c.anger || 0) + (grace && !shake ? 0 : dt * (1 + shake * 1.5) / (PATIENCE[c.breed] || 8));
  if (a > 0.35) { p[I.tailWave] = 1.6 + a; p[I.tailPhase] = c.at * 14; p[I.eyes] = 0; }
  if (a > 0.6) { const q = (a - 0.6) / 0.4; if (P) P.w += Math.sin(c.at * 8) * dt * 14 * q; p[I.puff] = q * 0.8; p[I.htilt] += Math.sin(c.at * 9) * 0.3 * q; p[I.hl] += Math.sin(c.at * 11) * 0.8 * q; p[I.hr] -= Math.sin(c.at * 11) * 0.8 * q; if (!c.said1) { c.said1 = 1; say(c, pick(['grrr', 'mrrraou', 'hé ho'])); } }
  if (a > 0.85) { p[I.hnod] = -0.5; p[I.mouth] = 1; p[I.px] = 0; p[I.py] = 1; p[I.fl] = 0.9 + Math.sin(c.at * 20) * 0.5; p[I.fr] = 0.9 - Math.sin(c.at * 20) * 0.5; if (c.said1 < 2) { c.said1 = 2; say(c, 'KSSSS !'); } }
  if (a >= 1) escape(c);
});
function escape(c) {
  // un coup de griffes (l'écran en garde trois marques), il se tortille hors de la main, retombe… et boude
  V.push({ k: 'griffe', x: c.hx + rnd(-10, 10), y: c.hy + sc(c) * 0.1, r: clamp(sc(c) * 0.35, 30, 70), t0: Wd.t, life: 6, seed: Math.floor(Math.random() * 99), rot: rnd(-0.5, 0.2) });
  Wd.shake = { t0: Wd.t, a: 5 };
  const s = sc(c); c.held = false; c.fall = true; c.escT = Wd.t; c.anger = 0; c.said1 = 0; c.sulk = true;
  c.vx = sgn(Math.random() - 0.5) * s * rnd(1.5, 3); c.vy = -s * 2.2; c.y += c.D.stand * s; c.cur[I.y] = c.D.stand; c.spin = rnd(-1, 1); c.pend = null; c.d = K.freeD();
  c.grudge = Wd.t + 20;
}
H.drag.push(c => !!(c.escT && !c.hull));   // il s'est échappé : la main ne le reprend pas avant de lâcher
H.release.push(c => { if (c.escT && !c.hull) { c.escT = 0; return true; } return false; });
H.live.push(c => {
  if (!c.sulk || c.fall || c.held) return; c.sulk = false; interrupt(c); c.task = null;
  const away = sgn(c.x - (ptr.on ? ptr.x : Wd.W / 2)) || 1;
  c.q = [go(inView(c.x + away * Wd.W * 0.25), { g: 'galop' }), pose('boude', rnd(5, 8), { face: away, fx: c => say(c, pick(['hmpf', 'pfff', 'boude.'])) }), pose('toilette', rnd(2, 3))];
});
// un clic sur un chat qui boude : pas de ronron
H.click.push((x, y) => { const c = K.catAt(x, y); if (c && c.grudge > Wd.t) { say(c, pick(['hmpf', 'non.', '…'])); return true; } return false; });

/* ——— le carton qui attrape : glissé sous un chat, il le cueille ——— */
H.post.push(() => {
  Wd.props.forEach(it => {
    if (it.kind !== 'carton' || !it.held || it.lift > Wd.s0 * 0.6) return;
    const pe = it.perches[0]; if (Wd.cats.some(o => o.perch && o.perch.it === it)) return;
    // à l'écran : le bas du carton au niveau de ses pattes, et lui dessous
    const c = Wd.cats.find(c => !c.held && !c.fall && !c.jump && !c.perch && !c.hidden && !c.fight && !c.gone && !c.temp && Math.abs(c.x - it.x) < it.hull.w / 2 * it.s * 0.8 && Math.abs(it.y - floorAt(c.d)) < sc(c) * 0.4);
    if (!c) return;
    interrupt(c); c.task = null; claim(c, it); it.d = it.dT = c.d; c.perch = { it, pe, dx: 0 };
    say(c, pick(['?!', 'mia ?', 'oh.'])); dust(it.x, it.y, it.s * 0.3, 0.6);
    c.q = [pose('pain', rnd(3, 5)), pose('assis', rnd(2, 4)), pose('pain', rnd(2, 5)),
      hop(() => groundAt(inView(it.x + sgn(Math.random() - 0.5) * sc(c) * 1.1), Math.max(0, it.d - 0.2)), { zr: [0.3, 0.65] }), fn(free)];
  });
});
// dans le carton qu'on emporte : il regarde en bas, les yeux ronds
H.live.push(c => { if (c.perch && c.perch.it.held) { const p = c.tgt; p[I.eyes] = 0; p[I.py] = -1; p[I.look] = 1; p[I.htilt] = Math.sin(c.at * 2) * 0.15; } });

/* ——— le carton piège : un carton lancé retombe sur un chat, il le recouvre ——— */
H.bonk.push((it, c) => {
  if (!it.launched || !it.box || it.trap || it.swept || it.suck || it.busy || c.perch || c.jump || c.fall || c.held || c.hidden || c.claims.length || c.temp) return false;
  if (Math.random() > 0.75) return false;
  it.trap = c; it.busy = c; it.vx = 0; it.fx = c.x / Wd.W; it.dT = it.d = c.d; it.tiltV = 0; it.tilt = Math.round((it.tilt || 0) / Math.PI) * Math.PI;
  interrupt(c); c.task = null; c.trap = it; c.hidden = 1; c.q = [{ k: 'piege', box: it, end: Wd.t + rnd(5, 9), next: Wd.t + 0.8 }];
  word('mia ?!', c.x, floorAt(c.d) - it.box.h * it.s - 20, 18);
  return true;
});
STEPS.piege = (c, T) => {
  const b = T.box; c.anim = 'pain';
  const lost = !Wd.props.includes(b) || b.held || b.suck || b.swept || !b.fadeT;
  if (lost || (Wd.t > T.end && !b.fall)) {
    // libre : le carton saute en l'air (ou on l'a soulevé), le chat en jaillit
    const x = b.x || c.x; b.trap = null; if (b.busy === c) b.busy = null; c.trap = null; c.hidden = 0; c.x = inView(x); c.d = b.d;
    if (!lost) { const dir = sgn(Math.random() - 0.5), s = sOf(b.d); K.drop(b, dir * s * 1.2, s * 2, dir * rnd(6, 10)); }
    word(pick(['pop !', 'libre !', 'ta-daa']), x, floorAt(c.d) - sc(c) * 0.9, 19); dust(x, floorAt(c.d), sc(c) * 0.5, 0.9);
    const away = sgn(Math.random() - 0.5);
    c.q.unshift(hop(() => groundAt(inView(x + away * sc(c) * 1.1), c.d), { h: sc(c) * 0.7 }), pose('feule', 0.5, { face: -away }), pose('toilette', rnd(2, 3)));
    return true;
  }
  c.x = b.x; c.d = b.d;
  // dedans, il s'agite : le carton trottine, saute, cogne
  if (Wd.t > T.next && !b.fall && !b.on) { T.next = Wd.t + rnd(0.35, 0.9); const s = sOf(b.d);
    b.fall = true; b.vy = s * rnd(0.35, 0.9); b.vx = (Math.random() < 0.5 ? -1 : 1) * s * rnd(0.5, 1.4); b.tiltV = rnd(-2.5, 2.5);
    if (Math.random() < 0.45) word(pick(['mia !', 'tap tap', 'boum', 'mrrr', '?!', 'miaaou']), b.x + rnd(-20, 20), b.y - b.box.h * b.s - 16, 16); }
  return false;
};
// les petites pattes sous le carton qui court, une queue qui dépasse
function drawTraps() {
  Wd.props.forEach(b => {
    if (!b.trap || !b.box || b.a < 0.1) return; const s = b.s, w = b.box.w * s, y = b.y, run = b.fall ? 1 : 0.2, t = Wd.t * 14;
    [-0.36, -0.14, 0.14, 0.36].forEach((u, i) => { const up = Math.max(0, Math.sin(t + i * 1.7)) * s * 0.035 * run, x = b.x + u * w;
      Chalk.circle(x, y + s * 0.025 - up, s * 0.03, s * 0.022, 1, { w: 1.8, a: 0.85 * b.a, seed: 30 + i, amp: 0.2 }); });
    const side = sgn(b.vx || 1) * -1, x0 = b.x + side * w * 0.5, y0 = y - s * 0.05, P = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; P.push([x0 + side * u * s * 0.3, y0 - u * s * 0.18 + Math.sin(Wd.t * 6 - u * 4) * s * 0.03 * u]); }
    Chalk.stroke(P, 1, { w: 2.2, a: 0.8 * b.a, seed: 39, tip: false });
  });
}

/* ——— le titre en vrai : chaque lettre est un objet ———
   Un chat qui tombe du ciel (ou qu'on lâche) au-dessus du titre s'y pose ; il y marche, s'y assoit, fait tomber une lettre du bout de la patte ;
   un gros chat fait plier la lettre sous lui, et tombe avec elle. Au sol, les lettres se font chahuter, puis remontent à leur place.
   « Restez jouer ici » : tout le titre dégringole (et s'efface au sol, un moment après). */
const titleEl = document.querySelector('[data-scene="salut"] h1');
const TL = { jeu: false };
const LETTERS = () => window.Titles && titleEl ? Titles.letters(titleEl) : null, RECT = () => Titles.rect(titleEl);
const LOURDS = { boule: 1, miche: 1, rose: 1, grincheux: 1, gros: 1, nuage: 1 };
const lx = (L, r) => r.left + L.cx + L.dx, ly = (L, r) => r.top + L.cy + L.dy;
// (29/09, l'audit : après trois événements, le titre ne disait plus que « m c’ t ath » : les chats relançaient sans fin les lettres tombées ;
// une lettre ne reste pas plus de 22 s loin de sa place, quoi qu'il arrive)
// (vague 36 de l'audit : « les lettres ») : la première chute d'une lettre fait « BAM » : le plancher tremble un peu, les chats tout près sursautent,
// les croquettes voisines sautillent ; et là-haut, sa place vide reste marquée d'un contour en pointillés, comme sur une scène de crime
function impact(L, x, fl, w, h) {
  L.boum = true; Wd.shake = { t0: Wd.t, a: Math.min(5, 1.5 + h / 20) };
  Wd.fx.push({ k: 'txt', text: pick(['BAM', 'TOC', 'BOUM', 'PAF']), x, y: fl - h * 1.3, t0: Wd.t, life: 0.9, rot: rnd(-0.2, 0.2), size: Math.max(18, h * 0.6) });
  const R = Math.max(w, h) * 4;
  Wd.cats.forEach(c => { if (c.gone || c.hidden || c.held || c.fall || c.rare || Math.abs(c.x - x) > R + sc(c) || Math.abs(c.y - fl) > sc(c) * 1.2) return;
    const k = c; if (Wd.t - (k.sursautT || -9) < 3) return; k.sursautT = Wd.t; k.fall = true; k.perch = null; k.vy = -sc(k) * rnd(2.2, 3); k.vx = (sgn(k.x - x) || 1) * sc(k) * rnd(0.3, 0.8); say(k, pick(['!', '?!', 'hé !', 'ouh'])); });
  Wd.kib.forEach(k => { if (k.rest && !k.who && Math.abs(k.x - x) < R) { k.rest = false; k.vy = -rnd(80, 180); k.vx = rnd(-40, 40); } });
}
H.draw.push(() => {
  const Ls = LETTERS(); if (!Ls || Wd.a < 0.3) return; const r = RECT();
  Ls.forEach(L => { if (!L.st || L.st === 'back' || L.a < 0.5 || TL.jeu) return; const x0 = r.left + L.x0 - 3, x1 = r.left + L.x1 + 3, y0 = r.top + L.y0 - 3, y1 = r.top + L.y1 + 3, g = Math.min(1, (Wd.t - (L.out0 || Wd.t)) / 0.4);
    Chalk.stroke([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], g, { w: 1.5, a: 0.5 * Wd.a, seed: 70 + (L.x0 | 0) % 50, tip: false, dash: [5, 5] }); });
});
function tumble(L, vx, vy, vr) { if (!L.out0) L.out0 = Wd.t; L.st = 'fall'; L.vx = vx; L.vy = vy; L.vr = vr; L.t = Wd.t; }
H.pre.push(dt => {
  const Ls = LETTERS(); if (!Ls) return; const r = RECT(), g = K.grav() * 0.9, fl = Wd.floor - 2;
  // (vague 51 de l'audit, « le titre », immersion) : la souris qui passe sur le titre le fait onduler comme un champ de blé. Chaque lettre frôlée
  // se penche dans le sens du geste et saute un peu, d'autant plus que le geste est vif
  if (ptr.on && Wd.t - ptr.moved < 0.1 && !TL.jeu) { const sp = Math.hypot(ptr.vx, ptr.vy); if (sp > 120) Ls.forEach(L => {
    if (L.st || L.a < 0.8 || Wd.t - (L.frole || -9) < 0.7) return; const x = lx(L, r), y = r.top + L.cy, h = L.y1 - L.y0, d = Math.abs(ptr.x - x);
    if (d > (L.x1 - L.x0) * 0.9 + 6 || Math.abs(ptr.y - y) > h * 0.9) return; L.frole = Wd.t; const f = Math.min(1.4, sp / 900);
    L.wob = Wd.t; L.wobA = (ptr.vx >= 0 ? 1 : -1) * (0.5 + f); L.hopA = h * 0.12 * f; }); }
  Ls.forEach(L => {
    const w = L.x1 - L.x0, h = L.y1 - L.y0;
    if (!L.st) { if (L.wob) { const u = Wd.t - L.wob; if (u < 0) return; L.rot = Math.sin(u * 22) * 0.07 * (L.wobA || 1) * Math.exp(-u * 3);
        // (la vague de retour : un petit saut de joie qui passe d'une lettre à l'autre)
        if (L.hopA) { L.dy = u < 0.32 ? -Math.sin(u / 0.32 * Math.PI) * L.hopA : 0; if (u >= 0.32) L.hopA = 0; }
        if (u > 2) { L.wob = 0; L.rot = 0; L.dy = 0; } } return; }
    if (L.st === 'fall') {
      L.vy += g * dt; L.dx += L.vx * dt; L.dy += L.vy * dt; L.rot += L.vr * dt;
      const x = lx(L, r); if (x < w / 2) { L.dx += w / 2 - x; L.vx = Math.abs(L.vx) * 0.5; } if (x > Wd.W - w / 2) { L.dx -= x - (Wd.W - w / 2); L.vx = -Math.abs(L.vx) * 0.5; }
      const ext = Math.abs(h / 2 * Math.cos(L.rot)) + Math.abs(w / 2 * Math.sin(L.rot)), bot = ly(L, r) + ext;
      if (bot >= fl && L.vy > 0) {
        L.dy -= bot - fl;
        if (L.vy > 260) { if (L.vy > 700) dust(lx(L, r), fl, Math.max(w, 20) * 0.6, 0.7); if (!L.boum && L.vy > 500) impact(L, lx(L, r), fl, w, h); L.vy = -L.vy * 0.3; L.vx *= 0.6; L.vr = L.vr * 0.5 + rnd(-2, 2); }
        else { L.vy = 0; L.vx *= Math.exp(-dt * 6); const q = Math.round(L.rot / (Math.PI / 2)) * Math.PI / 2; L.rot += (q - L.rot) * Math.min(1, dt * 8); L.vr = 0;
          if (Math.abs(L.vx) < 6 && Math.abs(q - L.rot) < 0.02) { L.st = 'sol'; L.t = Wd.t; L.life = TL.jeu ? rnd(8, 12) : rnd(12, 18); } }
      }
    } else if (L.st === 'sol') {
      // au sol : il reste un moment (les chats jouent avec), puis remonte à sa place (ou s'efface, quand on reste jouer)
      if (Wd.t - L.t > L.life || (!TL.jeu && Wd.t - (L.out0 || Wd.t) > 22)) { if (TL.jeu) L.a = Math.max(0, L.a - dt / 1.5); else { L.st = 'marche'; L.t = Wd.t; L.rot0 = L.rot % (Math.PI * 2); L.pas = rnd(0, 6); } }
    } else if (L.st === 'marche') {
      // (vague 6, l'audit : « la lettre qui remonte est mécanique ») : il lui pousse deux pattes à la craie. Elle se relève d'un sursaut,
      // trottine jusque sous sa place en sautillant (plus vite si un chat la suit de près), puis bondit là-haut
      const u = Wd.t - L.t, rel = sm(Math.min(1, u / 0.35)); L.rot = L.rot0 * (1 - rel);
      const home = r.left + L.cx, x = lx(L, r), e = home - x, prs = Wd.cats.some(c => !c.gone && Math.abs(c.x - x) < sc(c) * 1.2 && Math.abs(c.y - fl) < sc(c)), v = Wd.s0 * (prs ? 2.4 : 1.3);
      if (u > 0.35) { L.pas += dt * (prs ? 22 : 14); L.dx += sgn(e) * Math.min(Math.abs(e), v * dt); L.face = sgn(e) || 1; }
      const hop = u > 0.35 ? Math.abs(Math.sin(L.pas)) * h * 0.18 : Math.sin(rel * Math.PI) * h * 0.4, ext = h / 2;
      L.dy += (fl - ext - hop - ly(L, r)); L.vx = L.vy = 0;
      if ((Math.abs(e) < 3 && u > 0.5) || u > 9) { L.st = 'back'; L.t = Wd.t; L.from = [L.dx, L.dy, L.rot]; dust(x, fl, Math.max(w, 20) * 0.5, 0.6); }
    } else if (L.st === 'back') {
      const u = Math.min(1, (Wd.t - L.t) / 1.1), e = sm(u); L.dx = L.from[0] * (1 - e); L.dy = L.from[1] * (1 - e) - Math.sin(u * Math.PI) * Wd.s0 * 0.8; L.rot = L.from[2] * (1 - e);
      if (u >= 1) { L.st = ''; L.dx = L.dy = L.rot = 0; L.wob = Wd.t; L.wobA = 0.6; L.out0 = 0; L.boum = false;
        // (vague 24 de l'audit : « les lettres ») : quand elle retrouve sa place, ses voisines lui font la fête : une vague de petits sauts
        // part d'elle et court le long du titre, de plus en plus petite (les lettres encore dehors ne bougent pas)
        const i0 = Ls.indexOf(L), hh = L.y1 - L.y0; Ls.forEach((M, j) => { if (M === L || M.st || M.a < 0.3) return; const d = Math.abs(j - i0); if (d > 7) return; M.wob = Wd.t + d * 0.07; M.wobA = 0.5 * Math.exp(-d * 0.3); M.hopA = hh * 0.22 * Math.exp(-d * 0.35); }); }
    }
  });
});
// au sol, deux lettres ne se couchent pas l'une sur l'autre : elles s'écartent (un peu à chaque image)
H.pre.push(dt => {
  const Ls = LETTERS(); if (!Ls) return; const r = RECT(), G = Ls.filter(L => (L.st === 'sol' || (L.st === 'fall' && Math.abs(L.vy) < 60)) && L.a > 0.3);
  for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
    const a = G[i], b = G[j], wa = Math.abs((a.x1 - a.x0) / 2 * Math.cos(a.rot)) + Math.abs((a.y1 - a.y0) / 2 * Math.sin(a.rot)), wb = Math.abs((b.x1 - b.x0) / 2 * Math.cos(b.rot)) + Math.abs((b.y1 - b.y0) / 2 * Math.sin(b.rot));
    const dx = lx(b, r) - lx(a, r), ov = wa + wb + 4 - Math.abs(dx); if (ov <= 0) continue;
    const m = Math.min(ov, 240 * dt) / 2, sd = dx ? sgn(dx) : 1; a.dx -= sd * m; b.dx += sd * m;
  }
});
// l'instant où on le lâche (pour se poser sur ce qu'on voit sous lui : le titre, un bouton)
H.release.push(c => { if (c && c.hp) c.relT = Wd.t; return false; });
// se poser sur le titre en tombant
H.fall.push((c, dt) => {
  const Ls = LETTERS(); if (!Ls || c.vy <= 0 || c.sulk || TL.jeu || c.fuit || Wd.fuite) return false; const r = RECT(), ny = c.y + (c.vy + K.grav() * dt) * dt;
  for (const L of Ls) {
    if (L.st || L.a < 0.9) continue; const top = r.top + L.y0;
    // lâché les pattes déjà dans la lettre (on le tient par la peau du cou, le corps pend) : il se pose dessus quand même
    // juste lâché : il pend sous la main, le corps devant les lettres ; ses pattes passent alors sous le haut de la lettre
    const drop = Wd.t - (c.relT ?? -9) < 0.3 && c.y - sc(c) * 0.9 < top + (L.y1 - L.y0) * 0.5;
    if (Math.abs(c.x - lx(L, r)) > (L.x1 - L.x0) / 2 + sc(c) * 0.1 || (c.y > top + (L.y1 - L.y0) * 0.75 && !drop) || (ny < top && !drop)) continue;
    interrupt(c); c.fall = false; c.spin = 0; c.vx = 0; c.y = top; c.task = null; L.wob = Wd.t; L.wobA = 1;
    c.q = [{ k: 'titre', air: true, row: L.row }]; say(c, pick(['hop', 'tadaa', '!'])); return true;
  }
  return false;
});
STEPS.titre = (c, T, dt) => {
  const Ls = LETTERS(), s = sc(c);
  const fallOff = () => { c.fall = true; c.vy = 0; c.vx = 0; c.task = null; return true; };
  if (!Ls) return fallOff(); const r = RECT(), row = Ls.filter(L => L.row === T.row);
  // ce qu'il a sous les pattes : les lettres encore en place, sous son corps
  const hw = s * 0.28, under = row.filter(L => !L.st && L.a > 0.9 && r.left + L.x1 > c.x - hw && r.left + L.x0 < c.x + hw);
  if (!under.length) { say(c, pick(['!!', 'oups'])); return fallOff(); }
  const top = Math.min(...under.map(L => r.top + L.y0 + L.dy)); c.y += (top - c.y) * Math.min(1, dt * 14);
  if (!T.plan) {
    // son petit programme là-haut : s'asseoir, se promener sur les lettres, en faire tomber une, (s'il est lourd) plier la lettre… puis sauter en bas
    const alive = row.filter(L => !L.st), ends = [alive[0], alive[alive.length - 1]];
    T.plan = [['pose', 'assis', rnd(1.5, 3)]];
    if (Math.random() < 0.7) T.plan.push(['marche', r.left + pick(alive).cx], ['pose', pick(['toilette', 'assis', 'pain']), rnd(2, 4)]);
    if (Math.random() < 0.35 + c.ch.casse * 0.15) { const e = pick(ends); const left = e === ends[0]; T.plan.push(['marche', left ? r.left + e.x1 + s * 0.32 : r.left + e.x0 - s * 0.32], ['pousse', left ? -1 : 1]); }
    if (LOURDS[c.breed] && Math.random() < 0.6) T.plan.push(['lourd']);
    T.plan.push(['pose', 'assis', rnd(1, 2)], ['saute']); T.i = 0; T.u = 0;
  }
  const A = T.plan[T.i]; if (!A) return true; T.u += dt; const next = () => { T.i++; T.u = 0; };
  if (A[0] === 'pose') { c.anim = A[1]; if (T.u > A[2]) next(); }
  else if (A[0] === 'marche') { const lo = r.left + row.filter(L => !L.st)[0].x0 + s * 0.2, hi = r.left + row.filter(L => !L.st).slice(-1)[0].x1 - s * 0.2, tx = clamp(A[1], lo, Math.max(lo, hi)), dx = tx - c.x;
    if (Math.abs(dx) < 3 || T.u > 6) next(); else { c.anim = 'pas'; c.face = sgn(dx); c.x += c.face * Math.min(Math.abs(dx), K.SPEED.pas * s * dt); } }
  else if (A[0] === 'pousse') {
    // la lettre du bout : il la regarde, nous regarde… et la pousse dans le vide
    c.face = A[1]; c.anim = T.u < 1 ? 'assis' : 'tape';
    if (T.u > 1.25 && !A.done) { A.done = 1; const L = row.filter(L => !L.st)[A[1] < 0 ? 0 : row.filter(L => !L.st).length - 1]; if (L && !under.includes(L)) { tumble(L, A[1] * s * rnd(1, 1.8), -s * rnd(0.6, 1.2), A[1] * rnd(3, 7)); later(0.3, () => say(c, pick(['oups', '…', 'hé hé']))); } }
    if (T.u > 2.2) next();
  } else if (A[0] === 'lourd') {
    // trop lourd : la lettre plie, plie… et tombe, le chat avec
    c.anim = 'assis'; const L = under[0]; L.wob = Wd.t - 0.3; L.wobA = 1 + T.u;
    if (T.u > 1.6) { tumble(L, rnd(-1, 1) * s, -s * 0.3, rnd(-4, 4)); say(c, pick(['oups', '!!', 'miaa'])); return fallOff(); }
  } else if (A[0] === 'saute') {
    // en bas : un grand saut, retombé sur ses pattes
    const x = inView(c.x + c.face * s * rnd(0.6, 1.2)), d = rnd(0, 0.4); c.q.unshift(pose('affut', 0.5, { air: true }), hop(() => groundAt(x, d), { h: s * 0.35 }), pose('atterrit', 0.35)); return true;
  }
  return false;
};
// les lettres au sol : un jouet de plus (un coup de patte, elle glisse, roule)
H.think.push((c, add) => {
  const Ls = LETTERS(); if (!Ls) return; const r = RECT(), sol = Ls.filter(L => L.st === 'sol' && L.a > 0.6); if (!sol.length) return;
  add(c.ch.joue * 1.5 + 0.6, () => {
    const L = pick(sol);
    c.q.push(fn(c => { const b = K.beside(c, lx(L, r), sc(c) * 0.45); c.q.unshift(go(inView(b.x), { d: 0, face: b.face, g: 'trot' }), pose('affut', rnd(0.6, 1.2))); }),
      pose('tape', 0.5, { fx: c => later(0.15, () => { if (L.st === 'sol' && Math.abs(lx(L, RECT()) - c.x) < sc(c) * 1.1) { tumble(L, c.face * sc(c) * rnd(1.5, 3), -sc(c) * rnd(0.6, 1.6), c.face * rnd(4, 9)); say(c, pick(['tac', 'hop', '!'])); } }) }),
      pose('assis', rnd(1, 2)));
  });
});
// « Restez jouer ici » : le titre dégringole (son cadre est figé : la page le cache, ses lettres continuent de tomber)
function tombe() {
  const Ls = LETTERS(); if (!Ls) return false; Titles.freeze(titleEl, true); TL.jeu = true;
  Ls.forEach((L, i) => later(rnd(0, 0.5) + i * 0.02, () => { if (!L.st) tumble(L, rnd(-1, 1) * Wd.s0 * 0.8, -Wd.s0 * rnd(0.2, 1), rnd(-5, 5)); }));
  Wd.cats.forEach(c => { if (c.task && c.task.k === 'titre') { c.fall = true; c.vy = 0; c.task = null; c.q = []; } });
  return true;
}

/* ——— tout là-haut, de lui-même : un grand bond du sol sur le titre ou sur un bouton (carnet des interactions) ———
   (28/09, Mathieu : « les chats se téléportent sur les lettres en haut, ce n'est pas logique ; ils doivent rater, se rattraper ou y arriver ».)
   Un chat saute un peu moins de trois fois sa taille, pas plus (PORTEE) ; trop haut, il passe par un meuble (tremplin). Selon la hauteur : il y arrive ; il se rattrape de justesse, pendu par les griffes
   au bord (il se hisse, ou glisse et tombe, la lettre parfois avec lui) ; ou il rate : il monte, monte… s'arrête sous le bord et retombe.
   Trop haut (le titre sur un téléphone), il ne tente même pas. */
const PORTEE = c => sc(c) * (2.5 + (c.ch.grimpe || 0.5) * 0.6) * (LOURDS[c.breed] ? 0.8 : 1);
// un saut en cloche vers un point (T.x, T.y) qui n'est pas un perchoir ; arrivé, la suite (T.then) prend le relais
// T.monte : le saut s'arrête à son sommet (vitesse nulle), en (T.x, T.y) : la suite dit s'il s'accroche ou retombe
// la durée suit la pesanteur : pas de bond de deux étages en une demi-seconde
STEPS.bond = (c, T, dt) => {
  if (!T.x0) {
    T.x0 = c.x; T.y0 = c.y; c.face = sgn(T.x - c.x) || c.face; const g = K.grav(), up = T.y0 - T.y;
    // parti d'un perchoir (le tremplin) : il le quitte, la place est libre
    if (c.perch) { c.perch = null; (c.claims || []).forEach(p => { if (p.busy === c) p.busy = null; }); if (c.claims) c.claims.length = 0; }
    if (T.monte) { T.H = 0; T.dur = clamp(Math.sqrt(2 * Math.max(up, 1) / g), 0.2, 1.2); }
    else { T.H = Math.max(0, up) * 0.3 + sc(c) * 0.3; const pk = Math.max(0, up) + T.H * 0.7, dn = Math.max(0, pk - up); T.dur = clamp(Math.sqrt(2 * pk / g) + Math.sqrt(2 * dn / g), 0.45, 1.3); }
  }
  const u = Math.min(1, T.t / T.dur);
  if (T.monte) { const e = 1 - (1 - u) * (1 - u); c.x = T.x0 + (T.x - T.x0) * u; c.y = T.y0 + (T.y - T.y0) * e; c.anim = u < 0.12 ? 'atterrit' : u > 0.8 ? 'accroche' : 'saut'; }
  else { c.x = T.x0 + (T.x - T.x0) * u; c.y = T.y0 + (T.y - T.y0) * u - T.H * 4 * u * (1 - u); c.anim = u < 0.1 || u > 0.88 ? 'atterrit' : 'saut'; }
  if (u >= 1) { c.y = T.y; if (T.then) { const n = T.then(); if (n) c.q.unshift(n); } return true; }
  return false;
};
// raté : au sommet du saut, les pattes battent l'air sous le bord… et il retombe
const retombe = (c, dir) => { c.fall = true; c.vy = 0; c.vx = -dir * sc(c) * 0.4; c.task = null; say(c, pick(['raté…', 'presque !', 'nyaa', 'grr'])); word(pick(['fffp', 'woosh']), c.x, c.y - sc(c) * 0.9, 14); return null; };
// pendu au bord par les griffes (sous une lettre ou un bouton) : il se hisse, ou glisse et tombe
// T.bord() : le haut du bord et sa demi-largeur, ou rien s'il a disparu ; T.haut() : la suite, une fois hissé ; T.L : la lettre (elle plie sous le poids)
STEPS.griffesT = (c, T, dt) => {
  const B = T.bord(), k = sc(c); if (!B) { c.fall = true; c.vy = 0; say(c, pick(['!!', 'hé !'])); return true; }
  c.x = clamp(c.x, B.x - B.w + 4, B.x + B.w - 4); c.y = B.top + k * 0.62 + (T.glisse ? (Wd.t - T.glisse) * k * 0.5 : 0); c.anim = 'accroche';
  if (!T.dit) { T.dit = 1; word(pick(['scriiitch', 'kkrrr !', '!!']), c.x, B.top - 10, 16); say(c, pick(['aaah', 'mia !', 'hnnn'])); T.dur = rnd(0.8, 1.8); T.ok = Math.random() < (LOURDS[c.breed] ? 0.35 : 0.6) + (c.ch.grimpe || 0.5) * 0.2; if (T.L) { T.L.wob = Wd.t; T.L.wobA = LOURDS[c.breed] ? 1.6 : 1; } }
  if (T.t < T.dur) return false;
  if (T.ok) { c.q.unshift({ k: 'bond', x: c.x, y: B.top, air: true, then: T.haut }); say(c, pick(['hop !', 'ouf', 'hnnn… hop'])); return true; }
  if (!T.glisse) { T.glisse = Wd.t; T.dur += 0.5; word('scriiiii…', c.x, c.y - k * 0.3, 14); return false; }
  // il lâche : lourd, il emporte la lettre avec lui
  if (T.L && !T.L.st && LOURDS[c.breed] && Math.random() < 0.6) { tumble(T.L, rnd(-0.5, 0.5) * k, k * 0.2, rnd(-5, 5)); word(pick(['crac', 'clac']), c.x, B.top, 17); }
  c.fall = true; c.vy = 0; c.vx = 0; say(c, pick(['MIAAA', 'nooon', 'aaah !'])); return true;
};
// sauter vers un bord en haut (x, top) : réussi, rattrapé ou raté selon la hauteur ; bord() le relit à l'arrivée, haut() est la suite une fois dessus
function tente(c, x, top, bord, haut, L) {
  const q = (c.y - top) / PORTEE(c), r = Math.random(), dir = sgn(x - c.x) || c.face, k = sc(c);
  if (c.y - top < k * 1.2) return { k: 'bond', x, y: top, air: true, then: haut };   // presque à hauteur : un petit bond suffit
  const issue = q <= 0.8 ? (r < 0.88 ? 'ok' : 'griffes') : q <= 1 ? (r < 0.45 ? 'ok' : r < 0.85 ? 'griffes' : 'rate') : q <= 1.2 ? (r < 0.45 ? 'griffes' : 'rate') : 'rate';
  if (issue === 'ok') return { k: 'bond', x, y: top, air: true, then: haut };
  if (issue === 'griffes') return { k: 'bond', x: x - dir * k * 0.1, y: top + k * 0.62, monte: true, air: true, then: () => { if (!bord()) return retombe(c, dir); return { k: 'griffesT', bord, haut, L, air: true }; } };
  // raté : il monte aussi haut qu'il peut, et pas plus
  const apex = Math.max(top + k * 0.7, c.y - PORTEE(c) * rnd(0.85, 1));
  return { k: 'bond', x: c.x + (x - c.x) * 0.9, y: apex, monte: true, air: true, then: () => retombe(c, dir) };
}
// trop haut depuis le sol : un tremplin, un perchoir d'un meuble (l'arbre à chat, la bibliothèque…) d'où la lettre est à portée
function tremplin(c, x, top) {
  const P = PORTEE(c); let best = null, bs = 1e9;
  for (const it of Wd.props) {
    if (!it.perches || !it.perches.length || it.held || it.fall || it.run || it.suck || it.a < 0.9) continue;
    for (const pe of it.perches) {
      if (pe.busy || pe.inside) continue; const q = perchAt(it, pe, 0), h1 = c.y - q.y, h2 = q.y - top, dx = Math.abs(q.x - x);
      if (h1 < sc(c) * 0.5 || h1 > P * 0.85 || h2 < -sc(c) * 0.3 || h2 > P * 1.05 || dx > P * 0.7) continue;
      const sco = h2 / P + dx / P * 0.6 + rnd(0, 0.2); if (sco < bs) { bs = sco; best = { it, pe }; }
    }
  }
  return best;
}
// un chat va sous la lettre L (ou sur un tremplin), la vise… et tente sa chance
function monteTitre(c, L) {
  const s = sc(c), P = PORTEE(c), x = RECT().left + L.cx, top0 = RECT().top + L.y0 + L.dy, T = c.y - top0 > P * 1.1 ? tremplin(c, x, top0) : null;
  const vise = fn(c => { const R = RECT(), top = R.top + L.y0 + L.dy; if (L.st || c.y - top > P * 1.25) return;
    const bord = () => { const R = RECT(); return L.st || L.a < 0.9 ? null : { top: R.top + L.y0 + L.dy, x: lx(L, R), w: (L.x1 - L.x0) / 2 + s * 0.1 }; };
    c.q.unshift(pose('affut', rnd(0.5, 1), { face: sgn(x - c.x) || c.face, air: true }), tente(c, x, top, bord, () => ({ k: 'titre', air: true, row: L.row }), L)); });
  if (T) {
    // d'abord le meuble : il y saute, se retourne vers le titre, mesure… puis le grand saut
    claim(c, T.pe); const q0 = perchAt(T.it, T.pe, 0);
    c.q.push(go(inView(q0.x - sgn(x - q0.x || 1) * s * 0.7), { g: 'trot', d: Math.max(0, T.it.d - 0.12) }), pose('affut', rnd(0.5, 1), { face: sgn(q0.x - c.x) || c.face, fx: c => say(c, pick(['par là…', 'hmm', 'plan !'])) }),
      hop(() => perchAt(T.it, T.pe, 0), { h: s * 0.3, zr: [0, 0.4] }), vise);
    return;
  }
  c.q.push(go(inView(x - sgn(x - c.x || 1) * s * 0.6), { g: 'trot' }), pose('affut', rnd(0.8, 1.4), { face: sgn(x - c.x) || c.face, fx: c => say(c, pick(['là-haut !', 'hmm…', '!'])) }), vise);
}
const peutTitre = (c, L, r) => { const top = r.top + L.y0, x = r.left + L.cx; return c.y - top < PORTEE(c) * 1.2 || !!tremplin(c, x, top); };
H.think.push((c, add) => {
  if (c.rare || c.temp || c.perch || TL.jeu || Wd.t < 12 || Wd.cats.some(o => o.task && ['titre', 'rebord', 'bond', 'griffesT'].includes(o.task.k))) return;
  const Ls = LETTERS(); if (!Ls) return; const r = RECT(), s = sc(c), P = PORTEE(c);
  // monter sur le titre : une lettre en place, pas trop loin… et pas trop haut (il se sait un peu trop fort : il tente jusqu'à 1,2 fois sa portée)
  const row = Math.max(...Ls.map(L => L.row)), cand = Ls.filter(L => !L.st && L.a > 0.9 && L.row === row && Math.abs(r.left + L.cx - c.x) < Wd.W * 0.35 && peutTitre(c, L, r));
  if (cand.length) add(c.ch.grimpe * 0.35 + 0.1, () => monteTitre(c, pick(cand)));
  // sur un bouton
  const B = K.boutons().map(o => o.el).filter(el => { const b = el.getBoundingClientRect(); return b.width && c.y - b.top < P * 1.2; });
  if (B.length) add(c.ch.grimpe * 0.3 + 0.1, () => { const el = pick(B), b = el.getBoundingClientRect(), x = clamp(c.x, b.left + s * 0.3, b.right - s * 0.3);
    c.q.push(go(inView(x - sgn(x - c.x || 1) * s * 0.5), { g: 'trot' }), pose('affut', rnd(0.6, 1.2), { face: sgn(x - c.x) || c.face }),
      fn(c => { const b = el.getBoundingClientRect(); if (!b.width || el.disabled || c.y - b.top > P * 1.25) return;
        const bord = () => { const b = el.getBoundingClientRect(); return !b.width || el.disabled ? null : { top: b.top, x: (b.left + b.right) / 2, w: b.width / 2 }; };
        c.q.unshift(tente(c, clamp(x, b.left + 8, b.right - 8), b.top, bord, () => ({ k: 'rebord', el, air: true }))); })); });
});

/* ——— les lettres touchées (carnet des interactions) ———
   Un clic sur une lettre : elle tremble (toc) ; trois clics rapides, elle tombe. Au sol, un clic l'envoie valser.
   Un objet ou un chat lancé dedans la fait tomber (et rebondit) ; une lettre qui tombe sur un chat lui fait « bonk ». */
// la lettre sous un point (en place, ou au sol)
function lettreAt(x, y, m) {
  const Ls = LETTERS(); if (!Ls) return null; const r = RECT(); m = m || 0;
  return Ls.find(L => (!L.st || L.st === 'sol' || (L.st === 'fall' && Math.abs(L.vy) < 80)) && L.a > 0.5 && (() => {
    const w = (L.x1 - L.x0) / 2, h = (L.y1 - L.y0) / 2, a = L.st ? L.rot : 0, ww = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a)), hh = Math.abs(h * Math.cos(a)) + Math.abs(w * Math.sin(a));
    return Math.abs(x - lx(L, r)) < ww + m && Math.abs(y - ly(L, r)) < hh + m; })()) || null;
}
H.click.push((x, y) => {
  if (K.catAt(x, y) || K.propAt(x, y)) return false;
  const L = lettreAt(x, y, 4); if (!L) return false; const s = Wd.s0, side = sgn(lx(L, RECT()) - x) || (Math.random() < 0.5 ? -1 : 1);
  if (L.st) { tumble(L, side * s * rnd(1.5, 2.5), -s * rnd(1, 1.8), side * rnd(5, 10)); word(pick(['tac', 'hop', 'zou']), x, y - 20, 16); return true; }
  L.clk = Wd.t - (L.clkT ?? -9) < 1.6 ? (L.clk || 0) + 1 : 1; L.clkT = Wd.t;
  if (L.clk >= 3 && !TL.jeu) {
    // trop secouée : elle se décroche (ce qui était assis dessus tombe avec)
    L.clk = 0; tumble(L, side * s * rnd(0.3, 0.8), -s * rnd(0.3, 0.7), side * rnd(3, 6)); word(pick(['oups', 'crac', 'plic']), x, y - 20, 17);
  } else { L.wob = Wd.t; L.wobA = 0.8 + L.clk * 0.6; word(pick(['toc', 'tic', 'toc toc']), x + rnd(-8, 8), y - 22, 15); }
  // les chats d'à côté lèvent la tête
  Wd.cats.forEach(c => { if (free4(c) && !c.rare && Math.abs(c.x - x) < Wd.W * 0.25 && Math.random() < 0.3) { interrupt(c); c.q = [pose('affut', rnd(0.8, 1.6), { face: sgn(x - c.x) || c.face })]; } });
  return true;
});
// ce qui vole dans le titre : la lettre tombe, le projectile rebondit ; une lettre qui tombe cogne les têtes
H.pre.push(dt => {
  const Ls = LETTERS(); if (!Ls) return; const r = RECT();
  const hitL = (x, y, vx, vy, m) => { for (let i = 0; i <= 3; i++) { const u = i / 3, L = lettreAt(x - vx * dt * u, y - vy * dt * u, m); if (L && (!L.st || L.st === 'sol')) return L; } return null; };
  for (const it of Wd.props) {
    if (!it.fall || it.held || it.suck || it.run || Wd.t - (it.lettreT ?? -9) < 0.4) continue;
    const vx = it.vx || 0, vy = -(it.vy || 0), s = sOf(it.d); if (Math.hypot(vx, vy) < s * 1.2) continue;
    const L = hitL(it.x, it.y - it.hull.h * it.s * 0.5, vx, vy, it.hull.w * it.s * 0.3); if (!L) continue;
    it.lettreT = Wd.t; const d = sgn(vx) || 1;
    if (L.st === 'sol' || !TL.jeu) tumble(L, vx * 0.6 + d * s * 0.3, Math.min(vy * 0.4, 0) - s * 0.4, d * rnd(5, 10));
    it.vx = -vx * 0.35; it.vy = Math.abs(it.vy || 0) * 0.3 + s * 0.5; it.tiltV = (it.tiltV || 0) + rnd(-6, 6); word(pick(['tac', 'clac', 'toc']), lx(L, r), ly(L, r) - 20, 18);
  }
  for (const c of Wd.cats) {
    // (tombé d'en haut, il s'y pose : c'est plus haut) ; lancé de côté ou vers le haut, il la décroche
    if (!c.fall || c.held || c.rare || Wd.t - (c.lettreT ?? -9) < 0.4) continue; const s = sc(c);
    if (Math.hypot(c.vx, c.vy) < s * 1.8 || (c.vy > 0 && Math.abs(c.vx) < c.vy * 1.3)) continue;
    const L = hitL(c.x, c.y - s * 0.35, c.vx, c.vy, s * 0.2); if (!L) continue;
    c.lettreT = Wd.t; const d = sgn(c.vx) || 1;
    tumble(L, c.vx * 0.5, -s * rnd(0.5, 1), d * rnd(5, 10)); c.vx *= -0.3; c.vy = Math.max(c.vy, 0) * 0.3; word(pick(['BAM', 'clac', 'strike']), lx(L, r), ly(L, r) - 20, 20); say(c, pick(['aïe', 'oups', 'mia !']));
  }
  for (const L of Ls) {
    if (L.st !== 'fall' || L.vy < 200 || Wd.t - (L.bonkT ?? -9) < 0.5) continue; const x = lx(L, r), y = ly(L, r) + (L.y1 - L.y0) / 2;
    for (const c of Wd.cats) {
      if (!c.hp || c.held || c.hidden || c.fall || Wd.t < (c.bonk || 0)) continue; const hr = c.b.head[0] * sc(c);
      if (Math.abs(x - c.hp[0]) > hr + (L.x1 - L.x0) / 2 || Math.abs(y - (c.hp[1] - hr * 0.6)) > hr) continue;
      L.bonkT = Wd.t; L.vy = -L.vy * 0.35; L.vx += sgn(x - c.x || 1) * 80; L.vr += rnd(-4, 4); c.bonk = Wd.t + 0.5;
      say(c, pick(['bonk !', 'aïe', 'une lettre ?!', '?!'])); if (!c.rare && free4(c)) { interrupt(c); c.q = [pose('secoue', 0.5), pose('affut', rnd(0.8, 1.4), { face: sgn(x - c.x) || c.face })]; } break;
    }
  }
});

/* ——— le corps : ce qu'un chat fait de lui-même ———
   Il retombe toujours sur ses pattes… sauf de très haut (splat, des étoiles, il se secoue). Caressé longtemps, il se met sur le dos :
   le ventre, c'est un piège (il agrippe la main). Un bâillement en entraîne d'autres. Il éternue. Il a des amis (il va se frotter à eux)
   et des ennemis (il feule en passant). Une petite bulle dit parfois son humeur. Affamé, il va réclamer au distributeur.
   Le coussin : il se glisse dessous (une bosse qui bouge, la queue qui dépasse). */
ANIMS.splat = (c, p, t) => { Chat.rest(c, p); p[I.sqz] = -0.42; p[I.stretch] = 0.12; p[I.y] = c.D.h * 0.55; p[I.fl] = 1.5; p[I.fr] = 1.25; p[I.hl] = -1.5; p[I.hr] = -1.25; p[I.fk] = p[I.fk2] = p[I.hk] = 0.95; p[I.eyes] = 1; p[I.mouth] = 1; p[I.tailUp] = -0.1; p[I.tailWave] = 0; p[I.look] = 1; };
ANIMS.secoue = (c, p, t) => { Chat.rest(c, p); const w = Math.sin(t * 38); p[I.htilt] = w * 0.45; p[I.sqz] = w * 0.05; p[I.pitch] = w * 0.04; p[I.puff] = 0.5; p[I.eyes] = 1; p[I.tailWave] = 1.6; p[I.tailPhase] = t * 30; };
ANIMS.ventre = (c, p, t) => { lieBack(c, p, t); p[I.eyes] = 2; };
ANIMS.agrippe = (c, p, t) => { lieBack(c, p, t); const k = Math.sin(t * 26); p[I.hl] += k * 0.6; p[I.hr] -= k * 0.6; p[I.fl] = 0.7 + k * 0.35; p[I.fr] = 0.5 - k * 0.35; p[I.fk] = p[I.fk2] = 0.85; p[I.eyes] = 0; p[I.mouth] = 1; p[I.puff] = 0.35; p[I.tailWave] = 1.4; p[I.tailPhase] = t * 16; };
// sur le dos (le corps ne roule pas : les quatre pattes en l'air, la tête penchée, la queue qui balaie)
function lieBack(c, p, t) {
  // le corps fait un demi-tour (c.roll, adouci plus bas) : le dos au sol, les quatre pattes en l'air qui pédalent un peu,
  // la tête presque redressée (penchée, elle nous regarde), la queue qui balaie le sol
  Chat.rest(c, p); c.rollT = Math.PI; const w = Math.sin(t * 2.5);
  p[I.y] = c.D.h * 0.8; p[I.sqz] = -0.06; p[I.look] = 1;
  p[I.fl] = 0.35 + w * 0.2; p[I.fr] = -0.15 - w * 0.2; p[I.hl] = 0.45 - w * 0.12; p[I.hr] = 0.05 + w * 0.12; p[I.fk] = p[I.fk2] = 0.95; p[I.hk] = 1;
  p[I.htilt] = 2.95; p[I.hy] = -c.D.h * 0.7; p[I.hnod] = 0.1; p[I.tailUp] = -0.6; p[I.tailSide] = 1.2; p[I.tailCurl] = 0.2; p[I.tailWave] = 0.9; p[I.tailPhase] = t * 3;
}
// le demi-tour du corps : vers 0 dès qu'il n'est plus sur le dos
H.live.push((c, dt) => { const T = c.rollT || 0; c.rollT = 0; if (!c.roll && !T) return; c.roll = (c.roll || 0) + (T - (c.roll || 0)) * Math.min(1, (dt || 0.016) * 7); if (!T && Math.abs(c.roll) < 0.01) c.roll = 0; });
ANIMS.baille = (c, p, t) => { K.sit(c, p); const u = Math.min(1, t / 1.6), o = u > 0.15 && u < 0.85; p[I.hnod] = -0.35 * Math.sin(u * Math.PI); p[I.mouth] = o ? 1 : 0; p[I.eyes] = 1; p[I.stretch] = 0.04 * Math.sin(u * Math.PI); p[I.sqz] = 0.05 * Math.sin(u * Math.PI); };
ANIMS.eternue = (c, p, t) => { K.sit(c, p); const u = t % 1.6; if (u < 0.6) { p[I.hnod] = -0.3 * u / 0.6; p[I.eyes] = 1; p[I.mouth] = u > 0.4 ? 1 : 0; } else if (u < 0.8) { p[I.hnod] = 0.45; p[I.eyes] = 1; p[I.mouth] = 1; p[I.sqz] = -0.08; } else { p[I.htilt] = Math.sin(u * 40) * 0.3; p[I.eyes] = 1; } };
ANIMS.frotte = (c, p, t) => { Chat.rest(c, p); p[I.hx] = 0.04 + Math.sin(t * 3) * 0.02; p[I.htilt] = 0.35 + Math.sin(t * 3) * 0.15; p[I.hnod] = 0.1; p[I.eyes] = 2; p[I.tailUp] = 1.7; p[I.tailCurl] = 0.4; p[I.tailWave] = 0.3; p[I.sqz] = 0.04; };
ANIMS.innocent = (c, p, t) => { K.sit(c, p); p[I.look] = 0.1; p[I.hnod] = -0.15; p[I.eyes] = (t % 2.6) < 0.2 ? 1 : 0; p[I.px] = 1; p[I.py] = 1; p[I.tailWave] = 0.6; p[I.tailPhase] = t * 2; };
const puffs = (c, n) => { if (!c.hp) return; for (let i = 0; i < n; i++) V.push({ k: 'poil', x: c.x + rnd(-1, 1) * sc(c) * 0.3, y: c.y - sc(c) * rnd(0.2, 0.6), vx: rnd(-40, 40), vy: -rnd(20, 70), t0: Wd.t + i * 0.05, life: rnd(1.5, 2.6), seed: Math.floor(Math.random() * 99) }); };

// de très haut : splat (des étoiles autour de la tête), puis il se secoue et fait comme si de rien n'était
H.live.push(c => {
  if (c.fall) { c._fv = Math.max(c._fv || 0, c.vy); return; }
  if (!c._fv) return; const v = c._fv; c._fv = 0;
  if (c.held || c.perch || !(v > sc(c) * 12.5) || Math.random() < 0.35) return;
  c.q = [pose('splat', 0.9, { fx: c => { say(c, pick(['splat !', 'plof', 'aïe…'])); V.push({ k: 'etoiles', c, t0: Wd.t, life: 1.6 }); } }), pose('secoue', 0.6, { fx: c => puffs(c, 5) }), pose(pick(['assis', 'toilette']), rnd(1.5, 3))]; c.task = null;
});
// le ventre : caressé longtemps, il roule sur le dos… trois caresses de plus, et il agrippe la main (des griffes, des coups de pattes arrière)
H.live.push(c => {
  if (!c.pet) return; c.petT = Wd.t; const P = c.pet, lim = c.breed === 'grincheux' ? 99 : 8;
  if (P.n >= lim && !P.belly) { P.belly = P.n; say(c, pick(['♥', 'mrrr ♥'])); }
  if (P.belly) {
    ANIMS.ventre(c, c.tgt, c.at);
    if (P.n >= P.belly + 3) {
      c.pet = null; c.task = null; c.escT = Wd.t; say(c, pick(['GRRR ♥', 'piège !', 'nyark !'])); puffs(c, 6);
      V.push({ k: 'griffe', x: c.x + rnd(-10, 10), y: c.y - sc(c) * 0.5, r: clamp(sc(c) * 0.22, 20, 44), t0: Wd.t, life: 4, seed: Math.floor(Math.random() * 99), rot: rnd(-0.3, 0.3) });
      c.q = [pose('agrippe', 1.3), pose('ventre', rnd(1.5, 2.5)), pose('secoue', 0.5), pose('assis', 1.5)];
    }
  }
});
// les bâillements, contagieux
H.live.push(c => {
  const yawning = (c.anim === 'etirement' || c.anim === 'baille') && c.tgt[I.mouth] > 0.5;
  if (!yawning || Wd.t - (c.yawnT ?? -9) < 6) return; c.yawnT = Wd.t;
  if (Wd.t - (Wd.yawnT ?? -99) > 12) Wd.yawnN = 0; Wd.yawnT = Wd.t; if (Wd.yawnN++ > 4) return;
  Wd.cats.forEach(o => { if (o === c || o.temp || Math.abs(o.x - c.x) > Wd.W * 0.35 || Wd.t - (o.yawnT ?? -9) < 6 || Math.random() > 0.55) return;
    later(rnd(0.7, 1.8), () => { if (free4(o) && !o.perch) { interrupt(o); o.task = null; o.q = [pose('baille', 1.7), pose(pick(['assis', 'pain']), rnd(2, 4))]; } }); });
});
// les amis, les ennemis : une affinité par paire de races (quelques amitiés, quelques rancunes), qui change avec les bagarres
const REL = { 'boule-chaton': 0.9, 'miche-reveur': 0.8, 'boule-rose': 0.7, 'long-tigre': 0.6, 'bleu-reveur': 0.5, 'chaton-rose': 0.6,
  'grincheux-tigre': -0.7, 'chaton-grincheux': -0.5, 'bleu-tigre': -0.4, 'grincheux-long': -0.3 };
const rk = (a, b) => [a.breed, b.breed].sort().join('-'), rel = (a, b) => (Wd.rel || (Wd.rel = {}))[rk(a, b)] ?? REL[rk(a, b)] ?? 0;
const setRel = (a, b, v) => { (Wd.rel || (Wd.rel = {}))[rk(a, b)] = clamp(v, -1, 1); };
H.live.push(c => { if (c.fight && !c._fought) { c._fought = 1; const o = c.fight.L.find(k => k !== c); if (o) setRel(c, o, rel(c, o) - 0.35); } else if (!c.fight) c._fought = 0; });
H.think.push((c, add) => {
  const f = Wd.cats.filter(o => o !== c && !o.temp && rel(c, o) > 0.3 && !o.held && !o.fall && !o.jump && !o.perch && !o.hidden && /assis|pain|dodo|toilette/.test(o.anim) && Math.abs(o.x - c.x) < Wd.W * 0.6)[0];
  if (f) add(rel(c, f) * 2, () => {
    c.q.push(fn(c => { const b = K.beside(c, f.x, -sc(c) * 0.05); c.q.unshift(go(inView(b.x), { d: clamp(f.d + 0.04, 0, 0.6), face: b.face })); }),
      pose('frotte', rnd(1.4, 2.2), { fx: c => { Wd.fx.push({ k: 'heart', x: (c.x + f.x) / 2, y: c.y - sc(c) * 0.9, t0: Wd.t, life: 1.4, r: clamp(sc(c) * 0.06, 6, 11) }); say(c, 'mrrp'); setRel(c, f, rel(c, f) + 0.05); } }),
      pose(pick(['pain', 'assis', 'pain']), rnd(5, 10)));
  });
});
H.post.push(() => {
  if (Wd.t < (Wd.grudgeChk || 0)) return; Wd.grudgeChk = Wd.t + 0.5;
  const G = Wd.cats.filter(c => !c.temp && !c.perch && !c.held && !c.fall && !c.jump && !c.hidden && !c.fight);
  for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
    const a = G[i], b = G[j]; if (rel(a, b) > -0.3 || Math.abs(a.x - b.x) > (sc(a) + sc(b)) * 0.6 || Math.abs(a.d - b.d) > 0.3) continue;
    const key = rk(a, b) + a.id + b.id; if (Wd.t - ((Wd.hiss || (Wd.hiss = {}))[key] ?? -99) < 15) continue; Wd.hiss[key] = Wd.t;
    [a, b].forEach((k, n) => { if (!(free4(k) || (k.task && k.task.k === 'walk'))) return; const o = n ? a : b, face = sgn(o.x - k.x) || 1;
      k.q.unshift(pose('feule', rnd(0.6, 1), { face, fx: k => say(k, pick(['pfff', 'kss', 'grr'])) }), ...(k.task ? [k.task] : [])); k.task = null; });
  }
});
// l'humeur : une petite bulle, de temps en temps, au-dessus d'un chat tranquille
H.post.push(() => {
  if (Wd.t < (Wd.moodChk || 0)) return; Wd.moodChk = Wd.t + 1;
  Wd.cats.forEach(c => {
    if (c.temp || c.hidden || c.held || c.fall || !c.hp || !/assis|pain|debout|dodo|boude/.test(c.anim)) return;
    if (!c.moodT) { c.moodT = Wd.t + rnd(6, 30); return; } if (Wd.t < c.moodT) return; c.moodT = Wd.t + rnd(25, 55);
    const icon = Wd.t - (c.petT ?? -99) < 30 ? 'coeur' : c.grudge > Wd.t || c.anim === 'boude' ? 'orage' : c.anim === 'dodo' ? 'reve' : Wd.t - (c.ate ?? c.born) > 45 ? 'poisson' : c.ch.joue > 1.4 ? 'pelote' : c.ch.dort > 2 ? 'zzz' : 'note';
    V.push({ k: 'humeur', c, icon, t0: Wd.t, life: 3 });
  });
});
// la faim : il mange quand il peut (on s'en souvient) ; affamé, il réclame au distributeur, puis appuie dessus
H.live.push(c => { if (c.anim === 'mange') c.ate = Wd.t; });
H.think.push((c, add) => {
  const g = Wd.props.find(p => p.kind === 'distrib' && !p.busy && !p.fall && !p.held && p.fade > 0.9); if (!g || Wd.t - (c.ate ?? c.born) < 45 || Wd.kib.some(k => k.rest && !k.who)) return;
  add(2 + c.ch.mange, () => {
    K.claim(c, g); const b = () => K.beside(c, K.xOf(g), sc(c) * 0.25);
    c.q.push(fn(c => { const w = b(); c.q.unshift(go(w.x, { d: Math.max(0, g.d - 0.05), face: w.face })); }),
      pose('miaule', 1.6, { fx: c => say(c, 'miaou ?') }), pose('assis', 0.8), pose('miaule', 1.8, { fx: c => say(c, pick(['MIAOU !', 'miaaaou !!', 'j’ai faim !'])) }),
      fn(c => { free(c); K.press(c, g); }));
  });
});
// l'éternuement : de temps en temps (et après la poussière de l'aspirateur)
H.think.push((c, add) => add(0.12 + (Wd.vac ? 1 : 0), () => c.q.push(pose('eternue', 1.6, { fx: c => later(0.62, () => { say(c, pick(['atchoum !', 'tchi !', 'pff-tchoum'])); puffs(c, 2); }) }), pose('secoue', 0.4), pose('assis', rnd(1, 2)))));
// sous le coussin : il s'y glisse (le coussin fait une bosse qui bouge, la queue dépasse)
H.think.push((c, add) => {
  if (c.b.s > 1.05 || c.D.a > 0.4) return; const it = Wd.props.find(p => p.kind === 'coussin' && !p.busy && !p.fall && !p.held && !p.on && p.fade > 0.9 && !p.lump); if (!it) return;
  add(c.ch.carton * 0.35 + 0.1, () => {
    K.claim(c, it);
    c.q.push(fn(c => { const b = K.beside(c, K.xOf(it), sc(c) * 0.15); c.q.unshift(go(b.x, { d: Math.max(0, it.d - 0.03), face: b.face })); }), pose('affut', 0.8),
      fn(c => { c.hidden = 1; it.lump = c; c.x = it.x; dust(it.x, it.y, it.s * 0.3, 0.5); }), { k: 'wait', anim: 'pain', until: () => !it.lump || it.held || it.fall, max: rnd(6, 12) },
      fn(c => { c.hidden = 0; it.lump = null; it.lift = 0; it.tilt = 0; say(c, pick(['coucou !', 'mrrp', '!'])); }),
      hop(() => groundAt(inView(it.x + sgn(Math.random() - 0.5) * sc(c) * 0.9), Math.max(0, it.d - 0.1)), { h: sc(c) * 0.4 }), fn(free));
  });
});
H.post.push(() => Wd.props.forEach(it => {
  if (!it.lump) return; const c = it.lump;
  if (it.held || it.fall || !Wd.cats.includes(c)) { if (Wd.cats.includes(c)) { c.hidden = 0; interrupt(c); c.fall = true; c.vy = -sc(c); } it.lump = null; return; }
  it.lift = it.s * (0.07 + 0.03 * Math.sin(Wd.t * 3)); it.tilt = Math.sin(Wd.t * 2.2) * 0.06; c.x = it.x; c.d = it.d;
}));

/* ——— la langue (la toilette) : un petit bout rose qui sort de la bouche et y rentre ——— */
function drawTongues() {
  const ctx = Chalk.ctx; if (!ctx) return;
  Wd.cats.forEach(c => {
    if (!(c.tongue > 0.08) || c.hidden || c.anim !== 'toilette' || !c.root.visible) return;
    // la langue part de la bouche, vers ce qu'il lèche (la patte, le flanc), sinon vers le bas
    const b = c.b, m = Chat.where(c, c.head, [0, -b.head[1] * 0.22 - b.head[0] * 0.16, b.head[2] * 0.98]);
    const n = c.lickTo === 'body' ? Chat.where(c, c.body) : c.lickTo && c.legs[c.lickTo] ? Chat.where(c, c.legs[c.lickTo].foot) : Chat.where(c, c.head, [0, -b.head[1] * 0.6, b.head[2] * 0.9]);
    const s = sc(c), dx = n[0] - m[0], dy = n[1] - m[1], d = Math.hypot(dx, dy) || 1, L = Math.min(s * 0.075, Math.max(s * 0.03, d * 0.7)) * c.tongue, w = s * 0.022, ux = dx / d, uy = dy / d, vx = -uy, vy = ux;
    const P = (u, v) => [m[0] + ux * u + vx * v, m[1] + uy * u + vy * v];
    ctx.save(); ctx.globalAlpha = Wd.a * c.a; ctx.beginPath(); const a0 = P(0, -w), a1 = P(L, -w), a2 = P(L, w), a3 = P(0, w), tip = P(L + w, 0);
    ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.quadraticCurveTo(tip[0] + (a1[0] - a0[0]) * 0, tip[1], a2[0], a2[1]); ctx.lineTo(a3[0], a3[1]);
    ctx.fillStyle = 'rgba(232,122,142,0.95)'; ctx.fill(); ctx.strokeStyle = `rgba(${(window.THEME && THEME.ink) || Chalk.INK},0.9)`; ctx.lineWidth = Math.max(1.3, s * 0.009); ctx.stroke();
    const mid0 = P(w * 0.3, 0), mid1 = P(L * 0.7, 0); ctx.lineWidth *= 0.6; ctx.beginPath(); ctx.moveTo(mid0[0], mid0[1]); ctx.lineTo(mid1[0], mid1[1]); ctx.stroke(); ctx.restore();
  });
}

// la queue qui dépasse du coussin
function drawLumps() {
  Wd.props.forEach(it => { if (!it.lump) return; const s = it.s, x0 = it.x + it.hull.w * s * 0.45, y0 = it.y - s * 0.05, P = [];
    for (let i = 0; i <= 10; i++) { const u = i / 10; P.push([x0 + u * s * 0.3, y0 - Math.sin(u * 2.2) * s * 0.18 + Math.sin(Wd.t * 5 - u * 5) * s * 0.03 * u]); }
    Chalk.stroke(P, 1, { w: 2.6, a: 0.85 * it.a, seed: 47, tip: false }); });
}
// les poils qui volent, les étoiles d'un splat, les bulles d'humeur
let PAPER = null; addEventListener('themechange', () => { PAPER = null; });
function drawBodies() {
  const C = Chalk, t = Wd.t;
  V.forEach(f => {
    const u = (t - f.t0) / f.life; if (u < 0) return; const a = (1 - sm((u - 0.7) / 0.3)) * Wd.a;
    if (f.k === 'poil') { const dt = t - f.t0, x = f.x + f.vx * dt + Math.sin(dt * 5 + f.seed) * 8, y = f.y + f.vy * dt + dt * dt * 30;
      C.stroke([[x - 4, y], [x - 1, y - 3], [x + 2, y + 1], [x + 5, y - 2]], 1, { w: 1.1, a: 0.6 * a, seed: f.seed, tip: false, amp: 0.3 }); }
    else if (f.k === 'etoiles') { const c = f.c; if (!c.hp) return; const r = sc(c) * 0.3;
      for (let i = 0; i < 3; i++) { const q = t * 5 + i * TAU / 3, x = c.hp[0] + Math.cos(q) * r, y = c.hp[1] - sc(c) * 0.22 + Math.sin(q) * r * 0.3, z = 5;
        C.line(x - z, y, x + z, y, 1, { w: 1.4, a: 0.8 * a, seed: i, tip: false, amp: 0 }); C.line(x, y - z, x, y + z, 1, { w: 1.4, a: 0.8 * a, seed: i + 3, tip: false, amp: 0 }); } }
    else if (f.k === 'humeur') {
      const c = f.c; if (!c.hp || c.hidden || !Wd.cats.includes(c)) return; const s = clamp(sc(c) * 0.16, 14, 26), ap = a * sm(u * 6);
      const x = c.hp[0] + c.face * sc(c) * 0.3, y = c.hp[1] - sc(c) * 0.45;
      C.circle(c.hp[0] + c.face * sc(c) * 0.14, c.hp[1] - sc(c) * 0.22, 2.5, 2.5, 1, { w: 1.2, a: 0.7 * ap, seed: 5 }); C.circle(c.hp[0] + c.face * sc(c) * 0.21, c.hp[1] - sc(c) * 0.31, 3.8, 3.5, 1, { w: 1.2, a: 0.7 * ap, seed: 6 });
      const P = []; for (let i = 0; i <= 40; i++) { const q = i / 40 * TAU, b = 1 + 0.12 * Math.abs(Math.sin(q * 3)); P.push([x + Math.cos(q) * s * 1.15 * b, y + Math.sin(q) * s * 0.85 * b]); }
      const ctx = C.ctx; if (ctx) { ctx.save(); ctx.globalAlpha = ap; ctx.fillStyle = PAPER || (PAPER = getComputedStyle(document.body).backgroundColor || '#ddd'); ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill(); ctx.restore(); }
      C.stroke(P, 1, { w: 1.5, a: 0.8 * ap, seed: 7, tip: false });
      const o = { w: 1.6, a: 0.85 * ap, tip: false, seed: 8 }, k = s * 0.5;
      if (f.icon === 'coeur') { const H2 = []; for (let i = 0; i <= 24; i++) { const q = i / 24 * TAU; H2.push([x + 16 * Math.pow(Math.sin(q), 3) * k / 16, y - (13 * Math.cos(q) - 5 * Math.cos(2 * q) - 2 * Math.cos(3 * q) - Math.cos(4 * q)) * k / 16]); } C.stroke(H2, 1, o); }
      else if (f.icon === 'poisson') { C.circle(x - k * 0.2, y, k * 0.6, k * 0.35, 1, o); C.stroke([[x + k * 0.4, y], [x + k * 0.8, y - k * 0.3], [x + k * 0.8, y + k * 0.3], [x + k * 0.4, y]], 1, o); C.dot(x - k * 0.5, y - k * 0.05, 1.3, 0.8 * ap); }
      else if (f.icon === 'orage') C.stroke([[x + k * 0.1, y - k * 0.7], [x - k * 0.3, y + k * 0.05], [x + k * 0.15, y + k * 0.05], [x - k * 0.2, y + k * 0.75]], 1, o);
      else if (f.icon === 'pelote') { C.circle(x, y, k * 0.55, k * 0.55, 1, o); C.line(x - k * 0.4, y - k * 0.3, x + k * 0.4, y + k * 0.3, 1, o); C.line(x - k * 0.45, y + k * 0.1, x + k * 0.2, y - k * 0.45, 1, o); }
      else C.text(f.icon === 'zzz' || f.icon === 'reve' ? (f.icon === 'reve' ? '☾' : 'zz') : '♪', x, y + k * 0.35, 1, { size: s * 1.1, align: 'center', a: 0.85 * ap });
    }
  });
}

/* ——— la craie d'ici : les griffures (sur l'écran, sur le poteau), la plume, les pièges ——— */
H.draw.push(S => {
  const C = Chalk, t = Wd.t;
  for (let i = V.length - 1; i >= 0; i--) if (t - V[i].t0 > V[i].life) V.splice(i, 1);
  V.forEach(f => {
    const u = (t - f.t0) / f.life, a = (1 - sm((u - 0.7) / 0.3)) * Wd.a, draw = c01((t - f.t0) / 0.15);
    if (f.k === 'griffe') {
      // trois entailles : chacune deux traits serrés qui s'ouvrent au milieu
      for (let j = -1; j <= 1; j++) { const cs = Math.cos(f.rot), sn = Math.sin(f.rot), ox = j * f.r * 0.32, P = (sd) => { const Q = []; for (let q = 0; q <= 6; q++) { const v = q / 6 - 0.5, gap = Math.sin((v + 0.5) * Math.PI) * f.r * 0.05 * sd; const lx = ox + gap + v * f.r * 0.25, ly = v * f.r * 1.5; Q.push([f.x + lx * cs - ly * sn, f.y + lx * sn + ly * cs]); } return Q; };
        C.stroke(P(1), draw, { w: 2.2, a: 0.85 * a, seed: f.seed + j, tip: false }); C.stroke(P(-1), draw, { w: 1.4, a: 0.7 * a, seed: f.seed + j + 5, tip: false }); }
    } else if (f.k === 'poteau') { for (let j = 0; j < 3; j++) { const x = f.x + (j - 1) * f.w; C.line(x, f.y0, x + 1, f.y1, 1, { w: 1.2, a: 0.6 * a, seed: f.seed + j, tip: false, amp: 0.4 }); } }
  });
  drawTraps(); drawLumps(); drawTongues(); drawBodies(); drawPlume(); drawPattesLettres();
});
// les petites pattes des lettres qui rentrent chez elles : deux traits qui marchent, un pied rond au bout
function drawPattesLettres() {
  const Ls = LETTERS(); if (!Ls || !Ls.some(L => L.st === 'marche')) return; const r = RECT();
  Ls.forEach(L => { if (L.st !== 'marche' || L.a < 0.3) return; const w = L.x1 - L.x0, h = L.y1 - L.y0, x = lx(L, r), y = ly(L, r) + h / 2, k = Math.max(8, h * 0.34), g = sm(Math.min(1, (Wd.t - L.t) / 0.3));
    [-1, 1].forEach(sd => { const ph = L.pas + (sd > 0 ? Math.PI : 0), bx = x + sd * Math.min(w * 0.25, k * 0.6), fx = bx + Math.sin(ph) * k * 0.45 * (L.face || 1), fy = y + k * g - Math.max(0, Math.cos(ph)) * k * 0.3;
      Chalk.line(bx, y - 1, fx, fy, 1, { w: 2.8, a: 0.95 * L.a, seed: 70 + sd, tip: false, amp: 0.3 });
      Chalk.line(fx, fy, fx + (L.face || 1) * k * 0.3, fy, 1, { w: 3, a: 0.95 * L.a, seed: 72 + sd, tip: false, amp: 0.2 }); }); });
}

return { ptr, plume, V, tombe, TL, puffs, tumble, LETTERS, RECT, lx, ly, rel, setRel, monteTitre, PORTEE };
})();
