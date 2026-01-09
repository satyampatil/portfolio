import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { scene } from './setup.js';
import { updateLoadProgress } from '../utils/loader.js'; // IMPORT LOADER UPDATE

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// Export state so main loop can access mixer/mesh
export const deskState = {
    model: null,
    mixer: null,
    bulbMesh: null
};

export function loadDeskModel(url, isHighQuality) {
    if (deskState.model) {
        scene.remove(deskState.model);
        deskState.model.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        deskState.model = null;
    }

    // Pass onProgress callback
    loader.load(url, function (gltf) {
        const model = gltf.scene;
        model.position.set(0, 0, 0); 
        model.scale.set(2, 2, 2);
        
        // FIX: Make visible immediately so user sees it loaded
        model.visible = true; 

        // Play Animation if it exists
        if (gltf.animations && gltf.animations.length > 0) {
            deskState.mixer = new THREE.AnimationMixer(model);
            const action = deskState.mixer.clipAction(gltf.animations[0]);
            action.play();
        }

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (!isHighQuality) {
                    if (!child.material.name.toLowerCase().match(/glass|bulb/)) {
                         child.material = new THREE.MeshStandardMaterial({ 
                             color: 0xcccccc, roughness: 0.5, metalness: 0.1 
                         });
                    }
                } else {
                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                        if (child.material.metalness > 0.1) {
                            child.material.metalness = 0.1; 
                            child.material.roughness = 0.6; 
                        }
                    }
                }

                const name = child.name.toLowerCase();
                if (name.match(/bulb|glass|sphere|light/)) {
                    deskState.bulbMesh = child; 
                    child.material = child.material.clone();
                    child.material.side = THREE.DoubleSide; 
                    child.material.emissive = new THREE.Color(0x0088ff);
                    child.material.emissiveIntensity = 0;
                    child.material.transparent = true;
                    child.material.opacity = 0.9;
                }
            }
        });

        deskState.model = model;
        scene.add(deskState.model);
        
        console.log("Desk Loaded.");
        window.dispatchEvent(new Event('desk-loaded'));
        
        // Mark Complete (Force 100% when done)
        updateLoadProgress(1);

    }, function (xhr) {
        // ON PROGRESS UPDATE
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total;
            updateLoadProgress(percentComplete);
        }
    }, function (error) {
        console.error("Error loading model:", error);
    });
}