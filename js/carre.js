/* (vague 210 de l'audit, originalité des chats) : le carré de craie. Un carré se trace tout seul sur le plancher, et un chat ne résiste pas :
   il y va, s'y installe en pain (« à moi »). Un deuxième arrive et veut tenir dedans aussi (« pousse-toi », « hé ! ») : il pousse le premier,
   et le carré, au lieu de rester un carré, s'étire comme un élastique autour d'eux, ses côtés se bombent et tremblent (« nnngh »)…
   jusqu'à ce que le trait cède (TCHAK) : ses deux bouts se recroquevillent, les deux chats regardent le carré cassé, vexés, et s'en vont
   chacun de leur côté. Puis le carré se rembobine vers son milieu (jamais de fondu). ?carre le lance tout de suite. */
window.Carre = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sc, sOf, say, floorAt, free4, interrupt, pose, go, fn, inView, c01, sm, lerp } = K;
const word = (text, x, y, size, rot) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.2, rot: rot ?? rnd(-0.2, 0.2), size: size || 18 });
const force = /[?&]carre(=|&|$)/.test(location.search);
let Q = null, prochain = force ? 1 : rnd(35, 55);
const vu = c => c.x > Wd.W * 0.06 && c.x < Wd.W * 0.94;
const libres = () => Wd.cats.filter(c => !c.temp && !c.rare && free4(c) && vu(c) && !c.carre);
const proche = (L, x) => L.sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
// dedans : une petite chute (le plancher qui bouge d'un pixel) ne compte pas ; porté, perché, ou parti faire autre chose, si
const tient = (c, dedans, t0) => {
  if (!c || c.carre !== Q || c.held) return false; if (!dedans) return Wd.t - t0 < 10;
  if (c.perch) return false; if (c.fall || c.jump) { c.chuteT = c.chuteT ?? Wd.t; return Wd.t - c.chuteT < 1.5; } c.chuteT = null;
  return (c.task && c.task.k === 'pose') || c.q.some(q => q.k === 'pose');
};

function nouveau() {
  const L = libres(); if (L.length < 2) return false;
  // la place la plus dégagée : loin des meubles et des objets posés à la même profondeur
  let d0 = 0, x0 = 0, best = -1;
  for (let n = 0; n < 30; n++) { const d = lerp(0.12, 0.34, Math.random()), x = inView(Wd.W * rnd(0.22, 0.78));
    const m = Wd.props.reduce((m, p) => p.run || p.r || Math.abs(p.d - d) > 0.2 ? m : Math.min(m, Math.abs(p.x - x)), 1e4) - Math.abs(x - Wd.W / 2) * 0.15;
    if (m > best) { best = m; d0 = d; x0 = x; } }
  if (best < sOf(d0) * 0.9 && !force) return false;
  Q = { x0, d0, t0: Wd.t, seed: Math.floor(rnd(0, 900)), hw: sOf(d0) * 0.8, dd: 0.13, bR: 0, vR: 0, bL: 0, vL: 0, A: null, B: null, inA: 0, inB: 0, casse: 0, fin: 0 };
  return true;
}
function entre(c, role) {
  interrupt(c); c.carre = Q; c.busyAct = true; const dx = role === 'A' ? -Q.hw * 0.1 : Q.hw * 0.62;
  c.q.push(go(Q.x0 + dx, { d: Q.d0, face: role === 'A' ? (c.x < Q.x0 ? 1 : -1) : -1 }),
    fn(c => { if (c.carre === Q && Math.abs(c.d - Q.d0) > 0.04) c.q.unshift(K.hop(() => K.groundAt(Q.x0 + dx, Q.d0), { h: sc(c) * 0.3 })); }),
    fn(c => { if (c.carre !== Q) return; if (role === 'A') { Q.inA = Wd.t; say(c, pick(['à moi', 'mon carré', '♥'])); }
      else { Q.inB = Wd.t; Q.xA = Q.A.x; Q.xB = c.x; say(c, pick(['pousse-toi', 'j\'y tiens aussi', 'serre-toi'])); if (Q.A) setTimeout(() => Q && Q.A && say(Q.A, pick(['hé !', 'c\'est à moi !', 'pfff'])), 500); } }),
    ...(role === 'A' ? [pose('petrit', 1.4)] : []), pose('pain', 40));
  Q[role] = c; Q['t' + role] = Wd.t;
}
function sortie(c, sens) {
  if (!c || c.carre !== Q) return; c.carre = null; if (c.held || c.fall || c.jump) return;
  interrupt(c); c.q.push(pose('assis', 1.3, { fx: c => say(c, pick(['…', 'cassé.', 'bon.'])) }), go(inView(c.x + sens * Wd.W * rnd(0.18, 0.3)), { face: sens }), pose('toilette', rnd(2, 3)));
}
function annule() { if (!Q || Q.fin) return; [Q.A, Q.B].forEach(c => { if (c && c.carre === Q) { c.carre = null; c.busyAct = false; } }); Q.fin = Wd.t; }

