/**
 * KA SURVIVAL - GAME STATE MANAGER
 * Manages game flow states (LOADING, MAIN_MENU, PLAYING, GAMEOVER)
 */
export const GAME_STATES = {
    LOADING: 'LOADING',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

export class GameStateManager {
    constructor() {
        this.currentState = GAME_STATES.LOADING;
    }

    setState(newState) {
        if (this.currentState === newState) return;
        this.currentState = newState;
    }

    getState() {
        return this.currentState;
    }

    isPlaying() {
        return this.currentState === GAME_STATES.PLAYING;
    }
}

export const gameStateManager = new GameStateManager();
