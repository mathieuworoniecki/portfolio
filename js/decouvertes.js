/* Le carnet de découvertes (27/09, Mathieu : « un utilisateur peut y passer plusieurs heures pour découvrir toutes les combinaisons possibles »).
   Chaque chose qu'on voit arriver pour la première fois (un chat qu'on n'avait jamais croisé, un chat dans le bain, la tour qui s'écroule,
   la tasse qui tombe du coffre, un chat arc-en-ciel ET mouillé…) s'inscrit dans un carnet, gardé d'une visite à l'autre (localStorage).
   Le carnet s'ouvre depuis la barre des événements (le dernier bouton, le petit livre) : ce qu'on a trouvé, et pour le reste, un indice.
   On le repère de trois façons : l'état du monde (vérifié deux fois par seconde), un mot qui s'affiche (PLOUF, RAZ-DE-MARÉE…),
   ou un appel direct des autres fichiers (Dex.vu('tasse')). */
window.Dex = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H } = K;
const EN = !window.I18N || I18N.lang !== 'fr';
const T = (fr, en) => EN ? en : fr;

/* ——— la liste : [id, titre, ce qui s'est passé, l'indice] ——— */
const RACES_EN = { boule: 'The ball', grincheux: 'Grumpy', long: 'The long one', chaton: 'The kitten', bleu: 'The blue one', miche: 'The loaf', rose: 'The greedy one',
  tigre: 'The tabby', reveur: 'The dreamer', nuage: 'The cloud', pompon: 'The pompom', gros: 'The big one', mini: 'The flea', hirsute: 'The scruffy one' };
const RARES_EN = { geant: 'The giant', interminable: 'The endless one', ballon: 'The balloon', eclair: 'The lightning', totem: 'The totem', acrobate: 'The acrobat' };
const maj = s => s.charAt(0).toUpperCase() + s.slice(1);
const TY = (window.Chat && Chat.TYPES) || {};
const FAM = [];
const fam = (id, fr, en, L) => FAM.push({ id, nom: T(fr, en), L: L.map(([k, fr1, en1, frH, enH]) => ({ id: k, t: T(fr1, en1), h: T(frH, enH) })) });
fam('races', 'Les chats', 'The cats', Object.keys(TY).filter(k => !TY[k].rare).map(k => ['race-' + k, maj(TY[k].nom), RACES_EN[k] || maj(k), 'Un chat qu’on n’a pas encore croisé. Ils vont et viennent.', 'A cat you haven’t met yet. They come and go.']));
// une fois croisé : son caractère (ses deux penchants les plus forts, js/chats.js CARAC)
const PENCHANT = { dort: ['dort beaucoup', 'sleeps a lot'], mange: ['pense à manger', 'thinks about food'], joue: ['joue tout le temps', 'plays all the time'], grimpe: ['grimpe partout', 'climbs everything'],
  carton: ['adore les cartons', 'loves boxes'], pousse: ['pousse les caisses', 'pushes boxes around'], casse: ['fait tomber les choses', 'knocks things over'], fou: ['a des coups de folie', 'gets the zoomies'],
  dispute: ['cherche la bagarre', 'picks fights'], flane: ['se promène', 'likes to stroll'] };
const caractere = k => { const C = (K.CARAC || {})[k]; if (!C) return ''; const L = Object.keys(PENCHANT).filter(p => C[p] != null).sort((a, b) => C[b] - C[a]).slice(0, 2).map(p => PENCHANT[p][EN ? 1 : 0]); return maj(L.join(EN ? ' and ' : ' et ')) + '.'; };
fam('rares', 'Les visiteurs rares', 'Rare visitors', ['geant', 'interminable', 'ballon', 'eclair', 'totem', 'acrobate'].map(k => ['rare-' + k, maj((TY[k] && TY[k].nom) || (k === 'totem' ? 'le totem' : k)), RARES_EN[k],
  'Il arrive tout seul, de temps en temps… ou quand on clique dans le vide.', 'Shows up now and then… or when you click on nothing.']));
