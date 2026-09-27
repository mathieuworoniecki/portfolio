"""La tête de Mathieu, redessinée au trait d'après sa photo (appelé par build.py) : un portrait à la plume, sympa, où on le reconnaît.
Le trait : un pinceau-feutre, épais au milieu et effilé aux bouts (brush), comme un dessin fait à la main ; deux encres, INK (franc) et SOFT (pâle).
Ce qui vient des 478 points du visage (MediaPipe) : les yeux (paupières, iris, pupille et reflet), les sourcils, le nez, la bouche, la mâchoire.
Ce qui vient de la photo : la silhouette, la masse des cheveux et leurs mèches (les creux sombres de la photo, amincis en traits effilés),
la forme de la moustache (rendue symétrique, en poils), le creux des oreilles. """
import cv2, numpy as np
from PIL import Image, ImageDraw
from scipy.interpolate import splprep, splev
from skimage.morphology import skeletonize

INK, SOFT = 22, 120

def resample(P, step=2.0):
    P = np.asarray(P, float)
    if len(P) < 2: return P
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]
    if d[-1] < 1e-6: return P[:1]
    t = np.linspace(0, d[-1], max(2, int(d[-1] / step)))
    return np.stack([np.interp(t, d, P[:, 0]), np.interp(t, d, P[:, 1])], 1)

def brush(d, P, w, fill=INK, taper=(0.25, 0.25), wmin=0.3):
    """Un trait de feutre : la largeur monte depuis le début, reste pleine, redescend vers la fin (taper : la part effilée de chaque bout)."""
    P = resample(P); n = len(P)
    if n < 2: return
    u = np.linspace(0, 1, n); a, b = taper
    k = np.minimum(1, np.minimum(u / a if a > 0 else 1, (1 - u) / b if b > 0 else 1))
    k = wmin + (1 - wmin) * np.sin(np.clip(k, 0, 1) * np.pi / 2)
    for (x, y), kk in zip(P, k):
        r = w * kk / 2; d.ellipse([x - r, y - r, x + r, y + r], fill=fill)

