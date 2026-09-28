/* Le mode sérieux : le contenu du CV.
   Seules sources : le CV (CV_FR_WORONIECKI), l'export LinkedIn (Profile.pdf) et les dépôts GitHub de Mathieu.
   Rien d'autre : pas de chiffre, de date ni de client qui n'y figure pas. En cas de doute entre le CV et LinkedIn, le CV gagne.
   Chaque section porte l'objet 3D qui l'accompagne (js/serieux-3d.js). */
window.SERIEUX_DONNEES = {
  nom: 'Mathieu Woroniecki',
  titre: 'Responsable technique senior & architecte IA',
  lieu: 'Paris, Île-de-France',
  resume: 'Tech lead et ingénieur full-stack senior, plus de 10 ans d’expérience. Je mène des équipes, je modernise des architectures, et j’intègre l’IA (RAG, LLM, agents) pour livrer plus vite des produits qui tiennent à l’échelle.',
  maintenant: 'Aujourd’hui CTO de MARKO, un SaaS B2B AI-native pour l’immobilier.',
  langues: ['Français natif', 'Anglais courant et technique', 'Espagnol, notions'],
  contacts: [
    { k: 'Courriel', v: 'numerus0@proton.me', href: 'mailto:numerus0@proton.me' },
    { k: 'LinkedIn', v: 'linkedin.com/in/mathieuworoniecki', href: 'https://www.linkedin.com/in/mathieuworoniecki/' },
    { k: 'GitHub', v: 'github.com/mathieuworoniecki', href: 'https://github.com/mathieuworoniecki' }
  ],

  /* 01 — l'IA, en premier et en plus grand */
  ia: {
    titre: 'L’IA au cœur de ce que je construis',
    chapo: 'Chez MARKO, j’ai conçu et développé un système IA complet, de la lecture des documents jusqu’à l’automatisation des tâches.',
    /* la chaîne, dans l'ordre du flux ; les mots viennent de la ligne MARKO du CV */
    chaine: [
      { t: 'Document AI', d: 'lire les documents' },
      { t: 'Extraction de données', d: 'en tirer des champs' },
      { t: 'LLM / RAG', d: 'raisonner sur ses sources' },
      { t: 'Agentic AI', d: 'agir en plusieurs étapes' },
      { t: 'Workflow automation', d: 'automatiser le suivi' }
    ],
    preuves: [
      { chiffre: '+35\u00a0%', t: 'de productivité d’équipe', d: 'Chez LWA, j’ai lancé l’adoption de l’IA générative (LLM, RAG) et d’outils d’automatisation dans tout le cycle de développement.' },
      { chiffre: 'MCP', t: 'du design au code', d: 'Intégration de MCP (Model Context Protocol) pour optimiser le passage de Figma au code.' },
      { chiffre: '7', t: 'briques IA dans un seul produit', d: 'MARKO : Generative AI, LLM/RAG, Agentic AI, Document AI, prompt engineering, data extraction et workflow automation, dans un seul produit.' }
    ],
    outils: ['GenAI', 'LLMs', 'RAG', 'Agents IA', 'Prompt engineering', 'Qdrant', 'MCP', 'Intégration d’API', 'Document AI', 'Extraction de données']
  },

  /* 02 — les chiffres (tous dans le CV ou le profil LinkedIn) */
  chiffres: [
    { n: 10, suf: '+', u: 'ans', d: 'd’expérience, de l’intégration web au poste de CTO' },
    { n: 150000, suf: '+', u: 'collaborateurs', d: 'sur Digiplace, l’intranet stratégique d’ENGIE' },
    { n: 99.99, dec: 2, suf: '\u00a0%', u: 'de disponibilité', d: 'maintien en condition opérationnelle de Digiplace' },
    { n: 35, pre: '+', suf: '\u00a0%', u: 'de productivité', d: 'grâce à l’adoption de l’IA générative chez LWA' },
    { n: 40, pre: '−', suf: '\u00a0%', u: 'de temps de chargement', d: 'modernisation React / WordPress headless chez ENGIE' },
    { n: 25, u: 'pays', d: 'plateformes d’acquisition Sodexo, 5 M+ visiteurs par mois' },
    { n: 85, suf: '+', u: 'projets livrés', d: 'en indépendant sur Malt, noté 4,88 / 5' },
    { n: 15, suf: '+', u: 'projets sous Docker', d: 'migration et industrialisation menées chez LWA' }
  ],

  /* 03 — les compétences, par couche (les groupes du CV) ; l'IA en haut de la pile */
  competences: [
    { id: 'ia', court: 'IA', t: 'IA & automatisation', l: ['GenAI', 'LLMs', 'RAG', 'Agents IA', 'Prompt engineering', 'Qdrant', 'MCP', 'Intégration d’API'] },
    { id: 'front', court: 'Front', t: 'Front & JS', l: ['Vue', 'Nuxt', 'React', 'Next', 'TypeScript', 'JS ES6+', 'Redux', 'HTML5', 'CSS3', 'Sass', 'Vite', 'Webpack', 'UI/UX', 'Animation', 'Performance'] },
    { id: 'back', court: 'Back-end', t: 'Back-end & architecture', l: ['Python', 'FastAPI', 'PHP', 'Symfony', 'Node.js', 'SQL', 'PostgreSQL', 'MySQL', 'Redis', 'API', 'WordPress avancé', 'Headless CMS'] },
    { id: 'devops', court: 'DevOps', t: 'DevOps & cloud', l: ['Docker', 'CI/CD', 'GitLab', 'GitHub', 'Azure', 'AWS', 'Traefik', 'Grafana', 'Git', 'Gitflow'] },
    { id: 'lead', court: 'Leadership', t: 'Leadership & stratégie', l: ['Tech lead', 'Management d’équipe', 'Mentorat', 'Agile', 'Industrialisation', 'Refactoring', 'Roadmap technique'] },
    { id: 'secu', court: 'Sécurité', t: 'Sécurité & conformité', l: ['OWASP', 'Audits de sécurité', 'Accessibilité WCAG / RGAA', 'Tests E2E (Jest, Cypress)'] }
  ],

  /* 04 — le parcours, du plus récent au plus ancien ; an = année de début (place sur l'hélice 3D) */
  parcours: [
    { an: 2026.1, dates: '02/2026 — aujourd’hui', lieu: 'MARKO', poste: 'CTO', ia: true,
      d: 'Création de MARKO, SaaS B2B AI-native pour les professionnels de l’investissement immobilier : consolider les données de portefeuille, automatiser le suivi opérationnel, produire le reporting investisseurs.',
      l: ['Architecture et développement du système IA complet', 'Generative AI, LLM/RAG, Agentic AI, Document AI', 'Extraction de données et automatisation des workflows'] },
    { an: 2024.1, dates: '02/2024 — 02/2026', lieu: 'LWA', poste: 'Lead developer, architecture Vue.js / Nuxt.js', ia: true,
      d: 'Stratégie technique pour des marques de luxe (Hermès, Chanel, Ardian) ; équipe de 3 développeurs.',
      l: ['Adoption de l’IA générative (LLM, RAG) : +35 % de productivité', 'MCP pour le flux Figma-to-code', 'Migration vers Docker de 15+ projets : +40 % de fréquence de déploiement', 'GitLab CI/CD et méthodes agiles : +25 % de vélocité'] },
    { an: 2022.2, dates: '03/2022 — 03/2024', lieu: 'ENGIE', poste: 'Tech lead, responsable technique plateformes web',
      d: 'Pilotage technique de l’intranet stratégique Digiplace et du site public : 150 000+ collaborateurs, contexte CAC 40.',
      l: ['Maintien en condition opérationnelle à 99,99 %', 'React / WordPress headless : −40 % de temps de chargement', 'OWASP : 100 % des vulnérabilités critiques corrigées', 'Conformité RGAA niveau AA'] },
    { an: 2020.6, dates: '08/2020 — 07/2021', lieu: 'Sodexo', poste: 'Tech lead international, plateformes d’acquisition',
      d: 'Plateformes d’acquisition mondiales (WordPress / PHP sur Azure) : 25 pays, 5 M+ visiteurs par mois, dans un contexte Fortune 500.',
      l: ['Refonte du code historique : −30 % de dette technique', 'Core Web Vitals : +45 % en moyenne', 'CI/CD Azure : +40 % de fréquence de déploiement, 99,9 % de disponibilité', 'Gestion des incidents sur 25 pays : −4 h de délai de résolution'] },
    { an: 2018.85, dates: '11/2018 — 05/2020', lieu: 'AXA', poste: 'Développeur front-end, UI/UX & conversion',
      d: 'À la croisée du design, de la technique et des résultats : React, Webpack, Symfony.',
      l: ['+25 % de conversion sur les pages d’atterrissage', '−800 ms de temps de chargement moyen', 'Outils internes utilisés par 10 départements'] },
    { an: 2018.2, dates: '03/2018 — 03/2022', lieu: 'Malt', poste: 'Consultant technique senior, CTO à temps partagé',
      d: 'Indépendant : architecture, full-stack et conseil stratégique.',
      l: ['85+ projets livrés, 4,88 / 5 sur 85 avis', '40+ intégrations d’API (Salesforce, Zoho, ActiveCampaign)', 'CTO à temps partagé pour 15+ startups et PME'] },
    { an: 2016.0, dates: '01/2016 — 02/2018', lieu: '1min30', poste: 'Lead developer & manager technique',
      d: 'Agence d’inbound marketing : développeur WordPress, puis à la tête de la division technique.',
      l: ['Équipe de 5 ingénieurs, 50+ projets web par an', 'Industrialisation de la production : −30 % de temps de développement', 'Avant-vente technique : 250 k$ de nouveaux contrats'] },
    { an: 2014.7, dates: '09/2014 — 12/2015', lieu: 'Indexel', poste: 'Développeur web, intégrateur',
      d: 'Intégration de 100+ sites vitrines et e-commerce (HTML5, CSS3, JavaScript), WordPress et Drupal.', l: [] },
    { an: 2012.8, dates: '10/2012 — 08/2014', lieu: 'Schneider Electric', poste: 'Support technico-informatique',
      d: 'Un système d’analyse des pannes d’équipements sur plusieurs sites : de l’équipement à la base de données, du diagnostic à la résolution.', l: [] }
  ],
  formation: [
    { dates: '2014 — 2016', t: 'Master (RNCP niveau 2) — chef de projet multimédia', o: 'Institut F2I' },
    { dates: '2012 — 2014', t: 'BTS SIO, option développement (SLAM)', o: 'ITIC Paris' },
    { dates: '2009 — 2012', t: 'Bac pro SEN, informatique', o: 'Christophe Colomb' }
  ],

  /* 05 — les projets ; o = l'objet 3D qui les accompagne */
  projets: [
    { o: 'immeuble', t: 'MARKO', sous: 'SaaS B2B AI-native pour l’immobilier', role: 'CTO, 2026',
      d: 'Une plateforme de gestion de portefeuille pour les gérants d’actifs et de fonds, les family offices, les plateformes de crowdfunding et les investisseurs institutionnels : consolider les données, automatiser le suivi, générer le reporting.',
      tags: ['Generative AI', 'LLM / RAG', 'Agentic AI', 'Document AI', 'Data extraction', 'Workflow automation'] },
    { o: 'atome', t: 'HUman', sous: '« Et si nous étions le plus grand LLM jamais observé ? »', role: 'Auteur et développeur',
      d: 'Une réflexion sur l’IA racontée à l’encre de Chine et en particules : d’un mot dans un modèle jusqu’à la fleur, l’atome, l’univers et le cerveau. Elle se joue seule dans le navigateur, en dix langues.',
      tags: ['IA', 'Narration interactive', 'Particules', '10 langues', 'Réalisé avec Claude'], lien: { t: 'areweai.dev', href: 'https://areweai.dev' } },
    { o: 'globe', t: 'Digiplace', sous: 'L’intranet stratégique d’ENGIE', role: 'Tech lead, 2022 — 2024',
      d: 'La plateforme de 150 000+ collaborateurs : roadmap technique, disponibilité à 99,99 %, architecture React / WordPress headless, sécurité OWASP et accessibilité RGAA AA.',
      tags: ['React', 'WordPress headless', 'OWASP', 'RGAA AA', '99,99 %'] },
    { o: 'chat', t: 'Ce portfolio', sous: 'Deux modes : les chats, et celui-ci', role: 'Conception et code',
      d: 'Un monde de chats dessinés au trait, un trou noir, l’espace ; et ce CV au défilement. Des objets 3D en traits, sans framework ni étape de build.',
      tags: ['three.js', 'Canvas', 'JavaScript', 'Sans build'] }
  ]
};
