/* Prépare les fichiers de l'écran d'accès (dossier acces/), servis sans code par middleware.js.
   On n'y met que des dessins de pièces (des traits) : ni le site, ni le modèle 3D.
     node tools/build_gate.mjs
   - acces/pieces.js : les silhouettes des pièces (corps, axe, Power Core, roulement, embout…), en lignes normalisées
   - acces/chalk.js, acces/grid.js, acces/objects3d.js : copies de js/chalk.js, js/grid.js et js/objects3d.js */
import fs from 'fs'; import vm from 'vm';
const root = new URL('..', import.meta.url).pathname;
const ctx = { window: {}, Math, TAU: Math.PI * 2 }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root + 'media/keo/model.js', 'utf8'), ctx);
const src = fs.readFileSync(root + 'js/scenes.js', 'utf8');
const grab = (start, end) => { const a = src.indexOf(start), b = src.indexOf(end, a); if (a < 0 || b < 0) throw new Error('introuvable : ' + start); return src.slice(a, b); };
vm.runInContext('const M = () => window.PEDAL_MODEL; let parts = null;\n' + grab('const ring = (r, n, cx, cy)', '/* ——— les pièces qui flottent') + '\nbuildParts(); window.PARTS = parts;', ctx);
const round = x => Math.round(x * 1000) / 1000;
const out = ctx.window.PARTS.map(p => ({ name: p.name, size: p.size, lines: p.lines.map(l => l.map(q => [round(q[0]), round(q[1])])) }));
fs.writeFileSync(root + 'acces/pieces.js', '/* généré par tools/build_gate.mjs — des silhouettes de pièces, rien d\'autre */\nwindow.GATE_PIECES = ' + JSON.stringify(out) + ';\n');
fs.copyFileSync(root + 'js/chalk.js', root + 'acces/chalk.js');
fs.copyFileSync(root + 'js/grid.js', root + 'acces/grid.js');
fs.copyFileSync(root + 'js/objects3d.js', root + 'acces/objects3d.js');   // sans le modèle LOOK : la KEO, l'axe et le Power Core n'y sont pas
console.log('acces/pieces.js :', out.length, 'pièces,', fs.statSync(root + 'acces/pieces.js').size, 'octets');
