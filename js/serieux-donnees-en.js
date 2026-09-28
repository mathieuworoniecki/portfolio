/* Version anglaise de js/serieux-donnees.js : elle doit suivre exactement sa structure (clés, ordre, longueurs, valeurs non textuelles). */
/* Le mode sérieux : le contenu du CV.
   Seules sources : le CV (CV_FR_WORONIECKI), l'export LinkedIn (Profile.pdf) et les dépôts GitHub de Mathieu (lus un par un, septembre 2026).
   Rien d'autre : pas de chiffre, de date ni de client qui n'y figure pas. En cas de doute entre le CV et LinkedIn, le CV gagne.
   Les dépôts privés apparaissent sans lien ; aucun client, dossier ou donnée personnelle qu'ils contiennent n'est cité.
   La forme de chaque bloc suit ce que js/serieux.js et js/serieux-3d.js en font (écrans épinglés : une entrée = une étape = un geste 3D). */
window.SERIEUX_DONNEES_EN = {
  nom: 'Mathieu Woroniecki',
  langues: ['French (native)', 'English (fluent, technical)', 'Spanish (basic)'],

  /* 00 — l'accueil */
  accueil: {
    sur: 'Paris · CV · 2026',
    titre: 'Senior Technical Lead & AI Architect',
    these: 'More than ten years building for the web, from front-end integration to CTO. Today I design products where AI reads, reasons and acts, and I work alongside agents I orchestrate to ship at the pace of a full team.',
    maintenant: 'Currently CTO of MARKO, an AI-native B2B SaaS for real estate.',
    faits: ['<b>1 developer</b> + his agents = a team of 10', '<b>10+ years</b> of experience', '<b>150,000+</b> users on a platform I led', '<b>85+</b> projects delivered as a freelancer']
  },

  /* 01 — l'IA dans le produit : la chaîne construite chez MARKO, une étape par station 3D (scanner, extraction, RAG, agents, rapports) */
  ia: {
    titre: 'AI that does real work, not a demo',
    chapo: 'At MARKO, I designed the entire pipeline: a financing document goes in; out come verified data, sourced answers, executed actions and reports. Every link is measured and traced, and its cost is tracked.',
    chaine: [
      { court: 'Document AI', t: 'Reading what nobody wants to key in', d: 'Loan agreements, reports, scanned documents: a multi-stage OCR pipeline with a fallback engine turns paper into usable text.', tags: ['Multi-engine OCR', 'Document AI', 'Automatic fallback'] },
      { court: 'Extraction', t: 'Business fields, not raw text', d: 'Each deal’s fields are extracted into a strict schema; a second pass then checks, compares and flags what is missing before a human has to find it.', tags: ['Typed outputs', 'Double verification', 'Gap analysis'] },
      { court: 'LLM / RAG', t: 'Answers that cite their sources', d: 'Every document is chunked and embedded in the client’s own database. Answers rest on the retrieved passages, never on the model’s memory.', tags: ['RAG', 'pgvector', 'Per-client isolation'] },
      { court: 'Agents', t: 'Agents that act, within bounds', d: 'Agents chain tasks through an MCP server: they read and act in the product through narrowly scoped tools, with no access to anything they don’t need to see.', tags: ['Agentic AI', 'MCP', 'Scoped tools'] },
      { court: 'Automation', t: 'Monitoring runs on its own', d: 'Covenants (LTV, DSCR, ICR) are monitored, alerts go out, and investor reporting is generated in the background; every AI call has its cost tracked.', tags: ['Workflows', 'Alerts', 'AI FinOps'] }
    ],
    suite: 'And it’s not a one-off: the same standard runs through the teams I’ve led and the projects I build on the side.',
    preuves: [
      { chiffre: '1 = 10', t: 'one developer, one team', d: 'On my own with my agents, I ship platforms that would have taken a team of ten developers years to build. MARKO is the proof: product, AI, infrastructure and security.' },
      { chiffre: 'MCP', t: 'agents, securely plugged in', d: 'From the Figma-to-code workflow at LWA to MARKO’s MCP servers and SafeShare (WebMCP): the agent acts without ever seeing what it shouldn’t.' },
      { chiffre: 'RAG', t: 'measured, not assumed', d: 'On Archon: hybrid lexical and vector search, reranking, and an evaluation set to judge answer quality instead of hoping for it.' }
    ],
    outils: ['LLM', 'Hybrid RAG', 'Agents & sub-agents', 'MCP / WebMCP', 'Skills & plugins', 'Document AI', 'Evaluation', 'Embeddings', 'pgvector', 'Qdrant', 'Claude Code', 'Codex', 'Local models']
  },

  /* 02 — la méthode : comment un seul développeur tient la cadence d'une équipe ; une étape = un geste de la salle de contrôle 3D
     (terminaux en éventail, agents et sous-agents, skills qui s'emboîtent, banc d'essai, essaim d'agents, portique de contrôle) */
  methode: {
    titre: 'One developer, the strength of a team',
    chapo: 'Where it used to take a team of ten developers and several years, I ship alone, surrounded by agents I orchestrate. AI doesn’t replace the craft: it multiplies the reach of whoever knows how to direct it. Here is how I work.',
    etapes: [
      { court: 'Parallel', t: 'Dozens of terminals at once', d: 'I no longer code one thing at a time: dozens of workstreams run simultaneously, each in its own terminal and isolated Git worktree, with its own agent. While one writes, others test, review and document.', tags: ['Git worktrees', 'Multiple terminals', 'Parallel agents'] },
      { court: 'Orchestration', t: 'One person, a whole team', d: 'A lead agent breaks the goal down and launches specialized sub-agents: exploration, code, tests, review. They all work at once and report back; I put it together and make the call.', tags: ['Sub-agents', 'Multi-agent workflows', 'Decision-making'] },
      { court: 'Tooling', t: 'Custom skills and plugins', d: 'As soon as a task recurs, it becomes a tool: skills, commands, dedicated agents, MCP servers. On MARKO, a full security audit runs with a single command.', tags: ['Skills', 'Plugins', 'MCP servers', 'Commands'] },
      { court: 'Test bench', t: 'Test everything, measure everything', d: 'Harnesses, orchestrators, plugins, extensions: I test what comes out, compare on real projects and keep only what saves time. Some experiments became published tools.', tags: ['Continuous benchmarking', 'Harness', 'endless', 'codex-crew'] },
      { court: 'Today', t: 'A fleet of agents on a single product', d: 'On MARKO, large workstreams go through Claude Code’s multi-agent workflows (ultracode), which spread the work across many agents; a second, faster tool handles quick decisions. The tooling changes every month; the method stays.', tags: ['Claude Code ultracode', 'Quick decisions', 'Orchestration'] },
      { court: 'Guardrails', t: 'Speed without losing control', d: 'Tests at every step, automated review in CI, security scanners, and a human decision before every merge. The agents propose; I approve and sign off.', tags: ['Tests', 'CI review', 'Scanners', 'Human in the loop'] }
    ]
  },

  /* 02 bis — la preuve : l'historique Git de MARKO (dépôt privé : des chiffres, jamais de code), relevé le 28 septembre 2026.
     jours = commits par jour depuis le premier commit (27 janvier 2026, un mardi : d0 = 1, lundi = 0) ; heures = commits par heure de la journée */
  preuve: {
    titre: 'MARKO, the proof in numbers',
    chapo: 'Not an estimate: MARKO’s Git history, as of September 28, 2026. The code isn’t shown, only what it took to build it.',
    etapes: [
      { n: 12046, u: 'commits in eight months', d: 'From the first commit on January 27, 2026, to today. Each column is a day; its height, the number of commits that day.', src: 'Git · MARKO · 202 active days out of 245' },
      { n: 451, u: 'commits in a single day', d: 'July 23, 2026: AI extraction, CI, database, UI and privacy all moving forward at once, each workstream in its own worktree with its own agent. July alone: 5,519 commits.', src: 'Git · MARKO · July 23, 2026' },
      { n: 24, suf: ' h / 24', u: 'the work never stops', d: 'Commits at every hour of the day and night: the agents chain tasks, while validation stays human. In gold, the hours between midnight and 6 a.m.', src: 'Git · MARKO · commits by hour' },
      { n: 2.1, dec: 1, suf: 'M', u: 'lines of code', d: 'About 1.2 million lines of product code (Python API, React UI) and 0.9 million lines of tests. Over 2,500 test files, 117 screens, 110 API modules, 447 database migrations.', src: 'MARKO repository · September 2026' },
      { n: 95, suf: '%', u: 'of commits: me and my agents', d: 'Of 12,046 commits, 95% come from me and my agents; the remaining 5% from a second developer. A ten-person team’s output, carried by one person.', src: 'Git · MARKO · authors' }
    ]
  },
  marko: {"d0": 1, "jours": [10, 3, 2, 2, 9, 9, 16, 8, 0, 1, 0, 0, 15, 19, 8, 2, 8, 10, 57, 18, 30, 28, 46, 2, 32, 1, 0, 0, 0, 0, 0, 0, 0, 0, 11, 46, 73, 13, 28, 44, 0, 18, 36, 4, 38, 0, 52, 156, 140, 75, 41, 24, 22, 52, 78, 90, 12, 22, 2, 0, 0, 0, 0, 0, 3, 0, 9, 2, 0, 0, 59, 32, 28, 45, 40, 80, 16, 26, 32, 57, 64, 0, 0, 58, 35, 17, 226, 129, 12, 12, 53, 129, 95, 118, 47, 0, 0, 18, 35, 37, 2, 3, 16, 0, 7, 5, 17, 46, 24, 16, 54, 94, 17, 24, 22, 8, 7, 9, 28, 18, 23, 59, 35, 0, 0, 10, 16, 0, 3, 0, 12, 3, 1, 17, 3, 19, 4, 0, 0, 18, 25, 19, 7, 12, 4, 16, 84, 35, 59, 25, 67, 19, 0, 40, 40, 55, 187, 211, 30, 0, 156, 100, 43, 195, 290, 315, 302, 345, 220, 359, 367, 299, 122, 157, 278, 318, 362, 451, 49, 74, 26, 10, 80, 59, 19, 40, 125, 45, 194, 141, 81, 118, 245, 68, 2, 35, 13, 9, 19, 36, 23, 3, 83, 16, 16, 34, 0, 35, 0, 0, 5, 40, 0, 0, 0, 0, 5, 13, 14, 11, 38, 25, 2, 2, 12, 36, 123, 72, 0, 0, 62, 42, 60, 44, 10, 8, 11, 50, 11, 142, 178, 62, 61, 16, 12], "heures": [437, 326, 289, 212, 168, 158, 240, 330, 621, 650, 628, 741, 711, 715, 655, 743, 629, 484, 361, 461, 609, 664, 645, 569], "juillet": [155, 185], "mois": [{"j": 5, "t": "Feb"}, {"j": 33, "t": "Mar"}, {"j": 64, "t": "Apr"}, {"j": 94, "t": "May"}, {"j": 125, "t": "Jun"}, {"j": 155, "t": "Jul"}, {"j": 186, "t": "Aug"}, {"j": 217, "t": "Sep"}]},

  /* 02 — les chiffres, dans l'ordre des formes du nuage 3D :
     cernes d'arbre (ans), sphère (personnes), anneau (disponibilité), barre qui se tasse, colonne qui monte, 25 foyers, 85 cubes */
  impact: {
    titre: 'The results, by the numbers',
    chiffres: [
      { n: 10, suf: '+', u: 'years of experience', d: 'One tree ring per year, from technical support at Schneider Electric to CTO.', src: 'CV' },
      { n: 150000, suf: '+', u: 'employees', d: 'on Digiplace, ENGIE’s strategic intranet, where I was tech lead.', src: 'ENGIE · 2022 — 2024' },
      { n: 99.99, dec: 2, suf: '%', u: 'uptime', d: 'Run and maintenance of Digiplace. Only one dot blinks: the remaining 0.01%.', src: 'ENGIE' },
      { n: 40, pre: '−', suf: '%', u: 'load time', d: 'with the move to React and headless WordPress.', src: 'ENGIE' },
      { n: 35, pre: '+', suf: '%', u: 'productivity for an entire team', d: 'from the early days of generative AI at LWA. Since then, working alone with my agents, I do the work of a whole team.', src: 'LWA · 2024 — 2026' },
      { n: 25, u: 'countries', d: 'Global acquisition platforms, 5M+ visitors a month, run from a single codebase.', src: 'Sodexo · 2020 — 2021' },
      { n: 85, suf: '+', u: 'projects delivered', d: 'as a freelancer, rated 4.88/5 across 85 reviews.', src: 'Malt · 2018 — 2022' }
    ]
  },

  /* 03 — le parcours, du plus récent au plus ancien (la page le lit à l'envers : chronologique)
     c = le composant 3D du poste sur la piste de circuit ; an0 = l'année affichée sous le composant */
  parcoursChapo: 'From technical support to CTO. Each role added a layer; the signal follows the trace, one component per role.',
  parcours: [
    { an: 2026.1, an0: '2026', c: 'puce', dates: '02/2026 — present', lieu: 'MARKO', poste: 'CTO', ia: true,
      d: 'Founded MARKO, an AI-native B2B SaaS for real estate investment professionals: consolidating portfolio data, automating monitoring, producing investor reporting.',
      l: ['Architecture and development of the entire AI system', 'Generative AI, LLM / RAG, Agentic AI, Document AI', 'One PostgreSQL database per client, observability and security in CI'] },
    { an: 2024.1, an0: '2024', c: 'conteneurs', dates: '02/2024 — 02/2026', lieu: 'LWA', poste: 'Lead Developer, Vue.js / Nuxt.js Architecture', ia: true,
      d: 'Technical strategy for luxury brands (Hermès, Chanel, Ardian); team of 3 developers.',
      l: ['Adopted generative AI (LLM, RAG): +35% productivity', 'MCP for the Figma-to-code workflow', '15+ projects moved to Docker: +40% deployment frequency', 'GitLab CI/CD and agile: +25% velocity'] },
    { an: 2022.2, an0: '2022', c: 'tour', dates: '03/2022 — 03/2024', lieu: 'ENGIE', poste: 'Tech Lead, Web Platforms',
      d: 'Technical lead for the Digiplace strategic intranet and the public website: 150,000+ employees, CAC 40 environment.',
      l: ['99.99% uptime', 'React / headless WordPress: −40% load time', 'OWASP: 100% of critical vulnerabilities fixed', 'RGAA level AA accessibility compliance'] },
    { an: 2020.6, an0: '2020', c: 'monde', dates: '08/2020 — 07/2021', lieu: 'Sodexo', poste: 'International Tech Lead, Acquisition Platforms',
      d: 'Global acquisition platforms (WordPress / PHP on Azure): 25 countries, 5M+ visitors a month, Fortune 500 environment.',
      l: ['Legacy code overhaul: −30% technical debt', 'Core Web Vitals: +45% on average', 'Azure CI/CD: 99.9% uptime', 'Incidents across 25 countries: resolution time cut by 4 h'] },
    { an: 2018.85, an0: '2018', c: 'entonnoir', dates: '11/2018 — 05/2020', lieu: 'AXA', poste: 'Front-End Developer, UI/UX & Conversion',
      d: 'At the crossroads of design, engineering and results: React, Webpack, Symfony.',
      l: ['+25% conversion on landing pages', '−800 ms average load time', 'Internal tools used by 10 departments'] },
    { an: 2018.2, an0: '2018', c: 'missions', dates: '03/2018 — 03/2022', lieu: 'Malt', poste: 'Senior Consultant, Fractional CTO',
      d: 'Freelance, alongside other roles: architecture, full-stack development and strategic consulting.',
      l: ['85+ projects delivered, 4.88/5 across 85 reviews', '40+ API integrations (Salesforce, Zoho, ActiveCampaign)', 'Fractional CTO for 15+ startups and SMBs'] },
    { an: 2016.0, an0: '2016', c: 'equipe', dates: '01/2016 — 02/2018', lieu: '1min30', poste: 'Lead Developer & Technical Manager',
      d: 'Inbound marketing agency: WordPress developer, then head of the technical division.',
      l: ['Team of 5 engineers, 50+ web projects a year', 'Industrialized production: −30% development time', 'Technical pre-sales: $250K in new contracts'] },
    { an: 2014.7, an0: '2014', c: 'sites', dates: '09/2014 — 12/2015', lieu: 'Indexel', poste: 'Web Developer, Front-End Integrator',
      d: 'Built 100+ brochure and e-commerce websites (HTML5, CSS3, JavaScript), WordPress and Drupal.', l: [] },
    { an: 2012.8, an0: '2012', c: 'gtb', dates: '10/2012 — 08/2014', lieu: 'Schneider Electric', poste: 'IT & Technical Support',
      d: 'An equipment failure analysis system across multiple sites: from the equipment to the database, from diagnosis to resolution.', l: [] }
  ],
  formation: [
    { dates: '2014 — 2016', t: 'Master’s degree (RNCP Level 2) — Multimedia Project Management', o: 'Institut F2I' },
    { dates: '2012 — 2014', t: 'BTS SIO (Associate degree in IT), Software Development track (SLAM)', o: 'ITIC Paris' },
    { dates: '2009 — 2012', t: 'Vocational Baccalaureate SEN, Computer Science', o: 'Christophe Colomb' }
  ],

  /* 04 — les compétences : les six couches de la puce, dans l'ordre des étapes (ia, front, back, devops, secu, lead).
     Tirées du CV et de l'analyse de tous les dépôts ; seul ce qui est réellement dans le code est cité. */
  competencesChapo: 'Six layers, like a chip: AI at the core, what you see on top, what holds everything together underneath. Drawn from my CV and a read-through of all my repositories.',
  competences: [
    { id: 'ia', couche: 'ia', court: 'AI', nomCouche: 'core', t: 'AI & Data',
      d: 'The core: systems that read, search, reason and act, in production and in research.',
      groupes: [
        ['LLM integrations', ['Gemini', 'Mistral', 'Claude', 'OpenAI / Codex', 'DeepSeek', 'Local models (Ollama)']],
        ['RAG & search', ['Hybrid vector + lexical RAG', 'Reranking', 'Embeddings', 'pgvector', 'Qdrant', 'ChromaDB', 'Meilisearch', 'RAG evaluation']],
        ['Agents', ['Agentic AI', 'MCP / WebMCP', 'Multi-agent orchestration', 'Sub-agents', 'Skills & plugins', 'Prompt engineering']],
        ['Documents', ['Document AI', 'OCR (Mistral, Tesseract)', 'Data extraction', 'Entities (spaCy, LangExtract)']],
        ['Machine learning', ['scikit-learn', 'LightGBM', 'Optuna', 'MLflow', 'SHAP / LIME', 'Genetic algorithms', 'Monte Carlo']]
      ] },
    { id: 'front', couche: 'front', court: 'Front-end', nomCouche: 'lid', t: 'Front-End & Interfaces',
      d: 'What you see and touch: fast, animated, accessible interfaces.',
      groupes: [
        ['Frameworks', ['React', 'Next.js', 'Vue', 'Nuxt', 'TypeScript', 'JavaScript ES6+']],
        ['UI', ['TailwindCSS', 'Radix / shadcn', 'TanStack Query', 'Zustand', 'Redux', 'Pinia', 'Vuetify']],
        ['Animation & 3D', ['three.js', 'Canvas', 'Web Audio', 'GSAP', 'D3', 'Phaser']],
        ['Tooling', ['Vite', 'Webpack', 'Sass', 'i18n (50+ languages, RTL)', 'Web performance', 'Chrome extensions']]
      ] },
    { id: 'back', couche: 'back', court: 'Back-end', nomCouche: 'substrate', t: 'Back-End & Data',
      d: 'What holds everything together: APIs, task queues, per-client isolated databases.',
      groupes: [
        ['Languages', ['Python', 'TypeScript / Node.js', 'PHP', 'Go', 'Bun']],
        ['Frameworks', ['FastAPI', 'Async SQLAlchemy', 'Pydantic', 'Express', 'Prisma', 'Symfony', 'Headless WordPress']],
        ['Jobs & real time', ['Celery', 'Dramatiq', 'Redis', 'Socket.IO', 'Colyseus']],
        ['Data', ['PostgreSQL', 'MySQL', 'Supabase', 'InfluxDB', 'MinIO / S3', 'SQLite']]
      ] },
    { id: 'devops', couche: 'devops', court: 'DevOps', nomCouche: 'board', t: 'DevOps & Cloud',
      d: 'The board everything is soldered onto: containers, deployments, observability.',
      groupes: [
        ['Containers', ['Docker', 'Docker Compose', 'Podman', 'Traefik', 'Nginx', 'Caddy']],
        ['CI/CD', ['GitHub Actions', 'GitLab CI', 'Dagger', 'Canary deployments', 'Renovate']],
        ['Cloud', ['Azure', 'AWS', 'Vercel', 'GitHub Pages']],
        ['Observability', ['Prometheus', 'Grafana', 'Loki', 'OpenTelemetry', 'Sentry']]
      ] },
    { id: 'secu', couche: 'secu', court: 'Security', nomCouche: 'guard ring', t: 'Security & Quality',
      d: 'The guard ring: we test, we scan, we protect the data.',
      groupes: [
        ['Security', ['OWASP', 'CodeQL', 'Semgrep', 'Trivy', 'Gitleaks', 'CycloneDX SBOM', 'EdDSA JWT', 'Rate limiting']],
        ['Personal data', ['Privacy by design', 'Redaction', 'Per-client isolation', 'IP address hashing']],
        ['Testing', ['pytest', 'Vitest', 'Jest', 'Playwright', 'Cypress']],
        ['Accessibility', ['RGAA AA', 'WCAG']]
      ] },
    { id: 'lead', couche: 'lead', court: 'Leadership', nomCouche: 'traces', t: 'Leadership & Method',
      d: 'The traces that connect everything: teams, a method, a roadmap.',
      groupes: [
        ['Team', ['Tech lead', 'Management (up to 5 engineers)', 'Mentoring', 'Fractional CTO']],
        ['Augmented development', ['Multi-terminal, multi-agent', 'One Git worktree per agent', 'In-house skills and plugins', 'Continuous harness benchmarking']],
        ['Method', ['Agile', 'Gitflow', 'Architecture decision records (ADR)', 'Industrialization', 'Refactoring']],
        ['Strategy', ['Technical roadmap', 'Pre-sales', 'Consulting']]
      ] }
  ],

  /* 05 — les catégories des projets : une étiquette courte, une icône (js/serieux.js) ; la légende en tête des projets les filtre */
  categories: [
    { id: 'ia', t: 'AI & agents', i: 'cerveau' },
    { id: 'donnees', t: 'Data & RAG', i: 'pile' },
    { id: 'secu', t: 'Security', i: 'bouclier' },
    { id: 'produit', t: 'SaaS product', i: 'immeuble' },
    { id: 'recherche', t: 'Research & ML', i: 'graphe' },
    { id: 'outils', t: 'Dev tools', i: 'terminal' },
    { id: 'creatif', t: 'Creative & 3D', i: 'particules' }
  ],
  projetsChapo: 'Seven selected projects: the product I lead, and what I build on the side to push further into AI, data and security. Pick a tag to sort the index below; click a project to jump straight to it.',

  /* 05 — les projets ; o = l'objet 3D, fond = la couleur du papier [haut, milieu, bas] vers laquelle la page glisse,
     faits = [icône, texte court] (icônes dans js/serieux.js) */
  projets: [
    { o: 'immeuble', t: 'MARKO', sous: 'The operating system for real estate debt', role: 'CTO · 2026', prive: true, cats: ['produit', 'ia', 'donnees'],
      fond: ['#2D4FA8', '#233F91', '#172B6A'],
      d: 'An AI-native B2B SaaS for asset managers, funds, family offices and crowdfunding platforms: financing documents become data, covenants are monitored, and reporting goes out on its own.',
      faits: [['doc', 'Loan documents read by AI'], ['bouclier', 'LTV, DSCR, ICR covenants monitored'], ['pile', 'One PostgreSQL database per client'], ['agent', 'AI agents via an MCP server'], ['rapport', 'Investor reporting generated'], ['test', 'Security scanners in CI']],
      tags: ['Next.js', 'FastAPI', 'PostgreSQL + pgvector', 'Celery', 'Gemini', 'Mistral OCR', 'Grafana'],
      lien: { t: 'marko.fr', href: 'https://marko.fr' } },
    { o: 'archive', t: 'Archon', sous: 'Investigating across thousands of documents', role: 'Personal project · open source', cats: ['ia', 'donnees', 'secu'],
      fond: ['#35546A', '#2A4557', '#1A2E3C'],
      d: 'A local investigation platform: it ingests PDFs, images, emails, archives and disk images, reads and indexes them, then lets you search, date, connect and query everything in natural language.',
      faits: [['doc', 'OCR, emails, archives, disk images'], ['loupe', 'Hybrid Meilisearch + Qdrant search'], ['cerveau', 'Gemini RAG with reranking'], ['graphe', 'Extracted entities, linked in a graph'], ['bouclier', 'Personal data detected'], ['test', 'RAG quality measured']],
      tags: ['FastAPI', 'Celery', 'React', 'Qdrant', 'Meilisearch', 'spaCy', 'Docker'] },
    { o: 'bougies', t: 'NumerusX', sous: 'AI agents versus the market', role: 'Research project · open source', cats: ['ia', 'recherche'],
      fond: ['#1F6E5C', '#17594B', '#0E3D33'],
      d: 'An experimental algorithmic trading platform on Solana: AI agents analyze, decide and manage risk together; strategies evolve through genetic algorithms, and every decision is explainable. A research sandbox, not investment advice.',
      faits: [['agent', 'Analysis, trading and risk agents'], ['bourse', 'Multi-source market data'], ['particules', 'Evolving strategies (DEAP)'], ['cerveau', 'Explained decisions (SHAP, LIME)'], ['pile', 'PostgreSQL, Qdrant, InfluxDB'], ['serveur', 'Microservices, OpenTelemetry']],
      tags: ['FastAPI', 'React', 'Gemini', 'scikit-learn', 'Qdrant', 'InfluxDB', 'Docker'] },
    { o: 'radar', t: 'ScanRift', sous: 'Security scanners, an LLM, and always a human', role: 'Personal project', prive: true, cats: ['secu', 'ia'],
      fond: ['#5E4020', '#4C331A', '#2F1F0F'],
      d: 'A security assessment dashboard for authorized targets: it brings together well-established open-source scanners, rates each finding, then an LLM helps analyze them and weed out false positives. Nothing runs on its own: every action is launched and approved by hand.',
      faits: [['serveur', 'Open-source scanners in one place'], ['rapport', 'Every finding rated by severity'], ['cerveau', 'Local LLM (Ollama) or via API'], ['loupe', 'Assisted false-positive review'], ['cadenas', 'Authorized targets, human approval'], ['doc', 'Reports exported to PDF']],
      tags: ['FastAPI', 'Playwright', 'Next.js', 'Ollama', 'Docker'] },
    { o: 'reseau', t: 'NumOSINT', sous: 'Open-source intelligence tools, in one place', role: 'Personal project · open source', cats: ['secu', 'donnees'],
      fond: ['#4B3C7A', '#3D3067', '#282048'],
      d: 'A web platform that orchestrates several open-source OSINT tools, each in its own container, and cross-references their results into investigations and case files. Built for investigation and defense.',
      faits: [['serveur', '8 tools as Go and Python microservices'], ['graphe', 'Results cross-referenced by an orchestrator'], ['eclair', 'Real-time tracking (Socket.IO)'], ['pile', 'Express, Prisma, PostgreSQL, Redis'], ['test', 'Jest and Playwright tests'], ['bouclier', 'JWT, Helmet, rate limiting']],
      tags: ['Next.js', 'Node.js', 'Prisma', 'Go', 'Python', 'Docker'] },
    { o: 'caviarde', t: 'SafeShare', sous: 'Redact a document without ever sending it', role: 'WebMCP Challenge · 2026', cats: ['secu', 'ia'],
      fond: ['#7C3A4C', '#662E3E', '#461E2A'],
      d: 'Drop in a PDF or an image: the tool detects sensitive data, applies masks and exports a flattened copy. Everything happens in the browser. An AI agent can co-edit the masks via WebMCP without ever seeing the sensitive values.',
      faits: [['loupe', 'In-browser OCR'], ['cadenas', 'The file never leaves the device'], ['agent', 'Actions exposed to agents (WebMCP)'], ['doc', 'Flattened copy, permanent masks'], ['langues', 'French and English'], ['test', 'Vitest tests']],
      tags: ['React', 'TypeScript', 'Vite', 'tesseract.js', 'pdf-lib', 'WebMCP'],
      lien: { t: 'Try the demo', href: 'https://mathieuworoniecki.github.io/safeshare-webmcp/?demo=1&lang=en' } },
    { o: 'fleur', t: 'HUman', sous: '“What if we were the largest LLM ever observed?”', role: 'Author and developer · 2026', cats: ['creatif', 'ia'],
      fond: ['#2E3140', '#242734', '#15171F'],
      d: 'A reflection on AI told in India ink and particles: from a word inside a model to the flower, the atom, the universe and the brain. It runs entirely in the browser.',
      faits: [['particules', 'Ink and particles in Canvas'], ['langues', '10 languages'], ['cerveau', 'From predicted word to brain'], ['bouclier', 'Anti-spam guestbook (proof of work)'], ['serveur', 'Vercel and Supabase']],
      tags: ['JavaScript', 'Canvas', 'Web Audio', 'Supabase', 'Built with Claude'],
      lien: { t: 'areweai.dev', href: 'https://areweai.dev' } }
  ],

  /* les autres projets, en petites cartes ; i = icône */
  autresTitre: 'Also in my repositories',
  autres: [
    { i: 'agent', t: 'codex-crew', cats: ['ia', 'outils'], d: 'Multi-agent orchestrator: a goal broken into tasks, run in parallel by Codex CLI in isolated terminals, with file conflicts resolved.', tags: ['Python', 'asyncio', 'SQLite'] },
    { i: 'loupe', t: 'marko-support', prive: true, cats: ['ia', 'donnees'], d: 'Project memory and hybrid search (vector + lexical, rank fusion), exposed to agents via MCP.', tags: ['FastAPI', 'sqlite-vec', 'MCP'] },
    { i: 'code', t: 'NumerusAI', prive: true, cats: ['ia', 'outils'], d: 'RAG assistant for a codebase: indexing, local (Ollama) or remote models, patches generated then applied with backup.', tags: ['Python', 'ChromaDB', 'Ollama'] },
    { i: 'terminal', t: 'endless', cats: ['ia', 'outils'], d: 'CLI / TUI that keeps a Codex agent session open continuously, with its own JSONL protocol and bridge. Published on npm.', tags: ['Bun', 'TypeScript'],
      lien: { t: 'npm', href: 'https://www.npmjs.com/package/@mathieuworoniecki/endless-cli' } },
    { i: 'eclair', t: 'CursorAuto', cats: ['ia', 'outils'], d: 'Chrome extension that chains prompt sequences on Cursor’s background agents, via their API.', tags: ['Chrome MV3', 'JavaScript'] },
    { i: 'des', t: 'Algoritmi', cats: ['recherche', 'donnees'], d: 'A statistics and ML lab on random draws, to measure the limits of prediction.', tags: ['LightGBM', 'Optuna', 'MLflow'] },
    { i: 'serveur', t: 'Webiteasy', prive: true, cats: ['produit', 'outils'], d: 'Website factory: WordPress sites generated from Figma mockups, orchestrated with Docker, tested with Playwright.', tags: ['FastAPI', 'Next.js', 'Docker'] },
    { i: 'globe', t: 'teuteuteu.com', cats: ['creatif'], d: 'A modern restoration of a cult Flash website: frame-accurate synced sound, a real-time global counter, 50+ languages.', tags: ['Next.js', 'Supabase', 'Playwright'],
      lien: { t: 'teuteuteu.com', href: 'https://teuteuteu.com' } },
    { i: 'particules', t: '3D product page', prive: true, cats: ['creatif'], d: 'For a client: a scrolling page in technical-blueprint style, with an exploded view and a 3D model reconstructed through image processing.', tags: ['three.js', 'Python', 'Vercel'] }
  ],


  /* 06 — le contact (pas de téléphone sur le site) */
  contact: {
    titre: 'Let’s talk',
    chapo: 'An AI product to build, a team to lead, an architecture to set right: get in touch.',
    liens: [
      { k: 'Email', v: 'numerus0@proton.me', href: 'mailto:numerus0@proton.me' },
      { k: 'LinkedIn', v: 'linkedin.com/in/mathieuworoniecki', href: 'https://www.linkedin.com/in/mathieuworoniecki/' },
      { k: 'GitHub', v: 'github.com/mathieuworoniecki', href: 'https://github.com/mathieuworoniecki' }
    ]
  }
};
