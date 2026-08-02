/**
 * KA SURVIVAL - HUD UI RENDERER
 * Updates live status elements, coordinates, speed, and co-op friend status badge
 */
import { globalEventBus } from '../core/EventBus.js';

export class HUD {
    constructor(playerData) {
        this.playerData = playerData;

        this.stateEl = document.getElementById('player-state');
        this.speedEl = document.getElementById('player-speed');
        this.posEl = document.getElementById('player-pos');

        this.setupEventBus();
    }

    setupEventBus() {
        globalEventBus.on('FRIEND_CONNECTED', (data) => {
            const badge = document.getElementById('friend-status-badge');
            if (badge) {
                badge.style.display = 'flex';
                badge.innerHTML = `<span class="friend-dot online"></span> <span>Friend Connected (${data.isHost ? 'Client' : 'Host'})</span>`;
            }
        });

        globalEventBus.on('FRIEND_DISCONNECTED', () => {
            const badge = document.getElementById('friend-status-badge');
            if (badge) {
                badge.innerHTML = `<span class="friend-dot"></span> <span>Friend Disconnected</span>`;
            }
        });
    }

    update(player) {
        if (this.stateEl) {
            if (player.isMoving) {
                this.stateEl.textContent = player.isRunning ? '🏃 Running Fast' : '🚶 Moving';
                this.stateEl.className = player.isRunning ? 'stat-value running' : 'stat-value active';
            } else {
                this.stateEl.textContent = '🧍 Standing Still';
                this.stateEl.className = 'stat-value';
            }
        }

        if (this.speedEl) {
            this.speedEl.textContent = `${player.currentSpeed.toFixed(1)} m/s`;
        }

        if (this.posEl) {
            this.posEl.textContent = `(${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)})`;
        }
    }
}
