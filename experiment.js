import * as THREE from 'three';

// --- GLOBAL STATE ---
const state = {
    activeExperimentId: 'Exp7', // Start with Ink
};

// --- METADATA FOR UI ---
const experimentData = {
    'Exp1': { title: 'WIRE WAVES', desc: 'Mathematical sine wave propagation on a planar grid.' },
    'Exp2': { title: 'SMOKE 3D', desc: 'Volumetric Perlin noise displacement creating smoke aesthetics.' },
    'Exp3': { title: 'DATA HEATMAP', desc: 'Instanced mesh rendering representing live data clusters.' },
    'Exp4': { title: 'HERO SCAN', desc: 'Digital terrain mapping mixed with image texture projection.' },
    'Exp5': { title: 'HYPNOSIS', desc: 'Infinite concentric patterns using fragment shaders.' },
    'Exp6': { title: 'THE TUBE', desc: 'Procedural geometry generation along a cylindrical path.' },
    'Exp7': { title: 'INK FLUID', desc: 'Domain warping algorithms simulating liquid dynamics.' }
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

// --- MOUSE INTERACTION ---
const mouse = new THREE.Vector2();
const cursorFollower = document.getElementById('cursor-follower');

window.addEventListener('mousemove', (event) => {
    // Custom Cursor Logic
    if (cursorFollower) {
        cursorFollower.style.left = event.clientX + 'px';
        cursorFollower.style.top = event.clientY + 'px';
    }
    // Three.js Normalized Mouse
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});


// ==========================================
// EXPERIMENT 1: WIREFRAME WAVES
// ==========================================
function initExp1() {
    const config = { speed: 1.0, height: 10.0, color: '#0088ff', opacity: 0.8 };
    const geometry = new THREE.PlaneGeometry(300, 300, 80, 80);
    const meshMaterial = new THREE.MeshBasicMaterial({ color: config.color, wireframe: true, side: THREE.DoubleSide, transparent: true, opacity: config.opacity });
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -20;
    
    const group = new THREE.Group(); group.add(mesh); group.visible = false; scene.add(group);

    return {
        id: 'Exp1', group,
        config,
        settings: [
            { id: 'speed', type: 'range', min: 0, max: 5, step: 0.1, label: 'Speed' },
            { id: 'height', type: 'range', min: 0, max: 30, step: 1, label: 'Height' },
            { id: 'color', type: 'color', label: 'Color', onChange: (v) => meshMaterial.color.set(v) }
        ],
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
    const config = { speed: 0.2, density: 1.5, displacement: 15.0, color: '#ffffff' };
    const noiseChunk = `vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1;i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}`;
    const vert = `uniform float uTime;uniform float uDisp;varying vec2 vUv;${noiseChunk}void main(){vUv=uv;vec3 p=position;float n=snoise(uv*3.0+uTime*0.2);p.z+=n*uDisp;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
    const frag = `uniform float uTime;uniform vec3 uColor;uniform float uDens;varying vec2 vUv;${noiseChunk}void main(){vec2 uv=vUv;float n1=snoise(uv*4.0+uTime*0.1);float n2=snoise(uv*8.0-uTime*0.15);float c=n1*0.5+n2*0.5;float a=smoothstep(0.3,0.8,c+0.5);a=pow(a,uDens);gl_FragColor=vec4(uColor,a);}`;
    const uniforms = { uTime:{value:0}, uColor:{value:new THREE.Color(config.color)}, uDens:{value:config.density}, uDisp:{value:config.displacement}};
    const mat = new THREE.ShaderMaterial({ vertexShader:vert, fragmentShader:frag, uniforms, transparent:true, side:THREE.DoubleSide, wireframe:true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(200,150,100,100), mat);
    mesh.visible = false; scene.add(mesh);
    
    return { 
        id:'Exp2', group:mesh, 
        config,
        settings: [
            { id: 'speed', type: 'range', min: 0, max: 2, step: 0.1, label: 'Speed' },
            { id: 'displacement', type: 'range', min: 0, max: 50, step: 1, label: 'Noise Height', onChange: (v) => uniforms.uDisp.value = v },
            { id: 'density', type: 'range', min: 0.1, max: 5, step: 0.1, label: 'Smoke Density', onChange: (v) => uniforms.uDens.value = v },
            { id: 'color', type: 'color', label: 'Smoke Color', onChange: (v) => uniforms.uColor.value.set(v) }
        ],
        animate:(t)=>{ 
            uniforms.uTime.value=t*config.speed; 
            mesh.rotation.x=mouse.y*0.2; 
            mesh.rotation.y=mouse.x*0.2; 
        }
    };
}

// ==========================================
// EXPERIMENT 3: LIVE DATA TERRAIN
// ==========================================
function initExp3() {
    const config = { speed: 1.5, heightScale: 20.0 };
    const geom = new THREE.BoxGeometry(1,1,1);
    const mat = new THREE.MeshPhongMaterial({ shininess:50, flatShading:false });
    const mesh = new THREE.InstancedMesh(geom, mat, 10000);
    const group = new THREE.Group(); group.add(mesh); group.visible = false; scene.add(group);
    
    const dummy = new THREE.Object3D(); const color = new THREE.Color(); 
    const cLow = new THREE.Color('#0044ff'); const cHigh = new THREE.Color('#ff0055');
    
    const light = new THREE.DirectionalLight(0xffffff, 1.2); light.position.set(20,50,50); scene.add(light); light.visible=false;
    const fill = new THREE.DirectionalLight(0x4444ff, 0.6); fill.position.set(-20,20,-20); scene.add(fill); fill.visible=false;

    return {
        id:'Exp3', group, lights: [light, fill],
        config,
        settings: [
            { id: 'speed', type: 'range', min: 0, max: 5, step: 0.1, label: 'Speed' },
            { id: 'heightScale', type: 'range', min: 0, max: 50, step: 1, label: 'Data Scale' }
        ],
        animate:(t)=>{
            light.visible=true; fill.visible=true;
            let i=0; const sz=30; const barSpacing=2.0;
            for(let x=0; x<sz; x++){
                for(let z=0; z<sz; z++){
                    const xp = (x-sz/2)*barSpacing; const zp = (z-sz/2)*barSpacing;
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
        },
        reset: () => { light.visible=false; fill.visible=false; }
    };
}

// ==========================================
// EXPERIMENT 4: HERO PORTRAIT + DATA
// ==========================================
function initExp4() {
    const config = { speed: 0.8, heightScale: 25.0 };
    const geom = new THREE.BoxGeometry(1,1,1);
    const mat = new THREE.MeshPhongMaterial({ shininess: 80, flatShading: false });
    const terrainMesh = new THREE.InstancedMesh(geom, mat, 20000);
    const group = new THREE.Group(); 
    group.add(terrainMesh);
    group.visible = false;
    scene.add(group);

    const texLoader = new THREE.TextureLoader();
    const texture = texLoader.load('my_photo.png', undefined, undefined, () => {});
    
    const imgUniforms = {
        uTime: { value: 0 },
        uTexture: { value: texture },
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
            varying vec2 vUv;
            void main() {
                vec2 uv = vUv;
                float wave = sin(uv.y * 10.0 + uTime) * 0.005;
                uv.x += wave;
                vec4 color = texture2D(uTexture, uv);
                if(color.a < 0.1) discard; 
                gl_FragColor = color;
            }
        `
    });

    const imgMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 40), imgMaterial);
    imgMesh.position.set(0, 5, 20); imgMesh.renderOrder = 999;
    group.add(imgMesh);

    const dummy = new THREE.Object3D(); const color = new THREE.Color(); 
    const cLow = new THREE.Color('#111111'); const cHigh = new THREE.Color('#0044ff');
    const light = new THREE.DirectionalLight(0xffffff, 1.5); light.position.set(0,50,50); scene.add(light); light.visible=false;
    const fill = new THREE.DirectionalLight(0x2222ff, 0.8); fill.position.set(-20,10,-20); scene.add(fill); fill.visible=false;

    return {
        id:'Exp4', group, config,
        settings: [
            { id: 'speed', type: 'range', min: 0, max: 5, step: 0.1, label: 'Speed' },
            { id: 'heightScale', type: 'range', min: 0, max: 50, step: 1, label: 'Noise Scale' }
        ],
        animate:(t)=>{
            light.visible=true; fill.visible=true;
            let i=0; const sz=60; const barSpacing=2.5;
            for(let x=0; x<sz*2; x++){
                for(let z=0; z<sz; z++){
                    const xp = (x-sz)*barSpacing; const zp = (z-sz/2)*barSpacing;
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
    const config = { speed: 1.0, frequency: 10.0, color: '#e0e0e0', lineWidth: 0.1 };
    const group = new THREE.Group(); group.visible = false; scene.add(group);
    
    const uniforms = {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(config.color) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uFrequency: { value: config.frequency },
        uLineWidth: { value: config.lineWidth }
    };

    const material = new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            uniform float uTime; uniform vec3 uColor; uniform vec2 uResolution;
            uniform float uFrequency; uniform float uLineWidth; varying vec2 vUv;
            void main() {
                vec2 st = vUv - 0.5; st.x *= uResolution.x / uResolution.y;
                float dist = length(st);
                float pattern = sin(dist * uFrequency * 6.28 - uTime);
                float ring = smoothstep(0.5 - uLineWidth, 0.5, pattern) - smoothstep(0.5, 0.5 + uLineWidth, pattern);
                float mask = 1.0 - smoothstep(0.2, 0.5, dist);
                gl_FragColor = vec4(uColor, ring * mask);
            }
        `,
        uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(300, 200, 1, 1), material);
    group.add(mesh);

    return {
        id: 'Exp5', group, config,
        settings: [
            { id: 'speed', type: 'range', min: 0, max: 5, step: 0.1, label: 'Speed' },
            { id: 'frequency', type: 'range', min: 1, max: 50, step: 1, label: 'Frequency', onChange: (v) => uniforms.uFrequency.value = v },
            { id: 'lineWidth', type: 'range', min: 0.01, max: 0.5, step: 0.01, label: 'Width', onChange: (v) => uniforms.uLineWidth.value = v },
            { id: 'color', type: 'color', label: 'Color', onChange: (v) => uniforms.uColor.value.set(v) }
        ],
        animate: (t) => {
            uniforms.uTime.value = t * config.speed;
            uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
            camera.position.set(0, 0, 100); camera.lookAt(0, 0, 0);
        }
    };
}


// ==========================================
// EXPERIMENT 6: DIPLOMA TUBE
// ==========================================
function initExp6() {
    const config = { speed: 1.5, color: '#daa520' };
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8); geometry.rotateX(Math.PI / 2); 
    const material = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x111111, specular: 0x444444, shininess: 30, side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(geometry, material, 8000);
    const group = new THREE.Group(); group.add(mesh); group.visible = false; scene.add(group);

    const dummy = new THREE.Object3D(); const tubeColor = new THREE.Color(config.color); const paperColor = new THREE.Color(0xffffff);
    const light = new THREE.PointLight(0xffffff, 1.5, 60); light.position.set(0, 10, 20); scene.add(light); light.visible = false;
    const rimLight = new THREE.SpotLight(0xffaa00, 3); rimLight.position.set(30, 20, 30); rimLight.lookAt(0,0,0); scene.add(rimLight); rimLight.visible = false;

    // PRE-CALCULATE POSITIONS
    const holderData = []; const paperData = [];
    let idx = 0; const maxCount=8000;
    for(let y=0; y<50; y++) {
        const ny = y/49; const py = (ny - 0.5) * 40;
        for(let s=0; s<30; s++) {
            if(idx >= maxCount) break;
            let r = 6; if (y < 5 || y > 45) r *= 1.2; 
            holderData.push({ u:(s/30)*Math.PI*2, v:ny, r, y:py }); idx++;
        }
    }
    let pIdx = idx;
    for(let y=0; y<35; y++) {
        const ny = y/34; const py = (ny - 0.5) * 35;
        for(let s=0; s<25; s++) {
             if(pIdx >= maxCount) break;
             paperData.push({ u:(s/25)*Math.PI*2, v:ny, r:3.5, y:py }); pIdx++;
        }
    }

    return {
        id: 'Exp6', group, config,
        settings: [
            { id: 'speed', type: 'range', min: 0.1, max: 5, step: 0.1, label: 'Rotation Speed' },
            { id: 'color', type: 'color', label: 'Gold Color', onChange: (v) => tubeColor.set(v) }
        ],
        animate: (t) => {
            light.visible = true; rimLight.visible = true;
            let i = 0; const time = t * config.speed;
            const progress = (time * 0.2) % 1.5; const slide = progress > 1 ? 1 : progress; const extrusion = slide * 25;

            holderData.forEach(d => {
                const angle = d.u + time * 0.5;
                const x = Math.cos(angle) * d.r; const z = Math.sin(angle) * d.r;
                dummy.position.set(x, d.y, z); dummy.lookAt(0, d.y, 0); dummy.rotateY(Math.PI/2);
                dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, tubeColor); i++;
            });
            paperData.forEach(d => {
                const angle = d.u + time * 0.2;
                const x = Math.cos(angle) * d.r; const z = Math.sin(angle) * d.r; const y = d.y + extrusion;
                dummy.position.set(x, y, z); dummy.lookAt(0, y, 0); dummy.scale.set(0.8, 0.8, 1);
                dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, paperColor); i++;
            });
            mesh.count = i; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
            group.rotation.z = Math.PI / 4; group.rotation.y = time * 0.2;
            camera.position.set(0, 0, 80); camera.lookAt(0, 0, 0);
        },
        reset: () => { light.visible = false; rimLight.visible = false; }
    };
}


// ==========================================
// EXPERIMENT 7: INK & WATER (DOMAIN WARPING)
// ==========================================
function initExp7() {
    const config = { speed: 0.5, inkColor: '#7c59f0', bgColor: '#000000', flowStrength: 1.0 };
    const group = new THREE.Group(); group.visible = false; scene.add(group);

    const uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uInkColor: { value: new THREE.Color(config.inkColor) },
        uBgColor: { value: new THREE.Color(config.bgColor) },
        uFlow: { value: config.flowStrength }
    };

    const fragmentShader = `
        uniform float uTime; uniform vec2 uResolution; uniform vec3 uInkColor; uniform vec3 uBgColor; uniform float uFlow;
        varying vec2 vUv;
        float random (in vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
        float noise (in vec2 st) {
            vec2 i = floor(st); vec2 f = fract(st);
            float a = random(i); float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        #define OCTAVES 6
        float fbm (in vec2 st) {
            float value = 0.0; float amplitude = .5;
            for (int i = 0; i < OCTAVES; i++) { value += amplitude * noise(st); st *= 2.; amplitude *= .5; }
            return value;
        }
        void main() {
            vec2 st = gl_FragCoord.xy / uResolution.xy; st.x *= uResolution.x / uResolution.y;
            vec2 q = vec2(0.); q.x = fbm( st + 0.00 * uTime); q.y = fbm( st + vec2(1.0));
            vec2 r = vec2(0.); r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*uTime ); r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*uTime);
            float f = fbm(st + r * uFlow);
            vec3 color = mix(uBgColor, uInkColor * 0.5, clamp((f*f)*4.0, 0.0, 1.0));
            color = mix(color, uInkColor, clamp(length(q), 0.0, 1.0));
            color = mix(color, vec3(1.0), clamp(length(r.x), 0.0, 1.0) * 0.1); 
            float vig = 1.0 - length(vUv - 0.5); color *= vig;
            gl_FragColor = vec4((f*f*f + 0.6 * f*f + 0.5*f) * color, 1.);
        }
    `;

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 1, 1), new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
        fragmentShader, uniforms, depthWrite: false
    }));
    group.add(mesh);

    return {
        id: 'Exp7', group, config,
        settings: [
            { id: 'speed', type: 'range', min: 0, max: 2, step: 0.1, label: 'Flow Speed' },
            { id: 'flowStrength', type: 'range', min: 0.1, max: 5, step: 0.1, label: 'Turbulence', onChange: (v) => uniforms.uFlow.value = v },
            { id: 'inkColor', type: 'color', label: 'Ink Color', onChange: (v) => uniforms.uInkColor.value.set(v) },
            { id: 'bgColor', type: 'color', label: 'Background', onChange: (v) => uniforms.uBgColor.value.set(v) }
        ],
        animate: (t) => {
            uniforms.uTime.value = t * config.speed;
            uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
            camera.position.set(0, 0, 1);
        }
    };
}


// --- INITIALIZATION ---
experiments['Exp1'] = initExp1();
experiments['Exp2'] = initExp2();
experiments['Exp3'] = initExp3();
experiments['Exp4'] = initExp4();
experiments['Exp5'] = initExp5(); 
experiments['Exp6'] = initExp6();
experiments['Exp7'] = initExp7();

// --- UI GENERATOR FUNCTIONS ---
function buildControls(expId) {
    const container = document.getElementById('control-panel-content');
    if(!container) return;
    container.innerHTML = ''; // Clear previous

    const exp = experiments[expId];
    if(!exp || !exp.settings) return;

    exp.settings.forEach(setting => {
        // Create Group
        const group = document.createElement('div');
        group.className = 'control-group';

        // Labels
        const labelRow = document.createElement('div');
        labelRow.className = 'control-label-row';
        const label = document.createElement('span');
        label.innerText = setting.label;
        const valDisplay = document.createElement('span');
        valDisplay.className = 'control-value';
        valDisplay.innerText = exp.config[setting.id];
        
        labelRow.appendChild(label);
        labelRow.appendChild(valDisplay);
        group.appendChild(labelRow);

        // Input
        const input = document.createElement('input');
        input.type = setting.type;
        
        if (setting.type === 'range') {
            input.min = setting.min;
            input.max = setting.max;
            input.step = setting.step || 0.1;
            input.value = exp.config[setting.id];
        } else if (setting.type === 'color') {
            input.value = exp.config[setting.id];
        }

        // Event Listener
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            // Update Config
            exp.config[setting.id] = val;
            // Update Display
            valDisplay.innerText = val;
            // Trigger Callback if exists (for uniforms etc)
            if (setting.onChange) setting.onChange(val);
        });

        group.appendChild(input);
        container.appendChild(group);
    });
}


function switchExperiment(id) {
    // 1. Scene Logic
    Object.values(experiments).forEach(e => { 
        e.group.visible=false; 
        if(e.reset)e.reset(); 
    });
    
    const act = experiments[id];
    if(act) {
        act.group.visible=true;
        
        // Reset Camera Defaults
        if(id==='Exp1') { camera.position.set(0,50,100); camera.lookAt(0,0,0); }
        else if(id==='Exp2') { camera.position.set(0,0,80); camera.lookAt(0,0,0); }
        else if(id==='Exp3') { camera.position.set(0,40,80); camera.lookAt(0,0,0); }
        else if(id==='Exp4') { camera.position.set(0,10,60); camera.lookAt(0,5,0); }
        else if(id==='Exp5') { camera.position.set(0,0,100); camera.lookAt(0,0,0); }
        else if(id==='Exp6') { camera.position.set(0,0,60); camera.lookAt(0,0,0); }
        else if(id==='Exp7') { camera.position.set(0,0,1); camera.lookAt(0,0,0); }
        
        // 2. Build UI Controls
        buildControls(id);
    }
    
    // 3. UI Logic (Dock & Text)
    document.querySelectorAll('.dock-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.id === id);
    });

    const titleEl = document.getElementById('exp-title');
    const descEl = document.getElementById('exp-desc');
    
    titleEl.style.opacity = 0;
    descEl.style.opacity = 0;
    
    setTimeout(() => {
        const meta = experimentData[id];
        titleEl.innerText = meta.title;
        descEl.innerText = meta.desc;
        titleEl.style.opacity = 1;
        descEl.style.opacity = 0.7;
    }, 300);
}

// --- BIND UI EVENTS ---
document.querySelectorAll('.dock-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target.closest('.dock-item');
        const id = target.dataset.id;
        state.activeExperimentId = id;
        switchExperiment(id);
    });
});

// Start with Experiment 7
switchExperiment('Exp7');

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();
const fpsCounter = document.getElementById('fps-counter');
let frameCount = 0;
let lastTime = 0;

function animate() {
    const time = clock.getElapsedTime();
    const active = experiments[state.activeExperimentId];
    if (active) active.animate(time);
    renderer.render(scene, camera);
    
    // Simple FPS Counter
    frameCount++;
    if(time - lastTime >= 1.0) {
        if(fpsCounter) fpsCounter.innerText = frameCount;
        frameCount = 0;
        lastTime = time;
    }

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();