/* Dans l'espace (l'écran 2) : les compétences de Mathieu s'écrivent toutes seules, au stylo blanc, en constellations
   (28/09, Mathieu : « vire le texte sur l'étape deux, on doit sur cette étape présenter mes compétences […] tu dois mettre beaucoup
   en avant mes compétences liées à l'IA » ; avant : « toute ma présentation va se dessiner comme l'effet qu'on a au clic et drag »).
   - Au milieu, en grand : la constellation de l'IA, un réseau d'étoiles reliées au cœur, où courent des influx de lumière.
   - Autour, plus petites : le front, le back, le DevOps, le pilotage et la sécurité.
   - Chaque nom est tracé contour après contour par une pointe de stylo ; son étoile s'allume quand le stylo y arrive, puis les liens se tirent.
   - Survoler (ou toucher) une compétence écrit sa preuve dessous, tirée du CV ; on s'en va, le stylo la gomme.
   - Les mots sont des choses : un chat qui passe les bouscule (ils tanguent et reviennent à leur place, sur un ressort),
     un chat s'y accroche et pend en dessous (le mot ploie sous son poids), l'onde d'un clic les secoue, on peut les attraper et les lancer.
   - Tout vient du CV et du profil LinkedIn de Mathieu (28/09) : ne rien ajouter qui n'y soit pas. */
window.EspacePlume = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, rnd, pick, clamp, sgn, sm } = K;
const TAU = Math.PI * 2, BL = '244,244,238';
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const en = () => !!(window.I18N && I18N.lang && I18N.lang !== 'fr');
// les compétences : [nom, preuve] ; les preuves viennent du CV (28/09)
const DONNEES = () => en() ? {
  nom: 'Mathieu Woroniecki', role: 'Senior tech lead & AI architect',
  ia: ['AI', 'CTO of MARKO, an AI-native B2B SaaS for real estate'],
  noeuds: [['LLM', 'HUman (areweai.dev): what if we were the biggest LLM?'], ['RAG', 'LLMs and RAG in the dev cycle: +35% productivity'],
    ['AI agents', 'Agentic AI at the core of MARKO'], ['Generative AI', 'Led generative AI adoption at LWA'], ['Document AI', 'Document AI and data extraction at MARKO'],
    ['Prompt engineering', 'MARKO: generative AI, LLM/RAG, prompt engineering'], ['MCP', 'MCP to speed up the Figma-to-code flow'],
    ['Qdrant', 'Qdrant: a vector database for RAG'], ['Automation', 'Workflow automation at MARKO']],
  groupes: [
    ['Front', 'Vue/Nuxt architecture for Hermès, Chanel, Ardian', ['Vue · Nuxt', 'React · Next', 'TypeScript', 'Animation']],
    ['Back', 'The MARKO API: FastAPI and PostgreSQL', ['Python · FastAPI', 'PHP · Symfony', 'Node.js', 'PostgreSQL']],
    ['Lead', 'Tech lead of Digiplace: 150,000+ users (ENGIE)', ['Tech lead', 'Team', 'Agile', 'OWASP · WCAG']],
    ['DevOps', '15+ projects moved to Docker (LWA)', ['Docker', 'CI/CD', 'Azure · AWS']]]
} : {
  nom: 'Mathieu Woroniecki', role: 'Responsable technique senior & architecte IA',
  ia: ['IA', 'CTO de MARKO, un SaaS B2B AI-native pour l’immobilier'],
  noeuds: [['LLM', 'HUman (areweai.dev) : et si nous étions le plus grand LLM ?'], ['RAG', 'LLM et RAG dans le cycle de dev : +35 % de productivité'],
    ['Agents IA', 'Agentic AI au cœur de MARKO'], ['IA générative', 'Initiateur de l’adoption de l’IA générative chez LWA'], ['Document AI', 'Document AI et extraction de données chez MARKO'],
    ['Prompt engineering', 'MARKO : IA générative, LLM/RAG, prompt engineering'], ['MCP', 'MCP pour accélérer le flux Figma → code'],
    ['Qdrant', 'Qdrant : une base vectorielle pour le RAG'], ['Automatisation', 'Workflow automation chez MARKO']],
  groupes: [
    ['Front', 'Architecture Vue/Nuxt pour Hermès, Chanel, Ardian', ['Vue · Nuxt', 'React · Next', 'TypeScript', 'Animation']],
    ['Back', 'L’API de MARKO : FastAPI et PostgreSQL', ['Python · FastAPI', 'PHP · Symfony', 'Node.js', 'PostgreSQL']],
    ['Pilotage', 'Tech lead de Digiplace : 150 000+ collaborateurs (ENGIE)', ['Tech lead', 'Équipe', 'Agile', 'OWASP · RGAA']],
    ['DevOps', '15+ projets passés sous Docker (LWA)', ['Docker', 'CI/CD', 'Azure · AWS']]]
};

