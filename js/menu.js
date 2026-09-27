/* Le menu des événements (27/09, Mathieu : « sur la gauche, une sorte de menu kawaii avec des illustrations, qui nous permette de déclencher
   les événements spéciaux »).
   Un petit onglet au bord gauche (« ✦ ») ; ouvert, une colonne de pastilles dessinées au trait : les chats rares, la horde, la tour de cartons,
   l'aspirateur, le distributeur fou, la bagarre, le colis, la mouche, le concert, la vitre, l'arc-en-ciel, le bain. Au survol, leur nom.
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
  arc: '<path d="M4 32 a16 16 0 0 1 32 0" class="r1"/><path d="M8 32 a12 12 0 0 1 24 0" class="r2"/><path d="M12 32 a8 8 0 0 1 16 0" class="r3"/><path d="M16 32 a4 4 0 0 1 8 0" class="r4"/>',
  bain: '<path d="M5 24 h30 q0 10 -15 10 q-15 0 -15 -10z"/>' + tete(20, 20, 7) + yeux(20, 20, 3) + '<circle cx="9" cy="14" r="2"/><circle cx="31" cy="11" r="2.5"/><circle cx="28" cy="5" r="1.5"/>',
};
const libres = () => Wd.cats.filter(c => K.free4(c) && !c.temp && !c.rare);
const EV = [
  ['geant', () => Rares.lance('geant')], ['interminable', () => Rares.lance('interminable')], ['ballon', () => Rares.lance('ballon')],
  ['eclair', () => Rares.lance('eclair')], ['totem', () => Rares.lance('totem')], ['acrobate', () => Rares.lance('acrobate')],
  ['horde', () => Chats.horde()], ['tour', () => Chats.tower()], ['aspirateur', () => Chats.aspire()], ['folle', () => Chats.folle()],
  ['bagarre', () => Chats.fight()], ['colis', () => Scenarios.colis()], ['mouche', () => Scenarios.mouche()], ['concert', () => Scenarios.concert()], ['vitre', () => Scenarios.vitre()],
  ['arc', () => { const c = pick(libres()); if (c && window.Arc) Arc.vomit(c, 'menu'); }],
  ['bain', () => { const b = window.Bassin && Bassin.bassins()[0]; if (!b) return; libres().slice(0, 3).forEach(c => { K.interrupt(c); Bassin.bain(c, b); }); }],
].filter(([id]) => ICON[id]);

const nav = document.createElement('nav'); nav.className = 'evts'; nav.setAttribute('aria-label', L_('menu.titre'));
nav.innerHTML = `<button class="evts-tab" type="button" aria-expanded="false" title="${L_('menu.titre')}"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 l4 11 l12 1 l-9 8 l3 12 l-10 -7 l-10 7 l3 -12 l-9 -8 l12 -1z"/></svg><span>${L_('menu.titre')}</span></button>
<ul class="evts-list">${EV.map(([id]) => `<li><button type="button" data-ev="${id}" aria-label="${L_('menu.' + id)}"><svg viewBox="0 0 40 40" aria-hidden="true">${ICON[id]}</svg><span class="evts-nom">${L_('menu.' + id)}</span></button></li>`).join('')}</ul>`;
document.body.appendChild(nav);
const tab = nav.querySelector('.evts-tab');
tab.addEventListener('click', () => { const o = !nav.classList.contains('ouvert'); nav.classList.toggle('ouvert', o); tab.setAttribute('aria-expanded', o); });
nav.querySelectorAll('[data-ev]').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation(); const ev = EV.find(v => v[0] === b.dataset.ev); if (!ev) return;
  try { ev[1](); } catch (err) { console.warn(err); }
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  if (matchMedia('(max-width: 700px)').matches) { nav.classList.remove('ouvert'); tab.setAttribute('aria-expanded', false); }
}));
// (les clics dans le menu ne tombent pas dans la scène : pas de chat qui tombe du ciel)
['pointerdown', 'click'].forEach(t => nav.addEventListener(t, e => e.stopPropagation()));
H.post.push(() => { nav.classList.toggle('vu', Wd.a > 0.6); });

return { EV, nav };
})();
