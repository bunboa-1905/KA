/**
 * KA SURVIVAL - RESOURCE NODE ENTITY
 * Represents harvestable resource nodes (Trees, Rocks, Bushes) with health
 */
export class ResourceNode {
    constructor(type, position, health = 100) {
        this.type = type; // 'tree', 'rock', 'bush'
        this.position = position;
        this.health = health;
        this.maxHealth = health;
        this.isDestroyed = false;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isDestroyed = true;
        }
        return this.isDestroyed;
    }
}