/* ——— le contour des lettres : on écrit le mot en blanc sur une petite toile, puis on suit le bord de l'encre (les carrés qui marchent) ——— */
const toile = document.createElement('canvas'), tx = toile.getContext('2d', { willReadFrequently: true });
function contours(txt, font, px) {
  const q = 2; tx.font = font; const w = Math.ceil(tx.measureText(txt).width + px * 0.6), h = Math.ceil(px * 1.7), W = w * q, H = h * q;
  toile.width = W; toile.height = H; tx.setTransform(q, 0, 0, q, 0, 0); tx.clearRect(0, 0, w, h);
  tx.font = font; tx.fillStyle = '#fff'; tx.textBaseline = 'alphabetic'; tx.fillText(txt, px * 0.3, px * 1.2);
  const d = tx.getImageData(0, 0, W, H).data, A = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(y * W + x) * 4 + 3] > 110 ? 1 : 0;
  // chaque bord de case traversé par le contour est un point ; deux points par case (quatre dans les cols) ; puis on les enchaîne
  const W2 = W + 2, adj = new Map(), pos = new Map();
  const lie = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
    const k = A(x, y) * 8 + A(x + 1, y) * 4 + A(x + 1, y + 1) * 2 + A(x, y + 1); if (!k || k === 15) continue;
    const T = ((y + 1) * W2 + x + 1) * 2, B = ((y + 2) * W2 + x + 1) * 2, L = ((y + 1) * W2 + x + 1) * 2 + 1, R = ((y + 1) * W2 + x + 2) * 2 + 1;
    pos.set(T, [x + 0.5, y]); pos.set(B, [x + 0.5, y + 1]); pos.set(L, [x, y + 0.5]); pos.set(R, [x + 1, y + 0.5]);
    const S = { 1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[T, R]], 5: [[T, R], [L, B]], 6: [[T, B]], 7: [[T, L]], 8: [[T, L]], 9: [[T, B]], 10: [[T, L], [R, B]], 11: [[T, R]], 12: [[L, R]], 13: [[R, B]], 14: [[L, B]] }[k];
    S.forEach(([a, b]) => lie(a, b));
  }
  const vu = new Set(), boucles = [];
  for (const k0 of adj.keys()) {
    if (vu.has(k0)) continue; const P = []; let prev = -1, k = k0;
    while (k != null && !vu.has(k)) { vu.add(k); const p = pos.get(k); P.push([p[0] / q, p[1] / q]); const n = adj.get(k), nx = n.find(v => v !== prev && !vu.has(v)); prev = k; k = nx; }
    if (P.length > 6) boucles.push(lisse(rdp(P, 0.35)));
  }
  // l'ordre d'un stylo : de gauche à droite, le contour extérieur avant le trou de la lettre ; chacun commence en haut à gauche
  boucles.forEach(b => { b.x0 = Math.min(...b.map(p => p[0])); b.aire = Math.abs(aire(b)); let i0 = 0; b.forEach((p, i) => { if (p[0] + p[1] < b[i0][0] + b[i0][1]) i0 = i; }); b.push(...b.splice(0, i0)); b.push(b[0]); });
  boucles.sort((a, b) => Math.abs(a.x0 - b.x0) < px * 0.12 ? b.aire - a.aire : a.x0 - b.x0);
  return { boucles, w, h, y0: px * 1.2 };
}
function rdp(P, e) {
  if (P.length < 3) return P; const a = P[0], b = P[P.length - 1]; let im = 0, dm = 0;
  for (let i = 1; i < P.length - 1; i++) { const p = P[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, dd = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L; if (dd > dm) { dm = dd; im = i; } }
  return dm > e ? rdp(P.slice(0, im + 1), e).slice(0, -1).concat(rdp(P.slice(im), e)) : [a, b];
}
const lisse = P => { const Q = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; Q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } return Q; };
const aire = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const long = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };

