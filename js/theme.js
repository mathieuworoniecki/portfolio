/* Le thème : un style, puis ses couleurs.
     style    le caractère du dessin : le trait (tremblé, grain), l'écriture, la grille, les polices
     couleurs chaque style a ses jeux de couleurs (le fond, le trait, l'accent)
   Le choix est retenu (localStorage) ; les couleurs de la page sont posées en variables CSS sur <html>
   dès la première ligne (index.html, clé pf-theme-css), pour ne jamais voir un autre thème en premier.
   Il s'applique en direct : THEME.set({ style, color }) met cet objet à jour, pose les variables et envoie
   l'évènement 'themechange' : la craie, la grille, les titres et la 3D se recolorent sans recharger la page.
     ink      le trait (r,g,b)      accent   la couleur qui ressort        cold   une couleur froide, en contrepoint
     glow     comment les lueurs s'ajoutent : 'lighter' sur fond sombre, 'multiply' sur fond clair
     wobble   le tremblé (1 craie, 0 machine)     grain   les manques du trait     hand   l'écriture des annotations */
window.THEME = (() => {
const CJK = '"Noto Sans SC","PingFang SC","Microsoft YaHei"';   // pour le chinois, si la police du style n'a pas les caractères
const HAND = `"Caveat","Segoe Print",${CJK},cursive`, MONO = `"IBM Plex Mono",${CJK},ui-monospace,monospace`, ARCH = `"Architects Daughter","Caveat",${CJK},cursive`;
// une couleur de fond : [fond, bords, centre], le trait, l'accent, le froid ; sombre ou clair ; l'opacité de la grille
const C = (bp, deep, hi, ink, accent, cold, dark, gridA) => ({ bp, deep, hi, ink, accent, cold, dark, gridA });
const STYLES = {
  blueprint: { wobble: 1, grain: 1, hand: HAND, handScale: 1, handWeight: 600, grid: 'lines', colors: {
    bleu:  C('#1C58A2', '#133F7C', '#2468B6', '238,245,255', '255,217,138', '150,210,255', true, 1),
    noir:  C('#15171A', '#0B0C0E', '#1E2126', '232,238,246', '255,200,110', '140,196,255', true, 0.8),
    blanc: C('#F4F5F2', '#E3E6E2', '#FBFCFA', '28,72,140', '214,96,20', '28,120,200', false, 0.9) } },
  ardoise: { wobble: 1.3, grain: 1.35, hand: HAND, handScale: 1.05, handWeight: 600, grid: 'lines', colors: {
    noir:  C('#232628', '#15171A', '#2D3134', '240,238,230', '255,204,110', '150,200,240', true, 0.28),
    vert:  C('#2C4A3B', '#1C3227', '#35584A', '236,242,230', '255,214,120', '160,215,240', true, 0.28),
    blanc: C('#F3F4F1', '#DEE1DC', '#FAFBF8', '30,52,112', '200,40,40', '40,120,190', false, 0.35) } },
  cao: { wobble: 0, grain: 0, hand: MONO, handScale: 0.62, handWeight: 500, grid: 'dots', colors: {
    noir:  C('#0D0F12', '#07080A', '#15181C', '226,232,238', '255,64,56', '90,200,255', true, 1),
    blanc: C('#F6F6F4', '#E6E7E4', '#FDFDFC', '24,26,30', '220,40,30', '20,110,200', false, 1),
    nuit:  C('#0B1A33', '#060F20', '#132544', '218,232,255', '0,212,255', '255,120,90', true, 1) } },
  esquisse: { wobble: 0.75, grain: 0.7, hand: HAND, handScale: 1, handWeight: 600, grid: 'lines', colors: {
    creme: C('#F3EEE2', '#E4DCC8', '#FAF7EF', '52,52,58', '196,64,36', '40,100,170', false, 0.45),
    kraft: C('#C8A77A', '#A98A5E', '#D6B98E', '38,30,22', '150,30,20', '30,70,120', false, 0.4),
    gris:  C('#DADBD8', '#C4C6C2', '#E8E9E6', '34,36,40', '226,90,20', '30,100,180', false, 0.45) } }
};
// les polices de la page, par style (css/site.css les lit dans --display, --text ; l'écriture à la main dans --hand)
const FONTS = {
  blueprint: ['"Barlow Condensed","Arial Narrow","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif', '"Barlow",system-ui,"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'],
  ardoise:   ['"Barlow Condensed","Arial Narrow","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif', '"Barlow",system-ui,"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'],
  cao:       ['"Space Grotesk","Barlow Condensed","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif', '"Space Grotesk",system-ui,"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'],
  // l'esquisse : les titres à la main (Caveat), tracés d'un seul trait épais (js/titles.js : trace)
  esquisse:  ['"Barlow Condensed","Arial Narrow","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif', '"Barlow",system-ui,"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif', `"Caveat",${CJK},cursive`],
};
STYLES.esquisse.hand = ARCH; STYLES.esquisse.handScale = 0.78; STYLES.esquisse.handWeight = 400; STYLES.esquisse.trace = true;
// par défaut : l'esquisse, sur papier gris
const DEFAULT = { style: 'esquisse', color: 'gris' };
// pour l'instant un seul thème : le choix retenu est ignoré et le sélecteur est caché (css/site.css) ; false pour le rendre
const LOCK = true;
const th = { STYLES };
const hex = s => { const [r, g, b] = s.split(',').map(Number); return (r << 16) | (g << 8) | b; };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
function read() {
  let style = DEFAULT.style, color = DEFAULT.color;
  if (LOCK) return { style, color };
  try {
    const s = localStorage.getItem('pf-style'), c = localStorage.getItem('pf-color');
    if (STYLES[s]) { style = s; color = STYLES[s].colors[c] ? c : Object.keys(STYLES[s].colors)[0]; }
  } catch (e) {}
  return { style, color };
}
function fill(style, color) {
  const S = STYLES[style], K = S.colors[color];
  Object.assign(th, { style, color, wobble: S.wobble, grain: S.grain, trace: !!S.trace, hand: S.hand, handScale: S.handScale, handWeight: S.handWeight, grid: S.grid,
    ink: K.ink, accent: K.accent, cold: K.cold, dark: K.dark, gridA: K.gridA, glow: K.dark ? 'lighter' : 'multiply',
    fog: parseInt(K.bp.slice(1), 16), lens: `rgba(${rgb(K.bp)},0.95)`, sheetFill: `rgba(${K.ink},${K.dark ? 0.07 : 0.05})` });
  th.inkHex = hex(th.ink); th.accentHex = hex(th.accent);
}
// les variables CSS de la page, pour ce thème (retenues aussi pour la première ligne d'index.html)
function css() {
  const K = STYLES[th.style].colors[th.color];
  const neon = STYLES[th.style].glow === 'neon', F = FONTS[th.style];
  const glow = neon ? `drop-shadow(0 0 3px rgba(${K.ink},.85)) drop-shadow(0 0 10px rgba(${K.ink},.35))` : K.dark ? `drop-shadow(0 0 1.2px rgba(${K.ink},.5))` : 'none';
  return `--bp:${K.bp};--bp-deep:${K.deep};--bp-hi:${K.hi};--ink:${K.ink};--accent:${K.accent};--vig:${K.dark ? 'rgba(0,0,0,.45)' : 'rgba(90,80,60,.14)'};` +
    `--glow-f:${glow};--glow-t:${neon ? `drop-shadow(0 0 4px rgba(${K.ink},.6))` : 'none'};--display:${F[0]};--text:${F[1]};--title:${F[2] || F[0]};--hand:${STYLES[th.style].hand};color-scheme:${K.dark ? 'dark' : 'light'}`;
}
function paint() {
  const d = document.documentElement, v = css();
  v.split(/;(?![^(]*\))/).forEach(p => { const i = p.indexOf(':'); if (i > 0) { const k = p.slice(0, i), val = p.slice(i + 1); k === 'color-scheme' ? d.style.colorScheme = val : d.style.setProperty(k, val); } });
  d.dataset.style = th.style; d.dataset.color = th.color;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = STYLES[th.style].colors[th.color].deep;
  try { localStorage.setItem('pf-theme-css', v); } catch (e) {}
}
function set(o) {
  const style = STYLES[o.style] ? o.style : th.style, cs = STYLES[style].colors;
  const color = cs[o.color] ? o.color : cs[th.color] ? th.color : Object.keys(cs)[0];
  if (style === th.style && color === th.color) return;
  const styleChanged = style !== th.style;
  fill(style, color); paint();
  try { localStorage.setItem('pf-style', style); localStorage.setItem('pf-color', color); } catch (e) {}
  const go = () => dispatchEvent(new CustomEvent('themechange', { detail: { styleChanged } }));
  go();
  // la police du style : une fois chargée, les titres sont recalculés
  if (styleChanged && document.fonts && document.fonts.load) Promise.all(['600 40px "Space Grotesk"', '500 20px "IBM Plex Mono"', '700 26px "Caveat"', '400 26px "Architects Daughter"', '600 40px "Barlow Condensed"'].map(f => document.fonts.load(f))).then(go, go);
}
const cur = read(); fill(cur.style, cur.color);
if (document.documentElement) paint();
th.hex = hex; th.set = set; th.FONTS = FONTS;
return th;
})();
