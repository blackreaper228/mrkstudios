from pathlib import Path
import copy, json, re
import yaml


def sync(root):
    root = Path(root)
    config_path = root / '.pages.yml'
    config = yaml.safe_load(config_path.read_text(encoding='utf-8'))
    menu_path = root / 'docs/content/menu.json'
    menu = json.loads(menu_path.read_text(encoding='utf-8'))
    navigation = next(entry for entry in config['content'] if entry['name'] == 'navigation')
    fields = navigation['fields'][0]['fields']
    fields[:] = [field for field in fields if field['name'] != 'works']
    template = copy.deepcopy(next(entry for entry in config['content'] if entry['name'] == 'events')['fields'])
    existing = {entry.get('path'): entry for entry in config['content']}
    seen = set()
    for item in menu['items']:
        page = item['page']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', page) or page in seen:
            raise ValueError('Invalid or duplicate page ID: ' + page)
        seen.add(page)
        if page in ('gear-rental', 'team'):
            continue
        path = 'docs/content/galleries/' + page + '.json'
        target = root / path
        legacy = item.get('works')
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps({'items': legacy or []}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        elif legacy:
            data = json.loads(target.read_text(encoding='utf-8'))
            for record in legacy:
                if record not in data['items']:
                    data['items'].append(record)
            target.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        item.pop('works', None)
        if path in existing:
            existing[path]['label'] = item['label']
        else:
            entry = {'name': 'gallery-' + page, 'label': item['label'], 'type': 'file', 'path': path, 'fields': copy.deepcopy(template)}
            config['content'].append(entry)
            existing[path] = entry
    # Removed menu entries keep their editor and files to prevent content loss.
    config_path.write_text(yaml.safe_dump(config,sort_keys=False,allow_unicode=True,width=110),encoding='utf-8')
    menu_path.write_text(json.dumps(menu,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__ == '__main__':
    sync(Path(__file__).resolve().parents[1])
