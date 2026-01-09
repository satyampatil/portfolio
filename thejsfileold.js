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
            
            // IF it's a Text Reveal (Slide Up)
            if(entry.target.classList.contains('reveal-text')) {
                 gsap.to(entry.target, {
                    y: "0%", // Slide up to original position
                    opacity: 1,
                    duration: 1.2,
                    ease: "power4.out",
                    overwrite: true
                });
            } 
            // ELSE it's a standard Fade Up (Cards, etc)
            else {
                gsap.to(entry.target, {
                    y: 0,
                    opacity: 1,
                    duration: 1.5,
                    ease: "power4.out",
                    overwrite: true
                });
            }
            
            observer.unobserve(entry.target); // Run once
        }
    });
}, observerOptions);

// Set initial state for Text Reveals
document.querySelectorAll('.reveal-text').forEach(el => {
    gsap.set(el, { y: "110%", opacity: 1 }); // Start below the mask line
    observer.observe(el);
});

// Set initial state for Standard Fades
document.querySelectorAll('.reveal-fade').forEach(el => {
    gsap.set(el, { y: 50, opacity: 0 }); 
    observer.observe(el);
});

// --- HERO TEXT ANIMATION (On Load) ---
// Animate the hero text sliding up from mask on load
window.addEventListener('load', () => {
    const heroTexts = document.querySelectorAll('.hero-card .line-text');
    gsap.to(heroTexts, {
        y: "0%",
        duration: 1.5,
        stagger: 0.2,
        ease: "power4.out",
        delay: 0.5 // Wait for loader a bit
    });

    const navItems = document.querySelectorAll('.reveal-nav');
    gsap.fromTo(navItems, 
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: "power2.out", delay: 1 }
    );
});


// --- NEW: PARALLAX IMAGE EFFECT FOR GALLERY ---
const scrollReactors = document.querySelectorAll('.scroll-reactor');
scrollReactors.forEach(el => {
    const speed = parseFloat(el.getAttribute('data-speed')) || 0.05;
    const img = el.querySelector('img');
    if(img) {
        gsap.to(img, {
            yPercent: 15, 
            ease: "none",
            scrollTrigger: {
                trigger: el,
                start: "top bottom", 
                end: "bottom top",   
                scrub: true
            } 
        });
        
        gsap.to(el, {
            y: -50 * speed, 
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

// --- 3. MAGNETIC BUTTONS (Refined for "Juice") ---
const magneticElements = document.querySelectorAll('.cta-btn, .nav-links li a, .social-links a');
const cursorFollower = document.getElementById('cursor-follower');

magneticElements.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        // Stronger magnet for that "Igloo" sticky feel
        gsap.to(el, {
            x: x * 0.5,
            y: y * 0.5,
            duration: 0.4,
            ease: "power2.out"
        });
        
        if(cursorFollower) {
            cursorFollower.classList.add('magnetic-active');
            // Make cursor grow slightly more
            gsap.to(cursorFollower, { scale: 1.5, duration: 0.3 });
        }
    });

    el.addEventListener('mouseleave', () => {
        // Snap back with elastic wobble
        gsap.to(el, {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.4)" 
        });
        if(cursorFollower) {
            cursorFollower.classList.remove('magnetic-active');
            gsap.to(cursorFollower, { scale: 1, duration: 0.3 });
        }
    });
});

// --- CURSOR FOLLOWER LOGIC ---
const moveCursor = (e) => {
    if(!cursorFollower) return;
    gsap.to(cursorFollower, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15, // Slightly looser for a "floaty" feel
        ease: "power2.out"
    });
};
window.addEventListener('mousemove', moveCursor);

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
renderer.domElement.style.zIndex = '-1'; 

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xaaccff, 0.8); 
sunLight.position.set(5, 10, 7);
sunLight.castShadow = true;
scene.add(sunLight);
sunLight.visible = false; 

// --- BLUE SPOTLIGHT (Interactive) ---
// Locked values provided by user
const spotLight = new THREE.SpotLight(0x0088ff, 92); // Intensity 92
spotLight.position.set(0.9, 3.1, -1); 
spotLight.angle = 1.33;
spotLight.penumbra = 1;
spotLight.decay = 2;
spotLight.distance = 25;
spotLight.castShadow = true;
spotLight.shadow.bias = -0.0001;
spotLight.target.position.set(0, 1, -1); // Locked target

scene.add(spotLight);
scene.add(spotLight.target);
spotLight.visible = false;

// --- WARM SPOTLIGHT (Locked Values) ---
const warmLight = new THREE.SpotLight(0xffaa33, 128); 
warmLight.position.set(0.1, 2.1, -2.6); 
warmLight.angle = 0.96;
warmLight.penumbra = 1;
warmLight.decay = 2;
warmLight.distance = 25;
warmLight.castShadow = true;
warmLight.shadow.bias = -0.0001;
warmLight.target.position.set(3, -4, 5); // Locked target

