// Read-only website export. Editing takes place in the spreadsheet and Drive.
const SPREADSHEET_ID = '10iNKQtCdJrUuLFK7pl08yKWumKb1hFeDt0GVNKhf6DE';
const ROOT_FOLDER_ID = '1Z2ruN_2GZtiwUIy7EJPlJZ8vi3AVPJsv';
const PAGE_HEADERS = ['id', 'title', 'type', 'folder', 'imageUrl', 'videoUrl', 'published', 'page'];

// Store GITHUB_ACTIONS_TOKEN in Script Properties, never in the sheet or export.
function publishWebsite() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {console.log('Publication check already running.'); return;}
  try {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_ACTIONS_TOKEN');
  if (!token) throw new Error('Set GITHUB_ACTIONS_TOKEN in Project Settings > Script Properties.');
  const headers = {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  const base = 'https://api.github.com/repos/blackreaper228/mrkstudios/actions/workflows/publish-google-cms.yml';
  for (const state of ['in_progress','queued','pending','waiting','requested']) {
    const check = UrlFetchApp.fetch(base + '/runs?per_page=1&status=' + state, {headers:headers,muteHttpExceptions:true});
    if (check.getResponseCode() !== 200) throw new Error('GitHub publication status check failed (HTTP ' + check.getResponseCode() + ').');
    const active = JSON.parse(check.getContentText());
    if (active.total_count > 0) {
      const run = active.workflow_runs[0];
      if (Date.now() - Date.parse(run.created_at) > 40 * 60 * 1000) {
        const cancelled = UrlFetchApp.fetch('https://api.github.com/repos/blackreaper228/mrkstudios/actions/runs/' + run.id + '/cancel', {method:'post',headers:headers,muteHttpExceptions:true});
        if (cancelled.getResponseCode() !== 202 && cancelled.getResponseCode() !== 409) throw new Error('Stalled publication cancellation failed (HTTP ' + cancelled.getResponseCode() + ').');
        console.log('Cancellation requested for stalled publication ' + run.id + '.');
      } else console.log('Publication already active (' + state + '); next timer will retry.');
      return;
    }
  }
  const response = UrlFetchApp.fetch('https://api.github.com/repos/blackreaper228/mrkstudios/actions/workflows/publish-google-cms.yml/dispatches', {
    method: 'post', contentType: 'application/json',
    headers: {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'},
    payload: JSON.stringify({ref: 'main'}), muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  if (status !== 204) throw new Error('GitHub publication request failed (HTTP ' + status + '). Check token permissions and expiry.');
  console.log('Website publication requested.');
  } finally {lock.releaseLock();}
}

function installPublicationTimer() {
  publishWebsite();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'publishWebsite')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('publishWebsite').timeBased().everyMinutes(10).create();
  console.log('Automatic publication enabled: every 10 minutes.');
}

function rows_(name) {
  const result = Sheets.Spreadsheets.Values.get(SPREADSHEET_ID, name);
  const values = result.values || [];
  if (!values.length) throw new Error('Missing or empty sheet: ' + name);
  const headers = values.shift().map(String);
  return values.map((r, index) => {
    const result = {_row: index};
    headers.forEach((h, i) => result[h] = r[i]);
    return result;
  }).filter(row => headers.some(h => row[h] !== '' && row[h] !== false && row[h] !== 'FALSE' && row[h] != null));
}
function published_(v) { return v === true || /^(true|yes|1)$/i.test(String(v)); }
function sort_(a, b) {
  return a._row - b._row;
}
function id_(value) {
  const text = String(value || '').trim();
  const match = text.match(/(?:\/folders\/|\/d\/|[?&]id=)([\w-]+)/);
  return match ? match[1] : (/^[\w-]{20,}$/.test(text) ? text : '');
}
function slug_(value) {
  const slug = String(value || '').trim().toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'project';
}
function pageOwners_(pages) {
  const owners = {};
  ['index', 'session', 'gallery', 'credits', 'setup', 'pages', 'home', 'works', 'media', 'instructions'].forEach(id => owners[id] = '__reserved');
  pages.filter(page => page.page || page.title).forEach(page => owners[slug_(page.page || page.title)] = '__menu');
  return owners;
}
function nestedPage_(row, parent, owners) {
  const base = slug_(row.page || row.title);
  let target = base;
  if (owners[target] && owners[target] !== parent) {
    const prefix = slug_(parent).slice(0, 2);
    target = base + '_' + prefix;
    let number = 2;
    while (owners[target] && owners[target] !== parent) target = base + '_' + prefix + '_' + number++;
  }
  owners[target] = parent;
  return target;
}
function rowsFromSheet_(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values.shift().map(String);
  return values.map((r, index) => {
    const result = {_row: index};
    headers.forEach((h, i) => result[h] = r[i]);
    return result;
  }).filter(row => headers.some(h => row[h] !== '' && row[h] !== false && row[h] !== 'FALSE' && row[h] != null));
}
function pageRows_(page) {
  const slug = slug_(page.page || page.title);
  try { return rows_(slug); }
  catch (error) { return rows_('Works').filter(row => slug_(row.page) === slug); }
}
function ensurePageSheet_(spreadsheet, page) {
  const slug = slug_(page.page || page.title);
  let sheet = spreadsheet.getSheetByName(slug);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(slug);
    sheet.getRange(1, 1, 1, PAGE_HEADERS.length).setValues([PAGE_HEADERS]);
    sheet.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['photo', 'video'], true).build());
    sheet.getRange('G2:G').insertCheckboxes();
    sheet.setFrozenRows(1);
    sheet.hideColumns(1);
  }
  if (sheet.getMaxColumns() >= 8) sheet.hideColumns(8);
  sheet.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['photo', 'video'], true).build());
  return sheet;
}
function syncPageSheets(spreadsheet) {
  spreadsheet = spreadsheet || SpreadsheetApp.openById(SPREADSHEET_ID);
  const pages = rowsFromSheet_(spreadsheet.getSheetByName('Pages'));
  const works = rowsFromSheet_(spreadsheet.getSheetByName('Works'));
  const visited = {};
  const owners = pageOwners_(pages);
  function sync_(page) {
    const slug = slug_(page.page || page.title);
    if (visited[slug]) return;
    visited[slug] = true;
    const sheet = ensurePageSheet_(spreadsheet, page);
    const existing = rowsFromSheet_(sheet);
    const hasContent = existing.some(row => row.title || row.folder || row.imageUrl || row.videoUrl);
    if (!hasContent) {
      const records = works.filter(row => slug_(row.page) === slug);
      if (records.length) sheet.getRange(2, 1, records.length, PAGE_HEADERS.length).setValues(records.map(row => PAGE_HEADERS.map(header => row[header] === undefined ? '' : row[header])));
    }

  }
  pages.filter(page => page.page || page.title).forEach(sync_);
  const visible = ['Instructions', 'Pages', 'Home'].concat(pages.filter(page => page.page || page.title).map(page => slug_(page.page || page.title)));
  spreadsheet.getSheets().forEach(sheet => {
    if (visible.indexOf(sheet.getName()) < 0 && !sheet.isSheetHidden()) sheet.hideSheet();
  });
}
function onEdit(e) {
  if (!e || !e.range || e.range.getRow() < 2 || ['Instructions', 'Home', 'Works', 'Media'].indexOf(e.range.getSheet().getName()) >= 0) return;
  syncPageSheets(e.source);
}
function installPageSheetTrigger() {
  ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === 'onEdit').forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('onEdit').forSpreadsheet(SPREADSHEET_ID).onEdit().create();
}
function insideRoot_(item, checked) {
  const id = item.getId();
  if (id === ROOT_FOLDER_ID || checked[id]) return true;
  const parents = item.getParents();
  while (parents.hasNext()) if (insideRoot_(parents.next(), checked)) {checked[id] = true; return true;}
  return false;
}
function folder_(value, checked) {
  const id = id_(value);
  if (!id) return null;
  const folder = DriveApp.getFolderById(id);
  if (!insideRoot_(folder, checked)) throw new Error('Folder outside the website CMS: ' + value);
  return folder;
}
function photo_(file, images) {
  const record = {id:file.getId(), name:file.getName(), modifiedAt:file.getLastUpdated().toISOString(), size:file.getSize()};
  images[record.id] = record;
  return record;
}
function photos_(folder, images) {
  const iterator = folder.getFiles(), result = [];
  while (iterator.hasNext()) {
    const file = iterator.next();
    if (/^image\//.test(file.getMimeType())) result.push(photo_(file, images));
  }
  return result.sort((a,b) => a.name.localeCompare(b.name, 'en', {numeric:true}) || a.id.localeCompare(b.id));
}
function imageLink_(value, images, checked) {
  const url = String(value || '').trim();
  if (!url) return null;
  if (/^https:\/\/(?:drive\.google\.com|docs\.google\.com)\//.test(url)) {
    const file = DriveApp.getFileById(id_(url));
    if (!insideRoot_(file, checked)) throw new Error('Photo outside the website CMS');
    return photo_(file, images);
  }
  if (!/^https:\/\//.test(url)) throw new Error('Photo URL must use HTTPS: ' + url);
  return {url:url};
}
// Numeric prefixes affect ordering, but are not part of visible folder titles.
function folderTitle_(name) {
  return String(name).trim().replace(/^\d+[\s._-]+(?=\S)/, '');
}
function folderSort_(a, b) {
  const left = a.getName().trim(), right = b.getName().trim();
  const l = left.match(/^(\d+)[\s._-]+(?=\S)/), r = right.match(/^(\d+)[\s._-]+(?=\S)/);
  if (l && r && Number(l[1]) !== Number(r[1])) return Number(l[1]) - Number(r[1]);
  if (!!l !== !!r) return l ? -1 : 1;
  return folderTitle_(left).localeCompare(folderTitle_(right), 'en', {numeric:true}) || a.getId().localeCompare(b.getId());
}
function websiteImageBlob_(file) {
  if (file.getSize() <= 20 * 1024 * 1024) return file.getBlob();
  // Use Drive's rendered preview for oversized originals, without modifying the source.
  const options = {headers:{Authorization:'Bearer ' + ScriptApp.getOAuthToken()},muteHttpExceptions:true};
  const metadata = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.getId()) + '?fields=thumbnailLink', options);
  if (metadata.getResponseCode() !== 200) throw new Error('Cannot read large photo preview: ' + file.getName());
  const link = JSON.parse(metadata.getContentText()).thumbnailLink;
  if (!link) throw new Error('Drive preview not ready for: ' + file.getName());
  const preview = UrlFetchApp.fetch(link.replace(/=s\d+.*$/, '=s2560'), options);
  if (preview.getResponseCode() !== 200) throw new Error('Cannot download large photo preview: ' + file.getName());
  return preview.getBlob();
}
function snapshot_() {
  const checked = {}, images = {}, galleries = {}, pages = [];
  const pageRows = rows_('Pages').filter(r => published_(r.published)).sort(sort_);
  const seenPages = {};
  const owners = pageOwners_(rows_('Pages'));
  const visiting = {};
  const folderPages = {};
  function folderItem_(row, folder, parentSlug, key, forcePage) {
    const title = String(row.title || folderTitle_(folder.getName()));
    const children = folder.getFolders(), folders = [];
    while (children.hasNext()) folders.push(children.next());
    folders.sort(folderSort_);
    const photos = photos_(folder, images);
    if (!folders.length && !forcePage) {
      const item = {slug:key,title:title,type:'image'};
      const cover = photos[0] || imageLink_(row.imageUrl,images,checked);
      if (cover) item.image = cover;
      if (photos.length > 1) item.photos = photos;
      return item;
    }
    const folderId = folder.getId();
    let target = folderPages[folderId];
    if (!target) {
      target = nestedPage_({page:slug_(folderTitle_(folder.getName())) + '_' + folderId.slice(-8).toLowerCase()},parentSlug,owners);
      folderPages[folderId] = target;
      const items = folders.map(child => folderItem_({title:folderTitle_(child.getName())},child,target,'drive-'+child.getId(),true));
      items.unshift(...photos.map(photo => ({slug:'drive-'+photo.id,title:photo.name,type:'image',image:photo,folderPhoto:true})));
      galleries[target] = {title:title,template:'gallery',items:items};
    }
    const item = {slug:key,title:title,type:'page',page:target};
    const cover = photos[0] || (galleries[target].items.find(item => item.image) || {}).image || imageLink_(row.imageUrl,images,checked);
    if (cover) item.image = cover;
    return item;
  }
  function exportPage_(page) {
    const slug = slug_(page.page || page.title);
    if (/^(index|session|gallery|credits|setup)$/.test(slug)) throw new Error('Invalid page ID: ' + slug);
    if (visiting[slug]) throw new Error('Circular page link: ' + slug);
    if (seenPages[slug]) return;
    visiting[slug] = true;
    seenPages[slug] = true;

    const records = pageRows_(page).sort(sort_);
    const usedFolders = {}, seenWorks = {}, items = [];
    records.forEach(row => {const id=id_(row.folder); if(id) usedFolders[id]=true;});
    function add_(row, folder) {
      const explicitKey = String(row.id || '').trim();
      const baseKey = explicitKey || slug_(row.title || (folder && folder.getName()));
      let key = baseKey, suffix = 2;
      while (seenWorks[key]) key = baseKey + '-' + suffix++;
      seenWorks[key] = true;
      if (folder && row.type !== 'video') {
        items.push(folderItem_(row,folder,slug,key));
        return;
      }
      // Preserve previous manually created page links during the transition.
      if (row.type === 'page') {
        const target = nestedPage_(row, slug, owners);
        exportPage_({page:target,title:row.title});
        const child = galleries[target];
        const cover = imageLink_(row.imageUrl,images,checked) || (child.items.find(item => item.image) || {}).image;
        const item = {slug:key,title:String(row.title || target),type:'page',page:target};
        if (cover) item.image = cover;
        items.push(item);
        return;
      }
      const photos = folder ? photos_(folder,images) : [];
      const image = photos[0] || imageLink_(row.imageUrl,images,checked);
      const item = {slug:key,title:String(row.title || (folder && folder.getName()) || key),type:row.type === 'video' ? 'video' : 'image'};
      if (image) item.image = image;
      if (item.type === 'video') item.video = String(row.videoUrl || '').trim();
      if (photos.length > 1) item.photos = photos;
      items.push(item);
    }
    records.filter(r => published_(r.published)).forEach(row => add_(row,folder_(row.folder,checked)));
    const parent = folder_(page.folder,checked);
    if (parent && page.template !== 'placeholder') {
      const children = parent.getFolders(), folders = [];
      while (children.hasNext()) folders.push(children.next());
      folders.sort(folderSort_);
      folders.filter(f=>!usedFolders[f.getId()]).forEach(f => add_({id:'drive-'+f.getId(),title:folderTitle_(f.getName()),type:'photo'},f));
      const direct = photos_(parent,images);
      if (direct.length) add_({id:'drive-'+parent.getId(),title:folderTitle_(parent.getName()),type:'photo'},parent);
    }
    galleries[slug] = {items:items,template:page.template === 'placeholder' ? 'placeholder' : 'gallery',title:String(page.title).trim()};
    delete visiting[slug];
  }
  pageRows.forEach(page => {
    const slug = slug_(page.page || page.title);
    if (pages.some(item => item.page === slug)) throw new Error('Duplicate menu page: ' + slug);
    pages.push({page:slug,label:String(page.title).trim(),spaceAbove:published_(page.spaceAbove),template:page.template === 'placeholder' ? 'placeholder' : 'gallery'});
    exportPage_(page);
  });
  const home = rows_('Home').filter(r=>published_(r.published)).sort(sort_).map(row=>({title:String(row.title).trim(),image:imageLink_(row.imageUrl,images,checked),link:String(row.link || '').trim()}));
  if (!home.length) throw new Error('Publish at least one Home slide');
  CacheService.getScriptCache().put('published-images',JSON.stringify(Object.keys(images)),120);
  return {schemaVersion:1,menu:{items:pages},portfolio:{items:home},galleries:galleries,images:images};
}
function cleanupUnusedFolders() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const referenced = {};
  const visited = {};
  function visit_(page) {
    const slug = slug_(page.page || page.title);
    if (visited[slug]) return;
    visited[slug] = true;
    const folderId = id_(page.folder);
    if (folderId) referenced[folderId] = true;
    pageRows_(page).forEach(row => {
      const id = id_(row.folder); if (id) referenced[id] = true;
      if (row.type === 'page' && (row.page || row.title)) visit_({page:row.page || row.title});
    });
  }
  rowsFromSheet_(spreadsheet.getSheetByName('Pages')).filter(page => page.page || page.title).forEach(visit_);
  function hasContent_(folder) {
    if (folder.getFiles().hasNext()) return true;
    const children = folder.getFolders();
    while (children.hasNext()) if (hasContent_(children.next())) return true;
    return false;
  }
  function containsReferenced_(folder) {
    if (referenced[folder.getId()]) return true;
    const children = folder.getFolders();
    while (children.hasNext()) if (containsReferenced_(children.next())) return true;
    return false;
  }
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID), folders = root.getFolders(), removed = [];
  while (folders.hasNext()) {
    const folder = folders.next();
    if (!hasContent_(folder) || !containsReferenced_(folder)) {
      removed.push(folder.getName());
      folder.setTrashed(true);
    }
  }
  console.log('Moved unused folders to trash: ' + (removed.join(', ') || 'none'));
  return removed;
}
function doGet(e) {
  let result;
  try {
    if (e && e.parameter.action === 'image') {
      const id = String(e.parameter.id || '');
      let allowed = CacheService.getScriptCache().get('published-images');
      if (!allowed) {snapshot_(); allowed=CacheService.getScriptCache().get('published-images');}
      if (JSON.parse(allowed || '[]').indexOf(id) < 0) throw new Error('Image not published');
      const file = DriveApp.getFileById(id);
      result = {id:id,base64:Utilities.base64Encode(websiteImageBlob_(file).getBytes())};
    } else result = snapshot_();
  } catch (error) {result={error:String(error.message || error)};}
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

