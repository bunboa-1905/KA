/**
 * KA SURVIVAL - COMBAT SYSTEM
 * Calculates hitboxes, tool damage, resource chopping and mob damage
 */
import { audioManager } from '../core/AudioManager.js';

export class CombatSystem {
    constructor() {
        this.attackCooldown = 0;
    }

    update(deltaTime) {
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
    }

    performAttack(player, resourceNodes, enemies) {
        if (this.attackCooldown > 0) return;
        this.attackCooldown = 0.4;

        // Perform tool swing audio
        audioManager.playChopSound();

        // Check melee hit range
        const attackOrigin = player.position.clone().add(new THREE.Vector3(0, 1, 0));
        
        resourceNodes.forEach(node => {
            if (!node.isDestroyed && attackOrigin.distanceTo(node.position) < 2.5) {
                node.takeDamage(25);
            }
        });
    }
}
