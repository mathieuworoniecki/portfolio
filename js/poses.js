/* De nouvelles poses et petites scènes pour les chats (27/09, Mathieu : « plus de positions et d'animations »).
   Branché sur js/chats.js par ses crochets (Chats.K.H.think) ; chaque pose écrit la pose cible (voir ANIMS dans js/chats.js).
   - coucou : assis, une patte avant levée qui fait coucou, les yeux ravis
   - curieux : assis, la tête très penchée d'un côté puis de l'autre, les pupilles qui cherchent
   - queue : il court après sa queue, en rond sur place ; puis il est tout étourdi (la tête qui tourne)
   - donut : il dort roulé en boule, le nez dans la queue
   - roule : sur le sol, il se roule d'un côté à l'autre, les pattes en l'air
   - sursaut : un bond vertical, le dos rond et tout gonflé (le coup du concombre)
   - croise : couché, les pattes avant croisées, très digne */
window.Poses = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, ANIMS, I, rnd, pick, sm, sc, say, pose, fn } = K;

const blink = t => (t % 3.7) < 0.14 ? 1 : 0;
// couché sur le ventre (comme lie() dans js/chats.js)
function lie(c, p) {
  Chat.rest(c, p); p[I.y] = c.D.h * 0.92 + 0.01; p[I.sqz] = -0.06; p[I.fk] = p[I.fk2] = 0.55; p[I.fl] = p[I.fr] = 1.45; p[I.hk] = 0.12;
  p[I.look] = 0.95; p[I.tailUp] = -0.1; p[I.tailSide] = 1.2; p[I.tailCurl] = 0.6; p[I.tailWave] = 0.2;
}

ANIMS.coucou = (c, p, t) => {
  K.sit(c, p, -0.1); const w = Math.sin(t * 9);
  p[I.fr] += 2 + w * 0.35; p[I.fk2] = 0.8; p[I.htilt] = 0.18 + w * 0.05; p[I.eyes] = 2; p[I.look] = 1; p[I.tailWave] = 0.8; p[I.tailPhase] = t * 5;
};
ANIMS.curieux = (c, p, t) => {
  K.sit(c, p); const u = t % 3.2, side = u < 1.6 ? 1 : -1, k = sm((u % 1.6) / 0.25);
  p[I.htilt] = side * 0.55 * k; p[I.hnod] = -0.08; p[I.look] = 1; p[I.px] = side * 0.8; p[I.py] = 0.4; p[I.eyes] = blink(t); p[I.tailWave] = 0.4; p[I.tailPhase] = t * 3;
};
// après sa queue : il trottine en rond sur place (il se retourne sans arrêt), la queue enroulée devant le nez, tout content
ANIMS.queue = (c, p, t) => {
  Chat.rest(c, p); Chat.gait(c, p, 'trot', t * 2.4, 1); c.face = Math.sin(t * 5.5) >= 0 ? 1 : -1;
  p[I.look] = 0.7; p[I.htilt] = 0.25; p[I.eyes] = 2; p[I.pitch] = -0.05; p[I.tailUp] = 0.2; p[I.tailSide] = 1.5; p[I.tailCurl] = 1.2; p[I.tailWave] = 1.3; p[I.tailPhase] = t * 12; p[I.px] = -1;
};
// étourdi : assis de travers, la tête qui fait des ronds, les yeux fermés
ANIMS.etourdi = (c, p, t) => {
  K.sit(c, p, 0.15); p[I.htilt] = Math.sin(t * 4) * 0.4; p[I.hnod] = Math.cos(t * 4) * 0.15; p[I.eyes] = 1; p[I.sqz] = Math.sin(t * 4) * 0.03; p[I.tailWave] = 0.2;
};
// en donut : la tête posée sur les pattes, rentrée vers la queue, la queue enroulée par-devant
ANIMS.donut = (c, p, t) => {
  lie(c, p); p[I.sqz] = -0.02 + Math.sin(t * 1.4) * 0.03; p[I.y] -= 0.012; p[I.pitch] = -0.05; p[I.fk] = p[I.fk2] = 0.2; p[I.hk] = 0.1;
  p[I.hy] = -c.D.h * 0.45; p[I.hx] = -0.02; p[I.hnod] = 0.25; p[I.htilt] = -0.5; p[I.eyes] = 1; p[I.look] = 0.8;
  p[I.tailSide] = 2.4; p[I.tailCurl] = 1.8; p[I.tailUp] = -0.2; p[I.tailWave] = 0.05;
};
// il se roule : le corps tourne d'un côté sur le dos et revient (c.rollT, adouci dans js/vie.js), les pattes qui gigotent
ANIMS.roule = (c, p, t) => {
  Chat.rest(c, p); const u = 0.5 + 0.5 * Math.sin(t * 1.8), w = Math.sin(t * 6);
  c.rollT = Math.PI * (0.25 + 0.75 * u);
  p[I.y] = c.D.h * (0.95 - 0.15 * u); p[I.sqz] = -0.05; p[I.look] = 1; p[I.eyes] = u > 0.7 ? 2 : 0;
  p[I.fl] = 0.5 + w * 0.3; p[I.fr] = 0.1 - w * 0.3; p[I.hl] = 0.4 - w * 0.2; p[I.hr] = 0.1 + w * 0.2; p[I.fk] = p[I.fk2] = 0.85; p[I.hk] = 0.9;
  p[I.htilt] = 2.95 * u; p[I.hy] = -c.D.h * 0.7 * u; p[I.tailUp] = -0.5; p[I.tailSide] = 1; p[I.tailWave] = 1; p[I.tailPhase] = t * 5;
};
// le sursaut : droit en l'air, les quatre pattes raides, le dos rond, gonflé comme un pompon
ANIMS.sursaut = (c, p, t) => {
  Chat.rest(c, p); const u = Math.min(1, t / 0.7), up = Math.sin(u * Math.PI);
  p[I.y] += up * 0.35; p[I.sqz] = 0.15 * up; p[I.puff] = 0.9 * up + 0.2; p[I.fk] = p[I.fk2] = p[I.hk] = 1.3; p[I.fl] = p[I.fr] = -0.2; p[I.hl] = p[I.hr] = 0.2;
  p[I.eyes] = 0; p[I.py] = 1; p[I.mouth] = up > 0.3 ? 1 : 0; p[I.tailUp] = 1.7; p[I.tailCurl] = -0.5; p[I.tailWave] = 0.1;
};
// couché, les pattes avant croisées l'une sur l'autre, le menton haut
ANIMS.croise = (c, p, t) => {
  lie(c, p); p[I.fl] = 1.6; p[I.fr] = 1.25; p[I.fk] = 0.75; p[I.fk2] = 0.6; p[I.hnod] = -0.12; p[I.eyes] = (t % 5) < 3 ? blink(t) : 1; p[I.look] = 1; p[I.tailWave] = 0.3; p[I.tailPhase] = t * 2;
};

