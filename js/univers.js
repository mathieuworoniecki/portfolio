/* L'univers des chats : le décor, en traits, dans la même vue que les chats (js/chat.js : VIEW).
     arbre    l'arbre à chat : un socle, une niche (avec son trou rond), deux poteaux en sisal, une plateforme, un panier en haut,
              un pompon qui pend au bout d'un fil ; ses perchoirs (perches) disent où un chat peut se poser
     carton   un carton ouvert, rabats écartés : un chat peut s'y asseoir (le devant cache ses pattes)
     coussin  un coussin rebondi, capitonné au milieu
     gamelle  une gamelle et ses croquettes
     pelote   une pelote de laine (sa couleur), qui roule ; le fil qui traîne est dessiné à la craie (js/chats.js)
     caisse   un carton fermé (o.size : 0, 1, 2), scotché, un petit dessin devant : on les empile, les pousse, les fait tomber
     panier   un lit rond en osier · poisson  un poisson en tissu (un jouet) · plante  une plante en pot · tasse  une tasse (à pousser du bord)
     distrib  le distributeur de croquettes (il a une tête, il crache des croquettes par son bec : it.bec) · eau  une fontaine à eau (it.jet)
     trappe   la machine à cartons accrochée au mur : seuls la bouche et le levier dépassent (it.mur, it.lev0, it.levK)
     lanceur  la machine à cartons : un canon (it.bouche, it.vise), un levier (parts.levier) ; elle projette des caisses
     souris   une souris articulée (corps, tête, oreilles, queue, pattes) qui court
   Tout se modèle en unités chat (la même taille que les chats) : Univers.make(type, { color }) → un objet posé par
   Univers.place(o) (o.x, o.y : son pied à l'écran, o.s : px par unité, o.yaw, o.z, o.a : l'opacité). */
