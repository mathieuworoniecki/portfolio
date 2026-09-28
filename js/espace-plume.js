/* Dans l'espace (l'écran 2) : les compétences de Mathieu, sur des cartes dessinées à la craie qui flottent en apesanteur
   (28/09, Mathieu : « vire le texte sur l'étape deux, on doit sur cette étape présenter mes compétences […] tu dois mettre beaucoup
   en avant mes compétences liées à l'IA » ; puis, 17:41 : « on dessine à la craie les cartes de chaque ensemble de compétences »).
   - En haut, son nom et son titre s'écrivent seuls, au stylo blanc.
   - Une carte par ensemble : au centre, la plus grande, l'IA (neuf compétences, chacune avec sa preuve) ; autour, Front, Back, Pilotage, DevOps.
     Chaque carte a son stylo : il trace le cadre à la craie, puis le titre, puis les compétences, contour après contour ; les puces s'allument.
   - Les cartes flottent : elles dérivent un peu autour de leur place, tanguent ; on les attrape et on les lance (elles reviennent, sans se presser) ;
     un chat qui passe les bouscule ; un chat s'y pend par les pattes de devant (la carte penche sous son poids) ; l'onde d'un clic les secoue.
   - Survoler (ou toucher) une compétence écrit sa preuve en bas, tirée du CV ; on s'en va, le stylo la gomme.
   - Tout vient du CV et du profil LinkedIn de Mathieu (28/09) : ne rien ajouter qui n'y soit pas. */
