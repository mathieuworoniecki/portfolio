# Plan : le clic sur le bouton, puis l'écran 2 (l'espace)

> **Remplacé le 27 septembre 2026 (20:28).** Mathieu a changé la transition : au clic sur « Entrer dans mon univers », un trou noir s'ouvre au milieu de l'écran et aspire tout dans une spirale ; on arrive dans l'espace (écran 2), où seuls les chats ressortent. Le fil « Chats et univers du portfolio » la construit avec l'écran 2. Ce qui suit (Mathieu qui arrive en courant, la bouche biblique, le tunnel) n'est plus le plan ; le modèle 3D reste, pour le logo (`Mathieu.create({ logo: true })`) et pour plus tard.

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

Corps entier (27 septembre, 14:48). Mathieu : « fais tout le reste de mon corps, car quand on va cliquer sur le bouton je vais arriver en courant au milieu de la scène ».

- La tête : le dessin d'un seul trait (`trait.simple`, cheveux en forme seule, moustache aux pointes à peine relevées), posé sur le relief de la photo (`visage.png`, `dos.png`, `relief.png`, `relief.json`, par `tools/mathieu/build.py`). L'alpha du dessin : 1 la tête, 0,78 le buste de la photo, qui n'est plus montré. La photo n'est pas dans le dépôt.
- Le corps (27 septembre, 15:39 : « revois profondément le corps, couche par couche, le squelette, les points ») : dans `js/mathieu.js`, trois couches, `Mathieu.pose(m, { couche })` et les boutons de l'aperçu :
  1. `os` : le squelette, 24 articulations (bassin, lombaires, thorax, cou ; de chaque côté clavicule, épaule, coude, poignet, doigts, pouce, hanche, genou, cheville, orteils) et leurs os ;
  2. `peau` : le corps nu, des volumes en sections ovales sur chaque os (bassin, ventre, cage, bras, avant-bras, mains, cuisses, mollets, pieds) ;
  3. `habits` (par défaut) : t-shirt Patagonia (encolure côtelée, coutures d'épaules, manches et ourlets, plis, logo pris dans `relief.json`), jean (braguette, poches devant et derrière, coutures, plis, ourlets), baskets (tige, bout qui plie, semelle, lacets) ; avant-bras et mains nus. Le tronc a un seul contour (pochoir 255).
  La foulée bouge toutes les articulations (`run`, `speed`) ; debout, il respire. Jean et baskets : un choix par défaut, à confirmer par Mathieu.
- La tête est 1,2 fois plus grande que nature (un personnage de dessin). Depuis le 27 septembre, 18:13 (« il manque des traits derrière ou sur les côtés, on doit avoir un modèle hyper complet »), elle tourne en entier avec le corps : le relief du visage s'enroule sur ses bords dans un crâne en 3D (cheveux, oreilles, nuque, cou) ; de face, le contour est celui du dessin ; dès un tiers de quart de tour, c'est le contour en 3D (le relief repoussé le long de ses normales pour le profil du nez, de la bouche, du menton ; le crâne pour le reste). Le profil (18:42, « améliore tout ce que tu peux sur le profil ») : le cou rentre dans l'encolure (la tête un peu en avant, le devant du cou de la photo aminci), l'arrière du crâne arrondi, le sommet refermé, la patte devant l'oreille. Bouche grande ouverte de profil : encore brute.
- L'arrivée (aperçu `tools/mathieu.html?arrivee`) : tout petit au loin, il court vers nous jusqu'au milieu, s'arrête, puis la bouche biblique. À brancher sur le bouton de l'écran 1 (`index.html`, fil des chats).
- Le logo du site (`js/logo.js`) : `Mathieu.create({ logo: true })`, la tête seule, inchangé.
- De côté, chargées nulle part : `js/mathieu-tete.js` (quatrième version), `tete.json` et `visage3d.png` (sixième version).

## À faire, dans l'ordre

1. Valider le personnage avec Mathieu (ressemblance, style).
2. Brancher l'arrivée et la bousculade dans le film (avec le fil qui s'occupe de l'écran 1 : `index.html`, `js/chats.js`, `js/univers.js`).
3. Le tunnel interdimensionnel (`js/tunnel.js`).
4. L'écran 2, l'espace : son contenu reste à définir avec Mathieu.
