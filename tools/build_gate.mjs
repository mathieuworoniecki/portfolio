/* Prépare les fichiers de l'écran d'accès (dossier acces/), servis sans code par middleware.js.
   On n'y met que de quoi dessiner : la craie, la grille et le moteur 3D (avec ses objets d'exemple), rien du contenu.
     node tools/build_gate.mjs
   - acces/chalk.js, acces/grid.js, acces/objects3d.js : copies de js/chalk.js, js/grid.js et js/objects3d.js */
import fs from 'fs'; import { fileURLToPath } from 'url';
const root = fileURLToPath(new URL('..', import.meta.url));
for (const f of ['chalk.js', 'grid.js', 'objects3d.js']) fs.copyFileSync(root + 'js/' + f, root + 'acces/' + f);
console.log('acces/ : chalk.js, grid.js, objects3d.js copiés');
