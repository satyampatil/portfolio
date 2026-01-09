import gsap from 'gsap';

export function initUI() {
    const cursorFollower = document.getElementById('cursor-follower');

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
    const interactiveElements = document.querySelectorAll('a, button, .switch, .project-card, .gallery-item, .work-banner-content');
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
            
            gsap.to(el, { x: x * 0.5, y: y * 0.5, duration: 0.4, ease: "power2.out" });
            
            if(cursorFollower) {
                cursorFollower.classList.add('magnetic-active');
                gsap.to(cursorFollower, { scale: 1.5, duration: 0.3 });
            }
        });

        el.addEventListener('mouseleave', () => {
            gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
            if(cursorFollower) {
                cursorFollower.classList.remove('magnetic-active');
                gsap.to(cursorFollower, { scale: 1, duration: 0.3 });
            }
        });
    });

    // --- NAME TEXT ROLL ANIMATION (UPDATED) ---
    const nameElements = document.querySelectorAll('.giant-first-name, .giant-last-name');
    nameElements.forEach(el => {
        // Enable 3D perspective on parent for the roll effect
        el.style.perspective = '1000px';

        // 1. Split text into spans for letter-by-letter control
        const text = el.innerText;
        el.innerHTML = text.split('').map(char => 
            `<span style="display:inline-block; transform-style: preserve-3d;">${char === ' ' ? '&nbsp;' : char}</span>`
        ).join('');
        
        const chars = el.querySelectorAll('span');
        const introColor = '#7c59f0'; // Purple color from intro.js config
        
        // 2. Add Hover Animation (Roll Forward)
        el.addEventListener('mouseenter', () => {
            gsap.to(chars, {
                rotateX: 360,
                color: introColor,
                duration: 0.8,
                stagger: 0.05,        // Delay between each letter
                ease: "back.out(1.7)", // Overshoot for "roll" feel
                overwrite: true
            });
        });

        // 3. Add Leave Animation (Reverse Roll)
        el.addEventListener('mouseleave', () => {
            gsap.to(chars, {
                rotateX: 0,
                color: '#ffffff',      // Back to white
                duration: 0.8,
                stagger: 0.05,
                ease: "back.out(1.7)",
                overwrite: true
            });
        });
    });

    // --- PROJECT IMAGE REVEAL (The Vert Menthe Style) ---
    const revealContainer = document.querySelector('.hover-reveal-image');
    const revealInner = document.querySelector('.reveal-inner');
    const projectRows = document.querySelectorAll('.project-row');

    if(revealContainer && projectRows.length > 0) {
        // Move container with mouse
        window.addEventListener('mousemove', (e) => {
            gsap.to(revealContainer, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.4,
                ease: "power2.out"
            });
        });

        projectRows.forEach(row => {
            row.addEventListener('mouseenter', () => {
                const imgUrl = row.getAttribute('data-img');
                if(revealInner) revealInner.style.backgroundImage = `url(${imgUrl})`;
                
                // Show Image
                gsap.to(revealContainer, { 
                    opacity: 1, 
                    scale: 1, 
                    duration: 0.4, 
                    ease: "power2.out" 
                });
                gsap.to(revealInner, { scale: 1, duration: 0.4 });
                
                // Expand Cursor
                if(cursorFollower) {
                    cursorFollower.classList.add('hovered');
                    gsap.to(cursorFollower, { scale: 2, mixBlendMode: 'normal', backgroundColor: 'transparent', border: '1px solid white' });
                }
            });

            row.addEventListener('mouseleave', () => {
                // Hide Image
                gsap.to(revealContainer, { 
                    opacity: 0, 
                    scale: 0.8, 
                    duration: 0.3, 
                    ease: "power2.in" 
                });
                
                // Reset Cursor
                if(cursorFollower) {
                    cursorFollower.classList.remove('hovered');
                    gsap.to(cursorFollower, { scale: 1, mixBlendMode: 'exclusion', backgroundColor: '#fff', border: 'none' });
                }
            });
        });
    }

    // --- HERO LOAD ANIMATION ---
    window.addEventListener('load', () => {
        const heroHeadings = document.querySelectorAll('.hero-card h1, .hero-card h2');
        if(heroHeadings.length > 0) {
             gsap.from(heroHeadings, { 
                 y: 100, 
                 opacity: 0, 
                 duration: 1.5, 
                 stagger: 0.2, 
                 ease: "power4.out", 
                 delay: 0.5 
            });
        }
        
        const navItems = document.querySelectorAll('.nav-links li');
        if(navItems.length > 0) {
            gsap.fromTo(navItems, 
                { y: -20, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power2.out", delay: 1 }
            );
        }
    });
}