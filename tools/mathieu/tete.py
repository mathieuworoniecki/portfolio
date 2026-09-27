"""La tête de Mathieu en vrai 3D (tête entière, crâne compris), pour js/mathieu.js : media/mathieu/tete.json.

    python3 -m pip install mediapipe==0.10.14 opencv-python-headless scipy fonttools
    python3 tools/mathieu/tete.py <photo de face> [media/mathieu/tete.json]

Un modèle humain simple, sur lequel on reporte ses traits :
  - la tête : une grille autour du centre du crâne (96 × 72) ; chaque direction prend le plus loin de deux surfaces :
    le crâne (un ellipsoïde, plus long d'avant en arrière) et le visage (les 468 points 3D de MediaPipe, sur sa photo) ;
    le visage est un peu affiné (sa femme : « un visage plus fin »), les yeux et la bouche un peu agrandis (lui : « de plus grands yeux, une plus grande bouche »).
  - la mâchoire : un poids par sommet (1 sous la ligne des lèvres, jusqu'au menton) ; js/mathieu.js la fait descendre ;
  - les traits : des lignes posées sur la surface (paupières, iris, sourcils, nez, bouche, lèvres, moustache), et les pupilles ;
  - les cheveux : une calotte en volume au-dessus de la ligne des cheveux, les mèches dressées sur le dessus (comme sur ses photos) ;
  - le logo Patagonia du t-shirt : le cadre, les pics, le nom (les contours des lettres, FreeSerif Bold Italic).
Unités : la hauteur du visage (du haut du front au menton) = 1 ; x à droite, y en haut, z vers nous ; l'origine au centre du crâne. """
import sys, json, pathlib
import numpy as np, cv2, mediapipe as mp
from scipy.interpolate import griddata, splprep, splev

src = sys.argv[1]; out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else pathlib.Path(__file__).resolve().parents[2] / 'media' / 'mathieu' / 'tete.json')
im = cv2.imread(src); H0, W0 = im.shape[:2]
fm = mp.solutions.face_mesh.FaceMesh(static_image_mode=True, refine_landmarks=True, max_num_faces=1).process(cv2.cvtColor(im, cv2.COLOR_BGR2RGB))
P = np.array([[p.x * W0, p.y * H0, p.z * W0] for p in fm.multi_face_landmarks[0].landmark])

# ——— le repère : le centre du crâne, l'échelle (le visage = 1) ———
k = 1 / (P[152, 1] - P[10, 1])
C = np.array([(P[234, 0] + P[454, 0]) / 2, (P[33, 1] + P[263, 1]) / 2 + 0.027 / k, (P[234, 2] + P[454, 2]) / 2 - 0.02 / k])
L = np.stack([(P[:, 0] - C[0]) * k, -(P[:, 1] - C[1]) * k, -(P[:, 2] - C[2]) * k], 1)
# la tête un peu penchée sur la photo : on la redresse (la ligne des yeux à l'horizontale)
a = np.arctan2(L[263, 1] - L[33, 1], L[263, 0] - L[33, 0]); ca, sa = np.cos(-a), np.sin(-a)
L[:, 0], L[:, 1] = L[:, 0] * ca - L[:, 1] * sa, L[:, 0] * sa + L[:, 1] * ca
mx = (L[234, 0] + L[454, 0]) / 2; L[:, 0] -= mx
THIN = 0.96; L[:, 0] *= THIN                              # un visage plus fin (sa photo préférée l'a déjà long et fin)
def grow(idx, c, f):                                     # agrandir un trait autour de son centre (dans le plan de face)
    L[idx, :2] = c[:2] + (L[idx, :2] - c[:2]) * f
EYES = {'d': [33, 246, 161, 160, 159, 158, 157, 173, 133, 7, 163, 144, 145, 153, 154, 155, 468, 469, 470, 471, 472],
        'g': [263, 466, 388, 387, 386, 385, 384, 398, 362, 249, 390, 373, 374, 380, 381, 382, 473, 474, 475, 476, 477]}
