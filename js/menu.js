/* Le menu des événements (27/09, Mathieu : « sur la gauche, une sorte de menu kawaii avec des illustrations, qui nous permette de déclencher
   les événements spéciaux »).
   Une barre au bord gauche, toujours là : une colonne de grandes pastilles au trait, seulement les gros événements (le chat géant, la horde,
   la tour de cartons, l'aspirateur, le distributeur fou, l'arc-en-ciel), leur nom écrit à la main à côté ; puis le carnet et les hauts faits.
   Les petits (les autres chats rares, la bagarre, le bain…) arrivent d'eux-mêmes.
   Seulement sur l'écran des chats. */
window.Menu = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, pick } = K;
const L_ = k => (window.L ? L(k) : k);
// les dessins : un trait, des yeux ronds (viewBox 0 0 40 40)
const yeux = (x, y, e) => `<circle cx="${x - (e || 4)}" cy="${y}" r="1.8" class="p"/><circle cx="${x + (e || 4)}" cy="${y}" r="1.8" class="p"/>`;
const tete = (x, y, r) => `<path d="M${x - r} ${y + r * 0.2} Q${x - r} ${y + r} ${x} ${y + r} Q${x + r} ${y + r} ${x + r} ${y + r * 0.2} L${x + r * 0.85} ${y - r * 0.9} L${x + r * 0.35} ${y - r * 0.55} Q${x} ${y - r * 0.65} ${x - r * 0.35} ${y - r * 0.55} L${x - r * 0.85} ${y - r * 0.9} Z"/>`;
const ICON = {
  geant: tete(20, 22, 15) + yeux(20, 22, 5) + '<path d="M17 28 Q20 30 23 28"/>',
  interminable: '<path d="M3 26 Q3 18 10 18 L33 18 Q37 18 37 22 L37 26"/>' + tete(9, 17, 6) + yeux(9, 17, 2.5) + '<path d="M13 26 v4 M30 26 v4 M37 22 q3 -4 1 -8"/>',
  ballon: '<circle cx="20" cy="15" r="11"/>' + yeux(20, 15, 4) + '<path d="M20 26 q-3 5 0 11"/><path d="M12 7 l-2 -4 M28 7 l2 -4"/>',
  eclair: tete(14, 24, 8) + yeux(14, 24, 3) + '<path d="M28 4 l-5 11 h6 l-6 12" class="e"/>',
  totem: tete(20, 10, 6) + tete(20, 22, 7) + tete(20, 34, 5) + yeux(20, 10, 2.5) + yeux(20, 22, 3),
  acrobate: tete(20, 11, 7) + yeux(20, 11, 3) + '<circle cx="20" cy="30" r="8"/><path d="M14 30 h12 M20 22 v0"/>',
  horde: tete(10, 24, 6) + tete(20, 20, 6) + tete(30, 24, 6) + yeux(10, 24, 2.2) + yeux(20, 20, 2.2) + yeux(30, 24, 2.2),
  tour: '<rect x="11" y="26" width="18" height="10" rx="1"/><rect x="13" y="16" width="14" height="10" rx="1"/><rect x="15" y="7" width="10" height="9" rx="1"/><path d="M20 28 v6 M18 18 h4"/>',
  aspirateur: '<path d="M8 32 h20 q6 0 6 -6 q0 -6 -6 -6 h-10 q-4 0 -4 4"/><path d="M14 20 v-12 q0 -3 3 -3 h8"/><circle cx="12" cy="33" r="3"/><circle cx="28" cy="33" r="3"/>' + yeux(24, 26, 3),
  folle: '<rect x="12" y="12" width="16" height="22" rx="4"/><path d="M14 6 h12 v6 h-12 z M28 20 l6 -3"/>' + yeux(20, 21, 3) + '<path d="M16 28 q4 3 8 0"/><circle cx="36" cy="12" r="1.5"/><circle cx="33" cy="8" r="1.5"/>',
  bagarre: '<path d="M8 20 q-2 -9 7 -10 q3 -6 10 -3 q8 -2 9 6 q6 4 1 10 q0 7 -8 6 q-4 5 -10 1 q-9 2 -9 -6 q-5 -2 0 -4z"/><path d="M14 16 l3 3 M26 16 l-3 3 M16 26 l8 0"/>',
  colis: '<rect x="8" y="16" width="24" height="18" rx="1"/><path d="M8 22 h24 M20 16 v18 M20 16 q-7 -9 -9 -3 q0 3 9 3 q7 -9 9 -3 q0 3 -9 3"/>',
  mouche: '<ellipse cx="20" cy="23" rx="6" ry="8"/><ellipse cx="13" cy="13" rx="6" ry="4" transform="rotate(-30 13 13)"/><ellipse cx="27" cy="13" rx="6" ry="4" transform="rotate(30 27 13)"/>' + yeux(20, 20, 2.5),
  concert: tete(14, 26, 8) + yeux(14, 26, 3) + '<path d="M26 22 v-14 l8 -2 v12"/><circle cx="24" cy="22" r="2.5" class="p"/><circle cx="32" cy="18" r="2.5" class="p"/>',
  vitre: '<rect x="6" y="6" width="28" height="28" rx="2"/><path d="M20 6 v28 M6 20 h28"/>' + tete(20, 24, 7) + yeux(20, 24, 3),
  arc: '<path d="M4 32 a16 16 0 0 1 32 0"/><path d="M8 32 a12 12 0 0 1 24 0"/><path d="M12 32 a8 8 0 0 1 16 0"/><path d="M2 32 q3 -3 6 0 M32 32 q3 -3 6 0"/>',
  bain: '<path d="M5 24 h30 q0 10 -15 10 q-15 0 -15 -10z"/>' + tete(20, 20, 7) + yeux(20, 20, 3) + '<circle cx="9" cy="14" r="2"/><circle cx="31" cy="11" r="2.5"/><circle cx="28" cy="5" r="1.5"/>',
};
const libres = () => Wd.cats.filter(c => K.free4(c) && !c.temp && !c.rare);
// (27/09, Mathieu : « certains événements doivent être spectaculaires ») : chaque bouton annonce son événement en grand, l'écran tremble,
// une gerbe d'étoiles ; et s'il n'y a pas assez de chats disponibles, on les libère (ou il en tombe du ciel) au lieu de ne rien faire
function dispo(n) {
  const L = Wd.cats.filter(c => !c.rare && !c.temp && !c.held && !c.fall && !c.hidden && !c.fight && c.hp && c.x > 0 && c.x < Wd.W).slice(0, n);
  L.forEach(c => { if (!K.free4(c)) { const pe = c.perch; K.interrupt(c); if (pe) c.q = [K.hop(() => K.groundAt(K.inView(c.x + K.rnd(-1, 1) * K.sc(c)), Math.max(0, pe.it.d - 0.2)))]; } });
  // (27/09, l'audit : pas plus de seize chats ; au-delà, l'événement fait avec ceux qui sont là)
  for (let i = L.length; i < n && Wd.cats.filter(c => !c.rare).length < 16; i++) { const k = K.addCat({ x: Wd.W * K.rnd(0.2, 0.8) }); k.y = -K.sc(k) * 1.2; k.fall = true; k.vy = 0; k.vx = 0; k.spin = Math.PI; k.stay = K.rnd(60, 120); }
  return L.length >= n;
}
const quand = (n, f) => { if (dispo(n)) setTimeout(f, 350); else setTimeout(f, 2200); };
const annonce = document.createElement('div'); annonce.className = 'evts-annonce'; annonce.setAttribute('aria-live', 'polite'); document.body.appendChild(annonce);
function dit(id) {
  annonce.textContent = L_('menu.' + id) + ' !'; annonce.classList.remove('go'); void annonce.offsetWidth; annonce.classList.add('go');
  Wd.shake = { t0: Wd.t, a: 4 };
  if (window.Scenarios && Scenarios.gerbe) Scenarios.gerbe(Wd.W / 2, (Wd.ceil || Wd.H * 0.3) + 40, 26, 360);
  // les chats lèvent la tête
  Wd.cats.forEach(c => { if (!c.rare && c.hp && Math.random() < 0.45) K.say(c, pick(['!', '?!', 'oh !'])); });
}
// (28/09, Mathieu : « ne garder que les gros événements impressionnants en bouton, le reste plus petit se déclenche aléatoirement »)
const EV = [
  // (28/09, Mathieu : « pas mal d'événements cliquables ne marchent pas ou ne sont pas impressionnants ») : du menu, chacun en grand ;
  // et s'il ne peut pas partir tout de suite (une tour déjà là, trop de chats), il se passe quand même quelque chose
  ['geant', () => Rares.lance('geant')],
  ['horde', () => { if (Chats.horde(true) === false) setTimeout(() => Chats.horde(true), 2500); }],
  ['tour', () => { if (Wd.tower) Wd.tower.w = 2; else if (Chats.tower(true) === false) setTimeout(() => { if (!Wd.tower) Chats.tower(true); }, 1500); }],
  ['aspirateur', () => Chats.aspire(true)], ['folle', () => Chats.folle()],
  // l'arc-en-ciel : une parade de Nyan Cats traverse la pièce (js/nyan.js), et des chats de la maison vomissent des arcs-en-ciel en chœur
  ['arc', () => { if (window.Nyan) Nyan.parade(); quand(2, () => { const L = libres().slice(0, 2); L.forEach((c, i) => setTimeout(() => { if (window.Arc && Wd.cats.includes(c)) Arc.vomit(c, 'menu'); }, 900 + i * 600)); }); }],
].filter(([id]) => ICON[id]);
// les petits : ils arrivent d'eux-mêmes, à tour de rôle avec les scénarios (js/chats.js, SCEN ; le colis, la mouche, le concert, la vitre y sont déjà)
// (sans annonce ni secousse : ce sont des surprises ; faux = pas possible maintenant, on passe au suivant)
const rare = id => () => { if (!window.Rares || Wd.cats.some(c => c.rare)) return false; Rares.lance(id); };
const PETITS = [rare('interminable'), rare('ballon'), rare('eclair'), rare('totem'), rare('acrobate'),
  () => { if (libres().length < 2) return false; Chats.fight(); },
  () => { const b = window.Bassin && Bassin.bassins()[0], L = libres(); if (!b || L.length < 2) return false; L.slice(0, K.rnd(2, 4) | 0).forEach(c => { K.interrupt(c); Bassin.bain(c, b); }); }];
