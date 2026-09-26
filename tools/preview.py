"""Prépare l'aperçu en ligne (artifact claude.ai) à partir de index.html.

    python3 tools/preview.py <dossier de sortie>

L'aperçu est enveloppé par la plateforme : on retire doctype, <html>, <head>, <body>,

"""
import re, sys, pathlib

src = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
h = src.read_text(encoding='utf-8')
h = re.sub(r'<!doctype html>\s*', '', h, flags=re.I)
h = re.sub(r'</?(html|body)[^>]*>\s*', '', h)
h = re.sub(r'</?head>\s*', '', h)
h = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', h)
h = re.sub(r'<title>.*?</title>', '<title>Maquette Power RS</title>', h)
h = re.sub(r'<script[^>]*/_vercel/[^>]*></script>\s*', '', h)   # les mesures Vercel ne servent que sur le site
# un numéro de version sur chaque fichier local : le navigateur recharge toujours la dernière version
import hashlib, time
root = src.parent
def bust(m):
    f = root / m.group(2)
    v = hashlib.md5(f.read_bytes()).hexdigest()[:8] if f.exists() else str(int(time.time()))
    return f'{m.group(1)}="{m.group(2)}?v={v}"'
h = re.sub(r'(src|href)="((?:js|css|media)/[^"?]+)"', bust, h)
(out / 'index.html').write_text(h, encoding='utf-8')
print(out / 'index.html')
