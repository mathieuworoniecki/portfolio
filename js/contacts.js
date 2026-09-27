/* Les contacts (27/09, Mathieu : « traite tout », les cases vides du carnet des interactions).
   Un moteur générique : à chaque image, tout ce qui bouge (les sources) est essayé contre tout ce qu'on peut toucher (les cibles).
   Au moment où une source entre dans une cible, la cible réagit selon la force du contact :
     0 = un frôlement (le pointeur, la plume, une croquette qui tombe, la mouche), 1 = un contact (la main, un chat qui court,
     une souris, un colis), 2 = un choc (ce qui vole vite, l'aspirateur).
   Les chocs déjà écrits ailleurs (js/chocs.js, js/rares.js, js/vie.js) ne sont pas refaits ici : la table ALLOW le dit.
   Et quelques cas à part : le clic qui renvoie l'aspirateur, le résident qui renifle la bosse, le concert, la mouche dans la bagarre. */
window.Contacts = (() => {
if (!window.Chats || !Chats.K || !window.Vie || !window.Chocs) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, dust, interrupt, pose, kick, later, LOURD } = K;
const Vi = window.Vie, Ch = window.Chocs, Ra = window.Rares;
// (pas plus d'un mot toutes les 80 ms : une pluie de croquettes ne couvre pas l'écran d'onomatopées)
let motT = -9;
const word = (text, x, y, size) => { if (Wd.t - motT < 0.08) return; motT = Wd.t; Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 }); };
const LEGER = k => !LOURD[k.kind] && k.kind !== 'distrib' && !k.mur && !k.pivot;
const recent = (a, key, dt) => Wd.t - (a[key] ?? -9) < dt;

/* ——— la main : on la suit nous-mêmes (appuyée, elle glisse sur le décor) ——— */
const main = { x: 0, y: 0, on: false, t: -9 };
addEventListener('pointerdown', e => { main.on = true; main.x = e.clientX; main.y = e.clientY; main.t = Wd.t; }, true);
addEventListener('pointermove', e => { if (!main.on) return; main.x = e.clientX; main.y = e.clientY; main.t = Wd.t; }, true);
['pointerup', 'pointercancel'].forEach(k => addEventListener(k, () => { main.on = false; }, true));

/* ——— qui peut toucher quoi (les autres paires sont déjà traitées ailleurs, ou n'ont pas de sens) ——— */
const S = s => new Set(s.split(' '));
const ALLOW = {
  ptr: S('cache rare souris lettre lettreSol kib mouche vac lance'),
  plume: S('cache porte rare souris lettre lettreSol kib mouche vac lance'),
  main: S('souris kib mouche vac'),
  vol: S('plume mouche vac porte lettreSol kib'),
  objet: S('plume mouche vac cache'),
  coureur: S('porte vol rare plume perche cache souris lettreSol'),
  porte: S('perche cache vol rare prop lance souris lettreSol kib plume vac'),
  rare: S('cache porte vol perche prop lance lettre lettreSol bouton plume mouche vac kib souris'),
  souris: S('perche cache porte vol rare prop lance lettreSol kib vac'),
  colis: S('cache vol prop lance souris lettre lettreSol bouton kib'),
  kib: S('cache prop lance lettre lettreSol mouche souris'),
  lettre: S('cache porte vol prop lance souris bouton kib mouche vac'),
  vac: S('porte prop plume mouche'),
  mouche: S('cache souris prop lance lettreSol kib plume vac'),
  piege: S('cache vol souris kib'),
};