if (K.SCEN) K.SCEN.push(...PETITS);

const nav = document.createElement('nav'); nav.className = 'evts'; nav.setAttribute('aria-label', L_('menu.titre'));
// (27/09, Mathieu : « plutôt une barre sur le côté, avec tous les boutons directement accessibles », surtout sur téléphone)
nav.innerHTML = `<ul class="evts-list">${EV.map(([id]) => `<li><button type="button" data-ev="${id}" aria-label="${L_('menu.' + id)}" title="${L_('menu.' + id)}"><svg viewBox="0 0 40 40" aria-hidden="true">${ICON[id]}</svg><span class="evts-nom">${L_('menu.' + id)}</span></button></li>`).join('')}</ul>`;
document.body.appendChild(nav);
nav.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation(); const ev = EV.find(v => v[0] === b.dataset.ev); if (!ev) return;
  Wd.grandEv = Wd.t;   // (vague 117 : les indices se taisent pendant le grand événement, js/accueil.js)
  dit(ev[0]); try { ev[1](); } catch (err) { console.warn(err); }
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
}));
// (les clics dans le menu ne tombent pas dans la scène : pas de chat qui tombe du ciel)
['pointerdown', 'click'].forEach(t => nav.addEventListener(t, e => e.stopPropagation()));
H.post.push(() => { nav.classList.toggle('vu', Wd.a > 0.6); });

return { EV, nav };
})();
