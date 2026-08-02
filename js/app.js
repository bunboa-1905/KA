/**
 * KA SURVIVAL - MODULAR GAME ENGINE & ARCHITECTURE
 * Features: Server Lobby Screen (Step 1: Login, Step 2: Room Lobby, Step 3: 3D World), Public WebSocket Relay
 * Engine: Three.js
 */

window.KASurvival = window.KASurvival || {};

// ===================================================
// 1. CORE EVENT BUS
// ===================================================
class EventBus {
    constructor() {
        this.listeners = {};
    }
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(cb => cb(data));
    }
}
KASurvival.globalEventBus = new EventBus();

// ===================================================
// 2. GAME STATE MANAGER
// ===================================================
KASurvival.GAME_STATES = {
    LOGIN: 'LOGIN',
    LOBBY: 'LOBBY',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

class GameStateManager {
    constructor() {
        this.currentState = KASurvival.GAME_STATES.LOGIN;
    }
    setState(newState) {
        this.currentState = newState;
    }
    getState() {
        return this.currentState;
    }
    isPlaying() {
        return this.currentState === KASurvival.GAME_STATES.PLAYING;
    }
}
KASurvival.gameStateManager = new GameStateManager();

// ===================================================
// 3. INPUT MANAGER
// ===================================================
class InputManager {
    constructor() {
        this.keysPressed = {};
        this.joystickVector = { x: 0, y: 0, active: false };
        this.touchRunActive = false;

        this.cameraYaw = Math.PI / 4;
        this.cameraPitch = Math.PI / 4; // Isometric higher angle
        this.cameraDistance = 18;

        this.isMouseDown = false;
        this.previousMousePosition = { x: 0, y: 0 };

        this.setupKeyboardListeners();
        this.setupMouseListeners();
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            this.keysPressed[e.key.toLowerCase()] = true;
            this.keysPressed[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keysPressed[e.key.toLowerCase()] = false;
            this.keysPressed[e.code] = false;
        });
    }

    setupMouseListeners() {
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isMouseDown = true;
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        window.addEventListener('mouseup', () => { this.isMouseDown = false; });
        window.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown) return;
            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;

            this.cameraYaw -= deltaX * 0.007;
            this.cameraPitch += deltaY * 0.007;
            this.cameraPitch = Math.max(0.1, Math.min(Math.PI / 2.2, this.cameraPitch));

            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('wheel', (e) => {
            this.cameraDistance += e.deltaY * 0.01;
            this.cameraDistance = Math.max(5, Math.min(30, this.cameraDistance));
        });
    }

    setJoystickVector(x, y, active) {
        this.joystickVector.x = x;
        this.joystickVector.y = y;
        this.joystickVector.active = active;
    }

    toggleTouchRun(state) {
        this.touchRunActive = state;
    }

    getMovementVector() {
        let moveX = 0;
        let moveZ = 0;

        if (this.keysPressed['w'] || this.keysPressed['arrowup']) moveZ -= 1;
        if (this.keysPressed['s'] || this.keysPressed['arrowdown']) moveZ += 1;
        if (this.keysPressed['a'] || this.keysPressed['arrowleft']) moveX -= 1;
        if (this.keysPressed['d'] || this.keysPressed['arrowright']) moveX += 1;

        if (this.joystickVector.active) {
            moveX = this.joystickVector.x;
            moveZ = this.joystickVector.y;
        }

        const isRunning = !!(this.keysPressed['shift'] || this.keysPressed['shiftleft'] || this.touchRunActive);
        const isJumping = !!(this.keysPressed[' ']);
        return { moveX, moveZ, isRunning, isJumping };
    }
}
KASurvival.InputManager = InputManager;

// ===================================================
// 4. AUDIO MANAGER
// ===================================================
class AudioManager {
    constructor() {
        this.ctx = null;
    }
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
    }
    playChopSound() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
}
KASurvival.audioManager = new AudioManager();

// ===================================================
// 5. THREE.JS ENGINE
// ===================================================
class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();

        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.setupLights();
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0xfff0f5, 0.65));

        this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
        this.sunLight.position.set(40, 60, 30);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.bias = -0.0003;
        this.scene.add(this.sunLight);

        this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3d6e3d, 0.45));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
KASurvival.Engine = Engine;

// ===================================================
// 6. DATA LAYER
// ===================================================
KASurvival.ITEMS = {
    WOOD: { id: 'wood', name: 'Wood', icon: '🪵', stackable: true },
    STONE: { id: 'stone', name: 'Stone', icon: '🪨', stackable: true },
    BERRY: { id: 'berry', name: 'Berry', icon: '🫐', stackable: true },
    AXE: { id: 'axe', name: 'Wood Axe', icon: '🪓', stackable: false }
};

KASurvival.WORLD_CONFIG = {
    mapSize: 200,
    treeCount: 45,
    rockCount: 25,
    flowerCount: 80,
    safeZoneRadius: 8,
    spawnPosition: { x: 0, y: 0, z: 0 },
    campfirePosition: { x: 3, y: 0, z: 3 }
};

class PlayerData {
    constructor() {
        this.playerUniqueId = this.loadOrGenerateUniqueId();
        this.playerName = localStorage.getItem('ka_player_name') || '';

        this.stats = { health: 100, maxHealth: 100, hunger: 100, maxHunger: 100 };
        this.inventory = [
            { item: 'wood', count: 10 },
            { item: 'stone', count: 5 },
            { item: 'berry', count: 4 },
            null, null, null
        ];
        this.equippedSlotIndex = 0;
    }

    loadOrGenerateUniqueId() {
        let savedId = localStorage.getItem('ka_player_id');
        if (!savedId) {
            savedId = 'ka-' + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('ka_player_id', savedId);
        }
        return savedId;
    }

    setPlayerName(name) {
        this.playerName = name || 'Player';
        localStorage.setItem('ka_player_name', this.playerName);
    }
}
KASurvival.PlayerData = PlayerData;

// ===================================================
// 7. HELPER: TEXT SPRITE GENERATOR FOR NAME TAGS
// ===================================================
function createNameTagSprite(text, colorHex = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 236, 44, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillStyle = colorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3, 0.75, 1);
    return sprite;
}

