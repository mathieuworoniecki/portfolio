/* Le mode sérieux : le CV de Mathieu, en page au défilement, avec des objets 3D en traits (esprit LookAnimation).
   Complètement à part du mode chat : son calque (#serieux), ses toiles, son style (css/serieux.css), ses données (js/serieux-donnees.js),
   sa 3D (js/serieux-3d.js). Il ne lit ni Film, ni Scenes, ni les chats.
     Serieux.ouvre({ x, y })   pose le calque (il s'ouvre en cercle depuis x, y : le bouton « Mode sérieux ») ; renvoie une Promise
     Serieux.ferme()           le referme (en cercle vers le bouton « Mode chat ») et rend la main au mode chat
     Serieux.ouvert            vrai quand le calque est affiché
   Événements sur window : 'serieux:ouvert' et 'serieux:ferme' ; html.serieux tant qu'il est ouvert.
   L'adresse ?serieux ouvre directement le mode sérieux.
   Les écrans épinglés (.sx-pin) restent à l'écran pendant qu'on défile : chaque étape du texte a son geste dans la 3D (v.pas). */
window.Serieux = (() => {
/* la langue : celle du site (js/i18n.js) ; en dehors du français, le CV est en anglais (js/serieux-donnees-en.js) */
const LG = (window.I18N && I18N.lang) || 'fr', EN = LG !== 'fr' && !!window.SERIEUX_DONNEES_EN;
const D = EN ? window.SERIEUX_DONNEES_EN : window.SERIEUX_DONNEES, root = document.documentElement;
const U = EN ? {
  voirIA: 'See the AI work', methode: 'My method', lesProjets: 'The projects', defiler: 'Scroll', accueil: 'Home', ia: 'AI', meth: 'Method', preuve: 'Proof', impact: 'Impact',
  parcours: 'Career', formation: 'Education', comp: 'Skills', projets: 'Projects', contact: 'Contact', couche: 'layer', filtre: 'Filter projects by category', tout: 'Show all',
  prive: 'private repo', retourChats: 'Go back to play with the cats', pied: 'Drawing no. CV-2026 · scale 1:1', haut: 'Top of the page', plan: 'Sections', retourAria: 'Back to cat mode',
  modeChat: 'Cat mode', projet: 'Project', planche: 'Sheet', echelle: 'Scale', rev: 'Rev.', curseur: 'Cursor', aria: 'Serious mode: the CV of ', loc: 'en-US',
  rapide: 'Quick read', pdf: 'Download the CV (PDF)', fermer: 'Close', autreLangue: 'FR', autreLangueAria: 'Voir le CV en français'
} : {
  voirIA: 'Voir le travail sur l’IA', methode: 'Ma méthode', lesProjets: 'Les projets', defiler: 'Défiler', accueil: 'Accueil', ia: 'L’IA', meth: 'Méthode', preuve: 'Preuve', impact: 'Impact',
  parcours: 'Parcours', formation: 'Formation', comp: 'Compétences', projets: 'Projets', contact: 'Contact', couche: 'couche', filtre: 'Filtrer les projets par catégorie', tout: 'Tout voir',
  prive: 'dépôt privé', retourChats: 'Retourner jouer avec les chats', pied: 'Plan n° CV-2026 · échelle 1:1', haut: 'Haut de la page', plan: 'Sections', retourAria: 'Revenir au mode chat',
  modeChat: 'Mode chat', projet: 'Projet', planche: 'Planche', echelle: 'Échelle', rev: 'Rév.', curseur: 'Curseur', aria: 'Mode sérieux : le CV de ', loc: 'fr-FR',
  rapide: 'Version rapide', pdf: 'Télécharger le CV (PDF)', fermer: 'Fermer', autreLangue: 'EN', autreLangueAria: 'See the CV in English'
};
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); };
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const n2 = i => String(i).padStart(2, '0');
let el = null, droites = [], defile, grille, gx, toile3d, etiqs = [], secs = [], pins = [], navLiens = [], cart = {}, fonds = [];
let ouvert = false, boucle = 0, t0 = 0, tIntro = 0, souris = { x: -1, y: -1, mx: 0, my: 0 }, prise = null, rot = { x: 0, y: 0, vx: 0, vy: 0 }, active = -1;
const FOND0 = ['#2468B6', '#1C58A2', '#133F7C'];