for s, idx in EYES.items():                              # de plus grands yeux (sur la photo il les plisse un peu)
    c = L[idx[:16]].mean(0); L[idx, 0] = c[0] + (L[idx, 0] - c[0]) * 1.15; L[idx, 1] = c[1] + (L[idx, 1] - c[1]) * 1.3   # comme le dessin (trait.py)
LIPS = sorted(set([61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 146, 91, 181, 84, 17, 314, 405, 321, 375, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 95, 88, 178, 87, 14, 317, 402, 318, 324]))
mc = L[[13, 14]].mean(0); L[LIPS, 0] = mc[0] + (L[LIPS, 0] - mc[0]) * 1.08; L[LIPS, 1] = mc[1] + (L[LIPS, 1] - mc[1]) * 1.1   # comme le dessin

# ——— le visage : sa profondeur z(x, y), sur l'enveloppe des points ———
from scipy.spatial import Delaunay
tri = Delaunay(L[:, :2])
def zface(x, y):
    return griddata(L[:, :2], L[:, 2], (x, y), method='linear')

# ——— le crâne ———
SK = dict(x=0.40, top=0.74, bot=0.62, front=0.42, back=0.62, cy=0.06, cz=-0.02)
def r_skull(d):
    dx, dy, dz = d[..., 0], d[..., 1], d[..., 2]
    ry = np.where(dy > 0, SK['top'], SK['bot']); rz = np.where(dz > 0, SK['front'], SK['back'])
    # rayon de l'ellipsoïde (décentré de cy, cz) le long de d : on résout |(t d - c) / r| = 1
    cx, cy, cz = 0, SK['cy'], SK['cz']; A = (dx / SK['x']) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2
    B = -2 * (dy * cy / ry ** 2 + dz * cz / rz ** 2); Cc = (cy / ry) ** 2 + (cz / rz) ** 2 - 1
    return (-B + np.sqrt(B * B - 4 * A * Cc)) / (2 * A)
def r_face(d):
    # le long du rayon : où il traverse la surface du visage (par dichotomie), NaN hors du visage
    lo, hi = np.full(d.shape[:-1], 0.05), np.full(d.shape[:-1], 1.2); f = lambda t: t * d[..., 2] - np.nan_to_num(zface(t * d[..., 0], t * d[..., 1]), nan=-9)
    for _ in range(40):
        mid = (lo + hi) / 2; above = f(mid) > 0; hi = np.where(above, mid, hi); lo = np.where(above, lo, mid)
    t = (lo + hi) / 2; z = zface(t * d[..., 0], t * d[..., 1])
    return np.where(np.isnan(z) | (d[..., 2] < 0.05), np.nan, t)

NU, NV = 96, 72
th = np.arange(NU) / NU * 2 * np.pi; ph = (np.arange(NV + 1)) / NV * np.pi
TH, PH = np.meshgrid(th, ph)
D = np.stack([np.sin(PH) * np.sin(TH), np.cos(PH), np.sin(PH) * np.cos(TH)], -1)
rs = r_skull(D); rf = r_face(D)
# le visage l'emporte là où il est, avec un passage doux sur son bord (le crâne n'est jamais au-dessus du visage)
has = ~np.isnan(rf); edge = cv2.distanceTransform(has.astype(np.uint8), cv2.DIST_L2, 3); w = np.clip(edge / 5, 0, 1)
R = np.where(has, w * rf + (1 - w) * np.maximum(rs, np.nan_to_num(rf, nan=0)), rs)
# sous le menton et la mâchoire : pas de crâne qui dépasse du visage vers l'avant
R = cv2.GaussianBlur(R.astype(np.float32), (5, 5), 1.1)   # une surface lisse : des contours d'un seul trait, pas des tirets
Rb = cv2.GaussianBlur(R, (0, 0), 2.2); low_ = np.clip((-D[..., 1] - 0.25) / 0.3, 0, 1) * np.clip(1 - D[..., 2] * 1.5, 0, 1)
R = R * (1 - low_) + Rb * low_                              # sous le menton, la mâchoire : plus lisse encore (pas de tirets au contour)
V = D * R[..., None]