def tete(im, m, L, g, bottom=640, head=None, contour=True):
    """im : la photo (BGR), m : la silhouette, L : les points du visage (x, y), g : la photo lissée en gris (0 à 1).
    contour=False : sans la silhouette (la vraie 3D la trace elle-même, selon la vue).
    Rend le dessin (0 : encre, 1 : papier) et le masque des cheveux."""
    H0, W0 = m.shape; yy, xx = np.mgrid[0:H0, 0:W0]
    # des yeux et une bouche un peu plus grands (ce qu'il a demandé) : on écarte leurs points autour de leur centre
    L = np.asarray(L, float).copy()
    for idx in ([33, 246, 161, 160, 159, 158, 157, 173, 133, 7, 163, 144, 145, 153, 154, 155, 468, 469, 470, 471, 472],
                [263, 466, 388, 387, 386, 385, 384, 398, 362, 249, 390, 373, 374, 380, 381, 382, 473, 474, 475, 476, 477]):
      c = L[idx[:16]].mean(0); L[idx] = c + (L[idx] - c) * [1.15, 1.3]
    LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 146, 91, 181, 84, 17, 314, 405, 321, 375, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 95, 88, 178, 87, 14, 317, 402, 318, 324]
    c = L[[13, 14]].mean(0); L[LIPS] = c + (L[LIPS] - c) * [1.08, 1.1]
    W, w = 10, 7                                        # le trait franc, le trait fin (px de la photo)
    def curve(idx, n=80, closed=False, s=0, pts=None):
      P = L[idx] if pts is None else np.asarray(pts, float)
      if closed: P = np.vstack([P, P[:1]])
      tck, _ = splprep([P[:, 0], P[:, 1]], s=s, per=closed, k=min(3, len(P) - 1)); x, y = splev(np.linspace(0, 1, n), tck); return np.stack([x, y], 1)
    def smooth(c, k=7):
      P = c[:, 0, :].astype(np.float32); n = len(P)
      if n < 2 * k + 2: return P
      return np.stack([np.convolve(np.r_[P[-k:, i], P[:, i], P[:k, i]], np.ones(2 * k + 1) / (2 * k + 1), 'same')[k:-k] for i in (0, 1)], 1)
    img = Image.new('L', (W0, H0), 255); d = ImageDraw.Draw(img)
    OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
    fm = np.zeros((H0, W0), np.uint8); cv2.fillPoly(fm, [L[OVAL].astype(np.int32)], 1); face = fm > 0
    gb = cv2.GaussianBlur(g, (0, 0), 2)
    fw = L[454, 0] - L[234, 0]                           # la largeur du visage : l'échelle des traits

    # ——— les cheveux : la masse (sombre, dans la silhouette, au-dessus des sourcils), son contour, des mèches ———
    hair = m & (gb < 0.40) & (yy < L[152, 1] - 0.5 * fw) & ~(face & (yy > L[10, 1] + 0.06 * fw))
    hair = cv2.morphologyEx(hair.astype(np.uint8), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    hair = cv2.morphologyEx(hair, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(hair, 8); keep = np.zeros(n, bool); keep[1:] = st[1:, 4] > 600; hair = keep[lab]
    # les mèches : les creux sombres de la photo (une différence de flous), amincis en traits, dessinés effilés dans le sens de la mèche
    inner = cv2.erode(hair.astype(np.uint8), np.ones((13, 13), np.uint8)) > 0
    dn = cv2.GaussianBlur(g, (0, 0), 1.6) - cv2.GaussianBlur(g, (0, 0), 4.5)
    sk = skeletonize(inner & (dn < -0.014)); n, lab, st, _ = cv2.connectedComponentsWithStats(sk.astype(np.uint8), 8)
    for i in range(1, n):
      if st[i, 4] < 12: continue
      ys, xs = np.where(lab == i); P = np.c_[xs, ys].astype(float)
      # l'axe principal de la mèche : un trait droit un peu courbe, d'un bout à l'autre
      c = P.mean(0); U, S, Vt = np.linalg.svd(P - c, full_matrices=False); ax = Vt[0]; t = (P - c) @ ax
      o = np.argsort(t); Q = P[o]; Q = Q[::max(1, len(Q) // 8)]
      if len(Q) < 3: continue
      brush(d, curve(None, 30, s=len(Q) * 4, pts=Q), w * (0.8 if st[i, 4] > 40 else 0.6), INK if st[i, 4] > 60 else SOFT, (0.3, 0.45))
    # le contour des cheveux : lissé, mais en gardant les pics
    hm = (head if head is not None else m & (yy < bottom)).astype(np.uint8); inside_d = cv2.distanceTransform(hm, cv2.DIST_L2, 5)
    cs, _ = cv2.findContours(hair.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    for c in cs:
      if cv2.contourArea(c) < 600: continue
      p = smooth(c, 6); p = np.vstack([p, p[:1]])
      if contour: d.line([tuple(q) for q in p], fill=INK, width=W, joint='curve'); continue
      # sans la silhouette : seulement la ligne des cheveux sur le front et les tempes (loin du bord de la tête)
      far = inside_d[np.clip(p[:, 1].astype(int), 0, H0 - 1), np.clip(p[:, 0].astype(int), 0, W0 - 1)] > 16
      for run in np.split(np.arange(len(p)), np.where(np.diff(far.astype(int)) != 0)[0] + 1):
        if far[run[0]] and len(run) > 8: brush(d, p[run], W, INK, (0.2, 0.2), 0.3)

    # ——— les sourcils : un trait plein, épais vers le nez, effilé vers la tempe ———
    for up, lo in [([107, 66, 105, 63, 70], [55, 65, 52, 53, 46]), ([336, 296, 334, 293, 300], [285, 295, 282, 283, 276])]:
      U = curve(up, 40); D = curve(lo, 40); M = (U + D) / 2; th = np.linalg.norm(U - D, axis=1) * 0.85
      u = np.linspace(0, 1, 40); th = np.maximum(th, 0.065 * fw * (1 - 0.3 * u)) * (1 - 0.6 * u ** 1.6)          # plus fin vers la queue
      nx = np.gradient(M[:, 1]); ny = -np.gradient(M[:, 0]); nn = np.hypot(nx, ny) + 1e-6; nx, ny = nx / nn, ny / nn
      A = M + np.c_[nx, ny] * th[:, None] / 2; B = M - np.c_[nx, ny] * th[:, None] / 2
      d.polygon([tuple(q) for q in np.vstack([A, B[::-1]])], fill=INK)
      brush(d, M, th.min() * 0.9, INK, (0.02, 0.5))                      # une queue effilée
      # quelques poils au bout, vers la tempe
      for j in (30, 34, 37): d.line([tuple(A[j]), tuple(A[j] + (M[-1] - M[0]) / np.linalg.norm(M[-1] - M[0]) * 6 - np.array([0, 3]))], fill=INK, width=3)

    # ——— les yeux : la paupière du haut (épaisse, qui déborde un peu au coin), l'iris, la pupille, un reflet ; la paupière du bas, pâle ———
    for up, lo, iris, outer in [([33, 246, 161, 160, 159, 158, 157, 173, 133], [33, 7, 163, 144, 145, 153, 154, 155, 133], 468, 0),
                                ([263, 466, 388, 387, 386, 385, 384, 398, 362], [263, 249, 390, 373, 374, 380, 381, 382, 362], 473, 0)]:
      c = L[iris]; r = np.linalg.norm(L[iris + 1] - L[iris + 3]) / 2 * 1.02
      Up = curve(up, 60); Lo = curve(lo, 60)
      em = np.zeros((H0, W0), np.uint8); cv2.fillPoly(em, [np.vstack([Up, Lo[::-1]]).astype(np.int32)], 1)
      ir = Image.new('L', (W0, H0), 0); di = ImageDraw.Draw(ir)
      di.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=255, width=5)
      di.ellipse([c[0] - r * 0.5, c[1] - r * 0.5, c[0] + r * 0.5, c[1] + r * 0.5], fill=255)
      di.ellipse([c[0] + r * 0.02, c[1] - r * 0.52, c[0] + r * 0.4, c[1] - r * 0.14], fill=0)      # le reflet : des yeux vivants
      irm = (np.asarray(ir) > 0) & (em > 0); a = np.asarray(img).copy(); a[irm] = INK; img = Image.fromarray(a); d = ImageDraw.Draw(img)
      # la paupière : du coin intérieur (fin) au coin extérieur (épais), avec un petit prolongement
      out = Up[0] - Up[1]; out = out / (np.linalg.norm(out) + 1e-6)
      lid = np.vstack([Up[::-1], Up[0] + out * 0.06 * fw + np.array([0, -0.01 * fw])])
      brush(d, lid, W * 1.05, INK, (0.35, 0.12), 0.35)
      brush(d, Lo[12:-6], 5, SOFT, (0.3, 0.3))
      cr = Up[12:-8].copy(); cr[:, 1] -= r * 0.8; brush(d, cr, 4.5, SOFT, (0.4, 0.4))                 # le pli de la paupière
      # un petit pli de sourire au coin extérieur (sympa)
      e = Lo[0]; brush(d, [e + np.array([np.sign(out[0]) * 0.03 * fw, 0.005 * fw]), e + np.array([np.sign(out[0]) * 0.06 * fw, 0.03 * fw])], 4, SOFT, (0.3, 0.5))

    # ——— le nez : long et droit ; l'arête d'un seul trait (côté ombre), les ailes, le dessous du bout ———
    side = 1 if gb[int(L[209, 1]), int(L[209, 0])] > gb[int(L[429, 1]), int(L[429, 0])] else -1   # le côté le plus sombre de l'arête
    br = L[[193, 245, 188, 174, 236, 198, 209]] if side < 0 else L[[417, 465, 412, 399, 456, 420, 429]]
    brush(d, curve(None, 50, s=200, pts=br[[0, 2, 3, 4, 5]]), 6, SOFT, (0.5, 0.2))
    brush(d, curve([98, 97, 2, 326, 327], 40, s=20)[4:-4], w * 0.8, INK, (0.35, 0.35), 0.2)                   # le dessous du bout
    for wing in ([64, 98, 97], [294, 327, 326]):                                                # les ailes, fines : un nez étroit
      P = curve(wing, 30); P = P.mean(0) + (P - P.mean(0)) * 0.8; brush(d, P, w * 0.9, INK, (0.4, 0.1))

    # ——— la moustache : symétrique, fine, en guidon (les pointes un peu relevées au-delà des coins de la bouche) ———
    skin = np.median(gb[face & (yy > L[1, 1]) & (yy < L[0, 1]) & ~(np.abs(xx - L[1, 0]) < 0.12 * fw)])
    mbox = (yy > L[2, 1] + 4) & (yy < L[0, 1] + 6) & (np.abs(xx - L[0, 0]) < (L[291, 0] - L[61, 0]) * 0.75)
    must = cv2.morphologyEx((mbox & (gb < skin - 0.12)).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)) > 0
    UPO = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]
    lipP = curve(UPO, 60); cxm = L[0, 0]; half = (L[291, 0] - L[61, 0]) / 2 + 0.09 * fw
    xsM = np.linspace(cxm - half, cxm + half, 61); lipY = np.interp(xsM, lipP[:, 0], lipP[:, 1])
    th = []
    for x, ly in zip(xsM, lipY):
      col = np.where(must[:, int(x)])[0]; th.append(max(0, ly - col.min()) if len(col) else 0)
    th = np.array(th); th = (th + th[::-1]) / 2; th = np.convolve(np.r_[th[:4], th, th[-4:]], np.ones(9) / 9, 'same')[4:-4]
    uu = np.linspace(-1, 1, 61); au = np.abs(uu); corner = (L[291, 0] - L[61, 0]) / 2 / half
    th = np.clip(th, 0.03 * fw, 0.052 * fw) * np.clip(1 - ((au - 0.45) / 0.55).clip(0) ** 1.2, 0.06, 1)
    th = th * (1 - 0.35 * np.exp(-(uu / 0.08) ** 2))                     # le petit creux au milieu, sous le nez
    lift = 0.05 * fw * (np.clip((au - corner) / (1 - corner), 0, 1) ** 1.8)  # les pointes remontent (le guidon)
    bot = lipY - 0.03 * fw - lift + 0.01 * fw * au ** 2; top = bot - th     # un peu au-dessus de la lèvre : la bouche reste une bouche
    # des poils, pas un aplat (un aplat se lit comme une lèvre) : de courts traits effilés, qui partent du milieu vers les pointes,
    # du haut de la moustache vers son bas ; serrés et foncés au milieu des côtés, plus rares et pâles vers les pointes
    rng = np.random.default_rng(5); mid = (top + bot) / 2
    for side in (-1, 1):
      for k in range(22):
        f = (k + rng.uniform(0.1, 0.9)) / 22                              # de 0 (sous le nez) à 1 (la pointe)
        i0 = int(round(30 + side * (0.06 + 0.86 * f) * 30)); i1 = int(np.clip(i0 + side * rng.integers(4, 7), 0, 60))
        if th[i0] < 2.5: continue
        a0 = np.array([xsM[i0], top[i0] + th[i0] * rng.uniform(0.0, 0.25)])
        a1 = np.array([xsM[i1], bot[i1] - th[i1] * rng.uniform(0.0, 0.2)])
        brush(d, [a0, (a0 + a1) / 2 + [0, th[i0] * 0.08], a1], (5.5 if f < 0.75 else 4) * (1.05 - 0.3 * f), INK if f < 0.8 else SOFT, (0.35, 0.5), 0.25)
    # les pointes : un trait fin qui remonte en s'effilant (le guidon)
    for i0, sg in ((6, -1), (54, 1)):
      p0 = np.array([xsM[i0], mid[i0]]); tip = np.array([xsM[0] if sg < 0 else xsM[-1], mid[i0] - 0.03 * fw])
      brush(d, [p0, (p0 + tip) / 2 + [0, 0.004 * fw], tip + [sg * 0.012 * fw, -0.012 * fw]], 4.5, INK, (0.05, 0.7), 0.15)

    # ——— la bouche : la ligne des lèvres (les coins relevés : un sourire), la lèvre du bas, pâle ———
    MID = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]; LOO = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291]
    Mq = curve(MID, 60); u = np.linspace(-1, 1, 60); Mq[:, 1] -= 0.012 * fw * u ** 4
    brush(d, Mq, W * 0.95, INK, (0.2, 0.2), 0.3)
    brush(d, curve(LOO, 60)[18:-18] + [0, 0.01 * fw], 5.5, SOFT, (0.35, 0.35))
    for sg, e in ((-1, Mq[0]), (1, Mq[-1])):                             # les fossettes des coins
      brush(d, [e + [sg * 0.012 * fw, -0.018 * fw], e + [sg * 0.02 * fw, 0.004 * fw]], 4, SOFT, (0.3, 0.4))
    # le creux sous la lèvre (au-dessus du menton), un petit trait pâle
    ch = L[[17, 200, 199]].mean(0); brush(d, [ch + [-0.05 * fw, 0.035 * fw], ch + [0, 0.045 * fw], ch + [0.05 * fw, 0.035 * fw]], 4.5, SOFT, (0.4, 0.4))

    # ——— les oreilles : le creux (les zones sombres, en traits) ———
    for i in (234, 454):
      box = (np.abs(xx - L[i, 0]) < 0.14 * fw) & (np.abs(yy - L[i, 1]) < 0.2 * fw) & ~face & m & ~hair
      sk = skeletonize(box & (dn < -0.025)); n, lab, st, _ = cv2.connectedComponentsWithStats(sk.astype(np.uint8), 8)
      for j in range(1, n):
        if st[j, 4] < 20: continue
        ys, xs = np.where(lab == j); o = np.argsort(ys); Q = np.c_[xs, ys][o][::3]
        if len(Q) > 3: brush(d, curve(None, 30, s=len(Q) * 6, pts=Q), 6, SOFT, (0.3, 0.3))

    # ——— la mâchoire, le menton : un trait effilé qui part sous l'oreille ; toute la silhouette, en trait franc ———
    jaw = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454]
    brush(d, curve(jaw, 160)[42:-42], W * 1.05, INK, (0.15, 0.15), 0.3)
    cs, _ = cv2.findContours((head if head is not None else m & (yy < bottom)).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE) if contour else ([], None)
    for c in cs:
      if cv2.contourArea(c) < 5000: continue
      p = smooth(c, 9); d.line([tuple(q) for q in p] + [tuple(p[0])], fill=INK, width=W + 1, joint='curve')
    return np.asarray(img, np.float32) / 255, hair