// ===================================================
// 8b. HELPER: CANVAS FACE TEXTURE (Anime Style)
// ===================================================
function buildFaceTexture() {
    const S = 256;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const c = canvas.getContext('2d');

    // Skin base
    c.fillStyle = '#faf0f0';
    c.fillRect(0, 0, S, S);

    // Draw one anime eye
    function drawEye(cx, cy, tilt) {
        c.save();
        c.translate(cx, cy);
        c.rotate(tilt);

        // Clip to eye shape
        c.beginPath();
        c.moveTo(-34, 0);
        c.bezierCurveTo(-34, -26, 34, -26, 34, 0);
        c.bezierCurveTo(34, 20, -34, 20, -34, 0);
        c.closePath();
        c.save();
        c.clip();

        // White of eye
        c.fillStyle = '#f2eeff';
        c.fillRect(-36, -28, 72, 52);

        // Iris gradient
        const irisGrad = c.createRadialGradient(0, 2, 2, 0, 4, 22);
        irisGrad.addColorStop(0,   '#4a2060');
        irisGrad.addColorStop(0.3, '#2a1040');
        irisGrad.addColorStop(0.7, '#150820');
        irisGrad.addColorStop(1,   '#090410');
        c.fillStyle = irisGrad;
        c.beginPath();
        c.ellipse(0, 4, 20, 24, 0, 0, Math.PI * 2);
        c.fill();

        // Pupil
        c.fillStyle = '#050110';
        c.beginPath();
        c.ellipse(0, 6, 9, 12, 0, 0, Math.PI * 2);
        c.fill();

        // Main highlight (top-right)
        c.fillStyle = 'rgba(255,255,255,0.95)';
        c.beginPath();
        c.ellipse(9, -7, 9, 11, -0.4, 0, Math.PI * 2);
        c.fill();

        // Secondary small highlight (bottom-left)
        c.fillStyle = 'rgba(255,255,255,0.65)';
        c.beginPath();
        c.ellipse(-8, 12, 5, 5, 0, 0, Math.PI * 2);
        c.fill();

        c.restore(); // restore clip

        // Top eyelash (thick arc)
        c.strokeStyle = '#0d0408';
        c.lineWidth = 7;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-36, -4);
        c.bezierCurveTo(-24, -30, 24, -30, 36, -4);
        c.stroke();

        // Eyelash spikes
        c.lineWidth = 3.5;
        const spikes = [[-30,-20,-42,-34],[-18,-28,-24,-42],[0,-30,0,-44],[18,-28,24,-42],[30,-20,42,-34]];
        spikes.forEach(([x1,y1,x2,y2]) => {
            c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
        });

        // Bottom lash line (thin)
        c.strokeStyle = 'rgba(13,4,8,0.35)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-33, 18);
        c.bezierCurveTo(-16, 24, 16, 24, 33, 18);
        c.stroke();

        c.restore();
    }

    // Left eye (outer corner slightly lower = droopy/sleepy)
    drawEye(74, 105, -0.18);
    // Right eye (mirrored tilt)
    drawEye(182, 105, 0.18);

    // Blush - soft radial gradient with dots
    function drawBlush(bx, by) {
        const bg = c.createRadialGradient(bx, by, 0, bx, by, 40);
        bg.addColorStop(0,   'rgba(255,130,165,0.60)');
        bg.addColorStop(0.45,'rgba(255,160,190,0.38)');
        bg.addColorStop(1,   'rgba(255,190,215,0.00)');
        c.fillStyle = bg;
        c.beginPath();
        c.ellipse(bx, by, 40, 26, 0, 0, Math.PI * 2);
        c.fill();
        // Small polka dots
        c.fillStyle = 'rgba(235,90,145,0.45)';
        for (let i = 0; i < 5; i++) {
            c.beginPath();
            c.arc(bx - 18 + i * 9, by + 5, 2.8, 0, Math.PI * 2);
            c.fill();
        }
    }
    drawBlush(50, 178);
    drawBlush(206, 178);

    // Cute small mouth
    c.strokeStyle = '#d07878';
    c.lineWidth = 3.5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(102, 204);
    c.quadraticCurveTo(128, 220, 154, 204);
    c.stroke();

    // Tiny nose hint
    c.strokeStyle = 'rgba(180,120,120,0.4)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(122, 172); c.lineTo(118, 184); c.lineTo(126, 184);
    c.stroke();

    return new THREE.CanvasTexture(canvas);
}

// ===================================================
// 8. MODEL MANAGER (GLTF/GLB)
// ===================================================
KASurvival.ModelManager = class {
    constructor() {
        this.models = {};
    }
    loadModel(url, key, callback) {
        if (this.models[key]) {
            callback(this.models[key]);
            return;
        }
        const loader = new THREE.GLTFLoader();
        loader.load(url, (gltf) => {
            this.models[key] = gltf;
            console.log(`Loaded model: ${key}`, gltf.animations.map(a => a.name));
            callback(gltf);
        }, undefined, (error) => {
            console.error('Error loading model:', error);
        });
    }
    getClone(key) {
        if (!this.models[key]) return null;
        // Require THREE.SkeletonUtils to clone SkinnedMesh correctly
        return THREE.SkeletonUtils.clone(this.models[key].scene);
    }
    getAnimations(key) {
        if (!this.models[key]) return [];
        return this.models[key].animations;
    }
};
KASurvival.modelManager = new KASurvival.ModelManager();

// ===================================================
// 9. LOCAL PLAYER ENTITY (With Floating Name Tag)
// ===================================================
class Player {
    constructor(scene, name = "Player") {
        this.scene = scene;
        this.name = name;

        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.targetRotation = 0;

        this.walkSpeed = 6.5;
        this.runSpeed = 12.0;
        this.currentSpeed = 0;
        this.isMoving = false;
        this.isRunning = false;
        this.walkTimer = 0;

        this.mixer = null;
        this.animations = {};
        this.currentAction = null;

        this.mesh = new THREE.Group();
        this.playerBody = new THREE.Group();
        this.mesh.add(this.playerBody);

        this.buildMesh();

        this.nameTag = createNameTagSprite(this.name, '#38bdf8');
        this.nameTag.position.set(0, 2.6, 0);
        this.mesh.add(this.nameTag);

        this.scene.add(this.mesh);
    }

    setName(newName) {
        this.name = newName;
        if (this.nameTag) this.mesh.remove(this.nameTag);
        this.nameTag = createNameTagSprite(this.name, '#38bdf8');
        this.nameTag.position.set(0, 2.6, 0);
        this.mesh.add(this.nameTag);
    }