# ——— la mâchoire : sous la ligne des lèvres, dans l'ovale du bas du visage ———
MID = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]
lip = L[MID]; lipy = lambda x: np.interp(x, lip[:, 0], lip[:, 1])
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
low = L[[i for i in OVAL if L[i, 1] < lip[:, 1].max() + 0.05]]
jw = (low[:, 0].max() - low[:, 0].min()) / 2 * 0.95
def jawW(x, y, z):
    side = np.clip(1 - (np.abs(x) - jw * 0.75) / (jw * 0.3), 0, 1); down = np.clip((y - (L[152, 1] - 0.12)) / 0.1, 0, 1)
    return np.where((y < lipy(x)) & (z > 0.05), side * np.minimum(1, down + (y > L[152, 1])), 0.0)
JW = jawW(V[..., 0], V[..., 1], V[..., 2])

def on_face(x, y, lift=0.006):
    z = zface(x, y); return np.nan_to_num(z, nan=0) + lift
def spline(Q, n=60, closed=False, s=0):
    Q = np.asarray(Q, float)
    if closed: Q = np.vstack([Q, Q[:1]])
    tck, _ = splprep([Q[:, 0], Q[:, 1]], s=s, per=closed, k=min(3, len(Q) - 1)); x, y = splev(np.linspace(0, 1, n), tck); return np.stack([x, y], 1)
lines = []
def line(Q2, kind, lift=0.006):
    Q2 = np.asarray(Q2); z = on_face(Q2[:, 0], Q2[:, 1], lift); j = jawW(Q2[:, 0], Q2[:, 1], z + 0.1)
    lines.append({'k': kind, 'p': np.round(np.c_[Q2, z, j], 4).tolist()})

# les yeux : la paupière du haut (épaisse), un trait pâle dessous, l'iris (un rond, coupé par la paupière), la pupille
pupils = []
for up, lo, ir in [([33, 246, 161, 160, 159, 158, 157, 173, 133], [33, 7, 163, 144, 145, 153, 154, 155, 133], 468),
                   ([263, 466, 388, 387, 386, 385, 384, 398, 362], [263, 249, 390, 373, 374, 380, 381, 382, 362], 473)]:
    U = spline(L[up, :2]); line(U, 'ink'); line(spline(L[lo, :2])[8:-8], 'soft')
    c = L[ir, :2]; r = np.linalg.norm(L[ir + 1, :2] - L[ir + 3, :2]) / 2 * 0.98
    A = np.linspace(0, 2 * np.pi, 40); circ = c + r * np.c_[np.cos(A), np.sin(A)]
    keep = circ[:, 1] < np.interp(circ[:, 0], U[:, 0], U[:, 1]) - 0.004
    runs = np.split(np.arange(40), np.where(np.diff(keep.astype(int)) != 0)[0] + 1)
    for rr in runs:
        if keep[rr[0]] and len(rr) > 2: line(circ[rr], 'ink')
    pupils.append({'c': np.round([c[0], c[1] - r * 0.1, float(on_face(c[0], c[1], 0.004))], 4).tolist(), 'r': round(r * 0.5, 4)})
    # un pli au-dessus de la paupière
    line(U[12:-12] + [0, r * 0.9], 'soft')
# les sourcils : un trait épais au milieu du sourcil
for up, lo in [([70, 63, 105, 66, 107], [46, 53, 52, 65, 55]), ([300, 293, 334, 296, 336], [276, 283, 282, 295, 285])]:
    line(spline((L[up, :2] + L[lo, :2]) / 2), 'brow', 0.01)
