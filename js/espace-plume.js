/* Dans l'espace (l'écran 2) : la présentation de Mathieu, racontée par les étoiles, qui défile toute seule
   (28/09, 19:28, Mathieu : « une histoire animée et dessinée pour présenter chacune de mes compétences […] les étoiles génèrent les dessins,
   les illustrations et les objets 3D, un par un […] les chats regardent comme un cinéma en plein air » ;
   20:08 : « beaucoup plus structuré : explique comment je travaille, puis mes compétences, visuellement ; tout doit défiler automatiquement ;
   pas convaincu par l'encart de texte sur le côté ; vire l'effet au clic et au glisser qui dessine » (js/espace-dessin.js n'est plus chargé)).
   - Deux chapitres, annoncés par une barre en haut qui avance : I. Comment je travaille (l'équipe, puis les six temps de sa méthode),
     II. Mes compétences (la puce, puis ses six couches). Les mots viennent du mode sérieux (js/serieux-donnees.js), la source de vérité.
   - Chaque scène : des étoiles quittent le ciel et viennent se poser ; des traits les relient (une constellation) ; le trait s'affirme et le dessin
     s'anime (un objet en 3D qui tourne, un réseau parcouru d'influx, des barres qui se mesurent…). Dessous, centrés, sans encart : le numéro,
     le titre et son icône, une phrase, les outils. Puis les étoiles repartent dans le ciel, et la scène suivante se forme. Rien à cliquer.
     (la souris sur les sous-titres : la scène attend qu'on ait fini de lire)
   - Les chats viennent s'asseoir sur la Terre, en bas, le nez en l'air, et regardent la séance (« ooh… ») ; parfois l'un d'eux s'endort ;
     ceux qui flottent devant le dessin ou le texte sont doucement poussés de côté.
   - Jamais « il maîtrise les modèles » (19:16) : sa méthode (un dev et ses agents = une équipe de dix). */