    buildMesh() {
        const gender = this.gender || 'female';
        const modelPath = gender === 'male' ? 'models/RPG_Pack/Characters/glTF/Character_Male_1.gltf' : 'models/RPG_Pack/Characters/glTF/Character_Female_1.gltf';
        const cacheKey = 'player_' + gender;

        // Load the GLTF model
        KASurvival.modelManager.loadModel(modelPath, cacheKey, (gltf) => {
            const clone = KASurvival.modelManager.getClone(cacheKey);
            if (clone) {
                clone.scale.set(1.5, 1.5, 1.5); 
                clone.position.y = 0;
                
                // Fix shadows
                clone.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Clear old meshes INSIDE the callback to prevent duplicating if called multiple times fast
                while(this.playerBody.children.length > 0) { 
                    this.playerBody.remove(this.playerBody.children[0]); 
                }

                this.playerBody.add(clone);

                // Set up animations
                this.mixer = new THREE.AnimationMixer(clone);
                const anims = KASurvival.modelManager.getAnimations(cacheKey);
                this.animations = {};
                anims.forEach((clip) => {
                    this.animations[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
                });
                
                this.playAnimation('idle');
            }
        });
    }

    playAnimation(namePart) {
        if (!this.mixer) return;
        let key = Object.keys(this.animations).find(k => k.includes(namePart.toLowerCase()));
        
        // Fallback system: if requested animation doesn't exist
        if (!key) {
            if (namePart === 'idle') {
                // If no idle, fade out to standing pose (A-pose)
                if (this.currentAction) {
                    this.currentAction.fadeOut(0.3);
                    this.currentAction = null;
                }
                return;
            } else {
                // If missing walk/run, play the first available animation
                key = Object.keys(this.animations)[0];
            }
        }
        
        if (!key) return; // No animations at all
        
        const action = this.animations[key];
        if (this.currentAction === action) return;
        
        if (this.currentAction) {
            this.currentAction.fadeOut(0.2);
        }
        action.reset().fadeIn(0.2).play();
        this.currentAction = action;
    }

    update(deltaTime, inputVector, cameraYaw) {
        if (this.mixer) this.mixer.update(deltaTime);

        const { moveX, moveZ, isRunning, isJumping } = inputVector;
        this.isRunning = isRunning;

        const inputLength = Math.hypot(moveX, moveZ);
        this.isMoving = inputLength > 0.08;

        if (isJumping && this.position.y <= 0) {
            this.velocityY = 10;
        }

        if (this.position.y > 0 || this.velocityY > 0) {
            if (this.velocityY === undefined) this.velocityY = 0;
            this.velocityY -= 30 * deltaTime; // Gravity
            this.position.y += this.velocityY * deltaTime;
            if (this.position.y <= 0) {
                this.position.y = 0;
                this.velocityY = 0;
            }
        }

        if (this.isMoving) {
            const normX = moveX / Math.max(1, inputLength);
            const normZ = moveZ / Math.max(1, inputLength);

            const sinYaw = Math.sin(cameraYaw);
            const cosYaw = Math.cos(cameraYaw);
            const worldMoveX = normX * cosYaw + normZ * sinYaw;
            const worldMoveZ = -normX * sinYaw + normZ * cosYaw;

            const baseSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;
            this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, baseSpeed, deltaTime * 10);

            this.position.x += worldMoveX * this.currentSpeed * deltaTime;
            this.position.z += worldMoveZ * this.currentSpeed * deltaTime;

            this.targetRotation = Math.atan2(worldMoveX, worldMoveZ);
            let diff = this.targetRotation - this.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.rotation += diff * Math.min(1.0, deltaTime * 14);

            if (this.position.y > 0) {
                this.playAnimation('jump');
            } else {
                this.playAnimation(this.isRunning ? 'run' : 'walk');
            }
        } else {
            this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, 0, deltaTime * 12);
            if (this.position.y > 0) {
                this.playAnimation('jump');
            } else {
                this.playAnimation('idle');
            }
        }

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
    }
}
KASurvival.Player = Player;

// ===================================================
// 9. REMOTE PLAYER (With Floating Name Tag)
// ===================================================
class RemotePlayer {
    constructor(scene, name = "Remote") {
        this.scene = scene;
        this.name = name;
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        
        this.isMoving = false;
        this.isRunning = false;

        this.mixer = null;
        this.animations = {};
        this.currentAction = null;

        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.targetRotation = 0;

        this.mesh = new THREE.Group();
        this.playerBody = new THREE.Group();
        this.mesh.add(this.playerBody);

        this.buildMesh();

        this.nameTag = createNameTagSprite(this.name, '#34d399');
        this.nameTag.position.set(0, 2.6, 0);
        this.mesh.add(this.nameTag);

        this.scene.add(this.mesh);
    }

    setName(newName) {
        if (!newName || newName === this.name) return;
        this.name = newName;
        if (this.nameTag) this.mesh.remove(this.nameTag);
        this.nameTag = createNameTagSprite(this.name, '#34d399');
        this.nameTag.position.set(0, 2.6, 0);
        this.mesh.add(this.nameTag);
    }

