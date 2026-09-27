/* Les liens (27/09, Mathieu : « toutes les interactions entre éléments ou l'utilisateur qui manquent : prends la liste des objets et réfléchis
   à ce qui se passe si le carton rencontre ce chat, cet objet, ce carton, ce mouvement de souris, si un truc tombe, est lancé, frôle… »).
   Les cases restées à moitié dans le carnet des interactions, et les nouveaux venus (les étagères, la jungle, les traces arc-en-ciel,
   le souffleur) branchés sur le moteur de js/contacts.js :
   - les chats au sol deviennent des cibles : la horde et le chat fou les bousculent (le dormeur se réveille), le carton-piège les fait sauter,
     la souris leur passe entre les pattes (sursaut), la plume réveille le dormeur ;
   - un perché donne un coup de patte au pointeur, à la plume, à la mouche (sans quitter son perchoir) ; un chat en l'air gigote ;
   - un clic : le dormeur se réveille vraiment (sursaut, bâillement), le chat en l'air gigote, le chat caché est débusqué ;
   - les petits objets sautent sous les pattes des coureurs ; ce qui est empilé tombe au premier coup ;
   - l'aspirateur débusque les cachés, fait râler les visiteurs, fait descendre les perchés ;
   - on emporte un objet : les chats d'à côté le suivent des yeux (la gamelle renverse ses croquettes, le poisson attire un gourmand) ;
     la trappe au mur ne se décroche pas (clonk) ; le chat qu'on porte tape le distributeur (des croquettes !), la trappe, les lettres, les boutons ;
   - un chat qui tombe du ciel au bord d'un coussin, d'un panier, d'un coffre rebondit dessus au lieu de le traverser ;
   - le colis en parachute : ce qui le heurte le fait valser ; les étagères et les feuilles de la jungle sont touchées par ce qui vole ;
   - une flaque arc-en-ciel colore ce qui la traverse (la souris, la pelote, ce qui retombe dedans) ;
   - le souffleur chasse la mouche et la plume, fait trembler les lettres du titre, fait râler les géants. */
window.Liens = (() => {
if (!window.Chats || !Chats.K || !window.Contacts || !window.Chocs || !Contacts.EXT) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, dust, free, pose, later, kick, floorAt, LOURD } = K;
const Co = window.Contacts, Ch = window.Chocs, Vi = window.Vie, Ra = window.Rares, { ALLOW, REACT, EXT } = Co;
let motT = -9;
const word = (text, x, y, size) => { if (Wd.t - motT < 0.08) return; motT = Wd.t; Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 }); };
const recent = (a, key, dt) => Wd.t - (a[key] ?? -9) < dt;
const LEGER = it => !LOURD[it.kind] && it.kind !== 'distrib' && !it.mur && !it.pivot && !it.tower;
const PETIT = it => LEGER(it) && it.hull.w * (it.big || 1) < 0.4;
const add = (k, mots) => mots.split(' ').forEach(m => ALLOW[k] && ALLOW[k].add(m));
const dort = c => /dodo|pain|couche|dort/.test((c.task && c.task.anim) || c.anim || '');

// une réaction courte, sans perdre son perchoir ni la suite de ce qu'il faisait (le dormeur reprend sa sieste, ou descend)
function reagit(c, L) {
  if (!c || c.held || c.fall || c.jump || c.fight || c.pet || c.rare || (c.task && (c.task.air || !['pose', 'wait'].includes(c.task.k)))) return false;
  const pe = c.perch; free(c); c.task = null; c.q.unshift(...L); c.perch = pe; return true;
}

/* ——— les nouvelles cibles ——— */
// les chats au sol (le moteur ne connaissait que les perchés, les portés, ceux en l'air)
const auSol = c => c.hp && !c.perch && !c.fall && !c.held && !c.hidden && !c.rare && !c.gone && !c.jump && !c.fight && !(c.task && c.task.air);
EXT.cib.push(add => {
  for (const c of Wd.cats) { if (!auSol(c)) continue; const z = Ch.corps(c);
    add('chat', c, (x, y, m) => ((x - z.x) / (z.rx + m)) ** 2 + ((y - z.y) / (z.ry + m)) ** 2 < 1, c.d, z.x, z.y - z.ry); }
  // le chat pendu par les griffes (au bord de ce qu'on emporte, js/accroche.js ; au bord d'une étagère, js/parcours.js)
  for (const c of Wd.cats) { if (!c.hp || c.held || c.rare || !(c.accr || (c.task && c.task.k === 'griffes'))) continue; const z = Ch.corps(c);
    add('pendu', c, (x, y, m) => ((x - z.x) / (z.rx + m)) ** 2 + ((y - z.y) / (z.ry + m)) ** 2 < 1, null, z.x, z.y - z.ry); }
  // le colis qui descend en parachute
  for (const b of Wd.props) { if (!b.para || b.a < 0.5) continue; const w = b.box.w * b.s * 0.6, top = b.y - b.box.h * b.s - b.s * 1.2;
    add('para', b, (x, y, m) => Math.abs(x - b.x) < w + m && y > top - m && y < b.y + m, b.d, b.x, top); }
  // les étagères du parcours
  const E = window.Parcours && Parcours.etageres(); if (E) E.L.forEach(e => add('etagere', e, (x, y, m) => Math.abs(x - e.x) < e.w * 0.5 + m && y > e.y - 6 - m && y < e.y + 14 + m, null, e.x, e.y));
  // les grandes feuilles de la jungle
  if (window.Jungle && Jungle.jungles) Jungle.jungles().forEach(it => it.parts.feuilles.forEach(f => { if (!f.on) return; const p = Jungle.centre(it, f), r = it.s * 0.2 * f.k;
    add('feuilleJ', { it, f }, (x, y, m) => Math.hypot(x - p[0], y - p[1]) < r + m, null, p[0], p[1]); }));
});
add('coureur', 'chat prop lance para'); add('rare', 'chat pendu'); ['ptr', 'plume', 'mouche', 'objet', 'vol', 'lettre', 'colis', 'kib', 'porte'].forEach(k => add(k, 'pendu'));
add('vol', 'perche'); add('colis', 'perche'); add('ptr', 'etagere feuilleJ'); add('plume', 'etagere feuilleJ');
 add('piege', 'chat perche prop lance'); add('souris', 'chat');
