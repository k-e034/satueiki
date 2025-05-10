// *** generatePhotoPages.js – rebuilt for roll‑centric navigation ***
// Usage:  node generatePhotoPages.js
//   1. Keeps existing photoNN.html pages but changes their Prev/Next links so that they
//      loop only within the same roll (film roll).
//   2. Builds a static HTML page per roll (roll_XXXXX.html) that lists all thumbnails
//      in that roll and links to the corresponding photoNN.html pages.
//   3. Rewrites index.html so that <div id="photo-grid"> becomes a grid of roll
//      representatives (first frame of each roll) linking to the roll page.  Tag
//      search section logic is preserved.
// -----------------------------------------------------------------------------

const fs   = require('fs');
const path = require('path');

// ---- configuration ----------------------------------------------------------
const DATA_DIR            = path.join(__dirname, 'data');
const PHOTOS_JSON_PATH    = path.join(DATA_DIR, 'photos.json');
const PHOTO_TEMPLATE_PATH = path.join(__dirname, 'photoTemplate.html');
const ROLL_TEMPLATE_PATH  = path.join(__dirname, 'rollTemplate.html');
const INDEX_HTML_PATH     = path.join(__dirname, 'index.html');
const OUTPUT_DIR          = __dirname;           // photoNN.html を既定通り生成
const ROLL_DIR            = path.join(__dirname, 'rolls');
if (!fs.existsSync(ROLL_DIR)) fs.mkdirSync(ROLL_DIR);

// ---- helper: 汎用 -----------------------------------------------------------
const PERIOD_KEY     = tag => /^\d{4}-\d{2}$/.test(tag);
const getRollId = imgPath => {
  const m = path.basename(imgPath).match(/^([^_]+)_/);
  return m ? m[1] : 'misc';
};
const formatDate = d => {
  if (!d) return '日付不明';
  const t = new Date(d); return `${t.getFullYear()}年${t.getMonth()+1}月${t.getDate()}日`;
};
const formatPeriod = d => {
  if (!d) return '時期不明';
  const t = new Date(d); return `${t.getFullYear()}年${t.getMonth()+1}月`;
};

// ---- load raw data & templates ---------------------------------------------
function load() {
  const raw = JSON.parse(fs.readFileSync(PHOTOS_JSON_PATH,'utf8'));
  const photos = Array.isArray(raw) ? raw : raw.photos;
  if (!Array.isArray(photos)) throw new Error('photos.json は配列構造ではありません');
  return {
    photos,
    tplPhoto : fs.readFileSync(PHOTO_TEMPLATE_PATH,'utf8'),
    tplRoll  : fs.readFileSync(ROLL_TEMPLATE_PATH,'utf8'),
    idxHtml  : fs.readFileSync(INDEX_HTML_PATH,'utf8')
  };
}

// ---- generate photo page fragment ------------------------------------------
function renderPhotoPage(photo, listInSameRoll, tpl) {
  let html = tpl;
  html = html.replace(/\[\[TITLE]]/g, photo.title)
             .replace(/\[\[IMAGE]]/g, photo.image)
             .replace(/\[\[DATE]]/g, photo.dateDisplay || formatDate(photo.date))
             .replace(/\[\[SHOOTING_PERIOD]]/g, formatPeriod(photo.date))
             .replace(/\[\[LOCATION]]/g, photo.location)
             .replace(/\[\[CAMERA]]/g, photo.camera)
             .replace(/\[\[LENS]]/g, photo.lens || '不明')
             .replace(/\[\[FILM]]/g, photo.film || '不明');

  // description (array or string)
  const descArr = Array.isArray(photo.description) ? photo.description : [photo.description];
  html = html.replace(/\[\[DESCRIPTION]]/g, descArr.map(p=>`<p>${p}</p>`).join('\n'));

  // tags
  const tagLinks = (photo.tags||[]).map(t=>`<a href="index.html?tag=${t}" class="tag">${t}</a>`).join('\n');
  html = html.replace(/\[\[TAGS]]/g, tagLinks);

  // roll‑local prev/next
  const idx = listInSameRoll.findIndex(p=>p.id===photo.id);
  const prev = idx>0 ? listInSameRoll[idx-1] : listInSameRoll[listInSameRoll.length-1];
  const next = idx<listInSameRoll.length-1 ? listInSameRoll[idx+1] : listInSameRoll[0];
  html = html.replace(/\[\[PHOTO_ID]]/g, `photo${photo.id}`)
             .replace(/\[\[PREV_PHOTO]]/g, prev.page)
             .replace(/\[\[NEXT_PHOTO]]/g, next.page);

  return html;
}

