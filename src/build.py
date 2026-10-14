"""Build the GitHub Pages site from src/.
   Run from the repository root:  python3 src/build.py [--artifact PATH]
   - Assembles src/index.html + src/css/*.css + src/js/*.js + src/data.json into one page.
   - Writes index.html, manifest.webmanifest, sw.js and icons at the repository root.
   - With --artifact PATH, also writes the bare page (no document skeleton) for a Claude artifact."""
import os, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
P = lambda *a: os.path.join(HERE, *a)
O = lambda *a: os.path.join(OUT, *a)
import json, re, hashlib
from PIL import Image, ImageDraw

def read(path):
    return open(path, encoding='utf-8').read()

css = '\n'.join(read(f) for f in sorted(glob.glob(P('css', '*.css'))))
js = '\n'.join(f'/* ===== {os.path.basename(f)} ===== */\n' + read(f) for f in sorted(glob.glob(P('js', '*.js'))))
shell = read(P('index.html'))
data = read(P('data.json')).replace('</', '<\\/')
body = (shell.replace('/*__CSS__*/', css)
             .replace('/*__JS__*/', '(function(){\n"use strict";\n' + js + '\n})();')
             .replace('__DATA__', data))
assert '/*__' not in body, 'unfilled placeholder'

if '--artifact' in sys.argv:
    dest = sys.argv[sys.argv.index('--artifact') + 1]
    open(dest, 'w', encoding='utf-8').write(body)

# ---------- icons ----------
def icon(size, maskable=False):
    im = Image.new('RGBA', (size, size), (17, 24, 33, 255))
    d = ImageDraw.Draw(im)
    pad = size * (0.2 if maskable else 0.14)
    box = [pad, pad, size - pad, size - pad]
    r = size * 0.11
    # hazard stripes clipped to rounded square
    stripes = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stripes)
    w = size * 0.085
    for k in range(-size, size * 2, int(w * 2)):
        sd.polygon([(k, 0), (k + w, 0), (k + w - size, size), (k - size, size)], fill=(247, 154, 70, 255))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, r, fill=255)
    im.paste(stripes, (0, 0), mask)
    d.rounded_rectangle(box, r, outline=(247, 154, 70, 255), width=max(2, int(size * 0.03)))
    return im.convert('RGB')
for s in (192, 512):
    icon(s).save(O(f'icon-{s}.png'))
icon(512, True).save(O('icon-maskable-512.png'))
icon(180).save(O('apple-touch-icon.png'))
icon(48).save(O('favicon.png'))

# ---------- manifest ----------
json.dump({
  "name": "FICSIT 生産ノート", "short_name": "生産ノート",
  "description": "Satisfactory のレシピ比較・生産計画・部材ツリーをまとめた非公式ツール",
  "lang": "ja", "start_url": "./", "scope": "./", "display": "standalone",
  "background_color": "#111821", "theme_color": "#111821",
  "icons": [
    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]
}, open(O('manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---------- service worker (cache version follows content hash) ----------
ver = hashlib.sha1(body.encode()).hexdigest()[:10]
open(O('sw.js'), 'w', encoding='utf-8').write(f"""const CACHE='ficsit-note-{ver}';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./favicon.png'];
self.addEventListener('install',e=>{{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));}});
self.addEventListener('activate',e=>{{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));}});
self.addEventListener('fetch',e=>{{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin){{
    // page: network first so updates arrive, cache as fallback for offline
    if(req.mode==='navigate'){{e.respondWith(fetch(req).then(r=>{{const c=r.clone();caches.open(CACHE).then(x=>x.put('./index.html',c));return r;}}).catch(()=>caches.match('./index.html')));return;}}
    e.respondWith(caches.match(req).then(r=>r||fetch(req)));return;
  }}
  if(/fonts\\.(googleapis|gstatic)\\.com$|cdnjs\\.cloudflare\\.com$/.test(url.hostname)){{
    e.respondWith(caches.open(CACHE).then(c=>c.match(req).then(hit=>{{const net=fetch(req).then(r=>{{c.put(req,r.clone());return r;}}).catch(()=>hit);return hit||net;}})));
  }}
}});
""")

# ---------- full document for Pages ----------
title = re.search(r'<title>(.*?)</title>', body).group(1)
body_wo_title = body.replace(f'<title>{title}</title>', '', 1)
head = f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="Satisfactory の全アイテム・レシピ・代替レシピを収録。工場フロー図つきの生産計画、部材ツリー、レシピの電力×資源比較ができる日本語の非公式ツール。">
<meta name="theme-color" content="#111821" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#EDF1F5" media="(prefers-color-scheme: light)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="生産ノート">
<meta property="og:title" content="{title}">
<meta property="og:description" content="Satisfactory の生産計画・部材ツリー・レシピ比較ツール（非公式）">
<meta property="og:type" content="website">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="favicon.png" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>:root{{padding-top:env(safe-area-inset-top,0px)}}</style>
</head>
<body>
"""
tail = """
<script>
if('serviceWorker' in navigator && location.protocol==='https:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
</script>
</body>
</html>
"""
open(O('index.html'), 'w', encoding='utf-8').write(head + body_wo_title + tail)
open(O('.nojekyll'), 'w').write('')
print('built', ver, len(body)//1024, 'KB')