    buildMesh() {
        const gender = this.gender || 'female';
        const modelPath = gender === 'male' ? 'models/RPG_Pack/Characters/glTF/Character_Male_1.gltf' : 'models/RPG_Pack/Characters/glTF/Character_Female_1.gltf';
        const cacheKey = 'player_' + gender;

        KASurvival.modelManager.loadModel(modelPath, cacheKey, (gltf) => {
            const clone = KASurvival.modelManager.getClone(cacheKey);
            if (clone) {
                clone.scale.set(1.5, 1.5, 1.5); 
                clone.position.y = 0;
                
                clone.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                while(this.playerBody.children.length > 0) { 
                    this.playerBody.remove(this.playerBody.children[0]); 
                }

                this.playerBody.add(clone);

                this.mixer = new THREE.AnimationMixer(clone);
                const anims = KASurvival.modelManager.getAnimations(cacheKey);
                this.animations = {};
                anims.forEach((clip) => {
                    this.animations[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
                });
                
                this.playAnimation('idle');
            }
        });
    }

    playAnimation(namePart) {
        if (!this.mixer) return;
        let key = Object.keys(this.animations).find(k => k.includes(namePart.toLowerCase()));
        
        if (!key) {
            if (namePart === 'idle') {
                if (this.currentAction) {
                    this.currentAction.fadeOut(0.3);
                    this.currentAction = null;
                }
                return;
            } else {
                key = Object.keys(this.animations)[0];
            }
        }
        
        if (!key) return;
        
        const action = this.animations[key];
        if (this.currentAction === action) return;
        
        if (this.currentAction) {
            this.currentAction.fadeOut(0.2);
        }
        action.reset().fadeIn(0.2).play();
        this.currentAction = action;
    }

    updateNetworkState(data) {
        if (data.x !== undefined && data.z !== undefined) {
            this.targetPosition.set(data.x, data.y || 0, data.z);
        }
        if (data.rotation !== undefined) {
            this.targetRotation = data.rotation;
        }
        if (data.name) {
            this.setName(data.name);
        }
    }

    update(deltaTime) {
        // Animation
        const distanceToTarget = this.position.distanceTo(this.targetPosition);
        if (distanceToTarget > 0.05) {
            const time = Date.now() * 0.012; // Fast run anim
            if (this.leftLeg) this.leftLeg.rotation.x = Math.sin(time) * 0.6;
            if (this.rightLeg) this.rightLeg.rotation.x = -Math.sin(time) * 0.6;
            if (this.leftArm) this.leftArm.rotation.x = -Math.sin(time) * 0.6;
            if (this.rightArm) this.rightArm.rotation.x = Math.sin(time) * 0.6;
            if (this.headMesh) this.headMesh.rotation.y = Math.sin(time * 0.5) * 0.1;
            if (this.skirt) {
                this.skirt.rotation.x = Math.sin(time) * 0.15;
                this.skirt.rotation.z = Math.cos(time) * 0.1;
            }
            
            // Bouncing
            this.playerBody.position.y = Math.abs(Math.sin(time * 2)) * 0.15;
        } else {
            // Idle
            if (this.leftLeg) this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, deltaTime * 10);
            if (this.rightLeg) this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, deltaTime * 10);
            if (this.leftArm) this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, deltaTime * 10);
            if (this.rightArm) this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, deltaTime * 10);
            if (this.headMesh) this.headMesh.rotation.y = THREE.MathUtils.lerp(this.headMesh.rotation.y, 0, deltaTime * 10);
            this.playerBody.position.y = THREE.MathUtils.lerp(this.playerBody.position.y, 0, deltaTime * 10);
        }

        this.position.lerp(this.targetPosition, deltaTime * 12);
        this.rotation = THREE.MathUtils.lerp(this.rotation, this.targetRotation, deltaTime * 12);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
KASurvival.RemotePlayer = RemotePlayer;

// ===================================================
// 10. ENVIRONMENT ENTITY
// ===================================================
class Environment {
    constructor(scene) {
        this.scene = scene;
        this.propsGroup = new THREE.Group();
        this.scene.add(this.propsGroup);

        this.buildTerrain();
        this.buildForestAndRocks();
        this.buildCampfire();
    }

    buildTerrain() {
        const gridSize = 20;
        const blockSize = 2; // Assuming the block is 2x2 units
        const offset = (gridSize * blockSize) / 2;

        KASurvival.modelManager.loadModel('models/RPG_Pack/Blocks/glTF/Block_Grass.gltf', 'block_grass', (gltf) => {
            for (let x = 0; x < gridSize; x++) {
                for (let z = 0; z < gridSize; z++) {
                    const block = KASurvival.modelManager.getClone('block_grass');
                    if (block) {
                        block.position.set(x * blockSize - offset, -1.0, z * blockSize - offset);
                        // Scale slightly to ensure they tile perfectly if needed, or leave at 1
                        block.scale.set(1.0, 1.0, 1.0);
                        
                        block.traverse((child) => {
                            if (child.isMesh) {
                                child.receiveShadow = true;
                                child.castShadow = true;
                            }
                        });
                        this.scene.add(block);
                    }
                }
            }
        });
        
        // Add invisible walls to prevent falling off the 20x20 island
        const wallGeo = new THREE.BoxGeometry(gridSize * blockSize, 10, 1);
        const wallMat = new THREE.MeshBasicMaterial({ visible: false });
        
        const wallN = new THREE.Mesh(wallGeo, wallMat); wallN.position.set(0, 5, -offset - 0.5); this.scene.add(wallN);
        const wallS = new THREE.Mesh(wallGeo, wallMat); wallS.position.set(0, 5, offset + 0.5); this.scene.add(wallS);
        const wallE = new THREE.Mesh(new THREE.BoxGeometry(1, 10, gridSize * blockSize), wallMat); wallE.position.set(offset + 0.5, 5, 0); this.scene.add(wallE);
        const wallW = new THREE.Mesh(new THREE.BoxGeometry(1, 10, gridSize * blockSize), wallMat); wallW.position.set(-offset - 0.5, 5, 0); this.scene.add(wallW);
    }

    buildForestAndRocks() {
        // Hàm tạo số ngẫu nhiên cố định (Seeded Random) để đảm bảo 2 máy mọc cây ở vị trí Y HỆT NHAU
        let seed = 12345;
        const seededRandom = () => {
            let x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        const islandRadius = 18; // Smaller than the 20x20 map offset

        KASurvival.modelManager.loadModel('models/RPG_Pack/Environment/glTF/Tree_1.gltf', 'env_tree1', (gltf) => {
            for (let i = 0; i < 20; i++) {
                let x = (seededRandom() - 0.5) * islandRadius * 2;
                let z = (seededRandom() - 0.5) * islandRadius * 2;
                if (Math.hypot(x, z) < KASurvival.WORLD_CONFIG.safeZoneRadius) continue;
                
                const tree = KASurvival.modelManager.getClone('env_tree1');
                if (tree) {
                    tree.position.set(x, 0, z); // 0 to be on top of grass block which is shifted to -1
                    const s = 1.0 + seededRandom() * 0.5;
                    tree.scale.set(s, s, s);
                    tree.rotation.y = seededRandom() * Math.PI * 2;
                    tree.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }});
                    this.propsGroup.add(tree);
                }
            }
        });
        
        KASurvival.modelManager.loadModel('models/RPG_Pack/Environment/glTF/Tree_2.gltf', 'env_tree2', (gltf) => {
            for (let i = 0; i < 15; i++) {
                let x = (seededRandom() - 0.5) * islandRadius * 2;
                let z = (seededRandom() - 0.5) * islandRadius * 2;
                if (Math.hypot(x, z) < KASurvival.WORLD_CONFIG.safeZoneRadius) continue;
                
                const tree = KASurvival.modelManager.getClone('env_tree2');
                if (tree) {
                    tree.position.set(x, 0, z);
                    const s = 1.0 + seededRandom() * 0.5;
                    tree.scale.set(s, s, s);
                    tree.rotation.y = seededRandom() * Math.PI * 2;
                    tree.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }});
                    this.propsGroup.add(tree);
                }
            }
        });
    }

    buildCampfire() {
        const fireGroup = new THREE.Group();
        fireGroup.position.set(KASurvival.WORLD_CONFIG.campfirePosition.x, 0, KASurvival.WORLD_CONFIG.campfirePosition.z);

        const logMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, flatShading: true });
        for (let i = 0; i < 4; i++) {
            const log = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.2), logMat);
            log.rotation.y = (i * Math.PI) / 2;
            log.position.y = 0.15;
            log.castShadow = true;
            fireGroup.add(log);
        }

        const flame = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.8, 0.5),
            new THREE.MeshBasicMaterial({ color: 0xff5722 })
        );
        flame.position.y = 0.55;
        fireGroup.add(flame);

        const fireLight = new THREE.PointLight(0xff7d00, 2.5, 12);
        fireLight.position.y = 1.0;
        fireGroup.add(fireLight);

        this.propsGroup.add(fireGroup);
    }
}
KASurvival.Environment = Environment;

