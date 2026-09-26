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
  // la toilette, un vrai rituel (12 s) : lécher la patte (la langue sort), se frotter la joue jusqu'à l'oreille, se lécher le flanc
  // (la tête tournée vers l'arrière), puis la patte arrière levée bien droite. c.tongue : la langue (dessinée à la craie, js/vie.js)
  toilette(c, p, t) {
    const D = c.D, b = c.b, cyc = t % 12, ph = cyc < 3.4 ? 0 : cyc < 6.4 ? 1 : cyc < 9.2 ? 2 : 3, flick = Math.max(0, Math.sin(t * 10));
    c.tongue = 0; c.lickTo = null;
    if (ph < 2) {
      sit(c, p, -0.05); const k = c.face > 0 ? 'fr' : 'fl', ki = k === 'fr' ? I.fk2 : I.fk, lick = ph === 0;
      const pitch = p[I.pitch], sx = 1 + p[I.stretch] - p[I.sqz] * 0.5, sy = 1 + p[I.sqz];
      p[I.hnod] = lick ? 0.22 : 0.08; p[I.htilt] = lick ? 0.28 + Math.sin(t * 1.3) * 0.05 : 0.42 + Math.sin(t * 5) * 0.05; p[I.hy] = lick ? -D.h * 0.06 : -D.h * 0.04; p[I.look] = lick ? 0.5 : 0.75;
      const up = [Math.sin(pitch), Math.cos(pitch)], fwd = [Math.cos(pitch), -Math.sin(pitch)], hc = [D.head[0] * sx + p[I.hx], D.head[1] * sy + p[I.hy]];
      // lécher : la patte levée devant la joue (le poignet cassé), la langue va la chercher ; frotter : la patte passe sur la joue, derrière l'oreille, et redescend
      let tx, ty;
      if (lick) { const m = b.head[1] * 0.25, f = b.head[0] * 1.15 + Math.sin(t * 10) * b.head[0] * 0.04; tx = hc[0] - up[0] * m + fwd[0] * f; ty = hc[1] - up[1] * m + fwd[1] * f; }
      else { const u = (cyc - 3.4) / 3, w = 0.5 - 0.5 * Math.cos(u * Math.PI * 4), r = b.head[1] * (-0.3 + 1.15 * w), f = b.head[0] * (1.05 - 0.25 * w); tx = hc[0] + up[0] * r + fwd[0] * f; ty = hc[1] + up[1] * r + fwd[1] * f; }
      const hip = D.hips.f, vx = tx - hip[0] * sx, vy = ty - hip[1] * sy;
      p[I[k]] = Math.atan2(vx, -vy); p[ki] = clamp(Math.hypot(vx, vy) * 0.9 / D.ll, 0.3, 1.6);
      p[I.eyes] = 1; if (lick) { c.tongue = 0.35 + 0.65 * flick; c.lickTo = k; } p[I.tailWave] = 0.2;
    } else if (ph === 2) {
      // le flanc : la tête tournée vers l'arrière (de profil), penchée sur le dos, la langue qui va et vient
      sit(c, p, 0.02); const u = sm((cyc - 6.4) / 0.4) * (1 - sm((cyc - 8.8) / 0.4));
      p[I.look] = 0.2 * (1 - u) + 0.1; p[I.hyaw] = u * 1.75; p[I.hx] = -D.head[0] * 0.5 * u; p[I.hy] = -D.h * 0.28 * u; p[I.hnod] = 0.3 * u; p[I.htilt] = -0.2 * u;
      p[I.eyes] = 1; c.tongue = u > 0.8 ? 0.3 + 0.7 * flick : 0; c.lickTo = 'body'; p[I.tailWave] = 0.3; p[I.tailPhase] = t * 1.5;
    } else {
      // la patte arrière : couché sur le flanc, la patte (celle qui nous fait face) levée bien droite, la tête penchée dessus
      lie(c, p); const u = sm((cyc - 9.2) / 0.5) * (1 - sm((cyc - 11.5) / 0.5)), k = c.face > 0 ? 'hr' : 'hl';
      p[I.y] += D.h * 0.1 * u; p[I.pitch] = 0.25 * u; p[I[k]] = lerp(p[I[k]], 2.7, u); p[I.hk] = lerp(p[I.hk], 1.4, u);
      p[I.look] = 0.75 - 0.35 * u; p[I.hnod] = 0.5 * u; p[I.hy] = -D.h * 0.2 * u; p[I.hx] = -D.head[0] * 0.35 * u; p[I.htilt] = -0.3 * u;
      p[I.eyes] = 1; c.tongue = u > 0.8 ? 0.3 + 0.7 * flick : 0; c.lickTo = k; p[I.tailWave] = 0.2;
    }
  },
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
  // la caresse : debout sur la pointe des pattes, le dos qui se bombe sous la main, la tête qui se frotte, la queue droite qui frémit
  caresse(c, p, t) {
    Chat.rest(c, p); const k = c.pet ? Math.min(1, c.pet.n / 6) : 0.5;
    p[I.sqz] = 0.05 + 0.05 * k + Math.sin(t * 3) * 0.03; p[I.y] += 0.015; p[I.pitch] = -0.05; p[I.fk] = p[I.fk2] = 1.1; p[I.hk] = 1.15;
    p[I.htilt] = 0.3 * Math.sin(t * 2.2); p[I.hnod] = -0.2; p[I.eyes] = 2; p[I.look] = 1;
    p[I.tailUp] = 1.7; p[I.tailCurl] = -0.4 + k * 0.5; p[I.tailWave] = 0.25; p[I.tailPhase] = t * 9;
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
  // debout, immobile : il attend, la queue qui ondule
  debout(c, p, t) { Chat.rest(c, p); p[I.eyes] = blink(t); p[I.tailWave] = 0.6; p[I.tailPhase] = t * 1.6; },
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
// les crochets : js/vie.js y branche la suite de la vie des chats (la chasse, les pièges, la rébellion…) sans tout mettre ici
const H = { think: [], live: [], fall: [], bonk: [], pre: [], post: [], draw: [], drag: [], release: [], click: [], fire: [], shoot: [] };
const run = (L, a, b, c, d) => { for (const f of L) if (f(a, b, c, d)) return true; return false; };
const TAU2 = Math.PI / 2, sgn = v => v < 0 ? -1 : 1, clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const zOf = d => (1 - d) * 6000, kOf = d => 1 - 0.16 * d, floorAt = d => Wd.floor - d * Wd.depth, sOf = d => Wd.s0 * kOf(d);
const grav = () => 2600 * Wd.s0 / 160;
// plus tard, au temps du monde (pas de setTimeout : le monde peut être en pause, accéléré, ou rechargé)
const later = (s, f) => { (Wd.later || (Wd.later = [])).push({ t: Wd.t + s, f }); };
// le plafond de la scène : le bas du texte et des boutons encore visibles (rien ne doit monter plus haut)
function ceilY() { let y = 0; document.querySelectorAll('[data-plafond]').forEach(e => { const r = e.getBoundingClientRect(); if (r.height) y = Math.max(y, r.bottom); }); return y || Wd.H * 0.4; }
// la taille d'une unité : selon l'écran, et la place libre sous le texte (plus grand quand on reste jouer : le texte s'en va)
const size0 = () => clamp(Math.min(Wd.W * (Wd.W < 760 ? 0.2 : 0.19), Wd.H * 0.19, (Wd.floor - Wd.ceil) * 0.95), 64, 165);
function laters() { if (!Wd.later || !Wd.later.length) return; const due = Wd.later.filter(o => Wd.t >= o.t); if (!due.length) return; Wd.later = Wd.later.filter(o => Wd.t < o.t); due.forEach(o => o.f()); }
let MAXC = 20;   // sur un téléphone : moins de chats (voir measure)
// les croquettes : toujours au sol, devant (d ≤ 0.15) ; pas plus qu'on ne peut en manger
const KIBMAX = () => Wd.mode === 'large' ? 150 : 70, TEMPMAX = () => Wd.mode === 'large' ? 8 : 3;

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
  Wd.floor = Math.min(S.H - 30, top - 8); Wd.ceil = ceilY();
  const s0 = size0(); if (!Wd.sized) { Wd.s0 = s0; Wd.sized = true; } Wd.s0T = s0;
  Wd.depth = Wd.s0 * 0.7;
  const mode = S.W >= 760 ? 'large' : 'etroit'; MAXC = mode === 'large' ? 20 : 8;
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
  it.big = { distrib: 1.5, eau: 1.3, lanceur: 1.15, trappe: 1.1 }[kind] || 1;   // le distributeur et la fontaine, un peu plus grands que nature
  Wd.props.push(it); return it;
}
function unprop(it) { Univers.destroy(it); const i = Wd.props.indexOf(it); if (i >= 0) Wd.props.splice(i, 1); Wd.props.forEach(o => { if (o.on === it) o.on = null; if (o.target === it) o.target = null; }); }
// l'encombrement de chaque objet (en unités) : pour tomber, rebondir, se poser sur une caisse, se laisser attraper
const HULL = { carton: { w: 0.56, h: 0.32 }, panier: { w: 0.72, h: 0.15 }, coussin: { w: 0.76, h: 0.15 }, gamelle: { w: 0.34, h: 0.08 }, eau: { w: 0.33, h: 0.17 },
  distrib: { w: 0.4, h: 0.74 }, trappe: { w: 0.6, h: 0.5 }, arbre: { w: 1.5, h: 1.95 }, pelote: { w: 0.15, h: 0.15 }, poisson: { w: 0.3, h: 0.08 }, lanceur: { w: 0.6, h: 0.7 } };
