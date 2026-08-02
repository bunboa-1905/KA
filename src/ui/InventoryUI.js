/**
 * KA SURVIVAL - INVENTORY UI RENDERER
 * Renders quick hotbar slots and item counts
 */
import { ITEMS } from '../data/ItemsData.js';

export class InventoryUI {
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
                const itemDef = Object.values(ITEMS).find(i => i.id === slot.item);
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
