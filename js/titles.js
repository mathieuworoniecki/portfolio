/* Les titres, écrits à la craie sur le plan, au fil du film.
   Chaque titre est tracé le long du contour de ses lettres, de gauche à droite. Rien ne défile : c'est la scène
   qui dit où en est l'écriture, Titles.progress(el, p) avec p de 0 (rien) à 1 (écrit) ; en revenant en arrière
   sur la ligne du temps, il s'efface.
   Pour que ce soit vraiment de la craie : un trait irrégulier qui saute par endroits, du grain, de la poussière,
   des traces d'effaçage, et des annotations à la main (data-chalk sur le titre) :
     data-chalk="underline"        un double soulignement griffonné
     data-chalk="circle"           le dernier mot entouré
     data-chalk="arrow"            une flèche vers la droite ("arrow-left" : vers la gauche)
     data-chalk-strike="texte"     un premier jet écrit au-dessus, puis barré
     data-chalk-note="texte"       une note à côté, cerclée
     data-morph="Mot"              le titre s'écrit, puis son premier mot est barré ; « Mot » tombe dessus et le chasse,
                                   le deuxième mot s'efface, le reste se resserre (« Rien ne change. » → « Tout change. »)
   Tout est fixé une fois pour toutes (rien ne tremble) ; seule la pointe de craie bouge pendant qu'elle écrit.
   Les titres restent dans la page (h1, h2) pour la lecture et le référencement, transparents : cette toile les dessine.
   Un titre suit l'opacité de sa scène (.scene, posée par js/film.js). */
window.Titles = (() => {
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); };
let INK, HAND, WOB, GR, HS, HW, TR;
// le thème (js/theme.js), relu à chaque changement ; la mise en page des titres est alors refaite (js/film.js → resize)
const sync = () => { const TH = window.THEME || {}; INK = TH.ink || '238,245,255'; HAND = TH.hand || '"Caveat","Segoe Print",cursive'; WOB = TH.wobble ?? 1; GR = TH.grain ?? 1; HS = TH.handScale || 1; HW = TH.handWeight || 600; TR = !!TH.trace; };
sync(); addEventListener('themechange', sync);
let grainA = 0.5, cv, ctx, W = 1, H = 1, dpr = 1, items = [], t0 = 0, reduced = false, grain = null;
const PASSES = w => WOB ? [[w, 0.9], [w * 0.55, 0.42], [w * 0.35, 0.28]] : [[w * 0.7, 1]];   // la craie : trois passages ; la machine : un trait net
function hash(a, b) { let x = (Math.imul(a | 0, 374761393) + Math.imul((b | 0) + 1, 668265263)) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
// les lignes telles que la page les affiche : on regroupe les mots selon la hauteur de leur boîte
function domLines(el, upper) {
  const tn = el.firstChild; if (!tn || tn.nodeType !== 3 || !document.createRange) return null;
  // un mot, ou un caractère chinois / japonais (écritures sans espaces) ; chaque ligne reprend le texte tel qu'il est écrit
  const str = tn.textContent, rg = document.createRange(), out = [], re = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]|[^\s\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]+/g;
  let top = null, start = -1, end = 0, m;
  const push = () => { if (start >= 0) { const t = str.slice(start, end).trim(); out.push(upper ? t.toUpperCase() : t); } };
  while ((m = re.exec(str))) { rg.setStart(tn, m.index); rg.setEnd(tn, m.index + m[0].length); const rr = rg.getClientRects()[0]; if (!rr) return null;
    if (top !== null && rr.top > top + rr.height * 0.5) { push(); start = -1; } if (start < 0) { start = m.index; top = rr.top; } end = m.index + m[0].length; }
  push();
  return out.length ? out : null;
}
function wrap(x, text, maxW) { const L = []; let cur = ''; for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { L.push(cur); cur = w; } else cur = t; } if (cur) L.push(cur); return L; }

/* le contour des lettres : carrés qui marchent sur l'image du texte, segments recousus en lignes */
function contours(a, w, h) {
  const v = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : (a[(y * w + x) * 4 + 3] > 110 ? 1 : 0), segs = [];
  for (let y = -1; y < h; y++) for (let x = -1; x < w; x++) {
    const c = v(x, y) * 8 + v(x + 1, y) * 4 + v(x + 1, y + 1) * 2 + v(x, y + 1);
    if (c === 0 || c === 15) continue;
    const T = [x + 0.5, y], R = [x + 1, y + 0.5], B = [x + 0.5, y + 1], L = [x, y + 0.5];
    switch (c) {
      case 1: case 14: segs.push([L, B]); break; case 2: case 13: segs.push([B, R]); break;
      case 3: case 12: segs.push([L, R]); break; case 4: case 11: segs.push([T, R]); break;
      case 5: segs.push([L, T], [B, R]); break; case 6: case 9: segs.push([T, B]); break;
      case 7: case 8: segs.push([L, T]); break; case 10: segs.push([T, R], [L, B]); break;
    }
  }
  const key = p => p[0] * 2 + ',' + p[1] * 2, map = new Map();
  segs.forEach((s, i) => s.forEach(p => { const k = key(p); if (!map.has(k)) map.set(k, []); map.get(k).push(i); }));
  const used = new Uint8Array(segs.length), lines = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue; used[i] = 1; const line = [segs[i][0], segs[i][1]];
    for (;;) { const k = key(line[line.length - 1]), nx = (map.get(k) || []).find(j => !used[j]); if (nx === undefined) break; used[nx] = 1; const s = segs[nx]; line.push(key(s[0]) === k ? s[1] : s[0]); }
    if (line.length > 6) lines.push(line);
  }
  return lines;
}
const rdp = (P, e) => { if (P.length < 3) return P; const a = P[0], b = P[P.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1; let mi = 0, md = 0; for (let i = 1; i < P.length - 1; i++) { const d = Math.abs(dx * (P[i][1] - a[1]) - dy * (P[i][0] - a[0])) / n; if (d > md) { md = d; mi = i; } } return md > e ? rdp(P.slice(0, mi + 1), e).slice(0, -1).concat(rdp(P.slice(mi), e)) : [a, b]; };
function tidy(P, eps) { const m = Math.floor(P.length / 2); return rdp(P.slice(0, m + 1), eps).slice(0, -1).concat(rdp(P.slice(m), eps)); }
// densifier une ligne et lui donner un tremblé de main, fixé par une graine
function hand(P, seed, amp, step) {
  const Q = [];
  for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) Q.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  Q.push(P[P.length - 1]);
  let L = 0; return Q.map((p, i) => { if (i) L += Math.hypot(p[0] - Q[i - 1][0], p[1] - Q[i - 1][1]); const u = L * 0.08 + seed * 7.1; return [p[0] + amp * (Math.sin(u) * 0.6 + Math.sin(u * 2.7 + seed) * 0.4), p[1] + amp * (Math.sin(u * 1.3 + 2) * 0.6 + Math.sin(u * 3.1 + seed * 2) * 0.4)]; });
}
const plen = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };

