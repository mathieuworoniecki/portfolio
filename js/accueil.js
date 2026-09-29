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
  courant = b; bulle.textContent = b.txt; bulle.style.minWidth = ''; bulle.hidden = false; bulle.style.minWidth = bulle.offsetWidth + 'px'; taille = null; requestAnimationFrame(() => bulle.classList.add('on'));
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
  // (vague 9, l'audit : la toute première image) : le chat ne tombe plus d'on ne sait où. Une plume le dessine d'abord dans l'air,
  // au-dessus du titre, d'un seul trait (la tête et ses oreilles, le corps, la queue, les yeux) ; le dessin prend vie et tombe sur le titre
  const top = r ? r.top + (L && L.length ? L[0].y0 : 0) : Wd.H * 0.3, s = Wd.s0 * 0.75, y0 = Math.max(s * 1.4, top - s * 1.5);
  // (vague 35 de l'audit : « l'arrivée reste au-dessus du titre ») : la plume entre par le bord de l'écran et traverse toute la pièce en arabesques,
  // son trait derrière elle, jusqu'au titre ; elle y dessine le chat ; quand il prend vie, le long trait est ravalé vers lui comme un fil qu'on rembobine
  if (!reduit && y0 > s) { const P = croquis(x, y0, s); D = { x, y: y0, s, t0: Wd.t + ENVOL, P, F: arabesque(P[0], x < Wd.W / 2 ? 1 : -1, s) };
    K.later(ENVOL + 1.25, () => { R = { F: D.F, t0: Wd.t }; D = null; naitre(x, y0 + s * 0.55); }); }
  else naitre(x, null);
}
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function naitre(x, y) {
  const k = hote = K.addCat({ x }); k.y = y ?? -sc(k) * 1.2; k.fall = true; k.vy = y != null ? -sc(k) * 1.5 : 0; k.vx = 0; k.spin = y != null ? 0 : Math.PI; k.stay = rnd(90, 160);
  if (y != null) { K.dust(x, y, sc(k) * 0.5, 0.9); Wd.fx.push({ k: 'txt', text: 'pop', x: x + sc(k) * 0.5, y: y - sc(k) * 0.6, t0: Wd.t, life: 0.9, rot: 0.15, size: 18 }); }
  K.later(1.3, () => { if (Wd.cats.includes(k)) say(k, pick([L_('tuto.coucou'), '♥'])); });
}
// le croquis : une seule ligne continue (comme on dessine un chat sans lever la plume), puis les deux yeux
let D = null, R = null; const ENVOL = 0.9;
// l'arabesque : du bord de l'écran (à l'opposé du chat, à mi-hauteur) jusqu'au début du croquis, trois boucles qui s'élargissent puis se resserrent
function arabesque(fin, cote, s) {
  const x0 = cote > 0 ? Wd.W + 40 : -40, y0 = Wd.H * 0.62, F = [], n = 90, Rb = Math.min(s * 1.5, Wd.H * 0.14);
  for (let i = 0; i <= n; i++) { const t = i / n, e = t * t * (3 - 2 * t), bx = x0 + (fin[0] - x0) * e, by = y0 + (fin[1] - y0) * e - Math.sin(Math.PI * t) * Wd.H * 0.24,
    b = Math.sin(Math.PI * t), ph = t * Math.PI * 2 * 3; F.push([bx + Math.sin(ph) * Rb * b * -cote, by - (1 - Math.cos(ph)) * Rb * 0.7 * b]); }
  return F;
}
// la plume : un bec d'encre, penché dans le sens où elle va
function plume(x, y, dx, dy, a) { const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, px = -uy, py = ux, L = 34;
  Chalk.stroke([[x, y], [x - ux * L + px * 7, y - uy * L + py * 7], [x - ux * L * 1.5, y - uy * L * 1.5], [x - ux * L + px * -7, y - uy * L - py * 7], [x, y]], 1, { w: 2.4, a, seed: 13, tip: false });
  Chalk.stroke([[x - ux * 8, y - uy * 8], [x - ux * L * 0.8, y - uy * L * 0.8]], 1, { w: 1.6, a, seed: 14, tip: false });
  Chalk.stroke([[x - ux * L * 1.5, y - uy * L * 1.5], [x - ux * L * 3.4 + px * 10, y - uy * L * 3.4 + py * 10]], 1, { w: 2.6, a, seed: 15, tip: false }); }
