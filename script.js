import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';
// FIXED: Switched from Skypack to jsDelivr for stability
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import Lenis from 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/+esm';
import ScrollTrigger from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm';

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// --- 1. SMOOTH SCROLLING (LENIS) ---
// This makes the whole page scroll feel like it has weight and momentum
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
});

// --- 2. GSAP SCROLL REVEALS ---
const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Use GSAP for a springy, staggered reveal instead of plain CSS
            gsap.to(entry.target, {
                y: 0,
                opacity: 1,
                duration: 1.5,
                ease: "power4.out",
                overwrite: true
            });
            observer.unobserve(entry.target); // Run once
        }
    });
}, observerOptions);

// Set initial state for GSAP to animate TO
document.querySelectorAll('.reveal-up').forEach(el => {
    gsap.set(el, { y: 100, opacity: 0 }); // Start lower and invisible
    observer.observe(el);
});

// --- NEW: PARALLAX IMAGE EFFECT FOR GALLERY ---
// Finds all elements with .scroll-reactor and moves them slightly based on scroll
const scrollReactors = document.querySelectorAll('.scroll-reactor');
scrollReactors.forEach(el => {
    const speed = parseFloat(el.getAttribute('data-speed')) || 0.05;
    
    // Create a parallax effect using GSAP ScrollTrigger
    // We animate the image INSIDE the container to create the window effect
    const img = el.querySelector('img');
    if(img) {
        gsap.to(img, {
            yPercent: 15, // Move image down 15%
            ease: "none",
            scrollTrigger: {
                trigger: el,
                start: "top bottom", // Start when top of element hits bottom of viewport
                end: "bottom top",   // End when bottom of element hits top of viewport
                scrub: true
            } 
        });
        
        // Also subtle movement of the container itself in opposite direction
        gsap.to(el, {
            y: -50 * speed, // Move up slightly based on speed
            ease: "none",
            scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: true
            }
        });
    }
});

// --- 3. MAGNETIC BUTTONS ---
// Make buttons/links "stick" to the cursor slightly
const magneticElements = document.querySelectorAll('.cta-btn, .nav-links li a, .social-links a');
// Need access to cursorFollower, ensuring it's selected before use
const cursorFollower = document.getElementById('cursor-follower');

magneticElements.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        // Move the element towards the mouse (strength 0.3)
        gsap.to(el, {
            x: x * 0.3,
            y: y * 0.3,
            duration: 0.3,
            ease: "power2.out"
        });
        
        if(cursorFollower) {
            cursorFollower.classList.add('magnetic-active');
        }
    });

    el.addEventListener('mouseleave', () => {
        // Snap back to center
        gsap.to(el, {
            x: 0,
            y: 0,
            duration: 1,
            ease: "elastic.out(1, 0.3)" // Elastic wobble on release
        });
        if(cursorFollower) {
            cursorFollower.classList.remove('magnetic-active');
        }
    });
});

// --- CURSOR FOLLOWER LOGIC ---
const moveCursor = (e) => {
    if(!cursorFollower) return;
    // Use GSAP for smoother cursor following
    gsap.to(cursorFollower, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1, // Slight lag for fluid feel
        ease: "power2.out"
    });
};
window.addEventListener('mousemove', moveCursor);

// Add hover effect to interactive elements
const interactiveElements = document.querySelectorAll('a, button, .switch, .project-card, .gallery-item');
interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => { if(cursorFollower) cursorFollower.classList.add('hovered'); });
    el.addEventListener('mouseleave', () => { if(cursorFollower) cursorFollower.classList.remove('hovered'); });
});

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// --- CAMERA CONFIGURATION ---
const deskStartPos = new THREE.Vector3(0, 2.3, -1);
const deskLookAt = new THREE.Vector3(10, 3.5, -3.5);

const deskEndPos = new THREE.Vector3(2, 2.5, 4); 
const deskEndLookAt = new THREE.Vector3(-6, 1, -2);

const currentLookAt = new THREE.Vector3().copy(deskLookAt);

camera.position.copy(deskStartPos);
camera.lookAt(deskLookAt);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance",
    precision: "highp",
    stencil: false,
    depth: true
}); 
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; 
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '-2'; 

// --- GUI CONTROLS ---
const gui = new GUI();
gui.domElement.parentElement.style.zIndex = "10000";
gui.hide(); 

const debugParams = {
    useManualScroll: false, 
    manualScroll: 0
};
const debugFolder = gui.addFolder('1. Debug / Manual Scroll');
debugFolder.add(debugParams, 'useManualScroll').name('Enable Manual Control');
debugFolder.add(debugParams, 'manualScroll', 0, 1).name('Scroll Position').listen();
debugFolder.close();

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xaaccff, 0.8); 
sunLight.position.set(5, 10, 7);
sunLight.castShadow = true;
scene.add(sunLight);
sunLight.visible = false; 

