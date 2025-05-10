document.addEventListener("DOMContentLoaded", function() {
    // 写真データを読み込む関数
    async function loadPhotoData() {
        try {
            const response = await fetch('data/photos.json');
            if (!response.ok) {
                throw new Error('写真データの読み込みに失敗しました');
            }
            const data = await response.json();
            return data.photos;
        } catch (error) {
            console.error('Error loading photo data:', error);
            return [];
        }
    }

    // ロール別にグループ化する関数
    function groupPhotosByRoll(photos) {
        const rolls = {};
        photos.forEach(photo => {
            const rollId = photo.roll || 'misc';
            if (!rolls[rollId]) {
                rolls[rollId] = [];
            }
            rolls[rollId].push(photo);
        });
        return rolls;
    }

    // 日付をフォーマットする関数
    function formatPeriod(date) {
        if (!date) return '時期不明';
        const d = new Date(date);
        return `${d.getFullYear()}年${d.getMonth() + 1}月`;
    }

    // ロールカードを作成する関数
    function createRollCard(rollId, photos) {
        // ロール「D」はデジタルカメラと表示
        const displayTitle = rollId === 'D' ? 'Digital Photos' : `Roll ${rollId}`;
        
        // そのロールの写真数
        const photoCount = photos.length;
        
        // 撮影時期を取得（そのロールの最初の写真の日付から）
        const dates = photos.map(p => p.date).filter(d => d);
        let shootingPeriod = '時期不明';
        if (dates.length > 0) {
            const sortedDates = dates.sort();
            shootingPeriod = formatPeriod(sortedDates[0]);
        }
        
        // 代表写真（そのロールの最初の写真）
        const representative = photos[0];
        
        const rollCard = document.createElement('section');
        rollCard.className = 'roll-section';
        
        rollCard.innerHTML = `
            <h2 class="roll-title"><a href="rolls/roll_${rollId}.html">${displayTitle}</a></h2>
            <div class="roll-meta">
                <span class="roll-period">${shootingPeriod}</span>
                <span class="roll-count">${photoCount}枚</span>
            </div>
            <a href="rolls/roll_${rollId}.html" class="roll-thumb-link">
                <img src="${representative.image}" alt="${displayTitle}" class="roll-thumb">
            </a>
        `;
        
        return rollCard;
    }

    // ロールを表示する関数
    async function displayRolls() {
        const photos = await loadPhotoData();
        const photoGrid = document.getElementById('photo-grid');
        const rolls = groupPhotosByRoll(photos);
        
        // ロールIDでソート（Dを除く英数字は昇順、Dは最後）
        const sortedRollIds = Object.keys(rolls).sort((a, b) => {
            if (a === 'D') return 1;  // Dは最後
            if (b === 'D') return -1; // Dは最後
            return b.localeCompare(a); // それ以外は降順（新しいロールが上）
        });
        
        // photoGridのクラスをroll-gridに変更
        photoGrid.className = 'roll-grid';
        
        // 各ロールのカードを作成・表示
        sortedRollIds.forEach(rollId => {
            const rollCard = createRollCard(rollId, rolls[rollId]);
            photoGrid.appendChild(rollCard);
        });
        
        // もっと見るボタンを非表示（ロール表示では必要ない）
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }

    // タグによるフィルタリング（既存の機能を保持）
    async function filterPhotosByTag(tag) {
        const photos = await loadPhotoData();
        const filteredPhotos = photos.filter(photo => 
            photo.tags && photo.tags.includes(tag)
        );
        const photoGrid = document.getElementById('photo-grid');
        
        // タグフィルタ時は従来の個別写真表示に戻す
        photoGrid.className = 'feature-grid';
        photoGrid.innerHTML = '';

        if (filteredPhotos.length === 0) {
            const noPhotos = document.createElement('p');
            noPhotos.textContent = 'タグに一致する写真はありません';
            noPhotos.className = 'no-photos-message';
            photoGrid.appendChild(noPhotos);
            document.getElementById('load-more').style.display = 'none';
        } else {
            // 最初の9枚のみ表示
            filteredPhotos.slice(0, 9).forEach(photo => {
                const photoCard = createPhotoCard(photo);
                photoGrid.appendChild(photoCard);
            });
            
            const loadMoreBtn = document.getElementById('load-more');
            if (filteredPhotos.length <= 9) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.onclick = function() {
                    const currentCount = photoGrid.children.length;
                    const nextBatch = filteredPhotos.slice(currentCount, currentCount + 9);
                    nextBatch.forEach(photo => {
                        const photoCard = createPhotoCard(photo);
                        photoGrid.appendChild(photoCard);
                    });
                    if (currentCount + nextBatch.length >= filteredPhotos.length) {
                        loadMoreBtn.style.display = 'none';
                        const message = document.createElement('p');
                        message.textContent = 'すべての写真を表示しました';
                        message.className = 'all-loaded-message';
                        loadMoreBtn.parentNode.appendChild(message);
                    }
                };
            }
        }
    }

    // 写真カードを作成する関数（タグフィルタ時に使用）
    function createPhotoCard(photo) {
        const photoCard = document.createElement('div');
        photoCard.className = 'feature-card';
        photoCard.innerHTML = `
            <a href="${photo.page}">
                <div class="feature-image" style="background-image: url('${photo.image}');"></div>
            </a>
        `;
        return photoCard;
    }

    // タグ取得
    function getTagFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('tag');
    }

    // 初期設定
    const tag = getTagFromUrl();
    if (tag) {
        // タグが指定されている場合は従来の個別写真表示
        filterPhotosByTag(tag);
    } else {
        // タグが指定されていない場合はロール別表示
        displayRolls();
    }
});