/* ——— la mise en page : chaque nom a sa place (hx, hy), ses contours, son étoile, son heure d'écriture ; les liens entre étoiles ——— */
let M = null;   // { mots, liens, preuves, planete, t0, fin, W, H, total }
// le nom : la police du grand titre de l'écran 1 ; le reste : l'écriture à la main (--hand)
const police = (px, titre) => { const h1 = titre && document.querySelector('h1[data-title]'), cs = h1 && getComputedStyle(h1);
  return cs ? `${cs.fontWeight} ${px}px ${cs.fontFamily}` : `400 ${px}px ${getComputedStyle(document.documentElement).getPropertyValue('--hand').trim() || 'cursive'}`; };
const largeur = (txt, font) => { tx.font = font; return tx.measureText(txt).width; };
// (le haut de la Terre, comme js/espace-planetes.js la pose : on n'écrit pas dessous)
const hautTerre = () => { const H = O.H, h = clamp(H * 0.13, 60, 130); return O.BAS() - h + 18; };
function compose(t0) {
  const W = O.W, H = O.H, D = DONNEES(), L = W >= 760, px = L ? (W < 1000 ? 17 : 20) : 15, pt = px * (L ? 1.9 : 1.75), mots = [], liens = [], preuves = [];
  // un nom, posé : al = 'g' (il part de x), 'd' (il finit à x), 'c' (centré sur x) ; y = le milieu de ses lettres
  const mk = (txt, taille, titre, x, y, al, et, eR) => {
    let font = police(taille, titre), tw = largeur(txt, font);
    if (tw > W - 24) { taille *= (W - 24) / tw; font = police(taille, titre); tw = largeur(txt, font); }
    const C = contours(txt, font, taille), hx = (al === 'g' ? x : al === 'd' ? x - tw : x - tw / 2) - taille * 0.3, hy = y - C.y0 + taille * 0.35;
    const m = { txt, titre, px: taille, boucles: C.boucles, w: C.w, h: C.h, hx, hy, cx: C.w / 2, cy: C.h / 2, dx: 0, dy: 0, vx: 0, vy: 0, a: 0, va: 0, poids: 0, tenu: false, survol: 0 };
    if (et) { m.et = [et[0] - hx, et[1] - hy]; m.eR = eR; }
    mots.push(m); return m;
  };
  const preuve = (txt, x, y, al, zone) => { const p = { txt, x, y, al, zone, px: px * 0.85, u: 0, C: null }; preuves.push(p); return p; };
  const lie = (a, b, ia) => liens.push({ a, b, ia, ph: Math.random() });
  let y = O.HAUT() + (L ? H * 0.06 : H * 0.045);
  mk(D.nom, pt, true, W / 2, y, 'c'); y += pt * 0.9;
  mk(D.role, px * 1.05, false, W / 2, y, 'c'); y += px * 1.3;
  const bas = hautTerre() - px * 0.8, r = clamp(Math.min(W, H) * 0.09, 38, 90);
  let planete;
  if (L) {
    // la constellation de l'IA au milieu, en ellipse autour de son cœur ; les quatre autres sur les côtés
    const ya = y + px * 0.6, yb = bas - px * 2.2, cx = W / 2, cy = (ya + yb) / 2, ry = (yb - ya) / 2 - px * 0.9, rx = Math.min(W * 0.17, 270);
    const coeur = mk(D.ia[0], pt * 1.25, true, cx, cy + pt * 0.45, 'c', [cx, cy - pt * 0.45], 6);
    const pIA = preuve(D.ia[1], cx, cy + ry + px * 2, 'c', 'ia'); coeur.preuve = pIA;
    const n = D.noeuds.length, N = D.noeuds.map(([nom, pr], i) => {
      const a = -Math.PI / 2 + i * TAU / n, co = Math.cos(a), si = Math.sin(a), sx = cx + co * rx, sy = cy + si * ry;
      const [al, lx, ly] = co > 0.25 ? ['g', sx + px * 0.75, sy] : co < -0.25 ? ['d', sx - px * 0.75, sy] : ['c', sx, sy + (si < 0 ? -px * 1.05 : px * 1.05)];
      const m = mk(nom, px * 1.12, false, lx, ly, al, [sx, sy], 3.6); m.preuve = preuve(pr, cx, cy + ry + px * 2, 'c', 'ia'); lie(coeur, m, true); return m; });
    N.forEach((m, i) => lie(m, N[(i + 1) % n], false));
    const x0 = W * 0.045, x1 = W * 0.955, h = yb + px * 2.2 - ya;
    D.groupes.forEach(([nom, pr, items], g) => {
      const gauche = g < 2, xs = gauche ? x0 : x1, s = gauche ? 1 : -1, yg = ya + h * [0.08, 0.56, 0.3, 0.72][g];
      const t = mk(nom, px * 1.25, false, xs + s * px * 1.3, yg, gauche ? 'g' : 'd', [xs + s * px * 0.35, yg], 3.2); t.stylo = g + 1;
      let prev = t; const p = preuve(pr, xs, yg + (items.length + 1) * px * 1.5 + px * 0.2, gauche ? 'g' : 'd', 'g' + g); t.preuve = p;
      items.forEach((it, j) => { const ex = xs + s * px * (1 + (j % 2) * 0.9), ey = yg + (j + 1) * px * 1.5;
        const m = mk(it, px, false, ex + s * px * 0.75, ey, gauche ? 'g' : 'd', [ex, ey], 2.2); m.preuve = p; m.stylo = g + 1; lie(prev, m, false); prev = m; });
    });
    planete = [W - W * 0.035 - r, O.HAUT() + r * 1.25 + 20];
  } else {
    // sur un téléphone : le cœur, la planète à sa droite ; les étoiles de l'IA en rangées, reliées en filet ; puis les quatre autres, deux par deux
    y += r + 6;
    const cx = W / 2, coeur = mk(D.ia[0], pt * 1.15, true, cx, y + pt * 0.5, 'c', [cx, y - pt * 0.35], 5);
    planete = [W - r - 10, y]; y += Math.max(pt * 1.3, r * 1.3);
    const rangs = [[0, 1, 2], [3, 4], [5, 6], [7, 8]], yp = y + rangs.length * px * 2.75 + px * 0.2;
    const pIA = preuve(D.ia[1], cx, yp, 'c', 'ia'); coeur.preuve = pIA;
    let avant = [coeur];
    rangs.forEach(R => { const ici = R.map((i, k) => { const [nom, pr] = D.noeuds[i], sx = W * (0.08 + 0.84 * (k + 0.5) / R.length), sy = y + px * 0.4;
      const m = mk(nom, px * 1.05, false, sx, sy + px * 1.05, 'c', [sx, sy], 3); m.preuve = preuve(pr, cx, yp, 'c', 'ia'); return m; });
      ici.forEach(m => { const et = m.hx + m.et[0], proche = avant.slice().sort((a, b) => Math.abs(a.hx + a.et[0] - et) - Math.abs(b.hx + b.et[0] - et)); lie(proche[0], m, true); if (proche[1] && avant.length > 1 && Math.random() < 0.5) lie(proche[1], m, true); });
      ici.slice(1).forEach((m, k) => lie(ici[k], m, false));
      avant = ici; y += px * 2.75; });
    y = yp + px * 1.9;
    D.groupes.forEach(([nom, pr, items], g) => {
      const xs = W * (g % 2 ? 0.53 : 0.05), yg = y + (g < 2 ? 0 : px * 1.3 * 4 + px * 0.4);
      const t = mk(nom, px * 1.1, false, xs + px * 1.1, yg, 'g', [xs + px * 0.3, yg], 2.6); t.preuve = preuve(pr, cx, yp, 'c', 'ia'); t.stylo = g + 1;
      let prev = t; items.slice(0, 3).forEach((it, j) => { const ex = xs + px * (0.8 + (j % 2) * 0.7), ey = yg + (j + 1) * px * 1.3;
        const m = mk(it, px * 0.9, false, ex + px * 0.6, ey, 'g', [ex, ey], 1.8); m.preuve = t.preuve; m.stylo = g + 1; lie(prev, m, false); prev = m; });
    });
  }
  // l'horaire du stylo : chaque contour à la suite, une petite pause entre les noms (le stylo se lève) ; l'étoile s'allume quand il y arrive
  // (plusieurs stylos : le premier écrit le nom, puis l'IA ; dès le nom écrit, un stylo par autre constellation, en même temps)
  const v = px * 130, stylos = [0]; let t = 0;
  mots.forEach((m, i) => { const s = m.stylo || 0; if (stylos[s] == null) stylos[s] = mots[1].t1 + 0.2 + s * 0.35; t = stylos[s] + (i ? 0.06 : 0); m.t0 = t;
    m.boucles.forEach(b => { b.L = long(b); b.t0 = t; b.d = b.L / (m.titre ? v * 0.7 : v); t += b.d + 0.008; }); m.t1 = t; stylos[s] = t; });
  t = Math.max(...stylos);
  liens.forEach(l => { l.t0 = Math.max(l.a.t0, l.b.t0) + 0.05; });
  return { mots, liens, preuves, planete, t0, total: t, W, H, fin: false };
}