function croquis(x, y, s) {
  const P = [], at = (u, v) => P.push([x + u * s, y + v * s]);
  // la queue, qui remonte en crochet ; le dos ; la tête avec ses deux oreilles ; le poitrail ; les pattes ; retour à la queue
  for (let i = 0; i <= 8; i++) { const t = i / 8; at(0.55 + Math.sin(t * 2.6) * 0.25, 0.55 - t * 0.55 - Math.sin(t * 3.1) * 0.05); }
  for (let i = 0; i <= 10; i++) { const t = i / 10; at(0.5 - t * 0.55, 0.05 - Math.sin(t * Math.PI) * 0.1); }
  const hx = -0.18, hy = -0.32, hr = 0.3;
  for (let i = 0; i <= 28; i++) { const a = Math.PI * 0.35 - i / 28 * Math.PI * 2.1; let k = 1; [-1, 1].forEach(sd => { const c = -Math.PI / 2 + sd * 0.62, d = Math.atan2(Math.sin(a - c), Math.cos(a - c)); if (Math.abs(d) < 0.3) k += 0.5 * Math.pow(1 - Math.abs(d) / 0.3, 1.2); }); at(hx + Math.cos(a) * hr * k * 1.1, hy + Math.sin(a) * hr * k); }
  for (let i = 0; i <= 10; i++) { const t = i / 10; at(-0.35 + t * 0.05 - Math.sin(t * Math.PI) * 0.12, -0.05 + t * 0.6); }
  for (let i = 0; i <= 10; i++) { const t = i / 10; at(-0.3 + t * 0.85, 0.55 + Math.sin(t * Math.PI * 3) * 0.03); }
  return P;
}
H.draw.push(() => {
  // le fil de l'arabesque, rembobiné vers le chat qui vient de naître
  if (R) { const e = Math.min(1, (Wd.t - R.t0) / 0.6), k = Math.floor(e * e * (R.F.length - 1)); if (e >= 1) R = null; else if (R.F.length - k > 1) Chalk.stroke(R.F.slice(k), 1, { w: 2.2, a: 0.8 * Wd.a, seed: 16, tip: false }); }
  if (!D) return;
  if (Wd.t < D.t0) { const v = Math.max(0, 1 - (D.t0 - Wd.t) / ENVOL), F = D.F, i = Math.min(F.length - 2, Math.floor(v * (F.length - 1)));
    if (v > 0) { Chalk.stroke(F, v, { w: 2.2, a: 0.8 * Wd.a, seed: 16, tip: true }); plume(F[i + 1][0], F[i + 1][1], F[i + 1][0] - F[i][0], F[i + 1][1] - F[i][1], 0.95 * Wd.a); }
    return; }
  Chalk.stroke(D.F, 1, { w: 2.2, a: 0.8 * Wd.a, seed: 16, tip: false });
  const u = Math.min(1, (Wd.t - D.t0) / 1.0);
  Chalk.stroke(D.P, u, { w: 3, a: 0.95 * Wd.a, seed: 11, tip: u < 1 });
  if (u < 0.85) { const P = D.P, i = Math.min(P.length - 2, Math.floor(u / 0.85 * (P.length - 1)) || 0); plume(P[i + 1][0], P[i + 1][1], P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1], 0.95 * Wd.a); }
  if (u > 0.85) [-1, 1].forEach(sd => Chalk.circle(D.x + (-0.18 + sd * 0.11) * D.s, D.y - 0.3 * D.s, D.s * 0.05, D.s * 0.075, (u - 0.85) / 0.15, { w: 3.4, a: 0.95 * Wd.a, seed: 12 + sd }));
});
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

