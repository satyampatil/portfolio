import * as THREE from 'three';

// --- CONFIGURATION ---
const config = {
    // Cloud Settings
    cloudCount: 60,
    cloudColor: '#8899aa',
    
    // Terrain Settings (Synced with intro.js)
    gridSize: 100,      
    barSpacing: 2.0,    
    speed: 0.5,         
    heightScale: 18.0,  
    colorLow: '#1342cd',
    colorHigh: '#ffffff'
};

// --- SCENE SETUP ---
const canvas = document.querySelector('#loader-canvas');
const scene = new THREE.Scene();
// Dark blue-ish fog to blend clouds/black
scene.fog = new THREE.FogExp2(0x000000, 0.005); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Start Camera looking at clouds
camera.position.set(0, 0, 100); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas, 
    antialias: true, 
    alpha: false // Opaque to hide intro.js initially
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1); // Force black background

// --- ASSETS: CLOUD TEXTURE ---
function createCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(240, 240, 255, 0.5)');
    grad.addColorStop(0.8, 'rgba(220, 220, 240, 0.1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

// --- OBJECTS SETUP ---

// 1. CLOUDS
const cloudTex = createCloudTexture();
const cloudMat = new THREE.SpriteMaterial({ 
    map: cloudTex, 
    color: config.cloudColor,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.NormalBlending 
});
const clouds = [];
const cloudGroup = new THREE.Group();
scene.add(cloudGroup);

for(let i=0; i<config.cloudCount; i++) {
    const sprite = new THREE.Sprite(cloudMat.clone());
    const spread = 120;
    const x = (Math.random() - 0.5) * spread * 3;
    const y = (Math.random() - 0.5) * spread * 0.5;
    const z = (Math.random() - 0.5) * spread * 2;
    sprite.position.set(x, y, z);
    sprite.scale.set(20, 20, 1);
    
    // Tighter targets for combining effect
    sprite.userData = {
        originalX: x, originalY: y, originalZ: z,
        targetX: (Math.random() - 0.5) * 5, // Very close to center
        targetY: (Math.random() - 0.5) * 2,
        targetZ: (Math.random() - 0.5) * 5
    };
    cloudGroup.add(sprite);
    clouds.push(sprite);
}

// 2. TERRAIN (Matching Intro.js)
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhongMaterial({ 
    shininess: 50,
    flatShading: false,
    transparent: true, 
    opacity: 0.0 
});
const maxCount = 200 * 200; 
const terrainMesh = new THREE.InstancedMesh(geometry, material, maxCount);
terrainMesh.visible = false; 
scene.add(terrainMesh);

const dummy = new THREE.Object3D();
const color = new THREE.Color();
const colorLow = new THREE.Color(config.colorLow);
const colorHigh = new THREE.Color(config.colorHigh);

// Terrain Lights
const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(20, 50, 50);
scene.add(light);
const fill = new THREE.DirectionalLight(0x4444ff, 0.5);
fill.position.set(-20, 10, -20);
scene.add(fill);


// --- ANIMATION STATE ---
const clock = new THREE.Clock();
let isRunning = true;
let phase = 'loading'; // loading -> transition -> done
let loadingProgress = 0;
let transitionTimer = 0;

// Listen for Desk Loaded Event to start transition
window.addEventListener('desk-loaded', () => {
    if (phase === 'loading') {
        phase = 'transition';
        
        // Prepare Terrain for rising animation
        terrainMesh.visible = true;
        terrainMesh.position.y = -50; 
    }
});


// --- MAIN LOOP ---
function animate() {
    if (!isRunning) return;
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();

    // --- PHASE 1: LOADING (Clouds Gather) ---
    if (phase === 'loading') {
        // Accelerate progress slightly
        loadingProgress += 0.008; 
        const p = Math.min(loadingProgress, 0.95); 
        
        clouds.forEach(cloud => {
            const ud = cloud.userData;
            // Stronger ease for tight clustering
            const ease = 1 - Math.pow(1 - p, 4);
            cloud.position.x = ud.originalX + (ud.targetX - ud.originalX) * ease;
            cloud.position.y = ud.originalY + (ud.targetY - ud.originalY) * ease;
            cloud.position.z = ud.originalZ + (ud.targetZ - ud.originalZ) * ease;
            
            // Reduced turbulence as they tighten
            const shake = (1 - p) * 0.05;
            cloud.position.x += Math.sin(time + ud.originalY) * shake;
        });
    }

    // --- PHASE 2: TRANSITION (Clouds Up, Flat Terrain Up) ---
    else if (phase === 'transition') {
        transitionTimer += 0.02; // Speed of transition
        const T = Math.min(transitionTimer, 1.0);
        const easeT = 1 - Math.pow(1 - T, 3); // Cubic ease out

        // Clouds Fly Up & Fade Out
        clouds.forEach(cloud => {
            cloud.material.opacity = 0.6 * (1 - T);
            cloud.position.y += 1.0; 
            cloud.scale.multiplyScalar(0.98);
        });

        // Terrain Rises & Fades In
        material.opacity = T;
        // Move from -50 to 0
        terrainMesh.position.y = -50 * (1 - easeT); 

        // Camera moves to Intro Position (0, 30, 60) matching intro.js
        camera.position.lerpVectors(new THREE.Vector3(0,0,100), new THREE.Vector3(0, 30, 60), 0.05);
        camera.lookAt(0, 0, 0);

        // Render Flat Base
        updateTerrain(time, true);

        if (T >= 1.0) {
            // Handover to intro.js
            phase = 'done';
            // Fade out this canvas to reveal the identical intro.js canvas behind it
            canvas.style.opacity = '0';
            setTimeout(() => {
                isRunning = false;
                canvas.style.display = 'none';
            }, 1000);
        }
    }

    // Always animate terrain if visible (during transition)
    if (terrainMesh.visible) {
        // If simply loading, keep hidden or flat? (Handled by phase check above)
    }

    renderer.render(scene, camera);
}

// Shared Terrain Animation Logic
// Added 'flatten' parameter to force zero height
function updateTerrain(time, flatten = false) {
    let i = 0;
    const sizeZ = Math.min(config.gridSize, 100); 
    const sizeX = Math.min(Math.floor(config.gridSize * 2.5), 180); 
    
    for (let x = 0; x < sizeX; x++) {
        for (let z = 0; z < sizeZ; z++) {
            const xPos = (x - sizeX / 2) * config.barSpacing;
            const zPos = (z - sizeZ / 2) * config.barSpacing;

            let height = 0.1; // Default flat height
            
            if (!flatten) {
                const noise = Math.sin(x * 0.1 + time * config.speed) 
                            + Math.cos(z * 0.1 + time * config.speed * 0.8)
                            + Math.sin((x + z) * 0.2 + time * config.speed * 0.5);
                
                const rawHeight = (noise + 2); 
                height = Math.max(0.1, rawHeight * (config.heightScale / 3));
            }

            dummy.position.set(xPos, height / 2 - 10, zPos);
            dummy.scale.set(1, height, 1);
            dummy.updateMatrix();
            terrainMesh.setMatrixAt(i, dummy.matrix);

            // If flat, use base low color, otherwise gradient
            if (flatten) {
                terrainMesh.setColorAt(i, new THREE.Color(config.colorLow));
            } else {
                const alpha = Math.min(1, Math.max(0, (height / config.heightScale)));
                color.lerpColors(colorLow, colorHigh, alpha);
                terrainMesh.setColorAt(i, color);
            }

            i++;
        }
    }
    terrainMesh.count = i;
    terrainMesh.instanceMatrix.needsUpdate = true;
    terrainMesh.instanceColor.needsUpdate = true;
}

// --- RESIZE ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();