/* ——— le monde : le stylo avance ; les mots, sur leur ressort ——— */
let pret = false, onFini = null;
const tps = () => M ? Wd.t - M.t0 : 0;
const ecrit = m => M && tps() >= m.t0;
const fini = m => M && tps() >= m.t1;
// un point d'un mot (coordonnées du mot) vers l'écran, et l'inverse
const vers = (m, lx, ly) => { const co = Math.cos(m.a), si = Math.sin(m.a), x = lx - m.cx, y = ly - m.cy; return [m.hx + m.dx + m.cx + co * x - si * y, m.hy + m.dy + m.cy + si * x + co * y]; };
const depuis = (m, X0, Y0) => { const co = Math.cos(-m.a), si = Math.sin(-m.a), x = X0 - (m.hx + m.dx + m.cx), y = Y0 - (m.hy + m.dy + m.cy); return [m.cx + co * x - si * y, m.cy + si * x + co * y]; };
const centreMot = m => vers(m, m.cx, m.cy);
// la pointe du stylo, maintenant
// (toutes les pointes : il y a un stylo par constellation)
function pointes() {
  const R = []; if (!M || M.fin) return R; const t = tps(); if (t < 0) return R;
  for (const m of M.mots) { if (t > m.t1 + 0.05 || t < m.t0) continue;
    for (const b of m.boucles) { if (t > b.t0 + b.d) continue; if (t < b.t0) { R.push(vers(m, b[0][0], b[0][1])); break; } const p = pas(b, (t - b.t0) / b.d); R.push(vers(m, p[0], p[1])); break; } }
  return R;
}
const pointe = () => pointes()[0] || null;
function pas(b, u) { let r = b.L * clamp(u, 0, 1); for (let i = 1; i < b.length; i++) { const a = b[i - 1], z = b[i], l = Math.hypot(z[0] - a[0], z[1] - a[1]); if (r <= l) { const k = l ? r / l : 0; return [a[0] + (z[0] - a[0]) * k, a[1] + (z[1] - a[1]) * k]; } r -= l; } return b[b.length - 1]; }