add('ptr', 'perche vol'); add('plume', 'perche vol chat'); add('mouche', 'perche vol porte rare');
add('vac', 'cache rare perche'); add('kib', 'rare para'); add('porte', 'lettre bouton para etagere feuilleJ');
add('vol', 'lettre bouton para etagere feuilleJ'); add('objet', 'para etagere feuilleJ lettreSol'); add('lettre', 'etagere feuilleJ para');
add('colis', 'etagere feuilleJ'); add('rare', 'para feuilleJ');

/* ——— les nouvelles réactions ——— */
// (ce qui vole et touche : il repart un peu en arrière)
function renvoie(s, dir) { const o = s.ref;
  if (s.k === 'objet' || s.k === 'colis') { const v = sOf(o.d); o.vx = -(o.vx || 0) * 0.4 - dir * v * 0.3; o.vy = Math.abs(o.vy || 0) * 0.3 + v * 0.3; }
  else if (s.k === 'vol') { o.vx = -o.vx * 0.4 - dir * sc(o) * 0.4; o.vy = Math.min(o.vy, 0) * 0.3 - sc(o) * 0.6; }
  else if (s.k === 'lettre') { o.vx = -o.vx * 0.4; o.vy = -Math.abs(o.vy) * 0.4; }
  else if (s.k === 'kib') { o.vx = -o.vx * 0.5; o.vy = -Math.abs(o.vy) * 0.3; } }
REACT.chat = (t, s, dir) => { const c = t.ref; if (s.who === c || recent(c, 'lienT', 1.5)) return; c.lienT = Wd.t; const k = sc(c);
  if (s.k === 'rare') { if (reagit(c, [pose('sursaut', 0.6), pose('affut', rnd(1, 2), { face: -dir })])) { c.x += dir * k * 0.2; say(c, pick(['hé !', 'waouh', 'pardon ?!'])); } return; }
  if (s.k === 'plume') { if (dort(c) && reagit(c, [pose('sursaut', 0.5), pose('affut', rnd(1, 2), { face: sgn(s.x - c.x) || c.face })])) say(c, pick(['!', 'la plume !', 'hein ?'])); return; }
  if (s.k === 'souris') { if (reagit(c, [pose('sursaut', 0.5, { fx: c => say(c, pick(['!!', 'hiii', 'une souris !'])) }), pose('affut', 0.8, { face: -dir })])) word('couic', t.x, t.y - 12, 14); return; }
  if (s.k === 'piege') { // le carton-piège qui bondit : il le cogne (paf), l'autre fait un petit saut en arrière
    if (Math.hypot(s.vx, s.vy) > sOf(c.d) * 1.5) { K.interrupt(c); c.fall = true; c.vx = dir * k * 1.2; c.vy = -k * 1.4; c.spin = dir * 0.5; say(c, pick(['hé !', 'aïe', 'qui est là-dedans ?'])); word('paf', t.x, t.y - 16, 18); }
    else if (reagit(c, [pose('sursaut', 0.6), pose('feule', 0.8, { face: -dir })])) say(c, pick(['?!', 'fsss', 'hé !'])); return; }
  // un coureur (la horde, le chat fou) : il le bouscule en passant ; le dormeur se réveille en sursaut
  if (dort(c)) { if (reagit(c, [pose('sursaut', 0.6, { fx: c => say(c, pick(['hé !', 'quoi ?!', 'mrrr…'])) }), pose('baille', 1.2), pose('boude', rnd(1, 2), { face: -dir })])) dit(s.who, ['pardon !', 'oups', 'poussez-vous !']); return; }
  if (c.task && c.task.k === 'walk' && c.task.g !== 'galop') { c.x += dir * k * 0.15; say(c, pick(['hé !', 'doucement !', 'pardon ?'])); dit(s.who, ['pardon !', 'poussez-vous !']); return; }
  if (reagit(c, [pose('sursaut', 0.5), pose(pick(['feule', 'boude', 'affut']), rnd(0.8, 1.5), { face: -dir })])) { c.x += dir * k * 0.12; say(c, pick(['hé !', 'doucement !', 'aïe'])); dit(s.who, ['pardon !', 'poussez-vous !', 'miaou !']); }
};
const dit = (c, L) => { if (c && c.hp && !c.rare && !recent(c, 'ditT', 1.2) && Math.random() < 0.5) { c.ditT = Wd.t; say(c, pick(L)); } };
REACT.para = (t, s, dir) => { const b = t.ref; b.pousse = (b.pousse || 0) + dir * sOf(b.d) * (s.f + 1) * 0.8; word(pick(['pof', 'flop', 'fwoup']), t.x, t.y - 10, 16);
  if (s.k === 'kib') { renvoie(s, dir); return; } renvoie(s, dir); if (s.k === 'vol' || s.k === 'porte') say(s.ref, pick(['un parachute !', 'wouh', 'hé !'])); };
