/* Le bâillement contagieux (vague 132 de l'audit, « les chats » : de très bien à inoubliable). De temps en temps, un chat calme bâille ;
   son voisin le plus proche le voit, et bâille à son tour, puis le suivant… une vague qui traverse la pièce, de proche en proche, avec
   un petit fil pointillé qui va d'une bouche à l'autre. Le dernier résiste (« je résiste… »), puis lâche le plus grand bâillement de tous
   et s'endort sur place. Jamais pendant un grand événement, jamais dans l'espace. */
window.Baillement = (() => {
if (!window.Chats || !Chats.K) return null;
const K = Chats.K, { Wd, H, rnd, pick, sgn, sc, say, free4, pose, later } = K;
const calme = c => c && free4(c) && !c.temp && !c.rare && !c.hidden && !c.held && !c.fall && Wd.cats.includes(c);
const dispo = c => c && c.hp && !c.gone && !c.temp && !c.rare && !c.hidden && !c.held && !c.fall && !c.jump && !c.fight && !c.pet && !(c.task && c.task.air) && Wd.cats.includes(c);
// une courte pose qui garde la suite ; un chat qui marche s'arrête pour bâiller
const reagit = (c, L) => { if (window.Liens && Liens.reagit && Liens.reagit(c, L)) return true; if (!dispo(c)) return false; K.interrupt(c); c.q = L; return true; };
const word = (text, x, y, size) => Wd.fx.push({ k: 'txt', text, x, y, t0: Wd.t, life: 1.4, rot: rnd(-0.15, 0.15), size: size || 16 });
const FIL = [];   // les fils pointillés d'une bouche à l'autre : { a, b, t0 }
let prochain = 40;

function bouche(c) { const s = sc(c); return [c.x + (c.face || 1) * s * 0.28, (c.y ?? 0) - s * 0.42]; }

function lance(c0) {
  const c = c0 || Wd.cats.filter(calme).sort(() => Math.random() - 0.5)[0]; if (!c) return false;
  const vus = new Set([c]); let n = 0;
  const etape = (c, prev) => {
    const suite = () => {
      const o = proche();
      if (!o || n >= 4) return; vus.add(o); n++; FIL.push({ a: c, b: o, t0: Wd.t }); later(rnd(0.7, 1.1), () => etape(o, c));
    };
    const face = c => prev ? (sgn(prev.x - c.x) || 1) : (c.face || 1);   // il se tourne vers celui qui lui a passé le bâillement
    const proche = () => Wd.cats.filter(o => !vus.has(o) && dispo(o) && !o.perch && Math.abs(o.x - c.x) < Math.max(Wd.W * 0.32, sc(c) * 4)).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0];
    if (n >= 1 && (n >= 4 || !proche())) {   // le dernier : il résiste, puis le plus grand bâillement, puis il s'endort là
      reagit(c, [pose('assis', 0.9, { face: face(c), fx: c => say(c, pick(['je résiste…', 'même pas…', 'nan…'])) }),
        pose('baille', 1.9, { fx: c => { const [x, y] = bouche(c); word('OUAAAAAH', x, y - sc(c) * 0.3, 26); if (window.Dex) Dex.vu('baillement'); } }),
        pose('dodo', rnd(5, 8), { zzz: 1 })]);
      return;
    }
    if (!reagit(c, [pose('baille', 1.3, { face: face(c), fx: c => { const [x, y] = bouche(c); word(pick(['aaah', 'ouaah', 'hmmmâ']), x, y - sc(c) * 0.25, 15 + n * 2); } }), pose('assis', rnd(0.6, 1.2))])) return;
    later(0.9, suite);
  };
  etape(c); return true;
}

// le fil pointillé : il part de la bouche qui bâille et va jusqu'à l'autre, en arc, puis se rembobine dans la seconde bouche
H.post.push(() => {
  if (!Wd.espace && !Wd.trou && !Wd.fuite && Wd.t > prochain && Wd.t - (Wd.grandEv ?? -1e9) > 20 && !matchMedia('(prefers-reduced-motion: reduce)').matches) { prochain = Wd.t + rnd(45, 90); lance(); }
});
const dessine = () => {
  if (!window.Chalk || Wd.a < 0.05) return;
  for (let i = FIL.length - 1; i >= 0; i--) { const f = FIL[i], u = (Wd.t - f.t0) / 1.3; if (u > 1 || !Wd.cats.includes(f.a) || !Wd.cats.includes(f.b)) { FIL.splice(i, 1); continue; }
    const [x0, y0] = bouche(f.a), [x1, y1] = bouche(f.b), h = Math.min(120, Math.abs(x1 - x0) * 0.35) + 20, ga = Math.min(1, u * 1.8), dr = Math.max(0, (u - 0.6) / 0.4), P = s => [x0 + (x1 - x0) * s, y0 + (y1 - y0) * s - Math.sin(Math.PI * s) * h];
    // des tirets qui avancent le long de l'arc (de la bouche qui bâille vers l'autre), puis l'arc se rembobine dans la seconde bouche
    for (let j = 0; j < 16; j++) { const s0 = (j + (Wd.t * 3) % 1) / 16, s1 = s0 + 0.035; if (s0 < dr || s1 > ga) continue; const [ax, ay] = P(s0), [bx, by] = P(s1); Chalk.line(ax, ay, bx, by, 1, { w: 2, a: 0.85 * Wd.a, seed: 70 + j }); } }
};
if (H.draw) H.draw.push(dessine);
return { lance, dessine, FIL };
})();