// le nom sous un point (ou dont l'étoile est tout près)
function motA(x, y, marge) {
  for (const m of M.mots) { if (!ecrit(m)) continue; const [lx, ly] = depuis(m, x, y);
    if (lx > 0 && lx < m.w && ly > m.h * 0.15 && ly < m.h * 0.9) return m;
    if (m.et && Math.hypot(lx - m.et[0], ly - m.et[1]) < (marge || 0)) return m; }
  return null;
}
// une preuve : ses contours, calculés la première fois qu'on la demande
function prepare(p) {
  let font = police(p.px), tw = largeur(p.txt, font), px = p.px;
  if (tw > O.W - 24) { px *= (O.W - 24) / tw; font = police(px); tw = largeur(p.txt, font); }
  const C = contours(p.txt, font, px); p.C = C; p.L = C.boucles.reduce((s, b) => s + (b.L = long(b)), 0) || 1;
  p.hx = (p.al === 'g' ? p.x : p.al === 'd' ? p.x - tw : p.x - tw / 2) - px * 0.3; p.hy = p.y - C.y0 + px * 0.35;
}
X.entre.push(() => { M = null; pret = false;
  const go = () => { pret = true; M = compose(Wd.t + (reduit ? -999 : 3)); };
  // (la police à la main doit être chargée, sinon les contours seraient ceux d'une autre)
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(police(24)), document.fonts.load(police(24, true))]).then(go, go); else go(); });
X.retour.push(() => { M = null; pret = false; });