window.Univers = (() => {
if (!window.Obj3D || !Obj3D.kit || !window.Chat) return null;
const T = Obj3D.T, K = Obj3D.kit, TAU = Math.PI * 2, V = (x, y, z) => new T.Vector3(x, y, z);
const segs = P => { const out = []; for (let i = 0; i < P.length - 1; i++) out.push(...P[i], ...P[i + 1]); return out; };
const ring = (r, y, n, cx, cz) => Array.from({ length: (n || 24) + 1 }, (_, i) => { const a = i / (n || 24) * TAU; return [(cx || 0) + Math.cos(a) * r, y, (cz || 0) + Math.sin(a) * r]; });
// un cylindre (tourné autour de y), un disque épais
const cyl = (r, y0, y1, seg) => K.lathe([[0, y0], [r, y0], [r, y1], [0, y1]], seg || 16);
const disc = (r, y, th, seg) => K.lathe([[0, y - th / 2], [r - th * 0.3, y - th / 2], [r, y - th * 0.2], [r, y + th * 0.2], [r - th * 0.3, y + th / 2], [0, y + th / 2]], seg || 28);
// une corde enroulée (le sisal des poteaux) : une hélice de traits pâles
function helix(r, y0, y1, pitch, cx, cz) { const P = [], n = Math.ceil((y1 - y0) / pitch * 16); for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n, a = (y - y0) / pitch * TAU; P.push([cx + Math.cos(a) * r * 1.02, y, cz + Math.sin(a) * r * 1.02]); } return segs(P); }

/* ——— les pièces du décor ——— */
const P = {};
function pieces() {
  if (P.done) return P; P.done = true;
  // l'arbre à chat
  // l'arbre à chat, en escalier qui monte vers le bord (il regarde le centre de l'écran) :
  //   la niche (au bord), une plateforme basse côté centre, une moyenne, une petite console, un panier tout en haut
  P.socle = Obj3D.piece('u:socle', B => B.solid(K.tf(K.ext(K.roundPoly([[-0.78, -0.36], [0.72, -0.36], [0.72, 0.36], [-0.78, 0.36]], 0.09), 0.07), [0, 0.035, 0], [Math.PI / 2, 0, 0])));
  P.niche = Obj3D.piece('u:niche', B => {
    const w = 0.5, h = 0.42, d = 0.46, x = -0.46; B.solid(K.tf(K.ext(K.roundPoly([[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]], 0.07, 5), d), [x, 0.07, 0]));
    B.lines(segs(ring(0.13, 0, 26).map(p => [x + 0.04 + p[0], 0.07 + h * 0.45 + p[2], d / 2 + 0.002])));   // le trou rond, sur le devant
    B.soft(segs(ring(0.155, 0, 26).map(p => [x + 0.04 + p[0], 0.07 + h * 0.45 + p[2], d / 2 + 0.002])));
  });
  const post = (x, y0, y1, r) => B => { B.solid(cyl(r, y0, y1, 14).translate(x, 0, 0)); B.soft(helix(r, y0 + 0.04, y1 - 0.04, 0.07, x, 0)); };
  P.poteauA = Obj3D.piece('u:poteauA', post(0.42, 0.07, 0.78, 0.07));
  P.poteauB = Obj3D.piece('u:poteauB', post(-0.08, 0.07, 1.28, 0.07));
  P.poteauC = Obj3D.piece('u:poteauC', post(-0.56, 0.49, 1.8, 0.065));
  P.plateau = Obj3D.piece('u:plateau', B => { B.solid(K.tf(disc(0.3, 0.8, 0.055), [0.4, 0, 0.02])); B.soft(segs(ring(0.27, 0.828, 28, 0.4, 0.02))); });
  P.plateau2 = Obj3D.piece('u:plateau2', B => { B.solid(K.tf(disc(0.29, 1.3, 0.055), [-0.1, 0, 0.02])); B.soft(segs(ring(0.26, 1.328, 28, -0.1, 0.02))); });
  P.console = Obj3D.piece('u:console', B => { B.solid(K.tf(disc(0.19, 1.58, 0.05), [0.2, 0, 0.02])); B.solid(cyl(0.035, 1.3, 1.56, 10).translate(0.1, 0, 0)); });
  P.panier = Obj3D.piece('u:panier', B => { B.solid(K.lathe([[0, 1.8], [0.31, 1.8], [0.34, 1.83], [0.35, 1.91], [0.32, 1.93], [0.29, 1.89], [0.27, 1.85], [0, 1.85]], 30).translate(-0.5, 0, 0)); B.soft(segs(ring(0.3, 1.895, 28, -0.5, 0))); });
  P.fil = Obj3D.piece('u:fil', B => { B.lines([0, 0, 0, 0, -0.22, 0]); B.solid(new T.IcosahedronGeometry(0.045, 1).translate(0, -0.25, 0)); B.soft([-0.03, -0.25, 0.03, 0.03, -0.25, -0.03, -0.03, -0.25, -0.03, 0.03, -0.25, 0.03]); });
  // le carton : quatre parois fines, un fond, quatre rabats ouverts
  P.carton = Obj3D.piece('u:carton', B => {
    const w = 0.56, h = 0.32, d = 0.44, t = 0.012;
    B.solid(K.box(w, t, d, [0, t / 2, 0])); B.solid(K.box(t, h, d, [-w / 2, h / 2, 0])); B.solid(K.box(t, h, d, [w / 2, h / 2, 0]));
    B.solid(K.box(w, h, t, [0, h / 2, -d / 2])); B.solid(K.box(w, h, t, [0, h / 2, d / 2]));
    // les rabats, écartés vers l'extérieur ; une bande de scotch et un logo griffonné sur le devant
    const fl = d * 0.5, fs = w * 0.4;
    B.solid(K.tf(K.box(w, t, fl, [0, 0, fl / 2]), [0, h, d / 2], [-0.75, 0, 0]));
    B.solid(K.tf(K.box(w, t, fl, [0, 0, -fl / 2]), [0, h, -d / 2], [0.6, 0, 0]));
    B.solid(K.tf(K.box(fs, t, d, [fs / 2, 0, 0]), [w / 2, h, 0], [0, 0, 0.7]));
    B.solid(K.tf(K.box(fs, t, d, [-fs / 2, 0, 0]), [-w / 2, h, 0], [0, 0, -0.55]));
    B.soft(segs([[-0.06, h * 0.55, d / 2 + t], [0, h * 0.7, d / 2 + t], [0.06, h * 0.55, d / 2 + t], [0, h * 0.4, d / 2 + t], [-0.06, h * 0.55, d / 2 + t]]));
    B.soft([-0.03, h * 0.62, d / 2 + t, 0.03, h * 0.48, d / 2 + t]);
  });
  // la caisse : un carton fermé (trois tailles), scotché, avec un petit dessin sur le devant (une flèche, un cœur, un chat)
  [[0.3, 0.24, 0.26], [0.38, 0.3, 0.32], [0.46, 0.34, 0.38]].forEach(([w, h, d], i) => {
    P['caisse' + i] = Obj3D.piece('u:caisse' + i, B => {
      B.solid(K.box(w, h, d, [0, h / 2, 0]));
      const f = d / 2 + 0.003, tw = w * 0.09;
      B.soft(segs([[-tw, h + 0.003, -d / 2], [-tw, h + 0.003, d / 2], [-tw, h * 0.72, f]])); B.soft(segs([[tw, h + 0.003, -d / 2], [tw, h + 0.003, d / 2], [tw, h * 0.72, f]]));
      B.lines(segs([[-w / 2, h + 0.003, 0], [w / 2, h + 0.003, 0]]));
      const cx = 0, cy = h * 0.4, r = h * 0.12;
      if (i === 0) { const Q = []; for (let k = 0; k <= 20; k++) { const a = k / 20 * TAU, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); Q.push([cx + x / 16 * r, cy + y / 16 * r, f]); } B.lines(segs(Q)); }
      if (i === 1) [-1, 1].forEach(sx => B.lines(segs([[cx + sx * r * 0.9 - r * 0.5, cy - r, f], [cx + sx * r * 0.9 - r * 0.5, cy + r, f], [cx + sx * r * 0.9 - r, cy + r * 0.45, f], [cx + sx * r * 0.9 - r * 0.5, cy + r, f], [cx + sx * r * 0.9, cy + r * 0.45, f]])));
      if (i === 2) { const Q = ring(r, 0, 20).map(q => [cx + q[0], cy + q[2] * 0.85, f]); B.lines(segs(Q)); [-1, 1].forEach(sx => B.lines(segs([[cx + sx * r * 0.35, cy + r * 0.8, f], [cx + sx * r * 0.8, cy + r * 1.45, f], [cx + sx * r * 0.95, cy + r * 0.55, f]]))); }
    });
  });
  // le panier : un lit rond, bord rebondi, quelques brins tressés
  P.panier2 = Obj3D.piece('u:panier2', B => {
    B.solid(K.tf(K.lathe([[0, 0], [0.3, 0], [0.345, 0.035], [0.36, 0.11], [0.33, 0.15], [0.29, 0.13], [0.24, 0.07], [0, 0.06]], 36), 0, 0, [1, 1, 0.8]));
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; B.soft([Math.cos(a) * 0.35, 0.05, Math.sin(a) * 0.35 * 0.8, Math.cos(a + 0.12) * 0.36, 0.1, Math.sin(a + 0.12) * 0.36 * 0.8]); }
  });
  // le poisson en tissu : un corps en fuseau, une queue en V, un œil, deux coutures
  P.poisson = Obj3D.piece('u:poisson', B => {
    B.solid(K.tf(K.latheX([[-0.08, 0], [-0.07, 0.022], [-0.02, 0.04], [0.04, 0.036], [0.08, 0.018], [0.095, 0]], 16), [0, 0.04, 0], 0, [1, 1, 0.55]));
    B.solid(K.tf(K.ext(K.roundPoly([[-0.075, 0], [-0.13, 0.04], [-0.12, 0], [-0.13, -0.04]], 0.01, 3), 0.012), [0, 0.04, 0]));
    [-1, 1].forEach(s => { B.lines(segs(ring(0.007, 0, 10).map(q => [0.05 + q[0], 0.048 + q[2], s * 0.018]))); B.soft([0.0, 0.07, s * 0.012, 0.0, 0.012, s * 0.012, 0.03, 0.072, s * 0.01, 0.03, 0.01, s * 0.01]); });
  });
  // la plante en pot : un pot évasé, de grandes feuilles (on la fait tomber, bien sûr)
  P.plante = Obj3D.piece('u:plante', B => {
    B.solid(K.lathe([[0, 0], [0.08, 0], [0.105, 0.16], [0.115, 0.165], [0.115, 0.19], [0, 0.19]], 24)); B.soft(segs(ring(0.11, 0.16, 24)));
    const leaf = K.roundPoly([[0, 0], [0.05, 0.1], [0, 0.26], [-0.05, 0.1]], 0.04, 5);
    [[-0.5, 0.3, 0], [0.45, -0.4, 0.4], [0.05, 1.6, -0.1], [-0.2, 2.6, 0.2], [0.7, 3.8, 0.1]].forEach(([rz, ry, rx]) => { B.solid(K.tf(K.ext(leaf, 0.008), [0, 0.18, 0], [rx, ry, rz])); const v = new T.Vector3(); const Q = [[0, 0.02, 0.005], [0, 0.22, 0.005]].map(q => { v.set(...q).applyEuler(new T.Euler(rx, ry, rz)); return [v.x, v.y + 0.18, v.z]; }); B.soft(segs(Q)); });
  });
  // la tasse : sur le bord, un chat la pousse du bout de la patte… une anse, un petit cœur
  P.tasse = Obj3D.piece('u:tasse', B => {
    B.solid(K.lathe([[0, 0], [0.05, 0], [0.055, 0.005], [0.055, 0.11], [0.048, 0.11], [0.048, 0.02], [0, 0.02]], 24));
    B.solid(K.tf(new T.TorusGeometry(0.03, 0.008, 8, 16, Math.PI * 1.1), [0.055, 0.06, 0], [0, 0, -Math.PI * 0.55]));
    const Q = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * TAU, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); Q.push([x / 16 * 0.016, 0.06 + y / 16 * 0.016, 0.0565]); } B.lines(segs(Q));
  });
  // le coussin : un pouf aplati, une couture tout autour, un bouton au milieu et ses plis
  P.coussin = Obj3D.piece('u:coussin', B => {
    B.solid(K.tf(K.lathe([[0, 0], [0.3, 0.0], [0.36, 0.035], [0.38, 0.07], [0.35, 0.11], [0.26, 0.14], [0.1, 0.15], [0, 0.13]], 28), 0, 0, [1, 1, 0.78]));
    B.soft(segs(ring(0.378, 0.07, 32).map(p => [p[0], p[1], p[2] * 0.78])));
    B.lines(segs(ring(0.02, 0.135, 10))); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; B.soft([Math.cos(a) * 0.03, 0.137, Math.sin(a) * 0.03 * 0.78, Math.cos(a) * 0.14, 0.14, Math.sin(a) * 0.14 * 0.78]); }
  });
  // le distributeur de croquettes : un socle, une colonne avec une tête (deux yeux, un sourire, un gros bouton), un bocal plein en haut, un bec qui crache
  P.dSocle = Obj3D.piece('u:dsocle', B => B.solid(K.tf(K.ext(K.roundPoly([[-0.2, 0], [0.2, 0], [0.2, 0.08], [-0.2, 0.08]], 0.03, 4), 0.3), [0, 0, 0])));
  P.dCorps = Obj3D.piece('u:dcorps', B => {
    B.solid(K.ext(K.roundPoly([[-0.13, 0.08], [0.13, 0.08], [0.12, 0.46], [-0.12, 0.46]], 0.05, 5), 0.24));
    const f = 0.122; B.lines(segs(ring(0.045, 0, 20).map(q => [q[0], 0.2 + q[2], f]))); B.soft(segs(ring(0.028, 0, 16).map(q => [q[0], 0.2 + q[2], f])));
    [-1, 1].forEach(e => B.lines(segs(ring(0.014, 0, 10).map(q => [e * 0.045 + q[0], 0.37 + q[2], f]))));
    B.lines(segs([[-0.04, 0.315, f], [-0.02, 0.3, f], [0, 0.297, f], [0.02, 0.3, f], [0.04, 0.315, f]]));
  });
  P.dBec = Obj3D.piece('u:dbec', B => B.solid(K.tf(K.lathe([[0, 0], [0.04, 0], [0.036, 0.13], [0.05, 0.15], [0.05, 0.16], [0, 0.16]], 14), [0.1, 0.33, 0], [0, 0, -1.05])));
  // les pupilles (elles bougent : parts.yeux) ; les croquettes du bocal (le bocal se vide : parts.grains)
  P.dYeux = Obj3D.piece('u:dyeux', B => [-1, 1].forEach(e => B.solid(K.ball(0.011, [e * 0.045, 0.37, 0.124]))));
  P.dBocal = Obj3D.piece('u:dbocal', B => B.solid(K.lathe([[0, 0], [0.12, 0], [0.13, 0.02], [0.13, 0.19], [0.11, 0.215], [0.055, 0.225], [0.055, 0.25], [0.07, 0.26], [0.07, 0.28], [0, 0.285]], 26)));
  P.dGrains = Obj3D.piece('u:dgrains', B => {
    for (let i = 0; i < 11; i++) { const a = -0.9 + (i * 0.61) % 1.8, y = 0.03 + (i * 0.037) % 0.15, c = [Math.sin(a) * 0.132, y, Math.cos(a) * 0.132]; B.soft(segs(ring(0.016, 0, 8).map(q => [c[0] + q[0] * Math.cos(a), c[1] + q[2], c[2] - q[0] * Math.sin(a)]))); }
  });
  // la machine à cartons : un gros corps qui a une tête (deux yeux, un sourire), une réserve de cartons à plat sur le dessus,
  // un canon qui vise en l'air vers la droite, un levier sur le côté (il pivote : parts.levier)
  P.lSocle = Obj3D.piece('u:lsocle', B => B.solid(K.ext(K.roundPoly([[-0.3, 0], [0.3, 0], [0.3, 0.07], [-0.3, 0.07]], 0.03, 4), 0.42)));
  P.lCorps = Obj3D.piece('u:lcorps', B => {
    B.solid(K.ext(K.roundPoly([[-0.24, 0.07], [0.24, 0.07], [0.22, 0.56], [-0.22, 0.56]], 0.07, 5), 0.36));
    const f = 0.182; [-1, 1].forEach(e => { B.lines(segs(ring(0.042, 0, 18).map(q => [e * 0.085 + q[0], 0.41 + q[2], f]))); B.solid(K.ball(0.016, [e * 0.085 + 0.01, 0.405, f])); });
    B.lines(segs([[-0.06, 0.32, f], [-0.03, 0.295, f], [0, 0.29, f], [0.03, 0.295, f], [0.06, 0.32, f]]));
    // la trappe, et ses rivets
    B.lines(K.poly([[-0.15, 0.12, f], [0.15, 0.12, f], [0.15, 0.24, f], [-0.15, 0.24, f]], true));
    [[-0.13, 0.14], [0.13, 0.14], [-0.13, 0.22], [0.13, 0.22]].forEach(([x, y]) => B.soft(segs(ring(0.008, 0, 8).map(q => [x + q[0], y + q[2], f]))));
  });
  P.lReserve = Obj3D.piece('u:lreserve', B => { for (let i = 0; i < 4; i++) B.solid(K.tf(K.box(0.34, 0.026, 0.26), [((i * 7) % 3 - 1) * 0.015, 0.575 + i * 0.03, 0], [0, (i % 2 ? 0.12 : -0.09), 0])); B.soft([-0.17, 0.69, 0, 0.17, 0.69, 0]); });
  P.lCanon = Obj3D.piece('u:lcanon', B => { B.solid(K.tf(K.lathe([[0, 0], [0.085, 0], [0.085, 0.28], [0.108, 0.3], [0.108, 0.345], [0.072, 0.345], [0.07, 0.33], [0, 0.33]], 18), [0.16, 0.4, 0], [0, 0, -0.8])); });
  P.lLevier = Obj3D.piece('u:llevier', B => { B.solid(K.lathe([[0, -0.02], [0.05, -0.02], [0.05, 0.02], [0, 0.02]], 14).rotateX(Math.PI / 2)); B.solid(K.tube([[0, 0, 0], [0, 0.26, 0]], 0.017, 8)); B.solid(K.ball(0.05, [0, 0.3, 0])); });
  // la trappe à cartons : une boîte accrochée au mur (au bord droit de l'écran, surtout hors champ), sur une équerre ;
  // une tête (deux yeux, un sourire), une bouche en tube qui vise en l'air vers la gauche, un levier qui dépasse (on le baisse)
  P.tYeux = Obj3D.piece('u:tyeux', B => [-0.22, -0.1].forEach(x => B.solid(K.ball(0.014, [x - 0.008, 0.355, 0.172]))));
  P.tCorps = Obj3D.piece('u:tcorps', B => {
    B.solid(K.ext(K.roundPoly([[-0.3, 0], [0.3, 0], [0.3, 0.5], [-0.3, 0.5]], 0.06, 5), 0.34));
    const f = 0.172; [-0.22, -0.1].forEach(x => B.lines(segs(ring(0.036, 0, 16).map(q => [x + q[0], 0.36 + q[2], f]))));
    B.lines(segs([[-0.2, 0.28, f], [-0.18, 0.262, f], [-0.16, 0.258, f], [-0.14, 0.262, f], [-0.12, 0.28, f]]));
    // le logo : un petit carton dessiné, et deux rivets
    B.lines(K.poly([[-0.24, 0.1, f], [-0.14, 0.1, f], [-0.14, 0.17, f], [-0.24, 0.17, f]], true)); B.lines(segs([[-0.24, 0.17, f], [-0.21, 0.2, f], [-0.11, 0.2, f], [-0.14, 0.17, f]]));
    [[-0.05, 0.06], [-0.05, 0.44]].forEach(([x, y]) => B.soft(segs(ring(0.008, 0, 8).map(q => [x + q[0], y + q[2], f]))));
    B.solid(K.ext(K.roundPoly([[-0.02, 0], [0.3, 0], [0.3, -0.2]], 0.015, 3), 0.05));
  });
  P.tBouche = Obj3D.piece('u:tbouche', B => { B.solid(K.tf(K.lathe([[0, 0], [0.08, 0], [0.08, 0.16], [0.1, 0.18], [0.1, 0.22], [0.066, 0.22], [0.064, 0.2], [0, 0.2]], 18), [-0.26, 0.3, 0], [0, 0, 1.22])); });
  // la fontaine à eau : une vasque, une petite colonne ; l'eau (qui coule) est dessinée à la craie (js/chats.js)
  P.fontaine = Obj3D.piece('u:fontaine', B => {
    B.solid(K.lathe([[0, 0], [0.15, 0], [0.165, 0.015], [0.16, 0.065], [0.148, 0.07], [0.138, 0.052], [0.03, 0.048], [0.028, 0.14], [0.042, 0.15], [0.036, 0.168], [0, 0.172]], 28));
    B.soft(segs(ring(0.11, 0.052, 26))); B.soft(segs(ring(0.07, 0.052, 20)));
  });
  // la gamelle et ses croquettes
  P.gamelle = Obj3D.piece('u:gamelle', B => {
    B.solid(K.lathe([[0, 0], [0.16, 0], [0.17, 0.01], [0.14, 0.075], [0.13, 0.08], [0.115, 0.072], [0, 0.05]], 28));
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.02 + (i % 4) * 0.022; B.solid(new T.IcosahedronGeometry(0.016, 0).translate(Math.cos(a) * r, 0.062 + (i % 3) * 0.008, Math.sin(a) * r)); }
  });
  // la pelote : une boule, et des tours de laine (des grands cercles, dans tous les sens)
  P.pelote = Obj3D.piece('u:pelote', B => {
    const r = 0.075; B.solid(new T.IcosahedronGeometry(r, 2));
    for (let k = 0; k < 9; k++) { const q = new T.Quaternion().setFromEuler(new T.Euler(k * 1.1, k * 0.7, k * 0.37)), L = ring(r * 1.02, 0, 30).map(p => { const v = V(p[0], p[1], p[2]).applyQuaternion(q); return [v.x, v.y, v.z]; }); B.soft(segs(L)); }
  });
  // la souris : un corps en goutte, une tête pointue, deux grandes oreilles rondes, des pattes, une queue en segments
  P.sCorps = Obj3D.piece('u:scorps', B => B.solid(K.tf(K.latheX([[-0.1, 0], [-0.095, 0.03], [-0.07, 0.048], [-0.02, 0.052], [0.03, 0.044], [0.06, 0.03], [0.07, 0]], 12), [0, 0.05, 0], 0, [1, 1, 0.85])));
  P.sTete = Obj3D.piece('u:stete', B => { B.solid(K.latheX([[-0.03, 0], [-0.025, 0.028], [0.0, 0.03], [0.03, 0.018], [0.055, 0.006], [0.06, 0]], 12)); B.lines([0.061, 0, -0.004, 0.061, 0, 0.004]); [-1, 1].forEach(s => { B.lines(segs(ring(0.006, 0, 8).map(q => [0.012 + q[0], 0.014 + q[2], s * 0.024]))); B.lines([0.012, 0.012, s * 0.025, 0.012, 0.016, s * 0.025]); B.soft([0.045, 0.004, s * 0.008, 0.08, 0.012, s * 0.04, 0.045, 0.002, s * 0.008, 0.08, -0.008, s * 0.04]); }); });
  P.sOreille = Obj3D.piece('u:soreille', B => { B.solid(K.tf(new T.IcosahedronGeometry(0.03, 1), 0, 0, [0.35, 1, 1])); B.soft(segs(ring(0.018, 0, 14).map(p => [0.008, p[0], p[2]]))); });
  P.sPatte = Obj3D.piece('u:spatte', B => B.solid(K.tf(new T.IcosahedronGeometry(0.012, 0), [0.004, -0.006, 0], 0, [1.6, 0.7, 1])));
  P.sQueue = Obj3D.piece('u:squeue', B => B.solid(K.latheX([[-0.002, 0.006], [0.045, 0.004], [0.05, 0]], 6)));
  return P;
}