REACT.pendu = (t, s, dir) => { const c = t.ref; if (recent(c, 'penduT', 0.6)) return; c.penduT = Wd.t; const A = c.accr, T = c.task;
  if (s.f === 0) { // un frôlement : il gigote, manque de lâcher
    if (A) { A.calme = 0; A.risque += 0.35; } else if (T && T.k === 'griffes') T.dur += 0.4;
    if (s.k !== 'kib') say(c, pick(['pas maintenant !', 'hé !', 'nyaa…', 'je glisse !'])); return; }
  // un coup : il lâche
  if (A) A.risque += 3; else if (T && T.k === 'griffes') { T.ok = false; T.glisse = Wd.t - 1; T.dur = T.t; }
  say(c, pick(['aïe !', 'MIAAA', 'nooon'])); word(pick(['poc', 'bonk', 'paf']), t.x, t.y - 16, 17); renvoie(s, dir); };
REACT.etagere = (t, s, dir) => { const e = t.ref; if (s.f === 0) { e.wob = Math.max(e.wob, Wd.t - 0.25); return; } e.wob = Wd.t; word(pick(['toc', 'tac', 'bonk']), t.x, t.y - 14, 15); renvoie(s, dir);
  Wd.cats.forEach(c => { if (c.task && c.task.k === 'etagere' && c.task.i === e.i) { say(c, pick(['!!', 'hé !', 'ça bouge !'])); c.task.anim = 'sursaut'; c.task.dur = Math.max(c.task.dur, c.task.t + 0.7); } }); };
REACT.feuilleJ = (t, s, dir) => { const { it, f } = t.ref; f.wob = Wd.t; if (s.k === 'ptr' || s.k === 'plume') return; if (Math.random() < 0.5) word(pick(['frrr', 'fshh', 'flap']), t.x, t.y - 14, 14);
  // un coup fort (ou un chat qu'on promène dedans, qui mord) : la feuille s'arrache
  if (s.f === 2 || (s.k === 'porte' && Math.random() < 0.35) || (s.k === 'vol' && Math.random() < 0.4)) { Jungle.arrache(it, f, [t.x, t.y], dir * sOf(it.d) * 1.2, sOf(it.d) * 0.8); if (s.k === 'porte') say(s.ref, pick(['crounch', 'miam ?', 'à moi !'])); }
  else if (s.k === 'porte' || s.k === 'vol') say(s.ref, pick(['ça chatouille', 'pfff', 'une feuille !'])); };

