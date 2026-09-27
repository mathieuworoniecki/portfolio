/* Les contenants (27/09, Mathieu : « dans les cartons, s'il est ouvert, pouvoir mettre n'importe quel autre objet, croquettes, coussin, tout ;
   si c'est trop lourd, genre l'arbre à chat, ça écrase le carton ; si je secoue le carton, tout sort ; si le carton est fermé, les objets vont dessus » ;
   « la balle dans un carton ne marche pas, et la balle avec laquelle joue un chat pousse un carton, pas logique »).
   - Le carton ouvert, le panier, le coussin reçoivent ce qui tombe dedans (un objet, des croquettes) : au fond, il suit quand on emporte le contenant.
   - Secoué fort, ou renversé : tout ressort.
   - Un objet lourd (l'arbre, le distributeur, le coffre) posé dessus l'écrase : il s'aplatit, ce qui était dedans saute dehors ; il reprend sa forme après.
   - La pelote qui roule rebondit sur ce qui est plus haut qu'elle (elle ne le pousse plus).
   (La caisse et le coffre fermés : les objets se posent dessus, js/chats.js.) */
window.Contenants = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, sOf, say, dust, LOURD, floorAt } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
// le fond (hauteur, en unités), la demi-largeur de l'ouverture, la hauteur du bord
const CONT = { carton: { fond: 0.03, w: 0.21, bord: 0.3 }, panier: { fond: 0.07, w: 0.28, bord: 0.13 }, coussin: { fond: 0.13, w: 0.28, bord: 0.15 } };
const ouvert = b => CONT[b.kind] && !b.fall && !b.suck && b.a > 0.5 && Math.abs(b.tilt || 0) < 0.5 && !(b.sq > 0.5);
const LOURDS = it => LOURD[it.kind] || it.kind === 'distrib' || it.kind === 'lanceur';
const contenu = b => Wd.props.filter(it => it.on === b && it.dans != null);
const prevY = new WeakMap();

// déposé dedans
function range(it, b) {
  const C = CONT[b.kind], dx = Math.max(-C.w, Math.min(C.w, (it.x - b.x) / b.s));
  K.stack(it, b, dx); it.dans = C.fond; it.fall = false; it.vx = it.vy = it.tiltV = 0; it.tilt = 0; it.target = null;
  word(pick(['ploc', 'plouf', 'tchac']), b.x, b.y - C.bord * b.s - 12, 15); b.wob = Wd.t; b.wobA = 0.3;
  // un chat dedans : surpris
  Wd.cats.forEach(c => { if (c.perch && c.perch.it === b) say(c, pick(['?!', 'hé !', 'merci ?'])); });
}
// tout ressort
function vide(b, vx, force) {
  const s = sOf(b.d); let n = 0;
  contenu(b).forEach(it => { K.drop(it, (vx || 0) * 0.8 + rnd(-1, 1) * s * force, s * rnd(1.2, 2) * force, rnd(-6, 6)); n++; });
  Wd.kib.forEach(k => { if (k.dans !== b) return; k.dans = null; k.rest = false; k.vx = (vx || 0) * 0.6 + rnd(-300, 300) * force; k.vy = -rnd(250, 600) * force; n++; });
  if (n) word(pick(['hop là', 'tout dehors !', 'patatras']), b.x, b.y - CONT[b.kind].bord * b.s - 16, 17);
  return n;
}

