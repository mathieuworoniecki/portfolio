/* Les scènes du portfolio, déclarées sur la ligne du temps (js/film.js).
   Pour l'instant, de quoi éprouver la mécanique, sans le vrai contenu :
     salut  (0 → 1)  une station : le titre s'écrit (à l'encre), deux boutons se dessinent ; en bas, le monde des chats (js/chats.js) : un clic, un chat tombe du ciel ;
                     « Restez jouer ici » : le titre s'efface, le bouton d'entrée monte en haut de l'écran, les chats ont toute la place ;
                     « Entrer dans mon univers » : la rupture (un éclat de craie), la lecture démarre
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
// les chats (js/chats.js) vivent sur l'écran d'accueil ; sans eux (WebGL absent), les objets qui jaillissent
const CH = window.Chats || null;
const popGrab = { grab: (x, y) => Pops.hit(x, y), drag: (o, x, y) => Pops.hold(o, x, y), release: (o, vx, vy) => Pops.release(o, vx, vy) };

/* ——— 1 · la station « Salut » ——— */
const enterBtn = $('#enter'), stayBtn = $('#stay'), root = document.documentElement;
let reste = null;   // l'horloge du clic sur « Restez jouer ici » (null : pas encore)
// « Restez jouer ici » : le même cadre que l'autre bouton, mais il brille : un halo de lumière qui respire,
// un reflet qui le traverse (css/site.css) et de petites étoiles qui scintillent autour
function glowButton(el, prog, seed, clock) {
  if (!el || prog <= 0.001) return;
  const r = el.getBoundingClientRect(); if (!r.width) return; const ctx = C.ctx; if (!ctx) return;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, pulse = 0.75 + 0.25 * Math.sin(clock * 2.4), a = c01(prog * 1.4);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, r.height / r.width * 1.6);
  const R = r.width * 0.85, g = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, R);
  g.addColorStop(0, `rgba(255,255,255,${0.75 * a * pulse})`); g.addColorStop(0.45, `rgba(255,252,238,${0.35 * a * pulse})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
  Outils.button(el, prog, seed, clock);
  // les étoiles : quatre branches, elles naissent, brillent et s'éteignent autour du cadre
  for (let k = 0; k < 6; k++) { const ph = (clock * 0.55 + k / 6) % 1, ang = k * 2.4 + Math.floor(clock * 0.55 + k / 6) * 1.7, sz = (4 + (k % 3) * 2) * Math.sin(ph * Math.PI) * a;
    if (sz < 0.5) continue; const x = cx + Math.cos(ang) * (r.width / 2 + 16), y = cy + Math.sin(ang) * (r.height / 2 + 12);
    C.line(x - sz, y, x + sz, y, 1, { w: 1.3, a: 0.8, seed: k, tip: false, amp: 0 }); C.line(x, y - sz, x, y + sz, 1, { w: 1.3, a: 0.8, seed: k + 9, tip: false, amp: 0 }); }
}
// on reste jouer : le titre s'efface (il se dé-écrit), ce bouton s'en va, et le bouton d'entrée file en haut de l'écran
if (stayBtn) stayBtn.addEventListener('click', () => {
  if (reste !== null) return; reste = Film.clock; stayBtn.disabled = true;
  setTimeout(() => {
    const a = enterBtn.getBoundingClientRect(); root.classList.add('jeu'); const b = enterBtn.getBoundingClientRect();
    enterBtn.style.transition = 'none'; enterBtn.style.transform = `translate(${a.left - b.left}px,${a.top - b.top}px)`; void enterBtn.offsetWidth;
    enterBtn.style.transition = 'transform .8s cubic-bezier(.3,1.4,.5,1),letter-spacing .3s'; enterBtn.style.transform = '';
  }, 750);
});
const salut = Object.assign({
  id: 'salut', t0: 0, t1: 1, hold: true,
  enter() { if (enterBtn) enterBtn.classList.remove('drawn'); },
  frame(S) {
    // le titre s'écrit à l'arrivée (horloge réelle : la lecture est arrêtée sur une station)
    this.titles.forEach(el => Titles.progress(el, reste !== null ? 1 - sm((S.clock - reste) / 0.7) : S.reduced ? 1 : sm((S.since - 0.3) / 2.4)));
    if (CH) CH.frame(S); else { Pops.step(S); Pops.put(S, S.a); }
  },
  exit() { if (CH) CH.hide(); },
  draw(S, ctx) {
    const pb = S.reduced ? 1 : sm((S.since - 2.3) / 0.9);
    Outils.button(enterBtn, pb, 1100, S.clock);
    if (reste === null) glowButton(stayBtn, S.reduced ? 1 : sm((S.since - 2.0) / 1.1), 1200, S.clock);
    else if (S.clock - reste < 0.5) glowButton(stayBtn, 1 - sm((S.clock - reste) / 0.45), 1200, S.clock);
    // l'invitation, écrite à la main sous les boutons, tant que rien n'a jailli
    const hb = reste === null && (CH ? !CH.clicks : !Pops.list.length) && enterBtn;
    if (hb) { const r = hb.getBoundingClientRect(), r2 = stayBtn ? stayBtn.getBoundingClientRect() : r, bot = Math.max(r.bottom, r2.bottom), cx = (Math.min(r.left, r2.left) + Math.max(r.right, r2.right)) / 2; C.text(L('salut.hint'), cx, bot + 40 * S.K, S.reduced ? 1 : c01((S.since - 3.4) / 1.2), { size: 19, align: 'center', a: 0.55 }); }
    if (CH) CH.draw(S, ctx); else Pops.draw(S, ctx);
  },
  click(x, y, S) { return CH ? CH.click(x, y, S) : Pops.spawn(x, y, S); }
}, CH ? { grab: (x, y) => CH.grab(x, y), drag: (c, x, y) => CH.drag(c, x, y), release: (c, vx, vy) => CH.release(c, vx, vy) } : popGrab);
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
    if (h && S.wide) { const A = [h.right + 20, h.top + h.height * 0.45], B = [o.x - o.r * 1.05, o.y - o.r * 0.55], M = [(A[0] + B[0]) / 2, Math.min(A[1], B[1]) - 60 * S.K], P = [];
      for (let k = 0; k <= 16; k++) { const t = k / 16, u = 1 - t; P.push([u * u * A[0] + 2 * u * t * M[0] + t * t * B[0], u * u * A[1] + 2 * u * t * M[1] + t * t * B[1]]); }   /* une courbe, pas un angle */
      C.arrow(P, c01((s - 2.5) / 0.8), { seed: 31, w: 2.2 }); }
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
