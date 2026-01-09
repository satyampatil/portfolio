import gsap from 'gsap';

export const loaderState = {
    progress: 0,
    isComplete: false
};

export function initLoader() {
    const percentEl = document.querySelector('.loader-percent');
    const fillEl = document.querySelector('.loader-bar-fill');
    const preloader = document.getElementById('preloader');

    // Smoothly interpolate visual progress to actual progress
    // This prevents jumpy numbers
    let visualProgress = 0;

    const updateLoader = () => {
        if(loaderState.isComplete && visualProgress > 99) {
            // FINISH
            if(preloader && preloader.style.display !== 'none') {
                gsap.to(preloader, {
                    opacity: 0,
                    duration: 1,
                    ease: "power2.inOut",
                    onComplete: () => {
                        preloader.style.display = 'none';
                    }
                });
            }
            return; 
        }

        // Interpolate (ease) the number towards the real progress
        visualProgress += (loaderState.progress - visualProgress) * 0.1;
        
        // Update UI
        if(percentEl) percentEl.innerText = `${Math.round(visualProgress)}%`;
        if(fillEl) fillEl.style.width = `${visualProgress}%`;

        requestAnimationFrame(updateLoader);
    };

    updateLoader();
}

export function updateLoadProgress(ratio) {
    // ratio is 0 to 1
    // We map it to 0 to 100
    loaderState.progress = Math.min(ratio * 100, 100);
    
    if(loaderState.progress >= 100) {
        loaderState.isComplete = true;
    }
}