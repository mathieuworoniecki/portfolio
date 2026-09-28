/* Le mode sérieux : le CV de Mathieu, en page au défilement, avec des objets 3D en traits (esprit LookAnimation).
   Complètement à part du mode chat : son calque (#serieux), ses toiles, son style (css/serieux.css), ses données (js/serieux-donnees.js),
   sa 3D (js/serieux-3d.js). Il ne lit ni Film, ni Scenes, ni les chats.
     Serieux.ouvre({ x, y })   pose le calque (il s'ouvre en cercle depuis x, y : le bouton « Mode sérieux ») ; renvoie une Promise
     Serieux.ferme()           le referme (en cercle vers le bouton « Mode chat ») et rend la main au mode chat
     Serieux.ouvert            vrai quand le calque est affiché
   Événements sur window : 'serieux:ouvert' et 'serieux:ferme' ; html.serieux tant qu'il est ouvert.
   L'adresse ?serieux ouvre directement le mode sérieux. */
window.Serieux = (() => {
const D = window.SERIEUX_DONNEES, root = document.documentElement;
const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = v => { v = c01(v); return v * v * (3 - 2 * v); };
const reduit = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let el = null, defile, grille, gx, toile3d, etiqs = [], secs = [], postes = [], navLiens = [], cart = {};
let ouvert = false, boucle = 0, t0 = 0, tIntro = 0, souris = { x: -1, y: -1, mx: 0, my: 0 }, prise = null, rot = { x: 0, y: 0, vx: 0, vy: 0 }, active = -1, selPile = -1;

/* ——— la page ——— */
const mots = s => esc(s).split(' ').map((m, i) => `<span class="m"><span style="--i:${i}">${m}</span></span>`).join(' ');
const tete = (num, titre) => `<header class="sx-tete" data-rev><span class="sx-num">${num}</span><h2 class="sx-h2">${mots(titre)}</h2></header>`;
function page() {
  const ia = D.ia;
  const projets = D.projets.map((p, i) => `
    <section class="sx-sec sx-projet" data-obj="${p.o}" ${i === 0 ? 'data-nom="Projets" data-num="05" id="sx-projets"' : ''}>
      <div class="sx-col">
        ${i === 0 ? tete('05', 'Projets') : ''}
        <article class="sx-carte sx-proj" data-rev>
          <p class="sx-sur">${String(i + 1).padStart(2, '0')} / ${String(D.projets.length).padStart(2, '0')} · ${esc(p.role)}</p>
          <h3 class="sx-h3">${esc(p.t)}</h3>
          <p class="sx-sous">${esc(p.sous)}</p>
          <p>${esc(p.d)}</p>
          <ul class="sx-tags">${p.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          ${p.lien ? `<a class="sx-lien" href="${p.lien.href}" target="_blank" rel="noopener">${esc(p.lien.t)} <span aria-hidden="true">↗</span></a>` : ''}
        </article>
      </div>
    </section>`).join('');
  return `
  <canvas class="sx-grille" aria-hidden="true"></canvas>
  <canvas class="sx-3d" aria-hidden="true"></canvas>
  <div class="sx-etiqs" aria-hidden="true">${D.competences.map((c, i) => `<span class="sx-etiq${c.id === 'ia' ? ' ia' : ''}"><i></i>${String(i + 1).padStart(2, '0')} ${esc(c.court)}</span>`).join('')}</div>
  <div class="sx-defile" tabindex="-1">
    <main class="sx-page">
      <section class="sx-sec sx-accueil" data-obj="cerveau" data-nom="Accueil" data-num="00">
        <div class="sx-col">
          <p class="sx-sur" data-rev>CV · ${esc(D.lieu)}</p>
          <h1 class="sx-h1" data-rev>${mots('Mathieu')}<br>${mots('Woroniecki')}</h1>
          <p class="sx-role" data-rev>${esc(D.titre)}</p>
          <p class="sx-chapo" data-rev>${esc(D.resume)}</p>
          <p class="sx-maintenant" data-rev><i class="sx-point"></i>${esc(D.maintenant)}</p>
          <ul class="sx-faits" data-rev><li><b>10+</b> ans d’expérience</li>${D.langues.slice(0, 2).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
          <div class="sx-actions" data-rev>
            <a class="sx-btn plein" href="#sx-ia">Voir le travail sur l’IA</a>
            <a class="sx-btn" href="#sx-parcours">Le parcours</a>
          </div>
        </div>
        <p class="sx-defiler" aria-hidden="true"><span>Défiler</span><i></i></p>
      </section>

      <section class="sx-sec" id="sx-ia" data-obj="reseau" data-nom="L’IA" data-num="01">
        <div class="sx-col">
          ${tete('01', ia.titre)}
          <p class="sx-chapo" data-rev>${esc(ia.chapo)}</p>
          <ol class="sx-chaine" data-rev>${ia.chaine.map((c, i) => `<li style="--i:${i}"><b>${esc(c.t)}</b><span>${esc(c.d)}</span></li>`).join('')}</ol>
          <div class="sx-preuves">${ia.preuves.map((p, i) => `
            <article class="sx-carte sx-preuve" data-rev style="--d:${i}">
              <p class="sx-gros">${esc(p.chiffre)}</p><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p>
            </article>`).join('')}</div>
          <ul class="sx-tags ia" data-rev>${ia.outils.map((t, i) => `<li style="--i:${i}">${esc(t)}</li>`).join('')}</ul>
        </div>
      </section>

      <section class="sx-sec" id="sx-chiffres" data-obj="barres" data-nom="En chiffres" data-num="02">
        <div class="sx-col">
          ${tete('02', 'En chiffres')}
          <div class="sx-chiffres">${D.chiffres.map((c, i) => `
            <div class="sx-chiffre" data-rev style="--d:${i % 2}">
              <p class="sx-gros"><span class="sx-n" data-n="${c.n}" data-dec="${c.dec || 0}" data-pre="${esc(c.pre || '')}" data-suf="${esc(c.suf || '')}">${esc((c.pre || '') + fmt(c.n, c.dec || 0) + (c.suf || ''))}</span></p>
              <h3>${esc(c.u)}</h3><p>${esc(c.d)}</p>
            </div>`).join('')}</div>
        </div>
      </section>

      <section class="sx-sec" id="sx-competences" data-obj="pile" data-nom="Compétences" data-num="03">
        <div class="sx-col">
          ${tete('03', 'Compétences')}
          <p class="sx-chapo" data-rev>Six couches, de l’infrastructure à l’interface, avec l’IA tout en haut de la pile. Survolez une couche pour la sortir.</p>
          <div class="sx-couches">${D.competences.map((c, i) => `
            <article class="sx-carte sx-couche${c.id === 'ia' ? ' ia' : ''}" data-rev data-i="${i}" tabindex="0" style="--d:${i % 2}">
              <p class="sx-sur">${String(i + 1).padStart(2, '0')}</p><h3>${esc(c.t)}</h3>
              <ul class="sx-tags">${c.l.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
            </article>`).join('')}</div>
        </div>
      </section>

      <section class="sx-sec" id="sx-parcours" data-obj="helice" data-nom="Parcours" data-num="04">
        <div class="sx-col">
          ${tete('04', 'Parcours')}
          <ol class="sx-frise">${D.parcours.map((p, i) => `
            <li class="sx-poste${p.ia ? ' ia' : ''}" data-rev data-i="${i}">
              <p class="sx-dates">${esc(p.dates)}</p>
              <h3><b>${esc(p.lieu)}</b> ${esc(p.poste)}</h3>
              <p>${esc(p.d)}</p>
              ${p.l.length ? `<ul>${p.l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            </li>`).join('')}</ol>
          <div class="sx-formation" data-rev>
            <h3 class="sx-h3 petit">Formation</h3>
            <ul>${D.formation.map(f => `<li><span class="sx-dates">${esc(f.dates)}</span><b>${esc(f.t)}</b><span>${esc(f.o)}</span></li>`).join('')}</ul>
            <p class="sx-langues">${D.langues.map(esc).join(' · ')}</p>
          </div>
        </div>
      </section>

      ${projets}

      <section class="sx-sec sx-fin" id="sx-contact" data-obj="cerveau" data-nom="Contact" data-num="06">
        <div class="sx-col">
          ${tete('06', 'Construisons la suite')}
          <p class="sx-chapo" data-rev>Un produit IA à concevoir, une équipe à structurer, une architecture à moderniser : écrivez-moi.</p>
          <ul class="sx-contacts" data-rev>${D.contacts.map(c => `<li><span>${esc(c.k)}</span><a href="${c.href}"${c.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(c.v)}</a></li>`).join('')}</ul>
          <div class="sx-actions" data-rev><button type="button" class="sx-btn" data-retour>Retourner jouer avec les chats</button></div>
        </div>
      </section>
      <footer class="sx-pied"><span>${esc(D.nom)}</span><span>Plan n° CV-2026 · échelle 1:1</span></footer>
    </main>
  </div>
  <header class="sx-haut">
    <a class="sx-marque" href="#sx-haut-de-page" aria-label="Haut de la page"><b>MW</b><span>${esc(D.nom)}</span></a>
    <nav class="sx-plan" aria-label="Sections"></nav>
    <button type="button" class="sx-retour" data-retour aria-label="Revenir au mode chat">
      <svg viewBox="0 0 24 20" aria-hidden="true"><path d="M3 18V6.5L2 1.5l5.2 3.2h9.6L22 1.5l-1 5V18z"/><path class="yeux" d="M8.2 10.2v1.4M15.8 10.2v1.4"/></svg>
      <span>Mode chat</span>
    </button>
  </header>
  <div class="sx-barre" aria-hidden="true"><i></i></div>
  <div class="sx-cartouche" aria-hidden="true">
    <div><span>Projet</span><b>CV — ${esc(D.nom)}</b></div>
    <div><span>Planche</span><b class="c-planche">00 / 06 · Accueil</b></div>
    <div class="c2"><span>Échelle</span><b>1:1</b></div><div class="c2"><span>Rév.</span><b>09.2026</b></div>
    <div class="c-xy"><span>Curseur</span><b class="c-pos">X 0000 · Y 0000</b></div>
  </div>`;
}
function fmt(n, dec) { return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ /g, ' '); }

function batir() {
  el = document.createElement('div'); el.id = 'serieux'; el.hidden = true;
  el.setAttribute('role', 'document'); el.setAttribute('aria-label', 'Mode sérieux : le CV de ' + D.nom); el.lang = 'fr';
  el.innerHTML = page(); document.body.appendChild(el);
  defile = el.querySelector('.sx-defile'); grille = el.querySelector('.sx-grille'); gx = grille.getContext('2d'); toile3d = el.querySelector('.sx-3d');
  etiqs = [...el.querySelectorAll('.sx-etiq')]; secs = [...el.querySelectorAll('.sx-sec')]; postes = [...el.querySelectorAll('.sx-poste')];
  cart.planche = el.querySelector('.c-planche'); cart.pos = el.querySelector('.c-pos'); cart.barre = el.querySelector('.sx-barre i');
  /* le plan des sections */
  const nav = el.querySelector('.sx-plan');
  secs.forEach(s => { if (!s.dataset.nom) return; const b = document.createElement('a'); b.href = '#'; b.innerHTML = `<i>${s.dataset.num}</i><span>${esc(s.dataset.nom)}</span>`;
    b.addEventListener('click', e => { e.preventDefault(); va(s); }); nav.appendChild(b); navLiens.push({ b, s }); });
  el.querySelectorAll('a[href^="#sx-"]').forEach(a => a.addEventListener('click', e => { const s = el.querySelector(a.getAttribute('href')); if (s) { e.preventDefault(); va(s); } }));
  el.querySelector('.sx-marque').addEventListener('click', e => { e.preventDefault(); defile.scrollTo({ top: 0, behavior: reduit ? 'auto' : 'smooth' }); });
  el.querySelectorAll('[data-retour]').forEach(b => b.addEventListener('click', () => ferme()));
  /* les compétences : survoler une carte sort sa couche de la pile */
  el.querySelectorAll('.sx-couche').forEach(c => {
    const on = () => { selPile = +c.dataset.i; }, off = () => { if (selPile === +c.dataset.i) selPile = -1; };
    c.addEventListener('pointerenter', on); c.addEventListener('pointerleave', off); c.addEventListener('focus', on); c.addEventListener('blur', off);
  });
  /* les apparitions */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); if (e.target.classList.contains('sx-chiffre')) compte(e.target); } }), { root: defile, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  el.querySelectorAll('[data-rev]').forEach(n => io.observe(n));
  /* le mode chat n'entend rien de ce qui se passe ici (ses écouteurs sont sur window) */
  ['pointerdown', 'pointerup', 'pointermove', 'click', 'wheel', 'keydown', 'keyup', 'touchstart', 'touchmove', 'touchend', 'contextmenu'].forEach(k => el.addEventListener(k, e => e.stopPropagation(), { passive: true }));
  /* tourner l'objet à la souris */
  defile.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a,button,.sx-carte,.sx-poste,h1,h2,h3,p,li')) return;
    if (!Serieux3D.pres(e.clientX, e.clientY)) return;
    prise = { x: e.clientX, y: e.clientY }; el.classList.add('prise'); try { defile.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
  });
  defile.addEventListener('pointermove', e => {
    souris.x = e.clientX; souris.y = e.clientY;
    if (prise) { const dx = e.clientX - prise.x, dy = e.clientY - prise.y; prise.x = e.clientX; prise.y = e.clientY; rot.vy = dx * 0.012; rot.vx = dy * 0.012; rot.y += rot.vy; rot.x += rot.vx; return; }
    el.classList.toggle('peut-prendre', e.pointerType === 'mouse' && !e.target.closest('a,button,.sx-carte,.sx-poste,h1,h2,h3,p,li') && Serieux3D.pres(e.clientX, e.clientY));
  });
  const lache = () => { if (!prise) return; prise = null; el.classList.remove('prise'); };
  defile.addEventListener('pointerup', lache); defile.addEventListener('pointercancel', lache);
  defile.addEventListener('pointerleave', () => { souris.x = -1; });
  addEventListener('resize', () => { if (ouvert) taille(); });
  Serieux3D.init(toile3d, D);
}
function va(s) { defile.scrollTo({ top: s.offsetTop - (innerWidth < 900 ? 56 : 0), behavior: reduit ? 'auto' : 'smooth' }); }

/* les compteurs */
function compte(bloc) {
  const n = bloc.querySelector('.sx-n'); if (!n) return;
  const cible = +n.dataset.n, dec = +n.dataset.dec, pre = n.dataset.pre, suf = n.dataset.suf, deb = performance.now(), duree = reduit ? 0 : 1500;
  const pas = () => { const k = duree ? c01((performance.now() - deb) / duree) : 1, v = cible * (1 - Math.pow(1 - k, 3)); n.textContent = pre + fmt(k < 1 ? v : cible, dec) + suf; if (k < 1) requestAnimationFrame(pas); };
  pas();
}

/* ——— le fond : le quadrillage du plan, qui glisse avec le défilement et s'éclaire sous la souris ——— */
let GW = 1, GH = 1, gdpr = 1;
function taille() {
  gdpr = Math.min(window.devicePixelRatio || 1, 2); GW = el.clientWidth; GH = el.clientHeight;
  grille.width = Math.round(GW * gdpr); grille.height = Math.round(GH * gdpr); Serieux3D.resize();
}
function fond(intro, dy) {
  const g = gx, P = 24, G = P * 5; g.setTransform(gdpr, 0, 0, gdpr, 0, 0); g.clearRect(0, 0, GW, GH);
  const off = -((dy * 0.3) % G + G) % G;
  const trace = (pas, a, larg) => {
    g.beginPath(); g.strokeStyle = `rgba(238,245,255,${a})`; g.lineWidth = larg;
    for (let x = (GW / 2) % pas; x < GW; x += pas) { const k = sm(intro * 1.6 - Math.abs(x - GW / 2) / GW); if (k <= 0) continue; const h = GH * k; g.moveTo(Math.round(x) + 0.5, GH / 2 - h / 2); g.lineTo(Math.round(x) + 0.5, GH / 2 + h / 2); }
    for (let y = off % pas; y < GH; y += pas) { const k = sm(intro * 1.6 - Math.abs(y - GH / 2) / GH); if (k <= 0) continue; const w = GW * k; g.moveTo(GW / 2 - w / 2, Math.round(y) + 0.5); g.lineTo(GW / 2 + w / 2, Math.round(y) + 0.5); }
    g.stroke();
  };
  trace(P, 0.07, 1); trace(G, 0.16, 1);
  if (souris.x >= 0 && intro >= 1) {   // la loupe : le quadrillage s'éclaire autour du curseur, et la croix du dessinateur
    const r = 150, grd = g.createRadialGradient(souris.x, souris.y, 0, souris.x, souris.y, r);
    grd.addColorStop(0, 'rgba(238,245,255,0.07)'); grd.addColorStop(1, 'rgba(238,245,255,0)'); g.fillStyle = grd; g.fillRect(souris.x - r, souris.y - r, r * 2, r * 2);
    g.beginPath(); g.strokeStyle = 'rgba(238,245,255,0.09)'; g.setLineDash([2, 5]);
    g.moveTo(0, Math.round(souris.y) + 0.5); g.lineTo(GW, Math.round(souris.y) + 0.5); g.moveTo(Math.round(souris.x) + 0.5, 0); g.lineTo(Math.round(souris.x) + 0.5, GH); g.stroke(); g.setLineDash([]);
  }
}

/* ——— chaque image : le défilement donne la présence de chaque objet ——— */
function image(now) {
  if (!ouvert) return;
  boucle = requestAnimationFrame(image);
  const t = (now - t0) / 1000, intro = reduit ? 1 : c01((now - tIntro) / 1400), vh = defile.clientHeight, st = defile.scrollTop, large = innerWidth >= 900;
  /* chaque suite de sections qui partagent un objet forme un bloc ; l'objet se rassemble en entrant, s'éclate en sortant */
  const poids = {}; let blocs = [], cur = null;
  secs.forEach(s => { const r = s.getBoundingClientRect(); if (cur && cur.o === s.dataset.obj) cur.b = r.bottom; else { cur = { o: s.dataset.obj, t: r.top, b: r.bottom, s }; blocs.push(cur); } });
  blocs.forEach((b, i) => {
    const ent = i === 0 ? 1 : sm((vh * 0.78 - b.t) / (vh * 0.45)), sor = i === blocs.length - 1 ? 1 : sm((b.b - vh * 0.22) / (vh * 0.45));
    let w = Math.min(ent, sor); if (i === 0) w *= sm(intro * 1.4 - 0.35);
    const loc = c01((vh * 0.55 - b.t) / Math.max(1, b.b - b.t));
    const p = poids[b.o]; if (!p || w > p.w) poids[b.o] = { w, loc };
  });
  /* le poste du parcours le plus près du milieu de l'écran */
  let best = 0, bd = 1e9; postes.forEach((p, i) => { const r = p.getBoundingClientRect(), d = Math.abs(r.top + Math.min(r.height, vh * 0.4) / 2 - vh * 0.45); if (d < bd) { bd = d; best = i; } p.classList.toggle('ici', false); });
  if (postes[best]) postes[best].classList.add('ici');
  if (poids.helice) poids.helice.sel = best;
  if (poids.pile) poids.pile.sel = selPile;
  /* la souris : un peu de parallaxe ; la prise : on tourne, puis l'objet revient doucement à sa chorégraphie */
  const mx = souris.x >= 0 ? (souris.x / innerWidth - 0.5) : 0, my = souris.x >= 0 ? (souris.y / innerHeight - 0.5) : 0;
  souris.mx += (mx - souris.mx) * 0.06; souris.my += (my - souris.my) * 0.06;
  if (!prise) { rot.y += rot.vy; rot.x += rot.vx; rot.vy *= 0.93; rot.vx *= 0.93; rot.y *= 0.985; rot.x *= 0.985; }
  Serieux3D.rendu(poids, t, { large, accueil: st < vh * 0.5, mx: souris.mx, my: souris.my, prx: rot.x, pry: rot.y });
  fond(intro, st);
  /* les étiquettes de la pile de compétences (écran large) */
  const pw = poids.pile ? poids.pile.w : 0;
  etiqs.forEach((e, i) => {
    const a = large && pw > 0.5 ? Serieux3D.ancre('pile', i) : null;
    if (!a) { e.style.opacity = 0; return; }
    e.style.opacity = sm((pw - 0.5) * 2.2); e.style.transform = `translate(${Math.round(a.x + 18)}px,${Math.round(a.y - 9)}px)`; e.classList.toggle('on', selPile === i);
  });
  /* la section active : le plan, le cartouche, la barre */
  let act = 0; navLiens.forEach((n, i) => { if (n.s.getBoundingClientRect().top < vh * 0.5) act = i; });
  if (act !== active) { active = act; navLiens.forEach((n, i) => n.b.classList.toggle('on', i === act)); const s = navLiens[act].s; cart.planche.textContent = `${s.dataset.num} / 06 · ${s.dataset.nom}`; }
  cart.barre.style.transform = `scaleX(${c01(st / Math.max(1, defile.scrollHeight - vh))})`;
  if (souris.x >= 0) cart.pos.textContent = `X ${String(Math.round(souris.x)).padStart(4, '0')} · Y ${String(Math.round(souris.y + st)).padStart(4, '0')}`;
}

/* ——— ouvrir, fermer ——— */
const autres = () => [...document.body.children].filter(n => n !== el && n.tagName !== 'SCRIPT');
function ouvre(o) {
  o = o || {};
  if (!el) batir();
  if (ouvert) return Promise.resolve();
  const x = o.x ?? innerWidth / 2, y = o.y ?? innerHeight / 2, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  el.style.setProperty('--ox', x + 'px'); el.style.setProperty('--oy', y + 'px'); el.style.setProperty('--or', Math.ceil(r) + 'px');
  el.classList.remove('ferme', 'la'); el.classList.toggle('instant', !!o.instant || reduit);
  ouvert = true; el.hidden = false; root.classList.add('serieux');
  autres().forEach(n => { if (!n.hasAttribute('inert')) { n.setAttribute('inert', ''); n.dataset.sxInert = '1'; } });
  taille(); defile.scrollTop = 0; active = -1; t0 = tIntro = performance.now();
  getComputedStyle(el).clipPath; el.classList.add('la');
  try { const u = new URL(location.href); if (!u.searchParams.has('serieux')) { u.searchParams.set('serieux', ''); history.replaceState(history.state, '', u.pathname + u.search.replace('serieux=', 'serieux') + u.hash); } } catch (e) {}
  cancelAnimationFrame(boucle); boucle = requestAnimationFrame(image);
  setTimeout(() => defile.focus({ preventScroll: true }), 50);
  dispatchEvent(new CustomEvent('serieux:ouvert'));
  return new Promise(res => setTimeout(res, o.instant || reduit ? 0 : 900));
}
function ferme() {
  if (!ouvert) return Promise.resolve();
  const b = el.querySelector('.sx-retour').getBoundingClientRect();
  el.style.setProperty('--ox', (b.left + b.width / 2) + 'px'); el.style.setProperty('--oy', (b.top + b.height / 2) + 'px');
  el.classList.remove('instant'); el.classList.add('ferme'); el.classList.remove('la');
  return new Promise(res => setTimeout(() => {
    ouvert = false; cancelAnimationFrame(boucle); el.hidden = true; el.classList.remove('ferme'); root.classList.remove('serieux');
    autres().forEach(n => { if (n.dataset.sxInert) { n.removeAttribute('inert'); delete n.dataset.sxInert; } });
    try { const u = new URL(location.href); if (u.searchParams.has('serieux')) { u.searchParams.delete('serieux'); history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash); } } catch (e) {}
    dispatchEvent(new CustomEvent('serieux:ferme')); res();
  }, reduit ? 0 : 750));
}

/* ?serieux : directement dans le mode sérieux */
if (/[?&]serieux(=|&|$)/.test(location.search)) ouvre({ instant: true });
return { ouvre, ferme, get ouvert() { return ouvert; } };
})();
