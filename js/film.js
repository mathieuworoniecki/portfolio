/* Le film : un seul écran, jamais de défilement. C'est le temps qui avance (le modèle de HUman).
   - T, l'horloge du film (en secondes réelles), avance seule pendant la lecture ; story(T) donne le temps logique
     de la ligne du temps (le temps « se dilate » par endroits : WARP) ; realOf(s) fait l'inverse.
   - Les scènes (js/scenes.js) sont déclarées : { id, t0, t1, hold, fade, enter(S), frame(S), draw(S), exit(S), … }.
     Chaque scène ne vit que dans sa plage [t0, t1] (en temps logique), avec un fondu d'entrée et de sortie ;
     son calque DOM (.scene[data-scene=id]) suit son opacité.
   - Une station (hold: true) arrête la lecture à son t1 et attend un geste (Film.go(), un bouton, la molette…) ;
     seules les boucles de vie tournent. La dernière scène, si elle est une station, est un monde libre.
   - Les chapitres CH = [[t0, clé]] : la barre du bas (un segment par chapitre, qui se remplit ; clic pour sauter,
     glisser pour avancer ou reculer), les flèches, la molette et le geste vertical (un cran = un chapitre, avec un verrou).
   - Les phrases CAPS = [{ t0, t1, text }] apparaissent lettre à lettre et s'effacent.
   - Mouvement réduit : pas de lecture automatique ; une image fixe par chapitre (REST).
   Repris de LookAnimation (js/scroll.js) : la mesure, la prise à la souris avec inertie, le filtrage des clics,
   le chargement des polices avant la mise en page, l'accès réservé.
   Ce que reçoit une scène à chaque image (S) :
     s        le temps logique              u      la progression dans la scène (0 → 1)     a    son opacité (0 → 1)
     dt       le pas réel (s ; 0 en mouvement réduit)                                         clock l'horloge réelle (s)
     since    le temps réel depuis son entrée (s)          waiting  la lecture attend sur cette station
     W, H     la taille de l'écran     K l'échelle des dessins     wide l'écran est plus large que haut     reduced, playing */
