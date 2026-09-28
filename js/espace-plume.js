/* Dans l'espace (l'écran 2) : les compétences de Mathieu, racontées par les étoiles, comme un cinéma en plein air
   (28/09, 19:28, Mathieu : « plutôt une histoire animée et dessinée pour présenter chacune de mes compétences, qui s'imagent, et les chats regardent
   comme un cinéma en plein air, ou quand on regarde des constellations ; mais les étoiles génèrent les dessins, les illustrations et les objets 3D,
   un par un, pour présenter mes compétences » ; avant : des cartes à la craie, jugées illisibles à 19:27).
   - Une scène par compétence : l'IA d'abord (huit scènes : un dev = une équipe, les agents, les terminaux, les skills, le benchmark, MARKO, le RAG,
     MCP, le machine learning), puis Front, Back-end, Pilotage, DevOps.
   - Chaque scène : des étoiles quittent le ciel et viennent se poser ; des traits les relient (une constellation) ; le trait s'affirme et le dessin
     s'anime (un objet en 3D qui tourne, un réseau parcouru d'influx, des barres qui se mesurent…). Dessous, comme des sous-titres : une icône,
     le nom, les outils, et la preuve, tirée du CV. Puis les étoiles repartent dans le ciel, et la scène suivante se forme.
   - On attrape la constellation pour la faire tourner ; un toucher passe à la suivante ; les petites étoiles en bas mènent à une scène précise.
     La souris sur les sous-titres : la scène attend qu'on ait fini de lire.
   - Les chats viennent s'asseoir sur la Terre, en bas, le nez en l'air, et regardent la séance (« ooh… ») ; parfois l'un d'eux s'endort.
   - Tout vient du CV, du profil LinkedIn, des dépôts GitHub et des mots de Mathieu (28/09) : rien d'autre. Jamais « il maîtrise les modèles »
     (19:16) : sa méthode (un dev qui fait le travail d'une équipe, agents et sous-agents, skills et plugins, benchmark permanent). */
window.EspacePlume = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, ANIMS, rnd, pick, clamp, sgn, sm } = K;
const TAU = Math.PI * 2, BL = '244,244,238';
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const en = () => !!(window.I18N && I18N.lang && I18N.lang !== 'fr');
const c01 = v => clamp(v, 0, 1);
const bruit = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ——— les scènes : [dessin, icône, IA ?, titre, preuve, outils] (FR, puis EN) ———
   (les outils : ceux du mode sérieux, js/serieux-donnees.js, tirés du CV et de la lecture de ses dépôts) */
const SCENES = () => en() ? [
  ['equipe', 'ia', 1, '1 dev + his agents = a team of 10', 'Alone with his agents, platforms that would have taken a ten-developer team years', ''],
  ['agents', 'ia', 1, 'Agents & sub-agents', 'Agents that delegate to sub-agents', 'Multi-agent orchestration · Sub-agents · Agentic AI'],
  ['terminaux', 'ia', 1, 'Multi-terminal', 'Several terminals and agents in parallel, one Git worktree per agent', 'Claude Code multi-agent workflows (ultracode) on MARKO'],
  ['skills', 'ia', 1, 'Skills & plugins', 'Custom skills and plugins: commands, MCP servers', 'Skills · Plugins · MCP servers · Prompt engineering'],
  ['bench', 'ia', 1, 'Constant benchmark', 'A permanent test bench for harnesses, plugins and orchestrators', 'Guardrails: tests, CI review, scanners, a human decision before every merge'],
  ['marko', 'ia', 1, 'MARKO · Agentic AI', 'CTO of MARKO, an AI-native B2B SaaS for real estate', 'Agentic AI · Document AI · OCR · Data extraction'],
  ['rag', 'ia', 1, 'Hybrid RAG', 'Archon: Gemini RAG + Qdrant/Meilisearch, reranking, entity graph', 'Embeddings · pgvector · Qdrant · Meilisearch · RAG evaluation'],
  ['mcp', 'ia', 1, 'MCP · WebMCP', 'MCP for the Figma-to-code flow; WebMCP in SafeShare', ''],
  ['ml', 'ia', 1, 'Machine learning', 'NumerusX: AI trading agents (research), SHAP/LIME', 'scikit-learn · LightGBM · Optuna · MLflow'],
  ['front', 'front', 0, 'Front', 'Vue/Nuxt architecture for Hermès, Chanel, Ardian', 'React · Next.js · Vue · Nuxt · TypeScript · three.js · GSAP · D3'],
  ['back', 'back', 0, 'Back-end', 'The MARKO API: FastAPI and PostgreSQL', 'Python · FastAPI · Node.js · Go · PHP · Symfony · PostgreSQL · Redis · Celery'],
  ['pilotage', 'pilotage', 0, 'Leadership', 'Tech lead of Digiplace: 150,000+ users (ENGIE)', 'Tech lead · CTO · Augmented development · Management · Mentoring · Agile · ADR'],
  ['devops', 'devops', 0, 'DevOps', '15+ projects moved to Docker (LWA)', 'Docker · Traefik · GitHub Actions · Azure · AWS · Vercel · Grafana · Sentry']
] : [
  ['equipe', 'ia', 1, '1 dev + ses agents = une équipe de 10', 'Seul avec ses agents, des plateformes qui auraient demandé des années à une équipe de dix développeurs', ''],
  ['agents', 'ia', 1, 'Agents & sous-agents', 'Des agents qui délèguent à des sous-agents', 'Orchestration multi-agents · Sous-agents · Agentic AI'],
  ['terminaux', 'ia', 1, 'Multi-terminaux', 'Plusieurs terminaux et plusieurs agents en parallèle, un worktree Git par agent', 'Sur MARKO : les workflows multi-agents de Claude Code (ultracode)'],
  ['skills', 'ia', 1, 'Skills & plugins', 'Des skills et plugins sur mesure : commandes, serveurs MCP', 'Skills · Plugins · Serveurs MCP · Prompt engineering'],
  ['bench', 'ia', 1, 'Benchmark permanent', 'Un banc d’essai permanent : harness, plugins, orchestrateurs', 'Garde-fous : tests, revue en CI, scanners, décision humaine avant chaque fusion'],
  ['marko', 'ia', 1, 'MARKO · Agentic AI', 'CTO de MARKO, un SaaS B2B AI-native pour l’immobilier', 'Agentic AI · Document AI · OCR · Extraction de données'],
  ['rag', 'ia', 1, 'RAG hybride', 'Archon : RAG Gemini + Qdrant/Meilisearch, reranking, graphe d’entités', 'Embeddings · pgvector · Qdrant · Meilisearch · Évaluation RAG'],
  ['mcp', 'ia', 1, 'MCP · WebMCP', 'MCP pour le flux Figma → code ; WebMCP dans SafeShare', ''],
  ['ml', 'ia', 1, 'Machine learning', 'NumerusX : agents IA de trading (recherche), SHAP/LIME', 'scikit-learn · LightGBM · Optuna · MLflow'],
  ['front', 'front', 0, 'Front', 'Architecture Vue/Nuxt pour Hermès, Chanel, Ardian', 'React · Next.js · Vue · Nuxt · TypeScript · three.js · GSAP · D3'],
  ['back', 'back', 0, 'Back-end', 'L’API de MARKO : FastAPI et PostgreSQL', 'Python · FastAPI · Node.js · Go · PHP · Symfony · PostgreSQL · Redis · Celery'],
  ['pilotage', 'pilotage', 0, 'Pilotage', 'Tech lead de Digiplace : 150 000+ collaborateurs (ENGIE)', 'Tech lead · CTO · Développement augmenté · Management · Mentorat · Agile · ADR'],
  ['devops', 'devops', 0, 'DevOps', '15+ projets passés sous Docker (LWA)', 'Docker · Traefik · GitHub Actions · Azure · AWS · Vercel · Grafana · Sentry']
];
const TETE = () => en() ? ['Mathieu Woroniecki', 'Senior tech lead & AI architect'] : ['Mathieu Woroniecki', 'Responsable technique senior & architecte IA'];

