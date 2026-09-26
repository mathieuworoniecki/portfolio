/* Les sélecteurs de l'en-tête.
   Au centre, le thème : un bouton (l'aperçu du thème actuel), et un panneau avec
     · un aperçu par style (son fond, sa grille, son trait, sa police, un petit objet 3D) et ses pastilles de couleurs
     · les couleurs du style choisi, en grand
   Tout s'applique en direct (js/theme.js) ; le panneau reste ouvert pour comparer. Échap, un clic dehors ou ✕ le referme.
   À droite, la langue : un petit menu (changer de langue recharge la page). */
(() => {
const TH = window.THEME, I = window.I18N, lang = I ? I.lang : 'fr';
const N = {
  fr: { title: 'Thème', style: 'Style', colors: 'Couleurs', close: 'Fermer',
        s: { blueprint: ['Blueprint', 'Le plan d’atelier, tracé à la craie'], ardoise: ['Ardoise', 'Le tableau, la craie qui accroche'], cao: ['CAO', 'Le dessin technique, trait net'],
             esquisse: ['Esquisse', 'Le crayon sur le carnet de croquis'] },
        c: { bleu: 'Bleu', noir: 'Noir', blanc: 'Blanc', vert: 'Vert', nuit: 'Nuit', creme: 'Crème', kraft: 'Kraft', gris: 'Gris' } },
  en: { title: 'Theme', style: 'Style', colors: 'Colours', close: 'Close',
        s: { blueprint: ['Blueprint', 'The workshop plan, drawn in chalk'], ardoise: ['Slate', 'The blackboard, chalk that catches'], cao: ['CAD', 'Technical drawing, clean lines'],
             esquisse: ['Sketch', 'Pencil on the sketchbook'] },
        c: { bleu: 'Blue', noir: 'Black', blanc: 'White', vert: 'Green', nuit: 'Night', creme: 'Cream', kraft: 'Kraft', gris: 'Grey' } },
  de: { title: 'Design', style: 'Stil', colors: 'Farben', close: 'Schließen',
        s: { blueprint: ['Blaupause', 'Der Werkstattplan, mit Kreide gezeichnet'], ardoise: ['Schiefer', 'Die Tafel, Kreide mit Biss'], cao: ['CAD', 'Technische Zeichnung, klare Linien'],
             esquisse: ['Skizze', 'Bleistift im Skizzenbuch'] },
        c: { bleu: 'Blau', noir: 'Schwarz', blanc: 'Weiß', vert: 'Grün', nuit: 'Nacht', creme: 'Creme', kraft: 'Kraft', gris: 'Grau' } },
  it: { title: 'Tema', style: 'Stile', colors: 'Colori', close: 'Chiudi',
        s: { blueprint: ['Cianografia', 'Il disegno d’officina, a gesso'], ardoise: ['Lavagna', 'La lavagna, il gesso che graffia'], cao: ['CAD', 'Disegno tecnico, tratto netto'],
             esquisse: ['Schizzo', 'La matita sul taccuino'] },
        c: { bleu: 'Blu', noir: 'Nero', blanc: 'Bianco', vert: 'Verde', nuit: 'Notte', creme: 'Crema', kraft: 'Kraft', gris: 'Grigio' } },
  es: { title: 'Tema', style: 'Estilo', colors: 'Colores', close: 'Cerrar',
        s: { blueprint: ['Plano', 'El plano de taller, a tiza'], ardoise: ['Pizarra', 'La pizarra, la tiza que raspa'], cao: ['CAD', 'Dibujo técnico, trazo limpio'],
             esquisse: ['Boceto', 'El lápiz en el cuaderno'] },
        c: { bleu: 'Azul', noir: 'Negro', blanc: 'Blanco', vert: 'Verde', nuit: 'Noche', creme: 'Crema', kraft: 'Kraft', gris: 'Gris' } },
  zh: { title: '主题', style: '风格', colors: '配色', close: '关闭',
        s: { blueprint: ['蓝图', '车间图纸，粉笔绘制'], ardoise: ['黑板', '黑板上的粉笔字'], cao: ['CAD', '工程制图，线条干净'],
             esquisse: ['素描', '速写本上的铅笔'] },
        c: { bleu: '蓝', noir: '黑', blanc: '白', vert: '绿', nuit: '夜', creme: '米白', kraft: '牛皮纸', gris: '灰' } }
}[lang] || null;
const L = N || { title: 'Thème', style: 'Style', colors: 'Couleurs', close: 'Fermer', s: {}, c: {} };
const sName = k => (L.s[k] || [k])[0], sDesc = k => (L.s[k] || ['', ''])[1], cName = k => L.c[k] || k;

/* ——— les aperçus : dessinés sur une toile, avec un objet 3D (js/objects3d.js), qui oscille doucement ———
   Le fond et la grille, puis l'objet (rendu une fois en blanc, puis teinté au trait du thème), puis le titre dans
   la police du style et un soulignement de la couleur d'accent. */
// chaque style a son sujet, qui oscille doucement : pour l'instant les deux objets d'exemple (plus tard : un chat par style)
const SWING = 32, sw = i => Math.sin(i / SWING * Math.PI * 2), cw = i => Math.cos(i / SWING * Math.PI * 2);
const VIS = {
  blueprint: { obj: 'roulement', note: 'plan',     rot: i => [0.9 + cw(i) * 0.05, sw(i) * 0.3, 0.2] },
  ardoise:   { obj: 'vis',       note: 'tableau',  rot: i => [0.35 + cw(i) * 0.05, 0.6 + sw(i) * 0.3, 0.5] },
  cao:       { obj: 'roulement', note: 'cao',      rot: i => [0.5 + cw(i) * 0.06, 0.45 + sw(i) * 0.35, 0.12] },
  esquisse:  { obj: 'vis',       note: 'croquis',  rot: i => [0.2 + cw(i) * 0.03, 0.35 + sw(i) * 0.25, 0.9] }
};
const visOf = st => VIS[st] || VIS.blueprint;
const FR = {};   // les images, par style
// préparées en arrière-plan après le chargement, quatre à la fois (jamais d'à-coup) ; en attendant, la première seulement
let preparing = false;
function prepare() {
  if (preparing || !(window.Obj3D && Obj3D.ok && Obj3D.frames)) return; preparing = true;
  const jobs = []; Object.keys(VIS).forEach(st => { FR[st] = []; for (let i = 0; i < SWING; i += 4) jobs.push([st, i]); });
  // d'abord la première image de chaque style (les vignettes), puis le reste
  const firsts = Object.keys(VIS).map(st => { FR[st].push(...Obj3D.frames(visOf(st).obj, 300, 220, [visOf(st).rot(0)], 190)); return st; });
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 60));
  const run = () => { const job = jobs.shift(); if (!job) { if (window.__pvDone) __pvDone(); return; }
    const [st, i] = job, R = []; for (let k = Math.max(1, i); k < Math.min(SWING, i + 4); k++) R.push(visOf(st).rot(k));
    FR[st].push(...Obj3D.frames(visOf(st).obj, 300, 220, R, 190)); idle(run, { timeout: 400 }); };
  if (window.__pvDone) __pvDone(); idle(run, { timeout: 400 });
}
const TITLE = 'MATHIEU';   // le mot écrit dans les aperçus
const subject = st => { if (!preparing) prepare(); return FR[st] || []; };
addEventListener('load', () => setTimeout(prepare, 1500));
const dpr = Math.min(window.devicePixelRatio || 1, 2);
function layers(style, color, w, h) {
  const S = TH.STYLES[style], K = S.colors[color], F = TH.FONTS[style], mk = () => { const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); const x = c.getContext('2d'); x.scale(dpr, dpr); return [c, x]; };
  const [bg, b] = mk(), g = b.createRadialGradient(w * 0.45, h * 0.4, 0, w * 0.45, h * 0.4, Math.max(w, h) * 0.75);
  g.addColorStop(0, K.hi); g.addColorStop(0.55, K.bp); g.addColorStop(1, K.deep); b.fillStyle = g; b.fillRect(0, 0, w, h);
  const step = Math.max(7, w / 26), a = (K.dark ? 0.12 : 0.1) * (K.gridA + 0.3);
  if (S.grid === 'dots') { b.fillStyle = `rgba(${K.ink},${a * 2.6})`; for (let x = step / 2; x < w; x += step) for (let y = step / 2; y < h; y += step) b.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); }
  else { b.strokeStyle = `rgba(${K.ink},${a})`; b.lineWidth = 1; b.beginPath(); for (let x = 0.5; x < w; x += step) { b.moveTo(x, 0); b.lineTo(x, h); } for (let y = 0.5; y < h; y += step) { b.moveTo(0, y); b.lineTo(w, y); } b.stroke(); }
  // le titre, en contour, dans la police du style ; le soulignement d'accent ; une note à la main
  const [ov, o] = mk(), fs = Math.max(11, h * 0.2), tx = w * 0.95, ty = h * 0.84;
  o.textAlign = 'right'; o.textBaseline = 'alphabetic'; o.font = `700 ${fs}px ${F[0]}`; o.lineJoin = 'round';
  if (S.glow === 'neon') { o.shadowColor = `rgba(${K.ink},.9)`; o.shadowBlur = fs * 0.35; }
  o.strokeStyle = `rgb(${K.ink})`; o.lineWidth = Math.max(0.8, fs * 0.05); o.strokeText(TITLE, tx, ty);
  const tw = o.measureText(TITLE).width; o.shadowBlur = 0;
  o.strokeStyle = `rgb(${K.accent})`; o.lineWidth = Math.max(1.2, fs * 0.08); o.lineCap = 'round'; o.beginPath();
  if (S.wobble > 0.5) { o.moveTo(tx - tw, ty + fs * 0.2); o.quadraticCurveTo(tx - tw / 2, ty + fs * 0.12, tx, ty + fs * 0.24); } else { o.moveTo(tx - tw, ty + fs * 0.2); o.lineTo(tx, ty + fs * 0.2); }
  o.stroke();
  if (h > 60) { o.font = `${S.handWeight} ${fs * 0.55 * S.handScale / (S.handScale < 1 ? 0.8 : 1)}px ${S.hand}`; o.fillStyle = `rgba(${K.ink},.85)`; o.textAlign = 'left'; o.fillText(visOf(style).note, w * 0.06, h * 0.16); }
  // le grain de la craie : de petits manques sur le titre
  if (S.grain > 0.5) { o.globalCompositeOperation = 'destination-out'; for (let i = 0; i < w * h / 30; i++) { o.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.5})`; o.fillRect(Math.random() * w, Math.random() * h, Math.random() < 0.7 ? 1 : 2, 1); } o.globalCompositeOperation = 'source-over'; }
  const [sc, sx] = mk();
  return { bg, ov, sc, sx, K, S, w, h };
}
const cache = new Map();
function lay(style, color, w, h) { const k = `${style}|${color}|${w}|${h}`; if (!cache.has(k)) cache.set(k, layers(style, color, w, h)); return cache.get(k); }
// une toile d'aperçu : fond + objet teinté + titre ; f = l'image de l'oscillation
function paintTile(cv, style, color, f) {
  const w = +cv.dataset.w, h = +cv.dataset.h, Ly = lay(style, color, w, h), x = cv.getContext('2d'), all = subject(style), fr = all.length >= SWING ? all : all.slice(0, 1);
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(Ly.bg, 0, 0);
  if (fr.length) {
    const img = fr[f % fr.length], ph = h * 0.95, pw = ph * img.width / img.height, px = w * 0.02, py = h * 0.02;
    Ly.sx.setTransform(1, 0, 0, 1, 0, 0); Ly.sx.globalCompositeOperation = 'source-over'; Ly.sx.clearRect(0, 0, Ly.sc.width, Ly.sc.height);
    Ly.sx.drawImage(img, px * dpr, py * dpr, pw * dpr, ph * dpr);
    Ly.sx.globalCompositeOperation = 'source-in'; Ly.sx.fillStyle = `rgb(${Ly.K.ink})`; Ly.sx.fillRect(0, 0, Ly.sc.width, Ly.sc.height);
    if (Ly.S.glow === 'neon') { x.shadowColor = `rgba(${Ly.K.ink},.85)`; x.shadowBlur = 6 * dpr; }
    x.drawImage(Ly.sc, 0, 0); x.shadowBlur = 0;
  }
  x.drawImage(Ly.ov, 0, 0);
}
const canvas = (w, h, cls) => `<canvas class="${cls || 'pvc'}" width="${Math.round(w * dpr)}" height="${Math.round(h * dpr)}" data-w="${w}" data-h="${h}" style="width:${w}px;height:${h}px" aria-hidden="true"></canvas>`;

/* ——— un cadre dessiné à la craie autour d'un élément : un rectangle à main levée, d'un seul trait,
   qui dépasse un peu son départ ; un second trait (au survol) ; redessiné quand l'élément change de taille ——— */
function framePath(w, h, seed, inset) {
  let x = seed * 9301 + 49297; const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280 - 0.5);
  const o = inset || 0, j = () => rnd() * 1.6, x0 = -2 + o + j(), y0 = -2 + o + j(), x1 = w + 2 - o + j(), y1 = h + 2 - o + j();
  const bow = () => rnd() * 2.2;
  return `M${x0 + 6} ${y0 + j()} Q${(x0 + x1) / 2} ${y0 + bow()} ${x1 - 3} ${y0 + j()} Q${x1 + 1} ${y0} ${x1 + j()} ${y0 + 4}` +
    ` Q${x1 + bow()} ${(y0 + y1) / 2} ${x1 + j()} ${y1 - 3} Q${x1} ${y1 + 1} ${x1 - 4} ${y1 + j()}` +
    ` Q${(x0 + x1) / 2} ${y1 + bow()} ${x0 + 3} ${y1 + j()} Q${x0 - 1} ${y1} ${x0 + j()} ${y1 - 4}` +
    ` Q${x0 + bow()} ${(y0 + y1) / 2} ${x0 + j()} ${y0 + 3} Q${x0} ${y0 - 1} ${x0 + 12 + rnd() * 4} ${y0 - 0.6}`;
}
function chalkFrame(el, seed, panel) {
  if (!el) return null;
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('class', 'cf' + (panel ? ' cf-panel' : '')); svg.setAttribute('aria-hidden', 'true');
  let W = 0, H = 0;
  const draw = force => { const w = el.offsetWidth, h = el.offsetHeight; if (!w || (!force && w === W && h === H)) return; W = w; H = h;
    svg.setAttribute('viewBox', panel ? `0 0 ${w} ${h}` : `-6 -6 ${w + 12} ${h + 12}`);
    svg.innerHTML = `<path class="cf-a" pathLength="1" d="${framePath(w, h, seed, panel ? 5 : 0)}"/>` + (panel ? '' : `<path class="cf-b" pathLength="1" d="${framePath(w, h, seed + 17, -3)}"/>`); };
  el.appendChild(svg); draw(true);
  if (window.ResizeObserver) new ResizeObserver(() => draw()).observe(el);
  return { redraw: () => draw(true) };
}
window.chalkFrame = chalkFrame;   // les autres boutons de la page s'en servent aussi (js/film.js)

/* ——— le thème : à gauche les styles, à droite le grand aperçu et les couleurs du style ——— */
const root = document.getElementById('theme-pick');
if (TH && root) {
  const STY = Object.keys(TH.STYLES), firstColor = st => st === TH.style ? TH.color : Object.keys(TH.STYLES[st].colors)[0];
  root.innerHTML = `<button type="button" class="tp-btn" aria-haspopup="dialog" aria-expanded="false">${canvas(46, 28, 'tp-mini')}<span class="tp-name"><small>${L.title}</small><span class="tp-label"></span></span></button>
    <div class="tp-panel" role="dialog" aria-label="${L.title}">
      <div class="tp-top"><b>${L.title}</b><button type="button" class="tp-x" aria-label="${L.close}">✕</button></div>
      <div class="tp-body">
        <div class="tp-list" role="radiogroup" aria-label="${L.style}">
          <p class="tp-cap">${L.style}</p>
          ${STY.map(st => `<button type="button" class="tp-item" role="radio" data-style="${st}">${canvas(64, 36, 'pvc tp-thumb')}<span><b>${sName(st)}</b><small>${sDesc(st)}</small></span></button>`).join('')}
        </div>
        <div class="tp-main">
          <div class="tp-big">${canvas(320, 180, 'pvc tp-bigc')}</div>
          <p class="tp-desc"></p>
          <p class="tp-cap tp-capc"></p>
          <div class="tp-colors" role="radiogroup"></div>
        </div>
      </div>
    </div>`;
  const btn = root.querySelector('.tp-btn'), panel = root.querySelector('.tp-panel'), list = root.querySelector('.tp-list'), colors = root.querySelector('.tp-colors');
  chalkFrame(btn, 31); const panelFrame = chalkFrame(panel, 37, true);
  let show = null, showC = null;   // ce que montre le grand aperçu au survol : un style, ou un style et une couleur ; sinon le thème choisi
  let lastF = -1, paintStatic = () => {};
  const shown = () => show || TH.style;
  function renderColors() {
    const st = shown();
    root.querySelector('.tp-capc').textContent = `${L.colors} · ${sName(st)}`;
    root.querySelector('.tp-desc').textContent = sDesc(st);   // la phrase du style montré, sous l'aperçu
    colors.innerHTML = Object.keys(TH.STYLES[st].colors).map(c => `<button type="button" class="tp-col" role="radio" data-style="${st}" data-color="${c}" aria-checked="${st === TH.style && c === TH.color}">${canvas(96, 54)}<span>${cName(c)}</span></button>`).join('');
    paintStatic(); lastF = -1;
  }
  function renderState() {
    root.querySelector('.tp-label').textContent = `${sName(TH.style)} · ${cName(TH.color)}`;
    btn.setAttribute('aria-label', `${L.title} : ${sName(TH.style)}, ${cName(TH.color)}`);
    list.querySelectorAll('.tp-item').forEach(b => b.setAttribute('aria-checked', String(b.dataset.style === TH.style)));
    renderColors();
  }
  renderState();
  // l'animation des aperçus, tant que le panneau est ouvert (et la miniature du bouton, une fois)
  let raf = 0, t0 = 0;
  const colorOf = cv => { if (showC && cv.classList.contains('tp-bigc')) return showC; const b = cv.closest('button[data-style]'); return b && b.dataset.color ? [b.dataset.style, b.dataset.color] : b ? [b.dataset.style, firstColor(b.dataset.style)] : [shown(), shown() === TH.style ? TH.color : firstColor(shown())]; };
  // seul le grand aperçu s'anime (9 images par seconde) ; les vignettes sont dessinées une fois, quand elles changent
  paintStatic = () => root.querySelectorAll('.tp-panel canvas:not(.tp-bigc)').forEach(cv => { const [st, c] = colorOf(cv); paintTile(cv, st, c, 0); });
  function tick(now) {
    if (!t0) t0 = now; const f = Math.floor((now - t0) / 1000 * 9);
    if (f !== lastF) { lastF = f; const cv = root.querySelector('.tp-bigc'), [st, c] = colorOf(cv); paintTile(cv, st, c, f); }
    raf = root.classList.contains('open') ? requestAnimationFrame(tick) : 0;
  }
  window.__pvDone = () => { cache.clear(); paintStatic(); mini(); lastF = -1; };
  const mini = () => paintTile(root.querySelector('.tp-mini'), TH.style, TH.color, 0);
  mini(); addEventListener('load', () => setTimeout(mini, 300));
  const open = o => { root.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); if (o) { paintStatic(); lastF = -1; panelFrame && panelFrame.redraw(); } if (o && !raf) raf = requestAnimationFrame(tick); if (o) { const f = list.querySelector('[aria-checked="true"]'); f && f.focus({ preventScroll: true }); } };
  btn.addEventListener('click', e => { e.stopPropagation(); open(!root.classList.contains('open')); });
  root.querySelector('.tp-x').addEventListener('click', () => { open(false); btn.focus(); });
  // survoler un style le montre ; cliquer l'applique (avec la couleur déjà choisie pour lui, sinon sa première)
  list.addEventListener('pointerover', e => { const b = e.target.closest('.tp-item'); if (b && e.pointerType === 'mouse' && show !== b.dataset.style) { show = b.dataset.style; renderColors(); } });
  // le style survolé reste montré tant que la souris est dans le panneau (on peut aller cliquer ses couleurs)
  panel.addEventListener('pointerleave', () => { if (show || showC) { show = null; showC = null; lastF = -1; renderColors(); } });
  // survoler une couleur la montre dans le grand aperçu
  colors.addEventListener('pointerover', e => { const b = e.target.closest('.tp-col'); if (b && e.pointerType === 'mouse') { const k = [b.dataset.style, b.dataset.color]; if (!showC || showC[1] !== k[1] || showC[0] !== k[0]) { showC = k; lastF = -1; } } });
  colors.addEventListener('pointerleave', () => { if (showC) { showC = null; lastF = -1; } });
  panel.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('button[data-style]'); if (!b) return;
    const st = b.dataset.style, c = b.dataset.color || firstColor(st);
    show = null; showC = null; TH.set({ style: st, color: c });
  });
  addEventListener('themechange', () => { renderState(); mini(); });
  addEventListener('click', e => { if (!root.contains(e.target)) open(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('open')) { open(false); btn.focus(); } });
  // les polices des styles : une fois chargées, les aperçus sont redessinés
  if (document.fonts) Promise.all(STY.flatMap(st => [`700 40px ${TH.FONTS[st][0]}`, `${TH.STYLES[st].handWeight} 20px ${TH.STYLES[st].hand}`]).map(f => document.fonts.load(f).catch(() => {}))).then(() => { cache.clear(); mini(); if (root.classList.contains('open')) { paintStatic(); lastF = -1; } });
}

/* ——— la langue ——— */
const LNAMES = { fr: 'Français', en: 'English', de: 'Deutsch', it: 'Italiano', es: 'Español', zh: '中文' };
const lp = document.getElementById('lang-pick');
if (I && lp) {
  lp.innerHTML = `<button type="button" aria-haspopup="true" aria-expanded="false" aria-label="${I.t('lang')} : ${LNAMES[I.lang]}"><span>${I.lang.toUpperCase()}</span></button>
    <ul role="menu">${I.langs.map(l => `<li><button type="button" role="menuitem" data-l="${l}"${l === I.lang ? ' aria-current="true"' : ''}><span>${LNAMES[l] || l}</span><small>${l.toUpperCase()}</small></button></li>`).join('')}</ul>`;
  const b = lp.querySelector('button'), close = () => { lp.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); };
  chalkFrame(b, 43); const ulFrame = chalkFrame(lp.querySelector('ul'), 47, true);
  b.addEventListener('click', e => { e.stopPropagation(); const o = lp.classList.toggle('open'); b.setAttribute('aria-expanded', String(o)); if (o && ulFrame) ulFrame.redraw(); });
  lp.querySelectorAll('li button').forEach(x => x.addEventListener('click', () => { close(); I.set(x.dataset.l); }));
  addEventListener('click', e => { if (!lp.contains(e.target)) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}
})();