fam('coins', 'Les coins préférés', 'Favourite spots', [
  ['titre', 'Sur le titre', 'On the title', 'Un grimpeur finit par s’asseoir sur une lettre.', 'A climber ends up sitting on a letter.'],
  ['bouton', 'Sur un bouton', 'On a button', 'Les boutons font de bons rebords.', 'Buttons make good ledges.'],
  ['carton', 'Dans le carton', 'In the box', 'If it fits, it sits.', 'If it fits, it sits.'],
  ['sommet', 'Tout en haut de l’arbre', 'Top of the tree', 'Le plus haut plateau de l’arbre à chat.', 'The highest platform of the cat tree.'],
  ['bain', 'Le bain', 'Bath time', 'Certains aiment l’eau. Pas tous.', 'Some like water. Not all.'],
  ['canape', 'Le canapé', 'The sofa', 'Un endroit moelleux, au fond.', 'A soft spot, in the back.'],
  ['etagere', 'Le parcours', 'The climbing course', 'Des étagères au mur, sur un grand écran.', 'Wall shelves, on a big screen.'],
  ['coussin', 'Le coussin', 'The cushion', 'Pour les dormeurs.', 'For the sleepers.'],
  ['panier', 'Le panier', 'The basket', 'Pour les rêveurs.', 'For the dreamers.'],
]);
fam('gestes', 'Avec la souris', 'With your hands', [
  ['caresse', 'Une caresse', 'A pet', 'Va-et-vient du curseur sur un chat.', 'Move the cursor back and forth over a cat.'],
  ['ventre', 'La gratouille', 'Belly rub', 'Une longue caresse… il se met sur le dos.', 'A long pet… he rolls over.'],
  ['piege', 'Le piège du ventre', 'The belly trap', 'Un ventre tout doux… trop tentant ?', 'A soft belly… too tempting?'],
  ['boude', 'Vexé', 'Offended', 'Il y a des choses qu’un chat ne pardonne pas tout de suite.', 'Some things a cat won’t forgive right away.'],
  ['rebelle', 'Il s’échappe', 'Escape artist', 'Tenu trop longtemps, il se débat.', 'Held too long, he wriggles free.'],
  ['plafond', 'Jusqu’au plafond', 'To the ceiling', 'Lancer un chat très, très haut.', 'Throw a cat very, very high.'],
  ['plume', 'La canne à plume', 'The feather wand', 'Elle dépasse du coffre à jouets.', 'It pokes out of the toy chest.'],
  ['envol', 'Décollage', 'Lift-off', 'Le souffleur, pointé sur un chat.', 'The leaf blower, aimed at a cat.'],
]);
fam('pepins', 'Les petits pépins', 'Little mishaps', [
  ['plouf', 'PLOUF', 'SPLASH', 'Lâcher un chat au-dessus de l’eau.', 'Drop a cat over the water.'],
  ['plumeplouf', 'Le plongeon', 'The dive', 'La plume, au-dessus de l’eau… qui va sauter ?', 'The feather, above the water… who will jump?'],
  ['emmele', 'Emmêlé', 'Tangled', 'La pelote a un long fil.', 'The ball of yarn has a long thread.'],
  ['griffes', 'Pendu par les griffes', 'Hanging by the claws', 'Rater une étagère, ou un support qui bouge.', 'Miss a shelf, or ride something that moves.'],
  ['tasse', 'La tasse', 'The mug', 'Un chat, une tasse posée sur quelque chose… vous voyez.', 'A cat, a mug on something… you know.'],
  ['couvercle', 'Le couvercle', 'The lid', 'Ouvrir le coffre quand quelque chose est posé dessus.', 'Open the chest while something sits on it.'],
  ['bascule', 'La bascule', 'The seesaw', 'Lâcher un chat sur le canapé où un autre dort.', 'Drop a cat on the sofa where another one sleeps.'],
  ['ecrase', 'Écrasé', 'Squashed', 'Quelque chose de lourd sur un carton.', 'Something heavy on a box.'],
  ['crepe', 'La crêpe', 'Pancake', 'Un gros qui tombe sur un petit…', 'A big one landing on a small one…'],
  ['bonk', 'BONK', 'BONK', 'Lancer un chat sur un autre (pardon).', 'Throw a cat at another one (sorry).'],
  ['lettre', 'Une lettre tombe', 'A letter falls', 'Le titre n’est pas si solide.', 'The title isn’t that solid.'],
  ['coincee', 'La trappe coince', 'The hatch jams', 'Tirer le levier encore et encore.', 'Pull the lever again and again.'],
  ['pop', 'POP', 'POP', 'Un ballon et quelque chose de pointu… ou de lancé.', 'A balloon and something thrown at it.'],
  ['patatras', 'PATATRAS', 'CRASH', 'Faire tomber la pile de chatons.', 'Knock over the stack of kittens.'],
]);
fam('eau', 'L’eau et les couleurs', 'Water and colours', [
  ['mouille', 'Tout mouillé', 'Soaking wet', 'Il sort du bain, il s’ébroue.', 'Out of the bath, he shakes.'],
  ['seche', 'Le séchage', 'Blow-dry', 'Le souffleur sur un chat mouillé.', 'The blower on a wet cat.'],
  ['leche', 'Un ami le sèche', 'A friend dries him', 'Les amis prennent soin des mouillés.', 'Friends take care of wet cats.'],
  ['arc', 'Un chat arc-en-ciel', 'A rainbow cat', 'Une flaque qui brille, quelqu’un marche dedans.', 'A shiny puddle, someone steps in it.'],
  ['arcmouille', 'Arc-en-ciel et mouillé', 'Rainbow and wet', 'Les deux à la fois.', 'Both at once.'],
  ['bassinarc', 'Le bassin arc-en-ciel', 'Rainbow pool', 'Ce qui tombe dans l’eau peut la colorer.', 'What falls in the water can colour it.'],
  ['raz', 'Raz-de-marée', 'Tidal wave', 'Le géant roule… et le bain est plein.', 'The giant rolls… while the bath is full.'],
]);
fam('evts', 'Les événements', 'Events', [
  ['tour', 'La tour de cartons', 'The box tower', 'Des chats qui empilent.', 'Cats stacking things.'],
  ['tourchute', 'La tour s’écroule', 'The tower falls', 'Trop de chats en haut.', 'Too many cats on top.'],
  ['horde', 'La horde', 'The horde', 'Ils courent tous dans le même sens.', 'They all run the same way.'],
  ['aspirateur', 'L’aspirateur', 'The vacuum', 'Quand il y a trop de désordre.', 'When there’s too much mess.'],
  ['passager', 'Le passager', 'The passenger', 'Certains chats aiment l’aspirateur.', 'Some cats love the vacuum.'],
  ['folle', 'Le distributeur fou', 'The crazy feeder', 'Trop de coups sur le distributeur.', 'Too many hits on the feeder.'],
  ['mouche', 'La mouche', 'The fly', 'Bzz.', 'Bzz.'],
  ['slurp', 'Slurp', 'Slurp', 'La mouche et l’aspirateur.', 'The fly and the vacuum.'],
  ['concert', 'Le concert', 'The concert', 'Trois chats qui chantent ensemble.', 'Three cats singing together.'],
  ['vitre', 'La vitre', 'The window', 'Un chat curieux s’approche très près.', 'A curious cat comes very close.'],
  ['bagarre', 'La bagarre', 'The fight', 'Certains ne s’aiment pas.', 'Some don’t like each other.'],
  ['surprise-chatons', 'Colis : des chatons', 'Parcel: kittens', 'Un colis tombe du ciel en parachute.', 'A parcel falls from the sky.'],
  ['surprise-pelotes', 'Colis : pluie de pelotes', 'Parcel: yarn rain', 'Un autre colis, une autre surprise.', 'Another parcel, another surprise.'],
  ['surprise-poissons', 'Colis : pluie de poissons', 'Parcel: fish rain', 'Un autre colis, une autre surprise.', 'Another parcel, another surprise.'],
  ['surprise-artifice', 'Colis : feu d’artifice', 'Parcel: fireworks', 'Un autre colis, une autre surprise.', 'Another parcel, another surprise.'],
  ['surprise-croquettes', 'Colis : fontaine de croquettes', 'Parcel: kibble fountain', 'Un autre colis, une autre surprise.', 'Another parcel, another surprise.'],
  ['surprise-visiteur', 'Colis : un visiteur rare', 'Parcel: a rare visitor', 'Un autre colis, une autre surprise.', 'Another parcel, another surprise.'],
]);
fam('moments', 'Les grands moments', 'Big moments', [
  ['dodo3', 'La grande sieste', 'The big nap', 'Trois chats endormis en même temps.', 'Three cats asleep at once.'],
  ['foule', 'La foule', 'The crowd', 'Douze chats à l’écran.', 'Twelve cats on screen.'],
  ['miam', 'Réveillé par une croquette', 'Woken by a kibble', 'Une croquette qui tombe sur un gourmand endormi.', 'A kibble landing on a sleeping glutton.'],
  ['atchoum', 'Atchoum', 'Achoo', 'La poussière, les poils…', 'Dust, fur…'],
  ['copain', 'Un copain', 'A friend', 'Des caresses, encore des caresses : il s’en souviendra.', 'Pets, more pets: he’ll remember.'],
  ['retour', 'Il est revenu', 'He came back', 'Revenir un autre jour : un copain revient te voir.', 'Come back another day: a friend comes to see you.'],
  ['rancunier', 'Un rancunier', 'Holds a grudge', 'À force de le secouer… il s’en souviendra aussi.', 'Shake him enough… he’ll remember that too.'],
  ['tousrares', 'Tous les visiteurs rares', 'Every rare visitor', 'Les six. Bonne chance.', 'All six. Good luck.'],
]);
const TOUS = FAM.flatMap(f => f.L), PAR = Object.fromEntries(TOUS.map(d => [d.id, d]));
TOUS.forEach(d => { if (d.id.startsWith('race-')) d.ok = caractere(d.id.slice(5)); });

