"""La tête de Mathieu, redessinée au trait d'après sa photo (appelé par build.py) : des contours seulement, comme les chats et les objets.
Ce qui vient des 478 points du visage (MediaPipe) : les paupières, l'iris, les sourcils, la bouche, la mâchoire, la moustache (sa forme, symétrique).
Ce qui vient de la photo : la silhouette, la ligne des cheveux, les mèches, le creux des oreilles (les creux sombres, amincis en traits).
Deux encres : INK (le trait franc), SOFT (le trait pâle). """
import cv2, numpy as np
from PIL import Image, ImageDraw
from scipy.interpolate import splprep, splev
from skimage.morphology import skeletonize

def tete(im, m, L, g, bottom=640, head=None):
    """im : la photo (BGR), m : la silhouette, L : les points du visage (x, y), g : la photo lissée en gris (0 à 1).
    Rend le dessin (0 : encre, 1 : papier) et le masque des cheveux."""
    H0, W0 = m.shape; yy, xx = np.mgrid[0:H0, 0:W0]
    INK, SOFT, W, w = 22, 110, 10, 7
    def curve(idx, n=80, closed=False, s=0):
      P=L[idx]
      if closed: P=np.vstack([P,P[:1]])
      tck,_=splprep([P[:,0],P[:,1]],s=s,per=closed,k=min(3,len(P)-1)); x,y=splev(np.linspace(0,1,n),tck); return list(zip(x,y))
    def smooth(c,k=7):
      P=c[:,0,:].astype(np.float32); n=len(P)
      if n<2*k+2: return [tuple(p) for p in P]
      P=np.stack([np.convolve(np.r_[P[-k:,i],P[:,i],P[:k,i]],np.ones(2*k+1)/(2*k+1),'same')[k:-k] for i in (0,1)],1); return [tuple(p) for p in P[::2]]
    def outline(d, mask, width, fill=INK, minarea=150, k=7):
      cs,_=cv2.findContours(mask.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
      for c in cs:
        if cv2.contourArea(c)<minarea: continue
        p=smooth(c,k); d.line(p+[p[0]],fill=fill,width=width,joint='curve')
    def strokes(d, mask, width, fill, minlen=25):
      sk=skeletonize(mask); n,lab,st,_=cv2.connectedComponentsWithStats(sk.astype(np.uint8),8)
      for i in range(1,n):
        if st[i,4]<minlen: continue
        ys,xs=np.where(lab==i)
        for y,x in zip(ys,xs): d.ellipse([x-width/2,y-width/2,x+width/2,y+width/2],fill=fill)
    img=Image.new('L',(W0,H0),255); d=ImageDraw.Draw(img)
    OVAL=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]
    fm=np.zeros((H0,W0),np.uint8); cv2.fillPoly(fm,[L[OVAL].astype(np.int32)],1); face=fm>0
    gb=cv2.GaussianBlur(g,(0,0),2)
    # les cheveux : leur contour, et des mèches (les creux sombres, amincis en traits)
    hair=m&(gb<0.40)&(yy<560)&~(face&(yy>L[10,1]+40))
    hair=cv2.morphologyEx(hair.astype(np.uint8),cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(hair,8); keep=np.zeros(n,bool); keep[1:]=st[1:,4]>600; hair=keep[lab]
    inner=cv2.erode(hair.astype(np.uint8),np.ones((15,15),np.uint8))>0
    dn=cv2.GaussianBlur(g,(0,0),1.5)-cv2.GaussianBlur(g,(0,0),4.5)
    strokes(d, inner&(dn<-0.018), w, SOFT, 25)
    # la moustache : son contour, et quelques poils
    skin=np.median(gb[face&(yy>L[1,1])&(yy<L[0,1])&~(np.abs(xx-L[1,0])<60)])
    mbox=(yy>L[2,1]+6)&(yy<L[0,1]+6)&(np.abs(xx-L[0,0])<(L[291,0]-L[61,0])*0.75)
    must=cv2.morphologyEx((mbox&(gb<skin-0.13)).astype(np.uint8),cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))>0
    must=cv2.morphologyEx(must.astype(np.uint8),cv2.MORPH_OPEN,np.ones((5,5),np.uint8))>0
    # la moustache, symétrique : entre la lèvre du haut et une courbe au-dessus, épaisse comme sur la photo
    UPO=[61,185,40,39,37,0,267,269,270,409,291]
    lipP=np.array(curve(UPO,60)); cxm=L[0,0]; half=(L[291,0]-L[61,0])/2+14
    xsM=np.linspace(cxm-half,cxm+half,41); lipY=np.interp(xsM,lipP[:,0],lipP[:,1])
    th=[]
    for x,ly in zip(xsM,lipY):
      col=np.where(must[:,int(x)])[0]; th.append(max(0,ly-col.min()) if len(col) else 0)
    th=np.array(th); th=(th+th[::-1])/2; th=np.convolve(np.r_[th[:3],th,th[-3:]],np.ones(7)/7,'same')[3:-3]
    u=np.abs(np.linspace(-1,1,41)); th=np.maximum(th, 0)*(1-u**4)+2
    top=[(x,ly-t) for x,ly,t in zip(xsM,lipY,th)]; bot=[(x,ly+3) for x,ly in zip(xsM,lipY)]
    # les pointes descendent un peu aux coins
    d.line(top+bot[::-1]+[top[0]],fill=INK,width=W,joint='curve')
    for i in range(3,38,3):
      x,ly,t=xsM[i],lipY[i],th[i]; d.line([(x,ly-t*0.8),(x+(i-20)*0.6,ly-t*0.15)],fill=SOFT,width=5)
    # les sourcils : leur contour
    RB=[70,63,105,66,107,55,65,52,53,46]; LB=[300,293,334,296,336,285,295,282,283,276]
    for br in (RB,LB): p=curve(br,70,True,s=60); d.line(p,fill=INK,width=w+1,joint='curve')
    # les yeux : les paupières, l'iris (un rond), la pupille (un point, comme les chats), un reflet
    RE_UP=[33,246,161,160,159,158,157,173,133]; RE_LO=[33,7,163,144,145,153,154,155,133]
    LE_UP=[263,466,388,387,386,385,384,398,362]; LE_LO=[263,249,390,373,374,380,381,382,362]
    for up,lo,iris in [(RE_UP,RE_LO,468),(LE_UP,LE_LO,473)]:
      c=L[iris]; r=np.linalg.norm(L[iris+1]-L[iris+3])/2*0.95
      # l'iris, coupé par les paupières
      em=np.zeros((H0,W0),np.uint8); cv2.fillPoly(em,[np.array(curve(up)+curve(lo)[::-1]).astype(np.int32)],1)
      ir=Image.new('L',(W0,H0),0); di=ImageDraw.Draw(ir); di.ellipse([c[0]-r,c[1]-r,c[0]+r,c[1]+r],outline=255,width=w); di.ellipse([c[0]-r*0.42,c[1]-r*0.42,c[0]+r*0.42,c[1]+r*0.42],fill=255)
      di.ellipse([c[0]+r*0.05,c[1]-r*0.45,c[0]+r*0.38,c[1]-r*0.12],fill=0)
      irm=(np.asarray(ir)>0)&(em>0); a=np.asarray(img).copy(); a[irm]=INK; img=Image.fromarray(a); d=ImageDraw.Draw(img)
      d.line(curve(up),fill=INK,width=W,joint='curve'); d.line(curve(lo),fill=SOFT,width=5,joint='curve')
      # le pli de la paupière, au-dessus
      crease=np.array(curve(up))[10:-10]; crease[:,1]-=r*0.75; d.line([tuple(p) for p in crease],fill=SOFT,width=5,joint='curve')
    # le nez : le dessous du bout, les ailes ; un trait pâle le long de l'arête
    d.line(curve([98,97,2,326,327],40),fill=INK,width=w,joint='curve')   # le dessous du bout du nez
    for wing in ([48,64,98],[278,294,327]): d.line(curve(wing,30),fill=INK,width=w,joint='curve')   # les ailes du nez
    bridge=[168,6,197,195,5]; P=np.array(curve(bridge,30)); P[:,0]-=L[129,0]*0+ (L[358,0]-L[129,0])*0.22; d.line([tuple(p) for p in P][6:],fill=SOFT,width=5,joint='curve')
    # la bouche : la ligne des lèvres, la lèvre du bas (plus pâle)
    MID=[78,191,80,81,82,13,312,311,310,415,308]; LOO=[61,146,91,181,84,17,314,405,321,375,291]
    d.line(curve(MID),fill=INK,width=W,joint='curve'); d.line(curve(LOO)[18:-18],fill=SOFT,width=5,joint='curve')
    # les oreilles : le dedans (les creux sombres, en traits)
    for i in (234,454):
      box=(np.abs(xx-L[i,0])<45)&(np.abs(yy-L[i,1])<70)&~face&m&~hair
      strokes(d, box&(dn<-0.025), w, SOFT, 20)
    # le menton, la mâchoire : l'ovale du bas ; et toute la silhouette, en trait franc
    jaw=[234,93,132,58,172,136,150,149,176,148,152,377,400,378,379,365,397,288,361,323,454]
    d.line(curve(jaw,120)[25:-25],fill=INK,width=W,joint='curve')
    outline(d, head if head is not None else m&(yy<bottom), W+1, INK, 5000, 9)
    outline(d, hair, W, INK, 600, 7)
    return np.asarray(img, np.float32) / 255, hair
