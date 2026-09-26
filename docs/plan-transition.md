# Plan : le clic sur le bouton, puis l'écran 2 (l'espace)

Noté d'après le message de Mathieu du 26 septembre 2026 (11:54), pour ne pas le perdre. Rien de tout cela n'est encore branché dans la page : l'écran 1 (le monde des chats) vit dans `index.html`, `js/chats.js`, `js/univers.js` ; Mathieu en 3D vit à part, dans `js/mathieu.js` (aperçu : `tools/mathieu.html`).

## Ce que Mathieu a demandé (ses mots, reformulés)

> Au clic sur le bouton, j'arrive de loin, ma tête et mon buste, en tournant. Quand j'arrive, tout se bouscule : je pousse tout sur les côtés, les objets, les chats… Il n'en reste qu'un ou deux qui me regardent comme un dieu. Puis j'ouvre la bouche en grand, comme un truc biblique (j'occupe quasi tout l'écran) ; le texte et le bouton aussi sont virés, tout bouge. On pénètre dans ma bouche comme dans un trou noir (voir LookAnimation, quand on rentre dans l'axe), mais plus « tunnel interdimensionnel », et ça nous fait arriver au second écran : l'espace.

## L'écran 1, au moment du clic (changement de Mathieu, 12:02)

Le texte se réduit à « Salut, moi c'est Mathieu. », écrit à la main comme le logo. Un second bouton, plus rigolo et kawaii, « Restez jouer ici », enlève le texte pour laisser la place aux objets et aux chats, et « Entrer dans mon univers » passe alors en haut de l'écran. La transition part donc de l'un ou l'autre état : le titre et le bouton, s'ils sont encore là, sont chassés à l'étape 2.

## Le déroulé, temps par temps

Le film (`js/film.js`) donne l'horloge ; la transition sera une scène de `js/scenes.js` entre la station « salut » (écran 1) et la station « espace » (écran 2). Durées indicatives, à régler à l'œil.

