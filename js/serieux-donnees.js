/* Le mode sérieux : le contenu du CV.
   Seules sources : le CV (CV_FR_WORONIECKI), l'export LinkedIn (Profile.pdf) et les dépôts GitHub de Mathieu (lus un par un, septembre 2026).
   Rien d'autre : pas de chiffre, de date ni de client qui n'y figure pas. En cas de doute entre le CV et LinkedIn, le CV gagne.
   Les dépôts privés apparaissent sans lien ; aucun client, dossier ou donnée personnelle qu'ils contiennent n'est cité.
   La forme de chaque bloc suit ce que js/serieux.js et js/serieux-3d.js en font (écrans épinglés : une entrée = une étape = un geste 3D). */
window.SERIEUX_DONNEES = {
  nom: 'Mathieu Woroniecki',
  langues: ['Français natif', 'Anglais courant et technique', 'Espagnol, notions'],

  /* 00 — l'accueil */
  accueil: {
    sur: 'Paris · CV · 2026',
    titre: 'Responsable technique senior & architecte IA',
    these: 'Plus de dix ans à construire pour le web, de l’intégration au poste de CTO. Aujourd’hui je conçois des produits où l’IA lit, raisonne et agit, et je travaille entouré d’agents que j’orchestre pour livrer à la cadence d’une équipe.',
    maintenant: 'Aujourd’hui CTO de MARKO, un SaaS B2B AI-native pour l’immobilier.',
    faits: ['<b>1 développeur</b> + ses agents = une équipe de 10', '<b>10+ ans</b> d’expérience', '<b>150 000+</b> utilisateurs sur une plateforme pilotée', '<b>85+</b> projets livrés en indépendant']
  },

  /* 01 — l'IA dans le produit : la chaîne construite chez MARKO, une étape par station 3D (scanner, extraction, RAG, agents, rapports) */
  ia: {
    titre: 'Une IA qui travaille, pas une démo',
    chapo: 'Chez MARKO, j’ai conçu la chaîne complète : un document de financement entre, il en sort des données vérifiées, des réponses sourcées, des actions exécutées et des rapports. Chaque maillon est mesuré, tracé, et son coût suivi.',
    chaine: [
      { court: 'Document AI', t: 'Lire ce que personne ne veut saisir', d: 'Contrats de prêt, rapports, pièces scannées : une chaîne d’OCR à plusieurs étages, avec un moteur de secours, transforme le papier en texte exploitable.', tags: ['OCR multi-moteurs', 'Document AI', 'Repli automatique'] },
      { court: 'Extraction', t: 'Des champs métier, pas du texte', d: 'Les champs de chaque opération sont extraits dans un schéma strict, puis une seconde passe contrôle, compare et signale ce qui manque avant que l’humain ne le découvre.', tags: ['Sorties typées', 'Double vérification', 'Analyse des manques'] },
      { court: 'LLM / RAG', t: 'Des réponses qui citent leurs sources', d: 'Chaque document est découpé et vectorisé dans la base du client. Les réponses s’appuient sur les passages retrouvés, jamais sur la mémoire du modèle.', tags: ['RAG', 'pgvector', 'Isolation par client'] },
      { court: 'Agents', t: 'Des agents qui agissent, dans un cadre', d: 'Les agents enchaînent les tâches à travers un serveur MCP : ils lisent et agissent dans le produit par des outils au contrat étroit, sans accès à ce qu’ils n’ont pas à voir.', tags: ['Agentic AI', 'MCP', 'Outils bornés'] },
      { court: 'Automatisation', t: 'Le suivi tourne tout seul', d: 'Les covenants (LTV, DSCR, ICR) sont surveillés, les alertes partent, le reporting investisseurs se génère en tâche de fond ; chaque appel d’IA a son coût suivi.', tags: ['Workflows', 'Alertes', 'FinOps IA'] }
    ],
    suite: 'Et ce n’est pas un cas isolé : la même exigence se retrouve dans les équipes que j’ai menées et dans ce que je construis à côté.',
    preuves: [
      { chiffre: '1 = 10', t: 'un développeur, une équipe', d: 'Seul avec mes agents, je livre des plateformes qui auraient demandé des années à une équipe de dix développeurs. MARKO en est la preuve : produit, IA, infrastructure et sécurité.' },
      { chiffre: 'MCP', t: 'des agents branchés en sécurité', d: 'Du flux Figma-to-code chez LWA aux serveurs MCP de MARKO et à SafeShare (WebMCP) : l’agent agit, sans jamais voir ce qu’il ne doit pas voir.' },
      { chiffre: 'RAG', t: 'mesuré, pas supposé', d: 'Sur Archon : recherche hybride lexicale et vectorielle, reranking, et un jeu d’évaluation pour juger la qualité des réponses au lieu de l’espérer.' }
    ],
    outils: ['LLM', 'RAG hybride', 'Agents & sous-agents', 'MCP / WebMCP', 'Skills & plugins', 'Document AI', 'Évaluation', 'Embeddings', 'pgvector', 'Qdrant', 'Claude Code', 'Codex', 'Modèles locaux']
  },

  /* 02 — la méthode : comment un seul développeur tient la cadence d'une équipe ; une étape = un geste de la salle de contrôle 3D
     (terminaux en éventail, agents et sous-agents, skills qui s'emboîtent, banc d'essai, essaim d'agents, portique de contrôle) */
  methode: {
    titre: 'Un développeur, la force d’une équipe',
    chapo: 'Là où il fallait une équipe de dix développeurs et des années, je livre seul, entouré d’agents que j’orchestre. L’IA ne remplace pas le métier : elle démultiplie celui qui sait la diriger. Voici comment je travaille.',
    etapes: [
      { court: 'Parallèle', t: 'Plusieurs terminaux, plusieurs agents', d: 'Je ne code plus une chose à la fois. Chaque chantier part dans son terminal et son worktree Git isolé, avec son agent : pendant que l’un écrit, un autre teste, un troisième relit.', tags: ['Worktrees Git', 'Multi-terminaux', 'Agents en parallèle'] },
      { court: 'Orchestration', t: 'Des agents qui délèguent à des sous-agents', d: 'Un agent principal découpe l’objectif et lance des sous-agents spécialisés : exploration, code, tests, revue. Ils rendent leurs résultats ; je recompose, je tranche.', tags: ['Sous-agents', 'Workflows multi-agents', 'Arbitrage'] },
      { court: 'Outillage', t: 'Des skills et des plugins sur mesure', d: 'Dès qu’une tâche revient, elle devient un outil : skills, commandes, agents dédiés, serveurs MCP. Sur MARKO, un audit de sécurité complet se lance en une commande.', tags: ['Skills', 'Plugins', 'Serveurs MCP', 'Commandes'] },
      { court: 'Banc d’essai', t: 'Tout tester, tout mesurer', d: 'Harness, orchestrateurs, plugins, extensions : je teste ce qui sort, je compare sur de vrais chantiers et je ne garde que ce qui fait gagner du temps. Certains essais sont devenus des outils publiés.', tags: ['Benchmark continu', 'Harness', 'endless', 'codex-crew'] },
      { court: 'Aujourd’hui', t: 'Une flotte d’agents sur un même produit', d: 'Sur MARKO, les gros chantiers passent par les workflows multi-agents de Claude Code (ultracode), qui répartissent le travail entre de nombreux agents ; un second outil rapide sert aux arbitrages courts. L’outillage change chaque mois, la méthode reste.', tags: ['Claude Code ultracode', 'Décisions rapides', 'Orchestration'] },
      { court: 'Garde-fous', t: 'La vitesse, sans perdre le contrôle', d: 'Tests à chaque étape, revue automatique en CI, scanners de sécurité, et une décision humaine avant chaque fusion. Les agents proposent ; je valide et je signe.', tags: ['Tests', 'Revue en CI', 'Scanners', 'Humain dans la boucle'] }
    ]
  },

  /* 02 — les chiffres, dans l'ordre des formes du nuage 3D :
     cernes d'arbre (ans), sphère (personnes), anneau (disponibilité), barre qui se tasse, colonne qui monte, 25 foyers, 85 cubes */
  impact: {
    titre: 'Ce que ça a donné, en chiffres',
    chiffres: [
      { n: 10, suf: '+', u: 'ans d’expérience', d: 'Un cerne par année, du support technique chez Schneider Electric au poste de CTO.', src: 'CV' },
      { n: 150000, suf: '+', u: 'collaborateurs', d: 'sur Digiplace, l’intranet stratégique d’ENGIE, dont j’ai été le tech lead.', src: 'ENGIE · 2022 — 2024' },
      { n: 99.99, dec: 2, suf: ' %', u: 'de disponibilité', d: 'Maintien en condition opérationnelle de Digiplace. Un seul point clignote : le 0,01 % restant.', src: 'ENGIE' },
      { n: 40, pre: '−', suf: ' %', u: 'de temps de chargement', d: 'avec la bascule vers React et WordPress headless.', src: 'ENGIE' },
      { n: 35, pre: '+', suf: ' %', u: 'de productivité pour toute une équipe', d: 'dès les débuts de l’IA générative chez LWA. Depuis, seul avec mes agents, je fais le travail d’une équipe entière.', src: 'LWA · 2024 — 2026' },
      { n: 25, u: 'pays', d: 'Plateformes d’acquisition mondiales, 5 M+ visiteurs par mois, gérées d’un seul socle.', src: 'Sodexo · 2020 — 2021' },
      { n: 85, suf: '+', u: 'projets livrés', d: 'en indépendant, notés 4,88 / 5 sur 85 avis.', src: 'Malt · 2018 — 2022' }
    ]
  },

  /* 03 — le parcours, du plus récent au plus ancien (la page le lit à l'envers : chronologique)
     c = le composant 3D du poste sur la piste de circuit ; an0 = l'année affichée sous le composant */
  parcoursChapo: 'Du support technique au poste de CTO. Chaque poste a ajouté une couche ; le signal suit la piste, un composant par poste.',
  parcours: [
    { an: 2026.1, an0: '2026', c: 'puce', dates: '02/2026 — aujourd’hui', lieu: 'MARKO', poste: 'CTO', ia: true,
      d: 'Création de MARKO, SaaS B2B AI-native pour les professionnels de l’investissement immobilier : consolider les données de portefeuille, automatiser le suivi, produire le reporting investisseurs.',
      l: ['Architecture et développement du système IA complet', 'Generative AI, LLM / RAG, Agentic AI, Document AI', 'Une base PostgreSQL par client, observabilité et sécurité en CI'] },
    { an: 2024.1, an0: '2024', c: 'conteneurs', dates: '02/2024 — 02/2026', lieu: 'LWA', poste: 'Lead developer, architecture Vue.js / Nuxt.js', ia: true,
      d: 'Stratégie technique pour des marques de luxe (Hermès, Chanel, Ardian) ; équipe de 3 développeurs.',
      l: ['IA générative (LLM, RAG) adoptée : +35 % de productivité', 'MCP pour le flux Figma-to-code', '15+ projets passés sous Docker : +40 % de fréquence de déploiement', 'GitLab CI/CD et agilité : +25 % de vélocité'] },
    { an: 2022.2, an0: '2022', c: 'tour', dates: '03/2022 — 03/2024', lieu: 'ENGIE', poste: 'Tech lead, plateformes web',
      d: 'Pilotage technique de l’intranet stratégique Digiplace et du site public : 150 000+ collaborateurs, contexte CAC 40.',
      l: ['Disponibilité à 99,99 %', 'React / WordPress headless : −40 % de temps de chargement', 'OWASP : 100 % des vulnérabilités critiques corrigées', 'Conformité RGAA niveau AA'] },
    { an: 2020.6, an0: '2020', c: 'monde', dates: '08/2020 — 07/2021', lieu: 'Sodexo', poste: 'Tech lead international, plateformes d’acquisition',
      d: 'Plateformes d’acquisition mondiales (WordPress / PHP sur Azure) : 25 pays, 5 M+ visiteurs par mois, contexte Fortune 500.',
      l: ['Refonte du code historique : −30 % de dette technique', 'Core Web Vitals : +45 % en moyenne', 'CI/CD Azure : 99,9 % de disponibilité', 'Incidents sur 25 pays : −4 h de délai de résolution'] },
    { an: 2018.85, an0: '2018', c: 'entonnoir', dates: '11/2018 — 05/2020', lieu: 'AXA', poste: 'Développeur front-end, UI/UX & conversion',
      d: 'À la croisée du design, de la technique et des résultats : React, Webpack, Symfony.',
      l: ['+25 % de conversion sur les pages d’atterrissage', '−800 ms de temps de chargement moyen', 'Outils internes utilisés par 10 départements'] },
    { an: 2018.2, an0: '2018', c: 'missions', dates: '03/2018 — 03/2022', lieu: 'Malt', poste: 'Consultant senior, CTO à temps partagé',
      d: 'Indépendant, en parallèle : architecture, full-stack et conseil stratégique.',
      l: ['85+ projets livrés, 4,88 / 5 sur 85 avis', '40+ intégrations d’API (Salesforce, Zoho, ActiveCampaign)', 'CTO à temps partagé pour 15+ startups et PME'] },
    { an: 2016.0, an0: '2016', c: 'equipe', dates: '01/2016 — 02/2018', lieu: '1min30', poste: 'Lead developer & manager technique',
      d: 'Agence d’inbound marketing : développeur WordPress, puis à la tête de la division technique.',
      l: ['Équipe de 5 ingénieurs, 50+ projets web par an', 'Production industrialisée : −30 % de temps de développement', 'Avant-vente technique : 250 k$ de nouveaux contrats'] },
    { an: 2014.7, an0: '2014', c: 'sites', dates: '09/2014 — 12/2015', lieu: 'Indexel', poste: 'Développeur web, intégrateur',
      d: 'Intégration de 100+ sites vitrines et e-commerce (HTML5, CSS3, JavaScript), WordPress et Drupal.', l: [] },
    { an: 2012.8, an0: '2012', c: 'gtb', dates: '10/2012 — 08/2014', lieu: 'Schneider Electric', poste: 'Support technico-informatique',
      d: 'Un système d’analyse des pannes d’équipements sur plusieurs sites : de l’équipement à la base de données, du diagnostic à la résolution.', l: [] }
  ],
  formation: [
    { dates: '2014 — 2016', t: 'Master (RNCP niveau 2) — chef de projet multimédia', o: 'Institut F2I' },
    { dates: '2012 — 2014', t: 'BTS SIO, option développement (SLAM)', o: 'ITIC Paris' },
    { dates: '2009 — 2012', t: 'Bac pro SEN, informatique', o: 'Christophe Colomb' }
  ],

  /* 04 — les compétences : les six couches de la puce, dans l'ordre des étapes (ia, front, back, devops, secu, lead).
     Tirées du CV et de l'analyse de tous les dépôts ; seul ce qui est réellement dans le code est cité. */
  competencesChapo: 'Six couches, comme une puce : l’IA au cœur, ce qu’on voit au-dessus, ce qui tient tout en dessous. Tiré du CV et de la lecture de tous mes dépôts.',
  competences: [
    { id: 'ia', couche: 'ia', court: 'IA', nomCouche: 'cœur', t: 'IA & données',
      d: 'Le cœur : des systèmes qui lisent, cherchent, raisonnent et agissent, en production comme en recherche.',
      groupes: [
        ['Intégrations LLM', ['Gemini', 'Mistral', 'Claude', 'OpenAI / Codex', 'DeepSeek', 'Modèles locaux (Ollama)']],
        ['RAG & recherche', ['RAG hybride vecteur + lexical', 'Reranking', 'Embeddings', 'pgvector', 'Qdrant', 'ChromaDB', 'Meilisearch', 'Évaluation RAG']],
        ['Agents', ['Agentic AI', 'MCP / WebMCP', 'Orchestration multi-agents', 'Sous-agents', 'Skills & plugins', 'Prompt engineering']],
        ['Documents', ['Document AI', 'OCR (Mistral, Tesseract)', 'Extraction de données', 'Entités (spaCy, LangExtract)']],
        ['Machine learning', ['scikit-learn', 'LightGBM', 'Optuna', 'MLflow', 'SHAP / LIME', 'Algorithmes génétiques', 'Monte-Carlo']]
      ] },
    { id: 'front', couche: 'front', court: 'Front', nomCouche: 'capot', t: 'Front & interfaces',
      d: 'Ce qu’on voit et ce qu’on touche : des interfaces rapides, animées, accessibles.',
      groupes: [
        ['Frameworks', ['React', 'Next.js', 'Vue', 'Nuxt', 'TypeScript', 'JavaScript ES6+']],
        ['Interface', ['TailwindCSS', 'Radix / shadcn', 'TanStack Query', 'Zustand', 'Redux', 'Pinia', 'Vuetify']],
        ['Animation & 3D', ['three.js', 'Canvas', 'Web Audio', 'GSAP', 'D3', 'Phaser']],
        ['Outillage', ['Vite', 'Webpack', 'Sass', 'i18n (50+ langues, RTL)', 'Performance web', 'Extensions Chrome']]
      ] },
    { id: 'back', couche: 'back', court: 'Back-end', nomCouche: 'substrat', t: 'Back-end & données',
      d: 'Ce qui tient tout : des API, des files de tâches, des bases isolées par client.',
      groupes: [
        ['Langages', ['Python', 'TypeScript / Node.js', 'PHP', 'Go', 'Bun']],
        ['Frameworks', ['FastAPI', 'SQLAlchemy async', 'Pydantic', 'Express', 'Prisma', 'Symfony', 'WordPress headless']],
        ['Tâches & temps réel', ['Celery', 'Dramatiq', 'Redis', 'Socket.IO', 'Colyseus']],
        ['Données', ['PostgreSQL', 'MySQL', 'Supabase', 'InfluxDB', 'MinIO / S3', 'SQLite']]
      ] },
    { id: 'devops', couche: 'devops', court: 'DevOps', nomCouche: 'carte', t: 'DevOps & cloud',
      d: 'La carte sur laquelle tout est soudé : conteneurs, déploiements, observabilité.',
      groupes: [
        ['Conteneurs', ['Docker', 'Docker Compose', 'Podman', 'Traefik', 'Nginx', 'Caddy']],
        ['CI/CD', ['GitHub Actions', 'GitLab CI', 'Dagger', 'Déploiements canary', 'Renovate']],
        ['Cloud', ['Azure', 'AWS', 'Vercel', 'GitHub Pages']],
        ['Observabilité', ['Prometheus', 'Grafana', 'Loki', 'OpenTelemetry', 'Sentry']]
      ] },
    { id: 'secu', couche: 'secu', court: 'Sécurité', nomCouche: 'anneau de garde', t: 'Sécurité & qualité',
      d: 'L’anneau de garde : on teste, on scanne, on protège les données.',
      groupes: [
        ['Sécurité', ['OWASP', 'CodeQL', 'Semgrep', 'Trivy', 'Gitleaks', 'SBOM CycloneDX', 'JWT EdDSA', 'Limitation de débit']],
        ['Données personnelles', ['Privacy by design', 'Caviardage', 'Isolation par client', 'Hachage des adresses IP']],
        ['Tests', ['pytest', 'Vitest', 'Jest', 'Playwright', 'Cypress']],
        ['Accessibilité', ['RGAA AA', 'WCAG']]
      ] },
    { id: 'lead', couche: 'lead', court: 'Leadership', nomCouche: 'pistes', t: 'Leadership & méthode',
      d: 'Les pistes qui relient tout : des équipes, une méthode, une feuille de route.',
      groupes: [
        ['Équipe', ['Tech lead', 'Management (jusqu’à 5 ingénieurs)', 'Mentorat', 'CTO à temps partagé']],
        ['Développement augmenté', ['Multi-terminaux, multi-agents', 'Worktrees Git par agent', 'Skills et plugins maison', 'Benchmark continu des harness']],
        ['Méthode', ['Agile', 'Gitflow', 'Décisions d’architecture (ADR)', 'Industrialisation', 'Refactoring']],
        ['Stratégie', ['Roadmap technique', 'Avant-vente', 'Conseil']]
      ] }
  ],

  /* 05 — les catégories des projets : une étiquette courte, une icône (js/serieux.js) ; la légende en tête des projets les filtre */
  categories: [
    { id: 'ia', t: 'IA & agents', i: 'cerveau' },
    { id: 'donnees', t: 'Données & RAG', i: 'pile' },
    { id: 'secu', t: 'Sécurité', i: 'bouclier' },
    { id: 'produit', t: 'Produit SaaS', i: 'immeuble' },
    { id: 'recherche', t: 'Recherche & ML', i: 'graphe' },
    { id: 'outils', t: 'Outils de dev', i: 'terminal' },
    { id: 'creatif', t: 'Créatif & 3D', i: 'particules' }
  ],
  projetsChapo: 'Sept projets choisis : le produit que je dirige, et ce que je construis à côté pour aller plus loin sur l’IA, la donnée et la sécurité. Les étiquettes les rangent ; cliquez-en une pour ne garder qu’elle.',

  /* 05 — les projets ; o = l'objet 3D, fond = la couleur du papier [haut, milieu, bas] vers laquelle la page glisse,
     faits = [icône, texte court] (icônes dans js/serieux.js) */
  projets: [
    { o: 'immeuble', t: 'MARKO', sous: 'Le système d’exploitation de la dette immobilière', role: 'CTO · 2026', prive: true, cats: ['produit', 'ia', 'donnees'],
      fond: ['#2D4FA8', '#233F91', '#172B6A'],
      d: 'Un SaaS B2B AI-native pour les gérants d’actifs, les fonds, les family offices et les plateformes de crowdfunding : les documents de financement deviennent des données, les covenants sont surveillés, le reporting part tout seul.',
      faits: [['doc', 'Documents de prêt lus par l’IA'], ['bouclier', 'Covenants LTV, DSCR, ICR surveillés'], ['pile', 'Une base PostgreSQL par client'], ['agent', 'Agents IA via un serveur MCP'], ['rapport', 'Reporting investisseurs généré'], ['test', 'Scanners de sécurité en CI']],
      tags: ['Next.js', 'FastAPI', 'PostgreSQL + pgvector', 'Celery', 'Gemini', 'Mistral OCR', 'Grafana'],
      lien: { t: 'marko.fr', href: 'https://marko.fr' } },
    { o: 'archive', t: 'Archon', sous: 'Enquêter dans des milliers de documents', role: 'Projet personnel · open source', cats: ['ia', 'donnees', 'secu'],
      fond: ['#35546A', '#2A4557', '#1A2E3C'],
      d: 'Une plateforme locale d’investigation : elle avale PDF, images, e-mails, archives et images disque, les lit, les indexe, puis permet de chercher, dater, relier et interroger le tout en langage naturel.',
      faits: [['doc', 'OCR, e-mails, archives, images disque'], ['loupe', 'Recherche hybride Meilisearch + Qdrant'], ['cerveau', 'RAG Gemini avec reranking'], ['graphe', 'Entités extraites, reliées en graphe'], ['bouclier', 'Données personnelles détectées'], ['test', 'Qualité du RAG mesurée']],
      tags: ['FastAPI', 'Celery', 'React', 'Qdrant', 'Meilisearch', 'spaCy', 'Docker'] },
    { o: 'bougies', t: 'NumerusX', sous: 'Des agents IA face au marché', role: 'Projet de recherche · open source', cats: ['ia', 'recherche'],
      fond: ['#1F6E5C', '#17594B', '#0E3D33'],
      d: 'Une plateforme expérimentale de trading algorithmique sur Solana : des agents IA analysent, décident et gèrent le risque ensemble ; les stratégies évoluent par algorithmes génétiques et chaque décision s’explique. Un terrain de recherche, pas un conseil en investissement.',
      faits: [['agent', 'Agents d’analyse, de trading, de risque'], ['bourse', 'Données de marché multi-sources'], ['particules', 'Stratégies qui évoluent (DEAP)'], ['cerveau', 'Décisions expliquées (SHAP, LIME)'], ['pile', 'PostgreSQL, Qdrant, InfluxDB'], ['serveur', 'Microservices, OpenTelemetry']],
      tags: ['FastAPI', 'React', 'Gemini', 'scikit-learn', 'Qdrant', 'InfluxDB', 'Docker'] },
    { o: 'radar', t: 'ScanRift', sous: 'Des scanners de sécurité, un LLM, et toujours un humain', role: 'Projet personnel', prive: true, cats: ['secu', 'ia'],
      fond: ['#5E4020', '#4C331A', '#2F1F0F'],
      d: 'Un tableau de bord d’évaluation de sécurité, pour des cibles autorisées : il réunit des scanners open source reconnus, note chaque résultat, puis un LLM aide à l’analyser et à écarter les faux positifs. Rien ne part tout seul : chaque action est lancée et validée à la main.',
      faits: [['serveur', 'Scanners open source réunis'], ['rapport', 'Chaque résultat noté par gravité'], ['cerveau', 'LLM local (Ollama) ou par API'], ['loupe', 'Vérification assistée des faux positifs'], ['cadenas', 'Cibles autorisées, validation humaine'], ['doc', 'Rapports exportés en PDF']],
      tags: ['FastAPI', 'Playwright', 'Next.js', 'Ollama', 'Docker'] },
    { o: 'reseau', t: 'NumOSINT', sous: 'Les outils d’investigation en source ouverte, réunis', role: 'Projet personnel · open source', cats: ['secu', 'donnees'],
      fond: ['#4B3C7A', '#3D3067', '#282048'],
      d: 'Une plateforme web qui orchestre plusieurs outils OSINT open source, chacun dans son conteneur, et recoupe leurs résultats dans des enquêtes et des dossiers. Pensée pour l’investigation et la défense.',
      faits: [['serveur', '8 outils en microservices Go et Python'], ['graphe', 'Résultats recoupés par un orchestrateur'], ['eclair', 'Suivi en temps réel (Socket.IO)'], ['pile', 'Express, Prisma, PostgreSQL, Redis'], ['test', 'Tests Jest et Playwright'], ['bouclier', 'JWT, Helmet, limitation de débit']],
      tags: ['Next.js', 'Node.js', 'Prisma', 'Go', 'Python', 'Docker'] },
    { o: 'caviarde', t: 'SafeShare', sous: 'Caviarder un document sans jamais l’envoyer', role: 'WebMCP Challenge · 2026', cats: ['secu', 'ia'],
      fond: ['#7C3A4C', '#662E3E', '#461E2A'],
      d: 'On dépose un PDF ou une image : l’outil repère les données sensibles, pose les masques et exporte une copie aplatie. Tout se passe dans le navigateur. Un agent IA peut co-éditer les masques via WebMCP, sans jamais voir les valeurs sensibles.',
      faits: [['loupe', 'OCR dans le navigateur'], ['cadenas', 'Le fichier ne quitte pas l’appareil'], ['agent', 'Actions ouvertes aux agents (WebMCP)'], ['doc', 'Copie aplatie, masques définitifs'], ['langues', 'Français et anglais'], ['test', 'Tests Vitest']],
      tags: ['React', 'TypeScript', 'Vite', 'tesseract.js', 'pdf-lib', 'WebMCP'],
      lien: { t: 'Essayer la démo', href: 'https://mathieuworoniecki.github.io/safeshare-webmcp/?demo=1&lang=fr' } },
    { o: 'fleur', t: 'HUman', sous: '« Et si nous étions le plus grand LLM jamais observé ? »', role: 'Auteur et développeur · 2026', cats: ['creatif', 'ia'],
      fond: ['#2E3140', '#242734', '#15171F'],
      d: 'Une réflexion sur l’IA racontée à l’encre de Chine et en particules : d’un mot dans un modèle jusqu’à la fleur, l’atome, l’univers et le cerveau. Elle se joue seule dans le navigateur.',
      faits: [['particules', 'Encre et particules en Canvas'], ['langues', '10 langues'], ['cerveau', 'Du mot prédit au cerveau'], ['bouclier', 'Livre d’or anti-spam (preuve de travail)'], ['serveur', 'Vercel et Supabase']],
      tags: ['JavaScript', 'Canvas', 'Web Audio', 'Supabase', 'Réalisé avec Claude'],
      lien: { t: 'areweai.dev', href: 'https://areweai.dev' } }
  ],

  /* les autres projets, en petites cartes ; i = icône */
  autresTitre: 'Et aussi, dans mes dépôts',
  autres: [
    { i: 'agent', t: 'codex-crew', cats: ['ia', 'outils'], d: 'Orchestrateur multi-agents : un objectif découpé en tâches, exécutées en parallèle par Codex CLI dans des terminaux isolés, conflits de fichiers arbitrés.', tags: ['Python', 'asyncio', 'SQLite'] },
    { i: 'loupe', t: 'marko-support', prive: true, cats: ['ia', 'donnees'], d: 'Mémoire projet et recherche hybride (vecteur + lexical, fusion des rangs), ouverte aux agents via MCP.', tags: ['FastAPI', 'sqlite-vec', 'MCP'] },
    { i: 'code', t: 'NumerusAI', prive: true, cats: ['ia', 'outils'], d: 'Assistant RAG pour une base de code : indexation, modèles locaux (Ollama) ou distants, patchs générés puis appliqués avec sauvegarde.', tags: ['Python', 'ChromaDB', 'Ollama'] },
    { i: 'terminal', t: 'endless', cats: ['ia', 'outils'], d: 'CLI / TUI qui garde une session d’agent Codex ouverte en continu, avec son protocole JSONL et son pont. Publiée sur npm.', tags: ['Bun', 'TypeScript'],
      lien: { t: 'npm', href: 'https://www.npmjs.com/package/@mathieuworoniecki/endless-cli' } },
    { i: 'eclair', t: 'CursorAuto', cats: ['ia', 'outils'], d: 'Extension Chrome qui enchaîne des séquences de prompts sur les agents d’arrière-plan de Cursor, via leur API.', tags: ['Chrome MV3', 'JavaScript'] },
    { i: 'des', t: 'Algoritmi', cats: ['recherche', 'donnees'], d: 'Laboratoire statistique et ML sur des tirages aléatoires, pour mesurer les limites de la prédiction.', tags: ['LightGBM', 'Optuna', 'MLflow'] },
    { i: 'serveur', t: 'Webiteasy', prive: true, cats: ['produit', 'outils'], d: 'Usine à sites : des sites WordPress générés depuis des maquettes Figma, orchestrés sous Docker, testés par Playwright.', tags: ['FastAPI', 'Next.js', 'Docker'] },
    { i: 'globe', t: 'teuteuteu.com', cats: ['creatif'], d: 'Restauration moderne d’un site Flash culte : son synchronisé à l’image près, compteur mondial en temps réel, 50+ langues.', tags: ['Next.js', 'Supabase', 'Playwright'],
      lien: { t: 'teuteuteu.com', href: 'https://teuteuteu.com' } },
    { i: 'particules', t: 'Page produit 3D', prive: true, cats: ['creatif'], d: 'Pour un client : une page au défilement en style plan technique, vue éclatée, modèle 3D reconstruit par traitement d’image.', tags: ['three.js', 'Python', 'Vercel'] }
  ],


  /* 06 — le contact (pas de téléphone sur le site) */
  contact: {
    titre: 'Parlons-en',
    chapo: 'Un produit IA à construire, une équipe à mener, une architecture à remettre d’aplomb : écrivez-moi.',
    liens: [
      { k: 'Courriel', v: 'numerus0@proton.me', href: 'mailto:numerus0@proton.me' },
      { k: 'LinkedIn', v: 'linkedin.com/in/mathieuworoniecki', href: 'https://www.linkedin.com/in/mathieuworoniecki/' },
      { k: 'GitHub', v: 'github.com/mathieuworoniecki', href: 'https://github.com/mathieuworoniecki' }
    ]
  }
};
