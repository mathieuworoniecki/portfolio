"""Mathieu décalqué : de sa photo (de face) aux images que charge js/mathieu.js.

    python3 -m pip install mediapipe==0.10.14 opencv-python-headless scipy pillow
    python3 tools/mathieu/build.py <photo de face> [dossier de sortie : media/mathieu]

La photo n'est pas gardée dans le dépôt : seulement ce qu'on en tire.
  logo2.png    le logo du site (un nouveau nom à chaque version : /media est gardé un an en cache) : le même dessin, plus simple et plus épais (la tête seule compte)
  visage3d.png le même dessin, la tête seule et sans sa silhouette (pour la vraie 3D)
  visage.png   le dessin au trait (gris dans r,g,b ; la silhouette dans a : 1 la tête, 0,78 le buste) : la tête et le cou redessinés d'après la photo (trait.py) ; le buste redessiné en t-shirt (Patagonia) ; 1024 × 1024
  dos.png      le dos (quand il tourne) : les cheveux sur toute la tête, le dos du t-shirt ; même cadre
  relief.png   256 × 256, un point par sommet de la grille : r la profondeur, g la mâchoire (ce qui descend quand la bouche s'ouvre),
               b le côté de la ligne des lèvres (0 au-dessus, 255 en dessous) : le trou noir s'ouvre entre les deux
  relief.json  les mesures : l'échelle de la profondeur, la bouche (centre, largeur), le menton, la hauteur de la figure
Le relief : les 468 points du visage (MediaPipe Face Mesh, en 3D) ; autour, un ellipsoïde pour le crâne et les cheveux,
un cylindre pour le cou, un tonneau aplati pour le buste. Réglé pour les photos de Mathieu (cadre, cou, col : en px de la photo 1254 × 1254). """
import sys, json, pathlib
import numpy as np, cv2, mediapipe as mp
from scipy.interpolate import griddata
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); import trait

src = sys.argv[1]; out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else pathlib.Path(__file__).resolve().parents[2] / 'media' / 'mathieu'); out.mkdir(parents=True, exist_ok=True)
im = cv2.imread(src); H0, W0 = im.shape[:2]; rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
seg = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0).process(rgb).segmentation_mask
fm = mp.solutions.face_mesh.FaceMesh(static_image_mode=True, refine_landmarks=True, max_num_faces=1).process(rgb)
L = np.array([[p.x * W0, p.y * H0, -p.z * W0] for p in fm.multi_face_landmarks[0].landmark])   # z : vers nous
yy, xx = np.mgrid[0:H0, 0:W0].astype(np.float32)

# ——— le cadre de la figure (px de la photo) ———
X0, Y0, S = 110, 60, 1034          # un carré : des pointes des cheveux au bas du buste
N = 1024                           # le dessin ; la grille du relief : 256
CX = (L[234, 0] + L[454, 0]) / 2   # l'axe du visage (entre les oreilles)
NECK = (540, 752)                  # le cou, de gauche à droite, sous le menton
NL = dict(c=(646, 598), r=(118, 46))   # l'encolure du t-shirt : une ellipse autour du cou
neck_line = lambda x: NL['c'][1] + NL['r'][1] * np.sqrt(np.clip(1 - ((x - NL['c'][0]) / NL['r'][0]) ** 2, 0, 1))

# ——— les zones ———
person = cv2.GaussianBlur(seg, (0, 0), 1.5) > 0.5
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
fo = np.zeros((H0, W0), np.uint8); cv2.fillPoly(fo, [L[OVAL, :2].astype(np.int32)], 1); fo = cv2.dilate(fo, np.ones((15, 15), np.uint8)) > 0
# la tête : tout au-dessus de la bouche ; plus bas, le visage (son ovale) et le cou, jusqu'à l'encolure (pas le col de la chemise)
head = person & ((yy < L[13, 1]) | fo | ((xx > NECK[0]) & (xx < NECK[1]) & (yy < neck_line(xx))))
torso = person & ~head & (yy > 540)

# ——— la tête, redessinée au trait (tools/mathieu/trait.py) : des contours seulement, comme les chats et les objets ———
b = im
for _ in range(3): b = cv2.bilateralFilter(b, 9, 30, 7)
g = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
ink, hairm = trait.simple(im, person, L[:, :2], g, head)          # la version simple, d'un seul trait (trait.tete : le portrait détaillé)
edge = cv2.morphologyEx(head.astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((9, 9), np.uint8)) > 0

