window.Chats = (() => {
const I = Chat.I;
const ANIMS = {
  pas(c, p, t) { Chat.rest(c, p); Chat.gait(c, p, 'pas', t * 0.9, 1); p[I.tailPhase] = t * 3; p[I.tailWave] = 1; },
  trot(c, p, t) { Chat.rest(c, p); Chat.gait(c, p, 'trot', t * 1.6, 1); p[I.tailPhase] = t * 3; p[I.tailWave] = 1; },
  galop(c, p, t) { Chat.rest(c, p); Chat.gait(c, p, 'galop', t * 2.4, 1); p[I.tailUp] = 0.2; p[I.tailCurl] = -0.5; }
};
return { ANIMS };
})();
