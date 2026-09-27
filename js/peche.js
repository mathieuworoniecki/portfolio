/* Ce qui flotte dans le bassin, et la pêche (27/09, l'audit : « des heures à découvrir toutes les combinaisons »).
   - Une croquette qui tombe dans l'eau flotte (elle dérive, elle danse sur les ronds) ; une lettre du titre aussi.
   - Un chat qui aime l'eau (pas le grincheux, pas le bleu) vient au bord, guette, et d'un coup de patte la repêche :
     la croquette vole jusqu'au sol (et il la mange), la lettre retombe sur la berge (et remonte au titre plus tard). */
window.Peche = (() => {
if (!window.Chats || !Chats.K || !window.Bassin) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, say, interrupt, pose, go, fn, inView, floorAt, later } = K;
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.1, rot: rnd(-0.2, 0.2), size: size || 16 });
const dex = id => { if (window.Dex) Dex.vu(id); };
const B = () => Bassin.bassins().filter(b => !b.held && !b.fall && b.a > 0.5);
const S2 = b => Bassin.surface(b);

/* ——— les croquettes ——— */
H.post.push(() => {
  const L = B(); if (!L.length) return;
  for (const k of Wd.kib) {
    if (k.gone || Wd.t < k.t0) continue;
    if (k.suck && k.nage) { k.nage = null; continue; }
    if (k.nage) {
      const b = k.nage, S = S2(b); if (b.held || b.fall || !Bassin.bassins().includes(b)) { k.nage = null; k.who = null; k.rest = false; k.vy = 0; continue; }
      k.u += Math.sin(Wd.t * 0.7 + k.ph) * 0.0015; k.u = Math.max(-0.8, Math.min(0.8, k.u));
      k.x = S.x + k.u * S.rx; k.y = S.y + k.v * S.ry * 0.6 + Math.sin(Wd.t * 2.5 + k.ph) * 1.5; k.t0 = Math.max(k.t0, Wd.t - 30);   // (elle ne vieillit pas dans l'eau)
      continue;
    }
    if (k.rest || k.vy <= 0 || k.suck || Wd.t - (k.pecheT || -9) < 1.5) continue;
    for (const b of L) {
      if (Math.abs(k.d - b.d) > 0.45 && !k.swept) continue;
      const S = S2(b); if (Math.abs(k.x - S.x) > S.rx * 0.85 || k.y < S.y - 4 || k.y > S.y + S.ry) continue;
      k.nage = b; k.who = b; k.rest = true; k.vx = k.vy = 0; k.u = (k.x - S.x) / S.rx; k.v = rnd(-0.6, 0.6); k.ph = rnd(0, 6);
      Bassin.rond(b, k.x, S.y, 0.6); if (Math.random() < 0.3) word(pick(['plic', 'ploc']), k.x, S.y - 16, 13);
      break;
    }
  }
});

/* ——— les lettres du titre ——— */
H.pre.push(() => {
  const V = window.Vie; if (!V || !V.LETTERS) return; const Ls = V.LETTERS(); if (!Ls) return; const L0 = B(); const r = V.RECT();
  const lx = L => r.left + L.cx + L.dx, ly = L => r.top + L.cy + L.dy;
  for (const L of Ls) {
    if (L.st === 'nage') {
      const b = L.nage; if (!Bassin.bassins().includes(b) || b.held || b.fall || Wd.t - L.t > L.life) { L.st = 'back'; L.t = Wd.t; L.from = [L.dx, L.dy, L.rot % (Math.PI * 2)]; L.nage = null; continue; }
      const S = S2(b), tx = S.x + L.u * S.rx + Math.sin(Wd.t * 0.5 + L.ph) * S.rx * 0.12, ty = S.y + Math.sin(Wd.t * 2 + L.ph) * 2 - (L.y1 - L.y0) * 0.25;
      L.dx += tx - lx(L); L.dy += ty - ly(L); L.rot = Math.sin(Wd.t * 1.3 + L.ph) * 0.25;
      continue;
    }
    const py = L.py; L.py = ly(L); if (L.st !== 'fall' || L.vy <= 0 || Wd.t - (L.pecheT || -9) < 1.5) continue;
    for (const b of L0) {
      const S = S2(b), x = lx(L), y = ly(L); if (Math.abs(x - S.x) > S.rx * 0.85 || y < S.y - 6 || (py != null && py > S.y + S.ry * 2)) continue;   // (elle a traversé la surface pendant cette image)
      L.st = 'nage'; L.nage = b; L.t = Wd.t; L.life = rnd(12, 20); L.u = (x - S.x) / S.rx; L.ph = rnd(0, 6); L.vx = L.vy = L.vr = 0;
      Bassin.gerbe(b, x, S.y, 8, 0.8); Bassin.rond(b, x, S.y, 1.4); word(pick(['plouf', 'ploc']), x, S.y - 24, 16); dex('lettreplouf');
      break;
    }
  }
});

