/* L'accueil (27/09, Mathieu : « un événement dès l'arrivée pour retenir l'utilisateur, un mini tuto texte, et un petit effet
   sur les objets qui ont une action, du vent autour du levier ou une bulle "abaisse mon levier" »).
   - Dès l'arrivée : un chat tombe du ciel sur le titre, « coucou ! ».
   - Le tuto : une bulle au trait, près de la chose concernée ; une étape à la fois, effacée dès qu'on l'a faite, retenue pour la visite suivante.
   - Les indices : sur ce qui a une action cachée (le levier, le distributeur, le coffre), un souffle autour et une bulle,
     tant qu'on ne s'en est pas servi. */
window.Accueil = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, sc, say, pick, rnd } = K;
const KEY = 'pf-tuto';
let fait = {}; try { fait = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
const garde = () => { try { localStorage.setItem(KEY, JSON.stringify(fait)); } catch (e) {} };

/* ——— la bulle ——— */
const bulle = document.createElement('div'); bulle.className = 'tuto'; bulle.setAttribute('aria-live', 'polite'); bulle.hidden = true;
document.body.appendChild(bulle);
let courant = null, taille = null;
addEventListener('resize', () => { taille = null; });   // { id, txt, at: () => [x, y] | null }
function montre(b) {
  if (!b) { if (courant) { bulle.classList.remove('on'); setTimeout(() => { if (!courant) bulle.hidden = true; }, 300); } courant = null; return; }
  if (courant && courant.id === b.id) { courant.at = b.at; return; }
  courant = b; bulle.textContent = b.txt; bulle.hidden = false; taille = null; requestAnimationFrame(() => bulle.classList.add('on'));
}
function place() {
  if (!courant) return; const p = courant.at(); if (!p || Wd.a < 0.6) { bulle.style.opacity = 0; return; } bulle.style.opacity = '';
  // (la taille de la bulle, mesurée une fois par texte : la relire à chaque image forçait le navigateur à tout recalculer)
  if (!taille || !taille[0]) taille = [bulle.offsetWidth, bulle.offsetHeight]; const [w, h] = taille, x = Math.max(12, Math.min(Wd.W - w - 12, p[0] - w / 2)), y = Math.max(12, p[1] - h - 18);
  bulle.style.transform = `translate(${x | 0}px, ${y | 0}px)`; bulle.style.setProperty('--queue', `${Math.max(14, Math.min(w - 14, p[0] - x)) | 0}px`);
}

/* ——— l'événement d'arrivée : un chat tombe du ciel, sur le titre ——— */
let hote = null, arrive = false;
function bienvenue() {
  arrive = true; if (Wd.cats.length >= 12) return;
  const T = window.Vie && Vie.LETTERS && Vie.LETTERS(), r = T && Vie.RECT(), L = T && T.filter(l => !l.st && l.a > 0.8);
  const x = L && L.length ? Vie.lx(pick(L.slice(1, -1).length ? L.slice(1, -1) : L), r) : Wd.W / 2;
  const k = hote = K.addCat({ x }); k.y = -sc(k) * 1.2; k.fall = true; k.vy = 0; k.vx = 0; k.spin = Math.PI; k.stay = rnd(90, 160);
  K.later(1.3, () => { if (Wd.cats.includes(k)) say(k, pick([L_('tuto.coucou'), '♥'])); });
}
const L_ = k => (window.L ? L(k) : k);
const vivant = c => c && Wd.cats.includes(c) && !c.gone && c.hp && !c.hidden;
const unChat = () => (vivant(hote) && !hote.held ? hote : null) || Wd.cats.filter(c => vivant(c) && !c.rare && !c.held && !c.fall).sort((a, b) => Math.abs(a.x - Wd.W / 2) - Math.abs(b.x - Wd.W / 2))[0];
const tete = c => c && c.hp ? [c.hp[0], c.hp[1] - c.b.head[1] * sc(c) * 1.6] : null;

/* ——— les étapes ——— */
let clics0 = null, porte = null;
const ETAPES = [
  { id: 'attrape', ok: () => Wd.cats.some(c => c.held), at: () => tete(unChat()) },
  { id: 'caresse', ok: () => Wd.cats.some(c => c.pet && c.pet.n >= 2), at: () => tete(unChat()) },
  { id: 'clic', ok: () => clics0 != null && Chats.clicks > clics0, at: () => [Wd.W * 0.5, (Wd.ceil || Wd.H * 0.4) + ((Wd.floor - (Wd.ceil || Wd.H * 0.4)) * 0.35)], debut: () => { clics0 = Chats.clicks; } },
  { id: 'lance', ok: () => porte && porte.fall && !porte.held, at: () => { const it = Wd.props.find(i => i.kind === 'pelote' && !i.held) || Wd.props.find(i => i.kind === 'carton' && !i.held); return it ? [it.x, it.y - it.hull.h * it.s - 6] : null; } },
];
let etape = null, etapeT = 0;
function tuto() {
  if (etape && etape.ok()) { fait[etape.id] = 1; garde(); etape = null; montre(null); etapeT = Wd.t + 1.2; return; }
  if (etape) { montre({ id: etape.id, txt: L_('tuto.' + etape.id), at: etape.at }); return; }
  if (Wd.t < etapeT) return;
  const e = ETAPES.find(e => !fait[e.id]); if (!e) return; if (e.ok()) { fait[e.id] = 1; garde(); return; }
  etape = e; if (e.debut) e.debut();
}

/* ——— les indices : un souffle autour, une bulle ; tant qu'on ne s'en est pas servi ——— */
function pommeau(g) { const a = (g.lev0 ?? 0.3) + (g.pull || 0) * (g.levK ?? 1.3); return Univers.at(g, [g.pivot[0] - Math.sin(a) * 0.3, g.pivot[1] + Math.cos(a) * 0.3, g.pivot[2]]); }
const utilise = {};
const INDICES = [
  { id: 'levier', obj: () => Wd.props.find(p => p.pivot && !p.held && !p.fall && p.a > 0.5), at: g => { const k = pommeau(g); return [k[0], k[1] - 8]; }, vu: g => g.pulling || g.flick },
  { id: 'distrib', obj: () => Wd.P.distrib && Wd.props.includes(Wd.P.distrib) && !Wd.P.distrib.held ? Wd.P.distrib : null, at: g => [g.x, g.y - g.hull.h * g.s - 6], vu: g => g.folle || (g.clk || 0) >= 2 },
  { id: 'coffre', obj: () => Wd.props.find(p => p.kind === 'coffre' && !p.held && p.a > 0.5), at: g => [g.x, g.y - g.hull.h * g.s - 6], vu: () => window.Jouets && Jouets.etat !== 'coffre' },
];
let indice = null, indiceT = 0, calme = 0;
addEventListener('pointerdown', () => { calme = Wd.t; }, true);
function indices() {
  INDICES.forEach(I => { const o = I.obj(); if (o && I.vu(o)) utilise[I.id] = 1; });
  if (indice && (utilise[indice.id] || Wd.t > indiceT)) { indice = null; montre(null); indiceT = Wd.t + rnd(5, 9); return; }
  if (indice) { const o = indice.obj(); if (!o) { indice = null; montre(null); return; } montre({ id: 'i-' + indice.id, txt: L_('indice.' + indice.id), at: () => indice && indice.obj() ? indice.at(indice.obj()) : null }); return; }
  if (Wd.t < indiceT || Wd.t - calme < 3 || Wd.cats.some(c => c.held)) return;
  const L = INDICES.filter(I => !utilise[I.id] && I.obj()); if (!L.length) return;
  indice = pick(L); indiceT = Wd.t + 6;
}
// le souffle : trois petits traits qui tournent autour de ce qu'on peut actionner (même sans bulle)
H.draw.push(() => {
  if (Wd.a < 0.5 || !window.Chalk) return;
  INDICES.forEach(I => { if (utilise[I.id]) return; const o = I.obj(); if (!o) return; const p = I.at(o), R = Math.max(16, Wd.s0 * 0.14), t = Wd.t * 2.2;
    for (let i = 0; i < 3; i++) { const a = t + i * 2.1, r = R * (1 + 0.15 * Math.sin(t * 1.7 + i)), x0 = p[0] + Math.cos(a) * r, y0 = p[1] + 10 + Math.sin(a) * r * 0.55, x1 = p[0] + Math.cos(a + 0.7) * r, y1 = p[1] + 10 + Math.sin(a + 0.7) * r * 0.55;
      Chalk.line(x0, y0, x1, y1, 1, { w: 1.4, a: 0.45 * Wd.a * (0.6 + 0.4 * Math.sin(t * 3 + i)), seed: 40 + i }); } });
});

H.post.push(() => {
  if (Wd.a < 0.6 || Wd.fuite) { montre(null); return; }   // (pendant la fuite vers le mode sérieux, js/fuite.js : plus de tuto)
  if (!arrive && Wd.t > 1.6) bienvenue();
  Wd.props.forEach(it => { if (it.held) porte = it; });
  const reste = ETAPES.some(e => !fait[e.id]);
  if (reste && arrive && Wd.t > 3.2) tuto(); else if (!reste && !etape) indices();
  place();
});

return { fait, reset: () => { fait = {}; garde(); etape = null; } };
})();
