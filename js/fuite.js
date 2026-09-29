/* Le passage au mode sérieux (28/09, Mathieu : « fais plutôt un bouton "mode sérieux" : au clic on vire les chats, qui s'en vont effrayés,
   les objets disparaissent dans des trous, tout se clean, on passe en mode page au scroll »).
   Ce fichier est du côté du mode chat : il fait place nette, puis passe la main au mode sérieux (js/serieux.js : Serieux.ouvre / ferme).
   - (29/09) La sortie est maintenant le festival de peinture (js/peinture.js) : les chats peignent tout en bleu, poussent les objets
     hors de l'écran et s'en vont ; quand tout est bleu et vide, le mode sérieux s'ouvre par-dessus, sans cercle.
   - Au retour (Serieux.ferme) : les trous se rouvrent et recrachent chaque objet à sa place (« pop ! »), et les chats reviennent peu à peu. */
window.Fuite = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, clamp, sgn, sm, sOf, floorAt, say, interrupt, go, fn, later, grav, sc } = K;
const en = () => !!(window.I18N && I18N.lang && I18N.lang !== 'fr');
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });

let F = null;         // la sortie en cours : { t0, trous, o (d'où s'ouvre le mode sérieux), ouvert }
let avales = [];      // les objets partis dans les trous (ils reviendront)
const trous = [];     // { x, y, r, t0, ouvre, ferme, fin } : un trou dans le sol (dessiné au trait)

function go0(btn) {
  if (F || !window.Serieux) return false;
  const r = btn && btn.getBoundingClientRect(), o = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
  F = { t0: Wd.t, o, scen: Wd.nextScen }; Wd.fuite = true; Wd.nextIn = Wd.nextScen = Infinity;
  // (29/09, 07:35, Mathieu : « c'est nos chats qui peignent, avec un rouleau, pas du papier peint ; un festival de peinture ») : js/peinture.js
  // (les chats peignent tout en bleu, d'autres poussent les objets hors de l'écran, tout le monde s'en va) ; puis le mode sérieux, sans cercle
  const moi = F;
  const ok = window.Peinture && Peinture.go(o, {
    sorti: it => { if (!avales.includes(it)) avales.push(it); },
    fini: () => { if (F !== moi || F.ouvert) return; F.ouvert = true; const p = Serieux.ouvre({ x: o.x, y: o.y, instant: true, papier: true }); if (p && p.then) p.then(() => {}, () => {}); setTimeout(() => Peinture.range(), 700); }
  });
  if (!ok) { F.ouvert = true; Serieux.ouvre({ x: o.x, y: o.y }); }
  return true;
}
// un trou s'ouvre sous l'objet ; il tremble, bascule, tombe dedans en rapetissant ; le trou se referme
function avale(it) {
  if (!Wd.props.includes(it) || it.gone) return;
  Wd.cats.forEach(c => { if (c.perch && c.perch.it === it) interrupt(c); });
  const s = sOf(it.d) * (it.big || 1), x = it.fx * Wd.W, y = floorAt(it.d), R = clamp(s * (K.LOURD[it.kind] ? 0.75 : 0.45), Wd.s0 * 0.18, Wd.s0 * 1.2);
  trou(x, y, R, 0.15, 0.7);
  Object.assign(it, { on: null, dans: null, fall: false, held: false, run: null, vx: 0, vy: 0, suck: null });
  it.trou = { t0: Wd.t, rapide: true, lift: it.lift, big: it.big || 1, tilt: it.tilt || 0, sens: Math.random() < 0.5 ? -1 : 1 };
}
function trou(x, y, r, ouvre, ferme) { trous.push({ x, y, r, t0: Wd.t, ouvre, ferme, fin: Wd.t + ouvre + ferme + 0.45 }); }

