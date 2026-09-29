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
  // la toilette, un petit rituel (10 s), lisible de face : lécher la patte levée contre la joue (la langue sort), se frotter la joue
  // jusqu'à l'oreille, se lécher le poitrail (le nez dans le cou), puis une secousse de la tête et un air ravi.
  // La patte reste hors de la tête (dessinée derrière elle, elle y disparaîtrait). c.tongue : la langue (dessinée à la craie, js/vie.js)
  toilette(c, p, t) {
    const D = c.D, b = c.b, cyc = t % 10, flick = Math.max(0, Math.sin(t * 11));
    c.tongue = 0; c.lickTo = null; sit(c, p, -0.04); p[I.look] = 1; p[I.eyes] = 1; p[I.tailWave] = 0.25; p[I.tailPhase] = t * 1.5;
    if (cyc < 6.2) {
      // la patte (celle de devant, côté nous) levée contre la joue, le poignet qui monte et descend
      const k = c.face > 0 ? 'fr' : 'fl', ki = k === 'fr' ? I.fk2 : I.fk, lick = cyc < 3.2, e = sm(cyc / 0.35) * (1 - sm((cyc - 5.85) / 0.35));
      const pitch = p[I.pitch], sx = 1 + p[I.stretch] - p[I.sqz] * 0.5, sy = 1 + p[I.sqz];
      const up = [Math.sin(pitch), Math.cos(pitch)], fwd = [Math.cos(pitch), -Math.sin(pitch)], hc = [D.head[0] * sx + p[I.hx], D.head[1] * sy + p[I.hy]];
      // lécher : à hauteur de bouche, elle monte et descend sous la langue ; frotter : elle remonte la joue jusqu'à l'oreille, deux fois
      const u = lick ? 0 : (cyc - 3.2) / 3, w = 0.5 - 0.5 * Math.cos(u * Math.PI * 4);
      const m = lick ? -0.4 + Math.sin(t * 5.5) * 0.08 : -0.35 + 0.85 * w, f = lick ? 1.28 : 1.28 - 0.08 * w;
      const tx = hc[0] + up[0] * b.head[1] * m + fwd[0] * b.head[0] * f, ty = hc[1] + up[1] * b.head[1] * m + fwd[1] * b.head[0] * f;
      const hip = D.hips.f, vx = tx - hip[0] * sx, vy = ty - hip[1] * sy, ang = Math.atan2(vx, -vy), ext = clamp(Math.hypot(vx, vy) * 0.9 / D.ll, 0.3, 1.6);
      p[I[k]] = lerp(p[I[k]], ang, e); p[ki] = lerp(p[ki], ext, e);
      // la tête penchée vers la patte ; en frottant, elle suit la patte
      p[I.htilt] = -(lick ? 0.22 + Math.sin(t * 5.5) * 0.05 : 0.3 + 0.12 * w) * e; p[I.hnod] = (lick ? 0.12 : 0.05) * e;
      if (lick && e > 0.6) { c.tongue = 0.35 + 0.65 * flick; c.lickTo = k; }
    } else if (cyc < 8.6) {
      // le poitrail : le nez dans le cou, la tête qui va et vient, la langue qui passe
      const e = sm((cyc - 6.2) / 0.35) * (1 - sm((cyc - 8.25) / 0.35)), bob = Math.sin(t * 7) * 0.5 + 0.5;
      p[I.hnod] = (0.35 + 0.1 * bob) * e; p[I.hy] = -D.h * (0.12 + 0.04 * bob) * e; p[I.htilt] = Math.sin(t * 1.7) * 0.12 * e;
      if (e > 0.7) { c.tongue = 0.3 + 0.6 * flick; c.lickTo = 'body'; }
    } else {
      // une secousse de la tête (brrr), puis l'air ravi, la queue contente
      const u = cyc - 8.6, sh = u < 0.55 ? Math.sin(u * 45) * (1 - u / 0.55) : 0;
      p[I.htilt] = sh * 0.35; p[I.sqz] += Math.abs(sh) * 0.03; p[I.eyes] = u < 0.55 ? 1 : 2; p[I.tailWave] = 0.6; p[I.tailPhase] = t * 4;
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
const H = { think: [], live: [], fall: [], bonk: [], pre: [], post: [], draw: [], grab: [], drag: [], release: [], click: [], fire: [], shoot: [] };
const run = (L, a, b, c, d) => { for (const f of L) if (f(a, b, c, d)) return true; return false; };
const TAU2 = Math.PI / 2, sgn = v => v < 0 ? -1 : 1, clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const zOf = d => (1 - d) * 6000, kOf = d => 1 - (Wd.mode === 'large' ? 0.3 : 0.2) * d, floorAt = d => Wd.floor - d * Wd.depth, sOf = d => Wd.s0 * kOf(d);
const grav = () => 2600 * Wd.s0 / 160;
// plus tard, au temps du monde (pas de setTimeout : le monde peut être en pause, accéléré, ou rechargé)
const later = (s, f) => { (Wd.later || (Wd.later = [])).push({ t: Wd.t + s, f }); };
// le plafond de la scène : le bas du texte et des boutons encore visibles (rien ne doit monter plus haut)
// la profondeur du sol (27/09, Mathieu : « tout est sur la même ligne ; si on a une zone 3D, autant en profiter ») : une vraie bande de sol, le fond plus petit
const PROF = () => Wd.mode === 'large' ? 1.35 : 0.95;
// (27/09, Mathieu : « c'est le bordel ; si l'écran le permet, étaler sur plus de niveaux ») : la bande de sol prend la place libre sous le texte
// (quand on reste jouer et que le texte s'en va, elle s'agrandit doucement ; jamais moins qu'avant, jamais plus de 2,8 unités)
const profondeur = () => { const b = Wd.s0 * PROF(); if (Wd.mode !== 'large' || !Wd.floor) return b; return clamp(Wd.floor - (Wd.ceil || 0) - Wd.s0 * 1.55, b, Wd.s0 * 2.8); };
function ceilY() { let y = 0; document.querySelectorAll('[data-plafond]').forEach(e => { const r = e.getBoundingClientRect(); if (r.height) y = Math.max(y, r.bottom); }); return y || Wd.H * 0.4; }
// les deux boutons (où l'on grimpe, où l'on se cogne) et leur place à l'écran : lus une fois par image, pour tous les modules
// (27/09, « optimise tout » : chacun les relisait, plusieurs fois par image)
let btnT = -1, btnP = 0, btnL = [];
function boutons() {
  const now = performance.now(); if (btnT === Wd.t && now - btnP < 100) return btnL; btnT = Wd.t; btnP = now; btnL = [];
  ['#enter', '#stay'].forEach(q => { const el = document.querySelector(q); if (el && !el.disabled && el.getClientRects().length) btnL.push({ el, r: el.getBoundingClientRect() }); });
  return btnL;
}
const rectOf = el => { const o = boutons().find(o => o.el === el); return o ? o.r : el.getBoundingClientRect(); };
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
  reveur:    { dort: 3, mange: 0.8, joue: 0.8, grimpe: 1, carton: 2, pousse: 0.2, casse: 0.2, flane: 1.2, pose: 2.5, dispute: 0.1, fou: 0.2, g: 'pas', coin: 'panier' },
  nuage:     { dort: 3.5, mange: 2, joue: 0.5, grimpe: 0.2, carton: 0.8, pousse: 0.2, casse: 0.2, flane: 1, pose: 2.5, dispute: 0.2, fou: 0.1, g: 'pas', coin: 'coussin' },
  pompon:    { dort: 1, mange: 1.2, joue: 3.5, grimpe: 0.8, carton: 2.5, pousse: 0.5, casse: 0.8, flane: 1, pose: 1, dispute: 0.3, fou: 1.8, g: 'trot', coin: 'carton' },
  gros:      { dort: 3, mange: 4, joue: 0.3, grimpe: 0.1, carton: 0.6, pousse: 0.6, casse: 0.5, flane: 0.8, pose: 2.5, dispute: 0.5, fou: 0.05, g: 'pas', coin: 'gamelle' },
  mini:      { dort: 1, mange: 1, joue: 3, grimpe: 2, carton: 2, pousse: 0.3, casse: 0.6, flane: 1.5, pose: 0.8, dispute: 0.2, fou: 2.5, g: 'trot', coin: 'plateau' },
  hirsute:   { dort: 1.2, mange: 1.2, joue: 1.5, grimpe: 1.5, carton: 1, pousse: 1.5, casse: 1.5, flane: 2, pose: 1, dispute: 1.2, fou: 1.2, g: 'trot', coin: 'caisse' }
};
const SPEED = { pas: 0.32, trot: 0.62, galop: 1.5 };

/* ——— la mise en page : le sol, la taille d'une unité ——— */
function measure(S) {
  if (S.W === Wd.W && S.H === Wd.H && Wd.floor) return false;
  // la fenêtre change de largeur : les chats restent à la même place relative (pas dehors, à marcher des heures pour revenir)
  if (Wd.W && S.W !== Wd.W) { const k = S.W / Wd.W; Wd.cats.forEach(c => { if (c.x > -50 && c.x < Wd.W + 50) c.x *= k; else c.x = c.x < 0 ? -40 : S.W + 40; if (c.task && c.task.k === 'walk' && !c.temp && !c.held) interrupt(c); }); }
  Wd.W = S.W; Wd.H = S.H;
  const ui = document.querySelector('.film-ui'), top = ui ? ui.getBoundingClientRect().top : S.H - 60;
  Wd.floor = Math.min(S.H - 30, top - 8); Wd.ceil = ceilY();
  const s0 = size0(); if (!Wd.sized) { Wd.s0 = s0; Wd.sized = true; } Wd.s0T = s0;
  Wd.depth = profondeur();
  const mode = S.W >= 760 ? 'large' : 'etroit'; MAXC = mode === 'large' ? 20 : 8;
  if (mode !== Wd.mode) { Wd.mode = mode; Wd.depth = profondeur(); layout(); }
  Wd.props.forEach(it => it.trail && (it.trail.length = 0));
  return true;
}

/* ——— le décor ——— */
function prop(kind, fx, d, o) {
  o = o || {}; const it = Univers.make(kind, o);
  Object.assign(it, { fx, d, dT: d, lift: 0, vx: 0, vy: 0, tiltV: 0, fall: false, on: null, onDx: 0, busy: null, fade: 1, fadeT: 1, spinA: 0, trail: it.r ? [] : null, col: o.color });
  it.tilt = 0; it.hull = it.box || HULL[kind] || { w: 0.3, h: 0.2 };
  if (o.yaw !== undefined) it.yaw = o.yaw;
  it.big = { distrib: 1.5, eau: 1.3, bassin: 1.25, lanceur: 1.15, trappe: 1.1 }[kind] || 1;   // le distributeur et la fontaine, un peu plus grands que nature
  Wd.props.push(it); return it;
}
function unprop(it) { Univers.destroy(it); const i = Wd.props.indexOf(it); if (i >= 0) Wd.props.splice(i, 1); Wd.props.forEach(o => { if (o.on === it) o.on = null; if (o.target === it) o.target = null; });
  // (27/09, l'audit : un chat perché sur un objet retiré restait assis sur le vide)
  Wd.cats.forEach(c => { if (c.perch && c.perch.it === it) { c.perch = null; c.task = null; c.q = []; c.fall = true; c.vy = 0; } }); }
// l'encombrement de chaque objet (en unités) : pour tomber, rebondir, se poser sur une caisse, se laisser attraper
const HULL = { table: { w: 1.1, h: 0.56 }, lit: { w: 1.72, h: 0.5 }, biblio: { w: 0.9, h: 1.62 }, etage: { w: 1.5, h: 1.35 }, jungle: { w: 0.5, h: 0.34 }, feuille: { w: 0.28, h: 0.05 }, bassin: { w: 1.28, h: 0.16 }, souffleur: { w: 0.7, h: 0.3 }, canape: { w: 1.66, h: 0.62 }, carton: { w: 0.56, h: 0.32 }, panier: { w: 0.72, h: 0.15 }, coussin: { w: 0.76, h: 0.15 }, gamelle: { w: 0.34, h: 0.08 }, eau: { w: 0.33, h: 0.17 },
  distrib: { w: 0.4, h: 0.74 }, trappe: { w: 0.6, h: 0.5 }, arbre: { w: 1.5, h: 1.95 }, pelote: { w: 0.15, h: 0.15 }, poisson: { w: 0.3, h: 0.08 }, lanceur: { w: 0.6, h: 0.7 }, coffre: { w: 0.52, h: 0.3 } };
// les lourds (ils tanguent, se laissent traîner lentement, tombent lourdement), ce qu'un chat bouscule en passant
const LOURD = { arbre: 1, distrib: 1, lanceur: 1, coffre: 1, bassin: 1, canape: 1, table: 1, lit: 1, biblio: 1, etage: 1 }, LEGER = { pelote: 1, poisson: 1, tasse: 1, plante: 1, feuille: 1 };
const COL = { orange: 0xd0661f, bleu: 0x2f6fb0, vert: 0x3a6e46, rose: 0xc04a6c, gris: 0x6a6c70 };
function layout() {
  Wd.props.slice().forEach(unprop); Wd.P = {}; Wd.extras = []; Wd.kib = []; const P = Wd.P, wide = Wd.mode === 'large';
  const ex = u => u * Wd.s0 / Wd.W;   // une largeur en unités → en fraction de l'écran
  // l'arbre à chat au bord gauche, tourné vers le centre ; le coin repos, les jouets devant, le carton et les caisses, la cuisine à droite
  P.arbre = prop('arbre', ex(wide ? 0.8 : 0.62) + 0.012, 0.75, { yaw: 0.4 });
  if (wide) {
    // (27/09, Mathieu : « structurer un peu plus la scène, de l'espace entre les éléments, plus de profondeur ; il manque lit, étage, bibliothèque, table »)
    // trois rangées : au fond les grands meubles (bibliothèque, distributeur, mezzanine, canapé), au milieu le bassin, la table, le lit, devant les jouets et les lits
    const W = Wd.W, grand = W >= 1300, tresGrand = W >= 1500;
    if (W >= 1100) P.biblio = prop('biblio', 0.2, 1, { yaw: 0.15 });
    P.coussin = prop('coussin', 0.24, 0.18);
    P.bassin = prop('bassin', 0.36, 0.55);
    P.panier = prop('panier', 0.64, 0.08);
    P.pelote = prop('pelote', 0.46, 0.02);
    P.poisson = prop('poisson', 0.41, 0.1);
    P.carton = prop('carton', grand ? 0.72 : 0.64, grand ? 0.32 : 0.8);
    if (grand) { P.etage = prop('etage', 0.63, 1, { yaw: -0.1 }); P.canape = prop('canape', 0.8, 0.98); }
    else if (W >= 1200) { P.caisse = prop('caisse', 0.72, 0.6, { size: 1 }); }
    if (W >= 1000) { P.table = prop('table', 0.52, 0.5, { yaw: -0.12 }); P.tasse = prop('tasse', 0, 0.5); stack(P.tasse, P.table, 0.3); }
    else { P.tasse = prop('tasse', 0.71, 0.55); }
    if (grand) P.lit = prop('lit', 0.84, 0.55, { yaw: -0.3 });
    P.plante = prop('plante', tresGrand ? 0.9 : 0.94, 0.95);
    P.souffleur = prop('souffleur', 0.1, 0.04, { yaw: 0.35 });
    // la jungle, sur les côtés d'un grand écran (Mathieu, 27/09)
    if (tresGrand) { P.jungle = prop('jungle', 0.05, 1, { yaw: 0.2 }); P.jungle.big = 1.3; P.jungle2 = prop('jungle', 0.955, 1, { yaw: -0.3 }); P.jungle2.big = 0.85; }
    P.trappe = prop('trappe', 1, 0.9);
    // le distributeur au fond, au milieu : les chats y passent souvent
    P.distrib = prop('distrib', 0.47, 0.97, { yaw: -0.25 });
    P.gamelle = prop('gamelle', 0.54, 0.22);
    // le coffre à jouets : la canne à plume dedans (js/jouets.js)
    P.coffre = prop('coffre', 0.93, 0.22, { yaw: -0.3 });
  } else {
    P.coussin = prop('coussin', 0.56, 0.3);
    P.pelote = prop('pelote', 0.68, 0.0);
    P.bassin = prop('bassin', 0.36, 0.72); P.bassin.big = 0.9;
    // sur un téléphone, l'arbre et la machine rapetissent un peu (la place manque)
    P.arbre.big = 0.78;
    P.carton = prop('carton', 0.72, 0.88);
    P.trappe = prop('trappe', 1, 0.9); P.trappe.big = 0.85;
    P.tasse = prop('tasse', 0.86, 0.55);
    P.distrib = prop('distrib', 0.5, 0.97, { yaw: -0.25 });
    P.coffre = prop('coffre', 0.33, 0.5, { yaw: 0.25 });
    P.souffleur = prop('souffleur', 0.2, 0.15, { yaw: -0.35 });
  }
  if (P.trappe) P.trappe.lift = Wd.s0 * 1.2;
  Wd.props.forEach(it => { it.home = { fx: it.fx, d: it.d, on: it.on, onDx: it.onDx }; });
}
function stack(it, on, dx) { it.dans = null; it.on = on; it.onDx = dx; it.d = it.dT = on.d; }
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
function drop(it, vx, vy, tv) { if (it.on) { it.quitte = it.on; it.quitteT = Wd.t; } it.on = null; it.dans = null; it.fall = true; it.vx = vx; it.vy = vy; it.tiltV = LOURD[it.kind] ? clamp(tv || 0, -5, 5) : tv; it.down = Wd.t; }
function updProp(it, dt) {
  if (it._f === Wd.f) return; it._f = Wd.f;
  const s = sOf(it.d);
  if (it.held) {
    // dans la main : il suit le doigt, et penche un peu du côté d'où il vient
    const px = it.fx; it.fx = (it.hx - it.gdx) / Wd.W; it.lift = floorAt(it.d) - it.hy + it.gdy;
    it.vx = (it.fx - px) * Wd.W / Math.max(dt, 1 / 120); if (!it.r) { const h = LOURD[it.kind]; it.tilt += (clamp(-it.vx * (h ? 0.0005 : 0.0012), -0.6, 0.6) * (h ? 0.5 : 1) - it.tilt) * Math.min(1, dt * (h ? 3 : 8)); }
  } else if (it.on) {
    const b = it.on; updProp(b, dt); it.d = it.dT = b.d;
    // (dans un contenant, js/contenants.js : au fond, it.dans ; il ne sort que si on le renverse)
    const p = Univers.at(b, [it.onDx, it.dans != null ? it.dans : b.box ? b.box.h : 0, 0]); it.fx = p[0] / Wd.W; it.lift = floorAt(it.d) - p[1];
    if (b.fall || Math.abs(b.tilt || 0) > (it.dans != null ? 1.1 : 0.25)) drop(it, b.vx * 0.8, Math.max(0, b.vy), (b.tiltV || 0) * 0.6 + rnd(-2, 2));
  } else if (it.fall) {
    it.vy -= grav() * dt; it.lift += it.vy * dt; it.fx += it.vx * dt / Wd.W; if (!it.r) it.tilt += it.tiltV * dt;
    it.d += (it.dT - it.d) * Math.min(1, dt * 3);
    if (it.target && it.vy < 0) { const b = it.target, top = b.lift + topOf(b); if (it.lift <= top) { it.lift = top; stack(it, b, (it.fx - b.fx) * Wd.W / s); it.fall = false; it.target = null; it.vy = 0; it.tilt = 0; it.tiltV = 0; dust(it.fx * Wd.W, floorAt(it.d) - top, s * 0.3, 0.5); } }
    // se poser sur une caisse en tombant (une caisse plus large que soi, sous soi)
    if (it.fall && !it.target && it.vy < 0 && !it.tower) for (const b of Wd.props) {
      if (!b.box || b === it || b.fall || b.held || b.fade < 0.5 || Math.abs(b.d - it.d) > 0.2 || it.hull.w > b.box.w * 1.3 || (it.quitte === b && Wd.t - it.quitteT < 1.2)) continue;
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
        // (se redresser par le plus court : après trois tours en l'air, il ne refait pas trois tours à l'envers au sol — « il tourne sans jamais s'arrêter »)
        if (!it.r) { const q = it.box ? Math.round(it.tilt / TAU2) * TAU2 : Math.round(it.tilt / TAU) * TAU; it.tiltV = (q - it.tilt) * 9; if (Math.abs(q - it.tilt) < 0.01 && Math.abs(it.vx) < 4) { it.tilt = q; it.tiltV = 0; it.fall = false; it.lift = -low(it); it.vx = 0; } }
        else if (Math.abs(it.vx) < 4) { it.fall = false; it.vx = 0; it.tilt = 0; }
      }
    }
  } else if (it.vx) {
    // glisser, rouler : le frottement
    it.fx += it.vx * dt / Wd.W; it.vx *= Math.exp(-dt * (it.r ? 1.1 : 6)); if (Math.abs(it.vx) < 3) it.vx = 0;
  }
  // les bords de l'écran : la pelote rebondit, le reste s'arrête
  const m = (it.r || it.hull.w / 2) * s * (it.big || 1) / Wd.W;
  if ((it.folle || it.pattes) && !it.held && !it.fall && !it.on) { const cou = it.folle && !it.folle.boum && Math.abs(it.cour || 0) > 8, las = it.rentre ? 0.35 : 1;
    it.lift = (it.pattes || 0) * s * 0.14 + (cou ? Math.abs(Math.sin(Wd.t * 11)) * s * 0.12 : it.folle ? Math.abs(Math.sin(Wd.t * 17)) * s * 0.03 : Math.abs(Math.sin(Wd.t * 5)) * s * 0.03 * las); }
  // les lourds tanguent (un chat qui saute dessus, un coup de doigt, une salve de croquettes)
  // (et les légers aussi, un moment, quand quelque chose les a touchés : même empilés, on voit qu'ils ont reçu le coup)
  if (!it.held && !it.fall && !it.r && !it.tower && Math.abs(it.tilt) < 0.2 && ((LOURD[it.kind] || it.mur) && !it.on || Wd.t - (it.wob ?? -9) < 2)) { const u = Wd.t - (it.wob ?? -9); it.tilt = Math.sin(u * 13) * 0.045 * (it.wobA || 1) * (LOURD[it.kind] || it.mur ? 1 : 2.2) * Math.exp(-u * 3) + (it.folle ? Math.sin(Wd.t * 31) * 0.05 : 0); }
  if (it.parts.levier) it.parts.levier.rotation.z = (it.lev0 ?? 0.3) + (it.pull || 0) * (it.levK ?? 1.3);
  // accrochée au mur : au bord droit, à sa hauteur (sous le texte), rien ne la fait bouger
  if (it.mur && !it.fixe) { it.fx = 1 + it.hull.w * 0.1 * s * (it.big || 1) / Wd.W; const L = clamp(floorAt(it.d) - (Wd.ceil || 0) - 0.6 * s * (it.big || 1) - 12, Wd.s0 * 0.45, Wd.s0 * 1.7); it.lift += (L - it.lift) * Math.min(1, dt * 4); it.vx = it.vy = 0; it.fall = false; }
  if (it.swept && (it.fx < -0.2 || it.fx > 1.2)) { it.fadeT = it.fade = 0; it.gone = true; } else if (it.swept && !it.fall && !it.vx) it.swept = 0;
  // (lancé fort contre le bord : il rebondit un peu, « toc », et tangue)
  const bord = (sd, v) => { if (Math.abs(v) < s * 1.2 || Wd.t - (it.bordT ?? -9) < 0.4) return; it.bordT = it.wob = Wd.t; it.wobA = 0.6; if (!it.r) it.tiltV = (it.tiltV || 0) - sd * 4; Wd.fx.push({ k: 'txt', text: pick(['toc', 'bonk', 'clac']), x: sd < 0 ? 16 : Wd.W - 16, y: it.y - it.hull.h * it.s * 0.6, t0: Wd.t, life: 1, rot: rnd(-0.2, 0.2), size: 16 }); };
  if (!it.run && !it.mur && !it.swept && it.fx < m) { bord(-1, it.vx); it.fx = m; it.vx = Math.abs(it.vx) * (it.r ? 0.6 : 0.3); }
  if (!it.run && !it.mur && !it.swept && it.fx > 1 - m) { bord(1, it.vx); it.fx = 1 - m; it.vx = -Math.abs(it.vx) * (it.r ? 0.6 : 0.3); }
  // la pelote : elle tourne en roulant et laisse son fil derrière elle
  if (it.r) {
    const x = it.fx * Wd.W; if (it.px !== undefined) it.spinA -= (x - it.px) / (it.r * s); it.px = x;
    it.spin.setFromAxisAngle(ZA, it.spinA);
    const T = it.trail, y = floorAt(it.d) - it.lift, L = T[T.length - 1];
    if (!L || Math.hypot(L[0] - x, L[1] - y) > 7) { T.push([x, y, 0, floorAt(it.d)]); if (T.length > 60) T.shift(); }
    // le fil a du poids : ce qui est resté en l'air (pelote lancée, portée) retombe et se couche au sol
    const g = grav();
    T.forEach(P => { if (P[1] >= P[3]) return; P[2] += g * dt; P[1] = Math.min(P[3], P[1] + P[2] * dt); if (P[1] >= P[3]) P[2] = 0; });
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
  const id = o.id || (() => { const here = new Set(Wd.cats.map(c => c.breed)), free = Chat.IDS.filter(i => !here.has(i) && !(Wd.t - ((Wd.partis || {})[i] ?? -99) < 60)); return pick(free.length ? free : Chat.IDS); })();
  const c = Chat.create(id);
  Object.assign(c, { d: o.d ?? freeD(), q: [], task: null, anim: 'assis', at: Math.random() * 10, perch: null, born: Wd.t, stay: rnd(45, 100), vx: 0, vy: 0,
    temp: !!o.temp, zo: (c.id % 6) * 70, ch: CARAC[id] || CARAC.tigre, claims: [], held: false, fall: false, jump: null, hidden: 0, mood: 0 });
  c.x = o.x ?? Wd.W / 2; c.face = o.face || (Math.random() < 0.5 ? -1 : 1); c.s = sOf(c.d); c.y = floorAt(c.d);
  Wd.cats.push(c); return c;
}
// (Mathieu, 27/09 : « les chats ne peuvent pas juste disparaître, même si on les a fait pop : ils partent avec un événement, ou ils sortent
//  de l'écran naturellement ») : un chat qu'on retirerait alors qu'il est encore visible s'en va d'abord à pied (c.adieu, plus bas)
const visible = c => !c.hidden && c.hp && c.x > -sc(c) * 0.6 && c.x < Wd.W + sc(c) * 0.6 && Wd.a > 0.1;
function unCat(c) {
  if (!c.rare && !c.fin && visible(c)) { c.gone = false; c.adieu = true; return; }
  free(c); Chat.destroy(c); const i = Wd.cats.indexOf(c); if (i >= 0) Wd.cats.splice(i, 1);
}
H.live.push(c => {
  if (!c.adieu || c.fall || c.held || c.jump || c.fight || (c.task && c.task.sortie) || c.q.some(q => q.sortie)) return;
  if (c.perch) { c.perch = null; c.fall = true; c.vy = 0; return; }
  interrupt(c); const side = c.x < Wd.W / 2 ? -1 : 1; c.q = [go(side < 0 ? -sc(c) * 1.4 : Wd.W + sc(c) * 1.4, { g: c.temp ? 'galop' : 'trot', sortie: true }), fn(c => { c.fin = true; c.gone = true; })];
});
const sc = c => c.s * c.b.s;
const front = c => (c.D.head[0] + c.b.head[0] * 0.7) * sc(c) * 0.94;
const back = c => c.D.R(Math.PI) * sc(c) * 0.94;
const residents = () => Wd.cats.filter(c => !c.temp);
// libérer tout ce que le chat occupait (un coussin, le carton…), vider ses projets
function free(c) { c.claims.forEach(p => { if (p.busy === c) p.busy = null; }); c.claims = []; }
// (28/09, le test des téléportations : interrompu là-haut — sur un bouton, une lettre, un perchoir, en plein saut — il était recollé au sol d'un coup ;
// maintenant il tombe, et ce qu'on lui demande attend qu'il ait atterri)
function interrupt(c) {
  const haut = !c.held && !c.hidden && !c.gone && !c.fall && c.y < floorAt(c.d) - 4 && (c.perch || c.jump || (c.task && (c.task.air || c.task.k === 'climb')));
  free(c); c.q = []; c.task = null; c.jump = null; c.zj = null; c.perch = null; c.fight = null; c.busyAct = false;
  if (haut) { c.fall = true; c.vy = 0; c.vx = c.vx || 0; }
}
function claim(c, p) { p.busy = c; c.claims.push(p); }

/* les gestes : une file de pas (c.q) ; chacun dure jusqu'à ce qu'il soit fait */
const go = (x, o) => Object.assign({ k: 'walk', x }, o);
// les gros meubles qu'on ne traverse pas (on passe devant) ; sauf celui où il va (dessous, contre lui)
const OBST = { canape: 1, biblio: 1, distrib: 1, coffre: 1, bassin: 1, lit: 1, arbre: 1, etage: 0 };
function obstacle(c, nx, tx, td) {
  for (const p of Wd.props) {
    if (!OBST[p.kind] || p.run || p.held || p.fall || p.a < 0.5 || Math.abs(p.d - c.d) > 0.11) continue;
    const hw = p.hull.w * p.s * 0.5 * (p.big || 1) * 0.92;
    if (Math.abs(nx - p.x) > hw) continue;               // pas sur son chemin
    if (Math.abs(c.x - p.x) < hw * 0.97 && Math.abs(tx - p.x) < hw && Math.abs(td - p.d) < 0.11) continue;   // il y va (dessous, dedans)
    if (Math.abs(tx - p.x) < hw && Math.abs(td - p.d) < 0.11) continue;
    return p;
  }
  return null;
}
// il est devant (ou derrière) un gros meuble et veut passer de l'autre côté : lequel le bloque ?
function traverse(c, td, tx) {
  const lo = Math.min(c.d, td), hi = Math.max(c.d, td);
  for (const p of Wd.props) {
    if (!OBST[p.kind] || p.run || p.held || p.fall || p.a < 0.5 || p.d < lo - 0.02 || p.d > hi + 0.02) continue;
    const hw = p.hull.w * p.s * 0.5 * (p.big || 1) * 0.92; if (Math.abs(c.x - p.x) > hw) continue;
    if (Math.abs(td - p.d) < 0.11 && Math.abs(tx - p.x) < hw * 1.3) continue;   // c'est là qu'il va (contre lui, dessous)
    return p;
  }
  return null;
}
const pose = (anim, dur, o) => Object.assign({ k: 'pose', anim, dur }, o);
const hop = (to, o) => Object.assign({ k: 'jump', to }, o);
const fn = f => ({ k: 'fn', f });
const STEPS = {
  walk(c, T, dt) {
    const tx = typeof T.x === 'function' ? T.x() : T.x, g = T.g || c.ch.g, v = SPEED[g] * sc(c) * (T.v || 1), dx = tx - c.x;
    if (!Number.isFinite(tx) || (T.d !== undefined && !Number.isFinite(T.d))) return true;   // une cible perdue (son objet a disparu) : on s'arrête
    // encore perché (sur le canapé, l'arbre) : il saute d'abord en bas, puis il marche (il était recollé au sol d'un coup)
    if (c.perch && c.y < floorAt(c.d) - 4) { const it = c.perch.it, x = inView(c.x + (sgn(dx) || c.face) * sc(c) * 0.6); c.q.unshift(hop(() => groundAt(x, Math.max(0, it.d - 0.15)), { h: sc(c) * 0.25 }), T); T.t = 0; return true; }
    c.anim = g; c.perch = null;
    // (29/09, Mathieu : « ils font du sur-place, ils buguent en boucle avec les objets ») : coincé entre deux meubles (il change de rangée
    // pour contourner l'un, et l'autre le renvoie), il n'avance plus vers sa cible. Au bout d'un moment sans progrès : il saute par-dessus,
    // un bond vers sa cible (pas plus de deux corps et demi), puis il reprend sa marche de là
    { const td = T.d ?? c.d, pr = Math.abs(tx - c.x) + Math.abs(td - c.d) * sc(c) * 4;
      if (T.best === undefined || pr < T.best - sc(c) * 0.08) { T.best = pr; T.bt = Wd.t; }
      else if (Wd.t - T.bt > 1.6) { const s = sc(c), hx = (tx > 0 && tx < Wd.W ? inView : x => x)(c.x + clamp(tx - c.x, -s * 2.5, s * 2.5)), hd = Math.abs(tx - hx) < 1 ? td : c.d + clamp(td - c.d, -0.5, 0.5);
        T.best = undefined; T.at = 0; c.q.unshift(pose('affut', 0.35, { face: sgn(hx - c.x) || c.face }), hop(() => groundAt(hx, hd), { h: s * 0.7 }), T); return true; } }
    // (27/09, Mathieu : « revoir le déplacement entre les niveaux ; ils passent derrière le canapé, dans les meubles ») :
    // un gros meuble sur son chemin, à sa profondeur : il change d'abord de rangée (devant, sinon derrière), puis il avance
    const dv = dt * 0.9 * (g === 'galop' ? 1.6 : 1), td = T.d ?? c.d, ob = obstacle(c, c.x + sgn(dx) * Math.min(Math.abs(dx), v * dt + sc(c) * 0.25), tx, td);
    if (ob) { const devant = ob.d - 0.14 >= 0, cible = devant ? ob.d - 0.14 : ob.d + 0.14; c.d += clamp(cible - c.d, -dv, dv); if (Math.abs(dx) > 0.5) c.face = sgn(dx); T.det = 1; return false; }
    // changer de rangée à travers un gros meuble : on longe d'abord (on sort de devant lui), puis on change de rangée
    if (T.d !== undefined && Math.abs(T.d - c.d) > 0.02) { const tr = traverse(c, T.d, tx);
      if (tr) { const hw = tr.hull.w * tr.s * 0.5 * (tr.big || 1) + sc(c) * 0.35, ex = tr.x + (sgn(tx - tr.x) || sgn(c.x - tr.x)) * hw, f = sgn(ex - c.x); c.face = f; c.x += f * Math.min(Math.abs(ex - c.x), v * dt); return false; }
      c.d += clamp(T.d - c.d, -dv, dv); }
    // arrivé : la profondeur finit de s'ajuster (sauf si un voisin le pousse depuis longtemps : il ne piétine pas sur place)
    if (Math.abs(dx) <= v * dt + 0.5) { c.x = tx; T.at = (T.at || 0) + dt; if (T.d === undefined || Math.abs(T.d - c.d) < 0.01 || T.at > 2.5) { if (T.face) c.face = T.face; return true; } c.anim = 'pas'; return false; }
    c.face = sgn(dx); c.x += c.face * v * dt; return false;
  },
  pose(c, T) { c.anim = T.anim; if (T.face) c.face = T.face; if (T.fx && !T.fxd) { T.fxd = 1; T.fx(c); } return T.t >= T.dur; },   // l'effet : une seule fois, au début (même quand l'image est lente)
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
const PORTE = { panier: 1, coussin: 1, coffre: 1, caisse: 1, arbre: 1 };
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
  const beds = all('coussin').concat(all('panier')).filter(b => !(b.mouille > Wd.t));   // (mouillé, personne n'y dort : js/monde.js)
  if (beds.length) add(ch.dort * (beds.some(b => ch.coin === b.kind) ? 2 : 1), () => sleep(c, beds.find(b => ch.coin === b.kind) || pick(beds)));
  const food = all('gamelle').filter(g => !(g.stock <= 0.03)).concat(all('distrib'));   // (vide, la gamelle n'attire plus : js/faim.js)
  if (food.length) add(ch.mange * fav('gamelle'), () => eat(c, pick(food)));
  const water = all('eau').concat(all('bassin')); if (water.length) add(ch.mange * 0.7 + 0.4, () => eat(c, pick(water), true));
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
  // le grand bassin : on boit perché sur le rebord, penché vers l'eau (27/09, Mathieu : debout au sol, il semblait flotter au-dessus du bassin)
  if (g.kind === 'bassin' && g.perches) { const L = g.perches.filter(p => !p.bain && !p.busy && p.id.startsWith('bord')); if (L.length) {
    const pe = L.sort((a, b) => Math.abs(Univers.at(g, a.p)[0] - c.x) - Math.abs(Univers.at(g, b.p)[0] - c.x))[0], side = pe.p[0] < 0 ? -1 : 1; claim(c, pe);
    c.q.push(fn(c => c.q.unshift(go(inView(Univers.at(g, pe.p)[0] + side * sc(c) * 0.5), { d: Math.max(0, g.d - 0.05), face: -side }))), hop(() => perchAt(g, pe, 0), { h: sc(c) * 0.2, zr: [0, 0.4] }),
      pose('mange', rnd(3.5, 6), { face: -side, fx: c => say(c, 'lap lap') }), pose('assis', rnd(1, 2), { face: -side }),
      hop(() => groundAt(inView(Univers.at(g, pe.p)[0] + side * sc(c) * rnd(0.6, 1)), Math.max(0, g.d - rnd(0.1, 0.25)))), fn(free));
    return; } }
  claim(c, g); const w = g.kind === 'distrib' ? 0.3 : g.kind === 'eau' ? 0.16 : g.kind === 'bassin' ? 0.95 : -0.1;
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
  if (!it || it.fall) return; const s = sOf(it.d); it.on = null;   // empilé (la tasse sur sa caisse) : il quitte la pile
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
    pose('assis', 1.2), pose('tape', 0.4), pose('assis', 0.8, { face: dir }), pose('tape', 0.6, { fx: c => later(0.25, () => { if (item.on === b) { drop(item, dir * sOf(b.d) * 1.1, sOf(b.d) * 0.7, -dir * rnd(5, 8)); if (window.Dex && item.kind === 'tasse') Dex.vu('tasse'); } }) }),
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
  const side = c.x < Wd.W / 2 ? -1 : 1; (Wd.partis || (Wd.partis = {}))[c.breed] = Wd.t; Wd.nextIn = Math.max(Wd.nextIn, Wd.t + rnd(10, 22));   // (Mathieu : « ils partent mais reviennent direct » : on attend un peu, et c'est un autre qui vient)
  c.q.push(go(side < 0 ? -sc(c) * 1.3 : Wd.W + sc(c) * 1.3, { g: c.temp ? 'galop' : c.ch.g }), fn(c => { c.gone = true; }));
}
function enter() {
  const side = Math.random() < 0.5 ? -1 : 1, c = addCat({ face: -side });
  c.x = side < 0 ? -sc(c) * 1.2 : Wd.W + sc(c) * 1.2;
  c.q.push(go(rnd(0.15, 0.85) * Wd.W, {}), pose(Math.random() < 0.5 ? 'miaule' : 'assis', 2, { fx: c => c.anim === 'miaule' && say(c, 'miaou') }));
  return c;
}

// la pose « porté », sans transition (la pose d'avant ne se fond pas dedans)
function porteTout(c) { c.anim = c.animP = 'porte'; c.at = 0; ANIMS.porte(c, c.tgt, 0); for (let i = 0; i < c.tgt.length; i++) c.cur[i] = c.tgt[i]; }
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
    // (porté avec son coussin, son panier, sa caisse, son arbre : il reste dessus, et s'y accroche, js/accroche.js)
    if ((it.fall || it.held) && !(it.kind === 'carton' && Math.abs(it.tilt || 0) < 1.2) && !(it.held && PORTE[it.kind] && Math.abs(it.tilt || 0) < 1.2) || it.suck || !Wd.props.includes(it)) { const vx = it.vx || 0; interrupt(c); c.hidden = 0; c.fall = true; c.vx = vx; c.vy = -sOf(it.d) * 0.6; }
    else { const p = Univers.at(it, [pe.p[0] + dx, pe.p[1], pe.p[2]]); c.x = p[0]; c.y = p[1]; c.zp = p[2]; c.d = it.d; } }
  else c.zp = null;
  // au sol : collé au plancher. (28/09, le test des téléportations : entre deux gestes en hauteur — descendre du bouton, de la lettre —
  // il était recollé au sol une image, puis sautait de là ; et un chat laissé en l'air sans rien à faire y était ramené d'un coup : il tombe)
  if (!c.gone && !c.perch && !c.jump && !c.fall && !c.held && !(c.task && (c.task.k === 'climb' || c.task.air))) {
    const nx = !c.task && c.q[0];
    if (!(nx && (nx.air || nx.k === 'jump' || nx.k === 'fn'))) { if (!c.hidden && c.y < floorAt(c.d) - sc(c) * 0.3) { c.fall = true; c.vy = 0; c.vx = c.vx || 0; } else c.y = floorAt(c.d); }
  }
  // les petits effets : les z du sommeil
  if (c.task && c.task.zzz && (c.zt = (c.zt || 0) + dt) > 1.3) { c.zt = 0; const h = Chat.where(c, c.head); Wd.fx.push({ k: 'z', x: h[0] + c.face * sc(c) * 0.1, y: h[1] - sc(c) * 0.15, t0: Wd.t, life: 2.4, dx: c.face }); }
  // la pose
  if (c.anim !== c.animP) { c.animP = c.anim; c.at = 0; }   // chaque pose a son propre temps (l'écrasé, le sursaut, le bâillement partent du début)
  const A = ANIMS[c.anim] || ANIMS.assis; A(c, c.tgt, c.at);
  if (c.pushing) { c.tgt[I.pitch] -= 0.12; c.tgt[I.look] = 0.3; c.tgt[I.eyes] = 1; }
  if (c.purr && Wd.t < c.purr && !c.pet) { ANIMS.ronron(c, c.tgt, c.at); }
  // la taille : porté, en chute, en saut ou perché, il garde celle qu'il avait au sol (un gros chat dans un carton déborde, il ne rapetisse pas) ; de retour au sol, elle revient en douceur
  if (c.perch || c.jump || c.held || c.fall) { if (c.sK == null) c.sK = c.s || sOf(c.d); c.s = c.sK; }
  else { c.sK = null; const s0 = sOf(c.d); c.s = c.s ? c.s + (s0 - c.s) * Math.min(1, dt * 3) : s0; }
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
  const G = Wd.cats.filter(c => !c.perch && !c.jump && !c.fall && !c.held && !c.fight && !c.hidden && !c.gone && !(c.task && (c.task.k === 'climb' || c.task.k === 'jump' || c.task.air)) && c.y > floorAt(c.d) - sc(c) * 0.3);   // (au sol seulement : entre deux gestes, là-haut, il était recollé au sol)
  const walks = c => c.task && c.task.k === 'walk';
  const O = Wd.props.filter(SOLIDE);
  G.forEach(c => {
    const walking = walks(c), tx = walking ? (typeof c.task.x === 'function' ? c.task.x() : c.task.x) : c.x;
    for (const it of O) {
      if (c.balai && (it.launched || it.balaiOK)) continue;   // la horde fonce dans les cartons (elle les balaie, voir bump)
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
          if (top < sc(c) * 0.6 && Wd.t - (c.hopT ?? -9) > 4) { c.hopT = Wd.t;   /* (27/09, Mathieu : « ils ne font rien à part sauter » : un saut de temps en temps, sinon il contourne) */ const w = c.task, lx = inView(it.x + ahead * (hw + sc(c) * 0.15)), ld = c.d;
            c.q.unshift(pose('affut', 0.25), hop(() => groundAt(lx, ld), { h: top + sc(c) * 0.3, zr: [0, 0.3] }), w); c.task = null; break; }
          c.d += clamp(lane - c.d, -dt * 1.5, dt * 1.5);
        }
      } else if (Math.abs(dx) < hw && !c.claims.length && !c.pet && !(c.task && c.task.k === 'push')) c.x = inView(c.x + (dx ? sgn(dx) : 1) * Math.min(hw - Math.abs(dx), sc(c) * 1.6 * dt));
    }
  });
  for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
    const a = G[i], b = G[j], dd = b.d - a.d; if (Math.abs(dd) >= 0.3) continue;
    if (a.rare || b.rare) continue;   // les visiteurs suivent leur numéro : ils passent devant ou derrière, sans pousser personne
    const dx = b.x - a.x, need = (sc(a) + sc(b)) * 0.52; if (Math.abs(dx) >= need) continue;
    if (walks(a) || walks(b)) {
      if (Math.abs(dd) >= 0.15) continue;   // en marchant, on se croise : l'un passe devant, l'autre derrière
      // celui qui marche change de couloir : devant s'il y a la place, sinon derrière
      const m = walks(a) && (!walks(b) || a.id > b.id) ? a : b, o = m === a ? b : a;
      let lane = o.d + (m.d >= o.d ? 0.2 : -0.2); if (lane < 0) lane = o.d + 0.2; if (lane > 0.98) lane = o.d - 0.2; lane = clamp(lane, 0, 0.98);
      m.d += clamp(lane - m.d, -dt * 0.9, dt * 0.9); if (m.task.d !== undefined && Math.abs(m.task.d - o.d) < 0.15) m.task.d = lane;
    } else {
      // deux chats à l'arrêt : ils se poussent doucement (un peu de côté, un peu en profondeur)
      // (celui qu'on caresse ne bouge pas : sinon il glisserait sur les fesses sous la main ; l'autre s'écarte seul)
      const s = dx ? sgn(dx) : (a.id < b.id ? 1 : -1), push = Math.min(need - Math.abs(dx), sc(a) * 1.4 * dt);
      if (a.pet && b.pet) continue; const ka = a.pet ? 0 : b.pet ? 1 : 0.5;
      a.x = inView(a.x - s * push * ka); b.x = inView(b.x + s * push * (1 - ka));
      const e = (dd ? sgn(dd) : 1) * dt * 0.05; a.d = clamp(a.d - e, 0, 0.98); b.d = clamp(b.d + e, 0, 0.98);
    }
  }
  G.forEach(c => { if (c.task ? c.task.k !== 'jump' : true) c.y = floorAt(c.d); });   // le sol suit la profondeur, dans la même image
}