H.pre.push(dt => {
  const B = Wd.props.filter(b => CONT[b.kind] && b.a > 0.5);
  // 1. ce qui tombe dans un contenant ouvert
  for (const it of Wd.props) {
    const y = it.y, py = prevY.get(it); prevY.set(it, y);
    if (!it.fall || it.held || it.run || it.suck || LOURDS(it) || it.mur || py == null || y < py) continue;
    for (const b of B) {
      if (b === it || !ouvert(b) || b.held || (Math.abs(b.d - it.d) > 0.25 && !(Wd.t - (it.lache ?? -9) < 4)) || it.hull.w > b.hull.w * 1.5) continue;
      const C = CONT[b.kind], rim = b.y - C.bord * b.s; if (!(py <= rim + 2 && y >= rim - 2)) continue;
      if (Math.abs(it.x - b.x) > (C.w + 0.05) * b.s) continue;
      let k = b; while (k && k !== it) k = k.on; if (k === it) continue;   // (pas dans ce qu'il porte lui-même)
      range(it, b); break;
    }
  }
  // 2. les croquettes
  for (const k of Wd.kib) {
    if (k.dans) { const b = k.dans; if (!Wd.props.includes(b) || b.fall || Math.abs(b.tilt || 0) > 1.1 || b.suck) { k.dans = null; k.rest = false; k.vx = (b.vx || 0) * 0.5 + rnd(-120, 120); k.vy = -rnd(100, 300); continue; }
      k.x = b.x + k.ddx * b.s; k.y = b.y - CONT[b.kind].fond * b.s - k.ddy; continue; }
    if (k.rest || k.suck || k.who || !(k.vy > 0)) continue;
    for (const b of B) { if (!ouvert(b) || Math.abs(k.d - b.d) > 0.9) continue; const C = CONT[b.kind], rim = b.y - C.bord * b.s;
      if (Math.abs(k.x - b.x) < C.w * b.s && k.y >= rim && k.y - k.vy * dt < rim + 2) { k.dans = b; k.rest = true; k.vx = k.vy = 0; k.ddx = (k.x - b.x) / b.s; k.ddy = rnd(0, 6); k.t0 = Wd.t; break; } }
  }
  // 3. secoué fort, ou lancé : tout sort
  for (const b of B) {
    if (b.held) { const s = sOf(b.d), hv = (b.hx - (b.phx ?? b.hx)) / Math.max(dt, 1 / 120); b.phx = b.hx; const v = Math.abs(hv);
      // (secouer, c'est aller-retour : deux changements de sens rapides ; l'emporter vite, même très vite, ne vide rien)
      if (v > s * 5) { if (b.shk && sgn(hv) !== sgn(b.shk)) { b.shkN = (Wd.t - (b.shkT ?? -9) < 0.6 ? b.shkN || 0 : 0) + 1; b.shkT = Wd.t; if (b.shkN >= 2) { vide(b, hv, 1); b.shkN = 0; } } b.shk = hv; } }
    else { b.shk = 0; b.phx = null; }
    if (b.fall && !b.videT) { b.videT = 1; vide(b, b.vx, 0.8); } if (!b.fall) b.videT = 0;
  }
  // 4. l'objet lourd qui écrase
  // (lâché par la main au-dessus d'un contenant, à l'écran : il tombe dessus, même s'il était tenu plus loin ou plus près)
  for (const h of Wd.props) {
    if (!LOURDS(h) || !h.fall || h.held || !(Wd.t - (h.lache ?? -9) < 4) || !(h.lift > 0)) continue;
    const b = B.find(b => !b.held && !b.fall && Math.abs(b.d - h.d) >= 0.22 && Math.abs(h.x - b.x) < b.hull.w * b.s * 0.4 + h.hull.w * h.s * 0.3 && h.y < b.y - b.hull.h * b.s);
    if (b) { h.d = h.dT = b.d; h.lift = Math.max(0, floorAt(b.d) - h.y); }
  }
  for (const b of B) {
    if (b.held || b.fall || b.sqT != null || b.kind === 'bassin') continue; const w = b.hull.w * b.s * 0.5;
    const L = Wd.props.find(h => h !== b && LOURDS(h) && !h.held && Math.abs(h.d - b.d) < 0.22 && Math.abs(h.x - b.x) < w * 0.8 + h.hull.w * h.s * 0.3 && (h.fall ? h.lift < b.hull.h * b.s : true) && h.down && Wd.t - h.down < 60);
    const was = b.sq || 0;
    if (L) { if (was < 0.5) { vide(b, sgn(b.x - L.x) * sOf(b.d) * 2, 1.2); Ch() && Ch().sortir(b); word(pick(['CRAC', 'scrountch', 'crouic']), b.x, b.y - 30, 24); dust(b.x, floorAt(b.d), w, 1); } b.sq = Math.min(0.85, was + dt * 8); }
    else if (was > 0) b.sq = Math.max(0, was - dt * 1.5);
  }
  // 5. la pelote qui roule rebondit sur plus haut qu'elle
  for (const it of Wd.props) {
    if (!it.r || it.held || it.fall || it.on || !it.vx || Wd.t - (it.rebT ?? -9) < 0.3) continue; const s = sOf(it.d), R = it.r * s * (it.big || 1);
    const b = Wd.props.find(b => b !== it && !b.r && !b.held && !b.fall && !b.mur && !b.run && b.a > 0.5 && Math.abs(b.d - it.d) < 0.2 && b.hull.h * b.s > R * 1.6 && sgn(b.x - it.x) === sgn(it.vx) && Math.abs(b.x - it.x) < b.hull.w * b.s * 0.5 + R);
    if (!b) continue; it.rebT = Wd.t; it.vx = -it.vx * 0.45; b.wob = Wd.t; b.wobA = 0.15; if (Math.random() < 0.4) word(pick(['toc', 'poc']), it.x, it.y - R * 2 - 8, 13);
  }
});
const Ch = () => window.Chocs;

return { CONT, vide, contenu };
})();