// ===================================================
// 10.5. SKY & PARTICLE SYSTEMS (Graphics Overhaul)
// ===================================================
class SkySystem {
    constructor(scene) {
        this.scene = scene;
        this.stars = null;
        this.clouds = [];
        this.buildStars();
        this.buildClouds();
    }
    buildStars() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 1000;
        const posArray = new Float32Array(starCount * 3);
        for(let i = 0; i < starCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 400;
            posArray[i+1] = 50 + Math.random() * 100; // Y
            posArray[i+2] = (Math.random() - 0.5) * 400;
            i += 2;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const starMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.8, transparent: true, opacity: 0});
        this.stars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.stars);
    }
    buildClouds() {
        const cloudMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.8});
        for (let i = 0; i < 15; i++) {
            const size = 6 + Math.random() * 8;
            const cloud = new THREE.Mesh(new THREE.BoxGeometry(size, size*0.3, size*0.8), cloudMat);
            cloud.position.set((Math.random() - 0.5) * 150, 35 + Math.random() * 10, (Math.random() - 0.5) * 150);
            this.clouds.push(cloud);
            this.scene.add(cloud);
        }
    }
    update(deltaTime, isNight) {
        if (this.stars) {
            const targetOpacity = isNight ? 1.0 : 0;
            this.stars.material.opacity = THREE.MathUtils.lerp(this.stars.material.opacity, targetOpacity, deltaTime * 2);
            this.stars.rotation.y += deltaTime * 0.005;
        }
        this.clouds.forEach(c => {
            c.position.x += deltaTime * 1.5;
            if (c.position.x > 150) c.position.x = -150;
            const targetOpacity = isNight ? 0.2 : 0.8;
            c.material.opacity = THREE.MathUtils.lerp(c.material.opacity, targetOpacity, deltaTime * 2);
        });
    }
}
KASurvival.SkySystem = SkySystem;

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        this.sparkMat = new THREE.MeshBasicMaterial({color: 0xffeb3b});
        this.fireflyMat = new THREE.MeshBasicMaterial({color: 0xccff00, transparent: true, opacity: 0.9});
        this.heartMat = new THREE.MeshBasicMaterial({color: 0xffb6c1, transparent: true, opacity: 0.8});
    }
    spawnSpark(x, y, z) {
        const p = new THREE.Mesh(this.sparkGeo, this.sparkMat);
        p.position.set(x + (Math.random()-0.5)*0.4, y, z + (Math.random()-0.5)*0.4);
        p.userData = { life: 1.0, vx: (Math.random()-0.5)*0.5, vy: 1.5 + Math.random(), vz: (Math.random()-0.5)*0.5, type: 'spark' };
        this.scene.add(p);
        this.particles.push(p);
    }
    spawnFirefly(x, y, z) {
        const p = new THREE.Mesh(this.sparkGeo, this.fireflyMat);
        p.position.set(x + (Math.random()-0.5)*20, y + Math.random()*2, z + (Math.random()-0.5)*20);
        p.userData = { life: 3.0 + Math.random()*2, origin: p.position.clone(), time: Math.random()*100, type: 'firefly' };
        this.scene.add(p);
        this.particles.push(p);
    }
    spawnHeart(x, y, z) {
        const p = new THREE.Mesh(this.sparkGeo, this.heartMat);
        p.position.set(x + (Math.random()-0.5)*2, y + Math.random()*2, z + (Math.random()-0.5)*2);
        p.userData = { life: 2.0 + Math.random(), vy: 0.5 + Math.random()*0.5, time: Math.random()*10, type: 'heart', originX: p.position.x };
        this.scene.add(p);
        this.particles.push(p);
    }
    update(deltaTime, isNight, playerPos) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.userData.type === 'spark') {
                p.position.x += p.userData.vx * deltaTime;
                p.position.y += p.userData.vy * deltaTime;
                p.position.z += p.userData.vz * deltaTime;
                p.scale.multiplyScalar(0.95);
                p.userData.life -= deltaTime;
            } else if (p.userData.type === 'firefly') {
                p.userData.time += deltaTime * 2;
                p.position.y = p.userData.origin.y + Math.sin(p.userData.time) * 0.5;
                p.position.x = p.userData.origin.x + Math.cos(p.userData.time * 0.8) * 0.5;
                p.userData.life -= deltaTime;
            } else if (p.userData.type === 'heart') {
                p.position.y += p.userData.vy * deltaTime;
                p.userData.time += deltaTime * 5;
                p.position.x = p.userData.originX + Math.sin(p.userData.time) * 0.2;
                p.material.opacity = p.userData.life / 2.0;
                p.userData.life -= deltaTime;
            }
            if (p.userData.life <= 0 || (!isNight && p.userData.type === 'firefly')) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }
        
        // Spawn logic
        if (Math.random() < 0.3) {
            this.spawnSpark(KASurvival.WORLD_CONFIG.campfirePosition.x, 0.5, KASurvival.WORLD_CONFIG.campfirePosition.z);
        }
        if (isNight && Math.random() < 0.1 && this.particles.length < 100) {
            this.spawnFirefly(playerPos.x, 1, playerPos.z); 
        }
        if (Math.random() < 0.05 && this.particles.length < 150) {
            this.spawnHeart(playerPos.x, playerPos.y, playerPos.z);
        }
    }
}
KASurvival.ParticleSystem = ParticleSystem;

// ===================================================
// 11. NETWORK MANAGER (Public WebSocket Realtime Relay)
// ===================================================
class NetworkManager {
    constructor(playerData) {
        this.playerData = playerData;
        this.isConnected = false;
        this.isOnlineRef = null;
    }

