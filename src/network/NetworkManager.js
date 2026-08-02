/**
 * KA SURVIVAL - NETWORK MANAGER
 * Manages PeerJS P2P room creation, URL Hash auto-join, and WebRTC real-time sync
 */
import { globalEventBus } from '../core/EventBus.js';

export class NetworkManager {
    constructor(playerData) {
        this.playerData = playerData;
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.isConnected = false;

        this.initPeer();
    }

    initPeer() {
        if (typeof Peer === 'undefined') return; // Standalone fallback if CDN not loaded

        const myId = this.playerData.playerUniqueId;
        this.peer = new Peer(myId);

        this.peer.on('open', (id) => {
            this.checkUrlHashAndConnect();
        });

        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.isHost = true;
            this.isConnected = true;
            this.setupConnectionListeners();
            globalEventBus.emit('FRIEND_CONNECTED', { isHost: true });
        });
    }

    checkUrlHashAndConnect() {
        const hash = window.location.hash;
        if (hash.includes('#room=')) {
            const targetPeerId = hash.split('#room=')[1];
            if (targetPeerId && targetPeerId !== this.playerData.playerUniqueId) {
                this.connectToPeer(targetPeerId);
            }
        } else {
            // Update URL hash with my ID for easy sharing
            window.history.replaceState(null, null, `#room=${this.playerData.playerUniqueId}`);
        }
    }

    connectToPeer(targetPeerId) {
        if (!this.peer) return;
        this.connection = this.peer.connect(targetPeerId);
        this.isHost = false;

        this.connection.on('open', () => {
            this.isConnected = true;
            this.playerData.setFriendId(targetPeerId);
            this.setupConnectionListeners();
            globalEventBus.emit('FRIEND_CONNECTED', { isHost: false });
        });
    }

    setupConnectionListeners() {
        if (!this.connection) return;

        this.connection.on('data', (data) => {
            if (data.type === 'PLAYER_STATE') {
                globalEventBus.emit('REMOTE_PLAYER_UPDATE', data);
            }
        });

        this.connection.on('close', () => {
            this.isConnected = false;
            globalEventBus.emit('FRIEND_DISCONNECTED');
        });
    }

    broadcastPlayerState(position, rotation, isMoving, isRunning) {
        if (!this.isConnected || !this.connection) return;
        this.connection.send({
            type: 'PLAYER_STATE',
            x: position.x,
            y: position.y,
            z: position.z,
            rotation: rotation,
            isMoving: isMoving,
            isRunning: isRunning
        });
    }
}