window.EspacePlume = (() => {
if (!window.TrouNoir || !TrouNoir.outils) return null;
const O = TrouNoir.outils, { X, K, centreDe, rayon, say } = O, { Wd, ANIMS, rnd, pick, clamp, sgn, sm } = K;
const TAU = Math.PI * 2, BL = '244,244,238';
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const en = () => !!(window.I18N && I18N.lang && I18N.lang !== 'fr');
const c01 = v => clamp(v, 0, 1);
const bruit = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ——— le récit : [dessin, icône, chapitre, titre, phrase, outils] ; la première scène de chaque chapitre l'annonce ———
   (les mots : ceux du mode sérieux, js/serieux-donnees.js : methode, competences) */
const CHAPITRES = () => en() ? ['How I work', 'My skills'] : ['Comment je travaille', 'Mes compétences'];
const COURT = () => en() ? ['Method', 'Skills'] : ['Méthode', 'Compétences'];   // (sur téléphone, dans la barre)
const SCENES = () => (en() ? [
  ['equipe', 'ia', 0, 'One developer, the strength of a team', 'Where it took ten developers and years, I deliver alone, surrounded by agents I orchestrate.', 'AI doesn’t replace the craft: it multiplies whoever knows how to direct it'],
  ['terminaux', 'ia', 0, 'Many terminals, many agents', 'Each job gets its own terminal, its own Git worktree and its own agent: one writes, another tests, a third reviews.', 'Git worktrees · Multi-terminal · Agents in parallel'],
  ['agents', 'ia', 0, 'Agents that delegate to sub-agents', 'A lead agent splits the goal and launches specialised sub-agents: exploration, code, tests, review. I recompose and decide.', 'Sub-agents · Multi-agent workflows · Arbitration'],
  ['skills', 'ia', 0, 'Custom skills and plugins', 'As soon as a task comes back, it becomes a tool: skills, commands, dedicated agents, MCP servers.', 'Skills · Plugins · MCP servers · Commands'],
  ['bench', 'ia', 0, 'Test everything, measure everything', 'Harnesses, orchestrators, plugins: I test what comes out, compare on real work and keep only what saves time.', 'Continuous benchmark · Harness · endless · codex-crew'],
  ['flotte', 'ia', 0, 'A fleet of agents on one product', 'On MARKO, big jobs go through Claude Code multi-agent workflows (ultracode); short calls go through Jev (TypeSafe AI), a model that doesn’t write but decides.', 'Claude Code ultracode · Jev · Orchestration'],
  ['gardefous', 'ia', 0, 'Speed, without losing control', 'Tests at every step, automated review in CI, security scanners, and a human decision before every merge.', 'Tests · CI review · Scanners · Human in the loop'],
  ['puce', 'ia', 1, 'Six layers, like a chip', 'AI at the core, what you see above, what holds everything underneath. From the CV and a read of all my repositories.', ''],
  ['rag', 'ia', 1, 'AI & data', 'Systems that read, search, reason and act, in production as in research.', 'Hybrid RAG · Agents & sub-agents · MCP / WebMCP · Document AI · OCR · Machine learning'],
  ['front', 'front', 1, 'Front-end & interfaces', 'What you see and touch: fast, animated, accessible interfaces.', 'React · Next.js · Vue · Nuxt · TypeScript · three.js · GSAP · D3'],
  ['back', 'back', 1, 'Back-end & data', 'What holds everything: APIs, task queues, databases isolated per client.', 'Python · FastAPI · Node.js · Go · PHP · Celery · Redis · PostgreSQL'],
  ['devops', 'devops', 1, 'DevOps & cloud', 'Containers, deployments, observability.', 'Docker · Traefik · GitHub Actions · GitLab CI · Azure · AWS · Vercel · Grafana'],
  ['secu', 'secu', 1, 'Security & quality', 'We test, we scan, we protect the data.', 'OWASP · CodeQL · Semgrep · Trivy · Privacy by design · Playwright · WCAG'],
  ['pilotage', 'pilotage', 1, 'Leadership & method', 'Teams, a method, a roadmap.', 'Tech lead · Management · Mentoring · Augmented development · Agile · ADR · Pre-sales']
] : [
  ['equipe', 'ia', 0, 'Un développeur, la force d’une équipe', 'Là où il fallait une équipe de dix développeurs et des années, je livre seul, entouré d’agents que j’orchestre.', 'L’IA ne remplace pas le métier : elle démultiplie celui qui sait la diriger'],
  ['terminaux', 'ia', 0, 'Plusieurs terminaux, plusieurs agents', 'Chaque chantier part dans son terminal et son worktree Git isolé, avec son agent : l’un écrit, un autre teste, un troisième relit.', 'Worktrees Git · Multi-terminaux · Agents en parallèle'],
  ['agents', 'ia', 0, 'Des agents qui délèguent à des sous-agents', 'Un agent principal découpe l’objectif et lance des sous-agents spécialisés : exploration, code, tests, revue. Je recompose, je tranche.', 'Sous-agents · Workflows multi-agents · Arbitrage'],
  ['skills', 'ia', 0, 'Des skills et des plugins sur mesure', 'Dès qu’une tâche revient, elle devient un outil : skills, commandes, agents dédiés, serveurs MCP.', 'Skills · Plugins · Serveurs MCP · Commandes'],
  ['bench', 'ia', 0, 'Tout tester, tout mesurer', 'Harness, orchestrateurs, plugins : je teste ce qui sort, je compare sur de vrais chantiers et je ne garde que ce qui fait gagner du temps.', 'Benchmark continu · Harness · endless · codex-crew'],
  ['flotte', 'ia', 0, 'Une flotte d’agents sur un même produit', 'Sur MARKO, les gros chantiers passent par les workflows multi-agents de Claude Code (ultracode) ; les arbitrages courts passent par Jev (TypeSafe AI), un modèle qui ne rédige pas mais tranche.', 'Claude Code ultracode · Jev · Orchestration'],
  ['gardefous', 'ia', 0, 'La vitesse, sans perdre le contrôle', 'Tests à chaque étape, revue automatique en CI, scanners de sécurité, et une décision humaine avant chaque fusion.', 'Tests · Revue en CI · Scanners · Humain dans la boucle'],
  ['puce', 'ia', 1, 'Six couches, comme une puce', 'L’IA au cœur, ce qu’on voit au-dessus, ce qui tient tout en dessous. Tiré du CV et de la lecture de tous mes dépôts.', ''],
  ['rag', 'ia', 1, 'IA & données', 'Des systèmes qui lisent, cherchent, raisonnent et agissent, en production comme en recherche.', 'RAG hybride · Agents & sous-agents · MCP / WebMCP · Document AI · OCR · Machine learning'],
  ['front', 'front', 1, 'Front & interfaces', 'Ce qu’on voit et ce qu’on touche : des interfaces rapides, animées, accessibles.', 'React · Next.js · Vue · Nuxt · TypeScript · three.js · GSAP · D3'],
  ['back', 'back', 1, 'Back-end & données', 'Ce qui tient tout : des API, des files de tâches, des bases isolées par client.', 'Python · FastAPI · Node.js · Go · PHP · Celery · Redis · PostgreSQL'],
  ['devops', 'devops', 1, 'DevOps & cloud', 'Des conteneurs, des déploiements, de l’observabilité.', 'Docker · Traefik · GitHub Actions · GitLab CI · Azure · AWS · Vercel · Grafana'],
  ['secu', 'secu', 1, 'Sécurité & qualité', 'On teste, on scanne, on protège les données.', 'OWASP · CodeQL · Semgrep · Trivy · Privacy by design · Playwright · RGAA'],
  ['pilotage', 'pilotage', 1, 'Leadership & méthode', 'Des équipes, une méthode, une feuille de route.', 'Tech lead · Management · Mentorat · Développement augmenté · Agile · ADR · Avant-vente']
]).map(([d, ic, ch, t, x, o]) => ({ d, ic, ch, t, x, o }));

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
    f.rot = t => [0.4, 0.5 * Math.sin(t * 0.35), 0]; return f; },
  // une flotte d'agents : le produit au centre (un cube), deux orbites d'agents qui tournent autour et y envoient leur travail
  flotte() { const f = fig(), c = f.boite(-0.34, -0.34, -0.34, 0.34, 0.34, 0.34, 1), mid = f.pt(0, 0, 0, 0), A = [];
    for (let k = 0; k < 14; k++) { A.push(f.pt(0, 0, 0, k % 4 === 0 ? 1.8 : 1.3)); if (k % 2 === 0) { f.ar(A[k], mid, 'fin'); f.flux.push([A[k], mid]); } }
    for (let k = 0; k < 8; k++) f.ar(A[k], A[(k + 1) % 8], 'fin'); for (let k = 0; k < 6; k++) f.ar(A[8 + k], A[8 + (k + 1) % 6], 'fin');
    f.geo = (P, t) => A.forEach((i, k) => { const o = k < 8 ? 0 : 1, n = o ? 6 : 8, j = o ? k - 8 : k, a = j / n * TAU + t * (o ? -0.5 : 0.7), R = o ? 0.66 : 0.95, ti = o ? -0.5 : 0.35;
      P[i][0] = Math.cos(a) * R; P[i][1] = Math.sin(a) * R * Math.sin(ti); P[i][2] = Math.sin(a) * R * Math.cos(ti); });
    f.rot = t => [0.3, t * 0.2, 0]; return f; },
  // les garde-fous : un bouclier, sa coche ; une ligne de contrôle le parcourt de haut en bas
  gardefous() { const f = fig(), B = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12, y = -0.85 + u * 1.75, x = 0.62 * (u < 0.45 ? 1 : Math.cos((u - 0.45) / 0.55 * Math.PI / 2)); B.push([x, y - (u === 0 ? 0 : 0)]); }
    const P = [[0, -0.95]].concat(B.map(([x, y]) => [x, y])).concat(B.slice(0, -1).reverse().map(([x, y]) => [-x, y]));
    const i0 = f.lg(P, true, j => j % 4 ? 0 : 1);
    f.lg([[-0.3, 0.02], [-0.07, 0.26], [0.34, -0.26]], false, j => j === 2 ? 1.5 : 0.8);
    f.plus = (ctx, Q, t, u, now) => { if (u <= 0) return; const v = (t * 0.35) % 1, y = -0.85 + v * 1.75; let a = null, b = null;
      Q.forEach((q, j) => { if (j < i0 || j >= i0 + P.length) return; const p = P[j - i0]; if (Math.abs(p[1] - y) < 0.08) { if (p[0] >= 0) a = a || q; else b = b || q; } });
      if (a && b) { ctx.globalAlpha = u * 0.8; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); O.brille(ctx, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 3.4, u, false, now, 2); } };
    f.rot = t => [0.12, 0.45 * Math.sin(t * 0.4), 0]; return f; },
  // la puce : six couches empilées (l'IA au cœur) qui s'écartent, se resserrent ; des broches autour de celle du milieu
  puce() { const f = fig(), C = [];
    for (let k = 0; k < 6; k++) { const s = k === 2 ? 0.62 : 0.52 + (k % 2) * 0.06; C.push(f.lg([[-s, 0, -s], [s, 0, -s], [s, 0, s], [-s, 0, s]], true, k === 2 ? 1.4 : 0.8)); }
    const B = []; for (let k = 0; k < 4; k++) for (let j = -1; j <= 1; j++) { const a = f.pt(0, 0, 0, 0), b = f.pt(0, 0, 0, 0.5); f.ar(a, b); B.push([a, b, k, j * 0.3]); }
    f.geo = (P, t) => { const e = 0.16 + 0.07 * Math.sin(t * 0.9); C.forEach((i, k) => { for (let j = 0; j < 4; j++) P[i + j][1] = (k - 2.5) * e; });
      B.forEach(([a, b, k, o]) => { const y = (2 - 2.5) * e, s = 0.62, d = [[1, 0], [0, 1], [-1, 0], [0, -1]][k]; P[a][0] = d[0] * s + d[1] * o; P[a][2] = d[1] * s + d[0] * o; P[a][1] = y; P[b][0] = d[0] * (s + 0.22) + d[1] * o; P[b][2] = d[1] * (s + 0.22) + d[0] * o; P[b][1] = y; }); };
    f.rot = t => [0.5, t * 0.3, 0]; return f; },
  // la sécurité : un cadenas ; son anse se referme, clic
  secu() { const f = fig(), i0 = f.p.length;
    f.lg([[-0.46, -0.05], [0.46, -0.05], [0.46, 0.72], [-0.46, 0.72]], true, 1);
    f.rond(0, 0.26, 0, 0.09, 8, 0); f.lg([[0, 0.35], [0, 0.52]], false, j => j ? 0.8 : 0);
    const A = []; for (let k = 0; k <= 10; k++) { const a = Math.PI + k / 10 * Math.PI; A.push([Math.cos(a) * 0.3, -0.05 + Math.sin(a) * 0.46 - 0.1]); }
    const j0 = f.lg([[-0.3, -0.05]].concat(A.slice(1, -1)).concat([[0.3, -0.05]]), false, j => j % 5 ? 0 : 1);
    const n = A.length; f.geo = (P, t) => { const d = -0.22 * (1 - sm(c01((t - 3.6) / 0.5))); for (let i = j0; i < j0 + n; i++) P[i][1] += d; };
    f.plus = (ctx, Q, t, u, now) => { const k = t - 4.1; if (k < 0) return; const q = Q[j0 + n - 1]; O.brille(ctx, q[0], q[1], 4 + 2 * Math.max(0, 1 - k), 0.9, true, now, 1); };
    f.rot = t => [0.15, 0.4 * Math.sin(t * 0.4), 0]; return f; }
};