/* ——— les dessins : des points (x, y, z dans [-1, 1], y vers le bas ; la taille de l'étoile qui s'y pose, 0 : un simple coude du trait) et des traits
   (a, b, style : '' plein, 'fin' en pointillé) ; flux : les traits que parcourt un influx ; geo(P, t) : ce qui bouge ; rot(t) : [rx, ry, rz] ——— */
function fig() {
  const f = { p: [], e: [], flux: [], rot: () => [0.2, 0, 0] };
  f.pt = (x, y, z = 0, s = 1, k) => { f.p.push([x, y, z, s, k]); return f.p.length - 1; };
  f.lg = (pts, ferme, s = 1, st = '') => { const i0 = f.p.length; pts.forEach((q, j) => f.pt(q[0], q[1], q[2] || 0, typeof s === 'function' ? s(j) : s));
    for (let j = 1; j < pts.length; j++) f.e.push([i0 + j - 1, i0 + j, st]); if (ferme) f.e.push([i0 + pts.length - 1, i0, st]); return i0; };
  f.rond = (cx, cy, cz, r, n, s = 1, plan = 'xy', st = '') => f.lg(Array.from({ length: n }, (_, j) => { const a = j / n * TAU;
    return plan === 'xz' ? [cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r] : [cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz]; }), true, s, st);
  f.boite = (x0, y0, z0, x1, y1, z1, s = 1) => { const i0 = f.p.length;
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]].forEach(([x, y, z], j) => f.pt(x, y, z, typeof s === 'function' ? s(j) : s));
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => f.e.push([i0 + a, i0 + b, ''])); return i0; };
  f.ar = (a, b, st = '') => { f.e.push([a, b, st]); };
  return f;
}
const balance = (a, v) => t => a * Math.sin(t * v);
const DESSINS = {
  // un dev = une équipe : lui au centre, et autour, une équipe entière de silhouettes qu'il relie
  equipe() { const f = fig();
    f.rond(0, -0.2, 0, 0.17, 12, j => j % 3 ? 0 : 1.2);
    f.lg([[-0.36, 0.3], [-0.3, 0.1], [-0.14, 0.02], [0.14, 0.02], [0.3, 0.1], [0.36, 0.3]], false, j => j % 5 ? 0 : 1);
    const hub = f.pt(0, 0.12, 0, 0);
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k + 0.5) / 10 * TAU, x = Math.cos(a) * 0.86, y = Math.sin(a) * 0.72;
      f.rond(x, y - 0.06, 0, 0.065, 6, j => j === 4 ? 0.8 : 0); const i = f.lg([[x - 0.1, y + 0.1], [x, y + 0.02], [x + 0.1, y + 0.1]], false, 0);
      f.ar(hub, i + 1, 'fin'); f.flux.push([hub, i + 1]); }
    f.rot = t => [0.15, 0.35 * Math.sin(t * 0.5), 0]; return f; },
  // les agents : un chef d'orchestre, trois agents, neuf sous-agents ; l'arbre tourne, les consignes descendent
  agents() { const f = fig(), r0 = f.pt(0, -0.82, 0, 2);
    f.rond(0, -0.1, 0, 0.5, 18, 0, 'xz', 'fin'); f.rond(0, 0.62, 0, 0.95, 30, 0, 'xz', 'fin');
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3, i = f.pt(Math.cos(a) * 0.5, -0.1, Math.sin(a) * 0.5, 1.5); f.ar(r0, i); f.flux.push([r0, i]);
      for (let m = -1; m <= 1; m++) { const b = a + m * 0.5, j = f.pt(Math.cos(b) * 0.95, 0.62, Math.sin(b) * 0.95, 1); f.ar(i, j); f.flux.push([i, j]); } }
    f.rot = t => [0.32, t * 0.4, 0]; return f; },
  // plusieurs terminaux ouverts à la fois, en éventail dans la profondeur ; chacun tape ses lignes
  terminaux() { const f = fig(); f.fen = [];
    for (let k = 0; k < 3; k++) { const x0 = -1 + k * 0.4, y0 = -0.72 + k * 0.3, z = -0.45 + k * 0.45, w = 1.2, h = 0.82;
      const i = f.lg([[x0, y0, z], [x0 + w, y0, z], [x0 + w, y0 + h, z], [x0, y0 + h, z]], true, 1);
      f.lg([[x0, y0 + 0.15, z], [x0 + w, y0 + 0.15, z]], false, 0);
      [0.08, 0.15, 0.22].forEach(d => f.pt(x0 + d, y0 + 0.075, z, 0.45)); f.fen.push(i); }
    f.plus = (ctx, Q, t, u, now) => { if (u <= 0) return;
      f.fen.forEach((i, k) => { const A = Q[i], B = Q[i + 1], C = Q[i + 2], D = Q[i + 3], at = (a, b) => { const x0 = A[0] + (B[0] - A[0]) * a, y0 = A[1] + (B[1] - A[1]) * a, x1 = D[0] + (C[0] - D[0]) * a, y1 = D[1] + (C[1] - D[1]) * a; return [x0 + (x1 - x0) * b, y0 + (y1 - y0) * b]; };
        ctx.globalAlpha = u * (0.5 + 0.5 * (A[3] + 1) / 2);
        [0.36, 0.52, 0.68, 0.84].forEach((v, r) => { const cyc = ((t * 0.9 + k * 0.8 + r * 0.45) % 4) / 4, L = [0.62, 0.44, 0.7, 0.3][(r + k) % 4] * c01(cyc * 1.6);
          const p0 = at(0.07, v), p1 = at(0.1, v - 0.04), p2 = at(0.07, v - 0.08); ctx.beginPath(); ctx.moveTo(p2[0], p2[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p0[0], p0[1]); ctx.stroke();
          if (L > 0) { const a = at(0.15, v - 0.04), b = at(0.15 + L * 0.8, v - 0.04); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
            if (cyc < 0.6 && Math.sin(now * 8) > 0) O.brille(ctx, b[0] + 3, b[1], 1.6, 0.8, false, now, r); } }); }); };
    f.rot = t => [0.14, -0.35 + 0.4 * Math.sin(t * 0.45), 0]; return f; },
  // ses skills, ses plugins : une prise qui vient se brancher (étincelles), et la prise s'allume
  skills() { const f = fig(), i0 = f.p.length;
    f.lg([[-0.64, -0.28], [-0.14, -0.28], [-0.06, -0.2], [-0.06, 0.2], [-0.14, 0.28], [-0.64, 0.28]], true, j => j === 0 || j === 5 ? 1 : j === 2 || j === 3 ? 0.7 : 0);
    f.lg([[-0.06, -0.12], [0.3, -0.12]], false, j => j ? 1 : 0); f.lg([[-0.06, 0.12], [0.3, 0.12]], false, j => j ? 1 : 0);
    f.lg([[-0.64, 0], [-0.8, 0.02], [-0.94, 0.16], [-1, 0.42], [-0.9, 0.7]], false, j => j === 4 ? 1.2 : 0);
    const i1 = f.p.length;
    f.rond(0.62, 0, 0, 0.42, 18, j => j % 3 ? 0 : 1); f.rond(0.62, 0, 0, 0.3, 14, 0, 'xy', 'fin');
    f.pt(0.34, -0.12, 0, 0.5); f.pt(0.34, 0.12, 0, 0.5);
    const va = t => -0.34 * (1 - sm(c01((t - 3.4) / 1.1)));
    f.geo = (P, t) => { const d = va(t); for (let i = i0; i < i1; i++) P[i][0] += d; };
    f.plus = (ctx, Q, t, u, now) => { const k = t - 4.5; if (k < 0) return;
      const c = Q[i1 + 18 + 14], d = Q[i1 + 18 + 15]; if (!c || !d) return;
      if (k < 0.8) { ctx.globalAlpha = 1 - k / 0.8; [c, d].forEach((p, j) => { for (let n = 0; n < 7; n++) { const a = n / 7 * TAU + j, r0 = 4 + k * 40, r1 = r0 + 8; ctx.beginPath(); ctx.moveTo(p[0] + Math.cos(a) * r0, p[1] + Math.sin(a) * r0); ctx.lineTo(p[0] + Math.cos(a) * r1, p[1] + Math.sin(a) * r1); ctx.stroke(); } }); }
      const m = Q[i1], ctr = [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2]; O.brille(ctx, ctr[0] + (m[0] - ctr[0]) * 0.55, ctr[1], 5 + 1.5 * Math.sin(now * 3), 0.9 * c01(k * 2), true, now, 2); };
    f.rot = t => [0.1, 0.3 * Math.sin(t * 0.4), 0]; return f; },
  // le benchmark permanent : des barres qui se mesurent, se remesurent ; la meilleure brille (et ce n'est jamais la même longtemps)
  bench() { const f = fig(), base = 0.72, B = []; f.lg([[-1.05, base, -0.35], [1.05, base, -0.35], [1.05, base, 0.35], [-1.05, base, 0.35]], true, 0.6);
    for (let k = 0; k < 5; k++) { const x = -0.84 + k * 0.42; B.push(f.boite(x - 0.13, base - 1, -0.13, x + 0.13, base, 0.13, j => j < 4 ? 1 : 0)); }
    const haut = (k, n) => 0.45 + 1.1 * bruit(k * 7.3 + n * 3.1);
    f.h = t => { const n = Math.floor(t / 2.6), e = sm(c01((t - n * 2.6) / 0.8)), g = sm(c01((t - 1.4) / 1.6)); return B.map((_, k) => g * (haut(k, n - 1) + (haut(k, n) - haut(k, n - 1)) * e)); };
    f.geo = (P, t) => { const H = f.h(t); B.forEach((i, k) => { for (let j = 0; j < 4; j++) P[i + j][1] = base - Math.max(0.02, H[k]); }); };
    f.plus = (ctx, Q, t, u, now) => { if (u <= 0) return; const H = f.h(t), k = H.indexOf(Math.max(...H)), i = B[k], x = (Q[i][0] + Q[i + 1][0] + Q[i + 2][0] + Q[i + 3][0]) / 4, y = (Q[i][1] + Q[i + 1][1] + Q[i + 2][1] + Q[i + 3][1]) / 4;
      O.brille(ctx, x, y - 12, 4.5, u, true, now, 1); };
    f.rot = t => [0.34, -0.5 + 0.35 * Math.sin(t * 0.35), 0]; return f; },
  // MARKO : une tour (l'immobilier), un document que l'IA lit (une ligne de lumière le parcourt), et ce qu'elle en tire file vers la tour
  marko() { const f = fig(), T = f.boite(-0.24, -0.78, -0.24, 0.24, 0.78, 0.24, j => j < 4 ? 1 : 0.5);
    [-0.4, -0.02, 0.36].forEach(y => f.lg([[-0.24, y, -0.24], [0.24, y, -0.24], [0.24, y, 0.24], [-0.24, y, 0.24]], true, 0, 'fin'));
    const s0 = f.pt(0, -0.78, 0, 0), s1 = f.pt(0, -1.05, 0, 1.6); f.ar(s0, s1);
    f.boite(0.34, 0.12, -0.18, 0.74, 0.78, 0.18, j => j < 4 ? 0.8 : 0);
    const D = f.lg([[-1.02, -0.36, 0.3], [-0.66, -0.36, 0.3], [-0.52, -0.22, 0.3], [-0.52, 0.42, 0.3], [-1.02, 0.42, 0.3]], true, j => j === 2 ? 0 : 1);
    [-0.12, 0.04, 0.2].forEach((y, k) => f.lg([[-0.94, y, 0.3], [-0.6 - k * 0.06, y, 0.3]], false, 0, 'fin'));
    const a = f.pt(-0.52, 0.1, 0.3, 0), b = f.pt(-0.24, 0.1, 0.24, 0.6); f.ar(a, b, 'fin'); f.flux.push([a, b]);
    f.plus = (ctx, Q, t, u, now) => { if (u <= 0) return; const v = (t * 0.45) % 1, A = Q[D], B = Q[D + 3], C = Q[D + 4], y0 = A[1] + (C[1] - A[1]) * v;
      ctx.globalAlpha = u * 0.9; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A[0] + (C[0] - A[0]) * v, y0); ctx.lineTo(Q[D + 1][0] + (B[0] - Q[D + 1][0]) * v + 4, Q[D + 1][1] + (B[1] - Q[D + 1][1]) * v); ctx.stroke();
      O.brille(ctx, A[0] + (C[0] - A[0]) * v, y0, 3, u, false, now, 4); ctx.lineWidth = 1.4;
      // (les étages s'allument, un par un, du bas vers le haut)
      const e = Math.floor(t * 1.2) % 4, P0 = Q[T + 4], P1 = Q[T + 5]; O.brille(ctx, P0[0] + (P1[0] - P0[0]) * 0.5, P0[1] + (Q[T][1] - P0[1]) * (0.12 + e * 0.25), 3.2, u * 0.8, false, now, 6); };
    f.rot = t => [0.22, 0.5 + 0.45 * Math.sin(t * 0.3), 0]; return f; },
  // le RAG hybride : une sphère de connaissances (un graphe), la question au centre ; les influx vont chercher les bons morceaux
  rag() { const f = fig(), n = 30, P = [];
    for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996; P.push([Math.cos(a) * r * 0.88, y * 0.88, Math.sin(a) * r * 0.88]); }
    P.forEach((q, i) => f.pt(q[0], q[1], q[2], 0.6 + bruit(i) * 0.8));
    const vu = new Set(); P.forEach((q, i) => { P.map((o, j) => [j, Math.hypot(o[0] - q[0], o[1] - q[1], o[2] - q[2])]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3)
      .forEach(([j]) => { const k = i < j ? i + ',' + j : j + ',' + i; if (vu.has(k)) return; vu.add(k); f.ar(i, j); if (bruit(i * 3 + j) < 0.3) f.flux.push([i, j]); }); });
    const c = f.pt(0, 0, 0, 1.8); [2, 9, 15, 21, 27].forEach(i => { f.ar(c, i, 'fin'); f.flux.push([c, i]); });
    f.rot = t => [0.3, t * 0.3, 0]; return f; },
  // MCP : une maquette (Figma) à gauche, du code à droite, et entre les deux, le pont du protocole
  mcp() { const f = fig();
    f.lg([[-1.02, -0.52], [-0.38, -0.52], [-0.38, 0.52], [-1.02, 0.52]], true, 1);
    f.rond(-0.8, -0.2, 0, 0.12, 10, j => j % 5 ? 0 : 0.7); f.lg([[-0.64, 0.02], [-0.46, 0.02], [-0.46, 0.34], [-0.64, 0.34]], true, 0);
    f.lg([[-0.94, 0.2], [-0.72, 0.2]], false, 0, 'fin'); f.lg([[-0.94, 0.34], [-0.76, 0.34]], false, 0, 'fin');
    f.lg([[0.5, -0.52], [0.42, -0.46], [0.42, -0.08], [0.33, 0], [0.42, 0.08], [0.42, 0.46], [0.5, 0.52]], false, j => j === 0 || j === 3 || j === 6 ? 1 : 0);
    f.lg([[0.9, -0.52], [0.98, -0.46], [0.98, -0.08], [1.07, 0], [0.98, 0.08], [0.98, 0.46], [0.9, 0.52]], false, j => j === 0 || j === 3 || j === 6 ? 1 : 0);
    [[-0.22, 0.28], [-0.05, 0.18], [0.1, 0.24]].forEach(([y, l], k) => f.lg([[0.54 + k * 0.04, y], [0.54 + k * 0.04 + l, y]], false, 0, 'fin'));
    f.rond(0, 0, 0, 0.13, 10, j => j % 5 ? 0 : 1);
    const a = f.pt(-0.36, 0, 0, 0), b = f.pt(-0.14, 0, 0, 0), c = f.pt(0.14, 0, 0, 0), d = f.pt(0.3, 0, 0, 0), h1 = f.pt(0.24, -0.06, 0, 0), h2 = f.pt(0.24, 0.06, 0, 0);
    f.ar(a, b); f.ar(c, d); f.ar(h1, d); f.ar(h2, d); f.flux.push([a, b], [c, d]);
    f.rot = t => [0.1, 0.3 * Math.sin(t * 0.4), 0]; return f; },
  // le machine learning : un réseau de neurones ; les influx le traversent, couche après couche
  ml() { const f = fig(), C = [3, 5, 5, 2], L = C.map((n, k) => Array.from({ length: n }, (_, j) => f.pt(-0.9 + k * 0.6, (j - (n - 1) / 2) * 0.36, 0, 1.2)));
    for (let k = 0; k < 3; k++) L[k].forEach((a, i) => L[k + 1].forEach((b, j) => { f.ar(a, b, 'fin'); if (bruit(a * 5 + b) < 0.35) f.flux.push([a, b]); }));
    f.rot = t => [0.12, 0.45 * Math.sin(t * 0.4), 0]; return f; },
  // le front : une fenêtre de navigateur, et devant, un cube en 3D qui tourne (three.js, Canvas)
  front() { const f = fig();
    f.lg([[-1, -0.7], [1, -0.7], [1, 0.7], [-1, 0.7]], true, 1); f.lg([[-1, -0.5], [1, -0.5]], false, 0);
    [-0.9, -0.82, -0.74].forEach(x => f.pt(x, -0.6, 0, 0.5));
    [[-0.3, 0.6], [-0.15, 0.45], [0.3, 0.55], [0.45, 0.35]].forEach(([y, l]) => f.lg([[-0.85, y], [-0.85 + l, y]], false, 0, 'fin'));
    const i = f.boite(-1, -1, -1, 1, 1, 1, 1);
    f.geo = (P, t) => { const a = t * 0.9, b = t * 0.6, s = 0.26; for (let j = 0; j < 8; j++) { const [x, y, z] = P[i + j]; const x1 = x * Math.cos(a) + z * Math.sin(a), z1 = -x * Math.sin(a) + z * Math.cos(a), y1 = y * Math.cos(b) - z1 * Math.sin(b), z2 = y * Math.sin(b) + z1 * Math.cos(b);
      P[i + j][0] = 0.48 + x1 * s; P[i + j][1] = 0.1 + y1 * s; P[i + j][2] = 0.35 + z2 * s; } };
    f.rot = t => [0.14, 0.4 * Math.sin(t * 0.35), 0]; return f; },
  // le back-end : trois serveurs empilés (leurs voyants clignotent), une base de données dessous
  back() { const f = fig();
    [-0.8, -0.38, 0.04].forEach(y => { f.boite(-0.68, y, -0.4, 0.68, y + 0.3, 0.4, j => j === 3 || j === 7 ? 0 : 0.8); [-0.52, -0.4].forEach(x => f.pt(x, y + 0.15, 0.4, 0.8, 'clig')); f.lg([[-0.2, y + 0.15, 0.4], [0.5, y + 0.15, 0.4]], false, 0, 'fin'); });
    const h = f.rond(0, 0.52, 0, 0.36, 16, j => j % 4 ? 0 : 1, 'xz'), b = f.rond(0, 0.86, 0, 0.36, 16, 0, 'xz');
    [0, 4, 8, 12].forEach(j => f.ar(h + j, b + j));
    const a = f.pt(0, 0.34, 0, 0), c = f.pt(0, 0.52, 0, 0); f.ar(a, c, 'fin'); f.flux.push([a, c]);
    f.rot = t => [0.34, t * 0.3, 0]; return f; },
  // le pilotage : la barre du navire ; elle tourne à gauche, à droite (il tient le cap)
  pilotage() { const f = fig();
    f.rond(0, 0, 0, 0.64, 24, j => j % 3 ? 0 : 0.8); f.rond(0, 0, 0, 0.15, 10, 0);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, i = f.pt(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0, 0), j = f.pt(Math.cos(a) * 0.98, Math.sin(a) * 0.98, 0, 1.3); f.ar(i, j); }
    f.rot = t => [0.35, 0.2 * Math.sin(t * 0.3), 0.9 * Math.sin(t * 0.55)]; return f; },
  // le DevOps : la boucle sans fin (construire, livrer, recommencer), une lumière qui en fait le tour
  devops() { const f = fig(), n = 48, P = [];
    for (let i = 0; i < n; i++) { const t = i / n * TAU, d = 1 + Math.sin(t) * Math.sin(t); P.push([Math.cos(t) / d, 0.9 * Math.sin(t) * Math.cos(t) / d, 0.3 * Math.sin(t)]); }
    const i0 = f.lg(P, true, j => j % 6 ? 0 : 1);
    f.plus = (ctx, Q, t, u, now) => { if (u <= 0) return; for (let k = 0; k < 2; k++) { const v = ((t * 0.25 + k * 0.5) % 1) * n, j = Math.floor(v), e = v - j, A = Q[i0 + j], B = Q[i0 + (j + 1) % n];
      O.brille(ctx, A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e, 4, u, true, now, k); } };
    f.rot = t => [0.4, 0.5 * Math.sin(t * 0.35), 0]; return f; }
};

