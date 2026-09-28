/* Les scènes du portfolio, déclarées sur la ligne du temps (js/film.js).
   Pour l'instant, de quoi éprouver la mécanique, sans le vrai contenu :
     salut  (0 → 1)  une station : le titre s'écrit (à l'encre), deux boutons se dessinent ; en bas, le monde des chats (js/chats.js) : un clic, un chat tombe du ciel ;
                     « Restez jouer ici » : le titre s'efface, le bouton d'entrée monte en haut de l'écran, les chats ont toute la place ;
                     « Entrer dans mon univers » : un trou noir aspire tout dans une spirale (js/trounoir.js), la lecture repart
     espace (1 → 2)  l'écran 2, une station : l'espace, seuls les chats sont recrachés ; ils flottent, s'agrippent au curseur, se cognent, se câlinent
                     (plus tard : le dessin, le texte qui défile, les planètes)
   Une scène : { id, t0, t1, hold, fade, enter(S), frame(S), back(S, ctx), draw(S, ctx), exit(S), click(x, y, S),
   grab(x, y, S), drag(clé, x, y, dx, dy, S), release(clé, vx, vy, S), resize(S), reset() } — voir js/film.js pour S. */
(() => {
const { c01, sm, Pops, Debris, Burst } = Outils, C = Chalk, TAU = Math.PI * 2;
const $ = s => document.querySelector(s);
const NAMES = ['roulement', 'vis'];   // les objets d'exemple (js/objects3d.js), sans les chats (WebGL absent)
Pops.names = NAMES;
const TN = window.TrouNoir || null;
// attraper un objet qui a jailli (commun aux deux stations)
// les chats (js/chats.js) vivent sur l'écran d'accueil ; sans eux (WebGL absent), les objets qui jaillissent
const CH = window.Chats || null;
const popGrab = { grab: (x, y) => Pops.hit(x, y), drag: (o, x, y) => Pops.hold(o, x, y), release: (o, vx, vy) => Pops.release(o, vx, vy) };

/* ——— 1 · la station « Salut » ——— */
const enterBtn = $('#enter'), stayBtn = $('#stay'), root = document.documentElement;
let reste = null, chute = false;   // l'horloge du clic sur « Restez jouer ici » (null : pas encore)
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
// on reste jouer : le titre tombe (ou s'efface), ce bouton s'en va, et le bouton d'entrée file en haut de l'écran
if (stayBtn) stayBtn.addEventListener('click', () => {
  if (reste !== null) return; reste = Film.clock; stayBtn.disabled = true;
  // les lettres du titre dégringolent jusqu'au sol (js/vie.js) ; sans elles, le titre se dé-écrit
  chute = !!(window.Vie && Vie.tombe());
  setTimeout(() => {
    const a = enterBtn.getBoundingClientRect(); root.classList.add('jeu'); const b = enterBtn.getBoundingClientRect();
    enterBtn.style.transition = 'none'; enterBtn.style.transform = `translate(${a.left - b.left}px,${a.top - b.top}px)`; void enterBtn.offsetWidth;
    enterBtn.style.transition = 'transform .8s cubic-bezier(.3,1.4,.5,1),letter-spacing .3s'; enterBtn.style.transform = '';
  }, 750);
});
// (depuis la sortie de l'espace : le titre et les boutons s'écrivent une fois la pièce revenue, js/trounoir.js)
const vu = S => TN ? Math.min(S.since, TN.depuis) : S.since;
const salut = Object.assign({
  id: 'salut', t0: 0, t1: 1, hold: true, fade: 0.2,
  enter() { if (enterBtn) enterBtn.classList.remove('drawn'); if (TN) TN.retour(); },
  frame(S) {
    // aspiré par le trou noir (ou déjà dans l'espace) : plus de titre ni de boutons ; les chats continuent (js/trounoir.js)
    if (TN && TN.actif) { this.titles.forEach(el => Titles.progress(el, 0)); if (CH) CH.frame(S); return; }
    // le titre s'écrit à l'arrivée (horloge réelle : la lecture est arrêtée sur une station)
    this.titles.forEach(el => Titles.progress(el, reste !== null ? chute ? 1 : 1 - sm((S.clock - reste) / 0.7) : S.reduced ? 1 : sm((vu(S) - 0.3) / 2.4)));
    if (CH) CH.frame(S); else { Pops.step(S); Pops.put(S, S.a); }
  },
  exit() { if (CH) CH.hide(); },
  draw(S, ctx) {
    if (TN && TN.actif) { if (CH) CH.draw(S, ctx); return; }
    const pb = S.reduced ? 1 : sm((vu(S) - 2.3) / 0.9);
    Outils.button(enterBtn, pb, 1100, S.clock);
    if (reste === null) glowButton(stayBtn, S.reduced ? 1 : sm((vu(S) - 2.0) / 1.1), 1200, S.clock);
    else if (S.clock - reste < 0.5) glowButton(stayBtn, 1 - sm((S.clock - reste) / 0.45), 1200, S.clock);
    // l'invitation, écrite à la main sous les boutons, tant que rien n'a jailli
    const hb = reste === null && (CH ? !CH.clicks : !Pops.list.length) && enterBtn;
    if (hb) { const r = hb.getBoundingClientRect(), r2 = stayBtn ? stayBtn.getBoundingClientRect() : r, bot = Math.max(r.bottom, r2.bottom), cx = (Math.min(r.left, r2.left) + Math.max(r.right, r2.right)) / 2; C.text(L('salut.hint'), cx, bot + 24 * S.K, S.reduced ? 1 : c01((vu(S) - 3.4) / 1.2), { size: 19, align: 'center', a: 0.55 }); }
    if (CH) CH.draw(S, ctx); else Pops.draw(S, ctx);
  },
  click(x, y, S) { return CH ? CH.click(x, y, S) : Pops.spawn(x, y, S); }
}, CH ? { grab: (x, y) => CH.grab(x, y), drag: (c, x, y) => CH.drag(c, x, y), release: (c, vx, vy) => CH.release(c, vx, vy) } : popGrab);
// le bouton : le trou noir aspire tout, puis la lecture repart vers l'espace (sans les chats : la rupture, un éclat de craie)
if (enterBtn) enterBtn.addEventListener('click', () => {
  if (TN) { if (!TN.actif) TN.aspire(() => Film.waiting ? Film.go() : Film.toChapter(1)); return; }
  const r = enterBtn.getBoundingClientRect();
  Burst.fire(r.left + r.width / 2, r.top + r.height / 2, { K: Chalk.scale, clock: Film.clock });
  Film.go();
});

/* ——— 2 · l'espace (l'écran 2) : les chats y flottent (js/trounoir.js) ; sans eux, les objets qui jaillissent ——— */
const floaters = Debris(8, NAMES);
const espace = Object.assign({
  id: 'espace', t0: 1, t1: 2, hold: true, fade: 0.2,
  enter() { if (TN) TN.entre(); },
  frame(S) { if (CH && TN) CH.frame(S); else { floaters.frame(S, S.a, 58); Pops.step(S); Pops.put(S, S.a); } },
  draw(S, ctx) { if (CH && TN) CH.draw(S, ctx); else Pops.draw(S, ctx); },
  click(x, y, S) { return CH && TN ? CH.click(x, y, S) : Pops.spawn(x, y, S); },
  reset() { floaters.reset(); }
}, CH && TN ? { grab: (x, y) => CH.grab(x, y), drag: (c, x, y) => CH.drag(c, x, y), release: (c, vx, vy) => CH.release(c, vx, vy) } : popGrab);

/* ——— la rupture se dessine par-dessus tout, quelle que soit la scène ——— */
const burstLayer = { draw(S, ctx) { Burst.draw(S, ctx); } };

Film.setup({
  scenes: [salut, espace],
  chapters: [[0, 'ch.1'], [1, 'ch.2']],
  // mouvement réduit : une image fixe par chapitre
  rest: [0.95, 1.95],
  overlay: burstLayer
});
})();