// les réactions déjà écrites, complétées
const avant = { ...REACT };
REACT.perche = (t, s, dir) => { const c = t.ref;
  // le pointeur, la plume, la mouche : un coup de patte, sans descendre
  if (s.k === 'ptr' || s.k === 'plume' || s.k === 'mouche') { if (recent(c, 'patteT', 2.5) || c.pet) return; c.patteT = Wd.t; const side = sgn(s.x - c.x) || c.face;
    if (Math.random() < (s.k === 'ptr' ? 0.6 : 0.85) && reagit(c, [pose('tape', 0.5, { face: side, fx: c => say(c, pick(['tap !', 'à moi !', 'hop'])) }), pose('affut', rnd(0.6, 1.2), { face: side })])) { if (s.k === 'mouche') { const m = s.ref; m.vx = side * 700; m.vy = -500; m.tgt = null; word('bzz !', m.x, m.y - 12, 14); } }
    else { c.face = side; if (Math.random() < 0.5) say(c, pick(['?', 'hm ?', '…'])); } return; }
  // l'aspirateur : il en descend vite fait
  if (s.k === 'vac') { if (recent(c, 'perchT', 2)) return; say(c, pick(['NON !', 'pas ça !', 'au secours !'])); }
  return avant.perche(t, s, dir);
};
REACT.vol = (t, s, dir) => { const c = t.ref;
  if (s.f === 0) { if (recent(c, 'gigoteT', 0.8)) return; c.gigoteT = Wd.t; c.spin = (c.spin || 0) + dir * rnd(0.4, 0.9); c.vx += dir * sc(c) * 0.3;
    say(c, pick(s.k === 'mouche' ? ['bzz ?!', 'une mouche !'] : ['waah !', 'attrape !', 'hiii'])); return; }
  return avant.vol(t, s, dir);
};
REACT.porte = (t, s, dir) => { if (s.k === 'mouche') { const c = t.ref; if (recent(c, 'patteT', 1.5)) return; c.patteT = Wd.t; if (c.pend) c.pend.w += dir; say(c, pick(['bzz ?', 'lâche-moi, la mouche !', 'tap !'])); return; } return avant.porte(t, s, dir); };
REACT.rare = (t, s, dir) => { const c = t.ref;
  if (s.k === 'vac') { if (!recent(c, 'vacT', 3) && Ra && Ra.react) { c.vacT = Wd.t; Ra.react(c, { main: true, x: s.x, y: s.y, d: c.d }); say(c, pick(['!!', 'pas l’aspirateur !', 'hé ho !'])); } return; }
  // un frôlement : chaque visiteur à sa façon
  if (s.f === 0 && !recent(c, 'frolT', 2)) { c.frolT = Wd.t; const L = { geant: ['hihi', 'ça chatouille', 'hm ?'], interminable: ['hihi', 'par ici !', 'le bout, c’est moi'], ballon: ['pop ?', 'doucement !', 'hihi'],
    eclair: ['zip !', 'trop lent !', '⚡'], totem: ['hé, en haut !', 'hihi', 'on bouge pas'], acrobate: ['oh là là', 'je vais tomber !', 'hop !'] }[c.rare] || ['?'];
    say(c, pick(s.k === 'kib' ? ['miam ?', 'une croquette !', 'hihi'] : s.k === 'mouche' ? ['bzz ?', 'ouste !'] : L)); return; }
  return avant.rare(t, s, dir);
};
REACT.prop = (t, s, dir) => { const it = t.ref, v = sOf(it.d);
  if (it.kind === 'canape' && s.f === 0) { it.wob = Wd.t; it.wobA = 0.5; if (!recent(it, 'poufT', 1.5)) { it.poufT = Wd.t; word(pick(['pouf', 'fff']), s.x, t.y + 10, 13); } return; }
  // sous les pattes des coureurs : les petits sautent, ce qui est empilé tombe
  if (s.k === 'coureur' || s.k === 'piege') {
    if (it.on && LEGER(it)) { kick(it, dir); word(pick(['oups', 'patatras']), t.x, t.y - 12, 15); return; }
    if (PETIT(it) && !it.fall) { it.fall = true; it.vx = dir * v * rnd(0.6, 1.1); it.vy = v * rnd(0.6, 1); it.tiltV = dir * rnd(2, 5); word(pick(['tic', 'hop', 'toc']), t.x, t.y - 12, 14); return; }
    if (s.k === 'piege' && Math.hypot(s.vx, s.vy) > v * 1.5) { it.wob = Wd.t; it.wobA = 0.8; Ch.sortir(it); word('tonk', t.x, t.y - 12, 17); const o = s.ref; o.vx = -(o.vx || 0) * 0.3; return; }
    it.wob = Wd.t; it.wobA = 0.4; return; }
  // un coup franc sur ce qui est empilé : il tombe ; sur une caisse de la tour : la pile penche
  if (s.f >= 1 && it.on && LEGER(it) && s.k !== 'kib' && s.k !== 'mouche' && s.k !== 'vac') { kick(it, dir); word(pick(['oups', 'patatras', 'cling']), t.x, t.y - 12, 15); return; }
  if (s.f >= 1 && it.tower && it.tower.phase === 'debout' && s.k !== 'kib' && s.k !== 'mouche') { it.tower.w += s.f === 2 ? 0.3 : 0.12; it.wob = Wd.t; word(pick(['ooh…', 'ça penche !']), t.x, t.y - 16, 16); }
  return avant.prop(t, s, dir);
};
REACT.lance = REACT.prop;
REACT.cache = (t, s, dir) => { if (s.k === 'vac' && !t.ref.L) { Ch.debusque(t.ref); t.ref.wob = Wd.t; word(pick(['!!', 'au secours !', 'hiii']), t.x, t.y - 16, 16); return; } return avant.cache(t, s, dir); };

/* ——— le clic : le dormeur se réveille, le chat en l'air gigote, le caché est débusqué ——— */
H.click.push((x, y) => {
  const it = K.propAt(x, y);
  if (it && (it.lump || it.trap) && !it.held) { Ch.debusque(it); it.wob = Wd.t; it.wobA = 0.6; word(pick(['coucou !', 'trouvé !', 'hé !']), it.x, it.y - it.hull.h * it.s - 16, 16); return true; }
  const c = K.catAt(x, y); if (!c || c.rare) return false;
  if (c.fall && !c.held) { c.spin = (c.spin || 0) + (Math.random() < 0.5 ? -1 : 1) * rnd(0.6, 1.2); c.vy = Math.min(c.vy, 0) - sc(c) * 0.5; say(c, pick(['waaah !', 'hé !', 'mia !'])); word('pof', x, y - 16, 15); return true; }
  if (dort(c) && reagit(c, [pose('sursaut', 0.6, { fx: c => say(c, pick(['!?', 'hein ?', 'quoi ?'])) }), pose('baille', 1.3), pose('assis', rnd(0.8, 1.5))])) { later(1, () => say(c, pick(['mrrr…', 'je dormais…', '♥']))); return true; }
  return false;
});

/* ——— on emporte un objet : les chats le suivent des yeux ; la trappe ne se décroche pas ——— */
H.post.push(() => {
  for (const it of Wd.props) {
    if (!it.held) { it.tenuVu = false; continue; } if (it.tenuVu) continue; it.tenuVu = true;
    const x = it.x, L = Wd.cats.filter(c => K.free4(c) && !c.rare && !c.temp && Math.abs(c.x - x) < Wd.W * 0.35);
    L.forEach(c => { if (Math.random() < 0.7) reagit(c, [pose('affut', rnd(1, 2), { face: sgn(x - c.x) || c.face })]); });
    const c = L[0], k = it.kind;
    // la gamelle renverse ses croquettes
    if (k === 'gamelle') { let n = 0; Wd.kib.forEach(q => { if (q.rest && !q.who && Math.abs(q.x - x) < it.hull.w * it.s * 0.7 && Math.abs(q.d - it.d) < 0.2) { q.rest = false; q.dans = null; q.vx = rnd(-120, 120); q.vy = -rnd(80, 220); n++; } }); if (n) word('cling cling', x, it.y - 20, 15); if (c) say(c, pick(['ma gamelle !', 'hé !', 'miam ?'])); }
    else if (k === 'eau') word(pick(['plic', 'ploc']), x, it.y - 16, 14);
    else if (k === 'poisson' || k === 'pelote' || k === 'feuille') { if (c && reagit(c, [K.go(K.inView(x - sgn(x - c.x) * sc(c) * 0.6), { g: 'trot', face: sgn(x - c.x) }), pose('dresse', rnd(1, 2))])) say(c, pick(k === 'poisson' ? ['mon poisson !', 'miam !'] : ['à moi !', 'donne !'])); }
    else if (k === 'coffre' || LOURD[k]) { if (!recent(it, 'hopT', 3)) { it.hopT = Wd.t; word(pick(['hop…', 'hnnn', 'lourd !']), x, it.y - it.hull.h * it.s - 12, 16); } }
    else if (k === 'tasse' || k === 'plante') { if (c) say(c, pick(['attention !', 'oh oh', '…'])); }
    if (it.para) { it.para = false; word('pof !', x, it.y - it.s, 16); }
  }
});
H.drag.push(c => { if (!c || !c.hull || !c.mur || c.kind === 'jungle') return false; if (!recent(c, 'coinceT', 0.8)) { c.coinceT = c.wob = Wd.t; c.wobA = 0.7; word(pick(['clonk', 'bloqué !', 'crr']), c.x, c.y - c.hull.h * c.s, 16); } return false; });