/* ——— les lettres : pleines et nettes (19:27, Mathieu : « les textes sont assez illisibles ») ; Space Grotesk, le nom dans la police du grand titre ——— */
const NET = '"Space Grotesk","Barlow",system-ui,sans-serif';
const police = (px, k) => { if (k === 'fort') return `600 ${px}px ${NET}`; if (!k) return `500 ${px}px ${NET}`;
  const h1 = document.querySelector('h1[data-title]'), cs = h1 && getComputedStyle(h1); return cs ? `${cs.fontWeight} ${px}px ${cs.fontFamily}` : `600 ${px}px ${NET}`; };
const toile = document.createElement('canvas'), tx = toile.getContext('2d');
const largeur = (txt, font) => { tx.font = font; return tx.measureText(txt).width; };
// (des lignes qui tiennent dans wmax, coupées entre les mots)
function lignes(txt, font, wmax) { const R = []; let l = ''; txt.split(' ').forEach(m => { const e = l ? l + ' ' + m : m; if (l && largeur(e, font) > wmax) { R.push(l); l = m; } else l = e; }); if (l) R.push(l); return R; }

// la Terre, en bas (la même que js/espace-planetes.js) : les chats s'y assoient pour regarder
const hautTerre = () => { const H = O.H, h = clamp(H * 0.13, 60, 130); return O.BAS() - h + 18; };
function terre() { const W = O.W, H = O.H, bas = O.BAS(), h = clamp(H * 0.13, 60, 130), R = Math.max(W * 1.15, (W * W / 4) / (2 * h) + h / 2); return { cx: W / 2, cy: bas - h + R + 18, R }; }
const surface = x => { const T = terre(); return T.cy - Math.sqrt(Math.max(0, T.R * T.R - (x - T.cx) * (x - T.cx))); };