/* ——— les sources : ce qui bouge, cette image ——— */
const prev = new WeakMap();
function vitesse(ref, x, y, dt) { const p = prev.get(ref); prev.set(ref, [x, y]); return p ? [(x - p[0]) / dt, (y - p[1]) / dt] : [0, 0]; }
function sources(dt) {
  const L = [], add = (k, ref, x, y, m, f, d, who) => { const [vx, vy] = vitesse(ref, x, y, dt); L.push({ k, ref, x, y, vx, vy, m, f: typeof f === 'function' ? f(Math.hypot(vx, vy)) : f, d, who }); };
  const P = Vi.ptr;
  if (Vi.ptr.plume > Wd.t) add('plume', Vi.plume, Vi.plume.x, Vi.plume.y, 10, 0);
  else if (P.on && Wd.t - P.moved < 0.2) add('ptr', P, P.x, P.y, 6, 0);
  if (main.on && Wd.t - main.t < 0.25) add('main', main, main.x, main.y, 12, 1);
  for (const c of Wd.cats) {
    if (c.gone || c.hidden || !c.hp) continue; const s = sc(c);
    if (c.rare) { const z = Ra && Ra.zone ? Ra.zone(c) : null; if (!z) continue;
      if (c.rare === 'interminable') add('rare', c, c.hp[0], c.hp[1], s * 0.45, v => v > s * 2 ? 2 : 1, c.d, c);
      else add('rare', c, z.x, z.y, Math.min(z.rx, z.ry) * 0.8, v => v > s * 2.5 ? 2 : 1, c.d, c);
      continue; }
    if (c.held) { const b = Chat.where(c, c.body); add('porte', c, b[0], b[1], s * 0.35, v => v > s * 3 ? 2 : 1, c.d, c); continue; }
    if (c.fall) { add('vol', c, c.x, c.y - s * 0.35, s * 0.3, v => v > s * 3 ? 2 : 1, c.d, c); continue; }
    if (!c.perch && !c.jump && c.task && c.task.k === 'walk' && c.task.g === 'galop') add('coureur', c, c.x + c.face * s * 0.25, c.y - s * 0.3, s * 0.3, 1, c.d, c);
  }
  for (const it of Wd.props) {
    if (it.held || it.suck || it.a < 0.5) continue; const s = sOf(it.d);
    if (it.run) { add('souris', it, it.x, it.y - (it.lift || 0) - s * 0.1, s * 0.2, 1, it.d); continue; }
    if (it.trap && it.fall) { add('piege', it, it.x, it.y - it.hull.h * it.s * 0.5, it.hull.w * it.s * 0.4, 1, it.d); continue; }
    if (it.trap && it.trap.task && it.trap.task.k === 'piege') { add('piege', it, it.x, it.y - it.hull.h * it.s * 0.5, it.hull.w * it.s * 0.4, 1, it.d); continue; }
    if (it.para) { add('colis', it, it.x, it.y - (it.lift || 0), it.hull.w * it.s * 0.4, 1, it.d); continue; }
    if (it.fall) add('objet', it, it.x, it.y - it.hull.h * it.s * 0.5, it.hull.w * it.s * 0.35, v => v > s * 1.2 ? 2 : 1, it.d);
  }
  for (const k of Wd.kib) if (!k.rest && !k.suck && !k.who && k.vy > 0) add('kib', k, k.x, k.y, 3, 0, k.d);
  const Ls = Vi.LETTERS && Vi.LETTERS();
  if (Ls) { const r = Vi.RECT(); Ls.forEach(Lt => { if (Lt.st !== 'fall' || Lt.a < 0.5) return; add('lettre', Lt, Vi.lx(Lt, r), Vi.ly(Lt, r), (Lt.x1 - Lt.x0) * 0.4, Math.abs(Lt.vy) > 200 || Math.abs(Lt.vx) > 200 ? 2 : 1); }); }
  const V = Wd.vac; if (V && V.ph === 'balaye') add('vac', V, V.x, V.y, Wd.s0 * 0.6, 2);
  const m = Wd.mouche; if (m && !m.nose && !m.pos && !m.sur) add('mouche', m, m.x, m.y, 4, 0);
  return L;
}

