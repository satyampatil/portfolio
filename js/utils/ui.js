import gsap from 'gsap';

export function initUI() {
    const cursorFollower = document.getElementById('cursor-follower');
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;

    // --- SMART NAVBAR LOGIC ---
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // Don't hide at very top
        if (currentScrollY < 50) {
            navbar.classList.remove('nav-hidden');
            lastScrollY = currentScrollY;
            return;
        }

        // Scrolling Down -> Hide
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            navbar.classList.add('nav-hidden');
        } 
        // Scrolling Up -> Show
        else {
            navbar.classList.remove('nav-hidden');
        }
        
        lastScrollY = currentScrollY;
    }, { passive: true });


    // --- CURSOR LOGIC ---
    const moveCursor = (e) => {
        if(!cursorFollower) return;
        gsap.to(cursorFollower, {
            x: e.clientX, y: e.clientY,
            duration: 0.15, ease: "power2.out"
        });
    };
    window.addEventListener('mousemove', moveCursor);

    // Interactive Hover States
    const interactiveElements = document.querySelectorAll('a, button, .switch, .project-card, .gallery-item, .work-banner-content, .project-row, h1, h2, h3');
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => { if(cursorFollower) cursorFollower.classList.add('hovered'); });
        el.addEventListener('mouseleave', () => { if(cursorFollower) cursorFollower.classList.remove('hovered'); });
    });

    // --- MAGNETIC BUTTONS ---
    const magneticElements = document.querySelectorAll('.cta-btn, .nav-links li a, .social-links a, .work-banner-content');
    magneticElements.forEach((el) => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            // Move button slightly
            gsap.to(el, {
                x: x * 0.2, 
                y: y * 0.2,
                duration: 0.3,
                ease: "power2.out"
            });
            
            // Move cursor more (magnetic pull)
            if(cursorFollower) {
                 gsap.to(cursorFollower, {
                    x: e.clientX, 
                    y: e.clientY,
                    scale: 1.5,
                    duration: 0.3
                });
            }
        });

        el.addEventListener('mouseleave', () => {
            gsap.to(el, { x: 0, y: 0, duration: 0.3, ease: "elastic.out(1, 0.3)" });
            if(cursorFollower) gsap.to(cursorFollower, { scale: 1, duration: 0.3 });
        });
    });

    // --- TEXT HOVER EFFECT (Satyam Patil) ---
    const nameElements = document.querySelectorAll('.giant-first-name, .giant-last-name');
    nameElements.forEach(el => {
        const text = el.innerText;
        el.innerHTML = '';
        // Split text into spans
        [...text].forEach(char => {
            const span = document.createElement('span');
            span.innerText = char;
            span.style.display = 'inline-block';
            span.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            el.appendChild(span);
        });

        // Hover Effect
        el.addEventListener('mouseenter', () => {
            const spans = el.querySelectorAll('span');
            gsap.to(spans, {
                y: -20,
                rotateX: 90,
                opacity: 0,
                stagger: 0.05,
                duration: 0.2,
                onComplete: () => {
                    gsap.set(spans, { y: 20, rotateX: -90 });
                    gsap.to(spans, {
                        y: 0,
                        rotateX: 0,
                        opacity: 1,
                        stagger: 0.05,
                        duration: 0.4
                    });
                }
            });
        });
    });

    // --- PROJECT HOVER IMAGE REVEAL (The Vert Menthe Style) ---
    const projectRows = document.querySelectorAll('.project-row');
    const revealImage = document.querySelector('.hover-reveal-image');
    const revealInner = document.querySelector('.reveal-inner');

    if(projectRows.length && revealImage) {
        projectRows.forEach(row => {
            row.addEventListener('mouseenter', (e) => {
                const imgUrl = row.getAttribute('data-img');
                if(revealInner) revealInner.style.backgroundImage = `url(${imgUrl})`;
                
                gsap.to(revealImage, { 
                    opacity: 1, 
                    scale: 1, 
                    rotation: Math.random() * 6 - 3, // Random tilt
                    duration: 0.4, 
                    ease: "power2.out" 
                });
            });

            row.addEventListener('mousemove', (e) => {
                // Image follows cursor
                gsap.to(revealImage, {
                    x: e.clientX,
                    y: e.clientY,
                    duration: 0.6, // Slight lag for smooth feel
                    ease: "power3.out"
                });
            });

            row.addEventListener('mouseleave', () => {
                gsap.to(revealImage, { 
                    opacity: 0, 
                    scale: 0.8, 
                    duration: 0.3, 
                    ease: "power2.in" 
                });
            });
        });
    }

    // --- HERO LOAD ANIMATION ---
    window.addEventListener('load', () => {
        // Staggered reveal of hero elements
        const timeline = gsap.timeline({ delay: 0.2 });

        timeline.from('.nav-logo', { y: -20, opacity: 0, duration: 1, ease: "power4.out" })
                .from('.nav-links li', { y: -20, opacity: 0, stagger: 0.1, duration: 1, ease: "power4.out" }, "-=0.8")
                .from('.hero-pos-top', { y: 50, opacity: 0, duration: 1.2, ease: "power4.out" }, "-=0.5")
                .from('.giant-first-name', { y: 100, opacity: 0, duration: 1.5, ease: "power4.out" }, "-=1")
                .from('.giant-last-name', { y: 100, opacity: 0, duration: 1.5, ease: "power4.out" }, "-=1.3")
                .from('.hero-pos-bottom', { y: 30, opacity: 0, duration: 1, ease: "power4.out" }, "-=1");
    });

    // --- EXPERIENCE TOGGLE ---
    const expBtn = document.getElementById('toggle-experience-btn');
    const expSection = document.getElementById('additional-experience');
    
    if(expBtn && expSection) {
        expBtn.addEventListener('click', () => {
            const isHidden = expSection.style.display === 'none';
            if(isHidden) {
                expSection.style.display = 'block';
                expBtn.innerText = 'Show Less';
                // GSAP Reveal for the newly shown items
                gsap.fromTo(expSection.querySelectorAll('.timeline-item'), 
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: "power2.out" }
                );
            } else {
                expSection.style.display = 'none';
                expBtn.innerText = 'Show Additional Experience';
            }
        });
    }
}