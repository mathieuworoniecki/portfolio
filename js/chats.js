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
    Chat.rest(c, p); const sw = Math.sin(t * 3.1) * 0.12; p[I.pitch] = 1.45 + sw * 0.3; p[I.stretch] = 0.12; p[I.y] = 0; p[I.hx] = c.D.a < 0.4 ? c.D.a * 0.45 : 0.02; p[I.look] = 1;
    p[I.fl] = p[I.fr] = -1.45 + sw; p[I.hl] = p[I.hr] = -1.3 - sw; p[I.fk] = p[I.fk2] = p[I.hk] = 1.2;
    p[I.eyes] = (t % 4) < 3 ? 0 : 1; p[I.py] = -1; p[I.tailUp] = -0.3; p[I.tailCurl] = -0.3; p[I.tailWave] = 0.4; p[I.tailPhase] = t * 2;
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

return { ANIMS };
})();