/* ——— les lettres : pleines et nettes (19:27, Mathieu : « les textes sont assez illisibles ») ; Space Grotesk, le nom dans la police du grand titre ——— */
const NET = '"Space Grotesk","Barlow",system-ui,sans-serif';
const police = (px, k) => { if (k === 'fort') return `600 ${px}px ${NET}`; if (!k) return `500 ${px}px ${NET}`;
  const h1 = document.querySelector('h1[data-title]'), cs = h1 && getComputedStyle(h1); return cs ? `${cs.fontWeight} ${px}px ${cs.fontFamily}` : `600 ${px}px ${NET}`; };
const toile = document.createElement('canvas'), tx = toile.getContext('2d');
const largeur = (txt, font) => { tx.font = font; return tx.measureText(txt).width; };
// (des lignes qui tiennent dans wmax, coupées entre les mots)
function lignes(txt, font, wmax) { txt = txt.replace(/ ([:;!?»])/g, '\u00a0$1').replace(/« /g, '«\u00a0'); const R = []; let l = ''; txt.split(' ').forEach(m => { const e = l ? l + ' ' + m : m; if (l && largeur(e, font) > wmax) { R.push(l); l = m; } else l = e; }); if (l) R.push(l); return R; }

// la Terre, en bas (la même que js/espace-planetes.js) : les chats s'y assoient pour regarder
const hautTerre = () => { const H = O.H, h = clamp(H * 0.085, 44, 84); return O.BAS() - h + 18; };
function terre() { const W = O.W, H = O.H, bas = O.BAS(), h = clamp(H * 0.085, 44, 84), R = Math.max(W * 1.15, (W * W / 4) / (2 * h) + h / 2); return { cx: W / 2, cy: bas - h + R + 18, R }; }
const surface = x => { const T = terre(); return T.cy - Math.sqrt(Math.max(0, T.R * T.R - (x - T.cx) * (x - T.cx))); };

/* ——— la mise en page : en haut, la barre des deux chapitres ; au milieu, l'écran du ciel (où se forment les dessins) ;
   dessous, centrés, les sous-titres (sans encart) ; en bas, la Terre, où s'assoient les spectateurs ——— */