scene.add(warmLight);
scene.add(warmLight.target);
warmLight.visible = false; // Starts hidden, reveals with desk


// --- LOAD DESK MODEL ---
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

let loadedModel;
let mixer; // Animation Mixer global variable

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

        // Play Animation if it exists
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        }

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
        lenis.scrollTo('.desk-animation-spacer');
    });

    // NEW: CHANGE BUTTON TEXT ON SCROLL
    // As soon as user scrolls (body triggers), swap text to "Available for work"
    ScrollTrigger.create({
        trigger: "body",
        start: "10px top", // Trigger after just 10px of scrolling
        onEnter: () => {
            // Change text and add the green dot
            startScrollBtn.innerHTML = '<span class="status-dot" style="display:inline-block; width:8px; height:8px; background:#25D366; border-radius:50%; margin-right:10px; box-shadow:0 0 8px #25D366;"></span>Available for work';
            // Slight style adjustment (pill shape refined)
            gsap.to(startScrollBtn, { padding: "12px 24px", duration: 0.3 });
        },
        onLeaveBack: () => {
            // Revert when at the very top
            startScrollBtn.innerText = 'Explore Portfolio';
            gsap.to(startScrollBtn, { padding: "16px 32px", duration: 0.3 });
        }
    });
}

// --- INTERACTION LOGIC & SCROLL TRIGGER ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetIntensity = 0;

// NEW: Track desk progress via GSAP
const sceneState = { deskProgress: 0, heroOpacity: 1 };

// Trigger for the Desk Animation linked to the SPACER
ScrollTrigger.create({
    trigger: ".desk-animation-spacer",
    start: "top bottom", // Starts as soon as the spacer enters the viewport (when leaving hero)
    end: "bottom bottom", 
    scrub: 1, 
    onUpdate: (self) => {
        sceneState.deskProgress = self.progress;
    }
});

// Trigger to fade out the Hero Text as we scroll away
ScrollTrigger.create({
    trigger: ".desk-animation-spacer", // Changed from .hero to spacer for better sync
    start: "top bottom",
    end: "20% top",
    scrub: true,
    onUpdate: (self) => {
        sceneState.heroOpacity = 1 - self.progress;
    }
});

// --- NEW: FACE ANIMATION ("Sticky" Logic) ---
// Since it's position: fixed in CSS, we only need to fade it out.
// We trigger this based on the spacer entering the view.
gsap.to("#hero-face", {
    opacity: 0,
    ease: "power1.inOut",
    scrollTrigger: {
        trigger: ".desk-animation-spacer",
        start: "top bottom", // Start fading when the spacer enters from bottom (scrolling down from hero)
        end: "top top",      // Completely invisible when spacer hits the top (where desk animation starts)
        scrub: true
    }
});


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

    // Apply Fade to Hero Text (Excluding the fixed button)
    // We target the specific text containers instead of the whole card
    const heroTextElements = document.querySelectorAll('.hero-pos-top, .hero-pos-left, .hero-pos-right');
    heroTextElements.forEach(el => {
         el.style.opacity = sceneState.heroOpacity;
         // Disable pointer events when invisible
         el.style.pointerEvents = sceneState.heroOpacity < 0.1 ? 'none' : 'auto';
    });

    // UPDATE MIXER (For Animation/Sitting Pose)
    if (mixer) {
        mixer.update(clock.getDelta());
    }

    // USE GSAP PROGRESS FOR DESK ANIMATION
    const progress = sceneState.deskProgress;

    // Show model if progress is starting or greater
    if (progress >= 0 && loadedModel) {
         if (progress > 0.001) loadedModel.visible = true;
         
         if (progress > 0) {
             sunLight.visible = true;
             spotLight.visible = true;
             warmLight.visible = true; // Warm light visible
         }

        camera.position.lerpVectors(deskStartPos, deskEndPos, progress);
        currentLookAt.lerpVectors(deskLookAt, deskEndLookAt, progress);
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

        // Blue light pulsing logic
        spotLight.intensity += (targetIntensity - spotLight.intensity) * 0.1;

        if (window.bulbMesh) {
            const glowStrength = spotLight.intensity / 50; 
            window.bulbMesh.material.emissiveIntensity = glowStrength * 4; 
        }

    } else {
        camera.position.copy(deskStartPos);
        camera.lookAt(deskLookAt);
        
        // Ensure model is hidden at strict 0 to allow face to shine
        if(loadedModel && progress === 0) loadedModel.visible = false;
        if(progress < 0.01) {
             sunLight.visible = false;
             spotLight.visible = false;
             warmLight.visible = false;
        }
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