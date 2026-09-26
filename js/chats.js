/* Le monde des chats : leurs animations (ANIMS), leur vie (le cerveau de chacun), le décor, la horde qui chasse la souris.
   Les chats vivent dans les deux stations (js/scenes.js : salut, jeu) : Chats.frame(S, a) une fois par image, Chats.draw(S, ctx)
   pour ce qui se dessine à la craie (les z du sommeil, la poussière, le nuage de la bagarre, le fil des pelotes).
   - Trois chats par défaut ; ils entrent, vivent (marchent, s'assoient, font leur toilette, dorment sur le coussin,
     se glissent dans le carton, mangent, grimpent à l'arbre, jouent à la pelote, s'étirent, se chamaillent), puis sortent ;
     d'autres entrent pour les remplacer.
   - Un clic dans le vide : un chat tombe du ciel à cet endroit, se retourne et retombe sur ses pattes (vingt au plus).
   - On attrape un chat par la peau du cou (glisser) : il pend, se balance ; lâché, il tombe, se retourne, atterrit.
     Un clic sur un chat : il ronronne. Un clic sur une pelote : elle roule.
   - De temps en temps, une souris traverse l'écran à toute allure, et une horde de chats la poursuit.
   Le sol : des couloirs (lane 0 devant, 1 au fond) — plus loin, c'est un peu plus haut, un peu plus petit, derrière. */