window.Film = (() => {
const root = document.documentElement;
root.classList.add('js');
const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, lerp = (a, b, t) => a + (b - a) * t, sm = v => { v = c01(v); return v * v * (3 - 2 * v); };
const $ = s => document.querySelector(s);
const L_ = (k, ...a) => window.L ? window.L(k, ...a) : k;

/* ——— la ligne du temps, posée par js/scenes.js (Film.setup) ——— */
let SC = [], CH = [], CAPS = [], WARP = [], REST = [], END = 0, EXTRA = 0, OV = null;   // OV : un calque dessiné par-dessus toutes les scènes
/* ——— le temps qui se dilate : WARP = [[a, b, d]] — le passage logique [a, b] dure d secondes réelles ——— */
function story(t) {
  let off = 0;
  for (const [a, b, d] of WARP) { const ra = a + off; if (t < ra) return t - off; if (t < ra + d) return a + (t - ra) * (b - a) / d; off += d - (b - a); }
  return t - off;
}
function realOf(s) {
  let off = 0;
  for (const [a, b, d] of WARP) { if (s < a || (s === a && b === a)) return s + off; if (s < b) return a + off + (s - a) * d / (b - a); off += d - (b - a); }
  return s + off;
}

/* ——— l'état du film ——— */
let T = 0, playing = false, wait = null, opened = false, clock = 0, frameId = 0;
const ppBtn = $('#pp'), rstBtn = $('#rst'), sndBtn = $('#snd'), chapEl = $('#chap'), capsEl = $('#caps'), hint = $('.grab-hint');
function syncPP() {
  const on = playing && !wait; ppBtn.querySelector('.t').textContent = L_(on ? 'film.pause' : 'film.play');
  ppBtn.setAttribute('aria-label', L_(on ? 'film.pause' : 'film.play'));
  ppBtn.querySelector('.ic-pause').style.display = on ? '' : 'none'; ppBtn.querySelector('.ic-play').style.display = on ? 'none' : '';
}
function setPlaying(p) {
  // relancer la lecture sur une station, c'est la quitter ; sur la dernière (le monde libre), c'est revoir le film
  if (p && wait) { if (wait === SC[SC.length - 1]) replay(); else go(); return; }
  if (p && story(T) >= END - 1e-3) { replay(); return; }
  playing = p && !reduced; syncPP();
}
function seek(t, play) {
  T = Math.max(0, Math.min(END + EXTRA, t)); wait = null;
  if (play !== undefined) playing = !!play && !reduced;
  syncPP();
}
// quitter la station : la lecture reprend (en mouvement réduit : l'image fixe du chapitre suivant)
function go() {
  if (!wait && playing) return;
  const w = wait; wait = null;
  if (reduced) { const n = Math.min(CH.length - 1, chapterAt(story(T)) + 1); seek(realOf(REST[n])); return; }
  if (w) T = realOf(w.t1) + 1e-3;
  playing = true; syncPP();
}
function replay() { SC.forEach(sc => sc.reset && sc.reset()); live.forEach(el => el.remove()); live.clear(); seek(reduced ? realOf(REST[0]) : 0, true); }

/* ——— les chapitres : la barre du bas ——— */
let chapBtns = [], chapFill = [], lastChap = -1;
// un chapitre commence juste après son t0 : l'instant exact d'une borne (où attend une station) appartient au chapitre d'avant
function chapterAt(s) { let ci = 0; CH.forEach(([t], i) => { if (s > t + 1e-4) ci = i; }); return ci; }
const chapEnd = i => i < CH.length - 1 ? CH[i + 1][0] : END;
function toChapter(n) { n = Math.max(0, Math.min(CH.length - 1, n)); seek(realOf(reduced ? REST[n] : CH[n][0] + 0.01), true); }
function buildChapters() {
  chapEl.innerHTML = ''; chapEl.style.setProperty('--n', CH.length);
  CH.forEach(([t, key], i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', L_('film.chapter', i + 1, L_(key)));
    // une station : son segment le dit (il respire tant qu'elle attend)
    if (SC.some(sc => sc.hold && sc.t1 > t && sc.t1 <= chapEnd(i))) b.classList.add('hold');
    b.innerHTML = `<span class="lbl">${L_(key)}</span><span class="bar"><i></i></span>`;
    b.addEventListener('click', e => { if (e.detail === 0) toChapter(i); });   // au clavier ; à la souris, c'est la barre qui glisse
    chapEl.appendChild(b);
  });
  chapBtns = [...chapEl.children]; chapFill = chapBtns.map(b => b.querySelector('i'));
}
// la barre se glisse : chaque segment couvre son chapitre
let chapDrag = false, chapWas = false;
const chapTime = x => {
  const r = chapEl.getBoundingClientRect(), f = c01((x - r.left) / r.width) * CH.length, i = Math.min(CH.length - 1, Math.floor(f));
  const t0 = CH[i][0], t1 = chapEnd(i);
  return realOf(t0 + (t1 - t0) * Math.min(0.999, f - i));
};
chapEl.addEventListener('pointerdown', e => { if (!CH.length) return; chapDrag = true; chapWas = playing || !!wait; chapEl.classList.add('drag'); try { chapEl.setPointerCapture(e.pointerId); } catch (er) {} seek(chapTime(e.clientX), false); e.preventDefault(); });
chapEl.addEventListener('pointermove', e => { if (chapDrag) seek(chapTime(e.clientX), false); });
const chapStop = () => { if (!chapDrag) return; chapDrag = false; chapEl.classList.remove('drag'); if (chapWas && !reduced) { playing = true; syncPP(); } };
chapEl.addEventListener('pointerup', chapStop); chapEl.addEventListener('pointercancel', chapStop);
function updateChap(s) {
  const ci = chapterAt(s);
  CH.forEach(([t], i) => { chapFill[i].style.transform = `scaleX(${c01((s - t) / (chapEnd(i) - t)).toFixed(3)})`; });
  if (ci !== lastChap) {
    chapBtns.forEach((b, i) => { b.classList.toggle('on', i === ci); if (i === ci) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    if (lastChap >= 0) sound('chap');
    lastChap = ci;
  }
}

/* ——— les phrases : lettre à lettre, puis elles s'effacent (repris de HUman) ——— */
const live = new Map();
function makeCap(c) {
  const el = document.createElement('p'); el.className = 'cap'; let n = 0;
  const cjk = window.I18N && I18N.cjk;
  el.innerHTML = (cjk ? [c.text] : c.text.split(' ')).map(w => `<span class="w">${[...w].map(ch => `<span class="ch" style="transition-delay:${(n++) * 22}ms">${ch}</span>`).join('')}</span>`).join(' ');
  capsEl.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  return el;
}
function updateCaps(s) {
  CAPS.forEach((c, i) => {
    const on = s >= c.t0 && s < c.t1;
    if (on && !live.has(i)) live.set(i, makeCap(c));
    else if (!on && live.has(i)) { const el = live.get(i); live.delete(i); el.classList.add('out'); setTimeout(() => el.remove(), 1000); }
  });
}

/* ——— le son (optionnel, coupé par défaut) : un petit bruit de craie, calculé (Web Audio) ——— */
let AC = null, soundOn = false;
function sound(kind) {
  if (!soundOn || !AC) return;
  const n = Math.floor(AC.sampleRate * (kind === 'pop' ? 0.09 : 0.05)), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  f.type = 'bandpass'; f.frequency.value = kind === 'pop' ? 900 + Math.random() * 500 : 2600; f.Q.value = 1.2; g.gain.value = kind === 'pop' ? 0.5 : 0.18;
  src.buffer = buf; src.connect(f); f.connect(g); g.connect(AC.destination); src.start();
}
sndBtn.addEventListener('click', () => {
  try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return; }
  soundOn = !soundOn; sndBtn.setAttribute('aria-pressed', String(soundOn)); sound('chap');
});
ppBtn.addEventListener('click', () => setPlaying(!(playing && !wait)));
rstBtn.addEventListener('click', replay);

/* ——— la mesure (repris de LookAnimation) ——— */
let vw = 1, vh = 1, wide = true, K = 1;
function measure() {
  // la largeur sans barre : celle où la page s'affiche (sinon tout ce qui est dessiné est décalé et étiré)
  vw = document.documentElement.clientWidth || innerWidth; vh = innerHeight; wide = vw / vh > 1;
  // l'échelle des dessins : la hauteur compte aussi (portables larges et peu hauts, téléphones)
  K = Math.max(0.55, Math.min(1.3, Math.min(vw / 1280, vh / 760)));
  if (window.Chalk) Chalk.scale = K;
  if (window.Obj3D) Obj3D.resize(vw, vh);
  Grid.resize(vw, vh);
  Titles.resize(vw, vh);
  SC.forEach(sc => sc.resize && sc.resize(state()));
}

/* ——— attraper : une scène peut prendre la main (sc.grab / drag / release), sinon un objet 3D tourne sur lui-même ——— */
const drag = { on: false, key: null, sc: null, x: 0, y: 0, vx: 0, vy: 0, t: 0, spin: null };
const UI = 'a,button,select,input,label,.top,.film-ui,#gate,.tp-panel';
const onUI = e => e.target.closest && e.target.closest(UI);
function grabAt(x, y) {
  for (const sc of SC) if (sc.a > 0.5 && sc.grab) { const k = sc.grab(x, y, state(sc)); if (k) return { key: k, sc }; }
  const k = window.Obj3D && Obj3D.hit ? Obj3D.hit(x, y) : null;
  return k ? { key: k, sc: null } : null;
}
const turn = (dx, dy) => { if (drag.spin) Obj3D.drag(drag.spin, dx, dy); };
addEventListener('pointerdown', e => {
  if (e.button !== 0 || root.classList.contains('locked') || onUI(e)) return;
  const g = grabAt(e.clientX, e.clientY); if (!g) return;
  Object.assign(drag, { on: true, key: g.key, sc: g.sc, spin: g.sc ? null : g.key, x: e.clientX, y: e.clientY, vx: 0, vy: 0, t: performance.now() });
  root.classList.add('grabbing'); e.preventDefault();
});
addEventListener('pointermove', e => {
  if (drag.on) {
    const now = performance.now(), dx = e.clientX - drag.x, dy = e.clientY - drag.y, dtm = Math.max(4, now - drag.t); drag.x = e.clientX; drag.y = e.clientY;
    if (drag.sc) drag.sc.drag && drag.sc.drag(drag.key, e.clientX, e.clientY, dx, dy, state(drag.sc)); else turn(dx, dy);
    // la vitesse du geste, en pixels par image (moyennée), pour lancer au lâcher
    drag.vx = lerp(drag.vx, dx / dtm * 16.7, 0.5); drag.vy = lerp(drag.vy, dy / dtm * 16.7, 0.5); drag.t = now; return;
  }
  if (e.pointerType === 'mouse') {
    const g = !root.classList.contains('locked') && !onUI(e) ? grabAt(e.clientX, e.clientY) : null;
    root.classList.toggle('can-grab', !!g && !g.sc); root.classList.toggle('can-hold', !!g && !!g.sc);
    hint.style.transform = `translate(${e.clientX + 24}px, ${e.clientY + 22}px)`;
  }
}, { passive: true });
let dragEnd = -1e9;
// (le navigateur reprend le geste : on lâche là où il est, sans lancer)
addEventListener('pointercancel', () => { if (drag.on) drag.t = 0; dragUp(); });
// (27/09, l'audit : la fenêtre perd la main pendant qu'on tient un chat : on le lâche, sinon il restait suspendu)
addEventListener('blur', () => { if (drag.on) { drag.t = 0; dragUp(); } });
addEventListener('pointerup', dragUp);
function dragUp() {
  if (!drag.on) return; drag.on = false; dragEnd = performance.now(); hint.classList.add('done'); root.classList.remove('grabbing');
  if (performance.now() - drag.t > 90) drag.vx = drag.vy = 0;   // arrêté avant de lâcher : pas de lancer
  if (drag.sc) { drag.sc.release && drag.sc.release(drag.key, drag.vx * 60, drag.vy * 60, state(drag.sc)); drag.vx = drag.vy = 0; drag.sc = null; }
  drag.t = performance.now();
}

/* ——— un clic sur le film (court, sans glisser, pas sur un bouton, pas en attrapant) : la scène le prend, sinon lecture / pause ——— */
let downAt = null;
addEventListener('pointerdown', e => { downAt = onUI(e) || root.classList.contains('locked') ? null : { x: e.clientX, y: e.clientY, t: performance.now(), grab: !!grabAt(e.clientX, e.clientY) }; }, true);
addEventListener('pointerup', e => {
  const d = downAt; downAt = null; if (!d || d.grab || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 450) return;
  for (const sc of SC) if (sc.a > 0.5 && sc.click && sc.click(e.clientX, e.clientY, state(sc))) return;
  if (chez()) return;   // chez les chats, un clic est toujours pour les chats : il ne relance jamais la lecture (Mathieu, 27/09)
  setPlaying(!(playing && !wait));
});

/* ——— le clavier, la molette, le geste : la page ne défile jamais ; un cran = un chapitre ——— */
// l'écran des chats : on n'en sort que par la barre des chapitres ou le bouton « Entrer » (ni molette, ni geste, ni flèches, ni clic)
const chez = () => SC.some(sc => (sc.id === 'salut' || sc.id === 'espace') && sc.a > 0.5);   // (et dans l'espace, l'écran 2 : pareil)
function step(dir) { if (window.EspacePlume && EspacePlume.pas && EspacePlume.pas(dir)) return; if (chez()) return; step0(dir); }   // (dans l'espace : la scène suivante de la présentation, js/espace-plume.js)
function step0(dir) { const s = story(T), ci = chapterAt(s); if (dir > 0 && wait && ci === CH.length - 1) return; toChapter(ci + dir); }
addEventListener('keydown', e => {
  if (root.classList.contains('locked') || (e.target.closest && e.target.closest('input,select,.tp-panel'))) return;
  if (e.target.closest && e.target.closest('button,a') && (e.key === ' ' || e.key === 'Enter')) return;
  if (e.key === ' ') { e.preventDefault(); if (!chez()) setPlaying(!(playing && !wait)); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
  else if (e.key === 'Home') { e.preventDefault(); toChapter(0); }
  else if (e.key === 'End') { e.preventDefault(); toChapter(CH.length - 1); }
});
// la molette : un cran vers le bas (ou un geste vers le haut) = chapitre suivant. Le verrou dure le temps de la transition,
// et tant que la molette (ou l'inertie d'un pavé tactile) continue d'envoyer des crans : un seul chapitre par geste.
const wheel = { acc: 0, lock: 0, last: 0, fired: false };
addEventListener('wheel', e => {
  if (e.target.closest && e.target.closest('.tp-panel,.pick ul,select')) return;
  e.preventDefault();
  if (root.classList.contains('locked')) return;
  // en train de tenir quelque chose (ou juste lâché) : un pavé tactile envoie des crans quand un second doigt bouge, on les ignore
  if (drag.on || e.buttons || performance.now() - dragEnd < 700) { wheel.acc = 0; return; }
  // sur un chat ou un objet, la molette sert au monde des chats (js/molette.js : la gratouille, la manivelle…)
  if (window.Molette && Molette(e.clientX, e.clientY, e.deltaY * (e.deltaMode === 1 ? 16 : 1))) { wheel.acc = 0; return; }
  const now = performance.now(), dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1), gap = now - wheel.last; wheel.last = now;
  // le même geste continue (verrou) : on l'ignore ; une pause, et c'est un nouveau geste
  if (wheel.fired && (now - wheel.lock < 650 || gap < 160)) return;
  if (gap > 300) wheel.acc = 0;
  wheel.fired = false; wheel.acc += dy;
  if (Math.abs(wheel.acc) >= 40) { step(wheel.acc > 0 ? 1 : -1); wheel.acc = 0; wheel.lock = now; wheel.fired = true; }
}, { passive: false });
let touch = null;
// le doigt part d'un chat, d'un objet (ou juste à côté : on l'a manqué de peu) : c'est un geste pour attraper, pas pour changer de chapitre
const nearGrab = (x, y) => [[0, 0], [-36, 0], [36, 0], [0, -36], [0, 36], [-26, -26], [26, -26], [-26, 26], [26, 26]].some(([a, b]) => grabAt(x + a, y + b));
addEventListener('touchstart', e => { touch = e.touches.length === 1 && !onUI(e) && !drag.on && !nearGrab(e.touches[0].clientX, e.touches[0].clientY) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() } : null; }, { passive: true });
// (et la page ne bouge jamais sous le doigt : ni défilement, ni rebond, même sur les navigateurs qui ignorent touch-action)
addEventListener('touchmove', e => { if (drag.on) touch = null; if (e.cancelable && !(e.target.closest && e.target.closest('.tp-panel,.pick ul'))) e.preventDefault(); }, { passive: false });
addEventListener('touchend', e => {
  const t = touch; touch = null; if (!t || drag.on || drag.t > t.t || e.touches.length) return;
  const c = e.changedTouches[0], dx = c.clientX - t.x, dy = c.clientY - t.y;
  if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.3 && performance.now() - t.t < 900) step(dy < 0 ? 1 : -1);
  else if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3 && performance.now() - t.t < 900 && window.EspacePlume && EspacePlume.pas) EspacePlume.pas(dx < 0 ? 1 : -1);
}, { passive: true });

