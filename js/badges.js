/* Les badges des hauts faits, un dessin par haut fait (27/09, Mathieu : « faut des badges pour chaque haut fait »).
   Même trait que les chats : un seul contour, les yeux en gros ovales noirs avec deux reflets, presque pas de détails.
   Le cadre dépend du rang : rond (bronze), rosette festonnée (argent), soleil à rayons (or), hexagone (secret).
   Dessiné dans une boîte 120 × 140 ; le médaillon clair est centré en (60, 58), rayon 34. */
window.Badges = (() => {
const f = n => +n.toFixed(1);
const PAPIER = 'style="fill:var(--bp-hi,#eeeeea)"';
const EAU = '#7cc0e6', ROSE = '#f3a0b4', CAISSE = '#d9ab70', CROQ = '#c98b4e', JAUNE = '#f5d66b';

/* ——— les petits morceaux ——— */
// une tête de chat : un contour, les oreilles juste leur bord
const tete = (x, y, r, fill) => {
  const p = (a, b) => f(x + a * r) + ' ' + f(y + b * r);
  return `<path d="M${p(-0.95, 0.1)} Q${p(-1, -0.55)} ${p(-0.8, -0.72)} L${p(-0.72, -1.25)} L${p(-0.3, -0.9)} Q${p(0, -0.98)} ${p(0.3, -0.9)} L${p(0.72, -1.25)} L${p(0.8, -0.72)} Q${p(1, -0.55)} ${p(0.95, 0.1)} Q${p(0.9, 0.86)} ${p(0, 0.86)} Q${p(-0.9, 0.86)} ${p(-0.95, 0.1)}Z" ${fill ? `fill="${fill}"` : PAPIER}/>`;
};
const yeux = (x, y, r) => [-1, 1].map(s => { const ex = f(x + s * 0.38 * r), ey = f(y + 0.02 * r);
  return `<ellipse cx="${ex}" cy="${ey}" rx="${f(0.16 * r)}" ry="${f(0.23 * r)}" fill="currentColor" stroke="none"/><circle cx="${f(ex - 0.05 * r)}" cy="${f(ey - 0.09 * r)}" r="${f(0.065 * r)}" fill="#fff" stroke="none"/><circle cx="${f(ex + 0.06 * r)}" cy="${f(ey + 0.08 * r)}" r="${f(0.03 * r)}" fill="#fff" stroke="none"/>`; }).join('');
const ferme = (x, y, r) => [-1, 1].map(s => `<path d="M${f(x + s * 0.38 * r - 0.16 * r)} ${f(y)} q${f(0.16 * r)} ${f(0.16 * r)} ${f(0.32 * r)} 0"/>`).join('');
const bouche = (x, y, r) => `<path d="M${f(x - 0.16 * r)} ${f(y + 0.36 * r)} q${f(0.08 * r)} ${f(0.12 * r)} ${f(0.16 * r)} 0 q${f(0.08 * r)} ${f(0.12 * r)} ${f(0.16 * r)} 0" stroke-width="1.6"/>`;
const joues = (x, y, r) => [-1, 1].map(s => `<ellipse cx="${f(x + s * 0.62 * r)}" cy="${f(y + 0.3 * r)}" rx="${f(0.13 * r)}" ry="${f(0.08 * r)}" fill="${ROSE}" stroke="none" opacity=".8"/>`).join('');
const minou = (x, y, r, fill) => tete(x, y, r, fill) + yeux(x, y, r) + bouche(x, y, r);
const coeur = (x, y, s, fill) => `<path d="M${f(x)} ${f(y + 0.4 * s)} C${f(x - 0.65 * s)} ${f(y)} ${f(x - 0.45 * s)} ${f(y - 0.55 * s)} ${f(x)} ${f(y - 0.22 * s)} C${f(x + 0.45 * s)} ${f(y - 0.55 * s)} ${f(x + 0.65 * s)} ${f(y)} ${f(x)} ${f(y + 0.4 * s)}Z" fill="${fill || ROSE}"/>`;
const eclat = (x, y, r, fill) => `<path d="M${f(x)} ${f(y - r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y + r)} Q${f(x)} ${f(y)} ${f(x - r)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y - r)}Z" fill="${fill || JAUNE}" stroke-width="1.4"/>`;
const etoile = (x, y, r, fill) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + f(x + Math.cos(a) * q) + ' ' + f(y + Math.sin(a) * q); } return `<path d="${d}Z" fill="${fill || JAUNE}"/>`; };
const goutte = (x, y, s, fill) => `<path d="M${f(x)} ${f(y - s)} Q${f(x + s * 0.8)} ${f(y + s * 0.2)} ${f(x)} ${f(y + s * 0.7)} Q${f(x - s * 0.8)} ${f(y + s * 0.2)} ${f(x)} ${f(y - s)}Z" fill="${fill || EAU}" stroke-width="1.4"/>`;
const patte = (x, y, s, fill) => `<g fill="${fill || 'currentColor'}" stroke="none"><ellipse cx="${f(x)}" cy="${f(y + 0.22 * s)}" rx="${f(0.46 * s)}" ry="${f(0.38 * s)}"/>${[[-0.55, -0.28], [-0.2, -0.58], [0.2, -0.58], [0.55, -0.28]].map(([a, b]) => `<circle cx="${f(x + a * s)}" cy="${f(y + b * s)}" r="${f(0.18 * s)}"/>`).join('')}</g>`;
const nuage = (x, y, s, fill) => `<path d="M${f(x - s)} ${f(y + 0.4 * s)} A${f(0.42 * s)} ${f(0.42 * s)} 0 0 1 ${f(x - 0.5 * s)} ${f(y - 0.2 * s)} A${f(0.55 * s)} ${f(0.55 * s)} 0 0 1 ${f(x + 0.45 * s)} ${f(y - 0.25 * s)} A${f(0.4 * s)} ${f(0.4 * s)} 0 0 1 ${f(x + s)} ${f(y + 0.4 * s)}Z" ${fill ? `fill="${fill}"` : PAPIER}/>`;
const vague = (x0, x1, y, a, fill) => { let d = `M${x0} ${y}`; const n = Math.round((x1 - x0) / 12), w = (x1 - x0) / n; for (let i = 0; i < n; i++) d += ` q${f(w / 2)} ${-a} ${f(w)} 0`; return fill ? `<path d="${d} L${x1} ${y + 16} Q${(x0 + x1) / 2} ${y + 22} ${x0} ${y + 16}Z" fill="${fill}"/>` : `<path d="${d}"/>`; };
const croissant = (x, y1, y2, fill) => { const c = y2 - y1; return `<path d="M${x} ${y1} A${f(c * 0.52)} ${f(c * 0.52)} 0 1 0 ${x} ${y2} A${f(c * 0.6)} ${f(c * 0.6)} 0 0 1 ${x} ${y1}Z" fill="${fill || JAUNE}"/>`; };
const zz = (x, y, s) => `<path d="M${x} ${y} h${s} l${-s} ${f(s * 1.1)} h${s}" stroke-width="1.8"/>`;
const caisse = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${CAISSE}"/><path d="M${x} ${y} L${x + w} ${y + h} M${x + w} ${y} L${x} ${y + h}" stroke-width="1.2" opacity=".6"/>`;
let nClip = 0;