window.EspacePlume = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, rnd, pick, clamp, sgn, sm } = K;
const TAU = Math.PI * 2, BL = '244,244,238';
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const en = () => !!(window.I18N && I18N.lang && I18N.lang !== 'fr');
// les compétences : [nom, preuve] ; les preuves viennent du CV (28/09)
// les compétences, par carte : [titre, preuve de la carte, compétences] ; l'IA : chaque compétence a sa propre preuve. Tout vient du CV (28/09).
const DONNEES = () => en() ? {
  nom: 'Mathieu Woroniecki', role: 'Senior tech lead & AI architect',
  ia: ['AI', 'CTO of MARKO, an AI-native B2B SaaS for real estate'],
  noeuds: [['LLM', 'HUman (areweai.dev): what if we were the biggest LLM?'], ['RAG', 'LLMs and RAG in the dev cycle: +35% productivity'],
    ['AI agents', 'Agentic AI at the core of MARKO'], ['Generative AI', 'Led generative AI adoption at LWA'], ['Document AI', 'Document AI and data extraction at MARKO'],
    ['Prompt engineering', 'MARKO: generative AI, LLM/RAG, prompt engineering'], ['MCP', 'MCP to speed up the Figma-to-code flow'],
    ['Qdrant', 'Qdrant: a vector database for RAG'], ['Automation', 'Workflow automation at MARKO']],
  groupes: [
    ['Front', 'Vue/Nuxt architecture for Hermès, Chanel, Ardian', ['Vue · Nuxt', 'React · Next', 'TypeScript', 'Animation · UI/UX', 'Vite · Webpack']],
    ['Back', 'The MARKO API: FastAPI and PostgreSQL', ['Python · FastAPI', 'PHP · Symfony', 'Node.js', 'PostgreSQL · Redis', 'API · Headless CMS']],
    ['Lead', 'Tech lead of Digiplace: 150,000+ users (ENGIE)', ['Tech lead', 'Management · Mentoring', 'Agile · Roadmap', 'OWASP · WCAG']],
    ['DevOps', '15+ projects moved to Docker (LWA)', ['Docker', 'CI/CD · GitLab', 'Azure · AWS', 'Traefik · Grafana']]]
} : {
  nom: 'Mathieu Woroniecki', role: 'Responsable technique senior & architecte IA',
  ia: ['IA', 'CTO de MARKO, un SaaS B2B AI-native pour l’immobilier'],
  noeuds: [['LLM', 'HUman (areweai.dev) : et si nous étions le plus grand LLM ?'], ['RAG', 'LLM et RAG dans le cycle de dev : +35 % de productivité'],
    ['Agents IA', 'Agentic AI au cœur de MARKO'], ['IA générative', 'Initiateur de l’adoption de l’IA générative chez LWA'], ['Document AI', 'Document AI et extraction de données chez MARKO'],
    ['Prompt engineering', 'MARKO : IA générative, LLM/RAG, prompt engineering'], ['MCP', 'MCP pour accélérer le flux Figma → code'],
    ['Qdrant', 'Qdrant : une base vectorielle pour le RAG'], ['Automatisation', 'Workflow automation chez MARKO']],
  groupes: [
    ['Front', 'Architecture Vue/Nuxt pour Hermès, Chanel, Ardian', ['Vue · Nuxt', 'React · Next', 'TypeScript', 'Animation · UI/UX', 'Vite · Webpack']],
    ['Back', 'L’API de MARKO : FastAPI et PostgreSQL', ['Python · FastAPI', 'PHP · Symfony', 'Node.js', 'PostgreSQL · Redis', 'API · Headless CMS']],
    ['Pilotage', 'Tech lead de Digiplace : 150 000+ collaborateurs (ENGIE)', ['Tech lead', 'Management · Mentorat', 'Agile · Roadmap', 'OWASP · RGAA']],
    ['DevOps', '15+ projets passés sous Docker (LWA)', ['Docker', 'CI/CD · GitLab', 'Azure · AWS', 'Traefik · Grafana']]]
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


/* ——— la mise en page : des cartes (x0, y0 : leur centre ; w, h), et dans chaque carte ses mots (lx, ly : leur coin, dans la carte) ——— */
let M = null;   // { cartes, mots, preuves, planete, t0, total, fin, W, H }
// le nom : la police du grand titre de l'écran 1 ; le reste : l'écriture à la main (--hand)
const police = (px, titre) => { const h1 = titre && document.querySelector('h1[data-title]'), cs = h1 && getComputedStyle(h1);
  return cs ? `${cs.fontWeight} ${px}px ${cs.fontFamily}` : `400 ${px}px ${getComputedStyle(document.documentElement).getPropertyValue('--hand').trim() || 'cursive'}`; };
const largeur = (txt, font) => { tx.font = font; return tx.measureText(txt).width; };
// (le haut de la Terre, comme js/espace-planetes.js la pose : on n'écrit pas dessous)
const hautTerre = () => { const H = O.H, h = clamp(H * 0.13, 60, 130); return O.BAS() - h + 18; };
// un nombre qui ne change pas d'une image à l'autre (le tremblé de la craie)
const bruit = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// le cadre à la craie : un rectangle aux coins arrondis, à main levée, qui dépasse un peu à la fin (le trait se croise)
function cadre(w, h, r, seed) {
  const P = [], pas = 9, x0 = -w / 2, y0 = -h / 2, per = 2 * (w + h - 4 * r) + TAU * r;
  const point = u => { u = ((u % per) + per) % per; const a = w - 2 * r, b = h - 2 * r;
    if (u < a) return [x0 + r + u, y0]; u -= a;
    if (u < TAU * r / 4) { const t = -Math.PI / 2 + u / r; return [x0 + w - r + Math.cos(t) * r, y0 + r + Math.sin(t) * r]; } u -= TAU * r / 4;
    if (u < b) return [x0 + w, y0 + r + u]; u -= b;
    if (u < TAU * r / 4) { const t = u / r; return [x0 + w - r + Math.cos(t) * r, y0 + h - r + Math.sin(t) * r]; } u -= TAU * r / 4;
    if (u < a) return [x0 + w - r - u, y0 + h]; u -= a;
    if (u < TAU * r / 4) { const t = Math.PI / 2 + u / r; return [x0 + r + Math.cos(t) * r, y0 + h - r + Math.sin(t) * r]; } u -= TAU * r / 4;
    if (u < b) return [x0, y0 + h - r - u]; u -= b;
    const t = Math.PI + u / r; return [x0 + r + Math.cos(t) * r, y0 + r + Math.sin(t) * r]; };
  const fin = per + Math.min(26, w * 0.1), n = Math.ceil(fin / pas);
  for (let i = 0; i <= n; i++) { const u = i / n * fin, p = point(u), k = 1.3 * Math.sin(u * 0.045 + seed) + (bruit(seed + i) - 0.5) * 1.1, q = i / n > 0.97 ? 1.6 : 0;   // (en bout de course, le trait s'écarte un peu)
    const e = 0.4; const p2 = point(u + e), nx = -(p2[1] - p[1]) / e, ny = (p2[0] - p[0]) / e; P.push([p[0] + nx * (k + q), p[1] + ny * (k + q)]); }
  return P;
}
function compose(t0) {
  const W = O.W, H = O.H, D = DONNEES(), L = W >= 760;
  let px = L ? (W < 1000 ? 17 : 20) : 15, R = null;
  // (trop grand pour l'écran : on recommence un peu plus petit)
  for (let essai = 0; essai < 7 && !R; essai++, px *= 0.9) R = pose(W, H, D, L, px, essai === 6);
  const { cartes, mots, preuves, planete } = R;
  // l'horaire des stylos : le premier écrit le nom et le titre ; puis un stylo par carte, en même temps (l'IA d'abord) :
  // le cadre à la craie, le titre, puis chaque compétence ; la puce s'allume quand le stylo arrive au mot
  const v = px * 130; let t = 0;
  const ecrire = (m, t) => { m.t0 = t; m.boucles.forEach(b => { b.L = long(b); b.t0 = t; b.d = b.L / (m.titre ? v * 0.7 : v); t += b.d + 0.008; }); m.t1 = t; return t; };
  cartes[0].mots.forEach(m => { t = ecrire(m, t + 0.06); });
  const debut = t + 0.2; let total = t;
  cartes.slice(1).forEach((C, i) => { let u = debut + i * 0.3; const b = C.cadre; b.L = long(b); b.t0 = u; b.d = b.L / (v * 2.2); u += b.d + 0.1;
    C.mots.forEach(m => { u = ecrire(m, u + 0.05); }); C.t1 = u; total = Math.max(total, u); });
  return { cartes, mots, preuves, planete, t0, total, W, H, fin: false };
}
// tout placer, pour une taille de lettres ; null si ça ne tient pas (sauf au dernier essai)
function pose(W, H, D, L, px, force) {
  const pt = px * (L ? 1.9 : 1.75), cartes = [], mots = [], preuves = [], lh = px * 1.5, pad = px * 0.95;
  const preuve = (txt, ia) => { const p = { txt, ia, al: 'c', px: px * 0.85, u: 0, C: null }; preuves.push(p); return p; };
  const mot = (C, txt, taille, titre, lx, ly, puce) => {   // (lx, ly : où commence le texte, et le milieu de ses lettres, dans la carte)
    const font = police(taille, titre), tw = largeur(txt, font), K = contours(txt, font, taille);
    const m = { txt, titre, px: taille, boucles: K.boucles, w: K.w, h: K.h, tw, lx: lx - taille * 0.3, ly: ly - K.y0 + taille * 0.35, carte: C, survol: 0, preuve: null };
    if (puce) { m.et = [taille * 0.3 - taille * 0.75, K.y0 - taille * 0.35]; m.eR = puce; }
    C.mots.push(m); mots.push(m); return m;
  };
  const carte = (o) => { const C = Object.assign({ id: cartes.length, dx: 0, dy: 0, vx: 0, vy: 0, a: 0, va: 0, tenu: false, survol: 0, poids: 0, couple: 0, ph: rnd(0, TAU), mots: [], preuve: null, cadre: null }, o); cartes.push(C); return C; };
  // en haut : le nom, le titre (une « carte » sans cadre, qui ne bouge presque pas)
  let y = O.HAUT() + (L ? H * 0.05 : H * 0.035);
  const wn = largeur(D.nom, police(pt, true)), wr = largeur(D.role, police(px * 1.05));
  const T = carte({ tete: true, x0: W / 2, y0: y + pt * 0.55, w: Math.max(wn, wr) + px, h: pt * 0.9 + px * 1.3 });
  mot(T, D.nom, pt, true, -wn / 2, -T.h / 2 + pt * 0.45); mot(T, D.role, px * 1.05, false, -wr / 2, -T.h / 2 + pt * 0.9 + px * 0.55);
  if (Math.max(wn, wr) > W - 20 && !force) return null;
  y = T.y0 + T.h / 2 + px * 0.9;
  const yp = hautTerre() - px * 1.05, yb = yp - px * 1.3, r = L ? clamp(Math.min(W, H) * 0.07, 38, 64) : clamp(Math.min(W, H) * 0.09, 38, 90);
  // les mesures d'une carte : [largeur d'une colonne, nombre de lignes] pour des compétences, en 1 ou 2 colonnes
  // (la carte de l'IA a ses lettres plus grandes : c'est elle qu'on doit voir d'abord)
  const pxI = L ? px * 1.25 : px, lhI = pxI * 1.5, ptC = px * 1.25, ptIA = L ? pt * 1.55 : pt * 1.3, sousPx = L ? px * 0.95 : px * 0.82;
  const col = (L0, q = px) => Math.max(...L0.map(s => largeur(s, police(q)))) + q * 1.2;
  const hauteur = (n, cols, titre, sous, l = lh) => pad + titre * 1.05 + (sous ? sousPx * 1.6 : 0) + (Math.ceil(n / cols) + 0.2) * l + pad;
  // la carte de l'IA
  const nomsIA = D.noeuds.map(n => n[0]), cIA = col(nomsIA, pxI), wSous = largeur(D.ia[1], police(sousPx));
  let planete, cols = 2;
  let wIA = Math.max(2 * cIA + pad * 2.6, wSous + pad * 2, largeur(D.ia[0], police(ptIA, true)) + pad * 2);
  const placeCarte = (C, items, cols, titreTxt, titrePx, titreGros, sous, q = px, l = lh) => {
    let yy = -C.h / 2 + pad + titrePx * 0.5;
    const t = mot(C, titreTxt, titrePx, titreGros, -C.w / 2 + pad, yy); t.estTitre = true; yy += titrePx * 0.55;
    if (sous) { yy += sousPx * 0.95; mot(C, sous, sousPx, false, -C.w / 2 + pad, yy); yy += sousPx * 0.4; }
    yy += l * 0.75; const cw = (C.w - pad * 2) / cols, n = Math.ceil(items.length / cols);
    return items.map((s, i) => { const c = Math.floor(i / n), k = i % n; return mot(C, s, q, false, -C.w / 2 + pad + c * cw + q * 0.95, yy + k * l, q === px ? 2.2 : 2.8); });
  };
  if (L) {
    // grand écran : l'IA au centre ; Front et Back à gauche, Pilotage et DevOps à droite (sous la planète des chats)
    planete = [W - W * 0.035 - r, O.HAUT() + r * 1.25 + 20];
    const hIA = hauteur(9, 2, ptIA, true, lhI); if (y + hIA > yb && !force) return null;
    const G = D.groupes.map(([t, pr, l]) => ({ t, pr, l, w: Math.max(col(l) + pad * 2, largeur(t, police(ptC)) + pad * 2), h: hauteur(l.length, 1, ptC, false) }));
    const wG = Math.max(...G.map(g => g.w)), marge = W * 0.035, gap = px * 1.2;
    if (marge + wG + gap + wIA / 2 > W / 2 && !force) return null;
    const C = carte({ ia: true, x0: W / 2, y0: Math.max(y + hIA / 2, (y + yb) / 2), w: wIA, h: hIA, seed: 1 });
    placeCarte(C, nomsIA, 2, D.ia[0], ptIA, true, D.ia[1], pxI, lhI).forEach((m, i) => { m.preuve = preuve(D.noeuds[i][1], true); });
    const hautD = planete[1] + r * 1.35 + px * 0.4, colonne = (L0, x, y0) => {
      const libre = yb - y0 - L0.reduce((s, g) => s + g.h, 0); if (libre < gap * 0.5 && !force) return false;
      let yy = y0 + Math.max(0, libre) / (L0.length + 1) * 0.8;
      L0.forEach((g, i) => { const Cg = carte({ x0: x + (i % 2 ? -1 : 1) * px * 0.6, y0: yy + g.h / 2, w: g.w, h: g.h, seed: 3 + cartes.length }); Cg.preuve = preuve(g.pr, false);
        placeCarte(Cg, g.l, 1, g.t, ptC, false).forEach(m => { m.preuve = Cg.preuve; }); yy += g.h + Math.max(gap, Math.max(0, libre) / (L0.length + 1)); });
      return true; };
    if (!colonne(G.slice(0, 2), marge + wG / 2, y) || !colonne(G.slice(2), W - marge - wG / 2, Math.max(y, hautD))) return null;
  } else {
    // téléphone : la carte de l'IA et la planète à sa droite ; puis les quatre autres, deux par deux
    const wmax = W - 24 - r * 2 - 8; cols = 2 * cIA + pad * 2.6 <= wmax ? 2 : 1;
    wIA = Math.min(wmax, Math.max(cols * cIA + pad * (cols === 2 ? 2.6 : 2), largeur(D.ia[0], police(ptIA, true)) + pad * 2));
    const sous = wSous <= wIA - pad * 2 ? D.ia[1] : null, hIA = hauteur(9, cols, ptIA, !!sous);
    const C = carte({ ia: true, x0: 12 + wIA / 2, y0: y + hIA / 2, w: wIA, h: hIA, seed: 1 });
    placeCarte(C, nomsIA, cols, D.ia[0], ptIA, true, sous).forEach((m, i) => { m.preuve = preuve(D.noeuds[i][1], true); });
    planete = [W - r - 10, y + r * 1.2];
    y += hIA + px * 0.8;
    const wg = (W - 24 - px * 0.8) / 2, G = D.groupes.map(([t, pr, l]) => ({ t, pr, l: l.slice(0, 4), h: hauteur(Math.min(4, l.length), 1, ptC, false) }));
    for (let i = 0; i < 4; i += 2) { const h = Math.max(G[i].h, G[i + 1].h);
      [0, 1].forEach(k => { const g = G[i + k], Cg = carte({ x0: 12 + wg / 2 + k * (wg + px * 0.8), y0: y + h / 2, w: wg, h, seed: 3 + cartes.length }); Cg.preuve = preuve(g.pr, false);
        placeCarte(Cg, g.l, 1, g.t, ptC, false).forEach(m => { m.preuve = Cg.preuve; }); });
      y += h + px * 0.7; }
    if (y > yb + px && !force) return null;
    if (G.some(g => col(g.l) + pad * 2 > wg) && !force) return null;
  }
  // les cadres, et où s'écrivent les preuves (une ligne, en bas, juste au-dessus de la Terre)
  cartes.forEach(C => { if (!C.tete) C.cadre = cadre(C.w, C.h, px * 0.8, C.seed || 2); C.m = C.w * C.h / (Wd.s0 * Wd.s0 * 0.6); });
  preuves.forEach(p => { p.x = W / 2; p.y = yp; });
  return { cartes, mots, preuves, planete };
}

/* ——— le monde : les stylos avancent ; les cartes flottent ——— */
let pret = false, onFini = null;
const tps = () => M ? Wd.t - M.t0 : 0;
const ecrit = m => M && tps() >= m.t0;
const fini = m => M && tps() >= m.t1;
const dessinee = C => M && (C.tete ? tps() >= C.mots[0].t0 : tps() >= C.cadre.t0);
// chaque preuve d'IA lue en entier : toutes → une découverte (le haut fait « Recruteur curieux »)
const lusIA = new Set();
function luIA(p) { if (lusIA.has(p.txt)) return; lusIA.add(p.txt); if (M.preuves.filter(q => q.ia).every(q => lusIA.has(q.txt)) && window.Dex && Dex.vu) Dex.vu('competences'); }
// un point d'une carte (coordonnées de la carte, son centre en 0, 0) vers l'écran, et l'inverse ; d'un mot, via sa carte
const vc = (C, x, y) => { const co = Math.cos(C.a), si = Math.sin(C.a); return [C.x0 + C.dx + co * x - si * y, C.y0 + C.dy + si * x + co * y]; };
const dc = (C, X0, Y0) => { const co = Math.cos(C.a), si = Math.sin(C.a), x = X0 - C.x0 - C.dx, y = Y0 - C.y0 - C.dy; return [co * x + si * y, -si * x + co * y]; };
const vers = (m, lx, ly) => vc(m.carte, m.lx + lx, m.ly + ly);
// la pointe du stylo, maintenant (toutes les pointes : un stylo par carte)
function pointes() {
  const R = []; if (!M || M.fin) return R; const t = tps(); if (t < 0) return R;
  M.cartes.forEach(C => {
    const b = C.cadre; if (b && t >= b.t0 && t < b.t0 + b.d) { const p = pas(b, (t - b.t0) / b.d); R.push(vc(C, p[0], p[1])); return; }
    for (const m of C.mots) { if (t > m.t1 + 0.05 || t < m.t0) continue;
      for (const q of m.boucles) { if (t > q.t0 + q.d) continue; if (t < q.t0) { R.push(vers(m, q[0][0], q[0][1])); break; } const p = pas(q, (t - q.t0) / q.d); R.push(vers(m, p[0], p[1])); break; }
      return; } });
  return R;
}
const pointe = () => pointes()[0] || null;
function pas(b, u) { let r = b.L * clamp(u, 0, 1); for (let i = 1; i < b.length; i++) { const a = b[i - 1], z = b[i], l = Math.hypot(z[0] - a[0], z[1] - a[1]); if (r <= l) { const k = l ? r / l : 0; return [a[0] + (z[0] - a[0]) * k, a[1] + (z[1] - a[1]) * k]; } r -= l; } return b[b.length - 1]; }

// la carte sous un point (la dernière posée est dessus), puis le mot
function carteA(x, y, marge) {
  for (let i = M.cartes.length - 1; i >= 0; i--) { const C = M.cartes[i]; if (!dessinee(C)) continue; const [lx, ly] = dc(C, x, y);
    if (Math.abs(lx) < C.w / 2 + (marge || 0) && Math.abs(ly) < C.h / 2 + (marge || 0)) return C; }
  return null;
}
function motA(x, y) {
  const C = carteA(x, y, 4); if (!C) return null; const [cx, cy] = dc(C, x, y);
  return C.mots.find(m => ecrit(m) && cx > m.lx + (m.et ? m.et[0] - 8 : 0) && cx < m.lx + m.tw + m.px * 0.6 && cy > m.ly + m.h * 0.12 && cy < m.ly + m.h * 0.92) || null;
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
  // l'écran a changé de taille : on recompose, sans perdre où en étaient les stylos
  if (M.W !== O.W || M.H !== O.H) { const t0 = M.t0, f = M.fin; M = compose(t0); M.fin = f; }
  if (!M.fin && tps() > M.total + 2.5) { M.fin = true; if (onFini) onFini(); }
  const ondes = O.E.ondes, now = Wd.t, hautY = O.HAUT(), basY = O.BAS();
  M.cartes.forEach(C => {
    if (!dessinee(C) || C.tenu) { C.poids = C.couple = 0; return; }
    // l'apesanteur : chaque carte dérive doucement autour de sa place, et tangue ; un ressort mou l'y ramène (le titre, lui, bouge à peine)
    const f = O.W < 760 ? 0.45 : 1, k = C.tete ? 60 : 7, amo = C.tete ? 7 : 2.4, bx = C.tete ? 0 : Math.sin(now * 0.37 + C.ph) * 5 * f, by = C.tete ? 0 : Math.sin(now * 0.51 + C.ph * 1.7) * 7 * f, ba = C.tete ? 0 : Math.sin(now * 0.29 + C.ph) * 0.025;
    C.vx += (-k * (C.dx - bx) - amo * C.vx) * dt; C.vy += (-k * (C.dy - by) - amo * C.vy + C.poids * 220 / C.m) * dt;
    C.va += (-k * 1.5 * (C.a - ba) - amo * 1.5 * C.va + C.couple * 1.6 / C.m) * dt;
    C.dx += C.vx * dt; C.dy += C.vy * dt; C.a += C.va * dt; C.a = clamp(C.a, -1.2, 1.2);
    // les bords de l'écran : elle rebondit (un coin qui sort)
    if (!C.tete) { let ox = 0, oy = 0; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const [x, y] = vc(C, sx * C.w / 2, sy * C.h / 2);
        if (x < 2) ox = Math.max(ox, 2 - x); if (x > O.W - 2) ox = Math.min(ox, O.W - 2 - x); if (y < hautY) oy = Math.max(oy, hautY - y); if (y > basY) oy = Math.min(oy, basY - y); });
      if (ox) { C.dx += ox; if (C.vx * ox < 0) { C.vx = -C.vx * 0.6; C.va += rnd(-1, 1); } }
      if (oy) { C.dy += oy; if (C.vy * oy < 0) { C.vy = -C.vy * 0.6; C.va += rnd(-1, 1); } } }
    // l'onde d'un clic dans le vide : elle la secoue
    ondes.forEach(o => { if (o.plume && o.plume.has(C)) return; const [x, y] = vc(C, 0, 0), d = Math.hypot(x - o.x, y - o.y); if (d > Wd.s0 * 3 + Math.max(C.w, C.h) / 2) return;
      (o.plume || (o.plume = new Set())).add(C); const f = (C.tete ? 300 : 520) * clamp(1 - d / (Wd.s0 * 3 + C.w / 2), 0.2, 1) / Math.sqrt(C.m); C.vx += (x - o.x) / (d || 1) * f; C.vy += (y - o.y) / (d || 1) * f; C.va += rnd(-1.5, 1.5) / Math.sqrt(C.m); });
    C.poids = C.couple = 0;
  });
  // les cartes entre elles : celle qu'on a lancée (ou qu'on tient) bouscule celles qu'elle touche ; au repos, elles ne se gênent pas
  // (seulement celle qu'on vient de lancer, et tant qu'elle file : les cartes bousculées, elles, rentrent chez elles sans se gêner)
  const vive = C => C.tenu || (Wd.t - (C.lance ?? -9) < 1.4 && Math.hypot(C.vx, C.vy) > 150);
  for (let i = 1; i < M.cartes.length; i++) for (let j = i + 1; j < M.cartes.length; j++) {
    const A = M.cartes[i], B = M.cartes[j]; if (!dessinee(A) || !dessinee(B) || (!vive(A) && !vive(B))) continue;
    const [ax, ay] = vc(A, 0, 0), [bx, by] = vc(B, 0, 0), ox = (A.w + B.w) / 2 - Math.abs(ax - bx), oy = (A.h + B.h) / 2 - Math.abs(ay - by); if (ox <= 0 || oy <= 0) continue;
    const tot = A.m + B.m, sx = sgn(ax - bx) || 1, sy = sgn(ay - by) || 1;
    if (ox < oy) { if (!A.tenu) A.dx += sx * ox * B.m / tot; if (!B.tenu) B.dx -= sx * ox * A.m / tot; const vn = (A.vx - B.vx) * sx; if (vn < 0) { const j2 = -1.6 * vn / (1 / A.m + 1 / B.m); A.vx += sx * j2 / A.m; B.vx -= sx * j2 / B.m; A.va += rnd(-0.6, 0.6); B.va += rnd(-0.6, 0.6); if (-vn > 250) toc(ax + (bx - ax) / 2, ay + (by - ay) / 2); } }
    else { if (!A.tenu) A.dy += sy * oy * B.m / tot; if (!B.tenu) B.dy -= sy * oy * A.m / tot; const vn = (A.vy - B.vy) * sy; if (vn < 0) { const j2 = -1.6 * vn / (1 / A.m + 1 / B.m); A.vy += sy * j2 / A.m; B.vy -= sy * j2 / B.m; A.va += rnd(-0.6, 0.6); B.va += rnd(-0.6, 0.6); if (-vn > 250) toc(ax + (bx - ax) / 2, ay + (by - ay) / 2); } }
  }
  // le survol : la souris sur une compétence (ou sur sa carte) ; on l'a touchée (téléphone) : épinglée un moment
  const P = Wd.ptr, vif = P && P.on && Wd.t - P.moved < 6, sousM = vif ? motA(P.x, P.y) : null, sousC = vif ? carteA(P.x, P.y) : null;
  let voulu = null;
  M.cartes.forEach(C => { const on = C === sousC || (C.pin && Wd.t < C.pin); C.survol += ((on ? 1 : 0) - C.survol) * Math.min(1, dt * 8); });
  M.mots.forEach(m => { const on = m === sousM || (m.pin && Wd.t < m.pin); m.survol += ((on ? 1 : 0) - m.survol) * Math.min(1, dt * 8); if (on && m.preuve && fini(m)) voulu = m.preuve; });
  if (!voulu) { const C = M.cartes.find(C => (C === sousC || (C.pin && Wd.t < C.pin)) && C.preuve && C.t1 && tps() >= C.t1); if (C) voulu = C.preuve; }
  // les preuves : une à la fois ; la nouvelle attend que le stylo ait gommé l'ancienne
  M.preuves.forEach(p => { const autre = M.preuves.some(q => q !== p && q.u > 0);
    if (p === voulu && !autre) { if (!p.C) prepare(p); p.u = Math.min(1, p.u + dt * p.px * 240 / p.L); if (p.u >= 1 && p.ia) luIA(p); }
    else if (p.u > 0) p.u = Math.max(0, p.u - dt * p.px * 520 / p.L); });
  // les chats qui passent : ils bousculent les cartes (et rebondissent) ; le choc se partage selon les masses
  cats.forEach(c => { const S = c.sp; if (!S || c.held || !(S.m === 'derive' || S.m === 'nage')) return; const r = rayon(c) * 0.8, mc = Math.pow(rayon(c) / (Wd.s0 * 0.4), 2);
    M.cartes.forEach(C => { if (!dessinee(C) || C.tenu) return; const [x, y] = centreDe(c), [lx, ly] = dc(C, x, y), hw = C.w / 2, hh = C.h / 2;
      if (Math.abs(lx) > hw + r || Math.abs(ly) > hh + r) return;
      let px = clamp(lx, -hw, hw), py = clamp(ly, -hh, hh), nx, ny, d;
      if (px === lx && py === ly) { const ex = hw - Math.abs(lx), ey = hh - Math.abs(ly);   // (le centre du chat est dedans : il sort par le bord le plus proche)
        if (ex < ey) { nx = sgn(lx) || 1; ny = 0; px = nx * hw; } else { nx = 0; ny = sgn(ly) || 1; py = ny * hh; } d = -Math.min(ex, ey); }
      else { d = Math.hypot(lx - px, ly - py); if (d > r) return; nx = (lx - px) / (d || 1); ny = (ly - py) / (d || 1); }
      // (dans le repère de l'écran)
      const co = Math.cos(C.a), si = Math.sin(C.a), wx = co * nx - si * ny, wy = si * nx + co * ny, o = r - d;
      c.x += wx * o * C.m / (C.m + mc); c.y += wy * o * C.m / (C.m + mc); if (!C.tete) { C.dx -= wx * o * mc / (C.m + mc); C.dy -= wy * o * mc / (C.m + mc); }
      const vn = (S.vx - C.vx) * wx + (S.vy - C.vy) * wy;
      if (vn < 0) { const j = -1.5 * vn / (1 / mc + 1 / C.m); S.vx += j * wx / mc; S.vy += j * wy / mc; C.vx -= j * wx / C.m * (C.tete ? 0.3 : 1); C.vy -= j * wy / C.m * (C.tete ? 0.3 : 1); C.va += (px * wy - py * wx) * -j / (C.m * C.w * C.w * 0.08) * (C.tete ? 0.2 : 1);
        if (-vn > 120 && Wd.t - (C.tocT || -9) > 0.5 && Math.random() < 0.5) { C.tocT = Wd.t; toc(...vc(C, px, py)); } } }); });
  // les chats pendus : leur poids (la carte descend et penche du côté où il pend)
  cats.forEach(c => { const S = c.sp; if (S && S.m === 'mot' && S.carte) { const mc = Math.pow(rayon(c) / (Wd.s0 * 0.4), 2); S.carte.poids += mc * (S.carte.tete ? 0.3 : 1); S.carte.couple += mc * S.lx * (S.carte.tete ? 0.1 : 1); } });
});
const toc = (x, y) => Wd.fx.push({ k: 'txt', text: pick(['toc', 'poc', 'bonk']), x, y: y - 12, t0: Wd.t, life: 0.8, rot: rnd(-0.2, 0.2), size: 14 });