const spotLight = new THREE.SpotLight(0x0088ff, 0); 
spotLight.position.set(2, 4, 0); 
spotLight.angle = Math.PI / 6;
spotLight.penumbra = 0.4;
spotLight.decay = 2;
spotLight.distance = 25;
spotLight.castShadow = true;
spotLight.shadow.bias = -0.0001;
scene.add(spotLight);
scene.add(spotLight.target);
spotLight.visible = false;

// --- LOAD DESK MODEL ---
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

let loadedModel;

function loadDeskModel(url, isHighQuality) {
    if (loadedModel) {
        scene.remove(loadedModel);
        loadedModel.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        loadedModel = null;
    }

    loader.load(url, function (gltf) {
        const model = gltf.scene;
        model.position.set(0, 0, 0); 
        model.scale.set(2, 2, 2);
        model.visible = false; 

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (!isHighQuality) {
                    if (!child.material.name.toLowerCase().includes("glass") && !child.material.name.toLowerCase().includes("bulb")) {
                         child.material = new THREE.MeshStandardMaterial({ 
                             color: 0xcccccc, roughness: 0.5, metalness: 0.1 
                         });
                    }
                } else {
                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                        if (child.material.metalness > 0.1) {
                            child.material.metalness = 0.1; 
                            child.material.roughness = 0.6; 
                        }
                    }
                }

                const name = child.name.toLowerCase();
                if (name.includes('bulb') || name.includes('glass') || name.includes('sphere') || name.includes('light')) {
                    window.bulbMesh = child; 
                    child.material = child.material.clone();
                    child.material.side = THREE.DoubleSide; 
                    child.material.emissive = new THREE.Color(0x0088ff);
                    child.material.emissiveIntensity = 0;
                    child.material.transparent = true;
                    child.material.opacity = 0.9;
                }
            }
        });

        loadedModel = model;
        scene.add(loadedModel);
        
        console.log("Desk Loaded. Dismissing loader.");
        window.dispatchEvent(new Event('desk-loaded'));

    }, undefined, function (error) {
        console.error("Error loading model:", error);
    });
}

// Initial Load
loadDeskModel('my_desk.glb', false);

const renderToggle = document.getElementById('render-mode');
if(renderToggle) {
    renderToggle.addEventListener('change', (e) => {
        if(e.target.checked) {
            loadDeskModel('my_desk_colour.glb', true);
        } else {
            loadDeskModel('my_desk.glb', false);
        }
    });
}

// --- START BUTTON LOGIC ---
const startScrollBtn = document.getElementById('start-scroll-btn');
if(startScrollBtn) {
    startScrollBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        document.body.classList.remove('no-scroll');
        // Use Lenis to scroll smoothly
        lenis.scrollTo('#about');
    });
}

// --- INTERACTION LOGIC ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetIntensity = 0;
let scrollProgress = 0;
let targetScrollProgress = 0;

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate(time) {
    // UPDATE LENIS (Required for smooth scroll)
    lenis.raf(time);
    
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); // Use getDelta safely

    if (debugParams.useManualScroll) {
        scrollProgress = debugParams.manualScroll;
    } else {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollTop = window.scrollY; // This works with Lenis too
        
        if (maxScroll > 0) {
            targetScrollProgress = scrollTop / maxScroll;
        } else {
            targetScrollProgress = 0;
        }
        scrollProgress += (targetScrollProgress - scrollProgress) * 0.05;
        debugParams.manualScroll = scrollProgress;
    }

    const deskThreshold = 0.1; 
    
    // FADE HERO CARD
    const heroCard = document.querySelector('.hero-card');
    if(heroCard) {
        const opacity = Math.max(0, 1 - (scrollProgress * 5)); 
        heroCard.style.opacity = opacity;
        // Use GSAP for performant transforms if you wanted, but direct setting is fine here
        heroCard.style.transform = `translateY(${scrollProgress * 200}px)`;
        heroCard.style.pointerEvents = opacity < 0.1 ? 'none' : 'auto';
    }

    // DESK ANIMATION
    if (scrollProgress > deskThreshold) {
        if(loadedModel) loadedModel.visible = true;
        sunLight.visible = true;
        spotLight.visible = true;

        let deskProgress = (scrollProgress - deskThreshold) / (1 - deskThreshold);
        deskProgress = Math.max(0, Math.min(1, deskProgress));

        camera.position.lerpVectors(deskStartPos, deskEndPos, deskProgress);
        currentLookAt.lerpVectors(deskLookAt, deskEndLookAt, deskProgress);
        camera.lookAt(currentLookAt);

        raycaster.setFromCamera(mouse, camera);
        
        if (loadedModel) {
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length > 0) {
                targetIntensity = 50; 
            } else {
                targetIntensity = 0; 
            }
        }

        spotLight.intensity += (targetIntensity - spotLight.intensity) * 0.1;

        if (window.bulbMesh) {
            const glowStrength = spotLight.intensity / 50; 
            window.bulbMesh.material.emissiveIntensity = glowStrength * 4; 
        }

    } else {
        camera.position.copy(deskStartPos);
        camera.lookAt(deskLookAt);
        
        if(loadedModel) loadedModel.visible = false;
        sunLight.visible = false;
        spotLight.visible = false;
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Pass 0 to start
animate(0);