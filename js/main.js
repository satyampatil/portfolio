import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger'; 
// Re-enabled GUI for manual positioning
import { GUI } from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js'; 

gsap.registerPlugin(ScrollTrigger);

// --- MODULE IMPORTS ---
import { lenis, initScrollAnimations } from './utils/scroll.js';
import { initUI } from './utils/ui.js';
import { initTracker } from './utils/tracker.js'; 
import { initLoader } from './utils/loader.js';
import { initInkBackground } from './utils/ink.js'; 
import { scene, camera, renderer, sunLight, spotLight, warmLight } from './scene/setup.js';
import { loadDeskModel, deskState } from './scene/desk.js';

// --- CONFIG ---
const DEBUG_MODE = false; // Enabled for manual tuning
const LIGHT_DEBUG_MODE = false;

// --- INITIALIZATION ---
let inkEffect = null; 

document.addEventListener('DOMContentLoaded', () => {
    initLoader(); 
    initUI();
    initScrollAnimations();
    initTracker();
    
    inkEffect = initInkBackground(scene);

    if (DEBUG_MODE) {
        initDebugGUI();
    }

    document.body.classList.remove('no-scroll');

    if(renderer.domElement) {
        renderer.domElement.style.zIndex = '0'; 
    }

    loadDeskModel('my_desk.glb', false); 
    
    if(LIGHT_DEBUG_MODE) initLightDebugPanel();
});

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

// --- ANIMATION STATE & CONFIG ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetIntensity = 0;

// --- CAMERA CONFIGURATION ---
const deskStartPos = new THREE.Vector3(0, 2.3, -1);
const deskLookAt = new THREE.Vector3(10, 3.5, -3.5);

const deskEndPos = new THREE.Vector3(2, 2.5, 4); 
const deskEndLookAt = new THREE.Vector3(-6, 1, -2);
const currentLookAt = new THREE.Vector3().copy(deskLookAt);

// Scene Progress State
const sceneState = { deskProgress: 0, heroOpacity: 1 };

// --- BEAM LIGHT SETUP ---
const debugConfig = { maxIntensity: 2000 }; 
const beamLight = new THREE.SpotLight(0x7c59f0, 0); 
beamLight.position.set(6, 3, 39.2); 
beamLight.angle = 0.1;                 
beamLight.penumbra = 0;                
beamLight.distance = 100;              
beamLight.castShadow = true;
scene.add(beamLight);
scene.add(beamLight.target);
beamLight.target.position.set(0, 0, 0); 

// --- LIGHT BEAM & INK LOGIC ---
const activeBeams = new Set(); 

window.addEventListener('beam-interaction', (e) => {
    const { isActive, color, id } = e.detail;
    
    if(isActive) {
        activeBeams.add(id);
        
        if(color) beamLight.color.set(color);

        if(inkEffect && color) {
            const targetColor = new THREE.Color(color);
            gsap.to(inkEffect.uniforms.uInkColor.value, {
                r: targetColor.r,
                g: targetColor.g,
                b: targetColor.b,
                duration: 1.5,
                ease: "power2.out"
            });
        }
    } else {
        activeBeams.delete(id);
    }

    const shouldBeOn = activeBeams.size > 0;

    gsap.to(beamLight, {
        intensity: shouldBeOn ? debugConfig.maxIntensity : 0, 
        duration: 1.5,
        ease: "power2.inOut"
    });
});


// --- SCENE SCROLL TRIGGERS ---
ScrollTrigger.create({
    trigger: ".desk-animation-spacer",
    start: "top bottom", 
    end: "bottom bottom", 
    scrub: 1, 
    onUpdate: (self) => {
        sceneState.deskProgress = self.progress;
    }
});

ScrollTrigger.create({
    trigger: ".desk-animation-spacer",
    start: "top bottom",
    end: "20% top",
    scrub: true,
    onUpdate: (self) => {
        sceneState.heroOpacity = 1 - self.progress;
    }
});

