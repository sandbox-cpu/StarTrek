#!/usr/bin/env python3
"""Download the generated art listed in assets/art-sources.json and convert it
to web-sized 16:9 JPEGs in assets/img/ (1280x720, quality 82).

    pip install pillow
    python3 tools/fetch-art.py            # fetch everything that is missing
    python3 tools/fetch-art.py --force    # re-download everything

Needs network access to the image CDN. Images missing from assets/img/ are
drawn procedurally by the game, so this step is optional."""
import io, json, os, sys, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = json.load(open(os.path.join(ROOT, 'assets', 'art-sources.json')))
OUT = os.path.join(ROOT, 'assets', 'img')
os.makedirs(OUT, exist_ok=True)
force = '--force' in sys.argv
ok = fail = skip = 0
for item in SRC['images']:
    dest = os.path.join(OUT, item['key'] + '.jpg')
    if not item.get('url'):
        print('  -  %-20s not generated yet' % item['key']); skip += 1; continue
    if os.path.exists(dest) and not force:
        skip += 1; continue
    try:
        data = urllib.request.urlopen(item['url'], timeout=60).read()
        im = Image.open(io.BytesIO(data)).convert('RGB')
        w, h = im.size
        target = 16 / 9
        if w / h > target:
            nw = int(h * target); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        elif w / h < target:
            nh = int(w / target); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        im = im.resize((1280, 720), Image.LANCZOS)
        im.save(dest, 'JPEG', quality=82, optimize=True, progressive=True)
        print('  ✓  %-20s %d KB' % (item['key'], os.path.getsize(dest) // 1024)); ok += 1
    except Exception as e:
        print('  ✗  %-20s %s' % (item['key'], e)); fail += 1
print('\n%d downloaded, %d skipped, %d failed' % (ok, skip, fail))
sys.exit(1 if fail else 0)
