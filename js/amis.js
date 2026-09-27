/* Les chats se souviennent de toi (27/09, l'audit : « un utilisateur peut y passer plusieurs heures » ; le monde garde une mémoire d'une visite à l'autre).
   Chaque race a une affection pour le visiteur, gardée dans le navigateur (localStorage) :
   - elle monte avec les caresses (et plus encore la gratouille), elle baisse quand on le secoue jusqu'à ce qu'il s'échappe, quand on le lance fort ;
   - un copain (affection 5 et plus) reste plus longtemps, dit bonjour en arrivant, et revient te voir à la visite suivante ;
   - un rancunier (−3 et moins) arrive vexé : il faudra le reconquérir. */
window.Amis = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, say, pose, go, inView, later } = K;
const CLE = 'pf-amis';
let A = {}; try { A = JSON.parse(localStorage.getItem(CLE) || '{}') || {}; } catch (e) { A = {}; }
let dirty = false; const garde = () => { dirty = true; };
setInterval(() => { if (!dirty) return; dirty = false; try { localStorage.setItem(CLE, JSON.stringify(A)); } catch (e) {} }, 3000);
addEventListener('pagehide', () => { try { localStorage.setItem(CLE, JSON.stringify(A)); } catch (e) {} });
const get = b => A[b] || 0;
const coeur = c => Wd.fx.push({ k: 'heart', x: c.x, y: c.y - K.sc(c) * 1.1, t0: Wd.t, life: 1.6, r: Math.max(7, K.sc(c) * 0.07) });
function change(c, d) {
  if (!c || c.rare || !c.breed) return; const avant = get(c.breed); A[c.breed] = Math.max(-6, Math.min(20, avant + d)); garde();
  if (avant < 5 && A[c.breed] >= 5) { say(c, pick(['tu es mon humain ♥', 'copains ?', '♥ ♥'])); coeur(c); if (window.Dex) Dex.vu('copain'); }
  if (avant > -3 && A[c.breed] <= -3) { say(c, pick(['je m’en souviendrai.', 'hmpf.', 'plus jamais.'])); if (window.Dex) Dex.vu('rancunier'); }
}

/* ——— ce qui compte ——— */
H.live.push(c => {
  if (c.rare || c.temp) return;
  if (c.pet && c.pet !== c.amiPet) { c.amiPet = c.pet; change(c, 0.5); }
  if (c.pet && c.pet.belly && !c.amiVentre) { c.amiVentre = 1; change(c, 1); } else if (!c.pet) c.amiVentre = 0;
  if (c.escT && c.escT !== c.amiEsc) { c.amiEsc = c.escT; if (c.sulk) change(c, -1); }   // (échappé des mains ; pas le piège du ventre, qui est un jeu)
  // lancé fort (juste après la main) : un peu moins d'amour
  if (c.fall && c.relT && c.relT !== c.amiLance && Wd.t - c.relT < 0.3 && Math.hypot(c.vx || 0, c.vy || 0) > K.sOf(c.d) * 6) { c.amiLance = c.relT; change(c, -0.5); }
});

/* ——— ce que ça change ——— */
H.post.push(() => {
  for (const c of Wd.cats) {
    if (c.rare || c.temp || c.amiVu) continue; c.amiVu = 1; const a = get(c.breed);
    if (a >= 5) { c.stay *= 2; later(rnd(0.8, 2), () => { if (!Wd.cats.includes(c) || c.held || c.fall) return; say(c, pick(['coucou toi ♥', 'te revoilà !', 'mrrp ♥'])); coeur(c); }); }
    else if (a <= -3) { c.grudge = Wd.t + 25; later(rnd(0.8, 2), () => { if (Wd.cats.includes(c)) say(c, pick(['toi…', 'hmpf.', '…']), 0); }); }
  }
});
// le copain préféré revient te voir, peu après ton arrivée (une fois par visite)
let revenu = false;
H.post.push(() => {
  if (revenu || Wd.t < 6 || !Wd.W) return; revenu = true;
  const fav = Object.keys(A).filter(b => A[b] >= 5 && Chat.TYPES[b] && !Chat.TYPES[b].rare).sort((a, b) => A[b] - A[a])[0]; if (!fav) return;
  if (Wd.cats.some(c => c.breed === fav)) { if (window.Dex) Dex.vu('retour'); return; }
  const side = Math.random() < 0.5 ? -1 : 1, c = K.addCat({ id: fav, face: -side }); c.x = side < 0 ? -K.sc(c) * 1.2 : Wd.W + K.sc(c) * 1.2; c.amiVu = 1; c.stay = rnd(120, 200);
  c.q = [go(inView(Wd.W * rnd(0.3, 0.7)), { g: 'trot' }), pose('miaule', 1.4, { fx: c => { say(c, pick(['c’est moi !', 'tu m’as manqué ♥', 'me revoilà'])); coeur(c); if (window.Dex) Dex.vu('retour'); } }), pose('assis', rnd(2, 4))];
});

return { get, change, get tous() { return { ...A }; } };
})();