/* ——— la mise en page : l'en-tête (nom, titre), l'écran du ciel (où se forment les dessins), les sous-titres, la rangée de petites étoiles ——— */
let M = null;
function sousTitre(S, L, wmax, cote) {
  const pT = L ? 30 : 21, pP = L ? 18.5 : 15, pO = L ? 14.5 : 12.5, is = pT * 0.62, pad = L ? 20 : 12, g = pT * 0.45, ws = wmax - pad * 2;
  const fT = police(pT, 'fort'), fP = police(pP), fO = police(pO), R = [];
  let y = pad; const tl = lignes(S[3], fT, ws - is * 2 - g), wT = Math.max(...tl.map(l => largeur(l, fT)));
  tl.forEach((l, i) => { R.push({ txt: l, font: fT, w: largeur(l, fT), y: y + pT * 0.95, a: 1, dl: i * 0.3, t: 1 }); y += pT * 1.2; }); y += pT * 0.2;
  lignes(S[4], fP, ws).forEach((l, i) => { R.push({ txt: l, font: fP, w: largeur(l, fP), y: y + pP * 1.05, a: 0.96, dl: 0.35 + i * 0.25 }); y += pP * 1.45; });
  if (S[5]) { y += pO * 0.3; lignes(S[5], fO, ws).forEach((l, i) => { R.push({ txt: l, font: fO, w: largeur(l, fO), y: y + pO * 1.05, a: 0.68, dl: 0.8 + i * 0.25 }); y += pO * 1.5; }); }
  // (x : depuis le bord gauche de la bande ; sur le côté, tout est aligné à gauche ; sinon, centré)
  const bw = cote ? wmax : Math.min(wmax, Math.max(wT + is * 2 + g, ...R.map(l => l.w)) + pad * 2), x0 = cote ? pad : (bw - (wT + is * 2 + g)) / 2;
  R.forEach(l => { l.x = l.t ? x0 + is * 2 + g : cote ? pad : (bw - l.w) / 2; });
  return { L: R, ic: { x: x0 + is, y: pad + pT * 0.6, s: is }, w: bw, h: y + pad * 0.7, k: S[1] };
}
function compose() {
  const W = O.W, H = O.H, L = W >= 760, cote = W >= 900 && W / H > 1.15, D = TETE(), SC = SCENES();
  // en haut : le nom et le titre ; la planète des chats dans le coin (js/espace-planetes.js la prend là)
  const pn = L ? clamp(W * 0.024, 24, 34) : 21, pr = L ? 15.5 : 13, r = L ? clamp(Math.min(W, H) * 0.07, 38, 64) : clamp(Math.min(W, H) * 0.075, 32, 52);
  const top = O.HAUT() + (L ? H * 0.025 : 24), planete = L ? [W - W * 0.035 - r, top + r * 1.15] : [W - r - 12, top + r + 6];
  const marge = W * 0.04, capW = cote ? clamp(W * 0.33, 340, 470) : Math.min(W - 24, L ? 860 : 9999), capX = W - marge - capW;
  const cxS = cote ? (marge + capX - 20) / 2 : W / 2;
  const fr = police(pr), wr = cote ? capX - marge : L ? W - 40 : W - r * 2 - 44, role = lignes(D[1], fr, wr);
  const tete = { al: L ? 'c' : 'g', x: L ? cxS : 16, nom: D[0], fn: police(pn, true), yn: top + pn, role, fr, yr: top + pn + pr * 1.55, lr: pr * 1.35, pn, pr };
  const basTete = tete.yr + (role.length - 1) * tete.lr + pr * 0.7;
  const caps = SC.map(S => sousTitre(S, L, capW, cote)), hMax = Math.max(...caps.map(c => c.h)), place = L ? 62 : 50, pas = L ? 20 : 17;
  let cx, cy, s, yPts, yCap = 0, capY = 0, xPts;
  if (cote) {
    // grand écran : l'écran du ciel à gauche, les sous-titres à droite (sous la planète), la rangée d'étoiles dessous
    const t0 = basTete + 14, b0 = hautTerre() - place - 6; cx = cxS; cy = (t0 + b0) / 2;
    s = Math.max(60, Math.min((b0 - t0) / 2 * 0.92, (capX - 20 - marge) / 2 * 0.66));
    capY = Math.max(planete[1] + r * 2.4, cy - (hMax + 40) / 2); yPts = capY + hMax + 26; xPts = capX + capW / 2;
  } else {
    // téléphone (ou écran étroit) : l'écran du ciel au milieu, les sous-titres dessous, la rangée d'étoiles, puis la Terre et les spectateurs
    yPts = hautTerre() - place - 10; yCap = yPts - (L ? 20 : 16); xPts = W / 2;
    const t0 = basTete + (L ? 14 : 8), b0 = yCap - hMax - (L ? 16 : 10); cx = W / 2; cy = (t0 + b0) / 2;
    s = Math.max(40, Math.min((b0 - t0) / 2 * 0.8, L ? W * 0.2 : W / 2 * 0.72));
  }
  // la rangée d'étoiles : une par scène (un petit écart entre l'IA et le reste), deux flèches aux bouts
  const gap = pas * 0.8, nIA = SC.filter(S => S[2]).length, larg = (SC.length - 1) * pas + gap;
  const pts = SC.map((S, i) => ({ x: xPts - larg / 2 + i * pas + (i >= nIA ? gap : 0), y: yPts }));
  const fl = [{ x: pts[0].x - pas * 1.5, y: yPts, d: -1 }, { x: pts[pts.length - 1].x + pas * 1.5, y: yPts, d: 1 }];
  return { W, H, L, cote, tete, caps, yCap, capX, capY, cx, cy, s, pts, fl, planete, pas, SC };
}
// où se pose une bande de sous-titres : son coin haut gauche
const coin = (L, cap) => L.cote ? [L.capX, L.capY] : [L.W / 2 - cap.w / 2, L.yCap - cap.h];