/* ——— le trait unique : l'âme des lettres (squelette), pour les écrire d'un seul trait épais, comme une craie de couleur ———
   On amincit l'image du texte jusqu'à un pixel (Zhang-Suen, seulement sur les pixels de l'encre), on mesure l'épaisseur
   des lettres (distance au bord), puis on recoud les pixels en lignes, qu'on écrit de gauche à droite. */
function skeleton(a, w, h) {
  const B = new Uint8Array(w * h); let fg = [];
  for (let i = 0; i < w * h; i++) if (a[i * 4 + 3] > 110) { B[i] = 1; fg.push(i); }
  // l'épaisseur : distance au bord (chanfrein 3-4), en deux passes
  const D = new Uint16Array(w * h), INF = 60000;
  for (let i = 0; i < w * h; i++) D[i] = B[i] ? INF : 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (!D[i]) continue; D[i] = Math.min(D[i], D[i - 1] + 3, D[i - w] + 3, D[i - w - 1] + 4, D[i - w + 1] + 4); }
  for (let y = h - 2; y > 0; y--) for (let x = w - 2; x > 0; x--) { const i = y * w + x; if (!D[i]) continue; D[i] = Math.min(D[i], D[i + 1] + 3, D[i + w] + 3, D[i + w + 1] + 4, D[i + w - 1] + 4); }
  // l'amincissement (Zhang-Suen)
  const nb = i => [B[i - w], B[i - w + 1], B[i + 1], B[i + w + 1], B[i + w], B[i + w - 1], B[i - 1], B[i - w - 1]];
  fg = fg.filter(i => { const x = i % w, y = (i / w) | 0; return x > 0 && y > 0 && x < w - 1 && y < h - 1; });
  for (let changed = true, it = 0; changed && it < 80; it++) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const del = [];
      for (const i of fg) {
        if (!B[i]) continue; const P = nb(i); let n = 0, t = 0; for (let k = 0; k < 8; k++) { n += P[k]; if (!P[k] && P[(k + 1) % 8]) t++; }
        if (n < 2 || n > 6 || t !== 1) continue;
        if (pass === 0 ? (P[0] * P[2] * P[4] || P[2] * P[4] * P[6]) : (P[0] * P[2] * P[6] || P[0] * P[4] * P[6])) continue;
        del.push(i);
      }
      if (del.length) { changed = true; del.forEach(i => { B[i] = 0; }); }
    }
    fg = fg.filter(i => B[i]);
  }
  // les marches d'escalier (un pixel de trop dans un coin) : on les retire, pour que chaque pixel n'ait que ses vrais voisins
  for (const i of fg) { if (!B[i]) continue; const N = B[i - w], E = B[i + 1], S = B[i + w], W = B[i - 1];
    if ((N && E && !B[i + w - 1] && !S && !W) || (E && S && !B[i - w - 1] && !N && !W) || (S && W && !B[i - w + 1] && !N && !E) || (W && N && !B[i + w + 1] && !S && !E)) B[i] = 0; }
  fg = fg.filter(i => B[i]);
  let th = 0; fg.forEach(i => { th += D[i]; }); th = fg.length ? th / fg.length / 3 * 2 : 1;   // l'épaisseur moyenne du trait (px de l'image)
  // recoudre : partir des bouts (un seul voisin), suivre les voisins encore libres ; puis les boucles qui restent
  const O = [-w, 1, w, -1, -w + 1, w + 1, w - 1, -w - 1], seen = new Uint8Array(w * h), deg = i => { let n = 0; for (const o of O) n += B[i + o]; return n; };
  const walk = s0 => { const L = [s0]; seen[s0] = 1; let c = s0;
    for (;;) { let nx = -1; for (const o of O) { const j = c + o; if (B[j] && !seen[j]) { nx = j; break; } } if (nx < 0) break; seen[nx] = 1; L.push(nx); c = nx; }
    // refermer une boucle (o, a, e…) : le dernier pixel touche le premier
    if (L.length > 8) for (const o of O) if (c + o === s0) { L.push(s0); break; }
    return L.map(i => [i % w, (i / w) | 0]); };
  const lines = [];
  fg.filter(i => deg(i) === 1).sort((p, q) => (p % w) - (q % w)).forEach(i => { if (!seen[i]) lines.push(walk(i)); });
  fg.forEach(i => { if (!seen[i]) lines.push(walk(i)); });
  return { lines, th };
}
// lisser une ligne de pixels (moyenne glissante), puis la simplifier
function smooth(P, k) { if (P.length < 5) return P; const Q = P.map((p, i) => { let x = 0, y = 0, n = 0; for (let j = Math.max(0, i - k); j <= Math.min(P.length - 1, i + k); j++) { x += P[j][0]; y += P[j][1]; n++; } return [x / n, y / n]; }); Q[0] = P[0]; Q[Q.length - 1] = P[P.length - 1]; return Q; }
/* un texte, en traits : trace(str, font, size) → { strokes: [[x, y]…], th (épaisseur, px), w, h } (px de la page, texte posé à gauche, milieu en y = lh / 2) */
function traceText(lines, font, size, lh, width, align, ls) {
  const S = Math.max(1, Math.min(3, 110 / size)), c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
  const set = () => { x.font = font.replace(/(\d+(?:\.\d+)?)px/, (m, v) => (v * S) + 'px'); if ('letterSpacing' in x) x.letterSpacing = (ls || 0) * S + 'px'; }; set();
  const W = width || Math.max(...lines.map(l => x.measureText(l).width / S));
  c.width = Math.ceil((W + 40) * S); c.height = Math.ceil((lines.length * lh + 40) * S); set();
  x.textAlign = align || 'left'; x.textBaseline = 'middle'; x.fillStyle = '#000';
  const ax = align === 'center' ? 20 + W / 2 : align === 'right' ? 20 + W : 20;
  lines.forEach((l, j) => x.fillText(l, ax * S, (20 + lh * (j + 0.5)) * S));
  const sk = skeleton(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
  const th = sk.th / S;
  const strokes = sk.lines.map(l => { let P = smooth(l, Math.round(1.5 * S)).map(p => [p[0] / S - 20, p[1] / S - 20]); P = P.length > 4 ? tidy(P, 0.35) : P;
    // un point (le point du i, la ponctuation) : un tout petit trait, que l'épaisseur arrondit
    if (plen(P) < th * 0.9) { const cx = P.reduce((q, p) => q + p[0], 0) / P.length, cy = P.reduce((q, p) => q + p[1], 0) / P.length; P = [[cx - th * 0.22, cy + th * 0.1], [cx + th * 0.22, cy - th * 0.1]]; }
    // écrire de gauche à droite : chaque trait part de son bout le plus à gauche (le plus haut s'il est vertical)
    const a = P[0], b = P[P.length - 1]; if (b[0] < a[0] - 2 || (Math.abs(b[0] - a[0]) <= 2 && b[1] < a[1])) P.reverse();
    P.x = Math.min(...P.map(p => p[0])); P.row = Math.floor(Math.min(...P.map(p => p[1])) / lh); P.len = plen(P); return P; });
  strokes.sort((p, q) => p.row - q.row || p.x - q.x);
  return { strokes, th, w: W, h: lines.length * lh };
}

// la mise en page d'un titre, lue dans la page, son contour à écrire et ses annotations
function layout(it, idx) {
  const d0 = it.el.dataset, el = it.el, cs = getComputedStyle(el), r = el.getBoundingClientRect(), S = parseFloat(cs.fontSize) < 50 ? 4 : 2;   // petits titres (téléphone) : un contour plus précis
  const size = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || size * 0.95;
  const text = cs.textTransform === 'uppercase' ? el.textContent.trim().toUpperCase() : el.textContent.trim();
  const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true }), font = `${cs.fontWeight} ${size * S}px ${cs.fontFamily}`;
  x.font = font; const ls = parseFloat(cs.letterSpacing) || 0; if ('letterSpacing' in x) x.letterSpacing = ls * S + 'px';
  const lines = domLines(el, cs.textTransform === 'uppercase') || wrap(x, text, (r.width + 2) * S);   // les retours à la ligne de la page, exactement
  c.width = Math.ceil((r.width + 20) * S); c.height = Math.ceil((lines.length * lh + 20) * S);
  x.font = font; if ('letterSpacing' in x) x.letterSpacing = ls * S + 'px';
  const align = cs.textAlign === 'center' ? 'center' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : 'left';
  x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = '#000';
  const ax = align === 'center' ? 10 + r.width / 2 : align === 'right' ? 10 + r.width : 10;
  lines.forEach((l, j) => x.fillText(l, ax * S, (10 + lh * (j + 0.5)) * S));
  // la place du dernier mot (pour l'entourer, le souligner)
  const lastLine = lines[lines.length - 1], lw = x.measureText(lastLine).width / S, lastWord = lastLine.split(' ').pop(), ww = x.measureText(lastWord).width / S;
  const lx0 = align === 'center' ? r.width / 2 - lw / 2 : align === 'right' ? r.width - lw : 0;
  it.last = { x0: lx0 + lw - ww, x1: lx0 + lw, y: lh * (lines.length - 0.5), lx0, lw, lh };
  const loops = contours(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height).map(l => tidy(l, 0.7).map(p => [p[0] / S - 10, p[1] / S - 10]));
  loops.forEach(l => { l.x = Math.min(...l.map(p => p[0])); l.row = Math.floor(Math.min(...l.map(p => p[1])) / lh); });
  loops.sort((a, b) => a.row - b.row || a.x - b.x);
  // l'épaisseur et le tremblé suivent la taille du titre : un petit titre garde des traits fins et nets
  const w = Math.max(1.5, Math.min(3.6, size * 0.034)), fk = Math.max(0.35, Math.min(1, size / 64));
  // chaque boucle, préparée pour trois passages de craie, avec ses sauts et sa poussière (fixés une fois pour toutes)
  it.loops = loops.map((l, i) => {
    const P = l.length > 2 && Math.hypot(l[0][0] - l[l.length - 1][0], l[0][1] - l[l.length - 1][1]) < 2 ? l : l;
    const passes = [0, 1, 2].map(k => hand(P, idx * 97 + i * 13 + k * 5, (k ? 0.9 : 0.45) * fk * WOB, 4 * Math.max(0.5, fk)));
    const dash = WOB ? [30 + hash(i, idx) * 70, 1.2 + hash(i, 7) * 2.5, 20 + hash(i, 3) * 60, 0.8 + hash(i, 9) * 2] : [];
    const dust = []; for (let k = 0; k < (3 + hash(i, 11) * 4) * fk * WOB; k++) { const q = P[Math.floor(hash(i * 7 + k, 21) * P.length)]; dust.push([q[0] + (hash(i, k * 3) - 0.5) * 9, q[1] + (hash(k, i * 5) - 0.3) * 10, 0.6 + hash(i + k, 2) * 1.2]); }
    return { passes, dash, dust, len: plen(passes[0]) };
  });
  it.total = it.loops.reduce((s, l) => s + l.len, 0); it.size = size; it.w = w; it.box = { w: r.width, h: lines.length * lh };
  // le trait unique (l'esquisse) : l'âme des lettres, écrite d'un trait épais ; les annotations restent à la craie
  it.tr = null;
  if (TR && !d0.morph) {
    const T = traceText(lines, `${cs.fontWeight} ${size}px ${cs.fontFamily}`, size, lh, r.width, align, ls);
    T.strokes = T.strokes.map((P, i) => { const Q = hand(P, idx * 31 + i * 7, 0.35 * WOB, 3); Q.len = plen(Q); return Q; });
    T.dust = []; T.strokes.forEach((P, i) => { for (let k = 0; k < 2 + hash(i, idx) * 3; k++) { const q = P[Math.floor(hash(i * 7 + k, 23) * P.length)]; T.dust.push([q[0] + (hash(i, k * 3) - 0.5) * T.th * 2.4, q[1] + (hash(k, i * 5) - 0.3) * T.th * 2.2, 0.7 + hash(i + k, 4) * 1.3, i]); } });
    T.total = T.strokes.reduce((q, P) => q + P.len, 0); it.tr = T;
  }
  // les annotations
  const d = el.dataset, notes = [];
  const scrib = (P, seed, amp) => { const Q = hand(P, seed, amp, 5); return { P: Q, len: plen(Q) }; };
  const L = it.last;
  if (d.chalk === 'underline') { const y = L.y + L.lh * 0.52; notes.push({ k: 'line', from: 0.78, ...scrib([[L.lx0 - 6, y + 3], [L.lx0 + L.lw * 0.5, y], [L.lx0 + L.lw + 10, y - 3]], idx * 3 + 1, 1.6) }, { k: 'line', from: 0.88, ...scrib([[L.lx0 + L.lw * 0.1, y + 10], [L.lx0 + L.lw * 0.95, y + 7]], idx * 3 + 2, 1.4) }); }
  if (d.chalk === 'circle') { const cx = (L.x0 + L.x1) / 2, cy = L.y, rx = (L.x1 - L.x0) / 2 + 14, ry = L.lh * 0.62, P = []; for (let k = 0; k <= 44; k++) { const t = -2.2 + k / 40 * Math.PI * 2 * 1.05, g = 1 + (hash(k, idx) - 0.5) * 0.05; P.push([cx + Math.cos(t) * rx * g, cy + Math.sin(t) * ry * g + k * 0.12]); } notes.push({ k: 'line', from: 0.8, ...scrib(P, idx * 5, 1.2) }); }
  if (d.chalk === 'arrow-left') { const x0 = L.lx0 - 16, y0 = L.y - L.lh * 0.1, x1 = x0 - Math.min(180, W * 0.12), y1 = y0 - 34; notes.push({ k: 'line', from: 0.78, ...scrib([[x0, y0], [x0 + (x1 - x0) * 0.5, y0 - 26], [x1, y1]], idx * 7, 1.3) }, { k: 'line', from: 0.93, ...scrib([[x1 + 16, y1 - 12], [x1, y1], [x1 + 20, y1 + 8]], idx * 7 + 1, 0.8) }); }
  if (d.chalk === 'arrow') { const x0 = L.x1 + 14, y0 = L.y - L.lh * 0.1, x1 = x0 + Math.min(180, W * 0.12), y1 = y0 - 34; notes.push({ k: 'line', from: 0.78, ...scrib([[x0, y0], [x0 + (x1 - x0) * 0.5, y0 - 26], [x1, y1]], idx * 7, 1.3) }, { k: 'line', from: 0.93, ...scrib([[x1 - 16, y1 - 12], [x1, y1], [x1 - 20, y1 + 8]], idx * 7 + 1, 0.8) }); }
  if (d.chalkStrike) { const fs = Math.max(20, size * 0.42), y = -fs * 0.6 - 46;  /* au-dessus de l'étiquette d'étape */ notes.push({ k: 'text', text: d.chalkStrike, x: lx0 + 4, y, fs, from: 0, to: 0.22, rot: -0.04 });
    const tw = (() => { x.font = `${HW} ${fs * HS}px ${HAND}`; return x.measureText(d.chalkStrike).width; })();
    notes.push({ k: 'line', from: 0.22, to: 0.3, ...scrib([[lx0 - 2, y + 3], [lx0 + tw * 0.5, y - 1], [lx0 + tw + 8, y - 4]], idx * 11, 1.2) }, { k: 'line', from: 0.28, to: 0.36, ...scrib([[lx0, y - 6], [lx0 + tw + 4, y + 6]], idx * 11 + 1, 1) }); it.delay = 0.3; }
  if (d.chalkNote) { const fs = Math.max(22, size * 0.55), x0 = L.x1 + 22, y = L.y; notes.push({ k: 'text', text: d.chalkNote, x: x0, y, fs, from: 0.8, to: 0.92, rot: -0.08 });
    x.font = `${HW} ${fs * HS}px ${HAND}`; const tw = x.measureText(d.chalkNote).width, P = []; for (let k = 0; k <= 40; k++) { const t = -2 + k / 36 * Math.PI * 2; P.push([x0 + tw / 2 + Math.cos(t) * (tw / 2 + 14), y + Math.sin(t) * fs * 0.62 + k * 0.1]); }
    notes.push({ k: 'line', from: 0.9, ...scrib(P, idx * 13, 1.1) }); }
  // des points de craie en fin de titre
  it.dots = d.chalk === 'none' ? [] : [0, 1, 2].map(k => [L.lx0 + L.lw + 8 + k * 9 + hash(k, idx) * 3, L.y + L.lh * 0.28 + hash(idx, k) * 3, 1.4 + hash(k, idx * 3) * 1.2]).slice(0, (d.chalk || '').startsWith('arrow') || d.chalkNote ? 0 : 1 + Math.floor(hash(idx, 5) * 2));
  // les traces d'effaçage derrière le titre
  it.smudge = [0, 1, 2, 3].map(k => [lx0 - 20 + hash(k, idx) * 40, lh * (hash(idx, k) * lines.length), lw * (0.6 + hash(k + 3, idx) * 0.6), 8 + hash(k, idx + 9) * 16]);
  it.notes = notes; it.delay = it.delay || 0;
  it.lh = lh;
  it.morph = d.morph ? morphLayout(el, d.morph, +(d.morphDrop ?? 1), text, font, ls, S, lh, r, align, x, idx) : null;
}
/* ——— le titre qui se transforme : chaque mot a son propre contour, et sa place avant / après ——— */
function wordLoops(font, ls, S, lh, str, idx) {
  const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
  const set = () => { x.font = font; if ('letterSpacing' in x) x.letterSpacing = ls * S + 'px'; }; set();
  const w = x.measureText(str).width / S; c.width = Math.ceil((w + 20) * S); c.height = Math.ceil((lh + 20) * S); set();
  x.textBaseline = 'middle'; x.fillStyle = '#000'; x.fillText(str, 10 * S, (10 + lh / 2) * S);
  const L = contours(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height).map(l => tidy(l, 0.7).map(p => [p[0] / S - 10, p[1] / S - 10 - lh / 2]));
  L.forEach(l => { l.x = Math.min(...l.map(p => p[0])); }); L.sort((a, b) => a.x - b.x);
  const loops = L.map((l, i) => { const passes = [0, 1, 2].map(k => hand(l, idx * 97 + i * 13 + k * 5, (k ? 0.9 : 0.45) * Math.max(0.35, Math.min(1, lh / 60)), 4)); return { passes, dash: [30 + hash(i, idx) * 70, 1.2 + hash(i, 7) * 2.5, 20 + hash(i, 3) * 60, 0.8 + hash(i, 9) * 2], len: plen(passes[0]) }; });
  return { loops, w, total: loops.reduce((s, l) => s + l.len, 0) };
}
function placeWords(x, text, maxW, S, lh, rw, align) {
  const out = []; wrap(x, text, maxW).forEach((line, j) => {
    const lw = x.measureText(line).width / S, x0 = align === 'center' ? rw / 2 - lw / 2 : align === 'right' ? rw - lw : 0, ws = line.split(' ');
    ws.forEach((w, k) => out.push({ x: x0 + (k ? x.measureText(ws.slice(0, k).join(' ') + ' ').width / S : 0), y: lh * (j + 0.5) }));
  }); return out;
}
// drop : combien de mots, après le premier, s'effacent (« Rien ne change » → « Tout change » : 1 ; « Nothing changes » → « Everything changes » : 0)
function morphLayout(el, word, drop, text, font, ls, S, lh, r, align, x, idx) {
  const up = s => getComputedStyle(el).textTransform === 'uppercase' ? s.toUpperCase() : s, words = text.split(' '), neu = up(word);
  x.font = font; if ('letterSpacing' in x) x.letterSpacing = ls * S + 'px';
  const before = placeWords(x, text, (r.width + 2) * S, S, lh, r.width, align), after = placeWords(x, [neu].concat(words.slice(1 + drop)).join(' '), (r.width + 2) * S, S, lh, r.width, align);
  const W = words.map((w, i) => Object.assign(wordLoops(font, ls, S, lh, w, idx * 7 + i), before[i]));
  W.slice(1 + drop).forEach((w, i) => { w.x1 = after[i + 1].x; w.y1 = after[i + 1].y; });
  const T = Object.assign(wordLoops(font, ls, S, lh, neu, idx * 7 + 9), { x1: after[0].x, y1: after[0].y });
  // le trait qui barre le premier mot, et le double soulignement du nouveau (fixés une fois pour toutes)
  const f = W[0], strike = [hand([[-6, 4], [f.w * 0.5, -2], [f.w + 8, -6]], idx * 11, 1.4, 5), hand([[-2, -8], [f.w + 4, 8]], idx * 11 + 1, 1.2, 5)];
  const under = [hand([[-6, lh * 0.55], [T.w * 0.5, lh * 0.5], [T.w + 10, lh * 0.47]], idx * 13, 1.5, 5), hand([[T.w * 0.08, lh * 0.64], [T.w * 0.95, lh * 0.6]], idx * 13 + 1, 1.3, 5)];
  return { drop, W, T, strike: strike.map(P => ({ P, len: plen(P) })), under: under.map(P => ({ P, len: plen(P) })), t: null };
}
// un mot, tracé jusqu'à prog, posé en (x, y) (bord gauche, milieu de la ligne), tourné autour de son centre
function drawWord(wd, x, y, prog, rot, alpha, w, p) {
  if (prog <= 0.001 || alpha <= 0.005) return;
  ctx.save(); const ga = ctx.globalAlpha; ctx.globalAlpha = ga * alpha; ctx.translate(x + wd.w / 2, y); ctx.rotate(rot || 0);
  const budget = wd.total * prog; let tip = null; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  PASSES(w).forEach(([lw, a], pass) => {
    ctx.strokeStyle = `rgba(${INK},${a})`; ctx.lineWidth = lw; let used = 0;
    for (const l of wd.loops) { if (used >= budget) break; ctx.setLineDash(pass === 0 ? l.dash : []); const t = trace(l.passes[pass], Math.min(l.len, budget - used), -wd.w / 2, 0); used += l.len; if (!pass && t) tip = t; }
  });
  ctx.setLineDash([]); if (prog < 0.999) chalkTip(tip, w, p);
  ctx.restore();
}
function scribble(n, a, ox, oy, w, p) { if (a <= 0) return; ctx.strokeStyle = `rgba(${INK},0.9)`; ctx.lineWidth = w * 0.9; const t = trace(n.P, n.len * a, ox, oy); ctx.strokeStyle = `rgba(${INK},0.35)`; ctx.lineWidth = w * 0.4; trace(n.P.map(q => [q[0] + 0.8, q[1] + 0.6]), n.len * a, ox, oy); if (a < 1) chalkTip(t, w * 0.8, p); }
const backOut = v => { v = c01(v); const s = 1.7; return 1 + (s + 1) * Math.pow(v - 1, 3) + s * Math.pow(v - 1, 2); };
function writeMorph(it, r, now) {
  const M = it.morph, w = it.w, lh = it.lh;
  // l'écriture (le premier 60 % de la progression), puis la transformation ; la chute et la poussée suivent leur propre horloge
  const p = reduced ? 1 : c01(it.p / 0.6), m = reduced ? 1 : c01((it.p - 0.55) / 0.45);
  if (m >= 0.34 && M.t === null) M.t = now; if (m < 0.12) M.t = null;
  const tau = reduced ? 9 : M.t === null ? -1 : (now - M.t) / 1000;
  // les mots d'origine s'écrivent l'un après l'autre
  const tot = M.W.reduce((s, x) => s + x.total, 0); let acc = 0;
  M.W.forEach((wd, i) => {
    const pr = c01((p * tot - acc) / wd.total); acc += wd.total;
    let x = r.left + wd.x, y = r.top + wd.y, rot = 0, al = 1;
    if (i === 0 && tau > 0.4) {   // le premier mot : heurté par le nouveau, il saute et tombe en tournant
      const d = tau - 0.4; x -= 210 * d; y += -260 * d + 0.5 * 2600 * d * d; rot = -2.4 * d - 0.6 * d * d; al = 1 - c01((d - 0.5) / 0.5);
    }
    if (i >= 1 && i <= M.drop) al = 1 - sm((tau - 0.5) / 0.45);   // les mots en trop s'effacent
    if (i > M.drop) { const k = backOut((tau - 0.9) / 0.55); x = r.left + wd.x + (wd.x1 - wd.x) * k; y = r.top + wd.y + (wd.y1 - wd.y) * c01(k); }
    drawWord(wd, x, y, pr, rot, al, w, p);
    // le trait qui barre le premier mot le suit dans sa chute
    if (i === 0 && al > 0.01) { ctx.save(); ctx.globalAlpha *= al; ctx.translate(x + wd.w / 2, y); ctx.rotate(rot); const s = c01((m - 0.02) / 0.22); M.strike.forEach((n, j) => scribble(n, c01(s * 2 - j), -wd.w / 2, 0, w, p)); ctx.restore(); }
    // l'effaçage : quelques passes de chiffon sur le deuxième mot
    if (i >= 1 && i <= M.drop && tau > 0.45 && tau < 1.3) { const e = sm((tau - 0.45) / 0.3) * (1 - sm((tau - 0.95) / 0.35)); ctx.strokeStyle = `rgba(${INK},${(0.09 * e).toFixed(3)})`; ctx.lineWidth = lh * 0.35; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - 10, y - lh * 0.22 + k * lh * 0.22); ctx.lineTo(x + wd.w + 10, y - lh * 0.28 + k * lh * 0.22); ctx.stroke(); } }
  });
  // le nouveau mot : écrit au-dessus, il tombe (gravité), frappe, rebondit, puis prend sa place
  if (tau > 0) {
    const T = M.T, f = M.W[0], fall = c01(tau / 0.4), land = tau > 0.4 ? Math.abs(Math.sin((tau - 0.4) * 13)) * Math.exp(-(tau - 0.4) * 6) * lh * 0.12 : 0, k = backOut((tau - 0.9) / 0.55);
    const x = r.left + f.x + (T.x1 - f.x) * k, y = r.top + f.y - lh * 1.15 * (1 - fall * fall) - land + (T.y1 - f.y) * c01(k), rot = (1 - fall) * 0.12;
    drawWord(T, x, y, c01(tau / 0.32), rot, 1, w, p);
    M.under.forEach((n, j) => scribble(n, c01((tau - 1.45 - j * 0.18) / 0.3), x, y, w, p));
  }
}
function init(canvas, els, isReduced) { cv = canvas; ctx = cv.getContext('2d'); if (window.Chalk) Chalk.ctx = ctx; reduced = isReduced; t0 = performance.now(); items = els.map(el => ({ el, p: 0 })); }
// la progression d'écriture d'un titre (0 → 1), donnée par sa scène à chaque image
function progress(el, p) { const it = items.find(i => i.el === el); if (it) it.p = p; }
function resize(w, h) {
  // pleine densité (jusqu'à 3×) : sinon le navigateur agrandit la toile et la craie devient floue
  W = w; H = h; dpr = Math.min(window.devicePixelRatio || 1, 3); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  items.forEach(layout);
  // le grain de la craie : de petits manques, surtout en travers (le relief du tableau) ; dessiné en vrais pixels d'écran,
  // à des positions entières, pour qu'il reste net quel que soit le zoom de l'écran (125 %, 150 %, téléphones…)
  // sur petit écran, le trait est fin : le grain aussi (des manques d'un pixel d'écran, et moins marqués) — sinon il hache le trait
  const small = Math.min(w, h) < 600, T = Math.round(180 * dpr), px = small ? 1 : Math.max(1, Math.round(dpr)), g = document.createElement('canvas'); g.width = g.height = T; const x = g.getContext('2d');
  for (let i = 0, n = Math.round(3200 * dpr * dpr / (px * px)); i < n; i++) { x.fillStyle = `rgba(0,0,0,${0.3 + hash(i, 1) * 0.7})`; x.fillRect(Math.floor(hash(i, 2) * T), Math.floor(hash(i, 3) * T), hash(i, 4) < 0.7 ? px : Math.round(2.5 * px), px); }
  grain = ctx.createPattern(g, 'repeat'); grainA = (small ? 0.3 : 0.5) * GR;
}

