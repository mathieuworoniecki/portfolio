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
  ['table', 'Sur la table', 'On the table', 'Il n’a pas le droit… il le sait.', 'Not allowed… and he knows it.'],
  ['soustable', 'Sous la table', 'Under the table', 'La meilleure cachette est juste là.', 'The best hiding spot is right there.'],
  ['lit', 'Le grand lit', 'The big bed', 'Le lit n’est pas que pour les humains.', 'The bed is not just for humans.'],
  ['biblio', 'La bibliothèque', 'The bookcase', 'Des rayons, des livres… et des trous.', 'Shelves, books… and gaps.'],
  ['livre', 'Un livre tombe', 'A book falls', 'Tout en haut de la bibliothèque, une patte curieuse.', 'At the top of the bookcase, a curious paw.'],
  ['etage', 'La mezzanine', 'The loft', 'Une échelle, et une vue d’en haut.', 'A ladder, and a view from above.'],
]);
fam('gestes', 'Avec la souris', 'With your hands', [
  ['caresse', 'Une caresse', 'A pet', 'Va-et-vient du curseur sur un chat.', 'Move the cursor back and forth over a cat.'],
  ['ventre', 'La gratouille', 'Belly rub', 'Une longue caresse… il se met sur le dos.', 'A long pet… he rolls over.'],
  ['piege', 'Le piège du ventre', 'The belly trap', 'Un ventre tout doux… trop tentant ?', 'A soft belly… too tempting?'],
  ['boude', 'Vexé', 'Offended', 'Il y a des choses qu’un chat ne pardonne pas tout de suite.', 'Some things a cat won’t forgive right away.'],
  ['rebelle', 'Il s’échappe', 'Escape artist', 'Tenu trop longtemps, il se débat.', 'Held too long, he wriggles free.'],
  ['plafond', 'Jusqu’au plafond', 'To the ceiling', 'Lancer un chat très, très haut.', 'Throw a cat very, very high.'],
  ['plume', 'La canne à plume', 'The feather wand', 'Elle dépasse du coffre à jouets.', 'It pokes out of the toy chest.'],
  ['molette', 'La gratouille à la molette', 'Scroll-wheel scratch', 'La molette, sur un chat.', 'The scroll wheel, on a cat.'],
  ['manivelle', 'La manivelle', 'The crank', 'La molette, sur le distributeur.', 'The scroll wheel, on the dispenser.'],
  ['vagues', 'Les vagues', 'Waves', 'La molette, sur l’eau.', 'The scroll wheel, on the water.'],
  ['psst', 'Psst psst', 'Psst psst', 'Appuyer longtemps dans le vide, sans bouger.', 'Press and hold on empty space, without moving.'],
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
// (27/09) une manie par race (js/races.js)
const MANIES = { boule: ['La boule roule', 'Rolling ball', 'Ronde comme elle est…'], grincheux: ['Le regard noir', 'The glare', 'Il te surveille, de loin.'],
  long: ['L’étirement sans fin', 'The endless stretch', 'Quand le long s’étire…'], chaton: ['Sa propre queue', 'His own tail', 'Le chaton a trouvé un jouet : lui-même.'],
  bleu: ['D’un seul bond', 'In one leap', 'Le bleu et l’arbre : il ne rate jamais.'], miche: ['Le pain', 'The loaf', 'La miche fait… la miche.'],
  rose: ['Le câlin', 'The cuddle', 'La rose aime ses amis.'], tigre: ['Le chasseur', 'The hunter', 'Bouge la souris devant le tigre.'],
  reveur: ['Le somnambule', 'The sleepwalker', 'Le rêveur ne se réveille pas toujours.'], nuage: ['Dormir debout', 'Asleep standing', 'Le nuage peut dormir n’importe où.'],
  pompon: ['Boing boing', 'Boing boing', 'Le pompon a des ressorts.'], gros: ['Le ventre offert', 'Belly up', 'Le gros veut quelque chose…'],
  mini: ['Dans la gamelle', 'In the bowl', 'Le mini tient partout.'], hirsute: ['La coiffure', 'The hairdo', 'L’hirsute se secoue.'] };
fam('manies', 'Les manies', 'Quirks', Object.keys(MANIES).filter(k => TY[k]).map(k => ['manie-' + k, MANIES[k][0], MANIES[k][1], MANIES[k][2], 'Every breed has its own quirk.']));
fam('faim', 'La faim', 'Hunger', [
  ['gamellevide', 'Plus rien !', 'All gone!', 'Une gamelle, ça se vide.', 'A bowl runs out.'],
  ['remplie', 'À table', 'Dinner is served', 'Et si le distributeur visait la gamelle ?', 'What if the dispenser aimed at the bowl?'],
  ['fauxpoisson', 'Du faux', 'Fake fish', 'Un chat affamé, un poisson en tissu…', 'A hungry cat, a cloth fish…'],
  ['vol', 'Le voleur', 'The thief', 'Des croquettes, deux chats, un seul est rapide.', 'Kibble, two cats, only one is quick.'],
  ['suiveurs', 'Le cortège', 'The parade', 'Promener la gamelle pleine devant les gourmands.', 'Walk the full bowl past the greedy ones.'],
]);
fam('eau', 'L’eau et les couleurs', 'Water and colours', [
  ['mouille', 'Tout mouillé', 'Soaking wet', 'Il sort du bain, il s’ébroue.', 'Out of the bath, he shakes.'],
  ['seche', 'Le séchage', 'Blow-dry', 'Le souffleur sur un chat mouillé.', 'The blower on a wet cat.'],
  ['leche', 'Un ami le sèche', 'A friend dries him', 'Les amis prennent soin des mouillés.', 'Friends take care of wet cats.'],
  ['arc', 'Un chat arc-en-ciel', 'A rainbow cat', 'Une flaque qui brille, quelqu’un marche dedans.', 'A shiny puddle, someone steps in it.'],
  ['arcmouille', 'Arc-en-ciel et mouillé', 'Rainbow and wet', 'Les deux à la fois.', 'Both at once.'],
  ['bassinarc', 'Le bassin arc-en-ciel', 'Rainbow pool', 'Ce qui tombe dans l’eau peut la colorer.', 'What falls in the water can colour it.'],
  ['fontarc', 'La fontaine qui brille', 'Sparkling fountain', 'Un petit besoin… tout près de la fontaine.', 'A little accident… right by the fountain.'],
  ['bainarc', 'Bain de couleurs', 'Colour bath', 'Plonger dans une eau qui brille.', 'Dive into shiny water.'],
  ['bulles', 'Ça pétille', 'Fizzy', 'Boire à une fontaine arc-en-ciel.', 'Drink from a rainbow fountain.'],
  ['peche', 'La pêche', 'Gone fishing', 'Une croquette qui flotte… une patte patiente.', 'A floating kibble… a patient paw.'],
  ['lettreplouf', 'Une lettre à l’eau', 'Letter overboard', 'Le titre tombe, le bassin est juste en dessous.', 'The title falls, the pool is right below.'],
  ['pechelettre', 'Repêcher une lettre', 'Fish out a letter', 'Laisser flotter une lettre, et attendre.', 'Let a letter float, and wait.'],
  ['litmouille', 'Le lit mouillé', 'Soggy bed', 'Un chat trempé cherche où dormir.', 'A soaked cat looks for a bed.'],
  ['cartonmou', 'Carton mou', 'Soggy box', 'Le carton et l’eau ne sont pas amis.', 'Cardboard and water are not friends.'],
  ['regonfle', 'Pouf !', 'Poof!', 'Un poilu mouillé est tout plat… et une fois sec ?', 'A wet fluffy cat is all flat… and once dry?'],
  ['vacarc', 'L’aspirateur arc-en-ciel', 'Rainbow vacuum', 'Le grand aspirateur, et une flaque qui brille.', 'The big vacuum, and a shiny puddle.'],
  ['tourplouf', 'Plouf général', 'Everybody in!', 'La tour de caisses, tout près du bassin…', 'The crate tower, right next to the pool…'],
  ['raz', 'Raz-de-marée', 'Tidal wave', 'Le géant roule… et le bain est plein.', 'The giant rolls… while the bath is full.'],
]);
fam('evts', 'Les événements', 'Events', [
  ['tour', 'La tour de cartons', 'The box tower', 'Des chats qui empilent.', 'Cats stacking things.'],
  ['tourchute', 'La tour s’écroule', 'The tower falls', 'Trop de chats en haut.', 'Too many cats on top.'],
  ['horde', 'La horde', 'The horde', 'Ils courent tous dans le même sens.', 'They all run the same way.'],
  ['souris-geante', 'Le retour de bâton', 'Payback', 'La grande horde revient… poursuivie.', 'The big horde comes back… chased.'],
  ['miaou-geant', 'Le grand miaou', 'The giant meow', 'Le géant s’arrête au milieu de la pièce… et miaule. Tout s’envole.', 'The giant stops mid-room… and meows. Everything flies.'],
  ['toboggan', 'Le toboggan arc-en-ciel', 'The rainbow slide', 'Grimper sur l’arche des Nyan Cats, et redescendre en glissant.', 'Climb the Nyan Cats’ arch, and slide back down.'],
  ['dormeur', 'Le dormeur du trou', 'The sleeper in the hole', 'Au retour du mode sérieux, un dernier trou s’ouvre…', 'Back from serious mode, one last hole opens…'],
  ['surprise', 'Le chat dans la caisse', 'The cat in the box', 'Quand la grande tour s’écroule, une caisse s’ouvre : quelqu’un était dedans.', 'When the big tower falls, a box bursts open: someone was inside.'],
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
  ['rareespace', 'Visiteur en apesanteur', 'Weightless visitor', 'Un visiteur rare est là… et on entre dans l’univers.', 'A rare visitor is here… and you enter the universe.'],
  ['geantespace', 'Le géant dans l’espace', 'Giant in space', 'Le chat géant, le trou noir, et après ?', 'The giant cat, the black hole, and then?'],
]);
// l'espace, l'écran 2 (28/09, Mathieu : « des hauts faits sur l'espace, et des spécifiques »)
fam('espace', 'L’espace', 'Space', [
  ['decollage', 'Le décollage', 'Lift-off', 'Entrer dans l’univers, par le trou noir.', 'Enter the universe, through the black hole.'],
  ['troublanc', 'Le petit trou blanc', 'The little white hole', 'Là-haut aussi, un clic dans le vide.', 'Up there too, a click on empty space.'],
  ['agrippe', 'Accroché', 'Hanging on', 'Le curseur, tout près d’un chat qui flotte.', 'The cursor, close to a floating cat.'],
  ['fronde', 'La fronde', 'The slingshot', 'Trop près d’une planète, on fait un tour… et on repart plus vite.', 'Too close to a planet, you go around… and leave faster.'],
  ['petitprince', 'Le Petit Prince', 'The Little Prince', 'Un chat qui se pose sur sa planète.', 'A cat landing on its planet.'],
  ['astronaute', 'L’astronaute', 'The astronaut', 'Quelque chose flotte, un chat le veut.', 'Something floats by, a cat wants it.'],
  ['nyanespace', 'Nyan dans les étoiles', 'Nyan among the stars', 'Un arc-en-ciel qui traverse l’espace.', 'A rainbow crossing space.'],
  ['cinema', 'La séance', 'Showtime', 'Assis sur la Terre, le nez vers les étoiles.', 'Sitting on the Earth, nose up to the stars.'],
  ['croquette-espace', 'Croquette de l’espace', 'Space snack', 'Les croquettes aussi passent par le trou noir. Un chat en attrape une au vol.', 'The kibbles go through the black hole too. A cat snaps one mid-float.'],
  ['train', 'Le petit train', 'The little train', 'Pendant la séance, les chats nagent à la queue leu leu au ras de la Terre.', 'During the show, the cats swim nose-to-tail just above the Earth.'],
  ['competences', 'Toutes les compétences IA', 'Every AI skill', 'La présentation des étoiles, jusqu’au bout.', 'The star show, to the end.'],
  ['retourplanete', 'Retour par la planète', 'Home through the planet', 'La planète des chats ramène à la maison.', 'The cat planet takes you home.'],
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
  toast.classList.remove('go', 'plie'); toast.style.visibility = ''; void toast.offsetWidth; toast.classList.add('go');
  // (vague 10, l'audit : « le carnet ») : la carte ne s'efface plus. Le mot s'écrit à la main ; puis elle se plie en avion de papier
  // qui file en looping jusqu'au bouton du carnet ; le bouton l'avale et rebondit
  setTimeout(() => { toast.classList.add('plie'); setTimeout(() => { avion(); toast.style.visibility = 'hidden'; toast.classList.remove('go', 'plie'); montre = false; setTimeout(suivante, 250); }, 260); }, 2000);
}
const AVION = '<svg viewBox="0 0 40 28" aria-hidden="true"><path d="M2 14 L38 2 L22 26 L17 17 Z M17 17 L38 2"/></svg>';
function avion() {
  const r0 = toast.getBoundingClientRect(), r1 = btn && btn.getBoundingClientRect(); if (!r0.width || !r1 || !r1.width || r1.right < 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = document.createElement('i'); a.className = 'dex-avion'; a.innerHTML = AVION; document.body.appendChild(a);
  const x0 = r0.left + r0.width / 2, y0 = r0.top + r0.height / 2, x1 = r1.left + r1.width / 2, y1 = r1.top + r1.height / 2, D = 1100, t0 = performance.now();
  // un looping au milieu du trajet : le chemin est une courbe, plus un cercle qui s'ouvre et se referme
  const R = Math.min(60, Math.hypot(x1 - x0, y1 - y0) * 0.3 + 30); let px = x0, py = y0;
  const pas = now => { const u = Math.min(1, (now - t0) / D), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, b = 1 - e;
    const cx = (x0 + x1) / 2 + 40, cy = Math.min(y0, y1) - 90, l = Math.max(0, Math.min(1, (u - 0.3) / 0.4)), ang = l * Math.PI * 2;
    const x = b * b * x0 + 2 * b * e * cx + e * e * x1 + (l > 0 && l < 1 ? Math.sin(ang) * R : 0), y = b * b * y0 + 2 * b * e * cy + e * e * y1 + (l > 0 && l < 1 ? (1 - Math.cos(ang)) * -R : 0);
    const dir = Math.atan2(y - py, x - px); px = x; py = y;
    a.style.transform = `translate(${x}px,${y}px) rotate(${dir}rad) scale(${1 - 0.4 * e})`;
    if (u < 1) requestAnimationFrame(pas);
    else { a.remove(); btn.classList.remove('hf-avale'); void btn.offsetWidth; btn.classList.add('hf-avale'); setTimeout(() => btn.classList.remove('hf-avale'), 700); } };
  requestAnimationFrame(pas);
}
function vu(id) {
  const d = PAR[id]; if (!d || vus[id]) return false; vus[id] = Date.now(); garde(); file.push(d); suivante(); compte();
  try { dispatchEvent(new CustomEvent('dex', { detail: id })); } catch (e) {}   // (les hauts faits écoutent : js/hautsfaits.js)
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
// (un tampon penché au hasard, mais toujours le même pour une découverte donnée)
const bruitD = id => { let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973; return h / 9973; };
function ouvre() {
  const total = TOUS.length, k = n();
  panneau.innerHTML = `<div class="dex-page"><header><h2>${T('Carnet de découvertes', 'Discovery notebook')}</h2><p>${k} / ${total}</p>
    <div class="dex-barre"><span style="width:${(k / total * 100).toFixed(1)}%"></span></div><button type="button" class="dex-x" aria-label="${T('Fermer', 'Close')}">×</button></header>
    ${(() => { let i = 0; return FAM.map(f => `<section><h3>${f.nom} <small>${f.L.filter(d => vus[d.id]).length}/${f.L.length}</small></h3><ul>${f.L.map(d => { const st = `--i:${Math.min(40, i++)};--r:${((bruitD(d.id) - 0.5) * 16).toFixed(1)}deg`; return vus[d.id]
      ? `<li class="ok" style="${st}"><b>${d.t}</b><span>${d.ok || d.h}</span></li>` : `<li style="${st}"><b>???</b><span>${d.h}</span></li>`; }).join('')}</ul></section>`).join(''); })()}
    <footer><button type="button" class="dex-raz">${T('Tout oublier', 'Forget everything')}</button></footer></div>`;
  panneau.hidden = false; panneau.querySelector('.dex-x').focus();
  panneau.querySelector('.dex-x').onclick = ferme; guetteur();
  const raz = panneau.querySelector('.dex-raz'); raz.onclick = () => { if (raz.dataset.sur) { vus = {}; garde(); compte(); ouvre(); } else { raz.dataset.sur = 1; raz.textContent = T('Sûr ? Cliquer encore', 'Sure? Click again'); } };
}
function ferme() { panneau.hidden = true; cancelAnimationFrame(G.raf); if (btn) btn.focus(); }
/* (vague 7, l'audit : « le carnet est un panneau, pas un moment ») : un chat passe la tête par-dessus le bord du carnet, les pattes posées sur la tranche.
   Il suit le pointeur le long du bord, ses yeux aussi ; il cligne ; sur une découverte faite, il dresse les oreilles, sur une case « ??? », il penche la tête. */
const G = { raf: 0, x: 0, tx: 0, ex: 0, ey: 0, mode: '' };
function guetteur() {
  const pg = panneau.querySelector('.dex-page'); if (!pg) return;
  const el = document.createElement('div'); el.className = 'dex-chat'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg viewBox="0 0 120 64"><g class="dc-tete"><path d="M18 64 C16 44 20 30 28 24 L24 3 L44 17 C52 14 68 14 76 17 L96 3 L92 24 C100 30 104 44 102 64"/>
    <path class="dc-in" d="M30 20 L28 9 L39 17 M90 20 L92 9 L81 17"/><g class="dc-yeux"><ellipse cx="45" cy="42" rx="7" ry="9.5"/><ellipse cx="75" cy="42" rx="7" ry="9.5"/>
    <circle class="dc-ref" cx="42.5" cy="38" r="2.6"/><circle class="dc-ref" cx="72.5" cy="38" r="2.6"/><circle class="dc-ref" cx="47.5" cy="46" r="1.2"/><circle class="dc-ref" cx="77.5" cy="46" r="1.2"/></g>
    <path class="dc-nez" d="M57 53 Q60 51 63 53 Q61 56 60 56 Q59 56 57 53 M60 56 Q57 60 54 58 M60 56 Q63 60 66 58"/></g>
    <path class="dc-patte" d="M22 64 C22 55 36 55 36 64 M84 64 C84 55 98 55 98 64 M27 61 v3 M31 61 v3 M89 61 v3 M93 61 v3"/></svg>`;
  panneau.appendChild(el);
  const place = () => { const r = pg.getBoundingClientRect(); G.l = r.left + 70; G.r = r.right - 70; G.top = r.top; if (!G.x) G.x = G.tx = r.left + r.width * 0.3; };
  place(); G.mode = '';
  panneau.onpointermove = e => { G.tx = e.clientX; G.px = e.clientX; G.py = e.clientY; const li = e.target.closest && e.target.closest('.dex-page li'); G.mode = li ? (li.classList.contains('ok') ? 'ok' : 'q') : ''; };
  cancelAnimationFrame(G.raf);
  const pas = () => { if (panneau.hidden || !el.isConnected) return; place();
    G.x += (Math.min(G.r, Math.max(G.l, G.tx)) - G.x) * 0.06; const dx = (G.px ?? G.x) - G.x, dy = (G.py ?? G.top + 200) - (G.top - 20), d = Math.hypot(dx, dy) || 1;
    G.ex += (dx / d * 3.2 - G.ex) * 0.2; G.ey += (dy / d * 3.2 - G.ey) * 0.2;
    el.style.transform = `translate(${G.x - 75}px, ${G.top - 78}px)`; el.dataset.mode = G.mode;
    el.querySelector('.dc-yeux').setAttribute('transform', `translate(${G.ex.toFixed(2)} ${G.ey.toFixed(2)})`);
    G.raf = requestAnimationFrame(pas); };
  G.raf = requestAnimationFrame(pas);
}
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
