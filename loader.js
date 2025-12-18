import * as THREE from 'three';

// --- CONFIGURATION ---
const config = {
    // Cloud Settings
    cloudCount: 60,
    cloudColor: '#8899aa',
};

// --- SCENE SETUP ---
const canvas = document.querySelector('#loader-canvas');

if (canvas) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.005); 

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 100); 
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: true, 
        alpha: false 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

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

    // --- CLOUDS ---
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
        
        sprite.userData = {
            originalX: x, originalY: y, originalZ: z,
            targetX: (Math.random() - 0.5) * 10,
            targetY: (Math.random() - 0.5) * 5,
            targetZ: (Math.random() - 0.5) * 10
        };
        cloudGroup.add(sprite);
        clouds.push(sprite);
    }

    // --- ANIMATION ---
    const clock = new THREE.Clock();
    let isRunning = true;
    let phase = 'loading'; 
    let loadingProgress = 0;
    let transitionTimer = 0;

    const onDeskLoaded = () => {
        if (phase === 'loading') {
            phase = 'transition';
        }
    };
    window.addEventListener('desk-loaded', onDeskLoaded);

    function animate() {
        if (!isRunning) return;
        if (!renderer.domElement) return;

        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();

        if (phase === 'loading') {
            loadingProgress += 0.008; 
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

            // Fade out scene/canvas
            canvas.style.opacity = 1 - T;

            if (T >= 1.0) {
                phase = 'done';
                canvas.style.display = 'none';
                isRunning = false;
                try {
                    renderer.dispose();
                    window.removeEventListener('desk-loaded', onDeskLoaded);
                } catch(e) {}
            }
        }

        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}