let M = null;
const ROMAIN = ['I', 'II'], MONO = '"IBM Plex Mono",ui-monospace,monospace';
const espace = (ctx, v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v; };
function sousTitre(S, L, wmax, num, N, chap) {
  const intro = num === 0, pE = L ? 13 : 11.5, pT = intro ? (L ? 36 : 25) : (L ? 31 : 22), pP = L ? 19.5 : 16, pO = L ? 15 : 13, is = pT * 0.55, g = pT * 0.4;
  const fE = `500 ${pE}px ${MONO}`, fT = police(pT, 'fort'), fP = police(pP), fO = police(pO), R = [];
  const eti = (ROMAIN[S.ch] + ' · ' + chap + (intro ? '' : `  —  ${String(num).padStart(2, '0')} / ${String(N - 1).padStart(2, '0')}`)).toUpperCase();
  espace(tx, '0.18em'); R.push({ txt: eti, font: fE, w: largeur(eti, fE), y: pE, a: 0.78, dl: 0, esp: '0.18em' }); espace(tx, '0px');
  let y = pE + pT * 0.5; const tl = lignes(S.t, fT, wmax - is * 2 - g), wT = Math.max(...tl.map(l => largeur(l, fT)));
  tl.forEach((l, i) => { const w = largeur(l, fT); R.push({ txt: l, font: fT, w, y: y + pT * 0.95, a: 1, dl: 0.2 + i * 0.3, t: 1 }); y += pT * 1.2; }); y += pT * 0.15;
  lignes(S.x, fP, wmax).forEach((l, i) => { R.push({ txt: l, font: fP, w: largeur(l, fP), y: y + pP * 1.05, a: 1, dl: 0.5 + i * 0.25 }); y += pP * 1.45; });
  if (S.o) { y += pO * 0.35; lignes(S.o, fO, wmax).forEach((l, i) => { R.push({ txt: l, font: fO, w: largeur(l, fO), y: y + pO * 1.05, a: 0.82, dl: 0.9 + i * 0.25 }); y += pO * 1.5; }); }
  // (x : depuis le centre ; le titre laisse la place de son icône, à gauche)
  R.forEach(l => { l.x = l.t ? -(wT + is * 2 + g) / 2 + is * 2 + g + (wT - l.w) / 2 : -l.w / 2; });
  return { L: R, ic: { x: -(wT + is * 2 + g) / 2 + is, y: R.find(l => l.t).y - pT * 0.35, s: is }, w: Math.max(...R.map(l => l.w)) + is * 2 + g, h: y, k: S.ic };
}
function compose() {
  const W = O.W, H = O.H, L = W >= 760, SC = SCENES(), CH = CHAPITRES();
  // la barre des chapitres : deux segments (un par chapitre), une encoche par scène
  const yB = O.HAUT() + (L ? 14 : 40), wB = Math.min(W - (L ? 80 : 32), 760), xB = W / 2 - wB / 2, gB = L ? 28 : 16;
  const nc = [0, 1].map(c => SC.filter(S => S.ch === c).length), seg = [0, 1].map(c => ({ x: xB + (c ? (wB - gB) * nc[0] / (nc[0] + nc[1]) + gB : 0), w: (wB - gB) * nc[c] / (nc[0] + nc[1]), n: nc[c], nom: `${ROMAIN[c]} · ${L ? CH[c] : COURT()[c]}`.toUpperCase() }));
  const barre = { y: yB, seg, bas: yB + (L ? 22 : 18) };
  const r = L ? clamp(Math.min(W, H) * 0.07, 38, 64) : clamp(Math.min(W, H) * 0.07, 30, 44), planete = L ? [W - W * 0.035 - r, barre.bas + r + 18] : [W - r - 10, barre.bas + r + 26];
  // les sous-titres : ancrés en bas, au-dessus des spectateurs
  const place = L ? 42 : 56, wmax = Math.min(W - 32, L ? 900 : 9999), yCap = hautTerre() - place - 4;
  const caps = SC.map((S, i) => { const num = SC.slice(0, i + 1).filter(q => q.ch === S.ch).length - 1; return sousTitre(S, L, wmax, num, nc[S.ch], CH[S.ch]); });
  const hMax = Math.max(...caps.map(c => c.h));
  // l'écran du ciel : tout ce qui reste entre la barre et les sous-titres
  const t0 = barre.bas + (L ? 18 : 10), b0 = yCap - hMax - (L ? 22 : 14), cx = W / 2, cy = (t0 + b0) / 2;
  const s = Math.max(40, Math.min((b0 - t0) / 2 * 0.94, L ? W * 0.26 : W / 2 * 0.8));
  // (pour les scènes dessinées, js/espace-scenes.js : la largeur qu'elles peuvent prendre, les bords, l'épaisseur du trait, celle des chats)
  // (29/09, 07:51, Mathieu : « vois plus grand ») : les scènes dessinées prennent tout le ciel, de la barre jusqu'à la Terre ; les sous-titres passent
  // par-dessus, sur un voile de nuit
  const bF = hautTerre() - (L ? 12 : 6), gs = Math.max(60, Math.min((bF - t0) / 2 * 0.98, L ? W * 0.3 : W / 2 * 0.95));
  const G = { cx, cy: t0 + (bF - t0) * 0.47, s: gs * 1.08, sw: Math.min(W * 0.47, Math.max(gs * 1.2, (bF - t0) * 1.6)), lw: L ? 2.6 : 2.1, gauche: 16, droite: W - 16, haut: t0, bas: bF, caps: yCap - hMax - 12 };
  return { W, H, L, barre, caps, yCap, cx, cy, s, G, planete, SC };
}

