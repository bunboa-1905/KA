/**
 * KA SURVIVAL - APPLICATION MAIN BOOTSTRAP SCRIPT
 * Modular Application Entry Point
 */
import { Engine } from './core/Engine.js';
import { InputManager } from './core/InputManager.js';
import { PlayerData } from './data/PlayerData.js';
import { Player } from './entities/Player.js';
import { RemotePlayer } from './entities/RemotePlayer.js';
import { Environment } from './entities/Environment.js';
import { NetworkManager } from './network/NetworkManager.js';
import { DayNightSystem } from './systems/DayNightSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { HUD } from './ui/HUD.js';
import { Joystick } from './ui/Joystick.js';
import { InventoryUI } from './ui/InventoryUI.js';
import { globalEventBus } from './core/EventBus.js';

class KASurvivalGame {
    constructor() {
        this.engine = new Engine('three-canvas');
        this.inputManager = new InputManager();
        this.playerData = new PlayerData();

        this.environment = new Environment(this.engine.scene);
        this.player = new Player(this.engine.scene);
        this.remotePlayer = null;

        this.networkManager = new NetworkManager(this.playerData);
        this.dayNightSystem = new DayNightSystem(this.engine);
        this.combatSystem = new CombatSystem();

        this.hud = new HUD(this.playerData);
        this.joystick = new Joystick(this.inputManager);
        this.inventoryUI = new InventoryUI(this.playerData);

        this.setupNetworkEvents();
        this.animate();
    }

    setupNetworkEvents() {
        globalEventBus.on('FRIEND_CONNECTED', () => {
            if (!this.remotePlayer) {
                this.remotePlayer = new RemotePlayer(this.engine.scene, "Friend");
            }
        });

        globalEventBus.on('REMOTE_PLAYER_UPDATE', (data) => {
            if (this.remotePlayer) {
                this.remotePlayer.updateNetworkState(data);
            }
        });

        globalEventBus.on('FRIEND_DISCONNECTED', () => {
            if (this.remotePlayer) {
                this.remotePlayer.destroy();
                this.remotePlayer = null;
            }
        });
    }

    update(deltaTime) {
        const movementVector = this.inputManager.getMovementVector();
        this.player.update(deltaTime, movementVector, this.inputManager.cameraYaw);

        if (this.remotePlayer) {
            this.remotePlayer.update(deltaTime);
        }

        // Camera follow local player
        const target = this.player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const offsetX = this.inputManager.cameraDistance * Math.sin(this.inputManager.cameraYaw) * Math.cos(this.inputManager.cameraPitch);
        const offsetY = this.inputManager.cameraDistance * Math.sin(this.inputManager.cameraPitch);
        const offsetZ = this.inputManager.cameraDistance * Math.cos(this.inputManager.cameraYaw) * Math.cos(this.inputManager.cameraPitch);

        this.engine.camera.position.lerp(target.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ)), 0.15);
        this.engine.camera.lookAt(target);

        // Broadcast position to network
        this.networkManager.broadcastPlayerState(
            this.player.position,
            this.player.rotation,
            this.player.isMoving,
            this.player.isRunning
        );

        this.dayNightSystem.update(deltaTime);
        this.combatSystem.update(deltaTime);
        this.hud.update(this.player);
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
