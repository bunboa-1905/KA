/**
 * KA SURVIVAL - PLAYER DATA & PERSISTENCE
 * Manages player stats, inventory slots, and unique player ID storage
 */
export class PlayerData {
    constructor() {
        this.playerUniqueId = this.loadOrGenerateUniqueId();
        this.friendLastKnownId = localStorage.getItem('ka_friend_id') || null;

        this.stats = {
            health: 100,
            maxHealth: 100,
            hunger: 100,
            maxHunger: 100,
            stamina: 100,
            maxStamina: 100,
            level: 1,
            exp: 0
        };

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

    setFriendId(friendId) {
        this.friendLastKnownId = friendId;
        localStorage.setItem('ka_friend_id', friendId);
    }
}
