/* Les hauts faits (27/09, Mathieu : « un système de hauts faits avec des badges à gagner, des badges plus durs que d'autres à avoir,
   avec à chaque fois un petit indice ; une big animation quand on en débloque un, avec le badge et le nom du haut fait ;
   et on peut voir la liste de ceux obtenus, restants ou cachés en cliquant sur une icône du menu »).
   - Quatre rangs : facile (bronze), moyen (argent), difficile (or), secret (caché : ni nom ni badge avant de l'avoir, juste un indice sibyllin).
   - Ils se gagnent avec le carnet de découvertes (js/decouvertes.js, l'événement « dex ») et quelques compteurs gardés dans le navigateur
     (caresses, lancers, visites, minutes passées avec les chats) : localStorage « pf-hauts ».
   - Débloqué : le badge arrive au centre de l'écran, tourne, rebondit, des rayons derrière lui, des confettis ; son nom, son rang.
   - Le trophée dans la barre de gauche ouvre la vitrine : obtenus en couleur, restants en gris avec leur indice, secrets en « ? ». */
window.HF = (() => {
if (!window.Chats || !Chats.K || !window.Dex || !window.Badges) return null;
const K = Chats.K, { Wd, H } = K;
const EN = () => window.I18N && I18N.lang && I18N.lang !== 'fr';
const T = (fr, en) => EN() ? en : fr;
const TY = (window.Chat && Chat.TYPES) || {};
const RACES = Object.keys(TY).filter(k => !TY[k].rare);
const MANIES = RACES.filter(k => Dex.TOUS.some(d => d.id === 'manie-' + k));
const EVTS = (Dex.FAM.find(f => f.id === 'evts') || { L: [] }).L.map(d => d.id);
const ESP = (Dex.FAM.find(f => f.id === 'espace') || { L: [] }).L.map(d => d.id);

/* ——— la mémoire ——— */
const CLE = 'pf-hauts';
let M = {}; try { M = JSON.parse(localStorage.getItem(CLE) || '{}') || {}; } catch (e) { M = {}; }
M.got = M.got || {}; M.n = M.n || {};
const N = M.n; ['caresses', 'lancers', 'visites', 'minutes'].forEach(k => { N[k] = N[k] || 0; });
N.visites++;
let sale = true; const garde = () => { sale = true; };
setInterval(() => { if (!sale) return; sale = false; try { localStorage.setItem(CLE, JSON.stringify(M)); } catch (e) {} }, 2000);
addEventListener('pagehide', () => { try { localStorage.setItem(CLE, JSON.stringify(M)); } catch (e) {} });

/* ——— la liste ———
   [id, rang, glyphe, nom fr, nom en, indice fr, indice en, condition] */
const v = id => !!Dex.vus[id], nv = L => L.filter(v).length, pct = () => nv(Dex.TOUS.map(d => d.id)) / Dex.TOUS.length;
const LISTE = [
  ['bonjour', 'bronze', '♥', 'Bonjour minou', 'Hello kitty', 'Passe la souris sur un chat, doucement.', 'Hover a cat, gently.', () => v('caresse')],
  ['lanceur', 'bronze', '➶', 'Lanceur du dimanche', 'Sunday thrower', 'Attrape un chat, tire, lâche. Cinq fois.', 'Grab a cat, pull, let go. Five times.', () => N.lancers >= 5],
  ['plouf', 'bronze', '≈', 'Premier plongeon', 'First dive', 'Au-dessus de l’eau, on lâche tout.', 'Above the water, let go.', () => v('plouf')],
  ['curieux', 'bronze', '✎', 'Curieux', 'Curious', 'Dix découvertes dans le carnet.', 'Ten discoveries in the notebook.', () => nv(Dex.TOUS.map(d => d.id)) >= 10],
  ['service', 'bronze', '◡', 'Service en salle', 'Room service', 'Une gamelle vide ? Elle se remplit sous le bec du distributeur.', 'An empty bowl? It fills up under the dispenser.', () => v('remplie')],
  ['colis', 'bronze', '▣', 'Livraison spéciale', 'Special delivery', 'Un colis tombe parfois. Il s’ouvre tout seul.', 'A parcel sometimes drops. It opens by itself.', () => Dex.TOUS.some(d => d.id.startsWith('surprise-') && v(d.id))],
  ['bande', 'bronze', '✿', 'La bande', 'The gang', 'Croiser sept chats différents.', 'Meet seven different cats.', () => nv(RACES.map(k => 'race-' + k)) >= 7],

  ['ami', 'argent', '♡', 'Un ami pour la vie', 'Friend for life', 'Beaucoup de caresses, toujours au même chat.', 'Lots of pets, always the same cat.', () => v('copain')],
  ['chatlogue', 'argent', '❖', 'Le chat-logue', 'The cat-alogue', 'Tous les chats, sans exception.', 'Every cat, no exception.', () => RACES.length && nv(RACES.map(k => 'race-' + k)) >= RACES.length],
  ['aquaphile', 'argent', '〰', 'Aquaphile', 'Water lover', 'Plouf, plongeon, pêche, bain de couleurs.', 'Splash, dive, fishing, colour bath.', () => ['plouf', 'plumeplouf', 'peche', 'bainarc'].every(v)],
  ['arc', 'argent', '☂', 'Double arc-en-ciel', 'Double rainbow', 'Les couleurs aiment l’eau : le bassin, la fontaine, un chat mouillé.', 'Colours love water: the pool, the fountain, a wet cat.', () => ['arcmouille', 'bassinarc', 'fontarc'].every(v)],
  ['boutons', 'argent', '☰', 'Tous les boutons', 'Every button', 'Chaque bouton du menu de gauche, au moins une fois.', 'Every button of the left menu, at least once.', () => EVTS.length && EVTS.every(v)],
  ['observateur', 'argent', '◉', 'Observateur', 'Watcher', 'Sept manies de chats.', 'Seven cat quirks.', () => nv(MANIES.map(k => 'manie-' + k)) >= 7],
  ['masseur', 'argent', '∞', 'Masseur', 'Masseur', 'Une caresse. Et encore une. Cent fois.', 'One pet. And another. A hundred times.', () => N.caresses >= 100],
  ['cheznous', 'argent', '⌂', 'Comme chez soi', 'Home sweet home', 'La table, le lit, la bibliothèque, la mezzanine : partout un chat.', 'Table, bed, bookcase, loft: a cat everywhere.', () => ['table', 'lit', 'biblio', 'etage'].every(v)],
  ['fidele', 'argent', '↻', 'Fidèle', 'Loyal', 'Revenir voir les chats, encore et encore.', 'Come back to see the cats, again and again.', () => N.visites >= 3],

  ['raretes', 'or', '✦', 'Chasseur de raretés', 'Rarity hunter', 'Six visiteurs très rares. Un clic dans le vide, parfois…', 'Six very rare visitors. A click on empty space, sometimes…', () => v('tousrares')],
  ['moitie', 'or', '◐', 'À mi-chemin', 'Halfway', 'La moitié du carnet de découvertes.', 'Half the discovery notebook.', () => pct() >= 0.5],
  ['carnet', 'or', '★', 'Carnet complet', 'Full notebook', 'Absolument tout le carnet.', 'The whole notebook. All of it.', () => pct() >= 1],
  ['ethologue', 'or', '❀', 'Éthologue', 'Ethologist', 'Toutes les manies, de tous les chats.', 'Every quirk of every cat.', () => MANIES.length && nv(MANIES.map(k => 'manie-' + k)) >= MANIES.length],
  ['heure', 'or', '⧗', 'Une heure avec eux', 'An hour with them', 'Le temps passe vite ici. Une heure en tout.', 'Time flies here. One hour in total.', () => N.minutes >= 60],
  ['cosmique', 'or', '◎', 'Géant cosmique', 'Cosmic giant', 'Le plus gros des chats n’a jamais vu les étoiles.', 'The biggest cat has never seen the stars.', () => v('geantespace')],
  ['apesanteur', 'argent', '○', 'Passager clandestin', 'Stowaway', 'Un visiteur de passage, emporté plus loin que prévu.', 'A passing visitor, taken further than planned.', () => v('rareespace')],
  // l'espace (28/09, Mathieu : « des hauts faits sur l'espace, et en créer des spécifiques »)
  ['decollage', 'bronze', '◌', 'Décollage', 'Lift-off', 'Un trou noir s’ouvre quand on entre.', 'A black hole opens when you enter.', () => v('decollage')],
  ['troublanc', 'bronze', '∘', 'Fontaine à chats', 'Cat fountain', 'Là-haut aussi, un clic dans le vide…', 'Up there too, a click on empty space…', () => v('troublanc')],
  ['astronaute', 'argent', '◍', 'Un petit pas pour un chat', 'One small step for a cat', 'Parfois, quelque chose flotte. Un chat le veut.', 'Sometimes something floats by. A cat wants it.', () => v('astronaute')],
  ['fronde', 'argent', '↺', 'Fronde gravitationnelle', 'Gravity slingshot', 'Trop près d’une planète, on fait un tour.', 'Too close to a planet, you go around.', () => v('fronde')],
  ['petitprince', 'argent', '♁', 'Le Petit Prince', 'The Little Prince', 'Certains restent un moment sur leur planète.', 'Some stay a while on their planet.', () => v('petitprince')],
  ['recruteur', 'or', '✧', 'Recruteur curieux', 'Curious recruiter', 'Toute la présentation, jusqu’à la dernière étoile.', 'The whole show, to the last star.', () => v('competences')],
  ['astronome', 'or', '⊛', 'Astronome', 'Astronomer', 'Tout ce qui peut arriver dans l’espace.', 'Everything that can happen in space.', () => ESP.length && ESP.every(v)],
  ['foule', 'or', '☷', 'La grande foule', 'The big crowd', 'Douze chats à l’écran en même temps.', 'Twelve cats on screen at once.', () => v('foule')],
  ['chaine', 'or', 'ϟ', 'Réaction en chaîne', 'Chain reaction', 'Une tour de caisses, de l’eau juste à côté, et des chats dessus.', 'A crate tower, water right next to it, and cats on top.', () => v('tourplouf')],

  ['crepe', 'secret', '◒', 'La crêpe', 'Pancake', 'Question de poids.', 'A matter of weight.', () => v('crepe')],
  ['rancune', 'secret', '☁', 'Rancune tenace', 'Holding a grudge', 'Les chats n’oublient rien.', 'Cats forget nothing.', () => v('rancunier')],
  ['voleur', 'secret', '⚲', 'Main dans le sac', 'Caught red-pawed', 'Pas vu, pas pris.', 'Not seen, not caught.', () => v('vol')],
  ['somnambule', 'secret', 'z', 'Somnambule', 'Sleepwalker', 'Il marche… les yeux fermés ?', 'Walking… with eyes closed?', () => v('manie-reveur')],
  ['lune', 'secret', '✶', 'Décrocher la lune', 'Reach for the moon', 'Vise plus haut.', 'Aim higher.', () => v('plafond')],
  ['nyanespace', 'secret', '≋', 'Nyan sidéral', 'Sidereal Nyan', 'Un arc-en-ciel, là où il n’y a pas de pluie.', 'A rainbow where there is no rain.', () => v('nyanespace')],
  ['pouf', 'secret', '✺', 'Après la pluie', 'After the rain', 'Tout plat, puis tout gonflé.', 'All flat, then all fluffy.', () => v('regonfle')],
];
const RANG = { bronze: { fr: 'Facile', en: 'Easy', c: '205,127,50' }, argent: { fr: 'Moyen', en: 'Medium', c: '150,160,175' }, or: { fr: 'Difficile', en: 'Hard', c: '226,176,40' }, secret: { fr: 'Secret', en: 'Secret', c: '150,90,200' } };
const HFs = LISTE.map(([id, rang, g, nfr, nen, hfr, hen, ok]) => ({ id, rang, g, nom: () => T(nfr, nen), h: () => T(hfr, hen), ok }));
const PAR = Object.fromEntries(HFs.map(h => [h.id, h]));
const nb = () => HFs.filter(h => M.got[h.id]).length;

/* ——— le badge : un dessin par haut fait (js/badges.js) ——— */
const badge = (h, got, taille) => Badges.badge(h, got, taille, RANG[h.rang].c);

/* ——— le déblocage : une carte qui surgit dans un coin (Mathieu 27/09 : « ne pas gêner l'utilisation ») ———
   En haut à droite, rien ne bloque la scène : le badge tombe en tournant, rebondit, des rayons derrière lui, quelques confettis.
   Un clic dessus ouvre la vitrine ; elle repart seule au bout de 5 s. */
const scene = document.createElement('div'); scene.className = 'hf-show'; scene.hidden = true; scene.setAttribute('role', 'status'); document.body.appendChild(scene);
const file = []; let joue = false, finT = 0;
function gagne(h) {
  if (M.got[h.id]) return; M.got[h.id] = Date.now(); garde(); compte(); file.push(h); suivant();
}
function suivant() {
  if (joue || !file.length) return; joue = true; const h = file.shift(), R = RANG[h.rang];
  scene.style.setProperty('--c', R.c);
  scene.innerHTML = `<div class="hf-rayons"></div>${badge(h, true, 76)}<div class="hf-txt">
    <p class="hf-sur">${T('Haut fait débloqué !', 'Achievement unlocked!')}</p><h2>${h.nom()}</h2><p class="hf-rang">${T(R.fr, R.en)}</p></div>`;
  scene.hidden = false; scene.classList.remove('go', 'part'); trait(); void scene.offsetWidth; scene.classList.add('go');
  // quelques confettis qui partent du badge
  const G = window.Scenarios && Scenarios.gerbe; if (G && Wd.W) setTimeout(() => { const r = scene.getBoundingClientRect(); if (r.width) G(r.left + 44, r.top + 46, 14, 300); }, 450);
  // (29/09, l'audit : le déblocage était une carte, pas un moment) : dans la pièce, un chat l'a vu. Il se dresse, lève la tête vers le coin
  // et le fête ; un autre le rejoint parfois (la carte, elle, ne gêne toujours rien)
  if (!Wd.espace && !Wd.trou && !Wd.fuite) { const L = Wd.cats.filter(c => !c.gone && !c.temp && !c.fall && !c.held && !c.perch && K.free4(c)).sort(() => Math.random() - 0.5).slice(0, h.rang === 'or' || h.rang === 'secret' ? 2 : 1);
    L.forEach((c, i) => setTimeout(() => { if (c.gone || c.held || !K.free4(c)) return; K.interrupt(c); c.face = c.x < Wd.W * 0.8 ? 1 : -1;
      c.q = [K.pose('miaule', 0.9, { fx: c => K.say(c, T(['bravo !', 'ouais !', 'trop fort !', 'miaou !'][Math.floor(Math.random() * 4)], ['bravo!', 'yes!', 'wow!', 'meow!'][Math.floor(Math.random() * 4)])) }), K.hop(() => K.groundAt(c.x, c.d), { h: K.sc(c) * 0.9 }), K.pose('assis', 1.2)]; }, 350 + i * 500)); }
  // (vague 37 de l'audit : « le déblocage reste dans son coin ») : à partir du rang moyen, toute la pièce fait la ola : de gauche à droite,
  // chaque chat libre bondit à son tour, les pattes en l'air, et la vague court d'un bord à l'autre de l'écran
  if (h.rang !== 'bronze' && !Wd.espace && !Wd.trou && !Wd.fuite) { const O = Wd.cats.filter(c => !c.gone && !c.temp && !c.rare && !c.fall && !c.held && !c.perch && K.free4(c)).sort((a, b) => a.x - b.x);
    if (O.length >= 3) { setTimeout(() => Wd.fx.push({ k: 'txt', text: T('OLA !', 'OLÉ!'), x: Wd.W * 0.5, y: Wd.floor - K.sOf(0.3) * 2.6, t0: Wd.t, life: 1.6, rot: -0.06, size: 40 }), 1500);
      O.forEach((c, i) => setTimeout(() => { if (c.gone || c.held || c.fall || !K.free4(c)) return; K.interrupt(c); c.q = [K.hop(() => K.groundAt(c.x, c.d), { h: K.sc(c) * 0.8, dur: 0.45 }), K.pose('assis', 0.8)]; }, 1400 + (c.x / Wd.W) * 1400 + i * 20)); } }
  // (vague 76, l'audit : « le déblocage ») : le moment sort de la carte. Une onde de la couleur du rang part du badge et traverse tout l'écran
  // (des cercles à la craie) ; chaque élément de l'interface qu'elle touche fait un bond, et les chats qu'elle touche lèvent la tête
  if (!Wd.trou && !matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(() => { const r = scene.getBoundingClientRect(); if (!r.width) return;
    const x = r.left + 44, y = r.top + 46, V = Math.hypot(innerWidth, innerHeight) / 1.3, t0 = performance.now(), vus = new Set();
    Wd.fx.push({ k: 'cri', x, y, v: V, t0: Wd.t, life: 1.9, seed: 3, col: R.c, w: h.rang === 'or' || h.rang === 'secret' ? 1.4 : 1 });
    const L = [...document.querySelectorAll('#brand, #lang-pick, .film-ui .ctrl > *, #chap > *, .evts li, .ctas > *, #titles')].filter(e => e.getClientRects().length && e.animate);
    const tic = () => { const Rr = (performance.now() - t0) / 1000 * V; L.forEach(e => { if (vus.has(e)) return; const q = e.getBoundingClientRect(), ex = q.left + q.width / 2, ey = q.top + q.height / 2; if (Math.hypot(ex - x, ey - y) > Rr) return; vus.add(e);
        const sx = Math.sign(ex - x) || 1; try { e.animate([{ transform: 'none' }, { transform: `translate(${sx * 4}px,-8px) scale(1.06)`, offset: 0.3 }, { transform: 'translateY(2px)', offset: 0.65 }, { transform: 'none' }], { duration: 520, easing: 'ease-out', composite: 'add' }); } catch (z) {} });
      Wd.cats.forEach(c => { if (vus.has(c) || c.gone || c.held || c.fall || Math.hypot(c.x - x, c.y - K.sc(c) * 0.6 - y) > Rr) return; vus.add(c); if (Math.random() < 0.3 && K.free4(c)) K.say(c, pick2(['!', '✨', 'oh ?'])); });
      if (Rr < Math.hypot(innerWidth, innerHeight) * 1.1) requestAnimationFrame(tic); };
    requestAnimationFrame(tic); }, 420);
  // (vague 260 de l'audit, « le déblocage », immersion) : la pièce tire un feu d'artifice. Des chats posés au sol allument chacun une fusée
  // (« feu ! ») : un trait de craie qui monte en sifflant jusqu'au haut de la pièce (jamais sous la barre du haut), éclate en étoiles de la couleur
  // du rang (« pan ! »), et les étincelles retombent en pluie sur toute la largeur ; une fusée au bronze, trois aux rangs supérieurs
  if (!Wd.espace && !Wd.trou && !Wd.fuite && !matchMedia('(prefers-reduced-motion: reduce)').matches) feu(h.rang === 'bronze' ? 1 : 3, R.c);
  clearTimeout(finT); finT = setTimeout(ferme, 5000);
}
/* (vague 315 de l'audit, design) : la carte n'est plus un cadre tout fait. Son contour s'écrit au stylo, d'un seul trait tremblé qui part
   du badge et fait le tour (les coins débordent un peu, comme à la main), puis le rang tombe dessus comme un coup de tampon :
   la carte encaisse le choc, et le tampon reste de travers, à l'encre de la couleur du rang */
function trait() {
  const w = scene.offsetWidth, h = scene.offsetHeight; if (!w || !h) return; scene.classList.add('trace');
  let g = 7; const j = () => ((Math.sin(g++ * 12.9898) * 43758.5453) % 1) * 1.3, r = Math.min(14, h * 0.3), P = [];
  const bord = (x0, y0, x1, y1) => { for (let k = 1; k < 4; k++) P.push(`L${(x0 + (x1 - x0) * k / 4 + j()).toFixed(1)} ${(y0 + (y1 - y0) * k / 4 + j()).toFixed(1)}`); };
  P.push(`M${r} ${h + j()}`); bord(r, h, w - r, h); P.push(`Q${w + j()} ${h + j()} ${w + j()} ${h - r}`); bord(w, h - r, w, r);
  P.push(`Q${w + 1.5} -1.5 ${w - r} ${j()}`); bord(w - r, 0, r, 0); P.push(`Q${-1 + j()} ${j()} ${j()} ${r}`); bord(0, r, 0, h - r);
  P.push(`Q0 ${h + 1} ${r + 9} ${h + 2.2}`);
  scene.insertAdjacentHTML('afterbegin', `<svg class="hf-trait" viewBox="-3 -3 ${w + 6} ${h + 6}" aria-hidden="true"><path pathLength="1" d="${P.join(' ')}"/></svg>`);
}
const FEU = [];
function feu(n, col) {
  const br = document.getElementById('brand'), haut = (br ? br.getBoundingClientRect().bottom : 60) + 30, L = Wd.cats.filter(c => !c.gone && !c.temp && !c.rare && !c.fall && !c.held && !c.perch && K.free4(c));
  for (let i = 0; i < n; i++) { const fx = n === 1 ? 0.5 : 0.22 + i * 0.28, c = L.sort((a, b) => Math.abs(a.x - Wd.W * fx) - Math.abs(b.x - Wd.W * fx))[0];
    setTimeout(() => { const x = c && !c.gone ? c.x + (c.face || 1) * K.sc(c) * 0.6 : Wd.W * fx, y0 = Wd.floor - 4;
      if (c && !c.gone && K.free4(c)) { c.face = c.x < Wd.W / 2 ? 1 : -1; K.say(c, T(['feu !', 'attention…', 'pshhh'][i % 3], ['fire!', 'watch…', 'pshhh'][i % 3])); }
      FEU.push({ x0: x, y0, x1: x + (Math.random() - 0.5) * Wd.W * 0.12, y1: haut + Math.random() * Wd.H * 0.12, t0: Wd.t + 0.35, col, pan: false, seed: i * 13 }); }, 900 + i * 450); }
}
H.draw.push(() => { if (!FEU.length || !window.Chalk) return; const C = Chalk, D = 0.8;
  for (let j = FEU.length - 1; j >= 0; j--) { const f = FEU[j], u = (Wd.t - f.t0) / D; if (u < 0) continue;
    if (u < 1) { const e = 1 - Math.pow(1 - u, 2), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e, q = Math.max(0, e - 0.25), xq = f.x0 + (f.x1 - f.x0) * q, yq = f.y0 + (f.y1 - f.y0) * q;
      C.stroke([[xq, yq], [x, y]], 1, { w: 2, a: 0.85 * Wd.a, seed: f.seed, tip: false }); C.circle(x, y, 3, 3, 1, { w: 2, a: 0.9 * Wd.a, seed: f.seed + 1 }); continue; }
    if (!f.pan) { f.pan = true; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, v = 160 + Math.random() * 160; Wd.fx.push({ k: 'etoile', x: f.x1, y: f.y1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, frein: 1.6, g: 140, r: 3 + Math.random() * 3, tw: 1, t0: Wd.t, life: 1.4 + Math.random() * 0.8, col: f.col }); }
      Wd.fx.push({ k: 'txt', text: T('pan !', 'bang!'), x: f.x1, y: f.y1 - 26, t0: Wd.t, life: 0.9, rot: -0.1, size: 20 }); }
    FEU.splice(j, 1); } });
const pick2 = L => L[Math.floor(Math.random() * L.length)];
function ferme() { clearTimeout(finT); if (scene.classList.contains('part')) return; vole(); scene.classList.add('part'); setTimeout(() => { scene.classList.remove('go', 'part'); scene.hidden = true; joue = false; setTimeout(suivant, 300); }, 380); }
// (vague 6, l'audit : « le déblocage ne va nulle part ») : rien ne s'efface. Le badge quitte la carte, file en arc jusqu'au bouton des hauts faits
// en tournant et en rapetissant, semant des étincelles ; le bouton l'avale, rebondit, et son compteur saute. La carte, elle, glisse hors de l'écran.
function vole() {
  const b = scene.querySelector('.hf-badge'), r0 = b && b.getBoundingClientRect(), r1 = btn && btn.getBoundingClientRect();
  // (vague 96 de l'audit : dans l'espace, le bouton est caché : le badge traversait les sous-titres pour rien ; il reste sur la carte, qui sort de l'écran)
  if (!r0 || !r0.width || !r1 || !r1.width || r1.right < 0 || document.documentElement.classList.contains('espace') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const v = b.cloneNode(true); v.classList.add('hf-vol'); v.style.cssText = `position:fixed;left:0;top:0;width:${r0.width}px;height:${r0.height}px;z-index:36;pointer-events:none;color:${getComputedStyle(scene).color}`;
  v.style.setProperty('--c', scene.style.getPropertyValue('--c')); document.body.appendChild(v); b.style.visibility = 'hidden';
  const x0 = r0.left + r0.width / 2, y0 = r0.top + r0.height / 2, x1 = r1.left + r1.width / 2, y1 = r1.top + r1.height / 2;
  const k1 = r1.width * 0.8 / r0.width;
  // (vague 10, l'audit : « le déblocage ») : un chat de la pièce saute et fait une tête au badge, qui rebondit dans le bouton des hauts faits
  // (s'il n'y a personne de libre, le badge file tout droit, en arc, comme avant)
  const libres = !Wd.espace && !Wd.trou && !Wd.fuite ? Wd.cats.filter(c => !c.gone && !c.temp && !c.rare && !c.fall && !c.held && !c.perch && K.free4(c) && c.x > 60 && c.x < Wd.W - 60) : [];
  const ch = libres.sort((a, b) => Math.abs(a.x - Wd.W * 0.55) - Math.abs(b.x - Wd.W * 0.55))[0], sC = ch && K.sc(ch), Hh = ch && sC * 1.1;
  const tete = ch && [ch.x + (ch.face || 1) * sC * 0.12, ch.y - Hh - sC * 0.78];
  const segs = tete ? [[x0, y0, tete[0], tete[1], 700, 0.5], [tete[0], tete[1], x1, y1, 800, 1]] : [[x0, y0, x1, y1, 900, 1]];
  if (ch) { const D0 = segs[0][4]; K.interrupt(ch); ch.face = ch.x < x0 ? 1 : -1; ch.q = [K.pose('affut', 0.4)];
    setTimeout(() => { if (ch.gone || ch.held || ch.fall) return; K.interrupt(ch); ch.q = [K.hop(() => K.groundAt(ch.x, ch.d), { h: Hh, dur: 0.5 }), K.pose('assis', 1.2)]; }, D0 - 260);
    setTimeout(() => { if (ch.gone) return; K.say(ch, T(['but !', 'tête !', 'hop là'][Math.floor(Math.random() * 3)], ['goal!', 'header!', 'hup!'][Math.floor(Math.random() * 3)]));
      Wd.fx.push({ k: 'txt', text: 'boing', x: ch.x + 30, y: ch.y - sC * 0.9, t0: Wd.t, life: 0.8, rot: -0.2, size: 17 }); }, D0); }
  let pe = 0, si = 0, t0 = performance.now(), tour = 0;
  // (la tête du chat se lit à chaque image : si la pièce rame, le badge vise quand même sa tête, où qu'elle soit)
  const vise = () => { if (!ch || si || ch.gone) return; segs[0][2] = ch.x + (ch.face || 1) * sC * 0.12; segs[0][3] = ch.y - sC * 0.78; segs[1][0] = segs[0][2]; segs[1][1] = segs[0][3]; };
  const pas = now => { vise(); const [xa, ya, xb, yb, D, fin] = segs[si], u = Math.min(1, (now - t0) / D), e = si === 0 && segs.length > 1 ? u * u : u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, a = 1 - e;
    const cx = (xa + xb) / 2, cy = Math.min(ya, yb) - Math.min(260, Math.abs(xb - xa) * 0.35) - 40, g = si === 0 && segs.length > 1 ? 0 : 1;
    const x = a * a * xa + 2 * a * e * cx + e * e * xb, y = a * a * ya + 2 * a * e * (g ? cy : Math.min(ya, yb) - 40) + e * e * yb;
    const kk = segs.length > 1 ? (si ? 0.7 + (k1 - 0.7) * e : 1 - 0.3 * e) : 1 + (k1 - 1) * e, sc = (1 + Math.sin(u * Math.PI) * 0.25) * kk;
    v.style.transform = `translate(${x - r0.width / 2}px,${y - r0.height / 2}px) scale(${sc}) rotate(${tour + e * 360 * (si ? -1.5 : 1)}deg)`;
    if (now - pe > 40 && u < 0.95) { pe = now; const f = document.createElement('i'); f.className = 'hf-etin'; f.style.left = x + 'px'; f.style.top = y + 'px'; document.body.appendChild(f); setTimeout(() => f.remove(), 700); }
    if (u < 1) requestAnimationFrame(pas);
    else if (!fin) { si++; t0 = now; tour += 360; const G = window.Scenarios && Scenarios.gerbe; if (G && Wd.W) G(x, y, 8, 160); requestAnimationFrame(pas); }
    else { v.remove(); btn.classList.remove('hf-avale'); void btn.offsetWidth; btn.classList.add('hf-avale'); setTimeout(() => btn.classList.remove('hf-avale'), 700);
      const G = window.Scenarios && Scenarios.gerbe; if (G && Wd.W) G(x1, y1, 10, 180); } };
  requestAnimationFrame(pas);
}
scene.addEventListener('click', e => { e.stopPropagation(); ferme(); ouvre(); });
['pointerdown', 'wheel', 'touchstart'].forEach(t => scene.addEventListener(t, e => e.stopPropagation(), { passive: t !== 'pointerdown' }));

/* ——— les compteurs ——— */
H.live.push(c => {
  if (c.pet && c.pet !== c.hfPet) { c.hfPet = c.pet; N.caresses++; garde(); }
  if (c.fall && c.relT && c.relT !== c.hfLance && Wd.t - c.relT < 0.3 && Math.hypot(c.vx || 0, c.vy || 0) > K.sOf(c.d) * 3) { c.hfLance = c.relT; N.lancers++; garde(); }
});
let dernier = performance.now();
setInterval(() => {
  const now = performance.now(), dt = Math.min(5000, now - dernier); dernier = now;
  if (document.visibilityState === 'visible' && Wd.a > 0.5) { N.minutes += dt / 60000; garde(); }
  verifie();
}, 2000);
function verifie() { for (const h of HFs) if (!M.got[h.id]) { let ok = false; try { ok = h.ok(); } catch (e) {} if (ok) gagne(h); } }
addEventListener('dex', () => setTimeout(verifie, 2600));   // (après la petite carte « Découverte ! » du carnet)
setTimeout(verifie, 1500);

/* ——— la vitrine ——— */
const TROPHEE = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 7 h16 v7 q0 9 -8 11 q-8 -2 -8 -11z"/><path d="M12 10 h-5 q0 7 6 8 M28 10 h5 q0 7 -6 8"/><path d="M20 25 v5 M14 34 h12 M15 30 h10 v4 h-10z"/></svg>';
let btn = null, bulle = null;
function compte() { if (bulle) bulle.textContent = nb() + '/' + HFs.length; }
const vitrine = document.createElement('div'); vitrine.className = 'dex hf'; vitrine.hidden = true; vitrine.setAttribute('role', 'dialog'); vitrine.setAttribute('aria-modal', 'true');
document.body.appendChild(vitrine);
function ouvre() {
  const k = nb(), tot = HFs.length;
  vitrine.setAttribute('aria-label', T('Hauts faits', 'Achievements'));
  vitrine.innerHTML = `<div class="dex-page"><header><h2>${T('Hauts faits', 'Achievements')}</h2><p>${k} / ${tot}</p>
    <div class="dex-barre"><span style="width:${(k / tot * 100).toFixed(1)}%"></span></div><button type="button" class="dex-x" aria-label="${T('Fermer', 'Close')}">×</button></header>
    ${Object.keys(RANG).map(r => { const L = HFs.filter(h => h.rang === r); return `<section><h3>${T(RANG[r].fr, RANG[r].en)} <small>${L.filter(h => M.got[h.id]).length}/${L.length}</small></h3>
      <ul class="hf-grille">${L.map(h => { const got = !!M.got[h.id], cache = !got && r === 'secret';
        return `<li class="${got ? 'ok' : ''}" data-id="${h.id}" style="--c:${RANG[r].c}">${badge(h, got, 84)}<b>${cache ? T('Haut fait secret', 'Secret achievement') : h.nom()}</b><span>${h.h()}</span>${got ? `<i>${new Date(M.got[h.id]).toLocaleDateString(EN() ? 'en' : 'fr')}</i>` : ''}</li>`; }).join('')}</ul></section>`; }).join('')}</div>`;
  vitrine.hidden = false; vitrine.querySelector('.dex-x').focus(); vitrine.querySelector('.dex-x').onclick = fermeV; medailles();
}
/* (vague 101 de l'audit, « la vitrine » vers 9,9) : les hauts faits gagnés ne sont plus des vignettes, ce sont de vraies médailles.
   Chacune pend à son clou par un ruban de la couleur du rang ; le pointeur qui passe les fait balancer (en 3D, elles tournent un peu
   sur elles-mêmes), faire défiler la vitrine les fait toutes osciller ; un clic la retourne : au dos, gravés, le rang, son numéro
   d'ordre (la combientième gagnée) et la date. La dernière gagnée depuis la visite précédente de la vitrine tombe sur son clou à l'ouverture. */
let MED = null;
function medailles() {
  if (MED) cancelAnimationFrame(MED.raf); const ordre = Object.entries(M.got).sort((a, b) => a[1] - b[1]).map(e => e[0]), vu = M.vuV || 0, L = [];
  const recents = ordre.filter(id => M.got[id] > vu), neuve = vu ? recents[recents.length - 1] : null;
  vitrine.querySelectorAll('.hf-grille li.ok').forEach((li, i) => { const b = li.querySelector('.hf-badge'), h = PAR[li.dataset.id]; if (!b || !h) return;
    const R = RANG[h.rang], n = ordre.indexOf(h.id) + 1, d = new Date(M.got[h.id]).toLocaleDateString(EN() ? 'en' : 'fr', { day: 'numeric', month: 'short', year: 'numeric' });
    const m = document.createElement('span'); m.className = 'hf-med'; m.innerHTML = `<i class="hf-clou"></i><span class="hf-pend"><svg class="hf-ruban" viewBox="0 0 40 30" aria-hidden="true"><path d="M8 0 L20 26 L32 0 L25 0 L20 12 L15 0Z"/></svg>
      <span class="hf-face"></span><span class="hf-dos"><small>${T(R.fr, R.en)}</small><b>n° ${n}</b><small>${d}</small></span></span>`;
    b.replaceWith(m); m.querySelector('.hf-face').appendChild(b); li.tabIndex = 0; li.setAttribute('role', 'button'); li.setAttribute('aria-label', h.nom() + T(' : retourner la médaille', ': flip the medal'));
    const o = { li, m, p: m.querySelector('.hf-pend'), fa: m.querySelector('.hf-face'), ds: m.querySelector('.hf-dos'), vd: false, a: 0, v: 0, f: 0, fv: 0, dos: false, y: 0, vy: 0 };
    if (h.id === neuve) { o.y = -260; o.tombe = true; li.classList.add('hf-neuve'); }
    else o.v = (i % 2 ? 1 : -1) * (40 + (i * 37) % 50);   // (à l'ouverture, elles bougent encore un peu : on vient de pousser la porte)
    const flip = e => { if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); o.dos = !o.dos; o.fv += o.dos ? 900 : -900; o.v += (Math.random() < 0.5 ? -1 : 1) * 60; };
    li.addEventListener('click', flip); li.addEventListener('keydown', flip); L.push(o); });
  M.vuV = Date.now(); garde();
  if (!L.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const page = vitrine.querySelector('.dex-page'), nv = L.find(o => o.tombe);
  // (la nouvelle est plus bas ? la vitrine s'ouvre directement sur elle, pour la voir tomber)
  if (nv) { const r = nv.li.getBoundingClientRect(), rp = page.getBoundingClientRect(); if (r.bottom > rp.bottom - 40 || r.top < rp.top) page.scrollTop += r.top - rp.top - rp.height * 0.35; }
  let px = null, pt = 0, sc = page.scrollTop, t0 = performance.now();
  MED = { raf: 0 };
  page.addEventListener('pointermove', e => { const now = performance.now(); if (px != null && now > pt) { const vx = (e.clientX - px) / Math.max(8, now - pt) * 1000;
      L.forEach(o => { const r = o.m.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.55); const k = 1 - Math.hypot(dx, dy * 0.8) / 80; if (k > 0) o.v += vx * 0.09 * k; }); }
    px = e.clientX; pt = now; });
  page.addEventListener('scroll', () => { const d = page.scrollTop - sc; sc = page.scrollTop; L.forEach((o, i) => { o.v += d * (1.4 + (i % 3) * 0.3) * (i % 2 ? 1 : -1); }); }, { passive: true });
  const pas = now => { if (vitrine.hidden) { MED = null; return; } const dt = Math.min(0.04, (now - t0) / 1000); t0 = now;
    L.forEach(o => {
      o.v += (-o.a * 55 - o.v * 1.6) * dt; o.a += o.v * dt; o.a = Math.max(-40, Math.min(40, o.a));
      const cible = o.dos ? 180 : 0; o.fv += ((cible - o.f) * 70 - o.fv * 9) * dt; o.f += o.fv * dt;
      if (o.tombe) { o.vy += 2600 * dt; o.y += o.vy * dt; if (o.y >= 0) { o.y = 0; if (o.vy > 300) { o.vy *= -0.32; o.v += 160; if (!o.clink) { o.clink = 1; const r = o.m.getBoundingClientRect(), G = window.Scenarios && Scenarios.gerbe; if (G && Wd.W) G(r.left + r.width / 2, r.top + 8, 10, 160); } } else { o.vy = 0; o.tombe = false; } } }
      const ry = o.f + o.a * 1.8, dos = Math.cos(ry * Math.PI / 180) < 0;   // (quelle face on voit : calculé ici, plus sûr que backface-visibility)
      if (dos !== o.vd) { o.vd = dos; o.fa.style.visibility = dos ? 'hidden' : ''; o.ds.style.visibility = dos ? 'visible' : ''; }
      o.p.style.transform = `translateY(${o.y.toFixed(1)}px) rotate(${o.a.toFixed(2)}deg) rotateY(${ry.toFixed(1)}deg)`; });
    MED.raf = requestAnimationFrame(pas); };
  MED.raf = requestAnimationFrame(pas);
}
function fermeV() { vitrine.hidden = true; if (btn) btn.focus(); }
vitrine.addEventListener('click', e => { if (e.target === vitrine) fermeV(); });
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!vitrine.hidden) fermeV(); else if (!scene.hidden) ferme(); });
['pointerdown', 'click', 'wheel', 'touchstart'].forEach(t => vitrine.addEventListener(t, e => e.stopPropagation(), { passive: t === 'wheel' || t === 'touchstart' }));
function pose() {
  const list = document.querySelector('.evts-list'); if (!list) return false;
  const li = document.createElement('li'); li.className = 'dex-li';
  li.innerHTML = `<button type="button" class="dex-btn hf-btn" aria-label="${T('Hauts faits', 'Achievements')}">${TROPHEE}<span class="evts-nom">${T('Hauts faits', 'Achievements')}</span><em class="dex-n"></em></button>`;
  list.appendChild(li); btn = li.querySelector('button'); bulle = li.querySelector('.dex-n'); compte();
  btn.addEventListener('click', e => { e.stopPropagation(); ouvre(); });
  return true;
}
if (!pose()) addEventListener('load', pose, { once: true });

return { HFs, gagne: id => PAR[id] && gagne(PAR[id]), ouvre, get etat() { return M; } };
})();