// tracer une ligne jusqu'à une longueur donnée ; renvoie la pointe
function trace(P, budget, ox, oy) {
  let used = 0, tip = null; ctx.beginPath(); ctx.moveTo(ox + P[0][0], oy + P[0][1]);
  for (let i = 1; i < P.length; i++) {
    const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    if (used + d > budget) { const f = (budget - used) / d; tip = [ox + P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, oy + P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f]; ctx.lineTo(tip[0], tip[1]); break; }
    ctx.lineTo(ox + P[i][0], oy + P[i][1]); used += d;
  }
  ctx.stroke(); return tip;
}
function chalkTip(tip, w, p, col) {
  if (!tip) return; col = col || INK;
  ctx.fillStyle = `rgba(${col},0.95)`; ctx.beginPath(); ctx.arc(tip[0], tip[1], w * 0.9, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 6; k++) { const s = (k * 7.31 + p * 97) % 1; ctx.fillStyle = `rgba(${col},${0.45 * (1 - s)})`; ctx.fillRect(tip[0] + Math.sin(k * 2.1 + p * 40) * 6, tip[1] + s * 16, 1.3, 1.3); }
}
function write(it, r, p) {
  if (p <= 0.001) return;
  const ox = r.left, oy = r.top;
  // les traces d'effaçage (un voile de craie étalée), qui apparaissent avec le titre
  ctx.lineCap = 'round';
  if (WOB && !it.tr) it.smudge.forEach((s, k) => { ctx.strokeStyle = `rgba(${INK},${(0.035 * sm(p * 3)).toFixed(3)})`; ctx.lineWidth = s[3]; ctx.beginPath(); ctx.moveTo(ox + s[0], oy + s[1]); ctx.lineTo(ox + s[0] + s[2], oy + s[1] + (hash(k, 3) - 0.5) * 10); ctx.stroke(); });
  if (it.tr) writeTrace(it, ox, oy, p); else {
  // le titre : trois passages de craie, avec des sauts
  const q = c01((p - it.delay) / (1 - it.delay) / 0.82), budget = it.total * q, w = it.w;
  let tip = null; ctx.lineJoin = 'round';
  PASSES(w).forEach(([lw, a], pass) => {
    ctx.strokeStyle = `rgba(${INK},${a})`; ctx.lineWidth = lw; let used = 0;
    for (const l of it.loops) {
      if (used >= budget) break;
      ctx.setLineDash(pass === 0 ? l.dash : []);
      const t = trace(l.passes[pass], Math.min(l.len, budget - used), ox, oy); used += l.len;
      if (!pass && t) tip = t;
    }
  });
  ctx.setLineDash([]);
  // la poussière posée le long des lettres déjà écrites
  let used = 0;
  for (const l of it.loops) { if (used > budget) break; used += l.len; l.dust.forEach(d => { ctx.fillStyle = `rgba(${INK},0.4)`; ctx.fillRect(ox + d[0], oy + d[1], d[2], d[2]); }); }
  if (q < 0.999) chalkTip(tip, w, p);
  }
  const w = it.w;
  // les annotations à la main
  it.notes.forEach(n => {
    const a = c01((p - n.from) / ((n.to || Math.min(1, n.from + 0.14)) - n.from)); if (a <= 0) return;
    if (n.k === 'line') {
      ctx.strokeStyle = `rgba(${INK},0.85)`; ctx.lineWidth = w * 0.8; const t = trace(n.P, n.len * a, ox, oy);
      ctx.strokeStyle = `rgba(${INK},0.35)`; ctx.lineWidth = w * 0.4; trace(n.P.map(q => [q[0] + 0.8, q[1] + 0.6]), n.len * a, ox, oy);
      if (a < 1) chalkTip(t, w * 0.8, p);
    } else {
      // l'écriture à la main se découvre de gauche à droite
      ctx.save(); ctx.translate(ox + n.x, oy + n.y); ctx.rotate(n.rot || 0);
      ctx.font = `${HW} ${n.fs * HS}px ${HAND}`; ctx.textBaseline = 'middle'; const tw = ctx.measureText(n.text).width;
      ctx.beginPath(); ctx.rect(-4, -n.fs, (tw + 8) * a, n.fs * 2); ctx.clip();
      ctx.fillStyle = `rgba(${INK},0.88)`; ctx.fillText(n.text, 0, 0); ctx.strokeStyle = `rgba(${INK},0.3)`; ctx.lineWidth = 0.8; ctx.strokeText(n.text, 0.8, 0.6);
      ctx.restore();
      if (a < 1) chalkTip([ox + n.x + tw * a, oy + n.y + n.fs * 0.1], w * 0.8, p);
    }
  });
  // quelques points de craie, tapés en fin de titre
  if (p > 0.96 && !it.tr) it.dots.forEach(d => { ctx.fillStyle = `rgba(${INK},0.8)`; ctx.beginPath(); ctx.arc(ox + d[0], oy + d[1], d[2], 0, Math.PI * 2); ctx.fill(); });
}
/* le trait unique, à la craie de couleur épaisse (data-ink="accent" : la couleur d'accent du thème) :
   un voile de poudre autour, le trait plein, un reflet plus clair au milieu ; la poussière tombe le long des lettres écrites */
