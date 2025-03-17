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

    // 写真グリッドに写真を表示する関数
    async function displayPhotos(page = 1, perPage = 9) {
        const photos = await loadPhotoData();
        const photoGrid = document.getElementById('photo-grid');
        
        // グリッドをクリア
        photoGrid.innerHTML = '';
        
        // ページネーション計算
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const currentPhotos = photos.slice(start, end);
        
        // 写真カードを追加
        currentPhotos.forEach(photo => {
            const photoCard = createPhotoCard(photo);
            photoGrid.appendChild(photoCard);
        });
        
        // もっと見るボタンの表示/非表示を設定
        const loadMoreBtn = document.getElementById('load-more');
        if (end >= photos.length) {
            loadMoreBtn.style.display = 'none';
            
            // すべての写真を表示したメッセージ
            const allLoaded = document.querySelector('.all-loaded-message');
            if (!allLoaded) {
                const message = document.createElement('p');
                message.textContent = 'すべての写真を表示しました';
                message.className = 'all-loaded-message';
                loadMoreBtn.parentNode.appendChild(message);
            }
        } else {
            loadMoreBtn.style.display = 'block';
            const allLoaded = document.querySelector('.all-loaded-message');
            if (allLoaded) {
                allLoaded.remove();
            }
        }
    }

    // もっと見るボタンのイベントリスナー
    let currentPage = 1;
    const loadMoreBtn = document.getElementById('load-more');
    
    loadMoreBtn.addEventListener('click', function() {
        currentPage++;
        displayPhotos(currentPage);
    });

    // 初期表示
    displayPhotos(1);

    // タグによるフィルタリング機能
    function getTagFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('tag');
    }

    // タグフィルタリングがある場合
    const tag = getTagFromUrl();
    if (tag) {
        filterPhotosByTag(tag);
    }

    async function filterPhotosByTag(tag) {
        const photos = await loadPhotoData();
        const filteredPhotos = photos.filter(photo => photo.tags.includes(tag));
        
        const photoGrid = document.getElementById('photo-grid');
        photoGrid.innerHTML = '';
        
        if (filteredPhotos.length === 0) {
            const noPhotos = document.createElement('p');
            noPhotos.textContent = 'タグに一致する写真はありません';
            noPhotos.className = 'no-photos-message';
            photoGrid.appendChild(noPhotos);
            
            // もっと見るボタンを非表示
            document.getElementById('load-more').style.display = 'none';
        } else {
            // 最初の9枚のみ表示
            filteredPhotos.slice(0, 9).forEach(photo => {
                const photoCard = createPhotoCard(photo);
                photoGrid.appendChild(photoCard);
            });
            
            // もっと見るボタンの表示/非表示を設定
            const loadMoreBtn = document.getElementById('load-more');
            if (filteredPhotos.length <= 9) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
                
                // タグフィルタリング時の「もっと見る」ボタンの処理
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
});