X.pas.push((dt, cats) => {
  if (!M) return;
  // l'écran a changé de taille : on recompose, sans perdre où en était le stylo
  if (M.W !== O.W || M.H !== O.H) { const t0 = M.t0, f = M.fin; M = compose(t0); M.fin = f; }
  if (!M.fin && tps() > M.total + 2.5) { M.fin = true; if (onFini) onFini(); }
  const k = 60, amo = 7, ondes = O.E.ondes;
  M.mots.forEach(m => {
    if (!ecrit(m) || m.tenu) return;
    // le ressort : il revient à sa place ; les chats pendus le font ployer
    m.vx += (-k * m.dx - amo * m.vx) * dt; m.vy += (-k * m.dy - amo * m.vy + m.poids * 260) * dt; m.va += (-k * 1.4 * m.a - amo * m.va) * dt;
    m.dx += m.vx * dt; m.dy += m.vy * dt; m.a += m.va * dt; m.a = clamp(m.a, -0.9, 0.9);
    // l'onde d'un clic dans le vide : elle le secoue
    ondes.forEach(o => { if (o.plume && o.plume.has(m)) return; const [x, y] = centreMot(m), d = Math.hypot(x - o.x, y - o.y); if (d > Wd.s0 * 3) return;
      (o.plume || (o.plume = new Set())).add(m); const f = 520 * (1 - d / (Wd.s0 * 3)); m.vx += (x - o.x) / (d || 1) * f; m.vy += (y - o.y) / (d || 1) * f; m.va += rnd(-3, 3); });
    m.poids = 0;
  });
  // le survol : la souris sur un nom (ou tout près de son étoile) ; on l'a touché (téléphone) : épinglé un moment
  const P = Wd.ptr, sous = P && P.on && Wd.t - P.moved < 6 ? motA(P.x, P.y, 16) : null, zones = {};
  M.mots.forEach(m => { const on = m === sous || (m.pin && Wd.t < m.pin); m.survol += ((on ? 1 : 0) - m.survol) * Math.min(1, dt * 8); if (on && m.preuve && fini(m)) zones[m.preuve.zone] = m.preuve; });
  // les preuves : une par endroit ; la nouvelle attend que le stylo ait gommé l'ancienne
  M.preuves.forEach(p => { const voulu = zones[p.zone] === p, autre = M.preuves.some(q => q !== p && q.zone === p.zone && q.u > 0);
    if (voulu && !autre) { if (!p.C) prepare(p); p.u = Math.min(1, p.u + dt * p.px * 240 / p.L); }
    else if (p.u > 0) p.u = Math.max(0, p.u - dt * p.px * 520 / p.L); });
  // les chats qui passent : ils bousculent les mots (et rebondissent un peu)
  cats.forEach(c => { const S = c.sp; if (!S || c.held || !(S.m === 'derive' || S.m === 'nage')) return; const [x, y] = centreDe(c), r = rayon(c) * 0.8;
    M.mots.forEach(m => { if (!ecrit(m) || m.tenu) return; const [lx, ly] = depuis(m, x, y), px = clamp(lx, 0, m.w), py = clamp(ly, m.h * 0.2, m.h * 0.85), d = Math.hypot(lx - px, ly - py);
      if (d > r) return; const [wx, wy] = vers(m, px, py), nx = (x - wx) / (d || 1), ny = (y - wy) / (d || 1), vn = S.vx * nx + S.vy * ny;
      if (vn < 0) { const g = m.titre ? 0.25 : 0.45; m.vx += S.vx * g; m.vy += S.vy * g; m.va += (px - m.cx) / m.w * vn * -0.01; S.vx -= 1.3 * vn * nx; S.vy -= 1.3 * vn * ny;
        if (Math.random() < 0.3 && Wd.t - (m.tocT || -9) > 0.6) { m.tocT = Wd.t; Wd.fx.push({ k: 'txt', text: pick(['toc', 'poc', 'bonk']), x: wx, y: wy - 12, t0: Wd.t, life: 0.8, rot: rnd(-0.2, 0.2), size: 14 }); } }
      const o = r - d; c.x += nx * o; c.y += ny * o; }); });
  // les chats pendus : leur poids
  cats.forEach(c => { const S = c.sp; if (S && S.m === 'mot' && S.mot) S.mot.poids += Math.pow(rayon(c) / (Wd.s0 * 0.4), 2) * (S.mot.titre ? 0.25 : 0.6); });
});