/* ——— la séance : une scène à la fois ——— */
// (29/09, 06:24 : A laisse le temps à la nuée d'écrire le titre de la scène en étoiles, js/espace-nuee.js, avant que le dessin apparaisse)
const DUREE = reduit ? { A: 0.01, B: 0.01, C: 0.01 } : { A: 2.6, B: 1.7, C: 0.9 };
const tenue = cap => (reduit ? 4 : 0) + clamp(5 + cap.L.reduce((n, l) => n + l.txt.length, 0) / 26, 8.5, 12);
const ES = () => window.EspaceScenes && EspaceScenes.S;
// les points où se posent les étoiles d'une scène dessinée, à l'écran
const clesDe = C => C.cs.cles().map(([x, y]) => [M.lay.G.cx + x * M.lay.G.s, M.lay.G.cy + y * M.lay.G.s, 1, 0]);
let pret = false, onFini = null, fin1 = false;
function scene(i) {
  const lay = M.lay, S = lay.SC[i], cs = ES() && ES()[S.d], f = cs ? { p: window.EspaceNuee ? [] : cs.cles().map(() => [0, 0, 0, 1.3]), e: [], flux: [], rot: () => [0, 0, 0] } : DESSINS[S.d](), W = lay.W, hb = hautTerre();
  // (d'où vient chaque étoile : un endroit du ciel, au hasard ; les plus proches arrivent les premières)
  const et = f.p.map((p, j) => ({ ox: rnd(0.02, 0.98) * W, oy: rnd(O.HAUT() + 4, hb - 30), dl: 0.55 * bruit(j * 1.7 + i * 13), ph: rnd(0, TAU) }));
  return { i, S, f, cs, et, t0: Wd.t, cap: lay.caps[i], tenue: tenue(lay.caps[i]), Q: null, reagi: false };
}
// passer à une scène : les étoiles de l'ancienne repartent dans le ciel ; ses sous-titres s'effacent au stylo
function aller(j) {
  if (!M) return; const n = M.lay.SC.length; j = ((j % n) + n) % n; const C = M.sc;
  if (C && C.Q) C.f.p.forEach((p, k) => { if (p[3] <= 0) return; const q = C.pos ? C.pos[k] : C.Q[k]; M.part.push({ x: q[0], y: q[1], ox: rnd(0.02, 0.98) * M.lay.W, oy: rnd(O.HAUT() + 4, hautTerre() - 30), t0: Wd.t, R: 1.3 + 1.3 * p[3], ph: C.et[k].ph }); });
  if (C) M.vieux = { cap: C.cap, t0: Wd.t, tl: Wd.t - C.t0, sc: C };
  M.sc = scene(j); M.ry = M.rx = 0;
}
const tps = () => M && M.sc ? Wd.t - M.sc.t0 : 0;
const forme = () => M && M.sc && tps() >= DUREE.A + DUREE.B + DUREE.C;

X.entre.push(() => { M = null; pret = false; fin1 = false;
  const go = () => { pret = true; M = { lay: compose(), t0: Wd.t, part: [], vus: new Set(), fin: false, rx: 0, ry: 0, vrx: 0, vry: 0, bw: 0, bh: 0, sc: null, vieux: null };
    M.lay0 = Wd.t + (reduit ? 0 : 2.2); };
  // (les polices doivent être chargées, sinon les largeurs mesurées seraient celles d'une autre)
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(police(24)), document.fonts.load(police(24, 'fort')), document.fonts.load(police(24, true))]).then(go, go); else go(); });
X.retour.push(() => { M = null; pret = false; });
// (20:39, Mathieu : « réduis la taille des chats, on ne voit pas bien le texte ») : pendant la présentation, les chats rapetissent un peu
X.echelle = c => M && M.sc ? (c.rare === 'geant' ? 0.4 : 0.66) : 1;
// (29/09, 07:49, Mathieu : « fais gaffe, en petit les chats ne sont pas bien faits ») : le trait (en pixels) ne rapetissait pas avec eux ;
// les détails se bouchaient. Le trait suit maintenant leur taille (un peu moins vite : racine carrée), jusqu'à la moitié
X.pas.push((dt, cats) => cats.forEach(c => { if (!c.mats) return; const k = Math.max(0.5, Math.min(1, Math.sqrt((X.echelle(c)) * (X.loin ? X.loin(c) : 1))));
  if (Math.abs((c.trEp || 1) - k) < 0.01) return; { const e0 = c.trEp || 1; c.trEp = e0 + (k - e0) * Math.min(1, dt * 4); }
  c.mats.forEach(m => ['line', 'soft', 'out', 'out2'].forEach(n => { const x = m[n], u = x && x.uniforms && x.uniforms.width; if (!u) return; if (x.userData.w0 == null) x.userData.w0 = u.value; u.value = x.userData.w0 * c.trEp; })); }));