# le nez : le dessous du bout, les ailes, l'arête (un trait pâle d'un côté)
line(spline(L[[98, 97, 2, 326, 327], :2]), 'ink'); line(spline(L[[48, 64, 98], :2], 20), 'ink'); line(spline(L[[278, 294, 327], :2], 20), 'ink')
line(spline(L[[168, 6, 197, 195, 5], :2] + [-0.035, 0], 30)[4:], 'soft')
# la bouche : la ligne des lèvres (les coins un peu relevés : un sourire), la lèvre du haut, la lèvre du bas
Mq = spline(L[MID, :2]); u = np.linspace(-1, 1, len(Mq)); Mq[:, 1] += 0.012 * u ** 4
line(Mq, 'ink')
line(spline(L[[61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291], :2])[6:-6], 'soft')
line(spline(L[[61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291], :2])[10:-10], 'ink')
# la moustache : en guidon, fine, plus large que la bouche ; épaisse au milieu, effilée, les pointes qui remontent un peu
top0 = L[2, 1] - 0.012; lipT = spline(L[[61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291], :2], 41)
ext = 0.065; x0, x1 = L[61, 0] - ext, L[291, 0] + ext; xm = np.linspace(x0, x1, 61); uu = np.linspace(-1, 1, 61)
uc = 1 - ext / ((x1 - x0) / 2)                             # où sont les coins de la bouche, en u
out_ = np.clip((np.abs(uu) - uc) / (1 - uc), 0, 1)
bot = np.interp(xm, lipT[:, 0], lipT[:, 1]) + 0.004 + 0.032 * out_ ** 1.6
th_ = 0.05 * np.clip(1 - np.abs(uu) ** 2.4, 0, 1) ** 0.7 + 0.003
topc = np.minimum(bot + th_, top0 - 0.004 * (1 - uu ** 2)) - 0.009 * np.exp(-(xm / 0.018) ** 2)
# un trait épais par côté, du milieu à la pointe (qui remonte) ; des poils pâles par-dessus
mid_ = (topc + bot) / 2
for sl in (slice(1, 29), slice(32, 60)): line(spline(np.c_[xm, mid_][sl], 30), 'brow', 0.02)
rng_m = np.random.default_rng(7)
for u0 in np.concatenate([np.linspace(-0.9, -0.08, 12), np.linspace(0.08, 0.9, 12)]):
    i = int(round((u0 + 1) / 2 * 60)); sg = np.sign(u0); j = int(np.clip(i + sg * 2, 0, 60))
    if topc[i] - bot[i] < 0.01: continue
    line(np.array([[xm[i], topc[i] + 0.004], [xm[j] + sg * 0.004, bot[j]]]), 'soft', 0.022)

# ——— les cheveux : une calotte en volume ; la ligne des cheveux (front, tempes, nuque) ———
front_y = L[10, 1] + 0.1                                 # un grand front : la ligne des cheveux est haute
def hairline(thv):                                        # la hauteur de la ligne des cheveux selon l'angle autour de la tête
    A = [[0, front_y], [0.45, front_y - 0.04], [0.85, front_y - 0.2], [1.1, 0.05], [1.3, -0.09], [1.6, -0.08], [2.2, -0.35], [np.pi, -0.48]]
    a = np.abs(np.where(thv > np.pi, thv - 2 * np.pi, thv)); return np.interp(a, [p[0] for p in A], [p[1] for p in A])
def tuft(thv, phv):
    s = np.sin(thv * 9 + 0.6) * np.sin(phv * 11 + 0.4); return np.clip(s, 0, 1) ** 2.5