/* ——— les chats : pendus au bas d'une carte, ou après la pointe du stylo ——— */
function pend(c, C) {
  const S = c.sp, [x, y] = centreDe(c), [lx] = dc(C, x, y);
  Object.assign(S, { m: 'mot', carte: C, lx: clamp(lx, -C.w * 0.42, C.w * 0.42), fin: Wd.t + rnd(5, 12) });
  C.vx += S.vx * 0.2; C.vy += S.vy * 0.2 + 40; C.va += rnd(-0.3, 0.3);
  S.ancre = () => S.carte ? vc(S.carte, S.lx, S.carte.h / 2) : null;
  if (Math.random() < 0.6) say(c, pick(en() ? ['hanging!', 'got it', 'reading…'] : ['accroché !', 'je lis…', 'wiii', 'c\'est écrit quoi ?', 'IA ?']));
}
function lache(c, v) { const S = c.sp; S.ancre = null; S.carte = null; S.m = 'derive'; S.next = Wd.t + rnd(2, 4); S.lache = Wd.t; S.vx = rnd(-v, v); S.vy = rnd(-v, v * 0.3); S.w = rnd(-3, 3); }
X.mode.mot = (c, dt) => {
  const S = c.sp, C = S.carte; c.anim = 'agrippe'; c.spin *= Math.exp(-dt * 3);
  if (!C || !M || !M.cartes.includes(C)) { lache(c, 60); return; }
  // il avance le long du bord, patte après patte ; secoué fort (ou lassé), il lâche
  S.lx = clamp(S.lx + Math.sin(S.t * 1.3) * 14 * dt, -C.w / 2, C.w / 2);
  if (Math.hypot(C.vx, C.vy) > 650 || Math.abs(C.va) > 4) { lache(c, 220); say(c, pick(['aaah !', 'mia !', 'trop fort'])); return; }
  if (Wd.t > S.fin) { lache(c, 120); if (Math.random() < 0.4) say(c, pick(['hop', 'bon.', 'suivant !'])); }
};
X.envie.push(c => {
  if (!M) return false; const S = c.sp;
  // pendant l'écriture : courir après une pointe de stylo
  if (!M.fin && Math.random() < 0.18 && pointe()) { const k = Math.floor(Math.random() * 5); S.m = 'nage'; S.fin = Wd.t + 4;
    const ici = () => { const P = pointes(); return P[k % Math.max(1, P.length)] || null; };
    S.cible = { get x() { const p = ici(); return p ? p[0] : -9999; }, get y() { const p = ici(); return p ? p[1] : -9999; }, r: 1,
      arrive: c => { c.sp.m = 'derive'; c.sp.next = Wd.t + rnd(1.5, 3); c.sp.vx += rnd(-60, 60); c.sp.vy -= 40; say(c, pick(en() ? ['got the pen!', 'mine!'] : ['la craie !', 'attrapé !', 'à moi !', 'qu\'est-ce qu\'il écrit ?'])); } };
    return true; }
  // une carte déjà écrite : s'y pendre (deux chats au plus par carte)
  const L = M.cartes.filter(C => !C.tete && C.t1 && tps() >= C.t1 && Wd.cats.filter(o => o.sp && o.sp.carte === C).length < 2); if (!L.length || Math.random() < 0.5) return false;
  const C = pick(L), lx = rnd(-0.38, 0.38) * C.w;
  S.m = 'nage'; S.fin = Wd.t + 6; S.cible = { get x() { return vc(C, lx, C.h / 2)[0]; }, get y() { return vc(C, lx, C.h / 2)[1] + rayon(c) * 0.6; }, r: 1.2, arrive: c => pend(c, C) };
  return true;
});