/* ——— les icônes : des pictogrammes au trait, comme le plan ——— */
const ICO = {
  immeuble: 'M4 21V8l6-3v16M10 21V3l8 3v15M3 21h18M13 8h2M13 11h2M13 14h2M6 11h2M6 14h2',
  doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 11h6M9 14h6M9 17h4',
  agent: 'M12 3v3M7 8h10v9H7zM10 12h.01M14 12h.01M10 15h4M4 11v3M20 11v3M9 20v1M15 20v1',
  rapport: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  pile: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  bouclier: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  loupe: 'M10.5 4a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM15.5 15.5L21 21',
  graphe: 'M4 6a2 2 0 104 0 2 2 0 10-4 0M16 6a2 2 0 104 0 2 2 0 10-4 0M10 12a2 2 0 104 0 2 2 0 10-4 0M4 18a2 2 0 104 0 2 2 0 10-4 0M16 18a2 2 0 104 0 2 2 0 10-4 0M7.5 7.5l3 3M16.5 7.5l-3 3M7.5 16.5l3-3M16.5 16.5l-3-3',
  bourse: 'M5 4v16M5 8h-1v6h2V8zM12 6v14M11 9h2v5h-2zM19 4v14M18 6h2v8h-2zM3 20h18',
  terminal: 'M4 5h16v14H4zM7 10l3 2-3 2M12 15h4',
  cerveau: 'M9 4a3 3 0 00-3 3 3 3 0 00-2 5 3 3 0 002 5 3 3 0 006 1V5a2 2 0 00-3-1zM15 4a3 3 0 013 3 3 3 0 012 5 3 3 0 01-2 5 3 3 0 01-6 1',
  langues: 'M4 5h8M8 3v2M6 5c0 4 3 7 6 8M10 5c0 3-2 6-5 8M13 21l4-10 4 10M14.5 17h5',
  eclair: 'M13 3L5 13h6l-1 8 8-10h-6z',
  test: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M8 14h8',
  serveur: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  particules: 'M12 12h.01M7 7h.01M17 7h.01M7 17h.01M17 17h.01M12 4h.01M12 20h.01M4 12h.01M20 12h.01',
  chat: 'M4 20V9L3 3l5 3h8l5-3-1 6v11zM9 13v1M15 13v1M11 17h2',
  cadenas: 'M6 11h12v10H6zM8 11V7a4 4 0 018 0v4M12 15v2',
  lien: 'M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1',
  balance: 'M12 3v18M5 21h14M4 8h16M7 8l-3 7h6zM17 8l-3 7h6z',
  des: 'M5 5h14v14H5zM9 9h.01M15 15h.01M12 12h.01'
};
const ico = k => `<svg class="sx-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICO[k] || ICO.code}"/></svg>`;