/* ——— la séance : une scène à la fois ——— */
const DUREE = reduit ? { A: 0.01, B: 0.01, C: 0.01 } : { A: 1.7, B: 1.7, C: 0.9 };
const tenue = cap => (reduit ? 4 : 0) + clamp(4.2 + cap.L.reduce((n, l) => n + l.txt.length, 0) / 26, 6, 10.5);
let pret = false, onFini = null, fin1 = false;
function scene(i) {
  const lay = M.lay, S = lay.SC[i], f = DESSINS[S[0]](), W = lay.W, hb = hautTerre();
  // (d'où vient chaque étoile : un endroit du ciel, au hasard ; les plus proches arrivent les premières)
  const et = f.p.map((p, j) => ({ ox: rnd(0.02, 0.98) * W, oy: rnd(O.HAUT() + 4, hb - 30), dl: 0.55 * bruit(j * 1.7 + i * 13), ph: rnd(0, TAU) }));
  return { i, S, f, et, t0: Wd.t, cap: lay.caps[i], tenue: tenue(lay.caps[i]), Q: null, reagi: false };
}
// passer à une scène : les étoiles de l'ancienne repartent dans le ciel ; ses sous-titres s'effacent au stylo
function aller(j) {
  if (!M) return; const n = M.lay.SC.length; j = ((j % n) + n) % n; const C = M.sc;
  if (C && C.Q) C.f.p.forEach((p, k) => { if (p[3] <= 0) return; const q = C.pos ? C.pos[k] : C.Q[k]; M.part.push({ x: q[0], y: q[1], ox: rnd(0.02, 0.98) * M.lay.W, oy: rnd(O.HAUT() + 4, hautTerre() - 30), t0: Wd.t, R: 1.3 + 1.3 * p[3], ph: C.et[k].ph }); });
  if (C) M.vieux = { cap: C.cap, t0: Wd.t, tl: Wd.t - C.t0 };
  M.sc = scene(j); M.ry = M.rx = 0;
}
const tps = () => M && M.sc ? Wd.t - M.sc.t0 : 0;
const forme = () => M && M.sc && tps() >= DUREE.A + DUREE.B + DUREE.C;
const lusIA = new Set();

X.entre.push(() => { M = null; pret = false; fin1 = false;
  const go = () => { pret = true; M = { lay: compose(), t0: Wd.t, part: [], vus: new Set(), fin: false, rx: 0, ry: 0, vrx: 0, vry: 0, bw: 0, bh: 0, sc: null, vieux: null };
    M.lay0 = Wd.t + (reduit ? 0 : 2.2); };
  // (les polices doivent être chargées, sinon les largeurs mesurées seraient celles d'une autre)
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(police(24)), document.fonts.load(police(24, 'fort')), document.fonts.load(police(24, true))]).then(go, go); else go(); });
X.retour.push(() => { M = null; pret = false; });