gsap.set("#hero-face", { opacity: 1 }); 

gsap.to("#hero-face", {
    opacity: 0,
    ease: "power1.inOut", 
    scrollTrigger: {
        trigger: ".desk-animation-spacer",
        start: "top bottom", 
        end: "+=50", 
        scrub: true 
    }
});

// --- 3D INTERACTIVE LABELS ---
const labelContainer = document.createElement('div');
labelContainer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:500;';
document.body.appendChild(labelContainer);

function createLabel(text, interactableItem) {
    const el = document.createElement('div');
    el.className = 'interactive-label';
    el.innerHTML = `
        <div class="label-line"></div>
        <div class="label-box">
            <span class="label-text">${text}</span>
        </div>
    `;
    el.style.cssText = 'position:absolute; opacity:0; transition:opacity 0.3s; pointer-events:auto; cursor:pointer;';
    
    const box = el.querySelector('.label-box');
    box.style.cssText = 'background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.3); padding:8px 16px; border-radius:4px; backdrop-filter:blur(4px);';
    
    const line = el.querySelector('.label-line');
    line.style.cssText = 'position:absolute; height:1px; background:#fff; top:0; left:0; transform-origin:0 0;';
    
    labelContainer.appendChild(el);
    
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerAction(interactableItem.id);
    });
    
    return { element: el, box: box, line: line, visible: false };
}

function triggerAction(id) {
    if (id === 'phone') window.open('https://www.linkedin.com/in/satyampatil/', '_blank');
    else if (id === 'monitor') window.open('https://github.com/satyampatil', '_blank');
    else if (id === 'lamp') {
        const lightsOn = spotLight.visible;
        if (lightsOn) {
            gsap.to(spotLight, { intensity: 0, duration: 0.5, onComplete: () => { spotLight.visible = false; } });
            gsap.to(warmLight, { intensity: 0, duration: 0.5, onComplete: () => { warmLight.visible = false; } });
            gsap.to(sunLight, { intensity: 0.2, duration: 0.5 }); 
            if (deskState.bulbMesh) gsap.to(deskState.bulbMesh.material, { emissiveIntensity: 0, duration: 0.5 });
        } else {
            spotLight.visible = true;
            warmLight.visible = true;
            gsap.to(spotLight, { intensity: 92, duration: 0.5 });
            gsap.to(warmLight, { intensity: 128, duration: 0.5 });
            gsap.to(sunLight, { intensity: 0.8, duration: 0.5 });
            if (deskState.bulbMesh) gsap.to(deskState.bulbMesh.material, { emissiveIntensity: 4, duration: 0.5 });
        }
    }
}

const interactables = [
    { id: 'phone', name: 'LinkedIn', pos: new THREE.Vector3(), anchorAdj: { x: -9, y: 45 }, labelOffset: { x: -128, y: 80 } },  
    { id: 'monitor', name: 'GitHub', pos: new THREE.Vector3(), anchorAdj: { x: -291, y: 203 }, labelOffset: { x: -181, y: -17 } },   
    { id: 'lamp', name: 'Lights', pos: new THREE.Vector3(), anchorAdj: { x: -8, y: -6 }, labelOffset: { x: 1, y: -170 } }         
];

// --- DEBUG GUI FUNCTION ---
function initDebugGUI() {
    const gui = new GUI();
    const folder = gui.addFolder('Interactive Labels');
    
    // FORCE Z-INDEX TO BRING TO FRONT
    gui.domElement.parentElement.style.zIndex = "100000"; 
    
    interactables.forEach(item => {
        const sub = folder.addFolder(item.name);
        sub.add(item.anchorAdj, 'x', -500, 500).name('Anchor X (Screen)');
        sub.add(item.anchorAdj, 'y', -500, 500).name('Anchor Y (Screen)');
        sub.add(item.labelOffset, 'x', -300, 300).name('Label Off X');
        sub.add(item.labelOffset, 'y', -300, 300).name('Label Off Y');
        sub.open();
    });
    folder.open();
}

