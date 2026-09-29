/* Le CV en page simple et en PDF, tirés des mêmes données que le mode sérieux (js/serieux-donnees.js et js/serieux-donnees-en.js).
   Produit, à la racine du site :
     cv.html, cv-en.html                                  une page lisible par les moteurs et les aperçus de partage (LinkedIn…)
     cv-mathieu-woroniecki.pdf, cv-mathieu-woroniecki-en.pdf   le même CV, à télécharger (sans numéro de téléphone)
   À relancer après chaque changement des données :  node tools/cv.cjs
   (le PDF demande Playwright ; sans lui, seules les pages sont écrites). Les PDF sont à la racine, pas dans media/ :
   media/* est mis en cache un an (vercel.json), un CV mis à jour doit pouvoir remplacer l'ancien sous le même nom. */
const fs = require('fs'), path = require('path');
const RAC = path.join(__dirname, '..'), SITE = 'https://mathieu.blue';
global.window = {};
require(path.join(RAC, 'js/serieux-donnees.js')); require(path.join(RAC, 'js/serieux-donnees-en.js'));

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const brut = s => String(s).replace(/<[^>]+>/g, '');   // les faits de l'accueil contiennent du <b>
const fmt = (n, loc) => Number(n).toLocaleString(loc);

const TX = {
  fr: { fichier: 'cv.html', pdf: 'cv-mathieu-woroniecki.pdf', autre: 'cv-en.html', autreT: 'English version', loc: 'fr-FR', lang: 'fr',
    profil: 'Profil', methode: 'Méthode', preuve: 'La preuve : MARKO', exp: 'Expérience', comp: 'Compétences', proj: 'Projets choisis', autres: 'Autres projets',
    form: 'Formation', langues: 'Langues', interactif: 'Version interactive, en 3D', telecharger: 'Télécharger en PDF', lieu: 'Paris',
    desc: 'CV de Mathieu Woroniecki, architecte IA et CTO de MARKO : IA générative, RAG, agents, architecture, direction technique.' },
  en: { fichier: 'cv-en.html', pdf: 'cv-mathieu-woroniecki-en.pdf', autre: 'cv.html', autreT: 'Version française', loc: 'en-US', lang: 'en',
    profil: 'Profile', methode: 'Method', preuve: 'The proof: MARKO', exp: 'Experience', comp: 'Skills', proj: 'Selected projects', autres: 'Other projects',
    form: 'Education', langues: 'Languages', interactif: 'Interactive 3D version', telecharger: 'Download as PDF', lieu: 'Paris, France',
    desc: 'CV of Mathieu Woroniecki, AI Architect & CTO of MARKO: generative AI, RAG, agents, architecture, technical leadership.' }
};