X.pas.push((dt, cats) => {
  if (!M) return;
  if (M.lay.W !== O.W || M.lay.H !== O.H) { M.lay = compose(); if (M.sc) M.sc.cap = M.lay.caps[M.sc.i]; }
  if (!M.sc) { if (Wd.t >= M.lay0) aller(0); return; }
  const C = M.sc, tl = tps(), F = DUREE.A + DUREE.B + DUREE.C;
  // la souris sur les sous-titres (on lit) : la scène attend
  const P = Wd.ptr, b = M.bande;
  if (tl > F && b && P && P.on && Wd.t - P.moved < 8 && P.x > b.x && P.x < b.x + b.w && P.y > b.y && P.y < b.y + b.h) C.t0 += dt;
  if (tl > F && !C.reagi) { C.reagi = true; M.vus.add(C.i); reagit(C);
    if (C.S[2]) { lusIA.add(C.i); if (M.lay.SC.every((S, i) => !S[2] || lusIA.has(i)) && window.Dex && Dex.vu) Dex.vu('competences'); }
    if (!fin1) { fin1 = true; if (onFini) onFini(); }
    if (M.vus.size >= M.lay.SC.length) M.fin = true; }
  if (tl > F + C.tenue) aller(C.i + 1);
  // la constellation qu'on a fait tourner revient doucement de face
  if (!M.tenu) { M.ry += M.vry * dt; M.rx += M.vrx * dt; M.vry *= Math.exp(-dt * 1.6); M.vrx *= Math.exp(-dt * 1.6); M.ry *= Math.exp(-dt * 0.5); M.rx *= Math.exp(-dt * 0.9); }
  M.rx = clamp(M.rx, -1.1, 1.1);
  M.part = M.part.filter(p => Wd.t - p.t0 < 1.3);
  // les chats qui flottent devant l'écran du ciel ou devant les sous-titres : doucement poussés sur le côté (on regarde la séance, on ne la cache pas)
  const L = M.lay, bd = M.bande;
  cats.forEach(c => { const S = c.sp; if (!S || c.held || !(S.m === 'derive' || (S.m === 'nage' && !(S.cible && S.cible.siege != null)))) return; const [x, y] = centreDe(c), r = rayon(c);
    const dx = x - L.cx, dy = y - L.cy, d = Math.hypot(dx, dy) || 1, R = L.s * 1.2 + r;
    if (d < R) { const f = 320 * (1 - d / R) + 60; S.vx += dx / d * f * dt; S.vy += dy / d * f * dt; }
    if (bd && x > bd.x - r && x < bd.x + bd.w + r && y > bd.y - r && y < bd.y + bd.h + r) { const ex = x - (bd.x + bd.w / 2), ey = y - (bd.y + bd.h / 2), q = Math.hypot(ex, ey) || 1; S.vx += ex / q * 300 * dt; S.vy += ey / q * 300 * dt; } });
});