// les envies : selon le caractère (js/chats.js, CARAC)
H.think.push((c, add) => {
  if (c.temp) return; const ch = c.ch;
  add(0.35 + ch.pose * 0.15, () => c.q.push(pose('coucou', rnd(1.8, 2.8), { fx: c => say(c, pick(['coucou !', 'mia !', '♥'])) }), pose('assis', rnd(1, 2))));
  add(0.3 + ch.flane * 0.15, () => c.q.push(pose('curieux', rnd(3, 5), { fx: c => say(c, '?') })));
  add(0.1 + ch.fou * 0.35 + ch.joue * 0.1, () => c.q.push(pose('queue', rnd(2.2, 3.5)),
    pose('etourdi', rnd(1.6, 2.4), { fx: c => say(c, pick(['tout tourne…', '@_@', 'ouh…'])) }), pose('assis', 1)));
  add(0.15 + ch.dort * 0.3, () => c.q.push(pose('donut', rnd(8, 16), { fx: c => say(c, 'zzz', 0) })));
  add(0.15 + ch.joue * 0.2, () => c.q.push(pose('roule', rnd(3, 5), { fx: c => say(c, pick(['mrrr', '♥', 'rrr'])) }), pose('secoue', 0.5), pose('assis', 1)));
  add(0.2 + ch.pose * 0.2, () => c.q.push(pose('croise', rnd(5, 9))));
  add(0.04 + ch.fou * 0.12, () => c.q.push(pose('sursaut', 0.75, { fx: c => say(c, pick(['!!!', 'AH !', 'hiii !'])) }), pose('feule', 0.6), pose('boude', rnd(1.5, 2.5))));
});

return { poses: ['coucou', 'curieux', 'queue', 'etourdi', 'donut', 'roule', 'sursaut', 'croise'] };
})();
