/**
 * KA SURVIVAL - INPUT MANAGER
 * Aggregates PC Keyboard, Mouse Orbit, and Mobile Touch Joystick inputs
 */
export class InputManager {
    constructor() {
        this.keysPressed = {};
        this.joystickVector = { x: 0, y: 0, active: false };
        this.touchRunActive = false;

        this.cameraYaw = 0;
        this.cameraPitch = Math.PI / 6;
        this.cameraDistance = 14;

        this.isMouseDown = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.cameraTouchId = null;
        this.previousTouchPosition = { x: 0, y: 0 };

        this.setupKeyboardListeners();
        this.setupMouseListeners();
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            this.keysPressed[e.key.toLowerCase()] = true;
            this.keysPressed[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keysPressed[e.key.toLowerCase()] = false;
            this.keysPressed[e.code] = false;
        });
    }

    setupMouseListeners() {
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isMouseDown = true;
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown) return;
            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;

            this.cameraYaw -= deltaX * 0.007;
            this.cameraPitch += deltaY * 0.007;
            this.cameraPitch = Math.max(0.1, Math.min(Math.PI / 2.2, this.cameraPitch));

            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('wheel', (e) => {
            this.cameraDistance += e.deltaY * 0.01;
            this.cameraDistance = Math.max(5, Math.min(30, this.cameraDistance));
        });
    }

    setJoystickVector(x, y, active) {
        this.joystickVector.x = x;
        this.joystickVector.y = y;
        this.joystickVector.active = active;
    }

    toggleTouchRun(state) {
        this.touchRunActive = state;
    }

    getMovementVector() {
        let moveX = 0;
        let moveZ = 0;

        if (this.keysPressed['w'] || this.keysPressed['arrowup']) moveZ -= 1;
        if (this.keysPressed['s'] || this.keysPressed['arrowdown']) moveZ += 1;
        if (this.keysPressed['a'] || this.keysPressed['arrowleft']) moveX -= 1;
        if (this.keysPressed['d'] || this.keysPressed['arrowright']) moveX += 1;

        if (this.joystickVector.active) {
            moveX = this.joystickVector.x;
            moveZ = this.joystickVector.y;
        }

        const isRunning = !!(this.keysPressed['shift'] || this.keysPressed['shiftleft'] || this.touchRunActive);

        return { moveX, moveZ, isRunning };
    }
}
