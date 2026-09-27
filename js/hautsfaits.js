/* Les hauts faits (27/09, Mathieu : « un système de hauts faits avec des badges à gagner, des badges plus durs que d'autres à avoir,
   avec à chaque fois un petit indice ; une big animation quand on en débloque un, avec le badge et le nom du haut fait ;
   et on peut voir la liste de ceux obtenus, restants ou cachés en cliquant sur une icône du menu »).
   - Quatre rangs : facile (bronze), moyen (argent), difficile (or), secret (caché : ni nom ni badge avant de l'avoir, juste un indice sibyllin).
   - Ils se gagnent avec le carnet de découvertes (js/decouvertes.js, l'événement « dex ») et quelques compteurs gardés dans le navigateur
     (caresses, lancers, visites, minutes passées avec les chats) : localStorage « pf-hauts ».
   - Débloqué : le badge arrive au centre de l'écran, tourne, rebondit, des rayons derrière lui, des confettis ; son nom, son rang.
   - Le trophée dans la barre de gauche ouvre la vitrine : obtenus en couleur, restants en gris avec leur indice, secrets en « ? ». */
window.HF = (() => {
if (!window.Chats || !Chats.K || !window.Dex) return null;
const K = Chats.K, { Wd, H } = K;
const EN = () => window.I18N && I18N.lang && I18N.lang !== 'fr';
const T = (fr, en) => EN() ? en : fr;
const TY = (window.Chat && Chat.TYPES) || {};
const RACES = Object.keys(TY).filter(k => !TY[k].rare);
const MANIES = RACES.filter(k => Dex.TOUS.some(d => d.id === 'manie-' + k));
const EVTS = (Dex.FAM.find(f => f.id === 'evts') || { L: [] }).L.map(d => d.id);

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
  ['nuit', 'argent', '☾', 'Oiseau de nuit', 'Night owl', 'Reviens tard le soir.', 'Come back late at night.', () => v('nuit')],
  ['masseur', 'argent', '∞', 'Masseur', 'Masseur', 'Une caresse. Et encore une. Cent fois.', 'One pet. And another. A hundred times.', () => N.caresses >= 100],
  ['fidele', 'argent', '⌂', 'Fidèle', 'Loyal', 'Revenir voir les chats, encore et encore.', 'Come back to see the cats, again and again.', () => N.visites >= 3],

  ['raretes', 'or', '✦', 'Chasseur de raretés', 'Rarity hunter', 'Six visiteurs très rares. Un clic dans le vide, parfois…', 'Six very rare visitors. A click on empty space, sometimes…', () => v('tousrares')],
  ['moitie', 'or', '◐', 'À mi-chemin', 'Halfway', 'La moitié du carnet de découvertes.', 'Half the discovery notebook.', () => pct() >= 0.5],
  ['carnet', 'or', '★', 'Carnet complet', 'Full notebook', 'Absolument tout le carnet.', 'The whole notebook. All of it.', () => pct() >= 1],
  ['ethologue', 'or', '❀', 'Éthologue', 'Ethologist', 'Toutes les manies, de tous les chats.', 'Every quirk of every cat.', () => MANIES.length && nv(MANIES.map(k => 'manie-' + k)) >= MANIES.length],
  ['heure', 'or', '⧗', 'Une heure avec eux', 'An hour with them', 'Le temps passe vite ici. Une heure en tout.', 'Time flies here. One hour in total.', () => N.minutes >= 60],
  ['foule', 'or', '☷', 'La grande foule', 'The big crowd', 'Douze chats à l’écran en même temps.', 'Twelve cats on screen at once.', () => v('foule')],
  ['chaine', 'or', 'ϟ', 'Réaction en chaîne', 'Chain reaction', 'Une tour de caisses, de l’eau juste à côté, et des chats dessus.', 'A crate tower, water right next to it, and cats on top.', () => v('tourplouf')],

  ['crepe', 'secret', '◒', 'La crêpe', 'Pancake', 'Question de poids.', 'A matter of weight.', () => v('crepe')],
  ['rancune', 'secret', '☁', 'Rancune tenace', 'Holding a grudge', 'Les chats n’oublient rien.', 'Cats forget nothing.', () => v('rancunier')],
  ['voleur', 'secret', '⚲', 'Main dans le sac', 'Caught red-pawed', 'Pas vu, pas pris.', 'Not seen, not caught.', () => v('vol')],
  ['somnambule', 'secret', 'z', 'Somnambule', 'Sleepwalker', 'Il marche… les yeux fermés ?', 'Walking… with eyes closed?', () => v('manie-reveur')],
  ['lune', 'secret', '✶', 'Décrocher la lune', 'Reach for the moon', 'Vise plus haut.', 'Aim higher.', () => v('plafond')],
  ['papillon', 'secret', '⋈', 'Papillon de nuit', 'Moth', 'Ce qui vole quand tout le monde dort.', 'What flies while everyone sleeps.', () => v('papillon')],
  ['pouf', 'secret', '✺', 'Après la pluie', 'After the rain', 'Tout plat, puis tout gonflé.', 'All flat, then all fluffy.', () => v('regonfle')],
];
const RANG = { bronze: { fr: 'Facile', en: 'Easy', c: '205,127,50' }, argent: { fr: 'Moyen', en: 'Medium', c: '150,160,175' }, or: { fr: 'Difficile', en: 'Hard', c: '226,176,40' }, secret: { fr: 'Secret', en: 'Secret', c: '150,90,200' } };
const HFs = LISTE.map(([id, rang, g, nfr, nen, hfr, hen, ok]) => ({ id, rang, g, nom: () => T(nfr, nen), h: () => T(hfr, hen), ok }));
const PAR = Object.fromEntries(HFs.map(h => [h.id, h]));
const nb = () => HFs.filter(h => M.got[h.id]).length;

/* ——— le badge : une médaille au trait, deux rubans, un glyphe ——— */
function badge(h, got, taille) {
  const R = RANG[h.rang], col = got ? R.c : '140,140,140', cache = !got && h.rang === 'secret', s = taille || 120;
  return `<svg class="hf-badge" viewBox="0 0 120 140" width="${s}" height="${s * 140 / 120}" aria-hidden="true">
    <path d="M42 92 L30 134 L46 124 L56 138 L62 98" fill="rgba(${col},${got ? 0.55 : 0.18})" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M78 92 L90 134 L74 124 L64 138 L58 98" fill="rgba(${col},${got ? 0.4 : 0.14})" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="60" cy="58" r="44" fill="rgba(${col},${got ? 0.9 : 0.16})" stroke="currentColor" stroke-width="3" ${cache ? 'stroke-dasharray="7 6"' : ''}/>
    <circle cx="60" cy="58" r="34" fill="none" stroke="currentColor" stroke-width="1.6" opacity="${got ? 0.7 : 0.35}" ${got ? '' : 'stroke-dasharray="3 5"'}/>
    ${got ? '<path d="M34 40 q8 -14 22 -16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75"/>' : ''}
    <text x="60" y="60" text-anchor="middle" dominant-baseline="central" font-size="${cache ? 38 : 34}" style="font-family:var(--hand),serif" fill="currentColor" opacity="${got ? 1 : 0.45}">${cache ? '?' : h.g + '\uFE0E'}</text>
  </svg>`;
}

/* ——— le déblocage : la grande animation ——— */
const scene = document.createElement('div'); scene.className = 'hf-show'; scene.hidden = true; scene.setAttribute('role', 'alert'); document.body.appendChild(scene);
const file = []; let joue = false, finT = 0;
function gagne(h) {
  if (M.got[h.id]) return; M.got[h.id] = Date.now(); garde(); compte(); file.push(h); suivant();
}
function suivant() {
  if (joue || !file.length) return; joue = true; const h = file.shift(), R = RANG[h.rang];
  scene.innerHTML = `<div class="hf-rayons" style="--c:${R.c}"></div><div class="hf-carte" style="--c:${R.c}">
    <p class="hf-sur">${T('Haut fait débloqué !', 'Achievement unlocked!')}</p>${badge(h, true, 170)}
    <h2>${h.nom()}</h2><p class="hf-rang">${T(R.fr, R.en)}</p><p class="hf-h">${h.h()}</p></div>`;
  scene.hidden = false; scene.classList.remove('go'); void scene.offsetWidth; scene.classList.add('go');
  // des confettis de partout, et le monde qui tremble un peu
  const G = window.Scenarios && Scenarios.gerbe; if (G && Wd.W) { G(Wd.W / 2, Wd.H * 0.45, 26, 520); setTimeout(() => G(Wd.W * 0.25, Wd.H * 0.6, 14, 380), 250); setTimeout(() => G(Wd.W * 0.75, Wd.H * 0.6, 14, 380), 400); }
  Wd.shake = { t0: Wd.t, a: 6 };
  clearTimeout(finT); finT = setTimeout(ferme, 4200);
}
function ferme() { clearTimeout(finT); scene.classList.remove('go'); scene.hidden = true; joue = false; setTimeout(suivant, 350); }
scene.addEventListener('click', e => { e.stopPropagation(); ferme(); });
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
        return `<li class="${got ? 'ok' : ''}" style="--c:${RANG[r].c}">${badge(h, got, 64)}<b>${cache ? T('Haut fait secret', 'Secret achievement') : h.nom()}</b><span>${h.h()}</span>${got ? `<i>${new Date(M.got[h.id]).toLocaleDateString(EN() ? 'en' : 'fr')}</i>` : ''}</li>`; }).join('')}</ul></section>`; }).join('')}</div>`;
  vitrine.hidden = false; vitrine.querySelector('.dex-x').focus(); vitrine.querySelector('.dex-x').onclick = fermeV;
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