def simple(im, m, L, g, head):
    """La version simple (27 septembre : « plus simple, un trait qui me dessine, moins de détails ») : un seul trait de feutre, franc, pas de gris,
    comme les chats. La silhouette, la ligne des cheveux et quelques mèches, les sourcils, les yeux en points avec un reflet,
    le dessous du nez, la moustache en guidon (deux traits qui remontent en boucle), le sourire, le menton."""
    H0, W0 = m.shape; yy, xx = np.mgrid[0:H0, 0:W0]
    L = np.asarray(L, float)
    def curve(idx, n=80, s=0, pts=None):
      P = L[idx] if pts is None else np.asarray(pts, float)
      tck, _ = splprep([P[:, 0], P[:, 1]], s=s, k=min(3, len(P) - 1)); x, y = splev(np.linspace(0, 1, n), tck); return np.stack([x, y], 1)
    def smooth(c, k=7):
      P = c[:, 0, :].astype(np.float32)
      return np.stack([np.convolve(np.r_[P[-k:, i], P[:, i], P[:k, i]], np.ones(2 * k + 1) / (2 * k + 1), 'same')[k:-k] for i in (0, 1)], 1)
    img = Image.new('L', (W0, H0), 255); d = ImageDraw.Draw(img)
    fw = L[454, 0] - L[234, 0]; W = 0.042 * fw                    # un seul trait, proportionné au visage
    OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
    fm = np.zeros((H0, W0), np.uint8); cv2.fillPoly(fm, [L[OVAL].astype(np.int32)], 1); face = fm > 0
    gb = cv2.GaussianBlur(g, (0, 0), 2)

    # ——— les cheveux : la ligne des cheveux sur le front (loin du bord de la tête), et trois ou quatre mèches, les plus longues ———
    hair = m & (gb < 0.40) & (yy < L[152, 1] - 0.5 * fw) & ~(face & (yy > L[10, 1] + 0.06 * fw))
    hair = cv2.morphologyEx(hair.astype(np.uint8), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    hair = cv2.morphologyEx(hair, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    inside_d = cv2.distanceTransform(head.astype(np.uint8), cv2.DIST_L2, 5)
    cs, _ = cv2.findContours(hair, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    for c in cs:
      if cv2.contourArea(c) < 3000: continue
      p = smooth(c, 12); far = inside_d[np.clip(p[:, 1].astype(int), 0, H0 - 1), np.clip(p[:, 0].astype(int), 0, W0 - 1)] > 22
      for run in np.split(np.arange(len(p)), np.where(np.diff(far.astype(int)) != 0)[0] + 1):
        if far[run[0]] and len(run) > 40: brush(d, p[run][::3], W, INK, (0.2, 0.2), 0.3)
    inner = cv2.erode(hair, np.ones((21, 21), np.uint8)) > 0
    dn = cv2.GaussianBlur(g, (0, 0), 2.5) - cv2.GaussianBlur(g, (0, 0), 7)
    sk = skeletonize(inner & (dn < -0.02)); n, lab, st, _ = cv2.connectedComponentsWithStats(sk.astype(np.uint8), 8)
    for i in [i for i in np.argsort(-st[:, 4]) if i > 0][:4]:
      ys, xs = np.where(lab == i); P = np.c_[xs, ys].astype(float)
      if len(P) < 25: continue
      c = P.mean(0); _, _, Vt = np.linalg.svd(P - c, full_matrices=False); Q = P[np.argsort((P - c) @ Vt[0])]; Q = Q[::max(1, len(Q) // 6)]
      if len(Q) >= 3: brush(d, curve(None, 30, s=len(Q) * 30, pts=Q), W * 0.8, INK, (0.3, 0.6))

    # ——— les sourcils : un trait, épais vers le nez, effilé vers la tempe ———
    for up, lo in [([107, 66, 105, 63, 70], [55, 65, 52, 53, 46]), ([336, 296, 334, 293, 300], [285, 295, 282, 283, 276])]:
      M = (curve(up, 30) + curve(lo, 30)) / 2
      brush(d, M, W * 1.5, INK, (0.1, 0.6), 0.25)

    # ——— les yeux : la paupière du haut, un gros point avec un reflet (comme les chats) ———
    for up, lo, iris in [([33, 246, 161, 160, 159, 158, 157, 173, 133], [33, 7, 163, 144, 145, 153, 154, 155, 133], 468),
                         ([263, 466, 388, 387, 386, 385, 384, 398, 362], [263, 249, 390, 373, 374, 380, 381, 382, 362], 473)]:
      Up = curve(up, 40); Lo = curve(lo, 40); c = L[iris]
      brush(d, Up[2:-2] + [0, -0.015 * fw], W * 0.9, INK, (0.3, 0.3), 0.3)
      r = max(np.linalg.norm(L[iris + 1] - L[iris + 3]) / 2 * 0.85, 0.055 * fw)
      d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=INK)
      d.ellipse([c[0] + r * 0.05, c[1] - r * 0.7, c[0] + r * 0.55, c[1] - r * 0.2], fill=255)

    # ——— le nez : le dessous du bout, d'un trait ; un petit bout d'arête ———
    brush(d, curve([98, 97, 2, 326, 327], 40, s=30), W * 0.85, INK, (0.3, 0.3), 0.2)
    side = 1 if gb[int(L[209, 1]), int(L[209, 0])] > gb[int(L[429, 1]), int(L[429, 0])] else -1
    br = L[[188, 174, 236, 198]] if side < 0 else L[[412, 399, 456, 420]]
    brush(d, curve(None, 30, s=100, pts=br), W * 0.7, INK, (0.5, 0.3), 0.2)

    # ——— la moustache en guidon : deux traits, épais sous le nez, qui s'effilent et remontent en boucle au-delà des coins de la bouche ———
    UPO = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]; lipP = curve(UPO, 60)
    cx, hw = L[0, 0], (L[291, 0] - L[61, 0]) / 2
    for sg in (-1, 1):
      xs = cx + sg * np.linspace(0.04 * fw, hw + 0.1 * fw, 30); u = np.linspace(0, 1, 30)
      ys = np.interp(xs, lipP[:, 0], lipP[:, 1], left=lipP[0, 1], right=lipP[-1, 1]) - 0.035 * fw - 0.06 * fw * np.clip((u - 0.55) / 0.45, 0, 1) ** 2
      P = np.c_[xs, ys]; tip = P[-1]
      curl = [tip + [sg * 0.02 * fw, -0.03 * fw], tip + [sg * 0.005 * fw, -0.05 * fw], tip + [-sg * 0.012 * fw, -0.04 * fw]]
      brush(d, curve(None, 50, s=0, pts=np.vstack([P[::5], curl])), W * 1.7, INK, (0.05, 0.75), 0.12)

    # ——— la bouche : un sourire, d'un trait ; le menton ———
    MID = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]
    Mq = curve(MID, 50); u = np.linspace(-1, 1, 50); Mq[:, 1] -= 0.03 * fw * u ** 4 - 0.01 * fw * (1 - u ** 2)
    brush(d, Mq, W, INK, (0.2, 0.2), 0.3)
    jaw = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454]
    brush(d, curve(jaw, 160)[46:-46], W, INK, (0.2, 0.2), 0.3)

    # ——— la silhouette ———
    cs, _ = cv2.findContours(head.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    for c in cs:
      if cv2.contourArea(c) < 5000: continue
      p = smooth(smooth(c, 14)[:, None, :], 10); d.line([tuple(q) for q in p] + [tuple(p[0])], fill=INK, width=int(W * 1.1), joint='curve')
    return np.asarray(img, np.float32) / 255, hair > 0