/* ——— la pêche ——— */
const eauOK = c => (Bassin.EAU[c.breed] ?? 1) !== 0 && !c.rare;
function flottants() {
  const out = []; for (const k of Wd.kib) if (k.nage && !k.gone) out.push({ k, x: k.x, b: k.nage });
  const V = window.Vie, Ls = V && V.LETTERS && V.LETTERS(); if (Ls) { const r = V.RECT(); for (const L of Ls) if (L.st === 'nage') out.push({ L, x: r.left + L.cx + L.dx, b: L.nage }); }
  return out;
}
H.think.push((c, add) => {
  if (!eauOK(c)) return; const F = flottants(); if (!F.length) return;
  add(1.5 + c.ch.joue * 0.8 + (Wd.t - (c.ate ?? c.born) > 30 ? 1.5 : 0), () => {
    const f = F.sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0], b = f.b, S = S2(b);
    const side = f.x < S.x ? -1 : 1, bord = inView(S.x + side * (S.rx + sc(c) * 0.35));
    c.q.push(go(bord, { d: Math.max(0, b.d - 0.05), face: -side, g: 'trot' }), pose('affut', rnd(1, 2.2), { fx: c => say(c, pick(['…', 'je le vois', 'hmm'])) }),
      pose('tape', 0.6, { face: -side, fx: c => later(0.2, () => repeche(c, b, side)) }),
      pose('assis', 0.8), fn(K.free));
  });
});
function repeche(c, b, side) {
  if (!Wd.cats.includes(c)) return; const S = S2(b), F = flottants().filter(f => f.b === b);
  const f = F.sort((a, z) => Math.abs(a.x - c.x) - Math.abs(z.x - c.x))[0];
  // trop loin : elle échappe à la patte (on réessaiera)
  if (!f || Math.abs(f.x - c.x) > S.rx * 1.3 + sc(c) || Math.random() < 0.25) { word('splash', c.x - side * sc(c) * 0.4, S.y - 10, 15); Bassin.gerbe(b, c.x - side * sc(c) * 0.4, S.y, 5, 0.6); c.wet = Wd.t; say(c, pick(['raté…', 'grr', 'presque !'])); return; }
  Bassin.gerbe(b, f.x, S.y, 6, 0.7);
  if (f.k) {
    const k = f.k, tx = c.x + side * sc(c) * 0.6; k.nage = null; k.who = null; k.rest = false; k.d = c.d; k.pecheT = Wd.t; k.vy = -380 * Wd.s0 / 160; k.vx = (tx - k.x) / 0.9; k.t0 = Math.min(k.t0, Wd.t);
    say(c, pick(['à moi !', 'pêché !', 'hop !'])); dex('peche');
  } else {
    const L = f.L; L.st = 'fall'; L.nage = null; L.pecheT = Wd.t; L.vx = side * sc(c) * rnd(2, 3.5); L.vy = -sc(c) * rnd(3, 4.5); L.vr = side * rnd(3, 7); L.t = Wd.t;
    say(c, pick(['une lettre !', 'hop, dehors', 'c’est à qui ?'])); dex('pechelettre');
  }
}

return { flottants };
})();