/* ——— attraper une carte, la lancer (elle revient à sa place, sans se presser) ; un simple toucher épingle la compétence ——— */
const MOD = {
  drag(k, x, y) { const C = k.C; if (!C.tenu) { if (Math.hypot(x - k.x0, y - k.y0) < 6) return; C.tenu = true; k.px = x; k.py = y; k.t = Wd.t; }
    const dt = Math.max(1 / 120, Wd.t - k.t); k.t = Wd.t; k.vx = (x - k.px) / dt; k.vy = (y - k.py) / dt; C.dx += x - k.px; C.dy += y - k.py; k.px = x; k.py = y;
    C.a += (clamp(-k.vx * 0.0003, -0.4, 0.4) - C.a) * 0.15;
    if (Math.hypot(k.vx, k.vy) > 1600) Wd.cats.forEach(c => { if (c.sp && c.sp.carte === C) { lache(c, 300); say(c, 'wiii !'); } }); },
  release(k, vx, vy) { const C = k.C;
    if (!C.tenu) { M.mots.forEach(o => { o.pin = 0; }); M.cartes.forEach(o => { o.pin = 0; }); if (k.m) k.m.pin = Wd.t + 7; else C.pin = Wd.t + 7; return; }
    C.tenu = false; C.lance = Wd.t; const f = C.tete ? 0.4 : 1; C.vx = clamp(vx || 0, -1600, 1600) * f; C.vy = clamp(vy || 0, -1600, 1600) * f; C.va += clamp((vx || 0) * 0.0015, -4, 4) * f; }
};
X.grab.push((x, y) => {
  if (!M) return null;
  const C = carteA(x, y, 6); return C ? { mod: MOD, C, m: motA(x, y), x0: x, y0: y } : null;
});