/* ——— les cibles : ce qu'on peut toucher, et comment on le touche ——— */
const boite = (it, m) => { const x0 = it.x - it.hull.w * it.s * 0.5, x1 = it.x + it.hull.w * it.s * 0.5, y1 = it.y - (it.lift || 0), y0 = y1 - it.hull.h * it.s; return (x, y) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m; };
const rond = (cx, cy, r) => (x, y, m) => Math.hypot(x - cx, y - cy) < r + m;
function cibles() {
  const T = [], add = (k, ref, hit, d, x, y) => T.push({ k, ref, hit, d, x, y });
  const Ls = Vi.LETTERS && Vi.LETTERS();
  if (Ls) { const r = Vi.RECT(); Ls.forEach(L => { if (L.a < 0.5 || (L.st && L.st !== 'sol')) return; const w = (L.x1 - L.x0) / 2, h = (L.y1 - L.y0) / 2, a = L.st ? L.rot : 0;
    const ww = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a)), hh = Math.abs(h * Math.cos(a)) + Math.abs(w * Math.sin(a)), cx = Vi.lx(L, r), cy = Vi.ly(L, r);
    add(L.st ? 'lettreSol' : 'lettre', L, (x, y, m) => Math.abs(x - cx) < ww + m && Math.abs(y - cy) < hh + m, null, cx, cy); }); }
  const m = Wd.mouche; if (m) add('mouche', m, rond(m.x, m.y, 14), null, m.x, m.y);
  if (Vi.ptr.plume > Wd.t) add('plume', Vi.plume, rond(Vi.plume.x, Vi.plume.y, 14), null, Vi.plume.x, Vi.plume.y);
  const V = Wd.vac; if (V && V.ph !== 'remonte') { const s0 = Wd.s0; add('vac', V, (x, y, mm) => Math.abs(x - V.x) < s0 * 0.45 + mm && y > V.y - s0 * 0.9 - mm && y < V.y + s0 * 0.15 + mm, null, V.x, V.y); }
  ['#enter', '#stay'].forEach(q => { const el = document.querySelector(q); if (!el || el.disabled || !el.getClientRects().length) return; const b = el.getBoundingClientRect();
    add('bouton', el, (x, y, mm) => x > b.left - mm && x < b.right + mm && y > b.top - mm && y < b.bottom + mm, null, (b.left + b.right) / 2, b.top); });
  for (const it of Wd.props) {
    if (it.held || it.suck || it.a < 0.5) continue; const s = sOf(it.d);
    if (it.run) { const y = it.y - (it.lift || 0) - s * 0.1; add('souris', it, (x, yy, mm) => Math.abs(x - it.x) < s * 0.3 + mm && Math.abs(yy - y) < s * 0.25 + mm, it.d, it.x, y); continue; }
    if (it.lump || it.trap) { add('cache', it, (x, y, mm) => boite(it, mm)(x, y), it.d, it.x, it.y - it.hull.h * it.s); continue; }
    if (it.para || it.fall) continue;
    add(it.launched ? 'lance' : 'prop', it, (x, y, mm) => boite(it, mm)(x, y), it.d, it.x, it.y - it.hull.h * it.s);
  }
  // la bagarre : un nuage au sol
  [...new Set(Wd.cats.filter(c => c.fight).map(c => c.fight))].forEach(f => { const c = f.L[0], s = sc(c), y = K.floorAt(c.d) - s * 0.35; add('cache', f, rond(f.x, y, s * 0.8), c.d, f.x, y); });
  for (const c of Wd.cats) {
    if (c.gone || c.hidden || !c.hp) continue; const s = sc(c);
    if (c.rare) { if (!Ra || !Ra.zone) continue; const z = Ra.zone(c); add('rare', c, (x, y, mm) => ((x - z.x) / (z.rx + mm)) ** 2 + ((y - z.y) / (z.ry + mm)) ** 2 < 1, c.d, z.x, z.y); continue; }
    if (c.held) { const b = Chat.where(c, c.body); add('porte', c, rond(b[0], b[1], s * 0.4), null, b[0], b[1]); continue; }
    if (c.fall) { add('vol', c, rond(c.x, c.y - s * 0.35, s * 0.4), c.d, c.x, c.y - s * 0.35); continue; }
    if (c.perch) { const z = Ch.corps(c); add('perche', c, (x, y, mm) => ((x - z.x) / (z.rx + mm)) ** 2 + ((y - z.y) / (z.ry + mm)) ** 2 < 1, c.d, z.x, z.y - z.ry); }
  }
  return T;
}

