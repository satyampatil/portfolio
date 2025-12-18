import * as THREE from 'three';
import { GUI } from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';

// --- GLOBAL STATE ---
const state = {
    activeExperimentId: 'Exp5', // Default to the new Circles experiment
};

const experiments = {}; 

// --- SETUP SCENE ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.002); 

const globalAmbient = new THREE.AmbientLight(0x404040, 2.0); 
scene.add(globalAmbient);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 100); 

const canvas = document.querySelector('#experiment-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- GUI SETUP ---
const gui = new GUI();
gui.domElement.parentElement.style.zIndex = "10000";

const masterFolder = gui.addFolder('Select Experiment');
masterFolder.add(state, 'activeExperimentId', ['Exp1', 'Exp2', 'Exp3', 'Exp4', 'Exp5', 'Exp6'])
    .name('Experiment')
    .onChange(switchExperiment);
masterFolder.open();

// --- MOUSE INTERACTION ---
const mouse = new THREE.Vector2();
const cursorFollower = document.getElementById('cursor-follower');

window.addEventListener('mousemove', (event) => {
    if (cursorFollower) {
        cursorFollower.style.left = event.clientX + 'px';
        cursorFollower.style.top = event.clientY + 'px';
    }
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});


// ==========================================
// EXPERIMENT 1: WIREFRAME WAVES
// ==========================================
function initExp1() {
    const config = { speed: 1.0, height: 10.0, color: '#0088ff', style: 'Wireframe', opacity: 0.8 };
    const geometry = new THREE.PlaneGeometry(300, 300, 80, 80);
    const meshMaterial = new THREE.MeshBasicMaterial({ color: config.color, wireframe: true, side: THREE.DoubleSide, transparent: true, opacity: config.opacity });
    const pointsMaterial = new THREE.PointsMaterial({ color: config.color, size: 2.0, transparent: true, opacity: config.opacity });
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    const points = new THREE.Points(geometry, pointsMaterial);
    mesh.rotation.x = -Math.PI / 2; points.rotation.x = -Math.PI / 2;
    mesh.position.y = -20; points.position.y = -20;
    mesh.visible = true; points.visible = false;
    const group = new THREE.Group(); group.add(mesh); group.add(points); group.visible = false; scene.add(group);

    const folder = gui.addFolder('Controls: Wave Grid');
    folder.add(config, 'speed', 0, 5);
    folder.add(config, 'height', 0, 30);
    folder.addColor(config, 'color').onChange(c => { meshMaterial.color.set(c); pointsMaterial.color.set(c); });
    folder.add(config, 'style', ['Wireframe', 'Points']).onChange(val => { mesh.visible = val !== 'Points'; points.visible = val === 'Points'; meshMaterial.wireframe = val === 'Wireframe'; });
    folder.hide(); 

    return {
        id: 'Exp1', group, folder,
        animate: (t) => {
            const pos = geometry.attributes.position;
            for(let i=0; i<pos.count; i++){
                const x = pos.getX(i); const y = pos.getY(i);
                let z = Math.sin(x * 0.05 + t * config.speed) * config.height + Math.cos(y * 0.05 + t * config.speed) * config.height;
                pos.setZ(i, z);
            }
            pos.needsUpdate = true;
            camera.position.x += (mouse.x * 50 - camera.position.x) * 0.05;
            camera.position.y += (50 + mouse.y * 20 - camera.position.y) * 0.05;
            camera.lookAt(0, 0, 0);
        }
    };
}

// ==========================================
// EXPERIMENT 2: SMOKY FLUID LINES
// ==========================================
function initExp2() {
    const config = { speed: 0.2, density: 1.5, displacement: 15.0, color: '#ffffff', wireframe: true };
    const noiseChunk = `vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1;i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}`;
    const vert = `uniform float uTime;uniform float uDisp;varying vec2 vUv;${noiseChunk}void main(){vUv=uv;vec3 p=position;float n=snoise(uv*3.0+uTime*0.2);p.z+=n*uDisp;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
    const frag = `uniform float uTime;uniform vec3 uColor;uniform float uDens;varying vec2 vUv;${noiseChunk}void main(){vec2 uv=vUv;float n1=snoise(uv*4.0+uTime*0.1);float n2=snoise(uv*8.0-uTime*0.15);float c=n1*0.5+n2*0.5;float a=smoothstep(0.3,0.8,c+0.5);a=pow(a,uDens);gl_FragColor=vec4(uColor,a);}`;
    const uniforms = { uTime:{value:0}, uColor:{value:new THREE.Color(config.color)}, uDens:{value:config.density}, uDisp:{value:config.displacement}};
    const mat = new THREE.ShaderMaterial({ vertexShader:vert, fragmentShader:frag, uniforms, transparent:true, side:THREE.DoubleSide, wireframe:config.wireframe });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(200,150,100,100), mat);
    mesh.visible = false; scene.add(mesh);
    const folder = gui.addFolder('Controls: Smoky Lines 3D');
    folder.add(config, 'speed', 0, 2);
    folder.add(config, 'displacement', 0, 50).onChange(v=>uniforms.uDisp.value=v);
    folder.add(config, 'wireframe').onChange(v=>mat.wireframe=v);
    folder.add(config, 'density', 0.1, 5).onChange(v=>uniforms.uDens.value=v);
    folder.addColor(config, 'color').onChange(v=>uniforms.uColor.value.set(v));
    folder.hide();
    return { id:'Exp2', group:mesh, folder, animate:(t)=>{ uniforms.uTime.value=t*config.speed; mesh.rotation.x=mouse.y*0.2; mesh.rotation.y=mouse.x*0.2; }};
}

// ==========================================
// EXPERIMENT 3: LIVE DATA TERRAIN
// ==========================================
function initExp3() {
    const config = { gridSize: 30, barSpacing: 2.0, speed: 1.5, heightScale: 20.0, colorLow: '#0044ff', colorHigh: '#ff0055' };
    const geom = new THREE.BoxGeometry(1,1,1);
    const mat = new THREE.MeshPhongMaterial({ shininess:50, flatShading:false });
    const mesh = new THREE.InstancedMesh(geom, mat, 10000);
    const group = new THREE.Group(); group.add(mesh); group.visible = false; scene.add(group);
    
    const dummy = new THREE.Object3D(); const color = new THREE.Color(); 
    const cLow = new THREE.Color(config.colorLow); const cHigh = new THREE.Color(config.colorHigh);
    
    // Lights for 3 and 4
    const light = new THREE.DirectionalLight(0xffffff, 1.2); light.position.set(20,50,50); scene.add(light); light.visible=false;
    const fill = new THREE.DirectionalLight(0x4444ff, 0.6); fill.position.set(-20,20,-20); scene.add(fill); fill.visible=false;

    const folder = gui.addFolder('Controls: Heatmap');
    folder.add(config, 'speed', 0, 5);
    folder.add(config, 'heightScale', 0, 50);
    folder.hide();

    return {
        id:'Exp3', group, folder, lights: [light, fill],
        animate:(t)=>{
            light.visible=true; fill.visible=true;
            let i=0; const sz=Math.min(config.gridSize,100);
            for(let x=0; x<sz; x++){
                for(let z=0; z<sz; z++){
                    const xp = (x-sz/2)*config.barSpacing; const zp = (z-sz/2)*config.barSpacing;
                    const n = Math.sin(x*0.2 + t*config.speed) + Math.cos(z*0.2 + t*config.speed*0.8);
                    const h = Math.max(0.1, (n+2)*(config.heightScale/3));
                    dummy.position.set(xp, h/2 - 10, zp); dummy.scale.set(1,h,1); dummy.updateMatrix();
                    mesh.setMatrixAt(i, dummy.matrix);
                    color.lerpColors(cLow, cHigh, Math.min(1, Math.max(0, h/config.heightScale)));
                    mesh.setColorAt(i, color);
                    i++;
                }
            }
            mesh.count=i; mesh.instanceMatrix.needsUpdate=true; mesh.instanceColor.needsUpdate=true;
            group.rotation.y = mouse.x * 0.3; group.rotation.x = mouse.y * 0.15;
        }
    };
}

// ==========================================
// EXPERIMENT 4: HERO PORTRAIT + DATA
// ==========================================
function initExp4() {
    const config = { gridSize: 60, barSpacing: 2.5, speed: 0.8, heightScale: 25.0, colorLow: '#111111', colorHigh: '#0044ff' };
    const geom = new THREE.BoxGeometry(1,1,1);
    const mat = new THREE.MeshPhongMaterial({ shininess: 80, flatShading: false });
    const terrainMesh = new THREE.InstancedMesh(geom, mat, 20000);
    const group = new THREE.Group(); 
    group.add(terrainMesh);
    group.visible = false;
    scene.add(group);

    const texLoader = new THREE.TextureLoader();
    const texture = texLoader.load('my_photo.png', 
        undefined, undefined,
        (err) => { 
            console.error("Error loading my_photo.png. Check filename.", err);
            imgMesh.material.uniforms.uColor.value.set(0xff0000);
            imgMesh.material.uniforms.uUseTexture.value = 0.0;
        }
    );
    
    const imgUniforms = {
        uTime: { value: 0 },
        uTexture: { value: texture },
        uUseTexture: { value: 1.0 }, 
        uColor: { value: new THREE.Color(0xffffff) },
        uMouse: { value: new THREE.Vector2(0, 0) }
    };

    const imgMaterial = new THREE.ShaderMaterial({
        uniforms: imgUniforms,
        transparent: true,
        vertexShader: `
            varying vec2 vUv;
            uniform float uTime;
            uniform vec2 uMouse;
            void main() {
                vUv = uv;
                vec3 pos = position;
                pos.y += sin(uTime * 1.0 + pos.x * 2.0) * 0.5;
                pos.x += (uMouse.x * 2.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            uniform float uTime;
            uniform float uUseTexture;
            uniform vec3 uColor;
            varying vec2 vUv;
            void main() {
                vec2 uv = vUv;
                float wave = sin(uv.y * 10.0 + uTime) * 0.005;
                uv.x += wave;
                vec4 color;
                if(uUseTexture > 0.5) { color = texture2D(uTexture, uv); } 
                else { color = vec4(uColor, 1.0); }
                gl_FragColor = color;
            }
        `
    });

    const imgGeometry = new THREE.PlaneGeometry(30, 40);
    const imgMesh = new THREE.Mesh(imgGeometry, imgMaterial);
    imgMesh.position.set(0, 5, 20); 
    imgMesh.renderOrder = 999;
    group.add(imgMesh);

    const dummy = new THREE.Object3D(); 
    const color = new THREE.Color(); 
    const cLow = new THREE.Color(config.colorLow); 
    const cHigh = new THREE.Color(config.colorHigh);
    
    const light = new THREE.DirectionalLight(0xffffff, 1.5); light.position.set(0,50,50); scene.add(light); light.visible=false;
    const fill = new THREE.DirectionalLight(0x2222ff, 0.8); fill.position.set(-20,10,-20); scene.add(fill); fill.visible=false;

    const folder = gui.addFolder('Controls: Portrait Mode');
    folder.add(config, 'speed', 0, 5);
    folder.add(config, 'heightScale', 0, 50);
    folder.hide();

    return {
        id:'Exp4', group, folder,
        animate:(t)=>{
            light.visible=true; fill.visible=true;
            let i=0; const sz=Math.min(config.gridSize,100);
            for(let x=0; x<sz*2; x++){
                for(let z=0; z<sz; z++){
                    const xp = (x-sz)*config.barSpacing; const zp = (z-sz/2)*config.barSpacing;
                    const n = Math.sin(x*0.1 + t*config.speed) + Math.cos(z*0.1 + t*config.speed*0.8);
                    const h = Math.max(0.1, (n+2)*(config.heightScale/3));
                    dummy.position.set(xp, h/2 - 20, zp - 20);
                    dummy.scale.set(1,h,1); dummy.updateMatrix();
                    terrainMesh.setMatrixAt(i, dummy.matrix);
                    color.lerpColors(cLow, cHigh, Math.min(1, Math.max(0, h/config.heightScale)));
                    terrainMesh.setColorAt(i, color);
                    i++;
                }
            }
            terrainMesh.count=i; terrainMesh.instanceMatrix.needsUpdate=true; terrainMesh.instanceColor.needsUpdate=true;
            imgUniforms.uTime.value = t;
            imgUniforms.uMouse.value.lerp(mouse, 0.05);
            camera.position.x += (mouse.x * 20 - camera.position.x) * 0.02;
            camera.position.y += (10 + mouse.y * 10 - camera.position.y) * 0.02;
            camera.lookAt(0,5,0);
        },
        reset:()=>{ light.visible=false; fill.visible=false; }
    };
}

// ==========================================
// EXPERIMENT 5: MONOTONE CONCENTRIC CIRCLES
// ==========================================
function initExp5() {
    const config = {
        speed: 1.0,
        frequency: 10.0,
        color: '#e0e0e0',
        lineWidth: 0.1,
    };

    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);

    // Fullscreen Plane
    const geometry = new THREE.PlaneGeometry(300, 200, 1, 1);

    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec2 uResolution;
        uniform float uFrequency;
        uniform float uLineWidth;
        
        varying vec2 vUv;

        void main() {
            // Fix Aspect Ratio
            vec2 st = vUv - 0.5;
            st.x *= uResolution.x / uResolution.y;
            
            float dist = length(st);
            
            // Rings
            float pattern = sin(dist * uFrequency * 6.28 - uTime);
            
            // Antialiased lines
            float ring = smoothstep(0.5 - uLineWidth, 0.5, pattern) - smoothstep(0.5, 0.5 + uLineWidth, pattern);
            
            // Mask
            float mask = 1.0 - smoothstep(0.2, 0.5, dist);
            
            gl_FragColor = vec4(uColor, ring * mask);
        }
    `;

    const uniforms = {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(config.color) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uFrequency: { value: config.frequency },
        uLineWidth: { value: config.lineWidth }
    };

    const material = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const folder = gui.addFolder('Controls: Concentric Rings');
    folder.add(config, 'speed', 0, 5);
    folder.add(config, 'frequency', 1, 50);
    folder.add(config, 'lineWidth', 0.01, 0.5);
    folder.addColor(config, 'color').onChange(v => uniforms.uColor.value.set(v));
    folder.hide();

    return {
        id: 'Exp5', group, folder,
        animate: (t) => {
            uniforms.uTime.value = t * config.speed;
            uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
            
            // Lock Camera for 2D look
            camera.position.set(0, 0, 100);
            camera.lookAt(0, 0, 0);
        }
    };
}


// ==========================================
// EXPERIMENT 6: DIPLOMA TUBE
// ==========================================
function initExp6() {
    const config = {
        radius: 6,
        height: 50,
        layers: 50,
        segments: 30,
        speed: 1.5,
        color: '#daa520' 
    };

    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8); 
    geometry.rotateX(Math.PI / 2); 

    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff, 
        emissive: 0x111111, 
        specular: 0x444444,
        shininess: 30,
        side: THREE.DoubleSide
    });

    const maxCount = 8000; 
    const mesh = new THREE.InstancedMesh(geometry, material, maxCount);

    const group = new THREE.Group();
    group.add(mesh);
    group.visible = false;
    scene.add(group);

    // Helpers
    const dummy = new THREE.Object3D();
    const tubeColor = new THREE.Color(config.color);
    const paperColor = new THREE.Color(0xffffff);

    // Lights
    const light = new THREE.PointLight(0xffffff, 1.5, 60);
    light.position.set(0, 10, 20);
    scene.add(light);
    light.visible = false;

    const rimLight = new THREE.SpotLight(0xffaa00, 3);
    rimLight.position.set(30, 20, 30);
    rimLight.lookAt(0,0,0);
    scene.add(rimLight);
    rimLight.visible = false;

    const folder = gui.addFolder('Controls: Diploma Tube');
    folder.add(config, 'speed', 0.1, 5);
    folder.addColor(config, 'color').onChange(v => tubeColor.set(v));
    folder.hide();

    // Data Generation
    const holderData = [];
    const paperData = [];
    
    // Generate static positions
    // ... (Code abbreviated for brevity, same logic as before) ...
    // Re-implementing simplified generation for clarity in this file:
    
    let idx = 0;
    // Tube
    for(let y=0; y<50; y++) {
        const ny = y/49; 
        const py = (ny - 0.5) * 40;
        for(let s=0; s<30; s++) {
            if(idx >= maxCount) break;
            const angle = (s/30) * Math.PI * 2;
            let r = config.radius;
            if (y < 5 || y > 45) r *= 1.2; 
            holderData.push({ u:angle, v:ny, r, y:py });
            idx++;
        }
    }
    // Paper
    let pIdx = idx;
    for(let y=0; y<35; y++) {
        const ny = y/34;
        const py = (ny - 0.5) * 35;
        for(let s=0; s<25; s++) {
             if(pIdx >= maxCount) break;
             const angle = (s/25) * Math.PI * 2;
             paperData.push({ u:angle, v:ny, r:3.5, y:py });
             pIdx++;
        }
    }


    return {
        id: 'Exp6', group, folder,
        animate: (t) => {
            light.visible = true;
            rimLight.visible = true;
            
            let i = 0;
            const time = t * config.speed;
            const progress = (time * 0.2) % 1.5;
            const slide = progress > 1 ? 1 : progress;
            const extrusion = slide * 25;

            // Tube
            holderData.forEach(d => {
                const angle = d.u + time * 0.5;
                const x = Math.cos(angle) * d.r;
                const z = Math.sin(angle) * d.r;
                dummy.position.set(x, d.y, z);
                dummy.lookAt(0, d.y, 0);
                dummy.rotateY(Math.PI/2);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
                mesh.setColorAt(i, tubeColor);
                i++;
            });

            // Paper
            paperData.forEach(d => {
                const angle = d.u + time * 0.2;
                const x = Math.cos(angle) * d.r;
                const z = Math.sin(angle) * d.r;
                const y = d.y + extrusion;
                dummy.position.set(x, y, z);
                dummy.lookAt(0, y, 0);
                dummy.scale.set(0.8, 0.8, 1);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
                mesh.setColorAt(i, paperColor);
                i++;
            });

            mesh.count = i;
            mesh.instanceMatrix.needsUpdate = true;
            mesh.instanceColor.needsUpdate = true;
            
            group.rotation.z = Math.PI / 4;
            group.rotation.y = time * 0.2;
            
            camera.position.set(0, 0, 80);
            camera.lookAt(0, 0, 0);
        },
        reset: () => {
            light.visible = false;
            rimLight.visible = false;
        }
    };
}


