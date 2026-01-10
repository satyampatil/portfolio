import * as THREE from 'three';

export function initInkBackground(scene) {
    const config = {
        speed: 0.6,
        flowStrength: 10,
        inkColor: new THREE.Color('#7c59f0'), 
        bgColor: new THREE.Color('#000000')
    };

    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);

    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uInkColor;
        uniform vec3 uBgColor;
        uniform float uFlow;
        uniform float uScrollY; 
        
        uniform vec4 uMask; 

        varying vec2 vUv;

        // FBM & NOISE FUNCTIONS
        float random (in vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        float noise (in vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);

            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));

            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(a, b, u.x) +
                    (c - a)* u.y * (1.0 - u.x) +
                    (d - b) * u.x * u.y;
        }

        #define OCTAVES 6
        float fbm (in vec2 st) {
            float value = 0.0;
            float amplitude = .5;
            float frequency = 0.;
            for (int i = 0; i < OCTAVES; i++) {
                value += amplitude * noise(st);
                st *= 2.;
                amplitude *= .5;
            }
            return value;
        }

        void main() {
            vec2 screenUV = gl_FragCoord.xy / uResolution.xy;
            
            // --- MASK LOGIC (Screen Space Fixed) ---
            // The mask coordinates come from the DOM element.
            // We apply a soft edge.
            
            float inMask = 0.0;
            float softness = 0.05; // Increased softness for premium feel
            
            float left = smoothstep(uMask.x, uMask.x + softness, screenUV.x);
            float right = 1.0 - smoothstep(uMask.x + uMask.z - softness, uMask.x + uMask.z, screenUV.x);
            float bottom = smoothstep(uMask.y, uMask.y + softness, screenUV.y);
            float top = 1.0 - smoothstep(uMask.y + uMask.w - softness, uMask.y + uMask.w, screenUV.y);
            
            inMask = left * right * bottom * top;

            // REMOVED: if (inMask < 0.01) discard; 
            // We want the soft falloff to render, avoiding hard jagged edges.

            // --- INK LOGIC (World Space) ---
            
            vec2 st = screenUV;
            st.x *= uResolution.x / uResolution.y; // Correct Aspect Ratio
            
            // Sync noise with scroll position so it feels attached to the content
            st.y += uScrollY; 

            vec2 q = vec2(0.);
            q.x = fbm( st + 0.00 * uTime);
            q.y = fbm( st + vec2(1.0));

            vec2 r = vec2(0.);
            r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*uTime );
            r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*uTime);

            float f = fbm(st + r * uFlow);

            vec3 color = mix(uBgColor, uInkColor * 0.5, clamp((f*f)*4.0, 0.0, 1.0));
            color = mix(color, uInkColor, clamp(length(q), 0.0, 1.0));
            color = mix(color, vec3(1.0), clamp(length(r.x), 0.0, 1.0) * 0.1); 

            // Apply Mask Alpha
            gl_FragColor = vec4(color, inMask * 0.9); 
        }
    `;

    const uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uInkColor: { value: config.inkColor },
        uBgColor: { value: config.bgColor },
        uFlow: { value: config.flowStrength },
        uScrollY: { value: 0 }, 
        uMask: { value: new THREE.Vector4(0, 0, 0, 0) } 
    };

    const material = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, uniforms,
        depthWrite: false,
        transparent: true 
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -100; 
    mesh.frustumCulled = false;
    scene.add(mesh);

    return {
        mesh,
        uniforms,
        update: (time) => {
            uniforms.uTime.value = time * config.speed;
        },
        updateScroll: (scrollY) => {
            // Use precise float scroll / height
            uniforms.uScrollY.value = scrollY / window.innerHeight;
        },
        resize: (w, h) => {
            uniforms.uResolution.value.set(w, h);
        },
        // We now expect interpolated values here
        updateMaskDirect: (x, y, w, h, screenH) => {
            const normX = x / window.innerWidth;
            const normW = w / window.innerWidth;
            const normY = (screenH - (y + h)) / screenH;
            const normH = h / screenH;
            uniforms.uMask.value.set(normX, normY, normW, normH);
        }
    };
}