/* ——— les réactions ——— */
const lettreHop = (L, dir, k) => Vi.tumble(L, dir * Wd.s0 * rnd(0.3, 0.6) * k, -Wd.s0 * rnd(0.4, 0.7) * k, dir * rnd(2, 5) * k);
// ce qui vole rebondit sur la cible
function rebond(s, dir) {
  const o = s.ref;
  if (s.k === 'objet' || s.k === 'colis') { const v = sOf(o.d); o.vx = -(o.vx || 0) * 0.4 - dir * v * 0.3; o.vy = Math.abs(o.vy || 0) * 0.3 + v * 0.4; o.tiltV = (o.tiltV || 0) + rnd(-6, 6); }
  else if (s.k === 'vol') { o.vx = -o.vx * 0.4 - dir * sc(o) * 0.4; o.vy = Math.min(o.vy, 0) * 0.3 - sc(o) * 0.8; o.spin = (o.spin || 0) + rnd(-1, 1); }
  else if (s.k === 'lettre') { o.vx = -o.vx * 0.4; o.vy = -Math.abs(o.vy) * 0.4; o.vr = (o.vr || 0) + rnd(-4, 4); }
  else if (s.k === 'kib') { o.vx = -o.vx * 0.5; o.vy = -Math.abs(o.vy) * 0.3; }
}
// la mouche se pose (sur une croquette, une lettre tombée, un carton, la souris qui court…)
function pose_mouche(m, at, ok) { if (m.nose || m.sur || m.bye || Math.random() < 0.5) return false; m.pos = { at, ok: ok || (() => true), end: Wd.t + rnd(1.5, 3.5) }; word('bz', m.x, m.y - 12, 12); return true; }
const chasse_mouche = (m, dir) => { m.pos = null; m.sur = null; if (m.nose) { const c = m.nose; m.nose = null; if (c.hp) say(c, '!'); } m.vx = dir * rnd(600, 900); m.vy = -rnd(400, 700); m.tgt = null; word(pick(['bzz !', 'BZZ', 'bzzz']), m.x, m.y - 14, 14); };
// un chat qui heurte quelque chose le dit (pas trop souvent)
const dit = (c, L, p) => { if (c && c.hp && !c.rare && !recent(c, 'ditT', 1.2) && Math.random() < (p ?? 0.6)) { c.ditT = Wd.t; say(c, pick(L)); } };