H.pre.push(dt => {
  if (Wd.a < 0.5) return;
  if (!Q) { prochain -= dt; if (prochain <= 0) prochain = nouveau() ? rnd(45, 70) : 6; return; }
  const t = Wd.t - Q.t0;
  if (Q.fin) { if (Wd.t - Q.fin > 1.3) { [Q.A, Q.B].forEach(c => c && c.carre === Q && (c.carre = null)); Q = null; } return; }
  if (t > 55) return annule();
  if (!Q.A && t > 0.9) { const c = proche(libres(), Q.x0); if (c) entre(c, 'A'); else if (t > 20) return annule(); }
  if (Q.A && !tient(Q.A, Q.inA, Q.tA) && !Q.casse) { if (Q.inA) { if (Q.B) sortie(Q.B, 1); return annule(); } Q.A.carre = null; Q.A.busyAct = false; Q.A = null; }
  if (Q.inA && !Q.B && Wd.t - Q.inA > 3.2) { const c = proche(libres(), Q.x0); if (c) entre(c, 'B'); else if (Wd.t - Q.inA > 25) { sortie(Q.A, -1); Q.casse = -1; Q.fin = Wd.t + 1; } }
  if (Q.B && !tient(Q.B, Q.inB, Q.tB) && !Q.casse) { if (Q.inB) { sortie(Q.A, -1); return annule(); } Q.B.carre = null; Q.B.busyAct = false; Q.B = null; }
  // les côtés : des ressorts ; poussés par les deux chats serrés dedans
  let cR = 0, cL = 0;
  if (Q.inB && !Q.casse) {
    const u = Wd.t - Q.inB, pousse = sm(c01(u / 1.2));
    Q.A.x = Q.xA - Q.hw * 0.45 * pousse + Math.sin(u * 9) * 1.2 * pousse;
    Q.B.x = Q.xB - Q.hw * 0.12 * pousse + Math.sin(u * 8 + 1) * 1.5 * pousse;
    cR = Q.hw * (0.45 + 0.25 * c01((u - 1.2) / 2.8)) * pousse; cL = Q.hw * (0.38 + 0.2 * c01((u - 1.2) / 2.8)) * pousse;
    if (u > 1.4 && !Q.nn) { Q.nn = 1; word('nnngh', Q.x0, floorAt(Q.d0) - sOf(Q.d0) * 1.3, 18); }
    if (u > 2.8 && Q.nn === 1) { Q.nn = 2; word('ça tire…', Q.x0 + Q.hw, floorAt(Q.d0) - sOf(Q.d0) * 1.1, 15, 0.15); }
    if (u > 4.3) {
      Q.casse = Wd.t; Wd.shake = { t0: Wd.t, a: 4 };
      word('TCHAK', Q.x0 + Q.hw * 1.3, floorAt(Q.d0) - sOf(Q.d0) * 0.7, 30, -0.15);
      [Q.A, Q.B].forEach(c => { c.carre = Q; interrupt(c); c.busyAct = true; c.q.push(pose('sursaut', 0.6, { fx: c => say(c, '!') }), pose('assis', 2.2)); });
    }
  }
  if (Q.casse > 0) {
    const u = Wd.t - Q.casse;
    if (u > 2.9 && !Q.parti) { Q.parti = 1; sortie(Q.A, -1); sortie(Q.B, 1); }
    if (u > 4.6) Q.fin = Wd.t;
  }
  const k = 60, amo = 7;
  Q.vR += ((Q.casse ? 0 : cR) - Q.bR) * k * dt - Q.vR * amo * dt; Q.bR += Q.vR * dt;
  Q.vL += ((Q.casse ? 0 : cL) - Q.bL) * k * dt - Q.vL * amo * dt; Q.bL += Q.vL * dt;
});