X.pas.push((dt, cats) => {
  if (!M) return;
  if (M.lay.W !== O.W || M.lay.H !== O.H) { M.lay = compose(); if (M.sc) M.sc.cap = M.lay.caps[M.sc.i]; }
  if (!M.sc) { if (Wd.t >= M.lay0) aller(0); return; }
  const C = M.sc, tl = tps(), F = DUREE.A + DUREE.B + DUREE.C;
  // la souris sur les sous-titres (on lit) : la scène attend
  const P = Wd.ptr, b = M.bande;
  if (tl > F && b && P && P.on && Wd.t - P.moved < 8 && P.x > b.x && P.x < b.x + b.w && P.y > b.y && P.y < b.y + b.h) C.t0 += dt;
  if (tl > F && !C.reagi) { C.reagi = true; M.vus.add(C.i); reagit(C);
    if (!fin1) { fin1 = true; if (onFini) onFini(); }
    if (M.vus.size >= M.lay.SC.length) { M.fin = true; if (window.Dex && Dex.vu) Dex.vu('competences'); } }
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

let HC = null; const horsChamp = cv => { if (!HC) HC = document.createElement('canvas'); if (HC.width !== cv.width || HC.height !== cv.height) { HC.width = cv.width; HC.height = cv.height; } return HC; };
X.fond.push((ctx, now) => {
  if (!M) return; const L = M.lay, th = Wd.t - M.t0;
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = ctx.fillStyle = `rgb(${BL})`;
  // la barre des chapitres : le nom de chaque chapitre, une ligne par chapitre qui se remplit, une encoche par scène
  const B = L.barre, C0 = M.sc, ap = reduit ? 1 : c01(th / 1.2);
  if (C0) { let k0 = 0; ctx.textBaseline = 'alphabetic';
    B.seg.forEach((g, c) => { const on = C0.S.ch === c, fait = C0.S.ch > c, i = C0.i - k0, F = DUREE.A + DUREE.B + DUREE.C, v = on ? c01((i + c01(tps() / (F + C0.tenue))) / g.n) : fait ? 1 : 0, yL = B.bas - 4;
      ctx.font = `500 ${L.L ? 12 : 10.5}px ${MONO}`; espace(ctx, '0.16em'); ctx.globalAlpha = (on ? 0.95 : 0.45) * ap; ctx.fillStyle = `rgb(${BL})`; ctx.fillText(g.nom, g.x, B.y); espace(ctx, '0px');
      ctx.strokeStyle = `rgb(${BL})`; ctx.lineWidth = 1; ctx.globalAlpha = 0.25 * ap; ctx.beginPath(); ctx.moveTo(g.x, yL); ctx.lineTo(g.x + g.w * ap, yL); ctx.stroke();
      if (v > 0) { ctx.globalAlpha = 0.95; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, yL); ctx.lineTo(g.x + g.w * v, yL); ctx.stroke(); if (on && !reduit) O.brille(ctx, g.x + g.w * v, yL, 3, 0.9, false, now, c); }
      for (let j = 1; j < g.n; j++) { const x = g.x + g.w * j / g.n; ctx.globalAlpha = 0.4 * ap; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, yL - 3); ctx.lineTo(x, yL + 3); ctx.stroke(); }
      k0 += g.n; }); }
  ctx.globalAlpha = 1;
  // les étoiles qui repartent dans le ciel (celles de la scène d'avant)
  M.part.forEach((p, j) => { const u = c01((Wd.t - p.t0) / 1.2), e = sm(u), x = p.x + (p.ox - p.x) * e, y = p.y + (p.oy - p.y) * e; etoile(ctx, x, y, p.R * (1 - u) + 0.8 * u, 0.9, false, now, p.ph); });
  const C = M.sc;
  if (C) {
    const tl = tps(), { A, B } = DUREE, Cd = DUREE.C, Q = C.Q = C.cs ? clesDe(C) : projette(C, tl), f = C.f, u = sm(c01((tl - A - B) / Cd)), ne = f.e.length;
    // une scène dessinée (js/espace-scenes.js) : elle se dévoile en cercle depuis le centre, dès que les étoiles se sont posées
    // (celle d'avant se referme de même, pendant que ses étoiles repartent)
    // (29/09, Mathieu : « les terminaux apparaissent coupés : il faudrait qu'ils apparaissent et disparaissent en fondu au bord de l'animation,
    // et que ça continue jusqu'en haut de l'écran ») : la scène se dessine à part, puis ses bords s'estompent (en haut jusqu'au bord de l'écran,
    // en bas juste au-dessus des sous-titres, et sur les côtés)
    const joue = (D, a, r) => { if (r <= 0.01) return; const G = L.G, c2 = horsChamp(ctx.canvas), o = c2.getContext('2d');
      o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, c2.width, c2.height); o.setTransform(ctx.getTransform()); o.save();
      o.beginPath(); o.arc(G.cx, G.cy, r * Math.hypot(L.W, L.H) * 0.7, 0, TAU); o.clip(); EspaceScenes.pose(o, G, O); D.cs.dessin(reduit ? 3 : a, now); o.restore();
      o.globalAlpha = 1; o.globalCompositeOperation = 'destination-in';
      const gv = o.createLinearGradient(0, 0, 0, L.H), y1 = c01(G.haut * 0.75 / L.H), y2 = c01((G.bas - 30) / L.H), y3 = c01((G.bas + 4) / L.H);
      gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(y1, '#000'); gv.addColorStop(Math.max(y1, y2), '#000'); gv.addColorStop(Math.max(y1, y3), 'rgba(0,0,0,0)'); gv.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = gv; o.fillRect(0, 0, L.W, L.H);
      const bh = Math.min(90, L.W * 0.1), gh = o.createLinearGradient(0, 0, L.W, 0); gh.addColorStop(0, 'rgba(0,0,0,0)'); gh.addColorStop(bh / L.W, '#000'); gh.addColorStop(1 - bh / L.W, '#000'); gh.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = gh; o.fillRect(0, 0, L.W, L.H);
      o.globalCompositeOperation = 'source-over'; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(c2, 0, 0); ctx.restore(); ctx.globalAlpha = 1; };
    const V0 = M.vieux; if (V0 && V0.sc && V0.sc.cs && Wd.t - V0.t0 < 0.6) joue(V0.sc, V0.tl - A + (Wd.t - V0.t0), 1 - sm((Wd.t - V0.t0) / 0.6));
    if (C.cs) joue(C, tl - A + 0.2, sm((tl - A + 0.25) / 0.9));
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
  // les sous-titres : centrés sous le dessin, sans encart ; l'étiquette du chapitre, le titre et son icône, la phrase, les outils
  // (l'ancienne s'efface d'abord, de droite à gauche ; la nouvelle s'écrit ensuite, ligne après ligne)
  const cap = C && C.cap, V = M.vieux, tl = tps(), vu = V ? c01((Wd.t - V.t0) / 0.35) : 1;
  const txt = (D, q) => { const ox = L.W / 2, oy = L.yCap - D.h; D.L.forEach(l => { const r = c01(q(l)); if (r <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(ox + l.x - 4, oy + l.y - 60, (l.w + 8) * r, 90); ctx.clip();
    ctx.globalAlpha = l.a; ctx.font = l.font; espace(ctx, l.esp || '0px'); ctx.fillStyle = `rgb(${BL})`; ctx.fillText(l.txt, ox + l.x, oy + l.y); ctx.restore(); }); };
  if (cap) { M.bande = { x: L.W / 2 - cap.w / 2 - 12, y: L.yCap - cap.h - 12, w: cap.w + 24, h: cap.h + 24 };
    // le voile : la scène continue dessous, les mots restent lisibles
    { const b = M.bande, cxv = b.x + b.w / 2, cyv = b.y + b.h / 2, rx = b.w * 0.7, ry = b.h * 1.05; ctx.save(); ctx.translate(cxv, cyv); ctx.scale(1, ry / rx);
      const gv = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); gv.addColorStop(0, 'rgba(9,11,16,0.94)'); gv.addColorStop(0.72, 'rgba(9,11,16,0.86)'); gv.addColorStop(1, 'rgba(9,11,16,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = gv; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore(); ctx.fillStyle = ctx.strokeStyle = `rgb(${BL})`; }
    if (V && vu < 1) txt(V.cap, l => 1 - vu);
    else { txt(cap, l => reduit ? 1 : (tl - 0.5 - l.dl) * 900 / (l.w + 120));
      const ui = reduit ? 1 : c01((tl - 0.65) / 0.9); if (ui > 0) icone(ctx, cap.k, L.W / 2 + cap.ic.x, L.yCap - cap.h + cap.ic.y, cap.ic.s, ui, now, 0); } }
  ctx.restore();
});

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
  } else if (k === 'secu') {
    rr(-s * 0.72, -s * 0.1, s * 1.44, s * 1.05, s * 0.14); ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.45, Math.PI, 0); ctx.stroke();
    ctx.setLineDash([]); if (u >= 1) { ctx.beginPath(); ctx.arc(0, s * 0.33, s * 0.11, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, s * 0.4); ctx.lineTo(0, s * 0.6); ctx.stroke(); }
  } else if (k === 'devops') {
    ctx.beginPath(); for (let i = 0; i <= 60; i++) { const t = i / 60 * TAU, d = 1 + Math.sin(t) * Math.sin(t); ctx.lineTo(s * Math.cos(t) / d, s * 0.9 * Math.sin(t) * Math.cos(t) / d); } ctx.stroke();
    ctx.setLineDash([]); if (u >= 1 && !reduit) { const t = now * 1.6, d = 1 + Math.sin(t) * Math.sin(t); O.brille(ctx, s * Math.cos(t) / d, s * 0.9 * Math.sin(t) * Math.cos(t) / d, 2.4, 0.9, false, now, 5); }
  }
  ctx.restore();
}

