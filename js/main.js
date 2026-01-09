import * as THREE from 'three';
import gsap from 'gsap';
// Use the same CDN provider as the importmap to avoid version conflicts/duplication
import ScrollTrigger from 'gsap/ScrollTrigger'; 

// --- CRITICAL FIX: REGISTER PLUGIN IMMEDIATELY ---
gsap.registerPlugin(ScrollTrigger);

// --- MODULE IMPORTS ---
import { lenis, initScrollAnimations } from './utils/scroll.js';
import { initUI } from './utils/ui.js';
import { initTracker } from './utils/tracker.js'; 
import { initLoader } from './utils/loader.js';
import { scene, camera, renderer, sunLight, spotLight, warmLight } from './scene/setup.js';
import { loadDeskModel, deskState } from './scene/desk.js';

// --- CONFIG ---
const DEBUG_MODE = false; // Turned off debug mode

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initLoader(); 
    initUI();
    initScrollAnimations();
    initTracker();
    
    // FIX 1: Force unlock scroll immediately to fix the bug where you have to click to scroll
    document.body.classList.remove('no-scroll');

    // FIX 2: Bring renderer forward (from -1 to 0)
    if(renderer.domElement) {
        renderer.domElement.style.zIndex = '0'; 
    }

    // Initial Load
    loadDeskModel('my_desk.glb', false); 
});

// Render Toggle Logic
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

// Scene Progress State (Updated by ScrollTrigger)
const sceneState = { deskProgress: 0, heroOpacity: 1 };

// --- SCENE SCROLL TRIGGERS ---
// 1. Update Desk Progress
ScrollTrigger.create({
    trigger: ".desk-animation-spacer",
    start: "top bottom", 
    end: "bottom bottom", 
    scrub: 1, 
    onUpdate: (self) => {
        sceneState.deskProgress = self.progress;
    }
});

// 2. Fade Out Hero Text
ScrollTrigger.create({
    trigger: ".desk-animation-spacer",
    start: "top bottom",
    end: "20% top",
    scrub: true,
    onUpdate: (self) => {
        sceneState.heroOpacity = 1 - self.progress;
    }
});

// 3. Fade Out Hero Face
gsap.to("#hero-face", {
    opacity: 0,
    ease: "power1.inOut",
    scrollTrigger: {
        trigger: ".desk-animation-spacer",
        start: "top bottom",
        end: "top 80%", // Ends faster (at 20% scroll) so face disappears quickly
        scrub: true
    }
});

// --- 3D INTERACTIVE LABELS (GAMIFIED UI) ---
const labels = [];
const labelContainer = document.createElement('div');
labelContainer.style.position = 'fixed';
labelContainer.style.top = '0';
labelContainer.style.left = '0';
labelContainer.style.width = '100%';
labelContainer.style.height = '100%';
labelContainer.style.pointerEvents = 'none';
labelContainer.style.zIndex = '500'; // Above 3D canvas, below some UI
document.body.appendChild(labelContainer);

// Debug markers container (Only created if DEBUG_MODE is true)
let debugContainer = null;
if(DEBUG_MODE) {
    debugContainer = document.createElement('div');
    debugContainer.style.position = 'fixed';
    debugContainer.style.top = '0';
    debugContainer.style.left = '0';
    debugContainer.style.width = '100%';
    debugContainer.style.height = '100%';
    debugContainer.style.pointerEvents = 'none'; // Only dots are interactive
    debugContainer.style.zIndex = '501'; 
    document.body.appendChild(debugContainer);
}

// DRAG STATE for Debugging
let isDragging = false;
let draggedItem = null;

