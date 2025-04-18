/**
 * 写真詳細ページおよびタグ検索セクションを自動生成するスクリプト
 * Node.js環境で実行します
 * 
 * 使用方法:
 * 1. Node.jsをインストール
 * 2. generatePhotoPages.js を保存
 * 3. コマンドラインで実行: node generatePhotoPages.js
 */

const fs   = require('fs');
const path = require('path');

// 設定
const PHOTOS_JSON_PATH = path.join(__dirname, 'data', 'photos.json');
const TEMPLATE_PATH    = path.join(__dirname, 'photoTemplate.html');
const INDEX_HTML_PATH  = path.join(__dirname, 'index.html');
const OUTPUT_DIR       = path.join(__dirname);

// タグと表示名の対応表
const TAG_DISPLAY = {
  /* 撮影場所 */
  akita:      '秋田県',   miyagi:    '宮城県', saitama: '埼玉県',
  tokyo:      '東京都',   kanagawa:  '神奈川県', osaka: '大阪府',
  mie:        '三重県',   miyazaki:  '宮崎県',
  /* カメラ */
  'canon-ivsb2': 'Canon IV Sb2', 'canon-ftbn': 'Canon FTb-N',
  'fuji-s5pro':  'Fujifilm FinePix S5 Pro', 'lumix-g5':   'Lumix G5',
  'nikon-f70d':  'Nikon F70D',         'nikon-d800': 'Nikon D800',
  'olympus-om1': 'Olympus OM-1',       'pentax-67':  'Pentax 6×7',
  /* レンズ */
  'canon-35mm':    'Canon Serenar 35mm F3.5',
  'canon-50mm':    'Canon Lens 50mm F1.8',
  'fd-50mm':       'Canon FD 50mm F1.4 S.S.C.',
  'fd-80-200mm':   'Canon NewFD 80-200mm F4',
  'fd-300mm':      'Canon NewFD 300mm F5.6',
  'zuiko-28mm':    'Olympus Zuiko 28mm F2.8',
  'zuiko-35mm':    'Olympus Zuiko 35mm F3.5',
  'zuiko-50mm1':   'Olympus G.Zuiko 50mm F1.4',
  'zuiko-50mm2':   'Olympus F.Zuiko 50mm F1.8',
  '67-55mm':       'Pentax SMC TAKUMAR 6×7/55mm F3.5',
  '67-90mm':       'Pentax SMC TAKUMAR 6×7/90mm F2.8',
  '67-135mm':      'Pentax MACRO-TAKUMAR 6×7/135mm F4',
  '67-200mm':      'Pentax SMC TAKUMAR 6×7/200mm F4',
  'nikkor-28-80mm':'Ai AF Zoom-Nikkor 28-80mm F3.5-5.6 D',
  'nikkor-28-200mm':'Ai AF-S Zoom-Nikkor 28-200mm F3.5-5.6 D',
  'nikkor-80-200mm':'Ai AF-S Zoom-Nikkor 80-200mm F2.8 ED',
  'nikkor-50mm':   'Ai AF Nikkor 50mm F1.4',
  'serenar-35mm':  'Canon Serenar 35mm F3.5'
};
const LOCATION_KEYS = ['akita','miyagi','saitama','tokyo','kanagawa','osaka','mie','miyazaki'];
const CAMERA_KEYS   = ['canon-ivsb2','canon-ftbn','fuji-s5pro','lumix-g5','nikon-f70d','nikon-d800','olympus-om1','pentax-67'];

/** データ読み込み */
function loadData() {
  try {
    const raw = JSON.parse(fs.readFileSync(PHOTOS_JSON_PATH, 'utf8'));
    const photosData = Array.isArray(raw) ? raw : raw.photos;
    if (!Array.isArray(photosData)) {
      console.error('photos.json が配列ではありません');
      process.exit(1);
    }
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    return { photosData, template };
  } catch (e) {
    console.error('読み込みエラー:', e);
    process.exit(1);
  }
}

/** 日付→表示 */
function formatDate(d) {
  if (!d) return '日付不明';
  const dt = new Date(d);
  return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日`;
}
function formatPeriod(d) {
  if (!d) return '時期不明';
  const dt = new Date(d);
  return `${dt.getFullYear()}年${dt.getMonth()+1}月`;
}

/** タグ表示名取得（アンダースコアはスペースに置換） */
function tagName(t) {
  if (/^\d{4}-\d{2}$/.test(t)) {
    const [y,m] = t.split('-');
    return `${y}年${parseInt(m)}月`;
  }
  // マッピング or タグ文字列、アンダースコアはスペースに
  return (TAG_DISPLAY[t] || t).replace(/_/g, ' ');
}

/** 写真ページ生成 */
function generatePages(photosData, tpl) {
  photosData.forEach(photo => {
    let c = tpl;
    c = c.replace(/\[\[TITLE\]\]/g, photo.title)
         .replace(/\[\[IMAGE\]\]/g, photo.image)
         .replace(/\[\[DATE\]\]/g, photo.dateDisplay || formatDate(photo.date))
         .replace(/\[\[SHOOTING_PERIOD\]\]/g, formatPeriod(photo.date))
         .replace(/\[\[LOCATION\]\]/g, photo.location)
         .replace(/\[\[CAMERA\]\]/g, photo.camera)
         .replace(/\[\[LENS\]\]/g, photo.lens||'不明')
         .replace(/\[\[FILM\]\]/g, photo.film||'不明');
    const desc = typeof photo.description==='string' ? [photo.description] : photo.description;
    const dh = desc.map(p=>`<p>${p}</p>`).join('\n');
    c = c.replace(/\[\[DESCRIPTION\]\]/g, dh);
    const tagsHtml = (photo.tags||[]).map(t=>`<a href="index.html?tag=${t}" class="tag">${tagName(t)}</a>`).join('\n');
    c = c.replace(/\[\[TAGS\]\]/g, tagsHtml);
    fs.writeFileSync(path.join(OUTPUT_DIR, photo.page), c, 'utf8');
  });
  console.log('Photo pages generated');
}

/** タグセクション更新 */
function updateIndex(photosData) {
  const allTags = new Set();
  photosData.forEach(p=> (p.tags||[]).forEach(t=> allTags.add(t)));
  const tags = Array.from(allTags);
  const period = tags.filter(t=>/^\d{4}-\d{2}$/.test(t)).sort().reverse();
  const loc    = LOCATION_KEYS.filter(k=>allTags.has(k));
  const cam    = CAMERA_KEYS.filter(k=>allTags.has(k));
  const sectionHtml = [
    {title:'撮影時期', list:period},
    {title:'撮影場所', list:loc},
    {title:'カメラ',    list:cam}
  ].map(cat=>{
    const links = cat.list.map(t=>`<a href="index.html?tag=${t}" class="tag">${tagName(t)}</a>`).join('\n');
    return `<div class="tag-category">\n  <h3>${cat.title}</h3>\n  <div class="tags">\n${links}\n  </div>\n</div>`;
  }).join('\n');
  let idx = fs.readFileSync(INDEX_HTML_PATH,'utf8');
  idx = idx.replace(/<div class="tag-container">[\s\S]*?<\/div>/m, `<div class="tag-container">\n${sectionHtml}\n</div>`);
  fs.writeFileSync(INDEX_HTML_PATH, idx,'utf8');
  console.log('index.html tag section updated');
}

// 実行
(function main(){
  const { photosData, template } = loadData();
  generatePages(photosData, template);
  updateIndex(photosData);
})();
