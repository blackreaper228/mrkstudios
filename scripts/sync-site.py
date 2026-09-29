from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
source, published = root / 'dist', root / 'docs'
# CMS-owned files always flow from docs into the local preview, never the reverse.
for name in ('content', 'uploads'):
    folder = published / name
    if folder.exists():
        shutil.copytree(folder, source / name, dirs_exist_ok=True)
for item in source.iterdir():
    if item.name in ('content', 'uploads'):
        continue
    if item.is_dir():
        shutil.copytree(item, published / item.name, dirs_exist_ok=True)
    else:
        shutil.copy2(item, published / item.name)
print('Site code synchronized; CMS content preserved.')
