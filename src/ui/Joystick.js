/**
 * KA SURVIVAL - TOUCH JOYSTICK CONTROLLER
 * Manages virtual joystick touch drag events on mobile touchscreens
 */
export class Joystick {
    constructor(inputManager) {
        this.inputManager = inputManager;

        this.joystickZone = document.getElementById('joystick-zone');
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickStick = document.getElementById('joystick-stick');
        this.btnRun = document.getElementById('btn-touch-run');

        this.maxRadius = 45;
        this.joystickTouchId = null;

        this.setupTouchEvents();
    }

    setupTouchEvents() {
        if (!this.joystickZone || !this.joystickBase) return;

        this.joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.joystickTouchId !== null) return;
            const touch = e.changedTouches[0];
            this.joystickTouchId = touch.identifier;
            this.updatePosition(touch);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.joystickTouchId) {
                    e.preventDefault();
                    this.updatePosition(touch);
                }
            }
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.joystickTouchId) {
                    this.reset();
                }
            }
        });

        window.addEventListener('touchcancel', () => this.reset());

        if (this.btnRun) {
            let runActive = false;
            this.btnRun.addEventListener('touchstart', (e) => {
                e.preventDefault();
                runActive = !runActive;
                this.btnRun.classList.toggle('active', runActive);
                this.inputManager.toggleTouchRun(runActive);
            }, { passive: false });
        }
    }

    updatePosition(touch) {
        const rect = this.joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance > this.maxRadius) {
            deltaX = (deltaX / this.maxRadius) * this.maxRadius;
            deltaY = (deltaY / this.maxRadius) * this.maxRadius;
        }

        this.joystickStick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        this.inputManager.setJoystickVector(deltaX / this.maxRadius, deltaY / this.maxRadius, true);
    }

    reset() {
        this.joystickTouchId = null;
        this.inputManager.setJoystickVector(0, 0, false);
        if (this.joystickStick) {
            this.joystickStick.style.transform = `translate(0px, 0px)`;
        }
    }
}