const REACT = {
  lettre(t, s, dir) { const L = t.ref;
    if (s.f === 0) { L.wob = Wd.t; L.wobA = 0.35; if (Math.random() < 0.3) word(pick(['tic', 'tip']), t.x, t.y - 18, 13); return; }
    if (s.f === 1 || Vi.TL.jeu) { L.wob = Wd.t; L.wobA = 1.3; word(pick(['toc', 'tac']), t.x, t.y - 20, 16); }
    else { Vi.tumble(L, dir * Wd.s0 * rnd(0.8, 1.6), -Wd.s0 * rnd(0.3, 0.8), dir * rnd(4, 8)); word(pick(['crac', 'clac', 'oups']), t.x, t.y - 20, 17); }
    rebond(s, dir); dit(s.who, ['aïe', 'oups', 'pardon']); },
  lettreSol(t, s, dir) { const L = t.ref;
    if (s.k === 'mouche') { pose_mouche(s.ref, () => [Vi.lx(L, Vi.RECT()), Vi.ly(L, Vi.RECT()) - (L.y1 - L.y0) / 2 - 3], () => L.st === 'sol'); return; }
    if (s.k === 'kib') { rebond(s, dir); if (Math.random() < 0.15) word('tic', t.x, t.y - 14, 12); return; }   // une croquette : elle rebondit dessus
    lettreHop(L, dir, s.f === 0 ? 0.5 : s.f === 1 ? 1 : 1.8); if (s.f) word(pick(['clac', 'tac', 'toc']), t.x, t.y - 16, 15);
    rebond(s, dir); if (s.k === 'coureur' || s.k === 'porte') dit(s.who, ['?', 'hop', 'mrr ?'], 0.4); },
  kib(t, s, dir) {
    if (s.k === 'mouche') { const k = t.ref; pose_mouche(s.ref, () => [k.x, k.y - 4], () => Wd.kib.includes(k) && k.rest && !k.suck && !k.who); return; }
    const s0 = Wd.s0, d = s.d ?? 0.07, n = Ch.eparpille(t.x, d, s.f === 0 ? s0 * 0.07 : s.f === 1 ? s0 * 0.25 : s0 * 0.4, s.f === 0 ? s0 * 0.9 : s.f === 1 ? s0 * 1.6 : s0 * 2.4);
    if (n && Math.random() < 0.5) word(pick(['tic', 'crr', 'pic']), t.x, t.y - 14, 13);
    if (s.k === 'porte' && n) dit(s.who, ['miam ?', '!', 'des croquettes !']); },
  mouche(t, s, dir) { const m = t.ref; if (s.k === 'vac') { word('slurp !', m.x, m.y - 10, 16); Wd.mouche = null; return; } chasse_mouche(m, dir); dit(s.who, ['!', 'bzz ?', 'à moi !'], 0.5); },
  souris(t, s, dir) { const m = t.ref, v = sOf(m.d);
    if (s.k === 'mouche') { pose_mouche(s.ref, () => [m.x, m.y - (m.lift || 0) - v * 0.25], () => Wd.props.includes(m) && !!m.run); return; }
    Ch.bond(m, v * (s.f === 0 ? 0.3 : 0.5)); if (s.f && m.run && !m.run.v0) { m.run.v0 = m.run.v; m.run.v *= 1.25; }
    if (!recent(m, 'couicT', 0.8)) { m.couicT = Wd.t; word(pick(['couic !', 'hiii', 'couic']), m.x, m.y - v * 0.4, 15); }
    if (s.k === 'coureur') dit(s.who, ['miaou !', 'à moi !', 'une souris !']); else dit(s.who, ['!', 'hé !', 'couic ?'], 0.4); },
  plume(t, s, dir) { const P = t.ref, s0 = Wd.s0;
    if (s.k === 'vac') { P.vx += (s.ref.x - P.x) * 2; P.vy -= s0 * 2; word('fshh', P.x, P.y - 14, 13); return; }
    if (s.k === 'mouche') { chasse_mouche(s.ref, sgn(s.ref.x - P.x) || 1); return; }
    P.vx += dir * s0 * (s.f + 1) * 2.5; P.vy -= s0 * (1 + s.f); if (Math.random() < 0.5) word(pick(['frr', 'fshh', 'flap']), P.x, P.y - 12, 13);
    rebond(s, dir); dit(s.who, ['!', 'la plume !', 'à moi !']); },
  vac(t, s, dir) { const V = t.ref, s0 = Wd.s0;
    if (s.k === 'mouche') { word('slurp !', s.ref.x, s.ref.y - 10, 16); Wd.mouche = null; return; }
    if (s.k === 'main') { if (V.ph !== 'remonte') { V.ph = 'remonte'; V.tu = Wd.t; word(pick(['ok ok…', 'bon, bon', 'je m’en vais']), V.x, V.y - s0 * 0.9, 18); } return; }
    if (s.f === 0) { if (!recent(V, 'frolT', 1.5)) { V.frolT = Wd.t; word(pick(['vrr ?', 'hm ?']), V.x, V.y - s0 * 0.9, 14); } return; }
    V.x += dir * s0 * 0.08; word(pick(['BONG', 'tonk', 'clonk']), t.x, t.y - s0 * 0.6, 22); rebond(s, dir);
    if (s.k === 'porte') dit(s.who, ['nooon', 'pas lui !', 'miaaa !'], 1); else dit(s.who, ['aïe', 'mia !'], 0.6); },
  bouton(t, s, dir) { Ch.tremble(t.ref); word(pick(['toc', 'poc', 'bonk']), t.x, t.y - 14, 16);
    // une lettre, un colis : ils glissent sur le côté (sinon ils rebondiraient sur le bouton sans fin)
    const b = t.ref.getBoundingClientRect(), side = sgn(s.x - (b.left + b.right) / 2) || 1;
    if (s.k === 'lettre') { s.ref.vx = side * Wd.s0 * 1.6; s.ref.vy = -Math.abs(s.ref.vy) * 0.3; }
    else if (s.k === 'colis') { s.ref.vx = side * sOf(s.ref.d) * 1.2; } else rebond(s, dir); if (s.k === 'rare') say(s.who, pick(['oups', 'pardon', 'hihi'])); },
  cache(t, s, dir) { const o = t.ref;
    if (o.L) {   // la bagarre
      if (s.k === 'mouche') { const m = s.ref; m.vx = dir * 950; m.vy = -800; m.tgt = null; later(0.1, () => word('ptoui !', o.x, t.y - 30, 17)); return; }
      if (s.f === 0) { if (!recent(o, 'grrT', 1.5)) { o.grrT = Wd.t; word(pick(['grr', 'fsss']), o.x + rnd(-20, 20), t.y - 30, 15); } return; }
      if (o.end > Wd.t + 0.1) { o.end = Wd.t; word(pick(['STOP !', 'pouf', 'hé !']), o.x, t.y - 40, 22); dust(o.x, K.floorAt(o.L[0].d), sc(o.L[0]) * 0.5, 0.9); } rebond(s, dir); return; }
    const c = o.lump || o.trap; o.wob = Wd.t; o.wobA = s.f ? 0.6 : 0.3;
    if (s.k === 'mouche' && !o.trap) { if (c && c.hp !== undefined) later(0.5, () => word('atchoum !', o.x, o.y - o.hull.h * o.s - 14, 15)); return; }
    if (s.f === 0) { if (c) later(0.3, () => word(pick(['?', 'mrr ?', 'hihi']), o.x, o.y - o.hull.h * o.s - 14, 14)); return; }
    Ch.debusque(o); word(pick(['coucou !', 'hé !', 'trouvé !']), o.x, o.y - o.hull.h * o.s - 16, 16); rebond(s, dir); },
  porte(t, s, dir) { const c = t.ref; if (c.pend) c.pend.w += dir * (s.f + 1) * 1.5;
    say(c, pick(s.f === 0 ? ['!', 'mia ?', 'la plume !'] : ['hé !', 'aïe', 'pardon ?'])); if (s.k === 'rare') say(s.who, pick(['hé ho', '?', 'coucou'])); else dit(s.who, ['?', 'hé !', 'pardon'], 0.5); rebond(s, dir); },
  vol(t, s, dir) { const c = t.ref, k = sc(c); c.vx += dir * k * (s.f + 1) * 0.8; c.vy = Math.min(c.vy, 0) - k * 0.6; c.spin = (c.spin || 0) + dir * rnd(0.5, 1.5);
    say(c, pick(['aïe', 'mia !', 'waaah'])); word(pick(['poc', 'bonk', 'pof']), t.x, t.y - 20, 18); dit(s.who, ['oups', 'pardon !', '?!']); rebond(s, dir); },
  perche(t, s, dir) { const c = t.ref; if (recent(c, 'perchT', 2)) return; c.perchT = Wd.t;
    if (s.f < 2 && s.k !== 'souris') { say(c, pick(s.f ? ['hé !', '?!', 'ouh là'] : ['?', 'hm ?'])); if (!c.task || c.task.k !== 'jump') { c.face = sgn(s.x - c.x) || c.face; } dit(s.who, ['pardon', '?', 'mrr'], 0.4); return; }
    // secoué fort, ou une souris sous lui : il saute en bas
    const it = c.perch.it; interrupt(c); say(c, pick(s.k === 'souris' ? ['une souris !', '!!'] : ['waah !', '!', 'mia !']));
    c.q = [K.hop(() => K.groundAt(K.inView(c.x + dir * sc(c) * 1.2), Math.max(0, it.d - 0.2)), { h: sc(c) * 0.7, zr: [0.2, 0.6] }), pose('affut', 0.8, { face: -dir })]; rebond(s, dir); },
  rare(t, s, dir) { const c = t.ref;
    if (s.f === 0) { if (!recent(c, 'frolT', 2)) { c.frolT = Wd.t; say(c, pick(c.rare === 'geant' ? ['hihi', 'ça chatouille', 'hm ?'] : ['?', 'hm ?', 'hihi'])); } return; }
    const vole = s.k === 'lettre' || s.k === 'colis';
    if (Ra && Ra.react) Ra.react(c, vole ? { main: true, x: s.x, y: s.y, d: c.d } : s.k === 'porte' || s.k === 'coureur' || s.k === 'souris' ? { main: true, x: s.x, y: s.y, d: c.d } : s.ref);
    if (s.k === 'lettre') rebond(s, dir); dit(s.who, ['oups', 'pardon !', 'waouh'], 0.7); },
  prop(t, s, dir) { const it = t.ref; if (s.k === 'vac' && !it.mur) return;   // (l'aspirateur : js/chocs.js fait déjà trembler ce qu'il frôle)
    if (s.k === 'mouche') { if (it.mur || it.launched) pose_mouche(s.ref, () => [it.x, it.y - (it.lift || 0) - it.hull.h * it.s], () => Wd.props.includes(it) && !it.fall && !it.held && !it.suck); return; }
    if (it.mur) { it.wob = Wd.t; it.wobA = 0.4; word(pick(['clonk', 'tonk']), t.x, t.y - 12, 15); rebond(s, dir); return; }
    if (s.f === 0) { it.wob = Wd.t; it.wobA = 0.15; if (s.k === 'kib' && Math.random() < 0.15) word(pick(['tic', 'toc']), s.x, t.y - 10, 12); rebond(s, dir); return; }
    if (s.f === 2 && LEGER(it) && !it.tower && !(s.ref && s.ref.hull && Ch.masse(s.ref) < Ch.masse(it) * 0.5)) { kick(it, dir); Ch.sortir(it); word(pick(['clang', 'bing', 'patatras']), t.x, t.y - 12, 17); }
    else { it.wob = Wd.t; it.wobA = s.f === 2 ? 0.8 : 0.45; if (s.f === 2) Ch.sortir(it); if (Math.random() < 0.6) word(pick(['toc', 'bonk', 'poc']), t.x, t.y - 12, 15); }
    rebond(s, dir); dit(s.who, ['oups', 'pardon', 'aïe'], 0.5); },
};
REACT.lance = REACT.prop;