// ---- generate roll page -----------------------------------------------------
function renderRollPage(rid, list, tplRoll) {
  // ロール「D」は「Digital Photos」として表示
  const rollTitle = rid === 'D' ? 'Digital Photos' : `Roll ${rid}`;
  
  // 撮影時期の取得（各写真の日付から最初の年月を取得）
  const dates = list.map(p => p.date).filter(d => d);
  let shootingPeriod = '時期不明';
  if (dates.length > 0) {
    const firstDate = dates.sort()[0];
    shootingPeriod = formatPeriod(firstDate);
  }
  
  // サムネイルサイズを統一（250x250pxの固定サイズ）
  // 各写真に一意のIDを付けて重複を防ぐ
  const thumbs = list.map(p=>
    `<a href="../${p.page}" class="photo-thumb" data-photo-id="${p.id}">
      <img src="../${p.image}" alt="${p.title}" loading="lazy" />
      <div class="thumb-overlay">
        <div class="thumb-title">${p.title}</div>
        <div class="thumb-date">${p.dateDisplay || formatDate(p.date)}</div>
      </div>
    </a>`
  ).join('\n');
  
  // ロールの統計情報
  const photoCount = list.length;
  const cameras = [...new Set(list.map(p => p.camera).filter(c => c))];
  const films = [...new Set(list.map(p => p.film).filter(f => f))];
  
  let html = tplRoll;
  html = html.replace(/\[\[ROLL_ID]]/g, rid)
             .replace(/\[\[ROLL_TITLE]]/g, rollTitle)
             .replace(/\[\[SHOOTING_PERIOD]]/g, shootingPeriod)
             .replace(/\[\[PHOTO_COUNT]]/g, photoCount)
             .replace(/\[\[CAMERAS]]/g, cameras.join(', ') || '不明')
             .replace(/\[\[FILMS]]/g, films.join(', ') || 'デジタル')  // ロールDの場合
             .replace('[[THUMBS]]', thumbs);
  
  return html;
}

