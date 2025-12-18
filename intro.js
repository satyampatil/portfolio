import * as THREE from 'three';

// --- CONFIGURATION ---
const config = {
    lines: 50,          // Number of rings
    speed: 0.3,         // Animation speed
    amplitude: 6,       // Height of the wave
    frequency: 3,       // Frequency of the wave
    color: 0x7c59f0,    // Ring Color
    baseRadius: 5,      // Starting radius
    spacing: 1.2        // Space between rings
};

// --- SCENE SETUP ---
const canvas = document.querySelector('#intro-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.002);

// Camera Setup for a "2D" look (Orthographic or Perspective from top/front)
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 40, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas, 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- RINGS GEOMETRY ---
const rings = [];
const material = new THREE.LineBasicMaterial({ 
    color: config.color,
    transparent: true,
    opacity: 0.8,
    linewidth: 1 
});

const pointsPerRing = 128; // Resolution of each ring

for (let i = 0; i < config.lines; i++) {
    const radius = config.baseRadius + (i * config.spacing);
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    // Create a circle on the XZ plane
    for (let j = 0; j <= pointsPerRing; j++) {
        const theta = (j / pointsPerRing) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        const y = 0; // Flat initially
        positions.push(x, y, z);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    // Store original positions for animation reference
    geometry.userData = {
        originalPositions: [...positions],
        radius: radius,
        index: i
    };

    const line = new THREE.Line(geometry, material);
    rings.push(line);
    scene.add(line);
}

// --- MOUSE INTERACTION (Subtle Tilt) ---
const mouse = new THREE.Vector2();
const targetRotation = new THREE.Vector2();
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX - windowHalfX) * 0.0005;
    mouse.y = (event.clientY - windowHalfY) * 0.0005;
});

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();
let isRunning = true; 

function animate() {
    if (!isRunning) return;

    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Animate Rings
    rings.forEach((ring, i) => {
        const positions = ring.geometry.attributes.position.array;
        const original = ring.geometry.userData.originalPositions;
        const radius = ring.geometry.userData.radius;
        const index = ring.geometry.userData.index;

        // Wave Logic:
        // Calculate a wave offset based on the ring's index (radius) and time
        // We modulate the Y axis (height) to create ripples
        
        for (let j = 0; j < positions.length; j += 3) {
            // x and z remain relatively constant (circular)
            // y is modified by the wave
            
            const x = original[j];
            const z = original[j+2];
            
            // Calculate distance from center (approximate using ring index for performance)
            // or use simple sine wave based on ring index
            
            // Formula: Y = sin(Distance * Frequency - Time * Speed) * Amplitude
            // Here 'index' acts as distance steps
            const wave = Math.sin((index * 0.2 * config.frequency) - (time * config.speed * 5)) * config.amplitude;
            
            // Add a secondary wave based on angle for more "organic" feel
            const angle = Math.atan2(z, x);
            const secondary = Math.sin(angle * 3 + time) * (config.amplitude * 0.2);

            positions[j+1] = wave + secondary;
        }

        ring.geometry.attributes.position.needsUpdate = true;
    });

    // Smooth Interaction
    targetRotation.x += (mouse.y - targetRotation.x) * 0.05;
    targetRotation.y += (mouse.x - targetRotation.y) * 0.05;

    // Apply rotation to the whole scene group or camera logic
    // Here we just rotate the scene slightly
    scene.rotation.x = targetRotation.x + 0.5; // +0.5 to tilt it slightly towards camera
    scene.rotation.y = targetRotation.y;

    renderer.render(scene, camera);
}

// --- SCROLL LISTENER FOR TOGGLING ---
window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY;
    if (scrollPos > 10) {
        if (isRunning) {
            isRunning = false;
            canvas.style.opacity = '0';
            document.body.classList.add('hide-noise'); 
        }
    } else {
        if (!isRunning) {
            isRunning = true;
            canvas.style.opacity = '1';
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