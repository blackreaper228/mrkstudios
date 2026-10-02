// Read-only website export. Editing takes place in the spreadsheet and Drive.
const SPREADSHEET_ID = '10iNKQtCdJrUuLFK7pl08yKWumKb1hFeDt0GVNKhf6DE';
const ROOT_FOLDER_ID = '1Z2ruN_2GZtiwUIy7EJPlJZ8vi3AVPJsv';

function rows_(name) {
  const result = Sheets.Spreadsheets.Values.get(SPREADSHEET_ID, name);
  const values = result.values || [];
  if (!values.length) throw new Error('Missing or empty sheet: ' + name);
  const headers = values.shift().map(String);
  return values.filter(r => r.some(v => v !== '')).map((r, index) => {
    const result = {_row: index};
    headers.forEach((h, i) => result[h] = r[i]);
    return result;
  });
}
function published_(v) { return v === true || /^(true|yes|1)$/i.test(String(v)); }
function sort_(a, b) {
  const av = a.order === '' ? a._row : Number(a.order), bv = b.order === '' ? b._row : Number(b.order);
  return av - bv || a._row - b._row;
}
function id_(value) {
  const text = String(value || '').trim();
  const match = text.match(/(?:\/folders\/|\/d\/|[?&]id=)([\w-]+)/);
  return match ? match[1] : (/^[\w-]{20,}$/.test(text) ? text : '');
}
function slug_(value) {
  const slug = String(value || '').trim().toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'project';
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
function snapshot_() {
  const checked = {}, images = {}, galleries = {}, pages = [];
  const allWorks = rows_('Works'), allMedia = rows_('Media');
  const pageRows = rows_('Pages').filter(r => published_(r.published)).sort(sort_);
  const seenPages = {};
  pageRows.forEach(page => {
    const slug = String(page.page).trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || /^(index|session|gallery|credits|setup)$/.test(slug) || seenPages[slug]) throw new Error('Invalid or duplicate page ID: ' + slug);
    seenPages[slug] = true;
    pages.push({page:slug,label:String(page.title).trim(),spaceAbove:published_(page.spaceAbove),template:page.template === 'placeholder' ? 'placeholder' : 'gallery'});
    const records = allWorks.filter(r => String(r.page).trim() === slug).sort(sort_);
    const usedFolders = {}, seenWorks = {}, items = [];
    records.forEach(row => {const id=id_(row.folder); if(id) usedFolders[id]=true;});
    function add_(row, folder) {
      const explicitKey = String(row.id || '').trim();
      const baseKey = explicitKey || slug_(row.title || (folder && folder.getName()));
      let key = baseKey, suffix = 2;
      while (seenWorks[key]) key = baseKey + '-' + suffix++;
      seenWorks[key] = true;
      const photos = folder ? photos_(folder,images) : [];
      const image = photos[0] || imageLink_(row.imageUrl,images,checked);
      const item = {slug:key,title:String(row.title || (folder && folder.getName()) || key),type:row.type === 'video' ? 'video' : 'image'};
      if (image) item.image = image;
      if (item.type === 'video') item.video = String(row.videoUrl || '').trim();
      if (row.description) item.description = String(row.description);
      if (photos.length > 1) item.photos = photos;
      const media = allMedia.filter(r => String(r.page).trim() === slug && String(r.workId).trim() === key && published_(r.published)).sort(sort_);
      if (media.length) item.session = media.map(r => r.type === 'video'
        ? {type:'video',title:String(r.title || item.title),video:String(r.url).trim()}
        : {type:'image',title:String(r.title || item.title),image:imageLink_(r.url,images,checked)});
      items.push(item);
    }
    records.filter(r => published_(r.published)).forEach(row => add_(row,folder_(row.folder,checked)));
    const parent = folder_(page.folder,checked);
    if (parent && page.template !== 'placeholder') {
      const children = parent.getFolders(), folders = [];
      while (children.hasNext()) folders.push(children.next());
      folders.sort((a,b)=>a.getName().localeCompare(b.getName(),'en',{numeric:true}));
      folders.filter(f=>!usedFolders[f.getId()]).forEach(f => add_({id:'drive-'+f.getId(),title:f.getName(),type:'photo'},f));
      const direct = photos_(parent,images);
      if (direct.length) add_({id:'drive-'+parent.getId(),title:parent.getName(),type:'photo'},parent);
    }
    galleries[slug] = {items:items,template:page.template === 'placeholder' ? 'placeholder' : 'gallery',title:String(page.title).trim()};
  });
  const home = rows_('Home').filter(r=>published_(r.published)).sort(sort_).map(row=>({title:String(row.title).trim(),image:imageLink_(row.imageUrl,images,checked),link:String(row.link || '').trim()}));
  if (!home.length) throw new Error('Publish at least one Home slide');
  CacheService.getScriptCache().put('published-images',JSON.stringify(Object.keys(images)),120);
  return {schemaVersion:1,menu:{items:pages},portfolio:{items:home},galleries:galleries,images:images};
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
      if (file.getSize() > 20*1024*1024) throw new Error('Image exceeds 20 MB; export a smaller original');
      result = {id:id,base64:Utilities.base64Encode(file.getBlob().getBytes())};
    } else result = snapshot_();
  } catch (error) {result={error:String(error.message || error)};}
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