let hoveredObject = null;

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('click', () => {
    if (hoveredObject) {
        const name = hoveredObject.name.toLowerCase();
        if (name === 'jzzwgjgqqvfdjsg' || name.includes('iphone') || name.includes('phone')) triggerAction('phone');
        else if (name === 'object_24_custom_0' || (name.includes('monitor') && !name.includes('ipad'))) triggerAction('monitor');
        else if (name.includes('lamp') || name.includes('bulb')) triggerAction('lamp');
    }
});

window.addEventListener('resize', () => {
    if(inkEffect) inkEffect.resize(window.innerWidth, window.innerHeight);
});

// --- TRACK VISIBLE CARDS FOR INK MASK ---
const contentCards = document.getElementsByClassName('content-box'); 

// SMOOTH MASK STATE
const maskTarget = { x: 0, y: 0, w: 0, h: 0 };
const maskCurrent = { x: 0, y: 0, w: 0, h: 0 };
const LERP_FACTOR = 0.1; // Smoothness factor

function updateInkMaskLogic() {
    let bestCandidate = null;
    let maxOverlap = 0;
    const vH = window.innerHeight;

    // 1. Calculate TARGET mask based on DOM
    for (let i = 0; i < contentCards.length; i++) {
        const rect = contentCards[i].getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < vH) {
            const visibleH = Math.min(rect.bottom, vH) - Math.max(rect.top, 0);
            if (visibleH > maxOverlap) {
                maxOverlap = visibleH;
                bestCandidate = rect;
            }
        }
    }

    if (bestCandidate) {
        maskTarget.x = bestCandidate.x;
        maskTarget.y = bestCandidate.y;
        maskTarget.w = bestCandidate.width;
        maskTarget.h = bestCandidate.height;
    } else {
        // If no card is visible, shrink mask to center or 0
        maskTarget.x = window.innerWidth / 2;
        maskTarget.y = window.innerHeight / 2;
        maskTarget.w = 0;
        maskTarget.h = 0;
    }

    // 2. Interpolate CURRENT mask towards TARGET
    // This removes the "Snap" effect
    maskCurrent.x += (maskTarget.x - maskCurrent.x) * LERP_FACTOR;
    maskCurrent.y += (maskTarget.y - maskCurrent.y) * LERP_FACTOR;
    maskCurrent.w += (maskTarget.w - maskCurrent.w) * LERP_FACTOR;
    maskCurrent.h += (maskTarget.h - maskCurrent.h) * LERP_FACTOR;

    // 3. Send to Shader
    if (inkEffect) {
        inkEffect.updateMaskDirect(maskCurrent.x, maskCurrent.y, maskCurrent.w, maskCurrent.h, vH);
    }
}

const clock = new THREE.Clock();