// les lourds (ils tanguent, se laissent traîner lentement, tombent lourdement), ce qu'un chat bouscule en passant
const LOURD = { arbre: 1, distrib: 1, lanceur: 1 }, LEGER = { pelote: 1, poisson: 1, tasse: 1, plante: 1 };
const COL = { orange: 0xd0661f, bleu: 0x2f6fb0, vert: 0x3a6e46, rose: 0xc04a6c, gris: 0x6a6c70 };
function layout() {
  Wd.props.slice().forEach(unprop); Wd.P = {}; Wd.extras = []; Wd.kib = []; const P = Wd.P, wide = Wd.mode === 'large';
  const ex = u => u * Wd.s0 / Wd.W;   // une largeur en unités → en fraction de l'écran
  // l'arbre à chat au bord gauche, tourné vers le centre ; le coin repos, les jouets devant, le carton et les caisses, la cuisine à droite
  P.arbre = prop('arbre', ex(wide ? 0.8 : 0.62) + 0.012, 0.75, { yaw: 0.4 });
  if (wide) {
    P.coussin = prop('coussin', 0.25, 0.3);
    P.panier = prop('panier', 0.34, 0.85);
    P.pelote = prop('pelote', 0.45, 0.02);
    P.poisson = prop('poisson', 0.4, 0.12);
    P.carton = prop('carton', 0.64, 0.8);
    P.caisse = prop('caisse', 0.7, 0.5, { size: 2 });
    P.tasse = prop('tasse', 0, 0.5); stack(P.tasse, P.caisse, 0.12);
    P.caisse2 = prop('caisse', 0.77, 0.92, { size: 1 });
    P.plante = prop('plante', 0, 0.92); stack(P.plante, P.caisse2, -0.06);
    P.trappe = prop('trappe', 1, 0.9);
    // le distributeur au milieu : les chats y passent souvent
    P.distrib = prop('distrib', 0.5, 0.9, { yaw: -0.25 });
    P.gamelle = prop('gamelle', 0.56, 0.5);
    P.eau = prop('eau', 0.95, 0.9);
  } else {
    P.coussin = prop('coussin', 0.56, 0.3);
    P.pelote = prop('pelote', 0.68, 0.0);
    // sur un téléphone, l'arbre et la machine rapetissent un peu (la place manque)
    P.arbre.big = 0.78;
    P.carton = prop('carton', 0.72, 0.88);
    P.trappe = prop('trappe', 1, 0.9); P.trappe.big = 0.85;
    P.caisse = prop('caisse', 0.86, 0.55, { size: 1 });
    P.tasse = prop('tasse', 0, 0.55); stack(P.tasse, P.caisse, 0.1);
    P.distrib = prop('distrib', 0.5, 0.97, { yaw: -0.25 });
  }
  if (P.trappe) P.trappe.lift = Wd.s0 * 1.2;
  Wd.props.forEach(it => { it.home = { fx: it.fx, d: it.d, on: it.on, onDx: it.onDx }; });
}
function stack(it, on, dx) { it.on = on; it.onDx = dx; it.d = it.dT = on.d; }
const topOf = b => b.box ? b.box.h * sOf(b.d) * 0.98 : 0;
// le point le plus bas d'une caisse penchée (sous son pied), en px (négatif : sous le pivot)
function low(it) {
  if (it.r) return 0; const s = sOf(it.d) * (it.big || 1), w = it.hull.w / 2, h = it.hull.h, sn = Math.sin(it.tilt), cs = Math.cos(it.tilt);
  return Math.min(-w * sn, w * sn, -w * sn + h * cs, w * sn + h * cs) * s;
}
// faire tomber un objet (de là où il est posé)
// deux objets posés ne se traversent pas : le plus léger glisse de côté (le décor à sa place d'origine ne bouge pas)
function apart(dt) {
  const O = Wd.props.filter(it => !it.held && !it.fall && !it.on && !it.run && !it.r && !it.mur && it.kind !== 'souris' && it.fade > 0.5 && !(it.tower && it.tower.phase !== 'fin'));
  const home = it => it.home && !it.home.on && Math.abs(it.fx - it.home.fx) < 0.01, mass = it => it.hull.w * it.hull.h * (it.big || 1) ** 2 * (LOURD[it.kind] ? 10 : 1);
  for (let i = 0; i < O.length; i++) for (let j = i + 1; j < O.length; j++) {
    const a = O[i], b = O[j]; if (!(Math.abs(a.d - b.d) <= 0.18) || (home(a) && home(b))) continue;
    const ha = a.hull.w / 2 * sOf(a.d) * (a.big || 1), hb = b.hull.w / 2 * sOf(b.d) * (b.big || 1), dx = (b.fx - a.fx) * Wd.W, ov = ha + hb - Math.abs(dx);
    if (!(ov > 0)) continue;
    const ma = home(a) ? 1e9 : mass(a), mb = home(b) ? 1e9 : mass(b), dir = dx ? sgn(dx) : 1, mv = Math.min(ov, Wd.s0 * 2.5 * dt) / Wd.W;
    a.fx -= dir * mv * mb / (ma + mb); b.fx += dir * mv * ma / (ma + mb);
  }
}
// revenir à sa place (invisible, puis il réapparaît doucement)
function goHome(it) { Object.assign(it, { fx: it.home.fx, d: it.home.d, dT: it.home.d, lift: 0, vx: 0, vy: 0, tiltV: 0, fade: 0 }); it.tilt = 0; if (it.home.on) stack(it, it.home.on, it.home.onDx); if (it.trail) it.trail.length = 0; it.fadeT = 1; it.away = null; }
function drop(it, vx, vy, tv) { it.on = null; it.fall = true; it.vx = vx; it.vy = vy; it.tiltV = tv; it.down = Wd.t; }
function updProp(it, dt) {
  if (it._f === Wd.f) return; it._f = Wd.f;
  const s = sOf(it.d);
  if (it.held) {
    // dans la main : il suit le doigt, et penche un peu du côté d'où il vient
    const px = it.fx; it.fx = (it.hx - it.gdx) / Wd.W; it.lift = floorAt(it.d) - it.hy + it.gdy;
    it.vx = (it.fx - px) * Wd.W / Math.max(dt, 1 / 120); if (!it.r) { const h = LOURD[it.kind]; it.tilt += (clamp(-it.vx * (h ? 0.0005 : 0.0012), -0.6, 0.6) * (h ? 0.5 : 1) - it.tilt) * Math.min(1, dt * (h ? 3 : 8)); }
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
      if (it.swept && Math.abs(it.vx) > s * 0.8) { it.vy = s * rnd(0.4, 0.9); it.vx *= 0.9; }   // balayé : il roule-boule jusqu'au bord
      else if (it.tower && it.tower.phase === 'pile') { it.fall = false; it.vy = it.vx = it.tiltV = 0; it.tilt = 0; it.lift = 0; dust(it.fx * Wd.W, floorAt(it.d), s * 0.5, 0.8); }
      else if (it.vy < -s * 1.6) { dust(it.fx * Wd.W, floorAt(it.d), s * 0.4, 0.8); thud(it); it.vy = -it.vy * (LOURD[it.kind] ? 0.12 : 0.28); it.vx *= 0.6; it.tiltV *= 0.45; }
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
  if (it.folle && !it.held && !it.fall && !it.on) it.lift = Math.abs(Math.sin(Wd.t * 17)) * s * 0.03;
  // les lourds tanguent (un chat qui saute dessus, un coup de doigt, une salve de croquettes)
  if ((LOURD[it.kind] || it.mur) && !it.held && !it.fall && !it.on && Math.abs(it.tilt) < 0.2) { const u = Wd.t - (it.wob ?? -9); it.tilt = Math.sin(u * 13) * 0.045 * (it.wobA || 1) * Math.exp(-u * 3) + (it.folle ? Math.sin(Wd.t * 31) * 0.05 : 0); }
  if (it.parts.levier) it.parts.levier.rotation.z = (it.lev0 ?? 0.3) + (it.pull || 0) * (it.levK ?? 1.3);
  // accrochée au mur : au bord droit, à sa hauteur (sous le texte), rien ne la fait bouger
  if (it.mur) { it.fx = 1 + it.hull.w * 0.1 * s * (it.big || 1) / Wd.W; const L = clamp(floorAt(it.d) - (Wd.ceil || 0) - 0.6 * s * (it.big || 1) - 12, Wd.s0 * 0.45, Wd.s0 * 1.7); it.lift += (L - it.lift) * Math.min(1, dt * 4); it.vx = it.vy = 0; it.fall = false; }
  if (it.swept && (it.fx < -0.2 || it.fx > 1.2)) { it.fadeT = it.fade = 0; it.gone = true; } else if (it.swept && !it.fall && !it.vx) it.swept = 0;
  if (!it.run && !it.mur && !it.swept && it.fx < m) { it.fx = m; it.vx = Math.abs(it.vx) * (it.r ? 0.6 : 0); }
  if (!it.run && !it.mur && !it.swept && it.fx > 1 - m) { it.fx = 1 - m; it.vx = -Math.abs(it.vx) * (it.r ? 0.6 : 0); }
  // la pelote : elle tourne en roulant et laisse son fil derrière elle
  if (it.r) {
    const x = it.fx * Wd.W; if (it.px !== undefined) it.spinA -= (x - it.px) / (it.r * s); it.px = x;
    it.spin.setFromAxisAngle(ZA, it.spinA);
    const T = it.trail, y = floorAt(it.d) - it.lift, L = T[T.length - 1];
    if (!L || Math.hypot(L[0] - x, L[1] - y) > 7) { T.push([x, y]); if (T.length > 60) T.shift(); }
  }
  if (it.parts.jar && it.folle) { it.parts.jar.rotation.z = Math.sin(Wd.t * 38) * 0.3; it.parts.jar.position.y = 0.46 + Math.abs(Math.sin(Wd.t * 25)) * 0.05; }
  else if (it.parts.jar) { const u = Wd.t - (it.shake ?? -9); it.parts.jar.rotation.z = Math.sin(u * 32) * 0.14 * Math.exp(-u * 3.5); it.parts.jar.position.y = 0.46 + Math.max(0, Math.sin(u * 16)) * 0.03 * Math.exp(-u * 4); }
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
    if (!Number.isFinite(tx) || (T.d !== undefined && !Number.isFinite(T.d))) return true;   // une cible perdue (son objet a disparu) : on s'arrête
    if (T.d !== undefined) c.d += clamp(T.d - c.d, -dt * 0.6, dt * 0.6);
    c.anim = g; c.perch = null;
    // arrivé : la profondeur finit de s'ajuster (au plus un instant : si un voisin le pousse, il ne piétine pas sur place)
    if (Math.abs(dx) <= v * dt + 0.5) { c.x = tx; T.at = (T.at || 0) + dt; if (T.d === undefined || Math.abs(T.d - c.d) < 0.01 || T.at > 0.6) { if (T.face) c.face = T.face; return true; } c.anim = 'debout'; return false; }
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
    // la caisse bute contre un autre objet (repoussée) : il abandonne, au lieu de pousser dans le vide
    if (T.last !== undefined && T.dir * (b.fx - T.last) < -1e-5) return true;
    b.fx = nx; T.last = nx; c.x += T.dir * v * dt; c.pushing = 1;
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
  // resté hors de l'écran (une sortie interrompue) : il revient
  if (c.x < 0 || c.x > Wd.W) { c.q.push(go(inView(rnd(0.15, 0.85) * Wd.W), { g: 'trot' })); return; }
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
  const shut = Wd.props.filter(p => p.kind === 'caisse' && p.launched && !p.on && !p.fall && !p.held && !p.busy && !Wd.props.some(o => o.on === p) && p.fade > 0.9);
  if (shut.length) add((ch.carton + 0.6) * 1.6, () => open(c, pick(shut)));
  const knock = Wd.props.filter(p => (p.kind === 'tasse' || p.kind === 'plante') && p.on && !p.on.busy && !p.on.fall && !p.on.tower);
  if (knock.length) add(ch.casse * 1.3, () => smash(c, pick(knock)));
  // le distributeur : on peut aller appuyer sur son gros bouton
  const dis = all('distrib'); if (dis.length) add(0.5 + ch.mange * 0.3, () => press(c, pick(dis)));
  add(ch.flane, () => stroll(c));
  add(ch.pose, () => idle(c));
  const foe = Wd.cats.find(o => o !== c && !o.temp && free4(o) && Math.abs(o.x - c.x) < Wd.W * 0.5);
  if (foe && Wd.t > 6) add(ch.dispute * (foe.ch.dispute + 0.5) * 0.5, () => quarrel(c, foe));
  add(ch.fou * 0.5, () => zoomies(c));
  H.think.forEach(f => f(c, add));
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
    pose('tape', 0.9, { fx: c => later(0.3, () => Math.random() < 0.1 ? folle(g) : fire(g, c)) }), pose('affut', 1), fn(free));
}
// les croquettes au sol : aller les manger, une à une
function crunch(c) {
  const K = Wd.kib.filter(k => k.rest && !k.who); if (!K.length) { if (c.glouton) { c.glouton = false; c.q.push(pose('toilette', rnd(1.5, 3), { fx: c => say(c, 'burp') })); if (c.temp) leave(c); return; } return idle(c); }
  // la plus proche, mais pas sous le nez d'un autre mangeur (pas d'entassement)
  const taken = Wd.kib.filter(o => o.who && o.who !== c && !o.gone), crowd = k => taken.some(o => Math.abs(o.x - k.x) < sc(c) * 0.9) ? Wd.W : 0;
  const k = K.sort((a, b) => Math.abs(a.x - c.x) + crowd(a) - Math.abs(b.x - c.x) - crowd(b))[0]; k.who = c;
  c.q.push(fn(c => { const b = beside(c, k.x, -sc(c) * 0.12); c.q.unshift(go(inView(b.x), { d: clamp(k.d, 0, 0.75), face: b.face, g: 'trot' })); }),
    pose('mange', rnd(0.9, 1.6), { fx: c => { say(c, pick(['crounch', 'miam', 'scrountch'])); k.gone = true; let n = 0; Wd.kib.forEach(o => { if (o.rest && !o.who && n < 6 && Math.abs(o.x - k.x) < sc(c) * 0.35 && Math.abs(o.d - k.d) < 0.2) { o.gone = true; n++; } }); } }),
    fn(c => { const more = Wd.kib.filter(k => k.rest && !k.who); if (more.length && (c.glouton || (more.some(k => Math.abs(k.x - c.x) < sc(c) * 1.5) && Math.random() < 0.8))) crunch(c); else c.glouton = false; }));
}
function play(c, toy) {
  claim(c, toy); const n = toy.kind === 'pelote' ? 2 + Math.floor(Math.random() * 3) : 1;
  for (let i = 0; i < n; i++) c.q.push(
    fn(c => { const b = beside(c, xOf(toy), sc(c) * 0.5); c.q.unshift(go(b.x, { d: Math.max(0, toy.d - 0.04), face: b.face, g: 'trot' }), pose('affut', rnd(0.8, 1.6))); }),
    hop(() => groundAt(xOf(toy) - c.face * (front(c) + sc(c) * 0.02), c.d), { h: sc(c) * 0.3 }),
    pose('tape', 0.55, { fx: c => later(0.18, () => kick(toy, c.face)) }));
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
    pose('assis', 1.2), pose('tape', 0.4), pose('assis', 0.8, { face: dir }), pose('tape', 0.6, { fx: c => later(0.25, () => { if (item.on === b) { drop(item, dir * sOf(b.d) * 1.1, sOf(b.d) * 0.7, -dir * rnd(5, 8)); } }) }),
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
  else if (c.fall && !run(H.fall, c, dt)) {
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
    if ((it.fall || it.held) && !(it.kind === 'carton' && Math.abs(it.tilt || 0) < 1.2) || it.suck || !Wd.props.includes(it)) { const vx = it.vx || 0; interrupt(c); c.hidden = 0; c.fall = true; c.vx = vx; c.vy = -sOf(it.d) * 0.6; }
    else { const p = Univers.at(it, [pe.p[0] + dx, pe.p[1], pe.p[2]]); c.x = p[0]; c.y = p[1]; c.zp = p[2]; c.d = it.d; } }
  else c.zp = null;
  if (!c.perch && !c.jump && !c.fall && !c.held && !(c.task && (c.task.k === 'climb' || c.task.air))) c.y = floorAt(c.d);
  // les petits effets : les z du sommeil
  if (c.task && c.task.zzz && (c.zt = (c.zt || 0) + dt) > 1.3) { c.zt = 0; const h = Chat.where(c, c.head); Wd.fx.push({ k: 'z', x: h[0] + c.face * sc(c) * 0.1, y: h[1] - sc(c) * 0.15, t0: Wd.t, life: 2.4, dx: c.face }); }
  // la pose
  const A = ANIMS[c.anim] || ANIMS.assis; A(c, c.tgt, c.at);
  if (c.pushing) { c.tgt[I.pitch] -= 0.12; c.tgt[I.look] = 0.3; c.tgt[I.eyes] = 1; }
  if (c.purr && Wd.t < c.purr && !c.pet) { ANIMS.ronron(c, c.tgt, c.at); }
  c.s = sOf(c.d);
  c.z = c.held ? 30000 : c.jump && c.zj != null ? c.zj : c.zp != null ? c.zp : zOf(c.d) + c.zo;
  if (c.bonk && Wd.t < c.bonk) { c.tgt[I.eyes] = 1; c.tgt[I.sqz] -= 0.1; c.tgt[I.hnod] -= 0.15; }
  H.live.forEach(f => f(c, dt));
  Chat.step(c, dt, { a: Wd.a * (c.hidden ? 0 : 1) });
  c.hp = c.hidden ? null : Chat.where(c, c.head);
  // porté : la peau du cou suit le doigt
  if (c.held) { const n = Chat.where(c, c.headA, [-c.b.head[0] * 0.45, c.b.head[1] * 0.75, 0]); c.x += c.hx - n[0]; c.y += c.hy - n[1]; }
}

