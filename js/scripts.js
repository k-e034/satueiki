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
        // モバイルデバイスの検出
        const isMobile = window.innerWidth <= 768;
        
        // モバイル向けヘッダートグルの追加
        if (isMobile) {
            addHeaderToggle();
        }
        
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
        
        if (!mainPhoto || !photoHero || !titleOverlay) {
            console.error('写真要素が見つかりません');
            return;
        }
        
        let isZoomed = false;
        
        // タッチデバイスではズーム機能を調整
        if ('ontouchstart' in window) {
            // タッチデバイス用のダブルタップズーム
            let lastTap = 0;
            photoHero.addEventListener('touchend', function(e) {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                
                if (tapLength < 500 && tapLength > 0) {
                    // ダブルタップ検出
                    toggleZoom();
                    e.preventDefault();
                }
                
                lastTap = currentTime;
            });
        } else {
            // 非タッチデバイス用のクリックズーム
            photoHero.addEventListener('click', function() {
                toggleZoom();
            });
        }
        
        function toggleZoom() {
            if (!isZoomed) {
                mainPhoto.style.transform = 'scale(1.5)';
                titleOverlay.style.opacity = 0;
            } else {
                mainPhoto.style.transform = 'scale(1)';
                titleOverlay.style.opacity = 1;
            }
            isZoomed = !isZoomed;
        }
        
        // 写真のマウス移動/タッチによるパン効果
        if ('ontouchstart' in window) {
            // タッチデバイス用のパン処理
            let startX = 0;
            let startY = 0;
            let initialX = 0;
            let initialY = 0;
            
            photoHero.addEventListener('touchstart', function(e) {
                if (isZoomed && e.touches.length === 1) {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    
                    // 現在の変換行列から初期位置を取得
                    const transform = window.getComputedStyle(mainPhoto).getPropertyValue('transform');
                    const matrix = transform.match(/matrix.*\((.+)\)/);
                    if (matrix) {
                        const values = matrix[1].split(', ');
                        initialX = values[4] || 0;
                        initialY = values[5] || 0;
                    }
                    
                    e.preventDefault();
                }
            });
            
            photoHero.addEventListener('touchmove', function(e) {
                if (isZoomed && e.touches.length === 1) {
                    const x = e.touches[0].clientX;
                    const y = e.touches[0].clientY;
                    
                    const deltaX = (x - startX) * 0.5;
                    const deltaY = (y - startY) * 0.5;
                    
                    const newX = parseInt(initialX) + deltaX;
                    const newY = parseInt(initialY) + deltaY;
                    
                    // 移動制限（あまり遠くにパンしないようにする）
                    const maxPan = 100;
                    const clampedX = Math.min(Math.max(newX, -maxPan), maxPan);
                    const clampedY = Math.min(Math.max(newY, -maxPan), maxPan);
                    
                    mainPhoto.style.transform = `scale(1.5) translate(${clampedX}px, ${clampedY}px)`;
                    
                    e.preventDefault();
                }
            });
        } else {
            // 非タッチデバイス用のマウスパン
            photoHero.addEventListener('mousemove', function(e) {
                if (isZoomed) {
                    // マウス位置に基づいて写真をパン
                    const xPos = (e.clientX / window.innerWidth) - 0.5;
                    const yPos = (e.clientY / window.innerHeight) - 0.5;
                    mainPhoto.style.transform = `scale(1.5) translate(${-xPos * 50}px, ${-yPos * 50}px)`;
                }
            });
        }
        
        // ギャラリーに戻るボタン
        const galleryBtn = document.getElementById('gallery-btn');
        if (galleryBtn) {
            galleryBtn.addEventListener('click', function() {
                window.location.href = 'gallery.html';
            });
        }
        
        // 前後の写真ページへのナビゲーション
        const prevBtn = document.getElementById('prev-photo');
        const nextBtn = document.getElementById('next-photo');
        
        if (prevBtn && photoData.prevPhoto) {
            prevBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // 親要素のクリックイベントを防止
                window.location.href = photoData.prevPhoto;
            });
        }
        
        if (nextBtn && photoData.nextPhoto) {
            nextBtn.addEventListener('click', function(e) {
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
        
        // スワイプナビゲーションとLazy Loadingを有効化
        enableSwipeNavigation();
        if ('IntersectionObserver' in window) {
            setupLazyLoading();
        }
    });
}

/**
 * モバイル向けのヘッダートグルボタンを追加
 */
function addHeaderToggle() {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'header-toggle';
    toggleBtn.innerHTML = '≡';
    toggleBtn.setAttribute('aria-label', 'メニュー切替');
    
    document.body.appendChild(toggleBtn);
    
    toggleBtn.addEventListener('click', function() {
        const header = document.getElementById('photo-header');
        header.classList.toggle('header-visible');
    });
    
    // 写真エリアをタップしたらヘッダーを隠す
    const photoHero = document.getElementById('photo-hero');
    if (photoHero) {
        photoHero.addEventListener('click', function() {
            const header = document.getElementById('photo-header');
            header.classList.remove('header-visible');
        });
    }
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
            const prevBtn = document.getElementById('prev-photo');
            if (prevBtn) prevBtn.click();
        } else if (swipeDistance < -MIN_SWIPE_DISTANCE) {
            // 左スワイプ (次の写真)
            const nextBtn = document.getElementById('next-photo');
            if (nextBtn) nextBtn.click();
        }
    }
}

/**
 * 遅延読み込みのための関数
 * (関連写真用)
 */
function setupLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-load');
    
    if (lazyImages.length === 0) return;
    
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