/* ——— le dessin : la craie des cadres, le stylo des mots ; la pointe, au bout ——— */

/* ——— les chats : au cinéma. Ils viennent s'asseoir sur la Terre, le nez vers le ciel, et regardent la séance ——— */
function siege(c) {
  const W = O.W, r = rayon(c), autres = Wd.cats.filter(o => o !== c && o.sp && (o.sp.m === 'cine' || (o.sp.cible && o.sp.cible.siege != null))).map(o => [o.sp.m === 'cine' ? o.sp.sx : o.sp.cible.siege, rayon(o)]);
  // (sur grand écran, les sous-titres descendent jusqu'à la Terre : les spectateurs s'assoient de part et d'autre)
  for (let n = 0; n < 14; n++) { const x = W >= 760 ? (Math.random() < 0.5 ? rnd(0.04, 0.27) : rnd(0.73, 0.96)) * W : rnd(0.05, 0.95) * W; if (autres.every(([a, ro]) => Math.abs(a - x) > (r + ro) * 0.95)) return x; }
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
/* (vague 7, l'audit : les chats en apesanteur manquaient d'un moment à eux) : le petit train. Pendant la séance, un chat qui flotte part
   au ras de la Terre en nageant, « tchou tchou ! » ; ceux qui flottent près de lui et les spectateurs devant qui il passe s'accrochent
   à la queue du précédent ; le train ondule d'un bord à l'autre, puis se défait (chacun repart flotter, ou se rassoit). */
let TR = null;
const train = c => {
  if (TR || !M || !M.sc || c.rare || rayon(c) > Wd.s0 * 0.3 || Math.random() > 0.12 || Wd.t < (X.trainT || 0)) return false;
  const [x] = centreDe(c), dir = x < O.W / 2 ? 1 : -1; TR = { dir, x, L: [c], H: [], t0: Wd.t, dit: Wd.t + 2 }; X.trainT = Wd.t + 40;
  c.sp.m = 'train'; say(c, en() ? 'choo choo!' : 'tchou tchou !'); if (window.Dex && Dex.vu) Dex.vu('train'); return true; };
X.envie.unshift(train);
X.mode.train = (c, dt) => {
  const S = c.sp; if (!TR || !TR.L.includes(c)) { S.m = 'derive'; S.next = Wd.t + rnd(2, 4); return; }
  const i = TR.L.indexOf(c), r = rayon(c), pas = Math.round(r * 1.9 / 4), q = i ? TR.H[Math.max(0, TR.H.length - 1 - i * pas)] : [TR.x, surface(TR.x) - r * 0.5 - Math.abs(Math.sin((TR.x / O.W) * 12)) * r * 0.3];
  if (!q) return; const [cx, cy] = centreDe(c), k = Math.min(1, dt * (i ? 7 : 4)); c.x += (q[0] - cx) * k; c.y += (q[1] - cy) * k;
  c.face = TR.dir; c.anim = 'nage'; c.spin += (Math.sin(Wd.t * 5 + i) * 0.15 - c.spin) * Math.min(1, dt * 4); S.vx = S.vy = 0;
};
X.pas.push(dt => {
  if (!TR) return; const T = TR, lead = T.L[0];
  if (!M || !lead || lead.gone || !lead.sp || lead.sp.m !== 'train' || lead.held) { fin(); return; }
  const r = rayon(lead); T.x += T.dir * Wd.s0 * 0.9 * dt; const [lx, ly] = centreDe(lead), last = T.H[T.H.length - 1];
  if (!last || Math.hypot(lx - last[0], ly - last[1]) > 4) { T.H.push([lx, ly]); if (T.H.length > 400) T.H.splice(0, 100); }
  // qui monte : un chat libre ou un spectateur tout près de la queue du train
  const queue = T.L[T.L.length - 1], [qx, qy] = centreDe(queue);
  if (T.L.length < 7) Wd.cats.forEach(o => { if (!o.sp || o.gone || o.held || o.rare || T.L.includes(o) || !['derive', 'cine', 'nage'].includes(o.sp.m) || Math.random() > dt * 3) return;
    const [ox, oy] = centreDe(o); if (rayon(o) > Wd.s0 * 0.3 || Math.hypot(ox - qx, oy - qy) > r * 9 || (ox - qx) * T.dir > r * 3) return;
    o.sp.m = 'train'; o.sp.cible = null; T.L.push(o); if (Math.random() < 0.6) say(o, pick(en() ? ['wait for me!', 'me too!', 'all aboard'] : ['attendez-moi !', 'moi aussi !', 'en voiture !', 'je monte !'])); });
  if (Wd.t > T.dit) { T.dit = Wd.t + rnd(2.5, 4); say(pick(T.L), pick(en() ? ['choo choo', 'toot toot'] : ['tchou tchou', 'tut tuut', 'tchou !'])); }
  if ((T.dir > 0 ? T.x > O.W * 0.93 : T.x < O.W * 0.07) || Wd.t - T.t0 > 30) fin();
});
function fin() { if (!TR) return; const T = TR; TR = null;
  T.L.forEach((c, i) => { if (!c.sp || c.sp.m !== 'train') return; c.sp.m = 'derive'; c.sp.vx = -T.dir * rnd(10, 60); c.sp.vy = -rnd(30, 90); c.sp.w = rnd(-2, 2); c.sp.next = Wd.t + rnd(2, 5); c.sp.anim = 'apesanteur'; });
  if (T.L[0] && T.L.length > 1) say(T.L[0], en() ? 'end of the line!' : 'terminus !'); }
// à la fin de chaque dessin : un ou deux spectateurs réagissent
function reagit(C) {
  const V = Wd.cats.filter(c => c.sp && c.sp.m === 'cine'); if (!V.length) return;
  const n = Math.min(V.length, Math.random() < 0.4 ? 2 : 1);
  for (let k = 0; k < n; k++) { const c = V.splice(Math.floor(Math.random() * V.length), 1)[0], S = c.sp;
    if (S.anim === 'dodo') { if (Math.random() < 0.5) say(c, 'zzz'); continue; }
    S.rea = Wd.t + 1.4; S.animR = ANIMS.debout ? 'debout' : S.anim;
    later(k * 0.5, () => say(c, pick(en() ? ['ooh…', 'wow', '✦', 'again!', C.S.ic === 'ia' ? 'AI!' : 'nice'] : ['ooh…', 'waouh', '✦', 'encore !', 'joli', C.S.ic === 'ia' ? 'IA !' : 'bravo']))); }
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

/* ——— avancer plus vite (29/09, Mathieu : « pour cette partie, on devrait pouvoir avancer plus vite, avec le scroll ou des boutons ») ———
   la molette, les flèches du clavier, le geste (js/film.js les envoie ici quand on est dans l'espace), deux chevrons de part et d'autre de l'écran du ciel,
   et la barre des chapitres (un clic sur une encoche : cette scène). Une scène choisie à la main se forme plus vite. */
function pas(dir, j) {
  if (!M || !M.sc || !Wd.espace) return false;
  const t = performance.now(); if (t - (M.pasT ?? -1e9) < 280) return true; M.pasT = t;
  aller(j != null ? j : M.sc.i + dir); M.sc.t0 -= reduit ? 0 : 1.1; return true;
}
const chevrons = () => { const L = M.lay, k = L.L ? 13 : 10, x = L.L ? 34 : 16; return [[-1, x, L.G.cy, k], [1, L.W - x, L.G.cy, k]]; };
const NAV = { drag() {}, release(k) { pas(k.d, k.j); } };
X.grab.push((x, y) => {
  if (!M || !M.sc) return null; const L = M.lay, B = L.barre;
  for (const [d, cx, cy, k] of chevrons()) if (Math.abs(x - cx) < k * 2.4 && Math.abs(y - cy) < k * 3) return { mod: NAV, d };
  if (y > B.y - 16 && y < B.bas + 10) { let k0 = 0; for (const g of B.seg) { if (x >= g.x - 4 && x <= g.x + g.w + 4) return { mod: NAV, d: 0, j: k0 + clamp(Math.floor((x - g.x) / g.w * g.n), 0, g.n - 1) }; k0 += g.n; } }
  return null;
});
X.devant.push((ctx, now) => {
  if (!M || !M.sc) return; const P = Wd.ptr, ap = reduit ? 1 : c01((Wd.t - M.t0) / 1.2);
  ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = `rgb(${BL})`;
  chevrons().forEach(([d, x, y, k]) => { const sur = P && P.on && Math.abs(P.x - x) < k * 2.4 && Math.abs(P.y - y) < k * 3, bat = sur ? Math.sin(now * 8) * 2 : 0;
    ctx.globalAlpha = (sur ? 1 : 0.55) * ap; ctx.lineWidth = sur ? 2.8 : 2.2; ctx.beginPath(); ctx.moveTo(x - d * k * 0.45 + d * bat, y - k); ctx.lineTo(x + d * k * 0.45 + d * bat, y); ctx.lineTo(x - d * k * 0.45 + d * bat, y + k); ctx.stroke(); });
  ctx.restore(); ctx.globalAlpha = 1;
});

return { get M() { return M; }, DUREE, pas, pointe: () => null, get planete() { return M && M.lay.planete; }, set onFini(f) { onFini = f; }, get fini() { return !!(M && M.fin); }, aller };
})();