function createLabel(text, interactableItem) {
    const el = document.createElement('div');
    el.className = 'interactive-label';
    el.innerHTML = `
        <div class="label-line"></div>
        <div class="label-box">
            <span class="label-text">${text}</span>
        </div>
    `;
    el.style.position = 'absolute';
    el.style.opacity = '0'; 
    el.style.transition = 'opacity 0.3s'; 
    el.style.pointerEvents = 'auto'; 
    el.style.cursor = 'pointer';
    
    const box = el.querySelector('.label-box');
    box.style.background = 'rgba(0, 0, 0, 0.7)';
    box.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    box.style.padding = '8px 16px';
    box.style.borderRadius = '4px';
    box.style.backdropFilter = 'blur(4px)';
    
    const line = el.querySelector('.label-line');
    line.style.position = 'absolute';
    line.style.height = '1px';
    line.style.background = '#fff';
    line.style.top = '0';
    line.style.left = '0';
    line.style.transformOrigin = '0 0';
    
    labelContainer.appendChild(el);
    
    // Create debug marker (Draggable Anchor)
    let debugDot = null;
    if (DEBUG_MODE && debugContainer) {
        debugDot = document.createElement('div');
        debugDot.style.width = '12px';
        debugDot.style.height = '12px';
        debugDot.style.background = 'red';
        debugDot.style.border = '2px solid white';
        debugDot.style.borderRadius = '50%';
        debugDot.style.position = 'absolute';
        debugDot.style.transform = 'translate(-50%, -50%)';
        debugDot.style.cursor = 'grab';
        debugDot.style.pointerEvents = 'auto'; // FIX: Explicitly enable events on dot
        debugContainer.appendChild(debugDot);

        // DRAG LOGIC (Debug) - Updates Anchor Adjustment
        debugDot.addEventListener('mousedown', (e) => {
            isDragging = true;
            draggedItem = interactableItem; 
            debugDot.style.cursor = 'grabbing';
            e.preventDefault(); 
            e.stopPropagation(); 
        });
    }
    
    // Add click handler to label itself to trigger action
    el.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent scene click
        triggerAction(interactableItem.id);
    });
    
    return {
        element: el,
        box: box,
        line: line,
        debugDot: debugDot,
        visible: false
    };
}

// Global Drag Listeners
if (DEBUG_MODE) {
    window.addEventListener('mousemove', (e) => {
        if (isDragging && draggedItem && draggedItem.label && draggedItem.baseScreenPos) {
            // Calculate new anchor adjustment: Mouse - Projected 3D Pos
            const newAdjX = e.clientX - draggedItem.baseScreenPos.x;
            const newAdjY = e.clientY - draggedItem.baseScreenPos.y;
            
            draggedItem.anchorAdj.x = newAdjX;
            draggedItem.anchorAdj.y = newAdjY;
            
            // Visual update handled in animate loop for consistency
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragging && draggedItem) {
            console.log(`Updated Anchor for [${draggedItem.id}]: { x: ${Math.round(draggedItem.anchorAdj.x)}, y: ${Math.round(draggedItem.anchorAdj.y)} }`);
            if (draggedItem.label.debugDot) draggedItem.label.debugDot.style.cursor = 'grab';
            isDragging = false;
            draggedItem = null;
        }
    });
}

