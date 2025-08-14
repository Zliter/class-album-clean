const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const tip = $('#tip');
const list = $('#list');
const empty = $('#empty');
const tagInput = $('#tagInput');
const searchInput = $('#searchInput');

const Photo = AV.Object.extend('Photo'); // 表名：Photo

function msg(t){ tip.textContent = t || ''; }
function toTags(str){
  return (str || '')
    .split(/[，,]/).map(s=>s.trim()).filter(Boolean)
    .slice(0,10);
}

async function fetchPhotos(keywords=[]) {
  const q = new AV.Query('Photo');
  q.descending('createdAt');
  q.limit(500);
  if (keywords.length) {
    // 任意包含其中一个标签
    q.containsAll('tags', keywords); // 如果想“包含全部关键词”，改为 containsAll；只要命中其一：q.containsAllFrom('tags', [any])
  }
  const rows = await q.find();
  return rows.map(r=>{
    const f = r.get('file');
    return {
      id: r.id,
      url: f ? f.url() : '',
      tags: r.get('tags') || [],
      createdAt: r.createdAt
    };
  });
}

function render(items){
  list.innerHTML = '';
  if (!items.length){ empty.style.display='block'; return; }
  empty.style.display='none';
  const frag = document.createDocumentFragment();
  items.forEach(it=>{
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<img loading="lazy" src="${it.url}" alt="">`;
    frag.appendChild(div);
  });
  list.appendChild(frag);
}

async function refresh(){
  try{
    msg('加载中…');
    const kw = searchInput.value.trim().split(/\s+/).filter(Boolean);
    const rows = await fetchPhotos(kw);
    render(rows);
    msg('');
  }catch(e){
    msg('加载失败：' + (e.message || e));
    console.error(e);
  }
}

async function uploadFiles(files, tags){
  if (!files || !files.length) return;
  msg('开始上传…');
  for (const f of files){
    // 1) 先把文件上传到 LeanCloud
    const avFile = new AV.File(f.name, f);
    await avFile.save();

    // 2) 写一条 Photo 记录
    const p = new Photo();
    p.set('file', avFile);
    p.set('tags', tags);
    await p.save();
  }
  msg('上传完成');
  await refresh();
}

function initUpload(){
  const picker = $('#picker');
  const drop = $('#drop');

  $('#uploadBtn').onclick = async ()=>{
    const files = picker.files;
    const tags = toTags(tagInput.value);
    await uploadFiles(files, tags);
    picker.value = '';
  };

  // 拖拽
  ;['dragenter','dragover','dragleave','drop'].forEach(ev=>{
    drop.addEventListener(ev, e=>{ e.preventDefault(); e.stopPropagation(); }, false);
  });
  drop.addEventListener('drop', async e=>{
    const files = e.dataTransfer.files;
    const tags = toTags(tagInput.value);
    await uploadFiles(files, tags);
  });
}

function bindUI(){
  $('#refreshBtn').onclick = refresh;
  $('#clearBtn').onclick = ()=>{ searchInput.value=''; refresh(); };
  searchInput.addEventListener('keydown', e=>{ if(e.key==='Enter') refresh(); });
}

(async function main(){
  bindUI();
  initUpload();
  await refresh();
})();