// la fuite : chacun file vers son bord ; perché (sur le titre, un bouton, un meuble), il saute d'abord ; si autre chose lui donne
// une autre idée en chemin (le tuto, un jeu), il repart aussitôt
function fuit(c) {
  if (c.gone || c.held || c.fall || !Wd.cats.includes(c)) return; const s = sc(c);
  if (c.y < floorAt(c.d) - 4 && !(c.task && c.task.fuite)) { interrupt(c); c.fall = true; c.vy = 0; c.vx = c.fuit * 60; return; }
  if (c.task && c.task.fuite || c.q.some(T => T.fuite)) return;
  interrupt(c); const T = go(c.fuit < 0 ? -s * 2.2 : Wd.W + s * 2.2, { g: 'galop', v: 1.7 }); T.fuite = true; c.q = [T, fn(c => { c.gone = true; })];
}
// chaque image : les chats qui fuient ; les objets qui tombent dans leur trou (ou en ressortent, au retour)
H.pre.push(() => {
  if (F) Wd.cats.forEach(c => { if (c.fuit) fuit(c); });
  Wd.props.forEach(it => {
    const T = it.trou; if (!T) return; const u = Wd.t - T.t0, s = sOf(it.d);
    if (!T.retour) {
      const tr = T.rapide ? 0.12 : 0.3; if (u < tr) { it.tilt = T.tilt + Math.sin(u * 60) * 0.06; return; }   // (il tremble au bord)
      const e = sm((u - tr) / (T.rapide ? 0.32 : 0.55));
      it.lift = T.lift * (1 - e) - e * s * 0.25; it.big = T.big * (1 - e * 0.96); it.tilt = T.tilt + T.sens * e * 1.6;
      if (e >= 1) { it.trou = null; it.fade = it.fadeT = 0; it.ventre = true; it.big = T.big; avales.push(it); word(pick(['gloup', 'ploc', 'bloup']), it.fx * Wd.W, floorAt(it.d) - s * 0.2, 17); }
    } else {
      // au retour : il jaillit du trou, retombe à sa place
      // (29/09, vague 5) il jaillit bien plus haut, en faisant un tour complet sur lui-même, et retombe à sa place (il rebondit)
      const e = sm(u / 0.75);
      if (u < 0.12) return;
      it.fade = it.fadeT = 1; it.big = T.big * Math.max(0.05, Math.min(1, e * 1.6)); it.tilt = T.sens * (1 - e) * Math.PI * 2;
      if (e >= 1) { it.trou = null; it.big = T.big; it.tilt = 0; it.fall = true; it.lift = Math.max(it.lift, s * 0.6); it.vy = 0; it.away = Wd.t; }
      else it.lift = Math.sin(e * Math.PI) * s * (K.LOURD[it.kind] ? 1.3 : 2.2);
    }
  });
  for (let i = trous.length - 1; i >= 0; i--) if (Wd.t > trous[i].fin) trous.splice(i, 1);
});
// les fissures (au retour) : un trait en zigzag qui court dans le sol d'un trou au suivant, puis se referme derrière lui
const fentes = [];
function fente(x0, y0, x1, y1, dur) { const P = [], n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 26)); for (let i = 0; i <= n; i++) { const u = i / n, j = i && i < n ? rnd(-1, 1) * 9 : 0; P.push([x0 + (x1 - x0) * u + j * 0.4, y0 + (y1 - y0) * u + j]); } fentes.push({ P, t0: Wd.t, dur, fin: Wd.t + dur + 0.9 }); }
H.draw.push(() => {
  if (!fentes.length) return; const C = window.Chalk; if (!C) return;
  for (let i = fentes.length - 1; i >= 0; i--) { const f = fentes[i], u = Wd.t - f.t0; if (Wd.t > f.fin) { fentes.splice(i, 1); continue; }
    const pr = Math.min(1, u / f.dur), q = Math.max(0, (u - f.dur - 0.3) / 0.6), k = Math.floor(q * (f.P.length - 1)), P = f.P.slice(k);
    if (P.length > 1) C.stroke(P, q > 0 ? 1 : pr, { w: 1.8, a: 0.85 * Wd.a, seed: 90 + i, tip: false, amp: 0.4 }); }
});
// les trous : au trait, comme le reste (un bord, et des cercles de plus en plus petits vers le fond)
H.draw.push(S => {
  if (!trous.length) return; const C = window.Chalk; if (!C) return;
  trous.forEach((T, k) => {
    const u = Wd.t - T.t0, o = sm(u / T.ouvre), f = 1 - sm((u - T.ouvre - T.ferme) / 0.45), g = Math.min(o, f); if (g <= 0.01) return;
    const r = T.r * g, ry = r * 0.28;
    [1, 0.72, 0.46, 0.24].forEach((q, j) => { const P = []; for (let a = 0; a <= 24; a++) { const t = a / 24 * Math.PI * 2; P.push([T.x + Math.cos(t) * r * q, T.y + Math.sin(t) * ry * q + (1 - q) * ry * 0.5]); }
      C.stroke(P, 1, { w: j ? 1.2 : 2, a: (j ? 0.55 - j * 0.1 : 0.9) * Wd.a, seed: 70 + k * 5 + j, tip: false, amp: 0.5 }); });
  });
});

