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
  'meta.title': 'Mathieu — des trucs sur le web',
  'meta.desc': 'Le portfolio de Mathieu, développeur web.',
  'gate.kick': 'Accès réservé', 'gate.label': 'Code d’accès', 'gate.ph': 'code', 'gate.go': 'Entrer', 'gate.bad': 'Ce n’est pas le bon code.',
  'lang': 'Langue', 'home': 'Mathieu, retour au début', 'grab': 'Glisser pour tourner',
  // la ligne du temps (js/film.js)
  'film.chapters': 'Chapitres', 'film.chapter': 'Chapitre {0} : {1}', 'film.play': 'Lecture', 'film.pause': 'Pause', 'film.replay': 'Rejouer',
  'film.sound': 'Son', 'film.hint': 'Molette ou flèches : chapitre suivant',
  // les chapitres (exemple)
  'ch.1': 'Salut', 'ch.2': 'Essai', 'ch.3': 'Terrain de jeu',
  // la scène d'exemple (js/scenes.js) — à remplacer par le vrai contenu
  'salut.title': 'Salut, moi c’est Mathieu et je fais des trucs sur le web.',
  'salut.cta': 'Entrer dans mon monde', 'salut.hint': 'clique ailleurs : un objet tombe',
  'essai.title': 'Une scène de cinq secondes', 'essai.note': 'le temps ralentit ici', 'essai.cap': 'Une phrase écrite sur la ligne du temps, lettre à lettre.',
  'jeu.title': 'Terrain de jeu', 'jeu.hint': 'clique, attrape, lance'
},
en: {
  name: 'English', dec: '.',
  'meta.title': 'Mathieu — stuff on the web',
  'meta.desc': 'Mathieu’s portfolio, web developer.',
  'gate.kick': 'Private access', 'gate.label': 'Access code', 'gate.ph': 'code', 'gate.go': 'Enter', 'gate.bad': 'That’s not the right code.',
  'lang': 'Language', 'home': 'Mathieu, back to the start', 'grab': 'Drag to turn',
  'film.chapters': 'Chapters', 'film.chapter': 'Chapter {0}: {1}', 'film.play': 'Play', 'film.pause': 'Pause', 'film.replay': 'Replay',
  'film.sound': 'Sound', 'film.hint': 'Wheel or arrows: next chapter',
  'ch.1': 'Hi', 'ch.2': 'Test', 'ch.3': 'Playground',
  'salut.title': 'Hi, I’m Mathieu and I make stuff on the web.',
  'salut.cta': 'Enter my world', 'salut.hint': 'click anywhere else: something falls',
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