/* ——— le chat qu'on porte : il tape ce qu'il croise (le distributeur donne des croquettes) ——— */
H.post.push(() => {
  Wd.cats.forEach(c => { if (!c.held || !c.hp || recent(c, 'tapeT', 2.5)) return;
    const b = Chat.where(c, c.body);
    const it = Wd.props.find(it => (it.kind === 'distrib' || it.kind === 'trappe' || it.kind === 'lanceur') && !it.held && it.a > 0.5 && Math.abs(b[0] - it.x) < it.hull.w * it.s * 0.6 + sc(c) * 0.2 && b[1] > it.y - it.hull.h * it.s - sc(c) * 0.3 && b[1] < it.y + 10);
    if (!it) return; c.tapeT = Wd.t; it.wob = Wd.t; it.wobA = 0.7; if (c.pend) c.pend.w += 1.2;
    if (it.kind === 'distrib') { say(c, pick(['miam !', 'des croquettes !', 'tap tap'])); K.fire(it, c); }
    else { say(c, pick(['tap !', 'c’est quoi ?', 'toc toc'])); word(pick(['toc', 'clonk']), it.x, it.y - it.hull.h * it.s, 15); } });
});

/* ——— un chat qui tombe au bord d'un coussin, d'un panier, d'un coffre : il rebondit sur le bord (boing) ——— */
H.fall.push((c, dt) => {
  if (c.vy <= 0 || c.held || c.rare || recent(c, 'bordT', 0.6)) return false; const k = sc(c), ny = c.y + c.vy * dt;
  for (const it of Wd.props) {
    if (it.held || it.fall || it.run || it.mur || it.a < 0.5 || !it.perches || !it.perches.length || Math.abs(it.d - c.d) > 0.3) continue;
    const w = it.hull.w * it.s * 0.5, top = it.y - it.hull.h * it.s, ex = Math.abs(c.x - it.x);
    if (ex < w * 0.8 || ex > w + k * 0.15 || !(c.y <= top + 2 && ny >= top - 2)) continue;
    const side = sgn(c.x - it.x) || 1; c.bordT = Wd.t; c.vy = -Math.max(k * 1.4, c.vy * 0.35); c.vx = side * k * rnd(1, 1.6); c.spin = (c.spin || 0) + side * 0.8;
    it.wob = Wd.t; it.wobA = 0.6; word(pick(['boing', 'oups', 'bonk']), c.x, top - 10, 17); say(c, pick(['oups', 'raté !', 'waah'])); return false;
  }
  return false;
});

/* ——— un lourd (l'arbre, le coffre, le distributeur…) lâché sur le bassin ou le canapé : PLOUF au fond de l'eau, pouf sur l'assise ——— */
const basY = new WeakMap();
H.post.push(() => {
  const CONT = window.Contenants && Contenants.CONT; if (!CONT) return;
  for (const h of Wd.props) {
    const y = h.y, py = basY.get(h); basY.set(h, y);
    if (!h.fall || h.held || h.suck || h.run || h.mur || py == null || y < py || !(LOURD[h.kind] || h.kind === 'distrib')) continue;
    for (const b of Wd.props) {
      if (b === h || (b.kind !== 'bassin' && b.kind !== 'canape') || b.held || b.fall || b.a < 0.5) continue;
      const C = CONT[b.kind]; if (!C || Math.abs(h.x - b.x) > (C.w + 0.1) * b.s || (Math.abs(b.d - h.d) > 0.25 && !(Wd.t - (h.lache ?? -9) < 4))) continue;
      const rim = b.y - C.bord * b.s; if (!(py <= rim + 2 && y >= rim - 2)) continue;
      K.stack(h, b, (h.x - b.x) / sOf(b.d)); h.dans = C.fond; h.fall = false; h.vx = h.vy = h.tiltV = 0; h.tilt = 0; b.wob = Wd.t; b.wobA = 1; Ch.sortir(b);
      if (b.kind === 'bassin') { word(pick(['PLOUF !', 'SPLASH', 'gloup']), b.x, rim - 40, 26); if (window.Bassin && Bassin.eclabousse) Bassin.eclabousse(b, h.x, 1.5); Wd.shake = { t0: Wd.t, a: 4 }; }
      else { word(pick(['POUF', 'crouiic', 'boum']), b.x, rim - 30, 24); dust(h.x, rim, b.s * 0.4, 0.8); }
      break;
    }
  }
});

