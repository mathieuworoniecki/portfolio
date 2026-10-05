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

/* ——— les étoiles : des petits points et des croix au stylo, qui scintillent et brillent ———
   (28/09, Mathieu : « les étoiles doivent briller ») : chacune a son halo (une lueur dessinée une fois, posée à chaque image),
   les grosses ont leurs branches qui s'allongent quand elles scintillent ; de temps en temps, une étoile filante traverse le ciel */
let ETO = [], FIL = null;
const LUEUR = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(250,250,244,0.95)'); g.addColorStop(0.18, 'rgba(250,250,244,0.45)'); g.addColorStop(0.5, 'rgba(236,240,255,0.12)'); g.addColorStop(1, 'rgba(236,240,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c; })();
// une étoile qui brille : le halo, le cœur, et (si br) ses quatre branches
function brille(x0, px, py, R, k, br, t, ph) {
  x0.globalAlpha = k; x0.drawImage(LUEUR, px - R * 3, py - R * 3, R * 6, R * 6);
  if (!br) return;
  const L = R * (2.4 + 1.2 * Math.max(0, Math.sin(t * 1.7 + ph))), l = L * 0.45; x0.strokeStyle = '#F4F4EE'; x0.lineWidth = Math.max(0.8, R * 0.22); x0.globalAlpha = k * 0.9;
  x0.beginPath(); x0.moveTo(px - L, py); x0.lineTo(px + L, py); x0.moveTo(px, py - L); x0.lineTo(px, py + L);
  x0.moveTo(px - l * 0.5, py - l * 0.5); x0.lineTo(px + l * 0.5, py + l * 0.5); x0.moveTo(px + l * 0.5, py - l * 0.5); x0.lineTo(px - l * 0.5, py + l * 0.5); x0.stroke();
}
function etoiles() {
  const n = Math.round(clamp(W * H / 6500, 60, 320)); ETO = [];
  for (let i = 0; i < n; i++) ETO.push({ x: Math.random(), y: Math.random(), r: Math.random() < 0.08 ? rnd(2.5, 4.5) : rnd(0.5, 1.4), ph: rnd(0, TAU), v: rnd(0.6, 2.2), p: rnd(0.2, 1), h: Math.random() < 0.35 });
}
function cielEtoile(a, t) {
  if (ETO.length === 0 || ETO.W !== W || ETO.H !== H) { etoiles(); ETO.W = W; ETO.H = H; }
  const P = Wd.ptr || { x: W / 2, y: H / 2, on: false }, px = P.on ? (P.x - W / 2) / W : 0, py = P.on ? (P.y - H / 2) / H : 0;
  ctx.save(); ctx.lineCap = 'round';
  for (const s of ETO) {
    const tw = 0.55 + 0.45 * Math.sin(t * s.v + s.ph), x = s.x * W - px * 14 * s.p, y = s.y * H - py * 10 * s.p, k = a * tw * (0.35 + 0.65 * s.p);
    if (s.r > 2) brille(ctx, x, y, s.r * 1.4, k, true, t, s.ph);
    else if (s.h) brille(ctx, x, y, s.r * 2.2, k * 0.8, false, t, s.ph);
    ctx.globalAlpha = k; ctx.fillStyle = '#F4F4EE'; ctx.beginPath(); ctx.arc(x, y, s.r > 2 ? s.r * 0.45 : s.r, 0, TAU); ctx.fill();
  }
  // l'étoile filante : une tête qui brille, une traîne qui la suit ; elle part d'un bord haut, en biais
  if (!FIL && Math.random() < 0.004 && !reduit) { const g = Math.random() < 0.5 ? -1 : 1; FIL = { x: rnd(0.2, 0.8) * W, y: rnd(0.05, 0.35) * H, vx: g * rnd(0.7, 1.1) * W, vy: rnd(0.25, 0.45) * W, t0: t, d: rnd(0.7, 1.1) }; }
  if (FIL) { const u = (t - FIL.t0) / FIL.d; if (u > 1) FIL = null; else {
    const hx = FIL.x + FIL.vx * u * FIL.d, hy = FIL.y + FIL.vy * u * FIL.d, q = Math.min(u, 0.18) * FIL.d, tx = hx - FIL.vx * q, ty = hy - FIL.vy * q, k = a * Math.sin(Math.PI * u);
    const g = ctx.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, 'rgba(244,244,238,0)'); g.addColorStop(1, 'rgba(244,244,238,0.9)');
    ctx.globalAlpha = k; ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke(); brille(ctx, hx, hy, 3.2, k, true, t, 0); } }
  ctx.restore();
}
/* (vague 262 de l'audit, immersion) : le ciel découvert derrière la page n'était qu'un fond plat ; maintenant le trou le courbe tout entier.
   Chaque étoile est vue par la lentille gravitationnelle : repoussée loin du trou, étirée en arc autour de lui (de plus en plus près, plus long),
   avec sa seconde image, petite et pâle, de l'autre côté ; tout le ciel est entraîné dans la rotation du trou, plus vite près de lui ;
   les plus proches forment l'anneau d'Einstein. Quand le trou se referme, le ciel se redresse et reprend sa place. */