/* ——— la mémoire ——— */
const CLE = 'pf-carnet';
let vus = {}; try { vus = JSON.parse(localStorage.getItem(CLE) || '{}') || {}; } catch (e) { vus = {}; }
const garde = () => { try { localStorage.setItem(CLE, JSON.stringify(vus)); } catch (e) {} };
const n = () => TOUS.filter(d => vus[d.id]).length;

/* ——— l'annonce : une carte qui glisse, une à la fois ——— */
const file = []; let montre = false;
const toast = document.createElement('div'); toast.className = 'dex-toast'; toast.setAttribute('role', 'status'); document.body.appendChild(toast);
function suivante() {
  if (montre || !file.length) return; montre = true; const d = file.shift();
  toast.innerHTML = `<b>${T('Découverte !', 'Discovery!')}</b> <span>${d.t}</span> <i>${n()} / ${TOUS.length}</i>`;
  toast.classList.remove('go'); void toast.offsetWidth; toast.classList.add('go');
  setTimeout(() => { montre = false; suivante(); }, 2400);
}
function vu(id) {
  const d = PAR[id]; if (!d || vus[id]) return false; vus[id] = Date.now(); garde(); file.push(d); suivante(); compte();
  if (id.startsWith('rare-') && ['geant', 'interminable', 'ballon', 'eclair', 'totem', 'acrobate'].every(k => vus['rare-' + k])) vu('tousrares');
  if (window.Scenarios && Scenarios.gerbe && Wd.a > 0.5) Scenarios.gerbe(70, Wd.H - 120, 10, 200);
  return true;
}