/* ——— chacun sa place : deux chats ne se superposent pas ; ils passent devant ou derrière, ou s'écartent ——— */
// ce qu'un chat contourne : tout ce qui est posé au sol (sauf ce qu'il va chercher, et les petits jouets qu'il bouscule)
const SOLIDE = it => !it.r && !it.mur && it.kind !== 'poisson' && !it.on && !it.held && !it.fall && !it.run && it.fade > 0.5;
function spread(dt) {
  const G = Wd.cats.filter(c => !c.perch && !c.jump && !c.fall && !c.held && !c.fight && !c.hidden && !c.gone && !(c.task && (c.task.k === 'climb' || c.task.k === 'jump' || c.task.air)));
  const walks = c => c.task && c.task.k === 'walk';
  const O = Wd.props.filter(SOLIDE);
  G.forEach(c => {
    const walking = walks(c), tx = walking ? (typeof c.task.x === 'function' ? c.task.x() : c.task.x) : c.x;
    for (const it of O) {
      if (c.balai && it.launched) continue;   // la horde fonce dans les cartons (elle les balaie, voir bump)
      if (it.busy === c || c.claims.includes(it)) continue;
      const s = sOf(it.d) * (it.big || 1), hw = it.hull.w / 2 * s + sc(c) * 0.42, dx = c.x - it.x, dd = c.d - it.d;
      if (Math.abs(dd) >= 0.2) continue;
      if (walking) {
        // devant lui, sur son chemin (et ce n'est pas là qu'il va) : il passe devant l'objet, ou derrière s'il n'y a pas la place
        const ahead = sgn(tx - c.x), near = Math.abs(dx) < hw + sc(c) * 0.5 && (Math.abs(dx) < hw * 0.6 || sgn(-dx) === ahead);
        if (!near || Math.abs(tx - it.x) < hw) continue;
        let lane = it.d - 0.24; if (lane < 0) lane = it.d + 0.24; lane = clamp(lane, 0, 0.98);
        c.d += clamp(lane - c.d, -dt * 1.1, dt * 1.1); if (c.task.d !== undefined && Math.abs(c.task.d - it.d) < 0.2) c.task.d = lane;
        // bloqué contre l'objet : s'il est bas, il saute par-dessus (comme un vrai chat) ; sinon il file de côté, plus vite
        if (Math.abs(dx) < hw * 0.8 && Math.abs(dd) < 0.12) {
          const top = it.hull.h * s;
          if (top < sc(c) * 0.9 && Wd.t - (c.hopT ?? -9) > 1.5) { c.hopT = Wd.t; const w = c.task, lx = inView(it.x + ahead * (hw + sc(c) * 0.15)), ld = c.d;
            c.q.unshift(pose('affut', 0.25), hop(() => groundAt(lx, ld), { h: top + sc(c) * 0.3, zr: [0, 0.3] }), w); c.task = null; break; }
          c.d += clamp(lane - c.d, -dt * 1.5, dt * 1.5);
        }
      } else if (Math.abs(dx) < hw && !c.claims.length && !c.pet && !(c.task && c.task.k === 'push')) c.x = inView(c.x + (dx ? sgn(dx) : 1) * Math.min(hw - Math.abs(dx), sc(c) * 1.6 * dt));
    }
  });
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
  G.forEach(c => { if (c.task ? c.task.k !== 'jump' : true) c.y = floorAt(c.d); });   // le sol suit la profondeur, dans la même image
}