/* ——— les chats : pendus à un mot, ou après la pointe du stylo ——— */
function pend(c, m) {
  const S = c.sp, [x, y] = centreDe(c), [lx] = depuis(m, x, y);
  Object.assign(S, { m: 'mot', mot: m, lx: clamp(lx, m.w * 0.1, m.w * 0.9), fin: Wd.t + rnd(4, 10) });
  m.vx += S.vx * 0.3; m.vy += S.vy * 0.3 + 60; m.va += rnd(-0.6, 0.6);
  S.ancre = () => S.mot ? vers(S.mot, S.lx, S.mot.h * 0.8) : null;
  if (Math.random() < 0.6) say(c, pick(en() ? ['hanging!', 'got it', 'wheee'] : ['accroché !', 'je lis…', 'wiii', 'c\'est écrit quoi ?']));
}
function lache(c, v) { const S = c.sp; S.ancre = null; S.mot = null; S.m = 'derive'; S.next = Wd.t + rnd(2, 4); S.lache = Wd.t; S.vx = rnd(-v, v); S.vy = rnd(-v, v * 0.3); S.w = rnd(-3, 3); }
X.mode.mot = (c, dt) => {
  const S = c.sp, m = S.mot; c.anim = 'agrippe'; c.spin *= Math.exp(-dt * 3);
  if (!m || !M || !M.mots.includes(m)) { lache(c, 60); return; }
  // il avance le long du mot, patte après patte ; secoué fort (ou lassé), il lâche
  S.lx = clamp(S.lx + Math.sin(S.t * 1.3) * 12 * dt, 0, m.w);
  if (Math.hypot(m.vx, m.vy) > 700 || Math.abs(m.va) > 6) { lache(c, 220); say(c, pick(['aaah !', 'mia !', 'trop fort'])); return; }
  if (Wd.t > S.fin) { lache(c, 120); if (Math.random() < 0.4) say(c, pick(['hop', 'bon.', 'suivant !'])); }
};
X.envie.push(c => {
  if (!M) return false; const S = c.sp;
  // pendant l'écriture : courir après la pointe du stylo
  if (!M.fin && Math.random() < 0.18 && pointe()) { S.m = 'nage'; S.fin = Wd.t + 4;
    S.cible = { get x() { const p = pointe(); return p ? p[0] : -9999; }, get y() { const p = pointe(); return p ? p[1] : -9999; }, r: 1,
      arrive: c => { c.sp.m = 'derive'; c.sp.next = Wd.t + rnd(1.5, 3); c.sp.vx += rnd(-60, 60); c.sp.vy -= 40; say(c, pick(en() ? ['got the pen!', 'mine!'] : ['le stylo !', 'attrapé !', 'à moi !', 'qu\'est-ce qu\'il écrit ?'])); } };
    return true; }
  // un mot déjà écrit : s'y pendre
  const L = M.mots.filter(m => fini(m) && !Wd.cats.some(o => o.sp && o.sp.mot === m)); if (!L.length || Math.random() < 0.55) return false;
  const m = pick(L), lx = rnd(0.2, 0.8) * m.w;
  S.m = 'nage'; S.fin = Wd.t + 6; S.cible = { get x() { return vers(m, lx, m.h)[0]; }, get y() { return vers(m, lx, m.h)[1] + rayon(c) * 0.6; }, r: 1.2, arrive: c => pend(c, m) };
  return true;
});

/* ——— attraper un mot, le lancer (il revient à sa place, sur son ressort) ——— */
const MOD = {
  drag(k, x, y) { const m = k.m; if (!m.tenu) { m.tenu = true; k.px = x; k.py = y; k.t = Wd.t; }
    const dt = Math.max(1 / 120, Wd.t - k.t); k.t = Wd.t; k.vx = (x - k.px) / dt; k.vy = (y - k.py) / dt; m.dx += x - k.px; m.dy += y - k.py; k.px = x; k.py = y;
    m.a += (clamp(-k.vx * 0.0004, -0.5, 0.5) - m.a) * 0.2;
    if (Math.hypot(k.vx, k.vy) > 1600) Wd.cats.forEach(c => { if (c.sp && c.sp.mot === m) { lache(c, 300); say(c, 'wiii !'); } }); },
  release(k, vx, vy) { const m = k.m; if (!m.tenu) { M.mots.forEach(o => { o.pin = 0; }); m.pin = Wd.t + 7; return; } m.tenu = false; m.vx = clamp(vx || 0, -1600, 1600); m.vy = clamp(vy || 0, -1600, 1600); m.va += clamp((vx || 0) * 0.002, -5, 5); }
};
X.grab.push((x, y) => {
  if (!M) return null;
  const m = motA(x, y, 12); return m ? { mod: MOD, m } : null;
});

