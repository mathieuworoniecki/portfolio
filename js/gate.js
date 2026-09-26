/* L'accès réservé : tant que le site n'est pas public, un code est demandé à l'arrivée.
   Même plan bleu ; le logo LOOK se trace à la craie, le cadre de saisie se dessine à la main.
   Bon code : le cadre se coche, l'écran s'efface et le site commence. Mauvais code : le cadre tremble.
   Le code n'est pas écrit en clair : on compare son empreinte (SHA-256). Une fois entré, il est retenu.
   Attention : c'est une porte d'entrée, pas un coffre-fort — les fichiers restent lisibles par qui les cherche. */
window.Gate = (() => {
const HASH = '477e7fff325547e32debefef972a7016ee25b42fd92297166f7449c7383aef90', KEY = 'look-power-rs-access';
// les autres codes acceptés ; une fois entré, on retient toujours la même marque (HASH)
const OK = [HASH, '484bd46cac06c8b099e0892f3a4ab7f681d46ffb4aa2c1a03bd6331e63d5838f', 'd71a4c4918cfa3653fe500f1b7ad8bfe518f3a6dc55f7bfc5b3b4b84af5257d7'];
const root = document.documentElement;
let onOpen = null;
// déjà entré : ici, ou sur l'écran d'accès du serveur (middleware.js, qui pose le cookie look_ok)
const known = () => { if (/(?:^|; )look_ok=1/.test(document.cookie)) return true; try { return localStorage.getItem(KEY) === HASH; } catch (e) { return false; } };
async function sha(s) {
  if (!(window.crypto && crypto.subtle)) return '';
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function open(instant) {
  try { localStorage.setItem(KEY, HASH); } catch (e) {}
  const g = document.getElementById('gate');
  if (!instant) root.classList.add('entering');   // le site apparaîtra en fondu (js/scroll.js)
  root.classList.remove('locked');
  if (g) { if (instant) g.remove(); else { g.classList.add('open'); setTimeout(() => g.remove(), 1400); } }
  if (onOpen) onOpen();
}
function init(cb) {
  onOpen = cb;
  if (known()) { open(true); return true; }
  root.classList.add('locked');
  const g = document.getElementById('gate'), f = g.querySelector('form'), inp = g.querySelector('input'), msg = g.querySelector('.gate-msg');
  requestAnimationFrame(() => g.classList.add('in'));
  setTimeout(() => inp.focus({ preventScroll: true }), 900);
  inp.addEventListener('input', () => { g.classList.remove('bad'); msg.textContent = ''; });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const h = await sha(inp.value.trim().toLowerCase());
    if (OK.includes(h)) { g.classList.add('good'); inp.blur(); setTimeout(() => open(false), 900); }
    else { g.classList.remove('bad'); void g.offsetWidth; g.classList.add('bad'); msg.textContent = window.L ? L('gate.bad') : 'Ce n’est pas le bon code.'; inp.select(); }
  });
  return false;
}
return { init };
})();
