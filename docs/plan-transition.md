# Plan : le clic sur le bouton, puis l'écran 2 (l'espace)

Noté d'après le message de Mathieu du 26 septembre 2026 (11:54), pour ne pas le perdre. Rien de tout cela n'est encore branché dans la page : l'écran 1 (le monde des chats) vit dans `index.html`, `js/chats.js`, `js/univers.js` ; Mathieu en 3D vit à part, dans `js/mathieu.js` (aperçu : `tools/mathieu.html`).

## Ce que Mathieu a demandé (ses mots, reformulés)

> Au clic sur le bouton, j'arrive de loin, ma tête et mon buste, en tournant. Quand j'arrive, tout se bouscule : je pousse tout sur les côtés, les objets, les chats… Il n'en reste qu'un ou deux qui me regardent comme un dieu. Puis j'ouvre la bouche en grand, comme un truc biblique (j'occupe quasi tout l'écran) ; le texte et le bouton aussi sont virés, tout bouge. On pénètre dans ma bouche comme dans un trou noir (voir LookAnimation, quand on rentre dans l'axe), mais plus « tunnel interdimensionnel », et ça nous fait arriver au second écran : l'espace.

## Le déroulé, temps par temps

Le film (`js/film.js`) donne l'horloge ; la transition sera une scène de `js/scenes.js` entre la station « salut » (écran 1) et la station « espace » (écran 2). Durées indicatives, à régler à l'œil.

| # | Temps | Ce qui se passe | Qui le fait |
|---|-------|-----------------|-------------|
| 0 | clic | Le bouton « Entrer dans mon monde » est pris : il tremble, la lecture part. Les chats s'arrêtent net, oreilles dressées, et regardent vers le fond. | scène + `Chats` (un nouvel état « alerte ») |
| 1 | 0 → 2,5 s | **L'arrivée.** Mathieu (tête et buste) apparaît minuscule au loin, au centre, et grossit en tournant sur lui-même (un tour et demi, qui ralentit). Il se pose face à nous, à peu près à la taille d'un gros objet du décor. | `Mathieu.pose(m, { x, y, s, turn })` |
| 2 | 2,5 → 4 s | **La bousculade.** Son arrivée pousse tout vers les bords : une onde partie de lui écarte les objets (physique déjà là : on lance les objets comme au glisser), les chats sont projetés ou fuient sur les côtés. Le titre et le bouton glissent et sortent de l'écran (ou tombent, comme des objets). | `Univers` / `Chats` : une impulsion radiale depuis Mathieu ; titres : sortie animée |
| 3 | 4 → 5,5 s | **L'adoration.** Il ne reste qu'un ou deux chats, assis devant lui, la tête levée, les yeux brillants (yeux « brillant »), comme devant un dieu. Petit temps de silence. | `Chats` : pose « assis », regard vers le haut |
| 4 | 5,5 → 7,5 s | **La bouche biblique.** Mathieu grossit encore jusqu'à occuper presque tout l'écran et ouvre la bouche démesurément (la mâchoire descend très bas, cartoon). Le dedans de la bouche est un disque d'encre pleine : le trou noir. Les derniers chats et tout ce qui reste sont aspirés vers la bouche. | `Mathieu.pose(m, { open: 0 → 1 })`, puis mise à l'échelle ; `Mathieu.mouthAt(m)` donne le centre et le rayon de la bouche à l'écran |
| 5 | 7,5 → 8 s | **On entre.** La caméra plonge dans la bouche : le disque d'encre remplit l'écran. | la scène zoome sur `mouthAt` |
| 6 | 8 → 11 s | **Le tunnel interdimensionnel.** Dans le noir, un tunnel en traits, inspiré du tunnel de LookAnimation (`js/pedal3d.js`, `buildTunnel` / `tunnelFrame` : anneaux, lignes le long de l'axe, particules qui filent, caméra qui avance en roulant doucement). En plus « interdimensionnel » : les anneaux se tordent et changent de forme (ronds, carrés, étoiles), le tunnel ondule, des éclats de lumière. | un nouveau module (ex. `js/tunnel.js`), repris de LookAnimation sans son contenu LOOK |
| 7 | 11 → 12 s | **L'arrivée dans l'espace.** Le tunnel s'ouvre sur un ciel étoilé : écran 2. | scène « espace » (à définir avec Mathieu) |

Retour arrière (flèche gauche, barre du film) : tout doit se rejouer à l'envers proprement, comme le reste du film (tout est fonction du temps `s`).

## Mathieu en 3D : ce qui existe

`js/mathieu.js` : la tête et le buste, en traits d'encre épais (le même moteur que les chats, `Obj3D.mats(…, { fat })`), mignon et caricatural plutôt que réaliste, d'après ses photos : cheveux bruns en pics, moustache, chemise blanche à col.

- `Mathieu.create()` crée le pantin ; `Mathieu.pose(m, { x, y, s, turn, tilt, open, look })` le pose à l'écran (px), `open` de 0 (bouche fermée) à 1 (bouche biblique).
- `Mathieu.mouthAt(m)` : le centre et la taille de la bouche à l'écran, pour viser le trou noir.
- Aperçu : `tools/mathieu.html` (il tourne ; un curseur ouvre la bouche ; `?open=1` pour la bouche ouverte).

## À faire, dans l'ordre

1. Valider le personnage avec Mathieu (ressemblance, style).
2. Brancher l'arrivée et la bousculade dans le film (avec le fil qui s'occupe de l'écran 1 : `index.html`, `js/chats.js`, `js/univers.js`).
3. Le tunnel interdimensionnel (`js/tunnel.js`).
4. L'écran 2, l'espace : son contenu reste à définir avec Mathieu.
