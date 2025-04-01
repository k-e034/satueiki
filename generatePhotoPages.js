/**
 * 写真詳細ページを自動生成するスクリプト
 * Node.js環境で実行します
 * 
 * 使用方法:
 * 1. Node.jsをインストール
 * 2. このスクリプトを保存（例：generatePhotoPages.js）
 * 3. コマンドラインで実行: node generatePhotoPages.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const PHOTOS_JSON_PATH = path.join(__dirname, 'data', 'photos.json');
const TEMPLATE_PATH = path.join(__dirname, 'photoTemplate.html');
const OUTPUT_DIR = path.join(__dirname);

// 写真データとテンプレートを読み込む
function loadData() {
    try {
        const photosData = JSON.parse(fs.readFileSync(PHOTOS_JSON_PATH, 'utf8'));
        const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        return { photosData, template };
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        process.exit(1);
    }
}

// テンプレートのプレースホルダーを実際のデータで置き換える
function generatePage(photo, photos, template) {
    let content = template;
    
    // 基本情報の置き換え
    content = content.replace(/\[\[TITLE\]\]/g, photo.title);
    content = content.replace(/\[\[IMAGE\]\]/g, photo.image);
    content = content.replace(/\[\[DATE\]\]/g, photo.dateDisplay || formatDate(photo.date));
    content = content.replace(/\[\[SHOOTING_PERIOD\]\]/g, getShootingPeriod(photo.date));
    content = content.replace(/\[\[LOCATION\]\]/g, photo.location);
    content = content.replace(/\[\[CAMERA\]\]/g, photo.camera);
    content = content.replace(/\[\[LENS\]\]/g, photo.lens || '不明');
    content = content.replace(/\[\[FILM\]\]/g, photo.film || '不明');
    
    // 説明文の置き換え
    let descriptionHtml = '';
    if (typeof photo.description === 'string') {
        // 単一の文字列の場合
        descriptionHtml = `<p>${photo.description}</p>`;
    } else if (Array.isArray(photo.description)) {
        // 段落の配列の場合
        descriptionHtml = photo.description.map(para => `<p>${para}</p>`).join('\n');
    }
    content = content.replace(/\[\[DESCRIPTION\]\]/g, descriptionHtml);
    
    // タグの生成
    const tagsHtml = (photo.tags || []).map(tag => 
        `<a href="index.html?tag=${tag}" class="tag">${getTagDisplayName(tag)}</a>`
    ).join('\n');
    
    content = content.replace(/\[\[TAGS\]\]/g, tagsHtml);
    
    // ID、前後の写真
    content = content.replace(/\[\[PHOTO_ID\]\]/g, `photo${photo.id}`);
    
    // 前後の写真リンクを設定
    const currentIndex = photos.findIndex(p => p.id === photo.id);
    const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1].page : photos[photos.length - 1].page;
    const nextPhoto = currentIndex < photos.length - 1 ? photos[currentIndex + 1].page : photos[0].page;
    
    content = content.replace(/\[\[PREV_PHOTO\]\]/g, prevPhoto);
    content = content.replace(/\[\[NEXT_PHOTO\]\]/g, nextPhoto);
    
    return content;
}

// 日付のフォーマット（YYYY-MM-DD → YYYY年MM月DD日）
function formatDate(dateStr) {
    if (!dateStr) return '日付不明';
    
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 撮影時期を取得（YYYY-MM-DD → YYYY年MM月）
function getShootingPeriod(dateStr) {
    if (!dateStr) return '時期不明';
    
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

// タグの表示名を取得
function getTagDisplayName(tag) {
    // 撮影時期のタグ
    if (tag.match(/^\d{4}-\d{2}$/)) {
        // 年月タグ（例：2025-03 → 2025年3月）
        const [year, month] = tag.split('-');
        return `${year}年${parseInt(month)}月`;
    } 
    
    // 撮影場所のタグ
    else if (tag === 'akita') return '秋田県';
    else if (tag === 'miyagi') return '宮城県';
    else if (tag === 'saitama') return '埼玉県';
    else if (tag === 'tokyo') return '東京都';
    else if (tag === 'kanagawa') return '神奈川県';
    else if (tag === 'mie') return '三重県';
    else if (tag === 'osaka') return '大阪府';
    else if (tag === 'miyazaki') return '宮崎県';
    
    // カメラのタグ
    else if (tag === 'canon-ivsb2') return 'Canon IV Sb2';
    else if (tag === 'canon-ftbn') return 'Canon FTb-N';
    else if (tag === 'fuji-s5pro') return 'Fujifilm FinePix S5 Pro'
    else if (tag === 'lumix-g5') return 'Lumix G5';
    else if (tag === 'nikon-f70d') return 'Nikon F70D';
    else if (tag === 'nikon-d800') return 'Nikon D800';
    else if (tag === 'olympus-om1') return 'Olympus OM-1';
    else if (tag === 'pentax-67') return 'Pentax 6×7';
    
    // レンズのタグ
    else if (tag === 'canon-35mm') return 'Canon Serenar 35mm F3.5';
    else if (tag === 'canon-50mm') return 'Canon Lens 50mm F1.8';
    else if (tag === 'fd-50mm') return 'Canon FD 50mm F1.4 S.S.C.';
    else if (tag === 'fd-80-200mm') return 'Canon NewFD 80-200mm F4';
    else if (tag === 'fd-300mm') return 'Canon NewFD 300mm F5.6';
    else if (tag === 'zuiko-28mm') return 'Olympus Zuiko 28mm F2.8';
    else if (tag === 'zuiko-35mm') return 'Olympus Zuiko 35mm F3.5';
    else if (tag === 'zuiko-50mm1') return 'Olympus G.Zuiko 50mm F1.4';
    else if (tag === 'zuiko-50mm2') return 'Olympus F.zuiko 50mm F1.8';
    else if (tag === '67-55mm') return 'Pentax Super-Multi-Coated TAKUMAR 6×7/55mm F3.5';
    else if (tag === '67-90mm') return 'Pentax Super-Multi-Coated TAKUMAR 6×7/90mm F2.8';
    else if (tag === '67-135mm') return 'Pentax Super-Multi-Coated MACRO-TAKUMAR 6×7/135mm F4';
    else if (tag === '67-200mm') return 'Pentax Super-Multi-Coated TAKUMAR 6×7/200mm F4';
    else if (tag === 'nikkor-28-80mm') return 'AI AF Zoom-Nikkor 28-80mm F3.5-5.6D';
    else if (tag === 'nikkor-28-200mm') return 'AI AF-S Zoom-Nikkor 28-200mm F3.5-5.6D';
    else if (tag === 'nikkor-50mm') return 'AI AF Nikkor 50mm F1.4';
    else if (tag === 'nikkor-80-200mm') return 'AI AF-S Zoom-Nikkor 80-200mm F2.8 ED';
    
    // フィルムのタグ
    else if (tag === 'kodak-colorplus') return 'Kodak ColorPlus 200';
    else if (tag === 'kodak-gold') return 'Kodak Gold 200';
    else if (tag === 'kodak-ultramax') return 'Kodak UltraMax 400';
    else if (tag === 'fuji-200') return 'FUJIFILM 200';
    else if (tag === 'fuji-super') return 'FUJIFILM SUPER 400';
    else if (tag === 'ilford-ilfochrome') return 'ILFORD ILFOCHROME 100';
    else if (tag === 'ilford-xp2') return 'ILFORD XP2 Super 400';
    else if (tag === 'ilford-vintagetone') return 'ILFORD ILFOCOLOR 400 PLUS Vintage Tone';
    else if (tag === 'lomography-cn100') return 'Lomography Color Negative 100';
    
    // 写真スタイルのタグ
    else if (tag === 'mono') return 'モノクロ';
    else if (tag === 'landscape') return '風景';
    else if (tag === 'snap') return 'スナップショット';
    else if (tag === 'longexposure') return '長時間露光';
    else if (tag === 'night') return '夜景';
    else if (tag === 'animals') return '動物';
    
    return tag; // デフォルトはタグをそのまま返す
}

// メイン処理
function main() {
    console.log('写真ページの生成を開始します...');
    
    const { photosData, template } = loadData();
    const photos = photosData.photos;
    
    // 出力ディレクトリが存在しない場合は作成
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // 各写真ページを生成
    photos.forEach(photo => {
        const content = generatePage(photo, photos, template);
        const outputPath = path.join(OUTPUT_DIR, photo.page);
        
        fs.writeFileSync(outputPath, content, 'utf8');
        console.log(`ページを生成しました: ${photo.page}`);
    });
    
    console.log('すべての写真ページの生成が完了しました。');
}

// スクリプト実行
main();
