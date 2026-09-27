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
  // le colis qui descend en parachute
  for (const b of Wd.props) { if (!b.para || b.a < 0.5) continue; const w = b.box.w * b.s * 0.6, top = b.y - b.box.h * b.s - b.s * 1.2;
    add('para', b, (x, y, m) => Math.abs(x - b.x) < w + m && y > top - m && y < b.y + m, b.d, b.x, top); }
  // les étagères du parcours
  const E = window.Parcours && Parcours.etageres(); if (E) E.L.forEach(e => add('etagere', e, (x, y, m) => Math.abs(x - e.x) < e.w * 0.5 + m && y > e.y - 6 - m && y < e.y + 14 + m, null, e.x, e.y));
  // les grandes feuilles de la jungle
  if (window.Jungle && Jungle.jungles) Jungle.jungles().forEach(it => it.parts.feuilles.forEach(f => { if (!f.on) return; const p = Jungle.centre(it, f), r = it.s * 0.2 * f.k;
    add('feuilleJ', { it, f }, (x, y, m) => Math.hypot(x - p[0], y - p[1]) < r + m, null, p[0], p[1]); }));
});
add('coureur', 'chat prop lance para'); add('piege', 'chat perche prop lance'); add('souris', 'chat');
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
REACT.etagere = (t, s, dir) => { const e = t.ref; e.wob = Wd.t; word(pick(['toc', 'tac', 'bonk']), t.x, t.y - 14, 15); renvoie(s, dir);
  Wd.cats.forEach(c => { if (c.task && c.task.k === 'etagere' && c.task.i === e.i) { say(c, pick(['!!', 'hé !', 'ça bouge !'])); c.task.anim = 'sursaut'; c.task.dur = Math.max(c.task.dur, c.task.t + 0.7); } }); };
REACT.feuilleJ = (t, s, dir) => { const { it, f } = t.ref; f.wob = Wd.t; if (Math.random() < 0.5) word(pick(['frrr', 'fshh', 'flap']), t.x, t.y - 14, 14);
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

return { reagit, dort };
})();