// le retour du mode sérieux : les trous recrachent les objets, les chats reviennent
function retour() {
  if (!F || !F.ouvert) return; Wd.nextScen = Wd.t + rnd(20, 30); const o = F.o; F = null; Wd.fuite = false;
  // (29/09, vague 5) les trous s'ouvrent en vague, depuis le bouton : une fissure court dans le sol d'un trou au suivant
  const L = avales.slice(); avales = [];
  const ox = o ? o.x : Wd.W / 2, oy = floorAt(0.5), pos = it => { const h = it.home && !it.home.on ? it.home : it; return [h.fx * Wd.W, floorAt(h.d)]; };
  L.sort((a, b) => Math.abs(pos(a)[0] - ox) - Math.abs(pos(b)[0] - ox));
  let prevG = [ox, oy], prevD = [ox, oy];
  L.forEach((it, i) => { const p = pos(it), pr = p[0] < ox ? prevG : prevD; later(0.3 + i * 0.12 - 0.22, () => fente(pr[0], pr[1], p[0], p[1], 0.22)); if (p[0] < ox) prevG = p; else prevD = p; });
  if (L.length) later(0.1, () => { Wd.shake = { t0: Wd.t, a: 3 }; word(en() ? 'crrrack!' : 'crrrac !', ox, oy - 30, 22); });
  L.forEach((it, i) => later(0.3 + i * 0.12, () => {
    if (!Wd.props.includes(it)) return; it.ventre = false;
    if (it.home && !it.home.on) { it.fx = it.home.fx; it.d = it.home.d; it.dT = it.home.d; }
    it.tilt = 0; it.vx = it.vy = 0; it.fall = false;
    const s = sOf(it.d); trou(it.fx * Wd.W, floorAt(it.d), clamp(s * 0.5, Wd.s0 * 0.18, Wd.s0 * 1.2), 0.15, 0.6);
    it.lift = 0; it.big = it.big || 1; it.trou = { t0: Wd.t, retour: true, big: it.big, sens: Math.random() < 0.5 ? -1 : 1 }; it.big *= 0.05;
    later(0.25, () => word(pick(['pop !', 'plop', 'tadaa']), it.fx * Wd.W, floorAt(it.d) - s * 0.8, 18));
  }));
  // (29/09, l'audit : au retour, la pièce restait vide de chats) : deux chats jaillissent des derniers trous avec les objets, en criant,
  // deux autres rentrent en courant par les côtés
  const n = L.length, tr = [...new Set([L[n - 1], L[n - 2], L[Math.max(0, n - 4)], L[Math.floor(n / 2)]])].filter(Boolean).slice(0, 4);
  tr.forEach((it, i) => later(0.55 + (n - 1) * 0.12 + i * 0.3, () => { if (K.residents().length >= K.MAXC) return; const d = it.d ?? 0.3, c = K.addCat({ x: it.fx * Wd.W, d }), s = sc(c);
    c.y = floorAt(d) - s * 0.3; c.fall = true; c.vy = -s * rnd(5.5, 7); c.vx = s * rnd(1, 2.4) * (i % 2 ? -1 : 1); c.face = sgn(c.vx) || 1; later(0.2, () => say(c, pick(en() ? ['woohoo!', 'I’m back!', 'hi!', 'hop!'] : ['youhou !', 'me revoilà !', 'coucou !', 'hop !']))); }));
  [0, 1].forEach(i => later(1.4 + n * 0.12 + i * 0.7, () => { if (K.residents().length < K.MAXC) { const c = K.enter(); c.q.unshift(go(c.x + (c.x < Wd.W / 2 ? 1 : -1) * sc(c) * 3, { g: 'galop', v: 1.5 })); } }));
  Wd.nextIn = Wd.t + 6 + n * 0.1;
}
addEventListener('serieux:ferme', retour);
return { go: go0, get actif() { return !!F; } };
})();