function cielCourbe(u, rh) {
  if (ETO.length === 0 || ETO.W !== W || ETO.H !== H) { etoiles(); ETO.W = W; ETO.H = H; }
  const t = u * DUREE, [cx, cy] = centre(), tE = rh * 1.7, e2 = tE * tE, ky = 0.82;
  if (tE < 1) { cielEtoile(1, t); return; }
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = ctx.fillStyle = '#F4F4EE';
  for (const s of ETO) {
    const tw = 0.55 + 0.45 * Math.sin(t * s.v + s.ph), k = tw * (0.35 + 0.65 * s.p);
    const dx = s.x * W - cx, dy = (s.y * H - cy) / ky, d = Math.max(2, Math.hypot(dx, dy));
    // l'entraînement : le ciel tourne avec le trou (vite près de lui, à peine au bord de l'écran)
    const a = Math.atan2(dy, dx) + t * 1.4 * Math.min(1, e2 / (d * d)) * 4, q = Math.sqrt(d * d + 4 * e2);
    [[(d + q) / 2, a, 1], [(q - d) / 2, a + Math.PI, 0.45]].forEach(([r, b, f], j) => {
      if (j && r < tE * 0.25) return;
      // l'arc : sa longueur suit l'agrandissement tangentiel de la lentille
      const demi = Math.min(1.1, (s.r * 1.6 + 1) * Math.max(1, (j ? 2.2 : 1) * e2 / (d * d) * 6) / r);
      const x = cx + Math.cos(b) * r, y = cy + Math.sin(b) * r * ky;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return;
      ctx.globalAlpha = k * f;
      if (demi * r < s.r * 2.2 + 1.5) { if (s.r > 2 && !j) brille(ctx, x, y, s.r * 1.4, k, true, t, s.ph); ctx.globalAlpha = k * f; ctx.beginPath(); ctx.arc(x, y, (s.r > 2 ? s.r * 0.45 : s.r) * (j ? 0.7 : 1), 0, TAU); ctx.fill(); return; }
      if (s.r > 2 && !j) brille(ctx, x, y, s.r * 1.2, k * 0.8, false, t, s.ph);
      ctx.globalAlpha = k * f; ctx.lineWidth = Math.max(0.7, (s.r > 2 ? s.r * 0.6 : s.r * 1.3) * (j ? 0.7 : 1));
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ky); ctx.beginPath(); ctx.arc(0, 0, r, b - demi, b + demi); ctx.restore(); ctx.stroke();
    });
  }
  // l'anneau d'Einstein : la lumière de tout ce qui est juste derrière le trou, en traits pâles qui tournent
  ctx.globalAlpha = 0.35 * sm((u - 0.15) / 0.3); ctx.lineWidth = 1.2; ctx.setLineDash([tE * 0.5, tE * 0.22]); ctx.lineDashOffset = -t * tE * 2.2;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ky); ctx.beginPath(); ctx.arc(0, 0, tE * 1.02, 0, TAU); ctx.restore(); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore(); ctx.globalAlpha = 1;
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
  c.bord = v('--bp-deep');
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
  // le trou : il s'ouvre, respire, avale ; à la fin il se referme en un point
  const R0 = Math.min(W, H) * 0.075, ouvre = sm(u / 0.12), ferme = 1 - sm((u - 0.9) / 0.1), rh = R0 * ouvre * ferme * (1 + 0.5 * sm((u - 0.1) / 0.6)) * (1 + 0.06 * Math.sin(u * 30));
  fondNoir(1); cielCourbe(u, rh);   // (l'espace est déjà là, derrière la page : on le découvre à mesure qu'elle est avalée)
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
    // (vague 182 de l'audit : « le trou noir ») : la photo, écrasée en hauteur (ky), ne couvrait plus le bord de son anneau : chaque anneau, tourné
    // autrement, laissait voir le noir en dents de scie ; le papier du bord de la page remplit d'abord l'anneau
    if (snap.bord) { ctx.fillStyle = snap.bord; ctx.fill(); }
    ctx.rotate(th); ctx.scale(f, f * ky); ctx.drawImage(snap, -R, -R, 2 * R, 2 * R); ctx.restore();
  }
  // (vague 26, l'audit : « le meilleur moment du site » doit aller plus loin) : la page ne fait pas que s'enrouler, elle se déchire ;
  // des lambeaux se détachent juste avant que leur anneau parte, et filent en vrille, plus vite que la page, vers le trou
  lambeaux(u);
  souris(u, rh); cramponne(u);
  if (rh > 0.5) {
    const clair0 = sm((u - 0.3) / 0.4), col0 = melange(T.ink, [244, 244, 238], clair0);
    // le disque d'accrétion au stylo : sa moitié arrière passe derrière le trou, et la lumière courbée la fait réapparaître en arc au-dessus
    disque(cx, cy, rh, u, col0, false); lentille(cx, cy, rh, u, col0);
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
    disque(cx, cy, rh, u, col0, true);
  }
  // le point de lumière, juste avant de recracher
  // (il naît au cœur du trou qui se referme : le disque noir rétrécit autour de lui, il ne s'allume pas d'un coup)
  if (u > 0.9) { const k = sm((u - 0.9) / 0.1); ctx.save(); ctx.fillStyle = '#F4F4EE'; ctx.beginPath(); ctx.arc(cx, cy, Math.min(rh * 0.8, 1 + k * 5) + k * 2, 0, TAU); ctx.fill(); ctx.restore(); }
}
// le disque : des traits courts sur des orbites plates, plus rapides près du trou (Kepler), plus clairs du côté qui vient vers nous
function disque(cx, cy, rh, u, col, devant) {
  if (!T.DQ) T.DQ = Array.from({ length: W < 760 ? 150 : 260 }, () => ({ r: 1.35 + 3.6 * Math.pow(Math.random(), 1.5), a: rnd(0, TAU), l: rnd(0.12, 0.45), w: rnd(0.8, 2.4), v: rnd(0.8, 1.2) }));
  const pousse = sm((u - 0.06) / 0.3); if (pousse <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.12); ctx.lineCap = 'round'; ctx.strokeStyle = `rgb(${col})`;
  for (const q of T.DQ) {
    const r = rh * (1 + (q.r - 1) * pousse), a = q.a + u * DUREE * q.v * 7 / Math.pow(q.r, 1.5);
    if ((Math.sin(a) > 0) !== devant) continue;
    ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.cos(a)) * (1.2 - q.r / 5); ctx.lineWidth = q.w;
    ctx.beginPath(); for (let k = 0; k <= 5; k++) { const b = a - q.l * k / 5; const px = Math.cos(b) * r, py = Math.sin(b) * r * 0.2; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
  }
  ctx.restore();
}
// la lentille : l'arrière du disque, courbé par la gravité, fait un arc par-dessus le trou (et un plus fin par-dessous)
function lentille(cx, cy, rh, u, col) {
  const k = sm((u - 0.12) / 0.3); if (k <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.12); ctx.lineCap = 'round'; ctx.strokeStyle = `rgb(${col})`;
  for (let i = 0; i < 7; i++) { const r = rh * (1.22 + i * 0.13 * k);
    ctx.setLineDash([rh * (0.3 + 0.2 * Math.sin(i * 2.1)), rh * (0.08 + 0.04 * i)]); ctx.lineDashOffset = -u * DUREE * rh * (3 - i * 0.25);
    ctx.globalAlpha = k * (0.95 - i * 0.09); ctx.lineWidth = 2.8 - i * 0.28;
    ctx.beginPath(); ctx.ellipse(0, -rh * 0.05, r, r * 0.92, 0, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke();
    if (i < 3) { ctx.globalAlpha = k * (0.5 - i * 0.12); ctx.beginPath(); ctx.ellipse(0, rh * 0.03, r * 0.96, r * 0.8, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); } }
  ctx.setLineDash([]); ctx.restore();
}
// les lambeaux : des morceaux de la photo, aux bords déchirés
function lambeaux(u) {
  const { cx, cy, R, snap } = T;
  if (!T.LB) { T.LB = []; const n = W < 760 ? 22 : 40;
    for (let i = 0; i < n; i++) { const x0 = rnd(0.04, 0.96) * W, y0 = rnd(0.06, 0.94) * H, r0 = Math.hypot(x0 - cx, y0 - cy), s = rnd(16, 44) * Math.min(1.3, Math.max(0.7, W / 1200));
      if (r0 < R * 0.12) continue; const m = r0 / R;
      T.LB.push({ x0, y0, r0, a0: Math.atan2(y0 - cy, x0 - cx), s, ud: 0.05 + m * 0.5 - rnd(0.02, 0.06), sp: rnd(4, 11) * (Math.random() < 0.5 ? -1 : 1), fl: rnd(3, 9), bord: (() => { const p1 = rnd(0, TAU), p2 = rnd(0, TAU), a2 = rnd(0.15, 0.35); return Array.from({ length: 26 }, (_, j) => { const b = j / 26 * TAU; return [b, 0.8 + a2 * Math.sin(2 * b + p1) + 0.12 * Math.sin(3 * b + p2) + rnd(-0.07, 0.07)]; }); })() }); } }
  for (const L of T.LB) {
    const e = easeIn((u - L.ud) / 0.32); if (e <= 0 || e >= 0.995) continue;
    const r = L.r0 * Math.pow(1 - e, 1.25), a = L.a0 + e * 3 + e * e * 6, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.82, f = Math.max(0.05, Math.pow(1 - e, 0.7));
    // il se retourne en tombant (une feuille qui vrille) : de dos, c'est du papier blanc ; son ombre le décolle de la page
    const fl = Math.cos(e * L.fl), fx = Math.sign(fl || 1) * Math.max(0.08, Math.abs(fl));
    ctx.save(); ctx.translate(x, y); ctx.rotate(L.sp * e * e); ctx.scale(f * fx, f);
    ctx.beginPath(); L.bord.forEach(([b, k], j) => { const px = Math.cos(b) * L.s * k, py = Math.sin(b) * L.s * k; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
    ctx.save(); ctx.translate(L.s * 0.12, L.s * 0.16); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.clip(); if (fl > 0) ctx.drawImage(snap, cx - R - L.x0, cy - R - L.y0, 2 * R, 2 * R); else { ctx.fillStyle = '#ECEDE9'; ctx.fill(); } ctx.restore();
    ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(${melange(T.ink, [244, 244, 238], sm((u - 0.3) / 0.4))},0.9)`; ctx.lineWidth = 1.4 / f; ctx.stroke();
    ctx.restore();
  }
}
// (vague 65) ta souris y passe aussi : la pointe se fait étirer vers le trou (spaghettification) et s'effrite
// en grains de craie qui spiralent jusqu'à lui ; plus on s'approche, plus ça tire
function souris(u, rh) {
  const P = Wd.ptr; if (!T.GR) T.GR = []; const GR = T.GR, { cx, cy } = T, dt = Math.min(0.05, u * DUREE - (T.uS ?? u * DUREE)); T.uS = u * DUREE;
  const vit = sm(u / 0.15) * (1 - sm((u - 0.88) / 0.08));
  if (P && P.on && vit > 0) {
    const dx = cx - P.x, dy = cy - P.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, prox = clamp(1 - d / (Math.hypot(W, H) * 0.6), 0, 1), tire = vit * (0.25 + 0.75 * prox * prox);
    // la flèche, étirée vers le trou : elle ne quitte pas sa place, elle s'allonge
    const L = 18 * (1 + 7 * tire), ang = Math.atan2(uy, ux);
    // des grains s'arrachent tout le long de la flèche étirée
    // (vague 224 de l'audit, design : ils partaient par paquets à chaque image, tous de la pointe, et s'y entassaient en hachures noires
    // en travers de la flèche ; maintenant un débit régulier dans le temps, chaque grain se détache d'un point de la flèche)
    T.gAcc = (T.gAcc || 0) + dt * (30 + 170 * tire) * (W < 760 ? 0.5 : 1);
    for (; T.gAcc >= 1 && GR.length < 260; T.gAcc--) GR.push({ r: d - rnd(0.15, 1) * L * 0.9, a: Math.atan2(P.y - cy, P.x - cx) + rnd(-0.02, 0.02), v: rnd(0.6, 1.4), w: rnd(0.8, 1.8) });
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(ang); ctx.lineJoin = ctx.lineCap = 'round';
    for (let k = 3; k >= 0; k--) { const f = 1 - k * 0.22;
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(L * f, -3.5 * (1 - 0.5 * tire) * f); ctx.lineTo(L * f * 0.72, 0); ctx.lineTo(L * f, 3.5 * (1 - 0.5 * tire) * f); ctx.closePath();
      // (double trait : une gaine d'encre sous un cœur de craie, lisible sur le papier comme sur l'espace)
      ctx.globalAlpha = k ? 0.25 : 0.9; ctx.strokeStyle = `rgb(${T.ink.join(',')})`; ctx.lineWidth = k ? 1.6 : 3.4; ctx.stroke();
      ctx.strokeStyle = '#F4F4EE'; ctx.lineWidth = k ? 0.8 : 1.6; ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // les grains : ils orbitent de plus en plus vite en tombant (Kepler), s'étirent en traits, et passent sous le disque
  ctx.save(); ctx.lineCap = 'round';
  for (let i = GR.length - 1; i >= 0; i--) { const g = GR[i];
    const om = 2.2 * Math.pow(Math.max(rh, 8) / Math.max(g.r, rh * 0.9), 1.5) * g.v * 2.4 + 0.4;
    g.r -= dt * (90 + 1400 * Math.pow(Math.max(rh, 8) / Math.max(g.r, 1), 0.8)) * g.v; g.a += dt * om;
    if (g.r < rh * 0.95 || !(rh > 0.5)) { GR.splice(i, 1); continue; }
    // (vague 224) la traînée suit le vrai chemin du grain : droite vers le trou loin de lui, puis courbée en spirale en tombant
    const x = cx + Math.cos(g.a) * g.r, y = cy + Math.sin(g.a) * g.r * 0.82;
    if (dt > 0 || g.ox == null) { if (g.x != null) { g.ox = g.x; g.oy = g.y; } g.x = x; g.y = y; }
    let x2 = g.ox ?? x + 2, y2 = g.oy ?? y, tl = Math.hypot(x2 - x, y2 - y) || 1; const tk = clamp(tl, 3, 22) / tl; x2 = x + (x2 - x) * tk; y2 = y + (y2 - y) * tk;
    ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y);
    ctx.strokeStyle = `rgb(${T.ink.join(',')})`; ctx.lineWidth = g.w + 1.6; ctx.stroke(); ctx.strokeStyle = '#F4F4EE'; ctx.lineWidth = g.w * 0.7; ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}
/* (vague 103 de l'audit, « le trou noir » vers 9,9) : un chat, sous le bas de l'écran, s'accroche au bord de la vitre. Ses deux pattes
   surgissent et plantent leurs griffes sur le bord, sa tête dépasse, les yeux ronds ; le trou tire : la tête s'étire vers lui
   (spaghettification), les griffes rayent la vitre en glissant… puis il lâche (« NOOON ») et part en spirale jusqu'au trou. */
function cramponne(u) {
  if (!T.CR) { const bx = T.cx > W / 2 ? W * 0.16 : W * 0.84, R = clamp(Math.min(W, H) * 0.12, 40, 88); T.CR = { bx: clamp(bx, R * 1.6, W - R * 1.6), R, dit: 0 }; }
  const C = T.CR, { bx, R } = C; if (u < 0.12) return; const ink = `rgb(${T.ink.join(',')})`, pap = '#F4F4EE';
  const sort = sm((u - 0.12) / 0.1), tire = sm((u - 0.3) / 0.42), lache = easeIn((u - 0.72) / 0.2);
  if (lache > 0 && !C.vu) { C.vu = 1; if (window.Dex && Dex.vu) Dex.vu('cramponne'); }
  if (lache >= 1) return;
  const by = H + R * (1.05 - 0.8 * sort), ang = Math.atan2(T.cy - by, T.cx - bx);
  // la glissade des griffes le long du bord, vers le trou, et les rayures qu'elles laissent sur la vitre
  const gl = tire * (T.cx - bx) * 0.12 + Math.sin(u * 90) * tire * 1.5;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
  if (tire > 0.02 && lache <= 0) { ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.55;
    [-1, 1].forEach(sd => { const px = bx + sd * R * 1.08; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(px + k * R * 0.12, H - 3 - Math.abs(k) * 2); ctx.lineTo(px + k * R * 0.12 + gl, H - 3 - Math.abs(k) * 2 - tire * 3); ctx.stroke(); } }); ctx.globalAlpha = 1; }
  // pendant qu'il lâche : tout le chat part en spirale (le même chemin que le reste de la page)
  if (lache > 0) { const r0 = Math.hypot(bx - T.cx, by - T.cy), a0 = Math.atan2(by - T.cy, bx - T.cx), r = r0 * Math.pow(1 - lache, 1.15), a = a0 + lache * 2.2 + lache * lache * 5;
    ctx.translate(T.cx + Math.cos(a) * r, T.cy + Math.sin(a) * r * 0.82); ctx.rotate(lache * 9); ctx.scale(Math.max(0.01, 1 - lache), Math.max(0.01, 1 - lache)); ctx.translate(-bx, -by); }
  // la tête, étirée vers le trou
  ctx.save(); ctx.translate(bx, by); ctx.rotate(ang + Math.PI / 2); const st = 1 + 0.7 * tire; ctx.scale(1 / Math.sqrt(st), st);
  const trem = Math.sin(u * 140) * 1.2 * tire; ctx.translate(trem, 0);
  ctx.fillStyle = pap; ctx.strokeStyle = ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-R * 0.95, R * 0.2); ctx.quadraticCurveTo(-R * 1.02, -R * 0.55, -R * 0.72, -R * 0.78); ctx.lineTo(-R * 0.62, -R * 1.25); ctx.lineTo(-R * 0.25, -R * 0.92);
  ctx.quadraticCurveTo(0, -R * 0.98, R * 0.25, -R * 0.92); ctx.lineTo(R * 0.62, -R * 1.25); ctx.lineTo(R * 0.72, -R * 0.78); ctx.quadraticCurveTo(R * 1.02, -R * 0.55, R * 0.95, R * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  // les yeux : deux grands ovales noirs, deux reflets chacun (tout ronds de peur)
  [-1, 1].forEach(sd => { ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(sd * R * 0.36, -R * 0.3, R * 0.17, R * 0.22 * (1 + 0.2 * tire), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = pap; ctx.beginPath(); ctx.arc(sd * R * 0.36 - R * 0.06, -R * 0.38, R * 0.06, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(sd * R * 0.36 + R * 0.05, -R * 0.24, R * 0.03, 0, TAU); ctx.fill(); });
  ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -R * 0.02, R * 0.08, R * 0.1 * (0.6 + tire), 0, 0, TAU); ctx.stroke();   // la bouche, un petit « o »
  ctx.lineWidth = 1.4; [-1, 1].forEach(sd => { for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(sd * R * 0.55, -R * 0.08 + k * R * 0.12); ctx.lineTo(sd * R * (1.05 + tire * 0.3), -R * 0.16 + k * R * 0.2 - tire * R * 0.2); ctx.stroke(); } });
  ctx.restore();
  // les pattes, griffes plantées sur le bord
  [-1, 1].forEach(sd => { const px = bx + sd * R * 1.08 + (lache > 0 ? 0 : gl), py = H - 4 + (1 - sort) * R * 1.4;
    ctx.fillStyle = pap; ctx.strokeStyle = ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(px - R * 0.26, H + R); ctx.lineTo(px - R * 0.26, py); ctx.quadraticCurveTo(px, py - R * 0.34, px + R * 0.26, py); ctx.lineTo(px + R * 0.26, H + R); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.4; for (let k = -1; k <= 1; k++) { const cx0 = px + k * R * 0.12; ctx.beginPath(); ctx.moveTo(cx0, py - R * 0.14); ctx.quadraticCurveTo(cx0 + R * 0.04, py - R * 0.02, cx0, py + R * 0.1); ctx.stroke(); } });
  ctx.restore();
  // ce qu'il crie (écrit à la main, sur le calque)
  const EN = window.I18N && I18N.lang !== 'fr', mot = lache > 0 ? (EN ? 'NOOOO!' : 'NOOOON !') : tire > 0.55 ? (EN ? 'not letting go…' : 'je lâcherai pas…') : sort > 0.5 ? (EN ? 'hey!!' : 'hé !!') : ''; if (mot && lache < 0.35) { ctx.save(); ctx.font = `${Math.round(R * 0.42)}px ${getComputedStyle(document.body).getPropertyValue('--hand') || 'serif'}`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = pap; ctx.fillStyle = ink; const yy = H - R * (1.6 + tire * 0.8); const tx = clamp(bx, ctx.measureText(mot).width / 2 + 10, W - ctx.measureText(mot).width / 2 - 10); ctx.strokeText(mot, tx, yy); ctx.fillText(mot, tx, yy); ctx.restore(); }
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
const E = { crache: -1, ondes: [], pops: [], doigt: null, boucle: 0 };
/* les modules de l'espace (js/espace-*.js : le dessin, la présentation au stylo, les planètes) se branchent ici :
     pas(dt, chats)       après les chats, à chaque image (forces, chocs avec leurs objets)
     pose(c)              après la pose d'un chat (où il regarde…)
     fond(ctx, now)       sur le calque, derrière les chats          devant(ctx, now)   sur le calque, après les ondes
     grab(x, y)           une clé { mod: { drag(k, x, y), release(k, vx, vy) } } ou rien
     mode[nom](c, dt)     un chat dans un état à eux (accroché à un trait, dans un abri, pendu à un mot, aspiré…)
     envie(c)             un chat à la dérive se demande quoi faire : vrai si le module l'occupe
     trace                le doigt dans le vide : { debut(x, y), suite(x, y), fin() → vrai si c'était un dessin }
     entre(), retour()    on arrive dans l'espace, on en repart */
const X = { pas: [], pose: [], fond: [], devant: [], grab: [], mode: {}, envie: [], entre: [], retour: [], apres: [], trace: null };
// on arrive dans l'espace (après le trou, ou directement par la barre du bas)
function entre() {
  if (T) fin();
  if (Wd.espace) return;
  if (!theme0 || (window.THEME && THEME.color !== 'espace')) noir();
  Wd.espace = true; root.classList.add('espace'); taille();
  E.crache = Wd.t; E.flash = performance.now() / 1000; E.retourG = null; E.ondes.length = 0; E.pops.length = 0;
  Wd.props.forEach(it => { it.root.visible = false; });
  const id = ++E.boucle; requestAnimationFrame(() => boucleEspace(id));
  X.entre.forEach(f => f());
  if (window.Dex && Dex.vu) Dex.vu('decollage');
  // un visiteur rare emporté par le trou noir : une découverte (et son haut fait, js/hautsfaits.js)
  const R = Wd.cats.filter(c => c.rare && !c.gone);
  if (window.Dex && Dex.vu && R.length) { if (R.some(c => c.rare === 'geant')) Dex.vu('geantespace'); Dex.vu('rareespace'); }
}
// la taille d'un chat dans l'espace : tous à peu près pareils (c.s) ; sauf le géant, qui reste énorme (28/09, Mathieu : « si on déclenche
// le gros chat et qu'on clique pour aller dans l'espace, il devrait aller dans l'espace, c'est un haut fait »)
const taillEspace = c => c.rare === 'geant' ? Math.min(W, H) * 0.95 / c.b.s : Wd.s0 * 0.72 * clamp(c.b.s, 0.6, 1.5) / c.b.s;
// recrachés : tous du centre, chacun son tour, dans toutes les directions, en grandissant
function crache() {
  const [cx, cy] = centre(); let i = 0;
  Wd.cats.forEach(c => {
    if (c.gone) return; prepare(c); blanc(c);
    const a = rnd(0, TAU), v = rnd(200, 420) * Wd.s0 / 150;
    c.x = cx; c.y = cy; c.face = Math.cos(a) < 0 ? -1 : 1;
    c.sp = { vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rnd(-5, 5), m: 'crache', t: 0, dl: 0.25 + i++ * 0.16, g: 0, s: taillEspace(c), anim: 'chute', next: 0, bonk: -9, cal: -9, lache: -9 };
    // (le géant sort en dernier : le trou blanc a du mal à le recracher)
    if (c.rare === 'geant') { c.sp.dl += 1.2; c.sp.w = rnd(-1, 1); c.sp.vx *= 0.35; c.sp.vy *= 0.35; apres(2.4, () => { say(c, pick(['ça flotte !', 'hihi', 'oh…', 'coucou l’espace'])); Wd.shake = { t0: Wd.t, a: 6 }; }); }
    // mouvement réduit (le monde ne bouge pas) : déjà là, chacun à sa place, qui flotte
    if (reduit) { const S = c.sp; S.m = 'derive'; S.sorti = true; S.g = 1; S.anim = pick(DERIVE); c.s = S.s; c.x = rnd(0.15, 0.85) * W; c.y = rnd(0.3, 0.8) * H; c.spin = rnd(-0.6, 0.6); (ANIMS[S.anim] || ANIMS.assis)(c, c.cur, 0); c.tgt.set(c.cur); }
  });
  // (vague 196 de l'audit, originalité : « l'arrivée dans l'espace ») : le trou blanc se bouche. Le deuxième chat reste coincé dans le goulot,
  // à moitié sorti, qui gigote et pousse ; les autres s'entassent derrière (le trou gonfle) ; puis PLOP, il saute comme un bouchon de champagne,
  // et toute la file jaillit d'un coup derrière lui
  const F = Wd.cats.filter(c => !c.gone && c.sp && c.rare !== 'geant').sort((a, b) => a.sp.dl - b.sp.dl), B = !reduit && F.length >= 3 && F[1];
  E.bouchon = 0; E.bouchonD = 0;
  if (B) { const D = 1.4; E.bouchon = D; E.bouchonD = D; B.sp.bouchon = D; let j = 0;
    Wd.cats.forEach(c => { if (!c.gone && c.sp && c !== B && c.sp.dl > B.sp.dl) c.sp.dl = B.sp.dl + D + 0.04 + (c.rare === 'geant' ? 0.9 : j++ * 0.07); }); }
  E.crache = -1;
}
// les cordons du trou blanc (voir boucleEspace)
function cordons(now) {
  Wd.cats.forEach(c => { const S = c.sp; if (!S || c.gone || !S.sorti || S.cordonFini) return; const e = (S.t - S.dl) / 1.1; if (e < 0) return;
    if (e >= 1) { S.cordonFini = true; return; }
    const [ox, oy] = S.o || centre(), [bx, by] = centreDe(c), dx = bx - ox, dy = by - oy, L = Math.hypot(dx, dy); if (L < 4) return;
    const casse = 0.6, nx = -dy / L, ny = dx / L, epais = Math.max(5, Wd.s0 * 0.075) * (0.5 + 0.5 * Math.min(1, S.g * 2));
    // avant la rupture : tout le cordon ; après : le bout côté chat se rembobine vers lui, le bout côté trou rentre dans le trou
    const r = c01((e - casse) / (1 - casse)), rr = 1 - Math.pow(1 - r, 2.2);
    if (e >= casse && !S.schlok) { S.schlok = true; c.spin = (c.spin || 0) + (Math.random() < 0.5 ? -1 : 1) * rnd(2.5, 4.5); S.vx += dx / L * 60; S.vy += dy / L * 60;
      E.ondes.push({ x: ox + dx * 0.5, y: oy + dy * 0.5, t0: now, r: Wd.s0 * 0.5, a: 0.6 });
      if (Math.random() < 0.55) Wd.fx.push({ k: 'txt', text: pick(['schlok', 'tchak', 'pling', 'shlap']), x: ox + dx * 0.5 + nx * 18, y: oy + dy * 0.5 + ny * 18, t0: Wd.t, life: 0.7, rot: rnd(-0.3, 0.3), size: 16 });
      if (window.Dex && Dex.vu) Dex.vu('cordon'); }
    const segs = e < casse ? [[0, 1]] : [[0, 0.5 * (1 - rr)], [0.5 + 0.5 * rr, 1]];
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    segs.forEach(([a0, a1]) => { if (a1 - a0 < 0.01) return; const P = [], N = 26;
      for (let i = 0; i <= N; i++) { const t = a0 + (a1 - a0) * i / N, ond = Math.sin(t * 9 - now * 14 + c.x * 0.01) * epais * 0.9 * Math.sin(Math.PI * t) * (e < casse ? 1 : 1.6 - r);
        P.push([ox + dx * t + nx * ond, oy + dy * t + ny * ond, 0.45 + 0.55 * t]); }
      // un tube : le trait blanc dehors, la nuit dedans (comme les chats) ; plus épais côté chat
      for (const [col, extra] of [['#F4F4EE', 0], ['#05060a', -3.2]]) { ctx.strokeStyle = col;
        for (let i = 1; i < P.length; i++) { ctx.lineWidth = Math.max(0.6, epais * P[i][2] + extra); ctx.beginPath(); ctx.moveTo(P[i - 1][0], P[i - 1][1]); ctx.lineTo(P[i][0], P[i][1]); ctx.stroke(); } } });
    ctx.restore(); });
}
/* (vague 136 de l'audit : « l'arrivée dans l'espace », immersion) : SPLOTCH. À l'arrivée, un des chats recrachés, encore sonné, file droit vers
   nous : il grossit, grossit, et s'écrase contre la vitre de l'écran, les quatre pattes à plat (on voit les coussinets, la buée de son souffle) ;
   il glisse un peu vers le bas en couinant, se décolle et repart en tournoyant dans l'espace. Ses empreintes restent sur la vitre, puis
   rapetissent jusqu'à rien (rien ne s'efface). Une fois par voyage. */
const VI = { c: null, t0: 0, fait: false, k: 1, x0: 0, y0: 0, prints: [], tCord: -1 };
X.pas.push(() => {
  if (VI.fait || reduit || !Wd.espace) return;
  if (VI.tCord < 0) { if (Wd.cats.some(c => c.sp && c.sp.cordonFini)) VI.tCord = Wd.t; return; }
  if (Wd.t - VI.tCord < 0.9) return;
  const c = Wd.cats.filter(c => c.sp && c.sp.sorti && c.sp.m === 'derive' && !c.held && !c.gone && !c.rare).sort((a, b) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2))[0]; if (!c) return;
  VI.fait = true; VI.c = c; VI.t0 = Wd.t; VI.x0 = c.x; VI.y0 = c.y; VI.k = clamp(Math.min(W, H) * (W >= 760 ? 0.22 : 0.2) / Math.max(8, rayon(c)), 2.2, 6); c.sp.m = 'vitre'; c.spin = 0; c.sp.vx = c.sp.vy = 0;
});
X.mode.vitre = (c, dt) => {
  // (vague 230 de l'audit, design : écrasé au milieu de l'écran, le chat de la vitre cachait le titre en étoiles puis le dessin de la première scène) :
  // sur grand écran, il s'écrase sur le côté gauche de la vitre, à côté de la scène ; au téléphone, plus petit, en haut à gauche
  const S = c.sp, u = Wd.t - VI.t0, tx = W >= 760 ? W * 0.17 : W * 0.3, ty = H * (W >= 760 ? 0.5 : 0.24), ap = sm(c01(u / 0.9)), col = u >= 0.9 && u < 2.3, dec = sm(c01((u - 2.3) / 0.9));
  S.vitreK = 1 + (VI.k - 1) * ap * (1 - dec);
  c.anim = col ? 'etirement' : (ANIMS.apesanteur ? 'apesanteur' : 'assis'); c.at += dt;
  if (u < 0.9) { c.x = lerp2(VI.x0, tx, ap) + Math.sin(u * 20) * 3 * (1 - ap); c.y = lerp2(VI.y0, ty, ap); c.spin = (c.spin || 0) * 0.9; }
  else if (col) { const g = (u - 0.9) / 1.4; c.x = tx + Math.sin(u * 30) * 1.2; c.y = ty + g * g * H * 0.05; c.spin = 0;
    if (!S.splotch) { S.splotch = true; const r = rayon(c) * 1; VI.prints = [[-0.55, -0.25], [0.55, -0.25], [-0.32, 0.45], [0.32, 0.45]].map(([px, py], i) => ({ x: tx + px * r, y: ty + py * r - rayon(c) * 0.2, r: r * 0.16, t0: Wd.t + i * 0.04, rot: rnd(-0.3, 0.3) }));
      Wd.fx.push({ k: 'txt', text: 'SPLOTCH', x: tx, y: ty - rayon(c) * 1.05, t0: Wd.t, life: 1.2, rot: rnd(-0.12, 0.12), size: 30 }); if (window.Dex && Dex.vu) Dex.vu('splotch');
      apres(0.8, () => Wd.fx.push({ k: 'txt', text: pick(['iiiiik', 'couiiic', 'fiiiiii']), x: tx + rayon(c) * 0.9, y: ty + rayon(c) * 0.3, t0: Wd.t, life: 1, rot: 0.2, size: 18 })); } }
  else { c.x = tx + (VI.x0 - tx) * dec * 0.5; c.y = ty + H * 0.05 + (H * 0.08) * dec; c.spin = 2.5 * dec;
    if (u > 3.2) { S.vitreK = 0; S.m = 'derive'; S.vx = rnd(-30, 30); S.vy = rnd(-20, 10); S.next = Wd.t + rnd(1.5, 3); S.anim = pick(DERIVE); } }
};
const lerp2 = (a, b, t) => a + (b - a) * t;
// les empreintes sur la vitre : par-dessus tout (le calque de la craie) ; elles rapetissent jusqu'à rien, plus tard
K.H.draw.push(() => {
  if (!VI.prints.length || !window.Chalk || !Chalk.ctx) return; const o = Chalk.ctx;
  VI.prints = VI.prints.filter(p => Wd.t - p.t0 < 6); if (!Wd.espace) { VI.prints = []; return; }
  VI.prints.forEach(p => { const u = Wd.t - p.t0; if (u < 0) return; const k = Math.min(1, u / 0.08) * (1 - sm(c01((u - 4) / 2))), r = p.r * k; if (r < 0.5) return;
    o.save(); o.translate(p.x, p.y); o.rotate(p.rot); o.globalAlpha = 0.6; o.fillStyle = '#dfe6f2'; o.strokeStyle = '#F4F4EE'; o.lineWidth = 1.4;
    // le coussin (un triangle arrondi) et les quatre doigts
    o.beginPath(); o.ellipse(0, r * 0.55, r * 1.05, r * 0.8, 0, 0, TAU); o.fill(); o.globalAlpha = 0.9; o.stroke();
    [[-0.95, -0.45], [-0.35, -0.95], [0.35, -0.95], [0.95, -0.45]].forEach(([dx, dy]) => { o.globalAlpha = 0.6; o.beginPath(); o.ellipse(dx * r, dy * r, r * 0.34, r * 0.42, dx * 0.3, 0, TAU); o.fill(); o.globalAlpha = 0.9; o.stroke(); });
    o.restore(); });
});
// le monde de l'espace, une image (dans js/chats.js : le temps du monde)
// (vague 247 de l'audit, « chats en apesanteur », design : le plafond était fixé à 64 px, au milieu de la barre des chapitres : un chat qui dérivait
// vers le haut venait se poser sur les noms des chapitres) : le plafond, c'est le bas de la barre du haut, mesuré par les scènes
const HAUT = () => { const G = window.EspacePlume && EspacePlume.M && EspacePlume.M.lay && EspacePlume.M.lay.G; return Math.max(64, G && G.haut ? G.haut - 2 : 0); }, BAS = () => Wd.floor || H - 70;
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
    if (!c.held && c.sp.m !== 'crache' && c.sp.m !== 'nyan') { const [bx, by] = centreDe(c), r = rayon(c) * 0.9;
      const ox = bx - r < 0 ? -(bx - r) : bx + r > W ? W - (bx + r) : 0, oy = by - r < HAUT() ? HAUT() - (by - r) : by + r > BAS() ? BAS() - (by + r) : 0;
      if (ox || oy) { c.x += ox; c.y += oy; if (X.mode[c.sp.m] && Math.abs(ox) + Math.abs(oy) > r * 0.6) { c.sp.m = 'derive'; c.sp.ancre = null; c.sp.corps = null; c.sp.vx = ox * 3; c.sp.vy = oy * 3; } }
      // (vague 247 de l'audit, « chats en apesanteur », design : un chat mené par une scène, une liane ou la nuée traversait encore les sous-titres,
      // seuls les chats à la dérive y rebondissaient) : la vitre des sous-titres vaut pour tous ; poussé fort contre elle, il lâche et dérive
      const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande;
      if (bd && !['aspire', 'planete', 'cine', 'train'].includes(c.sp.m)) { const [bx2, by2] = centreDe(c), rb = r * (c.rare === 'interminable' ? 2.6 : 1.2);
        if (bx2 + rb > bd.x && bx2 - rb < bd.x + bd.w && by2 + rb > bd.y && by2 - rb < bd.y + bd.h) { const up = by2 + rb - bd.y, dn = bd.y + bd.h - (by2 - rb), py = up < dn ? -up : dn;
          c.y += py; if (X.mode[c.sp.m] && Math.abs(py) > r * 0.6) { c.sp.m = 'derive'; c.sp.ancre = null; c.sp.corps = null; c.sp.vx = (c.sp.vx || 0) * 0.5; c.sp.vy = Math.sign(py) * 90 * Wd.s0 / 150; } } } } });
  // (après tout le reste : ce qui doit avoir le dernier mot sur la place d'un chat, les murs des dessins)
  X.apres.forEach(f => f(dt, cats));
}
function flotte(c, dt, Q, acc) {
  const S = c.sp, k = sc(c); S.t += dt; c.at += dt;
  if (S.m === 'crache') {
    if (S.t < S.dl) { c.s = 0.001; return; }
    if (!S.sorti) { S.sorti = true; const [cx, cy] = S.o || centre(); c.x = cx; c.y = cy; E.ondes.push({ x: cx, y: cy, t0: performance.now() / 1000, r: Wd.s0 * 1.2, a: 0.7 }); if (Math.random() < 0.6) apres(0.4, () => say(c, pick(['wiii !', 'mia ?', 'ooh', 'où…', '!', 'c\'est où ?']))); }
    if (S.bouchon) { const u = S.t - S.dl, [cx, cy] = S.o || centre(), D = S.bouchon;
      if (u < D) { // coincé : à moitié sorti, il gigote, pousse, le trou le retient
        const e = sm(Math.min(1, u / 0.25)), tr = Math.sin(u * 34) * (0.4 + u / D);
        c.s = S.s * (0.25 + 0.5 * e + 0.06 * Math.sin(u * 17)); c.x = cx + tr * 3 + Math.cos(Math.atan2(S.vy, S.vx)) * Wd.s0 * 0.12 * e; c.y = cy + Math.sin(Math.atan2(S.vy, S.vx)) * Wd.s0 * 0.12 * e;
        c.spin = Math.sin(u * 23) * 0.35; c.anim = ANIMS.nage ? 'nage' : 'chute'; c.face = Math.cos(u * 5) < 0 ? -1 : 1;
        if (!S.coince && u > 0.3) { S.coince = true; say(c, pick(['coincé !', 'hnnng', 'ça bloque', 'au secours'])); Wd.fx.push({ k: 'txt', text: pick(['grr', 'hnn', 'gnnn']), x: cx + Wd.s0 * 0.5, y: cy - Wd.s0 * 0.5, t0: Wd.t, life: 0.8, rot: rnd(-0.3, 0.3), size: 15 }); }
        return; }
      // PLOP : le bouchon saute, lancé deux fois plus vite, en toupie
      S.bouchon = 0; E.bouchon = 0; S.dl += D; S.gMin = 0.75; S.vx *= 2.4; S.vy *= 2.4; c.spin = 0; S.w = (Math.random() < 0.5 ? -1 : 1) * rnd(6, 9);
      Wd.shake = { t0: Wd.t, a: 7 }; E.ondes.push({ x: cx, y: cy, t0: performance.now() / 1000, r: Wd.s0 * 2.4, a: 0.9 });
      Wd.fx.push({ k: 'txt', text: pick(['PLOP', 'POP', 'PLOC']), x: cx, y: cy - Wd.s0 * 0.7, t0: Wd.t, life: 1, rot: rnd(-0.25, 0.25), size: 30 });
      apres(0.5, () => say(c, pick(['wouhouu !', 'libre !', 'aaah', 'ouf'])));
    }
    S.g = sm((S.t - S.dl) / 0.6); c.s = S.s * Math.max(S.gMin || 0.02, S.g);
    if (S.g >= 1) { S.m = 'derive'; S.next = Wd.t + rnd(1.5, 4); S.anim = pick(DERIVE); }
  } else c.s += (S.s * (X.echelle ? X.echelle(c) : 1) * (X.loin ? X.loin(c) : 1) * (S.vitreK || 1) - c.s) * Math.min(1, dt * (S.vitreK ? 7 : 3));   // (S.vitreK : le chat qui vient s'écraser sur la vitre, plus bas)   // (X.echelle : un module qui les veut plus petits, js/espace-plume.js)
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
  const r = rayon(c), [bx, by] = centreDe(c), bord = (v, n) => { if (Math.abs(v) > 120 && Math.random() < 0.5) Wd.fx.push({ k: 'txt', text: pick(['bonk', 'toc', 'boing']), x: bx + n[0] * r, y: by + n[1] * r, t0: Wd.t, life: 0.9, rot: rnd(-0.2, 0.2), size: 15 }); S.w += rnd(-4, 4); if (Math.abs(v) > 160) S.bonk = Wd.t; if (Math.abs(v) > 70) cogneUI(bx + n[0] * r, by + n[1] * r, n, Math.abs(v)); };
  if (bx - r < 4 && S.vx < 0) { bord(S.vx, [-1, 0]); S.vx = -S.vx * 0.8; c.x += 4 - (bx - r); }
  if (bx + r > W - 4 && S.vx > 0) { bord(S.vx, [1, 0]); S.vx = -S.vx * 0.8; c.x -= bx + r - W + 4; }
  if (by - r < HAUT() && S.vy < 0) { bord(S.vy, [0, -1]); S.vy = -S.vy * 0.8; c.y += HAUT() - (by - r); }
  if (by + r > BAS() && S.vy > 0) { bord(S.vy, [0, 1]); S.vy = -S.vy * 0.8; c.y -= by + r - BAS(); }
  // (vague 61 de l'audit : un chat passait sur les sous-titres) : la légende est une vitre ; on y rebondit (« bonk »), on ne la traverse pas
  { const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande; const rb = r * (c.rare === 'interminable' ? 2.6 : 1.3);   // (le corps dépasse le rayon, surtout chez le chat interminable)
    if (bd && bx + rb > bd.x && bx - rb < bd.x + bd.w && by + rb > bd.y && by - rb < bd.y + bd.h) {
      const pen = [[bx + rb - bd.x, -1, 0], [bd.x + bd.w - (bx - rb), 1, 0], [by + rb - bd.y, 0, -1], [bd.y + bd.h - (by - rb), 0, 1]].sort((p, q) => p[0] - q[0])[0], [d, nx, ny] = pen;
      c.x += nx * d; c.y += ny * d; const vn = S.vx * nx + S.vy * ny; if (vn < 0) { bord(vn, [-nx, -ny]); S.vx -= 1.8 * vn * nx; S.vy -= 1.8 * vn * ny; } } }
  c.z = 8000 + c.id * 3;
}
// (vague 81, l'audit : « les chats en apesanteur ») : l'interface est dans l'espace avec eux. Un chat qui rebondit sur un bord de l'écran
// tout près d'un élément (le logo, la langue, les flèches, les boutons du bas) le cogne : l'élément est poussé, tangue et revient
let UIr = null, UIt = -9;
function cogneUI(x, y, n, v) {
  if (reduit) return; if (!UIr || Wd.t - UIt > 1) { UIt = Wd.t; UIr = [...document.querySelectorAll('#brand, #lang-pick, #theme-pick, .film-ui .ctrl > *, #chap > *, .nav-fleche, [class*="chevron"]')].map(e => ({ e, b: e.getBoundingClientRect() })).filter(q => q.b.width > 0); }
  const k = Math.min(1, v / 400);
  UIr.forEach(({ e, b }) => { const cx = Math.max(b.left, Math.min(x, b.right)), cy = Math.max(b.top, Math.min(y, b.bottom)), d = Math.hypot(cx - x, cy - y); if (d > 110) return;
    const f = (1 - d / 110) * k, dx = n[0] * 14 * f, dy = n[1] * 14 * f, rz = (n[0] ? n[0] * (cy < y ? -1 : 1) : n[1] * (cx < x ? 1 : -1)) * 12 * f;
    e.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${rz.toFixed(1)}deg) scale(${1 - 0.08 * f})`, offset: 0.18 },
      { transform: `translate(${(-dx * 0.4).toFixed(1)}px,${(-dy * 0.4).toFixed(1)}px) rotate(${(-rz * 0.5).toFixed(1)}deg)`, offset: 0.5 }, { transform: `rotate(${(rz * 0.2).toFixed(1)}deg)`, offset: 0.78 }, { transform: 'translate(0,0) rotate(0deg)' }],
      { duration: 700, easing: 'ease-out', composite: 'add' }); });
}
function agrippe(c, Q, acc) {
  // (Mathieu, 28/09 : « deux chats se superposent » : chacun sa place autour du curseur, en éventail, à une largeur de chat l'un de l'autre)
  const S = c.sp, pris = acc.map(o => o.sp.slot), n = [0, 1, 2, 3, 4, 5].find(i => !pris.includes(i)) ?? acc.length, k = Math.ceil(n / 2), sd = n % 2 ? 1 : -1, r = Math.max(rayon(c), Wd.s0 * 0.22);
  S.m = 'agrippe'; S.slot = n; S.ox = sd * k * r * 2.3; S.oy = k * r * 0.5; S.fin = Wd.t + rnd(6, 14); S.vx = S.vy = 0;
  acc.push(c); say(c, pick(['hop !', 'attrapé !', 'je te tiens', 'mia !'])); if (window.Dex && Dex.vu) Dex.vu('agrippe');
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
  if (c.doigt) { const D = E.doigt; E.doigt = null; const fait = D && X.trace ? X.trace.fin() : false; if (!fait && (!D || !D.loin)) { const x = D ? D.x : Wd.gx, y = D ? D.y : Wd.gy; onde(x, y); pop(x, y); } return; }
  if (!c.sp) return;
  if (!c.held) { c.sp.w += rnd(6, 10) * (Math.random() < 0.5 ? -1 : 1); c.sp.anim = 'chute'; c.sp.bonk = Wd.t - 1; say(c, pick(['wiii !', '♥', 'encore !', 'mrrr'])); return; }
  c.held = false; const S = c.sp; S.m = 'derive'; S.lache = Wd.t; S.next = Wd.t + rnd(3, 6); S.anim = 'chute';
  S.vx = clamp(vx || 0, -2200, 2200); S.vy = clamp(vy || 0, -2200, 2200); S.w = clamp((vx || 0) * 0.005, -9, 9) + rnd(-1, 1);
  if (Math.hypot(S.vx, S.vy) > 900) say(c, pick(['wiiiii !', 'aaaah', 'miaaa !']));
}
function click(x, y) { const c = K.catAt(x, y); if (c && c.sp) { release(c, 0, 0); return true; } onde(x, y); return true; }
// (28/09, Mathieu : « on doit pouvoir faire poper plus de chats, comme sur l'autre écran ») : un clic dans le vide ouvre un petit trou blanc,
// qui recrache un chat de plus (le même que sur l'écran 1 : pas plus que la pièce n'en tient)
function pop(x, y) {
  if (Wd.trou || RV || Wd.cats.filter(c => !c.gone).length >= K.MAXC) return;
  const c = K.addCat({ x }), a = rnd(0, TAU), v = rnd(140, 260) * Wd.s0 / 150; prepare(c); blanc(c); c.x = x; c.y = y; c.face = Math.cos(a) < 0 ? -1 : 1; c.stay = 1e9;
  c.sp = { vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rnd(-5, 5), m: 'crache', t: 0, dl: 0.18, o: [x, y], g: 0, s: Wd.s0 * 0.72 * clamp(c.b.s, 0.6, 1.5) / c.b.s, anim: 'chute', next: 0, bonk: -9, cal: -9, lache: -9 };
  E.pops.push({ x, y, t0: performance.now() / 1000 }); if (window.Dex && Dex.vu) Dex.vu('troublanc');
}
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
  const u = now - E.flash, [cx, cy] = centre(), n = Wd.cats.filter(c => !c.gone).length, dur = 1 + n * 0.16 + (E.bouchonD || 0);
  if (u < dur + 0.8) {
    // (il part du point de lumière où le trou noir s'est refermé, grandit, puis se resserre en un point : il ne s'allume ni ne s'éteint)
    const k = sm(u / 0.3) * (1 - sm((u - dur) / 0.8)), r = (Math.min(W, H) * (0.03 + 0.03 * Math.sin(u * 6) * k) * k + 6 * (1 - sm((u - dur) / 0.8))) * (E.bouchon ? 1.25 + 0.15 * Math.sin(u * 31) : 1);   // (bouché : il gonfle et tremble)
    ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = '#F4F4EE'; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + u * 0.8, L = r * (2 + (i % 3) * 0.7); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.stroke(); }
    // (vague 159, l'audit : « l'arrivée dans l'espace ») : ce n'était qu'une boule et des rayons. Le trou noir à l'envers a ses bras : quatre
    // spirales au stylo blanc qui se déroulent vers l'extérieur en tournant à l'opposé de l'aspiration, de plus en plus fines au bout
    // (elles s'enroulent et rentrent dans le point quand il se referme : rien ne s'efface)
    for (let b = 0; b < 4; b++) { const a0 = b * TAU / 4 - u * 2.4, P = 26, L2 = r * 4.2 * sm(u / 0.5);
      for (let i = 0; i < P; i++) { const e0 = i / P, e1 = (i + 1) / P, q0 = a0 + e0 * 2.6, q1 = a0 + e1 * 2.6, r0 = r * 1.2 + L2 * e0, r1 = r * 1.2 + L2 * e1;
        ctx.lineWidth = 2.6 * (1 - e0 * 0.85); ctx.beginPath(); ctx.moveTo(Math.cos(q0) * r0, Math.sin(q0) * r0 * 0.82); ctx.lineTo(Math.cos(q1) * r1, Math.sin(q1) * r1 * 0.82); ctx.stroke(); }
      const qe = a0 + 2.6, re = r * 1.2 + L2; if (L2 > 8) brille(ctx, Math.cos(qe) * re, Math.sin(qe) * re * 0.82, 2.2, 1, true, now, b); }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2); g.addColorStop(0, 'rgba(255,255,250,1)'); g.addColorStop(0.45, 'rgba(255,255,250,1)'); g.addColorStop(0.62, 'rgba(255,255,250,0.35)'); g.addColorStop(1, 'rgba(255,255,250,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, TAU); ctx.fill(); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // (vague 29, l'audit : « l'arrivée dans l'espace ») : le trou blanc, c'est le trou noir à l'envers. À son ouverture, une onde de choc
  // (deux anneaux au stylo) court jusqu'aux bords de l'écran ; une gerbe d'étincelles jaillit dans toutes les directions, avec sa traînée
  if (u < 2.2 && !reduit) { const D = Math.hypot(W, H) * 0.62;
    ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = '#F4F4EE'; ctx.lineCap = 'round';
    [0, 0.18].forEach((d0, j) => { const e = c01((u - d0) / 1.3); if (e <= 0 || e >= 1) return; const rr = D * (1 - Math.pow(1 - e, 2.4)); ctx.globalAlpha = (1 - e) * (j ? 0.45 : 0.8); ctx.lineWidth = (j ? 1.2 : 2.4) * (1 - e * 0.5);
      ctx.setLineDash(j ? [4, 9] : []); ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.82, 0, 0, TAU); ctx.stroke(); });
    ctx.setLineDash([]);
    if (!E.gerbe) E.gerbe = Array.from({ length: 70 }, (_, i) => ({ a: rnd(0, TAU), v: rnd(0.25, 1), d: rnd(0, 0.35), s: rnd(0.8, 2.4) }));
    E.gerbe.forEach(q => { const e = c01((u - q.d) / 1.5); if (e <= 0 || e >= 1) return; const f = 1 - Math.pow(1 - e, 3), rr = D * q.v * f, rq = D * q.v * (1 - Math.pow(1 - Math.max(0, e - 0.06), 3));
      const x = Math.cos(q.a) * rr, y = Math.sin(q.a) * rr * 0.82, xt = Math.cos(q.a) * rq, yt = Math.sin(q.a) * rq * 0.82;
      ctx.globalAlpha = 0.7 * (1 - e); ctx.lineWidth = q.s * 0.7; ctx.beginPath(); ctx.moveTo(xt, yt); ctx.lineTo(x, y); ctx.stroke(); brille(ctx, x, y, q.s, 1 - e, q.s > 2, now, q.a); });
    ctx.restore(); }
  else E.gerbe = null;
  // (vague 66) et ta souris revient : les grains de craie avalés avec elle ressortent du trou blanc, en spirale inverse,
  // et se rassemblent sur la pointe ; la flèche, encore étirée vers le trou, se rétracte d'un coup, et un petit anneau marque qu'elle est là
  const P = Wd.ptr;
  if (u < 1.9 && !reduit && P && P.on) {
    if (!E.retourG) E.retourG = Array.from({ length: W < 760 ? 60 : 110 }, () => ({ d: rnd(0.05, 0.9), sp: rnd(1.6, 3.2) * (Math.random() < 0.85 ? 1 : -1), w: rnd(0.8, 2), j: rnd(-1, 1) }));
    const dx = P.x - cx, dy = P.y - cy, D0 = Math.hypot(dx, dy), a0 = Math.atan2(dy, dx);
    ctx.save(); ctx.lineCap = 'round';
    E.retourG.forEach(q => { const e = c01((u - q.d) / 0.7); if (e <= 0 || e >= 1) return;
      const f = 1 - Math.pow(1 - e, 2.2), tour = q.sp * (1 - f), r = D0 * f + q.j * 14 * Math.sin(Math.PI * f), a = a0 + tour,
        x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * (0.82 + 0.18 * f), f2 = Math.max(0, f - 0.05), r2 = D0 * f2, a2 = a0 + q.sp * (1 - f2),
        x2 = cx + Math.cos(a2) * r2, y2 = cy + Math.sin(a2) * r2 * (0.82 + 0.18 * f2);
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.strokeStyle = '#F4F4EE'; ctx.globalAlpha = 0.85; ctx.lineWidth = q.w; ctx.stroke(); });
    // la flèche : étirée vers le trou blanc, elle se rétracte à mesure que ses grains arrivent
    const e = c01((u - 0.3) / 1.2), L = 18 * (1 + 7 * Math.pow(1 - e, 2)), ang = Math.atan2(cy - P.y, cx - P.x);
    if (u > 0.25) { ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(ang); ctx.lineJoin = 'round'; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(L, -3.5 * (0.5 + 0.5 * e)); ctx.lineTo(L * 0.72, 0); ctx.lineTo(L, 3.5 * (0.5 + 0.5 * e)); ctx.closePath();
      ctx.strokeStyle = '#F4F4EE'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); }
    // arrivée : un anneau au stylo qui s'élargit autour de la pointe (et rétrécit, sans s'effacer)
    const k = c01((u - 1.35) / 0.5); if (k > 0 && k < 1) { ctx.globalAlpha = 0.9; ctx.strokeStyle = '#F4F4EE'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(P.x, P.y, 26 * Math.sin(Math.PI * k), 0, TAU); ctx.stroke(); }
    ctx.restore();
  } else if (u >= 1.9) E.retourG = null;
  // (vague 118, l'audit : « l'arrivée dans l'espace ») : le trou blanc ne les lâche pas comme ça. Chaque chat sort au bout d'un cordon d'espace-temps,
  // un tube au trait blanc qui ondule et s'étire derrière lui ; trop tendu, il cède (« schlok ») : la moitié côté trou se rembobine dans le chat,
  // qui en prend un petit coup et tournoie ; l'autre bout claque dans le trou. Rien ne s'efface : le tube raccourcit jusqu'à rien.
  if (!reduit) cordons(now);
  // les petits trous blancs d'un clic : ils s'ouvrent en un point, recrachent un chat, et se referment en un point
  E.pops = E.pops.filter(o => now - o.t0 < 0.75);
  E.pops.forEach(o => { const u = (now - o.t0) / 0.75, k = Math.sin(Math.PI * Math.min(1, u)), r = Wd.s0 * 0.16 * k + 1.5;
    ctx.save(); ctx.translate(o.x, o.y); ctx.strokeStyle = '#F4F4EE'; ctx.lineCap = 'round'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + u * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); ctx.lineTo(Math.cos(a) * r * (2 + (i % 2) * 0.6), Math.sin(a) * r * (2 + (i % 2) * 0.6)); ctx.stroke(); }
    brille(ctx, 0, 0, r * 0.9, 1, false, now, 0); ctx.globalAlpha = 1; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.restore(); });
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
  // (vague 183 de l'audit : « le retour par la planète chat ») : plus de glissement de couleurs d'une seconde au retour : la pièce, découverte par
  // le disque qui s'ouvre, passait par un gris boueux mi-nuit mi-papier ; elle est tout de suite à ses couleurs, c'est le disque qui fait la transition
  if (theme0 && window.THEME) THEME.set(theme0, true); theme0 = null;
  E.doigt = null;
  if (!doux) { X.retour.forEach(f => f()); tombe(); return; }
  // la sortie : chaque chose part du centre du passage, et se déroule jusqu'à sa place
  const cx = o ? o.x : W / 2, cy = o ? o.y : H * 0.47, R = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, H - cy)), items = [];
  const add = (it, x, y, s, chat) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); items.push({ o: it, chat, x, y, s, r0: r, a0: Math.atan2(dy, dx), dl: 0.12 + 0.4 * clamp(r / R, 0, 1) + rnd(0, 0.08), rot: rnd(4, 8) * (Math.random() < 0.8 ? 1 : -1), tilt: it.tilt || 0 }); };
  Wd.props.forEach(it => { if (it.gone || it.fadeT === 0) return; const s = K.sOf(it.d) * (it.big || 1); if (it.tilt0 != null) it.tilt = it.tilt0; it.root.visible = true; add(it, it.fx * Wd.W, K.floorAt(it.d) - it.lift, s, false); });
  Wd.cats.forEach(c => { if (c.gone) return; prepare(c); c.held = false; c.d = c.rare === 'geant' ? 0.02 : rnd(0.05, 0.6); c.sK = null; const s = K.sOf(c.d); add(c, rnd(0.12, 0.88) * Wd.W, K.floorAt(c.d) - s * rnd(0.3, 0.9), s, true); });
  rarerepart();
  RV = { t0: performance.now() / 1000, cx, cy, R: Math.hypot(W, H), items, o, couches: couches(), fond: o && o.dessine };
  root.classList.add('sortie');
  const id = ++E.boucle; requestAnimationFrame(() => boucleSortie(id));
}
// les chats retombent du ciel (sans passage : mouvement réduit, ou la barre du bas pendant l'aspiration)
function tombe() {
  Wd.props.forEach(it => { if (it.tilt0 != null) it.tilt = it.tilt0; it.fade = 0; it.fadeT = 1; });
  Wd.cats.forEach((c, i) => { if (c.gone) return; encre(c); prepare(c); c.held = false;
    c.d = c.rare === 'geant' ? 0.02 : rnd(0.05, 0.6); c.sK = null; c.s = K.sOf(c.d); c.x = rnd(0.12, 0.88) * Wd.W; c.y = -sc(c) * rnd(1.2, 3) - i * 30; c.fall = true; c.vx = rnd(-60, 60); c.vy = 0; c.spin = rnd(-3, 3); c.z = K.zOf(c.d);
    if (Math.random() < 0.5) K.later(0.4 + i * 0.2, () => say(c, pick(['on est rentrés !', 'mia !', 'ouf', 'encore !']))); });
  Wd.nextIn = Wd.t + rnd(8, 14); Wd.nextScen = Wd.t + rnd(20, 30); Wd.nextKib = Wd.t + rnd(10, 20);
  rarerepart();
}
// revenus dans la pièce, les visiteurs rares reprennent leur route : le géant roule jusqu'à l'autre bout, les autres s'en vont en courant
function rarerepart() {
  const va = c => { if (!c.rare || c.gone || !Wd.cats.includes(c) || c.held) return; if (c.fall || Wd.espace || RV) { K.later(0.8, () => va(c)); return; } K.interrupt(c);
    const dir = c.x < Wd.W / 2 ? -1 : 1;
    if (c.rare === 'geant') { const Rb = sc(c) * 0.36; c.q = [{ k: 'rouleau', dir: -dir, Rb, air: true }, K.fn(c => { c.gone = true; })]; say(c, pick(['on repart !', 'hihi'])); }
    else c.q = [K.go(dir < 0 ? -sc(c) * 2 : Wd.W + sc(c) * 2, { g: 'galop' }), K.fn(c => { c.gone = true; })]; };
  K.later(2.5, () => Wd.cats.forEach(va));
}
// une image de la sortie (le temps du monde) : le contraire de l'aspiration, en partant du passage
function sortant(dt) {
  if (!RV) return; minuteur();
  const u = (performance.now() / 1000 - RV.t0) / DS;
  RV.items.forEach(m => {
    const e = 1 - ease((u - m.dl) / 0.42), f = Math.pow(1 - e, 1.15), r = m.r0 * f, a = m.a0 - (e * 2.2 + e * e * 5);
    // (vague 6, l'audit : « le retour des objets est un peu mécanique ») : chacun décrit un bond au-dessus de sa place, un peu plus gros
    // au sommet, et atterrit pour de vrai : poussière, un mot, il tangue (les lourds font trembler la pièce)
    const pr = 1 - e, bond = Math.sin(Math.PI * Math.min(1, pr * 1.15)) * m.s * (m.chat ? 0.5 : K.LOURD[m.o.kind] ? 0.45 : 0.9) * (pr > 0 ? 1 : 0);
    const x = RV.cx + Math.cos(a) * r, y = RV.cy + Math.sin(a) * r * (1 - 0.18 * e) - bond;
    const o = m.o, rot = e * e * m.rot, pas = u < m.dl;
    if (!m.chat && !m.pose && !pas && pr >= 0.999) { m.pose = true; const sol = K.floorAt(o.d); K.dust(m.x, sol, m.s * 0.4, 0.8); o.wob = Wd.t; o.wobA = K.LOURD[o.kind] ? 0.9 : 0.5;
      if (K.LOURD[o.kind]) Wd.shake = { t0: Wd.t, a: 2.5 }; if (Math.random() < 0.45) Wd.fx.push({ k: 'txt', text: pick(K.LOURD[o.kind] ? ['BOUM', 'boum'] : ['toc', 'ploc', 'pop', 'tac']), x: m.x, y: sol - m.s * 0.6, t0: Wd.t, life: 1, rot: rnd(-0.2, 0.2), size: 16 }); }
    if (m.chat) {
      const c = o; c.at += dt; c.anim = e > 0.05 ? 'chute' : 'sursaut' in ANIMS ? 'sursaut' : 'assis'; teinte(c, sm((e - 0.1) / 0.6));
      c.s = Math.max(0.001, m.s * f); c.spin = rot; c.x = x; c.y = y; c.z = K.zOf(c.d);
      (ANIMS[c.anim] || ANIMS.assis)(c, c.tgt, c.at); Chat.step(c, dt, { a: Wd.a * (pas ? 0 : 1) });
    } else {
      o.x = x; o.y = y; o.s = Math.max(0.001, m.s * f * (1 + 0.12 * Math.sin(Math.PI * pr))); o.tilt = m.tilt + rot; o.a = pas ? 0 : Wd.a; o.fade = o.fadeT = 1; Univers.place(o);
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
  fondNoir(1); cielEtoile(1, now);
  // (vague 67) on plonge dans le passage : les étoiles filent en traits vers les bords (la vitesse lumière), d'autant plus longs
  // que la plongée est rapide ; elles naissent près du passage et partent, le passage les découpe (il est dessiné par-dessus)
  if (!reduit) { if (!RV.ws) RV.ws = Array.from({ length: W < 760 ? 120 : 220 }, () => ({ a: rnd(0, TAU), r0: rnd(0, 1), w: rnd(0.6, 1.8), v: rnd(0.7, 1.3) }));
    const v = Math.sin(Math.PI * c01(u / 0.7)), Rm = RV.R;
    ctx.save(); ctx.strokeStyle = '#F4F4EE'; ctx.lineCap = 'round';
    RV.ws.forEach(q => { const f = (q.r0 + u * 1.6 * q.v) % 1, r = 20 + Rm * f * f, L = v * r * 0.45 * q.v; if (L < 1) return;
      const c = Math.cos(q.a), s2 = Math.sin(q.a); ctx.globalAlpha = 0.35 + 0.5 * f; ctx.lineWidth = q.w * (0.6 + f);
      ctx.beginPath(); ctx.moveTo(RV.cx + c * r, RV.cy + s2 * r); ctx.lineTo(RV.cx + c * (r + L), RV.cy + s2 * (r + L)); ctx.stroke(); });
    ctx.restore(); }
  X.fond.forEach(f => f(ctx, now));
  // le menu, le cadre : ils sortent du passage en se déroulant
  RV.couches.forEach(({ el, r }) => { const e = 1 - easeIn(c01((u - 0.3) / 0.5)); el.style.transformOrigin = `${RV.cx - r.left}px ${RV.cy - r.top}px`;
    el.style.transform = e > 0.001 ? `rotate(${-(e * 2.2 + e * e * 5) * 57.3}deg) scale(${Math.max(0.001, Math.pow(1 - e, 1.3))})` : ''; });
  if (RV.fond) RV.fond(ctx, z, now);   // la planète des chats : elle grandit, son disque devient le passage (js/espace-planetes.js)
  else {
    const rr = 4 + z * RV.R, ink = melange([244, 244, 238], rgb((window.THEME && THEME.ink) || '34,36,40'), sm(z / 0.5));
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(RV.cx, RV.cy, rr, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = `rgb(${ink})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(RV.cx, RV.cy, rr, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(RV.cx, RV.cy, rr * 0.94 + 2, 0, TAU); ctx.stroke(); ctx.restore();
  }
  // (vague 30, l'audit : « le retour ») : l'espace ne s'efface pas autour du passage, il se casse : à mesure que le bord avance, des éclats
  // du ciel noir (chacun avec son étoile) s'en détachent et sont projetés vers les bords de l'écran en tournoyant
  if (!reduit) { if (!RV.ec) RV.ec = Array.from({ length: W < 760 ? 26 : 44 }, () => ({ a: rnd(0, TAU), z0: rnd(0.04, 0.75), s: rnd(10, 30) * Math.min(1.4, Math.max(0.7, W / 1100)), sp: rnd(-9, 9), v: rnd(0.5, 1.1), P: Array.from({ length: 7 }, (_, j) => [j / 7 * TAU + rnd(-0.25, 0.25), rnd(0.55, 1.05)]) }));
    const Rm = RV.R * 1.02;
    RV.ec.forEach(q => { if (z < q.z0) return; const d = (u - q.z0 * 0.62) * DS, r = 4 + q.z0 * Rm + d * q.v * Math.hypot(W, H) * 0.55, x = RV.cx + Math.cos(q.a) * r, y = RV.cy + Math.sin(q.a) * r;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return; const sc2 = 1 + d * 0.8;
      ctx.save(); ctx.translate(x, y); ctx.rotate(q.sp * d); ctx.scale(sc2 * Math.cos(d * 4 + q.a), sc2); ctx.beginPath(); q.P.forEach(([b, k], j) => { const px = Math.cos(b) * q.s * k, py = Math.sin(b) * q.s * k; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
      ctx.fillStyle = '#0b0d12'; ctx.fill(); ctx.strokeStyle = '#F4F4EE'; ctx.lineWidth = 1.3 / sc2; ctx.lineJoin = 'round'; ctx.stroke(); brille(ctx, 0, 0, 1.6, 0.9, q.s > 22, now, q.a); ctx.restore(); }); }
  X.devant.forEach(f => f(ctx, now));
  requestAnimationFrame(() => boucleSortie(id));
}

Wd.ail = { on: () => !!(Wd.trou || Wd.espace || RV), step: dt => (Wd.trou ? aspiration(dt) : RV ? sortant(dt) : espace(dt)), draw() {}, click: (x, y) => RV ? true : click(x, y), grab: (x, y) => RV ? null : grab(x, y), drag, release };
// pour les modules de l'espace
/* (vague 27, l'audit : « les chats en apesanteur ») : dans le vide, un chat qui nage laisse un sillage de poussière d'étoiles ;
   et quand des chats flottent près les uns des autres, des pointillés les relient : ils forment une constellation, qui a son nom
   (à trois ou plus : « la Grande Minette », « Minou Major »…), écrit à la main à côté, tant qu'ils restent ensemble */
const NOMS_C = () => (window.I18N && I18N.lang && I18N.lang !== 'fr') ? ['Ursa Meow', 'the Great Cat', 'Minor Kitten', 'the Yarn Ball', 'Puss in Boots', 'the Whiskers'] : ['la Grande Minette', 'Minou Major', 'le Petit Matou', 'la Pelote', 'le Chat Botté', 'les Moustaches'];
const NOM_T = {};   // (quand chaque constellation a pris forme : son nom s'écrit à partir de là)
X.fond.push((c2, now) => {
  if (reduit) return;
  const L = Wd.cats.filter(c => !c.gone && c.sp && c.sp.m !== 'crache' && c.s > 0.01);
  c2.save(); c2.lineCap = 'round'; c2.fillStyle = c2.strokeStyle = '#F4F4EE';
  // le sillage : des points qui restent là où il est passé, de plus en plus petits
  L.forEach(c => { const [x, y] = centreDe(c), h = c.sill || (c.sill = []);
    if (!h.length || Math.hypot(h[h.length - 1][0] - x, h[h.length - 1][1] - y) > 7) { h.push([x, y, now]); if (h.length > 26) h.shift(); }
    for (let i = h.length - 1; i >= 0; i--) { const u = (now - h[i][2]) / 1.4; if (u >= 1) { h.splice(0, i + 1); break; }
      const r = (1 - u) * 1.8 * (0.6 + 0.4 * Math.sin(i * 2.3 + now * 6)); c2.globalAlpha = 0.55; c2.beginPath(); c2.arc(h[i][0] + Math.sin(i * 1.7) * 3 * u, h[i][1] + Math.cos(i * 2.1) * 3 * u, Math.max(0.3, r), 0, TAU); c2.fill(); } });
  // les constellations : les paires proches, en pointillés ; les groupes, par voisinage
  const P = L.map(centreDe), n = L.length, par = L.map((_, i) => i), f = i => par[i] === i ? i : (par[i] = f(par[i]));
  const bd = window.EspacePlume && EspacePlume.M && EspacePlume.M.bande, dansBande = q => bd && q[0] > bd.x - 20 && q[0] < bd.x + bd.w + 20 && q[1] > bd.y - 20 && q[1] < bd.y + bd.h + 20;
  c2.setLineDash([3, 5]); c2.lineWidth = 1.5;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]), lim = (rayon(L[i]) + rayon(L[j])) * 3.2; if (d > lim || L[i].rare === 'geant' || L[j].rare === 'geant' || dansBande(P[i]) || dansBande(P[j])) continue;
    const k = sm((lim - d) / (lim * 0.35));
    // (vague 48, l'audit : « l'apesanteur », finition) : le pointillé part du bord de chaque chat (plus caché sous lui), et s'accroche à une petite
    // étoile de chaque côté, comme les traits d'une vraie carte du ciel ; il se tend depuis le milieu quand la paire se forme
    const ux = (P[j][0] - P[i][0]) / (d || 1), uy = (P[j][1] - P[i][1]) / (d || 1), ri = rayon(L[i]) * 0.85, rj = rayon(L[j]) * 0.85; if (d > ri + rj + 8) {
      const a0 = [P[i][0] + ux * ri, P[i][1] + uy * ri], a1 = [P[j][0] - ux * rj, P[j][1] - uy * rj], mx = (a0[0] + a1[0]) / 2, my = (a0[1] + a1[1]) / 2, e = Math.min(1, k * 1.4);
      c2.globalAlpha = 0.75; c2.lineDashOffset = -now * 12; c2.beginPath(); c2.moveTo(mx + (a0[0] - mx) * e, my + (a0[1] - my) * e); c2.lineTo(mx + (a1[0] - mx) * e, my + (a1[1] - my) * e); c2.stroke();
      if (e >= 1) { c2.setLineDash([]); brille(c2, a0[0], a0[1], 2, 0.9, true, now, i); brille(c2, a1[0], a1[1], 2, 0.9, true, now, j); c2.setLineDash([3, 5]); } }
    if (k > 0.3) par[f(i)] = f(j); }
  c2.setLineDash([]);
  const G2 = {}; for (let i = 0; i < n; i++) (G2[f(i)] = G2[f(i)] || []).push(i);
  const vus = new Set(); Object.values(G2).filter(g => g.length >= 3).forEach(g => { vus.add(Math.min(...g.map(i => Wd.cats.indexOf(L[i])))); const id = Math.min(...g.map(i => Wd.cats.indexOf(L[i]))), nom = NOMS_C()[id % 6];
    const cx = g.reduce((s, i) => s + P[i][0], 0) / g.length, cy = Math.min(...g.map(i => P[i][1])) - Math.max(...g.map(i => rayon(L[i]))) * 1.3;
    if (bd && cy > bd.y - 24 && cx > bd.x - 40 && cx < bd.x + bd.w + 40) return;
    // (le nom s'écrit, lettre après lettre ; l'étoile s'allume au bout quand il est fini)
    const T0 = NOM_T[id] ?? (NOM_T[id] = now), vu = Math.min(nom.length, Math.floor((now - T0) * 14)); c2.globalAlpha = 0.75; c2.font = 'italic 15px "Caveat","Segoe Print",cursive'; c2.textAlign = 'left';
    const wN = c2.measureText(nom).width; c2.fillText(nom.slice(0, vu), cx - wN / 2, cy); c2.textAlign = 'center'; if (vu >= nom.length) brille(c2, cx + c2.measureText(nom).width / 2 + 8, cy - 5, 2.2, 0.8, true, now, id); });
  Object.keys(NOM_T).forEach(id => { if (!vus.has(+id)) delete NOM_T[id]; });
  c2.restore();
});
const outils = { X, E, K, brille, sortie, melange, rgb, centre, centreDe, rayon, apres, onde, lache, say, BLANC, HAUT, BAS, DERIVE, get W() { return W; }, get H() { return H; }, get ctx() { return ctx; } };
return { aspire, entre, retour, outils, get espace() { return !!Wd.espace; }, get actif() { return !!(Wd.trou || Wd.espace || RV); }, get trou() { return !!T; }, get depuis() { return performance.now() / 1000 - finSortie; } };
})();
