import importlib.util
import io
import json
from pathlib import Path
import shutil
import uuid
from contextlib import contextmanager
import unittest
from unittest.mock import patch
from threading import Lock
import time
from PIL import Image

spec = importlib.util.spec_from_file_location('publisher', Path(__file__).with_name('sync-google-content.py'))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

@contextmanager
def test_directory():
    path=Path(__file__).resolve().parents[1]/('.google-sync-test-'+uuid.uuid4().hex)
    path.mkdir()
    try:yield path
    finally:shutil.rmtree(path)


class PublicationTests(unittest.TestCase):
    def test_parallel_downloads_are_not_requested_twice(self):
        with test_directory() as directory:
            root=Path(directory);self.setup_root(root)
            data=self.snapshot()
            data['galleries']['new']['items'][0]['photos'].append({'url':'https://example.com/second.jpg'})
            calls=[];active=0;peak=0;lock=Lock()
            raw=self.photo()
            def fetch(url):
                nonlocal active,peak
                if url.endswith('/export'):return json.dumps(data).encode()
                with lock:
                    calls.append(url);active+=1;peak=max(peak,active)
                time.sleep(0.05)
                with lock:active-=1
                return raw
            with patch.object(publisher,'download',fetch):publisher.synchronize(root,fetch)
            self.assertEqual(calls.count('https://example.com/photo.jpg'),1)
            self.assertEqual(calls.count('https://example.com/second.jpg'),1)
            self.assertEqual(peak,2)

    def setup_root(self, root):
        (root/'google-cms').mkdir()
        (root/'google-cms/config.json').write_text(json.dumps({'endpoint':'https://example.com/export'}))
        publisher.write_json(root/'docs/content/menu.json', {'items':[{'page':'old'}]})

    def photo(self):
        output=io.BytesIO()
        Image.new('RGB',(20,30),'red').save(output,'JPEG')
        return output.getvalue()

    def snapshot(self):
        photo={'url':'https://example.com/photo.jpg'}
        return {'schemaVersion':1,'menu':{'items':[{'page':'new','label':'New'}]},'portfolio':{'items':[{'title':'Home','image':photo,'link':'new.html'}]},'galleries':{'new':{'items':[{'slug':'stable-id','title':'Album','type':'image','image':photo,'photos':[photo,photo],'session':[{'type':'video','video':'https://vimeo.com/123'}]}]}}}

    def test_cache_and_media_preserved(self):
        with test_directory() as directory:
            root=Path(directory);self.setup_root(root);calls=[]
            data=self.snapshot()
            def fetch(url):
                calls.append(url)
                return json.dumps(data).encode() if url.endswith('/export') else self.photo()
            publisher.synchronize(root,fetch)
            self.assertEqual(calls.count('https://example.com/photo.jpg'),1)
            work=json.loads((root/'docs/content/galleries/new.json').read_text())['items'][0]
            self.assertEqual(work['slug'],'stable-id')
            self.assertEqual(work['session'][0]['video'],'https://vimeo.com/123')
            self.assertEqual(work['photos'][0],work['image'])
            self.assertTrue((root/'docs'/work['image']).is_file())
            calls.clear();publisher.synchronize(root,fetch)
            self.assertEqual(calls,['https://example.com/export'])

    def test_failed_photo_does_not_replace_live_content(self):
        with test_directory() as directory:
            root=Path(directory);self.setup_root(root)
            def fetch(url):
                if url.endswith('/export'):return json.dumps(self.snapshot()).encode()
                raise OSError('Unavailable image')
            with self.assertRaises(OSError):publisher.synchronize(root,fetch)
            self.assertEqual(json.loads((root/'docs/content/menu.json').read_text())['items'][0]['page'],'old')
            self.assertFalse((root/'google-cms/image-manifest.json').exists())
            self.assertFalse(list(root.glob('.google-sync-*')))

    def test_reject_incomplete_export(self):
        with test_directory() as directory:
            root=Path(directory);self.setup_root(root)
            with self.assertRaises(ValueError):publisher.synchronize(root,lambda url:b'{"error":"Missing sheet"}')

    def test_failed_import_reuses_completed_photo_on_retry(self):
        with test_directory() as directory:
            root=Path(directory);self.setup_root(root)
            data=self.snapshot()
            second={'url':'https://example.com/second.jpg'}
            data['galleries']['new']['items'][0]['photos'].append(second)
            def failing(url):
                if url.endswith('/export'):return json.dumps(data).encode()
                if url.endswith('second.jpg'):raise OSError('Temporary failure')
                return self.photo()
            with self.assertRaises(OSError):publisher.synchronize(root,failing)
            self.assertEqual(json.loads((root/'docs/content/menu.json').read_text())['items'][0]['page'],'old')
            calls=[]
            def retry(url):
                calls.append(url)
                return json.dumps(data).encode() if url.endswith('/export') else self.photo()
            publisher.synchronize(root,retry)
            self.assertNotIn('https://example.com/photo.jpg',calls)
            self.assertIn('https://example.com/second.jpg',calls)

    def test_new_page_generates_html_without_overwriting_home(self):
        with test_directory() as directory:
            root=Path(directory);self.setup_root(root)
            (root/'dist').mkdir()
            (root/'dist/gallery.html').write_text('<title>Gallery — mrk</title><body data-category="">',encoding='utf-8')
            data=self.snapshot()
            publisher.synchronize(root,lambda url:json.dumps(data).encode() if url.endswith('/export') else self.photo())
            self.assertIn('data-category="new"',(root/'docs/new.html').read_text(encoding='utf-8'))
            self.assertEqual((root/'dist/new.html').read_bytes(),(root/'docs/new.html').read_bytes())
            data['galleries']['index']=data['galleries'].pop('new')
            with self.assertRaises(ValueError):publisher.synchronize(root,lambda url:json.dumps(data).encode())
            self.assertFalse((root/'docs/index.html').exists())


if __name__=='__main__':unittest.main()