/* ——— la boucle : à l'entrée dans une cible, une fois ——— */
const vus = new WeakMap();   // cible → Map(source → dernière image où elles se touchaient)
H.pre.push(dt => {
  if (Wd.a < 0.5 || !dt) return; dt = Math.max(dt, 1 / 120);
  const L = sources(dt), T = cibles(); if (!L.length) return;
  for (const s of L) { const A = ALLOW[s.k]; if (!A) continue; const sp = Math.hypot(s.vx, s.vy), steps = sp * dt > s.m ? 3 : 0;
    for (const t of T) {
      if (!A.has(t.k) || t.ref === s.ref || t.ref === s.who || (t.d != null && s.d != null && Math.abs(t.d - s.d) > 0.45)) continue;
      let hit;
      if (t.hit) { hit = false; for (let i = 0; i <= steps && !hit; i++) { const u = steps ? i / steps : 0; hit = t.hit(s.x - s.vx * dt * u, s.y - s.vy * dt * u, s.m); } }
      if (!hit) continue;
      let V = vus.get(t.ref); if (!V) vus.set(t.ref, V = new Map()); const last = V.get(s.ref) ?? -9; V.set(s.ref, Wd.t);
      if (Wd.t - last < 0.35) continue;
      const dir = sgn(s.vx) || sgn(t.x - s.x) || 1; REACT[t.k] && REACT[t.k](t, s, dir);
    }
    // les croquettes au sol : une par une (sous la source)
    if (A.has('kib') && Wd.kib.length) { const k = Wd.kib.find(k => k.rest && !k.who && !k.suck && k !== s.ref && Math.hypot(k.x - s.x, k.y - s.y) < s.m + 8 && (s.d == null || Math.abs(k.d - s.d) < 0.35));
      if (k) { let V = vus.get(k); if (!V) vus.set(k, V = new Map()); const last = V.get(s.ref) ?? -9; V.set(s.ref, Wd.t);
        if (Wd.t - last > 0.35) REACT.kib({ k: 'kib', ref: k, x: k.x, y: k.y }, s, sgn(s.vx) || 1); } }
    // la main qui glisse au ras du sol : un peu de poussière
    if (s.k === 'main' && sp > 150 && s.y > Wd.floor - 14 && !recent(main, 'solT', 0.12)) { main.solT = Wd.t; dust(s.x, Wd.floor, Wd.s0 * 0.1, 0.4); }
  }
  // le chat porté qui frotte le sol : poussière, il râle
  Wd.cats.forEach(c => { if (!c.held || recent(c, 'solT', 0.5)) return; if (c.y > K.floorAt(c.d) - sc(c) * 0.05) { c.solT = Wd.t; dust(c.x, K.floorAt(c.d), sc(c) * 0.25, 0.6); dit(c, ['hé !', 'mes pattes !', 'mrr'], 0.4); } });
});