HV = np.zeros_like(V); up = V[..., 1]
hl = hairline(TH)
inside = V[..., 1] > hl
# en pics vers le haut, comme sur ses photos : épais sur le dessus et devant (la houppe), du volume sur les côtés
thick = 0.03 + 0.13 * np.clip(D[..., 1], 0, 1) ** 1.3 + 0.08 * np.clip(D[..., 2], 0, 1) * np.clip(D[..., 1], 0, 1) + 0.05 * np.abs(D[..., 0]) * np.clip(D[..., 1] + 0.3, 0, 1)
thick = thick * (1 + 0.35 * tuft(TH, PH) * np.clip(D[..., 1] + 0.1, 0, 1))
kk = np.clip((V[..., 1] - hl) / 0.06, 0, 1)
RH = np.where(inside, R + thick * kk + 0.004, R * 0.8)          # sous la ligne des cheveux : bien à l'intérieur (la mâchoire peut descendre)
RH = cv2.GaussianBlur(RH.astype(np.float32), (7, 7), 1.6)
HV = D * RH[..., None]
# des mèches : des traits du bas vers le sommet, qui suivent la calotte
strands = []
rng = np.random.default_rng(3)
for i in range(46):
    t0 = rng.uniform(0, 2 * np.pi); pts = []
    for j in range(10):
        f = j / 9; tv = t0 + 0.25 * f * np.sin(t0 * 3); y0 = hairline(np.array(t0)) + 0.03
        # du bord vers le haut : on remonte en latitude
        ph0 = np.arccos(np.clip(y0 / 0.8, -1, 1)); pv = ph0 * (1 - 0.55 * f)
        dd = np.array([np.sin(pv) * np.sin(tv), np.cos(pv), np.sin(pv) * np.cos(tv)])
        ii, jj = int(round(pv / np.pi * NV)), int(round(tv / (2 * np.pi) * NU)) % NU
        pts.append((dd * (RH[ii, jj] + 0.004 + 0.09 * max(0, f - 0.6) / 0.4 * max(0, dd[1]))).tolist())   # la pointe sort du volume : un pic
    strands.append(np.round(pts, 4).tolist())

spikes = []
rng_s = np.random.default_rng(11)
for i in range(90):
    tv = rng_s.normal(0, 1.1); pv = abs(rng_s.normal(0, 0.55)) + 0.05
    if pv > 1.2 or len(spikes) >= 42: continue
    tv %= 2 * np.pi; ii, jj = int(round(pv / np.pi * NV)), int(round(tv / (2 * np.pi) * NU)) % NU
    if not inside[ii, jj] or V[ii, jj, 1] < hl[ii, jj] + 0.08: continue          # jamais sur le front
    d0 = np.array([np.sin(pv) * np.sin(tv), np.cos(pv), np.sin(pv) * np.cos(tv)]); base = d0 * (RH[ii, jj] - 0.01)
    tg = np.cross([0, 1, 0], d0); tg = tg / (np.linalg.norm(tg) + 1e-9) if np.linalg.norm(tg) > 1e-3 else np.array([1., 0, 0])
    up = d0 + np.array([0, 0.9, 0]) + rng_s.normal(0, 0.25, 3); up /= np.linalg.norm(up)
    ln = rng_s.uniform(0.08, 0.16) * (0.6 + 0.4 * max(0, d0[1])) * (1 + 0.3 * max(0, d0[2])); w = rng_s.uniform(0.035, 0.06)
    tip = base + up * ln + tg * rng_s.normal(0, 0.02)
    spikes.append(np.round([base - tg * w, (base - tg * w * 0.4 + tip) / 2 + up * 0.01, tip, (base + tg * w * 0.4 + tip) / 2 + up * 0.005, base + tg * w], 4).tolist())
# la ligne des cheveux, devant et sur les tempes : un vrai trait (le bord de la calotte)
hl_line = []
for jj in list(range(NU - 17, NU)) + list(range(0, 18)):
    col = inside[:, jj]; ii = int(np.argmax(~col)) - 1 if (~col).any() else NV
    if ii > 0: hl_line.append((HV[ii, jj] * 1.004).tolist())
spikes.append(np.round(hl_line, 4).tolist())
top_s = max(max(p[1] for p in sp) for sp in spikes)