window.Chats = (() => {
if (!window.Chat || !window.Univers) return null;
const I = Chat.I, TAU = Math.PI * 2, { c01, sm, lerp } = Chat;
const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const rnd = (a, b) => a + Math.random() * (b - a), pick = L => L[Math.floor(Math.random() * L.length)];
const blink = t => ((t + 1.7) % 4.3) < 0.13 ? 1 : 0;

/* ——— les poses (et la planche : tools/planche.html) ———
   Chaque animation écrit la pose cible p du chat c au temps t ; certaines tournent aussi le corps entier (c.allT, c.rollT). */
// assis : le corps redressé, les fesses et les cuisses au sol, les pattes avant droites jusqu'au sol, la queue enroulée devant
function sit(c, p, lean) {
  const D = c.D; Chat.rest(c, p);
  const pitch = (D.a > 0.4 ? 0.45 : 1.2) + (lean || 0), co = Math.cos(pitch), si = Math.sin(pitch); p[I.pitch] = pitch; p[I.seat] = 1;
  const rear = -D.R(Math.PI) * si * 0.97, sy = D.seat[0] * si + D.seat[1] * co - D.seatR[1] * 0.98;
  p[I.y] = -Math.min(rear, sy) + 0.004;
  Chat.toGround(c, p, 'fl'); Chat.toGround(c, p, 'fr'); p[I.fl] += 0.05; p[I.hk] = 0.12;
  p[I.look] = 0.95; p[I.tailUp] = pitch - 0.12; p[I.tailSide] = 1; p[I.tailCurl] = 1.1; p[I.tailWave] = 0.3;
}
// couché : le ventre au sol, les pattes avant qui dépassent devant, les arrière rentrées
function lie(c, p) {
  const D = c.D; Chat.rest(c, p);
  p[I.y] = D.h * 0.92 + 0.01; p[I.sqz] = -0.06; p[I.fk] = p[I.fk2] = 0.55; p[I.fl] = p[I.fr] = 1.45; p[I.hk] = 0.12;
  p[I.look] = 0.95; p[I.tailUp] = -0.1; p[I.tailSide] = 1.2; p[I.tailCurl] = 0.6; p[I.tailWave] = 0.2;
}
const ANIMS = {
  // les allures : les petites pattes qui trottinent, le visage à moitié vers nous
  pas(c, p, t) { Chat.rest(c, p); Chat.gait(c, p, 'pas', t * 1.4, 1); p[I.look] = 0.6; p[I.tailPhase] = t * 3; },
  trot(c, p, t) { Chat.rest(c, p); Chat.gait(c, p, 'trot', t * 2, 1); p[I.look] = 0.45; p[I.tailUp] = 1.1; p[I.tailPhase] = t * 5; },
  galop(c, p, t) { Chat.rest(c, p); Chat.gait(c, p, 'galop', t * 2.6, 1); p[I.look] = 0.25; p[I.tailUp] = 0.3; p[I.tailCurl] = -0.2; p[I.tailPhase] = t * 8; p[I.px] = 1; },
  // assis : il regarde autour, cligne des yeux, la queue bat doucement
  assis(c, p, t) { sit(c, p); p[I.htilt] = Math.sin(t * 0.37) * 0.15; p[I.px] = Math.sin(t * 0.5); p[I.tailPhase] = t * 2; p[I.eyes] = blink(t); },
  // la toilette : assis, une patte levée vers la bouche, il lèche (yeux clos)
  toilette(c, p, t) { sit(c, p, -0.1); p[I.fr] = -p[I.pitch] + 2.2 + Math.sin(t * 12) * 0.12; p[I.fk2] = 0.9; p[I.htilt] = 0.25; p[I.eyes] = 1; p[I.mouth] = Math.sin(t * 12) > 0.5 ? 1 : 0; },
  // en boule, les yeux clos ; il respire
  dodo(c, p, t) { lie(c, p); p[I.sqz] = -0.1 + Math.sin(t * 1.5) * 0.03; p[I.y] -= 0.01; p[I.hy] = -c.D.h * 0.35; p[I.htilt] = -0.35; p[I.eyes] = 1; p[I.tailSide] = 2; p[I.tailCurl] = 1.4; p[I.fk] = p[I.fk2] = 0.35; },
  // en pain : les pattes rentrées, qui somnole
  pain(c, p, t) { lie(c, p); p[I.fk] = p[I.fk2] = 0.12; p[I.sqz] += Math.sin(t * 1.6) * 0.02; p[I.eyes] = (t % 5) < 2.4 ? 1 : blink(t); },
  // l'étirement : l'avant allongé au sol, les fesses en l'air ; il bâille
  etirement(c, p, t) {
    const u = (t % 4) / 4, a = sm(u / 0.15) * (1 - sm((u - 0.6) / 0.15)); Chat.rest(c, p);
    p[I.pitch] = -0.35 * a; p[I.stretch] = 0.25 * a; p[I.y] -= 0.02 * a; p[I.fl] = p[I.fr] = 1.1 * a; p[I.hl] = p[I.hr] = 0.35 * a; p[I.fk] = p[I.fk2] = 1 + 0.3 * a;
    p[I.mouth] = a > 0.8 ? 1 : 0; p[I.eyes] = a > 0.6 ? 1 : 0; p[I.tailUp] = 0.9 + 0.5 * a; p[I.hy] = -0.04 * a;
  },
  // à l'affût : tapi, l'arrière qui se dandine, le bout de la queue qui fouette, les pupilles sur la proie
  affut(c, p, t) { lie(c, p); p[I.y] += 0.02; p[I.pitch] = -0.08 + Math.sin(t * 16) * 0.04; p[I.hk] = 0.5; p[I.fl] = p[I.fr] = 0.9; p[I.look] = 0.5; p[I.px] = 1; p[I.tailUp] = 0.2; p[I.tailPhase] = t * 14; p[I.tailWave] = 1.4; },
  // un coup de patte
  tape(c, p, t) { sit(c, p, -0.2); const u = (t * 1.4) % 1, up = u < 0.3 ? sm(u / 0.3) : 1 - sm((u - 0.3) / 0.18); p[I.fr] += 1.7 * up; p[I.px] = 1; p[I.py] = -1; },
  // le gros dos : tout hérissé, sur la pointe des pattes, il feule
  feule(c, p, t) { Chat.rest(c, p); p[I.sqz] = 0.18; p[I.y] += 0.03; p[I.fk] = p[I.fk2] = p[I.hk] = 1.3; p[I.puff] = 0.9 + Math.sin(t * 20) * 0.05; p[I.mouth] = Math.sin(t * 3) > -0.3 ? 1 : 0; p[I.fl] = p[I.fr] = -0.15; p[I.hl] = p[I.hr] = 0.15; p[I.tailUp] = 1.6; p[I.tailCurl] = -0.6; p[I.tailWave] = 0.2; p[I.tailPhase] = t * 20; },
  // porté par la peau du cou : le corps pend sous la tête, les pattes ballantes, l'air résigné
  porte(c, p, t) {
    // le balancier (c.sw, sa vitesse c.swv : voir live) : les pattes et la queue traînent derrière le corps, il s'étire quand on le lève vite
    const P = c.pend || { th: 0, w: 0, vy: 0 }, sw = Math.sin(t * 3.1) * 0.06, lag = clamp(P.w * 0.22, -0.9, 0.9) * c.face, fast = Math.min(1, Math.abs(P.w) / 4 + Math.abs(P.th));
    Chat.rest(c, p); p[I.pitch] = 1.45 + sw * 0.3; p[I.stretch] = 0.12 + clamp(-P.vy / (sc(c) * 9), -0.08, 0.22); p[I.y] = 0; p[I.hx] = c.D.a < 0.4 ? c.D.a * 0.45 : 0.02; p[I.look] = 1 - fast * 0.4;
    p[I.fl] = -1.45 + sw - lag; p[I.fr] = -1.45 + sw - lag * 1.3; p[I.hl] = -1.3 - sw - lag * 1.2; p[I.hr] = -1.3 - sw - lag * 0.8; p[I.fk] = p[I.fk2] = p[I.hk] = 1.2 - fast * 0.25;
    p[I.eyes] = fast > 0.5 ? 0 : (t % 4) < 3 ? 0 : 1; p[I.py] = -1; p[I.px] = -clamp(P.th * 2, -1, 1) * c.face; p[I.mouth] = fast > 0.8 ? 1 : 0;
    p[I.tailUp] = -0.3 - clamp(P.vy / (sc(c) * 8), -0.4, 0.6); p[I.tailCurl] = -0.3 + lag * 1.5; p[I.tailWave] = 0.4 + fast * 1.4; p[I.tailPhase] = t * (2 + fast * 6);
    p[I.htilt] = -P.th * 0.4;
  },
  // la chute : les pattes écartées, la queue qui tourne, les yeux ronds, la bouche ouverte
  chute(c, p, t) { Chat.rest(c, p); p[I.fl] = 1.2; p[I.fr] = 0.9; p[I.hl] = -1.2; p[I.hr] = -0.9; p[I.sqz] = 0.08; p[I.tailUp] = 1.5; p[I.tailWave] = 1.5; p[I.tailPhase] = t * 9; p[I.py] = 1; p[I.mouth] = 1; p[I.look] = 1; },
  // en l'air (un saut) : tout étiré, pattes avant devant, arrière derrière
  saut(c, p, t) { Chat.rest(c, p); p[I.stretch] = 0.18; p[I.sqz] = -0.05; p[I.pitch] = 0.15; p[I.fl] = p[I.fr] = 1.3; p[I.hl] = p[I.hr] = -1.2; p[I.tailUp] = 0.35; p[I.look] = 0.4; },
  // l'atterrissage : écrasé sur ses petites pattes
  atterrit(c, p, t) { Chat.rest(c, p); p[I.sqz] = -0.2; p[I.y] = c.D.stand * 0.8; p[I.fk] = p[I.fk2] = p[I.hk] = 0.55; p[I.fl] = p[I.fr] = 0.3; p[I.hl] = p[I.hr] = -0.3; p[I.tailUp] = 1.1; },
  // l'escalade : debout contre le poteau, les pattes avant qui s'agrippent l'une après l'autre
  grimpe(c, p, t) { Chat.rest(c, p); p[I.pitch] = 1.35; p[I.y] = c.D.a * 0.9; p[I.fl] = 0.2 + Math.sin(t * 7) * 0.4; p[I.fr] = 0.2 - Math.sin(t * 7) * 0.4; p[I.hl] = -1.3 + Math.cos(t * 7) * 0.3; p[I.hr] = -1.3 - Math.cos(t * 7) * 0.3; p[I.look] = 0.6; p[I.py] = 1; p[I.tailUp] = -0.3; p[I.tailWave] = 0.7; p[I.tailPhase] = t * 3; },
  // il mange : la tête penchée vers la gamelle, qui hoche
  mange(c, p, t) { Chat.rest(c, p); p[I.pitch] = -0.12; p[I.hy] = -c.D.h * 0.5; p[I.hx] = 0.03; p[I.hnod] = 0.35 + Math.sin(t * 9) * 0.1; p[I.eyes] = 1; p[I.tailUp] = 1; },
  // il pétrit : les pattes avant qui poussent l'une après l'autre, les yeux ravis
  petrit(c, p, t) { Chat.rest(c, p); p[I.y] *= 0.92; ['fl', 'fr'].forEach((k, i) => { const u = Math.max(0, Math.sin(t * 5 + i * Math.PI)); p[I[k]] = 0.3 + u * 0.5; }); p[I.fk] = p[I.fk2] = 0.8; p[I.eyes] = 2; p[I.tailUp] = 1; p[I.tailCurl] = 1.1; },
  // il miaule : assis, la tête levée, la bouche qui s'ouvre
  miaule(c, p, t) { sit(c, p); p[I.hnod] = -0.3; p[I.mouth] = (t % 2.2) < 0.7 ? 1 : 0; p[I.eyes] = p[I.mouth] ? 1 : blink(t); },
  // il ronronne : assis, les yeux ravis, tout doucement secoué
  ronron(c, p, t) { sit(c, p); p[I.eyes] = 2; p[I.htilt] = 0.2 + Math.sin(t * 30) * 0.01; p[I.sqz] = Math.sin(t * 30) * 0.008; p[I.tailWave] = 0.3; p[I.tailPhase] = t * 1.5; }
};

/* ——— le monde : le sol, le décor, les chats ———
   Le sol est une bande en bas de l'écran (au-dessus de la barre du film), avec de la profondeur : d = 0 devant, d = 1 au fond
   (plus haut à l'écran, un peu plus petit, derrière). Tout ce qui vit dessus a un x (px), un d, une hauteur (lift, px).
   Chaque chat a un caractère (CARAC) : ses envies (dormir, manger, jouer, grimper, faire tomber des choses, se disputer…),
   son coin préféré, ses allures ; son cerveau (think) enchaîne des gestes (une file de pas : marcher, sauter, une pose). */
const Wd = { on: false, W: 0, H: 0, floor: 0, depth: 60, s0: 150, t: 0, f: 0, cats: [], props: [], fx: [], mode: '', a: 1,
  nextIn: 1.5, nextScen: 14, scen: 0, tower: null, clicks: 0, P: {}, kib: [], nextKib: 9, extras: [], nextExtra: 0 };
const TAU2 = Math.PI / 2, sgn = v => v < 0 ? -1 : 1, clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const zOf = d => (1 - d) * 6000, kOf = d => 1 - 0.16 * d, floorAt = d => Wd.floor - d * Wd.depth, sOf = d => Wd.s0 * kOf(d);
const grav = () => 2600 * Wd.s0 / 160;
const MAXC = 20;

/* ——— les caractères : chaque race a ses envies (des poids), sa démarche, son coin ———
   dort · mange · joue (pelote, poisson) · grimpe (l'arbre) · carton (se cacher dedans) · pousse (les caisses) · casse (fait tomber la tasse, la plante)
   · flane (se promener d'un coin à l'autre) · pose (toilette, s'étirer, miauler) · dispute (chercher la bagarre) · fou (la folie du soir : galoper) */
const CARAC = {
  boule:     { dort: 4, mange: 2, joue: 0.6, grimpe: 0.2, carton: 1, pousse: 0.3, casse: 0.3, flane: 1, pose: 2, dispute: 0.3, fou: 0.1, g: 'pas', coin: 'coussin' },
  grincheux: { dort: 1.5, mange: 1.5, joue: 0.2, grimpe: 0.6, carton: 0.8, pousse: 0.8, casse: 1.5, flane: 1, pose: 2.5, dispute: 2.5, fou: 0, g: 'pas', coin: 'niche' },
  long:      { dort: 1, mange: 0.8, joue: 1, grimpe: 2.5, carton: 0.6, pousse: 0.5, casse: 0.8, flane: 2, pose: 1.2, dispute: 0.4, fou: 0.8, g: 'trot', coin: 'plateau' },
  chaton:    { dort: 1.2, mange: 1, joue: 4, grimpe: 1, carton: 2, pousse: 0.6, casse: 1, flane: 1.2, pose: 1, dispute: 0.4, fou: 1.5, g: 'trot', coin: 'carton' },
  bleu:      { dort: 0.8, mange: 0.8, joue: 1.5, grimpe: 1.5, carton: 0.6, pousse: 1, casse: 1.2, flane: 2.5, pose: 1, dispute: 0.8, fou: 2, g: 'trot', coin: 'panier' },
  miche:     { dort: 2.5, mange: 3, joue: 0.5, grimpe: 0.3, carton: 1.2, pousse: 0.4, casse: 0.4, flane: 1, pose: 2, dispute: 0.3, fou: 0.1, g: 'pas', coin: 'gamelle' },
  rose:      { dort: 1.5, mange: 3, joue: 1.2, grimpe: 0.6, carton: 0.8, pousse: 0.4, casse: 0.6, flane: 1.2, pose: 2, dispute: 0.2, fou: 0.4, g: 'pas', coin: 'coussin' },
  tigre:     { dort: 1, mange: 1, joue: 1.5, grimpe: 1.2, carton: 0.8, pousse: 2.5, casse: 3, flane: 1.5, pose: 1, dispute: 1.5, fou: 0.8, g: 'trot', coin: 'caisse' },
  reveur:    { dort: 3, mange: 0.8, joue: 0.8, grimpe: 1, carton: 2, pousse: 0.2, casse: 0.2, flane: 1.2, pose: 2.5, dispute: 0.1, fou: 0.2, g: 'pas', coin: 'panier' }
};
const SPEED = { pas: 0.32, trot: 0.62, galop: 1.5 };

/* ——— la mise en page : le sol, la taille d'une unité ——— */
function measure(S) {
  if (S.W === Wd.W && S.H === Wd.H && Wd.floor) return false;
  Wd.W = S.W; Wd.H = S.H;
  const ui = document.querySelector('.film-ui'), top = ui ? ui.getBoundingClientRect().top : S.H - 60;
  const btn = document.querySelector('#enter'), bb = btn ? btn.getBoundingClientRect().bottom : S.H * 0.6;
  Wd.floor = Math.min(S.H - 30, top - 8);
  Wd.s0 = clamp(Math.min(S.W * (S.W < 760 ? 0.25 : 0.19), S.H * 0.19, (Wd.floor - bb) * 0.95), 64, 165);
  Wd.depth = Wd.s0 * 0.7;
  const mode = S.W >= 760 ? 'large' : 'etroit';
  if (mode !== Wd.mode) { Wd.mode = mode; layout(); }
  Wd.props.forEach(it => it.trail && (it.trail.length = 0));
  return true;
}

/* ——— le décor ——— */
function prop(kind, fx, d, o) {
  o = o || {}; const it = Univers.make(kind, o);
  Object.assign(it, { fx, d, dT: d, lift: 0, vx: 0, vy: 0, tiltV: 0, fall: false, on: null, onDx: 0, busy: null, fade: 1, fadeT: 1, spinA: 0, trail: it.r ? [] : null, col: o.color });
  it.tilt = 0; it.hull = it.box || HULL[kind] || { w: 0.3, h: 0.2 };
  if (o.yaw !== undefined) it.yaw = o.yaw;
  it.big = { distrib: 1.5, eau: 1.3 }[kind] || 1;   // le distributeur et la fontaine, un peu plus grands que nature
  Wd.props.push(it); return it;
}
function unprop(it) { Univers.destroy(it); const i = Wd.props.indexOf(it); if (i >= 0) Wd.props.splice(i, 1); Wd.props.forEach(o => { if (o.on === it) o.on = null; }); }
// l'encombrement de chaque objet (en unités) : pour tomber, rebondir, se poser sur une caisse, se laisser attraper
const HULL = { carton: { w: 0.56, h: 0.32 }, panier: { w: 0.72, h: 0.15 }, coussin: { w: 0.76, h: 0.15 }, gamelle: { w: 0.34, h: 0.08 }, eau: { w: 0.33, h: 0.17 },
  distrib: { w: 0.5, h: 0.9 }, arbre: { w: 1.5, h: 1.95 }, pelote: { w: 0.15, h: 0.15 }, poisson: { w: 0.3, h: 0.08 } };
// ce qu'on peut attraper (l'arbre et le distributeur sont trop lourds : ils tanguent), ce qu'un chat bouscule en passant
const LOURD = { arbre: 1, distrib: 1 }, LEGER = { pelote: 1, poisson: 1, tasse: 1, plante: 1 };
const COL = { orange: 0xd0661f, bleu: 0x2f6fb0, vert: 0x3a6e46, rose: 0xc04a6c, gris: 0x6a6c70 };
function layout() {
  Wd.props.slice().forEach(unprop); Wd.P = {}; Wd.extras = []; Wd.kib = []; const P = Wd.P, wide = Wd.mode === 'large';
  const ex = u => u * Wd.s0 / Wd.W;   // une largeur en unités → en fraction de l'écran
  // l'arbre à chat au bord gauche, tourné vers le centre ; le coin repos, les jouets devant, le carton et les caisses, la cuisine à droite
  P.arbre = prop('arbre', ex(0.8) + 0.012, 0.75, { yaw: 0.4 });
  if (wide) {
    P.coussin = prop('coussin', 0.25, 0.3);
    P.panier = prop('panier', 0.34, 0.85);
    P.pelote = prop('pelote', 0.45, 0.02);
    P.poisson = prop('poisson', 0.53, 0.12);
    P.carton = prop('carton', 0.6, 0.78);
    P.caisse = prop('caisse', 0.7, 0.5, { size: 2 });
    P.tasse = prop('tasse', 0, 0.5); stack(P.tasse, P.caisse, 0.12);
    P.caisse2 = prop('caisse', 0.77, 0.92, { size: 1 });
    P.plante = prop('plante', 0, 0.92); stack(P.plante, P.caisse2, -0.06);
    P.distrib = prop('distrib', 0.87, 0.85, { yaw: -0.55 });
    P.gamelle = prop('gamelle', 0.925, 0.45);
    P.eau = prop('eau', 0.95, 0.9);
  } else {
    P.coussin = prop('coussin', 0.5, 0.35);
    P.pelote = prop('pelote', 0.68, 0.0);
    P.carton = prop('carton', 0.56, 0.88);
    P.caisse = prop('caisse', 0.86, 0.55, { size: 1 });
    P.tasse = prop('tasse', 0, 0.55); stack(P.tasse, P.caisse, 0.1);
    P.distrib = prop('distrib', 0.76, 0.97, { yaw: -0.55 });
  }
  Wd.props.forEach(it => { it.home = { fx: it.fx, d: it.d, on: it.on, onDx: it.onDx }; });
}
function stack(it, on, dx) { it.on = on; it.onDx = dx; it.d = it.dT = on.d; }
const topOf = b => b.box ? b.box.h * sOf(b.d) * 0.98 : 0;
// le point le plus bas d'une caisse penchée (sous son pied), en px (négatif : sous le pivot)
function low(it) {
  if (it.r) return 0; const s = sOf(it.d), w = it.hull.w / 2, h = it.hull.h, sn = Math.sin(it.tilt), cs = Math.cos(it.tilt);
  return Math.min(-w * sn, w * sn, -w * sn + h * cs, w * sn + h * cs) * s;
}
// faire tomber un objet (de là où il est posé)
function drop(it, vx, vy, tv) { it.on = null; it.fall = true; it.vx = vx; it.vy = vy; it.tiltV = tv; it.down = Wd.t; }
function updProp(it, dt) {
  if (it._f === Wd.f) return; it._f = Wd.f;
  const s = sOf(it.d);
  if (it.held) {
    // dans la main : il suit le doigt, et penche un peu du côté d'où il vient
    const px = it.fx; it.fx = (it.hx - it.gdx) / Wd.W; it.lift = floorAt(it.d) - it.hy + it.gdy;
    it.vx = (it.fx - px) * Wd.W / Math.max(dt, 1 / 120); if (!it.r) it.tilt += (clamp(-it.vx * 0.0012, -0.6, 0.6) - it.tilt) * Math.min(1, dt * 8);
  } else if (it.on) {
    const b = it.on; updProp(b, dt); it.d = it.dT = b.d;
    const p = Univers.at(b, [it.onDx, b.box ? b.box.h : 0, 0]); it.fx = p[0] / Wd.W; it.lift = floorAt(it.d) - p[1];
    if (b.fall || Math.abs(b.tilt || 0) > 0.25) drop(it, b.vx * 0.8, Math.max(0, b.vy), (b.tiltV || 0) * 0.6 + rnd(-2, 2));
  } else if (it.fall) {
    it.vy -= grav() * dt; it.lift += it.vy * dt; it.fx += it.vx * dt / Wd.W; if (!it.r) it.tilt += it.tiltV * dt;
    it.d += (it.dT - it.d) * Math.min(1, dt * 3);
    if (it.target && it.vy < 0) { const b = it.target, top = b.lift + topOf(b); if (it.lift <= top) { it.lift = top; stack(it, b, (it.fx - b.fx) * Wd.W / s); it.fall = false; it.target = null; it.vy = 0; it.tilt = 0; it.tiltV = 0; dust(it.fx * Wd.W, floorAt(it.d) - top, s * 0.3, 0.5); } }
    // se poser sur une caisse en tombant (une caisse plus large que soi, sous soi)
    if (it.fall && !it.target && it.vy < 0 && !it.tower) for (const b of Wd.props) {
      if (!b.box || b === it || b.fall || b.held || b.fade < 0.5 || Math.abs(b.d - it.d) > 0.2 || it.hull.w > b.box.w * 1.3) continue;
      let k = b; while (k && k !== it) k = k.on; if (k === it) continue;
      const top = b.lift + topOf(b), dx = (it.fx - b.fx) * Wd.W / s;
      if (Math.abs(dx) < b.box.w / 2 && it.lift - it.vy * dt >= top - 2 && it.lift <= top) { stack(it, b, dx); it.fall = false; it.vy = it.vx = it.tiltV = 0; it.tilt = 0; dust(it.fx * Wd.W, floorAt(b.d) - top, s * 0.2, 0.4); break; }
    }
    const lo = low(it);
    if (it.fall && it.lift + lo <= 0) {
      it.lift = -lo;
      if (it.tower && it.tower.phase === 'pile') { it.fall = false; it.vy = it.vx = it.tiltV = 0; it.tilt = 0; it.lift = 0; dust(it.fx * Wd.W, floorAt(it.d), s * 0.5, 0.8); }
      else if (it.vy < -s * 1.6) { dust(it.fx * Wd.W, floorAt(it.d), s * 0.4, 0.8); it.vy = -it.vy * 0.28; it.vx *= 0.6; it.tiltV *= 0.45; }
      else {
        it.vy = 0; it.vx *= Math.exp(-dt * 7);
        if (!it.r) { const q = it.box ? Math.round(it.tilt / TAU2) * TAU2 : 0; it.tiltV = (q - it.tilt) * 9; if (Math.abs(q - it.tilt) < 0.01 && Math.abs(it.vx) < 4) { it.tilt = q; it.tiltV = 0; it.fall = false; it.lift = -low(it); it.vx = 0; } }
        else if (Math.abs(it.vx) < 4) { it.fall = false; it.vx = 0; it.tilt = 0; }
      }
    }
  } else if (it.vx) {
    // glisser, rouler : le frottement
    it.fx += it.vx * dt / Wd.W; it.vx *= Math.exp(-dt * (it.r ? 1.1 : 6)); if (Math.abs(it.vx) < 3) it.vx = 0;
  }
  // les bords de l'écran : la pelote rebondit, le reste s'arrête
  const m = (it.r || it.hull.w / 2) * s * (it.big || 1) / Wd.W;
  // les lourds tanguent (un chat qui saute dessus, un coup de doigt, une salve de croquettes)
  if (LOURD[it.kind]) { const u = Wd.t - (it.wob ?? -9); it.tilt = Math.sin(u * 13) * 0.045 * (it.wobA || 1) * Math.exp(-u * 3); }
  if (!it.run && it.fx < m) { it.fx = m; it.vx = Math.abs(it.vx) * (it.r ? 0.6 : 0); }
  if (!it.run && it.fx > 1 - m) { it.fx = 1 - m; it.vx = -Math.abs(it.vx) * (it.r ? 0.6 : 0); }
  // la pelote : elle tourne en roulant et laisse son fil derrière elle
  if (it.r) {
    const x = it.fx * Wd.W; if (it.px !== undefined) it.spinA -= (x - it.px) / (it.r * s); it.px = x;
    it.spin.setFromAxisAngle(ZA, it.spinA);
    const T = it.trail, y = floorAt(it.d) - it.lift, L = T[T.length - 1];
    if (!L || Math.hypot(L[0] - x, L[1] - y) > 7) { T.push([x, y]); if (T.length > 60) T.shift(); }
  }
  if (it.parts.jar) { const u = Wd.t - (it.shake ?? -9); it.parts.jar.rotation.z = Math.sin(u * 32) * 0.14 * Math.exp(-u * 3.5); it.parts.jar.position.y = 0.46 + Math.max(0, Math.sin(u * 16)) * 0.03 * Math.exp(-u * 4); }
  if (it.parts.pompon) it.parts.pompon.rotation.z = Math.sin(Wd.t * 2.2) * 0.25 + (it.poke ? Math.sin((Wd.t - it.poke) * 14) * Math.exp(-(Wd.t - it.poke) * 2) * 0.8 : 0);
  it.fade += (it.fadeT - it.fade) * Math.min(1, dt * 3);
  it.s = s * (it.big || 1); it.x = it.fx * Wd.W; it.y = floorAt(it.d) - it.lift; it.z = zOf(it.d) + (it.zo || 0); it.a = it.fade * Wd.a;
  Univers.place(it);
}
const ZA = new Obj3D.T.Vector3(0, 0, 1);

/* ——— les chats ——— */
function freeD() {
  // les chats vont surtout devant (le décor est plutôt au fond : sinon, un chat du fond semble posé sur une caisse de devant)
  const C = []; for (let d = 0; d <= 0.451; d += 0.05) if (Wd.props.every(p => p.run || p.r || Math.abs(p.d - d) > 0.07)) C.push(d);
  return C.length ? pick(C) : Math.random();
}
function addCat(o) {
  o = o || {};
  const id = o.id || (() => { const here = new Set(Wd.cats.map(c => c.breed)), free = Chat.IDS.filter(i => !here.has(i)); return pick(free.length ? free : Chat.IDS); })();
  const c = Chat.create(id);
  Object.assign(c, { d: o.d ?? freeD(), q: [], task: null, anim: 'assis', at: Math.random() * 10, perch: null, born: Wd.t, stay: rnd(45, 100), vx: 0, vy: 0,
    temp: !!o.temp, zo: (c.id % 6) * 70, ch: CARAC[id] || CARAC.tigre, claims: [], held: false, fall: false, jump: null, hidden: 0, mood: 0 });
  c.x = o.x ?? Wd.W / 2; c.face = o.face || (Math.random() < 0.5 ? -1 : 1); c.s = sOf(c.d); c.y = floorAt(c.d);
  Wd.cats.push(c); return c;
}
function unCat(c) { free(c); Chat.destroy(c); const i = Wd.cats.indexOf(c); if (i >= 0) Wd.cats.splice(i, 1); }
const sc = c => c.s * c.b.s;
const front = c => (c.D.head[0] + c.b.head[0] * 0.7) * sc(c) * 0.94;
const back = c => c.D.R(Math.PI) * sc(c) * 0.94;
const residents = () => Wd.cats.filter(c => !c.temp);
// libérer tout ce que le chat occupait (un coussin, le carton…), vider ses projets
function free(c) { c.claims.forEach(p => { if (p.busy === c) p.busy = null; }); c.claims = []; }
function interrupt(c) { free(c); c.q = []; c.task = null; c.jump = null; c.perch = null; c.fight = null; c.busyAct = false; }
function claim(c, p) { p.busy = c; c.claims.push(p); }

/* les gestes : une file de pas (c.q) ; chacun dure jusqu'à ce qu'il soit fait */
const go = (x, o) => Object.assign({ k: 'walk', x }, o);
const pose = (anim, dur, o) => Object.assign({ k: 'pose', anim, dur }, o);
const hop = (to, o) => Object.assign({ k: 'jump', to }, o);
const fn = f => ({ k: 'fn', f });
const STEPS = {
  walk(c, T, dt) {
    const tx = typeof T.x === 'function' ? T.x() : T.x, g = T.g || c.ch.g, v = SPEED[g] * sc(c) * (T.v || 1), dx = tx - c.x;
    if (T.d !== undefined) c.d += clamp(T.d - c.d, -dt * 0.6, dt * 0.6);
    c.anim = g; c.perch = null;
    if (Math.abs(dx) <= v * dt + 0.5) { c.x = tx; if (T.d === undefined || Math.abs(T.d - c.d) < 0.01) { if (T.face) c.face = T.face; return true; } return false; }
    c.face = sgn(dx); c.x += c.face * v * dt; return false;
  },
  pose(c, T) { c.anim = T.anim; if (T.face) c.face = T.face; if (T.t < 0.02 && T.fx) T.fx(c); return T.t >= T.dur; },
  jump(c, T) {
    if (!c.jump) { const to = T.to(); const H = T.h ?? Math.max(0.25 * sc(c), Math.abs(to.y - c.y) * 0.35 + 0.25 * sc(c));
      c.jump = { x0: c.x, y0: c.y, z0: c.z, d0: c.d, to, H, dur: T.dur ?? clamp(0.45 + Math.hypot(to.x - c.x, to.y - c.y) / (sc(c) * 5), 0.45, 1), zr: T.zr || [0, 0.5] };
      c.perch = null; if (Math.abs(to.x - c.x) > 2) c.face = sgn(to.x - c.x); }
    const J = c.jump, to = T.live ? T.to() : J.to, u = Math.min(1, T.t / J.dur), zu = sm((u - J.zr[0]) / (J.zr[1] - J.zr[0]));
    c.x = lerp(J.x0, to.x, u); c.y = lerp(J.y0, to.y, u) - J.H * 4 * u * (1 - u); c.d = lerp(J.d0, to.d, u); c.zj = lerp(J.z0, to.z, zu);
    c.anim = u < 0.12 ? 'atterrit' : u > 0.85 ? 'atterrit' : 'saut';
    if (u >= 1) { c.jump = null; c.zj = null; c.perch = to.perch || null; if (c.perch && LOURD[c.perch.it.kind]) { c.perch.it.wob = Wd.t; c.perch.it.wobA = 0.5; } if (!c.perch) c.y = floorAt(c.d); dust(c.x, c.y, sc(c) * 0.25, 0.35); return true; }
    return false;
  },
  fn(c, T) { T.f(c); return true; },
  climb(c, T) {
    // grimper au poteau de l'arbre : dressé contre lui, il monte
    const tr = T.tree, top = Univers.at(tr, [tr.post.x, tr.post.y1 - 0.1, 0]), bot = floorAt(c.d);
    c.anim = 'grimpe'; c.face = T.face; const v = sc(c) * 0.5; c.y = Math.max(top[1] + sc(c) * 0.05, c.y - v * (T.dt || 0.016));
    return c.y <= top[1] + sc(c) * 0.06 || T.t > 6;
  },
  push(c, T, dt) {
    const b = T.box; c.anim = 'pas'; c.face = T.dir;
    const v = SPEED.pas * sc(c) * 0.55, m = b.box.w / 2 * sOf(b.d) / Wd.W, nx = b.fx + T.dir * v * dt / Wd.W;
    if (nx < m || nx > 1 - m || b.fall || b.on) return true;
    b.fx = nx; c.x += T.dir * v * dt; c.pushing = 1;
    return T.t >= T.dur;
  },
  wait(c, T) { c.anim = T.anim || 'assis'; return T.until(c) || T.t > (T.max || 8); }
};
// où poser un chat sur un perchoir (dx : en unités, le long du perchoir)
function perchAt(it, pe, dx) { const p = Univers.at(it, [pe.p[0] + (dx || 0), pe.p[1], pe.p[2]]); return { x: p[0], y: p[1], z: p[2], d: it.d, perch: { it, pe, dx: dx || 0 } }; }
const groundAt = (x, d) => ({ x, y: floorAt(d), z: zOf(d), d });
// se placer à côté d'une chose (tx) pour la regarder : à sa gauche ou à sa droite, selon d'où l'on vient
function beside(c, tx, gap) { const side = c.x < tx ? -1 : 1; return { x: tx + side * (front(c) + gap), face: -side }; }
const xOf = it => it.fx * Wd.W;
const inView = x => clamp(x, Wd.W * 0.04, Wd.W * 0.96);

/* ——— le cerveau : quand il n'a plus rien à faire, il choisit selon son caractère ——— */
function think(c) {
  const ch = c.ch, P = Wd.P;
  if (c.perch) { c.q.push(pose('assis', rnd(1, 2)), hop(() => groundAt(inView(c.x + rnd(-1, 1) * sc(c)), freeD()))); return; }
  if (c.temp) { leave(c); return; }
  if (Wd.t - c.born > c.stay) { leave(c); return; }
  const O = [], add = (w, f) => { if (w > 0 && f) O.push([w, f]); };
  // le coin préféré : un bonus pour ce qui s'y rapporte
  const fav = k => ch.coin === k ? 2 : 1;
  const all = k => Wd.props.filter(p => p.kind === k && !p.busy && !p.fall && p.fade > 0.9);
  const beds = all('coussin').concat(all('panier'));
  if (beds.length) add(ch.dort * (beds.some(b => ch.coin === b.kind) ? 2 : 1), () => sleep(c, beds.find(b => ch.coin === b.kind) || pick(beds)));
  const food = all('gamelle').concat(all('distrib'));
  if (food.length) add(ch.mange * fav('gamelle'), () => eat(c, pick(food)));
  const water = all('eau'); if (water.length) add(ch.mange * 0.7 + 0.4, () => eat(c, pick(water), true));
  if (Wd.kib.some(k => k.rest && !k.who)) add(7, () => crunch(c));
  const toys = all('pelote').concat(all('poisson'));
  if (toys.length) add(ch.joue, () => play(c, pick(toys)));
  if (P.arbre && P.arbre.perches.some(p => !p.busy)) add(ch.grimpe * (['plateau', 'niche'].includes(ch.coin) ? 2 : 1), () => climb(c, P.arbre));
  const cartons = all('carton'); if (cartons.length) add(ch.carton * fav('carton'), () => hide(c, pick(cartons)));
  const boxes = Wd.props.filter(p => p.kind === 'caisse' && !p.on && !p.fall && !p.busy && !p.tower && Math.abs(p.tilt) < 0.01);
  if (boxes.length) add(ch.pousse * fav('caisse'), () => push(c, pick(boxes)));
  const knock = Wd.props.filter(p => (p.kind === 'tasse' || p.kind === 'plante') && p.on && !p.on.busy && !p.on.fall && !p.on.tower);
  if (knock.length) add(ch.casse * 1.3, () => smash(c, pick(knock)));
  // le distributeur : on peut aller appuyer sur son gros bouton
  const dis = all('distrib'); if (dis.length) add(0.5 + ch.mange * 0.3, () => press(c, pick(dis)));
  add(ch.flane, () => stroll(c));
  add(ch.pose, () => idle(c));
  const foe = Wd.cats.find(o => o !== c && !o.temp && free4(o) && Math.abs(o.x - c.x) < Wd.W * 0.5);
  if (foe && Wd.t > 6) add(ch.dispute * (foe.ch.dispute + 0.5) * 0.5, () => quarrel(c, foe));
  add(ch.fou * 0.5, () => zoomies(c));
  let w = O.reduce((a, o) => a + o[0], 0) * Math.random();
  for (const [k, f] of O) { w -= k; if (w <= 0) return f(); }
  idle(c);
}
// libre : au sol, sans projet engagé (assis, flânerie), pas porté, pas en l'air
const free4 = c => !c.held && !c.fall && !c.jump && !c.perch && !c.fight && (!c.task || c.task.k === 'pose' || c.task.k === 'walk') && !c.claims.length && !c.busyAct;

function stroll(c) {
  // d'un coin à l'autre : vers un objet (s'y arrêter, renifler), ou juste ailleurs
  const P = Wd.props.filter(p => !p.run && !p.fall);
  const tx = Math.random() < 0.6 && P.length ? xOf(pick(P)) + rnd(-1, 1) * sc(c) : rnd(0.08, 0.92) * Wd.W;
  c.q.push(go(inView(tx), { d: freeD(), g: Math.random() < 0.25 ? 'trot' : c.ch.g }), pose(pick(['assis', 'assis', 'toilette', 'miaule']), rnd(1.5, 3.5), { fx: c => c.anim === 'miaule' && say(c, 'miaou') }));
}
function idle(c) {
  const a = pick(['assis', 'assis', 'toilette', 'etirement', 'miaule', 'pain', 'toilette']);
  c.q.push(pose(a, a === 'etirement' ? 4 : a === 'pain' ? rnd(5, 9) : rnd(2.5, 6)));
  if (a === 'miaule') c.q[c.q.length - 1].fx = c => say(c, 'miaou');
}
function sleep(c, bed) {
  claim(c, bed); const pe = bed.perches[0], b = beside(c, xOf(bed), sc(c) * 0.3);
  c.q.push(go(b.x, { d: Math.max(0, bed.d - 0.12) }), hop(() => perchAt(bed, pe, 0), { zr: [0, 0.4] }),
    pose('petrit', rnd(1.5, 3), { fx: c => say(c, '♥') }), pose('dodo', rnd(10, 20), { zzz: 1 }), pose('etirement', 2.5), pose('assis', 1),
    hop(() => groundAt(inView(xOf(bed) + sgn(Math.random() - 0.5) * sc(c) * 0.9), Math.max(0, bed.d - 0.15))), fn(free));
}
function eat(c, g, drink) {
  claim(c, g); const w = g.kind === 'distrib' ? 0.3 : g.kind === 'eau' ? 0.16 : -0.1;
  c.q.push(fn(c => { const b = beside(c, xOf(g), sc(c) * w); c.q.unshift(go(b.x, { d: Math.max(0, g.d - 0.04), face: b.face })); }),
    pose('mange', rnd(3.5, 6), { fx: c => say(c, drink ? 'lap lap' : 'miam') }), pose('toilette', rnd(2, 3)), fn(free));
}
// appuyer sur le bouton du distributeur (debout contre lui, un coup de patte) : ça crache
function press(c, g) {
  claim(c, g);
  c.q.push(fn(c => { const b = beside(c, xOf(g), sc(c) * 0.22); c.q.unshift(go(b.x, { d: Math.max(0, g.d - 0.05), face: b.face })); }),
    pose('tape', 0.9, { fx: c => setTimeout(() => fire(g, c), 300) }), pose('affut', 1), fn(free));
}
// les croquettes au sol : aller les manger, une à une
function crunch(c) {
  const K = Wd.kib.filter(k => k.rest && !k.who); if (!K.length) return idle(c);
  const k = K.sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0]; k.who = c;
  c.q.push(fn(c => { const b = beside(c, k.x, -sc(c) * 0.12); c.q.unshift(go(inView(b.x), { d: clamp(k.d, 0, 0.75), face: b.face, g: 'trot' })); }),
    pose('mange', rnd(0.9, 1.6), { fx: c => { say(c, 'crounch'); setTimeout(() => { k.gone = true; }, 500); } }),
    fn(c => { if (Wd.kib.some(k => k.rest && !k.who && Math.abs(k.x - c.x) < sc(c) * 1.5) && Math.random() < 0.8) crunch(c); }));
}
function play(c, toy) {
  claim(c, toy); const n = toy.kind === 'pelote' ? 2 + Math.floor(Math.random() * 3) : 1;
  for (let i = 0; i < n; i++) c.q.push(
    fn(c => { const b = beside(c, xOf(toy), sc(c) * 0.5); c.q.unshift(go(b.x, { d: Math.max(0, toy.d - 0.04), face: b.face, g: 'trot' }), pose('affut', rnd(0.8, 1.6))); }),
    hop(() => groundAt(xOf(toy) - c.face * (front(c) + sc(c) * 0.02), c.d), { h: sc(c) * 0.3 }),
    pose('tape', 0.55, { fx: c => setTimeout(() => kick(toy, c.face), 180) }));
  c.q.push(pose('assis', 1.5), fn(free));
}
function kick(it, dir) {
  if (!it || it.fall) return; const s = sOf(it.d);
  if (it.r) { it.vx = dir * s * rnd(1.8, 3); it.fall = true; it.vy = s * rnd(0.4, 0.9); }
  else { it.vx = dir * s * rnd(1.2, 2); it.fall = true; it.vy = s * rnd(0.8, 1.4); it.tiltV = 0; }
}
function climb(c, tr) {
  // l'arbre à chat : choisir une place libre (plutôt en haut), y monter de plateforme en plateforme (ou en grimpant au poteau),
  // y rester (dormir dans le panier), puis redescendre de la même façon
  const open = tr.perches.filter(p => !p.busy); if (!open.length) return stroll(c);
  const goal = pick(open.filter(p => p.lv >= 2).concat(open)); claim(c, goal);
  const path = []; for (let lv = 1; lv < goal.lv; lv++) { const o = tr.perches.filter(p => p.lv === lv && p !== goal && !p.busy); if (o.length) path.push(pick(o)); }
  const sc0 = sc(c), up = (pe, h) => hop(() => perchAt(tr, pe, 0), { h: sc0 * (h || 0.3), zr: [0, 0.4] });
  const first = path[0] || goal, fx = () => Univers.at(tr, first.p)[0] + sc0 * 0.7;
  if (first.id === 'plateau' && Math.random() < 0.45) {
    // grimper au poteau, dressé contre lui
    const px = () => Univers.at(tr, [tr.post.x, 0.3, 0])[0];
    c.q.push(fn(c => c.q.unshift(go(px() + front(c) * 0.7, { d: Math.max(0, tr.d - 0.1), face: -1 }))), { k: 'climb', tree: tr, face: -1 }, up(first, 0.15));
  } else c.q.push(fn(c => c.q.unshift(go(inView(fx()), { d: Math.max(0, tr.d - 0.12), face: -1 }))), pose('affut', rnd(0.4, 0.9)), up(first));
  path.slice(first === goal ? 0 : 1).forEach(pe => c.q.push(pose(pick(['assis', 'affut']), rnd(0.3, 1)), up(pe)));
  if (goal !== first) c.q.push(pose('affut', 0.5), up(goal));
  c.q.push(pose(goal.id === 'panier' ? 'dodo' : pick(['assis', 'pain', 'toilette', 'assis']), rnd(6, 14), goal.id === 'panier' ? { zzz: 1 } : {}), pose('assis', 1.2));
  // redescendre : de marche en marche, puis le saut au sol
  path.slice().reverse().forEach(pe => c.q.push(hop(() => perchAt(tr, pe, 0), { h: sc0 * 0.15 }), pose('affut', 0.3)));
  c.q.push(hop(() => groundAt(inView(xOf(tr) + sOf(tr.d) * 0.7 + sc0 * rnd(0.8, 1.6)), Math.max(0, tr.d - rnd(0.2, 0.5)))), pose('atterrit', 0.3), fn(free));
}
function hide(c, box) {
  claim(c, box); const pe = box.perches[0];
  c.q.push(fn(c => { const b = beside(c, xOf(box), sc(c) * 0.55); c.q.unshift(go(b.x, { d: Math.max(0, box.d - 0.1), face: b.face })); }), pose('affut', 0.7),
    hop(() => perchAt(box, pe, 0), { zr: [0, 0.35] }), pose('pain', rnd(3, 5)), pose('assis', rnd(2, 4)), pose('pain', rnd(3, 8)),
    hop(() => groundAt(inView(xOf(box) + sgn(Math.random() - 0.5) * sc(c) * 1.1), Math.max(0, box.d - 0.2)), { zr: [0.3, 0.65] }), fn(free));
}
function push(c, b) {
  claim(c, b); const dir = Math.random() < 0.5 ? -1 : 1;
  c.q.push(fn(c => { const s = sOf(b.d), x = xOf(b) - dir * (b.box.w / 2 * s + front(c) - sc(c) * 0.02); c.q.unshift(go(x, { d: b.d, face: dir })); }),
    pose('affut', 0.5), { k: 'push', box: b, dir, dur: rnd(1.2, 2.6) }, pose('assis', 1.5), fn(free));
}
function smash(c, item) {
  // grimper sur la caisse, regarder la tasse, nous regarder, et… pousser
  const b = item.on; claim(c, b); const dir = sgn(item.onDx) || 1;
  c.q.push(fn(c => { const s = sOf(b.d), x = xOf(b) - dir * (b.box.w / 2 * s + front(c) * 0.6); c.q.unshift(go(x, { d: Math.max(0, b.d - 0.06), face: dir })); }),
    hop(() => perchAt(b, b.perches[0], -dir * 0.07), { live: true, zr: [0, 0.4] }), fn(c => { c.face = dir; }),
    pose('assis', 1.2), pose('tape', 0.4), pose('assis', 0.8, { face: dir }), pose('tape', 0.6, { fx: c => setTimeout(() => { if (item.on === b) { drop(item, dir * sOf(b.d) * 1.1, sOf(b.d) * 0.7, -dir * rnd(5, 8)); } }, 250) }),
    pose('assis', 2.5, { fx: c => say(c, '!') }), hop(() => groundAt(inView(xOf(b) - dir * sc(c) * 1.2), Math.max(0, b.d - 0.15))), fn(free));
}
function zoomies(c) {
  // la folie : il galope d'un bout à l'autre, deux ou trois fois
  const n = 2 + Math.floor(Math.random() * 2);
  c.q.push(pose('affut', 0.8));
  for (let i = 0; i < n; i++) c.q.push(go(() => (i % 2 ? 0.1 : 0.9) * Wd.W, { g: 'galop', d: freeD() }));
  c.q.push(pose('assis', 2));
}
// la dispute : ils se font face, le gros dos, ça feule… puis le nuage de bagarre ; l'un s'en va, l'autre boude
function quarrel(c, o) {
  interrupt(c); interrupt(o); c.busyAct = o.busyAct = true;
  const mid = inView((c.x + o.x) / 2), d = (c.d + o.d) / 2, gap = sc(c) * 0.25;
  const bx = side => mid + side * (front(side < 0 ? c : o) + gap);
  const L = c.x < o.x ? [c, o] : [o, c];
  const dur = rnd(1.2, 2);
  L.forEach((k, i) => { const side = i ? 1 : -1; k.q.push(go(bx(side), { d, g: 'trot', face: -side }), { k: 'wait', anim: 'feule', until: () => L.every(x => x.task && x.task.k === 'wait'), max: 10 }, pose('feule', dur, { face: -side, fx: k => say(k, i ? 'pfff !' : 'grrr', -0.3) })); });
  L[0].q.push({ k: 'wait', anim: 'feule', until: () => !!L[0].fight, max: 2 });
  L[1].q.push(fn(() => fight(L)));
}
function fight(L) {
  const x = (L[0].x + L[1].x) / 2, y = floorAt(L[0].d) - sc(L[0]) * 0.35, dur = rnd(2.2, 3.4), F = { L, x, end: Wd.t + dur };
  L.forEach(k => { k.q = []; k.task = null; k.fight = F; k.hidden = 1; });
  Wd.fx.push({ k: 'bagarre', x, y, r: sc(L[0]) * 0.75, t0: Wd.t, life: dur, seed: Math.floor(Math.random() * 99) });
}
// la fin de la bagarre : l'un file sans demander son reste, l'autre boude
function endFight(F) {
  const [win, lose] = Math.random() < 0.5 ? F.L : [F.L[1], F.L[0]];
  F.L.forEach((k, i) => { k.fight = null; k.hidden = 0; k.busyAct = false; k.x = F.x + (i ? 1 : -1) * sc(k) * 0.4; });
  const away = lose === F.L[0] ? -1 : 1;
  lose.q = [go(inView(lose.x + away * Wd.W * 0.35), { g: 'galop' }), pose('toilette', 3)]; lose.stay = Math.min(lose.stay, Wd.t - lose.born + rnd(4, 20));
  win.q = [pose('assis', 0.6, { face: away, fx: k => say(k, 'hmpf') }), pose('toilette', 3)];
  dust(F.x, floorAt(win.d), sc(win) * 0.6, 1);
}
function leave(c) {
  const side = c.x < Wd.W / 2 ? -1 : 1;
  c.q.push(go(side < 0 ? -sc(c) * 1.3 : Wd.W + sc(c) * 1.3, { g: c.temp ? 'galop' : c.ch.g }), fn(c => { c.gone = true; }));
}
function enter() {
  const side = Math.random() < 0.5 ? -1 : 1, c = addCat({ face: -side });
  c.x = side < 0 ? -sc(c) * 1.2 : Wd.W + sc(c) * 1.2;
  c.q.push(go(rnd(0.15, 0.85) * Wd.W, {}), pose(Math.random() < 0.5 ? 'miaule' : 'assis', 2, { fx: c => c.anim === 'miaule' && say(c, 'miaou') }));
  return c;
}

/* ——— une image de vie pour un chat ——— */
function live(c, dt) {
  c.at += dt; c.pushing = 0;
  if (c.held) {
    c.anim = 'porte';
    // un corps, pas un bloc : pendu par la peau du cou, il se balance ; la main accélère, le corps traîne, puis revient (un pendule amorti)
    const P = c.pend || (c.pend = { th: 0, w: 0, px: c.hx, py: c.hy, vx: 0, vy: 0, ax: 0 }), h = Math.max(dt, 1 / 120);
    const vx = (c.hx - P.px) / h, vy = (c.hy - P.py) / h; P.px = c.hx; P.py = c.hy;
    const nvx = P.vx + (vx - P.vx) * Math.min(1, dt * 18), ax = (nvx - P.vx) / h; P.vx = nvx; P.vy += (vy - P.vy) * Math.min(1, dt * 12); P.ax += (ax - P.ax) * Math.min(1, dt * 20);
    const L = sc(c) * 0.55, g = grav() * 0.35;
    P.w += (-(g / L) * Math.sin(P.th) - (P.ax / L) * Math.cos(P.th) - P.w * 2.2) * dt; P.th = clamp(P.th + P.w * dt, -1.35, 1.35);
    if (Math.abs(P.th) >= 1.35) P.w *= -0.3;
    // le corps (la rotation z du corps est inversée quand il regarde à gauche) ; il se retourne s'il part fort dans l'autre sens
    if (Math.abs(P.vx) > sc(c) * 3 && sgn(P.vx) === -c.face && Math.abs(P.th) < 0.5) c.face = sgn(P.vx);
    c.spin = P.th * c.face;
  }
  else if (c.fall) {
    c.vy += grav() * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.anim = 'chute';
    c.spin = c.spin * Math.exp(-dt * 7);
    if (c.x < 10 || c.x > Wd.W - 10) { c.x = clamp(c.x, 10, Wd.W - 10); c.vx *= -0.5; }
    const g = floorAt(c.d);
    if (c.y >= g && c.vy > 0) { c.y = g; c.fall = false; c.spin = 0; c.vx = 0; dust(c.x, g, sc(c) * 0.45, 0.9);
      c.q = [pose('atterrit', 0.35), pose(Math.random() < 0.5 ? 'assis' : 'toilette', rnd(1, 2.5))]; c.task = null; }
  } else if (c.fight) { c.anim = 'feule'; if (Wd.t >= c.fight.end) endFight(c.fight); }
  else {
    if (!c.task) { if (!c.q.length) think(c); c.task = c.q.shift() || pose('assis', 1); c.task.t = 0; }
    c.task.t += dt; c.task.dt = dt;
    if (STEPS[c.task.k](c, c.task, dt)) c.task = null;
    if (c.gone) { unCat(c); return; }
  }
  // sur un perchoir : il suit son objet (qui peut glisser, pencher, tomber)
  if (c.perch) { const { it, pe, dx } = c.perch;
    if (it.fall || it.held || !Wd.props.includes(it)) { const vx = it.vx || 0; interrupt(c); c.hidden = 0; c.fall = true; c.vx = vx; c.vy = -sOf(it.d) * 0.6; }
    else { const p = Univers.at(it, [pe.p[0] + dx, pe.p[1], pe.p[2]]); c.x = p[0]; c.y = p[1]; c.zp = p[2]; c.d = it.d; } }
  else c.zp = null;
  if (!c.perch && !c.jump && !c.fall && !c.held && !(c.task && c.task.k === 'climb')) c.y = floorAt(c.d);
  // les petits effets : les z du sommeil
  if (c.task && c.task.zzz && (c.zt = (c.zt || 0) + dt) > 1.3) { c.zt = 0; const h = Chat.where(c, c.head); Wd.fx.push({ k: 'z', x: h[0] + c.face * sc(c) * 0.1, y: h[1] - sc(c) * 0.15, t0: Wd.t, life: 2.4, dx: c.face }); }
  // la pose
  const A = ANIMS[c.anim] || ANIMS.assis; A(c, c.tgt, c.at);
  if (c.pushing) { c.tgt[I.pitch] -= 0.12; c.tgt[I.look] = 0.3; c.tgt[I.eyes] = 1; }
  if (c.purr && Wd.t < c.purr) { ANIMS.ronron(c, c.tgt, c.at); }
  c.s = sOf(c.d);
  c.z = c.held ? 30000 : c.jump && c.zj != null ? c.zj : c.zp != null ? c.zp : zOf(c.d) + c.zo;
  if (c.bonk && Wd.t < c.bonk) { c.tgt[I.eyes] = 1; c.tgt[I.sqz] -= 0.1; c.tgt[I.hnod] -= 0.15; }
  Chat.step(c, dt, { a: Wd.a * (c.hidden ? 0 : 1) });
  c.hp = c.hidden ? null : Chat.where(c, c.head);
  // porté : la peau du cou suit le doigt
  if (c.held) { const n = Chat.where(c, c.headA, [-c.b.head[0] * 0.45, c.b.head[1] * 0.75, 0]); c.x += c.hx - n[0]; c.y += c.hy - n[1]; }
}

/* ——— chacun sa place : deux chats ne se superposent pas ; ils passent devant ou derrière, ou s'écartent ——— */
function spread(dt) {
  const G = Wd.cats.filter(c => !c.perch && !c.jump && !c.fall && !c.held && !c.fight && !c.hidden && !c.gone && !(c.task && (c.task.k === 'climb' || c.task.k === 'jump')));
  const walks = c => c.task && c.task.k === 'walk';
  for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
    const a = G[i], b = G[j], dd = b.d - a.d; if (Math.abs(dd) >= 0.3) continue;
    const dx = b.x - a.x, need = (sc(a) + sc(b)) * 0.52; if (Math.abs(dx) >= need) continue;
    if (walks(a) || walks(b)) {
      if (Math.abs(dd) >= 0.15) continue;   // en marchant, on se croise : l'un passe devant, l'autre derrière
      // celui qui marche change de couloir : devant s'il y a la place, sinon derrière
      const m = walks(a) && (!walks(b) || a.id > b.id) ? a : b, o = m === a ? b : a;
      let lane = o.d + (m.d >= o.d ? 0.2 : -0.2); if (lane < 0) lane = o.d + 0.2; if (lane > 0.6) lane = o.d - 0.2; lane = clamp(lane, 0, 0.6);
      m.d += clamp(lane - m.d, -dt * 0.9, dt * 0.9); if (m.task.d !== undefined && Math.abs(m.task.d - o.d) < 0.15) m.task.d = lane;
    } else {
      // deux chats à l'arrêt : ils se poussent doucement (un peu de côté, un peu en profondeur)
      const s = dx ? sgn(dx) : (a.id < b.id ? 1 : -1), push = Math.min(need - Math.abs(dx), sc(a) * 1.4 * dt);
      a.x = inView(a.x - s * push / 2); b.x = inView(b.x + s * push / 2);
      const e = (dd ? sgn(dd) : 1) * dt * 0.05; a.d = clamp(a.d - e, 0, 0.6); b.d = clamp(b.d + e, 0, 0.6);
    }
  }
}