// le dessin : un parallélogramme à plat sur le plancher, chaque côté une ligne de craie souple
H.draw.push(() => {
  if (!Q || !window.Chalk || Wd.a < 0.3) return;
  const t = Wd.t - Q.t0, tr = c01(t / 1.1), rb = Q.fin ? 1 - sm(c01((Wd.t - Q.fin) / 1.2)) : 1; if (rb < 0.02) return;
  const yF = floorAt(Q.d0 - Q.dd), yB = floorAt(Q.d0 + Q.dd), yM = floorAt(Q.d0), kB = sOf(Q.d0 + Q.dd) / sOf(Q.d0 - Q.dd);
  const pt = (sx, sy) => { const hw = Q.hw * (sy > 0 ? kB : 1); return [Q.x0 + sx * hw * rb, yM + ((sy > 0 ? yB : yF) - yM) * rb]; };
  const a = 0.95 * Wd.a, w = Math.max(2.6, sOf(Q.d0) * 0.03), N = 10, occ = [Q.A, Q.B].filter(c => c && c.carre === Q && Q.inA);
  const cote = (p0, p1, bomb, sens, cut) => { const P = []; for (let j = 0; j <= N; j++) { const u = j / N, b = Math.sin(u * Math.PI) * bomb * rb; P.push([lerp(p0[0], p1[0], u) + sens * b, lerp(p0[1], p1[1], u) + Math.sin(u * Math.PI * 2) * b * 0.06]); } return P; };
  const FL = pt(-1, -1), FR = pt(1, -1), BR = pt(1, 1), BL = pt(-1, 1), ce = Q.casse > 0 ? Wd.t - Q.casse : -1;
  // l'ordre du tracé : devant, droite, fond, gauche (une seule ligne qui fait le tour)
  const seg = [[FL, FR, 0, 1], [FR, BR, Q.bR, 1], [BR, BL, 0, 1], [BL, FL, Q.bL, -1]];
  seg.forEach((s, i) => {
    const p = c01(tr * 4 - i); if (p <= 0) return; let P = cote(s[0], s[1], s[2], s[3]);
    if (i === 1 && ce >= 0) {
      // le côté droit a cédé : deux bouts qui se recroquevillent vers leurs coins
      const r = sm(c01(ce / 0.5)), m = N / 2; [P.slice(0, m + 1), P.slice(m).reverse()].forEach((H2, h) => { const L = H2.length, Z = [];
        for (let j = 0; j < L; j++) { const u = j / (L - 1), v = u * u * r; const o = H2[0], q = H2[j], an = (h ? -1 : 1) * v * 2.4;
          Z.push([o[0] + ((q[0] - o[0]) * Math.cos(an) - (q[1] - o[1]) * Math.sin(an)) * (1 - 0.45 * r * u), o[1] + ((q[0] - o[0]) * Math.sin(an) + (q[1] - o[1]) * Math.cos(an)) * (1 - 0.45 * r * u)]); }
        Chalk.stroke(Z, 1, { w, a, seed: Q.seed + 7 + h, tip: false, amp: 0.4 }); });
      return;
    }
    if (i === 2 && occ.length) {
      // le côté du fond passe derrière les chats : on le coupe là où ils sont
      let cur = []; const out = []; P.forEach(q => { if (occ.some(c => Math.abs(q[0] - c.x) < sc(c) * 0.26)) { if (cur.length > 1) out.push(cur); cur = []; } else cur.push(q); }); if (cur.length > 1) out.push(cur);
      out.forEach((Z, h) => Chalk.stroke(Z, 1, { w: w * 0.85, a, seed: Q.seed + 3 + h, tip: false, amp: 0.4 })); return;
    }
    Chalk.stroke(P, p, { w: i === 0 ? w * 1.1 : w * 0.9, a, seed: Q.seed + i, tip: p < 1, amp: 0.4 });
  });
});

return { lance: () => !Q && nouveau(), etat: () => Q };
})();