function page(D, X) {
  const A = D.accueil, M = D.methode, P = D.preuve, C = D.contact;
  const mail = C.liens.find(l => l.href.startsWith('mailto:')), liens = C.liens.filter(l => l.href.startsWith('http'));
  const savoir = D.competences.flatMap(c => c.groupes.flatMap(g => g[1])).slice(0, 40);
  // la même personne que sur l'accueil (index.html, @id #mathieu) : Google et les IA relient les deux pages à une seule fiche
  const IMG = SITE + '/media/partage/mathieu-woroniecki-1.png';
  const ld = { '@context': 'https://schema.org', '@type': 'Person', '@id': SITE + '/#mathieu', name: D.nom, jobTitle: A.titre, url: SITE + '/', image: IMG,
    mainEntityOfPage: { '@type': 'ProfilePage', '@id': `${SITE}/${X.fichier.replace('.html', '')}#page`, url: `${SITE}/${X.fichier.replace('.html', '')}`, inLanguage: X.lang },
    email: mail ? mail.v : undefined, sameAs: liens.map(l => l.href), address: { '@type': 'PostalAddress', addressLocality: 'Paris', addressCountry: 'FR' },
    worksFor: { '@type': 'Organization', name: 'MARKO', url: 'https://marko.fr' }, knowsAbout: savoir, knowsLanguage: X.lang === 'fr' ? ['fr', 'en'] : ['fr', 'en'] };
  const titre = `${D.nom} · ${A.titre}`;
  return `<!doctype html>
<html lang="${X.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(X.desc)}">
<link rel="canonical" href="${SITE}/${X.fichier.replace('.html', '')}">
<link rel="alternate" hreflang="fr" href="${SITE}/cv"><link rel="alternate" hreflang="en" href="${SITE}/cv-en">
<meta property="og:type" content="profile"><meta property="og:title" content="${esc(titre)}"><meta property="og:description" content="${esc(X.desc)}">
<meta property="og:url" content="${SITE}/${X.fichier.replace('.html', '')}"><meta property="profile:first_name" content="Mathieu"><meta property="profile:last_name" content="Woroniecki">
<meta property="og:image" content="${IMG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${IMG}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
/* Le CV à lire et à imprimer : papier clair, l'encre du plan (bleu) pour les titres, l'accent doré en filet. Pensé pour deux pages A4. */
:root{--encre:#132a52;--texte:#1d2330;--doux:#56607a;--trait:#d5dbe8;--accent:#c9922e;--fond:#f6f7fb;--papier:#fff}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--encre:#cfe0ff;--texte:#e4e8f2;--doux:#a3adc4;--trait:#34405a;--accent:#ffd98a;--fond:#0f1a30;--papier:#16223d}}
*{box-sizing:border-box}
html{background:var(--fond)}
body{margin:0;background:var(--fond);color:var(--texte);font:400 15px/1.5 Barlow,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.feuille{max-width:880px;margin:24px auto;padding:44px 52px;background:var(--papier);box-shadow:0 1px 0 var(--trait),0 12px 40px rgba(19,42,82,.08)}
header{display:grid;grid-template-columns:1fr auto;gap:8px 24px;align-items:end;padding-bottom:18px;border-bottom:2px solid var(--encre)}
h1{margin:0;font:700 44px/.95 "Barlow Condensed",sans-serif;letter-spacing:.01em;text-transform:uppercase;color:var(--encre)}
.role{margin:6px 0 0;font:600 17px/1.2 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
.coord{margin:0;padding:0;list-style:none;text-align:right;font:500 12px/1.7 "IBM Plex Mono",monospace;color:var(--doux)}
.coord a{color:var(--encre);text-decoration:none}
.outils{display:flex;flex-wrap:wrap;gap:8px 18px;margin:14px 0 0;font:500 12px/1 "IBM Plex Mono",monospace;letter-spacing:.04em;text-transform:uppercase}
.outils a{color:var(--encre)}
h2{margin:26px 0 10px;font:700 15px/1 "Barlow Condensed",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--encre);display:flex;align-items:center;gap:12px}
h2::after{content:"";flex:1;height:1px;background:var(--trait)}
h3{margin:0;font:600 15px/1.3 Barlow,sans-serif;color:var(--encre)}
p{margin:0 0 6px}
.chapo{font-size:15.5px}
.faits{display:flex;flex-wrap:wrap;gap:4px 20px;margin:8px 0 0;padding:0;list-style:none;font:500 12.5px/1.5 "IBM Plex Mono",monospace;color:var(--doux)}
.faits b{color:var(--encre);font-weight:500}
.grille{display:grid;grid-template-columns:1fr 1fr;gap:6px 28px}
.etape b,.chiffre b{color:var(--encre)}
.chiffres{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.chiffre{border-left:2px solid var(--accent);padding:2px 0 2px 10px}
.chiffre strong{display:block;font:700 26px/1 "Barlow Condensed",sans-serif;color:var(--encre)}
.chiffre span{font-size:13px;color:var(--doux)}
.poste{display:grid;grid-template-columns:128px 1fr;gap:4px 16px;padding:8px 0;border-top:1px solid var(--trait);break-inside:avoid}
.poste:first-of-type{border-top:0}
.dates{font:500 11.5px/1.5 "IBM Plex Mono",monospace;color:var(--doux);padding-top:2px}
.poste ul{margin:4px 0 0;padding-left:16px;color:var(--doux);font-size:14px}
.poste p{font-size:14px}
.groupe{margin:0 0 3px;font-size:14px}
.groupe span{font:500 11px/1 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--doux);margin-right:6px}
.projet{break-inside:avoid;margin-bottom:6px;font-size:14px}
.projet b{color:var(--encre)}
.projet a{color:var(--encre)}
.petit{font-size:13.5px;color:var(--doux)}
@media (max-width:640px){.feuille{margin:0;padding:24px 16px}header{grid-template-columns:1fr}.coord{text-align:left}h1{font-size:36px}.grille,.chiffres{grid-template-columns:1fr}.poste{grid-template-columns:1fr}}
@page{size:A4;margin:10mm 13mm}
@media print{html,body{background:#fff}body{font-size:10.5px;line-height:1.38}.feuille{max-width:none;margin:0;padding:0;box-shadow:none}.outils,.faits,.etape .d,.projet .d,.petit.source{display:none}
  .grille{gap:2px 22px}.poste{grid-template-columns:96px 1fr}.poste ul{margin-top:2px}p{margin-bottom:3px}h3{font-size:12px}.dates{font-size:9.5px}
  h1{font-size:30px}.role{font-size:14px}h2{margin:9px 0 4px;font-size:12px}.poste{padding:3px 0}.poste p,.poste ul,.groupe,.projet,.etape,.chapo{font-size:10.5px}.chiffre strong{font-size:17px}.chiffre span{font-size:9.5px}
  .faits{font-size:9.5px}.coord{font-size:9.5px;line-height:1.5}.petit{font-size:10px}header{padding-bottom:10px}.comps{columns:2;column-gap:22px}.groupe-bloc{break-inside:avoid}.groupe{font-size:9.8px}a{text-decoration:none}}
</style>
</head>
<body>
<main class="feuille">
<header>
  <div><h1>${esc(D.nom)}</h1><p class="role">${esc(A.titre)}</p></div>
  <ul class="coord"><li>${esc(X.lieu)}</li>${mail ? `<li><a href="${mail.href}">${esc(mail.v)}</a></li>` : ''}${liens.map(l => `<li><a href="${l.href}">${esc(l.v)}</a></li>`).join('')}<li><a href="${SITE}/">mathieu.blue</a></li></ul>
</header>
<p class="outils"><a href="${SITE}/?serieux">${esc(X.interactif)} ↗</a><a href="${X.pdf}" download>${esc(X.telecharger)}</a><a href="${X.autre}" hreflang="${X.lang === 'fr' ? 'en' : 'fr'}">${esc(X.autreT)}</a></p>

<h2>${esc(X.profil)}</h2>
<p class="chapo">${esc(A.these)}</p>
${(A.duo || []).map(c => `<p><b>${esc(c.t)}.</b> ${esc(c.d)}</p>`).join('')}
<p>${esc(A.maintenant)}</p>
<ul class="faits">${A.faits.map(f => `<li>${f}</li>`).join('')}</ul>

<h2>${esc(X.methode)} · ${esc(M.titre)}</h2>
<p>${esc(M.chapo)}</p>
<div class="grille">${M.etapes.map(e => `<p class="etape"><b>${esc(e.t)}.</b> <span class="d">${esc(e.d)}</span></p>`).join('')}</div>

<h2>${esc(X.preuve)}</h2>
<div class="chiffres">${[P.etapes[0], P.etapes[3], P.etapes[4]].map(e => `<p class="chiffre"><strong>${esc((e.pre || '') + fmt(e.n, X.loc) + (e.suf || ''))}</strong><span>${esc(e.u)}</span></p>`).join('')}</div>
<p class="petit source">${esc(P.chapo)}</p>

<h2>${esc(X.proj)}</h2>
${D.projets.map(p => `<p class="projet"><b>${esc(p.t)}</b> · ${esc(p.sous)}.<span class="d"> ${esc(p.d)}</span>${p.lien ? ` <a href="${p.lien.href}">${esc(p.lien.href.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : ''}</p>`).join('\n')}
<p class="petit"><b>${esc(X.autres)} :</b> ${D.autres.map(p => esc(p.t)).join(' · ')}</p>