// en passant, un chat bouscule les petites choses : la pelote roule, la tasse saute
function bump() {
  Wd.cats.forEach(c => {
    if (!c.task || c.task.k !== 'walk' || c.perch || c.jump || c.hidden) return;
    const v = SPEED[c.task.g || c.ch.g] * sc(c);
    Wd.props.forEach(it => {
      if (!LEGER[it.kind] || it.busy || it.on || it.held || it.fall || it.run || Wd.t - (it.bumpT ?? -9) < 0.8 || Math.abs(it.d - c.d) > 0.09) return;
      const s = sOf(it.d), dx = it.x - c.x; if (sgn(dx) !== c.face || Math.abs(dx) > it.hull.w / 2 * s + sc(c) * 0.4) return;
      it.bumpT = Wd.t; it.vx = c.face * v * (it.r ? 1.6 : 0.9);
      if (!it.r) { it.fall = true; it.vy = s * 0.5; it.tiltV = -c.face * rnd(2, 4); }
    });
  });
}

/* ——— la craie : les petits effets ——— */
function say(c, text, rot) { const h = Chat.where(c, c.head); Wd.fx.push({ k: 'txt', text, x: h[0] + c.face * sc(c) * 0.2, y: h[1] - c.b.head[1] * sc(c) * 1.6, t0: Wd.t, life: 1.6, rot: rot ?? c.face * 0.12, size: clamp(sc(c) * 0.12, 13, 20) }); }
function dust(x, y, r, a) { Wd.fx.push({ k: 'dust', x, y, r, a, t0: Wd.t, life: 0.5, seed: Math.floor(Math.random() * 99) }); }
function drawFx(S) {
  const C = Chalk, t = Wd.t, K = S.K || 1;
  Wd.fx = Wd.fx.filter(f => t - f.t0 < f.life);
  Wd.fx.forEach(f => {
    const u = (t - f.t0) / f.life, fade = (1 - sm((u - 0.6) / 0.4)) * Wd.a;
    if (f.k === 'txt') {
      if (f.text === '♥') heart(f.x, f.y - u * 20, 7 * K, fade);
      else C.text(f.text, f.x, f.y - u * 14, c01(u * 4), { size: f.size, align: 'center', rot: f.rot, a: 0.75 * fade });
    } else if (f.k === 'z') C.text(u < 0.5 ? 'z' : 'Z', f.x + f.dx * u * 18 + Math.sin(u * 7) * 5, f.y - u * 40, 1, { size: 12 + u * 10, a: 0.6 * fade });
    else if (f.k === 'dust') { for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 2; j++) { const a0 = f.r * (0.5 + u * 0.8), h = (j + 1) * 5; C.line(f.x + i * a0, f.y - h * 0.4, f.x + i * (a0 + 8 + u * 8), f.y - h, 1, { w: 1.6, a: 0.5 * f.a * (1 - u), seed: f.seed + i + j }); } }
    else if (f.k === 'bagarre') fightCloud(f, u, fade, K);
  });
  // le fil des pelotes
  Wd.props.forEach(it => { if (!it.trail || it.trail.length < 2) return; const col = undefined;
    C.stroke(it.trail.concat([[it.x, it.y]]), 1, { w: 1.3, a: 0.6 * it.a, color: col, amp: 0.4, seed: 7, tip: false }); });
}
function heart(x, y, r, a) {
  const P = []; for (let i = 0; i <= 24; i++) { const q = i / 24 * Math.PI * 2; P.push([x + 16 * Math.pow(Math.sin(q), 3) * r / 16, y - (13 * Math.cos(q) - 5 * Math.cos(2 * q) - 2 * Math.cos(3 * q) - Math.cos(4 * q)) * r / 16]); }
  Chalk.stroke(P, 1, { w: 1.8, a: 0.8 * a, seed: 3, tip: false });
}
// le nuage de bagarre : une boule de traits qui tourne, des pattes et des queues qui en sortent, des étoiles, « !#@ »
let paper = null;
function fightCloud(f, u, fade, K) {
  const C = Chalk, ctx = C.ctx, t = Wd.t, r = f.r * (0.95 + Math.sin(t * 17) * 0.05) * (0.6 + 0.4 * sm(u * 8)), jit = () => (Math.random() - 0.5) * 4;
  // le contour bosselé du nuage, rempli de papier (on ne voit plus les chats dedans)
  const P = []; for (let i = 0; i <= 48; i++) { const q = i / 48 * Math.PI * 2, bump = Math.abs(Math.sin(q * 3.5 + t * 6)) * 0.22; P.push([f.x + Math.cos(q) * r * (0.85 + bump) + jit(), f.y + Math.sin(q) * r * 0.62 * (0.85 + bump) + jit()]); }
  if (ctx) { if (!paper) paper = getComputedStyle(document.body).backgroundColor || '#dcdcd8'; ctx.save(); ctx.globalAlpha *= fade; ctx.fillStyle = paper; ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill(); ctx.restore(); }
  C.stroke(P, 1, { w: 2.6, a: 0.85 * fade, seed: f.seed, tip: false });
  for (let k = 0; k < 2; k++) { const Q = []; for (let i = 0; i <= 10; i++) { const q = i / 10 * Math.PI * 1.6 + t * (7 + k * 3), rr = r * (0.3 + 0.12 * k); Q.push([f.x + Math.cos(q) * rr + jit(), f.y + Math.sin(q) * rr * 0.6 + jit()]); } C.stroke(Q, 1, { w: 1.6, a: 0.5 * fade, seed: f.seed + k, tip: false }); }
  // des pattes, une queue qui dépassent ; des étoiles ; des gros mots
  for (let i = 0; i < 4; i++) { const q = t * 4 + i * 1.7 + Math.sin(t * 11 + i) * 0.6, a = [f.x + Math.cos(q) * r * 0.85, f.y + Math.sin(q) * r * 0.55], b = [f.x + Math.cos(q) * r * 1.3, f.y + Math.sin(q) * r * 0.85];
    C.line(a[0], a[1], b[0], b[1], 1, { w: 3.2, a: 0.85 * fade, seed: i, tip: false }); C.circle(b[0], b[1], 5 * K, 5 * K, 1, { w: 2.2, a: 0.85 * fade, seed: i + 5 }); }
  { const q = t * 3, a = [f.x - Math.cos(q) * r * 0.8, f.y - r * 0.3], Q = []; for (let i = 0; i <= 8; i++) Q.push([a[0] - Math.cos(q) * i * r * 0.07, a[1] - i * r * 0.05 + Math.sin(i * 1.3 + t * 9) * 4]); C.stroke(Q, 1, { w: 3, a: 0.8 * fade, tip: false }); }
  ['!', '#', '@', '*', '§', '!'].forEach((s, i) => { const q = t * 2.3 + i * 1.1; if (Math.sin(t * 7 + i * 2) > -0.2) C.text(s, f.x + Math.cos(q) * r * 1.25, f.y - r * 0.55 + Math.sin(q) * r * 0.7, 1, { size: 18, align: 'center', a: 0.8 * fade }); });
}

