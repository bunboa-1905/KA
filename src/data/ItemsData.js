/**
 * KA SURVIVAL - ITEMS DATA
 * Definitions for resources, tools, equipment, and crafting recipes
 */
export const ITEMS = {
    WOOD: { id: 'wood', name: 'Wood', icon: '🪵', stackable: true, maxStack: 64 },
    STONE: { id: 'stone', name: 'Stone', icon: '🪨', stackable: true, maxStack: 64 },
    BERRY: { id: 'berry', name: 'Berry', icon: '🫐', stackable: true, maxStack: 32, heal: 15, hunger: 20 },
    AXE: { id: 'axe', name: 'Wood Axe', icon: '🪓', stackable: false, durability: 100 },
    PICKAXE: { id: 'pickaxe', name: 'Wood Pickaxe', icon: '⛏️', stackable: false, durability: 100 },
    CAMPFIRE: { id: 'campfire', name: 'Campfire', icon: '🔥', stackable: true, maxStack: 10 }
};

export const CRAFTING_RECIPES = [
    {
        id: 'craft_axe',
        result: ITEMS.AXE,
        ingredients: [{ item: ITEMS.WOOD, count: 5 }, { item: ITEMS.STONE, count: 2 }]
    },
    {
        id: 'craft_pickaxe',
        result: ITEMS.PICKAXE,
        ingredients: [{ item: ITEMS.WOOD, count: 3 }, { item: ITEMS.STONE, count: 5 }]
    },
    {
        id: 'craft_campfire',
        result: ITEMS.CAMPFIRE,
        ingredients: [{ item: ITEMS.WOOD, count: 8 }, { item: ITEMS.STONE, count: 4 }]
    }
];
