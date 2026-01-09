import * as THREE from 'three';

// --- SCENE SETUP ---
export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02); 

export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// --- RENDERER ---
export const renderer = new THREE.WebGLRenderer({ 
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

// Append to DOM
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '-1'; 

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);

export const sunLight = new THREE.DirectionalLight(0xaaccff, 0.8); 
sunLight.position.set(5, 10, 7);
sunLight.castShadow = true;
scene.add(sunLight);
sunLight.visible = false; 

// Blue Spotlight
export const spotLight = new THREE.SpotLight(0x0088ff, 92); 
spotLight.position.set(0.9, 3.1, -1); 
spotLight.angle = 1.33;
spotLight.penumbra = 1;
spotLight.decay = 2;
spotLight.distance = 25;
spotLight.castShadow = true;
spotLight.shadow.bias = -0.0001;
spotLight.target.position.set(0, 1, -1);
scene.add(spotLight);
scene.add(spotLight.target);
spotLight.visible = false;

// Warm Spotlight
export const warmLight = new THREE.SpotLight(0xffaa33, 128); 
warmLight.position.set(0.1, 2.1, -2.6); 
warmLight.angle = 0.96;
warmLight.penumbra = 1;
warmLight.decay = 2;
warmLight.distance = 25;
warmLight.castShadow = true;
warmLight.shadow.bias = -0.0001;
warmLight.target.position.set(3, -4, 5); 
scene.add(warmLight);
scene.add(warmLight.target);
warmLight.visible = false;

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});