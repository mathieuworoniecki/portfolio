/* La mesure (27/09, Mathieu : « comment optimiser le code et le site ? ») : avec ?perf dans l'adresse (mathieu.blue/?perf),
   un petit cadre en haut à droite montre les images par seconde, le temps du moteur des chats par image, et les cinq crochets
   les plus coûteux (fichier et début du code). Sans ?perf, rien ne change. */
(() => {
if (!/[?&]perf\b/.test(location.search) || !window.Chats || !Chats.K) return;
const K = Chats.K, H = K.H, T = {};
// chaque crochet est chronométré
const src = f => { const s = f.toString().replace(/\s+/g, ' '); return s.slice(0, 42); };
['pre', 'post', 'draw', 'think', 'live', 'fall'].forEach(k => H[k].forEach((f, i) => {
  const lab = k + ' · ' + src(f); H[k][i] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { T[lab] = (T[lab] || 0) + performance.now() - t; } };
}));
// le moteur entier (Chats.frame)
let moteur = 0; const f0 = Chats.frame; if (f0) Chats.frame = function () { const t = performance.now(); try { return f0.apply(this, arguments); } finally { moteur += performance.now() - t; } };
const box = document.createElement('pre');
box.style.cssText = 'position:fixed;right:8px;top:60px;z-index:99;margin:0;padding:6px 8px;max-width:min(92vw,420px);font:11px/1.35 ui-monospace,monospace;background:rgba(255,255,255,.9);color:#111;border:1px solid #111;pointer-events:none;white-space:pre-wrap';
document.body.appendChild(box);
let n = 0, t0 = performance.now();
(function boucle() {
  n++; const dt = performance.now() - t0;
  if (dt > 1000) {
    const W = Chats.world, top = Object.entries(T).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => (v / n).toFixed(2).padStart(5) + ' ms  ' + k);
    box.textContent = `${(n * 1000 / dt).toFixed(0)} images/s · moteur ${(moteur / n).toFixed(2)} ms/image\n${W.cats.length} chats · ${W.props.length} objets · ${W.kib.length} croquettes · ${W.fx.length} effets\n` + top.join('\n');
    for (const k in T) T[k] = 0; moteur = 0; n = 0; t0 = performance.now();
  }
  requestAnimationFrame(boucle);
})();
})();
