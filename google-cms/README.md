# MRK Studios Google CMS

The Google spreadsheet is the content editor. Drive holds the original images. The website continues to serve static JSON and optimized images from GitHub Pages; visitors never contact Google or sign in.

## Editing

- **Pages:** create a page ID, title, menu order, optional section folder, publication checkbox, spacing checkbox and template. Keep page IDs stable after sharing links.
- **Works:** project ID (unique within a page), parent page ID, title, photo/video type, album folder or single photo URL, video URL, description, publication and order.
- **Media:** additional photo and video links inside a project, identified by page and workId.
- **Home:** slides for the main carousel, including title, image link, destination link, publication and order.

An album cover is its first image in filename order. Use numbered filenames to control order. New subfolders inside a Pages folder become albums automatically. An explicit Works row allows overriding their title and order or hiding them. Removing a page from Pages removes it from the menu; stored originals remain recoverable.

Drive photos must be inside the dedicated MRK Studios CMS folder. External photo links must be direct HTTPS image URLs. Vimeo URLs retain their original IDs and unlisted access hashes. Folder originals remain unchanged; website copies are resized to a maximum of 2560 pixels and encoded as WebP.

## Publication

`Code.gs` is a read-only Apps Script exporter. It runs as the owner and returns only published content and images referenced by published entries. It cannot edit files or spreadsheet cells through its public endpoint. `config.json` identifies the deployed endpoint and editor.

`python scripts/sync-google-content.py` prepares a complete snapshot and updates it only after every new photo succeeds. The image manifest reuses unchanged Drive photos. `python scripts/sync-site.py` copies the published content into the local preview and synchronizes website code.

Production automation and publication require separate authorization. Once authorized, Google content can be synchronized on a schedule and through a manual GitHub Actions run. Scheduled runs may be delayed by GitHub; an exact interval is not guaranteed.

## Recovery

The pre-migration content and Pages CMS configuration are backed up outside this checkout. Original repository uploads are retained, including unused files copied into the Drive archive. Do not re-enable Pages CMS writes while Google publication is active: two independent editors could overwrite each other's content.

## Validation

Run `python -m unittest discover -s scripts -p 'test_google*.py'`. This verifies deduplication, caching, stable project identifiers, video preservation and failure recovery. `node scripts/test-content.mjs` verifies the previous five-slide schema; new content also supports an `items` list.
