/**
 * KA SURVIVAL - SAVE SYSTEM
 * Serializes and saves game state (Position, Inventory, Stats) into LocalStorage
 */
export class SaveSystem {
    constructor(playerData) {
        this.playerData = playerData;
    }

    saveGame(playerPos) {
        const dataToSave = {
            position: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
            stats: this.playerData.stats,
            inventory: this.playerData.inventory
        };
        localStorage.setItem('ka_survival_save', JSON.stringify(dataToSave));
    }

    loadGame() {
        const saved = localStorage.getItem('ka_survival_save');
        if (!saved) return null;
        try {
            return JSON.parse(saved);
        } catch (e) {
            return null;
        }
    }
}
