import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import ScrollTrigger from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm';
import Lenis from 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/+esm';
import { createRoot } from 'react-dom/client';

// Register Plugins
gsap.registerPlugin(ScrollTrigger);

// --- ASSETS & CONFIG ---
const ASSETS = {
    desk: 'my_desk.glb',
    deskHighPoly: 'my_desk_colour.glb',
    abookiImages: [
        'abooki1.png', 'abooki2.png', 'abooki3.png', 'abooki4.png'
    ]
};

// --- COMPONENTS ---

// 1. LOADER COMPONENT (Clouds)
const LoaderCanvas = ({ onLoaded }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const config = { cloudCount: 60, cloudColor: '#8899aa' };
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.005);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 100);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true,
            alpha: false
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 1);

        // Texture Gen
        const createCloudTexture = () => {
            const c = document.createElement('canvas');
            c.width = 128; c.height = 128;
            const ctx = c.getContext('2d');
            const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.4, 'rgba(240, 240, 255, 0.5)');
            grad.addColorStop(0.8, 'rgba(220, 220, 240, 0.1)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 128, 128);
            return new THREE.CanvasTexture(c);
        };

        const cloudTex = createCloudTexture();
        const cloudMat = new THREE.SpriteMaterial({
            map: cloudTex, color: config.cloudColor,
            transparent: true, opacity: 0.6,
            depthWrite: false, blending: THREE.NormalBlending
        });

        const clouds = [];
        const cloudGroup = new THREE.Group();
        scene.add(cloudGroup);

        for (let i = 0; i < config.cloudCount; i++) {
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

        const clock = new THREE.Clock();
        let frameId;
        let isRunning = true;
        let phase = 'loading';
        let loadingProgress = 0;
        let transitionTimer = 0;

        // Listener for desk loaded event from parent
        const handleDeskLoaded = () => { if (phase === 'loading') phase = 'transition'; };
        window.addEventListener('desk-loaded', handleDeskLoaded);

        const animate = () => {
            if (!isRunning) return;
            frameId = requestAnimationFrame(animate);
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
            } else if (phase === 'transition') {
                transitionTimer += 0.02;
                const T = Math.min(transitionTimer, 1.0);
                clouds.forEach(cloud => {
                    cloud.material.opacity = 0.6 * (1 - T);
                    cloud.scale.multiplyScalar(0.99);
                });
                if (canvasRef.current) canvasRef.current.style.opacity = 1 - T;

                if (T >= 1.0) {
                    phase = 'done';
                    isRunning = false;
                    onLoaded(); // Tell parent we are done
                }
            }
            renderer.render(scene, camera);
        };

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        animate();

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('desk-loaded', handleDeskLoaded);
            renderer.dispose();
            // clean up THREE objects
        };
    }, [onLoaded]);

    return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-[30000] pointer-events-none bg-black transition-opacity duration-1000" />;
};

// 2. INTRO BACKGROUND (Rings)
const IntroCanvas = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const config = {
            lines: 50, speed: 0.3, amplitude: 6, frequency: 3,
            color: 0x7c59f0, baseRadius: 5, spacing: 1.2
        };

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.002);
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 40, 80);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current, antialias: true, alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const rings = [];
        const material = new THREE.LineBasicMaterial({
            color: config.color, transparent: true, opacity: 0.8, linewidth: 1
        });
        const pointsPerRing = 128;

        for (let i = 0; i < config.lines; i++) {
            const radius = config.baseRadius + (i * config.spacing);
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            for (let j = 0; j <= pointsPerRing; j++) {
                const theta = (j / pointsPerRing) * Math.PI * 2;
                positions.push(Math.cos(theta) * radius, 0, Math.sin(theta) * radius);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.userData = { originalPositions: [...positions], radius, index: i };
            const line = new THREE.Line(geometry, material);
            rings.push(line);
            scene.add(line);
        }

        const clock = new THREE.Clock();
        let frameId;

        const animate = () => {
            frameId = requestAnimationFrame(animate);
            const time = clock.getElapsedTime();

            rings.forEach((ring) => {
                const positions = ring.geometry.attributes.position.array;
                const original = ring.geometry.userData.originalPositions;
                const index = ring.geometry.userData.index;

                for (let j = 0; j < positions.length; j += 3) {
                    const wave = Math.sin((index * 0.2 * config.frequency) - (time * config.speed * 5)) * config.amplitude;
                    const x = original[j];
                    const z = original[j + 2];
                    const angle = Math.atan2(z, x);
                    const secondary = Math.sin(angle * 3 + time) * (config.amplitude * 0.2);
                    positions[j + 1] = wave + secondary;
                }
                ring.geometry.attributes.position.needsUpdate = true;
            });

            // Gentle rotation
            scene.rotation.y = time * 0.05;
            renderer.render(scene, camera);
        };

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none transition-opacity duration-1000" />;
};