    checkPlayerExists(playerName) {
        // Obsolete function since we use localStorage IDs now. Just return false.
        return Promise.resolve(false);
    }

    connectToWorld(playerName) {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.error("Firebase chưa được cấu hình. Vui lòng cập nhật firebaseConfig trong index.html");
            return;
        }

        try {
            if (!this.db) this.db = firebase.database();
            
            // We use the persistent ID instead of player name for the database node
            const id = this.playerData.playerUniqueId;

            this.worldRef = this.db.ref('world/players');
            this.myRef = this.worldRef.child(id);
            this.isOnlineRef = this.myRef.child('isOnline');

            this.myRef.once('value').then((snapshot) => {
                const data = snapshot.val();
                if (data && data.x !== undefined) {
                    KASurvival.globalEventBus.emit('PLAYER_DATA_LOADED', data);
                }
                
                this.isOnlineRef.set(true);
                this.isOnlineRef.onDisconnect().set(false);
                
                this.isConnected = true;
                this.broadcastPlayerState({ x: data?.x || 0, y: 0, z: data?.z || 0 }, 0, false, false, playerName);
            });

            // Lắng nghe TẤT CẢ người chơi trong World
            this.worldRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (!data) return;

                for (const [playerId, pData] of Object.entries(data)) {
                    if (playerId !== this.playerData.playerUniqueId) {
                        if (pData.isOnline) {
                            KASurvival.globalEventBus.emit('REMOTE_PLAYER_UPDATE', { id: playerId, ...pData });
                        } else {
                            KASurvival.globalEventBus.emit('REMOTE_PLAYER_DISCONNECT', playerId);
                        }
                    }
                }
            });
        } catch(e) {
            console.error("Lỗi kết nối Firebase:", e);
        }
    }

    broadcastPlayerState(position, rotation, isMoving, isRunning, playerName) {
        if (!this.isConnected || !this.myRef) return;

        const payload = {
            id: this.playerData.playerUniqueId,
            name: playerName,
            gender: this.playerData.gender || 'female',
            x: position.x, y: position.y, z: position.z,
            rotation: rotation,
            isMoving: isMoving,
            isRunning: isRunning,
            isOnline: true,
            timestamp: Date.now()
        };

        this.myRef.set(payload);
    }
}
KASurvival.NetworkManager = NetworkManager;

// ===================================================
// 12. DAY/NIGHT SYSTEM & COMBAT SYSTEM
// ===================================================
class DayNightSystem {
    constructor(engine) {
        this.engine = engine;
        this.dayTimer = 0;
        this.dayDuration = 300;
        this.isNight = false;
    }

    update(deltaTime) {
        this.dayTimer += deltaTime;
        const progress = (this.dayTimer % this.dayDuration) / this.dayDuration;
        const sunAngle = progress * Math.PI * 2;
        this.engine.sunLight.position.x = Math.cos(sunAngle) * 60;
        this.engine.sunLight.position.y = Math.sin(sunAngle) * 60;

        if (Math.sin(sunAngle) < -0.1) {
            if (!this.isNight) {
                this.isNight = true;
                this.engine.scene.background.setHex(0x0b132b);
                this.engine.scene.fog.color.setHex(0x0b132b);
                this.engine.sunLight.intensity = 0.2;
            }
        } else {
            if (this.isNight) {
                this.isNight = false;
                this.engine.scene.background.setHex(0x87ceeb);
                this.engine.scene.fog.color.setHex(0x87ceeb);
                this.engine.sunLight.intensity = 1.2;
            }
        }
    }
}
KASurvival.DayNightSystem = DayNightSystem;

class CombatSystem {
    constructor() {
        this.attackCooldown = 0;
    }
    update(deltaTime) {
        if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
    }
    performAttack() {
        if (this.attackCooldown > 0) return;
        this.attackCooldown = 0.4;
        KASurvival.audioManager.playChopSound();
    }
}
KASurvival.CombatSystem = CombatSystem;

// ===================================================
// 13. LOGIN & LOBBY UI CONTROLLERS
// ===================================================
class LoginUI {
    constructor(playerData, networkManager, onLoginSuccess) {
        this.playerData = playerData;
        this.networkManager = networkManager;
        this.onLoginSuccess = onLoginSuccess;

        this.loginModalEl = document.getElementById('login-modal');
        this.nameInputEl = document.getElementById('player-name-input');
        this.startBtnEl = document.getElementById('btn-login-start');

        this.init();
    }

    init() {
        if (this.playerData.playerName && this.nameInputEl) {
            this.nameInputEl.value = this.playerData.playerName;
        }

        if (this.startBtnEl) {
            this.startBtnEl.addEventListener('click', () => this.handleLogin());
        }

        if (this.nameInputEl) {
            this.nameInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
    }

    handleLogin() {
        const inputName = this.nameInputEl ? this.nameInputEl.value.trim() : '';
        if (!inputName) {
            alert("Vui lòng nhập tên nhân vật!");
            return;
        }

        // Get or generate persistent unique ID
        let playerId = localStorage.getItem('ka_playerId');
        if (!playerId) {
            playerId = 'player_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ka_playerId', playerId);
        }

        const gender = window.selectedGender || 'female';
        
        // Save gender so other parts can use it (or update PlayerData)
        this.playerData.playerName = inputName;
        this.playerData.playerId = playerId;
        this.playerData.gender = gender;
        
        // Cập nhật Firebase ngay lập tức
        const dbRef = firebase.database().ref(`players/${playerId}`);
        dbRef.set({
            name: inputName,
            gender: gender,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        if (this.loginModalEl) this.loginModalEl.style.display = 'none';
        
        if (this.onLoginSuccess) {
            // Pass all data if needed, or just let app read from playerData
            this.onLoginSuccess({ name: inputName, id: playerId, gender: gender });
        }
    }
}
KASurvival.LoginUI = LoginUI;

class LobbyUI {
    constructor(playerData, networkManager, onEnterWorld) {
        this.playerData = playerData;
        this.networkManager = networkManager;
        this.onEnterWorld = onEnterWorld;

        this.lobbyModalEl = document.getElementById('lobby-modal');
        this.btnCreateRoom = document.getElementById('btn-create-room');
        this.btnJoinRoom = document.getElementById('btn-join-lobby-room');
        this.inputJoinCode = document.getElementById('lobby-join-code-input');
        this.actionsGroup = document.getElementById('lobby-actions-group');

        this.roomInfoBox = document.getElementById('lobby-room-info');
        this.lblRoomCode = document.getElementById('lbl-room-code');
        this.lblMeName = document.getElementById('lbl-me-name');
        this.chipFriend = document.getElementById('chip-friend');
        this.btnEnterWorld = document.getElementById('btn-enter-world');

        this.init();
    }

    init() {
        if (this.btnCreateRoom) {
            this.btnCreateRoom.addEventListener('click', () => {
                const code = Math.floor(1000 + Math.random() * 9000).toString();
                this.enterRoomLobby(code);
            });
        }

        if (this.btnJoinRoom && this.inputJoinCode) {
            const triggerJoin = () => {
                const code = this.inputJoinCode.value.trim();
                if (code) this.enterRoomLobby(code);
            };
            this.btnJoinRoom.addEventListener('click', triggerJoin);
            this.inputJoinCode.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') triggerJoin();
            });
        }

        if (this.btnEnterWorld) {
            this.btnEnterWorld.addEventListener('click', () => {
                if (this.lobbyModalEl) this.lobbyModalEl.style.display = 'none';
                if (this.onEnterWorld) this.onEnterWorld();
            });
        }

        KASurvival.globalEventBus.on('LOBBY_FRIEND_JOINED', (friendName) => {
            if (this.chipFriend) {
                this.chipFriend.className = 'player-chip online';
                this.chipFriend.innerHTML = `<span>${friendName || 'Friend'} (Ready)</span>`;
            }
        });
    }