function writeTrace(it, ox, oy, p) {
  const T = it.tr, col = it.el.dataset.ink === 'accent' ? ((window.THEME && THEME.accent) || INK) : INK, lite = col.split(',').map(v => Math.round(+v + (255 - v) * 0.45)).join(',');
  const q = c01((p - it.delay) / (1 - it.delay) / 0.9), budget = T.total * q, w = Math.max(2.2, T.th * 1.12);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pass = (lw, style, dx, dy) => { ctx.strokeStyle = style; ctx.lineWidth = lw; let used = 0, tip = null;
    for (const P of T.strokes) { if (used >= budget) break; const t = trace(P, Math.min(P.len, budget - used), ox + dx, oy + dy); used += P.len; if (t) tip = t; else tip = null; }
    return tip; };
  // une grosse craie : un voile de poudre, le trait, puis des manques (le relief du papier) grattés dedans, et un reflet clair
  pass(w * 1.7, `rgba(${col},0.1)`, 0.6, 0.8);
  const tip = pass(w, `rgba(${col},0.82)`, 0, 0);
  if (WOB) {
    ctx.save(); ctx.globalCompositeOperation = 'destination-out';
    ctx.setLineDash([w * 0.3, w * 1.6, w * 0.15, w * 2.4]); pass(w * 0.2, 'rgba(0,0,0,0.6)', w * 0.3, w * 0.22);
    ctx.setLineDash([w * 0.2, w * 2.1, w * 0.4, w * 1.3]); pass(w * 0.16, 'rgba(0,0,0,0.5)', -w * 0.3, -w * 0.2);
    ctx.restore(); ctx.setLineDash([w * 2.2, w * 1.1, w * 0.8, w * 1.6]); pass(w * 0.3, `rgba(${lite},0.35)`, -w * 0.12, -w * 0.14); ctx.setLineDash([]); }
  let used = 0; const done = T.strokes.map(P => (used += P.len) <= budget);
  ctx.fillStyle = `rgba(${col},0.5)`; T.dust.forEach(d => { if (done[d[3]]) ctx.fillRect(ox + d[0], oy + d[1], d[2], d[2]); });
  if (q < 0.999) chalkTip(tip, w * 0.55, p, col);
}
// back : ce que les scènes dessinent derrière les titres ; front : par-dessus (même toile, même grain de craie)
function frame(back, front) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);
  const now = performance.now();
  if (back) { ctx.save(); back(ctx); ctx.restore(); ctx.globalAlpha = 1; }
  items.forEach(it => {
    if (it.p <= 0.001 || !it.loops) return;
    const r = it.el.getBoundingClientRect();
    if (r.bottom < -120 || r.top > H + 80) return;
    // un titre suit l'opacité de sa scène (js/film.js)
    if (it.wrap === undefined) it.wrap = it.el.closest('.scene');
    const bo = it.wrap && it.wrap.style.opacity !== '' ? parseFloat(it.wrap.style.opacity) : 1; if (bo < 0.01) return; ctx.globalAlpha = bo;
    if (it.morph) writeMorph(it, r, now); else write(it, r, reduced ? 1 : c01(it.p)); ctx.globalAlpha = 1;
  });
  if (front) { ctx.save(); front(ctx); ctx.restore(); ctx.globalAlpha = 1; }
  if (grain) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = grainA; ctx.fillStyle = grain; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
}
function restart() { t0 = performance.now(); }
return { init, resize, frame, restart, progress, traceText, hand };
})();