// 3. MAIN DESK SCENE (The 3D Scroll Interaction)
const DeskScene = ({ setLoaded }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.02);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const deskStartPos = new THREE.Vector3(0, 2.3, -1);
        const deskLookAt = new THREE.Vector3(10, 3.5, -3.5);
        const deskEndPos = new THREE.Vector3(2, 2.5, 4);
        const deskEndLookAt = new THREE.Vector3(-6, 1, -2);
        const currentLookAt = new THREE.Vector3().copy(deskLookAt);

        camera.position.copy(deskStartPos);
        camera.lookAt(deskLookAt);

        const renderer = new THREE.WebGLRenderer({
            antialias: true, alpha: true,
            powerPreference: "high-performance",
            precision: "highp"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.zIndex = '-2';
        containerRef.current.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const spotLight = new THREE.SpotLight(0x0088ff, 0);
        spotLight.position.set(2, 4, 0);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 0.4;
        spotLight.decay = 2;
        spotLight.distance = 25;
        spotLight.castShadow = true;
        scene.add(spotLight);
        scene.add(spotLight.target);

        // Load Model
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        let loadedModel = null;
        let bulbMesh = null;

        loader.load('my_desk.glb', (gltf) => {
            loadedModel = gltf.scene;
            loadedModel.position.set(0, 0, 0);
            loadedModel.scale.set(2, 2, 2);
            loadedModel.visible = false; // Hidden initially
            
            loadedModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Material tweaks
                    if (!child.material.name.toLowerCase().includes("glass")) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0xcccccc, roughness: 0.5, metalness: 0.1
                        });
                    }
                    const name = child.name.toLowerCase();
                    if (name.includes('bulb') || name.includes('glass')) {
                        bulbMesh = child;
                        child.material = child.material.clone();
                        child.material.emissive = new THREE.Color(0x0088ff);
                        child.material.emissiveIntensity = 0;
                        child.material.transparent = true;
                        child.material.opacity = 0.9;
                    }
                }
            });

            scene.add(loadedModel);
            console.log("React: Desk Loaded");
            window.dispatchEvent(new Event('desk-loaded')); // Trigger loader exit
            setLoaded(true);
        });

        // Scroll Logic
        let scrollProgress = 0;
        
        const updateScroll = () => {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            const scrollTop = window.scrollY;
            scrollProgress += ((scrollTop / (maxScroll || 1)) - scrollProgress) * 0.05;

            // Desk Animation Logic
            const deskThreshold = 0.1;
            
            // Fade Hero Card (DOM manipulation for performance via GSAP usually better, but direct here for simplicity)
            const heroCard = document.querySelector('.hero-card');
            if(heroCard) {
                const opacity = Math.max(0, 1 - (scrollProgress * 5));
                heroCard.style.opacity = opacity;
                heroCard.style.transform = `translateY(${scrollProgress * 200}px)`;
                heroCard.style.pointerEvents = opacity < 0.1 ? 'none' : 'auto';
            }

            if (scrollProgress > deskThreshold) {
                if(loadedModel) loadedModel.visible = true;
                spotLight.visible = true;

                let deskProgress = (scrollProgress - deskThreshold) / (1 - deskThreshold);
                deskProgress = Math.max(0, Math.min(1, deskProgress));

                camera.position.lerpVectors(deskStartPos, deskEndPos, deskProgress);
                currentLookAt.lerpVectors(deskLookAt, deskEndLookAt, deskProgress);
                camera.lookAt(currentLookAt);

                // Bulb Intensity logic could go here based on raycaster
                spotLight.intensity = 50; // Simplified for this example
                if(bulbMesh) bulbMesh.material.emissiveIntensity = 4;
            } else {
                camera.position.copy(deskStartPos);
                camera.lookAt(deskLookAt);
                if(loadedModel) loadedModel.visible = false;
                spotLight.visible = false;
            }

            renderer.render(scene, camera);
            requestAnimationFrame(updateScroll);
        };
        
        updateScroll();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if(containerRef.current) containerRef.current.innerHTML = '';
        };
    }, []);

    return <div ref={containerRef} />;
};

