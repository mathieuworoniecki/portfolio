# Portfolio de Mathieu

Un portfolio joué sur un seul écran, sans défilement : un film sur une ligne du temps, découpé en chapitres, avec des arrêts où il attend un geste. Le rendu vient de LookAnimation (craie, grille, thèmes, 3D en traits), la navigation vient de HUman (horloge du film, barre des chapitres).

Lancer un petit serveur (la 3D ne se charge pas en ouvrant le fichier directement) :

```
python3 tools/serve.py
```

puis ouvrir http://localhost:8940. Aucune dépendance à installer ; three.js r128 est chargé depuis cdnjs.

## Comment c'est construit

```
index.html          un écran fixe : le fond, les toiles, l'en-tête, les calques des scènes, la barre du film
css/site.css        le style : variables du thème, en-tête, sélecteurs, cadres à la craie, scènes, barre du film
js/film.js          la ligne du temps : horloge T, lecture, seek, chapitres, barre à glisser, clavier, molette, geste,
                    temps dilaté (WARP), stations (hold), phrases (CAPS), prise à la souris, filtrage des clics
js/scenes.js        les scènes, déclarées : { id, t0, t1, hold, enter, frame, draw, exit, click, grab… }
js/outils.js        les outils des scènes : cadres de boutons (sketchBox), objets qui jaillissent (Pops),
                    objets qui flottent (Debris), la rupture (Burst), hull / cutUnder
js/titles.js        les titres écrits à la craie ; la scène donne la progression : Titles.progress(el, p)
js/chalk.js         dessiner à la main : stroke, line, arrow, circle, text, dot, smudge
js/grid.js          la grille du fond et sa loupe sous la souris ; Grid.frame(dy) : décalage donné par la scène
js/objects3d.js     le moteur 3D en traits ; bibliothèque vide sauf deux exemples (roulement, vis)
js/theme.js         styles × couleurs, appliqués en direct ; par défaut Esquisse / gris
js/picker.js        le sélecteur de thème et de langue ; chalkFrame
js/i18n.js          les langues (fr, en pour l'instant) : data-i18n, L('clé')
tools/serve.py      serveur local sans cache (port 8940)
tools/preview.py    l'aperçu en ligne (Artifact) : une page avec tout intégré
```

## La ligne du temps

Tout ce qui est dessiné est une fonction du temps logique `s` (et de l'horloge réelle pour les petites boucles de vie). Une scène ne vit que dans sa plage `[t0, t1]`, avec un fondu enchaîné. Une station (`hold: true`) arrête la lecture à son `t1` : seules les boucles de vie tournent, et `Film.go()` la quitte. La dernière station est un monde libre.

- Clic court sur le film : la scène le prend (un objet jaillit), sinon lecture / pause
- Espace : lecture / pause ; ← → (ou ↑ ↓) : chapitre précédent / suivant
- Molette ou geste vertical : un chapitre par geste (verrou tant que le geste continue)
- Barre du bas : clic pour sauter, glisser pour avancer ou reculer
- Mouvement réduit : pas de lecture automatique, une image fixe par chapitre (`rest`)

Pour les essais : `window.__seek(s)` va au temps logique `s`, en pause.

## Pièges connus (hérités de LookAnimation)

- Jamais un commentaire `//` en fin de ligne suivi de code : utiliser `/* … */`.
- Toiles à la densité réelle de l'écran (jusqu'à 3×) ; largeur utile = `document.documentElement.clientWidth`.
- Les tailles dépendent aussi de la hauteur (`min(vw, vh)`) : 1280×560 et 1510×698 doivent marcher.
