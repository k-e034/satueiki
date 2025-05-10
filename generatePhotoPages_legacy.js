/**
 * 写真詳細ページおよびタグ検索セクションを自動生成するスクリプト
 * Node.js環境で実行します
 * 
 * 使用方法:
 * 1. Node.jsをインストール
 * 2. このスクリプトを保存（例：generatePhotoPages.js）
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
  akita:      '秋田県', miyagi:    '宮城県', saitama: '埼玉県',
  tokyo:      '東京都', kanagawa:  '神奈川県', osaka:   '大阪府',
  mie:        '三重県', miyazaki:  '宮崎県',
  /* カメラ */
  'canon-ivsb2': 'Canon IV Sb2', 'canon-ftbn': 'Canon FTb-N',
  'fuji-s5pro':  'Fujifilm FinePix S5 Pro', 'lumix-g5':'Lumix G5',
  'nikon-f70d':  'Nikon F70D',          'nikon-d800':'Nikon D800',
  'olympus-om1': 'Olympus OM-1',        'pentax-67':'Pentax 6×7',
  /* レンズ */
  'canon-35mm':'Canon Serenar 35mm F3.5','canon-50mm':'Canon Lens 50mm F1.8',
  'fd-50mm':'Canon FD 50mm F1.4 S.S.C.','fd-80-200mm':'Canon NewFD 80-200mm F4',
  'fd-300mm':'Canon NewFD 300mm F5.6','zuiko-28mm':'Olympus Zuiko 28mm F2.8',
  'zuiko-35mm':'Olympus Zuiko 35mm F3.5','zuiko-50mm1':'Olympus G.Zuiko 50mm F1.4',
  'zuiko-50mm2':'Olympus F.Zuiko 50mm F1.8','67-55mm':'Pentax SMC TAKUMAR 6×7/55mm F3.5',
  '67-90mm':'Pentax SMC TAKUMAR 6×7/90mm F2.8','67-135mm':'Pentax MACRO-TAKUMAR 6×7/135mm F4',
  '67-200mm':'Pentax SMC TAKUMAR 6×7/200mm F4','nikkor-28-80mm':'AI AF Zoom-Nikkor 28-80mm F3.5-5.6 D',
  'nikkor-28-200mm':'AI AF-S Zoom-Nikkor 28-200mm F3.5-5.6 D','nikkor-80-200mm':'AI AF-S Zoom-Nikkor 80-200mm F2.8 ED',
  'nikkor-50mm':'AI AF Nikkor 50mm F1.4','serenar-35mm':'Canon Serenar 35mm F3.5',
  /* フィルム */
  'kodak-colorplus':'Kodak ColorPlus 200','kodak-gold':'Kodak Gold 200','kodak-ultramax':'Kodak UltraMax 400',
  'fuji-200':'FUJIFILM 200','fuji-super':'FUJIFILM SUPER 400','ilford-ilfochrome':'ILFORD ILFOCHROME 100',
  'ilford-xp2':'ILFORD XP2 Super 400','ilford-vintagetone':'ILFORD ILFOCOLOR 400 PLUS Vintage Tone','lomography-cn100':'Lomography Color Negative 100',
  /* スタイル */
  mono:'モノクロ', landscape:'風景', snap:'スナップショット', longexposure:'長時間露光', night:'夜景', animals:'動物'
};
// カテゴリ判定キー
const PERIOD_KEY   = tag => /^\d{4}-\d{2}$/.test(tag);
const LOCATION_KEYS = ['akita','miyagi','saitama','tokyo','kanagawa','osaka','mie','miyazaki'];
const CAMERA_KEYS   = ['canon-ivsb2','canon-ftbn','fuji-s5pro','lumix-g5','nikon-f70d','nikon-d800','olympus-om1','pentax-67'];
const LENS_KEYS     = ['canon-35mm','canon-50mm','fd-50mm','fd-80-200mm','fd-300mm','zuiko-28mm','zuiko-35mm','zuiko-50mm1','zuiko-50mm2','67-55mm','67-90mm','67-135mm','67-200mm','nikkor-28-80mm','nikkor-28-200mm','nikkor-80-200mm','nikkor-50mm','serenar-35mm'];
const FILM_KEYS     = ['kodak-colorplus','kodak-gold','kodak-ultramax','fuji-200','fuji-super','ilford-ilfochrome','ilford-xp2','ilford-vintagetone','lomography-cn100'];
const STYLE_KEYS    = ['mono','landscape','snap','longexposure','night','animals'];