/* ——— le colis poussé en plein vol : il dérive, puis reprend sa descente ——— */
H.post.push(dt => { Wd.props.forEach(b => { if (!b.para || !b.pousse) return; b.fx += b.pousse * dt / Wd.W; b.tilt = (b.tilt || 0) + sgn(b.pousse) * 0.2 * Math.min(1, Math.abs(b.pousse) / (b.s * 2)); b.pousse *= Math.exp(-dt * 2); if (Math.abs(b.pousse) < 2) b.pousse = 0; }); });

/* ——— les flaques arc-en-ciel : ce qui les traverse se colore ——— */
H.post.push(() => {
  if (!window.Arc || !Arc.T.length) return; const F = Arc.T.filter(f => f.k !== 'patte' && !f.pouf); if (!F.length) return;
  Wd.props.forEach(o => { if (o.held || o.suck || o.mur || (o.lift || 0) > 6 || !(o.run || o.vx || o.fall)) return;
    const f = F.find(f => Math.abs(o.x - f.x) < f.r + 4 && Math.abs(o.d - f.d) < 0.15); if (!f || o.arcF === f) return; o.arcF = f;
    Arc.colore(o, 20); word(pick(['splotch ✨', 'plic ✨', '✨']), o.x, o.y - 14, 14); });
});

/* ——— le souffleur : la mouche et la plume s'envolent, les lettres du titre tremblent, les géants râlent ——— */
H.post.push(dt => {
  if (!window.Souffleur) return;
  Souffleur.souffleurs().forEach(s => { const C = s.cone; if (!C || !(s.pw > 0.2)) return;
    const dans = (x, y) => { const px = x - C.x, py = y - C.y, u = px * C.dx + py * C.dy; return u > -10 && u < C.L && Math.abs(-px * C.dy + py * C.dx) < Math.max(0, u) * C.k + 24; };
    const m = Wd.mouche; if (m && !m.pos && dans(m.x, m.y)) { m.nose = null; m.sur = null; m.vx = C.dx * 900; m.vy = C.dy * 900 - 200; m.tgt = null; if (!recent(m, 'soufT', 1)) { m.soufT = Wd.t; word('bzzz !!', m.x, m.y - 12, 15); } }
    if (Vi && Vi.ptr && Vi.ptr.plume > Wd.t && dans(Vi.plume.x, Vi.plume.y)) { Vi.plume.vx += C.dx * 1600 * dt; Vi.plume.vy += C.dy * 1600 * dt - 400 * dt; }
    if (Vi && Vi.LETTERS) { const Ls = Vi.LETTERS(); if (Ls) { const r = Vi.RECT(); Ls.forEach(L => { if (L.st || L.a < 0.5 || !dans(Vi.lx(L, r), Vi.ly(L, r))) return; L.wob = Wd.t; L.wobA = 0.6; }); } }
    Wd.cats.forEach(c => { if (!c.rare || !c.hp || !['geant', 'interminable', 'totem'].includes(c.rare) || recent(c, 'soufT', 3) || !dans(c.hp[0], c.hp[1])) return; c.soufT = Wd.t; say(c, pick(['ça décoiffe !', 'hé ho !', 'pfff', 'arrête !'])); });
  });
});

/* ——— la suite des cases du carnet (27/09, 19 h) ——— */
// les flaques : le chat qui retombe dedans, le chat porté qui y traîne les pattes, le visiteur qui roule dessus, la croquette qui y tombe,
// le baigneur d'un bassin arc-en-ciel ; le pointeur fait briller les paillettes ; la main qui glisse dessus l'étale
const volait = new WeakMap();
H.post.push(dt => {
  const F = window.Arc ? Arc.T.filter(f => f.k !== 'patte' && !f.pouf) : [];
  const dans = (x, d, m) => F.find(f => Math.abs(x - f.x) < f.r + (m || 4) && Math.abs(d - f.d) < 0.2);
  Wd.cats.forEach(c => {
    const v = volait.get(c); volait.set(c, !!c.fall); if (!c.hp || !F.length) return;
    let f = null;
    if (v && !c.fall && !c.held) f = dans(c.x, c.d);   // vient de retomber
    else if (c.held && c.y > floorAt(c.d) - sc(c) * 0.15) f = dans(c.x, c.d);
    else if (c.rare && !c.fall && Math.abs(c.y - floorAt(c.d)) < 6) f = dans(c.x, c.d, sc(c) * 0.3);
    if (!f || c.arcF === f) return; c.arcF = f; Arc.colore(c, 25); word(pick(['splotch ✨', '✨ !', 'plic ✨']), c.x, c.y - sc(c) * 0.5, 15); if (!c.rare) say(c, pick(['beurk ✨', 'oh…', 'hé !']));
    if (c.rare) for (let i = 0; i < 6; i++) Arc.T.push({ k: 'patte', x: c.x - (c.vx ? sgn(c.vx) : 1) * i * sc(c) * 0.25, y: floorAt(c.d) + (i % 2 ? 2 : -2), r: sc(c) * 0.05, t0: Wd.t, life: 14, seed: i, d: c.d, col: Arc.COUL[i % 6] });
  });
  Wd.kib.forEach(k => { if (!k.rest || k.arcVu || !F.length) return; k.arcVu = 1; const f = dans(k.x, k.d ?? 0.1); if (f) Wd.fx.push({ k: 'etoile', x: k.x, y: k.y - 4, vx: rnd(-30, 30), vy: -rnd(60, 120), t0: Wd.t, life: 0.8, col: pick(Arc.COUL) }); });
  const P = Vi && Vi.ptr; if (P && P.on && Wd.t - P.moved < 0.1 && F.length) { const f = F.find(f => Math.abs(P.x - f.x) < f.r + 8 && Math.abs(P.y - f.y) < f.r * 0.5 + 14); if (f && Math.random() < 0.5) Wd.fx.push({ k: 'etoile', x: P.x + rnd(-8, 8), y: P.y, vx: rnd(-40, 40), vy: -rnd(40, 110), t0: Wd.t, life: 0.7, col: pick(Arc.COUL) }); }
  const M = Co.main; if (M && M.on && F.length) { const f = F.find(f => Math.abs(M.x - f.x) < f.r && Math.abs(M.y - f.y) < f.r * 0.4 + 10); if (f) { f.x += (M.x - f.x) * Math.min(1, dt * 3); f.r = Math.min(f.r * 1.6, f.r + dt * 6); } }
  // le baigneur d'un bassin arc-en-ciel : lui aussi
  Wd.cats.forEach(c => { const it = c.perch && c.perch.it; if (it && it.kind === 'bassin' && it.arcT > Wd.t && !(c.arcT > Wd.t)) { Arc.colore(c, 20); say(c, pick(['✨', 'je brille !'])); } });
});