/* ——— le dessin ——— */
// les points de la scène, à l'écran : [x, y, perspective, profondeur]
function projette(C, tl) {
  const f = C.f, L = M.lay, P = f.p.map(p => p.slice()); if (f.geo) f.geo(P, tl);
  const [a0, b0, c0] = f.rot(reduit ? 0 : tl), rx = a0 + M.rx, ry = b0 + M.ry, rz = c0, K3 = 3.4;
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return P.map(([x, y, z]) => { const x1 = x * cz - y * sz, y1 = x * sz + y * cz, x2 = x1 * cy + z * sy, z2 = -x1 * sy + z * cy, y3 = y1 * cx - z2 * sx, z3 = y1 * sx + z2 * cx, k = K3 / (K3 - z3);
    return [L.cx + x2 * L.s * k, L.cy + y3 * L.s * k, k, z3]; });
}
const prof = d => 0.42 + 0.58 * c01((d + 1.1) / 2.2);
function etoile(ctx, x, y, R, k, br, now, ph) { O.brille(ctx, x, y, R, k, br, now, ph); ctx.globalAlpha = Math.min(1, k * 1.1); ctx.fillStyle = `rgb(${BL})`; ctx.beginPath(); ctx.arc(x, y, R * 0.42, 0, TAU); ctx.fill(); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

X.fond.push((ctx, now) => {
  if (!M) return; const L = M.lay, T = L.tete, th = Wd.t - M.t0;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = ctx.fillStyle = `rgb(${BL})`;
  // l'en-tête : le nom, puis le titre, dévoilés de gauche à droite
  const ecrit = (txt, font, x, y, u, al) => { if (u <= 0) return; ctx.font = font; const w = largeur(txt, font), x0 = al === 'c' ? x - w / 2 : x; ctx.save(); ctx.beginPath(); ctx.rect(x0 - 4, y - 200, (w + 8) * c01(u), 400); ctx.clip(); ctx.globalAlpha = 1; ctx.fillText(txt, x0, y); ctx.restore(); };
  ctx.textBaseline = 'alphabetic';
  ecrit(T.nom, T.fn, T.x, T.yn, reduit ? 1 : th / 0.9, T.al); T.role.forEach((l, i) => { ctx.globalAlpha = 0.8; ecrit(l, T.fr, T.x, T.yr + i * T.lr, reduit ? 1 : (th - 0.7 - i * 0.3) / 0.8, T.al); });
  ctx.globalAlpha = 1;
  // les étoiles qui repartent dans le ciel (celles de la scène d'avant)
  M.part.forEach((p, j) => { const u = c01((Wd.t - p.t0) / 1.2), e = sm(u), x = p.x + (p.ox - p.x) * e, y = p.y + (p.oy - p.y) * e; etoile(ctx, x, y, p.R * (1 - u) + 0.8 * u, 0.9, false, now, p.ph); });
  const C = M.sc;
  if (C) {
    const tl = tps(), { A, B } = DUREE, Cd = DUREE.C, Q = C.Q = projette(C, tl), f = C.f, u = sm(c01((tl - A - B) / Cd)), ne = f.e.length;
    // les traits : la constellation se relie, trait après trait ; puis le trait s'affirme (le dessin)
    ctx.lineWidth = 1;
    f.e.forEach(([a, b, st], j) => { const g = c01((tl - A - (j / ne) * B * 0.85) / 0.35); if (g <= 0) return; const P = Q[a], R = Q[b], k = prof((P[3] + R[3]) / 2);
      if (st === 'fin') { ctx.setLineDash([3, 5]); ctx.globalAlpha = 0.34 * k; ctx.lineWidth = 1; } else { ctx.setLineDash([]); ctx.globalAlpha = (0.42 + 0.5 * u) * k; ctx.lineWidth = 1 + 0.9 * u; }
      ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(P[0] + (R[0] - P[0]) * g, P[1] + (R[1] - P[1]) * g); ctx.stroke(); });
    ctx.setLineDash([]); ctx.lineWidth = 1.4;
    // les influx : de petites lumières qui parcourent certains traits
    if (u > 0 && !reduit) f.flux.forEach(([a, b], k) => { const v = (tl * 0.6 + k * 0.37) % 1.5; if (v >= 1) return; const P = Q[a], R = Q[b]; O.brille(ctx, P[0] + (R[0] - P[0]) * v, P[1] + (R[1] - P[1]) * v, 2.4, u * Math.sin(Math.PI * v), false, now, k); });
    if (f.plus) { ctx.save(); ctx.strokeStyle = ctx.fillStyle = `rgb(${BL})`; ctx.lineWidth = 1.4; f.plus(ctx, Q, tl, u, now); ctx.restore(); }
    // les étoiles : elles quittent le ciel, filent (une petite traîne), se posent (un éclat), puis scintillent
    const pos = C.pos = [];
    f.p.forEach((p, j) => { const s = p[3], q = Q[j]; if (s <= 0) { pos[j] = q; return; } const E = C.et[j], d0 = A - 0.55, k = c01((tl - E.dl) / d0), e = sm(k);
      const x = E.ox + (q[0] - E.ox) * e, y = E.oy + (q[1] - E.oy) * e; pos[j] = [x, y];
      if (k > 0 && k < 1) { const e2 = sm(c01(k - 0.08)); ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(E.ox + (q[0] - E.ox) * e2, E.oy + (q[1] - E.oy) * e2); ctx.lineTo(x, y); ctx.stroke(); }
      const flash = k >= 1 ? Math.max(0, 1 - (tl - E.dl - d0) * 2.5) : 0, clig = p[4] === 'clig' && u > 0 ? (Math.sin(now * 4 + j * 1.7) > 0 ? 1 : 0.3) : 1;
      const R = (1.1 + 1.25 * s) * q[2] * (1 + flash * 0.9) * (0.85 + 0.15 * Math.sin(now * 2.3 + E.ph)) * (k < 1 ? 0.75 + 0.25 * k : 1);
      etoile(ctx, x, y, R, (0.55 + 0.45 * prof(q[3])) * clig, s >= 1.2 || flash > 0.3, now, E.ph); });
  }
  // les sous-titres : sur une bande de nuit (lisibles, même quand un chat passe derrière) ; l'icône, le nom, la preuve, les outils
  const cap = C && C.cap, V = M.vieux, tl = tps(), vu = V ? c01((Wd.t - V.t0) / 0.35) : 1;
  if (cap) { const k = Math.min(1, dt0()); M.bw = M.bw ? M.bw + (cap.w - M.bw) * k : cap.w; M.bh = M.bh ? M.bh + (cap.h - M.bh) * k : cap.h;
    const ap = reduit || M.vus.size || C.i ? 1 : sm(c01((tl - 0.2) / 0.6)), w = M.bw * ap, h = M.bh;
    const x = L.cote ? L.capX : L.W / 2 - w / 2, y = L.cote ? L.capY : L.yCap - h;
    M.bande = { x: L.cote ? L.capX : L.W / 2 - M.bw / 2, w: M.bw, h, y };
    if (w > 2) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(6,8,12,0.66)'; rr(ctx, x, y, w, h, 12); ctx.fill(); ctx.globalAlpha = 0.28; ctx.lineWidth = 1.2; ctx.strokeStyle = `rgb(${BL})`; ctx.stroke(); ctx.fillStyle = `rgb(${BL})`; }
    const txt = (D, q) => { const [ox, oy] = coin(L, D); D.L.forEach(l => { const r = c01(q(l)); if (r <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(ox + l.x - 4, oy + l.y - 60, (l.w + 8) * r, 90); ctx.clip();
      ctx.globalAlpha = l.a; ctx.font = l.font; ctx.fillStyle = `rgb(${BL})`; ctx.fillText(l.txt, ox + l.x, oy + l.y); ctx.restore(); }); };
    // (l'ancienne s'efface d'abord, de droite à gauche ; la nouvelle s'écrit ensuite)
    if (V && vu < 1) txt(V.cap, l => 1 - vu);
    else { txt(cap, l => reduit ? 1 : (tl - 0.5 - l.dl) * 900 / (l.w + 120)); const [ox, oy] = coin(L, cap);
      const ui = reduit ? 1 : c01((tl - 0.45) / 0.9); if (ui > 0) icone(ctx, cap.k, ox + cap.ic.x, oy + cap.ic.y, cap.ic.s, ui, now, 0); } }
  // la rangée de petites étoiles : une par scène (celle d'en cours est plus grosse, un cercle montre le temps qui reste) ; les flèches aux bouts
  if (C) { L.pts.forEach((p, i) => { const on = i === C.i, R = on ? 3.4 : M.vus.has(i) ? 2.2 : 1.6; etoile(ctx, p.x, p.y, R, on ? 1 : M.vus.has(i) ? 0.75 : 0.45, on, now, i);
      if (on && !reduit) { const F = DUREE.A + DUREE.B + DUREE.C, v = c01(tl / (F + C.tenue)); ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2; ctx.strokeStyle = `rgb(${BL})`; ctx.beginPath(); ctx.arc(p.x, p.y, 7.5, -Math.PI / 2, -Math.PI / 2 + v * TAU); ctx.stroke(); } });
    ctx.globalAlpha = 0.75; ctx.lineWidth = 1.6; ctx.strokeStyle = `rgb(${BL})`; L.fl.forEach(a => { const s = 5; ctx.beginPath(); ctx.moveTo(a.x - a.d * s * 0.5, a.y - s); ctx.lineTo(a.x + a.d * s * 0.5, a.y); ctx.lineTo(a.x - a.d * s * 0.5, a.y + s); ctx.stroke(); }); }
  ctx.restore();
});
let tPrec = 0; const dt0 = () => { const d = Wd.t - tPrec; tPrec = Wd.t; return clamp(d * 6, 0, 1); };

/* ——— les icônes des sous-titres : au trait, comme le reste ; elles se tracent (u : 0 → 1) ———
   ia : un petit réseau · front : une fenêtre de navigateur et </> · back : trois serveurs empilés · pilotage : une boussole · devops : la boucle sans fin */
function icone(ctx, k, x, y, s, u, now, vif) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = ctx.fillStyle = `rgb(${BL})`; ctx.lineWidth = 1.5 + (vif || 0) * 0.5; ctx.lineCap = ctx.lineJoin = 'round'; ctx.globalAlpha = 0.95;
  ctx.setLineDash([s * 14 * u, s * 20]);   // (le trait se dessine)
  const rr = (x0, y0, w, h, r) => { ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r); ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r); ctx.arcTo(x0, y0 + h, x0, y0, r); ctx.arcTo(x0, y0, x0 + w, y0, r); ctx.closePath(); ctx.stroke(); };
  if (k === 'ia') {
    const P = [0, 1, 2, 3, 4, 5].map(i => { const a = -Math.PI / 2 + i * TAU / 6 + 0.25; return [Math.cos(a) * s, Math.sin(a) * s * 0.9]; });
    P.forEach((p, i) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p[0], p[1]); ctx.stroke(); const q = P[(i + 1) % 6]; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 0.95; });
    ctx.setLineDash([]); if (u >= 1) { P.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], s * 0.13, 0, TAU); ctx.fill(); }); ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.12, 0, TAU); ctx.fill();
      if (!reduit) { const f = (now * 0.8) % 1, p = P[Math.floor(now * 0.8) % 6]; O.brille(ctx, p[0] * f, p[1] * f, 2.2, Math.sin(Math.PI * f), false, now, 3); } }
  } else if (k === 'front') {
    rr(-s, -s * 0.72, s * 2, s * 1.44, s * 0.18); ctx.beginPath(); ctx.moveTo(-s, -s * 0.36); ctx.lineTo(s, -s * 0.36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.35, -s * 0.02); ctx.lineTo(-s * 0.62, s * 0.2); ctx.lineTo(-s * 0.35, s * 0.42); ctx.moveTo(s * 0.35, -s * 0.02); ctx.lineTo(s * 0.62, s * 0.2); ctx.lineTo(s * 0.35, s * 0.42); ctx.moveTo(s * 0.12, -s * 0.06); ctx.lineTo(-s * 0.12, s * 0.46); ctx.stroke();
    ctx.setLineDash([]); if (u >= 1) [-0.8, -0.62, -0.44].forEach(a => { ctx.beginPath(); ctx.arc(s * a, -s * 0.54, s * 0.05, 0, TAU); ctx.fill(); });
  } else if (k === 'back') {
    [-0.72, -0.2, 0.32].forEach(a => rr(-s * 0.95, s * a, s * 1.9, s * 0.42, s * 0.1));
    ctx.setLineDash([]); if (u >= 1) [-0.72, -0.2, 0.32].forEach((a, i) => { ctx.globalAlpha = 0.5 + 0.5 * (Math.sin(now * 3 + i * 2) > 0 ? 1 : 0); ctx.beginPath(); ctx.arc(-s * 0.62, s * (a + 0.21), s * 0.07, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.moveTo(-s * 0.2, s * (a + 0.21)); ctx.lineTo(s * 0.62, s * (a + 0.21)); ctx.stroke(); });
  } else if (k === 'pilotage') {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.92, 0, TAU); ctx.stroke();
    const a = Math.sin(now * 0.9) * 0.35 + 0.6; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, -s * 0.68); ctx.lineTo(s * 0.18, 0); ctx.lineTo(0, s * 0.68); ctx.lineTo(-s * 0.18, 0); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]); if (u >= 1) { ctx.beginPath(); ctx.moveTo(0, -s * 0.68); ctx.lineTo(s * 0.18, 0); ctx.lineTo(-s * 0.18, 0); ctx.closePath(); ctx.fill(); } ctx.restore();
    [0, 1, 2, 3].forEach(i => { const b = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(b) * s * 0.92, Math.sin(b) * s * 0.92); ctx.lineTo(Math.cos(b) * s * 1.1, Math.sin(b) * s * 1.1); ctx.stroke(); });
  } else if (k === 'devops') {
    ctx.beginPath(); for (let i = 0; i <= 60; i++) { const t = i / 60 * TAU, d = 1 + Math.sin(t) * Math.sin(t); ctx.lineTo(s * Math.cos(t) / d, s * 0.9 * Math.sin(t) * Math.cos(t) / d); } ctx.stroke();
    ctx.setLineDash([]); if (u >= 1 && !reduit) { const t = now * 1.6, d = 1 + Math.sin(t) * Math.sin(t); O.brille(ctx, s * Math.cos(t) / d, s * 0.9 * Math.sin(t) * Math.cos(t) / d, 2.4, 0.9, false, now, 5); }
  }
  ctx.restore();
}

