# MRK Studios Google CMS

The Google spreadsheet is the content editor. Drive holds the original images. The website continues to serve static JSON and optimized images from GitHub Pages; visitors never contact Google or sign in.

## Editing

- **Pages:** create a page ID, title, optional section folder, publication checkbox, spacing checkbox and template. Drag rows to change menu order. Page IDs are normalized to lowercase URL slugs automatically.
- **Page tabs:** every row in Pages gets its own content tab automatically. Add projects there using a title, photo/video type, album folder or single photo URL, video URL and publication checkbox. Drag rows to change project order. The hidden project ID is generated automatically when omitted.
- **Home:** slides for the main carousel, including title, image link, destination link and publication. Drag rows to change slide order.

An album cover is its first image in filename order. Use numbered filenames to control order. New subfolders inside a Pages folder become albums automatically. Removing a page from Pages removes it from the menu; stored originals remain recoverable. The legacy Works and Media tabs are hidden after their data is migrated to page tabs.

Drive photos must be inside the dedicated MRK Studios CMS folder. External photo links must be direct HTTPS image URLs. Vimeo URLs retain their original IDs and unlisted access hashes. Folder originals remain unchanged; website copies are resized to a maximum of 2560 pixels and encoded as WebP.

## Publication

`Code.gs` is a read-only Apps Script exporter. It runs as the owner and returns only published content and images referenced by published entries. It cannot edit files or spreadsheet cells through its public endpoint. `config.json` identifies the deployed endpoint and editor.

`python scripts/sync-google-content.py` prepares a complete snapshot and updates it only after every new photo succeeds. The image manifest reuses unchanged Drive photos. `python scripts/sync-site.py` copies the published content into the local preview and synchronizes website code.

Production automation and publication require separate authorization. Once authorized, Google content can be synchronized on a schedule and through a manual GitHub Actions run. Scheduled runs may be delayed by GitHub; an exact interval is not guaranteed.

## Recovery

The pre-migration content and Pages CMS configuration are backed up outside this checkout. Original repository uploads are retained, including unused files copied into the Drive archive. Do not re-enable Pages CMS writes while Google publication is active: two independent editors could overwrite each other's content.

## Validation

Run `python -m unittest discover -s scripts -p 'test_google*.py'`. This verifies deduplication, caching, stable project identifiers, video preservation and failure recovery. `node scripts/test-content.mjs` verifies the previous five-slide schema; new content also supports an `items` list.

## Nested pages

In any page tab select **page** in the type dropdown, enter a title and a unique **page** ID (or leave it blank to generate it from the title). A matching tab is created automatically. Add folders, photo/video links or further page entries in that tab. Nested pages appear as cards in their parent, not in the main menu. The first available child photo becomes the cover; imageUrl can override it. Check published on the parent card and its contents. Circular page links are rejected.

If a nested page name is already used by another page, its ID gains the first two letters of its parent: Concerts inside Photography becomes `concerts_ph`. The visible heading remains Concerts. IDs are saved so later title changes do not change links.

## Folder-based nesting

Choose Photo and paste a Drive folder URL in a page row. A folder with subfolders automatically becomes a gallery page; leaf folders become photoshoots. This repeats at any depth. Folder names label child cards, and the first available photo is their cover. Photos directly in a parent folder form an additional album on that page. Generated folder pages have no spreadsheet tabs. Previous manual page tabs are hidden and retained for recovery.