# ——— le t-shirt : sa silhouette (celle de la photo), l'encolure côtelée, les coutures, quelques plis, le logo Patagonia ———
shirt = Image.new('L', (W0, H0), 255); d = ImageDraw.Draw(shirt)
cnts, _ = cv2.findContours(torso.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
def smooth(c, k=9):
    P = c[:, 0, :].astype(np.float32); P = np.stack([np.convolve(np.r_[P[-k:, i], P[:, i], P[:k, i]], np.ones(2 * k + 1) / (2 * k + 1), 'same')[k:-k] for i in (0, 1)], 1)
    return [tuple(q) for q in P[::2]]
cnts = [c for c in cnts if cv2.contourArea(c) > 5000]
for c in cnts: pts = smooth(c); d.line(pts + [pts[0]], fill=20, width=10, joint='curve')
arc = lambda cx, cy, rx, ry, a0, a1: [(cx + rx * np.cos(t), cy + ry * np.sin(t)) for t in np.linspace(a0, a1, 60)]
cx, cy = NL['c']; rx, ry = NL['r']
d.line(arc(cx, cy, rx, ry, 0, np.pi), fill=20, width=9)                       # le bord de l'encolure (sous le cou)
d.line(arc(cx, cy + 4, rx + 22, ry + 26, 0.05, np.pi - 0.05), fill=30, width=9)  # la côte
d.line(arc(cx, cy - 2, rx + 20, ry * 0.35, np.pi, 2 * np.pi), fill=60, width=7)  # l'encolure derrière le cou
for s in (-1, 1):                                                               # les coutures des manches (sans plis : la version simple)
    X = lambda x: cx + s * x
    d.line([(X(330), 690), (X(345), 780), (X(362), 880), (X(372), 1000), (X(378), 1100)], fill=40, width=7, joint='curve')
# le logo : les pics (le Fitz Roy) en noir sur un ciel rayé, dans un cadre ; le nom dessous
lx, ly, lw, lh = cx - 95, 800, 190, 92
d.rectangle([lx, ly, lx + lw, ly + lh], outline=20, width=7)
for k, yb in enumerate(np.linspace(ly + 14, ly + 50, 4)): d.line([(lx + 6, yb), (lx + lw - 6, yb)], fill=120, width=5)
peaks = [(0, 1), (0.08, 0.72), (0.16, 0.8), (0.27, 0.42), (0.33, 0.55), (0.41, 0.3), (0.47, 0.5), (0.55, 0.38), (0.62, 0.62), (0.72, 0.52), (0.82, 0.74), (0.9, 0.66), (1, 0.82), (1, 1)]
pk = [(lx + 4 + (lw - 8) * u, ly + 4 + (lh - 8) * v) for u, v in peaks]; d.polygon(pk, fill=255); d.line(pk + [pk[0]], fill=20, width=7, joint='curve')
font = ImageFont.truetype('/usr/share/fonts/truetype/freefont/FreeSerifBoldItalic.ttf', 46)
tw = d.textlength('patagonia', font=font); d.text((cx - tw / 2, ly + lh + 6), 'patagonia', font=font, fill=255, stroke_width=3, stroke_fill=20)
shirt = np.asarray(shirt, np.float32) / 255
front = np.where(head, ink, np.where(torso, shirt, 1.0))
alpha = (head | torso)

# ——— le dos : la tête, des mèches au trait ; le dos du t-shirt (sans le logo) ———
top = int(np.where(head.any(1))[0].min()); nape = 485
# des mèches dessinées : des traits courbes qui partent du sommet du crâne
hair = Image.new('L', (W0, H0), 255); dh_ = ImageDraw.Draw(hair); rng = np.random.default_rng(7)
crown = (CX, top + 70)
for i in range(0):                                    # la version simple : la forme des cheveux seule, sans mèches
    x0, y0 = rng.uniform(CX - 230, CX + 230), rng.uniform(top - 10, nape + 10)
    ang = np.arctan2(y0 - crown[1], x0 - crown[0]) + rng.normal(0, 0.25); ln = rng.uniform(30, 60)
    pts = [(x0 + np.cos(ang + 0.02 * t) * ln * t / 6, y0 + np.sin(ang + 0.02 * t) * ln * t / 6) for t in range(7)]
    dh_.line(pts, fill=22, width=8, joint='curve')
# la forme des cheveux : leur bord sur la nuque, d'un trait, légèrement arrondi
xs_n = np.where(head[nape - 20])[0]
if len(xs_n): dh_.line([(x, nape - 34 + 16 * (1 - ((x - (xs_n.max() + xs_n.min()) / 2) / ((xs_n.max() - xs_n.min()) / 2)) ** 2)) for x in np.linspace(xs_n.min() + 6, xs_n.max() - 6, 40)], fill=22, width=10, joint='curve')
back = np.asarray(hair, np.float32) / 255
# la limite des cheveux sur la nuque : un peu irrégulière ; la nuque et le cou en dessous, en clair
hl = nape + 12 * np.sin(xx[0] / 23) * np.sin(xx[0] / 7)
back = np.where(yy >= hl[None, :], 1.0, back)
back = np.where(head, back, 1.0)
# le contour de la tête, de dos : le même trait lisse, un peu en dedans du bord, que de face
hin = cv2.erode((cv2.GaussianBlur(head.astype(np.float32), (0, 0), 6) > 0.5).astype(np.uint8), np.ones((13, 13), np.uint8))
bi = Image.fromarray((back * 255).astype(np.uint8)); db = ImageDraw.Draw(bi)
for c in cv2.findContours(hin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0]:
    if cv2.contourArea(c) < 5000: continue
    P = c[:, 0, :].astype(np.float32)
    for k in (16, 12): P = np.stack([np.convolve(np.r_[P[-k:, i], P[:, i], P[:k, i]], np.ones(2 * k + 1) / (2 * k + 1), 'same')[k:-k] for i in (0, 1)], 1)
    db.line([tuple(q) for q in P] + [tuple(P[0])], fill=22, width=13, joint='curve')
back = np.asarray(bi, np.float32) / 255
plain = Image.new('L', (W0, H0), 255); d2 = ImageDraw.Draw(plain)
for c in cnts: pts = smooth(c); d2.line(pts + [pts[0]], fill=20, width=10, joint='curve')
d2.line(arc(cx, cy - 4, rx + 10, ry * 0.5, 0, np.pi), fill=30, width=9)
back = np.where(torso, np.asarray(plain, np.float32) / 255, back)
back = back[:, ::-1]; balpha = alpha[:, ::-1]

# ——— le relief ———
ear_w = (L[454, 0] - L[234, 0]) / 2
HC = dict(c=(CX, (L[10, 1] + L[152, 1]) / 2 - 25, 0.0), r=(ear_w * 1.12, (L[152, 1] - L[10, 1]) * 0.78, ear_w * 1.15))
def ell(c, r):
    q = 1 - ((xx - c[0]) / r[0]) ** 2 - ((yy - c[1]) / r[1]) ** 2
    return np.where(q > 0, c[2] + r[2] * np.sqrt(np.clip(q, 0, 1)), -1e9)
dh = ell(HC['c'], HC['r'])
dh = np.where(dh < -1e8, 0.0, dh)                     # les cheveux qui dépassent : à plat, au bord
# le visage : les points de MediaPipe, recalés sur l'ellipsoïde par leur bord (l'ovale du visage)
eb = np.array([dh[int(L[i, 1]), int(L[i, 0])] for i in OVAL]); off = np.median(eb - L[OVAL, 2])
face = griddata(L[:, :2], L[:, 2] + off, (xx, yy), method='linear')
inside = ~np.isnan(face); face = np.nan_to_num(face, nan=-1e9)
# le long du bord du visage : on passe doucement de l'un à l'autre
dist = cv2.distanceTransform(inside.astype(np.uint8), cv2.DIST_L2, 5); k = np.clip(dist / 25, 0, 1)
depth = np.where(inside, k * np.maximum(face, dh) + (1 - k) * dh, dh)
# le menton est en avant du cou, le cou en avant du buste
rn = (NECK[1] - NECK[0]) / 2; zn = -0.35 * ear_w
dn = zn + rn * 0.9 * np.sqrt(np.clip(1 - ((xx - CX) / rn) ** 2, 0, 1))
neckzone = head & (yy > L[152, 1] - 10)
depth = np.where(neckzone, np.where(yy > L[152, 1] + 15, dn, np.maximum(depth, dn)), depth)
xs = np.where(torso.any(0))[0]; tw_ = (xs.max() - xs.min()) / 2
dt = -0.45 * ear_w + 0.42 * tw_ * np.sqrt(np.clip(1 - ((xx - CX) / tw_) ** 2, 0, 1)) * np.clip((yy - 560) / 160, 0.35, 1) ** 0.5
depth = np.where(torso, dt, depth)
depth = np.where(alpha, depth, np.nan)
# le bord de la silhouette : on étend la profondeur au dehors (les sommets de la grille qui touchent le bord)
m = ~np.isnan(depth); _, idx = cv2.distanceTransformWithLabels((~m).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
pts = np.argwhere(m); lab = np.zeros(idx.max() + 1, np.int64); lab[idx[m]] = np.arange(len(pts))
near = pts[lab[idx]]; depth = depth[near[..., 0], near[..., 1]]
depth = cv2.GaussianBlur(depth.astype(np.float32), (0, 0), 3)

# ——— la mâchoire et la ligne des lèvres ———
UP = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]; LO = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308]
lip = (L[UP, :2] + L[LO, :2]) / 2; lx_, ly_ = lip[:, 0], lip[:, 1]
lipline = np.interp(xx, lx_, ly_)                     # au-delà des coins : tout droit
below = (yy > lipline)
mc = lip[len(lip) // 2]; mw = (L[308, 0] - L[78, 0]) / 2
chin = L[152, 1]
# la mâchoire : la partie du visage sous la ligne des lèvres, bordée par l'ovale du visage (comme un casse-noisette)
OV = np.array([L[i, :2] for i in OVAL]); low = OV[OV[:, 1] > mc[1] - 30]
low = low[np.argsort(np.arctan2(low[:, 1] - mc[1], low[:, 0] - mc[0]))][::-1]
hull = np.zeros((H0, W0), np.uint8); cv2.fillPoly(hull, [cv2.convexHull(low.astype(np.int32))], 1)
jawm = (hull > 0) & below
jaw = cv2.GaussianBlur(jawm.astype(np.float32), (0, 0), 1.5)
xs_ = np.where(jawm[int(mc[1]) + 6])[0]; jw = (xs_.max() - xs_.min()) / 2 if len(xs_) else mw * 2

# ——— tout mettre au cadre, et écrire ———
def fr(a, n, interp=cv2.INTER_AREA): return cv2.resize(np.ascontiguousarray(a[Y0:Y0 + S, X0:X0 + S]).astype(np.float32), (n, n), interpolation=interp)
def rgba(gray, al):
    g8 = (np.clip(fr(gray, N), 0, 1) * 255).astype(np.uint8); a8 = (np.clip(fr(al.astype(np.float32), N), 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(np.dstack([g8, g8, g8, a8]), 'RGBA')
# l'alpha : 1 la tête (et le cou), 0,78 le buste — js/mathieu.js ne garde que la tête quand il dessine le corps en 3D (ou le logo)
av = np.where(head, 1.0, np.where(torso, 0.78, 0.0))
rgba(front, av).save(out / 'visage.png', optimize=True)
# le logo du site (29 septembre) : le même dessin, simplifié et plus épais (trait.simple(logo=True)), la tête seule
inkl, _ = trait.simple(im, person, L[:, :2], g, head, logo=True)
rgba(np.where(head, inkl, 1.0), av).save(out / 'logo2.png', optimize=True)
# pour la vraie 3D (js/mathieu.js) : la tête seule, sans sa silhouette (les contours viennent du volume, selon la vue)
ink3, _ = trait.tete(im, person, L[:, :2], g, head=head, contour=False)
rgba(np.where(head, ink3, 1.0), head).save(out / 'visage3d.png', optimize=True)
rgba(back, av[:, ::-1]).save(out / 'dos.png', optimize=True)
G = 256
D = fr(depth, G, cv2.INTER_LINEAR); dmin, dmax = float(D.min()), float(D.max())
R = np.dstack([(D - dmin) / (dmax - dmin) * 255, fr(jaw, G, cv2.INTER_LINEAR) * 255, fr(below.astype(np.float32), G, cv2.INTER_NEAREST) * 255])
Image.fromarray(np.clip(R + 0.5, 0, 255).astype(np.uint8), 'RGB').save(out / 'relief.png')
k = 1 / S   # les mesures en fraction du cadre (0 à 1, y vers le bas)
meta = dict(depth=[dmin * k, dmax * k], mouth=dict(x=(mc[0] - X0) * k, y=(mc[1] - Y0) * k, w=mw * k, jaw=jw * k, z=float(depth[int(mc[1]), int(mc[0])]) * k), chin=(chin - Y0) * k,
            face=[(L[10, 1] - Y0) * k, (chin - Y0) * k], head=[(HC['c'][0] - X0) * k, (HC['c'][1] - Y0) * k])
# pour le corps en 3D (js/mathieu.js) : le cou (bords gauche et droit, bas devant) et le logo du t-shirt, en traits allégés
meta['neck'] = [(NECK[0] - X0) * k, (NECK[1] - X0) * k, (NL['c'][1] + NL['r'][1] - Y0) * k]
meta['logo'] = [[[round(x, 3), round(y, 3)] for x, y in (p[::2] + [p[-1]] if len(p) > 12 else p)] for p in trait.logo_lines()]
(out / 'relief.json').write_text(json.dumps(meta, separators=(',', ':')))
print(json.dumps(meta))