/* ——— les scènes, à chaque image ——— */
function state(sc) {
  const s = story(T), o = { s, dt: 0, clock, W: vw, H: vh, K, wide, reduced, playing: playing && !wait, frame: frameId };
  if (sc) Object.assign(o, { u: c01((s - sc.t0) / Math.max(1e-6, sc.t1 - sc.t0)), a: sc.a || 0, since: clock - (sc.born ?? clock), waiting: wait === sc });
  return o;
}
// l'opacité d'une scène : un fondu enchaîné autour de ses bornes (la première n'a pas d'entrée, la dernière pas de sortie)
function alphaOf(sc, s, i) {
  const f = sc.fade ?? 0.5;
  const aIn = i === 0 ? (s >= sc.t0 - 1e-6 ? 1 : 0) : sm((s - sc.t0) / f);
  const aOut = i === SC.length - 1 ? 1 : 1 - sm((s - sc.t1) / f);
  return s < sc.t0 - 1e-6 && i > 0 ? 0 : aIn * aOut;
}
let last = performance.now(), gridDy = 0;
function frame(now) {
  try { tick(now); } catch (e) { if (!frame.err) { frame.err = true; console.error(e); } }
  requestAnimationFrame(frame);
}
function tick(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; clock += dt; frameId++;
  // la lecture : le temps avance ; une station l'arrête à sa fin (seulement en y arrivant en lecture)
  if (playing && !wait && opened && !chapDrag) {
    const s0 = story(T); let T1 = T + dt; const s1 = story(T1);
    for (const sc of SC) if (sc.hold && s0 < sc.t1 && sc.t1 <= s1) { T1 = realOf(sc.t1); wait = sc; syncPP(); break; }
    T = T1;
    if (story(T) >= END) { T = realOf(END); const lastSc = SC[SC.length - 1]; if (lastSc && lastSc.hold) wait = lastSc; else playing = false; syncPP(); }
  }
  const s = story(T);
  // les scènes : leur opacité, leur calque, leur entrée et leur sortie
  const act = [];
  SC.forEach((sc, i) => {
    const a = opened ? alphaOf(sc, s, i) : 0; sc.a = a;
    if (a > 0.001 && !sc.on) { sc.on = true; sc.born = clock; sc.enter && sc.enter(state(sc)); }
    else if (a <= 0.001 && sc.on) { sc.on = false; sc.exit && sc.exit(state(sc)); (sc.titles || []).forEach(el => Titles.progress(el, 0)); }
    if (sc.el) { const o = a.toFixed(3); if (sc.el.style.opacity !== o) { sc.el.style.opacity = o; sc.el.style.visibility = a > 0.01 ? 'visible' : 'hidden'; } }
    if (sc.on) act.push(sc);
  });
  gridDy = 0;
  act.forEach(sc => { const S = state(sc); S.dt = reduced ? 0 : dt; if (sc.frame) { const r = sc.frame(S); if (r && r.grid !== undefined) gridDy += r.grid * sc.a; } });
  // l'inertie : un objet 3D lancé continue de tourner et ralentit doucement
  if (!drag.on && drag.spin && (drag.vx || drag.vy)) { const fr = Math.min(3, dt * 60); turn(drag.vx * fr, drag.vy * fr); const d = Math.pow(0.975, fr); drag.vx *= d; drag.vy *= d; if (Math.abs(drag.vx) + Math.abs(drag.vy) < 0.04) drag.vx = drag.vy = 0; }
  Grid.frame(gridDy);
  // la craie : les titres, et ce que dessinent les scènes (derrière et devant les titres)
  const paint = key => ctx => act.forEach(sc => { if (!sc[key]) return; ctx.save(); ctx.globalAlpha = sc.a; const S = state(sc); S.dt = reduced ? 0 : dt; sc[key](S, ctx); ctx.restore(); });
  const front = paint('draw');
  Titles.frame(paint('back'), ctx => { front(ctx); if (OV && OV.draw) { ctx.save(); const S = state(); S.dt = reduced ? 0 : dt; OV.draw(S, ctx); ctx.restore(); } });
  if (window.Obj3D) Obj3D.render();   // après les scènes : tout ce qu'elles ont posé cette image
  updateCaps(opened ? s : -1); updateChap(s);
}

