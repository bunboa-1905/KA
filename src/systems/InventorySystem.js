/**
 * KA SURVIVAL - INVENTORY SYSTEM
 * Manages item stacking, hotbar slots, and tool durability
 */
import { ITEMS } from '../data/ItemsData.js';

export class InventorySystem {
    constructor(playerData) {
        this.playerData = playerData;
    }

    addItem(itemId, amount = 1) {
        let added = false;
        for (let slot of this.playerData.inventory) {
            if (slot && slot.item === itemId) {
                slot.count += amount;
                added = true;
                break;
            }
        }

        if (!added) {
            for (let i = 0; i < this.playerData.inventory.length; i++) {
                if (!this.playerData.inventory[i]) {
                    this.playerData.inventory[i] = { item: itemId, count: amount };
                    added = true;
                    break;
                }
            }
        }
        return added;
    }
}
