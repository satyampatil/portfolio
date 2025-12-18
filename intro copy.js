import * as THREE from 'three';

// --- CONFIGURATION ---
const config = {
    gridSize: 100,      // Grid Depth
    barSpacing: 2.0,    // Spacing
    speed: 0.5,         // Data Rate
    heightScale: 18.0,  // Amplitude
    colorLow: '#1342cd',
    colorHigh: '#ffffff'
};

// --- SCENE SETUP ---
const canvas = document.querySelector('#intro-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.005); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 60); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas, 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(20, 50, 50);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x4444ff, 0.5);
fillLight.position.set(-20, 10, -20);
scene.add(fillLight);

// --- DATA TERRAIN MESH ---
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhongMaterial({ 
    shininess: 50,
    flatShading: false
});

const maxCount = 200 * 200; 
const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
scene.add(mesh);

// Helpers
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const colorLow = new THREE.Color(config.colorLow);
const colorHigh = new THREE.Color(config.colorHigh);
const currentHeights = new Float32Array(maxCount); // Store heights for tooltip lookup

// --- INTERACTION & TOOLTIP ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(); // For Rotation (Pixels)
const rayMouse = new THREE.Vector2(); // For Raycasting (Normalized -1 to 1)
const rawMouse = new THREE.Vector2(); // For Tooltip Positioning (Screen Pixels)
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

// Create Tooltip DOM Element
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.padding = '8px 12px';
tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
tooltip.style.border = '1px solid #00ff88';
tooltip.style.color = '#00ff88';
tooltip.style.fontFamily = 'monospace';
tooltip.style.fontSize = '12px';
tooltip.style.borderRadius = '4px';
tooltip.style.pointerEvents = 'none'; 
tooltip.style.display = 'none';
tooltip.style.zIndex = '20000'; // High Z-Index to show over hero card
document.body.appendChild(tooltip);

// Mouse Listener
document.addEventListener('mousemove', (event) => {
    // 1. For Rotation logic
    mouse.x = (event.clientX - windowHalfX) / 2;
    mouse.y = (event.clientY - windowHalfY) / 2;

    // 2. For Raycasting
    rayMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    rayMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 3. For Tooltip CSS
    rawMouse.x = event.clientX;
    rawMouse.y = event.clientY;
});

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();
let isRunning = true; 

function animate() {
    if (!isRunning) return;

    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    let i = 0;
    const sizeZ = Math.min(config.gridSize, 100); 
    const sizeX = Math.min(Math.floor(config.gridSize * 2.5), 180); 
    
    // 1. UPDATE POSITIONS & BASE COLORS
    for (let x = 0; x < sizeX; x++) {
        for (let z = 0; z < sizeZ; z++) {
            const xPos = (x - sizeX / 2) * config.barSpacing;
            const zPos = (z - sizeZ / 2) * config.barSpacing;

            const noise = Math.sin(x * 0.1 + time * config.speed) 
                        + Math.cos(z * 0.1 + time * config.speed * 0.8)
                        + Math.sin((x + z) * 0.2 + time * config.speed * 0.5);
            
            const rawHeight = (noise + 2); 
            const height = Math.max(0.1, rawHeight * (config.heightScale / 3));
            
            // Store for tooltip
            currentHeights[i] = height;

            dummy.position.set(xPos, height / 2 - 10, zPos);
            dummy.scale.set(1, height, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);

            const alpha = Math.min(1, Math.max(0, (height / config.heightScale)));
            color.lerpColors(colorLow, colorHigh, alpha);
            mesh.setColorAt(i, color);

            i++;
        }
    }
    
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    
    // 2. INTERACTIVE ROTATION
    mesh.rotation.y = Math.sin(time * 0.05) * 0.1 + (mouse.x * 0.0005);
    mesh.rotation.x = (mouse.y * 0.0005);
    
    // 3. RAYCASTING (HOVER EFFECT)
    raycaster.setFromCamera(rayMouse, camera);
    const intersects = raycaster.intersectObject(mesh);

    if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        const value = currentHeights[instanceId];

        // Show Tooltip
        tooltip.style.display = 'block';
        tooltip.style.left = (rawMouse.x + 15) + 'px';
        tooltip.style.top = (rawMouse.y - 15) + 'px';
        tooltip.innerHTML = `Value: <span style="color:white">${(value * 10).toFixed(2)}</span><br>ID: #${instanceId}`;

        // Highlight the hovered bar (White)
        mesh.setColorAt(instanceId, new THREE.Color(0xffffff));
    } else {
        tooltip.style.display = 'none';
    }

    // 4. APPLY COLORS
    mesh.instanceColor.needsUpdate = true;

    renderer.render(scene, camera);
}

// --- SCROLL LISTENER FOR TOGGLING ---
window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY;
    if (scrollPos > 10) {
        if (isRunning) {
            isRunning = false;
            canvas.style.opacity = '0';
            tooltip.style.opacity = '0'; // Hide tooltip too
            document.body.classList.add('hide-noise'); 
        }
    } else {
        if (!isRunning) {
            isRunning = true;
            canvas.style.opacity = '1';
            tooltip.style.opacity = '1';
            document.body.classList.remove('hide-noise');
            animate(); 
        }
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();