// le souffleur, suite : les lourds tanguent (hnnn), la trappe et les étagères tremblent, la souris dérape, les lettres tombées glissent,
// l'aspirateur recule ; lancé, il souffle quand il touche le sol
H.post.push(dt => {
  if (!window.Souffleur) return;
  Souffleur.souffleurs().forEach(so => {
    if (so.fall) so.volait = true; else if (so.volait) { so.volait = false; so.puff = Wd.t + 0.5; word('pfff !', so.x, so.y - 20, 16); }
    const C = so.cone; if (!C || !(so.pw > 0.2)) return;
    const q = (x, y) => { const px = x - C.x, py = y - C.y, u = px * C.dx + py * C.dy; if (u < -10 || u > C.L || Math.abs(-px * C.dy + py * C.dx) > Math.max(0, u) * C.k + 24) return 0; return 1 - u / C.L; };
    Wd.props.forEach(it => { if (it === so || it.held || it.fall) return; const f = q(it.x, it.y - it.hull.h * it.s * 0.5); if (!f) return;
      if (it.run) { it.fx += C.dx * 120 * f * dt / Wd.W; if (!recent(it, 'soufT', 1)) { it.soufT = Wd.t; Ch.bond(it, sOf(it.d) * 0.4); word('hiii !', it.x, it.y - 24, 14); } return; }
      if (LOURD[it.kind] || it.kind === 'distrib' || it.mur || it.kind === 'canape' || it.kind === 'bassin') { if (!recent(it, 'soufT', 0.5)) { it.soufT = it.wob = Wd.t; it.wobA = 0.35; } if (!recent(it, 'hnT', 2.5)) { it.hnT = Wd.t; word(pick(['hnnn', 'brrr', 'fff']), it.x, it.y - it.hull.h * it.s - 10, 14); } } });
    const E = window.Parcours && Parcours.etageres(); if (E) E.L.forEach(e => { if (q(e.x, e.y)) e.wob = Math.max(e.wob, Wd.t - 0.2); });
    if (Vi && Vi.LETTERS) { const Ls = Vi.LETTERS(); if (Ls) { const r = Vi.RECT(); Ls.forEach(L => { if (L.st !== 'sol' || L.a < 0.5) return; const f = q(Vi.lx(L, r), Vi.ly(L, r)); if (f && Math.random() < dt * 3 * f) Vi.tumble(L, C.dx * Wd.s0 * f, -Wd.s0 * 0.4 * f, rnd(-3, 3)); }); } }
    const V = Wd.vac; if (V && V.ph === 'balaye' && q(V.x, V.y - Wd.s0 * 0.3)) { V.x += C.dx * 90 * dt; if (!recent(V, 'soufT', 2)) { V.soufT = Wd.t; word(pick(['vrr ?!', 'hé !', 'VRRR']), V.x, V.y - Wd.s0, 18); } }
  });
});

// l'acrobate, au bas de son fil : un coup de patte sur ce qui est dessous
H.post.push(() => {
  Wd.cats.forEach(c => { if (c.rare !== 'acrobate' || !c.hp || !Ra || !Ra.zone) return; const z = Ra.zone(c), bas = z.y + z.ry;
    for (const it of Wd.props) { if (it.held || it.fall || it.a < 0.5 || it.mur || Math.abs(it.x - c.x) > it.hull.w * it.s * 0.5 + z.rx * 0.3) continue;
      const top = it.y - it.hull.h * it.s; if (Math.abs(bas - top) > sc(c) * 0.5 || recent(it, 'acroT', 3)) continue; it.acroT = it.wob = Wd.t; it.wobA = 0.6; Ch.sortir(it);
      if (it.kind === 'bassin' && window.Bassin) { Bassin.rond(it, c.x, Bassin.surface(it).y, 1.2); word('plic !', c.x, top - 16, 15); } else word(pick(['tap !', 'toc', 'coucou !']), c.x, top - 16, 15);
      say(c, pick(['hihi', 'à l’envers !', 'tap'])); break; } });
});

