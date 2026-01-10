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
    
    // --- 1. VELOCITY SKEW EFFECT (The Awwwards Feel) ---
    const mainContent = document.querySelector('main');
    
    // Hook into Lenis scroll event
    lenis.on('scroll', (e) => {
        // e.velocity is the speed of scroll
        // We limit it so it doesn't skew too crazy
        const skewAmount = Math.max(Math.min(e.velocity * 0.15, 5), -5);
        
        // Apply skew to content
        if (mainContent) {
            gsap.to(mainContent, { 
                skewY: skewAmount, 
                duration: 0.1, 
                ease: "power1.out" 
            });
        }
    });

    // --- 2. PREMIUM TEXT REVEALS (Masking instead of Fading) ---
    // Elements needing reveal must have .reveal-text or .reveal-up class
    
    // Setup initial state for text reveals
    const revealElements = document.querySelectorAll('.reveal-up, h3, p, .content-box h4');
    
    revealElements.forEach(el => {
        // We use clip-path to "unroll" the element
        gsap.set(el, { 
            y: 30,
            opacity: 0,
            // optional: clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" // Hidden top
        });

        gsap.to(el, {
            y: 0,
            opacity: 1,
            // clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", // Fully visible
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
                trigger: el,
                start: "top 85%", // Trigger slightly earlier
                toggleActions: "play none none reverse"
            }
        });
    });


    // --- 3. LIGHT BEAM LOGIC ---
    const lightBeams = document.querySelectorAll('.light-beam');
    lightBeams.forEach(beam => {
        const color = beam.getAttribute('data-color') || '#7c59f0';
        beam.style.setProperty('--beam-color', color);

        gsap.to(beam, {
            opacity: 0.15, 
            duration: 1.5,
            ease: "power2.out",
            scrollTrigger: {
                trigger: beam.parentElement, 
                start: "top 60%",            
                end: "bottom top",
                toggleActions: "play reverse play reverse", 
                onToggle: (self) => {
                    const event = new CustomEvent('beam-interaction', { 
                        detail: { 
                            isActive: self.isActive, 
                            color: color,
                            id: beam.parentElement.id 
                        } 
                    });
                    window.dispatchEvent(event);
                }
            }
        });
    });

    // --- 4. PARALLAX EFFECT ---
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

    // --- 5. START BUTTON LOGIC ---
    const startScrollBtn = document.getElementById('start-scroll-btn');
    if(startScrollBtn) {
        startScrollBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            document.body.classList.remove('no-scroll'); 
            lenis.resize(); 
            lenis.scrollTo('.desk-animation-spacer');
        });

        ScrollTrigger.create({
            trigger: "body",
            start: "10px top",
            onEnter: () => {
                startScrollBtn.innerHTML = '<span class="status-dot" style="display:inline-block; width:6px; height:6px; background:#00ff88; border-radius:50%; margin-right:8px; box-shadow:0 0 8px rgba(0,255,136,0.5);"></span> AVAILABLE';
                gsap.to(startScrollBtn, { 
                    padding: "10px 20px", 
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                    duration: 0.3 
                });
            },
            onLeaveBack: () => {
                startScrollBtn.innerText = 'Explore Portfolio';
                gsap.to(startScrollBtn, { 
                    padding: "16px 32px", 
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "none",
                    duration: 0.3 
                });
            }
        });
    }
}