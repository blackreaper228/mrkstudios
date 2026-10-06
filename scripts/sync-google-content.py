"""Generate a static website snapshot. A failed Google export keeps the last good content."""
import base64
import hashlib
import html
import io
import json
from pathlib import Path
import shutil
import ssl
import time
import urllib.parse
import urllib.request
import uuid
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def download(url):
    if urllib.parse.urlparse(url).scheme != 'https':
        raise ValueError('Only HTTPS URLs are supported')
    context = ssl.create_default_context()
    bundle = Path('C:/Program Files/Git/mingw64/etc/ssl/certs/ca-bundle.crt')
    if bundle.exists():
        context.load_verify_locations(str(bundle))
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, context=context, timeout=180) as response:
                body = response.read(32 * 1024 * 1024 + 1)
            if len(body) > 32 * 1024 * 1024:
                raise ValueError('Download exceeds 32 MiB')
            return body
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def optimize(raw):
    with Image.open(io.BytesIO(raw)) as original:
        photo = ImageOps.exif_transpose(original)
        photo.thumbnail((2560, 2560), Image.Resampling.LANCZOS)
        photo = photo.convert('RGBA' if 'A' in photo.getbands() else 'RGB')
        output = io.BytesIO()
        photo.save(output, 'WEBP', quality=88, method=6)
    return output.getvalue()


def synchronize(root=ROOT, fetch=download, seed=None):
    config = json.loads((root / 'google-cms/config.json').read_text(encoding='utf-8'))
    endpoint = config['endpoint']
    data = json.loads(fetch(endpoint))
    if data.get('error'):
        raise ValueError(data['error'])
    if data.get('schemaVersion') != 1 or not isinstance(data.get('galleries'), dict) or not isinstance(data.get('menu', {}).get('items'), list) or not isinstance(data.get('portfolio', {}).get('items'), list):
        raise ValueError('Incomplete Google snapshot')
    previous_path = root / 'google-cms/image-manifest.json'
    previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else {}
    pages_path = root / 'google-cms/generated-pages.json'
    previous_pages = json.loads(pages_path.read_text(encoding='utf-8')) if pages_path.exists() else []
    generated_pages = []
    manifest, converted = {}, {}
    stage = root / ('.google-sync-' + uuid.uuid4().hex)
    stage.mkdir()
    try:
        def image(record):
            if not record:
                return ''
            key = ('drive:' + record['id']) if record.get('id') else ('url:' + record['url'])
            revision = record.get('modifiedAt', '')
            if key in converted:
                return converted[key]
            cached = previous.get(key)
            if cached and cached.get('revision') == revision and (root / 'docs' / cached['path']).is_file():
                manifest[key], converted[key] = cached, cached['path']
                return cached['path']
            if seed and key in seed:
                raw = Path(seed[key]).read_bytes()
            elif record.get('id'):
                result = json.loads(fetch(endpoint + '?' + urllib.parse.urlencode({'action':'image', 'id':record['id']})))
                if result.get('error'):
                    raise ValueError(result['error'])
                raw = base64.b64decode(result['base64'], validate=True)
            else:
                raw = fetch(record['url'])
            encoded = optimize(raw)
            path = 'uploads/google/' + hashlib.sha256(encoded).hexdigest()[:24] + '.webp'
            target = stage / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded)
            manifest[key] = {'revision':revision, 'path':path}
            converted[key] = path
            return path

        for gallery in data['galleries'].values():
            if not isinstance(gallery.get('items'), list):
                raise ValueError('Invalid gallery')
            for work in gallery['items']:
                if work.get('image'):
                    work['image'] = image(work['image'])
                if work.get('photos'):
                    work['photos'] = [image(photo) for photo in work['photos']]
                for media in work.get('session', []):
                    if media.get('image'):
                        media['image'] = image(media['image'])
        for slide in data['portfolio']['items']:
            slide['image'] = image(slide.get('image'))
            if not slide['image']:
                raise ValueError('Home slide needs an image')
        write_json(stage / 'content/menu.json', data['menu'])
        write_json(stage / 'content/portfolio.json', data['portfolio'])
        for slug, gallery in data['galleries'].items():
            if not slug or slug in ('index','session','gallery','credits','setup') or any(ch not in 'abcdefghijklmnopqrstuvwxyz0123456789-_' for ch in slug):
                raise ValueError('Unsafe page ID')
            write_json(stage / ('content/galleries/' + slug + '.json'), gallery)
            generated_pages.append(slug + '.html')
            template = root / 'dist/gallery.html'
            if template.exists():
                page = template.read_text(encoding='utf-8').replace('data-category=""', 'data-category="'+slug+'"')
                page = page.replace('<title>Gallery — mrk</title>', '<title>'+html.escape(gallery.get('title',slug))+' — mrk</title>')
                (stage / (slug+'.html')).write_text(page,encoding='utf-8')
        # Publish only after the entire snapshot and all new photos are ready.
        for file in stage.rglob('*'):
            if file.is_file():
                target = root / 'docs' / file.relative_to(stage)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(file, target)
                if file.suffix == '.html':
                    shutil.copyfile(file, root / 'dist' / file.name)
        for name in set(previous_pages) - set(generated_pages):
            if Path(name).name != name or name in ('index.html','session.html','gallery.html'):
                continue
            for base in ('docs', 'dist'):
                target = root / base / name
                if target.exists():
                    target.unlink()
        write_json(previous_path, manifest)
        write_json(pages_path, sorted(generated_pages))
        # Original CMS uploads and unpublished gallery snapshots remain recoverable.
        print(f"Google snapshot: {len(data['menu']['items'])} pages, {sum(len(g['items']) for g in data['galleries'].values())} works, {len(manifest)} images")
    finally:
        if stage.parent.resolve() == root.resolve() and stage.name.startswith('.google-sync-'):
            shutil.rmtree(stage)


if __name__ == '__main__':
    synchronize()