// en passant, un chat bouscule les petites choses : la pelote roule, la tasse saute
function bump() {
  // un objet qui tombe sur une tête : bonk (et l'objet rebondit)
  Wd.props.forEach(it => {
    if (!it.fall || it.held || it.vy >= 0 || Wd.t - (it.bonkT ?? -9) < 0.4) return;
    const s = sOf(it.d) * (it.big || 1);
    for (const c of Wd.cats) { if (!c.hp || c.hidden || c.held || Math.abs(c.d - it.d) > 0.3) continue; const r = c.b.head[0] * sc(c);
      if (Math.abs(it.x - c.hp[0]) < it.hull.w / 2 * s + r * 0.6 && Math.abs(it.y - (c.hp[1] - r)) < r * 0.8) {
        if (run(H.bonk, it, c)) break;
        it.bonkT = Wd.t; it.vy = Math.abs(it.vy) * 0.35 + s * 0.8; it.vx = (it.vx || 0) * 0.5 + sgn(it.x - c.x) * s * 1.2; it.tiltV = (it.tiltV || 0) + rnd(-4, 4);
        c.bonk = Wd.t + 0.5; say(c, pick(['bonk !', 'aïe', 'hé !', '?!'])); startle(c, it.x, 0.6); break; } }
  });
  // la pelote qui file : un joueur part à sa poursuite
  Wd.props.forEach(it => {
    if (!it.r || it.held || it.busy || Math.abs(it.vx) < sOf(it.d) * 1.8 || Wd.t - (it.chaseT ?? -9) < 3) return;
    const k = Wd.cats.filter(c => free4(c) && c.ch.joue >= 1 && Math.abs(c.x - it.x) < Wd.W * 0.4).sort((a, b) => b.ch.joue - a.ch.joue)[0];
    it.chaseT = Wd.t; if (k && Math.random() < 0.7) { interrupt(k); say(k, '!'); play(k, it); k.q.forEach(q => { if (q.k === 'walk') q.g = 'galop'; }); }
  });
  // la horde au galop pousse devant elle les cartons lancés et les croquettes : ils partent hors de l'écran (un coup de balai)
  Wd.cats.forEach(c => {
    if (!c.balai || !c.task || c.task.k !== 'walk' || c.jump) return; const v = SPEED.galop * sc(c), dir = c.balai, reach = sc(c) * 0.6;
    Wd.props.forEach(it => { if (!(it.launched || it.swept) || it.held || it.suck || Math.abs(it.d - c.d) > 0.35) return; const dx = (it.x - c.x) * dir;
      if (dx < -sc(c) * 0.2 || dx > it.hull.w / 2 * it.s + reach) return;
      Wd.cats.forEach(o => { if (o.perch && o.perch.it === it) { interrupt(o); o.fall = true; o.vx = dir * v; o.vy = -sOf(it.d) * 1.2; say(o, '!!'); } });
      it.on = null; it.swept = dir; it.fall = true; it.vx = dir * v * rnd(1.25, 1.6); it.vy = Math.max(it.vy || 0, sOf(it.d) * rnd(0.6, 1.4)); it.tiltV = dir * -rnd(4, 9);
      if (Wd.t - (it.sweepT ?? -9) > 0.6) { it.sweepT = Wd.t; dust(it.x, floorAt(it.d), it.s * 0.3, 0.7); } });
    Wd.kib.forEach(k => { if (k.suck || Wd.t < k.t0 || Math.abs((k.x - c.x) * dir - reach * 0.5) > reach) return; k.rest = false; k.swept = true; k.who = null; k.vx = dir * v * rnd(1.2, 1.8); k.vy = -rnd(120, 380) * Wd.s0 / 160; });
  });
  Wd.cats.forEach(c => {
    if (!c.task || c.task.k !== 'walk' || c.perch || c.jump || c.hidden) return;
    const v = SPEED[c.task.g || c.ch.g] * sc(c);
    Wd.props.forEach(it => {
      if (!LEGER[it.kind] || it.busy || it.on || it.held || it.fall || it.run || Wd.t - (it.bumpT ?? -9) < 0.8 || Math.abs(it.d - c.d) > 0.09) return;
      const s = sOf(it.d) * (it.big || 1), dx = it.x - c.x; if (sgn(dx) !== c.face || Math.abs(dx) > it.hull.w / 2 * s + sc(c) * 0.4) return;
      it.bumpT = Wd.t; it.vx = c.face * v * (it.r ? 1.6 : 0.9);
      if (!it.r) { it.fall = true; it.vy = s * 0.5; it.tiltV = -c.face * rnd(2, 4); }
    });
  });
}