/* ——— le dessin : la craie des cadres, le stylo des mots ; la pointe, au bout ——— */

/* ——— la main : attraper la constellation pour la faire tourner (un toucher : la scène suivante) ; les petites étoiles d'en bas, les flèches ———
   (seulement sur une étoile de la constellation : ailleurs, dans le ciel, on dessine toujours, js/espace-dessin.js) */
const TOURNE = {
  drag(k, x, y) { if (!k.bouge) { if (Math.hypot(x - k.x0, y - k.y0) < 6) return; k.bouge = true; M.tenu = true; k.px = x; k.py = y; }
    M.ry += (x - k.px) * 0.009; M.rx -= (y - k.py) * 0.007; k.px = x; k.py = y; },
  release(k, vx, vy) { M.tenu = false; if (!k.bouge) { aller(M.sc.i + 1); return; } M.vry = clamp((vx || 0) * 0.006, -6, 6); M.vrx = clamp(-(vy || 0) * 0.004, -3, 3); }
};
const BOUTON = { drag() {}, release(k) { if (M) aller(k.j); } };
X.grab.push((x, y) => {
  if (!M || !M.sc) return null; const L = M.lay;
  for (let i = 0; i < L.pts.length; i++) { const p = L.pts[i]; if (Math.abs(x - p.x) < L.pas / 2 && Math.abs(y - p.y) < 16) return { mod: BOUTON, j: i }; }
  for (const a of L.fl) if (Math.hypot(x - a.x, y - a.y) < 18) return { mod: BOUTON, j: M.sc.i + a.d };
  const P = M.sc.pos; if (!P || tps() < DUREE.A) return null;
  if (M.sc.f.p.some((p, j) => p[3] > 0 && P[j] && Math.hypot(P[j][0] - x, P[j][1] - y) < 18)) return { mod: TOURNE, x0: x, y0: y };
  return null;
});

/* ——— les chats : au cinéma. Ils viennent s'asseoir sur la Terre, le nez vers le ciel, et regardent la séance ——— */
function siege(c) {
  const W = O.W, r = rayon(c), autres = Wd.cats.filter(o => o !== c && o.sp && (o.sp.m === 'cine' || (o.sp.cible && o.sp.cible.siege != null))).map(o => [o.sp.m === 'cine' ? o.sp.sx : o.sp.cible.siege, rayon(o)]);
  for (let n = 0; n < 14; n++) { const x = rnd(0.05, 0.95) * W; if (autres.every(([a, ro]) => Math.abs(a - x) > (r + ro) * 0.95)) return x; }
  return null;
}
function assied(c, x) {
  const S = c.sp, dodo = Math.random() < 0.12 && ANIMS.dodo;
  Object.assign(S, { m: 'cine', sx: x, fin: Wd.t + rnd(18, 40), anim: dodo ? 'dodo' : pick(['assis', 'assis', 'pain', 'assis'].filter(a => ANIMS[a])) || 'assis', vx: 0, vy: 0, cible: null });
  if (Math.random() < 0.5) say(c, pick(en() ? ['showtime!', 'shh…', 'popcorn?', 'front row'] : ['la séance !', 'chut…', 'pop-corn ?', 'premier rang', 'ça commence']));
  if (window.Dex && Dex.vu) Dex.vu('cinema');
}
function leve(c, v) { const S = c.sp; S.m = 'derive'; S.vx = rnd(-60, 60); S.vy = -rnd(0.7, 1) * v; S.next = Wd.t + rnd(2, 4); S.lache = Wd.t; S.anim = 'apesanteur'; c.spin = 0; }
X.mode.cine = (c, dt) => {
  const S = c.sp; if (!M) { leve(c, 120); return; }
  const T = terre(), x = S.sx, y = surface(x), a = Math.atan2(y - T.cy, x - T.cx);
  // (assis sur la courbe de la Terre, tourné vers l'écran du ciel)
  c.face = sgn(M.lay.cx - x) || 1; c.spin = -(a + Math.PI / 2) * c.face; c.x = x; c.y = y;
  c.anim = S.rea && Wd.t < S.rea ? S.animR : S.anim;
  if (Wd.t > S.fin) { leve(c, 150); if (Math.random() < 0.4) say(c, pick(en() ? ['brb', 'stretch!'] : ['entracte', 'je reviens', 'hop'])); }
};
// à la fin de chaque dessin : un ou deux spectateurs réagissent
function reagit(C) {
  const V = Wd.cats.filter(c => c.sp && c.sp.m === 'cine'); if (!V.length) return;
  const n = Math.min(V.length, Math.random() < 0.4 ? 2 : 1);
  for (let k = 0; k < n; k++) { const c = V.splice(Math.floor(Math.random() * V.length), 1)[0], S = c.sp;
    if (S.anim === 'dodo') { if (Math.random() < 0.5) say(c, 'zzz'); continue; }
    S.rea = Wd.t + 1.4; S.animR = ANIMS.debout ? 'debout' : S.anim;
    later(k * 0.5, () => say(c, pick(en() ? ['ooh…', 'wow', '✦', 'again!', C.S[2] ? 'AI!' : 'nice'] : ['ooh…', 'waouh', '✦', 'encore !', 'joli', C.S[2] ? 'IA !' : 'bravo']))); }
}
const later = (d, f) => (K.later ? K.later(d, f) : setTimeout(f, d * 1000));
X.envie.push(c => {
  if (!M || !M.sc || Math.random() < 0.3 || c.rare === 'geant') return false; const S = c.sp;
  const n = Wd.cats.filter(o => o.sp && (o.sp.m === 'cine' || (o.sp.m === 'nage' && o.sp.cible && o.sp.cible.siege != null))).length;
  if (n >= Math.max(3, Math.ceil(Wd.cats.filter(o => o.sp).length * 0.75))) return false;
  const x = siege(c); if (x == null) return false;
  S.m = 'nage'; S.fin = Wd.t + 9; S.cible = { siege: x, x, get y() { return surface(x) - rayon(c) * 0.9; }, r: 1.3, arrive: c => assied(c, x) };
  return true;
});

return { get M() { return M; }, pointe: () => null, get planete() { return M && M.lay.planete; }, set onFini(f) { onFini = f; }, get fini() { return !!(M && M.fin); }, aller };
})();
