import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';

// --- 1. SCENE SETUP ---
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

// --- GUI CONTROLS ---
const gui = new GUI();
gui.domElement.parentElement.style.zIndex = "10000";

const debugParams = {
    useManualScroll: false, 
    manualScroll: 0
};
const debugFolder = gui.addFolder('1. Debug / Manual Scroll');
debugFolder.add(debugParams, 'useManualScroll').name('Enable Manual Control');
debugFolder.add(debugParams, 'manualScroll', 0, 1).name('Scroll Position').listen();
debugFolder.close();

// --- 2. LIGHTING ---
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

// --- 3. LOAD DESK MODEL ---
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
        
        // --- TRIGGER LOADER EXIT SEQUENCE ---
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

// --- 4. START BUTTON LOGIC ---
const startScrollBtn = document.getElementById('start-scroll-btn');
if(startScrollBtn) {
    startScrollBtn.addEventListener('click', () => {
        document.body.classList.remove('no-scroll');
        window.scrollTo({
            top: window.innerHeight, 
            behavior: 'smooth'
        });
    });
}

// --- 5. SCROLL & INTERACTION LOGIC ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let targetIntensity = 0;
let scrollProgress = 0;
let targetScrollProgress = 0;

const cursorFollower = document.getElementById('cursor-follower');

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (cursorFollower) {
        cursorFollower.style.left = event.clientX + 'px';
        cursorFollower.style.top = event.clientY + 'px';
    }
});

// --- 6. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    if (debugParams.useManualScroll) {
        scrollProgress = debugParams.manualScroll;
    } else {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollTop = window.scrollY;
        
        if (maxScroll > 0) {
            targetScrollProgress = scrollTop / maxScroll;
        } else {
            targetScrollProgress = 0;
        }
        scrollProgress += (targetScrollProgress - scrollProgress) * 0.05;
        debugParams.manualScroll = scrollProgress;
    }

    const deskThreshold = 0.01; 
    
    // FADE HERO CARD
    const heroCard = document.querySelector('.hero-card');
    if(heroCard) {
        const opacity = Math.max(0, 1 - (scrollProgress * 20)); 
        heroCard.style.opacity = opacity;
        heroCard.style.transform = `translateY(${scrollProgress * 100}px)`;
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

animate();