// il sursaute : un bond de côté (loin de x), le poil hérissé, puis il se remet
function startle(c, x, p) {
  if (!(free4(c) || (c.task && c.task.k === 'pose' && !c.perch)) || c.held || c.fall || Math.random() > (p ?? 1)) return;
  interrupt(c); const away = sgn(c.x - x) || 1;
  c.q = [hop(() => groundAt(inView(c.x + away * sc(c) * 0.9), c.d), { h: sc(c) * 0.5 }), pose('feule', rnd(0.5, 0.9), { face: -away }), pose('assis', rnd(0.8, 1.5))];
}
// un lourd qui retombe (ou une caisse qui arrive) : les chats d'à côté sursautent
function thud(it) {
  const s = sOf(it.d) * (it.big || 1), r = it.hull.w / 2 * s + s * (LOURD[it.kind] ? 1.4 : 0.8);
  Wd.cats.forEach(c => { if (Math.abs(c.x - it.x) < r && Math.abs(c.d - it.d) < 0.45) { startle(c, it.x, LOURD[it.kind] ? 1 : 0.6); if (Math.random() < 0.4) say(c, pick(['!', '?!', 'mrr ?'])); } });
  if (LOURD[it.kind]) Wd.shake = { t0: Wd.t, a: 5 };
  if (LOURD[it.kind]) Wd.fx.push({ k: 'txt', text: pick(['boum', 'bam !', 'poum']), x: it.x, y: it.y - s * 0.3, t0: Wd.t, life: 1.2, rot: -0.12, size: 20 });
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
    else if (f.k === 'heart') heart(f.x, f.y - u * 26, f.r * K, fade);
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
    k.q = [go(dir > 0 ? W + sc(k) * 2 + i * 10 : -sc(k) * 2 - i * 10, { g: 'galop', v: rnd(1, 1.15) }), fn(k => { k.gone = true; })]; k.balai = dir;   // la horde balaie le bazar au passage
  }
  // les chats de la maison qui traînent : certains se joignent à la course
  Wd.cats.filter(k => !k.temp && free4(k) && Math.random() < 0.4).forEach(k => { interrupt(k); k.q = [pose('affut', rnd(0.3, 0.9), { face: dir }), go(dir > 0 ? W + sc(k) * 2 : -sc(k) * 2, { g: 'galop' }), fn(k => { k.gone = true; })]; });
  later(0.6, () => { const lead = Wd.cats.filter(k => k.temp).sort((a, b) => dir * (b.x - a.x))[0]; if (lead) say(lead, '!'); });
}
function runMice(dt) {
  Wd.props.filter(p => p.run).forEach(m => {
    m.fx += m.run.dir * m.run.v * dt / Wd.W; m.d = m.dT; Univers.scurry(m, Wd.t, 1);
    if ((m.run.dir > 0 && m.fx > 1.1) || (m.run.dir < 0 && m.fx < -0.1)) unprop(m);
  });
}
function tower() {
  if (Wd.tower) return false;   // une tour à la fois
  // une pile de caisses tombe du ciel, une à une ; les chats y grimpent ; ça penche… et tout s'écroule
  const tr = Wd.P.arbre, clear = tr ? tr.fx + (0.75 + 0.35) * Wd.s0 / Wd.W : 0.15;   // pas contre l'arbre
  const cands = [0.2, 0.3, 0.45, 0.55, 0.7, 0.85].filter(f => f > clear && (Wd.mode === 'large' || f > 0.3));
  if (!cands.length) return false;   // pas de place (écran étroit, l'arbre au milieu) : un autre scénario
  const fx = cands.sort((a, b) => Math.min(...Wd.props.filter(p => !p.run).map(p => Math.abs(p.fx - b))) - Math.min(...Wd.props.filter(p => !p.run).map(p => Math.abs(p.fx - a))))[0];
  const d = rnd(0.3, 0.6), all = Wd.mode === 'large' ? [2, 2, 1, 1, 0, 0] : [1, 1, 0], H = [0.24, 0.3, 0.34];
  // pas plus haute que la place libre sous le titre et les boutons
  const room = (floorAt(d) - ceilY()) / sOf(d) - 0.35; let h = 0; const sizes = all.filter(z => (h += H[z]) < room); if (sizes.length < 2) return false;
  // un escalier en zigzag : chaque caisse déborde d'un côté, et laisse à celle du dessous une marche où poser les pattes
  const z0 = Math.random() < 0.5 ? -1 : 1, offs = sizes.map((_, i) => i ? (i % 2 ? z0 : -z0) * 0.16 : 0);
  const T = Wd.tower = { boxes: [], t: 0, phase: 'pile', w: 0, fx, d, offs };
  sizes.forEach((size, i) => later(i * 0.52, () => {
    if (Wd.tower !== T) return;
    const b = prop('caisse', fx + offs.slice(0, i + 1).reduce((a, o) => a + o, 0) * sOf(d) / Wd.W + rnd(-0.002, 0.002), d, { size }); b.tower = T; b.fall = true; b.lift = Wd.H + sOf(d) * 0.5; b.vy = -sOf(d) * 2; b.tilt = rnd(-0.25, 0.25); b.tiltV = -b.tilt * 1.5;
    b.target = T.boxes[T.boxes.length - 1] || null; b.zo = 100; T.boxes.push(b);
    if (i === sizes.length - 1) later(1.2, () => { if (Wd.tower === T) { T.phase = 'debout'; T.t = 0; climbers(T); } });
  }));
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
      Wd.shake = { t0: Wd.t, a: 7 };
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
    if (it.fade < 0.02 && !it.fadeT) goHome(it);
  });
}

/* ——— la machine à cartons : un coup sur elle, un carton ; le levier baissé, ça n'arrête pas ——— */
function shoot(g) {
  if (!g || !Wd.props.includes(g) || g.fall || g.held || run(H.shoot, g)) return;
  const m = Univers.at(g, g.bouche), m2 = Univers.at(g, [g.bouche[0] + g.vise[0] * 0.2, g.bouche[1] + g.vise[1] * 0.2, 0]);
  const L = Math.hypot(m2[0] - m[0], m2[1] - m[1]) || 1, ux = (m2[0] - m[0]) / L, uy = -(m2[1] - m[1]) / L;
  const s = sOf(0.4), v = s * rnd(5, 8.5) * (Wd.mode === 'large' ? 1 : 0.7);
  const b = prop('caisse', m[0] / Wd.W, g.d, { size: Math.random() < 0.6 ? 0 : 1 });
  b.dT = rnd(0.05, 0.7); b.lift = floorAt(g.d) - m[1]; b.fall = true; b.vx = ux * v; b.vy = uy * v; b.tiltV = rnd(-7, 7); b.launched = Wd.t; b.zo = 50;
  g.wob = Wd.t; g.wobA = 0.8; dust(m[0], m[1], s * 0.2, 0.9);
  Wd.fx.push({ k: 'txt', text: pick(['pouf !', 'ploc', 'tchac !', 'et hop']), x: m[0] + ux * 20, y: m[1] - 26, t0: Wd.t, life: 1.1, rot: -0.15, size: 17 });
  // trop de cartons : les plus vieux (vides) s'effacent
  const cap = Wd.mode === 'large' ? 14 : 5, old = Wd.props.filter(p => p.launched && !p.busy && !p.held && !Wd.cats.some(c => c.perch && c.perch.it === p) && p.fadeT).sort((a, b) => a.launched - b.launched);
  const n = Wd.props.filter(p => p.launched && p.fadeT).length; for (let i = 0; i < n - cap && i < old.length; i++) old[i].fadeT = 0;
}
function machines(dt) {
  Wd.props.forEach(g => {
    if (g.pivot) {
      if (!g.pulling) { const u = Wd.t - (g.flick ?? -9); g.pull = u < 0.5 ? Math.sin(u / 0.5 * Math.PI) : (g.pull || 0) * Math.exp(-dt * 7); }
      if (g.pulling && g.pull > 0.75 && Wd.t > (g.next || 0)) { shoot(g); g.next = Wd.t + 0.3; }
    }
    if (g.folle) {
      const F = g.folle;
      if (Wd.t > F.next && Wd.kib.length < KIBMAX()) { F.next = Wd.t + 0.07; const m = Univers.at(g, g.bec), k = Wd.s0 / 160;
        for (let i = 0; i < 3; i++) Wd.kib.push({ x: m[0], y: m[1], vx: rnd(-750, 750) * k, vy: -rnd(300, 1050) * k, d: rnd(0, 0.15), t0: Wd.t, rest: false, spin: Math.random() * 6 }); }
      if (Wd.t > F.say) { F.say = Wd.t + rnd(0.6, 1); const m = Univers.at(g, g.bec); Wd.fx.push({ k: 'txt', text: pick(['BZZT !', 'ding ding ding', '!!!', 'croquettes !!!', 'brrrrr']), x: m[0] + rnd(-40, 40), y: m[1] - g.s * rnd(0.4, 0.8), t0: Wd.t, life: 1.2, rot: rnd(-0.3, 0.3), size: 19 }); }
      if (!F.fest && Wd.t > F.t0 + 1.2) { F.fest = true; feast(); }
      if (Wd.t > F.end) { g.folle = null; const m = Univers.at(g, [0, 0.8, 0]); dust(m[0], m[1], g.s * 0.3, 1); Wd.fx.push({ k: 'txt', text: 'pfff…', x: m[0], y: m[1] - 20, t0: Wd.t, life: 1.6, rot: -0.1, size: 18 }); g.clk = 0; }
    }
  });
  // les cartons lancés et effacés s'en vont pour de bon
  Wd.props.slice().forEach(p => { if (p.gone) { unprop(p); return; } if (p.launched && !p.fadeT && p.fade < 0.02) { Wd.cats.forEach(c => { if (c.perch && c.perch.it === p) interrupt(c); }); unprop(p); } });
}
// le distributeur devient fou : il tremble, saute, et crache des croquettes partout, longtemps
function folle(g) {
  if (!g || g.folle) return; g.folle = { t0: Wd.t, end: Wd.t + rnd(6, 8), next: 0, say: 0 }; g.wob = Wd.t; g.wobA = 1;
  const m = Univers.at(g, g.bec); Wd.fx.push({ k: 'txt', text: 'BZZZT !!', x: m[0], y: m[1] - g.s * 0.6, t0: Wd.t, life: 1.5, rot: -0.2, size: 24 });
}
// le festin : tous les chats du coin accourent (et ceux d'à côté débarquent), ils mangent tout
function feast() {
  const n = Wd.mode === 'large' ? 6 : 3;
  for (let i = 0; i < n; i++) later(i * 0.35, () => { if (Wd.cats.filter(c => c.temp).length >= TEMPMAX() || Wd.cats.length >= MAXC + 4) return; const side = i % 2 ? -1 : 1, c = addCat({ temp: true, face: -side, d: rnd(0, 0.6) });
    c.x = side < 0 ? -sc(c) * 1.2 : Wd.W + sc(c) * 1.2; c.glouton = true; c.q.push(go(rnd(0.2, 0.8) * Wd.W, { g: 'galop' })); if (i === 0) say(c, 'miaaou !'); crunch(c); });
  Wd.cats.forEach(c => { if (!c.temp && free4(c) && Math.random() < 0.85) { interrupt(c); c.glouton = true; crunch(c); } });
}
// ouvrir un carton fermé (un coup de griffe, deux) : il devient un carton ouvert… et on s'y installe
function open(c, b) {
  claim(c, b);
  c.q.push(fn(c => { const w = beside(c, xOf(b), b.box.w / 2 * sOf(b.d) - front(c) * 0.3); c.q.unshift(go(w.x, { d: Math.max(0, b.d - 0.05), face: w.face })); }),
    pose('affut', rnd(0.5, 1)), pose('tape', 0.5, { fx: c => say(c, 'scritch') }), pose('assis', 0.4), pose('tape', 0.5),
    fn(c => { const nb = unbox(b); free(c); if (nb) hide(c, nb); }));
}
function unbox(b) {
  if (!Wd.props.includes(b) || b.fall || b.held || b.on || Wd.props.some(o => o.on === b)) return null;
  const k = b.box.w / 0.56 * 1.25, nb = prop('carton', b.fx, b.d); nb.big = k; nb.launched = b.launched || Wd.t; nb.zo = b.zo;
  if (b.home) nb.home = { fx: b.fx, d: b.d }; unprop(b);
  const s = sOf(nb.d); dust(nb.fx * Wd.W, floorAt(nb.d) - s * 0.2, s * 0.35, 1); Wd.fx.push({ k: 'txt', text: 'pop !', x: nb.fx * Wd.W, y: floorAt(nb.d) - s * 0.55, t0: Wd.t, life: 1.1, rot: 0.1, size: 17 });
  return nb;
}