/* ——— la page ——— */
const mots = s => esc(s).split(' ').map((m, i) => `<span class="m"><span style="--i:${i}">${m}</span></span>`).join(' ');
const tete = (num, titre) => `<header class="sx-tete" data-rev><span class="sx-num">${num}</span><h2 class="sx-h2">${mots(titre)}</h2></header>`;
const tags = (l, cls) => `<ul class="sx-tags${cls ? ' ' + cls : ''}">${l.map((t, i) => `<li style="--i:${i}">${esc(t)}</li>`).join('')}</ul>`;
const points = n => `<ol class="sx-points" aria-hidden="true">${Array.from({ length: n }, () => '<li></li>').join('')}</ol>`;
function epingle(id, obj, num, nom, n, dedans) {
  return `<section class="sx-sec sx-pin" id="${id}" data-obj="${obj}" data-pas="${n}" data-nom="${esc(nom)}" data-num="${num}" style="--pas:${n}">
    <div class="sx-scene"><div class="sx-col">${dedans}</div></div></section>`;
}
function page() {
  const A = D.accueil, ia = D.ia, im = D.impact, chrono = D.parcours.slice().reverse();
  const accueil = `
      <section class="sx-sec sx-accueil" data-obj="accueil" data-nom="${U.accueil}" data-num="00">
        <div class="sx-col">
          <p class="sx-sur" data-rev>${esc(A.sur)}</p>
          <h1 class="sx-h1" data-rev>${mots('Mathieu')}<br>${mots('Woroniecki')}</h1>
          <p class="sx-role" data-rev>${esc(A.titre)}</p>
          <p class="sx-chapo" data-rev>${esc(A.these)}</p>
          <p class="sx-maintenant" data-rev><i class="sx-point"></i>${esc(A.maintenant)}</p>
          <ul class="sx-faits" data-rev>${A.faits.map(f => `<li>${f}</li>`).join('')}</ul>
          <div class="sx-actions" data-rev>
            <a class="sx-btn plein" href="#sx-ia">${U.voirIA}</a>
            <a class="sx-btn" href="#sx-methode">${U.methode}</a>
            <a class="sx-btn" href="#sx-projets">${U.lesProjets}</a>
          </div>
        </div>
        <p class="sx-defiler" aria-hidden="true"><span>${U.defiler}</span><i></i></p>
      </section>`;
  const iaPin = epingle('sx-ia', 'chaine', '01', U.ia, ia.chaine.length, `
          ${tete('01', ia.titre)}
          <p class="sx-chapo court" data-rev>${esc(ia.chapo)}</p>
          <div class="sx-etapes">${ia.chaine.map((c, i) => `
            <article class="sx-etape" data-k="${i}">
              <p class="sx-sur"><b>${n2(i + 1)}</b> / ${n2(ia.chaine.length)} · ${esc(c.court)}</p>
              <h3 class="sx-h3">${esc(c.t)}</h3><p>${esc(c.d)}</p>${tags(c.tags)}
            </article>`).join('')}</div>
          ${points(ia.chaine.length)}`);
  const iaSuite = `
      <section class="sx-sec sx-suite" data-obj="chaine">
        <div class="sx-col">
          <p class="sx-chapo" data-rev>${esc(ia.suite)}</p>
          <div class="sx-preuves">${ia.preuves.map((p, i) => `
            <article class="sx-carte sx-preuve" data-rev style="--d:${i}">
              <p class="sx-gros">${esc(p.chiffre)}</p><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p>
            </article>`).join('')}</div>
          ${tags(ia.outils, 'ia')}
        </div>
      </section>`;
  const M = D.methode;
  const methode = epingle('sx-methode', 'atelier', '02', U.meth, M.etapes.length, `
          ${tete('02', M.titre)}
          <p class="sx-chapo court" data-rev>${esc(M.chapo)}</p>
          <div class="sx-etapes">${M.etapes.map((c, i) => `
            <article class="sx-etape" data-k="${i}">
              <p class="sx-sur"><b>${n2(i + 1)}</b> / ${n2(M.etapes.length)} · ${esc(c.court)}</p>
              <h3 class="sx-h3">${esc(c.t)}</h3><p>${esc(c.d)}</p>${tags(c.tags)}
            </article>`).join('')}</div>
          ${points(M.etapes.length)}`);
  const P = D.preuve, preuve = P ? epingle('sx-preuve', 'preuve', '03', U.preuve, P.etapes.length, `
          ${tete('03', P.titre)}
          <p class="sx-chapo court" data-rev>${esc(P.chapo)}</p>
          <div class="sx-etapes grand">${P.etapes.map((c, i) => `
            <article class="sx-etape sx-chiffre" data-k="${i}">
              <p class="sx-gros"><span class="sx-n" data-n="${c.n}" data-dec="${c.dec || 0}" data-pre="${esc(c.pre || '')}" data-suf="${esc(c.suf || '')}">${esc((c.pre || '') + fmt(c.n, c.dec || 0) + (c.suf || ''))}</span></p>
              <h3>${esc(c.u)}</h3><p>${esc(c.d)}</p><p class="sx-source">${esc(c.src)}</p>
            </article>`).join('')}</div>
          ${points(P.etapes.length)}`) : '';
  const impact = epingle('sx-impact', 'impact', '04', U.impact, im.chiffres.length, `
          ${tete('04', im.titre)}
          <div class="sx-etapes grand">${im.chiffres.map((c, i) => `
            <article class="sx-etape sx-chiffre" data-k="${i}">
              <p class="sx-gros"><span class="sx-n" data-n="${c.n}" data-dec="${c.dec || 0}" data-pre="${esc(c.pre || '')}" data-suf="${esc(c.suf || '')}">${esc((c.pre || '') + fmt(c.n, c.dec || 0) + (c.suf || ''))}</span></p>
              <h3>${esc(c.u)}</h3><p>${esc(c.d)}</p><p class="sx-source">${esc(c.src)}</p>
            </article>`).join('')}</div>
          ${points(im.chiffres.length)}`);
  const parcours = epingle('sx-parcours', 'circuit', '05', U.parcours, chrono.length, `
          ${tete('05', U.parcours)}
          <p class="sx-chapo court" data-rev>${esc(D.parcoursChapo)}</p>
          <div class="sx-etapes">${chrono.map((p, i) => `
            <article class="sx-etape sx-poste${p.ia ? ' ia' : ''}" data-k="${i}">
              <p class="sx-dates">${esc(p.dates)}</p>
              <h3><b>${esc(p.lieu)}</b> ${esc(p.poste)}</h3>
              <p>${esc(p.d)}</p>
              ${p.l.length ? `<ul>${p.l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            </article>`).join('')}</div>
          ${points(chrono.length)}`);
  const formation = `
      <section class="sx-sec sx-suite" data-obj="circuit">
        <div class="sx-col">
          <div class="sx-formation" data-rev>
            <h3 class="sx-h3 petit">${U.formation}</h3>
            <ul>${D.formation.map(f => `<li><span class="sx-dates">${esc(f.dates)}</span><b>${esc(f.t)}</b><span>${esc(f.o)}</span></li>`).join('')}</ul>
            <p class="sx-langues">${ico('langues')}${D.langues.map(esc).join(' · ')}</p>
          </div>
        </div>
      </section>`;
  const comp = epingle('sx-competences', 'couches', '06', U.comp, D.competences.length, `
          ${tete('06', U.comp)}
          <p class="sx-chapo court" data-rev>${esc(D.competencesChapo)}</p>
          <div class="sx-etapes">${D.competences.map((c, i) => `
            <article class="sx-etape sx-couche${c.id === 'ia' ? ' ia' : ''}" data-k="${i}">
              <p class="sx-sur"><b>${n2(i + 1)}</b> / ${n2(D.competences.length)} · ${U.couche} ${esc(c.nomCouche)}</p>
              <h3 class="sx-h3">${esc(c.t)}</h3><p>${esc(c.d)}</p>
              ${c.groupes.map(g => `<p class="sx-groupe"><span>${esc(g[0])}</span>${g[1].map(esc).join(' · ')}</p>`).join('')}
            </article>`).join('')}</div>
          ${points(D.competences.length)}`);
  /* 05 — les projets : une tête avec la légende des catégories (cliquable : elle filtre), puis un projet par écran,
     la carte à gauche puis à droite, son objet 3D en face */
  const CAT = Object.fromEntries(D.categories.map(c => [c.id, c]));
  const tous = D.projets.concat(D.autres), nb = id => tous.filter(p => p.cats.includes(id)).length;
  const cats = l => `<ul class="sx-cats">${l.map(id => `<li data-c="${id}">${ico(CAT[id].i)}${esc(CAT[id].t)}</li>`).join('')}</ul>`;
  const projTete = `
      <section class="sx-sec sx-projets-tete" id="sx-projets" data-obj="${D.projets[0].o}" data-fond="${D.projets[0].fond.join(',')}" data-nom="${U.projets}" data-num="07">
        <div class="sx-col">
          ${tete('07', U.projets)}
          <p class="sx-chapo" data-rev>${esc(D.projetsChapo)}</p>
          <div class="sx-legende" data-rev role="group" aria-label="${U.filtre}">
            ${D.categories.map(c => `<button type="button" data-c="${c.id}" aria-pressed="false">${ico(c.i)}<span>${esc(c.t)}</span><i>${nb(c.id)}</i></button>`).join('')}
            <button type="button" class="tout" data-c="" aria-pressed="true"><span>${U.tout}</span><i>${tous.length}</i></button>
          </div>
          <ol class="sx-sommaire" data-rev>${tous.map((p, i) => `
            <li data-cats="${p.cats.join(' ')}"><a href="#${i < D.projets.length ? 'sx-p' + i : 'sx-a' + (i - D.projets.length)}">
              ${ico(p.o ? ({ immeuble: 'immeuble', archive: 'doc', bougies: 'bourse', radar: 'bouclier', reseau: 'graphe', caviarde: 'cadenas', fleur: 'particules' })[p.o] || 'code' : p.i)}
              <b>${esc(p.t)}</b><span>${esc(p.sous || p.d)}</span>${p.prive ? `<i title="${U.prive}">${ico('cadenas')}</i>` : ''}<em aria-hidden="true">→</em></a></li>`).join('')}</ol>
        </div>
      </section>`;
  const projets = projTete + D.projets.map((p, i) => `
      <section class="sx-sec sx-projet${i % 2 ? ' droite' : ''}" id="sx-p${i}" data-obj="${p.o}" data-fond="${p.fond.join(',')}">
        <div class="sx-col">
          <article class="sx-carte sx-proj" data-rev data-cats="${p.cats.join(' ')}">
            <p class="sx-sur">${n2(i + 1)} / ${n2(D.projets.length)} · ${esc(p.role)}${p.prive ? ' · <span class="sx-prive">' + ico('cadenas') + U.prive + '</span>' : ''}</p>
            ${cats(p.cats)}
            <h3 class="sx-h3">${esc(p.t)}</h3>
            <p class="sx-sous">${esc(p.sous)}</p>
            <p>${esc(p.d)}</p>
            <ul class="sx-icos">${p.faits.map(f => `<li>${ico(f[0])}<span>${esc(f[1])}</span></li>`).join('')}</ul>
            ${tags(p.tags)}
            ${p.lien ? `<a class="sx-lien" href="${p.lien.href}" target="_blank" rel="noopener">${ico('lien')}${esc(p.lien.t)} <span aria-hidden="true">↗</span></a>` : ''}
          </article>
        </div>
      </section>`).join('');
  const autres = `
      <section class="sx-sec sx-autres" data-obj="chat">
        <div class="sx-col large">
          <h3 class="sx-h3 petit" data-rev>${esc(D.autresTitre)}</h3>
          <div class="sx-grille-proj">${D.autres.map((p, i) => `
            <article class="sx-carte sx-mini" id="sx-a${i}" data-rev data-cats="${p.cats.join(' ')}" style="--d:${i % 3}">
              ${cats(p.cats)}
              <p class="sx-mini-t">${ico(p.i)}<b>${esc(p.t)}</b>${p.prive ? `<span class="sx-prive" title="${U.prive}">${ico('cadenas')}</span>` : ''}</p>
              <p>${esc(p.d)}</p>${tags(p.tags)}
              ${p.lien ? `<a class="sx-lien" href="${p.lien.href}" target="_blank" rel="noopener">${esc(p.lien.t)} <span aria-hidden="true">↗</span></a>` : ''}
            </article>`).join('')}</div>
        </div>
      </section>`;
  const C = D.contact;
  const contact = `
      <section class="sx-sec sx-fin" id="sx-contact" data-obj="contact" data-nom="${U.contact}" data-num="08">
        <div class="sx-col">
          ${tete('08', C.titre)}
          <p class="sx-chapo" data-rev>${esc(C.chapo)}</p>
          <ul class="sx-contacts" data-rev>${C.liens.map(c => `<li><span>${esc(c.k)}</span><a href="${c.href}"${c.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(c.v)}</a></li>`).join('')}</ul>
          <div class="sx-actions" data-rev><button type="button" class="sx-btn" data-retour>${U.retourChats}</button></div>
        </div>
      </section>`;
  /* la version rapide : tout le CV en un écran, pour qui n'a que trente secondes ; et le PDF (tools/cv.cjs) */
  const Pv = D.preuve, pdf = EN ? 'cv-mathieu-woroniecki-en.pdf' : 'cv-mathieu-woroniecki.pdf', cvPage = EN ? 'cv-en.html' : 'cv.html';
  const rapide = `
  <div class="sx-rapide" role="dialog" aria-modal="true" aria-labelledby="sx-rapide-t" hidden>
    <div class="sx-rapide-page">
      <button type="button" class="sx-rapide-x" aria-label="${U.fermer}">×</button>
      <p class="sx-sur">${esc(U.rapide)}</p>
      <h2 class="sx-rapide-nom" id="sx-rapide-t">${esc(D.nom)}</h2>
      <p class="sx-role">${esc(A.titre)}</p>
      <p>${esc(A.these)}</p>
      <ul class="sx-faits">${A.faits.map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="sx-actions">
        <a class="sx-btn plein" href="${pdf}" download>${esc(U.pdf)}</a>
        ${C.liens.map(c => `<a class="sx-btn" href="${c.href}"${c.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(c.k)}</a>`).join('')}
        <a class="sx-btn" href="${cvPage}">${esc(EN ? 'Plain CV page' : 'Page CV simple')}</a>
      </div>
      <div class="sx-rapide-grille">
        <section><h3>${esc(U.preuve)} · MARKO</h3><ul class="sx-rapide-chiffres">${[Pv.etapes[0], Pv.etapes[3], Pv.etapes[4]].map(e => `<li><b>${esc((e.pre || '') + fmt(e.n, e.dec || 0) + (e.suf || ''))}</b> ${esc(e.u)}</li>`).join('')}</ul></section>
        <section><h3>${esc(U.parcours)}</h3><ul>${D.parcours.slice(0, 4).map(p => `<li><span class="sx-dates">${esc(p.dates)}</span> <b>${esc(p.lieu)}</b> · ${esc(p.poste)}</li>`).join('')}</ul></section>
        <section><h3>${esc(U.comp)}</h3><ul>${D.competences.map(c => `<li><b>${esc(c.t)}</b> · ${esc(c.groupes[0][1].slice(0, 5).join(', '))}</li>`).join('')}</ul></section>
        <section><h3>${esc(U.projets)}</h3><ul>${D.projets.map(p => `<li><b>${esc(p.t)}</b> · ${esc(p.sous)}</li>`).join('')}</ul></section>
      </div>
    </div>
  </div>`;
  return `
  <canvas class="sx-grille" aria-hidden="true"></canvas>
  <canvas class="sx-3d" aria-hidden="true"></canvas>
  <div class="sx-etiqs" aria-hidden="true">${Serieux3D.etiquettes().map(e => `<span class="sx-etiq ${e.cls}" data-nom="${e.nom}" data-i="${e.i}"><i></i>${esc(e.t)}</span>`).join('')}</div>
  <div class="sx-defile" tabindex="-1">
    <main class="sx-page">
      ${accueil}${iaPin}${iaSuite}${methode}${preuve}${impact}${parcours}${formation}${comp}${projets}${autres}${contact}
      <footer class="sx-pied"><span>${esc(D.nom)}</span><span>${U.pied}</span></footer>
    </main>
  </div>
  <header class="sx-haut">
    <a class="sx-marque" href="#" aria-label="${U.haut}"><b>MW</b><span>${esc(D.nom)}</span></a>
    <nav class="sx-plan" aria-label="${U.plan}"></nav>
    <div class="sx-outils">
      <button type="button" class="sx-outil" data-rapide>${esc(U.rapide)}</button>
      <a class="sx-outil" href="${pdf}" download aria-label="${esc(U.pdf)}">PDF</a>
      <button type="button" class="sx-outil" data-langue aria-label="${esc(U.autreLangueAria)}">${U.autreLangue}</button>
    </div>
    <button type="button" class="sx-retour" data-retour aria-label="${U.retourAria}">
      <svg viewBox="0 0 24 20" aria-hidden="true"><path d="M3 18V6.5L2 1.5l5.2 3.2h9.6L22 1.5l-1 5V18z"/><path class="yeux" d="M8.2 10.2v1.4M15.8 10.2v1.4"/></svg>
      <span>${U.modeChat}</span>
    </button>
  </header>
  <div class="sx-barre" aria-hidden="true"><i></i></div>${rapide}
  <div class="sx-cartouche" aria-hidden="true">
    <div><span>${U.projet}</span><b>CV — ${esc(D.nom)}</b></div>
    <div><span>${U.planche}</span><b class="c-planche">00 / 08 · ${U.accueil}</b></div>
    <div class="c2"><span>${U.echelle}</span><b>1:1</b></div><div class="c2"><span>${U.rev}</span><b>09.2026</b></div>
    <div class="c-xy"><span>${U.curseur}</span><b class="c-pos">X 0000 · Y 0000</b></div>
  </div>`;
}
function fmt(n, dec) { return Number(n).toLocaleString(U.loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ /g, ' '); }

function batir() {
  el = document.createElement('div'); el.id = 'serieux'; el.hidden = true;
  el.setAttribute('role', 'document'); el.setAttribute('aria-label', U.aria + D.nom); el.lang = EN ? 'en' : 'fr';
  /* la 3D d'abord : ses étiquettes font partie de la page */
  const tmp = document.createElement('canvas'); tmp.className = 'sx-3d';
  Serieux3D.init(tmp, D);
  el.innerHTML = page(); document.body.appendChild(el);
  el.querySelector('canvas.sx-3d').replaceWith(tmp); toile3d = tmp;
  D.projets.forEach((p, i) => { const o = Serieux3D.OBJ && Serieux3D.OBJ[p.o]; if (o && i % 2) o.pl = Object.assign({}, o.pl, { x: -0.235 }); });
  droites = [...el.querySelectorAll('.sx-projet.droite')];
  const leg = [...el.querySelectorAll('.sx-legende button')];
  leg.forEach(b => b.addEventListener('click', () => {
    const c = el.dataset.cat === b.dataset.c ? '' : b.dataset.c;   // recliquer une étiquette la retire
    if (c) el.dataset.cat = c; else delete el.dataset.cat;
    el.querySelectorAll('.sx-sommaire li').forEach(n => n.classList.toggle('hors', !!c && !n.dataset.cats.split(' ').includes(c)));   // l'étiquette trie le sommaire, juste en dessous
    leg.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.c === c)));
  }));
  defile = el.querySelector('.sx-defile'); grille = el.querySelector('.sx-grille'); gx = grille.getContext('2d');
  etiqs = [...el.querySelectorAll('.sx-etiq')].map(e => ({ e, nom: e.dataset.nom, i: +e.dataset.i }));
  secs = [...el.querySelectorAll('.sx-sec')];
  pins = [...el.querySelectorAll('.sx-pin')].map(s => ({ s, n: +s.dataset.pas, obj: s.dataset.obj, et: [...s.querySelectorAll('.sx-etape')], pt: [...s.querySelectorAll('.sx-points li')], k: -1 }));
  fonds = secs.filter(s => s.dataset.fond).map(s => ({ s, c: s.dataset.fond.split(',') }));
  cart.planche = el.querySelector('.c-planche'); cart.pos = el.querySelector('.c-pos'); cart.barre = el.querySelector('.sx-barre i');
  /* le plan des sections */
  const nav = el.querySelector('.sx-plan');
  secs.forEach(s => { if (!s.dataset.nom) return; const b = document.createElement('a'); b.href = '#'; b.innerHTML = `<i>${s.dataset.num}</i><span>${esc(s.dataset.nom)}</span>`;
    b.addEventListener('click', e => { e.preventDefault(); va(s); }); nav.appendChild(b); navLiens.push({ b, s }); });
  el.querySelectorAll('a[href^="#sx-"]').forEach(a => a.addEventListener('click', e => { const s = el.querySelector(a.getAttribute('href')); if (s) { e.preventDefault(); va(s); } }));
  /* la version rapide : s'ouvre et se ferme (Échap, la croix, un clic à côté) ; la langue : on recharge dans l'autre, en restant ici */
  const rap = el.querySelector('.sx-rapide'), rapBtn = el.querySelector('[data-rapide]');
  const rapide = on => { rap.hidden = !on; if (on) rap.querySelector('.sx-rapide-x').focus(); else rapBtn.focus(); };
  rapBtn.addEventListener('click', () => rapide(true));
  rap.addEventListener('click', e => { if (e.target === rap || e.target.closest('.sx-rapide-x')) rapide(false); });
  el.addEventListener('keydown', e => { if (e.key === 'Escape' && !rap.hidden) { e.stopPropagation(); rapide(false); } });
  el.querySelector('[data-langue]').addEventListener('click', () => {
    try { localStorage.setItem('pf-lang', EN ? 'fr' : 'en'); } catch (e) {}
    const u = new URL(location.href); u.searchParams.set('serieux', ''); location.href = u.pathname + u.search.replace('serieux=', 'serieux') + u.hash; });
  el.querySelector('.sx-marque').addEventListener('click', e => { e.preventDefault(); defile.scrollTo({ top: 0, behavior: reduit ? 'auto' : 'smooth' }); });
  el.querySelectorAll('[data-retour]').forEach(b => b.addEventListener('click', () => ferme()));
  /* les apparitions */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } }), { root: defile, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  el.querySelectorAll('[data-rev]').forEach(n => io.observe(n));
  /* le mode chat n'entend rien de ce qui se passe ici (ses écouteurs sont sur window) */
  ['pointerdown', 'pointerup', 'pointermove', 'click', 'wheel', 'keydown', 'keyup', 'touchstart', 'touchmove', 'touchend', 'contextmenu'].forEach(k => el.addEventListener(k, e => e.stopPropagation(), { passive: true }));
  /* tourner l'objet à la souris */
  const texte = t => t.closest('a,button,.sx-carte,.sx-etape,h1,h2,h3,p,li');
  defile.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || texte(e.target)) return;
    if (!Serieux3D.pres(e.clientX, e.clientY)) return;
    prise = { x: e.clientX, y: e.clientY }; el.classList.add('prise'); try { defile.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
  });
  defile.addEventListener('pointermove', e => {
    souris.x = e.clientX; souris.y = e.clientY;
    if (prise) { const dx = e.clientX - prise.x, dy = e.clientY - prise.y; prise.x = e.clientX; prise.y = e.clientY; rot.vy = dx * 0.012; rot.vx = dy * 0.012; rot.y += rot.vy; rot.x += rot.vx; return; }
    el.classList.toggle('peut-prendre', e.pointerType === 'mouse' && !texte(e.target) && Serieux3D.pres(e.clientX, e.clientY));
  });
  const lache = () => { if (!prise) return; prise = null; el.classList.remove('prise'); };
  defile.addEventListener('pointerup', lache); defile.addEventListener('pointercancel', lache);
  defile.addEventListener('pointerleave', () => { souris.x = -1; });
  addEventListener('resize', () => { if (ouvert) taille(); });
}
function va(s) {
  const pin = s.classList.contains('sx-pin');
  const haut = s.getBoundingClientRect().top - defile.getBoundingClientRect().top + defile.scrollTop - (s.classList.contains('sx-sec') ? 0 : innerHeight * 0.2);   // une carte : un peu sous le haut
  defile.scrollTo({ top: haut - (!pin && innerWidth < 900 ? 56 : 0), behavior: reduit ? 'auto' : 'smooth' });
  if (!s.classList.contains('sx-sec')) { s.classList.remove('vise'); void s.offsetWidth; s.classList.add('vise'); }
}

/* les compteurs */
function compte(n) {
  if (!n || n.dataset.fait) return; n.dataset.fait = 1;
  const cible = +n.dataset.n, dec = +n.dataset.dec, pre = n.dataset.pre, suf = n.dataset.suf, deb = performance.now(), duree = reduit ? 0 : 1300;
  const pas = () => { const k = duree ? c01((performance.now() - deb) / duree) : 1, v = cible * (1 - Math.pow(1 - k, 3)); n.textContent = pre + fmt(k < 1 ? v : cible, dec) + suf; if (k < 1) requestAnimationFrame(pas); };
  pas();
}

/* ——— le fond : le quadrillage du plan, qui glisse avec le défilement et s'éclaire sous la souris ——— */
let GW = 1, GH = 1, gdpr = 1;
function taille() {
  gdpr = Math.min(window.devicePixelRatio || 1, 2); GW = el.clientWidth; GH = el.clientHeight;
  grille.width = Math.round(GW * gdpr); grille.height = Math.round(GH * gdpr); Serieux3D.resize();
}
function fond(intro, dy) {
  const g = gx, P = 24, G = P * 5; g.setTransform(gdpr, 0, 0, gdpr, 0, 0); g.clearRect(0, 0, GW, GH);
  const off = -((dy * 0.3) % G + G) % G;
  const trace = (pas, a) => {
    g.beginPath(); g.strokeStyle = `rgba(238,245,255,${a})`; g.lineWidth = 1;
    for (let x = (GW / 2) % pas; x < GW; x += pas) { const k = sm(intro * 1.6 - Math.abs(x - GW / 2) / GW); if (k <= 0) continue; const h = GH * k; g.moveTo(Math.round(x) + 0.5, GH / 2 - h / 2); g.lineTo(Math.round(x) + 0.5, GH / 2 + h / 2); }
    for (let y = off % pas; y < GH; y += pas) { const k = sm(intro * 1.6 - Math.abs(y - GH / 2) / GH); if (k <= 0) continue; const w = GW * k; g.moveTo(GW / 2 - w / 2, Math.round(y) + 0.5); g.lineTo(GW / 2 + w / 2, Math.round(y) + 0.5); }
    g.stroke();
  };
  trace(P, 0.06); trace(G, 0.14);
  if (souris.x >= 0 && intro >= 1) {   // la loupe : le quadrillage s'éclaire autour du curseur, et la croix du dessinateur
    const r = 150, grd = g.createRadialGradient(souris.x, souris.y, 0, souris.x, souris.y, r);
    grd.addColorStop(0, 'rgba(238,245,255,0.07)'); grd.addColorStop(1, 'rgba(238,245,255,0)'); g.fillStyle = grd; g.fillRect(souris.x - r, souris.y - r, r * 2, r * 2);
    g.beginPath(); g.strokeStyle = 'rgba(238,245,255,0.09)'; g.setLineDash([2, 5]);
    g.moveTo(0, Math.round(souris.y) + 0.5); g.lineTo(GW, Math.round(souris.y) + 0.5); g.moveTo(Math.round(souris.x) + 0.5, 0); g.lineTo(Math.round(souris.x) + 0.5, GH); g.stroke(); g.setLineDash([]);
  }
}
/* la couleur du papier : chaque projet a la sienne, on y glisse en défilant */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function teinte(vh) {
  const acc = FOND0.map(hex); let wt = 0;
  const cols = FOND0.map(hex);
  fonds.forEach(f => {
    const r = f.s.getBoundingClientRect(), w = Math.min(sm((vh * 0.85 - r.top) / (vh * 0.5)), sm((r.bottom - vh * 0.15) / (vh * 0.5)));
    if (w <= 0) return; const c = f.c.map(hex); for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) cols[k][j] += (c[k][j] - cols[k][j]) * w; wt = Math.max(wt, w);
  });
  const s = cols.map(c => `rgb(${c.map(Math.round).join(',')})`);
  if (s[1] !== teinte.der) { teinte.der = s[1]; el.style.setProperty('--sx-hi', s[0]); el.style.setProperty('--sx-fond', s[1]); el.style.setProperty('--sx-bas', s[2]); el.style.setProperty('--sx-bas-rgb', cols[2].map(Math.round).join(',')); }
}

/* ——— chaque image : le défilement donne la présence de chaque objet et l'étape lue ——— */
function image(now) {
  if (!ouvert) return;
  boucle = requestAnimationFrame(image);
  const t = (now - t0) / 1000, intro = reduit ? 1 : c01((now - tIntro) / 1400), vh = defile.clientHeight, st = defile.scrollTop, large = innerWidth >= 900;
  /* chaque suite de sections qui partagent un objet forme un bloc ; l'objet se rassemble en entrant, s'éclate en sortant */
  const poids = {}; let blocs = [], cur = null;
  secs.forEach(s => { const r = s.getBoundingClientRect(); if (cur && cur.o === s.dataset.obj) cur.b = r.bottom; else { cur = { o: s.dataset.obj, t: r.top, b: r.bottom }; blocs.push(cur); } });
  blocs.forEach((b, i) => {
    const ent = i === 0 ? 1 : sm((vh * 0.78 - b.t) / (vh * 0.45)), sor = i === blocs.length - 1 ? 1 : sm((b.b - vh * 0.22) / (vh * 0.45));
    let w = Math.min(ent, sor); if (i === 0) w *= sm(intro * 1.4 - 0.35);
    const loc = c01((vh * 0.55 - b.t) / Math.max(1, b.b - b.t));
    const p = poids[b.o]; if (!p || w > p.w) poids[b.o] = { w, loc };
  });
  /* les écrans épinglés : l'étape lue, et son avancement */
  pins.forEach(P => {
    const r = P.s.getBoundingClientRect(), pr = c01(-r.top / Math.max(1, r.height - vh)), pas = Math.min(P.n, pr * P.n * 1.0001), k = Math.min(P.n - 1, Math.floor(pas));
    if (poids[P.obj]) poids[P.obj].pas = pas;
    if (k !== P.k) {
      P.k = k; P.et.forEach((e, i) => { e.classList.toggle('on', i === k); e.classList.toggle('passe', i < k); });
      P.pt.forEach((e, i) => { e.classList.toggle('on', i === k); e.classList.toggle('passe', i < k); });
      const n = P.et[k] && P.et[k].querySelector('.sx-n'); if (n) compte(n);
    }
  });
  /* la souris : un peu de parallaxe ; la prise : on tourne, puis l'objet revient doucement à sa chorégraphie */
  const mx = souris.x >= 0 ? (souris.x / innerWidth - 0.5) : 0, my = souris.x >= 0 ? (souris.y / innerHeight - 0.5) : 0;
  souris.mx += (mx - souris.mx) * 0.06; souris.my += (my - souris.my) * 0.06;
  if (!prise) { rot.y += rot.vy; rot.x += rot.vx; rot.vy *= 0.93; rot.vx *= 0.93; rot.y *= 0.985; rot.x *= 0.985; }
  Serieux3D.rendu(poids, t, { large, mx: souris.mx, my: souris.my, prx: rot.x, pry: rot.y, sc: st });
  fond(intro, st); teinte(vh);
  /* les étiquettes accrochées aux objets */
  etiqs.forEach(E => {
    const a = Serieux3D.ancre(E.nom, E.i);
    if (!a || a.op < 0.02) { if (E.vis !== 0) { E.e.style.opacity = 0; E.vis = 0; } return; }
    E.vis = 1; E.e.style.opacity = Math.min(1, a.op).toFixed(3);
    E.e.style.transform = a.bas ? `translate(${Math.round(a.x)}px,${Math.round(a.y + 6)}px) translateX(-50%)` : `translate(${Math.round(a.x + 16)}px,${Math.round(a.y - 9)}px)`;
    E.e.classList.toggle('on', a.on); E.e.classList.toggle('bas', a.bas);
  });
  /* la section active : le plan, le cartouche, la barre */
  let act = 0; navLiens.forEach((n, i) => { if (n.s.getBoundingClientRect().top < vh * 0.5) act = i; });
  if (act !== active) { active = act; navLiens.forEach((n, i) => n.b.classList.toggle('on', i === act)); const s = navLiens[act].s; cart.planche.textContent = `${s.dataset.num} / 08 · ${s.dataset.nom}`; }
  el.classList.toggle('sans-cartouche', droites.some(s => { const r = s.getBoundingClientRect(); return r.top < vh * 0.7 && r.bottom > vh * 0.3; }));
  cart.barre.style.transform = `scaleX(${c01(st / Math.max(1, defile.scrollHeight - vh))})`;
  if (souris.x >= 0) cart.pos.textContent = `X ${String(Math.round(souris.x)).padStart(4, '0')} · Y ${String(Math.round(souris.y + st)).padStart(4, '0')}`;
}

/* ——— ouvrir, fermer ——— */
const autres = () => [...document.body.children].filter(n => n !== el && n.tagName !== 'SCRIPT');
function ouvre(o) {
  o = o || {};
  if (!el) batir();
  if (ouvert) return Promise.resolve();
  const x = o.x ?? innerWidth / 2, y = o.y ?? innerHeight / 2, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  el.style.setProperty('--ox', x + 'px'); el.style.setProperty('--oy', y + 'px'); el.style.setProperty('--or', Math.ceil(r) + 'px');
  /* o.papier : le bleu est déjà posé à l'écran (les chats l'ont collé comme du papier peint, js/fuite.js) ; on ne découpe plus de cercle,
     les éléments du CV arrivent l'un après l'autre (html .arrive, css/serieux.css). Sans papier : le cercle, plus court qu'avant. */
  el.classList.remove('ferme', 'la', 'arrive', 'papier'); el.classList.toggle('instant', (!!o.instant && !o.papier) || reduit); el.classList.toggle('papier', !!o.papier);
  /* avec papier, même « instant » : le fond est là tout de suite, les éléments arrivent à leur tour */
  if ((!o.instant || o.papier) && !reduit) { void el.offsetWidth; el.classList.add('arrive'); clearTimeout(ouvre.fin); ouvre.fin = setTimeout(() => el.classList.remove('arrive'), 1600); }
  ouvert = true; el.hidden = false; root.classList.add('serieux');
  autres().forEach(n => { if (!n.hasAttribute('inert')) { n.setAttribute('inert', ''); n.dataset.sxInert = '1'; } });
  taille(); defile.scrollTop = 0; active = -1; pins.forEach(P => { P.k = -1; }); t0 = tIntro = performance.now();
  getComputedStyle(el).clipPath; el.classList.add('la');
  try { const u = new URL(location.href); if (!u.searchParams.has('serieux')) { u.searchParams.set('serieux', ''); history.replaceState(history.state, '', u.pathname + u.search.replace('serieux=', 'serieux') + u.hash); } } catch (e) {}
  cancelAnimationFrame(boucle); boucle = requestAnimationFrame(image);
  setTimeout(() => defile.focus({ preventScroll: true }), 50);
  dispatchEvent(new CustomEvent('serieux:ouvert'));
  return new Promise(res => setTimeout(res, o.papier ? 60 : o.instant || reduit ? 0 : 480));
}
function ferme() {
  if (!ouvert) return Promise.resolve();
  const b = el.querySelector('.sx-retour').getBoundingClientRect();
  el.style.setProperty('--ox', (b.left + b.width / 2) + 'px'); el.style.setProperty('--oy', (b.top + b.height / 2) + 'px');
  el.classList.remove('instant'); el.classList.add('ferme'); el.classList.remove('la');
  return new Promise(res => setTimeout(() => {
    ouvert = false; cancelAnimationFrame(boucle); el.hidden = true; el.classList.remove('ferme'); root.classList.remove('serieux');
    autres().forEach(n => { if (n.dataset.sxInert) { n.removeAttribute('inert'); delete n.dataset.sxInert; } });
    try { const u = new URL(location.href); if (u.searchParams.has('serieux')) { u.searchParams.delete('serieux'); history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash); } } catch (e) {}
    dispatchEvent(new CustomEvent('serieux:ferme')); res();
  }, reduit ? 0 : 750));
}

/* ?serieux : directement dans le mode sérieux */
if (/[?&]serieux(=|&|$)/.test(location.search)) ouvre({ instant: true });
return { ouvre, ferme, get ouvert() { return ouvert; } };
})();
