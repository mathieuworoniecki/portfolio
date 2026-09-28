/* Le trou noir, puis l'espace (l'écran 2).
   « Entrer dans mon univers » : un trou noir s'ouvre au milieu de l'écran et aspire tout dans une spirale : les meubles et les chats
   (chacun son tour, les plus proches d'abord), la pièce, le titre, les boutons, le menu (une photo de la page, découpée en anneaux
   qui tournent et rapetissent). Derrière, l'espace apparaît. Le trou se referme… et recrache les chats, seulement eux :
   tout est noir, ils ont un contour blanc, ils flottent (la physique reste, la gravité non).
   Dans l'espace : ils nagent dans le vide, dérivent en boule, en pain, en étoile ; se cognent (bonk), se font des câlins en tournant ;
   le curseur (ou le doigt) les attire : un seul s'y agrippe (les autres boudent) ; secoué fort, ils sont lancés ; on peut les attraper et les jeter ;
   un clic dans le vide fait une onde qui les repousse.
   La barre du bas ramène à l'écran 1 : ils retombent du ciel dans la pièce.
   js/chats.js lui laisse la main (Wd.ail) pendant l'aspiration et dans l'espace. */
window.TrouNoir = (() => {
if (!window.Chats || !Chats.K || !window.Obj3D) return null;
const K = Chats.K, { Wd, ANIMS, I, rnd, pick, clamp, sgn, sm, c01, sc, say } = K;
const root = document.documentElement, TAU = Math.PI * 2;
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const DUREE = 3.6;   // l'aspiration (s)
const BLANC = 0xF4F4EE, NOIR = 0x07080C;
const ease = v => { v = c01(v); return v * v * (3 - 2 * v); }, easeIn = v => { v = c01(v); return v * v; };

// son calque : sous les chats et la craie (les objets passent devant le trou avant d'y disparaître)
const cv = document.createElement('canvas'); cv.id = 'trou'; cv.setAttribute('aria-hidden', 'true');
const obj = document.getElementById('obj'); if (obj) obj.before(cv); else document.body.prepend(cv);
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function taille() {
  const w = innerWidth, h = innerHeight, d = Math.min(devicePixelRatio || 1, 2);
  if (w === W && h === H && d === DPR) return; W = w; H = h; DPR = d; cv.width = Math.round(w * d); cv.height = Math.round(h * d);
}
const centre = () => [W / 2, H * 0.47];

/* ——— les étoiles : des petits points et des croix au stylo, qui scintillent ——— */
let ETO = [];
function etoiles() {
  const n = Math.round(clamp(W * H / 6500, 60, 320)); ETO = [];
  for (let i = 0; i < n; i++) ETO.push({ x: Math.random(), y: Math.random(), r: Math.random() < 0.08 ? rnd(2.5, 4.5) : rnd(0.5, 1.4), ph: rnd(0, TAU), v: rnd(0.6, 2.2), p: rnd(0.2, 1) });
}
function cielEtoile(a, t) {
  if (ETO.length === 0 || ETO.W !== W || ETO.H !== H) { etoiles(); ETO.W = W; ETO.H = H; }
  const P = Wd.ptr || { x: W / 2, y: H / 2, on: false }, px = P.on ? (P.x - W / 2) / W : 0, py = P.on ? (P.y - H / 2) / H : 0;
  ctx.save(); ctx.lineCap = 'round';
  for (const s of ETO) {
    const tw = 0.55 + 0.45 * Math.sin(t * s.v + s.ph), x = s.x * W - px * 14 * s.p, y = s.y * H - py * 10 * s.p;
    ctx.globalAlpha = a * tw * (0.35 + 0.65 * s.p);
    if (s.r > 2) { ctx.strokeStyle = '#F4F4EE'; ctx.lineWidth = 1.3; const r = s.r * (0.7 + 0.3 * tw);
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); }
    else { ctx.fillStyle = '#F4F4EE'; ctx.beginPath(); ctx.arc(x, y, s.r, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
function fondNoir(a) {
  const [cx, cy] = centre(), g = ctx.createRadialGradient(cx, cy * 0.9, 0, cx, cy, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, `rgba(16,19,26,${a})`); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/* ——— la photo de la page (le fond, la grille, la pièce, la craie, les boutons), pour la découper en anneaux ——— */
// (le papier déborde de l'écran jusqu'au rayon du trou : en tournant, la page ne montre jamais ses coins, elle s'enroule d'un seul tenant)
function photo(cx, cy, R) {
  const k = Math.min(devicePixelRatio || 1, 1.5, 4096 / (2 * R)), c = document.createElement('canvas'); c.width = c.height = Math.round(2 * R * k);
  const x = c.getContext('2d'); x.scale(k, k); x.translate(R - cx, R - cy);
  const cs = getComputedStyle(root), v = n => cs.getPropertyValue(n).trim() || '#DADBD8';
  const g = x.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, v('--bp-hi')); g.addColorStop(0.45, v('--bp')); g.addColorStop(1, v('--bp-deep')); x.fillStyle = g; x.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ['#grid', '#piece', '#titles'].forEach(q => { const e = document.querySelector(q); if (e && e.width) try { x.drawImage(e, 0, 0, W, H); } catch (er) {} });
  // les boutons : leur texte est en HTML (leur cadre est déjà dans la craie)
  ['#enter', '#stay'].forEach(q => { const e = document.querySelector(q); if (!e || e.disabled || !e.classList.contains('drawn')) return; const r = e.getBoundingClientRect(); if (!r.width) return;
    const s = getComputedStyle(e); x.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`; x.fillStyle = s.color; x.textAlign = 'center'; x.textBaseline = 'middle';
    if ('letterSpacing' in x) x.letterSpacing = s.letterSpacing;
    x.fillText(e.textContent.trim().toUpperCase(), r.left + r.width / 2, r.top + r.height / 2 + 1); });
  return c;
}

/* ——— l'aspiration ——— */
let T = null;   // { t0, cx, cy, R, snap, items, couches, fin, noir }
const couches = () => [['.evts', 0.02], ['.sheet', 0.3], ['.dex-toast', 0], ['.evts-annonce', 0]].map(([q, dl]) => { const el = document.querySelector(q); if (!el || !el.getClientRects().length) return null; const r = el.getBoundingClientRect(); return { el, r, dl }; }).filter(Boolean);
function aspire(fin) {
  if (T || Wd.espace) return;
  taille(); if (!Wd.W || reduit) { entre(); fin && fin(); return; }
  const [cx, cy] = centre(), R = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, H - cy));
  T = { t0: performance.now() / 1000, s: window.Film ? Film.t : 0, cx, cy, R, snap: photo(cx, cy, R), items: [], couches: couches(), fin, noir: false, ink: rgb((window.THEME && THEME.ink) || '34,36,40') };
  // qui part quand : les plus proches du trou d'abord (et un peu de hasard)
  const add = (o, x, y, chat) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    T.items.push({ o, chat, r0: r, a0: Math.atan2(dy, dx), s0: o.s, tilt0: o.tilt || 0, dl: 0.05 + 0.42 * clamp(r / R, 0, 1) + rnd(0, 0.08), rot: rnd(4, 9) * (Math.random() < 0.8 ? 1 : -1) }); };
  Wd.props.forEach(it => { if (it.a > 0.01 && it.root.visible) add(it, it.x, it.y - (it.hull ? it.hull.h * it.s * 0.4 : 0), false); });
  Wd.cats.forEach(c => { if (c.gone) return; prepare(c); add(c, c.x, c.y - c.D.stand * sc(c), true); });
  // quelques-uns le disent
  Wd.cats.filter(c => !c.gone).slice(0, 4).forEach((c, i) => apres(0.1 + i * 0.25, () => T && say(c, pick(['?!', 'miaaa !', 'ooooh', 'NON', '!!!']))));
  root.classList.add('trou');
  Wd.trou = true;
  requestAnimationFrame(boucle);
}
// plus tard, au temps du monde (ceux de js/chats.js attendent le retour dans la pièce)
const APRES = [];
function apres(s, f) { APRES.push({ t: Wd.t + s, f }); }
function minuteur() { for (let i = APRES.length - 1; i >= 0; i--) if (Wd.t >= APRES[i].t) { const f = APRES[i].f; APRES.splice(i, 1); f(); } }
// un chat qui part ailleurs : il lâche tout (perchoir, tâche, bagarre, carton…)
function prepare(c) {
  K.interrupt(c); c.fall = false; c.held = false; c.pet = null; c.hidden = 0; c.pend = null; c.tongue = 0; c.purr = 0; c.roll = 0;
  c.sp = null; c.agrippe = null;
}
// une image de l'aspiration (dans js/chats.js : le temps du monde)
function aspiration(dt) {
  if (!T) return; minuteur();
  const u = performance.now() / 1000 - T.t0;
  T.items.forEach(m => {
    const e = easeIn((u / DUREE - m.dl) / 0.38), pre = c01((u / DUREE - m.dl + 0.12) / 0.12);
    const f = Math.pow(1 - e, 1.15), r = m.r0 * f, a = m.a0 + (e * 2.2 + e * e * 5), tr = pre * (1 - e) * 2.5;
    const x = T.cx + Math.cos(a) * r + Math.sin(u * 47 + m.a0 * 9) * tr, y = T.cy + Math.sin(a) * r * 0.82 + Math.cos(u * 53 + m.r0) * tr;
    const o = m.o, rot = m.tilt0 + e * e * m.rot, vis = e < 0.985 ? 1 : 0;
    if (m.chat) {
      const c = o; c.at += dt; c.anim = e > 0.02 ? 'chute' : pre > 0.5 ? 'sursaut' in ANIMS ? 'sursaut' : 'feule' : c.anim || 'assis';
      teinte(c, sm((e - 0.25) / 0.6)); c.s = Math.max(0.001, m.s0 * f); c.spin = rot; c.x = x; c.y = y + c.D.stand * sc(c); c.z = 20000 + m.r0;
      (ANIMS[c.anim] || ANIMS.assis)(c, c.tgt, c.at); Chat.step(c, dt, { a: Wd.a * vis });
    } else {
      o.x = x; o.y = y + (o.hull ? o.hull.h * m.s0 * f * 0.4 : 0); o.s = Math.max(0.001, m.s0 * f); o.tilt = rot; o.a = vis * (o.fade ?? 1); Univers.place(o);
    }
  });
}
// l'image du calque : l'espace qui apparaît, la page découpée en anneaux qui tournent, le trou et son disque
function dessineTrou(u) {
  const { cx, cy, R, snap } = T;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
  fondNoir(1); cielEtoile(1, u * DUREE);   // (l'espace est déjà là, derrière la page : on le découvre à mesure qu'elle est avalée)
  // la page, en anneaux fins : le centre part d'abord ; chaque anneau tourne et rétrécit vers le trou, sans s'effacer (il passe sous le disque noir)
  const N = W < 760 ? 48 : 64;
  // (chaque anneau est découpé à l'écran entre les rayons où le déroulement envoie ses deux bords : les anneaux se touchent toujours, sans jour entre eux)
  const eDe = m => easeIn((u - 0.05 - m * 0.5) / 0.4), g = r => { const e = eDe(r / R); return r * Math.pow(1 - e, 1.3); };
  for (let i = N - 1; i >= 0; i--) {
    const ra = R * i / N, rb = R * (i + 1) / N, m = (i + 0.5) / N, e = eDe(m);
    if (e >= 0.999) continue;
    const f = Math.pow(1 - e, 1.3), th = e * 2.2 + e * e * 5 + (1 - m) * e * 2, ga = g(ra), gb = g(rb), ky = 1 - 0.18 * e;
    if (gb < 0.3) continue;
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.arc(0, 0, gb + 0.8, 0, TAU); if (ga > 0.8) ctx.arc(0, 0, ga - 0.8, 0, TAU, true); ctx.clip();
    ctx.rotate(th); ctx.scale(f, f * ky); ctx.drawImage(snap, -R, -R, 2 * R, 2 * R); ctx.restore();
  }
  // le trou : il s'ouvre, respire, avale ; à la fin il se referme en un point
  const R0 = Math.min(W, H) * 0.075, ouvre = sm(u / 0.12), ferme = 1 - sm((u - 0.9) / 0.1), rh = R0 * ouvre * ferme * (1 + 0.5 * sm((u - 0.1) / 0.6)) * (1 + 0.06 * Math.sin(u * 30));
  if (rh > 0.5) {
    // le halo et les bras de la spirale (des traits de stylo qui tournent) : sombres sur le papier, clairs sur l'espace
    const clair = sm((u - 0.3) / 0.4), col = melange(T.ink, [244, 244, 238], clair), rot = u * DUREE * 5;
    ctx.save(); ctx.translate(cx, cy); ctx.lineCap = 'round';
    for (let b = 0; b < 5; b++) {
      ctx.beginPath(); const a0 = rot + b * TAU / 5;
      for (let k = 0; k <= 40; k++) { const t = k / 40, rr = rh * (1 + t * 3.2 * ouvre * ferme), aa = a0 - t * 3.4; const px = Math.cos(aa) * rr, py = Math.sin(aa) * rr * 0.82; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.strokeStyle = `rgba(${col},0.7)`; ctx.lineWidth = 2.2; ctx.stroke();
    }
    ctx.scale(1, 0.82);
    ctx.beginPath(); ctx.arc(0, 0, rh * 1.18, 0, TAU); ctx.strokeStyle = `rgba(${col},0.8)`; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, rh, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();
  }
  // le point de lumière, juste avant de recracher
  // (il naît au cœur du trou qui se referme : le disque noir rétrécit autour de lui, il ne s'allume pas d'un coup)
  if (u > 0.9) { const k = sm((u - 0.9) / 0.1); ctx.save(); ctx.fillStyle = '#F4F4EE'; ctx.beginPath(); ctx.arc(cx, cy, Math.min(rh * 0.8, 1 + k * 5) + k * 2, 0, TAU); ctx.fill(); ctx.restore(); }
}
// le menu, le cadre : ils tournent vers le trou, eux aussi (en CSS : ils sont en HTML)
function tourneCouches(u) {
  T.couches.forEach(({ el, r, dl }) => {
    const e = easeIn((u - dl - 0.1) / 0.45); if (!e) return;
    el.style.transformOrigin = `${T.cx - r.left}px ${T.cy - r.top}px`;
    el.style.transform = `rotate(${(e * 2.2 + e * e * 5) * 57.3}deg) scale(${Math.max(0.001, Math.pow(1 - e, 1.3))})`;
  });
}
function boucle() {
  if (!T) return;
  taille();
  const u = (performance.now() / 1000 - T.t0) / DUREE;
  // la barre du bas, pendant l'aspiration, ramène au début : on annule, tout revient
  if (window.Film && Film.t < T.s - 0.05) { retour(true); return; }
  dessineTrou(u); tourneCouches(u);
  // l'espace : les couleurs passent au noir (le trait devient blanc), juste avant la fin
  if (u > 0.9 && !T.noir) { T.noir = true; noir(); }
  if (u >= 1) { const f = T.fin; fin(); entre(); if (f) f(); return; }
  requestAnimationFrame(boucle);
}
function fin() {
  if (!T) return;
  T.couches.forEach(({ el }) => { el.style.transform = el.style.transformOrigin = el.style.opacity = ''; });
  T.items.forEach(m => { if (!m.chat) { m.o.tilt = m.tilt0; m.o.s = m.s0; } });
  T = null; Wd.trou = false; root.classList.remove('trou');
}

/* ——— l'espace ——— */
let theme0 = null;
// le changement de thème, en douceur (le cadre, la barre du bas, les boutons : leurs couleurs glissent)
let glisseT = 0;
function glisse() { root.classList.add('glisse'); clearTimeout(glisseT); glisseT = setTimeout(() => root.classList.remove('glisse'), 1300); }
// le thème noir ; les chats (leur trait n'écoute pas le thème) passent au blanc, leurs yeux s'inversent (blancs, reflets noirs)
function noir() {
  if (window.THEME && THEME.color !== 'espace') { theme0 = { style: THEME.style, color: THEME.color }; glisse(); THEME.set({ style: THEME.style, color: 'espace' }, true); }
  Wd.cats.forEach(blanc);
}
// (27/09) la teinte va de l'encre (0) au blanc (1) : pendant l'aspiration et la sortie, le trait se transforme peu à peu
const CB = new THREE.Color(BLANC), CN = new THREE.Color(NOIR);
function teinte(c, k) {
  k = c01(k); if (c.teinte === k || (!c.teinte && !k)) return;
  const mats = []; c.mats.forEach(m => ['line', 'soft', 'out', 'out2'].forEach(n => { const x = m[n]; if (x && x.color) mats.push(x); }));
  if (!c.teinte) { mats.forEach(x => { x.userData.c0 = x.color.getHex(); }); c.discs.forEach(d => { d.userData.c0 = d.color.getHex(); }); }
  mats.forEach(x => x.color.setHex(x.userData.c0).lerp(CB, k));
  c.discs.forEach((d, i) => { if (d.userData.c0 == null) return; d.color.setHex(d.userData.c0); if (i === 0) d.color.lerp(CB, k); else if (i === 1) d.color.lerp(CN, k); });
  c.teinte = k; c.blanc = k > 0.5;
}
const blanc = c => teinte(c, 1), encre = c => teinte(c, 0);
const rgb = s => String(s).split(',').map(Number), melange = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',');
const E = { crache: -1, ondes: [], doigt: null, boucle: 0 };
/* les modules de l'espace (js/espace-*.js : le dessin, la présentation au stylo, les planètes) se branchent ici :
     pas(dt, chats)       après les chats, à chaque image (forces, chocs avec leurs objets)
     pose(c)              après la pose d'un chat (où il regarde…)
     fond(ctx, now)       sur le calque, derrière les chats          devant(ctx, now)   sur le calque, après les ondes
     grab(x, y)           une clé { mod: { drag(k, x, y), release(k, vx, vy) } } ou rien
     mode[nom](c, dt)     un chat dans un état à eux (accroché à un trait, dans un abri, pendu à un mot, aspiré…)
     envie(c)             un chat à la dérive se demande quoi faire : vrai si le module l'occupe
     trace                le doigt dans le vide : { debut(x, y), suite(x, y), fin() → vrai si c'était un dessin }
     entre(), retour()    on arrive dans l'espace, on en repart */
const X = { pas: [], pose: [], fond: [], devant: [], grab: [], mode: {}, envie: [], entre: [], retour: [], trace: null };
// on arrive dans l'espace (après le trou, ou directement par la barre du bas)
function entre() {
  if (T) fin();
  if (Wd.espace) return;
  if (!theme0 || (window.THEME && THEME.color !== 'espace')) noir();
  Wd.espace = true; root.classList.add('espace'); taille();
  E.crache = Wd.t; E.flash = performance.now() / 1000; E.ondes.length = 0;
  Wd.props.forEach(it => { it.root.visible = false; });
  const id = ++E.boucle; requestAnimationFrame(() => boucleEspace(id));
  X.entre.forEach(f => f());
}
// recrachés : tous du centre, chacun son tour, dans toutes les directions, en grandissant
function crache() {
  const [cx, cy] = centre(); let i = 0;
  Wd.cats.forEach(c => {
    if (c.gone) return; prepare(c); blanc(c);
    const a = rnd(0, TAU), v = rnd(200, 420) * Wd.s0 / 150;
    c.x = cx; c.y = cy; c.face = Math.cos(a) < 0 ? -1 : 1;
    c.sp = { vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rnd(-5, 5), m: 'crache', t: 0, dl: 0.25 + i++ * 0.16, g: 0, s: Wd.s0 * 0.72 * clamp(c.b.s, 0.6, 1.5) / c.b.s, anim: 'chute', next: 0, bonk: -9, cal: -9, lache: -9 };
    // mouvement réduit (le monde ne bouge pas) : déjà là, chacun à sa place, qui flotte
    if (reduit) { const S = c.sp; S.m = 'derive'; S.sorti = true; S.g = 1; S.anim = pick(DERIVE); c.s = S.s; c.x = rnd(0.15, 0.85) * W; c.y = rnd(0.3, 0.8) * H; c.spin = rnd(-0.6, 0.6); (ANIMS[S.anim] || ANIMS.assis)(c, c.cur, 0); c.tgt.set(c.cur); }
  });
  E.crache = -1;
}
// le monde de l'espace, une image (dans js/chats.js : le temps du monde)
const HAUT = () => 64, BAS = () => Wd.floor || H - 70;
const centreDe = c => [c.x, c.y - c.D.stand * sc(c)], rayon = c => Math.max(c.D.a, c.D.h) * sc(c) * 0.8;
const DERIVE = ['apesanteur', 'apesanteur', 'dodo', 'pain', 'donut', 'etirement', 'toilette', 'chute', 'assis', 'ronron'].filter(a => ANIMS[a] || a === 'apesanteur');
function pointeur() {
  if (E.doigt) return E.doigt;
  const P = Wd.ptr; if (!P || !P.on || Wd.t - P.moved > 4) return null; return P;
}
function espace(dt) {
  minuteur(); if (E.crache >= 0) crache();
  const P = Wd.ptr; if (P && Wd.t - P.moved > 0.06) { const k = Math.exp(-dt * 10); P.vx *= k; P.vy *= k; }
  const Q = pointeur(), cats = Wd.cats.filter(c => c.sp && !c.gone), acc = cats.filter(c => c.sp.m === 'agrippe');
  cats.forEach(c => flotte(c, dt, Q, acc));
  chocs(cats, dt);
  X.pas.forEach(f => f(dt, cats));
  separe(cats);
  cats.forEach(c => {
    // la pose (chaque pose a son propre temps), le ronron par-dessus ; puis les modules (le regard…)
    if (c.anim !== c.animP) { c.animP = c.anim; c.at = 0; }
    (ANIMS[c.anim] || ANIMS.assis)(c, c.tgt, c.at); if (c.purr && Wd.t < c.purr && c.anim !== 'caresse') ANIMS.ronron(c, c.tgt, c.at);
    X.pose.forEach(f => f(c));
    Chat.step(c, dt, { a: Wd.a * (c.sp.m === 'crache' && c.sp.t < c.sp.dl ? 0 : 1) }); c.hp = Chat.where(c, c.head);
    // tenu, ou agrippé : la main (ou les pattes de devant) suivent le curseur
    if (c.held) { const n = Chat.where(c, c.headA, [-c.b.head[0] * 0.45, c.b.head[1] * 0.75, 0]); c.x += c.hx - n[0]; c.y += c.hy - n[1]; }
    else if (c.sp.m === 'agrippe' && Q) { const f = Chat.where(c, c.legs[c.face > 0 ? 'fr' : 'fl'].foot), k = Math.min(1, dt * 14); c.x += (Q.x + c.sp.ox - f[0]) * k; c.y += (Q.y + c.sp.oy - f[1]) * k; }
    // accroché ailleurs (un trait, une lettre…) : le module donne le point où vont ses pattes de devant
    else if (c.sp.ancre) { const A = c.sp.ancre(), f = Chat.where(c, c.legs[c.face > 0 ? 'fr' : 'fl'].foot), k = Math.min(1, dt * 12); if (A) { c.x += (A[0] - f[0]) * k; c.y += (A[1] - f[1]) * k; } }
    // (accroché, dans un abri : il reste dans l'écran, jamais sous la barre du bas ; s'il y est poussé, il lâche)
    if (!c.held && c.sp.m !== 'crache') { const [bx, by] = centreDe(c), r = rayon(c) * 0.9;
      const ox = bx - r < 0 ? -(bx - r) : bx + r > W ? W - (bx + r) : 0, oy = by - r < HAUT() ? HAUT() - (by - r) : by + r > BAS() ? BAS() - (by + r) : 0;
      if (ox || oy) { c.x += ox; c.y += oy; if (X.mode[c.sp.m] && Math.abs(ox) + Math.abs(oy) > r * 0.6) { c.sp.m = 'derive'; c.sp.ancre = null; c.sp.corps = null; c.sp.vx = ox * 3; c.sp.vy = oy * 3; } } } });
}
function flotte(c, dt, Q, acc) {
  const S = c.sp, k = sc(c); S.t += dt; c.at += dt;
  if (S.m === 'crache') {
    if (S.t < S.dl) { c.s = 0.001; return; }
    if (!S.sorti) { S.sorti = true; const [cx, cy] = centre(); c.x = cx; c.y = cy; E.ondes.push({ x: cx, y: cy, t0: performance.now() / 1000, r: Wd.s0 * 1.2, a: 0.7 }); if (Math.random() < 0.6) apres(0.4, () => say(c, pick(['wiii !', 'mia ?', 'ooh', 'où…', '!', 'c\'est où ?']))); }
    S.g = sm((S.t - S.dl) / 0.6); c.s = S.s * Math.max(0.02, S.g);
    if (S.g >= 1) { S.m = 'derive'; S.next = Wd.t + rnd(1.5, 4); S.anim = pick(DERIVE); }
  } else c.s += (S.s - c.s) * Math.min(1, dt * 3);
  if (c.held) { c.anim = 'porte'; S.m = 'tenu'; S.ancre = null; return; }
  if (X.mode[S.m]) { X.mode[S.m](c, dt); return; }
  S.ancre = null;
  const [x, y] = centreDe(c);
  if (S.m === 'agrippe') {
    c.anim = 'agrippe'; c.spin *= Math.exp(-dt * 3);
    // secoué trop fort : il lâche prise, lancé comme le curseur ; sinon il finit par se lasser
    const v = Q ? Math.hypot(Q.vx || 0, Q.vy || 0) : 0;
    if (!Q || v > 2600 * Wd.s0 / 150 || Wd.t > S.fin) { lache(c, Q && v > 2600 * Wd.s0 / 150 ? Q : null); }
    return;
  }
  if (S.m === 'calin') { calin(c, dt); return; }
  // le curseur (ou le doigt) passe près : il nage vers lui, pour s'y accrocher
  if (Q && S.m !== 'nage' && Wd.t - S.lache > 3 && !acc.length && Math.hypot(Q.x - x, Q.y - y) < Wd.s0 * 2.6 && Math.random() < dt * 2.5) {
    S.m = 'nage'; S.cible = 'curseur'; S.fin = Wd.t + rnd(3, 6); say(c, pick(['!', 'mia !', 'ooh', 'à moi !']));
  }
  if (S.m === 'nage') {
    let tx, ty;
    // (Mathieu, 28/09 : « quand deux chats veulent s'accrocher au curseur, ça bugue : un seul ») : la place est prise, il boude et repart
    if (S.cible === 'curseur') { if (!Q) { S.m = 'derive'; return; } if (acc.length) { S.m = 'derive'; S.next = Wd.t + rnd(2, 4); S.anim = pick(DERIVE); if (Math.random() < 0.6) say(c, pick(['pfff', 'trop tard', 'hé !', 'à moi…'])); return; } tx = Q.x; ty = Q.y; }
    else if (S.cible && S.cible.sp) { [tx, ty] = centreDe(S.cible); }
    else if (S.cible && S.cible.x != null) { tx = S.cible.x; ty = S.cible.y; }
    else { S.m = 'derive'; return; }
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1, a = 520 * Wd.s0 / 150;
    S.vx += dx / d * a * dt; S.vy += dy / d * a * dt; const vmax = 260 * Wd.s0 / 150, v = Math.hypot(S.vx, S.vy); if (v > vmax) { S.vx *= vmax / v; S.vy *= vmax / v; }
    c.face = sgn(dx) || c.face; c.anim = 'nage'; c.spin += (0 - c.spin) * Math.min(1, dt * 2);
    if (S.cible === 'curseur' && d < rayon(c) * 1.1 && !acc.length) { agrippe(c, Q, acc); return; }
    if (S.cible && S.cible.x != null && !S.cible.sp && d < rayon(c) * (S.cible.r || 1)) { if (S.cible.arrive) S.cible.arrive(c); else S.m = 'derive'; }
    if (Wd.t > S.fin) { S.m = 'derive'; S.next = Wd.t + rnd(2, 5); }
  } else {
    // à la dérive : une pose (en boule, en pain, en étoile…), il tourne doucement sur lui-même
    c.anim = S.bonk > Wd.t - 1.2 && ANIMS.etourdi ? 'etourdi' : S.anim; c.spin += S.w * dt; S.w *= Math.exp(-dt * 0.25);
    if (Wd.t > S.next) {
      S.next = Wd.t + rnd(4, 9); const r = Math.random(), autres = Wd.cats.filter(o => o !== c && o.sp && o.sp.m !== 'crache');
      if (X.envie.some(f => f(c))) {}
      else if (r < 0.28 && autres.length) { S.m = 'nage'; S.cible = pick(autres); S.fin = Wd.t + rnd(3, 6); }   // il va voir un copain (un câlin… ou un bonk)
      else if (r < 0.45) { S.m = 'nage'; S.cible = { x: rnd(0.15, 0.85) * W, y: rnd(0.25, 0.75) * H }; S.fin = Wd.t + rnd(2, 4); }
      else { S.anim = pick(DERIVE); if (Math.random() < 0.3) S.w += rnd(-3, 3); if (Math.random() < 0.3) c.face = -c.face;
        if (Math.random() < 0.25) say(c, pick(['…', 'ouiii', 'rrrr', '✧', 'mia', 'zzz', 'on flotte !'])); }
    }
    // presque immobile : un petit coup de patte dans le vide pour repartir
    const v = Math.hypot(S.vx, S.vy); if (v < 18 * Wd.s0 / 150) { const a = rnd(0, TAU); S.vx += Math.cos(a) * 40 * Wd.s0 / 150; S.vy += Math.sin(a) * 40 * Wd.s0 / 150; }
  }
  // l'inertie (presque aucun frottement), les bords de l'écran : il rebondit
  S.vx *= Math.exp(-dt * 0.08); S.vy *= Math.exp(-dt * 0.08);
  c.x += S.vx * dt; c.y += S.vy * dt;
  const r = rayon(c), [bx, by] = centreDe(c), bord = (v, n) => { if (Math.abs(v) > 120 && Math.random() < 0.5) Wd.fx.push({ k: 'txt', text: pick(['bonk', 'toc', 'boing']), x: bx + n[0] * r, y: by + n[1] * r, t0: Wd.t, life: 0.9, rot: rnd(-0.2, 0.2), size: 15 }); S.w += rnd(-4, 4); if (Math.abs(v) > 160) S.bonk = Wd.t; };
  if (bx - r < 4 && S.vx < 0) { bord(S.vx, [-1, 0]); S.vx = -S.vx * 0.8; c.x += 4 - (bx - r); }
  if (bx + r > W - 4 && S.vx > 0) { bord(S.vx, [1, 0]); S.vx = -S.vx * 0.8; c.x -= bx + r - W + 4; }
  if (by - r < HAUT() && S.vy < 0) { bord(S.vy, [0, -1]); S.vy = -S.vy * 0.8; c.y += HAUT() - (by - r); }
  if (by + r > BAS() && S.vy > 0) { bord(S.vy, [0, 1]); S.vy = -S.vy * 0.8; c.y -= by + r - BAS(); }
  c.z = 8000 + c.id * 3;
}
function agrippe(c, Q, acc) {
  // (Mathieu, 28/09 : « deux chats se superposent » : chacun sa place autour du curseur, en éventail, à une largeur de chat l'un de l'autre)
  const S = c.sp, pris = acc.map(o => o.sp.slot), n = [0, 1, 2, 3, 4, 5].find(i => !pris.includes(i)) ?? acc.length, k = Math.ceil(n / 2), sd = n % 2 ? 1 : -1, r = Math.max(rayon(c), Wd.s0 * 0.22);
  S.m = 'agrippe'; S.slot = n; S.ox = sd * k * r * 2.3; S.oy = k * r * 0.5; S.fin = Wd.t + rnd(6, 14); S.vx = S.vy = 0;
  acc.push(c); say(c, pick(['hop !', 'attrapé !', 'je te tiens', 'mia !']));
}
function lache(c, Q) {
  const S = c.sp; S.m = 'derive'; S.lache = Wd.t; S.next = Wd.t + rnd(2, 4);
  if (Q) { S.vx = (Q.vx || 0) * 0.55 + rnd(-80, 80); S.vy = (Q.vy || 0) * 0.55 + rnd(-80, 80); S.w = rnd(-8, 8); S.anim = 'chute'; say(c, pick(['wiii !', 'aaah', 'miaaa !'])); }
  else { S.vx = rnd(-60, 60); S.vy = rnd(-60, 60); S.anim = pick(DERIVE); }
}
// deux chats qui se croisent doucement : un câlin, ils tournent l'un autour de l'autre en ronronnant
function commenceCalin(a, b) {
  const [ax, ay] = centreDe(a), [bx, by] = centreDe(b), M = { x: (ax + bx) / 2, y: (ay + by) / 2, th: Math.atan2(ay - by, ax - bx), d: (rayon(a) + rayon(b)) * 0.45 + Wd.s0 * 0.1, fin: Wd.t + rnd(3, 5.5), L: [a, b], vx: (a.sp.vx + b.sp.vx) / 2, vy: (a.sp.vy + b.sp.vy) / 2, h: Wd.t };
  [a, b].forEach(k => { k.sp.m = 'calin'; k.sp.C = M; }); say(a, '♥');
}
function calin(c, dt) {
  const M = c.sp.C, i = M.L.indexOf(c), o = M.L[1 - i];
  if (i === 0) { M.th += dt * 0.9; M.x += M.vx * dt; M.y += M.vy * dt; M.vx *= Math.exp(-dt * 0.8); M.vy *= Math.exp(-dt * 0.8);
    if (Wd.t - M.h > 0.8) { M.h = Wd.t; Wd.fx.push({ k: 'heart', x: M.x + rnd(-10, 10), y: M.y - Wd.s0 * 0.35, t0: Wd.t, life: 1.3, r: clamp(Wd.s0 * 0.06, 6, 11) }); } }
  if (!o || !o.sp || o.sp.m !== 'calin' || Wd.t > M.fin || c.held) {
    // la fin du câlin : chacun repart de son côté, doucement
    M.L.forEach((k, j) => { if (!k.sp || k.sp.m !== 'calin') return; const a = M.th + j * Math.PI; k.sp.m = 'derive'; k.sp.cal = Wd.t; k.sp.vx = Math.cos(a) * 50; k.sp.vy = Math.sin(a) * 50; k.sp.next = Wd.t + rnd(2, 5); k.sp.anim = pick(['ronron', 'pain', 'apesanteur']); });
    return;
  }
  const a = M.th + i * Math.PI, tx = M.x + Math.cos(a) * M.d, ty = M.y + Math.sin(a) * M.d * 0.7, [x, y] = centreDe(c);
  c.x += (tx - x) * Math.min(1, dt * 5); c.y += (ty - y) * Math.min(1, dt * 5);
  const [ox] = centreDe(o); c.face = sgn(ox - x) || c.face; c.anim = 'caresse'; c.spin *= Math.exp(-dt * 3); c.purr = Wd.t + 1;
  c.sp.vx = M.vx; c.sp.vy = M.vy;
}
// les chats se cognent : ils rebondissent (bonk) ; doucement, ils se font un câlin
function chocs(L, dt) {
  const F = L.filter(c => !c.held && ['derive', 'nage'].includes(c.sp.m));
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
    const a = F[i], b = F[j], [ax, ay] = centreDe(a), [bx, by] = centreDe(b), ra = rayon(a), rb = rayon(b), dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
    if (d >= ra + rb) continue;
    const nx = dx / d, ny = dy / d, over = ra + rb - d; a.x -= nx * over / 2; a.y -= ny * over / 2; b.x += nx * over / 2; b.y += ny * over / 2;
    const A = a.sp, B = b.sp, vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny; if (vn >= 0) continue;
    // doucement, deux chats libres, pas juste après un autre câlin : un câlin
    if (-vn < 70 * Wd.s0 / 150 && Math.random() < 0.45 && Wd.t - A.cal > 8 && Wd.t - B.cal > 8) { commenceCalin(a, b); continue; }
    const jmp = -vn * 0.9; A.vx -= jmp * nx; A.vy -= jmp * ny; B.vx += jmp * nx; B.vy += jmp * ny;
    A.w += rnd(-4, 4); B.w += rnd(-4, 4);
    if (-vn > 110) { A.bonk = B.bonk = Wd.t; A.m = B.m = 'derive'; Wd.fx.push({ k: 'txt', text: pick(['bonk !', 'boing', 'toc', 'paf']), x: (ax + bx) / 2, y: (ay + by) / 2 - Wd.s0 * 0.3, t0: Wd.t, life: 1, rot: rnd(-0.25, 0.25), size: 17 }); }
  }
}

// jamais l'un dans l'autre : ceux qui flottent librement s'écartent des autres, quels qu'ils soient (accrochés, en câlin, posés…)
function separe(L) {
  const libre = c => ['derive', 'nage', 'calin'].includes(c.sp.m);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; if (a.held || b.held || a.sp.m === 'crache' || b.sp.m === 'crache' || (a.sp.C && a.sp.C === b.sp.C && a.sp.m === 'calin')) continue;
    const la = libre(a), lb = libre(b); if (!la && !lb) continue;
    const [ax, ay] = centreDe(a), [bx, by] = centreDe(b), need = (rayon(a) + rayon(b)) * 0.95, dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 0.01; if (d >= need) continue;
    const nx = dx / d || 1, ny = dy / d, o = need - d, ka = la && lb ? 0.5 : la ? 1 : 0, kb = la && lb ? 0.5 : lb ? 1 : 0;
    const mv = (c, k, sg) => { if (!k) return; if (c.sp.m === 'calin' && c.sp.C) { c.sp.C.x += sg * nx * o * k; c.sp.C.y += sg * ny * o * k; } else { c.x += sg * nx * o * k; c.y += sg * ny * o * k; } };
    mv(a, ka, -1); mv(b, kb, 1);
  }
}

/* ——— les nouvelles poses de l'espace ——— */
// nager dans le vide : les quatre pattes qui moulinent (la brasse du chat), la queue en gouvernail
ANIMS.nage = (c, p, t) => { Chat.rest(c, p); const w = t * 9;
  p[I.fl] = 0.7 + Math.sin(w) * 0.8; p[I.fr] = 0.7 + Math.sin(w + Math.PI) * 0.8; p[I.hl] = -0.6 + Math.sin(w + 1) * 0.7; p[I.hr] = -0.6 + Math.sin(w + 1 + Math.PI) * 0.7;
  p[I.stretch] = 0.12; p[I.look] = 0.3; p[I.px] = 1; p[I.tailUp] = 0.4; p[I.tailWave] = 1.1; p[I.tailPhase] = t * 6; p[I.eyes] = 0; p[I.mouth] = Math.sin(t * 2.3) > 0.7 ? 1 : 0; };
// en apesanteur : en étoile, les pattes écartées qui ondulent lentement, l'air ravi
ANIMS.apesanteur = (c, p, t) => { Chat.rest(c, p); const w = t * 1.3;
  p[I.fl] = 1.4 + Math.sin(w) * 0.25; p[I.fr] = 1.0 + Math.sin(w + 1.3) * 0.25; p[I.hl] = -1.3 + Math.sin(w + 2) * 0.25; p[I.hr] = -0.9 + Math.sin(w + 3) * 0.25;
  p[I.fk] = p[I.fk2] = p[I.hk] = 1.1; p[I.sqz] = -0.04; p[I.tailUp] = 1.2; p[I.tailCurl] = 1 + Math.sin(t) * 0.4; p[I.tailWave] = 0.5; p[I.tailPhase] = t * 1.2;
  p[I.eyes] = (t % 6) < 3.5 ? 2 : 0; p[I.look] = 0.9; p[I.htilt] = Math.sin(t * 0.7) * 0.25; };
// agrippé au curseur : les pattes de devant tendues vers le haut qui s'accrochent, celles de derrière qui gigotent
ANIMS.agrippe = (c, p, t) => { Chat.rest(c, p); p[I.pitch] = 1.35 + Math.sin(t * 2.5) * 0.08; p[I.y] = 0; p[I.stretch] = 0.15;
  p[I.fl] = 1.55 + Math.sin(t * 7) * 0.12; p[I.fr] = 1.65 - Math.sin(t * 7) * 0.12; p[I.fk] = p[I.fk2] = 1.35;
  p[I.hl] = -1.4 + Math.sin(t * 8) * 0.45; p[I.hr] = -1.4 - Math.sin(t * 8) * 0.45; p[I.hk] = 1.1;
  p[I.eyes] = (t % 3) < 2.2 ? 2 : 0; p[I.mouth] = (t % 2.5) < 0.4 ? 1 : 0; p[I.look] = 1; p[I.py] = -1;
  p[I.tailUp] = -0.4; p[I.tailWave] = 1.4; p[I.tailPhase] = t * 7; };

/* ——— la main dans l'espace : attraper, lancer ; le doigt (ou la souris, appuyée dans le vide) attire les chats ; un clic dans le vide fait une onde ——— */
// (le film demande aussi, au survol, ce qui est sous la souris : rien ne change ici avant qu'on appuie et glisse)
const DOIGT = { doigt: true };
function grab(x, y) {
  if (Wd.trou) return null;
  const c = K.catAt(x, y); if (c && c.sp && c.sp.m !== 'crache') return c;
  for (const f of X.grab) { const k = f(x, y); if (k) return k; }
  return DOIGT;
}
function drag(c, x, y) {
  if (c.mod) return c.mod.drag(c, x, y);
  if (c.doigt) { let D = E.doigt; if (!D) { D = E.doigt = { x: Wd.gx ?? x, y: Wd.gy ?? y, x0: Wd.gx ?? x, y0: Wd.gy ?? y, vx: 0, vy: 0, tl: Wd.t, on: true, loin: false }; if (X.trace) X.trace.debut(D.x0, D.y0); }
    if (X.trace) X.trace.suite(x, y);
    const dt = Math.max(1 / 120, Wd.t - D.tl); D.tl = Wd.t; D.vx += ((x - D.x) / dt - D.vx) * 0.35; D.vy += ((y - D.y) / dt - D.vy) * 0.35; D.x = x; D.y = y; if (Math.hypot(x - D.x0, y - D.y0) > 8) D.loin = true; return; }
  if (!c.sp) return;
  if (!c.held) { if (c.sp.m === 'calin' || c.sp.m === 'agrippe' || X.mode[c.sp.m]) c.sp.m = 'derive'; c.sp.ancre = null; c.held = true; c.sp.m = 'tenu'; c.pend = null; say(c, pick(['mia ?', 'hé !', '…'])); if (K.porteTout) K.porteTout(c); }
  c.hx = x; c.hy = y;
}
function release(c, vx, vy) {
  if (c.mod) return c.mod.release(c, vx, vy);
  if (c.doigt) { const D = E.doigt; E.doigt = null; const fait = D && X.trace ? X.trace.fin() : false; if (!fait && (!D || !D.loin)) onde(D ? D.x : Wd.gx, D ? D.y : Wd.gy); return; }
  if (!c.sp) return;
  if (!c.held) { c.sp.w += rnd(6, 10) * (Math.random() < 0.5 ? -1 : 1); c.sp.anim = 'chute'; c.sp.bonk = Wd.t - 1; say(c, pick(['wiii !', '♥', 'encore !', 'mrrr'])); return; }
  c.held = false; const S = c.sp; S.m = 'derive'; S.lache = Wd.t; S.next = Wd.t + rnd(3, 6); S.anim = 'chute';
  S.vx = clamp(vx || 0, -2200, 2200); S.vy = clamp(vy || 0, -2200, 2200); S.w = clamp((vx || 0) * 0.005, -9, 9) + rnd(-1, 1);
  if (Math.hypot(S.vx, S.vy) > 900) say(c, pick(['wiiiii !', 'aaaah', 'miaaa !']));
}
function click(x, y) { const c = K.catAt(x, y); if (c && c.sp) { release(c, 0, 0); return true; } onde(x, y); return true; }
// une onde dans le vide : elle repousse ce qui est autour
function onde(x, y) {
  E.ondes.push({ x, y, t0: performance.now() / 1000, r: Wd.s0 * 3, a: 1 });
  Wd.cats.forEach(c => { if (!c.sp || c.held || c.sp.m === 'crache') return; const [cx, cy] = centreDe(c), dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1, R = Wd.s0 * 3; if (d > R) return;
    const f = (1 - d / R) * 520 * Wd.s0 / 150; if (c.sp.m === 'agrippe' || c.sp.m === 'calin' || X.mode[c.sp.m]) { c.sp.m = 'derive'; c.sp.ancre = null; } c.sp.vx += dx / d * f; c.sp.vy += dy / d * f; c.sp.w += rnd(-5, 5); c.sp.anim = 'chute'; c.sp.next = Wd.t + rnd(1.5, 3);
    if (Math.random() < 0.4) say(c, pick(['woh', '!', 'wiii'])); });
}

/* ——— le calque de l'espace : le ciel, le trou blanc qui recrache, les ondes ——— */
function boucleEspace(id) {
  if (id !== E.boucle) return;
  if (!Wd.espace) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); return; }
  taille(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
  const now = performance.now() / 1000;
  fondNoir(1); cielEtoile(1, now);
  X.fond.forEach(f => f(ctx, now));
  // le trou blanc : un anneau qui s'ouvre et des rayons, le temps de recracher tout le monde
  const u = now - E.flash, [cx, cy] = centre(), n = Wd.cats.filter(c => !c.gone).length, dur = 1 + n * 0.16;
  if (u < dur + 0.8) {
    // (il part du point de lumière où le trou noir s'est refermé, grandit, puis se resserre en un point : il ne s'allume ni ne s'éteint)
    const k = sm(u / 0.3) * (1 - sm((u - dur) / 0.8)), r = Math.min(W, H) * (0.03 + 0.03 * Math.sin(u * 6) * k) * k + 6 * (1 - sm((u - dur) / 0.8));
    ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = '#F4F4EE'; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + u * 0.8, L = r * (2 + (i % 3) * 0.7); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.stroke(); }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2); g.addColorStop(0, 'rgba(255,255,250,1)'); g.addColorStop(0.6, 'rgba(255,255,250,0.5)'); g.addColorStop(1, 'rgba(255,255,250,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, TAU); ctx.fill(); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // les ondes : des cercles au stylo qui s'élargissent et s'effacent
  E.ondes = E.ondes.filter(o => now - o.t0 < 0.9);
  E.ondes.forEach(o => { const t = (now - o.t0) / 0.9; ctx.save(); ctx.strokeStyle = '#F4F4EE'; ctx.globalAlpha = o.a * (1 - t);
    [1, 0.7].forEach((q, i) => { ctx.lineWidth = 2 - i * 0.8; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * sm(t) * q, 0, TAU); ctx.stroke(); }); ctx.restore(); });
  X.devant.forEach(f => f(ctx, now));
  requestAnimationFrame(() => boucleEspace(id));
}

// retour à l'écran 1 (la barre du bas, la planète des chats) : un passage s'ouvre sur la pièce (la planète qui grandit, ou un cercle au centre),
// il grandit jusqu'à remplir l'écran, et recrache tout : les objets retournent à leur place en se déroulant, les chats retombent dans la pièce,
// leur trait redevient encre peu à peu (28/09, Mathieu : « tout doit être une continuité, pas un fade vers un autre truc »)
let RV = null, finSortie = -1e9;
const DS = 2.3;   // la sortie (s)
function sortie(o) { if (RV || !Wd.espace) return; E.sortie = o || null; if (window.Film) Film.toChapter(0); else retour(); }
function retour(force) {
  const t = !!T; if (T) fin();
  if (RV) return;
  if (!Wd.espace && !theme0 && !t && !force) return;
  const doux = Wd.espace && !t && !force && !reduit && Wd.W;
  const o = E.sortie || null; E.sortie = null;
  Wd.espace = false; root.classList.remove('espace', 'trou');
  if (theme0 && window.THEME) { if (doux) glisse(); THEME.set(theme0, true); } theme0 = null;
  E.doigt = null;
  if (!doux) { X.retour.forEach(f => f()); tombe(); return; }
  // la sortie : chaque chose part du centre du passage, et se déroule jusqu'à sa place
  const cx = o ? o.x : W / 2, cy = o ? o.y : H * 0.47, R = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, H - cy)), items = [];
  const add = (it, x, y, s, chat) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); items.push({ o: it, chat, x, y, s, r0: r, a0: Math.atan2(dy, dx), dl: 0.12 + 0.4 * clamp(r / R, 0, 1) + rnd(0, 0.08), rot: rnd(4, 8) * (Math.random() < 0.8 ? 1 : -1), tilt: it.tilt || 0 }); };
  Wd.props.forEach(it => { if (it.gone || it.fadeT === 0) return; const s = K.sOf(it.d) * (it.big || 1); if (it.tilt0 != null) it.tilt = it.tilt0; it.root.visible = true; add(it, it.fx * Wd.W, K.floorAt(it.d) - it.lift, s, false); });
  Wd.cats.forEach(c => { if (c.gone) return; prepare(c); c.held = false; c.d = rnd(0.05, 0.6); c.sK = null; const s = K.sOf(c.d); add(c, rnd(0.12, 0.88) * Wd.W, K.floorAt(c.d) - s * rnd(0.3, 0.9), s, true); });
  RV = { t0: performance.now() / 1000, cx, cy, R: Math.hypot(W, H), items, o, couches: couches(), fond: o && o.dessine };
  root.classList.add('sortie');
  const id = ++E.boucle; requestAnimationFrame(() => boucleSortie(id));
}
// les chats retombent du ciel (sans passage : mouvement réduit, ou la barre du bas pendant l'aspiration)
function tombe() {
  Wd.props.forEach(it => { if (it.tilt0 != null) it.tilt = it.tilt0; it.fade = 0; it.fadeT = 1; });
  Wd.cats.forEach((c, i) => { if (c.gone) return; encre(c); prepare(c); c.held = false;
    c.d = rnd(0.05, 0.6); c.sK = null; c.s = K.sOf(c.d); c.x = rnd(0.12, 0.88) * Wd.W; c.y = -sc(c) * rnd(1.2, 3) - i * 30; c.fall = true; c.vx = rnd(-60, 60); c.vy = 0; c.spin = rnd(-3, 3); c.z = K.zOf(c.d);
    if (Math.random() < 0.5) K.later(0.4 + i * 0.2, () => say(c, pick(['on est rentrés !', 'mia !', 'ouf', 'encore !']))); });
  Wd.nextIn = Wd.t + rnd(8, 14); Wd.nextScen = Wd.t + rnd(20, 30); Wd.nextKib = Wd.t + rnd(10, 20);
}
// une image de la sortie (le temps du monde) : le contraire de l'aspiration, en partant du passage
function sortant(dt) {
  if (!RV) return; minuteur();
  const u = (performance.now() / 1000 - RV.t0) / DS;
  RV.items.forEach(m => {
    const e = 1 - ease((u - m.dl) / 0.42), f = Math.pow(1 - e, 1.15), r = m.r0 * f, a = m.a0 - (e * 2.2 + e * e * 5);
    const x = RV.cx + Math.cos(a) * r, y = RV.cy + Math.sin(a) * r * (1 - 0.18 * e);
    const o = m.o, rot = e * e * m.rot, pas = u < m.dl;
    if (m.chat) {
      const c = o; c.at += dt; c.anim = e > 0.05 ? 'chute' : 'sursaut' in ANIMS ? 'sursaut' : 'assis'; teinte(c, sm((e - 0.1) / 0.6));
      c.s = Math.max(0.001, m.s * f); c.spin = rot; c.x = x; c.y = y; c.z = K.zOf(c.d);
      (ANIMS[c.anim] || ANIMS.assis)(c, c.tgt, c.at); Chat.step(c, dt, { a: Wd.a * (pas ? 0 : 1) });
    } else {
      o.x = x; o.y = y; o.s = Math.max(0.001, m.s * f); o.tilt = m.tilt + rot; o.a = pas ? 0 : Wd.a; o.fade = o.fadeT = 1; Univers.place(o);
    }
  });
  if (u >= 1.08) finit();
}
function finit() {
  if (!RV) return;
  RV.items.forEach(m => { const o = m.o; if (m.chat) { encre(o); o.s = m.s; o.x = m.x; o.y = m.y; o.fall = true; o.vx = rnd(-30, 30); o.vy = 0; o.spin = 0; }
    else { o.tilt = m.tilt; o.a = Wd.a; } });
  RV.couches.forEach(({ el }) => { el.style.transform = el.style.transformOrigin = ''; });
  const L = RV.items.filter(m => m.chat).map(m => m.o); L.slice(0, 3).forEach((c, i) => K.later(0.2 + i * 0.3, () => say(c, pick(['on est rentrés !', 'mia !', 'ouf', 'encore !', 'tadaa']))));
  Wd.nextIn = Wd.t + rnd(8, 14); Wd.nextScen = Wd.t + rnd(20, 30); Wd.nextKib = Wd.t + rnd(10, 20);
  RV = null; finSortie = performance.now() / 1000; root.classList.remove('sortie'); E.boucle++;
  X.retour.forEach(f => f());
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
}
// le calque de la sortie : l'espace tout autour, percé d'un passage qui grandit (derrière, la vraie pièce) ; son bord est un trait qui passe du blanc à l'encre
function boucleSortie(id) {
  if (id !== E.boucle || !RV) return;
  taille(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
  const now = performance.now() / 1000, u = (now - RV.t0) / DS, z = ease(u / 0.62);
  fondNoir(1); cielEtoile(1, now); X.fond.forEach(f => f(ctx, now));
  // le menu, le cadre : ils sortent du passage en se déroulant
  RV.couches.forEach(({ el, r }) => { const e = 1 - easeIn(c01((u - 0.3) / 0.5)); el.style.transformOrigin = `${RV.cx - r.left}px ${RV.cy - r.top}px`;
    el.style.transform = e > 0.001 ? `rotate(${-(e * 2.2 + e * e * 5) * 57.3}deg) scale(${Math.max(0.001, Math.pow(1 - e, 1.3))})` : ''; });
  if (RV.fond) RV.fond(ctx, z, now);   // la planète des chats : elle grandit, son disque devient le passage (js/espace-planetes.js)
  else {
    const rr = 4 + z * RV.R, ink = melange([244, 244, 238], rgb((window.THEME && THEME.ink) || '34,36,40'), sm(z / 0.5));
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(RV.cx, RV.cy, rr, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = `rgb(${ink})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(RV.cx, RV.cy, rr, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(RV.cx, RV.cy, rr * 0.94 + 2, 0, TAU); ctx.stroke(); ctx.restore();
  }
  X.devant.forEach(f => f(ctx, now));
  requestAnimationFrame(() => boucleSortie(id));
}

Wd.ail = { on: () => !!(Wd.trou || Wd.espace || RV), step: dt => (Wd.trou ? aspiration(dt) : RV ? sortant(dt) : espace(dt)), draw() {}, click: (x, y) => RV ? true : click(x, y), grab: (x, y) => RV ? null : grab(x, y), drag, release };
// pour les modules de l'espace
const outils = { X, E, K, sortie, melange, rgb, centre, centreDe, rayon, apres, onde, lache, say, BLANC, HAUT, BAS, DERIVE, get W() { return W; }, get H() { return H; }, get ctx() { return ctx; } };
return { aspire, entre, retour, outils, get espace() { return !!Wd.espace; }, get actif() { return !!(Wd.trou || Wd.espace || RV); }, get trou() { return !!T; }, get depuis() { return performance.now() / 1000 - finSortie; } };
})();