/* ——— les croquettes : le distributeur en crache une poignée, en l'air ; elles rebondissent sur la tête des chats ——— */
function fire(g, who) {
  if (!g || !Wd.props.includes(g) || Wd.t - (g.shake ?? -9) < 1.2 || run(H.fire, g, who)) return;
  g.shake = Wd.t; g.wob = Wd.t; g.wobA = 0.6; const m = Univers.at(g, g.bec), k = Wd.s0 / 160, n = 9 + Math.floor(Math.random() * 7);
  Wd.fx.push({ k: 'txt', text: 'ding !', x: m[0] - g.s * 0.15, y: m[1] - g.s * 0.5, t0: Wd.t, life: 1.4, rot: -0.1, size: 18 });
  for (let i = 0; i < n && Wd.kib.length < KIBMAX(); i++) Wd.kib.push({ x: m[0], y: m[1], vx: rnd(90, 520) * k * (Math.random() < 0.12 ? -0.6 : 1), vy: -rnd(380, 820) * k, d: rnd(0, 0.12), t0: Wd.t + i * 0.045, rest: false, spin: Math.random() * 6 });
  // les gourmands accourent
  Wd.cats.filter(c => c !== who && free4(c) && !c.temp && Math.random() < 0.6).forEach(c => { interrupt(c); c.q = [pose('affut', rnd(0.4, 1.2))]; });
}
function kibFrame(dt) {
  const g = grav();
  Wd.kib = Wd.kib.filter(k => !k.gone && Wd.t - k.t0 < 45);
  Wd.kib.forEach(k => {
    if (Wd.t < k.t0 || k.rest) return;
    k.vy += g * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.spin += dt * 9;
    if (k.swept) { if (k.x < -20 || k.x > Wd.W + 20) k.gone = true; }
    else if (k.x < 6 || k.x > Wd.W - 6) { k.x = clamp(k.x, 6, Wd.W - 6); k.vx *= -0.5; }
    // bonk : sur une tête
    if (k.vy > 0) for (const c of Wd.cats) { if (!c.hp || c.hidden) continue; const r = c.b.head[0] * sc(c) * 0.95;
      if (Math.hypot(k.x - c.hp[0], k.y - c.hp[1]) < r) { k.vy = -Math.abs(k.vy) * 0.45 - 60; k.vx += rnd(-80, 80); k.y = c.hp[1] - r;
        c.bonk = Wd.t + 0.45; if (Wd.t - (c.saidBonk || -9) > 0.9) { c.saidBonk = Wd.t; say(c, pick(['bonk', 'aïe', '?!', 'toc'])); } break; } }
    const f = floorAt(k.d);
    if (k.y >= f && k.vy > 0) { k.y = f; if (k.vy > 180) { k.vy = -k.vy * 0.35; k.vx *= k.swept ? 0.9 : 0.55; } else if (k.swept && Math.abs(k.vx) > 40) { k.vy = -rnd(60, 160); k.vx *= 0.93; } else { k.rest = true; k.swept = false; k.vx = k.vy = 0; } }
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
  const want = clamp(Math.floor((residents().length - 2) / 2), 0, Wd.mode === 'large' ? 8 : 1), X = Wd.extras;
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


/* ——— l'aspirateur divin : quand il y a trop de bazar, il descend du ciel (dans un rayon de lumière), balaie la scène
   d'un bord à l'autre et aspire ce qui traîne (les cartons lancés, les croquettes, les objets déplacés, qui reviennent à leur place) ;
   les chats s'enfuient… sauf un curieux, aspiré puis recraché ——— */
const clutter = () => Wd.props.filter(p => p.launched && !p.suck).length + Math.floor(Wd.kib.filter(k => k.rest).length / 12) + Wd.props.filter(p => p.away && !p.launched && Wd.t - p.away > 6).length;
function aspire() {
  if (Wd.vac) return; const dir = Math.random() < 0.5 ? 1 : -1;
  Wd.vac = { t0: Wd.t, dir, x: dir > 0 ? Wd.s0 * 0.6 : Wd.W - Wd.s0 * 0.6, ph: 'descend', curious: false };
  const c = Wd.cats.find(k => free4(k)); if (c) say(c, '?!');
}
function vacFrame(dt) {
  if (!Wd.vac) { if (Wd.t > (Wd.vacT || 0)) { Wd.vacT = Wd.t + 1; if (clutter() >= (Wd.mode === 'large' ? 14 : 7)) aspire(); } return; }
  const V = Wd.vac, u = Wd.t - V.t0, s0 = Wd.s0, mouthY = Wd.floor - s0 * 1.05;
  V.y = V.ph === 'descend' ? -s0 + (mouthY + s0) * sm(u / 1.3) : V.ph === 'remonte' ? mouthY - (mouthY + s0 * 1.5) * sm((Wd.t - V.tu) / 1.2) : mouthY + Math.sin(u * 5) * 4;
  if (V.ph === 'descend' && u > 1.3) { V.ph = 'balaye'; V.tb = Wd.t; Wd.fx.push({ k: 'txt', text: 'VROUUUM', x: V.x, y: mouthY - s0 * 0.9, t0: Wd.t, life: 1.6, rot: -0.1, size: 22 }); }
  if (V.ph === 'balaye') {
    V.x += V.dir * Wd.W / 5.5 * dt;
    const R = s0 * 0.9;
    // ce qui traîne sous la bouche s'envole vers elle
    Wd.props.forEach(it => { if (it.suck || it.held || it.run || it.mur || Math.abs(it.x - V.x) > R) return;
      const temp = it.launched || (it.away && Wd.t - it.away > 2 && !it.tower); if (!temp) return;
      it.suck = { t0: Wd.t, fx: it.fx, lift: it.lift }; it.on = null; it.fall = false; });
    Wd.kib.forEach(k => { if (!k.suck && Math.abs(k.x - V.x) < R) { k.suck = Wd.t; k.sx = k.x; k.sy = k.y; if (k.who) k.who = null; } });
    // les chats : ils filent de l'autre côté ; un curieux s'approche trop… aspiré, puis recraché
    Wd.cats.forEach(c => { if (c.held || c.fall || c.hidden || c.perch || Math.abs(c.x - V.x) > R * 1.8 || Wd.t - (c.fled || -9) < 4) return;
      c.fled = Wd.t;
      if (!V.curious && Math.random() < 0.35 && Math.abs(c.x - V.x) < R) { V.curious = true; interrupt(c); say(c, 'miaaa !!'); c.fall = true; c.vx = (V.x - c.x) * 2; c.vy = -Math.sqrt(2 * grav() * Math.max(10, c.y - V.y)); c.spin = Math.PI * 2 * sgn(Math.random() - 0.5);
        later(0.9, () => Wd.fx.push({ k: 'txt', text: 'ptoui !', x: V.x, y: V.y + 10, t0: Wd.t, life: 1.2, rot: 0.1, size: 18 })); return; }
      interrupt(c); say(c, pick(['!!', 'fshhh', 'mia !'])); c.q = [go(inView(c.x + V.dir * Wd.W * 0.35), { g: 'galop' }), pose('affut', rnd(1, 2), { face: -V.dir }), pose('toilette', rnd(1.5, 3))]; });
    if (V.x < -s0 * 0.4 || V.x > Wd.W + s0 * 0.4 || Wd.t - V.tb > 7) { V.ph = 'remonte'; V.tu = Wd.t; V.x = clamp(V.x, 0, Wd.W);
      Wd.fx.push({ k: 'txt', text: pick(['propre !', 'voilà.', 'merci qui ?']), x: clamp(V.x, 60, Wd.W - 60), y: mouthY - s0 * 0.5, t0: Wd.t, life: 2, rot: -0.08, size: 22 }); }
  }
  if (V.ph === 'remonte' && Wd.t - V.tu > 1.2 && !Wd.props.some(p => p.suck) && !Wd.kib.some(k => k.suck)) Wd.vac = null;
  // l'aspiration : vers la bouche, de plus en plus petit, puis disparu
  const mx = V.x, my = V.y + s0 * 0.05;
  Wd.props.slice().forEach(it => { if (!it.suck) return; const q = Math.min(1, (Wd.t - it.suck.t0) / 0.7), e = q * q;
    it.fx = it.suck.fx + (mx / Wd.W - it.suck.fx) * e; it.lift = it.suck.lift + (floorAt(it.d) - my - it.suck.lift) * e; it.tilt = (it.tilt || 0) + dt * 9; it.fade = it.fadeT = 1 - e;
    Wd.cats.forEach(c => { if (c.perch && c.perch.it === it) { interrupt(c); c.fall = true; c.vy = -sOf(it.d); say(c, '!!'); } });
    if (q >= 1) { it.suck = null; if (it.launched || !it.home) unprop(it); else goHome(it); } });
  Wd.kib.forEach(k => { if (!k.suck) return; const q = Math.min(1, (Wd.t - k.suck) / 0.45); k.rest = true; k.x = k.sx + (mx - k.sx) * q * q; k.y = k.sy + (my - k.sy) * q * q; if (q >= 1) k.gone = true; });
}
function drawVac(S) {
  const V = Wd.vac; if (!V) return; const C = Chalk, s0 = Wd.s0, x = V.x, y = V.y, a = 0.85 * Wd.a, w = s0 * 0.28;
  // le rayon divin : de la lumière qui tombe du ciel autour du tuyau
  for (let i = -3; i <= 3; i++) { const sp = i * s0 * 0.16; C.line(x + sp * 0.3, 0, x + sp, y - s0 * 0.1, 1, { w: 1.1, a: 0.16 * Wd.a, amp: 0.4, seed: 40 + i, tip: false, dash: [6, 9] }); }
  // le tuyau (deux traits ondulés), les annelures
  const hose = k => { const P = []; for (let j = 0; j <= 12; j++) { const v = j / 12, yy = -10 + (y - s0 * 0.35 + 10) * v; P.push([x + k * w * 0.32 + Math.sin(v * 7 + Wd.t * 3) * s0 * 0.05 * (1 - v), yy]); } return P; };
  C.stroke(hose(-1), 1, { w: 2, a, seed: 51, tip: false }); C.stroke(hose(1), 1, { w: 2, a, seed: 52, tip: false });
  for (let j = 1; j < 6; j++) { const yy = (y - s0 * 0.35) * j / 6, xx = x + Math.sin(j / 6 * 7 + Wd.t * 3) * s0 * 0.05 * (1 - j / 6); C.line(xx - w * 0.32, yy, xx + w * 0.32, yy + 3, 1, { w: 1.2, a: a * 0.6, seed: 60 + j, tip: false }); }
  // la bouche : un entonnoir large, ouvert vers le bas ; une auréole au-dessus
  C.stroke([[x - w * 0.32, y - s0 * 0.35], [x - w, y], [x + w, y], [x + w * 0.32, y - s0 * 0.35]], 1, { w: 2.4, a, seed: 70, tip: false });
  C.circle(x, y - s0 * 0.5, w * 0.7, w * 0.16, 1, { w: 1.6, a: a * 0.8, seed: 71 });
  // l'aspiration : des petits traits qui montent vers la bouche
  if (V.ph === 'balaye') for (let i = 0; i < 7; i++) { const ph = (Wd.t * 2.2 + i / 7) % 1, sx = x + (i - 3) * s0 * 0.22 * (1 - ph), sy = Wd.floor - (Wd.floor - y) * ph; C.line(sx, sy + 8, sx + (x - sx) * 0.1, sy, 1, { w: 1.2, a: a * 0.5 * (1 - ph), seed: 80 + i, tip: false }); }
}

/* ——— les scénarios, chacun son tour (dans un ordre mélangé) ; js/scenarios.js en ajoute ——— */
const SCEN = [horde, tower];
function nextScenario() {
  if (!Wd.order || !Wd.order.length) { Wd.order = SCEN.slice().sort(() => Math.random() - 0.5); if (Wd.order[0] === Wd.lastScen && Wd.order.length > 1) Wd.order.push(Wd.order.shift()); }
  // un scénario qui ne peut pas partir (pas assez de chats libres) : le suivant
  for (let i = 0; i < 3; i++) { const f = Wd.order.shift() || SCEN[0]; Wd.lastScen = f; if (f() !== false) return; }
}

/* ——— l'image ——— */
let ready = false;
function frame(S) {
  if (!Obj3D.ok) return;
  const dt = Math.min(0.05, S.dt || 0); Wd.a = S.a;
  measure(S);
  for (let i = 0; i < (Wd.fast || 1); i++) step(S, dt);   // Wd.fast : pour les essais, le monde en accéléré
}
function step(S, dt) {
  Wd.f++; Wd.t += dt;
  if (!ready) { ready = true; for (let i = 0; i < 2; i++) { const c = addCat({ x: rnd(0.3, 0.85) * Wd.W }); c.q.push(pose(pick(['assis', 'toilette', 'pain']), rnd(2, 5))); } }
  // la population : trois chats (au moins) ; quand l'un part, un autre arrive
  if (dt && residents().length < (Wd.mode === 'large' ? 3 : 2) && Wd.t > Wd.nextIn) { enter(); Wd.nextIn = Wd.t + rnd(3, 9); }
  // les scénarios
  if (dt && Wd.t > Wd.nextScen && !Wd.tower && !Wd.props.some(p => p.run) && !Wd.busyScen) { nextScenario(); Wd.nextScen = Wd.t + rnd(24, 42); }
  if (Wd.t > (Wd.ceilT || 0)) { Wd.ceil = ceilY(); Wd.s0T = size0(); Wd.ceilT = Wd.t + 0.5; }
  if (Math.abs(Wd.s0T - Wd.s0) > 0.05) { Wd.s0 += (Wd.s0T - Wd.s0) * Math.min(1, dt * 1.5); Wd.depth = Wd.s0 * 0.7; }
  laters(); H.pre.forEach(f => f(dt)); runMice(dt); towerFrame(dt); kibFrame(dt); vacFrame(dt); extras(); machines(dt);
  Wd.cats.forEach(c => { if (c.pet && Wd.t - c.pet.t > 5) { c.pet = null; c.task = null; } });
  if (dt && Wd.t > Wd.nextKib) { const g = Wd.props.find(p => p.kind === 'distrib'); if (g) fire(g); Wd.nextKib = Wd.t + rnd(16, 32); }
  Wd.props.forEach(it => updProp(it, dt)); apart(dt);
  Wd.cats.slice().forEach(c => live(c, dt));
  spread(dt); bump();
  H.post.forEach(f => f(dt));
  tidy();
}
function draw(S) { drawWater(S); drawKib(S); drawVac(S); H.draw.forEach(f => f(S)); drawFx(S); }
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
    const w = Math.max(it.hull.w * s * 0.55, 16), h = Math.max(it.hull.h * s * 1.1, 22);
    return Math.abs(x - it.x) < w && y < it.y + 8 && y > it.y - h; });
}
// une chichenaude sur un objet : le distributeur tire, la pelote roule, ce qui est posé tombe, le reste sursaute
function poke(it, x) {
  const s = sOf(it.d), side = sgn(it.x - x || 1);
  // un chat dedans (ou dessus) : il en jaillit
  const inside = Wd.cats.filter(c => c.perch && c.perch.it === it);
  if (inside.length && !LOURD[it.kind]) { inside.forEach(c => { interrupt(c); say(c, pick(['!', 'mia !', '?!'])); c.q = [hop(() => groundAt(inView(it.x + sgn(Math.random() - 0.5) * sc(c) * 1.2), Math.max(0, it.d - 0.2)), { h: sc(c) * 0.9, zr: [0.2, 0.6] }), pose('feule', 0.6), pose('toilette', 2)]; }); it.wob = Wd.t; return; }
  if (it.kind === 'distrib') { it.clk = Wd.t - (it.clkT ?? -9) < 2.5 ? (it.clk || 0) + 1 : 1; it.clkT = Wd.t; if (it.clk >= 3 || Math.random() < 0.1) folle(it); else fire(it); }
  else if (it.pivot) { it.flick = Wd.t; shoot(it); }
  else if (it.kind === 'arbre') { it.poke = it.wob = Wd.t; it.wobA = 1; }
  else if (it.r) { it.vx = side * s * rnd(2, 3); it.fall = true; it.vy = s * 0.6; }
  else if (it.on) drop(it, side * s * 1.1, s * 0.8, -side * 6);
  else if (!it.fall) { it.fall = true; it.vy = s * 1.5; it.tiltV = rnd(-1.5, 1.5); }
}
function click(x, y, S) {
  if (!ready) return false;
  if (run(H.click, x, y)) return true;
  const c = catAt(x, y);
  if (c) { purr(c); return true; }
  const it = propAt(x, y);
  if (it) { poke(it, x); return true; }
  // un chat tombe du ciel, ici
  if (residents().length >= MAXC) return false;
  Wd.clicks++;
  const k = addCat({ x: clamp(x, 20, Wd.W - 20) }); k.y = -sc(k) * 1.2; k.fall = true; k.vy = 0; k.vx = 0; k.spin = Math.PI * sgn(Math.random() - 0.5); k.stay = rnd(60, 140);
  return true;
}
// attraper : le film demande d'abord qui est sous le doigt (sans rien changer) ; le chat n'est soulevé qu'au premier glissé.
// Lâché sans avoir bougé, c'est une caresse : il ronronne.
function grab(x, y) {
  if (!ready) return null; Wd.gx = x; Wd.gy = y;
  const L = leverAt(x, y); if (L) return L;
  const c = catAt(x, y); if (c) return c; const it = propAt(x, y); return it && !it.run ? it : null;
}
// le levier de la machine à cartons : son pommeau à l'écran
function knob(g) { const a = (g.lev0 ?? 0.3) + (g.pull || 0) * (g.levK ?? 1.3); return Univers.at(g, [g.pivot[0] - Math.sin(a) * 0.3, g.pivot[1] + Math.cos(a) * 0.3, g.pivot[2]]); }
function leverAt(x, y) { const g = Wd.props.find(p => p.pivot && !p.held && !p.fall && p.a > 0.5); if (!g) return null; const k = knob(g); return Math.hypot(x - k[0], y - k[1]) < Math.max(g.s * 0.09, 18) ? (g.handle || (g.handle = { lever: g })) : null; }
const isProp = k => !!(k && k.hull);
function drag(c, x, y) {
  if (!c || run(H.drag, c, x, y)) return;
  if (c.lever) { const g = c.lever; if (!g.pulling) { g.pulling = true; c.y0 = y - (g.pull || 0) * g.s * 0.35; } g.pull = clamp((y - c.y0) / (g.s * 0.35), 0, 1); return; }
  if (isProp(c)) { const it = c; if (it.mur) return;   // accrochée au mur : on ne l'emporte pas
    if (!it.held) {
      // on le soulève : ce qui dormait dessus saute (live), ce qui était posé dessus suit ; il ne revient plus seul à sa place tout de suite
      it.on = null; it.fall = false; it.target = null; it.held = true; it.vy = it.tiltV = 0; it.gdx = x - it.x; it.gdy = y - it.y; it.fadeT = 1; it.away = null;
      if (it.tower) { it.tower.boxes.splice(it.tower.boxes.indexOf(it), 1); it.tower = null; it.launched = Wd.t; }   // sortie de la tour : un carton temporaire comme un autre
      // les chats d'à côté regardent ce qui s'envole
      Wd.cats.forEach(k => { if (free4(k) && Math.abs(k.x - it.x) < Wd.W * 0.4 && Math.random() < 0.5) { interrupt(k); k.q = [pose('affut', rnd(1, 2.2), { face: sgn(it.x - k.x) })]; } });
      if (LOURD[it.kind]) Wd.fx.push({ k: 'txt', text: 'hop…', x, y: y - it.s * 0.2, t0: Wd.t, life: 1, rot: -0.1, size: 16 });
    }
    it.hx = x; it.hy = y; return; }
  // le geste décide : vers le haut, on le soulève (par la peau du cou) ; de côté ou vers le bas, on le caresse
  if (!c.held && !c.pet) { const dx = x - (Wd.gx ?? x), dy = y - (Wd.gy ?? y);
    if (Math.hypot(dx, dy) < 12) return;   // le geste n'a pas encore de direction : on attend
    if (Math.abs(dx) > Math.abs(dy) * 2.2 && dy > -8 && !c.fall && !c.jump) { interrupt(c); c.pet = { n: 0, dir: 0, lx: x, t: Wd.t, run: 0 }; c.q = []; c.task = { k: 'wait', anim: 'caresse', until: c => !c.pet, max: 120, t: 0 }; say(c, '♥'); } }
  // la main sort du dos (trop loin sur le côté, ou vers le haut) : on arrête de caresser, on l'attrape
  if (c.pet) { const b = Chat.where(c, c.body), k = sc(c); if (Math.abs(x - b[0]) > c.D.a * k * 1.3 + 20 || y < b[1] - c.D.h * k * 1.6 - 20) { c.pet = null; c.task = null; } else { pet(c, x, y); return; } }
  if (!c.held) { interrupt(c); c.fall = false; c.held = true; c.spin = 0; c.pend = { th: 0, w: 0, px: x, py: y, vx: 0, vy: 0, ax: 0 }; say(c, pick(['mia ?', '…', 'hé !'])); }
  c.hx = x; c.hy = y;
}
// les caresses : chaque aller-retour de la main compte ; il ronronne, pétrit, s'endort… ou en a assez (un coup de patte)
function pet(c, x, y) {
  const P = c.pet, m = x - P.lx; P.run += Math.abs(m); P.lx = x;
  if (Math.abs(m) > 2) { const d = sgn(m); if (d !== P.dir && P.run > sc(c) * 0.12) { P.dir = d; P.run = 0; P.n++; c.purr = Wd.t + 2.5;
    if (P.n % 2 === 0) Wd.fx.push({ k: 'heart', x: x + rnd(-10, 10), y: y - 14, t0: Wd.t, life: 1.3, r: clamp(sc(c) * 0.06, 6, 11) });
    if (P.n === 3) say(c, 'rrrr', 0); if (P.n === 7) say(c, 'rrrrrrr ♥', 0);
    // trop, c'est trop : le grincheux (et parfois un autre) donne un petit coup de patte
    const lim = c.breed === 'grincheux' ? 5 : 12 + Math.floor(Math.random() * 10);
    if (P.n >= lim && Math.random() < (c.breed === 'grincheux' ? 0.8 : 0.35)) { c.pet = null; c.task = null; c.q = [pose('tape', 0.5, { face: sgn(x - c.x) || c.face, fx: c => say(c, 'pfff !') }), go(inView(c.x - sgn(x - c.x) * sc(c) * 1.5), { g: 'trot' }), pose('toilette', 2.5)]; } } }
  P.t = Wd.t; c.face = c.face;
}
function purr(c) { c.purr = Wd.t + 2.6; say(c, '♥'); later(0.5, () => say(c, 'rrrr', 0)); }
function release(c, vx, vy) {
  if (!c || run(H.release, c, vx, vy)) return;
  if (c.lever) { const g = c.lever; if (!g.pulling) { g.flick = Wd.t; shoot(g); } g.pulling = false; return; }
  if (c.pet) { const n = c.pet.n; c.pet = null; c.task = null; c.q = n > 5 ? [pose('petrit', rnd(2, 3.5), { fx: c => say(c, '♥') }), pose('pain', rnd(4, 8))] : [pose('assis', rnd(1, 2))]; if (!n) purr(c); return; }
  if (isProp(c)) { const it = c; if (!it.held) { poke(it, Wd.gx ?? it.x); return; }
    // lâché : il vole, tourne sur lui-même, rebondit, se pose (sur une caisse, s'il tombe dessus)
    it.held = false; drop(it, clamp(vx || 0, -1800, 1800), -clamp(vy || 0, -1800, 1800), clamp((vx || 0) * 0.004, -7, 7) + rnd(-1, 1)); return; }
  if (!c.held) { purr(c); return; }
  c.held = false; c.fall = true; c.vx = clamp(vx || 0, -1500, 1500); c.vy = clamp(vy || 0, -1500, 1500);
  // la pose change (pendu → en chute) : le corps reste où il est
  c.y += c.D.stand * sc(c); c.cur[I.y] = c.D.stand; c.spin = clamp((c.pend ? c.pend.th : 0) * c.face - c.vx * 0.002, -1.5, 1.5); c.pend = null;
  c.d = freeD();
}