/* ——— un objet du décor ——— */
function make(kind, o) {
  o = o || {}; pieces();
  const root = new T.Group(), view = new T.Group(); root.add(view);
  const M = Obj3D.mats(o.color ?? inkHex(), { fat: 2.4, fatSoft: 1.8 }), list = [], parts = {};
  const put = (pp, parent, m) => { const q = Obj3D.mount(pp, m || M); (parent || view).add(q.g); list.push(q); return q; };
  const it = { kind, root, view, M, mats: [M], list, parts, x: 0, y: 0, s: 160, yaw: -0.45, z: 0, a: 1, spin: new T.Quaternion(), perches: [] };
  if (kind === 'arbre') {
    ['socle', 'niche', 'poteauA', 'poteauB', 'poteauC', 'plateau', 'plateau2', 'console', 'panier'].forEach(k => put(P[k]));
    const pv = new T.Group(); pv.position.set(0.66, 0.775, 0.1); view.add(pv); put(P.fil, pv); parts.pompon = pv;
    // les perchoirs : [x, y, z] du milieu de la surface, sa demi-largeur (en unités), sa hauteur de rang (pour grimper de l'un à l'autre)
    it.perches = [{ id: 'niche', p: [-0.46, 0.49, 0.05], w: 0.16, lv: 1 }, { id: 'plateau', p: [0.4, 0.83, 0.05], w: 0.16, lv: 1 }, { id: 'plateau2', p: [-0.1, 1.33, 0.05], w: 0.15, lv: 2 },
      { id: 'console', p: [0.22, 1.61, 0.04], w: 0.08, lv: 3 }, { id: 'panier', p: [-0.5, 1.85, 0.02], w: 0.12, lv: 4 }];
    it.post = { x: 0.42, r: 0.07, y0: 0.07, y1: 0.78 };
  } else if (kind === 'carton') { put(P.carton); it.perches = [{ id: 'carton', p: [0, 0.02, 0], w: 0.12, inside: true }]; }
  else if (kind === 'caisse') { const i = o.size ?? 1, D = [[0.3, 0.24, 0.26], [0.38, 0.3, 0.32], [0.46, 0.34, 0.38]][i]; put(P['caisse' + i]); it.box = { w: D[0], h: D[1], d: D[2] }; it.perches = [{ id: 'caisse', p: [0, D[1], 0], w: D[0] * 0.35 }]; it.tilt = 0; }
  else if (kind === 'panier') { put(P.panier2); it.perches = [{ id: 'panier', p: [0, 0.07, 0], w: 0.2 }]; }
  else if (kind === 'poisson') { const g = new T.Group(); view.add(g); put(P.poisson, g); parts.ball = g; it.r = 0.04; }
  else if (kind === 'plante') { put(P.plante); it.tilt = 0; it.box = { w: 0.2, h: 0.19, d: 0.2 }; }
  else if (kind === 'tasse') { put(P.tasse); it.tilt = 0; it.box = { w: 0.11, h: 0.11, d: 0.11 }; }
  else if (kind === 'coussin') { put(P.coussin); it.perches = [{ id: 'coussin', p: [0, 0.13, 0], w: 0.15 }]; }
  else if (kind === 'gamelle') put(P.gamelle);
  else if (kind === 'distrib') { ['dSocle', 'dCorps', 'dBec'].forEach(k => put(P[k])); const j = new T.Group(); j.position.set(0, 0.46, 0); view.add(j); put(P.dBocal, j); parts.jar = j; it.bec = [0.24, 0.41, 0];
    const gr = new T.Group(); j.add(gr); put(P.dGrains, gr); parts.grains = gr; const ey = new T.Group(); view.add(ey); put(P.dYeux, ey); parts.yeux = ey; }
  else if (kind === 'lanceur') {
    ['lSocle', 'lCorps', 'lReserve', 'lCanon'].forEach(k => put(P[k]));
    const lv = new T.Group(); lv.position.set(-0.25, 0.3, 0.19); lv.rotation.z = 0.3; view.add(lv); put(P.lLevier, lv); parts.levier = lv;
    // la bouche du canon, sa direction (en unités) ; le pommeau du levier (dans le repère du levier)
    it.bouche = [0.16 + Math.sin(0.8) * 0.345, 0.4 + Math.cos(0.8) * 0.345, 0]; it.vise = [Math.sin(0.8), Math.cos(0.8)]; it.pivot = [-0.25, 0.3, 0.19];
  }
  else if (kind === 'trappe') {
    ['tCorps', 'tBouche'].forEach(k => put(P[k])); it.lev0 = 1.57; it.levK = 1.3; it.mur = true;
    const ey = new T.Group(); view.add(ey); put(P.tYeux, ey); parts.yeux = ey;
    const lv = new T.Group(); lv.position.set(-0.3, 0.12, 0.12); lv.rotation.z = it.lev0; view.add(lv); put(P.lLevier, lv); parts.levier = lv;
    it.bouche = [-0.26 - Math.sin(1.22) * 0.22, 0.3 + Math.cos(1.22) * 0.22, 0]; it.vise = [-Math.sin(1.22), Math.cos(1.22)]; it.pivot = [-0.3, 0.12, 0.12];
  }
  else if (kind === 'eau') { put(P.fontaine); it.jet = [0, 0.172, 0]; }
  else if (kind === 'pelote') { const g = new T.Group(); g.position.set(0, 0.075, 0); view.add(g); put(P.pelote, g); parts.ball = g; it.r = 0.075; }
  else if (kind === 'souris') {
    const body = new T.Group(); view.add(body); parts.body = body; put(P.sCorps, body);
    const head = new T.Group(); head.position.set(0.065, 0.058, 0); body.add(head); put(P.sTete, head); parts.head = head;
    [-1, 1].forEach(s => { const e = new T.Group(); e.position.set(-0.005, 0.03, s * 0.022); e.rotation.set(s * 0.4, 0, 0); head.add(e); put(P.sOreille, e); });
    parts.legs = [[0.04, -1], [0.04, 1], [-0.06, -1], [-0.06, 1]].map(([x, s]) => { const g = new T.Group(); g.position.set(x, 0.014, s * 0.025); body.add(g); put(P.sPatte, g); return g; });
    parts.tail = []; let tp = body; for (let i = 0; i < 7; i++) { const g = new T.Group(); if (i) g.position.set(0.045, 0, 0); else { g.position.set(-0.095, 0.045, 0); g.rotation.z = Math.PI; } tp.add(g); put(P.sQueue, g); parts.tail.push(g); tp = g; }
  }
  it.R = Obj3D.rig(root, list);
  return it;
}
const inkHex = () => (window.THEME && THEME.inkHex) ?? 0x222428;
function destroy(it) { if (it && it.R) Obj3D.unrig(it.R); if (it) it.R = null; }
const qa = new T.Quaternion(), qb = new T.Quaternion(), AX = V(1, 0, 0), AY = V(0, 1, 0);
// poser l'objet : même vue que les chats (un peu au-dessus), son orientation, sa taille ; son opacité
function place(it) {
  it.root.position.set(it.x, -it.y, it.z); it.root.scale.setScalar(it.s);
  qa.setFromAxisAngle(AX, Chat.VIEW.tilt); qb.setFromAxisAngle(AY, it.yaw); qa.multiply(qb); it.view.quaternion.copy(qa);
  if (it.parts.ball) it.parts.ball.quaternion.copy(it.spin);
  if (it.tilt) { qb.setFromAxisAngle(V(0, 0, 1), it.tilt); it.view.quaternion.multiply(qb); }
  it.mats.forEach(m => { m.line.opacity = Math.min(1, 0.92 * it.a); m.soft.opacity = 0.42 * it.a; });
  it.root.visible = it.a > 0.01;
}
// la souris qui court : les pattes qui moulinent, la queue qui ondule, le corps qui sautille (t : le temps, v : la vitesse 0 → 1)
function scurry(it, t, v) {
  const L = it.parts.legs; if (!L) return;
  L.forEach((g, i) => { const ph = t * 22 + (i % 2) * Math.PI + (i > 1 ? 1.2 : 0); g.position.x = (i < 2 ? 0.04 : -0.06) + Math.sin(ph) * 0.02 * v; g.position.y = 0.014 + Math.max(0, Math.cos(ph)) * 0.012 * v; });
  it.parts.body.position.y = Math.abs(Math.sin(t * 22)) * 0.01 * v; it.parts.body.rotation.z = Math.sin(t * 22) * 0.06 * v;
  it.parts.tail.forEach((g, i) => { if (i) g.rotation.set(0, Math.sin(t * 9 - i * 0.8) * 0.3, 0.12 + Math.sin(t * 7 - i) * 0.06); });
  it.parts.head.rotation.z = Math.sin(t * 5) * 0.08;
}
// où est, à l'écran, un point de l'objet (en unités, dans son repère)
const wv = V(0, 0, 0);
function at(it, pt) { it.root.updateMatrixWorld(true); wv.set(pt[0], pt[1], pt[2] || 0); it.view.localToWorld(wv); return [wv.x, -wv.y, wv.z]; }
return { make, destroy, place, scurry, at };
})();
