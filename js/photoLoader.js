document.addEventListener("DOMContentLoaded", function() {
    // URLパラメータからタグを取得
    function getTagFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('tag');
    }

    // タグフィルタリングの場合のみ実行
    const tag = getTagFromUrl();
    if (!tag) {
        // タグがない場合は何もしない（ロール表示はgeneratePhotoPages.jsが担当）
        console.log('タグなし - generatePhotoPages.jsで生成されたロール表示を使用');
        return;
    }

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

    // 写真カードを作成する関数
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

    // タグによるフィルタリング
    async function filterPhotosByTag(tag) {
        console.log(`タグ "${tag}" で写真をフィルタリング中...`);
        
        const photos = await loadPhotoData();
        const filteredPhotos = photos.filter(photo => 
            photo.tags && photo.tags.includes(tag)
        );
        
        const photoGrid = document.getElementById('photo-grid');
        
        // タグフィルタ時は従来の個別写真表示に変更
        photoGrid.className = 'feature-grid';
        photoGrid.innerHTML = '';
        
        // ページタイトルを更新
        const mainContent = document.querySelector('.main-content');
        let title = mainContent.querySelector('h2');
        if (!title) {
            title = document.createElement('h2');
            title.className = 'section-title';
            mainContent.insertBefore(title, photoGrid);
        }
        title.textContent = `タグ「${tag}」の写真`;

        if (filteredPhotos.length === 0) {
            const noPhotos = document.createElement('p');
            noPhotos.textContent = 'タグに一致する写真はありません';
            noPhotos.className = 'no-photos-message';
            noPhotos.style.textAlign = 'center';
            noPhotos.style.color = '#aaa';
            noPhotos.style.margin = '2rem 0';
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
        
        // ロールを表示する場合のリンクを追加
        const backToRolls = document.createElement('div');
        backToRolls.style.textAlign = 'center';
        backToRolls.style.margin = '2rem 0';
        backToRolls.innerHTML = `<a href="index.html" class="btn">ロール一覧に戻る</a>`;
        mainContent.insertBefore(backToRolls, mainContent.firstChild);
    }

    // タグフィルタリングを実行
    filterPhotosByTag(tag);
});