/* ——— les mots : ce qui s'affiche dit ce qui vient d'arriver ——— */
const MOTS = { 'PLOUF': 'plouf', 'SPLASH': 'plouf', 'RAZ-DE-MARÉE': 'raz', 'BOING-BOING': 'bascule', 'CRAC': 'ecrase', 'scrountch': 'ecrase', 'crouic': 'ecrase',
  'BONK': 'bonk', 'STRIKE': 'bonk', 'coincée !': 'coincee', 'POP !': 'pop', 'PATATRAS': 'patatras', 'MIAOUUU ♪♫': 'concert', 'slurp !': 'slurp',
  'atchoum !': 'atchoum', 'tchi !': 'atchoum', 'pff-tchoum': 'atchoum', 'frrrr': 'seche', '✨ arc-en-ciel !': 'bassinarc', 'je te sèche': 'leche' };
const lus = new WeakSet();
H.post.push(() => {
  for (let i = Wd.fx.length - 1, k = 0; i >= 0 && k < 40; i--, k++) { const f = Wd.fx[i]; if (lus.has(f)) break; lus.add(f); if (f.k === 'txt' && MOTS[f.text]) vu(MOTS[f.text]); }
});

/* ——— l'état du monde ——— */
const dort = c => /dodo|pain|couche|dort/.test((c.task && c.task.anim) || c.anim || '');
const tache = c => c.task && c.task.k;
H.post.push(() => {
  if (Wd.t < (Wd.dexT || 0) || Wd.a < 0.5) return; Wd.dexT = Wd.t + 0.5;
  let dormeurs = 0;
  for (const c of Wd.cats) {
    if (!c.hp || c.hidden && !(c.perch && c.perch.pe && c.perch.pe.inside)) continue;
    const visible = c.x > 0 && c.x < Wd.W;
    if (visible && !c.rare && TY[c.breed]) vu('race-' + c.breed);
    if (c.rare && visible) vu('rare-' + c.rare);
    const k = tache(c), pe = c.perch && c.perch.pe, it = c.perch && c.perch.it;
    if (k === 'titre') vu('titre'); if (k === 'rebord') vu('bouton'); if (k === 'etagere') vu('etagere'); if (k === 'passager') vu('passager'); if (k === 'vitre') vu('vitre');
    if (k === 'griffes' || c.accr) vu('griffes');
    if (it) { if (it.kind === 'carton') vu('carton'); if (it.kind === 'arbre' && pe && pe.lv >= 2) vu('sommet'); if (pe && pe.bain) vu('bain');
      if (it.kind === 'canape') vu('canape'); if (it.kind === 'coussin') vu('coussin'); if (it.kind === 'panier') vu('panier'); }
    if (c.pet) { vu('caresse'); if (c.pet.belly) vu('ventre'); }
    if (c.grudge > Wd.t) vu('boude'); if (c.escT && c.sulk && Wd.t - c.escT < 1) vu('rebelle'); if (c.escT && !c.sulk && Wd.t - c.escT < 1) vu('piege');
    if (c.fall && !c.held && c.vy < 0 && Wd.t - (c.relT ?? -9) < 3 && c.y < Math.min(Wd.ceil || 200, Wd.H * 0.25) && c.y > -Wd.H) vu('plafond');   // (lancé vers le haut, par la main : pas celui qui tombe du ciel)
    if (c.soufT && Wd.t - c.soufT < 1 && c.fall) vu('envol');
    if (c.tangle) vu('emmele'); if (c.fight) vu('bagarre');
    const wet = c.wet && Wd.t - c.wet < 8, arc = c.arcT > Wd.t; if (wet) vu('mouille'); if (arc) vu('arc'); if (wet && arc) vu('arcmouille');
    if (dort(c)) dormeurs++;
  }
  if (dormeurs >= 3) vu('dodo3'); if (Wd.cats.filter(c => c.hp && c.x > 0 && c.x < Wd.W).length >= 12) vu('foule');
  if (Wd.tower) { vu('tour'); if (Wd.tower.phase === 'chute') vu('tourchute'); }
  if (Wd.vac) vu('aspirateur'); if (Wd.mouche) vu('mouche');
  if (Wd.props.some(p => p.kind === 'distrib' && p.folle)) vu('folle');
  if (Wd.props.some(p => p.kind === 'bassin' && p.arcT > Wd.t)) vu('bassinarc');
  if (Wd.cats.filter(c => c.temp && /galop/.test(c.anim)).length >= 3) vu('horde');
  if (window.Jouets && Jouets.etat && Jouets.etat !== 'coffre') vu('plume');
  if (window.Vie && Vie.LETTERS) { const L = Vie.LETTERS(); if (L && L.some(l => l.st === 'fall' || l.st === 'sol')) vu('lettre'); }
});

