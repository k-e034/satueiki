/**
 * 写真閲覧ページのための共通スクリプト
 * 
 * 使用方法:
 * 1. 各写真ページでphotoDataオブジェクトを定義
 * 2. initPhotoViewer(photoData)を呼び出す
 */

// 写真ビューアの初期化
function initPhotoViewer(photoData) {
    document.addEventListener('DOMContentLoaded', function() {
        // ローディングアニメーション
        setTimeout(function() {
            document.getElementById('loading-overlay').style.opacity = 0;
            setTimeout(function() {
                document.getElementById('loading-overlay').style.display = 'none';
            }, 500);
        }, 1500);
        
        // ヘッダーのスクロール処理
        window.addEventListener('scroll', function() {
            var header = document.getElementById('photo-header');
            if (window.scrollY > 50) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        });
        
        // 写真のズーム処理
        const mainPhoto = document.getElementById('main-photo');
        const photoHero = document.getElementById('photo-hero');
        const titleOverlay = document.getElementById('title-overlay');
        
        let isZoomed = false;
        
        photoHero.addEventListener('click', function(e) {
            // クリックするとズームイン/アウト
            if (!isZoomed) {
                mainPhoto.style.transform = 'scale(1.5)';
                titleOverlay.style.opacity = 0;
            } else {
                mainPhoto.style.transform = 'scale(1)';
                titleOverlay.style.opacity = 1;
            }
            isZoomed = !isZoomed;
        });
        
        // 写真のマウス移動によるパン効果
        photoHero.addEventListener('mousemove', function(e) {
            if (isZoomed) {
                // マウス位置に基づいて写真をパン
                const xPos = (e.clientX / window.innerWidth) - 0.5;
                const yPos = (e.clientY / window.innerHeight) - 0.5;
                mainPhoto.style.transform = `scale(1.5) translate(${-xPos * 50}px, ${-yPos * 50}px)`;
            }
        });
        
        // ギャラリーに戻るボタン
        document.getElementById('gallery-btn').addEventListener('click', function() {
            window.location.href = 'gallery.html';
        });
        
        // 前後の写真ページへのナビゲーション
        if (photoData.prevPhoto) {
            document.getElementById('prev-photo').addEventListener('click', function(e) {
                e.stopPropagation(); // 親要素のクリックイベントを防止
                window.location.href = photoData.prevPhoto;
            });
        }
        
        if (photoData.nextPhoto) {
            document.getElementById('next-photo').addEventListener('click', function(e) {
                e.stopPropagation(); // 親要素のクリックイベントを防止
                window.location.href = photoData.nextPhoto;
            });
        }
        
        // キーボードナビゲーション
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' && photoData.nextPhoto) {
                window.location.href = photoData.nextPhoto;
            } else if (e.key === 'ArrowLeft' && photoData.prevPhoto) {
                window.location.href = photoData.prevPhoto;
            } else if (e.key === 'Escape') {
                if (isZoomed) {
                    mainPhoto.style.transform = 'scale(1)';
                    titleOverlay.style.opacity = 1;
                    isZoomed = false;
                }
            }
        });
        
        // 画像の読み込み完了イベント
        mainPhoto.onload = function() {
            mainPhoto.style.opacity = 1;
        };
    });
}

/**
 * スワイプ検出のためのヘルパー関数
 * (モバイル向け)
 */
function enableSwipeNavigation() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    const MIN_SWIPE_DISTANCE = 50;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        
        if (swipeDistance > MIN_SWIPE_DISTANCE) {
            // 右スワイプ (前の写真)
            document.getElementById('prev-photo').click();
        } else if (swipeDistance < -MIN_SWIPE_DISTANCE) {
            // 左スワイプ (次の写真)
            document.getElementById('next-photo').click();
        }
    }
}

/**
 * 遅延読み込みのための関数
 * (関連写真用)
 */
function setupLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-load');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy-load');
                imageObserver.unobserve(img);
            }
        });
    });
    
    lazyImages.forEach(img => {
        imageObserver.observe(img);
    });
}

// ページ読み込み時にスワイプナビゲーションとLazy Loadingを有効化
document.addEventListener('DOMContentLoaded', function() {
    enableSwipeNavigation();
    if ('IntersectionObserver' in window) {
        setupLazyLoading();
    }
});