// ---- rewrite index.html photo‑grid -----------------------------------------
function rewriteIndexHTML(idxHtml, rolls) {
  // ロールを重複チェック
  const uniqueRolls = new Map();
  
  // ロールを整理し、重複を削除
  Object.entries(rolls).forEach(([rid, list]) => {
    if (!uniqueRolls.has(rid)) {
      uniqueRolls.set(rid, list);
    }
  });
  
  // ロールをソート: Dは最後、その他は降順
  const sortedRolls = Array.from(uniqueRolls.entries()).sort((a, b) => {
    const [ridA] = a;
    const [ridB] = b;
    
    if (ridA === 'D') return 1;  // Dは最後
    if (ridB === 'D') return -1; // Dは最後
    return ridB.localeCompare(ridA); // その他は降順
  });
  
  const rollSections = sortedRolls.map(([rid, list]) => {
    const rep = list[0];
    // ロール「D」は「Digital Photos」として表示
    const displayTitle = rid === 'D' ? 'Digital Photos' : `Roll ${rid}`;
    
    // ロールの撮影時期を取得
    const dates = list.map(p => p.date).filter(d => d);
    let shootingPeriod = '時期不明';
    if (dates.length > 0) {
      const firstDate = dates.sort()[0];
      shootingPeriod = formatPeriod(firstDate);
    }
    
    return `<section class="roll-section" data-roll-id="${rid}">
  <h2 class="roll-title"><a href="rolls/roll_${rid}.html">${displayTitle}</a></h2>
  <div class="roll-meta">
    <span class="roll-period">${shootingPeriod}</span>
    <span class="roll-count">${list.length}枚</span>
  </div>
  <a href="rolls/roll_${rid}.html" class="roll-thumb-link">
    <img src="${rep.image}" alt="${displayTitle}" class="roll-thumb" loading="lazy">
  </a>
</section>`;
  }).join('\n');

  // divタグの内容全体を置き換える
  const newPhotoGrid = `<div id="photo-grid" class="roll-grid">
${rollSections}
</div>`;
  
  // photo-gridセクション全体を置き換える
  // 既存のphoto-gridを完全に削除してから新しく作成
  const existingGrid = idxHtml.match(/<div id="photo-grid"[\s\S]*?<\/div>/m);
  if (existingGrid) {
    idxHtml = idxHtml.replace(existingGrid[0], newPhotoGrid);
  } else {
    // photo-gridが見つからない場合、main-contentの後に追加
    idxHtml = idxHtml.replace(
      /<div class="main-content">/,
      '<div class="main-content">\n' + newPhotoGrid
    );
  }
  
  // もっと見るボタンのコンテナを非表示にする
  idxHtml = idxHtml.replace(
    /<div class="load-more-container"[\s\S]*?<\/div>/m,
    '<div class="load-more-container" style="display: none;"><button id="load-more" class="btn">もっと見る</button></div>'
  );
  
  return idxHtml;
}

// ---- main -------------------------------------------------------------------
(function main(){
  const {photos, tplPhoto, tplRoll, idxHtml: originalIdx} = load();

  // ------ group by roll ------------------------------------------------------
  const rolls = {};
  photos.forEach(p=>{
    p.roll = p.roll || getRollId(p.image);  // 既存のrollか、ファイル名から判定
    if (!rolls[p.roll]) {
      rolls[p.roll] = [];
    }
    // 重複チェック
    if (!rolls[p.roll].find(existing => existing.id === p.id)) {
      rolls[p.roll].push(p);
    }
  });

  // ------ 1. photoNN.html (overwrite) ----------------------------------------
  for (const list of Object.values(rolls)) {
    list.forEach(p=>{
      const html = renderPhotoPage(p, list, tplPhoto);
      fs.writeFileSync(path.join(OUTPUT_DIR, p.page), html, 'utf8');
      console.log(`photo page → ${p.page}`);
    });
  }

  // ------ 2. roll pages ------------------------------------------------------
  for (const [rid,list] of Object.entries(rolls)) {
    const html = renderRollPage(rid, list, tplRoll);
    fs.writeFileSync(path.join(ROLL_DIR, `roll_${rid}.html`), html, 'utf8');
    console.log(`roll page  → rolls/roll_${rid}.html`);
  }

  // ------ 3. index.html ------------------------------------------------------
  const newIdx = rewriteIndexHTML(originalIdx, rolls);
  fs.writeFileSync(INDEX_HTML_PATH, newIdx, 'utf8');
  console.log('index.html updated');
  
  // デバッグ: 生成されたHTML の最初の数行を確認
  const photoGridMatch = newIdx.match(/<div id="photo-grid"[\s\S]*?<\/div>/m);
  if (photoGridMatch) {
    console.log('\n生成されたphoto-gridセクション:');
    console.log(photoGridMatch[0]);
  }
  
  console.log('\nロール別表示構造:');
  const rollIds = Object.keys(rolls);
  rollIds.forEach(rid => {
    const displayName = rid === 'D' ? 'Digital Photos' : `Roll ${rid}`;
    console.log(`  - ${displayName}: ${rolls[rid].length}枚`);
  });
  
  // 重複チェック
  console.log('\n重複チェック:');
  const uniqueRolls = new Set(rollIds);
  if (uniqueRolls.size !== rollIds.length) {
    console.warn('警告: ロールIDに重複があります！');
  } else {
    console.log('ロールIDに重複はありません');
  }

})();