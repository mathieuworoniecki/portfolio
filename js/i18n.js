/* Les langues. Le français est la version de référence ; chaque langue reprend exactement les mêmes clés.
   La langue : celle choisie dans le sélecteur (retenue), sinon celle du navigateur, sinon l'anglais.
   Dans la page : data-i18n="clé" remplace le texte ; data-i18n-attr="attribut:clé;attribut:clé" remplace des attributs.
   Dans les dessins à la craie : L('clé', valeur…) — {0}, {1} sont remplacés par les valeurs.
   Changer de langue recharge la page (les titres à la craie sont préparés au chargement).
   Le mécanisme sait aussi l'allemand, l'italien, l'espagnol et le chinois (police, découpe par caractère) : il suffit d'ajouter
   leur dictionnaire. Règles de traduction : mêmes faits, même ton (ludique, jamais corporate) ; séparateur décimal local (clé dec). */
window.I18N = (() => {
const D = {
fr: {
  name: 'Français', dec: ',',
  'meta.title': 'Mathieu Woroniecki · Architecte IA & CTO à Paris',
  'meta.desc': 'Mathieu Woroniecki, architecte IA et CTO de MARKO à Paris : IA générative, RAG, agents, architecture et direction technique. Son univers en 3D et son CV animé.',
  'gate.kick': 'Accès réservé', 'gate.label': 'Code d’accès', 'gate.ph': 'code', 'gate.go': 'Entrer', 'gate.bad': 'Ce n’est pas le bon code.',
  'lang': 'Langue', 'home': 'Mathieu, retour au début', 'grab': 'Glisser pour tourner',
  'cvtexte': 'Le CV de Mathieu Woroniecki, architecte IA & CTO, en version texte', 'cvtexte.href': '/cv',
  // la ligne du temps (js/film.js)
  'film.chapters': 'Chapitres', 'film.chapter': 'Chapitre {0} : {1}', 'film.play': 'Lecture', 'film.pause': 'Pause', 'film.replay': 'Rejouer',
  'film.sound': 'Son', 'film.hint': 'Molette ou flèches : chapitre suivant',
  // les chapitres (exemple)
  'ch.1': 'Salut', 'ch.2': 'Espace', 'ch.3': 'Terrain de jeu',
  // la scène d'exemple (js/scenes.js) — à remplacer par le vrai contenu
  'salut.title': 'Salut, moi c’est Mathieu.',
  'menu.titre': 'Événements', 'menu.geant': 'Le chat géant', 'menu.interminable': 'Le chat interminable', 'menu.ballon': 'Le chat ballon', 'menu.eclair': 'Le chat éclair',
  'menu.totem': 'Le totem de chats', 'menu.acrobate': "L'acrobate", 'menu.horde': 'La horde', 'menu.tour': 'La tour de cartons', 'menu.aspirateur': "L'aspirateur",
  'menu.folle': 'Le distributeur fou', 'menu.bagarre': 'La bagarre', 'menu.colis': 'Le colis', 'menu.mouche': 'La mouche', 'menu.concert': 'Le concert',
  'menu.vitre': 'La vitre', 'menu.arc': "L'arc-en-ciel", 'menu.bain': "L'heure du bain",
  'tuto.coucou': 'coucou !', 'tuto.attrape': 'Attrape un chat : appuie et tire', 'tuto.caresse': 'Caresse-le : passe et repasse sur son dos',
  'tuto.clic': 'Clique dans le vide : un chat tombe du ciel', 'tuto.lance': 'Attrape un objet et lance-le',
  'indice.levier': 'Abaisse mon levier !', 'indice.distrib': 'Clique-moi trois fois…', 'indice.coffre': 'Ouvre-moi : un jouet !',
  'salut.cta': 'Entrer dans mon univers', 'salut.stay': 'Mode sérieux', 'salut.hint': 'clique : un chat tombe du ciel · le coffre : un jouet',
  'essai.title': 'Une scène de cinq secondes', 'essai.note': 'le temps ralentit ici', 'essai.cap': 'Une phrase écrite sur la ligne du temps, lettre à lettre.',
  'jeu.title': 'Terrain de jeu', 'jeu.hint': 'clique, attrape, lance'
},
en: {
  name: 'English', dec: '.',
  'meta.title': 'Mathieu Woroniecki · AI Architect & CTO in Paris',
  'meta.desc': 'Mathieu Woroniecki, AI Architect and CTO of MARKO in Paris: generative AI, RAG, agents, architecture and technical leadership. His 3D world and animated CV.',
  'gate.kick': 'Private access', 'gate.label': 'Access code', 'gate.ph': 'code', 'gate.go': 'Enter', 'gate.bad': 'That’s not the right code.',
  'lang': 'Language', 'home': 'Mathieu, back to the start', 'grab': 'Drag to turn',
  'cvtexte': 'Mathieu Woroniecki’s CV, AI Architect & CTO, as plain text', 'cvtexte.href': '/cv-en',
  'film.chapters': 'Chapters', 'film.chapter': 'Chapter {0}: {1}', 'film.play': 'Play', 'film.pause': 'Pause', 'film.replay': 'Replay',
  'film.sound': 'Sound', 'film.hint': 'Wheel or arrows: next chapter',
  'ch.1': 'Hi', 'ch.2': 'Space', 'ch.3': 'Playground',
  'salut.title': 'Hi, I’m Mathieu.',
  'menu.titre': 'Events', 'menu.geant': 'The giant cat', 'menu.interminable': 'The endless cat', 'menu.ballon': 'The balloon cat', 'menu.eclair': 'The lightning cat',
  'menu.totem': 'The cat totem', 'menu.acrobate': 'The acrobat', 'menu.horde': 'The horde', 'menu.tour': 'The box tower', 'menu.aspirateur': 'The vacuum',
  'menu.folle': 'The crazy dispenser', 'menu.bagarre': 'The fight', 'menu.colis': 'The parcel', 'menu.mouche': 'The fly', 'menu.concert': 'The concert',
  'menu.vitre': 'The window', 'menu.arc': 'The rainbow', 'menu.bain': 'Bath time',
  'tuto.coucou': 'hi!', 'tuto.attrape': 'Grab a cat: press and pull', 'tuto.caresse': 'Pet it: move back and forth over its back',
  'tuto.clic': 'Click on empty space: a cat falls from the sky', 'tuto.lance': 'Grab an object and throw it',
  'indice.levier': 'Pull my lever down!', 'indice.distrib': 'Click me three times…', 'indice.coffre': 'Open me: a toy!',
  'salut.cta': 'Enter my universe', 'salut.stay': 'Serious mode', 'salut.hint': 'click: a cat falls from the sky · the chest: a toy',
  'essai.title': 'A five-second scene', 'essai.note': 'time slows down here', 'essai.cap': 'A sentence written on the timeline, letter by letter.',
  'jeu.title': 'Playground', 'jeu.hint': 'click, grab, throw'
}};
const KEY = 'pf-lang';
function detect() {
  try { const s = localStorage.getItem(KEY); if (s && D[s]) return s; } catch (e) {}
  for (const l of (navigator.languages || [navigator.language || 'en'])) { const c = String(l).slice(0, 2).toLowerCase(); if (D[c]) return c; }
  return 'en';
}
const lang = detect(), dict = D[lang];
function t(k, ...a) { let s = dict[k] ?? D.fr[k] ?? k; a.forEach((v, i) => { s = s.split('{' + i + '}').join(v); }); return s; }
// un nombre, avec le séparateur décimal de la langue
const num = (v, d) => (d ? Number(v).toFixed(d) : String(v)).replace('.', dict.dec);
function apply(root) {
  root = root || document;
  document.documentElement.lang = lang;
  // le chinois : une police qui a ces caractères (Google ne charge que ceux de la page)
  if (lang === 'zh' && !document.getElementById('font-zh')) { const l = document.createElement('link'); l.id = 'font-zh'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&display=swap'; document.head.appendChild(l); }
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(p => { const [a, k] = p.split(':'); if (a && k) el.setAttribute(a.trim(), t(k.trim())); }));
}
function set(l) { if (!D[l] || l === lang) return; try { localStorage.setItem(KEY, l); } catch (e) {} location.reload(); }
// le sélecteur de langue (dans l'en-tête)
function selector(sel) {
  if (!sel) return;
  sel.innerHTML = Object.keys(D).map(k => `<option value="${k}"${k === lang ? ' selected' : ''}>${k.toUpperCase()} · ${D[k].name}</option>`).join('');
  sel.setAttribute('aria-label', t('lang'));
  sel.addEventListener('change', () => set(sel.value));
}
return { lang, t, num, apply, set, selector, langs: Object.keys(D), cjk: lang === 'zh' };
})();
window.L = (k, ...a) => I18N.t(k, ...a);