/* ——— les scénarios : de temps en temps ——— */
function horde() {
  const dir = Math.random() < 0.5 ? 1 : -1, d = rnd(0.02, 0.2), s = sOf(d), W = Wd.W;
  const m = prop('souris', dir > 0 ? -0.05 : 1.05, d, { yaw: dir > 0 ? -0.35 : Math.PI + 0.35 });
  m.run = { dir, v: s * 2.1 }; m.zo = 200;
  const n = Wd.mode === 'large' ? 4 + Math.floor(Math.random() * 3) : 3;
  for (let i = 0; i < n; i++) {
    const k = addCat({ temp: true, d: clamp(d + rnd(-0.02, 0.4), 0, 1), face: dir });
    k.x = m.fx * W - dir * (sc(k) * 1.6 + i * sc(k) * rnd(0.7, 1.1));
    k.q = [go(dir > 0 ? W + sc(k) * 2 + i * 10 : -sc(k) * 2 - i * 10, { g: 'galop', v: rnd(1, 1.15) }), fn(k => { k.gone = true; })];
  }
  // les chats de la maison qui traînent : certains se joignent à la course
  Wd.cats.filter(k => !k.temp && free4(k) && Math.random() < 0.4).forEach(k => { interrupt(k); k.q = [pose('affut', rnd(0.3, 0.9), { face: dir }), go(dir > 0 ? W + sc(k) * 2 : -sc(k) * 2, { g: 'galop' }), fn(k => { k.gone = true; })]; });
  setTimeout(() => { const lead = Wd.cats.filter(k => k.temp).sort((a, b) => dir * (b.x - a.x))[0]; if (lead) say(lead, '!'); }, 600);
}
function runMice(dt) {
  Wd.props.filter(p => p.run).forEach(m => {
    m.fx += m.run.dir * m.run.v * dt / Wd.W; m.d = m.dT; Univers.scurry(m, Wd.t, 1);
    if ((m.run.dir > 0 && m.fx > 1.1) || (m.run.dir < 0 && m.fx < -0.1)) unprop(m);
  });
}
function tower() {
  // une pile de caisses tombe du ciel, une à une ; les chats y grimpent ; ça penche… et tout s'écroule
  const tr = Wd.P.arbre, clear = tr ? tr.fx + (0.75 + 0.35) * Wd.s0 / Wd.W : 0.15;   // pas contre l'arbre
  const cands = [0.2, 0.3, 0.45, 0.55, 0.7, 0.85].filter(f => f > clear && (Wd.mode === 'large' || f > 0.3));
  const fx = cands.sort((a, b) => Math.min(...Wd.props.filter(p => !p.run).map(p => Math.abs(p.fx - b))) - Math.min(...Wd.props.filter(p => !p.run).map(p => Math.abs(p.fx - a))))[0];
  const d = rnd(0.3, 0.6), sizes = Wd.mode === 'large' ? [2, 2, 1, 1, 0, 0] : [1, 1, 0, 0];
  // un escalier en zigzag : chaque caisse déborde d'un côté, et laisse à celle du dessous une marche où poser les pattes
  const z0 = Math.random() < 0.5 ? -1 : 1, offs = sizes.map((_, i) => i ? (i % 2 ? z0 : -z0) * 0.16 : 0);
  const T = Wd.tower = { boxes: [], t: 0, phase: 'pile', w: 0, fx, d, offs };
  sizes.forEach((size, i) => setTimeout(() => {
    if (Wd.tower !== T) return;
    const b = prop('caisse', fx + offs.slice(0, i + 1).reduce((a, o) => a + o, 0) * sOf(d) / Wd.W + rnd(-0.002, 0.002), d, { size }); b.tower = T; b.fall = true; b.lift = Wd.H + sOf(d) * 0.5; b.vy = -sOf(d) * 2; b.tilt = rnd(-0.25, 0.25); b.tiltV = -b.tilt * 1.5;
    b.target = T.boxes[T.boxes.length - 1] || null; b.zo = 100; T.boxes.push(b);
    if (i === sizes.length - 1) setTimeout(() => { if (Wd.tower === T) { T.phase = 'debout'; T.t = 0; climbers(T); } }, 1200);
  }, i * 520));
}
function climbers(T) {
  const n = Math.min(3, Wd.mode === 'large' ? 3 : 2), who = Wd.cats.filter(k => !k.temp && free4(k)).slice(0, n);
  while (who.length < n && residents().length < MAXC) { const k = enter(); k.q = []; who.push(k); }
  // la marche d'une caisse : le bout de dessus que la caisse d'au-dessus laisse libre (en unités, le long du perchoir)
  const step = i => { const b = T.boxes[i], up = T.boxes[i + 1]; return up && up.on === b ? -sgn(up.onDx || T.offs[i + 1]) * (b.box.w / 2 - 0.08) : 0; };
  who.forEach((k, j) => {
    interrupt(k); const top = T.boxes.length - 1 - j, b0 = T.boxes[0], side = -sgn(T.offs[1] || 1);
    k.q.push(go(() => xOf(b0) + side * (b0.box.w / 2 * sOf(b0.d) + front(k) * 0.8), { d: T.d, face: -side, g: 'trot' }), pose('affut', 0.5 + j * 1.6));
    for (let i = 0; i <= top; i++) { const b = T.boxes[i]; if (!b || b.fall) break;
      k.q.push(hop(() => perchAt(b, b.perches[0], step(i)), { live: true, zr: [0, 0.4], h: sc(k) * 0.3 }), pose(i === top ? 'assis' : 'affut', i === top ? 6 : 0.45)); }
    k.q.push(pose('miaule', 2, { fx: k => say(k, 'miaou !') }));
  });
}
function towerFrame(dt) {
  const T = Wd.tower; if (!T) return; T.t += dt;
  if (T.phase === 'debout') {
    // chaque chat perché au-dessus de la deuxième caisse fait pencher la pile
    const up = Wd.cats.filter(k => k.perch && k.perch.it.tower === T && T.boxes.indexOf(k.perch.it) >= 1).length;
    T.w += dt * (0.05 + up * 0.14); const dir = T.dir || (T.dir = Math.random() < 0.5 ? -1 : 1);
    T.boxes.forEach((b, i) => { if (b.on && i) b.tilt = Math.sin(T.t * 5 + i * 0.6) * T.w * 0.03 * i + dir * T.w * 0.02 * i; });
    if (T.w > 1 || T.t > 22) {
      T.phase = 'chute'; T.t = 0;
      T.boxes.forEach((b, i) => { if (!i) return; const s = sOf(b.d); drop(b, dir * s * (0.5 + i * 0.35) * rnd(0.7, 1.3), s * rnd(0.2, 1), -dir * rnd(1.5, 4.5)); b.dT = clamp(T.d + rnd(-0.35, 0.35), 0, 1); });
      const b = T.boxes[T.boxes.length - 1]; dust(xOf(b), b.y, sOf(b.d) * 0.8, 1);
      Wd.fx.push({ k: 'txt', text: 'boum !', x: xOf(T.boxes[0]), y: floorAt(T.d) - sOf(T.d) * 1.6, t0: Wd.t, life: 1.6, rot: -0.1, size: 26 });
    }
  } else if (T.phase === 'chute' && T.t > 12) { T.phase = 'fin'; T.t = 0; T.boxes.forEach(b => { b.fadeT = 0; }); }
  else if (T.phase === 'fin' && T.t > 1.5) { T.boxes.forEach(b => { Wd.cats.forEach(k => { if (k.perch && k.perch.it === b) interrupt(k); }); unprop(b); }); Wd.tower = null; }
}
// ce qui est tombé revient à sa place (en fondu), un moment après
function tidy() {
  Wd.props.forEach(it => {
    if (!it.home || it.fall || it.held || it.tower || it.run) return;
    const moved = it.home.on ? it.on !== it.home.on : Math.abs(it.fx - it.home.fx) > 0.25 || Math.abs(it.tilt || 0) > 0.1;
    if (!moved) { it.away = null; return; }
    if (!it.away) it.away = Wd.t;
    if (Wd.t - it.away > 18 && it.fadeT) it.fadeT = 0;
    if (it.fade < 0.02 && !it.fadeT) { Object.assign(it, { fx: it.home.fx, d: it.home.d, dT: it.home.d, lift: 0, vx: 0, vy: 0, tiltV: 0 }); it.tilt = 0; if (it.home.on) stack(it, it.home.on, it.home.onDx); if (it.trail) it.trail.length = 0; it.fadeT = 1; it.away = null; }
  });
}