// en passant, un chat bouscule les petites choses : la pelote roule, la tasse saute
function bump() {
  // un objet qui tombe sur une tête : bonk (et l'objet rebondit)
  Wd.props.forEach(it => {
    // (28/09, le test de stress : un meuble posé au sol, qui finissait de se redresser, « tombait » encore à vitesse presque nulle ; un chat dessous :
    // bonk, il remontait, retombait, bonk… sans fin. Maintenant : seulement une vraie chute, et pas plus de deux bonks de suite)
    const s = sOf(it.d) * (it.big || 1);
    if (!it.fall || it.held || it.vy > -s * 1.2 || Wd.t - (it.bonkT ?? -9) < 0.4 || (it.bonkN >= 2 && Wd.t - it.bonkT < 3)) return;
    for (const c of Wd.cats) { if (!c.hp || c.hidden || c.held || Math.abs(c.d - it.d) > 0.3) continue; const r = c.b.head[0] * sc(c);
      if (Math.abs(it.x - c.hp[0]) < it.hull.w / 2 * s + r * 0.6 && Math.abs(it.y - (c.hp[1] - r)) < r * 0.8) {
        if (run(H.bonk, it, c)) break;
        it.bonkN = Wd.t - (it.bonkT ?? -9) < 3 ? (it.bonkN || 0) + 1 : 1; it.bonkT = Wd.t; it.vy = Math.abs(it.vy) * (LOURD[it.kind] ? 0.1 : 0.35) + s * (LOURD[it.kind] ? 0.2 : 0.8); it.vx = (it.vx || 0) * 0.5 + sgn(it.x - c.x) * s * 1.2; it.tiltV = (it.tiltV || 0) + rnd(-4, 4);
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
    Wd.props.forEach(it => { if (!(it.launched || it.swept || it.balaiOK) || it.held || it.suck || Math.abs(it.d - c.d) > 0.35) return; const dx = (it.x - c.x) * dir;
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
  // (28/09, Mathieu : « ils sautent à l'infini » : chaque chose qui tombe près de lui le faisait bondir, encore et encore ;
  // maintenant, un bond, puis quelques secondes où il se contente de sursauter sur place)
  const away = sgn(c.x - x) || 1, recent = Wd.t - (c.startleT ?? -99) < 4;
  if (recent) { if (c.task && (c.task.anim === 'sursaut' || c.task.anim === 'feule')) return; interrupt(c); c.q = [pose('sursaut', 0.6, { face: -away }), pose('assis', rnd(0.6, 1.2))]; return; }
  interrupt(c); c.startleT = Wd.t;
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
// (27/09, Mathieu : « trop de texte ») : un chat n'a qu'une bulle à la fois (la nouvelle remplace l'ancienne), et jamais plus de sept bulles à l'écran
function say(c, text, rot) { const h = Chat.where(c, c.head), vieille = Wd.fx.find(f => f.who === c && Wd.t - f.t0 < f.life);
  if (vieille) { if (Wd.t - vieille.t0 < 0.5) return; vieille.life = 0; } else if (Wd.fx.reduce((n, f) => n + (f.who && Wd.t - f.t0 < f.life ? 1 : 0), 0) >= 7) return;
  Wd.fx.push({ who: c, k: 'txt', text, x: h[0] + c.face * sc(c) * 0.2, y: h[1] - c.b.head[1] * sc(c) * 1.6, t0: Wd.t, life: 1.6, rot: rot ?? c.face * 0.12, size: clamp(sc(c) * 0.12, 13, 20) }); }
function dust(x, y, r, a) { Wd.fx.push({ k: 'dust', x, y, r, a, t0: Wd.t, life: 0.5, seed: Math.floor(Math.random() * 99) }); }
function drawFx(S) {
  const C = Chalk, t = Wd.t, K = S.K || 1;
  { const F = Wd.fx; let n = 0; for (let i = 0; i < F.length; i++) if (t - F[i].t0 < F[i].life) F[n++] = F[i]; F.length = n; }   // (sur place : pas une nouvelle liste à chaque image)
  Wd.fx.forEach(f => {
    const u = (t - f.t0) / f.life, fade = (1 - sm((u - 0.6) / 0.4)) * Wd.a;
    if (f.k === 'txt') {
      if (f.text === '♥') heart(f.x, f.y - u * 20, 7 * K, fade);
      else C.text(f.text, f.x, f.y - u * 14, c01(u * 4), { size: f.size, align: 'center', rot: f.rot, a: 0.75 * fade });
    } else if (f.k === 'z') C.text(u < 0.5 ? 'z' : 'Z', f.x + f.dx * u * 18 + Math.sin(u * 7) * 5, f.y - u * 40, 1, { size: 12 + u * 10, a: 0.6 * fade });
    else if (f.k === 'dust') { for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 2; j++) { const a0 = f.r * (0.5 + u * 0.8), h = (j + 1) * 5; C.line(f.x + i * a0, f.y - h * 0.4, f.x + i * (a0 + 8 + u * 8), f.y - h, 1, { w: 1.6, a: 0.5 * f.a * (1 - u), seed: f.seed + i + j }); } }
    else if (f.k === 'calage') calage(f, t, K);
    else if (f.k === 'rayons') rayons(f, u, t);
    else if (f.k === 'rouleaux') rouleaux(f, t - f.t0, fade, K);
    else if (f.k === 'vague') vaguePoussiere(f, u, K);
    else if (f.k === 'cri') ondeCri(f, t);
    else if (f.k === 'patte') empreinte(f, u);
    else if (f.k === 'bagarre') fightCloud(f, u, fade, K);
    else if (f.k === 'heart') heart(f.x, f.y - u * 26, f.r * K, fade);
  });
  drawFil(C);
}
// le fil des pelotes : sur sa propre toile, sous les objets et les chats (28/09, Mathieu : « les traits des jouets type pelote de laine passent par-dessus tout »)
let filCv = null;
function drawFil(C) {
  if (!filCv) { filCv = document.createElement('canvas'); filCv.id = 'fil'; filCv.setAttribute('aria-hidden', 'true'); const o = document.getElementById('obj'); if (o) o.before(filCv); else document.body.prepend(filCv); }
  const main = C.ctx, fc = filCv.getContext('2d'); if (!main) return;
  if (filCv.width !== main.canvas.width || filCv.height !== main.canvas.height) { filCv.width = main.canvas.width; filCv.height = main.canvas.height; }
  fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, filCv.width, filCv.height); fc.setTransform(main.getTransform());
  const L = Wd.props.filter(it => it.trail && it.trail.length >= 2 && it.a > 0.01); if (!L.length) return;
  C.ctx = fc; try { L.forEach(it => C.stroke(it.trail.concat([[it.x, it.y]]), 1, { w: 1.3, a: 0.6 * it.a, amp: 0.4, seed: 7, tip: false })); } finally { C.ctx = main; }
}
// (vague 26, l'audit : « la tour de cartons ») : les chips de calage. Chaque caisse qui s'ouvre en tombant en crache une poignée :
// des petits S qui volent, rebondissent sur le sol, glissent et restent là, en bazar, jusqu'à ce que l'équipe du ménage les balaie au passage
function calage(f, t, K) {
  const g = 1400 * (f.k0 || 1), dt = t - f.t0;
  if (!f.th) { const a = g / 2, b = f.vy, c = f.y - f.sol; f.th = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a); }
  let x, y, rot;
  if (dt < f.th) { x = f.x + f.vx * dt; y = f.y + f.vy * dt + g / 2 * dt * dt; rot = f.r0 + f.w * dt; }
  else { const d2 = dt - f.th, vb = (f.vy + g * f.th) * 0.28, gl = (1 - Math.exp(-d2 * 3)) / 3; x = f.x + f.vx * f.th + f.vx * 0.5 * gl; y = f.sol - Math.max(0, vb * d2 - g / 2 * d2 * d2); rot = f.r0 + f.w * f.th + f.w * 0.3 * gl; }
  // balayé : un chat du ménage passe dessus, le chips repart en l'air devant lui
  if (!f.kick && dt > f.th) { const c = Wd.cats.find(c => c.balai && !c.gone && Math.abs(c.x - x) < sc(c) * 0.7 && Math.abs(floorAt(c.d) - f.sol) < sOf(c.d) * 0.6); if (c) { f.kick = t; f.kx = x; f.ky = y; f.kd = c.balai; } }
  if (f.kick) { const d3 = t - f.kick; x = f.kx + f.kd * d3 * 900; y = f.ky - 500 * d3 + g / 2 * d3 * d3; rot += d3 * 20; if (x < -40 || x > Wd.W + 40 || y > Wd.H + 40) { f.life = 0; return; } }
  const r = f.sz * K * Math.min(1, (f.life - dt) / 2), c = Math.cos(rot), s = Math.sin(rot), P = [[-1, -0.5], [-0.4, 0.4], [0.4, -0.4], [1, 0.5]].map(([a, b]) => [x + (a * c - b * s) * r, y + (a * s + b * c) * r]);
  Chalk.stroke(P, 1, { w: 1.5, a: 0.8 * Wd.a, seed: f.seed, tip: false });
}
// les rayons du jackpot : seize traits qui partent de la machine jusqu'aux bords de l'écran et tournent, un sur deux plus long
function rayons(f, u, t) {
  const L = Math.hypot(Wd.W, Wd.H), n = 16, e = sm(u / 0.15), k = (1 - sm((u - 0.55) / 0.45)) * Wd.a;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t * 0.9, r0 = 40 + u * 60, r1 = r0 + L * e * (i % 2 ? 0.55 : 1);
    Chalk.line(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0, f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1, 1, { w: i % 2 ? 1.2 : 2, a: 0.45 * k * (0.7 + 0.3 * Math.sin(t * 20 + i)), seed: f.seed + i }); }
}
// les rouleaux : trois cases au-dessus du distributeur ; les symboles défilent, chaque rouleau freine et se pose, le dernier sur le 7
function rouleaux(f, d, fade, K) {
  const g = f.g; if (!g || !Wd.props.includes(g)) { f.life = 0; return; }
  const m = Univers.at(g, [0, 1.02, 0]), w = Math.max(32, g.s * 0.26) * K, h = w * 1.25, S = ['★', '♥', '7', '$', '♣'];
  for (let i = 0; i < 3; i++) { const x = m[0] + (i - 1) * w * 1.15, y = m[1] - h * 0.6, stop = 0.9 + i * 0.45, pose = d > stop;
    Chalk.stroke([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2], [x - w / 2, y - h / 2]], 1, { w: 2, a: 0.85 * fade, seed: f.seed + i, tip: false });
    if (pose) { const b = Math.exp(-(d - stop) * 9) * Math.sin((d - stop) * 30) * h * 0.12; Chalk.text('7', x, y + b + h * 0.02, 1, { size: h * 0.7, align: 'center', a: 0.9 * fade }); }
    else { const v = d * 14 * (1 - 0.5 * d / stop), j = Math.floor(v), q = v - j; [0, 1].forEach(o => { const yy = y + (q - o) * h * 0.8; if (Math.abs(yy - y) < h * 0.45) Chalk.text(S[(j + o + i) % S.length], x, yy, 1, { size: h * 0.55, align: 'center', a: 0.7 * fade }); }); } }
}
// la vague de poussière : un rouleau de nuages au ras du sol, qui part des deux côtés du pied de la tour jusqu'aux bords de l'écran, monte et se défait en volutes
function vaguePoussiere(f, u, K) {
  const e = 1 - Math.pow(1 - u, 2.2), n = 13;
  for (let sd = -1; sd <= 1; sd += 2) { const reach = (sd > 0 ? Wd.W - f.x : f.x) + 60;
    for (let i = 0; i < n; i++) { const q = i / (n - 1), xp = f.x + sd * reach * e * q, front = Math.pow(q, 1.5), rr = f.r * (0.35 + 0.65 * front) * (0.6 + 0.8 * u) * (1 - 0.55 * u * (1 - front)), yp = f.y - rr * 0.7 - u * f.r * 0.5 * (1 - front);
      if (rr < 2) continue; const P = []; for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI * 2, bump = 1 + 0.18 * Math.sin(a * 3 + i + sd + u * 6); P.push([xp + Math.cos(a) * rr * bump, yp + Math.sin(a) * rr * 0.62 * bump]); }
      Chalk.stroke(P, 1 - 0.5 * u, { w: 1.4, a: 0.55 * (1 - u) * Wd.a, seed: f.seed + i * 3 + sd, tip: false }); } }
}
// le MIAOU du géant (js/rares.js) : cinq ondes sonores au trait, qui ondulent et traversent tout l'écran ; elles sortent par les bords (rien ne s'efface)
// une empreinte de la horde : le coussinet et quatre doigts, à plat sur le plancher (écrasés par la perspective) ; à la fin elle rétrécit jusqu'à rien
function empreinte(f, u) {
  const k = u < 0.85 ? 1 : 1 - (u - 0.85) / 0.15, r = f.r * k; if (r < 0.6) return; const a = 0.55 * Wd.a;
  Chalk.circle(f.x, f.y, r, r * 0.5, 1, { w: 1.3, a, seed: f.seed });
  for (let i = 0; i < 4; i++) { const an = (i - 1.5) * 0.45; Chalk.circle(f.x + f.face * Math.cos(an) * r * 1.5, f.y + Math.sin(an) * r * 0.75, r * 0.32, r * 0.18, 1, { w: 1.1, a, seed: f.seed + i + 1 }); }
}
function ondeCri(f, t) {
  const D = Math.hypot(Wd.W, Wd.H) * 1.25;
  for (let i = 0; i < 5; i++) { const tt = t - f.t0 - i * 0.11, R = tt * f.v; if (tt < 0 || R > D) continue;
    const P = [], n = Math.min(120, 24 + Math.floor(R / 12)); for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2, rr = R * (1 + 0.025 * Math.sin(a * 18 + tt * 40 + i)); P.push([f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr * 0.9]); }
    Chalk.stroke(P, 1, { w: Math.max(1, 3.2 - i * 0.5), a: 0.7 * Wd.a, seed: f.seed + i * 7, tip: false }); }
}
function heart(x, y, r, a) {
  const P = []; for (let i = 0; i <= 24; i++) { const q = i / 24 * Math.PI * 2; P.push([x + 16 * Math.pow(Math.sin(q), 3) * r / 16, y - (13 * Math.cos(q) - 5 * Math.cos(2 * q) - 2 * Math.cos(3 * q) - Math.cos(4 * q)) * r / 16]); }
  Chalk.stroke(P, 1, { w: 1.8, a: 0.8 * a, seed: 3, tip: false });
}
// le nuage de bagarre : une boule de traits qui tourne, des pattes et des queues qui en sortent, des étoiles, « !#@ »
let paper = null; addEventListener('themechange', () => { paper = null; });   // (l'espace : le papier devient noir)
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
// (28/09, Mathieu : « pas mal d'événements cliquables ne marchent pas ou ne sont pas impressionnants ») : lancée du menu (grand),
// c'est une ruée : deux fois plus de chats, sur toute la profondeur, plus vite, la pièce qui tremble et la poussière tout du long
function horde(grand, dir0) {
  if (grand ? Wd.cats.filter(c => c.temp).length > 8 : Wd.cats.filter(c => c.temp).length > 4 || Wd.cats.length > MAXC + 6) return false;   // une horde à la fois, pas de foule
  // (vague 11, l'audit : « la horde ») : la grande ruée s'annonce. Un grondement monte d'un bord : la pièce frémit de plus en plus fort,
  // les croquettes sautillent, les objets légers tremblent, un nuage roule à l'horizon ; un chat de la maison dresse l'oreille (« …vous entendez ? »)
  if (grand && !dir0) { if (Wd.preRue) return false; const dr = Math.random() < 0.5 ? 1 : -1, x0 = dr > 0 ? 0 : Wd.W; Wd.preRue = true;
    const ecoute = Wd.cats.filter(k => !k.temp && free4(k)).sort((a, b) => Math.abs(a.x - x0) - Math.abs(b.x - x0))[0];
    if (ecoute) { interrupt(ecoute); ecoute.q = [pose('affut', 1.4, { face: -dr, fx: k => say(k, pick(['…vous entendez ?', '…c’est quoi ce bruit ?', 'oh oh.'])) })]; }
    [0, 0.35, 0.7, 1.0, 1.25].forEach((t, i) => later(t, () => { Wd.shake = { t0: Wd.t, a: 0.8 + i * 0.7 };
      Wd.kib.forEach(k => { if (k.rest && !k.who && Math.random() < 0.5) { k.rest = false; k.vy = -rnd(60, 160) * Wd.s0 / 160 * (1 + i * 0.3); k.vx = rnd(-20, 20); } });
      Wd.props.forEach(it => { if (!it.gone && !LOURD[it.kind] && !it.run && Math.random() < 0.4) { it.wob = Wd.t; it.wobA = 0.25 + i * 0.1; } });
      for (let j = 0; j < 2 + i; j++) dust(x0 + dr * rnd(0, Wd.s0 * (0.3 + i * 0.25)), floorAt(rnd(0.1, 0.7)), Wd.s0 * rnd(0.4, 0.8), 0.8);
      if (i === 2) Wd.fx.push({ k: 'txt', text: 'brrrrrm…', x: x0 + dr * Wd.s0 * 0.9, y: floorAt(0.3) - Wd.s0 * 1.2, t0: Wd.t, life: 1.2, rot: -0.08 * dr, size: 24 }); }));
    later(1.5, () => { Wd.preRue = false; horde(true, dr); }); return true; }
  const dir = dir0 || (Math.random() < 0.5 ? 1 : -1), d = rnd(0.02, 0.2), s = sOf(d), W = Wd.W;
  const m = prop('souris', dir > 0 ? -0.05 : 1.05, d, { yaw: dir > 0 ? -0.35 : Math.PI + 0.35 });
  m.run = { dir, v: s * 2.1 }; m.zo = 200;
  const n = grand ? (Wd.mode === 'large' ? 10 + Math.floor(Math.random() * 3) : 6) : Wd.mode === 'large' ? 4 + Math.floor(Math.random() * 3) : 3;
  for (let i = 0; i < n; i++) {
    const k = addCat({ temp: true, d: grand ? rnd(0, 1) : clamp(d + rnd(-0.02, 0.4), 0, 1), face: dir });
    k.x = m.fx * W - dir * (sc(k) * 1.6 + i * sc(k) * (grand ? rnd(0.45, 0.8) : rnd(0.7, 1.1)));
    k.q = [go(dir > 0 ? W + sc(k) * 2 + i * 10 : -sc(k) * 2 - i * 10, { g: 'galop', v: grand ? rnd(1.25, 1.6) : rnd(1, 1.15) }), fn(k => { k.gone = true; })]; k.balai = dir;   // la horde balaie le bazar au passage
    if (grand) k.rue = true;
  }
  // (vague 3 de l'audit : « la horde manque d'originalité ») : le retour de bâton. Quelques secondes après, la horde repasse… dans l'autre sens,
  // en hurlant : une souris GÉANTE la poursuit. La pièce tremble à chacun de ses pas
  const retour = (n = 0) => {
    // (elle attend que la horde soit sortie de l'écran)
    if (Wd.cats.some(c => c.temp && c.rue && !c.gone && c.x > -sc(c) && c.x < Wd.W + sc(c))) { if (n < 30) later(0.8, () => retour(n + 1)); return; }
    const d2 = rnd(0.1, 0.3), s2 = sOf(d2), from = dir > 0 ? 1 : -1;   // (elle arrive du côté où la horde est sortie)
    const G = prop('souris', from > 0 ? 1.12 : -0.12, d2, { yaw: from > 0 ? Math.PI + 0.35 : -0.35 }); G.big = 9; G.run = { dir: -from, v: s2 * 1.15 }; G.zo = 210; G.geante = true;
    for (let i = 0; i < 4; i++) { const k = addCat({ temp: true, d: clamp(d2 + rnd(-0.08, 0.3), 0, 1), face: -from }); k.x = G.fx * Wd.W - from * (s2 * 3.2 + i * sc(k) * rnd(0.5, 0.9));
      k.q = [go(from > 0 ? -sc(k) * 2 - i * 10 : Wd.W + sc(k) * 2 + i * 10, { g: 'galop', v: rnd(1.5, 1.8) }), fn(k => { k.gone = true; })]; k.balai = -from; k.rue = true;
      later(0.5 + i * 0.4, () => say(k, pick(['AAAAH', 'une souris géante !!', 'on se replie !', 'MAMAAAN', 'c’était pas prévu !']))); }
    Wd.rue = { t0: Wd.t, fin: Wd.t + 6, dir: -from, dit: 0 };
    later(0.8, () => Wd.fx.push({ k: 'txt', text: 'SQUIIIIK', x: from > 0 ? Wd.W * 0.75 : Wd.W * 0.25, y: floorAt(d2) - s2 * 3.4, t0: Wd.t, life: 1.8, rot: 0.1 * from, size: 48 }));
    if (window.Dex && Dex.vu) Dex.vu('souris-geante');
  };
  if (grand) later(3, retour);
  if (grand) { Wd.rue = { t0: Wd.t, fin: Wd.t + 7, dir, dit: 0 }; later(0.3, () => Wd.fx.push({ k: 'txt', text: 'BADABOUM', x: dir > 0 ? W * 0.2 : W * 0.8, y: floorAt(0.3) - sOf(0.3) * 2.2, t0: Wd.t, life: 1.8, rot: -0.12 * dir, size: 40 })); }
  // les chats de la maison qui traînent : certains se joignent à la course
  Wd.cats.filter(k => !k.temp && free4(k) && Math.random() < 0.4).forEach(k => { interrupt(k); k.q = [pose('affut', rnd(0.3, 0.9), { face: dir }), go(dir > 0 ? W + sc(k) * 2 : -sc(k) * 2, { g: 'galop' }), fn(k => { k.gone = true; })]; });
  later(0.6, () => { const lead = Wd.cats.filter(k => k.temp).sort((a, b) => dir * (b.x - a.x))[0]; if (lead) say(lead, '!'); });
}
// la ruée : la pièce tremble tant qu'elle passe, la poussière vole sous les pattes, des onomatopées
function rue() {
  const R = Wd.rue; if (!R) return; const L = Wd.cats.filter(c => c.rue && !c.gone && c.x > -sc(c) && c.x < Wd.W + sc(c));
  if (Wd.t > R.fin || (!L.length && Wd.t - R.t0 > 2)) { Wd.rue = null; return; }
  if (L.length) { Wd.shake = { t0: Wd.t, a: 3 + Math.min(4, L.length * 0.4) };
    // (29/09, l'audit : on ne lisait pas une ruée) : un vrai nuage de poussière roule derrière la horde, trois bouffées par image
    for (let j = 0; j < 3; j++) { const c = pick(L); if (!c.fall) dust(c.x - c.face * sc(c) * rnd(0.4, 1.4), floorAt(c.d), sc(c) * rnd(0.5, 0.9), 0.9); }
    // (vague 7, l'audit : la finition) : les chats de la maison qui ne courent pas sautent en l'air pour laisser passer la ruée (saute-mouton) ;
    // le grondement fait trembler le titre, et une ou deux lettres s'en décrochent (elles rentreront à pattes)
    Wd.cats.forEach(k => { if (k.temp || k.rue || k.gone || !free4(k) || Wd.t - (k.sauteRue || -9) < 2.5) return;
      if (!L.some(c => Math.abs(c.x - k.x) < sc(c) * 1.6 && (c.x - k.x) * c.face < 0 && Math.abs(c.d - k.d) < 0.35)) return;
      k.sauteRue = Wd.t; interrupt(k); const x = k.x, d = k.d; k.q = [hop(() => groundAt(x, d), { h: sc(k) * rnd(1, 1.5) }), pose('atterrit', 0.35), pose('assis', rnd(1, 2))]; say(k, pick(['!', 'hop !', 'ouf', 'à peine…'])); });
    if (!R.lettres && Wd.t - R.t0 > 0.8 && window.Vie && Vie.LETTERS) { R.lettres = true; const Ls = Vie.LETTERS(), en = Ls ? Ls.filter(l => !l.st && l.a > 0.9 && (l.x1 - l.x0) > 6) : [];
      en.forEach(l => { l.wob = Wd.t + rnd(0, 0.3); l.wobA = 1.6; });
      en.sort(() => Math.random() - 0.5).slice(0, Wd.mode === 'large' ? 2 : 1).forEach((l, i) => later(0.4 + i * 0.5, () => { if (!l.st) Vie.tumble(l, R.dir * Wd.s0 * rnd(0.5, 1.2), -Wd.s0 * rnd(0.2, 0.6), R.dir * rnd(3, 7)); })); }
    // (vague 35 de l'audit : « la horde manque d'originalité ») : elle laisse ses traces : des empreintes de coussinets au trait,
    // en rangs serrés sur tout le plancher, qui rétrécissent une à une (rien ne s'efface)
    let nP = 0; for (const f of Wd.fx) if (f.k === 'patte') nP++;
    L.forEach(c => { if (c.fall || nP > 220 || Wd.t < (c.pasT || 0)) return; c.pasT = Wd.t + rnd(0.14, 0.22); c.pasC = -(c.pasC || 1); nP++;
      Wd.fx.push({ k: 'patte', x: c.x - c.face * sc(c) * rnd(0.1, 0.5), y: floorAt(c.d) + c.pasC * sc(c) * 0.05, r: sc(c) * 0.075, face: c.face, t0: Wd.t, life: rnd(8, 11), seed: Math.floor(Math.random() * 99) }); });
    const c = pick(L);
    if (Wd.t > R.dit) { R.dit = Wd.t + rnd(0.5, 0.9); Wd.fx.push({ k: 'txt', text: pick(['VROOOM', 'tagada tagada', 'BRRRM', 'place !', 'ZOOOM', 'mia mia mia']), x: c.x, y: c.y - sc(c) * 1.3, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: rnd(20, 30) }); } }
}
function runMice(dt) {
  Wd.props.filter(p => p.run).forEach(m => {
    m.fx += m.run.dir * m.run.v * dt / Wd.W; m.d = m.dT; Univers.scurry(m, Wd.t, 1);
    if (m.geante && Wd.t > (m.pasT || 0)) { m.pasT = Wd.t + 0.32; Wd.shake = { t0: Wd.t, a: 4 }; dust(xOf(m), floorAt(m.d), sOf(m.d) * 0.8, 0.8); }
    if ((m.run.dir > 0 && m.fx > 1.1) || (m.run.dir < 0 && m.fx < -0.1)) unprop(m);
  });
}
// (lancée du menu, grand : une vraie tour, jusqu'en haut de l'écran, qui tombe caisse après caisse en tremblant ; plus de chats y montent ;
//  quand elle s'écroule, tout vole à travers la pièce : PATATRAS)
function tower(grand) {
  if (Wd.tower) return false;   // une tour à la fois
  // une pile de caisses tombe du ciel, une à une ; les chats y grimpent ; ça penche… et tout s'écroule
  const tr = Wd.P.arbre, clear = tr ? tr.fx + (0.75 + 0.35) * Wd.s0 / Wd.W : 0.15;   // pas contre l'arbre
  const cands = [0.2, 0.3, 0.45, 0.55, 0.7, 0.85].filter(f => f > clear && (Wd.mode === 'large' || f > 0.3));
  if (!cands.length && grand) cands.push(0.62, 0.78);
  if (!cands.length) return false;   // pas de place (écran étroit, l'arbre au milieu) : un autre scénario
  const fx = cands.sort((a, b) => Math.min(...Wd.props.filter(p => !p.run).map(p => Math.abs(p.fx - b))) - Math.min(...Wd.props.filter(p => !p.run).map(p => Math.abs(p.fx - a))))[0];
  const d = grand ? rnd(0.15, 0.35) : rnd(0.3, 0.6), all = grand ? (Wd.mode === 'large' ? [2, 2, 2, 1, 1, 1, 0, 0, 0, 0] : [1, 1, 1, 0, 0, 0, 0]) : Wd.mode === 'large' ? [2, 2, 1, 1, 0, 0] : [1, 1, 0], H = [0.24, 0.3, 0.34];
  // pas plus haute que la place libre sous le titre et les boutons (la grande : jusqu'en haut de l'écran)
  const room = (floorAt(d) - (grand ? Wd.H * 0.07 : ceilY())) / sOf(d) - 0.35; let h = 0; const sizes = all.filter(z => (h += H[z]) < room); if (sizes.length < 2) return false;
  // un escalier en zigzag : chaque caisse déborde d'un côté, et laisse à celle du dessous une marche où poser les pattes
  const z0 = Math.random() < 0.5 ? -1 : 1, offs = sizes.map((_, i) => i ? (i % 2 ? z0 : -z0) * 0.16 : 0);
  const T = Wd.tower = { boxes: [], t: 0, phase: 'pile', w: 0, fx, d, offs, grand: !!grand };
  sizes.forEach((size, i) => later(i * (grand ? 0.42 : 0.52), () => {
    if (Wd.tower !== T) return;
    const b = prop('caisse', fx + offs.slice(0, i + 1).reduce((a, o) => a + o, 0) * sOf(d) / Wd.W + rnd(-0.002, 0.002), d, { size }); b.tower = T; b.fall = true; b.lift = Wd.H + sOf(d) * 0.5; b.vy = -sOf(d) * 2; b.tilt = rnd(-0.25, 0.25); b.tiltV = -b.tilt * 1.5;
    b.target = T.boxes[T.boxes.length - 1] || null; b.zo = 100; T.boxes.push(b);
    if (grand) later(0.55, () => { if (Wd.tower !== T) return; Wd.shake = { t0: Wd.t, a: 2 + i * 0.6 }; Wd.fx.push({ k: 'txt', text: pick(['poc', 'BOM', 'tchac', 'et une !', 'encore ?']), x: xOf(b) + rnd(-30, 30), y: b.y - sOf(d) * 0.5, t0: Wd.t, life: 0.9, rot: rnd(-0.3, 0.3), size: 18 + i * 2 }); });
    if (i === sizes.length - 1) later(1.2, () => { if (Wd.tower === T) { T.phase = 'debout'; T.t = 0; climbers(T); } });
  }));
}
function climbers(T) {
  const n = Math.min(T.grand ? 5 : 3, T.boxes.length - 1, Wd.mode === 'large' ? (T.grand ? 5 : 3) : (T.grand ? 3 : 2)), who = Wd.cats.filter(k => !k.temp && free4(k)).slice(0, n);
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
  if (!T.boxes || !T.boxes.length) { Wd.tower = null; return; }   // (27/09, l'audit : une tour vidée en route plantait ici)
  if (T.phase === 'debout') {
    // chaque chat perché au-dessus de la deuxième caisse fait pencher la pile
    const up = Wd.cats.filter(k => k.perch && k.perch.it.tower === T && T.boxes.indexOf(k.perch.it) >= 1).length;
    T.w += dt * (0.05 + up * (T.grand ? 0.09 : 0.14)); const bs = Wd.P.bassin, x0 = xOf(T.boxes[0]), dir = T.dir || (T.dir = bs && !bs.held && Math.abs(xOf(bs) - x0) < Wd.W * 0.35 && Math.random() < 0.7 ? sgn(xOf(bs) - x0) : Math.random() < 0.5 ? -1 : 1);   // (27/09 : le bassin à côté l'attire : tout le monde à l'eau)
    T.boxes.forEach((b, i) => { if (b.on && i) b.tilt = Math.sin(T.t * 5 + i * 0.6) * T.w * 0.03 * i + dir * T.w * 0.02 * i; });
    if (T.grand && T.w > 0.6 && Wd.t > (T.gr || 0)) { T.gr = Wd.t + 0.7; Wd.shake = { t0: Wd.t, a: 2 }; const b = T.boxes[T.boxes.length - 1]; Wd.fx.push({ k: 'txt', text: pick(['criiic', 'ça penche…', 'oh oh', 'crrraaac']), x: xOf(b) + dir * 40, y: b.y - sOf(b.d) * 0.4, t0: Wd.t, life: 1, rot: dir * 0.2, size: 20 }); }
    // (vague 6, l'audit : « l'écroulement manque de spectacle ») : la grande tour ne tombe pas d'un bloc. Un moment suspendu : elle se courbe
    // loin au-dessus du vide, tout se fige, « oh non. »… puis elle se défait de haut en bas, caisse après caisse, les chats perchés sont éjectés
    if (T.grand && T.w > 1 && !T.suspens) { T.suspens = Wd.t; const b = T.boxes[T.boxes.length - 1];
      Wd.fx.push({ k: 'txt', text: pick(['oh non.', '…', 'euh…']), x: xOf(b) + dir * 30, y: b.y - sOf(b.d) * 0.9, t0: Wd.t, life: 1, rot: 0, size: 22 });
      Wd.cats.forEach(k => { if (k.perch && k.perch.it.tower === T && Math.random() < 0.6) say(k, pick(['!', '!!', 'oups'])); }); }
    if (T.suspens) T.boxes.forEach((b, i) => { if (b.on && i) b.tilt = dir * (0.05 + Math.min(1, (Wd.t - T.suspens) / 0.7) * 0.07) * i; });
    if ((T.w > 1 && (!T.grand || Wd.t - T.suspens > 0.75)) || T.t > 22) {
      T.phase = 'chute'; T.t = 0;
      const G = T.grand ? 1.7 : 1, n = T.boxes.length;
      T.boxes.forEach((b, i) => { if (!i) return; const s = sOf(b.d), part = () => { if (!Wd.props.includes(b)) return; b.deTour = Wd.t;
        // les chats perchés sur cette caisse : éjectés en l'air, en vrille
        Wd.cats.forEach(k => { if (!k.perch || k.perch.it !== b) return; interrupt(k); k.perch = null; k.fall = true; k.vx = dir * sOf(k.d) * rnd(2.5, 5.5); k.vy = -sOf(k.d) * rnd(2.5, 4.5); k.spin = dir * rnd(4, 8); if (Math.random() < 0.7) say(k, pick(['WAAAH', 'miaaaou !', 'au secours !', 'yiiik'])); });
        drop(b, dir * s * (0.5 + i * 0.35) * rnd(0.7, 1.3) * G * (T.grand ? rnd(0.3, 1.2) : 1), s * rnd(0.2, 1) * G, -dir * rnd(1.5, 4.5) * G); b.dT = clamp(T.d + rnd(-0.35, 0.35) * G, 0, 1);
        if (T.grand) later(0.2, () => { if (Wd.props.includes(b)) dust(xOf(b), b.y, s * 0.6, 1); }); };
        if (T.grand) later((n - 1 - i) * 0.1, part); else part(); });
      const b = T.boxes[T.boxes.length - 1]; dust(xOf(b), b.y, sOf(b.d) * 0.8, 1);
      Wd.shake = { t0: Wd.t, a: T.grand ? 14 : 7 };
      if (T.grand) later(0.35, () => Wd.fx.push({ k: 'vague', x: xOf(T.boxes[0]), y: floorAt(T.d), r: sOf(T.d) * 0.9, t0: Wd.t, life: 2.6, seed: Math.floor(Math.random() * 99) }));
      if (T.grand) Wd.fx.push({ k: 'txt', text: 'PATATRAS !', x: clamp(xOf(T.boxes[0]) + dir * 60, 150, Wd.W - 150), y: floorAt(T.d) - sOf(T.d) * 2.6, t0: Wd.t, life: 2.2, rot: -0.12 * dir, size: 52 });
      if (window.Rares && Rares.panique) Rares.panique(xOf(T.boxes[0]));   // (la panique, comme pour le géant : js/rares.js)
      Wd.fx.push({ k: 'txt', text: 'boum !', x: xOf(T.boxes[0]), y: floorAt(T.d) - sOf(T.d) * 1.6, t0: Wd.t, life: 1.6, rot: -0.1, size: 26 });
    }
  } else if (T.phase === 'chute' && T.t <= 10) {
    // à l'impact, une caisse de la grande tour fait BAM, et parfois s'ouvre : un chat caché dedans en jaillit (« coucou ! ») et détale
    if (T.grand) T.boxes.forEach(b => { if (b.deTour && b.wasFall && !b.fall && !b.impact && Wd.props.includes(b)) { b.impact = true; const s = sOf(b.d);
      dust(xOf(b), floorAt(b.d), s * 0.5, 0.9); Wd.shake = { t0: Wd.t, a: 3 };
      { const nc = Wd.mode === 'large' ? 9 : 5; for (let q = 0; q < nc; q++) Wd.fx.push({ k: 'calage', x: xOf(b) + rnd(-0.2, 0.2) * s, y: b.y - s * 0.3, vx: rnd(-1, 1) * s * 4, vy: -rnd(1.5, 4) * s, sol: floorAt(clamp(b.d + rnd(-0.15, 0.15), 0, 1)), r0: rnd(0, 6.28), w: rnd(-12, 12), sz: clamp(s * 0.05, 3, 7), t0: Wd.t, life: 40, seed: Math.floor(Math.random() * 99) }); }
      Wd.fx.push({ k: 'txt', text: pick(['BAM', 'boum', 'CRAC', 'pouf', 'bonk']), x: xOf(b) + rnd(-20, 20), y: b.y - s * 0.5, t0: Wd.t, life: 0.9, rot: rnd(-0.3, 0.3), size: 20 });
      if ((T.caches || 0) < 2 && Math.random() < 0.4 && residents().length < MAXC + 3) { T.caches = (T.caches || 0) + 1; const f = Math.random() < 0.5 ? -1 : 1, k = addCat({ temp: true, d: b.d, face: f });
        k.x = xOf(b); k.y = b.y - s * 0.3; k.fall = true; k.vx = f * s * rnd(1, 2.5); k.vy = -s * rnd(3.5, 5); k.spin = f * 6.28;
        later(0.4, () => say(k, pick(['coucou !', 'on m’a oublié ?', 'surprise !', 'j’étais dedans !'])));
        k.q = [pose('assis', 0.8), go(f > 0 ? Wd.W + sc(k) * 2 : -sc(k) * 2, { g: 'galop', v: 1.2 }), fn(k => { k.gone = true; })]; if (window.Dex) Dex.vu('surprise'); } }
      b.wasFall = b.fall; });
  } else if (T.phase === 'chute' && T.t > 10) {
    // (vague 3 de l'audit : les caisses ne s'effacent plus) : l'équipe du ménage débarque au galop et les pousse hors de l'écran
    T.phase = 'fin'; T.t = 0; const L = T.boxes.filter(b => Wd.props.includes(b)); L.forEach(b => { b.balaiOK = true; });
    const dir = xOf(T.boxes[0]) < Wd.W / 2 ? -1 : 1, ds = [...new Set(L.map(b => Math.round(b.d * 3) / 3))].slice(0, 4);
    ds.forEach((d, i) => later(i * 0.45, () => { if (residents().length + i > MAXC + 4) return; const k = addCat({ temp: true, d: clamp(d, 0, 1), face: dir }); k.x = dir > 0 ? -sc(k) * 2 : Wd.W + sc(k) * 2;
      k.q = [go(dir > 0 ? Wd.W + sc(k) * 2 : -sc(k) * 2, { g: 'galop', v: 1.3 }), fn(k => { k.gone = true; })]; k.balai = dir; k.menage = T;
      if (!i) later(0.6, () => say(k, pick(['ménage !', 'place !', 'on range !', 'poussez-vous !']))); }));
  }
  else if (T.phase === 'fin' && T.t <= 16) {
    // un déménageur distrait (un saut, une pose) repart au galop vers le bord
    Wd.cats.forEach(c => { if (c.menage === T && !c.gone && !c.task && !c.q.length) c.q = [go(c.balai > 0 ? Wd.W + sc(c) * 2 : -sc(c) * 2, { g: 'galop', v: 1.3 }), fn(k => { k.gone = true; })]; });
    // chaque déménageur pousse toute caisse qu'il atteint (même d'un grand pas), à sa profondeur
    Wd.cats.forEach(c => { if (!c.balai || c.gone) return; const dir = c.balai;
      T.boxes.forEach(b => { if (!b.balaiOK || b.swept || b.held || !Wd.props.includes(b) || Math.abs(b.d - c.d) > 0.4 || (xOf(b) - c.x) * dir > sc(c) * 0.7) return;
        drop(b, dir * SPEED.galop * sc(c) * rnd(2, 2.6), sOf(b.d) * rnd(0.5, 1.2), dir * -rnd(3, 7)); b.swept = dir; dust(xOf(b), floorAt(b.d), sOf(b.d) * 0.4, 0.8);
        Wd.fx.push({ k: 'txt', text: pick(['hop', 'zou', 'et hop !', 'dehors !']), x: xOf(b), y: b.y - sOf(b.d) * 0.6, t0: Wd.t, life: 0.8, rot: rnd(-0.3, 0.3), size: 16 }); }); });
  }
  else if (T.phase === 'fin' && T.t > 16) {
    // ce qui est sorti de l'écran s'en va ; ce qui reste devient du bazar ordinaire (l'aspirateur, la horde s'en chargeront)
    T.boxes.forEach(b => { if (!Wd.props.includes(b)) return; const x = xOf(b); b.balaiOK = false; b.tower = null;
      if (x < -sOf(b.d) || x > Wd.W + sOf(b.d)) { Wd.cats.forEach(k => { if (k.perch && k.perch.it === b) interrupt(k); }); unprop(b); } else b.launched = Wd.t; });
    Wd.tower = null; }
}
// ce qui est tombé revient à sa place (en fondu), un moment après
function tidy() {
  Wd.props.forEach(it => {
    if (!it.home || it.fall || it.held || it.tower || it.run || it.ventre) return;
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
      // plus personne ne le tient (le chat pendu est parti, on l'a délogé) : il remonte
      if (g.pulling && !g.byHand && !Wd.cats.some(c => c.task && c.task.k === 'pendu' && c.task.g === g && c.task.on)) g.pulling = false;
      if (!g.pulling) { const u = Wd.t - (g.flick ?? -9); g.pull = u < 0.5 ? Math.sin(u / 0.5 * Math.PI) : (g.pull || 0) * Math.exp(-dt * 7); }
      if (g.pulling && g.pull > 0.75 && Wd.t > (g.next || 0)) { shoot(g); g.next = Wd.t + 0.3; }
    }
    // (29/09, vague 5) il lui pousse des pattes : il détale dans toute la pièce en sautillant, puis rentre chez lui, épuisé
    if (g.rentre) { const R = g.rentre, e = R.fx0 - g.fx; g.fx += Math.sign(e) * Math.min(Math.abs(e), dt * 0.09);
      if (Math.abs(e) < 0.002) { g.fx = R.fx0; g.pattes = Math.max(0, (g.pattes || 0) - dt * 2.5); if (!g.pattes) { g.rentre = null; const m = Univers.at(g, [0, 0, 0]); dust(m[0], m[1], g.s * 0.3, 0.8); Wd.fx.push({ k: 'txt', text: 'ouf.', x: m[0], y: m[1] - g.s * 0.9, t0: Wd.t, life: 1.4, rot: 0.1, size: 16 }); } }
      else g.pattes = Math.min(1, (g.pattes || 0) + dt * 3); }
    if (g.folle) {
      const F = g.folle;
      if (F.fx0 == null) F.fx0 = g.fx;
      g.pattes = Math.min(1, (g.pattes || 0) + dt * 3);
      if (!F.boum && Wd.t > F.t0 + 0.5 && !g.held && !g.on) { if (Wd.t > (F.tn || 0)) { F.tx = clamp(g.fx + rnd(0.18, 0.4) * (g.fx > 0.5 ? -1 : 1) * (Math.random() < 0.25 ? -1 : 1), 0.12, 0.88); F.tn = Wd.t + rnd(1.1, 1.9); }
        const v = (F.tx - g.fx) * Math.min(1, dt * 2.4); g.fx += v; g.cour = v / Math.max(dt, 1e-3);
        // les chats les plus vifs lui courent après
        if (Wd.t > (F.chasse || 0)) { F.chasse = Wd.t + 1.2; Wd.cats.filter(c => !c.temp && free4(c) && !c.glouton && Math.random() < 0.3).slice(0, 2).forEach(c => { interrupt(c); c.q.push(go(g.fx * Wd.W, { g: 'galop' })); if (Math.random() < 0.5) say(c, pick(['reviens !', 'attends !', 'mrrraow !'])); }); } }
      else g.cour = 0;
      if (Wd.t > F.next && Wd.kib.length < KIBMAX()) { F.next = Wd.t + 0.07; const m = Univers.at(g, g.bec), k = Wd.s0 / 160;
        for (let i = 0; i < 3; i++) Wd.kib.push({ x: m[0], y: m[1], vx: rnd(-750, 750) * k, vy: -rnd(300, 1050) * k, d: rnd(0, 0.15), t0: Wd.t, rest: false, spin: Math.random() * 6 }); }
      if (Wd.t > F.say) { F.say = Wd.t + rnd(0.6, 1); const m = Univers.at(g, g.bec); Wd.fx.push({ k: 'txt', text: pick(g.cour && Math.abs(g.cour) > 8 ? ['youhouuu !', 'attrapez-moi !', 'croquettes pour tous !', 'BZZT !', 'hihihi'] : ['BZZT !', 'ding ding ding', '!!!', 'croquettes !!!', 'brrrrr']), x: m[0] + rnd(-40, 40), y: m[1] - g.s * rnd(0.4, 0.8), t0: Wd.t, life: 1.2, rot: rnd(-0.3, 0.3), size: 19 }); }
      if (!F.fest && Wd.t > F.t0 + 1.2) { F.fest = true; feast(); }
      if (!F.rouleaux && Wd.t > F.end - 3.1) { F.rouleaux = true; Wd.fx.push({ k: 'rouleaux', g, t0: Wd.t, life: 3.4, seed: 9 }); }
      // (29/09, l'audit : il manquait un vrai moment) : le bouquet final. Il se tasse, tremble plus fort… et JACKPOT : un geyser de croquettes
      // qui monte jusqu'au plafond et retombe en pluie sur toute la pièce, la pièce tremble
      if (!F.boum && Wd.t > F.end - 1.6) { F.boum = true; g.wob = Wd.t; g.wobA = 2.2; const m = Univers.at(g, g.bec), k = Wd.s0 / 160; Wd.shake = { t0: Wd.t, a: 7 };
        Wd.fx.push({ k: 'txt', text: 'JACKPOT !!!', x: m[0], y: m[1] - g.s * 1.1, t0: Wd.t, life: 2, rot: -0.08, size: 44 }); dust(m[0], m[1], g.s * 0.6, 1);
        // (vague 29, l'audit : « le distributeur fou ») : une machine à sous. Juste avant, trois rouleaux à la craie tournent au-dessus de lui
        // et s'arrêtent un à un sur 7 7 7 ; au jackpot, des rayons de lumière partent de lui et balaient toute la pièce
        Wd.fx.push({ k: 'rayons', x: m[0], y: m[1] - g.s * 0.2, t0: Wd.t, life: 2.4, seed: 5 });
        for (let i = 0; i < 70 && Wd.kib.length < KIBMAX() + 60; i++) Wd.kib.push({ x: m[0], y: m[1], vx: rnd(-1, 1) * rnd(200, 1500) * k, vy: -rnd(900, 1900) * k, d: rnd(0, 0.5), t0: Wd.t, rest: false, spin: Math.random() * 6 }); }
      if (Wd.t > F.end) { g.folle = null; g.cour = 0; if (Math.abs(g.fx - F.fx0) > 0.002) g.rentre = { fx0: F.fx0 }; const m = Univers.at(g, [0, 0.8, 0]); dust(m[0], m[1], g.s * 0.3, 1); Wd.fx.push({ k: 'txt', text: 'pfff…', x: m[0], y: m[1] - 20, t0: Wd.t, life: 1.6, rot: -0.1, size: 18 }); g.clk = 0; }
    }
  });
  // les cartons lancés et effacés s'en vont pour de bon
  Wd.props.slice().forEach(p => { if (p.gone) { unprop(p); return; } if (p.launched && !p.fadeT && p.fade < 0.02 && !p.ventre) { Wd.cats.forEach(c => { if (c.perch && c.perch.it === p) interrupt(c); }); unprop(p); } });
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
    if (k.y >= f && k.vy > 0) { k.y = f; if (k.vy > 180) { k.vy = -k.vy * 0.35; k.vx *= k.swept ? 0.9 : 0.55; } else if ((k.swept || Wd.t - (k.souf ?? -9) < 0.6) && Math.abs(k.vx) > 40) { k.vy = -rnd(60, 160); k.vx *= 0.93; } else { k.rest = true; k.swept = false; k.vx = k.vy = 0; } }
  });
}
// les pattes du distributeur (quand il devient fou) : deux jambes au trait qui trottinent, deux gros chaussons
function drawPattes() {
  Wd.props.forEach(g => { if (g.kind !== 'distrib' || !(g.pattes > 0.02) || g.a < 0.05) return;
    const f = floorAt(g.d), ph = Wd.t * (g.rentre ? 5 : Math.abs(g.cour || 0) > 8 ? 11 : 17), sens = Math.sign(g.cour || 0.001);
    [-1, 1].forEach((sd, i) => { const h = Univers.at(g, [sd * g.hull.w * 0.26, 0.02, 0]), pas = Math.sin(ph + i * Math.PI) * g.s * 0.07 * (Math.abs(g.cour || 0) > 8 ? 1 : 0.3),
        fx = h[0] + pas * sens + sd * g.s * 0.03, fy = Math.min(f, h[1] + g.s * 0.2 * g.pattes) - Math.max(0, Math.cos(ph + i * Math.PI)) * g.s * 0.03,
        kx = (h[0] + fx) / 2 + sd * g.s * 0.05, ky = (h[1] + fy) / 2;
      Chalk.stroke([h, [kx, ky], [fx, fy]], 1, { w: 2.2, a: 0.9 * g.a, amp: 0.3, seed: 41 + i, tip: false });
      Chalk.circle(fx + sens * g.s * 0.02, fy - g.s * 0.018, g.s * 0.05, g.s * 0.022, 1, { w: 2, a: 0.9 * g.a, seed: 43 + i }); });
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
  X.slice().forEach(it => { if (!it.fadeT && it.fade < 0.02 && !it.ventre) { X.splice(X.indexOf(it), 1); Wd.cats.forEach(c => { if (c.perch && c.perch.it === it) interrupt(c); }); unprop(it); } });
}


/* ——— l'aspirateur divin : quand il y a trop de bazar, il descend du ciel (dans un rayon de lumière), balaie la scène
   d'un bord à l'autre et aspire ce qui traîne (les cartons lancés, les croquettes, les objets déplacés, qui reviennent à leur place) ;
   les chats s'enfuient… sauf un curieux, aspiré puis recraché ——— */
const clutter = () => Wd.props.filter(p => p.launched && !p.suck).length + Math.floor(Wd.kib.filter(k => k.rest).length / 12) + Wd.props.filter(p => p.away && !p.launched && Wd.t - p.away > 6).length;
// (lancé du menu, grand : il aspire TOUT ce qui n'est pas trop lourd — coussins, pelotes, gamelles, cartons — et plusieurs chats ;
//  puis, remonté, il a un hoquet… et recrache tout du ciel : ça pleut dans la pièce, chaque chose retombe à peu près chez elle)
function aspire(grand) {
  if (Wd.vac) { if (grand && !Wd.vac.grand) { Wd.vac.grand = true; Wd.vac.ventre = []; } return; } const dir = Math.random() < 0.5 ? 1 : -1;
  Wd.vac = { t0: Wd.t, dir, x: dir > 0 ? Wd.s0 * 0.6 : Wd.W - Wd.s0 * 0.6, ph: 'descend', curious: false, grand: !!grand, ventre: [], nC: 0 };
  const c = Wd.cats.find(k => free4(k)); if (c) say(c, '?!');
}
function vacFrame(dt) {
  if (!Wd.vac) { if (Wd.t > (Wd.vacT || 0)) { Wd.vacT = Wd.t + 1; if (clutter() >= (Wd.mode === 'large' ? 14 : 7) && Wd.t > (Wd.vacCool || 0) && Math.random() < 0.035) aspire(); } return; }   // de temps en temps seulement, pas dès que ça déborde
  const V = Wd.vac, u = Wd.t - V.t0, s0 = Wd.s0, mouthY = Wd.floor - s0 * 1.05;
  V.y = V.ph === 'descend' ? -s0 + (mouthY + s0) * sm(u / 1.3) : V.ph === 'remonte' ? mouthY - (mouthY + s0 * 1.5) * sm((Wd.t - V.tu) / 1.2) : mouthY + Math.sin(u * 5) * 4;
  if (V.ph === 'descend' && u > 1.3) { V.ph = 'balaye'; V.tb = Wd.t; if (window.Rares && Rares.panique) Rares.panique(V.x); Wd.fx.push({ k: 'txt', text: 'VROUUUM', x: V.x, y: mouthY - s0 * 0.9, t0: Wd.t, life: 1.6, rot: -0.1, size: 22 }); }
  if (V.ph === 'balaye') {
    V.x += V.dir * Wd.W / (V.grand ? 7 : 5.5) * dt;
    if (V.grand) Wd.shake = { t0: Wd.t, a: 1.5 };
    const R = s0 * 0.9;
    // ce qui traîne sous la bouche s'envole vers elle
    Wd.props.forEach(it => { if (it.suck || it.held || it.run || it.mur || Math.abs(it.x - V.x) > R) return;
      const temp = V.grand ? !LOURD[it.kind] && !it.tower && !it.pivot && it.kind !== 'eau' && !it.ventre : it.launched || it.tmp || (it.away && Wd.t - it.away > 2 && !it.tower); if (!temp) return;   // (it.tmp : la feuille arrachée)
      it.suck = { t0: Wd.t, fx: it.fx, lift: it.lift, big: it.big || 1 }; it.on = null; it.fall = false; });
    // (vague 5 : « l'aspiration manque de souffle ») : ce qui est tout près mais trop lourd penche vers la bouche et tremble
    Wd.props.forEach(it => { if (it.suck || it.held || it.mur || it.pivot || it.fall) return; const dx = V.x - it.x; if (Math.abs(dx) > R * 2.2) return; const f = 1 - Math.abs(dx) / (R * 2.2);
      it.tilt = (it.tilt || 0) * 0.8 + (sgn(dx) * 0.12 * f + Math.sin(Wd.t * 40 + it.x) * 0.02 * f) * 0.2; });
    Wd.kib.forEach(k => { if (!k.suck && Math.abs(k.x - V.x) < R) { k.suck = Wd.t; k.sx = k.x; k.sy = k.y; if (k.who) k.who = null; } });
    // les chats : ils filent de l'autre côté ; un curieux s'approche trop… aspiré, puis recraché
    Wd.cats.forEach(c => { if (c.rare || c.held || c.fall || c.hidden || c.perch || Math.abs(c.x - V.x) > R * 1.8 || Wd.t - (c.fled || -9) < 4) return;
      c.fled = Wd.t;
      if ((V.grand ? V.nC < 4 && Math.random() < 0.75 : !V.curious && Math.random() < 0.35) && Math.abs(c.x - V.x) < R) { V.curious = true; V.nC++; interrupt(c); say(c, 'miaaa !!'); c.fall = true; c.vx = (V.x - c.x) * 2; c.vy = -Math.sqrt(2 * grav() * Math.max(10, c.y - V.y)); c.spin = Math.PI * 2 * sgn(Math.random() - 0.5);
        later(0.9, () => Wd.fx.push({ k: 'txt', text: 'ptoui !', x: V.x, y: V.y + 10, t0: Wd.t, life: 1.2, rot: 0.1, size: 18 }));
        // (vague 9, l'audit : l'aspirateur) : un copain accourt à la rescousse, tape l'aspirateur du bout de la patte (« rends-le ! ») ;
        // le recraché arrive tout ébouriffé
        const ami = Wd.cats.filter(k => k !== c && !k.temp && !k.rare && free4(k)).sort((a, b) => Math.abs(a.x - V.x) - Math.abs(b.x - V.x))[0];
        if (ami && Math.random() < 0.7) { interrupt(ami); const sd = sgn(ami.x - V.x) || 1; ami.q = [go(inView(V.x + sd * s0 * 0.7), { g: 'galop', face: -sd }), pose('tape', 0.7, { fx: k => { say(k, pick(['rends-le !', 'lâche-le !', 'hé !!'])); Wd.fx.push({ k: 'txt', text: 'bonk', x: V.x, y: V.y - s0 * 0.2, t0: Wd.t, life: 0.8, rot: -0.2, size: 16 }); } }), pose('affut', 1)]; }
        later(1.6, () => { if (Wd.cats.includes(c)) say(c, pick(['pfff…', 'beurk', 'plus jamais'])); });
        return; }
      interrupt(c); say(c, pick(['!!', 'fshhh', 'mia !'])); c.q = [go(inView(c.x + V.dir * Wd.W * 0.35), { g: 'galop' }), pose('affut', rnd(1, 2), { face: -V.dir }), pose('toilette', rnd(1.5, 3))]; });
    if (V.x < -s0 * 0.4 || V.x > Wd.W + s0 * 0.4 || Wd.t - V.tb > (V.grand ? 9 : 7)) { V.ph = 'remonte'; V.tu = Wd.t; V.x = clamp(V.x, 0, Wd.W);
      if (V.grand) recrache(V);
      Wd.fx.push({ k: 'txt', text: pick(['propre !', 'voilà.', 'merci qui ?']), x: clamp(V.x, 60, Wd.W - 60), y: mouthY - s0 * 0.5, t0: Wd.t, life: 2, rot: -0.08, size: 22 }); }
  }
  if (V.ph === 'remonte' && Wd.t - V.tu > 1.2 && !Wd.props.some(p => p.suck) && !Wd.kib.some(k => k.suck)) { Wd.vac = null; Wd.vacCool = Wd.t + rnd(70, 140); }
  // l'aspiration : vers la bouche, de plus en plus petit, puis disparu
  const mx = V.x, my = V.y + s0 * 0.05;
  Wd.props.slice().forEach(it => { if (!it.suck) return; const q = Math.min(1, (Wd.t - it.suck.t0) / 0.7), e = q * q;
    it.fx = it.suck.fx + (mx / Wd.W - it.suck.fx) * e; it.lift = it.suck.lift + (floorAt(it.d) - my - it.suck.lift) * e; it.tilt = (it.tilt || 0) + dt * 9; it.big = it.suck.big * (1 - 0.8 * e); it.fade = it.fadeT = 1;   // (il rapetisse en s'engouffrant, il ne s'efface pas)
    Wd.cats.forEach(c => { if (c.perch && c.perch.it === it) { interrupt(c); c.fall = true; c.vy = -sOf(it.d); say(c, '!!'); } });
    if (q >= 1) { it.big = it.suck.big; it.suck = null; if (V.grand) { it.ventre = true; V.ventre.push(it); } else if (it.launched || !it.home) unprop(it); else goHome(it); } });
  Wd.kib.forEach(k => { if (!k.suck) return; const q = Math.min(1, (Wd.t - k.suck) / 0.45); k.rest = true; k.x = k.sx + (mx - k.sx) * q * q; k.y = k.sy + (my - k.sy) * q * q; if (q >= 1) k.gone = true; });
}
// le hoquet : tout ce qu'il a avalé retombe du ciel, à peu près chez soi, en tournant ; les chats curieux avec
function recrache(V) {
  const L = V.ventre.slice(); V.ventre = [];
  later(0.9, () => { Wd.shake = { t0: Wd.t, a: 10 }; Wd.fx.push({ k: 'txt', text: pick(['HIC !', 'BEUARK', 'BLOURP']), x: Wd.W / 2, y: Wd.H * 0.22, t0: Wd.t, life: 1.8, rot: -0.1, size: 48 }); });
  L.forEach((it, i) => later(1 + i * 0.13, () => {
    if (!Wd.props.includes(it)) return; it.ventre = false;
    const h = it.home && !it.home.on ? it.home : null;
    Object.assign(it, { fx: h ? h.fx + rnd(-0.04, 0.04) : rnd(0.1, 0.9), on: null, dans: null, fall: true, lift: Wd.H * rnd(1, 1.3), vx: rnd(-40, 40), vy: 0, tiltV: LOURD[it.kind] ? rnd(-4, 4) : rnd(-9, 9), fade: 1, fadeT: 1, launched: it.launched });
    if (h) it.dT = h.d; it.away = Wd.t;
  }));
}
function drawVac(S) {
  const V = Wd.vac; if (!V) return; const C = Chalk, s0 = Wd.s0, x = V.x, y = V.y, a = 0.85 * Wd.a, w = s0 * 0.28;
  // (27/09) il a aspiré de l'arc-en-ciel : il en prend les couleurs (js/arcenciel.js, V.arcT)
  const ARC = V.arcT > Wd.t && window.Arc ? Arc.COUL : null, col = k => ARC ? ARC[(k + Math.floor(Wd.t * 6)) % ARC.length] : undefined;
  // le rayon divin : de la lumière qui tombe du ciel autour du tuyau
  for (let i = -3; i <= 3; i++) { const sp = i * s0 * 0.16; C.line(x + sp * 0.3, 0, x + sp, y - s0 * 0.1, 1, { w: 1.1, a: 0.16 * Wd.a, amp: 0.4, seed: 40 + i, tip: false, dash: [6, 9] , color: col(1) }); }
  // le tuyau (deux traits ondulés), les annelures
  const hose = k => { const P = []; for (let j = 0; j <= 12; j++) { const v = j / 12, yy = -10 + (y - s0 * 0.35 + 10) * v; P.push([x + k * w * 0.32 + Math.sin(v * 7 + Wd.t * 3) * s0 * 0.05 * (1 - v), yy]); } return P; };
  C.stroke(hose(-1), 1, { w: 2, a, seed: 51, tip: false , color: col(2) }); C.stroke(hose(1), 1, { w: 2, a, seed: 52, tip: false , color: col(3) });
  for (let j = 1; j < 6; j++) { const yy = (y - s0 * 0.35) * j / 6, xx = x + Math.sin(j / 6 * 7 + Wd.t * 3) * s0 * 0.05 * (1 - j / 6); C.line(xx - w * 0.32, yy, xx + w * 0.32, yy + 3, 1, { w: 1.2, a: a * 0.6, seed: 60 + j, tip: false , color: col(4) }); }
  // la bouche : un entonnoir large, ouvert vers le bas ; une auréole au-dessus
  C.stroke([[x - w * 0.32, y - s0 * 0.35], [x - w, y], [x + w, y], [x + w * 0.32, y - s0 * 0.35]], 1, { w: 2.4, a, seed: 70, tip: false , color: col(5) });
  C.circle(x, y - s0 * 0.5, w * 0.7, w * 0.16, 1, { w: 1.6, a: a * 0.8, seed: 71 , color: col(6) });
  // l'aspiration : des petits traits qui montent vers la bouche
  // le tourbillon : des traits en spirale qui s'enroulent dans la bouche, la poussière du sol qui monte en cône
  // (vague 34 de l'audit : « l'aspirateur reste dans son coin ») : l'air de toute la pièce converge vers la bouche, des filets qui s'enroulent depuis les bords de l'écran
  if (V.ph === 'balaye') { const Rm = Math.hypot(Wd.W, Wd.H) * 0.85, sd = V.dir || 1;
    for (let i = 0; i < 26; i++) { const th = i / 26 * Math.PI * 2 + Math.sin(i * 7.3) * 0.2, ph = (Wd.t * 0.55 + ((i * 0.618) % 1)) % 1, P = [];
      for (let j = 0; j <= 6; j++) { const v = Math.min(0.999, ph + j * 0.025), r = Rm * Math.pow(1 - v, 1.4), aa = th + v * 2.4 * sd; P.push([x + Math.cos(aa) * r, y + Math.sin(aa) * r * 0.72]); }
      C.stroke(P, 1, { w: 1.1 + ph, a: a * 0.5 * Math.sin(Math.PI * ph), seed: 300 + i, tip: false, dash: [10, 7], color: col(i) }); } }
  if (V.ph === 'balaye') { for (let i = 0; i < 12; i++) { const ph = (Wd.t * 1.6 + i / 12) % 1, a0 = i / 12 * Math.PI * 2 + Wd.t * 4, r0 = s0 * 1.1 * (1 - ph), P = [];
      for (let j = 0; j <= 4; j++) { const v = ph + j * 0.05, rr = s0 * 1.1 * Math.max(0, 1 - v), aa = a0 + v * 5; P.push([x + Math.cos(aa) * rr, Wd.floor - (Wd.floor - y) * Math.min(1, v) + Math.sin(aa) * rr * 0.18]); }
      if (r0 > 4) C.stroke(P, 1, { w: 1.3, a: a * 0.55 * Math.sin(Math.PI * ph), seed: 90 + i, tip: false, color: col(i) }); }
    for (let i = 0; i < 5; i++) { const ph = (Wd.t * 2.6 + i / 5) % 1, px = x + (i - 2) * s0 * 0.3 * (1 - ph); C.dot(px, Wd.floor - (Wd.floor - y) * ph * 0.9, 2 + 2 * (1 - ph), a * 0.5 * (1 - ph)); } }
  if (V.ph === 'balaye') for (let i = 0; i < 7; i++) { const ph = (Wd.t * 2.2 + i / 7) % 1, sx = x + (i - 3) * s0 * 0.22 * (1 - ph), sy = Wd.floor - (Wd.floor - y) * ph; C.line(sx, sy + 8, sx + (x - sx) * 0.1, sy, 1, { w: 1.2, a: a * 0.5 * (1 - ph), seed: 80 + i, tip: false , color: col(7) }); }
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
  if (S.frame !== undefined) { if (S.frame === Wd.fid) return; Wd.fid = S.frame; }   // (deux scènes à la fois, pendant un fondu : une seule image de vie)
  const dt = Math.min(0.05, S.dt || 0); Wd.a = S.a;
  measure(S);
  for (let i = 0; i < (Wd.fast || 1); i++) step(S, dt);   // Wd.fast : pour les essais, le monde en accéléré
}
function step(S, dt) {
  Wd.f++; Wd.t += dt;
  if (!ready) { ready = true; for (let i = 0; i < 2; i++) { const c = addCat({ x: rnd(0.3, 0.85) * Wd.W }); c.q.push(pose(pick(['assis', 'toilette', 'pain']), rnd(2, 5))); } }
  // ailleurs (js/trounoir.js : le trou noir qui aspire tout, puis l'espace) : le monde de la pièce s'arrête, les chats sont à lui
  if (ail()) { Wd.ail.step(dt); return; }
  // la population : trois chats (au moins) ; quand l'un part, un autre arrive
  if (dt && residents().length < (Wd.mode === 'large' ? 3 : 2) && Wd.t > Wd.nextIn) { enter(); Wd.nextIn = Wd.t + rnd(3, 9); }
  // les scénarios
  if (dt && Wd.t > Wd.nextScen && !Wd.tower && !Wd.props.some(p => p.run) && !Wd.busyScen) { nextScenario(); Wd.nextScen = Wd.t + rnd(24, 42); }
  if (Wd.t > (Wd.ceilT || 0)) { Wd.ceil = ceilY(); Wd.s0T = size0(); Wd.ceilT = Wd.t + 0.5; }
  if (Math.abs(Wd.s0T - Wd.s0) > 0.05) Wd.s0 += (Wd.s0T - Wd.s0) * Math.min(1, dt * 1.5);
  { const D = profondeur(); if (Math.abs(D - Wd.depth) > 0.5) Wd.depth += (D - Wd.depth) * Math.min(1, dt * 1.2); }
  laters(); H.pre.forEach(f => f(dt)); runMice(dt); rue(); towerFrame(dt); kibFrame(dt); vacFrame(dt); extras(); machines(dt);
  Wd.cats.forEach(c => { if (c.pet && Wd.t - c.pet.t > 5) { c.pet = null; c.task = null; } });
  if (dt && Wd.t > Wd.nextKib) { const g = Wd.props.find(p => p.kind === 'distrib'); if (g) fire(g); Wd.nextKib = Wd.t + rnd(16, 32); }
  Wd.props.forEach(it => updProp(it, dt)); apart(dt);
  Wd.cats.slice().forEach(c => live(c, dt));
  spread(dt); bump();
  H.post.forEach(f => f(dt));
  tidy();
}
const ail = () => Wd.ail && Wd.ail.on();
function draw(S) { if (ail()) { Wd.ail.draw(S); drawFx(S); return; } drawWater(S); drawPattes(); drawKib(S); drawVac(S); H.draw.forEach(f => f(S)); vitesse(); drawFx(S); }
// (vague 28, l'audit : « les chats 3D au trait ») : les traits de vitesse de la bande dessinée. Un chat qui galope, qu'on lance ou qui tombe
// laisse derrière lui trois ou quatre traits de craie le long de sa course, plus longs quand il va vite ; ils tremblent un peu
function vitesse() {
  if (Wd.a < 0.05) return; const t = Wd.t;
  Wd.cats.forEach(c => {
    if (c.gone || c.hidden || c.held || !c.D) { c.vit = null; return; }
    const s = sc(c), cy = c.y - c.D.stand * s, v = c.vit;
    if (!v || t - v.t > 0.2) { c.vit = { t, x: c.x, y: cy, vx: 0, vy: 0 }; return; }
    const dt = t - v.t; if (dt < 1e-3) return;
    const k = 1 - Math.exp(-dt * 12); v.vx += ((c.x - v.x) / dt - v.vx) * k; v.vy += ((cy - v.y) / dt - v.vy) * k; v.t = t; v.x = c.x; v.y = cy;
    const sp = Math.hypot(v.vx, v.vy), seuil = s * 1.15; if (sp < seuil) return;   // (le trot : 0,62 ; le galop : 1,5)
    const ux = v.vx / sp, uy = v.vy / sp, nx = -uy, ny = ux, L = Math.min(s * 1.8, (sp - seuil) * 0.3 + s * 0.3), R = Math.max(c.D.a || 0.4, c.D.h || 0.4) * s * 0.55, al = Math.min(1, (sp - seuil) / (s * 0.5)) * 0.7 * Wd.a;
    for (let i = 0; i < 4; i++) { const o = (i - 1.5) * R * 0.45, dec = R * (0.9 + (i % 2) * 0.35), x0 = c.x - ux * dec + nx * o, y0 = cy - uy * dec + ny * o, l = L * (0.6 + 0.4 * ((i * 7 + Math.floor(t * 12)) % 3) / 2);
      Chalk.line(x0, y0, x0 - ux * l, y0 - uy * l, 1, { w: 1.5, a: al * (i % 3 ? 0.8 : 1), seed: (c.id || 0) * 13 + i + Math.floor(t * 10) }); }
  });
}
function hideAll() { Wd.cats.forEach(c => { c.root.visible = false; }); Wd.props.forEach(it => { it.root.visible = false; }); }

/* ——— les mains : cliquer, attraper ——— */
function catAt(x, y) {
  let best = null, bz = -Infinity;
  Wd.cats.forEach(c => { if (c.hidden || c.gone || c.rare) return; const b = Chat.where(c, c.body), h = Chat.where(c, c.head), k = sc(c);
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
  if (ail()) return Wd.ail.click(x, y);
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
  if (ail()) return Wd.ail.grab(x, y);
  const L = leverAt(x, y); if (L) return L;
  for (const f of H.grab) { const k = f(x, y); if (k) return k; }   // (les visiteurs de js/rares.js)
  const c = catAt(x, y); if (c) return c; const it = propAt(x, y); return it && !it.run ? it : null;
}
// le levier de la machine à cartons : son pommeau à l'écran
function knob(g) { const a = (g.lev0 ?? 0.3) + (g.pull || 0) * (g.levK ?? 1.3); return Univers.at(g, [g.pivot[0] - Math.sin(a) * 0.3, g.pivot[1] + Math.cos(a) * 0.3, g.pivot[2]]); }
function leverAt(x, y) { const g = Wd.props.find(p => p.pivot && !p.held && !p.fall && p.a > 0.5); if (!g) return null; const k = knob(g); return Math.hypot(x - k[0], y - k[1]) < Math.max(g.s * 0.09, 18) ? (g.handle || (g.handle = { lever: g })) : null; }
const isProp = k => !!(k && k.hull);
function drag(c, x, y) {
  if (c && ail()) return Wd.ail.drag(c, x, y);
  if (!c || run(H.drag, c, x, y)) return;
  if (c.lever) { const g = c.lever; g.hand = Wd.t; g.byHand = true; if (!g.pulling) { g.pulling = true; c.y0 = y - (g.pull || 0) * g.s * 0.35; } g.pull = clamp((y - c.y0) / (g.s * 0.35), 0, 1); return; }
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
  // (à la souris, on caresse en survolant, sans cliquer : js/chats.js, survol ; appuyer, c'est attraper. Au doigt, le geste de côté caresse encore)
  if (!c.held && !c.pet) { const dx = x - (Wd.gx ?? x), dy = y - (Wd.gy ?? y);
    if (Wd.tactile && Math.hypot(dx, dy) < 12) return;   // le geste n'a pas encore de direction : on attend
    if (Wd.tactile && Math.abs(dx) > Math.abs(dy) * 2.2 && dy > -8 && !c.fall && !c.jump) { interrupt(c); c.pet = { n: 0, dir: 0, lx: x, t: Wd.t, run: 0, x0: Wd.gx ?? x, y0: Wd.gy ?? y }; c.q = []; c.task = { k: 'wait', anim: 'caresse', until: c => !c.pet, max: 120, t: 0 }; say(c, '♥'); } }
  // la main sort du dos (trop loin sur le côté, ou vers le haut) : on arrête de caresser, on l'attrape
  // (sur le dos, le corps descend : la main qui caressait reste plus haut sans qu'on l'ait levée)
  if (c.pet) { const b = Chat.where(c, c.body), k = sc(c), P = c.pet, mx = c.D.a * k * 1.3 + 20;
    // (le corps bouge sous la main, il se cambre, roule : on juge aussi par rapport à l'endroit où la caresse a commencé)
    // une fois la caresse lancée, seul un geste franc vers le haut le soulève : la main qui déborde de côté continue de caresser
    // (avant, elle le « portait » sans qu'on le veuille, et porté, il finissait par griffer)
    const haut = y < P.y0 - c.D.h * k * (P.n ? 3 : 1.2) - (P.n ? 60 : 20) && y < b[1] - c.D.h * k * (P.belly ? 3.4 : 1.6) - 20;
    if (haut || (!P.n && Math.abs(x - b[0]) > mx && Math.abs(x - P.x0) > mx)) { c.pet = null; c.task = null; } else { pet(c, x, y); return; } }
  if (!c.held) { interrupt(c); c.fall = false; c.held = true; c.spin = 0; c.pend = { th: 0, w: 0, px: x, py: y, vx: 0, vy: 0, ax: 0 }; say(c, pick(['mia ?', '…', 'hé !']));
    // (28/09, Mathieu : « le chat n'a pas tout de suite la bonne animation quand je le prends ») : pris par la peau du cou, il pend tout de suite
    porteTout(c); }
  c.hx = x; c.hy = y;
}
// les caresses : chaque aller-retour de la main compte ; il ronronne, pétrit, s'endort… ou en a assez (un coup de patte)
function pet(c, x, y) {
  const P = c.pet, m = x - P.lx; P.run += Math.abs(m); P.lx = x;
  if (Math.abs(m) > 2) { const d = sgn(m); if (d !== P.dir && P.run > sc(c) * 0.12) { P.dir = d; P.run = 0; P.n++; c.purr = Wd.t + 2.5;
    if (P.n % 2 === 0) Wd.fx.push({ k: 'heart', x: x + rnd(-10, 10), y: y - 14, t0: Wd.t, life: 1.3, r: clamp(sc(c) * 0.06, 6, 11) });
    if (P.n === 3) say(c, 'rrrr', 0); if (P.n === 7) say(c, 'rrrrrrr ♥', 0);
    // trop, c'est trop : le grincheux (et parfois un autre) donne un petit coup de patte
    // (seul le grincheux griffe : Mathieu, 27/09, « il me griffe alors que je le caresse » ; les autres ne s'en lassent pas)
    const lim = c.breed === 'grincheux' ? 5 : 1e9;
    if (P.n >= lim && Math.random() < 0.8) { c.pet = null; c.task = null; c.q = [pose('tape', 0.5, { face: sgn(x - c.x) || c.face, fx: c => say(c, 'pfff !') }), go(inView(c.x - sgn(x - c.x) * sc(c) * 1.5), { g: 'trot' }), pose('toilette', 2.5)]; } } }
  P.t = Wd.t; c.face = c.face;
}
/* la caresse au survol (Mathieu, 27/09 : « la caresse ne devrait pas être au clic, mais simplement avec le curseur ; pareil pour la gratouille ») :
   le curseur qui va et vient sur un chat le caresse ; longtemps, il roule sur le ventre (la gratouille, js/vie.js) ; le curseur s'en va, la caresse finit */
const hov = { c: null, run: 0, lx: 0, ly: 0, c0: null };
function finCaresse(c) { const n = c.pet ? c.pet.n : 0; c.pet = null; c.task = null; c.q = n > 5 ? [pose('petrit', rnd(2, 3.5), { fx: c => say(c, '♥') }), pose('pain', rnd(4, 8))] : n ? [pose('assis', rnd(1, 2))] : []; }
function survol(x, y) {
  if (!ready || Wd.a < 0.5 || ail()) return;
  const dx = x - hov.lx, dy = y - hov.ly; hov.lx = x; hov.ly = y;
  const c = hov.c;
  if (c) {
    if (!Wd.cats.includes(c) || !c.pet || c.held || c.gone) { hov.c = null; return; }
    const b = Chat.where(c, c.body), k = sc(c), loin = Math.hypot((x - b[0]) / (c.D.a * k * 1.5 + 24), (y - b[1]) / (c.D.h * k * (c.pet.belly ? 3.6 : 2.4) + 30)) > 1;
    if (loin && catAt(x, y) !== c) { hov.c = null; finCaresse(c); return; }
    pet(c, x, y); return;
  }
  const o = catAt(x, y);
  if (!o || o.held || o.fall || o.jump || o.pet || o.escT && Wd.t - o.escT < 3 || o.perch && o.perch.moving) { hov.run = 0; hov.c0 = null; return; }
  // (un curseur qui passe ne l'arrête pas : il faut un petit va-et-vient sur lui)
  if (hov.c0 !== o) { hov.c0 = o; hov.run = 0; }
  hov.run += Math.abs(dx) + Math.abs(dy) * 0.5; if (hov.run < Math.max(40, sc(o) * 0.3)) return;
  // (il boude : pas de caresse ; il tourne le dos, une fois de temps en temps)
  if (o.grudge > Wd.t) { hov.run = 0; if (Wd.t - (o.dosT ?? -9) > 3 && !o.perch && (o.task ? o.task.k === 'pose' : true)) { o.dosT = Wd.t; o.face = sgn(o.x - x) || o.face; say(o, pick(['hmpf', 'non.', '…', 'pas toi.'])); } return; }
  { const pe = o.perch; interrupt(o); o.perch = pe; }   // (perché, il reste perché pendant la caresse)
  o.pet = { n: 0, dir: 0, lx: x, t: Wd.t, run: 0, x0: x, y0: y, hov: true }; o.q = []; o.task = { k: 'wait', anim: 'caresse', until: c => !c.pet, max: 120, t: 0 }; say(o, '♥');
  hov.c = o; hov.c0 = null; hov.run = 0;
}
addEventListener('pointerdown', e => { Wd.tactile = e.pointerType !== 'mouse'; const c = hov.c; if (c) { hov.c = null; if (c.pet) finCaresse(c); } }, true);
addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || e.buttons) return; if (e.target.closest && e.target.closest('a,button,select,input,label,.top,.film-ui,.tuto')) return; survol(e.clientX, e.clientY); }, { passive: true });
function purr(c) { c.purr = Wd.t + 2.6; say(c, '♥'); later(0.5, () => say(c, 'rrrr', 0)); }
function release(c, vx, vy) {
  if (c && ail()) return Wd.ail.release(c, vx, vy);
  if (!c || run(H.release, c, vx, vy)) return;
  if (c.lever) { const g = c.lever; g.byHand = false; if (!g.pulling) { g.flick = Wd.t; shoot(g); } g.pulling = false; return; }
  if (c.pet) { const n = c.pet.n; c.pet = null; c.task = null; c.q = n > 5 ? [pose('petrit', rnd(2, 3.5), { fx: c => say(c, '♥') }), pose('pain', rnd(4, 8))] : [pose('assis', rnd(1, 2))]; if (!n) purr(c); return; }
  // un simple clic (sans soulever) : d'abord les modules (le coffre, la trappe coincée, le distributeur vide…), sinon une pichenette
  if (isProp(c)) { const it = c; if (!it.held) { if (!run(H.click, Wd.gx ?? it.x, Wd.gy ?? it.y)) poke(it, Wd.gx ?? it.x); return; }
    // lâché : il vole, tourne sur lui-même, rebondit, se pose (sur une caisse, s'il tombe dessus)
    it.held = false; it.lache = Wd.t; drop(it, clamp(vx || 0, -1800, 1800), -clamp(vy || 0, -1800, 1800), clamp((vx || 0) * 0.004, -7, 7) + rnd(-1, 1)); return; }
  if (!c.held) { if (!run(H.click, Wd.gx ?? c.x, Wd.gy ?? c.y) && !c.fall && !c.jump) purr(c); return; }
  c.held = false; c.fall = true; c.vx = clamp(vx || 0, -1500, 1500); c.vy = clamp(vy || 0, -1500, 1500);
  // la pose change (pendu → en chute) : le corps reste où il est
  c.y += c.D.stand * sc(c); c.cur[I.y] = c.D.stand; c.spin = clamp((c.pend ? c.pend.th : 0) * c.face - c.vx * 0.002, -1.5, 1.5); c.pend = null;
  c.d = freeD();
}

// pour js/vie.js : le monde et ses outils
const K = { Wd, H, porteTout, boutons, rectOf, ANIMS, STEPS, CARAC, SPEED, LOURD, I, sit, lie, blink, rnd, pick, clamp, sgn, sm, c01, lerp, later, sc, front, back, sOf, floorAt, zOf, xOf, grav, inView, groundAt, perchAt, beside,
  PORTE, SCEN, drawFx, addCat, unCat, free, free4, zoomies, eat, play, climb, push, smash, interrupt, claim, go, pose, hop, fn, say, dust, startle, thud, drop, prop, unprop, kick, residents, leave, enter, catAt, propAt, freeD, stack, topOf, open, unbox, hide, sleep, idle, stroll, press, fire, folle, aspire,
  get MAXC() { return MAXC; } };
return { K, ANIMS, CARAC, frame, draw, hide: hideAll, click, grab, drag, release, get clicks() { return Wd.clicks; }, get world() { return Wd; }, horde, tower, aspire, folle: () => folle(Wd.P.distrib), ouvre: () => { const b = Wd.props.find(p => p.launched && p.kind === 'caisse' && !p.busy && !p.fall), c = Wd.cats.find(free4); if (b && c) { interrupt(c); open(c, b); } }, fight: () => { const L = Wd.cats.filter(free4).slice(0, 2); if (L.length > 1) fight(L); }, quarrel: () => { const L = Wd.cats.filter(free4); if (L.length > 1) quarrel(L[0], L[1]); } };
})();
