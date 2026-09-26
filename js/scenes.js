/* Les scènes du portfolio, déclarées sur la ligne du temps (js/film.js).
   Pour l'instant, de quoi éprouver la mécanique, sans le vrai contenu :
     salut  (0 → 1)  une station : le titre s'écrit, le bouton se dessine ; un clic ailleurs fait jaillir un objet (20 au plus) ;
                     le bouton « Entrer dans mon monde » : la rupture (un éclat de craie), la lecture démarre
     essai  (1 → 6)  une scène de cinq secondes pilotée par la timeline : le titre s'écrit, un objet s'assemble,
                     le temps ralentit (WARP) pendant qu'une flèche et une note se dessinent, une phrase passe
     jeu    (6 → 7)  la station finale : un monde libre, des objets qui flottent, on clique, on attrape, on lance
   Une scène : { id, t0, t1, hold, fade, enter(S), frame(S), back(S, ctx), draw(S, ctx), exit(S), click(x, y, S),
   grab(x, y, S), drag(clé, x, y, dx, dy, S), release(clé, vx, vy, S), resize(S), reset() } — voir js/film.js pour S. */
(() => {
const { c01, sm, Pops, Debris, Burst } = Outils, C = Chalk, TAU = Math.PI * 2;
const $ = s => document.querySelector(s);
const NAMES = ['roulement', 'vis'];   // les objets d'exemple (js/objects3d.js) ; plus tard : les chats
Pops.names = NAMES;
// attraper un objet qui a jailli (commun aux deux stations)
const popGrab = { grab: (x, y) => Pops.hit(x, y), drag: (o, x, y) => Pops.hold(o, x, y), release: (o, vx, vy) => Pops.release(o, vx, vy) };

/* ——— 1 · la station « Salut » ——— */
const enterBtn = $('#enter');
const salut = Object.assign({
  id: 'salut', t0: 0, t1: 1, hold: true,
  enter() { if (enterBtn) enterBtn.classList.remove('drawn'); },
  frame(S) {
    // le titre s'écrit à l'arrivée (horloge réelle : la lecture est arrêtée sur une station)
    this.titles.forEach(el => Titles.progress(el, S.reduced ? 1 : sm((S.since - 0.3) / 2.4)));
    Pops.step(S); Pops.put(S, S.a);
  },
  draw(S, ctx) {
    Outils.button(enterBtn, S.reduced ? 1 : sm((S.since - 2.3) / 0.9), 1100, S.clock);
    // l'invitation, écrite à la main sous le bouton, tant que rien n'a jailli
    if (!Pops.list.length && enterBtn) { const r = enterBtn.getBoundingClientRect(); C.text(L('salut.hint'), r.left + r.width / 2, r.bottom + 44 * S.K, S.reduced ? 1 : c01((S.since - 3.4) / 1.2), { size: 19, align: 'center', a: 0.55 }); }
    Pops.draw(S, ctx);
  },
  click(x, y, S) { return Pops.spawn(x, y, S); }
}, popGrab);
// le bouton : la rupture, puis la lecture démarre
if (enterBtn) enterBtn.addEventListener('click', () => {
  const r = enterBtn.getBoundingClientRect();
  Burst.fire(r.left + r.width / 2, r.top + r.height / 2, { K: Chalk.scale, clock: Film.clock });
  Film.go();
});

/* ——— 2 · une scène de cinq secondes, pilotée par la ligne du temps ——— */
const essai = {
  id: 'essai', t0: 1, t1: 6,
  frame(S) {
    const s = S.s;
    this.titles.forEach(el => Titles.progress(el, c01((s - 1.25) / 1.4)));
    // l'objet : il arrive en pièces (éclaté), s'assemble, tourne avec le temps ; on peut l'attraper pour le faire tourner
    const x = S.wide ? S.W * 0.66 : S.W * 0.5, y = S.wide ? S.H * 0.5 : S.H * 0.6, size = Math.min(S.W * (S.wide ? 0.3 : 0.62), S.H * 0.46);
    const e = 1 - sm((s - 1.3) / 1.8), zoom = 1 + 0.18 * sm((s - 3) / 0.5) * (1 - sm((s - 4) / 0.6));
    Obj3D.put('roulement', x, y, size * zoom, [0.9 + Math.sin(s * 0.8) * 0.25, s * 0.9, 0.3], { a: S.a, e, grab: 'essai' });
    this.obj = { x, y, r: size * 0.5 * zoom };
    // la grille glisse un peu avec le temps (de la profondeur, sans défilement)
    return { grid: (s - 1) * 14 };
  },
  draw(S) {
    const s = S.s, o = this.obj; if (!o) return;
    // le temps ralentit (WARP 3 → 4) : un cercle se referme autour de l'objet, et une note le dit
    C.circle(o.x, o.y, o.r * 1.12, o.r * 1.02, sm((s - 3) / 0.9), { seed: 21, w: 2.2, amp: 1 });
    const nx = S.wide ? o.x - o.r * 1.35 : o.x - o.r * 0.2, ny = S.wide ? o.y + o.r * 0.95 : o.y - o.r * 1.35;
    C.text(L('essai.note'), nx, ny, c01((s - 3.2) / 0.6), { size: 24, rot: -0.05, align: S.wide ? 'right' : 'center' });
    // une flèche du titre vers l'objet
    const h = this.titles[0] && this.titles[0].getBoundingClientRect();
    if (h && S.wide) C.arrow([[h.right + 20, h.top + h.height * 0.45], [(h.right + o.x - o.r) / 2, h.top - 10], [o.x - o.r * 1.05, o.y - o.r * 0.55]], c01((s - 2.5) / 0.8), { seed: 31, w: 2.2 });
  }
};

/* ——— 3 · la station finale : le terrain de jeu ——— */
const floaters = Debris(8, NAMES);
const jeu = Object.assign({
  id: 'jeu', t0: 6, t1: 7, hold: true,
  frame(S) {
    this.titles.forEach(el => Titles.progress(el, S.reduced ? 1 : sm((S.since - 0.2) / 1.8)));
    floaters.frame(S, S.a, 58);
    Pops.step(S); Pops.put(S, S.a);
  },
  draw(S, ctx) { Pops.draw(S, ctx); },
  click(x, y, S) { return Pops.spawn(x, y, S); },
  reset() { floaters.reset(); }
}, popGrab);

/* ——— la rupture se dessine par-dessus tout, quelle que soit la scène ——— */
const burstLayer = { draw(S, ctx) { Burst.draw(S, ctx); } };

Film.setup({
  scenes: [salut, essai, jeu],
  chapters: [[0, 'ch.1'], [1, 'ch.2'], [6, 'ch.3']],
  // le temps se dilate : le passage 3 → 4 de la scène d'essai dure 3 secondes
  warp: [[3, 4, 3]],
  caps: [{ t0: 4.3, t1: 5.9, text: L('essai.cap') }],
  // mouvement réduit : une image fixe par chapitre
  rest: [0.95, 4.6, 6.95],
  overlay: burstLayer
});
})();
