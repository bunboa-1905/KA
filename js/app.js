/**
 * KA SURVIVAL - MODULAR GAME ENGINE & ARCHITECTURE
 * Includes Login System, Character Name Tag Rendering, and 2-Player Co-op
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

        this.cameraYaw = 0;
        this.cameraPitch = Math.PI / 6;
        this.cameraDistance = 14;

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
        return { moveX, moveZ, isRunning };
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
// 6. DATA LAYER (Items, PlayerData with Name Storage)
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
        this.friendLastKnownId = localStorage.getItem('ka_friend_id') || null;

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
            savedId = 'ka-player-' + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('ka_player_id', savedId);
        }
        return savedId;
    }

    setPlayerName(name) {
        this.playerName = name || 'Player';
        localStorage.setItem('ka_player_name', this.playerName);
    }

    setFriendId(friendId) {
        this.friendLastKnownId = friendId;
        localStorage.setItem('ka_friend_id', friendId);
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
// 8. LOCAL PLAYER ENTITY (With Floating Name Tag)
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
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe4e1, flatShading: true });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0xff80ab, flatShading: true });
        const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xff1744, flatShading: true });
        const eyesMat = new THREE.MeshBasicMaterial({ color: 0x2979ff });
        const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const blushMat = new THREE.MeshBasicMaterial({ color: 0xff80ab, transparent: true, opacity: 0.7 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffcdd2, flatShading: true });
        const overallsMat = new THREE.MeshStandardMaterial({ color: 0x42a5f5, flatShading: true });
        const sockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true });

        // Head
        this.headMesh = new THREE.Group();
        this.headMesh.position.set(0, 1.75, 0);

        const headCube = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.65), skinMat);
        headCube.castShadow = true;
        this.headMesh.add(headCube);

        const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.72), hairMat);
        hairTop.position.set(0, 0.24, 0);
        this.headMesh.add(hairTop);

        const frontBangs = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.2, 0.15), hairMat);
        frontBangs.position.set(0, 0.15, 0.32);
        this.headMesh.add(frontBangs);

        // Twin Tails
        this.leftPonytail = new THREE.Group();
        this.leftPonytail.position.set(-0.4, 0.1, -0.1);
        const leftTailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), hairMat);
        leftTailMesh.position.set(-0.05, -0.22, 0);
        leftTailMesh.castShadow = true;
        this.leftPonytail.add(leftTailMesh);
        this.leftPonytail.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.25), ribbonMat));
        this.headMesh.add(this.leftPonytail);

        this.rightPonytail = new THREE.Group();
        this.rightPonytail.position.set(0.4, 0.1, -0.1);
        const rightTailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), hairMat);
        rightTailMesh.position.set(0.05, -0.22, 0);
        rightTailMesh.castShadow = true;
        this.rightPonytail.add(rightTailMesh);
        this.rightPonytail.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.25), ribbonMat));
        this.headMesh.add(this.rightPonytail);

        // Eyes & Blush
        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), eyesMat);
        leftEye.position.set(-0.16, 0.02, 0.33);
        const leftSparkle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), eyeHighlightMat);
        leftSparkle.position.set(-0.14, 0.05, 0.34);

        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), eyesMat);
        rightEye.position.set(0.16, 0.02, 0.33);
        const rightSparkle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), eyeHighlightMat);
        rightSparkle.position.set(0.18, 0.05, 0.34);

        this.headMesh.add(leftEye); this.headMesh.add(leftSparkle);
        this.headMesh.add(rightEye); this.headMesh.add(rightSparkle);

        const leftBlush = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), blushMat);
        leftBlush.position.set(-0.2, -0.08, 0.33);
        const rightBlush = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), blushMat);
        rightBlush.position.set(0.2, -0.08, 0.33);
        this.headMesh.add(leftBlush); this.headMesh.add(rightBlush);

        this.playerBody.add(this.headMesh);

        // Torso & Backpack
        const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.75, 0.36), overallsMat);
        torsoMesh.position.set(0, 1.0, 0);
        torsoMesh.castShadow = true;
        this.playerBody.add(torsoMesh);

        const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), new THREE.MeshStandardMaterial({ color: 0xffeb3b, flatShading: true }));
        backpack.position.set(0, 1.0, -0.26);
        backpack.castShadow = true;
        this.playerBody.add(backpack);

        // Arms & Axe
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.42, 1.3, 0);
        const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), skinMat);
        leftArmMesh.position.set(0, -0.3, 0);
        this.leftArm.add(leftArmMesh);
        this.playerBody.add(this.leftArm);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.42, 1.3, 0);
        const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), skinMat);
        rightArmMesh.position.set(0, -0.3, 0);
        this.rightArm.add(rightArmMesh);

        const axeGroup = new THREE.Group();
        axeGroup.position.set(0, -0.65, 0.15);
        axeGroup.rotation.x = Math.PI / 4;
        axeGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.07), new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true })));
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.36), new THREE.MeshStandardMaterial({ color: 0xff4081, flatShading: true }));
        blade.position.set(0, 0.3, 0.12);
        axeGroup.add(blade);
        this.rightArm.add(axeGroup);
        this.playerBody.add(this.rightArm);

        // Legs
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.16, 0.55, 0);
        this.leftLeg.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), skinMat));
        const leftSock = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.22, 0.23), sockMat);
        leftSock.position.set(0, -0.32, 0);
        this.leftLeg.add(leftSock);
        const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.28), shoeMat);
        leftBoot.position.set(0, -0.48, 0.03);
        this.leftLeg.add(leftBoot);
        this.playerBody.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.16, 0.55, 0);
        this.rightLeg.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), skinMat));
        const rightSock = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.22, 0.23), sockMat);
        rightSock.position.set(0, -0.32, 0);
        this.rightLeg.add(rightSock);
        const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.28), shoeMat);
        rightBoot.position.set(0, -0.48, 0.03);
        this.rightLeg.add(rightBoot);
        this.playerBody.add(this.rightLeg);
    }

    update(deltaTime, inputVector, cameraYaw) {
        const { moveX, moveZ, isRunning } = inputVector;
        this.isRunning = isRunning;

        const inputLength = Math.hypot(moveX, moveZ);
        this.isMoving = inputLength > 0.08;

        if (this.isMoving) {
            const normX = moveX / Math.max(1, inputLength);
            const normZ = moveZ / Math.max(1, inputLength);

            const sinYaw = Math.sin(cameraYaw);
            const cosYaw = Math.cos(cameraYaw);

            const worldMoveX = normX * cosYaw - normZ * sinYaw;
            const worldMoveZ = normX * sinYaw + normZ * cosYaw;

            const baseSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;
            this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, baseSpeed, deltaTime * 10);

            this.position.x += worldMoveX * this.currentSpeed * deltaTime;
            this.position.z += worldMoveZ * this.currentSpeed * deltaTime;

            this.targetRotation = Math.atan2(worldMoveX, worldMoveZ);
            let diff = this.targetRotation - this.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.rotation += diff * Math.min(1.0, deltaTime * 14);

            this.walkTimer += deltaTime * (this.isRunning ? 16 : 10);
            const legAngle = Math.sin(this.walkTimer) * 0.6;
            this.leftLeg.rotation.x = legAngle;
            this.rightLeg.rotation.x = -legAngle;
            this.leftArm.rotation.x = -legAngle;
            this.rightArm.rotation.x = legAngle;

            if (this.leftPonytail && this.rightPonytail) {
                const hairSway = Math.sin(this.walkTimer * 1.2) * 0.25;
                this.leftPonytail.rotation.z = 0.2 + hairSway;
                this.rightPonytail.rotation.z = -0.2 - hairSway;
            }
        } else {
            this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, 0, deltaTime * 12);
            this.leftLeg.rotation.x = 0; this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0; this.rightArm.rotation.x = 0;
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
    constructor(scene, name = "Friend") {
        this.scene = scene;
        this.name = name;
        this.position = new THREE.Vector3(0, 0, 0);
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.targetRotation = 0;

        this.mesh = new THREE.Group();
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
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, flatShading: true });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, flatShading: true });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, flatShading: true });

        const headCube = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.65), skinMat);
        headCube.position.y = 1.75;
        headCube.castShadow = true;
        this.mesh.add(headCube);

        const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.38), shirtMat);
        torsoMesh.position.y = 1.0;
        torsoMesh.castShadow = true;
        this.mesh.add(torsoMesh);

        const legGeo = new THREE.BoxGeometry(0.24, 0.6, 0.24);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.set(-0.18, 0.3, 0);
        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.set(0.18, 0.3, 0);
        this.mesh.add(leftLeg);
        this.mesh.add(rightLeg);
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
        const groundGeo = new THREE.PlaneGeometry(KASurvival.WORLD_CONFIG.mapSize, KASurvival.WORLD_CONFIG.mapSize, 40, 40);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, flatShading: true });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const gridHelper = new THREE.GridHelper(KASurvival.WORLD_CONFIG.mapSize, 100, 0x388e3c, 0x388e3c);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.25;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    buildForestAndRocks() {
        const leafColors = [0x2e7d32, 0x388e3c, 0x43a047];

        const createTree = (x, z, scale = 1) => {
            const treeGroup = new THREE.Group();
            treeGroup.position.set(x, 0, z);

            const trunk = new THREE.Mesh(
                new THREE.BoxGeometry(0.8 * scale, 3.5 * scale, 0.8 * scale),
                new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9, flatShading: true })
            );
            trunk.position.y = (3.5 * scale) / 2;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            treeGroup.add(trunk);

            for (let i = 0; i < 3; i++) {
                const size = (2.6 - i * 0.7) * scale;
                const leaves = new THREE.Mesh(
                    new THREE.BoxGeometry(size, 1.6 * scale, size),
                    new THREE.MeshStandardMaterial({ color: leafColors[i], roughness: 0.7, flatShading: true })
                );
                leaves.position.y = 3.0 * scale + i * 1.2 * scale;
                leaves.castShadow = true;
                leaves.receiveShadow = true;
                treeGroup.add(leaves);
            }
            return treeGroup;
        };

        for (let i = 0; i < KASurvival.WORLD_CONFIG.treeCount; i++) {
            let x = (Math.random() - 0.5) * (KASurvival.WORLD_CONFIG.mapSize - 40);
            let z = (Math.random() - 0.5) * (KASurvival.WORLD_CONFIG.mapSize - 40);
            if (Math.hypot(x, z) < KASurvival.WORLD_CONFIG.safeZoneRadius) continue;
            this.propsGroup.add(createTree(x, z, 0.8 + Math.random() * 0.6));
        }

        const flowerColors = [0xff4081, 0xffeb3b, 0xab47bc, 0x00e676, 0xff9100];
        for (let i = 0; i < KASurvival.WORLD_CONFIG.flowerCount; i++) {
            let x = (Math.random() - 0.5) * (KASurvival.WORLD_CONFIG.mapSize - 50);
            let z = (Math.random() - 0.5) * (KASurvival.WORLD_CONFIG.mapSize - 50);
            const fGroup = new THREE.Group();
            fGroup.position.set(x, 0, z);
            const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), new THREE.MeshBasicMaterial({ color: 0x4caf50 }));
            stem.position.y = 0.2;
            fGroup.add(stem);
            const petal = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.35), new THREE.MeshBasicMaterial({ color: flowerColors[i % flowerColors.length] }));
            petal.position.y = 0.45;
            fGroup.add(petal);
            this.propsGroup.add(fGroup);
        }
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
// 11. NETWORK MANAGER (PeerJS + Player Name Broadcast)
// ===================================================
class NetworkManager {
    constructor(playerData) {
        this.playerData = playerData;
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.isConnected = false;
        this.signalTopicUrl = 'https://ntfy.sh/ka_survival_signal_2026_room';

        this.initPeer();
    }

    initPeer() {
        if (typeof Peer === 'undefined') return;

        const myId = this.playerData.playerUniqueId;
        this.peer = new Peer(myId);

        this.peer.on('open', (id) => {
            this.registerAndAutoPair();
        });

        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.isHost = true;
            this.isConnected = true;
            this.setupConnectionListeners();
            KASurvival.globalEventBus.emit('FRIEND_CONNECTED', { isHost: true });
        });
    }

    registerAndAutoPair() {
        const hash = window.location.hash;
        if (hash.includes('#room=')) {
            const targetPeerId = hash.split('#room=')[1];
            if (targetPeerId && targetPeerId !== this.playerData.playerUniqueId) {
                this.connectToPeer(targetPeerId);
                return;
            }
        }
        this.publishMyPeerId();
        this.listenForPeerSignal();
    }

    publishMyPeerId() {
        fetch(this.signalTopicUrl, {
            method: 'POST',
            body: this.playerData.playerUniqueId
        }).catch(() => {});
        window.history.replaceState(null, null, `#room=${this.playerData.playerUniqueId}`);
    }

    listenForPeerSignal() {
        if (typeof EventSource === 'undefined') return;

        const eventSource = new EventSource(`${this.signalTopicUrl}/sse`);
        eventSource.onmessage = (event) => {
            if (this.isConnected) return;
            try {
                const data = JSON.parse(event.data);
                const receivedPeerId = data.message ? data.message.trim() : '';

                if (receivedPeerId && receivedPeerId !== this.playerData.playerUniqueId) {
                    this.connectToPeer(receivedPeerId);
                }
            } catch (e) {}
        };
    }

    connectToPeer(targetPeerId) {
        if (!this.peer || this.isConnected) return;
        this.connection = this.peer.connect(targetPeerId);
        this.isHost = false;

        this.connection.on('open', () => {
            this.isConnected = true;
            this.playerData.setFriendId(targetPeerId);
            this.setupConnectionListeners();
            KASurvival.globalEventBus.emit('FRIEND_CONNECTED', { isHost: false });
        });
    }

    setupConnectionListeners() {
        if (!this.connection) return;

        this.connection.on('data', (data) => {
            if (data.type === 'PLAYER_STATE') {
                KASurvival.globalEventBus.emit('REMOTE_PLAYER_UPDATE', data);
            }
        });

        this.connection.on('close', () => {
            this.isConnected = false;
            KASurvival.globalEventBus.emit('FRIEND_DISCONNECTED');
        });
    }

    broadcastPlayerState(position, rotation, isMoving, isRunning, playerName) {
        if (!this.isConnected || !this.connection) return;
        this.connection.send({
            type: 'PLAYER_STATE',
            x: position.x, y: position.y, z: position.z,
            rotation: rotation,
            isMoving: isMoving,
            isRunning: isRunning,
            name: playerName
        });
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
// 13. HUD & LOGIN UI CONTROLLER
// ===================================================
class HUD {
    constructor(playerData) {
        this.playerData = playerData;
        this.nameDisplayEl = document.getElementById('player-display-name');
        this.stateEl = document.getElementById('player-state');
        this.speedEl = document.getElementById('player-speed');
        this.posEl = document.getElementById('player-pos');

        this.setupEventBus();
    }

    setupEventBus() {
        KASurvival.globalEventBus.on('FRIEND_CONNECTED', (data) => {
            const badge = document.getElementById('friend-status-badge');
            if (badge) {
                badge.style.display = 'flex';
                badge.innerHTML = `<span class="friend-dot online"></span> <span>Friend Connected (${data.isHost ? 'Client' : 'Host'})</span>`;
            }
        });
        KASurvival.globalEventBus.on('FRIEND_DISCONNECTED', () => {
            const badge = document.getElementById('friend-status-badge');
            if (badge) {
                badge.innerHTML = `<span class="friend-dot"></span> <span>Friend Disconnected</span>`;
            }
        });
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

class LoginUI {
    constructor(playerData, onLoginSuccess) {
        this.playerData = playerData;
        this.onLoginSuccess = onLoginSuccess;

        this.modalEl = document.getElementById('login-modal');
        this.uiOverlayEl = document.getElementById('ui-overlay');
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
        const finalName = inputName || 'Player_' + Math.floor(Math.random() * 1000);

        this.playerData.setPlayerName(finalName);

        if (this.modalEl) this.modalEl.style.display = 'none';
        if (this.uiOverlayEl) this.uiOverlayEl.style.display = 'flex';

        if (this.onLoginSuccess) this.onLoginSuccess(finalName);
    }
}
KASurvival.LoginUI = LoginUI;

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
        this.remotePlayer = null;

        this.networkManager = new KASurvival.NetworkManager(this.playerData);
        this.dayNightSystem = new KASurvival.DayNightSystem(this.engine);
        this.combatSystem = new KASurvival.CombatSystem();

        this.hud = new KASurvival.HUD(this.playerData);
        this.joystick = new KASurvival.Joystick(this.inputManager);
        this.inventoryUI = new KASurvival.InventoryUI(this.playerData);

        // Login UI Controller
        this.loginUI = new KASurvival.LoginUI(this.playerData, (playerName) => {
            this.player.setName(playerName);
            KASurvival.gameStateManager.setState(KASurvival.GAME_STATES.PLAYING);
        });

        this.setupNetworkEvents();
        this.animate();
    }

    setupNetworkEvents() {
        KASurvival.globalEventBus.on('FRIEND_CONNECTED', () => {
            if (!this.remotePlayer) {
                this.remotePlayer = new KASurvival.RemotePlayer(this.engine.scene, "Friend");
            }
        });

        KASurvival.globalEventBus.on('REMOTE_PLAYER_UPDATE', (data) => {
            if (this.remotePlayer) {
                this.remotePlayer.updateNetworkState(data);
            }
        });

        KASurvival.globalEventBus.on('FRIEND_DISCONNECTED', () => {
            if (this.remotePlayer) {
                this.remotePlayer.destroy();
                this.remotePlayer = null;
            }
        });
    }

    update(deltaTime) {
        if (!KASurvival.gameStateManager.isPlaying() && KASurvival.gameStateManager.getState() !== KASurvival.GAME_STATES.LOADING) {
            return;
        }

        const movementVector = this.inputManager.getMovementVector();
        this.player.update(deltaTime, movementVector, this.inputManager.cameraYaw);

        if (this.remotePlayer) {
            this.remotePlayer.update(deltaTime);
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