// pour js/vie.js : le monde et ses outils
const K = { Wd, H, ANIMS, STEPS, CARAC, SPEED, LOURD, I, sit, lie, blink, rnd, pick, clamp, sgn, sm, c01, lerp, later, sc, front, back, sOf, floorAt, zOf, xOf, grav, inView, groundAt, perchAt, beside,
  SCEN, addCat, unCat, free, free4, zoomies, eat, play, climb, push, smash, interrupt, claim, go, pose, hop, fn, say, dust, startle, thud, drop, prop, unprop, kick, residents, leave, enter, catAt, propAt, freeD, stack, topOf, open, unbox, hide, sleep, idle, stroll, press, fire, folle, aspire,
  get MAXC() { return MAXC; } };
return { K, ANIMS, CARAC, frame, draw, hide, click, grab, drag, release, get clicks() { return Wd.clicks; }, get world() { return Wd; }, horde, tower, aspire, folle: () => folle(Wd.P.distrib), ouvre: () => { const b = Wd.props.find(p => p.launched && p.kind === 'caisse' && !p.busy && !p.fall), c = Wd.cats.find(free4); if (b && c) { interrupt(c); open(c, b); } }, fight: () => { const L = Wd.cats.filter(free4).slice(0, 2); if (L.length > 1) fight(L); }, quarrel: () => { const L = Wd.cats.filter(free4); if (L.length > 1) quarrel(L[0], L[1]); } };
})();