/* ——— (vague 4 de l'audit : « une bulle plate posée sur la scène ») : le geste montré. Une main fantôme, à la craie, fait le geste de l'étape
   en boucle, là où il faut le faire : elle attrape et tire, elle caresse, elle tape dans le vide (onde), elle lance (l'arc et sa flèche) ;
   et la bulle s'écrit à la main, lettre après lettre ——— */
function main(x, y, a, appuie) {   // le curseur : une flèche au trait ; appuyée, un petit rond dessous
  const s = Math.max(0.8, Wd.s0 / 150), Q = [[0, 0], [0, 19], [5, 15], [9, 23], [13, 21], [9, 13], [15, 13], [0, 0]].map(([u, v]) => [x + u * s, y + v * s]);
  Chalk.stroke(Q, 1, { w: 2.2, a, seed: 71, tip: false }); if (appuie) Chalk.circle(x, y, 7 * s, 5 * s, 1, { w: 1.6, a: a * 0.8, seed: 72 });
}
H.draw.push(() => {
  if (!etape || !courant || courant.id !== etape.id || Wd.a < 0.6 || !window.Chalk) return; const p = etape.at(); if (!p) return;
  const t = (Wd.t * 0.55) % 1, a = 0.75 * Wd.a * Math.min(1, t * 8, (1 - t) * 8), s0 = Wd.s0 / 150, x = p[0] + 26 * s0, y = p[1] + 34 * s0;
  if (etape.id === 'attrape') { const u = Math.max(0, (t - 0.3) / 0.6), dy = -Math.sin(Math.min(1, u) * Math.PI / 2) * 70 * s0; if (u > 0) Chalk.stroke([[x, y], [x + 4 * s0, y + dy * 0.5], [x, y + dy]], 1, { w: 1.2, a: a * 0.5, seed: 73, dash: [4, 6] }); main(x, y + dy, a, t > 0.25); }
  else if (etape.id === 'caresse') { const dx = Math.sin(t * Math.PI * 6) * 40 * s0; main(x - 20 * s0 + dx, y + 8 * s0, a, false); if (Math.sin(t * Math.PI * 6) > 0.9) Chalk.text('♥', p[0] + dx * 0.5, p[1] - 10 * s0 - t * 20, 1, { size: 16, align: 'center', a }); }
  else if (etape.id === 'clic') { main(p[0], p[1], a, t > 0.3 && t < 0.45); if (t > 0.35) { const r = (t - 0.35) / 0.65; Chalk.circle(p[0], p[1], 50 * r * s0, 30 * r * s0, 1, { w: 1.4, a: a * (1 - r), seed: 74 }); } }
  else if (etape.id === 'lance') { const u = Math.max(0, (t - 0.25) / 0.5), P = []; for (let i = 0; i <= 10; i++) { const v = i / 10; P.push([p[0] + v * 160 * s0, p[1] - Math.sin(v * Math.PI) * 90 * s0 + v * 30 * s0]); }
    main(P[Math.min(10, Math.round(u * 10))][0], P[Math.min(10, Math.round(u * 10))][1], a, t > 0.2 && t < 0.75); if (u > 0) Chalk.arrow(P, Math.min(1, u * 1.2), { w: 1.3, a: a * 0.6, seed: 75 }); }
});
// la bulle s'écrit à la main
let ecrit = null;
H.post.push(() => { if (!courant) { ecrit = null; return; } const txt = courant.txt || ''; if (!ecrit || ecrit.txt !== txt) ecrit = { txt, t0: Wd.t, n: -1 };
  const n = Math.min(txt.length, Math.floor((Wd.t - ecrit.t0) * 38)); if (n !== ecrit.n) { ecrit.n = n; bulle.textContent = txt.slice(0, n) || ' '; if (n === txt.length) taille = null; } });

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