/* ——— la mouche posée (par ce moteur) : elle reste là, puis repart ——— */
H.pre.push(() => { const m = Wd.mouche; if (!m || !m.pos) return;
  if (m.nose || m.sur || Wd.t > m.pos.end || !m.pos.ok()) { m.pos = null; m.vy = -450; m.vx = rnd(-350, 350); word('bzz', m.x, m.y - 12, 12); return; }
  const p = m.pos.at(); m.x = p[0]; m.y = p[1]; m.vx = m.vy = 0; });

/* ——— un clic sur l'aspirateur : il comprend, il s'en va ——— */
H.click.unshift((x, y) => { const V = Wd.vac, s0 = Wd.s0; if (!V || V.ph === 'remonte' || Math.abs(x - V.x) > s0 * 0.5 || y < V.y - s0 * 1.2 || y > V.y + s0 * 0.2) return false;
  V.ph = 'remonte'; V.tu = Wd.t; word(pick(['ok ok…', 'bon, bon', 'je m’en vais']), V.x, V.y - s0 * 0.9, 18); return true; });

/* ——— les résidents : ils reniflent la bosse et le carton-piège ; ils lèvent la tête vers un chat qui vole ——— */
H.post.push(() => {
  if (Wd.t < (Wd.renifleT || 0)) return; Wd.renifleT = Wd.t + 1.2;
  const it = Wd.props.find(p => (p.lump || p.trap) && !p.held && !p.fall); if (!it || Math.random() > 0.25) return; const cache = it.lump || it.trap;
  const c = Wd.cats.find(c => c !== cache && K.free4(c) && !c.rare && !c.temp && Math.abs(c.x - it.x) < Wd.W * 0.35); if (!c) return;
  const side = sgn(c.x - it.x) || 1, x = K.inView(it.x + side * (it.hull.w * it.s * 0.5 + sc(c) * 0.5));
  interrupt(c); c.q = [K.go(x, { g: 'trot', face: -side }), pose('affut', 1.2, { face: -side, fx: c => { say(c, pick(['snif snif', '?', 'y a quelqu’un ?'])); it.wob = Wd.t; it.wobA = 0.4; later(0.7, () => word(pick(['mrr', 'chut !', 'hihi']), it.x, it.y - it.hull.h * it.s - 14, 14)); } }), pose('assis', 1.5, { face: -side })];
});
H.pre.push(() => {
  Wd.cats.forEach(v => { if (!v.fall || v.held || v.rare || recent(v, 'vuVolT', 3)) return; v.vuVolT = Wd.t;
    Wd.cats.forEach(o => { if (o === v || o.rare || !K.free4(o) || Math.abs(o.x - v.x) > Wd.W * 0.3 || Math.random() > 0.4) return; interrupt(o); o.q = [pose('affut', rnd(0.8, 1.5), { face: sgn(v.x - o.x) || o.face })]; if (Math.random() < 0.3) say(o, pick(['!', 'waouh', 'il vole !'])); }); });
});