/* ——— le carnet ——— */
const ICONE = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 7 q6 -2 12 2 q6 -4 12 -2 v25 q-6 -2 -12 2 q-6 -4 -12 -2z"/><path d="M20 9 v25"/><path d="M11 14 q4 -1 6 1 M11 19 q4 -1 6 1 M23 15 q4 -2 6 -1"/></svg>';
let btn = null, badge = null;
function compte() { if (badge) badge.textContent = n() + '/' + TOUS.length; }
const panneau = document.createElement('div'); panneau.className = 'dex'; panneau.hidden = true; panneau.setAttribute('role', 'dialog'); panneau.setAttribute('aria-modal', 'true');
panneau.setAttribute('aria-label', T('Carnet de découvertes', 'Discovery notebook')); document.body.appendChild(panneau);
function ouvre() {
  const total = TOUS.length, k = n();
  panneau.innerHTML = `<div class="dex-page"><header><h2>${T('Carnet de découvertes', 'Discovery notebook')}</h2><p>${k} / ${total}</p>
    <div class="dex-barre"><span style="width:${(k / total * 100).toFixed(1)}%"></span></div><button type="button" class="dex-x" aria-label="${T('Fermer', 'Close')}">×</button></header>
    ${FAM.map(f => `<section><h3>${f.nom} <small>${f.L.filter(d => vus[d.id]).length}/${f.L.length}</small></h3><ul>${f.L.map(d => vus[d.id]
      ? `<li class="ok"><b>${d.t}</b><span>${d.ok || d.h}</span></li>` : `<li><b>???</b><span>${d.h}</span></li>`).join('')}</ul></section>`).join('')}
    <footer><button type="button" class="dex-raz">${T('Tout oublier', 'Forget everything')}</button></footer></div>`;
  panneau.hidden = false; panneau.querySelector('.dex-x').focus();
  panneau.querySelector('.dex-x').onclick = ferme;
  const raz = panneau.querySelector('.dex-raz'); raz.onclick = () => { if (raz.dataset.sur) { vus = {}; garde(); compte(); ouvre(); } else { raz.dataset.sur = 1; raz.textContent = T('Sûr ? Cliquer encore', 'Sure? Click again'); } };
}
function ferme() { panneau.hidden = true; if (btn) btn.focus(); }
panneau.addEventListener('click', e => { if (e.target === panneau) ferme(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !panneau.hidden) ferme(); });
['pointerdown', 'click', 'wheel', 'touchstart'].forEach(t => panneau.addEventListener(t, e => e.stopPropagation(), { passive: t === 'wheel' || t === 'touchstart' }));

// le bouton : le dernier de la barre des événements (js/menu.js), avec le compte
function pose() {
  const list = document.querySelector('.evts-list'); if (!list) return false;
  const li = document.createElement('li'); li.className = 'dex-li';
  li.innerHTML = `<button type="button" class="dex-btn" aria-label="${T('Carnet de découvertes', 'Discovery notebook')}">${ICONE}<span class="evts-nom">${T('Carnet de découvertes', 'Discovery notebook')}</span><em class="dex-n"></em></button>`;
  list.appendChild(li); btn = li.querySelector('button'); badge = li.querySelector('.dex-n'); compte();
  btn.addEventListener('click', e => { e.stopPropagation(); ouvre(); });
  return true;
}
if (!pose()) addEventListener('load', pose, { once: true });

return { vu, get vus() { return vus; }, TOUS, FAM, ouvre };
})();
