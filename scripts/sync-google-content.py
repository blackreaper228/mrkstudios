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
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
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
            with urllib.request.urlopen(url, context=context, timeout=90) as response:
                body = response.read(32 * 1024 * 1024 + 1)
            if len(body) > 32 * 1024 * 1024:
                raise ValueError('Download exceeds 32 MiB')
            return body
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            print(f'Google download delayed; retry {attempt + 2}/3', flush=True)
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
    started = time.monotonic()
    print('Requesting published Google snapshot...', flush=True)
    data = json.loads(fetch(endpoint))
    print(f'Google snapshot received in {time.monotonic() - started:.1f}s', flush=True)
    if data.get('error'):
        raise ValueError(data['error'])
    if data.get('schemaVersion') != 1 or not isinstance(data.get('galleries'), dict) or not isinstance(data.get('menu', {}).get('items'), list) or not isinstance(data.get('portfolio', {}).get('items'), list):
        raise ValueError('Incomplete Google snapshot')
    # Keep the existing CMS category tabs while presenting one nested Video section.
    video_sections = ('events', 'concerts', 'commercials', 'documentaries', 'food')
    sections = [entry for entry in data['menu']['items'] if entry['page'] in video_sections]
    if sections:
        cards = []
        for section in sections:
            child = data['galleries'].get(section['page'], {})
            card = {'slug':section['page'], 'title':section['label'], 'type':'page', 'page':section['page']}
            cover = next((item['image'] for item in child.get('items', []) if item.get('image')), None)
            if not cover:
                video = next((item['video'] for item in child.get('items', []) if item.get('video')), None)
                if video and 'vimeo.com/' in video:
                    try:
                        metadata = json.loads(fetch('https://vimeo.com/api/oembed.json?' + urllib.parse.urlencode({'url':video.replace('http://','https://',1)})))
                        thumbnail = metadata.get('thumbnail_url', '')
                        if thumbnail:
                            cover = {'url':thumbnail}
                    except (ValueError, OSError) as error:
                        print('Video section cover unavailable: ' + section['page'] + ': ' + str(error), flush=True)
            if cover:
                card['image'] = cover
            cards.append(card)
            child['parent'] = 'video'
        data['galleries']['video'] = {'title':'Video', 'template':'gallery', 'items':cards}
        entries = data['menu']['items']
        first = next(i for i, entry in enumerate(entries) if entry['page'] in video_sections)
        entries.insert(first, {'page':'video', 'label':'Video', 'spaceAbove':False, 'template':'gallery'})
        data['menu']['items'] = [entry for entry in entries if entry['page'] not in video_sections]
    previous_path = root / 'google-cms/image-manifest.json'
    previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else {}
    cache_root = root / '.google-image-cache'
    cache_manifest_path = cache_root / 'manifest.json'
    cached_images = json.loads(cache_manifest_path.read_text(encoding='utf-8')) if cache_manifest_path.exists() else {}
    pages_path = root / 'google-cms/generated-pages.json'
    previous_pages = json.loads(pages_path.read_text(encoding='utf-8')) if pages_path.exists() else []
    generated_pages = []
    manifest, converted = {}, {}
    stage = root / ('.google-sync-' + uuid.uuid4().hex)
    stage.mkdir()
    executor = ThreadPoolExecutor(max_workers=6)
    cache_lock = Lock()
    futures = {}
    def prepare(record):
        key = 'drive:' + record['id'] if record.get('id') else 'url:' + record['url']
        if record.get('id'):
            result = json.loads(fetch(endpoint + '?' + urllib.parse.urlencode({'action':'image', 'id':record['id']})))
            if result.get('error'):raise ValueError(result['error'])
            raw = base64.b64decode(result['base64'], validate=True)
        else:raw = fetch(record['url'])
        encoded = optimize(raw)
        path = 'uploads/google/' + hashlib.sha256(encoded).hexdigest()[:24] + '.webp'
        with cache_lock:
            target = cache_root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded)
            cached_images[key] = {'revision':record.get('modifiedAt',''), 'path':path}
            write_json(cache_manifest_path, cached_images)
        print('Background image ready: ' + path, flush=True)
        return encoded
    def prefetch(value):
        if isinstance(value, dict):
            if (value.get('id') and 'modifiedAt' in value) or value.get('url'):
                key = 'drive:' + value['id'] if value.get('id') else 'url:' + value['url']
                existing = previous.get(key)
                partial = cached_images.get(key)
                revision = value.get('modifiedAt','')
                if key not in futures and not (existing and existing.get('revision') == revision and (root/'docs'/existing['path']).is_file()) and not (partial and partial.get('revision') == revision and (cache_root/partial['path']).is_file()):
                    futures[key] = executor.submit(prepare, value.copy())
            else:
                for child in value.values():prefetch(child)
        elif isinstance(value,list):
            for child in value:prefetch(child)
    if fetch is download and not seed:prefetch(data)
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
            partial = cached_images.get(key)
            if partial and partial.get('revision') == revision and (cache_root / partial['path']).is_file():
                target = stage / partial['path']
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(cache_root / partial['path'], target)
                manifest[key], converted[key] = partial, partial['path']
                return partial['path']
            print(f'Processing new/updated image {len(manifest) + 1} (cached: {len(converted)})...', flush=True)
            if key in futures:
                raw = None
            elif seed and key in seed:
                raw = Path(seed[key]).read_bytes()
            elif record.get('id'):
                result = json.loads(fetch(endpoint + '?' + urllib.parse.urlencode({'action':'image', 'id':record['id']})))
                if result.get('error'):
                    raise ValueError(result['error'])
                raw = base64.b64decode(result['base64'], validate=True)
            else:
                raw = fetch(record['url'])
            encoded = futures[key].result() if key in futures else optimize(raw)
            path = 'uploads/google/' + hashlib.sha256(encoded).hexdigest()[:24] + '.webp'
            target = stage / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded)
            manifest[key] = {'revision':revision, 'path':path}
            converted[key] = path
            cache_file = cache_root / path
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_bytes(encoded)
            with cache_lock:
                cached_images[key] = manifest[key]
                write_json(cache_manifest_path, cached_images)
            print(f'Image ready: {len(encoded) // 1024} KiB', flush=True)
            return path

        menu_pages = {item['page'] for item in data['menu']['items']}
        for parent, gallery in data['galleries'].items():
            for work in gallery.get('items', []):
                child = work.get('page') if work.get('type') == 'page' else None
                if child in data['galleries'] and child not in menu_pages and child != parent:
                    data['galleries'][child].setdefault('parent', parent)

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
        print(f"Google snapshot: {len(data['menu']['items'])} pages, {sum(len(g['items']) for g in data['galleries'].values())} works, {len(manifest)} images; {time.monotonic() - started:.1f}s", flush=True)
    finally:
        executor.shutdown(wait=True, cancel_futures=True)
        if stage.parent.resolve() == root.resolve() and stage.name.startswith('.google-sync-'):
            shutil.rmtree(stage)


if __name__ == '__main__':
    synchronize()