function animate(time) {
    lenis.raf(time);
    requestAnimationFrame(animate);

    const currentTime = clock.getElapsedTime(); 
    
    if(inkEffect) {
        inkEffect.update(currentTime);
        
        // FIX: Use lenis.scroll (precise float) instead of window.scrollY (integer)
        // Fallback to window.scrollY if lenis isn't ready
        const scrollPos = lenis.scroll || window.scrollY;
        inkEffect.updateScroll(scrollPos);
        
        updateInkMaskLogic(); 
    }

    const heroTextElements = document.querySelectorAll('.hero-pos-top, .hero-pos-left, .hero-pos-right');
    if(heroTextElements.length > 0) {
        heroTextElements.forEach(el => {
            el.style.opacity = sceneState.heroOpacity;
            el.style.pointerEvents = sceneState.heroOpacity < 0.1 ? 'none' : 'auto';
        });
    }

    if (deskState.mixer) deskState.mixer.update(clock.getDelta());

    const progress = sceneState.deskProgress;

    if (deskState.model) {
        if (progress > 0.02) {
             deskState.model.visible = true; 
             if (!spotLight.visible && !hoveredObject && sunLight.intensity > 0.5) { 
                 sunLight.visible = true;
                 spotLight.visible = true;
                 warmLight.visible = true;
             }

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);

            if (!interactables[0].mesh) {
                scene.children.forEach(child => child.traverse(c => {
                    if (c.isMesh) {
                        const n = c.name.toLowerCase();
                        if (n === 'jzzwgjgqqvfdjsg' || n.includes('iphone') || n.includes('phone')) interactables[0].mesh = c;
                        if (n === 'object_24_custom_0' || ((n.includes('monitor')) && !n.includes('stand'))) interactables[1].mesh = c;
                        if (n.includes('lamp') || n.includes('bulb')) interactables[2].mesh = c;
                    }
                }));
                
                interactables.forEach(item => {
                    if (item.mesh && !item.label) item.label = createLabel(item.name, item);
                });
            }

            interactables.forEach(item => {
                if (item.mesh && item.label && deskState.model.visible) {
                    const pos = item.mesh.getWorldPosition(new THREE.Vector3());
                    pos.y += 0.2; 
                    pos.project(camera);

                    const baseX = (pos.x * .5 + .5) * window.innerWidth;
                    const baseY = (-(pos.y * .5) + .5) * window.innerHeight;
                    
                    const anchorX = baseX + item.anchorAdj.x;
                    const anchorY = baseY + item.anchorAdj.y;

                    item.label.element.style.transform = `translate(${anchorX}px, ${anchorY}px)`;
                    item.label.box.style.transform = `translate(${item.labelOffset.x}px, ${item.labelOffset.y}px)`;

                    const dist = Math.sqrt(item.labelOffset.x**2 + item.labelOffset.y**2);
                    const angle = Math.atan2(item.labelOffset.y, item.labelOffset.x) * (180 / Math.PI);
                    item.label.line.style.width = `${dist}px`;
                    item.label.line.style.transform = `rotate(${angle}deg)`;
                    
                    item.label.element.style.opacity = (progress > 0.1 && progress < 0.9) ? '1' : '0';
                }
            });

            if (intersects.length > 0) {
                const hit = intersects.find(i => {
                    const n = i.object.name.toLowerCase();
                    return (n === 'jzzwgjgqqvfdjsg' || n.includes('iphone') || n.includes('phone')) ||
                           ((n === 'object_24_custom_0' || n.includes('monitor')) && !n.includes('ipad')) ||
                           (n.includes('lamp') || n.includes('bulb'));
                });

                if (hit) {
                    hoveredObject = hit.object;
                    document.body.style.cursor = 'pointer'; 
                    if(spotLight.visible && (hit.object.name.toLowerCase().includes('lamp') || hit.object.name.toLowerCase().includes('bulb'))) {
                        targetIntensity = 50;
                    }
                } else {
                    hoveredObject = null;
                    document.body.style.cursor = 'none'; 
                    targetIntensity = 0;
                }
            } else {
                hoveredObject = null;
                document.body.style.cursor = 'none';
                targetIntensity = 0; 
            }
        } else {
             deskState.model.visible = false;
             sunLight.visible = false;
             spotLight.visible = false;
             warmLight.visible = false;
        }

        camera.position.lerpVectors(deskStartPos, deskEndPos, progress);
        currentLookAt.lerpVectors(deskLookAt, deskEndLookAt, progress);
        camera.lookAt(currentLookAt);
        
        if (spotLight.visible) {
            spotLight.intensity += (targetIntensity - spotLight.intensity) * 0.1;
            if (deskState.bulbMesh) {
                const glowStrength = spotLight.intensity / 50; 
                deskState.bulbMesh.material.emissiveIntensity = glowStrength * 4; 
            }
        }

    } else {
        camera.position.copy(deskStartPos);
        camera.lookAt(deskLookAt);
    }

    renderer.render(scene, camera);
}

animate(0);