    show() {
        if (this.lobbyModalEl) this.lobbyModalEl.style.display = 'flex';
        KASurvival.gameStateManager.setState(KASurvival.GAME_STATES.LOBBY);
    }

    enterRoomLobby(code) {
        if (this.actionsGroup) this.actionsGroup.style.display = 'none';
        if (this.roomInfoBox) this.roomInfoBox.style.display = 'block';

        if (this.lblRoomCode) this.lblRoomCode.textContent = code;
        if (this.lblMeName) this.lblMeName.textContent = `${this.playerData.playerName || 'Player'} (Ready)`;

        if (this.networkManager) {
            this.networkManager.setRoomName(code);
        }
    }
}
KASurvival.LobbyUI = LobbyUI;

class HUD {
    constructor(playerData, networkManager) {
        this.playerData = playerData;
        this.networkManager = networkManager;

        this.nameDisplayEl = document.getElementById('player-display-name');
        this.stateEl = document.getElementById('player-state');
        this.speedEl = document.getElementById('player-speed');
        this.posEl = document.getElementById('player-pos');
        this.roomCodeEl = document.getElementById('room-code-display');
        this.btnCopyInvite = document.getElementById('btn-copy-invite');
        this.friendDotEl = document.querySelector('.friend-dot');
        this.statusTextEl = document.getElementById('friend-status-text');

        this.setupEventBus();
        this.setupCopyInviteButton();
    }

    setupEventBus() {
        KASurvival.globalEventBus.on('ROOM_CODE_ASSIGNED', (code) => {
            if (this.roomCodeEl) {
                this.roomCodeEl.textContent = code || '8899';
            }
        });

        KASurvival.globalEventBus.on('FRIEND_CONNECTED', (data) => {
            const badge = document.getElementById('friend-status-badge');
            if (badge) badge.style.display = 'flex';
            if (this.statusTextEl) {
                this.statusTextEl.innerHTML = `<b style="color:#10b981;">Online Partner: ${data.friendName || 'Friend'}</b>`;
            }
            if (this.friendDotEl) {
                this.friendDotEl.className = 'friend-dot online';
            }
        });
    }

    setupCopyInviteButton() {
        if (!this.btnCopyInvite) return;
        this.btnCopyInvite.addEventListener('click', () => {
            const currentUrl = window.location.href;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(currentUrl).then(() => {
                    this.showCopyFeedback();
                }).catch(() => {
                    this.fallbackCopyText(currentUrl);
                });
            } else {
                this.fallbackCopyText(currentUrl);
            }
        });
    }

    fallbackCopyText(text) {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        this.showCopyFeedback();
    }

    showCopyFeedback() {
        if (!this.btnCopyInvite) return;
        const originalText = this.btnCopyInvite.innerHTML;
        this.btnCopyInvite.innerHTML = '<span>✅ Link Copied! Send to Friend</span>';
        setTimeout(() => {
            this.btnCopyInvite.innerHTML = originalText;
        }, 2500);
    }

    update(player, playerData) {
        if (this.nameDisplayEl) {
            this.nameDisplayEl.textContent = playerData.playerName || 'Player';
        }
        if (this.stateEl) {
            if (player.isMoving) {
                this.stateEl.textContent = player.isRunning ? '🏃 Running Fast' : '🚶 Moving';
                this.stateEl.className = player.isRunning ? 'stat-value running' : 'stat-value active';
            } else {
                this.stateEl.textContent = '🧍 Standing Still';
                this.stateEl.className = 'stat-value';
            }
        }
        if (this.speedEl) this.speedEl.textContent = `${player.currentSpeed.toFixed(1)} m/s`;
        if (this.posEl) this.posEl.textContent = `(${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)})`;
    }
}
KASurvival.HUD = HUD;

class Joystick {
    constructor(inputManager) {
        this.inputManager = inputManager;
        this.joystickZone = document.getElementById('joystick-zone');
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickStick = document.getElementById('joystick-stick');
        this.btnRun = document.getElementById('btn-touch-run');

        this.maxRadius = 45;
        this.joystickTouchId = null;

        this.setupTouchEvents();
    }

    setupTouchEvents() {
        if (!this.joystickZone || !this.joystickBase) return;

        this.joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.joystickTouchId !== null) return;
            const touch = e.changedTouches[0];
            this.joystickTouchId = touch.identifier;
            this.updatePosition(touch);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.joystickTouchId) {
                    e.preventDefault();
                    this.updatePosition(touch);
                }
            }
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.joystickTouchId) {
                    this.reset();
                }
            }
        });

        window.addEventListener('touchcancel', () => this.reset());

        if (this.btnRun) {
            let runActive = false;
            this.btnRun.addEventListener('touchstart', (e) => {
                e.preventDefault();
                runActive = !runActive;
                this.btnRun.classList.toggle('active', runActive);
                this.inputManager.toggleTouchRun(runActive);
            }, { passive: false });
        }
    }

    updatePosition(touch) {
        const rect = this.joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance > this.maxRadius) {
            deltaX = (deltaX / this.maxRadius) * this.maxRadius;
            deltaY = (deltaY / this.maxRadius) * this.maxRadius;
        }

        this.joystickStick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        this.inputManager.setJoystickVector(deltaX / this.maxRadius, deltaY / this.maxRadius, true);
    }

    reset() {
        this.joystickTouchId = null;
        this.inputManager.setJoystickVector(0, 0, false);
        if (this.joystickStick) {
            this.joystickStick.style.transform = `translate(0px, 0px)`;
        }
    }
}
KASurvival.Joystick = Joystick;