/* ——— un dessin par haut fait (A = la couleur du rang) ——— */
const D = {
  bonjour: A => eclat(38, 36, 5) + tete(58, 64, 20) + yeux(58, 64, 20) + bouche(58, 64, 20) + joues(58, 64, 20) + coeur(82, 36, 13),
  lanceur: A => `<path d="M30 86 Q36 46 66 42" stroke-dasharray="3 5" stroke-width="1.8"/><path d="M52 34 l-12 -2 M50 45 l-14 0 M54 55 l-11 4" stroke-width="1.8"/>`
    + `<g transform="rotate(24 74 42)">${minou(74, 42, 13)}</g>` + eclat(34, 38, 5) + eclat(86, 72, 4),
  plouf: A => tete(60, 58, 17) + yeux(60, 58, 17) + vague(28, 92, 68, 5, EAU) + goutte(36, 48, 5) + goutte(84, 46, 5) + goutte(42, 34, 4) + goutte(80, 32, 4),
  curieux: A => `<path d="M60 40 Q46 33 32 38 L32 80 Q46 75 60 82 Q74 75 88 80 L88 38 Q74 33 60 40Z" ${PAPIER}/><path d="M60 40 L60 82 M37 49 q9 -3 18 0 M37 57 q9 -3 18 0 M37 65 q9 -3 18 0" stroke-width="1.6"/>`
    + patte(74, 57, 12) + `<g transform="rotate(-38 76 80)"><rect x="62" y="76" width="24" height="7" fill="${A}"/><path d="M86 76 L93 79.5 L86 83Z" ${PAPIER}/></g>`,
  service: A => `<g fill="${CROQ}" stroke-width="1.4">${[[42, 62], [50, 58], [58, 55], [66, 57], [74, 60], [80, 63], [46, 64], [54, 62], [62, 61], [70, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join('')}</g>`
    + `<path d="M32 64 L88 64 Q86 86 60 86 Q34 86 32 64Z" fill="${A}"/><path d="M40 72 q6 3 12 0" stroke-width="1.6" opacity=".7"/>` + eclat(84, 38, 7) + eclat(38, 40, 4),
  colis: A => caisse(36, 56, 48, 30) + `<rect x="57" y="56" width="6" height="30" fill="${A}"/><rect x="38" y="46" width="30" height="10" fill="#8a6a48"/>` + yeux(50, 51, 14)
    + `<g transform="rotate(-18 88 54)"><rect x="32" y="46" width="56" height="9" fill="${CAISSE}"/><rect x="57" y="46" width="6" height="9" fill="${A}"/><path d="M60 46 q-13 -13 -15 -2 q5 5 15 2 q13 -13 15 -2 q-5 5 -15 2" fill="${A}"/></g>` + eclat(30, 36, 4),
  bande: A => minou(38, 66, 13) + `<path d="M33 55 l2 4 M38 54 v4 M43 55 l-2 4" stroke-width="1.6"/>` + minou(82, 66, 13, A) + minou(60, 60, 16),
  ami: A => tete(42, 66, 15) + ferme(42, 66, 15) + bouche(42, 66, 15) + joues(42, 66, 15) + tete(78, 66, 15, A) + ferme(78, 66, 15) + bouche(78, 66, 15) + coeur(60, 38, 16),
  chatlogue: A => [[35, 32], [61, 32], [35, 59], [61, 59]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="24" height="25" rx="3" ${i === 1 ? `fill="${A}"` : PAPIER}/>` + minou(x + 12, y + 15, 7.5, i === 2 ? A : null)).join(''),
  aquaphile: A => `<path d="M34 58 Q55 36 76 58 Q55 80 34 58Z" fill="${EAU}"/><path d="M76 58 L89 47 L89 69Z" fill="${EAU}"/><path d="M60 46 q4 12 0 24" stroke-width="1.6"/><circle cx="45" cy="55" r="2.6" fill="currentColor" stroke="none"/>`
    + `<circle cx="40" cy="38" r="3.5"/><circle cx="47" cy="30" r="2.5"/><circle cx="36" cy="28" r="2"/>` + vague(34, 86, 84, 3),
  arc: A => `<g fill="none" stroke-width="5.5">${[['#f07c7c', 28], [JAUNE, 22], [EAU, 16]].map(([c, r]) => `<path d="M${60 - r} 76 A${r} ${r} 0 0 1 ${60 + r} 76" stroke="${c}"/>`).join('')}</g><path d="M26 76 A34 34 0 0 1 94 76" stroke-dasharray="3 5" stroke-width="1.4"/>`
    + nuage(34, 76, 12) + nuage(86, 76, 12) + goutte(86, 38, 4) + goutte(34, 38, 4),
  boutons: A => [42, 58, 74].map((y, i) => `<rect x="36" y="${y - 7}" width="40" height="14" rx="7" ${i === 1 ? `fill="${A}"` : PAPIER}/><circle cx="45" cy="${y}" r="3" fill="currentColor" stroke="none"/>`).join('')
    + patte(82, 62, 13) + `<path d="M72 44 l4 -4 M80 42 v-6 M86 45 l4 -4" stroke-width="1.8"/>`,
  observateur: A => `<path d="M66 66 L84 84" stroke-width="7"/><circle cx="54" cy="52" r="19" ${PAPIER} stroke-width="3"/><path d="M41 52 Q54 39 67 52 Q54 65 41 52Z" fill="${A}"/><ellipse cx="54" cy="52" rx="2.6" ry="8" fill="currentColor" stroke="none"/><circle cx="57" cy="48" r="1.6" fill="#fff" stroke="none"/><path d="M42 40 q5 -5 11 -6" stroke-width="1.6" opacity=".6"/>`,
  nuit: A => croissant(60, 30, 86) + tete(56, 62, 10) + ferme(56, 62, 10) + zz(72, 36, 6) + zz(82, 28, 4) + eclat(84, 60, 4, '#fff') + eclat(78, 78, 3, '#fff'),
  masseur: A => `<path d="M34 84 Q32 62 54 62 L70 62 Q90 62 88 84Z" ${PAPIER}/><path d="M88 80 q6 -2 4 -10" stroke-width="2"/>` + tete(46, 58, 13) + ferme(46, 58, 13) + joues(46, 58, 13)
    + `<path d="M58 50 q9 -6 18 0 M62 42 q7 -5 14 0" stroke-width="1.8"/>` + coeur(84, 38, 9) + coeur(36, 36, 7),
  cheznous: A => `<path d="M32 58 L60 32 L88 58" stroke-width="3"/><path d="M36 56 L60 34 L84 56 L84 88 L36 88Z" ${PAPIER}/><path d="M74 44 V32 H80 V50" fill="${A}"/>`
    + `<rect x="46" y="58" width="28" height="24" fill="${A}"/>` + minou(60, 74, 9) + `<path d="M46 70 H74 M60 58 V64" stroke-width="1.4" opacity=".5"/>`,
  fidele: A => `<rect x="33" y="36" width="54" height="50" rx="3" ${PAPIER}/><rect x="33" y="36" width="54" height="11" fill="${A}"/><path d="M44 31 V41 M76 31 V41" stroke-width="3"/>`
    + [[44, 60], [60, 60], [76, 60], [44, 76], [60, 76]].map(([x, y]) => patte(x, y, 8)).join('') + coeur(76, 75, 11),
  raretes: A => `<path d="M60 30 L84 48 L60 88 L36 48Z" fill="#a9dcec"/><path d="M36 48 H84 M48 48 L60 30 L72 48 M48 48 L60 88 L72 48" stroke-width="1.4"/><path d="M50 36 l-4 -9 l9 5 M70 36 l4 -9 l-9 5" stroke-width="2"/>`
    + yeux(60, 58, 12) + eclat(33, 34, 6) + eclat(87, 72, 5) + eclat(86, 32, 4),
  moitie: A => { const id = 'hfm' + nClip++; return `<clipPath id="${id}"><rect x="0" y="0" width="60" height="140"/></clipPath>` + `<g stroke-dasharray="3 4">${tete(60, 62, 22)}</g>`
    + `<g clip-path="url(#${id})">${tete(60, 62, 22, A)}${yeux(60, 62, 22)}</g>` + `<path d="M60 36 V86" stroke-width="1.4"/>` + `<g opacity=".35">${yeux(60, 62, 22)}</g>`; },
  carnet: A => `<g transform="translate(0 4)"><path d="M53 31 L57 21 L63 31 M67 31 L73 21 L77 31" ${PAPIER}/><rect x="38" y="30" width="46" height="56" rx="3" fill="${A}"/><rect x="38" y="30" width="8" height="56" fill="currentColor" opacity=".25" stroke="none"/>`
    + `<path d="M72 86 v8 l3 -3 l3 3 v-8" fill="#f07c7c"/>` + etoile(65, 56, 13, '#fff') + '</g>' + eclat(30, 42, 5) + eclat(90, 80, 4),
  ethologue: A => `<path d="M42 44 L50 34 L70 34 L78 44" stroke-width="2"/><rect x="52" y="44" width="16" height="10" fill="${A}"/><circle cx="46" cy="56" r="13" fill="${A}"/><circle cx="74" cy="56" r="13" fill="${A}"/>`
    + `<circle cx="46" cy="56" r="8" ${PAPIER}/><circle cx="74" cy="56" r="8" ${PAPIER}/><path d="M42 53 q2 -3 5 -3 M70 53 q2 -3 5 -3" stroke-width="1.6"/>` + [[36, 84], [48, 78], [60, 84], [72, 78], [84, 84]].map(([x, y]) => patte(x, y, 6)).join(''),
  heure: A => `<rect x="37" y="27" width="46" height="6" rx="2" fill="${A}"/><rect x="37" y="83" width="46" height="6" rx="2" fill="${A}"/><path d="M42 33 Q42 52 57 58 Q42 64 42 83 H78 Q78 64 63 58 Q78 52 78 33Z" ${PAPIER}/>`
    + `<path d="M48 42 H72 L60 54Z" fill="${CROQ}" stroke-width="1.4"/><path d="M60 58 V73" stroke-dasharray="2 3" stroke-width="1.4"/><path d="M45 83 Q60 70 75 83Z" fill="${CROQ}" stroke-width="1.4"/>`
    + `<path d="M53 77 l2 -5 l3 4 M63 76 l3 -4 l2 5" stroke-width="1.4"/>` + ferme(60, 79, 6),
  foule: A => [[7, 44, [34, 47, 60, 73, 86]], [8.5, 60, [40, 53.5, 67, 80.5]], [10, 77, [44, 60, 76]]].map(([r, y, X]) => X.map((x, i) => minou(x, y, r, (i + y) % 3 === 0 ? A : null)).join('')).join(''),
  chaine: A => `<g transform="translate(2 5) rotate(12 48 86)">${caisse(38, 70, 22, 16)}${caisse(40, 54, 20, 16)}${caisse(42, 38, 17, 16)}${minou(51, 31, 7)}</g>`
    + `<path d="M81 26 L70 50 L78 50 L68 74 L91 44 L82 44 L88 26Z" fill="${A}"/>` + vague(60, 92, 82, 4, EAU) + goutte(66, 72, 4) + goutte(88, 70, 3),
  crepe: A => patte(60, 40, 22, A) + `<path d="M26 77 Q26 65 44 66 L76 66 Q94 65 94 77 Q94 86 60 86 Q26 86 26 77Z" ${PAPIER}/><path d="M38 66 l3 -5 l4 5 M75 66 l4 -5 l3 5" stroke-width="1.8"/>`
    + `<path d="M48 72 l6 6 M54 72 l-6 6 M66 72 l6 6 M72 72 l-6 6" stroke-width="1.8"/><path d="M58 81 q2 4 4 0" fill="${ROSE}" stroke-width="1.4"/>` + eclat(32, 56, 4) + eclat(88, 56, 4),
  rancune: A => nuage(60, 36, 17, '#b9bdc8') + `<path d="M64 42 L58 50 L63 50 L57 58" stroke-width="1.8"/>` + tete(60, 70, 18) + yeux(60, 71, 18)
    + `<path d="M43 62 L55 67 M77 62 L65 67" stroke-width="2.6"/><path d="M54 84 q6 -5 12 0" stroke-width="1.8"/>`,
  voleur: A => tete(56, 64, 20) + `<path d="M34 60 Q56 51 78 60 L78 69 Q56 62 34 69Z" fill="currentColor"/><path d="M34 62 l-6 -5 M34 66 l-7 2" stroke-width="2.4"/>`
    + [-1, 1].map(s => `<ellipse cx="${56 + s * 8}" cy="63" rx="4.2" ry="3.2" fill="#fff" stroke="none"/><circle cx="${56 + s * 8 + 1.5}" cy="63" r="1.8" fill="currentColor" stroke="none"/>`).join('')
    + bouche(56, 64, 20) + `<circle cx="82" cy="80" r="5.5" fill="${CROQ}"/><path d="M86 34 v12 M86 34 l6 3" stroke-width="1.8"/><ellipse cx="83.5" cy="46" rx="3" ry="2.3" fill="currentColor" stroke="none"/>`,
  somnambule: A => tete(60, 66, 19) + ferme(60, 66, 19) + bouche(60, 66, 19) + `<path d="M40 54 Q48 26 74 27 Q88 30 90 44 Q82 36 74 38 Q70 44 80 52 Q60 44 40 54Z" fill="${A}"/><circle cx="90" cy="46" r="4.5" ${PAPIER}/>`
    + zz(28, 34, 7) + zz(38, 26, 4.5),
  lune: A => croissant(74, 28, 62) + `<path d="M40 96 Q40 76 48 62 L60 64 Q54 78 56 96Z" ${PAPIER}/>` + patte(54, 58, 14) + eclat(34, 36, 5, '#fff') + eclat(46, 28, 3, '#fff') + eclat(88, 72, 4, '#fff'),
  papillon: A => [-1, 1].map(s => `<path d="M${60 + s * 2} 52 Q${60 + s * 26} 26 ${60 + s * 31} 46 Q${60 + s * 30} 62 ${60 + s * 2} 58Z" fill="${A}"/><path d="M${60 + s * 2} 60 Q${60 + s * 22} 68 ${60 + s * 18} 82 Q${60 + s * 8} 84 ${60 + s * 2} 64Z" fill="#d9d0e8"/><circle cx="${60 + s * 18}" cy="47" r="3.5" ${PAPIER}/>`
    + `<path d="M${60 + s * 1.5} 44 Q${60 + s * 6} 34 ${60 + s * 14} 31" stroke-width="1.6"/><path d="M${60 + s * 5} 37 l${s * 3} -3 M${60 + s * 9} 33.5 l${s * 2} -3.5" stroke-width="1.2"/>`).join('')
    + `<ellipse cx="60" cy="61" rx="4" ry="15" fill="currentColor"/>`,
  pouf: A => { let d = ''; const n = 18; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, x = 60 + Math.cos(a) * 22, y = 64 + Math.sin(a) * 21;
      if (!i) { d = `M${f(x)} ${f(y)}`; continue; } const am = (i - 0.5) / n * Math.PI * 2; d += ` Q${f(60 + Math.cos(am) * 29)} ${f(64 + Math.sin(am) * 28)} ${f(x)} ${f(y)}`; }
    return `<path d="M42 46 L40 30 L52 40 M78 46 L80 30 L68 40" ${PAPIER}/><path d="${d}Z" ${PAPIER}/>` + yeux(60, 62, 18) + bouche(60, 62, 18) + joues(60, 62, 18) + goutte(30, 34, 4) + goutte(90, 36, 4) + eclat(88, 84, 5) + eclat(32, 84, 4); },
};

/* ——— les cadres, un par rang ——— */
function cadre(rang, fill, trait) {
  const rubans = `<path d="M42 92 L30 134 L46 124 L56 138 L62 98" fill="${fill}" ${trait}/><path d="M78 92 L90 134 L74 124 L64 138 L58 98" fill="${fill}" opacity=".8" ${trait}/>`;
  if (rang === 'argent') { let d = ''; const n = 16; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, am = (i - 0.5) / n * Math.PI * 2, x = 60 + Math.cos(a) * 42, y = 58 + Math.sin(a) * 42;
      d += i ? ` Q${f(60 + Math.cos(am) * 50)} ${f(58 + Math.sin(am) * 50)} ${f(x)} ${f(y)}` : `M${f(x)} ${f(y)}`; } return rubans + `<path d="${d}Z" fill="${fill}" ${trait}/>`; }
  if (rang === 'or') { let d = ''; const n = 24; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2, r = i % 2 ? 43 : 52; d += (i ? 'L' : 'M') + f(60 + Math.cos(a) * r) + ' ' + f(58 + Math.sin(a) * r); }
    return rubans + `<path d="${d}Z" fill="${fill}" ${trait}/><circle cx="60" cy="58" r="41" fill="${fill}" ${trait}/>`; }
  if (rang === 'secret') { let d = ''; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; d += (i ? 'L' : 'M') + f(60 + Math.cos(a) * 49) + ' ' + f(58 + Math.sin(a) * 49); }
    return `<path d="M50 96 L44 134 L60 126 L76 134 L70 96" fill="${fill}" ${trait}/><path d="${d}Z" fill="${fill}" stroke-linejoin="round" ${trait}/>`; }
  return rubans + `<circle cx="60" cy="58" r="44" fill="${fill}" ${trait}/>`;
}

/* le badge complet : cadre du rang, médaillon clair, le dessin ; gris et pâle tant qu'il n'est pas gagné ; « ? » pour un secret pas encore trouvé */
function badge(h, got, taille, c) {
  const id = 'hfb' + nClip++, s = taille || 120, cache = !got && h.rang === 'secret', col = got ? c : '150,150,150', A = got ? `rgb(${c})` : '#bbb';
  const trait = `stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"${cache ? ' stroke-dasharray="7 6"' : ''}`;
  const dessin = cache ? `<text x="60" y="60" text-anchor="middle" dominant-baseline="central" font-size="40" style="font-family:var(--hand),serif" fill="currentColor" stroke="none" opacity=".5">?</text>` : (D[h.id] ? D[h.id](A) : '');
  return `<svg class="hf-badge" viewBox="0 0 120 140" width="${s}" height="${f(s * 140 / 120)}" aria-hidden="true">
    ${cadre(h.rang, `rgba(${col},${got ? 0.92 : 0.2})`, trait)}
    <circle cx="60" cy="58" r="35" ${PAPIER} stroke="currentColor" stroke-width="2" ${got ? '' : 'stroke-dasharray="3 5"'}/>
    <clipPath id="${id}"><circle cx="60" cy="58" r="34"/></clipPath>
    <g clip-path="url(#${id})" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${got ? '' : ' opacity=".38" style="filter:grayscale(1)"'}>${dessin}</g>
    ${got ? '<path d="M28 34 q8 -14 22 -18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>' : ''}
  </svg>`;
}

return { badge, D };
})();