// --- INITIALIZATION ---
experiments['Exp1'] = initExp1();
experiments['Exp2'] = initExp2();
experiments['Exp3'] = initExp3();
experiments['Exp4'] = initExp4();
experiments['Exp5'] = initExp5(); // Circles
experiments['Exp6'] = initExp6();

function switchExperiment(id) {
    Object.values(experiments).forEach(e => { e.group.visible=false; e.folder.hide(); if(e.reset)e.reset(); });
    const act = experiments[id];
    if(act) {
        act.group.visible=true; act.folder.show(); act.folder.open();
        
        if(id==='Exp1') { camera.position.set(0,50,100); camera.lookAt(0,0,0); }
        else if(id==='Exp2') { camera.position.set(0,0,80); camera.lookAt(0,0,0); }
        else if(id==='Exp3') { camera.position.set(0,40,80); camera.lookAt(0,0,0); }
        else if(id==='Exp4') { camera.position.set(0,10,60); camera.lookAt(0,5,0); }
        else if(id==='Exp5') { camera.position.set(0,0,100); camera.lookAt(0,0,0); }
        else if(id==='Exp6') { camera.position.set(0,0,60); camera.lookAt(0,0,0); }
    }
}

// Start with Experiment 5
switchExperiment('Exp5');

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();
function animate() {
    const time = clock.getElapsedTime();
    const active = experiments[state.activeExperimentId];
    if (active) active.animate(time);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();