<h2>${esc(X.comp)}</h2>
<div class="comps">${D.competences.map(c => `<div class="groupe-bloc"><h3>${esc(c.t)}</h3>${c.groupes.map(g => `<p class="groupe"><span>${esc(g[0])}</span>${g[1].map(esc).join(' · ')}</p>`).join('')}</div>`).join('\n')}</div>

<h2>${esc(X.exp)}</h2>
${D.parcours.map(p => `<div class="poste"><p class="dates">${esc(p.dates)}</p><div><h3>${esc(p.lieu)} · ${esc(p.poste)}</h3><p>${esc(p.d)}</p>${p.l.length ? `<ul>${p.l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>`).join('\n')}

<h2>${esc(X.form)} · ${esc(X.langues)}</h2>
<div class="grille"><div>${D.formation.map(f => `<p><span class="dates">${esc(f.dates)}</span> <b>${esc(f.t)}</b>, ${esc(f.o)}</p>`).join('')}</div><p>${D.langues.map(esc).join(' · ')}</p></div>
</main>
</body>
</html>
`;
}

(async () => {
  const sorties = [];
  for (const [cle, D] of [['fr', window.SERIEUX_DONNEES], ['en', window.SERIEUX_DONNEES_EN]]) {
    const X = TX[cle]; fs.writeFileSync(path.join(RAC, X.fichier), page(D, X)); sorties.push(X); console.log('écrit', X.fichier);
  }
  let pw = null; try { pw = require('playwright'); } catch (e) { try { pw = require('/opt/node22/lib/node_modules/playwright'); } catch (e2) {} }
  if (!pw) { console.log('pas de Playwright : PDF non produits'); return; }
  const b = await pw.chromium.launch(), p = await b.newPage();
  for (const X of sorties) {
    await p.goto('file://' + path.join(RAC, X.fichier), { waitUntil: 'load' }).catch(() => {});
    await p.waitForTimeout(800);
    await p.pdf({ path: path.join(RAC, X.pdf), format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log('écrit', X.pdf);
  }
  await b.close();
})();