class InventoryUI {
    constructor(playerData) {
        this.playerData = playerData;
        this.container = document.getElementById('hotbar-container');
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        this.playerData.inventory.forEach((slot, index) => {
            const slotEl = document.createElement('div');
            slotEl.className = `hotbar-slot ${index === this.playerData.equippedSlotIndex ? 'active' : ''}`;

            const keyEl = document.createElement('span');
            keyEl.className = 'slot-key';
            keyEl.textContent = index + 1;
            slotEl.appendChild(keyEl);

            if (slot) {
                const itemDef = Object.values(KASurvival.ITEMS).find(i => i.id === slot.item);
                if (itemDef) {
                    const iconEl = document.createElement('span');
                    iconEl.className = 'slot-icon';
                    iconEl.textContent = itemDef.icon;
                    slotEl.appendChild(iconEl);

                    if (slot.count > 1) {
                        const countEl = document.createElement('span');
                        countEl.className = 'slot-count';
                        countEl.textContent = slot.count;
                        slotEl.appendChild(countEl);
                    }
                }
            }

            slotEl.addEventListener('click', () => {
                this.playerData.equippedSlotIndex = index;
                this.render();
            });

            this.container.appendChild(slotEl);
        });
    }
}
KASurvival.InventoryUI = InventoryUI;

// ===================================================
// 14. MAIN APPLICATION GAME BOOTSTRAP
// ===================================================
class KASurvivalGame {
    constructor() {
        this.engine = new KASurvival.Engine('three-canvas');
        this.inputManager = new KASurvival.InputManager();
        this.playerData = new KASurvival.PlayerData();

        this.environment = new KASurvival.Environment(this.engine.scene);
        this.player = new KASurvival.Player(this.engine.scene, this.playerData.playerName || "Player");
        this.remotePlayers = {}; // Cập nhật để hỗ trợ MMO nhiều người chơi

        this.networkManager = new KASurvival.NetworkManager(this.playerData);
        this.dayNightSystem = new KASurvival.DayNightSystem(this.engine);
        this.combatSystem = new KASurvival.CombatSystem();

        this.hud = new KASurvival.HUD(this.playerData, this.networkManager);
        this.joystick = new KASurvival.Joystick(this.inputManager);
        this.inventoryUI = new KASurvival.InventoryUI(this.playerData);

        // Graphics Additions
        this.skySystem = new KASurvival.SkySystem(this.engine.scene);
        this.particleSystem = new KASurvival.ParticleSystem(this.engine.scene);

        // Login UI Controller
        this.loginUI = new KASurvival.LoginUI(this.playerData, this.networkManager, (loginData) => {
            this.player.setName(loginData.name);
            
            // Set gender and reload mesh
            this.player.gender = loginData.gender;
            this.player.buildMesh(); // Rebuild mesh with correct gender
            
            this.networkManager.connectToWorld(loginData.name);
            document.getElementById('ui-overlay').style.display = 'flex';
            KASurvival.gameStateManager.setState(KASurvival.GAME_STATES.PLAYING);
        });

        this.setupNetworkEvents();
        this.animate();
    }

    setupNetworkEvents() {
        KASurvival.globalEventBus.on('PLAYER_DATA_LOADED', (data) => {
            if (data.x !== undefined && data.z !== undefined) {
                this.player.position.set(data.x, data.y || 0, data.z);
                this.player.targetPosition.copy(this.player.position);
                this.player.mesh.position.copy(this.player.position);
            }
        });

        KASurvival.globalEventBus.on('REMOTE_PLAYER_UPDATE', (data) => {
            const id = data.id;
            if (!this.remotePlayers[id]) {
                this.remotePlayers[id] = new KASurvival.RemotePlayer(this.engine.scene, data.name || "Friend");
                this.remotePlayers[id].gender = data.gender || 'female';
                this.remotePlayers[id].buildMesh();
            } else {
                if (this.remotePlayers[id].gender !== data.gender) {
                    this.remotePlayers[id].gender = data.gender || 'female';
                    this.remotePlayers[id].buildMesh();
                }
            }
            this.remotePlayers[id].updateNetworkState(data);
        });

        KASurvival.globalEventBus.on('REMOTE_PLAYER_DISCONNECT', (id) => {
            if (this.remotePlayers[id]) {
                this.remotePlayers[id].destroy();
                delete this.remotePlayers[id];
            }
        });
    }

    update(deltaTime) {
        if (!KASurvival.gameStateManager.isPlaying() && KASurvival.gameStateManager.getState() !== KASurvival.GAME_STATES.LOADING) {
            return;
        }

        const movementVector = this.inputManager.getMovementVector();
        this.player.update(deltaTime, movementVector, this.inputManager.cameraYaw);

        for (const id in this.remotePlayers) {
            this.remotePlayers[id].update(deltaTime);
        }

        const target = this.player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const offsetX = this.inputManager.cameraDistance * Math.sin(this.inputManager.cameraYaw) * Math.cos(this.inputManager.cameraPitch);
        const offsetY = this.inputManager.cameraDistance * Math.sin(this.inputManager.cameraPitch);
        const offsetZ = this.inputManager.cameraDistance * Math.cos(this.inputManager.cameraYaw) * Math.cos(this.inputManager.cameraPitch);

        this.engine.camera.position.lerp(target.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ)), 0.15);
        this.engine.camera.lookAt(target);

        this.networkManager.broadcastPlayerState(
            this.player.position,
            this.player.rotation,
            this.player.isMoving,
            this.player.isRunning,
            this.playerData.playerName
        );

        this.dayNightSystem.update(deltaTime);
        this.combatSystem.update(deltaTime);
        this.hud.update(this.player, this.playerData);
        
        this.skySystem.update(deltaTime, this.dayNightSystem.isNight);
        this.particleSystem.update(deltaTime, this.dayNightSystem.isNight, this.player.position);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const deltaTime = Math.min(this.engine.clock.getDelta(), 0.1);
        this.update(deltaTime);
        this.engine.render();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new KASurvivalGame();
});