/* ——— le concert : les perchés et les cachés chantent aussi ; un chat qui vole au travers, les chanteurs protestent ——— */
H.pre.push(() => {
  const C = Wd.concert; if (!C || !C.on || !C.L.length) return;
  if (C.beat !== C.vuBeat) { C.vuBeat = C.beat;
    Wd.cats.forEach(c => { if (C.L.includes(c) || c.rare || Math.random() > 0.35) return;
      if (c.perch && !c.hidden) say(c, pick(['♪', 'ma !', 'mi ♪']));
      else if (c.hidden) { const it = Wd.props.find(p => p.lump === c || p.trap === c); if (it) { it.wob = Wd.t; it.wobA = 0.35; word(pick(['♪', '♫']), it.x, it.y - it.hull.h * it.s - 12, 16); } } }); }
  const xs = C.L.map(c => c.x), x0 = Math.min(...xs) - Wd.s0 * 0.5, x1 = Math.max(...xs) + Wd.s0 * 0.5, top = K.floorAt(0.1) - Wd.s0 * 1.6;
  Wd.cats.forEach(c => { if (!c.fall || c.held || C.L.includes(c) || c.x < x0 || c.x > x1 || c.y < top || recent(C, 'volT', 2)) return; C.volT = Wd.t;
    const k = pick(C.L); if (k && k.hp) say(k, pick(['hé !', 'chut !', 'on répète !'])); });
});

return { main, ALLOW, REACT };
})();