# ——— le logo Patagonia : le cadre, les pics, le nom (contours des lettres) ———
logo = []
lw, lh = 0.36, 0.18
logo.append([[-lw / 2, 0], [lw / 2, 0], [lw / 2, -lh], [-lw / 2, -lh], [-lw / 2, 0]])
for yb in np.linspace(-0.03, -0.09, 3): logo.append([[-lw / 2 + 0.01, yb], [lw / 2 - 0.01, yb]])
peaks = [(0, 1), (0.08, 0.72), (0.16, 0.8), (0.27, 0.42), (0.33, 0.55), (0.41, 0.3), (0.47, 0.5), (0.55, 0.38), (0.62, 0.62), (0.72, 0.52), (0.82, 0.74), (0.9, 0.66), (1, 0.82)]
logo.append([[-lw / 2 + lw * u, -lh * v] for u, v in peaks])
try:
    from fontTools.ttLib import TTFont
    from fontTools.pens.recordingPen import RecordingPen
    f = TTFont('/usr/share/fonts/truetype/freefont/FreeSerifBoldItalic.ttf'); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
    text = 'patagonia'; sc = 0.075 / upm * 1.3; x0 = 0; glyphs = []
    for ch in text:
        g = gs[cmap[ord(ch)]]; pen = RecordingPen(); g.draw(pen); glyphs.append((x0, pen.value)); x0 += g.width
    ox = -x0 * sc / 2
    for gx, ops in glyphs:
        cur = []; last = None
        for op, args in ops:
            if op == 'moveTo': cur = [args[0]]; last = args[0]
            elif op == 'lineTo': cur.append(args[0]); last = args[0]
            elif op in ('qCurveTo', 'curveTo'):
                pts_ = [last] + list(args)
                # des courbes quadratiques en chaîne (TrueType) : on les échantillonne
                if op == 'qCurveTo':
                    ctrl = list(args[:-1]); end = args[-1]; seq = [last]
                    for ci in range(len(ctrl)):
                        c1 = ctrl[ci]; e = end if ci == len(ctrl) - 1 else ((c1[0] + ctrl[ci + 1][0]) / 2, (c1[1] + ctrl[ci + 1][1]) / 2)
                        s0 = seq[-1]
                        for t in np.linspace(0.2, 1, 5): cur.append(((1 - t) ** 2 * s0[0] + 2 * (1 - t) * t * c1[0] + t * t * e[0], (1 - t) ** 2 * s0[1] + 2 * (1 - t) * t * c1[1] + t * t * e[1]))
                        seq.append(e)
                    last = end
                else:
                    p0, p1, p2, p3 = pts_
                    for t in np.linspace(0.2, 1, 5): cur.append(tuple(((1 - t) ** 3) * np.array(p0) + 3 * (1 - t) ** 2 * t * np.array(p1) + 3 * (1 - t) * t * t * np.array(p2) + t ** 3 * np.array(p3)))
                    last = args[-1]
            elif op in ('closePath', 'endPath'):
                if cur: logo.append([[ox + (gx + p[0]) * sc, -lh - 0.03 - 0.075 + p[1] * sc] for p in cur + [cur[0]]]); cur = []
except Exception as e:
    print('le nom du logo : pas de contours', e)

r4 = lambda a: np.round(np.asarray(a, float), 4).ravel().tolist()
data = dict(nu=NU, nv=NV + 1, head=r4(V), jaw=r4(JW), hair=r4(HV), lines=lines, pupils=pupils, strands=strands, spikes=spikes, logo=[np.round(l, 4).tolist() for l in logo],
            ears=[np.round([L[234, 0] * 1.02, L[234, 1] - 0.02, L[234, 2] - 0.12], 4).tolist(), np.round([L[454, 0] * 1.02, L[454, 1] - 0.02, L[454, 2] - 0.12], 4).tolist()],
            mouth=dict(x=round(float(mc[0]), 4), y=round(float(mc[1]), 4), z=round(float(on_face(mc[0], mc[1], 0)), 4), w=round(float(jw), 4), hw=round(float((L[291, 0] - L[61, 0]) / 2), 4)),
            lip=np.round(lip[:, :2], 4).tolist(),
            chin=round(float(L[152, 1]), 4),
            proj=dict(c=[round(float(C[0]), 2), round(float(C[1]), 2)], k=float(k), a=float(a), mx=float(mx), thin=THIN),   # proj : du modèle à la photo (le dessin de build.py)
            top=round(float(max(HV[..., 1].max(), top_s)), 4))
out.write_text(json.dumps(data, separators=(',', ':')))
print(out, len(out.read_text()) // 1024, 'Ko', 'haut', data['top'], 'menton', data['chin'], 'bouche', data['mouth'])
