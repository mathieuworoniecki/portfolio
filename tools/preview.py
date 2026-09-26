"""Prépare l'aperçu en ligne (Artifact claude.ai) : une seule page, les styles et les scripts du site intégrés.

    python3 tools/preview.py <dossier de sortie>

L'aperçu est enveloppé par la plateforme : on retire doctype, <html>, <head>, <body>, les méta charset et viewport.
Seuls three.js (cdnjs) et les polices (Google Fonts) restent externes ; tout le reste est intégré à la page.
L'accès réservé ne sert pas dans l'aperçu (l'Artifact est déjà privé) : la page s'ouvre directement.
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
h = (root / 'index.html').read_text(encoding='utf-8')
h = re.sub(r'<!doctype html>\s*', '', h, flags=re.I)
h = re.sub(r'</?(html|body)[^>]*>\s*', '', h)
h = re.sub(r'</?head>\s*', '', h)
h = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', h)
h = re.sub(r'<link rel="(icon|apple-touch-icon)"[^>]*>\s*', '', h)
h = re.sub(r'<title[^>]*>.*?</title>', '<title>Portfolio de Mathieu</title>', h)
# les mesures de Vercel n'existent pas dans l'aperçu
h = re.sub(r'<!-- les mesures de Vercel.*?speed-insights/script.js"></script>\s*', '', h, flags=re.S)
# l'accès : ouvert d'avance (js/gate.js lit PF_OPEN)
h = h.replace("d.classList.add('locked');", "window.PF_OPEN=true;", 1)
# les fichiers locaux, intégrés (on protège « </script> » dans le code)
css = lambda m: '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>'
js = lambda m: '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>'
h = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', css, h)
h = re.sub(r'<script src="(js/[^"]+)"></script>', js, h)
(out / 'index.html').write_text(h, encoding='utf-8', newline='\n')
print(out / 'index.html', len(h) // 1024, 'Ko')
