document.addEventListener("DOMContentLoaded", function() {
    // 現在のページから写真IDを取得
    function getPhotoIdFromUrl() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        
        // photo1.html から 1 を抽出
        const matches = filename.match(/photo(\d+)\.html/);
        if (matches && matches.length > 1) {
            return parseInt(matches[1]);
        }
        return null;
    }
    
    // 写真データを読み込む
    async function loadPhotoData() {
        try {
            const response = await fetch('../data/photos.json');
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
    
    // 関連写真を表示
    function displayRelatedPhotos(currentPhoto, allPhotos) {
        const relatedContainer = document.getElementById('related-photos-container');
        if (!relatedContainer) return;
        
        // 同じタグを持つ写真を関連写真として表示（現在の写真を除く）
        const relatedPhotos = allPhotos.filter(photo => 
            photo.id !== currentPhoto.id && 
            photo.tags.some(tag => currentPhoto.tags.includes(tag))
        ).slice(0, 3); // 最大3枚
        
        if (relatedPhotos.length === 0) {
            relatedContainer.innerHTML = '<p>関連写真はありません</p>';
            return;
        }
        
        relatedPhotos.forEach(photo => {
            const photoCard = document.createElement('div');
            photoCard.className = 'related-photo-card';
            
            photoCard.innerHTML = `
                <a href="${photo.page}">
                    <div class="related-photo-image" style="background-image: url('${photo.image}');"></div>
                    <h3>${photo.title}</h3>
                </a>
            `;
            
            relatedContainer.appendChild(photoCard);
        });
    }
    
    // メイン処理
    async function initPhotoDetail() {
        const photoId = getPhotoIdFromUrl();
        if (!photoId) {
            console.error('写真IDが見つかりません');
            return;
        }
        
        const photos = await loadPhotoData();
        const currentPhoto = photos.find(photo => photo.id === photoId);
        
        if (!currentPhoto) {
            console.error('指定されたIDの写真が見つかりません:', photoId);
            return;
        }
        
        // 関連写真を表示
        displayRelatedPhotos(currentPhoto, photos);
    }
    
    // 初期化
    initPhotoDetail();
});