/* ——— le dessin : la craie des cadres, le stylo des mots ; la pointe, au bout ——— */
// un tracé partiel : les u premiers pixels d'une ligne de points
function trace(ctx, b, r) { ctx.beginPath(); ctx.moveTo(b[0][0], b[0][1]); for (let i = 1; i < b.length && r > 0; i++) { const a = b[i - 1], z = b[i], l = Math.hypot(z[0] - a[0], z[1] - a[1]); if (r >= l) ctx.lineTo(z[0], z[1]); else ctx.lineTo(a[0] + (z[0] - a[0]) * r / l, a[1] + (z[1] - a[1]) * r / l); r -= l; } ctx.stroke(); }
X.fond.push((ctx, now) => {
  if (!M) return; const t = tps(); if (t < 0) return;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
  M.cartes.forEach(C => {
    if (!dessinee(C)) return;
    ctx.save(); const [ox, oy] = vc(C, 0, 0); ctx.translate(ox, oy); ctx.rotate(C.a);
    const b = C.cadre;
    if (b) { const u = clamp((t - b.t0) / b.d, 0, 1);
      // le fond de la carte : un voile de nuit (les étoiles derrière s'effacent un peu), qui se pose quand le cadre se ferme
      if (u > 0.9) { ctx.beginPath(); b.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = `rgba(6,8,12,${0.62 * sm((u - 0.9) / 0.1)})`; ctx.fill(); }
      // la craie : un trait, et un second plus pâle, un peu décalé (le grain)
      ctx.strokeStyle = `rgb(${BL})`; ctx.globalAlpha = 0.9; ctx.lineWidth = (C.ia ? 2.2 : 1.8) + C.survol * 0.6; trace(ctx, b, b.L * u);
      ctx.save(); ctx.translate(1.1, 0.8); ctx.globalAlpha = 0.28; ctx.lineWidth = 1.2; trace(ctx, b, b.L * u); ctx.restore();
      // la carte de l'IA : une lumière qui fait le tour de son cadre
      if (C.ia && u >= 1 && !reduit) { const q = pas(b, ((now * 0.09) % 1)); O.brille(ctx, q[0], q[1], 3.2, 0.95, false, now, 0); const q2 = pas(b, ((now * 0.09 + 0.5) % 1)); O.brille(ctx, q2[0], q2[1], 2.4, 0.7, false, now, 1); }
      ctx.globalAlpha = 1; }
    // les mots : leur puce (une petite étoile qui s'allume), puis leurs contours au stylo
    C.mots.forEach((m, i) => { if (t < m.t0) return;
      if (m.et) { const k = sm(clamp((t - m.t0) / 0.35, 0, 1)), R = m.eR * (1 + m.survol * 0.7) * k, x = m.lx + m.et[0], y = m.ly + m.et[1];
        O.brille(ctx, x, y, R, 0.7 + 0.2 * Math.sin(now * 2.1 + i + C.id) + m.survol * 0.4, true, now, i); ctx.globalAlpha = 1; ctx.fillStyle = `rgb(${BL})`; ctx.beginPath(); ctx.arc(x, y, R * 0.42, 0, TAU); ctx.fill(); }
      ctx.save(); ctx.translate(m.lx, m.ly); ctx.strokeStyle = `rgb(${BL})`; ctx.globalAlpha = m.estTitre || m.titre || m.survol > 0.05 || C.tete ? 1 : 0.88;
      ctx.lineWidth = (m.titre ? 2.4 : m.estTitre ? 2 : 1.6) + m.survol * 0.5;
      m.boucles.forEach(q => { if (t < q.t0) return; const u = (t - q.t0) / q.d; trace(ctx, q, u >= 1 ? 1e9 : q.L * u); });
      // (le titre de la carte : souligné à la craie)
      if (m.estTitre && !C.tete) { const u = clamp((t - m.t1) / 0.3, 0, 1); if (u > 0) { ctx.lineWidth = 1.4; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(m.px * 0.3, m.h * 0.86); ctx.quadraticCurveTo(m.px * 0.3 + m.tw * 0.5 * u, m.h * 0.9, m.px * 0.3 + m.tw * u, m.h * 0.85); ctx.stroke(); } }
      ctx.restore(); });
    ctx.restore();
  });
  // les preuves : écrites au stylo en bas, et gommées de même
  M.preuves.forEach(p => { if (p.u <= 0 || !p.C) return; ctx.save(); ctx.translate(p.hx, p.hy); ctx.globalAlpha = 0.92; ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1.4;
    let r = p.L * p.u; for (const b of p.C.boucles) { if (r <= 0) break; trace(ctx, b, r); r -= b.L; }
    ctx.restore(); });
  ctx.restore();
});
X.devant.push(ctx => { const P = pointes(); if (!P.length) return; ctx.save(); ctx.fillStyle = `rgb(${BL})`; P.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, TAU); ctx.fill(); }); ctx.restore(); });

return { get M() { return M; }, pointe, get planete() { return M && M.planete; }, set onFini(f) { onFini = f; }, get fini() { return !!(M && M.fin); } };
})();