/* ——— les croquettes : le distributeur en crache une poignée, en l'air ; elles rebondissent sur la tête des chats ——— */
function fire(g, who) {
  if (!g || !Wd.props.includes(g) || Wd.t - (g.shake ?? -9) < 1.2) return;
  g.shake = Wd.t; g.wob = Wd.t; g.wobA = 0.6; const m = Univers.at(g, g.bec), k = Wd.s0 / 160, n = 9 + Math.floor(Math.random() * 7);
  Wd.fx.push({ k: 'txt', text: 'ding !', x: m[0] - g.s * 0.15, y: m[1] - g.s * 0.5, t0: Wd.t, life: 1.4, rot: -0.1, size: 18 });
  for (let i = 0; i < n; i++) Wd.kib.push({ x: m[0], y: m[1], vx: rnd(90, 520) * k * (Math.random() < 0.12 ? -0.6 : 1), vy: -rnd(380, 820) * k, d: rnd(0, 0.55), t0: Wd.t + i * 0.045, rest: false, spin: Math.random() * 6 });
  // les gourmands accourent
  Wd.cats.filter(c => c !== who && free4(c) && !c.temp && Math.random() < 0.6).forEach(c => { interrupt(c); c.q = [pose('affut', rnd(0.4, 1.2))]; });
}
function kibFrame(dt) {
  const g = grav();
  Wd.kib = Wd.kib.filter(k => !k.gone && Wd.t - k.t0 < 45);
  Wd.kib.forEach(k => {
    if (Wd.t < k.t0 || k.rest) return;
    k.vy += g * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.spin += dt * 9;
    if (k.x < 6 || k.x > Wd.W - 6) { k.x = clamp(k.x, 6, Wd.W - 6); k.vx *= -0.5; }
    // bonk : sur une tête
    if (k.vy > 0) for (const c of Wd.cats) { if (!c.hp || c.hidden) continue; const r = c.b.head[0] * sc(c) * 0.95;
      if (Math.hypot(k.x - c.hp[0], k.y - c.hp[1]) < r) { k.vy = -Math.abs(k.vy) * 0.45 - 60; k.vx += rnd(-80, 80); k.y = c.hp[1] - r;
        c.bonk = Wd.t + 0.45; if (Wd.t - (c.saidBonk || -9) > 0.9) { c.saidBonk = Wd.t; say(c, pick(['bonk', 'aïe', '?!', 'toc'])); } break; } }
    const f = floorAt(k.d);
    if (k.y >= f && k.vy > 0) { k.y = f; if (k.vy > 180) { k.vy = -k.vy * 0.35; k.vx *= 0.55; } else { k.rest = true; k.vx = k.vy = 0; } }
  });
}
function drawKib(S) {
  const r = Math.max(2.6, Wd.s0 * 0.024);
  // une croquette : un petit rond (ou une étoile à trois branches) au trait, vide au milieu, comme le reste du dessin
  const ctx = Chalk.ctx; if (!ctx) return;
  ctx.save(); ctx.strokeStyle = `rgba(${(window.THEME && THEME.ink) || Chalk.INK},${0.9 * Wd.a})`; ctx.lineWidth = Math.max(1.4, r * 0.55); ctx.lineJoin = 'round';
  Wd.kib.forEach((k, i) => { if (Wd.t < k.t0) return; const x = k.x, y = k.y - r * 0.9; ctx.beginPath();
    if (i % 3) ctx.ellipse(x, y, r, r * 0.8, k.spin, 0, Math.PI * 2);
    else for (let j = 0; j <= 6; j++) { const a = k.spin + j / 6 * Math.PI * 2, rr = j % 2 ? r * 0.55 : r * 1.15; j ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.stroke(); });
  ctx.restore();
}
// l'eau de la fontaine : trois filets qui retombent dans la vasque, et des gouttes qui y glissent
function drawWater(S) {
  Wd.props.forEach(it => { if (it.kind !== 'eau' || it.a < 0.05) return;
    const top = Univers.at(it, it.jet);
    [-0.5, 0.7, 2.6].forEach((a, i) => { const e = Univers.at(it, [Math.cos(a) * 0.1, 0.056, Math.sin(a) * 0.1]), cx = top[0] + (e[0] - top[0]) * 0.35, cy = top[1] - it.s * 0.07, P = [];
      for (let j = 0; j <= 10; j++) { const u = j / 10, v = 1 - u; P.push([v * v * top[0] + 2 * v * u * cx + u * u * e[0], v * v * top[1] + 2 * v * u * cy + u * u * e[1]]); }
      Chalk.stroke(P, 1, { w: 1.3, a: 0.45 * it.a, amp: 0.3, seed: 11 + i, tip: false });
      const u = (Wd.t * 1.4 + i / 3) % 1, v = 1 - u; Chalk.dot(v * v * top[0] + 2 * v * u * cx + u * u * e[0], v * v * top[1] + 2 * v * u * cy + u * u * e[1], 1.8, 0.6 * it.a); });
  });
}
/* ——— plus il y a de chats, plus il y a de coins : un coussin, une pelote, un panier, de l'eau… apparaissent (et s'en vont) ——— */
const EXTRA = ['coussin', 'pelote', 'panier', 'eau', 'carton', 'poisson', 'gamelle', 'coussin', 'pelote', 'panier'];
function extras() {
  const want = clamp(Math.floor((residents().length - 2) / 2), 0, Wd.mode === 'large' ? 8 : 3), X = Wd.extras;
  if (X.length < want && Wd.t > Wd.nextExtra) {
    const kind = EXTRA[X.length % EXTRA.length], toy = kind === 'pelote' || kind === 'poisson', d = toy ? rnd(0, 0.5) : rnd(0.55, 0.95);
    let best = null, bd = -1;
    for (let fx = 0.14; fx <= 0.95; fx += 0.02) { const m = Math.min(...Wd.props.filter(p => !p.run && Math.abs(p.d - d) < 0.35).map(p => Math.abs(p.fx - fx) * Wd.W)); if (m > bd) { bd = m; best = fx; } }
    if (bd > Wd.s0 * 0.45) {
      const it = prop(kind, best, d); it.fade = 0; it.fadeT = 1; it.home = { fx: best, d }; X.push(it);
      dust(best * Wd.W, floorAt(d), Wd.s0 * 0.4, 0.8);
    }
    Wd.nextExtra = Wd.t + rnd(1.5, 4);
  }
  if (X.length > want + 1) { const it = X.find(p => !p.busy && p.fadeT); if (it) it.fadeT = 0; }
  X.slice().forEach(it => { if (!it.fadeT && it.fade < 0.02) { X.splice(X.indexOf(it), 1); Wd.cats.forEach(c => { if (c.perch && c.perch.it === it) interrupt(c); }); unprop(it); } });
}

/* ——— l'image ——— */
let ready = false;
function frame(S) {
  if (!Obj3D.ok) return;
  const dt = Math.min(0.05, S.dt || 0); Wd.a = S.a; Wd.f++; Wd.t += dt;
  measure(S);
  if (!ready) { ready = true; for (let i = 0; i < 2; i++) { const c = addCat({ x: rnd(0.3, 0.85) * Wd.W }); c.q.push(pose(pick(['assis', 'toilette', 'pain']), rnd(2, 5))); } }
  // la population : trois chats (au moins) ; quand l'un part, un autre arrive
  if (dt && residents().length < 3 && Wd.t > Wd.nextIn) { enter(); Wd.nextIn = Wd.t + rnd(3, 9); }
  // les scénarios
  if (dt && Wd.t > Wd.nextScen && !Wd.tower && !Wd.props.some(p => p.run)) { (Wd.scen++ % 2 ? tower : horde)(); Wd.nextScen = Wd.t + rnd(28, 50); }
  runMice(dt); towerFrame(dt); kibFrame(dt); extras();
  if (dt && Wd.t > Wd.nextKib) { const g = Wd.props.find(p => p.kind === 'distrib'); if (g) fire(g); Wd.nextKib = Wd.t + rnd(16, 32); }
  Wd.props.forEach(it => updProp(it, dt));
  Wd.cats.slice().forEach(c => live(c, dt));
  spread(dt); bump();
  tidy();
}
function draw(S) { drawWater(S); drawKib(S); drawFx(S); }
function hide() { Wd.cats.forEach(c => { c.root.visible = false; }); Wd.props.forEach(it => { it.root.visible = false; }); }

/* ——— les mains : cliquer, attraper ——— */
function catAt(x, y) {
  let best = null, bz = -Infinity;
  Wd.cats.forEach(c => { if (c.hidden || c.gone) return; const b = Chat.where(c, c.body), h = Chat.where(c, c.head), k = sc(c);
    const inB = Math.hypot((x - b[0]) / (c.D.a * k + 8), (y - b[1]) / (c.D.h * k * 1.2 + 8)) < 1, inH = Math.hypot(x - h[0], y - h[1]) < c.b.head[0] * k * 1.25 + 6;
    if ((inB || inH) && c.z > bz) { best = c; bz = c.z; } });
  return best;
}
function propAt(x, y) {
  return Wd.props.find(it => { if (it.a < 0.5 || it.run) return false; const s = it.s;
    if (it.r) return Math.hypot(x - it.x, y - (it.y - it.r * s)) < Math.max(it.r * s * 1.8, 18);
    if (it.kind === 'arbre') return false;
    const w = Math.max(it.hull.w * s * 0.55, 16), h = Math.max(it.hull.h * s * 1.1, 22);
    return Math.abs(x - it.x) < w && y < it.y + 8 && y > it.y - h; });
}
// une chichenaude sur un objet : le distributeur tire, la pelote roule, ce qui est posé tombe, le reste sursaute
function poke(it, x) {
  const s = sOf(it.d), side = sgn(it.x - x || 1);
  if (it.kind === 'distrib') fire(it);
  else if (it.r) { it.vx = side * s * rnd(2, 3); it.fall = true; it.vy = s * 0.6; }
  else if (it.on) drop(it, side * s * 1.1, s * 0.8, -side * 6);
  else if (!it.fall) { it.fall = true; it.vy = s * 1.5; it.tiltV = rnd(-1.5, 1.5); }
}
function click(x, y, S) {
  if (!ready) return false;
  const c = catAt(x, y);
  if (c) { purr(c); return true; }
  const it = propAt(x, y);
  if (it) { poke(it, x); return true; }
  if (Wd.props.some(it => it.kind === 'arbre' && Math.abs(x - it.x) < 0.75 * it.s && y < it.y && y > it.y - 1.9 * it.s)) { Wd.P.arbre.poke = Wd.P.arbre.wob = Wd.t; Wd.P.arbre.wobA = 1; return true; }
  // un chat tombe du ciel, ici
  if (residents().length >= MAXC) return false;
  Wd.clicks++;
  const k = addCat({ x: clamp(x, 20, Wd.W - 20) }); k.y = -sc(k) * 1.2; k.fall = true; k.vy = 0; k.vx = 0; k.spin = Math.PI * sgn(Math.random() - 0.5); k.stay = rnd(60, 140);
  return true;
}
// attraper : le film demande d'abord qui est sous le doigt (sans rien changer) ; le chat n'est soulevé qu'au premier glissé.
// Lâché sans avoir bougé, c'est une caresse : il ronronne.
function grab(x, y) { if (!ready) return null; Wd.gx = x; const c = catAt(x, y); if (c) return c; const it = propAt(x, y); return it && !LOURD[it.kind] && !it.run ? it : null; }
const isProp = k => !!(k && k.hull);
function drag(c, x, y) {
  if (!c) return;
  if (isProp(c)) { const it = c;
    if (!it.held) {
      // on le soulève : ce qui dormait dessus saute (live), ce qui était posé dessus suit ; il ne revient plus seul à sa place tout de suite
      it.on = null; it.fall = false; it.target = null; it.held = true; it.vy = it.tiltV = 0; it.gdx = x - it.x; it.gdy = y - it.y; it.fadeT = 1; it.away = null;
      if (it.tower) { it.tower.boxes.splice(it.tower.boxes.indexOf(it), 1); it.tower = null; }
    }
    it.hx = x; it.hy = y; return; }
  if (!c.held) { interrupt(c); c.fall = false; c.held = true; c.spin = 0; c.pend = { th: 0, w: 0, px: x, py: y, vx: 0, vy: 0, ax: 0 }; say(c, pick(['mia ?', '…', 'hé !'])); }
  c.hx = x; c.hy = y;
}
function purr(c) { c.purr = Wd.t + 2.6; say(c, '♥'); setTimeout(() => say(c, 'rrrr', 0), 500); }
function release(c, vx, vy) {
  if (!c) return;
  if (isProp(c)) { const it = c; if (!it.held) { poke(it, Wd.gx ?? it.x); return; }
    // lâché : il vole, tourne sur lui-même, rebondit, se pose (sur une caisse, s'il tombe dessus)
    it.held = false; drop(it, clamp(vx || 0, -1800, 1800), -clamp(vy || 0, -1800, 1800), clamp((vx || 0) * 0.004, -7, 7) + rnd(-1, 1)); return; }
  if (!c.held) { purr(c); return; }
  c.held = false; c.fall = true; c.vx = clamp(vx || 0, -1500, 1500); c.vy = clamp(vy || 0, -1500, 1500);
  // la pose change (pendu → en chute) : le corps reste où il est
  c.y += c.D.stand * sc(c); c.cur[I.y] = c.D.stand; c.spin = clamp((c.pend ? c.pend.th : 0) * c.face - c.vx * 0.002, -1.5, 1.5); c.pend = null;
  c.d = freeD();
}

return { ANIMS, CARAC, frame, draw, hide, click, grab, drag, release, get clicks() { return Wd.clicks; }, get world() { return Wd; }, horde, tower, fight: () => { const L = Wd.cats.filter(free4).slice(0, 2); if (L.length > 1) fight(L); }, quarrel: () => { const L = Wd.cats.filter(free4); if (L.length > 1) quarrel(L[0], L[1]); } };
})();