// 4. UI COMPONENTS

const Navbar = () => (
    <nav className="fixed top-0 left-0 w-full p-8 md:p-12 flex justify-between items-center z-[10000] mix-blend-difference pointer-events-none reveal-up">
        <div className="flex items-center gap-5 pointer-events-auto">
            <div className="font-syne text-2xl font-extrabold text-white uppercase tracking-tighter">Satyam.</div>
            <div className="flex items-center gap-3 ml-8">
                <label className="relative inline-block w-10 h-6 cursor-pointer">
                    <input type="checkbox" className="opacity-0 w-0 h-0 peer" />
                    <span className="absolute inset-0 bg-white/10 rounded-full border border-white/20 transition-all peer-checked:bg-white before:content-[''] before:absolute before:h-3.5 before:w-3.5 before:left-1 before:bottom-1 before:bg-white before:transition-all before:rounded-full peer-checked:before:translate-x-4 peer-checked:before:bg-black"></span>
                </label>
                <span className="text-xs font-semibold text-white/60 tracking-wider">HQ</span>
            </div>
        </div>
        <ul className="hidden md:flex gap-12 list-none m-0 p-0 pointer-events-auto">
            {['About', 'Experience', 'Work', 'Contact'].map((item) => (
                <li key={item}>
                    <a href={`#${item.toLowerCase()}`} className="text-white font-syne font-bold text-sm uppercase tracking-widest relative opacity-70 hover:opacity-100 transition-opacity after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-white after:transition-all hover:after:w-full">
                        {item}
                    </a>
                </li>
            ))}
        </ul>
    </nav>
);

const StatusPill = () => (
    <div className="fixed bottom-10 right-10 z-[10002] bg-black/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 flex items-center gap-3 reveal-up pointer-events-auto">
        <span className="w-2.5 h-2.5 bg-[#25D366] rounded-full shadow-[0_0_10px_#25D366] animate-pulse"></span>
        <span className="text-sm font-medium text-gray-200">Available for work</span>
    </div>
);

const HeroSection = () => (
    <section id="hero" className="min-h-screen w-full flex items-center justify-center p-[10%] relative z-10 pointer-events-none">
        <div className="hero-card text-center pointer-events-auto">
            <h1 className="font-syne text-6xl md:text-8xl lg:text-9xl leading-[0.9] mb-5 tracking-tighter text-white mix-blend-overlay opacity-90 reveal-up">Satyam Patil</h1>
            <h2 className="font-inter text-xl md:text-2xl font-light text-gray-400 mb-10 tracking-wide reveal-up stagger-delay-1">Creative Developer & <br />Computer Engineering Student</h2>
            <div className="mt-8 reveal-up stagger-delay-2">
                <a href="#about" className="cta-btn inline-block px-8 py-4 bg-white text-black font-syne font-bold text-base rounded-full hover:scale-105 transition-transform">
                    Explore Portfolio
                </a>
            </div>
        </div>
    </section>
);

const AboutSection = () => (
    <section id="about" className="min-h-screen w-full flex items-center p-[10%] relative z-10 pointer-events-none">
        <div className="content-box bg-black/60 backdrop-blur-xl p-10 md:p-16 border border-white/10 max-w-3xl opacity-100 pointer-events-auto reveal-up">
            <h3 className="font-syne text-4xl md:text-5xl mb-10 text-white leading-none">About Me</h3>
            <p className="text-lg leading-relaxed text-gray-300 mb-8">
                I craft digital experiences at the intersection of design and engineering. Currently studying Computer Engineering at <strong>Thadomal Shahani Engineering College</strong> (2027), I blend technical precision with creative fluidity.
            </p>
            <div className="mt-8">
                <h4 className="font-syne text-2xl mb-4 text-white">Technical Arsenal</h4>
                <div className="flex flex-wrap gap-2">
                    {['Python', 'Three.js', 'React', 'OpenCV', 'Flask', 'Streamlit', 'Git'].map(skill => (
                        <span key={skill} className="bg-white/5 px-4 py-2 rounded-full text-sm text-gray-300 border border-white/10">{skill}</span>
                    ))}
                </div>
            </div>
        </div>
    </section>
);

