"""Les images de la tête de Mathieu en WebP sans perte (mêmes pixels que les PNG, bien plus légères).
À relancer après avoir refait media/mathieu/visage.png, dos.png ou logo.png : python3 tools/webp.py"""
from pathlib import Path
from PIL import Image

D = Path(__file__).resolve().parent.parent / 'media' / 'mathieu'
for n in ('visage', 'dos', 'logo'):
    Image.open(D / f'{n}.png').save(D / f'{n}.webp', 'WEBP', lossless=True, exact=True, method=6)
    print(n, (D / f'{n}.png').stat().st_size, '->', (D / f'{n}.webp').stat().st_size)
