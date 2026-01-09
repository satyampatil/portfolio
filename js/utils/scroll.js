import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm';

// Register Plugin
gsap.registerPlugin(ScrollTrigger);

// --- LENIS SETUP ---
export const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
});

export function initScrollAnimations() {
    // --- OBSERVER FOR REVEALS ---
    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if(entry.target.classList.contains('reveal-text')) {
                     gsap.to(entry.target, { y: "0%", opacity: 1, duration: 1.2, ease: "power4.out", overwrite: true });
                } else {
                    gsap.to(entry.target, { y: 0, opacity: 1, duration: 1.5, ease: "power4.out", overwrite: true });
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Safety checks before observing
    const revealText = document.querySelectorAll('.reveal-text');
    if(revealText.length) {
        revealText.forEach(el => { gsap.set(el, { y: "110%", opacity: 1 }); observer.observe(el); });
    }

    const revealFade = document.querySelectorAll('.reveal-fade, .reveal-up');
    if(revealFade.length) {
        revealFade.forEach(el => { gsap.set(el, { y: 50, opacity: 0 }); observer.observe(el); });
    }

    // --- PARALLAX EFFECT ---
    const scrollReactors = document.querySelectorAll('.scroll-reactor');
    scrollReactors.forEach(el => {
        const speed = parseFloat(el.getAttribute('data-speed')) || 0.05;
        const img = el.querySelector('img');
        if(img) {
            gsap.to(img, {
                yPercent: 15, ease: "none",
                scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } 
            });
            gsap.to(el, {
                y: -50 * speed, ease: "none",
                scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
            });
        }
    });

    // --- START BUTTON LOGIC & TEXT SWAP ---
    const startScrollBtn = document.getElementById('start-scroll-btn');
    if(startScrollBtn) {
        startScrollBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            document.body.classList.remove('no-scroll'); // Unlock scroll
            
            // Force Lenis update to recognize new document height
            lenis.resize(); 
            lenis.scrollTo('.desk-animation-spacer');
        });

        ScrollTrigger.create({
            trigger: "body",
            start: "10px top",
            onEnter: () => {
                startScrollBtn.innerHTML = '<span class="status-dot" style="display:inline-block; width:8px; height:8px; background:#25D366; border-radius:50%; margin-right:10px; box-shadow:0 0 8px #25D366;"></span>Available for work';
                gsap.to(startScrollBtn, { padding: "12px 24px", duration: 0.3 });
            },
            onLeaveBack: () => {
                startScrollBtn.innerText = 'Explore Portfolio';
                gsap.to(startScrollBtn, { padding: "16px 32px", duration: 0.3 });
            }
        });
    } else {
        console.warn("Start Scroll Button not found in DOM");
    }
}