// Helper function to trigger actions based on ID
function triggerAction(id) {
    if (id === 'phone') {
        window.open('https://www.linkedin.com/in/satyampatil/', '_blank');
    } else if (id === 'monitor') {
        window.open('https://github.com/satyampatil', '_blank');
    } else if (id === 'lamp') {
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

// Define Interactive Points 
// UPDATED COORDINATES from user request
const interactables = [
    { 
        id: 'phone', 
        name: 'LinkedIn Profile', 
        pos: new THREE.Vector3(0, 0, 0), 
        label: null, 
        anchorAdj: { x: -9, y: 45 },      // Red Dot Adjustment
        labelOffset: { x: -128, y: 80 }   // Label Box relative to Red Dot
    },  
    { 
        id: 'monitor', 
        name: 'GitHub Profile', 
        pos: new THREE.Vector3(0, 0, 0), 
        label: null, 
        anchorAdj: { x: -314, y: -104 }, 
        labelOffset: { x: 1, y: -170 } 
    },   
    { 
        id: 'lamp', 
        name: 'Toggle Lights', 
        pos: new THREE.Vector3(0, 0, 0), 
        label: null, 
        anchorAdj: { x: -8, y: -6 }, 
        labelOffset: { x: 1, y: -170 } 
    }         
];

// --- INTERACTIVE RAYCASTER LOGIC ---
let hoveredObject = null;

// Track Mouse
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Handle Clicks
window.addEventListener('click', () => {
    if (hoveredObject) {
        const name = hoveredObject.name.toLowerCase();
        
        // --- INTERACTION MAPPING ---
        if (name === 'jzzwgjgqqvfdjsg' || name.includes('iphone') || name.includes('phone') || name.includes('mobile')) {
            triggerAction('phone');
        } 
        else if (name === 'object_24_custom_0' || (name.includes('monitor') && !name.includes('ipad') && !name.includes('tablet'))) {
            triggerAction('monitor');
        } 
        else if (name.includes('lamp') || name.includes('bulb') || name.includes('light')) {
            triggerAction('lamp');
        }
    }
});

// --- MAIN ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate(time) {
    lenis.raf(time);
    requestAnimationFrame(animate);

    const heroTextElements = document.querySelectorAll('.hero-pos-top, .hero-pos-left, .hero-pos-right');
    if(heroTextElements.length > 0) {
        heroTextElements.forEach(el => {
            el.style.opacity = sceneState.heroOpacity;
            el.style.pointerEvents = sceneState.heroOpacity < 0.1 ? 'none' : 'auto';
        });
    }

    if (deskState.mixer) {
        deskState.mixer.update(clock.getDelta());
    }

    const progress = sceneState.deskProgress;

    if (deskState.model) {
        // VISIBILITY LOGIC
        if (progress > 0.02) {
             deskState.model.visible = true; 
             if (!spotLight.visible && !hoveredObject && sunLight.intensity > 0.5) { 
                 sunLight.visible = true;
                 spotLight.visible = true;
                 warmLight.visible = true;
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

        // --- UPDATE LABELS & RAYCASTER ---
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        // Find meshes if not cached
        if (!interactables[0].mesh) {
            scene.children.forEach(child => child.traverse(c => {
                if (c.isMesh) {
                    const n = c.name.toLowerCase();
                    if (n === 'jzzwgjgqqvfdjsg' || n.includes('iphone') || n.includes('phone') || n.includes('mobile')) interactables[0].mesh = c;
                    if (n === 'object_24_custom_0' || ((n.includes('monitor') || n.includes('screen')) && !n.includes('stand'))) interactables[1].mesh = c;
                    if (n.includes('lamp') || n.includes('bulb')) interactables[2].mesh = c;
                }
            }));
            
            interactables.forEach(item => {
                if (item.mesh && !item.label) {
                    item.label = createLabel(item.name, item);
                }
            });
        }

        // Update Label Positions
        interactables.forEach(item => {
            if (item.mesh && item.label && deskState.model.visible) {
                const pos = item.mesh.getWorldPosition(new THREE.Vector3());
                pos.y += 0.2; 
                pos.project(camera);

                // Base projected position
                const baseX = (pos.x * .5 + .5) * window.innerWidth;
                const baseY = (-(pos.y * .5) + .5) * window.innerHeight;
                item.baseScreenPos = { x: baseX, y: baseY };

                // Apply Anchor Adjustment (Red Dot Position)
                const anchorX = baseX + item.anchorAdj.x;
                const anchorY = baseY + item.anchorAdj.y;

                // Apply Label Offset (Box Position relative to Red Dot)
                const labelX = item.labelOffset.x;
                const labelY = item.labelOffset.y;

                // Update element position (Anchor Point for CSS)
                item.label.element.style.transform = `translate(${anchorX}px, ${anchorY}px)`;
                
                // Update Label Box (Relative to Anchor)
                item.label.box.style.transform = `translate(${labelX}px, ${labelY}px)`;

                // Update Line Geometry (From 0,0 to Label Box)
                const dist = Math.sqrt(labelX*labelX + labelY*labelY);
                const angle = Math.atan2(labelY, labelX) * (180 / Math.PI);
                item.label.line.style.width = `${dist}px`;
                item.label.line.style.transform = `rotate(${angle}deg)`;

                // Update debug dot position
                if (item.label.debugDot) {
                    item.label.debugDot.style.left = `${anchorX}px`;
                    item.label.debugDot.style.top = `${anchorY}px`;
                }
                
                // Show label logic
                if (progress > 0.1 && progress < 0.9) {
                    item.label.element.style.opacity = '1';
                } else {
                    item.label.element.style.opacity = '0';
                }
            }
        });

        // Raycasting
        if (intersects.length > 0) {
            const hit = intersects.find(i => {
                const n = i.object.name.toLowerCase();
                const isPhone = n === 'jzzwgjgqqvfdjsg' || n.includes('iphone') || n.includes('phone');
                const isMonitor = (n === 'object_24_custom_0' || n.includes('monitor')) && !n.includes('ipad');
                const isLamp = n.includes('lamp') || n.includes('bulb');
                return isPhone || isMonitor || isLamp;
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
        interactables.forEach(i => { if(i.label) i.label.element.style.opacity = '0'; });
    }

    renderer.render(scene, camera);
}

animate(0);