// un visiteur arrive : les dormeurs et les assis d'à côté se réveillent et regardent
const rVus = new WeakSet();
H.post.push(() => { Wd.cats.forEach(r => { if (!r.rare || rVus.has(r) || !r.hp) return; rVus.add(r);
  Wd.cats.forEach(c => { if (c.rare || Math.abs(c.x - r.x) > Wd.W * 0.45 || Math.random() < 0.3) return; if (reagit(c, [pose('sursaut', 0.6), pose('affut', rnd(1.5, 3), { face: sgn(r.x - c.x) || c.face })])) say(c, pick(['!!', 'c’est quoi ça ?', 'waouh'])); }); }); });

// les baigneurs voisins s'éclaboussent ; le baigneur qu'on sort de l'eau goutte
H.post.push(dt => {
  if (!window.Bassin) return;
  Wd.cats.forEach(c => {
    if (c.held && c.wet && Wd.t - c.wet < 6 && Math.random() < dt * 10) { const b = Chat.where(c, c.body); Wd.fx.push({ k: 'goutteB', x: b[0] + rnd(-8, 8), y: b[1] + sc(c) * 0.2, vx: rnd(-20, 20), vy: 0, y1: floorAt(c.d), t0: Wd.t, life: 1.2, col: '60,110,180' }); }
    const it = c.perch && c.perch.it; if (!it || it.kind !== 'bassin' || recent(c, 'eclT', 5) || Math.random() > dt * 0.4) return;
    const o = Wd.cats.find(o => o !== c && o.perch && o.perch.it === it && Math.abs(o.x - c.x) < sc(c) * 2); if (!o) return;
    c.eclT = Wd.t; Bassin.gerbe(it, c.x, Bassin.surface(it).y, 8, 0.8); o.wet = Wd.t; say(c, pick(['splash !', 'hihi', 'tiens !'])); later(0.4, () => say(o, pick(['hé !', 'pfff', 'attends !'])));
  });
});

// le chat fou croise la plume ou la mouche : il s'arrête net et bondit ; la horde y donne un coup de patte en passant
H.post.push(() => {
  const P = Vi && Vi.ptr && Vi.ptr.plume > Wd.t ? Vi.plume : null, m = Wd.mouche;
  Wd.cats.forEach(c => { if (c.rare || !c.task || c.task.k !== 'walk' || c.task.g !== 'galop' || recent(c, 'chasseT', 4) || !c.hp) return;
    const cible = P && Math.hypot(P.x - c.hp[0], P.y - c.hp[1]) < sc(c) * 1.2 ? P : m && !m.nose && Math.hypot(m.x - c.hp[0], m.y - c.hp[1]) < sc(c) * 1.2 ? m : null; if (!cible) return; c.chasseT = Wd.t;
    if (c.balai || c.temp) { say(c, pick(['tap !', 'à moi !'])); if (cible === m) { m.vx = c.face * 800; m.vy = -600; m.tgt = null; } return; }
    K.interrupt(c); c.q = [pose('affut', 0.5, { face: sgn(cible.x - c.x) || c.face }), K.hop(() => K.groundAt(K.inView(cible.x), c.d), { h: sc(c) * 1.1 }), pose('tape', 0.5), pose('assis', 1)]; say(c, pick(['!!', 'à moi !', 'là !'])); });
});

// les clics qui ne faisaient qu'un petit saut
H.click.push((x, y) => {
  const it = K.propAt(x, y); if (!it || it.held) return false;
  if (it.para) { it.pousse = (it.pousse || 0) + (sgn(it.x - x) || 1) * sOf(it.d) * 1.5; word(pick(['pof', 'fwoup']), x, y - 14, 16); return true; }
  if (it.kind === 'feuille' && !it.fall) { K.drop(it, rnd(-60, 60), sOf(it.d) * 1.6, rnd(-4, 4)); word(pick(['fshh', 'virevolte !']), x, y - 14, 14); return true; }
  const proche = () => Wd.cats.filter(c => K.free4(c) && !c.rare && !c.temp).sort((a, b) => Math.abs(a.x - it.x) - Math.abs(b.x - it.x))[0];
  if (it.kind === 'gamelle') { word(pick(['cling !', 'ding']), x, y - 14, 16); const c = proche(); if (c && reagit(c, [K.go(K.inView(it.x - sgn(it.x - c.x) * sc(c) * 0.5), { g: 'trot', face: sgn(it.x - c.x) }), pose('curieux', 1.2, { fx: c => say(c, pick(['miam ?', 'à manger ?'])) })])) {} }
  if (it.kind === 'eau') { word(pick(['plic ploc', 'splash']), x, y - 14, 15); const c = proche(); if (c && reagit(c, [K.go(K.inView(it.x - sgn(it.x - c.x) * sc(c) * 0.5), { face: sgn(it.x - c.x) }), pose('curieux', 1)])) say(c, pick(['de l’eau ?', 'hm ?'])); }
  if (it.kind === 'canape') Wd.cats.forEach(c => { if (c.perch && c.perch.it === it && reagit(c, [pose('sursaut', 0.6), pose('assis', rnd(1, 2))])) say(c, pick(['hé !', 'je dormais…', '?!'])); });
  return false;
});
// le colis poussé contre le bord : il rebondit
H.post.push(() => { Wd.props.forEach(b => { if (!b.para || !b.pousse) return; const m = b.box.w * b.s * 0.5 / Wd.W; if ((b.fx < m && b.pousse < 0) || (b.fx > 1 - m && b.pousse > 0)) { b.pousse = -b.pousse * 0.6; word('toc', b.x, b.y - b.s, 15); } }); });

return { reagit, dort };
})();