| # | Temps | Ce qui se passe | Qui le fait |
|---|-------|-----------------|-------------|
| 0 | clic | Le bouton « Entrer dans mon univers » est pris (au centre, ou en haut de l'écran si l'on a d'abord cliqué « Restez jouer ici ») : il tremble, la lecture part. Les chats s'arrêtent net, oreilles dressées, et regardent vers le fond. | scène + `Chats` (un nouvel état « alerte ») |
| 1 | 0 → 2,5 s | **L'arrivée.** Mathieu (tête et buste) apparaît minuscule au loin, au centre, et grossit en tournant sur lui-même (un tour et demi, qui ralentit). Il se pose face à nous, à peu près à la taille d'un gros objet du décor. | `Mathieu.pose(m, { x, y, s, turn })` |
| 2 | 2,5 → 4 s | **La bousculade.** Son arrivée pousse tout vers les bords : une onde partie de lui écarte les objets (physique déjà là : on lance les objets comme au glisser), les chats sont projetés ou fuient sur les côtés. Le titre (s'il est encore là) et les boutons glissent et sortent de l'écran (ou tombent, comme des objets). | `Univers` / `Chats` : une impulsion radiale depuis Mathieu ; titres : sortie animée |
| 3 | 4 → 5,5 s | **L'adoration.** Il ne reste qu'un ou deux chats, assis devant lui, la tête levée, les yeux brillants (yeux « brillant »), comme devant un dieu. Petit temps de silence. | `Chats` : pose « assis », regard vers le haut |
| 4 | 5,5 → 7,5 s | **La bouche biblique.** Mathieu grossit encore jusqu'à occuper presque tout l'écran et ouvre la bouche démesurément (la mâchoire descend très bas, cartoon). Le dedans de la bouche est un disque d'encre pleine : le trou noir. Les derniers chats et tout ce qui reste sont aspirés vers la bouche. | `Mathieu.pose(m, { open: 0 → 1 })`, puis mise à l'échelle ; `Mathieu.mouthAt(m)` donne le centre et le rayon de la bouche à l'écran |
| 5 | 7,5 → 8 s | **On entre.** La caméra plonge dans la bouche : le disque d'encre remplit l'écran. | la scène zoome sur `mouthAt` |
| 6 | 8 → 11 s | **Le tunnel interdimensionnel.** Dans le noir, un tunnel en traits, inspiré du tunnel de LookAnimation (`js/pedal3d.js`, `buildTunnel` / `tunnelFrame` : anneaux, lignes le long de l'axe, particules qui filent, caméra qui avance en roulant doucement). En plus « interdimensionnel » : les anneaux se tordent et changent de forme (ronds, carrés, étoiles), le tunnel ondule, des éclats de lumière. | un nouveau module (ex. `js/tunnel.js`), repris de LookAnimation sans son contenu LOOK |
| 7 | 11 → 12 s | **L'arrivée dans l'espace.** Le tunnel s'ouvre sur un ciel étoilé : écran 2. | scène « espace » (à définir avec Mathieu) |

Retour arrière (flèche gauche, barre du film) : tout doit se rejouer à l'envers proprement, comme le reste du film (tout est fonction du temps `s`).

## Mathieu en 3D : ce qui existe

Quatrième version (26 septembre, 12:40). Mathieu a refusé la caricature (« on ne me reconnaît pas »), le décalque en gris (« creepy »), puis le dessin posé sur un relief de face (« on ne voit que le devant, je suis coupé »). C'est maintenant une vraie tête en 3D, crâne compris, dessinée au trait comme les chats : on le voit de face, de profil et de dos. Base : la photo qu'il préfère (selfie, cheveux en pics, moustache en guidon ; la photo n'est pas dans le dépôt).

- `tools/mathieu/tete.py` : ses 478 points 3D (MediaPipe Face Mesh) reportés sur une tête humaine simple (un crâne ellipsoïde, 96 × 73 directions) → `media/mathieu/tete.json`. Retouches demandées : un visage un peu plus fin, de plus grands yeux, une plus grande bouche, un sourire. Les traits sont posés sur la surface : paupières, iris et pupilles (avec un reflet), sourcils, nez, lèvres, moustache en guidon (un trait épais par côté, des poils pâles) ; les cheveux en volume, leur ligne sur le front, des pics sur le dessus.
- `js/mathieu.js` : la tête, les oreilles, le cou, le buste en t-shirt Patagonia (encolure, coutures, logo sur le cœur). Des volumes invisibles et leurs contours, recalculés à chaque image. API : `Mathieu.create()`, `Mathieu.pose(m, { x, y, s, turn, tilt, nod, open })`, `Mathieu.mouthAt(m)` (le centre du trou noir à l'écran et ses demi-axes, pour y plonger).
- La bouche : la surface se déforme ; sous les lèvres, la mâchoire descend en arc (les coins restent, le milieu s'ouvre), la lèvre du haut remonte ; entre les deux, de l'encre. À `open = 1`, la mâchoire descend jusqu'au buste : c'est la bouche biblique.
- Le logo : `Mathieu.create({ logo: true })` donne la tête seule, sans traits pâles, lisible dès 48 px ; aperçu `tools/mathieu.html?logo=48`. Mathieu veut que le logo du site devienne sa tête 3D qui tourne ; c'est au fil de l'écran 1 de le brancher (`index.html`).
- Aperçu : `tools/mathieu.html` (il tourne sur lui-même ; curseur de bouche ; « Arrivée »).

## À faire, dans l'ordre

1. Valider le personnage avec Mathieu (ressemblance, style).
2. Brancher l'arrivée et la bousculade dans le film (avec le fil qui s'occupe de l'écran 1 : `index.html`, `js/chats.js`, `js/univers.js`).
3. Le tunnel interdimensionnel (`js/tunnel.js`).
4. L'écran 2, l'espace : son contenu reste à définir avec Mathieu.