/* ——— la mise en route : js/scenes.js donne la ligne du temps ——— */
function setup(o) {
  SC = o.scenes || []; OV = o.overlay || null; CH = o.chapters || []; CAPS = o.caps || []; WARP = (o.warp || []).slice().sort((a, b) => a[0] - b[0]); REST = o.rest || CH.map(c => c[0] + 0.5);
  END = Math.max(0, ...SC.map(sc => sc.t1)); EXTRA = WARP.reduce((q, w) => q + w[2] - (w[1] - w[0]), 0);
  SC.forEach(sc => { sc.el = document.querySelector(`.scene[data-scene="${sc.id}"]`); sc.titles = sc.el ? [...sc.el.querySelectorAll('[data-title]')] : []; sc.a = 0; sc.on = false; });
  buildChapters();
  Titles.init($('#titles'), [...document.querySelectorAll('[data-title]')], reduced);
  if (window.Obj3D && $('#obj')) Obj3D.init($('#obj'));
  Grid.init($('#grid'), 'deform');   // la grille : la loupe qui écarte les lignes sous la souris ('chalk' et 'path' restent disponibles)
  T = reduced ? realOf(REST[0]) : 0; playing = false; syncPP();
  measure();
  // les polices changent la forme des titres : on remesure quand elles sont là ; le thème change en direct : tout est recalculé
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  addEventListener('themechange', () => measure());
  addEventListener('resize', measure);
  // le nom, en haut à gauche : retour au début
  const brand = $('#brand'); if (brand) brand.addEventListener('click', e => { e.preventDefault(); replay(); });
  // le film se joue dès l'arrivée (le site est public : plus d'écran d'accès)
  opened = true; last = performance.now(); if (!reduced) { playing = true; syncPP(); }
  requestAnimationFrame(frame);
}

/* ——— le grain du papier ——— */
try {
  const c = document.createElement('canvas'); c.width = c.height = 180; const x = c.getContext('2d');
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(0,0,0,${(Math.random() * 0.05).toFixed(3)})`; x.fillRect(Math.random() * 180, Math.random() * 180, 1, 1); }
  $('#stage').style.setProperty('--noise', `url(${c.toDataURL()})`);
} catch (e) {}

// pour les essais (Playwright) : aller à un temps logique précis, en pause
window.__seek = s => { seek(realOf(s), false); };
return { setup, go, seek: s => seek(realOf(s)), play: () => setPlaying(true), pause: () => setPlaying(false), toChapter, story, realOf, sound,
  get t() { return story(T); }, get clock() { return clock; }, get soundOn() { return soundOn && !!AC; }, get audio() { return AC; }, get playing() { return playing && !wait; }, get waiting() { return wait ? wait.id : null; }, get reduced() { return reduced; } };
})();