const ExperienceSection = () => (
    <section id="experience" className="min-h-screen w-full flex items-center p-[10%] relative z-10 pointer-events-none">
        <div className="content-box bg-black/60 backdrop-blur-xl p-10 md:p-16 border border-white/10 max-w-4xl w-full pointer-events-auto">
            <h3 className="font-syne text-4xl md:text-5xl mb-10 text-white reveal-up">Experience</h3>
            <div className="border-l border-white/10 pl-10">
                
                {[
                    {
                        company: "Caffè Nero", location: "Stansted, UK", period: "Apr 2025 - Present",
                        roles: [
                            { title: "Shift Leader", date: "Aug 2025 - Present", tags: ["Barista", "Sales", "Management"] },
                            { title: "Lead Barista", date: "Apr 2025 - Jul 2025" }
                        ]
                    },
                    {
                        company: "Muffin Break UK", location: "Colchester, UK", period: "Oct 2023 - Mar 2025",
                        roles: [
                            { title: "Assistant Manager", date: "Oct 2024 - Mar 2025", tags: ["Management", "Leadership"] },
                            { title: "Team Member", date: "Oct 2023 - Jul 2024", desc: "Managed ~300 daily transactions." }
                        ]
                    }
                ].map((job, i) => (
                    <div key={i} className="mb-12 relative reveal-up">
                        <div className="absolute -left-[45px] top-2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                        <span className="text-sm text-gray-400 uppercase tracking-widest">{job.period}</span>
                        <h4 className="text-[#0088ff] text-xl font-bold mt-1">{job.company}</h4>
                        <p className="text-sm text-gray-500 mb-4">{job.location}</p>
                        
                        <div className="pl-6 border-l border-white/10 mt-4 space-y-6">
                            {job.roles.map((role, j) => (
                                <div key={j}>
                                    <strong className="text-white text-lg block">{role.title}</strong>
                                    <span className="text-xs text-gray-500 block mb-2">{role.date}</span>
                                    {role.desc && <p className="text-gray-400 text-sm leading-relaxed">{role.desc}</p>}
                                    {role.tags && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {role.tags.map(tag => <span key={tag} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400 border border-white/5">{tag}</span>)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const ProjectsSection = () => (
    <section id="work" className="min-h-screen w-full flex items-center justify-center p-[5%] relative z-10 pointer-events-none">
        <div className="w-full max-w-6xl pointer-events-auto">
            <h3 className="font-syne text-4xl md:text-5xl mb-12 text-white reveal-up">Selected Works</h3>
            
            {/* FEATURED PROJECT */}
            <div className="reveal-up mb-16 relative bg-gradient-to-br from-white/5 to-black/40 border border-white/10 p-8 md:p-12 rounded-lg overflow-hidden group">
                {/* Glow */}
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                {/* Image Bento Grid */}
                <div className="grid grid-cols-12 gap-4 h-[400px] mb-8 perspective-[1000px]">
                    <div className="col-span-8 row-span-1 relative overflow-hidden rounded border border-white/10 scroll-reactor" data-speed="0.05">
                        <img src="abooki1.png" alt="App" className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                    </div>
                    <div className="col-span-4 row-span-1 relative overflow-hidden rounded border border-white/10 scroll-reactor" data-speed="0.08">
                        <img src="abooki2.png" alt="App" className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                    </div>
                    <div className="col-span-4 row-span-1 relative overflow-hidden rounded border border-white/10 scroll-reactor" data-speed="0.03">
                        <img src="abooki3.png" alt="App" className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                    </div>
                    <div className="col-span-8 row-span-1 relative overflow-hidden rounded border border-white/10 scroll-reactor" data-speed="0.06">
                        <img src="abooki4.png" alt="App" className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                    </div>
                </div>

                <div className="relative z-10">
                    <span className="font-syne text-xs text-[#0088ff] uppercase tracking-widest mb-2 block">Featured Project</span>
                    <h4 className="text-4xl md:text-5xl font-bold text-white mb-4">Abooki 📚✨</h4>
                    <p className="text-gray-300 text-lg mb-6 max-w-2xl">
                        An AI-powered storytelling platform. Generate 10-page mini-books with custom covers, read in a distraction-free environment, or listen via Audiobook mode.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-8">
                        {['Vanilla JS', 'Firebase', 'AI Integration', 'HTML/CSS'].map(t => (
                            <span key={t} className="bg-white/5 px-3 py-1 rounded text-sm text-gray-300 border border-white/10">{t}</span>
                        ))}
                    </div>
                    <a href="https://abooki.co.uk/" target="_blank" rel="noreferrer" className="cta-btn inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-[#0088ff] hover:text-white transition-colors">
                        Launch Project <i className="fas fa-external-link-alt text-xs"></i>
                    </a>
                </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { title: "PixelForge", desc: "AI-powered image processing suite using Hugging Face." },
                    { title: "PulseFeed", desc: "Personalized news aggregator built with Flask." },
                    { title: "Face ID", desc: "Real-time biometric identity system using OpenCV." }
                ].map((p, i) => (
                    <div key={i} className="project-card bg-white/5 p-8 border border-white/5 rounded hover:bg-white/10 hover:-translate-y-2 transition-all duration-300 cursor-none reveal-up">
                        <h4 className="text-[#0088ff] text-xl font-bold mb-2">{p.title}</h4>
                        <p className="text-gray-400 text-sm">{p.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// 5. MAIN APP COMPONENT
const App = () => {
    const [deskLoaded, setDeskLoaded] = useState(false);
    const [loadingDone, setLoadingDone] = useState(false);
    const cursorRef = useRef(null);

    // --- EFFECT: Lenis & GSAP ---
    useLayoutEffect(() => {
        if (!loadingDone) return;

        // Init Lenis
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            smooth: true,
        });

        const raf = (time) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);

        // Init GSAP Reveals
        const ctx = gsap.context(() => {
            const elements = document.querySelectorAll('.reveal-up');
            elements.forEach((el) => {
                gsap.fromTo(el, 
                    { y: 100, opacity: 0 },
                    {
                        y: 0, opacity: 1, duration: 1.5, ease: 'power4.out',
                        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
                    }
                );
            });

            // Parallax Images
            const reactors = document.querySelectorAll('.scroll-reactor');
            reactors.forEach(el => {
                const img = el.querySelector('img');
                const speed = parseFloat(el.getAttribute('data-speed')) || 0.05;
                if(img) {
                    gsap.to(img, {
                        yPercent: 15, ease: 'none',
                        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
                    });
                    gsap.to(el, {
                        y: -50 * speed, ease: 'none',
                        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
                    });
                }
            });
        });

        return () => {
            lenis.destroy();
            ctx.revert();
        };
    }, [loadingDone]);

    // --- EFFECT: Cursor ---
    useEffect(() => {
        const moveCursor = (e) => {
            if(cursorRef.current) {
                gsap.to(cursorRef.current, { x: e.clientX, y: e.clientY, duration: 0.1, ease: 'power2.out' });
            }
        };
        window.addEventListener('mousemove', moveCursor);
        return () => window.removeEventListener('mousemove', moveCursor);
    }, []);

    // Loader Finish Handler
    const onLoaderComplete = () => setLoadingDone(true);

    return (
        <div className={`bg-[#050505] text-[#e0e0e0] font-inter ${!loadingDone ? 'overflow-hidden h-screen' : ''}`}>
            {/* Styles for Noise & Fonts */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Syne:wght@400;700;800&display=swap');
                .font-syne { font-family: 'Syne', sans-serif; }
                .font-inter { font-family: 'Inter', sans-serif; }
                .noise-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9000; opacity: 0.05;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E");
                }
                .cursor-follower {
                    position: fixed; top: 0; left: 0; width: 15px; height: 15px; background: white; border-radius: 50%;
                    transform: translate(-50%, -50%); pointer-events: none; z-index: 10001; mix-blend-mode: exclusion;
                }
                ::-webkit-scrollbar { width: 0px; background: transparent; }
            `}</style>

            <div className="noise-overlay"></div>
            
            {/* Custom Cursor */}
            <div ref={cursorRef} className="cursor-follower"></div>

            {/* 3D Background Layers */}
            {!loadingDone && <LoaderCanvas onLoaded={onLoaderComplete} />}
            <IntroCanvas />
            <DeskScene setLoaded={setDeskLoaded} />

            {/* App Content */}
            <div className={`transition-opacity duration-1000 ${loadingDone ? 'opacity-100' : 'opacity-0'}`}>
                <Navbar />
                <StatusPill />
                
                <main>
                    <HeroSection />
                    <AboutSection />
                    <ExperienceSection />
                    <ProjectsSection />
                    <section className="h-[20vh] flex items-center justify-center p-10 relative z-10 pointer-events-none">
                        <div className="pointer-events-auto">
                            <button className="cta-btn text-gray-500 hover:text-white transition-colors" onClick={() => window.location.href='mailto:satyampatil1505@gmail.com'}>
                                &copy; 2025 Satyam Patil
                            </button>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

// Mount
const root = createRoot(document.getElementById('root'));
root.render(<App />);