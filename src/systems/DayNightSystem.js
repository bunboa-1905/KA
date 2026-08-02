/**
 * KA SURVIVAL - DAY/NIGHT SYSTEM
 * Controls 24-minute game day cycle, sun/moon skybox transitions and night light
 */
export class DayNightSystem {
    constructor(engine) {
        this.engine = engine;
        this.dayTimer = 0;
        this.dayDuration = 300; // 5 minutes per full cycle
        this.isNight = false;
    }

    update(deltaTime) {
        this.dayTimer += deltaTime;
        const progress = (this.dayTimer % this.dayDuration) / this.dayDuration;

        // Sun Orbit Angle
        const sunAngle = progress * Math.PI * 2;
        this.engine.sunLight.position.x = Math.cos(sunAngle) * 60;
        this.engine.sunLight.position.y = Math.sin(sunAngle) * 60;

        // Day / Night sky color interpolation
        if (Math.sin(sunAngle) < -0.1) {
            if (!this.isNight) {
                this.isNight = true;
                this.engine.scene.background.setHex(0x0b132b);
                this.engine.scene.fog.color.setHex(0x0b132b);
                this.engine.sunLight.intensity = 0.2;
            }
        } else {
            if (this.isNight) {
                this.isNight = false;
                this.engine.scene.background.setHex(0x87ceeb);
                this.engine.scene.fog.color.setHex(0x87ceeb);
                this.engine.sunLight.intensity = 1.2;
            }
        }
    }
}