/* ——— le dessin : au stylo blanc, le trait qui avance ; la pointe, au bout ——— */
X.fond.push((ctx, now) => {
  if (!M) return; const t = tps(); if (t < 0) return;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
  // les liens : ils se tirent d'une étoile à l'autre ; sur ceux du cœur de l'IA, des influx de lumière courent
  M.liens.forEach(l => { if (t < l.t0) return; const u = sm(clamp((t - l.t0) / 0.45, 0, 1)), [ax, ay] = vers(l.a, ...l.a.et), [bx, by] = vers(l.b, ...l.b.et), ex = ax + (bx - ax) * u, ey = ay + (by - ay) * u;
    const vif = Math.max(l.a.survol, l.b.survol); ctx.globalAlpha = (l.ia ? 0.42 : 0.3) + vif * 0.45; ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = l.ia ? 1.2 : 1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
    if (l.ia && u >= 1 && !reduit) { const f = ((now * 0.55 + l.ph) % 1.4) / 1.1; if (f < 1) { const q = sgn(Math.sin(l.ph * 9)) > 0 ? f : 1 - f; O.brille(ctx, ax + (bx - ax) * q, ay + (by - ay) * q, 2.4, 0.9 * Math.sin(Math.PI * f), false, now, 0); } } });
  // les étoiles : elles s'allument quand le stylo arrive au nom ; survolées, elles brillent plus fort
  M.mots.forEach((m, i) => { if (!m.et || t < m.t0) return; const [x, y] = vers(m, ...m.et), k = sm(clamp((t - m.t0) / 0.35, 0, 1)), R = m.eR * (1 + m.survol * 0.5) * k;
    O.brille(ctx, x, y, R, 0.75 + 0.25 * Math.sin(now * 2.1 + i) + m.survol * 0.3, true, now, i); ctx.globalAlpha = 1; ctx.fillStyle = `rgb(${BL})`; ctx.beginPath(); ctx.arc(x, y, R * 0.42, 0, TAU); ctx.fill(); });
  // les preuves : écrites au stylo, et gommées de même
  M.preuves.forEach(p => { if (p.u <= 0 || !p.C) return; ctx.save(); ctx.translate(p.hx, p.hy); ctx.globalAlpha = 0.9; ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1.4;
    let r = p.L * p.u; for (const b of p.C.boucles) { if (r <= 0) break; ctx.beginPath(); ctx.moveTo(b[0][0], b[0][1]); let q = r;
      for (let i = 1; i < b.length && q > 0; i++) { const a = b[i - 1], z = b[i], l = Math.hypot(z[0] - a[0], z[1] - a[1]); if (q >= l) ctx.lineTo(z[0], z[1]); else ctx.lineTo(a[0] + (z[0] - a[0]) * q / l, a[1] + (z[1] - a[1]) * q / l); q -= l; }
      ctx.stroke(); r -= b.L; }
    ctx.restore(); });
  ctx.globalAlpha = 1; ctx.strokeStyle = `rgb(${BL})`;
  M.mots.forEach(m => {
    if (t < m.t0) return; ctx.save(); const [ox, oy] = vers(m, 0, 0); ctx.translate(ox, oy); ctx.rotate(m.a); ctx.lineWidth = (m.titre ? 2.4 : 1.7) + m.survol * 0.5;
    m.boucles.forEach(b => { if (t < b.t0) return; const u = (t - b.t0) / b.d; ctx.beginPath(); ctx.moveTo(b[0][0], b[0][1]);
      if (u >= 1) { for (let i = 1; i < b.length; i++) ctx.lineTo(b[i][0], b[i][1]); }
      else { let r = b.L * u; for (let i = 1; i < b.length && r > 0; i++) { const a = b[i - 1], z = b[i], l = Math.hypot(z[0] - a[0], z[1] - a[1]); if (r >= l) ctx.lineTo(z[0], z[1]); else ctx.lineTo(a[0] + (z[0] - a[0]) * r / l, a[1] + (z[1] - a[1]) * r / l); r -= l; } }
      ctx.stroke(); });
    ctx.restore(); });
  ctx.restore();
});
X.devant.push(ctx => { const P = pointes(); if (!P.length) return; ctx.save(); ctx.fillStyle = `rgb(${BL})`; P.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, TAU); ctx.fill(); }); ctx.restore(); });

return { get M() { return M; }, pointe, get planete() { return M && M.planete; }, set onFini(f) { onFini = f; }, get fini() { return !!(M && M.fin); } };
})();
