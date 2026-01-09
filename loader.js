import gsap from 'gsap';
import * as THREE from 'three';

export const loaderState = {
    progress: 0,
    isComplete: false
};

export function initLoader() {
    // --- UI ELEMENTS ---
    const percentEl = document.querySelector('.loader-percent');
    const fillEl = document.querySelector('.loader-bar-fill');
    const preloader = document.getElementById('preloader');
    const canvas = document.querySelector('#loader-canvas');
    
    let renderer, scene, camera, cloudGroup, clouds = [];
    let isRunning = true;
    let phase = 'loading'; 
    let loadingProgress = 0;
    let transitionTimer = 0;
    const clock = new THREE.Clock();

    const config = {
        cloudCount: 60,
        cloudColor: '#8899aa',
    };

    if (canvas) {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.005); 

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 100); 
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true, 
            alpha: false // Canvas is opaque black
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 1);

        // Cloud Texture
        function createCloudTexture() {
            const c = document.createElement('canvas');
            c.width = 128;
            c.height = 128;
            const ctx = c.getContext('2d');
            const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.4, 'rgba(240, 240, 255, 0.5)');
            grad.addColorStop(0.8, 'rgba(220, 220, 240, 0.1)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 128, 128);
            return new THREE.CanvasTexture(c);
        }

        const cloudTex = createCloudTexture();
        const cloudMat = new THREE.SpriteMaterial({ 
            map: cloudTex, 
            color: config.cloudColor,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.NormalBlending 
        });

        cloudGroup = new THREE.Group();
        scene.add(cloudGroup);

        for(let i=0; i<config.cloudCount; i++) {
            const sprite = new THREE.Sprite(cloudMat.clone());
            const spread = 120;
            const x = (Math.random() - 0.5) * spread * 3;
            const y = (Math.random() - 0.5) * spread * 0.5;
            const z = (Math.random() - 0.5) * spread * 2;
            sprite.position.set(x, y, z);
            sprite.scale.set(20, 20, 1);
            
            sprite.userData = {
                originalX: x, originalY: y, originalZ: z,
                targetX: (Math.random() - 0.5) * 10,
                targetY: (Math.random() - 0.5) * 5,
                targetZ: (Math.random() - 0.5) * 10
            };
            cloudGroup.add(sprite);
            clouds.push(sprite);
        }

        window.addEventListener('resize', () => {
            if (!camera || !renderer) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // --- ANIMATION LOOP (UI + 3D) ---
    let visualProgress = 0;

    const animate = () => {
        if (!isRunning) return;

        // 1. Update Percentage UI
        if(loaderState.isComplete && visualProgress > 99) {
            if (phase === 'loading') phase = 'transition'; // Trigger cloud transition
        }

        visualProgress += (loaderState.progress - visualProgress) * 0.1;
        if(percentEl) percentEl.innerText = `${Math.round(visualProgress)}%`;
        if(fillEl) fillEl.style.width = `${visualProgress}%`;

        // 2. Update Clouds
        if (renderer && scene && camera) {
            const time = clock.getElapsedTime();

            if (phase === 'loading') {
                loadingProgress = visualProgress / 100; // Sync cloud move with real progress
                const p = Math.min(loadingProgress, 0.95); 
                
                clouds.forEach(cloud => {
                    const ud = cloud.userData;
                    const ease = 1 - Math.pow(1 - p, 4);
                    cloud.position.x = ud.originalX + (ud.targetX - ud.originalX) * ease;
                    cloud.position.y = ud.originalY + (ud.targetY - ud.originalY) * ease;
                    cloud.position.z = ud.originalZ + (ud.targetZ - ud.originalZ) * ease;
                    cloud.position.x += Math.sin(time + ud.originalY) * 0.05;
                });
            }
            else if (phase === 'transition') {
                transitionTimer += 0.02; 
                const T = Math.min(transitionTimer, 1.0);
                
                // Fade out clouds
                clouds.forEach(cloud => {
                    cloud.material.opacity = 0.6 * (1 - T);
                    cloud.scale.multiplyScalar(0.99);
                });

                // Fade out both canvas and UI container
                if (canvas) canvas.style.opacity = 1 - T;
                if (preloader) preloader.style.opacity = 1 - T; 

                if (T >= 1.0) {
                    phase = 'done';
                    if(canvas) canvas.style.display = 'none';
                    if(preloader) preloader.style.display = 'none';
                    isRunning = false;
                    try {
                        renderer.dispose();
                    } catch(e) {}
                }
            }
            renderer.render(scene, camera);
        }

        requestAnimationFrame(animate);
    };

    animate();
}

export function updateLoadProgress(ratio) {
    loaderState.progress = Math.min(ratio * 100, 100);
    
    if(loaderState.progress >= 100) {
        loaderState.isComplete = true;
    }
}