/** データ読み込み */
function loadData() {
  try {
    const raw = JSON.parse(fs.readFileSync(PHOTOS_JSON_PATH,'utf8'));
    const photosData = Array.isArray(raw) ? raw : raw.photos;
    if (!Array.isArray(photosData)) {
      console.error('photos.json が配列ではありません'); process.exit(1);
    }
    const template = fs.readFileSync(TEMPLATE_PATH,'utf8');
    return { photosData, template };
  } catch(e) { console.error('データ読み込みエラー:', e); process.exit(1); }
}

function formatDate(d) {
  if (!d) return '日付不明'; const dt=new Date(d);
  return `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日`;
}
function formatPeriod(d) {
  if (!d) return '時期不明'; const dt=new Date(d);
  return `${dt.getFullYear()}年${dt.getMonth()+1}月`;
}
function getTagDisplayName(tag) {
  return (TAG_DISPLAY[tag]|| (PERIOD_KEY(tag)?formatPeriod(tag):tag)).replace(/_/g,' ');
}

/** ページ生成 */
function generatePage(photo, photos, template) {
  let c=template;
  c=c.replace(/\[\[TITLE\]\]/g,photo.title)
    .replace(/\[\[IMAGE\]\]/g,photo.image)
    .replace(/\[\[DATE\]\]/g,photo.dateDisplay||formatDate(photo.date))
    .replace(/\[\[SHOOTING_PERIOD\]\]/g,formatPeriod(photo.date))
    .replace(/\[\[LOCATION\]\]/g,photo.location)
    .replace(/\[\[CAMERA\]\]/g,photo.camera)
    .replace(/\[\[LENS\]\]/g,photo.lens||'不明')
    .replace(/\[\[FILM\]\]/g,photo.film||'不明');
  const desc=Array.isArray(photo.description)?photo.description:[photo.description];
  c=c.replace(/\[\[DESCRIPTION\]\]/g,desc.map(p=>`<p>${p}</p>`).join('\n'));
  c=c.replace(/\[\[TAGS\]\]/g,(photo.tags||[]).map(t=>`<a href="index.html?tag=${t}" class="tag">${getTagDisplayName(t)}</a>`).join('\n'));
  const idx=photos.findIndex(p=>p.id===photo.id);
  const prev=idx>0?photos[idx-1].page:photos[photos.length-1].page;
  const next=idx<photos.length-1?photos[idx+1].page:photos[0].page;
  c=c.replace(/\[\[PHOTO_ID\]\]/g,`photo${photo.id}`)
    .replace(/\[\[PREV_PHOTO\]\]/g,prev)
    .replace(/\[\[NEXT_PHOTO\]\]/g,next);
  return c;
}

/** 全ページ生成 */
function generatePages(photosData,template){
  photosData.forEach(p=>{
    const html=generatePage(p,photosData,template);
    fs.writeFileSync(path.join(OUTPUT_DIR,p.page),html,'utf8');
    console.log(`Generated: ${p.page}`);
  });
}

/** タグ検索更新 */
function updateIndex(photosData){
  const allTags=new Set();
  photosData.forEach(p=>(p.tags||[]).forEach(t=>allTags.add(t)));
  const tags=Array.from(allTags);
  const cats=[
    {title:'撮影時期', list:tags.filter(PERIOD_KEY).sort().reverse()},
    {title:'撮影場所', list:LOCATION_KEYS.filter(k=>allTags.has(k))},
    {title:'カメラ',    list:CAMERA_KEYS.filter(k=>allTags.has(k))},
    {title:'レンズ',    list:LENS_KEYS.filter(k=>allTags.has(k))},
    {title:'フィルム',  list:FILM_KEYS.filter(k=>allTags.has(k))},
    {title:'写真のスタイル', list:STYLE_KEYS.filter(k=>allTags.has(k))}
  ].filter(c=>c.list.length>0);
  const html=cats.map(cat=>{
    const links=cat.list.map(t=>`<a href="index.html?tag=${t}" class="tag">${getTagDisplayName(t)}</a>`).join('\n');
    return `<div class="tag-category">\n  <h3>${cat.title}</h3>\n  <div class="tags">\n${links}\n  </div>\n</div>`;
  }).join('\n');
  let idxHtml=fs.readFileSync(INDEX_HTML_PATH,'utf8');
  idxHtml=idxHtml.replace(/<div class="tag-container">[\s\S]*?<\/div>/m,`<div class="tag-container">\n${html}\n</div>`);
  fs.writeFileSync(INDEX_HTML_PATH,idxHtml,'utf8');
  console.log('Updated index.html');
}

// 実行
(function main(){
  const {photosData,template}=loadData();
  generatePages(photosData,template);
  updateIndex(photosData);
})();
